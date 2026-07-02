const auth = {
    // Funkcja sprawdzająca czy hasło jest już ustawione
    check: () => {
        const pass = localStorage.getItem('bigos_password');
        if(!pass) {
            document.getElementById('login-msg').innerText = "Witaj! Ustaw nowe hasło startowe.";
            document.querySelector('#login-screen button').innerText = "Ustaw i Wejdź";
        }
    },
    
    // GŁÓWNA FUNKCJA LOGOWANIA (Tą, o którą pytasz)
    handleLogin: () => {
        const input = document.getElementById('password-input').value;
        const pass = localStorage.getItem('bigos_password');
        
        if(!input) return apps.showToast('Błąd', 'Podaj hasło', 'error');
        
        // Logika weryfikacji hasła
        if(!pass || input === pass) {
            if(!pass) localStorage.setItem('bigos_password', input);
            document.getElementById('login-screen').style.opacity = '0';
            document.getElementById('password-input').value = '';
            
            // Ukrywa ekran logowania
            setTimeout(() => document.getElementById('login-screen').style.display = 'none', 300);
            apps.showToast('Witaj', 'Zalogowano do BigOS', 'success');
        } else { 
            apps.showToast('Błąd', 'Nieprawidłowe hasło!', 'error'); 
        }
    },
    
    // Resetowanie hasła
    resetPassword: () => { 
        localStorage.removeItem('bigos_password'); 
        location.reload(); 
    }
};