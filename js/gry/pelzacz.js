// ======================================================================
// PLIK: js/gry/pelzacz.js
// ======================================================================

games.pelzacz = {
    c: null, ctx: null, loop: null, inputReq: null, active: false, grid: 20, 
    snake: [], apple: {}, 
    dx: 20, dy: 0, 
    turnQueue: [], // Nowość: Kolejka skrętów (likwiduje opóźnienia i gubienie klawiszy!)
    score: 0, highScore: 0,
    
    init: function() { 
        stopAllSounds();
        if(this.loop) clearTimeout(this.loop); 
        if(this.inputReq) cancelAnimationFrame(this.inputReq);

        this.c = document.getElementById('canvas-pelzacz'); 
        this.ctx = this.c.getContext('2d'); 
        
        // Wczytanie Najlepszego Wyniku
        this.highScore = parseInt(localStorage.getItem('bigos_pelzacz_hi')) || 0;
        
        this.snake = [{x: 140, y: 140}, {x: 120, y: 140}]; 
        this.dx = this.grid; this.dy = 0; 
        this.turnQueue = []; // Czyścimy kolejkę na start
        this.score = 0; 
        this.active = true; 
        
        this.placeApple(); 
        this.updateScoreUI(); 
        this.c.focus(); 
        
        this.inputLoop(); // Uruchamia błyskawiczne (60fps) nasłuchiwanie klawiszy
        this.update(); 
    },
    
    updateScoreUI: function() {
        const el = document.getElementById('pelzacz-score');
        if (el) el.innerText = `Wynik: ${this.score} | Najlepszy: ${this.highScore}`;
    },
    
    placeApple: function() { 
        let valid = false;
        let attempts = 0;
        while(!valid && attempts < 200) {
            this.apple = { 
                x: Math.floor(Math.random()*(this.c.width/this.grid))*this.grid, 
                y: Math.floor(Math.random()*(this.c.height/this.grid))*this.grid 
            };
            valid = !this.snake.some(s => s.x === this.apple.x && s.y === this.apple.y);
            attempts++;
        }
    },
    
    // NOWA FUNKCJA: Łapie klawisze niezależnie od prędkości gry!
    inputLoop: function() {
        if(!this.active) return;
        
        // Bierzemy ostatni zaplanowany kierunek (lub obecny, jeśli kolejka pusta)
        let lastIntent = this.turnQueue.length > 0 ? this.turnQueue[this.turnQueue.length - 1] : {dx: this.dx, dy: this.dy};

        // Zapisujemy intencję skrętu do kolejki (gra się już nie zatnie i nie zgubi klawisza)
        if(gryKeys['ArrowLeft'] && lastIntent.dx === 0) { 
            this.turnQueue.push({dx: -this.grid, dy: 0}); 
            gryKeys['ArrowLeft'] = false; // "Pochłaniamy" klawisz, by nie dublować ruchu
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

        this.inputReq = requestAnimationFrame(() => this.inputLoop());
    },
    
    update: function() {
        if(!this.active) return;
        
        // Płynne pobieranie zapisanych w kolejce skrętów co turę
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
            playSnd('die'); 
            if(typeof apps !== 'undefined') apps.showToast('Game Over', hitWall ? 'Uderzenie w ścianę!' : 'Wąż ugryzł sam siebie!', 'error'); 
            return; 
        }
        
        this.snake.unshift(head); 
        
        if(head.x === this.apple.x && head.y === this.apple.y) { 
            this.score += 1; 
            
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('bigos_pelzacz_hi', this.highScore);
            }
            
            playSnd('eat'); 
            this.updateScoreUI(); 
            this.placeApple(); 
        } else {
            this.snake.pop(); 
        }
        
        this.ctx.fillStyle = '#111827'; 
        this.ctx.fillRect(0,0,this.c.width,this.c.height); 
        
        this.ctx.strokeStyle = '#15803d';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(0.5, 0.5, this.c.width - 1, this.c.height - 1);
        
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
        
        // DUŻO WOLNIEJSZY START (400ms zamiast 250ms), a potem przyspiesza płynnie do max 80ms
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