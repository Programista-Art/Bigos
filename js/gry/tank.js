// ======================================================================
// PLIK: js/gry/tank.js (Klon Battle City 1985 - Edycja Ostateczna 650px)
// ======================================================================

games.tank = {
    c: null, ctx: null, loop: null, active: false,
    tileSize: 50,
    gameState: 'MENU', // MENU, PLAYING, EDITOR, TRANSITION, SCORES, CRASHED
    
    player: { x: 0, y: 0, w: 40, h: 40, speed: 4.0, dir: 'UP', isAlive: true, stars: 0, lives: 3, invulnerable: 0, sliding: false },
    bullets: [], enemies: [], particles: [], powerups: [],
    eagle: { x: 6 * 50, y: 12 * 50, isAlive: true },
    map: [], score: 0, currentLevel: 1, maxLevels: 35,
    selectedMenuIndex: 0, selectedLevel: 1, menuInputTimer: 0,
    
    enemySpawnTimer: 0, enemiesToSpawn: 20,
    freezeTimer: 0, shovelTimer: 0,
    introTimer: 0, 
    
    editorCursor: { x: 6, y: 6 }, editorTile: 1,
    isDrawing: false, isSaving: false, levelComplete: false,
    
    bgMusic: null,
    assets: {}, assetsLoaded: false,
    theme: {},
    lastScores: [],
    
    // Baza ręcznych poziomów
    baseLevels: [
        [ // Lvl 1
            [0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,1,1,0,1,1,0,1,1,0,1,1,0],
            [0,1,1,0,1,1,0,1,1,0,1,1,0],
            [0,1,1,0,1,1,2,1,1,0,1,1,0],
            [0,1,1,0,1,1,0,1,1,0,1,1,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,1,1,0,2,0,0,0,2,0,1,1,0],
            [0,1,1,0,2,1,1,1,2,0,1,1,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0],
            [1,1,0,1,1,1,0,1,1,1,0,1,1],
            [0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,1,1,0,0,1,1,1,0,0,1,1,0],
            [0,1,1,0,0,1,5,1,0,0,1,1,0]
        ],
        [ // Lvl 2
            [0,0,0,0,0,0,0,0,0,0,0,0,0],
            [1,1,1,0,3,3,3,3,3,0,1,1,1],
            [1,0,0,0,3,3,3,3,3,0,0,0,1],
            [1,0,2,0,3,3,0,3,3,0,2,0,1],
            [1,0,2,0,0,0,0,0,0,0,2,0,1],
            [0,0,0,0,1,1,2,1,1,0,0,0,0],
            [3,3,3,0,1,1,2,1,1,0,3,3,3],
            [3,3,3,0,0,0,0,0,0,0,3,3,3],
            [0,0,0,0,1,1,1,1,1,0,0,0,0],
            [1,1,1,0,1,1,1,1,1,0,1,1,1],
            [1,1,1,0,0,0,0,0,0,0,1,1,1],
            [0,0,0,0,0,1,1,1,0,0,0,0,0],
            [0,0,0,0,0,1,5,1,0,0,0,0,0]
        ],
        [ // Lvl 3
            [0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,7,7,7,7,0,1,0,7,7,7,7,0],
            [0,7,7,7,7,0,1,0,7,7,7,7,0],
            [0,0,0,0,0,0,1,0,0,0,0,0,0],
            [1,1,1,0,4,4,4,4,4,0,1,1,1],
            [1,1,1,0,4,4,4,4,4,0,1,1,1],
            [0,0,0,0,4,4,2,4,4,0,0,0,0],
            [7,7,7,0,4,4,4,4,4,0,7,7,7],
            [7,7,7,0,4,4,4,4,4,0,7,7,7],
            [0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,1,1,1,0,7,7,7,0,1,1,1,0],
            [0,1,1,1,0,1,1,1,0,1,1,1,0],
            [0,0,0,0,0,1,5,1,0,0,0,0,0]
        ],
        [ // Lvl 4
            [0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,2,2,0,1,1,1,1,1,0,2,2,0],
            [0,2,2,0,1,0,0,0,1,0,2,2,0],
            [0,0,0,0,1,0,2,0,1,0,0,0,0],
            [1,1,0,2,2,0,2,0,2,2,0,1,1],
            [1,1,0,0,0,0,0,0,0,0,0,1,1],
            [0,0,0,2,2,1,1,1,2,2,0,0,0],
            [1,1,0,0,0,0,0,0,0,0,0,1,1],
            [1,1,0,2,2,0,2,0,2,2,0,1,1],
            [0,0,0,0,1,0,2,0,1,0,0,0,0],
            [0,2,2,0,1,0,0,0,1,0,2,2,0],
            [0,2,2,0,0,1,1,1,0,0,2,2,0],
            [0,0,0,0,0,1,5,1,0,0,0,0,0]
        ]
    ],
    levels: [],

    generateLevels: function() {
        this.levels = [];
        this.baseLevels.forEach(lvl => this.levels.push(lvl.map(row => [...row])));
        
        for(let i = this.levels.length + 1; i <= 35; i++) {
            let lvl = [];
            for(let r=0; r<13; r++) {
                let row = [];
                for(let c=0; c<13; c++) {
                    if (r===12 && (c===5||c===6||c===7)) row.push(c===6?5:1);
                    else if (r===11 && (c===5||c===6||c===7)) row.push(1);
                    else {
                        let symC = c > 6 ? 12 - c : c;
                        let rand = Math.sin(i * 13 + r * 7 + symC * 3);
                        if (rand > 0.6) row.push(1); 
                        else if (rand > 0.4 && r > 2) row.push(2); 
                        else if (rand > 0.3 && r > 4) row.push(3); 
                        else if (rand > 0.2) row.push(7); 
                        else row.push(0);
                    }
                }
                lvl.push(row);
            }
            this.levels.push(lvl);
        }
    },

    initAssets: function() {
        if(this.assetsLoaded) return;
        const imgNames = [
            'player', 'player_1', 'player_2', 'enemy', 'enemy_flash', 
            'enemy_fast', 'enemy_heavy', 'enemy_armored1', 'enemy_armored2', 'enemy_armored3', 'enemy_armored4',
            'brick', 'steel', 'eagle', 'eagle_dead', 'water', 'ice', 'forest',
            'powerup_tank', 'powerup_star', 'powerup_bomb', 'powerup_clock', 'powerup_shovel', 'powerup_helmet', 'powerup_gun',
            'bullet_player', 'bullet_enemy', 'explosion'
        ];
        imgNames.forEach(name => {
            this.assets[name] = new Image();
            this.assets[name].src = `games/img/tank_${name}.png`; 
        });
        
        if (!this.bgMusic) {
            this.bgMusic = new Audio('games/sound/tank_bg.mp3');
            this.bgMusic.volume = 0.2; 
            this.bgMusic.loop = true;  
        }
        
        this.generateLevels();
        this.assetsLoaded = true;
    },

    updateColors: function() {
        if (!this.theme) this.theme = {};
        const style = getComputedStyle(document.body);
        this.theme.bg = style.getPropertyValue('--bg').trim() || '#0f172a';
        this.theme.panel = style.getPropertyValue('--panel').trim() || '#1e293b';
        this.theme.primary = style.getPropertyValue('--primary').trim() || '#10b981';
        this.theme.text = style.getPropertyValue('--text').trim() || '#ffffff';
        this.theme.muted = style.getPropertyValue('--text-muted').trim() || '#aaaaaa';
        this.theme.border = style.getPropertyValue('--border').trim() || '#4b5563';
    },

    getMousePos: function(e) {
        const rect = this.c.getBoundingClientRect();
        const scaleX = this.c.width / rect.width;
        const scaleY = this.c.height / rect.height;
        let clientX = e.clientX, clientY = e.clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
        }
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    },

    init: function() {
        if(typeof stopAllSounds !== 'undefined') stopAllSounds();
        if(this.loop) { cancelAnimationFrame(this.loop); this.loop = null; }
        
        this.c = document.getElementById('canvas-tank');
        this.ctx = this.c.getContext('2d');
        this.c.width = 650; 
        this.c.height = 650; // Ujednolicony rozmiar wysokiej rozdzielczości
        
        this.initAssets(); 
        this.ensureMobileControls(); 
        
        try {
            const saved = localStorage.getItem('bigos_tank_scores');
            if (saved) this.lastScores = JSON.parse(saved);
        } catch(e) {}

        // Powiększenie okna pod nową rozdzielczość
        const win = document.getElementById('app-tank');
        if (win && !win.dataset.resized) {
            win.style.width = '700px'; 
            win.classList.remove('w-[340px]');
            
            setTimeout(() => {
                if (!win.classList.contains('maximized')) {
                    const w = win.offsetWidth || 700;
                    const h = win.offsetHeight || 750;
                    win.style.left = Math.max(0, (window.innerWidth - w) / 2) + 'px';
                    win.style.top = Math.max(0, (window.innerHeight - h - 48) / 2) + 'px';
                }
            }, 10);
            win.dataset.resized = "true";
        }

        this.gameState = 'MENU';
        this.active = true;
        this.selectedMenuIndex = 0;
        this.selectedLevel = 1;
        this.menuInputTimer = 0;
        this.isDrawing = false;
        
        this.c.onmousedown = (e) => { 
            e.preventDefault(); 
            if(this.gameState === 'EDITOR') { this.isDrawing = true; this.handleEditorClick(e); }
            else if (this.gameState !== 'PLAYING' && this.gameState !== 'TRANSITION') this.handleMenuClick(e); 
        };
        this.c.onmousemove = (e) => {
            if(this.gameState === 'EDITOR' && this.isDrawing) this.handleEditorClick(e);
        };
        this.c.onmouseup = () => { this.isDrawing = false; };
        this.c.onmouseleave = () => { this.isDrawing = false; };
        
        this.c.ontouchstart = (e) => { 
            e.preventDefault(); 
            if(this.gameState === 'EDITOR') { this.isDrawing = true; this.handleEditorClick(e.touches[0]); }
            else if (this.gameState !== 'PLAYING' && this.gameState !== 'TRANSITION') this.handleMenuClick(e.touches[0]); 
        };
        this.c.ontouchmove = (e) => {
            if(this.gameState === 'EDITOR' && this.isDrawing) this.handleEditorClick(e.touches[0]);
        };
        this.c.ontouchend = () => { this.isDrawing = false; };

        this.update(); 
    },

    ensureMobileControls: function() {
        const parent = this.c.parentElement;
        if (!parent) return; 

        let clearAttempts = 0;
        const clearJunk = setInterval(() => {
            const junk = parent.querySelectorAll('.mobile-dpad:not(.mobile-dpad-tank), .game-fs-btn:not(.tank-fs), .pc-start-btn:not(.tank-start)');
            junk.forEach(j => j.remove());
            clearAttempts++;
            if (clearAttempts > 10) clearInterval(clearJunk);
        }, 300);

        const existingControls = parent.querySelectorAll('.tank-controls-container, .mobile-dpad-tank');
        existingControls.forEach(el => el.remove());

        if(!document.getElementById('tank-styles')) {
            const style = document.createElement('style');
            style.id = 'tank-styles';
            style.innerHTML = `
                .mobile-dpad-tank { display: none !important; }
                @media (max-width: 768px) {
                    .tank-fs { display: none !important; }
                    .window.active:not(.minimized) .mobile-dpad-tank { 
                        display: flex !important; flex-direction: column; align-items: center; gap: 15px;
                        padding: 10px 20px; width: 100%; margin-top: auto; margin-bottom: 10px; flex-shrink: 0;
                    }
                    .tank-dpad-grid { display: grid; grid-template-columns: repeat(3, 60px); grid-template-rows: repeat(3, 60px); gap: 8px; }
                    .tank-shoot-btn { 
                        width: 80px; height: 80px; border-radius: 50%; 
                        background: linear-gradient(145deg, #ef4444, #b91c1c) !important; 
                        border: 4px solid #7f1d1d !important; font-size: 32px !important; display: flex; align-items: center; justify-content: center; 
                        box-shadow: 0 8px 15px rgba(0,0,0,0.5), inset 0 -4px 6px rgba(0,0,0,0.3); cursor: pointer; user-select: none; touch-action: manipulation; 
                    }
                    .tank-shoot-btn:active { background: #b91c1c !important; transform: translateY(4px) scale(0.95); box-shadow: 0 2px 5px rgba(0,0,0,0.5), inset 0 4px 6px rgba(0,0,0,0.4); }
                    .tank-dir-btn { background: linear-gradient(145deg, #4b5563, #374151); color: white; border-radius: 14px; font-size: 24px; display: flex; align-items: center; justify-content: center; user-select: none; touch-action: manipulation; border: 2px solid #1f2937; cursor: pointer; box-shadow: 0 6px 10px rgba(0,0,0,0.4), inset 0 -3px 5px rgba(0,0,0,0.3); }
                    .tank-dir-btn:active { background: #374151; transform: translateY(4px) scale(0.95); box-shadow: 0 2px 4px rgba(0,0,0,0.4), inset 0 3px 5px rgba(0,0,0,0.3); }
                    
                    .tank-controls-row { display: flex; justify-content: space-between; align-items: center; width: 100%; max-width: 450px; }
                    
                    .tank-menu-btn {
                        width: 100%; max-width: 450px; height: 50px; border-radius: 14px; display: flex; align-items: center; justify-content: center; gap: 10px;
                        background: var(--panel); color: var(--text); border: 2px solid var(--border); box-shadow: 0 6px 10px rgba(0,0,0,0.4);
                        user-select: none; touch-action: manipulation; cursor: pointer; transition: transform 0.1s;
                    }
                    .tank-menu-btn:active { transform: translateY(4px) scale(0.98); box-shadow: 0 2px 4px rgba(0,0,0,0.4); }
                    .tank-menu-btn .icon { font-size: 24px; }
                    .tank-menu-btn .lbl { font-size: 14px; font-weight: bold; color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; }
                }
            `;
            document.head.appendChild(style);
        }

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'tank-controls-container flex flex-col items-center mt-2 shrink-0 w-full';
        
        const win = this.c.closest('.window');
        const fsBtn = document.createElement('button');
        fsBtn.className = 'tank-fs hidden md:block w-full max-w-[320px] self-center my-2 px-4 py-2 rounded-lg font-bold shadow-md transition hover:scale-105 text-[13px]';
        fsBtn.style.backgroundColor = 'var(--primary)';
        fsBtn.style.color = '#000';
        fsBtn.style.border = '2px solid var(--border)';
        fsBtn.innerHTML = 'Powiększ Okno Gry / Zmniejsz'; 
        fsBtn.onclick = () => { if(win && typeof winManager !== 'undefined') winManager.maximize(win.id); };
        
        const dpad = document.createElement('div');
        dpad.className = 'mobile-dpad-tank';
        dpad.innerHTML = `
            <div class="tank-controls-row">
                <div class="tank-dpad-grid">
                    <div class="tank-dir-btn" style="grid-column: 2; grid-row: 1;" data-key="ArrowUp">▲</div>
                    <div class="tank-dir-btn" style="grid-column: 1; grid-row: 2;" data-key="ArrowLeft">◀</div>
                    <div class="tank-dir-btn" style="grid-column: 2; grid-row: 2;" data-key="ArrowDown">▼</div>
                    <div class="tank-dir-btn" style="grid-column: 3; grid-row: 2;" data-key="ArrowRight">▶</div>
                </div>
                <div class="tank-shoot-btn d-action-start" data-key="Space">💥</div>
            </div>
            <div class="tank-menu-btn" data-menu="true">
                <div class="icon">🏠</div><span class="lbl">MENU GRY</span>
            </div>
        `;
        
        dpad.querySelectorAll('.tank-dir-btn, .tank-shoot-btn, .tank-menu-btn').forEach(btn => {
            const key = btn.getAttribute('data-key');
            const isAction = btn.classList.contains('d-action-start');
            const isMenu = btn.getAttribute('data-menu') === 'true';
            
            const press = (e) => { 
                e.preventDefault(); 
                if (isMenu) { this.init(); return; }
                if (isAction && this.gameState === 'MENU') { this.startFromMenu(); return; }
                if (isAction && this.gameState === 'EDITOR') { this.saveEditorMap(); return; }
                if (this.gameState === 'PLAYING' && isAction) { this.doAction(); }
                if (typeof gryKeys !== 'undefined' && key) gryKeys[key] = true; 
            };
            const release = (e) => { e.preventDefault(); if (typeof gryKeys !== 'undefined' && key) gryKeys[key] = false; };
            
            btn.addEventListener('mousedown', press); 
            btn.addEventListener('mouseup', release); 
            btn.addEventListener('mouseleave', release);
            btn.addEventListener('touchstart', press, {passive: false}); 
            btn.addEventListener('touchend', release, {passive: false});
        });
        
        controlsDiv.appendChild(fsBtn);
        controlsDiv.appendChild(dpad);
        
        const startBtn = parent.querySelector('button[onclick^="games."]');
        if(startBtn) {
            startBtn.classList.add('tank-start', 'shrink-0', 'hidden', 'sm:block'); 
            startBtn.innerHTML = "🏠 Menu Gry";
            startBtn.onclick = () => { this.init(); };
            parent.insertBefore(controlsDiv, startBtn.nextSibling);
        } else {
            parent.appendChild(controlsDiv);
        }
    },

    handleMenuClick: function(e) {
        let pos = this.getMousePos(e);
        let y = pos.y;
        
        if (this.gameState === 'MENU') {
            if (y > 250 && y < 340) this.startFromMenu(); 
            else if (y > 380 && y < 460) this.gameState = 'SCORES'; 
        } 
        else if (this.gameState === 'SCORES') {
            if (y > 500 && y < 560) {
                this.clearScores(); 
            } else {
                this.gameState = 'MENU'; 
            }
        }
    },

    startFromMenu: function() {
        if (this.selectedMenuIndex === 0) {
            this.currentLevel = this.selectedLevel;
            this.score = 0;
            this.player.lives = 3;
            this.player.stars = 0;
            this.loadLevel();
        } else {
            this.startEditor();
        }
        if(typeof gryKeys !== 'undefined') gryKeys['Space'] = false; 
    },

    startEditor: function() {
        this.gameState = 'EDITOR';
        this.c.height = 700; // Dodatkowe 50px na narzędzia
        
        let savedMap = localStorage.getItem('bigos_tank_custom');
        if (savedMap) {
            this.map = JSON.parse(savedMap);
        } else {
            this.map = Array(13).fill().map(()=>Array(13).fill(0));
            this.map[12][6] = 5; 
            this.map[12][5] = 1; this.map[11][5] = 1; this.map[11][6] = 1; this.map[11][7] = 1; this.map[12][7] = 1;
        }
    },
    
    handleEditorClick: function(e) {
        if(this.gameState !== 'EDITOR') return;
        const rect = this.c.getBoundingClientRect();
        const scaleX = this.c.width / rect.width;
        const scaleY = this.c.height / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;
        
        if (cy < 50) {
            const tools = [0, 1, 2, 3, 4, 7];
            const idx = Math.floor(cx / 50);
            if (idx < tools.length) this.editorTile = tools[idx];
            else if (idx >= 10 && !this.isSaving) { 
                this.isSaving = true; 
                this.saveEditorMap(); 
                setTimeout(() => { this.isSaving = false; }, 1000);
            }
            return;
        }
        
        const r = Math.floor((cy - 50) / this.tileSize);
        const c = Math.floor(cx / this.tileSize);
        
        if (r >= 0 && r < 13 && c >= 0 && c < 13) {
            if (!(r === 12 && c === 6)) {
                this.map[r][c] = this.editorTile;
            }
        }
    },
    
    saveEditorMap: function() {
        localStorage.setItem('bigos_tank_custom', JSON.stringify(this.map));
        if(typeof apps !== 'undefined') apps.showToast('Edytor', 'Zapisano własną mapę jako Poziom 0!', 'success');
        this.selectedLevel = 0;
        this.currentLevel = 0;
        this.score = 0;
        this.player.lives = 3;
        this.player.stars = 0;
        this.c.height = 650; 
        this.loadLevel();
    },

    loadLevel: function() {
        this.levelComplete = false;
        this.gameState = 'TRANSITION';
        this.introTimer = 120;
        
        if (this.bgMusic) { this.bgMusic.pause(); this.bgMusic.currentTime = 0; }
        
        if (this.currentLevel === 0) {
            let savedMap = localStorage.getItem('bigos_tank_custom');
            if (savedMap) this.map = JSON.parse(savedMap);
            else this.map = this.levels[0].map(row => [...row]); 
        } else {
            let lvlIdx = (this.currentLevel - 1) % this.maxLevels;
            this.map = this.levels[lvlIdx].map(row => [...row]);
        }
        
        this.eagle = { x: 6 * this.tileSize, y: 12 * this.tileSize, isAlive: true };
        this.spawnPlayer();
        this.bullets = []; this.enemies = []; this.particles = []; this.powerups = [];
        this.enemiesToSpawn = 20;
        this.enemySpawnTimer = 0;
        this.freezeTimer = 0;
        this.shovelTimer = 0;
        
        this.updateScoreUI();
    },

    spawnPlayer: function() {
        this.player.x = 4 * this.tileSize + 5;
        this.player.y = 12 * this.tileSize + 5;
        this.player.dir = 'UP';
        this.player.isAlive = true;
        this.player.invulnerable = 180; 
    },

    doAction: function() {
        if(this.gameState !== 'PLAYING' || !this.player.isAlive) return;
        const maxBullets = this.player.stars >= 2 ? 2 : 1;
        const bulletSpeed = this.player.stars >= 1 ? 10 : 8;
        
        if(this.bullets.filter(b => b.owner === 'player').length < maxBullets) {
            let bx = this.player.x + this.player.w/2 - 5;
            let by = this.player.y + this.player.h/2 - 5;
            this.bullets.push({ x: bx, y: by, w: 10, h: 10, dir: this.player.dir, speed: bulletSpeed, owner: 'player', heavyPiercing: this.player.stars >= 3 });
            if(typeof playSnd !== 'undefined') playSnd('shoot');
        }
        if(typeof gryKeys !== 'undefined') gryKeys['Space'] = false; 
    },

    checkCollision: function(rect1, rect2) {
        return (rect1.x < rect2.x + rect2.w && rect1.x + rect1.w > rect2.x &&
                rect1.y < rect2.y + rect2.h && rect1.y + rect1.h > rect2.y);
    },

    checkMapCollision: function(rect, isBullet) {
        if (rect.x < 0 || rect.x + rect.w > 650 || rect.y < 0 || rect.y + rect.h > 650) return true;

        for(let r=0; r<13; r++) {
            for(let c=0; c<13; c++) {
                let tile = this.map[r][c];
                if (tile >= 1 && tile < 3 || tile === 5 || tile === 6 || (!isBullet && tile === 3)) { 
                    let tr = { x: c * this.tileSize, y: r * this.tileSize, w: this.tileSize, h: this.tileSize };
                    
                    if (tile === 1.1) { tr.h /= 2; } 
                    else if (tile === 1.2) { tr.y += this.tileSize/2; tr.h /= 2; } 
                    else if (tile === 1.3) { tr.w /= 2; } 
                    else if (tile === 1.4) { tr.x += this.tileSize/2; tr.w /= 2; } 

                    if(this.checkCollision(rect, tr)) return {r: r, c: c, tile: tile};
                }
            }
        }
        return false;
    },

    spawnEnemy: function() {
        if (this.enemiesToSpawn <= 0) return;
        const spawnPoints = [ {x: 0, y: 0}, {x: 6 * this.tileSize, y: 0}, {x: 12 * this.tileSize, y: 0} ];
        const pt = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
        let canSpawn = !this.enemies.some(e => this.checkCollision({x: pt.x, y: pt.y, w: 40, h: 40}, e));
        
        if (canSpawn) {
            const isFlashing = Math.random() < 0.25;
            const enemyTypes = [
                { type: 'basic', hp: 1, speed: 1.5, score: 1 },
                { type: 'fast', hp: 1, speed: 3.0, score: 2 },
                { type: 'heavy', hp: 1, speed: 1.5, score: 3, heavyPiercing: true }, 
                { type: 'armored', hp: 4, speed: 1.0, score: 4 } 
            ];
            
            let typeIdx = 0;
            let rand = Math.random();
            if (this.currentLevel > 1) {
                if (rand < 0.2) typeIdx = 1;
                else if (rand < 0.4) typeIdx = 2;
                else if (rand < 0.6) typeIdx = 3;
            }

            const type = enemyTypes[typeIdx];

            this.enemies.push({ 
                x: pt.x + 5, y: pt.y + 5, w: 40, h: 40, 
                speed: type.speed, dir: 'DOWN', 
                hp: type.hp, maxHp: type.hp, eType: type.type, heavyPiercing: type.heavyPiercing,
                lastShot: Date.now(), isFlashing: isFlashing 
            });
            this.enemiesToSpawn--;
            this.updateScoreUI();
        }
    },

    spawnPowerup: function() {
        const types = ['tank', 'star', 'bomb', 'clock', 'shovel', 'helmet', 'gun'];
        const type = types[Math.floor(Math.random() * types.length)];
        const px = Math.floor(Math.random() * 12) * this.tileSize;
        const py = Math.floor(Math.random() * 12) * this.tileSize;
        this.powerups.push({ type: type, x: px, y: py, w: this.tileSize, h: this.tileSize, timer: 600 });
        if(typeof playSnd !== 'undefined') playSnd('score');
    },

    applyPowerup: function(type) {
        if(typeof playSnd !== 'undefined') playSnd('eat');
        switch(type) {
            case 'tank': this.player.lives++; break;
            case 'star': if(this.player.stars < 3) this.player.stars++; break;
            case 'gun': this.player.stars = 3; break;
            case 'bomb': 
                this.enemies.forEach(e => {
                    this.particles.push({x: e.x, y: e.y, timer: 15});
                    this.score += (e.eType === 'armored' ? 4 : (e.eType === 'heavy' ? 3 : (e.eType === 'fast' ? 2 : 1)));
                });
                this.enemies = [];
                if(typeof playSnd !== 'undefined') playSnd('explosion');
                break;
            case 'clock': this.freezeTimer = 400; break;
            case 'helmet': this.player.invulnerable = 600; break;
            case 'shovel': 
                this.shovelTimer = 1000;
                this.map[11][5] = 2; this.map[11][6] = 2; this.map[11][7] = 2;
                this.map[12][5] = 2; this.map[12][7] = 2;
                break;
        }
        this.updateScoreUI();
    },

    saveScore: function() {
        if (this.score === 0) return;
        this.lastScores.unshift({ date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(), score: this.score, level: this.currentLevel });
        if (this.lastScores.length > 8) this.lastScores.pop();
        localStorage.setItem('bigos_tank_scores', JSON.stringify(this.lastScores));
    },

    clearScores: function() {
        this.lastScores = [];
        localStorage.removeItem('bigos_tank_scores');
        if (typeof apps !== 'undefined') apps.showToast('Historia', 'Wyzerowano tablicę wyników.', 'info');
    },

    updateScoreUI: function() {
        const el = document.getElementById('tank-score');
        let lvlDisplay = this.currentLevel === 0 ? 'Własna' : this.currentLevel;
        if(el) {
            el.innerText = `Lvl: ${lvlDisplay} | Wynik: ${this.score} | Wróg: ${this.enemiesToSpawn} | Życia: ${this.player.lives}`;
            // Dopasowanie do theme.js
            el.className = 'font-bold mb-4 g-accent text-xl sm:text-3xl drop-shadow-md tracking-wider text-center';
        }
    },

    update: function() {
        if(!this.active) return;
        this.updateColors();
        
        if (this.gameState === 'MENU') {
            this.updateMenu();
            this.drawMenu();
        } else if (this.gameState === 'SCORES') {
            this.drawScores();
        } else if (this.gameState === 'TRANSITION') {
            if (this.introTimer > 0) {
                this.introTimer--;
            } else {
                this.gameState = 'PLAYING';
                if (this.bgMusic) { 
                    this.bgMusic.currentTime = 0; 
                    this.bgMusic.play().catch(e=>{}); 
                }
            }
            this.drawTransition();
        } else if (this.gameState === 'EDITOR') {
            this.drawEditor();
        } else if (this.gameState === 'CRASHED') {
            this.drawPlaying(); // Zatrzymana klatka po przegranej
        } else if (this.gameState === 'PLAYING') {
            this.updatePlaying();
            this.drawPlaying();
        }
        
        if(this.active) this.loop = requestAnimationFrame(() => this.update());
    },

    updateMenu: function() {
        if (typeof gryKeys === 'undefined') return;
        if (this.menuInputTimer > 0) this.menuInputTimer--;
        
        if (this.menuInputTimer <= 0) {
            if (gryKeys['ArrowDown'] || gryKeys['KeyS']) { this.selectedMenuIndex = 1; this.menuInputTimer = 15; }
            if (gryKeys['ArrowUp'] || gryKeys['KeyW']) { this.selectedMenuIndex = 0; this.menuInputTimer = 15; }
            
            if (this.selectedMenuIndex === 0) { 
                if (gryKeys['ArrowRight'] || gryKeys['KeyD']) {
                    this.selectedLevel++;
                    if(this.selectedLevel > 35) this.selectedLevel = 0;
                    this.menuInputTimer = 10;
                }
                if (gryKeys['ArrowLeft'] || gryKeys['KeyA']) {
                    this.selectedLevel--;
                    if(this.selectedLevel < 0) this.selectedLevel = 35;
                    this.menuInputTimer = 10;
                }
            }
            if (gryKeys['Space'] || gryKeys['Enter']) {
                this.startFromMenu();
                this.menuInputTimer = 30;
            }
        }
    },

     drawMenu: function() {
        this.ctx.fillStyle = this.theme.bg; this.ctx.fillRect(0,0,650,650);
        
        this.ctx.fillStyle = '#ef4444';
        this.ctx.font = "bold 80px Arial"; this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle";
        this.ctx.fillText("Czołgi", 325, 100);
        this.ctx.fillStyle = '#fde047';
        
        // Przycisk Start (Wyżej, wyśrodkowany tekst)
        this.ctx.fillStyle = this.theme.primary;
        this.ctx.fillRect(175, 180, 300, 50); // Przycisk na Y: 180, Wysokość: 50
        this.ctx.fillStyle = '#000';
        this.ctx.font = "bold 32px Arial";
        this.ctx.fillText("▶ START GRY", 325, 205); // Środek przycisku to 180 + 25 = 205

        // Przycisk Wyniki (Mniejszy odstęp 30px, wyśrodkowany tekst)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(175, 260, 300, 50); // Przycisk na Y: 260
        this.ctx.strokeStyle = this.theme.border;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(175, 260, 300, 50);
        this.ctx.fillStyle = this.theme.text;
        this.ctx.font = "bold 26px Arial";
        this.ctx.fillText("🏆 Ostatnie Wyniki", 325, 285); // Środek przycisku to 260 + 25 = 285

        // Selektor poziomu (Podniesiony)
        let lvlStr = this.selectedLevel === 0 ? "WŁASNA MAPA" : `POZIOM ${this.selectedLevel}`;
        this.ctx.font = "bold 24px Arial";
        if (this.selectedMenuIndex === 0) {
            this.ctx.fillStyle = '#38bdf8';
            this.ctx.fillText(`◀  ${lvlStr}  ▶`, 325, 350);
        } else {
            this.ctx.fillStyle = this.theme.muted;
            this.ctx.fillText(`${lvlStr}`, 325, 350);
        }

        // Opcje menu (Podniesione i mniejszy odstęp między nimi)
        this.ctx.font = "24px Arial"; this.ctx.fillStyle = this.theme.text;
        this.ctx.fillText("🚜", 235, this.selectedMenuIndex === 0 ? 420 : 460);
        
        this.ctx.textAlign = "left";
        this.ctx.fillText("1 GRACZ", 275, 420);
        this.ctx.fillText("KONSTRUKCJA", 275, 460);
        
        this.ctx.textAlign = "center";
    },
    drawScores: function() {
        this.ctx.fillStyle = this.theme.bg; 
        this.ctx.fillRect(0, 0, 650, 650); 

        this.ctx.fillStyle = this.theme.primary;
        this.ctx.font = "bold 50px Arial"; this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle";
        this.ctx.fillText("🏆 WYNIKI 🏆", 325, 80);

        this.ctx.textAlign = "left";
        this.ctx.font = "26px Arial";
        this.ctx.fillStyle = this.theme.text;

        if (this.lastScores.length === 0) {
            this.ctx.textAlign = "center";
            this.ctx.fillStyle = this.theme.muted;
            this.ctx.fillText("Brak zapisanych wyników.", 325, 250);
        } else {
            let startY = 160;
            this.lastScores.forEach((s, i) => {
                this.ctx.fillText(`${i+1}. Lvl:${s.level} - ${s.date}`, 80, startY);
                this.ctx.fillStyle = this.theme.primary;
                this.ctx.fillText(`Punkty: ${s.score}`, 450, startY);
                this.ctx.fillStyle = this.theme.text;
                startY += 45;
            });
        }

        this.ctx.fillStyle = '#ef4444';
        this.ctx.fillRect(205, 500, 240, 60);
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = "center";
        this.ctx.font = "bold 22px Arial";
        this.ctx.fillText("🗑️ Wyczyść Wyniki", 325, 530);

        this.ctx.fillStyle = this.theme.muted;
        this.ctx.font = "18px Arial";
        this.ctx.fillText("« Kliknij dowolny obszar powyżej, aby wrócić »", 325, 610);
    },

    drawTransition: function() {
        this.ctx.fillStyle = '#7f8c8d'; 
        this.ctx.fillRect(0,0,650,650);
        this.ctx.fillStyle = '#000';
        this.ctx.font = "bold 48px Arial"; this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle";
        let text = this.currentLevel === 0 ? "WŁASNA MAPA" : `POZIOM ${this.currentLevel}`;
        this.ctx.fillText(text, 325, 325);
    },

    drawEditor: function() {
        this.ctx.fillStyle = '#000'; this.ctx.fillRect(0,50,650,650);
        
        this.ctx.fillStyle = '#444'; this.ctx.fillRect(0,0,650,50);
        
        const drawT = (tile, tx, ty) => {
            if(tile===1) this.ctx.fillText('🧱', tx, ty - 6);
            else if(tile===2) this.ctx.fillText('⬜', tx+4, ty - 2);
            else if(tile===3) this.ctx.fillText('🌊', tx, ty - 6);
            else if(tile===4) this.ctx.fillText('❄️', tx, ty - 6);
            else if(tile===7) this.ctx.fillText('🌲', tx, ty - 6);
            else if(tile===0) this.ctx.fillText('⬛', tx, ty - 6);
        };

        this.ctx.font = "40px Arial"; this.ctx.textAlign = "left"; this.ctx.textBaseline = "top";
        const tools = [0, 1, 2, 3, 4, 7];
        tools.forEach((t, i) => {
            if(this.editorTile === t) {
                this.ctx.fillStyle = '#fde047'; this.ctx.fillRect(i*50, 0, 50, 50);
            }
            drawT(t, i*50, 0);
        });
        
        this.ctx.fillStyle = '#10b981'; this.ctx.fillRect(500, 0, 150, 50);
        this.ctx.fillStyle = '#fff'; this.ctx.font = "20px Arial"; this.ctx.fillText("ZAPISZ", 520, 12);

        this.ctx.font = "50px Arial";
        for(let r=0; r<13; r++) {
            for(let c=0; c<13; c++) {
                let tx = c * this.tileSize; let ty = r * this.tileSize + 50;
                let tile = this.map[r][c];
                drawT(tile, tx, ty);
                if(tile===5) this.ctx.fillText('🦅', tx, ty - 6);
            }
        }
    },

    updatePlaying: function() {
        if(this.player.invulnerable > 0) this.player.invulnerable--;
        if(this.freezeTimer > 0) this.freezeTimer--;
        if(this.shovelTimer > 0) {
            this.shovelTimer--;
            if(this.shovelTimer === 0) {
                this.map[11][5] = 1; this.map[11][6] = 1; this.map[11][7] = 1;
                this.map[12][5] = 1; this.map[12][7] = 1;
            }
        }

        if (this.player.isAlive && typeof gryKeys !== 'undefined') {
            let nextX = this.player.x; let nextY = this.player.y;
            let moving = false; let alignTolerance = 24; 
            
            let kLeft = gryKeys['ArrowLeft'] || gryKeys['KeyA'];
            let kRight = gryKeys['ArrowRight'] || gryKeys['KeyD'];
            let kUp = gryKeys['ArrowUp'] || gryKeys['KeyW'];
            let kDown = gryKeys['ArrowDown'] || gryKeys['KeyS'];
            
            if(kLeft) { nextX -= this.player.speed; this.player.dir = 'LEFT'; moving = true; let tY = Math.round((this.player.y-5)/50)*50+5; if(Math.abs(this.player.y-tY)<alignTolerance) nextY=tY; }
            else if(kRight) { nextX += this.player.speed; this.player.dir = 'RIGHT'; moving = true; let tY = Math.round((this.player.y-5)/50)*50+5; if(Math.abs(this.player.y-tY)<alignTolerance) nextY=tY; }
            else if(kUp) { nextY -= this.player.speed; this.player.dir = 'UP'; moving = true; let tX = Math.round((this.player.x-5)/50)*50+5; if(Math.abs(this.player.x-tX)<alignTolerance) nextX=tX; }
            else if(kDown) { nextY += this.player.speed; this.player.dir = 'DOWN'; moving = true; let tX = Math.round((this.player.x-5)/50)*50+5; if(Math.abs(this.player.x-tX)<alignTolerance) nextX=tX; }
            
            let onIce = (this.map[Math.floor((this.player.y+35)/50)] && this.map[Math.floor((this.player.y+35)/50)][Math.floor((this.player.x+35)/50)] === 4);
            if (!moving && onIce) {
                if(this.player.dir === 'LEFT') nextX -= this.player.speed; if(this.player.dir === 'RIGHT') nextX += this.player.speed;
                if(this.player.dir === 'UP') nextY -= this.player.speed; if(this.player.dir === 'DOWN') nextY += this.player.speed;
            }

            if(gryKeys['Space']) this.doAction();

            if (nextX !== this.player.x || nextY !== this.player.y) {
                let tRect = { x: nextX, y: nextY, w: this.player.w, h: this.player.h };
                if (!this.checkMapCollision(tRect, false) && !this.enemies.some(e => this.checkCollision(tRect, e))) {
                    this.player.x = nextX; this.player.y = nextY;
                }
            }

            for(let i = this.powerups.length - 1; i >= 0; i--) {
                if (this.checkCollision(this.player, this.powerups[i])) { this.applyPowerup(this.powerups[i].type); this.powerups.splice(i, 1); }
            }
        }

        this.enemySpawnTimer++;
        if (this.enemySpawnTimer > 90) { 
            this.enemySpawnTimer = 0;
            let maxE = 3 + Math.floor(this.currentLevel / 4); 
            if (this.enemies.length < maxE) this.spawnEnemy(); 
        }

        if (this.freezeTimer <= 0) {
            this.enemies.forEach(e => {
                let nextX = e.x; let nextY = e.y;
                if (e.dir === 'UP') nextY -= e.speed; else if (e.dir === 'DOWN') nextY += e.speed;
                else if (e.dir === 'LEFT') nextX -= e.speed; else if (e.dir === 'RIGHT') nextX += e.speed;

                let tRect = { x: nextX, y: nextY, w: e.w, h: e.h };
                let col = this.checkMapCollision(tRect, false);
                let tCol = (this.player.isAlive && this.checkCollision(tRect, this.player)) || this.enemies.some(o => o !== e && this.checkCollision(tRect, o));

                if (col || tCol || Math.random() < 0.005) { 
                    let r = Math.random();
                    if (e.y < 11 * 50 && r < 0.4) e.dir = 'DOWN'; else if (e.x < 6 * 50 && r < 0.6) e.dir = 'RIGHT';
                    else if (e.x > 6 * 50 && r < 0.6) e.dir = 'LEFT'; else e.dir = ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(Math.random()*4)];
                } else {
                    e.x = nextX; e.y = nextY;
                }

                if (Date.now() - e.lastShot > 1000 && Math.random() < 0.03) {
                    this.bullets.push({ x: e.x + e.w/2 - 5, y: e.y + e.h/2 - 5, w: 10, h: 10, dir: e.dir, speed: 8, owner: 'enemy', heavyPiercing: e.heavyPiercing });
                    e.lastShot = Date.now();
                }
            });
        }

        for(let i = this.bullets.length - 1; i >= 0; i--) {
            if(this.bullets[i].dead) continue;
            for(let j = i - 1; j >= 0; j--) {
                if(this.bullets[j].dead) continue;
                if(this.bullets[i].owner !== this.bullets[j].owner) {
                    if(this.checkCollision(this.bullets[i], this.bullets[j])) {
                        this.bullets[i].dead = true;
                        this.bullets[j].dead = true;
                        this.particles.push({x: this.bullets[i].x, y: this.bullets[i].y, timer: 10});
                    }
                }
            }
        }
        this.bullets = this.bullets.filter(b => !b.dead);

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            if (b.dir === 'UP') b.y -= b.speed; else if (b.dir === 'DOWN') b.y += b.speed;
            else if (b.dir === 'LEFT') b.x -= b.speed; else if (b.dir === 'RIGHT') b.x += b.speed;

            let hitSomething = false;
            let mapHit = this.checkMapCollision(b, true);
            
            if (mapHit) {
                hitSomething = true;
                let c = mapHit.c; let r = mapHit.r; let tile = mapHit.tile;
                
                if (tile >= 1 && tile < 2) {
                    if (b.heavyPiercing) {
                        this.map[r][c] = 0; 
                    } else {
                        if (tile === 1) {
                            if (b.dir === 'UP') this.map[r][c] = 1.1; 
                            else if (b.dir === 'DOWN') this.map[r][c] = 1.2; 
                            else if (b.dir === 'LEFT') this.map[r][c] = 1.4; 
                            else if (b.dir === 'RIGHT') this.map[r][c] = 1.3; 
                        } else {
                            this.map[r][c] = 0; 
                        }
                    }
                    if(typeof playSnd !== 'undefined') playSnd('break');
                }
                else if (tile === 2) {
                    if (b.owner === 'player' && this.player.stars >= 3) { this.map[r][c] = 0; if(typeof playSnd !== 'undefined') playSnd('break'); } 
                    else { if(typeof playSnd !== 'undefined') playSnd('bounce'); }
                }
                else if (tile === 5) {
                    this.map[r][c] = 6; this.eagle.isAlive = false;
                    if(typeof playSnd !== 'undefined') playSnd('explosion');
                    this.triggerGameOver();
                }
            }

            if (!hitSomething && b.owner === 'player') {
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    let e = this.enemies[j];
                    if (this.checkCollision(b, e)) {
                        hitSomething = true;
                        e.hp--;
                        if(e.hp <= 0) {
                            if(e.isFlashing) this.spawnPowerup();
                            this.enemies.splice(j, 1);
                            this.score += (e.eType === 'armored' ? 4 : (e.eType === 'heavy' ? 3 : (e.eType === 'fast' ? 2 : 1)));
                            this.updateScoreUI();
                            this.particles.push({x: e.x, y: e.y, timer: 15});
                            if(typeof playSnd !== 'undefined') playSnd('explosion');
                        } else {
                            if(typeof playSnd !== 'undefined') playSnd('bounce'); 
                        }
                        break;
                    }
                }
            }

            if (!hitSomething && b.owner === 'enemy' && this.player.isAlive) {
                if (this.checkCollision(b, this.player)) {
                    hitSomething = true;
                    if (this.player.invulnerable <= 0) {
                        this.player.isAlive = false;
                        this.particles.push({x: this.player.x, y: this.player.y, timer: 20});
                        if(typeof playSnd !== 'undefined') playSnd('crash'); 
                        this.player.stars = 0; 
                        this.player.lives--;
                        this.updateScoreUI();
                        
                        if (this.player.lives > 0) { setTimeout(() => { if(this.active && this.gameState === 'PLAYING') this.spawnPlayer(); }, 1500); } 
                        else {
                            this.triggerGameOver();
                        }
                    }
                }
            }
            if (hitSomething) this.bullets.splice(i, 1);
        }

        if (this.enemiesToSpawn <= 0 && this.enemies.length === 0 && this.eagle.isAlive && this.player.isAlive) {
            if (!this.levelComplete) {
                this.levelComplete = true; 
                if (this.bgMusic) { this.bgMusic.pause(); this.bgMusic.currentTime = 0; }
                if(typeof playSnd !== 'undefined') playSnd('win');
                
                setTimeout(() => {
                    if(this.active) {
                        this.currentLevel++;
                        this.loadLevel(); 
                    }
                }, 4000);
            }
        }
    },

        handleMenuClick: function(e) {
        let pos = this.getMousePos(e);
        let x = pos.x;
        let y = pos.y;
        
        if (this.gameState === 'MENU') {
            // Przycisk Start (X: 175-475, Y: 180-230)
            if (x > 175 && x < 475 && y > 180 && y < 230) { 
                this.startFromMenu(); 
            } 
            // Przycisk Ostatnie Wyniki (X: 175-475, Y: 260-310)
            else if (x > 175 && x < 475 && y > 260 && y < 310) { 
                this.gameState = 'SCORES'; 
            }
        } 
        else if (this.gameState === 'SCORES') {
            // Przycisk Wyczyść Wyniki (X: 205-445, Y: 500-560)
            if (x > 205 && x < 445 && y > 500 && y < 560) {
                this.clearScores(); 
            } else {
                this.gameState = 'MENU'; 
            }
        }
    },
    
    triggerGameOver: function() {
        if (this.bgMusic) this.bgMusic.pause();
        if(typeof playSnd !== 'undefined') playSnd('crash');
        this.gameState = 'CRASHED';
        this.saveScore();
        setTimeout(() => {
            if(this.active) {
                this.gameState = 'SCORES'; 
                this.player.lives = 3;
            }
        }, 2500);
    },

    drawPlaying: function() {
        this.ctx.fillStyle = '#000'; this.ctx.fillRect(0,0,650,650);

        this.ctx.font = "50px Arial"; this.ctx.textBaseline = "top";
        for(let r=0; r<13; r++) {
            for(let c=0; c<13; c++) {
                let tx = c * this.tileSize; let ty = r * this.tileSize;
                let tile = this.map[r][c];
                if (tile === 3) {
                    if (typeof drawSprite !== 'undefined' && this.assets.water && this.assets.water.complete && this.assets.water.naturalWidth > 0) {
                        drawSprite(this.ctx, this.assets.water, tx, ty, this.tileSize, this.tileSize, () => this.ctx.fillText('🌊', tx, ty - 6));
                    } else this.ctx.fillText('🌊', tx, ty - 6);
                }
                if (tile === 4) {
                    if (typeof drawSprite !== 'undefined' && this.assets.ice && this.assets.ice.complete && this.assets.ice.naturalWidth > 0) {
                        drawSprite(this.ctx, this.assets.ice, tx, ty, this.tileSize, this.tileSize, () => this.ctx.fillText('❄️', tx, ty - 6));
                    } else this.ctx.fillText('❄️', tx, ty - 6);
                }
            }
        }
        
        const pEmojis = {'tank':'🚜', 'star':'⭐', 'bomb':'💣', 'clock':'⏰', 'shovel':'🛠️', 'helmet':'🪖', 'gun':'🔫'};
        const pImgs = {'tank':'powerup_tank', 'star':'powerup_star', 'bomb':'powerup_bomb', 'clock':'powerup_clock', 'shovel':'powerup_shovel', 'helmet':'powerup_helmet', 'gun':'powerup_gun'};
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            let p = this.powerups[i]; p.timer--;
            if (Math.floor(p.timer/10)%2 === 0) {
                if (typeof drawSprite !== 'undefined' && this.assets[pImgs[p.type]] && this.assets[pImgs[p.type]].complete && this.assets[pImgs[p.type]].naturalWidth > 0) {
                    drawSprite(this.ctx, this.assets[pImgs[p.type]], p.x, p.y, p.w, p.h, () => this.ctx.fillText(pEmojis[p.type], p.x, p.y - 6));
                } else { this.ctx.fillText(pEmojis[p.type], p.x, p.y - 6); }
            }
            if(p.timer <= 0) this.powerups.splice(i, 1);
        }

        if (this.player.isAlive) {
            this.ctx.save();
            this.ctx.translate(this.player.x + this.player.w/2, this.player.y + this.player.h/2);
            if(this.player.dir === 'RIGHT') this.ctx.rotate(90 * Math.PI / 180);
            else if(this.player.dir === 'DOWN') this.ctx.rotate(180 * Math.PI / 180);
            else if(this.player.dir === 'LEFT') this.ctx.rotate(-90 * Math.PI / 180);
            this.ctx.font = "36px Arial"; this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle";
            let pIcon = '🚜'; let pImg = this.assets.player;
            if(this.player.stars === 1) { pIcon = '🚚'; pImg = this.assets.player_1; }
            if(this.player.stars >= 2) { pIcon = '🚈'; pImg = this.assets.player_2; }
            if (typeof drawSprite !== 'undefined' && pImg && pImg.complete && pImg.naturalWidth > 0) {
                drawSprite(this.ctx, pImg, -this.player.w/2, -this.player.h/2, this.player.w, this.player.h, () => this.ctx.fillText(pIcon, 0, 0));
            } else { this.ctx.fillText(pIcon, 0, 0); }
            this.ctx.restore();
            if (this.player.invulnerable > 0 && Math.floor(this.player.invulnerable/5)%2 === 0) {
                this.ctx.strokeStyle = '#38bdf8'; this.ctx.lineWidth = 3; this.ctx.strokeRect(this.player.x - 3, this.player.y - 3, 46, 46);
            }
        }

        this.enemies.forEach(e => {
            this.ctx.save();
            this.ctx.translate(e.x + e.w/2, e.y + e.h/2);
            if(e.dir === 'RIGHT') this.ctx.rotate(90 * Math.PI / 180);
            else if(e.dir === 'DOWN') this.ctx.rotate(180 * Math.PI / 180);
            else if(e.dir === 'LEFT') this.ctx.rotate(-90 * Math.PI / 180);
            this.ctx.font = "36px Arial"; this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle";
            let eIcon = '🛻'; let eImg = this.assets.enemy;
            if (e.eType === 'fast') { eIcon = '🏎️'; eImg = this.assets.enemy_fast || this.assets.enemy; }
            else if (e.eType === 'heavy') { eIcon = '🚜'; eImg = this.assets.enemy_heavy || this.assets.enemy; }
            else if (e.eType === 'armored') { 
                eIcon = '🚍'; 
                if (e.hp === 4) eImg = this.assets.enemy_armored4 || this.assets.enemy;
                else if (e.hp === 3) eImg = this.assets.enemy_armored3 || this.assets.enemy;
                else if (e.hp === 2) eImg = this.assets.enemy_armored2 || this.assets.enemy;
                else eImg = this.assets.enemy_armored1 || this.assets.enemy;
            }
            if (e.isFlashing && Math.floor(Date.now()/150)%2 === 0) { eIcon = '🚚'; eImg = this.assets.enemy_flash; }
            if (typeof drawSprite !== 'undefined' && eImg && eImg.complete && eImg.naturalWidth > 0) {
                drawSprite(this.ctx, eImg, -e.w/2, -e.h/2, e.w, e.h, () => this.ctx.fillText(eIcon, 0, 0));
            } else { this.ctx.fillText(eIcon, 0, 0); }
            this.ctx.restore();
        });

        this.bullets.forEach(b => {
            if (b.owner === 'player' && typeof drawSprite !== 'undefined' && this.assets.bullet_player && this.assets.bullet_player.complete && this.assets.bullet_player.naturalWidth > 0) {
                this.ctx.drawImage(this.assets.bullet_player, b.x, b.y, b.w, b.h);
            } else if (b.owner === 'enemy' && typeof drawSprite !== 'undefined' && this.assets.bullet_enemy && this.assets.bullet_enemy.complete && this.assets.bullet_enemy.naturalWidth > 0) {
                this.ctx.drawImage(this.assets.bullet_enemy, b.x, b.y, b.w, b.h);
            } else {
                this.ctx.fillStyle = b.owner === 'player' ? '#fde047' : '#ef4444';
                this.ctx.beginPath(); this.ctx.arc(b.x + b.w/2, b.y + b.h/2, b.w/2, 0, Math.PI * 2); this.ctx.fill();
            }
        });

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i]; p.timer--;
            if (typeof drawSprite !== 'undefined' && this.assets.explosion && this.assets.explosion.complete && this.assets.explosion.naturalWidth > 0) {
                this.ctx.drawImage(this.assets.explosion, p.x - 5, p.y - 5, this.tileSize, this.tileSize);
            } else {
                this.ctx.font = "50px Arial"; this.ctx.textAlign = "left"; this.ctx.textBaseline = "top"; this.ctx.fillText('💥', p.x - 5, p.y - 5);
            }
            if (p.timer <= 0) this.particles.splice(i, 1);
        }

        this.ctx.font = "50px Arial"; this.ctx.textAlign = "left"; this.ctx.textBaseline = "top";
        for(let r=0; r<13; r++) {
            for(let c=0; c<13; c++) {
                let tx = c * this.tileSize; let ty = r * this.tileSize;
                let tile = this.map[r][c];
                
                if (tile >= 1 && tile < 2) {
                    this.ctx.fillStyle = '#b45309'; 
                    if (typeof drawSprite !== 'undefined' && this.assets.brick && this.assets.brick.complete && this.assets.brick.naturalWidth > 0) {
                        if(tile === 1) this.ctx.drawImage(this.assets.brick, tx, ty, this.tileSize, this.tileSize);
                        else if(tile === 1.1) this.ctx.drawImage(this.assets.brick, 0, 0, this.tileSize, this.tileSize/2, tx, ty, this.tileSize, this.tileSize/2);
                        else if(tile === 1.2) this.ctx.drawImage(this.assets.brick, 0, this.tileSize/2, this.tileSize, this.tileSize/2, tx, ty + this.tileSize/2, this.tileSize, this.tileSize/2);
                        else if(tile === 1.3) this.ctx.drawImage(this.assets.brick, 0, 0, this.tileSize/2, this.tileSize, tx, ty, this.tileSize/2, this.tileSize);
                        else if(tile === 1.4) this.ctx.drawImage(this.assets.brick, this.tileSize/2, 0, this.tileSize/2, this.tileSize, tx + this.tileSize/2, ty, this.tileSize/2, this.tileSize);
                    } else {
                        if(tile === 1) this.ctx.fillText('🧱', tx, ty - 6);
                        else if(tile === 1.1) this.ctx.fillRect(tx, ty, this.tileSize, this.tileSize/2);
                        else if(tile === 1.2) this.ctx.fillRect(tx, ty + this.tileSize/2, this.tileSize, this.tileSize/2);
                        else if(tile === 1.3) this.ctx.fillRect(tx, ty, this.tileSize/2, this.tileSize);
                        else if(tile === 1.4) this.ctx.fillRect(tx + this.tileSize/2, ty, this.tileSize/2, this.tileSize);
                    }
                }
                if (tile === 2) {
                    if (typeof drawSprite !== 'undefined' && this.assets.steel && this.assets.steel.complete && this.assets.steel.naturalWidth > 0) drawSprite(this.ctx, this.assets.steel, tx, ty, this.tileSize, this.tileSize, () => this.ctx.fillText('⬜', tx + 4, ty - 2));
                    else this.ctx.fillText('⬜', tx + 4, ty - 2); 
                }
                if (tile === 5) {
                    if (typeof drawSprite !== 'undefined' && this.assets.eagle && this.assets.eagle.complete && this.assets.eagle.naturalWidth > 0) drawSprite(this.ctx, this.assets.eagle, tx, ty, this.tileSize, this.tileSize, () => this.ctx.fillText('🦅', tx, ty - 6));
                    else this.ctx.fillText('🦅', tx, ty - 6);
                }
                if (tile === 6) {
                    if (typeof drawSprite !== 'undefined' && this.assets.eagle_dead && this.assets.eagle_dead.complete && this.assets.eagle_dead.naturalWidth > 0) drawSprite(this.ctx, this.assets.eagle_dead, tx, ty, this.tileSize, this.tileSize, () => this.ctx.fillText('🏳️', tx, ty - 6));
                    else this.ctx.fillText('🏳️', tx, ty - 6);
                }
                if (tile === 7) {
                    if (typeof drawSprite !== 'undefined' && this.assets.forest && this.assets.forest.complete && this.assets.forest.naturalWidth > 0) drawSprite(this.ctx, this.assets.forest, tx, ty, this.tileSize, this.tileSize, () => this.ctx.fillText('🌲', tx, ty - 6));
                    else this.ctx.fillText('🌲', tx, ty - 6); 
                }
            }
        }
    },

    stop: function() { 
        this.active = false; 
        if (this.bgMusic) { this.bgMusic.pause(); this.bgMusic.currentTime = 0; }
        if(this.loop) { cancelAnimationFrame(this.loop); this.loop = null; }
    }
};