// ======================================================================
// PLIK: window.js (Zarządzanie oknami i paskiem zadań)
// ======================================================================

const winManager = {
    open: (appId) => {
        const win = document.getElementById(`app-${appId}`);
        if(!win) return;
        win.classList.remove('minimized');
        win.classList.add('active');
        
        // Centrowanie i responsywność okna przy pierwszym otwarciu
        if(!win.dataset.centered) {
            const isMobile = window.innerWidth < 768;
            const w = isMobile ? window.innerWidth - 20 : (win.offsetWidth || 500); 
            const h = isMobile ? window.innerHeight - 100 : (win.offsetHeight || 400);
            
            if(isMobile) { 
                win.style.width = w + 'px'; 
                win.style.height = h + 'px'; 
            }
            
            win.style.left = Math.max(0, (window.innerWidth - w)/2) + 'px';
            win.style.top = Math.max(0, (window.innerHeight - h - 48)/2) + 'px';
            win.dataset.centered = "true";
        }
        
        winManager.bringToFront(win);
        if(!openAppsList.has(appId)) { 
            openAppsList.add(appId); 
            winManager.renderTaskbar(); 
        }
        winManager.updateTaskbarState(appId);
        
        // Specjalne akcje startowe dla konkretnych aplikacji
        if(appId === 'aktowka' && typeof fsManager !== 'undefined') fsManager.renderExplorerContent(fsManager.currentFolder); 
        if(appId === 'nadzorca' && typeof nadzorcaApp !== 'undefined') nadzorcaApp.init();
        if(appId === 'szkicownik' && typeof initPaint !== 'undefined') setTimeout(initPaint, 100);
        if(appId === 'grajek' && typeof apps !== 'undefined') apps.loadGrajkoteka();
        if(typeof games !== 'undefined' && games[appId] && games[appId].init) games[appId].init();
    },
    
    close: (appId) => {
        const win = document.getElementById(`app-${appId}`);
        if(win) { 
            win.classList.remove('active'); 
            win.classList.remove('minimized'); 
        }
        openAppsList.delete(appId); 
        winManager.renderTaskbar();
        
        // Zatrzymywanie procesów przy zamykaniu okna
        if(appId === 'nadzorca' && typeof nadzorcaApp !== 'undefined') nadzorcaApp.stop();
        if(appId === 'grajek' && typeof apps !== 'undefined') apps.grajekStop(); 
        if(appId === 'grajacz' && typeof grajaczApp !== 'undefined') grajaczApp.stop();
        if(typeof games !== 'undefined' && games[appId] && games[appId].stop) games[appId].stop();
    },
    
    minimize: (appId) => {
        const win = document.getElementById(`app-${appId}`);
        if(win) win.classList.add('minimized');
        winManager.updateTaskbarState(null);
    },
    
    toggleMin: (appId) => {
        const win = document.getElementById(`app-${appId}`);
        if(!win) return;
        
        if(win.classList.contains('minimized')) { 
            win.classList.remove('minimized'); 
            winManager.bringToFront(win); 
            winManager.updateTaskbarState(appId); 
        } else { 
            if(win.style.zIndex == highestZ) {
                winManager.minimize(appId); 
            } else { 
                winManager.bringToFront(win); 
                winManager.updateTaskbarState(appId); 
            } 
        }
    },
    
    maximize: (winId) => {
        const win = document.getElementById(winId);
        if(win.classList.contains('maximized')) {
            win.classList.remove('maximized');
            win.style.width = win.dataset.oW; 
            win.style.height = win.dataset.oH;
            win.style.top = win.dataset.oY; 
            win.style.left = win.dataset.oX;
            win.style.borderRadius = "0.5rem";
        } else {
            win.dataset.oW = win.style.width || getComputedStyle(win).width;
            win.dataset.oH = win.style.height || getComputedStyle(win).height;
            win.dataset.oY = win.style.top || getComputedStyle(win).top;
            win.dataset.oX = win.style.left || getComputedStyle(win).left;
            
            win.classList.add('maximized');
            win.style.top = '0'; 
            win.style.left = '0'; 
            win.style.width = '100vw'; 
            win.style.height = 'calc(100vh - 48px)'; 
            win.style.borderRadius = "0";
        }
    },
    
    bringToFront: (el) => {
        highestZ++; 
        el.style.zIndex = highestZ;
        if(el.id.startsWith('app-')) winManager.updateTaskbarState(el.id.replace('app-', ''));
        // ZDEJMIJ FOCUS Z POPRZEDNIEGO OKNA (Naprawa skaczącego kursora)
        if(document.activeElement && !el.contains(document.activeElement)) document.activeElement.blur();
    },
    
    // renderTaskbar: () => {
    //     const c = document.getElementById('taskbar-apps'); 
    //     if(!c) return;
    //     c.innerHTML = '';
    //     openAppsList.forEach(id => {
    //         const info = defaultApps.find(a => a.appId === id);
    //         const btn = document.createElement('button');
    //         btn.id = `tb-btn-${id}`;
    //         btn.className = `px-3 h-9 bg-gray-800/60 hover:bg-white/20 text-white rounded transition flex items-center gap-1 sm:gap-2 shrink-0 font-semibold text-xs sm:text-sm border-b-2 border-transparent`;
    //         btn.innerHTML = `<span>${info ? info.icon : '🔲'}</span> <span class="truncate hidden sm:inline max-w-[100px]">${info ? info.name : id}</span>`;
    //         btn.onclick = () => winManager.toggleMin(id);
    //         c.appendChild(btn);
    //     });
    // },
    
    // updateTaskbarState: (id) => {
    //     document.querySelectorAll('#taskbar-apps button').forEach(b => { 
    //         b.classList.remove('bg-white/30', 'border-blue-400'); 
    //         b.classList.add('bg-gray-800/60'); 
    //     });
    //     if(id) { 
    //         const b = document.getElementById(`tb-btn-${id}`); 
    //         if(b) { 
    //             b.classList.remove('bg-gray-800/60'); 
    //             b.classList.add('bg-white/30', 'border-blue-400'); 
    //         } 
    //     }
    // },
    renderTaskbar: () => {
        const c = document.getElementById('taskbar-apps'); c.innerHTML = '';
        openAppsList.forEach(id => {
            const info = defaultApps.find(a => a.appId === id);
            const btn = document.createElement('button');
            btn.id = `tb-btn-${id}`;
            btn.className = `px-3 h-9 g-text hover:bg-white/10 rounded transition flex items-center gap-2 truncate max-w-[150px] font-bold text-sm border-b-2 border-transparent`;
            btn.innerHTML = `<span>${info?info.icon:'🔲'}</span> <span class="truncate">${info?info.name:id}</span>`;
            btn.onclick = () => winManager.toggleMin(id);
            c.appendChild(btn);
        });
    },
    updateTaskbarState: (id) => {
        document.querySelectorAll('#taskbar-apps button').forEach(b => { 
            b.classList.remove('bg-white/20'); 
            b.style.borderColor = 'transparent';
        });
        if(id) { 
            const b = document.getElementById(`tb-btn-${id}`); 
            if(b) { 
                b.classList.add('bg-white/20'); 
                b.style.borderColor = 'var(--primary)';
            } 
        }
    },
    
    startDrag: (e, winId) => {
        // Ignorujemy drag, jeśli użytkownik klika w przycisk, input lub listę rozwijaną
        if(e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        
        const win = document.getElementById(winId); 
        if(win.classList.contains('maximized')) return;
        
        winManager.bringToFront(win);
        
        // getEventPos musi być zdefiniowane w globals.js (tak jak podałem w poprzednich krokach)
        const pos = getEventPos(e); 
        desktop.activeDrag = { 
            el: win, 
            type: 'window', 
            oX: pos.x - win.getBoundingClientRect().left, 
            oY: pos.y - win.getBoundingClientRect().top 
        };
    }
};

// ======================================================================
// NASŁUCHIWANIE KLIKNIĘĆ W OKNA (Wysuwanie na wierzch)
// ======================================================================
document.querySelectorAll('.window').forEach(win => { 
    win.addEventListener('mousedown', function() { winManager.bringToFront(this); }); 
    win.addEventListener('touchstart', function() { winManager.bringToFront(this); }, {passive: true}); 
});