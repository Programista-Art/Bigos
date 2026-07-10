// ======================================================================
// PLIK: js/aplikacje/kombinator.js (Kombinator - Tapety i Motywy)
// ======================================================================

const kombinatorApp = {
    defaultWallpapers: [
        { name: 'BigOS', url: 'tapety/ferrari.webp' },
        { name: 'Natura', url: 'tapety/bigos.webp' }
    ],

    // NOWOŚĆ: Inicjalizacja nowych motywów w interfejsie Kombinatora
    initThemesUI: () => {
        // Dodanie stylów naprawiających widoczność pól wyboru (Eleganckie ciemne barwy)
        if (!document.getElementById('kombinator-select-styles')) {
            const style = document.createElement('style');
            style.id = 'kombinator-select-styles';
            style.innerHTML = `
                #system-theme-select, #wallpaper-target {
                    color: #e5e7eb !important; /* Jasny tekst w spoczynku */
                    background-color: #374151 !important; /* Szare, przyjemne tło w spoczynku */
                    border: 1px solid #4b5563 !important;
                    transition: all 0.2s;
                }
                #system-theme-select:focus, #wallpaper-target:focus {
                    color: #ffffff !important; /* Całkowicie biały tekst gdy pole jest aktywne */
                    background-color: #1f2937 !important; /* Ciemniejsze, grafitowe tło dla focusa */
                    border-color: #3b82f6 !important; /* Niebieska obwódka */
                    outline: none !important;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5) !important; /* Efekt poświaty Focus */
                }
                #system-theme-select option, #wallpaper-target option {
                    color: #ffffff !important; /* Biały tekst opcji */
                    background-color: #1f2937 !important; /* Ciemne tło rozwijanej listy */
                }
            `;
            document.head.appendChild(style);
        }

        const sel = document.getElementById('system-theme-select');
        // Jeśli znaleźliśmy dropdown i mamy załadowany silnik themeManager z theme.js
        if (sel && typeof themeManager !== 'undefined') {
            sel.innerHTML = ''; // Czyścimy stare opcje (tylko jasny/ciemny)
            
            // Dodajemy wszystkie nowoczesne motywy do listy
            themeManager.themesList.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.innerText = t.name;
                if (themeManager.settings.activeTheme === t.id) opt.selected = true;
                sel.appendChild(opt);
            });
            
            // Podpinamy nową funkcję zmieniającą motyw globalnie
            sel.onchange = (e) => kombinatorApp.setTheme(e.target.value);
        }
    },

    renderWallpaperGallery: () => {
        const gallery = document.getElementById('wallpaper-gallery');
        if(!gallery) return;
        
        gallery.innerHTML = '';
        const customWp = JSON.parse(localStorage.getItem('bigos_custom_wp') || '[]');
        const allWp = [...kombinatorApp.defaultWallpapers, ...customWp];
        
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
            img.onclick = () => kombinatorApp.setWallpaperUrl(wp.url);
            
            imgContainer.appendChild(img);
            
            if (index >= kombinatorApp.defaultWallpapers.length) {
                const delBtn = document.createElement('button'); 
                delBtn.innerHTML = '✖'; 
                delBtn.className = 'absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition';
                delBtn.onclick = (e) => { 
                    e.stopPropagation(); 
                    customWp.splice(index - kombinatorApp.defaultWallpapers.length, 1); 
                    localStorage.setItem('bigos_custom_wp', JSON.stringify(customWp)); 
                    kombinatorApp.renderWallpaperGallery(); 
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
            if(typeof apps !== 'undefined') apps.showToast('Kombinator', 'Ustawiono nową tapetę!', 'success');
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
                    
                    kombinatorApp.renderWallpaperGallery();
                    if(typeof apps !== 'undefined') apps.showToast('Kombinator', 'Wgrano i zoptymalizowano tapetę (WebP)!', 'success');
                } catch(error) {
                    if(typeof apps !== 'undefined') apps.showToast('Błąd Pamięci', 'Zdjęcie nadal jest za duże by je zapisać!', 'error');
                }
            };
            img.src = res;
        }; 
        r.readAsDataURL(f); 
        e.target.value = '';
    },

    resetWallpaper: () => { 
        const defaultBg = kombinatorApp.defaultWallpapers[0].url; 
        const target = document.getElementById('wallpaper-target').value;
        
        if(target === 'desktop') {
            document.getElementById('desktop-bg').style.backgroundImage = `url('${defaultBg}')`; 
            document.getElementById('desktop-bg').classList.add('custom-wp'); 
            localStorage.setItem('bigos_bg', defaultBg); 
        } else {
            document.getElementById('login-screen').style.backgroundImage = `url('${defaultBg}')`; 
            localStorage.setItem('bigos_login_bg', defaultBg); 
        }
        if(typeof apps !== 'undefined') apps.showToast('Kombinator', 'Przywrócono tapetę domyślną', 'info'); 
    },

    // Zaktualizowana funkcja setTheme korzystająca z Globalnego Silnika Motywów
    setTheme: (theme) => { 
        if (typeof themeManager !== 'undefined') {
            // Przekazujemy zmianę motywu do globalnego zarządcy w theme.js
            themeManager.applyTheme(theme);
        } else {
            // Bezpieczny fallback do starego systemu (jeśli ktoś zapomniał dołączyć pliku theme.js)
            currentTheme = theme; 
            localStorage.setItem('bigos_theme', theme); 
            const sel = document.getElementById('system-theme-select');
            if (sel) sel.value = theme; 
            
            if(theme === 'dark') {
                document.documentElement.classList.add('dark'); 
            } else {
                document.documentElement.classList.remove('dark'); 
            }
        }
    }
};

// Zgodność wsteczna z plikiem index.html oraz ładowanie interfejsu motywów
setTimeout(() => {
    if(typeof apps !== 'undefined') {
        apps.renderWallpaperGallery = kombinatorApp.renderWallpaperGallery;
        apps.setWallpaperUrl = kombinatorApp.setWallpaperUrl;
        apps.setWallpaperFile = kombinatorApp.setWallpaperFile;
        apps.resetWallpaper = kombinatorApp.resetWallpaper;
        apps.setTheme = kombinatorApp.setTheme;
    }
    kombinatorApp.initThemesUI();
}, 100);