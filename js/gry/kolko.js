// ======================================================================
// PLIK: js/gry/kolko.js
// ======================================================================

games.kolko = {
    ticB: ['','','','','','','','',''], ticP: '❌', ticA: true,
    init: () => { 
        stopAllSounds();
        games.kolko.ticB=['','','','','','','','','']; games.kolko.ticP='❌'; games.kolko.ticA=true; 
        document.getElementById('tic-status').innerText='Tura: ❌'; 
        const c=document.getElementById('tic-board'); c.innerHTML=''; 
        for(let i=0;i<9;i++){ 
            const cell=document.createElement('div'); 
            cell.className='w-16 h-16 bg-white dark:bg-[#1a1a1a] flex items-center justify-center text-4xl shadow-sm cursor-pointer rounded-xl transition hover:bg-gray-100 dark:hover:bg-[#333] border border-gray-300 dark:border-gray-600'; 
            cell.onclick=()=>games.kolko.play(i, cell); 
            c.appendChild(cell); 
        } 
    },
    play: (i, cell) => { 
        if(!games.kolko.ticA || games.kolko.ticB[i]!=='') return; 
        games.kolko.ticB[i]=games.kolko.ticP; 
        cell.innerText=games.kolko.ticP; 
        playSnd('drop');
        
        if(games.kolko.chk()){ 
            document.getElementById('tic-status').innerText=`🏆 Wygrywa: ${games.kolko.ticP}!`; 
            games.kolko.ticA=false; playSnd('win'); if(typeof apps !== 'undefined') apps.showToast('Gry', `Gracz ${games.kolko.ticP} wygrywa!`, 'success');
        } else if(!games.kolko.ticB.includes('')){ 
            document.getElementById('tic-status').innerText='🤝 Remis!'; games.kolko.ticA=false; 
        } else { 
            games.kolko.ticP = games.kolko.ticP==='❌' ? '⭕' : '❌'; 
            document.getElementById('tic-status').innerText=`Tura: ${games.kolko.ticP}`; 
        } 
    },
    chk: () => [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].some(c=>games.kolko.ticB[c[0]]&&games.kolko.ticB[c[0]]===games.kolko.ticB[c[1]]&&games.kolko.ticB[c[1]]===games.kolko.ticB[c[2]]),
    stop: () => {}
};

// Automatyczne podpięcie pod guzik startu w HTML
if(typeof apps !== 'undefined') apps.ticInit = games.kolko.init;