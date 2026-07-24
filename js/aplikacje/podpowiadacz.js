// ======================================================================
// PLIK: js/aplikacje/podpowiadacz.js (BigAI - Centrum Dowodzenia Systemem)
// ======================================================================

// ==================================================================
// 🚀 GLOBALNE API DO TWORZENIA APLIKACJI (KULOODPORNY INSTALATOR)
// ==================================================================
window.BigOSAppAPI = {
    register: function(config) {
        if (!config || !config.id) return;
        
        // 1. Dodaj do defaultApps (rejestracja jądra)
        if (typeof defaultApps !== 'undefined' && !defaultApps.find(a => a.appId === config.id)) {
            defaultApps.push({ id: 'app_' + config.id, type: 'app', name: config.name, icon: config.icon, appId: config.id });
        }
        
        // 2. Dodaj ikonę na fizyczny Pulpit
        if (typeof fileSystem !== 'undefined' && !fileSystem.find(f => f.appId === config.id)) {
            fileSystem.push({
                id: 'app_' + config.id, type: 'app', name: config.name, icon: config.icon, appId: config.id,
                parentId: 'root', x: Math.floor(Math.random()*200)+50, y: Math.floor(Math.random()*200)+50
            });
            if (typeof fsManager !== 'undefined') fsManager.save();
            if (typeof desktop !== 'undefined') desktop.render();
        }
        
        // 3. Dodaj bezpośrednio do Szuflady (Menu Start)
        const startMenu = document.getElementById('start-menu-list');
        if (startMenu && !document.getElementById('start-btn-' + config.id)) {
            const btn = document.createElement('button');
            btn.id = 'start-btn-' + config.id;
            btn.className = 'start-item flex items-center gap-3 p-2 hover:bg-white/10 rounded w-full text-left transition g-text font-medium';
            btn.onclick = () => { winManager.open(config.id); apps.toggleStartMenu(); };
            btn.innerHTML = `<span class="text-xl drop-shadow-sm">${config.icon || '📦'}</span> <span class="app-name">${config.name || 'Aplikacja'}</span>`;
            
            // Wstawiamy przed sekcją Gry (jeśli istnieje) lub na końcu
            const headers = startMenu.querySelectorAll('.start-header');
            if (headers.length > 1) startMenu.insertBefore(btn, headers[1]);
            else startMenu.appendChild(btn);
        }
        
        // 4. Stwórz Okno Systemowe HTML
        let win = document.getElementById('app-' + config.id);
        if (!win) {
            win = document.createElement('div');
            win.id = 'app-' + config.id;
            win.className = 'window absolute hidden';
            win.style.width = config.width || '400px';
            win.style.height = config.height || 'auto';
            
            win.innerHTML = `
                <div class="flex flex-col h-full themed-app g-panel border g-border rounded-lg shadow-2xl overflow-hidden">
                    <div class="px-4 py-2 border-b g-border flex justify-between items-center bg-black/30 cursor-move shrink-0" onmousedown="winManager.startDrag(event, 'app-${config.id}')" ontouchstart="winManager.startDrag(event, 'app-${config.id}')">
                        <span class="text-sm font-bold g-accent drop-shadow-md">${config.icon || ''} ${config.name || 'Aplikacja'}</span>
                        <div class="flex gap-2">
                            <button onclick="winManager.minimize('${config.id}')" class="g-icon-btn px-1 hover:text-white transition">_</button>
                            <button onclick="winManager.close('${config.id}')" class="text-red-500 hover:text-red-400 px-1 font-bold transition">✖</button>
                        </div>
                    </div>
                    <div class="flex-grow p-4 bg-black/10 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                        ${config.html || ''}
                    </div>
                </div>
            `;
            document.body.appendChild(win);
        } else {
            // Aktualizuj zawartość jeśli apka już istnieje i była nadpisana nowym kodem AI
            const contentDiv = win.querySelector('.flex-grow');
            if (contentDiv) contentDiv.innerHTML = config.html || '';
        }
        
        // 5. Rejestracja logiki globalnej (Dla funkcji onclick w HTML)
        if (config.globalName && config.global) {
            window[config.globalName] = config.global;
        }
        
        // 6. Odpalenie funkcji inicjalizacyjnej
        if (config.init && typeof config.init === 'function') {
            setTimeout(config.init, 100);
        }
        
        // 7. Otwórz od razu po instalacji (Tylko jeśli system zakończył wczytywanie)
        if (typeof winManager !== 'undefined' && window._bigosInstalledAppsBooted) {
            winManager.open(config.id);
        }
    }
};

const MODELS_DB = {
    gemini_free: [ { id: 'gemini-3.1-flash-lite', name: 'gemini-3.1-flash-lite (Darmowy)' } ],
    gemini_api: [ { id: 'gemini-3.1-flash-lite', name: 'gemini-3.1-flash-lite (Szybki)' }, { id: 'gemini-3.5-flash', name: 'gemini-3.5-flash (Mądry)' } ],
    openai: [ { id: 'gpt-4o-mini', name: 'GPT-4o Mini' }, { id: 'gpt-4o', name: 'GPT-4o' } ],
    groq: [ { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B' }, { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' } ],
    openrouter: [ { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Darmowy)' }, { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' } ]
};

const VOICES_DB = {
    native: [ { id: '', name: 'Domyślny Systemowy' } ],
    gemini: [ { id: 'Kore', name: 'Kore (Stanowczy)' }, { id: 'Aoede', name: 'Aoede (Przyjazny)' } ],
    openai: [ { id: 'alloy', name: 'Alloy (Neutralny)' } ]
};

const podpowiadaczApp = {
    messages: [], isSidebarOpen: false, isThinking: false,
    recognition: null, mediaRecorder: null, audioChunks: [], isRecording: false, isListeningBackground: false,
    activeAudio: null, currentTTSButton: null, pendingActionCallback: null, 
    
    suggestionsDB: [ "Uruchom Kalkulator", "Zmień tapetę na kosmos", "Zmień motyw na ciemny", "Napisz aplikację kalkulator walut" ],

    settings: {
        provider: 'gemini_free', apiKey: '', model: 'gemini-3.1-flash-lite', customModel: '', isCustomModel: false,
        ttsProvider: 'native', ttsApiKey: '', ttsVoice: '', sttProvider: 'native', sttApiKey: '', sttModel: 'whisper-large-v3-turbo',
        autoTTS: false, wakeWordActive: false 
    },

    init: async () => {
        try {
            const savedSettings = await bigosDB.get('bigos_bigai_settings');
            if (savedSettings) {
                let parsedSettings = typeof savedSettings === 'string' ? JSON.parse(savedSettings) : savedSettings;
                podpowiadaczApp.settings = {...podpowiadaczApp.settings, ...parsedSettings};
            }
            const savedChat = await bigosDB.get('bigos_bigai_chat');
            if (savedChat) podpowiadaczApp.messages = typeof savedChat === 'string' ? JSON.parse(savedChat) : savedChat;
        } catch(e) {}

        if (podpowiadaczApp.messages.length === 0) {
            podpowiadaczApp.messages.push({
                role: 'assistant',
                text: 'Cześć! Jestem Twoim osobistym asystentem wbudowanym w **BigOS**. \n\nW czym mogę pomóc?'
            });
            podpowiadaczApp.saveData(); 
        }

        podpowiadaczApp.initSpeechRecognition();
        podpowiadaczApp.upgradeUI();
        podpowiadaczApp.updateModelsDropdown();
        podpowiadaczApp.updateVoiceDropdown();
        podpowiadaczApp.changeSTTProvider();
        podpowiadaczApp.renderChat();
        podpowiadaczApp.renderWidget();
        
        if (podpowiadaczApp.settings.wakeWordActive) podpowiadaczApp.startBackgroundListening();

        // --- AUTOLOADER ZAINSTALOWANYCH APLIKACJI Z INDEXED DB ---
        setTimeout(() => {
            if (typeof fileSystem !== 'undefined' && !window._bigosInstalledAppsBooted) {
                const installedScripts = fileSystem.filter(f => f.type === 'bigos_app_script');
                installedScripts.forEach(script => {
                    try { 
                        const scriptEl = document.createElement('script');
                        scriptEl.textContent = script.content;
                        document.body.appendChild(scriptEl);
                    } catch(e) { console.error("Błąd ładowania aplikacji z systemu:", e); }
                });
                window._bigosInstalledAppsBooted = true;
            }
        }, 1500); 
    },

    saveData: () => {
        bigosDB.set('bigos_bigai_settings', podpowiadaczApp.settings);
        bigosDB.set('bigos_bigai_chat', podpowiadaczApp.messages);
        podpowiadaczApp.renderWidget();
    },

    // ==================================================================
    // INSTALATOR APLIKACJI (Z MODALEM PERSONALIZACJI I ZABEZPIECZENIAMI)
    // ==================================================================
    installApp: (btn) => {
        const pre = btn.closest('.my-2').querySelector('pre');
        if(!pre) return;
        
        let code = pre.textContent || pre.innerText;

        // Próba odczytania domyślnych danych podanych przez AI
        let defaultName = 'Nowa Aplikacja';
        let defaultIcon = '🚀';
        const nameMatch = code.match(/name:\s*['"]([^'"]+)['"]/);
        if (nameMatch) defaultName = nameMatch[1];
        const iconMatch = code.match(/icon:\s*['"]([^'"]+)['"]/);
        if (iconMatch) defaultIcon = iconMatch[1];

        // Wyświetlanie Okna Wyboru
        const modalId = 'ai-install-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';

        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-sm w-full border g-border flex flex-col">
                <h2 class="text-xl font-bold g-text mb-4 border-b g-border pb-2 flex items-center gap-2"><span>📥</span> Kreator Instalacji</h2>

                <div class="mb-4">
                    <label class="block text-[10px] uppercase font-bold g-text-muted mb-1 tracking-wider">Nazwa Twojej Aplikacji</label>
                    <input type="text" id="ai-install-name" value="${defaultName}" class="w-full p-2.5 g-bg g-text border g-border rounded outline-none focus:border-blue-500 font-bold shadow-inner text-sm">
                </div>

                <div class="mb-6">
                    <label class="block text-[10px] uppercase font-bold g-text-muted mb-1 tracking-wider">Ikona (Wybierz Emoji)</label>
                    <input type="text" id="ai-install-icon" value="${defaultIcon}" maxlength="3" class="w-full p-2.5 g-bg g-text border g-border rounded outline-none focus:border-blue-500 font-bold shadow-inner text-3xl text-center">
                </div>

                <div class="flex justify-end gap-2 shrink-0">
                    <button onclick="document.getElementById('${modalId}').remove()" class="px-5 py-2.5 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border shadow-sm text-sm">Anuluj</button>
                    <button id="ai-install-confirm" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-600/30 transition font-bold border border-emerald-700 text-sm">Zainstaluj</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('ai-install-confirm').onclick = () => {
            const finalName = document.getElementById('ai-install-name').value || defaultName;
            const finalIcon = document.getElementById('ai-install-icon').value || defaultIcon;

            // Zastępujemy dane w kodzie źródłowym
            if (nameMatch) code = code.replace(nameMatch[0], `name: '${finalName}'`);
            if (iconMatch) code = code.replace(iconMatch[0], `icon: '${finalIcon}'`);

            modal.remove();

            try {
                // Weryfikacja składni przed odpaleniem skryptu
                try {
                    new Function(code);
                } catch (syntaxErr) {
                    throw new Error(syntaxErr.message);
                }
                
                // Wstrzyknięcie i uruchomienie w globalnym Scope
                const scriptEl = document.createElement('script');
                scriptEl.textContent = code;
                document.body.appendChild(scriptEl);
                
                // Trwały zapis w bazie
                if(typeof fileSystem !== 'undefined' && typeof fsManager !== 'undefined') {
                    const existing = fileSystem.find(f => f.type === 'bigos_app_script' && f.content === code);
                    if (!existing) {
                        fileSystem.push({
                            id: 'script_' + Date.now(),
                            type: 'bigos_app_script',
                            name: finalName,
                            icon: finalIcon,
                            content: code,
                            parentId: 'system_hidden'
                        });
                        fsManager.save();
                    }
                }
                
                if(typeof apps !== 'undefined') apps.showToast('Zainstalowano', 'Aplikacja pomyślnie dodana do systemu!', 'success');
            } catch(e) {
                console.error("Błąd instalacji:", e);
                // System autodetekcji błędu dla użytkownika
                if(typeof apps !== 'undefined') apps.showToast('Błąd Składni JS', 'Kod jest uszkodzony! Użyj przycisku "Popraw kod", aby AI naprawiło błąd.', 'error');
            }
        };
    },

    // ==================================================================
    // NARZĘDZIE NAPRAWY KODU PRZEZ AI
    // ==================================================================
    fixCode: (btn) => {
        const pre = btn.closest('.my-2').querySelector('pre');
        if(!pre) return;
        const code = pre.textContent || pre.innerText;

        let errorMsg = "Napraw ten kod. ";
        try {
            new Function(code);
            errorMsg += "Zwróć w pełni sprawny kod na bazie mojego szablonu instalacyjnego BigOSAppAPI. Pamiętaj o poprawnym zamykaniu cudzysłowów oraz nawiasów!";
        } catch (err) {
            errorMsg += "Wystąpił w nim błąd przy tworzeniu aplikacji: " + err.message + ". Upewnij się, że poprawnie zamknąłeś tagi, cudzysłowy i właściwość html: \`...\` !";
        }

        const input = document.getElementById('ai-chat-input');
        if (input) {
            input.value = errorMsg;
            podpowiadaczApp.sendMessage();
        } else {
            podpowiadaczApp.sendMessage(errorMsg);
        }
    },

    // ==================================================================
    // WIDGET NA PULPICIE (PRZESUWALNY)
    // ==================================================================
    renderWidget: async () => {
        let w = document.getElementById('bigai-widget');
        let isNew = false;
        
        if (!w) {
            w = document.createElement('div');
            w.id = 'bigai-widget';
            w.className = 'fixed z-[9990] g-panel border g-border rounded-full p-2 shadow-lg flex items-center gap-2 cursor-pointer transition-transform backdrop-blur-md themed-app overflow-hidden group select-none opacity-0';
            document.body.appendChild(w); 
            isNew = true;

            let isDragging = false;
            let startX, startY, shiftX, shiftY;

            w.onmousedown = (e) => {
                if(e.target.tagName === 'BUTTON') return; 
                startX = e.clientX; startY = e.clientY;
                let rect = w.getBoundingClientRect();
                shiftX = startX - rect.left; shiftY = startY - rect.top;
                isDragging = false;
                w.style.transition = 'none'; 

                const move = (me) => {
                    isDragging = true;
                    w.style.left = (me.clientX - shiftX) + 'px';
                    w.style.top = (me.clientY - shiftY) + 'px';
                    w.style.right = 'auto'; 
                };

                const up = () => {
                    document.removeEventListener('mousemove', move);
                    document.removeEventListener('mouseup', up);
                    w.style.transition = ''; 
                    if (isDragging) { bigosDB.set('bigos_bigai_widget_pos', {left: w.style.left, top: w.style.top}); }
                };

                document.addEventListener('mousemove', move);
                document.addEventListener('mouseup', up);
            };

            w.onclick = (e) => {
                if (!isDragging && e.target.tagName !== 'BUTTON') {
                    if(typeof winManager !== 'undefined') winManager.open('podpowiadacz');
                }
            };
        }
        
        let isListening = podpowiadaczApp.settings.wakeWordActive && podpowiadaczApp.isListeningBackground;
        
        w.innerHTML = `
            <div class="absolute inset-0 ${isListening ? 'bg-emerald-500/20' : 'bg-purple-500/10'} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div class="text-2xl drop-shadow-md relative z-10 pointer-events-none ${isListening ? 'animate-pulse' : ''}">🤖</div>
            <div class="flex flex-col relative z-10 pr-2 hidden sm:flex pointer-events-none">
                <span class="text-sm font-bold g-text leading-none">BigAI</span>
                <span class="text-[9px] font-bold ${isListening ? 'text-emerald-400 animate-pulse' : 'g-text-muted'} uppercase tracking-widest mt-0.5">${isListening ? 'Słucham...' : 'Uśpiony'}</span>
            </div>
            ${isListening ? `<button onclick="event.stopPropagation(); podpowiadaczApp.toggleWakeWord(false)" class="text-xs text-red-500 hover:text-red-400 bg-black/30 rounded-full w-5 h-5 flex items-center justify-center font-bold relative z-20 ml-1" title="Zatrzymaj nasłuch">✖</button>` : ''}
        `;

        if (isNew) {
            let savedPos = { top: '20px', left: (window.innerWidth - 130) + 'px' };
            try {
                const p = await bigosDB.get('bigos_bigai_widget_pos');
                if (p) savedPos = typeof p === 'string' ? JSON.parse(p) : p;
            } catch(e) {}
            w.style.top = savedPos.top; w.style.left = savedPos.left;
            w.classList.remove('opacity-0'); 
        }
    },

    // ==================================================================
    // GŁÓWNY INTERFEJS (UI)
    // ==================================================================
    upgradeUI: () => {
        let appWindow = document.getElementById('app-podpowiadacz');
        if (!appWindow) { 
            appWindow = document.createElement('div');
            appWindow.id = 'app-podpowiadacz';
            appWindow.className = 'window absolute';
            document.body.appendChild(appWindow);
        }

        appWindow.style.width = '900px';
        appWindow.style.height = '680px';
        appWindow.style.background = 'transparent';
        appWindow.style.border = 'none';
        appWindow.style.boxShadow = 'none';

        const titleBar = appWindow.querySelector('.title-bar');
        Array.from(appWindow.children).forEach(child => { if (child !== titleBar) child.remove(); });
        if(titleBar) titleBar.style.display = 'none';

        const proUI = document.createElement('div');
        proUI.className = 'flex flex-col overflow-hidden relative themed-app g-panel rounded-lg shadow-2xl h-full w-full';

        proUI.innerHTML = `
            <div class="px-4 py-2 border-b g-border flex justify-between items-center cursor-move bg-black/30 shrink-0 relative z-[100] shadow-md" onmousedown="winManager.startDrag(event, 'app-podpowiadacz')" ontouchstart="winManager.startDrag(event, 'app-podpowiadacz')">
                <span class="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-md flex items-center gap-2">
                    <span class="text-white">🤖</span> BigAI - Centrum Dowodzenia
                </span>
                <div class="flex gap-2 items-center">
                    <button onclick="podpowiadaczApp.stopTTS()" class="g-btn px-2 py-0.5 text-xs text-orange-400 border-orange-500/50 hover:bg-orange-500 hover:text-white rounded transition shadow-sm font-bold flex items-center gap-1" title="Zatrzymaj czytanie na głos"><span>🛑</span> <span class="hidden sm:inline">Cisza</span></button>
                    <button onclick="podpowiadaczApp.clearChat()" class="g-btn px-2 py-0.5 text-xs text-red-400 border-red-500/50 hover:bg-red-500 hover:text-white rounded transition shadow-sm font-bold flex items-center gap-1" title="Wyczyść całą historię czatu"><span>🗑️</span> <span class="hidden sm:inline">Wyczyść</span></button>
                    <button onclick="podpowiadaczApp.toggleSidebar()" class="g-btn px-2 py-0.5 text-xs text-blue-400 border-blue-500/50 hover:bg-blue-500 hover:text-white rounded transition shadow-sm font-bold flex items-center gap-1" title="Ustawienia Modeli i Głosu"><span>⚙️</span> <span class="hidden sm:inline">Ustawienia</span></button>
                    <div class="w-px h-4 bg-gray-600 mx-1 self-center"></div>
                    <button onclick="winManager.minimize('podpowiadacz')" class="g-icon-btn px-1 g-text transition">_</button>
                    <button onclick="winManager.maximize('app-podpowiadacz')" class="g-icon-btn px-1 g-text transition">□</button>
                    <button onclick="winManager.close('podpowiadacz')" class="text-red-500 hover:text-red-400 px-1 font-bold transition">✖</button>
                </div>
            </div>

            <div class="flex flex-row flex-grow overflow-hidden relative">
                
                <div id="ai-sidebar" class="w-[280px] border-r g-border bg-black/40 flex flex-col p-4 shrink-0 transition-all duration-300 ${podpowiadaczApp.isSidebarOpen ? 'ml-0' : '-ml-[280px]'} z-50 relative h-full shadow-2xl backdrop-blur-xl overflow-y-auto custom-scrollbar">
                    
                    <h3 class="font-bold text-xs g-accent uppercase tracking-widest mb-3 border-b g-border pb-1">Dostawca Czat AI</h3>
                    <div class="flex flex-col gap-3 mb-4">
                        <div>
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Silnik Główny</label>
                            <select id="ai-provider" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner" onchange="podpowiadaczApp.changeProvider()">
                                <option value="gemini_free" ${podpowiadaczApp.settings.provider==='gemini_free'?'selected':''}>Gemini (Darmowe wbudowane)</option>
                                <option value="openrouter" ${podpowiadaczApp.settings.provider==='openrouter'?'selected':''}>OpenRouter (Multi-Model)</option>
                                <option value="groq" ${podpowiadaczApp.settings.provider==='groq'?'selected':''}>Groq (Super Szybki Llama)</option>
                                <option value="openai" ${podpowiadaczApp.settings.provider==='openai'?'selected':''}>OpenAI (ChatGPT)</option>
                                <option value="gemini_api" ${podpowiadaczApp.settings.provider==='gemini_api'?'selected':''}>Własny Klucz Gemini</option>
                            </select>
                        </div>
                        
                        <div id="ai-key-container" class="${podpowiadaczApp.settings.provider==='gemini_free' ? 'opacity-30 pointer-events-none' : ''}">
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Klucz API do Chatbota</label>
                            <input type="password" id="ai-apikey" placeholder="Wklej klucz (sk-..., AIza...)" value="${podpowiadaczApp.settings.apiKey}" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-xs font-mono shadow-inner" onchange="podpowiadaczApp.settings.apiKey=this.value; podpowiadaczApp.saveData();">
                        </div>

                        <div>
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Model Językowy</label>
                            <select id="ai-model-select" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner" onchange="podpowiadaczApp.changeModelSelect()">
                            </select>
                            <input type="text" id="ai-model-custom" placeholder="Wpisz ID modelu..." value="${podpowiadaczApp.settings.customModel}" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-xs font-mono mt-1 shadow-inner ${podpowiadaczApp.settings.isCustomModel ? '' : 'hidden'}" onchange="podpowiadaczApp.settings.customModel=this.value; podpowiadaczApp.saveData();">
                        </div>
                    </div>

                    <h3 class="font-bold text-xs text-orange-400 uppercase tracking-widest mb-3 border-b g-border pb-1">Słuchanie (STT)</h3>
                    <div class="flex flex-col gap-3 mb-4">
                        <div>
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Silnik Dyktowania</label>
                            <select id="stt-provider" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner" onchange="podpowiadaczApp.changeSTTProvider()">
                                <option value="native" ${podpowiadaczApp.settings.sttProvider==='native'?'selected':''}>Wbudowany (Przeglądarki)</option>
                                <option value="groq" ${podpowiadaczApp.settings.sttProvider==='groq'?'selected':''}>Groq (Whisper API)</option>
                            </select>
                        </div>
                        <div id="stt-groq-settings" class="${podpowiadaczApp.settings.sttProvider==='groq' ? '' : 'hidden'}">
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Klucz API Groq</label>
                            <input type="password" id="stt-apikey" placeholder="gsk_..." value="${podpowiadaczApp.settings.sttApiKey}" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-xs font-mono shadow-inner mb-2" onchange="podpowiadaczApp.settings.sttApiKey=this.value; podpowiadaczApp.saveData();">
                            
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Model Whisper</label>
                            <select id="stt-model" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner" onchange="podpowiadaczApp.settings.sttModel=this.value; podpowiadaczApp.saveData();">
                                <option value="whisper-large-v3-turbo" ${podpowiadaczApp.settings.sttModel==='whisper-large-v3-turbo'?'selected':''}>Whisper Large V3 Turbo</option>
                                <option value="whisper-large-v3" ${podpowiadaczApp.settings.sttModel==='whisper-large-v3'?'selected':''}>Whisper Large V3</option>
                            </select>
                        </div>
                        <div class="flex items-center gap-2 cursor-pointer group mt-1" onclick="const cb=document.getElementById('ai-set-wakeword'); cb.checked=!cb.checked; podpowiadaczApp.toggleWakeWord(cb.checked);">
                            <input type="checkbox" id="ai-set-wakeword" class="w-4 h-4 accent-red-500 cursor-pointer" ${podpowiadaczApp.settings.wakeWordActive ? 'checked' : ''} onclick="event.stopPropagation(); podpowiadaczApp.toggleWakeWord(this.checked);">
                            <label class="text-xs font-bold g-text group-hover:text-red-400 transition cursor-pointer">Nasłuchuj w tle: "Bigos"</label>
                        </div>
                    </div>

                    <h3 class="font-bold text-xs text-emerald-500 uppercase tracking-widest mb-3 border-b g-border pb-1">Czytanie (TTS)</h3>
                    <div class="flex flex-col gap-3 mb-4">
                        <div>
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Dostawca Głosu</label>
                            <select id="tts-provider" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner" onchange="podpowiadaczApp.changeTTSProvider()">
                                <option value="native" ${podpowiadaczApp.settings.ttsProvider==='native'?'selected':''}>Wbudowany</option>
                                <option value="gemini" ${podpowiadaczApp.settings.ttsProvider==='gemini'?'selected':''}>Google Gemini</option>
                                <option value="openai" ${podpowiadaczApp.settings.ttsProvider==='openai'?'selected':''}>OpenAI</option>
                                <option value="elevenlabs" ${podpowiadaczApp.settings.ttsProvider==='elevenlabs'?'selected':''}>ElevenLabs</option>
                                <option value="cartesia" ${podpowiadaczApp.settings.ttsProvider==='cartesia'?'selected':''}>Cartesia</option>
                            </select>
                        </div>
                        <div id="tts-key-container" class="${podpowiadaczApp.settings.ttsProvider==='native' ? 'hidden' : ''}">
                            <label class="block text-[10px] font-bold g-text-muted mb-1" id="tts-key-lbl">Klucz API Głosu</label>
                            <input type="password" id="tts-apikey" placeholder="Wklej klucz API usługi" value="${podpowiadaczApp.settings.ttsApiKey}" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-xs font-mono shadow-inner mb-1" onchange="podpowiadaczApp.settings.ttsApiKey=this.value; podpowiadaczApp.saveData();">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Głos Asystenta</label>
                            <select id="tts-voice-select" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner" onchange="podpowiadaczApp.settings.ttsVoice=this.value; podpowiadaczApp.saveData();"></select>
                        </div>
                        
                        <div class="border-t border-gray-500/20 my-1"></div>
                        
                        <div class="flex items-center gap-2 cursor-pointer group" onclick="const cb=document.getElementById('ai-set-autotts'); cb.checked=!cb.checked; podpowiadaczApp.settings.autoTTS=cb.checked; podpowiadaczApp.saveData();">
                            <input type="checkbox" id="ai-set-autotts" class="w-4 h-4 accent-emerald-500 cursor-pointer" ${podpowiadaczApp.settings.autoTTS ? 'checked' : ''} onclick="event.stopPropagation(); podpowiadaczApp.settings.autoTTS=this.checked; podpowiadaczApp.saveData();">
                            <label class="text-xs font-bold g-text group-hover:text-emerald-400 transition cursor-pointer">Auto. czytanie na głos</label>
                        </div>
                    </div>
                    
                    <div class="mt-auto flex flex-col gap-2 pt-4 border-t g-border">
                        <button onclick="podpowiadaczApp.saveData(); if(typeof apps !== 'undefined') apps.showToast('Ustawienia', 'Zapisano pomyślnie.', 'success');" class="w-full g-btn px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-500 hover:text-white border-blue-500/50 rounded-lg transition font-bold text-xs shadow-md">💾 Zapisz</button>
                        <button onclick="podpowiadaczApp.toggleSidebar()" class="w-full g-btn px-4 py-2 bg-black/20 text-gray-300 hover:bg-white/10 rounded-lg transition font-bold text-xs">◀ Ukryj Panel</button>
                    </div>
                </div>

                <div class="flex-grow flex flex-col bg-black/10 relative transition-all duration-300 min-w-0">
                    <div id="ai-chat-container" class="flex-grow overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4 select-text cursor-auto" style="user-select: text; -webkit-user-select: text;">
                        <!-- Wiadomości -->
                    </div>

                    <div class="p-3 bg-black/20 border-t g-border shrink-0 flex flex-col gap-2">
                        <div id="ai-suggestions" class="flex gap-2 overflow-x-auto custom-scrollbar hidden pb-1 scroll-smooth"></div>
                        
                        <div class="w-full relative flex items-end gap-2">
                            <div class="flex-grow relative flex items-center">
                                <textarea id="ai-chat-input" rows="1" placeholder="Napisz polecenie lub kliknij mikrofon..." class="w-full bg-white/5 dark:bg-black/40 border g-border rounded-xl pl-4 pr-12 py-3 text-sm g-text outline-none focus:border-blue-500 transition-colors custom-scrollbar resize-none h-[46px] shadow-inner leading-tight" onkeydown="podpowiadaczApp.handleInput(event)" oninput="podpowiadaczApp.showSuggestions(this.value)"></textarea>
                                <button onclick="podpowiadaczApp.toggleDictation()" id="ai-mic-btn" class="absolute right-2 bottom-1.5 text-gray-400 hover:text-blue-400 transition p-2 rounded-full flex items-center justify-center text-lg h-8 w-8" title="Ręczne Dyktowanie Głosowe">🎤</button>
                            </div>
                            <button onclick="podpowiadaczApp.sendMessage()" class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl w-14 h-[46px] flex items-center justify-center text-xl shadow-lg transition-transform hover:scale-105 active:scale-95 shrink-0 mb-0">↑</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        appWindow.appendChild(proUI);
    },

    // ==================================================================
    // PODPOWIEDZI KOMEND (AUTOCOMPLETE)
    // ==================================================================
    showSuggestions: (val) => {
        const container = document.getElementById('ai-suggestions');
        if (!container) return;
        const query = val.trim().toLowerCase();
        if (query.length < 2) { container.classList.add('hidden'); container.innerHTML = ''; return; }
        
        const matches = podpowiadaczApp.suggestionsDB.filter(s => s.toLowerCase().startsWith(query) && s.toLowerCase() !== query);
        if (matches.length > 0) {
            container.innerHTML = matches.slice(0, 5).map(m => `<button class="g-btn text-[10px] px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-300 border-blue-500/50 hover:bg-blue-500 hover:text-white whitespace-nowrap shadow-sm transition-transform hover:scale-105" onclick="podpowiadaczApp.useSuggestion('${m}')">${m}</button>`).join('');
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden'); container.innerHTML = '';
        }
    },

    useSuggestion: (val) => {
        const input = document.getElementById('ai-chat-input');
        if (input) {
            input.value = val + ' '; input.focus();
            podpowiadaczApp.showSuggestions(input.value);
            input.style.height = '46px'; input.style.height = (input.scrollHeight) + 'px';
        }
    },

    // ==================================================================
    // USTAWIENIA I MODELE
    // ==================================================================
    toggleSidebar: () => {
        podpowiadaczApp.isSidebarOpen = !podpowiadaczApp.isSidebarOpen;
        podpowiadaczApp.upgradeUI(); podpowiadaczApp.updateModelsDropdown(); podpowiadaczApp.updateVoiceDropdown(); podpowiadaczApp.changeSTTProvider(); podpowiadaczApp.renderChat();
    },

    changeProvider: () => {
        const prov = document.getElementById('ai-provider').value;
        podpowiadaczApp.settings.provider = prov;
        
        const keyCont = document.getElementById('ai-key-container');
        if (prov === 'gemini_free') keyCont.classList.add('opacity-30', 'pointer-events-none');
        else keyCont.classList.remove('opacity-30', 'pointer-events-none');
        
        podpowiadaczApp.settings.model = MODELS_DB[prov] ? MODELS_DB[prov][0].id : '';
        podpowiadaczApp.settings.isCustomModel = false;
        
        podpowiadaczApp.updateModelsDropdown(); podpowiadaczApp.saveData();
    },

    updateModelsDropdown: () => {
        const sel = document.getElementById('ai-model-select'); const custInp = document.getElementById('ai-model-custom');
        if(!sel || !custInp) return;
        const prov = podpowiadaczApp.settings.provider; const models = MODELS_DB[prov] || [];
        
        sel.innerHTML = '';
        models.forEach(m => { sel.innerHTML += `<option value="${m.id}" ${podpowiadaczApp.settings.model === m.id && !podpowiadaczApp.settings.isCustomModel ? 'selected' : ''}>${m.name}</option>`; });
        sel.innerHTML += `<option value="custom_mode" ${podpowiadaczApp.settings.isCustomModel ? 'selected' : ''}>⚙️ Wpisz własny model...</option>`;

        if (podpowiadaczApp.settings.isCustomModel) custInp.classList.remove('hidden');
        else custInp.classList.add('hidden');
    },

    changeModelSelect: () => {
        const sel = document.getElementById('ai-model-select'); const custInp = document.getElementById('ai-model-custom');
        if (sel.value === 'custom_mode') {
            podpowiadaczApp.settings.isCustomModel = true; custInp.classList.remove('hidden'); podpowiadaczApp.settings.model = custInp.value; 
        } else {
            podpowiadaczApp.settings.isCustomModel = false; custInp.classList.add('hidden'); podpowiadaczApp.settings.model = sel.value;
        }
        podpowiadaczApp.saveData();
    },

    changeTTSProvider: () => {
        const prov = document.getElementById('tts-provider').value;
        podpowiadaczApp.settings.ttsProvider = prov;
        const keyCont = document.getElementById('tts-key-container');
        if (prov === 'native') keyCont.classList.add('hidden');
        else { keyCont.classList.remove('hidden'); document.getElementById('tts-key-lbl').innerText = `Klucz API dla ${prov.toUpperCase()}`; }
        podpowiadaczApp.settings.ttsVoice = VOICES_DB[prov] ? VOICES_DB[prov][0].id : '';
        podpowiadaczApp.updateVoiceDropdown(); podpowiadaczApp.saveData();
    },

    changeSTTProvider: () => {
        const prov = document.getElementById('stt-provider')?.value || podpowiadaczApp.settings.sttProvider;
        podpowiadaczApp.settings.sttProvider = prov;
        const setDiv = document.getElementById('stt-groq-settings');
        if (setDiv) { if (prov === 'groq') setDiv.classList.remove('hidden'); else setDiv.classList.add('hidden'); }
        podpowiadaczApp.saveData();
    },
    
    updateVoiceDropdown: () => {
        const sel = document.getElementById('tts-voice-select'); if(!sel) return;
        const prov = podpowiadaczApp.settings.ttsProvider; const voices = VOICES_DB[prov] || [];
        sel.innerHTML = '';
        voices.forEach(v => { sel.innerHTML += `<option value="${v.id}" ${podpowiadaczApp.settings.ttsVoice === v.id ? 'selected' : ''}>${v.name}</option>`; });
    },
    
    toggleWakeWord: (isActive) => {
        podpowiadaczApp.settings.wakeWordActive = isActive; podpowiadaczApp.saveData();
        if (isActive) {
            podpowiadaczApp.startBackgroundListening();
            if(typeof apps !== 'undefined') apps.showToast('Agent Nasłuchuje', 'Powiedz "Bigos" w dowolnym momencie by wywołać asystenta.', 'success');
        } else {
            if (podpowiadaczApp.recognition) { try { podpowiadaczApp.recognition.stop(); } catch(e){} }
            podpowiadaczApp.isListeningBackground = false; podpowiadaczApp.renderWidget();
        }
    },

    // ==================================================================
    // MOWA: SPEECH-TO-TEXT I TEXT-TO-SPEECH
    // ==================================================================
    initSpeechRecognition: () => { 
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            podpowiadaczApp.recognition = new SpeechRecognition();
            podpowiadaczApp.recognition.lang = 'pl-PL';
            podpowiadaczApp.recognition.interimResults = true;
            podpowiadaczApp.recognition.continuous = false;

            podpowiadaczApp.recognition.onstart = () => {
                const btn = document.getElementById('ai-mic-btn');
                if(btn && !podpowiadaczApp.settings.wakeWordActive && podpowiadaczApp.settings.sttProvider === 'native') { 
                    btn.classList.add('text-red-500', 'animate-pulse'); btn.innerText = '🔴'; 
                }
                podpowiadaczApp.isListeningBackground = true;
                podpowiadaczApp.renderWidget();
            };

            podpowiadaczApp.recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                }
                
                if (finalTranscript) {
                    const lowerTrans = finalTranscript.toLowerCase().trim();
                    if (podpowiadaczApp.settings.wakeWordActive) {
                        const wakeWords = ["bigos", "hej bigos", "bigosie"];
                        let triggered = false; let command = "";
                        for (let w of wakeWords) {
                            let idx = lowerTrans.indexOf(w);
                            if (idx !== -1) {
                                triggered = true;
                                command = lowerTrans.substring(idx + w.length).trim().replace(/^[,.!?-]\s*/, '').trim();
                                break;
                            }
                        }
                        if (triggered) {
                            if (command.length > 2) {
                                if(typeof winManager !== 'undefined') winManager.open('podpowiadacz');
                                if(typeof apps !== 'undefined') apps.showToast('Zrozumiałem', `Rozkaz: ${command}`, 'success');
                                const input = document.getElementById('ai-chat-input');
                                if (input) { input.value = command; podpowiadaczApp.showSuggestions(command); }
                                podpowiadaczApp.sendMessage(command);
                            } else {
                                if(typeof winManager !== 'undefined') winManager.open('podpowiadacz');
                                podpowiadaczApp.readText(null, "Słucham. O co chciałbyś zapytać?");
                            }
                        }
                    } else if (podpowiadaczApp.settings.sttProvider === 'native') {
                        const input = document.getElementById('ai-chat-input');
                        if (input) {
                            input.value = (input.value + ' ' + finalTranscript).trim();
                            input.style.height = (input.scrollHeight) + 'px';
                            podpowiadaczApp.showSuggestions(input.value);
                        }
                    }
                }
            };

            podpowiadaczApp.recognition.onend = () => {
                if (podpowiadaczApp.settings.wakeWordActive) {
                    setTimeout(() => { if (podpowiadaczApp.settings.wakeWordActive) { try { podpowiadaczApp.recognition.start(); } catch(e){} } }, 500);
                } else if (podpowiadaczApp.settings.sttProvider === 'native') {
                    const btn = document.getElementById('ai-mic-btn');
                    if(btn) { btn.classList.remove('text-red-500', 'animate-pulse'); btn.innerText = '🎤'; }
                    podpowiadaczApp.isListeningBackground = false; podpowiadaczApp.renderWidget();
                }
            };
            
            podpowiadaczApp.recognition.onerror = (e) => {
                if (!podpowiadaczApp.settings.wakeWordActive && podpowiadaczApp.settings.sttProvider === 'native') {
                    if(typeof apps !== 'undefined') apps.showToast('Błąd Mikrofonu', 'Nie udało się nasłuchiwać: ' + e.error, 'error');
                    const btn = document.getElementById('ai-mic-btn');
                    if(btn) { btn.classList.remove('text-red-500', 'animate-pulse'); btn.innerText = '🎤'; }
                }
            };
        }
    },
    
    startBackgroundListening: () => {
        if (!podpowiadaczApp.recognition) podpowiadaczApp.initSpeechRecognition();
        if (!podpowiadaczApp.recognition) return;
        try { podpowiadaczApp.recognition.start(); } catch(e) {}
    },
    
    toggleDictation: async () => {
        const prov = podpowiadaczApp.settings.sttProvider || 'native';
        if (prov === 'groq') {
            const btn = document.getElementById('ai-mic-btn');
            if (podpowiadaczApp.isRecording) {
                if (podpowiadaczApp.mediaRecorder) podpowiadaczApp.mediaRecorder.stop();
                podpowiadaczApp.isRecording = false; btn.classList.remove('text-red-500', 'animate-pulse'); btn.innerText = '⏳';
            } else {
                if (podpowiadaczApp.settings.wakeWordActive) { podpowiadaczApp.toggleWakeWord(false); const cb = document.getElementById('ai-set-wakeword'); if(cb) cb.checked = false; }
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    podpowiadaczApp.mediaRecorder = new MediaRecorder(stream);
                    podpowiadaczApp.audioChunks = [];
                    podpowiadaczApp.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) podpowiadaczApp.audioChunks.push(e.data); };
                    podpowiadaczApp.mediaRecorder.onstop = async () => {
                        const audioBlob = new Blob(podpowiadaczApp.audioChunks, { type: 'audio/webm' });
                        podpowiadaczApp.audioChunks = []; stream.getTracks().forEach(track => track.stop()); 
                        const apiKey = podpowiadaczApp.settings.sttApiKey;
                        if (!apiKey) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Wprowadź w ustawieniach klucz API dla Groq STT!', 'error'); btn.innerText = '🎤'; return; }
                        const formData = new FormData();
                        formData.append('file', new File([audioBlob], 'recording.webm', { type: 'audio/webm' }));
                        formData.append('model', podpowiadaczApp.settings.sttModel || 'whisper-large-v3-turbo');
                        formData.append('language', 'pl'); 
                        try {
                            const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}` }, body: formData });
                            const data = await response.json();
                            if (!response.ok) throw new Error(data.error?.message || response.statusText);
                            if (data.text) {
                                const input = document.getElementById('ai-chat-input');
                                if (input) { input.value = (input.value + ' ' + data.text).trim(); input.style.height = (input.scrollHeight) + 'px'; podpowiadaczApp.showSuggestions(input.value); }
                            }
                        } catch (error) { if(typeof apps !== 'undefined') apps.showToast('Błąd STT Groq', error.message, 'error'); } finally { btn.innerText = '🎤'; }
                    };
                    podpowiadaczApp.mediaRecorder.start(); podpowiadaczApp.isRecording = true;
                    btn.classList.add('text-red-500', 'animate-pulse'); btn.innerText = '🔴';
                } catch (e) { if(typeof apps !== 'undefined') apps.showToast('Błąd Mikrofonu', 'Nie można uzyskać dostępu do mikrofonu.', 'error'); }
            }
            return;
        }

        if (!podpowiadaczApp.recognition) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Przeglądarka nie obsługuje dyktowania.', 'error'); return; }
        if (podpowiadaczApp.settings.wakeWordActive) { podpowiadaczApp.toggleWakeWord(false); const cb = document.getElementById('ai-set-wakeword'); if(cb) cb.checked = false; }
        const btn = document.getElementById('ai-mic-btn');
        if (btn.classList.contains('text-red-500')) { podpowiadaczApp.recognition.stop(); } 
        else { try { podpowiadaczApp.recognition.start(); } catch(e){} }
    },

    pcmToWav: (base64Data, sampleRate) => { 
        const binaryString = atob(base64Data); const len = binaryString.length; const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        const wav = new ArrayBuffer(44 + bytes.length); const view = new DataView(wav);
        const writeString = (v, o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
        writeString(view, 0, 'RIFF'); view.setUint32(4, 36 + bytes.length, true); writeString(view, 8, 'WAVE'); writeString(view, 12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeString(view, 36, 'data'); view.setUint32(40, bytes.length, true);
        new Uint8Array(wav, 44).set(bytes);
        return URL.createObjectURL(new Blob([wav], { type: 'audio/wav' })); 
    },
    
    stopTTS: () => { 
        if (podpowiadaczApp.activeAudio) { podpowiadaczApp.activeAudio.pause(); podpowiadaczApp.activeAudio = null; }
        window.speechSynthesis.cancel(); 
        if (podpowiadaczApp.currentTTSButton) {
            podpowiadaczApp.currentTTSButton.innerHTML = '🔊 Czytaj';
            podpowiadaczApp.currentTTSButton.classList.remove('animate-pulse', 'text-red-400', 'border-red-500/30');
            podpowiadaczApp.currentTTSButton.dataset.playing = 'false';
            podpowiadaczApp.currentTTSButton = null;
        }
        if (podpowiadaczApp.pendingActionCallback) {
            const cb = podpowiadaczApp.pendingActionCallback;
            podpowiadaczApp.pendingActionCallback = null;
            cb();
        }
    },
    
    readText: async (buttonEl, text, onEndCallback = null) => { 
        if (buttonEl && buttonEl.dataset.playing === 'true') { podpowiadaczApp.stopTTS(); return; }
        podpowiadaczApp.stopTTS();
        podpowiadaczApp.pendingActionCallback = onEndCallback;
        const cleanText = text.replace(/\[BIGOS:.*?\]/g, '').replace(/[\*\_`#]/g, '').trim();
        if(!cleanText) { podpowiadaczApp.stopTTS(); return; }

        if (buttonEl) {
            buttonEl.innerHTML = '🛑 Zatrzymaj';
            buttonEl.classList.add('animate-pulse', 'text-red-400', 'border-red-500/30');
            buttonEl.dataset.playing = 'true';
            podpowiadaczApp.currentTTSButton = buttonEl;
        }

        const prov = podpowiadaczApp.settings.ttsProvider;
        const key = podpowiadaczApp.settings.ttsApiKey;
        const voice = podpowiadaczApp.settings.ttsVoice;
        const finalizeBtn = () => { podpowiadaczApp.stopTTS(); };

        if (prov === 'native') {
            const utterance = new SpeechSynthesisUtterance(cleanText); utterance.lang = 'pl-PL'; utterance.onend = finalizeBtn; utterance.onerror = finalizeBtn;
            window.speechSynthesis.speak(utterance);
            setTimeout(finalizeBtn, ((cleanText.length / 10) * 1000) + 2000); 
        } 
        else if (prov === 'gemini') {
            if(!key) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Brak klucza API dla Gemini TTS!', 'error'); finalizeBtn(); return; }
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${key}`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: cleanText }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || 'Kore' } } } } })
                });
                if(!response.ok) throw new Error();
                const data = await response.json(); const part = data.candidates?.[0]?.content?.parts?.[0];
                if (part && part.inlineData) {
                    const mime = part.inlineData.mimeType || "audio/L16; rate=24000";
                    let sampleRate = 24000; const rateMatch = mime.match(/rate=(\d+)/); if(rateMatch) sampleRate = parseInt(rateMatch[1], 10);
                    const audio = new Audio(podpowiadaczApp.pcmToWav(part.inlineData.data, sampleRate));
                    audio.onended = finalizeBtn; audio.onerror = finalizeBtn; audio.play();
                    podpowiadaczApp.activeAudio = audio;
                } else throw new Error("Brak danych audio");
            } catch(e) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Nie udało się pobrać głosu z Gemini', 'error'); finalizeBtn(); }
        }
        else if (prov === 'openai') {
            if(!key) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Brak klucza API dla OpenAI TTS!', 'error'); finalizeBtn(); return; }
            try {
                const response = await fetch('https://api.openai.com/v1/audio/speech', {
                    method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: 'tts-1', input: cleanText, voice: voice || 'alloy' })
                });
                if(!response.ok) throw new Error();
                const audio = new Audio(URL.createObjectURL(await response.blob()));
                audio.onended = finalizeBtn; audio.onerror = finalizeBtn; audio.play();
                podpowiadaczApp.activeAudio = audio;
            } catch(e) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Nie udało się pobrać głosu OpenAI', 'error'); finalizeBtn(); }
        }
        else if (prov === 'elevenlabs') {
            if(!key) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Brak klucza API dla ElevenLabs!', 'error'); finalizeBtn(); return; }
            try {
                const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice || '21m00Tcm4TlvDq8ikWAM'}`, {
                    method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: cleanText, model_id: "eleven_multilingual_v2" })
                });
                if(!response.ok) throw new Error();
                const audio = new Audio(URL.createObjectURL(await response.blob()));
                audio.onended = finalizeBtn; audio.onerror = finalizeBtn; audio.play();
                podpowiadaczApp.activeAudio = audio;
            } catch(e) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Nie udało się pobrać głosu ElevenLabs', 'error'); finalizeBtn(); }
        }
        else if (prov === 'cartesia') {
            if(!key) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Brak klucza API dla Cartesia!', 'error'); finalizeBtn(); return; }
            try {
                const response = await fetch('https://api.cartesia.ai/v1/tts/bytes', {
                    method: 'POST', headers: { 'X-API-Key': key, 'Content-Type': 'application/json', 'Cartesia-Version': '2024-06-10' },
                    body: JSON.stringify({ transcript: cleanText, model_id: "sonic-multilingual", voice: { mode: "id", id: voice || "a0e99841-438c-4a64-b6a9-62f748e5b61a" }, output_format: { container: "mp3", encoding: "mp3", sample_rate: 44100 } })
                });
                if(!response.ok) throw new Error();
                const audio = new Audio(URL.createObjectURL(await response.blob()));
                audio.onended = finalizeBtn; audio.onerror = finalizeBtn; audio.play();
                podpowiadaczApp.activeAudio = audio;
            } catch(e) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Nie udało się pobrać głosu Cartesia', 'error'); finalizeBtn(); }
        }
    },

    // ==================================================================
    // RENDEROWANIE CZATU ORAZ POBIERANIE WYGENEROWANYCH PLIKÓW
    // ==================================================================
    downloadCode: (btn, ext) => {
        const pre = btn.closest('.my-2').querySelector('pre'); if(!pre) return;
        const text = pre.textContent || pre.innerText;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "kod_z_BigAI." + ext; link.click();
        if(typeof apps !== 'undefined') apps.showToast('Pobrano', 'Plik zapisany na dysku PC.', 'success');
    },

    copyCode: (btn) => {
        const pre = btn.closest('.my-2').querySelector('pre'); if(!pre) return;
        const text = pre.textContent || pre.innerText;
        const fallbackCopy = (t) => {
            const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); if(typeof apps !== 'undefined') apps.showToast('Skopiowano', 'Kod skopiowany do schowka!', 'success'); } catch (err) {} document.body.removeChild(ta);
        };
        if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(() => { if(typeof apps !== 'undefined') apps.showToast('Skopiowano', 'Kod skopiowany do schowka!', 'success'); }).catch(() => fallbackCopy(text)); } 
        else { fallbackCopy(text); }
    },

    // ==================================================================
    // 🛠️ NARZĘDZIE DO NAPRAWY KODU Z POZIOMU CZATU
    // ==================================================================
    fixCode: (btn) => {
        const pre = btn.closest('.my-2').querySelector('pre');
        if(!pre) return;
        const code = pre.textContent || pre.innerText;

        let errorMsg = "Ten kod nie działa lub ma błąd składni. ";
        try {
            new Function(code);
            errorMsg += "Popraw interfejs, upewnij się, że poprawnie formatujesz Tailwind CSS i zamykasz wszystkie cudzysłowy i znaczniki HTML.";
        } catch (err) {
            errorMsg += "Wystąpił w nim błąd przy tworzeniu aplikacji: " + err.message + ". Najprawdopodobniej źle zamknąłeś cudzysłowy w atrybutach HTML albo uciąłeś kod. Upewnij się, że we właściwości \`html: ...\` zamykasz poprawnie stringi!";
        }

        const input = document.getElementById('ai-chat-input');
        if (input) {
            input.value = errorMsg;
            podpowiadaczApp.sendMessage();
        } else {
            podpowiadaczApp.sendMessage(errorMsg);
        }
    },

    formatMarkdown: (text, msgId) => {
        if (!text) return '';
        let html = typeof desktop !== 'undefined' ? desktop.escapeHTML(text) : text;
        
        // KROK 1: Bezpieczne wycięcie i przechowanie bloków kodu (aby parser ich nie zniszczył)
        const codeBlocks = [];
        html = html.replace(/```(.*?)[\n\r]([\s\S]*?)```/g, function(match, lang, code) {
            codeBlocks.push({lang: lang.trim(), code: code});
            return `___BIGOS_CODE_BLOCK_${codeBlocks.length - 1}___`;
        });

        // KROK 2: Standardowe parsowanie Markdowna (tylko na tekście poza blokami kodu)
        html = html.replace(/\[BIGOS:(.*?):(.*?)\]/g, '');
        html = html.replace(/\*\*(.*?)\*\*/g, '<b class="g-text">$1</b>');
        html = html.replace(/\*(.*?)\*/g, '<i class="g-text-muted">$1</i>');
        html = html.replace(/^\* (.*?)$/gm, '<li class="ml-4 list-disc">$1</li>');
        html = html.replace(/^- (.*?)$/gm, '<li class="ml-4 list-disc">$1</li>');
        
        // Zwykłe backticki (kod inline)
        html = html.replace(/`(.*?)`/g, '<code class="bg-black/30 text-blue-300 px-1 py-0.5 rounded font-mono text-xs border g-border">$1</code>');
        
        html = html.replace(/<div id="map-(.*?)"><\/div>/g, '<div id="map-$1" class="w-full mt-2 bg-black/20 rounded-xl border g-border overflow-hidden"></div>');
        html = html.replace(/\n/g, '<br>');

        // KROK 3: Przywrócenie bloków kodu wraz z przyciskami (Teraz kod JS jest nienaruszony!)
        codeBlocks.forEach((block, index) => {
            let ext = 'txt';
            if (block.lang.toLowerCase().includes('html')) ext = 'html';
            else if (block.lang.toLowerCase().includes('js') || block.lang.toLowerCase().includes('javascript')) ext = 'js';

            let installBtn = '';
            let fixBtn = '';
            if (ext === 'js') {
                installBtn = `<button class="hover:text-emerald-400 text-emerald-500 font-bold transition ml-2 border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 rounded shadow-sm" onclick="podpowiadaczApp.installApp(this)">🚀 Zainstaluj Apkę</button>`;
                fixBtn = `<button class="hover:text-orange-400 text-orange-500 font-bold transition ml-2 border border-orange-500/50 bg-orange-500/10 px-2 py-0.5 rounded shadow-sm" onclick="podpowiadaczApp.fixCode(this)">🛠️ Popraw kod</button>`;
            }

            const formattedBlock = `<div class="my-2 rounded-lg border g-border overflow-hidden shadow-sm">
                        <div class="bg-black/60 px-3 py-1 text-[10px] g-text-muted uppercase tracking-wider flex justify-between items-center flex-wrap gap-2">
                            <span>${block.lang || 'CODE'}</span>
                            <div class="flex gap-2 items-center flex-wrap">
                                ${fixBtn}
                                ${installBtn}
                                <button class="hover:text-white transition ml-2" onclick="podpowiadaczApp.downloadCode(this, '${ext}')">💾 Pobierz</button>
                                <button class="hover:text-white transition ml-1" onclick="podpowiadaczApp.copyCode(this)">📋 Kopiuj</button>
                            </div>
                        </div>
                        <pre class="p-3 bg-[#0d1117] text-gray-300 font-mono text-xs overflow-x-auto m-0 leading-relaxed">${block.code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
                    </div>`;
            
            html = html.replace(`___BIGOS_CODE_BLOCK_${index}___`, formattedBlock);
        });

        return html;
    },

    renderChat: () => {
        const chatBox = document.getElementById('ai-chat-container');
        if (!chatBox) return;

        chatBox.innerHTML = '';
        
        podpowiadaczApp.messages.forEach((msg, idx) => {
            const isUser = msg.role === 'user';
            const alignClass = isUser ? 'self-end' : 'self-start';
            const bgClass = isUser ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white' : 'g-panel bg-black/20 border g-border g-text';
            const radiusClass = isUser ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm';
            const icon = isUser ? '👤' : '🤖';
            const senderName = isUser ? 'Ty' : 'BigAI';

            const el = document.createElement('div');
            el.className = `flex flex-col max-w-[90%] sm:max-w-[80%] ${alignClass} mb-3 shadow-md ${bgClass} ${radiusClass} p-3 sm:p-4 text-sm leading-relaxed relative group select-text cursor-auto`;
            el.style.userSelect = "text"; el.style.webkitUserSelect = "text";
            
            let formattedHtml = podpowiadaczApp.formatMarkdown(msg.text, idx);
            
            el.innerHTML = `
                <div class="flex items-center justify-between mb-2 border-b border-white/10 pb-1 w-full opacity-70">
                    <div class="flex items-center gap-2">
                        <span class="text-lg leading-none">${icon}</span>
                        <span class="text-[10px] font-bold uppercase tracking-wider">${senderName}</span>
                    </div>
                </div>
                <div class="w-full break-words space-y-2 font-sans">${formattedHtml}</div>
            `;
            chatBox.appendChild(el);
        });

        if (podpowiadaczApp.isThinking) {
            const el = document.createElement('div');
            el.className = `self-start g-panel bg-black/20 border border-blue-500/30 g-text rounded-2xl rounded-tl-sm p-4 text-sm max-w-[80%] shadow-md animate-pulse`;
            el.innerHTML = `<div class="flex items-center gap-3"><span class="text-xl animate-spin inline-block">⚙️</span> <span class="font-mono text-xs text-blue-400">Przetwarzanie w chmurze...</span></div>`;
            chatBox.appendChild(el);
        }

        chatBox.scrollTop = chatBox.scrollHeight;
    },

    clearChat: () => {
        const modalId = 'ai-clear-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm';
        modal.innerHTML = `
            <div class="g-panel bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-sm w-[90%] border g-border">
                <h2 class="text-xl font-bold g-text mb-4 drop-shadow-md flex items-center gap-2"><span class="text-red-500">⚠️</span> Wyczyść historię</h2>
                <p class="text-sm g-text-muted mb-6">Czy na pewno chcesz bezpowrotnie usunąć całą historię tej rozmowy?</p>
                <div class="flex gap-3 justify-end">
                    <button id="ai-clear-cancel" class="px-4 py-2 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border shadow-sm">Anuluj</button>
                    <button id="ai-clear-ok" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg shadow-red-600/30 transition font-bold border border-red-700">Wyczyść</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('ai-clear-cancel').onclick = () => modal.remove();
        
        document.getElementById('ai-clear-ok').onclick = () => {
            podpowiadaczApp.stopTTS(); 
            podpowiadaczApp.messages = [];
            podpowiadaczApp.saveData(); 

            podpowiadaczApp.messages.push({
                role: 'assistant',
                text: 'Cześć! Jestem Twoim osobistym asystentem wbudowanym w **BigOS**. \n\nSpróbuj napisać lub powiedzieć:\n* *"Otwórz Kombinator i włącz ciemny motyw"* \n* *"Zmień tapetę na kosmos"*\n* *"Otwórz plik o nazwie BigOS"*\n\nW czym mogę pomóc?'
            });
            
            podpowiadaczApp.saveData();
            podpowiadaczApp.renderChat();
            if(typeof apps !== 'undefined') apps.showToast('Czat', 'Historia wyczyszczona!', 'success');
            modal.remove();
        };
    },

    handleInput: (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            podpowiadaczApp.sendMessage();
        }
    },

    // ==================================================================
    // INTEGRACJA Z SYSTEMEM
    // ==================================================================
    extractCommands: (aiText) => {
        let cleanText = aiText;
        let commands = [];
        const regex = /\[BIGOS:([^:\]]+):([^\]]+)\]/g;
        let match;

        while ((match = regex.exec(aiText)) !== null) {
            commands.push({ action: match[1].toLowerCase().trim(), param: match[2].trim() });
        }
        cleanText = cleanText.replace(/\[BIGOS:(.*?):(.*?)\]/g, '').trim();
        return { cleanText, commands, mapQuery: null };
    },

    runCommands: (commands) => {
        commands.forEach(cmd => {
            const action = cmd.action; const param = cmd.param;
            try {
                if (action === 'open_app') {
                    if (param.toLowerCase() === 'bigcut' && typeof BigCut !== 'undefined') BigCut.init();
                    if(typeof winManager !== 'undefined') winManager.open(param.toLowerCase());
                } 
                else if (action === 'close_app') { if(typeof winManager !== 'undefined') winManager.close(param.toLowerCase()); }
                else if (action === 'set_theme') { if(typeof themeManager !== 'undefined') themeManager.applyTheme(param); else if(typeof apps !== 'undefined') apps.setTheme(param); } 
                else if (action === 'set_wallpaper') {
                    const bg = document.getElementById('desktop-bg'); let url = param;
                    if(param === 'kosmos') url = 'tapety/kosmos.webp'; if(param === 'bigos') url = 'tapety/bigos.webp';
                    if(param === 'ferrari') url = 'tapety/ferrari.webp'; if(param === 'abstrakcja') url = 'tapety/abstrakcja.webp';
                    if (bg) { bg.style.backgroundImage = `url('${url}')`; bg.classList.add('custom-wp'); }
                    bigosDB.set('bigos_bg', url); 
                }
            } catch(e) {}
        });
    },

    // ==================================================================
    // GŁÓWNA LOGIKA WYSYŁANIA WIADOMOŚCI
    // ==================================================================
    sendMessage: async (commandOverride) => {
        const input = document.getElementById('ai-chat-input');
        const suggestionsContainer = document.getElementById('ai-suggestions');
        
        if (suggestionsContainer) { suggestionsContainer.classList.add('hidden'); suggestionsContainer.innerHTML = ''; }
        
        let userText = "";
        if (commandOverride && typeof commandOverride === 'string') userText = commandOverride.trim();
        else if (input) userText = input.value.trim();
        
        if (!userText) return;

        if (input) { input.value = ''; input.style.height = '46px'; }

        podpowiadaczApp.messages.push({ role: 'user', text: userText });
        podpowiadaczApp.isThinking = true;
        podpowiadaczApp.renderChat();
        podpowiadaczApp.saveData();

        // -------------------------------------------------------------
        // BUDOWA SYSTEM PROMPTU
        // -------------------------------------------------------------
        const systemPrompt = `Jesteś "BigAI" - główną sztuczną inteligencją systemu operacyjnego BigOS. 
Masz możliwość tworzenia natywnych, pięknych aplikacji wewnątrz tego systemu na życzenie użytkownika.

Gdy użytkownik poprosi o aplikację (np. "Stwórz kalkulator walut" lub "Napisz program z cebularzami"),
wygeneruj TYLKO JEDEN ZINTEGROWANY BLOK KODU w formacie \`\`\`javascript \`\`\`. 

System sam go zainstaluje, doda ikonkę i włączy po kliknięciu "Zainstaluj Apkę"! 
NIE pisz w odpowiedzi żadnych kroków HTML. Nie proś użytkownika o ręczne wklejanie plików ani nie tłumacz logiki, po prostu daj czysty kod.

Oto JEDYNY I BEZWZGLĘDNY SZABLON kodu, którego masz użyć. Oprzyj na nim całą aplikację:

\`\`\`javascript
window.BigOSAppAPI.register({
    id: 'unikalneid_apki', // ID bez spacji
    name: 'Moja Aplikacja', // Tytuł na pasku
    icon: '🚀', // Ikona emoji
    width: '400px', // Szerokość okna
    height: 'auto', // Wysokość okna
    html: \`
          <div class="flex flex-col gap-3">
              <h3 class="g-text font-bold text-lg text-center">Witaj w super aplikacji!</h3>
              <input type="number" id="twoj_input_id" class="g-bg g-text p-2 rounded border g-border w-full outline-none focus:border-blue-500" placeholder="Wpisz liczbę">
              <!-- Zwróć uwagę na poprawne użycie cudzysłowów! -->
              <button onclick="window.MojaUnikalnaApka.oblicz()" class="g-btn p-3 rounded font-bold shadow-md bg-blue-600/20 hover:bg-blue-600 border-blue-500/50">Kliknij mnie</button>
              <div id="twoj_wynik_id" class="g-text text-2xl font-bold text-center mt-2">...</div>
          </div>
    \`,
    globalName: 'MojaUnikalnaApka', // To stworzy globalny obiekt dla przycisków w HTML
    global: {
        // Wszystkie twoje funkcje
        oblicz: () => {
            const v = parseFloat(document.getElementById('twoj_input_id').value) || 0;
            document.getElementById('twoj_wynik_id').innerText = v * 10 + ' PLN';
        }
    },
    init: () => {
        // Ta funkcja odpali się po otwarciu okienka (opcjonalne)
        console.log("Moja aplikacja gotowa!");
    }
});
\`\`\`

ZASADY WIZUALNE I KODU (KRYTYCZNE - ZŁAMANIE ICH ZNISZCZY SYSTEM):
1. Używaj JEDYNIE tych klas dla spójności z systemem: \`g-text\`, \`g-text-muted\`, \`g-bg\`, \`g-btn\`, \`g-border\`, \`g-panel\`.
2. NIE UŻYWAJ sztywnych kolorów (bg-gray-900, text-white). System sam dobierze kolory.
3. Właściwość \`html:\` MUSI być zapisana w znakach backtick ( \` ). Używanie backticków do HTML to NAJLEPSZA metoda, aby uniknąć błędów cudzysłowów wewnątrz atrybutów takich jak onclick="...". Po prostu zwróć uwagę, żeby poprawnie je otworzyć i zamknąć.
`;

        const prov = podpowiadaczApp.settings.provider;
        const key = podpowiadaczApp.settings.apiKey;
        const mod = podpowiadaczApp.settings.isCustomModel ? podpowiadaczApp.settings.customModel : podpowiadaczApp.settings.model;

        let responseText = "Wystąpił błąd po stronie serwera.";

        try {
            if (prov === 'gemini_free' || prov === 'gemini_api') {
                const actualKey = prov === 'gemini_free' ? '' : key;
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${actualKey}`;
                
                let geminiContents = [];
                let slice = podpowiadaczApp.messages.slice(-8);
                
                for (let m of slice) {
                    let role = m.role === 'assistant' ? 'model' : 'user';
                    let text = m.rawText || m.text;
                    
                    if (geminiContents.length === 0) {
                        if (role === 'model') continue; 
                        geminiContents.push({ role: role, parts: [{ text: text }] });
                    } else {
                        let lastMsg = geminiContents[geminiContents.length - 1];
                        if (lastMsg.role === role) { lastMsg.parts[0].text += "\n\n" + text; } 
                        else { geminiContents.push({ role: role, parts: [{ text: text }] }); }
                    }
                }
                
                if (geminiContents.length === 0) geminiContents.push({ role: 'user', parts: [{ text: 'Cześć' }]});

                const payload = { contents: geminiContents, systemInstruction: { parts: [{ text: systemPrompt }] } };
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
                    headers: { "Authorization": `Bearer ${key}`, "HTTP-Referer": window.location.href, "X-OpenRouter-Title": "BigOS Browser", "Content-Type": "application/json" },
                    body: JSON.stringify({ model: mod, messages: [ { role: "system", content: systemPrompt }, ...podpowiadaczApp.messages.slice(-8).map(m => ({ role: m.role, content: m.rawText || m.text })) ] })
                });
                const data = await response.json();
                if(!response.ok) throw new Error(`OpenRouter: ${data.error?.message || response.statusText}`);
                responseText = data.choices?.[0]?.message?.content || "Błąd parsowania.";
            }
            else if (prov === 'openai') {
                const response = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ model: mod, messages: [ { role: "system", content: systemPrompt }, ...podpowiadaczApp.messages.slice(-8).map(m => ({ role: m.role, content: m.rawText || m.text })) ] })
                });
                const data = await response.json();
                if(!response.ok) throw new Error(`OpenAI: ${data.error?.message || response.statusText}`);
                responseText = data.choices?.[0]?.message?.content || "Błąd parsowania.";
            }
            else if (prov === 'groq') {
                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ model: mod, messages: [ { role: "system", content: systemPrompt }, ...podpowiadaczApp.messages.slice(-8).map(m => ({ role: m.role, content: m.rawText || m.text })) ] })
                });
                const data = await response.json();
                if(!response.ok) throw new Error(`Groq: ${data.error?.message || response.statusText}`);
                responseText = data.choices?.[0]?.message?.content || "Błąd parsowania.";
            }

        } catch (error) {
            console.error(error);
            responseText = `⚠️ **Błąd API (${prov}):** ${error.message}\n\nUpewnij się, że wpisany klucz jest prawidłowy.`;
        }

        responseText = responseText.replace(/```python\n[\s\S]*?\n```/gi, '').trim();
        if(responseText === "") responseText = "Wybacz, wystąpił problem techniczny podczas przetwarzania Twojego zapytania. Spróbuj zadać je inaczej.";

        const extracted = podpowiadaczApp.extractCommands(responseText);
        podpowiadaczApp.isThinking = false;
        
        const newMsg = { role: 'assistant', text: extracted.cleanText, rawText: responseText };
        if (extracted.mapQuery) newMsg.mapQuery = extracted.mapQuery; 
        
        podpowiadaczApp.messages.push(newMsg);
        podpowiadaczApp.saveData();
        podpowiadaczApp.renderChat();
        
        const executeAllActions = () => { podpowiadaczApp.runCommands(extracted.commands); };

        if (podpowiadaczApp.settings.autoTTS) podpowiadaczApp.readText(null, extracted.cleanText, executeAllActions);
        else executeAllActions();
    }
};

document.addEventListener('input', function (e) {
    if (e.target.id === 'ai-chat-input') {
        e.target.style.height = '46px';
        e.target.style.height = (e.target.scrollHeight) + 'px';
        if (e.target.scrollHeight > 150) { e.target.style.overflowY = 'auto'; e.target.style.height = '150px'; } 
        else { e.target.style.overflowY = 'hidden'; }
    }
});

setTimeout(podpowiadaczApp.init, 500);