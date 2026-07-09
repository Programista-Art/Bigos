// ======================================================================
// PLIK: js/apps.js (Logika wbudowanych Aplikacji, Szuflady, Tapet)
// ======================================================================

let calOffset = 0; 

const apps = {
    // ==================================================================
    // 1. ZARZĄDZANIE TAPETAMI (KOMBINATOR)
    // ==================================================================
    defaultWallpapers: [
        { name: 'BigOS', url: 'tapety/bigos.webp' },
        { name: 'Natura', url: 'tapety/natura.webp' },
        { name: 'Kosmos', url: 'tapety/kosmos.webp' },
        { name: 'Abstrakcja', url: 'tapety/abstrakcja.webp' }
    ],

    renderWallpaperGallery: () => {
        const gallery = document.getElementById('wallpaper-gallery');
        if(!gallery) return;
        
        gallery.innerHTML = '';
        const customWp = JSON.parse(localStorage.getItem('bigos_custom_wp') || '[]');
        const allWp = [...apps.defaultWallpapers, ...customWp];
        
        allWp.forEach((wp, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'relative group';
            
            const img = document.createElement('img');
            img.src = wp.url; 
            img.alt = wp.name; 
            img.title = wp.name;
            img.loading = 'lazy'; 
            img.onerror = function() { 
                this.onerror = null; 
                this.src = 'tapety/bigos.webp'; 
            };
            img.className = 'cursor-pointer border-2 border-gray-300 dark:border-gray-600 hover:border-purple-500 wp-thumbnail w-full h-20 object-cover rounded shadow bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500';
            img.onclick = () => apps.setWallpaperUrl(wp.url);
            
            imgContainer.appendChild(img);
            
            if (index >= apps.defaultWallpapers.length) {
                const delBtn = document.createElement('button'); 
                delBtn.innerHTML = '✖'; 
                delBtn.className = 'absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition';
                delBtn.onclick = (e) => { 
                    e.stopPropagation(); 
                    customWp.splice(index - apps.defaultWallpapers.length, 1); 
                    localStorage.setItem('bigos_custom_wp', JSON.stringify(customWp)); 
                    apps.renderWallpaperGallery(); 
                };
                imgContainer.appendChild(delBtn);
            }
            gallery.appendChild(imgContainer);
        });
    },

    setWallpaperUrl: (customUrl) => { 
        const u = customUrl || document.getElementById('wallpaper-url').value; 
        const target = document.getElementById('wallpaper-target').value;
        
        if(u) { 
            if(target === 'desktop') {
                document.getElementById('desktop-bg').style.backgroundImage = `url('${u}')`; 
                document.getElementById('desktop-bg').classList.add('custom-wp'); 
                localStorage.setItem('bigos_bg', u); 
            } else {
                document.getElementById('login-screen').style.backgroundImage = `url('${u}')`; 
                localStorage.setItem('bigos_login_bg', u); 
            }
            apps.showToast('Kombinator', 'Ustawiono nową tapetę!', 'success');
        } 
    },

    setWallpaperFile: (e) => { 
        const f = e.target.files[0]; 
        if(!f) return; 
        
        const target = document.getElementById('wallpaper-target').value;
        const r = new FileReader(); 
        
        r.onload = (ev) => { 
            const res = ev.target.result;
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                let width = img.width;
                let height = img.height;
                const maxWidth = 1920;
                const maxHeight = 1080;
                
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = width * ratio;
                    height = height * ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                const compressedDataUrl = canvas.toDataURL('image/webp', 0.8);
                
                try {
                    if(target === 'desktop') {
                        document.getElementById('desktop-bg').style.backgroundImage = `url('${compressedDataUrl}')`; 
                        document.getElementById('desktop-bg').classList.add('custom-wp'); 
                        localStorage.setItem('bigos_bg', compressedDataUrl); 
                    } else {
                        document.getElementById('login-screen').style.backgroundImage = `url('${compressedDataUrl}')`; 
                        localStorage.setItem('bigos_login_bg', compressedDataUrl); 
                    }
                    
                    const customWp = JSON.parse(localStorage.getItem('bigos_custom_wp') || '[]');
                    if(!customWp.find(w => w.name === f.name)) {
                        customWp.push({ name: f.name, url: compressedDataUrl });
                        localStorage.setItem('bigos_custom_wp', JSON.stringify(customWp));
                    }
                    
                    apps.renderWallpaperGallery();
                    apps.showToast('Kombinator', 'Wgrano i zoptymalizowano tapetę (WebP)!', 'success');
                } catch(error) {
                    apps.showToast('Błąd Pamięci', 'Zdjęcie nadal jest za duże by je zapisać!', 'error');
                }
            };
            img.src = res;
        }; 
        r.readAsDataURL(f); 
        e.target.value = '';
    },

    resetWallpaper: () => { 
        const defaultBg = apps.defaultWallpapers[0].url; 
        const target = document.getElementById('wallpaper-target').value;
        
        if(target === 'desktop') {
            document.getElementById('desktop-bg').style.backgroundImage = `url('${defaultBg}')`; 
            document.getElementById('desktop-bg').classList.add('custom-wp'); 
            localStorage.setItem('bigos_bg', defaultBg); 
        } else {
            document.getElementById('login-screen').style.backgroundImage = `url('${defaultBg}')`; 
            localStorage.setItem('bigos_login_bg', defaultBg); 
        }
        apps.showToast('Kombinator', 'Przywrócono tapetę domyślną', 'info'); 
    },

    // ==================================================================
    // 2. FUNKCJE SYSTEMOWE I MOTYWY
    // ==================================================================
    setTheme: (theme) => { 
        currentTheme = theme; 
        localStorage.setItem('bigos_theme', theme); 
        document.getElementById('system-theme-select').value = theme; 
        
        if(theme === 'dark') {
            document.documentElement.classList.add('dark'); 
        } else {
            document.documentElement.classList.remove('dark'); 
        }
    },

    showToast: (t, m, type = 'info') => { 
        const c = document.getElementById('toast-container'); 
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
    },

    // NOWE OKNO MODALNE DO FORMATOWANIA
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

            // Logika przycisków
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

        // Wyświetlanie okna z animacją
        modal.style.display = 'flex';
        void modal.offsetWidth; // Wymuszenie przerysowania by animacja zadziałała
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
    // 3. KALENDARZ I KARTECZKI
    // ==================================================================
    toggleCalendar: (e) => { 
        if(e) e.stopPropagation(); 
        calOffset = 0; 
        apps.generateCalendar(); 
        document.getElementById('calendar-widget').classList.toggle('hidden-cal'); 
        document.getElementById('start-menu').classList.add('hidden'); 
    },

    changeCalendarMonth: (dir) => { 
        calOffset += dir; 
        apps.generateCalendar(); 
    },

    generateCalendar: () => {
        const c = document.getElementById('cal-days'); 
        const t = document.getElementById('cal-month-year'); 
        const targetDate = new Date(); 
        targetDate.setMonth(targetDate.getMonth() + calOffset); 
        
        const now = new Date(); 
        const mPl = ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"]; 
        
        t.innerText = `${mPl[targetDate.getMonth()]} ${targetDate.getFullYear()}`; 
        
        const first = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).getDay(); 
        const days = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate(); 
        
        let start = first === 0 ? 6 : first - 1; 
        c.innerHTML = ''; 
        
        for(let i=0; i<start; i++) {
            c.innerHTML += `<div></div>`;
        }
        
        for(let i=1; i<=days; i++) { 
            const isToday = (i === now.getDate() && targetDate.getMonth() === now.getMonth() && targetDate.getFullYear() === now.getFullYear()); 
            c.innerHTML += `<div class="${isToday?'bg-blue-600 text-white rounded-full shadow-md':'hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer rounded-full transition text-gray-800 dark:text-gray-300'} w-7 h-7 flex items-center justify-center mx-auto">${i}</div>`; 
        }
    },

    createStickyNote: (id='n_'+Date.now(), text='', x=100, y=100) => { 
        const c = document.getElementById('sticky-notes-container'); 
        const n = document.createElement('div'); 
        
        n.id = id; 
        n.className = 'sticky-note pointer-events-auto rounded p-2'; 
        n.style.left = x + 'px'; 
        n.style.top = y + 'px'; 
        
        n.innerHTML = `
            <div class="flex justify-between items-center mb-1 cursor-move" 
                 onmousedown="desktop.activeDrag={el:this.parentElement,type:'sticky',id:'${id}',oX:event.clientX-this.parentElement.getBoundingClientRect().left,oY:event.clientY-this.parentElement.getBoundingClientRect().top};winManager.bringToFront(this.parentElement)" 
                 ontouchstart="const p=getEventPos(event); desktop.activeDrag={el:this.parentElement,type:'sticky',id:'${id}',oX:p.x-this.parentElement.getBoundingClientRect().left,oY:p.y-this.parentElement.getBoundingClientRect().top};winManager.bringToFront(this.parentElement)">
                <span class="text-xs font-bold text-yellow-800">📌</span>
                <button onclick="this.parentElement.parentElement.remove();apps.saveStickyNotes()" class="text-red-700 font-bold">✖</button>
            </div>
            <div contenteditable="true" class="flex-grow outline-none text-sm text-yellow-900" oninput="apps.saveStickyNotes()">${text}</div>
        `; 
        
        c.appendChild(n); 
        apps.saveStickyNotes(); 
    },

    saveStickyNotes: () => { 
        const ns = []; 
        document.querySelectorAll('.sticky-note').forEach(el => { 
            ns.push({
                id: el.id, 
                x: parseInt(el.style.left), 
                y: parseInt(el.style.top), 
                t: el.querySelector('div[contenteditable]').innerHTML
            });
        }); 
        localStorage.setItem('bigos_stickies', JSON.stringify(ns)); 
    },

    loadStickyNotes: () => { 
        const s = localStorage.getItem('bigos_stickies'); 
        if(s) {
            JSON.parse(s).forEach(n => apps.createStickyNote(n.id, n.t, n.x, n.y)); 
        }
    },
    
    // ==================================================================
    // 4. SIECIOSŁAW I WŁADCA POLECEŃ
    // ==================================================================
    navigate: () => { 
        document.getElementById('browser-frame').src = document.getElementById('url-input').value; 
    },

    terminalHandle: (e) => {
        if(e.key === 'Enter') {
            const input = document.getElementById('term-in'); 
            const out = document.getElementById('terminal-out'); 
            const cmd = input.value.trim();
            
            out.innerHTML += `\n<span class="text-blue-400">root@bigos:~#</span> ${desktop.escapeHTML(cmd)}`;
            
            if(cmd.toLowerCase() === 'pomoc') {
                out.innerHTML += `\nKomendy: pomoc, data, wyczysc, wersja`; 
            } else if(cmd.toLowerCase() === 'data') {
                out.innerHTML += `\n` + new Date().toString(); 
            } else if(cmd.toLowerCase() === 'wyczysc') {
                out.innerHTML = 'Witaj we Władcy Poleceń!'; 
            } else if(cmd.toLowerCase() === 'wersja') {
                out.innerHTML += `\nBigOS Wersja 1.21 Modularna`; 
            } else if(cmd !== '') {
                out.innerHTML += `\nbash: ${desktop.escapeHTML(cmd)}: nieznane polecenie`;
            }
            
            input.value = ''; 
            out.scrollTop = out.scrollHeight;
        }
    }
};

// Automatyczne dodanie przycisku Formatowania do Szuflady (Menu Start) w formie spójnej listy
setTimeout(() => {
    const startMenu = document.getElementById('start-menu');
    // Usunięcie ewentualnych starych przycisków, jeśli takie istniały
    const oldBtn = document.getElementById('start-btn-format');
    if (oldBtn) oldBtn.remove();
    
    if (startMenu) {
        const formatBtn = document.createElement('div');
        formatBtn.id = 'start-btn-format';
        // Klasy odpowiadają standardowym przyciskom na dole Szuflady (Zablokuj, Uśpij, Zamknij)
        formatBtn.className = 'w-full flex items-center gap-3 px-4 py-2 hover:bg-white/10 transition cursor-pointer text-red-500 hover:text-red-400 mt-2 border-t border-gray-700/50 pt-3';
        formatBtn.onclick = () => { 
            apps.toggleStartMenu(); 
            apps.formatSystem(); 
        };
        formatBtn.innerHTML = `
            <span style="width: 20px; text-align: center;">⚠️</span>
            <span class="text-sm font-medium">Formatuj</span>
        `;
        // Dodajemy na sam koniec Szuflady
        startMenu.appendChild(formatBtn);
    }
}, 1000);