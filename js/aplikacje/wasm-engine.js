// ======================================================================
// PLIK: js/aplikacje/wasm-engine.js (Silnik WebAssembly)
// ======================================================================

window.wasmEngineApp = {
    open: (item) => {
        // Usuwamy całkowicie poprzednie okno, jeśli istniało (czyszczenie pamięci RAM!)
        let existingWin = document.getElementById('app-wasm');
        if (existingWin) {
            existingWin.remove();
        }

        // 1. Przygotowanie interfejsu okna silnika (WASM Engine)
        const wasmWin = document.createElement('div');
        wasmWin.id = 'app-wasm';
        wasmWin.className = 'window bg-gray-900 border border-gray-700 shadow-2xl flex flex-col';
        wasmWin.style.width = '840px';
        wasmWin.style.height = '840px';
        
        // Wymuszenie wyciągania okna na wierzch (focus) po kliknięciu myszką w grę
        wasmWin.addEventListener('mousedown', function() { 
            if(typeof winManager !== 'undefined') winManager.bringToFront(this); 
        });
        
        // Okno z dodanym wsparciem na wrzucanie plików (Drag & Drop)
        wasmWin.innerHTML = `
            <div class="title-bar bg-gradient-to-r from-red-800 to-red-950 text-white px-3 py-2 flex justify-between items-center cursor-move" onmousedown="winManager.startDrag(event, 'app-wasm')">
                <div class="flex items-center gap-2 font-semibold">
                    <span id="wasm-icon">⚙️</span> 
                    <span id="wasm-title">DOOM</span>
                    <span class="text-xs text-red-300 ml-2 italic font-normal" id="wasm-hint"></span>
                </div>
                <div class="flex gap-2">
                    <button onclick="winManager.minimize('wasm')" class="hover:bg-white/20 px-2 rounded transition">_</button>
                    <button onclick="winManager.maximize('app-wasm')" class="hover:bg-white/20 px-2 rounded transition">□</button>
                    <button onclick="window.wasmEngineApp.stop()" class="hover:bg-red-500 hover:text-white px-2 rounded transition z-50">✕</button>
                </div>
            </div>
            <div class="flex-grow bg-black flex flex-col items-center justify-center relative overflow-hidden transition-colors" id="wasm-drop-zone">
                <canvas id="wasm-canvas" class="bg-black hidden" style="image-rendering: pixelated; width: 100%; height: 100%; object-fit: contain;" tabindex="0"></canvas>
                
                <!-- Ekran wyboru/wrzucania pliku -->
                <div id="wasm-welcome" class="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900 p-6 text-center">
                    <div class="text-6xl mb-4 pointer-events-none">👾</div>
                    <h2 class="text-2xl font-bold mb-2 pointer-events-none">Gra DOOM w BigOS</h2>
                    <p class="text-gray-400 mb-6 max-w-sm pointer-events-none">Załaduj plik <b>.wasm</b> bezpośrednio do pamięci RAM komputera!</p>
                    
                    <input type="file" id="wasm-file-input" accept=".wasm" class="hidden">
                    <button onclick="document.getElementById('wasm-file-input').click()" class="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-bold shadow-lg transition cursor-pointer">Wybierz plik z dysku</button>
                    
                    <p class="text-gray-500 mt-4 text-sm pointer-events-none">lub przeciągnij i upuść plik tutaj</p>
                </div>

                <div id="wasm-loading" class="absolute inset-0 flex items-center justify-center text-white font-mono bg-black/90 hidden z-40">Inicjalizacja modułu...</div>
            </div>
        `;
        
        document.body.appendChild(wasmWin);

        const fileInput = document.getElementById('wasm-file-input');
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if(!file) return;
            const buffer = await file.arrayBuffer();
            window.wasmEngineApp.startBuffer(buffer, file.name);
        };

        const dropZone = document.getElementById('wasm-drop-zone');
        dropZone.ondragover = (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('bg-gray-800'); };
        dropZone.ondragleave = (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('bg-gray-800'); };
        dropZone.ondrop = async (e) => {
            e.preventDefault(); e.stopPropagation();
            dropZone.classList.remove('bg-gray-800');
            const file = e.dataTransfer.files[0];
            if(!file || !file.name.endsWith('.wasm')) {
                if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Upuść prawidłowy plik .wasm', 'error');
                return;
            }
            const buffer = await file.arrayBuffer();
            window.wasmEngineApp.startBuffer(buffer, file.name);
        };
        
        if(typeof winManager !== 'undefined') {
            winManager.open('wasm');
        }

        if (item && item.content) {
            document.getElementById('wasm-welcome').classList.add('hidden');
            try {
                const cleanB64 = item.content.replace(/\s+/g, '');
                const binaryString = atob(cleanB64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                window.wasmEngineApp.startBuffer(bytes.buffer, item.name);
            } catch(e) {
                if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Nie można zdekodować wirtualnego pliku', 'error');
            }
        }
    },

    startBuffer: async (buffer, fileName) => {
        try {
            if(typeof apps !== 'undefined') apps.showToast('WebAssembly', `Inicjalizacja pamięci: ${fileName}...`, 'info');
            
            document.getElementById('wasm-welcome').classList.add('hidden');
            const canvas = document.getElementById('wasm-canvas');
            canvas.classList.remove('hidden');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            const loadingUI = document.getElementById('wasm-loading');
            if(loadingUI) {
                loadingUI.innerHTML = 'Kompilacja modułu...';
                loadingUI.classList.remove('hidden');
            }

            let doomExports = null;
            let scratchSpaceImageData = null;

            const importObject = {
                loading: {
                    onGameInit: (width, height) => { 
                        console.log(`DOOM Initialized! Resolution: ${width}x${height}`); 
                        if(loadingUI) loadingUI.classList.add('hidden'); 
                        canvas.width = width;
                        canvas.height = height;
                        scratchSpaceImageData = ctx.createImageData(width, height);
                    },
                    wadSizes: () => 0, 
                    readWads: () => 0
                },
                ui: {
                    drawFrame: (indexOfFrameBuffer) => {
                        if (!doomExports || !doomExports.memory || !scratchSpaceImageData) return;
                        
                        let screenPtr = indexOfFrameBuffer;
                        if (!screenPtr || typeof screenPtr !== 'number') {
                            screenPtr = (doomExports.screenBuffer?.value) || 
                                        (doomExports.get_screen_buffer ? doomExports.get_screen_buffer() : null) ||
                                        (doomExports.screen?.value) || 
                                        (doomExports.DG_ScreenBuffer?.value);
                        }

                        if (screenPtr) {
                            try {
                                let doomFrameBuffer = new Uint8Array(doomExports.memory.buffer, screenPtr, canvas.width * canvas.height * 4);
                                for (let i = 0; i < (scratchSpaceImageData.data.length / 4); i++) {
                                    scratchSpaceImageData.data[4*i+0] = doomFrameBuffer[4*i+2];  // Red
                                    scratchSpaceImageData.data[4*i+1] = doomFrameBuffer[4*i+1];  // Green
                                    scratchSpaceImageData.data[4*i+2] = doomFrameBuffer[4*i+0];  // Blue
                                    scratchSpaceImageData.data[4*i+3] = 255;                     // Alpha
                                }
                                ctx.putImageData(scratchSpaceImageData, 0, 0);
                            } catch(e) { }
                        }
                    }
                },
                runtimeControl: {
                    timeInMilliseconds: () => BigInt(Math.trunc(performance.now()))
                },
                console: {
                    onInfoMessage: (messagePtr, length) => {
                        const dec = new TextDecoder("utf-8");
                        const data = new Uint8Array(doomExports.memory.buffer, messagePtr, length);
                        console.log("[DOOM Info]", dec.decode(data));
                    },
                    onErrorMessage: (messagePtr, length) => {
                        const dec = new TextDecoder("utf-8");
                        const data = new Uint8Array(doomExports.memory.buffer, messagePtr, length);
                        console.error("[DOOM Error]", dec.decode(data));
                    }
                },
                gameSaving: {
                    sizeOfSaveGame: () => 0,
                    readSaveGame: () => 0,
                    writeSaveGame: () => 0
                },
                env: {}, 
                bigos: {
                    log: (arg) => console.log("WASM Mówi:", arg),
                    toast: (code) => { if(typeof apps !== 'undefined') apps.showToast('WASM Moduł', `Kod: ${code}`, 'info'); }
                }
            };

            const { instance } = await WebAssembly.instantiate(buffer, importObject);
            doomExports = instance.exports;

            document.getElementById('wasm-title').innerText = fileName;
            canvas.focus(); 

            if (doomExports.initGame) {
                document.getElementById('wasm-icon').innerText = '🔥';
                document.getElementById('wasm-title').innerText = 'DOOM Engine';
                const hint = document.getElementById('wasm-hint');
                if(hint) hint.innerText = "(Wciśnij klawisz ENTER!)";
                
                doomExports.initGame();
                
                const doomKeyFromJavascriptKey = new Map([
                    ["ArrowLeft", doomExports.KEY_LEFTARROW],
                    ["ArrowRight", doomExports.KEY_RIGHTARROW],
                    ["ArrowUp", doomExports.KEY_UPARROW],
                    ["ArrowDown", doomExports.KEY_DOWNARROW],
                    [",", doomExports.KEY_STRAFE_L],
                    [".", doomExports.KEY_STRAFE_R],
                    ["Control", doomExports.KEY_FIRE],
                    [" ", doomExports.KEY_USE],
                    ["Shift", doomExports.KEY_SHIFT],
                    ["Tab", doomExports.KEY_TAB],
                    ["Escape", doomExports.KEY_ESCAPE],
                    ["Enter", doomExports.KEY_ENTER],
                    ["Backspace", doomExports.KEY_BACKSPACE],
                    ["Alt", doomExports.KEY_ALT]
                ]);

                const convertKeyEventToDoomKey = (e) => {
                    let correspondingDoomKey = null;
                    if (doomKeyFromJavascriptKey.has(e.key)) {
                        let val = doomKeyFromJavascriptKey.get(e.key);
                        correspondingDoomKey = (typeof val === 'object' && val !== null) ? val.value : val;
                    } else if (e.key.length === 1) {
                        correspondingDoomKey = e.key.charCodeAt(0);
                    }
                    return correspondingDoomKey;
                };

                const keydownHandler = (e) => {
                    const w = document.getElementById('app-wasm');
                    if(!w || !w.classList.contains('active') || w.classList.contains('minimized')) return;
                    
                    if(document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable)) return;
                    
                    const dk = convertKeyEventToDoomKey(e);
                    if (dk !== null && doomExports.reportKeyDown) { 
                        doomExports.reportKeyDown(dk); 
                        e.preventDefault(); 
                        e.stopPropagation();
                    }
                };
                
                const keyupHandler = (e) => {
                    const w = document.getElementById('app-wasm');
                    if(!w || !w.classList.contains('active') || w.classList.contains('minimized')) return;
                    
                    if(document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable)) return;

                    const dk = convertKeyEventToDoomKey(e);
                    if (dk !== null && doomExports.reportKeyUp) { 
                        doomExports.reportKeyUp(dk); 
                        e.preventDefault(); 
                        e.stopPropagation();
                    }
                };

                window.addEventListener('keydown', keydownHandler, {passive: false});
                window.addEventListener('keyup', keyupHandler, {passive: false});

                window.wasmLoopCleanup = () => {
                    window.removeEventListener('keydown', keydownHandler);
                    window.removeEventListener('keyup', keyupHandler);
                };

                let lastTick = performance.now();
                const loop = () => {
                    const w = document.getElementById('app-wasm');
                    if (w && w.classList.contains('active')) {
                        let now = performance.now();
                        if (now - lastTick >= 1000/35) { 
                            if (doomExports.tickGame) doomExports.tickGame();
                            lastTick = now;
                        }
                    }
                    window.wasmLoop = requestAnimationFrame(loop);
                };
                window.wasmLoop = requestAnimationFrame(loop);
                
            } else if (doomExports.main) {
                if(loadingUI) loadingUI.classList.add('hidden');
                const result = doomExports.main();
                if(result !== undefined && typeof apps !== 'undefined') apps.showToast('WASM Wynik', `main() zwraca: ${result}`, 'success');
            } else {
                if(loadingUI) loadingUI.classList.add('hidden');
                if(typeof apps !== 'undefined') apps.showToast('WebAssembly', `Zwykły moduł załadowany pomyślnie.`, 'success');
            }

        } catch(e) {
            console.error(e);
            if(typeof apps !== 'undefined') apps.showToast('Błąd WASM', 'Nieprawidłowy plik lub brakująca funkcja', 'error');
            const loadingUI = document.getElementById('wasm-loading');
            if(loadingUI) loadingUI.innerHTML = '<span class="text-red-500 font-bold">Błąd ładowania silnika DOOM!</span>';
        }
    },
    
    stop: () => {
        // Zatrzymujemy nasłuchiwanie klawiatury
        if (window.wasmLoopCleanup) { window.wasmLoopCleanup(); window.wasmLoopCleanup = null; }
        // Zatrzymujemy animację FPS
        if (window.wasmLoop) { cancelAnimationFrame(window.wasmLoop); window.wasmLoop = null; }
        
        // Całkowite fizyczne zniszczenie okna zrzuca obciążenie pamięci (RAM)
        const win = document.getElementById('app-wasm');
        if (win) {
            win.remove(); 
        }
        
        // Zaktualizowanie paska zadań by odznaczył zamknięte okno
        if (typeof openAppsList !== 'undefined' && typeof winManager !== 'undefined') {
            openAppsList.delete('wasm');
            winManager.renderTaskbar();
        }
    }
};

// Automatyczne wstrzyknięcie poprawek zapewniające kompatybilność z resztą BigOS
setTimeout(() => {
    if (typeof desktop !== 'undefined') {
        desktop.runWASM = (item) => window.wasmEngineApp.open(item);
        desktop.stopWASM = () => window.wasmEngineApp.stop();
    }
    // Specjalna łatka naprawiająca zamykanie przez systemowego menadżera (pasek zadań)
    if (typeof winManager !== 'undefined' && !window._wasmClosePatched) {
        const origClose = winManager.close;
        winManager.close = (appId) => {
            if (appId === 'wasm') {
                window.wasmEngineApp.stop();
            } else {
                origClose(appId);
            }
        };
        window._wasmClosePatched = true;
    }
}, 1000);