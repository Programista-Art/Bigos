// ======================================================================
// PLIK: js/gry/scigacz.js
// ======================================================================

games.scigacz = {
    c: null, ctx: null, loop: null, active: false, carX: 130, obs: [], score: 0, speed: 2.5, frame: 0,
    init: function() {
        stopAllSounds();
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
};