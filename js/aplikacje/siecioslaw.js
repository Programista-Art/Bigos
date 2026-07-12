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
    
    // Nowa niezależna pamięć podręczna dla asystenta wewnątrz przeglądarki
    aiMessages: [],
    isAIThinking: false,

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
                    <input type="text" id="s-url-input" class="flex-grow bg-transparent border-none outline-none text-sm font-mono g-text placeholder-gray-500" placeholder="Szukaj w internecie lub wpisz adres URL..." onkeydown="if(event.key==='Enter') siecioslawApp.navigateFromBar()">
                    <button onclick="siecioslawApp.toggleBookmark()" id="s-bookmark-btn" class="ml-2 text-gray-500 hover:text-yellow-400 transition text-lg" title="Dodaj do zakładek">☆</button>
                </div>
                
                <div class="flex gap-1 ml-1 items-center">
                    <button onclick="siecioslawApp.toggleVerticalTabs()" class="g-btn w-8 h-8 rounded shadow-sm flex items-center justify-center bg-white/5 hover:bg-blue-500 hover:text-white transition" title="Karty Pionowe">🗂️</button>
                    <button onclick="siecioslawApp.toggleSplitView()" id="s-split-btn" class="g-btn w-8 h-8 rounded shadow-sm flex items-center justify-center bg-white/5 hover:bg-emerald-500 hover:text-white transition" title="Podział Ekranu (Split View)">◫</button>
                    <button onclick="siecioslawApp.saveToBigOS()" class="g-btn w-8 h-8 rounded shadow-sm flex items-center justify-center bg-white/5 hover:bg-purple-500 hover:text-white transition text-purple-400" title="Zapisz do BigOS">📥</button>
                    <button onclick="siecioslawApp.toggleAIPanel()" id="s-ai-btn" class="g-btn px-3 h-8 rounded shadow-sm flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold border-none transition" title="Podpowiadacz AI">✨ BigAI</button>
                    
                    <!-- Menu Rozwijane -->
                    <div class="relative group ml-1 h-full flex items-center">
                        <button class="g-btn w-8 h-8 rounded shadow-sm flex items-center justify-center bg-white/5 hover:bg-white/20 transition">⋮</button>
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

            <!-- Obszar Poziomych Kart -->
            <div id="s-horiz-tabs-container" class="flex items-end border-b g-border bg-black/40 px-2 pt-2 gap-1 overflow-x-auto custom-scrollbar shrink-0 h-10 relative z-20">
                <!-- Puste, renderowane przez JS -->
            </div>

            <!-- GŁÓWNY OBSZAR ROBOCZY -->
            <div class="flex flex-row flex-grow overflow-hidden relative z-10">
                
                <!-- Obszar Pionowych Kart -->
                <div id="s-vert-tabs-container" class="w-[200px] border-r g-border bg-black/30 flex-col gap-1 p-2 shrink-0 hidden overflow-y-auto custom-scrollbar transition-all duration-300">
                    <!-- Puste, renderowane przez JS -->
                </div>

                <!-- Kontenery na widoki stron -->
                <div class="flex-grow flex relative bg-white dark:bg-[#121212]">
                    
                    <!-- GŁÓWNY MULTI-WIDOK -->
                    <div id="s-main-views" class="flex-grow relative border-r border-transparent transition-all duration-300">
                        <!-- Wstrzykiwane ramki -->
                    </div>
                    
                    <!-- View 2 (Split View) -->
                    <div id="s-view-2" class="flex-grow relative border-l g-border hidden transition-all duration-300 bg-white">
                        <div class="absolute top-0 right-0 p-1 z-50">
                            <button onclick="siecioslawApp.toggleSplitView()" class="bg-red-500 text-white w-6 h-6 rounded flex items-center justify-center shadow font-bold hover:bg-red-400">✖</button>
                        </div>
                        <iframe id="s-frame-split" class="w-full h-full border-none absolute inset-0"></iframe>
                    </div>
                </div>

                <!-- PRAWY PANEL AI (Połączony z Globalnym BigAI) -->
                <div id="s-ai-panel" class="w-[280px] sm:w-[320px] border-l g-border bg-black/20 flex-col shrink-0 transition-all duration-300 hidden z-40">
                    <div class="p-3 border-b g-border flex justify-between items-center bg-gradient-to-r from-blue-600/20 to-purple-600/20">
                        <span class="font-bold text-sm text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-md">🤖 BigAI w Przeglądarce</span>
                        <div class="flex gap-2">
                            <button onclick="if(typeof podpowiadaczApp !== 'undefined') podpowiadaczApp.stopTTS();" class="g-icon-btn hover:text-red-400 text-lg leading-none" title="Zatrzymaj Mowę">🛑</button>
                            <button onclick="siecioslawApp.aiMessages=[]; siecioslawApp.renderAIChat();" class="g-icon-btn hover:text-red-400 text-lg leading-none" title="Wyczyść Czat">🗑️</button>
                            <button onclick="siecioslawApp.toggleAIPanel()" class="g-icon-btn hover:text-red-400 text-lg leading-none">✖</button>
                        </div>
                    </div>
                    <div class="flex-grow p-3 overflow-y-auto custom-scrollbar text-sm flex flex-col gap-3" id="s-ai-chat" style="user-select: text; -webkit-user-select: text;">
                        <!-- Chat wstrzykiwany przez JS -->
                    </div>
                    <div class="p-2 border-t g-border bg-black/40">
                        <input type="text" id="s-ai-input" placeholder="Zadaj pytanie..." class="w-full text-xs p-2 rounded-lg g-bg g-text border g-border outline-none focus:border-blue-500 transition shadow-inner" onkeydown="if(event.key==='Enter') { siecioslawApp.sendAI(this.value); this.value=''; }">
                    </div>
                </div>
            </div>
        `;
        appWindow.appendChild(proUI);
        
        siecioslawApp.renderTabsUI();
    },

    // ==================================================================
    // ZARZĄDZANIE KARTAMI
    // ==================================================================
    addTab: (url = 'bigos://start') => {
        const id = 'tab_' + Date.now() + Math.floor(Math.random() * 1000);
        const newTab = {
            id: id, url: url, title: 'Nowa Karta', icon: '🌍', history: [url], hIndex: 0
        };
        siecioslawApp.tabs.push(newTab);
        
        const viewsContainer = document.getElementById('s-main-views');
        if (viewsContainer) {
            const viewDiv = document.createElement('div');
            viewDiv.id = `view-${id}`;
            viewDiv.className = 's-tab-view absolute inset-0 hidden bg-white dark:bg-[#121212]';
            viewDiv.innerHTML = `
                <iframe id="frame-${id}" class="w-full h-full border-none bg-white absolute inset-0 hidden" sandbox="allow-same-origin allow-scripts allow-forms allow-popups"></iframe>
                <div id="start-${id}" class="w-full h-full bg-gray-50 dark:bg-[#1a1a1a] absolute inset-0 overflow-y-auto custom-scrollbar hidden"></div>
            `;
            viewsContainer.appendChild(viewDiv);
        }

        siecioslawApp.switchTab(id);
    },

    closeTab: (id, event) => {
        if(event) event.stopPropagation();
        const idx = siecioslawApp.tabs.findIndex(t => t.id === id);
        if (idx === -1) return;

        siecioslawApp.tabs.splice(idx, 1);
        
        const viewDiv = document.getElementById('view-' + id);
        if (viewDiv) viewDiv.remove();

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
        
        document.querySelectorAll('.s-tab-view').forEach(el => el.classList.add('hidden'));
        const activeView = document.getElementById('view-' + id);
        if (activeView) activeView.classList.remove('hidden');

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
            if(url.includes('google.com') || url.includes('bing.com') || url.includes('duckduckgo')) tab.icon = '🔍';
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
        
        while (renderTarget.firstChild) {
            renderTarget.removeChild(renderTarget.firstChild);
        }

        siecioslawApp.tabs.forEach(tab => {
            const isActive = tab.id === siecioslawApp.activeTabId;
            const el = document.createElement('div');
            
            if (siecioslawApp.isVerticalTabs) {
                el.className = `flex items-center justify-between p-2 rounded-lg cursor-pointer transition text-sm font-medium ${isActive ? 'bg-blue-600/20 border border-blue-500 shadow-inner text-blue-400' : 'g-text hover:bg-white/10 border border-transparent'}`;
                el.innerHTML = `
                    <div class="flex items-center gap-2 overflow-hidden pointer-events-none">
                        <span>${tab.icon}</span><span class="truncate">${typeof desktop !== 'undefined' ? desktop.escapeHTML(tab.title) : tab.title}</span>
                    </div>
                    <button class="w-6 h-6 rounded-full hover:bg-red-500/20 hover:text-red-500 flex items-center justify-center shrink-0 opacity-50 hover:opacity-100 transition" onclick="siecioslawApp.closeTab('${tab.id}', event)">✖</button>
                `;
            } else {
                el.className = `group flex items-center justify-between px-3 py-1.5 min-w-[120px] max-w-[200px] border-t border-x g-border cursor-pointer transition rounded-t-xl text-sm font-medium relative ${isActive ? 'g-bg g-text z-10 h-9' : 'bg-black/20 text-gray-400 hover:bg-black/40 h-8 mt-1'}`;
                el.innerHTML = `
                    <div class="flex items-center gap-2 overflow-hidden pointer-events-none">
                        <span>${tab.icon}</span><span class="truncate">${typeof desktop !== 'undefined' ? desktop.escapeHTML(tab.title) : tab.title}</span>
                    </div>
                    <button class="w-5 h-5 rounded-full hover:bg-red-500/20 hover:text-red-500 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition z-20 relative" onclick="siecioslawApp.closeTab('${tab.id}', event)">✖</button>
                    ${isActive ? '<div class="absolute -bottom-[1px] left-0 right-0 h-[2px] g-bg z-20 pointer-events-none"></div>' : ''}
                `;
            }
            
            el.onclick = () => siecioslawApp.switchTab(tab.id);
            renderTarget.appendChild(el);
        });

        const addBtn = document.createElement('button');
        if (siecioslawApp.isVerticalTabs) {
            addBtn.className = "w-full mt-2 g-btn py-1.5 rounded-lg border-dashed border-gray-500 text-gray-400 hover:text-white transition text-sm shrink-0";
            addBtn.innerText = "➕ Nowa Karta";
        } else {
            addBtn.className = "w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition g-text mb-0.5 shrink-0";
            addBtn.title = "Nowa Karta";
            addBtn.innerText = "➕";
        }
        addBtn.onclick = () => siecioslawApp.addTab();
        renderTarget.appendChild(addBtn);
    },

    // ==================================================================
    // NAWIGACJA
    // ==================================================================
    interceptUrl: (url) => {
        let finalUrl = url;
        const lowerUrl = finalUrl.toLowerCase();
        
        if (lowerUrl.includes('google.') && !lowerUrl.includes('igu=1')) {
            finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'igu=1';
        } else {
            const blockedDomains = ['youtube.com', 'youtu.be', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'github.com', 'reddit.com', 'tiktok.com', 'linkedin.com', 'netflix.com'];
            const isBlocked = blockedDomains.some(d => lowerUrl.includes(d));
            if (isBlocked) {
                finalUrl = 'bigos://blocked?url=' + encodeURIComponent(finalUrl);
            }
        }
        
        return finalUrl;
    },

    navigateFromBar: () => {
        const input = document.getElementById('s-url-input');
        if(!input) return;
        let query = input.value.trim();
        if(query === '') return;

        let finalUrl = query;
        const isUrl = /^((https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/.*)?|localhost(:\d+)?(\/.*)?|bigos:\/\/.*)$/i.test(query);

        if (!isUrl) {
            finalUrl = 'https://www.bing.com/search?q=' + encodeURIComponent(query);
            siecioslawApp.updateTabState(finalUrl, query + ' - Wyszukiwanie');
        } else {
            if (!query.startsWith('http') && !query.startsWith('bigos://')) {
                finalUrl = 'https://' + query;
            }
            finalUrl = siecioslawApp.interceptUrl(finalUrl);
            
            let displayTitle = finalUrl;
            if(finalUrl.startsWith('bigos://blocked')) {
                displayTitle = decodeURIComponent(finalUrl.split('?url=')[1]).replace('https://', '').split('/')[0];
            } else {
                displayTitle = finalUrl.replace('https://', '').split('/')[0];
            }
            siecioslawApp.updateTabState(finalUrl, displayTitle);
        }
        
        siecioslawApp.addToHistory(finalUrl, siecioslawApp.tabs.find(t=>t.id===siecioslawApp.activeTabId)?.title);
        siecioslawApp.updateView();
    },

    navigateURL: (url) => {
        let safeUrl = siecioslawApp.interceptUrl(url);
        let displayTitle = safeUrl.startsWith('bigos://blocked') ? decodeURIComponent(safeUrl.split('?url=')[1]).replace('https://', '').split('/')[0] : safeUrl.replace('https://', '').split('/')[0];
        
        siecioslawApp.updateTabState(safeUrl, displayTitle);
        siecioslawApp.addToHistory(safeUrl, safeUrl);
        siecioslawApp.updateView();
    },

    goBack: () => {
        const tab = siecioslawApp.tabs.find(t => t.id === siecioslawApp.activeTabId);
        if (tab && tab.hIndex > 0) {
            tab.hIndex--;
            tab.url = tab.history[tab.hIndex];
            
            if (tab.url === 'bigos://start') tab.title = 'Nowa Karta';
            else if (tab.url.startsWith('bigos://blocked')) tab.title = decodeURIComponent(tab.url.split('?url=')[1]).replace('https://', '').split('/')[0];
            else tab.title = tab.url.replace('https://', '').split('/')[0];
            
            siecioslawApp.renderTabsUI();
            siecioslawApp.updateView(true);
        }
    },

    goForward: () => {
        const tab = siecioslawApp.tabs.find(t => t.id === siecioslawApp.activeTabId);
        if (tab && tab.hIndex < tab.history.length - 1) {
            tab.hIndex++;
            tab.url = tab.history[tab.hIndex];
            
            if (tab.url === 'bigos://start') tab.title = 'Nowa Karta';
            else if (tab.url.startsWith('bigos://blocked')) tab.title = decodeURIComponent(tab.url.split('?url=')[1]).replace('https://', '').split('/')[0];
            else tab.title = tab.url.replace('https://', '').split('/')[0];
            
            siecioslawApp.renderTabsUI();
            siecioslawApp.updateView(true);
        }
    },

    reloadTab: () => {
        siecioslawApp.updateView(true);
    },

    updateView: (forceReload = false) => {
        const tab = siecioslawApp.tabs.find(t => t.id === siecioslawApp.activeTabId);
        if (!tab) return;

        const input = document.getElementById('s-url-input');
        const frame = document.getElementById('frame-' + tab.id);
        const start = document.getElementById('start-' + tab.id);
        const bookmarkBtn = document.getElementById('s-bookmark-btn');
        
        if(input) {
            let displayUrl = tab.url;
            if (displayUrl === 'bigos://start') displayUrl = '';
            else if (displayUrl.startsWith('bigos://blocked?url=')) displayUrl = decodeURIComponent(displayUrl.split('?url=')[1]);
            
            input.value = displayUrl;
            
            const secIcon = document.getElementById('s-sec-icon');
            if(displayUrl.startsWith('https://')) { secIcon.innerText = '🔒'; secIcon.className = 'text-xs mr-2 text-emerald-500'; }
            else if(tab.url === 'bigos://start') { secIcon.innerText = '🏠'; secIcon.className = 'text-xs mr-2 text-blue-500'; }
            else { secIcon.innerText = '🔓'; secIcon.className = 'text-xs mr-2 text-red-500'; }
        }

        if (bookmarkBtn) {
            const isFav = siecioslawApp.bookmarks.some(b => b.url === tab.url);
            bookmarkBtn.innerText = isFav ? '⭐' : '☆';
            if(isFav) bookmarkBtn.classList.add('text-yellow-400'); else bookmarkBtn.classList.remove('text-yellow-400');
        }

        if (!frame || !start) return;

        if (tab.url === 'bigos://start') {
            frame.classList.add('hidden');
            start.classList.remove('hidden');
            siecioslawApp.renderStartPage(start);
        } else if (tab.url.startsWith('bigos://blocked')) {
            frame.classList.add('hidden');
            start.classList.remove('hidden');
            siecioslawApp.renderBlockedPage(start, tab.url);
        } else {
            start.classList.add('hidden');
            frame.classList.remove('hidden');

            if (frame.src !== tab.url || forceReload) {
                frame.src = tab.url;
                frame.onload = () => {
                    try {
                        const title = frame.contentDocument.title;
                        if(title) {
                            tab.title = title;
                            siecioslawApp.renderTabsUI();
                        }
                    } catch(e) {}
                };
            }
        }
    },

    renderBlockedPage: (container, url) => {
        const targetUrl = decodeURIComponent(url.split('?url=')[1] || '');
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full p-10 text-center bg-gray-100 dark:bg-[#1a1a1a]">
                <div class="text-6xl mb-6 drop-shadow-xl animate-pulse">🛡️</div>
                <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">Zabezpieczenia Zewnętrzne</h2>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-8 max-w-lg leading-relaxed">
                    Strona <b class="text-blue-500 font-mono">${typeof desktop !== 'undefined' ? desktop.escapeHTML(targetUrl) : targetUrl}</b> blokuje możliwość wyświetlania swojej zawartości wewnątrz innych przeglądarek lub systemów chmurowych (wymusza nagłówek X-Frame-Options).<br><br>
                    To normalne zabezpieczenie dużych portali takich jak YouTube czy Facebook. Kliknij przycisk poniżej, aby bezpiecznie otworzyć ten link w nowej, klasycznej karcie swojej przeglądarki.
                </p>
                <div class="flex gap-4">
                    <button onclick="siecioslawApp.goBack()" class="px-6 py-3 bg-gray-300 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-700 transition font-bold shadow">Wróć wstecz</button>
                    <a href="${targetUrl}" target="_blank" class="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg font-bold transition decoration-none flex items-center gap-2">🌐 Otwórz normalnie</a>
                </div>
            </div>
        `;
    },

    renderStartPage: (container) => {
        let recentsHtml = '';
        const recentHistory = [...siecioslawApp.history].slice(0, 5);
        if (recentHistory.length === 0) {
            recentsHtml = '<div class="text-xs text-gray-500 py-2">Brak historii przeglądania</div>';
        } else {
            recentHistory.forEach(h => {
                recentsHtml += `<div class="flex items-center justify-between p-2 hover:bg-gray-200 dark:hover:bg-[#333] rounded cursor-pointer transition border border-transparent dark:border-[#444]" onclick="siecioslawApp.navigateURL('${siecioslawApp.escUrl(h.url)}')">
                    <div class="truncate text-sm font-medium text-gray-900 dark:text-white"><span class="mr-2">📄</span>${typeof desktop !== 'undefined' ? desktop.escapeHTML(h.title || h.url) : (h.title || h.url)}</div>
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
            <div class="max-w-4xl mx-auto p-6 md:p-10 flex flex-col gap-8 text-gray-900 dark:text-white">
                <!-- Header & Search -->
                <div class="flex flex-col items-center justify-center mt-4">
                    <div class="text-6xl mb-4 drop-shadow-xl select-none">🌐</div>
                    <h1 class="text-3xl font-bold mb-6 tracking-tight drop-shadow-sm text-gray-900 dark:text-white">Czego dzisiaj szukasz?</h1>
                    
                    <div class="w-full max-w-xl flex bg-white dark:bg-[#222] border border-gray-300 dark:border-[#444] rounded-full p-2 shadow-lg focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                        <span class="text-xl px-3 text-gray-400 self-center">🔍</span>
                        <input type="text" id="s-start-search" class="flex-grow bg-transparent border-none outline-none text-base text-gray-900 dark:text-white placeholder-gray-500 font-medium" placeholder="Wpisz zapytanie do Bing..." onkeydown="if(event.key==='Enter') siecioslawApp.navigateURL('https://www.bing.com/search?q='+encodeURIComponent(this.value))">
                        <button class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold transition shadow" onclick="siecioslawApp.navigateURL('https://www.bing.com/search?q='+encodeURIComponent(document.getElementById('s-start-search').value))">Szukaj</button>
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

    toggleSplitView: () => {
        const view2 = document.getElementById('s-view-2');
        const btn = document.getElementById('s-split-btn');

        if (view2.classList.contains('hidden')) {
            view2.classList.remove('hidden');
            btn.classList.add('bg-emerald-500', 'text-white');
            btn.classList.remove('bg-white/5');
            document.getElementById('s-frame-split').src = 'https://www.bing.com/search?q=BigOS';
        } else {
            view2.classList.add('hidden');
            btn.classList.remove('bg-emerald-500', 'text-white');
            btn.classList.add('bg-white/5');
        }
    },

    // ==================================================================
    // ZINTEGROWANY ASYSTENT BigAI W PRZEGLĄDARCE (Dedykowany Kontekst)
    // ==================================================================
    toggleAIPanel: () => {
        siecioslawApp.isAIPanelOpen = !siecioslawApp.isAIPanelOpen;
        const panel = document.getElementById('s-ai-panel');
        const btn = document.getElementById('s-ai-btn');

        if (siecioslawApp.isAIPanelOpen) {
            panel.classList.remove('hidden');
            panel.classList.add('flex');
            btn.classList.add('ring-2', 'ring-purple-400');
            siecioslawApp.renderAIChat();
        } else {
            panel.classList.add('hidden');
            panel.classList.remove('flex');
            btn.classList.remove('ring-2', 'ring-purple-400');
        }
    },

    renderAIChat: () => {
        const chatBox = document.getElementById('s-ai-chat');
        if (!chatBox) return;

        chatBox.innerHTML = '';

        if (siecioslawApp.aiMessages.length === 0) {
            chatBox.innerHTML = `
                <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-gray-800 dark:text-gray-200 shadow-sm mb-2 text-xs">
                    Cześć! Jestem Twoim inteligentnym asystentem internetowym (BigAI). O co chciałbyś zapytać w związku z przeglądaną stroną?<br><br>
                    <i class="text-[9px] opacity-70">Jeśli uruchamiasz system lokalnie, upewnij się, że podałeś własny klucz API w ustawieniach głównych (Moduł Podpowiadacz).</i>
                </div>
                <div class="flex flex-wrap gap-2 mt-2 mb-4">
                    <button onclick="siecioslawApp.sendAI('Podsumuj stronę i powiedz mi o czym ona jest')" class="g-btn text-[10px] px-3 py-1.5 rounded-full border-purple-500/50 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 shadow-sm font-bold">📄 Streść</button>
                    <button onclick="siecioslawApp.sendAI('Przetłumacz główne informacje na tej stronie na język polski')" class="g-btn text-[10px] px-3 py-1.5 rounded-full border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 shadow-sm font-bold">🌍 Przetłumacz</button>
                </div>
            `;
        }

        siecioslawApp.aiMessages.forEach((msg, idx) => {
            const isUser = msg.role === 'user';
            const alignClass = isUser ? 'self-end' : 'self-start';
            const bgClass = isUser ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white border-blue-500/30' : 'g-panel bg-black/20 border g-border g-text';
            const radiusClass = isUser ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm';
            
            let htmlText = typeof desktop !== 'undefined' ? desktop.escapeHTML(msg.text) : msg.text;
            
            // Formatowanie i wymuszanie przechwytu linków wewnątrz okna Sieciosława
            htmlText = htmlText.replace(/\[(.*?)\]\((.*?)\)/g, (m, txt, url) => {
                let cleanUrl = url.replace(/&amp;/g, '&').replace(/'/g, "\\'");
                return `<a href="#" onclick="siecioslawApp.addTab('${cleanUrl}'); return false;" class="text-blue-400 hover:text-blue-300 hover:underline font-bold cursor-pointer">🔗 ${txt}</a>`;
            });
            htmlText = htmlText.replace(/(^|\s|&gt;)(https?:\/\/[^\s<]+)/g, (m, prefix, url) => {
                let cleanUrl = url.replace(/&amp;/g, '&').replace(/'/g, "\\'");
                return `${prefix}<a href="#" onclick="siecioslawApp.addTab('${cleanUrl}'); return false;" class="text-blue-400 hover:text-blue-300 hover:underline font-bold cursor-pointer">🔗 ${url}</a>`;
            });

            htmlText = htmlText.replace(/\*\*(.*?)\*\*/g, '<b class="text-blue-400">$1</b>').replace(/\n/g, '<br>');
            htmlText = htmlText.replace(/`(.*?)`/g, '<code class="bg-black/30 text-blue-300 px-1 py-0.5 rounded font-mono text-xs border g-border">$1</code>');

            let ttsButton = (!isUser && typeof podpowiadaczApp !== 'undefined') ? `<button data-playing="false" class="text-[9px] text-gray-400 hover:text-emerald-400 font-bold ml-2 uppercase tracking-wider" onclick="podpowiadaczApp.readText(this, \`${htmlText.replace(/`/g, "'").replace(/<[^>]*>?/gm, '')}\`)">🔊 Czytaj</button>` : '';

            const el = document.createElement('div');
            el.className = `flex flex-col max-w-[90%] sm:max-w-[85%] ${alignClass} mb-3 shadow-md ${bgClass} ${radiusClass} p-3 text-xs leading-relaxed relative select-text cursor-auto`;
            el.style.userSelect = "text";
            el.style.webkitUserSelect = "text";

            el.innerHTML = `
                <div class="flex items-center justify-between mb-2 border-b border-white/10 pb-1 w-full opacity-70">
                    <span class="text-[9px] font-bold uppercase tracking-wider">${isUser ? '👤 Ty' : '🤖 BigAI'}</span>
                    ${ttsButton}
                </div>
                <div class="w-full break-words space-y-1 font-sans">
                    ${htmlText}
                </div>
            `;
            chatBox.appendChild(el);
        });

        if (siecioslawApp.isAIThinking) {
            chatBox.innerHTML += `<div class="self-start text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 mb-2 animate-pulse">Łączenie z chmurą BigAI...</div>`;
        }

        chatBox.scrollTop = chatBox.scrollHeight;
    },

    sendAI: async (msgText) => {
        if(!msgText.trim()) return;

        siecioslawApp.aiMessages.push({ role: 'user', text: msgText, rawText: msgText });
        siecioslawApp.isAIThinking = true;
        siecioslawApp.renderAIChat();

        const tab = siecioslawApp.tabs.find(t => t.id === siecioslawApp.activeTabId);
        const currentUrl = tab ? tab.url : 'Brak URL';
        const promptText = `Pytanie użytkownika: ${msgText}\n\nAktualnie przeglądany adres URL w przeglądarce to: ${currentUrl}. Jeśli pyta o tę stronę lub prosi o streszczenie, użyj narzędzia wyszukiwarki internetowej aby zdobyć o niej informacje i streścić zawartość.`;

        // POBIERANIE USTAWIEŃ Z GŁÓWNEGO PODPOWIADACZA
        const prov = typeof podpowiadaczApp !== 'undefined' ? podpowiadaczApp.settings.provider : 'gemini_free';
        const key = typeof podpowiadaczApp !== 'undefined' ? podpowiadaczApp.settings.apiKey : '';
        const mod = typeof podpowiadaczApp !== 'undefined' ? (podpowiadaczApp.settings.isCustomModel ? podpowiadaczApp.settings.customModel : podpowiadaczApp.settings.model) : 'gemini-3.1-flash-lite';

        const systemPrompt = "Jesteś asystentem wbudowanym w przeglądarkę Sieciosław w systemie BigOS. Twoim zadaniem jest pomaganie w analizie, tłumaczeniu i streszczaniu stron internetowych. ZAWSZE odpowiadaj bezpośrednio tekstem. NIE GENERUJ ŻADNEGO KODU w Pythonie (jak np. tools.search) do wyszukiwania informacji. Jeśli nie masz danych, po prostu odpowiedz, co wiesz.";

        let responseText = "Błąd API.";

        try {
            if (prov === 'gemini_free' || prov === 'gemini_api') {
                const actualKey = prov === 'gemini_free' ? '' : key;
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${actualKey}`;
                
                let geminiContents = [];
                let slice = siecioslawApp.aiMessages.slice(-8); 
                
                for (let m of slice) {
                    let role = m.role === 'assistant' ? 'model' : 'user';
                    let text = m.rawText || m.text;
                    
                    if (geminiContents.length === 0) {
                        if (role === 'model') continue; 
                        geminiContents.push({ role: role, parts: [{ text: text }] });
                    } else {
                        let lastMsg = geminiContents[geminiContents.length - 1];
                        if (lastMsg.role === role) {
                            lastMsg.parts[0].text += "\n\n" + text;
                        } else {
                            geminiContents.push({ role: role, parts: [{ text: text }] });
                        }
                    }
                }
                
                if (geminiContents.length > 0 && geminiContents[geminiContents.length - 1].role === 'user') {
                    geminiContents[geminiContents.length - 1].parts[0].text = promptText;
                } else {
                    geminiContents.push({ role: 'user', parts: [{ text: promptText }]});
                }

                const payload = {
                    contents: geminiContents,
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                };

                if (prov === 'gemini_free') payload.tools = [{ google_search: {} }];

                for (let i = 0; i < 3; i++) {
                    try {
                        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                        const data = await response.json();
                        if (response.ok) {
                            let textParts = data.candidates?.[0]?.content?.parts?.filter(p => p.text)?.map(p => p.text) || [];
                            responseText = textParts.join('\n') || "Brak odpowiedzi od Gemini.";
                            break;
                        } else {
                            if(i === 2) throw new Error(data.error?.message || response.statusText);
                        }
                    } catch (e) {
                        if(i === 2) throw e;
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            } 
            else if (prov === 'openrouter') {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${key}`,
                        "HTTP-Referer": window.location.href, 
                        "X-OpenRouter-Title": "BigOS Browser", 
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: mod,
                        messages: [
                            { role: "system", content: systemPrompt },
                            ...siecioslawApp.aiMessages.slice(0, -1).slice(-7).map(m => ({ role: m.role, content: m.rawText || m.text })),
                            { role: "user", content: promptText }
                        ]
                    })
                });
                const data = await response.json();
                if(!response.ok) throw new Error(`OpenRouter: ${data.error?.message || response.statusText}`);
                responseText = data.choices?.[0]?.message?.content || "Błąd parsowania.";
            }
            else if (prov === 'openai') {
                const response = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: mod,
                        messages: [
                            { role: "system", content: systemPrompt },
                            ...siecioslawApp.aiMessages.slice(0, -1).slice(-7).map(m => ({ role: m.role, content: m.rawText || m.text })),
                            { role: "user", content: promptText }
                        ]
                    })
                });
                const data = await response.json();
                if(!response.ok) throw new Error(`OpenAI: ${data.error?.message || response.statusText}`);
                responseText = data.choices?.[0]?.message?.content || "Błąd parsowania.";
            }
            else if (prov === 'groq') {
                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: mod,
                        messages: [
                            { role: "system", content: systemPrompt },
                            ...siecioslawApp.aiMessages.slice(0, -1).slice(-7).map(m => ({ role: m.role, content: m.rawText || m.text })),
                            { role: "user", content: promptText }
                        ]
                    })
                });
                const data = await response.json();
                if(!response.ok) throw new Error(`Groq: ${data.error?.message || response.statusText}`);
                responseText = data.choices?.[0]?.message?.content || "Błąd parsowania.";
            }

        } catch (error) {
            console.error(error);
            if (prov === 'gemini_free' && (error.message.includes("unregistered callers") || error.message.includes("API Key"))) {
                responseText = `⚠️ **Zabezpieczenie Google API:** \nUruchamiasz system BigOS lokalnie na własnym komputerze. Opcja "Darmowe wbudowane" działa tylko wewnątrz mojego symulatora (Canvas).\n\n👉 Wybierz w ustawieniach **"Własny Klucz Gemini"** i wklej tam swój darmowy klucz ze strony Google AI Studio.`;
            } else {
                responseText = `⚠️ **Błąd API (${prov}):** ${error.message}\nSprawdź poprawność klucza API w systemowym "Podpowiadaczu AI".`;
            }
        }

        // ==================================================================
        // OCZYSZCZANIE Z HALUCYNACJI (Filtr blokujący pisanie kodu Python)
        // ==================================================================
        responseText = responseText.replace(/```python\n[\s\S]*?\n```/gi, '').trim();
        if(responseText === "") responseText = "Przepraszam, wystąpił problem z przetworzeniem danych. Spróbuj zadać pytanie inaczej.";

        siecioslawApp.isAIThinking = false;
        siecioslawApp.aiMessages.push({ role: 'assistant', text: responseText, rawText: responseText });
        siecioslawApp.renderAIChat();
        
        if (typeof podpowiadaczApp !== 'undefined' && podpowiadaczApp.settings.autoTTS) {
            podpowiadaczApp.readText(null, responseText);
        }
    },

    // ==================================================================
    // INTEGRACJA Z BIGOS (Zapis na pulpit, Drukuj)
    // ==================================================================
    saveToBigOS: () => {
        const tab = siecioslawApp.tabs.find(t => t.id === siecioslawApp.activeTabId);
        if(!tab) return;
        
        let url = tab.url;
        let title = tab.title;

        if (url.startsWith('bigos://blocked')) {
            url = decodeURIComponent(url.split('?url=')[1]);
        }

        if (typeof fileSystem !== 'undefined' && typeof fsManager !== 'undefined') {
            const fileName = (title || 'Strona_WWW').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.html';
            
            const content = `
                <html>
                <head><title>Skrót do ${title}</title></head>
                <body style="font-family: sans-serif; text-align: center; margin-top: 20vh; background: #222; color: #fff;">
                    <h2 style="color: #60a5fa;">Skrót z Sieciosława</h2>
                    <p style="margin-bottom: 30px;">Oryginalny adres:<br> <span style="color: #9ca3af;">${url}</span></p>
                    <button onclick="parent.winManager.open('siecioslaw'); parent.siecioslawApp.addTab('${url}');" style="padding: 10px 20px; background: #2563eb; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.5);">🌐 Otwórz w Sieciosławie</button>
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

        let targetUrl = tab.url;
        if (targetUrl.startsWith('bigos://blocked')) {
            targetUrl = decodeURIComponent(targetUrl.split('?url=')[1]);
        }

        const idx = siecioslawApp.bookmarks.findIndex(b => b.url === targetUrl);
        if (idx > -1) {
            siecioslawApp.bookmarks.splice(idx, 1);
            if(typeof apps !== 'undefined') apps.showToast('Zakładki', 'Usunięto z ulubionych.', 'info');
        } else {
            siecioslawApp.bookmarks.push({ url: targetUrl, title: tab.title });
            if(typeof apps !== 'undefined') apps.showToast('Zakładki', 'Dodano stronę do zakładek!', 'success');
        }
        siecioslawApp.saveSettings();
        siecioslawApp.updateView(); 
    },

    addToHistory: (url, title) => {
        if(url === 'bigos://start') return;
        let saveUrl = url;
        if (saveUrl.startsWith('bigos://blocked')) {
            saveUrl = decodeURIComponent(saveUrl.split('?url=')[1]);
        }

        siecioslawApp.history.unshift({ url: saveUrl, title: title || saveUrl, date: new Date().toLocaleString() });
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

setTimeout(() => {
    siecioslawApp.init();
    if(typeof apps !== 'undefined') {
        apps.navigate = siecioslawApp.navigateFromBar;
    }
}, 500);