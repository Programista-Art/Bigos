const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve('.');
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  const file = path.join(root, p);
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(8767, '127.0.0.1', async () => {
  try {
    const b = await chromium.launch({ headless: true });
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
    await p.goto('http://127.0.0.1:8767/index.html');
    await p.evaluate(async () => {
      localStorage.setItem('bigos_password', 'test');
    });
    await p.fill('#password-input', 'test');
    await p.click('button[onclick="auth.handleLogin()"]');
    await p.waitForTimeout(1500);

    const elements = await p.evaluate(() => {
      return Array.from(document.querySelectorAll('*')).filter(el => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const isVisible = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        return isVisible;
      }).map(el => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          tag: el.tagName,
          id: el.id,
          className: String(el.className),
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
          borderRadius: style.borderRadius,
          border: style.border,
          boxShadow: style.boxShadow,
          background: style.backgroundColor,
          zIndex: style.zIndex,
          text: (el.innerText || '').slice(0, 25)
        };
      });
    });

    console.log('All elements near top right (x > 900, y < 250):');
    const topRight = elements.filter(e => e.rect.x > 900 && e.rect.y < 250);
    console.log(JSON.stringify(topRight, null, 2));

    await p.screenshot({ path: 'test-desktop.png' });
    await b.close();
  } catch (err) {
    console.error(err);
  } finally {
    server.close();
  }
});
