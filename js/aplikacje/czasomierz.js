// ======================================================================
// PLIK: js/aplikacje/czasomierz.js (Zegar, Stoper i Minutnik)
// ======================================================================

const czasomierzApp = {
    activeTab: 'stoper', 
    stoperRunning: false, 
    stoperTime: 0, 
    stoperIntv: null, 
    minutnikRunning: false, 
    minutnikTime: 0, 
    minutnikIntv: null,
    
    switchTab: (tab) => {
        czasomierzApp.activeTab = tab;
        
        // Zastosowanie globalnych klas silnika motywów (g-tab, active)
        const btnStoper = document.getElementById('tab-stoper-btn');
        const btnMinutnik = document.getElementById('tab-minutnik-btn');
        
        if (btnStoper) btnStoper.className = tab === 'stoper' 
            ? 'flex-1 py-2 font-bold g-tab active' 
            : 'flex-1 py-2 font-bold g-tab';
            
        if (btnMinutnik) btnMinutnik.className = tab === 'minutnik' 
            ? 'flex-1 py-2 font-bold g-tab active' 
            : 'flex-1 py-2 font-bold g-tab';
        
        const tabStoper = document.getElementById('tab-stoper');
        const tabMinutnik = document.getElementById('tab-minutnik');
        
        if (tabStoper) tabStoper.className = tab === 'stoper' 
            ? 'absolute inset-0 p-4 flex flex-col items-center translate-x-0 transition-transform' 
            : 'absolute inset-0 p-4 flex flex-col items-center -translate-x-full transition-transform hidden';
            
        if (tabMinutnik) tabMinutnik.className = tab === 'minutnik' 
            ? 'absolute inset-0 p-4 flex flex-col items-center translate-x-0 transition-transform' 
            : 'absolute inset-0 p-4 flex flex-col items-center translate-x-full transition-transform hidden';
    },
    
    stoperToggle: () => {
        czasomierzApp.stoperRunning = !czasomierzApp.stoperRunning; 
        const btn = document.getElementById('stoper-toggle');
        if(czasomierzApp.stoperRunning) { 
            btn.innerText = 'Stop'; 
            btn.classList.remove('g-accent'); 
            btn.classList.add('text-red-500'); 
            czasomierzApp.stoperIntv = setInterval(() => { czasomierzApp.stoperTime += 10; czasomierzApp.stoperUpdateUI(); }, 10); 
        } else { 
            btn.innerText = 'Start'; 
            btn.classList.remove('text-red-500'); 
            btn.classList.add('g-accent'); 
            clearInterval(czasomierzApp.stoperIntv); 
        }
    },
    
    stoperReset: () => { 
        czasomierzApp.stoperRunning = false; 
        clearInterval(czasomierzApp.stoperIntv); 
        czasomierzApp.stoperTime = 0; 
        const btn = document.getElementById('stoper-toggle');
        if (btn) {
            btn.innerText = 'Start'; 
            btn.classList.remove('text-red-500'); 
            btn.classList.add('g-accent'); 
        }
        czasomierzApp.stoperUpdateUI(); 
    },
    
    stoperUpdateUI: () => { 
        let ms = Math.floor((czasomierzApp.stoperTime % 1000) / 10); 
        let s = Math.floor((czasomierzApp.stoperTime / 1000) % 60); 
        let m = Math.floor(czasomierzApp.stoperTime / 60000); 
        const display = document.getElementById('stoper-display');
        if (display) display.innerText = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}.${ms.toString().padStart(2,'0')}`; 
    },
    
    minutnikToggle: () => {
        const btn = document.getElementById('minutnik-toggle'); 
        const mInp = document.getElementById('minutnik-m'); 
        const sInp = document.getElementById('minutnik-s');
        
        if(czasomierzApp.minutnikRunning) { 
            czasomierzApp.minutnikRunning = false; 
            clearInterval(czasomierzApp.minutnikIntv); 
            btn.innerText = 'Start'; 
            btn.classList.remove('text-red-500');
            btn.classList.add('g-accent');
            mInp.disabled = false; sInp.disabled = false; 
        } else {
            let m = parseInt(mInp.value) || 0; let s = parseInt(sInp.value) || 0; czasomierzApp.minutnikTime = (m * 60) + s;
            if(czasomierzApp.minutnikTime <= 0) return;
            czasomierzApp.minutnikRunning = true; 
            btn.innerText = 'Stop'; 
            btn.classList.remove('g-accent');
            btn.classList.add('text-red-500');
            mInp.disabled = true; sInp.disabled = true;
            
            czasomierzApp.minutnikIntv = setInterval(() => {
                czasomierzApp.minutnikTime--; 
                let rm = Math.floor(czasomierzApp.minutnikTime / 60); 
                let rs = czasomierzApp.minutnikTime % 60;
                mInp.value = rm.toString().padStart(2,'0'); sInp.value = rs.toString().padStart(2,'0');
                if(czasomierzApp.minutnikTime <= 0) { 
                    czasomierzApp.minutnikReset(); 
                    if(typeof apps !== 'undefined') apps.showToast('Czasomierz', '⏱️ Czas minął!', 'success'); 
                    czasomierzApp.playBeep(); 
                }
            }, 1000);
        }
    },
    
    minutnikReset: () => { 
        czasomierzApp.minutnikRunning = false; 
        clearInterval(czasomierzApp.minutnikIntv); 
        const btn = document.getElementById('minutnik-toggle');
        if (btn) {
            btn.innerText = 'Start'; 
            btn.classList.remove('text-red-500');
            btn.classList.add('g-accent');
        }
        const mInp = document.getElementById('minutnik-m');
        const sInp = document.getElementById('minutnik-s');
        if (mInp) { mInp.disabled = false; mInp.value = '05'; }
        if (sInp) { sInp.disabled = false; sInp.value = '00'; }
    },
    
    playBeep: () => { 
        try { 
            const ctx = new (window.AudioContext || window.webkitAudioContext)(); 
            const osc = ctx.createOscillator(); 
            const gain = ctx.createGain(); 
            osc.connect(gain); gain.connect(ctx.destination); 
            osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime); 
            gain.gain.setValueAtTime(0.5, ctx.currentTime); 
            osc.start(); gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1); 
            osc.stop(ctx.currentTime + 1); 
        } catch(e) {} 
    }
};