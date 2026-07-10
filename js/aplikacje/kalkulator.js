// ======================================================================
// PLIK: js/aplikacje/kalkulator.js (Rachmistrz PRO - Kalkulator Naukowy)
// ======================================================================

const kalkulatorApp = {
    expr: '',
    history: [],
    isScientific: false,
    isHistoryOpen: false,
    isRad: false, 
    lastResult: '',

    init: () => {
        const savedHistory = localStorage.getItem('bigos_calc_history');
        if (savedHistory) {
            try { kalkulatorApp.history = JSON.parse(savedHistory); } catch(e) { }
        }

        kalkulatorApp.upgradeUI();
        window.addEventListener('keydown', kalkulatorApp.handleKeyboard);
    },

    upgradeUI: () => {
        const appWindow = document.getElementById('app-kalkulator');
        if (!appWindow) { setTimeout(kalkulatorApp.upgradeUI, 500); return; }

        appWindow.style.width = '340px';
        appWindow.style.height = 'auto';
        appWindow.style.transition = 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        appWindow.style.background = 'transparent';
        appWindow.style.border = 'none';
        appWindow.style.boxShadow = 'none';

        const titleBar = appWindow.querySelector('.title-bar');
        Array.from(appWindow.children).forEach(child => { if (child !== titleBar) child.remove(); });

        // Ukrywamy stary pasek, by zrobić nowy tematyczny
        if (titleBar) titleBar.style.display = 'none';

        const proUI = document.createElement('div');
        // Aplikacja korzysta z GLOBALNEJ klasy 'themed-app' z theme.js
        proUI.className = 'flex flex-row overflow-hidden relative themed-app g-panel rounded-lg shadow-2xl';
        
        // Dynamiczne pobieranie listy motywów do wklejenia w panel historii
        const themeSelector = typeof themeManager !== 'undefined' ? themeManager.getSelectorHTML('g-bg g-text text-[10px] px-2 py-1 border g-border rounded outline-none cursor-pointer w-full mb-2') : '';

        proUI.innerHTML = `
            <!-- PANEL NAUKOWY (Wysuwany z lewej) -->
            <div id="calc-sci-panel" class="w-0 overflow-hidden flex flex-col transition-all duration-300 border-r g-border bg-black/20">
                <div class="p-4 grid grid-cols-4 gap-2 text-[11px] font-bold h-full min-w-[280px]">
                    <button onclick="kalkulatorApp.toggleRad()" id="calc-btn-rad" class="col-span-2 g-btn rounded shadow-sm transition">DEG</button>
                    <button onclick="kalkulatorApp.append('2^( ')" class="g-btn rounded shadow-sm transition">2ˣ</button>
                    <button onclick="kalkulatorApp.append('10^( ')" class="g-btn rounded shadow-sm transition">10ˣ</button>

                    <button onclick="kalkulatorApp.append('sin( ')" class="g-btn rounded shadow-sm transition">sin</button>
                    <button onclick="kalkulatorApp.append('cos( ')" class="g-btn rounded shadow-sm transition">cos</button>
                    <button onclick="kalkulatorApp.append('tan( ')" class="g-btn rounded shadow-sm transition">tan</button>
                    <button onclick="kalkulatorApp.append('1/ ')" class="g-btn rounded shadow-sm transition">1/x</button>

                    <button onclick="kalkulatorApp.append('asin( ')" class="g-btn rounded shadow-sm transition">sin⁻¹</button>
                    <button onclick="kalkulatorApp.append('acos( ')" class="g-btn rounded shadow-sm transition">cos⁻¹</button>
                    <button onclick="kalkulatorApp.append('atan( ')" class="g-btn rounded shadow-sm transition">tan⁻¹</button>
                    <button onclick="kalkulatorApp.append('^2 ')" class="g-btn rounded shadow-sm transition">x²</button>

                    <button onclick="kalkulatorApp.append('sinh( ')" class="g-btn rounded shadow-sm transition">sinh</button>
                    <button onclick="kalkulatorApp.append('cosh( ')" class="g-btn rounded shadow-sm transition">cosh</button>
                    <button onclick="kalkulatorApp.append('tanh( ')" class="g-btn rounded shadow-sm transition">tanh</button>
                    <button onclick="kalkulatorApp.append('^3 ')" class="g-btn rounded shadow-sm transition">x³</button>

                    <button onclick="kalkulatorApp.append('ln( ')" class="g-btn rounded shadow-sm transition">ln</button>
                    <button onclick="kalkulatorApp.append('log( ')" class="g-btn rounded shadow-sm transition">log</button>
                    <button onclick="kalkulatorApp.append('exp( ')" class="g-btn rounded shadow-sm transition">exp</button>
                    <button onclick="kalkulatorApp.append('^ ')" class="g-btn rounded shadow-sm transition">xʸ</button>

                    <button onclick="kalkulatorApp.append('π')" class="g-btn g-accent rounded shadow-sm transition text-sm">π</button>
                    <button onclick="kalkulatorApp.append('e')" class="g-btn g-accent rounded shadow-sm transition text-sm">e</button>
                    <button onclick="kalkulatorApp.append('!')" class="g-btn rounded shadow-sm transition">n!</button>
                    <button onclick="kalkulatorApp.append('√ ( ')" class="g-btn rounded shadow-sm transition">√x</button>
                    
                    <button onclick="kalkulatorApp.append('abs( ')" class="g-btn rounded shadow-sm transition">abs</button>
                    <button onclick="kalkulatorApp.append('floor( ')" class="g-btn rounded shadow-sm transition">floor</button>
                    <button onclick="kalkulatorApp.append('ceil( ')" class="g-btn rounded shadow-sm transition">ceil</button>
                    <button onclick="kalkulatorApp.append('³√ ( ')" class="g-btn rounded shadow-sm transition">³√x</button>

                    <button onclick="kalkulatorApp.append(' nPr ')" class="g-btn rounded shadow-sm transition">nPr</button>
                    <button onclick="kalkulatorApp.append(' nCr ')" class="g-btn rounded shadow-sm transition">nCr</button>
                    <button onclick="kalkulatorApp.append(' mod ')" class="g-btn rounded shadow-sm transition">mod</button>
                    <button onclick="kalkulatorApp.append('round( ')" class="g-btn rounded shadow-sm transition">round</button>
                </div>
            </div>

            <!-- PANEL GŁÓWNY (Zawsze widoczny) -->
            <div class="flex flex-col w-[340px] shrink-0">
                <!-- Tematyczny Pasek Tytułowy (Zastępuje domyślny) -->
                <div class="px-4 py-2 border-b g-border flex justify-between items-center cursor-move bg-black/30" onmousedown="winManager.startDrag(event, 'app-kalkulator')" ontouchstart="winManager.startDrag(event, 'app-kalkulator')">
                    <span class="text-sm font-bold g-accent drop-shadow-md">🧮 Rachmistrz PRO</span>
                    <div class="flex gap-2">
                        <button onclick="winManager.minimize('kalkulator')" class="g-icon-btn px-1 hover:text-white transition">_</button>
                        <button onclick="winManager.close('kalkulator')" class="text-red-500 hover:text-red-400 px-1 font-bold transition">✖</button>
                    </div>
                </div>

                <!-- Pasek Narzędzi -->
                <div class="flex justify-between items-center px-4 py-2 border-b g-border bg-black/10">
                    <button onclick="kalkulatorApp.toggleScientific()" class="text-[10px] sm:text-xs font-bold g-icon-btn focus:outline-none" id="calc-toggle-sci">⚗️ Naukowy</button>
                    
                    <!-- Presety Matematyczne i Fizyczne -->
                    <select onchange="kalkulatorApp.applyMathFormula(this.value)" class="text-[10px] sm:text-xs g-bg g-text border g-border rounded px-1 py-1 mx-2 outline-none cursor-pointer flex-1 text-center font-bold">
                        <option value="" disabled selected>📐 Presety / Wzory...</option>
                        <option disabled>--- Stałe Fizyczne ---</option>
                        <option value="math_pi">Liczba Pi (π)</option>
                        <option value="math_e">Liczba Eulera (e)</option>
                        <option value="math_phi">Złoty podział (Phi)</option>
                        <option value="math_c">Prędkość światła (c)</option>
                        <option value="math_g">Stała grawitacji (G)</option>
                        <option disabled>--- Wzory i Funkcje ---</option>
                        <option value="form_circle">Pole koła (π * r²)</option>
                        <option value="form_pyth">Twierdzenie Pitagorasa</option>
                        <option value="form_bmi">Kalkulator BMI</option>
                        <option value="form_speed">Prędkość (v = s/t)</option>
                        <option value="form_temp">Fahrenheit do Celsjusza</option>
                    </select>

                    <button onclick="kalkulatorApp.toggleHistory()" class="text-[10px] sm:text-xs font-bold g-icon-btn focus:outline-none" id="calc-toggle-hist">🕒 Historia</button>
                </div>

                <!-- Wyświetlacz -->
                <div class="p-4 border-b g-border flex flex-col justify-end items-end h-[120px] transition-transform duration-100 bg-black/40" id="calc-display-container">
                    <div id="calc-preview" class="text-sm g-text-muted h-6 truncate w-full text-right font-mono mb-1"></div>
                    <div id="calc-display" class="text-4xl font-mono font-bold g-text truncate w-full text-right tracking-tight transition-transform duration-75 drop-shadow-lg">0</div>
                </div>

                <!-- Klawiatura Podstawowa -->
                <div class="p-4 grid grid-cols-4 gap-2 text-lg bg-black/10">
                    <button onclick="kalkulatorApp.clearEntry()" class="g-btn p-3 rounded-lg font-bold text-red-500 hover:text-red-300 border-red-500/50 shadow-sm">CE</button>
                    <button onclick="kalkulatorApp.clear()" class="bg-red-600 hover:bg-red-500 text-white p-3 rounded-lg font-bold transition shadow-sm border border-red-700">C</button>
                    <button onclick="kalkulatorApp.backspace()" class="g-btn p-3 rounded-lg font-bold shadow-sm text-xl">⌫</button>
                    <button onclick="kalkulatorApp.append(' / ')" class="g-btn g-accent p-3 rounded-lg font-bold shadow-sm text-xl">÷</button>
                    
                    <button onclick="kalkulatorApp.append('7')" class="g-btn p-3 rounded-lg font-bold shadow-sm">7</button>
                    <button onclick="kalkulatorApp.append('8')" class="g-btn p-3 rounded-lg font-bold shadow-sm">8</button>
                    <button onclick="kalkulatorApp.append('9')" class="g-btn p-3 rounded-lg font-bold shadow-sm">9</button>
                    <button onclick="kalkulatorApp.append(' * ')" class="g-btn g-accent p-3 rounded-lg font-bold shadow-sm text-xl">×</button>
                    
                    <button onclick="kalkulatorApp.append('4')" class="g-btn p-3 rounded-lg font-bold shadow-sm">4</button>
                    <button onclick="kalkulatorApp.append('5')" class="g-btn p-3 rounded-lg font-bold shadow-sm">5</button>
                    <button onclick="kalkulatorApp.append('6')" class="g-btn p-3 rounded-lg font-bold shadow-sm">6</button>
                    <button onclick="kalkulatorApp.append(' - ')" class="g-btn g-accent p-3 rounded-lg font-bold shadow-sm text-2xl leading-none">-</button>
                    
                    <button onclick="kalkulatorApp.append('1')" class="g-btn p-3 rounded-lg font-bold shadow-sm">1</button>
                    <button onclick="kalkulatorApp.append('2')" class="g-btn p-3 rounded-lg font-bold shadow-sm">2</button>
                    <button onclick="kalkulatorApp.append('3')" class="g-btn p-3 rounded-lg font-bold shadow-sm">3</button>
                    <button onclick="kalkulatorApp.append(' + ')" class="g-btn g-accent p-3 rounded-lg font-bold shadow-sm text-2xl leading-none">+</button>
                    
                    <button onclick="kalkulatorApp.toggleSign()" class="g-btn p-3 rounded-lg font-bold shadow-sm">±</button>
                    <button onclick="kalkulatorApp.append('0')" class="g-btn p-3 rounded-lg font-bold shadow-sm">0</button>
                    <button onclick="kalkulatorApp.append('.')" class="g-btn p-3 rounded-lg font-bold shadow-sm text-2xl leading-none">.</button>
                    <button onclick="kalkulatorApp.calculate()" class="g-play-btn border g-border p-3 rounded-lg font-bold shadow-md text-2xl leading-none" style="background: var(--panel);">=</button>
                    
                    <button onclick="kalkulatorApp.append(' ( ')" class="g-btn p-2 rounded-lg font-bold shadow-sm col-span-2 text-sm">( Nawias Lewy</button>
                    <button onclick="kalkulatorApp.append(' ) ')" class="g-btn p-2 rounded-lg font-bold shadow-sm col-span-2 text-sm">Nawias Prawy )</button>
                </div>
            </div>

            <!-- PANEL HISTORII (Wysuwany z prawej) -->
            <div id="calc-hist-panel" class="w-0 overflow-hidden flex flex-col transition-all duration-300 border-l g-border bg-black/20">
                <div class="p-4 flex justify-between items-center border-b g-border min-w-[280px]">
                    <h3 class="font-bold text-sm g-text">Historia Obliczeń</h3>
                    <button onclick="kalkulatorApp.clearHistory()" class="text-xs text-red-500 hover:text-red-400 transition font-bold">🗑️ Wyczyść</button>
                </div>
                
                <div class="px-4 py-2 border-b g-border min-w-[280px]">
                    <span class="text-xs font-bold g-text-muted mb-1 block">Zmień Motyw Systemu:</span>
                    ${themeSelector}
                </div>

                <div id="calc-history-list" class="flex-grow overflow-y-auto p-2 custom-scrollbar min-w-[280px]">
                    <!-- Historia generowana przez JS -->
                </div>
            </div>
        `;
        appWindow.appendChild(proUI);
        kalkulatorApp.updateDisplay();
    },

    // ==================================================================
    // PRESETY MATEMATYCZNE I FIZYCZNE
    // ==================================================================
    applyMathFormula: (presetId) => {
        if (!presetId) return;
        
        let formulaStr = '';
        switch(presetId) {
            case 'math_pi': formulaStr = 'π'; break;
            case 'math_e': formulaStr = 'e'; break;
            case 'math_phi': formulaStr = '( 1 + √ ( 5 ) ) / 2'; break;
            case 'math_c': formulaStr = '299792458'; break; // m/s
            case 'math_g': formulaStr = '0.0000000000667430'; break;
            
            case 'form_circle': formulaStr = 'π * ( )^2'; break;
            case 'form_pyth': formulaStr = '√ ( ( )^2 + ( )^2 )'; break;
            case 'form_bmi': formulaStr = '( waga_kg ) / ( wzrost_m )^2'; break;
            case 'form_speed': formulaStr = '( dystans ) / ( czas )'; break;
            case 'form_temp': formulaStr = '( ( temp_F ) - 32 ) * 5 / 9'; break;
        }

        if (formulaStr) {
            kalkulatorApp.expr = formulaStr;
            kalkulatorApp.updateDisplay();
            if (typeof apps !== 'undefined') apps.showToast('Rachmistrz PRO', 'Wprowadzono wzór do edytora', 'info');
        }
        
        document.activeElement.blur();
    },

    // ==================================================================
    // ZARZĄDZANIE WIDOKIEM (Wysuwanie Paneli)
    // ==================================================================
    toggleScientific: () => {
        kalkulatorApp.isScientific = !kalkulatorApp.isScientific;
        const appWindow = document.getElementById('app-kalkulator');
        const sciPanel = document.getElementById('calc-sci-panel');
        const btn = document.getElementById('calc-toggle-sci');
        
        if (kalkulatorApp.isScientific) {
            sciPanel.classList.remove('w-0', 'border-transparent');
            sciPanel.classList.add('w-[280px]');
            btn.classList.add('g-accent'); btn.classList.remove('g-text-muted');
            appWindow.style.width = kalkulatorApp.isHistoryOpen ? '900px' : '620px';
        } else {
            sciPanel.classList.add('w-0', 'border-transparent');
            sciPanel.classList.remove('w-[280px]');
            btn.classList.remove('g-accent'); btn.classList.add('g-text-muted');
            appWindow.style.width = kalkulatorApp.isHistoryOpen ? '620px' : '340px';
        }
    },

    toggleHistory: () => {
        kalkulatorApp.isHistoryOpen = !kalkulatorApp.isHistoryOpen;
        const appWindow = document.getElementById('app-kalkulator');
        const histPanel = document.getElementById('calc-hist-panel');
        const btn = document.getElementById('calc-toggle-hist');
        
        if (kalkulatorApp.isHistoryOpen) {
            histPanel.classList.remove('w-0', 'border-transparent');
            histPanel.classList.add('w-[280px]');
            btn.classList.add('g-accent'); btn.classList.remove('g-text-muted');
            appWindow.style.width = kalkulatorApp.isScientific ? '900px' : '620px';
            kalkulatorApp.renderHistory();
        } else {
            histPanel.classList.add('w-0', 'border-transparent');
            histPanel.classList.remove('w-[280px]');
            btn.classList.remove('g-accent'); btn.classList.add('g-text-muted');
            appWindow.style.width = kalkulatorApp.isScientific ? '620px' : '340px';
        }
    },

    toggleRad: () => {
        kalkulatorApp.isRad = !kalkulatorApp.isRad;
        const btn = document.getElementById('calc-btn-rad');
        if (btn) {
            btn.innerText = kalkulatorApp.isRad ? 'RAD' : 'DEG';
            if (kalkulatorApp.isRad) btn.classList.add('g-accent');
            else btn.classList.remove('g-accent');
        }
    },

    // ==================================================================
    // LOGIKA WPROWADZANIA I KASOWANIA
    // ==================================================================
    append: (val) => {
        if (kalkulatorApp.expr === 'Błąd' || kalkulatorApp.expr === 'Nie dziel przez zero!') kalkulatorApp.expr = '';
        if (kalkulatorApp.lastResult !== '' && /^[0-9\.]$/.test(val.trim())) {
            kalkulatorApp.expr = '';
        }
        kalkulatorApp.lastResult = '';
        kalkulatorApp.expr += val;
        kalkulatorApp.updateDisplay();
    },

    backspace: () => {
        if (kalkulatorApp.expr === 'Błąd') kalkulatorApp.expr = '';
        if (kalkulatorApp.expr.length > 0) {
            if (kalkulatorApp.expr.endsWith(' ')) {
                kalkulatorApp.expr = kalkulatorApp.expr.trimEnd();
                let lastSpace = kalkulatorApp.expr.lastIndexOf(' ');
                if(lastSpace !== -1) kalkulatorApp.expr = kalkulatorApp.expr.substring(0, lastSpace + 1);
                else kalkulatorApp.expr = '';
            } else {
                kalkulatorApp.expr = kalkulatorApp.expr.slice(0, -1);
            }
        }
        kalkulatorApp.updateDisplay();
    },

    clear: () => {
        kalkulatorApp.expr = '';
        kalkulatorApp.lastResult = '';
        kalkulatorApp.updateDisplay();
    },

    clearEntry: () => {
        if (kalkulatorApp.expr.length > 0) {
            const matches = kalkulatorApp.expr.match(/^(.*[\+\-\*\/\(\)\s])([0-9\.]+)$/);
            if (matches) kalkulatorApp.expr = matches[1];
            else kalkulatorApp.expr = '';
        }
        kalkulatorApp.updateDisplay();
    },

    toggleSign: () => {
        if (kalkulatorApp.expr === 'Błąd') kalkulatorApp.expr = '';
        const regex = /(^|[\+\-\*\/\(\)\s])(\-?[0-9\.]+)$/;
        const match = kalkulatorApp.expr.match(regex);
        
        if (match) {
            const num = parseFloat(match[2]);
            const newNum = num * -1;
            kalkulatorApp.expr = kalkulatorApp.expr.substring(0, match.index + match[1].length) + newNum;
        } else {
            if(kalkulatorApp.expr.trim() === '') kalkulatorApp.expr = '-';
        }
        kalkulatorApp.updateDisplay();
    },

    // ==================================================================
    // SILNIK MATEMATYCZNY (EVALUATOR)
    // ==================================================================
    calculate: () => {
        if (!kalkulatorApp.expr || kalkulatorApp.expr.trim() === '') return;
        
        const oryginalneDzialanie = kalkulatorApp.expr;
        let toEval = kalkulatorApp.expr;

        try {
            toEval = toEval.replace(/π/g, 'Math.PI').replace(/e/g, 'Math.E');
            toEval = toEval.replace(/([0-9\.]+)\s*%/g, '($1/100)');
            toEval = toEval.replace(/([0-9\.]+)\s*!/g, 'kalkulatorApp._fact($1)');
            toEval = toEval.replace(/([0-9\.]+)\s*nPr\s*([0-9\.]+)/g, 'kalkulatorApp._nPr($1,$2)');
            toEval = toEval.replace(/([0-9\.]+)\s*nCr\s*([0-9\.]+)/g, 'kalkulatorApp._nCr($1,$2)');
            toEval = toEval.replace(/³√\s*\(/g, 'Math.cbrt(');
            toEval = toEval.replace(/√\s*\(/g, 'Math.sqrt(');
            toEval = toEval.replace(/\^/g, '**'); 
            toEval = toEval.replace(/10\*\*\(/g, 'Math.pow(10,');
            toEval = toEval.replace(/2\*\*\(/g, 'Math.pow(2,');
            toEval = toEval.replace(/ln\(/g, 'Math.log(');
            toEval = toEval.replace(/log\(/g, 'Math.log10(');
            toEval = toEval.replace(/exp\(/g, 'Math.exp(');
            
            toEval = toEval.replace(/asin\(/g, 'kalkulatorApp._asin(');
            toEval = toEval.replace(/acos\(/g, 'kalkulatorApp._acos(');
            toEval = toEval.replace(/atan\(/g, 'kalkulatorApp._atan(');
            toEval = toEval.replace(/sinh\(/g, 'Math.sinh(');
            toEval = toEval.replace(/cosh\(/g, 'Math.cosh(');
            toEval = toEval.replace(/tanh\(/g, 'Math.tanh(');
            toEval = toEval.replace(/sin\(/g, 'kalkulatorApp._sin(');
            toEval = toEval.replace(/cos\(/g, 'kalkulatorApp._cos(');
            toEval = toEval.replace(/tan\(/g, 'kalkulatorApp._tan(');
            
            toEval = toEval.replace(/mod/g, '%');
            toEval = toEval.replace(/abs\(/g, 'Math.abs(');
            toEval = toEval.replace(/floor\(/g, 'Math.floor(');
            toEval = toEval.replace(/ceil\(/g, 'Math.ceil(');
            toEval = toEval.replace(/round\(/g, 'Math.round(');
            
            if (!/^[0-9+\-*/().\s%MathkalkulatorAp_fctPrCsiocenxlgvPIE,]*$/.test(toEval)) {
                throw new Error("Nieprawidłowe znaki w równaniu");
            }

            let result = new Function('return ' + toEval)();
            
            if (result === Infinity || result === -Infinity) {
                kalkulatorApp.expr = "Nie dziel przez zero!";
            } else if (isNaN(result)) {
                throw new Error("NaN");
            } else {
                let finalNum = Math.round(result * 1e12) / 1e12;
                kalkulatorApp.history.unshift({ eq: oryginalneDzialanie.trim(), res: finalNum });
                if (kalkulatorApp.history.length > 30) kalkulatorApp.history.pop();
                localStorage.setItem('bigos_calc_history', JSON.stringify(kalkulatorApp.history));
                
                kalkulatorApp.expr = String(finalNum);
                kalkulatorApp.lastResult = String(finalNum);
                
                if (kalkulatorApp.isHistoryOpen) kalkulatorApp.renderHistory();
            }

        } catch (e) {
            console.warn("Błąd parsowania:", e);
            kalkulatorApp.expr = 'Błąd';
        }
        
        kalkulatorApp.updateDisplay();
    },

    _fact: (n) => {
        let x = Math.round(parseFloat(n));
        if(x < 0) return NaN;
        if(x === 0 || x === 1) return 1;
        let res = 1; for(let i=2; i<=x; i++) res*=i; return res;
    },
    _nPr: (n, r) => { return kalkulatorApp._fact(n) / kalkulatorApp._fact(n-r); },
    _nCr: (n, r) => { return kalkulatorApp._fact(n) / (kalkulatorApp._fact(r) * kalkulatorApp._fact(n-r)); },
    _sin: (x) => Math.sin(kalkulatorApp.isRad ? x : x * Math.PI / 180),
    _cos: (x) => Math.cos(kalkulatorApp.isRad ? x : x * Math.PI / 180),
    _tan: (x) => Math.tan(kalkulatorApp.isRad ? x : x * Math.PI / 180),
    _asin: (x) => (kalkulatorApp.isRad ? Math.asin(x) : Math.asin(x) * 180 / Math.PI),
    _acos: (x) => (kalkulatorApp.isRad ? Math.acos(x) : Math.acos(x) * 180 / Math.PI),
    _atan: (x) => (kalkulatorApp.isRad ? Math.atan(x) : Math.atan(x) * 180 / Math.PI),

    // ==================================================================
    // AKTUALIZACJA UI
    // ==================================================================
    updateDisplay: () => {
        const dsp = document.getElementById('calc-display');
        const prev = document.getElementById('calc-preview');
        
        if (dsp) {
            let showStr = kalkulatorApp.expr || '0';
            showStr = showStr.replace(/\*/g, '×').replace(/\//g, '÷');
            dsp.innerText = showStr;
            
            if (showStr.length > 14) dsp.classList.replace('text-4xl', 'text-2xl');
            else dsp.classList.replace('text-2xl', 'text-4xl');
        }
        
        if (prev && kalkulatorApp.history.length > 0 && kalkulatorApp.expr === '') {
            prev.innerText = `Ostatnie: ${kalkulatorApp.history[0].res}`;
        } else if (prev) {
            prev.innerText = '';
        }
    },

    renderHistory: () => {
        const list = document.getElementById('calc-history-list');
        if (!list) return;
        
        if (kalkulatorApp.history.length === 0) {
            list.innerHTML = '<div class="text-center g-text-muted text-xs mt-6">Brak zapisanych obliczeń.</div>';
            return;
        }

        list.innerHTML = '';
        kalkulatorApp.history.forEach((h, i) => {
            const el = document.createElement('div');
            el.className = 'g-item p-3 mb-2 rounded-lg cursor-pointer transition shadow-sm text-right bg-black/10';
            el.innerHTML = `
                <div class="text-xs g-text-muted font-mono mb-1">${h.eq} =</div>
                <div class="text-lg font-bold g-accent font-mono">${h.res}</div>
            `;
            el.onclick = () => {
                kalkulatorApp.expr = String(h.res);
                kalkulatorApp.lastResult = String(h.res);
                kalkulatorApp.updateDisplay();
            };
            list.appendChild(el);
        });
    },

    clearHistory: () => {
        kalkulatorApp.history = [];
        localStorage.removeItem('bigos_calc_history');
        kalkulatorApp.renderHistory();
        kalkulatorApp.updateDisplay();
        if(typeof apps !== 'undefined') apps.showToast('Historia', 'Wyczyszczono pamięć kalkulatora.', 'info');
    },

    handleKeyboard: (e) => {
        const appWin = document.getElementById('app-kalkulator');
        if (appWin && appWin.classList.contains('active') && !appWin.classList.contains('minimized')) {
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable)) return;
            
            const k = e.key;
            if (/[0-9]/.test(k)) { e.preventDefault(); kalkulatorApp.append(k); }
            else if (k === '.') { e.preventDefault(); kalkulatorApp.append('.'); }
            else if (k === '+') { e.preventDefault(); kalkulatorApp.append(' + '); }
            else if (k === '-') { e.preventDefault(); kalkulatorApp.append(' - '); }
            else if (k === '*') { e.preventDefault(); kalkulatorApp.append(' * '); }
            else if (k === '/') { e.preventDefault(); kalkulatorApp.append(' / '); }
            else if (k === '(') { e.preventDefault(); kalkulatorApp.append(' ( '); }
            else if (k === ')') { e.preventDefault(); kalkulatorApp.append(' ) '); }
            else if (k === 'Enter' || k === '=') { e.preventDefault(); kalkulatorApp.calculate(); }
            else if (k === 'Backspace') { e.preventDefault(); kalkulatorApp.backspace(); }
            else if (k === 'Escape') { e.preventDefault(); kalkulatorApp.clear(); }
            else if (k === 'Delete') { e.preventDefault(); kalkulatorApp.clearEntry(); }
        }
    }
};

setTimeout(kalkulatorApp.init, 500);