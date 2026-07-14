// ======================================================================
// PLIK: js/aplikacje/powitanie.js (Ekran Powitalny BigOS v2.0.0)
// ======================================================================

window.powitanieApp = {
    init: () => {
        powitanieApp.upgradeUI();

        // Twarde pobranie wartości z pamięci przeglądarki
        const skipWelcome = localStorage.getItem('bigos_skip_welcome');
        const checkbox = document.getElementById('powitanie-skip-cb');
        
        // Zaznaczamy/Odznaczamy checkboxa zgodnie z zapisanym stanem
        if (checkbox) {
            checkbox.checked = (skipWelcome === 'true');
        }

        // Twardy warunek: jeśli pamięć NIE mówi "true", otwieramy powitanie
        if (skipWelcome !== 'true') {
            setTimeout(() => {
                if (typeof winManager !== 'undefined') {
                    winManager.open('powitanie');
                }
                powitanieApp.openTab('start'); // Zawsze otwieraj na pierwszej zakładce
            }, 800); // Odczekaj chwilę po wczytaniu pulpitu
        }
    },

    upgradeUI: () => {
        let appWindow = document.getElementById('app-powitanie');
        if (!appWindow) {
            appWindow = document.createElement('div');
            appWindow.id = 'app-powitanie';
            appWindow.className = 'window absolute hidden';
            document.body.appendChild(appWindow);
        }

        appWindow.style.width = '750px';
        appWindow.style.height = '500px';
        appWindow.style.background = 'transparent';
        appWindow.style.border = 'none';
        appWindow.style.boxShadow = 'none';

        const titleBar = appWindow.querySelector('.title-bar');
        Array.from(appWindow.children).forEach(child => { if (child !== titleBar) child.remove(); });
        if (titleBar) titleBar.style.display = 'none';

        const proUI = document.createElement('div');
        proUI.className = 'flex flex-col overflow-hidden relative themed-app g-panel rounded-lg shadow-2xl h-full w-full';

        proUI.innerHTML = `
            <!-- Tematyczny Pasek Tytułowy -->
            <div class="px-4 py-2 border-b g-border flex justify-between items-center cursor-move bg-black/30 shrink-0 relative z-50 shadow-md" onmousedown="winManager.startDrag(event, 'app-powitanie')" ontouchstart="winManager.startDrag(event, 'app-powitanie')">
                <span class="text-sm font-bold g-accent drop-shadow-md flex items-center gap-2">👋 Witaj w BigOS <span class="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold ml-1">v2.0.0</span></span>
                <div class="flex gap-2">
                    <button onclick="winManager.minimize('powitanie')" class="g-icon-btn px-1 hover:text-white transition">_</button>
                    <button onclick="winManager.close('powitanie')" class="text-red-500 hover:text-red-400 px-1 font-bold transition">✖</button>
                </div>
            </div>

            <div class="flex flex-row flex-grow overflow-hidden relative">
                <!-- Lewy Panel Zakładek -->
                <div class="w-[200px] border-r g-border bg-black/10 flex flex-col p-2 shrink-0 overflow-y-auto custom-scrollbar gap-1">
                    <button id="powitanie-nav-start" onclick="powitanieApp.openTab('start')" class="powitanie-nav w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition flex items-center gap-3 g-text hover:bg-white/10">
                        <span class="text-xl">🚀</span> Start
                    </button>
                    <button id="powitanie-nav-news" onclick="powitanieApp.openTab('news')" class="powitanie-nav w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition flex items-center gap-3 g-text hover:bg-white/10">
                        <span class="text-xl">✨</span> Co nowego?
                    </button>
                    <button id="powitanie-nav-ai" onclick="powitanieApp.openTab('ai')" class="powitanie-nav w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition flex items-center gap-3 g-text hover:bg-white/10">
                        <span class="text-xl">🤖</span> Moduł BigAI
                    </button>
                    <button id="powitanie-nav-tips" onclick="powitanieApp.openTab('tips')" class="powitanie-nav w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition flex items-center gap-3 g-text hover:bg-white/10">
                        <span class="text-xl">💡</span> Porady
                    </button>
                    
                    <div class="mt-auto p-3 border-t g-border">
                        <label class="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" id="powitanie-skip-cb" class="w-4 h-4 accent-blue-500 cursor-pointer" onchange="powitanieApp.toggleSkip()">
                            <span class="text-xs g-text-muted group-hover:g-text transition font-medium select-none leading-tight">Nie pokazuj tego okna przy starcie</span>
                        </label>
                    </div>
                </div>

                <!-- Prawy Panel (Treść) -->
                <div class="flex-grow relative overflow-hidden bg-black/5">
                    
                    <!-- ZAKŁADKA 1: START -->
                    <div id="powitanie-tab-start" class="powitanie-tab absolute inset-0 p-8 overflow-y-auto custom-scrollbar flex flex-col items-center text-center">
                        <div class="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center text-5xl shadow-2xl shadow-blue-500/30 mb-6 transform rotate-3">
                            🖥️
                        </div>
                        <h1 class="text-3xl font-bold g-text mb-2 drop-shadow-md">Witaj w systemie BigOS!</h1>
                        <p class="text-lg g-accent font-bold mb-6">Wersja 2.0.0 Ultimate (AI & Productivity Edition)</p>
                        
                        <p class="g-text-muted text-sm max-w-lg leading-relaxed mb-8">
                            Zbudowaliśmy dla Ciebie kompletny, wirtualny system operacyjny działający wprost w przeglądarce. 
                            Nie jest to już tylko zbiór okienek – to potężne centrum produktywności, zarządzania plikami, multimediów i sztucznej inteligencji.
                        </p>
                        
                        <div class="grid grid-cols-2 gap-4 w-full max-w-lg">
                            <button onclick="powitanieApp.openTab('news')" class="g-btn py-3 rounded-xl font-bold shadow-md hover:scale-105 transition flex items-center justify-center gap-2 border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white">
                                <span>📖</span> Zobacz listę zmian
                            </button>
                            <button onclick="winManager.close('powitanie')" class="g-btn py-3 rounded-xl font-bold shadow-md hover:scale-105 transition flex items-center justify-center gap-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white">
                                <span>🚀</span> Rozpocznij pracę
                            </button>
                        </div>
                    </div>

                    <!-- ZAKŁADKA 2: CO NOWEGO (CHANGELOG) -->
                    <div id="powitanie-tab-news" class="powitanie-tab absolute inset-0 p-6 overflow-y-auto custom-scrollbar hidden">
                        <h2 class="text-2xl font-bold g-text mb-6 flex items-center gap-3 border-b g-border pb-3">
                            <span class="text-3xl">✨</span> Co nowego w wersji 2.0.0?
                        </h2>
                        
                        <div class="flex flex-col gap-6">
                            <div class="g-panel bg-black/20 p-4 rounded-xl border g-border shadow-sm">
                                <h3 class="font-bold text-blue-400 text-lg mb-2 flex items-center gap-2"><span>📝</span> Skryba PRO (Edytor Tekstu)</h3>
                                <ul class="list-disc list-inside text-sm g-text-muted space-y-1 ml-2">
                                    <li><b class="g-text">Prawy panel Asystenta BigAI:</b> Zmiana tonu wypowiedzi, stylu, grupy docelowej i celu tekstu.</li>
                                    <li><b class="g-text">Multi-Eksport:</b> Zapis plików do .RTF, .DOC, .HTML oraz .TXT (z zachowaniem kolorów i formatowania).</li>
                                    <li><b class="g-text">Nowy interfejs:</b> Przycisk "Tryb Skupienia" (Focus Mode) ukrywający wszystkie paski narzędzi.</li>
                                    <li><b class="g-text">Tłumacz na żywo:</b> 36 języków z zaawansowanym oknem podglądu tłumaczenia.</li>
                                    <li><b class="g-text">Historia Wersji (Revisions):</b> Zapisywanie migawek dokumentu co 5 minut.</li>
                                </ul>
                            </div>

                            <div class="g-panel bg-black/20 p-4 rounded-xl border g-border shadow-sm">
                                <h3 class="font-bold text-purple-400 text-lg mb-2 flex items-center gap-2"><span>🤖</span> BigAI & Pamięć Systemu</h3>
                                <ul class="list-disc list-inside text-sm g-text-muted space-y-1 ml-2">
                                    <li><b class="g-text">Zewnętrzne silniki:</b> Obsługa kluczy z Groq, OpenRouter i OpenAI bezpośrednio w przeglądarce.</li>
                                    <li><b class="g-text">Mowa i Dyktowanie:</b> Integracja z modelem Whisper (Groq) oraz automatyczne odczytywanie na głos (TTS).</li>
                                    <li><b class="g-text">Pamięć IndexedDB:</b> Agent posiada własny "mózg", zapisuje notatki i potrafi przypomnieć, o czym rozmawialiście.</li>
                                    <li><b class="g-text">Zarządzanie systemem:</b> Możesz głosem uruchamiać aplikacje, zmieniać tapety i sterować muzyką!</li>
                                </ul>
                            </div>

                            <div class="g-panel bg-black/20 p-4 rounded-xl border g-border shadow-sm">
                                <h3 class="font-bold text-emerald-400 text-lg mb-2 flex items-center gap-2"><span>🖼️</span> Patrzałka & Kombinator</h3>
                                <ul class="list-disc list-inside text-sm g-text-muted space-y-1 ml-2">
                                    <li><b class="g-text">Patrzałka:</b> Wbudowany edytor zdjęć (jasność, filtry, kadrowanie) z żywym Histogramem oraz <b>Ukrytym Sejfem na kod PIN</b>.</li>
                                    <li><b class="g-text">Kombinator:</b> Pełen silnik motywów (Mica, Neumorphism, Win11, Aero) z dynamicznymi cząsteczkami w tle (np. padający kod Matrixa lub śnieg).</li>
                                </ul>
                            </div>
                            
                            <div class="g-panel bg-black/20 p-4 rounded-xl border g-border shadow-sm">
                                <h3 class="font-bold text-yellow-400 text-lg mb-2 flex items-center gap-2"><span>🌐</span> Sieciosław & Reszta Systemu</h3>
                                <ul class="list-disc list-inside text-sm g-text-muted space-y-1 ml-2">
                                    <li><b class="g-text">Sieciosław:</b> Pionowe karty, podział ekranu na dwie strony, omijanie blokad Frame-Busting i boczny panel AI.</li>
                                    <li><b class="g-text">Niezawodność danych:</b> Pełne, bezpieczne i gwarantowane zapisywanie całego systemu w potężnej bazie <b>IndexedDB</b> (żadne pliki już nie znikną!).</li>
                                    <li><b class="g-text">Upychacz ZIP:</b> Drag&Drop całych folderów i inteligentny wypakowywacz archiwów na Pulpit.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- ZAKŁADKA 3: BIG AI -->
                    <div id="powitanie-tab-ai" class="powitanie-tab absolute inset-0 p-6 overflow-y-auto custom-scrollbar hidden">
                        <div class="text-center mb-6 border-b g-border pb-6">
                            <div class="text-6xl mb-4 drop-shadow-xl animate-bounce">🤖</div>
                            <h2 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Twój osobisty asystent BigAI</h2>
                            <p class="g-text-muted text-sm mt-2 max-w-md mx-auto">BigOS jest pierwszym wirtualnym systemem w pełni kontrolowanym przez sztuczną inteligencję. Wystarczy go odpowiednio poinstruować!</p>
                        </div>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="g-bg border g-border p-4 rounded-xl shadow-inner">
                                <h3 class="font-bold g-text mb-2">🎤 Budzenie głosem</h3>
                                <p class="text-xs g-text-muted">Jeśli włączysz nasłuchiwanie w <b>Ustawieniach Podpowiadacza</b>, wystarczy że w dowolnym momencie powiesz "Bigos" – agent natychmiast wysłucha Twojego polecenia.</p>
                            </div>
                            <div class="g-bg border g-border p-4 rounded-xl shadow-inner">
                                <h3 class="font-bold g-text mb-2">🧠 Zapamiętywanie</h3>
                                <p class="text-xs g-text-muted">W edytorze "Skryba", zaznacz fragment tekstu i w prawym panelu kliknij "Zapamiętaj to info". AI zrzuci to do swojej pamięci i odnajdzie, gdy go o to poprosisz.</p>
                            </div>
                            <div class="g-bg border g-border p-4 rounded-xl shadow-inner">
                                <h3 class="font-bold g-text mb-2">⚙️ Sterowanie Systemem</h3>
                                <p class="text-xs g-text-muted">Wpisz w okno Podpowiadacza: "Otwórz Kalkulator", "Zmień tapetę na kosmos", "Zatrzymaj muzykę" lub "Zmień motyw na ciemny".</p>
                            </div>
                            <div class="g-bg border g-border p-4 rounded-xl shadow-inner">
                                <h3 class="font-bold g-text mb-2">🔑 Własne Modele</h3>
                                <p class="text-xs g-text-muted">Darmowy silnik działa tylko w symulatorze twórcy. Jeśli chcesz potęgi - podepnij swój klucz API z platform <b>OpenRouter, Groq lub OpenAI</b>.</p>
                            </div>
                        </div>
                    </div>

                    <!-- ZAKŁADKA 4: PORADY -->
                    <div id="powitanie-tab-tips" class="powitanie-tab absolute inset-0 p-6 overflow-y-auto custom-scrollbar hidden">
                        <h2 class="text-2xl font-bold g-text mb-6 flex items-center gap-3 border-b g-border pb-3">
                            <span class="text-3xl">💡</span> Przydatne porady
                        </h2>
                        
                        <div class="space-y-4">
                            <div class="flex items-start gap-4 p-3 bg-black/10 rounded-lg border border-white/5">
                                <div class="text-2xl mt-1">🖱️</div>
                                <div>
                                    <h4 class="font-bold g-text text-sm">Prawy Przycisk Myszy</h4>
                                    <p class="text-xs g-text-muted mt-1">Klikaj Prawym Przyciskiem Myszy (lub przytrzymaj palec na telefonie) na ikonach pulpitu i w Aktówce. Odblokujesz potężne menu kontekstowe z opcją tworzenia folderów, kompresji do ZIP i "Otwórz za pomocą".</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-4 p-3 bg-black/10 rounded-lg border border-white/5">
                                <div class="text-2xl mt-1">📂</div>
                                <div>
                                    <h4 class="font-bold g-text text-sm">Przeciągnij i Upuść (Drag & Drop)</h4>
                                    <p class="text-xs g-text-muted mt-1">Możesz przeciągać obrazki lub pliki tekstowe bezpośrednio ze swojego Prawdziwego Windowsa wprost do okna Skryby, Upychacza, a także przesuwać ikony wewnątrz Aktówki BigOS.</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-4 p-3 bg-black/10 rounded-lg border border-white/5">
                                <div class="text-2xl mt-1">⌨️</div>
                                <div>
                                    <h4 class="font-bold g-text text-sm">Skróty Klawiszowe</h4>
                                    <p class="text-xs g-text-muted mt-1">Gdy piszesz w Notatniku, używaj <b>Ctrl + S</b> (Zapis), <b>Ctrl + B</b> (Pogrubienie). W przeglądarce <b>Ctrl + T</b> (Nowa karta). Grając w gry, można powiększyć okno dwukrotnym kliknięciem w ekran!</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-4 p-3 bg-black/10 rounded-lg border border-white/5">
                                <div class="text-2xl mt-1">🗑️</div>
                                <div>
                                    <h4 class="font-bold text-red-400 text-sm">Problemy z systemem? Hasiok!</h4>
                                    <p class="text-xs g-text-muted mt-1">Jeśli coś się zepsuło, wejdź do <b>Szuflady (Menu Start)</b> i na samym dole kliknij opcję <b>Formatuj</b>. Wyzeruje to bazę danych IndexedDB i przywróci system do stanu nowości.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        appWindow.appendChild(proUI);
    },

    toggleSkip: () => {
        const checkbox = document.getElementById('powitanie-skip-cb');
        if (checkbox && checkbox.checked) {
            localStorage.setItem('bigos_skip_welcome', 'true');
            if (typeof apps !== 'undefined') apps.showToast('Zapisano', 'Ekran powitalny został wyłączony.', 'success');
        } else {
            localStorage.setItem('bigos_skip_welcome', 'false');
            if (typeof apps !== 'undefined') apps.showToast('Zapisano', 'Ekran powitalny będzie znów widoczny.', 'info');
        }
    },

    openTab: (tabId) => {
        document.querySelectorAll('.powitanie-tab').forEach(t => t.classList.add('hidden'));
        const activeTab = document.getElementById('powitanie-tab-' + tabId);
        if (activeTab) activeTab.classList.remove('hidden');

        document.querySelectorAll('.powitanie-nav').forEach(n => {
            n.classList.remove('bg-blue-500/20', 'border-l-4', 'border-blue-500', 'text-blue-400', 'shadow-inner', 'g-bg');
            n.classList.add('g-text', 'border-transparent', 'border-l-4');
        });
        
        const activeNav = document.getElementById('powitanie-nav-' + tabId);
        if(activeNav) {
            activeNav.classList.add('bg-blue-500/20', 'border-blue-500', 'text-blue-400', 'shadow-inner', 'g-bg');
            activeNav.classList.remove('g-text', 'border-transparent');
        }
    }
};

setTimeout(window.powitanieApp.init, 500);

// Globalny uchwyt żeby z Menu Start "Powitanie" działało po nowemu
if (typeof powitanieApp === 'undefined') {
    var powitanieApp = window.powitanieApp;
}