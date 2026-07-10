// ======================================================================
// PLIK: js/theme.js (Globalny Zarządca Motywów BigOS)
// ======================================================================

const themeManager = {
    settings: {
        activeTheme: 'theme-amber' // Domyślny motyw BigOS
    },
    
    themesList: [
        { id: 'theme-carbon', name: '⚫ Carbon (Włókno węglowe)' },
        { id: 'theme-steel', name: '⚙️ Steel (Szczotkowana stal)' },
        { id: 'theme-midnight', name: '🌌 Midnight (Nowoczesny granat)' },
        { id: 'theme-glass', name: '💎 Glass (Mleczne szkło)' },
        { id: 'theme-obsidian', name: '⚫ Obsidian (Matowa czerń)' },
        { id: 'theme-lava', name: '🔥 Lava (Czerń i czerwień)' },
        { id: 'theme-matrix', name: '💚 Matrix (Cyfrowa zieleń)' },
        { id: 'theme-sapphire', name: '💙 Sapphire (Elegancki szafir)' },
        { id: 'theme-amethyst', name: '💜 Amethyst (Fiolet premium)' },
        { id: 'theme-amber', name: '🟠 Amber (Bursztyn BigOS)' },
        { id: 'theme-emerald', name: '🌿 Emerald (Zieleń premium)' },
        { id: 'theme-ocean', name: '🌊 Ocean (Morski turkus)' },
        { id: 'theme-gold', name: '🟡 Gold (Luksusowe złoto)' },
        { id: 'theme-titanium', name: '⚪ Titanium (Jasny aluminium)' },
        { id: 'theme-night-neon', name: '🖤 Night Neon (Nocny błękit)' },
        { id: 'theme-cyberpunk', name: '🚀 Cyberpunk (Neonowy róż)' }
    ],

    init: () => {
        // Ładowanie ustawień z JSON
        const saved = localStorage.getItem('bigos_global_theme');
        if (saved) {
            try {
                themeManager.settings = JSON.parse(saved);
            } catch(e) { console.warn("Błąd parsowania motywów"); }
        }

        // Wstrzykiwanie globalnego arkusza stylów motywów do sekcji <head>
        if (!document.getElementById('bigos-global-themes')) {
            const style = document.createElement('style');
            style.id = 'bigos-global-themes';
            style.innerHTML = themeManager.getCSS();
            document.head.appendChild(style);
        }

        // Aplikacja motywu na <body>
        themeManager.applyTheme(themeManager.settings.activeTheme);
    },

    applyTheme: (themeId) => {
        // Usuń poprzednie motywy
        themeManager.themesList.forEach(t => document.body.classList.remove(t.id));
        
        // Nałóż nowy motyw
        document.body.classList.add(themeId);
        themeManager.settings.activeTheme = themeId;
        
        // Zapisz konfigurację w formacie JSON
        localStorage.setItem('bigos_global_theme', JSON.stringify(themeManager.settings));
        
        // Zaktualizuj wszystkie dropdowny w otwartych oknach (np. w Grajku, Rachmistrzu)
        document.querySelectorAll('.system-theme-selector').forEach(select => {
            select.value = themeId;
        });
        
        if(typeof apps !== 'undefined' && apps.showToast) {
            const tName = themeManager.themesList.find(t => t.id === themeId)?.name || 'Motyw';
            apps.showToast('Motywy', `Zmieniono wygląd na: ${tName}`, 'success');
        }
    },

    // Generuje uniwersalny dropdown (listę rozwijaną) do wklejenia w każdej aplikacji
    getSelectorHTML: (customClass = '') => {
        let opts = themeManager.themesList.map(t => 
            `<option value="${t.id}" ${themeManager.settings.activeTheme === t.id ? 'selected' : ''}>${t.name}</option>`
        ).join('');
        
        return `<select class="system-theme-selector ${customClass}" onchange="themeManager.applyTheme(this.value)">${opts}</select>`;
    },

    // Główny silnik CSS (Zmienne globalne i klasy używane w aplikacjach)
    getCSS: () => {
        return `
            /* BAZOWE ZMIENNE (Domyślne) */
            body {
                --bg: #1a0b00; --panel: rgba(40,15,0,0.8); --primary: #FFBF00; --secondary: #E58A00; 
                --text: #ffffff; --text-muted: #d1d5db; --border: #8A5A00; --shadow: 0 10px 30px rgba(0,0,0,.5);
                --pattern: none; --font-app: 'Segoe UI', Tahoma, sans-serif;
            }

            /* 1. CARBON */
            body.theme-carbon {
                --bg: #121212; --panel: rgba(27,27,27,0.85); --primary: #ef4444; --secondary: #dc2626; 
                --text: #f3f4f6; --text-muted: #9ca3af; --border: #333333; --shadow: 0 10px 30px rgba(0,0,0,.8);
                --pattern: repeating-linear-gradient(45deg, #1a1a1a 25%, transparent 25%, transparent 75%, #1a1a1a 75%, #1a1a1a), repeating-linear-gradient(45deg, #1a1a1a 25%, #121212 25%, #121212 75%, #1a1a1a 75%, #1a1a1a);
            }
            
            /* 2. STEEL */
            body.theme-steel {
                --bg: #e5e7eb; --panel: rgba(220,225,230,0.85); --primary: #2563eb; --secondary: #1d4ed8; 
                --text: #1f2937; --text-muted: #4b5563; --border: #9ca3af; --shadow: 0 10px 20px rgba(0,0,0,.2);
                --pattern: linear-gradient(135deg, #f3f4f6 0%, #cbd5e1 100%);
            }

            /* 3. MIDNIGHT */
            body.theme-midnight {
                --bg: #020617; --panel: rgba(15,23,42,0.85); --primary: #38bdf8; --secondary: #0ea5e9; 
                --text: #f8fafc; --text-muted: #94a3b8; --border: #1e293b; --shadow: 0 10px 30px rgba(0,0,0,.7);
            }

            /* 4. GLASS */
            body.theme-glass {
                --bg: transparent; --panel: rgba(255,255,255,0.05); --primary: #ffffff; --secondary: #e2e8f0; 
                --text: #ffffff; --text-muted: #d1d5db; --border: rgba(255,255,255,0.2); --shadow: 0 8px 32px 0 rgba(31,38,135,0.37);
            }

            /* 5. OBSIDIAN */
            body.theme-obsidian {
                --bg: #0a0a0a; --panel: rgba(15,15,15,0.9); --primary: #f97316; --secondary: #ea580c; 
                --text: #ffffff; --text-muted: #6b7280; --border: #262626; --shadow: 0 10px 40px rgba(0,0,0,.9);
            }

            /* 6. LAVA */
            body.theme-lava {
                --bg: #000000; --panel: rgba(20,0,0,0.8); --primary: #dc2626; --secondary: #991b1b; 
                --text: #fee2e2; --text-muted: #fca5a5; --border: #7f1d1d; --shadow: 0 0 20px rgba(220,38,38,0.3);
            }

            /* 7. MATRIX */
            body.theme-matrix {
                --bg: #000000; --panel: rgba(0,20,0,0.8); --primary: #22c55e; --secondary: #16a34a; 
                --text: #22c55e; --text-muted: #15803d; --border: #14532d; --font-app: 'Courier New', monospace;
                text-shadow: 0 0 5px rgba(34,197,94,0.5);
            }

            /* 8. SAPPHIRE */
            body.theme-sapphire {
                --bg: #0f172a; --panel: rgba(23,37,84,0.85); --primary: #60a5fa; --secondary: #3b82f6; 
                --text: #eff6ff; --text-muted: #93c5fd; --border: #1e3a8a;
            }

            /* 9. AMETHYST */
            body.theme-amethyst {
                --bg: #1e1b4b; --panel: rgba(46,16,101,0.85); --primary: #d946ef; --secondary: #c026d3; 
                --text: #fdf4ff; --text-muted: #f0abfc; --border: #4a044e;
            }

            /* 10. AMBER */
            body.theme-amber {
                --bg: #1a0b00; --panel: rgba(40,15,0,0.8); --primary: #FFBF00; --secondary: #E58A00; 
                --text: #ffffff; --text-muted: #d1d5db; --border: #8A5A00;
            }

            /* 11. EMERALD */
            body.theme-emerald {
                --bg: #022c22; --panel: rgba(6,78,59,0.85); --primary: #10b981; --secondary: #059669; 
                --text: #ecfdf5; --text-muted: #6ee7b7; --border: #064e3b;
            }

            /* 12. OCEAN */
            body.theme-ocean {
                --bg: #083344; --panel: rgba(22,78,99,0.85); --primary: #06b6d4; --secondary: #0891b2; 
                --text: #ecfeff; --text-muted: #67e8f9; --border: #164e63;
            }

            /* 13. GOLD */
            body.theme-gold {
                --bg: #000000; --panel: rgba(25,20,0,0.85); --primary: #fbbf24; --secondary: #d97706; 
                --text: #fef3c7; --text-muted: #fcd34d; --border: #b45309;
            }

            /* 14. TITANIUM */
            body.theme-titanium {
                --bg: #f8fafc; --panel: rgba(241,245,249,0.85); --primary: #64748b; --secondary: #475569; 
                --text: #0f172a; --text-muted: #334155; --border: #cbd5e1;
            }

            /* 15. NIGHT NEON */
            body.theme-night-neon {
                --bg: #000000; --panel: rgba(10,10,10,0.85); --primary: #0ea5e9; --secondary: #0284c7; 
                --text: #ffffff; --text-muted: #7dd3fc; --border: #0c4a6e;
                text-shadow: 0 0 8px rgba(14,165,233,0.6);
            }

            /* 16. CYBERPUNK */
            body.theme-cyberpunk {
                --bg: #09090b; --panel: rgba(20,10,40,0.85); --primary: #f0f; --secondary: #0ff; 
                --text: #0ff; --text-muted: #f472b6; --border: #f0f;
                text-shadow: 0 0 2px var(--secondary);
            }

            /* ========================================================= */
            /* GLOBALNE KLASY WIDOKÓW (DLA GRAJKA, RACHMISTRZA, ITD.) */
            /* ========================================================= */
            
            .themed-app {
                background: var(--bg); color: var(--text); font-family: var(--font-app);
                transition: background 0.3s ease, color 0.3s ease;
                background-image: var(--pattern); background-position: 0 0, 10px 10px; background-size: 20px 20px;
            }
            .themed-modal {
                background: var(--bg); color: var(--text); font-family: var(--font-app);
                background-image: none !important; /* Modale nie mają patternów węglowych */
            }

            .g-bg { background: var(--bg) !important; }
            .g-panel { 
                background: var(--panel) !important; box-shadow: var(--shadow) !important; 
                backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); 
                border: 1px solid var(--border) !important; 
            }
            .g-text { color: var(--text) !important; }
            .g-text-muted { color: var(--text-muted) !important; }
            .g-accent { color: var(--primary) !important; }
            .g-border { border-color: var(--border) !important; }
            
            .g-btn { 
                border: 1px solid var(--border) !important; color: var(--text) !important; 
                background: transparent !important; transition: all 0.2s !important; 
            }
            .g-btn:hover { 
                background: var(--primary) !important; color: #000 !important; 
                border-color: var(--primary) !important; text-shadow: none !important; 
                box-shadow: 0 0 10px var(--primary) !important; 
            }
            
            .g-range { background: var(--border) !important; accent-color: var(--primary) !important; }
            .g-tab { color: var(--text-muted) !important; border-bottom: 2px solid transparent !important; transition: all 0.2s !important; }
            .g-tab.active { border-bottom-color: var(--primary) !important; color: var(--primary) !important; }
            
            .g-item { border-bottom: 1px solid var(--border) !important; transition: background 0.2s !important; }
            .g-item:hover { background: rgba(255,255,255,0.05) !important; }
            .g-item.active { background: rgba(255,255,255,0.1) !important; border-left: 4px solid var(--primary) !important; }
            
            .g-icon-btn { color: var(--text-muted) !important; transition: color 0.2s, transform 0.2s !important; }
            .g-icon-btn:hover { color: var(--text) !important; transform: scale(1.1) !important; }
            
            .g-play-btn { color: var(--primary) !important; transition: transform 0.2s, text-shadow 0.2s !important; text-shadow: 0 0 15px var(--primary) !important; }
            .g-play-btn:hover { transform: scale(1.1) !important; text-shadow: 0 0 25px var(--primary) !important; }
        `;
    }
};

// Automatyczna inicjalizacja przy starcie systemu
setTimeout(themeManager.init, 100);