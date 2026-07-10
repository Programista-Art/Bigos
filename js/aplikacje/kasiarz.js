// ======================================================================
// PLIK: js/aplikacje/kasiarz.js (Kasiarz - Kalkulator Finansowy)
// ======================================================================

const kasiarzApp = {
    currentTab: 'vat',

    init: () => {
        kasiarzApp.upgradeUI();
    },

    upgradeUI: () => {
        let appWindow = document.getElementById('app-kasiarz');
        
        // ZABEZPIECZENIE: Jeśli zapomniałeś dodać kontenera do index.html, skrypt stworzy go sam!
        if (!appWindow) { 
            appWindow = document.createElement('div');
            appWindow.id = 'app-kasiarz';
            appWindow.className = 'window absolute';
            document.body.appendChild(appWindow);
        }

        appWindow.style.width = '640px';
        appWindow.style.height = '480px';
        // Pozbywamy się starego tła okna, by nowy silnik motywów działał idealnie
        appWindow.style.background = 'transparent';
        appWindow.style.border = 'none';
        appWindow.style.boxShadow = 'none';

        const titleBar = appWindow.querySelector('.title-bar');
        Array.from(appWindow.children).forEach(child => { if (child !== titleBar) child.remove(); });

        if (titleBar) titleBar.style.display = 'none';

        const proUI = document.createElement('div');
        proUI.className = 'flex flex-col overflow-hidden relative themed-app g-panel rounded-lg shadow-2xl h-full';

        proUI.innerHTML = `
            <!-- Tematyczny Pasek Tytułowy -->
            <div class="px-4 py-2 border-b g-border flex justify-between items-center cursor-move bg-black/30 shrink-0" onmousedown="winManager.startDrag(event, 'app-kasiarz')" ontouchstart="winManager.startDrag(event, 'app-kasiarz')">
                <span class="text-sm font-bold g-accent drop-shadow-md">💰 Kasiarz (Kalkulator Finansowy)</span>
                <div class="flex gap-2">
                    <button onclick="winManager.minimize('kasiarz')" class="g-icon-btn px-1 hover:text-white transition">_</button>
                    <button onclick="winManager.close('kasiarz')" class="text-red-500 hover:text-red-400 px-1 font-bold transition">✖</button>
                </div>
            </div>

            <!-- Główny kontener -->
            <div class="flex flex-row flex-grow overflow-hidden">
                <!-- Lewy Panel: Menu kalkulatorów -->
                <div class="w-1/3 border-r g-border bg-black/10 flex flex-col p-2 gap-1 overflow-y-auto custom-scrollbar shrink-0">
                    <button onclick="kasiarzApp.switchTab('vat')" id="kas-tab-vat" class="kasiarz-tab g-item text-left px-3 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2"><span>🛒</span> Kalkulator VAT</button>
                    <button onclick="kasiarzApp.switchTab('margin')" id="kas-tab-margin" class="kasiarz-tab g-item text-left px-3 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2"><span>📈</span> Marża i Narzut</button>
                    <button onclick="kasiarzApp.switchTab('discount')" id="kas-tab-discount" class="kasiarz-tab g-item text-left px-3 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2"><span>🏷️</span> Rabat / Obniżka</button>
                    <button onclick="kasiarzApp.switchTab('loan')" id="kas-tab-loan" class="kasiarz-tab g-item text-left px-3 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2"><span>🏦</span> Kredyt / Leasing</button>
                    <button onclick="kasiarzApp.switchTab('deposit')" id="kas-tab-deposit" class="kasiarz-tab g-item text-left px-3 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2"><span>🐖</span> Lokata (Odsetki)</button>
                    <button onclick="kasiarzApp.switchTab('roi')" id="kas-tab-roi" class="kasiarz-tab g-item text-left px-3 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2"><span>📊</span> Zysk i ROI</button>
                </div>

                <!-- Prawy Panel: Dynamiczna zawartość wybranego kalkulatora -->
                <div class="w-2/3 flex flex-col p-4 bg-black/20 overflow-y-auto custom-scrollbar" id="kasiarz-content">
                    <!-- Treść generowana przez JS -->
                </div>
            </div>
        `;
        appWindow.appendChild(proUI);
        
        // NAPRAWA: Renderujemy zakładkę DOPIERO gdy HTML interfejsu zostanie fizycznie wstrzyknięty!
        kasiarzApp.renderTab(kasiarzApp.currentTab);
    },

    switchTab: (tabId) => {
        kasiarzApp.currentTab = tabId;
        
        // Zaktualizuj style zakładek
        document.querySelectorAll('.kasiarz-tab').forEach(btn => {
            btn.classList.remove('bg-blue-500', 'text-white', 'dark:bg-blue-600');
            btn.classList.add('g-text-muted');
        });
        const activeBtn = document.getElementById('kas-tab-' + tabId);
        if (activeBtn) {
            activeBtn.classList.remove('g-text-muted');
            activeBtn.classList.add('bg-blue-500', 'text-white', 'dark:bg-blue-600');
        }

        kasiarzApp.renderTab(tabId);
    },

    renderTab: (tabId) => {
        const content = document.getElementById('kasiarz-content');
        if (!content) return;

        let html = '';

        if (tabId === 'vat') {
            html = `
                <h3 class="text-lg font-bold g-accent mb-4 border-b g-border pb-2">Kalkulator VAT</h3>
                <div class="flex flex-col gap-3">
                    <div>
                        <label class="block text-xs g-text-muted mb-1 font-bold uppercase tracking-wider">Kwota Netto (PLN)</label>
                        <input type="number" id="vat-netto" class="w-full p-2 g-bg g-text border g-border rounded outline-none focus:border-blue-500" placeholder="0.00" oninput="kasiarzApp.calcVAT('netto')">
                    </div>
                    <div>
                        <label class="block text-xs g-text-muted mb-1 font-bold uppercase tracking-wider">Stawka VAT (%)</label>
                        <select id="vat-rate" class="w-full p-2 g-bg g-text border g-border rounded outline-none focus:border-blue-500 cursor-pointer" onchange="kasiarzApp.calcVAT('netto')">
                            <option value="23" selected>23% (Podstawowa)</option>
                            <option value="8">8% (Obniżona)</option>
                            <option value="5">5% (Obniżona)</option>
                            <option value="0">0% (Zerowa)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs g-text-muted mb-1 font-bold uppercase tracking-wider">Kwota Brutto (PLN)</label>
                        <input type="number" id="vat-brutto" class="w-full p-2 g-bg g-text border g-border rounded outline-none focus:border-blue-500" placeholder="0.00" oninput="kasiarzApp.calcVAT('brutto')">
                    </div>
                </div>
                <div class="mt-6 p-4 g-panel border g-border rounded-lg text-center shadow-inner">
                    <span class="text-xs g-text-muted block mb-1">Kwota podatku VAT:</span>
                    <span class="text-3xl font-bold text-red-500 font-mono" id="vat-result">0.00 PLN</span>
                </div>
            `;
        } 
        else if (tabId === 'margin') {
            html = `
                <h3 class="text-lg font-bold g-accent mb-4 border-b g-border pb-2">Marża i Narzut</h3>
                <div class="grid grid-cols-2 gap-3">
                    <div class="col-span-2 sm:col-span-1">
                        <label class="block text-xs g-text-muted mb-1 font-bold uppercase tracking-wider">Koszt Zakupu (PLN)</label>
                        <input type="number" id="mar-cost" class="w-full p-2 g-bg g-text border g-border rounded outline-none focus:border-blue-500" placeholder="np. 100" oninput="kasiarzApp.calcMargin()">
                    </div>
                    <div class="col-span-2 sm:col-span-1">
                        <label class="block text-xs g-text-muted mb-1 font-bold uppercase tracking-wider">Cena Sprzedaży (PLN)</label>
                        <input type="number" id="mar-price" class="w-full p-2 g-bg g-text border g-border rounded outline-none focus:border-blue-500" placeholder="np. 150" oninput="kasiarzApp.calcMargin()">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4 mt-6">
                    <div class="p-4 g-panel border g-border rounded-lg text-center shadow-inner">
                        <span class="text-xs g-text-muted block mb-1">Marża (od ceny)</span>
                        <span class="text-2xl font-bold text-green-500 font-mono" id="mar-margin">0.00%</span>
                    </div>
                    <div class="p-4 g-panel border g-border rounded-lg text-center shadow-inner">
                        <span class="text-xs g-text-muted block mb-1">Narzut (od kosztu)</span>
                        <span class="text-2xl font-bold text-blue-500 font-mono" id="mar-markup">0.00%</span>
                    </div>
                    <div class="col-span-2 p-4 g-panel border g-border rounded-lg text-center shadow-inner mt-2">
                        <span class="text-xs g-text-muted block mb-1">Zysk Kwotowy</span>
                        <span class="text-3xl font-bold g-text font-mono" id="mar-profit">0.00 PLN</span>
                    </div>
                </div>
            `;
        }
        else if (tabId === 'discount') {
            html = `
                <h3 class="text-lg font-bold g-accent mb-4 border-b g-border pb-2">Kalkulator Rabatu</h3>
                <div class="flex flex-col gap-3">
                    <div>
                        <label class="block text-xs g-text-muted mb-1 font-bold uppercase tracking-wider">Cena Początkowa (PLN)</label>
                        <input type="number" id="dis-price" class="w-full p-2 g-bg g-text border g-border rounded outline-none focus:border-blue-500" placeholder="0.00" oninput="kasiarzApp.calcDiscount()">
                    </div>
                    <div>
                        <label class="block text-xs g-text-muted mb-1 font-bold uppercase tracking-wider">Rabat (%)</label>
                        <div class="flex items-center gap-2">
                            <input type="range" id="dis-percent-slider" min="0" max="100" value="10" class="flex-1 g-range" oninput="document.getElementById('dis-percent').value=this.value; kasiarzApp.calcDiscount()">
                            <input type="number" id="dis-percent" value="10" min="0" max="100" class="w-20 p-2 g-bg g-text border g-border rounded outline-none text-center" oninput="document.getElementById('dis-percent-slider').value=this.value; kasiarzApp.calcDiscount()">
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4 mt-6">
                    <div class="p-4 g-panel border border-red-500/50 rounded-lg text-center shadow-inner">
                        <span class="text-xs text-red-400 block mb-1">Cena po obniżce</span>
                        <span class="text-2xl font-bold text-red-500 font-mono" id="dis-final">0.00 PLN</span>
                    </div>
                    <div class="p-4 g-panel border border-green-500/50 rounded-lg text-center shadow-inner">
                        <span class="text-xs text-green-400 block mb-1">Twoja oszczędność</span>
                        <span class="text-2xl font-bold text-green-500 font-mono" id="dis-saved">0.00 PLN</span>
                    </div>
                </div>
            `;
        }
        else if (tabId === 'loan') {
            html = `
                <h3 class="text-lg font-bold g-accent mb-4 border-b g-border pb-2">Kredyt / Raty Równe</h3>
                <div class="grid grid-cols-2 gap-3">
                    <div class="col-span-2 sm:col-span-1">
                        <label class="block text-xs g-text-muted mb-1 font-bold uppercase tracking-wider">Kwota Kredytu (PLN)</label>
                        <input type="number" id="loan-amount" class="w-full p-2 g-bg g-text border g-border rounded outline-none focus:border-blue-500" value="10000">
                    </div>
                    <div class="col-span-2 sm:col-span-1">
                        <label class="block text-xs g-text-muted mb-1 font-bold uppercase tracking-wider">Oprocentowanie w skali roku (%)</label>
                        <input type="number" id="loan-rate" step="0.1" class="w-full p-2 g-bg g-text border g-border rounded outline-none focus:border-blue-500" value="8.5">
                    </div>
                    <div class="col-span-2">
                        <label class="block text-xs g-text-muted mb-1 font-bold uppercase tracking-wider">Okres kredytowania (Miesiące)</label>
                        <input type="number" id="loan-months" class="w-full p-2 g-bg g-text border g-border rounded outline-none focus:border-blue-500" value="24">
                    </div>
                </div>
                <button class="w-full g-btn mt-4 py-2 rounded font-bold shadow-md" onclick="kasiarzApp.calcLoan()">Oblicz Raty</button>
                
                <div class="grid grid-cols-2 gap-4 mt-4">
                    <div class="col-span-2 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg text-center shadow-inner">
                        <span class="text-xs text-blue-300 block mb-1">Miesięczna Rata</span>
                        <span class="text-4xl font-bold text-blue-400 font-mono" id="loan-installment">0.00 PLN</span>
                    </div>
                    <div class="p-3 g-panel border g-border rounded-lg text-center shadow-inner">
                        <span class="text-[10px] g-text-muted block mb-1 uppercase tracking-wider">Całkowity Koszt Kredytu</span>
                        <span class="text-lg font-bold text-red-400 font-mono" id="loan-cost">0.00 PLN</span>
                    </div>
                    <div class="p-3 g-panel border g-border rounded-lg text-center shadow-inner">
                        <span class="text-[10px] g-text-muted block mb-1 uppercase tracking-wider">Całkowita Kwota do Spłaty</span>
                        <span class="text-lg font-bold g-text font-mono" id="loan-total">0.00 PLN</span>
                    </div>
                </div>
            `;
        }
        else if (tabId === 'deposit') {
            html = `
                <h3 class="text-lg font-bold g-accent mb-4 border-b g-border pb-2">Lokata Bankowa i Odsetki</h3>
                <div class="grid grid-cols-2 gap-3">
                    <div class="col-span-2 sm:col-span-1">
                        <label class="block text-xs g-text-muted mb-1 font-bold uppercase tracking-wider">Wpłacony Kapitał (PLN)</label>
                        <input type="number" id="dep-amount" class="w-full p-2 g-bg g-text border g-border rounded outline-none focus:border-blue-500" value="5000">
                    </div>
                    <div class="col-span-2 sm:col-span-1">
                        <label class="block text-xs g-text-muted mb-1 font-bold uppercase tracking-wider">Oprocentowanie roczne (%)</label>
                        <input type="number" id="dep-rate" step="0.1" class="w-full p-2 g-bg g-text border g-border rounded outline-none focus:border-blue-500" value="5.0">
                    </div>
                    <div class="col-span-2 sm:col-span-1">
                        <label class="block text-xs g-text-muted mb-1 font-bold uppercase tracking-wider">Czas Trwania (Miesiące)</label>
                        <input type="number" id="dep-months" class="w-full p-2 g-bg g-text border g-border rounded outline-none focus:border-blue-500" value="12">
                    </div>
                    <div class="col-span-2 sm:col-span-1 flex items-end pb-2 gap-2 cursor-pointer" onclick="const cb = document.getElementById('dep-belka'); cb.checked = !cb.checked; kasiarzApp.calcDeposit();">
                        <input type="checkbox" id="dep-belka" class="w-4 h-4 accent-blue-500" checked onclick="event.stopPropagation(); kasiarzApp.calcDeposit();">
                        <span class="text-sm font-bold g-text-muted">Podatek Belki (19%)</span>
                    </div>
                </div>
                <button class="w-full g-btn mt-4 py-2 rounded font-bold shadow-md" onclick="kasiarzApp.calcDeposit()">Oblicz Zysk</button>
                
                <div class="grid grid-cols-2 gap-4 mt-4">
                    <div class="col-span-2 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-center shadow-inner">
                        <span class="text-xs text-emerald-300 block mb-1">Czysty Zysk (Netto)</span>
                        <span class="text-4xl font-bold text-emerald-400 font-mono" id="dep-profit">0.00 PLN</span>
                    </div>
                    <div class="p-3 g-panel border g-border rounded-lg text-center shadow-inner">
                        <span class="text-[10px] g-text-muted block mb-1 uppercase tracking-wider">Zysk Brutto (Przed podatkiem)</span>
                        <span class="text-sm font-bold g-text font-mono" id="dep-gross">0.00 PLN</span>
                    </div>
                    <div class="p-3 g-panel border g-border rounded-lg text-center shadow-inner">
                        <span class="text-[10px] g-text-muted block mb-1 uppercase tracking-wider">Potrącony Podatek</span>
                        <span class="text-sm font-bold text-red-400 font-mono" id="dep-tax">0.00 PLN</span>
                    </div>
                </div>
            `;
        }
        else if (tabId === 'roi') {
            html = `
                <h3 class="text-lg font-bold g-accent mb-4 border-b g-border pb-2">Zysk i ROI (Zwrot z inwestycji)</h3>
                <div class="flex flex-col gap-3">
                    <div>
                        <label class="block text-xs g-text-muted mb-1 font-bold uppercase tracking-wider">Całkowity Koszt Inwestycji (PLN)</label>
                        <input type="number" id="roi-cost" class="w-full p-2 g-bg g-text border g-border rounded outline-none focus:border-blue-500" placeholder="np. 10000" oninput="kasiarzApp.calcROI()">
                    </div>
                    <div>
                        <label class="block text-xs g-text-muted mb-1 font-bold uppercase tracking-wider">Całkowity Przychód (PLN)</label>
                        <input type="number" id="roi-revenue" class="w-full p-2 g-bg g-text border g-border rounded outline-none focus:border-blue-500" placeholder="np. 12500" oninput="kasiarzApp.calcROI()">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4 mt-6">
                    <div class="p-4 g-panel border g-border rounded-lg text-center shadow-inner">
                        <span class="text-xs g-text-muted block mb-1">Wskaźnik ROI</span>
                        <span class="text-3xl font-bold font-mono" id="roi-percent">0.00%</span>
                    </div>
                    <div class="p-4 g-panel border g-border rounded-lg text-center shadow-inner">
                        <span class="text-xs g-text-muted block mb-1">Czysty Zysk</span>
                        <span class="text-3xl font-bold font-mono" id="roi-profit">0.00 PLN</span>
                    </div>
                </div>
            `;
        }

        content.innerHTML = html;
        
        // Wywołanie początkowych obliczeń jeśli formularz ma domyślne dane
        if(tabId === 'loan') kasiarzApp.calcLoan();
        if(tabId === 'deposit') kasiarzApp.calcDeposit();
    },

    // ==================================================================
    // FUNKCJE OBLICZENIOWE
    // ==================================================================

    calcVAT: (source) => {
        const rate = parseFloat(document.getElementById('vat-rate').value);
        let nettoEl = document.getElementById('vat-netto');
        let bruttoEl = document.getElementById('vat-brutto');
        let resEl = document.getElementById('vat-result');

        if (source === 'netto') {
            let netto = parseFloat(nettoEl.value);
            if(isNaN(netto)) { bruttoEl.value = ''; resEl.innerText = '0.00 PLN'; return; }
            let tax = netto * (rate / 100);
            let brutto = netto + tax;
            bruttoEl.value = brutto.toFixed(2);
            resEl.innerText = tax.toFixed(2) + ' PLN';
        } else {
            let brutto = parseFloat(bruttoEl.value);
            if(isNaN(brutto)) { nettoEl.value = ''; resEl.innerText = '0.00 PLN'; return; }
            let netto = brutto / (1 + (rate / 100));
            let tax = brutto - netto;
            nettoEl.value = netto.toFixed(2);
            resEl.innerText = tax.toFixed(2) + ' PLN';
        }
    },

    calcMargin: () => {
        let cost = parseFloat(document.getElementById('mar-cost').value);
        let price = parseFloat(document.getElementById('mar-price').value);
        
        let elMargin = document.getElementById('mar-margin');
        let elMarkup = document.getElementById('mar-markup');
        let elProfit = document.getElementById('mar-profit');

        if(isNaN(cost) || isNaN(price) || cost === 0 || price === 0) {
            elMargin.innerText = '0.00%'; elMarkup.innerText = '0.00%'; elProfit.innerText = '0.00 PLN';
            return;
        }

        let profit = price - cost;
        let margin = (profit / price) * 100;
        let markup = (profit / cost) * 100;

        elProfit.innerText = profit.toFixed(2) + ' PLN';
        elMargin.innerText = margin.toFixed(2) + '%';
        elMarkup.innerText = markup.toFixed(2) + '%';
        
        elProfit.className = profit >= 0 ? "text-3xl font-bold text-green-500 font-mono" : "text-3xl font-bold text-red-500 font-mono";
    },

    calcDiscount: () => {
        let price = parseFloat(document.getElementById('dis-price').value);
        let discount = parseFloat(document.getElementById('dis-percent').value);
        
        let elFinal = document.getElementById('dis-final');
        let elSaved = document.getElementById('dis-saved');

        if(isNaN(price) || isNaN(discount)) {
            elFinal.innerText = '0.00 PLN'; elSaved.innerText = '0.00 PLN';
            return;
        }

        let saved = price * (discount / 100);
        let finalPrice = price - saved;

        elFinal.innerText = finalPrice.toFixed(2) + ' PLN';
        elSaved.innerText = saved.toFixed(2) + ' PLN';
    },

    calcLoan: () => {
        let amount = parseFloat(document.getElementById('loan-amount').value);
        let annualRate = parseFloat(document.getElementById('loan-rate').value);
        let months = parseInt(document.getElementById('loan-months').value);

        let elInstallment = document.getElementById('loan-installment');
        let elCost = document.getElementById('loan-cost');
        let elTotal = document.getElementById('loan-total');

        if (isNaN(amount) || isNaN(annualRate) || isNaN(months) || amount <= 0 || months <= 0) {
            elInstallment.innerText = '0.00 PLN'; elCost.innerText = '0.00 PLN'; elTotal.innerText = '0.00 PLN';
            return;
        }

        let monthlyRate = (annualRate / 100) / 12;
        let installment;

        if (monthlyRate === 0) {
            installment = amount / months; // Kredyt 0%
        } else {
            // Wzór na raty równe: P * r * (1+r)^n / ((1+r)^n - 1)
            installment = amount * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
        }

        let totalRepayment = installment * months;
        let totalCost = totalRepayment - amount;

        elInstallment.innerText = installment.toFixed(2) + ' PLN';
        elTotal.innerText = totalRepayment.toFixed(2) + ' PLN';
        elCost.innerText = totalCost.toFixed(2) + ' PLN';
    },

    calcDeposit: () => {
        let amount = parseFloat(document.getElementById('dep-amount').value);
        let annualRate = parseFloat(document.getElementById('dep-rate').value);
        let months = parseInt(document.getElementById('dep-months').value);
        let applyTax = document.getElementById('dep-belka').checked;

        let elProfit = document.getElementById('dep-profit');
        let elGross = document.getElementById('dep-gross');
        let elTax = document.getElementById('dep-tax');

        if (isNaN(amount) || isNaN(annualRate) || isNaN(months) || amount <= 0 || months <= 0) {
            elProfit.innerText = '0.00 PLN'; elGross.innerText = '0.00 PLN'; elTax.innerText = '0.00 PLN';
            return;
        }

        // Proste odsetki (bez skomplikowanej kapitalizacji w trakcie by uprościć)
        let profitGross = amount * (annualRate / 100) * (months / 12);
        let tax = applyTax ? (profitGross * 0.19) : 0;
        let profitNetto = profitGross - tax;

        elGross.innerText = profitGross.toFixed(2) + ' PLN';
        elTax.innerText = tax.toFixed(2) + ' PLN';
        elProfit.innerText = profitNetto.toFixed(2) + ' PLN';
    },

    calcROI: () => {
        let cost = parseFloat(document.getElementById('roi-cost').value);
        let revenue = parseFloat(document.getElementById('roi-revenue').value);
        
        let elPercent = document.getElementById('roi-percent');
        let elProfit = document.getElementById('roi-profit');

        if(isNaN(cost) || isNaN(revenue) || cost === 0) {
            elPercent.innerText = '0.00%'; elProfit.innerText = '0.00 PLN';
            return;
        }

        let profit = revenue - cost;
        let roi = (profit / cost) * 100;

        elProfit.innerText = profit.toFixed(2) + ' PLN';
        elPercent.innerText = roi.toFixed(2) + '%';

        const colorClass = profit >= 0 ? "text-emerald-500" : "text-red-500";
        elProfit.className = `text-3xl font-bold font-mono ${colorClass}`;
        elPercent.className = `text-3xl font-bold font-mono ${colorClass}`;
    }
};

setTimeout(kasiarzApp.init, 500);