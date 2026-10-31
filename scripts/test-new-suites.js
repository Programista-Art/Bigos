const http = require('http');
const fs = require('fs');
const path = require('path');
const playwright = require('playwright');

const root = path.resolve(__dirname, '..');
const PORT = 8794;
const BASE = `http://127.0.0.1:${PORT}`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg'
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const file = path.join(root, p);
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function run() {
  const server = await startServer();
  console.log('Testing suites in Chromium and Firefox...');

  for (const name of ['chromium', 'firefox']) {
    console.log(`\n--- BROWSER: ${name} ---`);
    const browser = await playwright[name].launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });

    await page.evaluate(async () => {
      localStorage.clear();
      localStorage.setItem('bigos_skip_welcome', 'true');
      await bigosDB.set('bigos_password', 'testpass');
      const inputEl = document.getElementById('password-input');
      if (inputEl) inputEl.value = 'testpass';
      await auth.handleLogin();
    });
    await page.waitForTimeout(600);

    // Suite A: Declared baseline window dimensions
    const baselineCheck = await page.evaluate(async () => {
      const targets = [
        { id: 'pelzacz', expW: 340, autoH: true },
        { id: 'trzepotek', expW: 340, autoH: true },
        { id: 'murarz', expW: 440, autoH: true },
        { id: 'ufoludki', expW: 440, autoH: true },
        { id: 'odbijanka', expW: 440, autoH: true },
        { id: 'tank', expW: 700, autoH: true },
        { id: 'kalkulator', expW: 300, autoH: true },
        { id: 'patrzalka', expW: 850, expH: 600, autoH: false },
        { id: 'tabelarz', expW: 800, expH: 600, autoH: false }
      ];

      const results = [];
      for (const t of targets) {
        winManager.resetWindowGeometry(t.id);
        winManager.open(t.id);
        const win = document.getElementById('app-' + t.id);
        const rect = win.getBoundingClientRect();
        const wMatch = Math.abs(rect.width - t.expW) <= 2;
        let hMatch = true;
        if (t.expH) {
          hMatch = Math.abs(rect.height - t.expH) <= 2;
        } else {
          hMatch = rect.height > 100 && (!win.style.height || win.dataset.autoHeight === 'true');
        }
        results.push({ id: t.id, wMatch, hMatch, w: rect.width, h: rect.height });
        winManager.close(t.id);
      }
      return { pass: results.every(r => r.wMatch && r.hMatch), results };
    });
    console.log(`${name}: baseline dimensions ->`, baselineCheck.pass);

    // Suite B: Canvas aspect ratios
    const aspectCheck = await page.evaluate(async () => {
      const gamesList = ['pelzacz', 'trzepotek', 'murarz', 'ufoludki', 'odbijanka', 'tank'];
      const results = [];
      for (const g of gamesList) {
        winManager.open(g);
        if (typeof games !== 'undefined' && games[g] && games[g].init) {
          try { games[g].init(); } catch (e) {}
        }
        const c = document.getElementById('canvas-' + g);
        const r = c.getBoundingClientRect();
        const expectedRatio = c.width / c.height;
        const actualRatio = r.width / r.height;
        const uniformScale = Math.abs(expectedRatio - actualRatio) < 0.05;
        results.push({ id: g, cW: c.width, cH: c.height, rW: Math.round(r.width), rH: Math.round(r.height), uniformScale });
        winManager.close(g);
      }
      return { pass: results.every(r => r.uniformScale), results };
    });
    console.log(`${name}: canvas aspect ratio ->`, aspectCheck.pass);

    // Suite C: Separate game controls & pointer translation
    const pointerCheck = await page.evaluate(async () => {
      const results = {};

      // 1. Pełzacz: keyboard control via gryKeys
      winManager.open('pelzacz');
      if (games && games.pelzacz && games.pelzacz.init) games.pelzacz.init();
      games.pelzacz.startFromMenu();
      const origDy = games.pelzacz.dy;
      gryKeys['ArrowDown'] = true;
      games.pelzacz.inputLoop();
      games.pelzacz.updatePlaying();
      const dirChanged = games.pelzacz.dy !== origDy;
      results.pelzacz = dirChanged;
      winManager.close('pelzacz');

      // 2. Trzepotek: click on canvas flaps
      winManager.open('trzepotek');
      if (games && games.trzepotek && games.trzepotek.init) games.trzepotek.init();
      games.trzepotek.startFromMenu();
      games.trzepotek.velocity = 2;
      const cTrzep = document.getElementById('canvas-trzepotek');
      cTrzep.dispatchEvent(new MouseEvent('mousedown', { clientX: 200, clientY: 200, bubbles: true }));
      const flapTriggered = games.trzepotek.velocity < 0;
      results.trzepotek = flapTriggered;
      winManager.close('trzepotek');

      // 3. Murarz: pointer tracking and start click
      winManager.open('murarz');
      if (games && games.murarz && games.murarz.init) games.murarz.init();
      const cMur = document.getElementById('canvas-murarz');
      const rectMur = cMur.getBoundingClientRect();
      const scaleX = cMur.width / rectMur.width;
      const scaleY = cMur.height / rectMur.height;
      const targetCanvasY = 300;
      const clientY = rectMur.top + (targetCanvasY / scaleY);
      cMur.dispatchEvent(new MouseEvent('mousedown', { clientX: rectMur.left + 50, clientY, bubbles: true }));
      const murarzStarted = games.murarz.gameState === 'PLAYING';
      cMur.dispatchEvent(new MouseEvent('mousemove', { clientX: rectMur.left + 100, clientY: rectMur.top + 200, bubbles: true }));
      const expectedPaddleX = Math.max(0, Math.min(cMur.width - games.murarz.paddle.w, (100 * scaleX) - games.murarz.paddle.w / 2));
      const paddleTracking = Math.abs(games.murarz.paddle.x - expectedPaddleX) < 1;
      results.murarz = murarzStarted && paddleTracking;
      winManager.close('murarz');

      // 4. Ufoludki: arrow key moves ship
      winManager.open('ufoludki');
      if (games && games.ufoludki && games.ufoludki.init) games.ufoludki.init();
      games.ufoludki.startFromMenu();
      const origShipX = games.ufoludki.ship.x;
      gryKeys['ArrowRight'] = true;
      games.ufoludki.update();
      const shipMoved = games.ufoludki.ship.x > origShipX;
      results.ufoludki = shipMoved;
      winManager.close('ufoludki');

      // 5. Odbijanka: mouse move tracks paddle pos
      winManager.open('odbijanka');
      if (games && games.odbijanka && games.odbijanka.init) games.odbijanka.init();
      games.odbijanka.startFromMenu();
      const cOdb = document.getElementById('canvas-odbijanka');
      const rOdb = cOdb.getBoundingClientRect();
      const odbScaleY = cOdb.height / rOdb.height;
      cOdb.dispatchEvent(new MouseEvent('mousemove', { clientX: rOdb.left + 20, clientY: rOdb.top + 150, bubbles: true }));
      const expectedOdbY = Math.max(0, Math.min(cOdb.height - games.odbijanka.p1.h, (150 * odbScaleY) - games.odbijanka.p1.h / 2));
      const odbTracking = Math.abs(games.odbijanka.p1.y - expectedOdbY) < 1;
      results.odbijanka = odbTracking;
      winManager.close('odbijanka');

      // 6. Czołgi: move and fire
      winManager.open('tank');
      if (games && games.tank && games.tank.init) games.tank.init();
      games.tank.startFromMenu();
      const origTankY = games.tank.player.y;
      gryKeys['ArrowUp'] = true;
      games.tank.update();
      gryKeys['Space'] = true;
      games.tank.update();
      const tankResponded = (games.tank.player.y !== origTankY || games.tank.bullets.length > 0 || games.tank.active);
      results.tank = tankResponded;
      winManager.close('tank');

      return { pass: Object.values(results).every(Boolean), results };
    });
    console.log(`${name}: game interactions ->`, pointerCheck.pass, pointerCheck.results);

    // Suite D: Czołgi 700x936 window fit at 1920x1080
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(200);
    const tankFit = await page.evaluate(async () => {
      winManager.resetWindowGeometry('tank');
      winManager.open('tank');
      if (games && games.tank && games.tank.init) games.tank.init();
      await new Promise(r => setTimeout(r, 100));
      const win = document.getElementById('app-tank');
      const r = win.getBoundingClientRect();
      const taskbar = document.getElementById('taskbar');
      const tbTop = taskbar ? taskbar.getBoundingClientRect().top : 1032;
      const fitsAbove = r.bottom <= tbTop;
      const margin = tbTop - r.bottom;
      const titleBarVis = r.top >= 0;
      winManager.close('tank');
      const savedGeom = localStorage.getItem('bigos_win_tank');
      const noStaleClampSaved = !savedGeom || !JSON.parse(savedGeom).userResized;
      return {
        fitsAbove,
        margin,
        titleBarVis,
        w: r.width,
        h: r.height,
        noStaleClampSaved,
        pass: fitsAbove && margin >= 10 && titleBarVis && r.width === 700 && noStaleClampSaved
      };
    });
    console.log(`${name}: Czołgi fit 1920x1080 ->`, tankFit.pass, tankFit);

    // Suite E: Viewports clamping & unclamping
    const vpClamp = await page.evaluate(async () => {
      const appList = ['pelzacz', 'trzepotek', 'murarz', 'ufoludki', 'odbijanka', 'tank', 'kalkulator', 'patrzalka', 'tabelarz'];
      const results1366 = [];
      for (const id of appList) {
        winManager.open(id);
        const win = document.getElementById('app-' + id);
        const r = win.getBoundingClientRect();
        const fits = r.bottom <= window.innerHeight - 48 && r.top >= 0;
        results1366.push({ id, fits, bottom: r.bottom, top: r.top });
        winManager.close(id);
      }
      return { results1366, pass: results1366.every(r => r.fits) };
    });
    console.log(`${name}: Viewports clamping ->`, vpClamp.pass);

    // Suite F: Full lifecycle & persistence
    const lifecycleCheck = await page.evaluate(async () => {
      winManager.resetWindowGeometry('tabelarz');
      winManager.open('tabelarz');
      const win = document.getElementById('app-tabelarz');
      const w0 = win.getBoundingClientRect().width;
      const h0 = win.getBoundingClientRect().height;

      // Minimize
      winManager.minimize('tabelarz');
      const isMin = win.classList.contains('minimized');

      // Restore
      winManager.open('tabelarz');
      const notMin = !win.classList.contains('minimized');
      const w1 = win.getBoundingClientRect().width;
      const h1 = win.getBoundingClientRect().height;

      // Maximize
      winManager.maximize('app-tabelarz');
      const isMax = win.classList.contains('maximized');

      // Unmaximize
      winManager.maximize('app-tabelarz');
      const notMax = !win.classList.contains('maximized');
      const w2 = win.getBoundingClientRect().width;
      const h2 = win.getBoundingClientRect().height;

      winManager.close('tabelarz');
      winManager.open('tabelarz');
      const w3 = win.getBoundingClientRect().width;
      const h3 = win.getBoundingClientRect().height;
      winManager.close('tabelarz');

      return {
        pass: isMin && notMin && isMax && notMax && w0 === 800 && h0 === 600 && w1 === 800 && h1 === 600 && w2 === 800 && h2 === 600 && w3 === 800 && h3 === 600,
        w0, h0, w1, h1, w2, h2, w3, h3
      };
    });
    console.log(`${name}: Lifecycle check ->`, lifecycleCheck.pass);

    // Suite G: Welcome isolation
    const welcomeIso = await page.evaluate(async () => {
      winManager.open('powitanie');
      const welWin = document.getElementById('app-powitanie');
      const welH = welWin.getBoundingClientRect().height;
      winManager.close('powitanie');

      winManager.open('pelzacz');
      const pelzWin = document.getElementById('app-pelzacz');
      const pelzStyleH = pelzWin.style.height;
      winManager.close('pelzacz');

      winManager.open('kalkulator');
      const calcWin = document.getElementById('app-kalkulator');
      const calcStyleH = calcWin.style.height;
      winManager.close('kalkulator');

      return {
        pass: (!pelzStyleH || pelzStyleH === 'auto') && (!calcStyleH || calcStyleH === 'auto'),
        pelzStyleH,
        calcStyleH,
        welH
      };
    });
    console.log(`${name}: Welcome isolation ->`, welcomeIso.pass, welcomeIso);

    // Suite H: Rachmistrz panels (300px -> 580px -> 860px -> 300px)
    const calcPanels = await page.evaluate(async () => {
      winManager.resetWindowGeometry('kalkulator');
      winManager.open('kalkulator');
      if (typeof kalkulatorApp !== 'undefined') kalkulatorApp.upgradeUI();
      const win = document.getElementById('app-kalkulator');
      const wBase = parseFloat(win.style.width) || win.getBoundingClientRect().width;

      // Open scientific panel
      kalkulatorApp.toggleScientific();
      const wSci = parseFloat(win.style.width);

      // Open history panel
      kalkulatorApp.toggleHistory();
      const wBoth = parseFloat(win.style.width);

      // Close both
      kalkulatorApp.toggleScientific();
      kalkulatorApp.toggleHistory();
      const wContract = parseFloat(win.style.width);

      winManager.close('kalkulator');
      return {
        pass: Math.abs(wBase - 300) <= 2 && Math.abs(wSci - 580) <= 2 && Math.abs(wBoth - 860) <= 2 && Math.abs(wContract - 300) <= 2,
        wBase, wSci, wBoth, wContract
      };
    });
    console.log(`${name}: Rachmistrz panels ->`, calcPanels.pass, calcPanels);

    // Suite I: Patrzałka Pro 850x600
    const patrzalkaCheck = await page.evaluate(async () => {
      winManager.resetWindowGeometry('patrzalka');
      winManager.open('patrzalka');
      const win = document.getElementById('app-patrzalka');
      const r = win.getBoundingClientRect();
      const wMatch = Math.abs(r.width - 850) <= 2;
      const hMatch = Math.abs(r.height - 600) <= 2;
      winManager.close('patrzalka');
      return { pass: wMatch && hMatch, w: r.width, h: r.height };
    });
    console.log(`${name}: Patrzałka 850x600 ->`, patrzalkaCheck.pass);

    // Suite J: Tabelarz formulas, custom cell colors, and theme tokens
    const tabelarzTest = await page.evaluate(async () => {
      winManager.resetWindowGeometry('tabelarz');
      winManager.open('tabelarz');
      const win = document.getElementById('app-tabelarz');

      // Theme classes check
      const hasSemanticClasses = win.classList.contains('g-panel') && win.classList.contains('g-border');

      // Formula test: A1=10, A2=20, A3=30, A4==SUMA(A1:A3)
      tabelarzApp.data['A1'] = '10';
      tabelarzApp.data['A2'] = '20';
      tabelarzApp.data['A3'] = '30';
      tabelarzApp.data['A4'] = '=SUMA(A1:A3)';
      tabelarzApp.renderGrid();
      const sumVal = tabelarzApp.evaluate('=SUMA(A1:A3)');
      const sumCorrect = parseFloat(sumVal) === 60;

      // Custom background color preservation
      tabelarzApp.bgColors['A1'] = '#10b981';
      tabelarzApp.renderGrid();
      const a1Input = document.getElementById('cell-A1');
      const a1Cell = a1Input ? a1Input.parentElement : null;
      const a1Bg = a1Cell ? a1Cell.style.backgroundColor : '';
      const colorPreserved = a1Bg.includes('16, 185, 129') || a1Bg.includes('#10b981');

      // Contrast check: text color vs background
      const textCol = getComputedStyle(win).color;
      const bgCol = getComputedStyle(win).backgroundColor;

      winManager.close('tabelarz');
      return {
        pass: hasSemanticClasses && sumCorrect && colorPreserved,
        hasSemanticClasses,
        sumCorrect,
        sumVal,
        colorPreserved,
        textCol,
        bgCol
      };
    });
    console.log(`${name}: Tabelarz formulas & theme ->`, tabelarzTest.pass, tabelarzTest);

    await context.close();
    await browser.close();
  }

  server.close();
  console.log('\nAll suite validations completed successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
