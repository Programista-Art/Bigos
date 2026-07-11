// ======================================================================
// PLIK: js/aplikacje/pogodynka.js (Pogodynka - Opcjonalna lokalizacja, nowy UI)
// ======================================================================

const pogodynkaApp = {
    currentLat: 52.23, // Domyślnie Warszawa
    currentLon: 21.01,
    currentCity: 'Warszawa',
    
    favorites: [],
    // Dodano pole allowLocation (domyślnie false - wyłączone)
    settings: { unitT: 'C', unitW: 'kmh', ambientSound: false, allowLocation: false },
    
    audioCtx: null,
    ambientNode: null,
    weatherCode: 0,
    isDay: 1,
    
    lastData: null,
    hasFetchedData: false, 

    init: () => {
        try {
            const fav = localStorage.getItem('bigos_pog_favs');
            if (fav) pogodynkaApp.favorites = JSON.parse(fav);
            const set = localStorage.getItem('bigos_pog_settings');
            if (set) pogodynkaApp.settings = {...pogodynkaApp.settings, ...JSON.parse(set)};
        } catch(e) {}

        // Zabezpieczenie starszych zapisów
        if (pogodynkaApp.settings.allowLocation === undefined) {
            pogodynkaApp.settings.allowLocation = false;
        }

        pogodynkaApp.upgradeUI();
        
        // Czekamy na otwarcie okna by pobrać dane
        setTimeout(() => {
            if (typeof winManager !== 'undefined' && !pogodynkaApp._winManagerPatched) {
                const origOpen = winManager.open;
                winManager.open = function(appId) {
                    origOpen.apply(this, arguments);
                    if (appId === 'pogodynka') {
                        pogodynkaApp.onOpen();
                    }
                };
                pogodynkaApp._winManagerPatched = true;
            }
        }, 1000);
    },

    onOpen: () => {
        if (pogodynkaApp.hasFetchedData) return; 
        pogodynkaApp.hasFetchedData = true;

        const lastCity = localStorage.getItem('bigos_pog_last');

        // Jeśli zgoda na lokalizację jest WYŁĄCZONA (lub brak wsparcia w przeglądarce)
        if (!pogodynkaApp.settings.allowLocation || !navigator.geolocation) {
            if (lastCity) {
                pogodynkaApp.currentCity = lastCity;
                pogodynkaApp.search(lastCity);
            } else {
                pogodynkaApp.currentCity = 'Warszawa';
                pogodynkaApp.currentLat = 52.23;
                pogodynkaApp.currentLon = 21.01;
                pogodynkaApp.fetchWeatherData();
            }
            return;
        }

        // Jeśli zgoda na lokalizację jest WŁĄCZONA (ciche wyszukiwanie bez toastów błędów)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                pogodynkaApp.searchByCoords(lat, lon);
            },
            (err) => {
                // Cichy fallback - brak czerwonych komunikatów o błędzie!
                if (lastCity) {
                    pogodynkaApp.currentCity = lastCity;
                    pogodynkaApp.search(lastCity);
                } else {
                    pogodynkaApp.currentCity = 'Warszawa';
                    pogodynkaApp.currentLat = 52.23;
                    pogodynkaApp.currentLon = 21.01;
                    pogodynkaApp.fetchWeatherData();
                }
            },
            { timeout: 4000, maximumAge: 0 }
        );
    },

    saveData: () => {
        localStorage.setItem('bigos_pog_favs', JSON.stringify(pogodynkaApp.favorites));
        localStorage.setItem('bigos_pog_settings', JSON.stringify(pogodynkaApp.settings));
        localStorage.setItem('bigos_pog_last', pogodynkaApp.currentCity);
    },

    // ==================================================================
    // INTERFEJS
    // ==================================================================
    upgradeUI: () => {
        let appWindow = document.getElementById('app-pogodynka');
        if (!appWindow) return;

        appWindow.style.width = '850px';
        appWindow.style.height = '600px';
        appWindow.style.background = 'transparent';
        appWindow.style.border = 'none';
        appWindow.style.boxShadow = 'none';

        const titleBar = appWindow.querySelector('.title-bar');
        Array.from(appWindow.children).forEach(child => { if (child !== titleBar) child.remove(); });
        if(titleBar) titleBar.style.display = 'none';

        const proUI = document.createElement('div');
        proUI.className = 'flex flex-col overflow-hidden relative themed-app g-panel rounded-lg shadow-2xl h-full w-full';
        proUI.id = 'pog-main-container';

        proUI.innerHTML = `
            <!-- Pasek Tytułowy -->
            <div class="px-4 py-2 border-b g-border flex justify-between items-center cursor-move bg-black/30 shrink-0 relative z-50 shadow-md" onmousedown="winManager.startDrag(event, 'app-pogodynka')" ontouchstart="winManager.startDrag(event, 'app-pogodynka')">
                <span class="text-sm font-bold g-text drop-shadow-md flex items-center gap-2">🌤️ Pogodynka <span id="pog-update-time" class="text-[9px] g-text-muted font-normal ml-2 hidden sm:inline"></span></span>
                <div class="flex gap-2">
                    <button onclick="pogodynkaApp.toggleAmbient()" id="pog-btn-snd" class="g-icon-btn px-1 g-text hover:text-blue-300 transition" title="Dźwięki Otoczenia">🔇</button>
                    <div class="w-px h-4 bg-gray-500/50 mx-1 self-center"></div>
                    <button onclick="winManager.minimize('pogodynka')" class="g-icon-btn px-1 g-text transition">_</button>
                    <button onclick="winManager.maximize('app-pogodynka')" class="g-icon-btn px-1 g-text transition">□</button>
                    <button onclick="pogodynkaApp.stop(); winManager.close('pogodynka')" class="text-red-400 hover:text-red-300 px-1 font-bold transition drop-shadow-md">✖</button>
                </div>
            </div>

            <div class="flex flex-row flex-grow overflow-hidden relative z-10">
                
                <!-- Lewy Panel Zakładek i Wyszukiwarki -->
                <div class="w-[180px] sm:w-[200px] border-r g-border bg-black/10 flex flex-col p-2 shrink-0 overflow-y-auto custom-scrollbar">
                    <!-- Wyszukiwarka -->
                    <div class="flex gap-1 mb-4 border-b g-border pb-3">
                        <input type="text" id="pog-search-input" placeholder="Miasto..." class="w-full text-xs p-2 rounded-l-lg g-bg g-text border g-border border-r-0 outline-none focus:bg-white/10 transition shadow-inner" onkeydown="if(event.key==='Enter') pogodynkaApp.search()">
                        <button onclick="pogodynkaApp.search()" class="g-bg border g-border border-l-0 px-2 rounded-r-lg hover:bg-blue-500 hover:text-white transition shadow-sm">🔍</button>
                    </div>

                    <div class="flex flex-col gap-1">
                        <button onclick="pogodynkaApp.switchTab('today')" id="p-tab-today" class="pog-tab active w-full text-left px-3 py-2 rounded-lg font-bold text-xs transition flex items-center gap-2 bg-blue-500/20 text-blue-400 border border-blue-500/50"><span>🌤</span> Dzisiaj</button>
                        <button onclick="pogodynkaApp.switchTab('hourly')" id="p-tab-hourly" class="pog-tab w-full text-left px-3 py-2 rounded-lg font-bold text-xs transition flex items-center gap-2 g-text-muted hover:bg-white/10 border border-transparent"><span>🕒</span> Godzinowa</button>
                        <button onclick="pogodynkaApp.switchTab('daily')" id="p-tab-daily" class="pog-tab w-full text-left px-3 py-2 rounded-lg font-bold text-xs transition flex items-center gap-2 g-text-muted hover:bg-white/10 border border-transparent"><span>📅</span> 14 dni</button>
                        <button onclick="pogodynkaApp.switchTab('history')" id="p-tab-history" class="pog-tab w-full text-left px-3 py-2 rounded-lg font-bold text-xs transition flex items-center gap-2 g-text-muted hover:bg-white/10 border border-transparent"><span>📜</span> Historia</button>
                        <div class="border-t g-border my-1 mx-2"></div>
                        <button onclick="pogodynkaApp.switchTab('map')" id="p-tab-map" class="pog-tab w-full text-left px-3 py-2 rounded-lg font-bold text-xs transition flex items-center gap-2 g-text-muted hover:bg-white/10 border border-transparent"><span>🗺️</span> Mapa</button>
                        <button onclick="pogodynkaApp.switchTab('radar')" id="p-tab-radar" class="pog-tab w-full text-left px-3 py-2 rounded-lg font-bold text-xs transition flex items-center gap-2 g-text-muted hover:bg-white/10 border border-transparent"><span>🌧️</span> Radar</button>
                        <div class="border-t g-border my-1 mx-2"></div>
                        <button onclick="pogodynkaApp.switchTab('settings')" id="p-tab-settings" class="pog-tab w-full text-left px-3 py-2 rounded-lg font-bold text-xs transition flex items-center gap-2 g-text-muted hover:bg-white/10 border border-transparent"><span>⚙️</span> Ustawienia</button>
                    </div>
                </div>

                <!-- GŁÓWNY KONTENER ZAKŁADEK -->
                <div class="flex-grow relative overflow-hidden bg-black/5">

                    <!-- ZAKŁADKA: DZISIAJ -->
                    <div id="p-content-today" class="absolute inset-0 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4 z-10">
                        
                        <div id="pog-alert-banner" class="hidden w-full bg-red-600/80 border border-red-400 text-white p-2 rounded-lg shadow-lg items-center gap-2">
                            <span class="text-2xl animate-pulse">⚠️</span>
                            <div>
                                <div class="font-bold uppercase tracking-wider text-[10px]" id="pog-alert-title">Ostrzeżenie Meteorologiczne</div>
                                <div id="pog-alert-text" class="text-[11px] font-medium leading-tight">Niebezpieczne warunki.</div>
                            </div>
                        </div>

                        <!-- HERO (Kompaktowy) -->
                        <div class="flex items-center justify-between bg-black/10 p-5 rounded-xl border g-border shadow-md relative overflow-hidden shrink-0">
                            <div class="absolute -right-5 -top-5 opacity-10 text-[100px] blur-sm pointer-events-none" id="pog-bg-icon">☀️</div>
                            <div class="flex flex-col relative z-10 flex-1 min-w-0 pr-2">
                                <h1 class="text-2xl sm:text-3xl font-bold g-text drop-shadow-md flex flex-wrap items-center gap-2 mb-0.5 leading-tight break-words" id="pog-city-name">Ładowanie...</h1>
                                <p class="text-xs g-text-muted font-medium drop-shadow capitalize" id="pog-desc-main">--</p>
                            </div>
                            <div class="flex items-center gap-3 relative z-10 shrink-0">
                                <div class="text-5xl drop-shadow-xl" id="pog-icon-main">🌍</div>
                                <div class="flex flex-col text-right">
                                    <span class="text-4xl font-bold g-text drop-shadow-md tracking-tighter leading-none" id="pog-temp-main">--°</span>
                                    <span class="text-[10px] font-bold g-text-muted drop-shadow mt-1" id="pog-feels-like">Odczuwalna: --°</span>
                                </div>
                            </div>
                        </div>

                        <!-- GRID INFO -->
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
                            <!-- AQI (Powietrze) -->
                            <div class="g-bg border g-border p-3 rounded-lg shadow-sm flex flex-col relative items-center justify-center min-h-[85px]" id="air-main-card">
                                <div class="text-[9px] g-text-muted uppercase font-bold absolute top-1.5 left-2">Jakość Powietrza</div>
                                <div class="flex items-center gap-2 mt-3">
                                    <span class="text-2xl drop-shadow" id="air-icon">🍃</span>
                                    <div class="flex flex-col">
                                        <span class="text-lg font-bold font-mono g-text leading-none" id="air-val">--</span>
                                        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded text-white mt-1 uppercase text-center" id="air-desc" style="background-color: gray;">--</span>
                                    </div>
                                </div>
                            </div>

                            <!-- WIATR -->
                            <div class="g-bg border g-border p-3 rounded-lg shadow-sm flex flex-col relative items-center justify-center min-h-[85px]">
                                <div class="text-[9px] g-text-muted uppercase font-bold absolute top-1.5 left-2">Wiatr</div>
                                <div class="flex items-center gap-3 mt-3">
                                    <div class="text-2xl drop-shadow relative w-8 h-8 flex items-center justify-center">
                                        <div class="absolute inset-0 border border-dashed border-gray-500 rounded-full opacity-30"></div>
                                        <div id="pog-wind-arrow" class="transition-transform duration-1000 origin-center text-blue-400">↑</div>
                                    </div>
                                    <div class="flex flex-col">
                                        <span class="text-sm font-bold g-text leading-none" id="pog-wind-val">--</span>
                                        <span class="text-[9px] g-text-muted mt-1" id="pog-wind-gust">Porywy: --</span>
                                    </div>
                                </div>
                            </div>

                            <!-- UV & SŁOŃCE -->
                            <div class="g-bg border g-border p-3 rounded-lg shadow-sm flex flex-col relative justify-center min-h-[85px]">
                                <div class="text-[9px] g-text-muted uppercase font-bold absolute top-1.5 left-2">Słońce & UV</div>
                                <div class="flex justify-between items-end mt-4 px-1">
                                    <div class="flex flex-col items-center"><span class="text-sm">🌅</span><span class="text-[9px] font-mono font-bold g-text" id="pog-sunrise">--:--</span></div>
                                    <div class="flex flex-col items-center"><span class="text-sm font-bold text-yellow-500" id="pog-uv-val">UV --</span></div>
                                    <div class="flex flex-col items-center"><span class="text-sm">🌇</span><span class="text-[9px] font-mono font-bold g-text" id="pog-sunset">--:--</span></div>
                                </div>
                            </div>

                            <!-- ATMOSFERA & STATY -->
                            <div class="g-bg border g-border p-3 rounded-lg shadow-sm flex flex-col relative justify-center min-h-[85px]">
                                <div class="w-full flex flex-col gap-1 px-1 mt-3">
                                    <div class="flex justify-between items-center"><span class="text-[9px] g-text-muted">💧 Wilgotność</span><span class="text-[10px] font-bold g-text" id="pog-hum">--%</span></div>
                                    <div class="flex justify-between items-center"><span class="text-[9px] g-text-muted">🎈 Ciśnienie</span><span class="text-[10px] font-bold g-text" id="pog-pres">-- hPa</span></div>
                                    <div class="flex justify-between items-center"><span class="text-[9px] g-text-muted">🔴 Najcieplej</span><span class="text-[10px] font-bold text-red-400" id="pog-stat-max">--°</span></div>
                                </div>
                            </div>
                        </div>

                        <!-- ULUBIONE MIASTA NA GŁÓWNYM -->
                        <div class="flex flex-col p-3 border g-border rounded-lg bg-black/10 shrink-0">
                            <div class="flex justify-between items-center mb-2 px-1">
                                <h3 class="text-[10px] font-bold g-text-muted uppercase tracking-widest">⭐ Ulubione Miasta</h3>
                                <button onclick="pogodynkaApp.addFavorite()" class="text-[9px] text-blue-400 hover:text-blue-300 font-bold bg-blue-500/10 px-2 py-0.5 rounded transition">➕ Dodaj Obecne</button>
                            </div>
                            <div class="flex gap-2 overflow-x-auto custom-scrollbar pb-1" id="pog-fav-list-main">
                                <!-- JS -->
                            </div>
                        </div>
                    </div>

                    <!-- ZAKŁADKA: GODZINOWA -->
                    <div id="p-content-hourly" class="hidden absolute inset-0 overflow-y-auto custom-scrollbar p-4 flex-col z-10">
                        <h3 class="font-bold text-sm g-accent uppercase tracking-widest mb-3 border-b g-border pb-2">Prognoza Godzinowa</h3>
                        <div class="grid grid-cols-4 sm:grid-cols-6 gap-2" id="pog-hourly-list-full"></div>
                    </div>

                    <!-- ZAKŁADKA: 14 DNI -->
                    <div id="p-content-daily" class="hidden absolute inset-0 overflow-y-auto custom-scrollbar p-4 flex-col z-10">
                        <h3 class="font-bold text-sm g-accent uppercase tracking-widest mb-3 border-b g-border pb-2">Długoterminowa (14 Dni)</h3>
                        <div class="g-bg border g-border rounded-xl shadow-inner flex flex-col p-2 gap-1 w-full max-w-2xl mx-auto" id="pog-daily-list-full"></div>
                    </div>

                    <!-- ZAKŁADKA: HISTORIA -->
                    <div id="p-content-history" class="hidden absolute inset-0 overflow-y-auto custom-scrollbar p-4 flex-col z-10">
                        <h3 class="font-bold text-sm text-purple-400 uppercase tracking-widest mb-1 border-b g-border pb-2">Historia pogody</h3>
                        <p class="text-[10px] g-text-muted mb-3 italic">Darmowe API pozwala na bezpłatny wgląd maksymalnie do 2 dni wstecz.</p>
                        <div class="g-bg border g-border rounded-xl shadow-inner flex flex-col p-2 gap-1 w-full max-w-2xl mx-auto" id="pog-history-list"></div>
                    </div>

                    <!-- ZAKŁADKA: MAPA & RADAR -->
                    <div id="p-content-mapradar" class="hidden absolute inset-0 flex-col z-20 bg-black">
                        <div class="absolute top-2 left-2 right-2 bg-black/60 backdrop-blur text-white text-[10px] p-2 rounded z-20 flex justify-between items-center border border-white/20 shadow-lg">
                            <span id="map-radar-title">📡 Interaktywna Mapa (Windy.com)</span>
                            <button onclick="pogodynkaApp.refreshMapOverlay(pogodynkaApp.activeTab)" class="g-btn px-2 py-0.5 rounded text-[9px] text-white border-white hover:bg-blue-500 hover:border-blue-500">Odśwież Mape</button>
                        </div>
                        <div id="pog-radar-container" class="w-full h-full"></div>
                    </div>

                    <!-- ZAKŁADKA: USTAWIENIA (Kompaktowe UI) -->
                    <div id="p-content-settings" class="hidden absolute inset-0 overflow-y-auto custom-scrollbar p-6 flex-col items-center z-10">
                        <h3 class="font-bold text-sm g-text-muted uppercase tracking-widest mb-6 border-b g-border pb-2 w-full max-w-sm text-center">⚙️ Ustawienia Pogodynki</h3>
                        
                        <div class="g-panel border g-border rounded-xl p-4 shadow-inner w-full max-w-sm flex flex-col gap-4">
                            <div class="flex flex-col gap-1">
                                <label class="text-[10px] font-bold g-text-muted uppercase">Jednostka Temperatury</label>
                                <select id="pog-set-t" class="w-full p-1.5 rounded g-bg g-text border g-border outline-none focus:border-blue-500 font-bold text-xs" onchange="pogodynkaApp.settings.unitT=this.value; pogodynkaApp.saveData(); pogodynkaApp.fetchWeatherData()">
                                    <option value="C" ${pogodynkaApp.settings.unitT==='C'?'selected':''}>°C (Celsjusz)</option>
                                    <option value="F" ${pogodynkaApp.settings.unitT==='F'?'selected':''}>°F (Fahrenheit)</option>
                                </select>
                            </div>
                            <div class="flex flex-col gap-1 border-t g-border pt-3">
                                <label class="text-[10px] font-bold g-text-muted uppercase">Prędkość Wiatru</label>
                                <select id="pog-set-w" class="w-full p-1.5 rounded g-bg g-text border g-border outline-none focus:border-blue-500 font-bold text-xs" onchange="pogodynkaApp.settings.unitW=this.value; pogodynkaApp.saveData(); pogodynkaApp.fetchWeatherData()">
                                    <option value="kmh" ${pogodynkaApp.settings.unitW==='kmh'?'selected':''}>km/h</option>
                                    <option value="mph" ${pogodynkaApp.settings.unitW==='mph'?'selected':''}>mph (Mile)</option>
                                    <option value="ms" ${pogodynkaApp.settings.unitW==='ms'?'selected':''}>m/s (Metry)</option>
                                </select>
                            </div>
                            <div class="flex items-center justify-between gap-4 border-t g-border pt-4 mt-2">
                                <label class="text-xs font-bold g-text-muted uppercase shrink-0">Automatyczna lokalizacja</label>
                                <input type="checkbox" id="pog-set-loc" class="w-5 h-5 accent-blue-500 cursor-pointer" onchange="pogodynkaApp.toggleLocation(this.checked)" ${pogodynkaApp.settings.allowLocation ? 'checked' : ''}>
                            </div>
                            <p class="text-[9px] g-text-muted italic leading-tight mt-1">Po zaznaczeniu aplikacja użyje GPS przeglądarki, aby zawsze wyświetlać pogodę dla Twojego obecnego miejsca.</p>
                        </div>
                    </div>

                    <!-- Warstwa Efektów Pogodowych -->
                    <div id="pog-fx-layer" class="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-40"></div>
                </div>
            </div>
        `;
        appWindow.appendChild(proUI);
        
        const btnSnd = document.getElementById('pog-btn-snd');
        if(btnSnd) {
            btnSnd.innerText = pogodynkaApp.settings.ambientSound ? '🔊' : '🔇';
            if(pogodynkaApp.settings.ambientSound) btnSnd.classList.add('text-blue-300');
        }

        pogodynkaApp.renderWidget();
    },

    toggleLocation: (isChecked) => {
        pogodynkaApp.settings.allowLocation = isChecked;
        pogodynkaApp.saveData();
        
        if (isChecked) {
            if(typeof apps !== 'undefined') apps.showToast('Lokalizacja', 'Włączono dostęp do GPS. Szukam...', 'info');
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const lat = pos.coords.latitude;
                        const lon = pos.coords.longitude;
                        pogodynkaApp.searchByCoords(lat, lon);
                    },
                    (err) => {
                        if(typeof apps !== 'undefined') apps.showToast('Lokalizacja', 'Przeglądarka zablokowała dostęp do GPS.', 'error');
                        document.getElementById('pog-set-loc').checked = false;
                        pogodynkaApp.settings.allowLocation = false;
                        pogodynkaApp.saveData();
                    },
                    { timeout: 4000, maximumAge: 0 }
                );
            }
        } else {
            if(typeof apps !== 'undefined') apps.showToast('Lokalizacja', 'Wyłączono użycie GPS.', 'info');
        }
    },

    activeTab: 'today',

    switchTab: (tabId) => {
        pogodynkaApp.activeTab = tabId;
        const tabs = ['today', 'hourly', 'daily', 'history', 'map', 'radar', 'settings'];
        
        tabs.forEach(t => {
            const btn = document.getElementById(`p-tab-${t}`);
            const content = document.getElementById(`p-content-${t}`);
            if (btn) {
                btn.className = `pog-tab w-full text-left px-3 py-2 rounded-lg font-bold text-xs transition flex items-center gap-2 ${t === tabId ? 'active bg-blue-500/20 text-blue-400 border border-blue-500/50 shadow-inner' : 'g-text-muted hover:bg-white/10 border border-transparent'}`;
            }
            if (content) {
                content.classList.add('hidden');
                content.classList.remove('flex');
            }
        });

        const mapRadarContent = document.getElementById('p-content-mapradar');
        if (mapRadarContent) {
            if (tabId === 'map' || tabId === 'radar') {
                mapRadarContent.classList.remove('hidden');
                mapRadarContent.classList.add('flex');
                pogodynkaApp.refreshMapOverlay(tabId);
            } else {
                mapRadarContent.classList.add('hidden');
                mapRadarContent.classList.remove('flex');
            }
        }

        const selectedContent = document.getElementById(`p-content-${tabId}`);
        if (selectedContent) {
            selectedContent.classList.remove('hidden');
            selectedContent.classList.add('flex');
        }
    },

    // ==================================================================
    // POBIERANIE DANYCH 
    // ==================================================================
    searchByCoords: async (lat, lon) => {
        document.getElementById('pog-city-name').innerText = 'Lokalizowanie...';
        try {
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pl`);
            if(!res.ok) throw new Error("Błąd API geokodowania");
            const data = await res.json();
            
            pogodynkaApp.currentLat = lat;
            pogodynkaApp.currentLon = lon;
            pogodynkaApp.currentCity = data.city || data.locality || 'Twoja Lokalizacja';
            
            pogodynkaApp.saveData();
            pogodynkaApp.fetchWeatherData();
        } catch(e) {
            // Cichy błąd, bez czerwonych toastów na pulpicie
            pogodynkaApp.currentLat = 52.23;
            pogodynkaApp.currentLon = 21.01;
            pogodynkaApp.currentCity = 'Warszawa';
            pogodynkaApp.saveData();
            pogodynkaApp.fetchWeatherData();
        }
    },

    search: async (cityName) => {
        const query = cityName || document.getElementById('pog-search-input').value.trim();
        if(!query) return;

        document.getElementById('pog-city-name').innerText = 'Szukanie...';
        
        try {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=pl`);
            const geoData = await geoRes.json();
            
            if(!geoData.results || geoData.results.length === 0) { 
                document.getElementById('pog-city-name').innerText = pogodynkaApp.currentCity; 
                if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Miasto nie istnieje w bazie.', 'error');
                return; 
            }
            
            pogodynkaApp.currentLat = geoData.results[0].latitude;
            pogodynkaApp.currentLon = geoData.results[0].longitude;
            pogodynkaApp.currentCity = geoData.results[0].name + (geoData.results[0].country ? `, ${geoData.results[0].country}` : '');
            
            pogodynkaApp.saveData();
            pogodynkaApp.fetchWeatherData();

        } catch(e) {
            console.error(e);
            document.getElementById('pog-city-name').innerText = pogodynkaApp.currentCity;
            if(typeof apps !== 'undefined') apps.showToast('Błąd Sieci', 'Brak połączenia z API wyszukiwania miast.', 'error');
        }
    },

    fetchWeatherData: async () => {
        try {
            document.getElementById('pog-city-name').innerText = pogodynkaApp.currentCity;
            
            let tUnit = pogodynkaApp.settings.unitT === 'F' ? '&temperature_unit=fahrenheit' : '';
            let wUnit = '';
            if (pogodynkaApp.settings.unitW === 'mph') wUnit = '&wind_speed_unit=mph';
            else if (pogodynkaApp.settings.unitW === 'ms') wUnit = '&wind_speed_unit=ms';

            const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${pogodynkaApp.currentLat}&longitude=${pogodynkaApp.currentLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum&timezone=auto&past_days=2&forecast_days=14${tUnit}${wUnit}`;
            
            const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${pogodynkaApp.currentLat}&longitude=${pogodynkaApp.currentLon}&current=european_aqi,pm10,pm2_5&timezone=auto`;

            const [wxRes, aqiRes] = await Promise.all([ fetch(wxUrl), fetch(aqiUrl).catch(() => null) ]);
            
            if (!wxRes.ok) throw new Error("Błąd serwera pogody HTTP: " + wxRes.status);
            
            const wxData = await wxRes.json();
            const aqiData = (aqiRes && aqiRes.ok) ? await aqiRes.json() : null;

            pogodynkaApp.lastData = { current: wxData.current, aqi: aqiData ? aqiData.current : null };
            pogodynkaApp.renderDashboard(wxData, aqiData);
        } catch (e) {
            console.error(e);
            if (!pogodynkaApp.lastData) document.getElementById('pog-city-name').innerText = 'Brak danych';
            else document.getElementById('pog-city-name').innerText = pogodynkaApp.currentCity;
            if(typeof apps !== 'undefined') apps.showToast('Błąd API', 'Serwer pogodowy odrzucił żądanie (Limit?). Spróbuj później.', 'error');
        }
    },

    // ==================================================================
    // RENDEROWANIE DASHBOARDU
    // ==================================================================
    renderDashboard: (wx, aqi) => {
        const cur = wx.current;
        const hrl = wx.hourly;
        const dly = wx.daily;
        
        pogodynkaApp.weatherCode = cur.weather_code;
        pogodynkaApp.isDay = cur.is_day;

        pogodynkaApp.manageAmbientSound();
        pogodynkaApp.renderWidget(); 

        let todayStr = cur.time.substring(0, 10);
        let todayIdx = dly.time.findIndex(t => t === todayStr);
        if (todayIdx === -1) todayIdx = 2; // Ze względu na past_days=2

        // --- ZAKŁADKA DZISIAJ (Sekcja Główna) ---
        let mainIconObj = pogodynkaApp.getIcon(cur.weather_code, cur.is_day);
        document.getElementById('pog-icon-main').innerText = mainIconObj.icon;
        document.getElementById('pog-bg-icon').innerText = mainIconObj.icon;
        document.getElementById('pog-desc-main').innerText = mainIconObj.desc;
        document.getElementById('pog-temp-main').innerText = `${Math.round(cur.temperature_2m)}°`;
        document.getElementById('pog-feels-like').innerText = `Odczuwalna: ${Math.round(cur.apparent_temperature)}°`;
        
        let d = new Date();
        document.getElementById('pog-update-time').innerText = `(Aktualizacja: ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')})`;

        // Ostrzeżenia
        const alertBanner = document.getElementById('pog-alert-banner');
        const alertText = document.getElementById('pog-alert-text');
        const alertTitle = document.getElementById('pog-alert-title');
        let alerts = []; let isDanger = false;
        
        let gustThr = pogodynkaApp.settings.unitW === 'mph' ? 45 : (pogodynkaApp.settings.unitW === 'ms' ? 20 : 70); 
        if (cur.wind_gusts_10m > gustThr) { alerts.push(`Silne porywy wiatru: ${cur.wind_gusts_10m} ${pogodynkaApp.settings.unitW}!`); isDanger = true; }
        if (cur.weather_code >= 95) { alerts.push(`Uwaga, w rejonie trwają burze!`); isDanger = true; }
        
        let currentHourStr = cur.time.substring(0, 14) + '00'; 
        let nowIdx = hrl.time.findIndex(t => t.startsWith(currentHourStr));
        if (nowIdx >= 0 && cur.precipitation === 0) {
            let rainInHours = null; let willSnow = false;
            for (let i = nowIdx + 1; i <= nowIdx + 3 && i < hrl.time.length; i++) {
                if (hrl.precipitation[i] > 0.5) {
                    rainInHours = i - nowIdx;
                    if (hrl.weather_code[i] >= 71 && hrl.weather_code[i] <= 77) willSnow = true;
                    if (hrl.weather_code[i] === 85 || hrl.weather_code[i] === 86) willSnow = true;
                    break;
                }
            }
            if (rainInHours) alerts.push(willSnow ? `❄️ Możliwe opady śniegu za ok. ${rainInHours} godz.` : `☔ Za ok. ${rainInHours} godz. spodziewany jest deszcz.`);
        }

        if (alerts.length > 0) {
            alertText.innerHTML = alerts.join('<br>');
            if (isDanger) {
                alertBanner.className = 'w-full bg-red-600/80 border border-red-400 text-white p-2 rounded-lg shadow-lg flex items-center gap-2 backdrop-blur-md';
                alertTitle.innerText = 'Ostrzeżenie Meteorologiczne';
            } else {
                alertBanner.className = 'w-full bg-blue-600/80 border border-blue-400 text-white p-2 rounded-lg shadow-lg flex items-center gap-2 backdrop-blur-md';
                alertTitle.innerText = 'Prognoza Krótkoterminowa';
            }
            alertBanner.classList.remove('hidden');
        } else {
            alertBanner.classList.add('hidden'); alertBanner.classList.remove('flex');
        }

        let wSpeed = `${cur.wind_speed_10m} ${wx.current_units.wind_speed_10m}`;
        let wGust = `Porywy: ${cur.wind_gusts_10m} ${wx.current_units.wind_gusts_10m}`;
        document.getElementById('pog-wind-val').innerText = wSpeed;
        document.getElementById('pog-wind-gust').innerText = wGust;
        document.getElementById('pog-wind-arrow').style.transform = `rotate(${cur.wind_direction_10m}deg)`;

        document.getElementById('pog-hum').innerText = `${cur.relative_humidity_2m}%`;
        document.getElementById('pog-pres').innerText = `${Math.round(cur.surface_pressure)} hPa`;

        if (dly.sunrise && dly.sunrise.length > todayIdx) {
            document.getElementById('pog-sunrise').innerText = new Date(dly.sunrise[todayIdx]).toLocaleTimeString('pl-PL', {hour:'2-digit', minute:'2-digit'});
            document.getElementById('pog-sunset').innerText = new Date(dly.sunset[todayIdx]).toLocaleTimeString('pl-PL', {hour:'2-digit', minute:'2-digit'});
            let uv = dly.uv_index_max[todayIdx] || 0;
            document.getElementById('pog-uv-val').innerText = `UV ${uv}`;
            if(uv >= 8) document.getElementById('pog-uv-val').className = "text-sm font-bold text-red-500";
            else if(uv >= 5) document.getElementById('pog-uv-val').className = "text-sm font-bold text-orange-400";
            else document.getElementById('pog-uv-val').className = "text-sm font-bold text-green-400";
        }

        let safeTMin = dly.temperature_2m_min.filter(t => t !== null);
        let safeTMax = dly.temperature_2m_max.filter(t => t !== null);
        let globalMin = safeTMin.length > 0 ? Math.min(...safeTMin) : 0;
        let globalMax = safeTMax.length > 0 ? Math.max(...safeTMax) : 0;
        
        if (dly.time.length > todayIdx) {
            document.getElementById('pog-stat-max').innerText = dly.temperature_2m_max[todayIdx] !== null ? `${Math.round(dly.temperature_2m_max[todayIdx])}°` : '--°';
            // Usunięto odwołanie do nieistniejącego pog-stat-min – to był błąd blokujący renderowanie AQI
            // if (dly.temperature_2m_min[todayIdx] !== null) { ... }
        }

        // --- AQI (Bezpieczny Check) ---
        if (aqi && aqi.current && aqi.current.european_aqi) {
            let aqVal = aqi.current.european_aqi;
            let aqiData = pogodynkaApp.getAQIData(aqVal);
            document.getElementById('air-val').innerText = `${aqVal} AQI`;
            document.getElementById('air-icon').innerText = aqiData.icon;
            document.getElementById('air-desc').innerText = aqiData.desc;
            document.getElementById('air-desc').style.backgroundColor = aqiData.color;
            document.getElementById('air-main-card').style.borderTopColor = aqiData.color;
            document.getElementById('air-main-card').style.borderTopWidth = '3px';
        } else {
            document.getElementById('air-val').innerText = `-- AQI`;
            document.getElementById('air-desc').innerText = `Brak danych`;
            document.getElementById('air-desc').style.backgroundColor = 'transparent';
            document.getElementById('air-main-card').style.borderTopWidth = '1px';
            document.getElementById('air-main-card').style.borderTopColor = 'var(--border)';
        }

        // --- ZAKŁADKA GODZINOWA ---
        const hListFull = document.getElementById('pog-hourly-list-full');
        hListFull.innerHTML = '';
        if (nowIdx < 0) nowIdx = 0;

        for (let i = nowIdx; i < nowIdx + 48 && i < hrl.time.length; i++) {
            let tDate = new Date(hrl.time[i]);
            let hourStr = i === nowIdx ? 'Teraz' : tDate.getHours().toString().padStart(2,'0') + ':00';
            let dateStr = i === nowIdx ? '' : tDate.toLocaleDateString('pl-PL', {weekday: 'short'});
            let icObj = pogodynkaApp.getIcon(hrl.weather_code[i], (tDate.getHours() > 6 && tDate.getHours() < 20) ? 1 : 0);
            let temp = Math.round(hrl.temperature_2m[i]);
            let precip = hrl.precipitation[i] || 0;
            let dropHtml = precip > 0 ? `<div class="text-[9px] text-blue-400 font-bold mt-1">💧 ${precip.toFixed(1)}mm</div>` : `<div class="text-[9px] opacity-0 mt-1">0</div>`;

            hListFull.innerHTML += `
                <div class="flex flex-col items-center justify-between p-2 g-bg border g-border rounded-xl shadow-sm transition hover:bg-white/5">
                    <span class="text-[9px] g-text-muted font-bold capitalize">${dateStr}</span>
                    <span class="text-[11px] font-bold g-text">${hourStr}</span>
                    <span class="text-2xl my-1 drop-shadow">${icObj.icon}</span>
                    <span class="text-sm font-bold g-accent">${temp}°</span>
                    ${dropHtml}
                </div>
            `;
        }

        // --- ZAKŁADKI 14 DNI ORAZ HISTORIA ---
        const dListFull = document.getElementById('pog-daily-list-full');
        const hListHist = document.getElementById('pog-history-list');
        dListFull.innerHTML = ''; hListHist.innerHTML = '';
        
        let range = globalMax - globalMin;

        for (let i = 0; i < dly.time.length; i++) {
            if (dly.temperature_2m_max[i] === null) continue; 

            let tDate = new Date(dly.time[i]);
            let isHistory = i < todayIdx;
            let isToday = i === todayIdx;
            let dayName = isToday ? 'Dziś' : tDate.toLocaleDateString('pl-PL', {weekday: 'short', day: 'numeric', month: 'short'});
            
            let icObj = pogodynkaApp.getIcon(dly.weather_code[i], 1);
            let tMin = Math.round(dly.temperature_2m_min[i]);
            let tMax = Math.round(dly.temperature_2m_max[i]);
            let pSum = dly.precipitation_sum[i] || 0;

            let leftPerc = ((tMin - globalMin) / range) * 100;
            let widthPerc = ((tMax - tMin) / range) * 100;

            let rowHtml = `
                <div class="flex items-center gap-2 p-2 hover:bg-white/10 transition rounded border-b border-gray-500/10 last:border-0">
                    <span class="w-16 text-[10px] sm:text-xs font-bold g-text capitalize truncate">${dayName}</span>
                    <span class="text-xl sm:text-2xl w-8 text-center drop-shadow">${icObj.icon}</span>
                    <span class="w-8 text-center text-[9px] text-blue-400 font-bold">${pSum > 0 ? pSum.toFixed(1)+'mm' : ''}</span>
                    <span class="w-6 text-right text-[10px] sm:text-xs font-bold g-text-muted opacity-70">${tMin}°</span>
                    <div class="flex-grow h-1.5 sm:h-2 bg-black/30 rounded-full overflow-hidden relative mx-2">
                        <div class="absolute h-full rounded-full bg-gradient-to-r from-blue-400 via-yellow-400 to-red-500" 
                             style="left: ${leftPerc}%; width: ${Math.max(5, widthPerc)}%;"></div>
                    </div>
                    <span class="w-6 text-right text-[11px] sm:text-xs font-bold g-text">${tMax}°</span>
                </div>
            `;

            if (isHistory) hListHist.innerHTML += rowHtml;
            else dListFull.innerHTML += rowHtml;
        }
        
        if (hListHist.innerHTML === '') hListHist.innerHTML = '<div class="p-4 text-center g-text-muted text-xs">Brak danych historycznych.</div>';

        pogodynkaApp.renderFavoritesTab();
    },

    getIcon: (code, isDay) => {
        if (code === 0) return isDay ? {icon: '☀️', desc: 'Słonecznie'} : {icon: '🌙', desc: 'Bezchmurna noc'};
        if (code === 1 || code === 2) return isDay ? {icon: '⛅', desc: 'Częściowe zachm.'} : {icon: '☁️', desc: 'Pochmurna noc'};
        if (code === 3) return {icon: '☁️', desc: 'Pochmurnie'};
        if (code === 45 || code === 48) return {icon: '🌫️', desc: 'Mgła'};
        if (code >= 51 && code <= 55) return {icon: '🌧️', desc: 'Mżawka'};
        if (code === 56 || code === 57) return {icon: '🌨️', desc: 'Marznąca mżawka'};
        if (code >= 61 && code <= 65) return {icon: '🌧️', desc: 'Deszczowo'};
        if (code === 66 || code === 67) return {icon: '🌨️', desc: 'Marznący deszcz'};
        if (code >= 71 && code <= 77) return {icon: '❄️', desc: 'Śnieg'};
        if (code >= 80 && code <= 82) return {icon: '☔', desc: 'Ulewa'};
        if (code === 85 || code === 86) return {icon: '🌨️', desc: 'Śnieżyca'};
        if (code >= 95) return {icon: '⛈️', desc: 'Burza'};
        return {icon: '🌤️', desc: 'Zmiennie'};
    },

    getAQIData: (aqi) => {
        if (aqi <= 20) return { color: '#10b981', icon: '🍃', desc: 'Bardzo dobra' };
        if (aqi <= 40) return { color: '#84cc16', icon: '🌿', desc: 'Dobra' };
        if (aqi <= 60) return { color: '#eab308', icon: '😐', desc: 'Umiarkowana' };
        if (aqi <= 80) return { color: '#f97316', icon: '😷', desc: 'Zła' };
        if (aqi <= 100) return { color: '#ef4444', icon: '🏭', desc: 'Bardzo zła' };
        return { color: '#a855f7', icon: '☣️', desc: 'Ekstremalnie zła' };
    },

    refreshMapOverlay: (forcedTab) => {
        const container = document.getElementById('pog-radar-container');
        const title = document.getElementById('map-radar-title');
        if (!container) return;
        
        const isRadar = (forcedTab === 'radar');
        const overlayType = isRadar ? 'rain' : 'temp';
        
        if (title) title.innerText = isRadar ? "🌧️ Radar Opadów na żywo (Windy.com)" : "🗺️ Interaktywna Mapa Temperatur (Windy.com)";

        container.innerHTML = `
            <iframe class="w-full h-full border-none" 
                    src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°${pogodynkaApp.settings.unitT}&metricWind=${pogodynkaApp.settings.unitW}&zoom=6&overlay=${overlayType}&product=ecmwf&level=surface&lat=${pogodynkaApp.currentLat}&lon=${pogodynkaApp.currentLon}&marker=true" 
                    frameborder="0" allowfullscreen>
            </iframe>
        `;
    },

    // ==================================================================
    // WIDGET I DŹWIĘKI
    // ==================================================================
    renderWidget: () => {
        let w = document.getElementById('pogodynka-widget');
        if (!w) {
            w = document.createElement('div');
            w.id = 'pogodynka-widget';
            w.className = 'fixed top-14 right-4 z-[5] g-panel border g-border rounded-xl p-2 shadow-lg flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform backdrop-blur-md themed-app overflow-hidden group';
            w.onclick = () => { if(typeof winManager !== 'undefined') winManager.open('pogodynka'); };
            document.body.appendChild(w);
        }
        
        let cur = pogodynkaApp.lastData?.current;
        if(!cur) return;
        
        let iconObj = pogodynkaApp.getIcon(cur.weather_code, cur.is_day);
        
        w.innerHTML = `
            <div class="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div class="text-2xl drop-shadow-md relative z-10">${iconObj.icon}</div>
            <div class="flex flex-col relative z-10 pr-1">
                <span class="text-sm font-bold g-text leading-none">${Math.round(cur.temperature_2m)}°</span>
                <span class="text-[8px] font-bold g-text-muted uppercase tracking-widest truncate max-w-[70px] mt-0.5">${pogodynkaApp.currentCity.split(',')[0]}</span>
            </div>
        `;
    },

    toggleAmbient: () => {
        pogodynkaApp.settings.ambientSound = !pogodynkaApp.settings.ambientSound;
        pogodynkaApp.saveData();
        
        const btnSnd = document.getElementById('pog-btn-snd');
        if(btnSnd) {
            btnSnd.innerText = pogodynkaApp.settings.ambientSound ? '🔊' : '🔇';
            if(pogodynkaApp.settings.ambientSound) btnSnd.classList.add('text-blue-300');
            else btnSnd.classList.remove('text-blue-300');
        }

        pogodynkaApp.manageAmbientSound();
    },

    manageAmbientSound: () => {
        if (!pogodynkaApp.settings.ambientSound) {
            pogodynkaApp.stopAmbientSound();
            return;
        }

        const c = pogodynkaApp.weatherCode;
        let type = 'none';
        if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95) type = 'rain';
        else if (c >= 71 && c <= 77) type = 'wind'; 
        else if (c >= 1 && c <= 3) type = 'wind';   

        if (type === 'none') {
            pogodynkaApp.stopAmbientSound();
        } else {
            pogodynkaApp.startAmbientSound(type);
        }
    },

    startAmbientSound: (type) => {
        if (pogodynkaApp.ambientNode) return; 
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            pogodynkaApp.audioCtx = ctx;

            const bufferSize = ctx.sampleRate * 2; 
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noiseSource = ctx.createBufferSource();
            noiseSource.buffer = buffer;
            noiseSource.loop = true;

            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();

            if (type === 'rain') {
                filter.type = 'lowpass';
                filter.frequency.value = 1000; 
                gain.gain.value = 0.1; 
            } else if (type === 'wind') {
                filter.type = 'bandpass';
                filter.frequency.value = 400; 
                filter.Q.value = 0.8;
                gain.gain.value = 0.05;
                
                const lfo = ctx.createOscillator();
                lfo.type = 'sine';
                lfo.frequency.value = 0.2; 
                
                const lfoGain = ctx.createGain();
                lfoGain.gain.value = 300;
                
                lfo.connect(lfoGain);
                lfoGain.connect(filter.frequency);
                lfo.start();
            }

            noiseSource.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            
            noiseSource.start();
            pogodynkaApp.ambientNode = noiseSource;
            
        } catch(e) { console.warn("Web Audio API Audio Error", e); }
    },

    stopAmbientSound: () => {
        if (pogodynkaApp.ambientNode) {
            try { pogodynkaApp.ambientNode.stop(); } catch(e){}
            pogodynkaApp.ambientNode = null;
        }
        if (pogodynkaApp.audioCtx) {
            try { pogodynkaApp.audioCtx.close(); } catch(e){}
            pogodynkaApp.audioCtx = null;
        }
    },

    stop: () => {
        pogodynkaApp.stopAmbientSound();
    },

    // ==================================================================
    // ULUBIONE
    // ==================================================================
    renderFavoritesTab: () => {
        const listMain = document.getElementById('pog-fav-list-main');
        
        if (listMain) {
            listMain.innerHTML = '';
            if (pogodynkaApp.favorites.length === 0) {
                listMain.innerHTML = `<div class="text-[10px] g-text-muted italic px-1">Brak. Wyszukaj miasto i kliknij "Dodaj Obecne".</div>`;
            } else {
                pogodynkaApp.favorites.forEach(f => {
                    listMain.innerHTML += `
                        <div class="flex items-center gap-1 bg-black/20 border border-white/5 rounded pl-2 pr-1 py-1 shrink-0 group hover:bg-white/10 transition">
                            <span class="text-[10px] font-bold cursor-pointer truncate max-w-[80px]" onclick="pogodynkaApp.search('${typeof desktop !== 'undefined' ? desktop.escapeHTML(f) : f}')">${typeof desktop !== 'undefined' ? desktop.escapeHTML(f) : f}</span>
                            <button onclick="pogodynkaApp.removeFavorite('${typeof desktop !== 'undefined' ? desktop.escapeHTML(f) : f}')" class="text-red-500 opacity-50 group-hover:opacity-100 hover:text-red-400 font-bold transition text-xs w-4 h-4 flex items-center justify-center">✖</button>
                        </div>
                    `;
                });
            }
        }
    },

    addFavorite: () => {
        if (!pogodynkaApp.favorites.includes(pogodynkaApp.currentCity)) {
            pogodynkaApp.favorites.push(pogodynkaApp.currentCity);
            pogodynkaApp.saveData();
            pogodynkaApp.renderFavoritesTab();
            if(typeof apps !== 'undefined') apps.showToast('Sukces', 'Dodano miasto do ulubionych!', 'success');
        } else {
            if(typeof apps !== 'undefined') apps.showToast('Info', 'To miasto już jest w ulubionych.', 'info');
        }
    },

    removeFavorite: (city) => {
        pogodynkaApp.favorites = pogodynkaApp.favorites.filter(f => f !== city);
        pogodynkaApp.saveData();
        pogodynkaApp.renderFavoritesTab();
    }
};

setTimeout(pogodynkaApp.init, 500);