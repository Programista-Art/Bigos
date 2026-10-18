// ======================================================================
// PLIK: js/globals.js (Zmienne Globalne i Główny Rozruch Systemu BigOS)
// ======================================================================

// --- 1. GLOBALNE ZMIENNE SYSTEMOWE (NIE USUWAĆ!) ---
// Shared state lives in js/core/state.js. Top-level let/const do NOT become
// window properties — use var / explicit window assigns so every module
// (including IIFEs reading window.*) sees the same values.
var GRID = 90;
window.GRID = GRID;

// window.fileSystem is a single shared array defined in js/core/state.js.
// `var fileSystem` aliases it; reassignment `fileSystem = x` goes through the
// state.js setter which replaces contents in place.
var fileSystem = window.fileSystem;
var openAppsList = window.openAppsList;
var clipboard = window.clipboard;

// Theme / z-order: plain vars that become window properties automatically.
// bigosState reads these via window — no separate copy that can diverge.
var currentTheme = 'dark';
var highestZ = 100;

// --- 2. BAZA DOMYŚLNYCH APLIKACJI ---
var defaultApps = [
    { id: 'app_podpowiadacz', type: 'app', name: 'BIG AI', icon: '🤖', appId: 'podpowiadacz' },
    { id: 'app_skryba', type: 'app', name: 'Skryba', icon: '📝', appId: 'skryba' },
    { id: 'app-szkicownik', type: 'app', name: 'Artysta', icon: '🎨', appId: 'szkicownik' },
    { id: 'app_aktowka', type: 'app', name: 'Aktówka', icon: '📁', appId: 'aktowka' },
    { id: 'app_patrzalka', type: 'app', name: 'Patrzałka', icon: '🖼️', appId: 'patrzalka' },
    { id: 'app_grajacz', type: 'app', name: 'Grajacz Filmów', icon: '🎬', appId: 'grajacz' },
    { id: 'app_siecioslaw', type: 'app', name: 'Sieciosław', icon: '🌐', appId: 'siecioslaw' },
    { id: 'app_wladca', type: 'app', name: 'Władca Poleceń', icon: '💻', appId: 'wladca' },
    { id: 'app_kalkulator', type: 'app', name: 'Rachmistrz', icon: '🧮', appId: 'kalkulator' },
    { id: 'app_tapeciak', type: 'app', name: 'Kombinator', icon: '⚙️', appId: 'tapeciak' },
    { id: 'app_grajek', type: 'app', name: 'Grajek', icon: '🎵', appId: 'grajek' },
    { id: 'app_nadzorca', type: 'app', name: 'Nadzorca', icon: '📊', appId: 'nadzorca' },
    { id: 'app_pogodynka', type: 'app', name: 'Pogodynka', icon: '🌤️', appId: 'pogodynka' },
    { id: 'app_czasomierz', type: 'app', name: 'Czasomierz', icon: '⏱️', appId: 'czasomierz' },
    { id: 'app_pelzacz', type: 'app', name: 'Pełzacz', icon: '🐍', appId: 'pelzacz' },
    { id: 'app_tank', type: 'app', name: 'Czołgi', icon: '🚜', appId: 'tank' },
    { id: 'app_murarz', type: 'app', name: 'Murarz', icon: '🧱', appId: 'murarz' },
    { id: 'app_ufoludki', type: 'app', name: 'Ufoludki', icon: '👾', appId: 'ufoludki' },
    { id: 'app_odbijanka', type: 'app', name: 'Odbijanka', icon: '🏓', appId: 'odbijanka' },
    { id: 'app_trzepotek', type: 'app', name: 'Trzepotek', icon: '🐦', appId: 'trzepotek' },
    { id: 'app_scigacz', type: 'app', name: 'Ścigacz', icon: '🏎️', appId: 'scigacz' },
    { id: 'app_bombiarz', type: 'app', name: 'Bombiarz', icon: '💣', appId: 'bombiarz' },
    { id: 'app_kolko', type: 'app', name: 'Kółko i Krzyżyk', icon: '🎮', appId: 'kolko' },
    { id: 'app_powitanie', type: 'app', name: 'Powitanie', icon: '👋', appId: 'powitanie' },
    { id: 'app_tabelarz', type: 'app', name: 'Tabelarz', icon: '📈', appId: 'tabelarz' },
    { id: 'app_zadaniowiec', type: 'app', name: 'Zadaniowiec', icon: '📋', appId: 'zadaniowiec' },
    { id: 'app_wasm', type: 'app', name: 'WASM Engine', icon: '👾', appId: 'wasm' },
    { id: 'app-rachmistrz-kodu', type: 'app', name: 'Rachmistrz Kodu', icon: '👨‍💻', appId: 'rachmistrz-kodu' },
    { id: 'app-kasiarz', type: 'app', name: 'Kasiarz', icon: '💰', appId: 'kasiarz' },
    { id: 'app_przelicznik', type: 'app', name: 'Przelicznik', icon: '🔄', appId: 'przelicznik' },
    { id: 'app_kompresor', type: 'app', name: 'Upychacz ZIP', icon: '🗜️', appId: 'kompresor' },
    { id: 'app_montazysta', type: 'app', name: 'Montażysta', icon: '🎬', appId: 'montazysta' },
    { id: 'app_menadzer', type: 'app', name: 'Menedżer Aplikacji', icon: '⚙️', appId: 'menadzer' },
    { id: 'hasiok', type: 'folder', name: 'Hasiok', icon: '🗑️' }
];
// Publish for IIFEs and other modules that read window.defaultApps.
window.defaultApps = defaultApps;
if (window.bigosState) window.bigosState.defaultApps = defaultApps;

// Register built-in applications in the central lifecycle registry.
if (typeof bigosAppRegistry !== 'undefined') {
    defaultApps.forEach(function (app) {
        if (!app.appId) return;
        var id = app.appId;
        if (!bigosAppRegistry.get(id)) {
            bigosAppRegistry.register({
                id: id,
                name: app.name,
                icon: app.icon || '📦',
                backgroundable: id === 'grajek',
                category: app.type === 'game' ? 'Gry' : 'Narzędzia'
            });
        }
    });
}

// --- 3. SYSTEM ŚLEDZENIA KLAWISZY (DLA GIER) ---
var GLOBAL_KEYS = {};
window.GLOBAL_KEYS = GLOBAL_KEYS;
window.addEventListener('keydown', e => GLOBAL_KEYS[e.code] = true);
window.addEventListener('keyup', e => GLOBAL_KEYS[e.code] = false);

// --- 4. FUNKCJA OBLICZAJĄCA POZYCJĘ MYSZKI / DOTYKU ---
function getEventPos(e) {
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    else if (e.changedTouches && e.changedTouches.length > 0) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
}

// --- 5. GŁÓWNY ROZRUCH SYSTEMU (ONLOAD) ---
window.onload = async () => {
    if (typeof bigosDiag !== 'undefined') bigosDiag.log('startup', 'BigOS boot sequence started');

    // A) Uruchomienie systemowego zegara
    setInterval(() => {
        const now = new Date();
        const clockEl = document.getElementById('taskbar-clock');
        if (clockEl) {
            clockEl.innerText = now.toLocaleTimeString('pl-PL', {hour: '2-digit', minute:'2-digit'});
        }

        // Odświeżanie dużego zegara w widgecie kalendarza
        const calBigTime = document.getElementById('cal-big-time');
        const calWidget = document.getElementById('calendar-widget');
        if (calBigTime && calWidget && !calWidget.classList.contains('hidden-cal')) {
            calBigTime.innerText = now.toLocaleTimeString('pl-PL');
            document.getElementById('cal-big-date').innerText = now.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
    }, 1000);

    // B) Rozruch najważniejszych modułów — jawnie asynchronicznie (readiness gates)
    try {
        if (typeof fsManager !== 'undefined') {
            await fsManager.init();  // Inicjuje bazę plików IndexedDB
            if (typeof bigosAppRegistry !== 'undefined') bigosAppRegistry.readiness.markReady('filesystem', true);
        }
    } catch (e) {
        if (typeof bigosDiag !== 'undefined') bigosDiag.error('startup', 'fsManager.init failed', { error: e.message });
        if (typeof bigosAppRegistry !== 'undefined') bigosAppRegistry.readiness.markFailed('filesystem', e);
    }

    try {
        if (typeof auth !== 'undefined') await auth.check();
        if (typeof bigosAppRegistry !== 'undefined') bigosAppRegistry.readiness.markReady('auth', true);
    } catch (e) {
        if (typeof bigosDiag !== 'undefined') bigosDiag.error('startup', 'auth.check failed', { error: e.message });
    }

    try {
        if (typeof bigosAppRegistry !== 'undefined') bigosAppRegistry.readiness.markReady('storage', true);
        if (typeof bigosDB !== 'undefined' && bigosDB.ensureMigrated) await bigosDB.ensureMigrated();
    } catch (e) {
        if (typeof bigosDiag !== 'undefined') bigosDiag.warn('startup', 'storage migrate skipped', { error: e.message });
    }

    // C) Rozruch pomocniczy (dopiero po storage/auth)
    try {
        await Promise.all([
            bigosAppRegistry && bigosAppRegistry.readiness ? bigosAppRegistry.readiness.whenReady('filesystem') : Promise.resolve(),
            bigosAppRegistry && bigosAppRegistry.readiness ? bigosAppRegistry.readiness.whenReady('auth') : Promise.resolve()
        ]);
    } catch (_) { /* continue anyway */ }

    if (typeof apps !== 'undefined') {
        if (apps.loadStickyNotes) apps.loadStickyNotes();
        if (apps.generateCalendar) apps.generateCalendar();
    }

    // D) Bundled applications auto-install from Programy catalog + Autoload packages
    try {
        if (typeof bundledCatalog !== 'undefined' && bundledCatalog.installAllIfMissing) {
            await bundledCatalog.installAllIfMissing();
        }
    } catch (e) {
        if (typeof bigosDiag !== 'undefined') bigosDiag.warn('startup', 'Bundled catalog auto-install error', { error: e.message });
    }

    try {
        if (typeof bigosDB !== 'undefined' && bigosDB.listPackages) {
            const pkgs = await bigosDB.listPackages();
            if (Array.isArray(pkgs)) {
                for (const p of pkgs) {
                    if (!p || !p.id) continue;
                    if (!defaultApps.some(a => a.appId === p.id)) {
                        defaultApps.push({
                            id: 'app_' + p.id,
                            type: 'app',
                            name: p.name,
                            icon: p.icon || '📦',
                            appId: p.id
                        });
                    }
                    if (typeof bigosAppRegistry !== 'undefined' && !bigosAppRegistry.get(p.id)) {
                        bigosAppRegistry.register({
                            id: p.id,
                            name: p.name,
                            icon: p.icon || '📦',
                            category: 'Narzędzia',
                            launch: () => (typeof bigosSandbox !== 'undefined' ? bigosSandbox.launchPackage(p.id) : null)
                        });
                    }
                }
                if (typeof desktop !== 'undefined' && desktop.render) desktop.render();
            }
        }
    } catch (e) {
        if (typeof bigosDiag !== 'undefined') bigosDiag.warn('startup', 'Autoload packages error', { error: e.message });
    }

    // E) Rejestracja Service Workera (PWA / offline) — po udanym starcie.
    if ('serviceWorker' in navigator) {
        let refreshing = false;
        const hadController = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!hadController) return; // Pierwsza instalacja SW — nie przeładowuj gwałtownie trwającej sesji
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });

        function showUpdateBanner(worker) {
            if (typeof document === 'undefined' || document.getElementById('sw-update-banner')) return;
            const banner = document.createElement('div');
            banner.id = 'sw-update-banner';
            banner.className = 'fixed bottom-14 right-4 z-[10002] bg-blue-600 text-white text-sm p-4 rounded-xl shadow-2xl flex items-center gap-3 border border-blue-400';
            banner.innerHTML = `
                <span>🎉 Dostępna jest nowa wersja BigOS!</span>
                <button id="sw-update-btn" class="px-3 py-1.5 bg-white text-blue-700 font-bold rounded-lg hover:bg-blue-50 text-xs shadow">Aktualizuj teraz</button>
                <button id="sw-update-close" class="text-white/80 hover:text-white text-xs ml-1">✕</button>
            `;
            document.body.appendChild(banner);
            const btn = document.getElementById('sw-update-btn');
            if (btn) btn.onclick = () => {
                if (worker) worker.postMessage({ type: 'SKIP_WAITING' });
                banner.remove();
            };
            const closeBtn = document.getElementById('sw-update-close');
            if (closeBtn) closeBtn.onclick = () => banner.remove();
        }

        navigator.serviceWorker.register('sw.js').then((reg) => {
            if (typeof bigosDiag !== 'undefined') bigosDiag.log('startup', 'Service Worker registered', { scope: reg.scope });
            if (reg.waiting) {
                showUpdateBanner(reg.waiting);
            }
            reg.addEventListener('updatefound', () => {
                const nw = reg.installing;
                if (!nw) return;
                nw.addEventListener('statechange', () => {
                    if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateBanner(reg.waiting || nw);
                        if (typeof bigosDiag !== 'undefined') bigosDiag.log('startup', 'SW update available');
                    }
                });
            });
        }).catch((e) => {
            if (typeof bigosDiag !== 'undefined') bigosDiag.warn('startup', 'SW registration failed', { error: e.message });
        });
    }

    // E) Żądanie trwałego magazynowania (StorageManager.persist) + komunikat UI.
    if (typeof bigosMaintenance !== 'undefined' && bigosMaintenance.requestPersistentStorage) {
        bigosMaintenance.requestPersistentStorage().then((info) => {
            if (typeof bigosDiag !== 'undefined') bigosDiag.log('startup', 'Persistent storage', info);
            window.bigosPersistentStorage = info;
        });
    }

    // F) Unified search shortcut button already handled in window.js (Ctrl+K).
    if (typeof bigosDiag !== 'undefined') bigosDiag.log('startup', 'BigOS boot sequence finished');
};