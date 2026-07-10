// ======================================================================
// PLIK: js/aplikacje/rachmistrz_kodu.js (Rachmistrz Kodu - Programista)
// ======================================================================

const rachmistrzKoduApp = {
    expr: '',
    history: [],
    isHistoryOpen: false,
    progBase: 10,     
    progBits: 64,     
    progSigned: true, 
    lastBigInt: 0n,
    lastResult: '',

    init: () => {
        const savedHistory = localStorage.getItem('bigos_rkodu_history');
        if (savedHistory) {
            try { rachmistrzKoduApp.history = JSON.parse(savedHistory); } catch(e) { }
        }

        rachmistrzKoduApp.upgradeUI();
        rachmistrzKoduApp.updateKeyboardState();
        window.addEventListener('keydown', rachmistrzKoduApp.handleKeyboard);
    },

    upgradeUI: () => {
        const appWindow = document.getElementById('app-rachmistrz-kodu');
        if (!appWindow) { setTimeout(rachmistrzKoduApp.upgradeUI, 500); return; }

        appWindow.style.width = '380px';
        appWindow.style.height = 'auto';
        appWindow.style.transition = 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        appWindow.style.background = 'transparent';
        appWindow.style.border = 'none';
        appWindow.style.boxShadow = 'none';

        const titleBar = appWindow.querySelector('.title-bar');
        Array.from(appWindow.children).forEach(child => { if (child !== titleBar) child.remove(); });
        if (titleBar) titleBar.style.display = 'none';

        const proUI = document.createElement('div');
        proUI.className = 'flex flex-row overflow-hidden relative themed-app g-panel rounded-lg shadow-2xl';
        
        proUI.innerHTML = `
            <!-- PANEL GŁÓWNY (Zawsze widoczny) -->
            <div class="flex flex-col w-[380px] shrink-0">
                <!-- Tematyczny Pasek Tytułowy -->
                <div class="px-4 py-2 border-b g-border flex justify-between items-center cursor-move bg-black/30" onmousedown="winManager.startDrag(event, 'app-rachmistrz-kodu')" ontouchstart="winManager.startDrag(event, 'app-rachmistrz-kodu')">
                    <span class="text-sm font-bold g-accent drop-shadow-md">👨‍💻 Rachmistrz Kodu</span>
                    <div class="flex gap-2">
                        <button onclick="winManager.minimize('rachmistrz-kodu')" class="g-icon-btn px-1 hover:text-white transition">_</button>
                        <button onclick="winManager.close('rachmistrz-kodu')" class="text-red-500 hover:text-red-400 px-1 font-bold transition">✖</button>
                    </div>
                </div>

                <!-- Pasek Narzędzi -->
                <div class="flex justify-between items-center px-2 py-2 border-b g-border bg-black/10 text-[10px] sm:text-xs font-bold">
                    <div class="flex gap-2">
                        <button id="btn-rk-bits" onclick="rachmistrzKoduApp.toggleProgBits()" class="g-btn px-3 py-1 rounded shadow-sm">64-bit</button>
                        <button id="btn-rk-sign" onclick="rachmistrzKoduApp.toggleProgSign()" class="g-btn px-3 py-1 rounded shadow-sm">Signed</button>
                    </div>
                    <button onclick="rachmistrzKoduApp.toggleHistory()" class="g-icon-btn focus:outline-none" id="rk-toggle-hist">🕒 Historia</button>
                </div>

                <!-- Wyświetlacz -->
                <div class="p-3 border-b g-border flex flex-col h-[160px] transition-transform duration-100 bg-black/40 relative justify-end">
                    
                    <!-- Bazy systemowe na żywo -->
                    <div class="absolute top-2 left-2 flex flex-col text-[11px] font-mono text-gray-400 text-left gap-1 z-20">
                        <div id="rk-base-16" class="cursor-pointer hover:text-blue-400 transition" onclick="rachmistrzKoduApp.setProgBase(16)">HEX <span id="rk-val-hex" class="ml-1 opacity-70">0</span></div>
                        <div id="rk-base-10" class="cursor-pointer text-blue-500 font-bold transition" onclick="rachmistrzKoduApp.setProgBase(10)">DEC <span id="rk-val-dec" class="ml-1 opacity-100 text-gray-200">0</span></div>
                        <div id="rk-base-8"  class="cursor-pointer hover:text-blue-400 transition" onclick="rachmistrzKoduApp.setProgBase(8)">OCT <span id="rk-val-oct" class="ml-1 opacity-70">0</span></div>
                        <div id="rk-base-2"  class="cursor-pointer hover:text-blue-400 transition" onclick="rachmistrzKoduApp.setProgBase(2)">BIN <span id="rk-val-bin" class="ml-1 opacity-70 break-all leading-tight">0</span></div>
                    </div>

                    <div id="rk-preview" class="text-sm g-text-muted h-6 truncate w-full text-right font-mono mb-1 self-end mt-auto" style="max-width: 90%;"></div>
                    <div id="rk-display" class="text-3xl sm:text-4xl font-mono font-bold g-text break-all w-full text-right tracking-tight drop-shadow-lg self-end max-h-[60px] overflow-hidden">0</div>
                </div>

                <!-- Klawiatura Programisty (5 Kolumn) -->
                <div class="p-3 bg-black/10 flex flex-col gap-1">
                    
                    <!-- Klawisze Operacji Bitowych -->
                    <div class="grid grid-cols-5 gap-1 text-xs font-bold mb-1">
                        <button class="g-btn p-1.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append(' AND ')">AND</button>
                        <button class="g-btn p-1.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append(' OR ')">OR</button>
                        <button class="g-btn p-1.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append(' XOR ')">XOR</button>
                        <button class="g-btn p-1.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append(' NOT ')">NOT</button>
                        <button class="g-btn p-1.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append(' MOD ')">MOD</button>
                        
                        <button class="g-btn p-1.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append(' + ')">+</button>
                        <button class="g-btn p-1.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append(' - ')">-</button>
                        <button class="g-btn p-1.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append(' * ')">×</button>
                        <button class="g-btn p-1.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append(' / ')">÷</button>
                        <button class="g-btn p-1.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append(' ROL( ')">ROL</button>
                    </div>

                    <!-- Klawiatura Numeryczna i Literowa -->
                    <div class="grid grid-cols-5 gap-1 text-sm font-bold">
                        <button id="rk-A" class="g-btn p-2.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append('A')">A</button>
                        <button id="rk-B" class="g-btn p-2.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append('B')">B</button>
                        <button class="g-btn p-2.5 rounded-lg shadow-sm text-red-500 hover:text-red-300 border-red-500/50" onclick="rachmistrzKoduApp.clearEntry()">CE</button>
                        <button class="bg-red-600 hover:bg-red-500 text-white p-2.5 rounded-lg shadow-sm border border-red-700" onclick="rachmistrzKoduApp.clear()">C</button>
                        <button class="g-btn p-2.5 rounded-lg shadow-sm text-lg" onclick="rachmistrzKoduApp.backspace()">⌫</button>

                        <button id="rk-C" class="g-btn p-2.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append('C')">C</button>
                        <button id="rk-D" class="g-btn p-2.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append('D')">D</button>
                        <button id="rk-7" class="g-btn p-2.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append('7')">7</button>
                        <button id="rk-8" class="g-btn p-2.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append('8')">8</button>
                        <button id="rk-9" class="g-btn p-2.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append('9')">9</button>

                        <button id="rk-E" class="g-btn p-2.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append('E')">E</button>
                        <button id="rk-F" class="g-btn p-2.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append('F')">F</button>
                        <button id="rk-4" class="g-btn p-2.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append('4')">4</button>
                        <button id="rk-5" class="g-btn p-2.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append('5')">5</button>
                        <button id="rk-6" class="g-btn p-2.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append('6')">6</button>

                        <button class="g-btn p-2.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append(' ( ')">(</button>
                        <button class="g-btn p-2.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append(' ) ')">)</button>
                        <button id="rk-1" class="g-btn p-2.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append('1')">1</button>
                        <button id="rk-2" class="g-btn p-2.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append('2')">2</button>
                        <button id="rk-3" class="g-btn p-2.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append('3')">3</button>

                        <button class="g-btn p-2.5 rounded-lg shadow-sm text-xs" onclick="rachmistrzKoduApp.append(' << ')">SHL</button>
                        <button class="g-btn p-2.5 rounded-lg shadow-sm text-xs" onclick="rachmistrzKoduApp.append(' >> ')">SHR</button>
                        <button class="g-btn p-2.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.toggleSign()">±</button>
                        <button id="rk-0" class="g-btn p-2.5 rounded-lg shadow-sm" onclick="rachmistrzKoduApp.append('0')">0</button>
                        <button class="g-play-btn border g-border p-2.5 rounded-lg shadow-md text-xl" style="background: var(--panel);" onclick="rachmistrzKoduApp.calculate()">=</button>
                    </div>
                </div>
            </div>

            <!-- PANEL HISTORII (Wysuwany z prawej) -->
            <div id="rk-hist-panel" class="w-0 overflow-hidden flex flex-col transition-all duration-300 border-l g-border bg-black/20">
                <div class="p-4 flex justify-between items-center border-b g-border min-w-[280px]">
                    <h3 class="font-bold text-sm g-text">Historia Kodu</h3>
                    <button onclick="rachmistrzKoduApp.clearHistory()" class="text-xs text-red-500 hover:text-red-400 transition font-bold">🗑️ Wyczyść</button>
                </div>
                <div id="rk-history-list" class="flex-grow overflow-y-auto p-2 custom-scrollbar min-w-[280px]"></div>
            </div>
        `;
        appWindow.appendChild(proUI);
        rachmistrzKoduApp.updateDisplay();
    },

    toggleHistory: () => {
        rachmistrzKoduApp.isHistoryOpen = !rachmistrzKoduApp.isHistoryOpen;
        const appWindow = document.getElementById('app-rachmistrz-kodu');
        const histPanel = document.getElementById('rk-hist-panel');
        const btn = document.getElementById('rk-toggle-hist');
        
        if (rachmistrzKoduApp.isHistoryOpen) {
            histPanel.classList.remove('w-0', 'border-transparent');
            histPanel.classList.add('w-[280px]');
            btn.classList.add('g-accent'); btn.classList.remove('g-text-muted');
            appWindow.style.width = '660px';
            rachmistrzKoduApp.renderHistory();
        } else {
            histPanel.classList.add('w-0', 'border-transparent');
            histPanel.classList.remove('w-[280px]');
            btn.classList.remove('g-accent'); btn.classList.add('g-text-muted');
            appWindow.style.width = '380px';
        }
    },

    toggleProgBits: () => {
        rachmistrzKoduApp.progBits = rachmistrzKoduApp.progBits === 64 ? 32 : 64;
        document.getElementById('btn-rk-bits').innerText = rachmistrzKoduApp.progBits + '-bit';
        rachmistrzKoduApp.calculate(); 
        rachmistrzKoduApp.updateDisplay();
    },

    toggleProgSign: () => {
        rachmistrzKoduApp.progSigned = !rachmistrzKoduApp.progSigned;
        document.getElementById('btn-rk-sign').innerText = rachmistrzKoduApp.progSigned ? 'Signed' : 'Unsigned';
        rachmistrzKoduApp.calculate();
        rachmistrzKoduApp.updateDisplay();
    },

    setProgBase: (base) => {
        if (rachmistrzKoduApp.expr.trim() !== '' && rachmistrzKoduApp.expr !== 'Błąd') rachmistrzKoduApp.calculate();
        rachmistrzKoduApp.progBase = base;
        
        if (rachmistrzKoduApp.expr !== '' && rachmistrzKoduApp.expr !== 'Błąd' && rachmistrzKoduApp.lastBigInt !== null) {
            let u_val = rachmistrzKoduApp.lastBigInt & ((1n << BigInt(rachmistrzKoduApp.progBits)) - 1n);
            if (base === 16) rachmistrzKoduApp.expr = u_val.toString(16).toUpperCase();
            else if (base === 10) rachmistrzKoduApp.expr = rachmistrzKoduApp.lastBigInt.toString(10);
            else if (base === 8) rachmistrzKoduApp.expr = u_val.toString(8);
            else if (base === 2) rachmistrzKoduApp.expr = u_val.toString(2);
        }

        ['16','10','8','2'].forEach(b => {
            const el = document.getElementById('rk-base-'+b);
            const valEl = document.getElementById('rk-val-'+ (b==='16'?'hex':b==='10'?'dec':b==='8'?'oct':'bin'));
            if (el) {
                if (parseInt(b) === base) { 
                    el.classList.add('text-blue-500', 'font-bold'); el.classList.remove('hover:text-blue-400');
                    if(valEl) { valEl.classList.add('opacity-100', 'text-gray-200'); valEl.classList.remove('opacity-70'); }
                } else { 
                    el.classList.remove('text-blue-500', 'font-bold'); el.classList.add('hover:text-blue-400'); 
                    if(valEl) { valEl.classList.remove('opacity-100', 'text-gray-200'); valEl.classList.add('opacity-70'); }
                }
            }
        });

        rachmistrzKoduApp.updateKeyboardState();
        rachmistrzKoduApp.updateDisplay();
    },

    updateKeyboardState: () => {
        const disableBtns = (ids, disable) => {
            ids.forEach(id => {
                const btn = document.getElementById(id);
                if(btn) {
                    btn.disabled = disable;
                    if(disable) btn.classList.add('opacity-30', 'cursor-not-allowed');
                    else btn.classList.remove('opacity-30', 'cursor-not-allowed');
                }
            });
        };

        const hexIds = ['rk-A','rk-B','rk-C','rk-D','rk-E','rk-F'];
        const decIds = ['rk-2','rk-3','rk-4','rk-5','rk-6','rk-7','rk-8','rk-9'];
        const octIds = ['rk-8','rk-9'];
        
        disableBtns(hexIds, rachmistrzKoduApp.progBase !== 16);
        disableBtns(decIds, rachmistrzKoduApp.progBase === 2);
        disableBtns(octIds, rachmistrzKoduApp.progBase === 8 || rachmistrzKoduApp.progBase === 2);
    },

    truncBigInt: (val) => {
        const bits = BigInt(rachmistrzKoduApp.progBits); 
        const mask = (1n << bits) - 1n;
        let truncated = BigInt(val) & mask;
        if (rachmistrzKoduApp.progSigned) {
            const signBit = 1n << (bits - 1n);
            if (truncated & signBit) {
                truncated = truncated - (1n << bits);
            }
        }
        return truncated;
    },

    _rol: (val, shift) => {
        const bits = BigInt(rachmistrzKoduApp.progBits);
        let v = BigInt(val) & ((1n << bits) - 1n); 
        let s = BigInt(shift) % bits;
        if (s < 0n) s += bits;
        let res = (v << s) | (v >> (bits - s));
        return rachmistrzKoduApp.truncBigInt(res);
    },
    
    _ror: (val, shift) => {
        const bits = BigInt(rachmistrzKoduApp.progBits);
        let v = BigInt(val) & ((1n << bits) - 1n); 
        let s = BigInt(shift) % bits;
        if (s < 0n) s += bits;
        let res = (v >> s) | (v << (bits - s));
        return rachmistrzKoduApp.truncBigInt(res);
    },

    append: (val) => {
        if (rachmistrzKoduApp.expr === 'Błąd' || rachmistrzKoduApp.expr === 'Nie dziel przez zero!') rachmistrzKoduApp.expr = '';
        if (rachmistrzKoduApp.lastResult !== '' && /^[0-9A-F]$/.test(val.trim())) {
            rachmistrzKoduApp.expr = '';
        }
        rachmistrzKoduApp.lastResult = '';
        rachmistrzKoduApp.expr += val;
        rachmistrzKoduApp.updateDisplay();
    },

    backspace: () => {
        if (rachmistrzKoduApp.expr === 'Błąd') rachmistrzKoduApp.expr = '';
        if (rachmistrzKoduApp.expr.length > 0) {
            if (rachmistrzKoduApp.expr.endsWith(' ')) {
                rachmistrzKoduApp.expr = rachmistrzKoduApp.expr.trimEnd();
                let lastSpace = rachmistrzKoduApp.expr.lastIndexOf(' ');
                if(lastSpace !== -1) rachmistrzKoduApp.expr = rachmistrzKoduApp.expr.substring(0, lastSpace + 1);
                else rachmistrzKoduApp.expr = '';
            } else {
                rachmistrzKoduApp.expr = rachmistrzKoduApp.expr.slice(0, -1);
            }
        }
        rachmistrzKoduApp.updateDisplay();
    },

    clear: () => {
        rachmistrzKoduApp.expr = '';
        rachmistrzKoduApp.lastResult = '';
        rachmistrzKoduApp.lastBigInt = 0n;
        rachmistrzKoduApp.updateDisplay();
    },

    clearEntry: () => {
        if (rachmistrzKoduApp.expr.length > 0) {
            const matches = rachmistrzKoduApp.expr.match(/^(.*[\+\-\*\/\(\)\s\&\|\^\~\<\>])([0-9A-F]+)$/);
            if (matches) rachmistrzKoduApp.expr = matches[1];
            else rachmistrzKoduApp.expr = '';
        }
        rachmistrzKoduApp.updateDisplay();
    },

    toggleSign: () => {
        if (rachmistrzKoduApp.expr === 'Błąd') rachmistrzKoduApp.expr = '';
        const regex = /(^|[\+\-\*\/\(\)\s\&\|\^\~\<\>])(\-?[0-9A-F]+)$/;
        const match = rachmistrzKoduApp.expr.match(regex);
        
        if (match) {
            let numStr = match[2];
            let newNumStr = numStr.startsWith('-') ? numStr.substring(1) : '-' + numStr;
            rachmistrzKoduApp.expr = rachmistrzKoduApp.expr.substring(0, match.index + match[1].length) + newNumStr;
        } else {
            if(rachmistrzKoduApp.expr.trim() === '') rachmistrzKoduApp.expr = '-';
        }
        rachmistrzKoduApp.updateDisplay();
    },

    calculate: () => {
        if (!rachmistrzKoduApp.expr || rachmistrzKoduApp.expr.trim() === '') return;
        
        const oryginalneDzialanie = rachmistrzKoduApp.expr;
        let toEval = rachmistrzKoduApp.expr;

        try {
            toEval = toEval.replace(/AND/g, '&').replace(/OR/g, '|').replace(/XOR/g, '^')
                           .replace(/NOT\s*/g, '~').replace(/MOD/g, '%')
                           .replace(/ROL\s*\(/g, 'rachmistrzKoduApp._rol(').replace(/ROR\s*\(/g, 'rachmistrzKoduApp._ror(');
            
            if (rachmistrzKoduApp.progBase === 16) toEval = toEval.replace(/\b([0-9A-F]+)\b/g, '0x$1n');
            else if (rachmistrzKoduApp.progBase === 10) toEval = toEval.replace(/\b([0-9]+)\b/g, '$1n');
            else if (rachmistrzKoduApp.progBase === 8) toEval = toEval.replace(/\b([0-7]+)\b/g, '0o$1n');
            else if (rachmistrzKoduApp.progBase === 2) toEval = toEval.replace(/\b([0-1]+)\b/g, '0b$1n');
            
            if (!/^[0-9+\-*/().\s&|^~<>nxa-fA-FrachmistzoKduAp_l,]*$/.test(toEval)) throw new Error("Invalid chars");
            
            let resBig = new Function('return ' + toEval)();
            resBig = rachmistrzKoduApp.truncBigInt(resBig);
            rachmistrzKoduApp.lastBigInt = resBig;
            
            let mask = (1n << BigInt(rachmistrzKoduApp.progBits)) - 1n;
            let u_val = resBig & mask;
            
            if (rachmistrzKoduApp.progBase === 16) rachmistrzKoduApp.expr = u_val.toString(16).toUpperCase();
            else if (rachmistrzKoduApp.progBase === 10) rachmistrzKoduApp.expr = resBig.toString(10);
            else if (rachmistrzKoduApp.progBase === 8) rachmistrzKoduApp.expr = u_val.toString(8);
            else if (rachmistrzKoduApp.progBase === 2) rachmistrzKoduApp.expr = u_val.toString(2);
            
            rachmistrzKoduApp.lastResult = rachmistrzKoduApp.expr;
            rachmistrzKoduApp.history.unshift({ eq: oryginalneDzialanie.trim(), res: rachmistrzKoduApp.expr });

            if (rachmistrzKoduApp.history.length > 30) rachmistrzKoduApp.history.pop();
            localStorage.setItem('bigos_rkodu_history', JSON.stringify(rachmistrzKoduApp.history));
            if (rachmistrzKoduApp.isHistoryOpen) rachmistrzKoduApp.renderHistory();

        } catch (e) {
            console.warn("Błąd parsowania:", e);
            rachmistrzKoduApp.expr = 'Błąd';
        }
        
        rachmistrzKoduApp.updateDisplay();
    },

    silentEvalProg: (expression) => {
        if (!expression || expression.trim() === '') return 0n;
        let toEval = expression.replace(/AND/g, '&').replace(/OR/g, '|').replace(/XOR/g, '^').replace(/NOT\s*/g, '~').replace(/MOD/g, '%')
                         .replace(/ROL\s*\(/g, 'rachmistrzKoduApp._rol(').replace(/ROR\s*\(/g, 'rachmistrzKoduApp._ror(');
        
        if (rachmistrzKoduApp.progBase === 16) toEval = toEval.replace(/\b([0-9A-F]+)\b/g, '0x$1n');
        else if (rachmistrzKoduApp.progBase === 10) toEval = toEval.replace(/\b([0-9]+)\b/g, '$1n');
        else if (rachmistrzKoduApp.progBase === 8) toEval = toEval.replace(/\b([0-7]+)\b/g, '0o$1n');
        else if (rachmistrzKoduApp.progBase === 2) toEval = toEval.replace(/\b([0-1]+)\b/g, '0b$1n');
        
        try {
            let res = new Function('return ' + toEval)();
            return rachmistrzKoduApp.truncBigInt(res);
        } catch(e) { return null; }
    },

    updateDisplay: () => {
        const dsp = document.getElementById('rk-display');
        const prev = document.getElementById('rk-preview');
        
        if (dsp) {
            let showStr = rachmistrzKoduApp.expr || '0';
            showStr = showStr.replace(/\*/g, '×').replace(/\//g, '÷');
            dsp.innerText = showStr;
            
            if (showStr.length > 24) dsp.classList.replace('text-3xl', 'text-lg');
            else if (showStr.length > 14) { dsp.classList.replace('text-4xl', 'text-3xl'); dsp.classList.replace('text-lg', 'text-3xl'); }
            else { dsp.classList.replace('text-3xl', 'text-4xl'); dsp.classList.replace('text-lg', 'text-4xl'); }
        }
        
        if (prev && rachmistrzKoduApp.history.length > 0 && rachmistrzKoduApp.expr === '') {
            prev.innerText = `Ostatnie: ${rachmistrzKoduApp.history[0].res}`;
        } else if (prev) {
            prev.innerText = '';
        }

        let val = rachmistrzKoduApp.silentEvalProg(rachmistrzKoduApp.expr);
        if (val === null && rachmistrzKoduApp.expr.length > 0) {
            let trimmed = rachmistrzKoduApp.expr.trim().replace(/[\+\-\*\/\&\|\^\~\<\>]+$/, '');
            val = rachmistrzKoduApp.silentEvalProg(trimmed);
        }
        if (val !== null && typeof val === 'bigint') {
            let mask = (1n << BigInt(rachmistrzKoduApp.progBits)) - 1n;
            let u_val = val & mask; 
            
            const formatBin = (bStr) => bStr.match(/.{1,4}/g)?.join(' ') || bStr;

            document.getElementById('rk-val-hex').innerText = u_val.toString(16).toUpperCase();
            document.getElementById('rk-val-dec').innerText = val.toString(10);
            document.getElementById('rk-val-oct').innerText = u_val.toString(8);
            document.getElementById('rk-val-bin').innerText = formatBin(u_val.toString(2).padStart(Math.min(u_val.toString(2).length + (4 - u_val.toString(2).length % 4) % 4, 64), '0'));
        }
    },

    renderHistory: () => {
        const list = document.getElementById('rk-history-list');
        if (!list) return;
        
        if (rachmistrzKoduApp.history.length === 0) {
            list.innerHTML = '<div class="text-center g-text-muted text-xs mt-6">Brak zapisanych obliczeń.</div>';
            return;
        }

        list.innerHTML = '';
        rachmistrzKoduApp.history.forEach((h, i) => {
            const el = document.createElement('div');
            el.className = 'g-item p-3 mb-2 rounded-lg cursor-pointer transition shadow-sm text-right bg-black/10';
            el.innerHTML = `
                <div class="text-xs g-text-muted font-mono mb-1 break-all">${h.eq} =</div>
                <div class="text-lg font-bold g-accent font-mono break-all leading-tight">${h.res}</div>
            `;
            el.onclick = () => {
                rachmistrzKoduApp.expr = String(h.res);
                rachmistrzKoduApp.lastResult = String(h.res);
                try { rachmistrzKoduApp.lastBigInt = BigInt(h.res); } catch(e) { rachmistrzKoduApp.lastBigInt = 0n; }
                rachmistrzKoduApp.updateDisplay();
            };
            list.appendChild(el);
        });
    },

    clearHistory: () => {
        rachmistrzKoduApp.history = [];
        localStorage.removeItem('bigos_rkodu_history');
        rachmistrzKoduApp.renderHistory();
        rachmistrzKoduApp.updateDisplay();
        if(typeof apps !== 'undefined') apps.showToast('Historia', 'Wyczyszczono pamięć kalkulatora.', 'info');
    },

    handleKeyboard: (e) => {
        const appWin = document.getElementById('app-rachmistrz-kodu');
        if (appWin && appWin.classList.contains('active') && !appWin.classList.contains('minimized')) {
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable)) return;
            
            const k = e.key.toUpperCase();
            
            if (/[0-9A-F]/.test(k)) { 
                if (/[A-F]/.test(k) && rachmistrzKoduApp.progBase !== 16) return;
                if (rachmistrzKoduApp.progBase === 2 && /[2-9]/.test(k)) return;
                if (rachmistrzKoduApp.progBase === 8 && /[8-9]/.test(k)) return;
                
                e.preventDefault(); rachmistrzKoduApp.append(k); 
            }
            else if (k === '+') { e.preventDefault(); rachmistrzKoduApp.append(' + '); }
            else if (k === '-') { e.preventDefault(); rachmistrzKoduApp.append(' - '); }
            else if (k === '*') { e.preventDefault(); rachmistrzKoduApp.append(' * '); }
            else if (k === '/') { e.preventDefault(); rachmistrzKoduApp.append(' / '); }
            else if (k === '(') { e.preventDefault(); rachmistrzKoduApp.append(' ( '); }
            else if (k === ')') { e.preventDefault(); rachmistrzKoduApp.append(' ) '); }
            else if (k === 'ENTER' || k === '=') { e.preventDefault(); rachmistrzKoduApp.calculate(); }
            else if (k === 'BACKSPACE') { e.preventDefault(); rachmistrzKoduApp.backspace(); }
            else if (k === 'ESCAPE') { e.preventDefault(); rachmistrzKoduApp.clear(); }
            else if (k === 'DELETE') { e.preventDefault(); rachmistrzKoduApp.clearEntry(); }
        }
    }
};

setTimeout(rachmistrzKoduApp.init, 500);