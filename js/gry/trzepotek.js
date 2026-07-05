// ======================================================================
// PLIK: js/gry/trzepotek.js
// ======================================================================

games.trzepotek = {
    c: null, ctx: null, loop: null, active: false, birdY: 200, velocity: 0, pipes: [], score: 0, frame: 0,
    init: function() {
        stopAllSounds();
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
};