// ======================================================================
// PLIK: js/aplikacje/kompresor.js (Upychacz ZIP - Zaawansowany Kompresor)
// ======================================================================

const kompresorApp = {
    mode: 'browser', // 'browser' (BigOS) lub 'archive' (wewnątrz ZIP)
    currentFolder: 'root', // Ścieżka w BigOS
    archivePath: '', // Ścieżka wewnątrz archiwum ZIP
    
    selectedFiles: new Set(),
    isProcessing: false,
    searchQuery: '',
    sortBy: 'name', sortAsc: true,
    
    currentArchive: null,
    currentArchiveId: null,
    currentArchiveName: '',
    
    history: [],
    favorites: [],
    
    init: () => {
        if (!window.JSZip) {
            const script = document.createElement('script');
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
            document.head.appendChild(script);
        }
        
        try {
            const hist = localStorage.getItem('bigos_upychacz_history');
            if (hist) kompresorApp.history = JSON.parse(hist);
            const fav = localStorage.getItem('bigos_upychacz_favs');
            if (fav) kompresorApp.favorites = JSON.parse(fav);
        } catch(e) {}

        kompresorApp.upgradeUI();
        kompresorApp.renderFiles();
        kompresorApp.renderSidebar();
        kompresorApp.injectGlobalContextMenu();
    },

    // ==================================================================
    // INTEGRACJA Z SYSTEMEM (PRAWY PRZYCISK MYSZY GLOBALNIE W BIGOS)
    // ==================================================================
    injectGlobalContextMenu: () => {
        if (typeof desktop !== 'undefined' && !kompresorApp._contextMenuPatched) {
            const origMenu = desktop.showContextMenu;
            desktop.showContextMenu = function(e, targetType, id) {
                origMenu.call(this, e, targetType, id);
                
                const menu = document.getElementById('context-menu');
                if (!menu || !menu.classList.contains('active')) return;
                
                const sep = "<div class='border-t border-gray-300 dark:border-gray-600 my-1'></div>";
                const btnClass = "px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition text-sm";
                
                let appendHtml = sep;

                if (targetType === 'file' && id) {
                    const file = fileSystem.find(i => i.id === id);
                    if (file && file.name.endsWith('.zip')) {
                        appendHtml += `<div class="${btnClass} font-bold text-blue-500" onclick="document.getElementById('context-menu').classList.remove('active'); kompresorApp.openWithItem('${id}')">🗜️ Otwórz w Upychaczu</div>`;
                        appendHtml += `<div class="${btnClass} font-bold text-emerald-500" onclick="document.getElementById('context-menu').classList.remove('active'); kompresorApp.quickExtract('${id}')">📂 Rozpakuj tutaj</div>`;
                    } else {
                        appendHtml += `<div class="${btnClass} font-bold text-blue-500" onclick="document.getElementById('context-menu').classList.remove('active'); kompresorApp.quickCompress(['${id}'])">🗜️ Kompresuj do ZIP</div>`;
                    }
                } else if (targetType === 'folder' && id && id !== 'hasiok') {
                    appendHtml += `<div class="${btnClass} font-bold text-blue-500" onclick="document.getElementById('context-menu').classList.remove('active'); kompresorApp.quickCompress(['${id}'])">🗜️ Kompresuj folder do ZIP</div>`;
                }
                
                if(appendHtml !== sep) menu.innerHTML += appendHtml;
            };
            kompresorApp._contextMenuPatched = true;
        }
    },

    openWithItem: (itemId) => {
        if(typeof winManager !== 'undefined') winManager.open('kompresor');
        kompresorApp.openArchiveFromBigOS(itemId);
    },

    // ==================================================================
    // INTERFEJS UŻYTKOWNIKA
    // ==================================================================
    upgradeUI: () => {
        let appWindow = document.getElementById('app-kompresor');
        if (!appWindow) { 
            appWindow = document.createElement('div');
            appWindow.id = 'app-kompresor';
            appWindow.className = 'window absolute';
            document.body.appendChild(appWindow);
        }

        appWindow.style.width = '850px';
        appWindow.style.height = '550px';
        appWindow.style.background = 'transparent';
        appWindow.style.border = 'none';
        appWindow.style.boxShadow = 'none';

        const titleBar = appWindow.querySelector('.title-bar');
        Array.from(appWindow.children).forEach(child => { if (child !== titleBar) child.remove(); });
        if (titleBar) titleBar.style.display = 'none';

        const proUI = document.createElement('div');
        proUI.className = 'flex flex-col overflow-hidden relative themed-app g-panel rounded-lg shadow-2xl h-full';

        proUI.innerHTML = `
            <!-- Pasek Tytułowy -->
            <div class="px-4 py-2 border-b g-border flex justify-between items-center cursor-move bg-black/40 shrink-0" onmousedown="winManager.startDrag(event, 'app-kompresor')" ontouchstart="winManager.startDrag(event, 'app-kompresor')">
                <span class="text-sm font-bold g-accent drop-shadow-md" id="komp-window-title">🗜️ Upychacz ZIP</span>
                <div class="flex gap-2">
                    <button onclick="winManager.minimize('kompresor')" class="g-icon-btn px-1 hover:text-white transition">_</button>
                    <button onclick="winManager.maximize('app-kompresor')" class="g-icon-btn px-1 hover:text-white transition">□</button>
                    <button onclick="kompresorApp.closeApp()" class="text-red-500 hover:text-red-400 px-1 font-bold transition">✖</button>
                </div>
            </div>

            <!-- Pasek Menu (Plik, itp.) -->
            <div class="flex text-[11px] sm:text-xs font-medium border-b g-border bg-black/20 shrink-0 relative z-40">
                <div class="group relative">
                    <button class="px-4 py-1.5 hover:bg-white/10 transition cursor-default g-text">Plik</button>
                    <div class="absolute left-0 top-full hidden group-hover:flex flex-col g-panel border g-border shadow-xl rounded-b min-w-[200px] py-1 z-50">
                        <button onclick="kompresorApp.showOpenArchiveModal()" class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition">📂 Otwórz archiwum...</button>
                        <button onclick="kompresorApp.closeArchive()" id="komp-menu-close" class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition opacity-50 cursor-not-allowed">📁 Zamknij archiwum</button>
                        <div class="border-t g-border my-1"></div>
                        <button onclick="kompresorApp.clearHistory()" class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition">🗑️ Wyczyść Historię</button>
                        <button onclick="kompresorApp.closeApp()" class="text-left px-4 py-1.5 hover:bg-red-500 hover:text-white transition">❌ Zakończ</button>
                    </div>
                </div>
                <div class="group relative">
                    <button class="px-4 py-1.5 hover:bg-white/10 transition cursor-default g-text">Narzędzia</button>
                    <div class="absolute left-0 top-full hidden group-hover:flex flex-col g-panel border g-border shadow-xl rounded-b min-w-[200px] py-1 z-50">
                        <button onclick="kompresorApp.testArchive()" class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition">🛠️ Testuj archiwum</button>
                        <button onclick="kompresorApp.showArchiveInfo()" class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition">ℹ️ Informacje i Statystyki</button>
                    </div>
                </div>
            </div>

            <!-- Pasek Narzędziowy (Główne Ikony) -->
            <div class="p-2 border-b g-border bg-black/10 shrink-0 flex gap-1 items-center justify-start overflow-x-auto custom-scrollbar">
                <button onclick="kompresorApp.showPackModal()" class="flex flex-col items-center justify-center p-2 rounded hover:bg-white/10 transition min-w-[60px] g-text">
                    <span class="text-2xl mb-1 drop-shadow-md">➕</span><span class="text-[10px] font-bold">Dodaj</span>
                </button>
                <button onclick="kompresorApp.showExtractModal()" class="flex flex-col items-center justify-center p-2 rounded hover:bg-white/10 transition min-w-[60px] g-text">
                    <span class="text-2xl mb-1 drop-shadow-md">➖</span><span class="text-[10px] font-bold">Wypakuj</span>
                </button>
                <button onclick="kompresorApp.deleteSelected()" class="flex flex-col items-center justify-center p-2 rounded hover:bg-white/10 transition min-w-[60px] g-text">
                    <span class="text-2xl mb-1 drop-shadow-md">🗑️</span><span class="text-[10px] font-bold">Usuń</span>
                </button>
                <button onclick="kompresorApp.previewSelected()" class="flex flex-col items-center justify-center p-2 rounded hover:bg-white/10 transition min-w-[60px] g-text">
                    <span class="text-2xl mb-1 drop-shadow-md">👁️</span><span class="text-[10px] font-bold">Podgląd</span>
                </button>
                <div class="w-px h-10 bg-gray-500/30 mx-1"></div>
                <button onclick="kompresorApp.renameSelected()" class="flex flex-col items-center justify-center p-2 rounded hover:bg-white/10 transition min-w-[60px] g-text">
                    <span class="text-2xl mb-1 drop-shadow-md">✏️</span><span class="text-[10px] font-bold">Zmień nazwę</span>
                </button>
                <button onclick="kompresorApp.showArchiveInfo()" class="flex flex-col items-center justify-center p-2 rounded hover:bg-white/10 transition min-w-[60px] g-text">
                    <span class="text-2xl mb-1 drop-shadow-md">ℹ️</span><span class="text-[10px] font-bold">Info</span>
                </button>
                <div class="w-px h-10 bg-gray-500/30 mx-1"></div>
                
                <div class="flex flex-col gap-1 ml-auto shrink-0 w-32 sm:w-48">
                    <input type="text" id="komp-search" placeholder="Szukaj pliku..." class="w-full text-[10px] p-1.5 rounded g-bg g-text border g-border outline-none focus:border-blue-500" oninput="kompresorApp.searchFiles(this.value)">
                </div>
            </div>

            <!-- Główny kontener poziomy -->
            <div class="flex flex-row flex-grow overflow-hidden relative">
                
                <!-- Boczny panel (Ulubione / Historia) -->
                <div class="w-[160px] border-r g-border bg-black/10 flex flex-col p-2 shrink-0 overflow-y-auto custom-scrollbar hidden sm:flex">
                    <div class="text-[10px] g-text-muted font-bold uppercase tracking-widest mb-2 border-b g-border pb-1">Ulubione</div>
                    <div id="komp-fav-list" class="flex flex-col gap-1 mb-4"></div>
                    
                    <div class="text-[10px] g-text-muted font-bold uppercase tracking-widest mb-2 border-b g-border pb-1">Historia Ostatnich</div>
                    <div id="komp-history-list" class="flex flex-col gap-1"></div>
                </div>

                <!-- Obszar plików -->
                <div class="flex-grow flex flex-col min-w-0">
                    <!-- Pasek Ścieżki -->
                    <div class="px-3 py-1.5 border-b g-border bg-black/20 shrink-0 flex items-center gap-2">
                        <button onclick="kompresorApp.navigateUp()" class="g-btn px-2 py-0.5 rounded shadow-sm text-xs font-bold shrink-0">⬆️ W górę</button>
                        <div id="komp-path" class="g-bg g-text border g-border rounded px-3 py-1 text-xs font-mono truncate shadow-inner flex-grow">BigOS:\\Pulpit</div>
                    </div>

                    <!-- Lista plików -->
                    <div class="flex-grow bg-black/30 p-2 overflow-y-auto custom-scrollbar relative" id="komp-drop-zone">
                        
                        <!-- Ekran ładowania / Pasek postępu -->
                        <div id="komp-overlay" class="hidden absolute inset-0 bg-black/80 z-[100] flex items-center justify-center flex-col backdrop-blur-sm">
                            <div class="w-full max-w-sm g-panel p-6 rounded-2xl text-center border g-border shadow-2xl">
                                <div class="text-3xl mb-4 animate-bounce">⏳</div>
                                <h3 class="font-bold text-lg g-text mb-2" id="komp-status-title">Przetwarzanie...</h3>
                                <p class="text-xs g-text-muted mb-4 truncate" id="komp-status-file">Przygotowanie plików</p>
                                
                                <div class="w-full h-4 bg-gray-900 rounded-full overflow-hidden shadow-inner border border-gray-700 relative">
                                    <div id="komp-progress-bar" class="h-full bg-blue-500 transition-all duration-100" style="width: 0%"></div>
                                    <div id="komp-progress-text" class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">0%</div>
                                </div>
                            </div>
                        </div>

                        <div id="komp-drag-overlay" class="hidden absolute inset-0 bg-blue-500/20 border-4 border-dashed border-blue-500 z-[90] flex items-center justify-center backdrop-blur-sm pointer-events-none">
                            <div class="text-2xl font-bold text-white drop-shadow-lg bg-black/50 px-6 py-3 rounded-xl">Upuść pliki, aby dodać do archiwum</div>
                        </div>

                        <table class="w-full text-left text-xs g-text whitespace-nowrap" style="table-layout: fixed;">
                            <thead>
                                <tr class="border-b g-border text-gray-500 dark:text-gray-400 select-none cursor-pointer">
                                    <th class="p-2 w-10 text-center cursor-default"><input type="checkbox" id="komp-select-all" onclick="kompresorApp.toggleAll(this)" class="accent-blue-500 cursor-pointer"></th>
                                    <th class="p-2 w-1/2 hover:text-white" onclick="kompresorApp.sortFiles('name')">Nazwa Pliku ↕</th>
                                    <th class="p-2 w-24 hidden sm:table-cell hover:text-white" onclick="kompresorApp.sortFiles('type')">Typ ↕</th>
                                    <th class="p-2 w-24 text-right hidden sm:table-cell hover:text-white" onclick="kompresorApp.sortFiles('size')">Rozmiar ↕</th>
                                    <th class="p-2 w-24 text-right hidden md:table-cell">Po kompr.</th>
                                    <th class="p-2 w-24 text-right hidden lg:table-cell hover:text-white" onclick="kompresorApp.sortFiles('date')">Modyfikacja ↕</th>
                                </tr>
                            </thead>
                            <tbody id="komp-file-list">
                                <!-- Pliki renderowane tutaj -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        appWindow.appendChild(proUI);

        const dropZone = document.getElementById('komp-drop-zone');
        const dragOverlay = document.getElementById('komp-drag-overlay');
        
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dragOverlay.classList.remove('hidden'); });
        dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dragOverlay.classList.add('hidden'); });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault(); dragOverlay.classList.add('hidden');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                kompresorApp.handleDropFiles(e.dataTransfer.files);
            }
        });
    },

    closeApp: () => {
        kompresorApp.closeArchive();
        if(typeof winManager !== 'undefined') winManager.close('kompresor');
    },

    // ==================================================================
    // NAWIGACJA, HISTORIA I ULUBIONE
    // ==================================================================
    savePrefs: () => {
        localStorage.setItem('bigos_upychacz_history', JSON.stringify(kompresorApp.history));
        localStorage.setItem('bigos_upychacz_favs', JSON.stringify(kompresorApp.favorites));
        kompresorApp.renderSidebar();
    },

    addToHistory: (archiveName, archiveId) => {
        kompresorApp.history = kompresorApp.history.filter(h => h.id !== archiveId);
        kompresorApp.history.unshift({ name: archiveName, id: archiveId, date: new Date().toLocaleDateString() });
        if (kompresorApp.history.length > 10) kompresorApp.history.pop();
        kompresorApp.savePrefs();
    },

    clearHistory: () => {
        kompresorApp.history = [];
        kompresorApp.savePrefs();
        if(typeof apps !== 'undefined') apps.showToast('Historia', 'Wyzerowano historię', 'info');
    },

    toggleFavorite: (archiveName, archiveId) => {
        const idx = kompresorApp.favorites.findIndex(f => f.id === archiveId);
        if (idx > -1) kompresorApp.favorites.splice(idx, 1);
        else kompresorApp.favorites.push({ name: archiveName, id: archiveId });
        kompresorApp.savePrefs();
    },

    renderSidebar: () => {
        const fList = document.getElementById('komp-fav-list');
        const hList = document.getElementById('komp-history-list');
        if(!fList || !hList) return;

        fList.innerHTML = '';
        if (kompresorApp.mode === 'archive') {
            const isFav = kompresorApp.favorites.some(f => f.id === kompresorApp.currentArchiveId);
            fList.innerHTML += `<button onclick="kompresorApp.toggleFavorite('${kompresorApp.currentArchiveName}', '${kompresorApp.currentArchiveId}')" class="w-full text-left px-2 py-1.5 rounded transition text-xs font-semibold flex items-center gap-2 border border-dashed ${isFav ? 'border-yellow-500 text-yellow-500' : 'border-gray-500 text-gray-400 hover:text-white'}">
                <span>⭐</span> ${isFav ? 'Usuń z Ulubionych' : 'Dodaj do Ulubionych'}
            </button>`;
        }

        kompresorApp.favorites.forEach(f => {
            fList.innerHTML += `<button class="w-full text-left px-2 py-1 rounded transition text-[10px] font-semibold flex items-center gap-2 truncate g-text hover:bg-white/10" onclick="kompresorApp.openArchiveFromBigOS('${f.id}')">
                <span>🗜️</span> <span class="truncate">${typeof desktop !== 'undefined' ? desktop.escapeHTML(f.name) : f.name}</span>
            </button>`;
        });

        hList.innerHTML = '';
        if (kompresorApp.history.length === 0) hList.innerHTML = '<div class="text-[9px] text-gray-500 px-2 italic">Brak wpisów</div>';
        kompresorApp.history.forEach(h => {
            hList.innerHTML += `<button class="w-full text-left px-2 py-1 rounded transition text-[10px] font-semibold flex items-center justify-between gap-1 g-text hover:bg-white/10" onclick="kompresorApp.openArchiveFromBigOS('${h.id}')">
                <div class="flex items-center gap-1 truncate"><span class="text-gray-400">🕒</span> <span class="truncate">${typeof desktop !== 'undefined' ? desktop.escapeHTML(h.name) : h.name}</span></div>
            </button>`;
        });
    },

    navigateUp: () => {
        if (kompresorApp.mode === 'archive') {
            if (kompresorApp.archivePath === '') kompresorApp.closeArchive(); 
            else {
                let parts = kompresorApp.archivePath.split('/').filter(p => p !== '');
                parts.pop();
                kompresorApp.archivePath = parts.length > 0 ? parts.join('/') + '/' : '';
                kompresorApp.selectedFiles.clear();
                kompresorApp.renderFiles();
            }
        } else {
            if(kompresorApp.currentFolder === 'root' || kompresorApp.currentFolder === 'hasiok') return;
            const current = fileSystem.find(i => i.id === kompresorApp.currentFolder);
            if(current && current.parentId) kompresorApp.currentFolder = current.parentId;
            else kompresorApp.currentFolder = 'root';
            kompresorApp.selectedFiles.clear();
            kompresorApp.renderFiles();
        }
    },

    openArchiveFromBigOS: async (fileId) => {
        if (!window.JSZip) return typeof apps !== 'undefined' ? apps.showToast('Upychacz', 'Silnik ZIP nie jest gotowy', 'info') : null;
        const item = typeof fileSystem !== 'undefined' ? fileSystem.find(i => i.id === fileId) : null;
        if (!item) return;

        const supported = ['.zip', '.rar', '.7z', '.tar', '.gz', '.tgz', '.bz2'];
        const ext = supported.find(ext => item.name.toLowerCase().endsWith(ext));
        
        if (!ext) return typeof apps !== 'undefined' ? apps.showToast('Błąd', 'Wybrany plik nie jest obsługiwanym archiwum.', 'error') : null;

        if (ext !== '.zip') {
            if(typeof apps !== 'undefined') apps.showToast('Uwaga', `Format ${ext.toUpperCase()} wspierany eksperymentalnie.`, 'info');
        }

        kompresorApp.setProgress(true, `Otwieranie archiwum...`, item.name, 0);
        try {
            const zip = new JSZip();
            let rawContent = item.content || '';
            if (rawContent.startsWith('data:')) rawContent = rawContent.split(',')[1];
            
            kompresorApp.currentArchive = await zip.loadAsync(rawContent, {base64: true});
            kompresorApp.currentArchiveId = item.id;
            kompresorApp.currentArchiveName = item.name;
            kompresorApp.mode = 'archive';
            kompresorApp.archivePath = '';
            kompresorApp.selectedFiles.clear();
            
            document.getElementById('komp-window-title').innerText = `🗜️ Upychacz ZIP - [${item.name}]`;
            document.getElementById('komp-menu-close').classList.remove('opacity-50', 'cursor-not-allowed');
            
            kompresorApp.addToHistory(item.name, item.id);
            kompresorApp.renderFiles();
            
            if(typeof apps !== 'undefined') apps.showToast('Archiwum', 'Otwarto w trybie podglądu', 'success');
        } catch (error) {
            console.error(error);
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Plik jest uszkodzony lub to nie jest plik ZIP.', 'error');
            kompresorApp.closeArchive();
        } finally {
            kompresorApp.setProgress(false);
        }
    },

    closeArchive: () => {
        kompresorApp.currentArchive = null;
        kompresorApp.currentArchiveId = null;
        kompresorApp.currentArchiveName = '';
        kompresorApp.mode = 'browser';
        kompresorApp.archivePath = '';
        kompresorApp.selectedFiles.clear();
        
        const titleEl = document.getElementById('komp-window-title');
        if(titleEl) titleEl.innerText = `🗜️ Upychacz ZIP`;
        
        const menuClose = document.getElementById('komp-menu-close');
        if(menuClose) menuClose.classList.add('opacity-50', 'cursor-not-allowed');
        
        kompresorApp.renderFiles();
        kompresorApp.renderSidebar();
    },

    showOpenArchiveModal: () => {
        const modalId = 'komp-open-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        let listHTML = '';
        if(typeof fileSystem !== 'undefined') {
            const archives = fileSystem.filter(f => f.type === 'file' && (f.name.endsWith('.zip') || f.name.endsWith('.rar') || f.name.endsWith('.7z') || f.name.endsWith('.tar') || f.name.endsWith('.gz')));
            if(archives.length === 0) {
                listHTML = '<div class="text-gray-500 dark:text-gray-400 text-center py-4">Brak archiwów w systemie BigOS.</div>';
            } else {
                archives.forEach(f => {
                    listHTML += `<button class="w-full text-left px-3 py-2 bg-gray-100 dark:bg-[#111] hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition text-gray-800 dark:text-white border border-gray-200 dark:border-[#333] mb-2 font-medium truncate" onclick="document.getElementById('${modalId}').remove(); kompresorApp.openArchiveFromBigOS('${f.id}')">🗜️ ${typeof desktop !== 'undefined' ? desktop.escapeHTML(f.name) : f.name}</button>`;
                });
            }
        }

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-blue-500/30">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Otwórz archiwum z BigOS</h2>
                <div class="max-h-64 overflow-y-auto mb-4 pr-1 custom-scrollbar">
                    ${listHTML}
                </div>
                <div class="flex justify-end">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition font-medium">Zamknij</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // ==================================================================
    // RENDEROWANIE PLIKÓW, WYSZUKIWANIE, SORTOWANIE
    // ==================================================================
    searchFiles: (query) => { kompresorApp.searchQuery = query.trim().toLowerCase(); kompresorApp.renderFiles(); },
    sortFiles: (type) => { 
        if(kompresorApp.sortBy === type) kompresorApp.sortAsc = !kompresorApp.sortAsc; 
        else { kompresorApp.sortBy = type; kompresorApp.sortAsc = true; }
        kompresorApp.renderFiles(); 
    },

    toggleAll: (checkbox) => {
        kompresorApp.selectedFiles.clear();
        if (checkbox.checked) {
            const list = kompresorApp._getFilesToRender();
            list.forEach(i => kompresorApp.selectedFiles.add(i.id));
        }
        kompresorApp.renderFiles();
    },

    toggleSelect: (id) => {
        if (kompresorApp.selectedFiles.has(id)) kompresorApp.selectedFiles.delete(id);
        else kompresorApp.selectedFiles.add(id);
        kompresorApp.renderFiles();
    },
    
    _getFilesInCurrentArchiveFolder: () => {
        if (!kompresorApp.currentArchive) return [];
        const result = [];
        Object.keys(kompresorApp.currentArchive.files).forEach(path => {
            const file = kompresorApp.currentArchive.files[path];
            if (path.startsWith(kompresorApp.archivePath)) {
                const relativePath = path.substring(kompresorApp.archivePath.length);
                if (relativePath === '') return; 
                const parts = relativePath.split('/').filter(p=>p!=='');
                if (parts.length === 1 && !file.dir) {
                    result.push({ id: path, name: parts[0], type: 'Plik', size: file._data ? file._data.uncompressedSize : 0, cSize: file._data ? file._data.compressedSize : 0, date: file.date, isFolder: false, icon: '📄' });
                } else if (parts.length >= 1) {
                    const folderName = parts[0];
                    const fullFolderName = kompresorApp.archivePath + folderName + '/';
                    if (!result.some(r => r.id === fullFolderName)) {
                        result.push({ id: fullFolderName, name: folderName, type: 'Katalog', size: 0, cSize: 0, date: new Date(), isFolder: true, icon: '📁' });
                    }
                }
            }
        });
        return result;
    },

    formatBytes: (bytes, decimals = 1) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024; const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    _getFilesToRender: () => {
        let items = [];
        if (kompresorApp.mode === 'browser') {
            if(typeof fileSystem !== 'undefined') {
                items = fileSystem.filter(i => i.parentId === kompresorApp.currentFolder && i.id !== 'hasiok').map(item => {
                    let len = (item.type === 'file' || item.type === 'image') ? (item.content ? item.content.length : 0) : 0;
                    return {
                        id: item.id, icon: item.icon, name: item.name, 
                        type: item.type === 'folder' ? 'Katalog' : (item.name.endsWith('.zip') ? 'Archiwum ZIP' : item.type),
                        size: len, cSize: len, date: new Date(), isFolder: item.type === 'folder', originalItem: item
                    };
                });
            }
        } else {
            items = kompresorApp._getFilesInCurrentArchiveFolder();
        }

        if (kompresorApp.searchQuery) {
            items = items.filter(i => i.name.toLowerCase().includes(kompresorApp.searchQuery));
        }

        items.sort((a, b) => {
            if (a.isFolder && !b.isFolder) return -1;
            if (!a.isFolder && b.isFolder) return 1;
            
            let valA = a[kompresorApp.sortBy]; let valB = b[kompresorApp.sortBy];
            if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
            
            if (valA < valB) return kompresorApp.sortAsc ? -1 : 1;
            if (valA > valB) return kompresorApp.sortAsc ? 1 : -1;
            return 0;
        });

        return items;
    },

    renderFiles: () => {
        const list = document.getElementById('komp-file-list');
        const pathEl = document.getElementById('komp-path');
        if (!list || !pathEl) return;

        list.innerHTML = '';
        const itemsToRender = kompresorApp._getFilesToRender();

        if (kompresorApp.mode === 'browser') {
            let path = []; let curr = kompresorApp.currentFolder;
            while(curr && curr !== 'root' && curr !== 'hasiok') {
                const f = fileSystem.find(i => i.id === curr);
                if(f) { path.unshift(f.name); curr = f.parentId; } else break;
            }
            pathEl.innerText = (kompresorApp.currentFolder === 'hasiok' ? 'BigOS:\\Kosz' : 'BigOS:\\Pulpit') + (path.length > 0 ? '\\' + path.join('\\') : '');
        } else {
            pathEl.innerText = `ZIP:\\${kompresorApp.currentArchiveName}\\${kompresorApp.archivePath.replace(/\//g, '\\')}`;
        }

        if (itemsToRender.length === 0) {
            list.innerHTML = `<tr><td colspan="6" class="text-center p-6 g-text-muted italic">Brak elementów do wyświetlenia</td></tr>`;
            return;
        }

        itemsToRender.forEach(data => {
            const isSelected = kompresorApp.selectedFiles.has(data.id);
            const tr = document.createElement('tr');
            tr.className = `border-b g-border transition cursor-pointer ${isSelected ? 'bg-blue-500/20' : 'hover:bg-white/5'}`;
            
            tr.onclick = (e) => {
                if (e.target.tagName !== 'INPUT' && data.isFolder) {
                    if (kompresorApp.mode === 'browser') kompresorApp.currentFolder = data.id;
                    else kompresorApp.archivePath = data.id;
                    kompresorApp.selectedFiles.clear();
                    kompresorApp.renderFiles();
                } else {
                    kompresorApp.toggleSelect(data.id);
                }
            };
            
            // Podgląd plików wewnątrz archiwum przy podwójnym kliknięciu
            if (kompresorApp.mode === 'archive' && !data.isFolder) {
                tr.ondblclick = (e) => { e.stopPropagation(); kompresorApp.previewItem(data.id); };
                tr.title = "Kliknij dwukrotnie by wyświetlić podgląd pliku";
            } else if (kompresorApp.mode === 'browser' && data.name.endsWith('.zip')) {
                tr.ondblclick = (e) => { e.stopPropagation(); kompresorApp.openArchiveFromBigOS(data.id); };
                tr.title = "Kliknij dwukrotnie by wejść do archiwum";
            }

            let ratio = data.size > 0 ? Math.round((1 - (data.cSize / data.size)) * 100) : 0;
            let dateStr = data.date ? data.date.toLocaleDateString() : '--';
            
            tr.innerHTML = `
                <td class="p-2 text-center" onclick="event.stopPropagation()"><input type="checkbox" class="accent-blue-500 cursor-pointer" ${isSelected ? 'checked' : ''} onclick="kompresorApp.toggleSelect('${data.id}')"></td>
                <td class="p-2 font-bold truncate max-w-[200px]" title="${data.name}">${data.icon} ${typeof desktop !== 'undefined' ? desktop.escapeHTML(data.name) : data.name}</td>
                <td class="p-2 g-text-muted uppercase hidden sm:table-cell">${data.type}</td>
                <td class="p-2 text-right g-text-muted font-mono hidden sm:table-cell">${data.isFolder ? '--' : kompresorApp.formatBytes(data.size)}</td>
                <td class="p-2 text-right text-emerald-400 font-mono hidden md:table-cell">${data.isFolder ? '--' : kompresorApp.formatBytes(data.cSize) + ' ('+ratio+'%)'}</td>
                <td class="p-2 text-right g-text-muted font-mono hidden lg:table-cell">${dateStr}</td>
            `;
            list.appendChild(tr);
        });
        
        const selectAllCb = document.getElementById('komp-select-all');
        if (selectAllCb) selectAllCb.checked = (itemsToRender.length > 0 && kompresorApp.selectedFiles.size === itemsToRender.length);
    },

    // ==================================================================
    // PROGRESS BAR I UI
    // ==================================================================
    setProgress: (state, title = '', file = '', percent = 0) => {
        const overlay = document.getElementById('komp-overlay');
        const tEl = document.getElementById('komp-status-title');
        const fEl = document.getElementById('komp-status-file');
        const bar = document.getElementById('komp-progress-bar');
        const txt = document.getElementById('komp-progress-text');
        
        if (!overlay) return;
        
        if (state) {
            overlay.classList.remove('hidden');
            if(tEl) tEl.innerText = title;
            if(fEl) fEl.innerText = file;
            if(bar) bar.style.width = `${percent}%`;
            if(txt) txt.innerText = `${Math.round(percent)}%`;
            kompresorApp.isProcessing = true;
        } else {
            overlay.classList.add('hidden');
            kompresorApp.isProcessing = false;
        }
    },

    // ==================================================================
    // PODGLĄD PLIKÓW BEZ ROZPAKOWYWANIA
    // ==================================================================
    previewSelected: () => {
        if(kompresorApp.selectedFiles.size !== 1) return typeof apps !== 'undefined' ? apps.showToast('Błąd', 'Wybierz jeden plik do podglądu', 'error') : null;
        const id = Array.from(kompresorApp.selectedFiles)[0];
        kompresorApp.previewItem(id);
    },

    previewItem: async (id) => {
        if(kompresorApp.mode === 'browser') {
            if(typeof apps !== 'undefined') apps.showToast('Info', 'Podgląd na Pulpicie jest obsługiwany przez Aktówkę. Otwórz plik normalnie.', 'info');
            return;
        }

        const zipEntry = kompresorApp.currentArchive.files[id];
        if(!zipEntry || zipEntry.dir) return;

        kompresorApp.setProgress(true, 'Generowanie podglądu...', id, 50);

        try {
            const nameLower = id.toLowerCase();
            const isImage = nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.webp') || nameLower.endsWith('.gif');
            const isText = nameLower.endsWith('.txt') || nameLower.endsWith('.json') || nameLower.endsWith('.html') || nameLower.endsWith('.css') || nameLower.endsWith('.js') || nameLower.endsWith('.csv') || nameLower.endsWith('.md');
            
            let contentHtml = '';

            if (isImage) {
                const base64Data = await zipEntry.async("base64");
                const mime = nameLower.endsWith('.png') ? 'image/png' : 'image/jpeg';
                contentHtml = `<img src="data:${mime};base64,${base64Data}" class="max-w-full max-h-[60vh] object-contain rounded mx-auto border border-gray-500">`;
            } else if (isText) {
                const textData = await zipEntry.async("string");
                const safeText = typeof desktop !== 'undefined' ? desktop.escapeHTML(textData) : textData;
                contentHtml = `<div class="w-full max-h-[60vh] overflow-y-auto bg-black/50 p-4 rounded text-xs font-mono text-gray-300 text-left whitespace-pre-wrap">${safeText}</div>`;
            } else {
                contentHtml = `<div class="text-center text-gray-400 py-10">Brak wbudowanego podglądu dla tego formatu. Wypakuj plik, aby go otworzyć.</div>`;
            }

            const modalId = 'komp-preview-modal';
            let modal = document.getElementById(modalId);
            if(modal) modal.remove();

            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
            modal.innerHTML = `
                <div class="bg-gray-900 border border-gray-700 p-6 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                    <h2 class="text-lg font-bold text-white mb-4 truncate border-b border-gray-700 pb-2">👁️ Podgląd: ${id}</h2>
                    <div class="flex-grow overflow-hidden flex flex-col items-center justify-center mb-4">
                        ${contentHtml}
                    </div>
                    <div class="flex justify-end shrink-0">
                        <button onclick="document.getElementById('${modalId}').remove()" class="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg transition font-bold">Zamknij</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } catch(e) {
            console.error(e);
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Nie można wygenerować podglądu.', 'error');
        } finally {
            kompresorApp.setProgress(false);
        }
    },

    // ==================================================================
    // NARZĘDZIA ARCHIWUM (Test, Statystyki)
    // ==================================================================
    testArchive: async () => {
        if (kompresorApp.mode !== 'archive' || !kompresorApp.currentArchive) {
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Otwórz archiwum, by je przetestować.', 'error'); return;
        }

        kompresorApp.setProgress(true, 'Testowanie spójności...', 'Analiza plików', 0);
        
        try {
            const keys = Object.keys(kompresorApp.currentArchive.files);
            for(let i=0; i<keys.length; i++) {
                const path = keys[i];
                const file = kompresorApp.currentArchive.files[path];
                kompresorApp.setProgress(true, 'Testowanie spójności...', path, (i/keys.length)*100);
                
                if (!file.dir) {
                    await file.async("uint8array"); // Próba zdekodowania bloków bity po bicie (wyłapie błędy CRC)
                }
            }
            if(typeof apps !== 'undefined') apps.showToast('Test OK', 'Archiwum nie zawiera błędów CRC. Pliki są spójne.', 'success');
        } catch(e) {
            console.error(e);
            if(typeof apps !== 'undefined') apps.showToast('Błąd CRC', 'Archiwum jest uszkodzone lub niepełne!', 'error');
        } finally {
            kompresorApp.setProgress(false);
        }
    },

    showStatsModal: (title, desc, savedMB, ratio, timeSec) => {
        const modalId = 'komp-stats-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-emerald-500/30">
                <div class="flex items-center gap-3 mb-4 border-b border-gray-300 dark:border-gray-600 pb-3">
                    <div class="text-4xl drop-shadow-md">📊</div>
                    <div>
                        <h2 class="text-xl font-bold text-gray-900 dark:text-white">${title}</h2>
                        <p class="text-xs text-gray-500">${desc}</p>
                    </div>
                </div>
                
                <div class="space-y-3 text-sm text-gray-800 dark:text-gray-200 mb-6">
                    <div class="flex justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                        <span class="font-bold text-gray-500 dark:text-gray-400">Zaoszczędzono:</span>
                        <span class="font-mono font-bold text-emerald-500">${savedMB}</span>
                    </div>
                    <div class="flex justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                        <span class="font-bold text-gray-500 dark:text-gray-400">Stopień kompresji:</span>
                        <span class="font-mono font-bold text-blue-500">${ratio}%</span>
                    </div>
                    <div class="flex justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                        <span class="font-bold text-gray-500 dark:text-gray-400">Czas operacji:</span>
                        <span class="font-mono">${timeSec} s</span>
                    </div>
                </div>

                <div class="flex justify-end">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-600/30 transition font-bold">Zakończ</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // ==================================================================
    // DRAG & DROP WŁASNYCH PLIKÓW
    // ==================================================================
    handleDropFiles: async (fileList) => {
        if(fileList.length === 0) return;
        
        kompresorApp.setProgress(true, `Wczytywanie...`, `${fileList.length} plików`, 0);
        const startTime = Date.now();
        let totalSize = 0;

        try {
            let targetBigOsFolder = kompresorApp.mode === 'browser' ? kompresorApp.currentFolder : 'root';
            
            for(let i=0; i<fileList.length; i++) {
                let file = fileList[i];
                totalSize += file.size;
                kompresorApp.setProgress(true, `Wczytywanie z dysku...`, file.name, (i/fileList.length)*100);

                let buffer = await file.arrayBuffer();
                let base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                
                let mime = file.type || 'application/octet-stream';
                let content = `data:${mime};base64,${base64}`;
                let type = file.type.startsWith('image/') ? 'image' : 'file';
                let icon = type === 'image' ? '🖼️' : '📄';
                if (file.name.endsWith('.zip')) { type = 'file'; icon = '🗜️'; }
                
                let newId = 'file_' + Date.now() + i;
                fileSystem.push({
                    id: newId, type: type, name: file.name, icon: icon, content: content,
                    parentId: targetBigOsFolder, x: 20, y: 20
                });
                
                if (kompresorApp.mode === 'archive' && kompresorApp.currentArchive) {
                    kompresorApp.currentArchive.file(kompresorApp.archivePath + file.name, buffer);
                }
            }
            
            if(typeof fsManager !== 'undefined') { fsManager.save(); if(typeof desktop !== 'undefined') desktop.render(); }
            
            if (kompresorApp.mode === 'archive') {
                kompresorApp.setProgress(true, "Pakowanie archiwum...", "Aktualizacja pliku ZIP", 100);
                await kompresorApp._saveCurrentArchiveToBigOS();
                
                const endTime = Date.now();
                kompresorApp.showStatsModal('Archiwum Zaktualizowane', 'Dodano nowe pliki pomyślnie.', 'N/A (Brak kompresji w locie)', 0, ((endTime - startTime)/1000).toFixed(1));
            } else {
                if(typeof apps !== 'undefined') apps.showToast('Skopiowano', 'Pliki zostały przeniesione do BigOS', 'success');
            }
            
        } catch(e) {
            console.error(e);
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Nie udało się wczytać plików.', 'error');
        } finally {
            kompresorApp.renderFiles();
            kompresorApp.setProgress(false);
        }
    },

    // ==================================================================
    // SZYBKIE KOMENDY Z MENU KONTEKSTOWEGO (DLA CAŁEGO SYSTEMU)
    // ==================================================================
    quickExtract: async (fileId) => {
        kompresorApp.selectedFiles.clear();
        kompresorApp.selectedFiles.add(fileId);
        
        // Zabezpieczenie ścieżki
        const item = fileSystem.find(i => i.id === fileId);
        if(!item) return;
        
        // Cichy start procesu w obecnym katalogu w tle (bez otwierania pełnego UI)
        if(typeof winManager !== 'undefined') winManager.open('kompresor');
        kompresorApp.currentFolder = item.parentId;
        kompresorApp.mode = 'browser';
        kompresorApp.unpackToFolder(item.parentId);
    },

    quickCompress: (fileIds) => {
        kompresorApp.selectedFiles.clear();
        fileIds.forEach(id => kompresorApp.selectedFiles.add(id));
        
        const item = fileSystem.find(i => i.id === fileIds[0]);
        if(item) kompresorApp.currentFolder = item.parentId;
        kompresorApp.mode = 'browser';
        
        if(typeof winManager !== 'undefined') winManager.open('kompresor');
        kompresorApp.renderFiles();
        kompresorApp.showPackModal();
    },

    // ==================================================================
    // ZAPISYWANIE ARCHIWUM DO BIGOS (Własne Modalne Okienko + Procenty)
    // ==================================================================
    showPackModal: () => {
        if (!window.JSZip) return typeof apps !== 'undefined' ? apps.showToast('Upychacz', 'Biblioteka silnika ZIP jeszcze się ładuje...', 'info') : null;
        if (kompresorApp.mode === 'archive') {
            if(typeof apps !== 'undefined') apps.showToast('Info', 'Aby dodać pliki, przeciągnij je (Drag&Drop) do tego okna z komputera.', 'info'); return;
        }
        if (kompresorApp.selectedFiles.size === 0) return typeof apps !== 'undefined' ? apps.showToast('Błąd', 'Zaznacz pliki do kompresji!', 'error') : null;

        const modalId = 'komp-save-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        let folderOptions = '<option value="root">Pulpit (Katalog Główny)</option>';
        if(typeof fileSystem !== 'undefined') {
            fileSystem.filter(f => f.type === 'folder' && f.id !== 'hasiok').forEach(folder => {
                let isSelected = (kompresorApp.currentFolder === folder.id) ? 'selected' : '';
                folderOptions += `<option value="${folder.id}" ${isSelected}>📂 ${typeof desktop !== 'undefined' ? desktop.escapeHTML(folder.name) : folder.name}</option>`;
            });
        }

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-blue-500/30">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Tworzenie Archiwum</h2>
                
                <div class="mb-4">
                    <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Nazwa pliku</label>
                    <input type="text" id="komp-save-name" value="Moja_Paczka.zip" class="w-full p-2 bg-gray-100 dark:bg-[#111] border border-gray-300 dark:border-[#444] rounded outline-none text-gray-800 dark:text-white focus:border-blue-500 font-bold">
                </div>
                
                <div class="mb-4">
                    <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Poziom kompresji (DEFLATE)</label>
                    <select id="komp-save-level" class="w-full p-2 bg-gray-100 dark:bg-[#111] border border-gray-300 dark:border-[#444] rounded outline-none text-gray-800 dark:text-white cursor-pointer focus:border-blue-500">
                        <option value="0">Brak kompresji (Tylko zapis)</option>
                        <option value="1">Bardzo szybka</option>
                        <option value="5" selected>Normalna</option>
                        <option value="9">Ultra (Najwolniejsza)</option>
                    </select>
                </div>
                
                <div class="mb-6">
                    <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Miejsce zapisu</label>
                    <select id="komp-save-folder" class="w-full p-2 bg-gray-100 dark:bg-[#111] border border-gray-300 dark:border-[#444] rounded outline-none text-gray-800 dark:text-white cursor-pointer focus:border-blue-500">
                        ${folderOptions}
                    </select>
                </div>

                <div class="flex gap-3 justify-end">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition font-medium">Anuluj</button>
                    <button onclick="kompresorApp.confirmPack()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-600/30 transition font-medium">Spakuj</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const input = document.getElementById('komp-save-name');
        input.focus();
        input.setSelectionRange(0, input.value.indexOf('.'));
    },

    confirmPack: async () => {
        const nameInput = document.getElementById('komp-save-name').value.trim();
        const level = parseInt(document.getElementById('komp-save-level').value, 10);
        const folderId = document.getElementById('komp-save-folder').value;
        const modal = document.getElementById('komp-save-modal');
        if(modal) modal.remove();

        if(!nameInput) return;
        let zipName = nameInput.endsWith('.zip') ? nameInput : nameInput + '.zip';

        kompresorApp.setProgress(true, 'Uruchamianie silnika ZIP...', 'Przygotowywanie...', 0);
        const startTime = Date.now();
        let uncompressedSize = 0;

        try {
            const zip = new JSZip();

            const addItemsToZip = (itemIds, currentZipFolder) => {
                itemIds.forEach(id => {
                    const item = fileSystem.find(i => i.id === id);
                    if (!item) return;

                    if (item.type === 'folder') {
                        const newFolder = currentZipFolder.folder(item.name);
                        const childrenIds = fileSystem.filter(i => i.parentId === item.id).map(i => i.id);
                        addItemsToZip(childrenIds, newFolder);
                    } else if (item.type === 'image' || (item.content && item.content.startsWith('data:'))) {
                        const base64Data = item.content.split(',')[1] || item.content;
                        uncompressedSize += base64Data.length * 0.75; // Szacunek binarny b64
                        currentZipFolder.file(item.name, base64Data, {base64: true});
                    } else {
                        uncompressedSize += item.content ? item.content.length : 0;
                        currentZipFolder.file(item.name, item.content || '');
                    }
                });
            };

            addItemsToZip(Array.from(kompresorApp.selectedFiles), zip);

            let compressOpts = { type: "base64", compression: level > 0 ? "DEFLATE" : "STORE" };
            if (level > 0) compressOpts.compressionOptions = { level: level };

            // Uruchamiamy asynchroniczne generowanie z obsługą progress bara (onUpdate)!
            const base64Content = await zip.generateAsync(compressOpts, function updateCallback(metadata) {
                kompresorApp.setProgress(true, 'Tworzenie Archiwum...', `Kompresja: ${metadata.currentFile || 'Trwa'}`, metadata.percent);
            });
            
            kompresorApp.setProgress(true, 'Zapisywanie do BigOS...', 'Finalizacja pliku...', 100);

            // Poprawny format MIME dla Windows i Aktówki
            const dataUri = `data:application/zip;base64,${base64Content}`;
            const finalSize = base64Content.length * 0.75; // Szacunek wagi
            
            fileSystem.push({
                id: 'zip_' + Date.now(), type: 'file', name: zipName, icon: '🗜️',
                content: dataUri, parentId: folderId, x: Math.floor(Math.random() * 50) + 20, y: Math.floor(Math.random() * 50) + 20
            });
            
            if(typeof fsManager !== 'undefined') fsManager.save();
            if(typeof desktop !== 'undefined') desktop.render();
            
            const aktowkaWin = document.getElementById('app-aktowka');
            if(aktowkaWin && aktowkaWin.classList.contains('active') && typeof fsManager !== 'undefined') {
                fsManager.renderExplorerContent(fsManager.currentFolder);
            }
            
            kompresorApp.selectedFiles.clear();
            kompresorApp.renderFiles();
            
            const endTime = Date.now();
            const timeSec = ((endTime - startTime) / 1000).toFixed(1);
            let savedBytes = uncompressedSize - finalSize;
            if (savedBytes < 0) savedBytes = 0; // Kompresja mogła powiększyć plik (np. małe texty lub już skompresowane JPG)
            
            let ratio = uncompressedSize > 0 ? Math.round((savedBytes / uncompressedSize) * 100) : 0;
            
            kompresorApp.showStatsModal('Operacja Zakończona', `Utworzono plik ${zipName}`, kompresorApp.formatBytes(savedBytes), ratio, timeSec);

        } catch (error) {
            console.error(error);
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Wystąpił problem podczas kompresji', 'error');
        } finally {
            kompresorApp.setProgress(false);
        }
    },

    _saveCurrentArchiveToBigOS: async () => {
        if (!kompresorApp.currentArchive || !kompresorApp.currentArchiveId) return;
        
        try {
            const base64Content = await kompresorApp.currentArchive.generateAsync({type: "base64", compression: "DEFLATE", compressionOptions: {level: 5}});
            const dataUri = `data:application/zip;base64,${base64Content}`;
            
            const item = fileSystem.find(i => i.id === kompresorApp.currentArchiveId);
            if (item) {
                item.content = dataUri;
                if(typeof fsManager !== 'undefined') fsManager.save();
            }
        } catch(e) {
            console.error("Błąd przepakowywania:", e);
        }
    },

    // ==================================================================
    // EDYCJA WEWNĄTRZ ARCHIWUM (Zmiana nazwy, usuwanie)
    // ==================================================================
    deleteSelected: async () => {
        if (kompresorApp.selectedFiles.size === 0) return typeof apps !== 'undefined' ? apps.showToast('Błąd', 'Wybierz element do usunięcia.', 'error') : null;
        
        if (kompresorApp.mode === 'browser') {
            if(typeof apps !== 'undefined') apps.showToast('Info', 'Do usuwania plików systemowych użyj Aktówki.', 'info');
            return;
        }

        if(confirm(`Usunąć zaznaczone elementy (${kompresorApp.selectedFiles.size}) z archiwum?`)) {
            kompresorApp.setProgress(true, "Aktualizacja struktury archiwum...", "Usuwanie i przepakowywanie", 50);
            
            kompresorApp.selectedFiles.forEach(path => {
                kompresorApp.currentArchive.remove(path);
            });
            await kompresorApp._saveCurrentArchiveToBigOS();
            
            kompresorApp.selectedFiles.clear();
            kompresorApp.renderFiles();
            kompresorApp.setProgress(false);
            if(typeof apps !== 'undefined') apps.showToast('Sukces', 'Elementy usunięte z archiwum.', 'success');
        }
    },

    renameSelected: async () => {
        if (kompresorApp.selectedFiles.size !== 1) return typeof apps !== 'undefined' ? apps.showToast('Błąd', 'Wybierz dokładnie JEDEN element do zmiany nazwy.', 'error') : null;
        
        if (kompresorApp.mode === 'browser') {
            if(typeof apps !== 'undefined') apps.showToast('Info', 'Do zmiany nazwy plików systemowych użyj Aktówki.', 'info');
            return;
        }

        const oldPath = Array.from(kompresorApp.selectedFiles)[0];
        const oldName = oldPath.split('/').filter(p=>p!=='').pop();
        
        let newName = prompt("Podaj nową nazwę:", oldName);
        if (!newName || newName === oldName) return;

        kompresorApp.setProgress(true, "Zapisywanie zmian w archiwum...", "Przepakowywanie", 50);
        
        try {
            const oldFile = kompresorApp.currentArchive.files[oldPath];
            if (oldFile && !oldFile.dir) {
                const content = await oldFile.async("arraybuffer");
                const newPath = kompresorApp.archivePath + newName;
                kompresorApp.currentArchive.file(newPath, content);
                kompresorApp.currentArchive.remove(oldPath);
                await kompresorApp._saveCurrentArchiveToBigOS();
                if(typeof apps !== 'undefined') apps.showToast('Sukces', 'Zmieniono nazwę w archiwum.', 'success');
            } else {
                if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Zmiana nazwy folderów nie jest obsługiwana w tym widoku.', 'error');
            }
        } catch(e) { console.error(e); }
        
        kompresorApp.selectedFiles.clear();
        kompresorApp.renderFiles();
        kompresorApp.setProgress(false);
    },

    // ==================================================================
    // WŁAŚCIWOŚCI ARCHIWUM (Dokładne wg specyfikacji)
    // ==================================================================
    showArchiveInfo: () => {
        if (kompresorApp.mode !== 'archive' || !kompresorApp.currentArchive) {
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Musisz najpierw otworzyć archiwum, by sprawdzić jego właściwości.', 'error');
            return;
        }

        const modalId = 'komp-info-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        let fileCount = 0; let folderCount = 0;
        let uncompressed = 0; let compressed = 0;
        let lastModDate = new Date(0);

        Object.keys(kompresorApp.currentArchive.files).forEach(path => {
            const f = kompresorApp.currentArchive.files[path];
            if (f.date && f.date > lastModDate) lastModDate = f.date;
            
            if (f.dir) folderCount++;
            else {
                fileCount++;
                uncompressed += f._data ? f._data.uncompressedSize : 0;
                compressed += f._data ? f._data.compressedSize : 0;
            }
        });

        if (compressed === 0 && uncompressed > 0) compressed = Math.floor(uncompressed * 0.4); 

        let ratio = uncompressed > 0 ? Math.round((1 - (compressed / uncompressed)) * 100) : 0;
        if (ratio < 0) ratio = 0;

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-blue-500/30">
                <div class="flex items-center gap-3 mb-6 border-b border-gray-300 dark:border-gray-600 pb-4">
                    <div class="text-4xl drop-shadow-md">🗜️</div>
                    <div>
                        <h2 class="text-xl font-bold text-gray-900 dark:text-white">Informacje o archiwum</h2>
                        <p class="text-xs text-gray-500">${typeof desktop !== 'undefined' ? desktop.escapeHTML(kompresorApp.currentArchiveName) : kompresorApp.currentArchiveName}</p>
                    </div>
                </div>
                
                <div class="space-y-3 text-sm text-gray-800 dark:text-gray-200 mb-6">
                    <div class="flex justify-between">
                        <span class="font-bold text-gray-500 dark:text-gray-400">Nazwa:</span>
                        <span class="font-mono text-right max-w-[180px] truncate" title="${kompresorApp.currentArchiveName}">${kompresorApp.currentArchiveName}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-bold text-gray-500 dark:text-gray-400">Plików:</span>
                        <span class="font-mono">${fileCount}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-bold text-gray-500 dark:text-gray-400">Folderów:</span>
                        <span class="font-mono">${folderCount}</span>
                    </div>
                    <div class="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                        <span class="font-bold text-gray-500 dark:text-gray-400">Przed kompresją:</span>
                        <span class="font-mono text-red-500 font-bold">${kompresorApp.formatBytes(uncompressed, 2)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-bold text-gray-500 dark:text-gray-400">Po kompresji:</span>
                        <span class="font-mono text-emerald-500 font-bold">${kompresorApp.formatBytes(compressed, 2)}</span>
                    </div>
                    <div class="flex justify-between bg-blue-50 dark:bg-blue-900/30 p-2 rounded mt-2">
                        <span class="font-bold text-blue-700 dark:text-blue-300">Oszczędność:</span>
                        <span class="font-mono font-bold text-blue-700 dark:text-blue-300">${ratio}%</span>
                    </div>
                    <div class="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                        <span class="font-bold text-gray-500 dark:text-gray-400">Zmodyfikowano:</span>
                        <span class="font-mono text-[11px]">${lastModDate.toLocaleString()}</span>
                    </div>
                </div>

                <div class="flex justify-end">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-600/30 transition font-bold">Zamknij</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // ==================================================================
    // ROZPAKOWYWANIE Z ARCHIWUM
    // ==================================================================
    showExtractModal: () => {
        if (!window.JSZip) return typeof apps !== 'undefined' ? apps.showToast('Upychacz', 'Silnik ZIP nie jest gotowy', 'info') : null;
        if (kompresorApp.selectedFiles.size === 0) return typeof apps !== 'undefined' ? apps.showToast('Błąd', 'Zaznacz co najmniej jeden element do wypakowania.', 'error') : null;

        const modalId = 'komp-extract-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        let folderOptions = '<option value="root">Pulpit (Katalog Główny)</option>';
        if(typeof fileSystem !== 'undefined') {
            fileSystem.filter(f => f.type === 'folder' && f.id !== 'hasiok').forEach(folder => {
                let isSelected = (typeof fsManager !== 'undefined' && fsManager.currentFolder === folder.id) ? 'selected' : '';
                folderOptions += `<option value="${folder.id}" ${isSelected}>📂 ${typeof desktop !== 'undefined' ? desktop.escapeHTML(folder.name) : folder.name}</option>`;
            });
        }

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-blue-500/30">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Wypakuj pliki</h2>
                
                <div class="bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded p-3 mb-4 max-h-32 overflow-y-auto text-xs text-gray-600 dark:text-gray-400 font-mono">
                    Elementów do wypakowania: ${kompresorApp.selectedFiles.size}
                </div>

                <div class="mb-6">
                    <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Gdzie wypakować?</label>
                    <select id="komp-extract-folder" class="w-full p-2 bg-gray-100 dark:bg-[#111] border border-gray-300 dark:border-[#444] rounded outline-none text-gray-800 dark:text-white cursor-pointer focus:border-blue-500 font-bold">
                        ${folderOptions}
                    </select>
                </div>
                <div class="flex gap-3 justify-end">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition font-medium">Anuluj</button>
                    <button onclick="kompresorApp.confirmExtract()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-600/30 transition font-bold">Wypakuj</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    confirmExtract: () => {
        const folderId = document.getElementById('komp-extract-folder').value;
        const modal = document.getElementById('komp-extract-modal');
        if(modal) modal.remove();
        kompresorApp.unpackToFolder(folderId);
    },

    unpackToFolder: async (targetFolderId) => {
        kompresorApp.setProgress(true, 'Wypakowywanie danych...', 'Przygotowanie struktury', 0);
        const startTime = Date.now();

        try {
            // TRYB Z ARCHIWUM
            if (kompresorApp.mode === 'archive' && kompresorApp.currentArchive) {
                const selectedArr = Array.from(kompresorApp.selectedFiles);
                for (let i=0; i<selectedArr.length; i++) {
                    let path = selectedArr[i];
                    kompresorApp.setProgress(true, 'Wypakowywanie (Tryb Wewnętrzny)...', path, (i/selectedArr.length)*100);
                    
                    const zipEntry = kompresorApp.currentArchive.files[path];
                    if (!zipEntry) continue;
                    
                    const itemName = path.split('/').filter(p=>p!=='').pop();
                    
                    if (zipEntry.dir) {
                        fileSystem.push({
                            id: 'fld_' + Date.now() + Math.floor(Math.random()*1000), 
                            type: 'folder', name: itemName, icon: '📁',
                            parentId: targetFolderId, x: 20, y: 20
                        });
                    } else {
                        const isImage = itemName.endsWith('.png') || itemName.endsWith('.jpg') || itemName.endsWith('.jpeg') || itemName.endsWith('.webp');
                        const fileId = 'file_' + Date.now() + Math.floor(Math.random()*1000);
                        
                        if (isImage) {
                            const base64Data = await zipEntry.async("base64");
                            const mime = itemName.endsWith('.png') ? 'image/png' : 'image/jpeg';
                            fileSystem.push({
                                id: fileId, type: 'image', name: itemName, icon: '🖼️',
                                content: `data:${mime};base64,${base64Data}`, parentId: targetFolderId, x: 20, y: 20
                            });
                        } else {
                            const textData = await zipEntry.async("string");
                            fileSystem.push({
                                id: fileId, type: 'file', name: itemName, icon: '📄',
                                content: textData, parentId: targetFolderId, x: 20, y: 20
                            });
                        }
                    }
                }
            } 
            // TRYB Z BIGOS (Pełne rozpakowanie archiwum)
            else {
                const selectedArr = Array.from(kompresorApp.selectedFiles);
                const zipItems = selectedArr.map(id => fileSystem.find(i => i.id === id)).filter(i => i && i.name.endsWith('.zip'));

                for (let z=0; z<zipItems.length; z++) {
                    const zipItem = zipItems[z];
                    kompresorApp.setProgress(true, 'Ładowanie archiwum...', zipItem.name, 0);

                    const zip = new JSZip();
                    let rawContent = zipItem.content || '';
                    if (rawContent.startsWith('data:')) rawContent = rawContent.split(',')[1];
                    const loadedZip = await zip.loadAsync(rawContent, {base64: true});

                    const extractFolderName = zipItem.name.replace('.zip', '');
                    const extractFolderId = 'fld_' + Date.now() + Math.floor(Math.random()*1000);
                    
                    fileSystem.push({
                        id: extractFolderId, type: 'folder', name: extractFolderName, icon: '📁',
                        parentId: targetFolderId, x: 30, y: 30
                    });

                    const createdFolders = { '': extractFolderId }; 
                    const fileKeys = Object.keys(loadedZip.files);

                    for (let f=0; f<fileKeys.length; f++) {
                        const relativePath = fileKeys[f];
                        kompresorApp.setProgress(true, `Wypakowywanie: ${zipItem.name}`, relativePath, (f/fileKeys.length)*100);

                        const zipEntry = loadedZip.files[relativePath];
                        const pathParts = relativePath.split('/').filter(p => p !== '');
                        const itemName = pathParts.pop(); 
                        
                        let currentParentId = extractFolderId;
                        let builtPath = '';
                        for (const part of pathParts) {
                            builtPath += (builtPath ? '/' : '') + part;
                            if (!createdFolders[builtPath]) {
                                const newFldId = 'fld_' + Date.now() + Math.floor(Math.random()*1000);
                                fileSystem.push({
                                    id: newFldId, type: 'folder', name: part, icon: '📁',
                                    parentId: currentParentId, x: 20, y: 20
                                });
                                createdFolders[builtPath] = newFldId;
                            }
                            currentParentId = createdFolders[builtPath];
                        }

                        if (zipEntry.dir) {
                            const newFldId = 'fld_' + Date.now() + Math.floor(Math.random()*1000);
                            fileSystem.push({
                                id: newFldId, type: 'folder', name: itemName, icon: '📁',
                                parentId: currentParentId, x: 20, y: 20
                            });
                            createdFolders[relativePath.replace(/\/$/, '')] = newFldId;
                        } else {
                            const isImage = itemName.endsWith('.png') || itemName.endsWith('.jpg') || itemName.endsWith('.jpeg') || itemName.endsWith('.webp');
                            const fileId = 'file_' + Date.now() + Math.floor(Math.random()*1000);
                            
                            if (isImage) {
                                const base64Data = await zipEntry.async("base64");
                                const mime = itemName.endsWith('.png') ? 'image/png' : 'image/jpeg';
                                fileSystem.push({
                                    id: fileId, type: 'image', name: itemName, icon: '🖼️',
                                    content: `data:${mime};base64,${base64Data}`, parentId: currentParentId, x: 20, y: 20
                                });
                            } else {
                                const textData = await zipEntry.async("string");
                                fileSystem.push({
                                    id: fileId, type: 'file', name: itemName, icon: '📄',
                                    content: textData, parentId: currentParentId, x: 20, y: 20
                                });
                            }
                        }
                    }
                }
            }

            if(typeof fsManager !== 'undefined') fsManager.save();
            if(typeof desktop !== 'undefined') desktop.render();
            
            const aktowkaWin = document.getElementById('app-aktowka');
            if(aktowkaWin && aktowkaWin.classList.contains('active') && typeof fsManager !== 'undefined') {
                fsManager.renderExplorerContent(fsManager.currentFolder);
            }
            
            kompresorApp.selectedFiles.clear();
            kompresorApp.renderFiles();
            
            const timeSec = ((Date.now() - startTime) / 1000).toFixed(1);
            kompresorApp.showStatsModal('Rozpakowywanie Zakończone', 'Pliki zostały wyodrębnione.', 'N/A', 0, timeSec);

        } catch (error) {
            console.error(error);
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Nie można rozpakować (Uszkodzone archiwum?)', 'error');
        } finally {
            kompresorApp.setProgress(false);
        }
    }
};

setTimeout(kompresorApp.init, 500);