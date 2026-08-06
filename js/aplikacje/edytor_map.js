// ======================================================================
// PLIK: js/aplikacje/edytor_map.js (Kreator Map 2D - Wersja PRO)
// ======================================================================

const edytorMapApp = {
    cols: 30, 
    rows: 20, 
    tileSize: 32,
    map: [[], [], []],
    undoStack: [], // Pamięć historii zmian (Ctrl+Z)
    
    currentLayer: 1,
    currentTile: 1,
    lastTile: 1,
    currentTool: 'pencil', // pencil, eraser, fill
    zoomScale: 1.0,
    
    isDrawing: false,
    _doubleClickPatched: false,
    _contextMenuPatched: false,
    
    // Zestaw dostępnych kafelków
    tiles: {
        1: { icon: '🟩', color: '#166534', name: 'Trawa' },
        2: { icon: '🟫', color: '#78350f', name: 'Ziemia' },
        3: { icon: '🟦', color: '#1e3a8a', name: 'Woda' },
        4: { icon: '🧱', color: '#7f1d1d', name: 'Mur' },
        5: { icon: '🪵', color: '#9a3412', name: 'Drewno' },
        6: { icon: '🤠', color: 'transparent', name: 'Spawn Gracza' },
        7: { icon: '👾', color: 'transparent', name: 'Spawn Wroga' },
        8: { icon: '🪙', color: 'transparent', name: 'Moneta' },
        9: { icon: '🚪', color: '#451a03', name: 'Drzwi' },
        10: { icon: '🌲', color: 'transparent', name: 'Drzewo' },
        11: { icon: '🔥', color: 'transparent', name: 'Ogień/Lawa' },
        12: { icon: '☁️', color: 'transparent', name: 'Chmura' }
    },

    init: () => {
        edytorMapApp.upgradeUI();
        edytorMapApp.resetMap(false);
        edytorMapApp.renderPalette();
        
        if (typeof defaultApps !== 'undefined' && !defaultApps.find(a => a.appId === 'edytor_map')) {
            defaultApps.push({ id: 'app_edytor_map', type: 'app', name: 'Edytor Map', icon: '🗺️', appId: 'edytor_map' });
        }

        setTimeout(() => {
            const startMenu = document.getElementById('start-menu-list');
            if (startMenu && !document.getElementById('start-btn-edytor_map')) {
                const btn = document.createElement('button');
                btn.id = 'start-btn-edytor_map';
                btn.className = 'start-item flex items-center gap-3 p-2 hover:bg-white/10 rounded w-full text-left transition g-text font-medium';
                btn.onclick = () => { winManager.open('edytor_map'); apps.toggleStartMenu(); };
                btn.innerHTML = `<span class="text-xl drop-shadow-sm">🗺️</span> <span class="app-name">Edytor Map</span>`;
                
                const headers = startMenu.querySelectorAll('.start-header');
                if (headers.length > 1) startMenu.insertBefore(btn, headers[1]);
                else startMenu.appendChild(btn);
            }
        }, 500);

        setTimeout(() => {
            if (typeof fileSystem !== 'undefined' && fileSystem.length > 0 && !fileSystem.find(f => f.appId === 'edytor_map')) {
                let placed = false, checkX = 30, checkY = 30, col = 0, row = 0;
                const maxRows = Math.max(1, Math.floor((window.innerHeight - 120) / 100));

                while (!placed && col < 20) {
                    checkX = 30 + (col * 90);
                    checkY = 30 + (row * 100);
                    const isOccupied = fileSystem.some(f => f.parentId === 'root' && Math.abs(f.x - checkX) < 40 && Math.abs(f.y - checkY) < 40);

                    if (!isOccupied) placed = true;
                    else {
                        row++;
                        if (row >= maxRows) { row = 0; col++; }
                    }
                }

                fileSystem.push({
                    id: 'app_edytor_map', type: 'app', name: 'Edytor Map', icon: '🗺️', appId: 'edytor_map',
                    parentId: 'root', x: checkX, y: checkY
                });
                
                if (typeof fsManager !== 'undefined') fsManager.save();
                if (typeof desktop !== 'undefined') desktop.render();
            }
        }, 2500);

        const canvas = document.getElementById('tilemap-canvas');
        if (canvas) {
            canvas.width = edytorMapApp.cols * edytorMapApp.tileSize;
            canvas.height = edytorMapApp.rows * edytorMapApp.tileSize;
            
            canvas.addEventListener('mousedown', edytorMapApp.startDraw);
            canvas.addEventListener('mousemove', edytorMapApp.drawTile);
            window.addEventListener('mouseup', edytorMapApp.stopDraw);
            canvas.addEventListener('mouseleave', edytorMapApp.stopDraw);
            
            // Blokada menu kontekstowego przeglądarki na obszarze roboczym!
            canvas.addEventListener('contextmenu', (e) => e.preventDefault());
            
            // Obsługa kółka myszy do Zoomowania (Skalowania)
            canvas.parentElement.addEventListener('wheel', edytorMapApp.handleZoom, {passive: false});

            canvas.addEventListener('touchstart', (e) => { e.preventDefault(); edytorMapApp.startDraw(e); }, {passive: false});
            canvas.addEventListener('touchmove', (e) => { e.preventDefault(); edytorMapApp.drawTile(e); }, {passive: false});
            window.addEventListener('touchend', edytorMapApp.stopDraw);
        }

        // Globalny skrót Ctrl+Z do cofania
        window.addEventListener('keydown', (e) => {
            const win = document.getElementById('app-edytor_map');
            if (win && win.classList.contains('active') && e.ctrlKey && e.code === 'KeyZ') {
                e.preventDefault();
                edytorMapApp.undo();
            }
        });
        
        // Integracja z Pulpitem i Aktówką BigOS
        edytorMapApp.injectDoubleClickHandler();
        edytorMapApp.injectGlobalContextMenu();
    },

    // Nadpisuje podwójne kliknięcie (przejmuje pliki .map)
    injectDoubleClickHandler: () => {
        if (typeof desktop !== 'undefined' && !edytorMapApp._doubleClickPatched) {
            const origExecute = desktop.executeItem;
            desktop.executeItem = function(item) {
                if (item && item.type === 'file' && item.name && item.name.match(/\.map$/i)) {
                    edytorMapApp.loadFromBigOS(item);
                } else {
                    origExecute.call(this, item);
                }
            };
            edytorMapApp._doubleClickPatched = true;
        }
    },

    // Menu pod prawym przyciskiem myszy
    injectGlobalContextMenu: () => {
        if (typeof desktop !== 'undefined' && !edytorMapApp._contextMenuPatched) {
            const origMenu = desktop.showContextMenu;
            desktop.showContextMenu = function(e, targetType, id) {
                origMenu.call(this, e, targetType, id);
                const menu = document.getElementById('context-menu');
                if (!menu || !menu.classList.contains('active')) return;

                if (targetType === 'file' && id) {
                    const f = fileSystem.find(i => i.id === id);
                    if (f && f.name.match(/\.map$/i)) {
                        const sep = "<div class='border-t border-gray-300 dark:border-gray-600 my-1'></div>";
                        const btnClass = "px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition text-sm";
                        menu.innerHTML += `${sep}<div class="${btnClass} font-bold text-emerald-500 hover:text-white" onclick="document.getElementById('context-menu').classList.remove('active'); edytorMapApp.loadFromBigOSById('${id}')">🗺️ Otwórz w Edytorze Map</div>`;
                    }
                }
            };
            edytorMapApp._contextMenuPatched = true;
        }
    },

    upgradeUI: () => {
        let appWindow = document.getElementById('app-edytor_map');
        if (!appWindow) { 
            appWindow = document.createElement('div');
            appWindow.id = 'app-edytor_map';
            appWindow.className = 'window absolute hidden';
            
            appWindow.addEventListener('mousedown', function() { 
                if(typeof winManager !== 'undefined') winManager.bringToFront(this); 
            });
            
            document.body.appendChild(appWindow);
        }

        appWindow.style.width = '1000px';
        appWindow.style.height = '720px';
        appWindow.style.background = 'transparent';
        appWindow.style.border = 'none';
        appWindow.style.boxShadow = 'none';
        
        appWindow.innerHTML = `
            <div class="flex flex-col h-full themed-app g-panel border g-border rounded-lg shadow-2xl overflow-hidden select-none">
                <div class="px-4 py-2 border-b g-border flex justify-between items-center bg-black/30 cursor-move shrink-0" onmousedown="winManager.startDrag(event, 'app-edytor_map')" ontouchstart="winManager.startDrag(event, 'app-edytor_map')">
                    <span class="text-sm font-bold g-accent drop-shadow-md flex items-center gap-2"><span>🗺️</span> Edytor Map 2D PRO</span>
                    <div class="flex gap-2">
                        <button onclick="winManager.minimize('edytor_map')" class="g-icon-btn px-1 hover:text-white transition">_</button>
                        <button onclick="winManager.maximize('app-edytor_map')" class="g-icon-btn px-1 hover:text-white transition">□</button>
                        <button onclick="winManager.close('edytor_map')" class="text-red-500 hover:text-red-400 px-1 font-bold transition">✖</button>
                    </div>
                </div>
                
                <!-- PASEK GŁÓWNY GÓRNY -->
                <div class="flex items-center gap-2 p-2 bg-black/20 border-b g-border shrink-0 flex-wrap">
                    <button class="g-btn px-3 py-1.5 rounded text-[10px] bg-indigo-600/20 text-indigo-400 border-indigo-500/50 hover:bg-indigo-500 hover:text-white transition font-bold flex items-center gap-1" onclick="edytorMapApp.showOpenFromBigOSModal()">📂 Z BigOS</button>
                    <button class="g-btn px-3 py-1.5 rounded text-[10px] bg-blue-600/20 text-blue-400 border-blue-500/50 hover:bg-blue-500 hover:text-white transition font-bold flex items-center gap-1" onclick="document.getElementById('edytor-load-map-pc').click()">📂 Z dysku PC</button>
                    <button class="g-btn px-3 py-1.5 rounded text-[10px] bg-emerald-600/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500 hover:text-white transition font-bold flex items-center gap-1" onclick="edytorMapApp.saveMap()">💾 Zapisz (.map)</button>
                    <div class="w-px h-4 bg-gray-600/50 mx-1"></div>
                    <button class="g-btn px-3 py-1.5 rounded text-[10px] hover:bg-white/10 transition flex items-center gap-1 border border-transparent" title="Cofnij (Ctrl+Z)" onclick="edytorMapApp.undo()">↩️ Cofnij</button>
                    <button class="g-btn px-3 py-1.5 rounded text-[10px] border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition" onclick="edytorMapApp.resetMap(true)">🗑 Wyczyść</button>
                    
                    <div class="ml-auto flex items-center gap-2">
                        <span class="text-[10px] font-bold g-text-muted">Lupa:</span>
                        <input type="range" min="0.5" max="3" step="0.1" value="1.0" class="w-24 h-1.5 g-range rounded appearance-none" oninput="edytorMapApp.setZoom(this.value)" id="map-zoom-slider">
                    </div>
                </div>

                <div class="flex flex-row h-full gap-0 bg-black/10 flex-grow overflow-hidden">
                    
                    <!-- PASEK NARZĘDZI (LEWY) -->
                    <div class="w-[240px] border-r g-border bg-black/30 flex flex-col p-3 shrink-0 overflow-y-auto custom-scrollbar shadow-inner">
                        
                        <div class="flex justify-between items-center mb-2">
                            <h4 class="text-[10px] g-text-muted uppercase font-bold tracking-widest">Warstwa</h4>
                            <button class="text-[10px] text-blue-400 hover:text-blue-300" onclick="edytorMapApp.resizeMap()">📐 Rozmiar: <span id="map-size-lbl">30x20</span></button>
                        </div>
                        
                        <!-- NAPRAWIONY COMBOBOX (Wymuszenie ciemnego motywu we wszystkich przeglądarkach) -->
                        <select id="map-layer" class="w-full p-2 mb-4 rounded bg-black/40 g-text border g-border text-xs outline-none shadow-inner font-bold cursor-pointer" style="color-scheme: dark;" onchange="edytorMapApp.setLayer(this.value)">
                            <option value="0" class="bg-gray-900 text-gray-100">Tło (Ziemia/Woda)</option>
                            <option value="1" class="bg-gray-900 text-gray-100" selected>Teren (Ściany/Kolizje)</option>
                            <option value="2" class="bg-gray-900 text-gray-100">Obiekty (Spawn/NPC)</option>
                        </select>
                        
                        <h4 class="text-[10px] g-text-muted uppercase font-bold tracking-widest mb-1 border-t g-border pt-3">Narzędzie</h4>
                        <div class="flex gap-2 mb-4">
                            <button id="tool-pencil" class="g-btn p-2 rounded text-xs flex-1 transition font-bold" onclick="edytorMapApp.setTool('pencil')">✏️ Pędzel</button>
                            <button id="tool-fill" class="g-btn p-2 rounded text-xs flex-1 transition font-bold" onclick="edytorMapApp.setTool('fill')">🪣 Wypełnij</button>
                            <button id="tool-eraser" class="g-btn p-2 rounded text-xs flex-1 transition font-bold" onclick="edytorMapApp.setTool('eraser')">🧼 Gumka</button>
                        </div>

                        <h4 class="text-[10px] g-text-muted uppercase font-bold tracking-widest mb-2 border-t g-border pt-3">Biblioteka Kafelków</h4>
                        <div id="tilemap-palette" class="grid grid-cols-4 gap-2 pb-4">
                            <!-- Paleta generowana przez JS -->
                        </div>
                    </div>

                    <!-- OBSZAR ROBOCZY (PRAWY) -->
                    <!-- Dodano kontener z przewijaniem (overflow-auto), z usuniętym object-fit z canvasa -->
                    <div class="flex-grow bg-[#0f172a] overflow-auto custom-scrollbar flex items-start justify-start relative shadow-inner p-4" id="canvas-container">
                        <div class="relative shadow-2xl border border-black/50" id="canvas-wrapper" style="transform-origin: top left; transition: transform 0.1s ease-out;">
                            <canvas id="tilemap-canvas" class="bg-[#111] cursor-crosshair touch-none" style="image-rendering: pixelated;"></canvas>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Ukryte inputy -->
            <input type="file" id="edytor-import-img" accept="image/png, image/jpeg, image/webp" class="hidden" onchange="edytorMapApp.importImageTile(event)">
            <input type="file" id="edytor-load-map-pc" accept=".map,.json" class="hidden" onchange="edytorMapApp.loadFromFilePC(event)">
        `;
    },

    saveState: () => {
        // Głęboka kopia tablicy mapy jako string JSON dla historii zmian
        const state = JSON.stringify(edytorMapApp.map);
        edytorMapApp.undoStack.push(state);
        if(edytorMapApp.undoStack.length > 20) edytorMapApp.undoStack.shift(); // Max 20 kroków
    },

    undo: () => {
        if(edytorMapApp.undoStack.length > 0) {
            const state = edytorMapApp.undoStack.pop();
            edytorMapApp.map = JSON.parse(state);
            edytorMapApp.draw();
        }
    },

    handleZoom: (e) => {
        if (e.ctrlKey || e.altKey) {
            e.preventDefault();
            let zoom = edytorMapApp.zoomScale;
            zoom -= e.deltaY * 0.001;
            zoom = Math.max(0.5, Math.min(3, zoom));
            edytorMapApp.setZoom(zoom);
            document.getElementById('map-zoom-slider').value = zoom;
        }
    },

    setZoom: (val) => {
        edytorMapApp.zoomScale = parseFloat(val);
        const wrapper = document.getElementById('canvas-wrapper');
        if(wrapper) {
            wrapper.style.transform = `scale(${edytorMapApp.zoomScale})`;
        }
    },

    resizeMap: () => {
        if (typeof ui !== 'undefined' && ui.showPrompt) {
            ui.showPrompt("Podaj nowy wymiar mapy (kolumny x wiersze), np. 40x30:", `${edytorMapApp.cols}x${edytorMapApp.rows}`, "Zmień rozmiar", (val) => {
                edytorMapApp.executeResize(val);
            });
        } else {
            const val = prompt("Podaj nowy wymiar mapy (kolumny x wiersze), np. 40x30:", `${edytorMapApp.cols}x${edytorMapApp.rows}`);
            edytorMapApp.executeResize(val);
        }
    },

    executeResize: (val) => {
        if(!val) return;
        const parts = val.toLowerCase().split('x');
        if(parts.length !== 2) return;
        
        const newCols = parseInt(parts[0].trim());
        const newRows = parseInt(parts[1].trim());
        
        if(isNaN(newCols) || isNaN(newRows) || newCols < 5 || newRows < 5 || newCols > 500 || newRows > 500) {
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Nieprawidłowe wymiary.', 'error');
            return;
        }

        edytorMapApp.saveState(); // Zapisz przed zmianą rozmiaru
        
        const newMap = [[], [], []];
        for(let l=0; l<3; l++) {
            for(let r=0; r<newRows; r++) {
                newMap[l][r] = [];
                for(let c=0; c<newCols; c++) {
                    newMap[l][r][c] = (edytorMapApp.map[l] && edytorMapApp.map[l][r] && edytorMapApp.map[l][r][c]) ? edytorMapApp.map[l][r][c] : 0;
                }
            }
        }
        
        edytorMapApp.cols = newCols;
        edytorMapApp.rows = newRows;
        edytorMapApp.map = newMap;
        
        const canvas = document.getElementById('tilemap-canvas');
        if(canvas) {
            canvas.width = edytorMapApp.cols * edytorMapApp.tileSize;
            canvas.height = edytorMapApp.rows * edytorMapApp.tileSize;
        }
        
        document.getElementById('map-size-lbl').innerText = `${newCols}x${newRows}`;
        edytorMapApp.draw();
    },

    resetMap: (saveHistory = true) => {
        if(saveHistory) edytorMapApp.saveState();
        edytorMapApp.map = [
            Array.from({ length: edytorMapApp.rows }, () => Array(edytorMapApp.cols).fill(0)),
            Array.from({ length: edytorMapApp.rows }, () => Array(edytorMapApp.cols).fill(0)),
            Array.from({ length: edytorMapApp.rows }, () => Array(edytorMapApp.cols).fill(0))
        ];
        edytorMapApp.draw();
    },

    renderPalette: () => {
        const pal = document.getElementById('tilemap-palette');
        if(!pal) return;
        pal.innerHTML = '';
        
        Object.keys(edytorMapApp.tiles).forEach(id => {
            const t = edytorMapApp.tiles[id];
            const btn = document.createElement('button');
            btn.className = 'w-full aspect-square g-btn rounded border flex items-center justify-center text-xl transition hover:scale-110 shadow-sm overflow-hidden bg-black/40 relative';
            btn.title = t.name;
            
            if(t.color !== 'transparent') btn.style.backgroundColor = t.color;

            if (edytorMapApp.currentTile == id && document.getElementById('tool-pencil').classList.contains('text-blue-500')) {
                btn.classList.add('border-blue-400', 'shadow-[0_0_10px_rgba(59,130,246,0.8)]', 'scale-110', 'z-10');
            } else {
                btn.classList.add('border-transparent');
            }
            
            if (t.img) btn.innerHTML = `<img src="${t.img}" class="w-full h-full object-cover" draggable="false">`;
            else btn.innerHTML = t.icon;
            
            btn.onclick = () => edytorMapApp.setTile(id);
            pal.appendChild(btn);
        });

        const btnAddEmoji = document.createElement('button');
        btnAddEmoji.className = 'w-full aspect-square g-btn rounded border border-dashed border-gray-500/50 flex flex-col items-center justify-center text-sm transition hover:scale-110 shadow-sm bg-black/10 text-gray-400 hover:text-white hover:border-white/50';
        btnAddEmoji.title = 'Dodaj Emoji';
        btnAddEmoji.innerHTML = '<span>😀</span><span>+</span>';
        btnAddEmoji.onclick = () => edytorMapApp.addCustomTile();
        pal.appendChild(btnAddEmoji);

        const btnAddImg = document.createElement('button');
        btnAddImg.className = 'w-full aspect-square g-btn rounded border border-dashed border-gray-500/50 flex flex-col items-center justify-center text-sm transition hover:scale-110 shadow-sm bg-black/10 text-gray-400 hover:text-white hover:border-white/50';
        btnAddImg.title = 'Wgraj Grafikę (.png)';
        btnAddImg.innerHTML = '<span>🖼️</span><span>+</span>';
        btnAddImg.onclick = () => document.getElementById('edytor-import-img').click();
        pal.appendChild(btnAddImg);
    },

    addCustomTile: () => {
        if (typeof ui !== 'undefined' && ui.showPrompt) {
            ui.showPrompt("Podaj ikonę dla kafelka (np. dowolne emoji):", "🌟", "Dalej", (icon) => {
                if(!icon || icon.trim() === "") return;
                ui.showPrompt("Podaj nazwę dla tego kafelka:", "Nowy Kafelek", "Dodaj", (name) => {
                    if(!name || name.trim() === "") return;
                    const newId = Math.max(...Object.keys(edytorMapApp.tiles).map(Number)) + 1;
                    edytorMapApp.tiles[newId] = { icon: icon.trim(), color: 'transparent', name: name.trim() };
                    edytorMapApp.renderPalette();
                    if (typeof apps !== 'undefined') apps.showToast('Sukces', `Dodano kafelek: ${name}`, 'success');
                });
            });
        }
    },

    importImageTile: (e) => {
        const file = e.target.files[0];
        if(!file) return;
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            const img = new Image();
            img.onload = () => {
                const newId = Math.max(...Object.keys(edytorMapApp.tiles).map(Number)) + 1;
                edytorMapApp.tiles[newId] = { icon: '', color: 'transparent', name: file.name, img: dataUrl, imgObj: img };
                edytorMapApp.renderPalette();
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
        e.target.value = ''; 
    },

    setTile: (id) => {
        edytorMapApp.currentTile = parseInt(id);
        edytorMapApp.lastTile = edytorMapApp.currentTile;
        edytorMapApp.setTool('pencil');
    },

    setTool: (tool) => {
        edytorMapApp.currentTool = tool;
        const btnPencil = document.getElementById('tool-pencil');
        const btnFill = document.getElementById('tool-fill');
        const btnEraser = document.getElementById('tool-eraser');
        
        [btnPencil, btnFill, btnEraser].forEach(b => b.className = 'g-btn p-2 rounded text-xs flex-1 transition font-bold hover:bg-white/10 border border-transparent');
        
        if (tool === 'eraser') {
            edytorMapApp.currentTile = 0;
            btnEraser.className = 'g-btn p-2 rounded text-xs flex-1 border-blue-500 text-blue-500 shadow-inner bg-blue-500/10 font-bold transition';
        } else if (tool === 'fill') {
            edytorMapApp.currentTile = edytorMapApp.lastTile;
            btnFill.className = 'g-btn p-2 rounded text-xs flex-1 border-blue-500 text-blue-500 shadow-inner bg-blue-500/10 font-bold transition';
        } else {
            edytorMapApp.currentTile = edytorMapApp.lastTile;
            btnPencil.className = 'g-btn p-2 rounded text-xs flex-1 border-blue-500 text-blue-500 shadow-inner bg-blue-500/10 font-bold transition';
        }
        edytorMapApp.renderPalette();
    },

    setLayer: (l) => {
        edytorMapApp.currentLayer = parseInt(l);
        edytorMapApp.draw();
    },

    draw: () => {
        const canvas = document.getElementById('tilemap-canvas');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        
        // Tło
        ctx.fillStyle = '#0f172a'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for(let l = 0; l < 3; l++) {
            ctx.globalAlpha = (edytorMapApp.currentLayer === l) ? 1.0 : 0.3;
            
            for(let r = 0; r < edytorMapApp.rows; r++) {
                for(let c = 0; c < edytorMapApp.cols; c++) {
                    let tileId = edytorMapApp.map[l][r][c];
                    if (tileId > 0 && edytorMapApp.tiles[tileId]) {
                        let tx = c * edytorMapApp.tileSize;
                        let ty = r * edytorMapApp.tileSize;
                        let t = edytorMapApp.tiles[tileId];
                        
                        if (t.img) {
                            if (!t.imgObj) {
                                t.imgObj = new Image();
                                t.imgObj.src = t.img;
                                t.imgObj.onload = () => edytorMapApp.draw(); 
                            }
                            if (t.imgObj.complete && t.imgObj.naturalWidth > 0) {
                                ctx.drawImage(t.imgObj, tx, ty, edytorMapApp.tileSize, edytorMapApp.tileSize);
                            }
                        } 
                        else {
                            if (t.color !== 'transparent') {
                                ctx.fillStyle = t.color;
                                ctx.fillRect(tx, ty, edytorMapApp.tileSize, edytorMapApp.tileSize);
                            }
                            if (l > 0) { ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4; } else { ctx.shadowBlur = 0; }

                            ctx.font = "20px Arial";
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillStyle = '#ffffff';
                            ctx.fillText(t.icon, tx + edytorMapApp.tileSize/2, ty + edytorMapApp.tileSize/2 + 2);
                            ctx.shadowBlur = 0;
                        }
                    }
                }
            }
        }
        
        // Siatka
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let c = 0; c <= edytorMapApp.cols; c++) {
            ctx.moveTo(c * edytorMapApp.tileSize, 0); ctx.lineTo(c * edytorMapApp.tileSize, canvas.height);
        }
        for(let r = 0; r <= edytorMapApp.rows; r++) {
            ctx.moveTo(0, r * edytorMapApp.tileSize); ctx.lineTo(canvas.width, r * edytorMapApp.tileSize);
        }
        ctx.stroke();
    },

    startDraw: (e) => {
        // Jeśli ŚPM (Środkowy Przycisk Myszy) lub Prawy (2), zablokuj rysowanie
        if (e.button === 1 || e.button === 2) return;
        
        edytorMapApp.saveState(); // Zapis do historii (Ctrl+Z)
        
        edytorMapApp.isDrawing = true;
        
        // Jeśli wybrano wiaderko, wykonujemy je raz i przerywamy rysowanie ciągłe
        if (edytorMapApp.currentTool === 'fill') {
            edytorMapApp.executeFill(e);
            edytorMapApp.isDrawing = false;
        } else {
            edytorMapApp.drawTile(e);
        }
    },
    
    stopDraw: () => {
        edytorMapApp.isDrawing = false;
    },
    
    // Obliczanie precyzyjnej pozycji myszy względem zooma CSS i przewijania
    getGridPos: (e) => {
        const canvas = document.getElementById('tilemap-canvas');
        const rect = canvas.getBoundingClientRect();
        
        let clientX = e.clientX, clientY = e.clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
        }

        // Dzielimy przez zoomScale z powodu CSS transform: scale()
        const x = (clientX - rect.left) / edytorMapApp.zoomScale;
        const y = (clientY - rect.top) / edytorMapApp.zoomScale;
        
        const c = Math.floor(x / edytorMapApp.tileSize);
        const r = Math.floor(y / edytorMapApp.tileSize);
        return {r, c};
    },

    drawTile: (e) => {
        if (!edytorMapApp.isDrawing) return;
        const pos = edytorMapApp.getGridPos(e);
        if (pos.c >= 0 && pos.c < edytorMapApp.cols && pos.r >= 0 && pos.r < edytorMapApp.rows) {
            if (edytorMapApp.map[edytorMapApp.currentLayer][pos.r][pos.c] !== edytorMapApp.currentTile) {
                edytorMapApp.map[edytorMapApp.currentLayer][pos.r][pos.c] = edytorMapApp.currentTile;
                edytorMapApp.draw();
            }
        }
    },

    // 🪣 NIESAMOWITE Wiaderko (Flood Fill) za pomocą algorytmu przeszukiwania wszerz (BFS)
    executeFill: (e) => {
        const pos = edytorMapApp.getGridPos(e);
        if (pos.c < 0 || pos.c >= edytorMapApp.cols || pos.r < 0 || pos.r >= edytorMapApp.rows) return;
        
        const targetLayer = edytorMapApp.currentLayer;
        const targetId = edytorMapApp.map[targetLayer][pos.r][pos.c];
        const replacementId = edytorMapApp.currentTile;
        
        if (targetId === replacementId) return; // Nic do zmiany
        
        const queue = [{r: pos.r, c: pos.c}];
        
        // Zabezpieczenie przed nieskończoną pętlą (choć przy BFS nie powinna wystąpić)
        let loops = 0; 
        while(queue.length > 0 && loops < 50000) {
            loops++;
            const curr = queue.shift();
            
            if (edytorMapApp.map[targetLayer][curr.r][curr.c] === targetId) {
                edytorMapApp.map[targetLayer][curr.r][curr.c] = replacementId;
                
                // Dodajemy sąsiadów do kolejki (Góra, Dół, Lewo, Prawo)
                if(curr.r > 0) queue.push({r: curr.r - 1, c: curr.c});
                if(curr.r < edytorMapApp.rows - 1) queue.push({r: curr.r + 1, c: curr.c});
                if(curr.c > 0) queue.push({r: curr.r, c: curr.c - 1});
                if(curr.c < edytorMapApp.cols - 1) queue.push({r: curr.r, c: curr.c + 1});
            }
        }
        edytorMapApp.draw();
    },

    // ==================================================================
    // 📂 SYSTEM WPROWADZANIA I ZAPISU (IMPORT/EXPORT DO .MAP)
    // ==================================================================
    showOpenFromBigOSModal: () => {
        const modalId = 'edytor-open-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        let fileOptions = '';
        if (typeof fileSystem !== 'undefined') {
            const mapFiles = fileSystem.filter(f => f.type === 'file' && f.name.endsWith('.map'));
            if (mapFiles.length > 0) {
                mapFiles.forEach(f => {
                    fileOptions += `<div class="p-3 border-b g-border hover:bg-white/10 cursor-pointer flex items-center gap-3 transition" onclick="edytorMapApp.loadFromBigOSById('${f.id}'); document.getElementById('${modalId}').remove()"><span class="text-2xl">${f.icon || '🗺️'}</span> <span class="g-text text-sm font-bold">${f.name}</span></div>`;
                });
            } else {
                fileOptions = '<div class="p-6 text-center g-text-muted text-sm font-bold">Brak zapisanych map (.map) na dysku BigOS.</div>';
            }
        }

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
        modal.innerHTML = `
            <div class="g-panel p-0 rounded-2xl shadow-2xl max-w-sm w-full border g-border flex flex-col overflow-hidden">
                <div class="p-4 border-b g-border bg-black/30 flex justify-between items-center shrink-0">
                    <h2 class="text-lg font-bold g-text flex items-center gap-2"><span>📂</span> Otwórz mapę z BigOS</h2>
                    <button onclick="document.getElementById('${modalId}').remove()" class="text-red-500 hover:bg-red-500/20 px-2 py-1 rounded transition font-bold">✖</button>
                </div>
                <div class="max-h-[350px] overflow-y-auto custom-scrollbar flex flex-col bg-black/10">
                    ${fileOptions}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    loadFromBigOSById: (id) => {
        if(typeof fileSystem === 'undefined') return;
        const file = fileSystem.find(f => f.id === id);
        if(file) edytorMapApp.loadFromBigOS(file);
    },

    loadFromBigOS: (fileObj) => {
        if(typeof winManager !== 'undefined') winManager.open('edytor_map');
        try {
            const data = JSON.parse(fileObj.content);
            if (!data.cols || !data.rows || !data.data) throw new Error("Nieprawidłowy format mapy.");
            
            edytorMapApp.saveState(); // Punkt przywracania przed importem
            
            edytorMapApp.cols = data.cols;
            edytorMapApp.rows = data.rows;
            edytorMapApp.map = data.data;
            if (data.customTiles) {
                // Łączenie bazowych kafelków z zaimportowanymi (bez nadpisywania standardowych ID)
                for(let key in data.customTiles) {
                    if (parseInt(key) > 12) edytorMapApp.tiles[key] = data.customTiles[key];
                }
            }
            
            document.getElementById('map-size-lbl').innerText = `${edytorMapApp.cols}x${edytorMapApp.rows}`;
            const canvas = document.getElementById('tilemap-canvas');
            if(canvas) {
                canvas.width = edytorMapApp.cols * edytorMapApp.tileSize;
                canvas.height = edytorMapApp.rows * edytorMapApp.tileSize;
            }
            
            edytorMapApp.renderPalette();
            edytorMapApp.draw();
            if(typeof apps !== 'undefined') apps.showToast('Import', `Pomyślnie załadowano mapę!`, 'success');
        } catch (e) {
            console.error(e);
            if(typeof apps !== 'undefined') apps.showToast('Błąd Importu', 'Plik jest uszkodzony lub w złym formacie.', 'error');
        }
    },

    loadFromFilePC: (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            edytorMapApp.loadFromBigOS({ content: ev.target.result });
        };
        reader.readAsText(file);
        e.target.value = '';
    },

    saveMap: () => {
        const modalId = 'edytor-save-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        let folderOptions = `<option value="root" class="bg-gray-900 text-gray-100">Pulpit (główny ekran)</option>`;
        if (typeof fileSystem !== 'undefined') {
            const folders = fileSystem.filter(f => f.type === 'folder');
            folders.forEach(f => {
                folderOptions += `<option value="${f.id}" class="bg-gray-900 text-gray-100">📁 ${f.name}</option>`;
            });
        }

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-sm w-full border g-border flex flex-col">
                <h2 class="text-xl font-bold g-text mb-4 border-b g-border pb-2 flex items-center gap-2"><span>💾</span> Zapisz Mapę</h2>

                <div class="mb-4">
                    <label class="block text-[10px] uppercase font-bold g-text-muted mb-1 tracking-wider">Nazwa Pliku</label>
                    <div class="flex items-center gap-2">
                        <input type="text" id="edytor-save-name" value="Moja_Mapa" class="w-full p-2.5 g-bg g-text border g-border rounded outline-none focus:border-blue-500 font-bold shadow-inner text-sm">
                        <span class="g-text-muted font-mono font-bold">.map</span>
                    </div>
                </div>

                <div class="mb-6">
                    <label class="block text-[10px] uppercase font-bold g-text-muted mb-1 tracking-wider">Lokalizacja (Dla zapisu w BigOS)</label>
                    <select id="edytor-save-loc" class="w-full p-2.5 bg-black/40 g-text border g-border rounded outline-none focus:border-blue-500 font-bold shadow-inner text-sm cursor-pointer" style="color-scheme: dark;">
                        ${folderOptions}
                    </select>
                </div>

                <div class="flex justify-end gap-2 shrink-0 border-t g-border pt-4">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border shadow-sm text-xs">Anuluj</button>
                    <button id="edytor-save-pc" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-600/30 transition font-bold border border-blue-700 text-xs flex items-center gap-1">💻 Na PC</button>
                    <button id="edytor-save-bigos" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-600/30 transition font-bold border border-emerald-700 text-xs flex items-center gap-1">🌐 W BigOS</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('edytor-save-pc').onclick = () => {
            const name = document.getElementById('edytor-save-name').value.trim() || 'Moja_Mapa';
            edytorMapApp.exportToPC(name);
            modal.remove();
        };
        
        document.getElementById('edytor-save-bigos').onclick = () => {
            const name = document.getElementById('edytor-save-name').value.trim() || 'Moja_Mapa';
            const loc = document.getElementById('edytor-save-loc').value;
            edytorMapApp.executeSave(name, loc);
            modal.remove();
        };
    },
    
    exportToPC: (name) => {
        const cleanTiles = {};
        for(let key in edytorMapApp.tiles) {
            cleanTiles[key] = { ...edytorMapApp.tiles[key] };
            delete cleanTiles[key].imgObj; 
        }

        const mapJson = JSON.stringify({
            cols: edytorMapApp.cols, 
            rows: edytorMapApp.rows, 
            tileSize: edytorMapApp.tileSize,
            version: "1.2",
            data: edytorMapApp.map,
            customTiles: cleanTiles 
        });

        const nazwa = name.endsWith('.map') ? name : name + ".map";
        const blob = new Blob([mapJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nazwa;
        a.click();
        URL.revokeObjectURL(url);
        
        if(typeof apps !== 'undefined') apps.showToast('Eksport na PC', `Pobrano mapę: ${nazwa}`, 'success');
    },

    executeSave: (name, parentId) => {
        const cleanTiles = {};
        for(let key in edytorMapApp.tiles) {
            cleanTiles[key] = { ...edytorMapApp.tiles[key] };
            delete cleanTiles[key].imgObj; 
        }

        const mapJson = JSON.stringify({
            cols: edytorMapApp.cols, 
            rows: edytorMapApp.rows, 
            tileSize: edytorMapApp.tileSize,
            version: "1.2",
            data: edytorMapApp.map,
            customTiles: cleanTiles 
        });

        if(typeof fileSystem !== 'undefined' && typeof fsManager !== 'undefined') {
            const nazwa = name.endsWith('.map') ? name : name + ".map";
            let checkX = 30, checkY = 30;
            
            if (parentId === 'root') {
                let placed = false, col = 0, row = 0;
                const maxRows = Math.max(1, Math.floor((window.innerHeight - 120) / 100));
                while (!placed && col < 20) {
                    checkX = 30 + (col * 90);
                    checkY = 30 + (row * 100);
                    const isOccupied = fileSystem.some(f => f.parentId === 'root' && Math.abs(f.x - checkX) < 40 && Math.abs(f.y - checkY) < 40);
                    if (!isOccupied) placed = true;
                    else {
                        row++;
                        if (row >= maxRows) { row = 0; col++; }
                    }
                }
            }

            fileSystem.push({
                id: 'map_' + Date.now(),
                type: 'file',
                name: nazwa,
                icon: '🗺️',
                content: mapJson,
                parentId: parentId,
                x: checkX,
                y: checkY
            });
            fsManager.save();
            
            if(typeof desktop !== 'undefined') desktop.render();
            if(typeof apps !== 'undefined') {
                const toastLocName = parentId === 'root' ? 'na Pulpicie' : 'w wybranym folderze';
                apps.showToast('Zapisano Mapę', `Utworzono plik ${nazwa} ${toastLocName}!`, 'success');
            }
        }
    }
};

setTimeout(edytorMapApp.init, 500);