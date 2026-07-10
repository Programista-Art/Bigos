// ======================================================================
// PLIK: js/aplikacje/patrzalka.js (Patrzałka PRO - Przeglądarka i Edytor)
// ======================================================================

const patrzalkaApp = {
    currentImageId: null,
    currentTab: 'gallery', 
    
    // Stany obrazu
    zoom: 1, panX: 0, panY: 0,
    rotate: 0, flipX: 1, flipY: 1,
    isDragging: false, startMouseX: 0, startMouseY: 0, startPanX: 0, startPanY: 0,
    
    // Filtry
    filters: { brightness: 100, contrast: 100, saturate: 100, sepia: 0, grayscale: 0, invert: 0, blur: 0, hue: 0 },

    init: () => {
        patrzalkaApp.upgradeUI();
        patrzalkaApp.renderGallery();
        
        // Zoptymalizowane gesty myszy (Pan & Zoom)
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
                    // Zapisujemy pozycję myszy ORAZ początkowe przesunięcie ekranu (płynny drag)
                    patrzalkaApp.startMouseX = e.clientX;
                    patrzalkaApp.startMouseY = e.clientY;
                    patrzalkaApp.startPanX = patrzalkaApp.panX;
                    patrzalkaApp.startPanY = patrzalkaApp.panY;
                    container.style.cursor = 'grabbing';
                }
            });
            
            window.addEventListener('mousemove', (e) => {
                if (patrzalkaApp.isDragging) {
                    // Dodajemy różnicę przebytej drogi myszki do punktu początkowego
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
    },

    upgradeUI: () => {
        let appWindow = document.getElementById('app-patrzalka');
        if (!appWindow) return; // Skorupa czeka w index.html

        const proUI = document.createElement('div');
        proUI.className = 'flex flex-col overflow-hidden relative w-full h-full';
        
        proUI.innerHTML = `
            <!-- Główny Pasek Narzędzi -->
            <div class="flex flex-wrap items-center justify-between p-2 border-b g-border bg-black/20 shrink-0 gap-2">
                <div class="flex bg-black/30 rounded-lg p-1 border g-border shadow-inner">
                    <button onclick="patrzalkaApp.switchTab('gallery')" id="pat-tab-gallery" class="px-3 py-1.5 rounded text-xs font-bold transition g-text">Galeria</button>
                    <button onclick="patrzalkaApp.switchTab('viewer')" id="pat-tab-viewer" class="px-3 py-1.5 rounded text-xs font-bold transition g-text">Podgląd</button>
                    <button onclick="patrzalkaApp.switchTab('edit')" id="pat-tab-edit" class="px-3 py-1.5 rounded text-xs font-bold transition g-text">Edytor</button>
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
                </div>

                <div id="pat-tools-file" class="hidden flex gap-2">
                    <button onclick="patrzalkaApp.setAsWallpaper()" class="g-btn text-[10px] px-3 py-1.5 rounded shadow-sm border-purple-500/50 text-purple-400 font-bold bg-purple-500/10 hover:bg-purple-500 hover:text-white">🖥️ Na Tapetę</button>
                    <button onclick="patrzalkaApp.showSaveModal()" class="g-btn text-[10px] px-3 py-1.5 rounded shadow-sm border-emerald-500/50 text-emerald-400 font-bold bg-emerald-500/10 hover:bg-emerald-500 hover:text-white">💾 Zapisz jako...</button>
                </div>
            </div>

            <!-- Przestrzeń Robocza -->
            <div class="flex flex-row flex-grow overflow-hidden relative">
                
                <!-- 1. GALERIA -->
                <div id="pat-view-gallery" class="w-full h-full flex flex-col bg-black/10">
                    <div class="p-3 border-b g-border bg-black/20 flex gap-3 shrink-0">
                        <input type="text" id="pat-search" placeholder="Szukaj zdjęć..." class="flex-grow g-bg g-text text-xs p-2 border g-border rounded outline-none shadow-inner" oninput="patrzalkaApp.renderGallery()">
                        <select id="pat-sort" class="g-bg g-text text-xs p-2 border g-border rounded outline-none cursor-pointer" onchange="patrzalkaApp.renderGallery()">
                            <option value="name_asc">Nazwa A-Z</option>
                            <option value="name_desc">Nazwa Z-A</option>
                            <option value="date_desc">Najnowsze</option>
                        </select>
                        <select id="pat-grid-size" class="g-bg g-text text-xs p-2 border g-border rounded outline-none cursor-pointer hidden sm:block" onchange="patrzalkaApp.renderGallery()">
                            <option value="grid-cols-3">Siatka Duża</option>
                            <option value="grid-cols-4" selected>Siatka Średnia</option>
                            <option value="grid-cols-6">Siatka Mała</option>
                        </select>
                    </div>
                    <div id="pat-gallery-list" class="flex-grow overflow-y-auto custom-scrollbar p-4 grid gap-4 content-start"></div>
                </div>

                <!-- 2. PODGLĄD & EDYTOR -->
                <div id="pat-view-viewer" class="w-full h-full hidden flex bg-[#050505] overflow-hidden relative" style="background-image: radial-gradient(#333 1px, transparent 1px); background-size: 20px 20px;">
                    <div id="pat-img-container" class="w-full h-full flex items-center justify-center relative cursor-grab overflow-hidden">
                        <img id="pat-main-img" class="max-w-none max-h-none transition-transform duration-200 shadow-2xl" src="" style="transform-origin: center center;">
                    </div>
                </div>

                <!-- 3. PANEL BOCZNY EDYTORA -->
                <div id="pat-sidebar-edit" class="w-[260px] border-l g-border bg-black/40 hidden flex-col shrink-0 overflow-y-auto custom-scrollbar z-20 shadow-2xl">
                    <div class="p-3 border-b g-border font-bold text-xs g-accent uppercase tracking-widest bg-black/30">Korekcja Barw</div>
                    <div class="p-4 flex flex-col gap-3">
                        ${patrzalkaApp.genSlider('filter-brightness', 'Jasność', 0, 200, 100, '%')}
                        ${patrzalkaApp.genSlider('filter-contrast', 'Kontrast', 0, 200, 100, '%')}
                        ${patrzalkaApp.genSlider('filter-saturate', 'Nasycenie', 0, 300, 100, '%')}
                        ${patrzalkaApp.genSlider('filter-sepia', 'Temperatura (Sepia)', 0, 100, 0, '%')}
                        ${patrzalkaApp.genSlider('filter-hue', 'Odcień (Hue)', -180, 180, 0, 'deg')}
                        ${patrzalkaApp.genSlider('filter-blur', 'Rozmycie (Blur)', 0, 20, 0, 'px')}
                    </div>
                    
                    <div class="p-3 border-y g-border font-bold text-xs g-accent uppercase tracking-widest bg-black/30">Filtry Szybkie</div>
                    <div class="p-4 grid grid-cols-2 gap-2">
                        <button class="g-btn text-[10px] py-2 rounded" onclick="patrzalkaApp.applyQuickFilter('grayscale')">⚫⚪ Czarno-Białe</button>
                        <button class="g-btn text-[10px] py-2 rounded" onclick="patrzalkaApp.applyQuickFilter('invert')">🌌 Negatyw</button>
                        <button class="g-btn text-[10px] py-2 rounded" onclick="patrzalkaApp.applyQuickFilter('vintage')">🎞️ Vintage</button>
                        <button class="g-btn text-[10px] py-2 rounded" onclick="patrzalkaApp.applyQuickFilter('hdr')">✨ HDR Boost</button>
                    </div>

                    <div class="p-3 border-y g-border font-bold text-xs g-accent uppercase tracking-widest bg-black/30">Narzędzia PRO</div>
                    <div class="p-4 flex flex-col gap-3">
                        <button class="g-btn text-xs py-2 rounded shadow-md border-blue-500/50 flex items-center justify-center gap-2 hover:bg-blue-600/20" onclick="patrzalkaApp.showResizeModal()"><span>📏</span> Zmień Rozmiar</button>
                        <button class="g-btn text-xs py-2 rounded shadow-md border-emerald-500/50 flex items-center justify-center gap-2 hover:bg-emerald-600/20" onclick="patrzalkaApp.showCropModal()"><span>✂️</span> Kadrowanie (Ręczne)</button>
                        <button class="g-btn text-xs py-2 rounded shadow-md border-red-500/50 flex items-center justify-center gap-2 hover:bg-red-600/20 text-red-400 mt-2" onclick="patrzalkaApp.resetFilters(true)"><span>🔄</span> Resetuj Wszystko</button>
                    </div>
                </div>
            </div>
            
            <!-- Stopka informacyjna -->
            <div id="pat-footer" class="p-1.5 border-t g-border bg-black/40 text-[9px] g-text-muted flex justify-between px-4 shrink-0 font-mono">
                <span id="pat-info-name">Brak wybranego pliku</span>
                <span id="pat-info-res">0 x 0 px | 0 KB</span>
            </div>
        `;
        
        // Zastępujemy starą zawartość skorupy (poza paskiem tytułu)
        const existingBar = appWindow.querySelector('.title-bar');
        Array.from(appWindow.children).forEach(child => { if (child !== existingBar) child.remove(); });
        appWindow.appendChild(proUI);
    },

    genSlider: (id, name, min, max, val, unit) => {
        return `
        <div class="flex flex-col gap-1 w-full">
            <div class="flex justify-between text-[10px] font-bold g-text-muted uppercase"><span>${name}</span><span id="${id}-lbl">${val}${unit}</span></div>
            <input type="range" id="${id}" min="${min}" max="${max}" value="${val}" class="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500" oninput="document.getElementById('${id}-lbl').innerText=this.value+'${unit}'; patrzalkaApp.updateTransform()">
        </div>`;
    },

    switchTab: (tab) => {
        patrzalkaApp.currentTab = tab;
        
        ['gallery', 'viewer', 'edit'].forEach(t => {
            const btn = document.getElementById('pat-tab-' + t);
            if(btn) {
                btn.classList.remove('bg-blue-500', 'text-white', 'shadow-md');
                if(t === tab) btn.classList.add('bg-blue-500', 'text-white', 'shadow-md');
            }
        });

        const vGallery = document.getElementById('pat-view-gallery');
        const vViewer = document.getElementById('pat-view-viewer');
        const sEdit = document.getElementById('pat-sidebar-edit');
        const tViewer = document.getElementById('pat-tools-viewer');
        const tFile = document.getElementById('pat-tools-file');

        vGallery.classList.add('hidden');
        vViewer.classList.add('hidden');
        sEdit.classList.add('hidden', 'flex');
        tViewer.classList.add('hidden');
        tFile.classList.add('hidden');

        if(tab === 'gallery') {
            vGallery.classList.remove('hidden');
            patrzalkaApp.renderGallery();
        } else if (tab === 'viewer') {
            if(!patrzalkaApp.currentImageId) { patrzalkaApp.switchTab('gallery'); return typeof apps !== 'undefined' ? apps.showToast('Info', 'Wybierz zdjęcie z galerii.', 'info') : null; }
            vViewer.classList.remove('hidden');
            tViewer.classList.remove('hidden');
            tFile.classList.remove('hidden');
            patrzalkaApp.centerImage();
        } else if (tab === 'edit') {
            if(!patrzalkaApp.currentImageId) { patrzalkaApp.switchTab('gallery'); return typeof apps !== 'undefined' ? apps.showToast('Info', 'Wybierz zdjęcie do edycji.', 'info') : null; }
            vViewer.classList.remove('hidden');
            sEdit.classList.remove('hidden'); sEdit.classList.add('flex');
            tViewer.classList.remove('hidden');
            tFile.classList.remove('hidden');
            patrzalkaApp.centerImage();
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

        // FIX: Dodano f.parentId !== 'hasiok' do weryfikacji, czy plik nie jest w koszu!
        let images = fileSystem.filter(f => f.parentId !== 'hasiok' && (f.type === 'image' || (f.type === 'file' && f.name.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg|ico)$/i))));
        
        if(search) images = images.filter(i => i.name.toLowerCase().includes(search));

        if(sort === 'name_asc') images.sort((a,b) => a.name.localeCompare(b.name));
        else if(sort === 'name_desc') images.sort((a,b) => b.name.localeCompare(a.name));
        else if(sort === 'date_desc') images.sort((a,b) => b.id.localeCompare(a.id)); 

        if(images.length === 0) {
            list.innerHTML = `<div class="col-span-full text-center text-xs g-text-muted mt-10">Brak zdjęć w systemie BigOS.</div>`;
            return;
        }

        images.forEach(img => {
            const isSelected = img.id === patrzalkaApp.currentImageId;
            let contentStr = img.content || '';
            let kbSize = (contentStr.length * 0.75 / 1024).toFixed(1);

            const el = document.createElement('div');
            el.className = `g-bg border-2 rounded-xl overflow-hidden shadow-lg cursor-pointer transition-transform hover:scale-105 group relative ${isSelected ? 'border-blue-500' : 'g-border hover:border-blue-400'}`;
            el.innerHTML = `
                <div class="w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
                    <img src="${contentStr}" class="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" loading="lazy">
                </div>
                <div class="p-2 bg-black/60 absolute bottom-0 left-0 right-0 backdrop-blur-sm">
                    <div class="text-[10px] font-bold g-text truncate">${typeof desktop !== 'undefined' ? desktop.escapeHTML(img.name) : img.name}</div>
                    <div class="text-[8px] g-text-muted">${kbSize} KB</div>
                </div>
                <button class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow" onclick="event.stopPropagation(); desktop.deleteItem('${img.id}'); patrzalkaApp.renderGallery();">✖</button>
            `;
            
            el.onclick = () => patrzalkaApp.open(img);
            el.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); if(typeof desktop !== 'undefined') desktop.showContextMenu(e, 'image', img.id); };

            list.appendChild(el);
        });
    },

    // ==================================================================
    // PODGLĄD & TRANSFORMACJE
    // ==================================================================
    open: (item) => {
        if(!item || (!item.content && !item.url)) return;
        patrzalkaApp.currentImageId = item.id;
        
        const imgEl = document.getElementById('pat-main-img');
        imgEl.src = item.content || item.url;
        
        imgEl.onload = () => {
            let kbSize = ((item.content ? item.content.length : 0) * 0.75 / 1024).toFixed(1);
            document.getElementById('pat-info-name').innerText = item.name;
            document.getElementById('pat-info-res').innerText = `${imgEl.naturalWidth} x ${imgEl.naturalHeight} px | ${kbSize} KB`;
            patrzalkaApp.centerImage(); 
        };

        patrzalkaApp.resetFilters(true);
        patrzalkaApp.switchTab('viewer');
        if(typeof winManager !== 'undefined') winManager.open('patrzalka');
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
        patrzalkaApp.rotate = 0; patrzalkaApp.flipX = 1; patrzalkaApp.flipY = 1;
        
        patrzalkaApp.updateTransform();
    },

    setZoom: (val) => {
        patrzalkaApp.zoom = Math.max(0.1, Math.min(val, 5));
        patrzalkaApp.updateTransform();
    },

    rotateImg: (deg) => {
        patrzalkaApp.rotate += deg;
        patrzalkaApp.updateTransform();
    },

    flipImg: (axis) => {
        if(axis === 'x') patrzalkaApp.flipX *= -1;
        if(axis === 'y') patrzalkaApp.flipY *= -1;
        patrzalkaApp.updateTransform();
    },

    updateTransform: () => {
        const img = document.getElementById('pat-main-img');
        if(!img) return;

        // Osobne nakładanie paningu i zooma, żeby środek ekranu działał logicznie
        img.style.transform = `translate(${patrzalkaApp.panX}px, ${patrzalkaApp.panY}px) scale(${patrzalkaApp.zoom}) rotate(${patrzalkaApp.rotate}deg) scaleX(${patrzalkaApp.flipX}) scaleY(${patrzalkaApp.flipY})`;

        const b = document.getElementById('filter-brightness')?.value || 100;
        const c = document.getElementById('filter-contrast')?.value || 100;
        const s = document.getElementById('filter-saturate')?.value || 100;
        const sep = document.getElementById('filter-sepia')?.value || 0;
        const h = document.getElementById('filter-hue')?.value || 0;
        const bl = document.getElementById('filter-blur')?.value || 0;

        img.style.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%) sepia(${sep}%) hue-rotate(${h}deg) blur(${bl}px) grayscale(${patrzalkaApp.filters.grayscale}%) invert(${patrzalkaApp.filters.invert}%)`;
    },

    // ==================================================================
    // EDYCJA, FILTRY I NARZĘDZIA
    // ==================================================================
    applyQuickFilter: (type) => {
        if(type === 'grayscale') patrzalkaApp.filters.grayscale = patrzalkaApp.filters.grayscale === 100 ? 0 : 100;
        if(type === 'invert') patrzalkaApp.filters.invert = patrzalkaApp.filters.invert === 100 ? 0 : 100;
        if(type === 'vintage') {
            document.getElementById('filter-sepia').value = 60; document.getElementById('filter-sepia-lbl').innerText = '60%';
            document.getElementById('filter-contrast').value = 120; document.getElementById('filter-contrast-lbl').innerText = '120%';
            document.getElementById('filter-brightness').value = 90; document.getElementById('filter-brightness-lbl').innerText = '90%';
        }
        if(type === 'hdr') {
            document.getElementById('filter-contrast').value = 140; document.getElementById('filter-contrast-lbl').innerText = '140%';
            document.getElementById('filter-saturate').value = 150; document.getElementById('filter-saturate-lbl').innerText = '150%';
        }
        patrzalkaApp.updateTransform();
    },

    resetFilters: (fullReset = false) => {
        ['brightness', 'contrast', 'saturate'].forEach(id => {
            const el = document.getElementById('filter-'+id);
            if(el) { el.value = 100; document.getElementById(`filter-${id}-lbl`).innerText = '100%'; }
        });
        ['sepia', 'hue', 'blur'].forEach(id => {
            const el = document.getElementById('filter-'+id);
            const unit = id === 'hue' ? 'deg' : (id === 'blur' ? 'px' : '%');
            if(el) { el.value = 0; document.getElementById(`filter-${id}-lbl`).innerText = '0' + unit; }
        });
        patrzalkaApp.filters.grayscale = 0;
        patrzalkaApp.filters.invert = 0;
        
        if (fullReset) { patrzalkaApp.rotate = 0; patrzalkaApp.flipX = 1; patrzalkaApp.flipY = 1; }
        patrzalkaApp.updateTransform();
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
    // RĘCZNE KADROWANIE (Modalne narzędzie z prostokątem)
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

        // Dopasowujemy wielkość rysowania do dostępnego ekranu
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
            // Renderuj oryginalny obraz
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Jeśli użytkownik coś rysuje
            if (cropRect) {
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                // Zaciemnienie wokół wybranego kwadratu
                ctx.fillRect(0, 0, canvas.width, cropRect.y); // top
                ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.h); // left
                ctx.fillRect(cropRect.x + cropRect.w, cropRect.y, canvas.width - (cropRect.x + cropRect.w), cropRect.h); // right
                ctx.fillRect(0, cropRect.y + cropRect.h, canvas.width, canvas.height - (cropRect.y + cropRect.h)); // bottom

                // Ramka wycinania
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
                ctx.setLineDash([]);
                
                // Informacje o prawdziwym wymiarze wycinanego kawałka
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

            // Zabezpieczenie przed wyjechaniem poza ekran
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

            // Przelicz z wirtualnego Canvas na PRAWDZIWE wymiary pliku (wysoka jakość)
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

            const dataUrl = resCanvas.toDataURL('image/png'); // Preserve quality
            const fileObj = typeof fileSystem !== 'undefined' ? fileSystem.find(f => f.id === patrzalkaApp.currentImageId) : null;
            
            if (fileObj) {
                fileObj.content = dataUrl;
                if(typeof fsManager !== 'undefined') fsManager.save();
                patrzalkaApp.open(fileObj);
                if(typeof apps !== 'undefined') apps.showToast('Sukces', 'Wykadrowano obraz!', 'success');
            }
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
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                const fileObj = typeof fileSystem !== 'undefined' ? fileSystem.find(f => f.id === patrzalkaApp.currentImageId) : null;
                if (fileObj) {
                    fileObj.content = dataUrl;
                    if(typeof fsManager !== 'undefined') fsManager.save();
                    patrzalkaApp.open(fileObj); 
                    if(typeof apps !== 'undefined') apps.showToast('Patrzałka', `Zmieniono rozmiar na ${newW}x${newH}`, 'success');
                }
            });
        }
    },

    // ==================================================================
    // ZAAWANSOWANE ZAPISYWANIE OBRAZU (Pobierz na PC, Zapisz z filtrami)
    // ==================================================================
    showSaveModal: () => {
        if(!patrzalkaApp.currentImageId) return;
        const img = document.getElementById('pat-main-img');
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
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-blue-500/30">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Zapisywanie obrazu</h2>

                <div class="mb-4">
                    <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Nazwa pliku</label>
                    <input type="text" id="pat-save-name" value="${defaultName}" class="w-full p-2 bg-gray-100 dark:bg-[#111] border border-gray-300 dark:border-[#444] rounded outline-none text-gray-800 dark:text-white focus:border-blue-500 font-bold">
                </div>

                <div class="mb-4">
                    <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Format pliku</label>
                    <select id="pat-save-format" class="w-full p-2 bg-gray-100 dark:bg-[#111] border border-gray-300 dark:border-[#444] rounded outline-none text-gray-800 dark:text-white cursor-pointer focus:border-blue-500">
                        <option value="image/jpeg">JPEG (.jpg)</option>
                        <option value="image/png">PNG (.png) - Przezroczystość</option>
                        <option value="image/webp">WebP (.webp) - Zoptymalizowany</option>
                    </select>
                </div>

                <div class="mb-6">
                    <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Miejsce zapisu (w systemie BigOS)</label>
                    <select id="pat-save-folder" class="w-full p-2 bg-gray-100 dark:bg-[#111] border border-gray-300 dark:border-[#444] rounded outline-none text-gray-800 dark:text-white cursor-pointer focus:border-blue-500">
                        ${folderOptions}
                    </select>
                </div>

                <div class="flex gap-2 justify-between flex-wrap sm:flex-nowrap">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition font-medium text-xs sm:text-sm">Anuluj</button>
                    <div class="flex gap-2">
                        <button onclick="patrzalkaApp.executeSave('pc')" class="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-600/30 transition font-bold text-xs sm:text-sm">📥 Pobierz na PC</button>
                        <button onclick="patrzalkaApp.executeSave('bigos')" class="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-600/30 transition font-bold text-xs sm:text-sm">💾 Zapisz BigOS</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Pre-wybór formatu na podstawie nazwy
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

        if(!nameInput) return;

        // Auto-dopasowanie prawidłowego rozszerzenia
        let finalName = nameInput;
        const ext = format === 'image/jpeg' ? '.jpg' : (format === 'image/png' ? '.png' : '.webp');
        if (!finalName.toLowerCase().endsWith(ext) && !finalName.toLowerCase().endsWith('.jpeg')) {
            finalName = finalName.replace(/\.[^/.]+$/, "") + ext;
        }

        // Renderujemy kompozycję canvasową (uwzględniającą wszystkie filtry i rotację!)
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

        const b = document.getElementById('filter-brightness')?.value || 100;
        const c = document.getElementById('filter-contrast')?.value || 100;
        const s = document.getElementById('filter-saturate')?.value || 100;
        const sep = document.getElementById('filter-sepia')?.value || 0;
        const h = document.getElementById('filter-hue')?.value || 0;
        const bl = document.getElementById('filter-blur')?.value || 0;
        
        ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%) sepia(${sep}%) hue-rotate(${h}deg) blur(${bl}px) grayscale(${patrzalkaApp.filters.grayscale}%) invert(${patrzalkaApp.filters.invert}%)`;

        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

        const dataUrl = canvas.toDataURL(format, 0.92);

        if (target === 'pc') {
            // Fizyczne pobranie na komputer użytkownika
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = finalName;
            link.click();
            if(typeof apps !== 'undefined') apps.showToast('Pobieranie', 'Pobrano obraz na dysk komputera.', 'success');
        } else {
            // Zapis głęboko w systemie BigOS
            if (typeof fileSystem !== 'undefined') {
                let existingFile = fileSystem.find(f => f.id === patrzalkaApp.currentImageId);

                // Nadpisz jeśli ten sam folder i nazwa, w przeciwnym razie stworzymy klon
                if (existingFile && existingFile.parentId === folderId && existingFile.name === finalName) {
                    existingFile.content = dataUrl;
                } else {
                    let newId = 'img_' + Date.now();
                    fileSystem.push({
                        id: newId, type: 'image', name: finalName, icon: '🖼️', content: dataUrl,
                        parentId: folderId, x: Math.floor(Math.random()*100)+20, y: Math.floor(Math.random()*100)+20
                    });
                    patrzalkaApp.currentImageId = newId; 
                }

                if(typeof fsManager !== 'undefined') fsManager.save();
                if(typeof desktop !== 'undefined') desktop.render();
                
                const aW = document.getElementById('app-aktowka');
                if(aW && aW.classList.contains('active') && typeof fsManager !== 'undefined') {
                    fsManager.renderExplorerContent(fsManager.currentFolder);
                }
                if(typeof apps !== 'undefined') apps.showToast('Zapisano', `Zapisano ${finalName} w systemie.`, 'success');
            }
        }

        const modal = document.getElementById('pat-save-modal');
        if(modal) modal.remove();

        const currentItem = typeof fileSystem !== 'undefined' ? fileSystem.find(f => f.id === patrzalkaApp.currentImageId) : null;
        if (currentItem) patrzalkaApp.open(currentItem);
    }
};

setTimeout(patrzalkaApp.init, 500);