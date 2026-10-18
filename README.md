# BigOS — system operacyjny w przeglądarce

**Wersja 2.0.1**

**BigOS** to przeglądarkowe środowisko pracy z pulpitem, oknami, systemem plików, aplikacjami biurowymi, multimediami, grami i asystentem BigAI. Projekt powstaje w HTML, CSS i JavaScript, bez Reacta, Vue ani Angulara.

Aplikacja działa wewnątrz przeglądarki. Nie zastępuje systemu operacyjnego komputera i nie wymaga instalowania programu desktopowego. Pliki oraz ustawienia są domyślnie zapisywane lokalnie w magazynie danej witryny, bez automatycznej synchronizacji w chmurze.

<img src="images/app/powitanie.png" alt="Przykładowy ekran powitalny BigOS" width="100%" />

> Zrzuty w galerii przedstawiają różne etapy rozwoju projektu i mogą różnić się od bieżącego interfejsu.

## Co zmieniło się w wersji 2.0.1

- Ujednolicono zapis danych w IndexedDB, migrację starszych danych i obsługę błędów magazynu.
- Usprawniono kopie zapasowe, przywracanie danych i historię wersji dokumentów w Skrybie.
- Rozbudowano Menedżer Aplikacji o wyszukiwanie, sortowanie, szczegóły i obsługę pakietów.
- Dodano automatyczną instalację dołączonych aplikacji z katalogu `Programy/`, z zapamiętywaniem ich odinstalowania.
- Poprawiono izolację aplikacji zewnętrznych, kontrolę uprawnień oraz synchronizację motywów.
- Dodano obsługę rozmiarów zadeklarowanych przez pakiety i wysokości dopasowanej do zawartości.
- Odświeżono program „Witaj w BigOS”, informacje o projekcie i szybkie akcje.
- Poprawiono lokalne style, aktualizacje zasobów i obsługę pamięci podręcznej Service Workera.

Projekt pozostaje w rozwoju. Układ niektórych okien, w tym powitania, jest nadal dopracowywany pod kątem małych ekranów, powiększenia tekstu i ograniczonej wysokości obszaru roboczego.

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

## BigAI

BigAI jest zintegrowany z aplikacjami i wybranymi operacjami systemu. Może pomagać w pracy z tekstem, generować propozycje aplikacji i wykonywać obsługiwane polecenia.

- **Symulator testowy offline** działa lokalnie i zwraca przygotowane odpowiedzi demonstracyjne. Nie jest lokalnym modelem językowym.
- **Zewnętrzni dostawcy**, między innymi Google Gemini, OpenAI, Groq i OpenRouter, wymagają połączenia z internetem oraz odpowiedniej konfiguracji i poświadczeń.
- Funkcje głosowe, generowanie obrazów i dostępność modeli zależą od wybranego dostawcy, przeglądarki i przyznanych uprawnień.
- Sam wpis dostawcy w ustawieniach nie oznacza zapewnionej bezpłatnej usługi ani dostępu do modelu.
- Dodano walidację poleceń, podgląd zmian przy modyfikowaniu plików i możliwość zatrzymania żądania.

Przy korzystaniu z usług zewnętrznych wysyłana treść trafia do wybranego dostawcy. Nie udostępniaj publicznie swoich kluczy API ani kopii zapasowych zawierających poświadczenia.

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
