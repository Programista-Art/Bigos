// ======================================================================
// PLIK: js/aplikacje/przelicznik.js (Przelicznik - Konwerter jednostek + Inżynieria)
// ======================================================================

const przelicznikApp = {
    currentCategory: 'length',
    isPinned: false,
    
    // Zmienne Pamięci
    memoryValue: 0,
    lastScalarResult: 0,
    
    // Zmienne Historii
    history: [],

    // Zmienne Macierzy
    matrixSize: 2,
    
    // Baza danych wszystkich kategorii i modułów inżynieryjnych
    conversionData: {
        length: { name: 'Długość', icon: '📏', base: 'm', units: { 'mm': 0.001, 'cm': 0.01, 'm': 1, 'km': 1000, 'mile': 1609.344, 'cale': 0.0254, 'stopy': 0.3048 } },
        mass: { name: 'Masa', icon: '⚖️', base: 'kg', units: { 'mg': 0.000001, 'g': 0.001, 'kg': 1, 't': 1000, 'lb': 0.45359237, 'oz': 0.02834952 } },
        temp: { name: 'Temperatura', icon: '🌡️', custom: true, type: 'temp', units: ['°C', '°F', 'K'] },
        volume: { name: 'Objętość', icon: '💧', base: 'l', units: { 'ml': 0.001, 'l': 1, 'm³': 1000, 'gal': 3.78541178 } },
        time: { name: 'Czas', icon: '⏳', base: 's', units: { 'ms': 0.001, 's': 1, 'min': 60, 'h': 3600, 'dzień': 86400, 'tydzień': 604800 } },
        speed: { name: 'Prędkość', icon: '🏎️', base: 'm/s', units: { 'km/h': 1/3.6, 'mph': 0.44704, 'm/s': 1 } },
        energy: { name: 'Energia', icon: '⚡', base: 'J', units: { 'J': 1, 'kJ': 1000, 'Wh': 3600, 'kWh': 3600000, 'cal': 4.184 } },
        power: { name: 'Moc', icon: '🔌', base: 'W', units: { 'W': 1, 'kW': 1000, 'KM': 735.49875 } },
        pressure: { name: 'Ciśnienie', icon: '🎈', base: 'Pa', units: { 'bar': 100000, 'Pa': 1, 'atm': 101325 } },
        data: { name: 'Dane', icon: '💾', base: 'bajt', units: { 'bit': 0.125, 'bajt': 1, 'KB': 1024, 'MB': 1048576, 'GB': 1073741824, 'TB': 1099511627776 } },
        
        // NOWE ZAKŁADKI INŻYNIERYJNE
        matrix: { name: 'Macierze', icon: '🔢', type: 'module' },
        date: { name: 'Kalk. dat', icon: '📅', type: 'module' },
        timeMath: { name: 'Kalk. czasu', icon: '⏱️', type: 'module' },
        history: { name: 'Historia', icon: '📜', type: 'module' }
    },

    init: () => {
        // Wczytanie zapisanych historii
        const savedHist = localStorage.getItem('bigos_przelicznik_history');
        if(savedHist) try { przelicznikApp.history = JSON.parse(savedHist); } catch(e){}
        
        przelicznikApp.upgradeUI();
        window.addEventListener('keydown', przelicznikApp.handleKeyboard);
    },

    upgradeUI: () => {
        let appWindow = document.getElementById('app-przelicznik');
        
        if (!appWindow) { 
            appWindow = document.createElement('div');
            appWindow.id = 'app-przelicznik';
            appWindow.className = 'window absolute';
            document.body.appendChild(appWindow);
        }

        appWindow.style.width = '740px';
        appWindow.style.height = '520px';
        appWindow.style.background = 'transparent';
        appWindow.style.border = 'none';
        appWindow.style.boxShadow = 'none';

        const titleBar = appWindow.querySelector('.title-bar');
        Array.from(appWindow.children).forEach(child => { if (child !== titleBar) child.remove(); });
        if (titleBar) titleBar.style.display = 'none';

        const proUI = document.createElement('div');
        proUI.className = 'flex flex-col overflow-hidden relative themed-app g-panel rounded-lg shadow-2xl h-full';
        
        // Generowanie przycisków lewego menu
        let navButtons = '';
        for (const [key, data] of Object.entries(przelicznikApp.conversionData)) {
            navButtons += `<button onclick="przelicznikApp.switchCategory('${key}')" id="prz-tab-${key}" class="przelicznik-tab g-item text-left px-3 py-1.5 rounded-lg font-bold text-sm transition flex items-center gap-2"><span>${data.icon}</span> <span class="truncate">${data.name}</span></button>`;
        }

        proUI.innerHTML = `
            <!-- Tematyczny Pasek Tytułowy (Z PIN-em!) -->
            <div class="px-4 py-2 border-b g-border flex justify-between items-center cursor-move bg-black/30 shrink-0" onmousedown="winManager.startDrag(event, 'app-przelicznik')" ontouchstart="winManager.startDrag(event, 'app-przelicznik')">
                <span class="text-sm font-bold g-accent drop-shadow-md">🔄 Przelicznik Inżynieryjny</span>
                <div class="flex gap-2">
                    <button onclick="przelicznikApp.togglePin()" id="prz-pin-btn" class="g-icon-btn px-1 hover:text-white transition" title="Zawsze na wierzchu">📌</button>
                    <div class="w-px h-4 bg-gray-600 mx-1"></div>
                    <button onclick="winManager.minimize('przelicznik')" class="g-icon-btn px-1 hover:text-white transition">_</button>
                    <button onclick="winManager.close('przelicznik')" class="text-red-500 hover:text-red-400 px-1 font-bold transition">✖</button>
                </div>
            </div>

            <div class="flex flex-row flex-grow overflow-hidden">
                <!-- Lewy Panel: Kategorie + Pamięć -->
                <div class="w-[200px] sm:w-[220px] border-r g-border bg-black/10 flex flex-col shrink-0">
                    <div class="flex-grow overflow-y-auto custom-scrollbar p-2 gap-1 flex flex-col">
                        ${navButtons}
                    </div>
                    
                    <!-- Pasek Pamięci -->
                    <div class="p-2 border-t g-border bg-black/20 shrink-0">
                        <div class="text-[10px] text-center mb-1 font-bold g-text-muted">PAMIĘĆ (MC/MR/MS/M+/M-)</div>
                        <div class="grid grid-cols-5 gap-1 mb-2 text-[10px] font-bold">
                            <button class="g-btn rounded py-1 bg-white/5 hover:bg-white/20 transition shadow-sm" onclick="przelicznikApp.memClear()">MC</button>
                            <button class="g-btn rounded py-1 bg-white/5 hover:bg-white/20 transition shadow-sm" onclick="przelicznikApp.memRecall()">MR</button>
                            <button class="g-btn rounded py-1 bg-white/5 hover:bg-white/20 transition shadow-sm" onclick="przelicznikApp.memStore()">MS</button>
                            <button class="g-btn rounded py-1 bg-white/5 hover:bg-white/20 transition shadow-sm" onclick="przelicznikApp.memAdd()">M+</button>
                            <button class="g-btn rounded py-1 bg-white/5 hover:bg-white/20 transition shadow-sm" onclick="przelicznikApp.memSub()">M-</button>
                        </div>
                        <div class="text-xs g-text text-center font-mono bg-black/40 border g-border rounded p-1 mb-1 truncate" id="prz-mem-val">M: 0</div>
                    </div>
                </div>

                <!-- Prawy Panel: Dynamiczna zawartość -->
                <div class="flex-grow flex flex-col p-4 sm:p-6 bg-black/20 overflow-y-auto custom-scrollbar relative items-center" id="przelicznik-content">
                    <!-- Treść generowana przez JS -->
                </div>
            </div>
        `;
        appWindow.appendChild(proUI);
        
        przelicznikApp.renderTab(przelicznikApp.currentCategory);
    },

    togglePin: () => {
        przelicznikApp.isPinned = !przelicznikApp.isPinned;
        const win = document.getElementById('app-przelicznik');
        const btn = document.getElementById('prz-pin-btn');
        if(przelicznikApp.isPinned) {
            win.style.setProperty('z-index', '9999999', 'important');
            btn.classList.add('text-red-500');
            btn.classList.remove('g-text-muted');
            if(typeof apps !== 'undefined') apps.showToast('Przelicznik', 'Zawsze na wierzchu aktywne!', 'success');
        } else {
            win.style.removeProperty('z-index');
            btn.classList.remove('text-red-500');
            btn.classList.add('g-text-muted');
            if(typeof winManager !== 'undefined') winManager.bringToFront(win);
            if(typeof apps !== 'undefined') apps.showToast('Przelicznik', 'Okno odpięte.', 'info');
        }
    },

    switchCategory: (catId) => {
        przelicznikApp.currentCategory = catId;
        
        document.querySelectorAll('.przelicznik-tab').forEach(btn => {
            btn.classList.remove('bg-blue-500', 'text-white', 'dark:bg-blue-600');
            btn.classList.add('g-text-muted');
        });
        const activeBtn = document.getElementById('prz-tab-' + catId);
        if (activeBtn) {
            activeBtn.classList.remove('g-text-muted');
            activeBtn.classList.add('bg-blue-500', 'text-white', 'dark:bg-blue-600');
        }

        przelicznikApp.renderTab(catId);
    },

    // ==================================================================
    // RENDEROWANIE GŁÓWNE
    // ==================================================================
    renderTab: (catId) => {
        const content = document.getElementById('przelicznik-content');
        if (!content) return;

        const catData = przelicznikApp.conversionData[catId];
        if (!catData) return;

        if (catData.type === 'module') {
            if (catId === 'matrix') przelicznikApp.renderMatrixTab(content);
            else if (catId === 'date') przelicznikApp.renderDateTab(content);
            else if (catId === 'timeMath') przelicznikApp.renderTimeMathTab(content);
            else if (catId === 'history') przelicznikApp.renderHistoryTab(content);
            return;
        }

        // Renderowanie standardowych przeliczników
        let optionsHTML = '';
        let unitsList = catData.custom ? catData.units : Object.keys(catData.units);
        unitsList.forEach(u => optionsHTML += `<option value="${u}">${u}</option>`);

        const html = `
            <div class="w-full max-w-sm flex flex-col gap-5 mx-auto mt-4">
                <div class="text-center mb-2">
                    <div class="text-4xl mb-2 drop-shadow-lg">${catData.icon}</div>
                    <h3 class="text-xl font-bold g-accent uppercase tracking-widest">${catData.name}</h3>
                </div>

                <div class="flex justify-center mb-2">
                    <label class="flex items-center gap-2 text-xs font-bold g-text-muted cursor-pointer hover:text-white transition">
                        <input type="checkbox" id="prz-bigint-mode" class="accent-blue-500" onchange="przelicznikApp.calculate('from')">
                        Użyj wysokiej precyzji finansowej (BigInt)
                    </label>
                </div>

                <!-- Moduł Wejścia -->
                <div class="flex flex-col g-panel p-4 rounded-xl border g-border shadow-inner">
                    <label class="block text-[10px] g-text-muted mb-2 font-bold uppercase tracking-wider">Wartość Wejściowa</label>
                    <div class="flex gap-2">
                        <input type="number" id="prz-input-from" class="flex-grow p-3 text-lg font-mono g-bg g-text border g-border rounded outline-none focus:border-blue-500 transition-colors" placeholder="0" value="1" oninput="przelicznikApp.calculate('from')">
                        <select id="prz-unit-from" class="w-24 p-2 font-bold g-bg g-text border g-border rounded outline-none cursor-pointer" onchange="przelicznikApp.calculate('from')">
                            ${optionsHTML}
                        </select>
                    </div>
                </div>

                <!-- Przycisk Zamiany (Swap) -->
                <div class="flex justify-center -my-4 z-10 relative">
                    <button onclick="przelicznikApp.swapUnits()" class="w-10 h-10 rounded-full g-btn bg-white dark:bg-gray-800 flex items-center justify-center text-lg shadow-lg border-2 hover:rotate-180 transform transition-transform duration-300">⇅</button>
                </div>

                <!-- Moduł Wyjścia -->
                <div class="flex flex-col g-panel p-4 rounded-xl border g-border shadow-inner bg-blue-500/10 border-blue-500/30">
                    <label class="block text-[10px] g-text-muted mb-2 font-bold uppercase tracking-wider">Wynik Przeliczenia</label>
                    <div class="flex gap-2">
                        <input type="text" id="prz-input-to" class="flex-grow p-3 text-lg font-mono g-bg g-text border border-blue-500/50 rounded outline-none focus:border-blue-500 transition-colors bg-black/20" placeholder="0" readonly>
                        <select id="prz-unit-to" class="w-24 p-2 font-bold g-bg g-text border border-blue-500/50 rounded outline-none cursor-pointer" onchange="przelicznikApp.calculate('from')">
                            ${optionsHTML}
                        </select>
                    </div>
                </div>
            </div>
        `;

        content.innerHTML = html;
        const selectTo = document.getElementById('prz-unit-to');
        if (selectTo.options.length > 1) selectTo.selectedIndex = 1;
        przelicznikApp.calculate('from');
    },

    // ==================================================================
    // RENDERERY MODUŁÓW SPECJALNYCH (Macierze, Daty, Czas, Historia)
    // ==================================================================
    
    // --- MACIERZE ---
    setMatrixSize: (size) => { przelicznikApp.matrixSize = size; przelicznikApp.renderTab('matrix'); },
    renderMatrixTab: (content) => {
        let size = przelicznikApp.matrixSize;
        
        let gridHtmlA = '', gridHtmlB = '';
        for(let r=0; r<size; r++) {
            for(let c=0; c<size; c++) {
                gridHtmlA += `<input type="number" id="m-a-${r}-${c}" class="w-12 h-12 text-center p-1 font-mono text-sm g-bg g-text border g-border rounded outline-none focus:border-blue-500" value="0">`;
                gridHtmlB += `<input type="number" id="m-b-${r}-${c}" class="w-12 h-12 text-center p-1 font-mono text-sm g-bg g-text border g-border rounded outline-none focus:border-blue-500" value="0">`;
            }
        }

        content.innerHTML = `
            <div class="w-full flex flex-col items-center">
                <h3 class="text-xl font-bold g-accent uppercase tracking-widest text-center mb-4"><span class="text-3xl mr-2">🔢</span> Operacje na Macierzach</h3>
                
                <div class="flex gap-2 justify-center mb-6">
                    <button class="g-btn px-4 py-1.5 rounded-lg shadow font-bold ${size===2?'bg-blue-500/20 border-blue-500':''}" onclick="przelicznikApp.setMatrixSize(2)">2x2</button>
                    <button class="g-btn px-4 py-1.5 rounded-lg shadow font-bold ${size===3?'bg-blue-500/20 border-blue-500':''}" onclick="przelicznikApp.setMatrixSize(3)">3x3</button>
                    <button class="g-btn px-4 py-1.5 rounded-lg shadow font-bold ${size===4?'bg-blue-500/20 border-blue-500':''}" onclick="przelicznikApp.setMatrixSize(4)">4x4</button>
                </div>
                
                <div class="flex flex-col sm:flex-row gap-6 w-full justify-center items-center">
                    <div class="flex flex-col items-center">
                        <div class="text-xs font-bold g-text-muted mb-2">Macierz A</div>
                        <div class="grid gap-1 p-2 g-panel rounded-xl shadow-inner border g-border" style="grid-template-columns: repeat(${size}, minmax(0, 1fr));">${gridHtmlA}</div>
                    </div>
                    
                    <div class="grid grid-cols-2 sm:flex sm:flex-col items-center justify-center gap-2 mt-4 sm:mt-8 shrink-0">
                        <button class="g-btn w-full sm:w-14 h-10 rounded font-bold shadow-md bg-white/5 hover:bg-blue-500/20" onclick="przelicznikApp.calcMatrix('+')">A + B</button>
                        <button class="g-btn w-full sm:w-14 h-10 rounded font-bold shadow-md bg-white/5 hover:bg-blue-500/20" onclick="przelicznikApp.calcMatrix('*')">A × B</button>
                        <button class="g-btn w-full sm:w-14 h-10 rounded text-xs font-bold shadow-md bg-white/5 hover:bg-emerald-500/20" onclick="przelicznikApp.calcMatrix('det')">det(A)</button>
                        <button class="g-btn w-full sm:w-14 h-10 rounded text-xs font-bold shadow-md bg-white/5 hover:bg-emerald-500/20" onclick="przelicznikApp.calcMatrix('inv')">A⁻¹</button>
                    </div>
                    
                    <div class="flex flex-col items-center">
                        <div class="text-xs font-bold g-text-muted mb-2">Macierz B</div>
                        <div class="grid gap-1 p-2 g-panel rounded-xl shadow-inner border g-border" style="grid-template-columns: repeat(${size}, minmax(0, 1fr));">${gridHtmlB}</div>
                    </div>
                </div>
                
                <div class="mt-8 p-4 g-panel border g-border rounded-lg text-center shadow-inner w-full max-w-lg mx-auto bg-black/30">
                    <span class="text-[10px] g-text-muted block mb-2 font-bold uppercase tracking-widest">Wynik (C)</span>
                    <div id="matrix-result" class="font-mono text-base font-bold g-text flex justify-center break-all">---</div>
                </div>
            </div>
        `;
    },

    // --- DATY ---
    renderDateTab: (content) => {
        let today = new Date().toISOString().split('T')[0];
        content.innerHTML = `
            <div class="w-full max-w-sm flex flex-col gap-6 mx-auto mt-4">
                <div class="text-center mb-2">
                    <div class="text-5xl mb-2 drop-shadow-lg">📅</div>
                    <h3 class="text-2xl font-bold g-accent uppercase tracking-widest">Kalkulator Dat</h3>
                </div>
                
                <div class="flex flex-col gap-4 g-panel p-5 rounded-xl border g-border shadow-inner">
                    <div>
                        <label class="block text-xs g-text-muted mb-1 font-bold uppercase tracking-wider">Data początkowa</label>
                        <input type="date" id="prz-date-1" value="${today}" class="w-full p-3 font-mono g-bg g-text border g-border rounded outline-none focus:border-blue-500 cursor-pointer">
                    </div>
                    <div>
                        <label class="block text-xs g-text-muted mb-1 font-bold uppercase tracking-wider">Data końcowa</label>
                        <input type="date" id="prz-date-2" value="${today}" class="w-full p-3 font-mono g-bg g-text border g-border rounded outline-none focus:border-blue-500 cursor-pointer">
                    </div>
                    <button onclick="przelicznikApp.calcDate()" class="w-full py-3 rounded-lg font-bold shadow-lg mt-2 text-white bg-blue-600 hover:bg-blue-500 transition border border-blue-700">Oblicz Różnicę</button>
                </div>

                <div class="p-4 g-panel border g-border rounded-lg text-center shadow-inner bg-black/20" id="prz-date-res">
                    <span class="text-xs g-text-muted">Kliknij Oblicz, aby zobaczyć wynik</span>
                </div>
            </div>
        `;
    },

    // --- CZAS ---
    renderTimeMathTab: (content) => {
        content.innerHTML = `
            <div class="w-full max-w-sm flex flex-col gap-6 mx-auto mt-4">
                <div class="text-center mb-2">
                    <div class="text-5xl mb-2 drop-shadow-lg">⏱️</div>
                    <h3 class="text-2xl font-bold g-accent uppercase tracking-widest">Działania na czasie</h3>
                </div>
                
                <div class="flex flex-col gap-4 g-panel p-5 rounded-xl border g-border shadow-inner">
                    <div class="flex items-center gap-3">
                        <div class="flex-1">
                            <label class="block text-[10px] g-text-muted mb-1 font-bold uppercase tracking-wider">Czas 1 (HH:MM)</label>
                            <input type="time" id="prz-time-1" value="12:30" class="w-full p-3 text-lg font-mono g-bg g-text border g-border rounded outline-none focus:border-blue-500 cursor-pointer text-center">
                        </div>
                        <div class="shrink-0 mt-4">
                            <select id="prz-time-op" class="p-3 text-xl font-bold g-bg g-accent border g-border rounded outline-none cursor-pointer text-center appearance-none">
                                <option value="+">➕</option>
                                <option value="-">➖</option>
                            </select>
                        </div>
                        <div class="flex-1">
                            <label class="block text-[10px] g-text-muted mb-1 font-bold uppercase tracking-wider">Czas 2 (HH:MM)</label>
                            <input type="time" id="prz-time-2" value="02:15" class="w-full p-3 text-lg font-mono g-bg g-text border g-border rounded outline-none focus:border-blue-500 cursor-pointer text-center">
                        </div>
                    </div>
                    <button onclick="przelicznikApp.calcTimeMath()" class="w-full py-3 rounded-lg font-bold shadow-lg mt-2 text-white bg-blue-600 hover:bg-blue-500 transition border border-blue-700">Wykonaj Działanie</button>
                </div>

                <div class="p-4 g-panel border border-blue-500/30 rounded-lg text-center shadow-inner bg-blue-500/10">
                    <span class="text-xs g-text-muted block mb-1 uppercase tracking-widest font-bold">Wynikowy Czas</span>
                    <span class="text-4xl font-bold g-text font-mono tracking-tight" id="prz-time-res">--:--</span>
                </div>
            </div>
        `;
    },

    // --- HISTORIA ---
    renderHistoryTab: (content) => {
        content.innerHTML = `
            <div class="w-full flex flex-col items-center mt-2 h-full">
                <div class="text-center mb-4 shrink-0">
                    <div class="text-4xl mb-2 drop-shadow-lg">📜</div>
                    <h3 class="text-xl font-bold g-accent uppercase tracking-widest">Historia Operacji</h3>
                </div>
                
                <div class="flex gap-2 justify-center mb-4 shrink-0 flex-wrap w-full max-w-md">
                    <button class="g-btn px-4 py-1.5 rounded-lg shadow-md font-bold text-xs" onclick="przelicznikApp.exportHistory('txt')">TXT</button>
                    <button class="g-btn px-4 py-1.5 rounded-lg shadow-md font-bold text-xs" onclick="przelicznikApp.exportHistory('csv')">CSV</button>
                    <button class="g-btn px-4 py-1.5 rounded-lg shadow-md font-bold text-xs" onclick="przelicznikApp.exportHistory('pdf')">Wydruk / PDF</button>
                    <div class="w-px h-6 bg-gray-600 mx-2 self-center"></div>
                    <button class="g-btn px-4 py-1.5 rounded-lg shadow-md font-bold text-xs border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white" onclick="przelicznikApp.clearHistory()">Wyczyść</button>
                </div>
                
                <div id="prz-history-list" class="w-full max-w-lg g-panel border g-border rounded-xl p-2 flex-grow overflow-y-auto custom-scrollbar shadow-inner bg-black/40">
                    <!-- Lista ładowana niżej -->
                </div>
            </div>
        `;
        
        const list = document.getElementById('prz-history-list');
        if (przelicznikApp.history.length === 0) {
            list.innerHTML = '<div class="text-center g-text-muted mt-10 text-sm">Historia jest pusta.</div>';
        } else {
            przelicznikApp.history.forEach((h, i) => {
                const el = document.createElement('div');
                el.className = 'p-3 mb-2 g-bg border g-border rounded-lg shadow-sm transition hover:bg-white/5';
                el.innerHTML = `
                    <div class="flex justify-between items-start mb-1">
                        <span class="text-[10px] g-text-muted uppercase font-bold tracking-wider">${h.type}</span>
                        <span class="text-[10px] g-text-muted">${h.date}</span>
                    </div>
                    <div class="text-xs g-text-muted font-mono mb-1 truncate">${h.op}</div>
                    <div class="text-sm font-bold g-accent font-mono truncate">${h.res}</div>
                `;
                list.appendChild(el);
            });
        }
    },

    // ==================================================================
    // LOGIKA PAMIĘCI
    // ==================================================================
    updateMemUI: () => {
        const el = document.getElementById('prz-mem-val');
        if (el) el.innerText = 'M: ' + (przelicznikApp.memoryValue || '0');
    },
    memClear: () => { przelicznikApp.memoryValue = 0; przelicznikApp.updateMemUI(); if(typeof apps !== 'undefined') apps.showToast('Pamięć', 'Wyczyszczono pamięć', 'info'); },
    memStore: () => { przelicznikApp.memoryValue = przelicznikApp.lastScalarResult; przelicznikApp.updateMemUI(); if(typeof apps !== 'undefined') apps.showToast('Pamięć', 'Zapisano w pamięci', 'success'); },
    memAdd: () => { przelicznikApp.memoryValue += parseFloat(przelicznikApp.lastScalarResult) || 0; przelicznikApp.updateMemUI(); },
    memSub: () => { przelicznikApp.memoryValue -= parseFloat(przelicznikApp.lastScalarResult) || 0; przelicznikApp.updateMemUI(); },
    memRecall: () => {
        const input = document.getElementById('prz-input-from');
        if (input) {
            input.value = przelicznikApp.memoryValue;
            przelicznikApp.calculate('from');
            if(typeof apps !== 'undefined') apps.showToast('Pamięć', 'Przywrócono wartość z pamięci', 'info');
        }
    },

    // ==================================================================
    // LOGIKA OBLICZENIOWA - STANDARDOWA (Jednostki)
    // ==================================================================
    swapUnits: () => {
        const uFrom = document.getElementById('prz-unit-from');
        const uTo = document.getElementById('prz-unit-to');
        const valFrom = document.getElementById('prz-input-from');
        const valTo = document.getElementById('prz-input-to');
        if(!uFrom || !uTo) return;

        const tempIndex = uFrom.selectedIndex;
        uFrom.selectedIndex = uTo.selectedIndex;
        uTo.selectedIndex = tempIndex;

        const tempVal = valFrom.value;
        valFrom.value = valTo.value;
        valTo.value = tempVal;

        przelicznikApp.calculate('from');
    },

    calculate: (source) => {
        const catData = przelicznikApp.conversionData[przelicznikApp.currentCategory];
        
        const elFrom = document.getElementById('prz-input-from');
        const elTo = document.getElementById('prz-input-to');
        if(!elFrom || !elTo) return;
        
        const uIn = document.getElementById('prz-unit-from').value;
        const uOut = document.getElementById('prz-unit-to').value;
        
        const isBigInt = document.getElementById('prz-bigint-mode') && document.getElementById('prz-bigint-mode').checked;

        let inEl = source === 'from' ? elFrom : elTo;
        let outEl = source === 'from' ? elTo : elFrom;
        
        let result = 0;
        let originalVal = inEl.value;

        // HIGH PRECISION (BigInt) Mode dla programistów i finansistów
        if (isBigInt) {
            try {
                // Bezpieczne pobranie samych cyfr do BigInt
                let cleanVal = originalVal.replace(/[^0-9-]/g, '');
                if (cleanVal === '' || cleanVal === '-') throw new Error("Empty");
                
                let bigVal = BigInt(cleanVal);
                let inMult = Math.round(catData.units[uIn] * 1000000000); // Mnożnik ułamków by zapobiec floatowaniu w BigInt
                let outMult = Math.round(catData.units[uOut] * 1000000000);
                
                let bigRes = (bigVal * BigInt(inMult)) / BigInt(outMult);
                outEl.value = bigRes.toString();
                przelicznikApp.lastScalarResult = Number(bigRes);
                przelicznikApp.addToHistory(`Konwersja: ${originalVal} ${uIn} ➔ ${uOut} [BigInt]`, outEl.value);
                return;
            } catch(e) {
                outEl.value = 'Błąd precyzji BigInt (Tylko liczby całkowite)';
                return;
            }
        }

        const val = parseFloat(originalVal);
        if (isNaN(val)) {
            outEl.value = '';
            return;
        }

        if (catData.custom) {
            if (uIn === uOut) { result = val; } 
            else if (uIn === '°C' && uOut === '°F') { result = (val * 9/5) + 32; } 
            else if (uIn === '°C' && uOut === 'K') { result = val + 273.15; } 
            else if (uIn === '°F' && uOut === '°C') { result = (val - 32) * 5/9; } 
            else if (uIn === '°F' && uOut === 'K') { result = (val - 32) * 5/9 + 273.15; } 
            else if (uIn === 'K' && uOut === '°C') { result = val - 273.15; } 
            else if (uIn === 'K' && uOut === '°F') { result = (val - 273.15) * 9/5 + 32; }
        } else {
            const baseValue = val * catData.units[uIn];
            result = baseValue / catData.units[uOut];
        }

        // Formatowanie wyniku
        let formattedRes = parseFloat(result.toPrecision(10));
        outEl.value = formattedRes;
        
        przelicznikApp.lastScalarResult = formattedRes;
        
        // Nie chcemy spamować historii przy każdym wpisaniu literki (oninput), 
        // ale na cele testowe zapiszemy ją po debouncingu lub ręcznym wywołaniu
        // Dodajmy wpis do historii tylko jeśli zrobiono Swap albo przy opuszczaniu (onblur)
        // W tym wypadku zignorujemy oninput w historii, dodajemy tylko na wyraźne żądanie w innych oknach
    },

    // ==================================================================
    // LOGIKA OBLICZENIOWA - INŻYNIERIA (Macierze, Daty, Czas)
    // ==================================================================
    
    getMatrix: (id) => {
        let M = [];
        let sz = przelicznikApp.matrixSize;
        for(let r=0; r<sz; r++) {
            M[r] = [];
            for(let c=0; c<sz; c++) {
                let v = parseFloat(document.getElementById(`m-${id}-${r}-${c}`).value);
                M[r][c] = isNaN(v) ? 0 : v;
            }
        }
        return M;
    },
    
    formatMatrix: (M) => {
        if(!Array.isArray(M)) return M;
        return '<table class="mx-auto" style="border-spacing: 5px; border-collapse: separate;">' + 
               M.map(r => `<tr>${r.map(v => `<td class="bg-black/40 px-3 py-1 rounded text-center min-w-[40px]">${parseFloat(v.toFixed(3))}</td>`).join('')}</tr>`).join('') + 
               '</table>';
    },

    matrixDet: (M) => {
        if (M.length === 2) return M[0][0]*M[1][1] - M[0][1]*M[1][0];
        if (M.length === 3) return M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1]) - M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0]) + M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]);
        // 4x4 determinant za pomocą metody Laplace'a
        let det = 0;
        for(let i=0; i<4; i++) {
            let sub = M.slice(1).map(row => row.filter((_, j) => j !== i));
            det += M[0][i] * przelicznikApp.matrixDet(sub) * (i % 2 === 0 ? 1 : -1);
        }
        return det;
    },

    calcMatrix: (op) => {
        let A = przelicznikApp.getMatrix('a');
        let resEl = document.getElementById('matrix-result');
        let result = null;
        let opDesc = '';

        if (op === '+') {
            let B = przelicznikApp.getMatrix('b');
            result = A.map((r, i) => r.map((v, j) => v + B[i][j]));
            opDesc = `Dodawanie Macierzy ${przelicznikApp.matrixSize}x${przelicznikApp.matrixSize}`;
        } else if (op === '*') {
            let B = przelicznikApp.getMatrix('b');
            result = A.map((r, i) => B[0].map((_, j) => r.reduce((sum, v, k) => sum + v * B[k][j], 0)));
            opDesc = `Mnożenie Macierzy ${przelicznikApp.matrixSize}x${przelicznikApp.matrixSize}`;
        } else if (op === 'det') {
            result = przelicznikApp.matrixDet(A);
            przelicznikApp.lastScalarResult = result;
            opDesc = `Wyznacznik det(A) [${przelicznikApp.matrixSize}x${przelicznikApp.matrixSize}]`;
        } else if (op === 'inv') {
            let det = przelicznikApp.matrixDet(A);
            if (det === 0) { result = "Macierz osobliwa (Brak odwrotności!)"; }
            else {
                // Algorytm macierzy dołączonej
                let inv = [];
                for(let i=0; i<A.length; i++) {
                    inv[i] = [];
                    for(let j=0; j<A.length; j++) {
                        let sub = A.filter((_, rIdx) => rIdx !== j).map(row => row.filter((_, cIdx) => cIdx !== i));
                        inv[i][j] = (przelicznikApp.matrixDet(sub) * ((i+j) % 2 === 0 ? 1 : -1)) / det;
                    }
                }
                result = inv;
            }
            opDesc = `Odwrotność Macierzy A⁻¹`;
        }

        if (Array.isArray(result)) resEl.innerHTML = przelicznikApp.formatMatrix(result);
        else resEl.innerText = parseFloat(result.toFixed(5));

        przelicznikApp.addToHistory(opDesc, Array.isArray(result) ? '(Wynik w macierzy)' : result);
        if(typeof apps !== 'undefined') apps.showToast('Macierze', 'Obliczono poprawnie!', 'success');
    },

    calcDate: () => {
        let d1 = new Date(document.getElementById('prz-date-1').value);
        let d2 = new Date(document.getElementById('prz-date-2').value);
        if(isNaN(d1) || isNaN(d2)) return;

        let diffMs = Math.abs(d2 - d1);
        let days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        let weeks = (days / 7).toFixed(1);
        let months = (days / 30.436875).toFixed(1);
        let years = (days / 365.25).toFixed(2);

        let outHtml = `<div class="grid grid-cols-2 gap-4">
            <div class="g-bg border g-border p-2 rounded">Dni:<br><b class="text-xl g-accent">${days}</b></div>
            <div class="g-bg border g-border p-2 rounded">Tygodnie:<br><b class="text-xl g-accent">${weeks}</b></div>
            <div class="g-bg border g-border p-2 rounded">Miesiące:<br><b class="text-xl g-accent">${months}</b></div>
            <div class="g-bg border g-border p-2 rounded">Lata:<br><b class="text-xl g-accent">${years}</b></div>
        </div>`;
        document.getElementById('prz-date-res').innerHTML = outHtml;
        
        przelicznikApp.lastScalarResult = days;
        przelicznikApp.addToHistory(`Data różnica: ${d1.toLocaleDateString()} - ${d2.toLocaleDateString()}`, `${days} dni`);
        if(typeof apps !== 'undefined') apps.showToast('Kalkulator dat', 'Obliczono!', 'success');
    },

    calcTimeMath: () => {
        let t1 = document.getElementById('prz-time-1').value;
        let t2 = document.getElementById('prz-time-2').value;
        let op = document.getElementById('prz-time-op').value;
        if(!t1 || !t2) return;

        let [h1, m1] = t1.split(':').map(Number);
        let [h2, m2] = t2.split(':').map(Number);

        let total1 = h1 * 60 + m1;
        let total2 = h2 * 60 + m2;

        let res = op === '+' ? total1 + total2 : total1 - total2;

        let sign = res < 0 ? '-' : '';
        res = Math.abs(res);
        let h = Math.floor(res / 60);
        let m = res % 60;
        
        let out = `${sign}${h}:${m.toString().padStart(2, '0')}`;
        document.getElementById('prz-time-res').innerText = out;
        
        przelicznikApp.lastScalarResult = res; // Zapamiętuje w minutach
        przelicznikApp.addToHistory(`Czas: ${t1} ${op} ${t2}`, out);
        if(typeof apps !== 'undefined') apps.showToast('Kalkulator czasu', 'Przeliczono czas!', 'success');
    },

    // ==================================================================
    // HISTORIA I EKSPORT (ZAPIS W BIGOS LUB NA PC)
    // ==================================================================
    addToHistory: (operation, result) => {
        let now = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        przelicznikApp.history.unshift({ type: przelicznikApp.conversionData[przelicznikApp.currentCategory]?.name || 'N/A', op: operation, res: result, date: now });
        if (przelicznikApp.history.length > 50) przelicznikApp.history.pop();
        localStorage.setItem('bigos_przelicznik_history', JSON.stringify(przelicznikApp.history));
        
        if (przelicznikApp.currentCategory === 'history') {
            przelicznikApp.renderTab('history');
        }
    },

    clearHistory: () => {
        przelicznikApp.history = [];
        localStorage.removeItem('bigos_przelicznik_history');
        przelicznikApp.renderTab('history');
        if(typeof apps !== 'undefined') apps.showToast('Historia', 'Pamięć podręczna wyczyszczona', 'info');
    },

    exportHistory: (type) => {
        if(przelicznikApp.history.length === 0) return typeof apps !== 'undefined' ? apps.showToast('Eksport', 'Brak danych do eksportu', 'error') : null;

        let content = '';
        if(type === 'txt' || type === 'csv') {
            content = type === 'csv' ? "Czas,Kategoria,Operacja,Wynik\n" : "=== BIGOS PRZELICZNIK INŻYNIERYJNY: HISTORIA OPERACJI ===\n\n";
            przelicznikApp.history.forEach(h => {
                if(type === 'csv') content += `"${h.date}","${h.type}","${h.op}","${h.res}"\n`;
                else content += `[${h.date}] | Kategoria: ${h.type}\nOperacja: ${h.op}\nWynik: ${h.res}\n\n`;
            });
            
            // Pytanie, czy zapisać w BigOS czy na fizycznym PC
            const saveToBigOS = confirm(`Czy zapisać plik .${type} bezpośrednio w wirtualnym systemie BigOS (na Pulpicie)?\n\n[OK] - Zapisz w BigOS\n[Anuluj] - Pobierz na swój prawdziwy komputer`);
            
            if (saveToBigOS) {
                let fileName = prompt("Podaj nazwę pliku:", `historia_obliczen.${type}`);
                if (!fileName) return;
                if (!fileName.endsWith(`.${type}`)) fileName += `.${type}`;
                
                if (typeof fileSystem !== 'undefined' && typeof fsManager !== 'undefined') {
                    fileSystem.push({
                        id: 'file_' + Date.now(),
                        type: 'file',
                        name: fileName,
                        icon: type === 'csv' ? '📊' : '📄',
                        content: content,
                        parentId: 'root',
                        x: Math.floor(Math.random() * 100) + 20,
                        y: Math.floor(Math.random() * 100) + 20
                    });
                    fsManager.save();
                    if (typeof desktop !== 'undefined') desktop.render();
                    if (typeof apps !== 'undefined') apps.showToast('Sukces', `Zapisano ${fileName} na Pulpicie BigOS!`, 'success');
                } else {
                    if (typeof apps !== 'undefined') apps.showToast('Błąd', 'Brak dostępu do systemu plików BigOS', 'error');
                }
            } else {
                // Pobieranie na fizyczny dysk
                const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `przelicznik_historia.${type}`;
                link.click();
                if(typeof apps !== 'undefined') apps.showToast('Sukces', `Wyeksportowano do pliku .${type.toUpperCase()} na PC`, 'success');
            }
        } 
        else if (type === 'pdf') {
            const printWindow = window.open('', '_blank');
            let html = `
                <html><head><title>Eksport Przelicznika BigOS</title>
                <style>
                    body { font-family: 'Segoe UI', sans-serif; padding: 30px; color: #333; }
                    h1 { border-bottom: 2px solid #ccc; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #aaa; padding: 10px; text-align: left; }
                    th { background-color: #f3f4f6; }
                </style></head><body>
                <h1>Historia Operacji Inżynieryjnych</h1>
                <p>Wygenerowano: ${new Date().toLocaleString()}</p>
                <table>
                <tr><th>Czas</th><th>Kategoria</th><th>Operacja</th><th>Wynik</th></tr>
            `;
            przelicznikApp.history.forEach(h => {
                html += `<tr><td>${h.date}</td><td>${h.type}</td><td>${h.op}</td><td><b>${h.res}</b></td></tr>`;
            });
            html += '</table></body></html>';
            
            const saveToBigOS = confirm(`Czy zapisać ten raport bezpośrednio w wirtualnym systemie BigOS?\n\n[OK] - Zapisz w BigOS (jako plik HTML czytelny dla Skryby)\n[Anuluj] - Wygeneruj PDF do druku/pobrania na komputer`);
            
            if (saveToBigOS) {
                let fileName = prompt("Podaj nazwę pliku z raportem:", `raport_obliczen.html`);
                if (!fileName) {
                    printWindow.close();
                    return;
                }
                if (!fileName.endsWith(`.html`)) fileName += `.html`;
                
                if (typeof fileSystem !== 'undefined' && typeof fsManager !== 'undefined') {
                    fileSystem.push({
                        id: 'file_' + Date.now(),
                        type: 'file',
                        name: fileName,
                        icon: '🌐',
                        content: html,
                        parentId: 'root',
                        x: Math.floor(Math.random() * 100) + 20,
                        y: Math.floor(Math.random() * 100) + 20
                    });
                    fsManager.save();
                    if (typeof desktop !== 'undefined') desktop.render();
                    if (typeof apps !== 'undefined') apps.showToast('Sukces', `Zapisano ${fileName} na Pulpicie BigOS!`, 'success');
                }
                printWindow.close();
            } else {
                printWindow.document.write(html);
                printWindow.document.close();
                setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
            }
        }
    },

    // ==================================================================
    // GLOBALNA OBSŁUGA KLAWIATURY (Escape i Enter)
    // ==================================================================
    handleKeyboard: (e) => {
        const appWin = document.getElementById('app-przelicznik');
        if (appWin && appWin.classList.contains('active') && !appWin.classList.contains('minimized')) {
            // Ignorujemy jeśli kursor jest w polach tekstowych np. nazwa w innej aplikacji
            if (document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement.type === 'text') return;
            
            if (e.key === 'Escape') {
                const el = document.getElementById('prz-input-from');
                if (el) { el.value = ''; przelicznikApp.calculate('from'); }
            }
            if (e.key === 'Enter') {
                if (przelicznikApp.currentCategory === 'matrix') {
                    // Automatyczne podliczenie ostatniego używanego przycisku, np. mnożenia (domyślnie dodawanie)
                    przelicznikApp.calcMatrix('+');
                } else if (przelicznikApp.currentCategory === 'timeMath') {
                    przelicznikApp.calcTimeMath();
                } else if (przelicznikApp.currentCategory === 'date') {
                    przelicznikApp.calcDate();
                } else if (przelicznikApp.currentCategory !== 'history') {
                    przelicznikApp.calculate('from');
                }
            }
        }
    }
};

setTimeout(przelicznikApp.init, 500);