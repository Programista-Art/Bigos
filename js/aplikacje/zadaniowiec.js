// Aplikacja Zadaniowiec - Kanban)


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
                <div id="${t.id}" class="bg-yellow-100 dark:bg-yellow-800/40 p-3 mb-2 rounded shadow text-sm cursor-grab border border-yellow-300 dark:border-yellow-700/50 relative group transition-transform hover:scale-[1.02]"
                     draggable="true" ondragstart="zadaniowiecApp.dragStart(event)" ondragend="zadaniowiecApp.dragEnd(event)">
                    <div class="pr-6 text-gray-800 dark:text-gray-200 font-medium">${desktop.escapeHTML(t.text)}</div>
                    <button onclick="zadaniowiecApp.deleteTask('${t.id}')" class="absolute top-1 right-2 text-red-500 font-bold opacity-0 group-hover:opacity-100 transition hover:text-red-700">✖</button>
                </div>`;
        });
        
        ['todo', 'progress', 'done'].forEach(status => {
            const el = document.getElementById(`kanban-col-${status}`);
            if(el) {
                el.innerHTML = cols[status];
                // Wizualny efekt braku zadań
                if(cols[status] === '') {
                    el.innerHTML = '<div class="text-center text-gray-400 dark:text-gray-500 text-xs mt-4">Brak zadań</div>';
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
        document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('bg-blue-50', 'dark:bg-blue-900/20', 'border-blue-300'));
    },
    
    allowDrop: (e) => { 
        e.preventDefault(); 
        // Efekt podświetlenia kolumny, nad którą aktualnie przebywamy
        if(e.currentTarget.classList.contains('kanban-col')) {
            e.currentTarget.classList.add('bg-blue-50', 'dark:bg-blue-900/20', 'border-blue-300');
        }
    },
    
    leaveDrop: (e) => {
        if(e.currentTarget.classList.contains('kanban-col')) {
            e.currentTarget.classList.remove('bg-blue-50', 'dark:bg-blue-900/20', 'border-blue-300');
        }
    },
    
    drop: (e, status) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-blue-50', 'dark:bg-blue-900/20', 'border-blue-300');
        
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