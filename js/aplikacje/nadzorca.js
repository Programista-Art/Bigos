// ======================================================================
// PLIK: js/aplikacje/nadzorca.js (Nadzorca Systemu - Menedżer Zadań)
// Diagnostics: real browser workload measurements with accurate labels,
// StorageManager estimate for website storage (not physical disk),
// activity list from the central app registry.
// ======================================================================

const nadzorcaApp = {
    intv: null,

    init: () => {
        if (nadzorcaApp.intv) clearInterval(nadzorcaApp.intv);
        nadzorcaApp.update();
        nadzorcaApp.intv = setInterval(nadzorcaApp.update, 2000);
    },

    /** Feature-detected measurements. Never invents values. */
    async measure() {
        const m = {
            cpu: null, cpuLabel: 'CPU (brak pomiaru)',
            ram: null, ramLabel: 'RAM (brak pomiaru)',
            disk: null, diskLabel: 'Dysk witryny (brak pomiaru)',
            storageNote: 'Poniższe wartości opisują magazyn przeglądarki (website storage), nie cały dysk fizyczny.'
        };

        // CPU: measure event loop pressure / frame budget.
        if (typeof performance !== 'undefined' && performance.now) {
            if (nadzorcaApp._lastTick) {
                const delta = performance.now() - nadzorcaApp._lastTick;
                const lag = Math.max(0, delta - 2000);
                const loadEst = Math.min(100, Math.round((lag / 500) * 100));
                m.cpu = loadEst;
                m.cpuLabel = `Obciążenie pętli zdarzeń: ${loadEst}%`;
            } else {
                m.cpu = 0;
                m.cpuLabel = 'Obciążenie pętli zdarzeń: 0%';
            }
            nadzorcaApp._lastTick = performance.now();
        }

        // RAM: Chromium exposes performance.memory; others use FS data memory footprint.
        if (typeof performance !== 'undefined' && performance.memory && performance.memory.usedJSHeapSize) {
            const used = performance.memory.usedJSHeapSize / (1024 * 1024);
            const total = performance.memory.jsHeapSizeLimit / (1024 * 1024);
            m.ram = `${used.toFixed(1)} / ${total.toFixed(0)} MB`;
            m.ramLabel = `JS Heap: ${(used / total * 100).toFixed(1)}%`;
        } else {
            let fsBytes = 0;
            if (typeof fileSystem !== 'undefined' && Array.isArray(fileSystem)) {
                fsBytes = fileSystem.reduce((acc, f) => acc + (f && f.content ? String(f.content).length * 2 : 100), 0);
            }
            const mb = (fsBytes / (1024 * 1024)).toFixed(2);
            m.ram = `~${mb} MB`;
            m.ramLabel = 'Dane FS w RAM (szacunek)';
        }

        // Storage: StorageManager.estimate — website origin quota/usage.
        try {
            if (navigator.storage && navigator.storage.estimate) {
                const est = await navigator.storage.estimate();
                const usedMB = (est.usage || 0) / (1024 * 1024);
                const quotaMB = (est.quota || 0) / (1024 * 1024);
                m.disk = `${usedMB.toFixed(2)} / ${quotaMB.toFixed(0)} MB`;
                m.diskLabel = 'Magazyn witryny (StorageManager.estimate)';
            } else {
                // Fallback: localStorage bytes only, clearly labeled.
                let totalDiskBytes = 0;
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('bigos_')) {
                        totalDiskBytes += (localStorage.getItem(key).length || 0) * 2;
                    }
                }
                m.disk = (totalDiskBytes / 1024).toFixed(1) + ' KB';
                m.diskLabel = 'localStorage BigOS (szacunek, brak StorageManager)';
            }
        } catch (e) {
            m.disk = 'błąd';
            m.diskLabel = 'Błąd odczytu StorageManager';
        }

        return m;
    },

    update: async () => {
        const m = await nadzorcaApp.measure();

        const elCpu = document.getElementById('nadzorca-cpu');
        const elRam = document.getElementById('nadzorca-ram');
        const elDisk = document.getElementById('nadzorca-disk');
        const elCpuLabel = document.getElementById('nadzorca-cpu-label');
        const elRamLabel = document.getElementById('nadzorca-ram-label');
        const elDiskLabel = document.getElementById('nadzorca-disk-label');

        if (elCpu) elCpu.innerText = m.cpu == null ? 'n/d' : `${m.cpu}%`;
        if (elRam) elRam.innerText = m.ram;
        if (elDisk) elDisk.innerText = m.disk;
        if (elCpuLabel) elCpuLabel.innerText = m.cpuLabel;
        if (elRamLabel) elRamLabel.innerText = m.ramLabel;
        if (elDiskLabel) elDiskLabel.innerText = m.diskLabel;

        const list = document.getElementById('nadzorca-list');
        if (!list) return;

        // Prefer central registry activity; fall back to openAppsList.
        let rows = [];
        if (typeof bigosAppRegistry !== 'undefined' && bigosAppRegistry.activity) {
            rows = bigosAppRegistry.activity();
        }
        if (rows.length === 0 && typeof openAppsList !== 'undefined') {
            openAppsList.forEach(appId => {
                const appInfo = typeof defaultApps !== 'undefined' ? defaultApps.find(a => a.appId === appId) : null;
                rows.push({
                    appId,
                    instanceId: appId,
                    name: appInfo ? appInfo.name : appId,
                    icon: appInfo ? appInfo.icon : '📦',
                    state: 'open',
                    timers: 0, intervals: 0, rafs: 0, listeners: 0, workers: 0, audio: 0,
                    backgroundable: false
                });
            });
        }

        list.innerHTML = '';
        if (rows.length === 0) {
            list.innerHTML = `<div class="p-6 text-center g-text-muted text-[10px] font-bold uppercase tracking-widest">Brak aktywnych procesów.</div>`;
        } else {
            rows.forEach(row => {
                const name = `${row.icon} ${row.name}`;
                const safeId = String(row.appId).replace(/[^A-Za-z0-9_\-]/g, '');
                list.innerHTML += `
                    <div class="grid grid-cols-3 px-3 py-2 border-b g-border hover:bg-white/10 transition items-center g-text">
                        <div class="col-span-2 font-semibold text-sm truncate">
                            ${typeof desktop !== 'undefined' ? desktop.escapeHTML(name) : name}
                            <div class="text-[9px] g-text-muted font-mono">${row.state} · t:${row.timers} i:${row.intervals} raf:${row.rafs} l:${row.listeners}</div>
                        </div>
                        <div class="text-right">
                            <button onclick="nadzorcaApp.kill('${safeId}')" class="g-btn border-red-500/50 text-red-400 bg-red-600/10 hover:bg-red-500 hover:text-white text-[10px] px-3 py-1.5 rounded shadow-sm transition font-bold uppercase tracking-wider">Zakończ</button>
                        </div>
                    </div>`;
            });
        }

        // Diagnostic log sample (no secrets).
        if (typeof bigosDiag !== 'undefined') {
            // keep quiet in steady state — only log on demand via button
        }
    },

    kill: (appId) => {
        (async () => {
            if (typeof bigosAppRegistry !== 'undefined' && bigosAppRegistry.close) {
                await bigosAppRegistry.close(appId);
            }
            if (typeof bigosSandbox !== 'undefined' && bigosSandbox.unmount) {
                try { bigosSandbox.unmount(appId); } catch (_) { /* not sandboxed */ }
            }
            if (typeof winManager !== 'undefined') winManager.close(appId);
            nadzorcaApp.update();
            if (typeof apps !== 'undefined') apps.showToast('Nadzorca', 'Zadanie zostało zakończone.', 'info');
        })();
    },

    showDiagLog: () => {
        if (typeof bigosDiag === 'undefined') return;
        const entries = bigosDiag.getEntries();
        const text = entries.map(e => `[${new Date(e.ts).toLocaleTimeString()}] ${e.level}/${e.category}: ${e.message}`).join('\n');
        if (typeof ui !== 'undefined') {
            // reuse prompt as viewer is not ideal; show a simple modal
        }
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/70 z-[10000] flex items-center justify-center p-4';
        modal.innerHTML = `<div class="g-panel p-4 rounded-xl max-w-lg w-full border g-border max-h-[80vh] flex flex-col">
            <h3 class="font-bold mb-2 g-text">Log diagnostyczny</h3>
            <pre class="flex-grow overflow-auto text-[10px] font-mono g-text-muted bg-black/40 p-2 rounded">${(text || '(pusty)').replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</pre>
            <div class="flex gap-2 mt-3 justify-end">
                <button class="px-3 py-1.5 g-btn rounded" onclick="this.closest('.fixed').remove()">Zamknij</button>
                <button class="px-3 py-1.5 g-btn rounded" onclick="const b=bigosDiag.exportJSON(); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([b],{type:'application/json'})); a.download='bigos-diag.json'; a.click();">Eksportuj</button>
            </div>
        </div>`;
        document.body.appendChild(modal);
    },

    stop: () => {
        if (nadzorcaApp.intv) clearInterval(nadzorcaApp.intv);
        nadzorcaApp.intv = null;
    }
};
