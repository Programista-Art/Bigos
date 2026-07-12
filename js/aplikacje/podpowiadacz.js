// ======================================================================
// PLIK: js/aplikacje/podpowiadacz.js (BigAI - Centrum Dowodzenia Systemem)
// ======================================================================

const MODELS_DB = {
    gemini_free: [
        { id: 'gemini-2.5-flash-preview-09-2025', name: 'Gemini 2.5 Flash (Darmowy)' }
    ],
    gemini_api: [
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Szybki)' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Mądry)' },
        { id: 'gemini-2.5-flash-preview-09-2025', name: 'Gemini 2.5 Flash (Najnowszy)' }
    ],
    openai: [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Szybki i tani)' },
        { id: 'gpt-4o', name: 'GPT-4o (Zaawansowany)' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Klasyk)' }
    ],
    groq: [
        { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B' },
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B versatile' },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Tani' },
        { id: 'groq/compound', name: 'Groq Compound (System)' },
        { id: 'groq/compound-mini', name: 'Groq Compound Mini' }
    ],
    openrouter: [
        { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Darmowy)' },
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
        { id: 'google/gemini-pro-1.5', name: 'Gemini 1.5 Pro' },
        { id: 'deepseek/deepseek-coder', name: 'DeepSeek Coder' }
    ]
};

// Baza Głosów dla Systemu TTS
const VOICES_DB = {
    native: [
        { id: '', name: 'Domyślny Systemowy' }
    ],
    openai: [
        { id: 'alloy', name: 'Alloy (Neutralny)' },
        { id: 'echo', name: 'Echo (Męski)' },
        { id: 'fable', name: 'Fable (Brytyjski)' },
        { id: 'onyx', name: 'Onyx (Głęboki męski)' },
        { id: 'nova', name: 'Nova (Żeński)' },
        { id: 'shimmer', name: 'Shimmer (Jasny żeński)' }
    ],
    elevenlabs: [
        { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Żeński - Domyślny)' },
        { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Męski)' },
        { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Męski - Narrator)' },
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (Żeński - Ciepły)' }
    ],
    cartesia: [
        { id: 'a0e99841-438c-4a64-b6a9-62f748e5b61a', name: 'Sonic (Męski Multilingual)' },
        { id: '694f9389-aac1-45b6-b726-9d9369183238', name: 'Barista (Żeński)' }
    ]
};

const podpowiadaczApp = {
    messages: [],
    isSidebarOpen: false,
    isThinking: false,
    
    // Zmienne do STT / Mikrofonu
    recognition: null, 
    mediaRecorder: null,
    audioChunks: [],
    isRecording: false,
    isListeningBackground: false,
    
    // Zmienne do TTS
    activeAudio: null, 
    currentTTSButton: null,
    
    // Baza sugestii komend (Autocomplete)
    suggestionsDB: [
        "Uruchom Kalkulator", "Uruchom Notatnik", "Uruchom Przeglądarkę", "Uruchom Kombinator", "Uruchom Aktówkę", "Uruchom Grajka",
        "Zamknij Kalkulator", "Zamknij Notatnik", "Zamknij Przeglądarkę", "Zamknij program",
        "Zmień tapetę na kosmos", "Zmień tapetę na abstrakcję", "Zmień tapetę na bigos",
        "Zmień motyw na ciemny", "Zmień motyw na jasny", "Zmień motyw na cyberpunk", "Zmień motyw na win11",
        "Znajdź w internecie ", "Otwórz plik ", "Pokaż mapę Krakowa", "Pokaż mapę Warszawy",
        "Oblicz w Rachmistrzu ", "Zagraj w kółko i krzyżyk", "Wyłącz system", "Formatuj system"
    ],

    settings: {
        provider: 'gemini_free',
        apiKey: '',
        model: 'gemini-2.5-flash-preview-09-2025',
        customModel: '',
        isCustomModel: false,
        
        ttsProvider: 'native', 
        ttsApiKey: '',
        ttsVoice: '',

        sttProvider: 'native',
        sttApiKey: '',
        sttModel: 'whisper-large-v3-turbo',
        
        autoTTS: false,       
        wakeWordActive: false 
    },

    init: () => {
        try {
            const savedSettings = localStorage.getItem('bigos_bigai_settings');
            if (savedSettings) podpowiadaczApp.settings = {...podpowiadaczApp.settings, ...JSON.parse(savedSettings)};
            
            const savedChat = localStorage.getItem('bigos_bigai_chat');
            if (savedChat) podpowiadaczApp.messages = JSON.parse(savedChat);
        } catch(e) {}

        if (podpowiadaczApp.messages.length === 0) {
            podpowiadaczApp.messages.push({
                role: 'assistant',
                text: 'Cześć! Jestem Twoim osobistym asystentem wbudowanym w **BigOS**. \n\nSpróbuj napisać lub powiedzieć:\n* *"Otwórz Kombinator i włącz ciemny motyw"* \n* *"Zmień tapetę na kosmos"*\n* *"Otwórz plik o nazwie BigOS"*\n\nW czym mogę pomóc?'
            });
        }

        podpowiadaczApp.initSpeechRecognition();
        podpowiadaczApp.upgradeUI();
        podpowiadaczApp.updateModelsDropdown();
        podpowiadaczApp.updateVoiceDropdown();
        podpowiadaczApp.changeSTTProvider();
        podpowiadaczApp.renderChat();
        
        // Renderujemy przesuwalny widget pulpitu
        podpowiadaczApp.renderWidget();
        
        if (podpowiadaczApp.settings.wakeWordActive) {
            podpowiadaczApp.startBackgroundListening();
        }
    },

    saveData: () => {
        localStorage.setItem('bigos_bigai_settings', JSON.stringify(podpowiadaczApp.settings));
        localStorage.setItem('bigos_bigai_chat', JSON.stringify(podpowiadaczApp.messages));
        podpowiadaczApp.renderWidget();
    },

    // ==================================================================
    // WIDGET NA PULPICIE (PRZESUWALNY)
    // ==================================================================
    renderWidget: () => {
        let w = document.getElementById('bigai-widget');
        if (!w) {
            w = document.createElement('div');
            w.id = 'bigai-widget';
            w.className = 'fixed z-[9990] g-panel border g-border rounded-full p-2 shadow-lg flex items-center gap-2 cursor-pointer transition-transform backdrop-blur-md themed-app overflow-hidden group select-none';
            
            let savedPos = { top: '20px', left: (window.innerWidth - 130) + 'px' };
            try {
                const p = localStorage.getItem('bigos_bigai_widget_pos');
                if (p) savedPos = JSON.parse(p);
            } catch(e) {}
            
            w.style.top = savedPos.top;
            w.style.left = savedPos.left;

            document.body.appendChild(w);

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
                    if (isDragging) {
                        localStorage.setItem('bigos_bigai_widget_pos', JSON.stringify({left: w.style.left, top: w.style.top}));
                    }
                };

                document.addEventListener('mousemove', move);
                document.addEventListener('mouseup', up);
            };

            w.ontouchstart = (e) => {
                if(e.target.tagName === 'BUTTON') return;
                let touch = e.touches[0];
                startX = touch.clientX; startY = touch.clientY;
                let rect = w.getBoundingClientRect();
                shiftX = startX - rect.left; shiftY = startY - rect.top;
                isDragging = false;
                w.style.transition = 'none';

                const move = (me) => {
                    isDragging = true;
                    let mTouch = me.touches[0];
                    w.style.left = (mTouch.clientX - shiftX) + 'px';
                    w.style.top = (mTouch.clientY - shiftY) + 'px';
                };

                const up = () => {
                    document.removeEventListener('touchmove', move);
                    document.removeEventListener('touchend', up);
                    w.style.transition = '';
                    if (isDragging) {
                        localStorage.setItem('bigos_bigai_widget_pos', JSON.stringify({left: w.style.left, top: w.style.top}));
                    }
                };

                document.addEventListener('touchmove', move, {passive: false});
                document.addEventListener('touchend', up);
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
            <!-- Tematyczny Pasek Tytułowy -->
            <div class="px-4 py-2 border-b g-border flex justify-between items-center cursor-move bg-black/30 shrink-0 relative z-[100] shadow-md" onmousedown="winManager.startDrag(event, 'app-podpowiadacz')" ontouchstart="winManager.startDrag(event, 'app-podpowiadacz')">
                <span class="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-md flex items-center gap-2">
                    <span class="text-white">🤖</span> BigAI - Centrum Dowodzenia
                </span>
                <div class="flex gap-2 items-center">
                    <button onclick="podpowiadaczApp.clearChat()" class="g-btn px-2 py-0.5 text-xs text-red-400 border-red-500/50 hover:bg-red-500 hover:text-white rounded transition shadow-sm font-bold flex items-center gap-1" title="Wyczyść całą historię czatu"><span>🗑️</span> <span class="hidden sm:inline">Wyczyść</span></button>
                    <button onclick="podpowiadaczApp.toggleSidebar()" class="g-btn px-2 py-0.5 text-xs text-blue-400 border-blue-500/50 hover:bg-blue-500 hover:text-white rounded transition shadow-sm font-bold flex items-center gap-1" title="Ustawienia Modeli i Głosu"><span>⚙️</span> <span class="hidden sm:inline">Ustawienia</span></button>
                    <div class="w-px h-4 bg-gray-600 mx-1 self-center"></div>
                    <button onclick="winManager.minimize('podpowiadacz')" class="g-icon-btn px-1 g-text transition">_</button>
                    <button onclick="winManager.maximize('app-podpowiadacz')" class="g-icon-btn px-1 g-text transition">□</button>
                    <button onclick="winManager.close('podpowiadacz')" class="text-red-500 hover:text-red-400 px-1 font-bold transition">✖</button>
                </div>
            </div>

            <div class="flex flex-row flex-grow overflow-hidden relative">
                
                <!-- LEWY PANEL: USTAWIENIA AI (Wysuwany) -->
                <div id="ai-sidebar" class="w-[280px] border-r g-border bg-black/40 flex flex-col p-4 shrink-0 transition-all duration-300 ${podpowiadaczApp.isSidebarOpen ? '' : '-ml-[280px]'} z-50 absolute h-full shadow-2xl backdrop-blur-xl overflow-y-auto custom-scrollbar">
                    
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
                                <!-- Wypełniane przez JS -->
                            </select>
                            <input type="text" id="ai-model-custom" placeholder="Wpisz ID modelu..." value="${podpowiadaczApp.settings.customModel}" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-xs font-mono mt-1 shadow-inner ${podpowiadaczApp.settings.isCustomModel ? '' : 'hidden'}" onchange="podpowiadaczApp.settings.customModel=this.value; podpowiadaczApp.saveData();">
                        </div>
                    </div>

                    <!-- ROZPOZNAWANIE MOWY STT -->
                    <h3 class="font-bold text-xs text-orange-400 uppercase tracking-widest mb-3 border-b g-border pb-1">Słuchanie (STT / Mikrofon)</h3>
                    <div class="flex flex-col gap-3 mb-4">
                        <div>
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Silnik Dyktowania</label>
                            <select id="stt-provider" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner" onchange="podpowiadaczApp.changeSTTProvider()">
                                <option value="native" ${podpowiadaczApp.settings.sttProvider==='native'?'selected':''}>Wbudowany (Przeglądarki)</option>
                                <option value="groq" ${podpowiadaczApp.settings.sttProvider==='groq'?'selected':''}>Groq (Whisper API - Najszybszy)</option>
                            </select>
                        </div>
                        <div id="stt-groq-settings" class="${podpowiadaczApp.settings.sttProvider==='groq' ? '' : 'hidden'}">
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Klucz API Groq</label>
                            <input type="password" id="stt-apikey" placeholder="gsk_..." value="${podpowiadaczApp.settings.sttApiKey}" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-xs font-mono shadow-inner mb-2" onchange="podpowiadaczApp.settings.sttApiKey=this.value; podpowiadaczApp.saveData();">
                            
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Model Whisper</label>
                            <select id="stt-model" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner" onchange="podpowiadaczApp.settings.sttModel=this.value; podpowiadaczApp.saveData();">
                                <option value="whisper-large-v3-turbo" ${podpowiadaczApp.settings.sttModel==='whisper-large-v3-turbo'?'selected':''}>Whisper Large V3 Turbo</option>
                                <option value="whisper-large-v3" ${podpowiadaczApp.settings.sttModel==='whisper-large-v3'?'selected':''}>Whisper Large V3 (Dokładniejszy)</option>
                            </select>
                        </div>
                        <div class="flex items-center gap-2 cursor-pointer group mt-1" onclick="const cb=document.getElementById('ai-set-wakeword'); cb.checked=!cb.checked; podpowiadaczApp.toggleWakeWord(cb.checked);">
                            <input type="checkbox" id="ai-set-wakeword" class="w-4 h-4 accent-red-500 cursor-pointer" ${podpowiadaczApp.settings.wakeWordActive ? 'checked' : ''} onclick="event.stopPropagation(); podpowiadaczApp.toggleWakeWord(this.checked);">
                            <label class="text-xs font-bold g-text group-hover:text-red-400 transition cursor-pointer">Nasłuchuj słowa w tle: <span class="text-blue-400 font-mono">"Bigos"</span></label>
                        </div>
                        <p class="text-[9px] g-text-muted leading-tight mt-1">Uwaga: Nasłuchiwanie w tle "Bigos" używa ZAWSZE darmowego, bezpiecznego silnika przeglądarki. Wybór Groq ma zastosowanie tylko dla ręcznego klikania w mikrofon.</p>
                    </div>

                    <h3 class="font-bold text-xs text-emerald-500 uppercase tracking-widest mb-3 border-b g-border pb-1">Czytanie Głosowe (TTS)</h3>
                    <div class="flex flex-col gap-3 mb-4">
                        <div>
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Dostawca Głosu</label>
                            <select id="tts-provider" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner" onchange="podpowiadaczApp.changeTTSProvider()">
                                <option value="native" ${podpowiadaczApp.settings.ttsProvider==='native'?'selected':''}>Wbudowany (Darmowy)</option>
                                <option value="openai" ${podpowiadaczApp.settings.ttsProvider==='openai'?'selected':''}>OpenAI (TTS-1)</option>
                                <option value="elevenlabs" ${podpowiadaczApp.settings.ttsProvider==='elevenlabs'?'selected':''}>ElevenLabs (Naturalny)</option>
                                <option value="cartesia" ${podpowiadaczApp.settings.ttsProvider==='cartesia'?'selected':''}>Cartesia (Szybki)</option>
                            </select>
                        </div>
                        <div id="tts-key-container" class="${podpowiadaczApp.settings.ttsProvider==='native' ? 'hidden' : ''}">
                            <label class="block text-[10px] font-bold g-text-muted mb-1" id="tts-key-lbl">Klucz API Głosu</label>
                            <input type="password" id="tts-apikey" placeholder="Wklej klucz API usługi głosowej" value="${podpowiadaczApp.settings.ttsApiKey}" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-xs font-mono shadow-inner mb-1" onchange="podpowiadaczApp.settings.ttsApiKey=this.value; podpowiadaczApp.saveData();">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Głos Asystenta</label>
                            <select id="tts-voice-select" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner" onchange="podpowiadaczApp.settings.ttsVoice=this.value; podpowiadaczApp.saveData();">
                                <!-- Wypełniane przez JS z bazy głosów -->
                            </select>
                        </div>
                        
                        <div class="border-t border-gray-500/20 my-1"></div>
                        
                        <div class="flex items-center gap-2 cursor-pointer group" onclick="const cb=document.getElementById('ai-set-autotts'); cb.checked=!cb.checked; podpowiadaczApp.settings.autoTTS=cb.checked; podpowiadaczApp.saveData();">
                            <input type="checkbox" id="ai-set-autotts" class="w-4 h-4 accent-emerald-500 cursor-pointer" ${podpowiadaczApp.settings.autoTTS ? 'checked' : ''} onclick="event.stopPropagation(); podpowiadaczApp.settings.autoTTS=this.checked; podpowiadaczApp.saveData();">
                            <label class="text-xs font-bold g-text group-hover:text-emerald-400 transition cursor-pointer">Automatyczne odczytywanie na głos</label>
                        </div>
                    </div>
                    
                    <div class="mt-auto flex flex-col gap-2 pt-4 border-t g-border">
                        <button onclick="podpowiadaczApp.saveData(); if(typeof apps !== 'undefined') apps.showToast('Ustawienia', 'Zapisano pomyślnie.', 'success');" class="w-full g-btn px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-500 hover:text-white border-blue-500/50 rounded-lg transition font-bold text-xs shadow-md">
                            💾 Zapisz Ustawienia
                        </button>
                        <button onclick="podpowiadaczApp.toggleSidebar()" class="w-full g-btn px-4 py-2 bg-black/20 text-gray-300 hover:bg-white/10 rounded-lg transition font-bold text-xs">
                            ◀ Ukryj Panel
                        </button>
                    </div>
                </div>

                <!-- GŁÓWNE OKNO CHATU -->
                <div class="flex-grow flex flex-col bg-black/10 relative transition-all duration-300 ${podpowiadaczApp.isSidebarOpen ? 'ml-[280px]' : 'ml-0'}">
                    
                    <div id="ai-chat-container" class="flex-grow overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4 select-text cursor-auto" style="user-select: text; -webkit-user-select: text;">
                        <!-- Wiadomości -->
                    </div>

                    <div class="p-3 bg-black/20 border-t g-border shrink-0 flex flex-col gap-2">
                        <!-- Podpowiedzi (Autocomplete) -->
                        <div id="ai-suggestions" class="flex gap-2 overflow-x-auto custom-scrollbar hidden pb-1 scroll-smooth"></div>
                        
                        <div class="w-full relative flex items-end gap-2">
                            <div class="flex-grow relative flex items-center">
                                <textarea id="ai-chat-input" rows="1" placeholder="Napisz polecenie lub kliknij mikrofon..." class="w-full bg-white/5 dark:bg-black/40 border g-border rounded-xl pl-4 pr-12 py-3 text-sm g-text outline-none focus:border-blue-500 transition-colors custom-scrollbar resize-none h-[46px] shadow-inner leading-tight" onkeydown="podpowiadaczApp.handleInput(event)" oninput="podpowiadaczApp.showSuggestions(this.value)"></textarea>
                                <button onclick="podpowiadaczApp.toggleDictation()" id="ai-mic-btn" class="absolute right-2 bottom-1.5 text-gray-400 hover:text-blue-400 transition p-2 rounded-full flex items-center justify-center text-lg h-8 w-8" title="Ręczne Dyktowanie Głosowe">🎤</button>
                            </div>
                            <button onclick="podpowiadaczApp.sendMessage()" class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl w-14 h-[46px] flex items-center justify-center text-xl shadow-lg transition-transform hover:scale-105 active:scale-95 shrink-0 mb-0">
                                ↑
                            </button>
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
        
        if (query.length < 2) {
            container.classList.add('hidden');
            container.innerHTML = '';
            return;
        }
        
        // Dopasowujemy jeśli wpisany tekst zawiera się gdzieś w sugestii (ignorując wielkość liter)
        const matches = podpowiadaczApp.suggestionsDB.filter(s => s.toLowerCase().startsWith(query) && s.toLowerCase() !== query);
        
        if (matches.length > 0) {
            container.innerHTML = matches.slice(0, 5).map(m => 
                `<button class="g-btn text-[10px] px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-300 border-blue-500/50 hover:bg-blue-500 hover:text-white whitespace-nowrap shadow-sm transition-transform hover:scale-105" onclick="podpowiadaczApp.useSuggestion('${m}')">${m}</button>`
            ).join('');
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
            container.innerHTML = '';
        }
    },

    useSuggestion: (val) => {
        const input = document.getElementById('ai-chat-input');
        if (input) {
            input.value = val + ' ';
            input.focus();
            podpowiadaczApp.showSuggestions(input.value);
            // Auto expand textarea height
            input.style.height = '46px';
            input.style.height = (input.scrollHeight) + 'px';
        }
    },

    // ==================================================================
    // USTAWIENIA I MODELE
    // ==================================================================
    toggleSidebar: () => {
        podpowiadaczApp.isSidebarOpen = !podpowiadaczApp.isSidebarOpen;
        podpowiadaczApp.upgradeUI();
        podpowiadaczApp.updateModelsDropdown();
        podpowiadaczApp.updateVoiceDropdown();
        podpowiadaczApp.changeSTTProvider();
        podpowiadaczApp.renderChat();
    },

    changeProvider: () => {
        const prov = document.getElementById('ai-provider').value;
        podpowiadaczApp.settings.provider = prov;
        
        const keyCont = document.getElementById('ai-key-container');

        if (prov === 'gemini_free') {
            keyCont.classList.add('opacity-30', 'pointer-events-none');
        } else {
            keyCont.classList.remove('opacity-30', 'pointer-events-none');
        }
        
        podpowiadaczApp.settings.model = MODELS_DB[prov] ? MODELS_DB[prov][0].id : '';
        podpowiadaczApp.settings.isCustomModel = false;
        
        podpowiadaczApp.updateModelsDropdown();
        podpowiadaczApp.saveData();
    },

    updateModelsDropdown: () => {
        const sel = document.getElementById('ai-model-select');
        const custInp = document.getElementById('ai-model-custom');
        if(!sel || !custInp) return;

        const prov = podpowiadaczApp.settings.provider;
        const models = MODELS_DB[prov] || [];
        
        sel.innerHTML = '';
        models.forEach(m => {
            sel.innerHTML += `<option value="${m.id}" ${podpowiadaczApp.settings.model === m.id && !podpowiadaczApp.settings.isCustomModel ? 'selected' : ''}>${m.name}</option>`;
        });
        sel.innerHTML += `<option value="custom_mode" ${podpowiadaczApp.settings.isCustomModel ? 'selected' : ''}>⚙️ Wpisz własny model...</option>`;

        if (podpowiadaczApp.settings.isCustomModel) custInp.classList.remove('hidden');
        else custInp.classList.add('hidden');
    },

    changeModelSelect: () => {
        const sel = document.getElementById('ai-model-select');
        const custInp = document.getElementById('ai-model-custom');
        
        if (sel.value === 'custom_mode') {
            podpowiadaczApp.settings.isCustomModel = true;
            custInp.classList.remove('hidden');
            podpowiadaczApp.settings.model = custInp.value; 
        } else {
            podpowiadaczApp.settings.isCustomModel = false;
            custInp.classList.add('hidden');
            podpowiadaczApp.settings.model = sel.value;
        }
        podpowiadaczApp.saveData();
    },

    changeTTSProvider: () => {
        const prov = document.getElementById('tts-provider').value;
        podpowiadaczApp.settings.ttsProvider = prov;
        
        const keyCont = document.getElementById('tts-key-container');
        if (prov === 'native') keyCont.classList.add('hidden');
        else {
            keyCont.classList.remove('hidden');
            document.getElementById('tts-key-lbl').innerText = `Klucz API dla ${prov.toUpperCase()}`;
        }
        
        podpowiadaczApp.settings.ttsVoice = VOICES_DB[prov] ? VOICES_DB[prov][0].id : '';
        
        podpowiadaczApp.updateVoiceDropdown();
        podpowiadaczApp.saveData();
    },

    changeSTTProvider: () => {
        const prov = document.getElementById('stt-provider')?.value || podpowiadaczApp.settings.sttProvider;
        podpowiadaczApp.settings.sttProvider = prov;
        
        const setDiv = document.getElementById('stt-groq-settings');
        if (setDiv) {
            if (prov === 'groq') setDiv.classList.remove('hidden');
            else setDiv.classList.add('hidden');
        }
        podpowiadaczApp.saveData();
    },
    
    updateVoiceDropdown: () => {
        const sel = document.getElementById('tts-voice-select');
        if(!sel) return;
        
        const prov = podpowiadaczApp.settings.ttsProvider;
        const voices = VOICES_DB[prov] || [];
        
        sel.innerHTML = '';
        voices.forEach(v => {
            sel.innerHTML += `<option value="${v.id}" ${podpowiadaczApp.settings.ttsVoice === v.id ? 'selected' : ''}>${v.name}</option>`;
        });
    },
    
    toggleWakeWord: (isActive) => {
        podpowiadaczApp.settings.wakeWordActive = isActive;
        podpowiadaczApp.saveData();
        
        if (isActive) {
            podpowiadaczApp.startBackgroundListening();
            if(typeof apps !== 'undefined') apps.showToast('Agent Nasłuchuje', 'Powiedz "Bigos" w dowolnym momencie by wywołać asystenta.', 'success');
        } else {
            if (podpowiadaczApp.recognition) {
                try { podpowiadaczApp.recognition.stop(); } catch(e){}
            }
            podpowiadaczApp.isListeningBackground = false;
            podpowiadaczApp.renderWidget();
        }
    },

    // ==================================================================
    // MOWA: SPEECH-TO-TEXT (Nasłuchiwanie w tle i ręczne WebSpeech / Groq Whisper)
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
                let interimTranscript = '';
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                    else interimTranscript += event.results[i][0].transcript;
                }
                
                if (finalTranscript) {
                    const lowerTrans = finalTranscript.toLowerCase().trim();
                    
                    if (podpowiadaczApp.settings.wakeWordActive) {
                        const wakeWords = ["bigos", "hej bigos", "bigosie"];
                        let triggered = false;
                        let command = "";
                        
                        for (let w of wakeWords) {
                            let idx = lowerTrans.indexOf(w);
                            if (idx !== -1) {
                                triggered = true;
                                command = lowerTrans.substring(idx + w.length).trim();
                                command = command.replace(/^[,.!?-]\s*/, '').trim();
                                break;
                            }
                        }
                        
                        if (triggered) {
                            if (command.length > 2) {
                                if(typeof winManager !== 'undefined') winManager.open('podpowiadacz');
                                if(typeof apps !== 'undefined') apps.showToast('Zrozumiałem', `Rozkaz: ${command}`, 'success');
                                const input = document.getElementById('ai-chat-input');
                                if (input) {
                                    input.value = command;
                                    podpowiadaczApp.showSuggestions(command);
                                }
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
                    setTimeout(() => {
                        if (podpowiadaczApp.settings.wakeWordActive) {
                            try { podpowiadaczApp.recognition.start(); } catch(e){}
                        }
                    }, 500);
                } else if (podpowiadaczApp.settings.sttProvider === 'native') {
                    const btn = document.getElementById('ai-mic-btn');
                    if(btn) { btn.classList.remove('text-red-500', 'animate-pulse'); btn.innerText = '🎤'; }
                    podpowiadaczApp.isListeningBackground = false;
                    podpowiadaczApp.renderWidget();
                }
            };
            
            podpowiadaczApp.recognition.onerror = (e) => {
                if (!podpowiadaczApp.settings.wakeWordActive && podpowiadaczApp.settings.sttProvider === 'native') {
                    if(typeof apps !== 'undefined') apps.showToast('Błąd Mikrofonu', 'Nie udało się nasłuchiwać: ' + e.error, 'error');
                    const btn = document.getElementById('ai-mic-btn');
                    if(btn) { btn.classList.remove('text-red-500', 'animate-pulse'); btn.innerText = '🎤'; }
                }
            };
        } else {
            console.warn("Speech Recognition API nie jest obsługiwane w tej przeglądarce.");
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
                podpowiadaczApp.isRecording = false;
                btn.classList.remove('text-red-500', 'animate-pulse');
                btn.innerText = '⏳';
            } else {
                if (podpowiadaczApp.settings.wakeWordActive) {
                    podpowiadaczApp.toggleWakeWord(false);
                    const cb = document.getElementById('ai-set-wakeword');
                    if(cb) cb.checked = false;
                }

                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    podpowiadaczApp.mediaRecorder = new MediaRecorder(stream);
                    podpowiadaczApp.audioChunks = [];

                    podpowiadaczApp.mediaRecorder.ondataavailable = e => {
                        if (e.data.size > 0) podpowiadaczApp.audioChunks.push(e.data);
                    };

                    podpowiadaczApp.mediaRecorder.onstop = async () => {
                        const audioBlob = new Blob(podpowiadaczApp.audioChunks, { type: 'audio/webm' });
                        podpowiadaczApp.audioChunks = [];
                        stream.getTracks().forEach(track => track.stop()); 

                        const apiKey = podpowiadaczApp.settings.sttApiKey;
                        if (!apiKey) {
                            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Wprowadź w ustawieniach klucz API dla Groq STT!', 'error');
                            btn.innerText = '🎤';
                            return;
                        }

                        const formData = new FormData();
                        formData.append('file', new File([audioBlob], 'recording.webm', { type: 'audio/webm' }));
                        formData.append('model', podpowiadaczApp.settings.sttModel || 'whisper-large-v3-turbo');
                        formData.append('language', 'pl'); 

                        try {
                            const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${apiKey}` },
                                body: formData
                            });

                            const data = await response.json();
                            
                            if (!response.ok) {
                                throw new Error(data.error?.message || response.statusText);
                            }

                            const transcript = data.text;

                            if (transcript) {
                                const input = document.getElementById('ai-chat-input');
                                if (input) {
                                    input.value = (input.value + ' ' + transcript).trim();
                                    input.style.height = (input.scrollHeight) + 'px';
                                    podpowiadaczApp.showSuggestions(input.value);
                                }
                            }
                        } catch (error) {
                            console.error(error);
                            if(typeof apps !== 'undefined') apps.showToast('Błąd STT Groq', error.message, 'error');
                        } finally {
                            btn.innerText = '🎤';
                        }
                    };

                    podpowiadaczApp.mediaRecorder.start();
                    podpowiadaczApp.isRecording = true;
                    btn.classList.add('text-red-500', 'animate-pulse');
                    btn.innerText = '🔴';
                } catch (e) {
                    if(typeof apps !== 'undefined') apps.showToast('Błąd Mikrofonu', 'Nie można uzyskać dostępu do mikrofonu (Sprawdź uprawnienia w przeglądarce).', 'error');
                }
            }
            return;
        }

        if (!podpowiadaczApp.recognition) {
            if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Przeglądarka nie obsługuje darmowego dyktowania (Web Speech API).', 'error');
            return;
        }
        
        if (podpowiadaczApp.settings.wakeWordActive) {
            podpowiadaczApp.toggleWakeWord(false);
            const cb = document.getElementById('ai-set-wakeword');
            if(cb) cb.checked = false;
        }

        const btn = document.getElementById('ai-mic-btn');
        if (btn.classList.contains('text-red-500')) {
            podpowiadaczApp.recognition.stop();
        } else {
            try { podpowiadaczApp.recognition.start(); } catch(e){}
        }
    },

    // ==================================================================
    // MOWA: TEXT-TO-SPEECH (Czytanie odpowiedzi i Ręczne Zatrzymanie)
    // ==================================================================
    stopTTS: () => {
        if (podpowiadaczApp.activeAudio) { 
            podpowiadaczApp.activeAudio.pause(); 
            podpowiadaczApp.activeAudio = null; 
        }
        window.speechSynthesis.cancel(); 
        
        if (podpowiadaczApp.currentTTSButton) {
            podpowiadaczApp.currentTTSButton.innerHTML = '🔊 Czytaj';
            podpowiadaczApp.currentTTSButton.classList.remove('animate-pulse', 'text-red-400', 'border-red-500/30');
            podpowiadaczApp.currentTTSButton.dataset.playing = 'false';
            podpowiadaczApp.currentTTSButton = null;
        }
    },

    readText: async (buttonEl, text) => {
        // Jeśli kliknięto w ten sam przycisk, który właśnie odtwarza - wyłączamy mowę
        if (buttonEl && buttonEl.dataset.playing === 'true') {
            podpowiadaczApp.stopTTS();
            return;
        }

        podpowiadaczApp.stopTTS();

        const cleanText = text.replace(/\[BIGOS:.*?\]/g, '').replace(/[\*\_`#]/g, '').trim();
        if(!cleanText) return;

        if (buttonEl) {
            buttonEl.innerHTML = '🛑 Zatrzymaj';
            buttonEl.classList.add('animate-pulse', 'text-red-400', 'border-red-500/30');
            buttonEl.dataset.playing = 'true';
            podpowiadaczApp.currentTTSButton = buttonEl;
        }

        const prov = podpowiadaczApp.settings.ttsProvider;
        const key = podpowiadaczApp.settings.ttsApiKey;
        const voice = podpowiadaczApp.settings.ttsVoice;

        const finalizeBtn = () => { 
            podpowiadaczApp.stopTTS(); // Funkcja sama resetuje UI przycisku
        };

        if (prov === 'native') {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'pl-PL';
            utterance.onend = finalizeBtn;
            utterance.onerror = finalizeBtn;
            window.speechSynthesis.speak(utterance);
            
            // Bezpiecznik: jeśli po upływie czasu native API zablokuje zdarzenie (zdarza się to w Chrome)
            const estimatedTime = (cleanText.length / 10) * 1000; // Ok. 10 znaków na sek.
            setTimeout(finalizeBtn, estimatedTime + 2000); 
        } 
        else if (prov === 'openai') {
            if(!key) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Brak klucza API dla OpenAI TTS!', 'error'); finalizeBtn(); return; }
            try {
                const response = await fetch('https://api.openai.com/v1/audio/speech', {
                    method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: 'tts-1', input: cleanText, voice: voice || 'alloy' })
                });
                if(!response.ok) throw new Error();
                const blob = await response.blob();
                const audio = new Audio(URL.createObjectURL(blob));
                audio.onended = finalizeBtn;
                audio.play();
                podpowiadaczApp.activeAudio = audio;
            } catch(e) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Nie udało się pobrać głosu OpenAI', 'error'); finalizeBtn(); }
        }
        else if (prov === 'elevenlabs') {
            if(!key) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Brak klucza API dla ElevenLabs!', 'error'); finalizeBtn(); return; }
            const vId = voice || '21m00Tcm4TlvDq8ikWAM'; 
            try {
                const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vId}`, {
                    method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: cleanText, model_id: "eleven_multilingual_v2" })
                });
                if(!response.ok) throw new Error();
                const blob = await response.blob();
                const audio = new Audio(URL.createObjectURL(blob));
                audio.onended = finalizeBtn;
                audio.play();
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
                const blob = await response.blob();
                const audio = new Audio(URL.createObjectURL(blob));
                audio.onended = finalizeBtn;
                audio.play();
                podpowiadaczApp.activeAudio = audio;
            } catch(e) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Nie udało się pobrać głosu Cartesia', 'error'); finalizeBtn(); }
        }
    },

    // ==================================================================
    // 🗺️ MAPY LEAFLET W CHACIE
    // ==================================================================
    renderMapWidget: async (containerId, locationName) => {
        const container = document.getElementById(containerId);
        if(!container) return;

        container.innerHTML = `<div class="p-4 text-center font-bold text-xs g-text-muted animate-pulse">Ładowanie mapy: ${locationName}...</div>`;

        if (!window.L) {
            const css = document.createElement('link');
            css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(css);
            
            await new Promise(resolve => {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`);
            const data = await res.json();
            
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                
                container.innerHTML = '';
                container.style.height = '250px';
                container.className = 'w-full rounded-xl overflow-hidden shadow-inner border g-border mt-2 z-0 relative'; 

                const map = L.map(containerId).setView([lat, lon], 12);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap'
                }).addTo(map);

                L.marker([lat, lon]).addTo(map)
                    .bindPopup(`<b>${desktop.escapeHTML(locationName)}</b><br>${data[0].display_name.split(',')[0]}`)
                    .openPopup();
            } else {
                container.innerHTML = `<div class="p-4 text-center font-bold text-xs text-red-400 border border-red-500/30 rounded-xl bg-red-500/10 mt-2">Nie znaleziono lokalizacji: ${locationName}</div>`;
            }
        } catch(e) {
            container.innerHTML = `<div class="p-4 text-center font-bold text-xs text-red-400 border border-red-500/30 rounded-xl bg-red-500/10 mt-2">Błąd pobierania mapy.</div>`;
        }
    },


    // ==================================================================
    // RENDEROWANIE CZATU
    // ==================================================================
    formatMarkdown: (text, msgId) => {
        if (!text) return '';
        let html = typeof desktop !== 'undefined' ? desktop.escapeHTML(text) : text;
        
        html = html.replace(/\[BIGOS:(.*?):(.*?)\]/g, '');

        html = html.replace(/\*\*(.*?)\*\*/g, '<b class="g-text">$1</b>');
        html = html.replace(/\*(.*?)\*/g, '<i class="g-text-muted">$1</i>');
        
        html = html.replace(/^\* (.*?)$/gm, '<li class="ml-4 list-disc">$1</li>');
        html = html.replace(/^- (.*?)$/gm, '<li class="ml-4 list-disc">$1</li>');

        html = html.replace(/```(.*?)[\n\r]([\s\S]*?)```/g, function(match, lang, code) {
            return `<div class="my-2 rounded-lg border g-border overflow-hidden shadow-sm">
                        <div class="bg-black/60 px-3 py-1 text-[10px] g-text-muted uppercase tracking-wider flex justify-between items-center">
                            <span>${lang || 'CODE'}</span>
                            <button class="hover:text-white" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText); apps.showToast('Skopiowano', 'Kod skopiowany', 'success')">📋 Kopiuj</button>
                        </div>
                        <pre class="p-3 bg-[#0d1117] text-gray-300 font-mono text-xs overflow-x-auto m-0 leading-relaxed">${code}</pre>
                    </div>`;
        });
        
        html = html.replace(/`(.*?)`/g, '<code class="bg-black/30 text-blue-300 px-1 py-0.5 rounded font-mono text-xs border g-border">$1</code>');
        
        html = html.replace(/<div id="map-(.*?)"><\/div>/g, '<div id="map-$1" class="w-full mt-2 bg-black/20 rounded-xl border g-border overflow-hidden"></div>');

        html = html.replace(/\n/g, '<br>');
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
            el.style.userSelect = "text";
            el.style.webkitUserSelect = "text";
            
            let formattedHtml = podpowiadaczApp.formatMarkdown(msg.text, idx);
            
            let ttsButton = isUser ? '' : `<button data-playing="false" class="text-[10px] g-text-muted hover:text-emerald-400 font-bold tracking-wider uppercase flex items-center gap-1 bg-black/10 px-2 py-0.5 rounded border border-transparent hover:border-emerald-500/30 transition" onclick="podpowiadaczApp.readText(this, \`${typeof desktop !== 'undefined' ? desktop.escapeHTML(msg.text).replace(/`/g, "'") : msg.text.replace(/`/g, "'")}\`)">🔊 Czytaj</button>`;

            el.innerHTML = `
                <div class="flex items-center justify-between mb-2 border-b border-white/10 pb-1 w-full opacity-70">
                    <div class="flex items-center gap-2">
                        <span class="text-lg leading-none">${icon}</span>
                        <span class="text-[10px] font-bold uppercase tracking-wider">${senderName}</span>
                    </div>
                    ${ttsButton}
                </div>
                <div class="w-full break-words space-y-2 font-sans">
                    ${formattedHtml}
                </div>
            `;
            chatBox.appendChild(el);

            if (msg.mapQuery) {
                const mapDivId = `map-m${idx}`;
                const mapContainer = document.createElement('div');
                mapContainer.id = mapDivId;
                el.querySelector('.font-sans').appendChild(mapContainer);
                setTimeout(() => podpowiadaczApp.renderMapWidget(mapDivId, msg.mapQuery), 100);
            }
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
            podpowiadaczApp.stopTTS(); // Bezpieczne wyciszenie podczas resetu
            podpowiadaczApp.messages = [];
            podpowiadaczApp.init(); 
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
    // INTEGRACJA Z SYSTEMEM (Interpreter Poleceń)
    // ==================================================================
    executeSystemCommands: (aiText) => {
        let cleanText = aiText;
        let commandFound = false;
        let mapQuery = null;

        const regex = /\[BIGOS:([^:\]]+):([^\]]+)\]/g;
        let match;

        while ((match = regex.exec(aiText)) !== null) {
            commandFound = true;
            const action = match[1].toLowerCase().trim();
            const param = match[2].trim();

            console.log("BigAI Command Executed:", action, param);

            try {
                if (action === 'open_app') {
                    const appId = param.toLowerCase();
                    if (appId === 'bigcut' && typeof BigCut !== 'undefined' && BigCut.init) BigCut.init();
                    if(typeof winManager !== 'undefined') winManager.open(appId);
                } 
                else if (action === 'close_app') {
                    if(typeof winManager !== 'undefined') winManager.close(param.toLowerCase());
                }
                else if (action === 'open_file') {
                    if(typeof fileSystem !== 'undefined') {
                        const file = fileSystem.find(f => f.name.toLowerCase().includes(param.toLowerCase()));
                        if(file) {
                            if (typeof desktop !== 'undefined') desktop.executeItem(file);
                            if(typeof apps !== 'undefined') apps.showToast('BigAI', 'Otwarto plik: ' + file.name, 'success');
                        } else {
                            if(typeof apps !== 'undefined') apps.showToast('BigAI', 'Nie znaleziono pliku: ' + param, 'error');
                        }
                    }
                }
                else if (action === 'set_theme') {
                    if(typeof themeManager !== 'undefined') themeManager.applyTheme(param);
                    else if(typeof apps !== 'undefined') apps.setTheme(param);
                } 
                else if (action === 'set_wallpaper') {
                    const bg = document.getElementById('desktop-bg');
                    let url = param;
                    if(param === 'kosmos') url = 'tapety/kosmos.webp';
                    if(param === 'bigos') url = 'tapety/bigos.webp';
                    if(param === 'ferrari') url = 'tapety/ferrari.webp';
                    if(param === 'abstrakcja') url = 'tapety/abstrakcja.webp';
                    
                    if (bg) { bg.style.backgroundImage = `url('${url}')`; bg.classList.add('custom-wp'); }
                    localStorage.setItem('bigos_bg', url); 
                }
                else if (action === 'search_browser') {
                    if(typeof winManager !== 'undefined') winManager.open('siecioslaw');
                    if(typeof siecioslawApp !== 'undefined') siecioslawApp.navigateURL('https://www.bing.com/search?q=' + encodeURIComponent(param));
                }
                else if (action === 'map') {
                    mapQuery = param;
                }
                else if (action === 'notify') {
                    if(typeof apps !== 'undefined') apps.showToast('BigAI', param, 'success');
                }
                else if (action === 'write_skryba') {
                    if(typeof winManager !== 'undefined') winManager.open('skryba');
                    if(typeof skrybaApp !== 'undefined') {
                        const ed = document.getElementById('skryba-editor');
                        if (ed) {
                            ed.innerHTML += (ed.innerHTML ? '<br>' : '') + param;
                        }
                    }
                }
                else if (action === 'calc_rachmistrz') {
                    if(typeof winManager !== 'undefined') winManager.open('kalkulator');
                    if(typeof kalkulatorApp !== 'undefined') {
                        kalkulatorApp.expr = param;
                        kalkulatorApp.calculate();
                    }
                }
                else if (action === 'save_file') {
                    let parts = param.split('|');
                    let name = parts[0];
                    let content = parts.slice(1).join('|');
                    
                    if(typeof fileSystem !== 'undefined' && typeof fsManager !== 'undefined') {
                        let type = 'file'; let icon = '📄';
                        let lowerName = name.toLowerCase();
                        if (lowerName.endsWith('.jpg') || lowerName.endsWith('.png') || lowerName.endsWith('.webp')) {
                            type = 'image'; icon = '🖼️';
                        }
                        
                        fileSystem.push({
                            id: 'file_' + Date.now(), type: type, name: name, icon: icon, content: content, parentId: 'root', x: 50, y: 50
                        });
                        fsManager.save();
                        if(typeof desktop !== 'undefined') desktop.render();
                        if(typeof apps !== 'undefined') apps.showToast('Zapisano', `Plik ${name} został zapisany na Pulpicie!`, 'success');
                    }
                }
                else if (action === 'music_ctrl') {
                    if(typeof winManager !== 'undefined') winManager.open('grajek');
                    if(typeof grajekApp !== 'undefined') {
                        if (param === 'playpause') grajekApp.togglePlay();
                        else if (param === 'next') grajekApp.next();
                        else if (param === 'prev') grajekApp.prev();
                    }
                }
                else if (action === 'music_seek') {
                    if(typeof winManager !== 'undefined') winManager.open('grajek');
                    if(typeof grajekApp !== 'undefined' && grajekApp.grajekAudio) {
                        grajekApp.grajekAudio.currentTime = parseFloat(param);
                    }
                }
                else if (action === 'format_system') {
                    if(typeof apps !== 'undefined') apps.formatSystem();
                }
                else if (action === 'shutdown_system') {
                    if(typeof apps !== 'undefined') apps.shutdownSystem();
                }
            } catch(e) {
                console.error("Failed to execute BigOS command:", e);
            }
        }

        cleanText = cleanText.replace(/\[BIGOS:(.*?):(.*?)\]/g, '').trim();
        
        return { cleanText, commandFound, mapQuery };
    },

    // ==================================================================
    // GŁÓWNA LOGIKA WYSYŁANIA WIADOMOŚCI
    // ==================================================================
    sendMessage: async (commandOverride) => {
        const input = document.getElementById('ai-chat-input');
        const suggestionsContainer = document.getElementById('ai-suggestions');
        
        if (suggestionsContainer) {
            suggestionsContainer.classList.add('hidden');
            suggestionsContainer.innerHTML = '';
        }
        
        let userText = "";
        if (commandOverride && typeof commandOverride === 'string') {
            userText = commandOverride.trim();
        } else if (input) {
            userText = input.value.trim();
        }
        
        if (!userText) return;

        if (input) {
            input.value = '';
            input.style.height = '46px'; 
        }

        podpowiadaczApp.messages.push({ role: 'user', text: userText });
        podpowiadaczApp.isThinking = true;
        podpowiadaczApp.renderChat();
        podpowiadaczApp.saveData();

        // -------------------------------------------------------------
        // BUDOWA SYSTEM PROMPTU
        // -------------------------------------------------------------
        const systemPrompt = `Jesteś "BigAI" - główną sztuczną inteligencją systemu operacyjnego BigOS. Oprócz rozmowy, masz władzę nad komputerem użytkownika. Mów po polsku. Bądź krótki i pomocny. Formatuj kod w znacznikach Markdown.
Jeśli użytkownik prosi Cię o czynność systemową, MUSISZ użyć w swojej odpowiedzi specjalnych tagów. Zostaną one ukryte przed użytkownikiem i wykonane w tle.

Dostępne akcje systemowe:
1. Otwieranie aplikacji: [BIGOS:open_app:ID]
   Lista ID: skryba (Notatnik), szkicownik (Grafika/Paint), aktowka (Pliki), patrzalka (Zdjęcia), grajacz (Wideo), siecioslaw (Przeglądarka), wladca (Terminal), kalkulator (Rachmistrz), tapeciak (Kombinator/Ustawienia systemu/Tapety), grajek (Muzyka/Audio), nadzorca (Menedżer Zadań), pogodynka (Pogoda), czasomierz (Stoper), pelzacz (Snake), tank (Czołgi), murarz (Arkanoid), ufoludki (Space Invaders), odbijanka (Pong), trzepotek (Flappy), scigacz (Wyścigi), bombiarz (Bomberman), kolko (Kółko i Krzyżyk), powitanie (Start), tabelarz (Arkusz), zadaniowiec (Kanban), wasm (Gry 3D/Silnik), rachmistrz-kodu (Programista), kasiarz (Finansowy/Kredyty), przelicznik (Jednostki), kompresor (Upychacz ZIP), bigcut (Edytor Wideo).
2. Zamykanie aplikacji: [BIGOS:close_app:ID] (Użyj ID z listy powyżej).
3. Otwieranie plików: [BIGOS:open_file:NAZWA_LUB_FRAGMENT] - wyszukuje i otwiera plik z dysku BigOS.
4. Zmiana motywu: [BIGOS:set_theme:MOTYW] (np. theme-dark, theme-light, theme-amber, theme-nord, theme-matrix, theme-cyberpunk, ui-win11, ui-macos, ui-glassmorphism).
5. Zmiana tapety: [BIGOS:set_wallpaper:URL] (Słowa kluczowe: kosmos, bigos, abstrakcja, ferrari).
6. Przeglądarka internetowa: [BIGOS:search_browser:ZAPYTANIE] - otwiera Sieciosława (lub w nim szuka).
7. Mapy: [BIGOS:map:MIASTO_LUB_MIEJSCE] - Wyświetla interaktywną mapę satelitarną w oknie czatu.
8. Wpisz tekst do Notatnika: [BIGOS:write_skryba:TEKST] - dopisuje podany tekst do edytora Skryba.
9. Zapisz plik na Pulpicie: [BIGOS:save_file:NAZWA.EXT|ZAWARTOSC] - użyj pionowej kreski do oddzielenia nazwy od zawartości.
10. Obliczenia: [BIGOS:calc_rachmistrz:WZÓR] - otwiera Rachmistrza i wpisuje działanie (np. 1500*0.23).
11. Sterowanie muzyką (Grajek): [BIGOS:music_ctrl:playpause] lub [BIGOS:music_ctrl:next] lub [BIGOS:music_ctrl:prev].
12. Przewijanie muzyki (Grajek): [BIGOS:music_seek:SEKUNDY]
13. Formatowanie systemu: [BIGOS:format_system:none] - wywołuje okno formatowania systemu do ustawień fabrycznych.
14. Wyłączanie systemu: [BIGOS:shutdown_system:none] - natychmiastowo wyłącza system BigOS.

PRZYKŁADY:
User: "Uruchom mi kalkulator i włącz ciemny tryb."
AI: "Jasne, odpalam Rachmistrza w ciemnym motywie! [BIGOS:open_app:kalkulator] [BIGOS:set_theme:theme-dark]"

User: "Otwórz ustawienia systemu (Kombinator)."
AI: "Otwieram panel ustawień! [BIGOS:open_app:tapeciak]"

User: "Wyłącz system BigOS."
AI: "Dobrze, zamykam system. Do zobaczenia! [BIGOS:shutdown_system:none]"

User: "Otwórz zdjęcie z wakacji"
AI: "Już szukam i otwieram: [BIGOS:open_file:wakacj]"

Zawsze upewnij się, że używasz dokładnych tagów podanych w instrukcji.`;

        // -------------------------------------------------------------
        // ŁĄCZENIE Z API ZALEŻNIE OD WYBORU UŻYTKOWNIKA
        // -------------------------------------------------------------
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
                        if (lastMsg.role === role) {
                            lastMsg.parts[0].text += "\n\n" + text;
                        } else {
                            geminiContents.push({ role: role, parts: [{ text: text }] });
                        }
                    }
                }
                
                if (geminiContents.length === 0) {
                    geminiContents.push({ role: 'user', parts: [{ text: 'Cześć' }]});
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
                            responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Brak odpowiedzi od Gemini.";
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
                            ...podpowiadaczApp.messages.slice(-8).map(m => ({ role: m.role, content: m.rawText || m.text }))
                        ]
                    })
                });
                const data = await response.json();
                if(!response.ok) {
                    const errorMsg = data.error?.message || response.statusText;
                    throw new Error(`OpenRouter: ${errorMsg}`);
                }
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
                            ...podpowiadaczApp.messages.slice(-8).map(m => ({ role: m.role, content: m.rawText || m.text }))
                        ]
                    })
                });
                const data = await response.json();
                if(!response.ok) {
                    const errorMsg = data.error?.message || response.statusText;
                    throw new Error(`OpenAI: ${errorMsg}`);
                }
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
                            ...podpowiadaczApp.messages.slice(-8).map(m => ({ role: m.role, content: m.rawText || m.text }))
                        ]
                    })
                });
                const data = await response.json();
                if(!response.ok) {
                    const errorMsg = data.error?.message || response.statusText;
                    throw new Error(`Groq: ${errorMsg}`);
                }
                responseText = data.choices?.[0]?.message?.content || "Błąd parsowania.";
            }

        } catch (error) {
            console.error(error);
            responseText = `⚠️ **Błąd API (${prov}):** ${error.message}\n\nUpewnij się, że wpisany klucz jest prawidłowy. Jeśli używasz OpenRouter z kontem 0$, upewnij się, że wybierasz darmowe modele (z dopiskiem :free) i Twoje konto jest zweryfikowane.`;
        }

        const execResult = podpowiadaczApp.executeSystemCommands(responseText);

        podpowiadaczApp.isThinking = false;
        
        const newMsg = { role: 'assistant', text: execResult.cleanText, rawText: responseText };
        if (execResult.mapQuery) newMsg.mapQuery = execResult.mapQuery; 
        
        podpowiadaczApp.messages.push(newMsg);
        
        podpowiadaczApp.saveData();
        podpowiadaczApp.renderChat();
        
        if (podpowiadaczApp.settings.autoTTS) {
            podpowiadaczApp.readText(null, execResult.cleanText);
        }
    }
};

document.addEventListener('input', function (e) {
    if (e.target.id === 'ai-chat-input') {
        e.target.style.height = '46px';
        e.target.style.height = (e.target.scrollHeight) + 'px';
        if (e.target.scrollHeight > 150) {
            e.target.style.overflowY = 'auto';
            e.target.style.height = '150px';
        } else {
            e.target.style.overflowY = 'hidden';
        }
    }
});

setTimeout(podpowiadaczApp.init, 500);