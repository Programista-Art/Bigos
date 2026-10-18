// Helper to generate js/core/bundled-catalog.js from Programy/ files
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ccCode = fs.readFileSync(path.join(root, 'Programy/cookie_clicker_bigos.js'), 'utf8');
const bmiCode = fs.readFileSync(path.join(root, 'Programy/kalkulator_bmi_bigos.js'), 'utf8');
const bpCode = fs.readFileSync(path.join(root, 'Programy/bigos_painter_bigos.js'), 'utf8');

const output = `// ======================================================================
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
            code: ${JSON.stringify(ccCode)}
        },
        {
            id: 'kalkulator_bmi',
            name: 'Kalkulator BMI',
            icon: '⚖️',
            category: 'Narzędzia',
            description: 'Kalkulator wskaźnika masy ciała (BMI) z klasyfikacją wyników.',
            file: 'Programy/kalkulator_bmi_bigos.js',
            code: ${JSON.stringify(bmiCode)}
        },
        {
            id: 'bigos_painter',
            name: 'BigPaint Studio',
            icon: '🎨',
            category: 'Grafika',
            description: 'Studio malarskie do rysowania i szkicowania z eksportem do JPG.',
            file: 'Programy/bigos_painter_bigos.js',
            code: ${JSON.stringify(bpCode)}
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
                btn.innerHTML = \`<span class="text-xl drop-shadow-sm">\${record.icon || '📦'}</span> <span class="app-name">\${record.name}</span>\`;
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
                    if (global.diag) global.diag.warn('bundled', \`Failed to auto-install \${app.id}\`, { error: e.message });
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
`;

fs.writeFileSync(path.join(root, 'js/core/bundled-catalog.js'), output, 'utf8');
console.log('Successfully generated js/core/bundled-catalog.js');
