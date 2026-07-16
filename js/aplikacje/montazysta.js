// ======================================================================
// PLIK: js/aplikacje/montazysta.js (Montażysta PRO - Zaawansowany Edytor Wideo)
// ======================================================================

window.montazystaApp = {
    _initialized: false,
    ffmpeg: null,
    isFFmpegLoaded: false,
    isExporting: false,

    // ==================================================================
    // 1. STAN PROJEKTU (MODEL DANYCH)
    // ==================================================================
    project: {
        name: "Mój_Montaż",
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 30, // w sekundach (domyślnie 30s)
        tracks: [
            { id: 'tr_v2', type: 'video', name: 'Wideo 2 (Nakładki)', items: [], zIndex: 3 },
            { id: 'tr_v1', type: 'video', name: 'Wideo 1 (Główne)', items: [], zIndex: 2 },
            { id: 'tr_t1', type: 'text', name: 'Napisy / Tekst', items: [], zIndex: 4 },
            { id: 'tr_a1', type: 'audio', name: 'Audio 1 (Główne)', items: [], zIndex: 1 },
            { id: 'tr_a2', type: 'audio', name: 'Audio 2 (SFX/Muzyka)', items: [], zIndex: 0 }
        ]
    },

    library: [], // Zaimportowane pliki (Video, Audio, Obrazy)
    
    // Stan Osi Czasu i Odtwarzacza
    timeline: {
        time: 0,
        isPlaying: false,
        zoom: 10, // px na sekundę
        scrollX: 0,
        selectedItemId: null,
        clipboard: null
    },

    // Cache obiektów multimedialnych do podglądu (ukryte <video>, <audio>, <img>)
    mediaCache: {}, 
    previewCanvas: null,
    previewCtx: null,
    renderLoopId: null,

    // Zmienne do przeciągania na osi czasu
    dragState: null, // null, 'move', 'trimStart', 'trimEnd', 'playhead'

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
        
        // --- FFMPEG ---
        if (!window.FFmpeg) {
            const script = document.createElement('script');
            script.src = "https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js";
            document.head.appendChild(script);
            script.onload = () => montazystaApp.loadFFmpeg();
        } else {
            montazystaApp.loadFFmpeg();
        }

        if (typeof winManager !== 'undefined' && winManager.register) {
            winManager.register('app-montazysta');
        }

        window.addEventListener('keydown', montazystaApp.handleShortcuts);
    },

    close: () => {
        montazystaApp.timeline.isPlaying = false;
        if(montazystaApp.renderLoopId) cancelAnimationFrame(montazystaApp.renderLoopId);
        
        // Zwalnianie pamięci
        Object.values(montazystaApp.mediaCache).forEach(media => {
            if(media.el) {
                media.el.pause();
                media.el.src = '';
                media.el.remove();
            }
            if(media.url && media.isLocal) URL.revokeObjectURL(media.url);
        });
        montazystaApp.mediaCache = {};
        
        const win = document.getElementById('app-montazysta');
        if (win) win.remove();
        montazystaApp._initialized = false;
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
        exportVideo: (res = "1080p", format = "mp4", target = 'bigos') => {
            const map = {"720p": 720, "1080p": 1080, "1440p": 1440, "4K": 2160};
            montazystaApp.project.height = map[res] || 1080;
            montazystaApp.project.width = Math.round(montazystaApp.project.height * (16/9));
            if (target === 'pc') montazystaApp.exportToPC(format);
            else montazystaApp.exportToBigOS(format);
        },
        playPause: () => montazystaApp.togglePlay(),
        seek: (timeSeconds) => { montazystaApp.timeline.time = timeSeconds; montazystaApp.renderTimeline(); }
    },

    // ==================================================================
    // ŁADOWANIE FFMPEG
    // ==================================================================
    loadFFmpeg: async () => {
        if (montazystaApp.isFFmpegLoaded) return;
        const status = document.getElementById('montazysta-ffmpeg-status');
        if (status) status.innerHTML = '<span class="text-blue-400 animate-pulse">⏳ Ładowanie FFmpeg...</span>';
        try {
            const { createFFmpeg } = FFmpeg;
            montazystaApp.ffmpeg = createFFmpeg({ log: false, corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js' });
            await montazystaApp.ffmpeg.load();
            montazystaApp.isFFmpegLoaded = true;
            if (status) status.innerHTML = '<span class="text-emerald-400 font-bold">✅ Render gotowy</span>';
        } catch(e) {
            console.error(e);
            if (status) status.innerHTML = '<span class="text-red-400 font-bold">❌ Błąd FFmpeg</span>';
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
                                <button onclick="document.getElementById('mz-import-pc').click()" class="text-left px-4 py-1.5 hover:bg-emerald-600 hover:text-white transition text-xs text-emerald-400">Importuj z komputera...</button>
                            </div>
                        </div>
                        <div class="relative group">
                            <button class="g-text text-xs hover:bg-white/10 px-2 py-1 rounded transition font-bold">Edycja</button>
                            <div class="absolute left-0 top-full hidden group-hover:flex flex-col g-panel border g-border shadow-2xl rounded py-1 z-50 min-w-[150px]">
                                <button onclick="montazystaApp.copyClip()" class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs">Kopiuj (Ctrl+C)</button>
                                <button onclick="montazystaApp.pasteClip()" class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs">Wklej (Ctrl+V)</button>
                                <button onclick="montazystaApp.deleteClip()" class="text-left px-4 py-1.5 hover:bg-red-500 hover:text-white transition text-xs text-red-400">Usuń (Del)</button>
                                <div class="border-t g-border my-1"></div>
                                <button onclick="montazystaApp.splitClip()" class="text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition text-xs font-bold">Podziel w miejscu kursora (S)</button>
                            </div>
                        </div>
                        <div class="relative group">
                            <button class="g-text text-xs hover:bg-white/10 px-2 py-1 rounded transition font-bold text-blue-400">Eksport</button>
                            <div class="absolute left-0 top-full hidden group-hover:flex flex-col g-panel border g-border shadow-2xl rounded py-1 z-50 min-w-[220px]">
                                <button onclick="montazystaApp.showExportModal()" class="text-left px-4 py-2 hover:bg-blue-600 hover:text-white transition text-sm font-bold bg-blue-500/20 text-blue-400">🎬 Renderuj Wideo...</button>
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

            <!-- GÓRNA SEKCJA (Biblioteka + Podgląd + Właściwości) -->
            <div class="flex h-[45%] border-b g-border shrink-0 bg-black/10">
                
                <!-- BIBLIOTEKA (Lewo) -->
                <div class="w-[25%] min-w-[200px] border-r g-border flex flex-col bg-black/20">
                    <div class="p-2 border-b g-border flex justify-between items-center bg-black/30 shrink-0">
                        <span class="text-xs font-bold g-text uppercase tracking-widest">Zasoby</span>
                        <button onclick="document.getElementById('mz-import-pc').click()" class="g-btn text-[10px] px-2 py-1 rounded bg-blue-600/20 border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white">Importuj</button>
                    </div>
                    <div id="mz-library-list" class="flex-grow overflow-y-auto custom-scrollbar p-2 flex flex-col gap-2">
                        <div class="text-center text-[10px] g-text-muted mt-10">Pusto. Importuj media.</div>
                    </div>
                </div>

                <!-- PODGLĄD (Środek) -->
                <div class="flex-grow flex flex-col bg-black relative overflow-hidden">
                    <div class="absolute inset-0 flex items-center justify-center p-2" id="mz-preview-container">
                        <!-- Zamiast tagu video, rysujemy wszystko na Canvas w 60fps -->
                        <canvas id="mz-preview-canvas" class="max-w-full max-h-full shadow-2xl bg-black border border-gray-700 aspect-video"></canvas>
                        
                        <!-- Overlay do rysowania siatki i kontrolek transformacji na podglądzie -->
                        <div id="mz-canvas-overlay" class="absolute inset-0 pointer-events-none flex items-center justify-center hidden">
                            <div class="w-full h-full max-w-[100%] max-h-[100%] border border-dashed border-gray-500/50 grid grid-cols-3 grid-rows-3" style="aspect-ratio: 16/9;">
                                <div class="border-r border-b border-gray-500/30"></div><div class="border-r border-b border-gray-500/30"></div><div class="border-b border-gray-500/30"></div>
                                <div class="border-r border-b border-gray-500/30"></div><div class="border-r border-b border-gray-500/30"></div><div class="border-b border-gray-500/30"></div>
                                <div class="border-r border-gray-500/30"></div><div class="border-r border-gray-500/30"></div><div></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Pasek Transportu -->
                    <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 flex justify-center gap-4 items-center">
                        <span id="mz-time-display" class="font-mono text-xs g-text font-bold w-20 text-right">00:00.00</span>
                        <button onclick="montazystaApp.togglePlay()" id="mz-btn-play" class="text-white text-3xl hover:text-blue-400 hover:scale-110 transition drop-shadow-md">▶</button>
                        <button onclick="montazystaApp.toggleGrid()" class="g-icon-btn text-xs px-2 border g-border rounded bg-black/50 hover:bg-white/20"># Siatka</button>
                    </div>
                </div>

                <!-- WŁAŚCIWOŚCI (Prawo) -->
                <div class="w-[25%] min-w-[240px] border-l g-border flex flex-col bg-black/20 overflow-hidden">
                    <div class="p-2 border-b g-border bg-black/30 shrink-0">
                        <span class="text-xs font-bold g-text uppercase tracking-widest">Właściwości</span>
                    </div>
                    <div id="mz-properties-panel" class="flex-grow overflow-y-auto custom-scrollbar p-3 flex flex-col gap-4">
                        <div class="text-center text-[10px] g-text-muted mt-10">Zaznacz klip na osi czasu.</div>
                    </div>
                </div>

            </div>

            <!-- DOLNA SEKCJA (Oś Czasu / Timeline) -->
            <div class="flex-grow flex flex-col bg-[#1e1e1e] relative">
                
                <!-- Pasek Narzędzi Osi Czasu -->
                <div class="h-8 bg-black/30 border-b g-border flex items-center px-2 gap-2 shrink-0 z-20">
                    <button class="g-icon-btn hover:text-white px-2" title="Wybór (V)">↖</button>
                    <button class="g-icon-btn hover:text-red-400 px-2" onclick="montazystaApp.splitClip()" title="Podziel w miejscu kursora (S)">✂️</button>
                    <button class="g-icon-btn hover:text-red-400 px-2" onclick="montazystaApp.deleteClip()" title="Usuń zaznaczony (Del)">🗑️</button>
                    <div class="w-px h-4 bg-gray-600 mx-1"></div>
                    <button class="g-btn text-[10px] px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border-blue-500/50 hover:bg-blue-500 hover:text-white font-bold" onclick="montazystaApp.api.addText('tr_t1', 'Nowy Tekst', montazystaApp.timeline.time, 5)">+ Dodaj Tekst</button>
                    
                    <div class="ml-auto flex items-center gap-2">
                        <span class="text-[10px] g-text-muted font-bold">Skala:</span>
                        <input type="range" min="1" max="50" value="10" class="w-24 h-1.5 g-range rounded appearance-none" oninput="montazystaApp.timeline.zoom = parseInt(this.value); montazystaApp.renderTimeline();">
                    </div>
                </div>

                <!-- Kontener Osi Czasu (Lewo: Nagłówki, Prawo: Tracki) -->
                <div class="flex-grow flex overflow-hidden relative">
                    <!-- Nagłówki Ścieżek -->
                    <div id="mz-track-headers" class="w-[120px] bg-black/40 border-r g-border flex flex-col shrink-0 overflow-hidden z-20 relative"></div>
                    
                    <!-- Właściwa Oś Czasu (Z przewijaniem) -->
                    <div id="mz-timeline-scroll" class="flex-grow overflow-auto custom-scrollbar relative" onscroll="montazystaApp.syncTimelineScroll(this)">
                        
                        <!-- Linijka Czasu -->
                        <div id="mz-timeline-ruler" class="h-6 bg-black/20 border-b g-border relative sticky top-0 z-10 w-[5000px] cursor-pointer" onmousedown="montazystaApp.handleRulerClick(event)"></div>
                        
                        <!-- Kontener na klipy -->
                        <div id="mz-timeline-tracks" class="relative w-[5000px] flex flex-col"></div>
                        
                        <!-- Głowa odtwarzania (Playhead) -->
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
    // SILNIK RENDEROWANIA (CANVAS 60FPS)
    // ==================================================================
    initPreviewEngine: () => {
        montazystaApp.previewCanvas = document.getElementById('mz-preview-canvas');
        montazystaApp.previewCtx = montazystaApp.previewCanvas.getContext('2d');
        
        montazystaApp.previewCanvas.width = montazystaApp.project.width;
        montazystaApp.previewCanvas.height = montazystaApp.project.height;

        const loop = () => {
            if (montazystaApp.timeline.isPlaying) {
                montazystaApp.timeline.time += 1 / montazystaApp.project.fps;
                if (montazystaApp.timeline.time > montazystaApp.project.duration) {
                    montazystaApp.togglePlay(); // Stop
                    montazystaApp.timeline.time = montazystaApp.project.duration;
                }
                montazystaApp.renderTimeline();
                document.getElementById('mz-time-display').innerText = montazystaApp.formatTime(montazystaApp.timeline.time);
            }
            montazystaApp.renderCanvasFrame();
            montazystaApp.renderLoopId = requestAnimationFrame(loop);
        };
        loop();
    },

    renderCanvasFrame: () => {
        const ctx = montazystaApp.previewCtx;
        const w = montazystaApp.project.width;
        const h = montazystaApp.project.height;
        const cTime = montazystaApp.timeline.time;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);

        // Zbieramy wszystkie widoczne klipy
        let activeClips = [];
        montazystaApp.project.tracks.forEach(track => {
            track.items.forEach(item => {
                if (cTime >= item.start && cTime < item.end) {
                    activeClips.push({ clip: item, trackZ: track.zIndex });
                }
            });
        });

        // Sortowanie po z-index (Audio nie ma z-indexu graficznego, ale je filtrujemy)
        activeClips.sort((a, b) => a.trackZ - b.trackZ);

        activeClips.forEach(entry => {
            const clip = entry.clip;
            
            if (clip.type === 'video' || clip.type === 'image') {
                const media = montazystaApp.mediaCache[clip.libId];
                if (media && media.el) {
                    if (clip.type === 'video') {
                        // Synchronizacja wideo
                        const localTime = (cTime - clip.start) + (clip.trimStart || 0);
                        if (Math.abs(media.el.currentTime - localTime) > 0.1) {
                            media.el.currentTime = localTime;
                        }
                        if (montazystaApp.timeline.isPlaying && media.el.paused) media.el.play().catch(()=>{});
                        else if (!montazystaApp.timeline.isPlaying && !media.el.paused) media.el.pause();
                    }

                    ctx.save();
                    // Transformacje
                    let px = clip.x !== undefined ? clip.x : w/2;
                    let py = clip.y !== undefined ? clip.y : h/2;
                    let scale = clip.scale !== undefined ? clip.scale : 1;
                    let rot = clip.rotation || 0;
                    let op = clip.opacity !== undefined ? clip.opacity/100 : 1;
                    
                    ctx.globalAlpha = op;
                    ctx.translate(px, py);
                    ctx.rotate(rot * Math.PI / 180);
                    ctx.scale(scale, scale);

                    // Efekty
                    if (clip.filters) {
                        ctx.filter = `brightness(${clip.filters.brightness||100}%) contrast(${clip.filters.contrast||100}%) saturate(${clip.filters.saturate||100}%)`;
                    }

                    // Rysowanie z wyśrodkowaniem
                    let drawW = media.el.videoWidth || media.el.naturalWidth || w;
                    let drawH = media.el.videoHeight || media.el.naturalHeight || h;
                    
                    // Skalowanie proporcjonalne domyślnie by pasowało do projektu
                    let ratio = Math.min(w / drawW, h / drawH);
                    drawW *= ratio; drawH *= ratio;

                    ctx.drawImage(media.el, -drawW/2, -drawH/2, drawW, drawH);
                    
                    // Chroma Key (Prymitywna symulacja na Canvasie do podglądu - FFmpeg zrobi to lepiej)
                    if (clip.filters && clip.filters.chromaKey) {
                        // Ze względu na wydajność w przeglądarce, pomijamy pixel-perfect chroma keying w podglądzie w czasie rzeczywistym
                        // (Wymagałoby to get/putImageData na każdej klatce co zabiłoby FPS)
                        // Pełny Chroma Key zostanie zaimplementowany w generatorze FFmpeg
                    }

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
                    if (Math.abs(media.el.currentTime - localTime) > 0.1) media.el.currentTime = localTime;
                    
                    media.el.volume = (clip.volume !== undefined ? clip.volume : 100) / 100;
                    
                    if (montazystaApp.timeline.isPlaying && media.el.paused) media.el.play().catch(()=>{});
                    else if (!montazystaApp.timeline.isPlaying && !media.el.paused) media.el.pause();
                }
            }
        });

        // Wyciszanie multimediów które NIE SĄ aktywne w danej sekundzie
        Object.values(montazystaApp.mediaCache).forEach(media => {
            if (media.el && media.type !== 'image') {
                let isActive = activeClips.some(e => e.clip.libId === media.id);
                if (!isActive && !media.el.paused) media.el.pause();
            }
        });
    },

    // ==================================================================
    // STEROWANIE
    // ==================================================================
    togglePlay: () => {
        montazystaApp.timeline.isPlaying = !montazystaApp.timeline.isPlaying;
        document.getElementById('mz-btn-play').innerText = montazystaApp.timeline.isPlaying ? '⏸' : '▶';
        if (!montazystaApp.timeline.isPlaying) {
            // Pauzuj wszystko
            Object.values(montazystaApp.mediaCache).forEach(m => { if(m.el && m.el.pause) m.el.pause(); });
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
    // OŚ CZASU (TIMELINE) I RENDEROWANIE KLIPÓW
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
            // Nagłówek ścieżki
            const hDiv = document.createElement('div');
            hDiv.className = 'h-16 border-b g-border bg-black/40 p-2 flex flex-col justify-center';
            let icon = track.type === 'video' ? '🎬' : (track.type === 'audio' ? '🎵' : '🔤');
            hDiv.innerHTML = `<span class="text-[10px] font-bold g-text uppercase tracking-wider truncate" title="${track.name}">${icon} ${track.name}</span>`;
            headers.appendChild(hDiv);

            // Ciało ścieżki
            const tDiv = document.createElement('div');
            tDiv.className = 'h-16 border-b border-gray-600/30 bg-black/20 relative group';
            tDiv.ondragover = e => e.preventDefault();
            tDiv.ondrop = e => montazystaApp.handleTimelineDrop(e, track.id);

            // Klipy na ścieżce
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

    splitClip: () => {
        const clipId = montazystaApp.timeline.selectedItemId;
        if(!clipId) return;
        const track = montazystaApp.findTrackByClipId(clipId);
        const clip = track.items.find(i => i.id === clipId);
        
        const cTime = montazystaApp.timeline.time;
        if (cTime > clip.start && cTime < clip.end) {
            const firstPartDur = cTime - clip.start;
            const newClip = JSON.parse(JSON.stringify(clip));
            
            newClip.id = 'c_' + Date.now();
            newClip.start = cTime;
            newClip.duration = clip.end - cTime;
            newClip.trimStart = (clip.trimStart || 0) + firstPartDur;
            
            clip.end = cTime;
            clip.duration = firstPartDur;
            
            track.items.push(newClip);
            montazystaApp.renderAll();
        }
    },

    copyClip: () => {
        const clip = montazystaApp.findClip(montazystaApp.timeline.selectedItemId);
        if(clip) {
            montazystaApp.timeline.clipboard = JSON.parse(JSON.stringify(clip));
            if(typeof apps !== 'undefined') apps.showToast('Skopiowano', 'Klip skopiowany do schowka', 'info');
        }
    },

    pasteClip: () => {
        if(!montazystaApp.timeline.clipboard) return;
        const newClip = JSON.parse(JSON.stringify(montazystaApp.timeline.clipboard));
        newClip.id = 'c_' + Date.now();
        newClip.start = montazystaApp.timeline.time;
        newClip.end = newClip.start + newClip.duration;
        
        // Szukamy odpowiedniego tracka
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

    // ==================================================================
    // DRAG & DROP W TIMELINE ORAZ TRIMOWANIE
    // ==================================================================
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
            // Automatyczne wydłużanie projektu jeśli klip wykracza poza koniec
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
        const initialDuration = clip.duration;
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
                // Jeśli to plik z biblioteki, przesuwamy punkt startowy źródła
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

        const dur = libItem.duration || 5; // Domyślnie 5s dla obrazów
        
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

        // Dodatkowe właściwości dla Video/Obrazów
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
            
            const libItem = { id: 'lib_' + Date.now() + Math.random(), type: type, name: f.name, url: url, isLocal: true, duration: 5 };
            
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
            v.src = libItem.url; v.muted = true; v.crossOrigin = "anonymous";
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
                ${genInput('Start', 'start', 'number', 0.1)}
                ${genInput('Długość', 'duration', 'number', 0.1)}
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
    // EKSPORT I GENEROWANIE KOMENDY FFMPEG
    // ==================================================================
    showExportModal: () => {
        if (!window.JSZip || !montazystaApp.isFFmpegLoaded) return typeof apps !== 'undefined' ? apps.showToast('Błąd', 'Silnik FFmpeg.wasm ładuje się. Poczekaj.', 'error') : null;
        
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
                
                <div class="grid grid-cols-2 gap-3 mb-6">
                    <div>
                        <label class="block text-[10px] uppercase font-bold g-text-muted mb-1 tracking-wider">Rozdzielczość</label>
                        <select id="mz-exp-res" class="w-full p-2.5 g-bg g-text border g-border rounded outline-none cursor-pointer font-bold text-xs">
                            <option value="720">HD 720p</option>
                            <option value="1080" selected>Full HD 1080p</option>
                            <option value="1440">QHD 1440p</option>
                            <option value="2160">4K UHD</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase font-bold g-text-muted mb-1 tracking-wider">Format / Kodek</label>
                        <select id="mz-exp-fmt" class="w-full p-2.5 g-bg g-text border g-border rounded outline-none cursor-pointer font-bold text-xs">
                            <option value="mp4" selected>MP4 (H.264)</option>
                            <option value="webm">WebM (VP8)</option>
                            <option value="gif">GIF (Animacja)</option>
                        </select>
                    </div>
                </div>

                <div class="flex justify-end gap-2 shrink-0">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-5 py-2.5 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border shadow-sm text-xs font-bold">Anuluj</button>
                    <button onclick="montazystaApp.exportToPC(document.getElementById('mz-exp-fmt').value)" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-600/30 transition font-bold border border-blue-700 text-xs">💾 Na Dysk PC</button>
                    <button onclick="montazystaApp.exportToBigOS(document.getElementById('mz-exp-fmt').value)" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-600/30 transition font-bold border border-emerald-700 text-xs">📥 Do BigOS</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    runFFmpegExport: async (format) => {
        const { fetchFile } = FFmpeg;
        const ffmpeg = montazystaApp.ffmpeg;
        montazystaApp.isExporting = true;

        if(typeof apps !== 'undefined') apps.showToast('Render', 'Przygotowywanie plików multimedialnych dla FFmpeg.wasm...', 'info');

        // 1. Załadowanie plików do FS FFmpeg
        let inputFiles = [];
        for (let i=0; i<montazystaApp.library.length; i++) {
            let libItem = montazystaApp.library[i];
            let filename = `input_${i}.${libItem.type === 'video' ? 'mp4' : (libItem.type === 'audio' ? 'mp3' : 'png')}`;
            inputFiles.push({ id: libItem.id, fname: filename, type: libItem.type });
            
            let data;
            if(libItem.isLocal && libItem.fileObj) data = await fetchFile(libItem.fileObj);
            else if(libItem.url.startsWith('data:')) data = await fetchFile(libItem.url);
            else data = await fetchFile(await (await fetch(libItem.url)).blob());
            
            ffmpeg.FS('writeFile', filename, data);
        }

        // 2. Budowa polecenia FFmpeg
        let args = [];
        inputFiles.forEach(f => { args.push('-i', f.fname); });
        
        // --- BUDOWA FILTER_COMPLEX ---
        let filterGraph = [];
        let videoStreams = []; // ['0:v', '1:v']
        let audioStreams = []; // ['0:a']
        
        let outW = montazystaApp.project.width;
        let outH = montazystaApp.project.height;

        // Tło projektu
        filterGraph.push(`color=c=black:s=${outW}x${outH}:d=${montazystaApp.project.duration}[bg];`);
        let lastOut = 'bg';
        let overlayCount = 0;

        // Zbieramy aktywne klipy wideo/obrazy posortowane by zIndex (od najniższego - tła, do wierzchu)
        let visualClips = [];
        montazystaApp.project.tracks.filter(t => t.type === 'video' || t.type === 'image' || t.type === 'text').forEach(track => {
            track.items.forEach(clip => visualClips.push({ clip, zIndex: track.zIndex, type: track.type }));
        });
        visualClips.sort((a,b) => a.zIndex - b.zIndex);

        // Składanie wizualne
        visualClips.forEach(entry => {
            const c = entry.clip;
            if (entry.type === 'text') {
                // Rysowanie tekstu nakładką drawtext
                const txt = c.text.replace(/'/g, "'\\''").replace(/:/g, '\\:');
                // Prosty drawtext
                let newOut = `v${overlayCount++}`;
                filterGraph.push(`[${lastOut}]drawtext=text='${txt}':x=${c.x}:y=${c.y}:fontsize=${c.fontSize}:fontcolor=${c.fontColor}:enable='between(t,${c.start},${c.end})'[${newOut}];`);
                lastOut = newOut;
            } else {
                let inputObj = inputFiles.find(f => f.id === c.libId);
                if(!inputObj) return;
                let inIdx = inputFiles.indexOf(inputObj);
                
                let scaleW = Math.round(outW * (c.scale || 1));
                let scaleH = Math.round(outH * (c.scale || 1));
                
                let streamName = `clip_${overlayCount}`;
                let pts = `PTS-STARTPTS+${c.start}/TB`;
                
                // Trimming i skalowanie wejścia
                if (c.type === 'video') {
                    filterGraph.push(`[${inIdx}:v]trim=start=${c.trimStart || 0}:duration=${c.duration},setpts=${pts},scale=${scaleW}:${scaleH}`);
                } else {
                    filterGraph.push(`[${inIdx}:v]scale=${scaleW}:${scaleH}`);
                }

                // Chroma Key
                if (c.filters && c.filters.chromaKey) {
                    filterGraph.push(`,colorkey=0x00FF00:0.3:0.2`); // Zakładamy idealny zielony, podobieństwo 30%
                }

                // Color correction
                if (c.filters) {
                    let eq = `eq=brightness=${((c.filters.brightness||100)-100)/100}:contrast=${(c.filters.contrast||100)/100}:saturation=${(c.filters.saturate||100)/100}`;
                    filterGraph.push(`,${eq}`);
                }

                filterGraph.push(`[${streamName}];`);

                // Nakładanie (Overlay) na główny bufor w danym czasie
                let newOut = `v${overlayCount++}`;
                filterGraph.push(`[${lastOut}][${streamName}]overlay=x=${c.x - scaleW/2}:y=${c.y - scaleH/2}:enable='between(t,${c.start},${c.end})'[${newOut}];`);
                lastOut = newOut;
            }
        });

        // Składanie Audio
        let audioClips = [];
        montazystaApp.project.tracks.filter(t => t.type === 'audio' || t.type === 'video').forEach(track => {
            track.items.forEach(clip => {
                let inputObj = inputFiles.find(f => f.id === clip.libId);
                if(inputObj && (inputObj.type === 'audio' || inputObj.type === 'video')) {
                    audioClips.push(clip);
                }
            });
        });

        let audioOut = null;
        if (audioClips.length > 0) {
            let amixInputs = "";
            audioClips.forEach((c, idx) => {
                let inIdx = inputFiles.findIndex(f => f.id === c.libId);
                let aStream = `a_${idx}`;
                // Trim + Delay (Aresample dla zgodności i adelay)
                filterGraph.push(`[${inIdx}:a]atrim=start=${c.trimStart||0}:duration=${c.duration},asetpts=PTS-STARTPTS,adelay=${c.start*1000}|${c.start*1000},volume=${c.volume/100}[${aStream}];`);
                amixInputs += `[${aStream}]`;
            });
            audioOut = 'aout';
            filterGraph.push(`${amixInputs}amix=inputs=${audioClips.length}:duration=longest[${audioOut}]`);
        }

        // --- SKŁADANIE ARGUMENTÓW ---
        let complexStr = filterGraph.join('').replace(/;$/, '');
        if (complexStr) {
            args.push('-filter_complex', complexStr);
            args.push('-map', `[${lastOut}]`);
            if (audioOut) args.push('-map', `[${audioOut}]`);
        }

        let outName = `output.${format}`;
        
        // Parametry kodeka
        if (format === 'mp4') {
            args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-c:a', 'aac', '-b:a', '128k', '-t', montazystaApp.project.duration.toString());
        } else if (format === 'gif') {
            args.push('-r', '15', '-t', montazystaApp.project.duration.toString());
        } else if (format === 'webm') {
            args.push('-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0', '-c:a', 'libopus', '-t', montazystaApp.project.duration.toString());
        }
        
        args.push(outName);

        console.log("FFmpeg Args:", args);
        if(typeof apps !== 'undefined') apps.showToast('Render', 'Rozpoczęto kompilację wideo. Procesor jest obciążony.', 'info');

        await ffmpeg.run(...args);
        
        const data = ffmpeg.FS('readFile', outName);
        montazystaApp.isExporting = false;
        
        // Czyszczenie pamięci FS
        try { 
            inputFiles.forEach(f => ffmpeg.FS('unlink', f.fname)); 
            ffmpeg.FS('unlink', outName); 
        } catch(e){}

        let mime = format === 'mp4' ? 'video/mp4' : (format === 'webm' ? 'video/webm' : 'image/gif');
        return new Blob([data.buffer], { type: mime });
    },

    exportToPC: async (format) => {
        document.getElementById('mz-export-modal')?.remove();
        if (montazystaApp.project.tracks.every(t => t.items.length === 0)) return typeof apps !== 'undefined' ? apps.showToast('Błąd', 'Oś czasu jest pusta!', 'error') : null;
        
        try {
            const blob = await montazystaApp.runFFmpegExport(format);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const nameInput = document.getElementById('mz-exp-name');
            a.download = (nameInput ? nameInput.value : montazystaApp.project.name) + '.' + format;
            a.click();
            URL.revokeObjectURL(url);
            if(typeof apps !== 'undefined') apps.showToast('Sukces', 'Wyeksportowano na PC!', 'success');
        } catch (e) {
            console.error(e);
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Renderowanie nie powiodło się.', 'error');
        }
    },

    exportToBigOS: async (format) => {
        document.getElementById('mz-export-modal')?.remove();
        if (montazystaApp.project.tracks.every(t => t.items.length === 0)) return typeof apps !== 'undefined' ? apps.showToast('Błąd', 'Oś czasu jest pusta!', 'error') : null;
        
        try {
            const blob = await montazystaApp.runFFmpegExport(format);
            const reader = new FileReader();
            reader.onload = () => {
                const nameInput = document.getElementById('mz-exp-name');
                const finalName = (nameInput ? nameInput.value : montazystaApp.project.name) + '.' + format;
                
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
    }
};

setTimeout(() => {
    if (typeof window !== 'undefined') window.montazystaApp = montazystaApp;
    montazystaApp.init();
}, 500);