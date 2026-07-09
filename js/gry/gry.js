// ======================================================================
// PLIK: js/gry.js (Silnik Minigier dla BigOS z Lazy Loadingiem)
// ======================================================================

// ---------------------------------------------------------
// WŁASNY SYSTEM ŚLEDZENIA KLAWISZY
// ---------------------------------------------------------
const gryKeys = {};
window.addEventListener('keydown', (e) => { 
    gryKeys[e.code] = true; 
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
        if(Object.values(games).some(g => g && g.active)) e.preventDefault();
    }
}, {passive: false});
window.addEventListener('keyup', (e) => { gryKeys[e.code] = false; });

// ---------------------------------------------------------
// SYSTEM LAZY LOADINGU WŁASNYCH GRAFIK Z FOLDERU
// ---------------------------------------------------------
// Przechowujemy tylko ścieżki tekstowe. Pliki pobiorą się dopiero po otwarciu danej gry!
const gameAssetsConfig = {
    apple: 'games/img/apple.png', 
    snake_head: 'games/img/snake_head.png', 
    snake_body: 'games/img/snake_body.png',
    paddle: 'games/img/paddle.png', 
    ball: 'games/img/ball.png', 
    brick: 'games/img/brick.png',
    ship: 'games/img/ship.png', 
    alien: 'games/img/alien.png', 
    bullet: 'games/img/bullet.png',
    car: 'games/img/car.png', 
    obs: 'games/img/obs.png',
    bird: 'games/img/bird.png', 
    pipe: 'games/img/pipe.png',
    bomber: 'games/img/bomber.png', 
    bomb: 'games/img/bomb.png', 
    box: 'games/img/box.png'
};

const gameAssets = {};
let sharedAssetsLoaded = false;

const loadSharedAssets = () => {
    if (sharedAssetsLoaded) return;
    Object.keys(gameAssetsConfig).forEach(key => {
        gameAssets[key] = new Image();
        gameAssets[key].src = gameAssetsConfig[key];
    });
    sharedAssetsLoaded = true;
};

const drawSprite = (ctx, img, x, y, w, h, fallbackFn) => {
    if (img && img.complete && img.naturalWidth > 0) ctx.drawImage(img, x, y, w, h);
    else fallbackFn(); 
};

// ---------------------------------------------------------
// SYSTEM DŹWIĘKOWY (Lazy Loading Dźwięków na żądanie)
// ---------------------------------------------------------
const gameSoundsConfig = {
    eat: 'games/sound/eat.mp3',
    die: 'games/sound/die.mp3',
    bounce: 'games/sound/bounce.mp3',
    break: 'games/sound/break.mp3',
    win: 'games/sound/win.mp3',
    shoot: 'games/sound/shoot.mp3',
    invader: 'games/sound/invader.mp3',
    pong: 'games/sound/pong.mp3',
    score: 'games/sound/score.mp3',
    flap: 'games/sound/flap.mp3',
    hit: 'games/sound/hit.mp3',
    crash: 'games/sound/crash.mp3',
    drop: 'games/sound/drop.mp3',
    explosion: 'games/sound/explosion.mp3'
};

const gameSounds = {};
let activeSounds = []; 

const stopAllSounds = () => {
    activeSounds.forEach(s => {
        try { s.pause(); s.currentTime = 0; } catch(e) {}
    });
    activeSounds = [];
};

const playSnd = (id) => {
    if (!gameSoundsConfig[id]) return;
    
    // Pobiera dany plik mp3 DOPIERO za pierwszym razem, gdy ma zostać odtworzony
    if (!gameSounds[id]) {
        gameSounds[id] = new Audio(gameSoundsConfig[id]);
    }
    
    const snd = gameSounds[id].cloneNode(); 
    snd.volume = 0.6;
    snd.play().catch(e => {});
    activeSounds.push(snd);
    
    snd.onended = () => {
        const idx = activeSounds.indexOf(snd);
        if(idx > -1) activeSounds.splice(idx, 1);
    };
};

const games = {
    // ---------------------------------------------------------
    // 1. PEŁZACZ (SNAKE)
    // ---------------------------------------------------------
    pelzacz: {
        c: null, ctx: null, loop: null, active: false, grid: 20, snake: [], apple: {}, dx: 20, dy: 0, score: 0,
        init: function() { 
            stopAllSounds(); 
            loadSharedAssets(); // LAZY LOAD: ładuje sprite'y dopieru tu
            if(this.loop) clearTimeout(this.loop); 
            this.c = document.getElementById('canvas-pelzacz'); this.ctx = this.c.getContext('2d'); 
            this.snake = [{x: 140, y: 140}, {x: 120, y: 140}]; this.dx = this.grid; this.dy = 0; this.score = 0; this.active = true; 
            this.placeApple(); document.getElementById('pelzacz-score').innerText = 'Wynik: 0'; 
            this.c.focus(); this.update(); 
        },
        placeApple: function() { 
            this.apple = { x: Math.floor(Math.random()*(this.c.width/this.grid))*this.grid, y: Math.floor(Math.random()*(this.c.height/this.grid))*this.grid }; 
        },
        update: function() {
            if(!this.active) return;
            if(gryKeys['ArrowLeft'] && this.dx === 0) { this.dx = -this.grid; this.dy = 0; } 
            else if(gryKeys['ArrowUp'] && this.dy === 0) { this.dy = -this.grid; this.dx = 0; } 
            else if(gryKeys['ArrowRight'] && this.dx === 0) { this.dx = this.grid; this.dy = 0; } 
            else if(gryKeys['ArrowDown'] && this.dy === 0) { this.dy = this.grid; this.dx = 0; }
            
            const head = {x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy};
            if(head.x < 0 || head.x >= this.c.width || head.y < 0 || head.y >= this.c.height || this.snake.some(s => s.x === head.x && s.y === head.y)) { 
                this.active = false; playSnd('die'); if(typeof apps !== 'undefined') apps.showToast('Koniec Gry', 'Pełzacz uderzył w ścianę!', 'error'); return; 
            }
            
            this.snake.unshift(head); 
            if(head.x === this.apple.x && head.y === this.apple.y) { 
                this.score+=10; playSnd('eat'); document.getElementById('pelzacz-score').innerText = 'Wynik: '+this.score; this.placeApple(); 
            } else this.snake.pop();
            
            this.ctx.fillStyle = '#111827'; this.ctx.fillRect(0,0,this.c.width,this.c.height); 
            this.ctx.font = "18px Arial"; this.ctx.textAlign = "left"; this.ctx.textBaseline = "top";
            
            drawSprite(this.ctx, gameAssets.apple, this.apple.x, this.apple.y, this.grid, this.grid, () => {
                this.ctx.fillText('🍎', this.apple.x, this.apple.y + 2); 
            });
            
            this.snake.forEach((s, i) => { 
                if (i === 0) {
                    drawSprite(this.ctx, gameAssets.snake_head, s.x, s.y, this.grid, this.grid, () => { this.ctx.fillText('🐸', s.x, s.y + 2); });
                } else {
                    drawSprite(this.ctx, gameAssets.snake_body, s.x, s.y, this.grid, this.grid, () => { this.ctx.fillText('🟩', s.x, s.y + 2); });
                }
            });
            
            this.loop = setTimeout(() => this.update(), 120 - Math.min(this.score, 80)); 
        },
        stop: function() { this.active = false; if(this.loop) clearTimeout(this.loop); }
    },

    // ---------------------------------------------------------
    // 2. MURARZ (BREAKOUT)
    // ---------------------------------------------------------
    murarz: {
        c: null, ctx: null, loop: null, active: false, paddle: {}, ball: {}, bricks: [], score: 0,
        init: function() {
            stopAllSounds();
            loadSharedAssets();
            if(this.loop) cancelAnimationFrame(this.loop); 
            this.c = document.getElementById('canvas-murarz'); this.ctx = this.c.getContext('2d'); 
            this.paddle = { x: 160, y: 280, w: 80, h: 10 }; 
            this.ball = { x: 200, y: 260, dx: 2.5, dy: -2.5, r: 8 }; 
            this.bricks = []; this.score = 0; this.active = true;
            
            for(let c=0; c<8; c++) {
                for(let r=0; r<5; r++) { 
                    this.bricks.push({ 
                        x: c*48+10, 
                        y: r*25+50, 
                        w: 44, 
                        h: 18, 
                        status: 1, 
                        type: ['🧱','🧊','📦'][Math.floor(Math.random()*3)] 
                    }); 
                }
            }
            
            document.getElementById('murarz-score').innerText = 'Klocki: 0';
            this.c.onmousemove = (e) => { 
                const r = this.c.getBoundingClientRect(); 
                const scaleX = this.c.width / r.width;
                let newX = (e.clientX - r.left) * scaleX - this.paddle.w/2; 
                this.paddle.x = Math.max(0, Math.min(this.c.width - this.paddle.w, newX)); 
            };
            this.c.addEventListener('touchmove', (e) => { 
                const r = this.c.getBoundingClientRect(); 
                const scaleX = this.c.width / r.width;
                let newX = (e.touches[0].clientX - r.left) * scaleX - this.paddle.w/2; 
                this.paddle.x = Math.max(0, Math.min(this.c.width - this.paddle.w, newX)); 
            }, {passive: false});
            this.update();
        },
        update: function() {
            if(!this.active) return; this.ctx.clearRect(0,0,this.c.width,this.c.height); 
            
            if(gryKeys['ArrowLeft'] && this.paddle.x > 0) this.paddle.x -= 5;
            if(gryKeys['ArrowRight'] && this.paddle.x < this.c.width - this.paddle.w) this.paddle.x += 5;

            this.ball.x += this.ball.dx; this.ball.y += this.ball.dy;
            
            if(this.ball.x + this.ball.dx > this.c.width - this.ball.r || this.ball.x + this.ball.dx < this.ball.r) { this.ball.dx = -this.ball.dx; playSnd('bounce'); }
            if(this.ball.y + this.ball.dy < this.ball.r) { this.ball.dy = -this.ball.dy; playSnd('bounce'); }
            else if(this.ball.y + this.ball.dy > this.c.height - this.ball.r) { 
                if(this.ball.x > this.paddle.x && this.ball.x < this.paddle.x + this.paddle.w) {
                    this.ball.dy = -this.ball.dy;
                    this.ball.dx = ((this.ball.x - (this.paddle.x + this.paddle.w/2)) / (this.paddle.w/2)) * 3;
                    playSnd('bounce');
                } else { 
                    this.active = false; playSnd('die'); if(typeof apps !== 'undefined') apps.showToast('Koniec Gry', 'Piłka spadła!', 'error'); return; 
                } 
            }
            
            this.ctx.font = "20px Arial"; this.ctx.textBaseline = "top";
            this.bricks.forEach(b => { 
                if(b.status === 1) { 
                    if(this.ball.x > b.x && this.ball.x < b.x+b.w && this.ball.y > b.y && this.ball.y < b.y+b.h) { 
                        this.ball.dy = -this.ball.dy; b.status = 0; this.score++; playSnd('break'); document.getElementById('murarz-score').innerText = 'Klocki: '+this.score; 
                    } 
                    drawSprite(this.ctx, gameAssets.brick, b.x, b.y, b.w, b.h, () => {
                        this.ctx.fillText(b.type, b.x + 10, b.y - 2); 
                    });
                } 
            });
            
            drawSprite(this.ctx, gameAssets.paddle, this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h, () => {
                this.ctx.fillStyle = '#3b82f6'; this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h); 
            });
            drawSprite(this.ctx, gameAssets.ball, this.ball.x - 10, this.ball.y - 10, 20, 20, () => {
                this.ctx.fillText('⚽', this.ball.x - 10, this.ball.y - 10);
            });
            
            if(this.score === 40) { this.active = false; playSnd('win'); if(typeof apps !== 'undefined') apps.showToast('Wygrana', 'Rozbiłeś wszystko!', 'success'); return; } 
            this.loop = requestAnimationFrame(() => this.update());
        },
        stop: function() { this.active = false; if(this.loop) cancelAnimationFrame(this.loop); }
    },

    // ---------------------------------------------------------
    // 3. UFOLUDKI (SPACE INVADERS)
    // ---------------------------------------------------------
    ufoludki: {
        c: null, ctx: null, loop: null, active: false, ship: {}, bullets: [], aliens: [], score: 0, lastShot: 0,
        init: function() {
            stopAllSounds();
            loadSharedAssets();
            if(this.loop) cancelAnimationFrame(this.loop); 
            this.c = document.getElementById('canvas-ufoludki'); this.ctx = this.c.getContext('2d'); 
            this.ship = { x: 180, y: 350, w: 40, h: 40 }; this.bullets = []; this.aliens = []; this.score = 0; this.active = true;
            for(let r=0; r<4; r++) for(let c=0; c<8; c++) this.aliens.push({x: c*45+20, y: r*35+20, w:30, h:30, alive: true}); 
            document.getElementById('ufoludki-score').innerText = 'Punkty: 0'; this.lastShot = 0; this.update();
        },
        update: function() {
            if(!this.active) return; this.ctx.clearRect(0,0,this.c.width,this.c.height);
            
            if(gryKeys['ArrowLeft'] && this.ship.x > 0) this.ship.x -= 3; 
            if(gryKeys['ArrowRight'] && this.ship.x < this.c.width - this.ship.w) this.ship.x += 3;
            if(gryKeys['Space'] && Date.now() - this.lastShot > 300) { 
                this.bullets.push({x: this.ship.x + 16, y: this.ship.y, w:8, h:15}); this.lastShot = Date.now(); playSnd('shoot');
            }
            
            this.ctx.font = "30px Arial"; this.ctx.textBaseline = "top";
            
            drawSprite(this.ctx, gameAssets.ship, this.ship.x, this.ship.y, this.ship.w, this.ship.h, () => {
                this.ctx.fillText('🚀', this.ship.x, this.ship.y); 
            });
            
            this.bullets.forEach((b, i) => { 
                b.y -= 5; 
                drawSprite(this.ctx, gameAssets.bullet, b.x, b.y, b.w, b.h, () => {
                    this.ctx.fillStyle = '#fbbf24'; this.ctx.fillRect(b.x, b.y, b.w, b.h); 
                });
                if(b.y < 0) this.bullets.splice(i, 1); 
                else { 
                    this.aliens.forEach(a => { 
                        if(a.alive && b.x > a.x && b.x < a.x+a.w && b.y > a.y && b.y < a.y+a.h) { 
                            a.alive = false; this.bullets.splice(i, 1); this.score+=10; playSnd('invader'); document.getElementById('ufoludki-score').innerText = 'Punkty: '+this.score;
                        } 
                    }); 
                } 
            });
            
            let allDead = true; 
            let isGameOver = false;
            
            this.aliens.forEach(a => { 
                if(a.alive) { 
                    allDead = false; a.y += 0.15; 
                    drawSprite(this.ctx, gameAssets.alien, a.x, a.y, a.w, a.h, () => { this.ctx.fillText('👾', a.x, a.y); });
                    if(a.y > 330 && !isGameOver) { 
                        isGameOver = true; this.active = false; playSnd('die'); 
                        if(typeof apps !== 'undefined') apps.showToast('Koniec', 'Ufoludki wylądowały!', 'error'); 
                    } 
                } 
            });
            
            if(isGameOver) return; 
            if(allDead) { this.active = false; playSnd('win'); if(typeof apps !== 'undefined') apps.showToast('Wygrana', 'Ocaliłeś BigOS!', 'success'); return; } 
            if(this.active) this.loop = requestAnimationFrame(() => this.update());
        },
        stop: function() { this.active = false; if(this.loop) cancelAnimationFrame(this.loop); }
    },

    // ---------------------------------------------------------
    // 4. ODBIJANKA (PONG)
    // ---------------------------------------------------------
    odbijanka: {
        c: null, ctx: null, loop: null, active: false, p1: {}, p2: {}, ball: {}, score1: 0, score2: 0,
        init: function() {
            stopAllSounds();
            loadSharedAssets();
            if(this.loop) cancelAnimationFrame(this.loop); 
            this.c = document.getElementById('canvas-odbijanka'); this.ctx = this.c.getContext('2d'); 
            this.p1 = { y: 120 }; this.p2 = { y: 120 }; this.ball = { x: 200, y: 150, dx: 3, dy: 3 }; this.score1 = 0; this.score2 = 0; this.active = true;
            this.c.onmousemove = (e) => { 
                const r = this.c.getBoundingClientRect(); 
                const scaleY = this.c.height / r.height;
                let newY = (e.clientY - r.top) * scaleY - 30; 
                this.p1.y = Math.max(0, Math.min(this.c.height - 60, newY)); 
            };
            this.c.addEventListener('touchmove', (e) => { 
                const r = this.c.getBoundingClientRect(); 
                const scaleY = this.c.height / r.height;
                let newY = (e.touches[0].clientY - r.top) * scaleY - 30; 
                this.p1.y = Math.max(0, Math.min(this.c.height - 60, newY)); 
            }, {passive: false});
            this.updateScore(); this.update();
        },
        updateScore: function() { document.getElementById('odbijanka-score').innerText = `Ty: ${this.score1} | Komputer: ${this.score2}`; },
        update: function() {
            if(!this.active) return; this.ctx.fillStyle = '#111'; this.ctx.fillRect(0,0,this.c.width,this.c.height); 
            
            if(gryKeys['ArrowUp'] && this.p1.y > 0) this.p1.y -= 5;
            if(gryKeys['ArrowDown'] && this.p1.y < this.c.height - 60) this.p1.y += 5;

            this.ball.x += this.ball.dx; this.ball.y += this.ball.dy;
            
            if(this.ball.y < 10 || this.ball.y > 290) { this.ball.dy = -this.ball.dy; playSnd('pong'); }
            if(this.p2.y + 30 < this.ball.y) this.p2.y += 2.5; else this.p2.y -= 2.5;
            
            this.p2.y = Math.max(0, Math.min(this.c.height - 60, this.p2.y));
            
            if(this.ball.x < 25 && this.ball.y > this.p1.y && this.ball.y < this.p1.y + 60) { this.ball.dx = -this.ball.dx; this.ball.x = 25; playSnd('pong'); } 
            if(this.ball.x > 375 && this.ball.y > this.p2.y && this.ball.y < this.p2.y + 60) { this.ball.dx = -this.ball.dx; this.ball.x = 375; playSnd('pong'); }
            
            if(this.ball.x < 0) { this.score2++; this.ball.x = 200; this.ball.dx = 3; playSnd('score'); this.updateScore(); } 
            if(this.ball.x > 400) { this.score1++; this.ball.x = 200; this.ball.dx = -3; playSnd('score'); this.updateScore(); }
            
            drawSprite(this.ctx, gameAssets.paddle, 10, this.p1.y, 10, 60, () => { this.ctx.fillStyle = '#3b82f6'; this.ctx.fillRect(10, this.p1.y, 10, 60); });
            drawSprite(this.ctx, gameAssets.paddle, 380, this.p2.y, 10, 60, () => { this.ctx.fillStyle = '#ef4444'; this.ctx.fillRect(380, this.p2.y, 10, 60); });
            
            this.ctx.font = "20px Arial"; 
            drawSprite(this.ctx, gameAssets.ball, this.ball.x - 10, this.ball.y - 10, 20, 20, () => { this.ctx.fillText('🎾', this.ball.x - 10, this.ball.y - 10); });
            
            this.loop = requestAnimationFrame(() => this.update());
        },
        stop: function() { this.active = false; if(this.loop) cancelAnimationFrame(this.loop); }
    },

    // ---------------------------------------------------------
    // 5. TRZEPOTEK (FLAPPY BIRD)
    // ---------------------------------------------------------
    trzepotek: {
        c: null, ctx: null, loop: null, active: false, birdY: 200, velocity: 0, pipes: [], score: 0, frame: 0,
        init: function() {
            stopAllSounds();
            loadSharedAssets();
            if(this.loop) cancelAnimationFrame(this.loop); 
            this.c = document.getElementById('canvas-trzepotek'); this.ctx = this.c.getContext('2d'); 
            this.birdY = 200; this.velocity = 0; this.pipes = []; this.score = 0; this.frame = 0; this.active = true; 
            document.getElementById('trzepotek-score').innerText = 'Punkty: 0';
            
            this.c.onmousedown = (e) => { e.preventDefault(); this.doAction(); };
            this.c.ontouchstart = (e) => { e.preventDefault(); this.doAction(); };
            
            this.update();
        },
        doAction: function() {
            if(!this.active) return;
            this.velocity = -5.5;
            playSnd('flap');
            gryKeys['Space'] = false; 
        },
        update: function() {
            if(!this.active) return; 
            if(gryKeys['Space']) { this.doAction(); } 
            
            this.ctx.clearRect(0,0,this.c.width,this.c.height);
            this.velocity += 0.25;
            this.birdY += this.velocity;
            
            if(this.frame % 100 === 0) { const gapY = Math.random() * 150 + 60; this.pipes.push({ x: 300, w: 50, top: gapY, bottom: gapY + 140 }); } 
            this.frame++;
            
            this.ctx.fillStyle = '#22c55e';
            this.pipes.forEach((p, i) => {
                p.x -= 2; 
                drawSprite(this.ctx, gameAssets.pipe, p.x, 0, p.w, p.top, () => { this.ctx.fillRect(p.x, 0, p.w, p.top); this.ctx.strokeRect(p.x, 0, p.w, p.top); });
                drawSprite(this.ctx, gameAssets.pipe, p.x, p.bottom, p.w, 400 - p.bottom, () => { this.ctx.fillRect(p.x, p.bottom, p.w, 400 - p.bottom); this.ctx.strokeRect(p.x, p.bottom, p.w, 400 - p.bottom); });
                
                if(p.x === 44) { this.score++; playSnd('score'); document.getElementById('trzepotek-score').innerText = 'Punkty: '+this.score; }
                if(44 < p.x + p.w && 44 + 25 > p.x && (this.birdY < p.top || this.birdY + 20 > p.bottom)) { 
                    this.active = false; playSnd('hit'); if(typeof apps !== 'undefined') apps.showToast('Koniec', 'Trzepotek uderzył w rurę!', 'error'); 
                }
                if(p.x < -60) this.pipes.splice(i, 1);
            });
            
            if(this.birdY > 380 || this.birdY < -20) { this.active = false; playSnd('hit'); if(typeof apps !== 'undefined') apps.showToast('Koniec', 'Zderzenie z ziemią!', 'error'); }
            
            this.ctx.font = "30px Arial"; this.ctx.textBaseline = "top";
            drawSprite(this.ctx, gameAssets.bird, 45, this.birdY, 30, 30, () => { this.ctx.fillText('🦇', 45, this.birdY); });
            
            if(this.active) this.loop = requestAnimationFrame(() => this.update());
        },
        stop: function() { this.active = false; if(this.loop) cancelAnimationFrame(this.loop); }
    },

    // ---------------------------------------------------------
    // 6. ŚCIGACZ (WYŚCIGI)
    // ---------------------------------------------------------
    scigacz: {
        c: null, ctx: null, loop: null, active: false, carX: 130, obs: [], score: 0, speed: 2.5, frame: 0,
        init: function() {
            stopAllSounds();
            loadSharedAssets();
            if(this.loop) cancelAnimationFrame(this.loop); 
            this.c = document.getElementById('canvas-scigacz'); this.ctx = this.c.getContext('2d'); 
            this.carX = 130; this.obs = []; this.score = 0; this.speed = 2.5; this.frame = 0; this.active = true; 
            document.getElementById('scigacz-score').innerText = 'Dystans: 0'; this.update();
        },
        update: function() {
            if(!this.active) return; this.ctx.clearRect(0,0,this.c.width,this.c.height);
            
            this.ctx.fillStyle = '#374151'; this.ctx.fillRect(0,0,this.c.width,this.c.height);
            this.ctx.fillStyle = '#fff';
            for(let i=0; i<5; i++) { this.ctx.fillRect(145, ((this.frame * this.speed) % 100) + (i*100) - 100, 10, 50); }

            if(gryKeys['ArrowLeft'] && this.carX > 10) this.carX -= 4; 
            if(gryKeys['ArrowRight'] && this.carX < 250) this.carX += 4;
            
            if(this.frame % Math.max(30, 80 - Math.floor(this.score/2)) === 0) { 
                this.obs.push({ x: Math.random() * 250, y: -50, type: ['🛻','🚓','🚕','🚧'][Math.floor(Math.random()*4)] }); 
            } 
            this.frame++;
            
            this.ctx.font = "40px Arial"; this.ctx.textBaseline = "top";
            this.obs.forEach((o, i) => { 
                o.y += this.speed; 
                drawSprite(this.ctx, gameAssets.obs, o.x, o.y, 40, 40, () => { this.ctx.fillText(o.type, o.x, o.y); });
                
                if(this.carX < o.x + 35 && this.carX + 35 > o.x && 340 < o.y + 35 && 380 > o.y) { 
                    this.active = false; playSnd('crash'); if(typeof apps !== 'undefined') apps.showToast('Koniec', 'Wypadek drogowy!', 'error'); 
                } 
                if(o.y > 420) { 
                    this.obs.splice(i, 1); this.score++; document.getElementById('scigacz-score').innerText = 'Dystans: '+this.score; 
                    if(this.score%10===0) this.speed+=0.2; 
                } 
            });
            
            drawSprite(this.ctx, gameAssets.car, this.carX, 340, 40, 50, () => { this.ctx.fillText('🚘', this.carX, 340); });
            
            if(this.active) this.loop = requestAnimationFrame(() => this.update());
        },
        stop: function() { this.active = false; if(this.loop) cancelAnimationFrame(this.loop); }
    },

    // ---------------------------------------------------------
    // 8. KÓŁKO I KRZYŻYK
    // ---------------------------------------------------------
    kolko: {
        ticB: ['','','','','','','','',''], ticP: '❌', ticA: true,
        init: () => { 
            stopAllSounds();
            games.kolko.ticB=['','','','','','','','','']; games.kolko.ticP='❌'; games.kolko.ticA=true; 
            document.getElementById('tic-status').innerText='Tura: ❌'; 
            const c=document.getElementById('tic-board'); c.innerHTML=''; 
            for(let i=0;i<9;i++){ 
                const cell=document.createElement('div'); 
                cell.className='w-16 h-16 bg-white dark:bg-[#1a1a1a] flex items-center justify-center text-4xl shadow-sm cursor-pointer rounded-xl transition hover:bg-gray-100 dark:hover:bg-[#333] border border-gray-300 dark:border-gray-600'; 
                cell.onclick=()=>games.kolko.play(i, cell); 
                c.appendChild(cell); 
            } 
        },
        play: (i, cell) => { 
            if(!games.kolko.ticA || games.kolko.ticB[i]!=='') return; 
            games.kolko.ticB[i]=games.kolko.ticP; 
            cell.innerText=games.kolko.ticP; 
            playSnd('drop');
            
            if(games.kolko.chk()){ 
                document.getElementById('tic-status').innerText=`🏆 Wygrywa: ${games.kolko.ticP}!`; 
                games.kolko.ticA=false; playSnd('win'); if(typeof apps !== 'undefined') apps.showToast('Gry', `Gracz ${games.kolko.ticP} wygrywa!`, 'success');
            } else if(!games.kolko.ticB.includes('')){ 
                document.getElementById('tic-status').innerText='🤝 Remis!'; games.kolko.ticA=false; 
            } else { 
                games.kolko.ticP = games.kolko.ticP==='❌' ? '⭕' : '❌'; 
                document.getElementById('tic-status').innerText=`Tura: ${games.kolko.ticP}`; 
            } 
        },
        chk: () => [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].some(c=>games.kolko.ticB[c[0]]&&games.kolko.ticB[c[0]]===games.kolko.ticB[c[1]]&&games.kolko.ticB[c[1]]===games.kolko.ticB[c[2]]),
        stop: () => {}
    }
};

if(typeof apps !== 'undefined') apps.ticInit = games.kolko.init;

// ---------------------------------------------------------
// WSTRZYKNIĘCIE CSS DLA MOBILE, KONTROLEK I MAKSYMALIZACJI OKNA
// ---------------------------------------------------------

const gameStyles = document.createElement('style');
gameStyles.innerHTML = `
    .window[id^="app-pelzacz"] > div:nth-child(2),
    .window[id^="app-murarz"] > div:nth-child(2),
    .window[id^="app-ufoludki"] > div:nth-child(2),
    .window[id^="app-odbijanka"] > div:nth-child(2),
    .window[id^="app-trzepotek"] > div:nth-child(2),
    .window[id^="app-scigacz"] > div:nth-child(2),
    .window[id^="app-bombiarz"] > div:nth-child(2) {
        display: flex; flex-direction: column; flex-grow: 1; height: 100%; overflow: hidden;
    }
    div[id$="-score"] { flex-shrink: 0; margin-bottom: 5px; }

    .window[id="app-kolko"] { height: max-content !important; }
    .window[id="app-kolko"] > div:nth-child(2) { height: 100%; }

    .window.maximized canvas[id^="canvas-"] {
        width: 100% !important; height: 100% !important;
        object-fit: contain !important; flex-grow: 1; min-height: 0;
    }
    
    .game-fs-btn { 
        background-color: #2563eb; color: white; padding: 8px 16px; border-radius: 6px; font-weight: bold; font-size: 13px; 
        margin-bottom: 8px; border: 1px solid #1d4ed8; flex-shrink: 0; 
        width: 100% !important; max-width: 320px !important; display: block; align-self: center;
    }
    .game-fs-btn:active { background-color: #1e40af; }
    
    .window[id^="app-"] > div > button[onclick^="games."] {
        width: 100% !important; max-width: 320px !important; align-self: center; margin-top: 10px !important;
    }
    
    .mobile-dpad { display: none !important; grid-template-columns: repeat(3, 70px); grid-template-rows: repeat(3, 60px); gap: 10px; justify-content: center; margin-top: auto; margin-bottom: 10px; width: 100%; flex-shrink: 0; }
    
    .mobile-dpad-pong { display: none !important; flex-direction: row; justify-content: space-between; gap: 20px; padding: 0 20px; width: 100%; margin-top: auto; margin-bottom: 20px; flex-shrink: 0; }
    .mobile-dpad-pong .d-btn { flex: 1; height: 90px; font-size: 40px; border-radius: 16px; flex-direction: column; }
    .mobile-dpad-pong .d-btn span { font-size: 14px; font-weight: bold; color: #9ca3af; margin-top: 5px; }

    .d-btn { background: #374151; color: white; border-radius: 12px; font-size: 28px; display: flex; align-items: center; justify-content: center; user-select: none; touch-action: manipulation; border: 1px solid #4b5563; cursor: pointer; }
    .d-btn:active { background: #6b7280; }
    .d-up { grid-column: 2; grid-row: 1; }
    .d-left { grid-column: 1; grid-row: 2; }
    .d-down { grid-column: 2; grid-row: 2; }
    .d-right { grid-column: 3; grid-row: 2; }
    .d-action-start { grid-column: 1 / span 3; grid-row: 3; background: #059669; border-color: #047857; font-size: 18px; font-weight: bold; margin-top: 5px; height: 60px;}
    .d-action-start:active { background: #047857; }
    
    @media (max-width: 768px) {
        .window[id^="app-pelzacz"], .window[id^="app-murarz"], .window[id^="app-ufoludki"], .window[id^="app-odbijanka"], .window[id^="app-trzepotek"], .window[id^="app-scigacz"], .window[id^="app-bombiarz"] {
            width: 100vw !important; height: calc(100vh - 48px) !important; left: 0 !important; top: 0 !important; max-height: none !important; transform: none !important; border-radius: 0 !important; display: flex !important; flex-direction: column !important;
        }

        .window.active:not(.minimized)[id="app-kolko"] {
            width: 100vw !important; height: calc(100vh - 48px) !important; left: 0 !important; top: 0 !important; max-height: none !important; border-radius: 0 !important; display: flex !important; flex-direction: column !important;
        }
        .window[id="app-kolko"] > div:nth-child(2) {
            flex-grow: 1; display: flex; flex-direction: column; justify-content: center; margin: 0;
        }

        .pc-start-btn { display: none !important; }
        .game-fs-btn { display: none !important; }
        canvas[id^="canvas-"] { width: 100% !important; height: 100% !important; max-height: none !important; object-fit: contain !important; flex-grow: 1; min-height: 0; margin: auto 0; }
        
        .window.active:not(.minimized) .mobile-dpad { display: grid !important; }
        .window.active:not(.minimized) .mobile-dpad-pong { display: flex !important; }
    }
`;
document.head.appendChild(gameStyles);

setTimeout(() => {
    document.querySelectorAll('canvas[id^="canvas-"]').forEach(c => {
        const gameName = c.id.replace('canvas-', '');
        const win = c.closest('.window');
        
        c.title = "Zagraj na pełnym oknie (Kliknij dwukrotnie w środek gry)";
        c.ondblclick = () => { if(win && typeof winManager !== 'undefined') winManager.maximize(win.id); };

        const parent = c.parentElement;
        const startBtn = parent.querySelector('button[onclick^="games."]');
        if(startBtn) startBtn.classList.add('pc-start-btn', 'shrink-0');
        
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'flex flex-col items-center mt-2 shrink-0';
        controlsDiv.style.width = "100%";
        
        const fsBtn = document.createElement('button');
        fsBtn.className = 'game-fs-btn';
        fsBtn.innerHTML = '🔲 Powiększ Okno Gry / Zmniejsz';
        fsBtn.onclick = () => { if(win && typeof winManager !== 'undefined') winManager.maximize(win.id); };
        
        const dpad = document.createElement('div');
        
        if (gameName === 'odbijanka') {
            dpad.className = 'mobile-dpad-pong';
            dpad.innerHTML = `
                <div class="d-btn" data-key="ArrowUp">⬆️<span>GÓRA</span></div>
                <div class="d-btn" data-key="ArrowDown">⬇️<span>DÓŁ</span></div>
            `;
        } else {
            dpad.className = 'mobile-dpad';
            dpad.innerHTML = `
                <div class="d-btn d-up" data-key="ArrowUp">⬆️</div>
                <div class="d-btn d-left" data-key="ArrowLeft">⬅️</div>
                <div class="d-btn d-down" data-key="ArrowDown">⬇️</div>
                <div class="d-btn d-right" data-key="ArrowRight">➡️</div>
                <div class="d-btn d-action-start" data-key="Space">▶ START / Akcja</div>
            `;
        }
        
        dpad.querySelectorAll('.d-btn').forEach(btn => {
            const key = btn.getAttribute('data-key');
            const isAction = btn.classList.contains('d-action-start');
            
            const press = (e) => { 
                e.preventDefault(); 
                if (games[gameName] && !games[gameName].active) {
                    if (isAction || gameName === 'odbijanka') { games[gameName].init(); }
                } else if (games[gameName] && games[gameName].active && isAction && typeof games[gameName].doAction === 'function') {
                    games[gameName].doAction();
                }
                gryKeys[key] = true; 
            };
            const release = (e) => { e.preventDefault(); gryKeys[key] = false; };
            
            btn.addEventListener('mousedown', press);
            btn.addEventListener('mouseup', release);
            btn.addEventListener('mouseleave', release);
            btn.addEventListener('touchstart', press, {passive: false});
            btn.addEventListener('touchend', release, {passive: false});
        });
        
        controlsDiv.appendChild(fsBtn);
        controlsDiv.appendChild(dpad);
        
        if(startBtn) parent.insertBefore(controlsDiv, startBtn.nextSibling);
        else parent.appendChild(controlsDiv);
    });
}, 1000);

if (typeof winManager !== 'undefined' && !winManager._isGamePatched) {
    const originalClose = winManager.close;
    
    winManager.close = (appId) => {
        if (games[appId] && typeof games[appId].stop === 'function') {
            games[appId].stop(); 
        }
        stopAllSounds(); 
        originalClose(appId);
    };
    
    winManager._isGamePatched = true; 
}