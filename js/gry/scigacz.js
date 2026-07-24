// ======================================================================
// PLIK: js/gry/scigacz.js (Wysoka Rozdzielczość + Motywy + Menu)
// ======================================================================

games.scigacz = {
    c: null, ctx: null, loop: null, active: false, 
    carX: 290, obs: [], score: 0, speed: 5.0, frame: 0,
    
    theme: {},
    gameState: 'MENU', // Dostępne stany: MENU, PLAYING, SCORES
    lastScores: [],
    assets: {}, assetsLoaded: false,

    initAssets: function() {
        if(this.assetsLoaded) return;
        this.assets.car = new Image();
        this.assets.car.src = 'games/img/car.webp';
        this.assets.obs = new Image();
        this.assets.obs.src = 'games/img/obs.webp';
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

        // KRYTYCZNA NAPRAWA: Moduł gry.js ładuje uniwersalne kontrolki z opóźnieniem. 
        // Agresywnie czyścimy śmieciowe przyciski przez 3 sekundy od startu, zostawiając tylko dedykowane.
        let clearAttempts = 0;
        const clearJunk = setInterval(() => {
            const junk = parent.querySelectorAll('.mobile-dpad, .mobile-dpad-pong, .game-fs-btn:not(.scigacz-fs), .pc-start-btn:not(.scigacz-start)');
            junk.forEach(j => j.remove());
            clearAttempts++;
            if (clearAttempts > 10) clearInterval(clearJunk);
        }, 300);

        const existingControls = parent.querySelectorAll('.scigacz-controls-container, .mobile-dpad-scigacz');
        existingControls.forEach(el => el.remove());

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'scigacz-controls-container flex flex-col items-center mt-2 shrink-0 w-full z-10 relative';
        
        const win = this.c.closest('.window');
        const fsBtn = document.createElement('button');
        
        // Zastosowanie systemowych kolorów bezpośrednio pod zmienne CSS z theme.js
        fsBtn.className = 'scigacz-fs hidden md:block w-full max-w-[320px] self-center my-2 px-4 py-2 rounded-lg font-bold shadow-md transition hover:scale-105 text-[13px]';
        fsBtn.style.backgroundColor = 'var(--primary)';
        fsBtn.style.color = '#000';
        fsBtn.style.border = '2px solid var(--border)';
        fsBtn.innerHTML = 'Powiększ Okno Gry / Zmniejsz';
        fsBtn.onclick = () => { if(win && typeof winManager !== 'undefined') winManager.maximize(win.id); };
        
        if(!document.getElementById('scigacz-styles')) {
            const style = document.createElement('style');
            style.id = 'scigacz-styles';
            style.innerHTML = `
                .mobile-dpad-scigacz { display: none !important; }
                @media (max-width: 768px) {
                    /* Ukrywamy przycisk powiększenia ekranu na smartfonach */
                    .scigacz-fs { display: none !important; }
                    
                    .window.active:not(.minimized) .mobile-dpad-scigacz { 
                        display: flex !important; flex-direction: column; gap: 12px; 
                        padding: 10px 20px; width: 100%; max-width: 450px; margin: auto auto 10px auto; flex-shrink: 0;
                    }
                    .scigacz-dpad-row { display: flex; justify-content: space-between; gap: 15px; width: 100%; }
                    .scigacz-dir-btn { 
                        flex: 1; height: 80px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; 
                        background: var(--panel); color: var(--text); border: 2px solid var(--border); box-shadow: 0 6px 10px rgba(0,0,0,0.4); 
                        user-select: none; touch-action: manipulation; cursor: pointer; transition: transform 0.1s;
                    }
                    .scigacz-dir-btn .icon { font-size: 32px; line-height: 1; margin-bottom: 4px; }
                    .scigacz-dir-btn span.lbl { font-size: 12px; font-weight: bold; color: var(--text-muted); }
                    .scigacz-dir-btn:active { transform: translateY(4px) scale(0.95); box-shadow: 0 2px 4px rgba(0,0,0,0.4); }
                    
                    /* Estetyczny wygląd przycisku MENU GRY na wzór Murarza */
                    .scigacz-menu-btn {
                        width: 100%; height: 60px; border-radius: 14px; display: flex; align-items: center; justify-content: center; gap: 10px;
                        background: var(--panel); color: var(--text); border: 2px solid var(--border); box-shadow: 0 6px 10px rgba(0,0,0,0.4);
                        user-select: none; touch-action: manipulation; cursor: pointer; transition: transform 0.1s;
                    }
                    .scigacz-menu-btn:active { transform: translateY(4px) scale(0.98); box-shadow: 0 2px 4px rgba(0,0,0,0.4); }
                    .scigacz-menu-btn .icon { font-size: 24px; }
                    .scigacz-menu-btn .lbl { font-size: 14px; font-weight: bold; color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; }
                }
            `;
            document.head.appendChild(style);
        }

        const dpad = document.createElement('div');
        dpad.className = 'mobile-dpad-scigacz';
        dpad.innerHTML = `
            <div class="scigacz-dpad-row">
                <div class="scigacz-dir-btn" data-key="ArrowLeft"><div class="icon">⬅️</div><span class="lbl">LEWO</span></div>
                <div class="scigacz-dir-btn" data-key="ArrowRight"><div class="icon">➡️</div><span class="lbl">PRAWO</span></div>
            </div>
            <div class="scigacz-menu-btn" data-menu="true">
                <div class="icon">🏠</div><span class="lbl">MENU GRY</span>
            </div>
        `;
        
        dpad.querySelectorAll('.scigacz-dir-btn, .scigacz-menu-btn').forEach(btn => {
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
            startBtn.classList.add('scigacz-start', 'shrink-0', 'hidden', 'sm:block'); 
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
        
        this.c = document.getElementById('canvas-scigacz'); 
        this.ctx = this.c.getContext('2d'); 
        
        // Zwiększamy rozdzielczość płótna do 650x650
        this.c.width = 650; 
        this.c.height = 650;

        this.initAssets();

        // Wczytanie historii wyników
        try {
            const saved = localStorage.getItem('bigos_scigacz_scores');
            if (saved) this.lastScores = JSON.parse(saved);
        } catch(e) {}

        // --- NAPRAWA I POWIĘKSZENIE OKNA ---
        const win = document.getElementById('app-scigacz');
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

        // Obsługa kliknięć z myszy / dotyku (Dla Menu i Wyników)
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
        this.carX = 290; // Wyśrodkowany (650/2 - szerokość samochodu 70/2 = ~290)
        this.obs = []; 
        this.score = 0; 
        this.speed = 5.0; // Szybszy start w wysokiej rozdzielczości
        this.frame = 0;
        
        this.updateScoreUI(); 
        
        if (typeof gryKeys !== 'undefined') {
            gryKeys['ArrowLeft'] = false; gryKeys['ArrowRight'] = false; gryKeys['Space'] = false;
        }
        
        this.gameState = 'PLAYING';
    },

    saveScore: function() {
        if (this.score === 0) return;
        this.lastScores.unshift({ date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(), score: this.score });
        if (this.lastScores.length > 8) this.lastScores.pop();
        localStorage.setItem('bigos_scigacz_scores', JSON.stringify(this.lastScores));
    },

    clearScores: function() {
        this.lastScores = [];
        localStorage.removeItem('bigos_scigacz_scores');
        if (typeof apps !== 'undefined') apps.showToast('Historia', 'Wyzerowano tablicę wyników.', 'info');
    },

    updateScoreUI: function() {
        const el = document.getElementById('scigacz-score');
        if (el) {
            el.innerText = `Dystans: ${this.score}`;
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
        this.ctx.fillText("ŚCIGACZ", this.c.width/2, 120);
        
        this.ctx.font = "30px Arial"; 
        this.ctx.fillStyle = this.theme.text;
        this.ctx.fillText("Omijaj przeszkody na drodze!", this.c.width/2, 190);
        
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
            this.ctx.fillText("Naciśnij spację lub kliknij ekran, by ruszyć", this.c.width/2, 550);
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
                this.ctx.fillText(`Dystans: ${s.score}`, 450, startY);
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
        // DYNAMICZNA PRĘDKOŚĆ SAMOCHODU (Zmniejszona dla lepszej kontroli i płynności)
        let carSpeed = window.innerWidth <= 768 ? 6 : 10;

        if(typeof gryKeys !== 'undefined') {
            if(gryKeys['ArrowLeft'] && this.carX > 20) this.carX -= carSpeed; 
            if(gryKeys['ArrowRight'] && this.carX < this.c.width - 90) this.carX += carSpeed;
        }

        // Generowanie przeszkód
        if(this.frame % Math.max(20, 60 - Math.floor(this.score/3)) === 0) { 
            this.obs.push({ 
                x: Math.random() * (this.c.width - 100) + 20, 
                y: -100, 
                type: ['🛻','🚓','🚕','🚧'][Math.floor(Math.random()*4)] 
            }); 
        } 
        this.frame++;
        
        let crashed = false;

        for(let i = this.obs.length - 1; i >= 0; i--) {
            let o = this.obs[i];
            o.y += this.speed; 
            
            // Kolizja - dopasowana do dużych wymiarów 70x90
            if(this.carX < o.x + 60 && this.carX + 60 > o.x && 520 < o.y + 60 && 610 > o.y) { 
                crashed = true; 
            } 
            
            // Punktacja - przeszkoda minęła ekran
            if(o.y > 650) { 
                this.obs.splice(i, 1); 
                this.score++; 
                this.updateScoreUI();
                if(this.score % 10 === 0) this.speed += 0.5; 
            } 
        }

        if (crashed) {
            this.active = false; 
            if(typeof playSnd !== 'undefined') playSnd('crash'); 
            if(typeof apps !== 'undefined') apps.showToast('Koniec', 'Wypadek drogowy!', 'error'); 
            
            this.saveScore();
            setTimeout(() => { this.gameState = 'SCORES'; this.active = true; }, 2000);
        }
    },

    drawPlaying: function() {
        // Tło szosy (Asfalt)
        this.ctx.fillStyle = '#374151'; 
        this.ctx.fillRect(0, 0, this.c.width, this.c.height);
        
        // Pasy na środku jezdni
        this.ctx.fillStyle = '#fff';
        for(let i=0; i<6; i++) { 
            this.ctx.fillRect(315, ((this.frame * this.speed) % 150) + (i*150) - 150, 20, 80); 
        }

        this.ctx.font = "70px Arial"; this.ctx.textBaseline = "top";
        
        const obsImg = (this.assets && this.assets.obs) || (typeof gameAssets !== 'undefined' && gameAssets.obs);
        const carImg = (this.assets && this.assets.car) || (typeof gameAssets !== 'undefined' && gameAssets.car);

        // Rysowanie przeszkód
        this.obs.forEach(o => { 
            if (typeof drawSprite !== 'undefined' && obsImg && obsImg.complete && obsImg.naturalWidth > 0) {
                drawSprite(this.ctx, obsImg, o.x, o.y, 70, 70, () => { this.ctx.fillText(o.type, o.x, o.y); });
            } else {
                this.ctx.fillText(o.type, o.x, o.y);
            }
        });
        
        // Rysowanie gracza (auto na dole ekranu)
        if (typeof drawSprite !== 'undefined' && carImg && carImg.complete && carImg.naturalWidth > 0) {
            drawSprite(this.ctx, carImg, this.carX, 520, 70, 90, () => { this.ctx.fillText('🚘', this.carX, 520); });
        } else {
            this.ctx.fillText('🚘', this.carX, 520);
        }
        
        this.drawBorder();
    },

    stop: function() { this.active = false; if(this.loop) cancelAnimationFrame(this.loop); }
};