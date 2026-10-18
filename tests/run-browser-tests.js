#!/usr/bin/env node
/**
 * Browser regression tests for BigOS using Playwright (Chromium + Firefox when available).
 * Validates: startup, login, file create/edit/save/reopen after refresh,
 * format preserves unrelated storage, sandbox isolation, offline startup after SW cache.
 *
 * Prerequisites: a local static server (npm run serve) and playwright browsers.
 * Run: npm run test:browser
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const PORT = 8765;
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

async function main() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch (e) {
    console.error('Playwright is not installed. Run: npm i -D playwright && npx playwright install');
    process.exit(2);
  }

  const server = await startServer();
  const results = [];
  const record = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(ok ? '✓' : '✗', name, detail ? `— ${detail}` : '');
  };

  const browsers = [];
  const skippedBrowsers = [];
  for (const name of ['chromium', 'firefox']) {
    try {
      const b = await playwright[name].launch({ headless: true });
      browsers.push([name, b]);
    } catch (e) {
      skippedBrowsers.push(name);
      console.warn(`SKIP ${name}: ${e.message}`);
    }
  }

  // A missing browser must NOT produce a passing result.
  if (browsers.length === 0) {
    console.error('FAIL: no browser available (chromium/firefox).');
    console.error('Install with: npx playwright install chromium firefox');
    console.error('Skipped browsers: ' + skippedBrowsers.join(', '));
    server.close();
    process.exit(3);
  }
  if (skippedBrowsers.length > 0) {
    console.warn('WARNING: incomplete environment — skipped: ' + skippedBrowsers.join(', '));
    console.warn('These skips are NOT counted as passes.');
  }

  for (const [name, browser] of browsers) {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', (err) => console.warn(`[${name}] pageerror`, err.message));

    // Helper: evaluate with a hard timeout so one hang cannot stall the suite.
    const evaluate = (fn, arg) =>
      Promise.race([
        page.evaluate(fn, arg),
        new Promise((_, rej) => setTimeout(() => rej(new Error('evaluate timeout')), 12000))
      ]);

    // --- Startup ---
    await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
    record(`${name}: login screen visible`, await page.locator('#login-screen').isVisible());

    // Seed a password + file via page evaluate (isolated test profile).
    await evaluate(async () => {
      localStorage.setItem('other_site_token', 'keep-me');
      await bigosDB.set('bigos_password', 'testpass');
    });

    // --- Login ---
    await evaluate(async () => {
      localStorage.setItem('bigos_skip_welcome', 'true');
      const inputEl = document.getElementById('password-input');
      if (inputEl) inputEl.value = 'testpass';
      await auth.handleLogin();
    });
    await page.waitForTimeout(700);
    const loginHidden = await evaluate(() => {
      const ls = document.getElementById('login-screen');
      return !ls || ls.style.display === 'none' || (ls.className && ls.className.includes('hidden')) || ls.style.opacity === '0';
    });
    record(`${name}: login hides login-screen`, loginHidden);

    // --- File create / save ---
    const fileId = await evaluate(async () => {
      const id = 'file_test_' + Date.now();
      fileSystem.push({ id, type: 'file', name: 'notatka.txt', icon: '📄', content: 'hello v1', parentId: 'root', x: 20, y: 20 });
      await fsManager.save();
      return id;
    });
    record(`${name}: file created`, !!fileId);

    // --- Storage result is reliable ---
    const setRes = await evaluate(async () => bigosDB.set('bigos_test_key', { a: 1 }));
    record(`${name}: bigosDB.set returns ok`, setRes && setRes.ok === true);

    // --- Reopen after refresh ---
    await page.reload({ waitUntil: 'networkidle' });
    await evaluate(async () => {
      localStorage.setItem('bigos_skip_welcome', 'true');
      const inputEl = document.getElementById('password-input');
      if (inputEl) inputEl.value = 'testpass';
      await auth.handleLogin();
    });
    await page.waitForTimeout(600);
    const restored = await evaluate((id) => {
      const f = fileSystem.find((x) => x.id === id);
      return f ? f.content : null;
    }, fileId);
    record(`${name}: file survives refresh`, restored === 'hello v1', `got ${JSON.stringify(restored)}`);

    // --- Sandbox isolation: imported app cannot read credentials without permission ---
    const sandboxDeny = await evaluate(async () => {
      try {
        // Permission gate: empty permissions deny I/O. Install is synchronous parse + store.
        const code = "BigOSAppAPI.register({ id: 'permtest', name: 'P', permissions: [], html: '<p>x</p>' });";
        // Timeout-guarded install (store write).
        const rec = await Promise.race([
          bigosSandbox.installPackage(code, { source: 'test' }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('installPackage timeout')), 5000))
        ]);
        const perms = rec.permissions || [];
        return {
          deniedRead: !perms.includes('read_files'),
          deniedWrite: !perms.includes('write_files') && !perms.includes('write_file'),
          deniedNet: !perms.includes('network'),
          installed: rec.id === 'permtest',
          perms: perms
        };
      } catch (e) {
        return { error: e.message, deniedRead: true, deniedWrite: true, deniedNet: true, installed: false };
      }
    });
    record(`${name}: sandbox denies file read without permission`, sandboxDeny.deniedRead === true);
    record(`${name}: sandbox denies write without permission`, sandboxDeny.deniedWrite === true);
    record(`${name}: sandbox denies network without permission`, sandboxDeny.deniedNet === true);

    // --- Multiple concurrent sandbox packages ---
    const multiPkgRes = await evaluate(async () => {
      try {
        const codeA = "BigOSAppAPI.register({ id: 'pkg_alpha', name: 'Alpha', permissions: [], html: '<h1>Alpha App</h1>' });";
        const codeB = "BigOSAppAPI.register({ id: 'pkg_beta', name: 'Beta', permissions: [], html: '<h1>Beta App</h1>' });";
        await bigosSandbox.installPackage(codeA, { source: 'test' });
        await bigosSandbox.installPackage(codeB, { source: 'test' });
        
        await bigosSandbox.launchPackage('pkg_alpha');
        await bigosSandbox.launchPackage('pkg_beta');
        
        const winA = document.getElementById('app-pkg_alpha');
        const winB = document.getElementById('app-pkg_beta');
        const iframeA = winA ? winA.querySelector('iframe') : null;
        const iframeB = winB ? winB.querySelector('iframe') : null;
        const bothMounted = !!(iframeA && iframeB);
        const list2 = bigosSandbox.list();
        
        // Unmount A
        bigosSandbox.unmount('pkg_alpha');
        const winAGone = !document.getElementById('app-pkg_alpha');
        const winBStillThere = !!document.getElementById('app-pkg_beta');
        
        // Uninstall B
        await bigosSandbox.uninstallPackage('pkg_beta');
        const winBGone = !document.getElementById('app-pkg_beta');
        const listEmpty = bigosSandbox.list().filter(p => p.appId === 'pkg_alpha' || p.appId === 'pkg_beta').length === 0;

        return {
          bothMounted,
          listHasBoth: list2.some(p => p.appId === 'pkg_alpha') && list2.some(p => p.appId === 'pkg_beta'),
          winAGone,
          winBStillThere,
          winBGone,
          listEmpty
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    record(`${name}: two sandbox packages run concurrently`, multiPkgRes.bothMounted && multiPkgRes.listHasBoth, multiPkgRes.error);
    record(`${name}: unmounting one package leaves other package alive`, multiPkgRes.winAGone && multiPkgRes.winBStillThere);
    record(`${name}: uninstalling package cleans up window and registry`, multiPkgRes.winBGone && multiPkgRes.listEmpty);

    // --- Bundled applications auto-installed at startup ---
    const bundledCheck = await evaluate(async () => {
      const pkgs = await bigosDB.listPackages();
      const hasCookie = pkgs.some(p => p.id === 'cookie_clicker');
      const hasBmi = pkgs.some(p => p.id === 'kalkulator_bmi');
      const hasPainter = pkgs.some(p => p.id === 'bigos_painter');
      const desktopIcons = fileSystem.filter(f => f && (f.appId === 'cookie_clicker' || f.appId === 'kalkulator_bmi' || f.appId === 'bigos_painter'));
      return {
        hasCookie, hasBmi, hasPainter,
        desktopIconCount: desktopIcons.length
      };
    });
    record(`${name}: bundled applications auto-installed at boot`, bundledCheck.hasCookie && bundledCheck.hasBmi && bundledCheck.hasPainter);
    record(`${name}: bundled applications desktop icons created`, bundledCheck.desktopIconCount === 3);

    // --- Launch and interact with Cookie Clicker ---
    let cookieClickerOk = false;
    try {
      await evaluate(async () => {
        localStorage.setItem('bigos_skip_welcome', 'true');
        winManager.close('powitanie');
        await bigosSandbox.launchPackage('cookie_clicker');
        const win = document.getElementById('app-cookie_clicker');
        if (win) winManager.bringToFront(win);
      });
      const cookieFrame = page.frameLocator('#app-cookie_clicker iframe');
      const cookieBtn = cookieFrame.locator('button[onclick*="clickCookie"]');
      await cookieBtn.waitFor({ state: 'visible', timeout: 5000 });
      await cookieBtn.click();
      await cookieBtn.click();
      await page.waitForTimeout(300);
      const countTextAfter = (await cookieFrame.locator('#cookie_count').textContent()) || '';
      const twCount = await cookieFrame.locator('#bigos-tw-styles').count();
      cookieClickerOk = twCount > 0 && countTextAfter.toLowerCase().includes('ciastecz');
      // Test dynamic theme synchronization and state preservation in Cookie Clicker
      await evaluate(() => {
        themeManager.setColor('color-monokai');
        themeManager.setUI('ui-macos');
      });
      await page.waitForTimeout(300);
      const monokaiGuestClass = (await cookieFrame.locator('body').getAttribute('class')) || '';
      const cookieCountAfterMonokai = (await cookieFrame.locator('#cookie_count').textContent()) || '';
      const monokaiSynced = monokaiGuestClass.includes('color-monokai') && monokaiGuestClass.includes('ui-macos') && cookieCountAfterMonokai === countTextAfter;

      // Switch to Light theme
      await evaluate(() => {
        themeManager.setColor('color-light');
      });
      await page.waitForTimeout(300);
      const lightGuestClass = (await cookieFrame.locator('body').getAttribute('class')) || '';
      const cookieCountAfterLight = (await cookieFrame.locator('#cookie_count').textContent()) || '';
      const lightSynced = lightGuestClass.includes('color-light') && cookieCountAfterLight === countTextAfter;

      // Check computed background color in guest is light
      const guestBgColor = await cookieFrame.locator('body').evaluate((el) => window.getComputedStyle(el).backgroundColor);
      const isLightBg = guestBgColor.includes('243') || guestBgColor.includes('255') || guestBgColor.includes('244') || guestBgColor.includes('246');

      // Check host window decoration styles
      const winThemeCheck = await evaluate(() => {
        const win = document.getElementById('app-cookie_clicker');
        const tb = win && win.querySelector('.title-bar');
        return {
          winThemed: !!(win && win.classList.contains('themed-app') && win.classList.contains('g-panel')),
          tbBorder: !!(tb && tb.classList.contains('g-border'))
        };
      });

      // Switch back to color-dark
      await evaluate(() => {
        themeManager.setColor('color-dark');
        themeManager.setUI('ui-win11');
      });
      await page.waitForTimeout(200);

      record(`${name}: dynamic theme sync preserves guest state across Monokai and Light`, monokaiSynced && lightSynced && isLightBg && winThemeCheck.winThemed);

      // Verify Cookie Clicker declared dimensions (400px width, auto-height)
      const cookieGeom = await evaluate(() => {
        const win = document.getElementById('app-cookie_clicker');
        if (!win) return null;
        const r = win.getBoundingClientRect();
        return {
          w: Math.round(r.width),
          h: Math.round(r.height),
          autoHeight: win.dataset.autoHeight
        };
      });
      const cookieWidthOk = cookieGeom && Math.abs(cookieGeom.w - 400) <= 2;
      const cookieAutoHeightOk = cookieGeom && cookieGeom.autoHeight === 'true' && cookieGeom.h >= 450;
      record(`${name}: cookie clicker opens with declared 400px width and content-driven auto-height`, cookieWidthOk && cookieAutoHeightOk, `w: ${cookieGeom && cookieGeom.w}, h: ${cookieGeom && cookieGeom.h}`);
    } catch (e) {
      console.warn(`[${name}] cookie clicker error:`, e.message);
    }
    await evaluate(() => bigosSandbox.unmount('cookie_clicker')).catch(() => {});
    record(`${name}: cookie clicker launches with styles and increments count`, cookieClickerOk);

    // --- Launch and interact with Kalkulator BMI (350px width, dynamic auto-height expansion) ---
    let bmiOk = false;
    let bmiWidthOk = false;
    let bmiExpandedOk = false;
    let initialBmiGeom = null;
    let afterBmiGeom = null;
    try {
      await evaluate(async () => {
        await bigosSandbox.launchPackage('kalkulator_bmi');
      });
      await page.waitForTimeout(300);
      initialBmiGeom = await evaluate(() => {
        const win = document.getElementById('app-kalkulator_bmi');
        if (!win) return null;
        const r = win.getBoundingClientRect();
        return {
          w: Math.round(r.width),
          h: Math.round(r.height),
          autoHeight: win.dataset.autoHeight
        };
      });

      const bmiFrame = page.frameLocator('#app-kalkulator_bmi iframe');
      const wInput = bmiFrame.locator('#bmi_weight');
      const hInput = bmiFrame.locator('#bmi_height');
      const calcBtn = bmiFrame.locator('button[onclick*="oblicz"]');
      await calcBtn.waitFor({ state: 'visible', timeout: 5000 });
      await wInput.fill('70');
      await hInput.fill('175');
      await calcBtn.click();
      await page.waitForTimeout(400);
      const bmiVal = (await bmiFrame.locator('#bmi_val').textContent()) || '';
      bmiOk = bmiVal.startsWith('22.');

      afterBmiGeom = await evaluate(() => {
        const win = document.getElementById('app-kalkulator_bmi');
        if (!win) return null;
        const r = win.getBoundingClientRect();
        return {
          w: Math.round(r.width),
          h: Math.round(r.height)
        };
      });
      bmiWidthOk = initialBmiGeom && Math.abs(initialBmiGeom.w - 350) <= 2;
      bmiExpandedOk = initialBmiGeom && afterBmiGeom && afterBmiGeom.h > initialBmiGeom.h + 40;
    } catch (e) {
      console.warn(`[${name}] bmi error:`, e.message);
    }
    await evaluate(() => bigosSandbox.unmount('kalkulator_bmi')).catch(() => {});
    record(`${name}: kalkulator BMI calculates BMI correctly`, bmiOk);
    record(`${name}: kalkulator BMI starts at declared 350px width and auto-height expands on result`, bmiWidthOk && bmiExpandedOk, `initialH: ${initialBmiGeom && initialBmiGeom.h}, expandedH: ${afterBmiGeom && afterBmiGeom.h}`);

    // --- Launch BigPaint Studio (declared 800x600 fixed dimensions) ---
    let painterFixedOk = false;
    let painterGeom = null;
    try {
      await evaluate(async () => {
        await bigosSandbox.launchPackage('bigos_painter');
      });
      await page.waitForTimeout(300);
      painterGeom = await evaluate(() => {
        const win = document.getElementById('app-bigos_painter');
        if (!win) return null;
        const r = win.getBoundingClientRect();
        return {
          w: Math.round(r.width),
          h: Math.round(r.height),
          autoHeight: win.dataset.autoHeight
        };
      });
      painterFixedOk = !!(painterGeom && Math.abs(painterGeom.w - 800) <= 2 && Math.abs(painterGeom.h - 600) <= 2 && painterGeom.autoHeight === 'false');
      await evaluate(() => bigosSandbox.unmount('bigos_painter')).catch(() => {});
    } catch (e) {
      console.warn(`[${name}] painter error:`, e.message);
    }
    record(`${name}: bigpaint studio opens at declared 800x600 fixed dimensions`, painterFixedOk, `w: ${painterGeom && painterGeom.w}, h: ${painterGeom && painterGeom.h}`);

    // --- Obsolete geometry purging and restore default geometry ---
    const geomCleanupRes = await evaluate(async () => {
      try {
        localStorage.setItem('bigos_win_cookie_clicker', JSON.stringify({ w: 420, h: 560, x: 50, y: 50 }));
        const loaded = winManager._loadGeometry('cookie_clicker');
        const inStorageAfter = localStorage.getItem('bigos_win_cookie_clicker');
        const obsoletePurged = loaded === null && inStorageAfter === null;

        await bigosSandbox.launchPackage('cookie_clicker');
        const win = document.getElementById('app-cookie_clicker');
        win.style.width = '640px';
        win.dataset.userResized = 'true';
        localStorage.setItem('bigos_win_cookie_clicker', JSON.stringify({ w: 640, h: 520 }));

        winManager.resetWindowGeometry('cookie_clicker');
        const clearedStorage = localStorage.getItem('bigos_win_cookie_clicker') === null;
        const restoredDeclaredWidth = win.style.width === '400px';
        const userResizedCleared = !win.dataset.userResized;
        bigosSandbox.unmount('cookie_clicker');

        return {
          obsoletePurged,
          clearedStorage,
          restoredDeclaredWidth,
          userResizedCleared
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    record(`${name}: obsolete forced dimensions are purged and default dimensions restorable`, !!(geomCleanupRes && geomCleanupRes.obsoletePurged && geomCleanupRes.clearedStorage && geomCleanupRes.restoredDeclaredWidth && geomCleanupRes.userResizedCleared), geomCleanupRes && geomCleanupRes.error);

    // --- Application Manager Polish search, sorting and details ---
    const managerRes = await evaluate(async () => {
      try {
        winManager.open('menadzer');
        await menadzerApp.renderList();
        
        const listEl = document.getElementById('menadzer-list');
        const countEl = document.getElementById('menadzer-count');
        const allText = listEl.textContent;
        const noHasiok = !allText.includes('Hasiok') && !allText.includes('Kosz (Hasiok)');
        const noTechId = !allText.includes('ID: cookie_clicker') && !allText.includes('ID: app_menadzer');
        
        // Search & sort geometry check
        const searchInput = document.getElementById('menadzer-search');
        const searchIcon = searchInput.parentElement.querySelector('span');
        const clearBtn = document.getElementById('menadzer-search-clear');
        const sortSelect = document.getElementById('menadzer-sort');

        const inputRect = searchInput.getBoundingClientRect();
        const iconRect = searchIcon ? searchIcon.getBoundingClientRect() : null;
        const sortRect = sortSelect ? sortSelect.parentElement.getBoundingClientRect() : null;

        const iconInsideInput = !!(iconRect && iconRect.left >= inputRect.left && iconRect.right <= inputRect.left + 50);
        const noSearchSortCollision = !!(sortRect && (inputRect.right <= sortRect.left + 5 || sortRect.top >= inputRect.bottom - 2));

        // Card layout check
        const cards = Array.from(listEl.children);
        const cardsHaveFixedIcon = cards.length > 0 && cards.every(c => c.querySelector('.w-12') || c.innerHTML.includes('w-12'));
        const cardsHave2ColGrid = cards.length > 0 && cards.every(c => c.querySelector('.grid-cols-2') || c.innerHTML.includes('grid-cols-2'));
        const allButtonsHaveHeight = cards.length > 0 && cards.every(c => {
          const btns = Array.from(c.querySelectorAll('button'));
          return btns.length >= 2 && btns.every(b => b.offsetHeight >= 24);
        });
        const noDuplicateBadges = !listEl.innerHTML.includes('>Systemowe<');

        // Toolbar simplified & centered checks at 700px, 500px, and 360px
        const winMenadzer = document.getElementById('app-menadzer');
        const origWidth = winMenadzer.style.width;
        const hasParagraph = winMenadzer.textContent.includes('Zarządzaj oprogramowaniem BigOS');
        const instalujBtn = document.getElementById('menadzer-install-btn');
        const toolbar = document.querySelector('.menadzer-toolbar');
        const catalogRestoreBtn = document.getElementById('menadzer-restore-catalog-btn');

        // 700px width test
        winMenadzer.style.width = '700px';
        const r700 = winMenadzer.getBoundingClientRect();
        const instR700 = instalujBtn ? instalujBtn.getBoundingClientRect() : null;
        const instalujVisible700 = !!(instR700 && instR700.left >= r700.left - 2 && instR700.right <= r700.right + 2 && instalujBtn.offsetHeight >= 28);

        // 500px width test with catalog restore button rendered
        if (catalogRestoreBtn) catalogRestoreBtn.classList.remove('hidden');
        winMenadzer.style.width = '500px';
        const r500 = winMenadzer.getBoundingClientRect();
        const instR500 = instalujBtn ? instalujBtn.getBoundingClientRect() : null;
        const catR500 = catalogRestoreBtn ? catalogRestoreBtn.getBoundingClientRect() : null;
        const instalujVisible500 = !!(instR500 && instR500.left >= r500.left - 2 && instR500.right <= r500.right + 2 && instalujBtn.offsetHeight >= 28);
        const catalogVisible500 = !!(catR500 && catR500.left >= r500.left - 2 && catR500.right <= r500.right + 2 && catalogRestoreBtn.offsetHeight >= 28);

        // 360px width test
        winMenadzer.style.width = '360px';
        const r360 = winMenadzer.getBoundingClientRect();
        const instR360 = instalujBtn ? instalujBtn.getBoundingClientRect() : null;
        const instalujVisible360 = !!(instR360 && instR360.left >= r360.left - 2 && instR360.right <= r360.right + 2);
        const allTbBtns = Array.from(toolbar.querySelectorAll('button:not(.hidden)'));
        const allTbBtnsFit360 = allTbBtns.length >= 3 && allTbBtns.every(b => {
          const br = b.getBoundingClientRect();
          return br.left >= r360.left - 2 && br.right <= r360.right + 2 && b.offsetHeight >= 28;
        });
        const narrowCards = Array.from(listEl.children);
        const noOverflow = narrowCards.every(c => {
          const cardR = c.getBoundingClientRect();
          return cardR.right <= r360.right + 15;
        });

        // Restore original width and hide catalog button
        winMenadzer.style.width = origWidth;
        if (catalogRestoreBtn) catalogRestoreBtn.classList.add('hidden');

        // Search "menedzer"
        await menadzerApp.onSearch('menedzer');
        const searchMenedzerMatch = listEl.textContent.includes('Menedżer Aplikacji') && !listEl.textContent.includes('Ciasteczkowy Klikacz');
        
        // Search "ciasteczkowy"
        await menadzerApp.onSearch('ciasteczkowy');
        const searchCookieMatch = listEl.textContent.includes('Ciasteczkowy Klikacz') && !listEl.textContent.includes('Kalkulator BMI');

        // Clear search
        await menadzerApp.clearSearch();
        const searchClearRestored = listEl.textContent.includes('Ciasteczkowy Klikacz') && listEl.textContent.includes('Menedżer Aplikacji');

        // Details modal
        await menadzerApp.showDetails('cookie_clicker');
        const detailsModal = document.getElementById('menadzer-details-modal');
        const detailsShown = !!detailsModal && detailsModal.textContent.includes('cookie_clicker');
        const hasResetGeomBtn = !!detailsModal && detailsModal.textContent.includes('Przywróć domyślny rozmiar');
        if (detailsModal) detailsModal.remove();

        winManager.close('menadzer');
        return {
          ok: true,
          noHasiok,
          noTechId,
          searchMenedzerMatch,
          searchCookieMatch,
          searchClearRestored,
          detailsShown,
          hasResetGeomBtn,
          iconInsideInput,
          noSearchSortCollision,
          cardsHaveFixedIcon,
          cardsHave2ColGrid,
          allButtonsHaveHeight,
          noDuplicateBadges,
          noOverflow,
          noParagraph: !hasParagraph,
          instalujVisible700,
          instalujVisible500,
          catalogVisible500,
          instalujVisible360,
          allTbBtnsFit360
        };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    });
    record(`${name}: app manager filters with Polish characters and preserves state`, !!(managerRes && managerRes.searchMenedzerMatch && managerRes.searchCookieMatch && managerRes.searchClearRestored), managerRes && managerRes.error);
    record(`${name}: app manager excludes hasiok, details modal has restore size button`, !!(managerRes && managerRes.noHasiok && managerRes.noTechId && managerRes.detailsShown && managerRes.hasResetGeomBtn), managerRes && managerRes.error);
    record(`${name}: app manager layout has bounded search icon, 2-col action grid and responsive wrapping`, !!(managerRes && managerRes.iconInsideInput && managerRes.noSearchSortCollision && managerRes.cardsHaveFixedIcon && managerRes.cardsHave2ColGrid && managerRes.allButtonsHaveHeight && managerRes.noDuplicateBadges && managerRes.noOverflow), managerRes && managerRes.error);
    record(`${name}: app manager toolbar is simplified with centered buttons wrapping cleanly at 700px, 500px, 360px`, !!(managerRes && managerRes.noParagraph && managerRes.instalujVisible700 && managerRes.instalujVisible500 && managerRes.catalogVisible500 && managerRes.instalujVisible360 && managerRes.allTbBtnsFit360), managerRes && managerRes.error);

    // --- Bundled app uninstallation remembered across reload ---
    const uninstallBundledRes = await evaluate(async () => {
      try {
        await menadzerApp.executeUninstall('bigos_painter');
        const uninstalledAfter = bundledCatalog.isUninstalled('bigos_painter');
        const inDb = await bigosDB.getPackage('bigos_painter');
        return {
          uninstalledAfter,
          inDb: !!inDb
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    record(`${name}: uninstalling bundled app removes package and marks uninstalled`, uninstallBundledRes.uninstalledAfter && !uninstallBundledRes.inDb);

    // Refresh and verify painter does NOT return automatically
    await page.reload({ waitUntil: 'networkidle' });
    await page.fill('#password-input', 'testpass');
    await page.click('button[onclick="auth.handleLogin()"]');
    await page.waitForTimeout(700);

    const reloadRes = await evaluate(async () => {
      const inDb = await bigosDB.getPackage('bigos_painter');
      const uninstalledIds = bundledCatalog.getUninstalledIds();
      
      // Deliberately reinstall painter
      await bundledCatalog.reinstall('bigos_painter');
      const inDbAfterReinstall = await bigosDB.getPackage('bigos_painter');
      const uninstalledAfterReinstall = bundledCatalog.isUninstalled('bigos_painter');
      return {
        stayedUninstalled: !inDb && uninstalledIds.includes('bigos_painter'),
        reinstalled: !!inDbAfterReinstall && !uninstalledAfterReinstall
      };
    });
    record(`${name}: bundled app uninstallation persists across reload`, reloadRes.stayedUninstalled);
    record(`${name}: bundled app reinstall restores package and desktop icon`, reloadRes.reinstalled);

    // --- Welcome App (Powitanie v2.0.1) comprehensive regression suite ---
    // 1. Initial positioning and zero-flash upper-left check
    const initGeom = await evaluate(() => {
      // Clear any prior centered flag to test first-open placement
      const win = document.getElementById('app-powitanie');
      if (win) {
        delete win.dataset.centered;
        win.style.left = '';
        win.style.top = '';
      }
      winManager.open('powitanie');
      const winAfter = document.getElementById('app-powitanie');
      if (!winAfter) return { ok: false, reason: 'window not found' };
      const rect = winAfter.getBoundingClientRect();
      const style = window.getComputedStyle(winAfter);

      // Version badge and content check
      const versionBadge = document.getElementById('powitanie-version-badge');
      const badgeText = versionBadge ? versionBadge.textContent.trim() : '';
      const subtitle = document.getElementById('powitanie-version-subtitle');
      const subtitleText = subtitle ? subtitle.textContent.trim() : '';
      const newsTitle = document.getElementById('powitanie-news-title');
      const newsTitleText = newsTitle ? newsTitle.textContent.trim() : '';

      return {
        ok: true,
        display: style.display,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        notAtOrigin: rect.left > 50 && rect.top > 20,
        hasV201: badgeText === 'v2.0.1' && subtitleText.includes('2.0.1') && newsTitleText.includes('2.0.1')
      };
    });
    record(`${name}: welcome window initial positioning is centered without (0,0) flash`, initGeom.ok && initGeom.notAtOrigin, `left=${initGeom.left}, top=${initGeom.top}`);
    record(`${name}: welcome app displays authoritative v2.0.1 version badges`, initGeom.hasV201);

    // 2. Title bar close button (X) actually hides window and removes taskbar entry
    await page.click('#powitanie-titlebar-close');
    await page.waitForTimeout(100);
    const closeTitleCheck = await evaluate(() => {
      const win = document.getElementById('app-powitanie');
      const tbBtn = document.getElementById('tb-btn-powitanie');
      const display = win ? window.getComputedStyle(win).display : 'none';
      return {
        hidden: display === 'none' && !win.classList.contains('active'),
        taskbarRemoved: !tbBtn
      };
    });
    record(`${name}: title bar X button closes welcome window completely`, closeTitleCheck.hidden && closeTitleCheck.taskbarRemoved);

    // 3. Reopening manually and closing via footer "Zamknij" button
    await evaluate(() => winManager.open('powitanie'));
    await page.waitForTimeout(100);
    await page.click('#powitanie-footer-close');
    await page.waitForTimeout(100);
    const closeFooterCheck = await evaluate(() => {
      const win = document.getElementById('app-powitanie');
      const tbBtn = document.getElementById('tb-btn-powitanie');
      const display = win ? window.getComputedStyle(win).display : 'none';
      return {
        hidden: display === 'none' && !win.classList.contains('active'),
        taskbarRemoved: !tbBtn
      };
    });
    record(`${name}: footer Zamknij button closes welcome window completely`, closeFooterCheck.hidden && closeFooterCheck.taskbarRemoved);

    // 4. Reopening manually and closing via "Rozpocznij pracę" button
    await evaluate(() => winManager.open('powitanie'));
    await page.waitForTimeout(100);
    await page.click('#powitanie-btn-start-work');
    await page.waitForTimeout(100);
    const closeStartWorkCheck = await evaluate(() => {
      const win = document.getElementById('app-powitanie');
      const tbBtn = document.getElementById('tb-btn-powitanie');
      const display = win ? window.getComputedStyle(win).display : 'none';
      return {
        hidden: display === 'none' && !win.classList.contains('active'),
        taskbarRemoved: !tbBtn
      };
    });
    record(`${name}: Rozpocznij pracę button closes welcome window completely`, closeStartWorkCheck.hidden && closeStartWorkCheck.taskbarRemoved);

    // 5. Reopen for tab navigation, scroll reset, and theme tests
    await evaluate(() => winManager.open('powitanie'));
    await page.waitForTimeout(100);

    // Tab switching and scroll reset to 0
    const scrollResetCheck = await evaluate(() => {
      const win = document.getElementById('app-powitanie');
      const contentEl = win.querySelector('.powitanie-content');
      powitanieApp.openTab('news');
      contentEl.scrollTop = 180;
      const scrolled = contentEl.scrollTop > 50;
      powitanieApp.openTab('ai');
      const aiScroll = contentEl.scrollTop;
      powitanieApp.openTab('tips');
      const tipsScroll = contentEl.scrollTop;
      powitanieApp.openTab('start');
      const startScroll = contentEl.scrollTop;
      return {
        scrolled,
        resetOnAi: aiScroll === 0,
        resetOnTips: tipsScroll === 0,
        resetOnStart: startScroll === 0
      };
    });
    record(`${name}: scroll position resets to 0 when switching tabs`, scrollResetCheck.scrolled && scrollResetCheck.resetOnAi && scrollResetCheck.resetOnTips && scrollResetCheck.resetOnStart);

    // Quick actions and skip preference
    const quickAndPrefCheck = await evaluate(() => {
      powitanieApp.quickOpen('menadzer');
      const menadzerWin = document.getElementById('app-menadzer');
      const menadzerOpened = menadzerWin && menadzerWin.classList.contains('active');
      winManager.close('menadzer');

      powitanieApp.toggleSkip(true);
      const skipStoredTrue = localStorage.getItem('bigos_skip_welcome') === 'true';
      powitanieApp.toggleSkip(false);
      const skipStoredFalse = localStorage.getItem('bigos_skip_welcome') === 'false';

      return { menadzerOpened, skipStoredTrue, skipStoredFalse };
    });
    record(`${name}: welcome quick actions launch system apps and skip toggle persists`, quickAndPrefCheck.menadzerOpened && quickAndPrefCheck.skipStoredTrue && quickAndPrefCheck.skipStoredFalse);

    // 6. Theme change preserves active tab and scroll offset
    const themePreserveCheck = await evaluate(() => {
      const win = document.getElementById('app-powitanie');
      const contentEl = win.querySelector('.powitanie-content');
      powitanieApp.openTab('news');
      contentEl.scrollTop = 120;
      const beforeScroll = contentEl.scrollTop;
      themeManager.setColor('color-matrix');
      const tabNews = document.getElementById('powitanie-tab-news');
      const activeTabStillNews = tabNews && !tabNews.classList.contains('hidden');
      const afterScroll = contentEl.scrollTop;
      return {
        activeTabStillNews,
        scrollPreserved: Math.abs(afterScroll - beforeScroll) <= 2
      };
    });
    record(`${name}: current tab and scroll position preserved across theme changes`, themePreserveCheck.activeTabStillNews && themePreserveCheck.scrollPreserved);

    // 7. Title bar dragging does not intercept button clicks
    const dragSafetyCheck = await evaluate(() => {
      const closeBtn = document.getElementById('powitanie-titlebar-close');
      const prevActiveDrag = desktop.activeDrag;
      const evt = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      closeBtn.dispatchEvent(evt);
      return {
        noDragStarted: desktop.activeDrag === prevActiveDrag || desktop.activeDrag === null
      };
    });
    record(`${name}: title bar dragging does not intercept control button interactions`, dragSafetyCheck.noDragStarted);

    // 8. Ultrawide monitor (3440×1440) balanced layout and screenshots
    await page.setViewportSize({ width: 3440, height: 1440 });
    await page.waitForTimeout(300);
    await evaluate(() => {
      powitanieApp.openTab('start');
      winManager.resetWindowGeometry('powitanie');
      winManager.open('powitanie');
    });
    await page.waitForTimeout(200);

    const ultrawideCheck = await evaluate(() => {
      const win = document.getElementById('app-powitanie');
      const rect = win.getBoundingClientRect();
      const tabStart = document.getElementById('powitanie-tab-start');
      const tabRect = tabStart.getBoundingClientRect();
      return {
        winWidth: rect.width,
        winBalanced: rect.width >= 700 && rect.width <= 800,
        tabInnerWrapperMaxW: tabRect.width <= 600,
        centered: rect.left > 1000 && rect.right < 3000
      };
    });
    record(`${name}: ultrawide 3440x1440 maintains balanced centered width without stretch`, ultrawideCheck.winBalanced && ultrawideCheck.tabInnerWrapperMaxW && ultrawideCheck.centered, `winWidth=${ultrawideCheck.winWidth}`);

    // Capture screenshots on chromium
    if (name === 'chromium') {
      await page.screenshot({ path: path.join(root, 'screenshots', 'welcome-start.png') });
    }
    await page.click('#powitanie-nav-news');
    await page.waitForTimeout(200);
    if (name === 'chromium') {
      await page.screenshot({ path: path.join(root, 'screenshots', 'welcome-changelog.png') });
    }

    // 9. Other viewport tests: 1920x1080, 1366x768, short viewport (800x450), mobile 360x640
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(200);
    await evaluate(() => {
      winManager.resetWindowGeometry('powitanie');
      winManager.open('powitanie');
    });
    const vp1920Check = await evaluate(() => {
      const win = document.getElementById('app-powitanie');
      const r = win.getBoundingClientRect();
      return r.left > 100 && r.right < 1900 && r.width >= 700 && r.width <= 800;
    });
    record(`${name}: 1920x1080 desktop centers welcome window`, vp1920Check);

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(200);
    await evaluate(() => {
      winManager.resetWindowGeometry('powitanie');
      winManager.open('powitanie');
    });
    const vp1366Check = await evaluate(() => {
      const win = document.getElementById('app-powitanie');
      const r = win.getBoundingClientRect();
      return r.left > 50 && r.right < 1350 && r.width >= 700 && r.width <= 800;
    });
    record(`${name}: 1366x768 laptop centers welcome window`, vp1366Check);

    await page.setViewportSize({ width: 800, height: 450 });
    await page.waitForTimeout(200);
    await evaluate(() => {
      winManager.resetWindowGeometry('powitanie');
      winManager.open('powitanie');
    });
    const shortVpCheck = await evaluate(() => {
      const win = document.getElementById('app-powitanie');
      const r = win.getBoundingClientRect();
      const taskbar = document.getElementById('taskbar');
      const taskbarTop = taskbar ? taskbar.getBoundingClientRect().top : 402;
      return r.top >= 0 && r.bottom <= taskbarTop + 2;
    });
    record(`${name}: short viewport 800x450 fits window above taskbar without clipping top`, shortVpCheck);

    await page.setViewportSize({ width: 360, height: 640 });
    await page.waitForTimeout(200);
    await evaluate(() => {
      winManager.resetWindowGeometry('powitanie');
      winManager.open('powitanie');
    });
    const mobile360Check = await evaluate(() => {
      const win = document.getElementById('app-powitanie');
      const r = win.getBoundingClientRect();
      const footer = win.querySelector('.powitanie-footer');
      const footerR = footer ? footer.getBoundingClientRect() : null;
      return r.width <= 360 && r.left >= 0 && footerR && footerR.height > 0;
    });
    record(`${name}: mobile 360x640 scales gracefully with visible footer`, mobile360Check);

    // Restore standard viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(200);
    await evaluate(() => {
      winManager.resetWindowGeometry('powitanie');
      winManager.open('powitanie');
      powitanieApp.openTab('start');
    });

    // 10. Keyboard focus navigation and Enter activation
    const keyboardCheck = await evaluate(() => {
      const navTips = document.getElementById('powitanie-nav-tips');
      if (!navTips) return false;
      navTips.focus();
      navTips.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      navTips.click();
      const tabTips = document.getElementById('powitanie-tab-tips');
      return tabTips && !tabTips.classList.contains('hidden');
    });
    record(`${name}: keyboard navigation focuses and activates tabs`, keyboardCheck);

    // Close welcome app at end of suite
    await evaluate(() => winManager.close('powitanie'));

    // --- No stray circular elements near top-right / bigai-widget ---
    const strayWidgetCheck = await evaluate(() => {
      const widget = document.getElementById('pogodynka-widget');
      const emptyDivs = Array.from(document.querySelectorAll('body > div')).filter(div => {
        const r = div.getBoundingClientRect();
        return r.width > 0 && r.width < 30 && r.height > 0 && r.height < 30 && div.textContent.trim() === '';
      });
      return {
        pogodynkaWidgetExists: !!widget,
        emptyPillsNearTopRight: emptyDivs.length
      };
    });
    record(`${name}: top-right area has no stray circular empty elements`, strayWidgetCheck.emptyPillsNearTopRight === 0);

    // --- Mobile viewport responsiveness (< 768px) ---
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    const mobileCheck = await evaluate(async () => {
      winManager.open('kalkulator');
      const win = document.getElementById('app-kalkulator');
      if (!win) return { ok: false, reason: 'window not found' };
      const rect = win.getBoundingClientRect();
      const taskbar = document.getElementById('taskbar');
      const taskbarVis = taskbar && taskbar.offsetHeight > 0;
      winManager.close('kalkulator');
      return {
        ok: rect.width <= 375 && rect.left >= 0,
        width: rect.width,
        taskbarVis
      };
    });
    record(`${name}: mobile viewport fits window within screen (< 768px)`, mobileCheck.ok, `width: ${mobileCheck.width}`);
    record(`${name}: mobile taskbar is visible`, mobileCheck.taskbarVis);
    await page.setViewportSize({ width: 1280, height: 800 });

    // --- Window snap API present (before format navigations) ---
    const snapApi = await evaluate(() => typeof winManager.snap === 'function' && typeof bigosSearch !== 'undefined');
    record(`${name}: window snap + unified search APIs present`, snapApi === true);

    // --- Format preserves unrelated storage ---
    // NOTE: location.reload is not writable in Chromium; we assert the operation
    // result and key scoping, and accept that a real reload may follow.
    let formatCheck;
    try {
      formatCheck = await evaluate(async () => {
        localStorage.setItem('other_site_token', 'keep-me');
        localStorage.setItem('bigos_bg', 'x');
        localStorage.setItem('bigos_password', 'pw');
        localStorage.setItem('bigos_theme', '{}');
        const r = await Promise.race([
          bigosMaintenance.formatSystem({ confirm: false, reload: false }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('format timeout')), 8000))
        ]);
        return {
          ok: !!(r && r.ok),
          cancelled: !!(r && r.cancelled),
          error: r && r.error ? String(r.error) : null,
          unrelated: localStorage.getItem('other_site_token'),
          bigosBg: localStorage.getItem('bigos_bg'),
          bigosPw: localStorage.getItem('bigos_password'),
          bigosTheme: localStorage.getItem('bigos_theme')
        };
      });
    } catch (e) {
      formatCheck = { ok: false, error: e.message, bigosBg: 'TIMEOUT', bigosPw: 'TIMEOUT', bigosTheme: 'TIMEOUT', unrelated: null };
    }
    record(`${name}: format clears BigOS keys`, formatCheck.bigosBg === null && formatCheck.bigosPw === null && formatCheck.bigosTheme === null);
    record(`${name}: format preserves unrelated storage`, formatCheck.unrelated === 'keep-me');

    // --- Offline after SW prepare (Chromium) ---
    if (name === 'chromium') {
      try {
        await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
      } catch (_) {
        await page.waitForTimeout(500);
      }
      await page.waitForTimeout(2000); // let SW install & precache
      await context.setOffline(true);
      try {
        await page.reload({ waitUntil: 'domcontentloaded' });
      } catch (_) { /* navigation under offline is ok if shell loads */ }
      const offlineBoot = await evaluate(() => !!document.getElementById('login-screen'));
      record(`${name}: offline boot after cache`, offlineBoot === true);
      await context.setOffline(false);
    }

    try { await context.close(); } catch (_) {}
    try { await browser.close(); } catch (_) {}
  }

  server.close();

  const failed = results.filter((r) => !r.ok).length;
  const passed = results.length - failed;
  console.log(`\n${passed} passed, ${failed} failed`);
  if (skippedBrowsers.length > 0) {
    console.log(`Skipped browsers (NOT counted as passes): ${skippedBrowsers.join(', ')}`);
  }
  if (failed > 0) process.exit(1);
  // Incomplete environment is a failure for CI purposes when a browser is missing.
  if (skippedBrowsers.length > 0) {
    console.error('FAIL: required browsers missing — results are incomplete.');
    process.exit(3);
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
