// ======================================================================
// PLIK: js/aplikacje/montazysta.js (Montażysta PRO - Silnik Natywny WebM)
// ======================================================================

window.montazystaApp = {
    _initialized: false,
    isExporting: false,

    // ==================================================================
    // 1. STAN PROJEKTU (MODEL DANYCH)
    // ==================================================================
    project: {
        name: "Mój_Montaż",
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 30, 
        tracks: [
            { id: 'tr_v2', type: 'video', name: 'Wideo 2 (Nakładki)', items: [], zIndex: 3 },
            { id: 'tr_v1', type: 'video', name: 'Wideo 1 (Główne)', items: [], zIndex: 2 },
            { id: 'tr_t1', type: 'text', name: 'Napisy / Tekst', items: [], zIndex: 4 },
            { id: 'tr_a1', type: 'audio', name: 'Audio 1 (Główne)', items: [], zIndex: 1 },
            { id: 'tr_a2', type: 'audio', name: 'Audio 2 (SFX/Muzyka)', items: [], zIndex: 0 }
        ]
    },

    library: [], 
    
    timeline: {
        time: 0,
        isPlaying: false,
        zoom: 10, 
        scrollX: 0,
        selectedItemId: null,
        clipboard: null
    },

    mediaCache: {}, 
    previewCanvas: null,
    previewCtx: null,
    renderLoopId: null,

    dragState: null,

    init: () => {
        if (montazystaApp._initialized) return;
        montazystaApp._initialized = true;

        montazystaApp.buildUI();
        montazystaApp.initPreviewEngine();
        
        // --- AUTO-MIGRACJA ---
        if (typeof fileSystem !== 'undefined') {
            let oldApp = fileSystem.find(f => f.appId === 'bigcut' || f.id === 'app_bigcut');
            if (oldApp) {
                oldApp.name = 'Montażysta'; oldApp.appId = 'montazysta'; oldApp.id = 'app_montazysta';
                if (typeof fsManager !== 'undefined') fsManager.save();
                if (typeof desktop !== 'undefined') desktop.render();
            }
        }
        
        // --- SILNIK NATYWNY ---
        const status = document.getElementById('montazysta-ffmpeg-status');
        if (status) status.innerHTML = '<span class="text-emerald-400 font-bold">✅ Silnik Natywny (WebM)</span>';

        if (typeof winManager !== 'undefined' && winManager.register) {
            winManager.register('app-montazysta');
        }

        window.addEventListener('keydown', montazystaApp.handleShortcuts);
        
        // NAPRAWA: Wymuszenie wyrenderowania interfejsu osi czasu od razu po otwarciu programu!
        montazystaApp.renderAll();
    },

    close: () => {
        // Zamiast niszczyć środowisko, po prostu pauzujemy odtwarzanie i wyciszamy
        if (montazystaApp.timeline.isPlaying) {
            montazystaApp.togglePlay();
        }
        
        Object.values(montazystaApp.mediaCache).forEach(media => {
            if(media.el) {
                media.el.pause();
                media.el.muted = true;
            }
        });
        // Nie zmieniamy _initialized na false ani nie usuwamy okna z DOM,
        // winManager po prostu ukrywa okno usuwając mu klasę .active
    },

    // ==================================================================
    // 🤖 INTERFEJS API DLA ASYSTENTA BIGAI
    // ==================================================================
    api: {
        openApp: () => { if (typeof winManager !== 'undefined') winManager.open('montazysta'); },
        closeApp: () => { if (typeof winManager !== 'undefined') winManager.close('montazysta'); montazystaApp.close(); },
        newProject: (name = "Mój_Montaż", fps = 30) => { montazystaApp.project.name = name; montazystaApp.project.fps = fps; montazystaApp.renderAll(); },
        openProject: (fileId) => montazystaApp.openProject(fileId),
        saveProject: (projectName) => montazystaApp.saveProject(projectName),
        importFileFromBigOS: (fileId) => montazystaApp.importFromBigOS(fileId),
        
        addClip: (trackId, libraryItemId, startTime) => {
            const libItem = montazystaApp.library.find(i => i.id === libraryItemId);
            if(!libItem) return "Błąd: Brak pliku w bibliotece";
            return montazystaApp.addClipToTimeline(trackId, libItem, startTime);
        },
        addText: (trackId, text, startTime, duration) => {
            const id = 'txt_' + Date.now();
            const track = montazystaApp.project.tracks.find(t => t.id === trackId);
            if(!track) return "Błąd: Nie znaleziono ścieżki";
            track.items.push({
                id: id, type: 'text', name: 'Napis', text: text,
                start: startTime, end: startTime + duration, duration: duration,
                x: 100, y: 100, scale: 1, rotation: 0, opacity: 100,
                fontSize: 60, fontColor: '#ffffff', outlineColor: '#000000', outlineWidth: 2
            });
            montazystaApp.renderAll();
            return id;
        },
        deleteClip: (clipId) => montazystaApp.deleteClip(clipId),
        splitClip: (clipId) => montazystaApp.splitClip(clipId),
        setClipTransform: (clipId, x, y, scale, rotation) => {
            const clip = montazystaApp.findClip(clipId);
            if(clip) { clip.x = x; clip.y = y; clip.scale = scale; clip.rotation = rotation; montazystaApp.renderProperties(); }
        },
        setClipFilters: (clipId, brightness, contrast, saturate, chromaKey) => {
            const clip = montazystaApp.findClip(clipId);
            if(clip) { 
                if(!clip.filters) clip.filters = {};
                clip.filters.brightness = brightness; clip.filters.contrast = contrast; 
                clip.filters.saturate = saturate; clip.filters.chromaKey = chromaKey;
                montazystaApp.renderProperties(); 
            }
        },
        exportVideo: (res = "1080p", target = 'bigos') => {
            const map = {"720p": 720, "1080p": 1080, "1440p": 1440, "4K": 2160};
            montazystaApp.project.height = map[res] || 1080;
            montazystaApp.project.width = Math.round(montazystaApp.project.height * (16/9));
            if (target === 'pc') montazystaApp.exportToPC();
            else montazystaApp.exportToBigOS();
        },
        playPause: () => montazystaApp.togglePlay(),
        seek: (timeSeconds) => { montazystaApp.timeline.time = timeSeconds; montazystaApp.renderTimeline(); },
        
        // NAPRAWA: Dostosowanie API przycinania do nowej mechaniki klipów na osi czasu
        setTrim: (start, end) => {
            const clipId = montazystaApp.timeline.selectedItemId;
            if(clipId) {
                const clip = montazystaApp.findClip(clipId);
                if (clip) {
                    clip.trimStart = start;
                    clip.duration = end - start;
                    clip.end = clip.start + clip.duration;
                    montazystaApp.renderAll();
                }
            } else {
                if(typeof apps !== 'undefined') apps.showToast('BigAI', 'Wybierz klip na osi czasu, aby go przyciąć.', 'warning');
            }
        },
        setOverlayText: (text, x, y, size, color) => {
            const clipId = montazystaApp.timeline.selectedItemId;
            if(clipId) {
                const clip = montazystaApp.findClip(clipId);
                if (clip && clip.type === 'text') {
                    clip.text = text;
                    clip.x = x || clip.x; clip.y = y || clip.y; 
                    clip.fontSize = size || clip.fontSize; clip.fontColor = color || clip.fontColor;
                    montazystaApp.renderAll();
                }
            }
        }
    },

    // ==================================================================
    // BUDOWA INTERFEJSU (UI)
    // ==================================================================
    buildUI: () => {
        let win = document.getElementById('app-montazysta');
        if (!win) { win = document.createElement('div'); win.id = 'app-montazysta'; document.body.appendChild(win); }

        win.className = 'window absolute hidden'; 
        win.style.width = '1200px'; win.style.height = '800px';
        win.style.background = 'transparent'; win.style.border = 'none'; win.style.boxShadow = 'none';
        win.innerHTML = '';

        const frame = document.createElement('div');
        frame.className = 'flex flex-col h-full w-full themed-app g-panel rounded-lg shadow-2xl overflow-hidden relative select-none';
        
        frame.innerHTML = `
            <!-- PASEK TYTUŁOWY I MENU -->
            <div class="px-4 py-2 border-b g-border flex justify-between items-center cursor-move bg-black/40 shrink-0 relative z-50" onmousedown="winManager.startDrag(event, 'app-montazysta')" ontouchstart="winManager.startDrag(event, 'app-montazysta')">
                <div class="flex items-center gap-4">
                    <span class="text-sm font-bold g-accent drop-shadow-md flex items-center gap-2"><span>🎬</span> Montażysta PRO</span>
                    <div class="flex gap-2">
                        <div class="relative group">
                            <button class="g-text text-xs hover:bg-white/10 px-2 py-1 rounded transition font-bold">Plik</button>
                            <div class="absolute left-0 top-full hidden group-hover:flex flex-col g-panel border g-border shadow-2xl rounded py-1 z-50 min-w-[200px]">
                                <button onclick="montazystaApp.api.newProject()" class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs">Nowy Projekt</button>
                                <button onclick="montazystaApp.showOpenProjectModal()" class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs">Otwórz z BigOS...</button>
                                <button onclick="montazystaApp.showSaveProjectModal()" class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs">Zapisz Projekt</button>
                                <div class="border-t g-border my-1"></div>
                                <button onclick="document.getElementById('mz-import-pc').click()" class="text-left px-4 py-1.5 hover:bg-emerald-600 hover:text-white transition text-xs text-emerald-400">Import z PC...</button>
                            </div>
                        </div>
                        <div class="relative group">
                            <button class="g-text text-xs hover:bg-white/10 px-2 py-1 rounded transition font-bold">Edycja</button>
                            <div class="absolute left-0 top-full hidden group-hover:flex flex-col g-panel border g-border shadow-2xl rounded py-1 z-50 min-w-[170px]">
                                <button onclick="montazystaApp.copyClip()" class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs">Kopiuj (Ctrl+C)</button>
                                <button onclick="montazystaApp.pasteClip()" class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs">Wklej (Ctrl+V)</button>
                                <button onclick="montazystaApp.deleteClip()" class="text-left px-4 py-1.5 hover:bg-red-500 hover:text-white transition text-xs text-red-400">Usuń (Del)</button>
                                <div class="border-t g-border my-1"></div>
                                <button onclick="montazystaApp.splitClip()" class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs font-bold">Podziel (S)</button>
                            </div>
                        </div>
                        <div class="relative group">
                            <button class="g-text text-xs hover:bg-white/10 px-2 py-1 rounded transition font-bold text-blue-400">Eksport</button>
                            <div class="absolute left-0 top-full hidden group-hover:flex flex-col g-panel border g-border shadow-2xl rounded py-1 z-50 min-w-[220px]">
                                <button onclick="montazystaApp.showExportModal()" class="text-left px-4 py-2 hover:bg-blue-600 hover:text-white transition text-sm font-bold bg-blue-500/20 text-blue-400">🎬 Renderuj wideo...</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex gap-2 items-center">
                    <span id="montazysta-ffmpeg-status" class="text-[9px] g-text-muted font-mono uppercase tracking-widest bg-black/30 px-2 py-1 rounded border g-border"></span>
                    <button onclick="winManager.minimize('montazysta')" class="g-icon-btn px-1 hover:text-white transition">_</button>
                    <button onclick="winManager.maximize('app-montazysta')" class="g-icon-btn px-1 hover:text-white transition">□</button>
                    <button onclick="winManager.close('montazysta'); montazystaApp.close();" class="text-red-500 hover:text-red-400 px-1 font-bold transition">✖</button>
                </div>
            </div>
            
            <input type="file" id="mz-import-pc" multiple accept="video/*,audio/*,image/*" class="hidden" onchange="montazystaApp.importFilesPC(event)">

            <!-- GÓRNA SEKCJA -->
            <div class="flex h-[45%] border-b g-border shrink-0 bg-black/10">
                
                <!-- BIBLIOTEKA -->
                <div class="w-[25%] min-w-[200px] border-r g-border flex flex-col bg-black/20">
                    <div class="p-2 border-b g-border flex justify-between items-center bg-black/30 shrink-0">
                        <span class="text-xs font-bold g-text uppercase tracking-widest">Zasoby</span>
                        <button onclick="document.getElementById('mz-import-pc').click()" class="g-btn text-[10px] px-2 py-1 rounded bg-blue-600/20 border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white">Importuj</button>
                    </div>
                    <div id="mz-library-list" class="flex-grow overflow-y-auto custom-scrollbar p-2 flex flex-col gap-2">
                        <div class="text-center text-[10px] g-text-muted mt-10">Pusto. Importuj media.</div>
                    </div>
                </div>

                <!-- PODGLĄD (CANVAS) -->
                <!-- NAPRAWA: Zwiększona ilość miejsca po wyrzuceniu starych kafelków przycinania -->
                <div class="flex-grow flex flex-col bg-black relative overflow-hidden">
                    <div class="absolute inset-0 flex items-center justify-center p-2 pb-14" id="mz-preview-container">
                        <canvas id="mz-preview-canvas" class="max-w-full max-h-full shadow-2xl bg-black border border-gray-700 aspect-video"></canvas>
                        
                        <div id="mz-canvas-overlay" class="absolute inset-0 pointer-events-none flex items-center justify-center hidden">
                            <div class="w-full h-full max-w-[100%] max-h-[100%] border border-dashed border-gray-500/50 grid grid-cols-3 grid-rows-3" style="aspect-ratio: 16/9;">
                                <div class="border-r border-b border-gray-500/30"></div><div class="border-r border-b border-gray-500/30"></div><div class="border-b border-gray-500/30"></div>
                                <div class="border-r border-b border-gray-500/30"></div><div class="border-r border-b border-gray-500/30"></div><div class="border-b border-gray-500/30"></div>
                                <div class="border-r border-gray-500/30"></div><div class="border-r border-gray-500/30"></div><div></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 flex justify-center gap-4 items-center z-50">
                        <span id="mz-time-display" class="font-mono text-xs g-text font-bold w-20 text-right">00:00.00</span>
                        <button onclick="montazystaApp.togglePlay()" id="mz-btn-play" class="text-white text-3xl hover:text-blue-400 hover:scale-110 transition drop-shadow-md">▶</button>
                        <button onclick="montazystaApp.toggleGrid()" class="g-icon-btn text-xs px-2 border g-border rounded bg-black/50 hover:bg-white/20"># Siatka</button>
                    </div>
                </div>

                <!-- WŁAŚCIWOŚCI -->
                <div class="w-[25%] min-w-[240px] border-l g-border flex flex-col bg-black/20 overflow-hidden">
                    <div class="p-2 border-b g-border bg-black/30 shrink-0">
                        <span class="text-xs font-bold g-text uppercase tracking-widest">Właściwości klipu</span>
                    </div>
                    <div id="mz-properties-panel" class="flex-grow overflow-y-auto custom-scrollbar p-3 flex flex-col gap-4">
                        <div class="text-center text-[10px] g-text-muted mt-10">Zaznacz klip na osi czasu.</div>
                    </div>
                </div>

            </div>

            <!-- DOLNA SEKCJA (Oś Czasu) -->
            <div class="flex-grow flex flex-col bg-[#1e1e1e] relative">
                <div class="h-8 bg-black/30 border-b g-border flex items-center px-2 gap-2 shrink-0 z-20">
                    <button class="g-icon-btn hover:text-white px-2" title="Wybór (V)">↖</button>
                    <button class="g-icon-btn hover:text-red-400 px-2" onclick="montazystaApp.splitClip()" title="Podziel (S)">✂️</button>
                    <button class="g-icon-btn hover:text-red-400 px-2" onclick="montazystaApp.deleteClip()" title="Usuń (Del)">🗑️</button>
                    <div class="w-px h-4 bg-gray-600 mx-1"></div>
                    <button class="g-btn text-[10px] px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border-blue-500/50 hover:bg-blue-500 hover:text-white font-bold" onclick="montazystaApp.api.addText('tr_t1', 'Nowy tekst', montazystaApp.timeline.time, 5)">+ Dodaj Tekst</button>
                    
                    <div class="ml-auto flex items-center gap-2">
                        <span class="text-[10px] g-text-muted font-bold">Skala:</span>
                        <input type="range" min="1" max="50" value="10" class="w-24 h-1.5 g-range rounded appearance-none" oninput="montazystaApp.timeline.zoom = parseInt(this.value); montazystaApp.renderTimeline();">
                    </div>
                </div>

                <div class="flex-grow flex overflow-hidden relative">
                    <div id="mz-track-headers" class="w-[140px] bg-black/40 border-r g-border flex flex-col shrink-0 overflow-hidden z-20 relative"></div>
                    <div id="mz-timeline-scroll" class="flex-grow overflow-auto custom-scrollbar relative" onscroll="montazystaApp.syncTimelineScroll(this)">
                        <div id="mz-timeline-ruler" class="h-6 bg-black/20 border-b g-border relative sticky top-0 z-10 w-[5000px] cursor-pointer" onmousedown="montazystaApp.handleRulerClick(event)"></div>
                        <div id="mz-timeline-tracks" class="relative w-[5000px] flex flex-col"></div>
                        <div id="mz-playhead" class="absolute top-0 bottom-0 w-[1px] bg-red-500 z-30 pointer-events-none" style="left: 0px;">
                            <div class="absolute -top-0 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-sm" style="clip-path: polygon(0 0, 100% 0, 50% 100%);"></div>
                        </div>
                    </div>
                </div>

            </div>
        `;
        win.appendChild(frame);
    },

    // ==================================================================
    // SILNIK RENDEROWANIA CANVASA (60FPS z precyzyjną fizyką czasu)
    // ==================================================================
    initPreviewEngine: () => {
        montazystaApp.previewCanvas = document.getElementById('mz-preview-canvas');
        montazystaApp.previewCtx = montazystaApp.previewCanvas.getContext('2d');
        
        montazystaApp.previewCanvas.width = montazystaApp.project.width;
        montazystaApp.previewCanvas.height = montazystaApp.project.height;

        let lastFrameTime = performance.now();

        const loop = (now) => {
            // Prawdziwy czas Delta (w sekundach), uniezależnia to działanie od odświeżania monitora!
            let dt = (now - lastFrameTime) / 1000;
            // Ochrona przed dużymi skokami po powrocie do zminimalizowanej zakładki przeglądarki
            if (dt > 0.2) dt = 1 / (montazystaApp.project.fps || 30);
            lastFrameTime = now;

            // Obliczanie długości projektu
            let maxClipEnd = 0;
            montazystaApp.project.tracks.forEach(track => {
                track.items.forEach(item => {
                    if (item.end > maxClipEnd) maxClipEnd = item.end;
                });
            });
            montazystaApp.project.duration = maxClipEnd > 0 ? Math.ceil(maxClipEnd + 1) : 30;

            if (montazystaApp.timeline.isPlaying) {
                // Postępujemy na bazie Prawdziwego Czasu (dt) a nie sztywnych klatek
                montazystaApp.timeline.time += dt;
                
                if (montazystaApp.timeline.time >= montazystaApp.project.duration) {
                    montazystaApp.timeline.time = montazystaApp.project.duration;
                    if (montazystaApp.timeline.isPlaying) {
                        montazystaApp.togglePlay(); 
                    }
                }
                
                montazystaApp.renderTimeline();
                document.getElementById('mz-time-display').innerText = montazystaApp.formatTime(montazystaApp.timeline.time);
            }
            montazystaApp.renderCanvasFrame();
            montazystaApp.renderLoopId = requestAnimationFrame(loop);
        };
        montazystaApp.renderLoopId = requestAnimationFrame(loop);
    },

    renderCanvasFrame: () => {
        const ctx = montazystaApp.previewCtx;
        const w = montazystaApp.project.width;
        const h = montazystaApp.project.height;
        const cTime = montazystaApp.timeline.time;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);

        let activeClips = [];
        montazystaApp.project.tracks.forEach(track => {
            track.items.forEach(item => {
                if (cTime >= item.start && cTime < item.end) {
                    activeClips.push({ clip: item, trackZ: track.zIndex });
                }
            });
        });

        activeClips.sort((a, b) => a.trackZ - b.trackZ);

        activeClips.forEach(entry => {
            const clip = entry.clip;
            
            if (clip.type === 'video' || clip.type === 'image') {
                const media = montazystaApp.mediaCache[clip.libId];
                if (media && media.el) {
                    if (clip.type === 'video') {
                        const localTime = (cTime - clip.start) + (clip.trimStart || 0);
                        
                        if (!montazystaApp.timeline.isPlaying) {
                            // Sztywne ustawianie klatek gdy użytkownik przewija pauzę
                            if (Math.abs(media.el.currentTime - localTime) > 0.05) {
                                media.el.currentTime = localTime;
                            }
                            if (!media.el.paused) media.el.pause();
                        } else {
                            // Odtwarzanie - ufamy przeglądarce i korygujemy tylko przy dużych lagach
                            if (media.el.paused) {
                                media.el.currentTime = localTime; 
                                let p = media.el.play();
                                if(p !== undefined) p.catch(()=>{});
                            } else if (Math.abs(media.el.currentTime - localTime) > 0.3) {
                                media.el.currentTime = localTime;
                            }
                        }
                        
                        if(media.el.muted) media.el.muted = false; 
                        media.el.volume = (clip.volume !== undefined ? clip.volume : 100) / 100;
                    }

                    ctx.save();
                    let px = clip.x !== undefined ? clip.x : w/2;
                    let py = clip.y !== undefined ? clip.y : h/2;
                    let scale = clip.scale !== undefined ? clip.scale : 1;
                    let rot = clip.rotation || 0;
                    let op = clip.opacity !== undefined ? clip.opacity/100 : 1;
                    
                    ctx.globalAlpha = op;
                    ctx.translate(px, py);
                    ctx.rotate(rot * Math.PI / 180);
                    ctx.scale(scale, scale);

                    if (clip.filters) {
                        ctx.filter = `brightness(${clip.filters.brightness||100}%) contrast(${clip.filters.contrast||100}%) saturate(${clip.filters.saturate||100}%)`;
                    }

                    let drawW = media.el.videoWidth || media.el.naturalWidth || w;
                    let drawH = media.el.videoHeight || media.el.naturalHeight || h;
                    
                    let ratio = Math.min(w / drawW, h / drawH);
                    drawW *= ratio; drawH *= ratio;

                    ctx.drawImage(media.el, -drawW/2, -drawH/2, drawW, drawH);
                    ctx.restore();
                }
            } 
            else if (clip.type === 'text') {
                ctx.save();
                ctx.globalAlpha = clip.opacity !== undefined ? clip.opacity/100 : 1;
                ctx.translate(clip.x !== undefined ? clip.x : w/2, clip.y !== undefined ? clip.y : h/2);
                ctx.rotate((clip.rotation || 0) * Math.PI / 180);
                ctx.scale(clip.scale || 1, clip.scale || 1);

                ctx.font = `bold ${clip.fontSize || 60}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                if (clip.outlineWidth > 0) {
                    ctx.strokeStyle = clip.outlineColor || '#000000';
                    ctx.lineWidth = clip.outlineWidth;
                    ctx.strokeText(clip.text, 0, 0);
                }
                ctx.fillStyle = clip.fontColor || '#ffffff';
                ctx.fillText(clip.text, 0, 0);
                
                ctx.restore();
            }
            else if (clip.type === 'audio') {
                const media = montazystaApp.mediaCache[clip.libId];
                if (media && media.el) {
                    const localTime = (cTime - clip.start) + (clip.trimStart || 0);
                    
                    if (!montazystaApp.timeline.isPlaying) {
                        if (Math.abs(media.el.currentTime - localTime) > 0.05) {
                            media.el.currentTime = localTime;
                        }
                        if (!media.el.paused) media.el.pause();
                    } else {
                        if (media.el.paused) {
                            media.el.currentTime = localTime;
                            let p = media.el.play();
                            if(p !== undefined) p.catch(()=>{});
                        } else if (Math.abs(media.el.currentTime - localTime) > 0.3) {
                            media.el.currentTime = localTime;
                        }
                    }
                    
                    if(media.el.muted) media.el.muted = false;
                    media.el.volume = (clip.volume !== undefined ? clip.volume : 100) / 100;
                }
            }
        });

        // Wyciszanie nieaktywnych multimediów (tych, które nie są widoczne na wideo w aktualnej sekundzie)
        Object.values(montazystaApp.mediaCache).forEach(media => {
            if (media.el && media.type !== 'image') {
                let isActive = activeClips.some(e => e.clip.libId === media.id);
                if (!isActive) {
                    if(!media.el.paused) media.el.pause();
                    media.el.muted = true; 
                }
            }
        });
    },

    togglePlay: () => {
        montazystaApp.timeline.isPlaying = !montazystaApp.timeline.isPlaying;
        document.getElementById('mz-btn-play').innerText = montazystaApp.timeline.isPlaying ? '⏸' : '▶';
        if (!montazystaApp.timeline.isPlaying) {
            Object.values(montazystaApp.mediaCache).forEach(m => { 
                if(m.el && m.el.pause) {
                    m.el.pause(); 
                    m.el.muted = true;
                }
            });
        }
    },

    formatTime: (sec) => {
        let m = Math.floor(sec / 60);
        let s = Math.floor(sec % 60);
        let ms = Math.floor((sec % 1) * 100);
        return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}.${ms.toString().padStart(2,'0')}`;
    },

    toggleGrid: () => {
        const grid = document.getElementById('mz-canvas-overlay');
        if (grid.classList.contains('hidden')) grid.classList.remove('hidden');
        else grid.classList.add('hidden');
    },

    // ==================================================================
    // OŚ CZASU (TIMELINE)
    // ==================================================================
    renderAll: () => {
        montazystaApp.renderLibraryList();
        montazystaApp.renderTimeline();
        montazystaApp.renderProperties();
    },

    syncTimelineScroll: (el) => {
        montazystaApp.timeline.scrollX = el.scrollLeft;
    },

    handleRulerClick: (e) => {
        const ruler = document.getElementById('mz-timeline-ruler');
        const rect = ruler.getBoundingClientRect();
        const clickX = e.clientX - rect.left + montazystaApp.timeline.scrollX;
        montazystaApp.timeline.time = Math.max(0, clickX / montazystaApp.timeline.zoom);
        montazystaApp.renderTimeline();
        document.getElementById('mz-time-display').innerText = montazystaApp.formatTime(montazystaApp.timeline.time);
    },

    renderTimeline: () => {
        const headers = document.getElementById('mz-track-headers');
        const tracksCont = document.getElementById('mz-timeline-tracks');
        const playhead = document.getElementById('mz-playhead');
        
        if(!headers || !tracksCont || !playhead) return;

        const zoom = montazystaApp.timeline.zoom;
        const totalW = Math.max(1200, montazystaApp.project.duration * zoom + 500);
        
        document.getElementById('mz-timeline-ruler').style.width = totalW + 'px';
        tracksCont.style.width = totalW + 'px';
        
        playhead.style.left = (montazystaApp.timeline.time * zoom) + 'px';

        headers.innerHTML = '';
        tracksCont.innerHTML = '';

        montazystaApp.project.tracks.forEach(track => {
            const hDiv = document.createElement('div');
            hDiv.className = 'h-16 border-b g-border bg-black/40 p-2 flex flex-col justify-center';
            let icon = track.type === 'video' ? '🎬' : (track.type === 'audio' ? '🎵' : '🔤');
            hDiv.innerHTML = `<span class="text-[10px] font-bold g-text uppercase tracking-wider truncate" title="${track.name}">${icon} ${track.name}</span>`;
            headers.appendChild(hDiv);

            const tDiv = document.createElement('div');
            tDiv.className = 'h-16 border-b border-gray-600/30 bg-black/20 relative group';
            tDiv.ondragover = e => e.preventDefault();
            tDiv.ondrop = e => montazystaApp.handleTimelineDrop(e, track.id);

            track.items.forEach(clip => {
                const cDiv = document.createElement('div');
                const isSel = montazystaApp.timeline.selectedItemId === clip.id;
                
                let bgColor = clip.type === 'video' ? 'bg-blue-600' : (clip.type === 'audio' ? 'bg-purple-600' : 'bg-emerald-600');
                if (isSel) bgColor = clip.type === 'video' ? 'bg-blue-400 border-2 border-white' : (clip.type === 'audio' ? 'bg-purple-400 border-2 border-white' : 'bg-emerald-400 border-2 border-white');

                cDiv.className = `absolute top-1 bottom-1 rounded-md shadow-md ${bgColor} cursor-pointer flex items-center px-2 overflow-hidden opacity-90 hover:opacity-100 transition-opacity`;
                cDiv.style.left = (clip.start * zoom) + 'px';
                cDiv.style.width = (clip.duration * zoom) + 'px';
                
                cDiv.innerHTML = `
                    <span class="text-[10px] font-bold text-white truncate pointer-events-none">${clip.name}</span>
                    <div class="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize bg-black/20 hover:bg-white/50" onmousedown="montazystaApp.startTrim(event, '${clip.id}', 'start')"></div>
                    <div class="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize bg-black/20 hover:bg-white/50" onmousedown="montazystaApp.startTrim(event, '${clip.id}', 'end')"></div>
                `;
                
                cDiv.onmousedown = (e) => {
                    if(e.target.tagName === 'DIV' && e.target.className.includes('resize')) return;
                    montazystaApp.timeline.selectedItemId = clip.id;
                    montazystaApp.renderAll();
                    montazystaApp.startClipDrag(e, clip);
                };

                tDiv.appendChild(cDiv);
            });

            tracksCont.appendChild(tDiv);
        });
    },

    findClip: (clipId) => {
        for(let track of montazystaApp.project.tracks) {
            let clip = track.items.find(i => i.id === clipId);
            if(clip) return clip;
        }
        return null;
    },

    findTrackByClipId: (clipId) => {
        for(let track of montazystaApp.project.tracks) {
            if(track.items.find(i => i.id === clipId)) return track;
        }
        return null;
    },

    deleteClip: () => {
        if(!montazystaApp.timeline.selectedItemId) return;
        montazystaApp.project.tracks.forEach(track => {
            track.items = track.items.filter(i => i.id !== montazystaApp.timeline.selectedItemId);
        });
        montazystaApp.timeline.selectedItemId = null;
        montazystaApp.renderAll();
    },

    // NAPRAWA: Precyzyjna mechanika cięcia wideo w dowolnym momencie czasu
    splitClip: () => {
        const clipId = montazystaApp.timeline.selectedItemId;
        if(!clipId) {
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Zaznacz klip, który chcesz przeciąć', 'warning');
            return;
        }
        
        const track = montazystaApp.findTrackByClipId(clipId);
        const clip = track.items.find(i => i.id === clipId);
        
        const cTime = montazystaApp.timeline.time;
        if (cTime > clip.start && cTime < clip.end) {
            const firstPartDur = cTime - clip.start;
            const newClip = JSON.parse(JSON.stringify(clip));
            
            newClip.id = 'c_' + Date.now();
            newClip.start = cTime;
            newClip.duration = clip.end - cTime;
            newClip.end = newClip.start + newClip.duration;
            newClip.trimStart = (clip.trimStart || 0) + firstPartDur;
            
            clip.end = cTime;
            clip.duration = firstPartDur;
            
            track.items.push(newClip);
            montazystaApp.timeline.selectedItemId = newClip.id; 
            montazystaApp.renderAll();
            
            if(typeof apps !== 'undefined') apps.showToast('Sukces', 'Podzielono klip wideo.', 'success');
        } else {
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Czerwona linia czasu musi znajdować się wewnątrz zaznaczonego klipu.', 'warning');
        }
    },

    copyClip: () => {
        const clip = montazystaApp.findClip(montazystaApp.timeline.selectedItemId);
        if(clip) {
            montazystaApp.timeline.clipboard = JSON.parse(JSON.stringify(clip));
            if(typeof apps !== 'undefined') apps.showToast('Skopiowano', 'Klip skopiowany', 'info');
        }
    },

    pasteClip: () => {
        if(!montazystaApp.timeline.clipboard) return;
        const newClip = JSON.parse(JSON.stringify(montazystaApp.timeline.clipboard));
        newClip.id = 'c_' + Date.now();
        newClip.start = montazystaApp.timeline.time;
        newClip.end = newClip.start + newClip.duration;
        
        let track = montazystaApp.project.tracks.find(t => t.type === newClip.type);
        if(track) {
            track.items.push(newClip);
            montazystaApp.timeline.selectedItemId = newClip.id;
            montazystaApp.renderAll();
        }
    },

    handleShortcuts: (e) => {
        const w = document.getElementById('app-montazysta');
        if (w && w.classList.contains('active') && !w.classList.contains('minimized')) {
            if(document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.type === 'textarea')) return;
            
            if(e.code === 'Space') { e.preventDefault(); montazystaApp.togglePlay(); }
            if(e.code === 'Delete') { e.preventDefault(); montazystaApp.deleteClip(); }
            if(e.code === 'KeyS') { e.preventDefault(); montazystaApp.splitClip(); }
            if(e.ctrlKey && e.code === 'KeyC') { e.preventDefault(); montazystaApp.copyClip(); }
            if(e.ctrlKey && e.code === 'KeyV') { e.preventDefault(); montazystaApp.pasteClip(); }
        }
    },

    startClipDrag: (e, clip) => {
        e.stopPropagation();
        const startX = e.clientX;
        const initialStart = clip.start;
        const zoom = montazystaApp.timeline.zoom;

        const onMove = (me) => {
            const dx = (me.clientX - startX) / zoom;
            let newStart = initialStart + dx;
            if (newStart < 0) newStart = 0;
            clip.start = newStart;
            clip.end = newStart + clip.duration;
            montazystaApp.renderTimeline();
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (clip.end > montazystaApp.project.duration) montazystaApp.project.duration = Math.ceil(clip.end + 10);
            montazystaApp.renderProperties();
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    },

    startTrim: (e, clipId, edge) => {
        e.stopPropagation();
        const clip = montazystaApp.findClip(clipId);
        if(!clip) return;

        const startX = e.clientX;
        const initialStart = clip.start;
        const initialEnd = clip.end;
        const initialTrimStart = clip.trimStart || 0;
        const zoom = montazystaApp.timeline.zoom;

        const onMove = (me) => {
            const dx = (me.clientX - startX) / zoom;
            
            if (edge === 'start') {
                let newStart = initialStart + dx;
                if (newStart >= initialEnd - 0.1) newStart = initialEnd - 0.1;
                if (newStart < 0) newStart = 0;
                
                const timeDiff = newStart - initialStart;
                clip.start = newStart;
                clip.duration = initialEnd - newStart;
                if (clip.libId) {
                    clip.trimStart = Math.max(0, initialTrimStart + timeDiff);
                }
            } else {
                let newEnd = initialEnd + dx;
                if (newEnd <= initialStart + 0.1) newEnd = initialStart + 0.1;
                clip.end = newEnd;
                clip.duration = newEnd - initialStart;
            }
            montazystaApp.renderTimeline();
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            montazystaApp.renderProperties();
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    },

    handleTimelineDrop: (e, targetTrackId) => {
        const libId = e.dataTransfer.getData('text/plain');
        if(!libId) return;
        const item = montazystaApp.library.find(i => i.id === libId);
        if(!item) return;

        const track = montazystaApp.project.tracks.find(t => t.id === targetTrackId);
        if (!track) return;
        
        if ((item.type === 'video' || item.type === 'image') && track.type !== 'video') {
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Przeciągnij wideo/obraz na ścieżkę wideo.', 'error');
            return;
        }
        if (item.type === 'audio' && track.type !== 'audio') {
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Przeciągnij audio na ścieżkę audio.', 'error');
            return;
        }

        const rect = document.getElementById('mz-timeline-tracks').getBoundingClientRect();
        const dropX = e.clientX - rect.left + montazystaApp.timeline.scrollX;
        let startTime = Math.max(0, dropX / montazystaApp.timeline.zoom);

        montazystaApp.addClipToTimeline(targetTrackId, item, startTime);
    },

    addClipToTimeline: (trackId, libItem, startTime) => {
        const track = montazystaApp.project.tracks.find(t => t.id === trackId);
        if(!track) return;

        const dur = libItem.duration || 5; 
        
        const clip = {
            id: 'c_' + Date.now() + Math.random(),
            libId: libItem.id,
            type: libItem.type,
            name: libItem.name,
            start: startTime,
            end: startTime + dur,
            duration: dur,
            trimStart: 0
        };

        if (libItem.type === 'video' || libItem.type === 'image') {
            clip.x = montazystaApp.project.width / 2;
            clip.y = montazystaApp.project.height / 2;
            clip.scale = 1;
            clip.rotation = 0;
            clip.opacity = 100;
            clip.filters = { brightness: 100, contrast: 100, saturate: 100, chromaKey: false };
        }
        
        if (libItem.type === 'audio' || libItem.type === 'video') {
            clip.volume = 100;
        }

        track.items.push(clip);
        
        if (clip.end > montazystaApp.project.duration) montazystaApp.project.duration = Math.ceil(clip.end + 10);
        
        montazystaApp.renderAll();
        return clip.id;
    },

    // ==================================================================
    // IMPORT DO BIBLIOTEKI W PROJEKCIE (MEDIA CACHE)
    // ==================================================================
    importFilesPC: (e) => {
        const files = Array.from(e.target.files);
        if(files.length === 0) return;
        
        files.forEach(f => {
            const url = URL.createObjectURL(f);
            let type = f.type.startsWith('video') ? 'video' : (f.type.startsWith('audio') ? 'audio' : 'image');
            
            const libItem = { id: 'lib_' + Date.now() + Math.random(), type: type, name: f.name, url: url, isLocal: true, duration: 5, fileObj: f };
            
            montazystaApp.library.push(libItem);
            montazystaApp.preloadMedia(libItem);
        });
        
        e.target.value = '';
        montazystaApp.renderLibraryList();
    },

    preloadMedia: (libItem) => {
        montazystaApp.mediaCache[libItem.id] = { id: libItem.id, url: libItem.url, isLocal: libItem.isLocal, type: libItem.type, el: null };
        
        if (libItem.type === 'video') {
            const v = document.createElement('video');
            v.src = libItem.url; 
            v.muted = true;
            v.crossOrigin = "anonymous";
            v.onloadedmetadata = () => { libItem.duration = v.duration; montazystaApp.renderLibraryList(); };
            montazystaApp.mediaCache[libItem.id].el = v;
        } else if (libItem.type === 'audio') {
            const a = document.createElement('audio');
            a.src = libItem.url; a.crossOrigin = "anonymous";
            a.onloadedmetadata = () => { libItem.duration = a.duration; montazystaApp.renderLibraryList(); };
            montazystaApp.mediaCache[libItem.id].el = a;
        } else if (libItem.type === 'image') {
            const img = new Image();
            img.src = libItem.url; img.crossOrigin = "anonymous";
            montazystaApp.mediaCache[libItem.id].el = img;
        }
    },

    renderLibraryList: () => {
        const list = document.getElementById('mz-library-list');
        if(!list) return;
        list.innerHTML = '';
        if(montazystaApp.library.length === 0) { list.innerHTML = '<div class="text-center text-[10px] g-text-muted mt-10">Pusto. Importuj media.</div>'; return; }

        montazystaApp.library.forEach(item => {
            const el = document.createElement('div');
            let icon = item.type === 'video' ? '🎬' : (item.type === 'audio' ? '🎵' : '🖼️');
            el.className = 'g-panel bg-black/40 p-2 rounded-lg border g-border flex flex-col gap-1 cursor-grab active:cursor-grabbing hover:bg-white/10 transition';
            el.draggable = true;
            el.ondragstart = (e) => { e.dataTransfer.setData('text/plain', item.id); e.dataTransfer.effectAllowed = 'copy'; };
            
            let durStr = item.duration ? montazystaApp.formatTime(item.duration) : '--:--';
            
            el.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="text-lg">${icon}</span>
                    <div class="flex flex-col overflow-hidden w-full">
                        <span class="text-[10px] font-bold g-text truncate">${typeof desktop !== 'undefined' ? desktop.escapeHTML(item.name) : item.name}</span>
                        <span class="text-[9px] g-text-muted font-mono">${durStr}</span>
                    </div>
                </div>
            `;
            list.appendChild(el);
        });
    },

    // ==================================================================
    // PANEL WŁAŚCIWOŚCI
    // ==================================================================
    renderProperties: () => {
        const panel = document.getElementById('mz-properties-panel');
        if(!panel) return;
        
        const clip = montazystaApp.findClip(montazystaApp.timeline.selectedItemId);
        if(!clip) {
            panel.innerHTML = '<div class="text-center text-[10px] g-text-muted mt-10">Zaznacz klip na osi czasu.</div>';
            return;
        }

        // NAPRAWA: Zaktualizowane panele z uwzględnieniem trimStart na potrzeby cięcia
        const genInput = (label, prop, type='number', step=1) => `
            <div class="flex items-center justify-between text-xs">
                <span class="g-text-muted font-bold">${label}</span>
                <input type="${type}" step="${step}" value="${clip[prop]}" onchange="montazystaApp.updateClipProp('${clip.id}', '${prop}', this.value)" class="w-16 p-1 rounded bg-black/40 border g-border g-text outline-none text-right font-mono">
            </div>
        `;

        let html = `<h4 class="font-bold text-xs g-accent uppercase tracking-wider mb-2 border-b g-border pb-1">${clip.name}</h4>`;
        
        html += `
            <div class="flex flex-col gap-2 mb-4 bg-black/20 p-2 rounded border g-border shadow-inner">
                <span class="text-[10px] g-text-muted uppercase font-bold">Oś Czasu (Sekundy)</span>
                ${genInput('Początek na osi', 'start', 'number', 0.1)}
                ${genInput('Długość klipu', 'duration', 'number', 0.1)}
                ${(clip.type === 'video' || clip.type === 'audio') ? genInput('Przesunięcie Media (Trim)', 'trimStart', 'number', 0.1) : ''}
            </div>
        `;

        if (clip.type === 'video' || clip.type === 'image' || clip.type === 'text') {
            html += `
                <div class="flex flex-col gap-2 mb-4 bg-black/20 p-2 rounded border g-border shadow-inner">
                    <span class="text-[10px] g-text-muted uppercase font-bold">Transformacja</span>
                    ${genInput('Poz X', 'x', 'number', 10)}
                    ${genInput('Poz Y', 'y', 'number', 10)}
                    ${genInput('Skala', 'scale', 'number', 0.1)}
                    ${genInput('Obrót (°)', 'rotation', 'number', 1)}
                    ${genInput('Krycie (%)', 'opacity', 'number', 1)}
                </div>
            `;
        }

        if (clip.type === 'video' || clip.type === 'image') {
            html += `
                <div class="flex flex-col gap-2 mb-4 bg-black/20 p-2 rounded border g-border shadow-inner">
                    <span class="text-[10px] g-text-muted uppercase font-bold">Korekcja Barw</span>
                    <div class="flex items-center justify-between text-xs">
                        <span class="g-text-muted font-bold">Jasność</span>
                        <input type="range" min="0" max="200" value="${clip.filters?.brightness || 100}" class="w-20 h-1.5 g-range rounded" oninput="montazystaApp.updateClipFilter('${clip.id}', 'brightness', this.value)">
                    </div>
                    <div class="flex items-center justify-between text-xs">
                        <span class="g-text-muted font-bold">Kontrast</span>
                        <input type="range" min="0" max="200" value="${clip.filters?.contrast || 100}" class="w-20 h-1.5 g-range rounded" oninput="montazystaApp.updateClipFilter('${clip.id}', 'contrast', this.value)">
                    </div>
                    <div class="flex items-center gap-2 mt-2 pt-2 border-t border-gray-600/30">
                        <input type="checkbox" id="prop-chroma" class="accent-emerald-500" ${clip.filters?.chromaKey ? 'checked' : ''} onchange="montazystaApp.updateClipFilter('${clip.id}', 'chromaKey', this.checked)">
                        <label for="prop-chroma" class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest cursor-pointer">Chroma Key (Green Screen)</label>
                    </div>
                </div>
            `;
        }

        if (clip.type === 'audio' || clip.type === 'video') {
            html += `
                <div class="flex flex-col gap-2 mb-4 bg-black/20 p-2 rounded border g-border shadow-inner">
                    <span class="text-[10px] g-text-muted uppercase font-bold">Dźwięk</span>
                    ${genInput('Głośność (%)', 'volume', 'number', 5)}
                </div>
            `;
        }

        if (clip.type === 'text') {
            html += `
                <div class="flex flex-col gap-2 mb-4 bg-black/20 p-2 rounded border g-border shadow-inner">
                    <span class="text-[10px] g-text-muted uppercase font-bold">Napisy</span>
                    <textarea class="w-full p-2 bg-black/40 border g-border rounded outline-none text-xs g-text custom-scrollbar resize-none" rows="3" oninput="montazystaApp.updateClipProp('${clip.id}', 'text', this.value)">${clip.text}</textarea>
                    ${genInput('Rozmiar', 'fontSize', 'number', 2)}
                    <div class="flex justify-between items-center text-xs mt-1">
                        <span class="g-text-muted font-bold">Kolor Tekstu</span>
                        <input type="color" value="${clip.fontColor}" class="w-8 h-8 rounded bg-transparent border-none cursor-pointer" onchange="montazystaApp.updateClipProp('${clip.id}', 'fontColor', this.value)">
                    </div>
                </div>
            `;
        }

        panel.innerHTML = html;
    },

    updateClipProp: (clipId, prop, value) => {
        const clip = montazystaApp.findClip(clipId);
        if(!clip) return;
        let v = value;
        if(prop !== 'text' && prop !== 'fontColor' && prop !== 'outlineColor') v = parseFloat(value);
        clip[prop] = v;
        if(prop === 'start' || prop === 'duration') clip.end = clip.start + clip.duration;
        montazystaApp.renderTimeline();
    },

    updateClipFilter: (clipId, prop, value) => {
        const clip = montazystaApp.findClip(clipId);
        if(!clip) return;
        if(!clip.filters) clip.filters = {};
        clip.filters[prop] = prop === 'chromaKey' ? value : parseFloat(value);
    },

    // ==================================================================
    // EKSPORT NATYWNY WEBM (ZASTĘPSTWO DLA FFMPEG)
    // ==================================================================
    showExportModal: () => {
        const modalId = 'mz-export-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center backdrop-blur-md p-4';
        
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-sm w-full border g-border">
                <h2 class="text-xl font-bold g-text mb-4 border-b g-border pb-2 flex items-center gap-2"><span>🎬</span> Eksport Wideo</h2>
                
                <div class="mb-4">
                    <label class="block text-[10px] uppercase font-bold g-text-muted mb-1 tracking-wider">Nazwa Pliku</label>
                    <input type="text" id="mz-exp-name" value="${montazystaApp.project.name}" class="w-full p-2.5 g-bg g-text border g-border rounded outline-none focus:border-blue-500 font-bold shadow-inner text-sm">
                </div>
                
                <div class="mb-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs g-text-muted">
                    <span class="font-bold text-blue-400">Silnik Natywny:</span> Film zostanie wyrenderowany w czasie rzeczywistym do formatu <b>.webm</b> (kompatybilny ze wszystkimi przeglądarkami). Proszę nie minimalizować okna w trakcie procesu!
                </div>

                <div class="flex justify-end gap-2 shrink-0">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-5 py-2.5 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border shadow-sm text-xs font-bold">Anuluj</button>
                    <button onclick="montazystaApp.exportToPC()" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-600/30 transition font-bold border border-blue-700 text-xs">💾 Na dysk PC</button>
                    <button onclick="montazystaApp.exportToBigOS()" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-600/30 transition font-bold border border-emerald-700 text-xs">📥 Do BigOS</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    runNativeExport: async () => {
        return new Promise((resolve, reject) => {
            montazystaApp.isExporting = true;
            if(typeof apps !== 'undefined') apps.showToast('Render', 'Rozpoczęto nagrywanie w czasie rzeczywistym. Proszę nie zamykać okna!', 'info');

            const canvas = montazystaApp.previewCanvas;
            const stream = canvas.captureStream(montazystaApp.project.fps || 30);

            let recorder;
            try { recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' }); }
            catch(e) {
                try { recorder = new MediaRecorder(stream, { mimeType: 'video/webm' }); }
                catch(e2) { recorder = new MediaRecorder(stream); }
            }

            const chunks = [];
            recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                montazystaApp.isExporting = false;
                resolve(blob);
            };

            // Ustawienie na start i odtwarzanie
            montazystaApp.timeline.time = 0;
            montazystaApp.timeline.isPlaying = true;
            
            Object.values(montazystaApp.mediaCache).forEach(m => { 
                if(m.el && m.el.pause) {
                    m.el.pause(); 
                    m.el.currentTime = 0;
                }
            });

            recorder.start();

            const checkInterval = setInterval(() => {
                const progress = montazystaApp.timeline.time / montazystaApp.project.duration;
                const expStatus = document.getElementById('montazysta-export-status');
                if (expStatus) expStatus.innerHTML = `<span class="text-blue-400">⏳ Nagrywanie: ${Math.round(progress * 100)}%</span>`;

                if (montazystaApp.timeline.time >= montazystaApp.project.duration || !montazystaApp.timeline.isPlaying) {
                    clearInterval(checkInterval);
                    if (recorder.state !== 'inactive') recorder.stop();
                    montazystaApp.timeline.isPlaying = false;
                    montazystaApp.timeline.time = 0;
                    montazystaApp.renderTimeline();
                    if (expStatus) expStatus.innerHTML = '';
                }
            }, 500);
        });
    },

    exportToPC: async () => {
        document.getElementById('mz-export-modal')?.remove();
        if (montazystaApp.project.tracks.every(t => t.items.length === 0)) return typeof apps !== 'undefined' ? apps.showToast('Błąd', 'Oś czasu jest pusta!', 'error') : null;
        
        const status = document.getElementById('montazysta-export-status');
        if(status) status.textContent = '⏳ Przygotowywanie plików...';

        try {
            const blob = await montazystaApp.runNativeExport();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const nameInput = document.getElementById('mz-exp-name');
            a.download = (nameInput ? nameInput.value : montazystaApp.project.name) + '.webm';
            a.click();
            URL.revokeObjectURL(url);
            if(typeof apps !== 'undefined') apps.showToast('Sukces', 'Wyeksportowano na PC!', 'success');
        } catch (e) {
            console.error(e);
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Renderowanie nie powiodło się.', 'error');
        }
        if(status) status.textContent = '';
    },

    exportToBigOS: async () => {
        document.getElementById('mz-export-modal')?.remove();
        if (montazystaApp.project.tracks.every(t => t.items.length === 0)) return typeof apps !== 'undefined' ? apps.showToast('Błąd', 'Oś czasu jest pusta!', 'error') : null;
        
        const status = document.getElementById('montazysta-export-status');
        if(status) status.textContent = '⏳ Przygotowywanie plików...';

        try {
            const blob = await montazystaApp.runNativeExport();
            const reader = new FileReader();
            reader.onload = () => {
                const nameInput = document.getElementById('mz-exp-name');
                const finalName = (nameInput ? nameInput.value : montazystaApp.project.name) + '.webm';
                
                if (typeof fileSystem !== 'undefined') {
                    fileSystem.push({
                        id: 'vid_' + Date.now(),
                        type: 'file', name: finalName, icon: '🎬',
                        content: reader.result, parentId: 'root', x: 40, y: 40
                    });
                    if(typeof fsManager !== 'undefined') fsManager.save();
                    if(typeof desktop !== 'undefined') desktop.render();
                }
                if(typeof apps !== 'undefined') apps.showToast('Sukces', 'Zapisano plik w systemie BigOS!', 'success');
            };
            reader.readAsDataURL(blob);
        } catch (e) {
            console.error(e);
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Renderowanie nie powiodło się.', 'error');
        }
        if(status) status.textContent = '';
    }
};

setTimeout(() => {
    if (typeof window !== 'undefined') window.montazystaApp = montazystaApp;
    montazystaApp.init();
}, 500);