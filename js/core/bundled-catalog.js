// ======================================================================
// PLIK: js/core/bundled-catalog.js (Katalog Aplikacji Dostarczonych z BigOS)
// Idempotentna instalacja aplikacji z katalogu Programy/ bez otwierania okien.
// Zapamiętuje decyzje o odinstalowaniu (localStorage: bigos_uninstalled_bundled_apps).
// Zapewnia ścieżkę ponownej instalacji (reinstall).
// ======================================================================

(function (global) {
    'use strict';

    const UNINSTALLED_KEY = 'bigos_uninstalled_bundled_apps';

    const BUNDLED_CATALOG = [
        {
            id: 'cookie_clicker',
            name: 'Ciasteczkowy Klikacz',
            icon: '🍪',
            category: 'Gry',
            description: 'Klasyczna gra klikacz w ciasteczka z ulepszeniami i automatyzacją.',
            file: 'Programy/cookie_clicker_bigos.js',
            code: "window.BigOSAppAPI.register({    id: 'cookie_clicker',    name: 'Ciasteczkowy Klikacz',    icon: '🍪',    width: '400px',    height: 'auto',    html: `        <div class=\"flex flex-col gap-4 p-4 items-center g-bg rounded-lg\">            <div class=\"text-center select-none\">                <h2 class=\"g-text text-3xl font-extrabold tracking-wide\" id=\"cookie_count\">0 ciasteczek</h2>                <p class=\"g-text-muted text-sm mt-1\" id=\"cookie_cps\">na sekundę (CPS): 0</p>            </div>                        <div class=\"relative my-4 flex items-center justify-center\">                <button onclick=\"window.BigCookieClicker.clickCookie()\" class=\"focus:outline-none transform active:scale-90 hover:scale-105 transition-all duration-100 select-none cursor-pointer\">                    <span class=\"text-9xl filter drop-shadow-lg block\">🍪</span>                </button>            </div>                        <div class=\"w-full g-panel p-3 rounded-xl border g-border flex flex-col gap-2\">                <h3 class=\"g-text font-bold text-sm border-b g-border pb-1.5 mb-1 flex justify-between\">                    <span>Sklep z ulepszeniami</span>                    <span class=\"g-text-muted text-xs font-normal\">Posiadane</span>                </h3>                                <button onclick=\"window.BigCookieClicker.buyClicker()\" id=\"btn_clicker\" class=\"g-btn flex justify-between items-center p-2.5 rounded-lg text-sm w-full transition-all duration-150\">                    <span class=\"font-medium\">👆 Auto-Klikacz (+0.1 CPS)</span>                    <span class=\"font-bold text-xs px-2 py-1 rounded g-bg\" id=\"cost_clicker\">15 🍪</span>                </button>                                <button onclick=\"window.BigCookieClicker.buyGrandma()\" id=\"btn_grandma\" class=\"g-btn flex justify-between items-center p-2.5 rounded-lg text-sm w-full transition-all duration-150\">                    <span class=\"font-medium\">👵 Babcia (+1.0 CPS)</span>                    <span class=\"font-bold text-xs px-2 py-1 rounded g-bg\" id=\"cost_grandma\">100 🍪</span>                </button>                                <button onclick=\"window.BigCookieClicker.buyFactory()\" id=\"btn_factory\" class=\"g-btn flex justify-between items-center p-2.5 rounded-lg text-sm w-full transition-all duration-150\">                    <span class=\"font-medium\">🏭 Fabryka (+8.0 CPS)</span>                    <span class=\"font-bold text-xs px-2 py-1 rounded g-bg\" id=\"cost_factory\">1100 🍪</span>                </button>                                <button onclick=\"window.BigCookieClicker.buyMine()\" id=\"btn_mine\" class=\"g-btn flex justify-between items-center p-2.5 rounded-lg text-sm w-full transition-all duration-150\">                    <span class=\"font-medium\">🚀 Kopalnia (+47.0 CPS)</span>                    <span class=\"font-bold text-xs px-2 py-1 rounded g-bg\" id=\"cost_mine\">12000 🍪</span>                </button>            </div>                        <div class=\"w-full flex justify-between text-xs g-text-muted px-1 mt-1 border-t g-border pt-2\">                <span id=\"stat_clicks\">Kliknięcia: 0</span>                <span id=\"stat_owned\">Ulepszenia: 0</span>            </div>        </div>    `,    globalName: 'BigCookieClicker',    global: {        state: {            cookies: 0,            totalClicks: 0,            upgradesOwned: 0,            upgrades: {                clicker: { cost: 15, cps: 0.1, count: 0 },                grandma: { cost: 100, cps: 1.0, count: 0 },                factory: { cost: 1100, cps: 8.0, count: 0 },                mine: { cost: 12000, cps: 47.0, count: 0 }            }        },        clickCookie: () => {            const self = window.BigCookieClicker;            self.state.cookies += 1;            self.state.totalClicks += 1;            self.updateUI();        },        buyClicker: () => {            window.BigCookieClicker.buyUpgrade('clicker');        },        buyGrandma: () => {            window.BigCookieClicker.buyUpgrade('grandma');        },        buyFactory: () => {            window.BigCookieClicker.buyUpgrade('factory');        },        buyMine: () => {            window.BigCookieClicker.buyUpgrade('mine');        },        buyUpgrade: (type) => {            const self = window.BigCookieClicker;            const upgrade = self.state.upgrades[type];            if (self.state.cookies >= upgrade.cost) {                self.state.cookies -= upgrade.cost;                upgrade.count += 1;                self.state.upgradesOwned += 1;                upgrade.cost = Math.floor(upgrade.cost * 1.15);                self.updateUI();            }        },        getCPS: () => {            const self = window.BigCookieClicker;            let totalCPS = 0;            for (const key in self.state.upgrades) {                totalCPS += self.state.upgrades[key].count * self.state.upgrades[key].cps;            }            return parseFloat(totalCPS.toFixed(1));        },        updateUI: () => {            const self = window.BigCookieClicker;            const elCookies = document.getElementById('cookie_count');            if (!elCookies) return;                        const displayCookies = Math.floor(self.state.cookies);            elCookies.innerText = displayCookies + (displayCookies === 1 ? ' ciasteczko' : ' ciasteczek');                        const cps = self.getCPS();            document.getElementById('cookie_cps').innerText = 'na sekundę (CPS): ' + cps.toFixed(1);                        for (const key in self.state.upgrades) {                const upgrade = self.state.upgrades[key];                const btn = document.getElementById('btn_' + key);                const costEl = document.getElementById('cost_' + key);                                if (costEl) {                    costEl.innerText = upgrade.cost + ' 🍪 [x' + upgrade.count + ']';                }                                if (btn) {                    if (self.state.cookies >= upgrade.cost) {                        btn.style.opacity = '1';                        btn.style.cursor = 'pointer';                    } else {                        btn.style.opacity = '0.5';                        btn.style.cursor = 'not-allowed';                    }                }            }                        const elClicks = document.getElementById('stat_clicks');            if (elClicks) elClicks.innerText = 'Kliknięcia: ' + self.state.totalClicks;                        const elOwned = document.getElementById('stat_owned');            if (elOwned) elOwned.innerText = 'Ulepszenia: ' + self.state.upgradesOwned;        },        tick: () => {            const self = window.BigCookieClicker;            const cps = self.getCPS();            if (cps > 0) {                self.state.cookies += cps / 10;                self.updateUI();            }        }    },    init: () => {        if (window.BigCookieClickerInterval) {            clearInterval(window.BigCookieClickerInterval);        }                window.BigCookieClickerInterval = setInterval(() => {            if (document.getElementById('cookie_count')) {                window.BigCookieClicker.tick();            } else {                clearInterval(window.BigCookieClickerInterval);            }        }, 100);                window.BigCookieClicker.updateUI();    }});"
        },
        {
            id: 'kalkulator_bmi',
            name: 'Kalkulator BMI',
            icon: '⚖️',
            category: 'Narzędzia',
            description: 'Kalkulator wskaźnika masy ciała (BMI) z klasyfikacją wyników.',
            file: 'Programy/kalkulator_bmi_bigos.js',
            code: "window.BigOSAppAPI.register({    id: 'kalkulator_bmi',    name: 'Kalkulator BMI',    icon: '⚖️',    width: '350px',    height: 'auto',    html: `        <div class=\"flex flex-col gap-4 p-2\">            <h3 class=\"g-text font-bold text-xl text-center mb-1\">Kalkulator BMI</h3>                        <div class=\"flex flex-col gap-1\">                <label class=\"g-text-muted text-sm font-medium\">Waga (kg):</label>                <input type=\"number\" id=\"bmi_weight\" class=\"g-bg g-text p-2.5 rounded border g-border w-full outline-none focus:border-blue-500\" placeholder=\"np. 70\" step=\"0.1\">            </div>            <div class=\"flex flex-col gap-1\">                <label class=\"g-text-muted text-sm font-medium\">Wzrost (cm):</label>                <input type=\"number\" id=\"bmi_height\" class=\"g-bg g-text p-2.5 rounded border g-border w-full outline-none focus:border-blue-500\" placeholder=\"np. 175\">            </div>            <button onclick=\"window.KalkulatorBMI.oblicz()\" class=\"g-btn p-3 rounded font-bold shadow-md bg-blue-600/20 hover:bg-blue-600 border-blue-500/50 mt-2\">                Oblicz BMI            </button>            <div id=\"bmi_output_box\" class=\"g-panel p-4 rounded border g-border hidden flex flex-col items-center gap-2 mt-2\">                <span class=\"g-text-muted text-sm\">Twój wskaźnik BMI</span>                <div id=\"bmi_val\" class=\"g-text text-3xl font-black\">22.5</div>                <div id=\"bmi_desc\" class=\"font-bold px-3 py-1 rounded text-sm mt-1\">Waga prawidłowa</div>            </div>        </div>    `,    globalName: 'KalkulatorBMI',    global: {        oblicz: function() {            var weightInput = document.getElementById('bmi_weight');            var heightInput = document.getElementById('bmi_height');            var outputBox = document.getElementById('bmi_output_box');            var valDiv = document.getElementById('bmi_val');            var descDiv = document.getElementById('bmi_desc');            if (!weightInput || !heightInput || !outputBox || !valDiv || !descDiv) {                return;            }            var weight = parseFloat(weightInput.value) || 0;            var height = parseFloat(heightInput.value) || 0;            if (weight <= 0 || height <= 0) {                alert('Proszę podać prawidłową wagę i wzrost!');                return;            }            var heightInMeters = height / 100;            var bmi = weight / (heightInMeters * heightInMeters);            var bmiRounded = bmi.toFixed(1);            var description = '';            var colorClass = '';            var bgClass = '';            if (bmi < 18.5) {                description = 'Niedowaga';                colorClass = 'text-blue-400';                bgClass = 'bg-blue-500/10';            } else if (bmi >= 18.5 && bmi < 25) {                description = 'Waga prawidłowa';                colorClass = 'text-green-400';                bgClass = 'bg-green-500/10';            } else if (bmi >= 25 && bmi < 30) {                description = 'Nadwaga';                colorClass = 'text-yellow-400';                bgClass = 'bg-yellow-500/10';            } else {                description = 'Otyłość';                colorClass = 'text-red-400';                bgClass = 'bg-red-500/10';            }            valDiv.innerText = bmiRounded;            descDiv.innerText = description;            descDiv.className = 'font-bold px-3 py-1 rounded text-sm mt-1 ' + colorClass + ' ' + bgClass;                        outputBox.classList.remove('hidden');        }    },    init: function() {        console.log(\"Kalkulator BMI gotowy!\");    }});"
        },
        {
            id: 'bigos_painter',
            name: 'BigPaint Studio',
            icon: '🎨',
            category: 'Grafika',
            description: 'Studio malarskie do rysowania i szkicowania z eksportem do JPG.',
            file: 'Programy/bigos_painter_bigos.js',
            code: "window.BigOSAppAPI.register({    id: 'bigos_painter',    name: 'BigPaint Studio',    icon: '🎨',    width: '800px',    height: '600px',    html: `        <div class=\"flex flex-col gap-2 h-full\">            <div class=\"flex gap-2 items-center g-bg p-2 rounded\">                <input type=\"color\" id=\"paint_color\" class=\"w-10 h-10 cursor-pointer\">                <input type=\"range\" id=\"paint_size\" min=\"1\" max=\"50\" value=\"5\" class=\"w-24\">                <button onclick=\"window.BigPaint.clear()\" class=\"g-btn px-3 py-1\">Wyczyść</button>                <button onclick=\"window.BigPaint.save()\" class=\"g-btn px-3 py-1\">Zapisz JPG</button>            </div>            <canvas id=\"paint_canvas\" class=\"g-bg g-border rounded cursor-crosshair w-full flex-grow\" style=\"background: white;\"></canvas>        </div>    `,    globalName: 'BigPaint',    global: {        clear: () => {            const canvas = document.getElementById('paint_canvas');            const ctx = canvas.getContext('2d');            ctx.clearRect(0, 0, canvas.width, canvas.height);        },        save: () => {            const canvas = document.getElementById('paint_canvas');            const link = document.createElement('a');            link.download = 'obraz.jpg';            link.href = canvas.toDataURL('image/jpeg');            link.click();        }    },    init: () => {        const canvas = document.getElementById('paint_canvas');        canvas.width = 750;        canvas.height = 450;        const ctx = canvas.getContext('2d');        let drawing = false;        ctx.lineCap = 'round';        canvas.addEventListener('mousedown', () => drawing = true);        canvas.addEventListener('mouseup', () => { drawing = false; ctx.beginPath(); });        canvas.addEventListener('mousemove', (e) => {            if (!drawing) return;            const rect = canvas.getBoundingClientRect();            ctx.lineWidth = document.getElementById('paint_size').value;            ctx.strokeStyle = document.getElementById('paint_color').value;            ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);            ctx.stroke();            ctx.beginPath();            ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);        });    }});"
        }
    ];

    function getUninstalledIds() {
        try {
            const raw = localStorage.getItem(UNINSTALLED_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (_) { return []; }
    }

    function isUninstalled(id) {
        return getUninstalledIds().includes(id);
    }

    function markUninstalled(id) {
        const list = getUninstalledIds();
        if (!list.includes(id)) {
            list.push(id);
            try { localStorage.setItem(UNINSTALLED_KEY, JSON.stringify(list)); } catch (_) {}
        }
    }

    function clearUninstalled(id) {
        let list = getUninstalledIds();
        list = list.filter((x) => x !== id);
        try { localStorage.setItem(UNINSTALLED_KEY, JSON.stringify(list)); } catch (_) {}
    }

    function getUninstalledApps() {
        const uninstalled = getUninstalledIds();
        return BUNDLED_CATALOG.filter((app) => uninstalled.includes(app.id));
    }

    function calculateFreeDesktopPos() {
        if (!Array.isArray(global.fileSystem)) return { x: 30, y: 30 };
        const maxRows = Math.max(1, Math.floor(((typeof window !== 'undefined' ? window.innerHeight : 800) - 120) / 100));
        let col = 0, row = 0;
        for (let tries = 0; tries < 50; tries++) {
            const checkX = 30 + (col * 90);
            const checkY = 30 + (row * 100);
            const occupied = global.fileSystem.some((f) => f && f.parentId === 'root' && Math.abs(f.x - checkX) < 40 && Math.abs(f.y - checkY) < 40);
            if (!occupied) return { x: checkX, y: checkY };
            row++;
            if (row >= maxRows) { row = 0; col++; }
        }
        return { x: 30, y: 30 };
    }

    function registerInUI(record) {
        if (!record || !record.id) return false;
        let modified = false;

        // 1. defaultApps
        if (Array.isArray(global.defaultApps) && !global.defaultApps.some((a) => a.appId === record.id)) {
            global.defaultApps.push({
                id: 'app_' + record.id,
                type: 'app',
                name: record.name,
                icon: record.icon || '📦',
                appId: record.id,
                category: record.category || 'Programy'
            });
            modified = true;
        }

        // 2. Desktop icon in fileSystem
        if (Array.isArray(global.fileSystem) && !global.fileSystem.some((f) => f && (f.appId === record.id || f.id === 'app_' + record.id))) {
            const pos = calculateFreeDesktopPos();
            const item = {
                id: 'app_' + record.id,
                type: 'app',
                name: record.name,
                icon: record.icon || '📦',
                appId: record.id,
                parentId: 'root',
                x: pos.x,
                y: pos.y
            };
            if (global.bigosState && global.bigosState.push) {
                global.bigosState.push(item);
            } else {
                global.fileSystem.push(item);
            }
            modified = true;
        }

        // 3. Start menu button
        if (typeof document !== 'undefined') {
            const startMenu = document.getElementById('start-menu-list');
            if (startMenu && !document.getElementById('start-btn-' + record.id)) {
                const btn = document.createElement('button');
                btn.id = 'start-btn-' + record.id;
                btn.className = 'start-item flex items-center gap-3 p-2 hover:bg-white/10 rounded w-full text-left transition g-text font-medium';
                btn.onclick = () => {
                    if (global.bigosSandbox && global.bigosSandbox.launchPackage) {
                        global.bigosSandbox.launchPackage(record.id).catch((err) => {
                            if (global.apps && global.apps.showToast) global.apps.showToast('Błąd', err.message, 'error');
                        });
                    }
                    if (global.apps && global.apps.toggleStartMenu) global.apps.toggleStartMenu();
                };
                btn.innerHTML = `<span class="text-xl drop-shadow-sm">${record.icon || '📦'}</span> <span class="app-name">${record.name}</span>`;
                const headers = startMenu.querySelectorAll('.start-header');
                if (headers.length > 1) startMenu.insertBefore(btn, headers[1]);
                else startMenu.appendChild(btn);
            }
        }

        // 4. bigosAppRegistry (if active)
        if (typeof global.bigosAppRegistry !== 'undefined' && !global.bigosAppRegistry.get(record.id)) {
            try {
                global.bigosAppRegistry.register({
                    id: record.id,
                    name: record.name,
                    icon: record.icon || '📦',
                    category: record.category || 'Programy',
                    launch: () => (global.bigosSandbox ? global.bigosSandbox.launchPackage(record.id) : null)
                });
            } catch (_) {}
        }

        return modified;
    }

    async function installAllIfMissing() {
        // Do not auto-install during recovery or maintenance locks
        if (global.bigosFSState && global.bigosFSState.isRecovery) {
            return { ok: false, reason: 'recovery_mode' };
        }
        if (global.bigosDB && global.bigosDB.isMaintenanceLocked && global.bigosDB.isMaintenanceLocked()) {
            return { ok: false, reason: 'maintenance_locked' };
        }
        if (!global.bigosSandbox || !global.bigosSandbox.installPackage) {
            return { ok: false, reason: 'sandbox_unavailable' };
        }

        const uninstalled = getUninstalledIds();
        let anyModified = false;

        for (const app of BUNDLED_CATALOG) {
            // Respect user uninstallation
            if (uninstalled.includes(app.id)) continue;

            let existing = null;
            if (global.bigosDB && global.bigosDB.getPackage) {
                try { existing = await global.bigosDB.getPackage(app.id); } catch (_) {}
            }

            let record = existing;
            if (!record) {
                try {
                    record = await global.bigosSandbox.installPackage(app.code, {
                        source: 'bundled',
                        category: app.category
                    });
                } catch (e) {
                    if (global.diag) global.diag.warn('bundled', `Failed to auto-install ${app.id}`, { error: e.message });
                    continue;
                }
            }

            if (record) {
                const added = registerInUI(record);
                if (added) anyModified = true;
            }
        }

        if (anyModified) {
            if (global.fsManager && global.fsManager.save) {
                try { await global.fsManager.save(); } catch (_) {}
            }
            if (global.desktop && global.desktop.render) {
                try { global.desktop.render(); } catch (_) {}
            }
        }

        return { ok: true, installed: true };
    }

    async function reinstall(appId) {
        const app = BUNDLED_CATALOG.find((a) => a.id === appId);
        if (!app) throw new Error('Nie znaleziono aplikacji w katalogu: ' + appId);

        clearUninstalled(appId);

        let record = null;
        if (global.bigosSandbox && global.bigosSandbox.installPackage) {
            record = await global.bigosSandbox.installPackage(app.code, {
                source: 'bundled',
                category: app.category
            });
        }
        if (record) {
            registerInUI(record);
            if (global.fsManager && global.fsManager.save) await global.fsManager.save();
            if (global.desktop && global.desktop.render) global.desktop.render();
            if (global.menadzerApp && global.menadzerApp.renderList) global.menadzerApp.renderList();
        }
        return record;
    }

    const bundledCatalog = {
        CATALOG: BUNDLED_CATALOG,
        getAll: () => BUNDLED_CATALOG.slice(),
        get: (id) => BUNDLED_CATALOG.find((a) => a.id === id) || null,
        isBundled: (id) => BUNDLED_CATALOG.some((a) => a.id === id),
        getUninstalledIds,
        isUninstalled,
        markUninstalled,
        clearUninstalled,
        getUninstalledApps,
        installAllIfMissing,
        reinstall
    };

    global.bundledCatalog = bundledCatalog;
})(typeof window !== 'undefined' ? window : globalThis);
