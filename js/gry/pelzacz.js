// ======================================================================
// PLIK: js/gry/pelzacz.js (Wysoka Rozdzielczość + Motywy + Menu)
// ======================================================================

games.pelzacz = {
    c: null, ctx: null, loop: null, inputReq: null, active: false, 
    grid: 25, // Powiększona siatka z 20 na 25 dla większej gry
    snake: [], apple: {}, dx: 25, dy: 0, 
    turnQueue: [], 
    score: 0, highScore: 0,
    
    theme: {},
    gameState: 'MENU', // Dostępne stany: MENU, PLAYING, SCORES
    lastScores: [],
    
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
            const junk = parent.querySelectorAll('.mobile-dpad, .mobile-dpad-pong, .game-fs-btn:not(.pelzacz-fs), .pc-start-btn:not(.pelzacz-start)');
            junk.forEach(j => j.remove());
            clearAttempts++;
            if (clearAttempts > 10) clearInterval(clearJunk);
        }, 300);

        const existingControls = parent.querySelectorAll('.pelzacz-controls-container, .mobile-dpad-pelzacz');
        existingControls.forEach(el => el.remove());

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'pelzacz-controls-container flex flex-col items-center mt-2 shrink-0 w-full z-10 relative';
        
        const win = this.c.closest('.window');
        const fsBtn = document.createElement('button');
        
        // Zastosowanie systemowych kolorów bezpośrednio pod zmienne CSS z theme.js
        fsBtn.className = 'pelzacz-fs hidden md:block w-full max-w-[320px] self-center my-2 px-4 py-2 rounded-lg font-bold shadow-md transition hover:scale-105 text-[13px]';
        fsBtn.style.backgroundColor = 'var(--primary)';
        fsBtn.style.color = '#000';
        fsBtn.style.border = '2px solid var(--border)';
        fsBtn.innerHTML = 'Powiększ Okno Gry / Zmniejsz'; // Usunięta ikona 🔲
        fsBtn.onclick = () => { if(win && typeof winManager !== 'undefined') winManager.maximize(win.id); };
        
        if(!document.getElementById('pelzacz-styles')) {
            const style = document.createElement('style');
            style.id = 'pelzacz-styles';
            style.innerHTML = `
                .mobile-dpad-pelzacz { display: none !important; }
                @media (max-width: 768px) {
                    /* Ukrywamy przycisk powiększenia ekranu na smartfonach */
                    .pelzacz-fs { display: none !important; }
                    
                    .window.active:not(.minimized) .mobile-dpad-pelzacz { 
                        display: flex !important; flex-direction: column; gap: 12px; 
                        padding: 10px 20px; width: 100%; max-width: 400px; margin: auto auto 10px auto; flex-shrink: 0;
                    }
                    .pelzacz-dpad-grid { 
                        display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; 
                    }
                    .pelzacz-dir-btn { 
                        height: 70px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; 
                        background: var(--panel); color: var(--text); border: 2px solid var(--border); box-shadow: 0 6px 10px rgba(0,0,0,0.4); 
                        user-select: none; touch-action: manipulation; cursor: pointer; transition: transform 0.1s;
                    }
                    .pelzacz-dir-btn .icon { font-size: 32px; line-height: 1; margin-bottom: 2px; }
                    .pelzacz-dir-btn:active { transform: translateY(4px) scale(0.95); box-shadow: 0 2px 4px rgba(0,0,0,0.4); }
                    
                    /* Nowy, estetyczny wygląd przycisku MENU GRY */
                    .pelzacz-menu-btn {
                        width: 100%; height: 60px; border-radius: 14px; display: flex; align-items: center; justify-content: center; gap: 10px;
                        background: var(--panel); color: var(--text); border: 2px solid var(--border); box-shadow: 0 6px 10px rgba(0,0,0,0.4);
                        user-select: none; touch-action: manipulation; cursor: pointer; transition: transform 0.1s;
                    }
                    .pelzacz-menu-btn:active { transform: translateY(4px) scale(0.98); box-shadow: 0 2px 4px rgba(0,0,0,0.4); }
                    .pelzacz-menu-btn .icon { font-size: 24px; }
                    .pelzacz-menu-btn .lbl { font-size: 14px; font-weight: bold; color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; }
                }
            `;
            document.head.appendChild(style);
        }

        const dpad = document.createElement('div');
        dpad.className = 'mobile-dpad-pelzacz';
        dpad.innerHTML = `
            <div class="pelzacz-dpad-grid">
                <div></div>
                <div class="pelzacz-dir-btn" data-key="ArrowUp"><div class="icon">⬆️</div></div>
                <div></div>
                <div class="pelzacz-dir-btn" data-key="ArrowLeft"><div class="icon">⬅️</div></div>
                <div class="pelzacz-dir-btn" data-key="ArrowDown"><div class="icon">⬇️</div></div>
                <div class="pelzacz-dir-btn" data-key="ArrowRight"><div class="icon">➡️</div></div>
            </div>
            <div class="pelzacz-menu-btn" data-menu="true">
                <div class="icon">🏠</div><span class="lbl">MENU GRY</span>
            </div>
        `;
        
        dpad.querySelectorAll('.pelzacz-dir-btn, .pelzacz-menu-btn').forEach(btn => {
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
            startBtn.classList.add('pelzacz-start', 'shrink-0', 'hidden', 'sm:block'); 
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
        if(this.loop) clearTimeout(this.loop); 
        if(this.inputReq) cancelAnimationFrame(this.inputReq);

        this.c = document.getElementById('canvas-pelzacz'); 
        this.ctx = this.c.getContext('2d'); 
        
        // Zwiększamy rozdzielczość płótna do 650x650
        this.c.width = 650; 
        this.c.height = 650;
        
        // Wczytanie historii i High Score
        this.highScore = parseInt(localStorage.getItem('bigos_pelzacz_hi')) || 0;
        try {
            const saved = localStorage.getItem('bigos_pelzacz_scores');
            if (saved) this.lastScores = JSON.parse(saved);
        } catch(e) {}

        // --- NAPRAWA I POWIĘKSZENIE OKNA ---
        const win = document.getElementById('app-pelzacz');
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

        // Obsługa kliknięć z myszy / dotyku
        this.c.onmousedown = (e) => { 
            if (this.gameState !== 'PLAYING') { e.preventDefault(); this.handleMenuClick(e); }
        };
        this.c.addEventListener('touchstart', (e) => {
            if (this.gameState !== 'PLAYING') { e.preventDefault(); this.handleMenuClick(e); }
        }, {passive: false});
        
        this.gameState = 'MENU';
        this.active = true; 
        
        this.updateScoreUI(); 
        this.c.focus(); 
        
        this.inputLoop(); // Uruchamia błyskawiczne nasłuchiwanie klawiszy w tle
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
        // Pozycja początkowa dopasowana do nowej rozdzielczości 650x650
        // (13 kratek to równe 325px - sam środek planszy)
        this.snake = [{x: 325, y: 325}, {x: 300, y: 325}]; 
        this.dx = this.grid; 
        this.dy = 0; 
        this.turnQueue = []; 
        this.score = 0; 
        
        this.placeApple(); 
        this.updateScoreUI(); 
        
        if (typeof gryKeys !== 'undefined') {
            gryKeys['ArrowUp'] = false; gryKeys['ArrowDown'] = false;
            gryKeys['ArrowLeft'] = false; gryKeys['ArrowRight'] = false;
            gryKeys['Space'] = false;
        }
        
        this.gameState = 'PLAYING';
    },

    saveScore: function() {
        if (this.score === 0) return;
        this.lastScores.unshift({ date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(), score: this.score });
        if (this.lastScores.length > 8) this.lastScores.pop();
        localStorage.setItem('bigos_pelzacz_scores', JSON.stringify(this.lastScores));
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('bigos_pelzacz_hi', this.highScore);
        }
    },

    clearScores: function() {
        this.lastScores = [];
        localStorage.removeItem('bigos_pelzacz_scores');
        if (typeof apps !== 'undefined') apps.showToast('Historia', 'Wyzerowano tablicę wyników.', 'info');
    },

    updateScoreUI: function() {
        const el = document.getElementById('pelzacz-score');
        if (el) {
            el.innerText = `Wynik: ${this.score} | Najlepszy: ${this.highScore}`;
            // Użyto g-accent aby napis płynnie dostosował się do motywu systemu!
            el.className = 'font-bold mb-4 g-accent text-xl sm:text-3xl drop-shadow-md tracking-wider text-center';
        }
    },
    
    placeApple: function() { 
        let valid = false;
        let attempts = 0;
        // Na planszy 650x650 mamy 26 kolumn/wierszy (indeksy 0-25)
        while(!valid && attempts < 200) {
            this.apple = { 
                x: Math.floor(Math.random()*(this.c.width/this.grid))*this.grid, 
                y: Math.floor(Math.random()*(this.c.height/this.grid))*this.grid 
            };
            valid = !this.snake.some(s => s.x === this.apple.x && s.y === this.apple.y);
            attempts++;
        }
    },
    
    inputLoop: function() {
        if(!this.active) return;
        
        if (this.gameState === 'PLAYING') {
            let lastIntent = this.turnQueue.length > 0 ? this.turnQueue[this.turnQueue.length - 1] : {dx: this.dx, dy: this.dy};

            if(typeof gryKeys !== 'undefined') {
                // Zapobiegamy skrętowi o 180 stopni
                if(gryKeys['ArrowLeft'] && lastIntent.dx === 0) { 
                    this.turnQueue.push({dx: -this.grid, dy: 0}); 
                    gryKeys['ArrowLeft'] = false; 
                } 
                else if(gryKeys['ArrowUp'] && lastIntent.dy === 0) { 
                    this.turnQueue.push({dx: 0, dy: -this.grid}); 
                    gryKeys['ArrowUp'] = false; 
                } 
                else if(gryKeys['ArrowRight'] && lastIntent.dx === 0) { 
                    this.turnQueue.push({dx: this.grid, dy: 0}); 
                    gryKeys['ArrowRight'] = false; 
                } 
                else if(gryKeys['ArrowDown'] && lastIntent.dy === 0) { 
                    this.turnQueue.push({dx: 0, dy: this.grid}); 
                    gryKeys['ArrowDown'] = false; 
                }
            }
        }

        this.inputReq = requestAnimationFrame(() => this.inputLoop());
    },
    
    update: function() {
        if(!this.active) return;
        
        this.updateColors();
        
        if (this.gameState === 'MENU') {
            this.drawMenu();
            this.loop = setTimeout(() => this.update(), 100); 
        } else if (this.gameState === 'SCORES') {
            this.drawScores();
            this.loop = setTimeout(() => this.update(), 100); 
        } else if (this.gameState === 'PLAYING') {
            this.updatePlaying();
            // Prędkość kontrolowana przez zmienną speed wewnątrz updatePlaying
        }
    },

    drawMenu: function() {
        this.ctx.fillStyle = this.theme.bg; 
        this.ctx.fillRect(0, 0, this.c.width, this.c.height); 

        // Tytuł
        this.ctx.fillStyle = this.theme.primary;
        this.ctx.font = "bold 80px Arial"; this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle";
        this.ctx.fillText("PEŁZACZ", this.c.width/2, 120);
        
        this.ctx.font = "30px Arial"; 
        this.ctx.fillStyle = this.theme.text;
        this.ctx.fillText("Nakarm Głodnego Węża!", this.c.width/2, 190);
        
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
            this.ctx.fillText("Zjedz jabłka, ale uważaj na swój ogon!", this.c.width/2, 550);
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
        if (this.turnQueue.length > 0) {
            let turn = this.turnQueue.shift();
            this.dx = turn.dx;
            this.dy = turn.dy;
        }
        
        const head = {x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy};
        
        const hitWall = head.x < 0 || head.x >= this.c.width || head.y < 0 || head.y >= this.c.height;
        const hitSelf = this.snake.some(s => s.x === head.x && s.y === head.y);
        
        if(hitWall || hitSelf) { 
            this.active = false; 
            if(typeof playSnd !== 'undefined') playSnd('die'); 
            if(typeof apps !== 'undefined') apps.showToast('Koniec Gry', hitWall ? 'Uderzenie w ścianę!' : 'Wąż ugryzł sam siebie!', 'error'); 
            
            this.saveScore();
            setTimeout(() => { this.gameState = 'SCORES'; this.active = true; this.update(); }, 2000);
            return; 
        }
        
        this.snake.unshift(head); 
        
        if(head.x === this.apple.x && head.y === this.apple.y) { 
            this.score += 1; 
            if(typeof playSnd !== 'undefined') playSnd('eat'); 
            this.updateScoreUI(); 
            this.placeApple(); 
        } else {
            this.snake.pop(); 
        }
        
        // Rysowanie gry na podstawie wybranego motywu
        this.ctx.fillStyle = this.theme.bg; 
        this.ctx.fillRect(0,0,this.c.width,this.c.height); 
        
        this.drawBorder();
        
        // Zwiększony rozmiar czcionki (ikon) proporcjonalnie do nowej siatki grid = 25px
        this.ctx.font = "24px Arial"; this.ctx.textAlign = "left"; this.ctx.textBaseline = "top";
        
        drawSprite(this.ctx, gameAssets.apple, this.apple.x, this.apple.y, this.grid, this.grid, () => {
            this.ctx.fillText('🍎', this.apple.x, this.apple.y); 
        });
        
        this.snake.forEach((s, i) => { 
            if (i === 0) {
                drawSprite(this.ctx, gameAssets.snake_head, s.x, s.y, this.grid, this.grid, () => { this.ctx.fillText('🐸', s.x, s.y); });
            } else {
                drawSprite(this.ctx, gameAssets.snake_body, s.x, s.y, this.grid, this.grid, () => { this.ctx.fillText('🟩', s.x, s.y); });
            }
        });
        
        let speed = 400 - (this.score * 6);
        if(speed < 80) speed = 80;
        
        this.loop = setTimeout(() => this.update(), speed); 
    },

    stop: function() { 
        this.active = false; 
        if(this.loop) clearTimeout(this.loop); 
        if(this.inputReq) cancelAnimationFrame(this.inputReq);
    }
};