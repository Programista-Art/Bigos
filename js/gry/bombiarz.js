// ======================================================================
// PLIK: js/gry/bombiarz.js
// ======================================================================

games.bombiarz = {
    c: null, ctx: null, loop: null, active: false, px: 20, py: 20, bombs: [], blocks: [], score: 0, lastMv: 0, explosions: [],
    init: function() {
        stopAllSounds();
        if(this.loop) cancelAnimationFrame(this.loop); 
        this.c = document.getElementById('canvas-bombiarz'); this.ctx = this.c.getContext('2d'); 
        this.px = 20; this.py = 20; this.bombs = []; this.blocks = []; this.explosions = []; this.score = 0; this.active = true;
        for(let i=0; i<35; i++) {
            let bx = Math.floor(Math.random()*13+1)*20; let by = Math.floor(Math.random()*13+1)*20;
            this.blocks.push({ x: bx, y: by }); 
        }
        document.getElementById('bombiarz-score').innerText = 'Punkty: 0'; this.update();
    },
    doAction: function() {
        if(!this.active) return;
        if(!this.bombs.some(b=>b.x===this.px&&b.y===this.py)) { 
            this.bombs.push({ x: this.px, y: this.py, time: 80 }); playSnd('drop'); gryKeys['Space'] = false; 
        }
    },
    update: function() {
        if(!this.active) return; this.ctx.clearRect(0,0,this.c.width,this.c.height);
        
        if(Date.now() - this.lastMv > 120) { 
            let nx = this.px; let ny = this.py;
            if(gryKeys['ArrowLeft'] && this.px > 0) nx -= 20; 
            if(gryKeys['ArrowRight'] && this.px < 280) nx += 20; 
            if(gryKeys['ArrowUp'] && this.py > 0) ny -= 20; 
            if(gryKeys['ArrowDown'] && this.py < 280) ny += 20; 
            
            if(!this.blocks.some(b => b.x === nx && b.y === ny)) { this.px = nx; this.py = ny; }
            this.lastMv = Date.now(); 
        }
        
        if(gryKeys['Space']) { this.doAction(); }
        
        this.ctx.font = "20px Arial"; this.ctx.textBaseline = "top";
        
        this.blocks.forEach(b => { drawSprite(this.ctx, gameAssets.box, b.x, b.y, 20, 20, () => { this.ctx.fillText('📦', b.x, b.y); }); });
        
        this.bombs.forEach((b, i) => { 
            b.time--; 
            drawSprite(this.ctx, gameAssets.bomb, b.x, b.y, 20, 20, () => {
                if(Math.floor(b.time/10)%2 === 0) this.ctx.fillText('💣', b.x, b.y); else this.ctx.fillText('🧨', b.x, b.y);
            });
            
            if(b.time <= 0) { 
                this.bombs.splice(i, 1); this.explosions.push({x: b.x, y: b.y, timer: 15}); playSnd('explosion');
                this.blocks = this.blocks.filter(bl => { 
                    let dist = Math.abs(bl.x - b.x) + Math.abs(bl.y - b.y); 
                    if(dist <= 20) { this.score+=5; playSnd('score'); document.getElementById('bombiarz-score').innerText = 'Punkty: '+this.score; return false; } 
                    return true; 
                }); 
            } 
        });
        
        this.explosions.forEach((ex, i) => {
            ex.timer--;
            this.ctx.fillText('💥', ex.x, ex.y); this.ctx.fillText('💥', ex.x-20, ex.y); this.ctx.fillText('💥', ex.x+20, ex.y);
            this.ctx.fillText('💥', ex.x, ex.y-20); this.ctx.fillText('💥', ex.x, ex.y+20);
            if(ex.timer <= 0) this.explosions.splice(i, 1);
        });
        
        drawSprite(this.ctx, gameAssets.bomber, this.px, this.py, 20, 20, () => { this.ctx.fillText('🤠', this.px, this.py); });
        
        if(this.active) this.loop = requestAnimationFrame(() => this.update());
    },
    stop: function() { this.active = false; if(this.loop) cancelAnimationFrame(this.loop); }
};