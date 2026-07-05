// ======================================================================
// PLIK: js/gry/silnik.js (Główny silnik: Dźwięki, UI, Klawisze)
// ======================================================================

// Deklaracja głównego obiektu gier, do którego podepniemy poszczególne gry z innych plików
var games = {};

// ---------------------------------------------------------
// WŁASNY SYSTEM ŚLEDZENIA KLAWISZY
// ---------------------------------------------------------
var gryKeys = {};
window.addEventListener('keydown', (e) => { 
    gryKeys[e.code] = true; 
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
        if(Object.values(games).some(g => g && g.active)) e.preventDefault();
    }
}, {passive: false});
window.addEventListener('keyup', (e) => { gryKeys[e.code] = false; });

// ---------------------------------------------------------
// SYSTEM ŁADOWANIA WŁASNYCH GRAFIK Z FOLDERU
// ---------------------------------------------------------
var gameAssets = {
    apple: new Image(), snake_head: new Image(), snake_body: new Image(),
    paddle: new Image(), ball: new Image(), brick: new Image(),
    ship: new Image(), alien: new Image(), bullet: new Image(),
    car: new Image(), obs: new Image(),
    bird: new Image(), pipe: new Image(),
    bomber: new Image(), bomb: new Image(), box: new Image()
};

gameAssets.apple.src = 'games/img/apple.png';
gameAssets.snake_head.src = 'games/img/snake_head.png';
gameAssets.snake_body.src = 'games/img/snake_body.png';
gameAssets.paddle.src = 'games/img/paddle.png';
gameAssets.ball.src = 'games/img/ball.png';
gameAssets.brick.src = 'games/img/brick.png';
gameAssets.ship.src = 'games/img/ship.png';
gameAssets.alien.src = 'games/img/alien.png';
gameAssets.bullet.src = 'games/img/bullet.png';
gameAssets.car.src = 'games/img/car.png';
gameAssets.obs.src = 'games/img/obs.png';
gameAssets.bird.src = 'games/img/bird.png';
gameAssets.pipe.src = 'games/img/pipe.png';
gameAssets.bomber.src = 'games/img/bomber.png';
gameAssets.bomb.src = 'games/img/bomb.png';
gameAssets.box.src = 'games/img/box.png';

var drawSprite = (ctx, img, x, y, w, h, fallbackFn) => {
    if (img && img.complete && img.naturalWidth > 0) ctx.drawImage(img, x, y, w, h);
    else fallbackFn(); 
};

// ---------------------------------------------------------
// SYSTEM DŹWIĘKOWY (Śledzenie i zatrzymywanie długich plików)
// ---------------------------------------------------------
var gameSounds = {
    eat: new Audio('games/sound/eat.mp3'),
    die: new Audio('games/sound/die.mp3'),
    bounce: new Audio('games/sound/bounce.mp3'),
    break: new Audio('games/sound/break.mp3'),
    win: new Audio('games/sound/win.mp3'),
    shoot: new Audio('games/sound/shoot.mp3'),
    invader: new Audio('games/sound/invader.mp3'),
    pong: new Audio('games/sound/pong.mp3'),
    score: new Audio('games/sound/score.mp3'),
    flap: new Audio('games/sound/flap.mp3'),
    hit: new Audio('games/sound/hit.mp3'),
    crash: new Audio('games/sound/crash.mp3'),
    drop: new Audio('games/sound/drop.mp3'),
    explosion: new Audio('games/sound/explosion.mp3')
};

var activeSounds = [];

var stopAllSounds = () => {
    activeSounds.forEach(s => {
        try { s.pause(); s.currentTime = 0; } catch(e) {}
    });
    activeSounds = [];
};

var playSnd = (id) => {
    if (gameSounds[id]) {
        const snd = gameSounds[id].cloneNode(); 
        snd.volume = 0.6;
        snd.play().catch(e => {});
        activeSounds.push(snd);
        snd.onended = () => {
            const idx = activeSounds.indexOf(snd);
            if(idx > -1) activeSounds.splice(idx, 1);
        };
    }
};

// ---------------------------------------------------------
// WSTRZYKNIĘCIE CSS DLA MOBILE, KONTROLEK I MAKSYMALIZACJI OKNA
// ---------------------------------------------------------

const gameStyles = document.createElement('style');
gameStyles.innerHTML = `
    .window[id^="app-pelzacz"], .window[id^="app-murarz"], .window[id^="app-ufoludki"], 
    .window[id^="app-odbijanka"], .window[id^="app-trzepotek"], .window[id^="app-scigacz"], 
    .window[id^="app-bombiarz"], .window[id="app-kolko"], .window[id^="app-tank"] {
        height: max-content !important; 
    }
    
    .window[id^="app-pelzacz"] > div:nth-child(2), .window[id^="app-murarz"] > div:nth-child(2), 
    .window[id^="app-ufoludki"] > div:nth-child(2), .window[id^="app-odbijanka"] > div:nth-child(2), 
    .window[id^="app-trzepotek"] > div:nth-child(2), .window[id^="app-scigacz"] > div:nth-child(2), 
    .window[id^="app-bombiarz"] > div:nth-child(2), .window[id="app-kolko"] > div:nth-child(2),
    .window[id^="app-tank"] > div:nth-child(2) {
        display: flex; flex-direction: column; flex-grow: 1; height: 100%; overflow: hidden;
    }
    
    div[id$="-score"], div[id="tic-status"] { flex-shrink: 0; margin-bottom: 5px; }

    .window.maximized[id^="app-"] { height: calc(100vh - 48px) !important; }
    .window.maximized canvas[id^="canvas-"] { width: 100% !important; height: 100% !important; object-fit: contain !important; flex-grow: 1; min-height: 0; }
    
    .game-fs-btn { background-color: #2563eb; color: white; padding: 8px 16px; border-radius: 6px; font-weight: bold; font-size: 13px; margin-bottom: 8px; border: 1px solid #1d4ed8; flex-shrink: 0; width: 100% !important; max-width: 320px !important; display: block; align-self: center; }
    .game-fs-btn:active { background-color: #1e40af; }
    .window[id^="app-"] > div > button[onclick^="games."] { width: 100% !important; max-width: 320px !important; align-self: center; margin-top: 10px !important; }
    
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
        .window.active:not(.minimized)[id^="app-pelzacz"], .window.active:not(.minimized)[id^="app-murarz"], 
        .window.active:not(.minimized)[id^="app-ufoludki"], .window.active:not(.minimized)[id^="app-odbijanka"], 
        .window.active:not(.minimized)[id^="app-trzepotek"], .window.active:not(.minimized)[id^="app-scigacz"], 
        .window.active:not(.minimized)[id^="app-bombiarz"], .window.active:not(.minimized)[id="app-kolko"],
        .window.active:not(.minimized)[id^="app-tank"] {
            width: 100vw !important; height: calc(100vh - 48px) !important; left: 0 !important; top: 0 !important; max-height: none !important; transform: none !important; border-radius: 0 !important; display: flex !important; flex-direction: column !important;
        }

        .window[id^="app-pelzacz"] > div:nth-child(2), .window[id^="app-murarz"] > div:nth-child(2),
        .window[id^="app-ufoludki"] > div:nth-child(2), .window[id^="app-odbijanka"] > div:nth-child(2),
        .window[id^="app-trzepotek"] > div:nth-child(2), .window[id^="app-scigacz"] > div:nth-child(2),
        .window[id^="app-bombiarz"] > div:nth-child(2), .window[id="app-kolko"] > div:nth-child(2),
        .window[id^="app-tank"] > div:nth-child(2) {
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

// ---------------------------------------------------------
// NAPRAWA ZAMYKANIA GIER W TLE I WYŁĄCZANIA DŹWIĘKÓW
// ---------------------------------------------------------
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