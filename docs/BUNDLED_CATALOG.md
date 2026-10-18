# Katalog Aplikacji Dostarczonych z BigOS (`Programy/`)

Niniejszy dokument opisuje architekturę, instalację, zarządzanie cyklem życia oraz procedurę rozbudowy katalogu aplikacji dostarczanych wraz z systemem BigOS.

---

## 1. Architektura i Założenia

BigOS dostarcza zestaw gotowych programów i gier demonstracyjnych w katalogu `Programy/`:
- **Ciasteczkowy Klikacz** (`cookie_clicker_bigos.js`, id: `cookie_clicker`) — gra typu clicker z ulepszeniami i sklepem.
- **Kalkulator BMI** (`kalkulator_bmi_bigos.js`, id: `kalkulator_bmi`) — narzędzie do obliczania wskaźnika masy ciała z interpretacją wyników.
- **BigPaint Studio** (`bigos_painter_bigos.js`, id: `bigos_painter`) — program graficzny ze szkicownikiem i możliwością zapisu obrazu do JPG.

### Zasady działania:
1. **Pełna izolacja piaskownicy (Sandbox)**:
   Aplikacje zewnętrzne i dostarczone z katalogu uruchamiane są w ramkach `<iframe>` z atrybutem `sandbox="allow-scripts"` (bez `allow-same-origin` i bez dostępu do obiektu `window` gospodarza).
2. **Bezpieczne wykonywanie skryptów pod rygorystycznym CSP**:
   Nagłówek CSP piaskownicy:
   `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none';`
   Zamiast zabronionych przez CSP wywołań dynamicznych `eval()` czy `new Function()`, skrypty gościa inicjowane są poprzez wstrzyknięcie znacznika `<script>` w odizolowanym dokumencie ramki.
3. **Lokalne style Tailwind i Motywy BigOS**:
   Do wnętrza ramki przekazywane są zbuforowane reguły stylów z `css/bigos-tw.css` oraz zmienne aktywnego motywu (`themeManager.getCSS()`), dzięki czemu komponenty (`g-bg`, `g-panel`, `g-btn`, `g-border`, `g-text`, `g-accent`) renderują się zgodnie z motywem systemu. Zmiana motywu w systemie jest synchronizowana na żywo do wszystkich otwartych okien piaskownicy.
4. **Praca Offline (PWA)**:
   Wszystkie pliki katalogu oraz skrypt `bundled-catalog.js` są zarejestrowane w `CORE_ASSETS` Service Workera (`sw.js`), co zapewnia pełne działanie bez dostępu do Internetu.

---

## 2. Automatyczna i Idempotentna Instalacja

Podczas rozruchu systemu (`js/globals.js`), po pomyślnej inicjalizacji bazy IndexedDB i systemu plików, wywoływana jest funkcja:
```javascript
await bundledCatalog.installAllIfMissing();
```

### Zabezpieczenia:
- **Tryb ratunkowy / naprawczy**: Automatyczna instalacja jest wstrzymywana, gdy system jest w trybie awaryjnym (`bigosFSState.isRecovery`).
- **Blokada konserwacji**: Instalacja jest pomijana, gdy trwa formatowanie lub operacja konserwacyjna bazy danych (`bigosDB.isMaintenanceLocked()`).
- **Idempotentność**: Powtórne uruchomienie systemu nie tworzy duplikatów wpisów w bazie `packages_store`, ikon na Pulpicie ani pozycji w Menu Start.
- **Brak samoczynnego otwierania**: Okna instalowanych programów nie otwierają się samoistnie przy starcie systemu.

---

## 3. Pamiętanie Decyzji o Odinstalowaniu

Gdy użytkownik odinstaluje aplikację dostarczoną (np. z poziomu Menedżera Aplikacji):
1. Pakiet jest usuwany z magazynu `packages_store`.
2. Związane ikony są usuwane z Pulpitu (`fileSystem`) i Menu Start.
3. Identyfikator aplikacji jest zapisywany w `localStorage` pod kluczem `bigos_uninstalled_bundled_apps`.

Dzięki temu po odświeżeniu strony program **nie powraca automatycznie wbrew woli użytkownika**.

---

## 4. Ścieżka Ponownej Instalacji (Reinstall)

W Menedżerze Aplikacji (`js/aplikacje/menadzer.js`):
- Jeśli w systemie istnieją odinstalowane aplikacje z katalogu, w górnym pasku pojawia się przycisk `🔄 Przywróć z katalogu (N)`.
- Kliknięcie otwiera listę odinstalowanych programów z możliwością ponownej instalacji jednym kliknięciem:
  ```javascript
  await bundledCatalog.reinstall(appId);
  ```
- Po przywróceniu aplikacja natychmiast wraca na listę, na Pulpit i do Menu Start.

---

## 5. Dodawanie Nowej Aplikacji do Katalogu

Aby dodać kolejną wspieraną aplikację do katalogu BigOS:

1. **Utwórz plik aplikacji** w katalogu `Programy/<nowy_id>_bigos.js` zawierający rejestrację manifestu:
   ```javascript
   window.BigOSAppAPI.register({
       id: 'moja_gra',
       name: 'Moja Nowa Gra',
       icon: '🎮',
       width: '600px',
       height: '500px',
       category: 'Gry',
       html: `...`,
       globalName: 'MojaGra',
       global: { ... },
       init: () => { ... }
   });
   ```

2. **Zaktualizuj definicję katalogu**:
   - Uruchom generator skryptów:
     ```bash
     node scripts/generate-catalog.js
     ```
   - Lub dodaj wpis do tablicy `BUNDLED_CATALOG` w `js/core/bundled-catalog.js`.

3. **Zbuduj style CSS i zaktualizuj Service Worker**:
   - Przebuduj Tailwind CSS, aby uwzględnić nowe klasy z pliku aplikacji:
     ```bash
     npm run build:css
     ```
   - Dodaj ścieżkę nowego pliku do `CORE_ASSETS` w `sw.js` i zwiększ `CACHE_VERSION`.
