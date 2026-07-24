// ======================================================================
// PLIK: js/auth.js (System Logowania)
// ======================================================================

const auth = {
    // Funkcja sprawdzająca czy hasło jest już ustawione (Z użyciem IndexedDB)
    check: async () => {
        try {
            const pass = await bigosDB.get('bigos_password');
            if(!pass) {
                const msgEl = document.getElementById('login-msg');
                if(msgEl) msgEl.innerText = "Witaj! Ustaw nowe hasło startowe.";
            }
        } catch(e) {
            console.error("Błąd odczytu hasła z bazy danych:", e);
        }
    },
    
    // GŁÓWNA FUNKCJA LOGOWANIA (Asynchroniczna)
    handleLogin: async () => {
        const inputEl = document.getElementById('password-input');
        const input = inputEl.value;
        
        if(!input) {
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Podaj hasło', 'error');
            return;
        }
        
        try {
            const pass = await bigosDB.get('bigos_password');
            
            // Logika weryfikacji hasła
            if(!pass || input === pass) {
                if(!pass) await bigosDB.set('bigos_password', input);
                
                const loginScreen = document.getElementById('login-screen');
                if(loginScreen) loginScreen.style.opacity = '0';
                inputEl.value = '';
                
                // Ukrywa ekran logowania po zniknięciu (płynny fade-out)
                setTimeout(() => { 
                    if(loginScreen) loginScreen.style.display = 'none';
                    
                    // Wywołujemy ekran powitalny
                    if(typeof powitanieApp !== 'undefined') {
                        powitanieApp.init();
                    } else {
                        if(typeof winManager !== 'undefined') {
                            const skipWelcome = localStorage.getItem('bigos_skip_welcome');
                            if(skipWelcome !== 'true') winManager.open('powitanie');
                        }
                    }
                }, 500);
                
                if(typeof apps !== 'undefined') apps.showToast('Witaj', 'Zalogowano do BigOS', 'success');
            } else { 
                // Efekt wstrząsu/błędu dla nowego pola hasła
                inputEl.value = '';
                inputEl.classList.add('border-red-500', 'bg-red-500/20');
                setTimeout(() => inputEl.classList.remove('border-red-500', 'bg-red-500/20'), 400);
                if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Nieprawidłowe hasło!', 'error'); 
            }
        } catch(e) {
            console.error("Błąd logowania:", e);
        }
    },
    
    // Resetowanie hasła (Używa zaawansowanego formatera z jądra, który usuwa też IndexedDB)
    resetPassword: () => { 
        if(typeof apps !== 'undefined' && typeof apps.formatSystem === 'function') {
            apps.formatSystem();
        } else if(confirm("Czy na pewno chcesz przywrócić system do ustawień fabrycznych? Utracisz wszystkie dane!")) {
            localStorage.clear(); 
            if(typeof indexedDB !== 'undefined') indexedDB.deleteDatabase('BigOS_DB');
            location.reload(); 
        }
    }
};