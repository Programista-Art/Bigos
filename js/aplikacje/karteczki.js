// ======================================================================
// PLIK: js/aplikacje/karteczki.js (Karteczki na Pulpit - Zintegrowane z theme.js)
// ======================================================================

const karteczkiApp = {
    createStickyNote: (id='n_'+Date.now(), text='', x=100, y=100) => { 
        const c = document.getElementById('sticky-notes-container'); 
        if(!c) return;

        const n = document.createElement('div'); 
        n.id = id; 
        // Zastąpiono sztywne żółte tła eleganckimi klasami z theme.js
        n.className = 'sticky-note pointer-events-auto rounded-xl p-3 shadow-2xl themed-app g-panel border g-border flex flex-col gap-2 min-w-[200px] min-h-[150px] transition-colors'; 
        n.style.left = x + 'px'; 
        n.style.top = y + 'px'; 
        
        n.innerHTML = `
            <div class="flex justify-between items-center mb-1 cursor-move border-b g-border pb-2 shrink-0 bg-black/10 -mx-3 -mt-3 px-3 pt-2 rounded-t-xl" 
                 onmousedown="if(typeof desktop !== 'undefined' && typeof winManager !== 'undefined') { desktop.activeDrag={el:this.parentElement,type:'sticky',id:'${id}',oX:event.clientX-this.parentElement.getBoundingClientRect().left,oY:event.clientY-this.parentElement.getBoundingClientRect().top}; winManager.bringToFront(this.parentElement); }" 
                 ontouchstart="if(typeof desktop !== 'undefined' && typeof winManager !== 'undefined') { const p=getEventPos(event); desktop.activeDrag={el:this.parentElement,type:'sticky',id:'${id}',oX:p.x-this.parentElement.getBoundingClientRect().left,oY:p.y-this.parentElement.getBoundingClientRect().top}; winManager.bringToFront(this.parentElement); }">
                <span class="text-xs font-bold g-accent drop-shadow-md uppercase tracking-widest">📌 Notatka</span>
                <button onclick="this.parentElement.parentElement.remove(); if(typeof karteczkiApp !== 'undefined') karteczkiApp.saveStickyNotes()" class="text-red-500 hover:text-red-400 font-bold transition text-lg leading-none">✖</button>
            </div>
            <div contenteditable="true" class="flex-grow outline-none text-sm g-text custom-scrollbar overflow-y-auto" oninput="if(typeof karteczkiApp !== 'undefined') karteczkiApp.saveStickyNotes()">${text}</div>
        `; 
        
        c.appendChild(n); 
        karteczkiApp.saveStickyNotes(); 
    },

    saveStickyNotes: () => { 
        const ns = []; 
        document.querySelectorAll('.sticky-note').forEach(el => { 
            const editor = el.querySelector('div[contenteditable]');
            ns.push({
                id: el.id, 
                x: parseInt(el.style.left) || 100, 
                y: parseInt(el.style.top) || 100, 
                t: editor ? editor.innerHTML : ''
            });
        }); 
        localStorage.setItem('bigos_stickies', JSON.stringify(ns)); 
    },

    loadStickyNotes: () => { 
        const s = localStorage.getItem('bigos_stickies'); 
        if(s) {
            try {
                JSON.parse(s).forEach(n => karteczkiApp.createStickyNote(n.id, n.t, n.x, n.y)); 
            } catch(e) {}
        }
    }
};

// Podpięcie pod globalny obiekt apps (dla bezpieczeństwa i kompatybilności wstecznej)
setTimeout(() => {
    if(typeof apps !== 'undefined') {
        apps.createStickyNote = karteczkiApp.createStickyNote;
        apps.saveStickyNotes = karteczkiApp.saveStickyNotes;
        apps.loadStickyNotes = karteczkiApp.loadStickyNotes;
    }
}, 100);