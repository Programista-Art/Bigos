// ======================================================================
// PLIK: js/auth.js (System Logowania)
// ======================================================================

const auth = {
    // Funkcja sprawdzająca czy hasło jest już ustawione
    check: () => {
        const pass = localStorage.getItem('bigos_password');
        if(!pass) {
            document.getElementById('login-msg').innerText = "Witaj! Ustaw nowe hasło startowe.";
        }
    },
    
    // GŁÓWNA FUNKCJA LOGOWANIA
    handleLogin: () => {
        const inputEl = document.getElementById('password-input');
        const input = inputEl.value;
        const pass = localStorage.getItem('bigos_password');
        
        if(!input) return apps.showToast('Błąd', 'Podaj hasło', 'error');
        
        // Logika weryfikacji hasła
        if(!pass || input === pass) {
            if(!pass) localStorage.setItem('bigos_password', input);
            document.getElementById('login-screen').style.opacity = '0';
            inputEl.value = '';
            
            // Ukrywa ekran logowania po zniknięciu (płynny fade-out)
            setTimeout(() => { 
                document.getElementById('login-screen').style.display = 'none';
                
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
            
            apps.showToast('Witaj', 'Zalogowano do BigOS', 'success');
        } else { 
            // Efekt wstrząsu/błędu dla nowego pola hasła
            inputEl.value = '';
            inputEl.classList.add('border-red-500', 'bg-red-500/20');
            setTimeout(() => inputEl.classList.remove('border-red-500', 'bg-red-500/20'), 400);
            apps.showToast('Błąd', 'Nieprawidłowe hasło!', 'error'); 
        }
    },
    
    // Resetowanie hasła (i całego systemu)
    resetPassword: () => { 
        if(confirm("Czy na pewno chcesz przywrócić system do ustawień fabrycznych? Utracisz wszystkie dane!")) {
            localStorage.clear(); 
            location.reload(); 
        }
    }
};