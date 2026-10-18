// ======================================================================
// PLIK: js/powitanie.js (Ekran Powitalny BigOS v2.0.1)
// ======================================================================

(function(global) {
    'use strict';

    const BIGOS_VERSION = '2.0.1';
    global.BIGOS_VERSION = BIGOS_VERSION;

    const powitanieApp = {
        VERSION: BIGOS_VERSION,
        _autoOpened: false,

        /**
         * Przygotowuje lub aktualizuje zawartość okna Powitanie.
         */
        render: () => {
            let appWindow = document.getElementById('app-powitanie');
            if (!appWindow) {
                appWindow = document.createElement('div');
                appWindow.id = 'app-powitanie';
                appWindow.className = 'window w-[750px] h-[520px] themed-app g-panel border g-border shadow-2xl overflow-hidden hidden';
                appWindow.dataset.prefW = '750px';
                appWindow.dataset.prefH = '520px';
                appWindow.style.width = '750px';
                appWindow.style.height = '520px';
                document.body.appendChild(appWindow);
            }

            // Upewnij się, że okno posiada standardowe klasy systemowe
            if (!appWindow.classList.contains('themed-app')) appWindow.classList.add('themed-app');
            if (!appWindow.classList.contains('g-panel')) appWindow.classList.add('g-panel');
            if (!appWindow.classList.contains('border')) appWindow.classList.add('border');
            if (!appWindow.classList.contains('g-border')) appWindow.classList.add('g-border');
            if (!appWindow.classList.contains('overflow-hidden')) appWindow.classList.add('overflow-hidden');
            appWindow.classList.remove('flex', 'flex-col');

            // Jeśli okno nie ma jeszcze właściwej struktury wewnętrznej, wstrzyknij autorytatywny szablon
            if (!appWindow.querySelector('.powitanie-main')) {
                appWindow.innerHTML = powitanieApp.getTemplate();
            }

            powitanieApp.syncPreferenceUI();
            return appWindow;
        },

        /**
         * Zwraca autorytatywny szablon HTML dla ekranu powitalnego v2.0.1.
         */
        getTemplate: () => {
            return `
                <!-- Pasek tytułowy -->
                <div class="title-bar px-4 py-2 border-b g-border flex justify-between items-center bg-black/20 shrink-0 cursor-move select-none" onmousedown="winManager && winManager.startDrag(event, 'app-powitanie')" ontouchstart="winManager && winManager.startDrag(event, 'app-powitanie')">
                    <span class="text-sm font-bold g-accent drop-shadow-md flex items-center gap-2">
                        <span>👋</span> <span>Witaj w BigOS</span>
                        <span id="powitanie-version-badge" class="text-[11px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold ml-1">v${BIGOS_VERSION}</span>
                    </span>
                    <div class="flex gap-1.5 items-center no-drag" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()">
                        <button onclick="winManager && winManager.minimize('powitanie')" class="g-icon-btn px-2 py-0.5 rounded hover:bg-white/10 transition text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" title="Minimalizuj" aria-label="Minimalizuj">_</button>
                        <button id="powitanie-titlebar-close" onclick="winManager && winManager.close('powitanie')" class="text-red-500 hover:text-red-400 px-2 py-0.5 rounded hover:bg-red-500/20 font-bold transition text-xs focus:outline-none focus:ring-1 focus:ring-red-400" title="Zamknij" aria-label="Zamknij">✖</button>
                    </div>
                </div>

                <!-- Główny układ z elastyczną nawigacją adaptującą się do szerokości okna -->
                <div class="powitanie-main flex flex-row flex-grow overflow-hidden relative">
                    <!-- Pasek zakładek (sidebar w oknie szerokim, poziomy pasek w oknie wąskim) -->
                    <div class="powitanie-nav-container w-[190px] border-r g-border bg-black/10 flex flex-col p-2.5 shrink-0 overflow-y-auto custom-scrollbar gap-1.5">
                        <button id="powitanie-nav-start" onclick="powitanieApp.openTab('start')" class="powitanie-nav powitanie-nav-btn w-full text-left px-3 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition inline-flex items-center gap-2.5 bg-blue-500/20 border-l-4 border-blue-500 text-blue-400 shadow-inner g-bg shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400" title="Ekran startowy">
                            <span class="nav-icon text-lg">🚀</span> <span class="nav-text">Start</span>
                        </button>
                        <button id="powitanie-nav-news" onclick="powitanieApp.openTab('news')" class="powitanie-nav powitanie-nav-btn w-full text-left px-3 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition inline-flex items-center gap-2.5 g-text border-transparent border-l-4 hover:bg-white/10 shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400" title="Informacje o wydaniu ${BIGOS_VERSION}">
                            <span class="nav-icon text-lg">✨</span> <span class="nav-text">Co nowego</span>
                        </button>
                        <button id="powitanie-nav-ai" onclick="powitanieApp.openTab('ai')" class="powitanie-nav powitanie-nav-btn w-full text-left px-3 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition inline-flex items-center gap-2.5 g-text border-transparent border-l-4 hover:bg-white/10 shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400" title="Konfiguracja asystenta BigAI">
                            <span class="nav-icon text-lg">🤖</span> <span class="nav-text">Moduł BigAI</span>
                        </button>
                        <button id="powitanie-nav-tips" onclick="powitanieApp.openTab('tips')" class="powitanie-nav powitanie-nav-btn w-full text-left px-3 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition inline-flex items-center gap-2.5 g-text border-transparent border-l-4 hover:bg-white/10 shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400" title="Wskazówki i diagnostyka">
                            <span class="nav-icon text-lg">💡</span> <span class="nav-text">Porady</span>
                        </button>
                    </div>

                    <!-- Obszar treści (przewijany, nie zakrywa nawigacji ani kontrolek okna) -->
                    <div class="powitanie-content flex-grow relative overflow-y-auto custom-scrollbar p-5 sm:p-6 bg-black/5">
                        
                        <!-- ZAKŁADKA 1: START -->
                        <div id="powitanie-tab-start" class="powitanie-tab w-full max-w-xl mx-auto flex flex-col items-center text-center gap-4">
                            <div class="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-4xl shadow-xl shadow-blue-500/20 mb-1 transform rotate-1 select-none">
                                🖥️
                            </div>
                            <div class="flex flex-col items-center">
                                <h1 class="text-2xl sm:text-3xl font-extrabold g-text mb-1 drop-shadow-md">Witaj w systemie BigOS!</h1>
                                <p id="powitanie-version-subtitle" class="text-sm font-semibold g-accent">Wydanie ${BIGOS_VERSION}</p>
                            </div>
                            
                            <p class="g-text-muted text-xs sm:text-sm leading-relaxed max-w-md">
                                BigOS to nowoczesne środowisko operacyjne działające w Twojej przeglądarce. Zapewnia aplikacje biurowe i narzędziowe, bezpieczne zarządzanie plikami, multimedia, zaawansowaną personalizację oraz wbudowanego asystenta AI — wszystko bez konieczności instalowania oprogramowania na komputerze.
                            </p>

                            <!-- Szybkie akcje dla kluczowych aplikacji -->
                            <div class="w-full">
                                <div class="text-xs font-bold g-text uppercase tracking-wider mb-2.5 text-left flex items-center gap-1.5">
                                    <span>⚡</span> <span>Szybkie akcje</span>
                                </div>
                                <div class="powitanie-quick-grid grid grid-cols-2 gap-2 w-full text-left">
                                    <button onclick="powitanieApp.quickOpen('menadzer')" class="g-panel bg-black/20 p-2.5 rounded-lg border g-border hover:bg-white/10 transition flex items-center gap-2.5 group focus:outline-none focus:ring-1 focus:ring-blue-400">
                                        <span class="text-2xl shrink-0 group-hover:scale-110 transition">📦</span>
                                        <div class="min-w-0">
                                            <div class="font-bold text-xs g-text truncate">Menedżer Aplikacji</div>
                                            <div class="text-[11px] g-text-muted truncate">Pakiety i instalacja</div>
                                        </div>
                                    </button>
                                    <button onclick="powitanieApp.quickOpen('aktowka')" class="g-panel bg-black/20 p-2.5 rounded-lg border g-border hover:bg-white/10 transition flex items-center gap-2.5 group focus:outline-none focus:ring-1 focus:ring-blue-400">
                                        <span class="text-2xl shrink-0 group-hover:scale-110 transition">📁</span>
                                        <div class="min-w-0">
                                            <div class="font-bold text-xs g-text truncate">Aktówka</div>
                                            <div class="text-[11px] g-text-muted truncate">Menedżer plików</div>
                                        </div>
                                    </button>
                                    <button onclick="powitanieApp.quickOpen('tapeciak')" class="g-panel bg-black/20 p-2.5 rounded-lg border g-border hover:bg-white/10 transition flex items-center gap-2.5 group focus:outline-none focus:ring-1 focus:ring-blue-400">
                                        <span class="text-2xl shrink-0 group-hover:scale-110 transition">🎨</span>
                                        <div class="min-w-0">
                                            <div class="font-bold text-xs g-text truncate">Kombinator</div>
                                            <div class="text-[11px] g-text-muted truncate">Motywy i tapety</div>
                                        </div>
                                    </button>
                                    <button onclick="powitanieApp.quickOpen('nadzorca')" class="g-panel bg-black/20 p-2.5 rounded-lg border g-border hover:bg-white/10 transition flex items-center gap-2.5 group focus:outline-none focus:ring-1 focus:ring-blue-400">
                                        <span class="text-2xl shrink-0 group-hover:scale-110 transition">📊</span>
                                        <div class="min-w-0">
                                            <div class="font-bold text-xs g-text truncate">Nadzorca</div>
                                            <div class="text-[11px] g-text-muted truncate">Procesy i zasoby</div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <!-- Główne przyciski nawigacyjne Startu -->
                            <div class="powitanie-start-actions flex flex-wrap items-center justify-center gap-3 w-full">
                                <button onclick="powitanieApp.openTab('news')" class="g-btn h-9 px-4 rounded-lg font-bold text-xs shadow-md hover:scale-105 transition inline-flex items-center justify-center gap-2 border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                                    <span>📖</span> <span>Sprawdź listę zmian</span>
                                </button>
                                <button id="powitanie-btn-start-work" onclick="winManager && winManager.close('powitanie')" class="g-btn h-9 px-4 rounded-lg font-bold text-xs shadow-md hover:scale-105 transition inline-flex items-center justify-center gap-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400">
                                    <span>🚀</span> <span>Rozpocznij pracę</span>
                                </button>
                            </div>
                        </div>

                        <!-- ZAKŁADKA 2: CO NOWEGO (CHANGELOG) -->
                        <div id="powitanie-tab-news" class="powitanie-tab hidden w-full max-w-xl mx-auto flex flex-col gap-4 text-left">
                            <div class="border-b g-border pb-3">
                                <h2 class="text-xl sm:text-2xl font-bold g-text flex items-center gap-2.5">
                                    <span>✨</span> <span id="powitanie-news-title">Co nowego w wersji ${BIGOS_VERSION}?</span>
                                </h2>
                                <p class="text-xs g-text-muted mt-1">Zestawienie funkcji i ulepszeń zaimplementowanych w bieżącym wydaniu BigOS.</p>
                            </div>

                            <div class="space-y-3.5">
                                <div class="g-panel bg-black/20 p-3.5 rounded-xl border g-border shadow-sm">
                                    <h3 class="font-bold text-emerald-400 text-sm mb-1.5 flex items-center gap-2">
                                        <span>📦</span> <span>Menedżer Aplikacji i zarządzanie pakietami</span>
                                    </h3>
                                    <ul class="list-disc list-inside text-xs g-text-muted space-y-1 ml-1 leading-relaxed">
                                        <li><b class="g-text">Wyszukiwanie i sortowanie:</b> Błyskawiczne filtrowanie z pełną obsługą polskich znaków diakrytycznych oraz sortowanie alfabetyczne, po kategorii i dacie instalacji.</li>
                                        <li><b class="g-text">Autorytatywny rejestr pakietów:</b> Instalacja, uruchamianie, bezpieczne odinstalowywanie oraz eksport aplikacji w formacie BigOS z poziomu bazy danych.</li>
                                        <li><b class="g-text">Dołączone aplikacje:</b> Automatyczna instalacja programów z katalogu <code class="px-1 py-0.5 rounded bg-black/40 text-[11px]">Programy/</code> z zapamiętywaniem decyzji o usunięciu (brak niechcianego powrotu po odświeżeniu i możliwość przywrócenia z katalogu).</li>
                                    </ul>
                                </div>

                                <div class="g-panel bg-black/20 p-3.5 rounded-xl border g-border shadow-sm">
                                    <h3 class="font-bold text-blue-400 text-sm mb-1.5 flex items-center gap-2">
                                        <span>📐</span> <span>Wymiary okien i automatyczna wysokość (auto-height)</span>
                                    </h3>
                                    <ul class="list-disc list-inside text-xs g-text-muted space-y-1 ml-1 leading-relaxed">
                                        <li><b class="g-text">Deklarowane rozmiary:</b> Okna sandboksowe respektują preferowane wymiary z manifestu pakietu (np. stałe 800×600 dla BigPaint Studio, 400px dla Klikacza, 350px dla Kalkulatora BMI).</li>
                                        <li><b class="g-text">Dynamiczny auto-height:</b> Prawdziwe dopasowanie wysokości oparte na zawartości gościa (<code class="px-1 py-0.5 rounded bg-black/40 text-[11px]">ResizeObserver</code>) — okno rozszerza się naturalnie po obliczeniu wyniku bez pustych przestrzeni i bez pętli sprzężenia.</li>
                                        <li><b class="g-text">Czyszczenie geometrii:</b> Automatyczne usuwanie przestarzałych sztywnych wymiarów z pamięci podręcznej i opcja przywrócenia domyślnego rozmiaru w szczegółach programu.</li>
                                    </ul>
                                </div>

                                <div class="g-panel bg-black/20 p-3.5 rounded-xl border g-border shadow-sm">
                                    <h3 class="font-bold text-purple-400 text-sm mb-1.5 flex items-center gap-2">
                                        <span>🎨</span> <span>Synchronizacja motywów na żywo</span>
                                    </h3>
                                    <ul class="list-disc list-inside text-xs g-text-muted space-y-1 ml-1 leading-relaxed">
                                        <li><b class="g-text">Jednolity wygląd:</b> Zmiana motywu (palety, stylu okien i trybu jasnego/ciemnego) jest natychmiast propagowana do wszystkich otwartych aplikacji sandboxa bez przeładowywania i bez utraty stanu.</li>
                                    </ul>
                                </div>

                                <div class="g-panel bg-black/20 p-3.5 rounded-xl border g-border shadow-sm">
                                    <h3 class="font-bold text-amber-400 text-sm mb-1.5 flex items-center gap-2">
                                        <span>💾</span> <span>Pamięć lokalna, historia wersji i kopie zapasowe</span>
                                    </h3>
                                    <ul class="list-disc list-inside text-xs g-text-muted space-y-1 ml-1 leading-relaxed">
                                        <li><b class="g-text">Ujednolicony magazyn IndexedDB:</b> Bezpieczne składowanie plików, ustawień i pakietów z mechanizmem automatycznego odzyskiwania.</li>
                                        <li><b class="g-text">Historia dokumentów w Skrybie:</b> Zapisywanie migawek dokumentów tekstowych oraz bezpieczne przywracanie wcześniejszych wersji.</li>
                                        <li><b class="g-text">Kopia zapasowa i odzyskiwanie:</b> Eksport i import całego systemu (pliki, pakiety, ustawienia) w jednym pliku JSON z zachowaniem danych binarnych.</li>
                                        <li><b class="g-text">Uruchamianie offline:</b> Zaktualizowany Service Worker buforuje kompletny zestaw zasobów bazowych, umożliwiając start systemu bez dostępu do Internetu.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <!-- ZAKŁADKA 3: BIG AI -->
                        <div id="powitanie-tab-ai" class="powitanie-tab hidden w-full max-w-xl mx-auto flex flex-col gap-4 text-left">
                            <div class="border-b g-border pb-3">
                                <h2 class="text-xl sm:text-2xl font-bold g-text flex items-center gap-2.5">
                                    <span>🤖</span> <span>Asystent BigAI i konfiguracja modeli</span>
                                </h2>
                                <p class="text-xs g-text-muted mt-1">Przejrzyste zasady działania modułu sztucznej inteligencji w systemie BigOS.</p>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div class="g-panel bg-black/20 p-3.5 rounded-xl border g-border shadow-sm">
                                    <h3 class="font-bold text-blue-400 text-sm mb-1.5 flex items-center gap-2">
                                        <span>🧪</span> <span>Lokalny symulator testowy</span>
                                    </h3>
                                    <p class="text-xs g-text-muted leading-relaxed">
                                        Moduł BigAI zawiera wbudowany symulator testowy, który działa całkowicie lokalnie w przeglądarce i nie wymaga połączenia sieciowego ani kluczy API. Generuje on demonstracyjne, predefiniowane odpowiedzi pomocne podczas testowania interfejsu.
                                    </p>
                                </div>

                                <div class="g-panel bg-black/20 p-3.5 rounded-xl border g-border shadow-sm">
                                    <h3 class="font-bold text-purple-400 text-sm mb-1.5 flex items-center gap-2">
                                        <span>🌐</span> <span>Zewnętrzni dostawcy AI</span>
                                    </h3>
                                    <p class="text-xs g-text-muted leading-relaxed">
                                        BigOS umożliwia podłączenie zewnętrznych dostawców modeli językowych (takich jak OpenAI, Groq czy OpenRouter). Korzystanie z nich wymaga aktywnego połączenia z Internetem oraz podania własnego klucza API w ustawieniach Podpowiadacza.
                                    </p>
                                </div>

                                <div class="g-panel bg-black/20 p-3.5 rounded-xl border g-border shadow-sm">
                                    <h3 class="font-bold text-amber-400 text-sm mb-1.5 flex items-center gap-2">
                                        <span>ℹ️</span> <span>Brak wbudowanych bezpłatnych usług</span>
                                    </h3>
                                    <p class="text-xs g-text-muted leading-relaxed">
                                        Sama obecność dostawcy na liście rozwijanej nie oznacza aktywnej ani bezpłatnej usługi w chmurze. System nie pośredniczy w płatnościach i nie oferuje darmowych tokenów komercyjnych — użytkownik konfiguruje własne poświadczenia.
                                    </p>
                                </div>

                                <div class="g-panel bg-black/20 p-3.5 rounded-xl border g-border shadow-sm">
                                    <h3 class="font-bold text-emerald-400 text-sm mb-1.5 flex items-center gap-2">
                                        <span>📝</span> <span>Integracja z edytorem Skryba</span>
                                    </h3>
                                    <p class="text-xs g-text-muted leading-relaxed">
                                        Po skonfigurowaniu klucza asystent wspomaga redagowanie tekstów: pozwala zmieniać styl i ton wypowiedzi, tłumaczyć fragmenty oraz zadawać pytania bezpośrednio z bocznego panelu edytora.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- ZAKŁADKA 4: PORADY -->
                        <div id="powitanie-tab-tips" class="powitanie-tab hidden w-full max-w-xl mx-auto flex flex-col gap-4 text-left">
                            <div class="border-b g-border pb-3">
                                <h2 class="text-xl sm:text-2xl font-bold g-text flex items-center gap-2.5">
                                    <span>💡</span> <span>Wskazówki i bezpieczne korzystanie</span>
                                </h2>
                                <p class="text-xs g-text-muted mt-1">Praktyczne informacje o pamięci, kopiach zapasowych i obsłudze systemu.</p>
                            </div>

                            <div class="space-y-3">
                                <div class="g-panel bg-black/20 p-3.5 rounded-xl border g-border">
                                    <h3 class="font-bold text-emerald-400 text-sm mb-1 flex items-center gap-2">
                                        <span>💾</span> <span>Pamięć przeglądarki i kopie zapasowe</span>
                                    </h3>
                                    <p class="text-xs g-text-muted leading-relaxed">
                                        Twoje pliki, pakiety i preferencje są zapisywane lokalnie w przeglądarce w bazie IndexedDB. Pamiętaj, że wyczyszczenie danych przeglądarki lub praca w trybie incognito usunie te dane. <b class="g-text">Zalecenie:</b> Regularnie pobieraj kopię zapasową w aplikacji <i>Kombinator</i> lub <i>Nadzorca</i>, aby bezpiecznie zachować swoje pliki.
                                    </p>
                                </div>

                                <div class="g-panel bg-black/20 p-3.5 rounded-xl border g-border">
                                    <h3 class="font-bold text-blue-400 text-sm mb-1 flex items-center gap-2">
                                        <span>⚡</span> <span>Działanie offline i online</span>
                                    </h3>
                                    <p class="text-xs g-text-muted leading-relaxed">
                                        System startuje w trybie offline po jednokrotnym pobraniu i zapisaniu zasobów przez Service Worker. Pamiętaj jednak, że funkcje sieciowe (takie jak zewnętrzne modele BigAI czy prognoza pogody) wymagają aktywnego połączenia z Internetem.
                                    </p>
                                </div>

                                <div class="g-panel bg-black/20 p-3.5 rounded-xl border g-border">
                                    <h3 class="font-bold text-amber-400 text-sm mb-1 flex items-center gap-2">
                                        <span>🔧</span> <span>Diagnostyka i rozwiązywanie problemów</span>
                                    </h3>
                                    <p class="text-xs g-text-muted leading-relaxed">
                                        W przypadku problemów skorzystaj z diagnostyki w <i>Nadzorcy</i> oraz możliwości przywrócenia danych z kopii zapasowej. <i>Formatowanie systemu</i> to opcja ostateczna — usuwa bezpowrotnie wszystkie Twoje pliki i ustawienia, dlatego nie należy stosować jej jako domyślnego kroku naprawczego.
                                    </p>
                                </div>

                                <div class="g-panel bg-black/20 p-3.5 rounded-xl border g-border">
                                    <h3 class="font-bold text-purple-400 text-sm mb-1 flex items-center gap-2">
                                        <span>⌨️</span> <span>Wygodne skróty i gesty</span>
                                    </h3>
                                    <p class="text-xs g-text-muted leading-relaxed">
                                        Wciśnij <kbd class="px-1.5 py-0.5 rounded bg-black/40 text-[11px] font-mono border g-border">Ctrl + K</kbd>, aby otworzyć uniwersalne wyszukiwanie aplikacji i plików. Użyj prawego przycisku myszy (lub przytrzymaj palec na ekranie) na pulpicie lub w Aktówce, aby otworzyć menu kontekstowe.
                                    </p>
                                </div>

                                <div class="g-panel bg-black/20 p-3.5 rounded-xl border g-border">
                                    <h3 class="font-bold g-text text-sm mb-2 flex items-center gap-2">
                                        <span>🔗</span> <span>Społeczność i inne projekty</span>
                                    </h3>
                                    <div class="flex flex-wrap gap-2 text-xs">
                                        <a href="https://discord.gg/F5g2CE5Tu" target="_blank" rel="noopener noreferrer" class="g-btn px-2.5 py-1 rounded border g-border hover:bg-white/10 text-blue-400 transition inline-flex items-center gap-1.5">
                                            <span>💬</span> <span>Discord BigOS</span>
                                        </a>
                                        <a href="https://www.facebook.com/profile.php?id=61563368962907" target="_blank" rel="noopener noreferrer" class="g-btn px-2.5 py-1 rounded border g-border hover:bg-white/10 text-blue-400 transition inline-flex items-center gap-1.5">
                                            <span>👥</span> <span>Facebook</span>
                                        </a>
                                        <a href="https://avocado-code.com/" target="_blank" rel="noopener noreferrer" class="g-btn px-2.5 py-1 rounded border g-border hover:bg-white/10 text-emerald-400 transition inline-flex items-center gap-1.5">
                                            <span>🥑</span> <span>Avocado IDE</span>
                                        </a>
                                        <a href="https://bursztynos.dimitalart.pl/" target="_blank" rel="noopener noreferrer" class="g-btn px-2.5 py-1 rounded border g-border hover:bg-white/10 text-amber-400 transition inline-flex items-center gap-1.5">
                                            <span>💎</span> <span>Bursztyn OS</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Pasek dolny (zawsze widoczny, nie znika podczas przewijania treści) -->
                <div class="powitanie-footer p-2.5 px-4 border-t g-border bg-black/20 shrink-0 flex items-center justify-between gap-3 text-xs">
                    <label class="flex items-center gap-2 cursor-pointer group select-none">
                        <input type="checkbox" id="powitanie-skip-cb" class="w-4 h-4 accent-blue-500 cursor-pointer rounded" onchange="powitanieApp.toggleSkip()">
                        <span class="text-xs g-text-muted group-hover:g-text transition font-medium">Nie pokazuj tego okna przy starcie</span>
                    </label>
                    <button id="powitanie-footer-close" onclick="winManager && winManager.close('powitanie')" class="g-btn h-8 px-4 font-bold text-xs rounded-lg transition inline-flex items-center justify-center gap-1.5 shrink-0 hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-blue-400">
                        <span>Zamknij</span>
                    </button>
                </div>
            `;
        },

        /**
         * Uruchomienie aplikacji po zalogowaniu do systemu.
         * Otwiera okno dokładnie RAZ, chyba że użytkownik wyłączył pokazywanie przy starcie.
         */
        onLogin: () => {
            if (powitanieApp._autoOpened) return;
            const skipWelcome = localStorage.getItem('bigos_skip_welcome');
            powitanieApp.syncPreferenceUI();
            if (skipWelcome !== 'true') {
                powitanieApp._autoOpened = true;
                powitanieApp.render();
                if (typeof winManager !== 'undefined') {
                    winManager.open('powitanie');
                }
                powitanieApp.openTab('start');
            }
        },

        /**
         * Obsługa ręcznego otwarcia okna (np. z Menu Start lub Pulpitu).
         */
        onOpen: () => {
            powitanieApp.render();
            powitanieApp.syncPreferenceUI();
            const visibleTab = document.querySelector('.powitanie-tab:not(.hidden)');
            if (!visibleTab) powitanieApp.openTab('start');
        },

        /**
         * Inicjalizacja komponentu (kompatybilność wsteczna).
         */
        init: (opts) => {
            powitanieApp.render();
            powitanieApp.syncPreferenceUI();
            if (opts && opts.auto) {
                powitanieApp.onLogin();
            }
        },

        /**
         * Synchronizuje stan checkboxa z wartością w localStorage.
         */
        syncPreferenceUI: () => {
            const skipWelcome = localStorage.getItem('bigos_skip_welcome');
            const checkbox = document.getElementById('powitanie-skip-cb');
            if (checkbox) {
                checkbox.checked = (skipWelcome === 'true');
            }
        },

        /**
         * Zmiana preferencji "Nie pokazuj tego okna przy starcie".
         */
        toggleSkip: (explicitVal) => {
            const checkbox = document.getElementById('powitanie-skip-cb');
            let isSkip;
            if (typeof explicitVal === 'boolean') {
                isSkip = explicitVal;
                if (checkbox) checkbox.checked = isSkip;
            } else if (checkbox) {
                isSkip = checkbox.checked;
            } else {
                isSkip = localStorage.getItem('bigos_skip_welcome') !== 'true';
            }

            localStorage.setItem('bigos_skip_welcome', isSkip ? 'true' : 'false');
            if (typeof apps !== 'undefined' && apps.showToast) {
                if (isSkip) {
                    apps.showToast('Zapisano', 'Ekran powitalny nie pojawi się przy kolejnym uruchomieniu.', 'info');
                } else {
                    apps.showToast('Zapisano', 'Ekran powitalny będzie wyświetlany przy starcie systemu.', 'success');
                }
            }
        },

        /**
         * Przełączanie zakładek nawigacyjnych (start, news, ai, tips).
         */
        openTab: (tabId) => {
            powitanieApp.render();
            document.querySelectorAll('.powitanie-tab').forEach(t => t.classList.add('hidden'));
            const activeTab = document.getElementById('powitanie-tab-' + tabId);
            if (activeTab) activeTab.classList.remove('hidden');

            document.querySelectorAll('.powitanie-nav').forEach(n => {
                n.classList.remove('bg-blue-500/20', 'border-l-4', 'border-blue-500', 'text-blue-400', 'shadow-inner', 'g-bg');
                n.classList.add('g-text', 'border-transparent', 'border-l-4');
            });
            
            const activeNav = document.getElementById('powitanie-nav-' + tabId);
            if (activeNav) {
                activeNav.classList.add('bg-blue-500/20', 'border-blue-500', 'text-blue-400', 'shadow-inner', 'g-bg');
                activeNav.classList.remove('g-text', 'border-transparent');
            }

            const contentEl = document.querySelector('.powitanie-content');
            if (contentEl) {
                contentEl.scrollTop = 0;
            }
        },

        /**
         * Szybkie uruchomienie wybranej aplikacji systemowej.
         */
        quickOpen: (appId) => {
            if (typeof winManager !== 'undefined') {
                winManager.open(appId);
            }
        }
    };

    global.powitanieApp = powitanieApp;

    // Synchronizuj stan po załadowaniu DOM (bez wymuszania otwarcia okna)
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => powitanieApp.syncPreferenceUI());
        } else {
            powitanieApp.syncPreferenceUI();
        }
    }
})(typeof window !== 'undefined' ? window : globalThis);