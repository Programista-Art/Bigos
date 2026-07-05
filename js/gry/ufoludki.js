// ======================================================================
// PLIK: js/gry/ufoludki.js
// ======================================================================

games.ufoludki = {
    c: null, ctx: null, loop: null, active: false, ship: {}, bullets: [], aliens: [], score: 0, lastShot: 0,
    init: function() {
        stopAllSounds();
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
        let isGameOver = false; // Flaga blokująca powielanie dźwięku!
        
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
        
        if(isGameOver) return; // Jeśli przegraliśmy, od razu przerywamy klatkę animacji
        
        if(allDead) { this.active = false; playSnd('win'); if(typeof apps !== 'undefined') apps.showToast('Wygrana', 'Ocaliłeś BigOS!', 'success'); return; } 
        if(this.active) this.loop = requestAnimationFrame(() => this.update());
    },
    stop: function() { this.active = false; if(this.loop) cancelAnimationFrame(this.loop); }
};