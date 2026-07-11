// ======================================================================
// PLIK: js/aplikacje/patrzalka.js (Patrzałka PRO - Lightroom / Photoshop Edition)
// ======================================================================

const patrzalkaApp = {
    currentImageId: null,
    currentTab: 'gallery', 
    currentAlbum: 'all', 
    
    // Stany podglądu (Nie zapisywane w historii)
    zoom: 1, panX: 0, panY: 0,
    isDragging: false, startMouseX: 0, startMouseY: 0, startPanX: 0, startPanY: 0,
    
    // Stany Transformacji i Filtrów (Zapisywane w historii)
    rotate: 0, flipX: 1, flipY: 1,
    filters: { brightness: 100, contrast: 100, saturate: 100, sepia: 0, grayscale: 0, invert: 0, blur: 0, hue: 0 },

    // HISTORIA EDYCJI W STYLU PHOTOSHOP
    editHistory: [],
    historyIndex: -1,

    // Metadane zdjęć
    metaDB: {},
    slideshowTimer: null,
    slideshowList: [],
    slideshowIndex: 0,

    init: () => {
        try {
            const savedMeta = localStorage.getItem('bigos_patrzalka_meta');
            if (savedMeta) patrzalkaApp.metaDB = JSON.parse(savedMeta);
        } catch(e) {}

        if (!window.EXIF) {
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/exif-js";
            document.head.appendChild(script);
        }

        patrzalkaApp.upgradeUI();
        patrzalkaApp.renderGallery();
        patrzalkaApp.renderAlbumsSidebar();
        
        const container = document.getElementById('pat-img-container');
        if (container) {
            container.addEventListener('wheel', (e) => {
                e.preventDefault();
                let delta = e.deltaY > 0 ? -0.1 : 0.1;
                patrzalkaApp.setZoom(patrzalkaApp.zoom + delta);
            });
            
            container.addEventListener('mousedown', (e) => {
                if (e.target.id === 'pat-main-img' || e.target.id === 'pat-img-container') {
                    patrzalkaApp.isDragging = true;
                    patrzalkaApp.startMouseX = e.clientX;
                    patrzalkaApp.startMouseY = e.clientY;
                    patrzalkaApp.startPanX = patrzalkaApp.panX;
                    patrzalkaApp.startPanY = patrzalkaApp.panY;
                    container.style.cursor = 'grabbing';
                }
            });
            
            window.addEventListener('mousemove', (e) => {
                if (patrzalkaApp.isDragging) {
                    patrzalkaApp.panX = patrzalkaApp.startPanX + (e.clientX - patrzalkaApp.startMouseX);
                    patrzalkaApp.panY = patrzalkaApp.startPanY + (e.clientY - patrzalkaApp.startMouseY);
                    patrzalkaApp.updateTransform();
                }
            });
            
            window.addEventListener('mouseup', () => {
                patrzalkaApp.isDragging = false;
                if(container) container.style.cursor = 'grab';
            });
        }

        window.addEventListener('keydown', (e) => {
            const win = document.getElementById('app-patrzalka');
            if(win && win.classList.contains('active') && patrzalkaApp.currentTab === 'viewer') {
                if(e.key === 'ArrowRight') patrzalkaApp.nextImage();
                if(e.key === 'ArrowLeft') patrzalkaApp.prevImage();
                if(e.key === 'Escape' && patrzalkaApp.slideshowTimer) patrzalkaApp.stopSlideshow();
            }
        });
    },

    saveMeta: () => {
        localStorage.setItem('bigos_patrzalka_meta', JSON.stringify(patrzalkaApp.metaDB));
    },

    getMeta: (id) => {
        if(!patrzalkaApp.metaDB[id]) { patrzalkaApp.metaDB[id] = { rating: 0, tags: '', desc: '', album: 'none', isFav: false }; }
        return patrzalkaApp.metaDB[id];
    },

    // ==================================================================
    // HISTORIA EDYCJI (PHOTOSHOP STYLE)
    // ==================================================================
    pushHistory: (actionName, overrideSrc = null) => {
        // Usuwanie kroków, jeśli jesteśmy w połowie historii i zrobimy nowy krok
        if (patrzalkaApp.historyIndex < patrzalkaApp.editHistory.length - 1) {
            patrzalkaApp.editHistory = patrzalkaApp.editHistory.slice(0, patrzalkaApp.historyIndex + 1);
        }

        const state = {
            name: actionName,
            src: overrideSrc || document.getElementById('pat-main-img').src,
            filters: JSON.parse(JSON.stringify(patrzalkaApp.filters)),
            transform: { rotate: patrzalkaApp.rotate, flipX: patrzalkaApp.flipX, flipY: patrzalkaApp.flipY }
        };

        patrzalkaApp.editHistory.push(state);
        patrzalkaApp.historyIndex = patrzalkaApp.editHistory.length - 1;
        
        patrzalkaApp.renderHistoryUI();
        patrzalkaApp.drawHistogram();
    },

    restoreHistory: (index) => {
        if (index < 0 || index >= patrzalkaApp.editHistory.length) return;
        
        const state = patrzalkaApp.editHistory[index];
        patrzalkaApp.historyIndex = index;
        
        patrzalkaApp.filters = JSON.parse(JSON.stringify(state.filters));
        patrzalkaApp.rotate = state.transform.rotate;
        patrzalkaApp.flipX = state.transform.flipX;
        patrzalkaApp.flipY = state.transform.flipY;
        
        const img = document.getElementById('pat-main-img');
        
        if (img.src !== state.src) {
            img.src = state.src;
            img.onload = () => {
                patrzalkaApp.updateSliderUI();
                patrzalkaApp.updateTransform();
                patrzalkaApp.renderHistoryUI();
            };
        } else {
            patrzalkaApp.updateSliderUI();
            patrzalkaApp.updateTransform();
            patrzalkaApp.renderHistoryUI();
        }
    },

    renderHistoryUI: () => {
        const list = document.getElementById('pat-history-list');
        if (!list) return;
        list.innerHTML = '';

        patrzalkaApp.editHistory.forEach((h, i) => {
            const isActive = i === patrzalkaApp.historyIndex;
            const isFuture = i > patrzalkaApp.historyIndex;
            const icon = i === 0 ? '🖼️' : (h.name.includes('Kadrowanie') || h.name.includes('Rozmiar') ? '✂️' : '✨');
            
            list.innerHTML += `
                <div class="px-3 py-1.5 text-[10px] rounded cursor-pointer flex justify-between items-center transition-all ${isActive ? 'bg-blue-500 text-white font-bold shadow-md scale-100' : (isFuture ? 'text-gray-500 hover:bg-white/5 opacity-50 scale-95' : 'g-text hover:bg-white/10 scale-100')}" onclick="patrzalkaApp.restoreHistory(${i})">
                    <span class="truncate">${icon} ${h.name}</span>
                </div>
            `;
        });
        
        const activeEl = list.querySelector('.bg-blue-500');
        if(activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    updateSliderUI: () => {
        ['brightness', 'contrast', 'saturate', 'sepia', 'hue', 'blur'].forEach(prop => {
            const el = document.getElementById(`filter-${prop}`);
            const lbl = document.getElementById(`filter-${prop}-lbl`);
            if (el && lbl) {
                el.value = patrzalkaApp.filters[prop];
                const unit = prop === 'hue' ? 'deg' : (prop === 'blur' ? 'px' : '%');
                lbl.innerText = patrzalkaApp.filters[prop] + unit;
            }
        });
    },

    // ==================================================================
    // HISTOGRAM NA ŻYWO (LIGHTROOM STYLE)
    // ==================================================================
    drawHistogram: () => {
        const histCanvas = document.getElementById('pat-histogram');
        const img = document.getElementById('pat-main-img');
        if(!histCanvas || !img || !img.complete || img.naturalWidth === 0) return;
        
        const ctx = histCanvas.getContext('2d');
        
        // Offscreen canvas do szybkiego przeliczenia filtrowanego obrazu
        const off = document.createElement('canvas');
        off.width = 100; off.height = 100; 
        const oCtx = off.getContext('2d');
        
        const f = patrzalkaApp.filters;
        oCtx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) sepia(${f.sepia}%) hue-rotate(${f.hue}deg) blur(${f.blur}px) grayscale(${f.grayscale}%) invert(${f.invert}%)`;
        oCtx.drawImage(img, 0, 0, 100, 100);
        
        const data = oCtx.getImageData(0,0,100,100).data;
        let lumFreq = new Array(256).fill(0);
        let maxFreq = 0;
        
        for(let i=0; i<data.length; i+=4) {
            let r = data[i], g = data[i+1], b = data[i+2];
            // Obliczanie luminancji ludzkiego oka
            let lum = Math.round(0.299*r + 0.587*g + 0.114*b);
            lumFreq[lum]++;
            if(lumFreq[lum] > maxFreq) maxFreq = lumFreq[lum];
        }
        
        histCanvas.width = histCanvas.clientWidth;
        histCanvas.height = histCanvas.clientHeight;
        ctx.clearRect(0, 0, histCanvas.width, histCanvas.height);
        
        // Rysowanie wykresu luminancji
        ctx.fillStyle = 'rgba(156, 163, 175, 0.8)'; // Szary bazowy
        ctx.beginPath();
        ctx.moveTo(0, histCanvas.height);
        
        const step = histCanvas.width / 256;
        for(let i=0; i<256; i++) {
            let h = (lumFreq[i] / maxFreq) * histCanvas.height * 0.95; 
            ctx.lineTo(i * step, histCanvas.height - h);
        }
        ctx.lineTo(histCanvas.width, histCanvas.height);
        ctx.fill();
        
        // Gradientowa ramka dołu
        const grad = ctx.createLinearGradient(0, 0, histCanvas.width, 0);
        grad.addColorStop(0, '#000');
        grad.addColorStop(0.5, '#777');
        grad.addColorStop(1, '#fff');
        ctx.fillStyle = grad;
        ctx.fillRect(0, histCanvas.height - 4, histCanvas.width, 4);
    },

    // ==================================================================
    // INTERFEJS I ZAKŁADKI
    // ==================================================================
    upgradeUI: () => {
        let appWindow = document.getElementById('app-patrzalka');
        if (!appWindow) return;

        const proUI = document.createElement('div');
        proUI.className = 'flex flex-col overflow-hidden relative w-full h-full';
        
        proUI.innerHTML = `
            <div class="flex flex-wrap items-center justify-between p-2 border-b g-border bg-black/20 shrink-0 gap-2">
                <div class="flex bg-black/30 rounded-lg p-1 border g-border shadow-inner">
                    <button onclick="patrzalkaApp.switchTab('gallery')" id="pat-tab-gallery" class="px-3 py-1.5 rounded text-xs font-bold transition g-text">Galeria</button>
                    <button onclick="patrzalkaApp.switchTab('viewer')" id="pat-tab-viewer" class="px-3 py-1.5 rounded text-xs font-bold transition g-text hidden sm:block">Podgląd</button>
                    <button onclick="patrzalkaApp.switchTab('edit')" id="pat-tab-edit" class="px-3 py-1.5 rounded text-xs font-bold transition g-text hidden sm:block">Edytor</button>
                    <button onclick="patrzalkaApp.switchTab('org')" id="pat-tab-org" class="px-3 py-1.5 rounded text-xs font-bold transition g-text hidden sm:block">Organizacja</button>
                    <button onclick="patrzalkaApp.switchTab('info')" id="pat-tab-info" class="px-3 py-1.5 rounded text-xs font-bold transition g-text hidden sm:block">EXIF</button>
                </div>
                
                <div id="pat-tools-viewer" class="hidden flex gap-1 items-center bg-black/20 px-2 py-1 rounded border g-border">
                    <button onclick="patrzalkaApp.setZoom(patrzalkaApp.zoom - 0.25)" class="g-btn text-xs px-2 py-1 rounded" title="Oddal">-</button>
                    <button onclick="patrzalkaApp.setZoom(1)" class="g-btn text-xs px-2 py-1 rounded font-bold" title="100% (1:1)">1:1</button>
                    <button onclick="patrzalkaApp.setZoom(patrzalkaApp.zoom + 0.25)" class="g-btn text-xs px-2 py-1 rounded" title="Przybliż">+</button>
                    <div class="w-px h-4 bg-gray-500/50 mx-1"></div>
                    <button onclick="patrzalkaApp.rotateImg(-90)" class="g-icon-btn px-2" title="Obróć w lewo">↶</button>
                    <button onclick="patrzalkaApp.rotateImg(90)" class="g-icon-btn px-2" title="Obróć w prawo">↷</button>
                    <button onclick="patrzalkaApp.flipImg('x')" class="g-icon-btn px-2" title="Odbicie Poziome">↔</button>
                    <button onclick="patrzalkaApp.flipImg('y')" class="g-icon-btn px-2" title="Odbicie Pionowe">↕</button>
                    <div class="w-px h-4 bg-gray-500/50 mx-1 hidden sm:block"></div>
                    <button onclick="patrzalkaApp.startSlideshow()" class="g-icon-btn px-2 hidden sm:block text-blue-400" title="Pokaz Slajdów">🌄</button>
                    <button onclick="patrzalkaApp.printImage()" class="g-icon-btn px-2 hidden sm:block" title="Drukuj">🖨️</button>
                </div>

                <div id="pat-tools-file" class="hidden flex gap-2">
                    <button onclick="patrzalkaApp.setAsWallpaper()" class="g-btn text-[10px] px-3 py-1.5 rounded shadow-sm border-purple-500/50 text-purple-400 font-bold bg-purple-500/10 hover:bg-purple-500 hover:text-white hidden md:block">🖥️ Tapeta</button>
                    <button onclick="patrzalkaApp.showSaveModal()" class="g-btn text-[10px] px-3 py-1.5 rounded shadow-sm border-emerald-500/50 text-emerald-400 font-bold bg-emerald-500/10 hover:bg-emerald-500 hover:text-white">💾 Eksportuj</button>
                </div>
            </div>

            <div class="flex flex-row flex-grow overflow-hidden relative">
                
                <!-- Boczny Pasek Albumów -->
                <div id="pat-albums-sidebar" class="w-[160px] border-r g-border bg-black/10 flex flex-col shrink-0 overflow-y-auto custom-scrollbar p-2 hidden sm:flex">
                    <div class="text-[10px] g-text-muted font-bold uppercase tracking-widest mb-2 px-2">Biblioteka</div>
                    <button onclick="patrzalkaApp.setAlbum('all')" id="alb-all" class="pat-alb-btn w-full text-left px-3 py-1.5 rounded text-xs font-bold transition flex gap-2 items-center mb-1 g-text hover:bg-white/10"><span>📂</span> Wszystkie</button>
                    <button onclick="patrzalkaApp.setAlbum('favorites')" id="alb-favorites" class="pat-alb-btn w-full text-left px-3 py-1.5 rounded text-xs font-bold transition flex gap-2 items-center mb-1 g-text hover:bg-white/10"><span>⭐</span> Ulubione</button>
                    
                    <div class="text-[10px] g-text-muted font-bold uppercase tracking-widest mt-4 mb-2 px-2">Albumy</div>
                    <button onclick="patrzalkaApp.setAlbum('wakacje')" id="alb-wakacje" class="pat-alb-btn w-full text-left px-3 py-1.5 rounded text-xs font-bold transition flex gap-2 items-center mb-1 g-text hover:bg-white/10"><span>🏖️</span> Wakacje</button>
                    <button onclick="patrzalkaApp.setAlbum('rodzina')" id="alb-rodzina" class="pat-alb-btn w-full text-left px-3 py-1.5 rounded text-xs font-bold transition flex gap-2 items-center mb-1 g-text hover:bg-white/10"><span>👨‍👩‍👧‍👦</span> Rodzina</button>
                    <button onclick="patrzalkaApp.setAlbum('projekty')" id="alb-projekty" class="pat-alb-btn w-full text-left px-3 py-1.5 rounded text-xs font-bold transition flex gap-2 items-center mb-1 g-text hover:bg-white/10"><span>🎨</span> Projekty</button>
                    
                    <div class="text-[10px] g-text-muted font-bold uppercase tracking-widest mt-4 mb-2 px-2">Prywatność & Chmura</div>
                    <button onclick="patrzalkaApp.openPrivateVault()" id="alb-private" class="pat-alb-btn w-full text-left px-3 py-1.5 rounded text-xs font-bold transition flex gap-2 items-center mb-1 text-purple-400 hover:bg-purple-500/20 border border-transparent"><span>🔐</span> Sejf (PIN)</button>
                    <button onclick="apps.showToast('BigOS Drive', 'Łączenie z chmurą...', 'info')" class="w-full text-left px-3 py-1.5 rounded text-xs font-bold transition flex gap-2 items-center mb-1 text-blue-400 hover:bg-blue-500/20"><span>☁️</span> BigOS Drive</button>
                </div>

                <!-- GALERIA -->
                <div id="pat-view-gallery" class="w-full h-full flex flex-col bg-black/10">
                    <div class="p-3 border-b g-border bg-black/20 flex gap-3 shrink-0 flex-wrap">
                        <input type="text" id="pat-search" placeholder="Szukaj zdjęć (Nazwa, Tagi)..." class="flex-grow g-bg g-text text-xs p-2 border g-border rounded outline-none shadow-inner" oninput="patrzalkaApp.renderGallery()">
                        <select id="pat-sort" class="g-bg g-text text-xs p-2 border g-border rounded outline-none cursor-pointer" onchange="patrzalkaApp.renderGallery()">
                            <option value="name_asc">Nazwa A-Z</option>
                            <option value="date_desc">Najnowsze</option>
                            <option value="rating">Najwyżej Oceniane</option>
                        </select>
                        <select id="pat-grid-size" class="g-bg g-text text-xs p-2 border g-border rounded outline-none cursor-pointer hidden md:block" onchange="patrzalkaApp.renderGallery()">
                            <option value="grid-cols-3">Siatka Duża</option>
                            <option value="grid-cols-4" selected>Siatka Średnia</option>
                            <option value="grid-cols-6">Siatka Mała</option>
                        </select>
                    </div>
                    <div id="pat-gallery-list" class="flex-grow overflow-y-auto custom-scrollbar p-4 grid gap-4 content-start"></div>
                </div>

                <!-- PODGLĄD / OBSZAR WIDZA -->
                <div id="pat-view-viewer" class="w-full h-full hidden flex bg-[#050505] overflow-hidden relative" style="background-image: radial-gradient(#333 1px, transparent 1px); background-size: 20px 20px;">
                    <button id="pat-slideshow-exit" class="absolute top-4 right-4 z-[100] bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold shadow-2xl hidden transition" onclick="patrzalkaApp.stopSlideshow()">✖ Zakończ Pokaz (ESC)</button>

                    <div class="absolute left-0 top-0 bottom-0 w-16 hover:bg-white/10 z-10 flex items-center justify-center cursor-pointer transition opacity-0 hover:opacity-100" onclick="patrzalkaApp.prevImage()">
                        <span class="text-4xl text-white drop-shadow-lg">❮</span>
                    </div>
                    
                    <div id="pat-img-container" class="w-full h-full flex items-center justify-center relative cursor-grab overflow-hidden">
                        <img id="pat-main-img" class="max-w-none max-h-none transition-all duration-300 shadow-2xl" src="" style="transform-origin: center center;">
                    </div>
                    
                    <div class="absolute right-0 top-0 bottom-0 w-16 hover:bg-white/10 z-10 flex items-center justify-center cursor-pointer transition opacity-0 hover:opacity-100" onclick="patrzalkaApp.nextImage()">
                        <span class="text-4xl text-white drop-shadow-lg">❯</span>
                    </div>
                </div>

                <!-- PANEL BOCZNY EDYTORA (LIGHTROOM STYLE) -->
                <div id="pat-sidebar-edit" class="w-[280px] border-l g-border bg-black/40 hidden flex-col shrink-0 overflow-hidden z-20 shadow-2xl">
                    <div class="flex-grow overflow-y-auto custom-scrollbar">
                        <!-- HISTOGRAM -->
                        <div class="p-3 border-b g-border bg-black/20 pb-2">
                            <div class="text-[10px] g-text-muted font-bold uppercase tracking-widest mb-2 flex justify-between">
                                <span>Histogram</span> <span>RGB</span>
                            </div>
                            <canvas id="pat-histogram" class="w-full h-16 bg-black/50 rounded shadow-inner border border-gray-700"></canvas>
                        </div>

                        <!-- HISTORIA ZMIAN -->
                        <div class="p-3 border-b g-border font-bold text-[10px] g-accent uppercase tracking-widest bg-black/30 flex justify-between items-center">
                            <span>Historia Edycji</span>
                        </div>
                        <div id="pat-history-list" class="p-2 flex flex-col gap-1 max-h-32 overflow-y-auto custom-scrollbar bg-black/10 border-b g-border">
                            <!-- JS wstrzykuje historię tutaj -->
                        </div>

                        <div class="p-3 border-b g-border font-bold text-[10px] g-text-muted uppercase tracking-widest bg-black/20 mt-2">Narzędzia Główne</div>
                        <div class="p-4 grid grid-cols-2 gap-2">
                            <button class="g-btn text-[10px] py-2 rounded shadow-md border-blue-500/50 flex flex-col items-center justify-center gap-1 hover:bg-blue-600/20" onclick="patrzalkaApp.showResizeModal()"><span class="text-lg">📏</span> Zmiana Rozmiaru</button>
                            <button class="g-btn text-[10px] py-2 rounded shadow-md border-emerald-500/50 flex flex-col items-center justify-center gap-1 hover:bg-emerald-600/20" onclick="patrzalkaApp.showCropModal()"><span class="text-lg">✂️</span> Kadrowanie</button>
                        </div>

                        <div class="p-3 border-y g-border font-bold text-[10px] g-text-muted uppercase tracking-widest bg-black/20">Korekcja Barw</div>
                        <div class="p-4 flex flex-col gap-3">
                            ${patrzalkaApp.genSlider('filter-brightness', 'Jasność', 0, 200, 100, '%', 'brightness')}
                            ${patrzalkaApp.genSlider('filter-contrast', 'Kontrast', 0, 200, 100, '%', 'contrast')}
                            ${patrzalkaApp.genSlider('filter-saturate', 'Nasycenie', 0, 300, 100, '%', 'saturate')}
                            ${patrzalkaApp.genSlider('filter-sepia', 'Temperatura (Sepia)', 0, 100, 0, '%', 'sepia')}
                            ${patrzalkaApp.genSlider('filter-hue', 'Odcień (Hue)', -180, 180, 0, 'deg', 'hue')}
                            ${patrzalkaApp.genSlider('filter-blur', 'Rozmycie (Blur)', 0, 20, 0, 'px', 'blur')}
                        </div>
                        
                        <div class="p-3 border-y g-border font-bold text-[10px] g-text-muted uppercase tracking-widest bg-black/20">Filtry Szybkie</div>
                        <div class="p-4 grid grid-cols-2 gap-2">
                            <button class="g-btn text-[10px] py-2 rounded" onclick="patrzalkaApp.applyQuickFilter('grayscale')">⚫⚪ C-B</button>
                            <button class="g-btn text-[10px] py-2 rounded" onclick="patrzalkaApp.applyQuickFilter('invert')">🌌 Negatyw</button>
                            <button class="g-btn text-[10px] py-2 rounded" onclick="patrzalkaApp.applyQuickFilter('vintage')">🎞️ Vintage</button>
                            <button class="g-btn text-[10px] py-2 rounded" onclick="patrzalkaApp.applyQuickFilter('hdr')">✨ HDR</button>
                        </div>
                    </div>
                </div>

                <!-- PANEL ORGANIZACJI -->
                <div id="pat-sidebar-org" class="w-[260px] border-l g-border bg-black/40 hidden flex-col shrink-0 overflow-y-auto custom-scrollbar z-20 shadow-2xl">
                    <div class="p-3 border-b g-border font-bold text-xs g-accent uppercase tracking-widest bg-black/30">Organizacja Zdjęcia</div>
                    <div class="p-4 flex flex-col gap-4">
                        <div>
                            <label class="block text-xs font-bold g-text-muted mb-1">Album</label>
                            <select id="pat-meta-album" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-sm cursor-pointer shadow-inner" onchange="patrzalkaApp.updateMeta()">
                                <option value="none">Brak (Tylko wszystkie)</option>
                                <option value="wakacje">🏖️ Wakacje</option>
                                <option value="rodzina">👨‍👩‍👧‍👦 Rodzina</option>
                                <option value="projekty">🎨 Projekty</option>
                                <option value="private">🔐 Ukryty Sejf (Wymaga PIN)</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-xs font-bold g-text-muted mb-1">Ocena (1-5)</label>
                            <div class="flex gap-1 text-sm cursor-pointer" id="pat-meta-rating">
                                <span onclick="patrzalkaApp.setRating(1)">☆</span><span onclick="patrzalkaApp.setRating(2)">☆</span><span onclick="patrzalkaApp.setRating(3)">☆</span><span onclick="patrzalkaApp.setRating(4)">☆</span><span onclick="patrzalkaApp.setRating(5)">☆</span>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 mt-2">
                            <input type="checkbox" id="pat-meta-fav" class="w-4 h-4 accent-yellow-500 cursor-pointer" onchange="patrzalkaApp.updateMeta()">
                            <label for="pat-meta-fav" class="text-sm font-bold text-yellow-500 cursor-pointer">⭐ Dodaj do Ulubionych</label>
                        </div>

                        <div class="border-t g-border my-2"></div>

                        <div>
                            <label class="block text-xs font-bold g-text-muted mb-1">Tagi (po przecinku)</label>
                            <input type="text" id="pat-meta-tags" placeholder="np. góry, portret, lato" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-sm shadow-inner" onblur="patrzalkaApp.updateMeta()">
                        </div>

                        <div>
                            <label class="block text-xs font-bold g-text-muted mb-1">Komentarz / Opis</label>
                            <textarea id="pat-meta-desc" rows="4" placeholder="Własny opis zdjęcia..." class="w-full p-2 rounded g-bg g-text border g-border outline-none text-sm shadow-inner custom-scrollbar resize-none" onblur="patrzalkaApp.updateMeta()"></textarea>
                        </div>
                    </div>
                </div>

                <!-- PANEL EXIF / INFO -->
                <div id="pat-sidebar-info" class="w-[260px] border-l g-border bg-black/40 hidden flex-col shrink-0 overflow-y-auto custom-scrollbar z-20 shadow-2xl">
                    <div class="p-3 border-b g-border font-bold text-xs g-accent uppercase tracking-widest bg-black/30">Dane Pliku</div>
                    <div class="p-4 flex flex-col gap-2 text-xs font-mono g-text-muted border-b g-border pb-4">
                        <div class="flex justify-between"><strong class="g-text">Nazwa:</strong> <span id="exif-name" class="truncate max-w-[120px]">---</span></div>
                        <div class="flex justify-between"><strong class="g-text">Typ:</strong> <span id="exif-type">---</span></div>
                        <div class="flex justify-between"><strong class="g-text">Rozmiar pliku:</strong> <span id="exif-size">---</span></div>
                        <div class="flex justify-between"><strong class="g-text">Rozdzielczość:</strong> <span id="exif-res">---</span></div>
                    </div>

                    <div class="p-3 border-b g-border font-bold text-xs g-accent uppercase tracking-widest bg-black/30">Metadane EXIF</div>
                    <div class="p-4 flex flex-col gap-3 text-xs font-mono g-text-muted" id="exif-real-data">
                        <div class="flex justify-between"><strong class="text-blue-400">Aparat:</strong> <span id="exif-cam">Brak danych</span></div>
                        <div class="flex justify-between"><strong class="text-blue-400">Ogniskowa:</strong> <span id="exif-focal">Brak danych</span></div>
                        <div class="flex justify-between"><strong class="text-blue-400">Przysłona:</strong> <span id="exif-f">Brak danych</span></div>
                        <div class="flex justify-between"><strong class="text-blue-400">Czas otw.:</strong> <span id="exif-time">Brak danych</span></div>
                        <div class="flex justify-between"><strong class="text-blue-400">ISO:</strong> <span id="exif-iso">Brak danych</span></div>
                    </div>
                </div>
            </div>
            
            <!-- Stopka informacyjna -->
            <div id="pat-footer" class="p-1.5 border-t g-border bg-black/40 text-[10px] g-text-muted flex justify-between px-4 shrink-0 font-mono transition-opacity">
                <span id="pat-info-name">Brak wybranego pliku</span>
                <span id="pat-info-res">0 x 0 px | 0 KB</span>
            </div>
        `;
        
        const existingBar = appWindow.querySelector('.title-bar');
        if (existingBar) {
            const closeBtn = existingBar.querySelector('button[onclick^="winManager.close"]');
            if (closeBtn) closeBtn.setAttribute('onclick', "patrzalkaApp.stop(); winManager.close('patrzalka')");
        }
        
        Array.from(appWindow.children).forEach(child => { 
            if (child !== existingBar) child.remove(); 
        });
        
        appWindow.appendChild(proUI);
    },

    genSlider: (id, name, min, max, val, unit, prop) => {
        return `
        <div class="flex flex-col gap-1 w-full group">
            <div class="flex justify-between text-[10px] font-bold g-text-muted uppercase"><span>${name}</span><span id="${id}-lbl">${val}${unit}</span></div>
            <input type="range" id="${id}" min="${min}" max="${max}" value="${val}" class="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500 transition shadow-inner group-hover:shadow-[0_0_5px_rgba(59,130,246,0.5)]" 
                   oninput="document.getElementById('${id}-lbl').innerText=this.value+'${unit}'; patrzalkaApp.filters['${prop}'] = this.value; patrzalkaApp.updateTransform();"
                   onchange="patrzalkaApp.pushHistory('Korekcja: ${name}')">
        </div>`;
    },

    switchTab: (tab) => {
        patrzalkaApp.currentTab = tab;
        
        ['gallery', 'viewer', 'edit', 'org', 'info'].forEach(t => {
            const btn = document.getElementById('pat-tab-' + t);
            if(btn) {
                btn.classList.remove('bg-blue-500', 'text-white', 'shadow-md');
                if(t === tab) btn.classList.add('bg-blue-500', 'text-white', 'shadow-md');
            }
        });

        const vGallery = document.getElementById('pat-view-gallery');
        const vViewer = document.getElementById('pat-view-viewer');
        const sEdit = document.getElementById('pat-sidebar-edit');
        const sOrg = document.getElementById('pat-sidebar-org');
        const sInfo = document.getElementById('pat-sidebar-info');
        const tViewer = document.getElementById('pat-tools-viewer');
        const tFile = document.getElementById('pat-tools-file');
        const sAlb = document.getElementById('pat-albums-sidebar');

        vGallery.classList.add('hidden');
        vViewer.classList.add('hidden');
        sEdit.classList.add('hidden', 'flex');
        sOrg.classList.add('hidden', 'flex');
        sInfo.classList.add('hidden', 'flex');
        tViewer.classList.add('hidden');
        tFile.classList.add('hidden');
        if(sAlb) sAlb.classList.remove('hidden');

        if(tab === 'gallery') {
            vGallery.classList.remove('hidden');
            if(sAlb) sAlb.classList.add('sm:flex');
            patrzalkaApp.renderGallery();
        } else {
            if(!patrzalkaApp.currentImageId) { patrzalkaApp.switchTab('gallery'); return typeof apps !== 'undefined' ? apps.showToast('Info', 'Wybierz zdjęcie z galerii.', 'info') : null; }
            vViewer.classList.remove('hidden');
            tViewer.classList.remove('hidden');
            tFile.classList.remove('hidden');
            if(sAlb) { sAlb.classList.add('hidden'); sAlb.classList.remove('sm:flex'); }
            
            if (tab === 'edit') {
                sEdit.classList.remove('hidden'); sEdit.classList.add('flex');
            } else if (tab === 'org') {
                sOrg.classList.remove('hidden'); sOrg.classList.add('flex');
                patrzalkaApp.loadMetaToUI();
            } else if (tab === 'info') {
                sInfo.classList.remove('hidden'); sInfo.classList.add('flex');
                patrzalkaApp.loadEXIFToUI();
            }
            patrzalkaApp.centerImage();
        }
    },

    // ==================================================================
    // ORGANIZACJA I SEJF 
    // ==================================================================
    openPrivateVault: () => {
        let savedPin = localStorage.getItem('bigos_patrzalka_pin');
        const modalId = 'pat-pin-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        let title = savedPin ? "Dostęp do ukrytego sejfu" : "Konfiguracja Sejfu";
        let msg = savedPin ? "Wpisz swój 4-cyfrowy kod PIN:" : "Ustaw swój nowy, 4-cyfrowy kod PIN (zapamiętaj go!):";
        let btnText = savedPin ? "Odblokuj" : "Ustaw PIN";

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
        modal.innerHTML = `
            <div class="bg-gray-900 border border-gray-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full">
                <h2 class="text-xl font-bold text-white mb-2 flex items-center gap-2"><span>🔐</span> ${title}</h2>
                <p class="text-xs text-gray-400 mb-4">${msg}</p>
                <input type="password" id="pat-pin-input" class="w-full p-3 bg-black/50 border border-gray-600 rounded-lg text-white font-mono text-center tracking-[0.5em] text-2xl outline-none focus:border-blue-500 mb-4" maxlength="4">
                <div class="flex justify-end gap-2">
                    <button id="pat-pin-cancel" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition font-bold text-sm">Anuluj</button>
                    <button id="pat-pin-ok" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg transition font-bold text-sm">${btnText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const input = document.getElementById('pat-pin-input');
        input.focus();
        input.onkeydown = (e) => { if(e.key === 'Enter') document.getElementById('pat-pin-ok').click(); };

        document.getElementById('pat-pin-cancel').onclick = () => modal.remove();
        document.getElementById('pat-pin-ok').onclick = () => {
            let val = input.value;
            if (!savedPin) {
                if (val.length >= 4) {
                    localStorage.setItem('bigos_patrzalka_pin', val);
                    if(typeof apps !== 'undefined') apps.showToast('Sukces', 'PIN został ustawiony. Sejf jest otwarty.', 'success');
                    patrzalkaApp.currentAlbum = 'private';
                    patrzalkaApp.refreshAlbumNav();
                    patrzalkaApp.renderGallery();
                    modal.remove();
                } else {
                    if(typeof apps !== 'undefined') apps.showToast('Błąd', 'PIN musi mieć min. 4 znaki!', 'error');
                }
            } else {
                if (val === savedPin) {
                    patrzalkaApp.currentAlbum = 'private';
                    patrzalkaApp.refreshAlbumNav();
                    patrzalkaApp.renderGallery();
                    if(typeof apps !== 'undefined') apps.showToast('Odblokowano', 'Dostęp do sejfu przyznany.', 'success');
                    modal.remove();
                } else {
                    if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Nieprawidłowy kod PIN!', 'error');
                    input.value = '';
                }
            }
        };
    },

    setAlbum: (albumId) => {
        patrzalkaApp.currentAlbum = albumId;
        patrzalkaApp.refreshAlbumNav();
        patrzalkaApp.renderGallery();
    },

    refreshAlbumNav: () => {
        document.querySelectorAll('.pat-alb-btn').forEach(b => {
            b.classList.remove('bg-blue-500', 'text-white', 'shadow-md');
            b.classList.add('g-text');
        });
        const btn = document.getElementById('alb-' + patrzalkaApp.currentAlbum);
        if(btn) {
            btn.classList.add('bg-blue-500', 'text-white', 'shadow-md');
            btn.classList.remove('g-text');
        }
    },

    loadMetaToUI: () => {
        if(!patrzalkaApp.currentImageId) return;
        const meta = patrzalkaApp.getMeta(patrzalkaApp.currentImageId);
        
        document.getElementById('pat-meta-album').value = meta.album || 'none';
        document.getElementById('pat-meta-fav').checked = meta.isFav || false;
        document.getElementById('pat-meta-tags').value = meta.tags || '';
        document.getElementById('pat-meta-desc').value = meta.desc || '';
        
        patrzalkaApp.setRatingUI(meta.rating || 0);
    },

    updateMeta: () => {
        if(!patrzalkaApp.currentImageId) return;
        const meta = patrzalkaApp.getMeta(patrzalkaApp.currentImageId);
        const newAlbum = document.getElementById('pat-meta-album').value;
        
        if (newAlbum === 'private') {
            let savedPin = localStorage.getItem('bigos_patrzalka_pin');
            if (!savedPin) {
                if (typeof apps !== 'undefined') apps.showToast('Błąd', 'Najpierw wejdź do Sejfu z paska bocznego i ustaw swój PIN!', 'error');
                document.getElementById('pat-meta-album').value = meta.album;
                return;
            }
        }
        
        meta.album = newAlbum;
        meta.isFav = document.getElementById('pat-meta-fav').checked;
        meta.tags = document.getElementById('pat-meta-tags').value;
        meta.desc = document.getElementById('pat-meta-desc').value;
        
        patrzalkaApp.saveMeta();
        if (typeof apps !== 'undefined') apps.showToast('Organizacja', 'Zapisano pomyślnie.', 'success');
    },

    setRating: (rating) => {
        if(!patrzalkaApp.currentImageId) return;
        const meta = patrzalkaApp.getMeta(patrzalkaApp.currentImageId);
        meta.rating = rating;
        patrzalkaApp.setRatingUI(rating);
        patrzalkaApp.saveMeta();
    },

    setRatingUI: (rating) => {
        const spans = document.querySelectorAll('#pat-meta-rating span');
        spans.forEach((s, idx) => {
            if(idx < rating) { s.innerText = '⭐'; s.classList.add('text-yellow-400'); s.classList.remove('text-gray-500'); }
            else { s.innerText = '☆'; s.classList.remove('text-yellow-400'); s.classList.add('text-gray-500'); }
        });
    },

    loadEXIFToUI: () => {
        if(!patrzalkaApp.currentImageId) return;
        const img = document.getElementById('pat-main-img');
        const fileObj = typeof fileSystem !== 'undefined' ? fileSystem.find(f => f.id === patrzalkaApp.currentImageId) : null;
        if(!fileObj) return;

        let kbSize = ((fileObj.content ? fileObj.content.length : 0) * 0.75 / 1024).toFixed(1);
        
        document.getElementById('exif-name').innerText = fileObj.name;
        document.getElementById('exif-type').innerText = fileObj.name.split('.').pop().toUpperCase();
        document.getElementById('exif-size').innerText = `${kbSize} KB`;
        document.getElementById('exif-res').innerText = `${img.naturalWidth} x ${img.naturalHeight} px`;

        const resetExif = () => {
            document.getElementById('exif-cam').innerText = 'Brak danych';
            document.getElementById('exif-focal').innerText = 'Brak danych';
            document.getElementById('exif-f').innerText = 'Brak danych';
            document.getElementById('exif-time').innerText = 'Brak danych';
            document.getElementById('exif-iso').innerText = 'Brak danych';
        };

        if (window.EXIF && fileObj.content && fileObj.content.startsWith('data:image/jpeg')) {
            EXIF.getData(img, function() {
                const make = EXIF.getTag(this, "Make") || '';
                const model = EXIF.getTag(this, "Model") || '';
                const focal = EXIF.getTag(this, "FocalLength");
                const fstop = EXIF.getTag(this, "FNumber");
                const exposure = EXIF.getTag(this, "ExposureTime");
                const iso = EXIF.getTag(this, "ISOSpeedRatings");
                
                const camName = (make + ' ' + model).trim();
                document.getElementById('exif-cam').innerText = camName !== '' ? camName : 'Brak danych';
                document.getElementById('exif-focal').innerText = focal ? `${Math.round(focal.numerator/focal.denominator)} mm` : 'Brak danych';
                document.getElementById('exif-f').innerText = fstop ? `f/${(fstop.numerator/fstop.denominator).toFixed(1)}` : 'Brak danych';
                
                if (exposure) {
                    let expStr = exposure.numerator === 1 ? `1/${exposure.denominator} s` : `${(exposure.numerator/exposure.denominator).toFixed(3)} s`;
                    document.getElementById('exif-time').innerText = expStr;
                } else {
                    document.getElementById('exif-time').innerText = 'Brak danych';
                }
                
                document.getElementById('exif-iso').innerText = iso || 'Brak danych';
            });
        } else {
            resetExif();
        }
    },

    // ==================================================================
    // GALERIA
    // ==================================================================
    renderGallery: () => {
        if(typeof fileSystem === 'undefined') return;
        const list = document.getElementById('pat-gallery-list');
        const search = document.getElementById('pat-search').value.toLowerCase();
        const sort = document.getElementById('pat-sort').value;
        const gridClass = document.getElementById('pat-grid-size').value;
        
        if(!list) return;
        
        list.className = `flex-grow overflow-y-auto custom-scrollbar p-4 grid gap-4 content-start ${gridClass}`;
        list.innerHTML = '';

        let images = fileSystem.filter(f => f.parentId !== 'hasiok' && (f.type === 'image' || (f.type === 'file' && f.name.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg|ico|avif)$/i))));
        
        images = images.filter(img => {
            const meta = patrzalkaApp.getMeta(img.id);
            if (patrzalkaApp.currentAlbum === 'private') return meta.album === 'private';
            if (meta.album === 'private') return false; 
            
            if (patrzalkaApp.currentAlbum === 'favorites') return meta.isFav;
            if (patrzalkaApp.currentAlbum !== 'all' && meta.album !== patrzalkaApp.currentAlbum) return false;
            return true;
        });

        if(search) {
            images = images.filter(i => {
                const meta = patrzalkaApp.getMeta(i.id);
                return i.name.toLowerCase().includes(search) || (meta.tags && meta.tags.toLowerCase().includes(search));
            });
        }

        if(sort === 'name_asc') images.sort((a,b) => a.name.localeCompare(b.name));
        else if(sort === 'date_desc') images.sort((a,b) => b.id.localeCompare(a.id)); 
        else if(sort === 'rating') {
            images.sort((a,b) => {
                const mA = patrzalkaApp.getMeta(a.id).rating;
                const mB = patrzalkaApp.getMeta(b.id).rating;
                return mB - mA;
            });
        }

        patrzalkaApp.slideshowList = images;

        if(images.length === 0) {
            list.innerHTML = `<div class="col-span-full text-center text-xs g-text-muted mt-10">Brak zdjęć w tym albumie lub nie pasują do filtrów.</div>`;
            return;
        }

        images.forEach(img => {
            const isSelected = img.id === patrzalkaApp.currentImageId;
            let contentStr = img.content || '';
            let kbSize = (contentStr.length * 0.75 / 1024).toFixed(1);
            const meta = patrzalkaApp.getMeta(img.id);

            const el = document.createElement('div');
            el.className = `g-bg border-2 rounded-xl overflow-hidden shadow-lg cursor-pointer transition-transform hover:scale-105 group relative ${isSelected ? 'border-blue-500' : 'g-border hover:border-blue-400'}`;
            el.innerHTML = `
                <div class="w-full aspect-square bg-black flex items-center justify-center overflow-hidden relative">
                    <img src="${contentStr}" class="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" loading="lazy">
                    ${meta.isFav ? '<div class="absolute top-2 left-2 text-yellow-500 drop-shadow-md text-base">⭐</div>' : ''}
                </div>
                <div class="p-2 bg-black/60 absolute bottom-0 left-0 right-0 backdrop-blur-sm">
                    <div class="text-[10px] font-bold g-text truncate">${typeof desktop !== 'undefined' ? desktop.escapeHTML(img.name) : img.name}</div>
                    <div class="flex justify-between items-center mt-1">
                        <span class="text-[8px] g-text-muted">${kbSize} KB</span>
                        <span class="text-[9px] text-yellow-400 tracking-widest">${'★'.repeat(meta.rating)}</span>
                    </div>
                </div>
                <button class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow" onclick="event.stopPropagation(); desktop.deleteItem('${img.id}'); patrzalkaApp.renderGallery();">✖</button>
            `;
            
            el.onclick = () => patrzalkaApp.open(img);
            el.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); if(typeof desktop !== 'undefined') desktop.showContextMenu(e, 'image', img.id); };

            list.appendChild(el);
        });
    },

    // ==================================================================
    // PODGLĄD & NAWIGACJA
    // ==================================================================
    open: (item) => {
        if(!item || (!item.content && !item.url)) return;
        patrzalkaApp.currentImageId = item.id;
        patrzalkaApp.slideshowIndex = patrzalkaApp.slideshowList.findIndex(i => i.id === item.id);
        
        const imgEl = document.getElementById('pat-main-img');
        
        imgEl.style.opacity = '0';
        setTimeout(() => {
            imgEl.src = item.content || item.url;
            imgEl.onload = () => {
                let kbSize = ((item.content ? item.content.length : 0) * 0.75 / 1024).toFixed(1);
                document.getElementById('pat-info-name').innerText = item.name;
                document.getElementById('pat-info-res').innerText = `${imgEl.naturalWidth} x ${imgEl.naturalHeight} px | ${kbSize} KB`;
                
                patrzalkaApp.centerImage(); 
                imgEl.style.opacity = '1';
                
                // Czysty start dla nowego pliku
                patrzalkaApp.editHistory = [];
                patrzalkaApp.filters = { brightness: 100, contrast: 100, saturate: 100, sepia: 0, grayscale: 0, invert: 0, blur: 0, hue: 0 };
                patrzalkaApp.rotate = 0; patrzalkaApp.flipX = 1; patrzalkaApp.flipY = 1;
                patrzalkaApp.updateSliderUI();
                patrzalkaApp.pushHistory('Oryginał', imgEl.src);
                
                if (patrzalkaApp.currentTab === 'info') patrzalkaApp.loadEXIFToUI();
                if (patrzalkaApp.currentTab === 'org') patrzalkaApp.loadMetaToUI();
            };
        }, 150);

        if (patrzalkaApp.currentTab === 'gallery') patrzalkaApp.switchTab('viewer');
        if(typeof winManager !== 'undefined') winManager.open('patrzalka');
    },

    nextImage: () => {
        if (patrzalkaApp.slideshowList.length <= 1) return;
        patrzalkaApp.slideshowIndex++;
        if (patrzalkaApp.slideshowIndex >= patrzalkaApp.slideshowList.length) patrzalkaApp.slideshowIndex = 0;
        patrzalkaApp.open(patrzalkaApp.slideshowList[patrzalkaApp.slideshowIndex]);
    },

    prevImage: () => {
        if (patrzalkaApp.slideshowList.length <= 1) return;
        patrzalkaApp.slideshowIndex--;
        if (patrzalkaApp.slideshowIndex < 0) patrzalkaApp.slideshowIndex = patrzalkaApp.slideshowList.length - 1;
        patrzalkaApp.open(patrzalkaApp.slideshowList[patrzalkaApp.slideshowIndex]);
    },

    startSlideshow: () => {
        if (patrzalkaApp.slideshowList.length <= 1) {
            if (typeof apps !== 'undefined') apps.showToast('Slideshow', 'Za mało zdjęć do pokazu.', 'info');
            return;
        }
        
        const win = document.getElementById('app-patrzalka');
        if(typeof winManager !== 'undefined' && !win.classList.contains('maximized')) {
            winManager.maximize(win.id);
        }
        
        document.getElementById('pat-tools-viewer').classList.add('hidden');
        document.getElementById('pat-tools-file').classList.add('hidden');
        
        const titleBar = win.querySelector('.title-bar');
        if(titleBar) titleBar.classList.add('hidden');
        
        document.getElementById('pat-footer').classList.add('hidden');

        let exitBtn = document.getElementById('pat-slideshow-exit');
        if(exitBtn) exitBtn.classList.remove('hidden');

        if (typeof apps !== 'undefined') apps.showToast('Pokaz Slajdów', 'Rozpoczęto.', 'success');
        
        patrzalkaApp.slideshowTimer = setInterval(() => {
            patrzalkaApp.nextImage();
        }, 3500);
    },

    stopSlideshow: () => {
        if (patrzalkaApp.slideshowTimer) {
            clearInterval(patrzalkaApp.slideshowTimer);
            patrzalkaApp.slideshowTimer = null;
        }
        
        let exitBtn = document.getElementById('pat-slideshow-exit');
        if(exitBtn) exitBtn.classList.add('hidden');

        const win = document.getElementById('app-patrzalka');
        if(win) {
            if(win.classList.contains('maximized') && typeof winManager !== 'undefined') winManager.maximize(win.id);
            
            const toolsViewer = document.getElementById('pat-tools-viewer');
            const toolsFile = document.getElementById('pat-tools-file');
            const titleBar = win.querySelector('.title-bar');
            const footer = document.getElementById('pat-footer');
            
            if(toolsViewer) toolsViewer.classList.remove('hidden');
            if(toolsFile) toolsFile.classList.remove('hidden');
            if(titleBar) titleBar.classList.remove('hidden');
            if(footer) footer.classList.remove('hidden');
        }
    },

    stop: () => {
        if (patrzalkaApp.slideshowTimer) {
            patrzalkaApp.stopSlideshow();
        }
    },

    printImage: () => {
        if(!patrzalkaApp.currentImageId) return;
        const img = document.getElementById('pat-main-img');
        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <html><head><title>Wydruk Zdjęcia - BigOS</title>
            <style>
                body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #fff; }
                img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                @media print { @page { margin: 0; } body { margin: 1cm; } }
            </style>
            </head><body>
            <img src="${img.src}">
            <script> window.onload = function() { window.print(); window.close(); } </script>
            </body></html>
        `);
        printWindow.document.close();
    },

    centerImage: () => {
        const container = document.getElementById('pat-img-container');
        const img = document.getElementById('pat-main-img');
        if(!container || !img || !img.complete) return;
        
        const cW = container.clientWidth; const cH = container.clientHeight;
        const iW = img.naturalWidth || 800; const iH = img.naturalHeight || 600;
        
        const scaleX = (cW - 40) / iW;
        const scaleY = (cH - 40) / iH;
        let bestScale = Math.min(scaleX, scaleY, 1); 
        if (bestScale <= 0) bestScale = 0.1;

        patrzalkaApp.zoom = bestScale;
        patrzalkaApp.panX = 0; patrzalkaApp.panY = 0;
        
        patrzalkaApp.updateTransform();
    },

    setZoom: (val) => {
        patrzalkaApp.zoom = Math.max(0.1, Math.min(val, 5));
        patrzalkaApp.updateTransform();
    },

    rotateImg: (deg) => {
        patrzalkaApp.rotate += deg;
        patrzalkaApp.updateTransform();
        patrzalkaApp.pushHistory(deg > 0 ? 'Obrót w prawo' : 'Obrót w lewo');
    },

    flipImg: (axis) => {
        if(axis === 'x') { patrzalkaApp.flipX *= -1; patrzalkaApp.pushHistory('Odbicie Poziome'); }
        if(axis === 'y') { patrzalkaApp.flipY *= -1; patrzalkaApp.pushHistory('Odbicie Pionowe'); }
        patrzalkaApp.updateTransform();
    },

    updateTransform: () => {
        const img = document.getElementById('pat-main-img');
        if(!img) return;

        img.style.transform = `translate(${patrzalkaApp.panX}px, ${patrzalkaApp.panY}px) scale(${patrzalkaApp.zoom}) rotate(${patrzalkaApp.rotate}deg) scaleX(${patrzalkaApp.flipX}) scaleY(${patrzalkaApp.flipY})`;

        const f = patrzalkaApp.filters;
        img.style.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) sepia(${f.sepia}%) hue-rotate(${f.hue}deg) blur(${f.blur}px) grayscale(${f.grayscale}%) invert(${f.invert}%)`;
        
        patrzalkaApp.drawHistogram();
    },

    // ==================================================================
    // EDYCJA I FILTRY
    // ==================================================================
    applyQuickFilter: (type) => {
        if(type === 'grayscale') { patrzalkaApp.filters.grayscale = patrzalkaApp.filters.grayscale === 100 ? 0 : 100; }
        if(type === 'invert') { patrzalkaApp.filters.invert = patrzalkaApp.filters.invert === 100 ? 0 : 100; }
        if(type === 'vintage') {
            patrzalkaApp.filters.sepia = 60;
            patrzalkaApp.filters.contrast = 120;
            patrzalkaApp.filters.brightness = 90;
        }
        if(type === 'hdr') {
            patrzalkaApp.filters.contrast = 140;
            patrzalkaApp.filters.saturate = 150;
        }
        patrzalkaApp.updateSliderUI();
        patrzalkaApp.updateTransform();
        patrzalkaApp.pushHistory(`Szybki filtr: ${type}`);
    },

    resetFilters: (fullReset = false) => {
        patrzalkaApp.filters = { brightness: 100, contrast: 100, saturate: 100, sepia: 0, grayscale: 0, invert: 0, blur: 0, hue: 0 };
        patrzalkaApp.updateSliderUI();
        
        if (fullReset) { patrzalkaApp.rotate = 0; patrzalkaApp.flipX = 1; patrzalkaApp.flipY = 1; }
        patrzalkaApp.updateTransform();
        patrzalkaApp.pushHistory(fullReset ? 'Pełen Reset' : 'Reset Barw');
    },

    setAsWallpaper: () => {
        if(!patrzalkaApp.currentImageId) return;
        const img = document.getElementById('pat-main-img');
        const url = img.src;
        if(url) {
            document.getElementById('desktop-bg').style.backgroundImage = `url('${url}')`; 
            document.getElementById('desktop-bg').classList.add('custom-wp'); 
            localStorage.setItem('bigos_bg', url);
            if(typeof apps !== 'undefined') apps.showToast('Patrzałka', 'Ustawiono jako tapetę Pulpitu!', 'success');
        }
    },

    // ==================================================================
    // RĘCZNE KADROWANIE I ZMIANA ROZMIARU (Modyfikacja samej warstwy roboczej - nondestructive do czasu zapisu)
    // ==================================================================
    showCropModal: () => {
        if(!patrzalkaApp.currentImageId) return;
        const img = document.getElementById('pat-main-img');

        const modalId = 'pat-crop-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/95 z-[10000] flex flex-col backdrop-blur-sm';
        modal.innerHTML = `
            <div class="p-4 flex justify-between items-center bg-gray-900 border-b border-gray-700 shrink-0 shadow-xl">
                <div class="text-white font-bold flex items-center gap-3">
                    <span class="text-2xl">✂️</span> 
                    <div>
                        <div class="text-sm">Ręczne Kadrowanie</div>
                        <div class="text-[10px] text-emerald-400 font-mono" id="pat-crop-dims">Zaznacz obszar (kliknij i przeciągnij)</div>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button id="pat-crop-cancel" class="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition">Anuluj</button>
                    <button id="pat-crop-ok" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg transition">Zatwierdź Cięcie</button>
                </div>
            </div>
            <div class="flex-grow relative flex items-center justify-center p-4 overflow-hidden" id="pat-crop-area">
                <canvas id="pat-crop-canvas" class="cursor-crosshair shadow-2xl rounded-lg"></canvas>
            </div>
        `;
        document.body.appendChild(modal);

        const canvas = document.getElementById('pat-crop-canvas');
        const ctx = canvas.getContext('2d');
        const area = document.getElementById('pat-crop-area');
        const dimsLabel = document.getElementById('pat-crop-dims');

        let maxWidth = area.clientWidth;
        let maxHeight = area.clientHeight;
        let imgRatio = img.naturalWidth / img.naturalHeight;

        let drawW = maxWidth;
        let drawH = drawW / imgRatio;

        if (drawH > maxHeight) {
            drawH = maxHeight;
            drawW = drawH * imgRatio;
        }

        canvas.width = drawW;
        canvas.height = drawH;

        let cropRect = null;
        let isDrawingRect = false;
        let startX = 0, startY = 0;

        const drawCanvas = () => {
            ctx.clearRect(0,0,canvas.width,canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            if (cropRect) {
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(0, 0, canvas.width, cropRect.y); 
                ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.h); 
                ctx.fillRect(cropRect.x + cropRect.w, cropRect.y, canvas.width - (cropRect.x + cropRect.w), cropRect.h); 
                ctx.fillRect(0, cropRect.y + cropRect.h, canvas.width, canvas.height - (cropRect.y + cropRect.h)); 

                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
                ctx.setLineDash([]);
                
                let scaleX = img.naturalWidth / canvas.width;
                let scaleY = img.naturalHeight / canvas.height;
                let realW = Math.round(cropRect.w * scaleX);
                let realH = Math.round(cropRect.h * scaleY);
                dimsLabel.innerText = `Obszar cięcia: ${realW} x ${realH} px`;
            } else {
                dimsLabel.innerText = `Zaznacz obszar (kliknij i przeciągnij)`;
            }
        };

        drawCanvas();

        canvas.onmousedown = (e) => {
            const rect = canvas.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
            isDrawingRect = true;
            cropRect = { x: startX, y: startY, w: 0, h: 0 };
        };

        canvas.onmousemove = (e) => {
            if (!isDrawingRect) return;
            const rect = canvas.getBoundingClientRect();
            let curX = e.clientX - rect.left;
            let curY = e.clientY - rect.top;

            curX = Math.max(0, Math.min(curX, canvas.width));
            curY = Math.max(0, Math.min(curY, canvas.height));

            cropRect.x = Math.min(startX, curX);
            cropRect.y = Math.min(startY, curY);
            cropRect.w = Math.abs(curX - startX);
            cropRect.h = Math.abs(curY - startY);

            drawCanvas();
        };

        canvas.onmouseup = () => { isDrawingRect = false; };
        canvas.onmouseleave = () => { isDrawingRect = false; };

        document.getElementById('pat-crop-cancel').onclick = () => modal.remove();

        document.getElementById('pat-crop-ok').onclick = () => {
            if (!cropRect || cropRect.w < 10 || cropRect.h < 10) {
                if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Zaznacz większy obszar, aby wykadrować', 'error');
                return;
            }

            let scaleX = img.naturalWidth / canvas.width;
            let scaleY = img.naturalHeight / canvas.height;

            let realX = cropRect.x * scaleX;
            let realY = cropRect.y * scaleY;
            let realW = cropRect.w * scaleX;
            let realH = cropRect.h * scaleY;

            const resCanvas = document.createElement('canvas');
            resCanvas.width = realW;
            resCanvas.height = realH;
            const resCtx = resCanvas.getContext('2d');

            resCtx.drawImage(img, realX, realY, realW, realH, 0, 0, realW, realH);

            const dataUrl = resCanvas.toDataURL('image/png', 1.0); 
            
            // Zamiast zapisywać do FileSystem, ładujemy tylko do podglądu i dodajemy do Historii! (Non-destructive)
            img.src = dataUrl;
            img.onload = () => {
                patrzalkaApp.pushHistory('Kadrowanie', dataUrl);
                patrzalkaApp.centerImage();
            };

            modal.remove();
        };
    },

    showResizeModal: () => {
        if(!patrzalkaApp.currentImageId) return;
        const img = document.getElementById('pat-main-img');
        
        if(typeof ui !== 'undefined') {
            ui.showPrompt(`Obecny rozmiar: ${img.naturalWidth} x ${img.naturalHeight} px\nPodaj NOWĄ SZEROKOŚĆ (wysokość dopasuje się sama):`, img.naturalWidth, "Zmień Rozmiar", (val) => {
                let newW = parseInt(val);
                if(isNaN(newW) || newW < 10) return;
                
                let ratio = img.naturalHeight / img.naturalWidth;
                let newH = Math.round(newW * ratio);
                
                const canvas = document.createElement('canvas');
                canvas.width = newW; canvas.height = newH;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, newW, newH);
                
                const dataUrl = canvas.toDataURL('image/png', 1.0);
                
                img.src = dataUrl;
                img.onload = () => {
                    patrzalkaApp.pushHistory('Zmieniono Rozmiar', dataUrl);
                    patrzalkaApp.centerImage();
                };
            });
        }
    },

    // ==================================================================
    // ZAAWANSOWANE ZAPISYWANIE OBRAZU I KONWERSJA FORMATÓW
    // ==================================================================
    showSaveModal: () => {
        if(!patrzalkaApp.currentImageId) return;
        const fileObj = typeof fileSystem !== 'undefined' ? fileSystem.find(f => f.id === patrzalkaApp.currentImageId) : null;
        let defaultName = fileObj ? fileObj.name : 'obrazek.jpg';

        const modalId = 'pat-save-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        let folderOptions = '<option value="root">Pulpit (Katalog Główny)</option>';
        if(typeof fileSystem !== 'undefined') {
            fileSystem.filter(f => f.type === 'folder' && f.id !== 'hasiok').forEach(folder => {
                let isSelected = (fileObj && fileObj.parentId === folder.id) ? 'selected' : '';
                folderOptions += `<option value="${folder.id}" ${isSelected}>📂 ${typeof desktop !== 'undefined' ? desktop.escapeHTML(folder.name) : folder.name}</option>`;
            });
        }

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-emerald-500/30">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Eksport i Konwersja</h2>

                <div class="mb-4">
                    <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Nazwa pliku</label>
                    <input type="text" id="pat-save-name" value="${defaultName}" class="w-full p-2 bg-gray-100 dark:bg-[#111] border border-gray-300 dark:border-[#444] rounded outline-none text-gray-800 dark:text-white focus:border-emerald-500 font-bold">
                </div>

                <div class="mb-4">
                    <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Format (Konwersja na żywo)</label>
                    <select id="pat-save-format" class="w-full p-2 bg-gray-100 dark:bg-[#111] border border-gray-300 dark:border-[#444] rounded outline-none text-gray-800 dark:text-white cursor-pointer focus:border-emerald-500 font-bold text-sm">
                        <option value="image/jpeg">JPEG (.jpg) - Optymalny rozmiar</option>
                        <option value="image/png">PNG (.png) - Najwyższa jakość, bezstratnie</option>
                        <option value="image/webp">WebP (.webp) - Nowoczesny format do sieci</option>
                    </select>
                </div>

                <div class="mb-6">
                    <div class="flex justify-between text-[10px] font-bold text-gray-500 uppercase"><span>Jakość kompresji (Dla JPG/WebP)</span><span id="pat-save-q-lbl">90%</span></div>
                    <input type="range" id="pat-save-quality" min="10" max="100" value="90" class="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer mt-1" oninput="document.getElementById('pat-save-q-lbl').innerText=this.value+'%'">
                </div>

                <div class="mb-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Katalog Docelowy w BigOS</label>
                    <select id="pat-save-folder" class="w-full p-2 bg-gray-100 dark:bg-[#111] border border-gray-300 dark:border-[#444] rounded outline-none text-gray-800 dark:text-white cursor-pointer focus:border-emerald-500">
                        ${folderOptions}
                    </select>
                </div>

                <div class="flex gap-2 justify-between flex-wrap sm:flex-nowrap">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition font-medium text-xs sm:text-sm">Anuluj</button>
                    <div class="flex gap-2">
                        <button onclick="patrzalkaApp.executeSave('pc')" class="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-600/30 transition font-bold text-xs sm:text-sm">📥 Na PC</button>
                        <button onclick="patrzalkaApp.executeSave('bigos')" class="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-600/30 transition font-bold text-xs sm:text-sm">💾 Do BigOS</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const fmtSelect = document.getElementById('pat-save-format');
        if (defaultName.toLowerCase().endsWith('.png')) fmtSelect.value = 'image/png';
        else if (defaultName.toLowerCase().endsWith('.webp')) fmtSelect.value = 'image/webp';
        else fmtSelect.value = 'image/jpeg';
    },

    executeSave: (target) => {
        if(!patrzalkaApp.currentImageId) return;
        const img = document.getElementById('pat-main-img');
        const nameInput = document.getElementById('pat-save-name').value.trim();
        const format = document.getElementById('pat-save-format').value;
        const folderId = document.getElementById('pat-save-folder').value;
        const quality = parseInt(document.getElementById('pat-save-quality').value) / 100;

        if(!nameInput) return;

        let finalName = nameInput;
        const ext = format === 'image/jpeg' ? '.jpg' : (format === 'image/png' ? '.png' : '.webp');
        finalName = finalName.replace(/\.[^/.]+$/, "") + ext;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let r = patrzalkaApp.rotate % 360;
        if (r < 0) r += 360;
        if (r === 90 || r === 270) {
            canvas.width = img.naturalHeight; canvas.height = img.naturalWidth;
        } else {
            canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(patrzalkaApp.rotate * Math.PI / 180);
        ctx.scale(patrzalkaApp.flipX, patrzalkaApp.flipY);

        const b = patrzalkaApp.filters.brightness;
        const c = patrzalkaApp.filters.contrast;
        const s = patrzalkaApp.filters.saturate;
        const sep = patrzalkaApp.filters.sepia;
        const h = patrzalkaApp.filters.hue;
        const bl = patrzalkaApp.filters.blur;
        
        ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%) sepia(${sep}%) hue-rotate(${h}deg) blur(${bl}px) grayscale(${patrzalkaApp.filters.grayscale}%) invert(${patrzalkaApp.filters.invert}%)`;

        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

        const dataUrl = canvas.toDataURL(format, quality);

        if (target === 'pc') {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = finalName;
            link.click();
            if(typeof apps !== 'undefined') apps.showToast('Sukces', `Skonwertowano i pobrano ${finalName}`, 'success');
        } else {
            if (typeof fileSystem !== 'undefined') {
                let existingFile = fileSystem.find(f => f.id === patrzalkaApp.currentImageId);

                let newId = 'img_' + Date.now();
                fileSystem.push({
                    id: newId, type: 'image', name: finalName, icon: '🖼️', content: dataUrl,
                    parentId: folderId, x: Math.floor(Math.random()*100)+20, y: Math.floor(Math.random()*100)+20
                });
                
                patrzalkaApp.metaDB[newId] = JSON.parse(JSON.stringify(patrzalkaApp.getMeta(patrzalkaApp.currentImageId)));
                patrzalkaApp.saveMeta();

                patrzalkaApp.currentImageId = newId; 

                if(typeof fsManager !== 'undefined') fsManager.save();
                if(typeof desktop !== 'undefined') desktop.render();
                
                const aW = document.getElementById('app-aktowka');
                if(aW && aW.classList.contains('active') && typeof fsManager !== 'undefined') {
                    fsManager.renderExplorerContent(fsManager.currentFolder);
                }
                if(typeof apps !== 'undefined') apps.showToast('Zapisano', `Zapisano zmodyfikowany plik: ${finalName}`, 'success');
            }
        }

        const modal = document.getElementById('pat-save-modal');
        if(modal) modal.remove();

        const currentItem = typeof fileSystem !== 'undefined' ? fileSystem.find(f => f.id === patrzalkaApp.currentImageId) : null;
        if (currentItem) patrzalkaApp.open(currentItem);
    }
};

setTimeout(patrzalkaApp.init, 500);