// ======================================================================
// PLIK: js/aplikacje/tablica.js (Tabelarz Pro - Arkusz Kalkulacyjny)
// ======================================================================

const tabelarzApp = {
    currentFileId: null,
    meta: { name: 'Arkusz_1', author: 'Nieznany', date: new Date().toLocaleString() },
    data: {},
    bgColors: {}, 
    merges: {},   
    colWidths: {}, 
    rowHeights: {}, 
    rows: 30,
    cols: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], 
    
    selected: 'A1', 
    protectedCells: [], 
    
    resizing: null,

    init: () => {
        tabelarzApp.renderGrid();
    },

    // ------------------------------------------------------------------
    // RENDEROWANIE TABELI I KRAWĘDZI DO PRZECIĄGANIA
    // ------------------------------------------------------------------
    renderGrid: () => {
        const container = document.getElementById('tabelarz-grid');
        if(!container) return;
        
        let html = '<table class="w-max border-collapse text-sm text-gray-800 dark:text-gray-200" style="table-layout: fixed;">';
        
        html += '<tr><th class="border border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-[#222] w-12 sticky top-0 z-20"></th>';
        tabelarzApp.cols.forEach(c => {
            let isSelected = tabelarzApp.selected === `col_${c}`;
            let bg = tabelarzApp.bgColors[`col_${c}`] || (isSelected ? '#a7f3d0' : '');
            let w = tabelarzApp.colWidths[c] || 80; 
            
            html += `<th id="th-col-${c}" class="border border-gray-300 dark:border-gray-600 p-0 font-bold text-center sticky top-0 z-10 hover:bg-gray-300 dark:hover:bg-[#444] select-none relative" style="background-color: ${bg}; width: ${w}px;" onclick="tabelarzApp.selectItem('col_${c}')">
                        <div class="overflow-hidden w-full h-full py-1 pointer-events-none">${c}</div>
                        <div class="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-emerald-500 z-30" onmousedown="tabelarzApp.startResize(event, 'col', '${c}')"></div>
                     </th>`;
        });
        html += '</tr>';
        
        for(let r = 1; r <= tabelarzApp.rows; r++) {
            let isRowSelected = tabelarzApp.selected === `row_${r}`;
            let rowBg = tabelarzApp.bgColors[`row_${r}`] || (isRowSelected ? '#a7f3d0' : '');
            let h = tabelarzApp.rowHeights[r] || 28; 
            
            html += `<tr>`;
            html += `<td id="th-row-${r}" class="border border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-[#222] font-bold text-center hover:bg-gray-300 dark:hover:bg-[#444] select-none relative" 
                         style="background-color: ${rowBg}; height: ${h}px;" onclick="tabelarzApp.selectItem('row_${r}')">
                        <div class="overflow-hidden w-full h-full flex items-center justify-center pointer-events-none">${r}</div>
                        <div class="absolute left-0 right-0 bottom-0 h-2 cursor-row-resize hover:bg-emerald-500 z-30" onmousedown="tabelarzApp.startResize(event, 'row', '${r}')"></div>
                     </td>`;
            
            for(let cIdx = 0; cIdx < tabelarzApp.cols.length; cIdx++) {
                const c = tabelarzApp.cols[cIdx];
                const cellId = `${c}${r}`;
                
                if (cIdx > 0 && tabelarzApp.merges[`${tabelarzApp.cols[cIdx - 1]}${r}`]) continue; 

                let colspan = tabelarzApp.merges[cellId] ? `colspan="2"` : '';
                const rawVal = tabelarzApp.data[cellId] || '';
                const displayVal = tabelarzApp.evaluate(rawVal);
                
                let isSelected = tabelarzApp.selected === cellId;
                let cellBg = tabelarzApp.bgColors[cellId] || tabelarzApp.bgColors[`row_${r}`] || tabelarzApp.bgColors[`col_${c}`] || '';
                let focusClass = isSelected ? 'ring-2 ring-inset ring-emerald-500 z-10 relative' : '';

                let isProtected = tabelarzApp.protectedCells.includes(cellId);
                let readonlyAttr = isProtected ? 'readonly="true"' : '';
                let protectedClass = isProtected ? 'bg-gray-100 dark:bg-[#151515] cursor-not-allowed' : 'bg-transparent';

                html += `<td class="row-td-${r} border border-gray-300 dark:border-gray-600 p-0 bg-white dark:bg-[#1a1a1a] ${focusClass}" ${colspan} style="background-color: ${cellBg}; height: ${h}px;">
                    <input type="text" id="cell-${cellId}" ${readonlyAttr} value="${typeof desktop !== 'undefined' ? desktop.escapeHTML(String(displayVal)) : String(displayVal)}" 
                           onfocus="tabelarzApp.handleFocus('${cellId}', this)"
                           onblur="tabelarzApp.updateCell('${cellId}', this.value)"
                           class="w-full h-full outline-none px-2 ${protectedClass} text-gray-800 dark:text-white font-sans">
                </td>`;
            }
            html += '</tr>';
        }
        html += '</table>';
        container.innerHTML = html;
        
        const lbl = document.getElementById('tabelarz-selected-label');
        if(lbl) lbl.innerText = tabelarzApp.selected.replace('row_', 'Wiersz ').replace('col_', 'Kol. ');
    },
    
    // ------------------------------------------------------------------
    // RESIZE: MECHANIZM PŁYNNEGO PRZECIĄGANIA MYSZKĄ
    // ------------------------------------------------------------------
    startResize: (e, type, id) => {
        e.stopPropagation();
        tabelarzApp.resizing = {
            type: type,
            id: id,
            startX: e.clientX,
            startY: e.clientY,
            startW: tabelarzApp.colWidths[id] || 80,
            startH: tabelarzApp.rowHeights[id] || 28
        };
        document.addEventListener('mousemove', tabelarzApp.doResize);
        document.addEventListener('mouseup', tabelarzApp.stopResize);
    },
    
    doResize: (e) => {
        if(!tabelarzApp.resizing) return;
        
        if(tabelarzApp.resizing.type === 'col') {
            let newW = tabelarzApp.resizing.startW + (e.clientX - tabelarzApp.resizing.startX);
            if(newW > 30) { 
                tabelarzApp.colWidths[tabelarzApp.resizing.id] = newW;
                document.getElementById(`th-col-${tabelarzApp.resizing.id}`).style.width = newW + 'px';
            }
        } else {
            let newH = tabelarzApp.resizing.startH + (e.clientY - tabelarzApp.resizing.startY);
            if(newH > 20) { 
                tabelarzApp.rowHeights[tabelarzApp.resizing.id] = newH;
                document.getElementById(`th-row-${tabelarzApp.resizing.id}`).style.height = newH + 'px';
                document.querySelectorAll(`.row-td-${tabelarzApp.resizing.id}`).forEach(td => td.style.height = newH + 'px');
            }
        }
    },
    
    stopResize: () => {
        document.removeEventListener('mousemove', tabelarzApp.doResize);
        document.removeEventListener('mouseup', tabelarzApp.stopResize);
        tabelarzApp.resizing = null;
        tabelarzApp.renderGrid(); 
    },

    // ------------------------------------------------------------------
    // OBSŁUGA KURSORA I WPROWADZANIA 
    // ------------------------------------------------------------------
    selectItem: (id) => {
        tabelarzApp.selected = id;
        tabelarzApp.renderGrid();
    },

    handleFocus: (id, el) => {
        tabelarzApp.selected = id;
        const lbl = document.getElementById('tabelarz-selected-label');
        if(lbl) lbl.innerText = id;
        
        const raw = tabelarzApp.data[id] || '';
        if (el.value !== raw && !tabelarzApp.protectedCells.includes(id)) {
            el.value = raw;
            setTimeout(() => { el.selectionStart = el.selectionEnd = el.value.length; }, 0);
        }
        
        document.querySelectorAll('#tabelarz-grid td').forEach(td => td.classList.remove('ring-2', 'ring-inset', 'ring-emerald-500', 'z-10', 'relative'));
        if(el.parentElement) el.parentElement.classList.add('ring-2', 'ring-inset', 'ring-emerald-500', 'z-10', 'relative');
    },

    updateCell: (id, val) => {
        if(tabelarzApp.protectedCells.includes(id)) return; 
        tabelarzApp.data[id] = val;
        // Zawsze odświeżamy siatkę, by wszystkie formuły matematyczne na bieżąco się zaktualizowały
        tabelarzApp.renderGrid();
    },

    // ------------------------------------------------------------------
    // NARZĘDZIA EDYCYJNE I ZARZĄDZANIE WERSAMI/KOLUMNAMI
    // ------------------------------------------------------------------
    applyColor: (hex) => {
        tabelarzApp.bgColors[tabelarzApp.selected] = hex;
        tabelarzApp.renderGrid();
    },
    
    toggleProtection: () => {
        if(!tabelarzApp.selected || tabelarzApp.selected.startsWith('row_') || tabelarzApp.selected.startsWith('col_')) {
            return typeof apps !== 'undefined' ? apps.showToast('Błąd', 'Zaznacz konkretną komórkę do zablokowania!', 'error') : null;
        }
        if(tabelarzApp.protectedCells.includes(tabelarzApp.selected)) {
            tabelarzApp.protectedCells = tabelarzApp.protectedCells.filter(c => c !== tabelarzApp.selected);
            if(typeof apps !== 'undefined') apps.showToast('Odblokowano', `Komórka ${tabelarzApp.selected} jest znów edytowalna.`, 'success');
        } else {
            tabelarzApp.protectedCells.push(tabelarzApp.selected);
            if(typeof apps !== 'undefined') apps.showToast('Ochrona', `Komórka ${tabelarzApp.selected} została zablokowana!`, 'info');
        }
        tabelarzApp.renderGrid();
    },

    mergeRight: () => {
        if(!tabelarzApp.selected || tabelarzApp.selected.startsWith('row_') || tabelarzApp.selected.startsWith('col_')) return;
        if(tabelarzApp.merges[tabelarzApp.selected]) delete tabelarzApp.merges[tabelarzApp.selected]; 
        else tabelarzApp.merges[tabelarzApp.selected] = 2; 
        tabelarzApp.renderGrid();
    },

    mergeLeft: () => {
        if(!tabelarzApp.selected || tabelarzApp.selected.startsWith('row_') || tabelarzApp.selected.startsWith('col_')) return;
        let c = tabelarzApp.selected.match(/[A-Z]+/)[0], r = parseInt(tabelarzApp.selected.match(/\d+/)[0]);
        let cIdx = tabelarzApp.cols.indexOf(c);
        if(cIdx > 0) {
            let prevC = tabelarzApp.cols[cIdx - 1];
            let targetId = `${prevC}${r}`;
            if(tabelarzApp.merges[targetId]) delete tabelarzApp.merges[targetId];
            else tabelarzApp.merges[targetId] = 2; 
            tabelarzApp.selected = targetId; 
            tabelarzApp.renderGrid();
        }
    },

    addRow: () => { 
        tabelarzApp.rows += 1; 
        tabelarzApp.renderGrid(); 
        setTimeout(() => {
            const wrapper = document.getElementById('tabelarz-print-area');
            if(wrapper) wrapper.scrollTop = wrapper.scrollHeight;
        }, 50);
    },

    addCol: () => {
        const lastCol = tabelarzApp.cols[tabelarzApp.cols.length - 1];
        let nextCol = '';
        if (lastCol.length === 1) {
            let code = lastCol.charCodeAt(0);
            if (code < 90) nextCol = String.fromCharCode(code + 1);
            else nextCol = 'AA';
        } else {
            let first = lastCol.charCodeAt(0);
            let second = lastCol.charCodeAt(1);
            if(second < 90) nextCol = String.fromCharCode(first) + String.fromCharCode(second + 1);
            else nextCol = String.fromCharCode(first + 1) + 'A';
        }
        tabelarzApp.cols.push(nextCol);
        tabelarzApp.renderGrid();
        setTimeout(() => {
            const wrapper = document.getElementById('tabelarz-print-area');
            if(wrapper) wrapper.scrollLeft = wrapper.scrollWidth;
        }, 50);
    },

    moveRowUp: () => {
        if(!tabelarzApp.selected.startsWith('row_')) return typeof apps !== 'undefined' ? apps.showToast('Błąd', 'Zaznacz numer wiersza po lewej!', 'error') : null;
        let r = parseInt(tabelarzApp.selected.split('_')[1]);
        if(r <= 1) return; 
        tabelarzApp.cols.forEach(c => {
            let temp = tabelarzApp.data[`${c}${r-1}`];
            tabelarzApp.data[`${c}${r-1}`] = tabelarzApp.data[`${c}${r}`];
            tabelarzApp.data[`${c}${r}`] = temp;
        });
        tabelarzApp.selected = `row_${r-1}`; tabelarzApp.renderGrid();
    },

    moveRowDown: () => {
        if(!tabelarzApp.selected.startsWith('row_')) return typeof apps !== 'undefined' ? apps.showToast('Błąd', 'Zaznacz numer wiersza po lewej!', 'error') : null;
        let r = parseInt(tabelarzApp.selected.split('_')[1]);
        if(r >= tabelarzApp.rows) return; 
        tabelarzApp.cols.forEach(c => {
            let temp = tabelarzApp.data[`${c}${r+1}`];
            tabelarzApp.data[`${c}${r+1}`] = tabelarzApp.data[`${c}${r}`];
            tabelarzApp.data[`${c}${r}`] = temp;
        });
        tabelarzApp.selected = `row_${r+1}`; tabelarzApp.renderGrid();
    },

    promptFindReplace: () => {
        if(typeof ui !== 'undefined') {
            ui.showPrompt("ZNAJDŹ tekst:", "", "Dalej", (findText) => {
                if(!findText) return;
                ui.showPrompt(`ZAMIEŃ "${findText}" na:`, "", "Zamień", (replaceText) => {
                    let count = 0;
                    Object.keys(tabelarzApp.data).forEach(key => {
                        let val = tabelarzApp.data[key];
                        if(typeof val === 'string' && val.includes(findText)) {
                            tabelarzApp.data[key] = val.split(findText).join(replaceText || '');
                            count++;
                        }
                    });
                    tabelarzApp.renderGrid();
                    if(typeof apps !== 'undefined') apps.showToast('Sukces', `Zamieniono ${count} wystąpień.`, 'success');
                });
            });
        }
    },

    // ------------------------------------------------------------------
    // SILNIK MATEMATYCZNY EXCELA
    // ------------------------------------------------------------------
    evaluate: (formula) => {
        if (!formula || typeof formula !== 'string' || !formula.startsWith('=')) return formula;
        let expr = formula.substring(1).toUpperCase().trim();

        const resolveRange = (match, start, end, operation) => {
            let cells = tabelarzApp.getRange(start, end);
            let vals = [];
            cells.forEach(c => {
                let v = tabelarzApp.data[c];
                // Ignorujemy kompletnie puste komórki by średnia, min i max działały poprawnie
                if (v !== undefined && v !== null && v !== '') {
                    if(v.toString().startsWith('=')) return;
                    let num = parseFloat(v.toString().replace(',', '.'));
                    if(!isNaN(num)) vals.push(num);
                }
            });
            if(vals.length === 0) return 0;
            if(operation === 'SUMA') return vals.reduce((a, b) => a + b, 0);
            if(operation === 'ŚREDNIA') return vals.reduce((a, b) => a + b, 0) / vals.length;
            if(operation === 'MAX') return Math.max(...vals);
            if(operation === 'MIN') return Math.min(...vals);
            return 0;
        };

        expr = expr.replace(/SUMA\(([A-Z]+\d+):([A-Z]+\d+)\)/g, (m, s, e) => resolveRange(m, s, e, 'SUMA'));
        expr = expr.replace(/ŚREDNIA\(([A-Z]+\d+):([A-Z]+\d+)\)/g, (m, s, e) => resolveRange(m, s, e, 'ŚREDNIA'));
        expr = expr.replace(/MAX\(([A-Z]+\d+):([A-Z]+\d+)\)/g, (m, s, e) => resolveRange(m, s, e, 'MAX'));
        expr = expr.replace(/MIN\(([A-Z]+\d+):([A-Z]+\d+)\)/g, (m, s, e) => resolveRange(m, s, e, 'MIN'));

        expr = expr.replace(/[A-Z]+\d+/g, (match) => {
            let v = tabelarzApp.data[match];
            // Tu również ignorujemy puste pojedyncze komórki jako "0" by nie zepsuć obliczeń
            if (v === undefined || v === null || v === '') return 0;
            if(v.toString().startsWith('=')) return 0;
            let num = parseFloat(v.toString().replace(',', '.'));
            return isNaN(num) ? 0 : num;
        });

        try {
            expr = expr.replace(/\s+/g, '');
            if (/^[0-9+\-*/().]+$/.test(expr)) {
                 let result = new Function('return ' + expr)();
                 return Math.round(result * 100) / 100;
            }
            return "#BŁĄD!";
        } catch (e) { return "#BŁĄD!"; }
    },
    
    getRange: (start, end) => {
        let c1 = start.match(/[A-Z]+/)[0], r1 = parseInt(start.match(/\d+/)[0]);
        let c2 = end.match(/[A-Z]+/)[0], r2 = parseInt(end.match(/\d+/)[0]);
        let cells = [];
        let colStart = c1.charCodeAt(0), colEnd = c2.charCodeAt(0);
        if(colStart > colEnd) { let t=colStart; colStart=colEnd; colEnd=t; }
        if(r1 > r2) { let t=r1; r1=r2; r2=t; }
        for(let c=colStart; c<=colEnd; c++) {
            for(let r=r1; r<=r2; r++) { cells.push(String.fromCharCode(c) + r); }
        }
        return cells;
    },
    
    sumColumn: () => {
        if(typeof ui === 'undefined') return;
        ui.showPrompt("Podaj literę kolumny do zsumowania (A-H):", "A", "Sumuj", (col) => {
            if(col) {
                let colUp = col.toUpperCase();
                if(tabelarzApp.cols.includes(colUp)) {
                    let sum = 0;
                    for(let r = 1; r <= tabelarzApp.rows; r++) {
                        let valStr = (tabelarzApp.data[`${colUp}${r}`] || '').replace(',', '.');
                        const val = parseFloat(valStr);
                        if(!isNaN(val)) sum += val;
                    }
                    if(typeof apps !== 'undefined') apps.showToast('Tabelarz', `Suma kolumny ${colUp} wynosi: ${sum}`, 'info');
                } else {
                    if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Nieprawidłowa litera kolumny!', 'error');
                }
            }
        });
    },

    // ------------------------------------------------------------------
    // WŁAŚCIWOŚCI ARKUSZA
    // ------------------------------------------------------------------
    showProperties: () => {
        document.getElementById('tabelarz-prop-name').value = tabelarzApp.meta.name;
        document.getElementById('tabelarz-prop-author').value = tabelarzApp.meta.author;
        document.getElementById('tabelarz-prop-date').innerText = tabelarzApp.meta.date;
        document.getElementById('tabelarz-prop-size').innerText = `${tabelarzApp.rows} wierszy, ${tabelarzApp.cols.length} kolumn`;
        document.getElementById('tabelarz-props-modal').classList.remove('hidden');
    },

    saveProperties: () => {
        tabelarzApp.meta.name = document.getElementById('tabelarz-prop-name').value || 'Arkusz_1';
        tabelarzApp.meta.author = document.getElementById('tabelarz-prop-author').value || 'Użytkownik';
        document.getElementById('tabelarz-props-modal').classList.add('hidden');
        if(typeof apps !== 'undefined') apps.showToast('Sukces', 'Zaktualizowano właściwości!', 'success');
    },

    // ------------------------------------------------------------------
    // OPERACJE NA PLIKACH, FOLDERACH I MODALACH ZAPISU
    // ------------------------------------------------------------------
    promptNewFile: () => {
        document.getElementById('tabelarz-new-modal').classList.remove('hidden');
    },

    // Funkcja wywoływana z Menu Plik -> Zamknij plik
    closeFile: () => {
        if (!tabelarzApp.currentFileId) return; 
        
        tabelarzApp.data = {}; 
        tabelarzApp.bgColors = {}; 
        tabelarzApp.merges = {};
        tabelarzApp.colWidths = {}; 
        tabelarzApp.rowHeights = {}; 
        tabelarzApp.protectedCells = [];
        tabelarzApp.meta = { name: 'Arkusz_1', author: 'Nieznany', date: new Date().toLocaleString() };
        tabelarzApp.currentFileId = null;
        tabelarzApp.renderGrid();
        
        if(typeof apps !== 'undefined') apps.showToast('Tabelarz', 'Plik został zamknięty.', 'info');
    },

    confirmNewFile: () => {
        document.getElementById('tabelarz-new-modal').classList.add('hidden');
        tabelarzApp.data = {}; tabelarzApp.bgColors = {}; tabelarzApp.merges = {};
        tabelarzApp.colWidths = {}; tabelarzApp.rowHeights = {}; tabelarzApp.protectedCells = [];
        tabelarzApp.meta = { name: 'Nowy Arkusz', author: 'Nieznany', date: new Date().toLocaleString() };
        tabelarzApp.currentFileId = null;
        tabelarzApp.renderGrid();
        if(typeof apps !== 'undefined') apps.showToast('Nowy Plik', 'Arkusz został wyczyszczony.', 'success');
    },

    showBigOSPicker: () => {
        const list = document.getElementById('tabelarz-file-list');
        if(!list) return;
        list.innerHTML = '';
        if(typeof fileSystem === 'undefined') return;
        
        const csvFiles = fileSystem.filter(f => f.type === 'file' && f.name.endsWith('.csv'));
        if(csvFiles.length === 0) {
            list.innerHTML = '<div class="text-gray-500 text-center py-4">Brak plików .csv w systemie</div>';
        } else {
            csvFiles.forEach(f => {
                const btn = document.createElement('button');
                btn.className = 'w-full text-left px-3 py-2 bg-gray-100 dark:bg-[#111] hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded transition text-gray-800 dark:text-white border border-gray-200 dark:border-[#333] mb-2';
                btn.innerHTML = `📈 ${typeof desktop !== 'undefined' ? desktop.escapeHTML(f.name) : f.name}`;
                btn.onclick = () => {
                    document.getElementById('tabelarz-picker-modal').classList.add('hidden');
                    tabelarzApp.openFromFS(f);
                };
                list.appendChild(btn);
            });
        }
        document.getElementById('tabelarz-picker-modal').classList.remove('hidden');
    },

    openFromFS: (fileItem) => {
        tabelarzApp.currentFileId = fileItem.id;
        tabelarzApp.meta.name = fileItem.name;
        
        const lines = (fileItem.content || '').split('\n');
        tabelarzApp.data = {}; tabelarzApp.bgColors = {}; tabelarzApp.merges = {};
        tabelarzApp.colWidths = {}; tabelarzApp.rowHeights = {}; tabelarzApp.protectedCells = [];
        if(lines.length > 1) {
            if(lines.length > tabelarzApp.rows) tabelarzApp.rows = lines.length + 5;
            for(let r = 1; r < lines.length; r++) {
                const rowData = lines[r].split(';');
                for(let c = 0; c < rowData.length; c++) {
                    if(c < tabelarzApp.cols.length) {
                        tabelarzApp.data[`${tabelarzApp.cols[c]}${r}`] = rowData[c].trim();
                    }
                }
            }
        }
        tabelarzApp.renderGrid();
        if(typeof winManager !== 'undefined') winManager.open('tabelarz');
    },

    openFile: (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const lines = event.target.result.split('\n');
            tabelarzApp.data = {}; tabelarzApp.bgColors = {}; tabelarzApp.merges = {};
            tabelarzApp.colWidths = {}; tabelarzApp.rowHeights = {}; tabelarzApp.protectedCells = [];
            tabelarzApp.meta.name = file.name;
            if(lines.length > 1) {
                if(lines.length > tabelarzApp.rows) tabelarzApp.rows = lines.length + 5;
                for(let r = 1; r < lines.length; r++) {
                    const rowData = lines[r].split(';');
                    for(let c = 0; c < rowData.length; c++) {
                        if(c < tabelarzApp.cols.length) {
                            tabelarzApp.data[`${tabelarzApp.cols[c]}${r}`] = rowData[c].trim();
                        }
                    }
                }
            }
            tabelarzApp.renderGrid();
            if(typeof apps !== 'undefined') apps.showToast('Sukces', 'Wczytano plik z dysku.', 'success');
        };
        reader.readAsText(file);
        e.target.value = '';
    },

    showSaveModal: () => {
        const nameInput = document.getElementById('tabelarz-save-name');
        const folderSelect = document.getElementById('tabelarz-save-folder');
        
        nameInput.value = tabelarzApp.meta.name.endsWith('.csv') ? tabelarzApp.meta.name : tabelarzApp.meta.name + '.csv';
        
        // Zbuduj listę folderów do zapisu (Pulpit + Foldery z Aktówki)
        folderSelect.innerHTML = '<option value="root">Pulpit (Katalog Główny)</option>';
        if(typeof fileSystem !== 'undefined') {
            fileSystem.filter(f => f.type === 'folder' && f.id !== 'hasiok').forEach(folder => {
                let isSelected = (typeof fsManager !== 'undefined' && fsManager.currentFolder === folder.id) ? 'selected' : '';
                folderSelect.innerHTML += `<option value="${folder.id}" ${isSelected}>📂 ${typeof desktop !== 'undefined' ? desktop.escapeHTML(folder.name) : folder.name}</option>`;
            });
        }

        document.getElementById('tabelarz-save-modal').classList.remove('hidden');
    },

    confirmSaveToBigOS: () => {
        const rawName = document.getElementById('tabelarz-save-name').value;
        const folderId = document.getElementById('tabelarz-save-folder').value;
        document.getElementById('tabelarz-save-modal').classList.add('hidden');
        
        let finalName = rawName.endsWith('.csv') ? rawName : rawName + '.csv';
        
        tabelarzApp._generateCSV((csv) => {
            let existingFileId = tabelarzApp.currentFileId;
            
            // "Zapisz jako" - nowy plik, jeśli użytkownik zmieni nazwę lub wybierze inny folder
            if(tabelarzApp.currentFileId) {
                let f = fileSystem.find(i => i.id === tabelarzApp.currentFileId);
                if(f && (f.name !== finalName || f.parentId !== folderId)) {
                    existingFileId = null; 
                }
            }
            
            if(existingFileId) {
                const f = fileSystem.find(i => i.id === existingFileId);
                if(f) f.content = csv;
            } else {
                let id = 'file_'+Date.now();
                if(typeof fileSystem !== 'undefined') {
                    fileSystem.push({ id: id, type: 'file', name: finalName.trim(), icon: '📊', content: csv, parentId: folderId, x: 20, y: 20 });
                }
                tabelarzApp.currentFileId = id;
            }
            
            tabelarzApp.meta.name = finalName;
            
            if(typeof fsManager !== 'undefined') {
                fsManager.save(); 
                if(typeof desktop !== 'undefined') desktop.render();
                if(fsManager.currentFolder === folderId) fsManager.renderExplorerContent(folderId);
            }
            
            if(typeof apps !== 'undefined') apps.showToast('Tabelarz', `Plik ${finalName} zapisano poprawnie!`, 'success');
        });
    },

    saveToPC: () => {
        tabelarzApp._generateCSV((csv) => {
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            let finalName = tabelarzApp.meta.name.endsWith('.csv') ? tabelarzApp.meta.name : tabelarzApp.meta.name + '.csv';
            link.download = finalName;
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            if(typeof apps !== 'undefined') apps.showToast('Sukces', 'Plik pobrany na dysk komputera!', 'success');
        });
    },

    _generateCSV: (callback) => {
        let csv = tabelarzApp.cols.join(';') + '\n';
        for(let r = 1; r <= tabelarzApp.rows; r++) {
            let rowData = [];
            tabelarzApp.cols.forEach(c => {
                let rawVal = tabelarzApp.data[`${c}${r}`] || '';
                rowData.push(tabelarzApp.evaluate(rawVal));
            });
            csv += rowData.join(';') + '\n';
        }
        callback(csv);
    },

    printSheet: () => {
        const printWindow = window.open('', '_blank');
        const tableHtml = document.getElementById('tabelarz-grid').innerHTML;
        printWindow.document.write(`
            <html><head><title>Wydruk / Eksport PDF - BigOS Tabelarz</title>
            <style>
                body { font-family: sans-serif; padding: 20px; }
                table { border-collapse: collapse; width: 100%; table-layout: fixed; }
                th, td { border: 1px solid #000; padding: 5px; text-align: left; }
                th { background-color: #eee; }
                input { border: none; font-size: inherit; width: 100%; background: transparent; }
                th div, td div { resize: none !important; }
            </style>
            </head><body>
            <h2>Arkusz Kalkulacyjny - ${tabelarzApp.meta.name}</h2>
            <p><strong>Autor:</strong> ${tabelarzApp.meta.author} | <strong>Data utworzenia:</strong> ${tabelarzApp.meta.date}</p>
            ${tableHtml}
            <script> window.onload = function() { window.print(); window.close(); } </script>
            </body></html>
        `);
        printWindow.document.close();
    }
};

setTimeout(tabelarzApp.init, 500);