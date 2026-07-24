// ======================================================================
// PLIK: js/gry/murarz.js (Wysoka Rozdzielczość + Motywy + Menu + Fizyka)
// ======================================================================

games.murarz = {
    c: null, ctx: null, loop: null, active: false, paddle: {}, ball: {}, bricks: [], score: 0,
    theme: {},
    gameState: 'MENU', // Dostępne stany: MENU, PLAYING, SCORES
    lastScores: [],    // Pamięć ostatnich wyników
    
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

        // KRYTYCZNA NAPRAWA: Moduł gry.js ładuje uniwersalne kontrolki z opóźnieniem. 
        // Agresywnie czyścimy śmieciowe przyciski przez 3 sekundy od startu, zostawiając tylko dedykowane.
        let clearAttempts = 0;
        const clearJunk = setInterval(() => {
            const junk = parent.querySelectorAll('.mobile-dpad, .mobile-dpad-pong, .game-fs-btn:not(.murarz-fs), .pc-start-btn:not(.murarz-start)');
            junk.forEach(j => j.remove());
            clearAttempts++;
            if (clearAttempts > 10) clearInterval(clearJunk);
        }, 300);

        const existingControls = parent.querySelectorAll('.murarz-controls-container, .mobile-dpad-murarz');
        existingControls.forEach(el => el.remove());

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'murarz-controls-container flex flex-col items-center mt-2 shrink-0 w-full z-10 relative';
        
        const win = this.c.closest('.window');
        const fsBtn = document.createElement('button');
        
        // Zastosowanie systemowych kolorów bezpośrednio pod zmienne CSS z theme.js
        fsBtn.className = 'murarz-fs hidden md:block w-full max-w-[320px] self-center my-2 px-4 py-2 rounded-lg font-bold shadow-md transition hover:scale-105 text-[13px]';
        fsBtn.style.backgroundColor = 'var(--primary)';
        fsBtn.style.color = '#000';
        fsBtn.style.border = '2px solid var(--border)';
        fsBtn.innerHTML = '🔲 Powiększ Okno Gry / Zmniejsz';
        fsBtn.onclick = () => { if(win && typeof winManager !== 'undefined') winManager.maximize(win.id); };
        
        if(!document.getElementById('murarz-styles')) {
            const style = document.createElement('style');
            style.id = 'murarz-styles';
            style.innerHTML = `
                .mobile-dpad-murarz { display: none !important; }
                @media (max-width: 768px) {
                    /* Ukrywamy przycisk powiększenia ekranu na smartfonach */
                    .murarz-fs { display: none !important; }
                    
                    .window.active:not(.minimized) .mobile-dpad-murarz { 
                        display: flex !important; flex-direction: column; gap: 12px; 
                        padding: 10px 20px; width: 100%; max-width: 450px; margin: auto auto 10px auto; flex-shrink: 0;
                    }
                    .murarz-dpad-row { display: flex; justify-content: space-between; gap: 15px; width: 100%; }
                    .murarz-dir-btn { 
                        flex: 1; height: 80px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; 
                        background: var(--panel); color: var(--text); border: 2px solid var(--border); box-shadow: 0 6px 10px rgba(0,0,0,0.4); 
                        user-select: none; touch-action: manipulation; cursor: pointer; transition: transform 0.1s;
                    }
                    .murarz-dir-btn .icon { font-size: 32px; line-height: 1; margin-bottom: 4px; }
                    .murarz-dir-btn span.lbl { font-size: 12px; font-weight: bold; color: var(--text-muted); }
                    .murarz-dir-btn:active { transform: translateY(4px) scale(0.95); box-shadow: 0 2px 4px rgba(0,0,0,0.4); }
                    
                    /* Nowy, estetyczny wygląd przycisku MENU GRY */
                    .murarz-menu-btn {
                        width: 100%; height: 60px; border-radius: 14px; display: flex; align-items: center; justify-content: center; gap: 10px;
                        background: var(--panel); color: var(--text); border: 2px solid var(--border); box-shadow: 0 6px 10px rgba(0,0,0,0.4);
                        user-select: none; touch-action: manipulation; cursor: pointer; transition: transform 0.1s;
                    }
                    .murarz-menu-btn:active { transform: translateY(4px) scale(0.98); box-shadow: 0 2px 4px rgba(0,0,0,0.4); }
                    .murarz-menu-btn .icon { font-size: 24px; }
                    .murarz-menu-btn .lbl { font-size: 14px; font-weight: bold; color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; }
                }
            `;
            document.head.appendChild(style);
        }

        const dpad = document.createElement('div');
        dpad.className = 'mobile-dpad-murarz';
        dpad.innerHTML = `
            <div class="murarz-dpad-row">
                <div class="murarz-dir-btn" data-key="ArrowLeft"><div class="icon">⬅️</div><span class="lbl">LEWO</span></div>
                <div class="murarz-dir-btn" data-key="ArrowRight"><div class="icon">➡️</div><span class="lbl">PRAWO</span></div>
            </div>
            <div class="murarz-menu-btn" data-menu="true">
                <div class="icon">🏠</div><span class="lbl">MENU GRY</span>
            </div>
        `;
        
        dpad.querySelectorAll('.murarz-dir-btn, .murarz-menu-btn').forEach(btn => {
            const key = btn.getAttribute('data-key');
            const isMenu = btn.getAttribute('data-menu');
            
            const press = (e) => { 
                e.preventDefault(); 
                if (isMenu) { this.init(); return; }
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
            startBtn.classList.add('murarz-start', 'shrink-0', 'hidden', 'sm:block'); 
            startBtn.innerHTML = "🏠 Menu Gry";
            startBtn.onclick = () => { this.init(); };
            parent.insertBefore(controlsDiv, startBtn.nextSibling);
        } else {
            parent.appendChild(controlsDiv);
        }
    },

    drawBorder: function() {
        this.ctx.strokeStyle = this.theme.border; 
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(0.5, 0.5, this.c.width - 1, this.c.height - 1);
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
        
        this.c = document.getElementById('canvas-murarz'); 
        this.ctx = this.c.getContext('2d'); 
        
        this.c.width = 650; 
        this.c.height = 650;

        // Wczytanie historii wyników
        try {
            const saved = localStorage.getItem('bigos_murarz_scores');
            if (saved) this.lastScores = JSON.parse(saved);
        } catch(e) {}

        const win = document.getElementById('app-murarz');
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

        // Obsługa kliknięć z myszy / dotyku
        this.c.onmousedown = (e) => { 
            if (this.gameState !== 'PLAYING') { e.preventDefault(); this.handleMenuClick(e); }
        };
        this.c.addEventListener('touchstart', (e) => {
            if (this.gameState !== 'PLAYING') { e.preventDefault(); this.handleMenuClick(e); }
        }, {passive: false});

        this.c.onmousemove = (e) => { 
            if (this.gameState !== 'PLAYING') return;
            const pos = this.getMousePos(e);
            this.paddle.x = Math.max(0, Math.min(this.c.width - this.paddle.w, pos.x - this.paddle.w/2)); 
        };
        this.c.addEventListener('touchmove', (e) => { 
            if (this.gameState !== 'PLAYING') return;
            e.preventDefault();
            const pos = this.getMousePos(e);
            this.paddle.x = Math.max(0, Math.min(this.c.width - this.paddle.w, pos.x - this.paddle.w/2)); 
        }, {passive: false});
        
        this.gameState = 'MENU';
        this.active = true;
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
        this.paddle = { x: 260, y: 580, w: 130, h: 16 }; 
        this.ball = { x: 325, y: 550, dx: 4.5, dy: -4.5, r: 12 }; 
        this.bricks = []; 
        this.score = 0; 
        
        for(let c=0; c<8; c++) {
            for(let r=0; r<6; r++) { 
                this.bricks.push({ 
                    x: c*78+18, y: r*35+80, w: 70, h: 25, status: 1, 
                    type: ['🧱','🧊','📦'][Math.floor(Math.random()*3)] 
                }); 
            }
        }
        
        const scoreEl = document.getElementById('murarz-score');
        if(scoreEl) {
            scoreEl.innerText = 'Klocki: 0';
            scoreEl.className = 'font-bold mb-4 g-text text-xl sm:text-3xl drop-shadow-md tracking-wider';
        }
        
        if (typeof gryKeys !== 'undefined') gryKeys['Space'] = false;
        this.gameState = 'PLAYING';
    },

    saveScore: function() {
        if (this.score === 0) return;
        this.lastScores.unshift({ date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(), score: this.score });
        if (this.lastScores.length > 8) this.lastScores.pop();
        localStorage.setItem('bigos_murarz_scores', JSON.stringify(this.lastScores));
    },

    clearScores: function() {
        this.lastScores = [];
        localStorage.removeItem('bigos_murarz_scores');
        if (typeof apps !== 'undefined') apps.showToast('Historia', 'Wyzerowano tablicę wyników.', 'info');
    },

    update: function() {
        if(!this.active) return; 
        
        this.updateColors();
        
        if (this.gameState === 'MENU') {
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

        // Tytuł
        this.ctx.fillStyle = this.theme.primary;
        this.ctx.font = "bold 80px Arial"; this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle";
        this.ctx.fillText("MURARZ", this.c.width/2, 120);
        
        this.ctx.font = "30px Arial"; 
        this.ctx.fillStyle = this.theme.text;
        this.ctx.fillText("Rozwal wszystkie 48 klocków!", this.c.width/2, 190);
        
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
            this.ctx.fillText("Naciśnij spację lub kliknij ekran", this.c.width/2, 550);
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
                this.ctx.fillText(`${s.score} pkt`, 480, startY);
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
        // DYNAMICZNA PRĘDKOŚĆ PALETKI (W zależności od urządzenia)
        let paddleSpeed = window.innerWidth <= 768 ? 15 : 35;

        if(typeof gryKeys !== 'undefined' && gryKeys['ArrowLeft'] && this.paddle.x > 0) this.paddle.x -= paddleSpeed;
        if(typeof gryKeys !== 'undefined' && gryKeys['ArrowRight'] && this.paddle.x < this.c.width - this.paddle.w) this.paddle.x += paddleSpeed;

        let nextX = this.ball.x + this.ball.dx;
        let nextY = this.ball.y + this.ball.dy;

        // Odbicia od ścian bocznych i sufitu
        if(nextX > this.c.width - this.ball.r || nextX < this.ball.r) { 
            this.ball.dx = -this.ball.dx; 
            if(typeof playSnd !== 'undefined') playSnd('bounce'); 
        }
        if(nextY < this.ball.r) { 
            this.ball.dy = -this.ball.dy; 
            if(typeof playSnd !== 'undefined') playSnd('bounce'); 
        }

        // =========================================================
        // NAPRAWIONE ODBICIE OD PALETKI (Brak przenikania!)
        // =========================================================
        if (nextY + this.ball.r >= this.paddle.y && 
            this.ball.y + this.ball.r <= this.paddle.y + Math.abs(this.ball.dy) && 
            nextX + this.ball.r >= this.paddle.x && 
            nextX - this.ball.r <= this.paddle.x + this.paddle.w) {
            
            // Wymuś kierunek w górę i zapobiegaj wpadaniu w środek paletki
            this.ball.dy = -Math.abs(this.ball.dy);
            this.ball.y = this.paddle.y - this.ball.r; 
            
            // Kąt odbicia zależny od miejsca uderzenia (mnożnik skali 6)
            this.ball.dx = ((this.ball.x - (this.paddle.x + this.paddle.w/2)) / (this.paddle.w/2)) * 6; 
            if(typeof playSnd !== 'undefined') playSnd('bounce');
        }
        else if (nextY - this.ball.r > this.c.height) { 
            // Upadek piłki w przepaść
            this.active = false; 
            if(typeof playSnd !== 'undefined') playSnd('die'); 
            if(typeof apps !== 'undefined') apps.showToast('Koniec Gry', 'Piłka spadła!', 'error'); 
            
            this.saveScore();
            setTimeout(() => { this.gameState = 'MENU'; this.active = true; }, 2000);
            return; 
        }

        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;
        
        // Zbijanie klocków
        this.bricks.forEach(b => { 
            if(b.status === 1) { 
                if(this.ball.x > b.x && this.ball.x < b.x+b.w && this.ball.y > b.y && this.ball.y < b.y+b.h) { 
                    this.ball.dy = -this.ball.dy; b.status = 0; this.score++; 
                    if(typeof playSnd !== 'undefined') playSnd('break'); 
                    document.getElementById('murarz-score').innerText = 'Klocki: '+this.score; 
                } 
            } 
        });

        if(this.score === 48) { 
            this.active = false; 
            if(typeof playSnd !== 'undefined') playSnd('win'); 
            if(typeof apps !== 'undefined') apps.showToast('Wygrana', 'Rozbiłeś wszystko!', 'success'); 
            
            this.saveScore();
            setTimeout(() => { this.gameState = 'SCORES'; this.active = true; }, 3000);
            return; 
        } 
    },

    drawPlaying: function() {
        this.ctx.fillStyle = this.theme.bg; 
        this.ctx.fillRect(0,0,this.c.width,this.c.height); 

        this.ctx.font = "30px Arial"; this.ctx.textBaseline = "top";
        
        this.bricks.forEach(b => { 
            if(b.status === 1) { 
                drawSprite(this.ctx, gameAssets.brick, b.x, b.y, b.w, b.h, () => { this.ctx.fillText(b.type, b.x + 20, b.y - 4); });
            } 
        });
        
        drawSprite(this.ctx, gameAssets.paddle, this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h, () => {
            this.ctx.fillStyle = this.theme.primary; 
            this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h); 
        });
        
        drawSprite(this.ctx, gameAssets.ball, this.ball.x - this.ball.r, this.ball.y - this.ball.r, this.ball.r*2, this.ball.r*2, () => {
            this.ctx.font = "24px Arial"; this.ctx.fillText('⚽', this.ball.x - 12, this.ball.y - 12);
        });
        
        this.drawBorder();
    },
    
    stop: function() { this.active = false; if(this.loop) cancelAnimationFrame(this.loop); }
};