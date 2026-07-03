// ======================================================================
// PLIK: js/aplikacje/powitanie.js (Ekran Powitalny BigOS)
// ======================================================================

const powitanieApp = {
    init: () => {
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
            }, 600); // Odczekaj chwilę po wczytaniu pulpitu
        }
    },

    toggleSkip: () => {
        // Ignorujemy przekazywane "this" z HTML-a i twardo szukamy checkboxa po ID!
        const checkbox = document.getElementById('powitanie-skip-cb');
        
        if (checkbox && checkbox.checked) {
            localStorage.setItem('bigos_skip_welcome', 'true');
            if (typeof apps !== 'undefined') apps.showToast('Ustawienia Zapisane', 'Ekran powitalny wyłączony.', 'success');
        } else {
            localStorage.setItem('bigos_skip_welcome', 'false');
            if (typeof apps !== 'undefined') apps.showToast('Ustawienia Zapisane', 'Ekran powitalny będzie znów widoczny.', 'info');
        }
    },

    openTab: (tabId) => {
        // Ukryj wszystkie zakładki
        document.querySelectorAll('.powitanie-tab').forEach(t => t.classList.add('hidden'));
        
        // Pokaż aktywną
        const activeTab = document.getElementById('powitanie-tab-' + tabId);
        if (activeTab) activeTab.classList.remove('hidden');

        // Zresetuj style wszystkich przycisków nawigacji
        document.querySelectorAll('.powitanie-nav').forEach(n => {
            n.classList.remove('bg-blue-100', 'dark:bg-blue-900/50', 'font-bold', 'border-l-4', 'border-blue-500', 'text-blue-700', 'dark:text-blue-300');
        });
        
        // Podświetl aktywny przycisk
        const activeNav = document.getElementById('powitanie-nav-' + tabId);
        if(activeNav) {
            activeNav.classList.add('bg-blue-100', 'dark:bg-blue-900/50', 'font-bold', 'border-l-4', 'border-blue-500', 'text-blue-700', 'dark:text-blue-300');
        }
    }
};