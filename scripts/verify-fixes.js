const http = require('http');
const fs = require('fs');
const path = require('path');
const playwright = require('playwright');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const PORT = 8789;
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
  const browser = await playwright.chromium.launch({ headless: true });
  
  if (!fs.existsSync(path.join(root, 'screenshots'))) {
    fs.mkdirSync(path.join(root, 'screenshots'), { recursive: true });
  }

  const appsToTest = [
    { id: 'pelzacz', elId: 'app-pelzacz', expectedW: 340, contentDriven: true },
    { id: 'trzepotek', elId: 'app-trzepotek', expectedW: 340, contentDriven: true },
    { id: 'murarz', elId: 'app-murarz', expectedW: 440, contentDriven: true },
    { id: 'ufoludki', elId: 'app-ufoludki', expectedW: 440, contentDriven: true },
    { id: 'odbijanka', elId: 'app-odbijanka', expectedW: 440, contentDriven: true },
    { id: 'tank', elId: 'app-tank', expectedW: 700, contentDriven: true },
    { id: 'kalkulator', elId: 'app-kalkulator', expectedW: 300, contentDriven: true },
    { id: 'patrzalka', elId: 'app-patrzalka', expectedW: 850, expectedH: 600, contentDriven: false },
    { id: 'tabelarz', elId: 'app-tabelarz', expectedW: 800, expectedH: 600, contentDriven: false }
  ];

  console.log('====================================================');
  console.log('1. VERIFYING APPS AT 1920x1080');
  console.log('====================================================');

  const ctx1080 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page1080 = await ctx1080.newPage();
  await page1080.goto(BASE + '/index.html', { waitUntil: 'networkidle' });

  // Login
  await page1080.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem('bigos_skip_welcome', 'true');
    await bigosDB.set('bigos_password', 'testpass');
    const inputEl = document.getElementById('password-input');
    if (inputEl) inputEl.value = 'testpass';
    await auth.handleLogin();
  });
  await page1080.waitForTimeout(700);

  for (const app of appsToTest) {
    const report = await page1080.evaluate(async (cfg) => {
      localStorage.removeItem('bigos_win_' + cfg.id);
      winManager.open(cfg.id);
      
      // If game has init method, trigger it to verify game init doesn't blow up window to 700px
      if (cfg.id === 'kalkulator' && typeof kalkulatorApp !== 'undefined') {
        kalkulatorApp.upgradeUI();
      } else if (typeof games !== 'undefined' && games[cfg.id] && typeof games[cfg.id].init === 'function') {
        try { games[cfg.id].init(); } catch(e) {}
      }

      const win = document.getElementById(cfg.elId);
      const styleW = win.style.width;
      const styleH = win.style.height;
      const renderedW = win.offsetWidth;
      const renderedH = win.offsetHeight;
      const savedGeom = localStorage.getItem('bigos_win_' + cfg.id);

      return { styleW, styleH, renderedW, renderedH, savedGeom };
    }, app);

    console.log(`[1920x1080] ${app.id.padEnd(12)} -> width: ${report.renderedW}px (expected ${app.expectedW}px), height: ${report.renderedH}px (expected: ${app.expectedH ? app.expectedH + 'px' : 'content-driven auto'}), styleH: "${report.styleH}", saved: ${report.savedGeom}`);

    assert.strictEqual(report.renderedW, app.expectedW, `App ${app.id} rendered width should be ${app.expectedW}px`);
    if (app.expectedH) {
      assert.strictEqual(report.renderedH, app.expectedH, `App ${app.id} rendered height should be ${app.expectedH}px`);
    } else {
      assert.ok(report.renderedH > 200, `App ${app.id} should have natural height > 200px`);
      // Content-driven windows should not have forced inline 400px height or persisted forced height
      assert.notStrictEqual(report.styleH, '400px', `App ${app.id} should not have forced 400px inline height`);
    }

    const winLocator = page1080.locator('#' + app.elId);
    await winLocator.screenshot({ path: path.join(root, 'screenshots', `after-1920-${app.id}.png`) });

    await page1080.evaluate((id) => winManager.close(id), app.id);
    await page1080.waitForTimeout(100);
  }

  console.log('\n====================================================');
  console.log('2. VERIFYING APPS AT 3440x1440 (ULTRAWIDE)');
  console.log('====================================================');

  const ctx3440 = await browser.newContext({ viewport: { width: 3440, height: 1440 } });
  const page3440 = await ctx3440.newPage();
  await page3440.goto(BASE + '/index.html', { waitUntil: 'networkidle' });

  await page3440.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem('bigos_skip_welcome', 'true');
    await bigosDB.set('bigos_password', 'testpass');
    const inputEl = document.getElementById('password-input');
    if (inputEl) inputEl.value = 'testpass';
    await auth.handleLogin();
  });
  await page3440.waitForTimeout(700);

  for (const app of appsToTest) {
    const report = await page3440.evaluate(async (cfg) => {
      winManager.open(cfg.id);
      if (cfg.id === 'kalkulator' && typeof kalkulatorApp !== 'undefined') {
        kalkulatorApp.upgradeUI();
      } else if (typeof games !== 'undefined' && games[cfg.id] && typeof games[cfg.id].init === 'function') {
        try { games[cfg.id].init(); } catch(e) {}
      }
      const win = document.getElementById(cfg.elId);
      const renderedW = win.offsetWidth;
      const renderedH = win.offsetHeight;
      const left = parseFloat(win.style.left);
      const top = parseFloat(win.style.top);
      return { renderedW, renderedH, left, top };
    }, app);

    console.log(`[3440x1440] ${app.id.padEnd(12)} -> width: ${report.renderedW}px, height: ${report.renderedH}px, left: ${report.left}px, top: ${report.top}px`);
    assert.strictEqual(report.renderedW, app.expectedW, `App ${app.id} on 3440x1440 should maintain width ${app.expectedW}px`);
    
    // Check centering on ultrawide
    const expectedLeft = Math.round((3440 - app.expectedW) / 2);
    assert.ok(Math.abs(report.left - expectedLeft) <= 2, `App ${app.id} should be horizontally centered on ultrawide`);

    const winLocator = page3440.locator('#' + app.elId);
    await winLocator.screenshot({ path: path.join(root, 'screenshots', `after-3440-${app.id}.png`) });

    await page3440.evaluate((id) => winManager.close(id), app.id);
    await page3440.waitForTimeout(100);
  }

  console.log('\n====================================================');
  console.log('3. VERIFYING VIEWPORT CLAMPING & UNCLAMPING');
  console.log('====================================================');

  // Open on small screen (360x640)
  const ctxMobile = await browser.newContext({ viewport: { width: 360, height: 640 } });
  const pageMobile = await ctxMobile.newPage();
  await pageMobile.goto(BASE + '/index.html', { waitUntil: 'networkidle' });

  await pageMobile.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem('bigos_skip_welcome', 'true');
    await bigosDB.set('bigos_password', 'testpass');
    const inputEl = document.getElementById('password-input');
    if (inputEl) inputEl.value = 'testpass';
    await auth.handleLogin();
  });
  await pageMobile.waitForTimeout(700);

  // Test Patrzałka (850x600) and Tabelarz (800x600) on 360x640
  const mobileClampReport = await pageMobile.evaluate(() => {
    winManager.open('patrzalka');
    const win = document.getElementById('app-patrzalka');
    const clampedW = win.offsetWidth;
    const clampedH = win.offsetHeight;
    const savedGeom = localStorage.getItem('bigos_win_patrzalka');
    
    // Close it
    winManager.close('patrzalka');

    return { clampedW, clampedH, savedGeom };
  });

  console.log(`[Mobile Clamp 360x640] Patrzałka clamped to ${mobileClampReport.clampedW}x${mobileClampReport.clampedH}, savedGeom: ${mobileClampReport.savedGeom}`);
  assert.ok(mobileClampReport.clampedW <= 360, 'Clamped width should fit within 360px screen');
  // Crucial: clamped width should NOT be persisted to localStorage since user didn't manually resize
  assert.strictEqual(mobileClampReport.savedGeom, null, 'Clamped geometry must NOT be persisted to localStorage without userResized');

  // Now reopen Patrzałka after resizing viewport back to 1920x1080:
  await pageMobile.setViewportSize({ width: 1920, height: 1080 });
  const restoredReport = await pageMobile.evaluate(() => {
    winManager.open('patrzalka');
    const win = document.getElementById('app-patrzalka');
    return { w: win.offsetWidth, h: win.offsetHeight };
  });
  console.log(`[Restored on 1920x1080] Patrzałka restored to ${restoredReport.w}x${restoredReport.h}`);
  assert.strictEqual(restoredReport.w, 850, 'Patrzałka must restore to declared 850px');
  assert.strictEqual(restoredReport.h, 600, 'Patrzałka must restore to declared 600px');

  console.log('\n====================================================');
  console.log('4. VERIFYING TABELARZ THEME INTEGRATION & USER CELL FORMATS');
  console.log('====================================================');

  await page1080.evaluate(() => {
    winManager.open('tabelarz');
    if (typeof tabelarzApp !== 'undefined') {
      tabelarzApp.init();
      // Apply user background color to cell A1
      tabelarzApp.selected = 'A1';
      tabelarzApp.applyColor('#ffff00'); // Yellow
    }
  });
  await page1080.waitForTimeout(300);

  const initialTabelarz = await page1080.evaluate(() => {
    const win = document.getElementById('app-tabelarz');
    const inputA1 = win.querySelector('#cell-A1');
    const tdA1 = inputA1 ? inputA1.closest('td') : null;
    return {
      classes: win.className,
      hasThemedApp: win.classList.contains('themed-app'),
      hasGPanel: win.classList.contains('g-panel'),
      a1Bg: tdA1 ? tdA1.style.backgroundColor : null,
      customColorSaved: tabelarzApp.bgColors['A1']
    };
  });
  console.log('Tabelarz initial themed state:', initialTabelarz);
  assert.ok(initialTabelarz.hasThemedApp, 'Tabelarz must have themed-app class');
  assert.ok(initialTabelarz.hasGPanel, 'Tabelarz must have g-panel class');
  assert.strictEqual(initialTabelarz.customColorSaved, '#ffff00', 'Cell A1 custom color should be saved');

  // Switch to Dracula theme
  console.log('Switching to Dracula theme...');
  await page1080.evaluate(() => themeManager.setColor('color-dracula'));
  await page1080.waitForTimeout(200);

  const draculaTabelarz = await page1080.evaluate(() => {
    const win = document.getElementById('app-tabelarz');
    const inputA1 = win.querySelector('#cell-A1');
    const tdA1 = inputA1 ? inputA1.closest('td') : null;
    const inputB1 = win.querySelector('#cell-B1');
    const tdB1 = inputB1 ? inputB1.closest('td') : null;
    return {
      windowBg: window.getComputedStyle(win).backgroundColor,
      a1Bg: tdA1 ? tdA1.style.backgroundColor : null,
      b1Bg: tdB1 ? window.getComputedStyle(tdB1).backgroundColor : null
    };
  });
  console.log('Tabelarz in Dracula theme:', draculaTabelarz);
  assert.strictEqual(draculaTabelarz.a1Bg, 'rgb(255, 255, 0)', 'User custom yellow background on A1 must be preserved over theme switch');

  // Switch to Light theme
  console.log('Switching to Light theme...');
  await page1080.evaluate(() => themeManager.setColor('color-light'));
  await page1080.waitForTimeout(200);

  const lightTabelarz = await page1080.evaluate(() => {
    const win = document.getElementById('app-tabelarz');
    const inputA1 = win.querySelector('#cell-A1');
    const tdA1 = inputA1 ? inputA1.closest('td') : null;
    return {
      windowBg: window.getComputedStyle(win).backgroundColor,
      a1Bg: tdA1 ? tdA1.style.backgroundColor : null
    };
  });
  console.log('Tabelarz in Light theme:', lightTabelarz);
  assert.strictEqual(lightTabelarz.a1Bg, 'rgb(255, 255, 0)', 'User custom yellow background on A1 must still be preserved in Light theme');

  // Capture screenshot of themed Tabelarz with custom cell
  const tabelarzLocator = page1080.locator('#app-tabelarz');
  await tabelarzLocator.screenshot({ path: path.join(root, 'screenshots', 'after-tabelarz-themed.png') });

  console.log('\n====================================================');
  console.log('5. VERIFYING RACHMISTRZ PRO EXPANSIONS (300px -> 580px -> 860px)');
  console.log('====================================================');

  const calcReport = await page1080.evaluate(async () => {
    winManager.open('kalkulator');
    kalkulatorApp.upgradeUI();
    const win = document.getElementById('app-kalkulator');
    const wBase = win.offsetWidth;

    kalkulatorApp.toggleScientific();
    await new Promise(r => setTimeout(r, 350));
    const wSci = win.offsetWidth;

    kalkulatorApp.toggleHistory();
    await new Promise(r => setTimeout(r, 350));
    const wBoth = win.offsetWidth;

    kalkulatorApp.toggleScientific();
    await new Promise(r => setTimeout(r, 350));
    const wHistOnly = win.offsetWidth;

    kalkulatorApp.toggleHistory();
    await new Promise(r => setTimeout(r, 350));
    const wBack = win.offsetWidth;

    return { wBase, wSci, wBoth, wHistOnly, wBack };
  });

  console.log('Rachmistrz PRO width toggles:', calcReport);
  assert.strictEqual(calcReport.wBase, 300, 'Base width must be 300px');
  assert.strictEqual(calcReport.wSci, 580, '1 panel open must be 580px');
  assert.ok(Math.abs(calcReport.wBoth - 860) <= 2, `Both panels open must be ~860px (got ${calcReport.wBoth})`);
  assert.strictEqual(calcReport.wHistOnly, 580, 'History panel only must be 580px');
  assert.strictEqual(calcReport.wBack, 300, 'All panels closed must return to 300px');

  await browser.close();
  server.close();
  console.log('\n ALL CHECKS PASSED SUCCESSFULLY!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
