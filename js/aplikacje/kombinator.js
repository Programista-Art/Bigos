// ======================================================================
// PLIK: js/aplikacje/kombinator.js (Kombinator - Tapety, Motywy, AI)
// ======================================================================

const kombinatorApp = {
    defaultWallpapers: [
        { name: 'BigOS', url: 'tapety/bigos.webp' },
        { name: 'Kosmos', url: 'tapety/kosmos.webp' },
        { name: 'Ferrari', url: 'tapety/ferrari.webp' },
        { name: 'Abstrakcja', url: 'tapety/abstrakcja.webp' },
        { name: 'avocado-avoraiser', url: 'tapety/avocado-avoraiser.webp' },
        { name: 'avocado-core', url: 'tapety/avocado-core.webp' }
    ],
    
    thumbSize: 140,

    init: () => {
        kombinatorApp.upgradeUI();
    },

    upgradeUI: () => {
        let appWindow = document.getElementById('app-tapeciak');
        if (!appWindow) { 
            appWindow = document.createElement('div');
            appWindow.id = 'app-tapeciak';
            appWindow.className = 'window absolute';
            document.body.appendChild(appWindow);
        }

        appWindow.style.width = '750px';
        appWindow.style.height = '550px';
        appWindow.style.background = 'transparent';
        appWindow.style.border = 'none';
        appWindow.style.boxShadow = 'none';

        const titleBar = appWindow.querySelector('.title-bar');
        Array.from(appWindow.children).forEach(child => { if (child !== titleBar) child.remove(); });
        if(titleBar) titleBar.style.display = 'none';

        const proUI = document.createElement('div');
        proUI.className = 'flex flex-col overflow-hidden relative themed-app g-panel rounded-lg shadow-2xl h-full w-full';

        // Pobranie zapisanego klucza AI
        const savedApiKey = localStorage.getItem('bigos_gemini_api_key') || '';

        proUI.innerHTML = `
            <div class="px-4 py-2 border-b g-border flex justify-between items-center cursor-move bg-black/30 shrink-0" onmousedown="winManager.startDrag(event, 'app-tapeciak')" ontouchstart="winManager.startDrag(event, 'app-tapeciak')">
                <span class="text-sm font-bold g-accent drop-shadow-md">⚙️ Kombinator (Ustawienia Systemu)</span>
                <div class="flex gap-2">
                    <button onclick="winManager.minimize('tapeciak')" class="g-icon-btn px-1 hover:text-white transition">_</button>
                    <button onclick="winManager.maximize('app-tapeciak')" class="g-icon-btn px-1 hover:text-white transition">□</button>
                    <button onclick="winManager.close('tapeciak')" class="text-red-500 hover:text-red-400 px-1 font-bold transition">✖</button>
                </div>
            </div>

            <div class="flex flex-row flex-grow overflow-hidden">
                <!-- Lewy Panel Zakładek -->
                <div class="w-1/4 sm:w-[180px] border-r g-border bg-black/10 flex flex-col p-2 gap-1 shrink-0 overflow-y-auto custom-scrollbar">
                    <button onclick="kombinatorApp.switchTab('wallpapers')" id="komb-tab-wallpapers" class="komb-tab g-item text-left px-3 py-2 rounded-lg font-bold text-xs sm:text-sm transition flex items-center gap-2"><span>🖼️</span> <span class="hidden sm:inline">Tapety</span></button>
                    <button onclick="kombinatorApp.switchTab('themes')" id="komb-tab-themes" class="komb-tab g-item text-left px-3 py-2 rounded-lg font-bold text-xs sm:text-sm transition flex items-center gap-2"><span>🎨</span> <span class="hidden sm:inline">Motywy</span></button>
                    <div class="border-t g-border my-2 mx-2"></div>
                    <button onclick="kombinatorApp.switchTab('ai')" id="komb-tab-ai" class="komb-tab g-item text-left px-3 py-2 rounded-lg font-bold text-xs sm:text-sm transition flex items-center gap-2"><span>🤖</span> <span class="hidden sm:inline">Podpowiadacz AI</span></button>
                </div>

                <!-- Prawy Panel Treści -->
                <div class="flex-grow flex flex-col bg-black/20 relative" id="kombinator-content">
                    
                    <!-- ZAKŁADKA 1: TAPETY -->
                    <div id="komb-content-wallpapers" class="flex flex-col h-full absolute inset-0 hidden p-4">
                        <div class="flex flex-col gap-3 shrink-0 mb-4 pb-4 border-b g-border">
                            <div class="flex items-center gap-3">
                                <label class="text-[10px] uppercase font-bold g-text-muted tracking-wider shrink-0">Zmień tło dla:</label>
                                <select id="wallpaper-target" class="p-1.5 text-xs font-bold g-bg g-text border g-border rounded outline-none flex-grow shadow-inner cursor-pointer">
                                    <option value="desktop">Pulpitu (Główny ekran)</option>
                                    <option value="login">Ekranu Logowania</option>
                                </select>
                            </div>
                            
                            <div class="flex justify-center mt-2 mb-2 w-full">
                                <input type="file" id="wallpaper-file" accept="image/*" class="hidden" onchange="kombinatorApp.setWallpaperFile(event)">
                                <button onclick="document.getElementById('wallpaper-file').click()" class="g-btn bg-emerald-600/20 border-emerald-500/50 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 text-xs px-8 py-3 rounded-full font-bold shadow-lg transition-all flex items-center justify-center gap-2 max-w-[300px] w-full">
                                    <span class="text-xl">📂</span> Otwórz z dysku
                                </button>
                            </div>

                            <div class="flex items-center gap-2 mt-2 pt-3 border-t border-gray-500/20">
                                <input type="text" id="wallpaper-url" placeholder="Wklej adres URL obrazka z internetu (http...)" class="flex-grow p-2 text-[10px] sm:text-xs g-bg g-text border g-border rounded outline-none focus:border-blue-500 shadow-inner">
                                <button onclick="kombinatorApp.setWallpaperUrl()" class="g-btn text-[10px] sm:text-xs px-4 py-2 rounded font-bold shadow-md whitespace-nowrap bg-blue-600/20 hover:bg-blue-600 hover:text-white border-blue-500/50 transition">Ustaw z URL</button>
                            </div>
                        </div>

                        <div class="flex-grow overflow-y-auto custom-scrollbar relative pr-2 rounded-lg bg-black/10 p-2 shadow-inner border border-transparent dark:border-white/5" id="kombinator-gallery-container">
                             <div id="wallpaper-gallery" class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));"></div>
                        </div>
                        <div class="shrink-0 pt-3 mt-3 border-t g-border flex items-center gap-3">
                            <span class="text-lg">🔍</span>
                            <span class="text-[10px] uppercase font-bold g-text-muted tracking-widest shrink-0">Wielkość:</span>
                            <input type="range" min="80" max="300" value="140" class="flex-grow g-range h-1.5 rounded-lg appearance-none cursor-pointer" oninput="kombinatorApp.setZoom(this.value)">
                        </div>
                    </div>

                    <!-- ZAKŁADKA 2: MOTYWY -->
                    <div id="komb-content-themes" class="flex flex-col h-full absolute inset-0 hidden p-4 overflow-y-auto custom-scrollbar">
                        <h3 class="font-bold text-lg g-accent mb-4 border-b g-border pb-2 flex items-center gap-2"><span>🎨</span> Konfiguracja Wyglądu Systemu</h3>
                        <div id="theme-selector-container" class="g-bg p-4 rounded-xl border g-border shadow-inner">
                            <select id="system-theme-select" class="hidden"></select>
                        </div>
                    </div>

                    <!-- ZAKŁADKA 3: PODPOWIADACZ AI (Z kluczem API dla całego systemu) -->
                    <div id="komb-content-ai" class="flex flex-col h-full absolute inset-0 hidden p-6 overflow-y-auto custom-scrollbar items-center">
                        <h3 class="font-bold text-lg g-accent mb-6 border-b g-border pb-2 w-full max-w-lg text-center flex items-center justify-center gap-2"><span>🤖</span> Systemowy Asystent AI</h3>
                        
                        <div class="g-panel border g-border rounded-xl p-6 shadow-inner w-full max-w-lg flex flex-col gap-4 text-sm g-text">
                            <p>System BigOS używa potężnego silnika <b class="g-accent">Google Gemini 2.5 Flash</b>. Aby sztuczna inteligencja mogła pomagać Ci w całym systemie (np. współpracować z przeglądarką i tworzyć pliki), musisz podać swój własny, darmowy klucz API.</p>
                            
                            <div class="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg text-xs leading-relaxed g-text">
                                <b class="text-blue-500 dark:text-blue-400">Jak zdobyć klucz za darmo?</b><br>
                                1. Wejdź na <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-blue-500 font-bold hover:underline">Google AI Studio</a> i zaloguj się swoim kontem.<br>
                                2. Kliknij "Create API key" w nowym lub istniejącym projekcie.<br>
                                3. Skopiuj wygenerowany ciąg znaków i wklej go poniżej.
                            </div>

                            <div class="mt-2 flex flex-col gap-1">
                                <label class="text-[10px] font-bold g-text-muted uppercase tracking-widest">Twój systemowy klucz API Google Gemini:</label>
                                <input type="password" id="komb-ai-key-input" placeholder="Wklej klucz (np. AIzaSy...)" value="${savedApiKey}" class="w-full p-3 rounded-lg g-bg g-text border g-border outline-none focus:border-blue-500 transition shadow-inner font-mono tracking-widest">
                            </div>

                            <button onclick="kombinatorApp.saveAIKey()" class="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition duration-200 border border-blue-700 w-full">
                                💾 Zapisz Klucz Systemowy
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        `;

        appWindow.appendChild(proUI);
        kombinatorApp.switchTab('wallpapers');
    },

    saveAIKey: () => {
        const keyInput = document.getElementById('komb-ai-key-input').value.trim();
        localStorage.setItem('bigos_gemini_api_key', keyInput);
        if (typeof apps !== 'undefined') apps.showToast('Zapisano', 'Klucz Asystenta AI został zapisany w systemie.', 'success');
    },

    switchTab: (tabId) => {
        document.querySelectorAll('.komb-tab').forEach(btn => {
            btn.classList.remove('bg-blue-500', 'text-white', 'dark:bg-blue-600', 'bg-purple-600', 'dark:bg-purple-600');
            btn.classList.add('g-text-muted');
        });
        
        const activeBtn = document.getElementById('komb-tab-' + tabId);
        if (activeBtn) {
            activeBtn.classList.remove('g-text-muted');
            if(tabId === 'ai') activeBtn.classList.add('bg-purple-600', 'text-white', 'dark:bg-purple-600');
            else activeBtn.classList.add('bg-blue-500', 'text-white', 'dark:bg-blue-600');
        }

        ['wallpapers', 'themes', 'ai'].forEach(id => {
            document.getElementById('komb-content-' + id).classList.add('hidden');
        });
        document.getElementById('komb-content-' + tabId).classList.remove('hidden');
    },

    setZoom: (val) => {
        kombinatorApp.thumbSize = parseInt(val);
        const gal = document.getElementById('wallpaper-gallery');
        if(gal) gal.style.gridTemplateColumns = `repeat(auto-fill, minmax(${kombinatorApp.thumbSize}px, 1fr))`;
    },

    initThemesUI: () => {
        const sel = document.getElementById('system-theme-select');
        if (sel && typeof themeManager !== 'undefined') {
            sel.innerHTML = ''; 
            themeManager.themesList.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id; opt.innerText = t.name;
                if (themeManager.settings.activeTheme === t.id) opt.selected = true;
                sel.appendChild(opt);
            });
            sel.onchange = (e) => kombinatorApp.setTheme(e.target.value);
        }
    },

    renderWallpaperGallery: () => {
        const gallery = document.getElementById('wallpaper-gallery');
        if(!gallery) return;
        
        gallery.innerHTML = '';
        gallery.style.gridTemplateColumns = `repeat(auto-fill, minmax(${kombinatorApp.thumbSize}px, 1fr))`;
        
        kombinatorApp.defaultWallpapers.forEach((wp) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'relative group w-full aspect-video overflow-hidden rounded-xl shadow-lg border-2 g-border hover:border-blue-500 transition-all';
            
            const img = document.createElement('img');
            img.src = wp.url; img.alt = wp.name; img.loading = 'lazy'; 
            img.onerror = function() { this.onerror = null; this.src = 'tapety/bigos.webp'; };
            img.className = 'w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-500 bg-black/40';
            img.onclick = () => kombinatorApp.setWallpaperUrl(wp.url);
            
            const nameLabel = document.createElement('div');
            nameLabel.className = 'absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] font-bold p-1 truncate text-center backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity';
            nameLabel.innerText = wp.name;

            imgContainer.appendChild(img); imgContainer.appendChild(nameLabel); gallery.appendChild(imgContainer);
        });

        if (typeof fileSystem !== 'undefined') {
            const customImages = fileSystem.filter(f => f.parentId !== 'hasiok' && (f.type === 'image' || (f.type === 'file' && f.name.match(/\.(jpg|jpeg|png|webp)$/i))));
            customImages.forEach((imgItem) => {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'relative group w-full aspect-video overflow-hidden rounded-xl shadow-lg border-2 g-border hover:border-blue-500 transition-all';

                const img = document.createElement('img');
                img.src = imgItem.content || ''; img.alt = imgItem.name; img.loading = 'lazy';
                img.className = 'w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-500 bg-black/40';
                img.onclick = () => kombinatorApp.setWallpaperUrl(imgItem.content);

                const nameLabel = document.createElement('div');
                nameLabel.className = 'absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] font-bold p-1 truncate text-center backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity';
                nameLabel.innerText = typeof desktop !== 'undefined' ? desktop.escapeHTML(imgItem.name) : imgItem.name;

                const delBtn = document.createElement('button');
                delBtn.innerHTML = '✖';
                delBtn.className = 'absolute top-1 right-1 bg-red-500 hover:bg-red-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition shadow-lg z-10';
                delBtn.onclick = (e) => {
                    e.stopPropagation(); imgItem.parentId = 'hasiok'; 
                    if(typeof fsManager !== 'undefined') fsManager.save(); 
                    if(typeof desktop !== 'undefined') desktop.render();
                    kombinatorApp.renderWallpaperGallery();
                    if(typeof apps !== 'undefined') apps.showToast('Usunięto', 'Tapeta do Kosza.', 'info');
                };
                
                imgContainer.appendChild(img); imgContainer.appendChild(nameLabel); imgContainer.appendChild(delBtn);
                gallery.appendChild(imgContainer);
            });
        }
    },

    setWallpaperUrl: (customUrl) => { 
        const inputEl = document.getElementById('wallpaper-url');
        const u = customUrl || (inputEl ? inputEl.value.trim() : ''); 
        const targetEl = document.getElementById('wallpaper-target');
        const target = targetEl ? targetEl.value : 'desktop';
        
        if(u) { 
            if (!customUrl && typeof fileSystem !== 'undefined' && typeof fsManager !== 'undefined') {
                const newId = 'img_' + Date.now();
                fileSystem.push({
                    id: newId, type: 'image', name: 'Tapeta z sieci', icon: '🖼️', content: u,
                    parentId: 'root', x: Math.floor(Math.random() * 100) + 20, y: Math.floor(Math.random() * 100) + 20
                });
                fsManager.save();
                if (typeof desktop !== 'undefined') desktop.render();
                kombinatorApp.renderWallpaperGallery();
            }

            if(target === 'desktop') {
                const bg = document.getElementById('desktop-bg');
                if (bg) { bg.style.backgroundImage = `url('${u}')`; bg.classList.add('custom-wp'); }
                localStorage.setItem('bigos_bg', u); 
            } else {
                const loginScreen = document.getElementById('login-screen');
                if (loginScreen) { loginScreen.style.backgroundImage = `url('${u}')`; }
                localStorage.setItem('bigos_login_bg', u); 
            }
            if(typeof apps !== 'undefined') apps.showToast('Kombinator', 'Ustawiono nową tapetę!', 'success');
            if(inputEl) inputEl.value = '';
        } 
    },

    setWallpaperFile: (e) => { 
        const f = e.target.files[0]; 
        if(!f) return; 
        
        const targetEl = document.getElementById('wallpaper-target');
        const target = targetEl ? targetEl.value : 'desktop';
        const r = new FileReader(); 
        
        r.onload = (ev) => { 
            const res = ev.target.result;
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
                let width = img.width; let height = img.height;
                const maxWidth = 3840; const maxHeight = 2160;
                
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = width * ratio; height = height * ratio;
                }
                
                canvas.width = width; canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/webp', 0.85);
                
                try {
                    if (typeof fileSystem !== 'undefined' && typeof fsManager !== 'undefined') {
                        const newId = 'img_' + Date.now();
                        fileSystem.push({
                            id: newId, type: 'image', name: f.name, icon: '🖼️', content: compressedDataUrl,
                            parentId: 'root', x: Math.floor(Math.random() * 100) + 20, y: Math.floor(Math.random() * 100) + 20
                        });
                        fsManager.save();
                        if (typeof desktop !== 'undefined') desktop.render();
                    }

                    if(target === 'desktop') {
                        const bg = document.getElementById('desktop-bg');
                        if (bg) { bg.style.backgroundImage = `url('${compressedDataUrl}')`; bg.classList.add('custom-wp'); }
                        localStorage.setItem('bigos_bg', compressedDataUrl); 
                    } else {
                        const loginScreen = document.getElementById('login-screen');
                        if (loginScreen) { loginScreen.style.backgroundImage = `url('${compressedDataUrl}')`; }
                        localStorage.setItem('bigos_login_bg', compressedDataUrl); 
                    }
                    
                    kombinatorApp.renderWallpaperGallery();
                    if(typeof apps !== 'undefined') apps.showToast('Kombinator', 'Tapeta dodana na Pulpit i ustawiona!', 'success');
                } catch(error) {
                    if(typeof apps !== 'undefined') apps.showToast('Błąd Pamięci', 'Wystąpił błąd podczas zapisywania obrazu!', 'error');
                }
            };
            img.src = res;
        }; 
        r.readAsDataURL(f); 
        e.target.value = '';
    },

    resetWallpaper: () => { 
        const defaultBg = kombinatorApp.defaultWallpapers[0].url; 
        const targetEl = document.getElementById('wallpaper-target');
        const target = targetEl ? targetEl.value : 'desktop';
        
        if(target === 'desktop') {
            const bg = document.getElementById('desktop-bg');
            if (bg) { bg.style.backgroundImage = `url('${defaultBg}')`; bg.classList.add('custom-wp'); }
            localStorage.setItem('bigos_bg', defaultBg); 
        } else {
            const loginScreen = document.getElementById('login-screen');
            if (loginScreen) { loginScreen.style.backgroundImage = `url('${defaultBg}')`; }
            localStorage.setItem('bigos_login_bg', defaultBg); 
        }
        if(typeof apps !== 'undefined') apps.showToast('Kombinator', 'Przywrócono tapetę domyślną', 'info'); 
    },

    setTheme: (theme) => { 
        if (typeof themeManager !== 'undefined') { themeManager.applyTheme(theme); } 
        else {
            currentTheme = theme; 
            localStorage.setItem('bigos_theme', theme); 
            const sel = document.getElementById('system-theme-select');
            if (sel) sel.value = theme; 
            if(theme === 'dark') document.documentElement.classList.add('dark'); 
            else document.documentElement.classList.remove('dark'); 
        }
    }
};

setTimeout(() => {
    kombinatorApp.init(); 
    if(typeof apps !== 'undefined') {
        apps.renderWallpaperGallery = kombinatorApp.renderWallpaperGallery;
        apps.setWallpaperUrl = kombinatorApp.setWallpaperUrl;
        apps.setWallpaperFile = kombinatorApp.setWallpaperFile;
        apps.resetWallpaper = kombinatorApp.resetWallpaper;
        apps.setTheme = kombinatorApp.setTheme;
    }
    kombinatorApp.initThemesUI();
    kombinatorApp.renderWallpaperGallery();
}, 500);