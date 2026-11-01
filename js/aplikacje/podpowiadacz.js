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
            const slot = (typeof desktop !== 'undefined' && desktop.findFreeSlot) ? desktop.findFreeSlot() : { x: 20, y: 20 };
            fileSystem.push({
                id: 'app_' + config.id, type: 'app', name: config.name, icon: config.icon, appId: config.id,
                parentId: 'root', x: slot.x, y: slot.y
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

const SERVICE_TIERS_DB = [
    { id: 'standard', name: 'Standard (Domyślny)' },
    { id: 'fast', name: 'Fast (Szybki priorytet)' },
    { id: 'ultrafast', name: 'UltraFast (Ultraszybki)' }
];

const MODELS_DB = {
    simulated: [
        { id: 'simulated-echo', name: 'Symulator Systemowy BigAI (Offline 2026)' },
        { id: 'bigai-local-orchestrator-2026', name: 'BigAI Core 2026 (Lokalny Zarządca Systemu)' }
    ],
    gemini_api: [
        { id: 'gemini-4-argon', name: 'Gemini 4 Argon (Flagowy Ultra)' },
        { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Szybki Multimodalny)' },
        { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash' },
        { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite (Ultraszybki)' },
        { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro (Flagowy 2026)' },
        { id: 'gemini-3.1-flash', name: 'Gemini 3.1 Flash' },
        { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Deep Think)' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }
    ],
    openai: [
        { id: 'gpt-6-astra', name: 'GPT-6 Astra (Standard / Fast / UltraFast)', tiers: ['standard', 'fast', 'ultrafast'] },
        { id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol (Standard / Fast / UltraFast)', tiers: ['standard', 'fast', 'ultrafast'] },
        { id: 'gpt-6.1-terra', name: 'GPT-6.1 Terra (Standard / Fast / UltraFast)', tiers: ['standard', 'fast', 'ultrafast'] },
        { id: 'gpt-6-luna', name: 'GPT-6 Luna (Standard / Fast)', tiers: ['standard', 'fast'] },
        { id: 'gpt-6-sol', name: 'GPT-6 Sol (Standard / Fast)', tiers: ['standard', 'fast'] },
        { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol (Standard / Fast)', tiers: ['standard', 'fast'] },
        { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra (Standard / Fast)', tiers: ['standard', 'fast'] },
        { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna (Standard / Fast)', tiers: ['standard', 'fast'] },
        { id: 'gpt-5.6-nano', name: 'GPT-5.6 Nano (Standard / Fast)', tiers: ['standard', 'fast'] },
        { id: 'gpt-5.5', name: 'GPT-5.5 (Standard / Fast)', tiers: ['standard', 'fast'] },
        { id: 'gpt-5.4', name: 'GPT-5.4 (Standard / Fast)', tiers: ['standard', 'fast'] },
        { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini (Standard / Fast)', tiers: ['standard', 'fast'] },
        { id: 'gpt-5-nano', name: 'GPT-5 Nano', tiers: ['standard', 'fast'] },
        { id: 'o3', name: 'OpenAI o3 (Reasoning Pro)', tiers: ['standard', 'fast'] },
        { id: 'o4-mini', name: 'OpenAI o4-mini (Reasoning Fast)', tiers: ['standard', 'fast'] },
        { id: 'gpt-4.1', name: 'GPT-4.1', tiers: ['standard', 'fast'] },
        { id: 'gpt-4o', name: 'GPT-4o Omni', tiers: ['standard', 'fast'] }
    ],
    anthropic: [
        { id: 'claude-fable-5-1', name: 'Claude Fable 5.1' },
        { id: 'claude-opus-5-5', name: 'Claude Opus 5.5' },
        { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5' },
        { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5' }
    ],
    xai: [
        { id: 'grok-4', name: 'Grok 4 (Flagowy 2026)' },
        { id: 'grok-4-mini', name: 'Grok 4 Mini (Reasoning 2026)' },
        { id: 'grok-3', name: 'Grok 3' }
    ],
    deepseek: [
        { id: 'deepseek-v3.2', name: 'DeepSeek V3.2 (Chat 2026)' },
        { id: 'deepseek-r2', name: 'DeepSeek R2 (Reasoning 2026)' },
        { id: 'deepseek-r1', name: 'DeepSeek R1' }
    ],
    groq: [
        { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B-128E (2026)' },
        { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B-16E (2026)' },
        { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill Llama 70B' },
        { id: 'qwen-qwq-32b', name: 'Qwen QwQ 32B (Reasoning)' },
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' }
    ],
    openrouter: [
        { id: 'google/gemini-4-argon', name: 'Gemini 4 Argon (OpenRouter 2026)' },
        { id: 'anthropic/claude-fable-5-1', name: 'Claude Fable 5.1 (OpenRouter 2026)' },
        { id: 'anthropic/claude-opus-5-5', name: 'Claude Opus 5.5 (OpenRouter 2026)' },
        { id: 'anthropic/claude-sonnet-5-5', name: 'Claude Sonnet 5.5 (OpenRouter 2026)' },
        { id: 'anthropic/claude-haiku-5-5', name: 'Claude Haiku 5.5 (OpenRouter 2026)' },
        { id: 'openai/gpt-6-astra', name: 'GPT-6 Astra (OpenRouter 2026)' },
        { id: 'deepseek/deepseek-r2:free', name: 'DeepSeek R2 (Darmowy OpenRouter)' },
        { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Darmowy OpenRouter)' },
        { id: 'meta-llama/llama-4-maverick:free', name: 'Llama 4 Maverick (Darmowy OpenRouter)' },
        { id: 'qwen/qwen3-235b-a22b:free', name: 'Qwen 3 235B (Darmowy OpenRouter)' },
        { id: 'mistralai/mistral-large-2512', name: 'Mistral Large 3 (2026)' }
    ]
};

const STT_ENGINES_DB = {
    native: [
        { id: 'web-speech-2026-pl', name: 'Web Speech API 2026 (Wbudowany PL/Multi)' }
    ],
    gemini_stt: [
        { id: 'gemini-3.1-flash', name: 'Gemini 3.1 Flash Audio STT (2026)' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash Native Audio' }
    ],
    openai: [
        { id: 'gpt-4o-transcribe', name: 'GPT-4o Transcribe (2026 HD)' },
        { id: 'gpt-4o-mini-transcribe', name: 'GPT-4o Mini Transcribe (Szybki 2026)' },
        { id: 'whisper-1', name: 'OpenAI Whisper V3' }
    ],
    groq: [
        { id: 'whisper-large-v3-turbo', name: 'Whisper Large v3 Turbo (LPU 2026)' },
        { id: 'whisper-large-v3', name: 'Whisper Large v3 (Dokładny)' },
        { id: 'distil-whisper-large-v3-en', name: 'Distil-Whisper Large v3' }
    ],
    elevenlabs_stt: [
        { id: 'scribe_v2', name: 'ElevenLabs Scribe v2 (2026 Ultra)' },
        { id: 'scribe_v1', name: 'ElevenLabs Scribe v1' }
    ],
    deepgram: [
        { id: 'nova-3', name: 'Deepgram Nova-3 Multilingual (2026)' },
        { id: 'nova-2', name: 'Deepgram Nova-2' }
    ]
};

const VOICES_DB = {
    native: [
        { id: '', name: 'Domyślny Systemowy (PL 2026)' },
        { id: 'pl-PL-Marek', name: 'Marek Naturalny (PL 2026)' },
        { id: 'pl-PL-Zofia', name: 'Zofia Naturalna (PL 2026)' }
    ],
    gemini: [
        { id: 'Kore', name: 'Kore (Stanowczy / Profesjonalny 2026)' },
        { id: 'Aoede', name: 'Aoede (Przyjazny / Naturalny 2026)' },
        { id: 'Puck', name: 'Puck (Energiczny / Szybki 2026)' },
        { id: 'Fenrir', name: 'Fenrir (Dynamiczny / Wyrazisty 2026)' },
        { id: 'Charon', name: 'Charon (Głęboki / Spokojny 2026)' },
        { id: 'Leda', name: 'Leda (Ciepły / Narracyjny 2026)' },
        { id: 'Orus', name: 'Orus (Analityczny / Czysty 2026)' },
        { id: 'Zephyr', name: 'Zephyr (Lekki / Asystencki 2026)' }
    ],
    openai: [
        { id: 'coral', name: 'Coral (Ekspresyjny 2026)' },
        { id: 'sage', name: 'Sage (Spokojny Ekspert 2026)' },
        { id: 'ash', name: 'Ash (Naturalny Męski 2026)' },
        { id: 'ballad', name: 'Ballad (Narracyjny 2026)' },
        { id: 'verse', name: 'Verse (Dynamiczny 2026)' },
        { id: 'nova', name: 'Nova (Energiczny Żeński)' },
        { id: 'alloy', name: 'Alloy (Neutralny)' },
        { id: 'onyx', name: 'Onyx (Głęboki Męski)' },
        { id: 'shimmer', name: 'Shimmer (Czysty Żeński)' },
        { id: 'echo', name: 'Echo (Miękki)' }
    ],
    elevenlabs: [
        { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Klasyczny Żeński v3 2026)' },
        { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria (Ekspresyjny v3 2026)' },
        { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger (Konwersacyjny v3 2026)' },
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (Profesjonalny v3 2026)' },
        { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura (Naturalny Multi 2026)' },
        { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie (Energiczny 2026)' },
        { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George (Ciepły Narrator)' },
        { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Głęboki Męski)' },
        { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Przyjazny)' }
    ],
    cartesia: [
        { id: '79a125e8-cd45-4c13-8a67-188112f4dd22', name: 'Sonic-2 Maja (Polski Żeński 2026)' },
        { id: 'a0e99841-438c-4a64-b679-ae501e7d6091', name: 'Sonic-2 Jakub (Polski Męski 2026)' },
        { id: '694f9389-aac1-45b6-b726-9d9369183238', name: 'Sonic-2 Astra (Asystent AI 2026)' }
    ]
};

const IMAGE_GENERATORS_DB = [
    { id: 'nano-banana-2.1', name: 'Gemini Nano Banana 2.1', provider: 'gemini', badge: 'Nano Banana 2.1' },
    { id: 'nano-banana-pro', name: 'Gemini Nano Banana Pro', provider: 'gemini', badge: 'Nano Banana Pro' },
    { id: 'nano-banana-2-lite', name: 'Gemini Nano Banana 2 lite', provider: 'gemini', badge: 'Nano Banana 2 lite' },
    { id: 'flux-3', name: 'FLUX 3 (Generator zdjęć)', provider: 'flux', badge: 'FLUX 3' }
];

const VIDEO_GENERATORS_DB = [
    { id: 'omni-1.1-flash', name: 'Gemini Omni 1.1 Flash', provider: 'gemini', badge: 'Omni 1.1 Flash' },
    { id: 'veo-3.1-lite', name: 'Gemini Veo 3.1-lite', provider: 'gemini', badge: 'Veo 3.1-lite' },
    { id: 'veo-3.1-fast', name: 'Gemini Veo 3.1 -fast', provider: 'gemini', badge: 'Veo 3.1 -fast' },
    { id: 'veo-3.1-quality', name: 'Gemini Veo3.1- Quality', provider: 'gemini', badge: 'Veo3.1- Quality' },
    { id: 'flux-3-video', name: 'FLUX 3 (Generator wideo)', provider: 'flux', badge: 'FLUX 3 Video' }
];

const podpowiadaczApp = {
    messages: [], isSidebarOpen: false, isThinking: false,
    currentAbortController: null,
    recognition: null, mediaRecorder: null, audioChunks: [], isRecording: false, isListeningBackground: false,
    activeAudio: null, currentTTSButton: null, pendingActionCallback: null,
    dictateToSkrybaMode: false,

    suggestionsDB: [
        "Uruchom Kalkulator",
        "Otwórz Skrybę i zapisz notatkę: Spotkanie jutro o 14:00",
        "Wyszukaj w przeglądarce Sieciosław najnowsze wiadomości technologiczne",
        "Otwórz grafikę w Patrzałce",
        "Zamknij aplikację Kalkulator",
        "Stwórz folder Projekty 2026",
        "Utwórz plik plan.txt z treścią Lista zadań na dziś",
        "Wygeneruj zdjęcie cyberpunkowego miasta nocą w Nano Banana Pro",
        "Wygeneruj wideo lotu nad górami w Veo 3.1 -fast",
        "Wygeneruj zdjęcie futurystycznego lasu w FLUX 3",
        "Zmień tapetę na kosmos",
        "Zmień motyw na ciemny",
        "Napisz aplikację kalkulator walut"
    ],

    settings: {
        provider: 'gemini_api', apiKey: '', model: 'gemini-4-argon', serviceTier: 'standard', customModel: '', isCustomModel: false,
        ttsProvider: 'native', ttsApiKey: '', ttsVoice: '',
        sttProvider: 'native', sttApiKey: '', sttModel: 'web-speech-2026-pl',
        imageModel: 'nano-banana-2.1', videoModel: 'veo-3.1-fast', fluxApiKey: '',
        autoTTS: false, wakeWordActive: false, dictateToSkryba: false
    },

    init: async () => {
        try {
            const savedSettings = await bigosDB.get('bigos_bigai_settings');
            if (savedSettings) {
                let parsedSettings = typeof savedSettings === 'string' ? JSON.parse(savedSettings) : savedSettings;
                podpowiadaczApp.settings = {...podpowiadaczApp.settings, ...parsedSettings};
            }
            // Migracja usuniętego dostawcy gemini_free
            if (podpowiadaczApp.settings.provider === 'gemini_free' || !MODELS_DB[podpowiadaczApp.settings.provider]) {
                podpowiadaczApp.settings.provider = podpowiadaczApp.settings.apiKey ? 'gemini_api' : 'gemini_api';
                podpowiadaczApp.settings.model = MODELS_DB.gemini_api[0].id;
            }
            if (!podpowiadaczApp.settings.isCustomModel && MODELS_DB[podpowiadaczApp.settings.provider] && !MODELS_DB[podpowiadaczApp.settings.provider].some(m => m.id === podpowiadaczApp.settings.model)) {
                podpowiadaczApp.settings.model = MODELS_DB[podpowiadaczApp.settings.provider][0].id;
            }
            if (!SERVICE_TIERS_DB.some(t => t.id === podpowiadaczApp.settings.serviceTier)) {
                podpowiadaczApp.settings.serviceTier = 'standard';
            }
            if (!STT_ENGINES_DB[podpowiadaczApp.settings.sttProvider]) {
                podpowiadaczApp.settings.sttProvider = 'native';
                podpowiadaczApp.settings.sttModel = STT_ENGINES_DB.native[0].id;
            }
            if (!VOICES_DB[podpowiadaczApp.settings.ttsProvider]) {
                podpowiadaczApp.settings.ttsProvider = 'native';
                podpowiadaczApp.settings.ttsVoice = '';
            }
            if (!IMAGE_GENERATORS_DB.some(g => g.id === podpowiadaczApp.settings.imageModel)) {
                podpowiadaczApp.settings.imageModel = 'nano-banana-2.1';
            }
            if (!VIDEO_GENERATORS_DB.some(g => g.id === podpowiadaczApp.settings.videoModel)) {
                podpowiadaczApp.settings.videoModel = 'veo-3.1-fast';
            }
            const savedChat = await bigosDB.get('bigos_bigai_chat');
            if (savedChat) podpowiadaczApp.messages = typeof savedChat === 'string' ? JSON.parse(savedChat) : savedChat;
        } catch(e) {}

        if (podpowiadaczApp.messages.length === 0) {
            podpowiadaczApp.messages.push({
                role: 'assistant',
                text: 'Cześć! Jestem **BigAI 2026** — głównym zarządcą systemu **BigOS**.\n\nMogę dla Ciebie:\n* 🚀 **Otwierać i zamykać aplikacje** (np. *"Otwórz Kalkulator"*, *"Zamknij Skrybę"*)\n* 🌐 **Wyszukiwać w przeglądarce Sieciosław** (np. *"Wyszukaj w Sieciosławiu kurs bitcoina"*)\n* 📝 **Otwierać Skrybę i zapisywać podyktowane notatki** (np. *"Otwórz Skrybę i zapisz: spotkanie o 15:00"* lub przycisk **📝 Dyktuj do Skryby**)\n* 🖼️ **Otwierać grafiki w Patrzałce** oraz **tworzyć pliki i foldery** na pulpicie\n* 🎨 **Generować zdjęcia i wideo** (**Gemini Nano Banana 2.1 / Pro / 2 lite**, **Omni 1.1 Flash**, **Veo 3.1-lite / -fast / Quality**, **FLUX 3**)\n* 💻 **Tworzyć i instalować nowe aplikacje** dla BigOS\n\nW czym mogę Ci dzisiaj pomóc?'
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
        // Installed packages run ONLY inside sandboxed frames — never as host scripts.
        setTimeout(() => {
            if (typeof fileSystem !== 'undefined' && !window._bigosInstalledAppsBooted) {
                window._bigosInstalledAppsBooted = true;
                // Prefer the package store (authoritative). Legacy script blobs
                // are migrated into packages once, then launched via the sandbox.
                (async () => {
                    try {
                        if (typeof bigosSandbox !== 'undefined' && bigosSandbox.launchPackage && typeof bigosDB !== 'undefined' && bigosDB.listPackages) {
                            const pkgs = await bigosDB.listPackages();
                            for (const pkg of pkgs || []) {
                                if (!pkg || !pkg.id) continue;
                                // Register a launcher entry; do NOT auto-mount every app at boot.
                                if (typeof defaultApps !== 'undefined' && !defaultApps.find(a => a.appId === pkg.id)) {
                                    defaultApps.push({ id: 'app_' + pkg.id, type: 'app', name: pkg.name, icon: pkg.icon, appId: pkg.id });
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Błąd ładowania aplikacji z systemu:', e);
                    }
                })();
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

        document.getElementById('ai-install-confirm').onclick = async () => {
            const finalName = document.getElementById('ai-install-name').value || defaultName;
            const finalIcon = document.getElementById('ai-install-icon').value || defaultIcon;

            // Zastępujemy dane w kodzie źródłowym
            if (nameMatch) code = code.replace(nameMatch[0], `name: '${finalName}'`);
            if (iconMatch) code = code.replace(iconMatch[0], `icon: '${finalIcon}'`);

            modal.remove();

            try {
                // Route through the isolated package pipeline — NEVER inject
                // untrusted code as an executable host <script>.
                if (typeof bigosSandbox === 'undefined' || !bigosSandbox.installPackage) {
                    throw new Error('Moduł izolacji aplikacji niedostępny — instalacja odrzucona');
                }
                const record = await bigosSandbox.installPackage(code, { source: 'bigai' });
                if (!record || !record.id) throw new Error('Instalacja pakietu nie powiodła się');

                // Visual registration (desktop icon + start menu) after durable persist.
                if (typeof defaultApps !== 'undefined' && !defaultApps.find(a => a.appId === record.id)) {
                    defaultApps.push({ id: 'app_' + record.id, type: 'app', name: record.name, icon: record.icon, appId: record.id });
                }
                if (typeof fileSystem !== 'undefined' && !fileSystem.find(f => f.appId === record.id)) {
                    fileSystem.push({
                        id: 'app_' + record.id, type: 'app', name: record.name, icon: record.icon,
                        appId: record.id, parentId: 'root', x: 30, y: 30
                    });
                    if (typeof fsManager !== 'undefined') await fsManager.save();
                    if (typeof desktop !== 'undefined') desktop.render();
                }

                if(typeof apps !== 'undefined') apps.showToast('Zainstalowano', 'Aplikacja pomyślnie dodana do systemu!', 'success');
            } catch(e) {
                console.error("Błąd instalacji:", e);
                // System autodetekcji błędu dla użytkownika
                if(typeof apps !== 'undefined') apps.showToast('Błąd instalacji', 'Kod jest uszkodzony lub niebezpieczny! Użyj przycisku "Popraw kod", aby AI naprawiło błąd.', 'error');
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

        const targetW = typeof window !== 'undefined' && window.innerWidth ? Math.min(1180, Math.max(760, window.innerWidth - 24)) : 1180;
        const targetH = typeof window !== 'undefined' && window.innerHeight ? Math.min(760, Math.max(540, window.innerHeight - 68)) : 760;

        appWindow.dataset.prefW = '1180px';
        appWindow.dataset.prefH = '760px';
        appWindow.style.width = targetW + 'px';
        appWindow.style.height = targetH + 'px';
        appWindow.style.background = 'transparent';
        appWindow.style.border = 'none';
        appWindow.style.boxShadow = 'none';

        try {
            if (typeof localStorage !== 'undefined') {
                const savedGeomRaw = localStorage.getItem('bigos_win_pos_podpowiadacz');
                if (savedGeomRaw) {
                    const savedGeom = JSON.parse(savedGeomRaw);
                    const savedW = parseInt(savedGeom.width, 10) || 0;
                    if (savedW > 0 && savedW < 1100 && !savedGeom.userResized) {
                        localStorage.removeItem('bigos_win_pos_podpowiadacz');
                        if (typeof window !== 'undefined' && window.innerWidth) {
                            appWindow.style.left = Math.max(12, Math.round((window.innerWidth - targetW) / 2)) + 'px';
                            appWindow.style.top = Math.max(12, Math.round((window.innerHeight - 48 - targetH) / 2)) + 'px';
                        }
                    }
                }
            }
        } catch (e) {}

        const titleBar = appWindow.querySelector('.title-bar');
        Array.from(appWindow.children).forEach(child => { if (child !== titleBar) child.remove(); });
        if(titleBar) titleBar.style.display = 'none';

        const proUI = document.createElement('div');
        proUI.className = 'flex flex-col overflow-hidden relative themed-app g-panel rounded-lg shadow-2xl h-full w-full';

        proUI.innerHTML = `
            <div class="px-4 py-2.5 border-b g-border flex justify-between items-center gap-3 cursor-move bg-black/30 shrink-0 relative z-[100] shadow-md" onmousedown="winManager.startDrag(event, 'app-podpowiadacz')" ontouchstart="winManager.startDrag(event, 'app-podpowiadacz')">
                <span class="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-md flex items-center gap-2 whitespace-nowrap shrink-0">
                    <span class="text-white">🤖</span> BigAI 2026 - Centrum Dowodzenia Systemem
                </span>
                <div class="flex gap-1.5 items-center shrink-0">
                    <button onclick="podpowiadaczApp.openMediaStudioModal('image')" class="g-btn px-2.5 py-1 text-xs text-pink-400 border-pink-500/50 hover:bg-pink-500 hover:text-white rounded transition shadow-sm font-bold flex items-center gap-1 whitespace-nowrap shrink-0" title="Generator zdjęć (Nano Banana / FLUX 3)"><span>🖼️</span> <span>Zdjęcie</span></button>
                    <button onclick="podpowiadaczApp.openMediaStudioModal('video')" class="g-btn px-2.5 py-1 text-xs text-purple-400 border-purple-500/50 hover:bg-purple-500 hover:text-white rounded transition shadow-sm font-bold flex items-center gap-1 whitespace-nowrap shrink-0" title="Generator wideo (Omni 1.1 Flash / Veo 3.1 / FLUX 3)"><span>🎬</span> <span>Wideo</span></button>
                    <button onclick="podpowiadaczApp.toggleSkrybaDictationMode()" id="ai-skryba-dictate-btn" class="g-btn px-2.5 py-1 text-xs ${podpowiadaczApp.settings.dictateToSkryba ? 'bg-emerald-600 text-white border-emerald-400' : 'text-emerald-400 border-emerald-500/50'} hover:bg-emerald-500 hover:text-white rounded transition shadow-sm font-bold flex items-center gap-1 whitespace-nowrap shrink-0" title="Dyktuj głosowo bezpośrednio do programu Skryba"><span>📝</span> <span>Dyktuj do Skryby</span></button>
                    <button onclick="podpowiadaczApp.stopTTS()" class="g-btn px-2.5 py-1 text-xs text-orange-400 border-orange-500/50 hover:bg-orange-500 hover:text-white rounded transition shadow-sm font-bold flex items-center gap-1 whitespace-nowrap shrink-0" title="Zatrzymaj czytanie na głos"><span>🛑</span> <span>Cisza</span></button>
                    <button onclick="podpowiadaczApp.clearChat()" class="g-btn px-2.5 py-1 text-xs text-red-400 border-red-500/50 hover:bg-red-500 hover:text-white rounded transition shadow-sm font-bold flex items-center gap-1 whitespace-nowrap shrink-0" title="Wyczyść całą historię czatu"><span>🗑️</span> <span>Wyczyść</span></button>
                    <button onclick="podpowiadaczApp.toggleSidebar()" class="g-btn px-2.5 py-1 text-xs text-blue-400 border-blue-500/50 hover:bg-blue-500 hover:text-white rounded transition shadow-sm font-bold flex items-center gap-1 whitespace-nowrap shrink-0" title="Ustawienia Modeli, Generatorów i Głosu"><span>⚙️</span> <span>Ustawienia</span></button>
                    <div class="w-px h-4 bg-gray-600 mx-1 self-center shrink-0"></div>
                    <button onclick="winManager.minimize('podpowiadacz')" class="g-icon-btn px-1.5 g-text transition shrink-0">_</button>
                    <button onclick="winManager.maximize('app-podpowiadacz')" class="g-icon-btn px-1.5 g-text transition shrink-0">□</button>
                    <button onclick="winManager.close('podpowiadacz')" class="text-red-500 hover:text-red-400 px-1.5 font-bold transition shrink-0">✖</button>
                </div>
            </div>

            <div class="flex flex-row flex-grow overflow-hidden relative">
                
                <div id="ai-sidebar" style="width: 340px; margin-left: ${podpowiadaczApp.isSidebarOpen ? '0px' : '-340px'};" class="w-[340px] border-r g-border bg-black/40 flex flex-col p-4 shrink-0 transition-all duration-300 z-50 relative h-full shadow-2xl backdrop-blur-xl overflow-y-auto custom-scrollbar">
                    
                    <h3 class="font-bold text-xs g-accent uppercase tracking-widest mb-3 border-b g-border pb-1">Dostawca Czat AI (2026)</h3>
                    <div class="flex flex-col gap-3 mb-4">
                        <div>
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Silnik Główny</label>
                            <select id="ai-provider" class="w-full p-2.5 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner" onchange="podpowiadaczApp.changeProvider()">
                                <option value="gemini_api" ${podpowiadaczApp.settings.provider==='gemini_api'?'selected':''}>Google Gemini API (Gemini 4 / 3.8 / 3.6)</option>
                                <option value="openai" ${podpowiadaczApp.settings.provider==='openai'?'selected':''}>OpenAI (GPT-6 / GPT-6.1 / GPT-5.6)</option>
                                <option value="anthropic" ${podpowiadaczApp.settings.provider==='anthropic'?'selected':''}>Anthropic (Claude Fable 5.1 / 5.5)</option>
                                <option value="xai" ${podpowiadaczApp.settings.provider==='xai'?'selected':''}>xAI (Grok 4)</option>
                                <option value="deepseek" ${podpowiadaczApp.settings.provider==='deepseek'?'selected':''}>DeepSeek (V3.2 / R2)</option>
                                <option value="groq" ${podpowiadaczApp.settings.provider==='groq'?'selected':''}>Groq LPU (Llama 4)</option>
                                <option value="openrouter" ${podpowiadaczApp.settings.provider==='openrouter'?'selected':''}>OpenRouter (Multi-Model 2026)</option>
                                <option value="simulated" ${podpowiadaczApp.settings.provider==='simulated'?'selected':''}>Lokalny Zarządca Systemu (Offline)</option>
                            </select>
                        </div>
                        
                        <div id="ai-key-container" class="${podpowiadaczApp.settings.provider==='simulated' ? 'opacity-30 pointer-events-none' : ''}">
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Klucz API do Chatbota</label>
                            <input type="password" id="ai-apikey" placeholder="Wklej klucz (AIza..., sk-..., gsk_...)" value="${podpowiadaczApp.settings.apiKey}" class="w-full p-2.5 rounded g-bg g-text border g-border outline-none text-xs font-mono shadow-inner" onchange="podpowiadaczApp.settings.apiKey=this.value; podpowiadaczApp.saveData();">
                        </div>

                        <div>
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Model Językowy (2026)</label>
                            <select id="ai-model-select" class="w-full p-2.5 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner" onchange="podpowiadaczApp.changeModelSelect()">
                            </select>
                            <input type="text" id="ai-model-custom" placeholder="Wpisz ID modelu..." value="${podpowiadaczApp.settings.customModel}" class="w-full p-2.5 rounded g-bg g-text border g-border outline-none text-xs font-mono mt-1 shadow-inner ${podpowiadaczApp.settings.isCustomModel ? '' : 'hidden'}" onchange="podpowiadaczApp.settings.customModel=this.value; podpowiadaczApp.saveData();">
                        </div>

                        <div id="ai-service-tier-container" class="${podpowiadaczApp.settings.provider==='openai' ? '' : 'hidden'}">
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Service Tier (Tryb Szybkości)</label>
                            <select id="ai-service-tier" class="w-full p-2.5 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner" onchange="podpowiadaczApp.changeServiceTier()">
                            </select>
                        </div>
                    </div>

                    <h3 class="font-bold text-xs text-pink-400 uppercase tracking-widest mb-3 border-b g-border pb-1">Generatory Zdjęć i Wideo</h3>
                    <div class="flex flex-col gap-3 mb-4">
                        <div>
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Generator Zdjęć (Gemini / FLUX 3)</label>
                            <select id="ai-image-model" class="w-full p-2.5 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner" onchange="podpowiadaczApp.settings.imageModel=this.value; podpowiadaczApp.saveData();">
                                ${IMAGE_GENERATORS_DB.map(g => `<option value="${g.id}" ${podpowiadaczApp.settings.imageModel===g.id?'selected':''}>${g.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Generator Wideo (Omni / Veo 3.1 / FLUX 3)</label>
                            <select id="ai-video-model" class="w-full p-2.5 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner" onchange="podpowiadaczApp.settings.videoModel=this.value; podpowiadaczApp.saveData();">
                                ${VIDEO_GENERATORS_DB.map(g => `<option value="${g.id}" ${podpowiadaczApp.settings.videoModel===g.id?'selected':''}>${g.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Klucz API Mediów / FLUX 3 (Opcjonalny)</label>
                            <input type="password" id="flux-apikey" placeholder="Domyślnie klucz Gemini lub klucz FLUX..." value="${podpowiadaczApp.settings.fluxApiKey || ''}" class="w-full p-2.5 rounded g-bg g-text border g-border outline-none text-xs font-mono shadow-inner" onchange="podpowiadaczApp.settings.fluxApiKey=this.value; podpowiadaczApp.saveData();">
                        </div>
                    </div>

                    <h3 class="font-bold text-xs text-orange-400 uppercase tracking-widest mb-3 border-b g-border pb-1">Słuchanie i Dyktowanie (STT 2026)</h3>
                    <div class="flex flex-col gap-3 mb-4">
                        <div>
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Silnik Dyktowania (2026)</label>
                            <select id="stt-provider" class="w-full p-2.5 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner" onchange="podpowiadaczApp.changeSTTProvider()">
                                <option value="native" ${podpowiadaczApp.settings.sttProvider==='native'?'selected':''}>Web Speech API 2026 (Wbudowany)</option>
                                <option value="gemini_stt" ${podpowiadaczApp.settings.sttProvider==='gemini_stt'?'selected':''}>Google Gemini Audio STT (2026)</option>
                                <option value="openai" ${podpowiadaczApp.settings.sttProvider==='openai'?'selected':''}>OpenAI GPT-4o Transcribe (2026)</option>
                                <option value="groq" ${podpowiadaczApp.settings.sttProvider==='groq'?'selected':''}>Groq Whisper v3 Turbo (LPU)</option>
                                <option value="elevenlabs_stt" ${podpowiadaczApp.settings.sttProvider==='elevenlabs_stt'?'selected':''}>ElevenLabs Scribe v2 (2026)</option>
                                <option value="deepgram" ${podpowiadaczApp.settings.sttProvider==='deepgram'?'selected':''}>Deepgram Nova-3 (2026)</option>
                            </select>
                        </div>
                        <div id="stt-groq-settings" class="${podpowiadaczApp.settings.sttProvider==='native' ? 'hidden' : ''}">
                            <label class="block text-[10px] font-bold g-text-muted mb-1" id="stt-key-lbl">Klucz API STT</label>
                            <input type="password" id="stt-apikey" placeholder="Klucz API (lub pusty = użyj głównego)" value="${podpowiadaczApp.settings.sttApiKey}" class="w-full p-2.5 rounded g-bg g-text border g-border outline-none text-xs font-mono shadow-inner mb-2" onchange="podpowiadaczApp.settings.sttApiKey=this.value; podpowiadaczApp.saveData();">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Model Rozpoznawania Mowy</label>
                            <select id="stt-model" class="w-full p-2.5 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner" onchange="podpowiadaczApp.settings.sttModel=this.value; podpowiadaczApp.saveData();">
                            </select>
                        </div>
                        <div class="flex items-center gap-2 cursor-pointer group mt-1" onclick="const cb=document.getElementById('ai-set-skryba-stt'); cb.checked=!cb.checked; podpowiadaczApp.toggleSkrybaDictationMode(cb.checked);">
                            <input type="checkbox" id="ai-set-skryba-stt" class="w-4 h-4 accent-emerald-500 cursor-pointer" ${podpowiadaczApp.settings.dictateToSkryba ? 'checked' : ''} onclick="event.stopPropagation(); podpowiadaczApp.toggleSkrybaDictationMode(this.checked);">
                            <label class="text-xs font-bold g-text group-hover:text-emerald-400 transition cursor-pointer">Zapisuj dyktowanie w programie Skryba</label>
                        </div>
                        <div class="flex items-center gap-2 cursor-pointer group mt-1" onclick="const cb=document.getElementById('ai-set-wakeword'); cb.checked=!cb.checked; podpowiadaczApp.toggleWakeWord(cb.checked);">
                            <input type="checkbox" id="ai-set-wakeword" class="w-4 h-4 accent-red-500 cursor-pointer" ${podpowiadaczApp.settings.wakeWordActive ? 'checked' : ''} onclick="event.stopPropagation(); podpowiadaczApp.toggleWakeWord(this.checked);">
                            <label class="text-xs font-bold g-text group-hover:text-red-400 transition cursor-pointer">Nasłuchuj w tle: "Bigos"</label>
                        </div>
                    </div>

                    <h3 class="font-bold text-xs text-emerald-500 uppercase tracking-widest mb-3 border-b g-border pb-1">Głosy Asystentów (TTS 2026)</h3>
                    <div class="flex flex-col gap-3 mb-4">
                        <div>
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Dostawca Głosu</label>
                            <select id="tts-provider" class="w-full p-2.5 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner" onchange="podpowiadaczApp.changeTTSProvider()">
                                <option value="native" ${podpowiadaczApp.settings.ttsProvider==='native'?'selected':''}>Wbudowany (Web Speech 2026)</option>
                                <option value="gemini" ${podpowiadaczApp.settings.ttsProvider==='gemini'?'selected':''}>Google Gemini Live Audio</option>
                                <option value="openai" ${podpowiadaczApp.settings.ttsProvider==='openai'?'selected':''}>OpenAI GPT-4o Mini TTS</option>
                                <option value="elevenlabs" ${podpowiadaczApp.settings.ttsProvider==='elevenlabs'?'selected':''}>ElevenLabs v3 Multilingual</option>
                                <option value="cartesia" ${podpowiadaczApp.settings.ttsProvider==='cartesia'?'selected':''}>Cartesia Sonic-2 (2026)</option>
                            </select>
                        </div>
                        <div id="tts-key-container" class="${podpowiadaczApp.settings.ttsProvider==='native' ? 'hidden' : ''}">
                            <label class="block text-[10px] font-bold g-text-muted mb-1" id="tts-key-lbl">Klucz API Głosu</label>
                            <input type="password" id="tts-apikey" placeholder="Wklej klucz API usługi" value="${podpowiadaczApp.settings.ttsApiKey}" class="w-full p-2.5 rounded g-bg g-text border g-border outline-none text-xs font-mono shadow-inner mb-1" onchange="podpowiadaczApp.settings.ttsApiKey=this.value; podpowiadaczApp.saveData();">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold g-text-muted mb-1">Głos Asystenta (2026)</label>
                            <select id="tts-voice-select" class="w-full p-2.5 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner" onchange="podpowiadaczApp.settings.ttsVoice=this.value; podpowiadaczApp.saveData();"></select>
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
                    <div id="ai-chat-container" class="flex-grow overflow-y-auto custom-scrollbar p-5 flex flex-col gap-4 select-text cursor-auto" style="user-select: text; -webkit-user-select: text;">
                        <!-- Wiadomości -->
                    </div>

                    <div class="p-3.5 bg-black/20 border-t g-border shrink-0 flex flex-col gap-2">
                        <div id="ai-suggestions" class="flex gap-2 overflow-x-auto custom-scrollbar hidden pb-1 scroll-smooth"></div>
                        
                        <div class="w-full relative flex items-end gap-2.5">
                            <button onclick="podpowiadaczApp.openAttachModal()" class="g-btn text-gray-400 hover:text-blue-400 transition rounded-xl w-11 h-[46px] flex items-center justify-center text-lg shrink-0 border g-border shadow-sm" title="Dołącz plik jako kontekst">📎</button>
                            <div class="flex-grow relative flex items-center min-w-0">
                                <textarea id="ai-chat-input" rows="1" placeholder="Wydaj polecenie systemowe, wyszukaj w Sieciosławiu lub wygeneruj media..." class="w-full bg-white/5 dark:bg-black/40 border g-border rounded-xl pl-4 pr-12 py-2.5 text-sm g-text outline-none focus:border-blue-500 transition-colors custom-scrollbar resize-none h-[46px] shadow-inner leading-normal" onkeydown="podpowiadaczApp.handleInput(event)" oninput="podpowiadaczApp.showSuggestions(this.value)"></textarea>
                                <button onclick="podpowiadaczApp.toggleDictation()" id="ai-mic-btn" class="absolute right-2 bottom-1.5 text-gray-400 hover:text-blue-400 transition p-2 rounded-full flex items-center justify-center text-lg h-8 w-8" title="Ręczne Dyktowanie Głosowe (STT 2026)">🎤</button>
                            </div>
                            <button id="ai-send-btn" onclick="podpowiadaczApp.isThinking ? podpowiadaczApp.cancelRequest() : podpowiadaczApp.sendMessage()" class="${podpowiadaczApp.isThinking ? 'bg-red-600 hover:bg-red-500' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500'} text-white rounded-xl w-14 h-[46px] flex items-center justify-center text-xl shadow-lg transition-transform hover:scale-105 active:scale-95 shrink-0 mb-0" title="${podpowiadaczApp.isThinking ? 'Zatrzymaj generowanie' : 'Wyślij wiadomość'}">${podpowiadaczApp.isThinking ? '⏹️' : '↑'}</button>
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
        
        const matches = podpowiadaczApp.suggestionsDB.filter(s => s.toLowerCase().includes(query) && s.toLowerCase() !== query);
        if (matches.length > 0) {
            container.innerHTML = matches.slice(0, 5).map(m => `<button class="g-btn text-[10px] px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-300 border-blue-500/50 hover:bg-blue-500 hover:text-white whitespace-nowrap shadow-sm transition-transform hover:scale-105" onclick="podpowiadaczApp.useSuggestion('${m.replace(/'/g, "\\'")}')">${m}</button>`).join('');
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
        if (prov === 'simulated') keyCont.classList.add('opacity-30', 'pointer-events-none');
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

        podpowiadaczApp.updateServiceTierDropdown();
    },

    updateServiceTierDropdown: () => {
        const tierContainer = document.getElementById('ai-service-tier-container');
        const tierSelect = document.getElementById('ai-service-tier');
        if (!tierContainer || !tierSelect) return;

        const prov = podpowiadaczApp.settings.provider;
        if (prov !== 'openai') {
            tierContainer.classList.add('hidden');
            return;
        }
        tierContainer.classList.remove('hidden');

        const models = MODELS_DB.openai || [];
        const currentModelObj = models.find(m => m.id === podpowiadaczApp.settings.model);
        const allowedTiers = (currentModelObj && Array.isArray(currentModelObj.tiers) && currentModelObj.tiers.length > 0)
            ? currentModelObj.tiers
            : ['standard', 'fast', 'ultrafast'];

        if (!allowedTiers.includes(podpowiadaczApp.settings.serviceTier)) {
            podpowiadaczApp.settings.serviceTier = allowedTiers.includes('fast') && podpowiadaczApp.settings.serviceTier === 'ultrafast'
                ? 'fast'
                : allowedTiers[0];
        }

        tierSelect.innerHTML = SERVICE_TIERS_DB
            .filter(t => allowedTiers.includes(t.id))
            .map(t => `<option value="${t.id}" ${podpowiadaczApp.settings.serviceTier === t.id ? 'selected' : ''}>${t.name}</option>`)
            .join('');
    },

    changeServiceTier: () => {
        const tierSelect = document.getElementById('ai-service-tier');
        if (!tierSelect) return;
        podpowiadaczApp.settings.serviceTier = tierSelect.value || 'standard';
        podpowiadaczApp.saveData();
    },

    changeModelSelect: () => {
        const sel = document.getElementById('ai-model-select'); const custInp = document.getElementById('ai-model-custom');
        if (sel.value === 'custom_mode') {
            podpowiadaczApp.settings.isCustomModel = true; custInp.classList.remove('hidden'); podpowiadaczApp.settings.model = custInp.value; 
        } else {
            podpowiadaczApp.settings.isCustomModel = false; custInp.classList.add('hidden'); podpowiadaczApp.settings.model = sel.value;
        }
        podpowiadaczApp.updateServiceTierDropdown();
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
        const prov = document.getElementById('stt-provider')?.value || podpowiadaczApp.settings.sttProvider || 'native';
        podpowiadaczApp.settings.sttProvider = prov;
        const setDiv = document.getElementById('stt-groq-settings');
        const keyLbl = document.getElementById('stt-key-lbl');
        if (setDiv) {
            if (prov === 'native') setDiv.classList.add('hidden');
            else {
                setDiv.classList.remove('hidden');
                if (keyLbl) keyLbl.innerText = `Klucz API STT (${prov.toUpperCase()})`;
            }
        }
        const sttModels = STT_ENGINES_DB[prov] || STT_ENGINES_DB.native;
        if (!sttModels.some(m => m.id === podpowiadaczApp.settings.sttModel)) {
            podpowiadaczApp.settings.sttModel = sttModels[0].id;
        }
        const sttSel = document.getElementById('stt-model');
        if (sttSel) {
            sttSel.innerHTML = sttModels.map(m => `<option value="${m.id}" ${podpowiadaczApp.settings.sttModel === m.id ? 'selected' : ''}>${m.name}</option>`).join('');
        }
        podpowiadaczApp.saveData();
    },

    toggleSkrybaDictationMode: (forceVal) => {
        const nextVal = typeof forceVal === 'boolean' ? forceVal : !podpowiadaczApp.settings.dictateToSkryba;
        podpowiadaczApp.settings.dictateToSkryba = nextVal;
        podpowiadaczApp.saveData();
        const btn = document.getElementById('ai-skryba-dictate-btn');
        if (btn) {
            if (nextVal) {
                btn.classList.add('bg-emerald-600', 'text-white', 'border-emerald-400');
                btn.classList.remove('text-emerald-400', 'border-emerald-500/50');
            } else {
                btn.classList.remove('bg-emerald-600', 'text-white', 'border-emerald-400');
                btn.classList.add('text-emerald-400', 'border-emerald-500/50');
            }
        }
        const cb = document.getElementById('ai-set-skryba-stt');
        if (cb) cb.checked = nextVal;
        if (typeof apps !== 'undefined') {
            apps.showToast(
                'Dyktowanie do Skryby',
                nextVal ? 'Włączono! Każda podyktowana wypowiedź zostanie automatycznie zapisana w programie Skryba.' : 'Wyłączono bezpośredni zapis dyktowania do Skryby.',
                nextVal ? 'success' : 'info'
            );
        }
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
    // MOWA: SPEECH-TO-TEXT I TEXT-TO-SPEECH (2026)
    // ==================================================================
    handleDictatedTranscript: async (transcriptText) => {
        if (!transcriptText || !transcriptText.trim()) return;
        const cleaned = transcriptText.trim();

        // Jeśli włączony jest tryb "Dyktuj do Skryby", od razu otwórz Skrybę i dopisz/zapisz tekst
        if (podpowiadaczApp.settings.dictateToSkryba) {
            await podpowiadaczApp.writeToSkryba({
                title: 'Dyktowanie_BigAI.html',
                content: cleaned,
                append: true
            });
            podpowiadaczApp.messages.push({
                role: 'user',
                text: `🎤 [Dyktowanie do Skryby]: "${cleaned}"`
            });
            podpowiadaczApp.messages.push({
                role: 'assistant',
                text: `📝 Zapisałem podyktowany tekst w programie **Skryba** (plik \`Dyktowanie_BigAI.html\`):\n\n> *${cleaned}*`
            });
            podpowiadaczApp.saveData();
            podpowiadaczApp.renderChat();
            return;
        }

        const input = document.getElementById('ai-chat-input');
        if (input) {
            input.value = (input.value + ' ' + cleaned).trim();
            input.style.height = (input.scrollHeight) + 'px';
            podpowiadaczApp.showSuggestions(input.value);
        }
    },

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
                                command = finalTranscript.substring(idx + w.length).trim().replace(/^[,.!?-]\s*/, '').trim();
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
                        podpowiadaczApp.handleDictatedTranscript(finalTranscript);
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
        if (prov !== 'native') {
            const btn = document.getElementById('ai-mic-btn');
            if (podpowiadaczApp.isRecording) {
                if (podpowiadaczApp.mediaRecorder) podpowiadaczApp.mediaRecorder.stop();
                podpowiadaczApp.isRecording = false; if (btn) { btn.classList.remove('text-red-500', 'animate-pulse'); btn.innerText = '⏳'; }
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
                        const apiKey = podpowiadaczApp.settings.sttApiKey || podpowiadaczApp.settings.apiKey;
                        if (!apiKey) { if(typeof apps !== 'undefined') apps.showToast('Błąd', `Wprowadź w ustawieniach klucz API dla ${prov.toUpperCase()} STT!`, 'error'); if (btn) btn.innerText = '🎤'; return; }
                        const sttModel = podpowiadaczApp.settings.sttModel || (STT_ENGINES_DB[prov] && STT_ENGINES_DB[prov][0].id) || 'whisper-large-v3-turbo';
                        try {
                            let transcribedText = '';
                            if (prov === 'groq' || prov === 'openai') {
                                const endpoint = prov === 'groq'
                                    ? 'https://api.groq.com/openai/v1/audio/transcriptions'
                                    : 'https://api.openai.com/v1/audio/transcriptions';
                                const formData = new FormData();
                                formData.append('file', new File([audioBlob], 'recording.webm', { type: 'audio/webm' }));
                                formData.append('model', sttModel);
                                formData.append('language', 'pl');
                                const response = await fetch(endpoint, { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}` }, body: formData });
                                const data = await response.json();
                                if (!response.ok) throw new Error(data.error?.message || response.statusText);
                                transcribedText = data.text || '';
                            } else if (prov === 'elevenlabs_stt') {
                                const formData = new FormData();
                                formData.append('file', new File([audioBlob], 'recording.webm', { type: 'audio/webm' }));
                                formData.append('model_id', sttModel || 'scribe_v2');
                                formData.append('language_code', 'pol');
                                const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': apiKey }, body: formData });
                                const data = await response.json();
                                if (!response.ok) throw new Error(data.detail?.message || response.statusText);
                                transcribedText = data.text || '';
                            } else if (prov === 'deepgram') {
                                const response = await fetch(`https://api.deepgram.com/v1/listen?model=${encodeURIComponent(sttModel || 'nova-3')}&language=pl&smart_format=true`, {
                                    method: 'POST',
                                    headers: { 'Authorization': `Token ${apiKey}`, 'Content-Type': 'audio/webm' },
                                    body: audioBlob
                                });
                                const data = await response.json();
                                if (!response.ok) throw new Error(data.err_msg || response.statusText);
                                transcribedText = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
                            } else if (prov === 'gemini_stt') {
                                const base64Audio = await new Promise((resolve) => {
                                    const reader = new FileReader();
                                    reader.onloadend = () => resolve(String(reader.result || '').split(',')[1] || '');
                                    reader.readAsDataURL(audioBlob);
                                });
                                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${sttModel || 'gemini-3.1-flash'}:generateContent?key=${apiKey}`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        contents: [{
                                            parts: [
                                                { text: 'Przepisz dokładnie na język polski wypowiedź z tego nagrania audio. Zwróć wyłącznie sam przepisany tekst.' },
                                                { inlineData: { mimeType: 'audio/webm', data: base64Audio } }
                                            ]
                                        }]
                                    })
                                });
                                const data = await response.json();
                                if (!response.ok) throw new Error(data.error?.message || response.statusText);
                                transcribedText = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join(' ').trim() || '';
                            }
                            if (transcribedText) {
                                await podpowiadaczApp.handleDictatedTranscript(transcribedText);
                            }
                        } catch (error) { if(typeof apps !== 'undefined') apps.showToast('Błąd STT', error.message, 'error'); } finally { if (btn) btn.innerText = '🎤'; }
                    };
                    podpowiadaczApp.mediaRecorder.start(); podpowiadaczApp.isRecording = true;
                    if (btn) { btn.classList.add('text-red-500', 'animate-pulse'); btn.innerText = '🔴'; }
                } catch (e) { if(typeof apps !== 'undefined') apps.showToast('Błąd Mikrofonu', 'Nie można uzyskać dostępu do mikrofonu.', 'error'); }
            }
            return;
        }

        if (!podpowiadaczApp.recognition) { if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Przeglądarka nie obsługuje dyktowania.', 'error'); return; }
        if (podpowiadaczApp.settings.wakeWordActive) { podpowiadaczApp.toggleWakeWord(false); const cb = document.getElementById('ai-set-wakeword'); if(cb) cb.checked = false; }
        const btn = document.getElementById('ai-mic-btn');
        if (btn && btn.classList.contains('text-red-500')) { podpowiadaczApp.recognition.stop(); } 
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
        // Syntax-check without executing: use the sandbox literal parser when
        // possible; otherwise report a generic fix prompt (no host eval).
        try {
            if (typeof bigosSandbox !== 'undefined' && bigosSandbox.parseLiteral) {
                // Try to extract and parse the register() manifest as data.
                const m = code.match(/BigOSAppAPI\.register\s*\(\s*(\{[\s\S]*?\})\s*\)/);
                if (m) bigosSandbox.parseLiteral(m[1]);
            }
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
        html = html.replace(/^\* (.*?)$/gm, '<li class="ml-4 list-disc">$1</li>');
        html = html.replace(/^- (.*?)$/gm, '<li class="ml-4 list-disc">$1</li>');
        html = html.replace(/\*(.*?)\*/g, '<i class="g-text-muted">$1</i>');
        
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
            const senderName = isUser ? 'Ty' : 'BigAI 2026';

            const el = document.createElement('div');
            el.className = `flex flex-col max-w-[94%] sm:max-w-[88%] ${alignClass} mb-3 shadow-md ${bgClass} ${radiusClass} p-3.5 sm:p-4 text-sm leading-relaxed relative group select-text cursor-auto`;
            el.style.userSelect = "text"; el.style.webkitUserSelect = "text";
            
            let formattedHtml = podpowiadaczApp.formatMarkdown(msg.text, idx);
            let mediaHtml = '';
            if (msg.mediaPreview) {
                const mp = msg.mediaPreview;
                const safePrompt = typeof desktop !== 'undefined' ? desktop.escapeHTML(mp.prompt || '') : (mp.prompt || '');
                const safeBadge = typeof desktop !== 'undefined' ? desktop.escapeHTML(mp.badge || mp.model || '') : (mp.badge || mp.model || '');
                if (mp.type === 'image' && mp.dataUrl) {
                    mediaHtml = `
                        <div class="mt-3 rounded-xl overflow-hidden border g-border bg-black/40 shadow-lg">
                            <div class="px-3 py-1.5 bg-black/60 flex items-center justify-between text-[10px] g-text-muted border-b g-border">
                                <span class="font-bold text-pink-400">🖼️ ${safeBadge}</span>
                                <span class="truncate max-w-[220px]">${safePrompt}</span>
                            </div>
                            <img src="${mp.dataUrl}" alt="${safePrompt}" class="w-full max-h-[320px] object-contain bg-black cursor-pointer" onclick="podpowiadaczApp.openGeneratedMedia('${mp.fileId || ''}', 'image')">
                            <div class="p-2 bg-black/50 flex flex-wrap gap-2 justify-end border-t g-border">
                                <button onclick="podpowiadaczApp.openGeneratedMedia('${mp.fileId || ''}', 'image')" class="g-btn px-2.5 py-1 rounded text-[11px] font-bold text-blue-300 border-blue-500/40 hover:bg-blue-600 hover:text-white transition">👁️ Otwórz w Patrzałce</button>
                                <button onclick="podpowiadaczApp.setGeneratedAsWallpaper('${mp.fileId || ''}')" class="g-btn px-2.5 py-1 rounded text-[11px] font-bold text-purple-300 border-purple-500/40 hover:bg-purple-600 hover:text-white transition">🖼️ Ustaw jako tapetę</button>
                                <a href="${mp.dataUrl}" download="${mp.fileName || 'bigai_obraz.png'}" class="g-btn px-2.5 py-1 rounded text-[11px] font-bold text-emerald-300 border-emerald-500/40 hover:bg-emerald-600 hover:text-white transition no-underline">💾 Pobierz</a>
                            </div>
                        </div>
                    `;
                } else if (mp.type === 'video') {
                    mediaHtml = `
                        <div class="mt-3 rounded-xl overflow-hidden border g-border bg-black/40 shadow-lg">
                            <div class="px-3 py-1.5 bg-black/60 flex items-center justify-between text-[10px] g-text-muted border-b g-border">
                                <span class="font-bold text-purple-400">🎬 ${safeBadge}</span>
                                <span class="truncate max-w-[220px]">${safePrompt}</span>
                            </div>
                            ${mp.videoUrl ? `<video src="${mp.videoUrl}" poster="${mp.posterUrl || ''}" controls autoplay loop muted playsinline class="w-full max-h-[320px] bg-black"></video>` : `<img src="${mp.posterUrl || ''}" alt="${safePrompt}" class="w-full max-h-[320px] object-contain bg-black">`}
                            <div class="p-2 bg-black/50 flex flex-wrap gap-2 justify-end border-t g-border">
                                <button onclick="podpowiadaczApp.openGeneratedMedia('${mp.fileId || ''}', 'video')" class="g-btn px-2.5 py-1 rounded text-[11px] font-bold text-purple-300 border-purple-500/40 hover:bg-purple-600 hover:text-white transition">🎬 Otwórz w Grajaczu</button>
                                ${mp.videoUrl ? `<a href="${mp.videoUrl}" download="${mp.fileName || 'bigai_wideo.webm'}" class="g-btn px-2.5 py-1 rounded text-[11px] font-bold text-emerald-300 border-emerald-500/40 hover:bg-emerald-600 hover:text-white transition no-underline">💾 Pobierz Wideo</a>` : ''}
                            </div>
                        </div>
                    `;
                }
            }
            
            el.innerHTML = `
                <div class="flex items-center justify-between mb-2 border-b border-white/10 pb-1 w-full opacity-70">
                    <div class="flex items-center gap-2">
                        <span class="text-lg leading-none">${icon}</span>
                        <span class="text-[10px] font-bold uppercase tracking-wider">${senderName}</span>
                    </div>
                    ${!isUser ? `<button onclick="podpowiadaczApp.readText(this, podpowiadaczApp.messages[${idx}]?.text || '')" class="text-[10px] px-2 py-0.5 rounded border border-white/20 hover:bg-white/10 transition">🔊 Czytaj</button>` : ''}
                </div>
                <div class="w-full break-words space-y-2 font-sans">${formattedHtml}${mediaHtml}</div>
            `;
            chatBox.appendChild(el);
        });

        if (podpowiadaczApp.isThinking) {
            const el = document.createElement('div');
            el.className = `self-start g-panel bg-black/20 border border-blue-500/30 g-text rounded-2xl rounded-tl-sm p-3.5 text-sm max-w-[80%] shadow-md flex items-center justify-between gap-4`;
            el.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-xl animate-spin inline-block">⚙️</span>
                    <span class="font-mono text-xs text-blue-400">Przetwarzanie zapytania...</span>
                </div>
                <button onclick="podpowiadaczApp.cancelRequest()" class="g-btn border-red-500/50 text-red-400 bg-red-600/10 hover:bg-red-500 hover:text-white text-[10px] px-3 py-1.5 rounded shadow-sm transition font-bold uppercase tracking-wider">Zatrzymaj</button>
            `;
            chatBox.appendChild(el);
        }

        const sendBtn = document.getElementById('ai-send-btn');
        if (sendBtn) {
            if (podpowiadaczApp.isThinking) {
                sendBtn.className = 'bg-red-600 hover:bg-red-500 text-white rounded-xl w-14 h-[46px] flex items-center justify-center text-xl shadow-lg transition-transform hover:scale-105 active:scale-95 shrink-0 mb-0';
                sendBtn.innerText = '⏹️';
                sendBtn.title = 'Zatrzymaj generowanie';
            } else {
                sendBtn.className = 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl w-14 h-[46px] flex items-center justify-center text-xl shadow-lg transition-transform hover:scale-105 active:scale-95 shrink-0 mb-0';
                sendBtn.innerText = '↑';
                sendBtn.title = 'Wyślij wiadomość';
            }
        }

        chatBox.scrollTop = chatBox.scrollHeight;
    },

    cancelRequest: () => {
        if (podpowiadaczApp.currentAbortController) {
            podpowiadaczApp.currentAbortController.abort();
            podpowiadaczApp.currentAbortController = null;
        }
        podpowiadaczApp.isThinking = false;
        podpowiadaczApp.messages.push({
            role: 'assistant',
            text: '⏹️ Generowanie odpowiedzi zostało zatrzymane przez użytkownika.'
        });
        podpowiadaczApp.saveData();
        podpowiadaczApp.renderChat();
        if (typeof apps !== 'undefined' && apps.showToast) {
            apps.showToast('BigAI', 'Zatrzymano generowanie odpowiedzi.', 'info');
        }
    },

    openAttachModal: () => {
        const files = (typeof fileSystem !== 'undefined' ? fileSystem : []).filter(f => f && f.type === 'file');
        const modalId = 'ai-attach-modal';
        let modal = document.getElementById(modalId);
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/70 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
        modal.innerHTML = `
            <div class="g-panel p-5 rounded-2xl max-w-md w-full border g-border shadow-2xl flex flex-col max-h-[70vh]">
                <h3 class="font-bold text-sm g-text mb-3 flex items-center gap-2 border-b g-border pb-2">
                    <span>📎</span> Wybierz plik jako kontekst dla BigAI
                </h3>
                <div class="flex-grow overflow-y-auto custom-scrollbar flex flex-col gap-1.5 mb-4">
                    ${files.length === 0 ? '<div class="text-xs g-text-muted p-4 text-center">Brak plików w systemie.</div>' : files.map(f => `
                        <button class="flex items-center gap-2 p-2 rounded hover:bg-white/10 text-left g-text text-xs transition border border-transparent hover:border-blue-500/30" data-fid="${f.id}">
                            <span class="text-base">${f.icon || '📄'}</span>
                            <span class="font-medium truncate flex-grow">${typeof desktop !== 'undefined' ? desktop.escapeHTML(f.name) : f.name}</span>
                            <span class="text-[10px] g-text-muted font-mono">${(f.content ? String(f.content).length : 0)} zn.</span>
                        </button>
                    `).join('')}
                </div>
                <div class="flex justify-end gap-2 shrink-0 pt-2 border-t g-border">
                    <button id="ai-attach-cancel" class="px-4 py-2 g-btn rounded text-xs font-semibold hover:bg-white/10 transition">Anuluj</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#ai-attach-cancel').onclick = () => modal.remove();
        modal.querySelectorAll('[data-fid]').forEach(btn => {
            btn.onclick = () => {
                const fid = btn.dataset.fid;
                const file = files.find(x => x.id === fid);
                if (file) {
                    const input = document.getElementById('ai-chat-input');
                    if (input) {
                        const snippet = `[Plik: ${file.name}]\n${file.content || ''}\n\n`;
                        input.value = snippet + input.value;
                        input.style.height = '46px';
                        input.style.height = Math.min(150, input.scrollHeight) + 'px';
                        input.focus();
                    }
                    if (typeof apps !== 'undefined' && apps.showToast) {
                        apps.showToast('BigAI', `Dołączono plik „${file.name}”`, 'info');
                    }
                }
                modal.remove();
            };
        });
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
                text: 'Cześć! Jestem **BigAI 2026** — głównym zarządcą systemu **BigOS**.\n\nSpróbuj napisać lub powiedzieć:\n* *"Otwórz Skrybę i zapisz notatkę: spotkanie o 15:00"*\n* *"Wyszukaj w przeglądarce Sieciosław kurs dolara"*\n* *"Otwórz grafikę w Patrzałce"* lub *"Stwórz folder Dokumenty"*\n* *"Wygeneruj zdjęcie w Nano Banana Pro"* lub *"Wygeneruj wideo w Veo 3.1"*'
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
    // ROZPOZNAWANIE NAZW APLIKACJI I OPERACJE SYSTEMOWE BIGOS
    // ==================================================================
    APP_ALIASES: {
        'kalkulator': 'kalkulator', 'rachmistrz': 'kalkulator', 'rachmistrz pro': 'kalkulator',
        'skryba': 'skryba', 'notatnik': 'skryba', 'edytor tekstu': 'skryba', 'notatki': 'skryba',
        'siecioslaw': 'siecioslaw', 'sieciosław': 'siecioslaw', 'przegladarka': 'siecioslaw', 'przeglądarka': 'siecioslaw', 'internet': 'siecioslaw',
        'patrzalka': 'patrzalka', 'patrzałka': 'patrzalka', 'patrzałka pro': 'patrzalka', 'galeria': 'patrzalka', 'zdjecia': 'patrzalka', 'zdjęcia': 'patrzalka', 'grafika': 'patrzalka',
        'aktowka': 'aktowka', 'aktówka': 'aktowka', 'menedżer plików': 'aktowka', 'pliki': 'aktowka',
        'tapeciak': 'tapeciak', 'kombinator': 'tapeciak', 'ustawienia': 'tapeciak', 'motywy': 'tapeciak',
        'szkicownik': 'szkicownik', 'artysta': 'szkicownik', 'rysowanie': 'szkicownik',
        'bigos_painter': 'bigos_painter', 'bigpaint': 'bigos_painter', 'bigpaint studio': 'bigos_painter',
        'grajek': 'grajek', 'muzyka': 'grajek', 'odtwarzacz muzyki': 'grajek',
        'grajacz': 'grajacz', 'grajacz filmów': 'grajacz', 'wideo': 'grajacz', 'filmy': 'grajacz',
        'montazysta': 'montazysta', 'montażysta': 'montazysta',
        'tabelarz': 'tabelarz', 'arkusz': 'tabelarz', 'arkusz kalkulacyjny': 'tabelarz', 'excel': 'tabelarz',
        'menadzer': 'menadzer', 'menedżer': 'menadzer', 'menedżer aplikacji': 'menadzer',
        'nadzorca': 'nadzorca', 'monitor systemu': 'nadzorca',
        'pogodynka': 'pogodynka', 'pogoda': 'pogodynka',
        'czasomierz': 'czasomierz', 'stoper': 'czasomierz', 'zegar': 'czasomierz',
        'kasiarz': 'kasiarz', 'finanse': 'kasiarz', 'budżet': 'kasiarz',
        'przelicznik': 'przelicznik', 'konwerter': 'przelicznik',
        'kompresor': 'kompresor', 'upychacz': 'kompresor',
        'wladca': 'wladca', 'władca': 'wladca', 'władca danych': 'wladca', 'terminal': 'wladca', 'konsola': 'wladca',
        'zadaniowiec': 'zadaniowiec', 'zadania': 'zadaniowiec', 'todo': 'zadaniowiec',
        'edytor_map': 'edytor_map', 'edytor map': 'edytor_map', 'mapy': 'edytor_map',
        'kalkulator_bmi': 'kalkulator_bmi', 'kalkulator wagi': 'kalkulator_bmi', 'bmi': 'kalkulator_bmi',
        'pelzacz': 'pelzacz', 'pełzacz': 'pelzacz', 'wąż': 'pelzacz', 'snake': 'pelzacz',
        'murarz': 'murarz', 'tetris': 'murarz',
        'ufoludki': 'ufoludki', 'kosmici': 'ufoludki',
        'odbijanka': 'odbijanka', 'arkanoid': 'odbijanka', 'pong': 'odbijanka',
        'trzepotek': 'trzepotek', 'flappy': 'trzepotek',
        'scigacz': 'scigacz', 'ścigacz': 'scigacz', 'wyścigi': 'scigacz',
        'bombiarz': 'bombiarz', 'saper': 'bombiarz',
        'kolko': 'kolko', 'kółko': 'kolko', 'kółko i krzyżyk': 'kolko',
        'tank': 'tank', 'czolgi': 'tank', 'czołgi': 'tank',
        'cookie_clicker': 'cookie_clicker', 'ciasteczko': 'cookie_clicker',
        'powitanie': 'powitanie', 'witaj': 'powitanie',
        'hasiok': 'hasiok', 'kosz': 'hasiok',
        'podpowiadacz': 'podpowiadacz', 'bigai': 'podpowiadacz'
    },

    resolveAppId: (rawName) => {
        if (!rawName) return '';
        const clean = String(rawName).toLowerCase().trim()
            .replace(/^(aplikację|aplikacje|aplikacja|program|grę|gre|gra|okno)\s+/i, '')
            .replace(/[."'!?;:]+$/g, '')
            .trim();
        if (podpowiadaczApp.APP_ALIASES[clean]) return podpowiadaczApp.APP_ALIASES[clean];
        // Sprawdź biernik/odmianę np. "skrybę" -> "skryba", "patrzałkę" -> "patrzałka", "aktówkę" -> "aktówka"
        const stem = clean.replace(/(ę|ie|iu|a|y|u)$/i, '');
        for (const [alias, appId] of Object.entries(podpowiadaczApp.APP_ALIASES)) {
            if (alias === clean || (stem.length >= 4 && alias.startsWith(stem))) return appId;
        }
        if (typeof defaultApps !== 'undefined') {
            const found = defaultApps.find(a =>
                a.appId === clean ||
                (a.name && a.name.toLowerCase() === clean) ||
                (a.name && stem.length >= 4 && a.name.toLowerCase().includes(stem))
            );
            if (found) return found.appId;
        }
        return clean;
    },

    writeToSkryba: async (opts = {}) => {
        const titleRaw = (opts.title || opts.name || 'Notatka_z_BigAI.html').trim();
        const fileName = /\.(txt|md|html|rtf)$/i.test(titleRaw) ? titleRaw : (titleRaw + '.html');
        const textContent = String(opts.content || opts.text || '').trim();
        const append = Boolean(opts.append);

        if (typeof winManager !== 'undefined') winManager.open('skryba');

        let f = null;
        if (typeof fileSystem !== 'undefined') {
            f = fileSystem.find(item => item && item.type === 'file' && item.parentId !== 'hasiok' &&
                (item.name.toLowerCase() === fileName.toLowerCase() || item.name.toLowerCase() === titleRaw.toLowerCase()));
        }

        const htmlParagraph = textContent.replace(/\n/g, '<br>');
        const timestamp = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

        if (!f) {
            const slot = (typeof desktop !== 'undefined' && typeof desktop.findFreeSlot === 'function')
                ? desktop.findFreeSlot()
                : { x: 110, y: 150 };
            f = {
                id: 'file_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                type: 'file',
                name: fileName,
                icon: '📄',
                parentId: 'root',
                content: htmlParagraph,
                skrybaMeta: { tags: 'BigAI, Dyktowanie', revisions: [] },
                x: slot.x,
                y: slot.y
            };
            if (typeof fileSystem !== 'undefined') fileSystem.push(f);
        } else {
            if (append && f.content) {
                f.content = `${f.content}<br><div><b>[${timestamp}]</b> ${htmlParagraph}</div>`;
            } else {
                f.content = htmlParagraph;
            }
        }

        if (typeof window.skrybaApp !== 'undefined') {
            if (!document.getElementById('skryba-editor') && typeof window.skrybaApp.init === 'function') {
                await window.skrybaApp.init();
            }
            if (typeof window.skrybaApp.open === 'function') {
                window.skrybaApp.open(f);
            }
            const ed = document.getElementById('skryba-editor');
            const raw = document.getElementById('skryba-raw-editor');
            const titleEl = document.getElementById('skryba-note-title');
            if (titleEl) titleEl.value = f.name;
            if (ed) ed.innerHTML = f.content;
            if (raw) raw.value = f.content;
            window.skrybaApp.isDirty = true;
            if (typeof window.skrybaApp.saveNoteSilent === 'function') {
                await window.skrybaApp.saveNoteSilent();
            }
            if (typeof window.skrybaApp.updateStats === 'function') window.skrybaApp.updateStats();
            if (typeof window.skrybaApp.renderSidebar === 'function') window.skrybaApp.renderSidebar();
        }
        if (typeof winManager !== 'undefined') winManager.open('skryba');

        if (typeof fsManager !== 'undefined' && fsManager.save) await fsManager.save();
        if (typeof desktop !== 'undefined' && desktop.render) desktop.render();
        if (typeof apps !== 'undefined' && apps.showToast) {
            apps.showToast('Skryba + BigAI', `Zapisano notatkę „${f.name}”`, 'success');
        }
        return f;
    },

    searchInSiecioslaw: (queryOrUrl) => {
        const raw = String(queryOrUrl || '').trim();
        if (!raw) return false;
        if (typeof winManager !== 'undefined') winManager.open('siecioslaw');
        if (typeof siecioslawApp !== 'undefined') {
            if (typeof siecioslawApp.init === 'function' && (!siecioslawApp.tabs || siecioslawApp.tabs.length === 0)) {
                siecioslawApp.init();
            }
            let targetUrl = raw;
            if (!/^https?:\/\//i.test(raw) && (!raw.includes('.') || raw.includes(' '))) {
                targetUrl = 'https://www.bing.com/search?q=' + encodeURIComponent(raw);
            } else if (!/^https?:\/\//i.test(raw)) {
                targetUrl = 'https://' + raw;
            }
            const urlInp = document.getElementById('s-url-input');
            if (urlInp) urlInp.value = targetUrl;
            if (typeof siecioslawApp.navigateURL === 'function') {
                siecioslawApp.navigateURL(targetUrl);
            }
            if (typeof apps !== 'undefined' && apps.showToast) {
                apps.showToast('Sieciosław', `Wyszukiwanie: ${raw}`, 'info');
            }
            return true;
        }
        return false;
    },

    openImageInPatrzalka: (query) => {
        if (typeof fileSystem === 'undefined') return null;
        const images = fileSystem.filter(f =>
            f && f.parentId !== 'hasiok' &&
            (f.type === 'image' || (f.type === 'file' && /\.(jpg|jpeg|png|webp|gif|bmp|svg|avif)$/i.test(f.name || '')))
        );
        const q = String(query || '').toLowerCase().trim()
            .replace(/^(grafikę|grafike|grafika|zdjęcie|zdjecie|obraz|obrazek|plik)\s*/i, '')
            .trim();
        let target = null;
        if (q && q !== 'galeria' && q !== 'wszystkie' && q !== 'ostatnie' && q !== 'dowolne') {
            target = images.find(img =>
                img.id === query ||
                (img.name || '').toLowerCase() === q ||
                (img.name || '').toLowerCase().includes(q)
            );
        }
        if (!target && images.length > 0) {
            target = images[images.length - 1];
        }
        if (typeof winManager !== 'undefined') winManager.open('patrzalka');
        if (typeof patrzalkaApp !== 'undefined') {
            if (typeof patrzalkaApp.renderGallery === 'function') patrzalkaApp.renderGallery();
            if (target && typeof patrzalkaApp.open === 'function') {
                patrzalkaApp.open(target);
            }
        }
        return target;
    },

    createSystemFile: async (opts = {}) => {
        const rawName = String(opts.name || 'Nowy_plik.txt').trim();
        const fileName = rawName.includes('.') ? rawName : (rawName + '.txt');
        const content = typeof opts.content === 'string' ? opts.content : '';
        const parentId = opts.parentId || 'root';
        const slot = (typeof desktop !== 'undefined' && typeof desktop.findFreeSlot === 'function')
            ? desktop.findFreeSlot()
            : { x: 110, y: 150 };
        const newFile = {
            id: 'file_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            type: 'file',
            name: fileName,
            icon: '📄',
            parentId,
            content,
            x: slot.x,
            y: slot.y
        };
        if (typeof fileSystem !== 'undefined') fileSystem.push(newFile);
        if (typeof fsManager !== 'undefined' && fsManager.save) await fsManager.save();
        if (typeof desktop !== 'undefined' && desktop.render) desktop.render();
        if (typeof aktowkaApp !== 'undefined' && aktowkaApp.render) aktowkaApp.render();
        if (typeof apps !== 'undefined' && apps.showToast) {
            apps.showToast('BigAI', `Utworzono plik „${fileName}”`, 'success');
        }
        return newFile;
    },

    createSystemFolder: async (opts = {}) => {
        const folderName = String(typeof opts === 'string' ? opts : (opts.name || 'Nowy_Folder')).trim() || 'Nowy_Folder';
        const parentId = (typeof opts === 'object' && opts && opts.parentId) ? opts.parentId : 'root';
        const slot = (typeof desktop !== 'undefined' && typeof desktop.findFreeSlot === 'function')
            ? desktop.findFreeSlot()
            : { x: 110, y: 150 };
        const newFolder = {
            id: 'folder_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            type: 'folder',
            name: folderName,
            icon: '📁',
            parentId,
            x: slot.x,
            y: slot.y
        };
        if (typeof fileSystem !== 'undefined') fileSystem.push(newFolder);
        if (typeof fsManager !== 'undefined' && fsManager.save) await fsManager.save();
        if (typeof desktop !== 'undefined' && desktop.render) desktop.render();
        if (typeof aktowkaApp !== 'undefined' && aktowkaApp.render) aktowkaApp.render();
        if (typeof apps !== 'undefined' && apps.showToast) {
            apps.showToast('BigAI', `Utworzono folder „${folderName}”`, 'success');
        }
        return newFolder;
    },

    // ==================================================================
    // GENERATORY ZDJĘĆ I WIDEO 2026 (NANO BANANA / OMNI / VEO 3.1 / FLUX 3)
    // ==================================================================
    synthesizeProceduralArtwork: (prompt, modelInfo, isVideoFrame = false, frameIndex = 0) => {
        const canvas = document.createElement('canvas');
        canvas.width = 960;
        canvas.height = 540;
        const ctx = canvas.getContext('2d');
        const p = String(prompt || 'Krajobraz przyszłości BigOS').toLowerCase();

        // Dobór palety na podstawie słów kluczowych promptu
        let c1 = '#0f172a', c2 = '#1e1b4b', c3 = '#3b82f6', accent = '#f472b6';
        if (p.includes('las') || p.includes('natur') || p.includes('gór') || p.includes('drzew')) {
            c1 = '#052e16'; c2 = '#064e3b'; c3 = '#10b981'; accent = '#fde047';
        } else if (p.includes('zachód') || p.includes('słońc') || p.includes('pustyn') || p.includes('mars')) {
            c1 = '#451a03'; c2 = '#7c2d12'; c3 = '#f97316'; accent = '#fef08a';
        } else if (p.includes('ocean') || p.includes('morz') || p.includes('wod') || p.includes('plaż')) {
            c1 = '#082f49'; c2 = '#0369a1'; c3 = '#38bdf8'; accent = '#a5f3fc';
        } else if (p.includes('cyber') || p.includes('miasto') || p.includes('neon') || p.includes('futur')) {
            c1 = '#090d16'; c2 = '#2e1065'; c3 = '#d946ef'; accent = '#22d3ee';
        }

        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, c1);
        grad.addColorStop(0.6, c2);
        grad.addColorStop(1, c3);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Gwiazdy / cząsteczki świetlne
        let seed = 0;
        for (let i = 0; i < p.length; i++) seed = (seed * 31 + p.charCodeAt(i)) >>> 0;
        const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed & 0xfffffff) / 0xfffffff; };

        for (let i = 0; i < 70; i++) {
            const x = (rand() * canvas.width + frameIndex * (i % 3 + 1)) % canvas.width;
            const y = rand() * (canvas.height * 0.65);
            const r = rand() * 2.2 + 0.4;
            ctx.fillStyle = `rgba(255,255,255,${(rand() * 0.7 + 0.2).toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Słońce / księżyc / rdzeń świetlny
        const sunX = canvas.width * 0.72 + Math.sin(frameIndex * 0.08) * 18;
        const sunY = canvas.height * 0.32 + Math.cos(frameIndex * 0.08) * 10;
        const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 130);
        sunGrad.addColorStop(0, accent);
        sunGrad.addColorStop(0.4, c3);
        sunGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 130, 0, Math.PI * 2);
        ctx.fill();

        // Warstwy gór / sylwetki architektury
        for (let layer = 0; layer < 3; layer++) {
            ctx.beginPath();
            const baseY = canvas.height * (0.58 + layer * 0.12);
            ctx.moveTo(0, canvas.height);
            for (let x = 0; x <= canvas.width; x += 40) {
                const wave = Math.sin((x + layer * 120 + frameIndex * (layer + 1) * 2) * 0.012) * (42 - layer * 10)
                           + Math.cos((x - layer * 70) * 0.027) * 18;
                ctx.lineTo(x, baseY + wave);
            }
            ctx.lineTo(canvas.width, canvas.height);
            ctx.closePath();
            ctx.fillStyle = layer === 0 ? 'rgba(15,23,42,0.55)' : (layer === 1 ? 'rgba(9,13,22,0.78)' : '#050811');
            ctx.fill();
        }

        // Siatka perspektywiczna / refleksy
        ctx.strokeStyle = accent + '44';
        ctx.lineWidth = 1;
        for (let i = -8; i <= 8; i++) {
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2 + i * 25, canvas.height * 0.78);
            ctx.lineTo(canvas.width / 2 + i * 140, canvas.height);
            ctx.stroke();
        }

        // Etykieta modelu i promptu
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(18, canvas.height - 56, canvas.width - 36, 40);
        ctx.fillStyle = accent;
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`✨ ${modelInfo.badge || modelInfo.name}`, 30, canvas.height - 32);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '12px sans-serif';
        const shortPrompt = String(prompt || '').substring(0, 68);
        ctx.fillText(shortPrompt, 230, canvas.height - 32);

        return canvas;
    },

    generateImage: async (prompt, modelId, options = {}) => {
        const selectedId = modelId || podpowiadaczApp.settings.imageModel || 'nano-banana-2.1';
        const modelInfo = IMAGE_GENERATORS_DB.find(m => m.id === selectedId) || IMAGE_GENERATORS_DB[0];
        const cleanPrompt = String(prompt || 'Krajobraz przyszłości BigOS').trim();

        let dataUrl = '';
        const apiKey = podpowiadaczApp.settings.fluxApiKey || podpowiadaczApp.settings.apiKey;

        // Jeśli podano klucz Gemini API i wybrano model Nano Banana, spróbuj wywołania Gemini Image Generation
        if (apiKey && modelInfo.provider === 'gemini' && typeof fetch === 'function') {
            try {
                const geminiImgModel = selectedId === 'nano-banana-pro'
                    ? 'gemini-3.1-flash-image-preview'
                    : 'gemini-2.5-flash-image-preview';
                const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiImgModel}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: `Generate an image: ${cleanPrompt}` }] }],
                        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
                    })
                });
                if (resp.ok) {
                    const data = await resp.json();
                    const imgPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData && p.inlineData.data);
                    if (imgPart) {
                        const mime = imgPart.inlineData.mimeType || 'image/png';
                        dataUrl = `data:${mime};base64,${imgPart.inlineData.data}`;
                    }
                }
            } catch (_) { /* Fallback do lokalnego silnika renderującego */ }
        }

        if (!dataUrl) {
            const canvas = podpowiadaczApp.synthesizeProceduralArtwork(cleanPrompt, modelInfo, false, 0);
            dataUrl = canvas.toDataURL('image/png');
        }

        const safeSlug = cleanPrompt.toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]+/gi, '_').replace(/^_|_$/g, '').substring(0, 24) || 'obraz';
        const fileName = `${modelInfo.id}_${safeSlug}.png`;
        const slot = (typeof desktop !== 'undefined' && typeof desktop.findFreeSlot === 'function')
            ? desktop.findFreeSlot()
            : { x: 110, y: 150 };

        const newImgFile = {
            id: 'img_ai_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            type: 'image',
            name: fileName,
            icon: '🖼️',
            parentId: 'root',
            content: dataUrl,
            aiGenerator: modelInfo.id,
            aiPrompt: cleanPrompt,
            x: slot.x,
            y: slot.y
        };

        if (typeof fileSystem !== 'undefined') fileSystem.push(newImgFile);
        if (typeof fsManager !== 'undefined' && fsManager.save) await fsManager.save();
        if (typeof desktop !== 'undefined' && desktop.render) desktop.render();
        if (typeof patrzalkaApp !== 'undefined' && patrzalkaApp.renderGallery) patrzalkaApp.renderGallery();

        if (options.openInViewer && typeof patrzalkaApp !== 'undefined' && typeof patrzalkaApp.open === 'function') {
            patrzalkaApp.open(newImgFile);
        }

        if (typeof apps !== 'undefined' && apps.showToast) {
            apps.showToast(modelInfo.badge, `Wygenerowano i zapisano obraz: ${fileName}`, 'success');
        }

        return {
            ok: true,
            type: 'image',
            model: modelInfo.id,
            badge: modelInfo.badge,
            prompt: cleanPrompt,
            fileId: newImgFile.id,
            fileName: newImgFile.name,
            dataUrl
        };
    },

    generateVideo: async (prompt, modelId, options = {}) => {
        const selectedId = modelId || podpowiadaczApp.settings.videoModel || 'veo-3.1-fast';
        const modelInfo = VIDEO_GENERATORS_DB.find(m => m.id === selectedId) || VIDEO_GENERATORS_DB[0];
        const cleanPrompt = String(prompt || 'Animacja przestrzeni kosmicznej BigOS').trim();

        const posterCanvas = podpowiadaczApp.synthesizeProceduralArtwork(cleanPrompt, modelInfo, true, 0);
        const posterUrl = posterCanvas.toDataURL('image/png');
        let videoUrl = '';

        // Jeśli przeglądarka obsługuje MediaRecorder + canvas.captureStream, nagraj krótki klip WebM
        try {
            if (typeof posterCanvas.captureStream === 'function' && typeof MediaRecorder !== 'undefined') {
                const stream = posterCanvas.captureStream(15);
                const chunks = [];
                const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : undefined });
                recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
                const stopped = new Promise(resolve => { recorder.onstop = resolve; });
                recorder.start();
                for (let f = 1; f <= 8; f++) {
                    const frameCanvas = podpowiadaczApp.synthesizeProceduralArtwork(cleanPrompt, modelInfo, true, f * 4);
                    const ctx = posterCanvas.getContext('2d');
                    ctx.drawImage(frameCanvas, 0, 0);
                    await new Promise(r => setTimeout(r, 35));
                }
                recorder.stop();
                await stopped;
                if (chunks.length > 0) {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    videoUrl = URL.createObjectURL(blob);
                }
            }
        } catch (_) { /* Fallback na posterUrl */ }

        const safeSlug = cleanPrompt.toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]+/gi, '_').replace(/^_|_$/g, '').substring(0, 24) || 'wideo';
        const fileName = `${modelInfo.id}_${safeSlug}.webm`;
        const slot = (typeof desktop !== 'undefined' && typeof desktop.findFreeSlot === 'function')
            ? desktop.findFreeSlot()
            : { x: 110, y: 150 };

        const newVidFile = {
            id: 'vid_ai_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            type: 'video',
            name: fileName,
            icon: '🎬',
            parentId: 'root',
            url: videoUrl || posterUrl,
            content: posterUrl,
            aiGenerator: modelInfo.id,
            aiPrompt: cleanPrompt,
            x: slot.x,
            y: slot.y
        };

        if (typeof fileSystem !== 'undefined') fileSystem.push(newVidFile);
        if (typeof fsManager !== 'undefined' && fsManager.save) await fsManager.save();
        if (typeof desktop !== 'undefined' && desktop.render) desktop.render();

        if (typeof apps !== 'undefined' && apps.showToast) {
            apps.showToast(modelInfo.badge, `Wygenerowano wideo: ${fileName}`, 'success');
        }

        return {
            ok: true,
            type: 'video',
            model: modelInfo.id,
            badge: modelInfo.badge,
            prompt: cleanPrompt,
            fileId: newVidFile.id,
            fileName: newVidFile.name,
            videoUrl,
            posterUrl
        };
    },

    openGeneratedMedia: (fileId, mediaType) => {
        const f = (typeof fileSystem !== 'undefined' ? fileSystem : []).find(x => x && x.id === fileId);
        if (mediaType === 'image') {
            if (f && typeof patrzalkaApp !== 'undefined' && typeof patrzalkaApp.open === 'function') {
                patrzalkaApp.open(f);
            } else {
                podpowiadaczApp.openImageInPatrzalka(fileId);
            }
        } else if (mediaType === 'video') {
            if (typeof winManager !== 'undefined') winManager.open('grajacz');
            if (f && typeof grajaczApp !== 'undefined' && typeof grajaczApp.open === 'function') {
                grajaczApp.open(f);
            }
        }
    },

    setGeneratedAsWallpaper: (fileId) => {
        const f = (typeof fileSystem !== 'undefined' ? fileSystem : []).find(x => x && x.id === fileId);
        if (!f || !f.content) return;
        const bg = document.getElementById('desktop-bg');
        if (bg) {
            bg.style.backgroundImage = `url('${f.content}')`;
            bg.classList.add('custom-wp');
        }
        if (typeof bigosDB !== 'undefined') bigosDB.set('bigos_bg', f.content);
        if (typeof apps !== 'undefined' && apps.showToast) {
            apps.showToast('Tapeta BigOS', `Ustawiono obraz „${f.name}” jako tapetę pulpitu!`, 'success');
        }
    },

    openMediaStudioModal: (mode = 'image') => {
        const isImg = mode !== 'video';
        const modalId = 'ai-media-studio-modal';
        let modal = document.getElementById(modalId);
        if (modal) modal.remove();

        const models = isImg ? IMAGE_GENERATORS_DB : VIDEO_GENERATORS_DB;
        const currentSelected = isImg ? podpowiadaczApp.settings.imageModel : podpowiadaczApp.settings.videoModel;

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/75 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl max-w-md w-full border g-border shadow-2xl flex flex-col gap-4">
                <h3 class="font-bold text-base g-text flex items-center gap-2 border-b g-border pb-2">
                    <span>${isImg ? '🖼️' : '🎬'}</span> ${isImg ? 'Generator Zdjęć BigAI (Nano Banana / FLUX 3)' : 'Generator Wideo BigAI (Omni / Veo 3.1 / FLUX 3)'}
                </h3>
                <div>
                    <label class="block text-[10px] uppercase font-bold g-text-muted mb-1">Wybierz Model Generatora</label>
                    <select id="ai-studio-model" class="w-full p-2.5 rounded g-bg g-text border g-border outline-none text-xs font-bold shadow-inner">
                        ${models.map(m => `<option value="${m.id}" ${m.id === currentSelected ? 'selected' : ''}>${m.name}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] uppercase font-bold g-text-muted mb-1">Opis sceny (Prompt)</label>
                    <textarea id="ai-studio-prompt" rows="3" placeholder="${isImg ? 'Np. Cyberpunkowe miasto nocą w deszczu, neony, 8k...' : 'Np. Lot drona nad ośnieżonymi górami o zachodzie słońca...'}" class="w-full p-2.5 rounded g-bg g-text border g-border outline-none text-xs shadow-inner resize-none"></textarea>
                </div>
                <div class="flex justify-end gap-2 pt-2 border-t g-border">
                    <button id="ai-studio-cancel" class="px-4 py-2 g-btn rounded-lg text-xs font-semibold">Anuluj</button>
                    <button id="ai-studio-generate" class="px-5 py-2 ${isImg ? 'bg-pink-600 hover:bg-pink-500' : 'bg-purple-600 hover:bg-purple-500'} text-white rounded-lg text-xs font-bold shadow-lg transition">✨ Generuj ${isImg ? 'Zdjęcie' : 'Wideo'}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#ai-studio-cancel').onclick = () => modal.remove();
        modal.querySelector('#ai-studio-generate').onclick = async () => {
            const chosenModel = modal.querySelector('#ai-studio-model').value;
            const promptVal = modal.querySelector('#ai-studio-prompt').value.trim() || (isImg ? 'Futurystyczna panorama BigOS 2026' : 'Dynamiczny lot przez galaktykę BigOS 2026');
            if (isImg) podpowiadaczApp.settings.imageModel = chosenModel;
            else podpowiadaczApp.settings.videoModel = chosenModel;
            podpowiadaczApp.saveData();
            modal.remove();

            podpowiadaczApp.messages.push({
                role: 'user',
                text: `${isImg ? '🖼️ Wygeneruj zdjęcie' : '🎬 Wygeneruj wideo'} (${chosenModel}): ${promptVal}`
            });
            podpowiadaczApp.isThinking = true;
            podpowiadaczApp.renderChat();

            const mediaRes = isImg
                ? await podpowiadaczApp.generateImage(promptVal, chosenModel)
                : await podpowiadaczApp.generateVideo(promptVal, chosenModel);

            podpowiadaczApp.isThinking = false;
            podpowiadaczApp.messages.push({
                role: 'assistant',
                text: `✨ Wygenerowano ${isImg ? 'zdjęcie' : 'wideo'} przy użyciu silnika **${mediaRes.badge}** i zapisano na pulpicie jako \`${mediaRes.fileName}\`.`,
                mediaPreview: mediaRes
            });
            podpowiadaczApp.saveData();
            podpowiadaczApp.renderChat();
        };
    },

    // ==================================================================
    // INTEGRACJA Z SYSTEMEM (strukturalne, walidowane akcje)
    // ==================================================================
    extractCommands: (aiText) => {
        let cleanText = aiText || '';
        let commands = [];
        const regex = /\[BIGOS:([a-zA-Z0-9_\-]+):([\s\S]*?)\]/g;
        let match;

        while ((match = regex.exec(aiText || '')) !== null) {
            commands.push({ action: match[1].toLowerCase().trim(), param: match[2].trim() });
        }
        cleanText = cleanText.replace(/\[BIGOS:([a-zA-Z0-9_\-]+):([\s\S]*?)\]/g, '').trim();
        return { cleanText, commands, mapQuery: null };
    },

    ALLOWED_ACTIONS: {
        open_app: true, close_app: true, close_all_apps: true,
        set_theme: true, set_wallpaper: true,
        open_file: true, open_image: true,
        create_file: true, create_folder: true, delete_file: true,
        write_file: true, skryba_note: true, dictate_to_skryba: true,
        search_web: true, generate_image: true, generate_video: true,
        create_app: true, format_system: true
    },

    validateCommand: (cmd) => {
        if (!cmd || typeof cmd !== 'object') return { ok: false, error: 'empty command' };
        if (!podpowiadaczApp.ALLOWED_ACTIONS[cmd.action]) {
            return { ok: false, error: 'nieznana akcja: ' + cmd.action };
        }
        if (cmd.action === 'write_file') {
            let parsed = cmd.param;
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch (e) {
                    return { ok: false, error: 'write_file wymaga poprawnego JSON w formacie {"name":"plik.txt","content":"tekst"}' };
                }
            }
            if (!parsed || typeof parsed !== 'object') {
                return { ok: false, error: 'write_file wymaga obiektu z polami name/id i content' };
            }
            const targetName = parsed.name || parsed.id;
            if (!targetName || typeof targetName !== 'string') {
                return { ok: false, error: 'write_file: brak nazwy lub id pliku' };
            }
            if (typeof parsed.content !== 'string') {
                return { ok: false, error: 'write_file: pole content musi być ciągiem znaków' };
            }
            if (parsed.content.length > 500000) {
                return { ok: false, error: 'write_file: treść pliku jest za długa' };
            }
            cmd.parsedParam = parsed;
            return { ok: true };
        }

        if (cmd.action === 'skryba_note' || cmd.action === 'dictate_to_skryba' || cmd.action === 'create_file' || cmd.action === 'generate_image' || cmd.action === 'generate_video') {
            if (typeof cmd.param === 'object' && cmd.param !== null) {
                cmd.parsedParam = cmd.param;
                return { ok: true };
            }
            const strParam = String(cmd.param == null ? '' : cmd.param).trim();
            if (strParam.startsWith('{') && strParam.endsWith('}')) {
                try { cmd.parsedParam = JSON.parse(strParam); return { ok: true }; } catch (_) {}
            }
            if (strParam.length > 10000) return { ok: false, error: 'parametr za długi' };
            return { ok: true };
        }

        const param = String(cmd.param == null ? '' : cmd.param);
        if (param.length > 500) return { ok: false, error: 'parametr za długi' };
        if (cmd.action === 'open_app' || cmd.action === 'close_app') {
            if (!/^[a-zA-Z0-9_\-ąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]+$/.test(param)) return { ok: false, error: 'nieprawidłowe id aplikacji' };
        }
        return { ok: true };
    },

    findFileByParam: (param) => {
        const q = String(param).toLowerCase().trim();
        return (typeof fileSystem !== 'undefined' ? fileSystem : []).find(f =>
            f && f.parentId !== 'hasiok' && (f.id === param || (f.name || '').toLowerCase() === q || (f.name || '').toLowerCase().includes(q))
        );
    },

    runCommands: async (commands) => {
        const results = [];
        for (const cmd of commands) {
            const v = podpowiadaczApp.validateCommand(cmd);
            if (!v.ok) {
                results.push({ cmd, ok: false, error: v.error });
                if (typeof apps !== 'undefined') apps.showToast('BigAI', 'Odrzucono akcję: ' + v.error, 'error');
                continue;
            }
            const action = cmd.action;
            const param = cmd.param;
            try {
                if (action === 'open_app') {
                    const id = podpowiadaczApp.resolveAppId(param);
                    if (typeof defaultApps !== 'undefined' && !defaultApps.find(a => a.appId === id) && !document.getElementById('app-' + id)) {
                        results.push({ cmd, ok: false, error: 'aplikacja nie istnieje: ' + id });
                        if (typeof apps !== 'undefined') apps.showToast('BigAI', 'Nie ma aplikacji o id: ' + id, 'error');
                        continue;
                    }
                    if (typeof winManager !== 'undefined') winManager.open(id);
                    results.push({ cmd, ok: true, appId: id });
                }
                else if (action === 'close_app') {
                    const raw = String(param).toLowerCase().trim();
                    if (raw === 'all' || raw === 'wszystkie' || raw === 'wszystko') {
                        document.querySelectorAll('.window.active').forEach(w => {
                            const appId = w.id.replace(/^app-/, '');
                            if (appId !== 'podpowiadacz' && typeof winManager !== 'undefined') winManager.close(appId);
                        });
                        results.push({ cmd, ok: true, closedAll: true });
                    } else {
                        const id = podpowiadaczApp.resolveAppId(param);
                        if (typeof winManager !== 'undefined') winManager.close(id);
                        results.push({ cmd, ok: true, appId: id });
                    }
                }
                else if (action === 'close_all_apps') {
                    document.querySelectorAll('.window.active').forEach(w => {
                        const appId = w.id.replace(/^app-/, '');
                        if (appId !== 'podpowiadacz' && typeof winManager !== 'undefined') winManager.close(appId);
                    });
                    results.push({ cmd, ok: true });
                }
                else if (action === 'search_web') {
                    const ok = podpowiadaczApp.searchInSiecioslaw(param);
                    results.push({ cmd, ok, query: param });
                }
                else if (action === 'open_image') {
                    const img = podpowiadaczApp.openImageInPatrzalka(param);
                    results.push({ cmd, ok: true, imageId: img ? img.id : null });
                }
                else if (action === 'skryba_note' || action === 'dictate_to_skryba') {
                    const pObj = cmd.parsedParam || (typeof param === 'object' ? param : { title: 'Notatka_z_BigAI.html', content: String(param) });
                    const noteFile = await podpowiadaczApp.writeToSkryba(pObj);
                    results.push({ cmd, ok: true, fileId: noteFile ? noteFile.id : null });
                }
                else if (action === 'create_file') {
                    const pObj = cmd.parsedParam || (typeof param === 'object' ? param : { name: String(param), content: '' });
                    const created = await podpowiadaczApp.createSystemFile(pObj);
                    results.push({ cmd, ok: true, fileId: created.id, name: created.name });
                }
                else if (action === 'create_folder') {
                    const created = await podpowiadaczApp.createSystemFolder(param);
                    results.push({ cmd, ok: true, folderId: created.id, name: created.name });
                }
                else if (action === 'delete_file') {
                    const f = podpowiadaczApp.findFileByParam(param);
                    if (!f) { results.push({ cmd, ok: false, error: 'nie znaleziono pliku' }); continue; }
                    f.parentId = 'hasiok';
                    if (typeof fsManager !== 'undefined' && fsManager.save) await fsManager.save();
                    if (typeof desktop !== 'undefined' && desktop.render) desktop.render();
                    results.push({ cmd, ok: true, fileId: f.id });
                }
                else if (action === 'generate_image') {
                    const pObj = cmd.parsedParam || (typeof param === 'object' ? param : { prompt: String(param) });
                    const imgRes = await podpowiadaczApp.generateImage(pObj.prompt || String(param), pObj.model || podpowiadaczApp.settings.imageModel, pObj);
                    const lastAssistantMsg = [...podpowiadaczApp.messages].reverse().find(m => m.role === 'assistant');
                    if (lastAssistantMsg && !lastAssistantMsg.mediaPreview) {
                        lastAssistantMsg.mediaPreview = imgRes;
                        podpowiadaczApp.saveData();
                        podpowiadaczApp.renderChat();
                    }
                    results.push({ cmd, ok: true, fileId: imgRes.fileId, model: imgRes.model });
                }
                else if (action === 'generate_video') {
                    const pObj = cmd.parsedParam || (typeof param === 'object' ? param : { prompt: String(param) });
                    const vidRes = await podpowiadaczApp.generateVideo(pObj.prompt || String(param), pObj.model || podpowiadaczApp.settings.videoModel, pObj);
                    const lastAssistantMsg = [...podpowiadaczApp.messages].reverse().find(m => m.role === 'assistant');
                    if (lastAssistantMsg && !lastAssistantMsg.mediaPreview) {
                        lastAssistantMsg.mediaPreview = vidRes;
                        podpowiadaczApp.saveData();
                        podpowiadaczApp.renderChat();
                    }
                    results.push({ cmd, ok: true, fileId: vidRes.fileId, model: vidRes.model });
                }
                else if (action === 'set_theme') {
                    if(typeof themeManager !== 'undefined') themeManager.applyTheme(param); else if(typeof apps !== 'undefined') apps.setTheme(param);
                    results.push({ cmd, ok: true });
                }
                else if (action === 'set_wallpaper') {
                    const bg = document.getElementById('desktop-bg'); let url = param;
                    if(param === 'kosmos') url = 'tapety/kosmos.webp'; if(param === 'bigos') url = 'tapety/bigos.webp';
                    if(param === 'ferrari') url = 'tapety/ferrari.webp'; if(param === 'abstrakcja') url = 'tapety/abstrakcja.webp';
                    const allowed = ['tapety/kosmos.webp','tapety/bigos.webp','tapety/ferrari.webp','tapety/abstrakcja.webp',
                        'tapety/avocado-avoraiser.webp','tapety/avocado-core.webp','tapety/bursztyn1.webp','tapety/bursztyn2.webp',
                        'tapety/bursztyn3.webp','tapety/bursztyn4.webp'];
                    if (!allowed.includes(url)) { results.push({ cmd, ok: false, error: 'niedozwolona tapeta' }); continue; }
                    if (bg) { bg.style.backgroundImage = `url('${url}')`; bg.classList.add('custom-wp'); }
                    if (typeof bigosDB !== 'undefined') bigosDB.set('bigos_bg', url);
                    results.push({ cmd, ok: true });
                }
                else if (action === 'open_file') {
                    const f = podpowiadaczApp.findFileByParam(param);
                    if (!f) { results.push({ cmd, ok: false, error: 'nie znaleziono pliku' }); continue; }
                    if (typeof desktop !== 'undefined') desktop.executeItem(f);
                    results.push({ cmd, ok: true, preview: { id: f.id, name: f.name } });
                }
                else if (action === 'format_system') {
                    const confirmed = await new Promise((resolve) => {
                        const modal = document.createElement('div');
                        modal.className = 'fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm';
                        modal.innerHTML = `
                            <div class="g-panel p-6 rounded-2xl max-w-sm w-full border g-border shadow-2xl flex flex-col">
                                <h3 class="font-bold text-base text-red-500 mb-2 flex items-center gap-2">
                                    <span>⚠️</span> BigAI: Formatowanie systemu
                                </h3>
                                <p class="text-xs g-text-muted mb-4 leading-relaxed">
                                    Ta operacja bezpowrotnie wyczyści magazyn danych BigOS: wszystkie pliki, historię wersji, zainstalowane aplikacje oraz zresetuje hasło i ustawienia do stanu początkowego.
                                </p>
                                <div class="flex gap-2 justify-end shrink-0 pt-2 border-t g-border">
                                    <button data-x="no" class="px-4 py-2 g-btn rounded text-xs font-semibold hover:bg-white/10 transition">Anuluj</button>
                                    <button data-x="yes" class="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-xs shadow-lg transition">Potwierdź formatowanie</button>
                                </div>
                            </div>
                        `;
                        document.body.appendChild(modal);
                        modal.querySelector('[data-x="no"]').onclick = () => { modal.remove(); resolve(false); };
                        modal.querySelector('[data-x="yes"]').onclick = () => { modal.remove(); resolve(true); };
                    });
                    if (!confirmed) { results.push({ cmd, ok: false, error: 'anulowano' }); continue; }
                    if (typeof bigosMaintenance === 'undefined') {
                        results.push({ cmd, ok: false, error: 'moduł konserwacji niedostępny' });
                        continue;
                    }
                    const fmtRes = await bigosMaintenance.formatSystem({ confirm: false });
                    if (fmtRes && fmtRes.ok) results.push({ cmd, ok: true });
                    else results.push({ cmd, ok: false, error: (fmtRes && fmtRes.message) || 'formatowanie nie powiodło się' });
                }
                else if (action === 'write_file') {
                    const target = cmd.parsedParam || (typeof param === 'object' && param !== null ? param : { name: param });
                    const targetName = String(target.name || target.id || '');
                    const newContent = typeof target.content === 'string' ? target.content : '';
                    const existingFile = podpowiadaczApp.findFileByParam(targetName) ||
                        (target.id ? (typeof fileSystem !== 'undefined' ? fileSystem.find(x => x.id === target.id) : null) : null);
                    const oldContent = existingFile ? (typeof existingFile.content === 'string' ? existingFile.content : '') : '(Nowy plik)';

                    const confirmed = await new Promise((resolve) => {
                        const modal = document.createElement('div');
                        modal.className = 'fixed inset-0 bg-black/75 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm';
                        modal.innerHTML = `
                            <div class="g-panel p-6 rounded-2xl max-w-lg w-full border g-border shadow-2xl flex flex-col max-h-[80vh]">
                                <h3 class="font-bold text-base g-text mb-2 flex items-center gap-2">
                                    <span>📝</span> BigAI: Potwierdź zapis pliku „${typeof desktop !== 'undefined' ? desktop.escapeHTML(targetName) : targetName}”
                                </h3>
                                <p class="text-xs g-text-muted mb-3">AI proponuje modyfikację zawartości pliku. Przejrzyj różnice przed zatwierdzeniem:</p>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-grow overflow-hidden mb-4">
                                    <div class="flex flex-col min-h-0">
                                        <div class="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">Poprzednia treść:</div>
                                        <pre class="flex-grow p-2.5 bg-black/60 rounded text-gray-300 font-mono text-xs overflow-auto border g-border max-h-48 leading-relaxed">${typeof desktop !== 'undefined' ? desktop.escapeHTML(oldContent) : oldContent}</pre>
                                    </div>
                                    <div class="flex flex-col min-h-0">
                                        <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">Nowa treść (BigAI):</div>
                                        <pre class="flex-grow p-2.5 bg-black/60 rounded text-emerald-300 font-mono text-xs overflow-auto border g-border max-h-48 leading-relaxed">${typeof desktop !== 'undefined' ? desktop.escapeHTML(newContent) : newContent}</pre>
                                    </div>
                                </div>
                                <div class="flex gap-2 justify-end shrink-0 pt-2 border-t g-border">
                                    <button data-x="no" class="px-4 py-2 g-btn rounded text-xs font-semibold hover:bg-white/10 transition">Odrzuć</button>
                                    <button data-x="yes" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs shadow-lg transition">Zastosuj zmianę</button>
                                </div>
                            </div>
                        `;
                        document.body.appendChild(modal);
                        modal.querySelector('[data-x="no"]').onclick = () => { modal.remove(); resolve(false); };
                        modal.querySelector('[data-x="yes"]').onclick = () => { modal.remove(); resolve(true); };
                    });

                    if (!confirmed) {
                        results.push({ cmd, ok: false, error: 'odrzucono przez użytkownika' });
                        continue;
                    }

                    let f = existingFile;
                    let before = oldContent;
                    if (!f) {
                        const slot = (typeof desktop !== 'undefined' && typeof desktop.findFreeSlot === 'function')
                            ? desktop.findFreeSlot()
                            : { x: 40, y: 40 };
                        f = {
                            id: 'file_' + Date.now(),
                            type: 'file',
                            name: targetName.endsWith('.txt') ? targetName : targetName + '.txt',
                            icon: '📄',
                            parentId: 'root',
                            content: newContent,
                            x: slot.x,
                            y: slot.y
                        };
                        if (typeof fileSystem !== 'undefined') fileSystem.push(f);
                        before = '';
                    } else {
                        if (typeof bigosDocHistory !== 'undefined') {
                            const snap = await bigosDocHistory.snapshot(f.id, before, 'przed-zmiana-bigai');
                            if (snap && snap.ok === false) {
                                results.push({ cmd, ok: false, error: 'nie udało się zapisać kopii undo: ' + (snap.error || '') });
                                continue;
                            }
                        }
                        f.content = newContent;
                    }

                    if (typeof fsManager !== 'undefined' && fsManager.markDirty) fsManager.markDirty(f.id);
                    let saveOk = true;
                    if (typeof fsManager !== 'undefined' && fsManager.save) {
                        const saveRes = await fsManager.save();
                        saveOk = !(Array.isArray(saveRes) && saveRes.some(r => r && r.ok === false));
                    }
                    if (!saveOk) {
                        f.content = before;
                        results.push({ cmd, ok: false, error: 'zapis nie powiódł się' });
                        continue;
                    }

                    // Synchronize Skryba editor DOM and stats if this file is currently open
                    if (typeof window.skrybaApp !== 'undefined' && window.skrybaApp.currentFileId === f.id) {
                        const editor = document.getElementById('skryba-editor');
                        const rawEditor = document.getElementById('skryba-raw-editor');
                        if (editor) editor.innerHTML = newContent;
                        if (rawEditor) rawEditor.value = newContent;
                        if (typeof window.skrybaApp.updateStats === 'function') window.skrybaApp.updateStats();
                        if (typeof window.skrybaApp.renderSidebar === 'function') window.skrybaApp.renderSidebar();
                        window.skrybaApp.isDirty = false;
                        const statusEl = document.getElementById('skryba-save-status');
                        if (statusEl) statusEl.innerHTML = '<span class="text-emerald-400">● Zapisano (BigAI)</span>';
                    }

                    if (typeof apps !== 'undefined') {
                        apps.showToast('BigAI', 'Plik został pomyślnie zaktualizowany.', 'success');
                    }
                    results.push({ cmd, ok: true, undoAvailable: true, fileId: f.id });
                }
            } catch (e) {
                results.push({ cmd, ok: false, error: e.message });
                if (typeof apps !== 'undefined') apps.showToast('BigAI', 'Błąd akcji: ' + e.message, 'error');
            }
        }
        return results;
    },

    // ==================================================================
    // INTELIGENTNY PARSER POLECEŃ SYSTEMOWYCH BIGOS (PL / GŁOS / CZAT)
    // ==================================================================
    parseNaturalCommands: (userText) => {
        const text = String(userText || '').trim();
        const lower = text.toLowerCase();

        // 1. Tworzenie nowej aplikacji w BigOS (gdy użytkownik prosi o napisanie/stworzenie programu/aplikacji)
        if ((lower.includes('napisz aplikacj') || lower.includes('stwórz aplikacj') || lower.includes('utwórz aplikacj') || lower.includes('zbuduj aplikacj') || lower.includes('napisz program')) && !lower.includes('otwórz')) {
            return `Oto wygenerowana aplikacja na Twoje życzenie:\n\n\`\`\`javascript\nwindow.BigOSAppAPI.register({\n    id: 'kalkulator_demo',\n    name: 'Kalkulator Demo',\n    icon: '🧮',\n    width: '320px',\n    height: 'auto',\n    html: \`\n        <div class="flex flex-col gap-2 p-2">\n            <input type="number" id="demo_num" class="g-bg g-text p-2 rounded border g-border" value="10">\n            <button onclick="window.KalkulatorDemo.podwoj()" class="g-btn p-2 rounded">Podwój</button>\n            <div id="demo_res" class="g-text font-bold">Wynik: 20</div>\n        </div>\n    \`,\n    globalName: 'KalkulatorDemo',\n    global: {\n        podwoj: () => {\n            const val = parseFloat(document.getElementById('demo_num').value) || 0;\n            document.getElementById('demo_res').innerText = 'Wynik: ' + (val * 2);\n        }\n    }\n});\n\`\`\``;
        }

        // 2. Generowanie WIDEO (Omni 1.1 Flash / Veo 3.1-lite / Veo 3.1 -fast / Veo3.1- Quality / FLUX 3)
        if (/(?:wygeneruj|stwórz|zrób|nagraj)\s+(?:wideo|video|film|animacj[ęe])/i.test(lower)) {
            let model = podpowiadaczApp.settings.videoModel || 'veo-3.1-fast';
            if (lower.includes('omni')) model = 'omni-1.1-flash';
            else if (lower.includes('lite')) model = 'veo-3.1-lite';
            else if (lower.includes('quality') || lower.includes('jakoś')) model = 'veo-3.1-quality';
            else if (lower.includes('veo')) model = 'veo-3.1-fast';
            else if (lower.includes('flux')) model = 'flux-3-video';

            const promptClean = text
                .replace(/^(?:wygeneruj|stwórz|zrób|nagraj)\s+(?:wideo|video|film|animacj[ęe])\s*/i, '')
                .replace(/\b(?:w|przez|modelem|używając)\s+(?:omni\s*1\.1\s*flash|veo\s*3\.1[\s\-]*(?:lite|fast|quality)?|flux\s*3)\b/gi, '')
                .trim() || 'Futurystyczna animacja BigOS 2026';
            const payload = JSON.stringify({ prompt: promptClean, model });
            return `[BIGOS:generate_video:${payload}] 🎬 Generuję wideo za pomocą silnika **${model}** dla opisu: *"${promptClean}"*.`;
        }

        // 3. Generowanie ZDJĘĆ / OBRAZÓW (Nano Banana 2.1 / Nano Banana Pro / Nano Banana 2 lite / FLUX 3)
        if (/(?:wygeneruj|stwórz|namaluj|narysuj)\s+(?:zdjęci[ea]|zdjeci[ea]|obraz|obrazek|grafik[ęe]|ilustracj[ęe])/i.test(lower)) {
            let model = podpowiadaczApp.settings.imageModel || 'nano-banana-2.1';
            if (lower.includes('banana pro') || lower.includes('nano banana pro')) model = 'nano-banana-pro';
            else if (lower.includes('banana 2 lite') || lower.includes('banana lite')) model = 'nano-banana-2-lite';
            else if (lower.includes('banana')) model = 'nano-banana-2.1';
            else if (lower.includes('flux')) model = 'flux-3';

            const promptClean = text
                .replace(/^(?:wygeneruj|stwórz|namaluj|narysuj)\s+(?:zdjęci[ea]|zdjeci[ea]|obraz|obrazek|grafik[ęe]|ilustracj[ęe])\s*/i, '')
                .replace(/\b(?:w|przez|modelem|używając)\s+(?:gemini\s+)?(?:nano\s*banana(?:\s*2\.1|\s*pro|\s*2\s*lite)?|flux\s*3)\b/gi, '')
                .trim() || 'Krajobraz przyszłości BigOS 2026';
            const payload = JSON.stringify({ prompt: promptClean, model });
            return `[BIGOS:generate_image:${payload}] 🖼️ Generuję zdjęcie przy użyciu modelu **${model}** dla opisu: *"${promptClean}"*.`;
        }

        // 4. Otwarcie Skryby i zapisanie notatki / dyktowania
        if ((lower.includes('skryb') || lower.includes('notatnik') || lower.includes('notatk') || lower.includes('zanotuj')) &&
            (lower.includes('zapisz') || lower.includes('zanotuj') || lower.includes('wpisz') || lower.includes('napisz') || lower.includes('dodaj'))) {
            let noteText = text;
            const colonIdx = text.indexOf(':');
            if (colonIdx !== -1 && colonIdx < text.length - 1) {
                noteText = text.substring(colonIdx + 1).trim();
            } else {
                const m = text.match(/(?:zapisz|zanotuj|wpisz|napisz|dodaj)(?:\s+w\s+skrybie|\s+notatkę|\s+notatke|\s+tekst|\s+informację|\s+informacje|\s+że|\s+ze)?\s+(.+)$/i);
                if (m && m[1]) noteText = m[1].trim();
            }
            const payload = JSON.stringify({ title: 'Notatka_z_BigAI.html', content: noteText, append: false });
            return `[BIGOS:skryba_note:${payload}] 📝 Otwieram program **Skryba** i zapisuję podyktowaną notatkę: *"${noteText}"*.`;
        }

        // 5. Wyszukiwanie informacji w przeglądarce Sieciosław
        if (lower.includes('sieciosław') || lower.includes('siecioslaw') || lower.includes('wyszukaj') || lower.includes('szukaj w przeglądarce') || lower.includes('szukaj w internecie') || lower.includes('znajdź w internecie')) {
            let query = text
                .replace(/^(?:otwórz\s+(?:przeglądarkę\s+)?sieciosław(?:ia|iu)?\s+i\s+)?/i, '')
                .replace(/^(?:wyszukaj|poszukaj|szukaj|znajdź|sprawdź)\s+/i, '')
                .replace(/^(?:w\s+przeglądarce(?:\s+sieciosław(?:iu)?)?|w\s+sieciosławiu|w\s+siecioslawiu|w\s+internecie)\s+/i, '')
                .replace(/^(?:informacje\s+o|informacji\s+o|na\s+temat|hasło)\s+/i, '')
                .trim();
            if (!query) query = 'BigOS System Operacyjny';
            return `[BIGOS:search_web:${query}] 🌐 Otwieram przeglądarkę **Sieciosław** i wyszukuję informacje: **${query}**.`;
        }

        // 6. Otwieranie grafiki / zdjęć w Patrzałce
        if ((lower.includes('otwórz') || lower.includes('pokaż') || lower.includes('wyświetl') || lower.includes('zobacz')) &&
            (lower.includes('grafik') || lower.includes('zdjęci') || lower.includes('zdjeci') || lower.includes('obraz') || lower.includes('patrzałk') || lower.includes('patrzalk'))) {
            let imgQuery = text
                .replace(/^(?:otwórz|pokaż|wyświetl|zobacz)\s+/i, '')
                .replace(/^(?:w\s+patrzałce|w\s+galerii)\s*/i, '')
                .replace(/^(?:grafikę|grafike|grafika|zdjęcie|zdjecie|obraz|obrazek)\s*/i, '')
                .replace(/\s+(?:w\s+patrzałce|w\s+galerii)$/i, '')
                .trim();
            if (!imgQuery || imgQuery.toLowerCase().includes('patrzałk') || imgQuery.toLowerCase().includes('patrzalk')) {
                imgQuery = 'ostatnie';
            }
            return `[BIGOS:open_image:${imgQuery}] 🖼️ Otwieram grafikę w aplikacji **Patrzałka**.`;
        }

        // 7. Tworzenie folderu / katalogu
        if (/(?:stwórz|utwórz|zrób|dodaj|nowy)\s+(?:folder|katalog)/i.test(lower)) {
            const m = text.match(/(?:folder|katalog)(?:\s+o\s+nazwie)?\s+["„']?([^"”'\n]+)["”']?$/i);
            const folderName = (m && m[1] ? m[1].trim() : 'Nowy_Folder');
            return `[BIGOS:create_folder:${folderName}] 📁 Tworzę nowy folder **${folderName}** na pulpicie BigOS.`;
        }

        // 8. Edycja istniejącego pliku z potwierdzeniem (write_file)
        if (lower.includes('napisz plik') || lower.includes('edytuj plik')) {
            return `[BIGOS:write_file:{"name":"notatka.txt","content":"Zawartość wygenerowana przez Symulator BigAI."}] Zapisuję plik notatka.txt.`;
        }

        // 9. Tworzenie nowego pliku na pulpicie (create_file)
        if (/(?:stwórz|utwórz|zrób|dodaj)\s+plik/i.test(lower)) {
            let name = 'nowy_plik.txt';
            let content = '';
            const withContent = text.match(/plik\s+(?:o\s+nazwie\s+)?([^\s]+)\s+(?:z\s+treścią|z\s+zawartością|o\s+treści|:)\s*(.+)$/i);
            if (withContent) {
                name = withContent[1].replace(/["„”']/g, '').trim();
                content = withContent[2].trim();
            } else {
                const nameMatch = text.match(/plik\s+(?:o\s+nazwie\s+)?([^\s"„”']+)/i);
                if (nameMatch && nameMatch[1]) name = nameMatch[1].trim();
            }
            const payload = JSON.stringify({ name, content });
            return `[BIGOS:create_file:${payload}] 📄 Tworzę plik **${name}** na pulpicie BigOS.`;
        }

        // 10. Zamykanie aplikacji
        if (lower.includes('zamknij') || lower.includes('wyłącz aplikacj')) {
            if (lower.includes('wszystk')) {
                return `[BIGOS:close_all_apps:all] 🔒 Zamykam wszystkie otwarte aplikacje w systemie BigOS.`;
            }
            const appMatch = text.match(/(?:zamknij|wyłącz)\s+(?:aplikację\s+|program\s+|okno\s+|grę\s+)?(.+)$/i);
            const rawTarget = appMatch && appMatch[1] ? appMatch[1].trim() : 'kalkulator';
            const resolvedId = podpowiadaczApp.resolveAppId(rawTarget);
            return `[BIGOS:close_app:${resolvedId}] 🔒 Zamykam aplikację **${rawTarget}** (\`${resolvedId}\`).`;
        }

        // 11. Otwieranie pliku
        if ((lower.includes('otwórz plik') || lower.includes('uruchom plik'))) {
            const fMatch = text.match(/plik\s+(?:o\s+nazwie\s+)?(.+)$/i);
            const fName = fMatch && fMatch[1] ? fMatch[1].trim() : 'BigOS';
            return `[BIGOS:open_file:${fName}] 📂 Otwieram plik **${fName}**.`;
        }

        // 12. Otwieranie dowolnej aplikacji w systemie BigOS
        if (lower.includes('otwórz') || lower.includes('uruchom') || lower.includes('włącz')) {
            const appMatch = text.match(/(?:otwórz|uruchom|włącz)\s+(?:aplikację\s+|program\s+|okno\s+|grę\s+)?(.+)$/i);
            const rawTarget = appMatch && appMatch[1] ? appMatch[1].trim() : 'kalkulator';
            const resolvedId = podpowiadaczApp.resolveAppId(rawTarget);
            return `[BIGOS:open_app:${resolvedId}] 🚀 Otwieram aplikację **${rawTarget}** (\`${resolvedId}\`).`;
        }

        // 13. Zmiana motywu
        if (lower.includes('motyw')) {
            let theme = 'dark';
            if (lower.includes('jasn') || lower.includes('light')) theme = 'light';
            else if (lower.includes('cyber')) theme = 'cyberpunk';
            else if (lower.includes('retro')) theme = 'retro';
            else if (lower.includes('ocean')) theme = 'ocean';
            else if (lower.includes('natur')) theme = 'nature';
            return `[BIGOS:set_theme:${theme}] 🎨 Zmieniam motyw systemu BigOS na **${theme}**.`;
        }

        // 14. Zmiana tapety
        if (lower.includes('tapet')) {
            let wp = 'kosmos';
            if (lower.includes('ferrari')) wp = 'ferrari';
            else if (lower.includes('abstrakcj')) wp = 'abstrakcja';
            else if (lower.includes('bigos')) wp = 'bigos';
            return `[BIGOS:set_wallpaper:${wp}] 🖼️ Ustawiam tapetę pulpitu na **${wp}**.`;
        }

        return null;
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
        // BUDOWA SYSTEM PROMPTU (ZARZĄDCA SYSTEMU BIGOS 2026)
        // -------------------------------------------------------------
        const systemPrompt = `Jesteś "BigAI 2026" - głównym asystentem i zarządcą całego systemu operacyjnego BigOS.
Potrafisz bezpośrednio sterować systemem BigOS za pomocą specjalnych znaczników akcji umieszczanych w odpowiedzi:

DOSTĘPNE AKCJE SYSTEMOWE BIGOS:
1. Otwieranie aplikacji: [BIGOS:open_app:ID_APLIKACJI]
   Dostępne ID aplikacji: kalkulator (Rachmistrz Pro), skryba (Notatnik Skryba), siecioslaw (Przeglądarka Sieciosław), patrzalka (Galeria i edytor Patrzałka), aktowka (Menedżer plików Aktówka), tapeciak (Ustawienia Kombinator), szkicownik (Artysta), bigos_painter (BigPaint Studio), grajek (Odtwarzacz muzyki), grajacz (Odtwarzacz wideo), montazysta (Montażysta), tabelarz (Arkusz Tabelarz), menadzer (Menedżer Aplikacji), nadzorca (Monitor systemu), pogodynka, czasomierz, kasiarz, przelicznik, kompresor, wladca (Terminal), zadaniowiec, edytor_map, kalkulator_bmi, pelzacz, murarz, ufoludki, odbijanka, trzepotek, scigacz, bombiarz, kolko, tank (Czołgi), cookie_clicker, powitanie.
2. Zamykanie aplikacji: [BIGOS:close_app:ID_APLIKACJI] lub [BIGOS:close_all_apps:all]
3. Wyszukiwanie w przeglądarce Sieciosław: [BIGOS:search_web:ZAPYTANIE_LUB_URL]
4. Otwieranie grafiki/zdjęcia w Patrzałce: [BIGOS:open_image:NAZWA_LUB_OSTATNIE]
5. Otwarcie programu Skryba i zapisanie notatki (np. z dyktowania): [BIGOS:skryba_note:{"title":"Notatka.html","content":"Treść notatki","append":false}]
6. Tworzenie nowego pliku na pulpicie: [BIGOS:create_file:{"name":"plik.txt","content":"Treść pliku"}]
7. Tworzenie nowego folderu na pulpicie: [BIGOS:create_folder:Nazwa_Folderu]
8. Modyfikacja istniejącego pliku z podglądem zmian: [BIGOS:write_file:{"name":"plik.txt","content":"Nowa treść"}]
9. Generowanie zdjęć (modele: nano-banana-2.1, nano-banana-pro, nano-banana-2-lite, flux-3): [BIGOS:generate_image:{"prompt":"opis obrazu","model":"nano-banana-2.1"}]
10. Generowanie wideo (modele: omni-1.1-flash, veo-3.1-lite, veo-3.1-fast, veo-3.1-quality, flux-3-video): [BIGOS:generate_video:{"prompt":"opis wideo","model":"veo-3.1-fast"}]
11. Zmiana motywu: [BIGOS:set_theme:dark] (lub light, cyberpunk, retro, ocean, nature)
12. Zmiana tapety: [BIGOS:set_wallpaper:kosmos] (lub bigos, ferrari, abstrakcja)

TWORZENIE NOWYCH APLIKACJI:
Gdy użytkownik poprosi o stworzenie nowej aplikacji (np. "Stwórz kalkulator walut"), wygeneruj blok kodu \`\`\`javascript \`\`\` z użyciem \`window.BigOSAppAPI.register({ id, name, icon, width, height, html: \`...\`, globalName, global, init })\` oraz klas systemowych (\`g-text\`, \`g-text-muted\`, \`g-bg\`, \`g-btn\`, \`g-border\`, \`g-panel\`).
`;

        const prov = podpowiadaczApp.settings.provider;
        const key = podpowiadaczApp.settings.apiKey;
        const mod = podpowiadaczApp.settings.isCustomModel ? podpowiadaczApp.settings.customModel : podpowiadaczApp.settings.model;

        let responseText = "Wystąpił błąd po stronie serwera.";
        podpowiadaczApp.currentAbortController = new AbortController();
        const signal = podpowiadaczApp.currentAbortController.signal;

        try {
            const localCommandResponse = podpowiadaczApp.parseNaturalCommands(userText);

            if (prov === 'simulated' || (!key && localCommandResponse)) {
                if (localCommandResponse) {
                    responseText = localCommandResponse;
                } else {
                    responseText = `[Symulator BigAI 2026] Otrzymałem polecenie: "${userText}". System BigOS jest gotowy — możesz otwierać i zamykać aplikacje, wyszukiwać w Sieciosławiu, dyktować notatki do Skryby, tworzyć pliki i foldery oraz generować zdjęcia (Nano Banana / FLUX 3) i wideo (Omni 1.1 / Veo 3.1 / FLUX 3).`;
                }
            }
            else if (prov === 'gemini_api') {
                if (!key) throw new Error('Wprowadź swój klucz API Google Gemini w ustawieniach BigAI (⚙️ Ustawienia) lub przełącz silnik na Lokalny Zarządca Systemu.');
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${key}`;
                
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

                for (let i = 0; i < 3; i++) {
                    try {
                        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal });
                        const data = await response.json();
                        if (response.ok) {
                            let textParts = data.candidates?.[0]?.content?.parts?.filter(p => p.text)?.map(p => p.text) || [];
                            responseText = textParts.join('\n') || "Brak odpowiedzi od Gemini.";
                            break;
                        } else {
                            if(i === 2) throw new Error(data.error?.message || response.statusText);
                        }
                    } catch (e) {
                        if (e.name === 'AbortError') throw e;
                        if(i === 2) throw e;
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            } 
            else if (prov === 'openrouter') {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${key}`, "HTTP-Referer": window.location.href, "X-OpenRouter-Title": "BigOS Browser", "Content-Type": "application/json" },
                    body: JSON.stringify({ model: mod, messages: [ { role: "system", content: systemPrompt }, ...podpowiadaczApp.messages.slice(-8).map(m => ({ role: m.role, content: m.rawText || m.text })) ] }),
                    signal
                });
                const data = await response.json();
                if(!response.ok) throw new Error(`OpenRouter: ${data.error?.message || response.statusText}`);
                responseText = data.choices?.[0]?.message?.content || "Błąd parsowania.";
            }
            else if (prov === 'openai') {
                const openaiTier = podpowiadaczApp.settings.serviceTier || 'standard';
                const response = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ model: mod, service_tier: openaiTier, messages: [ { role: "system", content: systemPrompt }, ...podpowiadaczApp.messages.slice(-8).map(m => ({ role: m.role, content: m.rawText || m.text })) ] }),
                    signal
                });
                const data = await response.json();
                if(!response.ok) throw new Error(`OpenAI: ${data.error?.message || response.statusText}`);
                responseText = data.choices?.[0]?.message?.content || "Błąd parsowania.";
            }
            else if (prov === 'anthropic') {
                const response = await fetch("https://api.anthropic.com/v1/messages", {
                    method: "POST",
                    headers: {
                        "x-api-key": key,
                        "anthropic-version": "2023-06-01",
                        "anthropic-dangerous-direct-browser-access": "true",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: mod,
                        max_tokens: 4096,
                        system: systemPrompt,
                        messages: podpowiadaczApp.messages.slice(-8).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.rawText || m.text }))
                    }),
                    signal
                });
                const data = await response.json();
                if (!response.ok) throw new Error(`Anthropic: ${data.error?.message || response.statusText}`);
                responseText = data.content?.[0]?.text || "Błąd parsowania.";
            }
            else if (prov === 'xai') {
                const response = await fetch("https://api.x.ai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ model: mod, messages: [ { role: "system", content: systemPrompt }, ...podpowiadaczApp.messages.slice(-8).map(m => ({ role: m.role, content: m.rawText || m.text })) ] }),
                    signal
                });
                const data = await response.json();
                if(!response.ok) throw new Error(`xAI: ${data.error?.message || response.statusText}`);
                responseText = data.choices?.[0]?.message?.content || "Błąd parsowania.";
            }
            else if (prov === 'deepseek') {
                const response = await fetch("https://api.deepseek.com/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ model: mod, messages: [ { role: "system", content: systemPrompt }, ...podpowiadaczApp.messages.slice(-8).map(m => ({ role: m.role, content: m.rawText || m.text })) ] }),
                    signal
                });
                const data = await response.json();
                if(!response.ok) throw new Error(`DeepSeek: ${data.error?.message || response.statusText}`);
                responseText = data.choices?.[0]?.message?.content || "Błąd parsowania.";
            }
            else if (prov === 'groq') {
                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ model: mod, messages: [ { role: "system", content: systemPrompt }, ...podpowiadaczApp.messages.slice(-8).map(m => ({ role: m.role, content: m.rawText || m.text })) ] }),
                    signal
                });
                const data = await response.json();
                if(!response.ok) throw new Error(`Groq: ${data.error?.message || response.statusText}`);
                responseText = data.choices?.[0]?.message?.content || "Błąd parsowania.";
            }

        } catch (error) {
            if (error && error.name === 'AbortError') {
                return; // Anulowano przez użytkownika
            }
            console.error(error);
            responseText = `⚠️ **Błąd API (${prov}):** ${error.message}\n\nUpewnij się, że wpisany klucz jest prawidłowy lub wybierz w ustawieniach **Lokalny Zarządca Systemu (Offline)**.`;
        } finally {
            podpowiadaczApp.currentAbortController = null;
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

podpowiadaczApp.MODELS_DB = MODELS_DB;
podpowiadaczApp.SERVICE_TIERS_DB = SERVICE_TIERS_DB;
podpowiadaczApp.VOICES_DB = VOICES_DB;
podpowiadaczApp.STT_ENGINES_DB = STT_ENGINES_DB;
podpowiadaczApp.IMAGE_GENERATORS_DB = IMAGE_GENERATORS_DB;
podpowiadaczApp.VIDEO_GENERATORS_DB = VIDEO_GENERATORS_DB;

if (typeof window !== 'undefined') {
    window.MODELS_DB = MODELS_DB;
    window.SERVICE_TIERS_DB = SERVICE_TIERS_DB;
    window.VOICES_DB = VOICES_DB;
    window.STT_ENGINES_DB = STT_ENGINES_DB;
    window.IMAGE_GENERATORS_DB = IMAGE_GENERATORS_DB;
    window.VIDEO_GENERATORS_DB = VIDEO_GENERATORS_DB;
    window.podpowiadaczApp = podpowiadaczApp;
}
if (typeof globalThis !== 'undefined') {
    globalThis.MODELS_DB = MODELS_DB;
    globalThis.SERVICE_TIERS_DB = SERVICE_TIERS_DB;
    globalThis.VOICES_DB = VOICES_DB;
    globalThis.STT_ENGINES_DB = STT_ENGINES_DB;
    globalThis.IMAGE_GENERATORS_DB = IMAGE_GENERATORS_DB;
    globalThis.VIDEO_GENERATORS_DB = VIDEO_GENERATORS_DB;
    globalThis.podpowiadaczApp = podpowiadaczApp;
}

setTimeout(podpowiadaczApp.init, 500);