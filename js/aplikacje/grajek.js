// ======================================================================
// PLIK: js/aplikacje/grajek.js (Grajek PRO v2.2 – kompletny)
// ======================================================================

const DEFAULT_COVER = 'images/plyta.webp';
const FALLBACK_COVER = 'images/kosmos.webp';
const EQ_FREQS = [31, 45, 63, 90, 125, 180, 250, 355, 500, 710, 1000, 1400, 2000, 2800, 4000, 5600, 8000, 16000];

const grajekApp = {
    grajekAudio: new Audio(),
    queue: [], playlists: [], favorites: [], history: [],
    currentIndex: -1, currentVizType: 0, playMode: 0,
    isPlaying: false, sleepTimerId: null, toastTimeout: null,
    currentTheme: 'theme-carbon', isMiniPlayerActive: false,
    activePlaylistId: null, draggedIndex: null, playlistDragIndex: null,
    _muted: false, _previousVolume: 100, _initialized: false,
    groupBy: 'none',
    isPlayingPlaylist: false,
    activePlaylistPlayId: null,

    // Web Audio API
    audioCtx: null, analyser: null, sourceNode: null, gainNode: null, volumeNode: null,
    eqNodes: [], preampNode: null, pannerNode: null, bassNode: null, trebleNode: null,
    compressorNode: null, limiterNode: null, reverbNode: null, reverbGain: null,
    vuSplitter: null, analyserL: null, analyserR: null, vizLoop: null,

    eqSettings: {
        preamp: 0, balance: 0, width: 1, bass: 0, treble: 0,
        compThresh: -24, compRatio: 4, compAttack: 0.003, compRelease: 0.25,
        reverb: 'off', reverbMix: 0, echoMix: 0, surround: 'stereo',
        bands: new Array(18).fill(0)
    },

    // 16 motywów
    themes: {
        'theme-carbon':    { primary: '#ef4444', secondary: '#dc2626', bg: '#121212', panel: 'rgba(27,27,27,0.85)', text: '#f3f4f6', muted: '#9ca3af', border: '#333333', shadow: '0 10px 30px rgba(0,0,0,.8)', texture: 'repeating-linear-gradient(45deg, #1a1a1a 25%, transparent 25%, transparent 75%, #1a1a1a 75%, #1a1a1a), repeating-linear-gradient(45deg, #1a1a1a 25%, #121212 25%, #121212 75%, #1a1a1a 75%, #1a1a1a)', bgSize: '20px 20px' },
        'theme-steel':      { primary: '#2563eb', secondary: '#1d4ed8', bg: '#e5e7eb', panel: 'rgba(209,213,219,0.85)', text: '#1f2937', muted: '#4b5563', border: '#9ca3af', shadow: '0 10px 20px rgba(0,0,0,.2)' },
        'theme-midnight':   { primary: '#38bdf8', secondary: '#0ea5e9', bg: '#0f172a', panel: 'rgba(30,41,59,0.85)', text: '#f8fafc', muted: '#94a3b8', border: '#334155', shadow: '0 10px 30px rgba(0,0,0,.5)' },
        'theme-glass':      { primary: '#ffffff', secondary: '#e2e8f0', bg: 'transparent', panel: 'rgba(255,255,255,0.1)', text: '#ffffff', muted: '#d1d5db', border: 'rgba(255,255,255,0.2)', shadow: '0 8px 32px 0 rgba(31,38,135,0.37)' },
        'theme-obsidian':   { primary: '#f97316', secondary: '#ea580c', bg: '#0a0a0a', panel: 'rgba(17,17,17,0.9)', text: '#e5e5e5', muted: '#a3a3a3', border: '#262626', shadow: '0 4px 20px rgba(0,0,0,0.8)' },
        'theme-lava':       { primary: '#ef4444', secondary: '#b91c1c', bg: '#0f0303', panel: 'rgba(20,5,5,0.9)', text: '#fee2e2', muted: '#fca5a5', border: '#7f1d1d', shadow: '0 0 20px rgba(239,68,68,0.4)' },
        'theme-matrix':     { primary: '#22c55e', secondary: '#16a34a', bg: '#000000', panel: 'rgba(0,20,0,0.85)', text: '#4ade80', muted: '#86efac', border: '#166534', shadow: '0 0 15px rgba(34,197,94,0.3)', texture: 'url("data:image/svg+xml,%3Csvg width="60" height="60" xmlns="http://www.w3.org/2000/svg"%3E%3Ctext y="30" x="0" fill="%2322c55e" font-family="monospace" font-size="12" opacity="0.1"%3E01010100%3C/text%3E%3C/svg%3E")' },
        'theme-sapphire':   { primary: '#3b82f6', secondary: '#1d4ed8', bg: '#0c1929', panel: 'rgba(15,30,60,0.85)', text: '#bfdbfe', muted: '#93c5fd', border: '#1e3a8a', shadow: '0 10px 30px rgba(59,130,246,0.3)' },
        'theme-amethyst':   { primary: '#d946ef', secondary: '#c026d3', bg: '#1e0b2e', panel: 'rgba(40,15,60,0.85)', text: '#f3e8ff', muted: '#d8b4fe', border: '#6b21a8', shadow: '0 0 20px rgba(217,70,239,0.4)' },
        'theme-amber':      { primary: '#FFBF00', secondary: '#E58A00', bg: '#1a0b00', panel: 'rgba(40,15,0,0.85)', text: '#ffffff', muted: '#d1d5db', border: '#8A5A00', shadow: '0 10px 30px rgba(0,0,0,.5)' },
        'theme-emerald':    { primary: '#10b981', secondary: '#059669', bg: '#022c22', panel: 'rgba(2,44,34,0.9)', text: '#d1fae5', muted: '#a7f3d0', border: '#064e3b', shadow: '0 0 15px rgba(16,185,129,0.4)' },
        'theme-ocean':      { primary: '#06b6d4', secondary: '#0891b2', bg: '#0c2d3b', panel: 'rgba(12,45,59,0.85)', text: '#cffafe', muted: '#a5f3fc', border: '#155e75', shadow: '0 10px 25px rgba(6,182,212,0.3)' },
        'theme-gold':       { primary: '#fbbf24', secondary: '#b45309', bg: '#0f0f0f', panel: 'rgba(20,20,20,0.9)', text: '#fef3c7', muted: '#fde68a', border: '#78350f', shadow: '0 0 25px rgba(251,191,36,0.4)' },
        'theme-titanium':   { primary: '#6b7280', secondary: '#4b5563', bg: '#f3f4f6', panel: 'rgba(255,255,255,0.7)', text: '#111827', muted: '#4b5563', border: '#d1d5db', shadow: '0 8px 20px rgba(0,0,0,0.1)' },
        'theme-night-neon': { primary: '#00ffff', secondary: '#ff00ff', bg: '#000000', panel: 'rgba(0,0,0,0.9)', text: '#00ffff', muted: '#ff00ff', border: '#ff00ff', shadow: '0 0 20px #00ffff' },
        'theme-cyberpunk':  { primary: '#f0f', secondary: '#0ff', bg: '#09090b', panel: 'rgba(10,10,30,0.85)', text: '#0ff', muted: '#f472b6', border: '#f0f', shadow: '0 0 15px rgba(255,0,255,0.3)' }
    },

    parseSafe: (data, defaultVal) => {
        if (!data || data === 'null' || data === 'undefined') return defaultVal;
        try { return JSON.parse(data) || defaultVal; } catch(e) { return defaultVal; }
    },

    escapeHTML: (str) => {
        if (!str) return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    },

    grajekFmt: (seconds) => {
        if (isNaN(seconds) || seconds < 0) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    },

    showToast: (title, msg, type = 'info') => {
        if (typeof apps !== 'undefined' && apps.showToast) apps.showToast(title, msg, type);
    },

    // ==================================================================
    // INICJALIZACJA
    // ==================================================================
    init: () => {
        if (grajekApp._initialized) return;
        grajekApp._initialized = true;

        if (!window.jsmediatags) {
            const script = document.createElement('script');
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js";
            document.head.appendChild(script);
        }

        // grajekApp.queue = grajekApp.parseSafe(localStorage.getItem('bigos_grajek_queue'), []).filter(t => !t.isLocal);
        grajekApp.queue = grajekApp.parseSafe(localStorage.getItem('bigos_grajek_queue'), []);
        grajekApp.queue.forEach(t => { 
            if(!t.cover || t.cover.includes('kosmos.webp') || t.cover.startsWith('data:image/svg')) t.cover = DEFAULT_COVER;
        });
        grajekApp.favorites = grajekApp.parseSafe(localStorage.getItem('bigos_grajek_favs'), []);
        grajekApp.playlists = grajekApp.parseSafe(localStorage.getItem('bigos_grajek_playlists'), []);
        const savedTheme = localStorage.getItem('bigos_grajek_theme');
        if(savedTheme && grajekApp.themes[savedTheme]) grajekApp.currentTheme = savedTheme;
        const savedEQ = localStorage.getItem('bigos_grajek_eq');
        if(savedEQ) grajekApp.eqSettings = {...grajekApp.eqSettings, ...grajekApp.parseSafe(savedEQ, {})};

        grajekApp.upgradeUI();
        window.addEventListener('keydown', grajekApp.handleShortcuts);

        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => grajekApp.togglePlay());
            navigator.mediaSession.setActionHandler('pause', () => grajekApp.togglePlay());
            navigator.mediaSession.setActionHandler('previoustrack', () => grajekApp.prev());
            navigator.mediaSession.setActionHandler('nexttrack', () => grajekApp.next());
        }

        grajekApp.renderLibrary();
        grajekApp.renderPlaylists();
        grajekApp.updateGenreFilter();
        grajekApp.grajekAudio.addEventListener('timeupdate', grajekApp.updateTimeUI);
        grajekApp.grajekAudio.addEventListener('ended', () => grajekApp.next());
    },

    // ==================================================================
    // ZAMYKANIE APLIKACJI
    // ==================================================================
    closeApp: () => {
        if (grajekApp.isPlaying) {
            grajekApp.grajekAudio.pause();
            grajekApp.grajekAudio.currentTime = 0;  
            grajekApp.grajekAudio.src = '';
            grajekApp.isPlaying = false;
            const playBtn = document.getElementById('grajek-btn-play');
            if (playBtn) playBtn.innerText = '▶';
        }

            //  USUŃ STARY NASŁUCH timeupdate
            grajekApp.grajekAudio.removeEventListener('timeupdate', grajekApp.updateTimeUI);
            grajekApp._initialized = false;  
        const cover = document.getElementById('grajek-cover');
        if (cover) cover.style.animationPlayState = 'paused';

        if (grajekApp.vizLoop) {
            cancelAnimationFrame(grajekApp.vizLoop);
            grajekApp.vizLoop = null;
        }

        if (grajekApp.audioCtx && grajekApp.audioCtx.state !== 'closed') {
            grajekApp.audioCtx.close().catch(() => {});
            //grajekApp.audioCtx = null;
        }



        // const mini = document.getElementById('grajek-mini-player');
        // if (mini) mini.remove();

        // window.removeEventListener('keydown', grajekApp.handleShortcuts);

        // grajekApp.sourceNode = null;
        // grajekApp.eqNodes = [];
        // grajekApp.gainNode = null;
        // grajekApp.volumeNode = null;
        // grajekApp.analyser = null;

        // *** NOWE: całkowicie zastąp stary element Audio nowym ***
        grajekApp.grajekAudio = new Audio();
        // Reset referencji do źródła i kontekstu
        grajekApp.sourceNode = null;
        grajekApp.audioCtx = null;
        grajekApp.analyser = null;
        grajekApp.gainNode = null;
        grajekApp.volumeNode = null;
        // ... (reszta czyszczenia)

        const mini = document.getElementById('grajek-mini-player');
        if (mini) mini.remove();

        window.removeEventListener('keydown', grajekApp.handleShortcuts);
        grajekApp.saveData()

        // ★★★ RESET FLAGI – pozwoli ponownie wykonać init() przy następnym otwarciu ★★★
        grajekApp._initialized = false;

        // Jeśli istnieje winManager – wywołaj jego metodę zamykania
        if (typeof winManager !== 'undefined' && winManager.close) {
            winManager.close('grajek');
        }
    },

    // ==================================================================
    // MOTYWY
    // ==================================================================
    setTheme: (themeName) => {
        if (!grajekApp.themes[themeName]) return;
        grajekApp.currentTheme = themeName;
        localStorage.setItem('bigos_grajek_theme', themeName);
        grajekApp.applyTheme();
    },

    applyTheme: () => {
        const root = document.documentElement;
        const t = grajekApp.themes[grajekApp.currentTheme];
        Object.entries(t).forEach(([key, val]) => root.style.setProperty(`--grajek-${key}`, val));

        const proUI = document.getElementById('grajek-pro-ui');
        if (proUI) {
            proUI.className = `flex-grow flex flex-col md:flex-row overflow-hidden relative select-none w-full h-full ${grajekApp.currentTheme}`;
            proUI.style.background = t.texture ? `${t.bg} ${t.texture}` : t.bg;
            proUI.style.backgroundSize = t.bgSize || 'auto';
        }
        const miniUI = document.getElementById('grajek-mini-player');
        if (miniUI) {
            miniUI.className = `hidden fixed bottom-10 right-10 z-[10000] g-panel p-3 rounded-2xl flex items-center gap-4 shadow-2xl cursor-move transition-transform hover:scale-105 ${grajekApp.currentTheme}`;
            if (grajekApp.isMiniPlayerActive) miniUI.classList.remove('hidden');
        }
        document.querySelectorAll('.grajek-modal-overlay').forEach(modal => {
            modal.className = `grajek-modal-overlay fixed inset-0 z-[10001] bg-black/70 backdrop-blur-sm flex items-center justify-center ${grajekApp.currentTheme}`;
        });
    },

    // ==================================================================
    // BUDOWA INTERFEJSU
    // ==================================================================
    upgradeUI: () => {
        const appWindow = document.getElementById('app-grajek');
        if (!appWindow) { grajekApp._initialized = false; setTimeout(grajekApp.init, 500); return; }
        appWindow.style.width = '1050px';
        appWindow.style.height = '650px';

        const titleBar = appWindow.querySelector('.title-bar');
        Array.from(appWindow.children).forEach(child => { if (child !== titleBar) child.remove(); });

        if(!document.getElementById('grajek-theme-styles')) {
            const style = document.createElement('style');
            style.id = 'grajek-theme-styles';
            style.innerHTML = `
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--grajek-border); border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--grajek-primary); }
                .custom-scrollbar { scrollbar-width: thin; scrollbar-color: var(--grajek-border) transparent; }

                .g-bg { background: var(--grajek-bg); }
                .g-panel { background: var(--grajek-panel); box-shadow: var(--grajek-shadow); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid var(--grajek-border); }
                .g-text { color: var(--grajek-text); }
                .g-text-muted { color: var(--grajek-muted); }
                .g-accent { color: var(--grajek-primary); }
                .g-border { border-color: var(--grajek-border); }
                .g-btn { border: 1px solid var(--grajek-border); color: var(--grajek-text); background: transparent; transition: all 0.2s; }
                .g-btn:hover { background: var(--grajek-primary); color: #000; border-color: var(--grajek-primary); text-shadow: none; box-shadow: 0 0 10px var(--grajek-primary); }
                .g-range { background: var(--grajek-border); accent-color: var(--grajek-primary); }
                .g-tab { color: var(--grajek-muted); border-bottom: 2px solid transparent; transition: all 0.2s; }
                .g-tab.active { border-bottom-color: var(--grajek-primary); color: var(--grajek-primary); }
                .g-item { border-bottom: 1px solid var(--grajek-border); transition: background 0.2s; }
                .g-item:hover { background: rgba(255,255,255,0.05); }
                .g-item.active { background: rgba(255,255,255,0.1); border-left: 4px solid var(--grajek-primary); }
                .g-icon-btn { color: var(--grajek-muted); transition: color 0.2s, transform 0.2s; }
                .g-icon-btn:hover { color: var(--grajek-text); transform: scale(1.1); }
                .g-play-btn { color: var(--grajek-primary); transition: transform 0.2s, text-shadow 0.2s; text-shadow: 0 0 15px var(--grajek-primary);
                min-width: 48px;   
                text-align: center;    
                display: inline-block;   }
                .g-play-btn:hover { transform: scale(1.1); text-shadow: 0 0 25px var(--grajek-primary); }
                .eq-slider { writing-mode: bt-lr; -webkit-appearance: slider-vertical; width: 12px; height: 120px; outline: none; background: var(--grajek-border); accent-color: var(--grajek-primary); border-radius: 6px; cursor: ns-resize; }
                .eq-knob { width: 100%; height: 4px; border-radius: 2px; outline: none; background: var(--grajek-border); accent-color: var(--grajek-primary); cursor: ew-resize; }

                .theme-glass select, .theme-glass .g-btn {
                    background: rgba(0,0,0,0.5);
                    color: #fff;
                }
            `;
            document.head.appendChild(style);
        }

        const proUI = document.createElement('div');
        proUI.id = 'grajek-pro-ui';
        proUI.className = `flex-grow flex flex-col md:flex-row overflow-hidden relative select-none w-full h-full ${grajekApp.currentTheme}`;
        grajekApp.applyTheme();

        proUI.innerHTML = `
            <div id="grajek-bg-blur" class="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl transition-all duration-1000 pointer-events-none" style="background-image: url('${FALLBACK_COVER}'); transform: scale(1.1);"></div>

            <!-- LEWY PANEL: Odtwarzacz -->
            <div class="w-full md:w-[380px] p-6 flex flex-col items-center justify-between relative z-10 border-r g-border g-panel">
                <div class="w-full flex justify-between items-center mb-2">
                    <select id="grajek-theme-select" class="g-btn text-[10px] px-2 py-1 rounded outline-none cursor-pointer" onchange="grajekApp.setTheme(this.value)">
                        ${Object.keys(grajekApp.themes).map(key => `<option value="${key}" ${grajekApp.currentTheme===key?'selected':''}>${key.replace('theme-','').charAt(0).toUpperCase() + key.slice(7)}</option>`).join('')}
                    </select>
                    <span id="grajek-mode-badge" class="text-xs font-bold uppercase tracking-widest g-accent drop-shadow-md">SEQUENTIAL</span>
                    <div class="flex gap-4">
                        <button onclick="grajekApp.toggleMiniPlayer()" title="Mini Player" class="g-icon-btn text-lg">🪟</button>
                        <button onclick="grajekApp.setSleepTimer()" title="Sleep Timer" class="g-icon-btn text-lg">⏰</button>
                        <button id="grajek-btn-fav" onclick="grajekApp.toggleFavorite()" title="Ulubione" class="g-icon-btn text-xl">♡</button>
                    </div>
                </div>

                <div class="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full border-4 shadow-2xl overflow-hidden flex-shrink-0 group g-border mt-4">
                    <img id="grajek-cover" src="${DEFAULT_COVER}" onerror="this.onerror=null; this.src='${FALLBACK_COVER}';" class="w-full h-full object-cover transition-transform duration-500 bg-black" style="animation: spin 6s linear infinite; animation-play-state: paused;">
                    <div class="absolute inset-0 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] pointer-events-none"></div>
                    <div class="absolute inset-0 m-auto w-12 h-12 g-bg rounded-full border-2 g-border shadow-inner"></div>
                    <div id="grajek-yt-container" class="hidden absolute inset-0 z-20 bg-black"></div>
                </div>

                <div class="w-full text-center mt-6 mb-2">
                    <h2 id="grajek-title" class="text-xl sm:text-2xl font-bold truncate g-text drop-shadow-md">Brak utworu</h2>
                    <p id="grajek-artist" class="text-sm g-text-muted truncate mt-1">Wybierz coś z kolejki</p>
                </div>

                <div class="w-full flex items-center gap-3 text-xs font-mono g-text-muted mt-2">
                    <span id="grajek-time">00:00</span>
                    <input type="range" id="grajek-progress" value="0" min="0" max="100" step="0.1" class="flex-grow h-2 rounded-lg appearance-none cursor-pointer g-range shadow-inner" oninput="grajekApp.seek(this.value)">
                    <span id="grajek-duration">00:00</span>
                </div>

                <div class="w-full flex items-center mt-4 px-2">
                    <div class="flex-1 flex justify-start">
                        <button onclick="grajekApp.toggleMode()" id="grajek-btn-mode" class="g-icon-btn text-xl" title="Tryb odtwarzania">🔁</button>
                    </div>
                    <div class="flex items-center justify-center gap-4 sm:gap-6 shrink-0 px-2">
                        <button onclick="grajekApp.prev()" class="text-3xl g-icon-btn drop-shadow">⏮</button>
                        <button onclick="grajekApp.togglePlay()" id="grajek-btn-play" class="text-5xl g-play-btn drop-shadow mx-1">▶</button>
                        <button onclick="grajekApp.next()" class="text-3xl g-icon-btn drop-shadow">⏭</button>
                    </div>
                    <div class="flex-1 flex justify-end items-center gap-1 sm:gap-2">
                        <button onclick="grajekApp.toggleMute()" id="grajek-btn-mute" class="g-icon-btn text-lg" title="Wycisz">🔊</button>
                        <input type="range" id="grajek-volume" value="100" min="0" max="100" class="w-16 sm:w-20 h-2 rounded-lg appearance-none cursor-pointer g-range shadow-inner" oninput="grajekApp.setVolume(this.value)" title="Głośność">
                        <span id="grajek-vol-label" class="text-[10px] w-8 text-right font-mono g-text-muted">100%</span>
                    </div>
                </div>
            </div>

            <!-- PRAWY PANEL -->
            <div class="w-full md:flex-1 flex flex-col relative z-10 g-panel border-l-0 overflow-hidden">
                <div class="flex text-[10px] sm:text-xs font-bold border-b g-border overflow-x-auto custom-scrollbar whitespace-nowrap shrink-0">
                    <button onclick="grajekApp.switchTab('library')" id="tab-btn-library" class="g-tab active flex-1 px-2 py-2 sm:py-3 uppercase tracking-wider truncate">Biblioteka</button>
                    <button onclick="grajekApp.switchTab('playlists')" id="tab-btn-playlists" class="g-tab flex-1 px-2 py-2 sm:py-3 uppercase tracking-wider truncate">Playlisty</button>
                    <button onclick="grajekApp.switchTab('eq')" id="tab-btn-eq" class="g-tab flex-1 px-2 py-2 sm:py-3 uppercase tracking-wider truncate">Korektor PRO</button>
                    <button onclick="grajekApp.switchTab('viz')" id="tab-btn-viz" class="g-tab flex-1 px-2 py-2 sm:py-3 uppercase tracking-wider truncate hidden sm:block">Wizualizator</button>
                    <button onclick="grajekApp.switchTab('info')" id="tab-btn-info" class="g-tab flex-1 px-2 py-2 sm:py-3 uppercase tracking-wider truncate">Info</button>
                    <button onclick="grajekApp.switchTab('lyrics')" id="tab-btn-lyrics" class="g-tab flex-1 px-2 py-2 sm:py-3 uppercase tracking-wider truncate">Tekst</button>
                </div>

                <!-- BIBLIOTEKA -->
                <div id="grajek-tab-library" class="tab-content flex-1 overflow-hidden flex flex-col">
                    <div class="flex flex-col gap-2 p-2 border-b g-border bg-black/10 shrink-0">
                        <div class="flex gap-2 w-full">
                            <input type="text" id="grajek-search" placeholder="Szukaj..." class="flex-1 g-bg g-text text-[10px] sm:text-xs px-3 py-2 rounded-full border g-border outline-none transition" oninput="grajekApp.renderLibrary()">
                            <select id="grajek-genre-filter" class="g-btn text-[10px] px-2 py-1 rounded-full" onchange="grajekApp.renderLibrary()">
                                <option value="all">Wszystkie gatunki</option>
                            </select>
                            <button class="g-btn text-[10px] sm:text-xs px-4 py-2 rounded-full font-bold shadow-md whitespace-nowrap" onclick="document.getElementById('grajek-file-input').click()">+ Dodaj pliki</button>
                        </div>
                        <div class="flex justify-between items-center w-full">
                            <div class="flex gap-1">
                                <button class="g-btn text-[9px] px-2 py-1 rounded" onclick="grajekApp.groupBy = 'none'; grajekApp.renderLibrary();">Lista</button>
                                <button class="g-btn text-[9px] px-2 py-1 rounded" onclick="grajekApp.groupBy = 'album'; grajekApp.renderLibrary();">Albumy</button>
                                <button class="g-btn text-[9px] px-2 py-1 rounded" onclick="grajekApp.groupBy = 'artist'; grajekApp.renderLibrary();">Wykonawcy</button>
                                <button class="g-btn text-[9px] px-2 py-1 rounded" onclick="grajekApp.groupBy = 'genre'; grajekApp.renderLibrary();">Gatunki</button>
                            </div>
                            <select id="grajek-sort" onchange="grajekApp.applySort(this.value)" class="g-bg g-text text-[10px] px-2 py-1 rounded-full border g-border outline-none cursor-pointer">
                                <option value="date_desc">Data dodania</option>
                                <option value="name_asc">Tytuł</option>
                                <option value="artist_asc">Artysta</option>
                                <option value="album_asc">Album</option>
                                <option value="duration_desc">Długość</option>
                                <option value="plays_desc">Odtworzenia</option>
                            </select>
                        </div>
                        <input type="file" id="grajek-file-input" multiple accept="audio/*" class="hidden" onchange="grajekApp.loadFiles(event)">
                    </div>
                    <div id="grajek-library-list" class="flex-1 overflow-y-auto custom-scrollbar p-2"
                         ondragover="event.preventDefault();" ondrop="grajekApp.handleLibraryDrop(event);">
                    </div>
                </div>

                <!-- PLAYLISTY -->
                <div id="grajek-tab-playlists" class="tab-content flex-1 overflow-hidden flex hidden">
                    <div class="flex gap-2 p-3 border-b g-border bg-black/10 justify-between items-center shrink-0">
                        <h3 class="font-bold text-xs g-text uppercase tracking-wider">Twoje Playlisty</h3>
                        <button class="g-btn text-[10px] sm:text-xs px-3 py-1.5 rounded-full font-bold shadow-md" onclick="grajekApp.createPlaylist()">+ Nowa</button>
                    </div>
                    <div class="flex flex-1 overflow-hidden">
                        <div id="grajek-playlists-list" class="w-1/3 border-r g-border overflow-y-auto custom-scrollbar p-2"></div>
                        <div id="grajek-playlist-tracks" class="flex-1 overflow-y-auto custom-scrollbar p-2">
                            <div class="text-center g-text-muted text-xs py-8">Wybierz playlistę z lewej</div>
                        </div>
                    </div>
                </div>

                <!-- EQ -->
                <div id="grajek-tab-eq" class="tab-content flex-1 hidden flex-col overflow-y-auto custom-scrollbar p-4 bg-black/20">
                    <div class="w-full flex gap-3 h-24 mb-4 shrink-0">
                        <canvas id="grajek-eq-viz" class="flex-1 bg-black rounded-lg border g-border shadow-inner"></canvas>
                        <div class="w-16 flex flex-col bg-black rounded-lg border g-border p-1 shadow-inner relative">
                            <div id="vu-clip" class="text-center rounded-sm bg-gray-900 text-gray-700 text-[9px] font-bold mb-1 transition-colors">CLIP</div>
                            <div class="flex-1 flex gap-1 items-end justify-center">
                                <div class="w-3 bg-gray-900 rounded-sm flex flex-col justify-end overflow-hidden border border-gray-800"><div id="vu-l" class="w-full bg-green-500 transition-all duration-75" style="height: 0%"></div></div>
                                <div class="w-3 bg-gray-900 rounded-sm flex flex-col justify-end overflow-hidden border border-gray-800"><div id="vu-r" class="w-full bg-green-500 transition-all duration-75" style="height: 0%"></div></div>
                            </div>
                            <div class="flex justify-between mt-1 text-[8px] g-text-muted px-1 font-mono"><span>L</span><span>R</span></div>
                        </div>
                    </div>
                    <div class="flex justify-between items-center mb-3 shrink-0">
                        <select id="eq-preset-select" class="g-bg g-text text-[10px] px-2 py-1.5 rounded border g-border outline-none cursor-pointer flex-1 mr-2" onchange="grajekApp.applyEQPreset(this.value)">
                            <option value="" disabled selected>-- Wybierz Preset --</option>
                            <option value="flat">Flat</option><option value="bass_boost">Bass Boost</option>
                            <option value="super_bass">Super Bass</option><option value="rock">Rock</option>
                            <option value="metal">Metal</option><option value="pop">Pop</option>
                            <option value="dance">Dance</option><option value="edm">EDM</option>
                            <option value="hiphop">Hip-Hop</option><option value="jazz">Jazz</option>
                            <option value="classical">Classical</option><option value="acoustic">Acoustic</option>
                            <option value="vocal">Vocal</option><option value="movie">Movie</option>
                            <option value="podcast">Podcast</option><option value="gaming">Gaming</option>
                            <option value="night">Night Mode</option>
                            <option value="auto_eq">AutoEQ (Analiza Gatunku)</option>
                        </select>
                        <div class="flex gap-1 shrink-0">
                            <button class="g-btn text-[9px] px-2 py-1 rounded" onclick="grajekApp.saveCustomPreset()">Zapisz</button>
                            <button class="g-btn text-[9px] px-2 py-1 rounded" onclick="grajekApp.exportEQ()">Eksport</button>
                            <button class="g-btn text-[9px] px-2 py-1 rounded" onclick="document.getElementById('eq-import-file').click()">Import</button>
                            <input type="file" id="eq-import-file" accept=".json" class="hidden" onchange="grajekApp.importEQ(event)">
                            <button class="g-btn text-[9px] px-2 py-1 rounded border-red-500 text-red-500 hover:bg-red-500 hover:text-white" onclick="grajekApp.applyEQPreset('flat')">Reset</button>
                        </div>
                    </div>
                    <div class="g-bg border g-border rounded-xl p-3 mb-4 shrink-0 overflow-x-auto custom-scrollbar">
                        <div class="flex justify-between items-end gap-1 min-w-[500px]" id="grajek-eq-sliders-18"></div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 shrink-0">
                        <div class="flex flex-col gap-3 p-3 g-bg border g-border rounded-xl">
                            <span class="text-[10px] g-accent font-bold uppercase tracking-widest text-center border-b g-border pb-1">Preamp & Routing</span>
                            <div class="flex items-center gap-2"><span class="text-[9px] w-12 g-text-muted">Preamp</span><input type="range" id="eq-preamp" min="-12" max="12" step="0.5" value="${grajekApp.eqSettings.preamp}" class="eq-knob flex-1" oninput="grajekApp.updateDSP('preamp', this.value)"><span class="text-[9px] w-8 text-right font-mono" id="lbl-preamp">${grajekApp.eqSettings.preamp}dB</span></div>
                            <div class="flex items-center gap-2"><span class="text-[9px] w-12 g-text-muted">Balance</span><span class="text-[8px] g-text-muted">L</span><input type="range" id="eq-balance" min="-1" max="1" step="0.05" value="${grajekApp.eqSettings.balance}" class="eq-knob flex-1" oninput="grajekApp.updateDSP('balance', this.value)"><span class="text-[8px] g-text-muted">R</span></div>
                            <div class="flex items-center gap-2"><span class="text-[9px] w-12 g-text-muted">Width</span><span class="text-[8px] g-text-muted">Mono</span><input type="range" id="eq-width" min="0" max="2" step="0.05" value="${grajekApp.eqSettings.width}" class="eq-knob flex-1" oninput="grajekApp.updateDSP('width', this.value)"><span class="text-[8px] g-text-muted">Wide</span></div>
                            <div class="flex items-center gap-2 mt-1"><span class="text-[9px] w-12 g-text-muted">Surround</span><select id="eq-surround" class="g-bg g-text text-[9px] px-1 py-1 rounded border g-border outline-none flex-1" onchange="grajekApp.updateDSP('surround', this.value)"><option value="stereo" ${grajekApp.eqSettings.surround==='stereo'?'selected':''}>Stereo</option><option value="virtual" ${grajekApp.eqSettings.surround==='virtual'?'selected':''}>Virtual Surround</option><option value="cinema" ${grajekApp.eqSettings.surround==='cinema'?'selected':''}>Cinema</option><option value="concert" ${grajekApp.eqSettings.surround==='concert'?'selected':''}>Concert Hall</option></select></div>
                        </div>
                        <div class="flex flex-col gap-3 p-3 g-bg border g-border rounded-xl">
                            <span class="text-[10px] g-accent font-bold uppercase tracking-widest text-center border-b g-border pb-1">Dynamics & Effects</span>
                            <div class="flex items-center gap-2"><span class="text-[9px] w-12 g-text-muted">Bass</span><input type="range" id="eq-bass" min="0" max="100" step="1" value="${grajekApp.eqSettings.bass}" class="eq-knob flex-1" oninput="grajekApp.updateDSP('bass', this.value)"><span class="text-[9px] w-8 text-right font-mono" id="lbl-bass">${grajekApp.eqSettings.bass}%</span></div>
                            <div class="flex items-center gap-2"><span class="text-[9px] w-12 g-text-muted">Treble</span><input type="range" id="eq-treble" min="-12" max="12" step="0.5" value="${grajekApp.eqSettings.treble}" class="eq-knob flex-1" oninput="grajekApp.updateDSP('treble', this.value)"><span class="text-[9px] w-8 text-right font-mono" id="lbl-treble">${grajekApp.eqSettings.treble}dB</span></div>
                            <div class="flex items-center gap-2"><span class="text-[9px] w-12 g-text-muted" title="Kompresor">Compress</span><span class="text-[8px] g-text-muted">Off</span><input type="range" id="eq-comp" min="-1" max="-50" step="-1" value="${grajekApp.eqSettings.compThresh}" class="eq-knob flex-1" oninput="grajekApp.updateDSP('compressor', this.value)"><span class="text-[8px] g-text-muted">Max</span></div>
                            <div class="flex items-center gap-2 mt-1"><span class="text-[9px] w-12 g-text-muted">Reverb</span><select id="eq-reverb-type" class="g-bg g-text text-[9px] px-1 py-1 rounded border g-border outline-none w-16" onchange="grajekApp.updateDSP('reverb', this.value)"><option value="off" ${grajekApp.eqSettings.reverb==='off'?'selected':''}>Off</option><option value="room" ${grajekApp.eqSettings.reverb==='room'?'selected':''}>Room</option><option value="studio" ${grajekApp.eqSettings.reverb==='studio'?'selected':''}>Studio</option><option value="hall" ${grajekApp.eqSettings.reverb==='hall'?'selected':''}>Hall</option><option value="cathedral" ${grajekApp.eqSettings.reverb==='cathedral'?'selected':''}>Cathedral</option></select><input type="range" id="eq-reverb-mix" min="0" max="100" step="1" value="${grajekApp.eqSettings.reverbMix}" class="eq-knob flex-1" oninput="grajekApp.updateDSP('reverbMix', this.value)"></div>
                        </div>
                    </div>
                </div>

                <!-- WIZUALIZATOR -->
                <div id="grajek-tab-viz" class="tab-content flex-1 hidden flex-col relative bg-black">
                    <select id="grajek-viz-select" class="absolute top-4 right-4 bg-black/80 text-white text-[10px] sm:text-xs p-1.5 border border-gray-600 rounded outline-none backdrop-blur-md z-20 shadow-lg cursor-pointer" onchange="grajekApp.currentVizType = parseInt(this.value)">
                        <option value="0">1. Klasyczne Słupki</option>
                        <option value="1">2. Neonowa Fala</option>
                        <option value="2">3. Radar</option>
                        <option value="3">4. Symetria Kinowa</option>
                        <option value="4">5. Latające Cząsteczki</option>
                        <option value="5">6. Matrix Cyberpunk</option>
                        <option value="6">7. Pulsujący Pierścień</option>
                        <option value="7">8. Gęste Widmo</option>
                        <option value="8">9. Góry i Doliny</option>
                        <option value="9">10. Lustrzane Odbicie</option>
                    </select>
                    <canvas id="grajek-viz-canvas" class="w-full h-full"></canvas>
                </div>

                <!-- INFO -->
                <div id="grajek-tab-info" class="tab-content flex-1 hidden flex-col p-6 overflow-y-auto custom-scrollbar bg-black/10">
                    <h3 class="font-bold text-lg g-accent mb-4 border-b g-border pb-2">Informacje o utworze</h3>
                    <div id="grajek-info-container" class="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm"></div>
                </div>

                <!-- LYRICS -->
                <div id="grajek-tab-lyrics" class="tab-content flex-1 hidden flex-col relative bg-black/20 overflow-hidden p-6">
                    <div id="grajek-lyrics-container" class="w-full h-full overflow-y-auto custom-scrollbar text-center flex flex-col gap-6 text-lg font-bold g-text-muted transition-all scroll-smooth pb-32"></div>
                </div>
            </div>
        `;
        appWindow.appendChild(proUI);

        grajekApp.createEQSliders();
        grajekApp.createMiniPlayer();
        proUI.addEventListener('dragover', e => e.preventDefault());
        proUI.addEventListener('drop', grajekApp.handleExternalDrop);
        grajekApp.updateGenreFilter();

        // PODPIĘCIE ZAMYKANIA APLIKACJI
        const closeBtn = titleBar ? titleBar.querySelector('.title-bar-close, .win-close, button[data-action="close"]') : null;
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                grajekApp.closeApp();
            });
        }
    },

    createEQSliders: () => {
        const eq18Container = document.getElementById('grajek-eq-sliders-18');
        if (!eq18Container) return;
        const freqsLabels = ['31', '45', '63', '90', '125', '180', '250', '355', '500', '710', '1K', '1.4K', '2K', '2.8K', '4K', '5.6K', '8K', '16K'];
        eq18Container.innerHTML = '';
        freqsLabels.forEach((f, idx) => {
            const currentVal = grajekApp.eqSettings.bands[idx] || 0;
            eq18Container.innerHTML += `
                <div class="flex flex-col items-center gap-1 h-full justify-end group shrink-0 w-8">
                    <span class="text-[8px] font-mono g-accent w-8 text-center opacity-0 group-hover:opacity-100 transition-opacity" id="eq18-val-${idx}">${currentVal>0?'+'+currentVal:currentVal}</span>
                    <input type="range" id="eq18-slider-${idx}" min="-12" max="12" value="${currentVal}" step="0.5" class="eq-slider transition-shadow hover:shadow-[0_0_8px_var(--primary)]" oninput="grajekApp.set18BandEQ(${idx}, this.value)">
                    <span class="text-[8px] g-text-muted font-bold w-8 text-center mt-1">${f}</span>
                </div>
            `;
        });
    },

    // ==================================================================
    // PLAYLISTY
    // ==================================================================
    createPlaylist: () => {
        grajekApp.showCustomPrompt("Nowa playlista", "Moja Składanka", "Utwórz", "text", (name) => {
            if(name && name.trim() !== '') {
                grajekApp.playlists.push({ id: 'pl_'+Date.now(), name: name.trim(), tracks: [] });
                grajekApp.saveData();
                grajekApp.renderPlaylists();
            }
        });
    },

    deletePlaylist: (id) => {
        grajekApp.playlists = grajekApp.playlists.filter(p => p.id !== id);
        if (grajekApp.activePlaylistId === id) grajekApp.activePlaylistId = null;
        grajekApp.saveData();
        grajekApp.renderPlaylists();
    },

    renamePlaylist: (id) => {
        const pl = grajekApp.playlists.find(p => p.id === id);
        if(!pl) return;
        grajekApp.showCustomPrompt("Zmień nazwę", pl.name, "Zapisz", "text", (name) => {
            if(name && name.trim() !== '') { 
                pl.name = name.trim();
                grajekApp.saveData();
                grajekApp.renderPlaylists();
            }
        });
    },

    selectPlaylist: (id) => {
        grajekApp.activePlaylistId = id;
        grajekApp.renderPlaylistTracks();
    },

    renderPlaylists: () => {
        const list = document.getElementById('grajek-playlists-list');
        if (!list) return;
        if (grajekApp.playlists.length === 0) {
            list.innerHTML = `<div class="text-center g-text-muted text-xs py-4">Brak playlist</div>`;
            return;
        }
        list.innerHTML = grajekApp.playlists.map(pl => `
            <div class="g-item flex items-center gap-2 px-3 py-2 cursor-pointer ${pl.id === grajekApp.activePlaylistId ? 'active' : ''}"
                 onclick="grajekApp.selectPlaylist('${pl.id}')">
                <span class="text-lg">📋</span>
                <div class="flex-1 min-w-0">
                    <div class="text-xs font-bold g-text truncate">${grajekApp.escapeHTML(pl.name)}</div>
                    <div class="text-[10px] g-text-muted">${pl.tracks.length} utworów</div>
                </div>
                <button class="g-icon-btn text-[10px]" onclick="event.stopPropagation(); grajekApp.renamePlaylist('${pl.id}')" title="Zmień nazwę">✎</button>
                <button class="g-icon-btn text-[10px] text-red-500" onclick="event.stopPropagation(); grajekApp.deletePlaylist('${pl.id}')" title="Usuń">✕</button>
            </div>
        `).join('');
    },

    renderPlaylistTracks: () => {
        const container = document.getElementById('grajek-playlist-tracks');
        if (!container) return;
        const pl = grajekApp.playlists.find(p => p.id === grajekApp.activePlaylistId);
        if (!pl) {
            container.innerHTML = `<div class="text-center g-text-muted text-xs py-8">Wybierz playlistę z lewej</div>`;
            return;
        }
        const tracksHtml = pl.tracks.map((trackId, idx) => {
            const track = grajekApp.queue.find(t => t.id === trackId);
            if (!track) return '';
            const realIndex = grajekApp.queue.indexOf(track);
            const isActive = realIndex === grajekApp.currentIndex;
            return `
                <div class="g-item flex items-center gap-2 px-3 py-2 cursor-pointer ${isActive ? 'active' : ''}"
                     ondblclick="grajekApp.playTrack(${realIndex})"
                     draggable="true" ondragstart="grajekApp.playlistDragIndex = ${idx}" ondragover="event.preventDefault()" ondrop="grajekApp.reorderPlaylistTrack(${idx})">
                    <span class="text-xs g-text-muted cursor-grab">⠿</span>
                    <img src="${track.cover || DEFAULT_COVER}" class="w-8 h-8 rounded" onerror="this.src='${FALLBACK_COVER}'">
                    <div class="flex-1 min-w-0">
                        <div class="text-xs font-bold g-text truncate">${grajekApp.escapeHTML(track.title)}</div>
                        <div class="text-[10px] g-text-muted truncate">${grajekApp.escapeHTML(track.artist)}</div>
                    </div>
                    <button class="g-icon-btn text-[10px] text-red-500" onclick="event.stopPropagation(); grajekApp.removeFromPlaylist('${pl.id}', '${trackId}')">✕</button>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="flex justify-between items-center mb-2 sticky top-0 z-10 g-bg/80 backdrop-blur-sm p-1">
                <h4 class="font-bold text-xs g-accent">${grajekApp.escapeHTML(pl.name)} (${pl.tracks.length})</h4>
                <div class="flex gap-1">
                    <button class="g-btn text-[9px] px-2 py-1 rounded mr-1" onclick="grajekApp.playPlaylist('${pl.id}')">▶ Graj</button>
                    <button class="g-btn text-[9px] px-2 py-1 rounded" onclick="grajekApp.openAddTracksModal('${pl.id}')">+ Dodaj utwory</button>
                </div>
            </div>
            ${tracksHtml || '<div class="text-center g-text-muted py-4">Playlista jest pusta.</div>'}
        `;
    },

    reorderPlaylistTrack: (toIndex) => {
        const pl = grajekApp.playlists.find(p => p.id === grajekApp.activePlaylistId);
        if (!pl || grajekApp.playlistDragIndex === undefined) return;
        const fromIndex = grajekApp.playlistDragIndex;
        const moved = pl.tracks.splice(fromIndex, 1)[0];
        pl.tracks.splice(toIndex, 0, moved);
        grajekApp.saveData();
        grajekApp.renderPlaylistTracks();
    },

    addToPlaylist: (playlistId, trackId) => {
        const pl = grajekApp.playlists.find(p => p.id === playlistId);
        if (!pl) return;
        if (!pl.tracks.includes(trackId)) {
            pl.tracks.push(trackId);
            grajekApp.saveData();
            if (grajekApp.activePlaylistId === playlistId) grajekApp.renderPlaylistTracks();
            grajekApp.renderPlaylists();
            grajekApp.showToast('OK', 'Dodano do playlisty', 'success');
        } else {
            grajekApp.showToast('Info', 'Utwór już jest w tej playliście', 'info');
        }
    },

    removeFromPlaylist: (playlistId, trackId) => {
        const pl = grajekApp.playlists.find(p => p.id === playlistId);
        if (!pl) return;
        pl.tracks = pl.tracks.filter(id => id !== trackId);
        grajekApp.saveData();
        if (grajekApp.activePlaylistId === playlistId) grajekApp.renderPlaylistTracks();
        grajekApp.renderPlaylists();
    },

    openAddTracksModal: (playlistId) => {
        const pl = grajekApp.playlists.find(p => p.id === playlistId);
        if (!pl) return;
        const modalId = 'grajek-addtracks-modal';
        document.getElementById(modalId)?.remove();
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = `grajek-modal-overlay fixed inset-0 z-[10002] bg-black/80 backdrop-blur-sm flex items-center justify-center ${grajekApp.currentTheme}`;
        const libraryTracks = grajekApp.queue.filter(t => !pl.tracks.includes(t.id));
        const trackListHtml = libraryTracks.map(t => `
            <label class="flex items-center gap-2 px-2 py-1 hover:bg-white/5 rounded cursor-pointer">
                <input type="checkbox" value="${t.id}" class="grajek-addtrack-checkbox">
                <span class="text-xs g-text">${grajekApp.escapeHTML(t.title)} - ${grajekApp.escapeHTML(t.artist)}</span>
            </label>
        `).join('');
        modal.innerHTML = `
            <div class="grajek-modal-box g-panel p-4 rounded-2xl w-[500px] max-h-[70vh] flex flex-col border g-border shadow-2xl">
                <h3 class="font-bold mb-2 g-text text-sm">Dodaj utwory do: ${grajekApp.escapeHTML(pl.name)}</h3>
                <div class="flex-1 overflow-y-auto custom-scrollbar mb-4">
                    ${trackListHtml || '<div class="text-xs g-text-muted">Brak dostępnych utworów</div>'}
                </div>
                <div class="flex gap-2 justify-end">
                    <button class="g-btn text-xs px-3 py-1 rounded" onclick="document.getElementById('${modalId}').remove()">Anuluj</button>
                    <button class="g-btn text-xs px-3 py-1 rounded" style="background: var(--grajek-primary); color: #000" onclick="grajekApp.addSelectedTracks('${playlistId}')">Dodaj wybrane</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    addSelectedTracks: (playlistId) => {
        const checkboxes = document.querySelectorAll('.grajek-addtrack-checkbox:checked');
        const ids = Array.from(checkboxes).map(cb => cb.value);
        ids.forEach(id => grajekApp.addToPlaylist(playlistId, id));
        document.getElementById('grajek-addtracks-modal')?.remove();
        grajekApp.renderPlaylistTracks();
    },

    playPlaylist: (playlistId) => {
        const pl = grajekApp.playlists.find(p => p.id === playlistId);
        if (!pl || pl.tracks.length === 0) {
            grajekApp.showToast('Playlista', 'Lista jest pusta.', 'warning');
            return;
        }
        const firstTrackId = pl.tracks.find(id => grajekApp.queue.some(t => t.id === id));
        if (!firstTrackId) {
            grajekApp.showToast('Playlista', 'Żaden utwór nie jest dostępny w bibliotece.', 'error');
            return;
        }
        grajekApp.isPlayingPlaylist = true;
        grajekApp.activePlaylistPlayId = playlistId;
        grajekApp.activePlaylistId = playlistId;
        grajekApp.renderPlaylists();
        const index = grajekApp.queue.findIndex(t => t.id === firstTrackId);
        grajekApp.playTrack(index, true, true);
    },

    getNextPlaylistTrackIndex: (currentQueueIndex) => {
        const pl = grajekApp.playlists.find(p => p.id === grajekApp.activePlaylistPlayId);
        if (!pl) return -1;
        const currentTrackId = grajekApp.queue[currentQueueIndex]?.id;
        const currentPos = pl.tracks.indexOf(currentTrackId);
        if (currentPos === -1) return -1;
        let nextPos = currentPos + 1;
        if (nextPos >= pl.tracks.length) {
            if (grajekApp.playMode === 1) {
                nextPos = 0;
            } else {
                return -1;
            }
        }
        const nextTrackId = pl.tracks[nextPos];
        const nextIndex = grajekApp.queue.findIndex(t => t.id === nextTrackId);
        return nextIndex;
    },

    // ==================================================================
    // BIBLIOTEKA
    // ==================================================================
    updateGenreFilter: () => {
        const select = document.getElementById('grajek-genre-filter');
        if (!select) return;
        const genres = [...new Set(grajekApp.queue.map(t => t.genre).filter(Boolean))];
        select.innerHTML = '<option value="all">Wszystkie gatunki</option>' +
            genres.map(g => `<option value="${g}">${g}</option>`).join('');
    },

    renderLibrary: () => {
        const list = document.getElementById('grajek-library-list');
        if (!list) return;
        const searchTerm = (document.getElementById('grajek-search')?.value || '').toLowerCase();
        const genreFilter = document.getElementById('grajek-genre-filter')?.value || 'all';

        let filtered = grajekApp.queue.filter(t => {
            const matchSearch = !searchTerm || 
                (t.title && t.title.toLowerCase().includes(searchTerm)) ||
                (t.artist && t.artist.toLowerCase().includes(searchTerm)) ||
                (t.album && t.album.toLowerCase().includes(searchTerm));
            const matchGenre = genreFilter === 'all' || (t.genre && t.genre === genreFilter);
            return matchSearch && matchGenre;
        });

        if (grajekApp.groupBy === 'none') {
            list.innerHTML = filtered.map((t, idx) => grajekApp.renderTrackRow(t, grajekApp.queue.indexOf(t))).join('') || '<div class="text-center g-text-muted py-4">Brak wyników</div>';
        } else {
            const groups = {};
            filtered.forEach(t => {
                let key = '';
                switch(grajekApp.groupBy) {
                    case 'album': key = t.album || 'Nieznany album'; break;
                    case 'artist': key = t.artist || 'Nieznany artysta'; break;
                    case 'genre': key = t.genre || 'Nieznany gatunek'; break;
                }
                if (!groups[key]) groups[key] = [];
                groups[key].push(t);
            });
            let html = '';
            for (const [group, tracks] of Object.entries(groups)) {
                html += `<div class="text-xs font-bold g-accent px-2 py-1 bg-black/20 mt-1 rounded">${group} (${tracks.length})</div>`;
                html += tracks.map(t => grajekApp.renderTrackRow(t, grajekApp.queue.indexOf(t))).join('');
            }
            list.innerHTML = html || '<div class="text-center g-text-muted py-4">Brak wyników</div>';
        }
    },

    renderTrackRow: (track, realIndex) => {
        const isActive = realIndex === grajekApp.currentIndex;
        const isFav = grajekApp.favorites.includes(track.id);
        const dur = track.durationSec ? grajekApp.grajekFmt(track.durationSec) : '--:--';
        const playCount = track.playCount || 0;
        return `
            <div class="g-item flex items-center gap-2 px-3 py-2 cursor-pointer ${isActive ? 'active' : ''}" 
                 draggable="true"
                 ondragstart="event.dataTransfer.setData('text/plain', '${track.id}'); grajekApp.draggedIndex = ${realIndex};"
                 ondblclick="grajekApp.playTrack(${realIndex})"
                 onclick="grajekApp.playTrack(${realIndex})">
                <img src="${track.cover || DEFAULT_COVER}" class="w-8 h-8 rounded object-cover flex-shrink-0" onerror="this.src='${FALLBACK_COVER}'">
                <div class="flex-1 min-w-0">
                    <div class="text-xs font-bold g-text truncate">${grajekApp.escapeHTML(track.title)}</div>
                    <div class="text-[10px] g-text-muted truncate">${grajekApp.escapeHTML(track.artist)}</div>
                </div>
                <span class="text-[10px] g-text-muted">${dur}</span>
                <span class="text-[10px] ${isFav ? 'text-red-500' : 'g-text-muted'}">${isFav ? '♥' : '♡'}</span>
                <span class="text-[10px] g-text-muted" title="Odtworzenia">▶${playCount}</span>
                <button class="g-icon-btn text-[10px] text-green-400" title="Dodaj do playlisty" onclick="event.stopPropagation(); grajekApp.showAddToPlaylistMenu('${track.id}', event)">+</button>
                <button class="g-icon-btn text-[10px] text-red-500" onclick="event.stopPropagation(); grajekApp.removeTrack(${realIndex})" title="Usuń">✕</button>
            </div>
        `;
    },

    showAddToPlaylistMenu: (trackId, event) => {
        const existing = document.getElementById('grajek-addmenu');
        if (existing) existing.remove();
        const menu = document.createElement('div');
        menu.id = 'grajek-addmenu';
        menu.className = 'absolute g-panel rounded-xl p-2 shadow-xl min-w-[150px]';
        menu.style.position = 'fixed';
        menu.style.zIndex = '10001';
        const rect = event.target.getBoundingClientRect();
        menu.style.left = rect.left + 'px';
        menu.style.top = (rect.bottom + 5) + 'px';
        const playlists = grajekApp.playlists;
        if (playlists.length === 0) {
            menu.innerHTML = '<div class="text-[10px] px-2 py-1 g-text-muted">Brak playlist</div>';
        } else {
            menu.innerHTML = playlists.map(pl => `
                <div class="text-[11px] px-2 py-1 rounded hover:bg-white/10 cursor-pointer g-text" onclick="grajekApp.addToPlaylist('${pl.id}', '${trackId}'); document.getElementById('grajek-addmenu').remove()">${grajekApp.escapeHTML(pl.name)}</div>
            `).join('');
        }
        document.body.appendChild(menu);
        setTimeout(() => {
            const clickOutside = (e) => {
                if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', clickOutside); }
            };
            document.addEventListener('click', clickOutside);
        }, 10);
    },

    removeTrack: (index) => {
        if (index === grajekApp.currentIndex) {
            grajekApp.grajekAudio.pause();
            grajekApp.isPlaying = false;
            grajekApp.currentIndex = -1;
        } else if (grajekApp.currentIndex > index) {
            grajekApp.currentIndex--;
        }
        grajekApp.queue.splice(index, 1);
        grajekApp.saveData();
        grajekApp.renderLibrary();
        grajekApp.updateGenreFilter();
    },

    handleExternalDrop: (event) => {
        event.preventDefault();
        const files = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith('audio/'));
        if (files.length) grajekApp.loadFiles({ target: { files } });
    },

    handleLibraryDrop: (event) => {
        event.preventDefault();
    },

    applySort: (sortMode) => {
        switch(sortMode) {
            case 'date_desc': grajekApp.queue.sort((a,b) => (b.dateAdded||0)-(a.dateAdded||0)); break;
            case 'name_asc': grajekApp.queue.sort((a,b) => (a.title||'').localeCompare(b.title||'')); break;
            case 'artist_asc': grajekApp.queue.sort((a,b) => (a.artist||'').localeCompare(b.artist||'')); break;
            case 'album_asc': grajekApp.queue.sort((a,b) => (a.album||'').localeCompare(b.album||'')); break;
            case 'duration_desc': grajekApp.queue.sort((a,b) => (b.durationSec||0)-(a.durationSec||0)); break;
            case 'plays_desc': grajekApp.queue.sort((a,b) => (b.playCount||0)-(a.playCount||0)); break;
        }
        grajekApp.saveData();
        grajekApp.renderLibrary();
    },

    loadFiles: (e) => {
        const files = Array.from(e.target.files || e.dataTransfer.files);
        if(!files || files.length === 0) return;
        grajekApp.showToast('Grajek PRO', `Wczytywanie ${files.length} plików...`, 'info');
        const newTracks = files.map((file, idx) => ({
            id: 't_'+Date.now()+'_'+Math.floor(Math.random()*1000)+idx,
            url: URL.createObjectURL(file), isLocal: true,
            title: file.name.replace(/\.[^/.]+$/, ""), artist: 'Nieznany Artysta',
            album: 'Nieznany Album', genre: 'Nieznany', year: 'Nieznany Rok',
            size: (file.size / (1024*1024)).toFixed(2) + " MB", format: file.type || "audio/mp3",
            lyrics: null, cover: DEFAULT_COVER, durationSec: 0, playCount: 0, dateAdded: Date.now(),
            _fileRef: file
        }));
        grajekApp.queue.push(...newTracks);
        grajekApp.saveData();
        grajekApp.updateGenreFilter();
        if (grajekApp.currentIndex === -1) grajekApp.playTrack(grajekApp.queue.length - files.length);
        grajekApp.renderLibrary();
        if (window.jsmediatags) grajekApp.processTagsInBackground(newTracks);
        e.target.value = '';
    },

    processTagsInBackground: async (tracks) => {
        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            if (!track._fileRef) continue;
            await new Promise(resolve => setTimeout(resolve, 100));
            try {
                jsmediatags.read(track._fileRef, {
                    onSuccess: function(tag) {
                        let changed = false;
                        if(tag.tags.title) { track.title = tag.tags.title; changed = true; }
                        if(tag.tags.artist) { track.artist = tag.tags.artist; changed = true; }
                        if(tag.tags.album) { track.album = tag.tags.album; changed = true; }
                        if(tag.tags.genre) { track.genre = tag.tags.genre; changed = true; }
                        if(tag.tags.year) { track.year = tag.tags.year; changed = true; }
                        if(tag.tags.lyrics) { track.lyrics = tag.tags.lyrics.lyrics || tag.tags.lyrics; changed = true; }
                        if(tag.tags.picture) {
                            try {
                                const data = tag.tags.picture.data;
                                const format = tag.tags.picture.format;
                                const blob = new Blob([new Uint8Array(data)], { type: format });
                                track.cover = URL.createObjectURL(blob);
                                changed = true;
                            } catch(err) {}
                        }
                        if (changed) {
                            grajekApp.renderLibrary();
                            grajekApp.updateGenreFilter();
                            if (grajekApp.queue[grajekApp.currentIndex] && grajekApp.queue[grajekApp.currentIndex].id === track.id) {
                                grajekApp.updateCurrentTrackUI(track);
                            }
                        }
                        delete track._fileRef;
                    },
                    onError: function() { delete track._fileRef; }
                });
            } catch(err) { delete track._fileRef; }
        }
    },

    // ==================================================================
    // AUDIO, DSP
    // ==================================================================
    setupAudio: () => {
        // if (grajekApp.audioCtx) return;
            // Jeżeli audioCtx istnieje i jest otwarty – nic nie rób
        if (grajekApp.audioCtx && grajekApp.audioCtx.state !== 'closed') return;

        // Jeżeli audioCtx był zamknięty, usuń go i utwórz nowy
        if (grajekApp.audioCtx && grajekApp.audioCtx.state === 'closed') {
            grajekApp.audioCtx = null;
        }
        // Tworzymy nowy kontekst audio
        grajekApp.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = grajekApp.audioCtx;

        grajekApp.sourceNode = ctx.createMediaElementSource(grajekApp.grajekAudio);
        grajekApp.preampNode = ctx.createGain();
        grajekApp.preampNode.gain.value = Math.pow(10, grajekApp.eqSettings.preamp / 20);
        grajekApp.eqNodes = EQ_FREQS.map(f => {
            let filter = ctx.createBiquadFilter();
            filter.type = 'peaking'; filter.frequency.value = f; filter.Q.value = 1.4; filter.gain.value = 0;
            return filter;
        });
        grajekApp.bassNode = ctx.createBiquadFilter();
        grajekApp.bassNode.type = 'lowshelf'; grajekApp.bassNode.frequency.value = 100;
        grajekApp.trebleNode = ctx.createBiquadFilter();
        grajekApp.trebleNode.type = 'highshelf'; grajekApp.trebleNode.frequency.value = 8000;
        grajekApp.compressorNode = ctx.createDynamicsCompressor();
        grajekApp.limiterNode = ctx.createDynamicsCompressor();
        grajekApp.pannerNode = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createPanner();
        grajekApp.gainNode = ctx.createGain();
        grajekApp.volumeNode = ctx.createGain();
        grajekApp.analyser = ctx.createAnalyser();
        grajekApp.analyser.fftSize = 256;
        grajekApp.vuSplitter = ctx.createChannelSplitter(2);
        grajekApp.analyserL = ctx.createAnalyser(); grajekApp.analyserL.fftSize = 32;
        grajekApp.analyserR = ctx.createAnalyser(); grajekApp.analyserR.fftSize = 32;
        grajekApp.reverbNode = ctx.createConvolver();
        grajekApp.reverbGain = ctx.createGain(); grajekApp.reverbGain.gain.value = 0;

        grajekApp.sourceNode.connect(grajekApp.preampNode);
        grajekApp.preampNode.connect(grajekApp.eqNodes[0]);
        for(let i=0; i < grajekApp.eqNodes.length - 1; i++) {
            grajekApp.eqNodes[i].connect(grajekApp.eqNodes[i+1]);
        }
        grajekApp.eqNodes[grajekApp.eqNodes.length - 1].connect(grajekApp.bassNode);
        grajekApp.bassNode.connect(grajekApp.trebleNode);
        grajekApp.trebleNode.connect(grajekApp.compressorNode);
        if(grajekApp.pannerNode.pan) {
            grajekApp.compressorNode.connect(grajekApp.pannerNode);
            grajekApp.pannerNode.connect(grajekApp.gainNode);
        } else {
            grajekApp.compressorNode.connect(grajekApp.gainNode);
        }
        grajekApp.compressorNode.connect(grajekApp.reverbNode);
        grajekApp.reverbNode.connect(grajekApp.reverbGain);
        grajekApp.reverbGain.connect(grajekApp.gainNode);
        grajekApp.gainNode.connect(grajekApp.limiterNode);
        grajekApp.limiterNode.threshold.value = -0.5; grajekApp.limiterNode.knee.value = 0; grajekApp.limiterNode.ratio.value = 20; grajekApp.limiterNode.attack.value = 0.001;
        grajekApp.limiterNode.connect(grajekApp.analyser);
        grajekApp.limiterNode.connect(grajekApp.vuSplitter);
        grajekApp.vuSplitter.connect(grajekApp.analyserL, 0);
        grajekApp.vuSplitter.connect(grajekApp.analyserR, 1);
        grajekApp.analyser.connect(grajekApp.volumeNode);
        grajekApp.volumeNode.connect(ctx.destination);

        const volSlider = document.getElementById('grajek-volume');
        if (volSlider) grajekApp.setVolume(volSlider.value);
        grajekApp.applySavedEQ();
        grajekApp.applyReverbImpulse(grajekApp.eqSettings.reverb);
    },

    applyReverbImpulse: (type) => {
        if(!grajekApp.audioCtx || !grajekApp.reverbNode) return;
        if(type === 'off') { grajekApp.reverbGain.gain.value = 0; return; }
        let duration = 0.5, decay = 2.0;
        if(type === 'room') { duration = 0.5; decay = 3.0; }
        else if(type === 'studio') { duration = 0.2; decay = 5.0; }
        else if(type === 'hall') { duration = 1.5; decay = 1.5; }
        else if(type === 'cathedral') { duration = 3.5; decay = 1.0; }
        const sr = grajekApp.audioCtx.sampleRate;
        const len = sr * duration;
        const impulse = grajekApp.audioCtx.createBuffer(2, len, sr);
        for(let i=0; i<2; i++){
            let c = impulse.getChannelData(i);
            for(let j=0; j<len; j++){
                c[j] = (Math.random() * 2 - 1) * Math.pow(1 - j/len, decay) * 2.0;
            }
        }
        grajekApp.reverbNode.buffer = impulse;
    },

    updateDSP: (type, value) => {
        if(!grajekApp.audioCtx) return;
        let v = parseFloat(value);
        switch(type) {
            case 'preamp': grajekApp.eqSettings.preamp = v; if(grajekApp.preampNode) grajekApp.preampNode.gain.value = Math.pow(10, v / 20); document.getElementById('lbl-preamp').innerText = `${v>0?'+'+v:v}dB`; break;
            case 'balance': grajekApp.eqSettings.balance = v; if(grajekApp.pannerNode && grajekApp.pannerNode.pan) grajekApp.pannerNode.pan.value = v; break;
            case 'width': grajekApp.eqSettings.width = v; break;
            case 'bass': grajekApp.eqSettings.bass = v; if(grajekApp.bassNode) grajekApp.bassNode.gain.value = (v / 100) * 15; document.getElementById('lbl-bass').innerText = `${v}%`; break;
            case 'treble': grajekApp.eqSettings.treble = v; if(grajekApp.trebleNode) grajekApp.trebleNode.gain.value = v; document.getElementById('lbl-treble').innerText = `${v>0?'+'+v:v}dB`; break;
            case 'compressor': grajekApp.eqSettings.compThresh = v; if(grajekApp.compressorNode) { grajekApp.compressorNode.threshold.value = v; grajekApp.compressorNode.ratio.value = v < -10 ? 4 : 1; } break;
            case 'reverb': grajekApp.eqSettings.reverb = value; grajekApp.applyReverbImpulse(value); break;
            case 'reverbMix': grajekApp.eqSettings.reverbMix = v; if(grajekApp.reverbGain) grajekApp.reverbGain.gain.value = grajekApp.eqSettings.reverb === 'off' ? 0 : (v / 100) * 2.5; break;
            case 'surround': grajekApp.eqSettings.surround = value; if(value==='cinema'){grajekApp.updateDSP('bass',80);grajekApp.updateDSP('reverb','hall');grajekApp.updateDSP('reverbMix',15);} else if(value==='concert'){grajekApp.updateDSP('reverb','cathedral');grajekApp.updateDSP('reverbMix',40);} else if(value==='stereo'){grajekApp.updateDSP('reverb','off');grajekApp.updateDSP('reverbMix',0);} break;
        }
        localStorage.setItem('bigos_grajek_eq', JSON.stringify(grajekApp.eqSettings));
    },

    set18BandEQ: (index, value) => {
        const v = parseFloat(value);
        grajekApp.eqSettings.bands[index] = v;
        if(grajekApp.eqNodes[index]) grajekApp.eqNodes[index].gain.value = v;
        const valLabel = document.getElementById(`eq18-val-${index}`);
        if(valLabel) valLabel.innerText = v > 0 ? `+${v}` : v;
        localStorage.setItem('bigos_grajek_eq', JSON.stringify(grajekApp.eqSettings));
    },

    applySavedEQ: () => {
        grajekApp.eqSettings.bands.forEach((v, i) => grajekApp.set18BandEQ(i, v));
        const s = grajekApp.eqSettings;
        grajekApp.updateDSP('preamp', s.preamp); grajekApp.updateDSP('bass', s.bass); grajekApp.updateDSP('treble', s.treble);
        grajekApp.updateDSP('compressor', s.compThresh); grajekApp.updateDSP('balance', s.balance); grajekApp.updateDSP('reverbMix', s.reverbMix);
        document.querySelectorAll('.eq-slider').forEach((el, i) => { if(s.bands[i] !== undefined) el.value = s.bands[i]; });
        document.getElementById('eq-preamp').value = s.preamp; document.getElementById('eq-bass').value = s.bass; document.getElementById('eq-treble').value = s.treble;
        document.getElementById('eq-balance').value = s.balance; document.getElementById('eq-width').value = s.width;
        document.getElementById('eq-comp').value = s.compThresh; document.getElementById('eq-reverb-mix').value = s.reverbMix;
        document.getElementById('eq-reverb-type').value = s.reverb; document.getElementById('eq-surround').value = s.surround;
    },

    applyEQPreset: (preset) => {
        if (preset === 'auto_eq') { grajekApp.applyAutoEQ(); return; }
        const presets = {
            'flat': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            'bass_boost': [8,8,7,6,5,4,2,0,0,0,0,0,0,0,0,0,0,0],
            'super_bass': [10,10,9,8,7,5,3,1,0,0,0,0,0,0,0,0,0,0],
            'rock': [5,4,3,2,0,-1,-2,-2,-1,0,1,2,3,4,4,4,5,5],
            'metal': [8,7,6,4,-2,-4,-5,-4,-2,0,2,4,6,7,7,7,8,8],
            'pop': [-2,-1,0,2,3,4,4,3,2,1,0,-1,-2,-2,-1,0,1,2],
            'dance': [6,5,4,3,2,1,0,0,0,1,2,3,4,5,5,4,3,2],
            'edm': [7,6,5,3,1,0,0,0,1,2,3,4,5,6,6,5,4,3],
            'hiphop': [9,8,6,4,2,0,0,0,1,2,2,1,0,-1,-1,0,1,2],
            'jazz': [3,3,2,1,0,-1,-1,-1,-1,0,1,2,3,3,2,1,0,-1],
            'classical': [2,2,1,0,0,0,0,0,0,0,1,2,3,4,5,5,4,3],
            'acoustic': [3,2,1,0,0,0,0,1,1,2,2,3,3,2,1,0,0,0],
            'vocal': [-2,-1,0,0,1,2,3,4,4,3,2,1,0,0,0,0,0,0],
            'movie': [4,3,2,1,0,0,0,1,2,2,1,0,-1,-2,-2,-1,0,1],
            'podcast': [-3,-3,-2,-1,0,2,3,4,5,4,3,2,1,0,-1,-2,-3,-4],
            'gaming': [5,4,3,2,1,0,0,1,2,3,3,2,1,0,0,1,2,3],
            'night': [-4,-3,-2,-1,0,0,0,0,0,0,0,-1,-2,-3,-4,-5,-6,-8]
        };
        if (preset === 'flat') {
            grajekApp.updateDSP('bass',0); grajekApp.updateDSP('treble',0); grajekApp.updateDSP('compressor',-1); grajekApp.updateDSP('preamp',0);
            grajekApp.updateDSP('reverbMix',0); grajekApp.updateDSP('reverb','off');
        } else if (preset.includes('bass')) {
            grajekApp.updateDSP('bass', preset === 'super_bass' ? 70 : 50);
        }
        const p = presets[preset];
        if (p) {
            p.forEach((val, idx) => grajekApp.set18BandEQ(idx, val));
            document.querySelectorAll('.eq-slider').forEach((el, i) => { if(p[i] !== undefined) el.value = p[i]; });
            grajekApp.showToast('Korektor', `Preset: ${preset}`, 'success');
        }
    },

    applyAutoEQ: () => {
        if (grajekApp.currentIndex === -1) return;
        const track = grajekApp.queue[grajekApp.currentIndex];
        const genre = (track.genre || '').toLowerCase();
        let preset = 'flat';
        if (genre.includes('rock') || genre.includes('metal')) preset = 'rock';
        else if (genre.includes('pop') || genre.includes('dance')) preset = 'pop';
        else if (genre.includes('jazz') || genre.includes('blues')) preset = 'jazz';
        else if (genre.includes('classical') || genre.includes('piano')) preset = 'classical';
        else if (genre.includes('hip') || genre.includes('rap')) preset = 'hiphop';
        else if (genre.includes('electronic') || genre.includes('edm')) preset = 'edm';
        grajekApp.applyEQPreset(preset);
    },

    saveCustomPreset: () => {
        grajekApp.showCustomPrompt("Zapisz preset EQ", "Mój Preset", "Zapisz", "text", (name) => {
            if (!name || name.trim() === '') return;
            const presets = grajekApp.parseSafe(localStorage.getItem('bigos_grajek_eq_presets'), {});
            presets[name.trim()] = JSON.parse(JSON.stringify(grajekApp.eqSettings));
            localStorage.setItem('bigos_grajek_eq_presets', JSON.stringify(presets));
            grajekApp.showToast('EQ', `Preset "${name.trim()}" zapisany!`, 'success');
        });
    },

    exportEQ: () => {
        const data = JSON.stringify(grajekApp.eqSettings, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'grajek_eq_preset.json'; a.click();
        URL.revokeObjectURL(url);
    },

    importEQ: (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (imported.bands && Array.isArray(imported.bands)) {
                    grajekApp.eqSettings = { ...grajekApp.eqSettings, ...imported };
                    grajekApp.applySavedEQ();
                    localStorage.setItem('bigos_grajek_eq', JSON.stringify(grajekApp.eqSettings));
                    grajekApp.showToast('EQ', 'Preset zaimportowany!', 'success');
                } else throw new Error('Invalid format');
            } catch(err) {
                grajekApp.showToast('EQ', 'Błąd importu.', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    // ==================================================================
    // ODTWARZACZ
    // ==================================================================
    playTrack: (index, applyFadeIn = true, keepPlaylistMode = false) => {
        if (index < 0 || index >= grajekApp.queue.length) return;
        if (!keepPlaylistMode) {
            grajekApp.isPlayingPlaylist = false;
            grajekApp.activePlaylistPlayId = null;
        }
         grajekApp.setupAudio();
        const execute = (idx, fade) => {
            grajekApp.currentIndex = idx;
            const track = grajekApp.queue[idx];
            track.playCount = (track.playCount || 0) + 1;
            grajekApp.saveData();
            grajekApp.setupAudio();
            grajekApp.grajekAudio.src = track.url;
            
                // *** NATYCHMIASTOWA AKTUALIZACJA CZASU I PASKA ***
                const progress = document.getElementById('grajek-progress');
                const timeEl = document.getElementById('grajek-time');
                const durationEl = document.getElementById('grajek-duration');
                if (progress) progress.value = 0;
                if (timeEl) timeEl.innerText = '00:00';
                if (durationEl) durationEl.innerText = grajekApp.grajekFmt(track.durationSec || 0);


            let playPromise = grajekApp.grajekAudio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    grajekApp.isPlaying = true;
                    if(grajekApp.audioCtx.state === 'suspended') grajekApp.audioCtx.resume();
                    if(fade && grajekApp.gainNode) {
                        grajekApp.gainNode.gain.setValueAtTime(0.01, grajekApp.audioCtx.currentTime);
                        grajekApp.fadeAudio(1.0, 1.0);
                    }
                    grajekApp.updateCurrentTrackUI(track);
                    grajekApp.renderLibrary();
                    grajekApp.renderPlaylistTracksIfActive();
                    grajekApp.drawVisualizer();
                }).catch(e => {
                    if (e.name !== 'AbortError') grajekApp.next(true);
                });
            }
        };
        if (grajekApp.isPlaying && grajekApp.audioCtx && grajekApp.audioCtx.state === 'running') {
            grajekApp.fadeAudio(0.01, 0.5, () => execute(index, applyFadeIn));
        } else {
            execute(index, applyFadeIn);
        }
    },

    renderPlaylistTracksIfActive: () => {
        if (grajekApp.activePlaylistId) grajekApp.renderPlaylistTracks();
    },

    fadeAudio: (targetGain, duration, callback) => {
        if(!grajekApp.audioCtx || !grajekApp.gainNode) { if(callback) callback(); return; }
        const now = grajekApp.audioCtx.currentTime;
        grajekApp.gainNode.gain.cancelScheduledValues(now);
        grajekApp.gainNode.gain.setValueAtTime(grajekApp.gainNode.gain.value, now);
        grajekApp.gainNode.gain.linearRampToValueAtTime(targetGain, now + duration);
        if (callback) setTimeout(callback, duration * 1000);
    },

    updateCurrentTrackUI: (track) => {
        document.getElementById('grajek-yt-container')?.classList.add('hidden');
        document.getElementById('grajek-title').innerText = track.title;
        document.getElementById('grajek-artist').innerText = track.artist;
        document.getElementById('grajek-cover').src = track.cover;
        document.getElementById('grajek-bg-blur').style.backgroundImage = `url('${track.cover}')`;
        document.getElementById('grajek-btn-play').innerText = grajekApp.isPlaying ? '⏸' : '▶';
        document.getElementById('grajek-cover').style.animationPlayState = grajekApp.isPlaying ? 'running' : 'paused';
        const mini = (id) => document.getElementById('grajek-mini-'+id);
        if (mini('play')) mini('play').innerText = grajekApp.isPlaying ? '⏸' : '▶';
        if (mini('cover')) mini('cover').src = track.cover;
        if (mini('spin')) mini('spin').style.animationPlayState = grajekApp.isPlaying ? 'running' : 'paused';
        if (mini('title')) mini('title').innerText = track.title;
        if (mini('artist')) mini('artist').innerText = track.artist;
        const favBtn = document.getElementById('grajek-btn-fav');
        if (favBtn) {
            if (grajekApp.favorites.includes(track.id)) { favBtn.classList.add('text-red-500'); favBtn.innerText = '♥'; }
            else { favBtn.classList.remove('text-red-500'); favBtn.innerText = '♡'; }
        }
        grajekApp.renderInfoTab(track);
        grajekApp.renderLyricsTab(track);
    },

    renderInfoTab: (track) => {
        const info = document.getElementById('grajek-info-container');
        if(!info) return;
        let bitrate = "Nieznany";
        if (track.size && track.durationSec) {
            let sizeBytes = parseFloat(track.size) * 1024 * 1024;
            if (!isNaN(sizeBytes) && track.durationSec > 0) {
                let kbps = (sizeBytes * 8) / track.durationSec / 1000;
                if(kbps > 0 && kbps < 2000) bitrate = "~" + Math.round(kbps) + " kbps";
            }
        }
        const e = grajekApp.escapeHTML;
        info.innerHTML = `
            <div class="flex flex-col"><span class="g-text-muted text-[10px] uppercase">Tytuł</span><span class="g-text font-bold">${e(track.title)}</span></div>
            <div class="flex flex-col"><span class="g-text-muted text-[10px] uppercase">Artysta</span><span class="g-text font-bold">${e(track.artist)}</span></div>
            <div class="flex flex-col"><span class="g-text-muted text-[10px] uppercase">Album</span><span class="g-text font-bold">${e(track.album)}</span></div>
            <div class="flex flex-col"><span class="g-text-muted text-[10px] uppercase">Rok</span><span class="g-text font-bold">${e(track.year)}</span></div>
            <div class="flex flex-col"><span class="g-text-muted text-[10px] uppercase">Gatunek</span><span class="g-text font-bold">${e(track.genre)}</span></div>
            <div class="flex flex-col"><span class="g-text-muted text-[10px] uppercase">Format</span><span class="g-text font-bold">${e(track.format)}</span></div>
            <div class="flex flex-col"><span class="g-text-muted text-[10px] uppercase">Rozmiar</span><span class="g-text font-bold">${e(track.size)}</span></div>
            <div class="flex flex-col"><span class="g-text-muted text-[10px] uppercase">Bitrate</span><span class="g-text font-bold" id="grajek-info-bitrate">${bitrate}</span></div>
        `;
    },

    renderLyricsTab: (track) => {
        const c = document.getElementById('grajek-lyrics-container');
        if(!c) return;
        c.innerHTML = '';
        const e = grajekApp.escapeHTML;
        if (track.lyrics) {
            track.lyrics.split('\n').forEach((l, idx) => {
                c.innerHTML += `<div id="lyric-line-${idx}" class="lyric-line py-1 transition-colors duration-300">${e(l)}</div>`;
            });
        } else {
            c.innerHTML = `<div class="text-sm text-gray-500 mb-8">(Brak tekstu)</div>`;
        }
    },

    togglePlay: () => {
        if(grajekApp.currentIndex === -1 && grajekApp.queue.length > 0) { grajekApp.playTrack(0); return; }
        if(!grajekApp.grajekAudio.src) return;
        if (grajekApp.isPlaying) {
            grajekApp.fadeAudio(0.01, 0.5, () => {
                grajekApp.grajekAudio.pause();
                grajekApp.isPlaying = false;
                document.getElementById('grajek-btn-play').innerText = '▶';
                document.getElementById('grajek-cover').style.animationPlayState = 'paused';
                const mPlay = document.getElementById('grajek-mini-btn-play'), mSpin = document.getElementById('grajek-mini-spin');
                if(mPlay) mPlay.innerText = '▶'; if(mSpin) mSpin.style.animationPlayState = 'paused';
            });
        } else {
            if (grajekApp.audioCtx && grajekApp.audioCtx.state === 'suspended') grajekApp.audioCtx.resume();
            grajekApp.grajekAudio.play().then(() => {
                grajekApp.fadeAudio(1.0, 0.5);
                grajekApp.isPlaying = true;
                document.getElementById('grajek-btn-play').innerText = '⏸';
                document.getElementById('grajek-cover').style.animationPlayState = 'running';
                const mPlay = document.getElementById('grajek-mini-btn-play'), mSpin = document.getElementById('grajek-mini-spin');
                if(mPlay) mPlay.innerText = '⏸'; if(mSpin) mSpin.style.animationPlayState = 'running';
                grajekApp.drawVisualizer();
            });
        }
    },

    next: (force = false) => {
        if (grajekApp.queue.length === 0) return;
        if (grajekApp.isPlayingPlaylist && grajekApp.activePlaylistPlayId) {
            const nextIdx = grajekApp.getNextPlaylistTrackIndex(grajekApp.currentIndex);
            if (nextIdx !== -1) {
                grajekApp.playTrack(nextIdx, true, true);
                return;
            } else {
                grajekApp.isPlayingPlaylist = false;
                grajekApp.activePlaylistPlayId = null;
                grajekApp.grajekAudio.pause();
                grajekApp.isPlaying = false;
                grajekApp.updateCurrentTrackUI(grajekApp.queue[grajekApp.currentIndex] || {});
                grajekApp.showToast('Playlista', 'Zakończono odtwarzanie playlisty.', 'info');
                return;
            }
        }
        let nextIdx = grajekApp.currentIndex + 1;
        if (grajekApp.playMode === 3 && !force) nextIdx = Math.floor(Math.random() * grajekApp.queue.length);
        else if (grajekApp.playMode === 2 && !force) nextIdx = grajekApp.currentIndex;
        else {
            if (nextIdx >= grajekApp.queue.length) {
                if (grajekApp.playMode === 1) nextIdx = 0; else return;
            }
        }
        grajekApp.playTrack(nextIdx);
    },

    prev: () => {
        if (grajekApp.queue.length === 0) return;
        if (grajekApp.isPlayingPlaylist) {
            const pl = grajekApp.playlists.find(p => p.id === grajekApp.activePlaylistPlayId);
            if (pl) {
                const currentTrackId = grajekApp.queue[grajekApp.currentIndex]?.id;
                const pos = pl.tracks.indexOf(currentTrackId);
                if (pos > 0) {
                    const prevTrackId = pl.tracks[pos - 1];
                    const prevIdx = grajekApp.queue.findIndex(t => t.id === prevTrackId);
                    if (prevIdx !== -1) {
                        grajekApp.playTrack(prevIdx, true, true);
                        return;
                    }
                }
            }
        }
        if (grajekApp.grajekAudio.currentTime > 3) { grajekApp.seek(0); return; }
        let prevIdx = grajekApp.currentIndex - 1;
        if (prevIdx < 0) prevIdx = grajekApp.queue.length - 1;
        grajekApp.playTrack(prevIdx);
    },

    seek: (val) => { if(grajekApp.grajekAudio.duration) grajekApp.grajekAudio.currentTime = (val / 100) * grajekApp.grajekAudio.duration; },
    seekRelative: (sec) => { if(grajekApp.grajekAudio.duration) grajekApp.grajekAudio.currentTime = Math.max(0, Math.min(grajekApp.grajekAudio.currentTime + sec, grajekApp.grajekAudio.duration)); },

    toggleMode: () => {
        grajekApp.playMode = (grajekApp.playMode + 1) % 4;
        const modes = ['SEQUENTIAL', 'REPEAT ALL', 'REPEAT ONE', 'SHUFFLE'];
        document.getElementById('grajek-mode-badge').innerText = modes[grajekApp.playMode];
    },

    toggleFavorite: () => {
        if (grajekApp.currentIndex === -1) return;
        const track = grajekApp.queue[grajekApp.currentIndex];
        const btn = document.getElementById('grajek-btn-fav');
        if (!btn) return;
        if (grajekApp.favorites.includes(track.id)) {
            grajekApp.favorites = grajekApp.favorites.filter(id => id !== track.id);
            btn.classList.remove('text-red-500'); btn.innerText = '♡';
        } else {
            grajekApp.favorites.push(track.id);
            btn.classList.add('text-red-500'); btn.innerText = '♥';
        }
        grajekApp.saveData();
        grajekApp.renderLibrary();
        if (grajekApp.activePlaylistId) grajekApp.renderPlaylistTracks();
    },

    setVolume: (val) => {
        const vol = parseInt(val) / 100;
        grajekApp.grajekAudio.volume = vol;
        if (grajekApp.volumeNode) grajekApp.volumeNode.gain.value = vol;
        document.getElementById('grajek-vol-label').innerText = val + '%';
        grajekApp._muted = (val == 0);
        const muteBtn = document.getElementById('grajek-btn-mute');
        if (muteBtn) muteBtn.innerText = grajekApp._muted ? '🔇' : (val < 30 ? '🔉' : '🔊');
        if (!grajekApp._muted) grajekApp._previousVolume = parseInt(val);
    },

    toggleMute: () => {
        const volSlider = document.getElementById('grajek-volume');
        if (!volSlider) return;
        if (grajekApp._muted) {
            grajekApp.setVolume(grajekApp._previousVolume);
            volSlider.value = grajekApp._previousVolume;
        } else {
            grajekApp._previousVolume = parseInt(volSlider.value) || 100;
            grajekApp.setVolume(0);
            volSlider.value = 0;
        }
    },

    updateTimeUI: () => {
        const p = document.getElementById('grajek-progress');
        const t = document.getElementById('grajek-time');
        const d = document.getElementById('grajek-duration');
        if(grajekApp.grajekAudio.duration && grajekApp.queue[grajekApp.currentIndex]) {
            const track = grajekApp.queue[grajekApp.currentIndex];
            if(!track.durationSec) {
                track.durationSec = grajekApp.grajekAudio.duration;
                grajekApp.saveData();
                const bitrateEl = document.getElementById('grajek-info-bitrate');
                if (bitrateEl && track.size) {
                    let sizeBytes = parseFloat(track.size) * 1024 * 1024;
                    if (!isNaN(sizeBytes) && track.durationSec > 0) {
                        let kbps = (sizeBytes * 8) / track.durationSec / 1000;
                        if(kbps > 0 && kbps < 2000) bitrateEl.innerText = "~" + Math.round(kbps) + " kbps";
                    }
                }
            }
        }
        if(grajekApp.grajekAudio.duration && p && t && d) {
            const percent = (grajekApp.grajekAudio.currentTime / grajekApp.grajekAudio.duration) * 100;
            p.value = percent;
            t.innerText = grajekApp.grajekFmt(grajekApp.grajekAudio.currentTime);
            d.innerText = grajekApp.grajekFmt(grajekApp.grajekAudio.duration);
            grajekApp.updateLyricsScroll(percent);
        }
        grajekApp.updateVUMeters();
    },

    updateLyricsScroll: (percent) => {
        const c = document.getElementById('grajek-lyrics-container');
        if(!c || !c.offsetParent) return;
        const lines = c.querySelectorAll('.lyric-line');
        if(lines.length === 0) return;
        let activeIndex = Math.floor((percent / 100) * lines.length);
        if (activeIndex >= lines.length) activeIndex = lines.length - 1;
        lines.forEach((l, i) => {
            if (i === activeIndex) {
                l.classList.add('g-accent', 'scale-110'); l.classList.remove('g-text-muted');
                c.scrollTo({ top: l.offsetTop - c.offsetHeight/2 + 20, behavior: 'smooth' });
            } else {
                l.classList.remove('g-accent', 'scale-110'); l.classList.add('g-text-muted');
            }
        });
    },

    updateVUMeters: () => {
        const eqTab = document.getElementById('grajek-tab-eq');
        if(!eqTab || eqTab.classList.contains('hidden') || !grajekApp.isPlaying || !grajekApp.analyserL) return;
        const dataL = new Uint8Array(grajekApp.analyserL.frequencyBinCount);
        const dataR = new Uint8Array(grajekApp.analyserR.frequencyBinCount);
        grajekApp.analyserL.getByteFrequencyData(dataL);
        grajekApp.analyserR.getByteFrequencyData(dataR);
        let avgL=0, avgR=0;
        for(let i=0; i<dataL.length; i++) { avgL += dataL[i]; avgR += dataR[i]; }
        avgL = (avgL / dataL.length / 255) * 100;
        avgR = (avgR / dataR.length / 255) * 100;
        document.getElementById('vu-l').style.height = `${Math.min(100, avgL*1.5)}%`;
        document.getElementById('vu-r').style.height = `${Math.min(100, avgR*1.5)}%`;
        document.getElementById('vu-l').style.backgroundColor = avgL > 60 ? '#ef4444' : (avgL > 40 ? '#fde047' : '#22c55e');
        document.getElementById('vu-r').style.backgroundColor = avgR > 60 ? '#ef4444' : (avgR > 40 ? '#fde047' : '#22c55e');
        const clip = document.getElementById('vu-clip');
        if (clip) {
            if (avgL > 65 || avgR > 65) { clip.classList.add('bg-red-600','text-white'); clip.classList.remove('bg-gray-900','text-gray-700'); }
            else { clip.classList.remove('bg-red-600','text-white'); clip.classList.add('bg-gray-900','text-gray-700'); }
        }
    },

    // ==================================================================
    // WIZUALIZATOR
    // ==================================================================
    drawVisualizer: () => {
        if(grajekApp.vizLoop) cancelAnimationFrame(grajekApp.vizLoop);
        const canvas = document.getElementById('grajek-viz-canvas');
        const eqCanvas = document.getElementById('grajek-eq-viz');
        const draw = () => {
            if (!grajekApp.isPlaying) return;
            grajekApp.vizLoop = requestAnimationFrame(draw);
            if(!grajekApp.analyser) return;
            const bufferLength = grajekApp.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            grajekApp.analyser.getByteFrequencyData(dataArray);

            if (eqCanvas && eqCanvas.offsetParent) {
                eqCanvas.width = eqCanvas.offsetWidth; eqCanvas.height = eqCanvas.offsetHeight;
                const ectx = eqCanvas.getContext('2d');
                ectx.clearRect(0,0,eqCanvas.width, eqCanvas.height);
                const barW = (eqCanvas.width / bufferLength) * 2.5;
                let x = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const barH = (dataArray[i] / 255) * eqCanvas.height;
                    ectx.fillStyle = `hsl(${200 + (i/bufferLength)*100}, 100%, 60%)`;
                    ectx.fillRect(x, eqCanvas.height - barH, barW, barH);
                    x += barW + 1;
                }
            }

            if (canvas && canvas.offsetParent) {
                if (canvas.width !== canvas.offsetWidth) canvas.width = canvas.offsetWidth;
                if (canvas.height !== canvas.offsetHeight) canvas.height = canvas.offsetHeight;
                const ctx = canvas.getContext('2d');
                const width = canvas.width, height = canvas.height;
                if ([1,4,6].includes(grajekApp.currentVizType)) ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                else ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, width, height);

                switch(grajekApp.currentVizType) {
                    case 0: {
                        const barWidth = (width / bufferLength) * 2.0;
                        let x = 0;
                        for (let i = 0; i < bufferLength; i++) {
                            const barHeight = (dataArray[i] / 255) * height;
                            const r = Math.min(255, barHeight + (50 * (i / bufferLength)));
                            const g = Math.max(0, 250 - (250 * (i / bufferLength)));
                            const b = Math.min(255, 100 + (150 * (i / bufferLength)));
                            ctx.fillStyle = `rgb(${r},${g},${b})`;
                            ctx.fillRect(x, height - barHeight, barWidth, barHeight);
                            x += barWidth + 1;
                        }
                        break;
                    }
                    case 1: {
                        ctx.beginPath(); ctx.lineWidth = 3; ctx.strokeStyle = '#06b6d4'; ctx.shadowBlur = 10; ctx.shadowColor = '#06b6d4';
                        const sliceWidth = width / bufferLength; let x = 0;
                        for (let i = 0; i < bufferLength; i++) {
                            const v = dataArray[i] / 128.0; const y = v * height / 2;
                            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                            x += sliceWidth;
                        }
                        ctx.lineTo(width, height / 2); ctx.stroke(); ctx.shadowBlur = 0;
                        break;
                    }
                    case 2: {
                        ctx.save(); ctx.translate(width / 2, height / 2); const radius = Math.min(width, height) / 4;
                        for (let i = 0; i < bufferLength; i++) {
                            const barHeight = (dataArray[i] / 255) * (height/2);
                            const rads = Math.PI * 2 / bufferLength;
                            const x = Math.cos(rads * i) * radius; const y = Math.sin(rads * i) * radius;
                            ctx.save(); ctx.translate(x, y); ctx.rotate(rads * i);
                            ctx.fillStyle = `hsl(${(i/bufferLength)*360}, 100%, 60%)`;
                            ctx.fillRect(0, 0, barHeight, 2); ctx.restore();
                        }
                        ctx.restore(); break;
                    }
                    case 3: {
                        const halfLen = Math.floor(bufferLength / 2); const barW = (width / 2) / halfLen;
                        for (let i = 0; i < halfLen; i++) {
                            const barH = (dataArray[i] / 255) * height;
                            ctx.fillStyle = `hsl(${200 + (i/halfLen)*100}, 100%, 60%)`;
                            ctx.fillRect(width/2 + i*barW, height - barH, barW - 1, barH);
                            ctx.fillRect(width/2 - i*barW - barW, height - barH, barW - 1, barH);
                        }
                        break;
                    }
                    case 4: {
                        const pWidth = width / bufferLength;
                        for (let i = 0; i < bufferLength; i++) {
                            const barH = (dataArray[i] / 255) * height;
                            ctx.beginPath(); ctx.arc(i * pWidth, height - barH - 5, 2.5, 0, Math.PI * 2);
                            ctx.fillStyle = `hsl(${(i/bufferLength)*360}, 100%, 70%)`; ctx.fill();
                        }
                        break;
                    }
                    case 5: {
                        const cWidth = width / bufferLength;
                        for (let i = 0; i < bufferLength; i++) {
                            const numBlocks = Math.floor(dataArray[i] / 20);
                            ctx.fillStyle = '#10b981';
                            for(let j = 0; j < numBlocks; j++) ctx.fillRect(i * cWidth, height - (j * 8) - 6, cWidth - 1, 4);
                        }
                        break;
                    }
                    case 6: {
                        let sum = 0; for(let i = 0; i < bufferLength; i++) sum += dataArray[i];
                        let avg = sum / bufferLength;
                        ctx.beginPath(); ctx.arc(width/2, height/2, 20 + avg, 0, Math.PI*2);
                        ctx.strokeStyle = `hsl(${avg * 2}, 100%, 60%)`; ctx.lineWidth = 4; ctx.stroke();
                        ctx.beginPath(); ctx.arc(width/2, height/2, 10 + avg*0.5, 0, Math.PI*2);
                        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, avg/100)})`; ctx.fill();
                        break;
                    }
                    case 7: {
                        for (let i = 0; i < bufferLength; i++) {
                            let opacity = dataArray[i] / 255; ctx.fillStyle = `rgba(${i*2}, 150, 255, ${opacity})`;
                            ctx.fillRect(i * (width/bufferLength), 0, 1, height);
                        }
                        break;
                    }
                    case 8: {
                        ctx.beginPath(); ctx.moveTo(0, height); let mWidth = width / bufferLength;
                        for (let i = 0; i < bufferLength; i++) ctx.lineTo(i * mWidth, height - (dataArray[i]/255)*height);
                        ctx.lineTo(width, height);
                        let grad = ctx.createLinearGradient(0, 0, 0, height);
                        grad.addColorStop(0, '#f43f5e'); grad.addColorStop(1, '#111827');
                        ctx.fillStyle = grad; ctx.fill();
                        break;
                    }
                    case 9: {
                        const bWidth = (width / bufferLength);
                        for (let i = 0; i < bufferLength; i++) {
                            const bHeight = (dataArray[i] / 255) * (height/2);
                            ctx.fillStyle = `hsl(${300 + (i/bufferLength)*60}, 100%, 50%)`;
                            ctx.fillRect(i * bWidth, height/2 - bHeight, bWidth - 1, bHeight);
                            ctx.fillRect(i * bWidth, height/2, bWidth - 1, bHeight);
                        }
                        break;
                    }
                }
            }
        };
        draw();
    },

    // ==================================================================
    // MINI PLAYER, MODAL, SKRÓTY
    // ==================================================================
    createMiniPlayer: () => {
    if(document.getElementById('grajek-mini-player')) return;
    const mini = document.createElement('div');
    mini.id = 'grajek-mini-player';
    mini.className = `hidden fixed bottom-12 right-12 z-[10000] g-panel px-4 py-3 rounded-full flex items-center gap-4 shadow-2xl cursor-move transition-transform hover:scale-105 ${grajekApp.currentTheme}`;
    mini.style.width = '320px';      // stała szerokość
    mini.style.minWidth = '320px';
    mini.innerHTML = `
        <div class="relative w-10 h-10 rounded-full overflow-hidden border border-gray-600 flex-shrink-0 bg-black" style="animation: spin 4s linear infinite;" id="grajek-mini-spin">
            <img id="grajek-mini-cover" src="${DEFAULT_COVER}" onerror="this.onerror=null; this.src='${FALLBACK_COVER}';" class="w-full h-full object-cover">
            <div class="absolute inset-0 m-auto w-3 h-3 bg-black rounded-full border border-gray-600"></div>
        </div>
        <div class="flex flex-col overflow-hidden pointer-events-none mx-2" style="max-width: 150px;">
            <span id="grajek-mini-title" class="text-sm font-bold g-accent truncate drop-shadow-md">Brak utworu</span>
            <span id="grajek-mini-artist" class="text-[10px] g-text-muted truncate">Wybierz utwór...</span>
        </div>
        <div class="flex items-center gap-3 flex-shrink-0">
            <button onclick="grajekApp.prev()" class="g-icon-btn text-lg hover:text-white transition">⏮</button>
            <button onclick="grajekApp.togglePlay()" id="grajek-mini-btn-play" class="g-play-btn text-2xl font-bold transition">▶</button>
            <button onclick="grajekApp.next()" class="g-icon-btn text-lg hover:text-white transition">⏭</button>
            <div class="w-px h-6 bg-gray-600/50 mx-1"></div>
            <button onclick="grajekApp.toggleMiniPlayer()" class="text-red-500 hover:text-red-400 text-sm font-bold transition" title="Powrót">✖</button>
        </div>
    `;
    // createMiniPlayer: () => {
    //     if(document.getElementById('grajek-mini-player')) return;
    //     const mini = document.createElement('div');
    //     mini.id = 'grajek-mini-player';
    //     mini.className = `hidden fixed bottom-12 right-12 z-[10000] g-panel px-4 py-3 rounded-full flex items-center gap-4 shadow-2xl cursor-move transition-transform hover:scale-105 ${grajekApp.currentTheme}`;
    //     mini.innerHTML = `
    //         <div class="relative w-10 h-10 rounded-full overflow-hidden border border-gray-600 flex-shrink-0 bg-black" style="animation: spin 4s linear infinite;" id="grajek-mini-spin">
    //             <img id="grajek-mini-cover" src="${DEFAULT_COVER}" onerror="this.src='${FALLBACK_COVER}';" class="w-full h-full object-cover">
    //             <div class="absolute inset-0 m-auto w-3 h-3 bg-black rounded-full border border-gray-600"></div>
    //         </div>
    //         <div class="flex flex-col flex-grow overflow-hidden pointer-events-none mx-2">
    //             <span id="grajek-mini-title" class="text-sm font-bold g-accent truncate drop-shadow-md">Brak utworu</span>
    //             <span id="grajek-mini-artist" class="text-[10px] g-text-muted truncate">Wybierz utwór...</span>
    //         </div>
    //         <div class="flex items-center gap-3 flex-shrink-0">
    //             <button onclick="grajekApp.prev()" class="g-icon-btn text-lg hover:text-white transition">⏮</button>
    //             <button onclick="grajekApp.togglePlay()" id="grajek-mini-btn-play" class="g-play-btn text-2xl font-bold transition">▶</button>
    //             <button onclick="grajekApp.next()" class="g-icon-btn text-lg hover:text-white transition">⏭</button>
    //             <div class="w-px h-6 bg-gray-600/50 mx-1"></div>
    //             <button onclick="grajekApp.toggleMiniPlayer()" class="text-red-500 hover:text-red-400 text-sm font-bold transition" title="Powrót">✖</button>
    //         </div>
    //     `;


        document.body.appendChild(mini);

        let isDragging = false, startX, startY, startLeft, startTop;
        const dragStart = (e) => {
            if(e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            isDragging = true;
            let clientX = e.clientX || (e.touches && e.touches[0].clientX);
            let clientY = e.clientY || (e.touches && e.touches[0].clientY);
            startX = clientX; startY = clientY;
            startLeft = mini.offsetLeft; startTop = mini.offsetTop;
            mini.style.transition = 'none'; 
            e.preventDefault();
        };
        const dragMove = (e) => {
            if(!isDragging) return;
            let clientX = e.clientX || (e.touches && e.touches[0].clientX);
            let clientY = e.clientY || (e.touches && e.touches[0].clientY);
            mini.style.left = (startLeft + clientX - startX) + 'px';
            mini.style.top = (startTop + clientY - startY) + 'px';
            mini.style.bottom = 'auto'; mini.style.right = 'auto';
        };
        const dragEnd = () => { if(isDragging) { isDragging = false; mini.style.transition = ''; } };

        mini.addEventListener('mousedown', dragStart); window.addEventListener('mousemove', dragMove); window.addEventListener('mouseup', dragEnd);
        mini.addEventListener('touchstart', dragStart, {passive: false}); window.addEventListener('touchmove', dragMove, {passive: false}); window.addEventListener('touchend', dragEnd);
    },

    toggleMiniPlayer: () => {
        grajekApp.isMiniPlayerActive = !grajekApp.isMiniPlayerActive;
        const mini = document.getElementById('grajek-mini-player');
        if (grajekApp.isMiniPlayerActive) {
            if(mini) mini.classList.remove('hidden');
            if(typeof winManager !== 'undefined') winManager.minimize('grajek');
        } else {
            if(mini) mini.classList.add('hidden');
            if(typeof winManager !== 'undefined') winManager.toggleMin('grajek');
        }
    },

    showCustomPrompt: (title, defaultValue, btnText, type, callback) => {
        const modalId = 'grajek-prompt-modal';
        document.getElementById(modalId)?.remove();
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = `grajek-modal-overlay fixed inset-0 z-[10001] bg-black/70 backdrop-blur-sm flex items-center justify-center ${grajekApp.currentTheme}`;
        modal.innerHTML = `
            <div class="grajek-modal-box g-panel p-6 rounded-2xl w-80 border g-border shadow-2xl bg-gray-900/90">
                <h3 class="font-bold mb-4 g-text text-center text-sm whitespace-pre-line">${title}</h3>
                <input type="${type}" id="grajek-prompt-input" value="${defaultValue}" class="w-full px-3 py-2 rounded-lg mb-6 outline-none text-center font-bold text-sm g-bg g-text border g-border">
                <div class="flex gap-3">
                    <button class="flex-1 g-btn py-2 rounded-lg text-xs font-bold" onclick="document.getElementById('${modalId}').remove()">Anuluj</button>
                    <button id="grajek-prompt-ok" class="flex-1 py-2 rounded-lg text-xs font-bold text-black" style="background: var(--grajek-primary);">${btnText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('grajek-prompt-ok').onclick = () => {
            const val = document.getElementById('grajek-prompt-input').value;
            document.getElementById(modalId).remove();
            callback(val);
        };
        const input = document.getElementById('grajek-prompt-input');
        input.focus(); input.select();
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('grajek-prompt-ok').click(); });
    },

    setSleepTimer: () => {
        grajekApp.showCustomPrompt("⏰ Sleep Timer\nWyłącz za ile minut?", "15", "Ustaw", "number", (val) => {
            const m = parseInt(val);
            if(m > 0) {
                if(grajekApp.sleepTimerId) clearTimeout(grajekApp.sleepTimerId);
                grajekApp.sleepTimerId = setTimeout(() => {
                    if(grajekApp.isPlaying) grajekApp.togglePlay();
                    grajekApp.showToast('Sleep Timer', 'Odtwarzanie wstrzymane.', 'info');
                }, m * 60000);
            }
        });
    },

    saveData: () => {
        const queueToSave = grajekApp.queue.map(({ _fileRef, file, ...rest }) => rest);
        localStorage.setItem('bigos_grajek_queue', JSON.stringify(queueToSave));
        localStorage.setItem('bigos_grajek_favs', JSON.stringify(grajekApp.favorites));
        localStorage.setItem('bigos_grajek_playlists', JSON.stringify(grajekApp.playlists));
        localStorage.setItem('bigos_grajek_eq', JSON.stringify(grajekApp.eqSettings));
    },

    switchTab: (tabName) => {
        document.querySelectorAll('#grajek-pro-ui .tab-content').forEach(tab => tab.classList.add('hidden'));
        document.querySelectorAll('#grajek-pro-ui .g-tab').forEach(btn => btn.classList.remove('active'));
        const targetTab = document.getElementById('grajek-tab-' + tabName);
        if (targetTab) targetTab.classList.remove('hidden');
        const targetBtn = document.getElementById('tab-btn-' + tabName);
        if (targetBtn) targetBtn.classList.add('active');
        if (tabName === 'library') grajekApp.renderLibrary();
        if (tabName === 'playlists') { grajekApp.renderPlaylists(); grajekApp.activePlaylistId = null; grajekApp.renderPlaylistTracks(); }
        if (tabName === 'viz' && grajekApp.isPlaying) grajekApp.drawVisualizer();
    },

    handleShortcuts: (e) => {
        const appWin = document.getElementById('app-grajek');
        if (appWin && appWin.classList.contains('active') && !appWin.classList.contains('minimized')) {
            if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
            switch(e.code) {
                case 'Space': e.preventDefault(); grajekApp.togglePlay(); break;
                case 'ArrowRight': e.preventDefault(); grajekApp.seekRelative(5); break;
                case 'ArrowLeft': e.preventDefault(); grajekApp.seekRelative(-5); break;
                case 'ArrowUp': e.preventDefault(); grajekApp.setVolume(Math.min(100, (grajekApp.grajekAudio.volume*100)+10)); document.getElementById('grajek-volume').value = grajekApp.grajekAudio.volume*100; break;
                case 'ArrowDown': e.preventDefault(); grajekApp.setVolume(Math.max(0, (grajekApp.grajekAudio.volume*100)-10)); document.getElementById('grajek-volume').value = grajekApp.grajekAudio.volume*100; break;
                case 'KeyN': e.preventDefault(); grajekApp.next(true); break;
                case 'KeyP': e.preventDefault(); grajekApp.prev(); break;
                case 'KeyM': e.preventDefault(); grajekApp.toggleMute(); break;
            }
        }
    }
};

// Rejestracja w systemie
setTimeout(() => {
    if (typeof apps !== 'undefined') {
        apps.loadGrajkoteka = grajekApp.init;
        apps.grajekPlay = grajekApp.togglePlay;
        apps.grajekNext = grajekApp.next;
        apps.grajekPrev = grajekApp.prev;
        apps.grajekLoadPC = () => document.getElementById('grajek-file-input')?.click();
        apps.grajekStop = () => grajekApp.closeApp();
    }
    grajekApp.init();
}, 500);