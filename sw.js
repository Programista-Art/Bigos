// ======================================================================
// PLIK: sw.js (Service Worker BigOS — offline + kontrolowana aktualizacja)
// Cache versioning: CACHE_VERSION bump invalidates old caches.
// Core shell is precached after install; runtime cache for same-origin GETs.
// Network-required features are documented in docs/OFFLINE.md.
// ======================================================================

const CACHE_VERSION = 'bigos-v2.0.1-p1';
const CORE_CACHE = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './css/bigos-tw.css',
  './manifest.webmanifest',
  './js/core/diagnostics.js',
  './js/core/state.js',
  './js/core/storage.js',
  './js/core/app-registry.js',
  './js/core/system-maintenance.js',
  './js/core/backup.js',
  './js/core/sandbox.js',
  './js/core/bundled-catalog.js',
  './js/core/doc-history.js',
  './js/globals.js',
  './js/ui.js',
  './js/auth.js',
  './js/fs.js',
  './js/window.js',
  './js/desktop.js',
  './js/theme.js',
  './js/powitanie.js',
  './js/aplikacje/apps.js',
  './js/aplikacje/przelicznik.js',
  './js/aplikacje/czasomierz.js',
  './js/aplikacje/wasm-engine.js',
  './js/aplikacje/grajacz.js',
  './js/aplikacje/kalkulator.js',
  './js/aplikacje/nadzorca.js',
  './js/aplikacje/patrzalka.js',
  './js/aplikacje/pogodynka.js',
  './js/aplikacje/skryba.js',
  './js/aplikacje/paint.js',
  './js/aplikacje/tablica.js',
  './js/aplikacje/zadaniowiec.js',
  './js/aplikacje/wladca.js',
  './js/aplikacje/grajek.js',
  './js/aplikacje/kombinator.js',
  './js/aplikacje/kalendarz.js',
  './js/aplikacje/karteczki.js',
  './js/aplikacje/siecioslaw.js',
  './js/aplikacje/rachmistrz_kodu.js',
  './js/aplikacje/kasiarz.js',
  './js/aplikacje/kompresor.js',
  './js/aplikacje/podpowiadacz.js',
  './js/aplikacje/menadzer.js',
  './js/aplikacje/edytor_map.js',
  './js/aplikacje/montazysta.js',
  './js/gry/silnik.js',
  './js/gry/pelzacz.js',
  './js/gry/murarz.js',
  './js/gry/ufoludki.js',
  './js/gry/odbijanka.js',
  './js/gry/trzepotek.js',
  './js/gry/scigacz.js',
  './js/gry/bombiarz.js',
  './js/gry/kolko.js',
  './js/gry/tank.js',
  './Programy/cookie_clicker_bigos.js',
  './Programy/kalkulator_bmi_bigos.js',
  './Programy/bigos_painter_bigos.js',
  './tapety/bigos.webp',
  './tapety/kosmos.webp',
  './tapety/abstrakcja.webp',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CORE_CACHE);
    // Cache every required core asset. Fail install if a required asset is
    // missing — a partially populated core cache must not activate.
    const missing = [];
    await Promise.all(CORE_ASSETS.map(async (url) => {
      try {
        const res = await fetch(new Request(url, { cache: 'reload' }));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        await cache.put(url, res);
      } catch (e) {
        missing.push(url);
      }
    }));
    if (missing.length > 0) {
      // Only wallpapers/icons may be optional; scripts/styles/html are required.
      const requiredMissing = missing.filter((u) =>
        u.endsWith('.js') || u.endsWith('.css') || u.endsWith('.html') || u === './' || u.endsWith('.webmanifest')
      );
      if (requiredMissing.length > 0) {
        throw new Error('Pre-cache incomplete, missing required: ' + requiredMissing.join(', '));
      }
    }
    // Do NOT skipWaiting automatically — host decides when it is safe
    // (protects unsaved documents from an abrupt reload).
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((k) => k.startsWith('bigos-') && k !== CORE_CACHE && k !== RUNTIME_CACHE)
      .map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (data.type === 'GET_VERSION') {
    event.source && event.source.postMessage({ type: 'VERSION', version: CACHE_VERSION });
  }
  if (data.type === 'CHECK_UPDATE') {
    event.waitUntil((async () => {
      try {
        const reg = await self.registration.update();
        event.source && event.source.postMessage({ type: 'UPDATE_CHECK', updated: !!(reg && reg.waiting) });
      } catch (e) {
        event.source && event.source.postMessage({ type: 'UPDATE_CHECK', error: String(e && e.message) });
      }
    })());
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never intercept cross-origin (API providers, CDN) — those need network.
  // Do not cache credentials, provider tokens, or private user content.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/') || url.search.includes('key=') || url.search.includes('token=')) {
    return; // let the network handle it; never cache secrets
  }

  event.respondWith((async () => {
    // Look in BOTH caches: CORE_CACHE holds precached shell assets,
    // RUNTIME_CACHE holds same-origin GETs discovered later.
    const core = await caches.open(CORE_CACHE);
    const runtime = await caches.open(RUNTIME_CACHE);
    const cached = (await core.match(req, { ignoreSearch: true }))
      || (await runtime.match(req, { ignoreSearch: true }));
    if (cached) {
      // Stale-while-revalidate for non-navigation assets.
      if (req.mode !== 'navigate') {
        event.waitUntil(fetch(req).then((res) => {
          if (res && res.ok) runtime.put(req, res.clone());
        }).catch(() => {}));
      }
      return cached;
    }
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') {
        runtime.put(req, res.clone());
      }
      return res;
    } catch (e) {
      // Offline fallback for navigation.
      if (req.mode === 'navigate') {
        const shell = (await core.match('./index.html')) || (await core.match('./'));
        if (shell) return shell;
      }
      return new Response('Offline — zasób niedostępny', { status: 503, statusText: 'Offline' });
    }
  })());
});
