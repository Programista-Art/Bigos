// ======================================================================
// PLIK: js/aplikacje/skryba.js (Skryba 5.2 - Pamięć AI, Czysty UI, Zamykanie)
// ======================================================================

window.skrybaApp = {
    currentFileId: null,
    isDirty: false,
    autoSaveInt: null,
    reminderInt: null,
    currentFilter: 'all', 
    searchQuery: '',
    isFocusMode: false,
    recognition: null,
    
    // Pamięć ustawień AI
    aiParams: { tone: '', style: '', audience: '', goal: '' },

    init: async () => {
        // Asynchroniczne ładowanie parametrów AI z IndexedDB
        try {
            const savedParams = await bigosDB.get('bigos_skryba_aiparams');
            if (savedParams) {
                window.skrybaApp.aiParams = typeof savedParams === 'string' ? JSON.parse(savedParams) : savedParams;
            }
        } catch(e) {}

        window.skrybaApp.upgradeUI();
        
        setTimeout(() => {
            const titleEl = document.getElementById('skryba-note-title');
            const editorEl = document.getElementById('skryba-editor');
            const tagsEl = document.getElementById('skryba-tags-input');
            const rawEl = document.getElementById('skryba-raw-editor');
            
            if(titleEl) titleEl.addEventListener('input', window.skrybaApp.markDirty);
            if(editorEl) {
                editorEl.addEventListener('input', () => { window.skrybaApp.markDirty(); window.skrybaApp.updateStats(); });
                editorEl.addEventListener('click', (e) => {
                    if (e.target && e.target.type === 'checkbox') {
                        if (e.target.hasAttribute('checked')) e.target.removeAttribute('checked');
                        else e.target.setAttribute('checked', 'checked');
                        window.skrybaApp.markDirty();
                    }
                });
            }
            if(rawEl) rawEl.addEventListener('input', () => { window.skrybaApp.markDirty(); window.skrybaApp.updateStats(); });
            if(tagsEl) tagsEl.addEventListener('input', window.skrybaApp.markDirty);

            const wrapper = document.getElementById('app-skryba');
            if(wrapper) {
                wrapper.addEventListener('keydown', (e) => {
                    if(e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); window.skrybaApp.saveNote(); }
                    if(e.ctrlKey && e.key.toLowerCase() === 'b') { e.preventDefault(); window.skrybaApp.execCmd('bold'); }
                    if(e.ctrlKey && e.key.toLowerCase() === 'i') { e.preventDefault(); window.skrybaApp.execCmd('italic'); }
                    if(e.ctrlKey && e.key.toLowerCase() === 'u') { e.preventDefault(); window.skrybaApp.execCmd('underline'); }
                    if(e.ctrlKey && e.key.toLowerCase() === 'f') { e.preventDefault(); window.skrybaApp.toggleSearchReplace(); }
                });

                wrapper.addEventListener('click', (e) => {
                    if(!e.target.closest('.skryba-dropdown-btn') && !e.target.closest('.skryba-dropdown-menu')) {
                        document.querySelectorAll('.skryba-dropdown-menu').forEach(m => m.classList.add('hidden'));
                    }
                });

                wrapper.addEventListener('dragover', e => { e.preventDefault(); document.getElementById('skryba-drag-overlay').classList.remove('hidden'); });
                wrapper.addEventListener('dragleave', e => { e.preventDefault(); document.getElementById('skryba-drag-overlay').classList.add('hidden'); });
                wrapper.addEventListener('drop', e => {
                    e.preventDefault(); 
                    document.getElementById('skryba-drag-overlay').classList.add('hidden');
                    const bigosItemId = e.dataTransfer.getData('text/plain');
                    if (bigosItemId && typeof fileSystem !== 'undefined') {
                        const item = fileSystem.find(i => i.id === bigosItemId);
                        if (item) { window.skrybaApp.insertBigOSItem(item); return; }
                    }
                    if (e.dataTransfer.files.length > 0) window.skrybaApp.handleDropFile(e.dataTransfer.files[0]);
                });
            }

            window.skrybaApp.setupTimers();
            window.skrybaApp.renderSidebar();
            window.skrybaApp.initSpeech();
        }, 500);
    },

    saveAIParams: () => {
        window.skrybaApp.aiParams = {
            tone: document.getElementById('skryba-ai-tone')?.value || '',
            style: document.getElementById('skryba-ai-style')?.value || '',
            audience: document.getElementById('skryba-ai-audience')?.value || '',
            goal: document.getElementById('skryba-ai-goal')?.value || ''
        };
        bigosDB.set('bigos_skryba_aiparams', window.skrybaApp.aiParams);
    },

    upgradeUI: () => {
        let appWindow = document.getElementById('app-skryba');
        if (!appWindow) return;

        appWindow.style.width = '1200px';
        appWindow.style.height = '750px';
        appWindow.style.background = 'transparent';
        appWindow.style.border = 'none';
        appWindow.style.boxShadow = 'none';
        appWindow.className = 'window absolute hidden';

        if (!document.getElementById('skryba-custom-css')) {
            const style = document.createElement('style');
            style.id = 'skryba-custom-css';
            style.innerHTML = `
                #skryba-editor h1 { font-size: 2.2em; font-weight: 900; margin-bottom: 0.5em; padding-bottom: 5px; }
                #skryba-editor h2 { font-size: 1.6em; font-weight: 800; margin-top: 1em; margin-bottom: 0.5em; }
                #skryba-editor ul { list-style-type: disc; margin-left: 2em; margin-bottom: 1em; }
                #skryba-editor ol { list-style-type: decimal; margin-left: 2em; margin-bottom: 1em; }
                #skryba-editor li { margin-bottom: 0.25em; }
                #skryba-editor blockquote { border-left: 4px solid #3b82f6; padding: 10px 15px; margin: 1em 0; font-style: italic; background: rgba(128,128,128,0.1); border-radius: 0 8px 8px 0; color: var(--grajek-muted); }
                #skryba-editor pre { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 8px; font-family: monospace; overflow-x: auto; margin: 1em 0; border: 1px solid rgba(255,255,255,0.1); }
                #skryba-editor pre code { background: transparent; padding: 0; border: none; }
                #skryba-editor a { color: #3b82f6; text-decoration: underline; cursor: pointer; }
                .ai-btn-group { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px; border-radius: 8px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); margin-bottom: 12px; }
            `;
            document.head.appendChild(style);
        }

        const languages = [
            "Angielski", "Arabski", "Bułgarski", "Chiński", "Chorwacki", "Czeski", "Duński", "Estoński", "Fiński", "Francuski",
            "Grecki", "Hebrajski", "Hindi", "Hiszpański", "Holenderski", "Indonezyjski", "Japoński", "Koreański", "Litewski", "Łotewski",
            "Niemiecki", "Norweski", "Polski", "Portugalski", "Rosyjski", "Rumuński", "Serbski", "Słowacki", "Słoweński", "Szwedzki",
            "Tajski", "Turecki", "Ukraiński", "Węgierski", "Wietnamski", "Włoski"
        ];
        const langOptions = languages.map(l => `<option value="${l}" class="g-bg g-text">${l}</option>`).join('');

        const proUI = document.createElement('div');
        proUI.className = 'flex flex-col overflow-hidden relative themed-app g-panel rounded-lg shadow-2xl h-full w-full transition-all duration-300';
        proUI.id = "skryba-main-container";

        proUI.innerHTML = `
            <!-- GŁÓWNY PASEK TYTUŁOWY Z MENU PLIK -->
            <div id="skryba-title-bar" class="px-4 py-2 border-b g-border flex justify-between items-center cursor-move bg-black/30 shrink-0 transition-all duration-300 relative z-[60]" onmousedown="winManager.startDrag(event, 'app-skryba')" ontouchstart="winManager.startDrag(event, 'app-skryba')">
                <div class="flex items-center gap-4">
                    <span class="text-sm font-bold g-accent drop-shadow-md flex items-center gap-2">📝 Skryba <span class="text-[10px] g-text-muted font-normal border g-border px-1.5 rounded bg-black/20">Wydanie: Notatki & AI</span></span>
                    
                    <!-- MENU GŁÓWNE -->
                    <div class="relative group ml-4 h-full flex items-center">
                        <button class="skryba-dropdown-btn px-3 py-1 hover:bg-white/10 transition cursor-pointer g-text font-bold text-xs rounded border border-transparent hover:border-gray-500/50" onclick="document.getElementById('skryba-file-menu').classList.toggle('hidden'); event.stopPropagation();">Plik</button>
                        <div id="skryba-file-menu" class="skryba-dropdown-menu absolute left-0 top-full hidden flex-col g-panel border g-border shadow-2xl rounded min-w-[220px] z-[9999] mt-2 py-1">
                            <button class="text-left px-4 py-2 hover:bg-blue-500 hover:text-white transition text-xs g-text font-bold" onclick="window.skrybaApp.createNewNote()"><span class="w-5 inline-block">📄</span> Nowy Plik</button>
                            <div class="border-t g-border my-1"></div>
                            <button class="text-left px-4 py-2 hover:bg-blue-500 hover:text-white transition text-xs g-text" onclick="window.skrybaApp.showOpenBigOSModal()"><span class="w-5 inline-block">📂</span> Otwórz z BigOS...</button>
                            <button class="text-left px-4 py-2 hover:bg-blue-500 hover:text-white transition text-xs g-text" onclick="document.getElementById('skryba-open-pc-menu').click()"><span class="w-5 inline-block">💻</span> Otwórz z komputera PC...</button>
                            <input type="file" id="skryba-open-pc-menu" class="hidden" accept=".txt,.html,.md,.csv,.rtf,.doc,.docx" onchange="window.skrybaApp.openLocalFile(event)">
                            <div class="border-t g-border my-1"></div>
                            <button class="text-left px-4 py-2 hover:bg-blue-500 hover:text-white transition text-xs g-text font-bold" onclick="window.skrybaApp.saveNote()"><span class="w-5 inline-block">💾</span> Zapisz (W systemie BigOS)</button>
                            <button class="text-left px-4 py-2 hover:bg-blue-500 hover:text-white transition text-xs g-text" onclick="window.skrybaApp.showSaveBigOSModal(true)"><span class="w-5 inline-block">📝</span> Zapisz Jako Kopię...</button>
                            <div class="border-t g-border my-1"></div>
                            <button class="text-left px-4 py-2 hover:bg-blue-500 hover:text-white transition text-xs g-text" onclick="window.skrybaApp.closeCurrentFile()"><span class="w-5 inline-block">📁</span> Zamknij plik</button>
                            <button class="text-left px-4 py-2 hover:bg-blue-500 hover:text-white transition text-xs g-text" onclick="window.skrybaApp.closeCurrentFile()"><span class="w-5 inline-block">🗑️</span> Zamknij wszystko</button>
                            <div class="border-t g-border my-1"></div>
                            <button class="text-left px-4 py-2 hover:bg-emerald-600 hover:text-white transition text-xs g-text font-bold text-emerald-400" onclick="window.skrybaApp.showExportPCModal()"><span class="w-5 inline-block">📥</span> Eksportuj na dysk PC...</button>
                            <button class="text-left px-4 py-2 hover:bg-blue-500 hover:text-white transition text-xs g-text" onclick="window.skrybaApp.printNote()"><span class="w-5 inline-block">🖨️</span> Drukuj / PDF</button>
                            <div class="border-t g-border my-1"></div>
                            <button class="text-left px-4 py-2 hover:bg-red-600 hover:text-white transition text-xs font-bold text-red-400" onclick="winManager.close('skryba')"><span class="w-5 inline-block">❌</span> Zamknij program</button>
                        </div>
                    </div>
                </div>

                <div class="flex gap-2 relative z-50">
                    <button onclick="window.skrybaApp.toggleFocusMode()" class="g-icon-btn px-1 text-emerald-400 hover:text-emerald-300 transition" title="Tryb Skupienia (Znikające panele)">🎯</button>
                    <div class="w-px h-4 bg-gray-600 mx-1 self-center"></div>
                    <button onclick="winManager.minimize('skryba')" class="g-icon-btn px-1 hover:text-white transition">_</button>
                    <button onclick="winManager.maximize('app-skryba')" class="g-icon-btn px-1 hover:text-white transition">□</button>
                    <button onclick="winManager.close('skryba')" class="text-red-500 hover:text-red-400 px-1 font-bold transition">✖</button>
                </div>
            </div>
            
            <div id="skryba-focus-drag" class="hidden absolute top-0 left-0 right-0 h-8 z-[9000] cursor-move" onmousedown="winManager.startDrag(event, 'app-skryba')" ontouchstart="winManager.startDrag(event, 'app-skryba')"></div>

            <div class="flex flex-row flex-grow overflow-hidden relative">
                
                <!-- LEWY PANEL -->
                <div id="skryba-sidebar" class="w-[260px] border-r g-border bg-black/10 flex flex-col shrink-0 transition-all duration-300">
                    <div class="p-3 border-b g-border bg-black/20 flex gap-2">
                        <button onclick="window.skrybaApp.createNewNote()" class="flex-grow g-btn bg-blue-600/20 hover:bg-blue-500 text-blue-400 hover:text-white border-blue-500/50 py-2 rounded-lg font-bold shadow-sm flex items-center justify-center gap-2 transition">
                            <span class="text-lg">➕</span> Nowa Notatka
                        </button>
                    </div>
                    
                    <div class="flex flex-col gap-1 p-2 border-b g-border">
                        <div class="relative">
                            <span class="absolute left-2 top-1.5 opacity-50">🔍</span>
                            <input type="text" id="skryba-search-notes" placeholder="Szukaj w BigOS..." class="w-full py-1.5 pl-7 pr-2 text-xs g-bg g-text border g-border rounded outline-none focus:border-blue-500 shadow-inner transition" oninput="window.skrybaApp.renderSidebar()">
                        </div>
                    </div>

                    <div class="flex gap-1 px-2 py-2 border-b g-border shrink-0">
                        <button onclick="window.skrybaApp.setFilter('all')" id="skryba-filt-all" class="flex-1 g-btn text-[10px] rounded py-1.5 bg-blue-500/30 font-bold border-blue-500">Wszystkie</button>
                        <button onclick="window.skrybaApp.setFilter('fav')" id="skryba-filt-fav" class="flex-1 g-btn text-[10px] rounded py-1.5 hover:bg-white/10 border-transparent">⭐</button>
                        <button onclick="window.skrybaApp.setFilter('locked')" id="skryba-filt-locked" class="flex-1 g-btn text-[10px] rounded py-1.5 hover:bg-white/10 border-transparent">🔒</button>
                    </div>

                    <div class="flex-grow overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1" id="skryba-notes-list">
                    </div>
                </div>

                <!-- GŁÓWNY OBSZAR ROBOCZY -->
                <div class="flex-grow flex flex-col relative bg-black/5" id="skryba-workspace">
                    
                    <!-- Pasek Narzędzi -->
                    <div id="skryba-toolbar" class="p-2 border-b g-border bg-black/20 flex flex-wrap items-center gap-1 shrink-0 shadow-sm z-10 transition-all duration-300">
                        
                        <!-- Formatowanie tekstu -->
                        <div class="flex items-center bg-black/30 p-1 rounded-lg border g-border hidden sm:flex mr-1">
                            <button onmousedown="event.preventDefault(); window.skrybaApp.execCmd('bold')" class="w-8 h-8 flex items-center justify-center rounded font-bold hover:bg-white/10 transition g-text" title="Pogrubienie (Ctrl+B)">B</button>
                            <button onmousedown="event.preventDefault(); window.skrybaApp.execCmd('italic')" class="w-8 h-8 flex items-center justify-center rounded italic hover:bg-white/10 transition g-text" title="Kursywa (Ctrl+I)">I</button>
                            <button onmousedown="event.preventDefault(); window.skrybaApp.execCmd('underline')" class="w-8 h-8 flex items-center justify-center rounded underline hover:bg-white/10 transition g-text" title="Podkreślenie">U</button>
                            <button onmousedown="event.preventDefault(); window.skrybaApp.execCmd('strikeThrough')" class="w-8 h-8 flex items-center justify-center rounded line-through hover:bg-white/10 transition g-text" title="Przekreślenie">S</button>
                        </div>
                        
                        <!-- CZCIONKA, ROZMIAR, KOLORY -->
                        <div class="flex items-center bg-black/30 p-1 rounded-lg border g-border hidden md:flex gap-1">
                            <select onchange="window.skrybaApp.execCmd('fontName', this.value)" class="text-[10px] g-bg g-text border g-border rounded outline-none p-1 cursor-pointer h-8" title="Czcionka">
                                <option value="Arial" class="g-bg g-text">Arial</option>
                                <option value="Times New Roman" class="g-bg g-text">Times New Roman</option>
                                <option value="Courier New" class="g-bg g-text">Courier New</option>
                                <option value="Verdana" class="g-bg g-text">Verdana</option>
                                <option value="Georgia" class="g-bg g-text">Georgia</option>
                                <option value="Tahoma" class="g-bg g-text">Tahoma</option>
                                <option value="Trebuchet MS" class="g-bg g-text">Trebuchet MS</option>
                                <option value="Comic Sans MS" class="g-bg g-text">Comic Sans</option>
                                <option value="Impact" class="g-bg g-text">Impact</option>
                            </select>
                            
                            <select onchange="window.skrybaApp.execCmd('fontSize', this.value)" class="text-[10px] g-bg g-text border g-border rounded outline-none p-1 cursor-pointer h-8" title="Rozmiar czcionki">
                                <option value="1" class="g-bg g-text">1 (Bardzo mała)</option>
                                <option value="2" class="g-bg g-text">2 (Mała)</option>
                                <option value="3" class="g-bg g-text" selected>3 (Normalna)</option>
                                <option value="4" class="g-bg g-text">4 (Średnia)</option>
                                <option value="5" class="g-bg g-text">5 (Duża)</option>
                                <option value="6" class="g-bg g-text">6 (Bardzo duża)</option>
                                <option value="7" class="g-bg g-text">7 (Ogromna)</option>
                            </select>

                            <div class="relative flex items-center justify-center h-8 bg-white/10 rounded px-1 cursor-pointer hover:bg-white/20" title="Kolor tekstu">
                                <span class="text-xs font-bold pointer-events-none mx-1 g-text">A</span>
                                <input type="color" onchange="window.skrybaApp.execCmd('foreColor', this.value)" class="w-6 h-6 p-0 border-none bg-transparent cursor-pointer rounded overflow-hidden">
                            </div>
                            
                            <div class="relative flex items-center justify-center h-8 bg-white/10 rounded px-1 cursor-pointer hover:bg-white/20" title="Kolor tła (Zakreślacz)">
                                <span class="text-xs pointer-events-none mx-1">🖍️</span>
                                <input type="color" onchange="window.skrybaApp.execCmd('hiliteColor', this.value)" value="#ffff00" class="w-6 h-6 p-0 border-none bg-transparent cursor-pointer rounded overflow-hidden">
                            </div>
                        </div>

                        <!-- Bloki i Listy -->
                        <div class="flex items-center bg-black/30 p-1 rounded-lg border g-border hidden lg:flex">
                            <button onmousedown="event.preventDefault(); window.skrybaApp.toggleHeader('H1')" class="px-2 h-8 flex items-center justify-center rounded font-bold hover:bg-white/10 text-xs transition g-text" title="Nagłówek 1">H1</button>
                            <button onmousedown="event.preventDefault(); window.skrybaApp.toggleHeader('H2')" class="px-2 h-8 flex items-center justify-center rounded font-bold hover:bg-white/10 text-xs transition g-text" title="Nagłówek 2">H2</button>
                            <div class="w-px h-5 bg-gray-600 mx-1"></div>
                            <button onmousedown="event.preventDefault(); window.skrybaApp.execCmd('insertUnorderedList')" class="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition g-text" title="Lista punktowana">• ≡</button>
                            <button onmousedown="event.preventDefault(); window.skrybaApp.execCmd('insertOrderedList')" class="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition g-text" title="Lista numerowana">1.</button>
                            <button onmousedown="event.preventDefault(); window.skrybaApp.insertChecklist()" class="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition text-emerald-400 font-bold" title="Checklista">☑</button>
                            <div class="w-px h-5 bg-gray-600 mx-1"></div>
                            <button onmousedown="event.preventDefault(); window.skrybaApp.insertCodeBlock()" class="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition font-mono text-xs g-text" title="Blok Kodu">&lt;/&gt;</button>
                            <button onmousedown="event.preventDefault(); window.skrybaApp.toggleBlockquote()" class="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition font-serif font-bold italic g-text-muted" title="Cytat (Włącz/Wyłącz)">”</button>
                        </div>

                        <!-- Narzędzia AI i Mikrofon -->
                        <div class="flex items-center bg-purple-500/10 p-1 rounded-lg border border-purple-500/30 ml-auto gap-1">
                            <button onclick="window.skrybaApp.toggleDictation()" id="skryba-btn-mic" class="w-8 h-8 flex items-center justify-center rounded font-bold hover:bg-white/10 transition text-orange-400" title="Dyktowanie Głosowe">🎤</button>
                            <button onclick="window.skrybaApp.readContent()" id="skryba-btn-read" class="px-3 h-8 flex items-center justify-center rounded font-bold hover:bg-white/10 transition text-blue-400 text-xs gap-1" title="Przeczytaj zaznaczony tekst">
                                🔊 Czytaj
                            </button>
                            <div class="w-px h-5 bg-purple-500/30 mx-1"></div>
                            <button onclick="window.skrybaApp.toggleAIPanel()" class="px-3 h-8 flex items-center justify-center rounded font-bold hover:bg-purple-500 hover:text-white transition text-purple-400 text-xs gap-1" title="Magia AI">
                                <span>✨</span> BigAI Tools
                            </button>
                        </div>
                    </div>

                    <!-- Pasek Metadanych -->
                    <div id="skryba-meta-bar" class="p-3 border-b g-border bg-black/10 flex flex-wrap gap-4 items-center shrink-0 transition-all duration-300">
                        <input type="text" id="skryba-note-title" placeholder="Bez Tytułu..." class="bg-transparent border-none outline-none text-2xl font-bold g-text min-w-[200px] flex-1">
                        
                        <div class="flex items-center gap-2 shrink-0">
                            <button onclick="window.skrybaApp.toggleLock()" id="skryba-btn-lock" class="g-icon-btn p-2 rounded transition hover:bg-white/10" title="Zabezpiecz Kodem PIN">🔓</button>
                            <button onclick="window.skrybaApp.toggleFav()" id="skryba-btn-fav" class="g-icon-btn p-2 rounded transition hover:bg-white/10" title="Ulubione">⭐</button>
                            <button onclick="window.skrybaApp.setReminder()" id="skryba-btn-rem" class="g-icon-btn p-2 rounded transition hover:bg-white/10 text-red-400" title="Przypomnienie">⏰</button>
                            <button onclick="window.skrybaApp.showRevisions()" class="g-icon-btn p-2 rounded transition hover:bg-white/10" title="Historia Zmian (Cofanie)">⏳</button>
                        </div>
                    </div>

                    <div class="px-4 py-1 bg-black/5 border-b g-border flex items-center gap-2 shrink-0">
                        <span class="text-[10px] g-text-muted font-bold uppercase tracking-widest shrink-0">TAGI:</span>
                        <input type="text" id="skryba-tags-input" placeholder="#projekt, #todo, #programowanie..." class="bg-transparent border-none outline-none text-xs g-text font-mono flex-1 text-blue-400">
                    </div>

                    <div id="skryba-search-replace-bar" class="hidden p-2 border-b g-border bg-blue-500/10 flex gap-2 items-center text-xs shrink-0 shadow-inner">
                        <input type="text" id="skryba-find-input" placeholder="Znajdź tekst..." class="p-1.5 g-bg g-text border g-border rounded outline-none w-32 focus:border-blue-500">
                        <input type="text" id="skryba-replace-input" placeholder="Zamień na..." class="p-1.5 g-bg g-text border g-border rounded outline-none w-32 focus:border-blue-500">
                        <button onclick="window.skrybaApp.doReplace()" class="g-btn px-3 py-1.5 rounded bg-blue-600/20 hover:bg-blue-500 text-blue-300 hover:text-white border-blue-500/50 transition font-bold shadow-sm">Zamień raz</button>
                        <button onclick="window.skrybaApp.doReplaceAll()" class="g-btn px-3 py-1.5 rounded bg-blue-600/20 hover:bg-blue-500 text-blue-300 hover:text-white border-blue-500/50 transition font-bold shadow-sm">Zamień wszystko</button>
                        <button onclick="window.skrybaApp.toggleSearchReplace()" class="text-red-400 hover:text-red-300 ml-auto font-bold px-2 text-sm transition">✖</button>
                    </div>

                    <!-- GŁÓWNY EDYTOR WYSIWYG / RAW -->
                    <div class="flex-grow flex flex-col p-6 overflow-y-auto custom-scrollbar relative bg-white dark:bg-[#1a1a1a]">
                        <div id="skryba-editor" contenteditable="true" class="flex-grow w-full max-w-4xl mx-auto outline-none text-gray-800 dark:text-gray-100 text-sm sm:text-base leading-relaxed transition-all" placeholder="Rozpocznij pisanie lub upuść plik z komputera / BigOS..."></div>
                        <textarea id="skryba-raw-editor" class="hidden flex-grow w-full max-w-4xl mx-auto outline-none g-bg g-text font-mono text-xs sm:text-sm resize-none custom-scrollbar p-3 border g-border rounded-lg shadow-inner" placeholder="Surowy kod lub tekst HTML..."></textarea>
                    </div>

                    <button id="skryba-exit-focus" onclick="window.skrybaApp.toggleFocusMode()" class="hidden absolute top-10 right-6 z-[9999] bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-full shadow-2xl font-bold transition-all border border-emerald-400 drop-shadow-lg cursor-pointer">🎯 Zakończ Skupienie</button>

                    <!-- Stopka ze Statystykami -->
                    <div id="skryba-footer" class="p-1.5 px-4 border-t g-border bg-black/20 flex justify-between items-center text-[10px] g-text-muted shrink-0 z-10 font-bold uppercase tracking-wider transition-all duration-300">
                        <div class="flex items-center gap-4">
                            <span id="skryba-status" class="flex items-center gap-1 text-green-500">🟢 Zapisano</span>
                            <div class="w-px h-3 bg-gray-600"></div>
                            <span id="skryba-word-count">Słów: 0</span>
                            <span id="skryba-char-count" class="hidden sm:inline">Znaków: 0</span>
                            <span id="skryba-read-time" class="hidden md:inline">Czas czytania: 0 min</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <label class="flex items-center gap-1.5 cursor-pointer hover:text-white transition" title="Pokaż w formacie kodu HTML">
                                <input type="checkbox" id="skryba-mode-raw" onchange="window.skrybaApp.toggleMode(this.checked)" class="accent-blue-500 w-3 h-3">
                                <span>&lt;/&gt; Tryb Źródłowy HTML</span>
                            </label>
                        </div>
                    </div>
                    
                    <div id="skryba-drag-overlay" class="hidden absolute inset-0 bg-blue-500/20 border-4 border-dashed border-blue-500 z-[90] flex items-center justify-center backdrop-blur-sm pointer-events-none">
                        <div class="text-2xl font-bold text-white drop-shadow-lg bg-black/50 px-8 py-4 rounded-2xl text-center">Upuść obrazek lub plik tekstowy, <br>aby wstawić jego zawartość do notatki!</div>
                    </div>
                </div>

                <!-- PRAWY PANEL: ZAAWANSOWANE NARZĘDZIA AI -->
                <div id="skryba-ai-sidebar" class="w-[300px] border-l g-border bg-black/20 hidden flex-col shrink-0 overflow-y-auto custom-scrollbar shadow-2xl relative z-20">
                    <div class="p-3 border-b g-border font-bold text-sm text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 flex justify-between items-center bg-black/30">
                        <span>✨ Narzędzia BigAI</span>
                        <button onclick="window.skrybaApp.toggleAIPanel()" class="text-red-400 hover:text-red-300">✖</button>
                    </div>

                    <div class="p-4 flex flex-col gap-2">
                        <p class="text-[10px] g-text-muted mb-2 leading-tight">Zaznacz tekst w edytorze i wybierz akcję (lub nie zaznaczaj nic, aby AI przeanalizowało CAŁĄ notatkę).</p>
                        
                        <!-- PARAMETRY AI Z ZAPISEM DO BAZY -->
                        <div class="text-[10px] font-bold g-accent uppercase tracking-widest mt-2">Parametry Wykonania</div>
                        <div class="grid grid-cols-2 gap-2 mb-2">
                            <select id="skryba-ai-tone" onchange="window.skrybaApp.saveAIParams()" class="p-1.5 rounded g-bg g-text border g-border text-[10px] outline-none shadow-inner cursor-pointer w-full">
                                <option value="">Ton: Domyślny</option>
                                <optgroup label="Podstawowe">
                                    <option value="Neutralny">Neutralny</option><option value="Naturalny">Naturalny</option><option value="Standardowy">Standardowy</option>
                                </optgroup>
                                <optgroup label="Przyjazny">
                                    <option value="Przyjazny">Przyjazny</option><option value="Ciepły">Ciepły</option><option value="Uprzejmy">Uprzejmy</option><option value="Życzliwy">Życzliwy</option><option value="Empatyczny">Empatyczny</option><option value="Motywujący">Motywujący</option>
                                </optgroup>
                                <optgroup label="Biznesowy">
                                    <option value="Formalny">Formalny</option><option value="Profesjonalny">Profesjonalny</option><option value="Urzędowy">Urzędowy</option><option value="Korporacyjny">Korporacyjny</option><option value="Dyplomatyczny">Dyplomatyczny</option>
                                </optgroup>
                                <optgroup label="Marketing">
                                    <option value="Reklamowy">Reklamowy</option><option value="Sprzedażowy">Sprzedażowy</option><option value="Perswazyjny">Perswazyjny</option><option value="Zachęcający">Zachęcający</option><option value="Promocyjny">Promocyjny</option><option value="SEO">SEO</option><option value="Call To Action">Call To Action</option>
                                </optgroup>
                                <optgroup label="Edukacyjny">
                                    <option value="Naukowy">Naukowy</option><option value="Techniczny">Techniczny</option><option value="Instruktażowy">Instruktażowy</option><option value="Ekspercki">Ekspercki</option><option value="Popularnonaukowy">Popularnonaukowy</option>
                                </optgroup>
                                <optgroup label="Publicystyczny">
                                    <option value="Artykuł">Artykuł</option><option value="Blogowy">Blogowy</option><option value="Informacyjny">Informacyjny</option><option value="Dziennikarski">Dziennikarski</option>
                                </optgroup>
                                <optgroup label="Kreatywny">
                                    <option value="Kreatywny">Kreatywny</option><option value="Opisowy">Opisowy</option><option value="Storytelling">Storytelling</option><option value="Poetycki">Poetycki</option><option value="Humorystyczny">Humorystyczny</option><option value="Inspirujący">Inspirujący</option>
                                </optgroup>
                                <optgroup label="Emocjonalny i Mocny">
                                    <option value="Entuzjastyczny">Entuzjastyczny</option><option value="Energiczny">Energiczny</option><option value="Spokojny">Spokojny</option><option value="Pewny siebie">Pewny siebie</option><option value="Stanowczy">Stanowczy</option><option value="Krytyczny">Krytyczny</option><option value="Sceptyczny">Sceptyczny</option><option value="Ostry">Ostry</option><option value="Bezpośredni">Bezpośredni</option><option value="Ironiczny">Ironczny</option><option value="Sarkastyczny">Sarkastyczny</option>
                                </optgroup>
                            </select>
                            
                            <select id="skryba-ai-style" onchange="window.skrybaApp.saveAIParams()" class="p-1.5 rounded g-bg g-text border g-border text-[10px] outline-none shadow-inner cursor-pointer w-full">
                                <option value="">Styl: Domyślny</option>
                                <option value="Prosty">Prosty</option><option value="Zwięzły">Zwięzły</option><option value="Rozbudowany">Rozbudowany</option><option value="Bardzo szczegółowy">Bardzo szczegółowy</option><option value="Krótki">Krótki</option><option value="Długi">Długi</option>
                            </select>
                            
                            <select id="skryba-ai-audience" onchange="window.skrybaApp.saveAIParams()" class="p-1.5 rounded g-bg g-text border g-border text-[10px] outline-none shadow-inner cursor-pointer w-full">
                                <option value="">Odbiorca: Domyślny</option>
                                <option value="Dla dziecka">Dla dziecka</option><option value="Dla ucznia">Dla ucznia</option><option value="Dla studenta">Dla studenta</option><option value="Dla programisty">Dla programisty</option><option value="Dla klienta">Dla klienta</option><option value="Dla firmy">Dla firmy</option><option value="Dla urzędu">Dla urzędu</option><option value="Dla nauczyciela">Dla nauczyciela</option><option value="Dla seniora">Dla seniora</option>
                            </select>

                            <select id="skryba-ai-goal" onchange="window.skrybaApp.saveAIParams()" class="p-1.5 rounded g-bg g-text border g-border text-[10px] outline-none shadow-inner cursor-pointer w-full">
                                <option value="">Cel: Domyślny</option>
                                <option value="Przekonać">Przekonać</option><option value="Wyjaśnić">Wyjaśnić</option><option value="Zachęcić">Zachęcić</option><option value="Poinformować">Poinformować</option><option value="Podsumować">Podsumować</option><option value="Zareklamować">Zareklamować</option><option value="Przeprosić">Przeprosić</option><option value="Podziękować">Podziękować</option><option value="Zaprosić">Zaprosić</option>
                            </select>
                        </div>

                        <div class="text-[10px] font-bold g-accent uppercase tracking-widest mt-2">Przekształć Tekst</div>
                        <div class="ai-btn-group">
                            <button onclick="window.skrybaApp.askAI('Napisz zwięzłe podsumowanie tego tekstu w kilku punktach.')" class="g-btn text-[10px] px-2 py-1 rounded border-gray-500/50">📄 Streść</button>
                            <button onclick="window.skrybaApp.askAI('Skróć ten tekst o około połowę, zachowując sens.')" class="g-btn text-[10px] px-2 py-1 rounded border-gray-500/50">✂️ Skróć</button>
                            <button onclick="window.skrybaApp.askAI('Rozbuduj tekst, dodając detale, profesjonalne słownictwo i argumenty.')" class="g-btn text-[10px] px-2 py-1 rounded border-gray-500/50">🪄 Rozbuduj</button>
                            <button onclick="window.skrybaApp.askAI('Popraw błędy ortograficzne, stylistyczne i interpunkcyjne.')" class="g-btn text-[10px] px-2 py-1 rounded border-gray-500/50">🧹 Popraw</button>
                            <button onclick="window.skrybaApp.askAI('Sformatuj ten tekst jako elegancką listę punktowaną HTML (tagi <ul> i <li>).')" class="g-btn text-[10px] px-2 py-1 rounded border-gray-500/50">📋 Zrób Listę</button>
                            <button onclick="window.skrybaApp.askAI('Zoptymalizuj ten tekst pod kątem SEO, nasyć słowami kluczowymi, daj chwytliwy nagłówek H1 i podtytuły H2.')" class="g-btn text-[10px] px-2 py-1 rounded border-gray-500/50">🔎 Optymalizuj SEO</button>
                        </div>

                        <div class="text-[10px] font-bold g-accent uppercase tracking-widest mt-2">Tłumaczenia z podglądem</div>
                        <div class="flex items-center gap-2 mb-2">
                            <select id="skryba-ai-lang" class="flex-grow p-1.5 rounded g-bg g-text border g-border text-[10px] outline-none shadow-inner cursor-pointer">
                                ${langOptions}
                            </select>
                            <button onclick="window.skrybaApp.translateAndPreview(document.getElementById('skryba-ai-lang').value)" class="g-btn text-[10px] px-3 py-1.5 rounded border-blue-500/50 bg-blue-500/10 hover:bg-blue-500 font-bold">Tłumacz</button>
                        </div>

                        <div class="text-[10px] font-bold g-accent uppercase tracking-widest mt-2">Napisz za mnie</div>
                        <div class="ai-btn-group">
                            <button onclick="window.skrybaApp.askAI('Na podstawie podanych notatek napisz profesjonalny artykuł blogowy. Użyj nagłówków.')" class="g-btn text-[10px] px-2 py-1 rounded border-purple-500/30 text-purple-300">📝 Artykuł</button>
                            <button onclick="window.skrybaApp.askAI('Przekształć te notatki w profesjonalnego e-maila do współpracowników/klienta.')" class="g-btn text-[10px] px-2 py-1 rounded border-purple-500/30 text-purple-300">✉️ E-mail</button>
                            <button onclick="window.skrybaApp.askAI('Przygotuj zwięzły plan działania / harmonogram projektu na podstawie tego tekstu.')" class="g-btn text-[10px] px-2 py-1 rounded border-purple-500/30 text-purple-300">🗓️ Plan Projektu</button>
                            <button onclick="window.skrybaApp.askAI('Napisz angażujący post na Facebooka na podstawie tego tekstu. Dodaj pasujące emotikony.')" class="g-btn text-[10px] px-2 py-1 rounded border-purple-500/30 text-purple-300">📘 Facebook</button>
                            <button onclick="window.skrybaApp.askAI('Napisz atrakcyjny post na Instagram na podstawie tego tekstu. Dodaj listę popularnych hashtagów na końcu i mnóstwo emotikon.')" class="g-btn text-[10px] px-2 py-1 rounded border-purple-500/30 text-purple-300">📸 Instagram</button>
                            <button onclick="window.skrybaApp.askAI('Napisz merytoryczny, profesjonalny post na LinkedIn na podstawie tego tekstu.')" class="g-btn text-[10px] px-2 py-1 rounded border-purple-500/30 text-purple-300">💼 LinkedIn</button>
                            <button onclick="window.skrybaApp.askAI('Napisz krótki, zwięzły post na platformę X (Twitter) na podstawie tego tekstu. Maksymalnie 280 znaków.')" class="g-btn text-[10px] px-2 py-1 rounded border-purple-500/30 text-purple-300">🐦 X (Twitter)</button>
                        </div>

                        <div class="text-[10px] font-bold g-accent uppercase tracking-widest mt-2">Dla Programistów</div>
                        <div class="ai-btn-group">
                            <button onclick="window.skrybaApp.askAI('Wygeneruj lub popraw kod HTML dla opisanego komponentu. Zwróć sam kod w formacie Markdown (bez backticków na początku/końcu HTML, żebym mógł go wkleić).')" class="g-btn text-[10px] px-2 py-1 rounded border-emerald-500/30 text-emerald-400">🌐 Napisz HTML</button>
                            <button onclick="window.skrybaApp.askAI('Wygeneruj elegancki kod CSS (Tailwind lub czysty) dla podanego opisu. Zwróć jako zwykły kod.')" class="g-btn text-[10px] px-2 py-1 rounded border-emerald-500/30 text-emerald-400">🎨 Napisz CSS</button>
                            <button onclick="window.skrybaApp.askAI('Napisz bezpieczny, zoptymalizowany kod JavaScript realizujący to zadanie.')" class="g-btn text-[10px] px-2 py-1 rounded border-emerald-500/30 text-emerald-400">⚡ Napisz JS</button>
                            <button onclick="window.skrybaApp.askAI('Wyjaśnij krok po kroku, co robi ten kod i jak działa.')" class="g-btn text-[10px] px-2 py-1 rounded border-emerald-500/30 text-emerald-400">💡 Wyjaśnij Kod</button>
                        </div>

                        <div class="text-[10px] font-bold g-accent uppercase tracking-widest mt-2 text-yellow-500">🧠 Pamięć BigOS (IndexedDB)</div>
                        <div class="flex flex-col gap-2 bg-yellow-500/10 border border-yellow-500/30 p-2 rounded-lg mb-4">
                            <button onclick="window.skrybaApp.saveToMemory()" class="g-btn text-[10px] px-2 py-1.5 rounded font-bold bg-yellow-500/20 border-yellow-500 text-yellow-300 hover:bg-yellow-500 hover:text-black transition">📥 Zapamiętaj to info</button>
                            <div class="flex gap-1 mt-1">
                                <input type="text" id="skryba-memory-query" placeholder="O czym zapomniałeś?" class="flex-grow p-1.5 rounded g-bg g-text border border-yellow-500/30 text-[10px] outline-none">
                                <button onclick="window.skrybaApp.recallMemory()" class="g-btn text-[10px] px-2 py-1 rounded border-yellow-500/50 bg-black/40 hover:bg-yellow-500/20 transition">Szukaj</button>
                            </div>
                        </div>

                        <div id="skryba-ai-status" class="text-[10px] font-mono g-text-muted text-center mt-2 animate-pulse hidden">Przetwarzanie w chmurze...</div>
                    </div>
                </div>

            </div>
        `;
        appWindow.appendChild(proUI);

        // Aplikowanie zapisanych parametrów AI z powrotem do UI
        if (window.skrybaApp.aiParams) {
            const tSel = document.getElementById('skryba-ai-tone');
            const sSel = document.getElementById('skryba-ai-style');
            const aSel = document.getElementById('skryba-ai-audience');
            const gSel = document.getElementById('skryba-ai-goal');
            if (tSel) tSel.value = window.skrybaApp.aiParams.tone || '';
            if (sSel) sSel.value = window.skrybaApp.aiParams.style || '';
            if (aSel) aSel.value = window.skrybaApp.aiParams.audience || '';
            if (gSel) gSel.value = window.skrybaApp.aiParams.goal || '';
        }
    },

    // ==================================================================
    // PLIK: ZAMYKANIE PLIKU, PROGRAMU
    // ==================================================================
    closeCurrentFile: () => {
        window.skrybaApp.saveNoteSilent();
        window.skrybaApp.currentFileId = null;
        document.getElementById('skryba-note-title').value = '';
        document.getElementById('skryba-editor').innerHTML = '';
        document.getElementById('skryba-raw-editor').value = '';
        document.getElementById('skryba-tags-input').value = '';
        window.skrybaApp.isDirty = false;
        document.getElementById('skryba-status').innerHTML = '<span class="g-text-muted">⚪ Brak pliku</span>';
        document.getElementById('skryba-word-count').innerText = 'Słów: 0';
        document.getElementById('skryba-char-count').innerText = 'Znaków: 0';
        document.getElementById('skryba-read-time').innerText = 'Czas czytania: 0 min';
        window.skrybaApp.updateToolbarUI();
        window.skrybaApp.renderSidebar();
        document.querySelectorAll('.skryba-dropdown-menu').forEach(m => m.classList.add('hidden'));
    },

    // ==================================================================
    // MAGIA AI I TŁUMACZENIA Z PODGLĄDEM
    // ==================================================================
    toggleAIPanel: () => {
        const panel = document.getElementById('skryba-ai-sidebar');
        if(panel.classList.contains('hidden')) { panel.classList.remove('hidden'); panel.classList.add('flex'); }
        else { panel.classList.add('hidden'); panel.classList.remove('flex'); }
    },

    translateAndPreview: async (lang) => {
        const sel = window.getSelection();
        let selectedText = sel.toString().trim();
        const editor = document.getElementById('skryba-editor');
        
        let targetText = selectedText;
        if (!targetText) {
            targetText = editor.innerText;
            if (!targetText.trim()) {
                if(typeof apps !== 'undefined') apps.showToast('BigAI', 'Brak tekstu do przetłumaczenia.', 'info');
                return;
            }
        }

        const btn = document.querySelector('#skryba-ai-sidebar button[onclick*="translateAndPreview"]');
        const oldText = btn.innerHTML;
        btn.innerHTML = `⚙️...`;
        btn.disabled = true;

        const prompt = `Przetłumacz poniższy tekst na język: ${lang}. Zachowaj oryginalne formatowanie HTML i akapity.`;
        
        const translatedHtml = await window.skrybaApp.askAI(prompt, targetText, true); 
        
        btn.innerHTML = oldText;
        btn.disabled = false;

        if (translatedHtml && translatedHtml !== "Błąd.") {
            window.skrybaApp.showTranslationModal(targetText, translatedHtml);
        }
    },

    showTranslationModal: (originalText, translatedHtml) => {
        const modalId = 'skryba-trans-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
        
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-4xl w-full border g-border flex flex-col h-[80vh]">
                <h2 class="text-xl font-bold g-text mb-4 border-b g-border pb-2 flex items-center gap-2"><span>🌍</span> Podgląd Tłumaczenia</h2>
                
                <div class="flex flex-col md:flex-row gap-4 flex-grow overflow-hidden mb-4">
                    <div class="flex-1 flex flex-col min-w-0">
                        <label class="text-[10px] g-text-muted font-bold uppercase tracking-widest mb-1">Oryginał</label>
                        <div class="flex-grow bg-black/20 g-text p-3 rounded-lg border g-border overflow-y-auto text-sm opacity-90 custom-scrollbar whitespace-pre-wrap">${typeof desktop !== 'undefined' ? desktop.escapeHTML(originalText) : originalText}</div>
                    </div>
                    <div class="flex-1 flex flex-col min-w-0">
                        <label class="text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-1">Przetłumaczona Wersja (Edytowalna)</label>
                        <div id="skryba-trans-result" class="flex-grow bg-blue-500/10 g-text p-3 rounded-lg border border-blue-500/50 overflow-y-auto text-sm custom-scrollbar focus:outline-none focus:border-blue-500 shadow-inner" contenteditable="true">${translatedHtml}</div>
                    </div>
                </div>

                <div class="flex justify-end gap-2 shrink-0 flex-wrap">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-gray-600/30 g-text hover:bg-gray-500/50 rounded-lg transition font-medium border border-gray-500/50 shadow-sm text-sm">Odrzuć</button>
                    <button onclick="window.skrybaApp.applyTranslation(false)" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition font-bold shadow-lg shadow-emerald-600/30 border border-emerald-700 text-sm">Wstaw na dole</button>
                    <button onclick="window.skrybaApp.applyTranslation(true)" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition font-bold shadow-lg shadow-blue-600/30 border border-blue-700 text-sm">Zastąp oryginał</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    applyTranslation: (replace) => {
        const resHtml = document.getElementById('skryba-trans-result').innerHTML;
        document.getElementById('skryba-trans-modal').remove();
        
        const editor = document.getElementById('skryba-editor');
        editor.focus();
        
        if (replace) {
            const sel = window.getSelection();
            if(sel.toString().trim()) {
                document.execCommand('insertHTML', false, resHtml);
            } else {
                editor.innerHTML = resHtml;
            }
        } else {
            editor.innerHTML += '<br><br><div style="border-top: 1px dashed gray; padding-top: 10px;"><b>--- Tłumaczenie ---</b><br>' + resHtml + '</div>';
            editor.scrollTop = editor.scrollHeight;
        }
        window.skrybaApp.markDirty();
        if(typeof apps !== 'undefined') apps.showToast('Sukces', 'Tłumaczenie wstawione.', 'success');
    },

    askAI: async (prompt, customTargetText = null, returnText = false) => {
        const sel = window.getSelection();
        const editor = document.getElementById('skryba-editor');
        
        let targetText = customTargetText !== null ? customTargetText : sel.toString().trim();
        let isFullReplace = false;

        if (!targetText) {
            targetText = editor.innerText;
            isFullReplace = true;
            if (!targetText.trim()) {
                if(typeof apps !== 'undefined') apps.showToast('BigAI', 'Twój notatnik jest pusty. Co mam przetworzyć?', 'info');
                return returnText ? "Błąd." : null;
            }
        }

        const prov = typeof podpowiadaczApp !== 'undefined' ? podpowiadaczApp.settings.provider : 'gemini_free';
        const key = typeof podpowiadaczApp !== 'undefined' ? podpowiadaczApp.settings.apiKey : '';
        const mod = typeof podpowiadaczApp !== 'undefined' ? (podpowiadaczApp.settings.isCustomModel ? podpowiadaczApp.settings.customModel : podpowiadaczApp.settings.model) : 'gemini-3.1-flash-lite';
        
        if (prov === 'gemini_api' && !key) {
            if(typeof apps !== 'undefined') apps.showToast('Błąd API', 'Ustaw klucz Gemini w aplikacji Podpowiadacz', 'error'); 
            return returnText ? "Błąd." : null;
        }

        const statusEl = document.getElementById('skryba-ai-status');
        if(statusEl) statusEl.classList.remove('hidden');
        
        try {
            const systemPrompt = "Jesteś asystentem redaktora notatek w BigOS. Odpowiadaj BEZPOŚREDNIO zmodyfikowanym wygenerowanym tekstem, bez komentarzy w stylu 'Oto wynik' czy znaczników bloków kodu markdown na zewnątrz (chyba że generujesz kod HTML). Stosuj formatowanie HTML wewnątrz odpowiedzi, np. <b>, <i>, <br>, <h1>, <ul>, <li> by wynik od razu wyglądał ładnie w edytorze WYSIWYG.";
            
            const toneSelect = document.getElementById('skryba-ai-tone');
            const styleSelect = document.getElementById('skryba-ai-style');
            const audSelect = document.getElementById('skryba-ai-audience');
            const goalSelect = document.getElementById('skryba-ai-goal');

            let metaParams = [];
            if(toneSelect && toneSelect.value) metaParams.push(`Ton/Styl: ${toneSelect.value}`);
            if(styleSelect && styleSelect.value) metaParams.push(`Format językowy: ${styleSelect.value}`);
            if(audSelect && audSelect.value) metaParams.push(`Odbiorca: ${audSelect.value}`);
            if(goalSelect && goalSelect.value) metaParams.push(`Cel tekstu: ${goalSelect.value}`);

            const paramsStr = metaParams.length > 0 ? "Parametry modyfikacji:\n" + metaParams.join('\n') + "\n\n" : "";
            const userPrompt = `${paramsStr}Wykonaj następujące polecenie:\n${prompt}\n\nTekst źródłowy:\n${targetText}`;
            
            let responseText = "Błąd.";

            if (prov === 'gemini_free' || prov === 'gemini_api') {
                const actualKey = prov === 'gemini_free' ? '' : key;
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${actualKey}`;
                const payload = {
                    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                };
                if (prov === 'gemini_free') payload.tools = [{ google_search: {} }];

                const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const data = await response.json();
                if(response.ok) {
                    let textParts = data.candidates?.[0]?.content?.parts?.filter(p => p.text)?.map(p => p.text) || [];
                    responseText = textParts.join('\n') || "Brak odpowiedzi od modelu.";
                } else throw new Error(data.error?.message || response.statusText);
            } 
            else {
                throw new Error("W Skrybie na razie włączony jest tylko silnik Google Gemini.");
            }

            responseText = responseText.replace(/```html\n|```\n|```/g, '').trim();

            if (returnText) return responseText;

            editor.focus();
            if (isFullReplace) {
                editor.innerHTML = responseText; 
            } else {
                document.execCommand('insertHTML', false, responseText); 
            }
            
            window.skrybaApp.markDirty();
            if(typeof apps !== 'undefined') apps.showToast('BigAI', 'Zastosowano zmiany z chmury!', 'success');

        } catch (e) {
            console.error(e);
            if(typeof apps !== 'undefined') apps.showToast('Błąd AI', e.message || 'Brak połączenia z BigAI.', 'error');
            return returnText ? "Błąd." : null;
        } finally {
            if(statusEl) statusEl.classList.add('hidden');
        }
    },

    // ==================================================================
    // PAMIĘĆ AI (MEMORY) W INDEXED-DB
    // ==================================================================
    saveToMemory: async () => {
        let text = window.getSelection().toString().trim();
        if (!text) text = document.getElementById('skryba-editor').innerText.trim();
        
        if (!text) return typeof apps !== 'undefined' ? apps.showToast('Pamięć', 'Brak tekstu do zapamiętania!', 'error') : null;

        let mem = [];
        try { 
            const saved = await bigosDB.get('bigos_ai_memory');
            if (saved) mem = typeof saved === 'string' ? JSON.parse(saved) : saved;
        } catch(e){}
        
        mem.push({ date: new Date().toLocaleString(), content: text });
        if(mem.length > 100) mem.shift(); 
        
        await bigosDB.set('bigos_ai_memory', mem);
        if(typeof apps !== 'undefined') apps.showToast('Pamięć BigAI', 'Zapisano do solidnej bazy IndexedDB!', 'success');
    },

    recallMemory: async () => {
        const query = document.getElementById('skryba-memory-query').value.trim();
        if (!query) return;

        let mem = [];
        try { 
            const saved = await bigosDB.get('bigos_ai_memory');
            if (saved) mem = typeof saved === 'string' ? JSON.parse(saved) : saved;
        } catch(e){}

        if (mem.length === 0) {
            if(typeof apps !== 'undefined') apps.showToast('Pamięć', 'Baza danych IndexedDB jest pusta.', 'info');
            return;
        }

        const memText = mem.map((m, i) => `[Wpis ${i} - ${m.date}]: ${m.content}`).join('\n\n');
        
        const prompt = `Użytkownik prosi o przypomnienie czegoś z pamięci.\nPytanie użytkownika: "${query}"\n\nPrzeszukaj bazę pamięci i sformułuj miłą, konkretną odpowiedź na podstawie tych danych. Zwróć ją jako HTML do wklejenia w notatnik. Baza pamięci:\n${memText}`;
        
        window.getSelection().removeAllRanges(); 
        const ed = document.getElementById('skryba-editor');
        ed.innerHTML += '<br><br><b>🧠 BigAI Przypomina:</b><br>';
        
        const r = document.createRange();
        r.selectNodeContents(ed);
        r.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);

        await window.skrybaApp.askAI(prompt);
        document.getElementById('skryba-memory-query').value = '';
    },

    // ==================================================================
    // CZYTANIE (TTS) Z PODPOWIADACZA
    // ==================================================================
    readContent: () => {
        const ed = document.getElementById('skryba-editor');
        let text = window.getSelection().toString().trim();
        if (!text) text = ed.innerText.trim();
        
        if (!text) return typeof apps !== 'undefined' ? apps.showToast('Czytanie', 'Brak tekstu.', 'info') : null;

        const btn = document.getElementById('skryba-btn-read');
        if (typeof podpowiadaczApp !== 'undefined') {
            podpowiadaczApp.readText(btn, text);
        } else {
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Moduł Podpowiadacza nie jest załadowany!', 'error');
        }
    },


    // ==================================================================
    // DYKTOWANIE GŁOSOWE
    // ==================================================================
    initSpeech: () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            window.skrybaApp.recognition = new SpeechRecognition();
            window.skrybaApp.recognition.lang = 'pl-PL';
            window.skrybaApp.recognition.interimResults = false; 
            window.skrybaApp.recognition.continuous = true; 

            window.skrybaApp.recognition.onstart = () => {
                const btn = document.getElementById('skryba-btn-mic');
                if(btn) {
                    btn.classList.add('bg-red-500', 'text-white', 'animate-pulse');
                    btn.classList.remove('text-orange-400');
                }
            };

            window.skrybaApp.recognition.onresult = (e) => {
                let newText = '';
                for (let i = e.resultIndex; i < e.results.length; ++i) {
                    if (e.results[i].isFinal) {
                        newText += e.results[i][0].transcript;
                    }
                }
                
                if (newText) {
                    const editor = document.getElementById('skryba-editor');
                    editor.focus();
                    document.execCommand('insertText', false, newText + ' ');
                    window.skrybaApp.markDirty();
                }
            };

            window.skrybaApp.recognition.onend = () => {
                const btn = document.getElementById('skryba-btn-mic');
                if(btn) {
                    btn.classList.remove('bg-red-500', 'text-white', 'animate-pulse');
                    btn.classList.add('text-orange-400');
                }
            };
        }
    },

    toggleDictation: () => {
        if (!window.skrybaApp.recognition) {
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Twoja przeglądarka nie wspiera dyktowania.', 'error');
            return;
        }
        const btn = document.getElementById('skryba-btn-mic');
        if(btn && btn.classList.contains('bg-red-500')) {
            window.skrybaApp.recognition.stop();
        } else {
            try { window.skrybaApp.recognition.start(); } catch(e) { window.skrybaApp.recognition.stop(); }
        }
    },

    // ==================================================================
    // OBSŁUGA ZMIAN I EDYTORA
    // ==================================================================
    markDirty: () => {
        window.skrybaApp.isDirty = true;
        const status = document.getElementById('skryba-status');
        if(status) status.innerHTML = '🟠 Zmieniono (Oczekuje na zapis)';
    },
    
    updateStats: () => {
        const isRaw = document.getElementById('skryba-mode-raw').checked;
        const text = isRaw ? document.getElementById('skryba-raw-editor').value : document.getElementById('skryba-editor').innerText;
        const charCount = text.length;
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        const readTime = Math.ceil(words / 200);

        document.getElementById('skryba-word-count').innerText = `Słów: ${words}`;
        const charEl = document.getElementById('skryba-char-count');
        if(charEl) charEl.innerText = `Znaków: ${charCount}`;
        const readEl = document.getElementById('skryba-read-time');
        if(readEl) readEl.innerText = `Czas czytania: ${readTime > 0 ? readTime : '<1'} min`;
    },

    execCmd: (cmd, val = null) => {
        const editor = document.getElementById('skryba-editor');
        if (cmd === 'hiliteColor' && !document.queryCommandSupported('hiliteColor')) cmd = 'backColor';
        document.execCommand(cmd, false, val);
        window.skrybaApp.markDirty();
        editor.focus();
    },

    toggleHeader: (level) => {
        const editor = document.getElementById('skryba-editor');
        editor.focus();
        const sel = window.getSelection();
        if(!sel.rangeCount) return;
        
        let node = sel.anchorNode;
        let isHeader = false;
        
        while(node && node !== editor) {
            if(node.nodeName === 'H1' || node.nodeName === 'H2') { isHeader = true; break; }
            node = node.parentNode;
        }
        
        if (isHeader) document.execCommand('formatBlock', false, 'DIV');
        else document.execCommand('formatBlock', false, level);
        
        window.skrybaApp.markDirty();
    },

    toggleBlockquote: () => {
        const editor = document.getElementById('skryba-editor');
        editor.focus();
        const sel = window.getSelection();
        if(!sel.rangeCount) return;
        
        let node = sel.anchorNode;
        let isQuote = false;
        
        while(node && node !== editor) {
            if(node.nodeName === 'BLOCKQUOTE') { isQuote = true; break; }
            node = node.parentNode;
        }
        
        if (isQuote) document.execCommand('formatBlock', false, 'DIV');
        else document.execCommand('formatBlock', false, 'BLOCKQUOTE');
        
        window.skrybaApp.markDirty();
    },

    insertChecklist: () => {
        const editor = document.getElementById('skryba-editor');
        editor.focus();
        const html = `<div><input type="checkbox" style="margin-right: 8px; cursor: pointer;">Zadanie...</div>`;
        document.execCommand('insertHTML', false, html);
        window.skrybaApp.markDirty();
    },

    insertCodeBlock: () => {
        const html = `<pre><code>Wpisz kod...</code></pre><br>`;
        document.execCommand('insertHTML', false, html);
        window.skrybaApp.markDirty();
    },

    toggleMode: (isRaw) => {
        const ed = document.getElementById('skryba-editor');
        const raw = document.getElementById('skryba-raw-editor');
        if (isRaw) {
            let html = ed.innerHTML;
            html = html.replace(/<br\s*[\/]?>/gi, "\n").replace(/<div[^>]*>/gi, "\n").replace(/<\/div>/gi, "").replace(/<p[^>]*>/gi, "\n").replace(/<\/p>/gi, "");
            raw.value = html;
            ed.classList.add('hidden');
            raw.classList.remove('hidden');
        } else {
            let text = raw.value;
            text = text.replace(/\n/g, '<br>');
            ed.innerHTML = text;
            raw.classList.add('hidden');
            ed.classList.remove('hidden');
        }
    },

    // ==================================================================
    // ZNAJDŹ I ZAMIEŃ
    // ==================================================================
    toggleSearchReplace: () => {
        const bar = document.getElementById('skryba-search-replace-bar');
        if(bar) {
            if (bar.classList.contains('hidden')) {
                bar.classList.remove('hidden');
                document.getElementById('skryba-find-input').focus();
            } else {
                bar.classList.add('hidden');
            }
        }
    },

    doReplace: () => {
        const findStr = document.getElementById('skryba-find-input').value;
        const repStr = document.getElementById('skryba-replace-input').value;
        if(!findStr) return;
        const isRaw = document.getElementById('skryba-mode-raw').checked;
        if(isRaw) {
            const raw = document.getElementById('skryba-raw-editor');
            raw.value = raw.value.replace(findStr, repStr);
        } else {
            const ed = document.getElementById('skryba-editor');
            ed.innerHTML = ed.innerHTML.replace(findStr, repStr);
        }
        window.skrybaApp.markDirty();
    },

    doReplaceAll: () => {
        const findStr = document.getElementById('skryba-find-input').value;
        const repStr = document.getElementById('skryba-replace-input').value;
        if(!findStr) return;
        const regex = new RegExp(findStr, 'g');
        const isRaw = document.getElementById('skryba-mode-raw').checked;
        if(isRaw) {
            const raw = document.getElementById('skryba-raw-editor');
            raw.value = raw.value.replace(regex, repStr);
        } else {
            const ed = document.getElementById('skryba-editor');
            ed.innerHTML = ed.innerHTML.replace(regex, repStr);
        }
        window.skrybaApp.markDirty();
    },

    // ==================================================================
    // ZARZĄDZANIE PLIKAMI I AUTO-ZAPIS
    // ==================================================================
    setupTimers: () => {
        if(window.skrybaApp.autoSaveInt) clearInterval(window.skrybaApp.autoSaveInt);
        if(window.skrybaApp.reminderInt) clearInterval(window.skrybaApp.reminderInt);
        
        window.skrybaApp.autoSaveInt = setInterval(() => { 
            if(window.skrybaApp.isDirty && window.skrybaApp.currentFileId) window.skrybaApp.saveNoteSilent(); 
        }, 5000);

        window.skrybaApp.reminderInt = setInterval(() => {
            if(typeof fileSystem === 'undefined') return;
            const now = Date.now();
            fileSystem.forEach(f => {
                if (f.type === 'file' && f.skrybaMeta && f.skrybaMeta.reminder && f.skrybaMeta.reminder <= now) {
                    if(typeof apps !== 'undefined') apps.showToast('⏰ Przypomnienie', `Notatka: ${f.name}`, 'info');
                    f.skrybaMeta.reminder = null; 
                    if(typeof fsManager !== 'undefined') fsManager.save();
                    if(f.id === window.skrybaApp.currentFileId) window.skrybaApp.updateToolbarUI();
                }
            });
        }, 5000); 
    },

    setFilter: (f) => {
        window.skrybaApp.currentFilter = f;
        document.querySelectorAll('#skryba-sidebar button[id^="skryba-filt-"]').forEach(b => {
            b.classList.remove('bg-blue-500/30', 'font-bold', 'border-blue-500');
            b.classList.add('hover:bg-white/10', 'border-transparent');
        });
        const active = document.getElementById('skryba-filt-' + f);
        if(active) {
            active.classList.add('bg-blue-500/30', 'font-bold', 'border-blue-500');
            active.classList.remove('hover:bg-white/10', 'border-transparent');
        }
        window.skrybaApp.renderSidebar();
    },

    renderSidebar: () => {
        if(typeof fileSystem === 'undefined') return;
        const list = document.getElementById('skryba-notes-list');
        const search = document.getElementById('skryba-search-notes').value.toLowerCase().trim();
        if(!list) return;

        let notes = fileSystem.filter(i => i.type === 'file' && i.name.match(/\.(txt|md|html|rtf|docx|doc|csv)$/i));
        
        if (window.skrybaApp.currentFilter === 'fav') notes = notes.filter(i => i.skrybaMeta && i.skrybaMeta.isFav);
        else if (window.skrybaApp.currentFilter === 'locked') notes = notes.filter(i => i.skrybaMeta && i.skrybaMeta.locked);
        
        notes = notes.filter(i => i.parentId !== 'hasiok');

        if(search) notes = notes.filter(i => i.name.toLowerCase().includes(search) || (i.skrybaMeta && i.skrybaMeta.tags && i.skrybaMeta.tags.toLowerCase().includes(search)));

        list.innerHTML = '';
        if(notes.length === 0) { list.innerHTML = '<div class="text-[10px] text-center g-text-muted mt-4">Brak notatek.</div>'; return; }

        notes.sort((a,b) => b.id.localeCompare(a.id)).forEach(note => {
            let meta = note.skrybaMeta || {};
            let isSel = note.id === window.skrybaApp.currentFileId;
            let icon = meta.locked ? '🔒' : '📄';

            const btn = document.createElement('button');
            btn.className = `w-full text-left p-2 rounded text-xs truncate transition flex items-center justify-between border ${isSel ? 'bg-blue-500/20 border-blue-500 g-text font-bold shadow-inner' : 'g-text hover:bg-white/10 border-transparent'}`;
            btn.innerHTML = `
                <div class="flex items-center gap-2 truncate">
                    <span class="text-sm shrink-0 drop-shadow-sm">${icon}</span> 
                    <span class="truncate">${typeof desktop !== 'undefined' ? desktop.escapeHTML(note.name) : note.name}</span>
                </div>
                ${meta.isFav ? '<span class="text-yellow-500 text-[10px] shrink-0 drop-shadow-md">⭐</span>' : ''}
            `;
            btn.onclick = () => window.skrybaApp.open(note);
            
            btn.oncontextmenu = (e) => { 
                e.preventDefault(); e.stopPropagation(); 
                if(typeof desktop !== 'undefined') desktop.showContextMenu(e, 'file', note.id); 
            };
            list.appendChild(btn);
        });
    },

    createNewNote: () => {
        window.skrybaApp.saveNoteSilent(); 
        window.skrybaApp.currentFileId = null;
        document.getElementById('skryba-note-title').value = '';
        document.getElementById('skryba-editor').innerHTML = '';
        document.getElementById('skryba-raw-editor').value = '';
        document.getElementById('skryba-tags-input').value = '';
        
        document.getElementById('skryba-editor').style.filter = 'none';
        document.getElementById('skryba-editor').contentEditable = "true";
        
        window.skrybaApp.isDirty = false;
        document.getElementById('skryba-status').innerHTML = '⚪ Nowy Plik';
        document.getElementById('skryba-word-count').innerText = 'Słów: 0';
        document.getElementById('skryba-char-count').innerText = 'Znaków: 0';
        document.getElementById('skryba-read-time').innerText = 'Czas czytania: 0 min';
        window.skrybaApp.updateToolbarUI();
        window.skrybaApp.renderSidebar();
        document.querySelectorAll('.skryba-dropdown-menu').forEach(m => m.classList.add('hidden'));
    },

    open: (fileItem) => { 
        window.skrybaApp.saveNoteSilent(); 

        window.skrybaApp.currentFileId = fileItem ? fileItem.id : null; 
        let name = fileItem ? fileItem.name : 'Nowa_Notatka.html';
        let content = fileItem ? (fileItem.content || '') : '';
        let meta = (fileItem && fileItem.skrybaMeta) ? fileItem.skrybaMeta : {};
        
        document.getElementById('skryba-note-title').value = name;
        document.getElementById('skryba-tags-input').value = meta.tags || '';

        const ed = document.getElementById('skryba-editor');
        
        if (meta.locked) {
            let savedPin = localStorage.getItem('bigos_patrzalka_pin');
            ed.style.filter = 'blur(10px)';
            ed.contentEditable = "false";
            ed.innerHTML = "<h2 style='text-align:center; color:red;'><br><br>🔒 Notatka Zabezpieczona Kodem PIN</h2>";
            
            if(typeof ui !== 'undefined' && savedPin) {
                ui.showPrompt("Podaj 4-cyfrowy PIN, aby odblokować notatkę:", "", "Otwórz", (pin) => {
                    if (pin === savedPin) {
                        ed.style.filter = 'none';
                        ed.contentEditable = "true";
                        ed.innerHTML = content;
                        if(typeof apps !== 'undefined') apps.showToast('Odblokowano', 'Dostęp przyznany', 'success');
                    }
                });
            }
        } else {
            ed.style.filter = 'none';
            ed.contentEditable = "true";
            ed.innerHTML = content;
        }
        
        window.skrybaApp.isDirty = false;
        document.getElementById('skryba-status').innerHTML = '<span class="text-green-500">🟢 Zapisano</span>';
        window.skrybaApp.updateStats();
        window.skrybaApp.updateToolbarUI();

        if(typeof winManager !== 'undefined') winManager.open('skryba'); 
        window.skrybaApp.renderSidebar();
    },

    updateToolbarUI: () => {
        if(!window.skrybaApp.currentFileId) return;
        const file = typeof fileSystem !== 'undefined' ? fileSystem.find(i => i.id === window.skrybaApp.currentFileId) : null;
        if(!file) return;

        let meta = file.skrybaMeta || {};
        const btnLock = document.getElementById('skryba-btn-lock');
        const btnFav = document.getElementById('skryba-btn-fav');
        const btnRem = document.getElementById('skryba-btn-rem');

        if(meta.locked) { btnLock.classList.add('bg-red-500/30','text-red-400'); btnLock.innerText = '🔒'; } 
        else { btnLock.classList.remove('bg-red-500/30','text-red-400'); btnLock.innerText = '🔓'; }
        
        if(meta.isFav) { btnFav.classList.add('bg-yellow-500/30','text-yellow-400'); } 
        else { btnFav.classList.remove('bg-yellow-500/30','text-yellow-400'); }
        
        if(meta.reminder) { btnRem.classList.add('bg-red-500/30','text-red-400'); } 
        else { btnRem.classList.remove('bg-red-500/30','text-red-400'); }
    },

    toggleFav: () => {
        if(!window.skrybaApp.currentFileId) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Zapisz plik najpierw.', 'error'); return; }
        const f = fileSystem.find(i => i.id === window.skrybaApp.currentFileId);
        if(!f) return;
        if(!f.skrybaMeta) f.skrybaMeta = {};
        f.skrybaMeta.isFav = !f.skrybaMeta.isFav;
        if(typeof fsManager !== 'undefined') fsManager.save();
        window.skrybaApp.updateToolbarUI();
        window.skrybaApp.renderSidebar();
    },

    toggleLock: () => {
        if(!window.skrybaApp.currentFileId) { if(typeof apps !== 'undefined') apps.showToast('Info', 'Najpierw zapisz notatkę.', 'info'); return; }
        
        let savedPin = localStorage.getItem('bigos_patrzalka_pin'); 
        if (!savedPin) {
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Najpierw ustaw kod PIN w aplikacji Patrzałka (Sejf).', 'error');
            return;
        }

        const f = fileSystem.find(i => i.id === window.skrybaApp.currentFileId);
        if(!f) return;
        if(!f.skrybaMeta) f.skrybaMeta = {};

        if (f.skrybaMeta.locked) {
            if(typeof ui !== 'undefined') {
                ui.showPrompt("Podaj 4-cyfrowy PIN, aby odblokować:", "", "Odblokuj", (pin) => {
                    if (pin === savedPin) {
                        f.skrybaMeta.locked = false;
                        if(typeof fsManager !== 'undefined') fsManager.save();
                        window.skrybaApp.updateToolbarUI();
                        document.getElementById('skryba-editor').style.filter = 'none';
                        document.getElementById('skryba-editor').contentEditable = "true";
                        if(typeof apps !== 'undefined') apps.showToast('Odblokowano', 'Notatka jest jawna', 'success');
                    } else {
                        if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Błędny kod PIN!', 'error');
                    }
                });
            }
        } else {
            f.skrybaMeta.locked = true;
            if(typeof fsManager !== 'undefined') fsManager.save();
            window.skrybaApp.updateToolbarUI();
            if(typeof apps !== 'undefined') apps.showToast('Zablokowano', 'Treść jest ukryta', 'success');
            window.skrybaApp.createNewNote();
        }
    },

    setReminder: () => {
        if(!window.skrybaApp.currentFileId) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Zapisz plik najpierw.', 'error'); return; }
        const f = fileSystem.find(i => i.id === window.skrybaApp.currentFileId);
        if(!f) return;
        if(!f.skrybaMeta) f.skrybaMeta = {};
        
        if (f.skrybaMeta.reminder) {
            f.skrybaMeta.reminder = null; 
            if(typeof fsManager !== 'undefined') fsManager.save();
            window.skrybaApp.updateToolbarUI();
            if(typeof apps !== 'undefined') apps.showToast('Info', 'Przypomnienie anulowane', 'info');
            return;
        }

        if(typeof ui !== 'undefined') {
            ui.showPrompt("Za ile minut przypomnieć o tej notatce?", "60", "Ustaw", (val) => {
                let min = parseInt(val);
                if(isNaN(min) || min <= 0) return;
                f.skrybaMeta.reminder = Date.now() + (min * 60000);
                if(typeof fsManager !== 'undefined') fsManager.save();
                window.skrybaApp.updateToolbarUI();
                if(typeof apps !== 'undefined') apps.showToast('Sukces', `Zadzwonię za ${min} min.`, 'success');
            });
        }
    },

    showRevisions: () => {
        if(!window.skrybaApp.currentFileId) return;
        const f = fileSystem.find(i => i.id === window.skrybaApp.currentFileId);
        if(!f || !f.skrybaMeta || !f.skrybaMeta.revisions || f.skrybaMeta.revisions.length === 0) {
            if(typeof apps !== 'undefined') apps.showToast('Historia', 'Brak zapisanych starszych wersji tej notatki.', 'info');
            return;
        }

        const modalId = 'skryba-rev-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
        
        let listHTML = '';
        f.skrybaMeta.revisions.reverse().forEach((rev, idx) => {
            listHTML += `<button class="w-full text-left px-3 py-2 g-bg g-text hover:bg-white/10 rounded transition border g-border mb-2 text-xs shadow-sm" onclick="document.getElementById('${modalId}').remove(); window.skrybaApp.restoreRevision(${idx})">⏳ Migawka z: <b>${rev.date}</b></button>`;
        });

        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-sm w-full border g-border">
                <h2 class="text-xl font-bold g-text mb-4 border-b g-border pb-2 flex items-center gap-2"><span>📜</span> Historia Wersji</h2>
                <div class="max-h-64 overflow-y-auto mb-4 pr-1 custom-scrollbar">${listHTML}</div>
                <div class="flex justify-end"><button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border shadow-sm">Zamknij</button></div>
            </div>
        `;
        document.body.appendChild(modal);
        f.skrybaMeta.revisions.reverse();
    },

    restoreRevision: (reverseIdx) => {
        const f = fileSystem.find(i => i.id === window.skrybaApp.currentFileId);
        const actualIdx = f.skrybaMeta.revisions.length - 1 - reverseIdx;
        const rev = f.skrybaMeta.revisions[actualIdx];
        
        document.getElementById('skryba-editor').innerHTML = rev.content;
        window.skrybaApp.markDirty();
        window.skrybaApp.saveNoteSilent();
        if(typeof apps !== 'undefined') apps.showToast('Sukces', `Przywrócono wersję z ${rev.date}`, 'success');
    },

    // ==================================================================
    // NOWY ZAPIS MODALNY I GENEROWANIE TREŚCI Z WYBOREM ROZSZERZEŃ
    // ==================================================================
    saveNoteSilent: () => {
        if(!window.skrybaApp.isDirty) return;
        
        if(!window.skrybaApp.currentFileId) {
            return;
        }

        const editor = document.getElementById('skryba-editor');
        const rawEditor = document.getElementById('skryba-raw-editor');
        const isRaw = document.getElementById('skryba-mode-raw').checked;
        const tags = document.getElementById('skryba-tags-input').value.trim();

        const f = fileSystem.find(i => i.id === window.skrybaApp.currentFileId);
        if(f) {
            // Zawsze wewnętrznie trzymamy stan edytora WYSIWYG, BigOS wie jak go renderować
            let contentToSave = isRaw ? rawEditor.value : editor.innerHTML;
            
            f.content = contentToSave; 
            if(!f.skrybaMeta) f.skrybaMeta = {};
            f.skrybaMeta.tags = tags;
            
            if(!f.skrybaMeta.revisions) f.skrybaMeta.revisions = [];
            if(f.skrybaMeta.revisions.length === 0 || (Date.now() - f.skrybaMeta.lastRevTime > 300000)) {
                f.skrybaMeta.revisions.push({ date: new Date().toLocaleString(), content: editor.innerHTML });
                if(f.skrybaMeta.revisions.length > 5) f.skrybaMeta.revisions.shift(); 
                f.skrybaMeta.lastRevTime = Date.now();
            }

            if(typeof fsManager !== 'undefined') fsManager.save(); 
        } 
        
        window.skrybaApp.isDirty = false;
        document.getElementById('skryba-status').innerHTML = '<span class="text-green-500">🟢 Zapisano Auto</span>';
        window.skrybaApp.renderSidebar();
        
        if (typeof desktop !== 'undefined') desktop.render(); 
    },

    saveNote: () => {
        document.querySelectorAll('.skryba-dropdown-menu').forEach(m => m.classList.add('hidden'));
        if (!window.skrybaApp.currentFileId) {
            window.skrybaApp.showSaveBigOSModal(false);
        } else {
            window.skrybaApp.saveNoteSilent();
            if(typeof apps !== 'undefined') apps.showToast('Skryba', 'Notatka zapisana na dysku BigOS.', 'success');
            document.getElementById('skryba-status').innerHTML = '<span class="text-green-500">🟢 Zapisano</span>';
        }
    },

    showSaveBigOSModal: (isCopy = false) => {
        document.querySelectorAll('.skryba-dropdown-menu').forEach(m => m.classList.add('hidden'));
        const modalId = 'skryba-save-bigos-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        let folderOptions = '<option value="root">Pulpit (Katalog Główny)</option>';
        if(typeof fileSystem !== 'undefined') {
            fileSystem.filter(f => f.type === 'folder' && f.id !== 'hasiok').forEach(folder => {
                let isSelected = (typeof fsManager !== 'undefined' && fsManager.currentFolder === folder.id) ? 'selected' : '';
                folderOptions += `<option value="${folder.id}" ${isSelected}>📂 ${typeof desktop !== 'undefined' ? desktop.escapeHTML(folder.name) : folder.name}</option>`;
            });
        }
        
        let title = document.getElementById('skryba-note-title').value || "Nowa Notatka";
        title = title.replace(/\.[^/.]+$/, ""); 

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-sm w-full border g-border flex flex-col">
                <h2 class="text-xl font-bold g-text mb-4 border-b g-border pb-2 flex items-center gap-2"><span>💾</span> Zapisz w BigOS</h2>
                
                <div class="mb-4">
                    <label class="block text-[10px] uppercase font-bold g-text-muted mb-1 tracking-wider">Nazwa pliku</label>
                    <input type="text" id="skryba-save-bigos-name" value="${title}" class="w-full p-2.5 g-bg g-text border g-border rounded outline-none focus:border-blue-500 font-bold shadow-inner text-sm">
                </div>
                
                <div class="mb-4">
                    <label class="block text-[10px] uppercase font-bold g-text-muted mb-1 tracking-wider">Format pliku w systemie</label>
                    <select id="skryba-save-bigos-format" class="w-full p-2.5 g-bg g-text border g-border rounded outline-none cursor-pointer focus:border-blue-500 text-sm shadow-inner font-semibold">
                        <option value="html">Format Skryby (.html) - Zachowuje w 100% formatowanie</option>
                        <option value="txt">Zwykły Tekst (.txt) - Płaski tekst bez stylów</option>
                    </select>
                </div>
                
                <div class="mb-6">
                    <label class="block text-[10px] uppercase font-bold g-text-muted mb-1 tracking-wider">Lokalizacja w systemie</label>
                    <select id="skryba-save-bigos-folder" class="w-full p-2.5 g-bg g-text border g-border rounded outline-none cursor-pointer focus:border-blue-500 text-sm shadow-inner font-semibold">
                        ${folderOptions}
                    </select>
                </div>

                <div class="flex justify-end gap-2 shrink-0">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-5 py-2.5 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border shadow-sm text-sm">Anuluj</button>
                    <button onclick="window.skrybaApp.executeSaveBigOS(${isCopy})" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-600/30 transition font-bold border border-blue-700 text-sm">Zapisz</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    executeSaveBigOS: (isCopy) => {
        const nameInput = document.getElementById('skryba-save-bigos-name').value.trim();
        const format = document.getElementById('skryba-save-bigos-format').value;
        const folderId = document.getElementById('skryba-save-bigos-folder').value;
        
        if(!nameInput) return;

        const isRaw = document.getElementById('skryba-mode-raw').checked;
        const editor = document.getElementById('skryba-editor');
        const rawEditor = document.getElementById('skryba-raw-editor');

        const finalName = nameInput.replace(/\.[^/.]+$/, "") + '.' + format;
        
        let contentToSave = editor.innerHTML;
        if (format === 'txt') {
            const el = document.createElement('div'); 
            el.innerHTML = editor.innerHTML.replace(/<br\s*[\/]?>/gi, "\n").replace(/<div[^>]*>/gi, "\n").replace(/<\/div>/gi, "").replace(/<p[^>]*>/gi, "\n").replace(/<\/p>/gi, ""); 
            contentToSave = el.innerText.replace(/\u00a0/g, " ").trimEnd();
        }

        if (typeof fileSystem !== 'undefined') {
            const newId = 'file_' + Date.now();
            fileSystem.push({ 
                id: newId, type: 'file', name: finalName, icon: '📄', content: contentToSave, 
                parentId: folderId, x: 30, y: 30, 
                skrybaMeta: { revisions: [{ date: new Date().toLocaleString(), content: editor.innerHTML }], lastRevTime: Date.now() } 
            }); 
            
            if(typeof fsManager !== 'undefined') fsManager.save(); 
            
            if (!isCopy) {
                window.skrybaApp.currentFileId = newId;
                document.getElementById('skryba-note-title').value = finalName;
                window.skrybaApp.isDirty = false;
                document.getElementById('skryba-status').innerHTML = '<span class="text-green-500">🟢 Zapisano</span>';
            }
            
            window.skrybaApp.renderSidebar();
            if(typeof desktop !== 'undefined') desktop.render(); 
            const aktowkaWin = document.getElementById('app-aktowka');
            if(aktowkaWin && aktowkaWin.classList.contains('active') && typeof fsManager !== 'undefined') fsManager.renderExplorerContent(fsManager.currentFolder);
            
            if(typeof apps !== 'undefined') apps.showToast('Skryba', `Zapisano ${isCopy ? 'kopię' : ''} jako ${finalName}`, 'success'); 
        }

        document.getElementById('skryba-save-bigos-modal').remove();
    },

    // ==================================================================
    // EKSPORT NA KOMPUTER FIZYCZNY (PC) I OTWIERANIE
    // ==================================================================
    showOpenBigOSModal: () => {
        document.querySelectorAll('.skryba-dropdown-menu').forEach(m => m.classList.add('hidden'));
        const modalId = 'skryba-open-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        let listHTML = '';
        if(typeof fileSystem !== 'undefined') {
            const files = fileSystem.filter(f => f.type === 'file' && f.parentId !== 'hasiok' && (f.name.endsWith('.txt') || f.name.endsWith('.md') || f.name.endsWith('.html') || f.name.endsWith('.csv') || f.name.endsWith('.rtf') || f.name.endsWith('.doc') || f.name.endsWith('.docx')));
            if(files.length === 0) {
                listHTML = '<div class="g-text-muted text-center py-4 text-xs">Brak dokumentów tekstowych na wirtualnym dysku.</div>';
            } else {
                files.forEach(f => {
                    listHTML += `<button class="w-full text-left px-3 py-2 g-bg g-text hover:bg-white/10 rounded transition border g-border mb-2 font-medium truncate shadow-sm" onclick="document.getElementById('${modalId}').remove(); window.skrybaApp.open(fileSystem.find(i=>i.id==='${f.id}'))">📄 ${typeof desktop !== 'undefined' ? desktop.escapeHTML(f.name) : f.name}</button>`;
                });
            }
        }

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-sm w-full border g-border">
                <h2 class="text-xl font-bold g-text mb-4 border-b g-border pb-2">📂 Otwórz z BigOS</h2>
                <div class="max-h-64 overflow-y-auto mb-4 pr-1 custom-scrollbar">
                    ${listHTML}
                </div>
                <div class="flex justify-end">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border">Zamknij</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    generateFileContent: (format, editorHtml, rawValue, isRaw, title) => {
        let text = "";
        let mime = "text/plain";
        let ext = ".txt";

        if (format === 'txt') {
            if (isRaw) {
                text = rawValue;
            } else {
                const el = document.createElement('div'); 
                el.innerHTML = editorHtml.replace(/<br\s*[\/]?>/gi, "\n").replace(/<div[^>]*>/gi, "\n").replace(/<\/div>/gi, "").replace(/<p[^>]*>/gi, "\n").replace(/<\/p>/gi, ""); 
                text = el.innerText.replace(/\u00a0/g, " ").trimEnd();
            }
        } 
        else if (format === 'html') {
            text = `<html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family: sans-serif; padding: 20px;"><h1>${title}</h1>${editorHtml}</body></html>`;
            mime = "text/html";
            ext = ".html";
        } 
        else if (format === 'rtf') {
            // ZAAWANSOWANY PARSER RTF Z KOLORAMI I NAGŁÓWKAMI
            const strToRTF = (str) => str.replace(/[\u0080-\uFFFF]/g, m => '\\uc1\\u' + m.charCodeAt(0) + '?');
            
            let colortbl = "{\\colortbl;\\red0\\green0\\blue0;"; 
            let colorMap = {};
            let colorIndex = 1;

            let rtfHtml = editorHtml.replace(/color:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})/gi, (match, hex) => {
                if(!colorMap[hex]) {
                    let r, g, b;
                    if(hex.length === 4) { r = parseInt(hex[1]+hex[1], 16); g = parseInt(hex[2]+hex[2], 16); b = parseInt(hex[3]+hex[3], 16); } 
                    else { r = parseInt(hex.substring(1,3), 16); g = parseInt(hex.substring(3,5), 16); b = parseInt(hex.substring(5,7), 16); }
                    colortbl += `\\red${r}\\green${g}\\blue${b};`;
                    colorMap[hex] = colorIndex++;
                }
                return `RTF_CF${colorMap[hex]}`; 
            });

            rtfHtml = rtfHtml.replace(/background-color:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})/gi, (match, hex) => {
                if(!colorMap[hex]) {
                    let r, g, b;
                    if(hex.length === 4) { r = parseInt(hex[1]+hex[1], 16); g = parseInt(hex[2]+hex[2], 16); b = parseInt(hex[3]+hex[3], 16); } 
                    else { r = parseInt(hex.substring(1,3), 16); g = parseInt(hex.substring(3,5), 16); b = parseInt(hex.substring(5,7), 16); }
                    colortbl += `\\red${r}\\green${g}\\blue${b};`;
                    colorMap[hex] = colorIndex++;
                }
                return `RTF_CB${colorMap[hex]}`;
            });

            colortbl += "}\n";

            let parsedRtf = rtfHtml
                .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\\pard\\b\\fs44 $1\\par\\b0\\fs24 ")
                .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\\pard\\b\\fs32 $1\\par\\b0\\fs24 ")
                .replace(/<span[^>]*style="[^"]*RTF_CF(\d+)[^"]*RTF_CB(\d+)[^"]*"[^>]*>(.*?)<\/span>/gi, "\\cf$1\\highlight$2 $3\\cf0\\highlight0 ")
                .replace(/<span[^>]*style="[^"]*RTF_CF(\d+)[^"]*"[^>]*>(.*?)<\/span>/gi, "\\cf$1 $2\\cf0 ")
                .replace(/<span[^>]*style="[^"]*RTF_CB(\d+)[^"]*"[^>]*>(.*?)<\/span>/gi, "\\highlight$1 $2\\highlight0 ")
                .replace(/<br\s*[\/]?>/gi, "\\par\n")
                .replace(/<div[^>]*>/gi, "\\par\n")
                .replace(/<\/div>/gi, "")
                .replace(/<p[^>]*>/gi, "\\par\n")
                .replace(/<\/p>/gi, "")
                .replace(/<b[^>]*>|<strong[^>]*>/gi, "\\b ")
                .replace(/<\/b>|<\/strong>/gi, "\\b0 ")
                .replace(/<i[^>]*>|<em[^>]*>/gi, "\\i ")
                .replace(/<\/i>|<\/em>/gi, "\\i0 ")
                .replace(/<u[^>]*>/gi, "\\ul ")
                .replace(/<\/u>/gi, "\\ul0 ")
                .replace(/<blockquote[^>]*>/gi, "\\par\\pard\\li720\\i ") 
                .replace(/<\/blockquote>/gi, "\\par\\pard\\i0 ")
                .replace(/<[^>]+>/g, ""); 

            text = "{\\rtf1\\ansi\\ansicpg1250\\deff0{\\fonttbl{\\f0\\fswiss\\fcharset238 Helvetica;}}\n" + colortbl + "\\fs24\n" + strToRTF(parsedRtf) + "\n}";
            mime = "application/rtf";
            ext = ".rtf";
        }
        else if (format === 'docx') {
            text = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1>${editorHtml}</body></html>`;
            mime = "application/vnd.ms-word";
            ext = ".doc"; 
        }

        return { text, mime, ext };
    },

    showExportPCModal: () => {
        document.querySelectorAll('.skryba-dropdown-menu').forEach(m => m.classList.add('hidden'));
        const modalId = 'skryba-export-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
        
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-sm w-full border g-border">
                <h2 class="text-xl font-bold g-text mb-4 border-b g-border pb-2 flex items-center gap-2"><span>📥</span> Eksport na dysk PC</h2>
                <div class="flex flex-col gap-2 mb-6">
                    <button class="w-full text-left px-3 py-2.5 g-bg g-text hover:bg-white/10 rounded-lg transition border g-border text-sm font-bold flex gap-3 items-center shadow-sm" onclick="document.getElementById('${modalId}').remove(); window.skrybaApp.exportNoteToPC('txt')"><span class="text-lg">📄</span> Zwykły Tekst (.txt)</button>
                    <button class="w-full text-left px-3 py-2.5 g-bg g-text hover:bg-white/10 rounded-lg transition border g-border text-sm font-bold flex gap-3 items-center shadow-sm" onclick="document.getElementById('${modalId}').remove(); window.skrybaApp.exportNoteToPC('html')"><span class="text-lg">🌐</span> Strona Sieciowa (.html) - Pełne Kolory</button>
                    <button class="w-full text-left px-3 py-2.5 g-bg g-text hover:bg-white/10 rounded-lg transition border g-border text-sm font-bold flex gap-3 items-center shadow-sm" onclick="document.getElementById('${modalId}').remove(); window.skrybaApp.exportNoteToPC('rtf')"><span class="text-lg">📝</span> Rich Text (.rtf) - Z kolorami</button>
                    <button class="w-full text-left px-3 py-2.5 g-bg g-text hover:bg-white/10 rounded-lg transition border g-border text-sm font-bold flex gap-3 items-center shadow-sm" onclick="document.getElementById('${modalId}').remove(); window.skrybaApp.exportNoteToPC('docx')"><span class="text-lg">📘</span> MS Word (.doc) - Pełne Kolory</button>
                    <button class="w-full text-left px-3 py-2.5 g-bg g-text hover:bg-white/10 rounded-lg transition border g-border text-sm font-bold flex gap-3 items-center shadow-sm" onclick="document.getElementById('${modalId}').remove(); window.skrybaApp.printNote()"><span class="text-lg">📕</span> Wydruk / PDF</button>
                </div>
                <div class="flex justify-end"><button onclick="document.getElementById('${modalId}').remove()" class="px-5 py-2.5 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border shadow-sm text-sm">Anuluj</button></div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    exportNoteToPC: (format) => { 
        const isRaw = document.getElementById('skryba-mode-raw').checked;
        const editor = document.getElementById('skryba-editor');
        const rawEditor = document.getElementById('skryba-raw-editor');
        let title = document.getElementById('skryba-note-title').value;
        if(!title) title = "Moja Notatka";
        title = title.replace(/\.[^/.]+$/, ""); 

        if (format === 'pdf') {
            window.skrybaApp.printNote();
            return;
        }
        
        const { text, mime, ext } = window.skrybaApp.generateFileContent(format, editor.innerHTML, rawEditor.value, isRaw, title);
        const finalName = title + ext;

        const blob = new Blob([text], { type: `${mime};charset=utf-8` }); 
        const a = document.createElement("a"); 
        a.href = URL.createObjectURL(blob); 
        a.download = finalName; 
        a.click(); 
        if(typeof apps !== 'undefined') apps.showToast('Skryba', `Rozpoczęto pobieranie ${finalName} na dysk PC`, 'info'); 
    },

    printNote: () => {
        document.querySelectorAll('.skryba-dropdown-menu').forEach(m => m.classList.add('hidden'));
        const printWindow = window.open('', '_blank');
        const title = document.getElementById('skryba-note-title').value;
        const html = document.getElementById('skryba-editor').innerHTML;
        printWindow.document.write(`
            <html><head><title>${title}</title>
            <style>
                body { font-family: sans-serif; padding: 40px; line-height: 1.6; color: #333; }
                h1 { border-bottom: 2px solid #ccc; padding-bottom: 10px; }
                img { max-width: 100%; height: auto; }
            </style>
            </head><body>
            <h1>${title}</h1>
            ${html}
            <script> window.onload = function() { window.print(); window.close(); } </script>
            </body></html>
        `);
        printWindow.document.close();
        if(typeof apps !== 'undefined') apps.showToast('Info', 'Wybierz "Zapisz jako PDF" w oknie drukowania!', 'info');
    },

    // ==================================================================
    // DRAG & DROP WPROST Z SYSTEMU BIGOS I PC ORAZ OTWIERANIE
    // ==================================================================
    insertBigOSItem: (item) => {
        const editor = document.getElementById('skryba-editor');
        editor.focus();
        
        if (item.type === 'image') {
            const imgHtml = `<img src="${item.content}" style="max-width: 100%; border-radius: 8px; margin: 10px 0; border: 1px solid #555;">`;
            document.execCommand('insertHTML', false, imgHtml);
            if(typeof apps !== 'undefined') apps.showToast('Wklejono', `Obraz ${item.name} z systemu BigOS`, 'success');
        } else if (item.type === 'file') {
            let cleanText = typeof desktop !== 'undefined' ? desktop.escapeHTML(item.content) : item.content;
            cleanText = cleanText.replace(/\n/g, '<br>');
            document.execCommand('insertHTML', false, `<br><hr><i>Załącznik ${item.name}:</i><br>${cleanText}<br>`);
            if(typeof apps !== 'undefined') apps.showToast('Wklejono', `Zawartość pliku ${item.name}`, 'success');
        } else {
            if(typeof apps !== 'undefined') apps.showToast('Błąd', `Nie można wkleić folderu lub gry do notatnika!`, 'error');
        }
        window.skrybaApp.markDirty();
    },

    handleDropFile: (file) => {
        const reader = new FileReader(); 
        if (file.type.startsWith('image/')) {
            reader.onload = (ev) => {
                const imgHtml = `<img src="${ev.target.result}" style="max-width: 100%; border-radius: 8px; margin: 10px 0; border: 1px solid #555;">`;
                document.getElementById('skryba-editor').focus();
                document.execCommand('insertHTML', false, imgHtml);
                window.skrybaApp.markDirty();
                if(typeof apps !== 'undefined') apps.showToast('Sukces', `Wstawiono obraz ${file.name}`, 'success');
            };
            reader.readAsDataURL(file);
        } else {
            reader.onload = (ev) => {
                const ed = document.getElementById('skryba-editor');
                ed.focus();
                let clean = typeof desktop !== 'undefined' ? desktop.escapeHTML(ev.target.result) : ev.target.result;
                document.execCommand('insertHTML', false, '<br><br><hr><i>Załącznik tekstowy z PC:</i><br>' + clean.replace(/\n/g, '<br>'));
                window.skrybaApp.markDirty();
            };
            reader.readAsText(file);
        }
    },

    openLocalFile: (e) => { 
        document.querySelectorAll('.skryba-dropdown-menu').forEach(m => m.classList.add('hidden'));
        const file = e.target.files[0]; 
        if(!file) return; 
        const reader = new FileReader(); 
        reader.onload = (ev) => { 
            window.skrybaApp.saveNoteSilent(); 
            
            document.getElementById('skryba-note-title').value = file.name;
            const ext = file.name.split('.').pop().toLowerCase();
            
            let content = ev.target.result;
            
            if (ext === 'rtf') {
                content = content.replace(/{\\[^}]+}/g, '').replace(/\\[a-z0-9-]+\s?/g, '').replace(/}/g, '').replace(/{/g, '').trim();
            }

            if (ext === 'txt' || ext === 'md' || ext === 'csv' || ext === 'rtf') {
                content = content.replace(/\n/g, '<br>');
            }
            
            document.getElementById('skryba-editor').innerHTML = content;
            document.getElementById('skryba-mode-raw').checked = false;
            window.skrybaApp.toggleMode(false);
            
            window.skrybaApp.currentFileId = null; 
            window.skrybaApp.isDirty = true;
            document.getElementById('skryba-status').innerHTML = '<span class="text-yellow-500">🟠 Wczytano (Niezapisane)</span>';
            window.skrybaApp.updateStats();
            window.skrybaApp.renderSidebar();
            
            if(typeof apps !== 'undefined') apps.showToast('Skryba', 'Wczytano plik z fizycznego dysku PC', 'success');
        }; 
        reader.readAsText(file); 
        e.target.value = ''; 
    },

    toggleFocusMode: () => {
        window.skrybaApp.isFocusMode = !window.skrybaApp.isFocusMode;
        
        const sidebar = document.getElementById('skryba-sidebar');
        const aiSidebar = document.getElementById('skryba-ai-sidebar');
        const toolbar = document.getElementById('skryba-toolbar');
        const metaBar = document.getElementById('skryba-meta-bar');
        const footer = document.getElementById('skryba-footer');
        const titleBar = document.getElementById('skryba-title-bar');
        const exitBtn = document.getElementById('skryba-exit-focus'); 
        const focusDrag = document.getElementById('skryba-focus-drag');

        if (window.skrybaApp.isFocusMode) {
            sidebar.classList.add('w-0', 'border-transparent', 'opacity-0'); sidebar.classList.remove('w-[260px]');
            if(aiSidebar) { aiSidebar.classList.add('hidden'); aiSidebar.classList.remove('flex'); }
            
            toolbar.style.marginTop = '-50px'; toolbar.style.opacity = '0'; toolbar.style.pointerEvents = 'none';
            metaBar.style.marginTop = '-50px'; metaBar.style.opacity = '0'; metaBar.style.pointerEvents = 'none';
            footer.style.marginBottom = '-30px'; footer.style.opacity = '0';
            titleBar.style.marginTop = '-40px'; titleBar.style.opacity = '0';

            if(exitBtn) exitBtn.classList.remove('hidden');
            if(focusDrag) focusDrag.classList.remove('hidden'); 

            const ed = document.getElementById('skryba-editor');
            ed.parentElement.classList.add('items-center');
            
            if(typeof apps !== 'undefined') apps.showToast('Skupienie', 'Wciśnij przycisk 🎯 na górze, aby wyjść.', 'info');
        } else {
            sidebar.classList.remove('w-0', 'border-transparent', 'opacity-0'); sidebar.classList.add('w-[260px]');
            
            toolbar.style.marginTop = '0'; toolbar.style.opacity = '1'; toolbar.style.pointerEvents = 'auto';
            metaBar.style.marginTop = '0'; metaBar.style.opacity = '1'; metaBar.style.pointerEvents = 'auto';
            footer.style.marginBottom = '0'; footer.style.opacity = '1';
            titleBar.style.marginTop = '0'; titleBar.style.opacity = '1';
            
            if(exitBtn) exitBtn.classList.add('hidden');
            if(focusDrag) focusDrag.classList.add('hidden');

            const ed = document.getElementById('skryba-editor');
            ed.parentElement.classList.remove('items-center');
        }
    }
};

setTimeout(window.skrybaApp.init, 500);