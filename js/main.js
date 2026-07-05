// Główny rozruch systemu BigOS

// Ta funkcja uruchamia się automatycznie po wczytaniu całego pliku HTML
window.onload = () => {
    
    // 1. Uruchomienie systemowego zegara (odświeżanie co 1 sekundę)
    setInterval(() => {
        const now = new Date();
        const clockEl = document.getElementById('taskbar-clock');
        if (clockEl) {
            clockEl.innerText = now.toLocaleTimeString('pl-PL', {hour: '2-digit', minute:'2-digit'});
        }

        const calBigTime = document.getElementById('cal-big-time');
        if (calBigTime && !document.getElementById('calendar-widget').classList.contains('hidden-cal')) {
            calBigTime.innerText = now.toLocaleTimeString('pl-PL');
            document.getElementById('cal-big-date').innerText = now.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
    }, 1000);
    
    // 2. Ładowanie i ustawianie motywu (Ciemny / Jasny)
    if (typeof apps !== 'undefined' && apps.setTheme) {
        const savedTheme = localStorage.getItem('bigos_theme');
        if (savedTheme) {
            apps.setTheme(savedTheme);
        } else {
            apps.setTheme('dark');
        }
    }
    
    // 3. Rozruch najważniejszych modułów systemowych
    if (typeof fsManager !== 'undefined') fsManager.init();  // Ładuje pliki i tapety
    if (typeof auth !== 'undefined') auth.check();           // Odpala ekran logowania
    
    // 4. Rozruch pomniejszych funkcji i aplikacji
    if (typeof apps !== 'undefined') {
        if (apps.loadStickyNotes) apps.loadStickyNotes();
        if (apps.generateCalendar) apps.generateCalendar();
        if (apps.loadGrajkoteka) apps.loadGrajkoteka();
        if (apps.renderWallpaperGallery) apps.renderWallpaperGallery();
    }
};