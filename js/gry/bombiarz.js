// ======================================================================
// PLIK: js/gry/bombiarz.js (Klon Bomberman / Dynablaster)
// ======================================================================

games.bombiarz = {
    c: null, ctx: null, loop: null, active: false,
    tileSize: 30,
    gameState: 'MENU', // MENU, PLAYING, TRANSITION
    
    player: { x: 30, y: 30, w: 20, h: 20, speed: 2.0, dir: 'DOWN', isAlive: true, lives: 3, bombsMax: 1, bombsActive: 0, bombRange: 1 },
    map: [], enemies: [], bombs: [], explosions: [], powerups: [],
    door: { r: 0, c: 0, revealed: false },
    
    score: 0, currentLevel: 1, introTimer: 0,
    
    assets: {}, assetsLoaded: false,
    bgMusic: null,

    initAssets: function() {
        if(this.assetsLoaded) return;
        const imgNames = [
            'player', 'enemy', 'wall', 'block', 'bomb', 'explosion', 'door', 
            'pu_bomb', 'pu_fire', 'pu_speed'
        ];
        imgNames.forEach(name => {
            this.assets[name] = new Image();
            this.assets[name].src = `games/img/bombiarz_${name}.png`; 
        });
        
        if (!this.bgMusic) {
            this.bgMusic = new Audio('games/sound/tank_bg.mp3'); // Możesz podmienić na bombiarz_bg.mp3
            this.bgMusic.volume = 0.2; 
            this.bgMusic.loop = true;  
        }
        
        this.assetsLoaded = true;
    },

    init: function() {
        if(typeof stopAllSounds !== 'undefined') stopAllSounds();
        if(this.loop) { cancelAnimationFrame(this.loop); this.loop = null; }
        
        this.c = document.getElementById('canvas-bombiarz');
        this.ctx = this.c.getContext('2d');
        this.c.width = 390;
        this.c.height = 390; 
        
        this.initAssets(); 
        this.ensureMobileControls(); 
        this.c.focus(); 
        
        this.gameState = 'MENU';
        this.active = true;
        
        this.score = 0;
        this.currentLevel = 1;
        this.player.lives = 3;
        
        this.c.onmousedown = (e) => { e.preventDefault(); if (this.gameState === 'MENU') this.startFromMenu(); else this.doAction(); };
        this.c.ontouchstart = (e) => { e.preventDefault(); if (this.gameState === 'MENU') this.startFromMenu(); else this.doAction(); };

        this.update(); 
    },

    ensureMobileControls: function() {
        const parent = this.c.parentElement;
        if (!parent) return; 

        const existingControls = parent.querySelectorAll('.bombiarz-controls-container, .mobile-dpad, .game-fs-btn');
        existingControls.forEach(el => el.remove());

        if(!document.getElementById('bombiarz-styles')) {
            const style = document.createElement('style');
            style.id = 'bombiarz-styles';
            style.innerHTML = `
                .mobile-dpad-bombiarz { display: none !important; }
                @media (max-width: 768px) {
                    .window.active:not(.minimized) .mobile-dpad-bombiarz { 
                        display: flex !important; justify-content: space-between; align-items: flex-end;
                        padding: 10px 20px; width: 100%; margin-top: auto; margin-bottom: 10px; flex-shrink: 0;
                    }
                    .bombiarz-dpad-grid { display: grid; grid-template-columns: repeat(3, 65px); grid-template-rows: repeat(3, 65px); gap: 10px; }
                    .bombiarz-shoot-btn { 
                        width: 80px; height: 80px; border-radius: 50%; margin-bottom: 20px;
                        background: linear-gradient(145deg, #10b981, #059669) !important; 
                        border: 4px solid #065f46 !important; font-size: 32px !important; display: flex; align-items: center; justify-content: center; 
                        box-shadow: 0 8px 15px rgba(0,0,0,0.5), inset 0 -4px 6px rgba(0,0,0,0.3); cursor: pointer; user-select: none; touch-action: manipulation; 
                    }
                    .bombiarz-shoot-btn:active { background: #059669 !important; transform: translateY(4px) scale(0.95); box-shadow: 0 2px 5px rgba(0,0,0,0.5), inset 0 4px 6px rgba(0,0,0,0.4); }
                    .bombiarz-dir-btn { background: linear-gradient(145deg, #4b5563, #374151); color: white; border-radius: 14px; font-size: 26px; display: flex; align-items: center; justify-content: center; user-select: none; touch-action: manipulation; border: 2px solid #1f2937; cursor: pointer; box-shadow: 0 6px 10px rgba(0,0,0,0.4), inset 0 -3px 5px rgba(0,0,0,0.3); }
                    .bombiarz-dir-btn:active { background: #374151; transform: translateY(4px) scale(0.95); box-shadow: 0 2px 4px rgba(0,0,0,0.4), inset 0 3px 5px rgba(0,0,0,0.3); }
                }
            `;
            document.head.appendChild(style);
        }

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'bombiarz-controls-container flex flex-col items-center mt-2 shrink-0 w-full';
        
        const win = this.c.closest('.window');
        const fsBtn = document.createElement('button');
        fsBtn.className = 'game-fs-btn';
        fsBtn.innerHTML = '🔲 Powiększ Okno Gry / Zmniejsz';
        fsBtn.onclick = () => { if(win && typeof winManager !== 'undefined') winManager.maximize(win.id); };
        
        const dpad = document.createElement('div');
        dpad.className = 'mobile-dpad-bombiarz';
        dpad.innerHTML = `
            <div class="bombiarz-dpad-grid">
                <div class="bombiarz-dir-btn" style="grid-column: 2; grid-row: 1;" data-key="ArrowUp">▲</div>
                <div class="bombiarz-dir-btn" style="grid-column: 1; grid-row: 2;" data-key="ArrowLeft">◀</div>
                <div class="bombiarz-dir-btn" style="grid-column: 2; grid-row: 2;" data-key="ArrowDown">▼</div>
                <div class="bombiarz-dir-btn" style="grid-column: 3; grid-row: 2;" data-key="ArrowRight">▶</div>
            </div>
            <div class="bombiarz-shoot-btn d-action-start" data-key="Space">💣</div>
        `;
        
        dpad.querySelectorAll('.bombiarz-dir-btn, .bombiarz-shoot-btn').forEach(btn => {
            const key = btn.getAttribute('data-key');
            const isAction = btn.classList.contains('d-action-start');
            
            const press = (e) => { 
                e.preventDefault(); 
                if (isAction && this.gameState === 'MENU') { this.startFromMenu(); return; }
                if (this.gameState === 'PLAYING' && isAction) { this.doAction(); }
                if (typeof gryKeys !== 'undefined') gryKeys[key] = true; 
            };
            const release = (e) => { e.preventDefault(); if (typeof gryKeys !== 'undefined') gryKeys[key] = false; };
            
            btn.addEventListener('mousedown', press); btn.addEventListener('mouseup', release); btn.addEventListener('mouseleave', release);
            btn.addEventListener('touchstart', press, {passive: false}); btn.addEventListener('touchend', release, {passive: false});
        });
        
        controlsDiv.appendChild(fsBtn);
        controlsDiv.appendChild(dpad);
        
        const startBtn = parent.querySelector('button[onclick^="games."]');
        if(startBtn) {
            startBtn.classList.add('pc-start-btn', 'shrink-0');
            startBtn.innerHTML = "Wróć do Menu Głównego";
            startBtn.onclick = () => { this.init(); };
            parent.insertBefore(controlsDiv, startBtn.nextSibling);
        } else {
            parent.appendChild(controlsDiv);
        }
    },

    drawBorder: function() {
        this.ctx.strokeStyle = '#4b5563'; 
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(0.5, 0.5, this.c.width - 1, this.c.height - 1);
    },

    startFromMenu: function() {
        this.player.lives = 3;
        this.player.bombsMax = 1;
        this.player.bombRange = 1;
        this.player.speed = 2.0;
        this.score = 0;
        this.currentLevel = 1;
        this.loadLevel();
        if(typeof gryKeys !== 'undefined') gryKeys['Space'] = false; 
    },

    // -------------------------------------------------------------
    // GENEROWANIE POZIOMU BOMBERMANA
    // -------------------------------------------------------------
    loadLevel: function() {
        this.gameState = 'TRANSITION';
        this.introTimer = 120; 
        if (this.bgMusic) { this.bgMusic.pause(); this.bgMusic.currentTime = 0; }
        
        this.map = Array(13).fill().map(()=>Array(13).fill(0));
        this.bombs = []; this.explosions = []; this.powerups = []; this.enemies = [];
        this.player.bombsActive = 0;
        
        this.spawnPlayer();

        let availableBlocks = [];

        // Generowanie stałych ścian i losowych skrzynek (bloków)
        for(let r=0; r<13; r++) {
            for(let c=0; c<13; c++) {
                if (r % 2 !== 0 && c % 2 !== 0) {
                    this.map[r][c] = 1; // Niezniszczalny mur (1)
                } else {
                    // Strefa ochronna gracza w rogu, by nie został uwięziony na start
                    if (r + c > 1 && Math.random() < 0.65) {
                        this.map[r][c] = 2; // Zniszczalna skrzynia (2)
                        availableBlocks.push({r, c});
                    }
                }
            }
        }

        // Ukrywanie drzwi do następnego poziomu
        if (availableBlocks.length > 0) {
            let dIdx = Math.floor(Math.random() * availableBlocks.length);
            this.door = { r: availableBlocks[dIdx].r, c: availableBlocks[dIdx].c, revealed: false };
            availableBlocks.splice(dIdx, 1);
        }

        // Ukrywanie ulepszeń (1 z każdego rodzaju)
        const powerupTypes = ['bomb', 'fire', 'speed'];
        powerupTypes.forEach(pt => {
            if (availableBlocks.length > 0) {
                let pIdx = Math.floor(Math.random() * availableBlocks.length);
                this.powerups.push({ r: availableBlocks[pIdx].r, c: availableBlocks[pIdx].c, type: pt, hidden: true });
                availableBlocks.splice(pIdx, 1);
            }
        });

        // Tworzenie Wrogów z dala od gracza
        let numEnemies = Math.min(3 + this.currentLevel, 10);
        let emptySpots = [];
        for(let r=0; r<13; r++) {
            for(let c=0; c<13; c++) {
                if (this.map[r][c] === 0 && (r+c > 5)) {
                    emptySpots.push({r, c});
                }
            }
        }
        
        for(let i=0; i<numEnemies; i++) {
            if (emptySpots.length > 0) {
                let sIdx = Math.floor(Math.random() * emptySpots.length);
                let spot = emptySpots[sIdx];
                this.enemies.push({
                    x: spot.c * this.tileSize + 5, y: spot.r * this.tileSize + 5,
                    w: 20, h: 20, speed: 1.0 + (this.currentLevel * 0.1), dir: 'RIGHT', isAlive: true
                });
            }
        }

        this.updateScoreUI();
    },

    spawnPlayer: function() {
        this.player.x = 5;
        this.player.y = 5;
        this.player.dir = 'DOWN';
        this.player.isAlive = true;
        this.player.invulnerable = 180; 
    },

    // -------------------------------------------------------------
    // LOGIKA BOMB I WYBUCHÓW
    // -------------------------------------------------------------
    doAction: function() {
        if(this.gameState !== 'PLAYING' || !this.player.isAlive) return;
        
        // Obliczanie kafelka na którym stoi gracz
        let centerC = Math.floor((this.player.x + this.player.w/2) / this.tileSize);
        let centerR = Math.floor((this.player.y + this.player.h/2) / this.tileSize);
        
        // Nie można położyć bomby, jeśli już jakaś tu leży
        if (!this.bombs.some(b => b.r === centerR && b.c === centerC)) {
            if (this.player.bombsActive < this.player.bombsMax) {
                this.bombs.push({ 
                    r: centerR, c: centerC, 
                    x: centerC * this.tileSize, y: centerR * this.tileSize, 
                    time: 150, range: this.player.bombRange, walkable: true 
                });
                this.player.bombsActive++;
                if(typeof playSnd !== 'undefined') playSnd('drop');
            }
        }
        if(typeof gryKeys !== 'undefined') gryKeys['Space'] = false; 
    },

    triggerBomb: function(bomb) {
        if (bomb.exploded) return;
        bomb.exploded = true; // Zabezpieczenie przed pętlą
        this.player.bombsActive--;
        if(typeof playSnd !== 'undefined') playSnd('explosion');

        let r = bomb.r; let c = bomb.c;
        this.explosions.push({ r: r, c: c, timer: 20 });
        
        // Rozchodzenie się wybuchu: Góra, Dół, Lewo, Prawo
        const dirs = [{dr: -1, dc: 0}, {dr: 1, dc: 0}, {dr: 0, dc: -1}, {dr: 0, dc: 1}];
        
        dirs.forEach(d => {
            for(let i=1; i<=bomb.range; i++) {
                let nr = r + d.dr * i;
                let nc = c + d.dc * i;
                
                if (nr < 0 || nr >= 13 || nc < 0 || nc >= 13) break;
                if (this.map[nr][nc] === 1) break; // Zatrzymaj na murze niezniszczalnym
                
                if (this.map[nr][nc] === 2) {
                    // Zniszczenie drewnianej skrzyni i zatrzymanie płomienia w tym kierunku
                    this.map[nr][nc] = 0;
                    this.score += 10;
                    if (this.door.r === nr && this.door.c === nc) this.door.revealed = true;
                    this.powerups.forEach(p => { if (p.r === nr && p.c === nc) p.hidden = false; });
                    this.explosions.push({ r: nr, c: nc, timer: 20 });
                    if(typeof playSnd !== 'undefined') playSnd('break');
                    break; 
                }

                // Zniszczenie ujawnionych wcześniej Powerupów w płomieniach
                this.powerups = this.powerups.filter(p => {
                    if (!p.hidden && p.r === nr && p.c === nc) return false;
                    return true;
                });

                // Reakcja Łańcuchowa (Zdetonuj inną bombę, którą dotknął ogień!)
                let otherBomb = this.bombs.find(b => b.r === nr && b.c === nc && !b.exploded);
                if (otherBomb) {
                    this.triggerBomb(otherBomb);
                }

                this.explosions.push({ r: nr, c: nc, timer: 20 });
            }
        });
        
        // Usunięcie po skończonej logice
        this.bombs = this.bombs.filter(b => b !== bomb);
    },

    checkCollision: function(rect1, rect2) {
        return (rect1.x < rect2.x + rect2.w && rect1.x + rect1.w > rect2.x &&
                rect1.y < rect2.y + rect2.h && rect1.y + rect1.h > rect2.y);
    },

    checkMapCollision: function(rect) {
        if (rect.x < 0 || rect.x + rect.w > this.c.width || rect.y < 0 || rect.y + rect.h > this.c.height) return true;

        for(let r=0; r<13; r++) {
            for(let c=0; c<13; c++) {
                if (this.map[r][c] === 1 || this.map[r][c] === 2) { 
                    let tr = { x: c * this.tileSize, y: r * this.tileSize, w: this.tileSize, h: this.tileSize };
                    if(this.checkCollision(rect, tr)) return true;
                }
            }
        }
        
        // Kolizja z bombami (które stały się solidne po zejściu z nich)
        for(let i=0; i<this.bombs.length; i++) {
            let b = this.bombs[i];
            if (!b.walkable) {
                let tr = { x: b.x, y: b.y, w: this.tileSize, h: this.tileSize };
                if (this.checkCollision(rect, tr)) return true;
            }
        }
        
        return false;
    },

    applyPowerup: function(p) {
        if(typeof playSnd !== 'undefined') playSnd('eat');
        if (p.type === 'bomb') this.player.bombsMax++;
        else if (p.type === 'fire') this.player.bombRange++;
        else if (p.type === 'speed') this.player.speed += 0.5;
        this.score += 50;
        this.updateScoreUI();
    },

    updateScoreUI: function() {
        const el = document.getElementById('bombiarz-score');
        if(el) el.innerText = `Lvl: ${this.currentLevel} | Pkt: ${this.score} | Życia: ${this.player.lives}`;
    },

    // ======================================================================
    // PĘTLA GRY
    // ======================================================================
    update: function() {
        if(!this.active) return;
        
        if (this.gameState === 'MENU') {
            this.drawMenu();
        } else if (this.gameState === 'TRANSITION') {
            if (this.introTimer > 0) this.introTimer--;
            else {
                this.gameState = 'PLAYING';
                if (this.bgMusic) { this.bgMusic.currentTime = 0; this.bgMusic.play().catch(e=>{}); }
            }
            this.drawTransition();
        } else if (this.gameState === 'PLAYING') {
            this.updatePlaying();
            this.drawPlaying();
        }
        
        if(this.active) this.loop = requestAnimationFrame(() => this.update());
    },

    drawMenu: function() {
        if (typeof gryKeys !== 'undefined' && (gryKeys['Space'] || gryKeys['Enter'])) this.startFromMenu();
        
        this.ctx.fillStyle = '#0f172a'; this.ctx.fillRect(0,0,this.c.width,this.c.height);
        this.ctx.fillStyle = '#10b981';
        this.ctx.font = "bold 50px Arial"; this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle";
        this.ctx.fillText("BOMBERMAN", this.c.width/2, 100);
        this.ctx.font = "20px Arial"; this.ctx.fillStyle = '#fff';
        this.ctx.fillText("Klasyczna Rozgrywka Arcade", this.c.width/2, 160);
        
        if (Math.floor(Date.now() / 600) % 2 === 0) {
            this.ctx.fillStyle = "#aaa";
            this.ctx.font = "16px Arial";
            this.ctx.fillText("Naciśnij SPACJĘ aby rozpocząć", this.c.width/2, 260);
        }
        this.drawBorder();
    },

    drawTransition: function() {
        this.ctx.fillStyle = '#000'; this.ctx.fillRect(0,0,this.c.width,this.c.height);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = "bold 30px Arial"; this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle";
        this.ctx.fillText(`POZIOM ${this.currentLevel}`, this.c.width/2, this.c.height/2);
        this.drawBorder();
    },

    updatePlaying: function() {
        if(this.player.invulnerable > 0) this.player.invulnerable--;

        // ==================== RUCH GRACZA ====================
        if (this.player.isAlive && typeof gryKeys !== 'undefined') {
            let nextX = this.player.x; let nextY = this.player.y;
            let alignTolerance = 12; // Ułatwienie przesuwania się wzdłuż rogów
            
            let kLeft = gryKeys['ArrowLeft'] || gryKeys['KeyA'];
            let kRight = gryKeys['ArrowRight'] || gryKeys['KeyD'];
            let kUp = gryKeys['ArrowUp'] || gryKeys['KeyW'];
            let kDown = gryKeys['ArrowDown'] || gryKeys['KeyS'];
            
            if(kLeft) { nextX -= this.player.speed; this.player.dir = 'LEFT'; let tY = Math.round((this.player.y-5)/30)*30+5; if(Math.abs(this.player.y-tY)<alignTolerance) nextY=tY; }
            else if(kRight) { nextX += this.player.speed; this.player.dir = 'RIGHT'; let tY = Math.round((this.player.y-5)/30)*30+5; if(Math.abs(this.player.y-tY)<alignTolerance) nextY=tY; }
            else if(kUp) { nextY -= this.player.speed; this.player.dir = 'UP'; let tX = Math.round((this.player.x-5)/30)*30+5; if(Math.abs(this.player.x-tX)<alignTolerance) nextX=tX; }
            else if(kDown) { nextY += this.player.speed; this.player.dir = 'DOWN'; let tX = Math.round((this.player.x-5)/30)*30+5; if(Math.abs(this.player.x-tX)<alignTolerance) nextX=tX; }
            
            if(gryKeys['Space']) this.doAction();

            let tRect = { x: nextX, y: nextY, w: this.player.w, h: this.player.h };
            if (!this.checkMapCollision(tRect)) {
                this.player.x = nextX; this.player.y = nextY;
            }

            // Aktualizacja solidności bomb (Gracz musi z niej całkowicie zejść, by stała się murem)
            this.bombs.forEach(b => {
                if (b.walkable) {
                    let bRect = { x: b.x, y: b.y, w: this.tileSize, h: this.tileSize };
                    if (!this.checkCollision(this.player, bRect)) {
                        b.walkable = false;
                    }
                }
            });

            // Zbieranie Powerupów
            for(let i = this.powerups.length - 1; i >= 0; i--) {
                let p = this.powerups[i];
                if (!p.hidden) {
                    let pRect = { x: p.c * this.tileSize, y: p.r * this.tileSize, w: this.tileSize, h: this.tileSize };
                    if (this.checkCollision(this.player, pRect)) {
                        this.applyPowerup(p);
                        this.powerups.splice(i, 1);
                    }
                }
            }
        }

        // ==================== ZEGAR BOMB ====================
        for(let i = this.bombs.length - 1; i >= 0; i--) {
            let b = this.bombs[i];
            b.time--;
            if(b.time <= 0 && !b.exploded) {
                this.triggerBomb(b);
            }
        }

        // ==================== ZEGAR WYBUCHÓW I OBRAŻENIA ====================
        let playerGrid = { r: Math.floor((this.player.y + this.player.h/2)/30), c: Math.floor((this.player.x + this.player.w/2)/30) };
        
        for(let i = this.explosions.length - 1; i >= 0; i--) {
            let ex = this.explosions[i];
            ex.timer--;
            
            // Kolizja eksplozji z graczem
            if (this.player.isAlive && this.player.invulnerable <= 0) {
                if (playerGrid.r === ex.r && playerGrid.c === ex.c) {
                    this.player.isAlive = false;
                    this.player.lives--;
                    if(typeof playSnd !== 'undefined') playSnd('die');
                    this.updateScoreUI();
                }
            }
            
            // Kolizja eksplozji z wrogami
            this.enemies.forEach(e => {
                if(e.isAlive) {
                    let eGrid = { r: Math.floor((e.y + e.h/2)/30), c: Math.floor((e.x + e.w/2)/30) };
                    if (eGrid.r === ex.r && eGrid.c === ex.c) {
                        e.isAlive = false;
                        this.score += 100;
                        this.updateScoreUI();
                    }
                }
            });
            
            if (ex.timer <= 0) this.explosions.splice(i, 1);
        }

        // ==================== AI WROGÓW ====================
        this.enemies.forEach(e => {
            if(!e.isAlive) return;
            let nextX = e.x; let nextY = e.y;
            if (e.dir === 'UP') nextY -= e.speed; else if (e.dir === 'DOWN') nextY += e.speed;
            else if (e.dir === 'LEFT') nextX -= e.speed; else if (e.dir === 'RIGHT') nextX += e.speed;

            let tRect = { x: nextX, y: nextY, w: e.w, h: e.h };
            if (this.checkMapCollision(tRect)) {
                let dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
                e.dir = dirs[Math.floor(Math.random() * 4)];
                e.x = Math.round((e.x - 5)/30)*30 + 5;
                e.y = Math.round((e.y - 5)/30)*30 + 5;
            } else {
                e.x = nextX; e.y = nextY;
            }

            // Kolizja Wroga z Graczem
            if (this.player.isAlive && this.player.invulnerable <= 0) {
                if (this.checkCollision(tRect, this.player)) {
                    this.player.isAlive = false;
                    this.player.lives--;
                    if(typeof playSnd !== 'undefined') playSnd('die');
                    this.updateScoreUI();
                }
            }
        });
        
        // Czyszczenie zabitych wrogów
        this.enemies = this.enemies.filter(e => e.isAlive);

        // ==================== LOGIKA ŚMIERCI I WYGRANEJ ====================
        if (!this.player.isAlive) {
            if (this.player.lives > 0) {
                setTimeout(() => { if(this.active) this.spawnPlayer(); }, 1500);
                this.player.isAlive = true; // Zabezpieczenie przed wielokrotnym włączaniem timera
            } else {
                this.active = false;
                if (this.bgMusic) this.bgMusic.pause();
                if(typeof apps !== 'undefined') apps.showToast('Game Over', 'Brak żyć!', 'error');
                setTimeout(() => { this.gameState = 'MENU'; this.active = true; }, 3000);
            }
        } else if (this.enemies.length === 0 && this.door.revealed) {
            let pRect = { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h };
            let dRect = { x: this.door.c * this.tileSize, y: this.door.r * this.tileSize, w: this.tileSize, h: this.tileSize };
            // Gracz wchodzi do otwartych drzwi
            if (this.checkCollision(pRect, dRect)) {
                this.currentLevel++;
                if(typeof playSnd !== 'undefined') playSnd('win');
                this.loadLevel(); 
            }
        }
    },

    drawPlaying: function() {
        this.ctx.fillStyle = '#10b981'; // Trawnik na tło
        this.ctx.fillRect(0,0,this.c.width,this.c.height);

        this.ctx.font = "30px Arial"; this.ctx.textAlign = "left"; this.ctx.textBaseline = "top";
        
        // Drzwi wyjściowe (rysowane na dnie)
        if (this.door.revealed) {
            let dx = this.door.c * this.tileSize; let dy = this.door.r * this.tileSize;
            if (typeof drawSprite !== 'undefined' && this.assets.door?.complete && this.assets.door.naturalWidth > 0) {
                drawSprite(this.ctx, this.assets.door, dx, dy, this.tileSize, this.tileSize, () => this.ctx.fillText('🚪', dx, dy - 4));
            } else this.ctx.fillText('🚪', dx, dy - 4);
        }

        // PowerUpy
        const puEmoji = { 'bomb':'💣', 'fire':'🔥', 'speed':'👟' };
        const puAsset = { 'bomb':'pu_bomb', 'fire':'pu_fire', 'speed':'pu_speed' };
        this.powerups.forEach(p => {
            if (!p.hidden) {
                let px = p.c * this.tileSize; let py = p.r * this.tileSize;
                if (typeof drawSprite !== 'undefined' && this.assets[puAsset[p.type]]?.complete && this.assets[puAsset[p.type]].naturalWidth > 0) {
                    drawSprite(this.ctx, this.assets[puAsset[p.type]], px, py, this.tileSize, this.tileSize, () => this.ctx.fillText(puEmoji[p.type], px, py - 4));
                } else this.ctx.fillText(puEmoji[p.type], px, py - 4);
            }
        });

        // Bloki i Ściany
        for(let r=0; r<13; r++) {
            for(let c=0; c<13; c++) {
                let tx = c * this.tileSize; let ty = r * this.tileSize;
                let tile = this.map[r][c];
                
                if (tile === 1) { // Niezniszczalny Mur
                    if (typeof drawSprite !== 'undefined' && this.assets.wall?.complete && this.assets.wall.naturalWidth > 0) {
                        drawSprite(this.ctx, this.assets.wall, tx, ty, this.tileSize, this.tileSize, () => this.ctx.fillText('🧱', tx, ty - 4));
                    } else this.ctx.fillText('🧱', tx, ty - 4);
                } else if (tile === 2) { // Skrzynia Drewniana
                    if (typeof drawSprite !== 'undefined' && this.assets.block?.complete && this.assets.block.naturalWidth > 0) {
                        drawSprite(this.ctx, this.assets.block, tx, ty, this.tileSize, this.tileSize, () => this.ctx.fillText('📦', tx, ty - 4));
                    } else this.ctx.fillText('📦', tx, ty - 4);
                }
            }
        }
        
        // Bomby
        this.bombs.forEach(b => {
            if (typeof drawSprite !== 'undefined' && this.assets.bomb?.complete && this.assets.bomb.naturalWidth > 0) {
                // Pulsowanie bomby (efekt pęcznienia)
                let s = Math.floor(b.time/15)%2 === 0 ? 0 : -2;
                drawSprite(this.ctx, this.assets.bomb, b.x + s/2, b.y + s/2, this.tileSize - s, this.tileSize - s, () => this.ctx.fillText('💣', b.x, b.y - 4));
            } else {
                if(Math.floor(b.time/10)%2 === 0) this.ctx.fillText('💣', b.x, b.y - 4); else this.ctx.fillText('🧨', b.x, b.y - 4);
            }
        });
        
        // Eksplozje (Ogień)
        this.explosions.forEach(ex => {
            let px = ex.c * this.tileSize; let py = ex.r * this.tileSize;
            if (typeof drawSprite !== 'undefined' && this.assets.explosion?.complete && this.assets.explosion.naturalWidth > 0) {
                drawSprite(this.ctx, this.assets.explosion, px, py, this.tileSize, this.tileSize, () => this.ctx.fillText('💥', px, py - 4));
            } else this.ctx.fillText('💥', px, py - 4);
        });

        // Gracz
        if (this.player.isAlive) {
            if (this.player.invulnerable <= 0 || Math.floor(Date.now()/150)%2 !== 0) {
                if (typeof drawSprite !== 'undefined' && this.assets.player?.complete && this.assets.player.naturalWidth > 0) {
                    drawSprite(this.ctx, this.assets.player, this.player.x, this.player.y, this.player.w, this.player.h, () => {
                        this.ctx.font = "24px Arial"; this.ctx.fillText('🤠', this.player.x - 2, this.player.y - 4);
                    });
                } else {
                    this.ctx.font = "24px Arial"; this.ctx.fillText('🤠', this.player.x - 2, this.player.y - 4);
                }
            }
        }

        // Wrogowie
        this.enemies.forEach(e => {
            if (typeof drawSprite !== 'undefined' && this.assets.enemy?.complete && this.assets.enemy.naturalWidth > 0) {
                drawSprite(this.ctx, this.assets.enemy, e.x, e.y, e.w, e.h, () => {
                    this.ctx.font = "24px Arial"; this.ctx.fillText('👾', e.x - 2, e.y - 4);
                });
            } else {
                this.ctx.font = "24px Arial"; this.ctx.fillText('👾', e.x - 2, e.y - 4);
            }
        });
        
        this.drawBorder();
    },

    stop: function() { 
        this.active = false; 
        if (this.bgMusic) { this.bgMusic.pause(); this.bgMusic.currentTime = 0; }
        if(this.loop) { cancelAnimationFrame(this.loop); this.loop = null; }
    }
};