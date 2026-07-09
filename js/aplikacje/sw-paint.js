    const swpaintApp = {
            currentFileId: null,
            open: (fileItem) => { swpaintApp.currentFileId = fileItem ? fileItem.id : null; document.getElementById('skryba-editor').innerHTML = fileItem ? (fileItem.content || '') : ''; document.getElementById('skryba-filename-display').innerText = fileItem ? fileItem.name : 'Nowy Plik.txt'; winManager.open('skryba'); },
            newFile: () => { swpaintApp.currentFileId = null; document.getElementById('skryba-editor').innerHTML = ''; document.getElementById('skryba-filename-display').innerText = 'Nowy Plik.txt'; },
            openLocalFile: (e) => { const file = e.target.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = (ev) => { document.getElementById('skryba-editor').innerHTML = ev.target.result.replace(/\n/g, '<br>'); skrybaApp.currentFileId = null; document.getElementById('skryba-filename-display').innerText = file.name; }; reader.readAsText(file); e.target.value = ''; },
            promptSaveToSystem: () => {
                ui.showPrompt("Zapisz plik jako:", document.getElementById('skryba-filename-display').innerText, "Zapisz", (name) => {
                    if(!name) name = "Nowy Plik.txt"; if(!name.endsWith('.txt')) name += '.t';
                    const content = document.getElementById('skryba-editor').innerHTML;
                    if(skrybaApp.currentFileId) { const f = fileSystem.find(i => i.id === skrybaApp.currentFileId); if(f) { f.content = content; f.name = name; fsManager.save(); apps.showToast('Skryba', 'Pomyślnie zapisano zmiany.', 'success'); } } 
                    else { const id = 'file_'+Date.now(); fileSystem.push({ id: id, type: 'file', name: name, icon: '📄', content: content, parentId: fsManager.currentFolder || 'root', x: 20, y: 20 }); fsManager.save(); skrybaApp.currentFileId = id; apps.showToast('Skryba', 'Zapisano nowy plik w systemie.', 'success'); }
                    document.getElementById('skryba-filename-display').innerText = name; desktop.render(); if(document.getElementById('app-aktowka').classList.contains('active')) fsManager.renderExplorerContent(fsManager.currentFolder);
                });
            },
            saveToPC: () => { const el = document.createElement('div'); el.innerHTML = document.getElementById('skryba-editor').innerHTML; let text = el.innerText || el.textContent; const blob = new Blob([text], { type: "text/plain;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = document.getElementById('skryba-filename-display').innerText || "Notatka.txt"; a.click(); apps.showToast('Skryba', 'Pobieranie pliku na komputer...', 'info'); }
        };