# Dokumentacja techniczna BigOS

Ten dokument opisuje architekturę, uruchamianie, rozwój, testy, magazynowanie, migracje, kopie zapasowe, offline, cykl życia aplikacji, uprawnienia pakietów i ograniczenia przeglądarek.

## Spis treści

1. [Uruchamianie i komendy deweloperskie](#1-uruchamianie-i-komendy-deweloperskie)
2. [Architektura i moduły](#2-architektura-i-moduły)
3. [Magazynowanie (IndexedDB + localStorage)](#3-magazynowanie)
4. [Migracje schematu](#4-migracje-schematu)
5. [Kopie zapasowe i przywracanie](#5-kopie-zapasowe-i-przywracanie)
6. [Historia wersji dokumentów](#6-historia-wersji-dokumentów)
7. [Offline i PWA](#7-offline-i-pwa)
8. [Cykl życia aplikacji (App Registry)](#8-cykl-życia-aplikacji)
9. [Pakiety importowane / sandbox / uprawnienia](#9-pakiety-importowane--sandbox--uprawnienia)
10. [Formatowanie i reset](#10-formatowanie-i-reset)
11. [Diagnostyka](#11-diagnostyka)
12. [Testy](#12-testy)
13. [Ograniczenia przeglądarek](#13-ograniczenia-przeglądarek)

---

## 1. Uruchamianie i komendy deweloperskie

### Wymagania

- Nowoczesna przeglądarka (Chromium / Firefox / Safari)
- Node.js 18+ (do budowy CSS i testów)
- Python 3 (opcjonalnie, jako serwer statyczny)

### Start lokalny

```bash
# opcja A: Python
python -m http.server 8080
# → http://localhost:8080

# opcja B: Node (jeśli masz np. serve)
npx --yes serve -l 8080
```

Bez serwera niektóre funkcje (Service Worker, fetch zewnętrzny, część API) mogą nie działać.

### Komendy

| Komenda | Opis |
|---------|------|
| `npm run build:css` | Buduje lokalny `css/bigos-tw.css` (Tailwind bez CDN) |
| `npm run check:syntax` | Składnia wszystkich plików JS (`node --check`) |
| `npm test` | Testy regresyjne rdzenia (Node) |
| `npm run test:browser` | Testy w Chromium/Firefox (Playwright) |
| `npm run validate` | `check:syntax` + `test` |

---

## 2. Architektura i moduły

```
index.html            # punkt wejścia (jeden ładunek każdego .js)
style.css             # style systemowe BigOS
css/bigos-tw.css      # lokalny build Tailwind (darkMode: class)
manifest.webmanifest  # PWA manifest
sw.js                 # Service Worker (offline + wersjonowany cache)
js/
  core/
    diagnostics.js        # bigosDiag — ustrukturyzowany log, redakcja sekretów
    state.js              # bigosState / window.fileSystem — współdzielony stan
    storage.js            # bigosDB / bigosStorage — jedyna warstwa pamięci (schema v2)
    app-registry.js       # bigosAppRegistry — cykl życia, readiness, zasoby
    system-maintenance.js # bigosMaintenance — format / reset / persist
    backup.js             # bigosBackup — backup v1, validate, preview, restore
    sandbox.js            # bigosSandbox — izolowane iframe, parseLiteral (bez eval)
    doc-history.js        # bigosDocHistory — retencja rewizji dokumentów
  globals.js          # zmienne globalne + start systemu (async readiness)
  auth.js             # logowanie / reset hasła
  fs.js               # fsManager — system plików, recovery vs new install
  window.js           # winManager — okna, snap, geometria, Ctrl+K search
  desktop.js          # pulpity, drag&drop, menu kontekstowe
  theme.js            # motywy / efekty
  ui.js               # modale systemowe
  aplikacje/*.js      # aplikacje
  gry/*.js            # gry + silnik
```

Zależności modułów (kolejność w `index.html`):

`diagnostics → state → storage → app-registry → system-maintenance → backup → sandbox → doc-history → globals → ui → auth → fs → window → desktop → theme → apps → …aplikacje`

Każdy moduł jest ładowany **dokładnie raz** (usunięto duplikat `apps.js`).

### Współdzielony stan (`js/core/state.js`)

Top-level `let`/`const` w klasycznych skryptach **nie** stają się właściwościami `window`.
Dlatego:

- `window.fileSystem` jest **jedną tablicą** (accessor w `state.js`); `fsManager` i inne moduły czytają/aktualizują tę samą referencję.
- `window.bigosState` udostępnia `setFileSystem()` (podmiana in-place) i `removeWhere()`.
- `fs.js` **nie** deklaruje własnego `bigosDB` — korzysta wyłącznie z `window.bigosDB` z `storage.js`.
- `fsManager` jest jawnie eksportowany (`window.fsManager`).

---

## 3. Magazynowanie

### Baza IndexedDB `BigOS_DB`

| Store | Zawartość |
|-------|-----------|
| `meta_store` | schemaVersion, lastMigration, filesSplitAt, lsMigratedAt |
| `files_store` | metadane pliku (bez treści) |
| `contents_store` | treść / Blob / ArrayBuffer |
| `kv_store` | ustawienia aplikacji (klucz → wartość) |
| `packages_store` | zainstalowane pakiety |
| `history_store` | rewizje dokumentów |
| `fs_store` | (legacy, tylko do odczytu/migracji) |

Wersja 1 używała wyłącznie `fs_store` z monolityczną tablicą `bigos_fs`. Wersja 2 rozdziela metadane i treść oraz zapisuje rekordy indywidualnie.

### API `bigosDB.set`

```js
const r = await bigosDB.set('bigos_fs', fileSystem);
// r = { ok: true }  |  { ok: false, error: Error, code: 'STORAGE_FULL' }
```

- `set` rozwiązuje się **dopiero po commitcie transakcji** (nie po `request.onsuccess`).
- Gdy IndexedDB i localStorage zawiodą, zwracane jest `ok: false`.
- Gdy działa tylko fallback, zapis jest oznaczany (`bigosStorage.fallbackDiverged = true`).
- `deleteDatabase()` zwraca `ok: true` **wyłącznie** przy zdarzeniu `onsuccess`.
  Zablokowana (`onblocked`) lub przekroczona operacja to **porażka** (`DELETE_BLOCKED`) —
  nigdy nie jest zgłaszana jako sukces i nie następuje reload.

### Zapisy szeregowe i rekordy indywidualne

`fsManager.save()` zapisuje tylko **brudne rekordy** (`putFileNodes`) plus migawkę
`bigos_fs` (dla kompatybilności/backupu). `bigosStorage.serialize()` kolejkuje zapisy.

---

## 4. Migracje schematu

- Jawna wersja: `bigosStorage.SCHEMA_VERSION` (obecnie `2`).
- `onupgradeneeded` → `migrate(db, oldVersion, newVersion, tx)`.
- Migracja v1→v2:
  1. Tworzy nowe store'y (jeśli brak).
  2. Kopiuje klucze z `fs_store` do `kv_store`.
  3. Po otwarciu (`ensureMigrated`) rozbija `bigos_fs` na rekordy w `files_store` + `contents_store`.
- Awaria migracji **abortuje** upgrade — stara baza pozostaje nienaruszona i możliwa do odzyskania.
- Dane zachowywane: pliki, foldery, zainstalowane aplikacje, ustawienia, formaty dokumentów.

Testy migracji: `tests/run-tests.js` (klasyfikacja new_install/recovery, roundtrip doc-history).

---

## 5. Kopie zapasowe i przywracanie

Format: `bigos-backup-v1`

```json
{
  "format": "bigos-backup-v1",
  "schemaVersion": 2,
  "createdAt": "ISO",
  "includeCredentials": false,
  "files": [ { "id", "type", "name", "parentId", ... } ],
  "contents": { "<fileId>": "treść lub dataURL" },
  "packages": [],
  "settings": { "bigos_...": ... }
}
```

- **Domyślnie BEZ kluczy API.** Eksport danych logowania tylko przez `includeCredentials: true` (osobny checkbox w UI).
- `validate()` sprawdza strukturę przed przywracaniem.
- `preview()` pokazuje liczbę plików, folderów, pakietów, kluczy ustawień.
- `restore()` z `keepRecovery: true` zapisuje bieżący stan w `localStorage.bigos_recovery_copy` **przed** podmianą.
- UI: Menu Start → „Kopia zapasowa / Przywróć”.

---

## 6. Historia wersji dokumentów

- `bigosDocHistory.snapshot(fileId, content, label)`
- Retencja: ostatnie **20** rewizji + 1 rollup/dzień przez **30 dni**.
- `restore(fileId, revisionId)` robi snapshot stanu bieżącego („przed-przywróceniem”) i podmienia treść.
- Skryba zapisuje snapshot przy auto-zapisie; UI historii rewizji dostępne w Skrybie.

---

## 7. Offline i PWA

- `manifest.webmanifest` + ikony `icons/icon-192.png`, `icons/icon-512.png`.
- `sw.js` (CACHE_VERSION `bigos-v1.0.0`):
  - precache powłoki systemu po install,
  - runtime cache (stale-while-revalidate) dla same-origin GET,
  - kontrolowana aktualizacja: **bez** automatycznego `skipWaiting` przy starcie — użytkownik dostaje toast i sam odświeża (ochrona niezapisanych dokumentów).
  - `SKIP_WAITING` przez `postMessage` gdy użytkownik jest gotów.
- CSS lokalny: `css/bigos-tw.css` zamiast `cdn.tailwindcss.com`.
- Funkcje wymagające sieci (oznacz w UI):
  - BigAI (API Gemini/OpenAI/Groq/OpenRouter/…)
  - Pogodynka (Open-Meteo)
  - Sieciosław / mapy / zewnętrzne media
  - Aktualizacja Service Workera

Weryfikacja offline: lokalny serwer → pełne załadowanie → DevTools Network → Offline → odśwież.

---

## 8. Cykl życia aplikacji

`bigosAppRegistry` (`js/core/app-registry.js`):

| Faza | Zachowanie |
|------|-----------|
| `register(def)` | rejestracja definicji |
| `launch(appId)` | lazy-load → init (raz) → open → instancja |
| `suspend(appId)` | zatrzymanie renderu / pętli (gdy okno zminimalizowane) |
| `resume(appId)` | wznowienie |
| `close(appId)` | close + dispose + zwolnienie zasobów |

Śledzone zasoby (per instancja): `setTimeout/setInterval/requestAnimationFrame`, listenery, `Worker`, `AudioContext`, `URL.createObjectURL`, `AbortController`.

**Ważne:** aplikacje tła (muzyka, eksport) oznaczamy `backgroundable: true` — `suspend` ich nie zatrzymuje.

Readiness gates zastępują `setTimeout(..., 500)`:

```js
await bigosAppRegistry.readiness.whenReady('filesystem');
await bigosAppRegistry.readiness.whenReady('auth');
// start zainstalowanych aplikacji / skryptów
```

API wewnętrzne dla aplikacji: patrz sekcja sandbox + `ctx.api` w kontekście instancji.

---

## 9. Pakiety importowane / sandbox / uprawnienia

Import `.js` przez Menedżera Aplikacji **nie** wstrzykuje `<script>` do głównego kontekstu.

Zamiast tego `bigosSandbox`:

- tworzy `iframe` z `sandbox="allow-scripts"` (**bez** `allow-same-origin`),
- ładuje gościa z interfejsem `window.BigOSSandbox` (postMessage),
- host waliduje: **źródło wiadomości**, tożsamość instancji, **strukturę żądania**, **uprawnienia**.

### Parsowanie manifestów (bez wykonania kodu hosta)

Manifesty `BigOSAppAPI.register({...})` są parsowane przez `bigosSandbox.parseLiteral` —
parser akceptujący **wyłącznie literały** (obiekty, tablice, stringi, liczby, bool, null).
`new Function` / `eval` **nie są używane** po stronie hosta. Wyrażenia funkcyjne,
identyfikatory i wywołania są odrzucane. Nazwy/ikony są sanityzowane przed wstawieniem do DOM.

### Uprawnienia

| Uprawnienie | Opis |
|-------------|------|
| `read_files` | odczyt plików z BigOS |
| `write_file` / `write_files` | zapis plików |
| `network` | tylko `https` GET host-side (bez credentials) |
| `notify` | toasty |

Nieznane uprawnienia są **odrzucane** przy instalacji.

### Dane prywatne

- Klucze API pozostają w **host** (BigAI / `podpowiadaczApp.settings`).
- Gość nie ma dostępu do `localStorage` hosta, `bigosDB`, ani zmiennych globalnych BigOS.
- `fetch_text` host-side używa `credentials: 'omit'`.

### Cykl pakietu

install (trwały zapis w `packages_store` **przed** zgłoszeniem sukcesu) → launch (iframe) → uninstall (unmount + usunięcie wpisów, **bez** resztek wykonywalnych).

---

## 10. Formatowanie i reset

| Operacja | Usuwa | Zachowuje |
|----------|-------|-----------|
| **Formatuj system** | IndexedDB BigOS, klucze `bigos_*` w localStorage (pliki, ustawienia, hasło, pakiety) | klucze **innych stron** w localStorage |
| **Reset ustawień** | ustawienia (`bigos_bg`, motywy, preferencje) | pliki, aplikacje, hasło |
| **Reset hasła** | `bigos_password` | pliki, aplikacje, ustawienia |

Kolejność formatu:

1. Zatrzymaj aplikacje (`appRegistry.closeAll` + legacy stop).
2. Dokończ zapisy (`fsManager.flush` / serialize queue).
3. Zamknij uchwyty DB, potem `deleteDatabase`.
4. **`deleteDatabase` zwraca sukces wyłącznie przy `onsuccess`.**
   Zablokowana (`onblocked`) lub przekroczona operacja → `ok: false`, `code: 'DELETE_BLOCKED'`.
   W takim przypadku **nie** ma reloadu i **nie** jest zgłaszane ukończenie.
5. Po udanym usunięciu bazy usuń tylko klucze `bigos_*`.
6. **Po** sukcesie → `location.reload()`.

---

## 11. Diagnostyka

`bigosDiag` (`js/core/diagnostics.js`):

- poziomy: `log` / `warn` / `error`
- kategorie: `startup`, `storage`, `fs`, `lifecycle`, `backup`, `sandbox`, `maintain`, `skryba`, …
- **Redakcja**: `apiKey`, `password`, `token`, `secret`, `credential`, `authorization`, `bearer`, `pin` → `[redacted]`
- długie losowe ciągi (klucze) → `[redacted]`
- retencja ograniczona do 500 wpisów
- eksport: `bigosDiag.exportJSON()` (przycisk w Nadzorcy)

Nadzorca Systemu pokazuje:

- CPU: **n/d** (brak wiarygodnego API — bez losowych wartości)
- RAM: `performance.memory` (Chromium) lub „brak API”
- Dysk: `navigator.storage.estimate()` **z etykietą „magazyn witryny”** (nie dysk fizyczny)
- listę aktywności z `bigosAppRegistry.activity()` (timery, listenery, workery)

---

## 12. Testy

```bash
npm run check:syntax   # 62 pliki (aplikacja + Programy + testy) — 0 błędów
npm test               # 70 testów na modułach produkcyjnych (Node VM)
npm run test:browser   # Playwright Chromium + Firefox — 23 testy
npm run validate       # check:syntax + test
```

### Wyniki walidacji (bieżąca zmiana)

| Zestaw | Wynik |
|--------|-------|
| `check:syntax` | 58/58 OK |
| `tests/run-tests.js` | 16/16 ✓ |
| `tests/run-browser-tests.js` Chromium | 12/12 ✓ |
| `tests/run-browser-tests.js` Firefox | 11/11 ✓ (offline = Chromium-only) |

Zakres testów rdzenia (`tests/run-tests.js`):

- redakcja sekretów w logach
- `bigosDB.set` ok/fail przy awarii IDB+LS
- `fallbackDiverged`
- format / reset hasła / reset ustawień (rozdzielenie zakresu, ochrona obcych kluczy)
- backup validate + preview + wykluczenie kluczy API
- rejestr aplikacji: dispose timerów/listenerów
- readiness gates
- sandbox: filtrowanie uprawnień
- recovery vs new install (brak nadpisu istniejących danych)
- doc-history snapshot/restore

Testy przeglądarkowe: logowanie, tworzenie/zapis/odczyt pliku po refresh, sandbox deny, format + ochrona obcych kluczy, offline boot po cache SW, obecność API snap/szukaj.

---

## 13. Ograniczenia przeglądarek

| Obszar | Chromium | Firefox | Safari |
|--------|----------|---------|--------|
| IndexedDB | tak | tak | tak (limity quota) |
| `performance.memory` | tak (flagi) | **nie** | **nie** |
| `navigator.storage.estimate` | tak | tak | tak |
| `navigator.storage.persist` | tak | tak | ograniczone |
| Service Worker / PWA | tak | tak | iOS: instalacja z Safari Share |
| `sandbox="allow-scripts"` iframe | tak | tak | tak |
| CPU % procesu | **brak API** | brak | brak |
| Tailwind CDN | **usunięty** — lokalny `css/bigos-tw.css` | — | — |

Pozostałe ograniczenia:

- Blob w IndexedDB działa, ale starsze Safari bywa kapryśne przy dużych rekordach — dlatego `contents_store` jest rozdzielony.
- `deleteDatabase` może być `blocked` gdy inna karta trzyma połączenie — obsłużone jawne `close()` + retry.
- Przeglądarka może usunąć dane witryny przy braku miejsca, jeśli `persist()` nie zostanie przyznane — dlatego komunikat w UI i backupy.
- Testy `test:browser` wymagają `npx playwright install`.

---

## Zmiany architektoniczne (skrót)

1. Jeden ładunek `apps.js` (bez duplikatu).
2. Tapety wskazują na istniejące pliki `tapety/*.webp`.
3. `bigosDB.set` zwraca wiarygodny wynik; awarie widoczne dla aplikacji.
4. Format/reset rozdzielone i precyzyjne; brak `localStorage.clear()`.
5. `fsManager.init` rozróżnia new install / recovery (bez nadpisu danych).
6. Schemat v2 + migracja + rekordy indywidualne + Blobs.
7. Backup/restore z preview i recovery copy.
8. Historia wersji dokumentów z retencją.
9. `StorageManager.persist/estimate` + uczciwe etykiety.
10. Centralny rejestr aplikacji + readiness gates + zwalnianie zasobów.
11. Importowane appy w sandboxie z uprawnieniami (bez wykonywania w hoście).
12. PWA (manifest, SW, lokalny CSS Tailwind).
13. Snap okien, geometria, Ctrl+S/O/K/Tab, unified search.
14. BigAI: walidowane akcje, potwierdzenia destrukcyjne, historia jako undo.
15. Nadzorca: prawdziwe metryki + log diagnostyczny.
16. Testy + `npm run validate`.
