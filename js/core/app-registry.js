// ======================================================================
// PLIK: js/core/app-registry.js (Centralny rejestr aplikacji i cykl życia)
// Tracks instances, windows, listeners, timers, rAF loops, workers,
// AudioContexts and temporary object URLs. Releases resources on dispose.
// Replaces setTimeout-based dependency coordination with async readiness.
// ======================================================================

(function (global) {
    'use strict';

    const diag = () => global.bigosDiag || global.diag || { log() {}, warn() {}, error() {} };

    /** Resource bag bound to one app instance. */
    function createResourceBag(appId, instanceId) {
        const bag = {
            appId,
            instanceId,
            timers: new Set(),
            intervals: new Set(),
            rafs: new Set(),
            listeners: [],          // {target, type, fn, opts}
            workers: new Set(),
            audio: new Set(),
            urls: new Set(),
            aborts: new Set(),
            disposed: false,

            setTimeout(fn, ms) {
                const id = setTimeout(() => { bag.timers.delete(id); fn(); }, ms);
                bag.timers.add(id);
                return id;
            },
            clearTimeout(id) { bag.timers.delete(id); clearTimeout(id); },
            setInterval(fn, ms) {
                const id = setInterval(fn, ms);
                bag.intervals.add(id);
                return id;
            },
            clearInterval(id) { bag.intervals.delete(id); clearInterval(id); },
            requestAnimationFrame(fn) {
                const id = requestAnimationFrame((t) => { bag.rafs.delete(id); fn(t); });
                bag.rafs.add(id);
                return id;
            },
            cancelAnimationFrame(id) { bag.rafs.delete(id); cancelAnimationFrame(id); },
            addEventListener(target, type, fn, opts) {
                if (!target || !target.addEventListener) return;
                target.addEventListener(type, fn, opts);
                bag.listeners.push({ target, type, fn, opts });
            },
            createObjectURL(obj) {
                const url = URL.createObjectURL(obj);
                bag.urls.add(url);
                return url;
            },
            revokeObjectURL(url) {
                bag.urls.delete(url);
                try { URL.revokeObjectURL(url); } catch (_) { /* noop */ }
            },
            registerWorker(w) { bag.workers.add(w); return w; },
            registerAudio(ctx) { bag.audio.add(ctx); return ctx; },
            registerAbort(c) { bag.aborts.add(c); return c; },

            dispose() {
                if (bag.disposed) return;
                bag.disposed = true;
                bag.timers.forEach((id) => clearTimeout(id));
                bag.intervals.forEach((id) => clearInterval(id));
                bag.rafs.forEach((id) => cancelAnimationFrame(id));
                bag.listeners.forEach(({ target, type, fn, opts }) => {
                    try { target.removeEventListener(type, fn, opts); } catch (_) { /* noop */ }
                });
                bag.workers.forEach((w) => { try { w.terminate(); } catch (_) { /* noop */ } });
                bag.audio.forEach((ctx) => { try { ctx.close(); } catch (_) { /* noop */ } });
                bag.urls.forEach((u) => { try { URL.revokeObjectURL(u); } catch (_) { /* noop */ } });
                bag.aborts.forEach((c) => { try { c.abort(); } catch (_) { /* noop */ } });
                bag.timers.clear(); bag.intervals.clear(); bag.rafs.clear();
                bag.listeners.length = 0;
                bag.workers.clear(); bag.audio.clear(); bag.urls.clear(); bag.aborts.clear();
                diag().log('lifecycle', 'Resources disposed', { appId, instanceId });
            }
        };
        return bag;
    }

    /**
     * Readiness gates: modules register a promise; consumers await whenReady(name).
     * Replaces "wait N ms and hope the dependency loaded" patterns.
     */
    const readiness = {
        _ready: new Map(),
        _resolvers: new Map(),
        declare(name) {
            if (this._ready.has(name)) return this._ready.get(name);
            let resolve, reject;
            const p = new Promise((res, rej) => { resolve = res; reject = rej; });
            this._ready.set(name, p);
            this._resolvers.set(name, { resolve, reject });
            return p;
        },
        markReady(name, value) {
            if (!this._ready.has(name)) this.declare(name);
            this._resolvers.get(name).resolve(value);
            diag().log('lifecycle', `Service ready: ${name}`);
        },
        markFailed(name, err) {
            if (!this._ready.has(name)) this.declare(name);
            this._resolvers.get(name).reject(err);
            diag().error('lifecycle', `Service failed: ${name}`, { error: err && err.message });
        },
        whenReady(name) {
            if (!this._ready.has(name)) this.declare(name);
            return this._ready.get(name);
        },
        isReady(name) {
            // A resolved promise can't be inspected synchronously; track a flag.
            return this._settled.get(name) === 'ready';
        },
        _settled: new Map()
    };
    // Track settled state for isReady().
    const _origMark = readiness.markReady.bind(readiness);
    readiness.markReady = (n, v) => { readiness._settled.set(n, 'ready'); return _origMark(n, v); };
    const _origFail = readiness.markFailed.bind(readiness);
    readiness.markFailed = (n, e) => { readiness._settled.set(n, 'failed'); return _origFail(n, e); };

    // Declare core services up front so consumers can await them.
    readiness.declare('storage');
    readiness.declare('filesystem');
    readiness.declare('auth');

    const registry = {
        apps: new Map(),       // appId -> definition
        instances: new Map(),  // instanceId -> instance
        byApp: new Map(),      // appId -> Set<instanceId>
        hidden: new Set(),     // appIds currently minimized/hidden
        readiness,

        /**
         * Register (or re-register) an app definition.
         * def: {
         *   id, name, icon,
         *   lazy?: () => Promise<void>,   // heavy module loader
         *   init?(ctx), open?(ctx), close?(ctx), suspend?(ctx), resume?(ctx), dispose?(ctx),
         *   backgroundable?: boolean,     // e.g. music playback
         *   multiInstance?: boolean
         * }
         */
        register(def) {
            if (!def || !def.id) throw new Error('app definition requires id');
            this.apps.set(def.id, { ...def, openCount: 0 });
            diag().log('lifecycle', `Registered app ${def.id}`);
            return def.id;
        },

        get(appId) { return this.apps.get(appId); },
        list() { return Array.from(this.apps.values()); },

        /**
         * Full open cycle: lazy-load → init (once) → open → instance tracking.
         * Returns the instance context.
         */
        async launch(appId, opts = {}) {
            const def = this.apps.get(appId);
            if (!def) {
                // Unknown apps may still use legacy winManager windows.
                diag().warn('lifecycle', `launch() on unregistered app ${appId}`);
                return null;
            }

            if (def.lazy && !def._loaded) {
                diag().log('lifecycle', `Lazy-loading ${appId}`);
                await def.lazy();
                def._loaded = true;
            }

            const instanceId = appId + '#' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            const bag = createResourceBag(appId, instanceId);
            const ctx = {
                appId,
                instanceId,
                opts,
                resources: bag,
                windowEl: document.getElementById('app-' + appId) || null,
                state: {},
                // Internal app API surface (documented in docs/APP_API.md)
                api: global.bigosAppInternal || {}
            };

            if (!def._inited) {
                if (typeof def.init === 'function') await def.init(ctx);
                def._inited = true;
            }
            if (typeof def.open === 'function') await def.open(ctx);

            this.instances.set(instanceId, { def, ctx, state: 'open' });
            if (!this.byApp.has(appId)) this.byApp.set(appId, new Set());
            this.byApp.get(appId).add(instanceId);
            def.openCount++;
            this.hidden.delete(appId);
            diag().log('lifecycle', `Opened ${appId}`, { instanceId });
            return ctx;
        },

        /** Suspend rendering/loops when window is minimized or hidden. */
        suspend(appId) {
            const ids = this.byApp.get(appId);
            if (!ids) return;
            this.hidden.add(appId);
            ids.forEach((iid) => {
                const inst = this.instances.get(iid);
                if (!inst || inst.state !== 'open') return;
                inst.state = 'suspended';
                if (typeof inst.def.suspend === 'function') {
                    try { inst.def.suspend(inst.ctx); } catch (e) { diag().error('lifecycle', 'suspend failed', { appId, error: e.message }); }
                }
            });
            diag().log('lifecycle', `Suspended ${appId}`);
        },

        resume(appId) {
            const ids = this.byApp.get(appId);
            if (!ids) return;
            this.hidden.delete(appId);
            ids.forEach((iid) => {
                const inst = this.instances.get(iid);
                if (!inst || inst.state !== 'suspended') return;
                inst.state = 'open';
                if (typeof inst.def.resume === 'function') {
                    try { inst.def.resume(inst.ctx); } catch (e) { diag().error('lifecycle', 'resume failed', { appId, error: e.message }); }
                }
            });
            diag().log('lifecycle', `Resumed ${appId}`);
        },

        /** Close one instance (or all for appId) and dispose its resources. */
        async close(appId, instanceId) {
            const ids = instanceId
                ? [instanceId]
                : Array.from(this.byApp.get(appId) || []);

            for (const iid of ids) {
                const inst = this.instances.get(iid);
                if (!inst) continue;
                try {
                    if (typeof inst.def.close === 'function') await inst.def.close(inst.ctx);
                } catch (e) { diag().error('lifecycle', 'close hook failed', { appId, error: e.message }); }
                try {
                    if (typeof inst.def.dispose === 'function') await inst.def.dispose(inst.ctx);
                } catch (e) { diag().error('lifecycle', 'dispose hook failed', { appId, error: e.message }); }
                inst.ctx.resources.dispose();
                inst.state = 'closed';
                this.instances.delete(iid);
                const set = this.byApp.get(appId);
                if (set) {
                    set.delete(iid);
                    if (set.size === 0) this.byApp.delete(appId);
                }
                diag().log('lifecycle', `Closed ${appId}`, { instanceId: iid });
            }
        },

        async closeAll() {
            for (const appId of Array.from(this.byApp.keys())) {
                await this.close(appId);
            }
        },

        /** Activity list for diagnostics / Nadzorca. */
        activity() {
            const rows = [];
            for (const [appId, ids] of this.byApp) {
                const def = this.apps.get(appId);
                for (const iid of ids) {
                    const inst = this.instances.get(iid);
                    if (!inst) continue;
                    rows.push({
                        appId,
                        instanceId: iid,
                        name: def ? def.name : appId,
                        icon: def ? def.icon : '📦',
                        state: inst.state,
                        timers: inst.ctx.resources.timers.size,
                        intervals: inst.ctx.resources.intervals.size,
                        rafs: inst.ctx.resources.rafs.size,
                        listeners: inst.ctx.resources.listeners.length,
                        workers: inst.ctx.resources.workers.size,
                        audio: inst.ctx.resources.audio.size,
                        backgroundable: !!(def && def.backgroundable)
                    });
                }
            }
            return rows;
        },

        isOpen(appId) { return this.byApp.has(appId); }
    };

    global.bigosAppRegistry = registry;
    // Shorter alias used by system modules.
    global.appRegistry = registry;
})(typeof window !== 'undefined' ? window : globalThis);
