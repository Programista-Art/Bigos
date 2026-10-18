// ======================================================================
// PLIK: js/core/sandbox.js (Izolowane środowisko dla aplikacji importowanych)
// Untrusted apps run inside sandboxed iframes (sandbox="allow-scripts").
// Host exposes a scoped API over postMessage with identity + permission checks.
// API provider credentials stay in the trusted host.
// ======================================================================

(function (global) {
    'use strict';

    const diag = () => global.bigosDiag || global.diag || { log() {}, warn() {}, error() {} };

    const PERMISSIONS = {
        READ_FILES: 'read_files',
        WRITE_FILES: 'write_files',
        NETWORK: 'network',
        NOTIFY: 'notify'
    };

    const ALL_PERMISSIONS = Object.values(PERMISSIONS);

    /** Guest page template — runs inside the sandboxed frame. */
    const GUEST_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none';">
<style id="bigos-guest-base">
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; width: 100%; height: 100%;
    font-family: var(--font-app, system-ui, -apple-system, sans-serif);
    background: var(--bg, #111827);
    color: var(--text, #f9fafb);
    overflow: hidden;
  }
  #root {
    width: 100%; height: 100%;
    padding: 8px;
    box-sizing: border-box;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .err { color: #f87171; padding: 12px; font: 12px monospace; }
  /* Default themed controls */
  input, select, textarea {
    background-color: var(--panel, rgba(31,41,55,0.9));
    color: var(--text, #f9fafb);
    border: 1px solid var(--border, #374151);
    border-radius: var(--btn-radius, 6px);
  }
  button {
    font-family: inherit;
  }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border, rgba(255,255,255,0.2)); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--primary, rgba(255,255,255,0.4)); }
  /* Fallback BigOS classes */
  .themed-app { color: var(--text, #f9fafb); font-family: var(--font-app, system-ui, sans-serif); }
  .g-bg { background-color: var(--bg, #111827); }
  .g-panel { background-color: var(--panel, rgba(31,41,55,0.9)); border: 1px solid var(--border, #374151); border-radius: var(--win-radius, 8px); }
  .g-btn { border: 1px solid var(--border, #374151); color: var(--text, #f9fafb); background: transparent; border-radius: var(--btn-radius, 6px); }
  .g-btn:hover { background-color: var(--primary, #60a5fa); color: #000; }
  .g-border { border-color: var(--border, #374151); }
  .g-text { color: var(--text, #f9fafb); }
  .g-text-muted { color: var(--text-muted, #9ca3af); }
  .g-accent { color: var(--primary, #60a5fa); }
  /* Auto-height mode: intrinsic content-driven sizing without viewport feedback loops */
  html.auto-height, body.auto-height {
    height: auto !important;
    min-height: 0 !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
  }
  body.auto-height #root {
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
  }
</style>
<style id="bigos-tw-styles"></style>
<style id="bigos-theme-styles"></style>
</head>
<body class="themed-app">
<div id="root"></div>
<script>
(function(){
  var pending = {};
  var seq = 0;
  var granted = [];
  var appId = null;

  function runScript(code) {
    if (!code) return;
    var s = document.createElement('script');
    s.textContent = code;
    (document.head || document.body || document.documentElement).appendChild(s);
    s.remove();
  }

  function showInGuestToast(msg) {
    var b = document.getElementById('bigos-guest-toast');
    if (!b) {
      b = document.createElement('div');
      b.id = 'bigos-guest-toast';
      b.style.cssText = 'position:fixed;bottom:12px;left:50%;transform:translateX(-50%);background:rgba(220,38,38,0.95);color:#fff;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;z-index:999999;box-shadow:0 4px 14px rgba(0,0,0,0.5);pointer-events:none;transition:opacity 0.3s;max-width:90%;text-align:center;';
      document.body.appendChild(b);
    }
    b.textContent = msg;
    b.style.opacity = '1';
    clearTimeout(b._timer);
    b._timer = setTimeout(function(){ b.style.opacity = '0'; }, 3200);
  }

  function call(method, params) {
    return new Promise(function(resolve, reject) {
      var id = 'c' + (++seq);
      pending[id] = { resolve: resolve, reject: reject };
      parent.postMessage({
        channel: 'bigos-sandbox',
        dir: 'req',
        id: id,
        method: method,
        params: params || {}
      }, '*');
    });
  }

  window.alert = function(msg) {
    if (window.BigOSSandbox.hasPermission('notify')) {
      window.BigOSSandbox.toast('Komunikat', String(msg), 'info');
    } else {
      showInGuestToast(String(msg));
    }
  };

  window.confirm = function(msg) {
    if (window.BigOSSandbox.hasPermission('notify')) {
      window.BigOSSandbox.toast('Zapytanie', String(msg), 'info');
    }
    return false;
  };

  window.BigOSSandbox = {
    get appId() { return appId; },
    get permissions() { return granted.slice(); },
    hasPermission: function(p) { return granted.indexOf(p) >= 0; },
    call: call,
    toast: function(title, msg, type) { return call('notify', { title: title, message: msg, type: type }); },
    readFile: function(id) { return call('read_file', { id: id }); },
    writeFile: function(name, content, parentId) { return call('write_file', { name: name, content: content, parentId: parentId }); },
    listFiles: function() { return call('list_files', {}); },
    fetchText: function(url) { return call('fetch_text', { url: url }); },
    setTitle: function(t) { return call('set_title', { title: t }); }
  };

  window.BigOSAppAPI = {
    register: function(cfg) {
      if (!cfg) return;
      var root = document.getElementById('root');
      if (cfg.html && root && !root.innerHTML) root.innerHTML = cfg.html;
      if (cfg.globalName && cfg.global) window[cfg.globalName] = cfg.global;
      if (typeof cfg.init === 'function') {
        try { cfg.init(); } catch (_) {}
      }
    }
  };

  function applyGuestThemeClasses(themeClasses) {
    var raw = (document.body.className || '').trim().split(/\\s+/);
    var toKeep = [];
    for (var i = 0; i < raw.length; i++) {
      var c = raw[i];
      if (c && !/^(color-|ui-|eff-)/.test(c) && c !== 'themed-app') {
        toKeep.push(c);
      }
    }
    toKeep.unshift('themed-app');
    if (themeClasses) {
      var incoming = String(themeClasses).trim().split(/\\s+/);
      for (var j = 0; j < incoming.length; j++) {
        var inc = incoming[j];
        if (inc && /^(color-|ui-|eff-)/.test(inc) && toKeep.indexOf(inc) === -1) {
          toKeep.push(inc);
        }
      }
    }
    document.body.className = toKeep.join(' ');
  }

  window.addEventListener('message', function(ev) {
    var d = ev.data;
    if (!d || d.channel !== 'bigos-sandbox') return;
    if (d.dir === 'theme') {
      if (d.themeCSS) {
        var thStyle = document.getElementById('bigos-theme-styles');
        if (thStyle) thStyle.textContent = d.themeCSS;
      }
      if (d.themeClasses) {
        applyGuestThemeClasses(d.themeClasses);
      }
      return;
    }
    if (d.dir !== 'res') return;
    var p = pending[d.id];
    if (!p) return;
    delete pending[d.id];
    if (d.error) p.reject(new Error(d.error));
    else p.resolve(d.result);
  });

  window.addEventListener('error', function(e) {
    parent.postMessage({ channel: 'bigos-sandbox', dir: 'err', message: String(e.message) }, '*');
  });

  // Handshake: host sends init with identity + permissions + styles, then code runs.
  window.addEventListener('message', function onInit(ev) {
    var d = ev.data;
    if (!d || d.channel !== 'bigos-sandbox' || d.dir !== 'init') return;
    window.removeEventListener('message', onInit);
    appId = d.appId;
    granted = d.permissions || [];
    var isAutoHeight = !!d.autoHeight;
    if (isAutoHeight) {
      document.documentElement.classList.add('auto-height');
      document.body.classList.add('auto-height');
    }
    try {
      if (d.tailwindCSS) {
        var twStyle = document.getElementById('bigos-tw-styles');
        if (twStyle) twStyle.textContent = d.tailwindCSS;
      }
      if (d.themeCSS) {
        var thStyle = document.getElementById('bigos-theme-styles');
        if (thStyle) thStyle.textContent = d.themeCSS;
      }
      if (d.themeClasses) {
        applyGuestThemeClasses(d.themeClasses);
      }
      var root = document.getElementById('root');
      if (d.html) root.innerHTML = d.html;
      if (d.globalName && d.globalInit) {
        window.__tempGuestFactory = null;
        runScript('(function(){ window.__tempGuestFactory = function(api, root) { ' + d.globalInit + ' }; })();');
        if (typeof window.__tempGuestFactory === 'function') {
          window[d.globalName] = window.__tempGuestFactory(window.BigOSSandbox, root) || {};
          try { delete window.__tempGuestFactory; } catch(_) { window.__tempGuestFactory = undefined; }
        }
      }
      if (d.initCode) {
        runScript('(' + d.initCode + ')();');
      }
      if (d.code && !d.globalInit && !d.initCode && !d.html) {
        runScript(d.code);
      }
      parent.postMessage({ channel: 'bigos-sandbox', dir: 'ready', appId: appId }, '*');

      if (isAutoHeight) {
        var lastSentH = 0;
        var measureContentHeight = function() {
          if (!root) return 0;
          var style = window.getComputedStyle(root);
          var padBottom = parseFloat(style.paddingBottom) || 0;

          var maxBottom = 0;
          var rootRect = root.getBoundingClientRect();
          var children = root.children;
          for (var i = 0; i < children.length; i++) {
            var el = children[i];
            if (el.nodeType !== 1 || el.id === 'bigos-guest-toast') continue;
            var r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;
            var b = (r.bottom - rootRect.top) + root.scrollTop;
            if (b > maxBottom) maxBottom = b;
          }

          var measuredFromChildren = maxBottom > 0 ? Math.ceil(maxBottom + padBottom) : 0;
          var offsetH = Math.ceil(root.offsetHeight || 0);
          var scrollH = Math.ceil(root.scrollHeight || 0);
          var bodyH = Math.ceil((document.body && document.body.scrollHeight) || 0);

          return Math.max(measuredFromChildren, offsetH, scrollH, bodyH);
        };

        var sendAutoHeight = function() {
          if (!isAutoHeight) return;
          var h = measureContentHeight();
          if (h > 0 && Math.abs(h - lastSentH) >= 2) {
            lastSentH = h;
            parent.postMessage({
              channel: 'bigos-sandbox',
              dir: 'resize',
              appId: appId,
              height: h
            }, '*');
          }
        };

        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(function() {
            sendAutoHeight();
          });
        }
        requestAnimationFrame(function() {
          sendAutoHeight();
          setTimeout(sendAutoHeight, 60);
          setTimeout(sendAutoHeight, 250);
        });

        var ro = null;
        if (typeof ResizeObserver !== 'undefined') {
          ro = new ResizeObserver(function() {
            sendAutoHeight();
          });
          ro.observe(root);
          if (root.firstElementChild) {
            ro.observe(root.firstElementChild);
          }
        }
        if (typeof MutationObserver !== 'undefined') {
          var mo = new MutationObserver(function() {
            if (root.firstElementChild && ro) {
              try { ro.observe(root.firstElementChild); } catch(_) {}
            }
            sendAutoHeight();
          });
          mo.observe(root, { childList: true, subtree: true, attributes: true });
        }
      }
    } catch (e) {
      parent.postMessage({ channel: 'bigos-sandbox', dir: 'err', message: String(e && e.message) }, '*');
    }
  });
})();
</script>
</body>
</html>`;

    const frames = new Map(); // instanceId -> { iframe, appId, permissions, origin }

    let cachedTailwindCSS = '';
    async function loadTailwindCSS() {
        if (cachedTailwindCSS) return cachedTailwindCSS;
        if (typeof fetch === 'function') {
            try {
                const res = await fetch('css/bigos-tw.css');
                if (res.ok) cachedTailwindCSS = await res.text();
            } catch (_) {}
        }
        return cachedTailwindCSS;
    }
    if (typeof window !== 'undefined') {
        loadTailwindCSS().catch(() => {});
    }

    function makeGuestURL() {
        const blob = new Blob([GUEST_HTML], { type: 'text/html' });
        return URL.createObjectURL(blob);
    }

    async function handleHostRequest(instanceId, msg) {
        let frame = typeof instanceId === 'string' ? frames.get(instanceId) : instanceId;
        if (!frame && typeof instanceId === 'object' && instanceId !== null) {
            frame = {
                appId: (instanceId.dataset && instanceId.dataset.appId) || instanceId.appId || 'test',
                permissions: instanceId.permissions || instanceId.allowedPerms || [],
                allowedFiles: instanceId.allowedFiles || []
            };
        }
        if (!frame) throw new Error('unknown sandbox instance');
        const method = msg ? (msg.method || msg.action) : '';
        const params = (msg && (msg.params || msg)) || {};
        const perms = frame.permissions || frame.allowedPerms || [];

        switch (method) {
            case 'notify': {
                if (!perms.includes(PERMISSIONS.NOTIFY) && !perms.includes('notify')) {
                    throw new Error('permission denied: notify');
                }
                if (global.apps && global.apps.showToast) {
                    global.apps.showToast(params.title || frame.appId, params.message || '', params.type || 'info');
                }
                return true;
            }
            case 'set_title': {
                const el = document.querySelector('#app-' + CSS.escape(frame.appId) + ' .title-bar span');
                if (el && typeof params.title === 'string') el.textContent = String(params.title).slice(0, 80);
                return true;
            }
            case 'read_file': {
                if (!perms.includes(PERMISSIONS.READ_FILES)) throw new Error('permission denied: read_files');
                const id = String(params.id || '');
                if (!/^[A-Za-z0-9_\-]+$/.test(id)) throw new Error('invalid file id');
                if (frame.allowedFiles && frame.allowedFiles.length > 0 && !frame.allowedFiles.includes(id)) {
                    throw new Error('permission denied: file outside granted scope');
                }
                const item = (global.fileSystem || []).find((f) => f.id === id);
                if (!item) throw new Error('file not found');
                // Do not expose other apps' secrets even with read_files.
                return { id: item.id, name: item.name, type: item.type, content: item.content || '' };
            }
            case 'write_file': {
                if (!perms.includes(PERMISSIONS.WRITE_FILES)) throw new Error('permission denied: write_files');
                const name = String(params.name || 'plik.txt').slice(0, 120);
                const content = typeof params.content === 'string' ? params.content.slice(0, 2 * 1024 * 1024) : '';
                const parentId = params.parentId || 'root';
                const id = params.id && /^[A-Za-z0-9_\-]+$/.test(params.id) ? params.id : ('file_' + Date.now());

                if (frame.allowedFiles && frame.allowedFiles.length > 0 && !frame.allowedFiles.includes(id)) {
                    throw new Error('permission denied: file outside granted scope');
                }

                const existing = (global.fileSystem || []).find(f => f.id === id);
                if (existing) {
                    existing.content = content;
                    existing.name = name;
                } else {
                    const item = { id, type: 'file', name, icon: '📄', content, parentId, x: 20, y: 20 };
                    if (global.bigosState && global.bigosState.push) {
                        global.bigosState.push(item);
                    } else if (Array.isArray(global.fileSystem)) {
                        global.fileSystem.push(item);
                    }
                }
                if (global.fsManager && global.fsManager.save) {
                    const saveRes = await global.fsManager.save();
                    const failed = Array.isArray(saveRes) && saveRes.some(r => r && r.ok === false);
                    if (failed) throw new Error('write_file failed to commit');
                }
                return { id, name };
            }
            case 'list_files': {
                if (!perms.includes(PERMISSIONS.READ_FILES)) throw new Error('permission denied: read_files');
                let files = (global.fileSystem || []).map((f) => ({ id: f.id, name: f.name, type: f.type, parentId: f.parentId }));
                if (frame.allowedFiles && frame.allowedFiles.length > 0) {
                    files = files.filter(f => frame.allowedFiles.includes(f.id));
                }
                return files;
            }
            case 'fetch_text': {
                if (!perms.includes(PERMISSIONS.NETWORK)) throw new Error('permission denied: network');
                const url = String(params.url || '');
                if (!/^https:\/\//i.test(url)) throw new Error('only https URLs are allowed');
                // Host performs the request so credentials never reach the guest.
                const res = await fetch(url, { method: 'GET', credentials: 'omit' });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const text = (await res.text()).slice(0, 200 * 1024);
                return { text };
            }
            default:
                throw new Error('unknown method: ' + method);
        }
    }

    const GRANTS_KEY = 'bigos_app_grants';

    function loadGrants() {
        try {
            const raw = localStorage.getItem(GRANTS_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (_) { return {}; }
    }

    function saveGrants(grants) {
        try {
            localStorage.setItem(GRANTS_KEY, JSON.stringify(grants));
        } catch (_) {}
    }

    function getGrantedScope(appId) {
        const grants = loadGrants();
        const entry = grants[appId];
        if (!entry) return { permissions: [], allowedFiles: [] };
        return {
            permissions: Array.isArray(entry.permissions) ? entry.permissions : [],
            allowedFiles: Array.isArray(entry.allowedFiles) ? entry.allowedFiles : []
        };
    }

    function setGrantedPermissions(appId, permissions, allowedFiles = null) {
        const grants = loadGrants();
        const valid = (permissions || []).filter((p) => ALL_PERMISSIONS.includes(p));
        grants[appId] = {
            permissions: valid,
            allowedFiles: Array.isArray(allowedFiles) ? allowedFiles : (grants[appId] && grants[appId].allowedFiles) || [],
            grantedAt: Date.now()
        };
        saveGrants(grants);
        for (const [, rec] of frames) {
            if (rec && rec.appId === appId) {
                rec.permissions = valid.slice();
                rec.allowedFiles = grants[appId].allowedFiles.slice();
            }
        }
        return grants[appId];
    }

    const sandbox = {
        PERMISSIONS,
        ALL_PERMISSIONS,

        /**
         * Mount an untrusted app into a sandboxed iframe window.
         * @param {object} opts {
         *   appId, name, width, height,
         *   html, code, globalName, globalInit,
         *   permissions: string[],
         *   onReady?, onError?
         * }
         */
        mount(opts) {
            // Packages carry `id`; older callers used `appId`. Accept both —
            // identity must stay consistent across persist/launch/window/removal.
            const appId = String(opts.appId || opts.id || 'sandbox_app').replace(/[^A-Za-z0-9_\-]/g, '');
            const storedScope = getGrantedScope(appId);
            let permissions = storedScope.permissions;
            if (opts.permissions && Array.isArray(opts.permissions) && opts.permissions.length > 0) {
                permissions = opts.permissions.filter((p) => ALL_PERMISSIONS.includes(p));
            }
            const allowedFiles = storedScope.allowedFiles;
            const winId = 'app-' + appId;
            // Sanitize untrusted labels before any host DOM insertion.
            const safeName = String(opts.name || appId).replace(/[<>&"']/g, '').slice(0, 80);
            const safeIcon = String(opts.icon || '📦').replace(/[<>&"']/g, '').slice(0, 8);

            // Authoritative preferred dimensions from package manifest:
            const rawWidth = opts.width;
            const rawHeight = opts.height;
            const isAutoHeight = (!rawHeight || rawHeight === 'auto');

            // Width: use declared width if specified, or default to 500px.
            let targetWidth = rawWidth && rawWidth !== 'auto' ? rawWidth : '500px';

            // Height: for auto-height apps, start with content-driven default or declared height.
            let targetHeight = isAutoHeight ? 'auto' : rawHeight;

            if (typeof window !== 'undefined') {
                const maxW = Math.max(280, (window.innerWidth || 800) - 16);
                const maxH = Math.max(240, (window.innerHeight || 600) - 48 - 16);
                const numW = parseInt(targetWidth, 10);
                if (!isNaN(numW) && numW > maxW) targetWidth = maxW + 'px';
                if (!isAutoHeight) {
                    const numH = parseInt(targetHeight, 10);
                    if (!isNaN(numH) && numH > maxH) targetHeight = maxH + 'px';
                }
            }

            let win = document.getElementById(winId);
            if (!win) {
                win = document.createElement('div');
                win.id = winId;
                win.className = 'window themed-app g-panel border g-border shadow-2xl flex flex-col overflow-hidden';
                document.body.appendChild(win);
            } else {
                win.className = 'window themed-app g-panel border g-border shadow-2xl flex flex-col overflow-hidden';
            }
            if (!win.dataset) win.dataset = {};
            win.dataset.prefW = rawWidth || targetWidth;
            win.dataset.prefH = rawHeight || targetHeight;
            win.dataset.autoHeight = isAutoHeight ? 'true' : 'false';
            win.style.width = targetWidth;
            if (isAutoHeight) {
                win.style.height = '320px';
            } else {
                win.style.height = targetHeight;
            }
            win.innerHTML = '';

            const titleBar = document.createElement('div');
            titleBar.className = 'title-bar px-4 py-2 border-b g-border flex justify-between items-center bg-black/20 cursor-move shrink-0 select-none';
            const titleSpan = document.createElement('span');
            titleSpan.className = 'text-sm font-bold g-accent drop-shadow-md flex items-center gap-2';
            titleSpan.textContent = safeIcon + ' ' + safeName;
            titleBar.appendChild(titleSpan);
            const btnWrap = document.createElement('div');
            btnWrap.className = 'flex items-center gap-1';
            const minBtn = document.createElement('button');
            minBtn.className = 'g-icon-btn px-2 py-0.5 rounded hover:bg-white/10 transition';
            minBtn.setAttribute('data-act', 'min');
            minBtn.setAttribute('aria-label', 'Minimalizuj');
            minBtn.textContent = '_';
            const closeBtn = document.createElement('button');
            closeBtn.className = 'text-red-500 hover:text-red-400 px-2 py-0.5 rounded hover:bg-red-500/20 font-bold transition';
            closeBtn.setAttribute('data-act', 'close');
            closeBtn.setAttribute('aria-label', 'Zamknij');
            closeBtn.textContent = '✖';
            btnWrap.appendChild(minBtn);
            btnWrap.appendChild(closeBtn);
            titleBar.appendChild(btnWrap);
            titleBar.addEventListener('mousedown', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                if (global.winManager) global.winManager.startDrag(e, winId);
            });
            minBtn.onclick = () => global.winManager && global.winManager.minimize(appId);
            closeBtn.onclick = () => sandbox.unmount(appId);
            win.appendChild(titleBar);

            const frameWrap = document.createElement('div');
            frameWrap.className = 'flex-grow relative g-bg overflow-hidden';
            frameWrap.style.minHeight = '0';
            const iframe = document.createElement('iframe');
            iframe.setAttribute('sandbox', 'allow-scripts'); // no allow-same-origin, no allow-top-navigation
            iframe.setAttribute('title', 'Sandboxed app ' + safeName);
            iframe.style.cssText = 'width:100%;height:100%;border:0;display:block;background:transparent';
            const url = makeGuestURL();
            iframe.src = url;
            frameWrap.appendChild(iframe);
            win.appendChild(frameWrap);

            const instanceId = appId + '::' + Date.now().toString(36);
            const record = {
                iframe, appId, permissions, allowedFiles, instanceId, url,
                onReady: opts.onReady, onError: opts.onError
            };
            frames.set(instanceId, record);
            frames.set(appId, record); // allow lookup by appId

            iframe.addEventListener('load', async () => {
                const twCSS = cachedTailwindCSS || await loadTailwindCSS();
                const themeCSS = (global.themeManager && global.themeManager.getCSS) ? global.themeManager.getCSS() : '';
                const themeClasses = (global.themeManager && global.themeManager.getThemeClasses)
                    ? global.themeManager.getThemeClasses()
                    : ((document.body && document.body.className) || 'color-dark ui-win11 eff-none');
                try {
                    iframe.contentWindow.postMessage({
                        channel: 'bigos-sandbox',
                        dir: 'init',
                        appId,
                        permissions,
                        tailwindCSS: twCSS,
                        themeCSS,
                        themeClasses,
                        autoHeight: isAutoHeight,
                        html: opts.html || '',
                        code: (opts.globalInit || opts.initCode || opts.html) ? '' : (opts.code || ''),
                        globalName: opts.globalName || null,
                        globalInit: opts.globalInit || null,
                        initCode: opts.initCode || null
                    }, '*');
                } catch (_) {}
            });

            if (global.winManager) global.winManager.open(appId);
            diag().log('sandbox', 'Mounted sandboxed app ' + appId, { permissions });
            return { appId, instanceId, iframe, windowEl: win };
        },

        unmount(appId) {
            for (const [key, rec] of frames) {
                if (rec.appId !== appId) continue;
                try { rec.iframe.remove(); } catch (_) { /* noop */ }
                try { URL.revokeObjectURL(rec.url); } catch (_) { /* noop */ }
                frames.delete(key);
            }
            const win = document.getElementById('app-' + appId);
            if (win) win.remove();
            if (global.openAppsList) global.openAppsList.delete(appId);
            if (global.winManager && global.winManager.renderTaskbar) global.winManager.renderTaskbar();
            diag().log('sandbox', `Unmounted ${appId}`);
        },

        _onMessage(ev) {
            // Only accept messages from our own guest frames.
            let instanceId = null;
            for (const [id, rec] of frames) {
                if (id === rec.appId) continue; // skip alias keys
                if (rec.iframe.contentWindow === ev.source) { instanceId = id; break; }
            }
            // Also allow alias lookup when instance key iteration hit the alias first.
            if (!instanceId) {
                for (const [id, rec] of frames) {
                    if (rec.iframe.contentWindow === ev.source) { instanceId = rec.instanceId; break; }
                }
            }
            const d = ev.data;
            if (!d || d.channel !== 'bigos-sandbox') return;
            if (!instanceId) {
                diag().warn('sandbox', 'Dropped message from unknown source');
                return;
            }
            const rec = frames.get(instanceId) || Array.from(frames.values()).find((r) => r.instanceId === instanceId);
            if (!rec) return;

            if (d.dir === 'ready') {
                if (typeof rec.onReady === 'function') rec.onReady(d.appId);
                return;
            }
            if (d.dir === 'resize') {
                const requestedH = parseFloat(d.height);
                if (Number.isFinite(requestedH) && requestedH > 0 && requestedH < 5000) {
                    sandbox.applyAutoHeight(rec.appId, requestedH);
                }
                return;
            }
            if (d.dir === 'err') {
                diag().error('sandbox', 'Guest error', { appId: rec.appId, message: d.message });
                if (typeof rec.onError === 'function') rec.onError(d.message);
                return;
            }
            if (d.dir === 'req') {
                handleHostRequest(rec.instanceId, d)
                    .then((result) => {
                        rec.iframe.contentWindow.postMessage({
                            channel: 'bigos-sandbox', dir: 'res', id: d.id, result
                        }, '*');
                    })
                    .catch((err) => {
                        rec.iframe.contentWindow.postMessage({
                            channel: 'bigos-sandbox', dir: 'res', id: d.id, error: String(err && err.message)
                        }, '*');
                    });
            }
        },

        applyAutoHeight(appId, contentH) {
            const win = document.getElementById('app-' + appId);
            if (!win) return;
            if (!win.dataset) win.dataset = {};
            const titleBar = win.querySelector ? win.querySelector('.title-bar') : null;
            const titleH = titleBar ? (titleBar.offsetHeight || 38) : 38;
            const decorationH = titleH + 2;
            const neededH = contentH + decorationH;
            const maxH = typeof window !== 'undefined'
                ? Math.max(240, (window.innerHeight || 600) - 48 - 16)
                : 2000;
            const finalH = Math.min(neededH, maxH);
            win.style.height = Math.round(finalH) + 'px';
            win.dataset.measuredContentHeight = Math.round(contentH);

            if (typeof window !== 'undefined' && win.style.top) {
                const curTop = parseFloat(win.style.top) || 0;
                const bottom = curTop + finalH;
                const maxBottom = window.innerHeight - 48;
                if (bottom > maxBottom) {
                    const newTop = Math.max(0, maxBottom - finalH - 8);
                    win.style.top = Math.round(newTop) + 'px';
                }
            }
        },

        restoreAppGeometry(appId) {
            const win = document.getElementById('app-' + appId);
            if (!win) return;
            if (!win.dataset) win.dataset = {};
            const prefW = win.dataset.prefW;
            const prefH = win.dataset.prefH;
            const isAuto = win.dataset.autoHeight === 'true';
            if (prefW) win.style.width = prefW;
            if (!isAuto && prefH && prefH !== 'auto') {
                win.style.height = prefH;
            }
            if (global.winManager && global.winManager.centerWindow) {
                global.winManager.centerWindow(win);
            }
        },

        list() {
            const seen = new Set();
            const out = [];
            for (const [, rec] of frames) {
                if (seen.has(rec.instanceId)) continue;
                seen.add(rec.instanceId);
                out.push({ appId: rec.appId, instanceId: rec.instanceId, permissions: rec.permissions.slice() });
            }
            return out;
        },

        syncTheme() {
            const themeCSS = (global.themeManager && global.themeManager.getCSS) ? global.themeManager.getCSS() : '';
            const themeClasses = (global.themeManager && global.themeManager.getThemeClasses)
                ? global.themeManager.getThemeClasses()
                : ((document.body && document.body.className) || 'color-dark ui-win11 eff-none');
            const seen = new Set();
            for (const [, rec] of frames) {
                if (!rec || !rec.iframe || !rec.iframe.contentWindow) continue;
                if (seen.has(rec.instanceId)) continue;
                seen.add(rec.instanceId);
                try {
                    rec.iframe.contentWindow.postMessage({
                        channel: 'bigos-sandbox',
                        dir: 'theme',
                        themeCSS,
                        themeClasses
                    }, '*');
                } catch (_) {}
            }
        }
    };

    window.addEventListener('message', (e) => sandbox._onMessage(e));

    /**
     * Safe package-manifest parser. Accepts explicitly supported literal
     * structures plus guest-only function source capture:
     * - objects, arrays, strings (', ", `template`), numbers, booleans, null
     * - function expressions / arrow functions → captured as SOURCE STRINGS
     *   (never evaluated on the host; executed only inside the sandbox guest)
     * - shorthand methods `name() {}` → captured as source strings
     * Rejects computed keys, spread, identifiers as values, tagged templates.
     */
    function parseLiteral(src) {
        let i = 0;
        const s = String(src);

        function skipWs() {
            while (i < s.length && /\s/.test(s[i])) i++;
        }

        function parseValue() {
            skipWs();
            if (i >= s.length) throw new Error('unexpected end of input');
            const c = s[i];
            if (c === '{') return parseObject();
            if (c === '[') return parseArray();
            if (c === '"' || c === "'") return parseString(c);
            if (c === '`') return parseTemplate();
            if (c === '-' || (c >= '0' && c <= '9')) return parseNumber();
            if (s.startsWith('true', i)) { i += 4; return true; }
            if (s.startsWith('false', i)) { i += 5; return false; }
            if (s.startsWith('null', i)) { i += 4; return null; }
            if (s.startsWith('undefined', i)) { i += 9; return undefined; }
            // function / arrow / method → capture source string (guest-only).
            if (s.startsWith('function', i)) return parseFunctionSource();
            // arrow function: ident/parens => ...
            if (looksLikeArrow()) return parseFunctionSource();
            throw new Error('unsupported literal at position ' + i + ': ' + s.slice(i, i + 20));
        }

        function looksLikeArrow() {
            // ( ... ) =>  |  ident =>
            const save = i;
            try {
                if (s[i] === '(') {
                    let depth = 0;
                    let j = i;
                    for (; j < s.length; j++) {
                        if (s[j] === '(') depth++;
                        else if (s[j] === ')') { depth--; if (depth === 0) { j++; break; } }
                    }
                    while (j < s.length && /\s/.test(s[j])) j++;
                    return s[j] === '=' && s[j + 1] === '>';
                }
                if (/[A-Za-z_$]/.test(s[i])) {
                    let j = i;
                    while (j < s.length && /[A-Za-z0-9_$]/.test(s[j])) j++;
                    while (j < s.length && /\s/.test(s[j])) j++;
                    return s[j] === '=' && s[j + 1] === '>';
                }
            } finally {
                i = save;
            }
            return false;
        }

        /** Capture a function/arrow/method as raw source text. Never evaluate. */
        function parseFunctionSource() {
            const start = i;
            // Walk balanced braces/parens/brackets while respecting strings/templates.
            let depthBrace = 0, depthParen = 0, depthBracket = 0;
            let seenBrace = false;
            while (i < s.length) {
                const c = s[i];
                if (c === '"' || c === "'") { parseString(c); continue; }
                if (c === '`') { parseTemplate(); continue; }
                if (c === '/' && s[i + 1] === '/') {
                    while (i < s.length && s[i] !== '\n') i++;
                    continue;
                }
                if (c === '/' && s[i + 1] === '*') {
                    i += 2;
                    while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++;
                    i += 2;
                    continue;
                }
                if (c === '{') { depthBrace++; seenBrace = true; i++; continue; }
                if (c === '}') {
                    if (depthBrace === 0 && !seenBrace) break; // end of enclosing object
                    depthBrace--;
                    i++;
                    if (seenBrace && depthBrace === 0 && depthParen === 0 && depthBracket === 0) break;
                    continue;
                }
                if (c === '(') { depthParen++; i++; continue; }
                if (c === ')') { depthParen--; i++; continue; }
                if (c === '[') { depthBracket++; i++; continue; }
                if (c === ']') { depthBracket--; i++; continue; }
                // Comma at top level ends an expression-bodied arrow.
                if (c === ',' && depthBrace === 0 && depthParen === 0 && depthBracket === 0) break;
                i++;
            }
            return { __fnSource: s.slice(start, i) };
        }

        function parseObject() {
            i++; // {
            const obj = {};
            skipWs();
            if (s[i] === '}') { i++; return obj; }
            for (;;) {
                skipWs();
                let key;
                if (s[i] === '"' || s[i] === "'") {
                    key = parseString(s[i]);
                } else if (s[i] === '`') {
                    key = parseTemplate();
                } else if (/[A-Za-z_$]/.test(s[i])) {
                    const start = i;
                    while (i < s.length && /[A-Za-z0-9_$]/.test(s[i])) i++;
                    key = s.slice(start, i);
                } else {
                    throw new Error('object key must be a string or identifier at ' + i);
                }
                skipWs();
                if (s[i] === '(') {
                    // Shorthand method: key(args) { ... } → capture source.
                    const fnSrc = parseFunctionSource();
                    obj[key] = fnSrc;
                    skipWs();
                    if (s[i] === ',') { i++; continue; }
                    if (s[i] === '}') { i++; return obj; }
                    throw new Error('expected , or } at ' + i);
                }
                if (s[i] !== ':') throw new Error('expected : after key at ' + i);
                i++;
                obj[key] = parseValue();
                skipWs();
                if (s[i] === ',') { i++; continue; }
                if (s[i] === '}') { i++; return obj; }
                throw new Error('expected , or } at ' + i);
            }
        }

        function parseArray() {
            i++; // [
            const arr = [];
            skipWs();
            if (s[i] === ']') { i++; return arr; }
            for (;;) {
                arr.push(parseValue());
                skipWs();
                if (s[i] === ',') { i++; continue; }
                if (s[i] === ']') { i++; return arr; }
                throw new Error('expected , or ] at ' + i);
            }
        }

        function parseString(quote) {
            i++; // opening quote
            let out = '';
            while (i < s.length) {
                const c = s[i];
                if (c === '\\') {
                    const n = s[i + 1];
                    if (n === 'n') out += '\n';
                    else if (n === 't') out += '\t';
                    else if (n === 'r') out += '\r';
                    else if (n === quote) out += quote;
                    else if (n === '\\') out += '\\';
                    else if (n === 'u') {
                        out += String.fromCharCode(parseInt(s.slice(i + 2, i + 6), 16));
                        i += 4;
                    } else out += n;
                    i += 2;
                    continue;
                }
                if (c === quote) { i++; return out; }
                out += c;
                i++;
            }
            throw new Error('unterminated string');
        }

        /** Template literal → plain string. Interpolations kept as literal text. */
        function parseTemplate() {
            i++; // `
            let out = '';
            while (i < s.length) {
                const c = s[i];
                if (c === '\\') {
                    const n = s[i + 1];
                    if (n === 'n') out += '\n';
                    else if (n === 't') out += '\t';
                    else if (n === 'r') out += '\r';
                    else if (n === '`') out += '`';
                    else if (n === '\\') out += '\\';
                    else if (n === '$' && s[i + 2] === '{') {
                        // Keep ${...} as literal text (no interpolation evaluation).
                        out += '${';
                        i += 3;
                        let depth = 1;
                        while (i < s.length && depth > 0) {
                            if (s[i] === '{') depth++;
                            else if (s[i] === '}') depth--;
                            if (depth > 0) out += s[i];
                            i++;
                        }
                        out += '}';
                        continue;
                    } else out += n;
                    i += 2;
                    continue;
                }
                if (c === '`') { i++; return out; }
                out += c;
                i++;
            }
            throw new Error('unterminated template literal');
        }

        function parseNumber() {
            const start = i;
            if (s[i] === '-') i++;
            while (i < s.length && /[0-9.eE+\-]/.test(s[i])) i++;
            const n = Number(s.slice(start, i));
            if (Number.isNaN(n)) throw new Error('invalid number at ' + start);
            return n;
        }

        const val = parseValue();
        skipWs();
        if (i < s.length) throw new Error('trailing characters at ' + i);
        return val;
    }

    /**
     * Extract the object-literal argument of BigOSAppAPI.register(...)
     * using balanced-brace scanning (safe for nested functions/templates).
     */
    function extractRegisterArg(code) {
        const idx = code.search(/BigOSAppAPI\.register\s*\(/);
        if (idx < 0) return null;
        let i = code.indexOf('(', idx) + 1;
        while (i < code.length && /\s/.test(code[i])) i++;
        if (code[i] !== '{') return null;
        const start = i;
        let depth = 0;
        while (i < code.length) {
            const c = code[i];
            if (c === '"' || c === "'") {
                const q = c; i++;
                while (i < code.length && code[i] !== q) {
                    if (code[i] === '\\') i++;
                    i++;
                }
            } else if (c === '`') {
                i++;
                while (i < code.length && code[i] !== '`') {
                    if (code[i] === '\\') i++;
                    i++;
                }
            } else if (c === '{') depth++;
            else if (c === '}') {
                depth--;
                if (depth === 0) return code.slice(start, i + 1);
            }
            i++;
        }
        return null;
    }

    /**
     * Recursively sanitize / serialize guest values (state, arrays, primitives).
     * Strips functions to prevent host code execution or injection.
     */
    function serializeGuestValue(val) {
        if (val === null || val === undefined) return val === null ? null : undefined;
        if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'string') return val;
        if (typeof val === 'function') return undefined;
        if (Array.isArray(val)) {
            const arr = val.map(serializeGuestValue);
            try { Object.setPrototypeOf(arr, Object.getPrototypeOf(val)); } catch (_) {}
            return arr;
        }
        if (typeof val === 'object') {
            const proto = Object.getPrototypeOf(val);
            const out = proto ? Object.create(proto) : {};
            for (const [k, v] of Object.entries(val)) {
                if (typeof v === 'function') continue;
                out[k] = serializeGuestValue(v);
            }
            try { Object.setPrototypeOf(out, proto); } catch (_) {}
            return out;
        }
        return undefined;
    }

    /**
     * Recursively serialize literals and function sources for guest-frame evaluation code strings.
     */
    function serializeGuestLiteral(val) {
        if (val === null || val === undefined) return 'null';
        if (typeof val === 'number' || typeof val === 'boolean') return JSON.stringify(val);
        if (typeof val === 'string') return JSON.stringify(val);
        if (val && typeof val === 'object') {
            if (typeof val.__fnSource === 'string') {
                return val.__fnSource;
            }
            if (Array.isArray(val)) {
                return '[' + val.map(serializeGuestLiteral).join(',') + ']';
            }
            const entries = [];
            for (const [k, v] of Object.entries(val)) {
                const safeK = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
                entries.push(safeK + ': ' + serializeGuestLiteral(v));
            }
            return '{' + entries.join(',') + '}';
        }
        return 'null';
    }

    /**
     * Build guest-only code strings from parsed config fields.
     * Function sources ({__fnSource}) become method bodies — never host-eval.
     */
    function buildGuestCode(config) {
        let globalInit = '';
        let initCode = '';

        // config.global = { name: fnSource, ... } → return { name: fn }
        const g = config.global;
        if (g && typeof g === 'object' && !Array.isArray(g)) {
            const parts = [];
            for (const [name, val] of Object.entries(g)) {
                const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
                parts.push(safeKey + ': ' + serializeGuestLiteral(val));
            }
            if (parts.length > 0) {
                globalInit = 'return {' + parts.join(',') + '};';
            }
        } else if (typeof config.globalInit === 'string') {
            globalInit = config.globalInit.slice(0, 200000);
        }

        // config.init = fnSource → guest-side initializer body.
        if (config.init && typeof config.init === 'object' && typeof config.init.__fnSource === 'string') {
            initCode = config.init.__fnSource.slice(0, 200000);
        } else if (typeof config.init === 'string') {
            initCode = config.init.slice(0, 200000);
        }

        return { globalInit, initCode };
    }

    /**
     * Install a package (legacy BigOSAppAPI-style or sandbox package) WITHOUT
     * executing it in the host. Returns install metadata.
     * Manifests are parsed as validated data — never with new Function/eval.
     * Function fields are captured as guest-only source strings.
     */
    async function installPackage(codeOrPkg, meta = {}) {
        let pkg = typeof codeOrPkg === 'string' ? null : codeOrPkg;
        let code = typeof codeOrPkg === 'string' ? codeOrPkg : (pkg && pkg.code) || '';

        // Extract a config block from legacy `BigOSAppAPI.register({...})` scripts.
        let config = (pkg && pkg.config) || null;
        if (!config && code) {
            const argSrc = extractRegisterArg(code);
            if (argSrc == null) {
                throw new Error('Nie znaleziono BigOSAppAPI.register({...}) w pakiecie');
            }
            try {
                config = parseLiteral(argSrc);
            } catch (e) {
                throw new Error('Nie można sparsować manifestu aplikacji: ' + e.message);
            }
        }
        if (!config || typeof config !== 'object' || !config.id) {
            throw new Error('Pakiet nie zawiera poprawnego id');
        }

        // Convert captured function sources into guest-only code strings.
        const { globalInit, initCode } = buildGuestCode(config);

        const requestedPermissions = Array.isArray(config.permissions)
            ? config.permissions.filter((p) => ALL_PERMISSIONS.includes(p))
            : [];
        // Unknown permission strings are dropped at install.
        const unknown = Array.isArray(config.permissions)
            ? config.permissions.filter((p) => !ALL_PERMISSIONS.includes(p))
            : [];

        // Sanitize display fields — never render untrusted markup into the host.
        const safeName = String(config.name || config.id).replace(/[<>&"']/g, '').slice(0, 80);
        const safeIcon = String(config.icon || '📦').replace(/[<>&"']/g, '').slice(0, 8);

        const record = {
            id: String(config.id).replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 64),
            name: safeName,
            icon: safeIcon,
            version: String(config.version || '1.0.0').slice(0, 32),
            category: String(config.category || meta.category || 'Zainstalowane').slice(0, 50),
            width: /^\d{1,4}px$/.test(String(config.width || '')) ? String(config.width) : (config.width || '420px'),
            height: /^\d{1,4}px$/.test(String(config.height || '')) ? String(config.height) : (config.height || 'auto'),
            html: typeof config.html === 'string' ? config.html.slice(0, 500000) : '',
            code: typeof code === 'string' ? code : '',
            // Guest-side only. Never executed in the host.
            globalName: typeof config.globalName === 'string'
                ? config.globalName.replace(/[^A-Za-z0-9_$]/g, '').slice(0, 64)
                : null,
            globalInit: globalInit,
            initCode: initCode,
            requestedPermissions,
            permissions: [], // user grants — empty until explicitly granted
            unknownPermissions: unknown,
            installedAt: Date.now(),
            source: meta.source || 'import'
        };

        if (meta.grantPermissions && Array.isArray(meta.grantPermissions)) {
            setGrantedPermissions(record.id, meta.grantPermissions, meta.allowedFiles);
            record.permissions = meta.grantPermissions.slice();
        }

        // Durable persistence must succeed before we report install success.
        if (global.bigosDB && global.bigosDB.putPackage) {
            const r = await global.bigosDB.putPackage(record);
            if (r && r.ok === false) throw r.error || new Error('Nie udało się zapisać pakietu');
        } else {
            throw new Error('Storage service unavailable — cannot persist package');
        }
        diag().log('sandbox', `Installed package ${record.id}`, { requestedPermissions, unknown });
        return record;
    }

    async function launchPackage(pkgId) {
        let pkg = null;
        if (global.bigosDB && global.bigosDB.getPackage) {
            pkg = await global.bigosDB.getPackage(pkgId);
        }
        if (!pkg || !pkg.id) {
            const all = (await global.bigosDB.listPackages()) || [];
            pkg = all.find((p) => p.id === pkgId);
        }
        if (!pkg) throw new Error('Nie znaleziono pakietu ' + pkgId);
        const storedScope = getGrantedScope(pkgId);
        return sandbox.mount({
            ...pkg,
            permissions: storedScope.permissions
        });
    }

    async function uninstallPackage(pkgId) {
        // Close any live frames first — revoke broker channels.
        sandbox.unmount(pkgId);
        const grants = loadGrants();
        if (grants[pkgId]) {
            delete grants[pkgId];
            saveGrants(grants);
        }
        if (global.bundledCatalog && global.bundledCatalog.isBundled && global.bundledCatalog.isBundled(pkgId)) {
            global.bundledCatalog.markUninstalled(pkgId);
        }
        if (global.bigosDB && global.bigosDB.deletePackage) {
            const r = await global.bigosDB.deletePackage(pkgId);
            if (r && r.ok === false) throw r.error || new Error('Nie udało się usunąć pakietu');
        }
        // Remove desktop icon / registry entries via shared state.
        if (global.bigosState && global.bigosState.removeWhere) {
            global.bigosState.removeWhere((f) => f && (f.appId === pkgId || f.id === 'app_' + pkgId));
        } else if (Array.isArray(global.fileSystem)) {
            global.fileSystem = global.fileSystem.filter((f) => f.appId !== pkgId && f.id !== 'app_' + pkgId);
        }
        if (global.fsManager && global.fsManager.save) await global.fsManager.save();
        if (global.desktop && global.desktop.render) global.desktop.render();
        if (global.defaultApps) {
            const i = global.defaultApps.findIndex((a) => a.appId === pkgId);
            if (i >= 0) global.defaultApps.splice(i, 1);
        }
        const btn = document.getElementById('start-btn-' + pkgId);
        if (btn) btn.remove();
        diag().log('sandbox', `Uninstalled package ${pkgId}`);
        return { ok: true };
    }

    sandbox.installPackage = installPackage;
    sandbox.launchPackage = launchPackage;
    sandbox.uninstallPackage = uninstallPackage;
    sandbox.parseLiteral = parseLiteral;
    sandbox.getGrantedScope = getGrantedScope;
    sandbox.getGrantedPermissions = (appId) => getGrantedScope(appId).permissions;
    sandbox.setGrantedPermissions = setGrantedPermissions;
    sandbox.isMounted = (pkgId) => frames.has(pkgId);
    sandbox.hasPackage = (pkgId) => frames.has(pkgId) || (global.defaultApps && global.defaultApps.some(a => a.appId === pkgId));
    sandbox.serializeGuestValue = serializeGuestValue;
    sandbox.serializeGuestLiteral = serializeGuestLiteral;
    sandbox.handleHostRequest = handleHostRequest;

    global.bigosSandbox = sandbox;
})(typeof window !== 'undefined' ? window : globalThis);
