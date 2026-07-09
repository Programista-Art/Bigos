// ======================================================================
// PLIK: js/aplikacje/karteczki.js (Żółte karteczki na Pulpit)
// ======================================================================

const karteczkiApp = {
    createStickyNote: (id='n_'+Date.now(), text='', x=100, y=100) => { 
        const c = document.getElementById('sticky-notes-container'); 
        if(!c) return;

        const n = document.createElement('div'); 
        n.id = id; 
        n.className = 'sticky-note pointer-events-auto rounded p-2 shadow-lg'; 
        n.style.left = x + 'px'; 
        n.style.top = y + 'px'; 
        
        n.innerHTML = `
            <div class="flex justify-between items-center mb-1 cursor-move" 
                 onmousedown="if(typeof desktop !== 'undefined' && typeof winManager !== 'undefined') { desktop.activeDrag={el:this.parentElement,type:'sticky',id:'${id}',oX:event.clientX-this.parentElement.getBoundingClientRect().left,oY:event.clientY-this.parentElement.getBoundingClientRect().top}; winManager.bringToFront(this.parentElement); }" 
                 ontouchstart="if(typeof desktop !== 'undefined' && typeof winManager !== 'undefined') { const p=getEventPos(event); desktop.activeDrag={el:this.parentElement,type:'sticky',id:'${id}',oX:p.x-this.parentElement.getBoundingClientRect().left,oY:p.y-this.parentElement.getBoundingClientRect().top}; winManager.bringToFront(this.parentElement); }">
                <span class="text-xs font-bold text-yellow-800">📌</span>
                <button onclick="this.parentElement.parentElement.remove(); if(typeof karteczkiApp !== 'undefined') karteczkiApp.saveStickyNotes()" class="text-red-700 font-bold transition hover:text-red-900">✖</button>
            </div>
            <div contenteditable="true" class="flex-grow outline-none text-sm text-yellow-900" oninput="if(typeof karteczkiApp !== 'undefined') karteczkiApp.saveStickyNotes()">${text}</div>
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

setTimeout(() => {
    if(typeof apps !== 'undefined') {
        apps.createStickyNote = karteczkiApp.createStickyNote;
        apps.saveStickyNotes = karteczkiApp.saveStickyNotes;
        apps.loadStickyNotes = karteczkiApp.loadStickyNotes;
    }
}, 100);