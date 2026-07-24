// ======================================================================
// PLIK: js/gry/ufoludki.js (Wysoka Rozdzielczość + Motywy + Menu)
// ======================================================================

games.ufoludki = {
    c: null, ctx: null, loop: null, active: false, 
    ship: {}, bullets: [], aliens: [], score: 0, lastShot: 0,
    
    theme: {},
    gameState: 'MENU', // Dostępne stany: MENU, PLAYING, SCORES
    lastScores: [],
    assets: {}, assetsLoaded: false,

    initAssets: function() {
        if(this.assetsLoaded) return;
        this.assets.ship = new Image();
        this.assets.ship.src = 'games/img/ship.webp';
        this.assets.alien = new Image();
        this.assets.alien.src = 'games/img/alien.webp';
        this.assets.bullet = new Image();
        this.assets.bullet.src = 'games/img/bullet.webp';
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

    ensureMobileControls: function() {
        const parent = this.c.parentElement;
        if (!parent) return; 

        // Czyszczenie uniwersalnych kontrolek ładowanych z opóźnieniem przez gry.js
        let clearAttempts = 0;
        const clearJunk = setInterval(() => {
            const junk = parent.querySelectorAll('.mobile-dpad, .mobile-dpad-pong, .game-fs-btn:not(.ufoludki-fs), .pc-start-btn:not(.ufoludki-start)');
            junk.forEach(j => j.remove());
            clearAttempts++;
            if (clearAttempts > 10) clearInterval(clearJunk);
        }, 300);

        const existingControls = parent.querySelectorAll('.ufoludki-controls-container, .mobile-dpad-ufoludki');
        existingControls.forEach(el => el.remove());

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'ufoludki-controls-container flex flex-col items-center mt-2 shrink-0 w-full z-10 relative';
        
        const win = this.c.closest('.window');
        const fsBtn = document.createElement('button');
        
        // Zastosowanie systemowych kolorów bezpośrednio pod zmienne CSS z theme.js (bez ikony)
        fsBtn.className = 'ufoludki-fs hidden md:block w-full max-w-[320px] self-center my-2 px-4 py-2 rounded-lg font-bold shadow-md transition hover:scale-105 text-[13px]';
        fsBtn.style.backgroundColor = 'var(--primary)';
        fsBtn.style.color = '#000';
        fsBtn.style.border = '2px solid var(--border)';
        fsBtn.innerHTML = 'Powiększ Okno Gry / Zmniejsz';
        fsBtn.onclick = () => { if(win && typeof winManager !== 'undefined') winManager.maximize(win.id); };
        
        if(!document.getElementById('ufoludki-styles')) {
            const style = document.createElement('style');
            style.id = 'ufoludki-styles';
            style.innerHTML = `
                .mobile-dpad-ufoludki { display: none !important; }
                @media (max-width: 768px) {
                    .ufoludki-fs { display: none !important; }
                    
                    .window.active:not(.minimized) .mobile-dpad-ufoludki { 
                        display: flex !important; flex-direction: column; gap: 12px; 
                        padding: 10px 20px; width: 100%; max-width: 450px; margin: auto auto 10px auto; flex-shrink: 0;
                    }
                    .ufoludki-dpad-row { display: flex; justify-content: space-between; gap: 10px; width: 100%; }
                    .ufoludki-dir-btn { 
                        flex: 1; height: 75px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; 
                        background: var(--panel); color: var(--text); border: 2px solid var(--border); box-shadow: 0 6px 10px rgba(0,0,0,0.4); 
                        user-select: none; touch-action: manipulation; cursor: pointer; transition: transform 0.1s;
                    }
                    .ufoludki-dir-btn .icon { font-size: 28px; line-height: 1; margin-bottom: 2px; }
                    .ufoludki-dir-btn span.lbl { font-size: 11px; font-weight: bold; color: var(--text-muted); }
                    .ufoludki-dir-btn:active { transform: translateY(4px) scale(0.95); box-shadow: 0 2px 4px rgba(0,0,0,0.4); }
                    
                    .ufoludki-menu-btn {
                        width: 100%; height: 60px; border-radius: 14px; display: flex; align-items: center; justify-content: center; gap: 10px;
                        background: var(--panel); color: var(--text); border: 2px solid var(--border); box-shadow: 0 6px 10px rgba(0,0,0,0.4);
                        user-select: none; touch-action: manipulation; cursor: pointer; transition: transform 0.1s;
                    }
                    .ufoludki-menu-btn:active { transform: translateY(4px) scale(0.98); box-shadow: 0 2px 4px rgba(0,0,0,0.4); }
                    .ufoludki-menu-btn .icon { font-size: 24px; }
                    .ufoludki-menu-btn .lbl { font-size: 14px; font-weight: bold; color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; }
                }
            `;
            document.head.appendChild(style);
        }

        const dpad = document.createElement('div');
        dpad.className = 'mobile-dpad-ufoludki';
        dpad.innerHTML = `
            <div class="ufoludki-dpad-row">
                <div class="ufoludki-dir-btn" data-key="ArrowLeft"><div class="icon">⬅️</div><span class="lbl">LEWO</span></div>
                <div class="ufoludki-dir-btn" data-key="Space" style="background: var(--primary); color: #000; border-color: var(--primary);"><div class="icon">🚀</div><span class="lbl" style="color: #000; font-weight: bold;">STRZAŁ</span></div>
                <div class="ufoludki-dir-btn" data-key="ArrowRight"><div class="icon">➡️</div><span class="lbl">PRAWO</span></div>
            </div>
            <div class="ufoludki-menu-btn" data-menu="true">
                <div class="icon">🏠</div><span class="lbl">MENU GRY</span>
            </div>
        `;
        
        dpad.querySelectorAll('.ufoludki-dir-btn, .ufoludki-menu-btn').forEach(btn => {
            const key = btn.getAttribute('data-key');
            const isMenu = btn.getAttribute('data-menu');
            
            const press = (e) => { 
                e.preventDefault(); 
                if (isMenu) { this.init(); return; }
                if (this.gameState === 'MENU') { this.startFromMenu(); return; }
                if (this.gameState === 'PLAYING' && key === 'Space') { this.doAction(); }
                if (typeof gryKeys !== 'undefined' && key) gryKeys[key] = true; 
            };
            const release = (e) => { 
                e.preventDefault(); 
                if (typeof gryKeys !== 'undefined' && key) gryKeys[key] = false; 
            };
            btn.addEventListener('mousedown', press); btn.addEventListener('mouseup', release); btn.addEventListener('mouseleave', release);
            btn.addEventListener('touchstart', press, {passive: false}); btn.addEventListener('touchend', release, {passive: false});
        });
        
        controlsDiv.appendChild(fsBtn);
        controlsDiv.appendChild(dpad);
        
        const startBtn = parent.querySelector('button[onclick^="games."]');
        if(startBtn) {
            startBtn.classList.add('ufoludki-start', 'shrink-0', 'hidden', 'sm:block'); 
            startBtn.innerHTML = "🏠 Menu Gry";
            startBtn.onclick = () => { this.init(); };
            parent.insertBefore(controlsDiv, startBtn.nextSibling);
        } else {
            parent.appendChild(controlsDiv);
        }
    },

    drawBorder: function() {
        this.ctx.strokeStyle = this.theme.border; 
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(2, 2, this.c.width - 4, this.c.height - 4);
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
        if(this.loop) cancelAnimationFrame(this.loop); 
        
        this.c = document.getElementById('canvas-ufoludki'); 
        this.ctx = this.c.getContext('2d'); 
        
        // Zwiększamy rozdzielczość płótna do 650x650
        this.c.width = 650; 
        this.c.height = 650;

        this.initAssets();

        // Wczytanie historii wyników
        try {
            const saved = localStorage.getItem('bigos_ufoludki_scores');
            if (saved) this.lastScores = JSON.parse(saved);
        } catch(e) {}

        // Powiększenie okna gry
        const win = document.getElementById('app-ufoludki');
        if (win && !win.dataset.resized) {
            win.style.width = '700px'; 
            win.classList.remove('w-[440px]');
            
            const titleBar = win.querySelector('.title-bar');
            if (titleBar) titleBar.classList.remove('bg-black/30');
            
            const contentArea = win.querySelector('.bg-black\\/10');
            if (contentArea) contentArea.classList.remove('bg-black/10');
            
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
        
        this.ensureMobileControls();

        // Obsługa kliknięć / dotyku dla Menu i Wyników
        this.c.onmousedown = (e) => { 
            if (this.gameState !== 'PLAYING') { e.preventDefault(); this.handleMenuClick(e); }
        };
        this.c.addEventListener('touchstart', (e) => {
            if (this.gameState !== 'PLAYING') { e.preventDefault(); this.handleMenuClick(e); }
        }, {passive: false});
        
        this.gameState = 'MENU';
        this.active = true; 
        
        this.updateScoreUI(); 
        this.update(); 
    },

    handleMenuClick: function(e) {
        if (this.gameState === 'MENU') {
            let y = e ? this.getMousePos(e).y : 300; 
            if (y > 200 && y < 350) this.startFromMenu(); // Start gry
            else if (y > 350 && y < 500) this.gameState = 'SCORES'; // Wyniki
        } 
        else if (this.gameState === 'SCORES') {
            let y = e ? this.getMousePos(e).y : 0; 
            if (y > 500 && y < 580) {
                this.clearScores(); // Kliknięto "Wyczyść Wyniki"
            } else {
                this.gameState = 'MENU'; // Powrót z wyników
            }
        }
    },

    startFromMenu: function() {
        this.ship = { x: 295, y: 550, w: 60, h: 60 }; 
        this.bullets = []; 
        this.aliens = []; 
        this.score = 0; 
        this.lastShot = 0;

        // Generowanie 4 wierszy x 8 kolumn kosmitów na planszy 650x650
        for(let r=0; r<4; r++) {
            for(let c=0; c<8; c++) {
                this.aliens.push({
                    x: c * 68 + 40,
                    y: r * 48 + 60,
                    w: 48,
                    h: 40,
                    alive: true
                });
            }
        }
        
        this.updateScoreUI(); 
        
        if (typeof gryKeys !== 'undefined') {
            gryKeys['ArrowLeft'] = false; gryKeys['ArrowRight'] = false; gryKeys['Space'] = false;
        }
        
        this.gameState = 'PLAYING';
    },

    doAction: function() {
        if (this.gameState !== 'PLAYING' || !this.active) return;
        if (Date.now() - this.lastShot > 250) { 
            this.bullets.push({ x: this.ship.x + this.ship.w/2 - 5, y: this.ship.y, w: 10, h: 22 }); 
            this.lastShot = Date.now(); 
            if(typeof playSnd !== 'undefined') playSnd('shoot');
        }
    },

    saveScore: function() {
        if (this.score === 0) return;
        this.lastScores.unshift({ date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(), score: this.score });
        if (this.lastScores.length > 8) this.lastScores.pop();
        localStorage.setItem('bigos_ufoludki_scores', JSON.stringify(this.lastScores));
    },

    clearScores: function() {
        this.lastScores = [];
        localStorage.removeItem('bigos_ufoludki_scores');
        if (typeof apps !== 'undefined') apps.showToast('Historia', 'Wyzerowano tablicę wyników.', 'info');
    },

    updateScoreUI: function() {
        const el = document.getElementById('ufoludki-score');
        if (el) {
            el.innerText = `Punkty: ${this.score}`;
            el.className = 'font-bold mb-4 g-accent text-xl sm:text-3xl drop-shadow-md tracking-wider text-center';
        }
    },

    update: function() {
        if(!this.active) return;
        
        this.updateColors();
        
        if (this.gameState === 'MENU') {
            if (typeof gryKeys !== 'undefined' && (gryKeys['Space'] || gryKeys['Enter'])) {
                this.startFromMenu();
            }
            this.drawMenu();
        } else if (this.gameState === 'SCORES') {
            this.drawScores();
        } else if (this.gameState === 'PLAYING') {
            this.updatePlaying();
            this.drawPlaying();
        }
        
        this.loop = requestAnimationFrame(() => this.update());
    },

    drawMenu: function() {
        this.ctx.fillStyle = this.theme.bg; 
        this.ctx.fillRect(0, 0, this.c.width, this.c.height); 

        this.ctx.fillStyle = this.theme.primary;
        this.ctx.font = "bold 80px Arial"; this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle";
        this.ctx.fillText("UFOLUDKI", this.c.width/2, 120);
        
        this.ctx.font = "30px Arial"; 
        this.ctx.fillStyle = this.theme.text;
        this.ctx.fillText("Ocal Ziemię przed inwazją z kosmosu!", this.c.width/2, 190);
        
        // Przycisk Start
        this.ctx.fillStyle = this.theme.primary;
        this.ctx.fillRect(this.c.width/2 - 150, 270, 300, 70);
        this.ctx.fillStyle = '#000';
        this.ctx.font = "bold 36px Arial";
        this.ctx.fillText("▶ START GRY", this.c.width/2, 305);

        // Przycisk Wyniki
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(this.c.width/2 - 150, 370, 300, 60);
        this.ctx.strokeStyle = this.theme.border;
        this.ctx.strokeRect(this.c.width/2 - 150, 370, 300, 60);
        this.ctx.fillStyle = this.theme.text;
        this.ctx.font = "bold 26px Arial";
        this.ctx.fillText("🏆 Ostatnie Wyniki", this.c.width/2, 400);

        if (Math.floor(Date.now() / 600) % 2 === 0) {
            this.ctx.fillStyle = this.theme.muted;
            this.ctx.font = "20px Arial";
            this.ctx.fillText("Naciśnij spację lub kliknij ekran, by wystrzelić", this.c.width/2, 550);
        }

        this.drawBorder();
    },

    drawScores: function() {
        this.ctx.fillStyle = this.theme.bg; 
        this.ctx.fillRect(0, 0, this.c.width, this.c.height); 

        this.ctx.fillStyle = this.theme.primary;
        this.ctx.font = "bold 50px Arial"; this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle";
        this.ctx.fillText("🏆 WYNIKI 🏆", this.c.width/2, 80);

        this.ctx.textAlign = "left";
        this.ctx.font = "26px Arial";
        this.ctx.fillStyle = this.theme.text;

        if (this.lastScores.length === 0) {
            this.ctx.textAlign = "center";
            this.ctx.fillStyle = this.theme.muted;
            this.ctx.fillText("Brak zapisanych wyników.", this.c.width/2, 250);
        } else {
            let startY = 160;
            this.lastScores.forEach((s, i) => {
                this.ctx.fillText(`${i+1}. ${s.date}`, 100, startY);
                this.ctx.fillStyle = this.theme.primary;
                this.ctx.fillText(`Punkty: ${s.score}`, 450, startY);
                this.ctx.fillStyle = this.theme.text;
                startY += 50;
            });
        }

        // Przycisk Usuń
        this.ctx.fillStyle = '#ef4444';
        this.ctx.fillRect(this.c.width/2 - 120, 520, 240, 50);
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = "center";
        this.ctx.font = "bold 20px Arial";
        this.ctx.fillText("🗑️ Wyczyść Wyniki", this.c.width/2, 545);

        this.ctx.textAlign = "center";
        this.ctx.fillStyle = this.theme.muted;
        this.ctx.font = "18px Arial";
        this.ctx.fillText("« Kliknij dowolny obszar powyżej, aby wrócić »", this.c.width/2, 610);

        this.drawBorder();
    },

    updatePlaying: function() {
        // Zmniejszono prędkość poruszania się statku (10 na PC, 6 na urządzeniach mobilnych)
        let shipSpeed = window.innerWidth <= 768 ? 6 : 10;

        if(typeof gryKeys !== 'undefined') {
            if(gryKeys['ArrowLeft'] && this.ship.x > 20) this.ship.x -= shipSpeed; 
            if(gryKeys['ArrowRight'] && this.ship.x < this.c.width - 80) this.ship.x += shipSpeed;
            if(gryKeys['Space']) this.doAction();
        }

        // Poruszanie pocisków
        for(let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            b.y -= 10;

            if(b.y < 0) {
                this.bullets.splice(i, 1);
                continue;
            }

            for(let j = 0; j < this.aliens.length; j++) {
                let a = this.aliens[j];
                if(a.alive && b.x + b.w > a.x && b.x < a.x + a.w && b.y + b.h > a.y && b.y < a.y + a.h) {
                    a.alive = false;
                    this.bullets.splice(i, 1);
                    this.score += 10;
                    if(typeof playSnd !== 'undefined') playSnd('invader');
                    this.updateScoreUI();
                    break;
                }
            }
        }

        // Ruch kosmitów w dół
        let allDead = true;
        let isGameOver = false;

        this.aliens.forEach(a => {
            if(a.alive) {
                allDead = false;
                a.y += 0.25 + (this.score * 0.002);

                if(a.y + a.h > 530 && !isGameOver) {
                    isGameOver = true;
                }
            }
        });

        if (isGameOver) {
            this.active = false;
            if(typeof playSnd !== 'undefined') playSnd('die');
            if(typeof apps !== 'undefined') apps.showToast('Koniec', 'Ufoludki wylądowały na Ziemi!', 'error');
            
            this.saveScore();
            setTimeout(() => { this.gameState = 'SCORES'; this.active = true; }, 2000);
            return;
        }

        if (allDead) {
            this.active = false;
            if(typeof playSnd !== 'undefined') playSnd('win');
            if(typeof apps !== 'undefined') apps.showToast('Wygrana', 'Ocaliłeś BigOS!', 'success');
            
            this.saveScore();
            setTimeout(() => { this.gameState = 'SCORES'; this.active = true; }, 2000);
            return;
        }
    },

    drawPlaying: function() {
        this.ctx.fillStyle = this.theme.bg; 
        this.ctx.fillRect(0, 0, this.c.width, this.c.height);

        const shipImg = (this.assets && this.assets.ship) || (typeof gameAssets !== 'undefined' && gameAssets.ship);
        const alienImg = (this.assets && this.assets.alien) || (typeof gameAssets !== 'undefined' && gameAssets.alien);
        const bulletImg = (this.assets && this.assets.bullet) || (typeof gameAssets !== 'undefined' && gameAssets.bullet);

        // Rysowanie statku gracza
        this.ctx.font = "50px Arial"; this.ctx.textBaseline = "top";
        if (typeof drawSprite !== 'undefined' && shipImg && shipImg.complete && shipImg.naturalWidth > 0) {
            drawSprite(this.ctx, shipImg, this.ship.x, this.ship.y, this.ship.w, this.ship.h, () => {
                this.ctx.fillText('🚀', this.ship.x, this.ship.y);
            });
        } else {
            this.ctx.fillText('🚀', this.ship.x, this.ship.y);
        }

        // Rysowanie pocisków
        this.bullets.forEach(b => {
            if (typeof drawSprite !== 'undefined' && bulletImg && bulletImg.complete && bulletImg.naturalWidth > 0) {
                drawSprite(this.ctx, bulletImg, b.x, b.y, b.w, b.h, () => {
                    this.ctx.fillStyle = '#fbbf24'; this.ctx.fillRect(b.x, b.y, b.w, b.h);
                });
            } else {
                this.ctx.fillStyle = '#fbbf24'; 
                this.ctx.fillRect(b.x, b.y, b.w, b.h);
            }
        });

        // Rysowanie kosmitów
        this.ctx.font = "40px Arial";
        this.aliens.forEach(a => {
            if (a.alive) {
                if (typeof drawSprite !== 'undefined' && alienImg && alienImg.complete && alienImg.naturalWidth > 0) {
                    drawSprite(this.ctx, alienImg, a.x, a.y, a.w, a.h, () => {
                        this.ctx.fillText('👾', a.x, a.y);
                    });
                } else {
                    this.ctx.fillText('👾', a.x, a.y);
                }
            }
        });

        this.drawBorder();
    },

    stop: function() { this.active = false; if(this.loop) cancelAnimationFrame(this.loop); }
};