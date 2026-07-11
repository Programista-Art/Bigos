// ======================================================================
// PLIK: js/aplikacje/bigcut.js (BigCut - Edytor Wideo)
// ======================================================================
const BigCut = {
    videoFile: null,
    videoUrl: null,
    audioFile: null,
    audioUrl: null,
    trimStart: 0,
    trimEnd: 0,
    duration: 0,
    overlayText: '',
    textX: 10,
    textY: 10,
    fontSize: 24,
    fontColor: 'white',
    ffmpeg: null,
    isFFmpegLoaded: false,
    isExporting: false,

    init: () => {
        if (document.getElementById('app-bigcut')) return; // już otwarte
        BigCut.buildUI();
        BigCut.loadFFmpeg();
    },

    close: () => {
        // Zwolnij zasoby
        if (BigCut.videoUrl) URL.revokeObjectURL(BigCut.videoUrl);
        if (BigCut.audioUrl) URL.revokeObjectURL(BigCut.audioUrl);
        BigCut.videoFile = null;
        BigCut.audioFile = null;
    },

    loadFFmpeg: async () => {
        if (BigCut.isFFmpegLoaded) return;
        const status = document.getElementById('bigcut-ffmpeg-status');
        if (status) status.textContent = '⏳ Ładowanie silnika wideo (pierwsze uruchomienie może potrwać)...';
        const { createFFmpeg, fetchFile } = FFmpeg;
        BigCut.ffmpeg = createFFmpeg({
            log: false,
            corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js',
        });
        await BigCut.ffmpeg.load();
        BigCut.isFFmpegLoaded = true;
        if (status) status.textContent = '✅ Gotowy do pracy';
        if (typeof apps !== 'undefined') apps.showToast('BigCut', 'Silnik wideo załadowany.', 'success');
    },

    buildUI: () => {
        const old = document.getElementById('app-bigcut');
        if (old) old.remove();

        const win = document.createElement('div');
        win.id = 'app-bigcut';
        win.className = 'window absolute';
        win.style.width = '960px';
        win.style.height = '650px';
        win.style.background = 'transparent';
        win.style.border = 'none';
        win.style.boxShadow = 'none';
        document.body.appendChild(win);

        if (typeof winManager !== 'undefined' && winManager.register) {
            winManager.register('app-bigcut');
        }

        const frame = document.createElement('div');
        frame.className = 'flex flex-col h-full w-full themed-app g-panel rounded-lg shadow-2xl overflow-hidden';
        frame.innerHTML = `
            <div class="px-4 py-2 border-b g-border flex justify-between items-center cursor-move bg-black/30 shrink-0"
                 onmousedown="winManager.startDrag(event, 'app-bigcut')"
                 ontouchstart="winManager.startDrag(event, 'app-bigcut')">
                <span class="text-sm font-bold g-accent drop-shadow-md">🎬 BigCut - Edytor Wideo</span>
                <div class="flex gap-2">
                    <button onclick="winManager.minimize('app-bigcut')" class="g-icon-btn px-1 hover:text-white">_</button>
                    <button onclick="winManager.maximize('app-bigcut')" class="g-icon-btn px-1 hover:text-white">□</button>
                    <button onclick="winManager.close('app-bigcut'); BigCut.close();" class="text-red-500 hover:text-red-400 px-1 font-bold">✖</button>
                </div>
            </div>
            <div class="flex flex-col flex-grow p-4 gap-4 overflow-auto">
                <div class="flex flex-wrap gap-3 items-end">
                    <button id="bigcut-import-video" class="g-btn bg-blue-600/20 hover:bg-blue-600 border-blue-500/50 text-xs px-4 py-2 rounded font-bold">📁 Importuj wideo</button>
                    <button id="bigcut-import-audio" class="g-btn bg-purple-600/20 hover:bg-purple-600 border-purple-500/50 text-xs px-4 py-2 rounded font-bold">🎵 Importuj muzykę</button>
                    <span id="bigcut-video-name" class="text-xs g-text-muted truncate max-w-[200px]">Brak pliku</span>
                </div>
                <div class="flex justify-center bg-black rounded-xl overflow-hidden" style="min-height: 300px; position: relative;">
                    <video id="bigcut-preview" controls class="max-h-[400px] w-auto"></video>
                </div>
                <div class="bg-black/30 rounded-xl p-3 border g-border">
                    <label class="text-xs font-bold g-accent block mb-1">✂️ Przycinanie</label>
                    <div class="flex items-center gap-2 text-xs">
                        <span>Start:</span>
                        <input type="range" id="bigcut-trim-start" min="0" max="100" value="0" class="flex-1">
                        <span id="bigcut-start-time">0s</span>
                    </div>
                    <div class="flex items-center gap-2 text-xs mt-2">
                        <span>Koniec:</span>
                        <input type="range" id="bigcut-trim-end" min="0" max="100" value="100" class="flex-1">
                        <span id="bigcut-end-time">0s</span>
                    </div>
                </div>
                <div class="bg-black/30 rounded-xl p-3 border g-border">
                    <label class="text-xs font-bold g-accent block mb-1">🔤 Tekst na wideo</label>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <input type="text" id="bigcut-text" placeholder="Wpisz tekst..." class="col-span-2 sm:col-span-4 p-2 g-bg g-text border g-border rounded outline-none">
                        <input type="number" id="bigcut-text-x" placeholder="X" value="10" class="p-2 g-bg g-text border g-border rounded">
                        <input type="number" id="bigcut-text-y" placeholder="Y" value="10" class="p-2 g-bg g-text border g-border rounded">
                        <input type="number" id="bigcut-text-size" placeholder="Rozmiar" value="24" class="p-2 g-bg g-text border g-border rounded">
                        <select id="bigcut-text-color" class="p-2 g-bg g-text border g-border rounded">
                            <option value="white">Biały</option>
                            <option value="red">Czerwony</option>
                            <option value="yellow">Żółty</option>
                            <option value="black">Czarny</option>
                        </select>
                    </div>
                </div>
                <div class="flex flex-wrap gap-3 mt-2">
                    <button id="bigcut-export-pc" class="g-btn bg-emerald-600/20 hover:bg-emerald-600 border-emerald-500/50 text-xs px-5 py-2 rounded font-bold">💾 Pobierz na PC</button>
                    <button id="bigcut-export-bigos" class="g-btn bg-amber-600/20 hover:bg-amber-600 border-amber-500/50 text-xs px-5 py-2 rounded font-bold">📂 Zapisz w BigOS</button>
                    <span id="bigcut-export-status" class="text-xs g-text-muted self-center"></span>
                    <span id="bigcut-ffmpeg-status" class="text-xs g-text-muted self-center ml-auto"></span>
                </div>
            </div>
        `;
        win.appendChild(frame);

        // Obsługa przycisków
        document.getElementById('bigcut-import-video').onclick = () => BigCut.importVideo();
        document.getElementById('bigcut-import-audio').onclick = () => BigCut.importAudio();
        const startS = document.getElementById('bigcut-trim-start');
        const endS = document.getElementById('bigcut-trim-end');
        startS.oninput = endS.oninput = () => BigCut.updateTrimFromSliders();
        document.getElementById('bigcut-text').oninput = (e) => BigCut.overlayText = e.target.value;
        document.getElementById('bigcut-text-x').oninput = (e) => BigCut.textX = parseInt(e.target.value) || 0;
        document.getElementById('bigcut-text-y').oninput = (e) => BigCut.textY = parseInt(e.target.value) || 0;
        document.getElementById('bigcut-text-size').oninput = (e) => BigCut.fontSize = parseInt(e.target.value) || 24;
        document.getElementById('bigcut-text-color').onchange = (e) => BigCut.fontColor = e.target.value;
        document.getElementById('bigcut-export-pc').onclick = () => BigCut.exportToPC();
        document.getElementById('bigcut-export-bigos').onclick = () => BigCut.exportToBigOS();
    },

    importVideo: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (BigCut.videoUrl) URL.revokeObjectURL(BigCut.videoUrl);
            BigCut.videoFile = file;
            BigCut.videoUrl = URL.createObjectURL(file);
            const video = document.getElementById('bigcut-preview');
            video.src = BigCut.videoUrl;
            video.onloadedmetadata = () => {
                BigCut.duration = video.duration;
                document.getElementById('bigcut-trim-start').max = BigCut.duration;
                document.getElementById('bigcut-trim-end').max = BigCut.duration;
                document.getElementById('bigcut-trim-end').value = BigCut.duration;
                BigCut.updateTrimFromSliders();
                document.getElementById('bigcut-video-name').textContent = file.name;
            };
        };
        input.click();
    },

    importAudio: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (BigCut.audioUrl) URL.revokeObjectURL(BigCut.audioUrl);
            BigCut.audioFile = file;
            BigCut.audioUrl = URL.createObjectURL(file);
            if (typeof apps !== 'undefined') apps.showToast('BigCut', 'Muzyka zaimportowana!', 'info');
        };
        input.click();
    },

    updateTrimFromSliders: () => {
        const sv = parseFloat(document.getElementById('bigcut-trim-start').value);
        const ev = parseFloat(document.getElementById('bigcut-trim-end').value);
        BigCut.trimStart = Math.min(sv, ev);
        BigCut.trimEnd = Math.max(sv, ev);
        document.getElementById('bigcut-start-time').textContent = BigCut.trimStart.toFixed(1) + 's';
        document.getElementById('bigcut-end-time').textContent = BigCut.trimEnd.toFixed(1) + 's';
        const video = document.getElementById('bigcut-preview');
        if (video && video.duration) {
            video.currentTime = BigCut.trimStart;
        }
    },

    runFFmpegExport: async () => {
        if (!BigCut.videoFile) throw new Error('Brak wideo');
        if (!BigCut.isFFmpegLoaded) await BigCut.loadFFmpeg();
        if (!BigCut.isFFmpegLoaded) throw new Error('Nie udało się załadować silnika.');
        if (BigCut.isExporting) throw new Error('Trwa inny eksport.');
        BigCut.isExporting = true;
        const ffmpeg = BigCut.ffmpeg;
        const { fetchFile } = FFmpeg;
        ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(BigCut.videoFile));
        if (BigCut.audioFile) ffmpeg.FS('writeFile', 'audio.mp3', await fetchFile(BigCut.audioFile));
        let args = ['-i', 'input.mp4'];
        if (BigCut.audioFile) {
            args.push('-i', 'audio.mp3');
            args.push('-map', '0:v:0', '-map', '1:a:0', '-shortest');
        }
        args.push('-ss', BigCut.trimStart.toString(), '-to', BigCut.trimEnd.toString());
        if (BigCut.overlayText.trim()) {
            const txt = BigCut.overlayText.replace(/'/g, "'\\''");
            args.push('-vf', `drawtext=text='${txt}':x=${BigCut.textX}:y=${BigCut.textY}:fontsize=${BigCut.fontSize}:fontcolor=${BigCut.fontColor}`);
        }
        args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-c:a', 'aac', '-b:a', '128k', 'output.mp4');
        await ffmpeg.run(...args);
        const data = ffmpeg.FS('readFile', 'output.mp4');
        BigCut.isExporting = false;
        return new Blob([data.buffer], { type: 'video/mp4' });
    },

    exportToPC: async () => {
        if (!BigCut.videoFile) {
            apps?.showToast('BigCut', 'Najpierw zaimportuj wideo.', 'error');
            return;
        }
        const status = document.getElementById('bigcut-export-status');
        status.textContent = 'Eksportowanie...';
        try {
            const blob = await BigCut.runFFmpegExport();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'bigcut_export.mp4';
            a.click();
            URL.revokeObjectURL(url);
            apps?.showToast('BigCut', 'Pobrano na komputer!', 'success');
        } catch (e) {
            apps?.showToast('BigCut', 'Błąd: ' + e.message, 'error');
        }
        status.textContent = '';
    },

    exportToBigOS: async () => {
        if (!BigCut.videoFile) {
            apps?.showToast('BigCut', 'Brak wideo.', 'error');
            return;
        }
        const status = document.getElementById('bigcut-export-status');
        status.textContent = 'Przetwarzanie i zapisywanie...';
        try {
            const blob = await BigCut.runFFmpegExport();
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                const fileName = 'BigCut_' + new Date().toISOString().slice(0,19).replace(/:/g, '-') + '.mp4';
                if (typeof fileSystem !== 'undefined' && typeof fsManager !== 'undefined') {
                    fileSystem.push({
                        id: 'vid_' + Date.now(),
                        type: 'video',
                        name: fileName,
                        icon: '🎬',
                        content: dataUrl,
                        parentId: 'root',
                        x: Math.floor(Math.random()*100)+20,
                        y: Math.floor(Math.random()*100)+20
                    });
                    fsManager.save();
                    if (typeof desktop !== 'undefined') desktop.render();
                }
                apps?.showToast('BigCut', 'Zapisano w BigOS!', 'success');
                status.textContent = '';
            };
            reader.readAsDataURL(blob);
        } catch (e) {
            apps?.showToast('BigCut', 'Błąd zapisu: ' + e.message, 'error');
            status.textContent = '';
        }
    }
};

// Automatyczna rejestracja w systemie (opcjonalnie)
setTimeout(() => {
    if (typeof apps !== 'undefined') apps.bigcut = BigCut;
}, 1000);