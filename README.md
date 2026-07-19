# 🖥️ BigOS - Wirtualny System Operacyjny (WebOS)

**BigOS** to zaawansowany, w pełni funkcjonalny wirtualny system operacyjny działający całkowicie wewnątrz przeglądarki internetowej. Został zbudowany przy użyciu nowoczesnych technologii webowych (Vanilla JavaScript, HTML5, Tailwind CSS) i nie wymaga żadnej instalacji.

Wyposażony w potężny system plików (IndexedDB), wielościeżkowy edytor wideo, rozbudowany edytor grafiki, obsługę sztucznej inteligencji (BigAI) oraz dziesiątki wbudowanych aplikacji, BigOS to coś więcej niż tylko symulator – to prawdziwe środowisko pracy i rozrywki w chmurze.

<img src="images/app/powitanie.png"  title="Opis 1" />

## Główne cechy systemu ✨

* 📁 **Lokalny System Plików (IndexedDB):** Zapisuj pliki, twórz foldery, przenoś i kopiuj dane. Twój wirtualny dysk przetrwa odświeżenie strony!

* 🤖 **BigAI (Wbudowany Asystent):** Inteligentny agent zintegrowany z systemem. Potrafi otwierać aplikacje, zmieniać tapety, tłumaczyć teksty, czytać na głos (TTS) i analizować strony internetowe. Wspiera lokalne klucze API (Google Gemini, OpenAI, Groq, OpenRouter).

* 🎨 **Silnik Motywów (Kombinator):** W pełni konfigurowalny interfejs. Obsługa stylów takich jak: Windows 11 (Mica), macOS (Glassmorphism), Neumorphism, a także dynamicznych efektów cząsteczkowych w tle (Matrix, Śnieg, Bąbelki).

* ☁️ **Local-First:** Domyślnie system działa offline na Twoim komputerze.

* 🎮 **Gry i Rozrywka:** Zoptymalizowany silnik do gier Arcade pisany w Canvas (60 FPS) ze sterowaniem dotykowym na urządzeniach mobilnych.

* 📱 **Responsywność:** System okien (`winManager`) inteligentnie dopasowuje się do ekranów komputerów oraz smartfonów, obsługując gesty przeciągania.

## 📦 Wbudowane Aplikacje

BigOS zawiera potężny pakiet wbudowanego oprogramowania (ponad 30 aplikacji!), w tym:

### 🛠️ Produktywność i Praca

* **Skryba:** Zaawansowany edytor tekstu (WYSIWYG) z trybem skupienia, historią zmian (revisions) i eksportem do PDF/DOCX/RTF/HTML.

* **Tabelarz:** W pełni funkcjonalny arkusz kalkulacyjny obsługujący formuły matematyczne i funkcje.

* **Aktówka:** Menedżer plików (Eksplorator) z obsługą podglądu, drag & drop z fizycznego komputera i archiwizacji.

* **Upychacz ZIP:** Narzędzie do kompresji i dekompresji archiwów w locie.

* **Zadaniowiec:** Tablica Kanban do zarządzania zadaniami (Todo, In Progress, Done).

### 🎨 Multimedia i Grafika

* **Szkicownik (Artysta PRO):** Edytor graficzny z obsługą warstw, filtrów, trybów mieszania i integracją z generowaniem obrazów przez AI.

* **Patrzałka:** Przeglądarka zdjęć przypominająca interfejsem Adobe Lightroom (aktywny histogram, suwaki korekcji barw) oraz wbudowany, ukryty Sejf na kod PIN.

* **Montażysta:** Profesjonalny, wielościeżkowy edytor wideo z osią czasu (NLE). Działa w oparciu o natywny silnik przeglądarki (WebM) lub potężny silnik `FFmpeg.wasm`.

* **Grajek:** Odtwarzacz muzyki z 18-pasmowym equalizerem (EQ), systemem playlist i sprzętowym wizualizatorem audio na żywo.

* **Grajacz Filmów:** Odtwarzacz wideo z trybem kinowym, PiP (Picture-in-Picture) oraz obsługą linków strumieniowych (HLS/YouTube).

### 💻 Narzędzia Systemowe

* **Sieciosław:** Przeglądarka internetowa z obsługą pionowych kart, widokiem Split-Screen oraz blokowaniem barier X-Frame.

* **Władca Poleceń:** Interaktywny terminal (bash) pozwalający na poruszanie się po systemie plików, wywoływanie aplikacji, a nawet dekodowanie Base64 czy pingowanie.

* **Rachmistrz & Rachmistrz Kodu:** Kalkulator naukowy oraz specjalistyczny kalkulator programisty (operacje bitowe, Signed/Unsigned, Hex/Bin).

* **Kasiarz:** Kalkulator finansowy (VAT, ROI, Lokaty, Kredyty, Marże).

* **Nadzorca & Pogodynka:** Menedżer zadań (CPU/RAM monitor) oraz zaawansowana aplikacja pogodowa (API Open-Meteo).

## 🕹️ Moduł Gier

System zawiera zestaw klasycznych gier wyposażonych we własny silnik i lazy-loading zasobów:
`Pełzacz (Snake)` • `Murarz (Breakout)` • `Ufoludki (Space Invaders)` • `Odbijanka (Pong)` • `Trzepotek (Flappy Bird)` • `Ścigacz` • `Bombiarz` • `Kółko i Krzyżyk` • `WASM Engine (Do odpalania gier takich jak DOOM w przeglądarce!)`.

## 🛠️ Technologie

System został zbudowany od zera bez użycia ciężkich frameworków (React/Vue/Angular), co gwarantuje błyskawiczne ładowanie.

* **Frontend:** HTML5, Vanilla JavaScript (ES6+), CSS3

* **Stylowanie:** Tailwind CSS

* **Pamięć:** IndexedDB (baza plików), LocalStorage (szybki cache)

* **Zewnętrzne Biblioteki:** `JSZip` (archiwa), `FFmpeg.wasm` (eksport wideo), `jsmediatags` (metadane MP3), `exif-js` (metadane zdjęć), `Leaflet` (mapy).

## 🚀 Jak uruchomić?

### Wersja lokalna (Offline)

1. Sklonuj to repozytorium: `git clone https://github.com/Programista-Art/Bigos.git`

2. Wejdź do folderu z projektem.

3. Otwórz plik `index.html` w dowolnej nowoczesnej przeglądarce (Chrome, Edge, Firefox, Safari).
   *Uwaga: Niektóre zaawansowane funkcje, jak pobieranie zewnętrznych czcionek czy map, mogą wymagać uruchomienia lokalnego serwera (np. za pomocą rozszerzenia Live Server w VS Code). lub jak masz zainstalowany python to w folderze z Bigosem otwórz cmd i wpisz polecenie python -m http.server i wejśź do przeglądarki wpisz localhost:8000*


## 🤝 Społeczność i Kontakt

System **BigOS** jest przeze mnie aktywnie i nieustannie rozwijany! Jeśli masz pytania, pomysły na nowe funkcje, znalazłeś błąd lub po prostu chcesz porozmawiać o projekcie, gorąco zapraszam do dołączenia do naszej społeczności i śledzenia moich kanałów:

* 👾 **Discord:** [Dołącz do naszego serwera](https://discord.gg/ZDJxUJp2Y)
* 📘 **Facebook:** [Odwiedź FanPage](https://www.facebook.com/profile.php?id=61563368962907)
* 📺 **YouTube:** [Zasubskrybuj Kanał](https://www.youtube.com/@programistaart)
* 💼 **LinkedIn:** [Nawiążmy kontakt](https://www.linkedin.com/in/dymitr-wygowski-bb707216b/) 

Zawsze chętnie wysłucham Twojej opinii i sugestii dotyczących dalszego rozwoju systemu!   

## 📜 Licencja

Ten projekt jest objęty licencją MIT. Możesz swobodnie używać, modyfikować i rozprowadzać kod.

*Stworzone z pasją do programowania. BigOS - System w Twojej przeglądarce.*




## Aplikacje w BigOS

<p align="center">
  <img src="images/app/powitanie.png" width="49%" title="Opis 1" />
  <img src="images/app/BIGAI-w-bigosie.png" width="49%" title="BIG AI" />
  <img src="images/app/motywy.png" width="49%" title="Motywy w BigOS" />
  <img src="images/app/grajek.png" width="49%" title="Program Grajek" />
  <img src="images/app/scryba-i-bigai.png" width="49%" title="Skryba i Grajek" />
  <img src="images/app/siecioslaw.png" width="49%" title="Rachmistrz i Sieciosław" />
<img src="images/app/siecioslaw2.png" width="49%" title="Sieciosław" />
  <img src="images/app/skryba.png" width="49%" title="Skryba, Nadzorca Systemu, Upychacz ZIP" />
  <img src="images/app/wladca-polecen.png" width="49%" title="Władca poleceń" />
  <img src="images/app/1.png" width="49%" title="Pogodynka, Sieciosław, Big AI" />
  <img src="images/app/2.png" width="49%" title="Pogodynka, Sieciosław, Big AI" />
  <img src="images/app/artysta.png" width="49%" title="Patrzałka PRO, Aktówka, Artysta" />
  <img src="images/app/BIGAI.png" width="49%" title="Pogodynka, Sieciosław, Big AI" />
 <img src="images/app/bigai-ustawienia.png" width="49%" title="Big AI ustawienia" />
</p>

## Motywy w BigOS znajdziejsz je w programie Kombinator 19 sztuk
<p align="center">
    <img src="images/motywy/1.png" width="32%" title="Amber" />
    <img src="images/motywy/2.png" width="32%" title="Dracula" />
    <img src="images/motywy/3.png" width="32%" title="Nord" />
    <img src="images/motywy/4.png" width="32%" title="Tokyo" />
    <img src="images/motywy/5.png" width="32%" title="Gruvbox" />
    <img src="images/motywy/6.png" width="32%" title="Monokai" />
    <img src="images/motywy/7.png" width="32%" title="Cyberpunk 2077" />
    <img src="images/motywy/8.png" width="32%" title="Hacker / Matrix" />
    <img src="images/motywy/9.png" width="32%" title="Tron" />
    <img src="images/motywy/10.png" width="32%" title="Synthwave" />
    <img src="images/motywy/11.png" width="32%" title="Pip-Boy" />
    <img src="images/motywy/12.png" width="32%" title="Ocean" />
    <img src="images/motywy/13.png" width="32%" title="Emerald" />
    <img src="images/motywy/14.png" width="32%" title="Ruby" />
    <img src="images/motywy/15.png" width="32%" title="Sunset" />
    <img src="images/motywy/16.png" width="32%" title="Toxic" />
    <img src="images/motywy/17.png" width="32%" title="Oled" />
    <img src="images/motywy/18.png" width="32%" title="Czysty jasny" />
    <img src="images/motywy/19.png" width="32%" title="Czysty Ciemny" />
</p>

