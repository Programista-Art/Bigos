// ======================================================================
// PLIK: js/desktop.js (Zarządzanie pulpitem, drag & drop, menu kontekstowe)
// ======================================================================

function getEventPos(e) {
    return e.touches && e.touches.length > 0 ? {x: e.touches[0].clientX, y: e.touches[0].clientY} : {x: e.clientX, y: e.clientY};
}

const desktop = {
    activeDrag: null, lastContextX: 0, lastContextY: 0,
    escapeHTML: (s) => s.replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t]||t)),

    getGridMetrics: () => {
        const cellW = (typeof GRID !== 'undefined' && GRID > 0) ? GRID : 90;
        const cellH = (typeof GRID !== 'undefined' && GRID > 0) ? GRID : 90;
        const marginX = 20;
        const marginY = 20;
        const taskbarH = 48;
        const area = (typeof document !== 'undefined') ? document.getElementById('desktop-area') : null;
        const winW = (area && area.clientWidth > 0) ? area.clientWidth : ((typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1280);
        const winH = (area && area.clientHeight > 0) ? area.clientHeight : (((typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 800) - taskbarH);
        const maxCols = Math.max(1, Math.floor(Math.max(cellW, winW - marginX) / cellW));
        const maxRows = Math.max(1, Math.floor(Math.max(cellH, winH - marginY) / cellH));
        return { cellW, cellH, marginX, marginY, maxCols, maxRows, winW, winH };
    },

    findFreeSlot: (prefX = null, prefY = null, excludeId = null, customPlaced = null) => {
        const { cellW, cellH, marginX, marginY, maxCols, maxRows } = desktop.getGridMetrics();
        const occupiedList = Array.isArray(customPlaced)
            ? customPlaced
            : ((typeof fileSystem !== 'undefined' && Array.isArray(fileSystem))
                ? fileSystem.filter(f => f && f.parentId === 'root' && f.id !== excludeId && Number.isFinite(f.x) && Number.isFinite(f.y))
                : []);

        const isSlotTaken = (x, y) => occupiedList.some(f => Math.abs(f.x - x) < 76 && Math.abs(f.y - y) < 76);

        if (prefX !== null && prefY !== null && Number.isFinite(prefX) && Number.isFinite(prefY)) {
            const baseCol = Math.max(0, Math.min(maxCols - 1, Math.round((prefX - marginX) / cellW)));
            const baseRow = Math.max(0, Math.min(maxRows - 1, Math.round((prefY - marginY) / cellH)));
            const directX = marginX + baseCol * cellW;
            const directY = marginY + baseRow * cellH;
            if (!isSlotTaken(directX, directY)) {
                return { x: directX, y: directY };
            }
            const maxRadius = Math.max(maxCols, maxRows);
            for (let r = 1; r <= maxRadius; r++) {
                for (let dc = -r; dc <= r; dc++) {
                    for (let dr = -r; dr <= r; dr++) {
                        if (Math.abs(dc) !== r && Math.abs(dr) !== r) continue;
                        const c = baseCol + dc;
                        const row = baseRow + dr;
                        if (c < 0 || c >= maxCols || row < 0 || row >= maxRows) continue;
                        const cx = marginX + c * cellW;
                        const cy = marginY + row * cellH;
                        if (!isSlotTaken(cx, cy)) return { x: cx, y: cy };
                    }
                }
            }
        }

        for (let col = 0; col < Math.max(maxCols, 50); col++) {
            for (let row = 0; row < maxRows; row++) {
                const cx = marginX + col * cellW;
                const cy = marginY + row * cellH;
                if (!isSlotTaken(cx, cy)) return { x: cx, y: cy };
            }
        }
        return { x: marginX, y: marginY };
    },

    normalizeIcons: () => {
        if (typeof fileSystem === 'undefined' || !Array.isArray(fileSystem)) return false;
        const { cellW, cellH, marginX, marginY, maxCols, maxRows } = desktop.getGridMetrics();
        const rootItems = fileSystem.filter(i => i && i.parentId === 'root');
        const placed = [];
        let changed = false;

        for (const item of rootItems) {
            let hasValidCoords = Number.isFinite(item.x) && Number.isFinite(item.y) && item.x >= 0 && item.y >= 0;
            let candX = marginX;
            let candY = marginY;

            if (hasValidCoords) {
                const col = Math.max(0, Math.min(maxCols - 1, Math.round((item.x - marginX) / cellW)));
                const row = Math.max(0, Math.min(maxRows - 1, Math.round((item.y - marginY) / cellH)));
                candX = marginX + col * cellW;
                candY = marginY + row * cellH;
            }

            const collides = !hasValidCoords || placed.some(p => Math.abs(p.x - candX) < 76 && Math.abs(p.y - candY) < 76);
            if (collides) {
                const free = desktop.findFreeSlot(null, null, item.id, placed);
                candX = free.x;
                candY = free.y;
            }

            if (item.x !== candX || item.y !== candY) {
                item.x = candX;
                item.y = candY;
                changed = true;
            }
            placed.push({ id: item.id, x: item.x, y: item.y });
        }
        return changed;
    },

    arrangeIcons: () => {
        const menu = document.getElementById('context-menu');
        if (menu) menu.classList.remove('active');
        if (typeof fileSystem === 'undefined' || !Array.isArray(fileSystem)) return;
        const { cellW, cellH, marginX, marginY, maxRows } = desktop.getGridMetrics();
        const rootItems = fileSystem.filter(i => i && i.parentId === 'root');
        rootItems.forEach((item, idx) => {
            const col = Math.floor(idx / maxRows);
            const row = idx % maxRows;
            item.x = marginX + col * cellW;
            item.y = marginY + row * cellH;
        });
        if (typeof fsManager !== 'undefined' && fsManager.save) fsManager.save();
        desktop.render();
    },
    
    render: () => {
        const area = document.getElementById('desktop-area'); 
        if(!area) return;
        area.innerHTML = '';
        desktop.normalizeIcons();
        
        fileSystem.filter(i => i.parentId === 'root').forEach(item => {
            const el = document.createElement('div');
            el.className = 'desktop-icon'; el.style.left = item.x + 'px'; el.style.top = item.y + 'px'; el.dataset.id = item.id;
            el.innerHTML = `<div class="icon-emoji">${item.icon}</div><div class="icon-text" title="${desktop.escapeHTML(item.name)}">${desktop.escapeHTML(item.name)}</div>`;
            
            // Domyślny fallback dla podwójnego kliknięcia
            el.ondblclick = (e) => { e.stopPropagation(); desktop.executeItem(item); };
            
            // Obsługa dotyku dla smartfonów
            let lastTap = 0;
            el.addEventListener('touchend', (e) => {
                let currentTime = new Date().getTime(); let tapLength = currentTime - lastTap;
                if(tapLength < 500 && tapLength > 0) { e.preventDefault(); desktop.executeItem(item); } lastTap = currentTime;
            });
            
            el.oncontextmenu = (e) => { e.stopPropagation(); desktop.showContextMenu(e, item.type, item.id); };
            
            // KULOODPORNE podwójne kliknięcie (ignoruje drgania myszki, które psuły native dblclick)
            let lastClickTime = 0;
            el.onmousedown = (e) => {
                let now = Date.now();
                if (now - lastClickTime < 400) { // Jeśli kliknięto 2 razy w ciągu 400ms
                    e.stopPropagation();
                    desktop.executeItem(item);
                    lastClickTime = 0;
                    return; // Przerywamy, by nie aktywować przeciągania!
                }
                lastClickTime = now;

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
        if (item.type === 'app') {
            if (item.appId === 'wasm' && typeof wasmEngineApp !== 'undefined') {
                wasmEngineApp.open(null); 
            } else if (item.appId === 'format') {
                // Gdy klikniemy formatuj, zamiast szukać okienka wywołujemy nową funkcję
                if(typeof apps !== 'undefined') {
                    apps.toggleStartMenu(); // Zwijamy szufladę jeśli z niej kliknięto
                    apps.formatSystem();
                }
            } else {
                const appId = item.appId || item.id;
                const el = document.getElementById('app-' + appId);
                if (el) {
                    winManager.open(appId);
                } else if (typeof bigosSandbox !== 'undefined' && bigosSandbox.launchPackage) {
                    bigosSandbox.launchPackage(appId);
                } else {
                    winManager.open(appId);
                }
            }
        } else if (item.type === 'folder') {
            fsManager.openFolder(item.id);
        } else if (item.type === 'image') {
            if (typeof patrzalkaApp !== 'undefined') {
                patrzalkaApp.open(item);
            }
        } else if (item.type === 'file') {
            if (item.name.endsWith('.csv') && typeof tabelarzApp !== 'undefined') {
                tabelarzApp.openFromFS(item);
            } else if (item.name.endsWith('.wasm') && typeof wasmEngineApp !== 'undefined') {
                wasmEngineApp.open(item);
            } else if (item.name.endsWith('.zip') && typeof kompresorApp !== 'undefined') {
                kompresorApp.openWithItem(item.id);
            } else {
                if(typeof skrybaApp !== 'undefined') skrybaApp.open(item); 
            }
        }
    },
    
    createFolder: (targetId) => {
        document.getElementById('context-menu').classList.remove('active');
        if (typeof ui !== 'undefined') {
            ui.showPrompt("Nazwa nowego folderu:", "Nowy Folder", "Utwórz", (name) => {
                if(!name || name.trim() === '') return;
                let x = 20, y = 20;
                if(targetId === 'root') {
                    const slot = desktop.findFreeSlot(
                        desktop.lastContextX ? desktop.lastContextX : null,
                        desktop.lastContextY ? desktop.lastContextY : null
                    );
                    x = slot.x;
                    y = slot.y;
                }
                const id = 'fld_'+Date.now();
                fileSystem.push({ id: id, type: 'folder', name: name.trim(), icon: '📁', parentId: targetId, x: x, y: y });
                
                if(typeof fsManager !== 'undefined') fsManager.save(); 
                if(targetId === 'root') desktop.render();
                
                const aktowkaWin = document.getElementById('app-aktowka');
                if(aktowkaWin && aktowkaWin.classList.contains('active') && typeof fsManager !== 'undefined' && fsManager.currentFolder === targetId) {
                    fsManager.renderExplorerContent(targetId);
                }
            });
        }
    },
    
    createFile: (targetId) => {
        document.getElementById('context-menu').classList.remove('active');
        if (typeof ui !== 'undefined') {
            ui.showPrompt("Nazwa nowego pliku:", "Nowy Plik.txt", "Utwórz", (name) => {
                if(!name || name.trim() === '') return;
                if(!name.endsWith('.txt')) name += '.txt';
                let x = 20, y = 20;
                if(targetId === 'root') {
                    const slot = desktop.findFreeSlot(
                        desktop.lastContextX ? desktop.lastContextX : null,
                        desktop.lastContextY ? desktop.lastContextY : null
                    );
                    x = slot.x;
                    y = slot.y;
                }
                const id = 'file_'+Date.now();
                fileSystem.push({ id: id, type: 'file', name: name.trim(), icon: '📄', content: '', parentId: targetId, x: x, y: y });
                
                if(typeof fsManager !== 'undefined') fsManager.save(); 
                if(targetId === 'root') desktop.render();
                
                const aktowkaWin = document.getElementById('app-aktowka');
                if(aktowkaWin && aktowkaWin.classList.contains('active') && typeof fsManager !== 'undefined' && fsManager.currentFolder === targetId) {
                    fsManager.renderExplorerContent(targetId);
                }
            });
        }
    },
    
    deleteItem: (id) => {
        document.getElementById('context-menu').classList.remove('active');
        const idx = fileSystem.findIndex(i => i.id === id);
        if(idx > -1) {
            if(id === 'hasiok') return typeof apps !== 'undefined' ? apps.showToast('Błąd', 'Nie można usunąć Kosza!', 'error') : null;
            fileSystem[idx].parentId = 'hasiok'; 
            
            if(typeof fsManager !== 'undefined') fsManager.save(); 
            desktop.render(); 
            
            const aktowkaWin = document.getElementById('app-aktowka');
            if(aktowkaWin && aktowkaWin.classList.contains('active') && typeof fsManager !== 'undefined') {
                fsManager.renderExplorerContent(fsManager.currentFolder);
            }
        }
    },
    
    deletePermanent: async (id) => {
        document.getElementById('context-menu').classList.remove('active');
        // Authoritative deletion: live FS + typed storage (meta/content/revisions).
        if (typeof fsManager !== 'undefined' && fsManager.deleteNode) {
            const r = await fsManager.deleteNode(id);
            if (r && r.ok === false) {
                if (typeof apps !== 'undefined') apps.showToast('Błąd', 'Nie udało się usunąć pliku z dysku.', 'error');
                return;
            }
        } else {
            // Fallback: in-place removal from the shared array.
            if (typeof bigosState !== 'undefined' && bigosState.removeWhere) {
                bigosState.removeWhere((f) => f && f.id === id);
            } else {
                fileSystem = fileSystem.filter(i => i.id !== id);
            }
            if(typeof fsManager !== 'undefined') fsManager.save();
        }

        const aktowkaWin = document.getElementById('app-aktowka');
        if(aktowkaWin && aktowkaWin.classList.contains('active') && typeof fsManager !== 'undefined') {
            fsManager.renderExplorerContent(fsManager.currentFolder);
        }
        if(typeof apps !== 'undefined') apps.showToast('Hasiok', 'Usunięto bezpowrotnie.', 'success');
    },
    
    restoreItem: (id) => {
        document.getElementById('context-menu').classList.remove('active');
        const item = fileSystem.find(i => i.id === id);
        if(item) {
            item.parentId = 'root'; 
            const slot = desktop.findFreeSlot(item.x, item.y, item.id);
            item.x = slot.x;
            item.y = slot.y;
            if(typeof fsManager !== 'undefined') fsManager.save(); 
            desktop.render();
            
            const aktowkaWin = document.getElementById('app-aktowka');
            if(aktowkaWin && aktowkaWin.classList.contains('active') && typeof fsManager !== 'undefined') {
                fsManager.renderExplorerContent(fsManager.currentFolder);
            }
            if(typeof apps !== 'undefined') apps.showToast('Hasiok', 'Przywrócono na Pulpit', 'success');
        }
    },
    
    emptyHasiok: () => {
        document.getElementById('context-menu').classList.remove('active');
        if (typeof ui !== 'undefined') {
            ui.showPrompt("POTWIERDŹ", "Wpisz 'TAK' aby opróżnić kosz trwale", "Opróżnij", async (val) => {
                if(val && val.toLowerCase() === 'tak') {
                    // Collect trash items, then delete each authoritatively.
                    const trashIds = fileSystem
                        .filter(i => i.parentId === 'hasiok' && i.id !== 'hasiok')
                        .map(i => i.id);
                    if (typeof fsManager !== 'undefined' && fsManager.deleteNode) {
                        for (const tid of trashIds) {
                            await fsManager.deleteNode(tid);
                        }
                    } else {
                        if (typeof bigosState !== 'undefined' && bigosState.removeWhere) {
                            bigosState.removeWhere((f) => f && f.parentId === 'hasiok' && f.id !== 'hasiok');
                        } else {
                            fileSystem = fileSystem.filter(i => i.parentId !== 'hasiok' || i.id === 'hasiok');
                        }
                        if(typeof fsManager !== 'undefined') fsManager.save();
                    }

                    const aktowkaWin = document.getElementById('app-aktowka');
                    if(aktowkaWin && aktowkaWin.classList.contains('active') && typeof fsManager !== 'undefined') {
                        fsManager.renderExplorerContent(fsManager.currentFolder);
                    }
                    if(typeof apps !== 'undefined') apps.showToast('Hasiok', 'Kosz opróżniony', 'success');
                }
            });
        }
    },
    
    renameItem: (id) => {
        document.getElementById('context-menu').classList.remove('active');
        const item = fileSystem.find(i => i.id === id);
        if(item) {
            if (typeof ui !== 'undefined') {
                ui.showPrompt("Zmień nazwę dla:", item.name, "Zapisz", (newName) => {
                    if(newName && newName.trim() !== '') { 
                        item.name = newName.trim(); 
                        if(typeof fsManager !== 'undefined') fsManager.save(); 
                        if(item.parentId === 'root') desktop.render(); 
                        
                        const aktowkaWin = document.getElementById('app-aktowka');
                        if(aktowkaWin && aktowkaWin.classList.contains('active') && typeof fsManager !== 'undefined' && fsManager.currentFolder === item.parentId) {
                            fsManager.renderExplorerContent(item.parentId);
                        }
                    }
                });
            }
        }
    },
    
    actionClipboard: (action, id) => {
        document.getElementById('context-menu').classList.remove('active');
        const item = fileSystem.find(i => i.id === id);
        if(item) clipboard = { action: action, item: {...item} };
    },
    
    pasteClipboard: async () => {
        document.getElementById('context-menu').classList.remove('active');
        if(clipboard.item) {
            let parentFolder = (typeof fsManager !== 'undefined') ? fsManager.currentFolder : 'root';
            let newItem = {...clipboard.item, id: 'item_'+Date.now(), parentId: parentFolder, x: 20, y: 20};
            
            if(parentFolder === 'root') {
                const slot = desktop.findFreeSlot(
                    desktop.lastContextX ? desktop.lastContextX : null,
                    desktop.lastContextY ? desktop.lastContextY : null
                );
                newItem.x = slot.x;
                newItem.y = slot.y;
            }
            if(clipboard.action === 'copy') newItem.name += ' - Kopia';
            
            if (typeof bigosState !== 'undefined' && bigosState.push) {
                bigosState.push(newItem);
            } else {
                fileSystem.push(newItem);
            }
            
            if(clipboard.action === 'cut') {
                const cutId = clipboard.item.id;
                clipboard.action = null; 
                clipboard.item = null;
                if (typeof fsManager !== 'undefined' && fsManager.deleteNode) {
                    await fsManager.deleteNode(cutId);
                } else {
                    if (typeof bigosState !== 'undefined' && bigosState.removeWhere) {
                        bigosState.removeWhere(i => i.id === cutId);
                    } else {
                        fileSystem = fileSystem.filter(i => i.id !== cutId);
                    }
                }
            }
            
            if(typeof fsManager !== 'undefined') await fsManager.save(); 
            desktop.render(); 
            
            const aktowkaWin = document.getElementById('app-aktowka');
            if(aktowkaWin && aktowkaWin.classList.contains('active') && typeof fsManager !== 'undefined') {
                fsManager.renderExplorerContent(fsManager.currentFolder);
            }
        }
    },
    
    showContextMenu: (e, targetType, id) => {
        e.preventDefault(); e.stopPropagation();
        const pos = getEventPos(e);
        desktop.lastContextX = pos.x; desktop.lastContextY = pos.y;
        
        const menu = document.getElementById('context-menu'); 
        menu.innerHTML = '';
        
        // NOWOŚĆ: Dodanie klas motywów (Szkło, obramowania, tło) do menu kontekstowego
        menu.className = 'g-panel border g-border shadow-2xl rounded-xl py-1 flex flex-col z-[10000] absolute min-w-[180px]';
        
        const btnClass = "px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition text-sm g-text font-medium";
        const sep = "<div class='border-t g-border my-1'></div>";

        if(typeof fsManager !== 'undefined' && fsManager.currentFolder === 'hasiok') {
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
                ${targetFolder === 'root' ? `<div class="${btnClass}" onclick="desktop.arrangeIcons()">✨ Uporządkuj ikony</div>` : ''}
                ${sep}
                <div class="${btnClass} ${!clipboard.item?'opacity-50 pointer-events-none':''}" onclick="desktop.pasteClipboard()">Wklej</div>
            `;
        } else if (targetType === 'folder' || targetType === 'file' || targetType === 'app' || targetType === 'image') {
            menu.innerHTML += `<div class="${btnClass}" onclick="desktop.actionClipboard('copy', '${id}')">Kopiuj</div>`;
            if(targetType !== 'app') menu.innerHTML += `<div class="${btnClass}" onclick="desktop.actionClipboard('cut', '${id}')">Wytnij</div>`;
            menu.innerHTML += `<div class="${btnClass}" onclick="desktop.renameItem('${id}')">Zmień nazwę</div>`;
            menu.innerHTML += `<div class="${btnClass}" onclick="document.getElementById('context-menu').classList.remove('active'); if(typeof apps !== 'undefined') apps.showToast('Właściwości', 'Informacje o pliku: ${desktop.escapeHTML(fileSystem.find(i=>i.id===id)?.name||id)}', 'info')">Właściwości</div>`;
            
            if(targetType === 'file') {
                const f = fileSystem.find(i=>i.id===id);
                if (f && f.name.endsWith('.csv')) {
                    menu.innerHTML += `${sep}<div class="${btnClass} font-bold text-emerald-600" onclick="document.getElementById('context-menu').classList.remove('active'); tabelarzApp.openFromFS(fileSystem.find(i=>i.id==='${id}'))">Otwórz za pomocą -> Tabelarz</div>`;
                } else if (f && f.name.endsWith('.wasm')) {
                    menu.innerHTML += `${sep}<div class="${btnClass} font-bold text-red-500" onclick="document.getElementById('context-menu').classList.remove('active'); if (typeof wasmEngineApp !== 'undefined') wasmEngineApp.open(fileSystem.find(i=>i.id==='${id}'))">Otwórz w WASM Engine</div>`;
                } else if (f && f.name.endsWith('.zip')) {
                    menu.innerHTML += `${sep}<div class="${btnClass} font-bold text-blue-500" onclick="document.getElementById('context-menu').classList.remove('active'); if (typeof kompresorApp !== 'undefined') kompresorApp.openWithItem('${id}')">Otwórz w Upychaczu</div>`;
                } else {
                    menu.innerHTML += `${sep}<div class="${btnClass}" onclick="document.getElementById('context-menu').classList.remove('active'); desktop.executeItem(fileSystem.find(i=>i.id==='${id}'))">Otwórz za pomocą -> Skryba</div>`;
                }
            }
            if(targetType === 'image') {
                menu.innerHTML += `${sep}<div class="${btnClass}" onclick="document.getElementById('context-menu').classList.remove('active'); desktop.executeItem(fileSystem.find(i=>i.id==='${id}'))">Otwórz -> Patrzałka</div>`;
                menu.innerHTML += `<div class="${btnClass}" onclick="document.getElementById('context-menu').classList.remove('active'); winManager.open('szkicownik'); setTimeout(()=>paintOpenFromFS('${id}'), 200);">Edytuj -> Szkicownik</div>`;
            }
            if(id !== 'hasiok') menu.innerHTML += `${sep}<div class="${btnClass} text-red-600" onclick="desktop.deleteItem('${id}')">Usuń (Do Hasioka)</div>`;
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
        } else if(desktop.activeDrag.type === 'window' || desktop.activeDrag.type === 'sticky') {
            let nx = pos.x - desktop.activeDrag.oX; let ny = pos.y - desktop.activeDrag.oY;
            if(nx < 0) nx = 0; if(ny < 0) ny = 0;
            const tbBound = window.innerHeight - 48 - desktop.activeDrag.el.offsetHeight;
            if(desktop.activeDrag.type !== 'window' && ny > tbBound) ny = tbBound;
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
                    desktop.activeDrag.ref.parentId = targetItem.id; 
                    if(typeof fsManager !== 'undefined') fsManager.save(); 
                    desktop.render();
                    const aktowkaWin = document.getElementById('app-aktowka');
                    if(aktowkaWin && aktowkaWin.classList.contains('active') && typeof fsManager !== 'undefined') fsManager.renderExplorerContent(fsManager.currentFolder);
                    desktop.activeDrag = null; return;
                } else if(targetItem && targetItem.id === 'hasiok') {
                    desktop.activeDrag.ref.parentId = 'hasiok'; 
                    if(typeof fsManager !== 'undefined') fsManager.save(); 
                    desktop.render();
                    const aktowkaWin = document.getElementById('app-aktowka');
                    if(aktowkaWin && aktowkaWin.classList.contains('active') && typeof fsManager !== 'undefined') fsManager.renderExplorerContent(fsManager.currentFolder);
                    desktop.activeDrag = null; return;
                }
            }

            if(elBelow && (elBelow.id === 'explorer-content' || elBelow.closest('#explorer-content'))) {
                if(typeof fsManager !== 'undefined' && desktop.activeDrag.ref.parentId !== fsManager.currentFolder) {
                    desktop.activeDrag.ref.parentId = fsManager.currentFolder;
                    fsManager.save(); desktop.render();
                    fsManager.renderExplorerContent(fsManager.currentFolder);
                    desktop.activeDrag = null; return;
                }
            }

            if(!elBelow || elBelow.id === 'desktop-area' || elBelow.id === 'desktop-bg') {
                if(desktop.activeDrag.ref.parentId !== 'root') desktop.activeDrag.ref.parentId = 'root';
                let rawX = pos.x - desktop.activeDrag.oX; let rawY = pos.y - desktop.activeDrag.oY;
                const slot = desktop.findFreeSlot(rawX, rawY, desktop.activeDrag.ref.id);
                desktop.activeDrag.ref.x = slot.x; desktop.activeDrag.ref.y = slot.y; 
                if(typeof fsManager !== 'undefined') fsManager.save();
            }
            
            desktop.render();
            const aktowkaWin = document.getElementById('app-aktowka');
            if(aktowkaWin && aktowkaWin.classList.contains('active') && typeof fsManager !== 'undefined') {
                fsManager.renderExplorerContent(fsManager.currentFolder);
            }

        } else if (desktop.activeDrag.type === 'icon_pending') {
            // Click jest obsługiwany przez inne zdarzenia
        } else if (desktop.activeDrag.type === 'sticky') { 
            if(typeof apps !== 'undefined') apps.saveStickyNotes(); 
        }
    }
    desktop.activeDrag = null;
}

document.addEventListener('mousemove', handleDragMove); 
document.addEventListener('touchmove', handleDragMove, {passive: false});
document.addEventListener('mouseup', handleDragEnd); 
document.addEventListener('touchend', handleDragEnd);

document.addEventListener('mousedown', (e) => {
    if(!e.target.closest('#start-menu') && !e.target.closest('button[onclick="apps.toggleStartMenu()"]')) {
        const sm = document.getElementById('start-menu');
        if (sm) sm.classList.add('hidden');
    }
    if(!e.target.closest('#calendar-widget') && !e.target.closest('button[onclick="apps.toggleCalendar(event)"]') && !e.target.closest('button[onclick*="changeCalendarMonth"]')) {
        const cw = document.getElementById('calendar-widget');
        if (cw) cw.classList.add('hidden-cal');
    }
    if(!e.target.closest('#context-menu') && e.button !== 2 && !e.target.closest('#system-prompt-modal') && !e.target.closest('#paint-resize-modal')) {
        const cm = document.getElementById('context-menu');
        if (cm) cm.classList.remove('active');
    }
});
// Explicit export — top-level const does NOT become a window property.
window.desktop = desktop;
if (typeof globalThis !== 'undefined') globalThis.desktop = desktop;
