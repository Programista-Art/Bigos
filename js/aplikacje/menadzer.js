// ======================================================================
// PLIK: js/aplikacje/menadzer.js (Menedżer Aplikacji - Zarządzanie i Wymiana)
// Zapewnia wyszukiwanie z obsługą języka polskiego, sortowanie, klasyfikację
// z autorytatywnego magazynu pakietów (IndexedDB) oraz instalację/odinstalowanie.
// ======================================================================

const menadzerApp = {
    searchTerm: '',
    sortOption: 'name-asc',
    lastPackageSig: '',

    init: () => {
        menadzerApp.upgradeUI();

        // 1. Automatyczna rejestracja w systemie
        if (typeof defaultApps !== 'undefined' && !defaultApps.find(a => a.appId === 'menadzer')) {
            defaultApps.push({ id: 'app_menadzer', type: 'app', name: 'Menedżer Aplikacji', icon: '⚙️', appId: 'menadzer', category: 'Systemowe' });
        }

        // 2. Automatyczne dodanie przycisku do Menu Start (Szuflada)
        setTimeout(() => {
            const startMenu = document.getElementById('start-menu-list');
            if (startMenu && !document.getElementById('start-btn-menadzer')) {
                const btn = document.createElement('button');
                btn.id = 'start-btn-menadzer';
                btn.className = 'start-item flex items-center gap-3 p-2 hover:bg-white/10 rounded w-full text-left transition g-text font-medium';
                btn.onclick = () => { winManager.open('menadzer'); if (typeof apps !== 'undefined' && apps.toggleStartMenu) apps.toggleStartMenu(); };
                btn.innerHTML = `<span class="text-xl drop-shadow-sm">⚙️</span> <span class="app-name">Menedżer Aplikacji</span>`;

                const headers = startMenu.querySelectorAll('.start-header');
                if (headers.length > 1) startMenu.insertBefore(btn, headers[1]);
                else startMenu.appendChild(btn);
            }
        }, 500);

        // 3. Auto-odświeżanie na żywo w oparciu o bazę pakietów
        setInterval(async () => {
            const win = document.getElementById('app-menadzer');
            if (win && win.classList.contains('active')) {
                if (typeof bigosDB !== 'undefined' && bigosDB.listPackages) {
                    try {
                        const pkgs = (await bigosDB.listPackages()) || [];
                        const sig = pkgs.map(p => p.id).sort().join(',');
                        if (sig !== menadzerApp.lastPackageSig) {
                            menadzerApp.lastPackageSig = sig;
                            menadzerApp.renderList();
                        }
                    } catch (_) {}
                }
            }
        }, 1200);
    },

    escapeHTML: (str) => {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    normalizeSearch: (str) => {
        if (!str) return '';
        let s = String(str)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/ł/g, 'l')
            .trim();
        s = s.replace(/\bmenad/g, 'mened');
        return s;
    },

    upgradeUI: () => {
        let appWindow = document.getElementById('app-menadzer');
        if (!appWindow) {
            appWindow = document.createElement('div');
            appWindow.id = 'app-menadzer';
            appWindow.className = 'window absolute hidden';

            appWindow.addEventListener('mousedown', function () {
                if (typeof winManager !== 'undefined') winManager.bringToFront(this);
            });

            document.body.appendChild(appWindow);
        }

        appWindow.style.width = '700px';
        appWindow.style.height = '600px';
        appWindow.style.background = 'transparent';
        appWindow.style.border = 'none';
        appWindow.style.boxShadow = 'none';

        appWindow.innerHTML = `
            <div class="flex flex-col h-full themed-app g-panel border g-border rounded-lg shadow-2xl overflow-hidden">
                <!-- Pasek tytułowy -->
                <div class="px-4 py-2.5 border-b g-border flex justify-between items-center bg-black/20 cursor-move shrink-0 select-none" onmousedown="winManager.startDrag(event, 'app-menadzer')" ontouchstart="winManager.startDrag(event, 'app-menadzer')">
                    <span class="text-sm font-bold g-accent drop-shadow-md flex items-center gap-2"><span>⚙️</span> Menedżer Aplikacji</span>
                    <div class="flex items-center gap-1">
                        <button onclick="winManager.minimize('menadzer')" class="g-icon-btn px-2 py-0.5 rounded hover:bg-white/10 transition" aria-label="Minimalizuj">_</button>
                        <button onclick="winManager.close('menadzer')" class="text-red-500 hover:text-red-400 px-2 py-0.5 rounded hover:bg-red-500/20 font-bold transition" aria-label="Zamknij">✖</button>
                    </div>
                </div>

                <!-- Przejrzysty pasek narzędziowy w wycentrowanej grupie -->
                <div class="menadzer-toolbar-wrap p-2.5 border-b g-border bg-black/10 shrink-0">
                    <div class="menadzer-toolbar flex flex-wrap items-center justify-center gap-2 w-full">
                        <button id="menadzer-install-btn" onclick="document.getElementById('menadzer-import-file').click()" 
                                class="g-btn h-8 px-3.5 bg-emerald-600/30 text-emerald-400 border-emerald-500/60 hover:bg-emerald-500 hover:text-white rounded-lg transition font-bold text-xs shadow-md inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-400" 
                                title="Zainstaluj aplikację z pliku .js, .json, .txt lub .bigos">
                            <span>📦</span><span>Instaluj</span>
                        </button>
                        <button onclick="menadzerApp.arrangeDesktop()" 
                                class="g-btn h-8 px-3 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition font-semibold text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 focus:outline-none focus:ring-1 focus:ring-yellow-400" 
                                title="Uporządkuj ikony na pulpicie w siatkę">
                            <span>🧹</span><span>Uporządkuj</span>
                        </button>
                        <button onclick="menadzerApp.repairDesktop()" 
                                class="g-btn h-8 px-3 hover:bg-blue-500/20 text-blue-400 rounded-lg transition font-semibold text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-400" 
                                title="Przywróć brakujące ikony systemowe">
                            <span>🛟</span><span>Przywróć Ikony</span>
                        </button>
                        <button id="menadzer-restore-catalog-btn" onclick="menadzerApp.showRestoreCatalogModal()" 
                                class="hidden g-btn h-8 px-3 hover:bg-purple-500/20 text-purple-300 rounded-lg transition font-semibold text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 focus:outline-none focus:ring-1 focus:ring-purple-400" 
                                title="Przywróć odinstalowane aplikacje z katalogu Programy">
                            <span>🔄</span><span>Przywróć z katalogu</span>
                        </button>
                    </div>
                    <input type="file" id="menadzer-import-file" class="hidden" accept=".js,.json,.txt,.bigos" onchange="menadzerApp.importApp(event)">
                </div>

                <!-- Dedykowany obszar wyszukiwania i sortowania -->
                <div class="p-3 border-b g-border bg-black/20 shrink-0 flex flex-col gap-2">
                    <div class="menadzer-search-row flex flex-wrap items-center justify-between gap-2.5">
                        <div class="relative flex-1 min-w-[180px]">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-50 pointer-events-none select-none">🔍</span>
                            <input type="text" id="menadzer-search" placeholder="Szukaj aplikacji..." 
                                   class="w-full pl-9 pr-9 py-2 text-xs rounded-lg g-bg g-text border g-border focus:border-blue-500 outline-none transition focus:ring-1 focus:ring-blue-400"
                                   oninput="menadzerApp.onSearch(this.value)">
                            <button id="menadzer-search-clear" onclick="menadzerApp.clearSearch()" 
                                    class="hidden absolute right-3 top-1/2 -translate-y-1/2 text-xs g-text-muted hover:text-white p-1 rounded transition focus:outline-none focus:ring-1 focus:ring-blue-400" title="Wyczyść wyszukiwanie">✖</button>
                        </div>

                        <div class="flex items-center gap-2 shrink-0">
                            <label for="menadzer-sort" class="text-xs g-text-muted font-medium whitespace-nowrap">Sortuj:</label>
                            <select id="menadzer-sort" onchange="menadzerApp.onSort(this.value)" 
                                    class="text-xs py-2 px-2.5 rounded-lg g-bg g-text border g-border outline-none cursor-pointer focus:ring-1 focus:ring-blue-400 transition">
                                <option value="name-asc">Nazwa (A-Z)</option>
                                <option value="name-desc">Nazwa (Z-A)</option>
                                <option value="category">Kategoria</option>
                                <option value="date-desc">Data instalacji</option>
                            </select>
                        </div>
                    </div>

                    <div class="flex justify-between items-center px-0.5">
                        <span id="menadzer-count" class="text-[11px] g-text-muted font-medium">Liczba aplikacji: 0</span>
                    </div>
                </div>

                <!-- Przewijana lista aplikacji -->
                <div class="flex-grow p-3 bg-black/10 overflow-y-auto custom-scrollbar">
                    <div id="menadzer-list" class="flex flex-col gap-2.5">
                        <!-- Wypełniane dynamicznie -->
                    </div>
                </div>
            </div>
        `;

        menadzerApp.renderList();
    },

    onSearch: (query) => {
        menadzerApp.searchTerm = String(query || '');
        const clearBtn = document.getElementById('menadzer-search-clear');
        if (clearBtn) clearBtn.style.display = menadzerApp.searchTerm ? 'block' : 'none';
        return menadzerApp.renderList();
    },

    clearSearch: () => {
        menadzerApp.searchTerm = '';
        const input = document.getElementById('menadzer-search');
        if (input) input.value = '';
        const clearBtn = document.getElementById('menadzer-search-clear');
        if (clearBtn) clearBtn.style.display = 'none';
        return menadzerApp.renderList();
    },

    onSort: (sortOption) => {
        menadzerApp.sortOption = sortOption || 'name-asc';
        return menadzerApp.renderList();
    },

    launchApp: (appId) => {
        if (!appId) return;
        if (typeof bigosSandbox !== 'undefined' && bigosSandbox.isMounted && bigosSandbox.isMounted(appId)) {
            if (typeof winManager !== 'undefined') winManager.open(appId);
            return;
        }
        if (typeof bigosSandbox !== 'undefined' && bigosSandbox.launchPackage) {
            bigosSandbox.launchPackage(appId).catch(() => {
                if (typeof winManager !== 'undefined') winManager.open(appId);
            });
            return;
        }
        if (typeof winManager !== 'undefined') winManager.open(appId);
    },

    arrangeDesktop: () => {
        if (typeof fileSystem === 'undefined') return;

        let col = 0;
        let row = 0;
        const maxRows = Math.max(1, Math.floor((window.innerHeight - 120) / 100));
        const desktopItems = fileSystem.filter(f => f && f.parentId === 'root');

        desktopItems.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            if (a.type === 'app' && b.type !== 'app') return -1;
            if (a.type !== 'app' && b.type === 'app') return 1;
            return (a.name || '').localeCompare(b.name || '', 'pl', { sensitivity: 'base' });
        });

        desktopItems.forEach(item => {
            item.x = 30 + (col * 90);
            item.y = 30 + (row * 100);
            row++;
            if (row >= maxRows) {
                row = 0;
                col++;
            }
        });

        if (typeof fsManager !== 'undefined') fsManager.save();
        if (typeof desktop !== 'undefined') desktop.render();
        if (typeof apps !== 'undefined') apps.showToast('Pulpit', 'Wszystkie ikony zostały wyrównane do siatki.', 'success');
    },

    repairDesktop: () => {
        if (typeof defaultApps === 'undefined' || typeof fileSystem === 'undefined') return;
        let added = 0;

        const getFreePosition = () => {
            let placed = false, checkX = 30, checkY = 30, col = 0, row = 0;
            const maxRows = Math.max(1, Math.floor((window.innerHeight - 120) / 100));
            while (!placed) {
                checkX = 30 + (col * 90); checkY = 30 + (row * 100);
                const isOccupied = fileSystem.some(f => f && f.parentId === 'root' && Math.abs(f.x - checkX) < 40 && Math.abs(f.y - checkY) < 40);
                if (!isOccupied) { placed = true; return { x: checkX, y: checkY }; }
                row++;
                if (row >= maxRows) { row = 0; col++; }
                if (col > 25) return { x: 50 + Math.random() * 200, y: 50 + Math.random() * 200 };
            }
            return { x: 30, y: 30 };
        };

        defaultApps.forEach(app => {
            if (app.type === 'app' && !fileSystem.find(f => f && (f.appId === app.appId || f.id === app.id))) {
                const pos = getFreePosition();
                fileSystem.push({
                    id: app.id || 'app_' + app.appId,
                    type: 'app',
                    name: app.name,
                    icon: app.icon || '📦',
                    appId: app.appId,
                    parentId: 'root',
                    x: pos.x,
                    y: pos.y
                });
                added++;
            }
        });

        if (added > 0) {
            if (typeof fsManager !== 'undefined') fsManager.save();
            if (typeof desktop !== 'undefined') desktop.render();
            if (typeof apps !== 'undefined') apps.showToast('Naprawa', `Przywrócono ${added} ikon na Pulpicie!`, 'success');
        } else {
            if (typeof apps !== 'undefined') apps.showToast('Pulpit w porządku', 'Wszystkie ikony systemowe znajdują się na pulpicie.', 'info');
        }
    },

    renderList: async () => {
        const list = document.getElementById('menadzer-list');
        if (!list) return;

        // Restore input states if DOM was rerendered
        const searchInput = document.getElementById('menadzer-search');
        if (searchInput && searchInput.value !== menadzerApp.searchTerm) {
            searchInput.value = menadzerApp.searchTerm;
        }
        const sortSelect = document.getElementById('menadzer-sort');
        if (sortSelect && sortSelect.value !== menadzerApp.sortOption) {
            sortSelect.value = menadzerApp.sortOption;
        }

        // Show/hide restore catalog button if uninstalled bundled apps exist
        const restoreBtn = document.getElementById('menadzer-restore-catalog-btn');
        if (restoreBtn && typeof bundledCatalog !== 'undefined') {
            const uninstalledCount = bundledCatalog.getUninstalledApps().length;
            if (uninstalledCount > 0) {
                restoreBtn.classList.remove('hidden');
                restoreBtn.innerText = `🔄 Przywróć z katalogu (${uninstalledCount})`;
            } else {
                restoreBtn.classList.add('hidden');
            }
        }

        // 1. Fetch authoritative package store
        let installedPackages = [];
        if (typeof bigosDB !== 'undefined' && bigosDB.listPackages) {
            try {
                installedPackages = (await bigosDB.listPackages()) || [];
            } catch (_) {}
        }
        menadzerApp.lastPackageSig = installedPackages.map(p => p.id).sort().join(',');

        // 2. Build unified, deduplicated list
        const appsList = [];
        const seenIds = new Set();

        // Installed packages are primary for package IDs
        for (const pkg of installedPackages) {
            const id = pkg.id || pkg.appId;
            if (!id || seenIds.has(id)) continue;
            seenIds.add(id);

            let cat = pkg.category;
            if (!cat && typeof bundledCatalog !== 'undefined' && bundledCatalog.isBundled(id)) {
                const b = bundledCatalog.get(id);
                if (b) cat = b.category;
            }
            if (!cat) cat = 'Zainstalowane';

            appsList.push({
                id: id,
                appId: id,
                name: pkg.name || id,
                icon: pkg.icon || '📦',
                type: 'package',
                category: cat,
                version: pkg.version || '1.0.0',
                installedAt: pkg.installedAt || 0,
                permissions: pkg.permissions || [],
                source: pkg.source || 'import',
                pkgRecord: pkg
            });
        }

        // Add genuine built-in applications from defaultApps (strictly exclude folders like hasiok)
        if (typeof defaultApps !== 'undefined' && Array.isArray(defaultApps)) {
            for (const app of defaultApps) {
                const id = app.appId || app.id;
                if (!id || seenIds.has(id)) continue;

                // Exclude folders (such as hasiok), format triggers, and non-apps
                if (app.type !== 'app') continue;
                if (id === 'hasiok' || id === 'format' || (app.name && app.name.toLowerCase().includes('kosz'))) continue;

                seenIds.add(id);
                appsList.push({
                    id: id,
                    appId: id,
                    name: app.name,
                    icon: app.icon || '📦',
                    type: 'builtin',
                    category: app.category || 'Systemowe',
                    version: 'BigOS 2.0',
                    installedAt: 0,
                    permissions: ['Wbudowana'],
                    source: 'System BigOS',
                    pkgRecord: null
                });
            }
        }

        // 3. Filter by search term with Polish diacritic normalization
        const queryNorm = menadzerApp.normalizeSearch(menadzerApp.searchTerm);
        const filtered = appsList.filter((app) => {
            if (!queryNorm) return true;
            const nameNorm = menadzerApp.normalizeSearch(app.name);
            const catNorm = menadzerApp.normalizeSearch(app.category);
            const typeNorm = app.type === 'builtin' ? 'systemowa' : 'zainstalowana';
            return nameNorm.includes(queryNorm) || catNorm.includes(queryNorm) || typeNorm.includes(queryNorm);
        });

        // 4. Sort with Polish alphabetical ordering
        filtered.sort((a, b) => {
            switch (menadzerApp.sortOption) {
                case 'name-asc':
                    return (a.name || '').localeCompare(b.name || '', 'pl', { sensitivity: 'base' });
                case 'name-desc':
                    return (b.name || '').localeCompare(a.name || '', 'pl', { sensitivity: 'base' });
                case 'category': {
                    const c = (a.category || '').localeCompare(b.category || '', 'pl', { sensitivity: 'base' });
                    if (c !== 0) return c;
                    return (a.name || '').localeCompare(b.name || '', 'pl', { sensitivity: 'base' });
                }
                case 'date-desc': {
                    const diff = (b.installedAt || 0) - (a.installedAt || 0);
                    if (diff !== 0) return diff;
                    return (a.name || '').localeCompare(b.name || '', 'pl', { sensitivity: 'base' });
                }
                default:
                    return (a.name || '').localeCompare(b.name || '', 'pl', { sensitivity: 'base' });
            }
        });

        // 5. Update matching count
        const countEl = document.getElementById('menadzer-count');
        if (countEl) {
            if (menadzerApp.searchTerm) {
                countEl.textContent = `Liczba aplikacji: ${filtered.length} (z ${appsList.length})`;
            } else {
                countEl.textContent = `Liczba aplikacji: ${appsList.length}`;
            }
        }

        // 6. Render list items
        list.innerHTML = '';
        if (filtered.length === 0) {
            list.innerHTML = `
                <div class="p-8 text-center g-text-muted flex flex-col items-center gap-2">
                    <span class="text-3xl">🔍</span>
                    <p class="text-sm font-medium">Brak aplikacji spełniających kryteria wyszukiwania.</p>
                    ${menadzerApp.searchTerm ? '<button onclick="menadzerApp.clearSearch()" class="mt-1 text-xs text-blue-400 hover:underline">Wyczyść filtr wyszukiwania</button>' : ''}
                </div>
            `;
            return;
        }

        filtered.forEach(app => {
            const isPackage = app.type === 'package';
            const safeId = menadzerApp.escapeHTML(app.id);
            const safeName = menadzerApp.escapeHTML(app.name);
            const safeIcon = menadzerApp.escapeHTML(app.icon || '📦');
            const safeCategory = menadzerApp.escapeHTML(app.category || 'Ogólne');

            const badge = isPackage
                ? '<span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] uppercase tracking-wider border border-blue-500/30 font-bold shrink-0">Zainstalowana</span>'
                : '<span class="px-2 py-0.5 rounded bg-gray-500/20 text-gray-300 text-[10px] uppercase tracking-wider border border-gray-500/30 font-bold shrink-0">Systemowa</span>';

            let secondaryMeta = '';
            if (isPackage) {
                secondaryMeta = `<span class="truncate">Kategoria: <span class="g-text">${safeCategory}</span></span><span class="text-[10px] opacity-75 shrink-0">• v${menadzerApp.escapeHTML(app.version || '1.0.0')}</span>`;
            } else {
                const isSystemCategory = safeCategory.toLowerCase().startsWith('systemow');
                secondaryMeta = isSystemCategory
                    ? `<span class="truncate">Wbudowana aplikacja systemu BigOS</span>`
                    : `<span class="truncate">Kategoria: <span class="g-text">${safeCategory}</span></span>`;
            }

            let actionsGrid = '';
            if (isPackage) {
                actionsGrid = `
                    <div class="menadzer-card-actions grid grid-cols-2 gap-1.5 w-full sm:w-[220px] shrink-0">
                        <button onclick="menadzerApp.launchApp('${safeId}')" class="g-btn h-8 px-2 inline-flex items-center justify-center gap-1.5 rounded font-semibold text-xs border-emerald-500/50 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white transition shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-400" title="Uruchom aplikację">
                            <span>▶</span><span>Uruchom</span>
                        </button>
                        <button onclick="menadzerApp.showDetails('${safeId}')" class="g-btn h-8 px-2 inline-flex items-center justify-center gap-1.5 rounded font-semibold text-xs border-gray-500/50 text-gray-300 bg-gray-500/10 hover:bg-gray-600 hover:text-white transition shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-400" title="Szczegóły techniczne">
                            <span>ℹ️</span><span>Szczegóły</span>
                        </button>
                        <button onclick="menadzerApp.exportApp('${safeId}')" class="g-btn h-8 px-2 inline-flex items-center justify-center gap-1.5 rounded font-semibold text-xs border-blue-500/50 text-blue-400 bg-blue-500/10 hover:bg-blue-500 hover:text-white transition shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-400" title="Zapisz plik instalacyjny aplikacji na dysku PC">
                            <span>📤</span><span>Eksportuj</span>
                        </button>
                        <button onclick="menadzerApp.uninstall('${safeId}')" class="g-btn h-8 px-2 inline-flex items-center justify-center gap-1.5 rounded font-semibold text-xs border-red-500/50 text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white transition shadow-sm focus:outline-none focus:ring-1 focus:ring-red-400" title="Usuń aplikację z BigOS">
                            <span>🗑</span><span>Odinstaluj</span>
                        </button>
                    </div>
                `;
            } else {
                actionsGrid = `
                    <div class="menadzer-card-actions grid grid-cols-2 gap-1.5 w-full sm:w-[220px] shrink-0">
                        <button onclick="menadzerApp.launchApp('${safeId}')" class="g-btn h-8 px-2 inline-flex items-center justify-center gap-1.5 rounded font-semibold text-xs border-emerald-500/50 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white transition shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-400" title="Uruchom aplikację">
                            <span>▶</span><span>Uruchom</span>
                        </button>
                        <button onclick="menadzerApp.showDetails('${safeId}')" class="g-btn h-8 px-2 inline-flex items-center justify-center gap-1.5 rounded font-semibold text-xs border-gray-500/50 text-gray-300 bg-gray-500/10 hover:bg-gray-600 hover:text-white transition shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-400" title="Szczegóły techniczne">
                            <span>ℹ️</span><span>Szczegóły</span>
                        </button>
                    </div>
                `;
            }

            const itemEl = document.createElement('div');
            itemEl.className = 'menadzer-card flex flex-col sm:flex-row sm:items-center justify-between p-3 g-bg border g-border rounded-lg shadow-sm hover:bg-white/5 transition gap-3';
            itemEl.innerHTML = `
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div class="w-12 h-12 rounded-lg bg-black/20 border g-border flex items-center justify-center shrink-0 text-2xl select-none drop-shadow-sm">
                        ${safeIcon}
                    </div>
                    <div class="flex flex-col min-w-0 flex-1 justify-center gap-1">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="font-bold g-text text-sm truncate" title="${safeName}">${safeName}</span>
                            ${badge}
                        </div>
                        <div class="flex items-center gap-2 text-[11px] g-text-muted min-w-0">
                            ${secondaryMeta}
                        </div>
                    </div>
                </div>
                ${actionsGrid}
            `;
            list.appendChild(itemEl);
        });
    },

    showDetails: async (appId) => {
        let pkg = null;
        if (typeof bigosDB !== 'undefined' && bigosDB.getPackage) {
            try { pkg = await bigosDB.getPackage(appId); } catch (_) {}
        }
        let builtin = null;
        if (typeof defaultApps !== 'undefined') {
            builtin = defaultApps.find(a => a.appId === appId || a.id === appId);
        }

        const name = (pkg && pkg.name) || (builtin && builtin.name) || appId;
        const icon = (pkg && pkg.icon) || (builtin && builtin.icon) || '📦';
        const typeStr = pkg ? 'Zainstalowana w piaskownicy (Sandbox)' : 'Wbudowana aplikacja systemowa';
        const category = (pkg && pkg.category) || (builtin && builtin.category) || 'Narzędzia';
        const version = (pkg && pkg.version) || 'BigOS 2.0';
        const permissions = (pkg && pkg.permissions && pkg.permissions.length > 0) ? pkg.permissions.join(', ') : (pkg ? 'Brak specjalnych uprawnień' : 'Wszystkie (Zintegrowana)');
        const dateStr = (pkg && pkg.installedAt) ? new Date(pkg.installedAt).toLocaleString('pl-PL') : 'System BigOS';
        const source = (pkg && pkg.source) ? (pkg.source === 'bundled' ? 'Katalog Programy/ (Dostarczona z BigOS)' : (pkg.source === 'bigai' ? 'Generator BigAI' : 'Import z pliku')) : 'Zintegrowana z BigOS';

        const modalId = 'menadzer-details-modal';
        const oldModal = document.getElementById(modalId);
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-md w-full border g-border flex flex-col gap-4">
                <div class="flex items-center justify-between border-b g-border pb-3">
                    <h2 class="text-lg font-bold g-text flex items-center gap-2">
                        <span>${menadzerApp.escapeHTML(icon)}</span>
                        <span>${menadzerApp.escapeHTML(name)}</span>
                    </h2>
                    <button onclick="document.getElementById('${modalId}').remove()" class="g-text-muted hover:text-white px-2 py-1 text-sm font-bold">✖</button>
                </div>

                <div class="flex flex-col gap-2.5 text-xs">
                    <div class="flex justify-between py-1 border-b g-border/40">
                        <span class="g-text-muted">Identyfikator (ID):</span>
                        <code class="font-mono text-emerald-400 bg-black/30 px-1.5 py-0.5 rounded">${menadzerApp.escapeHTML(appId)}</code>
                    </div>
                    <div class="flex justify-between py-1 border-b g-border/40">
                        <span class="g-text-muted">Typ:</span>
                        <span class="font-medium g-text">${menadzerApp.escapeHTML(typeStr)}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b g-border/40">
                        <span class="g-text-muted">Kategoria:</span>
                        <span class="font-medium g-text">${menadzerApp.escapeHTML(category)}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b g-border/40">
                        <span class="g-text-muted">Wersja:</span>
                        <span class="font-medium g-text">${menadzerApp.escapeHTML(version)}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b g-border/40">
                        <span class="g-text-muted">Uprawnienia:</span>
                        <span class="font-medium g-text">${menadzerApp.escapeHTML(permissions)}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b g-border/40">
                        <span class="g-text-muted">Data instalacji:</span>
                        <span class="font-medium g-text">${menadzerApp.escapeHTML(dateStr)}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b g-border/40">
                        <span class="g-text-muted">Źródło:</span>
                        <span class="font-medium g-text">${menadzerApp.escapeHTML(source)}</span>
                    </div>
                </div>

                <div class="flex justify-between items-center pt-2 border-t g-border/40">
                    <button onclick="if(typeof winManager !== 'undefined') winManager.resetWindowGeometry('${menadzerApp.escapeHTML(appId)}'); if(typeof apps !== 'undefined') apps.showToast('Rozmiar okna', 'Przywrócono domyślne wymiary aplikacji.', 'success'); document.getElementById('${modalId}').remove();" class="g-btn px-3 py-1.5 rounded-lg font-semibold text-xs border-blue-500/40 text-blue-400 hover:bg-blue-500/20 transition inline-flex items-center gap-1.5" title="Przywraca oryginalne wymiary okna z pakietu aplikacji">
                        <span>📐</span><span>Przywróć domyślny rozmiar</span>
                    </button>
                    <button onclick="document.getElementById('${modalId}').remove()" class="g-btn px-4 py-2 rounded-lg font-bold text-xs">Zamknij</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    exportApp: async (appId) => {
        let code = '';
        let pkgName = appId;

        // 1. Authoritative package record
        if (typeof bigosDB !== 'undefined' && bigosDB.getPackage) {
            try {
                const pkg = await bigosDB.getPackage(appId);
                if (pkg) {
                    pkgName = pkg.name || appId;
                    if (pkg.code) {
                        code = pkg.code;
                    } else {
                        // Reconstruct standard registration script
                        const cfg = {
                            id: pkg.id,
                            name: pkg.name,
                            icon: pkg.icon,
                            width: pkg.width,
                            height: pkg.height,
                            html: pkg.html,
                            globalName: pkg.globalName
                        };
                        code = `window.BigOSAppAPI.register(${JSON.stringify(cfg, null, 2)});\n`;
                    }
                }
            } catch (_) {}
        }

        // 2. Fallback to legacy script file in fileSystem
        if (!code && typeof fileSystem !== 'undefined') {
            const script = fileSystem.find(f => f && f.type === 'bigos_app_script' && f.content && f.content.includes(appId));
            if (script) code = script.content;
        }

        if (!code) {
            if (typeof apps !== 'undefined') apps.showToast('Błąd eksportu', 'Nie znaleziono kodu źródłowego pakietu ' + appId, 'error');
            return;
        }

        const blob = new Blob([code], { type: 'application/javascript;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${appId}_bigos.js`;
        link.click();
        URL.revokeObjectURL(link.href);

        if (typeof apps !== 'undefined') apps.showToast('Eksport', `Aplikacja "${pkgName}" została pobrana na dysk PC.`, 'success');
    },

    importApp: (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const content = ev.target.result;
            try {
                let codeToInstall = content;

                // Support JSON manifests as well as script files
                if (typeof content === 'string' && content.trim().startsWith('{')) {
                    try {
                        const parsed = JSON.parse(content);
                        if (parsed.code) {
                            codeToInstall = parsed.code;
                        } else if (parsed.id) {
                            codeToInstall = `window.BigOSAppAPI.register(${JSON.stringify(parsed)});\n`;
                        }
                    } catch (_) {}
                }

                if (!codeToInstall.includes('BigOSAppAPI.register') && !codeToInstall.includes('id:')) {
                    throw new Error('Plik nie zawiera poprawnej definicji aplikacji BigOS (brak BigOSAppAPI.register).');
                }

                if (!global.bigosSandbox || !global.bigosSandbox.installPackage) {
                    throw new Error('Moduł piaskownicy (sandbox) jest niedostępny — instalacja niemożliwa.');
                }

                const record = await global.bigosSandbox.installPackage(codeToInstall, { source: 'import' });
                if (!record || !record.id) throw new Error('Instalacja nie powiodła się.');

                // Register desktop icon in fileSystem if missing
                if (typeof fileSystem !== 'undefined' && !fileSystem.some(f => f && (f.appId === record.id || f.id === 'app_' + record.id))) {
                    let col = 0, row = 0;
                    const maxRows = Math.max(1, Math.floor((window.innerHeight - 120) / 100));
                    for (let t = 0; t < 50; t++) {
                        const checkX = 30 + (col * 90);
                        const checkY = 30 + (row * 100);
                        const occupied = fileSystem.some(f => f && f.parentId === 'root' && Math.abs(f.x - checkX) < 40 && Math.abs(f.y - checkY) < 40);
                        if (!occupied) {
                            fileSystem.push({
                                id: 'app_' + record.id,
                                type: 'app',
                                name: record.name,
                                icon: record.icon || '📦',
                                appId: record.id,
                                parentId: 'root',
                                x: checkX,
                                y: checkY
                            });
                            break;
                        }
                        row++;
                        if (row >= maxRows) { row = 0; col++; }
                    }
                    if (typeof fsManager !== 'undefined') await fsManager.save();
                    if (typeof desktop !== 'undefined') desktop.render();
                }

                // Register in defaultApps
                if (typeof defaultApps !== 'undefined' && !defaultApps.some(a => a.appId === record.id)) {
                    defaultApps.push({
                        id: 'app_' + record.id,
                        type: 'app',
                        name: record.name,
                        icon: record.icon || '📦',
                        appId: record.id,
                        category: record.category || 'Zainstalowane'
                    });
                }

                // Register in Start menu
                const startMenu = document.getElementById('start-menu-list');
                if (startMenu && !document.getElementById('start-btn-' + record.id)) {
                    const btn = document.createElement('button');
                    btn.id = 'start-btn-' + record.id;
                    btn.className = 'start-item flex items-center gap-3 p-2 hover:bg-white/10 rounded w-full text-left transition g-text font-medium';
                    btn.onclick = () => {
                        menadzerApp.launchApp(record.id);
                        if (typeof apps !== 'undefined' && apps.toggleStartMenu) apps.toggleStartMenu();
                    };
                    btn.innerHTML = `<span class="text-xl drop-shadow-sm">${menadzerApp.escapeHTML(record.icon || '📦')}</span> <span class="app-name">${menadzerApp.escapeHTML(record.name)}</span>`;
                    const headers = startMenu.querySelectorAll('.start-header');
                    if (headers.length > 1) startMenu.insertBefore(btn, headers[1]);
                    else startMenu.appendChild(btn);
                }

                if (typeof apps !== 'undefined') {
                    apps.showToast('Instalacja', `Pomyślnie zainstalowano aplikację: ${record.name}`, 'success');
                }
                menadzerApp.renderList();
            } catch (err) {
                if (typeof apps !== 'undefined') {
                    apps.showToast('Błąd instalacji', err.message, 'error');
                }
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    },

    showConfirmModal: (title, msg, confirmText, onConfirm) => {
        const modalId = 'menadzer-confirm-modal';
        const old = document.getElementById(modalId);
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-sm w-full border g-border">
                <h2 class="text-lg font-bold g-text mb-3 border-b g-border pb-2 flex items-center gap-2"><span class="text-red-500 drop-shadow">⚠️</span> ${title}</h2>
                <p class="text-sm g-text-muted mb-6 leading-relaxed">${msg}</p>
                <div class="flex gap-3 justify-end">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border shadow-sm text-xs">Anuluj</button>
                    <button id="menadzer-confirm-ok" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg shadow-red-600/30 transition font-bold border border-red-700 text-xs">${confirmText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('menadzer-confirm-ok').onclick = () => { onConfirm(); modal.remove(); };
    },

    uninstall: (appId) => {
        menadzerApp.showConfirmModal(
            "Odinstaluj Aplikację",
            `Czy na pewno chcesz odinstalować program z systemu BigOS?<br><br>Aplikacja oraz jej ikony zostaną trwale usunięte z Pulpitu i Menu Start.`,
            "Odinstaluj Trwale",
            () => { menadzerApp.executeUninstall(appId); }
        );
    },

    executeUninstall: async (appId) => {
        if (!appId) return;

        // Remember uninstallation for bundled apps so reload doesn't resurrect them
        if (typeof bundledCatalog !== 'undefined' && bundledCatalog.isBundled(appId)) {
            bundledCatalog.markUninstalled(appId);
        }

        // Uninstall through sandbox broker
        if (typeof bigosSandbox !== 'undefined' && bigosSandbox.uninstallPackage) {
            try { await bigosSandbox.uninstallPackage(appId); } catch (_) {}
        }

        // Clean up desktop and state
        if (typeof fileSystem !== 'undefined') {
            for (let i = fileSystem.length - 1; i >= 0; i--) {
                const item = fileSystem[i];
                if (item && (item.appId === appId || item.id === 'app_' + appId || (item.type === 'bigos_app_script' && item.content && item.content.includes(appId)))) {
                    fileSystem.splice(i, 1);
                }
            }
        }
        if (typeof defaultApps !== 'undefined') {
            const idx = defaultApps.findIndex(a => a.appId === appId || a.id === 'app_' + appId);
            if (idx >= 0) defaultApps.splice(idx, 1);
        }

        const startBtn = document.getElementById('start-btn-' + appId);
        if (startBtn) startBtn.remove();
        if (typeof winManager !== 'undefined') winManager.close(appId);
        const win = document.getElementById('app-' + appId);
        if (win) win.remove();

        if (typeof fsManager !== 'undefined') await fsManager.save();
        if (typeof desktop !== 'undefined') desktop.render();

        menadzerApp.renderList();
        if (typeof apps !== 'undefined') apps.showToast('Odinstalowano', 'Aplikacja została pomyślnie usunięta.', 'success');
    },

    showRestoreCatalogModal: () => {
        if (typeof bundledCatalog === 'undefined') return;
        const uninstalled = bundledCatalog.getUninstalledApps();
        if (uninstalled.length === 0) {
            if (typeof apps !== 'undefined') apps.showToast('Katalog', 'Wszystkie aplikacje z katalogu są już zainstalowane.', 'info');
            return;
        }

        const modalId = 'menadzer-restore-modal';
        const old = document.getElementById(modalId);
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-md w-full border g-border flex flex-col gap-4">
                <div class="flex items-center justify-between border-b g-border pb-3">
                    <h2 class="text-base font-bold g-text flex items-center gap-2">
                        <span>🔄</span>
                        <span>Przywróć aplikacje z katalogu Programy</span>
                    </h2>
                    <button onclick="document.getElementById('${modalId}').remove()" class="g-text-muted hover:text-white px-2 py-1 text-sm font-bold">✖</button>
                </div>

                <p class="text-xs g-text-muted leading-relaxed">
                    Poniższe aplikacje dostarczone z BigOS zostały wcześniej odinstalowane. Możesz je zainstalować ponownie:
                </p>

                <div class="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                    ${uninstalled.map(app => `
                        <div class="flex justify-between items-center p-2.5 g-bg border g-border rounded-lg">
                            <div class="flex items-center gap-2.5 truncate">
                                <span class="text-2xl">${menadzerApp.escapeHTML(app.icon)}</span>
                                <div class="flex flex-col truncate">
                                    <span class="text-xs font-bold g-text truncate">${menadzerApp.escapeHTML(app.name)}</span>
                                    <span class="text-[10px] g-text-muted">${menadzerApp.escapeHTML(app.category)}</span>
                                </div>
                            </div>
                            <button onclick="menadzerApp.reinstallBundled('${menadzerApp.escapeHTML(app.id)}')" 
                                    class="g-btn px-3 py-1 bg-emerald-600/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500 hover:text-white rounded font-bold text-xs transition">
                                Zainstaluj
                            </button>
                        </div>
                    `).join('')}
                </div>

                <div class="flex justify-end pt-2">
                    <button onclick="document.getElementById('${modalId}').remove()" class="g-btn px-4 py-2 rounded-lg font-bold text-xs">Zamknij</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    reinstallBundled: async (appId) => {
        if (typeof bundledCatalog === 'undefined') return;
        try {
            const rec = await bundledCatalog.reinstall(appId);
            const modal = document.getElementById('menadzer-restore-modal');
            if (modal) modal.remove();
            menadzerApp.renderList();
            if (typeof apps !== 'undefined') apps.showToast('Instalacja', `Przywrócono aplikację: ${(rec && rec.name) || appId}`, 'success');
        } catch (e) {
            if (typeof apps !== 'undefined') apps.showToast('Błąd instalacji', e.message, 'error');
        }
    }
};

setTimeout(menadzerApp.init, 500);
window.menadzerApp = menadzerApp;