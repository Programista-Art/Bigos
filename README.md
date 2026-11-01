# BigOS - system operacyjny w przeglądarce

**Wersja 2.0.1**

**BigOS** to przeglądarkowe środowisko pracy z pulpitem, oknami, systemem plików, aplikacjami biurowymi, multimediami, grami i asystentem BigAI. Projekt powstaje w HTML, CSS i JavaScript, bez Reacta, Vue ani Angulara.

Aplikacja działa wewnątrz przeglądarki. Nie zastępuje systemu operacyjnego komputera i nie wymaga instalowania programu desktopowego. Pliki oraz ustawienia są domyślnie zapisywane lokalnie w magazynie danej witryny, bez automatycznej synchronizacji w chmurze.

<img src="images/app/BigOs-2.1big-ai.png" alt="Przykładowy ekran powitalny BigOS" width="100%" />

> Zrzuty w galerii przedstawiają różne etapy rozwoju projektu i mogą różnić się od bieżącego interfejsu.

<img src="images/app/BigOs-2.1.png" alt="Przykładowy ekran powitalny BigOS" width="100%" />

## Co zmieniło się i co ulepszono w wersji 2.0.1

### 🤖 BigAI 2026 - Centrum Dowodzenia Systemem
- **Nowe modele językowe (LLM 2026)**:
  - **Google Gemini API**: dodano najnowsze modele **Gemini 4 Argon**, **Gemini 3.8 Flash**, **Gemini 3.6 Flash**, **Gemini 3.5 Flash Lite** oraz serię Gemini 3.1 / 2.5. Usunięto nieaktualny wpis „Gemini (Darmowe wbudowane)”.
  - **OpenAI API + Service Tier**: dodano modele **GPT-6 Astra**, **GPT-6.1 Sol**, **GPT-6.1 Terra** (z wyborem trybu **Service Tier: Standard / Fast / UltraFast**) oraz **GPT-6 Luna**, **GPT-6 Sol**, **GPT-5.6 Sol**, **GPT-5.6 Terra**, **GPT-5.6 Luna**, **GPT-5.6 Nano** i **GPT-5.5** (z obsługą **Service Tier: Standard / Fast**).
  - **Anthropic Claude**: zaktualizowano listę modeli o **Claude Fable 5.1**, **Claude Opus 5.5**, **Claude Sonnet 5.5** oraz **Claude Haiku 5.5**.
  - **Pozostali dostawcy i praca lokalna**: wsparcie dla **xAI (Grok 4)**, **DeepSeek (V3.2 / R2)**, **Groq LPU (Llama 4 Maverick / Scout)**, **OpenRouter (Multi-Model 2026)** oraz lokalnego zarządcy systemu działającego offline.
- **Studio Mediów AI (Generatory zdjęć i wideo)**:
  - **Generatory zdjęć**: **Gemini Nano Banana 2.1**, **Gemini Nano Banana Pro**, **Gemini Nano Banana 2 lite** oraz **FLUX 3**.
  - **Generatory wideo**: **Gemini Omni 1.1 Flash**, **Gemini Veo 3.1-lite**, **Gemini Veo 3.1 -fast**, **Gemini Veo3.1- Quality** oraz **FLUX 3 (Generator wideo)**.
- **Silniki dyktowania (STT 2026) i głosy asystentów (TTS 2026)**:
  - **Rozpoznawanie mowy (STT)**: Web Speech API 2026, Google Gemini Audio STT, OpenAI GPT-4o Transcribe, Groq Whisper Large v3 Turbo, ElevenLabs Scribe v2 oraz Deepgram Nova-3.
  - **Synteza mowy (TTS)**: Wbudowany Web Speech 2026, Google Gemini Live Audio (`Kore`, `Aoede`, `Puck`, `Fenrir`, `Charon`, `Leda`, `Orus`, `Zephyr`), OpenAI GPT-4o Mini TTS (`Coral`, `Sage`, `Ash`, `Ballad`, `Verse`), ElevenLabs v3 Multilingual oraz Cartesia Sonic-2.
- **Pełne zarządzanie systemem BigOS z poziomu BigAI**:
  - Otwieranie i zamykanie dowolnych aplikacji oraz gier poleceniem tekstowym lub głosowym.
  - Automatyczne otwieranie przeglądarki **Sieciosław** i wyszukiwanie w niej informacji.
  - Otwieranie edytora **Skryba** i zapisywanie podyktowanych notatek głosowych (w tym dedykowany tryb **📝 Dyktuj do Skryby**).
  - Otwieranie wygenerowanych lub wskazanych grafik bezpośrednio w aplikacji **Patrzałka** oraz materiałów wideo w **Grajaczu Filmów**.
  - Tworzenie plików i folderów na pulpicie, zmiana motywów oraz tapet, a także generowanie i instalowanie nowych aplikacji w piaskownicy.
- **Rozszerzony układ okna BigAI (`1180×760 px`)**: poszerzono okno główne oraz panel boczny ustawień (`340 px`), wyeliminowano zawijanie przycisków na górnym pasku i poprawiono formatowanie list Markdown.

### 🪟 Okna aplikacji, gry i pulpit
- **Naprawa wymiarów okien i automatycznej wysokości (`auto-height`)**:
  - Przywrócono pełną, nieuciętą wysokość i szerokość kalkulatorów **Rachmistrz Pro** (`340 px → 620 px → 900 px` przy otwieraniu paneli Naukowego i Historii) oraz **Rachmistrz Kodu** (`380 px → 660 px`).
  - Rozszerzono domyślne wymiary okien aplikacji multimedialnych, biurowych i narzędziowych (**Grajek**, **Grajacz Filmów**, **Montażysta**, **Artysta**, **Patrzałka Pro**, **Sieciosław**, **Aktówka**, **Kombinator**, **Władca Poleceń**, **Nadzorca**, **Kasiarz**, **Zadaniowiec**), aby żadne kontrolki nie były ucięte.
- **Ulepszenia w grach systemowych**:
  - Naprawiono grę **Czołgi**, aby nie otwierała się samoczynnie przy starcie systemu i pozostawała ukryta do momentu uruchomienia przez użytkownika.
  - Zwiększono wymiary okien wszystkich gier (**Pełzacz**, **Trzepotek**, **Odbijanka**, **Ufoludki**, **Murarz**, **Czołgi**, **Ścigacz**, **Bombiarz**, **Kółko i Krzyżyk**) oraz wprowadzono proporcjonalne skalowanie `<canvas>` z precyzyjnym przeliczaniem współrzędnych kursora i dotyku.
- **Proporcjonalne rozmieszczanie ikon na pulpicie**:
  - Wszystkie ikony na pulpicie oraz nowo tworzone pliki i foldery są automatycznie wyrównywane do siatki `90×90 px` z wykrywaniem zajętych pól, co zapobiega nakładaniu się ikon na siebie.
- **Odświeżony ekran powitalny „Witaj w BigOS”**:
  - Adaptacyjna wysokość okna dopasowująca się do dostępnego obszaru roboczego (od ekranów laptopowych po monitory ultrawide `3440×1440`), centrowanie przed wyświetleniem pierwszej klatki oraz pełna obsługa zamykania okna i zapamiętywania preferencji startowych.
- **Menedżer Aplikacji, Tabelarz i magazyn danych**:
  - Uproszczony, responsywny pasek narzędziowy Menedżera Aplikacji oparty na zapytaniach kontenerowych (`@container`), wyszukiwanie z polskimi znakami, automatyczna instalacja pakietów z katalogu `Programy/` z pamięcią odinstalowania, pełna synchronizacja motywów systemowych w arkuszu **Tabelarz** oraz ujednolicony zapis danych w IndexedDB.

## Główne możliwości

### Pliki i dane

- Tworzenie plików i folderów, kopiowanie, przenoszenie, usuwanie i obsługa Kosza.
- Zapisywanie danych w IndexedDB, z pomocniczym wykorzystaniem localStorage.
- Wspólny stan systemu plików i kolejka zapisu uwzględniająca zatwierdzanie transakcji.
- Migracja starszych danych i tryb odzyskiwania po problemach z odczytem magazynu.
- Kopie zapasowe plików, pakietów i ustawień oraz walidacja przed przywracaniem.
- Rozdzielone operacje resetowania ustawień, resetowania hasła i formatowania.

### Menedżer Aplikacji

- Wyszukiwanie aplikacji z obsługą polskich znaków i licznikiem wyników.
- Sortowanie według nazwy, kategorii i daty instalacji.
- Rozróżnienie aplikacji systemowych i zainstalowanych pakietów.
- Instalowanie pakietów z plików lokalnych, uruchamianie, eksportowanie i odinstalowywanie.
- Szczegóły aplikacji, identyfikatory, uprawnienia i przywracanie domyślnej geometrii okna.
- Układ dostosowujący się do szerokości okna aplikacji.

### Aplikacje zewnętrzne

Importowane pakiety są uruchamiane w izolowanych ramkach `iframe`. Kod pakietu nie jest wykonywany bezpośrednio w głównym kontekście BigOS, a żądania udostępnianych operacji podlegają kontroli uprawnień.

Dołączony katalog zawiera:

- **Ciasteczkowy Klikacz** — gra z ulepszeniami i automatycznym naliczaniem ciasteczek.
- **Kalkulator BMI** — formularz obliczania BMI i prezentacji wyniku.
- **BigPaint Studio** — dołączona aplikacja do rysowania.

Katalog jest instalowany automatycznie podczas uruchamiania systemu. Programy nie otwierają przy tym własnych okien. Ponowne uruchomienie nie powinno tworzyć duplikatów, a świadome odinstalowanie jest zapamiętywane. Aplikacje można ponownie przywrócić z katalogu.

Informacje dla osób dodających programy: [docs/BUNDLED_CATALOG.md](docs/BUNDLED_CATALOG.md).

### Motywy i okna

Kombinator umożliwia zmianę palety kolorów, stylu interfejsu, tapety i efektów tła. Dostępne są między innymi motywy inspirowane Mica, Aero, Glassmorphism i Neumorphism.

Zainstalowane aplikacje otrzymują lokalne style i aktualny motyw systemu. Zmiana motywu jest przekazywana do działających ramek bez ich przeładowywania. Okna obsługują przeciąganie, minimalizowanie, zapamiętywanie geometrii i dopasowanie do dostępnego obszaru roboczego.

## Aplikacje wbudowane

### Praca i organizacja

| Aplikacja | Możliwości |
| --- | --- |
| **Skryba** | Edytor tekstu z formatowaniem, trybem skupienia, historią wersji i integracją z BigAI. Eksport do TXT, HTML, RTF oraz HTML zapisanego jako DOC. Wydruk i zapis do PDF przez okno drukowania przeglądarki. |
| **Tabelarz** | Arkusz z obsługą formuł i funkcji obliczeniowych. |
| **Aktówka** | Przeglądanie i organizowanie plików, folderów oraz importowanych danych. |
| **Upychacz ZIP** | Tworzenie i rozpakowywanie archiwów ZIP. |
| **Zadaniowiec** | Tablica Kanban do organizowania zadań. |
| **Czasomierz** | Zegar, stoper, minutnik i budzik. |
| **Kalendarz i karteczki** | Pomocnicze narzędzia pulpitu do organizacji i notatek. |

### Grafika i multimedia

| Aplikacja | Możliwości |
| --- | --- |
| **Artysta / Szkicownik** | Rysowanie i edycja grafiki, warstwy, filtry oraz funkcje AI zależne od konfiguracji usługi. |
| **Patrzałka** | Przeglądanie zdjęć, histogram i narzędzia korekcji obrazu. |
| **Montażysta** | Edycja materiałów na osi czasu i natywny eksport WebM. Dostępność formatów zależy od przeglądarki. |
| **Grajek** | Odtwarzanie muzyki, playlisty, equalizer, wizualizacja audio i przełącznik odtwarzania w tle. |
| **Grajacz Filmów** | Odtwarzanie wideo, tryb kinowy i funkcje obrazu w obrazie tam, gdzie wspiera je przeglądarka. |

### Narzędzia systemowe

| Aplikacja | Możliwości |
| --- | --- |
| **Menedżer Aplikacji** | Wyszukiwanie, instalacja i zarządzanie pakietami. |
| **Kombinator** | Motywy, tapety i personalizacja interfejsu. |
| **Sieciosław** | Przeglądanie osadzonych stron, karty i widok podzielony. Część witryn blokuje osadzanie w ramkach. |
| **Władca Poleceń** | Terminal zaimplementowany w JavaScript z poleceniami do obsługi BigOS. Nie uruchamia powłoki Bash; polecenie `ping` jest symulacją. |
| **Rachmistrz i Rachmistrz Kodu** | Kalkulator oraz obliczenia programistyczne, systemy liczbowe i operacje bitowe. |
| **Kasiarz i Przelicznik** | Obliczenia finansowe i przeliczanie jednostek. |
| **Nadzorca** | Lista aktywności, diagnostyka, obciążenie pętli zdarzeń, dostępne pomiary pamięci JavaScript i zajętość magazynu witryny. |
| **Pogodynka** | Informacje pogodowe pobierane z usługi sieciowej. |
| **Witaj w BigOS** | Informacje o wydaniu, szybkie akcje, opis BigAI i porady. |

Nadzorca nie mierzy wykorzystania całego procesora, pamięci RAM ani fizycznego dysku komputera. Dostępność szczegółowych pomiarów zależy od interfejsów udostępnionych przez przeglądarkę.

### Gry

W projekcie znajdują się między innymi **Pełzacz**, **Czołgi**, **Murarz**, **Ufoludki**, **Odbijanka**, **Trzepotek**, **Ścigacz**, **Bombiarz** i **Kółko i Krzyżyk**, a także moduł **WASM Engine** do uruchamiania przygotowanych gier WebAssembly.

Wydajność i dostępne sposoby sterowania zależą od urządzenia, przeglądarki i konkretnej gry.

## BigAI 2026 — Centrum Dowodzenia Systemem

BigAI pełni rolę centralnego asystenta i zarządcy systemu BigOS. Potrafi sterować oknami i aplikacjami, wyszukiwać informacje w przeglądarce **Sieciosław**, zapisywać podyktowane notatki w programie **Skryba**, tworzyć pliki i foldery na pulpicie, otwierać obrazy w **Patrzałce**, generować grafikę i wideo oraz tworzyć nowe aplikacje dla BigOS.

- **Obsługiwani dostawcy i modele czatu**:
  - **Google Gemini API**: `Gemini 4 Argon`, `Gemini 3.8 Flash`, `Gemini 3.6 Flash`, `Gemini 3.5 Flash Lite`, `Gemini 3.1 Pro / Flash / Flash Lite`.
  - **OpenAI API**: `GPT-6 Astra`, `GPT-6.1 Sol`, `GPT-6.1 Terra` (z trybami **Service Tier**: `Standard`, `Fast`, `UltraFast`) oraz `GPT-6 Luna`, `GPT-6 Sol`, `GPT-5.6 Sol`, `GPT-5.6 Terra`, `GPT-5.6 Luna`, `GPT-5.6 Nano`, `GPT-5.5` (z trybami `Standard`, `Fast`).
  - **Anthropic Claude**: `Claude Fable 5.1`, `Claude Opus 5.5`, `Claude Sonnet 5.5`, `Claude Haiku 5.5`.
  - **xAI, DeepSeek, Groq LPU, OpenRouter**: `Grok 4`, `DeepSeek V3.2 / R2`, `Llama 4 Maverick / Scout` oraz modele udostępniane przez OpenRouter.
  - **Lokalny Zarządca Systemu (Offline)**: działa lokalnie bez klucza API, obsługując komendy sterowania systemem BigOS, tworzenie plików/folderów, notatki w Skrybie, wyszukiwanie w Sieciosławiu oraz lokalne generowanie mediów demonstracyjnych.
- **Generatory zdjęć i wideo**: integracja z modelami **Gemini Nano Banana 2.1 / Pro / 2 lite**, **Omni 1.1 Flash**, **Veo 3.1-lite / -fast / Quality** oraz **FLUX 3** (zdjęcia i wideo), z automatycznym zapisem do systemu plików BigOS i podglądem w Patrzałce lub Grajaczu Filmów.
- **Dyktowanie (STT) i głosy asystentów (TTS)**: obsługa Web Speech API 2026, Gemini Audio STT, OpenAI GPT-4o Transcribe, Groq Whisper v3 Turbo, ElevenLabs Scribe v2, Deepgram Nova-3 oraz głosów Gemini Live Audio, OpenAI TTS, ElevenLabs v3 i Cartesia Sonic-2.
- **Bezpieczeństwo**: walidacja poleceń systemowych, podgląd zmian przy edycji istniejących plików, możliwość zatrzymania żądania w dowolnym momencie oraz uruchamianie generowanych aplikacji wyłącznie w izolowanej piaskownicy `iframe`.

Przy korzystaniu z zewnętrznych usług API wysyłana treść trafia do wybranego dostawcy i wymaga własnego klucza API oraz połączenia z internetem. Nie udostępniaj publicznie swoich kluczy API ani kopii zapasowych zawierających poświadczenia.

## Dane i kopie zapasowe

Dane BigOS są powiązane z profilem przeglądarki i adresem witryny. Inna przeglądarka, domena lub port serwera mogą korzystać z osobnego magazynu danych.

Odświeżenie strony zwykle zachowuje zapisane pliki, ale wyczyszczenie danych witryny, usunięcie profilu lub działanie w trybie prywatnym może spowodować ich utratę. Przechowywanie lokalne nie zastępuje kopii zapasowej.

W Menu Start dostępna jest opcja kopii zapasowej i przywracania. Kopię warto pobrać na komputer przed większą aktualizacją lub operacją konserwacyjną. Klucze API i dane logowania są domyślnie pomijane; ich dołączenie wymaga osobnego wyboru.

**Formatowanie usuwa dane BigOS.** Reset ustawień i reset hasła są odrębnymi operacjami. Przed formatowaniem pobierz kopię danych, które chcesz zachować.

## Uruchamianie

### Lokalny serwer

Wymagane są Git, Python i nowoczesna przeglądarka. Projekt należy uruchamiać przez serwer HTTP, zamiast otwierać `index.html` bezpośrednio jako plik.

```bash
git clone https://github.com/Programista-Art/Bigos.git
cd Bigos
python -m http.server 8080
```

Otwórz [http://localhost:8080](http://localhost:8080).

Jeżeli w Twoim systemie interpreter jest dostępny jako `python3`, użyj `python3 -m http.server 8080`.

Do uruchomienia dostarczonej wersji z gotowym arkuszem CSS nie jest wymagane instalowanie zależności npm. Są one potrzebne do przebudowy stylów i uruchamiania testów.

### Offline i PWA

BigOS zawiera manifest PWA i Service Workera. Po pierwszym poprawnym uruchomieniu oraz zapisaniu wymaganych zasobów w pamięci podręcznej możliwe jest ponowne otwarcie środowiska bez internetu.

- Service Worker wymaga odpowiedniego kontekstu: `localhost` podczas pracy lokalnej lub HTTPS po publikacji.
- Bezpośrednie uruchomienie przez `file://` nie zapewnia działania Service Workera.
- Modele AI, pogoda, strony internetowe i inne zasoby sieciowe nadal wymagają połączenia.
- Po aktualizacji może być potrzebne zaakceptowanie dostępnej aktualizacji i ponowne otwarcie strony.
- Możliwość instalacji PWA oraz szczegóły działania offline zależą od przeglądarki.

## Rozwój i testy

Do pracy deweloperskiej potrzebne są Node.js i npm. Zależności projektu są zapisane w `package-lock.json`.

```bash
npm ci
npx playwright install chromium firefox
```

| Polecenie | Działanie |
| --- | --- |
| `npm run serve` | Lokalny serwer na porcie 8080, wymagający Pythona. |
| `npm run build:css` | Kompilacja Tailwind CSS do `css/bigos-tw.css`. |
| `npm run check:syntax` | Sprawdzenie składni plików JavaScript. |
| `npm test` | Testy jednostkowe i regresyjne modułów produkcyjnych. |
| `npm run test:browser` | Testy przeglądarkowe Playwright. Skrypt uruchamia własny serwer testowy. |
| `npm run validate` | Kompilacja CSS, kontrola składni i testy jednostkowe. Nie obejmuje testów przeglądarkowych. |

Pełny zestaw sprawdzeń:

```bash
npm run validate
npm run test:browser
```

Do sprawdzenia w obu silnikach potrzebne są zainstalowane przeglądarki Chromium i Firefox. Pominięcie niedostępnego silnika nie stanowi potwierdzenia zgodności z nim. Dodatni wynik testów automatycznych nie zastępuje oceny wyglądu na rzeczywistych urządzeniach i przy różnych ustawieniach powiększenia.

## Technologie i dokumentacja

- **Interfejs:** HTML5, Vanilla JavaScript i CSS.
- **Style:** lokalnie kompilowany Tailwind CSS w `css/bigos-tw.css`.
- **Dane:** IndexedDB z wersjonowanym schematem v2 oraz localStorage.
- **Grafika i multimedia:** Canvas, interfejsy audio i wideo przeglądarki oraz WebAssembly.
- **PWA:** `manifest.webmanifest` i `sw.js`.
- **Biblioteki pomocnicze:** między innymi JSZip, jsmediatags, exif-js i Leaflet, zależnie od używanej funkcji.

Dokumentacja:

- [Architektura systemu](docs/ARCHITECTURE.md) — magazyn danych, migracje, kopie zapasowe, cykl życia aplikacji i uprawnienia.
- [Katalog dołączonych aplikacji](docs/BUNDLED_CATALOG.md) — dodawanie i aktualizowanie programów z `Programy/`.

## Zgłaszanie problemów

Błędy i propozycje można zgłaszać przez [GitHub Issues](https://github.com/Programista-Art/Bigos/issues). W zgłoszeniu podaj wersję BigOS, przeglądarkę, rozmiar okna, poziom powiększenia oraz kroki pozwalające odtworzyć problem. W przypadku usterek interfejsu pomocny jest zrzut ekranu.

Przed udostępnieniem logów usuń klucze API, hasła i prywatne treści.

## Społeczność i kontakt

- [Discord](https://discord.gg/aXuxvn7tzY)
- [Facebook](https://www.facebook.com/profile.php?id=61563368962907)
- [YouTube](https://www.youtube.com/@programistaart)
- [LinkedIn](https://www.linkedin.com/in/dymitr-wygowski-bb707216b/)

Autor: **Dymitr Wygowski / Programista-Art**.

## Licencja

Projekt jest udostępniany na licencji MIT. Pełne warunki znajdują się w pliku [LICENSE](LICENSE). Zewnętrzne biblioteki i zasoby mogą podlegać własnym licencjom.

## Galeria aplikacji

Przykładowe widoki aplikacji z różnych etapów rozwoju BigOS.

<p align="center">
  <img src="images/app/powitanie.png" width="49%" alt="Ekran powitalny BigOS" />
  <img src="images/app/BIGAI-w-bigosie.png" width="49%" alt="Asystent BigAI w BigOS" />
  <img src="images/app/motywy.png" width="49%" alt="Personalizacja motywów BigOS" />
  <img src="images/app/grajek.png" width="49%" alt="Odtwarzacz muzyki Grajek" />
  <img src="images/app/scryba-i-bigai.png" width="49%" alt="Edytor Skryba i asystent BigAI" />
  <img src="images/app/siecioslaw.png" width="49%" alt="Przeglądarka Sieciosław i aplikacje BigOS" />
  <img src="images/app/siecioslaw2.png" width="49%" alt="Dodatkowy widok przeglądarki Sieciosław" />
  <img src="images/app/skryba.png" width="49%" alt="Skryba i narzędzia systemowe BigOS" />
  <img src="images/app/wladca-polecen.png" width="49%" alt="Terminal Władca Poleceń" />
  <img src="images/app/1.png" width="49%" alt="Przykładowy pulpit z uruchomionymi aplikacjami" />
  <img src="images/app/2.png" width="49%" alt="Okna aplikacji na pulpicie BigOS" />
  <img src="images/app/artysta.png" width="49%" alt="Aplikacje graficzne i menedżer plików BigOS" />
  <img src="images/app/BIGAI.png" width="49%" alt="BigAI i aplikacje systemowe" />
  <img src="images/app/bigai-ustawienia.png" width="49%" alt="Ustawienia asystenta BigAI" />
</p>

## Galeria motywów

Przykładowe palety dostępne w Kombinatorze. Paletę kolorów można łączyć ze stylem interfejsu i efektami tła.

<p align="center">
  <img src="images/motywy/1.png" width="32%" alt="Motyw Amber" />
  <img src="images/motywy/2.png" width="32%" alt="Motyw Dracula" />
  <img src="images/motywy/3.png" width="32%" alt="Motyw Nord" />
  <img src="images/motywy/4.png" width="32%" alt="Motyw Tokyo" />
  <img src="images/motywy/5.png" width="32%" alt="Motyw Gruvbox" />
  <img src="images/motywy/6.png" width="32%" alt="Motyw Monokai" />
  <img src="images/motywy/7.png" width="32%" alt="Motyw Cyberpunk 2077" />
  <img src="images/motywy/8.png" width="32%" alt="Motyw Hacker / Matrix" />
  <img src="images/motywy/9.png" width="32%" alt="Motyw Tron" />
  <img src="images/motywy/10.png" width="32%" alt="Motyw Synthwave" />
  <img src="images/motywy/11.png" width="32%" alt="Motyw Pip-Boy" />
  <img src="images/motywy/12.png" width="32%" alt="Motyw Ocean" />
  <img src="images/motywy/13.png" width="32%" alt="Motyw Emerald" />
  <img src="images/motywy/14.png" width="32%" alt="Motyw Ruby" />
  <img src="images/motywy/15.png" width="32%" alt="Motyw Sunset" />
  <img src="images/motywy/16.png" width="32%" alt="Motyw Toxic" />
  <img src="images/motywy/17.png" width="32%" alt="Motyw OLED" />
  <img src="images/motywy/18.png" width="32%" alt="Motyw Czysty jasny" />
  <img src="images/motywy/19.png" width="32%" alt="Motyw Czysty ciemny" />
</p>
