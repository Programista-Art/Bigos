const http = require('http');
const fs = require('fs');
const path = require('path');
const playwright = require('playwright');

const root = path.resolve(__dirname, '..');
const PORT = 8788;
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

  console.log('=== REPRODUCTION TEST ON 1920x1080 ===');
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });

  // Login
  await page.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem('bigos_skip_welcome', 'true');
    await bigosDB.set('bigos_password', 'testpass');
    const inputEl = document.getElementById('password-input');
    if (inputEl) inputEl.value = 'testpass';
    await auth.handleLogin();
  });
  await page.waitForTimeout(700);

  for (const app of appsToTest) {
    const report = await page.evaluate(async (cfg) => {
      // Clear any stored geom
      localStorage.removeItem('bigos_win_' + cfg.id);
      
      const win = document.getElementById(cfg.elId);
      const initialStyleW = win.style.width;
      const initialStyleH = win.style.height;
      const initialPrefW = win.dataset.prefW;
      const initialPrefH = win.dataset.prefH;
      const initialAutoHeight = win.dataset.autoHeight;

      // Open window
      winManager.open(cfg.id);

      const openedStyleW = win.style.width;
      const openedStyleH = win.style.height;
      const openedPrefW = win.dataset.prefW;
      const openedPrefH = win.dataset.prefH;
      const openedRect = {
        width: win.offsetWidth,
        height: win.offsetHeight,
        clientWidth: win.clientWidth,
        clientHeight: win.clientHeight
      };
      const savedGeomAfterOpen = localStorage.getItem('bigos_win_' + cfg.id);

      return {
        initial: { styleW: initialStyleW, styleH: initialStyleH, prefW: initialPrefW, prefH: initialPrefH, autoH: initialAutoHeight },
        afterOpen: { styleW: openedStyleW, styleH: openedStyleH, prefW: openedPrefW, prefH: openedPrefH, rect: openedRect, savedGeom: savedGeomAfterOpen }
      };
    }, app);

    console.log(`\nApp [${app.id}]:`);
    console.log(`  Initial in DOM: styleW="${report.initial.styleW}", styleH="${report.initial.styleH}", prefW="${report.initial.prefW}", prefH="${report.initial.prefH}", autoH="${report.initial.autoH}"`);
    console.log(`  After winManager.open: styleW="${report.afterOpen.styleW}", styleH="${report.afterOpen.styleH}", prefW="${report.afterOpen.prefW}", prefH="${report.afterOpen.prefH}"`);
    console.log(`  Rendered Rect: width=${report.afterOpen.rect.width} (expected ~${app.expectedW}), height=${report.afterOpen.rect.height}${app.expectedH ? ` (expected ~${app.expectedH})` : ' (content-driven)'}`);
    console.log(`  Saved in localStorage: ${report.afterOpen.savedGeom}`);

    // Take screenshot of window
    const winLocator = page.locator('#' + app.elId);
    if (await winLocator.isVisible()) {
      await winLocator.screenshot({ path: path.join(root, 'screenshots', `before-reproduce-${app.id}.png`) });
    }

    // Now close
    await page.evaluate((id) => winManager.close(id), app.id);
    await page.waitForTimeout(100);
  }

  // Also inspect Tabelarz theming specifically:
  console.log('\n=== TABELARZ THEME AUDIT ===');
  await page.evaluate(() => winManager.open('tabelarz'));
  await page.waitForTimeout(300);
  const tabelarzThemeReport = await page.evaluate(() => {
    const win = document.getElementById('app-tabelarz');
    const titleBar = win.querySelector('.title-bar');
    const header = win.querySelector('#tabelarz-header');
    const grid = win.querySelector('#tabelarz-grid');
    const toolbar = win.querySelector('.p-2.flex');
    const sampleTh = win.querySelector('#tabelarz-headers th');
    const sampleTd = win.querySelector('#tabelarz-body td');

    return {
      windowClasses: win.className,
      titleBarClasses: titleBar ? titleBar.className : null,
      toolbarClasses: toolbar ? toolbar.className : null,
      titleBarBg: titleBar ? window.getComputedStyle(titleBar).backgroundColor : null,
      titleBarColor: titleBar ? window.getComputedStyle(titleBar).color : null,
      windowBg: window.getComputedStyle(win).backgroundColor,
      sampleThBg: sampleTh ? window.getComputedStyle(sampleTh).backgroundColor : null,
      sampleTdBg: sampleTd ? window.getComputedStyle(sampleTd).backgroundColor : null
    };
  });
  console.log(JSON.stringify(tabelarzThemeReport, null, 2));

  // Test theme switch for Tabelarz:
  await page.evaluate(() => {
    themeManager.setTheme('dracula');
  });
  await page.waitForTimeout(200);
  const tabelarzThemeDracula = await page.evaluate(() => {
    const win = document.getElementById('app-tabelarz');
    const titleBar = win.querySelector('.title-bar');
    return {
      windowBg: window.getComputedStyle(win).backgroundColor,
      titleBarBg: titleBar ? window.getComputedStyle(titleBar).backgroundColor : null
    };
  });
  console.log('After switching to dracula theme:');
  console.log(JSON.stringify(tabelarzThemeDracula, null, 2));

  await browser.close();
  server.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
