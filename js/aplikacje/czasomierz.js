const czasomierzApp = {
            activeTab: 'stoper', stoperRunning: false, stoperTime: 0, stoperIntv: null, minutnikRunning: false, minutnikTime: 0, minutnikIntv: null,
            switchTab: (tab) => {
                czasomierzApp.activeTab = tab;
                document.getElementById('tab-stoper-btn').className = tab === 'stoper' ? 'flex-1 py-2 font-bold bg-white dark:bg-[#1a1a1a] border-b-2 border-rose-500' : 'flex-1 py-2 font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white border-b-2 border-transparent';
                document.getElementById('tab-minutnik-btn').className = tab === 'minutnik' ? 'flex-1 py-2 font-bold bg-white dark:bg-[#1a1a1a] border-b-2 border-rose-500' : 'flex-1 py-2 font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white border-b-2 border-transparent';
                document.getElementById('tab-stoper').className = tab === 'stoper' ? 'absolute inset-0 p-4 flex flex-col items-center translate-x-0 transition-transform' : 'absolute inset-0 p-4 flex flex-col items-center -translate-x-full transition-transform hidden';
                document.getElementById('tab-minutnik').className = tab === 'minutnik' ? 'absolute inset-0 p-4 flex flex-col items-center translate-x-0 transition-transform' : 'absolute inset-0 p-4 flex flex-col items-center translate-x-full transition-transform hidden';
            },
            stoperToggle: () => {
                czasomierzApp.stoperRunning = !czasomierzApp.stoperRunning; const btn = document.getElementById('stoper-toggle');
                if(czasomierzApp.stoperRunning) { btn.innerText = 'Stop'; btn.classList.replace('text-rose-600', 'text-red-600'); czasomierzApp.stoperIntv = setInterval(() => { czasomierzApp.stoperTime += 10; czasomierzApp.stoperUpdateUI(); }, 10); } 
                else { btn.innerText = 'Start'; btn.classList.replace('text-red-600', 'text-rose-600'); clearInterval(czasomierzApp.stoperIntv); }
            },
            stoperReset: () => { czasomierzApp.stoperRunning = false; clearInterval(czasomierzApp.stoperIntv); czasomierzApp.stoperTime = 0; document.getElementById('stoper-toggle').innerText = 'Start'; czasomierzApp.stoperUpdateUI(); },
            stoperUpdateUI: () => { let ms = Math.floor((czasomierzApp.stoperTime % 1000) / 10); let s = Math.floor((czasomierzApp.stoperTime / 1000) % 60); let m = Math.floor(czasomierzApp.stoperTime / 60000); document.getElementById('stoper-display').innerText = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}.${ms.toString().padStart(2,'0')}`; },
            minutnikToggle: () => {
                const btn = document.getElementById('minutnik-toggle'); const mInp = document.getElementById('minutnik-m'); const sInp = document.getElementById('minutnik-s');
                if(czasomierzApp.minutnikRunning) { czasomierzApp.minutnikRunning = false; clearInterval(czasomierzApp.minutnikIntv); btn.innerText = 'Start'; mInp.disabled = false; sInp.disabled = false; } 
                else {
                    let m = parseInt(mInp.value) || 0; let s = parseInt(sInp.value) || 0; czasomierzApp.minutnikTime = (m * 60) + s;
                    if(czasomierzApp.minutnikTime <= 0) return;
                    czasomierzApp.minutnikRunning = true; btn.innerText = 'Stop'; mInp.disabled = true; sInp.disabled = true;
                    czasomierzApp.minutnikIntv = setInterval(() => {
                        czasomierzApp.minutnikTime--; let rm = Math.floor(czasomierzApp.minutnikTime / 60); let rs = czasomierzApp.minutnikTime % 60;
                        mInp.value = rm.toString().padStart(2,'0'); sInp.value = rs.toString().padStart(2,'0');
                        if(czasomierzApp.minutnikTime <= 0) { czasomierzApp.minutnikReset(); apps.showToast('Czasomierz', '⏱️ Czas minął!', 'success'); czasomierzApp.playBeep(); }
                    }, 1000);
                }
            },
            minutnikReset: () => { czasomierzApp.minutnikRunning = false; clearInterval(czasomierzApp.minutnikIntv); document.getElementById('minutnik-toggle').innerText = 'Start'; document.getElementById('minutnik-m').disabled = false; document.getElementById('minutnik-s').disabled = false; document.getElementById('minutnik-m').value = '05'; document.getElementById('minutnik-s').value = '00'; },
            playBeep: () => { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime); gain.gain.setValueAtTime(0.5, ctx.currentTime); osc.start(); gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1); osc.stop(ctx.currentTime + 1); } catch(e) {} }
        };
