// ======================================================================
// PLIK: window.js (Zarządzanie oknami i paskiem zadań)
// ======================================================================

const winManager = {
    // Per-app instance state (document windows / tabs keep independent state)
    _instanceState: new Map(),
    _snapPreview: null,

    open: (appId) => {
        if (appId === 'biai') appId = 'podpowiadacz';
        const win = document.getElementById(`app-${appId}`);
        if(!win) {
            // Unregistered / dynamically created windows may exist briefly.
            if (typeof bigosSandbox !== 'undefined' && bigosSandbox.launchPackage) {
                bigosSandbox.launchPackage(appId).catch(() => {
                    if (typeof bigosAppRegistry !== 'undefined' && bigosAppRegistry.get(appId)) {
                        bigosAppRegistry.launch(appId).catch((e) => console.warn('launch failed', e));
                    }
                });
                return;
            }
            if (typeof bigosAppRegistry !== 'undefined' && bigosAppRegistry.get(appId)) {
                // Launch via registry (lazy + lifecycle) — non-blocking.
                bigosAppRegistry.launch(appId).catch((e) => console.warn('launch failed', e));
            }
            return;
        }
        if(appId === 'powitanie' && typeof powitanieApp !== 'undefined' && powitanieApp.render) {
            powitanieApp.render();
        }

        // Centrowanie i responsywność okna przy pierwszym otwarciu
        // Restore saved geometry when available (ignoring obsolete forced geometry).
        const savedGeom = winManager._loadGeometry(appId);
        const winW = (typeof window !== 'undefined' && typeof window.innerWidth === 'number') ? window.innerWidth : 1280;
        const winH = (typeof window !== 'undefined' && typeof window.innerHeight === 'number') ? window.innerHeight : 800;
        const taskbarH = 48;
        const marginX = 16;
        const marginY = 16;
        const maxW = Math.max(280, winW - marginX);
        const maxH = Math.max(240, winH - taskbarH - marginY);
        const isAutoHeight = (win.dataset.autoHeight === 'true');

        if (!win.dataset.centered) {
            let w = parseFloat(win.style.width) || parseFloat(win.dataset.prefW) || win.offsetWidth || 500;
            if (savedGeom && savedGeom.w && !winManager._isObsoleteGeometry(appId, savedGeom)) {
                w = savedGeom.w;
            }
            if (w > maxW) w = maxW;
            win.style.width = w + 'px';

            let h = parseFloat(win.style.height) || parseFloat(win.dataset.prefH) || win.offsetHeight || 400;
            if (!isAutoHeight && savedGeom && savedGeom.h && !winManager._isObsoleteGeometry(appId, savedGeom)) {
                h = savedGeom.h;
            }
            if (h > maxH) h = maxH;
            if (!isAutoHeight || win.style.height) {
                win.style.height = h + 'px';
            }

            if (savedGeom && savedGeom.x != null && savedGeom.y != null && !winManager._isObsoleteGeometry(appId, savedGeom)) {
                win.style.left = Math.max(0, Math.min(savedGeom.x, Math.max(0, winW - w))) + 'px';
                win.style.top = Math.max(0, Math.min(savedGeom.y, Math.max(0, winH - taskbarH - h))) + 'px';
            } else {
                win.style.left = Math.max(0, Math.floor((winW - w) / 2)) + 'px';
                win.style.top = Math.max(0, Math.floor((winH - h - taskbarH) / 2)) + 'px';
            }
            win.dataset.centered = "true";
        }

        // Keep window reachable after viewport changes.
        winManager._clampToViewport(win);

        if (win.classList) {
            win.classList.remove('minimized');
            win.classList.remove('hidden');
            win.classList.add('active');
        }

        winManager.bringToFront(win);
        if(!openAppsList.has(appId)) {
            openAppsList.add(appId);
            winManager.renderTaskbar();
        }
        winManager.updateTaskbarState(appId);

        // Lifecycle resume if previously suspended.
        if (typeof bigosAppRegistry !== 'undefined' && bigosAppRegistry.resume) {
            bigosAppRegistry.resume(appId);
            if (!bigosAppRegistry.isOpen(appId)) {
                bigosAppRegistry.launch(appId).catch(() => {});
            }
        }

        // Specjalne akcje startowe dla konkretnych aplikacji
        if(appId === 'aktowka' && typeof fsManager !== 'undefined') fsManager.renderExplorerContent(fsManager.currentFolder);
        if(appId === 'nadzorca' && typeof nadzorcaApp !== 'undefined') nadzorcaApp.init();
        if(appId === 'szkicownik' && typeof initPaint !== 'undefined') setTimeout(initPaint, 100);
        if(appId === 'grajek' && typeof apps !== 'undefined') apps.loadGrajkoteka();
        if(typeof games !== 'undefined' && games[appId] && games[appId].init) games[appId].init();
        if(appId === 'powitanie' && typeof powitanieApp !== 'undefined' && powitanieApp.onOpen) powitanieApp.onOpen();
    },

    close: (appId) => {
        if (appId === 'biai') appId = 'podpowiadacz';
        const win = document.getElementById(`app-${appId}`);
        if(win) {
            win.classList.remove('active');
            win.classList.remove('minimized');
            win.classList.add('hidden');
        }
        // Persist geometry before close.
        if (win) winManager._saveGeometry(appId, win);
        openAppsList.delete(appId);
        winManager.renderTaskbar();

        // Zatrzymywanie procesów przy zamykaniu okna
        if (typeof bigosAppRegistry !== 'undefined' && bigosAppRegistry.close) {
            bigosAppRegistry.close(appId).catch(() => {});
        }
        if(appId === 'nadzorca' && typeof nadzorcaApp !== 'undefined') nadzorcaApp.stop();
        if(appId === 'grajek' && typeof apps !== 'undefined') {
            if (typeof grajekApp === 'undefined' || !grajekApp.allowBackground) {
                apps.grajekStop();
            }
        }
        if(appId === 'grajacz' && typeof grajaczApp !== 'undefined') grajaczApp.stop();
        if(typeof games !== 'undefined' && games[appId] && games[appId].stop) games[appId].stop();
    },

    minimize: (appId) => {
        const win = document.getElementById(`app-${appId}`);
        if(win) win.classList.add('minimized');
        // Suspend rendering for hidden apps (backgroundable apps keep running).
        if (typeof bigosAppRegistry !== 'undefined' && bigosAppRegistry.suspend) {
            bigosAppRegistry.suspend(appId);
        }
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
            const currentHighestZ = typeof highestZ !== 'undefined' ? highestZ : (typeof window !== 'undefined' ? window.highestZ : (typeof globalThis !== 'undefined' ? globalThis.highestZ : 100));
            if(win.style.zIndex == currentHighestZ) {
                winManager.minimize(appId); 
            } else { 
                winManager.bringToFront(win); 
                winManager.updateTaskbarState(appId); 
            } 
        }
    },
    
    maximize: (winId) => {
        const win = document.getElementById(winId);
        if (!win) return;
        if(win.classList.contains('maximized')) {
            win.classList.remove('maximized');
            win.classList.remove('snapped-left','snapped-right');
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
            win.classList.remove('snapped-left','snapped-right');
            win.style.top = '0';
            win.style.left = '0';
            win.style.width = '100vw';
            win.style.height = 'calc(100vh - 48px)';
            win.style.borderRadius = "0";
        }
    },

    /**
     * Snap window to left/right half. Restores previous size when unsnapping.
     * @param {string} winId e.g. 'app-skryba'
     * @param {'left'|'right'|'none'} side
     */
    snap: (winId, side) => {
        const win = document.getElementById(winId);
        if (!win) return;
        const taskbarH = 48;
        const H = window.innerHeight - taskbarH;

        if (side === 'none') {
            // Restore pre-snap geometry.
            if (win.dataset.snapOw) {
                win.style.width = win.dataset.snapOw;
                win.style.height = win.dataset.snapOh;
                win.style.left = win.dataset.snapOx;
                win.style.top = win.dataset.snapOy;
                delete win.dataset.snapOw; delete win.dataset.snapOh;
                delete win.dataset.snapOx; delete win.dataset.snapOy;
            }
            win.classList.remove('snapped-left', 'snapped-right', 'maximized');
            win.style.borderRadius = '0.5rem';
            return;
        }

        // Save current geometry once (so unsnap can restore).
        if (!win.dataset.snapOw && !win.classList.contains('snapped-left') && !win.classList.contains('snapped-right')) {
            win.dataset.snapOw = win.style.width || getComputedStyle(win).width;
            win.dataset.snapOh = win.style.height || getComputedStyle(win).height;
            win.dataset.snapOx = win.style.left || getComputedStyle(win).left;
            win.dataset.snapOy = win.style.top || getComputedStyle(win).top;
        }

        win.classList.remove('maximized');
        win.classList.add(side === 'left' ? 'snapped-left' : 'snapped-right');
        win.classList.remove(side === 'left' ? 'snapped-right' : 'snapped-left');

        win.style.top = '0px';
        win.style.width = '50vw';
        win.style.height = H + 'px';
        win.style.left = side === 'left' ? '0px' : '50vw';
        win.style.borderRadius = '0';
        winManager.bringToFront(win);
    },

    _clampToViewport: (win) => {
        if (!win) return;
        const taskbarH = 48;
        const maxW = (typeof window !== 'undefined' && typeof window.innerWidth === 'number') ? window.innerWidth : 1280;
        const maxH = (typeof window !== 'undefined' && typeof window.innerHeight === 'number') ? (window.innerHeight - taskbarH) : (800 - taskbarH);
        
        // Remember preferred dimensions if available
        if (!win.dataset.prefW && win.style.width) {
            win.dataset.prefW = win.style.width;
        }

        const prefW = parseFloat(win.dataset.prefW) || parseFloat(win.style.width) || 0;
        if (prefW > 0 && !win.dataset.userResized) {
            if (prefW <= maxW) {
                win.style.width = prefW + 'px';
            } else {
                win.style.width = Math.max(280, maxW - 8) + 'px';
            }
        } else {
            const curW = parseFloat(win.style.width);
            if (curW > maxW) win.style.width = Math.max(280, maxW - 8) + 'px';
        }

        const curH = parseFloat(win.style.height);
        if (curH > maxH) {
            win.style.height = Math.max(240, maxH - 8) + 'px';
        }

        const rect = win.getBoundingClientRect();
        let x = parseFloat(win.style.left) || rect.left;
        let y = parseFloat(win.style.top) || rect.top;
        const actualW = parseFloat(win.style.width) || rect.width || 0;
        const actualH = parseFloat(win.style.height) || rect.height || 0;
        // Keep window fully reachable within workspace above taskbar.
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (actualW > 0 && x + actualW > maxW) x = Math.max(0, maxW - actualW);
        else if (x + 40 > maxW) x = Math.max(0, maxW - 40);
        if (actualH > 0 && y + actualH > maxH) y = Math.max(0, maxH - actualH);
        else if (y + 24 > maxH) y = Math.max(0, maxH - 24);
        win.style.left = x + 'px';
        win.style.top = y + 'px';
    },

    _isObsoleteGeometry: (appId, geom) => {
        if (!geom) return false;
        // Obsolete forced dimensions from earlier sandbox builds:
        if (appId === 'cookie_clicker' && (geom.w === 420 || geom.h === 560)) return true;
        if (appId === 'kalkulator_bmi' && (geom.w === 380 || geom.h === 440)) return true;
        if (appId === 'bigos_painter' && (geom.w === 820 || geom.h === 620)) return true;
        return false;
    },

    resetWindowGeometry: (appId) => {
        try {
            localStorage.removeItem('bigos_win_' + appId);
        } catch (_) {}
        const win = document.getElementById('app-' + appId);
        if (win) {
            delete win.dataset.userResized;
            delete win.dataset.centered;
            if (typeof bigosSandbox !== 'undefined' && bigosSandbox.restoreAppGeometry) {
                bigosSandbox.restoreAppGeometry(appId);
            }
        }
    },

    centerWindow: (win) => {
        if (!win) return;
        const winW = (typeof window !== 'undefined' && typeof window.innerWidth === 'number') ? window.innerWidth : 1280;
        const winH = (typeof window !== 'undefined' && typeof window.innerHeight === 'number') ? window.innerHeight : 800;
        const w = parseFloat(win.style.width) || win.offsetWidth || 500;
        const h = parseFloat(win.style.height) || win.offsetHeight || 400;
        win.style.left = Math.max(0, Math.floor((winW - w) / 2)) + 'px';
        win.style.top = Math.max(0, Math.floor((winH - h - 48) / 2)) + 'px';
        win.dataset.centered = "true";
    },

    _saveGeometry: (appId, win) => {
        try {
            // Store numeric CSS pixels only — never include unit suffixes.
            const num = (v) => {
                const n = parseFloat(v);
                return Number.isFinite(n) ? n : null;
            };
            const isAuto = (win.dataset.autoHeight === 'true');
            // If window width was temporarily clamped to mobile viewport, preserve prefW
            const prefW = win.dataset.prefW ? parseFloat(win.dataset.prefW) : null;
            const w = (!win.dataset.userResized && prefW) ? prefW : num(win.style.width);
            const geom = {
                x: num(win.style.left),
                y: num(win.style.top),
                w: w,
                // Do not persist auto-measured height as forced fixed height
                h: isAuto ? null : num(win.style.height)
            };
            localStorage.setItem('bigos_win_' + appId, JSON.stringify(geom));
        } catch (_) { /* quota */ }
    },
    _loadGeometry: (appId) => {
        try {
            const raw = localStorage.getItem('bigos_win_' + appId);
            if (!raw) return null;
            const g = JSON.parse(raw);
            if (!g || typeof g !== 'object') return null;
            // Normalize legacy values that may already include 'px'.
            const num = (v) => {
                if (v == null) return null;
                const n = parseFloat(String(v).replace(/px$/i, ''));
                return Number.isFinite(n) ? n : null;
            };
            const geom = { x: num(g.x), y: num(g.y), w: num(g.w), h: num(g.h) };
            if (winManager._isObsoleteGeometry(appId, geom)) {
                localStorage.removeItem('bigos_win_' + appId);
                return null;
            }
            return geom;
        } catch (_) { return null; }
    },

    /** Independent per-instance document state (multi-window docs). */
    getInstanceState(appId, instanceId) {
        const key = appId + '::' + (instanceId || 'default');
        if (!winManager._instanceState.has(key)) {
            winManager._instanceState.set(key, {});
        }
        return winManager._instanceState.get(key);
    },
    setInstanceState(appId, instanceId, state) {
        winManager._instanceState.set(appId + '::' + (instanceId || 'default'), state);
    },
    
    bringToFront: (el) => {
        let nextZ = 101;
        if (typeof highestZ !== 'undefined') {
            highestZ++;
            nextZ = highestZ;
        } else {
            const gz = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
            gz.highestZ = (gz.highestZ || 100) + 1;
            nextZ = gz.highestZ;
        }
        el.style.zIndex = nextZ;
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
        const c = document.getElementById('taskbar-apps');
        if (!c) return;
        c.innerHTML = '';
        if (!openAppsList) return;
        openAppsList.forEach(id => {
            const apps = typeof defaultApps !== 'undefined' ? defaultApps : [];
            const info = apps.find(a => a.appId === id);
            const btn = document.createElement('button');
            btn.id = `tb-btn-${id}`;
            btn.className = `px-3 h-9 g-text hover:bg-white/10 rounded transition flex items-center gap-2 truncate max-w-[150px] font-bold text-sm border-b-2 border-transparent`;
            btn.innerHTML = `<span>${info?info.icon:'🔲'}</span> <span class="truncate">${info?info.name:id}</span>`;
            btn.onclick = () => winManager.toggleMin(id);
            c.appendChild(btn);
        });
    },
    updateTaskbarState: (id) => {
        if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
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
        if (e.target.closest && e.target.closest('button, input, select, textarea, a, .no-drag')) return;
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

        // Edge-snap preview while dragging near screen halves.
        if (e.type === 'mousedown' || e.type === 'touchstart') {
            const onMove = (ev) => {
                const p = getEventPos(ev);
                const mid = window.innerWidth / 2;
                if (p.x < 24) winManager._showSnapPreview('left');
                else if (p.x > window.innerWidth - 24) winManager._showSnapPreview('right');
                else winManager._hideSnapPreview();
            };
            const onUp = (ev) => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                document.removeEventListener('touchmove', onMove);
                document.removeEventListener('touchend', onUp);
                const p = getEventPos(ev);
                winManager._hideSnapPreview();
                if (p.x < 24) winManager.snap(winId, 'left');
                else if (p.x > window.innerWidth - 24) winManager.snap(winId, 'right');
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            document.addEventListener('touchmove', onMove, { passive: true });
            document.addEventListener('touchend', onUp);
        }
    },

    _showSnapPreview: (side) => {
        if (!winManager._snapPreview) {
            const el = document.createElement('div');
            el.id = 'snap-preview';
            el.style.cssText = 'position:fixed;top:0;bottom:48px;width:50vw;background:rgba(59,130,246,0.25);border:2px solid rgba(59,130,246,0.6);z-index:9998;pointer-events:none;transition:all 0.15s ease;';
            document.body.appendChild(el);
            winManager._snapPreview = el;
        }
        winManager._snapPreview.style.left = side === 'left' ? '0' : '50vw';
        winManager._snapPreview.style.display = 'block';
    },
    _hideSnapPreview: () => {
        if (winManager._snapPreview) winManager._snapPreview.style.display = 'none';
    }
};

// Keep windows reachable when the viewport changes.
if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('resize', () => {
        if (typeof document !== 'undefined' && document.querySelectorAll) {
            document.querySelectorAll('.window.active').forEach((win) => winManager._clampToViewport(win));
        }
    });
}

// Unified keyboard actions: Ctrl+S save, Ctrl+O open, Ctrl+K/F search, Ctrl+Tab switch.
if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('keydown', (e) => {
        const mod = e.ctrlKey || e.metaKey;
        if (!mod) return;
        const key = e.key.toLowerCase();

        if (key === 's') {
            e.preventDefault();
            if (typeof skrybaApp !== 'undefined' && skrybaApp.saveNote) skrybaApp.saveNote();
            else if (typeof apps !== 'undefined') apps.showToast('Zapis', 'Aktywna aplikacja nie obsługuje Ctrl+S', 'info');
        } else if (key === 'o') {
            e.preventDefault();
            if (typeof winManager !== 'undefined') winManager.open('aktowka');
        } else if (key === 'k' || key === 'f') {
            e.preventDefault();
            const input = document.getElementById('start-menu-search') || document.getElementById('fs-search-input');
            if (input) { input.focus(); input.select(); }
            else if (typeof apps !== 'undefined') apps.toggleStartMenu();
        } else if (key === 'tab') {
            // Alt-like window cycling with Ctrl+Tab
            const list = Array.from(openAppsList);
            if (list.length === 0) return;
            e.preventDefault();
            const idx = list.indexOf(document.activeElement && document.activeElement.closest('.window')
                ? document.activeElement.closest('.window').id.replace('app-', '')
                : list[list.length - 1]);
            const next = list[(idx + 1) % list.length];
            winManager.open(next);
        }
    });
}

// ======================================================================
// NASŁUCHIWANIE KLIKNIĘĆ W OKNA (Wysuwanie na wierzch)
// ======================================================================
if (typeof document !== 'undefined' && document.querySelectorAll) {
    document.querySelectorAll('.window').forEach(win => {
        if (win.addEventListener) {
            win.addEventListener('mousedown', function() { winManager.bringToFront(this); });
            win.addEventListener('touchstart', function() { winManager.bringToFront(this); }, {passive: true});
        }
    });
}

// ======================================================================
// UNIFIED SEARCH (apps + files) — Ctrl+K / taskbar button
// ======================================================================
const bigosSearch = {
    open() {
        let modal = document.getElementById('bigos-search-modal');
        if (modal) modal.remove();
        modal = document.createElement('div');
        modal.id = 'bigos-search-modal';
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-start justify-center pt-[12vh] backdrop-blur-sm p-4';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-label', 'Szukaj w BigOS');
        modal.innerHTML = `
            <div class="g-panel rounded-2xl shadow-2xl w-full max-w-lg border g-border overflow-hidden">
                <input id="bigos-search-input" type="search" placeholder="Szukaj aplikacji i plików…"
                    class="w-full px-4 py-3 g-bg g-text border-b g-border outline-none text-sm"
                    aria-label="Szukaj aplikacji i plików" autocomplete="off">
                <div id="bigos-search-results" class="max-h-[50vh] overflow-y-auto custom-scrollbar"></div>
            </div>`;
        document.body.appendChild(modal);
        const input = document.getElementById('bigos-search-input');
        input.addEventListener('input', () => bigosSearch.render(input.value));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') modal.remove();
            if (e.key === 'Enter') {
                const first = document.querySelector('#bigos-search-results button');
                if (first) first.click();
            }
        });
        modal.addEventListener('mousedown', (e) => { if (e.target === modal) modal.remove(); });
        bigosSearch.render('');
        setTimeout(() => input.focus(), 30);
    },
    render(q) {
        const box = document.getElementById('bigos-search-results');
        if (!box) return;
        const term = (q || '').toLowerCase().trim();
        const appsList = (typeof defaultApps !== 'undefined' ? defaultApps : [])
            .filter(a => a.type === 'app')
            .filter(a => !term || (a.name || '').toLowerCase().includes(term) || (a.appId || '').includes(term));
        const files = (typeof fileSystem !== 'undefined' ? fileSystem : [])
            .filter(f => f.type === 'file' || f.type === 'image' || f.type === 'folder')
            .filter(f => !term || (f.name || '').toLowerCase().includes(term))
            .slice(0, 30);

        let html = '';
        if (appsList.length) {
            html += `<div class="px-3 py-1 text-[10px] uppercase tracking-widest g-text-muted font-bold">Aplikacje</div>`;
            appsList.slice(0, 20).forEach(a => {
                html += `<button class="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center gap-2 g-text text-sm"
                    onclick="document.getElementById('bigos-search-modal').remove(); winManager.open('${String(a.appId).replace(/[^A-Za-z0-9_\-]/g, '')}')">
                    <span>${a.icon || '📦'}</span><span>${typeof desktop !== 'undefined' ? desktop.escapeHTML(a.name) : a.name}</span></button>`;
            });
        }
        if (files.length) {
            html += `<div class="px-3 py-1 text-[10px] uppercase tracking-widest g-text-muted font-bold border-t g-border mt-1">Pliki</div>`;
            files.forEach(f => {
                html += `<button class="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center gap-2 g-text text-sm"
                    onclick="document.getElementById('bigos-search-modal').remove(); desktop.executeItem(fileSystem.find(i=>i.id==='${f.id}'))">
                    <span>${f.icon || '📄'}</span><span>${typeof desktop !== 'undefined' ? desktop.escapeHTML(f.name) : f.name}</span></button>`;
            });
        }
        if (!html) html = '<div class="p-6 text-center g-text-muted text-sm">Brak wyników</div>';
        box.innerHTML = html;
    }
};
window.bigosSearch = bigosSearch;
// Explicit export — top-level const does NOT become a window property.
window.winManager = winManager;
if (typeof globalThis !== 'undefined') globalThis.winManager = winManager;
