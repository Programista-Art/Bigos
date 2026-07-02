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
            
            if(targetType === 'file') menu.innerHTML += `${sep}<div class="${btnClass}" onclick="document.getElementById('context-menu').classList.remove('active'); desktop.executeItem(fileSystem.find(i=>i.id==='${id}'))">Otwórz za pomocą -> Skryba</div>`;
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
                    desktop.activeDrag.ref.parentId = targetItem.id; fsManager.save(); desktop.render();
                    if(document.getElementById('app-aktowka').classList.contains('active')) fsManager.renderExplorerContent(fsManager.currentFolder);
                    desktop.activeDrag = null; return;
                } else if(targetItem && targetItem.id === 'hasiok') {
                    desktop.activeDrag.ref.parentId = 'hasiok'; fsManager.save(); desktop.render();
                    if(document.getElementById('app-aktowka').classList.contains('active')) fsManager.renderExplorerContent(fsManager.currentFolder);
                    desktop.activeDrag = null; return;
                }
            }

            if(elBelow && (elBelow.id === 'explorer-content' || elBelow.closest('#explorer-content'))) {
                if(desktop.activeDrag.ref.parentId !== fsManager.currentFolder) {
                    desktop.activeDrag.ref.parentId = fsManager.currentFolder;
                    fsManager.save(); desktop.render();
                    fsManager.renderExplorerContent(fsManager.currentFolder);
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

        } else if (desktop.activeDrag.type === 'icon_pending') {
            // Click
        } else if (desktop.activeDrag.type === 'sticky') { apps.saveStickyNotes(); }
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