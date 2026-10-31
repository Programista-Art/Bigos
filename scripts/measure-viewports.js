const http = require('http');
const fs = require('fs');
const path = require('path');
const playwright = require('playwright');

const root = path.resolve(__dirname, '..');
const PORT = 8792;
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

  const viewports = [
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: '1366x768', width: 1366, height: 768 },
    { name: '800x450', width: 800, height: 450 },
    { name: '360x640', width: 360, height: 640 }
  ];

  const appIds = ['pelzacz', 'trzepotek', 'murarz', 'ufoludki', 'odbijanka', 'tank', 'kalkulator', 'patrzalka', 'tabelarz'];

  const results = {};

  for (const vp of viewports) {
    console.log(`\n=================== VIEWPORT: ${vp.name} ===================`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
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

    results[vp.name] = {};

    for (const id of appIds) {
      const data = await page.evaluate(async (appId) => {
        localStorage.removeItem('bigos_win_' + appId);
        winManager.open(appId);
        
        if (appId === 'kalkulator' && typeof kalkulatorApp !== 'undefined') {
          kalkulatorApp.upgradeUI();
        } else if (typeof games !== 'undefined' && games[appId] && typeof games[appId].init === 'function') {
          try { games[appId].init(); } catch(e) {}
        }
        await new Promise(r => setTimeout(r, 100));

        const win = document.getElementById('app-' + appId) || document.getElementById(appId);
        const rect = win.getBoundingClientRect();
        const titleBar = win.querySelector('.title-bar');
        const titleBarRect = titleBar ? titleBar.getBoundingClientRect() : null;
        const taskbar = document.getElementById('taskbar');
        const taskbarRect = taskbar ? taskbar.getBoundingClientRect() : null;
        const contentContainer = win.querySelector('.p-4') || win.children[1];
        const isScrollable = contentContainer ? contentContainer.scrollHeight > contentContainer.clientHeight : false;
        
        const canvas = win.querySelector('canvas');
        const canvasRect = canvas ? canvas.getBoundingClientRect() : null;

        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          titleBarVisible: titleBarRect ? (titleBarRect.top >= 0 && titleBarRect.bottom <= window.innerHeight) : true,
          taskbarTop: taskbarRect ? Math.round(taskbarRect.top) : window.innerHeight - 48,
          fitsAboveTaskbar: taskbarRect ? rect.bottom <= taskbarRect.top : rect.bottom <= window.innerHeight - 48,
          marginAboveTaskbar: taskbarRect ? Math.round(taskbarRect.top - rect.bottom) : Math.round(window.innerHeight - 48 - rect.bottom),
          isScrollable,
          canvasRect: canvasRect ? {
            w: Math.round(canvasRect.width),
            h: Math.round(canvasRect.height),
            aspectRatio: +(canvasRect.width / canvasRect.height).toFixed(3)
          } : null
        };
      }, id);

      results[vp.name][id] = data;

      console.log(`[${vp.name}] ${id.padEnd(12)} -> ${data.width}x${data.height}px at (${data.left}, ${data.top}), bottom=${data.bottom}px, taskbarTop=${data.taskbarTop}px, margin=${data.marginAboveTaskbar}px, fits=${data.fitsAboveTaskbar}, scrollable=${data.isScrollable}`);
      if (data.canvasRect) {
        console.log(`      canvas: ${data.canvasRect.w}x${data.canvasRect.h} (aspect: ${data.canvasRect.aspectRatio})`);
      }

      // Capture screenshot
      const winEl = page.locator('#app-' + id);
      if (await winEl.isVisible()) {
        await winEl.screenshot({ path: path.join(root, 'screenshots', `vp-${vp.name}-${id}.png`) });
      }

      await page.evaluate((appId) => winManager.close(appId), id);
      await page.waitForTimeout(50);
    }

    await context.close();
  }

  await browser.close();
  server.close();

  fs.writeFileSync(path.join(root, 'screenshots', 'viewport-measurements.json'), JSON.stringify(results, null, 2));
  console.log('\nSaved measurements to screenshots/viewport-measurements.json');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
