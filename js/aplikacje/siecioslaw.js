// ======================================================================
// PLIK: js/aplikacje/siecioslaw.js (Przeglądarka Internetowa Sieciosław PRO)
// ======================================================================

const siecioslawApp = {
    tabs: [],
    activeTabId: null,
    splitTabId: null, 
    
    history: [],
    bookmarks: [],
    
    isVerticalTabs: false,
    isAIPanelOpen: false,
    
    _initialized: false,

    init: () => {
        if (siecioslawApp._initialized) return;
        siecioslawApp._initialized = true;

        try {
            const h = localStorage.getItem('bigos_browser_history');
            if (h) siecioslawApp.history = JSON.parse(h);
            const b = localStorage.getItem('bigos_browser_bookmarks');
            if (b) siecioslawApp.bookmarks = JSON.parse(b);
            const s = localStorage.getItem('bigos_browser_settings');
            if (s) {
                const settings = JSON.parse(s);
                siecioslawApp.isVerticalTabs = settings.isVerticalTabs || false;
            }
        } catch(e) {}

        siecioslawApp.upgradeUI();
        siecioslawApp.addTab('bigos://start');
        window.addEventListener('keydown', siecioslawApp.handleKeyboard);
    },

    saveSettings: () => {
        localStorage.setItem('bigos_browser_history', JSON.stringify(siecioslawApp.history));
        localStorage.setItem('bigos_browser_bookmarks', JSON.stringify(siecioslawApp.bookmarks));
        localStorage.setItem('bigos_browser_settings', JSON.stringify({
            isVerticalTabs: siecioslawApp.isVerticalTabs
        }));
    },

    escUrl: (u) => u.replace(/'/g, "\\'").replace(/"/g, "&quot;"),

    // ==================================================================
    // INTERFEJS UŻYTKOWNIKA (UI)
    // ==================================================================
    upgradeUI: () => {
        let appWindow = document.getElementById('app-siecioslaw');
        
        if (!appWindow) {
            appWindow = document.createElement('div');
            appWindow.id = 'app-siecioslaw';
            appWindow.className = 'window absolute hidden';
            document.body.appendChild(appWindow);
        }

        appWindow.style.width = '1000px';
        appWindow.style.height = '650px';
        appWindow.style.background = 'transparent';
        appWindow.style.border = 'none';
        appWindow.style.boxShadow = 'none';

        const titleBar = appWindow.querySelector('.title-bar');
        Array.from(appWindow.children).forEach(child => { if (child !== titleBar) child.remove(); });
        if (titleBar) titleBar.style.display = 'none';

        const proUI = document.createElement('div');
        proUI.className = 'flex flex-col overflow-hidden relative themed-app g-panel rounded-lg shadow-2xl h-full w-full';

        proUI.innerHTML = `
            <!-- Tematyczny Pasek Tytułowy -->
            <div class="px-4 py-2 border-b g-border flex justify-between items-center cursor-move bg-black/30 shrink-0 relative z-[100] shadow-md" onmousedown="winManager.startDrag(event, 'app-siecioslaw')" ontouchstart="winManager.startDrag(event, 'app-siecioslaw')">
                <span class="text-sm font-bold g-accent drop-shadow-md flex items-center gap-2">🌐 Sieciosław Browser</span>
                <div class="flex gap-2">
                    <button onclick="winManager.minimize('siecioslaw')" class="g-icon-btn px-1 g-text transition" title="Minimalizuj">_</button>
                    <button onclick="winManager.maximize('app-siecioslaw')" class="g-icon-btn px-1 g-text transition" title="Powiększ">□</button>
                    <button onclick="winManager.close('siecioslaw')" class="text-red-500 hover:text-red-400 px-1 font-bold transition drop-shadow-md" title="Zamknij">✖</button>
                </div>
            </div>

            <!-- Główny Pasek Narzędzi (Toolbar) -->
            <div class="p-2 border-b g-border bg-black/20 flex gap-2 shrink-0 items-center relative z-50">
                <div class="flex gap-1">
                    <button onclick="siecioslawApp.goBack()" class="g-btn w-8 h-8 rounded-full shadow-sm flex items-center justify-center bg-white/5 hover:bg-white/20 transition" title="Wstecz">◀</button>
                    <button onclick="siecioslawApp.goForward()" class="g-btn w-8 h-8 rounded-full shadow-sm flex items-center justify-center bg-white/5 hover:bg-white/20 transition" title="Dalej">▶</button>
                    <button onclick="siecioslawApp.reloadTab()" class="g-btn w-8 h-8 rounded-full shadow-sm flex items-center justify-center bg-white/5 hover:bg-white/20 transition" title="Odśwież (F5)">⟳</button>
                    <button onclick="siecioslawApp.addTab('bigos://start')" class="g-btn w-8 h-8 rounded-full shadow-sm flex items-center justify-center bg-white/5 hover:bg-white/20 transition text-blue-400" title="Strona Startowa">🏠</button>
                </div>
                
                <!-- Pasek Adresu -->
                <div class="flex-grow flex items-center g-bg border g-border rounded-full px-3 py-1 shadow-inner relative group focus-within:ring-2 focus-within:ring-blue-500">
                    <span id="s-sec-icon" class="text-xs mr-2 opacity-50">🔒</span>
                    <input type="text" id="s-url-input" class="flex-grow bg-transparent border-none outline-none text-sm font-mono g-text placeholder-gray-500" placeholder="Szukaj w sieci lub wpisz adres URL..." onkeydown="if(event.key==='Enter') siecioslawApp.navigateFromBar()">
                    <button onclick="siecioslawApp.toggleBookmark()" id="s-bookmark-btn" class="ml-2 text-gray-500 hover:text-yellow-400 transition text-lg" title="Dodaj do zakładek">☆</button>
                </div>
                
                <div class="flex gap-1 ml-1 items-center">
                    <button onclick="siecioslawApp.toggleVerticalTabs()" class="g-btn w-8 h-8 rounded shadow-sm flex items-center justify-center bg-white/5 hover:bg-blue-500 hover:text-white transition" title="Karty Pionowe">🗂️</button>
                    <button onclick="siecioslawApp.toggleSplitView()" id="s-split-btn" class="g-btn w-8 h-8 rounded shadow-sm flex items-center justify-center bg-white/5 hover:bg-emerald-500 hover:text-white transition" title="Podział Ekranu (Split View)">◫</button>
                    <button onclick="siecioslawApp.saveToBigOS()" class="g-btn w-8 h-8 rounded shadow-sm flex items-center justify-center bg-white/5 hover:bg-purple-500 hover:text-white transition text-purple-400" title="Zapisz do BigOS">📥</button>
                    <button onclick="siecioslawApp.toggleAIPanel()" id="s-ai-btn" class="g-btn px-3 h-8 rounded shadow-sm flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold border-none transition hover:opacity-80" title="Asystent AI">✨ AI</button>
                    
                    <!-- Menu Rozwijane (NAPRAWIONE) -->
                    <div class="relative group ml-1 h-full flex items-center">
                        <button class="g-btn w-8 h-8 rounded shadow-sm flex items-center justify-center bg-white/5 hover:bg-white/20 transition">⋮</button>
                        <!-- Niewidzialny most (pt-1) i top-full chronią przed zniknięciem menu podczas przesuwania myszki -->
                        <div class="absolute right-0 top-full pt-1 hidden group-hover:block z-[999] min-w-[200px]">
                            <div class="flex flex-col g-panel border g-border shadow-2xl rounded-lg py-2">
                                <div class="px-4 py-1 text-[10px] g-text-muted font-bold uppercase tracking-widest">Narzędzia</div>
                                <button onclick="siecioslawApp.showHistory()" class="text-left px-4 py-2 hover:bg-blue-500 hover:text-white transition text-sm">📜 Historia</button>
                                <button onclick="siecioslawApp.showBookmarks()" class="text-left px-4 py-2 hover:bg-blue-500 hover:text-white transition text-sm">⭐ Zakładki</button>
                                <div class="border-t g-border my-1"></div>
                                <button class="text-left px-4 py-2 hover:bg-blue-500 hover:text-white transition text-sm flex justify-between" title="Narzędzie Developerskie (Brak dostępu)"><span>🔍 Zbadaj element</span><span class="text-xs opacity-50">F12</span></button>
                                <button class="text-left px-4 py-2 hover:bg-blue-500 hover:text-white transition text-sm flex justify-between" onclick="siecioslawApp.mockPrint()"><span>🖨️ Drukuj / PDF</span><span class="text-xs opacity-50">Ctrl+P</span></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Obszar Poziomych Kart (Zwiększony z-index naprawia klikalność) -->
            <div id="s-horiz-tabs-container" class="flex items-end border-b g-border bg-black/40 px-2 pt-2 gap-1 overflow-x-auto custom-scrollbar shrink-0 h-10 relative z-20">
                <!-- Tabs injected here -->
            </div>

            <!-- GŁÓWNY OBSZAR ROBOCZY -->
            <div class="flex flex-row flex-grow overflow-hidden relative z-10">
                
                <!-- Obszar Pionowych Kart -->
                <div id="s-vert-tabs-container" class="w-[200px] border-r g-border bg-black/30 flex-col gap-1 p-2 shrink-0 hidden overflow-y-auto custom-scrollbar transition-all duration-300">
                    <!-- Tabs injected here -->
                </div>

                <!-- Kontenery na widoki stron -->
                <div class="flex-grow flex relative bg-white dark:bg-[#121212]">
                    <!-- View 1 -->
                    <div id="s-view-1" class="flex-grow relative border-r border-transparent transition-all duration-300">
                        <iframe id="s-frame-1" class="w-full h-full border-none bg-white absolute inset-0 hidden"></iframe>
                        <!-- Wymuszono tło i kolory oddzielne od g-text/g-bg dla lepszej czytelności w każdym motywie -->
                        <div id="s-start-1" class="w-full h-full bg-white dark:bg-[#1a1a1a] absolute inset-0 overflow-y-auto custom-scrollbar"></div>
                    </div>
                    
                    <!-- View 2 (Split View) -->
                    <div id="s-view-2" class="flex-grow relative border-l g-border hidden transition-all duration-300">
                        <div class="absolute top-0 right-0 p-1 z-50">
                            <button onclick="siecioslawApp.toggleSplitView()" class="bg-red-500 text-white w-6 h-6 rounded flex items-center justify-center shadow">✖</button>
                        </div>
                        <iframe id="s-frame-2" class="w-full h-full border-none bg-white absolute inset-0 hidden"></iframe>
                        <div id="s-start-2" class="w-full h-full bg-white dark:bg-[#1a1a1a] absolute inset-0 overflow-y-auto custom-scrollbar"></div>
                    </div>
                </div>

                <!-- PRAWY PANEL AI -->
                <div id="s-ai-panel" class="w-[280px] border-l g-border bg-black/20 flex-col shrink-0 transition-all duration-300 hidden z-40">
                    <div class="p-3 border-b g-border flex justify-between items-center bg-gradient-to-r from-purple-600/20 to-blue-600/20">
                        <span class="font-bold text-sm text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">✨ AI Browser Assistant</span>
                        <button onclick="siecioslawApp.toggleAIPanel()" class="g-icon-btn hover:text-red-400 text-lg leading-none">✖</button>
                    </div>
                    <div class="flex-grow p-3 overflow-y-auto custom-scrollbar text-sm flex flex-col gap-3" id="s-ai-chat">
                        <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-gray-800 dark:text-gray-200">
                            Cześć! Jestem Twoim inteligentnym asystentem wbudowanym w przeglądarkę Sieciosław. Korzystam z mocy Google Gemini AI. Zadaj mi pytanie o aktualną stronę lub poproś o wyszukanie informacji w internecie!
                        </div>
                        <div class="flex flex-wrap gap-2 mt-2">
                            <button onclick="siecioslawApp.sendAI('Podsumuj stronę i powiedz mi o czym ona jest')" class="g-btn text-[10px] px-2 py-1 rounded-full border-purple-500/50 text-purple-600 dark:text-purple-400">📄 Streść</button>
                            <button onclick="siecioslawApp.sendAI('Przetłumacz główne informacje na tej stronie na język polski')" class="g-btn text-[10px] px-2 py-1 rounded-full border-blue-500/50 text-blue-600 dark:text-blue-400">🌍 Przetłumacz</button>
                        </div>
                    </div>
                    <div class="p-2 border-t g-border bg-black/40">
                        <input type="text" id="s-ai-input" placeholder="Zadaj pytanie..." class="w-full text-xs p-2 rounded-lg g-bg g-text border g-border outline-none focus:border-purple-500 transition" onkeydown="if(event.key==='Enter') { siecioslawApp.sendAI(this.value); this.value=''; }">
                    </div>
                </div>
            </div>
        `;
        appWindow.appendChild(proUI);
        
        siecioslawApp.renderTabsUI();
    },

    // ==================================================================
    // ZARZĄDZANIE KARTAMI (TABS)
    // ==================================================================
    addTab: (url = 'bigos://start') => {
        const id = 'tab_' + Date.now();
        const newTab = {
            id: id,
            url: url,
            title: 'Nowa Karta',
            icon: '🌍',
            history: [url],
            hIndex: 0
        };
        siecioslawApp.tabs.push(newTab);
        siecioslawApp.switchTab(id);
    },

    closeTab: (id, event) => {
        if(event) event.stopPropagation();
        const idx = siecioslawApp.tabs.findIndex(t => t.id === id);
        if (idx === -1) return;

        siecioslawApp.tabs.splice(idx, 1);
        
        if (siecioslawApp.tabs.length === 0) {
            siecioslawApp.addTab('bigos://start');
        } else if (siecioslawApp.activeTabId === id) {
            const nextIdx = Math.min(idx, siecioslawApp.tabs.length - 1);
            siecioslawApp.switchTab(siecioslawApp.tabs[nextIdx].id);
        } else {
            siecioslawApp.renderTabsUI();
        }
    },

    switchTab: (id) => {
        siecioslawApp.activeTabId = id;
        siecioslawApp.renderTabsUI();
        siecioslawApp.updateView();
    },

    updateTabState: (url, title) => {
        const tab = siecioslawApp.tabs.find(t => t.id === siecioslawApp.activeTabId);
        if (tab) {
            if (tab.url !== url) {
                tab.history = tab.history.slice(0, tab.hIndex + 1);
                tab.history.push(url);
                tab.hIndex++;
            }
            tab.url = url;
            tab.title = title || url;
            if(url.includes('google.com') || url.includes('duckduckgo')) tab.icon = '🔍';
            else if(url.includes('youtube') || url.includes('vimeo')) tab.icon = '▶️';
            else if(url === 'bigos://start') tab.icon = '🏠';
            else tab.icon = '📄';
            
            siecioslawApp.renderTabsUI();
        }
    },

    toggleVerticalTabs: () => {
        siecioslawApp.isVerticalTabs = !siecioslawApp.isVerticalTabs;
        siecioslawApp.saveSettings();
        siecioslawApp.renderTabsUI();
    },

    renderTabsUI: () => {
        const hCont = document.getElementById('s-horiz-tabs-container');
        const vCont = document.getElementById('s-vert-tabs-container');
        if(!hCont || !vCont) return;

        if (siecioslawApp.isVerticalTabs) {
            hCont.classList.add('hidden');
            vCont.classList.remove('hidden');
            vCont.classList.add('flex');
        } else {
            hCont.classList.remove('hidden');
            vCont.classList.add('hidden');
            vCont.classList.remove('flex');
        }

        const renderTarget = siecioslawApp.isVerticalTabs ? vCont : hCont;
        renderTarget.innerHTML = '';

        siecioslawApp.tabs.forEach(tab => {
            const isActive = tab.id === siecioslawApp.activeTabId;
            const el = document.createElement('div');
            
            if (siecioslawApp.isVerticalTabs) {
                el.className = `flex items-center justify-between p-2 rounded-lg cursor-pointer transition text-sm font-medium ${isActive ? 'bg-blue-600/20 border border-blue-500 shadow-inner text-blue-400' : 'g-text hover:bg-white/10 border border-transparent'}`;
                el.innerHTML = `
                    <div class="flex items-center gap-2 overflow-hidden pointer-events-none">
                        <span>${tab.icon}</span><span class="truncate">${tab.title}</span>
                    </div>
                    <button class="w-6 h-6 rounded-full hover:bg-red-500/20 hover:text-red-500 flex items-center justify-center shrink-0 opacity-50 hover:opacity-100 transition" onclick="siecioslawApp.closeTab('${tab.id}', event)">✖</button>
                `;
            } else {
                el.className = `group flex items-center justify-between px-3 py-1.5 min-w-[120px] max-w-[200px] border-t border-x g-border cursor-pointer transition rounded-t-xl text-sm font-medium relative ${isActive ? 'g-bg g-text z-10 h-9' : 'bg-black/20 text-gray-400 hover:bg-black/40 h-8 mt-1'}`;
                el.innerHTML = `
                    <div class="flex items-center gap-2 overflow-hidden pointer-events-none">
                        <span>${tab.icon}</span><span class="truncate">${tab.title}</span>
                    </div>
                    <button class="w-5 h-5 rounded-full hover:bg-red-500/20 hover:text-red-500 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition z-20 relative" onclick="siecioslawApp.closeTab('${tab.id}', event)">✖</button>
                    ${isActive ? '<div class="absolute -bottom-[1px] left-0 right-0 h-[2px] g-bg z-20 pointer-events-none"></div>' : ''}
                `;
            }
            
            // Reagowanie na kliknięcie w kartę
            el.onclick = () => siecioslawApp.switchTab(tab.id);
            renderTarget.appendChild(el);
        });

        if (siecioslawApp.isVerticalTabs) {
            renderTarget.innerHTML += `<button onclick="siecioslawApp.addTab()" class="w-full mt-2 g-btn py-1.5 rounded-lg border-dashed border-gray-500 text-gray-400 hover:text-white transition text-sm">➕ Nowa Karta</button>`;
        } else {
            renderTarget.innerHTML += `<button onclick="siecioslawApp.addTab()" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition g-text mb-0.5" title="Nowa Karta">➕</button>`;
        }
    },

    // ==================================================================
    // NAWIGACJA Z OPASŁYM GOOGLE (Omija X-Frame-Options przez igu=1)
    // ==================================================================
    navigateFromBar: () => {
        const input = document.getElementById('s-url-input');
        if(!input) return;
        let query = input.value.trim();
        if(query === '') return;

        let finalUrl = query;
        const isUrl = /^((https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/.*)?|localhost(:\d+)?(\/.*)?|bigos:\/\/.*)$/i.test(query);

        if (!isUrl) {
            // Google Custom Iframe Search - działa w ramkach!
            finalUrl = 'https://www.google.com/search?igu=1&q=' + encodeURIComponent(query);
            siecioslawApp.updateTabState(finalUrl, query + ' - Wyszukiwanie');
        } else {
            if (!query.startsWith('http') && !query.startsWith('bigos://')) {
                finalUrl = 'https://' + query;
            }
            siecioslawApp.updateTabState(finalUrl, finalUrl.replace('https://', '').split('/')[0]);
        }
        
        siecioslawApp.addToHistory(finalUrl, siecioslawApp.tabs.find(t=>t.id===siecioslawApp.activeTabId)?.title);
        siecioslawApp.updateView();
    },

    navigateURL: (url) => {
        siecioslawApp.updateTabState(url, url);
        siecioslawApp.addToHistory(url, url);
        siecioslawApp.updateView();
    },

    // NAPRAWA STRZAŁEK
    goBack: () => {
        const tab = siecioslawApp.tabs.find(t => t.id === siecioslawApp.activeTabId);
        if (tab && tab.hIndex > 0) {
            tab.hIndex--;
            tab.url = tab.history[tab.hIndex];
            // Aktualizacja wizualna
            if (tab.url === 'bigos://start') tab.title = 'Nowa Karta';
            else tab.title = tab.url.replace('https://', '').split('/')[0];
            siecioslawApp.renderTabsUI();
            siecioslawApp.updateView(true); // Parametr true wymusza przeładowanie ramki iframe!
        }
    },

    goForward: () => {
        const tab = siecioslawApp.tabs.find(t => t.id === siecioslawApp.activeTabId);
        if (tab && tab.hIndex < tab.history.length - 1) {
            tab.hIndex++;
            tab.url = tab.history[tab.hIndex];
            if (tab.url === 'bigos://start') tab.title = 'Nowa Karta';
            else tab.title = tab.url.replace('https://', '').split('/')[0];
            siecioslawApp.renderTabsUI();
            siecioslawApp.updateView(true);
        }
    },

    reloadTab: () => {
        siecioslawApp.updateView(true);
    },

    // ==================================================================
    // GŁÓWNY WIDOK (IFRAME / START PAGE)
    // ==================================================================
    updateView: (forceReload = false) => {
        const tab = siecioslawApp.tabs.find(t => t.id === siecioslawApp.activeTabId);
        if (!tab) return;

        const input = document.getElementById('s-url-input');
        const frame1 = document.getElementById('s-frame-1');
        const start1 = document.getElementById('s-start-1');
        const bookmarkBtn = document.getElementById('s-bookmark-btn');
        
        if(input) {
            input.value = tab.url === 'bigos://start' ? '' : tab.url;
            const secIcon = document.getElementById('s-sec-icon');
            if(tab.url.startsWith('https://')) { secIcon.innerText = '🔒'; secIcon.className = 'text-xs mr-2 text-emerald-500'; }
            else if(tab.url === 'bigos://start') { secIcon.innerText = '🏠'; secIcon.className = 'text-xs mr-2 text-blue-500'; }
            else { secIcon.innerText = '🔓'; secIcon.className = 'text-xs mr-2 text-red-500'; }
        }

        if (bookmarkBtn) {
            const isFav = siecioslawApp.bookmarks.some(b => b.url === tab.url);
            bookmarkBtn.innerText = isFav ? '⭐' : '☆';
            if(isFav) bookmarkBtn.classList.add('text-yellow-400'); else bookmarkBtn.classList.remove('text-yellow-400');
        }

        if (tab.url === 'bigos://start') {
            frame1.classList.add('hidden');
            start1.classList.remove('hidden');
            siecioslawApp.renderStartPage(start1);
        } else {
            start1.classList.add('hidden');
            frame1.classList.remove('hidden');

            if (frame1.src !== tab.url || forceReload) {
                frame1.src = tab.url;
                frame1.onload = () => {
                    try {
                        const title = frame1.contentDocument.title;
                        if(title) {
                            tab.title = title;
                            siecioslawApp.renderTabsUI();
                        }
                    } catch(e) {}
                };
            }
        }
    },

    // ==================================================================
    // STRONA STARTOWA BIGOS
    // ==================================================================
    renderStartPage: (container) => {
        let recentsHtml = '';
        const recentHistory = [...siecioslawApp.history].slice(0, 5);
        if (recentHistory.length === 0) {
            recentsHtml = '<div class="text-xs text-gray-500 py-2">Brak historii przeglądania</div>';
        } else {
            recentHistory.forEach(h => {
                recentsHtml += `<div class="flex items-center justify-between p-2 hover:bg-gray-200 dark:hover:bg-[#333] rounded cursor-pointer transition border border-transparent dark:border-[#444]" onclick="siecioslawApp.navigateURL('${siecioslawApp.escUrl(h.url)}')">
                    <div class="truncate text-sm font-medium text-gray-900 dark:text-gray-100"><span class="mr-2">📄</span>${typeof desktop !== 'undefined' ? desktop.escapeHTML(h.title || h.url) : (h.title || h.url)}</div>
                </div>`;
            });
        }

        let bookmarksHtml = '';
        if (siecioslawApp.bookmarks.length === 0) {
            bookmarksHtml = '<div class="text-xs text-gray-500 py-2 col-span-full">Kliknij gwiazdkę w pasku adresu, by zapisać stronę.</div>';
        } else {
            siecioslawApp.bookmarks.slice(0, 6).forEach(b => {
                bookmarksHtml += `<div class="flex flex-col items-center justify-center p-3 bg-gray-100 dark:bg-[#222] border border-gray-300 dark:border-[#444] rounded-xl cursor-pointer hover:border-blue-500 hover:shadow-lg transition group" onclick="siecioslawApp.navigateURL('${siecioslawApp.escUrl(b.url)}')">
                    <div class="text-2xl mb-1 group-hover:scale-110 transition-transform drop-shadow-sm">⭐</div>
                    <div class="text-[10px] font-bold text-center w-full truncate text-gray-800 dark:text-gray-200" title="${typeof desktop !== 'undefined' ? desktop.escapeHTML(b.title) : b.title}">${typeof desktop !== 'undefined' ? desktop.escapeHTML(b.title) : b.title}</div>
                </div>`;
            });
        }

        container.innerHTML = `
            <div class="max-w-4xl mx-auto p-6 md:p-10 flex flex-col gap-8">
                <!-- Header & Search -->
                <div class="flex flex-col items-center justify-center mt-4">
                    <div class="text-6xl mb-4 drop-shadow-xl select-none">🌐</div>
                    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight drop-shadow-sm">Czego dzisiaj szukasz?</h1>
                    
                    <div class="w-full max-w-xl flex bg-white dark:bg-[#222] border border-gray-300 dark:border-[#444] rounded-full p-2 shadow-lg focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                        <span class="text-xl px-3 text-gray-400 self-center">🔍</span>
                        <input type="text" id="s-start-search" class="flex-grow bg-transparent border-none outline-none text-base text-gray-900 dark:text-white placeholder-gray-500 font-medium" placeholder="Wpisz zapytanie do Google..." onkeydown="if(event.key==='Enter') siecioslawApp.navigateURL('https://www.google.com/search?igu=1&q='+encodeURIComponent(this.value))">
                        <button class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold transition shadow" onclick="siecioslawApp.navigateURL('https://www.google.com/search?igu=1&q='+encodeURIComponent(document.getElementById('s-start-search').value))">Szukaj</button>
                    </div>
                </div>

                <!-- Ulubione (Kafelki) -->
                <div>
                    <h2 class="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3 border-b border-gray-300 dark:border-[#444] pb-1">Szybki Dostęp</h2>
                    <div class="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        ${bookmarksHtml}
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Ostatnio Odwiedzane -->
                    <div class="bg-white dark:bg-[#222] border border-gray-300 dark:border-[#444] rounded-xl p-4 shadow-md">
                        <h2 class="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><span>🕒</span> Ostatnio odwiedzane</h2>
                        <div class="flex flex-col gap-1">
                            ${recentsHtml}
                        </div>
                    </div>

                    <!-- Skróty Integracji BigOS -->
                    <div class="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-4 shadow-md">
                        <h2 class="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2"><span>🪟</span> Aplikacje BigOS</h2>
                        <div class="grid grid-cols-2 gap-3">
                            <button onclick="if(typeof winManager !== 'undefined') winManager.open('skryba')" class="flex items-center gap-3 p-3 bg-white/70 dark:bg-black/50 hover:bg-white dark:hover:bg-black/80 rounded-xl transition border border-gray-300 dark:border-[#555] text-left shadow-sm">
                                <span class="text-2xl drop-shadow-sm">📝</span> <span class="text-sm font-bold text-gray-900 dark:text-white">Notatnik</span>
                            </button>
                            <button onclick="if(typeof winManager !== 'undefined') winManager.open('pogodynka')" class="flex items-center gap-3 p-3 bg-white/70 dark:bg-black/50 hover:bg-white dark:hover:bg-black/80 rounded-xl transition border border-gray-300 dark:border-[#555] text-left shadow-sm">
                                <span class="text-2xl drop-shadow-sm">🌤️</span> <span class="text-sm font-bold text-gray-900 dark:text-white">Pogoda</span>
                            </button>
                            <button onclick="if(typeof winManager !== 'undefined') winManager.open('kalkulator')" class="flex items-center gap-3 p-3 bg-white/70 dark:bg-black/50 hover:bg-white dark:hover:bg-black/80 rounded-xl transition border border-gray-300 dark:border-[#555] text-left shadow-sm">
                                <span class="text-2xl drop-shadow-sm">🧮</span> <span class="text-sm font-bold text-gray-900 dark:text-white">Kalkulator</span>
                            </button>
                            <button onclick="if(typeof winManager !== 'undefined') winManager.open('aktowka')" class="flex items-center gap-3 p-3 bg-white/70 dark:bg-black/50 hover:bg-white dark:hover:bg-black/80 rounded-xl transition border border-gray-300 dark:border-[#555] text-left shadow-sm">
                                <span class="text-2xl drop-shadow-sm">📁</span> <span class="text-sm font-bold text-gray-900 dark:text-white">Pliki</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ==================================================================
    // PODZIAŁ EKRANU (SPLIT VIEW)
    // ==================================================================
    toggleSplitView: () => {
        const view2 = document.getElementById('s-view-2');
        const btn = document.getElementById('s-split-btn');

        if (view2.classList.contains('hidden')) {
            view2.classList.remove('hidden');
            btn.classList.add('bg-emerald-500', 'text-white');
            btn.classList.remove('bg-white/5');
            document.getElementById('s-frame-2').classList.remove('hidden');
            document.getElementById('s-start-2').classList.add('hidden');
            document.getElementById('s-frame-2').src = 'https://www.google.com/search?igu=1&q=BigOS';
        } else {
            view2.classList.add('hidden');
            btn.classList.remove('bg-emerald-500', 'text-white');
            btn.classList.add('bg-white/5');
        }
    },

    // ==================================================================
    // ASYSTENT AI BROWSER (Prawdziwy z Google Gemini Flash)
    // ==================================================================
    toggleAIPanel: () => {
        siecioslawApp.isAIPanelOpen = !siecioslawApp.isAIPanelOpen;
        const panel = document.getElementById('s-ai-panel');
        const btn = document.getElementById('s-ai-btn');

        if (siecioslawApp.isAIPanelOpen) {
            panel.classList.remove('hidden');
            panel.classList.add('flex');
            btn.classList.add('ring-2', 'ring-purple-400');
        } else {
            panel.classList.add('hidden');
            panel.classList.remove('flex');
            btn.classList.remove('ring-2', 'ring-purple-400');
        }
    },

    sendAI: async (msgText) => {
        const chat = document.getElementById('s-ai-chat');
        if(!chat || !msgText.trim()) return;

        // Wiadomość użytkownika
        chat.innerHTML += `
            <div class="self-end bg-purple-600 text-white rounded-lg rounded-tr-none p-2 max-w-[85%] text-xs shadow">
                ${typeof desktop !== 'undefined' ? desktop.escapeHTML(msgText) : msgText}
            </div>
        `;
        chat.scrollTop = chat.scrollHeight;

        const thinkingId = 'think_' + Date.now();
        chat.innerHTML += `
            <div id="${thinkingId}" class="self-start text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 mb-2 animate-pulse">Analiza polecenia (Gemini API)...</div>
        `;
        chat.scrollTop = chat.scrollHeight;

        const tab = siecioslawApp.tabs.find(t => t.id === siecioslawApp.activeTabId);
        const currentUrl = tab ? tab.url : 'Brak URL';

        const promptText = `Pytanie użytkownika: ${msgText}\n\nAktualnie przeglądany przez niego adres URL w przeglądarce to: ${currentUrl}. Jeśli pyta o tę stronę lub prosi o streszczenie, użyj wyszukiwarki internetowej aby zdobyć o niej informacje.`;

        // ZABEZPIECZENIE API KEY!
        const apiKey = ""; 

        if (!apiKey || apiKey === "") {
            document.getElementById(thinkingId)?.remove();
            chat.innerHTML += `
                <div class="self-start bg-red-100 dark:bg-red-900/30 border border-red-500/50 text-gray-800 dark:text-gray-200 rounded-lg rounded-tl-none p-3 max-w-[95%] text-xs shadow-md flex flex-col gap-2">
                    <span class="font-bold text-[10px] text-red-600 dark:text-red-400 uppercase tracking-widest border-b border-red-500/30 pb-1">Brak Klucza API</span>
                    <div>Zabezpieczenia wymagają podania Twojego własnego klucza <b>Google Gemini API</b> aby korzystać z prawdziwej AI lokalnie w przeglądarce. <br><br>Edytuj plik <span class="font-mono text-[10px] text-blue-500">siecioslaw.js</span> (linijka ~541) i uzupełnij zmienną <span class="font-mono text-[10px] bg-black/20 p-1 rounded">const apiKey = "TWÓJ_KLUCZ";</span></div>
                </div>
            `;
            chat.scrollTop = chat.scrollHeight;
            return;
        }

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
            const payload = {
                contents: [{ parts: [{ text: promptText }] }],
                tools: [{ google_search: {} }],
                systemInstruction: { parts: [{ text: "Jesteś inteligentnym asystentem wbudowanym w przeglądarkę Sieciosław systemu BigOS. Odpowiadaj krótko, zwięźle i po polsku. Masz dostęp do wbudowanej w Ciebie wyszukiwarki Google Search. Jeśli użytkownik prosi o streszczenie lub analizę strony z podanego adresu URL (bo zabezpieczenia blokują do niej odczyt), natychmiast wywołaj narzędzie wyszukiwarki (google_search), znajdź o czym jest ta domena lub strona i streść ją dla niego! Bądź pomocny." }] }
            };

            let aiResponse = "Przepraszam, wystąpił błąd serwera AI.";
            
            // Retry logic
            for (let i = 0; i < 3; i++) {
                try {
                    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (response.ok) {
                        const data = await response.json();
                        aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Brak odpowiedzi.";
                        // Proste czyszczenie pogrubień do html
                        aiResponse = aiResponse.replace(/\*\*(.*?)\*\*/g, '<b class="text-blue-500 dark:text-blue-400">$1</b>').replace(/\n/g, '<br>');
                        break;
                    }
                } catch (e) {
                    await new Promise(r => setTimeout(r, 1000 * (i+1)));
                }
            }

            document.getElementById(thinkingId)?.remove();
            
            chat.innerHTML += `
                <div class="self-start bg-gray-100 dark:bg-[#222] border border-gray-300 dark:border-[#444] text-gray-800 dark:text-gray-200 rounded-lg rounded-tl-none p-3 max-w-[95%] text-xs shadow-md flex flex-col gap-2">
                    <span class="font-bold text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-widest border-b border-gray-300 dark:border-[#444] pb-1">AI Browser</span>
                    <div>${aiResponse}</div>
                </div>
            `;
            chat.scrollTop = chat.scrollHeight;

        } catch (err) {
            document.getElementById(thinkingId)?.remove();
            chat.innerHTML += `<div class="self-start bg-red-500/20 text-red-500 rounded p-2 text-xs">Błąd połączenia z siecią.</div>`;
        }
    },

    // ==================================================================
    // INTEGRACJA Z BIGOS (Zapis na pulpit, Drukuj)
    // ==================================================================
    saveToBigOS: () => {
        const tab = siecioslawApp.tabs.find(t => t.id === siecioslawApp.activeTabId);
        if(!tab) return;
        
        const url = tab.url;
        const title = tab.title;

        if (typeof fileSystem !== 'undefined' && typeof fsManager !== 'undefined') {
            const fileName = (title || 'Strona_WWW').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.html';
            
            const content = `
                <html>
                <head><title>Skrót do ${title}</title></head>
                <body style="font-family: sans-serif; text-align: center; margin-top: 20vh;">
                    <h2>Skrót z Sieciosława</h2>
                    <p>Oryginalny adres: <a href="${url}" target="_blank">${url}</a></p>
                </body>
                </html>
            `;

            fileSystem.push({
                id: 'file_' + Date.now(),
                type: 'file',
                name: fileName,
                icon: '🌐',
                content: content,
                parentId: 'root',
                x: Math.floor(Math.random() * 100) + 20,
                y: Math.floor(Math.random() * 100) + 20
            });
            fsManager.save();
            if (typeof desktop !== 'undefined') desktop.render();
            if(typeof apps !== 'undefined') apps.showToast('Pobieranie', `Zapisano link jako plik: ${fileName} na Pulpicie!`, 'success');
        }
    },

    mockPrint: () => {
        if(typeof apps !== 'undefined') apps.showToast('Drukowanie', 'Generowanie widoku wydruku tej strony...', 'info');
        setTimeout(() => {
            alert("Funkcja natywnego wydruku zależy od ograniczeń ramki (Iframe). Użyj systemowego skrótu Ctrl+P w swojej przeglądarce.");
        }, 500);
    },

    // ==================================================================
    // ZAKŁADKI I HISTORIA
    // ==================================================================
    toggleBookmark: () => {
        const tab = siecioslawApp.tabs.find(t => t.id === siecioslawApp.activeTabId);
        if(!tab || tab.url === 'bigos://start') return;

        const idx = siecioslawApp.bookmarks.findIndex(b => b.url === tab.url);
        if (idx > -1) {
            siecioslawApp.bookmarks.splice(idx, 1);
            if(typeof apps !== 'undefined') apps.showToast('Zakładki', 'Usunięto z ulubionych.', 'info');
        } else {
            siecioslawApp.bookmarks.push({ url: tab.url, title: tab.title });
            if(typeof apps !== 'undefined') apps.showToast('Zakładki', 'Dodano stronę do zakładek!', 'success');
        }
        siecioslawApp.saveSettings();
        siecioslawApp.updateView(); 
    },

    addToHistory: (url, title) => {
        if(url === 'bigos://start') return;
        siecioslawApp.history.unshift({ url, title: title || url, date: new Date().toLocaleString() });
        if (siecioslawApp.history.length > 100) siecioslawApp.history.pop();
        siecioslawApp.saveSettings();
    },

    showHistory: () => {
        let modal = document.getElementById('s-hist-modal');
        if(modal) modal.remove();

        let histHtml = '';
        if(siecioslawApp.history.length === 0) histHtml = '<div class="text-gray-500 text-center py-4">Brak wpisów w historii.</div>';
        else {
            siecioslawApp.history.forEach(h => {
                histHtml += `
                <div class="flex justify-between items-center p-2 border-b g-border hover:bg-white/10 transition cursor-pointer" onclick="document.getElementById('s-hist-modal').remove(); siecioslawApp.addTab('${siecioslawApp.escUrl(h.url)}')">
                    <div class="flex flex-col truncate pr-2">
                        <span class="text-sm font-bold g-text truncate">${typeof desktop !== 'undefined' ? desktop.escapeHTML(h.title) : h.title}</span>
                        <span class="text-[10px] text-blue-400 truncate">${h.url}</span>
                    </div>
                    <span class="text-[9px] g-text-muted shrink-0">${h.date}</span>
                </div>`;
            });
        }

        modal = document.createElement('div');
        modal.id = 's-hist-modal';
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm';
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-lg w-full border g-border flex flex-col h-[70vh]">
                <h2 class="text-xl font-bold g-text mb-4 border-b g-border pb-2 flex items-center gap-2"><span>📜</span> Historia Przeglądania</h2>
                <div class="flex-grow overflow-y-auto custom-scrollbar border g-border rounded-lg bg-black/20 p-2 mb-4">
                    ${histHtml}
                </div>
                <div class="flex justify-end gap-2 shrink-0">
                    <button onclick="siecioslawApp.history=[]; siecioslawApp.saveSettings(); document.getElementById('s-hist-modal').remove(); siecioslawApp.showHistory();" class="px-4 py-2 bg-red-600/20 text-red-500 border border-red-500 hover:bg-red-500 hover:text-white rounded-lg transition font-bold text-sm">Wyczyść całą historię</button>
                    <button onclick="document.getElementById('s-hist-modal').remove()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition font-bold text-sm">Zamknij</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    showBookmarks: () => {
        let modal = document.getElementById('s-book-modal');
        if(modal) modal.remove();

        let bHtml = '';
        if(siecioslawApp.bookmarks.length === 0) bHtml = '<div class="text-gray-500 text-center py-4">Brak zapisanych zakładek.</div>';
        else {
            siecioslawApp.bookmarks.forEach(b => {
                bHtml += `
                <div class="flex justify-between items-center p-2 border-b g-border hover:bg-white/10 transition cursor-pointer" onclick="document.getElementById('s-book-modal').remove(); siecioslawApp.addTab('${siecioslawApp.escUrl(b.url)}')">
                    <div class="flex flex-col truncate pr-2">
                        <span class="text-sm font-bold g-text truncate">⭐ ${typeof desktop !== 'undefined' ? desktop.escapeHTML(b.title) : b.title}</span>
                        <span class="text-[10px] text-blue-400 truncate">${b.url}</span>
                    </div>
                </div>`;
            });
        }

        modal = document.createElement('div');
        modal.id = 's-book-modal';
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm';
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-lg w-full border g-border flex flex-col h-[70vh]">
                <h2 class="text-xl font-bold g-text mb-4 border-b g-border pb-2 flex items-center gap-2"><span>⭐</span> Menedżer Zakładek</h2>
                <div class="flex-grow overflow-y-auto custom-scrollbar border g-border rounded-lg bg-black/20 p-2 mb-4">
                    ${bHtml}
                </div>
                <div class="flex justify-end shrink-0">
                    <button onclick="document.getElementById('s-book-modal').remove()" class="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition font-bold text-sm">Gotowe</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // ==================================================================
    // GLOBALNE SKRÓTY (Ctrl+T, Ctrl+W)
    // ==================================================================
    handleKeyboard: (e) => {
        const win = document.getElementById('app-siecioslaw');
        if (win && win.classList.contains('active') && !win.classList.contains('minimized')) {
            if (e.ctrlKey) {
                if (e.key === 't' || e.key === 'T') {
                    e.preventDefault();
                    siecioslawApp.addTab();
                } else if (e.key === 'w' || e.key === 'W') {
                    e.preventDefault();
                    if(siecioslawApp.activeTabId) siecioslawApp.closeTab(siecioslawApp.activeTabId);
                } else if (e.key === 'l' || e.key === 'L') {
                    e.preventDefault();
                    const input = document.getElementById('s-url-input');
                    if(input) { input.focus(); input.select(); }
                }
            }
        }
    }
};

// Automatyczna inicjalizacja
setTimeout(() => {
    siecioslawApp.init();
    if(typeof apps !== 'undefined') {
        apps.navigate = siecioslawApp.navigateFromBar;
    }
}, 500);