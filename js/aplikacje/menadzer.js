// ======================================================================
// PLIK: js/aplikacje/menadzer.js (Menedżer Aplikacji - Zarządzanie i Wymiana)
// ======================================================================

const menadzerApp = {
    lastScriptCount: -1,

    init: () => {
        menadzerApp.upgradeUI();
        
        // 1. Automatyczna rejestracja w systemie (jeśli brakuje w globals.js)
        if (typeof defaultApps !== 'undefined' && !defaultApps.find(a => a.appId === 'menadzer')) {
            defaultApps.push({ id: 'app_menadzer', type: 'app', name: 'Menedżer Aplikacji', icon: '⚙️', appId: 'menadzer' });
        }

        // 2. Automatyczne dodanie przycisku do Szuflady (Menu Start)
        const startMenu = document.getElementById('start-menu-list');
        if (startMenu && !document.getElementById('start-btn-menadzer')) {
            const btn = document.createElement('button');
            btn.id = 'start-btn-menadzer';
            btn.className = 'start-item flex items-center gap-3 p-2 hover:bg-white/10 rounded w-full text-left transition g-text font-medium';
            btn.onclick = () => { winManager.open('menadzer'); apps.toggleStartMenu(); };
            btn.innerHTML = `<span class="text-xl drop-shadow-sm">⚙️</span> <span class="app-name">Menedżer Aplikacji</span>`;
            
            // Wstawiamy przed sekcją Gry (jeśli istnieje) lub na końcu
            const headers = startMenu.querySelectorAll('.start-header');
            if (headers.length > 1) startMenu.insertBefore(btn, headers[1]);
            else startMenu.appendChild(btn);
        }

        // 3. Automatyczne dodanie ikony na Pulpit (jeśli brakuje)
        if (typeof fileSystem !== 'undefined' && !fileSystem.find(f => f.appId === 'menadzer')) {
            fileSystem.push({
                id: 'app_menadzer', type: 'app', name: 'Menedżer Aplikacji', icon: '⚙️', appId: 'menadzer',
                parentId: 'root', x: Math.floor(Math.random() * 100) + 50, y: Math.floor(Math.random() * 100) + 50
            });
            if (typeof fsManager !== 'undefined') fsManager.save();
            if (typeof desktop !== 'undefined') desktop.render();
        }

        // 4. Auto-odświeżanie listy na żywo (Live Reload)
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

        appWindow.style.width = '550px';
        appWindow.style.height = '500px';
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
                    <p class="text-xs g-text-muted leading-relaxed flex-1 min-w-[200px]">
                        Zarządzaj aplikacjami z <b class="g-text">BigAI</b>. Możesz je usuwać, eksportować by wysłać znajomym, lub instalować z pobranych plików.
                    </p>
                    <button onclick="document.getElementById('menadzer-import-file').click()" class="g-btn px-4 py-2 bg-emerald-600/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500 hover:text-white rounded-lg transition font-bold text-xs shadow-md shrink-0">
                        📥 Zainstaluj z pliku (.js)
                    </button>
                    <input type="file" id="menadzer-import-file" class="hidden" accept=".js,.txt" onchange="menadzerApp.importApp(event)">
                </div>

                <div class="flex-grow p-4 bg-black/10 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                    <h3 class="text-[10px] uppercase tracking-widest font-bold g-text-muted mb-1">Zainstalowane Oprogramowanie</h3>
                    <div id="menadzer-list" class="flex flex-col gap-2">
                        <!-- Generowane z JS -->
                    </div>
                </div>
            </div>
        `;
        
        menadzerApp.renderList();
    },

    renderList: () => {
        const list = document.getElementById('menadzer-list');
        if (!list) return;
        list.innerHTML = '';
        
        if (typeof fileSystem === 'undefined') return;

        // Szukamy wszystkich skryptów zadeklarowanych jako aplikacje BigAI
        const customScripts = fileSystem.filter(f => f.type === 'bigos_app_script');
        menadzerApp.lastScriptCount = customScripts.length; // Zapisujemy stan
        
        if (customScripts.length === 0) {
            list.innerHTML = `
                <div class="text-center flex flex-col items-center justify-center p-6 border border-dashed g-border rounded-lg mt-4 bg-black/5">
                    <span class="text-4xl drop-shadow-md mb-3 opacity-50">📦</span>
                    <span class="text-sm font-bold g-text">Brak dodatkowych aplikacji.</span>
                    <span class="text-xs g-text-muted mt-1">Poproś BigAI o napisanie dla Ciebie programu lub zainstaluj z pliku!</span>
                </div>
            `;
            return;
        }
        
        customScripts.forEach(script => {
            let name = script.name;
            let appId = '';
            
            // Próba odczytania właściwego ID z kodu aplikacji
            let match = script.content.match(/id:\s*['"]([^'"]+)['"]/);
            if (match && match[1]) {
                appId = match[1];
                const appInfo = typeof defaultApps !== 'undefined' ? defaultApps.find(a => a.appId === appId) : null;
                if (appInfo) {
                    name = `<span class="mr-2">${appInfo.icon}</span> ${appInfo.name}`;
                } else {
                    name = `<span>📦</span> Aplikacja (${appId})`;
                }
            } else {
                name = `<span>📄</span> Niezidentyfikowany skrypt`;
            }
            
            list.innerHTML += `
                <div class="flex justify-between items-center p-3 g-bg border g-border rounded-lg shadow-sm hover:bg-white/5 transition flex-wrap gap-2">
                    <div class="flex flex-col truncate pr-2 flex-grow min-w-[150px]">
                        <span class="font-bold g-text text-sm truncate">${name}</span>
                        <span class="text-[9px] font-mono text-emerald-400 mt-1 truncate">ID: ${appId || script.id}</span>
                    </div>
                    <div class="flex gap-2 shrink-0">
                        <button onclick="menadzerApp.exportApp('${script.id}', '${appId || 'app'}')" class="g-btn border-blue-500/50 text-blue-400 bg-blue-500/10 hover:bg-blue-500 hover:text-white px-3 py-1.5 rounded font-bold text-xs transition drop-shadow-sm shadow-md">📤 Eksportuj</button>
                        <button onclick="menadzerApp.uninstall('${script.id}', '${appId}')" class="g-btn border-red-500/50 text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded font-bold text-xs transition drop-shadow-sm shadow-md">🗑 Odinstaluj</button>
                    </div>
                </div>
            `;
        });
    },

    // ==================================================================
    // INSTALACJA I EKSPORT APLIKACJI Z ZABEZPIECZENIEM
    // ==================================================================
    exportApp: (scriptFileId, fileNamePrefix) => {
        const script = fileSystem.find(f => f.id === scriptFileId);
        if(!script) return;
        const blob = new Blob([script.content], { type: 'application/javascript;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${fileNamePrefix}_bigos.js`;
        link.click();
        if(typeof apps !== 'undefined') apps.showToast('Eksport', 'Aplikacja zapisana na dysku PC.', 'success');
    },

    importApp: (e) => {
        const file = e.target.files[0];
        if(!file) return;
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            const code = ev.target.result;
            try {
                // Weryfikacja czy skrypt używa bezpiecznego i aktualnego API
                if(!code.includes('BigOSAppAPI.register')) {
                    throw new Error("Plik nie wygląda na poprawną aplikację BigOS (brak BigOSAppAPI.register).");
                }

                // --- NOWE ZABEZPIECZENIE: Sprawdzamy czy plik od znajomego nie ma błędów składni ---
                try {
                    new Function(code);
                } catch (syntaxErr) {
                    throw new Error("Uszkodzony plik! Błąd Składni JS: " + syntaxErr.message);
                }
                
                // Uruchomienie kodu aby wyrenderował aplikację
                const scriptEl = document.createElement('script');
                scriptEl.textContent = code;
                document.body.appendChild(scriptEl);
                
                // Zapisanie skryptu w dysku (IndexedDB)
                if(typeof fileSystem !== 'undefined' && typeof fsManager !== 'undefined') {
                    const existing = fileSystem.find(f => f.type === 'bigos_app_script' && f.content === code);
                    if (!existing) {
                        fileSystem.push({
                            id: 'script_' + Date.now(),
                            type: 'bigos_app_script',
                            name: 'Aplikacja z pliku',
                            icon: '⚙️',
                            content: code,
                            parentId: 'system_hidden'
                        });
                        fsManager.save();
                    }
                }
                
                if(typeof apps !== 'undefined') apps.showToast('Zainstalowano', 'Aplikacja z pliku dodana do systemu!', 'success');
                menadzerApp.renderList();
            } catch(err) {
                console.error("Błąd instalacji:", err);
                if(typeof apps !== 'undefined') apps.showToast('Błąd Instalacji', err.message || 'Wystąpił błąd w trakcie wgrywania.', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    },

    // ==================================================================
    // DEDYKOWANE OKNO MODALNE DO DEINSTALACJI
    // ==================================================================
    showConfirmModal: (title, msg, confirmText, onConfirm) => {
        const modalId = 'menadzer-confirm-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm';
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-sm w-[90%] border g-border">
                <h2 class="text-xl font-bold g-text mb-4 border-b g-border pb-2 flex items-center gap-2"><span class="text-red-500 drop-shadow">⚠️</span> ${title}</h2>
                <p class="text-sm g-text-muted mb-6 leading-relaxed">${msg}</p>
                <div class="flex gap-3 justify-end">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-5 py-2 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border shadow-sm">Anuluj</button>
                    <button id="menadzer-confirm-ok" class="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg shadow-red-600/30 transition font-bold border border-red-700">${confirmText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        document.getElementById('menadzer-confirm-ok').onclick = () => {
            onConfirm();
            modal.remove();
        };
    },

    uninstall: (scriptFileId, appId) => {
        menadzerApp.showConfirmModal(
            "Odinstaluj Aplikację", 
            "Czy na pewno chcesz usunąć ten program z systemu BigOS?<br><br>Ikona zniknie z Pulpitu oraz Menu Start.", 
            "Usuń Trwale", 
            () => {
                menadzerApp.executeUninstall(scriptFileId, appId);
            }
        );
    },

    executeUninstall: (scriptFileId, appId) => {
        // 1. Usunięcie fizycznego pliku ze skryptem z bazy
        fileSystem = fileSystem.filter(f => f.id !== scriptFileId);
        
        if (appId) {
            // 2. Usunięcie skrótów z pulpitu (ikon)
            fileSystem = fileSystem.filter(f => !(f.type === 'app' && f.appId === appId));
            
            // 3. Wyrejestrowanie z rejestru jądra (defaultApps)
            if (typeof defaultApps !== 'undefined') {
                const dIdx = defaultApps.findIndex(a => a.appId === appId);
                if (dIdx > -1) defaultApps.splice(dIdx, 1);
            }
            
            // 4. Fizyczne usunięcie przypięcia z Menu Start
            const startBtn = document.getElementById('start-btn-' + appId);
            if (startBtn) startBtn.remove();
            
            // 5. Zniszczenie renderowanego okna (jeśli było otwarte)
            if (typeof winManager !== 'undefined') winManager.close(appId);
            const win = document.getElementById('app-' + appId);
            if (win) win.remove();
        }
        
        // Zapis do IndexedDB
        if (typeof fsManager !== 'undefined') fsManager.save();
        if (typeof desktop !== 'undefined') desktop.render();
        
        menadzerApp.renderList();
        if(typeof apps !== 'undefined') apps.showToast('Odinstalowano', 'Aplikacja pomyślnie usunięta.', 'success');
    }
};

setTimeout(menadzerApp.init, 500);
window.menadzerApp = menadzerApp;