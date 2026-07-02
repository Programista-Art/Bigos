// ======================================================================
// PLIK: js/fs.js (System Plików i Pamięć)
// ======================================================================

const fsManager = {
    currentFolder: 'root',
    
    init: () => {
        // 1. Ładowanie systemu plików (KULOODPORNE)
        const saved = localStorage.getItem('bigos_fs');
        try {
            if (saved && saved !== 'undefined' && saved !== 'null') {
                fileSystem = JSON.parse(saved);
                if (!Array.isArray(fileSystem) || fileSystem.length === 0) throw new Error("Pusta pamięć");
            } else {
                throw new Error("Brak zapisanych danych");
            }
        } catch (error) {
            fileSystem = [];
            if (typeof defaultApps !== 'undefined') {
                defaultApps.forEach((app, i) => {
                    let obj = {...app, parentId: 'root'};
                    obj.x = (Math.floor(i/6) * GRID) + 20;
                    obj.y = (i%6) * GRID + 20;
                    fileSystem.push(obj);
                });
            }
            fsManager.save();
        }
        
        // 2. DOMYŚLNA TAPETA PULPITU (Inna niż ekran logowania!)
        const savedBg = localStorage.getItem('bigos_bg');
        if(savedBg && savedBg !== 'undefined' && savedBg !== 'null' && savedBg.trim() !== '') {
            document.getElementById('desktop-bg').style.backgroundImage = `url('${savedBg}')`;
            document.getElementById('desktop-bg').classList.add('custom-wp');
        } else {
            // TUTAJ ZMIANA: Pulpit ma domyślnie inną tapetę
            document.getElementById('desktop-bg').style.backgroundImage = `url('tapety/natura.jpg')`;
            document.getElementById('desktop-bg').classList.add('custom-wp');
        }

        // 3. DOMYŚLNA TAPETA EKRANU LOGOWANIA
        const savedLoginBg = localStorage.getItem('bigos_login_bg');
        if(savedLoginBg && savedLoginBg !== 'undefined' && savedLoginBg !== 'null' && savedLoginBg.trim() !== '') {
            document.getElementById('login-screen').style.backgroundImage = `url('${savedLoginBg}')`;
        } else {
            document.getElementById('login-screen').style.backgroundImage = `url('tapety/bigos.jpg')`;
        }

        if (typeof desktop !== 'undefined') {
            desktop.render();
        }
    },
    
    save: () => {
        try {
            localStorage.setItem('bigos_fs', JSON.stringify(fileSystem));
        } catch (error) {
            console.error("Błąd zapisu fsManager: Brak pamięci!", error);
            if (typeof apps !== 'undefined' && apps.showToast) {
                apps.showToast('Błąd Pamięci', 'Brak miejsca w pamięci by zapisać pliki!', 'error');
            }
        }
    },
    
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
        if(!container) return;
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
    
    openFolder: (folderId) => { 
        fsManager.currentFolder = folderId; 
        if (typeof winManager !== 'undefined') winManager.open('aktowka'); 
        fsManager.renderExplorerContent(folderId); 
    },
    
    navigateUp: () => {
        if(fsManager.currentFolder === 'root') return;
        if(fsManager.currentFolder === 'hasiok') { fsManager.openFolder('root'); return; }
        const current = fileSystem.find(i => i.id === fsManager.currentFolder);
        if(current && current.parentId) fsManager.openFolder(current.parentId);
        else fsManager.openFolder('root');
    }
};