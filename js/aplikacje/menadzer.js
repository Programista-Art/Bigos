// ======================================================================
// PLIK: js/aplikacje/menadzer.js (Menedżer Aplikacji - Zarządzanie i Wymiana)
// ======================================================================

const menadzerApp = {
    lastScriptCount: -1,

    init: () => {
        menadzerApp.upgradeUI();
        
        // 1. Automatyczna rejestracja w systemie (NATYCHMIASTOWA)
        if (typeof defaultApps !== 'undefined' && !defaultApps.find(a => a.appId === 'menadzer')) {
            defaultApps.push({ id: 'app_menadzer', type: 'app', name: 'Menedżer Aplikacji', icon: '⚙️', appId: 'menadzer' });
        }

        // 2. Automatyczne dodanie przycisku do Szuflady (Menu Start)
        setTimeout(() => {
            const startMenu = document.getElementById('start-menu-list');
            if (startMenu && !document.getElementById('start-btn-menadzer')) {
                const btn = document.createElement('button');
                btn.id = 'start-btn-menadzer';
                btn.className = 'start-item flex items-center gap-3 p-2 hover:bg-white/10 rounded w-full text-left transition g-text font-medium';
                btn.onclick = () => { winManager.open('menadzer'); apps.toggleStartMenu(); };
                btn.innerHTML = `<span class="text-xl drop-shadow-sm">⚙️</span> <span class="app-name">Menedżer Aplikacji</span>`;
                
                const headers = startMenu.querySelectorAll('.start-header');
                if (headers.length > 1) startMenu.insertBefore(btn, headers[1]);
                else startMenu.appendChild(btn);
            }
        }, 500);

        // 3. Auto-odświeżanie listy na żywo (Live Reload)
        setInterval(() => {
            const win = document.getElementById('app-menadzer');
            if (win && win.classList.contains('active')) {
                if (typeof fileSystem !== 'undefined') {
                    const currentCount = fileSystem.filter(f => f.type === 'bigos_app_script').length;
                    if (currentCount !== menadzerApp.lastScriptCount) {
                        menadzerApp.renderList();
                    }
                }
            }
        }, 1000);
    },

    upgradeUI: () => {
        let appWindow = document.getElementById('app-menadzer');
        if (!appWindow) { 
            appWindow = document.createElement('div');
            appWindow.id = 'app-menadzer';
            appWindow.className = 'window absolute hidden';
            
            appWindow.addEventListener('mousedown', function() { 
                if(typeof winManager !== 'undefined') winManager.bringToFront(this); 
            });
            
            document.body.appendChild(appWindow);
        }

        appWindow.style.width = '650px';
        appWindow.style.height = '550px';
        appWindow.style.background = 'transparent';
        appWindow.style.border = 'none';
        appWindow.style.boxShadow = 'none';
        
        appWindow.innerHTML = `
            <div class="flex flex-col h-full themed-app g-panel border g-border rounded-lg shadow-2xl overflow-hidden">
                <div class="px-4 py-3 border-b g-border flex justify-between items-center bg-black/30 cursor-move shrink-0" onmousedown="winManager.startDrag(event, 'app-menadzer')" ontouchstart="winManager.startDrag(event, 'app-menadzer')">
                    <span class="text-sm font-bold g-accent drop-shadow-md flex items-center gap-2"><span>⚙️</span> Menedżer Aplikacji</span>
                    <div class="flex gap-2">
                        <button onclick="winManager.minimize('menadzer')" class="g-icon-btn px-1 hover:text-white transition">_</button>
                        <button onclick="winManager.close('menadzer')" class="text-red-500 hover:text-red-400 px-1 font-bold transition">✖</button>
                    </div>
                </div>
                
                <div class="bg-blue-600/10 border-b border-blue-500/30 p-3 shrink-0 flex justify-between items-center flex-wrap gap-3">
                    <p class="text-xs g-text-muted leading-relaxed flex-1 min-w-[150px]">
                        Zarządzaj oprogramowaniem BigOS. Systemowe aplikacje są wbudowane.
                    </p>
                    <div class="flex gap-2 shrink-0 flex-wrap justify-end">
                        <button onclick="menadzerApp.arrangeDesktop()" class="g-btn px-3 py-2 bg-yellow-600/20 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500 hover:text-white rounded-lg transition font-bold text-[10px] shadow-md">
                            🧹 Uporządkuj
                        </button>
                        <button onclick="menadzerApp.repairDesktop()" class="g-btn px-3 py-2 bg-blue-600/20 text-blue-400 border-blue-500/50 hover:bg-blue-500 hover:text-white rounded-lg transition font-bold text-[10px] shadow-md">
                            🛟 Przywróć Ikony
                        </button>
                        <button onclick="document.getElementById('menadzer-import-file').click()" class="g-btn px-3 py-2 bg-emerald-600/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500 hover:text-white rounded-lg transition font-bold text-[10px] shadow-md">
                            📥 Import (.js)
                        </button>
                    </div>
                    <input type="file" id="menadzer-import-file" class="hidden" accept=".js,.txt" onchange="menadzerApp.importApp(event)">
                </div>

                <div class="flex-grow p-4 bg-black/10 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                    <h3 class="text-[10px] uppercase tracking-widest font-bold g-text-muted mb-1">Lista Oprogramowania</h3>
                    <div id="menadzer-list" class="flex flex-col gap-2">
                        <!-- Generowane z JS -->
                    </div>
                </div>
            </div>
        `;
        
        menadzerApp.renderList();
    },

    // ==================================================================
    // 🧹 NOWOŚĆ: PORZĄDKOWANIE PULPITU (Sortowanie w Siatkę)
    // ==================================================================
    arrangeDesktop: () => {
        if (typeof fileSystem === 'undefined') return;

        let col = 0;
        let row = 0;
        const maxRows = Math.max(1, Math.floor((window.innerHeight - 120) / 100));

        // Bierzemy tylko pliki przypisane bezpośrednio do pulpitu
        const desktopItems = fileSystem.filter(f => f.parentId === 'root');

        // Inteligentne sortowanie: Foldery -> Aplikacje -> Reszta plików (Alfabetycznie)
        desktopItems.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            if (a.type === 'app' && b.type !== 'app') return -1;
            if (a.type !== 'app' && b.type === 'app') return 1;
            return a.name.localeCompare(b.name);
        });

        // Wymuszamy nowe, sztywne współrzędne X i Y dla wszystkich plików
        desktopItems.forEach(item => {
            item.x = 30 + (col * 90);
            item.y = 30 + (row * 100);

            row++;
            if (row >= maxRows) {
                row = 0;
                col++;
            }
        });

        if (typeof fsManager !== 'undefined') fsManager.save();
        if (typeof desktop !== 'undefined') desktop.render();
        if (typeof apps !== 'undefined') apps.showToast('Pulpit', 'Wszystkie ikony zostały idealnie wyrównane!', 'success');
    },

    repairDesktop: () => {
        if (typeof defaultApps === 'undefined' || typeof fileSystem === 'undefined') return;
        let added = 0;
        
        const getFreePosition = () => {
            let placed = false, checkX = 30, checkY = 30, col = 0, row = 0;
            const maxRows = Math.max(1, Math.floor((window.innerHeight - 120) / 100)); 
            while (!placed) {
                checkX = 30 + (col * 90); checkY = 30 + (row * 100); 
                const isOccupied = fileSystem.some(f => f.parentId === 'root' && Math.abs(f.x - checkX) < 40 && Math.abs(f.y - checkY) < 40);
                if (!isOccupied) { placed = true; return { x: checkX, y: checkY }; }
                row++;
                if (row >= maxRows) { row = 0; col++; }
                if (col > 20) return { x: 50 + Math.random() * 200, y: 50 + Math.random() * 200 };
            }
            return { x: 30, y: 30 }; 
        };

        defaultApps.forEach(app => {
            if (app.type === 'app' && !fileSystem.find(f => f.appId === app.appId)) {
                const pos = getFreePosition();
                fileSystem.push({
                    id: app.id || 'app_' + app.appId, type: 'app', name: app.name, icon: app.icon || '📦',
                    appId: app.appId, parentId: 'root', x: pos.x, y: pos.y
                });
                added++;
            }
        });
        
        if (added > 0) {
            if (typeof fsManager !== 'undefined') fsManager.save(); 
            if (typeof desktop !== 'undefined') desktop.render();   
            if (typeof apps !== 'undefined') apps.showToast('Naprawa', `Przywrócono ${added} ikon na Pulpicie!`, 'success');
        } else {
            if (typeof apps !== 'undefined') apps.showToast('Pulpit w porządku', 'Systemowe ikony już tu są.', 'info');
        }
    },

    renderList: () => {
        const list = document.getElementById('menadzer-list');
        if (!list) return;
        list.innerHTML = '';
        
        if (typeof defaultApps === 'undefined' || typeof fileSystem === 'undefined') return;

        const customScripts = fileSystem.filter(f => f.type === 'bigos_app_script');
        menadzerApp.lastScriptCount = customScripts.length;
        
        const customAppsMap = {};
        customScripts.forEach(script => {
            let match = script.content.match(/id:\s*['"]([^'"]+)['"]/);
            if (match && match[1]) customAppsMap[match[1]] = script;
        });

        if (defaultApps.length === 0) { list.innerHTML = '<div class="text-center p-4 g-text-muted text-sm">Brak aplikacji.</div>'; return; }

        defaultApps.forEach(appInfo => {
            const isCustom = customAppsMap[appInfo.appId] !== undefined;
            const script = customAppsMap[appInfo.appId];
            
            const badge = isCustom 
                ? '<span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[8px] uppercase tracking-wider border border-blue-500/30 font-bold">Zewnętrzna</span>' 
                : '<span class="px-2 py-0.5 rounded bg-gray-500/20 text-gray-400 text-[8px] uppercase tracking-wider border border-gray-500/30 font-bold">Systemowa</span>';

            const buttons = isCustom 
                ? `<button onclick="menadzerApp.exportApp('${script.id}', '${appInfo.appId}')" class="g-btn border-blue-500/50 text-blue-400 bg-blue-500/10 hover:bg-blue-500 hover:text-white px-3 py-1.5 rounded font-bold text-xs transition drop-shadow-sm shadow-md">📤 Eksportuj</button>
                   <button onclick="menadzerApp.uninstall('${script.id}', '${appInfo.appId}')" class="g-btn border-red-500/50 text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded font-bold text-xs transition drop-shadow-sm shadow-md">🗑 Odinstaluj</button>`
                : `<span class="text-[10px] g-text-muted italic px-2 w-full sm:w-auto text-right">Zintegrowana z BigOS</span>`;

            list.innerHTML += `
                <div class="flex justify-between items-center p-3 g-bg border g-border rounded-lg shadow-sm hover:bg-white/5 transition flex-wrap gap-2">
                    <div class="flex flex-col truncate pr-2 flex-grow min-w-[180px]">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-bold g-text text-sm truncate"><span class="mr-2">${appInfo.icon || '📦'}</span> ${appInfo.name}</span>
                            ${badge}
                        </div>
                        <span class="text-[9px] font-mono text-emerald-400 truncate">ID: ${appInfo.appId}</span>
                    </div>
                    <div class="flex gap-2 shrink-0 items-center justify-end w-full sm:w-auto">
                        ${buttons}
                    </div>
                </div>
            `;
        });
        
        customScripts.forEach(script => {
            let match = script.content.match(/id:\s*['"]([^'"]+)['"]/);
            let appId = match ? match[1] : null;
            if (!appId || !defaultApps.find(a => a.appId === appId)) {
                 list.innerHTML += `
                    <div class="flex justify-between items-center p-3 bg-red-900/10 border border-red-500/30 rounded-lg shadow-sm hover:bg-red-900/20 transition flex-wrap gap-2">
                        <div class="flex flex-col truncate pr-2 flex-grow min-w-[150px]">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="font-bold text-red-400 text-sm truncate"><span class="mr-2">⚠️</span> Niezarejestrowany Skrypt</span>
                                <span class="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[8px] uppercase tracking-wider border border-red-500/30 font-bold">Błąd</span>
                            </div>
                            <span class="text-[9px] font-mono text-red-500 truncate">ID Pliku: ${script.id}</span>
                        </div>
                        <div class="flex gap-2 shrink-0 items-center justify-end w-full sm:w-auto">
                            <button onclick="menadzerApp.uninstall('${script.id}', null)" class="g-btn border-red-500/50 text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded font-bold text-xs transition drop-shadow-sm shadow-md">🗑 Usuń</button>
                        </div>
                    </div>
                `;
            }
        });
    },

    exportApp: (scriptFileId, fileNamePrefix) => {
        const script = fileSystem.find(f => f.id === scriptFileId);
        if(!script) return;
        const blob = new Blob([script.content], { type: 'application/javascript;charset=utf-8;' });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${fileNamePrefix}_bigos.js`; link.click();
        if(typeof apps !== 'undefined') apps.showToast('Eksport', 'Aplikacja zapisana na dysku PC.', 'success');
    },

    importApp: (e) => {
        const file = e.target.files[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const code = ev.target.result;
            try {
                if(!code.includes('BigOSAppAPI.register')) throw new Error("Brak BigOSAppAPI.register w pliku.");
                try { new Function(code); } catch (syntaxErr) { throw new Error("Uszkodzony plik! Błąd JS: " + syntaxErr.message); }
                
                const scriptEl = document.createElement('script'); scriptEl.textContent = code; document.body.appendChild(scriptEl);
                if(typeof fileSystem !== 'undefined' && typeof fsManager !== 'undefined') {
                    if (!fileSystem.find(f => f.type === 'bigos_app_script' && f.content === code)) {
                        fileSystem.push({ id: 'script_' + Date.now(), type: 'bigos_app_script', name: 'Aplikacja z pliku', icon: '⚙️', content: code, parentId: 'system_hidden' });
                        fsManager.save();
                    }
                }
                if(typeof apps !== 'undefined') apps.showToast('Sukces', 'Zainstalowano!', 'success');
                menadzerApp.renderList();
            } catch(err) { if(typeof apps !== 'undefined') apps.showToast('Błąd Instalacji', err.message, 'error'); }
        };
        reader.readAsText(file); e.target.value = '';
    },

    showConfirmModal: (title, msg, confirmText, onConfirm) => {
        const modalId = 'menadzer-confirm-modal';
        let modal = document.getElementById(modalId); if(modal) modal.remove();

        modal = document.createElement('div'); modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-sm w-full border g-border">
                <h2 class="text-xl font-bold g-text mb-4 border-b g-border pb-2 flex items-center gap-2"><span class="text-red-500 drop-shadow">⚠️</span> ${title}</h2>
                <p class="text-sm g-text-muted mb-6 leading-relaxed">${msg}</p>
                <div class="flex gap-3 justify-end">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-5 py-2 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border shadow-sm">Anuluj</button>
                    <button id="menadzer-confirm-ok" class="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg shadow-red-600/30 transition font-bold border border-red-700">${confirmText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('menadzer-confirm-ok').onclick = () => { onConfirm(); modal.remove(); };
    },

    uninstall: (scriptFileId, appId) => {
        menadzerApp.showConfirmModal("Odinstaluj Aplikację", "Czy usunąć program z systemu BigOS?<br><br>Ikona zniknie z Pulpitu oraz Menu Start.", "Usuń Trwale", () => { menadzerApp.executeUninstall(scriptFileId, appId); });
    },

    executeUninstall: (scriptFileId, appId) => {
        const scriptIdx = fileSystem.findIndex(f => f.id === scriptFileId);
        if (scriptIdx > -1) fileSystem.splice(scriptIdx, 1);
        
        if (appId) {
            for (let i = fileSystem.length - 1; i >= 0; i--) { if (fileSystem[i].type === 'app' && fileSystem[i].appId === appId) fileSystem.splice(i, 1); }
            if (typeof defaultApps !== 'undefined') {
                const dIdx = defaultApps.findIndex(a => a.appId === appId);
                if (dIdx > -1) defaultApps.splice(dIdx, 1);
            }
            const startBtn = document.getElementById('start-btn-' + appId); if (startBtn) startBtn.remove();
            if (typeof winManager !== 'undefined') winManager.close(appId);
            const win = document.getElementById('app-' + appId); if (win) win.remove();
        }
        
        if (typeof fsManager !== 'undefined') fsManager.save();
        if (typeof desktop !== 'undefined') desktop.render();
        menadzerApp.renderList();
        if(typeof apps !== 'undefined') apps.showToast('Odinstalowano', 'Aplikacja pomyślnie usunięta.', 'success');
    }
};

setTimeout(menadzerApp.init, 500);
window.menadzerApp = menadzerApp;