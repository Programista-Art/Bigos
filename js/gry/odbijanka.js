// ======================================================================
// PLIK: js/gry/odbijanka.js
// ======================================================================

games.odbijanka = {
    c: null, ctx: null, loop: null, active: false, p1: {}, p2: {}, ball: {}, score1: 0, score2: 0,
    init: function() {
        stopAllSounds();
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
        
        // ZNACZNE OSŁABIENIE AI (Wolniejsza paletka i opóźniona reakcja)
        if(this.p2.y + 30 < this.ball.y - 10) this.p2.y += 1.6; 
        else if(this.p2.y + 30 > this.ball.y + 10) this.p2.y -= 1.6;
        
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
};