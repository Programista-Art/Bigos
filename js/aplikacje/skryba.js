// ======================================================================
// PLIK: js/aplikacje/skryba.js (Skryba 4.2 - Finalne Szlify, Poprawki UI i Eksportu)
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

    init: () => {
        window.skrybaApp.upgradeUI();
        
        setTimeout(() => {
            const titleEl = document.getElementById('skryba-note-title');
            const editorEl = document.getElementById('skryba-editor');
            const tagsEl = document.getElementById('skryba-tags-input');
            const rawEl = document.getElementById('skryba-raw-editor');
            
            if(titleEl) titleEl.addEventListener('input', window.skrybaApp.markDirty);
            if(editorEl) {
                editorEl.addEventListener('input', () => { window.skrybaApp.markDirty(); window.skrybaApp.updateStats(); });
                // Obsługa checklist kliknięciem
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

            // Skróty klawiszowe
            const wrapper = document.getElementById('app-skryba');
            if(wrapper) {
                wrapper.addEventListener('keydown', (e) => {
                    if(e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); window.skrybaApp.saveNote(); }
                    if(e.ctrlKey && e.key.toLowerCase() === 'b') { e.preventDefault(); window.skrybaApp.execCmd('bold'); }
                    if(e.ctrlKey && e.key.toLowerCase() === 'i') { e.preventDefault(); window.skrybaApp.execCmd('italic'); }
                    if(e.ctrlKey && e.key.toLowerCase() === 'u') { e.preventDefault(); window.skrybaApp.execCmd('underline'); }
                    if(e.ctrlKey && e.key.toLowerCase() === 'f') { e.preventDefault(); window.skrybaApp.toggleSearchReplace(); }
                });

                // Zamykanie rozwijanego menu zapisu przy kliknięciu gdziekolwiek w oknie
                wrapper.addEventListener('click', (e) => {
                    if(!e.target.closest('#skryba-save-menu-btn') && !e.target.closest('#skryba-save-menu')) {
                        const menu = document.getElementById('skryba-save-menu');
                        if(menu) menu.classList.add('hidden');
                    }
                });

                // DRAG & DROP
                wrapper.addEventListener('dragover', e => { e.preventDefault(); document.getElementById('skryba-drag-overlay').classList.remove('hidden'); });
                wrapper.addEventListener('dragleave', e => { e.preventDefault(); document.getElementById('skryba-drag-overlay').classList.add('hidden'); });
                wrapper.addEventListener('drop', e => {
                    e.preventDefault(); 
                    document.getElementById('skryba-drag-overlay').classList.add('hidden');
                    
                    const bigosItemId = e.dataTransfer.getData('text/plain');
                    if (bigosItemId && typeof fileSystem !== 'undefined') {
                        const item = fileSystem.find(i => i.id === bigosItemId);
                        if (item) {
                            window.skrybaApp.insertBigOSItem(item);
                            return;
                        }
                    }
                    if (e.dataTransfer.files.length > 0) window.skrybaApp.handleDropFile(e.dataTransfer.files[0]);
                });
            }

            window.skrybaApp.setupTimers();
            window.skrybaApp.renderSidebar();
            window.skrybaApp.initSpeech();
        }, 500);
    },

    upgradeUI: () => {
        let appWindow = document.getElementById('app-skryba');
        if (!appWindow) return;

        appWindow.style.width = '1100px';
        appWindow.style.height = '700px';
        appWindow.style.background = 'transparent';
        appWindow.style.border = 'none';
        appWindow.style.boxShadow = 'none';
        appWindow.className = 'window absolute hidden';

        // Gwarancja poprawnego wyświetlania formatowania - USUNIĘTO ŚMIECIOWE STYLE
        if (!document.getElementById('skryba-custom-css')) {
            const style = document.createElement('style');
            style.id = 'skryba-custom-css';
            style.innerHTML = `
                #skryba-editor h1 { font-size: 2.2em; font-weight: 900; margin-bottom: 0.5em; padding-bottom: 5px; }
                #skryba-editor h2 { font-size: 1.6em; font-weight: 800; margin-top: 1em; margin-bottom: 0.5em; }
                #skryba-editor ul { list-style-type: disc; margin-left: 2em; margin-bottom: 1em; }
                #skryba-editor ol { list-style-type: decimal; margin-left: 2em; margin-bottom: 1em; }
                #skryba-editor li { margin-bottom: 0.25em; }
                #skryba-editor blockquote { border-left: 4px solid #3b82f6; padding: 10px 15px; margin: 1em 0; font-style: italic; background: rgba(128,128,128,0.1); border-radius: 0 8px 8px 0; }
                #skryba-editor pre { background: rgba(0,0,0,0.5); color: #d4d4d4; padding: 15px; border-radius: 8px; font-family: monospace; overflow-x: auto; margin: 1em 0; border: 1px solid rgba(255,255,255,0.1); }
                #skryba-editor pre code { background: transparent; padding: 0; border: none; }
                #skryba-editor a { color: #3b82f6; text-decoration: underline; cursor: pointer; }
                .ai-btn-group { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px; border-radius: 8px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); margin-bottom: 12px; }
            `;
            document.head.appendChild(style);
        }

        // BAZA 50 JĘZYKÓW
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
            <!-- GŁÓWNY PASEK TYTUŁOWY -->
            <div id="skryba-title-bar" class="px-4 py-2 border-b g-border flex justify-between items-center cursor-move bg-black/30 shrink-0 transition-all duration-300 relative z-50" onmousedown="winManager.startDrag(event, 'app-skryba')" ontouchstart="winManager.startDrag(event, 'app-skryba')">
                <span class="text-sm font-bold g-accent drop-shadow-md flex items-center gap-2">📝 Skryba <span class="text-[10px] g-text-muted font-normal border g-border px-1.5 rounded bg-black/20">Wydanie: Notatki & AI</span></span>
                <div class="flex gap-2 relative z-50">
                    <button onclick="window.skrybaApp.toggleFocusMode()" class="g-icon-btn px-1 text-emerald-400 hover:text-emerald-300 transition" title="Tryb Skupienia (Znikające panele)">🎯</button>
                    <div class="w-px h-4 bg-gray-600 mx-1 self-center"></div>
                    <button onclick="winManager.minimize('skryba')" class="g-icon-btn px-1 hover:text-white transition">_</button>
                    <button onclick="winManager.maximize('app-skryba')" class="g-icon-btn px-1 hover:text-white transition">□</button>
                    <button onclick="winManager.close('skryba')" class="text-red-500 hover:text-red-400 px-1 font-bold transition">✖</button>
                </div>
            </div>
            
            <!-- Niewidzialny uchwyt do przeciągania w Trybie Skupienia -->
            <div id="skryba-focus-drag" class="hidden absolute top-0 left-0 right-0 h-8 z-[9000] cursor-move" onmousedown="winManager.startDrag(event, 'app-skryba')" ontouchstart="winManager.startDrag(event, 'app-skryba')"></div>

            <div class="flex flex-row flex-grow overflow-hidden relative">
                
                <!-- LEWY PANEL (Notatki, Tagi, Wyszukiwarka) -->
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
                        <!-- Lista generowana dynamicznie -->
                    </div>
                </div>

                <!-- GŁÓWNY OBSZAR ROBOCZY -->
                <div class="flex-grow flex flex-col relative bg-black/5" id="skryba-workspace">
                    
                    <!-- Pasek Narzędzi -->
                    <div id="skryba-toolbar" class="p-2 border-b g-border bg-black/20 flex flex-wrap items-center gap-1 shrink-0 shadow-sm z-10 transition-all duration-300">
                        
                        <!-- Przyciski Zapisu (NAPRAWA ZNIKANIA!) -->
                        <div class="flex items-center bg-black/30 p-1 rounded-lg border g-border mr-1 relative">
                            <button onclick="window.skrybaApp.saveNote()" class="px-3 h-8 flex items-center justify-center rounded font-bold hover:bg-blue-600 hover:text-white transition g-text text-xs gap-1" title="Zapisz zmiany w BigOS (Ctrl+S)">💾 Zapisz</button>
                            
                            <button id="skryba-save-menu-btn" onclick="document.getElementById('skryba-save-menu').classList.toggle('hidden'); event.stopPropagation();" class="px-2 h-8 flex items-center justify-center rounded hover:bg-white/10 transition g-text text-xs ml-1 border-l g-border" title="Opcje zapisywania">Więcej...</button>
                            
                            <div id="skryba-save-menu" class="absolute left-0 top-full hidden flex-col g-panel border g-border shadow-xl rounded min-w-[200px] z-[9999] mt-1">
                                <button class="text-left px-4 py-2 hover:bg-blue-500 hover:text-white transition text-xs g-text" onclick="window.skrybaApp.promptSaveAs()">📝 Zapisz Jako Kopię...</button>
                                <div class="border-t g-border my-1"></div>
                                <button class="text-left px-4 py-2 hover:bg-blue-500 hover:text-white transition text-xs font-bold text-emerald-400" onclick="window.skrybaApp.showExportPCModal()">📥 Zapisz / Eksportuj na PC</button>
                            </div>
                        </div>

                        <!-- Formatowanie tekstu -->
                        <div class="flex items-center bg-black/30 p-1 rounded-lg border g-border hidden sm:flex">
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
                                <option value="1" class="g-bg g-text">1 (Mała)</option>
                                <option value="2" class="g-bg g-text">2</option>
                                <option value="3" class="g-bg g-text" selected>3 (Normalna)</option>
                                <option value="4" class="g-bg g-text">4 (Średnia)</option>
                                <option value="5" class="g-bg g-text">5 (Duża)</option>
                                <option value="6" class="g-bg g-text">6</option>
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

                        <!-- Bloki i Listy (POPRAWIONO TOGGLE CYTATU) -->
                        <div class="flex items-center bg-black/30 p-1 rounded-lg border g-border hidden lg:flex">
                            <button onmousedown="event.preventDefault(); window.skrybaApp.execCmd('formatBlock', 'H1')" class="px-2 h-8 flex items-center justify-center rounded font-bold hover:bg-white/10 text-xs transition g-text" title="Nagłówek 1">H1</button>
                            <button onmousedown="event.preventDefault(); window.skrybaApp.execCmd('formatBlock', 'H2')" class="px-2 h-8 flex items-center justify-center rounded font-bold hover:bg-white/10 text-xs transition g-text" title="Nagłówek 2">H2</button>
                            <div class="w-px h-5 bg-gray-600 mx-1"></div>
                            <button onmousedown="event.preventDefault(); window.skrybaApp.execCmd('insertUnorderedList')" class="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition g-text" title="Lista punktowana">• ≡</button>
                            <button onmousedown="event.preventDefault(); window.skrybaApp.execCmd('insertOrderedList')" class="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition g-text" title="Lista numerowana">1.</button>
                            <button onmousedown="event.preventDefault(); window.skrybaApp.insertChecklist()" class="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition text-emerald-400 font-bold" title="Checklista">☑</button>
                            <div class="w-px h-5 bg-gray-600 mx-1"></div>
                            <button onmousedown="event.preventDefault(); window.skrybaApp.insertCodeBlock()" class="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition font-mono text-xs g-text" title="Blok Kodu">&lt;/&gt;</button>
                            <button onmousedown="event.preventDefault(); window.skrybaApp.toggleBlockquote()" class="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition font-serif font-bold italic g-text-muted" title="Cytat (Włącz/Wyłącz)">”</button>
                        </div>

                        <!-- Narzędzia AI, Mowa i Czytanie (Czytaj wróciło na stałe!) -->
                        <div class="flex items-center bg-purple-500/10 p-1 rounded-lg border border-purple-500/30 ml-auto gap-1">
                            <button onclick="window.skrybaApp.readContent()" id="skryba-btn-read" class="px-3 h-8 flex items-center justify-center rounded font-bold hover:bg-white/10 transition text-blue-400 text-xs gap-1" title="Przeczytaj zaznaczony tekst">
                                🔊 Czytaj
                            </button>
                            <button onclick="window.skrybaApp.toggleAIPanel()" class="px-3 h-8 flex items-center justify-center rounded font-bold hover:bg-purple-500 hover:text-white transition text-purple-400 text-xs gap-1" title="Magia AI">
                                <span>✨</span> BigAI Tools
                            </button>
                            <button onclick="window.skrybaApp.toggleDictation()" id="skryba-btn-mic" class="w-8 h-8 flex items-center justify-center rounded font-bold hover:bg-white/10 transition text-orange-400" title="Dyktowanie Głosowe">🎤</button>
                        </div>
                    </div>

                    <!-- Pasek Narzędzi Notatki (Tagi, Przypomnienia) -->
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
                <div id="skryba-ai-sidebar" class="w-[280px] border-l g-border bg-black/20 hidden flex-col shrink-0 overflow-y-auto custom-scrollbar shadow-2xl relative z-20">
                    <div class="p-3 border-b g-border font-bold text-sm text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 flex justify-between items-center bg-black/30">
                        <span>✨ Narzędzia BigAI</span>
                        <button onclick="window.skrybaApp.toggleAIPanel()" class="text-red-400 hover:text-red-300">✖</button>
                    </div>

                    <div class="p-4 flex flex-col gap-2">
                        <p class="text-[10px] g-text-muted mb-2 leading-tight">Zaznacz tekst w edytorze i wybierz akcję (lub nie zaznaczaj nic, aby AI przeanalizowało CAŁĄ notatkę).</p>
                        
                        <div class="text-[10px] font-bold g-accent uppercase tracking-widest mt-2">Przekształć Tekst</div>
                        <div class="ai-btn-group">
                            <button onclick="window.skrybaApp.askAI('Napisz zwięzłe podsumowanie tego tekstu w kilku punktach.')" class="g-btn text-[10px] px-2 py-1 rounded border-gray-500/50">📄 Streść</button>
                            <button onclick="window.skrybaApp.askAI('Skróć ten tekst o około połowę, zachowując sens.')" class="g-btn text-[10px] px-2 py-1 rounded border-gray-500/50">✂️ Skróć</button>
                            <button onclick="window.skrybaApp.askAI('Rozbuduj tekst, dodając detale, profesjonalne słownictwo i argumenty.')" class="g-btn text-[10px] px-2 py-1 rounded border-gray-500/50">🪄 Rozbuduj</button>
                            <button onclick="window.skrybaApp.askAI('Popraw błędy ortograficzne, stylistyczne i interpunkcyjne.')" class="g-btn text-[10px] px-2 py-1 rounded border-gray-500/50">🧹 Popraw</button>
                            <button onclick="window.skrybaApp.askAI('Sformatuj ten tekst jako elegancką listę punktowaną HTML (tagi <ul> i <li>).')" class="g-btn text-[10px] px-2 py-1 rounded border-gray-500/50">📋 Zrób Listę</button>
                            <button onclick="window.skrybaApp.askAI('Zoptymalizuj ten tekst pod kątem SEO, nasyć słowami kluczowymi, daj chwytliwy nagłówek H1 i podtytuły H2.')" class="g-btn text-[10px] px-2 py-1 rounded border-gray-500/50">🔎 Optymalizuj SEO</button>
                        </div>

                        <!-- 50 JĘZYKÓW W TŁUMACZU -->
                        <div class="text-[10px] font-bold g-accent uppercase tracking-widest mt-2">Tłumaczenia</div>
                        <div class="flex items-center gap-2 mb-2">
                            <select id="skryba-ai-lang" class="flex-grow p-1.5 rounded g-bg g-text border g-border text-xs outline-none shadow-inner cursor-pointer">
                                ${langOptions}
                            </select>
                            <button onclick="window.skrybaApp.askAI('Przetłumacz ten tekst na język: ' + document.getElementById('skryba-ai-lang').value)" class="g-btn text-[10px] px-3 py-1.5 rounded border-blue-500/50 bg-blue-500/10 hover:bg-blue-500 font-bold">Tłumacz</button>
                        </div>

                        <div class="text-[10px] font-bold g-accent uppercase tracking-widest mt-2">Napisz za mnie</div>
                        <div class="ai-btn-group">
                            <button onclick="window.skrybaApp.askAI('Na podstawie podanych notatek napisz profesjonalny artykuł blogowy. Użyj nagłówków.')" class="g-btn text-[10px] px-2 py-1 rounded border-purple-500/30 text-purple-300">📝 Artykuł</button>
                            <button onclick="window.skrybaApp.askAI('Na podstawie tekstu napisz angażujący, krótki post na Facebooka lub Instagram z emotikonami i hashtagami.')" class="g-btn text-[10px] px-2 py-1 rounded border-purple-500/30 text-purple-300">👍 Post Social Media</button>
                            <button onclick="window.skrybaApp.askAI('Przekształć te notatki w profesjonalnego e-maila do współpracowników/klienta.')" class="g-btn text-[10px] px-2 py-1 rounded border-purple-500/30 text-purple-300">✉️ E-mail</button>
                            <button onclick="window.skrybaApp.askAI('Przygotuj zwięzły plan działania / harmonogram projektu na podstawie tego tekstu.')" class="g-btn text-[10px] px-2 py-1 rounded border-purple-500/30 text-purple-300">🗓️ Plan Projektu</button>
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
    },

    // ==================================================================
    // MAGIA AI (GEMINI) W EDYTORZE
    // ==================================================================
    toggleAIPanel: () => {
        const panel = document.getElementById('skryba-ai-sidebar');
        if(panel.classList.contains('hidden')) { panel.classList.remove('hidden'); panel.classList.add('flex'); }
        else { panel.classList.add('hidden'); panel.classList.remove('flex'); }
    },

    askAI: async (prompt) => {
        const sel = window.getSelection();
        let selectedText = sel.toString().trim();
        const editor = document.getElementById('skryba-editor');
        
        let targetText = selectedText;
        let isFullReplace = false;

        if (!targetText) {
            targetText = editor.innerText;
            isFullReplace = true;
            if (!targetText.trim()) {
                if(typeof apps !== 'undefined') apps.showToast('BigAI', 'Twój notatnik jest pusty. Co mam przetworzyć?', 'info');
                return;
            }
        }

        const prov = typeof podpowiadaczApp !== 'undefined' ? podpowiadaczApp.settings.provider : 'gemini_free';
        const key = typeof podpowiadaczApp !== 'undefined' ? podpowiadaczApp.settings.apiKey : '';
        const mod = typeof podpowiadaczApp !== 'undefined' ? (podpowiadaczApp.settings.isCustomModel ? podpowiadaczApp.settings.customModel : podpowiadaczApp.settings.model) : 'gemini-3.1-flash-lite';
        
        if (prov === 'gemini_api' && !key) {
            if(typeof apps !== 'undefined') apps.showToast('Błąd API', 'Ustaw klucz Gemini w aplikacji Podpowiadacz', 'error'); return;
        }

        const statusEl = document.getElementById('skryba-ai-status');
        if(statusEl) statusEl.classList.remove('hidden');
        
        try {
            const systemPrompt = "Jesteś asystentem redaktora notatek w BigOS. Odpowiadaj BEZPOŚREDNIO zmodyfikowanym wygenerowanym tekstem, bez komentarzy w stylu 'Oto wynik' czy znaczników bloków kodu markdown na zewnątrz (chyba że generujesz kod HTML). Stosuj formatowanie HTML wewnątrz odpowiedzi, np. <b>, <i>, <br>, <h1>, <ul>, <li> by wynik od razu wyglądał ładnie w edytorze WYSIWYG.";
            const userPrompt = `Wykonaj następujące polecenie:\n${prompt}\n\nTekst źródłowy:\n${targetText}`;
            
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
    // DYKTOWANIE GŁOSOWE (Naprawione powtarzanie wyników)
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
                btn.classList.add('bg-red-500', 'text-white', 'animate-pulse');
                btn.classList.remove('text-orange-400');
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
                btn.classList.remove('bg-red-500', 'text-white', 'animate-pulse');
                btn.classList.add('text-orange-400');
            };
        }
    },

    toggleDictation: () => {
        if (!window.skrybaApp.recognition) {
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Twoja przeglądarka nie wspiera dyktowania.', 'error');
            return;
        }
        const btn = document.getElementById('skryba-btn-mic');
        if(btn.classList.contains('bg-red-500')) {
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

    // Specjalna obsługa włączania/wyłączania cytatu w contenteditable
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
            html = html.replace(/<br\s*[\/]?>/gi, "\n").replace(/<\/div>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "");
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
        
        window.skrybaApp.autoSaveInt = setInterval(() => { if(window.skrybaApp.isDirty && window.skrybaApp.currentFileId) window.skrybaApp.saveNoteSilent(); }, 5000);

        window.skrybaApp.reminderInt = setInterval(() => {
            if(typeof fileSystem === 'undefined') return;
            const now = new Date().getTime();
            fileSystem.filter(f => f.type === 'file' && f.skrybaMeta && f.skrybaMeta.reminder).forEach(f => {
                if (f.skrybaMeta.reminder <= now) {
                    if(typeof apps !== 'undefined') apps.showToast('⏰ Przypomnienie', `Notatka: ${f.name}`, 'info');
                    f.skrybaMeta.reminder = null; 
                    if(typeof fsManager !== 'undefined') fsManager.save();
                    if(f.id === window.skrybaApp.currentFileId) window.skrybaApp.updateToolbarUI();
                }
            });
        }, 60000);
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
        document.getElementById('skryba-tags-input').value = '';
        
        document.getElementById('skryba-editor').style.filter = 'none';
        document.getElementById('skryba-editor').contentEditable = "true";
        
        window.skrybaApp.isDirty = false;
        document.getElementById('skryba-status').innerHTML = '⚪ Nowy Plik';
        document.getElementById('skryba-word-count').innerText = 'Słów: 0';
        window.skrybaApp.updateToolbarUI();
        window.skrybaApp.renderSidebar();
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
                f.skrybaMeta.reminder = new Date().getTime() + (min * 60000);
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
            // POPRAWA BIAŁEGO TEKSTU NA BIAŁYM TLE: Zastosowano klasę "g-bg g-text"
            listHTML += `<button class="w-full text-left px-3 py-2 g-bg g-text hover:bg-white/10 rounded transition border g-border mb-2 text-xs" onclick="document.getElementById('${modalId}').remove(); window.skrybaApp.restoreRevision(${idx})">⏳ Migawka z: <b>${rev.date}</b></button>`;
        });

        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-sm w-full border g-border">
                <h2 class="text-xl font-bold g-text mb-4">Historia Wersji</h2>
                <div class="max-h-64 overflow-y-auto mb-4 pr-1 custom-scrollbar">${listHTML}</div>
                <div class="flex justify-end"><button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border">Anuluj</button></div>
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

    saveNoteSilent: () => {
        if(!window.skrybaApp.isDirty) return;
        
        let title = document.getElementById('skryba-note-title').value.trim();
        if(!title) title = "Nowa Notatka";
        if(!title.endsWith('.txt') && !title.endsWith('.md') && !title.endsWith('.html') && !title.endsWith('.csv') && !title.endsWith('.rtf') && !title.endsWith('.docx') && !title.endsWith('.doc')) title += '.html'; 

        const content = document.getElementById('skryba-editor').innerHTML;
        const tags = document.getElementById('skryba-tags-input').value.trim();
        
        if(window.skrybaApp.currentFileId) { 
            const f = typeof fileSystem !== 'undefined' ? fileSystem.find(i => i.id === window.skrybaApp.currentFileId) : null; 
            if(f) { 
                f.content = content; 
                f.name = title; 
                if(!f.skrybaMeta) f.skrybaMeta = {};
                f.skrybaMeta.tags = tags;
                
                if(!f.skrybaMeta.revisions) f.skrybaMeta.revisions = [];
                if(f.skrybaMeta.revisions.length === 0 || (Date.now() - f.skrybaMeta.lastRevTime > 300000)) {
                    f.skrybaMeta.revisions.push({ date: new Date().toLocaleString(), content: content });
                    if(f.skrybaMeta.revisions.length > 5) f.skrybaMeta.revisions.shift(); 
                    f.skrybaMeta.lastRevTime = Date.now();
                }

                if(typeof fsManager !== 'undefined') fsManager.save(); 
            } 
        } else { 
            const id = 'file_'+Date.now(); 
            if(typeof fileSystem !== 'undefined') {
                fileSystem.push({ 
                    id: id, type: 'file', name: title, icon: '📄', content: content, 
                    parentId: typeof fsManager !== 'undefined' ? (fsManager.currentFolder || 'root') : 'root', x: 20, y: 20, 
                    skrybaMeta: { tags: tags, revisions: [{ date: new Date().toLocaleString(), content: content }], lastRevTime: Date.now() } 
                }); 
                if(typeof fsManager !== 'undefined') fsManager.save(); 
                window.skrybaApp.currentFileId = id; 
            }
        }
        
        window.skrybaApp.isDirty = false;
        document.getElementById('skryba-status').innerHTML = '<span class="text-green-500">🟢 Zapisano Auto</span>';
        window.skrybaApp.renderSidebar();
        
        if (typeof desktop !== 'undefined') desktop.render(); 
    },

    saveNote: () => {
        window.skrybaApp.saveNoteSilent();
        if(typeof apps !== 'undefined') apps.showToast('Skryba', 'Notatka zapisana na dysku BigOS.', 'success');
        document.getElementById('skryba-status').innerHTML = '<span class="text-green-500">🟢 Zapisano</span>';
    },

    promptSaveAs: () => {
        if(typeof ui === 'undefined') return;
        ui.showPrompt("Zapisz plik pod nową nazwą (podaj rozszerzenie np. .html lub .txt):", document.getElementById('skryba-note-title').value, "Zapisz Kopię", (name) => {
            if(!name) return; 
            if(!name.endsWith('.txt') && !name.endsWith('.html') && !name.endsWith('.md') && !name.endsWith('.csv') && !name.endsWith('.rtf') && !name.endsWith('.doc') && !name.endsWith('.docx')) name += '.html';
            
            const isRaw = document.getElementById('skryba-mode-raw').checked;
            const content = isRaw ? document.getElementById('skryba-raw-editor').value : document.getElementById('skryba-editor').innerHTML;
            
            const id = 'file_'+Date.now(); 
            if(typeof fileSystem !== 'undefined') {
                fileSystem.push({ id: id, type: 'file', name: name, icon: '📄', content: content, parentId: typeof fsManager !== 'undefined' ? (fsManager.currentFolder || 'root') : 'root', x: 30, y: 30, skrybaMeta: {} }); 
                if(typeof fsManager !== 'undefined') fsManager.save(); 
                
                window.skrybaApp.currentFileId = id;
                document.getElementById('skryba-note-title').value = name;
                window.skrybaApp.isDirty = false;
                document.getElementById('skryba-status').innerHTML = '<span class="text-green-500">🟢 Zapisano</span>';
                
                window.skrybaApp.renderSidebar();
                if(typeof desktop !== 'undefined') desktop.render(); 
                const aktowkaWin = document.getElementById('app-aktowka');
                if(aktowkaWin && aktowkaWin.classList.contains('active') && typeof fsManager !== 'undefined') fsManager.renderExplorerContent(fsManager.currentFolder);
                
                if(typeof apps !== 'undefined') apps.showToast('Skryba', `Utworzono kopię jako ${name}`, 'success'); 
            }
        });
    },

    // ==================================================================
    // WYBÓR FORMATÓW I EKSPORT NA KOMPUTER FIZYCZNY (PC)
    // ==================================================================
    showExportPCModal: () => {
        const modalId = 'skryba-export-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
        
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-sm w-full border g-border">
                <h2 class="text-xl font-bold g-text mb-4">📥 Eksport do fizycznego PC</h2>
                <div class="flex flex-col gap-2 mb-6">
                    <button class="w-full text-left px-3 py-2 g-bg g-text hover:bg-white/10 rounded transition border g-border mb-1 text-sm font-bold flex gap-2 items-center" onclick="document.getElementById('${modalId}').remove(); window.skrybaApp.exportNoteToPC('txt')"><span>📄</span> Zwykły Tekst (.txt)</button>
                    <button class="w-full text-left px-3 py-2 g-bg g-text hover:bg-white/10 rounded transition border g-border mb-1 text-sm font-bold flex gap-2 items-center" onclick="document.getElementById('${modalId}').remove(); window.skrybaApp.exportNoteToPC('html')"><span>🌐</span> Strona Sieciowa (.html) - Pełen kolor</button>
                    <button class="w-full text-left px-3 py-2 g-bg g-text hover:bg-white/10 rounded transition border g-border mb-1 text-sm font-bold flex gap-2 items-center" onclick="document.getElementById('${modalId}').remove(); window.skrybaApp.exportNoteToPC('rtf')"><span>📝</span> Rich Text (.rtf) - Podstawowy format</button>
                    <button class="w-full text-left px-3 py-2 g-bg g-text hover:bg-white/10 rounded transition border g-border mb-1 text-sm font-bold flex gap-2 items-center" onclick="document.getElementById('${modalId}').remove(); window.skrybaApp.exportNoteToPC('docx')"><span>📘</span> MS Word (.doc) - ZACHOWUJE KOLORY</button>
                    <button class="w-full text-left px-3 py-2 g-bg g-text hover:bg-white/10 rounded transition border g-border mb-1 text-sm font-bold flex gap-2 items-center" onclick="document.getElementById('${modalId}').remove(); window.skrybaApp.exportNoteToPC('pdf')"><span>📕</span> Wydruk / PDF (.pdf)</button>
                </div>
                <div class="flex justify-end"><button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border">Anuluj</button></div>
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
        title = title.replace(/\.[^/.]+$/, ""); // Usuwanie rozszerzenia

        let text = "";
        let mime = "text/plain";
        let ext = ".txt";

        if (format === 'pdf') {
            window.skrybaApp.printNote();
            return;
        }

        if (format === 'txt') {
            if (isRaw) {
                text = rawEditor.value;
            } else {
                const el = document.createElement('div'); 
                el.innerHTML = editor.innerHTML; 
                text = el.innerHTML.replace(/<br\s*[\/]?>/gi, "\r\n").replace(/<\/div>/gi, "\r\n").replace(/<\/p>/gi, "\r\n").replace(/<[^>]+>/g, "");
            }
        } 
        else if (format === 'html') {
            text = `<html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family: sans-serif; padding: 20px;"><h1>${title}</h1>${editor.innerHTML}</body></html>`;
            mime = "text/html";
            ext = ".html";
        } 
        else if (format === 'rtf') {
            const strToRTF = (str) => str.replace(/[\u0080-\uFFFF]/g, m => '\\uc1\\u' + m.charCodeAt(0) + '?');
            let rtfBody = editor.innerHTML
                .replace(/<br\s*[\/]?>/gi, "\\par\n")
                .replace(/<div>/gi, "\\par\n")
                .replace(/<\/div>/gi, "")
                .replace(/<p>/gi, "\\par\n")
                .replace(/<\/p>/gi, "")
                .replace(/<b>/gi, "\\b ")
                .replace(/<\/b>/gi, "\\b0 ")
                .replace(/<strong>/gi, "\\b ")
                .replace(/<\/strong>/gi, "\\b0 ")
                .replace(/<i>/gi, "\\i ")
                .replace(/<\/i>/gi, "\\i0 ")
                .replace(/<em>/gi, "\\i ")
                .replace(/<\/em>/gi, "\\i0 ")
                .replace(/<u>/gi, "\\ul ")
                .replace(/<\/u>/gi, "\\ul0 ")
                .replace(/<blockquote[^>]*>/gi, "\\par\\pard\\li720\\i ") // ZACHOWANIE WCIĘCIA DLA CYTATU!
                .replace(/<\/blockquote>/gi, "\\par\\pard\\i0 ")
                .replace(/<[^>]+>/g, ""); 
            text = "{\\rtf1\\ansi\\ansicpg1250\\deff0{\\fonttbl{\\f0\\fswiss\\fcharset238 Helvetica;}}\\fs24\n" + strToRTF(rtfBody) + "\n}";
            mime = "application/rtf";
            ext = ".rtf";
        }
        else if (format === 'docx') {
            // Generuje .doc zgodny z Wordem, który zachowuje KAŻDY atrybut HTML włącznie z kolorami tekstu i tła!
            text = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1>${editor.innerHTML}</body></html>`;
            mime = "application/vnd.ms-word";
            ext = ".doc"; 
        }
        
        const blob = new Blob([text], { type: `${mime};charset=utf-8` }); 
        const a = document.createElement("a"); 
        a.href = URL.createObjectURL(blob); 
        a.download = title + ext; 
        a.click(); 
        if(typeof apps !== 'undefined') apps.showToast('Skryba', `Rozpoczęto pobieranie .${ext.toUpperCase().replace('.','')} na dysk PC`, 'info'); 
    },

    printNote: () => {
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
    // DRAG & DROP WPROST Z SYSTEMU BIGOS I PC
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
            
            if(typeof apps !== 'undefined') apps.showToast('Skryba', 'Wczytano plik z fizycznego dysku', 'success');
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