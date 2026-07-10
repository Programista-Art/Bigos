// ======================================================================
// PLIK: js/aplikacje/kalendarz.js (Zegar i Kalendarz Systemowy)
// ======================================================================

let calOffset = 0; 

const kalendarzApp = {
    toggleCalendar: (e) => { 
        if(e) e.stopPropagation(); 
        calOffset = 0; 
        kalendarzApp.generateCalendar(); 
        const widget = document.getElementById('calendar-widget');
        if(widget) widget.classList.toggle('hidden-cal'); 
        const sm = document.getElementById('start-menu');
        if(sm) sm.classList.add('hidden'); 
    },

    changeCalendarMonth: (dir) => { 
        calOffset += dir; 
        kalendarzApp.generateCalendar(); 
    },

    generateCalendar: () => {
        const c = document.getElementById('cal-days'); 
        const t = document.getElementById('cal-month-year'); 
        if(!c || !t) return;

        const targetDate = new Date(); 
        targetDate.setMonth(targetDate.getMonth() + calOffset); 
        
        const now = new Date(); 
        const mPl = ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"]; 
        
        t.innerText = `${mPl[targetDate.getMonth()]} ${targetDate.getFullYear()}`; 
        
        const first = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).getDay(); 
        const days = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate(); 
        
        let start = first === 0 ? 6 : first - 1; 
        c.innerHTML = ''; 
        
        for(let i=0; i<start; i++) {
            c.innerHTML += `<div></div>`;
        }
        
        for(let i=1; i<=days; i++) { 
            const isToday = (i === now.getDate() && targetDate.getMonth() === now.getMonth() && targetDate.getFullYear() === now.getFullYear()); 
            
            if (isToday) {
                // Dzisiejszy dzień - używa akcentu z aktualnego motywu (var(--primary))
                c.innerHTML += `<div class="w-7 h-7 flex items-center justify-center mx-auto rounded-full font-bold shadow-md cursor-pointer hover:opacity-80 transition" style="background: var(--primary); color: #000;">${i}</div>`;
            } else {
                // Zwykły dzień - używa g-text i delikatnego podświetlenia
                c.innerHTML += `<div class="w-7 h-7 flex items-center justify-center mx-auto rounded-full cursor-pointer transition g-text hover:bg-white/10">${i}</div>`; 
            }
        }
    }
};

setTimeout(() => {
    if(typeof apps !== 'undefined') {
        apps.toggleCalendar = kalendarzApp.toggleCalendar;
        apps.changeCalendarMonth = kalendarzApp.changeCalendarMonth;
        apps.generateCalendar = kalendarzApp.generateCalendar;
    }
}, 100);