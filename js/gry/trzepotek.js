// ======================================================================
// PLIK: js/gry/trzepotek.js (Wysoka Rozdzielczość + Motywy + Menu)
// ======================================================================

games.trzepotek = {
    c: null, ctx: null, loop: null, active: false, 
    birdY: 300, velocity: 0, pipes: [], score: 0, frame: 0,
    
    theme: {},
    gameState: 'MENU', // Dostępne stany: MENU, PLAYING, SCORES
    lastScores: [],
    assets: {}, assetsLoaded: false,

    initAssets: function() {
        if(this.assetsLoaded) return;
        this.assets.bird = new Image();
        this.assets.bird.src = 'games/img/bird.webp';
        this.assets.pipe = new Image();
        this.assets.pipe.src = 'games/img/pipe.webp';
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
            const junk = parent.querySelectorAll('.mobile-dpad, .mobile-dpad-pong, .game-fs-btn:not(.trzepotek-fs), .pc-start-btn:not(.trzepotek-start)');
            junk.forEach(j => j.remove());
            clearAttempts++;
            if (clearAttempts > 10) clearInterval(clearJunk);
        }, 300);

        const existingControls = parent.querySelectorAll('.trzepotek-controls-container, .mobile-dpad-trzepotek');
        existingControls.forEach(el => el.remove());

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'trzepotek-controls-container flex flex-col items-center mt-2 shrink-0 w-full z-10 relative';
        
        const win = this.c.closest('.window');
        const fsBtn = document.createElement('button');
        
        // Zastosowanie systemowych kolorów bezpośrednio pod zmienne CSS z theme.js (bez ikony)
        fsBtn.className = 'trzepotek-fs hidden md:block w-full max-w-[320px] self-center my-2 px-4 py-2 rounded-lg font-bold shadow-md transition hover:scale-105 text-[13px]';
        fsBtn.style.backgroundColor = 'var(--primary)';
        fsBtn.style.color = '#000';
        fsBtn.style.border = '2px solid var(--border)';
        fsBtn.innerHTML = 'Powiększ Okno Gry / Zmniejsz';
        fsBtn.onclick = () => { if(win && typeof winManager !== 'undefined') winManager.maximize(win.id); };
        
        if(!document.getElementById('trzepotek-styles')) {
            const style = document.createElement('style');
            style.id = 'trzepotek-styles';
            style.innerHTML = `
                .mobile-dpad-trzepotek { display: none !important; }
                @media (max-width: 768px) {
                    .trzepotek-fs { display: none !important; }
                    
                    .window.active:not(.minimized) .mobile-dpad-trzepotek { 
                        display: flex !important; flex-direction: column; gap: 12px; 
                        padding: 10px 20px; width: 100%; max-width: 450px; margin: auto auto 10px auto; flex-shrink: 0;
                    }
                    .trzepotek-dpad-row { display: flex; justify-content: space-between; gap: 15px; width: 100%; }
                    .trzepotek-dir-btn { 
                        flex: 1; height: 80px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; 
                        background: var(--panel); color: var(--text); border: 2px solid var(--border); box-shadow: 0 6px 10px rgba(0,0,0,0.4); 
                        user-select: none; touch-action: manipulation; cursor: pointer; transition: transform 0.1s;
                    }
                    .trzepotek-dir-btn .icon { font-size: 32px; line-height: 1; margin-bottom: 4px; }
                    .trzepotek-dir-btn span.lbl { font-size: 12px; font-weight: bold; color: var(--text-muted); }
                    .trzepotek-dir-btn:active { transform: translateY(4px) scale(0.95); box-shadow: 0 2px 4px rgba(0,0,0,0.4); }
                    
                    .trzepotek-menu-btn {
                        width: 100%; height: 60px; border-radius: 14px; display: flex; align-items: center; justify-content: center; gap: 10px;
                        background: var(--panel); color: var(--text); border: 2px solid var(--border); box-shadow: 0 6px 10px rgba(0,0,0,0.4);
                        user-select: none; touch-action: manipulation; cursor: pointer; transition: transform 0.1s;
                    }
                    .trzepotek-menu-btn:active { transform: translateY(4px) scale(0.98); box-shadow: 0 2px 4px rgba(0,0,0,0.4); }
                    .trzepotek-menu-btn .icon { font-size: 24px; }
                    .trzepotek-menu-btn .lbl { font-size: 14px; font-weight: bold; color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; }
                }
            `;
            document.head.appendChild(style);
        }

        const dpad = document.createElement('div');
        dpad.className = 'mobile-dpad-trzepotek';
        dpad.innerHTML = `
            <div class="trzepotek-dpad-row">
                <div class="trzepotek-dir-btn" data-key="Space" style="background: var(--primary); color: #000; border-color: var(--primary);"><div class="icon">🦇</div><span class="lbl" style="color: #000; font-weight: bold;">SKOK / LEĆ</span></div>
            </div>
            <div class="trzepotek-menu-btn" data-menu="true">
                <div class="icon">🏠</div><span class="lbl">MENU GRY</span>
            </div>
        `;
        
        dpad.querySelectorAll('.trzepotek-dir-btn, .trzepotek-menu-btn').forEach(btn => {
            const key = btn.getAttribute('data-key');
            const isMenu = btn.getAttribute('data-menu');
            
            const press = (e) => { 
                e.preventDefault(); 
                if (isMenu) { this.init(); return; }
                if (this.gameState === 'MENU') { this.startFromMenu(); return; }
                if (this.gameState === 'PLAYING') { this.doAction(); }
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
            startBtn.classList.add('trzepotek-start', 'shrink-0', 'hidden', 'sm:block'); 
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
        
        this.c = document.getElementById('canvas-trzepotek'); 
        this.ctx = this.c.getContext('2d'); 
        
        // Zwiększamy rozdzielczość płótna do 650x650
        this.c.width = 650; 
        this.c.height = 650;

        this.initAssets();

        // Wczytanie historii wyników
        try {
            const saved = localStorage.getItem('bigos_trzepotek_scores');
            if (saved) this.lastScores = JSON.parse(saved);
        } catch(e) {}

        // Zwiększenie okna gry
        const win = document.getElementById('app-trzepotek');
        if (win && !win.dataset.resized) {
            win.style.width = '700px'; 
            win.classList.remove('w-[340px]');
            
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

        // Obsługa kliknięć / dotyku
        this.c.onmousedown = (e) => { 
            e.preventDefault(); 
            if (this.gameState !== 'PLAYING') this.handleMenuClick(e);
            else this.doAction();
        };
        this.c.ontouchstart = (e) => {
            e.preventDefault();
            if (this.gameState !== 'PLAYING') this.handleMenuClick(e);
            else this.doAction();
        };
        
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
        this.birdY = 300;
        this.velocity = 0;
        this.pipes = [];
        this.score = 0;
        this.frame = 0;
        
        this.updateScoreUI(); 
        
        if (typeof gryKeys !== 'undefined') {
            gryKeys['Space'] = false;
        }
        
        this.gameState = 'PLAYING';
    },

    doAction: function() {
        if(this.gameState !== 'PLAYING' || !this.active) return;
        this.velocity = -7.5;
        if(typeof playSnd !== 'undefined') playSnd('flap');
        if(typeof gryKeys !== 'undefined') gryKeys['Space'] = false; 
    },

    saveScore: function() {
        if (this.score === 0) return;
        this.lastScores.unshift({ date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(), score: this.score });
        if (this.lastScores.length > 8) this.lastScores.pop();
        localStorage.setItem('bigos_trzepotek_scores', JSON.stringify(this.lastScores));
    },

    clearScores: function() {
        this.lastScores = [];
        localStorage.removeItem('bigos_trzepotek_scores');
        if (typeof apps !== 'undefined') apps.showToast('Historia', 'Wyzerowano tablicę wyników.', 'info');
    },

    updateScoreUI: function() {
        const el = document.getElementById('trzepotek-score');
        if (el) {
            el.innerText = `Punkty: ${this.score}`;
            el.className = 'font-bold mb-4 g-accent text-xl sm:text-3xl drop-shadow-md tracking-wider text-center';
        }
    },

    checkCollision: function(r1, r2) {
        return (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
                r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);
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
        this.ctx.fillText("TRZEPOTEK", this.c.width/2, 120);
        
        this.ctx.font = "30px Arial"; 
        this.ctx.fillStyle = this.theme.text;
        this.ctx.fillText("Leć jak najdalej i omijaj rury!", this.c.width/2, 190);
        
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
            this.ctx.fillText("Naciśnij spację lub kliknij ekran, by wzbić się w powietrze", this.c.width/2, 550);
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
        if(typeof gryKeys !== 'undefined' && gryKeys['Space']) {
            this.doAction();
        }

        this.velocity += 0.38;
        if(this.velocity > 10) this.velocity = 10;
        this.birdY += this.velocity;

        // Generowanie rur
        if(this.frame % 100 === 0) { 
            const gapY = Math.random() * (650 - 180 - 160) + 80; 
            this.pipes.push({ x: 650, w: 70, top: gapY, bottom: gapY + 180, passed: false }); 
        } 
        this.frame++;

        let crashed = false;
        const birdBox = { x: 100, y: this.birdY, w: 45, h: 45 };

        if(this.birdY < 0 || this.birdY + 45 > 650) {
            crashed = true;
        }

        for(let i = this.pipes.length - 1; i >= 0; i--) {
            let p = this.pipes[i];
            p.x -= 3.5;

            // Naliczanie punktu po wyminięciu rury
            if(!p.passed && p.x + p.w < 100) {
                p.passed = true;
                this.score++;
                if(typeof playSnd !== 'undefined') playSnd('score');
                this.updateScoreUI();
            }

            // Kolizja z rurami
            if(!crashed) {
                const topPipe = { x: p.x, y: 0, w: p.w, h: p.top };
                const bottomPipe = { x: p.x, y: p.bottom, w: p.w, h: 650 - p.bottom };

                if(this.checkCollision(birdBox, topPipe) || this.checkCollision(birdBox, bottomPipe)) {
                    crashed = true;
                }
            }

            if(p.x < -100) {
                this.pipes.splice(i, 1);
            }
        }

        if (crashed) {
            this.active = false; 
            if(typeof playSnd !== 'undefined') playSnd('hit'); 
            if(typeof apps !== 'undefined') apps.showToast('Koniec', 'Trzepotek uderzył w przeszkodę!', 'error'); 
            
            this.saveScore();
            setTimeout(() => { this.gameState = 'SCORES'; this.active = true; }, 2000);
        }
    },

    drawPlaying: function() {
        this.ctx.fillStyle = this.theme.bg; 
        this.ctx.fillRect(0, 0, this.c.width, this.c.height);

        const pipeImg = (this.assets && this.assets.pipe) || (typeof gameAssets !== 'undefined' && gameAssets.pipe);
        const birdImg = (this.assets && this.assets.bird) || (typeof gameAssets !== 'undefined' && gameAssets.bird);

        // Rysowanie rur
        this.pipes.forEach(p => {
            if (typeof drawSprite !== 'undefined' && pipeImg && pipeImg.complete && pipeImg.naturalWidth > 0) {
                drawSprite(this.ctx, pipeImg, p.x, 0, p.w, p.top, () => {
                    this.ctx.fillStyle = '#22c55e';
                    this.ctx.fillRect(p.x, 0, p.w, p.top);
                    this.ctx.strokeStyle = '#15803d';
                    this.ctx.strokeRect(p.x, 0, p.w, p.top);
                });
                drawSprite(this.ctx, pipeImg, p.x, p.bottom, p.w, 650 - p.bottom, () => {
                    this.ctx.fillStyle = '#22c55e';
                    this.ctx.fillRect(p.x, p.bottom, p.w, 650 - p.bottom);
                    this.ctx.strokeStyle = '#15803d';
                    this.ctx.strokeRect(p.x, p.bottom, p.w, 650 - p.bottom);
                });
            } else {
                this.ctx.fillStyle = '#22c55e';
                this.ctx.fillRect(p.x, 0, p.w, p.top);
                this.ctx.fillRect(p.x, p.bottom, p.w, 650 - p.bottom);
                this.ctx.strokeStyle = '#15803d';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(p.x, 0, p.w, p.top);
                this.ctx.strokeRect(p.x, p.bottom, p.w, 650 - p.bottom);
            }
        });

        // Rysowanie ptaszka
        this.ctx.font = "40px Arial";
        this.ctx.textBaseline = "top";
        if (typeof drawSprite !== 'undefined' && birdImg && birdImg.complete && birdImg.naturalWidth > 0) {
            drawSprite(this.ctx, birdImg, 100, this.birdY, 45, 45, () => {
                this.ctx.fillText('🦇', 100, this.birdY);
            });
        } else {
            this.ctx.fillText('🦇', 100, this.birdY);
        }

        this.drawBorder();
    },

    stop: function() { this.active = false; if(this.loop) cancelAnimationFrame(this.loop); }
};