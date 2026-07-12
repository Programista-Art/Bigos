// ======================================================================
// PLIK: js/skryba.js (Skryba - Edytor Tekstu)
// ======================================================================

const skrybaApp = {
    currentFileId: null,

    open: (fileItem) => { 
        skrybaApp.currentFileId = fileItem ? fileItem.id : null; 
        document.getElementById('skryba-editor').innerHTML = fileItem ? (fileItem.content || '') : ''; 
        document.getElementById('skryba-filename-display').innerText = fileItem ? fileItem.name : 'Nowy Plik.txt'; 
        if(typeof winManager !== 'undefined') winManager.open('skryba'); 
    },

    newFile: () => { 
        skrybaApp.currentFileId = null; 
        document.getElementById('skryba-editor').innerHTML = ''; 
        document.getElementById('skryba-filename-display').innerText = 'Nowy Plik.txt'; 
    },

    openLocalFile: (e) => { 
        const file = e.target.files[0]; 
        if(!file) return; 
        const reader = new FileReader(); 
        reader.onload = (ev) => { 
            document.getElementById('skryba-editor').innerHTML = ev.target.result.replace(/\n/g, '<br>'); 
            skrybaApp.currentFileId = null; 
            document.getElementById('skryba-filename-display').innerText = file.name; 
            if(typeof apps !== 'undefined') apps.showToast('Skryba', 'Wczytano plik z dysku', 'success');
        }; 
        reader.readAsText(file); 
        e.target.value = ''; 
    },

    promptSaveToSystem: () => {
        if(typeof ui === 'undefined') return;
        ui.showPrompt("Zapisz plik jako:", document.getElementById('skryba-filename-display').innerText, "Zapisz", (name) => {
            if(!name) name = "Nowy Plik.txt"; 
            if(!name.endsWith('.txt') && !name.endsWith('.html') && !name.endsWith('.csv')) name += '.txt';
            
            const content = document.getElementById('skryba-editor').innerHTML;
            
            if(skrybaApp.currentFileId) { 
                const f = fileSystem.find(i => i.id === skrybaApp.currentFileId); 
                if(f) { 
                    f.content = content; 
                    f.name = name; 
                    if(typeof fsManager !== 'undefined') fsManager.save(); 
                    if(typeof apps !== 'undefined') apps.showToast('Skryba', 'Pomyślnie zapisano zmiany.', 'success'); 
                } 
            } else { 
                const id = 'file_'+Date.now(); 
                fileSystem.push({ id: id, type: 'file', name: name, icon: '📄', content: content, parentId: typeof fsManager !== 'undefined' ? (fsManager.currentFolder || 'root') : 'root', x: 20, y: 20 }); 
                if(typeof fsManager !== 'undefined') fsManager.save(); 
                skrybaApp.currentFileId = id; 
                if(typeof apps !== 'undefined') apps.showToast('Skryba', 'Zapisano nowy plik w systemie.', 'success'); 
            }
            
            document.getElementById('skryba-filename-display').innerText = name; 
            if(typeof desktop !== 'undefined') desktop.render(); 
            const aktowkaWin = document.getElementById('app-aktowka');
            if(aktowkaWin && aktowkaWin.classList.contains('active') && typeof fsManager !== 'undefined') {
                fsManager.renderExplorerContent(fsManager.currentFolder);
            }
        });
    },

    saveToPC: () => { 
        const el = document.createElement('div'); 
        el.innerHTML = document.getElementById('skryba-editor').innerHTML; 
        
        // Konwersja tagów z HTML na natywne nowe linie dla notatnika Windows
        let text = el.innerHTML.replace(/<br\s*[\/]?>/gi, "\n").replace(/<[^>]+>/g, "");
        
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" }); 
        const a = document.createElement("a"); 
        a.href = URL.createObjectURL(blob); 
        a.download = document.getElementById('skryba-filename-display').innerText || "Notatka.txt"; 
        a.click(); 
        if(typeof apps !== 'undefined') apps.showToast('Skryba', 'Pobieranie pliku na komputer...', 'info'); 
    }
};