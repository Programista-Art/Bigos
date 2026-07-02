/************************************************************************
         * LOGIKA JAVASCRIPT                                                    *
         ************************************************************************/

        const GRID = 90;
        let highestZ = 100;
        let fileSystem = []; 
        let openAppsList = new Set();
        let clipboard = { action: null, item: null };
        let currentTheme = 'dark'; 

        const defaultApps = [
            { id: 'app_skryba', type: 'app', name: 'Skryba', icon: '📝', appId: 'skryba' },
            { id: 'app_szkicownik', type: 'app', name: 'Szkicownik', icon: '🎨', appId: 'szkicownik' },
            { id: 'app_aktowka', type: 'app', name: 'Aktówka', icon: '📁', appId: 'aktowka' },
            { id: 'app_patrzalka', type: 'app', name: 'Patrzałka', icon: '🖼️', appId: 'patrzalka' },
            { id: 'app_grajacz', type: 'app', name: 'Grajacz Filmów', icon: '🎬', appId: 'grajacz' },
            { id: 'app_siecioslaw', type: 'app', name: 'Sieciosław', icon: '🌐', appId: 'siecioslaw' },
            { id: 'app_wladca', type: 'app', name: 'Władca Poleceń', icon: '💻', appId: 'wladca' },
            { id: 'app_kalkulator', type: 'app', name: 'Rachmistrz', icon: '🧮', appId: 'kalkulator' },
            { id: 'app_tapeciak', type: 'app', name: 'Kombinator', icon: '⚙️', appId: 'tapeciak' },
            { id: 'app_grajek', type: 'app', name: 'Grajek', icon: '🎵', appId: 'grajek' },
            { id: 'app_nadzorca', type: 'app', name: 'Nadzorca', icon: '📊', appId: 'nadzorca' },
            { id: 'app_pogodynka', type: 'app', name: 'Pogodynka', icon: '🌤️', appId: 'pogodynka' },
            { id: 'app_czasomierz', type: 'app', name: 'Czasomierz', icon: '⏱️', appId: 'czasomierz' },
            { id: 'app_pelzacz', type: 'app', name: 'Pełzacz', icon: '🐍', appId: 'pelzacz' },
            { id: 'app_murarz', type: 'app', name: 'Murarz', icon: '🧱', appId: 'murarz' },
            { id: 'app_ufoludki', type: 'app', name: 'Ufoludki', icon: '👾', appId: 'ufoludki' },
            { id: 'app_odbijanka', type: 'app', name: 'Odbijanka', icon: '🏓', appId: 'odbijanka' },
            { id: 'app_trzepotek', type: 'app', name: 'Trzepotek', icon: '🐦', appId: 'trzepotek' },
            { id: 'app_scigacz', type: 'app', name: 'Ścigacz', icon: '🏎️', appId: 'scigacz' },
            { id: 'app_bombiarz', type: 'app', name: 'Bombiarz', icon: '💣', appId: 'bombiarz' },
            { id: 'app_kolko', type: 'app', name: 'Kółko i Krzyżyk', icon: '🎮', appId: 'kolko' },
            { id: 'hasiok', type: 'folder', name: 'Hasiok', icon: '🗑️' }
        ];

        const GLOBAL_KEYS = {};
        window.addEventListener('keydown', e => GLOBAL_KEYS[e.code] = true);
        window.addEventListener('keyup', e => GLOBAL_KEYS[e.code] = false);

        function getEventPos(e) {
            if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
            else if (e.changedTouches && e.changedTouches.length > 0) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
            return { x: e.clientX, y: e.clientY };
        }

        window.onload = () => {
            setInterval(() => {
                const now = new Date();
                document.getElementById('taskbar-clock').innerText = now.toLocaleTimeString('pl-PL', {hour: '2-digit', minute:'2-digit'});
                const calBigTime = document.getElementById('cal-big-time');
                if(calBigTime && !document.getElementById('calendar-widget').classList.contains('hidden-cal')) {
                    calBigTime.innerText = now.toLocaleTimeString('pl-PL');
                    document.getElementById('cal-big-date').innerText = now.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                }
            }, 1000);
            
            const savedTheme = localStorage.getItem('bigos_theme');
            if(savedTheme) apps.setTheme(savedTheme);
            else apps.setTheme('dark');
            
            fsManager.init();
            auth.check();
            apps.loadStickyNotes();
            apps.generateCalendar();
            apps.loadGrajkoteka();
            apps.renderWallpaperGallery();
        };

        const ui = {
            promptCallback: null,
            showPrompt: (title, defaultValue, btnText, callback) => {
                document.getElementById('system-prompt-title').innerText = title;
                document.getElementById('system-prompt-input').value = defaultValue;
                document.getElementById('system-prompt-btn').innerText = btnText;
                ui.promptCallback = callback;
                document.getElementById('system-prompt-modal').classList.remove('hidden');
                setTimeout(() => { document.getElementById('system-prompt-input').focus(); document.getElementById('system-prompt-input').select(); }, 50);
            },
            closePrompt: () => {
                document.getElementById('system-prompt-modal').classList.add('hidden');
                ui.promptCallback = null;
            },
            confirmPrompt: () => {
                const val = document.getElementById('system-prompt-input').value;
                if(ui.promptCallback) ui.promptCallback(val);
                ui.closePrompt();
            }
        };

        const auth = {
            check: () => {
                const pass = localStorage.getItem('bigos_password');
                if(!pass) {
                    document.getElementById('login-msg').innerText = "Witaj! Ustaw nowe hasło startowe.";
                    document.querySelector('#login-screen button').innerText = "Ustaw i Wejdź";
                }
            },
            handleLogin: () => {
                const input = document.getElementById('password-input').value;
                const pass = localStorage.getItem('bigos_password');
                if(!input) return apps.showToast('Błąd', 'Podaj hasło', 'error');
                if(!pass || input === pass) {
                    if(!pass) localStorage.setItem('bigos_password', input);
                    document.getElementById('login-screen').style.opacity = '0';
                    document.getElementById('password-input').value = '';
                    setTimeout(() => document.getElementById('login-screen').style.display = 'none', 300);
                    apps.showToast('Witaj', 'Zalogowano do BigOS', 'success');
                } else { apps.showToast('Błąd', 'Nieprawidłowe hasło!', 'error'); }
            },
            resetPassword: () => { localStorage.removeItem('bigos_password'); location.reload(); }
        };

        const fsManager = {
            currentFolder: 'root',
            init: () => {
                const saved = localStorage.getItem('bigos_fs');
                if(saved) {
                    fileSystem = JSON.parse(saved);
                } else {
                    fileSystem = [];
                    defaultApps.forEach((app, i) => {
                        let obj = {...app, parentId: 'root'};
                        obj.x = (Math.floor(i/6) * GRID) + 20;
                        obj.y = (i%6) * GRID + 20;
                        fileSystem.push(obj);
                    });
                    fsManager.save();
                }
                
                const savedBg = localStorage.getItem('bigos_bg');
                if(savedBg) {
                    document.getElementById('desktop-bg').style.backgroundImage = `url('${savedBg}')`;
                    document.getElementById('desktop-bg').classList.add('custom-wp');
                } 
                desktop.render();
            },
            save: () => localStorage.setItem('bigos_fs', JSON.stringify(fileSystem)),
            
            renderExplorerContent: (folderId) => {
                const pathEl = document.getElementById('explorer-path');
                const backBtn = document.getElementById('explorer-back-btn');
                
                if(folderId === 'root') { pathEl.innerText = 'BigOS:\\Pulpit'; backBtn.classList.add('hidden'); }
                else if(folderId === 'hasiok') { pathEl.innerText = 'BigOS:\\Hasiok (Kosz)'; backBtn.classList.remove('hidden'); }
                else {
                    pathEl.innerText = fsManager.getPath(folderId);
                    backBtn.classList.remove('hidden');
                }
                
                const container = document.getElementById('explorer-content');
                container.innerHTML = '';
                const items = fileSystem.filter(i => i.parentId === folderId);
                
                if(folderId === 'hasiok' && items.length === 0) {
                    container.innerHTML = '<div class="w-full text-center text-gray-500 font-bold mt-10">Kosz jest pusty</div>';
                }
                
                items.forEach(item => {
                    const el = document.createElement('div');
                    el.className = 'folder-item';
                    el.dataset.id = item.id; 
                    el.innerHTML = `<span class="icon-emoji">${item.icon}</span><span class="icon-text text-center truncate w-full" title="${desktop.escapeHTML(item.name)}">${desktop.escapeHTML(item.name)}</span>`;
                    el.ondblclick = (e) => { e.stopPropagation(); desktop.executeItem(item); };
                    el.oncontextmenu = (e) => { e.stopPropagation(); desktop.showContextMenu(e, item.type, item.id); };
                    
                    el.onmousedown = (e) => { if(e.button !== 2) desktop.startIconDrag(e, el, item); };
                    el.addEventListener('touchstart', (e) => { desktop.startIconDrag(e, el, item); }, {passive: false});

                    container.appendChild(el);
                });
            },
            
            getPath: (folderId) => {
                let path = []; let currentId = folderId;
                while(currentId && currentId !== 'root') {
                    const f = fileSystem.find(i => i.id === currentId);
                    if(f) { path.unshift(f.name); currentId = f.parentId; } else break;
                }
                return 'BigOS:\\Pulpit\\' + path.join('\\');
            },
            
            openFolder: (folderId) => { fsManager.currentFolder = folderId; winManager.open('aktowka'); fsManager.renderExplorerContent(folderId); },
            
            navigateUp: () => {
                if(fsManager.currentFolder === 'root') return;
                if(fsManager.currentFolder === 'hasiok') { fsManager.openFolder('root'); return; }
                const current = fileSystem.find(i => i.id === fsManager.currentFolder);
                if(current && current.parentId) fsManager.openFolder(current.parentId);
                else fsManager.openFolder('root');
            }
        };

        const winManager = {
            open: (appId) => {
                const win = document.getElementById(`app-${appId}`);
                if(!win) return;
                win.classList.remove('minimized');
                win.classList.add('active');
                
                if(!win.dataset.centered) {
                    const isMobile = window.innerWidth < 768;
                    const w = isMobile ? window.innerWidth - 20 : (win.offsetWidth || 500); 
                    const h = isMobile ? window.innerHeight - 100 : (win.offsetHeight || 400);
                    if(isMobile) { win.style.width = w + 'px'; win.style.height = h + 'px'; }
                    win.style.left = Math.max(0, (window.innerWidth - w)/2) + 'px';
                    win.style.top = Math.max(0, (window.innerHeight - h - 48)/2) + 'px';
                    win.dataset.centered = "true";
                }
                
                winManager.bringToFront(win);
                if(!openAppsList.has(appId)) { openAppsList.add(appId); winManager.renderTaskbar(); }
                winManager.updateTaskbarState(appId);
                
                if(appId === 'aktowka') fsManager.renderExplorerContent(fsManager.currentFolder); 
                if(appId === 'nadzorca') nadzorcaApp.init();
                if(appId === 'szkicownik') setTimeout(initPaint, 100);
                if(games[appId] && games[appId].init) games[appId].init();
            },
            close: (appId) => {
                const win = document.getElementById(`app-${appId}`);
                if(win) { win.classList.remove('active'); win.classList.remove('minimized'); }
                openAppsList.delete(appId); winManager.renderTaskbar();
                
                if(appId === 'nadzorca') nadzorcaApp.stop();
                if(appId === 'grajek') apps.grajekStop(); 
                if(appId === 'grajacz') grajaczApp.stop();
                if(games[appId] && games[appId].stop) games[appId].stop();
            },
            minimize: (appId) => {
                const win = document.getElementById(`app-${appId}`);
                if(win) win.classList.add('minimized');
                winManager.updateTaskbarState(null);
            },
            toggleMin: (appId) => {
                const win = document.getElementById(`app-${appId}`);
                if(!win) return;
                if(win.classList.contains('minimized')) { win.classList.remove('minimized'); winManager.bringToFront(win); winManager.updateTaskbarState(appId); }
                else { if(win.style.zIndex == highestZ) winManager.minimize(appId); else { winManager.bringToFront(win); winManager.updateTaskbarState(appId); } }
            },
            maximize: (winId) => {
                const win = document.getElementById(winId);
                if(win.classList.contains('maximized')) {
                    win.classList.remove('maximized');
                    win.style.width = win.dataset.oW; win.style.height = win.dataset.oH;
                    win.style.top = win.dataset.oY; win.style.left = win.dataset.oX;
                    win.style.borderRadius = "0.5rem";
                } else {
                    win.dataset.oW = win.style.width || getComputedStyle(win).width;
                    win.dataset.oH = win.style.height || getComputedStyle(win).height;
                    win.dataset.oY = win.style.top || getComputedStyle(win).top;
                    win.dataset.oX = win.style.left || getComputedStyle(win).left;
                    win.classList.add('maximized');
                    win.style.top = '0'; win.style.left = '0'; win.style.width = '100vw'; win.style.height = 'calc(100vh - 48px)'; 
                    win.style.borderRadius = "0";
                }
            },
            bringToFront: (el) => {
                highestZ++; el.style.zIndex = highestZ;
                if(el.id.startsWith('app-')) winManager.updateTaskbarState(el.id.replace('app-', ''));
            },
            renderTaskbar: () => {
                const c = document.getElementById('taskbar-apps'); c.innerHTML = '';
                openAppsList.forEach(id => {
                    const info = defaultApps.find(a => a.appId === id);
                    const btn = document.createElement('button');
                    btn.id = `tb-btn-${id}`;
                    btn.className = `px-3 h-9 bg-gray-800/60 hover:bg-white/20 text-white rounded transition flex items-center gap-1 sm:gap-2 shrink-0 font-semibold text-xs sm:text-sm border-b-2 border-transparent`;
                    btn.innerHTML = `<span>${info?info.icon:'🔲'}</span> <span class="truncate hidden sm:inline max-w-[100px]">${info?info.name:id}</span>`;
                    btn.onclick = () => winManager.toggleMin(id);
                    c.appendChild(btn);
                });
            },
            updateTaskbarState: (id) => {
                document.querySelectorAll('#taskbar-apps button').forEach(b => { b.classList.remove('bg-white/30', 'border-blue-400'); b.classList.add('bg-gray-800/60'); });
                if(id) { const b = document.getElementById(`tb-btn-${id}`); if(b) { b.classList.remove('bg-gray-800/60'); b.classList.add('bg-white/30', 'border-blue-400'); } }
            },
            startDrag: (e, winId) => {
                if(e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
                const win = document.getElementById(winId); if(win.classList.contains('maximized')) return;
                winManager.bringToFront(win);
                const pos = getEventPos(e);
                desktop.activeDrag = { el: win, type: 'window', oX: pos.x - win.getBoundingClientRect().left, oY: pos.y - win.getBoundingClientRect().top };
            }
        };

        document.querySelectorAll('.window').forEach(win => { 
            win.addEventListener('mousedown', function() { winManager.bringToFront(this); }); 
            win.addEventListener('touchstart', function() { winManager.bringToFront(this); }, {passive: true}); 
        });

        const desktop = {
            activeDrag: null, lastContextX: 0, lastContextY: 0,
            escapeHTML: (s) => s.replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t]||t)),
            render: () => {
                const area = document.getElementById('desktop-area'); area.innerHTML = '';
                fileSystem.filter(i => i.parentId === 'root').forEach(item => {
                    const el = document.createElement('div');
                    el.className = 'desktop-icon'; el.style.left = item.x + 'px'; el.style.top = item.y + 'px'; el.dataset.id = item.id;
                    el.innerHTML = `<div class="icon-emoji">${item.icon}</div><div class="icon-text" title="${desktop.escapeHTML(item.name)}">${desktop.escapeHTML(item.name)}</div>`;
                    
                    el.ondblclick = (e) => { e.stopPropagation(); desktop.executeItem(item); };
                    let lastTap = 0;
                    el.addEventListener('touchend', (e) => {
                        let currentTime = new Date().getTime(); let tapLength = currentTime - lastTap;
                        if(tapLength < 500 && tapLength > 0) { e.preventDefault(); desktop.executeItem(item); } lastTap = currentTime;
                    });
                    el.oncontextmenu = (e) => { e.stopPropagation(); desktop.showContextMenu(e, item.type, item.id); };
                    
                    el.onmousedown = (e) => {
                        document.querySelectorAll('.desktop-icon').forEach(i=>i.classList.remove('selected')); el.classList.add('selected');
                        if(e.button !== 2) desktop.startIconDrag(e, el, item);
                    };
                    el.addEventListener('touchstart', (e) => {
                        document.querySelectorAll('.desktop-icon').forEach(i=>i.classList.remove('selected')); el.classList.add('selected');
                        desktop.startIconDrag(e, el, item);
                    }, {passive: false});

                    area.appendChild(el);
                });
            },
            
            startIconDrag: (e, el, item) => {
                const pos = getEventPos(e);
                desktop.activeDrag = { 
                    el: el, ghost: null, type: 'icon_pending', ref: item, 
                    startX: pos.x, startY: pos.y,
                    oX: pos.x - el.getBoundingClientRect().left, oY: pos.y - el.getBoundingClientRect().top 
                };
            },

            executeItem: (item) => {
                if(item.type === 'app') winManager.open(item.appId);
                else if(item.type === 'folder') fsManager.openFolder(item.id);
                else if(item.type === 'file') { skrybaApp.open(item); }
                else if(item.type === 'image') { patrzalkaApp.open(item); }
            },
            
            createFolder: (targetId) => {
                document.getElementById('context-menu').classList.remove('active');
                ui.showPrompt("Nazwa nowego folderu:", "Nowy Folder", "Utwórz", (name) => {
                    if(!name || name.trim() === '') return;
                    let x = 20, y = 20;
                    if(targetId === 'root' && desktop.lastContextX) {
                        x = Math.round(desktop.lastContextX / GRID) * GRID + 10;
                        y = Math.round(desktop.lastContextY / GRID) * GRID + 10;
                    }
                    const id = 'fld_'+Date.now();
                    fileSystem.push({ id: id, type: 'folder', name: name.trim(), icon: '📁', parentId: targetId, x: x, y: y });
                    fsManager.save(); 
                    if(targetId === 'root') desktop.render();
                    if(fsManager.currentFolder === targetId && document.getElementById('app-aktowka').classList.contains('active')) fsManager.renderExplorerContent(targetId);
                });
            },
            createFile: (targetId) => {
                document.getElementById('context-menu').classList.remove('active');
                ui.showPrompt("Nazwa nowego pliku:", "Nowy Plik.txt", "Utwórz", (name) => {
                    if(!name || name.trim() === '') return;
                    if(!name.endsWith('.txt')) name += '.txt';
                    let x = 20, y = 20;
                    if(targetId === 'root' && desktop.lastContextX) {
                        x = Math.round(desktop.lastContextX / GRID) * GRID + 10;
                        y = Math.round(desktop.lastContextY / GRID) * GRID + 10;
                    }
                    const id = 'file_'+Date.now();
                    fileSystem.push({ id: id, type: 'file', name: name.trim(), icon: '📄', content: '', parentId: targetId, x: x, y: y });
                    fsManager.save(); 
                    if(targetId === 'root') desktop.render();
                    if(fsManager.currentFolder === targetId && document.getElementById('app-aktowka').classList.contains('active')) fsManager.renderExplorerContent(targetId);
                });
            },
            deleteItem: (id) => {
                document.getElementById('context-menu').classList.remove('active');
                const idx = fileSystem.findIndex(i => i.id === id);
                if(idx > -1) {
                    if(id === 'hasiok') return apps.showToast('Błąd', 'Nie można usunąć Kosza!', 'error');
                    fileSystem[idx].parentId = 'hasiok'; 
                    fsManager.save(); desktop.render(); 
                    if(document.getElementById('app-aktowka').classList.contains('active')) fsManager.renderExplorerContent(fsManager.currentFolder);
                }
            },
            deletePermanent: (id) => {
                document.getElementById('context-menu').classList.remove('active');
                fileSystem = fileSystem.filter(i => i.id !== id);
                fsManager.save();
                if(document.getElementById('app-aktowka').classList.contains('active')) fsManager.renderExplorerContent(fsManager.currentFolder);
                apps.showToast('Hasiok', 'Usunięto bezpowrotnie.', 'success');
            },
            restoreItem: (id) => {
                document.getElementById('context-menu').classList.remove('active');
                const item = fileSystem.find(i => i.id === id);
                if(item) {
                    item.parentId = 'root'; 
                    fsManager.save(); desktop.render();
                    if(document.getElementById('app-aktowka').classList.contains('active')) fsManager.renderExplorerContent(fsManager.currentFolder);
                    apps.showToast('Hasiok', 'Przywrócono na Pulpit', 'success');
                }
            },
            emptyHasiok: () => {
                document.getElementById('context-menu').classList.remove('active');
                ui.showPrompt("POTWIERDŹ", "Wpisz 'TAK' aby opróżnić kosz trwale", "Opróżnij", (val) => {
                    if(val && val.toLowerCase() === 'tak') {
                        fileSystem = fileSystem.filter(i => i.parentId !== 'hasiok' || i.id === 'hasiok');
                        fsManager.save();
                        if(document.getElementById('app-aktowka').classList.contains('active')) fsManager.renderExplorerContent(fsManager.currentFolder);
                        apps.showToast('Hasiok', 'Kosz opróżniony', 'success');
                    }
                });
            },
            renameItem: (id) => {
                document.getElementById('context-menu').classList.remove('active');
                const item = fileSystem.find(i => i.id === id);
                if(item) {
                    ui.showPrompt("Zmień nazwę dla:", item.name, "Zapisz", (newName) => {
                        if(newName && newName.trim() !== '') { 
                            item.name = newName.trim(); fsManager.save(); 
                            if(item.parentId === 'root') desktop.render(); 
                            if(document.getElementById('app-aktowka').classList.contains('active') && fsManager.currentFolder === item.parentId) fsManager.renderExplorerContent(item.parentId);
                        }
                    });
                }
            },
            actionClipboard: (action, id) => {
                document.getElementById('context-menu').classList.remove('active');
                const item = fileSystem.find(i => i.id === id);
                if(item) clipboard = { action: action, item: {...item} };
            },
            pasteClipboard: () => {
                document.getElementById('context-menu').classList.remove('active');
                if(clipboard.item) {
                    let newItem = {...clipboard.item, id: 'item_'+Date.now(), parentId: fsManager.currentFolder, x: 20, y: 20};
                    if(fsManager.currentFolder === 'root' && desktop.lastContextX) {
                        newItem.x = Math.round(desktop.lastContextX / GRID) * GRID + 10;
                        newItem.y = Math.round(desktop.lastContextY / GRID) * GRID + 10;
                    }
                    if(clipboard.action === 'copy') newItem.name += ' - Kopia';
                    fileSystem.push(newItem);
                    if(clipboard.action === 'cut') {
                        fileSystem = fileSystem.filter(i => i.id !== clipboard.item.id);
                        clipboard.action = null; 
                    }
                    fsManager.save(); desktop.render(); 
                    if(document.getElementById('app-aktowka').classList.contains('active')) fsManager.renderExplorerContent(fsManager.currentFolder);
                }
            },
            showContextMenu: (e, targetType, id) => {
                e.preventDefault(); e.stopPropagation();
                const pos = getEventPos(e);
                desktop.lastContextX = pos.x; desktop.lastContextY = pos.y;
                
                const menu = document.getElementById('context-menu'); menu.innerHTML = '';
                const btnClass = "px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition";
                const sep = "<div class='border-t border-gray-200 dark:border-[#444] my-1'></div>";

                if(fsManager.currentFolder === 'hasiok') {
                    if(targetType !== 'desktop' && targetType !== 'folder_bg' && id !== 'hasiok') {
                        menu.innerHTML = `
                            <div class="${btnClass} text-green-600 font-bold" onclick="desktop.restoreItem('${id}')">Przywróć</div>
                            <div class="${btnClass} text-red-600 font-bold" onclick="desktop.deletePermanent('${id}')">Usuń trwale</div>
                        `;
                    } else {
                        menu.innerHTML = `<div class="${btnClass} font-bold text-red-600" onclick="desktop.emptyHasiok()">Opróżnij Kosz</div>`;
                    }
                }
                else if(id === 'hasiok') {
                    menu.innerHTML = `
                        <div class="${btnClass}" onclick="document.getElementById('context-menu').classList.remove('active'); fsManager.openFolder('hasiok')">Otwórz Kosz</div>
                        ${sep}
                        <div class="${btnClass} text-red-600 font-bold" onclick="desktop.emptyHasiok()">Opróżnij Kosz</div>
                    `;
                }
                else if(targetType === 'desktop' || targetType === 'folder_bg') {
                    const targetFolder = targetType === 'folder_bg' ? fsManager.currentFolder : 'root';
                    menu.innerHTML = `
                        <div class="${btnClass}" onclick="desktop.createFolder('${targetFolder}')">📁 Nowy Folder</div>
                        <div class="${btnClass}" onclick="desktop.createFile('${targetFolder}')">📄 Nowy Plik (.txt)</div>
                        ${sep}
                        <div class="${btnClass} ${!clipboard.item?'opacity-50 pointer-events-none':''}" onclick="desktop.pasteClipboard()">Wklej</div>
                    `;
                } else if (targetType === 'folder' || targetType === 'file' || targetType === 'app' || targetType === 'image') {
                    menu.innerHTML += `<div class="${btnClass}" onclick="desktop.actionClipboard('copy', '${id}')">Kopiuj</div>`;
                    if(targetType !== 'app') menu.innerHTML += `<div class="${btnClass}" onclick="desktop.actionClipboard('cut', '${id}')">Wytnij</div>`;
                    menu.innerHTML += `<div class="${btnClass}" onclick="desktop.renameItem('${id}')">Zmień nazwę</div>`;
                    menu.innerHTML += `<div class="${btnClass}" onclick="document.getElementById('context-menu').classList.remove('active'); apps.showToast('Właściwości', 'Informacje o pliku: ${desktop.escapeHTML(fileSystem.find(i=>i.id===id)?.name||id)}', 'info')">Właściwości</div>`;
                    menu.innerHTML += `${sep}<div class="${btnClass}" onclick="document.getElementById('context-menu').classList.remove('active'); apps.showToast('Sukces','Udostępniono element','success')">Udostępnij</div>`;
                    
                    if(targetType === 'file') menu.innerHTML += `${sep}<div class="${btnClass}" onclick="document.getElementById('context-menu').classList.remove('active'); desktop.executeItem(fileSystem.find(i=>i.id==='${id}'))">Otwórz za pomocą -> Skryba</div>`;
                    if(targetType === 'image') {
                        menu.innerHTML += `${sep}<div class="${btnClass}" onclick="document.getElementById('context-menu').classList.remove('active'); desktop.executeItem(fileSystem.find(i=>i.id==='${id}'))">Otwórz -> Patrzałka</div>`;
                        menu.innerHTML += `<div class="${btnClass}" onclick="document.getElementById('context-menu').classList.remove('active'); winManager.open('szkicownik'); setTimeout(()=>paintOpenFromFS('${id}'), 200);">Edytuj -> Szkicownik</div>`;
                    }
                    menu.innerHTML += `${sep}<div class="${btnClass} text-red-600" onclick="desktop.deleteItem('${id}')">Usuń</div>`;
                }
                
                menu.style.left = pos.x + 'px'; menu.style.top = pos.y + 'px';
                menu.classList.add('active');
            }
        };

        function handleDragMove(e) {
            if(!desktop.activeDrag) return;
            const pos = getEventPos(e);
            
            if(e.type === 'touchmove') e.preventDefault();
            
            requestAnimationFrame(() => {
                if(!desktop.activeDrag) return;
                
                if(desktop.activeDrag.type === 'icon_pending') {
                    if(Math.abs(pos.x - desktop.activeDrag.startX) > 5 || Math.abs(pos.y - desktop.activeDrag.startY) > 5) {
                        desktop.activeDrag.type = 'icon';
                        let ghost = desktop.activeDrag.el.cloneNode(true);
                        ghost.style.position = 'absolute'; ghost.style.left = pos.x + 'px'; ghost.style.top = pos.y + 'px'; ghost.style.opacity = '0.7'; ghost.style.pointerEvents = 'none'; ghost.style.zIndex = 10000; ghost.style.margin = '0';
                        document.body.appendChild(ghost); desktop.activeDrag.ghost = ghost; desktop.activeDrag.el.style.opacity = '0.3';
                    }
                }

                if(desktop.activeDrag.type === 'icon') {
                    let nx = pos.x - desktop.activeDrag.oX; let ny = pos.y - desktop.activeDrag.oY;
                    desktop.activeDrag.ghost.style.left = nx + 'px'; desktop.activeDrag.ghost.style.top = ny + 'px';
                } else if(desktop.activeDrag.type === 'window') {
                    let nx = pos.x - desktop.activeDrag.oX; let ny = pos.y - desktop.activeDrag.oY;
                    if(nx < 0) nx = 0; if(ny < 0) ny = 0;
                    const tbBound = window.innerHeight - 48 - desktop.activeDrag.el.offsetHeight;
                    if(ny > tbBound) ny = tbBound;
                    desktop.activeDrag.el.style.left = nx + 'px'; desktop.activeDrag.el.style.top = ny + 'px';
                }
            });
        }

        function handleDragEnd(e) {
            if(desktop.activeDrag) {
                if(desktop.activeDrag.type === 'icon') {
                    desktop.activeDrag.el.style.opacity = '1';
                    if(desktop.activeDrag.ghost) desktop.activeDrag.ghost.remove();
                    
                    const pos = getEventPos(e);
                    desktop.activeDrag.el.style.display = 'none';
                    let elBelow = document.elementFromPoint(pos.x, pos.y);
                    desktop.activeDrag.el.style.display = 'flex';
                    
                    let targetIcon = elBelow ? elBelow.closest('.desktop-icon') || elBelow.closest('.folder-item') : null;
                    
                    if(targetIcon && targetIcon.dataset.id !== desktop.activeDrag.ref.id) {
                        let targetItem = fileSystem.find(i => i.id === targetIcon.dataset.id);
                        if(targetItem && targetItem.type === 'folder' && targetItem.id !== 'hasiok') { 
                            desktop.activeDrag.ref.parentId = targetItem.id; fsManager.save(); desktop.render();
                            if(document.getElementById('app-aktowka').classList.contains('active')) fsManager.renderExplorerContent(fsManager.currentFolder);
                            desktop.activeDrag = null; return;
                        } else if(targetItem && targetItem.id === 'hasiok') {
                            desktop.activeDrag.ref.parentId = 'hasiok'; fsManager.save(); desktop.render();
                            if(document.getElementById('app-aktowka').classList.contains('active')) fsManager.renderExplorerContent(fsManager.currentFolder);
                            desktop.activeDrag = null; return;
                        }
                    }

                    if(!elBelow || elBelow.id === 'desktop-area' || elBelow.id === 'desktop-bg') {
                        if(desktop.activeDrag.ref.parentId !== 'root') desktop.activeDrag.ref.parentId = 'root';
                        let rawX = pos.x - desktop.activeDrag.oX; let rawY = pos.y - desktop.activeDrag.oY;
                        let snapX = Math.round(rawX / GRID) * GRID + 10; let snapY = Math.round(rawY / GRID) * GRID + 10;
                        desktop.activeDrag.ref.x = snapX; desktop.activeDrag.ref.y = snapY; fsManager.save();
                    }
                    desktop.render();
                    if(document.getElementById('app-aktowka').classList.contains('active')) fsManager.renderExplorerContent(fsManager.currentFolder);

                }
            }
            desktop.activeDrag = null;
        }

        document.addEventListener('mousemove', handleDragMove); document.addEventListener('touchmove', handleDragMove, {passive: false});
        document.addEventListener('mouseup', handleDragEnd); document.addEventListener('touchend', handleDragEnd);

        document.addEventListener('mousedown', (e) => {
            if(!e.target.closest('#start-menu') && !e.target.closest('button[onclick="apps.toggleStartMenu()"]')) document.getElementById('start-menu').classList.add('hidden');
            if(!e.target.closest('#calendar-widget') && !e.target.closest('button[onclick="apps.toggleCalendar(event)"]') && !e.target.closest('button[onclick*="changeCalendarMonth"]')) document.getElementById('calendar-widget').classList.add('hidden-cal');
            if(!e.target.closest('#context-menu') && e.button !== 2 && !e.target.closest('#system-prompt-modal') && !e.target.closest('#paint-resize-modal')) document.getElementById('context-menu').classList.remove('active');
        });