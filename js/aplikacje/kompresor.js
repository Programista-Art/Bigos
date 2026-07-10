// ======================================================================
// PLIK: js/aplikacje/kompresor.js (Upychacz - Kompresor i Dekompresor)
// ======================================================================

const kompresorApp = {
    currentFolder: 'root',
    selectedFiles: new Set(),
    isProcessing: false,

    init: () => {
        // Dynamiczne ładowanie biblioteki JSZip (Standard przemysłowy)
        if (!window.JSZip) {
            const script = document.createElement('script');
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
            document.head.appendChild(script);
        }
        kompresorApp.upgradeUI();
        kompresorApp.renderFiles();
    },

    openWithItem: (itemId) => {
        if(typeof winManager !== 'undefined') winManager.open('kompresor');
        kompresorApp.selectedFiles.clear();
        kompresorApp.selectedFiles.add(itemId);
        kompresorApp.renderFiles();
    },

    upgradeUI: () => {
        let appWindow = document.getElementById('app-kompresor');
        
        if (!appWindow) { 
            appWindow = document.createElement('div');
            appWindow.id = 'app-kompresor';
            appWindow.className = 'window absolute';
            document.body.appendChild(appWindow);
        }

        appWindow.style.width = '550px';
        appWindow.style.height = '450px';
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
            <div class="px-4 py-2 border-b g-border flex justify-between items-center cursor-move bg-black/30 shrink-0" onmousedown="winManager.startDrag(event, 'app-kompresor')" ontouchstart="winManager.startDrag(event, 'app-kompresor')">
                <span class="text-sm font-bold g-accent drop-shadow-md">🗜️ Upychacz (Archiwa ZIP)</span>
                <div class="flex gap-2">
                    <button onclick="winManager.minimize('kompresor')" class="g-icon-btn px-1 hover:text-white transition">_</button>
                    <button onclick="winManager.close('kompresor')" class="text-red-500 hover:text-red-400 px-1 font-bold transition">✖</button>
                </div>
            </div>

            <!-- Pasek Narzędziowy -->
            <div class="p-3 border-b g-border bg-black/20 shrink-0 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div class="flex gap-2 w-full sm:w-auto">
                    <button onclick="kompresorApp.navigateUp()" class="g-btn px-3 py-1.5 rounded shadow-sm text-xs font-bold w-full sm:w-auto">⬆️ W górę</button>
                    <div id="komp-path" class="g-bg g-text border g-border rounded px-3 py-1.5 text-xs font-mono truncate shadow-inner flex-grow">BigOS:\\Pulpit</div>
                </div>
                <div class="flex gap-2 w-full sm:w-auto">
                    <button onclick="kompresorApp.showSaveModal()" class="g-btn bg-blue-600/20 border-blue-500 hover:bg-blue-500 px-3 py-1.5 rounded shadow-sm text-xs font-bold w-1/2 sm:w-auto">📦 Spakuj (ZIP)</button>
                    <button onclick="kompresorApp.unpackSelected()" class="g-btn bg-emerald-600/20 border-emerald-500 hover:bg-emerald-500 px-3 py-1.5 rounded shadow-sm text-xs font-bold w-1/2 sm:w-auto">📂 Rozpakuj</button>
                </div>
            </div>

            <!-- Lista plików -->
            <div class="flex-grow bg-black/30 p-2 overflow-y-auto custom-scrollbar relative">
                
                <div id="komp-overlay" class="hidden absolute inset-0 bg-black/80 z-50 flex items-center justify-center flex-col backdrop-blur-sm">
                    <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div class="text-white font-bold" id="komp-status">Przetwarzanie archiwum...</div>
                </div>

                <table class="w-full text-left text-xs g-text whitespace-nowrap">
                    <thead>
                        <tr class="border-b g-border text-gray-500 dark:text-gray-400">
                            <th class="p-2 w-10 text-center"><input type="checkbox" id="komp-select-all" onclick="kompresorApp.toggleAll(this)" class="accent-blue-500 cursor-pointer"></th>
                            <th class="p-2">Nazwa Pliku</th>
                            <th class="p-2">Typ</th>
                            <th class="p-2 text-right">Rozmiar</th>
                        </tr>
                    </thead>
                    <tbody id="komp-file-list">
                        <!-- Pliki -->
                    </tbody>
                </table>
            </div>
        `;
        appWindow.appendChild(proUI);
    },

    navigateUp: () => {
        if(kompresorApp.currentFolder === 'root' || kompresorApp.currentFolder === 'hasiok') return;
        const current = fileSystem.find(i => i.id === kompresorApp.currentFolder);
        if(current && current.parentId) kompresorApp.currentFolder = current.parentId;
        else kompresorApp.currentFolder = 'root';
        kompresorApp.selectedFiles.clear();
        kompresorApp.renderFiles();
    },

    toggleAll: (checkbox) => {
        const items = fileSystem.filter(i => i.parentId === kompresorApp.currentFolder && i.id !== 'hasiok');
        if (checkbox.checked) {
            items.forEach(i => kompresorApp.selectedFiles.add(i.id));
        } else {
            kompresorApp.selectedFiles.clear();
        }
        kompresorApp.renderFiles();
    },

    toggleSelect: (id) => {
        if (kompresorApp.selectedFiles.has(id)) kompresorApp.selectedFiles.delete(id);
        else kompresorApp.selectedFiles.add(id);
        kompresorApp.renderFiles();
    },

    renderFiles: () => {
        const list = document.getElementById('komp-file-list');
        const pathEl = document.getElementById('komp-path');
        if (!list || !pathEl) return;

        // Ścieżka
        let path = []; let curr = kompresorApp.currentFolder;
        while(curr && curr !== 'root' && curr !== 'hasiok') {
            const f = fileSystem.find(i => i.id === curr);
            if(f) { path.unshift(f.name); curr = f.parentId; } else break;
        }
        pathEl.innerText = (kompresorApp.currentFolder === 'hasiok' ? 'BigOS:\\Kosz' : 'BigOS:\\Pulpit') + (path.length > 0 ? '\\' + path.join('\\') : '');

        list.innerHTML = '';
        const items = fileSystem.filter(i => i.parentId === kompresorApp.currentFolder && i.id !== 'hasiok');

        if (items.length === 0) {
            list.innerHTML = `<tr><td colspan="4" class="text-center p-6 g-text-muted italic">Katalog jest pusty</td></tr>`;
            return;
        }

        // Sortowanie: Najpierw foldery, potem pliki
        items.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });

        items.forEach(item => {
            const isSelected = kompresorApp.selectedFiles.has(item.id);
            let sizeStr = '--';
            if (item.type === 'file' || item.type === 'image') {
                const len = item.content ? item.content.length : 0;
                // Skompresowany plik Base64 zajmuje ~33% więcej miejsca, możemy to zignorować lub obliczyć czystą długość
                sizeStr = len > 1024 ? (len / 1024).toFixed(1) + ' KB' : len + ' B';
            }

            const tr = document.createElement('tr');
            tr.className = `border-b g-border transition cursor-pointer ${isSelected ? 'bg-blue-500/20' : 'hover:bg-white/5'}`;
            tr.onclick = (e) => {
                if (e.target.tagName !== 'INPUT' && item.type === 'folder') {
                    kompresorApp.currentFolder = item.id;
                    kompresorApp.selectedFiles.clear();
                    kompresorApp.renderFiles();
                } else {
                    kompresorApp.toggleSelect(item.id);
                }
            };

            tr.innerHTML = `
                <td class="p-2 text-center" onclick="event.stopPropagation()"><input type="checkbox" class="accent-blue-500 cursor-pointer" ${isSelected ? 'checked' : ''} onclick="kompresorApp.toggleSelect('${item.id}')"></td>
                <td class="p-2 font-bold truncate max-w-[200px]" title="${item.name}">${item.icon} ${typeof desktop !== 'undefined' ? desktop.escapeHTML(item.name) : item.name}</td>
                <td class="p-2 g-text-muted uppercase">${item.type === 'folder' ? 'Katalog' : (item.name.endsWith('.zip') ? 'Archiwum ZIP' : item.type)}</td>
                <td class="p-2 text-right g-text-muted font-mono">${sizeStr}</td>
            `;
            list.appendChild(tr);
        });
        
        // Zaktualizuj checkbox "Select All"
        const selectAllCb = document.getElementById('komp-select-all');
        if (selectAllCb) selectAllCb.checked = (items.length > 0 && kompresorApp.selectedFiles.size === items.length);
    },

    setLoading: (state, msg = '') => {
        const overlay = document.getElementById('komp-overlay');
        const status = document.getElementById('komp-status');
        if (!overlay || !window.JSZip) return;
        
        if (state) {
            overlay.classList.remove('hidden');
            if(status) status.innerText = msg;
            kompresorApp.isProcessing = true;
        } else {
            overlay.classList.add('hidden');
            kompresorApp.isProcessing = false;
        }
    },

    // ----------------------------------------------------------------
    // ZAPISYWANIE ARCHIWUM DO BIGOS (Własne Modalne Okienko)
    // ----------------------------------------------------------------
    showSaveModal: () => {
        if (!window.JSZip) return typeof apps !== 'undefined' ? apps.showToast('Upychacz', 'Biblioteka silnika ZIP jeszcze się ładuje...', 'info') : null;
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
                    <input type="text" id="komp-save-name" value="Moja_Paczka.zip" class="w-full p-2 bg-gray-100 dark:bg-[#111] border border-gray-300 dark:border-[#444] rounded outline-none text-gray-800 dark:text-white focus:border-blue-500">
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
        
        // Zaznacz nazwę by łatwo podmienić
        const input = document.getElementById('komp-save-name');
        input.focus();
        input.setSelectionRange(0, input.value.indexOf('.'));
    },

    confirmPack: async () => {
        const nameInput = document.getElementById('komp-save-name').value.trim();
        const folderId = document.getElementById('komp-save-folder').value;
        const modal = document.getElementById('komp-save-modal');
        if(modal) modal.remove();

        if(!nameInput) return;
        let zipName = nameInput.endsWith('.zip') ? nameInput : nameInput + '.zip';

        kompresorApp.setLoading(true, 'Tworzenie archiwum (Zapis zgodny z PC)...');

        try {
            const zip = new JSZip();

            // Funkcja rekurencyjnie dodająca pliki i foldery do obiektu JSZip
            const addItemsToZip = (itemIds, currentZipFolder) => {
                itemIds.forEach(id => {
                    const item = fileSystem.find(i => i.id === id);
                    if (!item) return;

                    if (item.type === 'folder') {
                        const newFolder = currentZipFolder.folder(item.name);
                        const childrenIds = fileSystem.filter(i => i.parentId === item.id).map(i => i.id);
                        addItemsToZip(childrenIds, newFolder);
                    } else if (item.type === 'image' || (item.content && item.content.startsWith('data:'))) {
                        // Base64 wymaga obcięcia prefixu np. 'data:image/png;base64,' do czystego strumienia dla 7-zipa
                        const base64Data = item.content.split(',')[1] || item.content;
                        currentZipFolder.file(item.name, base64Data, {base64: true});
                    } else {
                        // Zwykłe pliki tekstowe
                        currentZipFolder.file(item.name, item.content || '');
                    }
                });
            };

            addItemsToZip(Array.from(kompresorApp.selectedFiles), zip);

            // Generujemy czysty, działający ciąg błękitny ZIP
            const base64Content = await zip.generateAsync({type: "base64", compression: "DEFLATE"});
            
            // MUSIMY ZAPISAĆ Z PREFIKSEM APPLICATION/ZIP by Aktówka go łatwo odkodowała!
            const dataUri = `data:application/zip;base64,${base64Content}`;
            
            fileSystem.push({
                id: 'zip_' + Date.now(),
                type: 'file',
                name: zipName,
                icon: '🗜️',
                content: dataUri,
                parentId: folderId,
                x: Math.floor(Math.random() * 50) + 20, 
                y: Math.floor(Math.random() * 50) + 20
            });
            
            if(typeof fsManager !== 'undefined') fsManager.save();
            if(typeof desktop !== 'undefined') desktop.render();
            
            const aktowkaWin = document.getElementById('app-aktowka');
            if(aktowkaWin && aktowkaWin.classList.contains('active') && typeof fsManager !== 'undefined') {
                fsManager.renderExplorerContent(fsManager.currentFolder);
            }
            
            kompresorApp.selectedFiles.clear();
            kompresorApp.renderFiles();
            
            if(typeof apps !== 'undefined') apps.showToast('Sukces', `Zapisano ${zipName} w systemie. Plik jest kompatybilny z Windows!`, 'success');

        } catch (error) {
            console.error(error);
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Wystąpił problem podczas kompresji', 'error');
        } finally {
            kompresorApp.setLoading(false);
        }
    },

    // ----------------------------------------------------------------
    // LOGIKA ROZPAKOWYWANIA Z PRAWDZIWEGO .ZIP
    // ----------------------------------------------------------------
    unpackSelected: async () => {
        if (!window.JSZip) return typeof apps !== 'undefined' ? apps.showToast('Upychacz', 'Silnik ZIP nie jest gotowy', 'info') : null;
        
        const selectedArr = Array.from(kompresorApp.selectedFiles);
        const zipItems = selectedArr.map(id => fileSystem.find(i => i.id === id)).filter(i => i && i.name.endsWith('.zip'));

        if (zipItems.length === 0) return typeof apps !== 'undefined' ? apps.showToast('Błąd', 'Zaznacz co najmniej jedno archiwum .zip', 'error') : null;

        kompresorApp.setLoading(true, 'Wypakowywanie danych...');

        try {
            for (const zipItem of zipItems) {
                const zip = new JSZip();
                
                // Obsługa starych plików ZIP (które nie miały tagu data URI) jak i nowych
                let rawContent = zipItem.content || '';
                if (rawContent.startsWith('data:')) {
                    rawContent = rawContent.split(',')[1];
                }
                
                const loadedZip = await zip.loadAsync(rawContent, {base64: true});

                // Tworzymy nadrzędny folder dla wypakowanych plików
                const extractFolderName = zipItem.name.replace('.zip', '');
                const extractFolderId = 'fld_' + Date.now() + Math.floor(Math.random()*1000);
                
                fileSystem.push({
                    id: extractFolderId, type: 'folder', name: extractFolderName, icon: '📁',
                    parentId: kompresorApp.currentFolder, x: 30, y: 30
                });

                // Odtwarzanie struktury katalogów i plików
                const createdFolders = { '': extractFolderId }; // Mapa ścieżka -> ID folderu w BigOS

                for (const relativePath in loadedZip.files) {
                    const zipEntry = loadedZip.files[relativePath];
                    
                    // Rozwiązywanie ścieżek
                    const pathParts = relativePath.split('/').filter(p => p !== '');
                    const itemName = pathParts.pop(); // Ostatni element to nazwa
                    const parentPath = pathParts.join('/'); // Reszta to ścieżka rodzica
                    
                    // Upewnij się, że foldery rodziców istnieją w BigOS
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
                        // Tworzenie folderu końcowego, jeśli to katalog
                        const newFldId = 'fld_' + Date.now() + Math.floor(Math.random()*1000);
                        fileSystem.push({
                            id: newFldId, type: 'folder', name: itemName, icon: '📁',
                            parentId: currentParentId, x: 20, y: 20
                        });
                        createdFolders[relativePath.replace(/\/$/, '')] = newFldId;
                    } else {
                        // Rozpakowywanie pliku
                        const isImage = itemName.endsWith('.png') || itemName.endsWith('.jpg') || itemName.endsWith('.jpeg') || itemName.endsWith('.webp');
                        const fileId = 'file_' + Date.now() + Math.floor(Math.random()*1000);
                        
                        if (isImage) {
                            const base64Data = await zipEntry.async("base64");
                            const mime = itemName.endsWith('.png') ? 'image/png' : 'image/jpeg';
                            fileSystem.push({
                                id: fileId, type: 'image', name: itemName, icon: '🖼️',
                                content: `data:${mime};base64,${base64Data}`,
                                parentId: currentParentId, x: 20, y: 20
                            });
                        } else {
                            const textData = await zipEntry.async("string");
                            fileSystem.push({
                                id: fileId, type: 'file', name: itemName, icon: '📄',
                                content: textData,
                                parentId: currentParentId, x: 20, y: 20
                            });
                        }
                    }
                }
            }

            if(typeof fsManager !== 'undefined') fsManager.save();
            if(typeof desktop !== 'undefined') desktop.render();
            const aktowkaWin = document.getElementById('app-aktowka');
            if(aktowkaWin && aktowkaWin.classList.contains('active') && typeof fsManager !== 'undefined') fsManager.renderExplorerContent(fsManager.currentFolder);
            
            kompresorApp.selectedFiles.clear();
            kompresorApp.renderFiles();
            
            if(typeof apps !== 'undefined') apps.showToast('Sukces', 'Pomyślnie rozpakowano archiwum ZIP!', 'success');

        } catch (error) {
            console.error(error);
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Nie można rozpakować tego pliku (Uszkodzone archiwum?)', 'error');
        } finally {
            kompresorApp.setLoading(false);
        }
    }
};

setTimeout(kompresorApp.init, 500);