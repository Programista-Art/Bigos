// ======================================================================
// PLIK: js/gry/odbijanka.js (Wysoka Rozdzielczość + Motywy + Menu + Fizyka)
// ======================================================================

games.odbijanka = {
    c: null, ctx: null, loop: null, active: false, 
    p1: {}, p2: {}, ball: {}, score1: 0, score2: 0,
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

        let clearAttempts = 0;
        const clearJunk = setInterval(() => {
            const junk = parent.querySelectorAll('.mobile-dpad, .mobile-dpad-pong, .game-fs-btn:not(.odbijanka-fs), .pc-start-btn:not(.odbijanka-start)');
            junk.forEach(j => j.remove());
            clearAttempts++;
            if (clearAttempts > 10) clearInterval(clearJunk);
        }, 300);

        const existingControls = parent.querySelectorAll('.odbijanka-controls-container, .mobile-dpad-odbijanka');
        existingControls.forEach(el => el.remove());

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'odbijanka-controls-container flex flex-col items-center mt-2 shrink-0 w-full z-10 relative';
        
        const win = this.c.closest('.window');
        const fsBtn = document.createElement('button');
        
        // Zastosowanie systemowych kolorów bezpośrednio pod zmienne CSS z theme.js
        fsBtn.className = 'odbijanka-fs hidden md:block w-full max-w-[320px] self-center my-2 px-4 py-2 rounded-lg font-bold shadow-md transition hover:scale-105 text-[13px]';
        fsBtn.style.backgroundColor = 'var(--primary)';
        fsBtn.style.color = '#000';
        fsBtn.style.border = '2px solid var(--border)';
        fsBtn.innerHTML = 'Powiększ Okno Gry / Zmniejsz';
        fsBtn.onclick = () => { if(win && typeof winManager !== 'undefined') winManager.maximize(win.id); };
        
        if(!document.getElementById('odbijanka-styles')) {
            const style = document.createElement('style');
            style.id = 'odbijanka-styles';
            style.innerHTML = `
                .mobile-dpad-odbijanka { display: none !important; }
                @media (max-width: 768px) {
                    .window.active:not(.minimized) .mobile-dpad-odbijanka { 
                        display: flex !important; flex-direction: column; gap: 12px; 
                        padding: 10px 20px; width: 100%; max-width: 450px; margin: auto auto 10px auto; flex-shrink: 0;
                    }
                    .odbijanka-dpad-row { display: flex; justify-content: space-between; gap: 15px; width: 100%; }
                    .odbijanka-dir-btn { 
                        flex: 1; height: 80px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; 
                        background: var(--panel); color: var(--text); border: 2px solid var(--border); box-shadow: 0 6px 10px rgba(0,0,0,0.4); 
                        user-select: none; touch-action: manipulation; cursor: pointer; transition: transform 0.1s;
                    }
                    .odbijanka-dir-btn .icon { font-size: 32px; line-height: 1; margin-bottom: 4px; }
                    .odbijanka-dir-btn span.lbl { font-size: 12px; font-weight: bold; color: var(--text-muted); }
                    .odbijanka-dir-btn:active { transform: translateY(4px) scale(0.95); box-shadow: 0 2px 4px rgba(0,0,0,0.4); }
                    
                    .odbijanka-menu-btn {
                        width: 100%; height: 60px; border-radius: 14px; display: flex; align-items: center; justify-content: center; gap: 10px;
                        background: var(--panel); color: var(--text); border: 2px solid var(--border); box-shadow: 0 6px 10px rgba(0,0,0,0.4);
                        user-select: none; touch-action: manipulation; cursor: pointer; transition: transform 0.1s;
                    }
                    .odbijanka-menu-btn:active { transform: translateY(4px) scale(0.98); box-shadow: 0 2px 4px rgba(0,0,0,0.4); }
                    .odbijanka-menu-btn .icon { font-size: 24px; }
                    .odbijanka-menu-btn .lbl { font-size: 14px; font-weight: bold; color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; }
                }
            `;
            document.head.appendChild(style);
        }

        const dpad = document.createElement('div');
        dpad.className = 'mobile-dpad-odbijanka';
        dpad.innerHTML = `
            <div class="odbijanka-dpad-row">
                <div class="odbijanka-dir-btn" data-key="ArrowUp"><div class="icon">⬆️</div><span class="lbl">GÓRA</span></div>
                <div class="odbijanka-dir-btn" data-key="ArrowDown"><div class="icon">⬇️</div><span class="lbl">DÓŁ</span></div>
            </div>
            <div class="odbijanka-menu-btn" data-menu="true">
                <div class="icon">🏠</div><span class="lbl">MENU GRY</span>
            </div>
        `;
        
        dpad.querySelectorAll('.odbijanka-dir-btn, .odbijanka-menu-btn').forEach(btn => {
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
            startBtn.classList.add('odbijanka-start', 'shrink-0', 'hidden', 'sm:block'); 
            startBtn.innerHTML = "🏠 Menu Gry";
            startBtn.onclick = () => { this.init(); };
            parent.insertBefore(controlsDiv, startBtn.nextSibling);
        } else {
            parent.appendChild(controlsDiv);
        }
    },

    drawBorder: function() {
        this.ctx.strokeStyle = this.theme.border; 
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(1, 1, this.c.width - 2, this.c.height - 2);
    },

    getMousePos: function(e) {
        const rect = this.c.getBoundingClientRect();
        const scaleY = this.c.height / rect.height;
        let clientY = e.clientY;
        if (e.touches && e.touches.length > 0) {
            clientY = e.touches[0].clientY;
        }
        // Użyte również do kliknięć w menu (stąd zwracam też X)
        const scaleX = this.c.width / rect.width;
        let clientX = e.clientX;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
        }
        return { 
            x: (clientX - rect.left) * scaleX, 
            y: (clientY - rect.top) * scaleY 
        };
    },

    init: async function() {
        if(typeof stopAllSounds !== 'undefined') stopAllSounds();
        if(this.loop) cancelAnimationFrame(this.loop); 
        
        this.c = document.getElementById('canvas-odbijanka'); 
        this.ctx = this.c.getContext('2d'); 
        
        this.c.width = 650; 
        this.c.height = 650;

        // Wczytanie historii wyników z IndexedDB (z zabezpieczeniem LocalStorage)
        try {
            if (typeof bigosDB !== 'undefined') {
                const saved = await bigosDB.get('bigos_odbijanka_scores');
                if (saved) this.lastScores = typeof saved === 'string' ? JSON.parse(saved) : saved;
            } else {
                const saved = localStorage.getItem('bigos_odbijanka_scores');
                if (saved) this.lastScores = JSON.parse(saved);
            }
        } catch(e) {
            console.error("Błąd wczytywania wyników:", e);
        }

        const win = document.getElementById('app-odbijanka');
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

        // Obsługa kliknięć i dotyku dla Menu i gry
        this.c.onmousedown = (e) => { 
            if (this.gameState !== 'PLAYING') { e.preventDefault(); this.handleMenuClick(e); }
        };
        this.c.addEventListener('touchstart', (e) => {
            if (this.gameState !== 'PLAYING') { e.preventDefault(); this.handleMenuClick(e); }
        }, {passive: false});

        this.c.onmousemove = (e) => { 
            if (this.gameState !== 'PLAYING') return;
            const pos = this.getMousePos(e);
            this.p1.y = Math.max(0, Math.min(this.c.height - this.p1.h, pos.y - this.p1.h/2)); 
        };
        this.c.addEventListener('touchmove', (e) => { 
            if (this.gameState !== 'PLAYING') return;
            e.preventDefault();
            const pos = this.getMousePos(e);
            this.p1.y = Math.max(0, Math.min(this.c.height - this.p1.h, pos.y - this.p1.h/2)); 
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
                this.gameState = 'MENU'; // Powrót
            }
        }
    },

    startFromMenu: function() {
        this.score1 = 0; 
        this.score2 = 0; 
        
        // Większe wymiary paletek i szybsza piłka
        this.p1 = { x: 20, y: 260, w: 16, h: 130 }; 
        this.p2 = { x: 614, y: 260, w: 16, h: 130 }; 
        
        this.resetBall(1);
        
        if (typeof gryKeys !== 'undefined') { gryKeys['ArrowUp'] = false; gryKeys['ArrowDown'] = false; }
        
        this.updateScoreUI();
        this.gameState = 'PLAYING';
    },

    resetBall: function(direction) {
        this.ball = { x: this.c.width/2, y: this.c.height/2, dx: 6 * direction, dy: (Math.random() > 0.5 ? 4 : -4), r: 16 };
        if(typeof playSnd !== 'undefined') playSnd('score');
        this.updateScoreUI();
    },

    saveScore: async function(isWin) {
        const resText = `${this.score1} : ${this.score2}`;
        this.lastScores.unshift({ 
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(), 
            score: resText, 
            result: isWin ? 'Wygrana' : 'Przegrana' 
        });
        if (this.lastScores.length > 8) this.lastScores.pop();
        
        try {
            if (typeof bigosDB !== 'undefined') {
                await bigosDB.set('bigos_odbijanka_scores', this.lastScores);
            } else {
                localStorage.setItem('bigos_odbijanka_scores', JSON.stringify(this.lastScores));
            }
        } catch(e) {
            console.error("Błąd zapisu wyników:", e);
        }
    },

    clearScores: async function() {
        this.lastScores = [];
        try {
            if (typeof bigosDB !== 'undefined') {
                await bigosDB.set('bigos_odbijanka_scores', []);
            } else {
                localStorage.removeItem('bigos_odbijanka_scores');
            }
        } catch(e) {
            console.error("Błąd czyszczenia wyników:", e);
        }
        if (typeof apps !== 'undefined') apps.showToast('Historia', 'Wyzerowano tablicę wyników.', 'info');
    },

    updateScoreUI: function() {
        const el = document.getElementById('odbijanka-score');
        if(el) {
            el.innerText = `Ty: ${this.score1} | Komputer: ${this.score2}`;
            el.className = 'font-bold mb-4 g-accent text-xl sm:text-3xl drop-shadow-md tracking-wider text-center';
        }
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

        this.ctx.fillStyle = this.theme.primary;
        this.ctx.font = "bold 80px Arial"; this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle";
        this.ctx.fillText("ODBIJANKA", this.c.width/2, 120);
        
        this.ctx.font = "30px Arial"; 
        this.ctx.fillStyle = this.theme.text;
        this.ctx.fillText("Klasyczny symulator tenisa!", this.c.width/2, 190);
        
        // Przycisk Start
        this.ctx.fillStyle = this.theme.primary;
        this.ctx.fillRect(this.c.width/2 - 150, 270, 300, 70);
        this.ctx.fillStyle = '#000';
        this.ctx.font = "bold 32px Arial";
        this.ctx.fillText("▶ START GRY", this.c.width/2, 305);

        // Przycisk Wyniki
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(this.c.width/2 - 150, 370, 300, 60);
        this.ctx.strokeStyle = this.theme.border;
        this.ctx.strokeRect(this.c.width/2 - 150, 370, 300, 60);
        this.ctx.fillStyle = this.theme.text;
        this.ctx.font = "bold 24px Arial";
        this.ctx.fillText("🏆 Ostatnie Wyniki", this.c.width/2, 400);

        if (Math.floor(Date.now() / 600) % 2 === 0) {
            this.ctx.fillStyle = this.theme.muted;
            this.ctx.font = "20px Arial";
            this.ctx.fillText("Kto pierwszy zdobędzie 10 punktów wygrywa", this.c.width/2, 550);
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

        if (this.lastScores.length === 0) {
            this.ctx.textAlign = "center";
            this.ctx.fillStyle = this.theme.muted;
            this.ctx.fillText("Brak zapisanych wyników.", this.c.width/2, 250);
        } else {
            let startY = 150;
            this.lastScores.forEach((s, i) => {
                this.ctx.fillStyle = this.theme.text;
                this.ctx.fillText(`${i+1}. ${s.date}`, 80, startY);
                this.ctx.fillStyle = s.result === 'Wygrana' ? '#10b981' : '#ef4444';
                this.ctx.fillText(`${s.result} (${s.score})`, 420, startY);
                startY += 40;
            });
        }

        // Przycisk Usuń
        this.ctx.fillStyle = '#ef4444';
        this.ctx.fillRect(this.c.width/2 - 120, 520, 240, 50);
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = "center";
        this.ctx.font = "bold 20px Arial";
        this.ctx.fillText("🗑️ Wyczyść Wyniki", this.c.width/2, 545);

        this.ctx.fillStyle = this.theme.muted;
        this.ctx.font = "18px Arial";
        this.ctx.fillText("« Kliknij dowolny obszar powyżej, aby wrócić »", this.c.width/2, 610);

        this.drawBorder();
    },

    updatePlaying: function() {
        let paddleSpeed = window.innerWidth <= 768 ? 15 : 25;

        // Sterowanie z klawiatury
        if(typeof gryKeys !== 'undefined' && gryKeys['ArrowUp'] && this.p1.y > 0) this.p1.y -= paddleSpeed;
        if(typeof gryKeys !== 'undefined' && gryKeys['ArrowDown'] && this.p1.y < this.c.height - this.p1.h) this.p1.y += paddleSpeed;

        this.ball.x += this.ball.dx; 
        this.ball.y += this.ball.dy;

        // Odbicia od sufitu i podłogi
        if(this.ball.y - this.ball.r < 0) { 
            this.ball.y = this.ball.r; 
            this.ball.dy = -this.ball.dy; 
            if(typeof playSnd !== 'undefined') playSnd('pong'); 
        }
        if(this.ball.y + this.ball.r > this.c.height) { 
            this.ball.y = this.c.height - this.ball.r; 
            this.ball.dy = -this.ball.dy; 
            if(typeof playSnd !== 'undefined') playSnd('pong'); 
        }

        // AI Komputera (Nieco ulepszone na wyższą rozdzielczość)
        const aiCenter = this.p2.y + this.p2.h/2;
        if(aiCenter < this.ball.y - 15) this.p2.y += 3.8; 
        else if(aiCenter > this.ball.y + 15) this.p2.y -= 3.8;
        this.p2.y = Math.max(0, Math.min(this.c.height - this.p2.h, this.p2.y));

        // Kolizja - Gracz
        if(this.ball.x - this.ball.r < this.p1.x + this.p1.w && 
           this.ball.y > this.p1.y && 
           this.ball.y < this.p1.y + this.p1.h && 
           this.ball.dx < 0) {
            
            this.ball.dx = -this.ball.dx;
            this.ball.x = this.p1.x + this.p1.w + this.ball.r;
            
            // Podkręcanie piłki w zależności od miejsca uderzenia w paletkę
            let hitFactor = (this.ball.y - (this.p1.y + this.p1.h/2)) / (this.p1.h/2);
            this.ball.dy = hitFactor * 7; 
            
            if(typeof playSnd !== 'undefined') playSnd('pong'); 
        } 
        
        // Kolizja - AI
        if(this.ball.x + this.ball.r > this.p2.x && 
           this.ball.y > this.p2.y && 
           this.ball.y < this.p2.y + this.p2.h && 
           this.ball.dx > 0) {
            
            this.ball.dx = -this.ball.dx; 
            this.ball.x = this.p2.x - this.ball.r;
            
            let hitFactor = (this.ball.y - (this.p2.y + this.p2.h/2)) / (this.p2.h/2);
            this.ball.dy = hitFactor * 7; 

            if(typeof playSnd !== 'undefined') playSnd('pong'); 
        }
        
        // Punktacja
        if(this.ball.x < 0) { 
            this.score2++; 
            this.resetBall(1); 
        } 
        else if(this.ball.x > this.c.width) { 
            this.score1++; 
            this.resetBall(-1); 
        }

        // Warunek Zwycięstwa (Grajmy do 10 punktów)
        if(this.score1 >= 10 || this.score2 >= 10) {
            let isWin = this.score1 >= 10;
            this.saveScore(isWin);
            this.active = false;
            if(typeof playSnd !== 'undefined') playSnd(isWin ? 'win' : 'die');
            if(typeof apps !== 'undefined') apps.showToast(isWin ? 'Wygrałeś!' : 'Przegrałeś...', `${this.score1} : ${this.score2}`, isWin ? 'success' : 'error');
            
            setTimeout(() => { this.gameState = 'SCORES'; this.active = true; }, 3000);
        }
    },

    drawPlaying: function() {
        this.ctx.fillStyle = this.theme.bg; 
        this.ctx.fillRect(0,0,this.c.width,this.c.height); 

        // Siatka na środku
        this.ctx.strokeStyle = this.theme.border;
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([15, 20]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.c.width/2, 0);
        this.ctx.lineTo(this.c.width/2, this.c.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Zamazane, gigantyczne wyniki w tle
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.font = "bold 250px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(this.score1, this.c.width/4, this.c.height/2 + 20);
        this.ctx.fillText(this.score2, (this.c.width/4)*3, this.c.height/2 + 20);

        // Paletka Gracza (Theme Primary)
        drawSprite(this.ctx, gameAssets.paddle, this.p1.x, this.p1.y, this.p1.w, this.p1.h, () => { 
            this.ctx.fillStyle = this.theme.primary; 
            this.ctx.fillRect(this.p1.x, this.p1.y, this.p1.w, this.p1.h); 
        });
        
        // Paletka AI (Czerwona)
        drawSprite(this.ctx, gameAssets.paddle, this.p2.x, this.p2.y, this.p2.w, this.p2.h, () => { 
            this.ctx.fillStyle = '#ef4444'; 
            this.ctx.fillRect(this.p2.x, this.p2.y, this.p2.w, this.p2.h); 
        });
        
        // Piłka
        this.ctx.font = "32px Arial"; 
        drawSprite(this.ctx, gameAssets.ball, this.ball.x - this.ball.r, this.ball.y - this.ball.r, this.ball.r*2, this.ball.r*2, () => { 
            this.ctx.fillText('🎾', this.ball.x - 16, this.ball.y - 16); 
        });

        this.drawBorder();
    },
    
    stop: function() { this.active = false; if(this.loop) cancelAnimationFrame(this.loop); }
};