// ======================================================================
// PLIK: js/gry/kolko.js (Duże Kółko i Krzyżyk w wysokiej rozdzielczości)
// ======================================================================

games.kolko = {
    ticB: ['','','','','','','','',''], ticP: '❌', ticA: true,
    
    init: () => { 
        if(typeof stopAllSounds !== 'undefined') stopAllSounds();
        games.kolko.ticB=['','','','','','','','','']; 
        games.kolko.ticP='❌'; 
        games.kolko.ticA=true; 

        // --- NAPRAWA I POWIĘKSZENIE OKNA ---
        const win = document.getElementById('app-kolko');
        if (win && !win.dataset.resized) {
            win.style.width = '700px'; 
            win.classList.remove('w-[300px]');
            
            // Wymuszamy ponowne wyśrodkowanie powiększonego okna
            setTimeout(() => {
                if (!win.classList.contains('maximized')) {
                    const w = win.offsetWidth || 700;
                    const h = win.offsetHeight || 750;
                    win.style.left = Math.max(0, (window.innerWidth - w) / 2) + 'px';
                    win.style.top = Math.max(0, (window.innerHeight - h - 48) / 2) + 'px';
                }
            }, 10);
            
            win.dataset.resized = "true";
        }

        // --- AKTUALIZACJA INTERFEJSU UI ---
        const statusEl = document.getElementById('tic-status');
        if (statusEl) {
            statusEl.innerText = 'Tura: ❌';
            statusEl.className = 'font-bold mb-6 g-text text-2xl sm:text-4xl drop-shadow-md tracking-wider'; 
        }

        const c = document.getElementById('tic-board'); 
        if (c) {
            c.innerHTML = ''; 
            // Zwiększamy odstępy w siatce (gap-4) i paddingi (p-6)
            c.className = 'grid grid-cols-3 gap-3 sm:gap-5 g-bg p-4 sm:p-6 rounded-3xl shadow-inner touch-none border-2 g-border'; 
            
            for(let i=0; i<9; i++){ 
                const cell = document.createElement('div'); 
                // Nowe, ogromne kafelki dla wysokiej rozdzielczości
                cell.className = 'w-[100px] h-[100px] sm:w-[160px] sm:h-[160px] bg-white dark:bg-[#1a1a1a] flex items-center justify-center text-6xl sm:text-8xl shadow-lg cursor-pointer rounded-2xl transition-all hover:bg-gray-100 dark:hover:bg-[#333] border-2 border-gray-300 dark:border-gray-600 hover:scale-105 active:scale-95 hover:shadow-xl'; 
                cell.onclick = () => games.kolko.play(i, cell); 
                c.appendChild(cell); 
            } 
            
            // Powiększenie przycisku restartu znajdującego się zaraz po siatce
            const btn = c.nextElementSibling;
            if(btn && btn.tagName === 'BUTTON') {
                btn.className = 'mt-8 g-btn bg-black/20 hover:bg-white/10 text-white px-6 py-4 rounded-xl font-bold w-full max-w-[530px] shadow-lg transition border-2 g-border text-lg sm:text-xl tracking-wider uppercase';
            }
        }
    },
    
    play: (i, cell) => { 
        if(!games.kolko.ticA || games.kolko.ticB[i] !== '') return; 
        
        games.kolko.ticB[i] = games.kolko.ticP; 
        cell.innerText = games.kolko.ticP; 
        
        // Dodajemy krótką animację pop-up dla postawionego znaku
        cell.style.transform = 'scale(1.15)';
        setTimeout(() => cell.style.transform = '', 150);

        if(typeof playSnd !== 'undefined') playSnd('drop');
        
        if(games.kolko.chk()) { 
            document.getElementById('tic-status').innerText = `🏆 Wygrywa: ${games.kolko.ticP}!`; 
            games.kolko.ticA = false; 
            if(typeof playSnd !== 'undefined') playSnd('win'); 
            if(typeof apps !== 'undefined') apps.showToast('Gry', `Gracz ${games.kolko.ticP} wygrywa!`, 'success');
        } else if(!games.kolko.ticB.includes('')) { 
            document.getElementById('tic-status').innerText = '🤝 Remis!'; 
            games.kolko.ticA = false; 
        } else { 
            games.kolko.ticP = games.kolko.ticP === '❌' ? '⭕' : '❌'; 
            document.getElementById('tic-status').innerText = `Tura: ${games.kolko.ticP}`; 
        } 
    },
    
    chk: () => [
        [0,1,2],[3,4,5],[6,7,8], // Poziomo
        [0,3,6],[1,4,7],[2,5,8], // Pionowo
        [0,4,8],[2,4,6]          // Na ukos
    ].some(c => games.kolko.ticB[c[0]] && games.kolko.ticB[c[0]] === games.kolko.ticB[c[1]] && games.kolko.ticB[c[1]] === games.kolko.ticB[c[2]]),
    
    stop: () => {}
};

// Automatyczne podpięcie pod guzik startu w HTML
if(typeof apps !== 'undefined') apps.ticInit = games.kolko.init;