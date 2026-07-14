// ======================================================================
// PLIK: js/globals.js (Zmienne Globalne i Główny Rozruch Systemu BigOS)
// ======================================================================

// --- 1. GLOBALNE ZMIENNE SYSTEMOWE (NIE USUWAĆ!) ---
const GRID = 90;
let highestZ = 100;
let fileSystem = []; 
let openAppsList = new Set();
let clipboard = { action: null, item: null };
let currentTheme = 'dark'; 

// --- 2. BAZA DOMYŚLNYCH APLIKACJI ---
const defaultApps = [
    { id: 'app_podpowiadacz', type: 'app', name: 'BIG AI', icon: '🤖', appId: 'biai' },
    { id: 'app_skryba', type: 'app', name: 'Skryba', icon: '📝', appId: 'skryba' },
    { id: 'app_szkicownik', type: 'app', name: 'Artysta', icon: '🎨', appId: 'artystaApp' },
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
    // { id: 'app-bigcut', type: 'app', name: 'BigCut', icon: '🎬', appId: 'bigcut' },
    { id: 'app-bigcut', type: 'app', name: 'BigCut', icon: '🎬', appId: 'bigcut', action: () => { BigCut.init(); winManager.open('app-bigcut'); } },
    { id: 'hasiok', type: 'folder', name: 'Hasiok', icon: '🗑️' }
];

// --- 3. SYSTEM ŚLEDZENIA KLAWISZY (DLA GIER) ---
const GLOBAL_KEYS = {};
window.addEventListener('keydown', e => GLOBAL_KEYS[e.code] = true);
window.addEventListener('keyup', e => GLOBAL_KEYS[e.code] = false);

// --- 4. FUNKCJA OBLICZAJĄCA POZYCJĘ MYSZKI / DOTYKU ---
function getEventPos(e) {
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    else if (e.changedTouches && e.changedTouches.length > 0) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
}

// --- 5. GŁÓWNY ROZRUCH SYSTEMU (ONLOAD) ---
window.onload = () => {
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
    
    // B) Rozruch najważniejszych modułów
    if (typeof fsManager !== 'undefined') fsManager.init();  // Inicjuje bazę plików IndexedDB
    if (typeof auth !== 'undefined') auth.check();           // Odpala sprawdzanie hasła
    
    // C) Rozruch pomocniczy
    if (typeof apps !== 'undefined') {
        if (apps.loadStickyNotes) apps.loadStickyNotes();
        if (apps.generateCalendar) apps.generateCalendar();
    }
};