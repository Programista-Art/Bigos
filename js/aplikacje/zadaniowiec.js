// ======================================================================
// PLIK: js/aplikacje/zadaniowiec.js (Aplikacja Zadaniowiec - Kanban)
// ======================================================================

const zadaniowiecApp = {
    tasks: [],
    draggedTaskId: null,
    
    init: () => {
        const saved = localStorage.getItem('bigos_zadaniowiec');
        if(saved) zadaniowiecApp.tasks = JSON.parse(saved);
        zadaniowiecApp.render();
    },
    
    save: () => {
        localStorage.setItem('bigos_zadaniowiec', JSON.stringify(zadaniowiecApp.tasks));
    },
    
    render: () => {
        const cols = { 'todo': '', 'progress': '', 'done': '' };
        
        zadaniowiecApp.tasks.forEach(t => {
            cols[t.status] += `
                <div id="${t.id}" class="g-panel p-3 mb-2 rounded-lg text-sm cursor-grab border g-border relative group transition-transform hover:scale-[1.02] bg-black/20"
                     draggable="true" ondragstart="zadaniowiecApp.dragStart(event)" ondragend="zadaniowiecApp.dragEnd(event)">
                    <div class="pr-6 g-text font-medium break-words">${typeof desktop !== 'undefined' ? desktop.escapeHTML(t.text) : t.text}</div>
                    <button onclick="zadaniowiecApp.deleteTask('${t.id}')" class="absolute top-1 right-2 text-red-500 font-bold opacity-0 group-hover:opacity-100 transition hover:text-red-400">✖</button>
                </div>`;
        });
        
        ['todo', 'progress', 'done'].forEach(status => {
            const el = document.getElementById(`kanban-col-${status}`);
            if(el) {
                el.innerHTML = cols[status];
                // Wizualny efekt braku zadań
                if(cols[status] === '') {
                    el.innerHTML = '<div class="text-center g-text-muted text-xs mt-4">Brak zadań</div>';
                }
            }
        });
    },
    
    addTask: () => {
        if(typeof ui !== 'undefined') {
            ui.showPrompt("Treść nowego zadania:", "Nowe zadanie", "Dodaj", (val) => {
                if(val && val.trim()) {
                    zadaniowiecApp.tasks.push({ id: 'task_'+Date.now(), text: val.trim(), status: 'todo' });
                    zadaniowiecApp.save();
                    zadaniowiecApp.render();
                }
            });
        }
    },
    
    deleteTask: (id) => {
        zadaniowiecApp.tasks = zadaniowiecApp.tasks.filter(t => t.id !== id);
        zadaniowiecApp.save();
        zadaniowiecApp.render();
    },
    
    dragStart: (e) => {
        zadaniowiecApp.draggedTaskId = e.target.id;
        e.target.classList.add('opacity-40');
        // Zapisanie pustych danych jest wymagane do działania drag & drop w Firefox
        e.dataTransfer.setData('text/plain', e.target.id); 
    },
    
    dragEnd: (e) => {
        e.target.classList.remove('opacity-40');
        zadaniowiecApp.draggedTaskId = null;
        document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('border-blue-500', 'bg-black/20'));
    },
    
    allowDrop: (e) => { 
        e.preventDefault(); 
        // Efekt podświetlenia kolumny, nad którą aktualnie przebywamy
        if(e.currentTarget.classList.contains('kanban-col')) {
            e.currentTarget.classList.add('border-blue-500', 'bg-black/20');
        }
    },
    
    leaveDrop: (e) => {
        if(e.currentTarget.classList.contains('kanban-col')) {
            e.currentTarget.classList.remove('border-blue-500', 'bg-black/20');
        }
    },
    
    drop: (e, status) => {
        e.preventDefault();
        e.currentTarget.classList.remove('border-blue-500', 'bg-black/20');
        
        if(zadaniowiecApp.draggedTaskId) {
            const task = zadaniowiecApp.tasks.find(t => t.id === zadaniowiecApp.draggedTaskId);
            if(task && task.status !== status) {
                task.status = status;
                zadaniowiecApp.save();
                zadaniowiecApp.render();
            }
        }
    }
};

// Automatyczne inicjowanie
setTimeout(zadaniowiecApp.init, 500);