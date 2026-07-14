// ======================================================================
// PLIK: js/paint.js (Aplikacja: Artysta PRO - Profesjonalny Edytor Grafiki)
// ======================================================================

window.artystaApp = {
    // --- STANY PŁÓTNA I WIDOKU ---
    width: 800, height: 600,
    zoom: 1, panX: 0, panY: 0,
    isPanning: false, startPanX: 0, startPanY: 0, startMouseX: 0, startMouseY: 0,
    
    // --- WARSTWY I HISTORIA ---
    layers: [], 
    currentLayerId: null,
    history: [], historyStep: -1,
    
    // --- NARZĘDZIA ---
    activeTool: 'brush', 
    primaryColor: '#000000', secondaryColor: '#ffffff',
    brushSize: 5, brushOpacity: 100, brushHardness: 50,
    
    // --- STANY RYSOWANIA ---
    isDrawing: false, lastX: 0, lastY: 0, startDrawX: 0, startDrawY: 0,
    previewCanvas: null, previewCtx: null,

    // --- TEKST ---
    textActive: false, textElement: null,

    // --- AI ---
    aiMessages: [],
    isAIThinking: false,

    init: () => {
        artystaApp.upgradeUI();
        
        const workspace = document.getElementById('art-workspace-area');
        
        artystaApp.previewCanvas = document.createElement('canvas');
        artystaApp.previewCanvas.className = 'absolute top-0 left-0 pointer-events-none z-[90]';
        document.getElementById('art-canvas-container').appendChild(artystaApp.previewCanvas);
        
        artystaApp.applyCanvasSize(800, 600);
        artystaApp.addLayer('Tło', true); 
        artystaApp.addLayer('Warstwa 1'); 
        artystaApp.saveHistory('Nowy Projekt');

        workspace.addEventListener('pointerdown', artystaApp.pointerDown);
        window.addEventListener('pointermove', (e) => {
            artystaApp.pointerMove(e);
            artystaApp.updateCursor(e);
        });
        window.addEventListener('pointerup', artystaApp.pointerUp);
        workspace.addEventListener('pointerleave', () => {
            const cursor = document.getElementById('art-cursor');
            if(cursor) cursor.style.display = 'none';
        });
        
        workspace.addEventListener('wheel', (e) => {
            if(e.ctrlKey) { 
                e.preventDefault(); 
                artystaApp.setZoom(artystaApp.zoom - (e.deltaY > 0 ? 0.1 : -0.1)); 
                artystaApp.updateCursor(e);
            } else { 
                artystaApp.panY -= e.deltaY; artystaApp.panX -= e.deltaX; 
                artystaApp.updateView(); 
            }
        }, {passive: false});

        window.addEventListener('keydown', (e) => {
            const win = document.getElementById('app-szkicownik');
            if(win && win.classList.contains('active') && !artystaApp.textActive) {
                if(e.code === 'Space' && !artystaApp.isDrawing) { workspace.style.cursor = 'grab'; artystaApp.tempPanMode = true; }
                if(e.ctrlKey && e.code === 'KeyZ') { e.preventDefault(); artystaApp.undo(); }
                if(e.ctrlKey && e.code === 'KeyY') { e.preventDefault(); artystaApp.redo(); }
                if(e.ctrlKey && e.code === 'KeyS') { e.preventDefault(); artystaApp.showSaveBigOSModal(); }
            }
        });
        window.addEventListener('keyup', (e) => {
            if(e.code === 'Space') { workspace.style.cursor = 'crosshair'; artystaApp.tempPanMode = false; }
        });
    },

    // ==================================================================
    // 1. INTERFEJS UŻYTKOWNIKA (UI) W THEME.JS
    // ==================================================================
    upgradeUI: () => {
        let appWindow = document.getElementById('app-szkicownik');
        if (!appWindow) return;

        appWindow.style.width = '1200px';
        appWindow.style.height = '750px';
        appWindow.style.background = 'transparent';
        appWindow.style.border = 'none';
        appWindow.style.boxShadow = 'none';

        const titleBar = appWindow.querySelector('.title-bar');
        Array.from(appWindow.children).forEach(child => { if (child !== titleBar) child.remove(); });
        if(titleBar) titleBar.style.display = 'none';

        const proUI = document.createElement('div');
        proUI.className = 'flex flex-col overflow-hidden relative themed-app g-panel rounded-lg shadow-2xl h-full w-full select-none';

        proUI.innerHTML = `
            <!-- KURSOR PĘDZLA -->
            <div id="art-cursor" class="pointer-events-none absolute z-[9999] border hidden mix-blend-difference" style="border-radius: 50%; transform: translate(-50%, -50%); border-color: rgba(255,255,255,0.9); box-shadow: 0 0 0 1px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(0,0,0,0.8);"></div>

            <!-- GŁÓWNY PASEK TYTUŁOWY Z MENU DROPDOWN -->
            <div class="px-2 py-1 border-b g-border flex justify-between items-center cursor-move bg-black/40 shrink-0 relative z-[100] shadow-md" onmousedown="winManager.startDrag(event, 'app-szkicownik')" ontouchstart="winManager.startDrag(event, 'app-szkicownik')">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-bold g-text drop-shadow-md flex items-center gap-1 mx-2">🎨 Artysta</span>
                    
                    <!-- MENU PLIK -->
                    <div class="relative group h-full flex items-center">
                        <button class="px-3 py-1.5 hover:bg-white/10 transition cursor-pointer g-text font-bold text-xs rounded">Plik</button>
                        <div class="absolute left-0 top-full hidden group-hover:flex flex-col g-panel border g-border shadow-2xl rounded min-w-[200px] z-[9999] py-1">
                            <button class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs font-bold" onclick="artystaApp.showNewProjectModal()">📄 Nowy projekt...</button>
                            <div class="border-t g-border my-1"></div>
                            <button class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs" onclick="document.getElementById('art-open-pc').click()">📂 Otwórz z komputera...</button>
                            <input type="file" id="art-open-pc" accept="image/*,.bigpaint" class="hidden" onchange="artystaApp.openFromPC(event)">
                            <button class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs" onclick="artystaApp.showOpenBigOSModal()">☁️ Otwórz z BigOS...</button>
                            <div class="border-t g-border my-1"></div>
                            <button class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs font-bold" onclick="artystaApp.showSaveBigOSModal()">💾 Zapisz (BigOS)...</button>
                            <button class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs" onclick="artystaApp.showExportModal()">📥 Zapisz (Eksport na PC)...</button>
                            <div class="border-t g-border my-1"></div>
                            <button class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs" onclick="artystaApp.confirmCloseFile()">📁 Zamknij plik</button>
                            <div class="border-t g-border my-1"></div>
                            <button class="text-left px-4 py-1.5 hover:bg-red-500 hover:text-white transition text-xs text-red-400 font-bold" onclick="winManager.close('szkicownik')">✖ Zakończ</button>
                        </div>
                    </div>

                    <!-- MENU EDYCJA -->
                    <div class="relative group h-full flex items-center">
                        <button class="px-3 py-1.5 hover:bg-white/10 transition cursor-pointer g-text font-bold text-xs rounded">Edycja</button>
                        <div class="absolute left-0 top-full hidden group-hover:flex flex-col g-panel border g-border shadow-2xl rounded min-w-[200px] z-[9999] py-1">
                            <button class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs flex justify-between" onclick="artystaApp.undo()"><span>Cofnij</span> <span class="g-text-muted text-[9px]">Ctrl+Z</span></button>
                            <button class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs flex justify-between" onclick="artystaApp.redo()"><span>Ponów</span> <span class="g-text-muted text-[9px]">Ctrl+Y</span></button>
                            <div class="border-t g-border my-1"></div>
                            <button class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs" onclick="artystaApp.clearLayer()">Wyczyść warstwę</button>
                        </div>
                    </div>

                    <!-- MENU OBRAZ -->
                    <div class="relative group h-full flex items-center">
                        <button class="px-3 py-1.5 hover:bg-white/10 transition cursor-pointer g-text font-bold text-xs rounded">Obraz</button>
                        <div class="absolute left-0 top-full hidden group-hover:flex flex-col g-panel border g-border shadow-2xl rounded min-w-[200px] z-[9999] py-1">
                            <button class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs" onclick="artystaApp.showResizeModal()">Zmień rozmiar płótna...</button>
                            <button class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs" onclick="artystaApp.transformImage('flipX')">Odbij poziomo</button>
                            <button class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs" onclick="artystaApp.transformImage('flipY')">Odbij pionowo</button>
                        </div>
                    </div>

                    <!-- MENU FILTRY -->
                    <div class="relative group h-full flex items-center">
                        <button class="px-3 py-1.5 hover:bg-white/10 transition cursor-pointer g-text font-bold text-xs rounded">Filtry</button>
                        <div class="absolute left-0 top-full hidden group-hover:flex flex-col g-panel border g-border shadow-2xl rounded min-w-[200px] z-[9999] py-1">
                            <button class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs" onclick="artystaApp.applyFilter('grayscale')">Czarno-biały</button>
                            <button class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs" onclick="artystaApp.applyFilter('invert')">Odwróć kolory (Negatyw)</button>
                            <button class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs" onclick="artystaApp.applyFilter('sepia')">Sepia / Vintage</button>
                            <div class="border-t g-border my-1"></div>
                            <button class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs" onclick="artystaApp.showFilterModal('blur')">Rozmycie Gaussa...</button>
                            <button class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs" onclick="artystaApp.showFilterModal('noise')">Dodaj szum...</button>
                            <button class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs" onclick="artystaApp.showFilterModal('pixelate')">Pixel Art (Mozaika)...</button>
                        </div>
                    </div>
                </div>

                <div class="flex gap-2 relative z-50">
                    <button onclick="artystaApp.toggleAIPanel()" class="g-btn px-3 h-7 rounded shadow-sm flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold border-none transition text-xs" title="Narzędzia AI">✨ BigAI Tools</button>
                    <div class="w-px h-4 bg-gray-600 mx-1 self-center"></div>
                    <button onclick="winManager.minimize('szkicownik')" class="g-icon-btn px-1 g-text transition">_</button>
                    <button onclick="winManager.maximize('app-szkicownik')" class="g-icon-btn px-1 g-text transition">□</button>
                    <button onclick="winManager.close('szkicownik')" class="text-red-500 hover:text-red-400 px-1 font-bold transition">✖</button>
                </div>
            </div>

            <!-- PASEK WŁAŚCIWOŚCI NARZĘDZIA -->
            <div class="p-2 border-b g-border bg-black/20 flex gap-4 items-center shrink-0 h-10 overflow-x-auto custom-scrollbar" id="art-properties-bar">
                <!-- Generowane dynamicznie na podstawie wybranego narzędzia -->
            </div>

            <div class="flex flex-row flex-grow overflow-hidden relative">
                
                <!-- PASEK NARZĘDZI (Lewy - Powiększony do 2 kolumn) -->
                <div class="w-[84px] border-r g-border bg-black/30 flex flex-col p-1 gap-1 shrink-0 overflow-y-auto custom-scrollbar z-20 items-center pt-2">
                    <div class="grid grid-cols-2 gap-1 w-full px-1">
                        <button class="art-tool-btn w-8 h-8 rounded-lg g-btn hover:bg-white/10 flex items-center justify-center text-lg transition-all shadow-sm" data-tool="move" onclick="artystaApp.setTool('move')" title="Przesuń Widok (Spacja)">🖐️</button>
                        <button class="art-tool-btn w-8 h-8 rounded-lg g-btn hover:bg-white/10 flex items-center justify-center text-lg transition-all shadow-sm" data-tool="picker" onclick="artystaApp.setTool('picker')" title="Pipeta (Wybierz Kolor)">💧</button>

                        <div class="col-span-2 w-full h-px bg-gray-600/50 my-1"></div>
                        
                        <button class="art-tool-btn w-8 h-8 rounded-lg g-btn hover:bg-white/10 flex items-center justify-center text-lg transition-all shadow-sm" data-tool="pencil" onclick="artystaApp.setTool('pencil')" title="Ołówek (Twardy)">✏️</button>
                        <button class="art-tool-btn w-8 h-8 rounded-lg g-btn hover:bg-white/10 flex items-center justify-center text-lg transition-all shadow-sm" data-tool="brush" onclick="artystaApp.setTool('brush')" title="Pędzel (Miękki)">🖌️</button>
                        
                        <button class="art-tool-btn w-8 h-8 rounded-lg g-btn hover:bg-white/10 flex items-center justify-center text-lg transition-all shadow-sm" data-tool="airbrush" onclick="artystaApp.setTool('airbrush')" title="Aerograf">💨</button>
                        <button class="art-tool-btn w-8 h-8 rounded-lg g-btn hover:bg-white/10 flex items-center justify-center text-lg transition-all shadow-sm" data-tool="marker" onclick="artystaApp.setTool('marker')" title="Marker">🖍️</button>
                        
                        <button class="art-tool-btn w-8 h-8 rounded-lg g-btn hover:bg-white/10 flex items-center justify-center text-lg transition-all shadow-sm" data-tool="pen" onclick="artystaApp.setTool('pen')" title="Długopis">🖊️</button>
                        <button class="art-tool-btn w-8 h-8 rounded-lg g-btn hover:bg-white/10 flex items-center justify-center text-lg transition-all shadow-sm" data-tool="calligraphy" onclick="artystaApp.setTool('calligraphy')" title="Pióro Kaligraficzne">✒️</button>

                        <button class="art-tool-btn w-8 h-8 rounded-lg g-btn hover:bg-white/10 flex items-center justify-center text-lg transition-all shadow-sm" data-tool="eraser" onclick="artystaApp.setTool('eraser')" title="Gumka">🧼</button>
                        <button class="art-tool-btn w-8 h-8 rounded-lg g-btn hover:bg-white/10 flex items-center justify-center text-lg transition-all shadow-sm" data-tool="fill" onclick="artystaApp.setTool('fill')" title="Wypełnienie (Wiadro)">🪣</button>
                        
                        <div class="col-span-2 w-full h-px bg-gray-600/50 my-1"></div>

                        <button class="art-tool-btn w-8 h-8 rounded-lg g-btn hover:bg-white/10 flex items-center justify-center text-lg transition-all shadow-sm" data-tool="blur" onclick="artystaApp.setTool('blur')" title="Rozmycie">💧</button>
                        <button class="art-tool-btn w-8 h-8 rounded-lg g-btn hover:bg-white/10 flex items-center justify-center text-lg transition-all shadow-sm" data-tool="dodge" onclick="artystaApp.setTool('dodge')" title="Rozjaśnianie">☀️</button>
                        <button class="art-tool-btn w-8 h-8 rounded-lg g-btn hover:bg-white/10 flex items-center justify-center text-lg transition-all shadow-sm" data-tool="burn" onclick="artystaApp.setTool('burn')" title="Przyciemnianie">🌑</button>
                        <button class="art-tool-btn w-8 h-8 rounded-lg g-btn hover:bg-white/10 flex items-center justify-center text-lg transition-all shadow-sm" data-tool="text" onclick="artystaApp.setTool('text')" title="Tekst">T</button>

                        <div class="col-span-2 w-full h-px bg-gray-600/50 my-1"></div>
                        
                        <button class="art-tool-btn w-8 h-8 rounded-lg g-btn hover:bg-white/10 flex items-center justify-center text-lg transition-all shadow-sm" data-tool="line" onclick="artystaApp.setTool('line')" title="Linia Prosta">📏</button>
                        <button class="art-tool-btn w-8 h-8 rounded-lg g-btn hover:bg-white/10 flex items-center justify-center text-lg transition-all shadow-sm" data-tool="rect" onclick="artystaApp.setTool('rect')" title="Prostokąt">⬜</button>
                        <button class="art-tool-btn w-8 h-8 rounded-lg g-btn hover:bg-white/10 flex items-center justify-center text-lg transition-all shadow-sm" data-tool="circle" onclick="artystaApp.setTool('circle')" title="Koło">⭕</button>
                    </div>
                </div>

                <!-- Obszar Roboczy (Nieskończone płótno) -->
                <div id="art-workspace-area" oncontextmenu="return false;" class="flex-grow relative bg-[#1a1a1a] overflow-hidden cursor-crosshair" style="background-image: linear-gradient(45deg, #222 25%, transparent 25%, transparent 75%, #222 75%, #222), linear-gradient(45deg, #222 25%, transparent 25%, transparent 75%, #222 75%, #222); background-size: 20px 20px; background-position: 0 0, 10px 10px;">
                    <div id="art-canvas-container" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-gray-600 bg-white" style="width: 800px; height: 600px; transform-origin: top left;">
                        <!-- Kanwasy dodawane w JS -->
                    </div>
                    
                    <!-- Nawigacja Pływająca w Prawym Dolnym Rogu (Naprawione klikanie przez panel) -->
                    <div class="absolute bottom-4 right-4 g-panel border g-border rounded-lg shadow-xl flex items-center p-1 bg-black/60 backdrop-blur-md" onpointerdown="event.stopPropagation()" onmousedown="event.stopPropagation()">
                        <button class="g-btn text-xs px-2 py-1 rounded" onclick="artystaApp.setZoom(artystaApp.zoom - 0.2)">➖</button>
                        <span class="text-[10px] font-mono font-bold text-blue-400 w-12 text-center" id="art-zoom-val">100%</span>
                        <button class="g-btn text-xs px-2 py-1 rounded" onclick="artystaApp.setZoom(artystaApp.zoom + 0.2)">➕</button>
                        <div class="w-px h-4 bg-gray-500/50 mx-1"></div>
                        <button class="g-btn text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider" onclick="artystaApp.setZoom(1); artystaApp.panX=0; artystaApp.panY=0; artystaApp.updateView();" title="100% Zoom">1:1</button>
                        <button class="g-btn text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider ml-1" onclick="artystaApp.fitView();" title="Wyśrodkuj widok">⌖</button>
                    </div>
                </div>

                <!-- PRAWY PANEL (Kolory, Historia, Warstwy) -->
                <div class="w-[220px] sm:w-[260px] border-l g-border bg-black/30 flex flex-col shrink-0 overflow-hidden z-20 shadow-2xl relative">
                    
                    <!-- KOLORY (Przypięty Picker) -->
                    <div id="art-colors-container-wrap" class="flex flex-col border-b g-border shrink-0 transition-all duration-300">
                        <div class="p-2 bg-black/40 text-[10px] font-bold g-text-muted uppercase tracking-widest border-b g-border flex justify-between items-center shrink-0">
                            <div class="flex gap-2 items-center">
                                <button onclick="artystaApp.togglePanel('colors')" class="text-[10px] hover:text-white transition w-4 h-4 flex items-center justify-center rounded bg-white/5" id="art-colors-collapse-btn">▼</button>
                                <span>Kolory</span>
                            </div>
                        </div>
                        <div id="art-colors-list" class="p-3 flex justify-center items-center gap-4 bg-black/10 transition-all duration-300 overflow-hidden">
                            <div class="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/50 cursor-pointer shadow-md" title="Kolor Główny (Lewy Przycisk Myszy)">
                                <input type="color" id="art-color-primary" value="#000000" class="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" onchange="artystaApp.primaryColor=this.value">
                            </div>
                            <button class="g-btn w-8 h-8 flex items-center justify-center rounded-full text-xs shadow-sm hover:bg-white/10 font-bold" onclick="let p=artystaApp.primaryColor; let s=artystaApp.secondaryColor; document.getElementById('art-color-primary').value=s; document.getElementById('art-color-secondary').value=p; artystaApp.primaryColor=s; artystaApp.secondaryColor=p;" title="Zamień kolory">🔄</button>
                            <div class="relative w-10 h-10 rounded-full overflow-hidden border border-white/30 cursor-pointer shadow-sm" title="Kolor Tła (Prawy Przycisk Myszy)">
                                <input type="color" id="art-color-secondary" value="#ffffff" class="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" onchange="artystaApp.secondaryColor=this.value">
                            </div>
                        </div>
                    </div>

                    <!-- HISTORIA -->
                    <div id="art-history-container-wrap" class="flex flex-col h-1/4 min-h-[100px] border-b g-border shrink-0 transition-all duration-300">
                        <div class="p-2 bg-black/30 text-[10px] font-bold g-text-muted uppercase tracking-widest border-b g-border flex justify-between items-center shrink-0">
                            <div class="flex gap-2 items-center">
                                <button onclick="artystaApp.togglePanel('history')" class="text-[10px] hover:text-white transition w-4 h-4 flex items-center justify-center rounded bg-white/5" id="art-history-collapse-btn">▼</button>
                                <span>Historia</span>
                            </div>
                            <div class="flex gap-2">
                                <span class="text-[9px] text-red-400 cursor-pointer hover:underline" onclick="artystaApp.clearHistory()">Wyczyść</span>
                                <span class="text-[9px] text-blue-400 cursor-pointer hover:underline" onclick="artystaApp.undo()">Cofnij</span>
                            </div>
                        </div>
                        <div id="art-history-list" class="flex-grow overflow-y-auto custom-scrollbar p-1 flex flex-col gap-0.5 bg-black/10 transition-all duration-300"></div>
                    </div>

                    <!-- WARSTWY -->
                    <div id="art-layers-container-wrap" class="flex flex-col flex-grow overflow-hidden transition-all duration-300">
                        <div class="p-2 bg-black/30 text-[10px] font-bold g-text-muted uppercase tracking-widest border-b g-border flex justify-between items-center shrink-0">
                            <div class="flex gap-2 items-center">
                                <button onclick="artystaApp.togglePanel('layers')" class="text-[10px] hover:text-white transition w-4 h-4 flex items-center justify-center rounded bg-white/5" id="art-layers-collapse-btn">▼</button>
                                <span>Warstwy</span>
                            </div>
                            <div class="flex gap-1">
                                <button class="hover:text-white transition text-lg leading-none" onclick="artystaApp.addLayer('Nowa Warstwa')" title="Nowa Warstwa">➕</button>
                                <button class="hover:text-red-400 text-red-500 transition text-lg leading-none" onclick="artystaApp.deleteCurrentLayer()" title="Usuń Warstwę">🗑️</button>
                            </div>
                        </div>
                        
                        <div id="art-layers-list-container" class="flex flex-col flex-grow overflow-hidden transition-all duration-300">
                            <!-- Opcje wybranej warstwy -->
                            <div class="p-2 border-b g-border bg-black/20 flex flex-col gap-2 shrink-0">
                                <select id="art-layer-blend" class="w-full text-[10px] p-1 rounded g-bg g-text border g-border outline-none shadow-inner cursor-pointer" onchange="artystaApp.setLayerBlend(this.value)">
                                    <option value="source-over">Zwykłe (Normal)</option>
                                    <option value="multiply">Mnożenie (Multiply)</option>
                                    <option value="screen">Ekran (Screen)</option>
                                    <option value="overlay">Nakładka (Overlay)</option>
                                    <option value="darken">Ciemniej (Darken)</option>
                                    <option value="lighten">Jaśniej (Lighten)</option>
                                    <option value="color-dodge">Rozjaśnianie (Dodge)</option>
                                    <option value="color-burn">Przyciemnianie (Burn)</option>
                                </select>
                                <div class="flex items-center gap-2">
                                    <span class="text-[9px] font-bold g-text-muted uppercase">Krycie</span>
                                    <input type="range" id="art-layer-opacity" min="0" max="100" value="100" class="flex-grow h-1.5 g-range rounded appearance-none cursor-pointer" oninput="artystaApp.setLayerOpacity(this.value)">
                                    <span class="text-[9px] font-mono w-6 text-right" id="art-layer-op-val">100</span>
                                </div>
                            </div>

                            <!-- Lista Warstw -->
                            <div id="art-layers-list" class="flex-grow overflow-y-auto custom-scrollbar p-1 flex flex-col gap-1 bg-black/10"></div>
                        </div>
                    </div>
                </div>

                <!-- PRAWY PANEL AI (Wysuwany) -->
                <div id="art-ai-sidebar" class="w-[280px] sm:w-[320px] border-l g-border bg-black/20 hidden flex-col shrink-0 transition-all duration-300 z-40 relative shadow-2xl">
                    <div class="p-3 border-b g-border flex justify-between items-center bg-gradient-to-r from-blue-600/20 to-purple-600/20 shrink-0">
                        <span class="font-bold text-sm text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-md">✨ BigAI Tools</span>
                        <button onclick="artystaApp.toggleAIPanel()" class="g-icon-btn hover:text-red-400 text-lg leading-none">✖</button>
                    </div>
                    
                    <div class="p-3 grid grid-cols-2 gap-2 border-b g-border bg-black/30 shrink-0">
                        <button class="g-btn text-[10px] p-2 rounded shadow-sm border-purple-500/50 hover:bg-purple-600/20 flex flex-col items-center justify-center gap-1" onclick="artystaApp.askAI('Narysuj nowy obrazek na podstawie opisu', true)"><span class="text-xl">🪄</span> Generuj Obraz</button>
                        <button class="g-btn text-[10px] p-2 rounded shadow-sm border-blue-500/50 hover:bg-blue-600/20 flex flex-col items-center justify-center gap-1" onclick="artystaApp.askAI('Usuń tło z tego obrazka', true)"><span class="text-xl">✂️</span> Usuń Tło</button>
                        <button class="g-btn text-[10px] p-2 rounded shadow-sm border-emerald-500/50 hover:bg-emerald-600/20 flex flex-col items-center justify-center gap-1" onclick="artystaApp.askAI('Powiększ i wyostrz ten obrazek 2x', true)"><span class="text-xl">🔍</span> Upscale AI</button>
                        <button class="g-btn text-[10px] p-2 rounded shadow-sm border-yellow-500/50 hover:bg-yellow-600/20 flex flex-col items-center justify-center gap-1" onclick="artystaApp.askAI('Przekształć to w szkic', true)"><span class="text-xl">✏️</span> Szkic</button>
                    </div>

                    <div class="flex-grow p-3 overflow-y-auto custom-scrollbar text-sm flex flex-col gap-3" id="art-ai-chat" style="user-select: text; -webkit-user-select: text;">
                        <!-- Chat wstrzykiwany przez JS -->
                    </div>
                    <div class="p-2 border-t g-border bg-black/40 shrink-0">
                        <input type="text" id="art-ai-input" placeholder="Wpisz komendę dla AI..." class="w-full text-xs p-2 rounded-lg g-bg g-text border g-border outline-none focus:border-purple-500 transition shadow-inner" onkeydown="if(event.key==='Enter') { artystaApp.sendAI(this.value); this.value=''; }">
                    </div>
                </div>

            </div>
        `;
        appWindow.appendChild(proUI);

        artystaApp.setTool('brush');
        artystaApp.renderAIChat();
    },

    // ==================================================================
    // ZWIJANIE PANELI (COLLAPSE)
    // ==================================================================
    togglePanel: (panelId) => {
        const list = document.getElementById(`art-${panelId}-list`);
        const btn = document.getElementById(`art-${panelId}-collapse-btn`);
        const contWrap = document.getElementById(`art-${panelId}-container-wrap`);
        
        // Zastępstwo dla layers, ponieważ mają wewn. selektor i input range
        const actualList = panelId === 'layers' ? document.getElementById('art-layers-list-container') : list;

        if(actualList.classList.contains('hidden')) {
            actualList.classList.remove('hidden');
            btn.innerText = '▼';
            if (panelId === 'history' || panelId === 'layers') {
                contWrap.classList.add(panelId === 'history' ? 'h-1/4' : 'flex-grow');
            }
        } else {
            actualList.classList.add('hidden');
            btn.innerText = '▶';
            if (panelId === 'history' || panelId === 'layers') {
                contWrap.classList.remove('h-1/4', 'flex-grow');
            }
        }
    },

    // ==================================================================
    // ZAMYKANIE PLIKU (Z NOWYM MODALEM)
    // ==================================================================
    confirmCloseFile: () => {
        const modalId = 'art-close-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm';
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-sm w-full border g-border">
                <h2 class="text-xl font-bold g-text mb-4 border-b g-border pb-2 flex items-center gap-2"><span class="text-red-500 drop-shadow">⚠️</span> Zamknij plik</h2>
                <p class="text-sm g-text-muted mb-6 font-medium">Czy na pewno chcesz zamknąć ten plik? Niezapisane zmiany w systemie zostaną utracone.</p>
                <div class="flex justify-end gap-3 shrink-0">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-5 py-2.5 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border shadow-sm text-sm">Anuluj</button>
                    <button onclick="artystaApp.closeFile(); document.getElementById('${modalId}').remove()" class="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg shadow-red-600/30 transition font-bold border border-red-700 text-sm">Zamknij plik</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    closeFile: () => {
        document.querySelectorAll('.skryba-dropdown-menu').forEach(m => m.classList.add('hidden'));
        artystaApp.finishText();
        artystaApp.layers.forEach(l => l.canvas.remove());
        artystaApp.layers = [];
        artystaApp.history = []; artystaApp.historyStep = -1;
        artystaApp.applyCanvasSize(800, 600);
        artystaApp.addLayer('Tło', true);
        artystaApp.saveHistory('Pusty plik');
        artystaApp.currentFileId = null;
        artystaApp.isDirty = false;
        artystaApp.fitView();
        if(typeof apps !== 'undefined') apps.showToast('Zakończono', 'Zamknięto plik.', 'info');
    },

    // ==================================================================
    // AKTUALIZACJA KURSORA PĘDZLA (Custom Cursor - Naprawione Pozycjonowanie)
    // ==================================================================
    updateCursor: (e) => {
        const cursor = document.getElementById('art-cursor');
        const ws = document.getElementById('art-workspace-area');
        const win = document.getElementById('app-szkicownik');
        if (!cursor || !ws || !win) return;
        
        const rect = ws.getBoundingClientRect();
        
        // Ukrywamy kursor, jeśli wyszliśmy poza obszar roboczy płótna
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
            cursor.style.display = 'none';
            return;
        }

        const toolsWithBrush = ['brush', 'pencil', 'eraser', 'airbrush', 'marker', 'pen', 'calligraphy', 'blur', 'dodge', 'burn', 'line', 'rect', 'circle'];
        
        if (!toolsWithBrush.includes(artystaApp.activeTool) || artystaApp.isPanning || artystaApp.textActive) {
            cursor.style.display = 'none';
            return;
        }
        
        cursor.style.display = 'block';
        
        let pressure = (e.pointerType === 'pen' && e.pressure !== undefined) ? e.pressure : 1.0;
        let size = Math.max(1, artystaApp.brushSize * pressure) * artystaApp.zoom;
        
        // Używamy absolute position w oknie całego BigOSa
        cursor.style.width = `${size}px`;
        cursor.style.height = `${size}px`;
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
        
        // Zmiana kształtu kursora na podstawie narzędzia
        if (['pencil', 'marker', 'rect'].includes(artystaApp.activeTool)) {
            cursor.style.borderRadius = '0';
            cursor.style.transform = `translate(-50%, -50%)`;
        } else if (artystaApp.activeTool === 'calligraphy') {
            cursor.style.borderRadius = '50%';
            cursor.style.height = `${size/4}px`;
            cursor.style.transform = `translate(-50%, -50%) rotate(45deg)`;
        } else {
            cursor.style.borderRadius = '50%';
            cursor.style.transform = `translate(-50%, -50%)`;
        }
    },

    // ==================================================================
    // 2. PASEK WŁAŚCIWOŚCI NARZĘDZIA (Dynamiczny)
    // ==================================================================
    updatePropertiesBar: () => {
        const bar = document.getElementById('art-properties-bar');
        if(!bar) return;
        let html = '';

        if (['brush', 'pencil', 'eraser', 'line', 'airbrush', 'marker', 'pen', 'calligraphy', 'blur', 'dodge', 'burn'].includes(artystaApp.activeTool)) {
            html += `
                <div class="flex items-center gap-2 shrink-0">
                    <span class="text-[10px] font-bold g-text-muted uppercase">Rozmiar</span>
                    <input type="range" min="1" max="150" value="${artystaApp.brushSize}" class="w-24 h-1.5 g-range rounded appearance-none cursor-pointer" oninput="artystaApp.brushSize=parseInt(this.value); document.getElementById('art-prop-size').innerText=this.value+'px'">
                    <span id="art-prop-size" class="text-[10px] font-mono font-bold w-8">${artystaApp.brushSize}px</span>
                </div>
            `;
            if (!['pencil', 'pen', 'line'].includes(artystaApp.activeTool)) {
                html += `
                    <div class="w-px h-6 bg-gray-500/30 mx-2 shrink-0"></div>
                    <div class="flex items-center gap-2 shrink-0">
                        <span class="text-[10px] font-bold g-text-muted uppercase">Krycie/Siła</span>
                        <input type="range" min="1" max="100" value="${artystaApp.brushOpacity}" class="w-20 h-1.5 g-range rounded appearance-none cursor-pointer" oninput="artystaApp.brushOpacity=parseInt(this.value)">
                    </div>
                `;
            }
        }
        else if (['rect', 'circle'].includes(artystaApp.activeTool)) {
            html += `
                <div class="flex items-center gap-2 shrink-0">
                    <span class="text-[10px] font-bold g-text-muted uppercase">Grubość krawędzi</span>
                    <input type="range" min="0" max="50" value="${artystaApp.brushSize}" class="w-24 h-1.5 g-range rounded appearance-none cursor-pointer" oninput="artystaApp.brushSize=parseInt(this.value); document.getElementById('art-prop-size').innerText=this.value+'px'">
                    <span id="art-prop-size" class="text-[10px] font-mono font-bold w-8">${artystaApp.brushSize}px</span>
                </div>
                <div class="flex items-center gap-2 ml-4 shrink-0">
                    <label class="text-[10px] font-bold g-text flex items-center gap-1 cursor-pointer"><input type="checkbox" id="art-prop-fill" class="accent-blue-500"> Wypełnij środek (Kolor Tła)</label>
                </div>
            `;
        }
        else if (artystaApp.activeTool === 'text') {
            html += `
                <select id="art-txt-font" class="p-1 rounded g-bg g-text border g-border text-xs outline-none shadow-inner" onchange="if(artystaApp.textElement) artystaApp.updateTextPreview()">
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Comic Sans MS">Comic Sans</option>
                </select>
                <div class="flex items-center gap-1 shrink-0">
                    <span class="text-[10px] font-bold g-text-muted uppercase">Rozmiar</span>
                    <input type="number" id="art-txt-size" value="32" min="10" max="200" class="w-12 p-1 rounded g-bg g-text border g-border text-xs outline-none text-center" onchange="if(artystaApp.textElement) artystaApp.updateTextPreview()">
                </div>
                <div class="flex gap-1 shrink-0">
                    <button id="art-txt-b" class="w-6 h-6 rounded g-btn font-bold text-xs" onclick="this.classList.toggle('border-blue-500'); this.classList.toggle('text-blue-500'); if(artystaApp.textElement) artystaApp.updateTextPreview()">B</button>
                    <button id="art-txt-i" class="w-6 h-6 rounded g-btn italic text-xs" onclick="this.classList.toggle('border-blue-500'); this.classList.toggle('text-blue-500'); if(artystaApp.textElement) artystaApp.updateTextPreview()">I</button>
                    <button id="art-txt-u" class="w-6 h-6 rounded g-btn underline text-xs" onclick="this.classList.toggle('border-blue-500'); this.classList.toggle('text-blue-500'); if(artystaApp.textElement) artystaApp.updateTextPreview()">U</button>
                </div>
            `;
        }
        else if (artystaApp.activeTool === 'move') {
            html += `<span class="text-[10px] g-text-muted italic">Kliknij i przeciągnij na płótnie, aby przesunąć widok. Użyj Ctrl + Scroll do powiększania.</span>`;
        }
        else if (artystaApp.activeTool === 'picker') {
            html += `<span class="text-[10px] g-text-muted italic">Kliknij na obrazie, by pobrać kolor główny. Kliknij Prawym Przyciskiem by pobrać kolor tła.</span>`;
        }

        bar.innerHTML = html;
    },

    setTool: (tool) => {
        if (artystaApp.activeTool === 'text' && tool !== 'text') artystaApp.finishText();
        artystaApp.activeTool = tool;
        
        document.querySelectorAll('.art-tool-btn').forEach(b => {
            b.classList.remove('bg-blue-500', 'text-white', 'shadow-inner');
        });
        const btn = document.querySelector(`.art-tool-btn[data-tool="${tool}"]`);
        if (btn) btn.classList.add('bg-blue-500', 'text-white', 'shadow-inner');

        const ws = document.getElementById('art-workspace-area');
        if(ws) {
            if(tool === 'move') ws.style.cursor = 'grab';
            else if(tool === 'text') ws.style.cursor = 'text';
            else if(tool === 'picker') ws.style.cursor = 'crosshair';
            else ws.style.cursor = 'crosshair'; 
        }

        artystaApp.updatePropertiesBar();
    },

    // ==================================================================
    // 3. SILNIK PAN & ZOOM I ZARZĄDZANIE PŁÓTNEM
    // ==================================================================
    applyCanvasSize: (w, h) => {
        artystaApp.width = w; artystaApp.height = h;
        const cont = document.getElementById('art-canvas-container');
        if(cont) {
            cont.style.width = w + 'px';
            cont.style.height = h + 'px';
        }
        if(artystaApp.previewCanvas) {
            artystaApp.previewCanvas.width = w;
            artystaApp.previewCanvas.height = h;
            artystaApp.previewCtx = artystaApp.previewCanvas.getContext('2d');
        }
        artystaApp.updateView();
    },

    setZoom: (val) => {
        artystaApp.zoom = Math.max(0.1, Math.min(val, 32)); // 10% do 3200%
        document.getElementById('art-zoom-val').innerText = Math.round(artystaApp.zoom * 100) + '%';
        artystaApp.updateView();
    },

    fitView: () => {
        const ws = document.getElementById('art-workspace-area');
        if(!ws) return;
        const padding = 40;
        const availableW = ws.clientWidth - padding;
        const availableH = ws.clientHeight - padding;
        
        const scaleX = availableW / artystaApp.width;
        const scaleY = availableH / artystaApp.height;
        let scale = Math.min(scaleX, scaleY, 1); // Nie powiększamy pikselozy powyżej 100% z automatu
        if(scale <= 0) scale = 0.1;
        
        artystaApp.setZoom(scale);
        artystaApp.panX = 0;
        artystaApp.panY = 0;
        artystaApp.updateView();
    },

    updateView: () => {
        const cont = document.getElementById('art-canvas-container');
        if(!cont) return;
        cont.style.transform = `translate(calc(-50% + ${artystaApp.panX}px), calc(-50% + ${artystaApp.panY}px)) scale(${artystaApp.zoom})`;
    },

    getCanvasCoords: (e) => {
        const cont = document.getElementById('art-canvas-container');
        const rect = cont.getBoundingClientRect();
        let cX = e.clientX, cY = e.clientY;
        if(e.touches && e.touches.length > 0) { cX = e.touches[0].clientX; cY = e.touches[0].clientY; }
        return {
            x: (cX - rect.left) / artystaApp.zoom,
            y: (cY - rect.top) / artystaApp.zoom
        };
    },

    // ==================================================================
    // 4. ZARZĄDZANIE WARSTWAMI (Obsługa Tekstu)
    // ==================================================================
    addLayer: (name = "Nowa Warstwa", isBg = false, layerType = 'normal') => {
        artystaApp.finishText();
        
        const canvas = document.createElement('canvas');
        canvas.width = artystaApp.width; canvas.height = artystaApp.height;
        canvas.className = 'absolute top-0 left-0 pointer-events-none';
        
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (isBg) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        document.getElementById('art-canvas-container').insertBefore(canvas, artystaApp.previewCanvas);

        const id = 'layer_' + Date.now() + Math.random();
        const layer = {
            id: id, name: name, canvas: canvas, ctx: ctx,
            visible: true, locked: false, opacity: 100, blendMode: 'source-over',
            type: layerType, textData: null
        };

        artystaApp.layers.unshift(layer); 
        artystaApp.currentLayerId = id;
        
        artystaApp.updateLayersStyle();
        artystaApp.renderLayersList();
        
        if(!isBg && layerType !== 'text') artystaApp.saveHistory(`Dodano warstwę: ${name}`);
    },

    deleteCurrentLayer: () => {
        artystaApp.finishText();
        if (artystaApp.layers.length <= 1) return typeof apps !== 'undefined' ? apps.showToast('Błąd', 'Musisz mieć chociaż jedną warstwę!', 'error') : null;
        
        const idx = artystaApp.layers.findIndex(l => l.id === artystaApp.currentLayerId);
        if (idx === -1) return;

        artystaApp.layers[idx].canvas.remove();
        const name = artystaApp.layers[idx].name;
        artystaApp.layers.splice(idx, 1);
        
        artystaApp.currentLayerId = artystaApp.layers[Math.max(0, idx - 1)].id;
        
        artystaApp.updateLayersStyle();
        artystaApp.renderLayersList();
        artystaApp.saveHistory(`Usunięto warstwę: ${name}`);
    },

    clearLayer: () => {
        const l = artystaApp.getCurrentLayer();
        if(!l || l.locked) return;
        l.ctx.clearRect(0,0, l.canvas.width, l.canvas.height);
        artystaApp.saveHistory(`Wyczyszczono: ${l.name}`);
    },

    getCurrentLayer: () => {
        return artystaApp.layers.find(l => l.id === artystaApp.currentLayerId);
    },

    updateLayersStyle: () => {
        artystaApp.layers.forEach((l, i) => {
            l.canvas.style.zIndex = artystaApp.layers.length - i;
            l.canvas.style.display = l.visible ? 'block' : 'none';
            l.canvas.style.opacity = l.opacity / 100;
            l.canvas.style.mixBlendMode = l.blendMode === 'source-over' ? 'normal' : l.blendMode;
        });
        if(artystaApp.previewCanvas) artystaApp.previewCanvas.style.zIndex = artystaApp.layers.length + 10;
    },

    renderLayersList: () => {
        const list = document.getElementById('art-layers-list');
        if(!list) return;
        list.innerHTML = '';

        artystaApp.layers.forEach((l, i) => {
            const isSel = l.id === artystaApp.currentLayerId;
            const el = document.createElement('div');
            el.className = `flex flex-col p-2 border-b g-border cursor-pointer transition ${isSel ? 'bg-blue-600/30 border-l-4 border-blue-500' : 'hover:bg-white/5 border-transparent border-l-4'}`;
            el.onclick = () => { artystaApp.currentLayerId = l.id; artystaApp.renderLayersList(); };
            
            const layerTypeIcon = l.type === 'text' ? '<span class="text-[10px] text-blue-400 font-bold mr-1 bg-blue-500/20 px-1 rounded">T</span>' : '';

            el.innerHTML = `
                <div class="flex items-center gap-2">
                    <button class="hover:text-white text-lg leading-none" onclick="event.stopPropagation(); artystaApp.layers[${i}].visible = !artystaApp.layers[${i}].visible; artystaApp.updateLayersStyle(); artystaApp.renderLayersList();">${l.visible ? '👁️' : '🕶️'}</button>
                    <div class="flex-grow text-xs font-bold g-text truncate" ondblclick="event.stopPropagation(); let n = prompt('Nazwa warstwy:', '${l.name}'); if(n){ artystaApp.layers[${i}].name = n; artystaApp.renderLayersList(); }">
                        ${layerTypeIcon}${typeof desktop !== 'undefined' ? desktop.escapeHTML(l.name) : l.name}
                    </div>
                    <button class="hover:text-red-400 text-lg leading-none ${l.locked ? 'text-red-500' : 'text-gray-500'}" onclick="event.stopPropagation(); artystaApp.layers[${i}].locked = !artystaApp.layers[${i}].locked; artystaApp.renderLayersList();" title="${l.locked ? 'Odblokuj rysowanie' : 'Zablokuj rysowanie'}">${l.locked ? '🔒' : '🔓'}</button>
                </div>
            `;
            list.appendChild(el);
            
            if(isSel) {
                document.getElementById('art-layer-blend').value = l.blendMode;
                document.getElementById('art-layer-opacity').value = l.opacity;
                document.getElementById('art-layer-op-val').innerText = l.opacity;
            }
        });
    },

    setLayerOpacity: (val) => {
        const l = artystaApp.getCurrentLayer();
        if(l) { l.opacity = parseInt(val); document.getElementById('art-layer-op-val').innerText = val; artystaApp.updateLayersStyle(); }
    },

    setLayerBlend: (val) => {
        const l = artystaApp.getCurrentLayer();
        if(l) { l.blendMode = val; artystaApp.updateLayersStyle(); artystaApp.saveHistory('Zmieniono tryb mieszania'); }
    },

    // ==================================================================
    // 5. SYSTEM HISTORII  (Zapisywanie Tekstu jako Base64)
    // ==================================================================
    saveHistory: (actionName) => {
        if (artystaApp.historyStep < artystaApp.history.length - 1) {
            artystaApp.history = artystaApp.history.slice(0, artystaApp.historyStep + 1);
        }

        const snapshot = {
            name: actionName,
            w: artystaApp.width, h: artystaApp.height,
            layers: artystaApp.layers.map(l => ({
                id: l.id, name: l.name, visible: l.visible, locked: l.locked,
                opacity: l.opacity, blendMode: l.blendMode, type: l.type, 
                textData: l.textData ? JSON.parse(JSON.stringify(l.textData)) : null,
                data: l.canvas.toDataURL('image/png') 
            }))
        };

        artystaApp.history.push(snapshot);
        if (artystaApp.history.length > 50) artystaApp.history.shift(); 
        else artystaApp.historyStep++;

        artystaApp.renderHistoryList();
    },

    undo: () => {
        artystaApp.finishText();
        if (artystaApp.historyStep > 0) {
            artystaApp.historyStep--;
            artystaApp.restoreSnapshot(artystaApp.history[artystaApp.historyStep]);
            artystaApp.renderHistoryList();
        }
    },

    redo: () => {
        artystaApp.finishText();
        if (artystaApp.historyStep < artystaApp.history.length - 1) {
            artystaApp.historyStep++;
            artystaApp.restoreSnapshot(artystaApp.history[artystaApp.historyStep]);
            artystaApp.renderHistoryList();
        }
    },
    
    clearHistory: () => {
        if(confirm('Na pewno chcesz wyczyścić historię? Nie będzie można cofnąć wprowadzonych zmian w tym projekcie.')) {
            if (artystaApp.historyStep >= 0) {
                const lastState = artystaApp.history[artystaApp.historyStep];
                artystaApp.history = [lastState];
                artystaApp.historyStep = 0;
            } else {
                artystaApp.history = [];
                artystaApp.historyStep = -1;
            }
            artystaApp.renderHistoryList();
            if(typeof apps !== 'undefined') apps.showToast('Historia', 'Wyczyszczono pamięć historii operacji.', 'info');
        }
    },

    restoreSnapshot: (snap) => {
        artystaApp.layers.forEach(l => l.canvas.remove());
        artystaApp.layers = [];
        artystaApp.applyCanvasSize(snap.w, snap.h);
        
        const workspace = document.getElementById('art-canvas-container');
        
        let loaded = 0;
        snap.layers.forEach((sl, i) => {
            const canvas = document.createElement('canvas');
            canvas.width = snap.w; canvas.height = snap.h;
            canvas.className = 'absolute top-0 left-0 pointer-events-none';
            workspace.insertBefore(canvas, artystaApp.previewCanvas);
            
            const layer = { 
                id: sl.id, name: sl.name, canvas: canvas, ctx: canvas.getContext('2d', { willReadFrequently: true }), 
                visible: sl.visible, locked: sl.locked, opacity: sl.opacity, blendMode: sl.blendMode,
                type: sl.type || 'normal', textData: sl.textData || null 
            };
            artystaApp.layers.push(layer); 
            
            const img = new Image();
            img.onload = () => {
                layer.ctx.drawImage(img, 0, 0);
                loaded++;
                if(loaded === snap.layers.length) {
                    artystaApp.currentLayerId = artystaApp.layers[0].id;
                    artystaApp.updateLayersStyle();
                    artystaApp.renderLayersList();
                }
            };
            img.src = sl.data;
        });
    },

    renderHistoryList: () => {
        const list = document.getElementById('art-history-list');
        if(!list) return;
        list.innerHTML = '';
        artystaApp.history.forEach((h, i) => {
            const isAct = i === artystaApp.historyStep;
            const isFut = i > artystaApp.historyStep;
            list.innerHTML += `<div class="shrink-0 min-h-[24px] text-[10px] px-2 py-1 rounded cursor-pointer truncate transition ${isAct ? 'bg-blue-500 text-white font-bold shadow-md' : (isFut ? 'text-gray-500 hover:bg-white/10 opacity-50' : 'g-text hover:bg-white/10')}" onclick="artystaApp.historyStep=${i}; artystaApp.restoreSnapshot(artystaApp.history[${i}]); artystaApp.renderHistoryList();">↩ ${typeof desktop !== 'undefined' ? desktop.escapeHTML(h.name) : h.name}</div>`;
        });
        const active = list.querySelector('.bg-blue-500');
        if(active && !document.getElementById('art-history-list-container')?.classList.contains('hidden')) active.scrollIntoView({block: "nearest"});
    },

    // ==================================================================
    // 6. RYSOWANIE I NOWE NARZĘDZIA (BLOKADA DLA TEKSTU, NAPRAWIONY BURN)
    // ==================================================================
    pointerDown: (e) => {
        const coords = artystaApp.getCanvasCoords(e);

        if (artystaApp.activeTool === 'move' || artystaApp.tempPanMode) {
            artystaApp.isPanning = true;
            artystaApp.startMouseX = e.clientX; artystaApp.startMouseY = e.clientY;
            artystaApp.startPanX = artystaApp.panX; artystaApp.startPanY = artystaApp.panY;
            return;
        }

        const l = artystaApp.getCurrentLayer();
        if (!l || l.locked || !l.visible) {
            if(typeof apps !== 'undefined') apps.showToast('Zablokowane', 'Wybierz widoczną, odblokowaną warstwę!', 'warning');
            return;
        }

        // Warstwa tekstowa z pełną zgodnością Photoshop-like
        if (artystaApp.activeTool === 'text') {
            if (l.type === 'text') {
                artystaApp.spawnTextNode(0, 0, l);
            } else {
                artystaApp.addLayer('Nowy Tekst', false, 'text');
                artystaApp.spawnTextNode(coords.x, coords.y);
            }
            return;
        }

        if (l.type === 'text' && !['move', 'picker'].includes(artystaApp.activeTool)) {
            if(typeof apps !== 'undefined') apps.showToast('Warstwa Tekstowa', 'Zmień na zwykłą warstwę by rysować (warstwa tekstowa tylko do edycji)', 'warning');
            return;
        }

        if (artystaApp.activeTool === 'picker') {
            artystaApp.pickColor(Math.floor(coords.x), Math.floor(coords.y), e.buttons === 2);
            return;
        }

        if (artystaApp.activeTool === 'fill') {
            artystaApp.floodFill(Math.floor(coords.x), Math.floor(coords.y), e.buttons === 2 ? artystaApp.secondaryColor : artystaApp.primaryColor);
            return;
        }

        artystaApp.isDrawing = true;
        artystaApp.lastX = coords.x; artystaApp.lastY = coords.y;
        artystaApp.startDrawX = coords.x; artystaApp.startDrawY = coords.y;

        const pressure = (e.pointerType === 'pen' && e.pressure !== undefined) ? e.pressure : 1.0;
        const size = Math.max(1, artystaApp.brushSize * pressure);
        const color = e.buttons === 2 ? artystaApp.secondaryColor : artystaApp.primaryColor;

        l.ctx.beginPath();
        l.ctx.globalAlpha = 1.0;
        l.ctx.filter = 'none';

        if (artystaApp.activeTool === 'eraser') {
            l.ctx.globalCompositeOperation = 'destination-out';
            l.ctx.fillStyle = '#000000';
        } else if (artystaApp.activeTool === 'dodge') {
            l.ctx.globalCompositeOperation = 'color-dodge';
            l.ctx.fillStyle = `rgba(255, 255, 255, ${artystaApp.brushOpacity / 1000})`; // Bardziej naturalny buildup
        } else if (artystaApp.activeTool === 'burn') {
            l.ctx.globalCompositeOperation = 'multiply';
            l.ctx.fillStyle = `rgba(0, 0, 0, ${artystaApp.brushOpacity / 1000})`; // Naturalne przyciemnianie
        } else if (artystaApp.activeTool === 'blur') {
            l.ctx.globalCompositeOperation = 'source-over';
        } else {
            l.ctx.globalCompositeOperation = 'source-over';
            l.ctx.globalAlpha = artystaApp.brushOpacity / 100;
            l.ctx.fillStyle = color;
        }

        if (['brush', 'pencil', 'eraser', 'marker', 'pen', 'calligraphy', 'dodge', 'burn'].includes(artystaApp.activeTool)) {
            if (artystaApp.activeTool === 'pencil' || artystaApp.activeTool === 'marker') {
                l.ctx.fillRect(Math.floor(coords.x - size/2), Math.floor(coords.y - size/2), size, size);
            } else if (artystaApp.activeTool === 'calligraphy') {
                l.ctx.ellipse(coords.x, coords.y, size, size/4, Math.PI/4, 0, Math.PI*2);
                l.ctx.fill();
            } else {
                if (artystaApp.brushOpacity < 100 && ['brush', 'dodge', 'burn', 'eraser'].includes(artystaApp.activeTool)) {
                    const rad = size/2;
                    const grad = l.ctx.createRadialGradient(coords.x, coords.y, 0, coords.x, coords.y, rad);
                    grad.addColorStop(0, l.ctx.fillStyle);
                    grad.addColorStop(1, 'transparent');
                    l.ctx.fillStyle = grad;
                    l.ctx.fillRect(coords.x - rad, coords.y - rad, size, size);
                } else {
                    l.ctx.arc(coords.x, coords.y, size/2, 0, Math.PI*2);
                    l.ctx.fill();
                }
            }
        }
    },

    pointerMove: (e) => {
        if (artystaApp.isPanning) {
            artystaApp.panX = artystaApp.startPanX + (e.clientX - artystaApp.startMouseX);
            artystaApp.panY = artystaApp.startPanY + (e.clientY - artystaApp.startMouseY);
            artystaApp.updateView();
            return;
        }

        if (!artystaApp.isDrawing) return;
        
        const coords = artystaApp.getCanvasCoords(e);
        const l = artystaApp.getCurrentLayer();
        const pressure = (e.pointerType === 'pen' && e.pressure !== undefined) ? e.pressure : 1.0;
        const size = Math.max(1, artystaApp.brushSize * pressure);
        const color = e.buttons === 2 ? artystaApp.secondaryColor : artystaApp.primaryColor;

        l.ctx.globalAlpha = 1.0;
        l.ctx.filter = 'none';

        if (['brush', 'pencil', 'eraser', 'marker', 'pen', 'calligraphy', 'dodge', 'burn', 'blur', 'airbrush'].includes(artystaApp.activeTool)) {
            
            l.ctx.beginPath();
            
            if (artystaApp.activeTool === 'eraser') {
                l.ctx.globalCompositeOperation = 'destination-out';
                l.ctx.strokeStyle = '#000000';
            } else if (artystaApp.activeTool === 'dodge') {
                l.ctx.globalCompositeOperation = 'color-dodge';
                l.ctx.strokeStyle = `rgba(255, 255, 255, ${artystaApp.brushOpacity / 1000})`;
            } else if (artystaApp.activeTool === 'burn') {
                l.ctx.globalCompositeOperation = 'multiply';
                l.ctx.strokeStyle = `rgba(0, 0, 0, ${artystaApp.brushOpacity / 1000})`;
            } else if (artystaApp.activeTool === 'blur') {
                l.ctx.globalCompositeOperation = 'source-over';
            } else {
                l.ctx.globalCompositeOperation = 'source-over';
                l.ctx.globalAlpha = artystaApp.brushOpacity / 100;
                l.ctx.strokeStyle = color;
            }

            l.ctx.lineWidth = size;

            if (artystaApp.activeTool === 'pencil') {
                l.ctx.lineCap = 'square'; l.ctx.lineJoin = 'miter';
                l.ctx.moveTo(Math.floor(artystaApp.lastX)+0.5, Math.floor(artystaApp.lastY)+0.5);
                l.ctx.lineTo(Math.floor(coords.x)+0.5, Math.floor(coords.y)+0.5);
                l.ctx.stroke();
            } 
            else if (artystaApp.activeTool === 'marker') {
                l.ctx.lineCap = 'square'; l.ctx.lineJoin = 'bevel';
                l.ctx.moveTo(artystaApp.lastX, artystaApp.lastY);
                l.ctx.lineTo(coords.x, coords.y);
                l.ctx.stroke();
            }
            else if (artystaApp.activeTool === 'calligraphy') {
                l.ctx.fillStyle = l.ctx.strokeStyle;
                l.ctx.lineWidth = 1;
                const dist = Math.hypot(coords.x - artystaApp.lastX, coords.y - artystaApp.lastY);
                const steps = Math.max(1, Math.floor(dist));
                for(let i=0; i<=steps; i++) {
                    let ix = artystaApp.lastX + (coords.x - artystaApp.lastX) * (i/steps);
                    let iy = artystaApp.lastY + (coords.y - artystaApp.lastY) * (i/steps);
                    l.ctx.beginPath();
                    l.ctx.ellipse(ix, iy, size, size/4, Math.PI/4, 0, Math.PI*2);
                    l.ctx.fill();
                }
            }
            else if (artystaApp.activeTool === 'airbrush') {
                l.ctx.fillStyle = color;
                for (let i = 0; i < size/2; i++) {
                    let rx = coords.x + (Math.random() - 0.5) * size;
                    let ry = coords.y + (Math.random() - 0.5) * size;
                    l.ctx.globalAlpha = Math.random() * (artystaApp.brushOpacity / 100);
                    l.ctx.fillRect(rx, ry, 1, 1);
                }
            }
            else if (artystaApp.activeTool === 'blur') {
                l.ctx.save();
                l.ctx.beginPath();
                l.ctx.arc(coords.x, coords.y, size, 0, Math.PI*2);
                l.ctx.clip();
                l.ctx.filter = `blur(${Math.max(1, size/10)}px)`;
                l.ctx.drawImage(l.canvas, 0, 0);
                l.ctx.restore();
            }
            else {
                l.ctx.lineCap = 'round'; l.ctx.lineJoin = 'round';
                
                if (artystaApp.brushOpacity < 100 && ['brush', 'dodge', 'burn', 'eraser'].includes(artystaApp.activeTool)) {
                    const dist = Math.hypot(coords.x - artystaApp.lastX, coords.y - artystaApp.lastY);
                    const steps = Math.max(1, Math.floor(dist / (size * 0.1)));
                    const rad = size/2;
                    for(let i=0; i<=steps; i++) {
                        let ix = artystaApp.lastX + (coords.x - artystaApp.lastX) * (i/steps);
                        let iy = artystaApp.lastY + (coords.y - artystaApp.lastY) * (i/steps);
                        const grad = l.ctx.createRadialGradient(ix, iy, 0, ix, iy, rad);
                        grad.addColorStop(0, l.ctx.strokeStyle);
                        grad.addColorStop(1, 'transparent');
                        l.ctx.fillStyle = grad;
                        l.ctx.fillRect(ix - rad, iy - rad, size, size);
                    }
                } else {
                    l.ctx.moveTo(artystaApp.lastX, artystaApp.lastY);
                    l.ctx.lineTo(coords.x, coords.y);
                    l.ctx.stroke();
                }
            }
            
            artystaApp.lastX = coords.x; artystaApp.lastY = coords.y;
        }
        else if (['line', 'rect', 'circle'].includes(artystaApp.activeTool)) {
            const pCtx = artystaApp.previewCtx;
            pCtx.clearRect(0,0, artystaApp.width, artystaApp.height);
            pCtx.strokeStyle = color;
            pCtx.lineWidth = size;
            pCtx.lineCap = 'round'; pCtx.lineJoin = 'round';
            
            const doFillEl = document.getElementById('art-prop-fill');
            const doFill = doFillEl ? doFillEl.checked : false;
            pCtx.fillStyle = e.buttons === 2 ? artystaApp.primaryColor : artystaApp.secondaryColor;

            if (artystaApp.activeTool === 'line') {
                pCtx.beginPath();
                pCtx.moveTo(artystaApp.startDrawX, artystaApp.startDrawY);
                pCtx.lineTo(coords.x, coords.y);
                pCtx.stroke();
            } else if (artystaApp.activeTool === 'rect') {
                let w = coords.x - artystaApp.startDrawX;
                let h = coords.y - artystaApp.startDrawY;
                if(e.shiftKey) { let min = Math.min(Math.abs(w), Math.abs(h)); w = Math.sign(w)*min; h = Math.sign(h)*min; }
                pCtx.beginPath();
                pCtx.rect(artystaApp.startDrawX, artystaApp.startDrawY, w, h);
                if(doFill) pCtx.fill();
                pCtx.stroke();
            } else if (artystaApp.activeTool === 'circle') {
                let rX = Math.abs(coords.x - artystaApp.startDrawX);
                let rY = Math.abs(coords.y - artystaApp.startDrawY);
                if(e.shiftKey) { let min = Math.min(rX, rY); rX = min; rY = min; }
                pCtx.beginPath();
                pCtx.ellipse(artystaApp.startDrawX, artystaApp.startDrawY, rX, rY, 0, 0, Math.PI*2);
                if(doFill) pCtx.fill();
                pCtx.stroke();
            }
        }
    },

    pointerUp: (e) => {
        if (artystaApp.isPanning) { artystaApp.isPanning = false; return; }
        if (!artystaApp.isDrawing) return;
        artystaApp.isDrawing = false;
        
        const l = artystaApp.getCurrentLayer();
        if (l) l.ctx.globalCompositeOperation = 'source-over';

        if (['line', 'rect', 'circle'].includes(artystaApp.activeTool)) {
            l.ctx.drawImage(artystaApp.previewCanvas, 0, 0);
            artystaApp.previewCtx.clearRect(0,0, artystaApp.width, artystaApp.height);
        }
        
        const toolNames = { 'brush':'Pędzel', 'pencil':'Ołówek', 'eraser':'Gumka', 'line':'Linia', 'rect':'Prostokąt', 'circle':'Koło', 'airbrush': 'Aerograf', 'marker':'Marker', 'pen':'Długopis', 'calligraphy':'Pióro', 'blur':'Rozmycie', 'dodge':'Rozjaśnianie', 'burn':'Przyciemnianie' };
        artystaApp.saveHistory(toolNames[artystaApp.activeTool] || 'Rysowanie');
    },

    // ==================================================================
    // NARZĘDZIE TEKSTOWE (Pełnoprawne Warstwy)
    // ==================================================================
    spawnTextNode: (x, y, existingLayer = null) => {
        if(artystaApp.textActive) artystaApp.finishText();
        
        artystaApp.textActive = true;
        
        const ws = document.getElementById('art-canvas-container');
        const input = document.createElement('div');
        input.id = 'art-text-input';
        input.contentEditable = "true";
        input.className = 'absolute min-w-[50px] outline-none border border-dashed border-gray-600 bg-transparent p-0 m-0 z-[1000] whitespace-pre-wrap';
        
        if (existingLayer && existingLayer.textData) {
            const td = existingLayer.textData;
            input.style.left = `${td.x}px`;
            input.style.top = `${td.y}px`;
            input.innerText = td.text;
            
            const fSel = document.getElementById('art-txt-font');
            if (fSel) fSel.value = td.font;
            
            const sSel = document.getElementById('art-txt-size');
            if (sSel) sSel.value = td.size;
            
            artystaApp.primaryColor = td.color;
            const cPrim = document.getElementById('art-color-primary');
            if (cPrim) cPrim.value = td.color;
            
            const bBtn = document.getElementById('art-txt-b');
            if (bBtn) { if(td.isB) bBtn.classList.add('border-blue-500', 'text-blue-500'); else bBtn.classList.remove('border-blue-500', 'text-blue-500'); }
            
            const iBtn = document.getElementById('art-txt-i');
            if (iBtn) { if(td.isI) iBtn.classList.add('border-blue-500', 'text-blue-500'); else iBtn.classList.remove('border-blue-500', 'text-blue-500'); }
            
            const uBtn = document.getElementById('art-txt-u');
            if (uBtn) { if(td.isU) uBtn.classList.add('border-blue-500', 'text-blue-500'); else uBtn.classList.remove('border-blue-500', 'text-blue-500'); }
            
            existingLayer.ctx.clearRect(0,0, artystaApp.width, artystaApp.height);
        } else {
            input.style.left = `${x}px`;
            input.style.top = `${y}px`;
        }

        input.style.transform = `scale(${1/artystaApp.zoom})`;
        input.style.transformOrigin = 'top left';

        ws.appendChild(input);
        artystaApp.textElement = input;
        
        artystaApp.updateTextPreview();
        setTimeout(() => {
            input.focus();
            if (input.innerText.length > 0) {
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(input);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }, 10);
    },

    updateTextPreview: () => {
        if (!artystaApp.textElement) return;
        const font = document.getElementById('art-txt-font') ? document.getElementById('art-txt-font').value : 'Arial';
        const size = document.getElementById('art-txt-size') ? parseInt(document.getElementById('art-txt-size').value) : 32;
        const isB = document.getElementById('art-txt-b') && document.getElementById('art-txt-b').classList.contains('text-blue-500');
        const isI = document.getElementById('art-txt-i') && document.getElementById('art-txt-i').classList.contains('text-blue-500');
        const isU = document.getElementById('art-txt-u') && document.getElementById('art-txt-u').classList.contains('text-blue-500');
        
        const el = artystaApp.textElement;
        el.style.fontFamily = `"${font}", sans-serif`;
        el.style.fontSize = `${size}px`;
        el.style.fontWeight = isB ? 'bold' : 'normal';
        el.style.fontStyle = isI ? 'italic' : 'normal';
        el.style.textDecoration = isU ? 'underline' : 'none';
        el.style.color = artystaApp.primaryColor;
        el.style.lineHeight = '1.2';
    },

    finishText: () => {
        if (!artystaApp.textActive || !artystaApp.textElement) return;
        const text = artystaApp.textElement.innerText;
        const l = artystaApp.getCurrentLayer();
        
        if (text.trim() === '') {
            if (l && l.type === 'text') {
                artystaApp.textElement.remove();
                artystaApp.textElement = null;
                artystaApp.textActive = false;
                artystaApp.deleteCurrentLayer();
                return;
            }
        } else if (l && !l.locked) {
            const font = document.getElementById('art-txt-font').value;
            const size = parseInt(document.getElementById('art-txt-size').value);
            const isB = document.getElementById('art-txt-b').classList.contains('text-blue-500');
            const isI = document.getElementById('art-txt-i').classList.contains('text-blue-500');
            const isU = document.getElementById('art-txt-u').classList.contains('text-blue-500');
            const color = artystaApp.primaryColor;
            
            const startX = parseFloat(artystaApp.textElement.style.left);
            const startY = parseFloat(artystaApp.textElement.style.top);

            l.textData = { text, x: startX, y: startY, font, size, isB, isI, isU, color };
            
            let shortText = text.replace(/\n/g, ' ').trim();
            l.name = shortText.substring(0, 15) + (shortText.length > 15 ? '...' : '');
            
            l.ctx.clearRect(0,0, artystaApp.width, artystaApp.height);
            l.ctx.font = `${isI ? 'italic ' : ''}${isB ? 'bold ' : ''}${size}px "${font}"`;
            l.ctx.fillStyle = color;
            l.ctx.textBaseline = 'top';
            
            const lines = text.split('\n');
            let curY = startY;
            
            lines.forEach(line => {
                l.ctx.fillText(line, startX, curY);
                if (isU) {
                    const m = l.ctx.measureText(line);
                    l.ctx.beginPath();
                    l.ctx.moveTo(startX, curY + size * 1.1);
                    l.ctx.lineTo(startX + m.width, curY + size * 1.1);
                    l.ctx.strokeStyle = color;
                    l.ctx.lineWidth = Math.max(1, size / 15);
                    l.ctx.stroke();
                }
                curY += size * 1.2;
            });
            artystaApp.renderLayersList();
            artystaApp.saveHistory('Wprowadzono Tekst');
        }
        
        if(artystaApp.textElement) artystaApp.textElement.remove();
        artystaApp.textElement = null;
        artystaApp.textActive = false;
    },

    // ==================================================================
    // KROPLOMIERZ I WYPEŁNIENIE
    // ==================================================================
    pickColor: (x, y, isSecondary) => {
        const temp = document.createElement('canvas');
        temp.width = artystaApp.width; temp.height = artystaApp.height;
        const ctx = temp.getContext('2d');
        
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,temp.width,temp.height);
        for(let i = artystaApp.layers.length-1; i>=0; i--) {
            let l = artystaApp.layers[i];
            if(l.visible) {
                ctx.globalAlpha = l.opacity / 100;
                ctx.globalCompositeOperation = l.blendMode === 'source-over' ? 'source-over' : l.blendMode;
                ctx.drawImage(l.canvas, 0, 0);
            }
        }
        
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const hex = "#" + ("000000" + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6);
        
        if (isSecondary) {
            artystaApp.secondaryColor = hex;
            document.getElementById('art-color-secondary').value = hex;
        } else {
            artystaApp.primaryColor = hex;
            document.getElementById('art-color-primary').value = hex;
            if(artystaApp.textElement) artystaApp.updateTextPreview();
        }
        
        if(typeof apps !== 'undefined') apps.showToast('Kroplomierz', `Pobrano kolor: ${hex}`, 'info');
    },

    floodFill: (startX, startY, hexColor) => {
        const l = artystaApp.getCurrentLayer();
        if(!l || l.locked || !l.visible) return;
        
        const w = artystaApp.width; const h = artystaApp.height;
        if(startX < 0 || startX >= w || startY < 0 || startY >= h) return;
        
        const imgData = l.ctx.getImageData(0,0,w,h);
        const data = imgData.data;
        const startIdx = (startY * w + startX) * 4;
        const tR = data[startIdx], tG = data[startIdx+1], tB = data[startIdx+2], tA = data[startIdx+3];
        
        const fR = parseInt(hexColor.slice(1,3),16), fG = parseInt(hexColor.slice(3,5),16), fB = parseInt(hexColor.slice(5,7),16), fA = 255;
        
        if (tR === fR && tG === fG && tB === fB && tA === fA) return;
        
        const stack = [[startX, startY]];
        while(stack.length > 0) {
            let [x, y] = stack.pop(); let idx = (y * w + x) * 4;
            while(y >= 0 && data[idx]===tR && data[idx+1]===tG && data[idx+2]===tB && data[idx+3]===tA) { y--; idx -= w*4; }
            y++; idx += w*4; let reachL = false; let reachR = false;
            
            while(y < h && data[idx]===tR && data[idx+1]===tG && data[idx+2]===tB && data[idx+3]===tA) {
                data[idx] = fR; data[idx+1] = fG; data[idx+2] = fB; data[idx+3] = fA;
                if(x > 0) { if(data[idx-4]===tR && data[idx-3]===tG && data[idx-2]===tB && data[idx-1]===tA) { if(!reachL) { stack.push([x-1,y]); reachL=true; } } else if(reachL) reachL=false; }
                if(x < w-1) { if(data[idx+4]===tR && data[idx+5]===tG && data[idx+6]===tB && data[idx+7]===tA) { if(!reachR) { stack.push([x+1,y]); reachR=true; } } else if(reachR) reachR=false; }
                y++; idx += w*4;
            }
        }
        l.ctx.putImageData(imgData, 0, 0);
        artystaApp.saveHistory('Wypełnienie Kolorem');
    },

    // ==================================================================
    // AI PANEL
    // ==================================================================
    toggleAIPanel: () => {
        const p = document.getElementById('art-ai-sidebar');
        if (p.classList.contains('hidden')) { p.classList.remove('hidden'); p.classList.add('flex'); }
        else { p.classList.add('hidden'); p.classList.remove('flex'); }
    },

    renderAIChat: () => {
        const chatBox = document.getElementById('art-ai-chat');
        if (!chatBox) return;

        chatBox.innerHTML = '';
        
        if (artystaApp.aiMessages.length === 0) {
            chatBox.innerHTML = `
                <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-gray-800 dark:text-gray-200 shadow-sm mb-2 text-xs">
                    Witaj! Jestem BigAI w module graficznym. Opisz obrazek, który mam dla Ciebie wygenerować lub wpisz polecenie, np. "Usuń tło".
                </div>
            `;
        }

        artystaApp.aiMessages.forEach((msg, idx) => {
            const isUser = msg.role === 'user';
            const alignClass = isUser ? 'self-end' : 'self-start';
            const bgClass = isUser ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white' : 'g-panel bg-black/20 border g-border g-text';
            const radiusClass = isUser ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm';

            const el = document.createElement('div');
            el.className = `flex flex-col max-w-[90%] sm:max-w-[85%] ${alignClass} mb-3 shadow-md ${bgClass} ${radiusClass} p-3 text-xs leading-relaxed`;
            el.innerHTML = `
                <div class="flex items-center justify-between mb-2 border-b border-white/10 pb-1 w-full opacity-70">
                    <span class="text-[9px] font-bold uppercase tracking-wider">${isUser ? '👤 Ty' : '✨ BigAI'}</span>
                </div>
                <div class="w-full break-words space-y-1 font-sans">
                    ${typeof desktop !== 'undefined' ? desktop.escapeHTML(msg.text) : msg.text}
                </div>
            `;
            chatBox.appendChild(el);
        });

        if (artystaApp.isAIThinking) {
            chatBox.innerHTML += `<div class="self-start text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1 mb-2 animate-pulse">Generowanie / Łączenie z API...</div>`;
        }

        chatBox.scrollTop = chatBox.scrollHeight;
    },

    sendAI: async (msgText) => {
        if(!msgText.trim()) return;

        artystaApp.aiMessages.push({ role: 'user', text: msgText });
        artystaApp.isAIThinking = true;
        artystaApp.renderAIChat();

        setTimeout(() => {
            artystaApp.isAIThinking = false;
            let response = "Przepraszam, ale funkcje generatywnej edycji obrazu wymagają podłączenia klucza API dla DALL-E lub Stable Diffusion w głównych ustawieniach systemu. Zostanie to dodane w przyszłych aktualizacjach BigOS!";
            
            if (msgText.toLowerCase().includes('usuń tło')) {
                response = "Narzędzie Usuwania Tła (AI Masking) wymaga podłączenia wtyczki Remove.bg lub serwera lokalnego z odpowiednim modelem sieci neuronowej.";
            } else if (msgText.toLowerCase().includes('upscale')) {
                response = "Bezstratne powiększanie (Upscaling) pożera dużo pamięci. Zostanie udostępnione wkrótce z dedykowanym modelem ESRGAN.";
            }

            artystaApp.aiMessages.push({ role: 'assistant', text: response });
            artystaApp.renderAIChat();
            if(typeof apps !== 'undefined') apps.showToast('BigAI', 'Brak połączenia z silnikiem graficznym', 'error');
        }, 1500);
    },

    askAI: (prompt) => {
        const input = document.getElementById('art-ai-input');
        if (input) {
            input.value = prompt;
            artystaApp.sendAI(prompt);
            input.value = '';
        }
    },

    // ==================================================================
    // FILTRY I TRANSFORMACJE (DZIAŁAJĄ NA AKTUALNEJ WARSTWIE)
    // ==================================================================
    transformImage: (type) => {
        const l = artystaApp.getCurrentLayer();
        if(!l || l.locked) return;
        if(l.type === 'text') {
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Nie można transformować warstw tekstowych.', 'warning');
            return;
        }
        
        const temp = document.createElement('canvas');
        temp.width = l.canvas.width; temp.height = l.canvas.height;
        const tCtx = temp.getContext('2d');
        
        tCtx.translate(temp.width/2, temp.height/2);
        if(type === 'flipX') tCtx.scale(-1, 1);
        if(type === 'flipY') tCtx.scale(1, -1);
        tCtx.drawImage(l.canvas, -temp.width/2, -temp.height/2);
        
        l.ctx.clearRect(0,0,l.canvas.width, l.canvas.height);
        l.ctx.drawImage(temp, 0, 0);
        
        artystaApp.saveHistory(`Odbicie ${type}`);
    },

    applyFilter: (filterName, value = null) => {
        const l = artystaApp.getCurrentLayer();
        if(!l || l.locked || !l.visible) return typeof apps !== 'undefined' ? apps.showToast('Błąd', 'Warstwa zablokowana lub niewidoczna', 'error') : null;
        if (l.type === 'text') {
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Nie można filtrować warstw tekstowych. Utwórz nową warstwę.', 'warning');
            return;
        }
        
        const temp = document.createElement('canvas');
        temp.width = l.canvas.width; temp.height = l.canvas.height;
        const tCtx = temp.getContext('2d');
        
        if (filterName === 'grayscale') tCtx.filter = 'grayscale(100%)';
        else if (filterName === 'invert') tCtx.filter = 'invert(100%)';
        else if (filterName === 'sepia') tCtx.filter = 'sepia(100%) contrast(120%)';
        else if (filterName === 'blur') tCtx.filter = `blur(${value}px)`;
        else if (filterName === 'noise' || filterName === 'pixelate') {
            const imgData = l.ctx.getImageData(0,0, l.canvas.width, l.canvas.height);
            const data = imgData.data;
            if (filterName === 'noise') {
                let v = parseInt(value);
                for(let i=0; i<data.length; i+=4) {
                    if(data[i+3] > 0) {
                        let rand = (0.5 - Math.random()) * v;
                        data[i] = Math.min(255, Math.max(0, data[i]+rand));
                        data[i+1] = Math.min(255, Math.max(0, data[i+1]+rand));
                        data[i+2] = Math.min(255, Math.max(0, data[i+2]+rand));
                    }
                }
            } else if (filterName === 'pixelate') {
                let v = parseInt(value);
                for(let y=0; y<l.canvas.height; y+=v) {
                    for(let x=0; x<l.canvas.width; x+=v) {
                        let idx = (y * l.canvas.width + x) * 4;
                        let r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
                        for(let dy=0; dy<v && y+dy < l.canvas.height; dy++) {
                            for(let dx=0; dx<v && x+dx < l.canvas.width; dx++) {
                                let i2 = ((y+dy) * l.canvas.width + (x+dx)) * 4;
                                data[i2]=r; data[i2+1]=g; data[i2+2]=b; data[i2+3]=a;
                            }
                        }
                    }
                }
            }
            l.ctx.putImageData(imgData, 0, 0);
            artystaApp.saveHistory(`Filtr: ${filterName}`);
            return;
        }

        tCtx.drawImage(l.canvas, 0, 0);
        l.ctx.clearRect(0,0,l.canvas.width, l.canvas.height);
        l.ctx.drawImage(temp, 0, 0);
        
        artystaApp.saveHistory(`Filtr: ${filterName}`);
    },

    showFilterModal: (filterName) => {
        let title = "", desc = "", def = "", max = "", unit = "";
        if (filterName === 'blur') { title = "Rozmycie Gaussa"; desc = "Promień rozmycia"; def = "5"; max = "50"; unit = "px"; }
        if (filterName === 'noise') { title = "Dodaj Szum"; desc = "Intensywność"; def = "40"; max = "255"; unit = ""; }
        if (filterName === 'pixelate') { title = "Mozaika (Pixel Art)"; desc = "Rozmiar piksela"; def = "10"; max = "50"; unit = "px"; }
        
        if(typeof ui !== 'undefined') {
            ui.showPrompt(`${title} - ${desc} (max ${max}):`, def, "Zastosuj", (val) => {
                let v = parseInt(val);
                if(!isNaN(v) && v > 0) artystaApp.applyFilter(filterName, v);
            });
        }
    },

    // ==================================================================
    // MODALE PROJEKTÓW I ZAPISU
    // ==================================================================
    showNewProjectModal: () => {
        const modalId = 'art-new-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm';
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-sm w-full border g-border">
                <h2 class="text-xl font-bold g-text mb-4 border-b g-border pb-2 flex items-center gap-2"><span>📄</span> Nowy Projekt</h2>
                <div class="flex flex-col gap-3 mb-6">
                    <div>
                        <label class="block text-[10px] g-text-muted font-bold uppercase tracking-wider mb-1">Szerokość</label>
                        <div class="flex gap-2">
                            <input type="number" id="art-new-w" value="800" class="flex-grow p-2 g-bg g-text border g-border rounded outline-none font-bold" oninput="artystaApp.calcNewDim('w')">
                            <select id="art-new-unit-w" class="w-16 p-2 g-bg g-text border g-border rounded outline-none" onchange="artystaApp.calcNewDim('w', true)">
                                <option value="px">px</option><option value="cm">cm</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-[10px] g-text-muted font-bold uppercase tracking-wider mb-1">Wysokość</label>
                        <div class="flex gap-2">
                            <input type="number" id="art-new-h" value="600" class="flex-grow p-2 g-bg g-text border g-border rounded outline-none font-bold" oninput="artystaApp.calcNewDim('h')">
                            <select id="art-new-unit-h" class="w-16 p-2 g-bg g-text border g-border rounded outline-none" onchange="artystaApp.calcNewDim('h', true)">
                                <option value="px">px</option><option value="cm">cm</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="flex justify-end gap-2 shrink-0">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border shadow-sm">Anuluj</button>
                    <button onclick="artystaApp.newProject()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-600/30 transition font-bold border border-blue-700">Utwórz</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    calcNewDim: (axis, unitChanged = false) => {
        const inp = document.getElementById(`art-new-${axis}`);
        const unit = document.getElementById(`art-new-unit-${axis}`).value;
        const pxPerCm = 37.79527559;
        
        let val = parseFloat(inp.value);
        if(isNaN(val)) return;

        if (unitChanged) {
            if (unit === 'cm') inp.value = (val / pxPerCm).toFixed(2);
            else inp.value = Math.round(val * pxPerCm);
        }
    },

    newProject: () => {
        const wInp = document.getElementById('art-new-w');
        const hInp = document.getElementById('art-new-h');
        const wUnit = document.getElementById('art-new-unit-w').value;
        const hUnit = document.getElementById('art-new-unit-h').value;
        
        let w = parseFloat(wInp.value);
        let h = parseFloat(hInp.value);
        
        if(wUnit === 'cm') w = Math.round(w * 37.79527559);
        if(hUnit === 'cm') h = Math.round(h * 37.79527559);

        if(isNaN(w) || isNaN(h) || w < 10 || h < 10) return;

        artystaApp.layers.forEach(l => l.canvas.remove());
        artystaApp.layers = [];
        artystaApp.history = []; artystaApp.historyStep = -1;
        
        artystaApp.applyCanvasSize(w, h);
        artystaApp.addLayer('Tło', true);
        artystaApp.addLayer('Warstwa 1');
        artystaApp.saveHistory('Nowy Projekt');
        
        artystaApp.panX = 0; artystaApp.panY = 0; artystaApp.zoom = 1;
        document.getElementById('art-zoom-val').innerText = '100%';
        artystaApp.updateView();
        document.getElementById('art-new-modal').remove();
    },

    showResizeModal: () => {
        if(typeof ui !== 'undefined') {
            ui.showPrompt(`Obecny rozmiar: ${artystaApp.width} x ${artystaApp.height} px\nPodaj NOWĄ SZEROKOŚĆ (wysokość dopasuje się sama):`, artystaApp.width, "Zmień Rozmiar", (val) => {
                let newW = parseInt(val);
                if(isNaN(newW) || newW < 10) return;
                
                let ratio = artystaApp.height / artystaApp.width;
                let newH = Math.round(newW * ratio);
                
                const snapshots = artystaApp.layers.map(l => {
                    const c = document.createElement('canvas'); c.width = l.canvas.width; c.height = l.canvas.height;
                    c.getContext('2d').drawImage(l.canvas, 0, 0); return c;
                });
                
                artystaApp.applyCanvasSize(newW, newH);
                
                artystaApp.layers.forEach((l, i) => {
                    l.canvas.width = newW; l.canvas.height = newH;
                    if (i === artystaApp.layers.length - 1) {
                        l.ctx.fillStyle = '#ffffff'; l.ctx.fillRect(0,0,newW,newH);
                    }
                    l.ctx.drawImage(snapshots[i], 0, 0, newW, newH);
                });
                
                artystaApp.saveHistory('Zmieniono Rozmiar Płótna');
            });
        }
    },

    showSaveBigOSModal: () => {
        const modalId = 'art-save-bigos-modal';
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
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-sm w-full border g-border flex flex-col">
                <h2 class="text-xl font-bold g-text mb-4 border-b g-border pb-2 flex items-center gap-2"><span>💾</span> Zapisz w BigOS</h2>
                
                <div class="mb-4">
                    <label class="block text-[10px] uppercase font-bold g-text-muted mb-1 tracking-wider">Nazwa pliku</label>
                    <input type="text" id="art-save-bigos-name" value="Moje_Dzielo" class="w-full p-2.5 g-bg g-text border g-border rounded outline-none focus:border-blue-500 font-bold shadow-inner text-sm">
                </div>
                
                <div class="mb-4">
                    <label class="block text-[10px] uppercase font-bold g-text-muted mb-1 tracking-wider">Format pliku</label>
                    <select id="art-save-bigos-format" class="w-full p-2.5 g-bg g-text border g-border rounded outline-none cursor-pointer focus:border-blue-500 text-sm shadow-inner font-semibold">
                        <option value="bigpaint">Projekt Edytowalny (.bigpaint z warstwami)</option>
                        <option value="png">PNG (.png) - Bezstratnie z przezroczystością</option>
                        <option value="jpg">JPEG (.jpg) - Optymalny rozmiar</option>
                        <option value="webp">WebP (.webp) - Nowoczesny format do sieci</option>
                        <option value="bmp">BMP (.bmp) - Mapa Bitowa</option>
                        <option value="gif">GIF (.gif) - Obraz Statyczny</option>
                        <option value="svg">SVG (.svg) - Nakładka wektorowa</option>
                        <option value="ico">ICO (.ico) - Ikona</option>
                    </select>
                </div>
                
                <div class="mb-6">
                    <label class="block text-[10px] uppercase font-bold g-text-muted mb-1 tracking-wider">Lokalizacja</label>
                    <select id="art-save-bigos-folder" class="w-full p-2.5 g-bg g-text border g-border rounded outline-none cursor-pointer focus:border-blue-500 text-sm shadow-inner font-semibold">
                        ${folderOptions}
                    </select>
                </div>

                <div class="flex justify-end gap-2 shrink-0">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-5 py-2.5 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border shadow-sm text-sm">Anuluj</button>
                    <button onclick="artystaApp.executeSaveBigOS()" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-600/30 transition font-bold border border-blue-700 text-sm">Zapisz</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    executeSaveBigOS: () => {
        const nameInput = document.getElementById('art-save-bigos-name').value.trim();
        const format = document.getElementById('art-save-bigos-format').value;
        const folderId = document.getElementById('art-save-bigos-folder').value;
        if(!nameInput) return;

        let finalName = nameInput.replace(/\.[^/.]+$/, "") + '.' + format;
        let fileType = format === 'bigpaint' ? 'file' : 'image';
        let fileIcon = format === 'bigpaint' ? '📁' : '🖼️';
        let fileContent = '';

        if (format === 'bigpaint') {
            const projectData = {
                width: artystaApp.width, height: artystaApp.height,
                layers: artystaApp.layers.map(l => ({ 
                    name: l.name, visible: l.visible, locked: l.locked, opacity: l.opacity, 
                    blendMode: l.blendMode, type: l.type, textData: l.textData, 
                    data: l.canvas.toDataURL('image/png') 
                }))
            };
            fileContent = JSON.stringify(projectData);
        } else {
            const { dataUrl } = artystaApp.generateFlatImage(format);
            fileContent = dataUrl;
        }

        if (typeof fileSystem !== 'undefined') {
            let existing = fileSystem.find(f => f.name === finalName && f.parentId === folderId);
            if (existing) existing.content = fileContent;
            else fileSystem.push({ id: 'file_' + Date.now(), type: fileType, name: finalName, icon: fileIcon, content: fileContent, parentId: folderId, x: 40, y: 40 });
            
            if(typeof fsManager !== 'undefined') fsManager.save(); 
            if(typeof desktop !== 'undefined') desktop.render(); 
            const aW = document.getElementById('app-aktowka');
            if(aW && aW.classList.contains('active') && typeof fsManager !== 'undefined') fsManager.renderExplorerContent(fsManager.currentFolder);
            if(typeof apps !== 'undefined') apps.showToast('Artysta', `Zapisano ${finalName} w systemie!`, 'success'); 
        }

        document.getElementById('art-save-bigos-modal').remove();
    },

    showExportModal: () => {
        document.querySelectorAll('.skryba-dropdown-menu').forEach(m => m.classList.add('hidden'));
        const modalId = 'art-export-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
        
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-sm w-full border g-border">
                <h2 class="text-xl font-bold g-text mb-4 border-b g-border pb-2 flex items-center gap-2"><span>📥</span> Eksport na dysk PC</h2>
                
                <div class="mb-4">
                    <label class="block text-[10px] uppercase font-bold g-text-muted mb-1 tracking-wider">Nazwa pliku</label>
                    <input type="text" id="art-export-name" value="Moje_Dzielo" class="w-full p-2.5 g-bg g-text border g-border rounded outline-none focus:border-emerald-500 font-bold shadow-inner text-sm">
                </div>

                <div class="flex flex-col gap-2 mb-6">
                    <button class="w-full text-left px-3 py-2.5 g-bg g-text hover:bg-white/10 rounded-lg transition border g-border text-sm font-bold flex gap-3 items-center shadow-sm" onclick="artystaApp.exportFile('bigpaint')"><span class="text-lg">📁</span> Projekt edytowalny (.bigpaint)</button>
                    <button class="w-full text-left px-3 py-2.5 g-bg g-text hover:bg-white/10 rounded-lg transition border g-border text-sm font-bold flex gap-3 items-center shadow-sm" onclick="artystaApp.exportFile('png')"><span class="text-lg">🖼️</span> Plik PNG (.png)</button>
                    <button class="w-full text-left px-3 py-2.5 g-bg g-text hover:bg-white/10 rounded-lg transition border g-border text-sm font-bold flex gap-3 items-center shadow-sm" onclick="artystaApp.exportFile('jpg')"><span class="text-lg">📸</span> Plik JPG (.jpg)</button>
                    <button class="w-full text-left px-3 py-2.5 g-bg g-text hover:bg-white/10 rounded-lg transition border g-border text-sm font-bold flex gap-3 items-center shadow-sm" onclick="artystaApp.exportFile('webp')"><span class="text-lg">🌐</span> Plik WebP (.webp)</button>
                    <button class="w-full text-left px-3 py-2.5 g-bg g-text hover:bg-white/10 rounded-lg transition border g-border text-sm font-bold flex gap-3 items-center shadow-sm" onclick="artystaApp.exportFile('svg')"><span class="text-lg">📐</span> Plik SVG (Nakładka)</button>
                </div>
                <div class="flex justify-end"><button onclick="document.getElementById('${modalId}').remove()" class="px-5 py-2.5 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border shadow-sm text-sm">Anuluj</button></div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    generateFlatImage: (format) => {
        const comp = document.createElement('canvas');
        comp.width = artystaApp.width; comp.height = artystaApp.height;
        const ctx = comp.getContext('2d');
        
        let mime = 'image/png';
        if (format === 'jpg') { mime = 'image/jpeg'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,comp.width,comp.height); }
        else if (format === 'webp') mime = 'image/webp';
        else if (format === 'bmp') mime = 'image/bmp';
        
        for (let i = artystaApp.layers.length - 1; i >= 0; i--) {
            let l = artystaApp.layers[i];
            if (l.visible) {
                ctx.globalCompositeOperation = l.blendMode === 'source-over' ? 'source-over' : l.blendMode;
                ctx.globalAlpha = l.opacity / 100;
                ctx.drawImage(l.canvas, 0, 0);
            }
        }

        if (format === 'svg') {
            const dataUrlPng = comp.toDataURL('image/png', 1.0);
            const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${artystaApp.width}" height="${artystaApp.height}"><image href="${dataUrlPng}" width="${artystaApp.width}" height="${artystaApp.height}" /></svg>`;
            const b64 = btoa(unescape(encodeURIComponent(svgContent)));
            return { dataUrl: `data:image/svg+xml;base64,${b64}`, mime: 'image/svg+xml', ext: '.svg' };
        }

        return { dataUrl: comp.toDataURL(mime, 1.0), mime: mime, ext: '.' + format };
    },

    exportFile: (format) => {
        const nameInput = document.getElementById('art-export-name').value.trim();
        if(!nameInput) return;

        let dataUrl, ext;

        if (format === 'bigpaint') {
            const projectData = {
                width: artystaApp.width, height: artystaApp.height,
                layers: artystaApp.layers.map(l => ({ 
                    name: l.name, visible: l.visible, locked: l.locked, opacity: l.opacity, 
                    blendMode: l.blendMode, type: l.type, textData: l.textData, 
                    data: l.canvas.toDataURL('image/png') 
                }))
            };
            const jsonStr = JSON.stringify(projectData);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            dataUrl = URL.createObjectURL(blob);
            ext = '.bigpaint';
        } else {
            const flat = artystaApp.generateFlatImage(format);
            dataUrl = flat.dataUrl;
            ext = flat.ext;
        }

        const finalName = nameInput.replace(/\.[^/.]+$/, "") + ext;
        const a = document.createElement('a');
        a.href = dataUrl; a.download = finalName; a.click();
        
        document.getElementById('art-export-modal').remove();
        if(typeof apps !== 'undefined') apps.showToast('Sukces', `Wyeksportowano ${finalName} na dysk PC!`, 'success');
    },

    showOpenBigOSModal: () => {
        if(typeof fileSystem === 'undefined') return;
        
        let listHTML = '';
        const files = fileSystem.filter(f => f.parentId !== 'hasiok' && (f.type === 'image' || (f.type === 'file' && f.name.endsWith('.bigpaint'))));
        
        if (files.length === 0) listHTML = '<div class="text-center g-text-muted py-4 text-xs">Brak projektów i obrazów.</div>';
        else {
            files.forEach(f => {
                const isProject = f.name.endsWith('.bigpaint');
                let thumbHtml = isProject ? '<span class="text-2xl drop-shadow-md">📁</span>' : `<img src="${f.content}" class="w-8 h-8 object-cover rounded shadow-sm">`;
                listHTML += `
                    <button class="w-full text-left px-3 py-2 g-bg g-text hover:bg-white/10 rounded transition border g-border mb-2 font-medium flex items-center gap-3 shadow-sm" onclick="document.getElementById('art-open-modal').remove(); artystaApp.loadFromBigOS('${f.id}')">
                        <div class="w-8 h-8 shrink-0 flex items-center justify-center">${thumbHtml}</div>
                        <div class="truncate">${typeof desktop !== 'undefined' ? desktop.escapeHTML(f.name) : f.name}</div>
                    </button>
                `;
            });
        }

        const modal = document.createElement('div');
        modal.id = 'art-open-modal';
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm';
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-sm w-full border g-border">
                <h2 class="text-xl font-bold g-text mb-4 border-b g-border pb-2">📂 Otwórz z BigOS</h2>
                <div class="max-h-64 overflow-y-auto mb-4 pr-1 custom-scrollbar">${listHTML}</div>
                <div class="flex justify-end"><button onclick="document.getElementById('art-open-modal').remove()" class="px-4 py-2 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border">Zamknij</button></div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    openFromPC: (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();

        if (file.name.endsWith('.bigpaint')) {
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    artystaApp.loadProjectData(data);
                } catch(err) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Plik projektu jest uszkodzony.', 'error'); }
            };
            reader.readAsText(file);
        } else {
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    artystaApp.layers.forEach(l => l.canvas.remove());
                    artystaApp.layers = [];
                    artystaApp.history = []; artystaApp.historyStep = -1;
                    
                    artystaApp.applyCanvasSize(img.naturalWidth, img.naturalHeight);
                    artystaApp.addLayer(file.name, false, 'normal');
                    
                    const l = artystaApp.getCurrentLayer();
                    l.ctx.drawImage(img, 0, 0);
                    
                    artystaApp.saveHistory('Zaimportowano Obraz');
                    artystaApp.fitView();
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    },

    loadFromBigOS: (id) => {
        const item = fileSystem.find(i => i.id === id);
        if(!item) return;

        if (item.name.endsWith('.bigpaint')) {
            try {
                const data = JSON.parse(item.content);
                artystaApp.loadProjectData(data);
            } catch(e) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Projekt uszkodzony', 'error'); }
        } else {
            const img = new Image();
            img.onload = () => {
                artystaApp.layers.forEach(l => l.canvas.remove());
                artystaApp.layers = [];
                artystaApp.history = []; artystaApp.historyStep = -1;
                
                artystaApp.applyCanvasSize(img.naturalWidth, img.naturalHeight);
                artystaApp.addLayer(item.name, false, 'normal');
                
                const l = artystaApp.getCurrentLayer();
                l.ctx.drawImage(img, 0, 0);
                
                artystaApp.saveHistory('Zaimportowano Obraz');
                artystaApp.fitView();
            };
            img.src = item.content;
        }
    },

    loadProjectData: (data) => {
        artystaApp.layers.forEach(l => l.canvas.remove());
        artystaApp.layers = [];
        artystaApp.history = []; artystaApp.historyStep = -1;
        
        artystaApp.applyCanvasSize(data.width, data.height);
        
        const workspace = document.getElementById('art-canvas-container');
        let loaded = 0;

        for (let i = data.layers.length - 1; i >= 0; i--) {
            const lData = data.layers[i];
            const canvas = document.createElement('canvas');
            canvas.width = data.width; canvas.height = data.height;
            canvas.className = 'absolute top-0 left-0 pointer-events-none';
            workspace.insertBefore(canvas, artystaApp.previewCanvas);
            
            const layer = { 
                id: 'l_'+Date.now()+i, name: lData.name, canvas: canvas, 
                ctx: canvas.getContext('2d', { willReadFrequently: true }), 
                visible: lData.visible, locked: lData.locked, opacity: lData.opacity, blendMode: lData.blendMode,
                type: lData.type || 'normal', textData: lData.textData || null 
            };
            artystaApp.layers.unshift(layer);
            
            const img = new Image();
            img.onload = () => {
                layer.ctx.drawImage(img, 0, 0);
                loaded++;
                if(loaded === data.layers.length) {
                    artystaApp.currentLayerId = artystaApp.layers[0].id;
                    artystaApp.updateLayersStyle();
                    artystaApp.renderLayersList();
                    artystaApp.saveHistory('Wczytano Projekt');
                    artystaApp.fitView();
                    if(typeof apps !== 'undefined') apps.showToast('Sukces', 'Wczytano projekt .bigpaint', 'success');
                }
            };
            img.src = lData.data;
        }
    }
};

setTimeout(artystaApp.init, 500);