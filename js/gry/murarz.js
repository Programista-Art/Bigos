// ======================================================================
// PLIK: js/gry/murarz.js
// ======================================================================

games.murarz = {
    c: null, ctx: null, loop: null, active: false, paddle: {}, ball: {}, bricks: [], score: 0,
    init: function() {
        stopAllSounds();
        if(this.loop) cancelAnimationFrame(this.loop); 
        this.c = document.getElementById('canvas-murarz'); this.ctx = this.c.getContext('2d'); 
        this.paddle = { x: 160, y: 280, w: 80, h: 10 }; 
        this.ball = { x: 200, y: 260, dx: 2.5, dy: -2.5, r: 8 }; 
        this.bricks = []; this.score = 0; this.active = true;
        
        for(let c=0; c<8; c++) {
            for(let r=0; r<5; r++) { 
                this.bricks.push({ 
                    x: c*48+10, y: r*25+50, w: 44, h: 18, status: 1, 
                    type: ['🧱','🧊','📦'][Math.floor(Math.random()*3)] 
                }); 
            }
        }
        
        document.getElementById('murarz-score').innerText = 'Klocki: 0';
        this.c.onmousemove = (e) => { 
            const r = this.c.getBoundingClientRect(); const scaleX = this.c.width / r.width;
            let newX = (e.clientX - r.left) * scaleX - this.paddle.w/2; 
            this.paddle.x = Math.max(0, Math.min(this.c.width - this.paddle.w, newX)); 
        };
        this.c.addEventListener('touchmove', (e) => { 
            const r = this.c.getBoundingClientRect(); const scaleX = this.c.width / r.width;
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
                drawSprite(this.ctx, gameAssets.brick, b.x, b.y, b.w, b.h, () => { this.ctx.fillText(b.type, b.x + 10, b.y - 2); });
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
};