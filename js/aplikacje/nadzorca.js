const nadzorcaApp = {
            intv: null,
            init: () => { if(nadzorcaApp.intv) clearInterval(nadzorcaApp.intv); nadzorcaApp.update(); nadzorcaApp.intv = setInterval(nadzorcaApp.update, 2000); },
            update: () => {
                let baseCpu = 2 + Math.random() * 5; let totalApps = openAppsList.size;
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

                document.getElementById('nadzorca-cpu').innerText = `${cpu}%`; 
                document.getElementById('nadzorca-ram').innerText = ramText;
                document.getElementById('nadzorca-disk').innerText = diskText;
                
                const list = document.getElementById('nadzorca-list'); list.innerHTML = '';
                if(totalApps === 0) { list.innerHTML = `<div class="p-3 text-center text-gray-500">Brak aktywnych procesów.</div>`; } else {
                    openAppsList.forEach(appId => {
                        const appInfo = defaultApps.find(a => a.appId === appId); const name = appInfo ? `${appInfo.icon} ${appInfo.name}` : `Nieznany (${appId})`;
                        list.innerHTML += `<div class="grid grid-cols-3 p-2 border-b border-gray-200 dark:border-[#333] hover:bg-gray-100 dark:hover:bg-[#222] items-center"><div class="col-span-2 font-semibold text-sm truncate">${name}</div><div class="text-right"><button onclick="nadzorcaApp.kill('${appId}')" class="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded shadow-sm">Zakończ</button></div></div>`;
                    });
                }
            },
            kill: (appId) => { winManager.close(appId); nadzorcaApp.update(); apps.showToast('Nadzorca', 'Zadanie zostało zakończone.', 'info'); },
            stop: () => { if(nadzorcaApp.intv) clearInterval(nadzorcaApp.intv); }
        };