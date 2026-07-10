// ======================================================================
// PLIK: js/aplikacje/grajacz.js (Grajacz Filmów PRO v1.3)
// ======================================================================

const grajaczApp = {
    video: null, thumbVideo: null, ytFrame: null,
    queue: [], history: [], bookmarks: [], devLogs: [],
    currentIndex: -1, playMode: 0,
    isPlaying: false, isFullscreen: false, controlsTimeout: null,
    draggedIndex: null, resumeData: {},

    isCinemaMode: false,
    vidRotation: 0, isMirrored: false,
    statsInterval: null, _initialized: false,

    parseSafe: (data, defaultVal) => {
        if (!data || data === 'null' || data === 'undefined') return defaultVal;
        try { return JSON.parse(data) || defaultVal; } catch(e) { return defaultVal; }
    },

    log: (msg, type = "INFO") => {
        const time = new Date().toLocaleTimeString('pl-PL') + `.${new Date().getMilliseconds()}`;
        grajaczApp.devLogs.push({ time, type, msg });
        if(grajaczApp.devLogs.length > 100) grajaczApp.devLogs.shift();
        grajaczApp.renderLogs();
    },

    init: () => {
        if (grajaczApp._initialized) return;
        grajaczApp._initialized = true;

        if (!window.Hls) {
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
            document.head.appendChild(script);
        }

        grajaczApp.queue = grajaczApp.parseSafe(localStorage.getItem('bigos_grajacz_queue'), []).filter(t => !t.isLocal);
        grajaczApp.history = grajaczApp.parseSafe(localStorage.getItem('bigos_grajacz_history'), []);
        grajaczApp.resumeData = grajaczApp.parseSafe(localStorage.getItem('bigos_grajacz_resume'), {});
        grajaczApp.bookmarks = grajaczApp.parseSafe(localStorage.getItem('bigos_grajacz_bookmarks'), []);

        grajaczApp.upgradeUI();
        window.addEventListener('keydown', grajaczApp.handleShortcuts);

        grajaczApp.video = document.getElementById('grajacz-video');
        grajaczApp.ytFrame = document.getElementById('grajacz-yt');

        if (grajaczApp.video) {
            grajaczApp.video.addEventListener('timeupdate', grajaczApp.onTimeUpdate);
            grajaczApp.video.addEventListener('ended', () => grajaczApp.next());
        }

        grajaczApp.renderQueue();
        grajaczApp.renderBookmarks();
        grajaczApp.injectGlobalContextMenu();

        setInterval(grajaczApp.saveResumeState, 5000);
    },

    closeApp: () => {
        if (grajaczApp.video) {
            grajaczApp.video.pause();
            grajaczApp.video.removeEventListener('timeupdate', grajaczApp.onTimeUpdate);
            grajaczApp.video.removeEventListener('ended', grajaczApp.next);
            grajaczApp.video.src = '';
        }
        if (grajaczApp.ytFrame) {
            grajaczApp.ytFrame.src = '';
        }
        grajaczApp.isPlaying = false;

        const placeholder = document.getElementById('grajacz-placeholder');
        if (placeholder) placeholder.style.opacity = '1';

        const playBtn = document.getElementById('grajacz-btn-play');
        if (playBtn) playBtn.innerText = '▶';

        if (grajaczApp.statsInterval) {
            clearInterval(grajaczApp.statsInterval);
            grajaczApp.statsInterval = null;
        }

        grajaczApp._initialized = false;
        grajaczApp.saveData();

        if (typeof winManager !== 'undefined') {
            winManager.close('grajacz');
        }
    },

    injectGlobalContextMenu: () => {
        if (typeof desktop !== 'undefined' && !grajaczApp._contextMenuPatched) {
            const origMenu = desktop.showContextMenu;
            desktop.showContextMenu = function(e, targetType, id) {
                origMenu.call(this, e, targetType, id);
                const menu = document.getElementById('context-menu');
                if (!menu || !menu.classList.contains('active')) return;

                if (targetType === 'file' && id) {
                    const f = fileSystem.find(i => i.id === id);
                    if (f && f.name.match(/\.(mp4|webm|avi|mkv|mov|flv|m4v|ts|ogg)$/i)) {
                        const sep = "<div class='border-t border-gray-300 dark:border-gray-600 my-1'></div>";
                        const btnClass = "px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition text-sm";
                        menu.innerHTML += `${sep}<div class="${btnClass} font-bold text-red-500" onclick="document.getElementById('context-menu').classList.remove('active'); grajaczApp.openWithItem('${id}')">🎬 Otwórz w Grajaczu Wideo</div>`;
                    }
                }
            };
            grajaczApp._contextMenuPatched = true;
        }
    },

    saveData: () => {
        const safeQueue = grajaczApp.queue.filter(q => !q.isLocal);
        localStorage.setItem('bigos_grajacz_queue', JSON.stringify(safeQueue));
        localStorage.setItem('bigos_grajacz_history', JSON.stringify(grajaczApp.history));
        localStorage.setItem('bigos_grajacz_bookmarks', JSON.stringify(grajaczApp.bookmarks));
    },

    saveResumeState: () => {
        if (grajaczApp.isPlaying && grajaczApp.currentIndex >= 0 && grajaczApp.queue[grajaczApp.currentIndex]) {
            const track = grajaczApp.queue[grajaczApp.currentIndex];
            if (grajaczApp.video && grajaczApp.video.currentTime > 5) {
                grajaczApp.resumeData[track.url] = grajaczApp.video.currentTime;
                localStorage.setItem('bigos_grajacz_resume', JSON.stringify(grajaczApp.resumeData));
            }
        }
    },

    upgradeUI: () => {
        let appWindow = document.getElementById('app-grajacz');
        if (!appWindow) {
            appWindow = document.createElement('div');
            appWindow.id = 'app-grajacz';
            appWindow.className = 'window absolute';
            document.body.appendChild(appWindow);
        }

        appWindow.style.width = '900px';
        appWindow.style.height = '550px';
        appWindow.style.background = 'transparent';
        appWindow.style.border = 'none';
        appWindow.style.boxShadow = 'none';

        const titleBar = appWindow.querySelector('.title-bar');
        Array.from(appWindow.children).forEach(child => { if (child !== titleBar) child.remove(); });
        if (titleBar) titleBar.style.display = 'none';

        const proUI = document.createElement('div');
        proUI.className = 'flex flex-row overflow-hidden relative themed-app g-panel rounded-lg shadow-2xl h-full w-full';

        proUI.innerHTML = `
            <div id="grajacz-video-wrapper" class="flex-grow flex flex-col relative bg-black overflow-hidden group h-full">
                <div id="grajacz-top-bar" class="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/90 to-transparent z-50 flex justify-between items-center transition-opacity duration-300"
                     onmousedown="winManager.startDrag(event, 'app-grajacz')">
                    <span class="text-white font-bold drop-shadow-md truncate flex-grow text-sm" id="grajacz-title-overlay">🎬 Grajacz Wideo</span>
                    <div class="flex gap-2 shrink-0">
                        <button onclick="winManager.minimize('grajacz')" class="g-icon-btn text-white px-2 hover:bg-white/20 rounded">_</button>
                        <button onclick="grajaczApp.toggleFullscreen()" class="g-icon-btn text-white px-2 hover:bg-white/20 rounded">□</button>
                        <button onclick="grajaczApp.closeApp()" class="text-red-500 hover:bg-red-500/20 px-2 font-bold rounded transition">✖</button>
                    </div>
                </div>

                <div class="absolute inset-0 flex items-center justify-center">
                    <video id="grajacz-video" class="w-full h-full object-contain transition-all duration-300"></video>
                    <iframe id="grajacz-yt" class="w-full h-full hidden border-none" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    <div id="grajacz-placeholder" class="text-gray-500 flex flex-col items-center pointer-events-none transition-opacity">
                        <span class="text-7xl mb-4 drop-shadow-lg opacity-30">🍿</span>
                        <p class="font-bold tracking-widest uppercase">Wybierz plik wideo lub wklej link</p>
                    </div>
                </div>

                <div id="grajacz-controls" class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 z-50 transition-opacity duration-300 flex flex-col gap-2 opacity-0 group-hover:opacity-100">
                    <div class="w-full flex items-center gap-3 text-xs font-mono text-gray-300">
                        <span id="grajacz-time">00:00:00</span>
                        <div class="flex-grow relative h-3 bg-white/20 rounded cursor-pointer group/progress" id="grajacz-progress-bg" onclick="grajaczApp.seekClick(event)">
                            <div id="grajacz-progress-bar" class="absolute top-0 left-0 bottom-0 bg-red-600 rounded pointer-events-none" style="width: 0%"></div>
                        </div>
                        <span id="grajacz-duration">00:00:00</span>
                    </div>

                    <div class="flex items-center justify-between w-full mt-1">
                        <div class="flex items-center gap-3 sm:gap-4">
                            <button class="text-white hover:text-red-400 transition text-lg" onclick="grajaczApp.togglePlayMode()" id="grajacz-btn-mode" title="Tryb">➡</button>
                            <button class="text-white hover:text-red-400 transition text-xl" onclick="grajaczApp.prev()">⏮</button>
                            <button class="text-white hover:text-red-400 transition text-3xl drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]" onclick="grajaczApp.togglePlay()" id="grajacz-btn-play">▶</button>
                            <button class="text-white hover:text-red-400 transition text-xl" onclick="grajaczApp.next()">⏭</button>
                            <div class="w-px h-6 bg-gray-600 mx-1"></div>
                            <button class="text-white hover:text-red-400 transition text-lg w-6" onclick="grajaczApp.toggleMute()" id="grajacz-btn-mute">🔊</button>
                            <input type="range" id="grajacz-volume" min="0" max="100" value="100" class="w-20 sm:w-24 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-red-600" oninput="grajaczApp.setVolume(this.value)">
                            <select id="grajacz-speed-select" class="text-[10px] bg-white/20 px-1 py-1 rounded text-white cursor-pointer hover:bg-white/40 ml-2 outline-none border-none" onchange="grajaczApp.setSpeed(this.value)">
                                <option value="0.5" class="bg-gray-800">0.5x</option>
                                <option value="1.0" class="bg-gray-800" selected>1.0x (Norm)</option>
                                <option value="1.5" class="bg-gray-800">1.5x</option>
                                <option value="2.0" class="bg-gray-800">2.0x</option>
                            </select>
                        </div>
                        <div class="flex items-center gap-4">
                            <button class="text-white hover:text-red-400 transition text-lg" onclick="grajaczApp.toggleSidebar()" title="Pokaż/Ukryj Panel">📖</button>
                            <button class="text-white hover:text-red-400 transition text-lg" onclick="grajaczApp.toggleCinemaMode()" title="Tryb Kinowy">🍿</button>
                            <button class="text-white hover:text-red-400 transition text-lg" onclick="grajaczApp.togglePiP()" title="Mini Player (P)">🔲</button>
                            <button class="text-white hover:text-red-400 transition text-lg" onclick="grajaczApp.toggleFullscreen()" title="Pełny Ekran (F)">⛶</button>
                        </div>
                    </div>
                </div>
            </div>

            <div id="grajacz-sidebar" class="w-[300px] border-l g-border bg-black/50 flex flex-col shrink-0 transition-all duration-300 relative z-10">
                <div class="flex text-[10px] sm:text-xs font-bold border-b g-border shrink-0 bg-black/20">
                    <button onclick="grajaczApp.switchTab('queue')" id="tab-v-queue" class="g-tab active flex-1 py-3 uppercase tracking-wider">Kolejka</button>
                    <button onclick="grajaczApp.switchTab('tools')" id="tab-v-tools" class="g-tab flex-1 py-3 uppercase tracking-wider">Narzędzia</button>
                    <button onclick="grajaczApp.switchTab('stats')" id="tab-v-stats" class="g-tab flex-1 py-3 uppercase tracking-wider text-red-400">Stats</button>
                </div>

                <div id="vtab-queue" class="tab-content flex-1 overflow-hidden flex flex-col">
                    <div class="flex flex-col gap-2 p-2 border-b g-border bg-black/10 shrink-0">
                        <div class="flex gap-2 w-full">
                            <button class="g-btn flex-1 text-[10px] py-2 rounded font-bold shadow-md bg-blue-600/20 border-blue-500" onclick="document.getElementById('grajacz-pc').click()">+ Z PC</button>
                            <button class="g-btn flex-1 text-[10px] py-2 rounded font-bold shadow-md bg-emerald-600/20 border-emerald-500" onclick="grajaczApp.addUrlPrompt()">+ URL</button>
                        </div>
                        <input type="file" id="grajacz-pc" multiple accept="video/*,.mkv,.ts,.webm,.avi" class="hidden" onchange="grajaczApp.loadFiles(event)">
                    </div>
                    <div id="grajacz-queue-list" class="flex-1 overflow-y-auto custom-scrollbar p-2" ondragover="event.preventDefault()" ondrop="grajaczApp.handleDrop(event)"></div>
                </div>

                <div id="vtab-tools" class="tab-content flex-1 overflow-y-auto custom-scrollbar p-4 hidden flex-col gap-4">
                    <h3 class="font-bold text-sm g-accent border-b g-border pb-2">Narzędzia Wideo</h3>
                    <div class="grid grid-cols-2 gap-2">
                        <button class="g-btn p-2 rounded flex flex-col items-center gap-1 shadow-inner" onclick="grajaczApp.takeScreenshot()">
                            <span class="text-xl">📷</span><span class="text-[9px] font-bold">Zrzut Ekranu</span>
                        </button>
                        <button class="g-btn p-2 rounded flex flex-col items-center gap-1 shadow-inner" onclick="grajaczApp.rotateVideo()">
                            <span class="text-xl">🔄</span><span class="text-[9px] font-bold">Obróć 90°</span>
                        </button>
                    </div>

                    <h3 class="font-bold text-sm g-accent border-b g-border pb-2 mt-4">Korekcja Obrazu</h3>
                    ${grajaczApp.genSlider('filter-brightness', 'Jasność', 0, 200, 100, '%')}
                    ${grajaczApp.genSlider('filter-contrast', 'Kontrast', 0, 200, 100, '%')}
                    ${grajaczApp.genSlider('filter-saturate', 'Nasycenie', 0, 300, 100, '%')}
                    <button class="g-btn text-[10px] py-1 rounded border-red-500 text-red-400 mt-1" onclick="grajaczApp.resetFilters()">Resetuj filtry</button>
                </div>

                <div id="vtab-stats" class="tab-content flex-1 overflow-hidden hidden flex-col relative bg-black/20">
                    <div class="p-3 border-b g-border shrink-0 flex justify-between items-center bg-black/40">
                        <h3 class="font-bold text-[10px] g-accent uppercase tracking-wider">Statystyki Wideo</h3>
                    </div>
                    <div class="p-3 grid grid-cols-2 gap-x-4 gap-y-2 shrink-0 border-b g-border font-mono text-[9px] g-text-muted shadow-inner bg-black/60">
                        <div class="flex justify-between border-b border-gray-700/50 pb-1"><span>FPS:</span><span id="stat-fps" class="text-emerald-400 font-bold">0</span></div>
                        <div class="flex justify-between border-b border-gray-700/50 pb-1"><span>Dropped:</span><span id="stat-drop" class="text-red-400 font-bold">0</span></div>
                        <div class="flex justify-between col-span-2 pt-1"><span>Rozdzielczość:</span><span id="stat-res" class="text-purple-400 font-bold">0x0</span></div>
                    </div>
                </div>
            </div>
        `;
        appWindow.appendChild(proUI);

        grajaczApp.video = document.getElementById('grajacz-video');
        grajaczApp.ytFrame = document.getElementById('grajacz-yt');

        const wrapper = document.getElementById('grajacz-video-wrapper');
        wrapper.addEventListener('mousemove', () => {
            const controls = document.getElementById('grajacz-controls');
            const topBar = document.getElementById('grajacz-top-bar');
            controls.style.opacity = '1'; topBar.style.opacity = '1'; wrapper.style.cursor = 'default';

            clearTimeout(grajaczApp.controlsTimeout);
            grajaczApp.controlsTimeout = setTimeout(() => {
                if (grajaczApp.isPlaying) {
                    controls.style.opacity = '0'; topBar.style.opacity = '0';
                    if(grajaczApp.isFullscreen || grajaczApp.isCinemaMode) wrapper.style.cursor = 'none';
                }
            }, 3000);
        });

        wrapper.addEventListener('dblclick', grajaczApp.toggleFullscreen);
        wrapper.addEventListener('dragover', e => e.preventDefault());
        wrapper.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files.length > 0) grajaczApp.handleFilesObject(e.dataTransfer.files); });
    },

    genSlider: (id, name, min, max, val, unit) => {
        return `
        <div class="flex flex-col gap-1 w-full">
            <div class="flex justify-between text-[10px] font-bold g-text-muted uppercase"><span>${name}</span><span id="${id}-lbl">${val}${unit}</span></div>
            <input type="range" id="${id}" min="${min}" max="${max}" value="${val}" class="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500" oninput="document.getElementById('${id}-lbl').innerText=this.value+'${unit}'; grajaczApp.applyFilters()">
        </div>`;
    },

    switchTab: (tabId) => {
        document.querySelectorAll('#grajacz-sidebar .g-tab').forEach(t => t.classList.remove('active', 'text-blue-400', 'text-red-400'));
        const activeBtn = document.getElementById(`tab-v-${tabId}`);
        if(activeBtn) {
            activeBtn.classList.add('active');
            if (tabId === 'stats') activeBtn.classList.add('text-red-400');
            else activeBtn.classList.add('text-blue-400');
        }

        ['queue', 'tools', 'stats'].forEach(id => { document.getElementById(`vtab-${id}`).classList.add('hidden'); });
        document.getElementById(`vtab-${tabId}`).classList.remove('hidden');

        if (tabId === 'stats') grajaczApp.startStatsMonitor();
        else { if(grajaczApp.statsInterval) { clearInterval(grajaczApp.statsInterval); grajaczApp.statsInterval = null; } }
    },

    toggleSidebar: () => {
        const sidebar = document.getElementById('grajacz-sidebar');
        if (sidebar.style.width === '0px') { sidebar.style.width = '300px'; sidebar.style.borderLeftWidth = '1px'; }
        else { sidebar.style.width = '0px'; sidebar.style.borderLeftWidth = '0px'; }
    },

    addUrlPrompt: () => {
        if(typeof ui !== 'undefined') {
            ui.showPrompt("Wklej link wideo / M3U8 / YouTube:", "https://", "Dodaj", (val) => {
                if(!val || val.trim() === '') return;
                const track = { id: 't_'+Date.now(), url: val.trim(), isLocal: false, title: val.split('/').pop() || "Wideo Sieciowe" };
                if(val.includes('youtube.com') || val.includes('youtu.be')) track.title = "YouTube Video";
                grajaczApp.queue.push(track); grajaczApp.saveData(); grajaczApp.renderQueue();
                if(grajaczApp.currentIndex === -1) grajaczApp.playTrack(grajaczApp.queue.length - 1);
            });
        }
    },

    loadFiles: (e) => { if(e.target.files.length > 0) grajaczApp.handleFilesObject(e.target.files); e.target.value = ''; },
    handleFilesObject: (files) => {
        Array.from(files).forEach(file => {
            const url = URL.createObjectURL(file);
            grajaczApp.queue.push({ id: 't_'+Date.now()+Math.random(), url: url, title: file.name, isLocal: true, fileObj: file });
        });
        grajaczApp.renderQueue();
        if(grajaczApp.currentIndex === -1 || !grajaczApp.isPlaying) grajaczApp.playTrack(grajaczApp.queue.length - files.length);
    },

    openWithItem: (itemId) => {
        if(typeof winManager !== 'undefined') winManager.open('grajacz');
        const item = fileSystem.find(i => i.id === itemId);
        if(item) {
            grajaczApp.queue.push({ id: 't_'+Date.now(), url: item.content || '', title: item.name, isLocal: false });
            grajaczApp.saveData(); grajaczApp.renderQueue(); grajaczApp.playTrack(grajaczApp.queue.length - 1);
        }
    },

    handleDrop: (e) => { e.preventDefault(); if (e.dataTransfer.files.length > 0) grajaczApp.handleFilesObject(e.dataTransfer.files); },
    dragQueueStart: (e, index) => { grajaczApp.draggedIndex = index; e.dataTransfer.effectAllowed = "move"; e.target.classList.add('opacity-50'); },
    dragQueueOver: (e) => { e.preventDefault(); document.querySelectorAll('.queue-item-drag').forEach(i => i.classList.remove('border-t-2', 'border-blue-500')); if (e.currentTarget.classList.contains('queue-item-drag')) e.currentTarget.classList.add('border-t-2', 'border-blue-500'); },
    dragQueueDrop: (e, dropIndex) => {
        e.preventDefault();
        document.querySelectorAll('.queue-item-drag').forEach(i => i.classList.remove('border-t-2', 'border-blue-500', 'opacity-50'));
        if(grajaczApp.draggedIndex === null || grajaczApp.draggedIndex === dropIndex) return;
        const item = grajaczApp.queue.splice(grajaczApp.draggedIndex, 1)[0];
        grajaczApp.queue.splice(dropIndex, 0, item);

        if(grajaczApp.currentIndex === grajaczApp.draggedIndex) grajaczApp.currentIndex = dropIndex;
        else if (grajaczApp.currentIndex > grajaczApp.draggedIndex && grajaczApp.currentIndex <= dropIndex) grajaczApp.currentIndex--;
        else if (grajaczApp.currentIndex < grajaczApp.draggedIndex && grajaczApp.currentIndex >= dropIndex) grajaczApp.currentIndex++;

        grajaczApp.draggedIndex = null; grajaczApp.saveData(); grajaczApp.renderQueue();
    },

    renderQueue: () => {
        const list = document.getElementById('grajacz-queue-list');
        if(!list) return;
        const search = (document.getElementById('grajacz-search')?.value || '').toLowerCase();

        list.innerHTML = '';
        if(grajaczApp.queue.length === 0) { list.innerHTML = '<div class="text-center text-[10px] g-text-muted mt-10">Kolejka pusta. Przeciągnij pliki wideo.</div>'; return; }

        let items = [...grajaczApp.queue];
        if (search) items = items.filter(t => t.title.toLowerCase().includes(search));

        items.forEach((track) => {
            const originalIdx = grajaczApp.queue.indexOf(track);
            const isPlaying = (grajaczApp.currentIndex === originalIdx);

            const el = document.createElement('div'); el.draggable = true;
            el.className = `queue-item-drag flex items-center gap-3 p-2 mb-1 border-b border-transparent rounded cursor-pointer transition ${isPlaying ? 'bg-red-600/20 border-red-500/50' : 'hover:bg-white/10'}`;
            el.ondragstart = (e) => grajaczApp.dragQueueStart(e, originalIdx);
            el.ondragover = (e) => grajaczApp.dragQueueOver(e);
            el.ondrop = (e) => grajaczApp.dragQueueDrop(e, originalIdx);

            el.innerHTML = `
                <div class="w-10 h-10 rounded bg-gray-800 flex items-center justify-center shrink-0 border border-gray-600 text-lg cursor-move">🎬</div>
                <div class="flex flex-col overflow-hidden flex-grow" onclick="grajaczApp.playTrack(${originalIdx})">
                    <span class="text-xs font-bold truncate ${isPlaying ? 'text-red-400' : 'g-text'}">${typeof desktop !== 'undefined' ? desktop.escapeHTML(track.title) : track.title}</span>
                    <span class="text-[9px] g-text-muted truncate">${track.isLocal ? 'Z dysku (Lokalny)' : 'Strumień (URL)'}</span>
                </div>
                <button onclick="event.stopPropagation(); grajaczApp.removeTrack('${track.id}')" class="text-red-500 opacity-30 hover:opacity-100 px-3 font-bold transition text-lg">✖</button>
            `;
            list.appendChild(el);
        });
    },

    removeTrack: (id) => {
        grajaczApp.queue = grajaczApp.queue.filter(t => t.id !== id);
        if(grajaczApp.queue.length === 0) grajaczApp.currentIndex = -1;
        grajaczApp.saveData(); grajaczApp.renderQueue();
    },

    playTrack: (index) => {
        if(index < 0 || index >= grajaczApp.queue.length) return;
        const track = grajaczApp.queue[index];
        grajaczApp.currentIndex = index;

        document.getElementById('grajacz-placeholder').style.opacity = '0';
        document.getElementById('grajacz-title-overlay').innerText = track.title;

        grajaczApp.history = grajaczApp.history.filter(h => h.url !== track.url);
        grajaczApp.history.unshift(track);
        if(grajaczApp.history.length > 20) grajaczApp.history.pop();
        grajaczApp.saveData();

        let isYT = track.url.includes('youtube.com') || track.url.includes('youtu.be');
        let isHLS = track.url.includes('.m3u8');

        if (isYT) {
            let ytId = '';
            if(track.url.includes('v=')) ytId = track.url.split('v=')[1].split('&')[0];
            else if(track.url.includes('youtu.be/')) ytId = track.url.split('youtu.be/')[1].split('?')[0];

            grajaczApp.video.pause(); grajaczApp.video.classList.add('hidden');
            grajaczApp.ytFrame.classList.remove('hidden');
            grajaczApp.ytFrame.src = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&controls=0`;
            grajaczApp.isPlaying = true; document.getElementById('grajacz-btn-play').innerText = '⏸';
        }
        else {
            grajaczApp.ytFrame.src = ''; grajaczApp.ytFrame.classList.add('hidden');
            grajaczApp.video.classList.remove('hidden');

            if (isHLS && window.Hls && Hls.isSupported()) {
                const hls = new Hls(); hls.loadSource(track.url); hls.attachMedia(grajaczApp.video);
                hls.on(Hls.Events.MANIFEST_PARSED, function() { grajaczApp.video.play(); });
            } else {
                grajaczApp.video.src = track.url;
                if (grajaczApp.resumeData[track.url]) { grajaczApp.video.currentTime = grajaczApp.resumeData[track.url]; }
                grajaczApp.video.play().then(() => {
                    grajaczApp.isPlaying = true; document.getElementById('grajacz-btn-play').innerText = '⏸';
                }).catch(e => { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Brak kodeka lub zła ścieżka', 'error'); });
            }
        }
        grajaczApp.renderQueue();
    },

    togglePlay: () => {
        if(grajaczApp.currentIndex === -1 && grajaczApp.queue.length > 0) { grajaczApp.playTrack(0); return; }
        const btn = document.getElementById('grajacz-btn-play');

        if (grajaczApp.ytFrame && !grajaczApp.ytFrame.classList.contains('hidden')) {
            grajaczApp.isPlaying = !grajaczApp.isPlaying; btn.innerText = grajaczApp.isPlaying ? '⏸' : '▶'; return;
        }

        if (grajaczApp.video.paused) { grajaczApp.video.play(); grajaczApp.isPlaying = true; btn.innerText = '⏸'; }
        else { grajaczApp.video.pause(); grajaczApp.isPlaying = false; btn.innerText = '▶'; }
    },

    stop: () => {
        if(grajaczApp.video) { grajaczApp.video.pause(); grajaczApp.video.src = ''; grajaczApp.video.classList.add('hidden'); }
        if(grajaczApp.ytFrame) { grajaczApp.ytFrame.src = ''; grajaczApp.ytFrame.classList.add('hidden'); }
        grajaczApp.isPlaying = false;

        document.getElementById('grajacz-placeholder').style.opacity = '1';
        document.getElementById('grajacz-title-overlay').innerText = '🎬 Grajacz Wideo';
        document.getElementById('grajacz-btn-play').innerText = '▶';
    },

    next: () => {
        if (grajaczApp.queue.length === 0) return;
        let nIdx = grajaczApp.currentIndex + 1;
        if (grajaczApp.playMode === 3) nIdx = Math.floor(Math.random() * grajaczApp.queue.length);
        else if (grajaczApp.playMode === 2) nIdx = grajaczApp.currentIndex;
        if (nIdx >= grajaczApp.queue.length) { if (grajaczApp.playMode === 1) nIdx = 0; else return; }
        grajaczApp.playTrack(nIdx);
    },

    prev: () => {
        if (grajaczApp.queue.length === 0) return;
        if (grajaczApp.video && grajaczApp.video.currentTime > 5) { grajaczApp.video.currentTime = 0; return; }
        let pIdx = grajaczApp.currentIndex - 1;
        if (pIdx < 0) pIdx = grajaczApp.queue.length - 1;
        grajaczApp.playTrack(pIdx);
    },

    formatTime: (sec) => {
        if(isNaN(sec) || !isFinite(sec)) return "00:00";
        let h = Math.floor(sec / 3600); let m = Math.floor((sec % 3600) / 60); let s = Math.floor(sec % 60);
        if (h > 0) return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    },

    onTimeUpdate: () => {
        if (!grajaczApp.video) return;
        const cTime = grajaczApp.video.currentTime; const dTime = grajaczApp.video.duration;
        document.getElementById('grajacz-time').innerText = grajaczApp.formatTime(cTime);
        document.getElementById('grajacz-duration').innerText = grajaczApp.formatTime(dTime);
        if (dTime > 0) { const perc = (cTime / dTime) * 100; document.getElementById('grajacz-progress-bar').style.width = `${perc}%`; }
    },

    seekClick: (e) => {
        if(!grajaczApp.video || !grajaczApp.video.duration) return;
        const rect = document.getElementById('grajacz-progress-bg').getBoundingClientRect();
        grajaczApp.video.currentTime = ((e.clientX - rect.left) / rect.width) * grajaczApp.video.duration;
    },

    setVolume: (val) => {
        if(!grajaczApp.video) return;
        grajaczApp.video.volume = val / 100;
        document.getElementById('grajacz-volume').value = val;
        const muteBtn = document.getElementById('grajacz-btn-mute');
        if(val == 0) muteBtn.innerText = '🔇'; else if(val < 50) muteBtn.innerText = '🔉'; else muteBtn.innerText = '🔊';
    },

    toggleMute: () => {
        if(!grajaczApp.video) return;
        if(grajaczApp.video.volume > 0) { grajaczApp.video.dataset.lastVol = grajaczApp.video.volume; grajaczApp.setVolume(0); }
        else { grajaczApp.setVolume((grajaczApp.video.dataset.lastVol || 1) * 100); }
    },

    setSpeed: (val) => { if(grajaczApp.video) grajaczApp.video.playbackRate = parseFloat(val); },
    togglePlayMode: () => {
        grajaczApp.playMode = (grajaczApp.playMode + 1) % 4;
        const icons = ['➡', '🔁', '🔂', '🔀'];
        document.getElementById('grajacz-btn-mode').innerText = icons[grajaczApp.playMode];
    },

    applyFilters: () => {
        if(!grajaczApp.video) return;
        const b = document.getElementById('filter-brightness').value; const c = document.getElementById('filter-contrast').value;
        const s = document.getElementById('filter-saturate').value;
        grajaczApp.video.style.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
    },

    resetFilters: () => {
        document.getElementById('filter-brightness').value = 100; document.getElementById('filter-brightness-lbl').innerText = '100%';
        document.getElementById('filter-contrast').value = 100; document.getElementById('filter-contrast-lbl').innerText = '100%';
        document.getElementById('filter-saturate').value = 100; document.getElementById('filter-saturate-lbl').innerText = '100%';
        grajaczApp.applyFilters();
    },

    takeScreenshot: () => {
        if(!grajaczApp.video || grajaczApp.video.readyState < 2) return typeof apps !== 'undefined' ? apps.showToast('Błąd', 'Brak ramki wideo', 'error') : null;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = grajaczApp.video.videoWidth; canvas.height = grajaczApp.video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.save();
            if (grajaczApp.isMirrored) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
            ctx.drawImage(grajaczApp.video, 0, 0, canvas.width, canvas.height);
            ctx.restore();

            const dataUrl = canvas.toDataURL('image/png');
            const fileName = `Kadr_${Date.now()}.png`;

            if(typeof fileSystem !== 'undefined' && typeof fsManager !== 'undefined') {
                fileSystem.push({ id: 'img_'+Date.now(), type: 'image', name: fileName, icon: '🖼️', content: dataUrl, parentId: fsManager.currentFolder || 'root', x: 50, y: 50 });
                fsManager.save();
                if(typeof desktop !== 'undefined') desktop.render();
                if(typeof apps !== 'undefined') apps.showToast('Zrzut ekranu', `Zapisano ${fileName} do systemu!`, 'success');
            } else {
                const link = document.createElement('a'); link.href = dataUrl; link.download = fileName; link.click();
            }
        } catch(e) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Pobieranie klatki zablokowane przez zabezpieczenia (CORS).', 'error'); }
    },

    applyTransforms: () => { if (grajaczApp.video) grajaczApp.video.style.transform = `rotate(${grajaczApp.vidRotation}deg) scaleX(${grajaczApp.isMirrored ? -1 : 1})`; },
    rotateVideo: () => { grajaczApp.vidRotation = (grajaczApp.vidRotation + 90) % 360; grajaczApp.applyTransforms(); },

    toggleCinemaMode: () => {
        grajaczApp.isCinemaMode = !grajaczApp.isCinemaMode;
        let overlay = document.getElementById('grajacz-cinema-overlay');
        if(!overlay) {
            overlay = document.createElement('div'); overlay.id = 'grajacz-cinema-overlay';
            overlay.className = 'fixed inset-0 bg-black/95 z-[9990] transition-opacity pointer-events-none';
            document.body.appendChild(overlay);
        }
        const win = document.getElementById('app-grajacz');
        if (grajaczApp.isCinemaMode) {
            overlay.style.display = 'block';
            win.style.setProperty('z-index', '9999', 'important');
        } else {
            overlay.style.display = 'none';
            win.style.removeProperty('z-index');
            // Przywróć standardowe pozycjonowanie i z-index
            if (typeof winManager !== 'undefined') {
                winManager.bringToFront(win);
            }
        }
    },

    toggleFullscreen: () => {
        const wrapper = document.getElementById('grajacz-video-wrapper');
        if (!document.fullscreenElement) {
            if (wrapper.requestFullscreen) wrapper.requestFullscreen();
            else if (wrapper.webkitRequestFullscreen) wrapper.webkitRequestFullscreen();
            grajaczApp.isFullscreen = true;
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            grajaczApp.isFullscreen = false;
        }
    },

    togglePiP: async () => {
        if (!grajaczApp.video) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                const win = document.getElementById('app-grajacz');
                if (win && typeof winManager !== 'undefined') {
                    winManager.open('grajacz');
                }
            } else {
                // Wymagane jest odtwarzanie, aby wejść w PiP
                if (grajaczApp.video.paused) {
                    await grajaczApp.video.play();
                    grajaczApp.isPlaying = true;
                    document.getElementById('grajacz-btn-play').innerText = '⏸';
                }
                const win = document.getElementById('app-grajacz');
                if (win && typeof winManager !== 'undefined') {
                    winManager.minimize('grajacz');
                }
                await grajaczApp.video.requestPictureInPicture();
            }
        } catch(e) {
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Mini Odtwarzacz nie jest obsługiwany.', 'error');
        }
    },

    startStatsMonitor: () => {
        if(grajaczApp.statsInterval) clearInterval(grajaczApp.statsInterval);
        let lastDecoded = 0; let lastTime = performance.now();
        grajaczApp.statsInterval = setInterval(() => {
            const statsTab = document.getElementById('vtab-stats');
            if (!statsTab || statsTab.classList.contains('hidden')) return;
            if (grajaczApp.video) {
                const q = grajaczApp.video.getVideoPlaybackQuality ? grajaczApp.video.getVideoPlaybackQuality() : null;
                if (q) {
                    const now = performance.now(); const diffTime = (now - lastTime) / 1000; const diffFrames = q.totalVideoFrames - lastDecoded;
                    let fps = diffTime > 0 ? (diffFrames / diffTime).toFixed(1) : 0;
                    document.getElementById('stat-fps').innerText = fps; document.getElementById('stat-drop').innerText = q.droppedVideoFrames;
                    lastDecoded = q.totalVideoFrames; lastTime = now;
                }
                document.getElementById('stat-res').innerText = `${grajaczApp.video.videoWidth || 0}x${grajaczApp.video.videoHeight || 0}`;
            }
        }, 1000);
    },

    handleShortcuts: (e) => {
        const w = document.getElementById('app-grajacz');
        if (w && w.classList.contains('active') && !w.classList.contains('minimized')) {
            if(document.activeElement && document.activeElement.tagName === 'INPUT') return;
            switch(e.code) {
                case 'Space': e.preventDefault(); grajaczApp.togglePlay(); break;
                case 'ArrowRight': e.preventDefault(); if(grajaczApp.video) grajaczApp.video.currentTime += 5; break;
                case 'ArrowLeft': e.preventDefault(); if(grajaczApp.video) grajaczApp.video.currentTime -= 5; break;
                case 'KeyF': e.preventDefault(); grajaczApp.toggleFullscreen(); break;
                case 'KeyP': e.preventDefault(); grajaczApp.togglePiP(); break;
            }
        }
    },

    renderLogs: () => {},
    renderBookmarks: () => {}
};

// Rejestracja w systemie
setTimeout(() => {
    if (typeof apps !== 'undefined') {
        apps.loadGrajacz = grajaczApp.init;
        apps.grajaczStop = () => grajaczApp.closeApp();
    }
    grajaczApp.init();
}, 500);