// ======================================================================
// PLIK: js/theme.js (Globalny Zarządca Motywów BigOS v2.0)
// ======================================================================

const themeManager = {
    settings: {
        activeColor: 'color-dark',
        activeUI: 'ui-win11',
        activeEffect: 'eff-none'
    },
    
    // Zgodność wsteczna (niektóre aplikacje mogą szukać tego pola)
    get activeTheme() { return this.settings.activeColor; },
    
    // ---------------------------------------------------------
    // BAZA 1: KOLORYSTYKA (PALETY)
    // ---------------------------------------------------------
    themesList: [
        { id: 'color-amber', name: '🟠 Amber (Domyślny BigOS)' },
        { id: 'color-winxp-luna', name: '🟦 WinXP Luna (Klasyczny niebieski)' },
        { id: 'color-winxp-olive', name: '🟩 WinXP Olive (Oliwkowy)' },
        { id: 'color-winxp-silver', name: '⬜ WinXP Silver (Srebrny)' },
        { id: 'color-win95', name: '🪨 Win95 / Classic (Szary i granat)' },
        { id: 'color-dracula', name: '🧛 Dracula (Fiolet i róż)' },
        { id: 'color-nord', name: '❄️ Nord (Arktyczny błękit)' },
        { id: 'color-tokyo-night', name: '🌃 Tokyo Night (Nocne neony)' },
        { id: 'color-gruvbox', name: '📦 Gruvbox (Ciepły retro)' },
        { id: 'color-monokai', name: '🎨 Monokai (Kontrastowy)' },
        { id: 'color-cyberpunk', name: '🚀 Cyberpunk 2077 (Żółty i Magenta)' },
        { id: 'color-matrix', name: '💚 Hacker / Matrix (Neonowa zieleń)' },
        { id: 'color-tron', name: '🥏 Tron (Cyjanowe świecenie)' },
        { id: 'color-synthwave', name: '🌇 Synthwave (Róż i fiolet)' },
        { id: 'color-fallout', name: '☢️ Pip-Boy (Monochromatyczna zieleń)' },
        { id: 'color-c64', name: '🕹️ Commodore 64 (Klasyczny błękit)' },
        { id: 'color-amiga', name: '💾 Amiga Workbench (Pomarańcz i czerń)' },
        { id: 'color-dos', name: '💻 DOS (Czysta czerń i biel)' },
        { id: 'color-ocean', name: '🌊 Ocean (Morski turkus)' },
        { id: 'color-emerald', name: '🌿 Emerald (Zieleń premium)' },
        { id: 'color-ruby', name: '💎 Ruby (Głęboka czerwień)' },
        { id: 'color-sunset', name: '🌅 Sunset (Ciepły zachód)' },
        { id: 'color-toxic', name: '☣️ Toxic (Toksyczna żółć)' },
        { id: 'color-oled', name: '⬛ OLED Black (Absolutna czerń)' },
        { id: 'color-light', name: '☀️ Czysty Jasny (GitHub Light)' },
        { id: 'color-dark', name: '🌙 Czysty Ciemny (GitHub Dark)' }
    ],

    // ---------------------------------------------------------
    // BAZA 2: STYLE INTERFEJSU (KSZTAŁTY, SZKŁO, CIENIE)
    // ---------------------------------------------------------
    uiList: [
        { id: 'ui-win11', name: '🪟 Windows 11 (Mica, miękkie rogi)' },
        { id: 'ui-macos', name: '🍎 macOS Sonoma (Szkło, duże cienie)' },
        { id: 'ui-win7', name: '🧊 Windows 7 Aero (Błyszczące szkło)' },
        { id: 'ui-win95', name: '💾 Windows 95 (Płaskie, ostre krawędzie)' },
        { id: 'ui-linux-yaru', name: '🐧 Ubuntu Yaru (Płaskie, okrągłe)' },
        { id: 'ui-fluent', name: '✨ Fluent Design (Akryl)' },
        { id: 'ui-glassmorphism', name: '💎 Glassmorphism (Pełne rozmycie)' },
        { id: 'ui-neumorphism', name: '🔘 Neumorphism (Wypukłe przyciski)' },
        { id: 'ui-clay', name: '🥎 Clay UI (Plastelinowy, miękki)' },
        { id: 'ui-minimal', name: '📏 Minimal (Zero cieni, flat)' },
        { id: 'ui-terminal', name: '💻 Terminal (Brak ramek, surowy)' },
        { id: 'ui-pixel', name: '👾 Pixel Art (Pikselowe obramowania)' }
    ],

    // ---------------------------------------------------------
    // BAZA 3: EFEKTY WIZUALNE I NAKŁADKI
    // ---------------------------------------------------------
    effectsList: [
        { id: 'eff-none', name: '❌ Brak efektu (Wydajność)' },
        { id: 'eff-crt', name: '📺 Monitor CRT (Skanowanie, miganie)' },
        { id: 'eff-matrix', name: '💻 Matrix (Spadający kod)' },
        { id: 'eff-snow', name: '❄️ Śnieżyca (Canvas)' },
        { id: 'eff-rain', name: '🌧️ Deszcz (Canvas)' },
        { id: 'eff-stars', name: '🌌 Kosmos (Animowane gwiazdy)' },
        { id: 'eff-bloom', name: '✨ Neon Glow / Bloom' }
    ],

    // ==================================================================
    // INICJALIZACJA I ZARZĄDZANIE
    // ==================================================================
    init: () => {
        const saved = localStorage.getItem('bigos_global_theme_v2');
        if (saved) {
            try { themeManager.settings = JSON.parse(saved); } catch(e) {}
        }

        // Wstrzyknięcie globalnych stylów
        if (!document.getElementById('bigos-global-themes')) {
            const style = document.createElement('style');
            style.id = 'bigos-global-themes';
            style.innerHTML = themeManager.getCSS();
            document.head.appendChild(style);
        }

        // Wstrzyknięcie warstwy efektów Canvas/CSS pod okna i ikony
        if (!document.getElementById('bigos-fx-layer')) {
            const fxLayer = document.createElement('div');
            fxLayer.id = 'bigos-fx-layer';
            fxLayer.className = 'fixed inset-0 pointer-events-none';
            fxLayer.style.zIndex = '0';
            
            // Wstawiamy warstwę efektów zaraz po tapiecie, aby NIE zasłaniała pulpitu ani ikon
            const desktopBg = document.getElementById('desktop-bg');
            if (desktopBg && desktopBg.nextSibling) {
                document.body.insertBefore(fxLayer, desktopBg.nextSibling);
            } else {
                document.body.appendChild(fxLayer);
            }
        }

        themeManager.applyAll();
        themeManager.patchKombinatorUI();
    },

    applyAll: () => {
        // Usuwanie starych klas
        document.body.className = document.body.className.replace(/\b(color-|ui-|eff-)\S+/g, '');
        
        // Dodawanie nowych klas
        document.body.classList.add(themeManager.settings.activeColor);
        document.body.classList.add(themeManager.settings.activeUI);
        document.body.classList.add(themeManager.settings.activeEffect);

        localStorage.setItem('bigos_global_theme_v2', JSON.stringify(themeManager.settings));
        
        themeManager.runEffectsEngine();
    },

    setColor: (id) => { themeManager.settings.activeColor = id; themeManager.applyAll(); },
    setUI: (id) => { themeManager.settings.activeUI = id; themeManager.applyAll(); },
    setEffect: (id) => { themeManager.settings.activeEffect = id; themeManager.applyAll(); },

    // Zgodność wsteczna z programami wywołującymi "themeManager.applyTheme(id)"
    applyTheme: (id) => {
        if(id.startsWith('color-')) themeManager.setColor(id);
        else if(id.startsWith('ui-')) themeManager.setUI(id);
        else if(id.startsWith('eff-')) themeManager.setEffect(id);
        else { themeManager.setColor(id); } // Fallback
    },

    getSelectorHTML: (customClass = '') => {
        // Zgodność wsteczna dla prostych dropdownów w starych aplikacjach (Rachmistrz itp.)
        let opts = themeManager.themesList.map(t => 
            `<option value="${t.id}" ${themeManager.settings.activeColor === t.id ? 'selected' : ''}>${t.name}</option>`
        ).join('');
        return `<select class="system-theme-selector ${customClass}" onchange="themeManager.applyTheme(this.value)">${opts}</select>`;
    },

    // ==================================================================
    // WSTRZYKIWANIE ZAAWANSOWANEGO UI DO KOMBINATORA
    // ==================================================================
    patchKombinatorUI: () => {
        setInterval(() => {
            const oldSelect = document.getElementById('system-theme-select');
            if (oldSelect && !document.getElementById('kombinator-pro-themes')) {
                const container = oldSelect.parentElement;
                
                const cOpts = themeManager.themesList.map(t => `<option value="${t.id}" ${themeManager.settings.activeColor === t.id ? 'selected' : ''}>${t.name}</option>`).join('');
                const uOpts = themeManager.uiList.map(t => `<option value="${t.id}" ${themeManager.settings.activeUI === t.id ? 'selected' : ''}>${t.name}</option>`).join('');
                const eOpts = themeManager.effectsList.map(t => `<option value="${t.id}" ${themeManager.settings.activeEffect === t.id ? 'selected' : ''}>${t.name}</option>`).join('');

                container.innerHTML = `
                    <div id="kombinator-pro-themes" class="flex flex-col gap-3">
                        <div>
                            <label class="block text-xs font-bold g-text-muted mb-1 uppercase tracking-wider">🎨 Kolorystyka</label>
                            <select onchange="themeManager.setColor(this.value)" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-sm font-semibold shadow-inner cursor-pointer">${cOpts}</select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold g-text-muted mb-1 uppercase tracking-wider">🪟 Kształt i Szkło (UI)</label>
                            <select onchange="themeManager.setUI(this.value)" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-sm font-semibold shadow-inner cursor-pointer">${uOpts}</select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold g-text-muted mb-1 uppercase tracking-wider">✨ Efekty specjalne</label>
                            <select onchange="themeManager.setEffect(this.value)" class="w-full p-2 rounded g-bg g-text border g-border outline-none text-sm font-semibold shadow-inner cursor-pointer">${eOpts}</select>
                        </div>
                    </div>
                `;
            }
        }, 1000);
    },

    // ==================================================================
    // SILNIK EFEKTÓW (CANVAS / CSS)
    // ==================================================================
    fxAnimFrame: null,
    runEffectsEngine: () => {
        const layer = document.getElementById('bigos-fx-layer');
        if(!layer) return;
        
        layer.innerHTML = '';
        if(themeManager.fxAnimFrame) { cancelAnimationFrame(themeManager.fxAnimFrame); themeManager.fxAnimFrame = null; }

        const eff = themeManager.settings.activeEffect;

        // Dynamiczny priorytet (z-index)
        // CRT i Bloom są filtrami całego ekranu, więc wędrują na sam wierzch.
        // Matrix, deszcz, kosmos itp. pełnią rolę tapety, więc idą pod spód (z-index: 0).
        if (['eff-crt', 'eff-bloom'].includes(eff)) {
            layer.style.zIndex = '99998';
        } else {
            layer.style.zIndex = '0';
        }

        if (eff === 'eff-crt') {
            layer.innerHTML = `
                <div class="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30 z-[100000]" 
                     style="background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06)); background-size: 100% 3px, 3px 100%;">
                </div>
                <div class="absolute inset-0 pointer-events-none opacity-10 z-[100001] bg-white animate-pulse" style="animation-duration: 0.15s;"></div>
            `;
        } 
        else if (eff === 'eff-bloom') {
            layer.innerHTML = `<div class="absolute inset-0 pointer-events-none backdrop-blur-[1px] mix-blend-screen opacity-40 z-[99999]" style="box-shadow: inset 0 0 100px rgba(255,255,255,0.2);"></div>`;
        }
        else if (['eff-matrix', 'eff-snow', 'eff-rain', 'eff-stars'].includes(eff)) {
            const canvas = document.createElement('canvas');
            canvas.className = 'w-full h-full';
            layer.appendChild(canvas);
            const ctx = canvas.getContext('2d');
            
            let w = canvas.width = window.innerWidth;
            let h = canvas.height = window.innerHeight;
            
            window.addEventListener('resize', () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; });

            if (eff === 'eff-matrix') {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*';
                const fontSize = 14;
                const columns = w / fontSize;
                const drops = Array(Math.floor(columns)).fill(1);
                
                const draw = () => {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                    ctx.fillRect(0, 0, w, h);
                    ctx.fillStyle = '#0F0';
                    ctx.font = fontSize + 'px monospace';
                    for(let i = 0; i < drops.length; i++) {
                        const text = chars[Math.floor(Math.random() * chars.length)];
                        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                        if(drops[i] * fontSize > h && Math.random() > 0.975) drops[i] = 0;
                        drops[i]++;
                    }
                    themeManager.fxAnimFrame = requestAnimationFrame(draw);
                };
                draw();
            }
            else if (eff === 'eff-snow') {
                const particles = Array(150).fill().map(() => ({ x: Math.random()*w, y: Math.random()*h, r: Math.random()*3+1, d: Math.random()*1+0.5 }));
                const draw = () => {
                    ctx.clearRect(0,0,w,h);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    particles.forEach(p => {
                        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
                        p.y += p.d; p.x += Math.sin(p.y/50)*0.5;
                        if(p.y > h) { p.y = 0; p.x = Math.random()*w; }
                    });
                    themeManager.fxAnimFrame = requestAnimationFrame(draw);
                };
                draw();
            }
            else if (eff === 'eff-rain') {
                const particles = Array(200).fill().map(() => ({ x: Math.random()*w, y: Math.random()*h, l: Math.random()*20+10, s: Math.random()*10+10 }));
                const draw = () => {
                    ctx.clearRect(0,0,w,h);
                    ctx.strokeStyle = 'rgba(173, 216, 230, 0.6)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    particles.forEach(p => {
                        ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + p.l);
                        p.y += p.s;
                        if(p.y > h) { p.y = -p.l; p.x = Math.random()*w; }
                    });
                    ctx.stroke();
                    themeManager.fxAnimFrame = requestAnimationFrame(draw);
                };
                draw();
            }
            else if (eff === 'eff-stars') {
                const stars = Array(200).fill().map(() => ({ x: Math.random()*w, y: Math.random()*h, s: Math.random()*1.5+0.1, a: Math.random() }));
                const draw = () => {
                    ctx.clearRect(0,0,w,h);
                    stars.forEach(s => {
                        ctx.fillStyle = `rgba(255, 255, 255, ${s.a})`;
                        ctx.fillRect(s.x, s.y, s.s, s.s);
                        s.x += s.s * 0.5;
                        if(s.x > w) s.x = 0;
                        s.a += (Math.random()-0.5)*0.1;
                        if(s.a < 0.2) s.a = 0.2; if(s.a > 1) s.a = 1;
                    });
                    themeManager.fxAnimFrame = requestAnimationFrame(draw);
                };
                draw();
            }
        }
    },

    // ==================================================================
    // GLOBALNY SILNIK CSS (Dynamiczne zmienne)
    // ==================================================================
    getCSS: () => {
        return `
            /* BAZOWE ZMIENNE ROOT (Domyślnie Czysty Ciemny, dynamicznie nadpisywane przez klasy) */
            body {
                --bg: #111827; --panel: rgba(31,41,55,0.9); --primary: #60a5fa; --secondary: #3b82f6; 
                --text: #f9fafb; --text-muted: #9ca3af; --border: #374151; 
                --shadow-style: 0 10px 30px rgba(0,0,0,0.5); --win-radius: 8px; --btn-radius: 4px;
                --border-width: 1px; --panel-blur: 16px;
                --font-app: 'Segoe UI', Tahoma, sans-serif;
            }

            /* ==================== 1. KOLORYSTYKA ==================== */
            
            body.color-amber { --bg: #1a0b00; --panel: rgba(40,15,0,0.8); --primary: #FFBF00; --secondary: #E58A00; --text: #ffffff; --text-muted: #d1d5db; --border: #8A5A00; }
            
            body.color-winxp-luna { --bg: #0058e6; --panel: #ece9d8; --primary: #00b000; --secondary: #0058e6; --text: #000000; --text-muted: #555555; --border: #0058e6; }
            body.color-winxp-olive { --bg: #5c7e10; --panel: #ece9d8; --primary: #a1b054; --secondary: #5c7e10; --text: #000000; --text-muted: #555555; --border: #7f925b; }
            body.color-winxp-silver { --bg: #b9bccc; --panel: #fcfcfc; --primary: #86889b; --secondary: #b9bccc; --text: #000000; --text-muted: #555555; --border: #86889b; }
            
            body.color-win95 { --bg: #008080; --panel: #c0c0c0; --primary: #000080; --secondary: #ffffff; --text: #000000; --text-muted: #444444; --border: #808080; }
            
            body.color-dracula { --bg: #282a36; --panel: rgba(40,42,54,0.9); --primary: #ff79c6; --secondary: #bd93f9; --text: #f8f8f2; --text-muted: #6272a4; --border: #44475a; }
            body.color-nord { --bg: #2e3440; --panel: rgba(59,66,82,0.9); --primary: #88c0d0; --secondary: #81a1c1; --text: #eceff4; --text-muted: #d8dee9; --border: #4c566a; }
            body.color-tokyo-night { --bg: #1a1b26; --panel: rgba(36,40,59,0.9); --primary: #7aa2f7; --secondary: #bb9af7; --text: #c0caf5; --text-muted: #565f89; --border: #414868; }
            body.color-gruvbox { --bg: #282828; --panel: rgba(60,56,54,0.9); --primary: #fabd2f; --secondary: #fe8019; --text: #ebdbb2; --text-muted: #a89984; --border: #504945; }
            body.color-monokai { --bg: #272822; --panel: rgba(62,61,50,0.9); --primary: #a6e22e; --secondary: #fd971f; --text: #f8f8f2; --text-muted: #75715e; --border: #49483e; }
            
            body.color-cyberpunk { --bg: #09090b; --panel: rgba(20,10,30,0.85); --primary: #f0f; --secondary: #0ff; --text: #0ff; --text-muted: #f472b6; --border: #f0f; text-shadow: 0 0 4px var(--secondary); }
            body.color-matrix { --bg: #000000; --panel: rgba(0,20,0,0.85); --primary: #22c55e; --secondary: #16a34a; --text: #22c55e; --text-muted: #15803d; --border: #14532d; font-family: 'Courier New', monospace; }
            body.color-tron { --bg: #000000; --panel: rgba(0,10,20,0.85); --primary: #06b6d4; --secondary: #0891b2; --text: #cffafe; --text-muted: #0e7490; --border: #06b6d4; text-shadow: 0 0 5px var(--primary); }
            body.color-synthwave { --bg: #17002b; --panel: rgba(45,0,77,0.85); --primary: #ff007f; --secondary: #00f0ff; --text: #ffffff; --text-muted: #b388ff; --border: #ff007f; }
            body.color-fallout { --bg: #000000; --panel: rgba(0,15,0,0.9); --primary: #4ade80; --secondary: #22c55e; --text: #4ade80; --text-muted: #166534; --border: #4ade80; font-family: 'Courier New', monospace; }
            
            body.color-c64 { --bg: #403ab6; --panel: #7b71d6; --primary: #ffffff; --secondary: #000000; --text: #ffffff; --text-muted: #b0a9f5; --border: #403ab6; font-family: monospace; }
            body.color-amiga { --bg: #0055aa; --panel: #ffffff; --primary: #ffa500; --secondary: #000000; --text: #000000; --text-muted: #555555; --border: #000000; }
            body.color-dos { --bg: #000000; --panel: #000000; --primary: #ffffff; --secondary: #aaaaaa; --text: #ffffff; --text-muted: #aaaaaa; --border: #ffffff; font-family: 'Courier New', monospace; }
            
            body.color-ocean { --bg: #083344; --panel: rgba(22,78,99,0.85); --primary: #06b6d4; --secondary: #0891b2; --text: #ecfeff; --text-muted: #67e8f9; --border: #164e63; }
            body.color-emerald { --bg: #022c22; --panel: rgba(6,78,59,0.85); --primary: #10b981; --secondary: #059669; --text: #ecfdf5; --text-muted: #6ee7b7; --border: #064e3b; }
            body.color-ruby { --bg: #4c0519; --panel: rgba(136,19,55,0.85); --primary: #f43f5e; --secondary: #e11d48; --text: #fff1f2; --text-muted: #fda4af; --border: #be123c; }
            body.color-sunset { --bg: #450a0a; --panel: rgba(124,45,18,0.85); --primary: #f97316; --secondary: #ea580c; --text: #fff7ed; --text-muted: #fdba74; --border: #c2410c; }
            body.color-toxic { --bg: #14532d; --panel: rgba(20,83,45,0.85); --primary: #eab308; --secondary: #ca8a04; --text: #fefce8; --text-muted: #fde047; --border: #a16207; }
            body.color-oled { --bg: #000000; --panel: #000000; --primary: #ffffff; --secondary: #aaaaaa; --text: #ffffff; --text-muted: #555555; --border: #333333; }
            
            body.color-light { --bg: #f3f4f6; --panel: #ffffff; --primary: #3b82f6; --secondary: #2563eb; --text: #111827; --text-muted: #6b7280; --border: #d1d5db; }
            body.color-dark { --bg: #111827; --panel: rgba(31,41,55,0.9); --primary: #60a5fa; --secondary: #3b82f6; --text: #f9fafb; --text-muted: #9ca3af; --border: #374151; }

            /* ==================== 2. STYLE UI (KSZTAŁT, SZKŁO) ==================== */
            
            body.ui-win11 { --win-radius: 8px; --panel-blur: 20px; --shadow-style: 0 8px 32px rgba(0,0,0,0.5); --border-width: 1px; --btn-radius: 6px; }
            body.ui-macos { --win-radius: 14px; --panel-blur: 40px; --shadow-style: 0 20px 50px rgba(0,0,0,0.6); --border-width: 1px; --btn-radius: 8px; }
            body.ui-win7 { --win-radius: 8px; --panel-blur: 8px; --shadow-style: inset 0 0 2px rgba(255,255,255,0.5), 0 5px 15px rgba(0,0,0,0.6); --border-width: 1px; --btn-radius: 4px; }
            
            body.ui-win95 { --win-radius: 0px; --panel-blur: 0px; --shadow-style: inset 1px 1px 0px #fff, inset -1px -1px 0px #000, 2px 2px 0px rgba(0,0,0,0.5); --border-width: 2px; --btn-radius: 0px; }
            body.ui-win95 .title-bar { background: var(--primary) !important; color: white !important; }
            body.ui-win95 .g-btn { box-shadow: inset 1px 1px 0px #fff, inset -1px -1px 0px #000 !important; border: none !important; }
            body.ui-win95 .g-btn:active { box-shadow: inset 1px 1px 0px #000, inset -1px -1px 0px #fff !important; }

            body.ui-linux-yaru { --win-radius: 8px 8px 0 0; --panel-blur: 0px; --shadow-style: 0 5px 20px rgba(0,0,0,0.8); --border-width: 1px; --btn-radius: 4px; }
            
            body.ui-fluent { --win-radius: 8px; --panel-blur: 30px; --shadow-style: 0 4px 24px rgba(0,0,0,0.3); --border-width: 1px; --btn-radius: 4px; }
            body.ui-glassmorphism { --win-radius: 16px; --panel-blur: 40px; --shadow-style: 0 8px 32px rgba(255,255,255,0.1); --border-width: 1px; --btn-radius: 12px; }
            
            body.ui-neumorphism { --win-radius: 16px; --panel-blur: 0px; --shadow-style: 8px 8px 16px rgba(0,0,0,0.4), -8px -8px 16px rgba(255,255,255,0.1); --border-width: 0px; --btn-radius: 12px; }
            body.ui-neumorphism .g-btn { box-shadow: 4px 4px 8px rgba(0,0,0,0.3), -4px -4px 8px rgba(255,255,255,0.05) !important; border: none !important; }
            body.ui-neumorphism .g-btn:active { box-shadow: inset 4px 4px 8px rgba(0,0,0,0.3), inset -4px -4px 8px rgba(255,255,255,0.05) !important; }

            body.ui-clay { --win-radius: 24px; --panel-blur: 0px; --shadow-style: 8px 8px 16px rgba(0,0,0,0.4), inset -4px -4px 10px rgba(0,0,0,0.3), inset 4px 4px 10px rgba(255,255,255,0.2); --border-width: 0px; --btn-radius: 20px; }
            body.ui-minimal { --win-radius: 0px; --panel-blur: 0px; --shadow-style: none; --border-width: 1px; --btn-radius: 0px; }
            
            body.ui-terminal { --win-radius: 0px; --panel-blur: 0px; --shadow-style: none; --border-width: 1px; --btn-radius: 0px; }
            body.ui-pixel { --win-radius: 0px; --panel-blur: 0px; --shadow-style: 4px 4px 0px rgba(0,0,0,1); --border-width: 2px; --btn-radius: 0px; font-family: 'Courier New', monospace; }

            /* ==================== INTEGRACJA Z APLIKACJAMI BIGOS ==================== */
            
            .themed-app {
                color: var(--text); font-family: var(--font-app);
                transition: color 0.3s ease;
            }

            /* Globalne klasy dynamiczne */
            .g-bg { background-color: var(--bg) !important; }
            .g-panel { 
                background-color: var(--panel) !important; 
                box-shadow: var(--shadow-style) !important; 
                backdrop-filter: blur(var(--panel-blur)) !important; 
                -webkit-backdrop-filter: blur(var(--panel-blur)) !important; 
                border: var(--border-width) solid var(--border) !important; 
                border-radius: var(--win-radius) !important;
            }
            .window { border-radius: var(--win-radius) !important; }

            .g-text { color: var(--text) !important; }
            .g-text-muted { color: var(--text-muted) !important; }
            .g-accent { color: var(--primary) !important; }
            .g-border { border-color: var(--border) !important; border-width: var(--border-width) !important;}
            
            .g-btn { 
                border: var(--border-width) solid var(--border) !important; 
                color: var(--text) !important; 
                background: transparent !important; 
                transition: all 0.2s !important; 
                border-radius: var(--btn-radius) !important;
            }
            .g-btn:hover { 
                background-color: var(--primary) !important; 
                color: #000 !important; 
                border-color: var(--primary) !important; 
                text-shadow: none !important; 
                box-shadow: 0 0 10px var(--primary) !important; 
            }
            
            .g-range { background: var(--border) !important; accent-color: var(--primary) !important; }
            .g-tab { color: var(--text-muted) !important; border-bottom: 2px solid transparent !important; transition: all 0.2s !important; }
            .g-tab.active { border-bottom-color: var(--primary) !important; color: var(--primary) !important; }
            
            .g-item { border-bottom: var(--border-width) solid var(--border) !important; transition: background 0.2s !important; }
            .g-item:hover { background-color: rgba(255,255,255,0.05) !important; }
            .g-item.active { background-color: rgba(255,255,255,0.1) !important; border-left: 4px solid var(--primary) !important; }
            
            .g-icon-btn { color: var(--text-muted) !important; transition: color 0.2s, transform 0.2s !important; }
            .g-icon-btn:hover { color: var(--text) !important; transform: scale(1.1) !important; }
            
            .g-play-btn { color: var(--primary) !important; transition: transform 0.2s, text-shadow 0.2s !important; text-shadow: 0 0 15px var(--primary) !important; }
            .g-play-btn:hover { transform: scale(1.1) !important; text-shadow: 0 0 25px var(--primary) !important; }
        `;
    }
};

// Automatyczna inicjalizacja po załadowaniu
setTimeout(themeManager.init, 200);