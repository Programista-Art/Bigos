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
                        if (powitanieApp.onLogin) powitanieApp.onLogin();
                        else powitanieApp.init({ auto: true });
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
    
    // Ekran blokady oferuje trzy wyraźne operacje:
    //  - formatSystem  → kasuje WSZYSTKIE dane BigOS
    //  - resetSettings → tylko ustawienia
    //  - resetPassword → tylko hasło
    resetPassword: () => {
        // Historyczna nazwa (login screen button) uruchamia pełny format
        // z dokładnym opisem w oknie potwierdzenia.
        if (typeof bigosMaintenance !== 'undefined') {
            return bigosMaintenance.formatSystem({ confirm: true });
        }
        if (typeof apps !== 'undefined' && typeof apps.formatSystem === 'function') {
            return apps.formatSystem();
        }
        if (confirm("Czy na pewno chcesz sformatować BigOS? Utracisz wszystkie dane BigOS (pliki, ustawienia, hasło).")) {
            (async () => {
                try {
                    for (let i = localStorage.length - 1; i >= 0; i--) {
                        const k = localStorage.key(i);
                        if (k && k.startsWith('bigos_')) localStorage.removeItem(k);
                    }
                    if (typeof indexedDB !== 'undefined') {
                        await new Promise((r) => {
                            const req = indexedDB.deleteDatabase('BigOS_DB');
                            req.onsuccess = r; req.onerror = r; req.onblocked = () => setTimeout(r, 400);
                        });
                    }
                } catch (e) { console.error(e); }
                location.reload();
            })();
        }
    },

    resetPasswordOnly: async () => {
        if (typeof bigosMaintenance !== 'undefined') {
            return bigosMaintenance.resetPassword({ confirm: true });
        }
        if (confirm('Usunąć tylko hasło? Pliki i ustawienia pozostaną.')) {
            try { if (typeof bigosDB !== 'undefined') await bigosDB.delete('bigos_password'); } catch (e) { /* noop */ }
            localStorage.removeItem('bigos_password');
            return { ok: true };
        }
        return { ok: false, cancelled: true };
    },

    resetSettings: async () => {
        if (typeof bigosMaintenance !== 'undefined') {
            return bigosMaintenance.resetSettings({ confirm: true });
        }
        return { ok: false, error: 'maintenance module missing' };
    }
};
// Explicit export — top-level const does NOT become a window property.
window.auth = auth;
if (typeof globalThis !== 'undefined') globalThis.auth = auth;
