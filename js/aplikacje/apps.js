// ======================================================================
// PLIK: js/aplikacje/apps.js (Jądro Systemu - Zasilanie, Menu, Toasty)
// ======================================================================

const apps = {
    // ==================================================================
    // 1. KOMUNIKATY I SYSTEMOWE GUI
    // ==================================================================
    showToast: (t, m, type = 'info') => { 
        const c = document.getElementById('toast-container'); 
        if(!c) return;
        const el = document.createElement('div'); 
        const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600' }; 
        
        el.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-xl transform transition-all translate-y-10 opacity-0 pointer-events-auto border border-white/20 z-[9999]`; 
        el.innerHTML = `<strong>${t}</strong><br><span class="text-sm">${m}</span>`; 
        c.appendChild(el); 
        
        requestAnimationFrame(() => el.classList.remove('translate-y-10', 'opacity-0')); 
        
        setTimeout(() => { 
            el.classList.add('opacity-0'); 
            setTimeout(() => el.remove(), 300); 
        }, 3000); 
    },

    toggleStartMenu: () => { 
        const sm = document.getElementById('start-menu');
        if (!sm) return;

        sm.classList.toggle('hidden'); 
        sm.classList.toggle('flex'); 
        const calWidget = document.getElementById('calendar-widget');
        if(calWidget) calWidget.classList.add('hidden-cal'); 

        if (!document.getElementById('start-btn-format')) {
            const formatBtn = document.createElement('div');
            formatBtn.id = 'start-btn-format';
            formatBtn.className = 'w-full flex items-center gap-3 px-4 py-2 hover:bg-white/10 transition cursor-pointer text-red-400 hover:text-red-300 mt-1 border-t border-gray-700/50 pt-3';
            formatBtn.onclick = () => { 
                apps.toggleStartMenu(); 
                apps.formatSystem(); 
            };
            formatBtn.innerHTML = `
                <span style="width: 20px; text-align: center;">⚠️</span>
                <span class="text-sm font-medium">Formatuj</span>
            `;
            sm.appendChild(formatBtn);
        }
    },

    // ==================================================================
    // 2. ZARZĄDZANIE ZASILANIEM I SYSTEMEM
    // ==================================================================
    formatSystem: () => { 
        let modal = document.getElementById('format-confirm-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'format-confirm-modal';
            modal.className = 'fixed inset-0 bg-black/70 z-[10000] flex items-center justify-center backdrop-blur-sm transition-all duration-200 opacity-0 pointer-events-none';
            modal.innerHTML = `
                <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-md w-[90%] border border-red-500/30 transform scale-95 transition-transform duration-200" id="format-modal-box">
                    <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">⚠️</div>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">Formatowanie Systemu</h2>
                    <p class="text-gray-600 dark:text-gray-400 text-sm mb-6 text-center">Czy na pewno chcesz sformatować system BigOS?<br><br>Wszystkie Twoje pliki, mapy, tapety i ustawienia zostaną <b class="text-red-500">bezpowrotnie usunięte</b>!</p>
                    <div class="flex gap-3 justify-center">
                        <button id="format-btn-cancel" class="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-xl font-medium transition cursor-pointer flex-1 border border-transparent dark:border-gray-600">Anuluj</button>
                        <button id="format-btn-confirm" class="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium shadow-lg shadow-red-600/30 transition cursor-pointer flex-1">Formatuj</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('format-btn-cancel').onclick = () => {
                modal.classList.remove('opacity-100', 'pointer-events-auto');
                modal.classList.add('opacity-0', 'pointer-events-none');
                document.getElementById('format-modal-box').classList.remove('scale-100');
                document.getElementById('format-modal-box').classList.add('scale-95');
                setTimeout(() => modal.style.display = 'none', 200);
            };

            document.getElementById('format-btn-confirm').onclick = () => {
                localStorage.clear();
                location.reload();
            };
        }

        modal.style.display = 'flex';
        void modal.offsetWidth; 
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.classList.add('opacity-100', 'pointer-events-auto');
        document.getElementById('format-modal-box').classList.remove('scale-95');
        document.getElementById('format-modal-box').classList.add('scale-100');
    },

    lockSystem: () => { 
        document.getElementById('start-menu').classList.add('hidden'); 
        document.getElementById('login-screen').style.display = 'flex'; 
        document.getElementById('login-screen').style.opacity = '1'; 
        document.getElementById('password-input').value = ''; 
        document.getElementById('login-msg').innerText = "System Zablokowany. Podaj hasło."; 
    },

    sleepSystem: () => { 
        document.getElementById('start-menu').classList.add('hidden'); 
        const screen = document.getElementById('sleep-screen'); 
        screen.classList.remove('hidden'); 
        
        const wake = () => { 
            screen.classList.add('hidden'); 
            document.removeEventListener('mousemove', wake); 
            document.removeEventListener('keydown', wake); 
            document.removeEventListener('touchstart', wake); 
        }; 
        
        setTimeout(() => { 
            document.addEventListener('mousemove', wake); 
            document.addEventListener('keydown', wake); 
            document.addEventListener('touchstart', wake); 
        }, 1000); 
    },

    shutdownSystem: () => { 
        document.body.innerHTML = `<div class="w-full h-full bg-black flex flex-col items-center justify-center text-white"><button onclick="location.reload()" class="w-24 h-24 rounded-full border-4 border-gray-600 text-gray-600 hover:text-white hover:border-white transition flex items-center justify-center text-4xl mb-4" title="Włącz BigOS">⏻</button><p class="text-gray-500 font-mono">System BigOS wyłączony.</p></div>`; 
    },

    // ==================================================================
    // 3. KOMPATYBILNOŚĆ WSTECZNA DLA HTML (Tylko przekierowania do modułów!)
    // ==================================================================
    toggleCalendar: (e) => { if(typeof kalendarzApp !== 'undefined') kalendarzApp.toggleCalendar(e); },
    changeCalendarMonth: (dir) => { if(typeof kalendarzApp !== 'undefined') kalendarzApp.changeCalendarMonth(dir); },
    generateCalendar: () => { if(typeof kalendarzApp !== 'undefined') kalendarzApp.generateCalendar(); },
    
    createStickyNote: (id, text, x, y) => { if(typeof karteczkiApp !== 'undefined') karteczkiApp.createStickyNote(id, text, x, y); },
    saveStickyNotes: () => { if(typeof karteczkiApp !== 'undefined') karteczkiApp.saveStickyNotes(); },
    loadStickyNotes: () => { if(typeof karteczkiApp !== 'undefined') karteczkiApp.loadStickyNotes(); },
    
    navigate: () => { if(typeof siecioslawApp !== 'undefined') siecioslawApp.navigate(); },
    terminalHandle: (e) => { if(typeof wladcaApp !== 'undefined') wladcaApp.handle(e); }
};