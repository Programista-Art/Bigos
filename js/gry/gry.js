 const games = {
            pelzacz: {
                c: null, ctx: null, loop: null, active: false, grid: 15, snake: [], apple: {}, dx: 15, dy: 0, score: 0,
                init: function() { if(this.loop) clearTimeout(this.loop); this.c = document.getElementById('canvas-pelzacz'); this.ctx = this.c.getContext('2d'); this.snake = [{x: 150, y: 150}, {x: 135, y: 150}]; this.dx = this.grid; this.dy = 0; this.score = 0; this.active = true; this.placeApple(); document.getElementById('pelzacz-score').innerText = 'Wynik: 0'; this.c.focus(); this.update(); },
                placeApple: function() { this.apple = { x: Math.floor(Math.random()*(this.c.width/this.grid))*this.grid, y: Math.floor(Math.random()*(this.c.height/this.grid))*this.grid }; },
                update: function() {
                    if(!this.active) return;
                    if(GLOBAL_KEYS['ArrowLeft'] && this.dx === 0) { this.dx = -this.grid; this.dy = 0; } else if(GLOBAL_KEYS['ArrowUp'] && this.dy === 0) { this.dy = -this.grid; this.dx = 0; } else if(GLOBAL_KEYS['ArrowRight'] && this.dx === 0) { this.dx = this.grid; this.dy = 0; } else if(GLOBAL_KEYS['ArrowDown'] && this.dy === 0) { this.dy = this.grid; this.dx = 0; }
                    const head = {x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy};
                    if(head.x < 0 || head.x >= this.c.width || head.y < 0 || head.y >= this.c.height || this.snake.some(s => s.x === head.x && s.y === head.y)) { this.active = false; apps.showToast('Koniec Gry', 'Pełzacz uderzył w ścianę!', 'error'); return; }
                    this.snake.unshift(head); if(head.x === this.apple.x && head.y === this.apple.y) { this.score+=10; document.getElementById('pelzacz-score').innerText = 'Wynik: '+this.score; this.placeApple(); } else this.snake.pop();
                    this.ctx.fillStyle = '#111'; this.ctx.fillRect(0,0,this.c.width,this.c.height); this.ctx.fillStyle = 'red'; this.ctx.fillRect(this.apple.x, this.apple.y, this.grid-1, this.grid-1); this.ctx.fillStyle = '#22c55e'; this.snake.forEach(s => this.ctx.fillRect(s.x, s.y, this.grid-1, this.grid-1));
                    this.loop = setTimeout(() => this.update(), 100);
                },
                stop: function() { this.active = false; if(this.loop) clearTimeout(this.loop); }
            },
            murarz: {
                c: null, ctx: null, loop: null, active: false, paddle: {}, ball: {}, bricks: [], score: 0,
                init: function() {
                    if(this.loop) cancelAnimationFrame(this.loop); this.c = document.getElementById('canvas-murarz'); this.ctx = this.c.getContext('2d'); this.paddle = { x: 160, y: 280, w: 80, h: 10 }; this.ball = { x: 200, y: 270, dx: 3, dy: -3, r: 5 }; this.bricks = []; this.score = 0; this.active = true;
                    for(let c=0; c<8; c++) for(let r=0; r<4; r++) this.bricks.push({ x: c*48+10, y: r*20+20, w: 40, h: 10, status: 1 }); document.getElementById('murarz-score').innerText = 'Klocki: 0';
                    this.c.onmousemove = (e) => { const r = this.c.getBoundingClientRect(); this.paddle.x = e.clientX - r.left - this.paddle.w/2; };
                    this.c.addEventListener('touchmove', (e) => { e.preventDefault(); const r = this.c.getBoundingClientRect(); this.paddle.x = e.touches[0].clientX - r.left - this.paddle.w/2; }, {passive: false});
                    this.update();
                },
                update: function() {
                    if(!this.active) return; this.ctx.clearRect(0,0,this.c.width,this.c.height); this.ball.x += this.ball.dx; this.ball.y += this.ball.dy;
                    if(this.ball.x + this.ball.dx > this.c.width - this.ball.r || this.ball.x + this.ball.dx < this.ball.r) this.ball.dx = -this.ball.dx; if(this.ball.y + this.ball.dy < this.ball.r) this.ball.dy = -this.ball.dy; else if(this.ball.y + this.ball.dy > this.c.height - this.ball.r) { if(this.ball.x > this.paddle.x && this.ball.x < this.paddle.x + this.paddle.w) this.ball.dy = -this.ball.dy; else { this.active = false; apps.showToast('Koniec Gry', 'Piłka spadła!', 'error'); return; } }
                    this.bricks.forEach(b => { if(b.status === 1) { if(this.ball.x > b.x && this.ball.x < b.x+b.w && this.ball.y > b.y && this.ball.y < b.y+b.h) { this.ball.dy = -this.ball.dy; b.status = 0; this.score++; document.getElementById('murarz-score').innerText = 'Klocki: '+this.score; } this.ctx.fillStyle = '#eab308'; this.ctx.fillRect(b.x, b.y, b.w, b.h); } });
                    this.ctx.fillStyle = '#3b82f6'; this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h); this.ctx.fillStyle = '#fff'; this.ctx.beginPath(); this.ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI*2); this.ctx.fill();
                    if(this.score === 32) { this.active = false; apps.showToast('Wygrana', 'Rozbiłeś wszystko!', 'success'); return; } this.loop = requestAnimationFrame(() => this.update());
                },
                stop: function() { this.active = false; if(this.loop) cancelAnimationFrame(this.loop); }
            },
            ufoludki: {
                c: null, ctx: null, loop: null, active: false, ship: {}, bullets: [], aliens: [], score: 0,
                init: function() {
                    if(this.loop) cancelAnimationFrame(this.loop); this.c = document.getElementById('canvas-ufoludki'); this.ctx = this.c.getContext('2d'); this.ship = { x: 180, y: 360, w: 40, h: 20 }; this.bullets = []; this.aliens = []; this.score = 0; this.active = true;
                    for(let r=0; r<4; r++) for(let c=0; c<8; c++) this.aliens.push({x: c*40+20, y: r*30+20, w:25, h:20, alive: true}); document.getElementById('ufoludki-score').innerText = 'Punkty: 0'; this.c.focus(); this.lastShot = 0; this.update();
                },
                update: function() {
                    if(!this.active) return; this.ctx.clearRect(0,0,this.c.width,this.c.height);
                    if(GLOBAL_KEYS['ArrowLeft'] && this.ship.x > 0) this.ship.x -= 4; if(GLOBAL_KEYS['ArrowRight'] && this.ship.x < this.c.width - this.ship.w) this.ship.x += 4;
                    if(GLOBAL_KEYS['Space'] && Date.now() - this.lastShot > 300) { this.bullets.push({x: this.ship.x + 18, y: this.ship.y, w:4, h:10}); this.lastShot = Date.now(); }
                    this.ctx.fillStyle = '#a855f7'; this.ctx.fillRect(this.ship.x, this.ship.y, this.ship.w, this.ship.h);
                    this.bullets.forEach((b, i) => { b.y -= 7; this.ctx.fillStyle = '#fff'; this.ctx.fillRect(b.x, b.y, b.w, b.h); if(b.y < 0) this.bullets.splice(i, 1); else { this.aliens.forEach(a => { if(a.alive && b.x > a.x && b.x < a.x+a.w && b.y > a.y && b.y < a.y+a.h) { a.alive = false; this.bullets.splice(i, 1); this.score+=10; document.getElementById('ufoludki-score').innerText = 'Punkty: '+this.score;} }); } });
                    let allDead = true; this.aliens.forEach(a => { if(a.alive) { allDead = false; a.y += 0.2; this.ctx.fillStyle = '#22c55e'; this.ctx.fillRect(a.x, a.y, a.w, a.h); if(a.y > 350) { this.active = false; apps.showToast('Koniec', 'Ufoludki wylądowały!', 'error'); } } });
                    if(allDead) { this.active = false; apps.showToast('Wygrana', 'Ocaliłeś BigOS!', 'success'); return; } if(this.active) this.loop = requestAnimationFrame(() => this.update());
                },
                stop: function() { this.active = false; if(this.loop) cancelAnimationFrame(this.loop); }
            },
            odbijanka: {
                c: null, ctx: null, loop: null, active: false, p1: {}, p2: {}, ball: {}, score1: 0, score2: 0,
                init: function() {
                    if(this.loop) cancelAnimationFrame(this.loop); this.c = document.getElementById('canvas-odbijanka'); this.ctx = this.c.getContext('2d'); this.p1 = { y: 120 }; this.p2 = { y: 120 }; this.ball = { x: 200, y: 150, dx: 4, dy: 4 }; this.score1 = 0; this.score2 = 0; this.active = true;
                    this.c.onmousemove = (e) => { const r = this.c.getBoundingClientRect(); this.p1.y = e.clientY - r.top - 30; };
                    this.c.addEventListener('touchmove', (e) => { e.preventDefault(); const r = this.c.getBoundingClientRect(); this.p1.y = e.touches[0].clientY - r.top - 30; }, {passive: false});
                    this.updateScore(); this.update();
                },
                updateScore: function() { document.getElementById('odbijanka-score').innerText = `Ty: ${this.score1} | Komputer: ${this.score2}`; },
                update: function() {
                    if(!this.active) return; this.ctx.fillStyle = '#111'; this.ctx.fillRect(0,0,this.c.width,this.c.height); this.ball.x += this.ball.dx; this.ball.y += this.ball.dy;
                    if(this.ball.y < 0 || this.ball.y > 290) this.ball.dy = -this.ball.dy; if(this.p2.y + 30 < this.ball.y) this.p2.y += 3; else this.p2.y -= 3;
                    if(this.ball.x < 20 && this.ball.y > this.p1.y && this.ball.y < this.p1.y + 60) this.ball.dx = -this.ball.dx; if(this.ball.x > 370 && this.ball.y > this.p2.y && this.ball.y < this.p2.y + 60) this.ball.dx = -this.ball.dx;
                    if(this.ball.x < 0) { this.score2++; this.ball.x = 200; this.updateScore(); } if(this.ball.x > 400) { this.score1++; this.ball.x = 200; this.updateScore(); }
                    this.ctx.fillStyle = '#fff'; this.ctx.fillRect(10, this.p1.y, 10, 60); this.ctx.fillRect(380, this.p2.y, 10, 60); this.ctx.fillRect(this.ball.x, this.ball.y, 10, 10);
                    this.loop = requestAnimationFrame(() => this.update());
                },
                stop: function() { this.active = false; if(this.loop) cancelAnimationFrame(this.loop); }
            },
            trzepotek: {
                c: null, ctx: null, loop: null, active: false, birdY: 200, velocity: 0, pipes: [], score: 0, frame: 0,
                init: function() {
                    if(this.loop) cancelAnimationFrame(this.loop); this.c = document.getElementById('canvas-trzepotek'); this.ctx = this.c.getContext('2d'); this.birdY = 200; this.velocity = 0; this.pipes = []; this.score = 0; this.frame = 0; this.active = true; document.getElementById('trzepotek-score').innerText = 'Punkty: 0';
                    this.c.onclick = () => { if(this.active) this.velocity = -6; };
                    this.c.focus(); this.update();
                },
                update: function() {
                    if(!this.active) return; if(GLOBAL_KEYS['Space']) { this.velocity = -6; GLOBAL_KEYS['Space'] = false; } this.ctx.clearRect(0,0,this.c.width,this.c.height);
                    this.velocity += 0.3; this.birdY += this.velocity;
                    if(this.frame % 100 === 0) { const gapY = Math.random() * 200 + 50; this.pipes.push({ x: 300, w: 40, top: gapY, bottom: gapY + 100 }); } this.frame++;
                    this.ctx.fillStyle = '#22c55e';
                    this.pipes.forEach((p, i) => {
                        p.x -= 2; this.ctx.fillRect(p.x, 0, p.w, p.top); this.ctx.fillRect(p.x, p.bottom, p.w, 400 - p.bottom);
                        if(p.x === 50) { this.score++; document.getElementById('trzepotek-score').innerText = 'Punkty: '+this.score; }
                        if(50 < p.x + p.w && 50 + 20 > p.x && (this.birdY < p.top || this.birdY + 20 > p.bottom)) { this.active = false; apps.showToast('Koniec', 'Trzepotek spadł!', 'error'); }
                        if(p.x < -40) this.pipes.splice(i, 1);
                    });
                    if(this.birdY > 400 || this.birdY < 0) { this.active = false; apps.showToast('Koniec', 'Ups!', 'error'); }
                    this.ctx.fillStyle = '#eab308'; this.ctx.beginPath(); this.ctx.arc(60, this.birdY, 10, 0, Math.PI*2); this.ctx.fill();
                    if(this.active) this.loop = requestAnimationFrame(() => this.update());
                },
                stop: function() { this.active = false; if(this.loop) cancelAnimationFrame(this.loop); }
            },
            scigacz: {
                c: null, ctx: null, loop: null, active: false, carX: 130, obs: [], score: 0, speed: 3, frame: 0,
                init: function() {
                    if(this.loop) cancelAnimationFrame(this.loop); this.c = document.getElementById('canvas-scigacz'); this.ctx = this.c.getContext('2d'); this.carX = 130; this.obs = []; this.score = 0; this.speed = 3; this.frame = 0; this.active = true; document.getElementById('scigacz-score').innerText = 'Dystans: 0'; this.c.focus(); this.update();
                },
                update: function() {
                    if(!this.active) return; this.ctx.clearRect(0,0,this.c.width,this.c.height);
                    if(GLOBAL_KEYS['ArrowLeft'] && this.carX > 10) this.carX -= 4; if(GLOBAL_KEYS['ArrowRight'] && this.carX < 250) this.carX += 4;
                    if(this.frame % Math.max(30, 80 - this.score) === 0) { this.obs.push({ x: Math.random() * 260, y: -40, w: 40, h: 40 }); } this.frame++;
                    this.ctx.fillStyle = '#b91c1c';
                    this.obs.forEach((o, i) => { o.y += this.speed; this.ctx.fillRect(o.x, o.y, o.w, o.h); if(this.carX < o.x + o.w && this.carX + 40 > o.x && 340 < o.y + o.h && 380 > o.y) { this.active = false; apps.showToast('Koniec', 'Wypadek!', 'error'); } if(o.y > 400) { this.obs.splice(i, 1); this.score++; document.getElementById('scigacz-score').innerText = 'Dystans: '+this.score; if(this.score%5===0) this.speed+=0.5; } });
                    this.ctx.fillStyle = '#3b82f6'; this.ctx.fillRect(this.carX, 340, 40, 50);
                    if(this.active) this.loop = requestAnimationFrame(() => this.update());
                },
                stop: function() { this.active = false; if(this.loop) cancelAnimationFrame(this.loop); }
            },
            bombiarz: {
                c: null, ctx: null, loop: null, active: false, px: 20, py: 20, bombs: [], blocks: [], score: 0, lastMv: 0,
                init: function() {
                    if(this.loop) cancelAnimationFrame(this.loop); this.c = document.getElementById('canvas-bombiarz'); this.ctx = this.c.getContext('2d'); this.px = 20; this.py = 20; this.bombs = []; this.blocks = []; this.score = 0; this.active = true;
                    for(let i=0; i<30; i++) this.blocks.push({ x: Math.floor(Math.random()*15)*20, y: Math.floor(Math.random()*15)*20 }); document.getElementById('bombiarz-score').innerText = 'Punkty: 0'; this.c.focus(); this.update();
                },
                update: function() {
                    if(!this.active) return; this.ctx.clearRect(0,0,this.c.width,this.c.height);
                    if(Date.now() - this.lastMv > 100) { if(GLOBAL_KEYS['ArrowLeft'] && this.px > 0) { this.px -= 20; this.lastMv = Date.now(); } if(GLOBAL_KEYS['ArrowRight'] && this.px < 280) { this.px += 20; this.lastMv = Date.now(); } if(GLOBAL_KEYS['ArrowUp'] && this.py > 0) { this.py -= 20; this.lastMv = Date.now(); } if(GLOBAL_KEYS['ArrowDown'] && this.py < 280) { this.py += 20; this.lastMv = Date.now(); } }
                    if(GLOBAL_KEYS['Space'] && !this.bombs.some(b=>b.x===this.px&&b.y===this.py)) { this.bombs.push({ x: this.px, y: this.py, time: 100 }); GLOBAL_KEYS['Space'] = false; }
                    this.ctx.fillStyle = '#64748b'; this.blocks.forEach(b => this.ctx.fillRect(b.x, b.y, 20, 20));
                    this.ctx.fillStyle = '#ef4444';
                    this.bombs.forEach((b, i) => { b.time--; this.ctx.beginPath(); this.ctx.arc(b.x+10, b.y+10, 8, 0, Math.PI*2); this.ctx.fill(); if(b.time <= 0) { this.bombs.splice(i, 1); this.blocks = this.blocks.filter(bl => { let dist = Math.abs(bl.x - b.x) + Math.abs(bl.y - b.y); if(dist <= 20) { this.score+=5; document.getElementById('bombiarz-score').innerText = 'Punkty: '+this.score; return false; } return true; }); } });
                    this.ctx.fillStyle = '#3b82f6'; this.ctx.fillRect(this.px, this.py, 20, 20);
                    if(this.active) this.loop = requestAnimationFrame(() => this.update());
                },
                stop: function() { this.active = false; if(this.loop) cancelAnimationFrame(this.loop); }
            },
            kolko: {
                ticB: ['','','','','','','','',''], ticP: 'X', ticA: true,
                init: () => { games.kolko.ticB=['','','','','','','','','']; games.kolko.ticP='X'; games.kolko.ticA=true; document.getElementById('tic-status').innerText='Tura: X'; const c=document.getElementById('tic-board'); c.innerHTML=''; for(let i=0;i<9;i++){ const cell=document.createElement('div'); cell.className='w-16 h-16 bg-gray-200 dark:bg-[#222] flex items-center justify-center text-3xl font-bold cursor-pointer rounded transition hover:bg-gray-300 dark:hover:bg-[#333]'; cell.onclick=()=>games.kolko.play(i, cell); c.appendChild(cell); } },
                play: (i, cell) => { if(!games.kolko.ticA || games.kolko.ticB[i]!=='')return; games.kolko.ticB[i]=games.kolko.ticP; cell.innerText=games.kolko.ticP; cell.classList.add(games.kolko.ticP==='X'?'text-red-500':'text-blue-500'); if(games.kolko.chk()){ document.getElementById('tic-status').innerText=`🏆 Zwycięzca: ${games.kolko.ticP}!`; games.kolko.ticA=false; apps.showToast('Gry', `Gracz ${games.kolko.ticP} wygrywa!`, 'success');} else if(!games.kolko.ticB.includes('')){ document.getElementById('tic-status').innerText='Remis!'; games.kolko.ticA=false; } else { games.kolko.ticP=games.kolko.ticP==='X'?'O':'X'; document.getElementById('tic-status').innerText=`Tura: ${games.kolko.ticP}`; } },
                chk: () => [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].some(c=>games.kolko.ticB[c[0]]&&games.kolko.ticB[c[0]]===games.kolko.ticB[c[1]]&&games.kolko.ticB[c[1]]===games.kolko.ticB[c[2]]),
                stop: () => {}
            }
        };