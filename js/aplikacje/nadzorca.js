// ======================================================================
// PLIK: js/aplikacje/nadzorca.js (Nadzorca Systemu - Menedżer Zadań)
// ======================================================================

const nadzorcaApp = {
    intv: null,
    
    init: () => { 
        if(nadzorcaApp.intv) clearInterval(nadzorcaApp.intv); 
        nadzorcaApp.update(); 
        nadzorcaApp.intv = setInterval(nadzorcaApp.update, 2000); 
    },
    
    update: () => {
        let baseCpu = 2 + Math.random() * 5; 
        let totalApps = typeof openAppsList !== 'undefined' ? openAppsList.size : 0;
        let cpu = Math.min(100, Math.floor(baseCpu + (totalApps * 15) + (Math.random() * 10))); 
        
        // Odczytywanie prawdziwego RAMu używanego przez JavaScript w przeglądarce (jeśli API jest dostępne)
        let ramText = "0 MB";
        if(performance && performance.memory) {
            ramText = (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1) + ' MB';
        } else {
            let baseRam = 120 + Math.random() * 20;
            ramText = Math.floor(baseRam + (totalApps * 80) + (Math.random() * 50)) + ' MB (Sim)';
        }

        // Odczytywanie prawdziwego zużycia Dysku (Local Storage) przez BigOS
        let totalDiskBytes = 0;
        for(let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i);
            if(key.startsWith('bigos_')) {
                totalDiskBytes += (localStorage.getItem(key).length || 0) * 2; // UTF-16 zajmuje ok 2 bajty
            }
        }
        let diskText = (totalDiskBytes / 1024).toFixed(1) + ' KB';

        const elCpu = document.getElementById('nadzorca-cpu');
        const elRam = document.getElementById('nadzorca-ram');
        const elDisk = document.getElementById('nadzorca-disk');
        
        if (elCpu) elCpu.innerText = `${cpu}%`; 
        if (elRam) elRam.innerText = ramText;
        if (elDisk) elDisk.innerText = diskText;
        
        const list = document.getElementById('nadzorca-list'); 
        if (!list) return;
        
        list.innerHTML = '';
        if(totalApps === 0) { 
            list.innerHTML = `<div class="p-6 text-center g-text-muted text-[10px] font-bold uppercase tracking-widest">Brak aktywnych procesów.</div>`; 
        } else {
            openAppsList.forEach(appId => {
                const appInfo = typeof defaultApps !== 'undefined' ? defaultApps.find(a => a.appId === appId) : null; 
                const name = appInfo ? `${appInfo.icon} ${appInfo.name}` : `Nieznany (${appId})`;
                
                // Dynamiczne wstrzykiwanie wierszy z klasami systemu motywów
                list.innerHTML += `
                    <div class="grid grid-cols-3 px-3 py-2 border-b g-border hover:bg-white/10 transition items-center g-text">
                        <div class="col-span-2 font-semibold text-sm truncate">${typeof desktop !== 'undefined' ? desktop.escapeHTML(name) : name}</div>
                        <div class="text-right">
                            <button onclick="nadzorcaApp.kill('${appId}')" class="g-btn border-red-500/50 text-red-400 bg-red-600/10 hover:bg-red-500 hover:text-white text-[10px] px-3 py-1.5 rounded shadow-sm transition font-bold uppercase tracking-wider">Zakończ</button>
                        </div>
                    </div>`;
            });
        }
    },
    
    kill: (appId) => { 
        if(typeof winManager !== 'undefined') winManager.close(appId); 
        nadzorcaApp.update(); 
        if(typeof apps !== 'undefined') apps.showToast('Nadzorca', 'Zadanie zostało zakończone.', 'info'); 
    },
    
    stop: () => { 
        if(nadzorcaApp.intv) clearInterval(nadzorcaApp.intv); 
    }
};