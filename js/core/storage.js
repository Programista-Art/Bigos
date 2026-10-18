// ======================================================================
// PLIK: js/core/storage.js (Jedyna autorytatywna warstwa pamięci BigOS)
// - One database, one schema (v2), one bigosDB service.
// - Transaction completion (not request success) before resolving writes.
// - Safe upgrade / blocked / versionchange handling.
// - Real migration from legacy fs_store + localStorage, retry-safe.
// - Incremental per-file records; legacy array view kept in sync.
// ======================================================================

(function (global) {
    'use strict';

    const diag = () => global.bigosDiag || { log() {}, warn() {}, error() {} };

    const DB_NAME = 'BigOS_DB';
    const SCHEMA_VERSION = 2;

    const STORES = {
        meta: 'meta_store',
        files: 'files_store',
        contents: 'contents_store',
        kv: 'kv_store',
        packages: 'packages_store',
        history: 'history_store',
        legacy: 'fs_store'
    };

    const BIGOS_LS_PREFIXES = ['bigos_', 'bigos-'];
    const BIGOS_DB_NAMES = [DB_NAME];

    // Migration marker keys (in meta_store).
    const MIG = {
        schemaVersion: 'schemaVersion',
        lastMigration: 'lastMigration',
        filesSplitAt: 'filesSplitAt',
        lsMigratedAt: 'lsMigratedAt',
        migrationLock: 'migrationLock'
    };

    let dbPromise = null;
    let writeChain = Promise.resolve();
    let fallbackDiverged = false;
    let idbAvailable = typeof indexedDB !== 'undefined';
    let migrationInFlight = null;
    let maintenanceLock = false;
    let databaseDeletionPending = false;

    // Maintenance channel for cross-tab coordination.
    let maintenanceChannel = null;
    try {
        if (typeof BroadcastChannel !== 'undefined') {
            maintenanceChannel = new BroadcastChannel('bigos_maintenance');
            maintenanceChannel.onmessage = (ev) => {
                if (ev.data && ev.data.type === 'maintenance_begin') {
                    if (typeof bigosDB !== 'undefined' && bigosDB.close) bigosDB.close();
                }
            };
        }
    } catch (_) {}

    const LS_FALLBACK_KEY = 'bigos_fallback_diverged_keys';
    function loadFallbackKeys() {
        try {
            const raw = localStorage.getItem(LS_FALLBACK_KEY);
            return raw ? new Set(JSON.parse(raw)) : new Set();
        } catch (_) { return new Set(); }
    }
    function saveFallbackKeys(keys) {
        try {
            if (!keys || keys.size === 0) localStorage.removeItem(LS_FALLBACK_KEY);
            else localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(Array.from(keys)));
        } catch (_) {}
    }

    /** Keys last written via localStorage fallback — reads prefer LS for these
     *  until verified reconciliation restores IDB as the source of truth.
     *  Persisted in localStorage so reloads remain coherent. */
    const fallbackKeys = loadFallbackKeys();
    if (fallbackKeys.size > 0 && idbAvailable) fallbackDiverged = true;

    // ------------------------------------------------------------------
    // Result helpers
    // ------------------------------------------------------------------
    function ok(value) { return { ok: true, value: value }; }
    function fail(error, code) {
        const err = error instanceof Error ? error : new Error(String(error));
        return { ok: false, error: err, code: code || 'STORAGE_ERROR' };
    }

    function reqToPromise(req) {
        return new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error || new Error('request failed'));
        });
    }

    /** Resolve only when the transaction commits. Reject on error/abort. */
    function txDone(tx) {
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error('transaction failed'));
            tx.onabort = () => reject(tx.error || new Error('transaction aborted'));
        });
    }

    // ------------------------------------------------------------------
    // Open / upgrade
    // ------------------------------------------------------------------
    function open() {
        if (databaseDeletionPending) {
            return Promise.reject(Object.assign(new Error('Database deletion is pending'), { code: 'DELETE_PENDING' }));
        }
        if (dbPromise) return dbPromise;

        dbPromise = new Promise((resolve, reject) => {
            if (!idbAvailable) {
                reject(Object.assign(new Error('IndexedDB unavailable'), { code: 'IDB_UNAVAILABLE' }));
                return;
            }
            let req;
            try {
                req = indexedDB.open(DB_NAME, SCHEMA_VERSION);
            } catch (e) {
                reject(e);
                return;
            }

            let upgradeError = null;

            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                const tx = e.target.transaction;
                try {
                    createStores(db, e.oldVersion, e.newVersion, tx);
                } catch (err) {
                    upgradeError = err;
                    diag().error('storage', 'Upgrade failed — aborting to preserve old data', { error: err.message });
                    try { tx.abort(); } catch (_) { /* already aborting */ }
                }
            };

            req.onsuccess = (e) => {
                if (upgradeError) {
                    try { e.target.result.close(); } catch (_) { /* noop */ }
                    reject(upgradeError);
                    return;
                }
                const db = e.target.result;
                db.onversionchange = () => {
                    // Another tab is upgrading — close so it can proceed.
                    try { db.close(); } catch (_) { /* noop */ }
                    dbPromise = null;
                    diag().warn('storage', 'versionchange — closed local connection');
                };
                resolve(db);
            };

            req.onerror = () => {
                reject(req.error || Object.assign(new Error('open failed'), { code: 'IDB_OPEN_FAILED' }));
            };

            req.onblocked = () => {
                // Another tab holds an old connection. Surface it; do not hang forever.
                diag().warn('storage', 'open blocked by another tab');
                // No auto-reject here — the request may still succeed when the
                // other tab closes. Callers can race with a timeout if needed.
            };
        }).catch((err) => {
            dbPromise = null;
            throw err;
        });

        return dbPromise;
    }

    function createStores(db, oldVersion, newVersion, tx) {
        diag().log('storage', `Schema upgrade ${oldVersion} → ${newVersion}`);

        const legacy = db.objectStoreNames.contains(STORES.legacy)
            ? tx.objectStore(STORES.legacy)
            : null;

        if (!db.objectStoreNames.contains(STORES.meta)) db.createObjectStore(STORES.meta);
        if (!db.objectStoreNames.contains(STORES.files)) db.createObjectStore(STORES.files);
        if (!db.objectStoreNames.contains(STORES.contents)) db.createObjectStore(STORES.contents);
        if (!db.objectStoreNames.contains(STORES.packages)) db.createObjectStore(STORES.packages);
        if (!db.objectStoreNames.contains(STORES.history)) db.createObjectStore(STORES.history);

        if (!db.objectStoreNames.contains(STORES.kv)) {
            const kv = db.createObjectStore(STORES.kv);
            // Copy legacy key/values so app settings survive the upgrade.
            if (legacy) {
                try {
                    const cursorReq = legacy.openCursor();
                    cursorReq.onsuccess = () => {
                        const cur = cursorReq.result;
                        if (!cur) return;
                        try { kv.put(cur.value, cur.primaryKey); } catch (_) { /* skip */ }
                        cur.continue();
                    };
                } catch (_) { /* cursor optional during upgrade */ }
            }
        }

        try {
            const meta = tx.objectStore(STORES.meta);
            meta.put(SCHEMA_VERSION, MIG.schemaVersion);
            meta.put({ at: Date.now(), from: oldVersion, to: newVersion }, MIG.lastMigration);
        } catch (_) { /* meta writes are best-effort during upgrade */ }
    }

    // ------------------------------------------------------------------
    // Low-level store ops (always wait for transaction commit)
    // ------------------------------------------------------------------
    async function getFrom(store, key) {
        const db = await open();
        const tx = db.transaction(store, 'readonly');
        const val = await reqToPromise(tx.objectStore(store).get(key));
        await txDone(tx).catch(() => {}); // readonly rarely fails after get
        return val;
    }

    async function putTo(store, key, value) {
        return serialize(async () => {
            try {
                const db = await open();
                const tx = db.transaction(store, 'readwrite');
                tx.objectStore(store).put(value, key);
                await txDone(tx);
                return ok(true);
            } catch (e) {
                return tryFallbackPut(store, key, value, e);
            }
        });
    }

    function tryFallbackPut(store, key, value, originalError) {
        // Only kv-shaped data can fall back to localStorage.
        if (store !== STORES.kv && store !== STORES.legacy) {
            diag().error('storage', 'Write failed (no fallback for store)', { store, key, error: originalError.message });
            return fail(originalError, 'STORAGE_WRITE_FAILED');
        }
        try {
            localStorage.setItem(key, JSON.stringify(value));
            if (idbAvailable) fallbackDiverged = true;
            // Track the key so subsequent reads see this value (coherent fallback).
            fallbackKeys.add(key);
            saveFallbackKeys(fallbackKeys);
            return ok(true);
        } catch (lsError) {
            diag().error('storage', 'Both backends failed', { key, error: lsError.message });
            return fail(lsError, 'STORAGE_FULL');
        }
    }

    /**
     * Reconcile fallback keys back into IndexedDB when it is available again.
     * Returns { reconciled, remaining }.
     */
    async function reconcileFallback() {
        if (fallbackKeys.size === 0) return { reconciled: 0, remaining: 0 };
        let reconciled = 0;
        const remaining = new Set();
        for (const key of Array.from(fallbackKeys)) {
            try {
                const raw = localStorage.getItem(key);
                if (raw == null) {
                    fallbackKeys.delete(key);
                    saveFallbackKeys(fallbackKeys);
                    continue;
                }
                let val;
                try { val = JSON.parse(raw); } catch (_) { val = raw; }
                const db = await open();
                const tx = db.transaction(STORES.kv, 'readwrite');
                tx.objectStore(STORES.kv).put(val, key);
                await txDone(tx);
                fallbackKeys.delete(key);
                saveFallbackKeys(fallbackKeys);
                reconciled++;
            } catch (_) {
                remaining.add(key);
            }
        }
        if (fallbackKeys.size === 0) fallbackDiverged = false;
        return { reconciled, remaining: remaining.size };
    }

    async function delFrom(store, key) {
        return serialize(async () => {
            let idbError = null;
            try {
                const db = await open();
                const tx = db.transaction(store, 'readwrite');
                tx.objectStore(store).delete(key);
                await txDone(tx);
            } catch (e) {
                idbError = e;
            }
            try {
                localStorage.removeItem(key);
            } catch (_) {}
            fallbackKeys.delete(key);
            saveFallbackKeys(fallbackKeys);
            if (idbError) {
                return fail(idbError, 'STORAGE_DELETE_FAILED');
            }
            return ok(true);
        });
    }

    let maintenanceOpInProgress = false;

    function serialize(fn, isMaintenance = false) {
        if (maintenanceLock && !isMaintenance && !maintenanceOpInProgress) {
            return Promise.resolve(fail(new Error('Storage is locked for maintenance'), 'MAINTENANCE_LOCKED'));
        }
        if (databaseDeletionPending) {
            return Promise.resolve(fail(new Error('Database deletion is pending'), 'DELETE_PENDING'));
        }
        const timed = () => {
            let timer;
            const timeout = new Promise((_, rej) => {
                timer = setTimeout(() => rej(Object.assign(new Error('storage write timeout'), { code: 'STORAGE_TIMEOUT' })), 8000);
            });
            return Promise.race([Promise.resolve().then(fn), timeout])
                .finally(() => clearTimeout(timer));
        };
        const run = writeChain.then(timed, timed);
        writeChain = run.then(() => {}, () => {});
        return run;
    }

    // ------------------------------------------------------------------
    // Migration (legacy monolithic fs_store / localStorage → typed records)
    // Safe to retry: markers prevent duplicates; source kept until success.
    // ------------------------------------------------------------------
    async function ensureMigrated() {
        if (migrationInFlight) return migrationInFlight;
        migrationInFlight = (async () => {
            try {
                await migrateLocalStorageIfAny();
                await splitLegacyFilesIfAny();
            } finally {
                migrationInFlight = null;
            }
        })();
        return migrationInFlight;
    }

    async function migrateLocalStorageIfAny() {
        let already = false;
        try {
            already = !!(await getFrom(STORES.meta, MIG.lsMigratedAt));
        } catch (_) { /* no db yet */ }

        const lsKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && BIGOS_LS_PREFIXES.some((p) => k.startsWith(p))) lsKeys.push(k);
        }
        if (already && lsKeys.length === 0) return;

        for (const key of lsKeys) {
            // Do not overwrite newer IDB values.
            let existing;
            try { existing = await getFrom(STORES.kv, key); } catch (_) { existing = undefined; }
            if (existing !== undefined) continue;
            const raw = localStorage.getItem(key);
            if (raw == null) continue;
            let val;
            try { val = JSON.parse(raw); } catch (_) { val = raw; }
            try {
                const db = await open();
                const tx = db.transaction(STORES.kv, 'readwrite');
                tx.objectStore(STORES.kv).put(val, key);
                await txDone(tx);
            } catch (e) {
                diag().warn('storage', 'LS→IDB copy failed', { key, error: e.message });
            }
        }

        try {
            const db = await open();
            const tx = db.transaction(STORES.meta, 'readwrite');
            tx.objectStore(STORES.meta).put(Date.now(), MIG.lsMigratedAt);
            await txDone(tx);
        } catch (_) { /* marker optional */ }
    }

    async function splitLegacyFilesIfAny() {
        let already = false;
        try {
            already = !!(await getFrom(STORES.meta, MIG.filesSplitAt));
        } catch (_) { /* no db */ }
        if (already) return;

        // Prefer the live legacy array (kv bigos_fs), then localStorage.
        let legacyFs;
        try { legacyFs = await getFrom(STORES.kv, 'bigos_fs'); } catch (_) { legacyFs = undefined; }
        if (!Array.isArray(legacyFs) || legacyFs.length === 0) {
            const raw = localStorage.getItem('bigos_fs');
            if (raw) {
                try { legacyFs = JSON.parse(raw); } catch (_) { legacyFs = null; }
            }
        }
        if (!Array.isArray(legacyFs) || legacyFs.length === 0) {
            // Nothing to split — still mark so we do not re-scan forever.
            try {
                const db = await open();
                const tx = db.transaction(STORES.meta, 'readwrite');
                tx.objectStore(STORES.meta).put(Date.now(), MIG.filesSplitAt);
                await txDone(tx);
            } catch (_) { /* noop */ }
            return;
        }

        diag().log('storage', 'Splitting legacy filesystem array', { count: legacyFs.length });
        await serialize(async () => {
            const db = await open();
            const tx = db.transaction([STORES.files, STORES.contents, STORES.meta], 'readwrite');
            const files = tx.objectStore(STORES.files);
            const contents = tx.objectStore(STORES.contents);
            for (const item of legacyFs) {
                if (!item || !item.id) continue;
                const meta = { ...item };
                const content = meta.content;
                delete meta.content;
                files.put(meta, item.id);
                if (content !== undefined && content !== null && content !== '') {
                    contents.put(content, item.id);
                }
            }
            tx.objectStore(STORES.meta).put(Date.now(), MIG.filesSplitAt);
            await txDone(tx);
        });
        // Source (bigos_fs kv) is left in place until a successful backup /
        // explicit cleanup — recoverable if something later fails.
    }

    // ------------------------------------------------------------------
    // Public service
    // ------------------------------------------------------------------
    const bigosDB = {
        dbName: DB_NAME,
        storeName: STORES.legacy,
        SCHEMA_VERSION,
        STORES,
        BIGOS_LS_PREFIXES,
        BIGOS_DB_NAMES,
        get fallbackDiverged() { return fallbackDiverged; },

        open,
        ensureMigrated,
        reconcileFallback,

        async isIdbUsable() {
            try { await open(); return true; } catch (_) { return false; }
        },

        /** Legacy-compatible get: kv first, then legacy store, then localStorage.
         *  Distinguishes "absent" (undefined) from "read failed" (throws).
         *  Keys written via fallback prefer localStorage until reconciled. */
        async get(key) {
            // Coherent fallback: if this key was last written via LS, read LS first.
            if (fallbackKeys.has(key)) {
                const raw = localStorage.getItem(key);
                if (raw != null) {
                    try { return JSON.parse(raw); } catch (_) { return raw; }
                }
            }
            let idbError = null;
            try {
                let v = await getFrom(STORES.kv, key);
                if (v === undefined) {
                    try { v = await getFrom(STORES.legacy, key); } catch (e2) {
                        // Legacy store may not exist — that is absent, not failure.
                        if (e2 && e2.name !== 'NotFoundError') idbError = e2;
                    }
                }
                return v;
            } catch (e) {
                idbError = e;
                // Fall back to localStorage ONLY as a recovery source.
                const raw = localStorage.getItem(key);
                if (raw != null) {
                    try { return JSON.parse(raw); } catch (_) { return raw; }
                }
                // No fallback value: propagate the authoritative read failure.
                if (idbError) {
                    const err = idbError instanceof Error ? idbError : new Error(String(idbError));
                    err.code = err.code || 'STORAGE_READ_FAILED';
                    throw err;
                }
                return undefined;
            }
        },

        /** Reliable set — resolves {ok} only after the transaction commits. */
        async set(key, value) {
            const r = await putTo(STORES.kv, key, value);
            return r;
        },

        async delete(key) {
            // Remove from kv + legacy + localStorage.
            // A failed IDB deletion is NOT converted into success by a LS remove.
            const errors = [];
            let idbOk = true;
            try {
                const r = await delFrom(STORES.kv, key);
                if (r && r.ok === false) { idbOk = false; errors.push(r.error); }
            } catch (e) { idbOk = false; errors.push(e); }
            try {
                const r2 = await delFrom(STORES.legacy, key);
                if (r2 && r2.ok === false) errors.push(r2.error);
            } catch (_) { /* legacy store may not exist */ }
            try { localStorage.removeItem(key); } catch (_) { /* optional */ }
            fallbackKeys.delete(key);
            if (!idbOk) {
                return fail(errors[0] || new Error('delete failed'), 'STORAGE_DELETE_FAILED');
            }
            return ok(true);
        },

        // -------- typed file / content --------
        async putFileMeta(meta) {
            if (!meta || !meta.id) return fail(new Error('file meta requires id'), 'INVALID');
            return putTo(STORES.files, meta.id, meta);
        },
        async getFileMeta(id) { return getFrom(STORES.files, id); },
        async deleteFileMeta(id) { return delFrom(STORES.files, id); },
        async listFileMetas() {
            const db = await open();
            const tx = db.transaction(STORES.files, 'readonly');
            const vals = await reqToPromise(tx.objectStore(STORES.files).getAll());
            await txDone(tx).catch(() => {});
            return vals;
        },

        async putContent(fileId, content) {
            return putTo(STORES.contents, fileId, content);
        },
        async getContent(fileId) { return getFrom(STORES.contents, fileId); },
        async deleteContent(fileId) { return delFrom(STORES.contents, fileId); },

        /**
         * Persist one filesystem node: meta + content in a single transaction.
         * Explicit empty string content is persisted explicitly in contents_store.
         * Only content === null or undefined (e.g. folder nodes) deletes the content entry.
         */
        async putFileNode(item) {
            if (!item || !item.id) return fail(new Error('file requires id'), 'INVALID');
            return serialize(async () => {
                try {
                    const db = await open();
                    const tx = db.transaction([STORES.files, STORES.contents], 'readwrite');
                    const meta = { ...item };
                    const content = meta.content;
                    delete meta.content;
                    tx.objectStore(STORES.files).put(meta, item.id);
                    if (content === null || content === undefined) {
                        tx.objectStore(STORES.contents).delete(item.id);
                    } else {
                        tx.objectStore(STORES.contents).put(content, item.id);
                    }
                    await txDone(tx);
                    return ok(true);
                } catch (e) {
                    return fail(e, 'STORAGE_WRITE_FAILED');
                }
            });
        },

        async deleteFileNode(id) {
            return serialize(async () => {
                try {
                    const db = await open();
                    const tx = db.transaction([STORES.files, STORES.contents, STORES.history], 'readwrite');
                    tx.objectStore(STORES.files).delete(id);
                    tx.objectStore(STORES.contents).delete(id);
                    // Remove revisions for this file.
                    const hist = tx.objectStore(STORES.history);
                    try {
                        const all = await reqToPromise(hist.getAll());
                        for (const r of all) {
                            if (r && r.fileId === id && r.id) hist.delete(r.id);
                        }
                    } catch (_) { /* optional */ }
                    await txDone(tx);
                    return ok(true);
                } catch (e) {
                    return fail(e, 'STORAGE_DELETE_FAILED');
                }
            });
        },

        /** Batch-write dirty nodes in one transaction. Explicit empty content is persisted. */
        async putFileNodes(items) {
            if (!Array.isArray(items) || items.length === 0) return ok(0);
            return serialize(async () => {
                try {
                    const db = await open();
                    const tx = db.transaction([STORES.files, STORES.contents], 'readwrite');
                    const files = tx.objectStore(STORES.files);
                    const contents = tx.objectStore(STORES.contents);
                    let n = 0;
                    for (const item of items) {
                        if (!item || !item.id) continue;
                        const meta = { ...item };
                        const content = meta.content;
                        delete meta.content;
                        files.put(meta, item.id);
                        if (content === null || content === undefined) {
                            contents.delete(item.id);
                        } else {
                            contents.put(content, item.id);
                        }
                        n++;
                    }
                    await txDone(tx);
                    return ok(n);
                } catch (e) {
                    return fail(e, 'STORAGE_WRITE_FAILED');
                }
            });
        },

        // -------- packages --------
        async putPackage(pkg) {
            if (!pkg || !pkg.id) return fail(new Error('package requires id'), 'INVALID');
            return putTo(STORES.packages, pkg.id, pkg);
        },
        async getPackage(id) { return getFrom(STORES.packages, id); },
        async deletePackage(id) { return delFrom(STORES.packages, id); },
        async listPackages() {
            const db = await open();
            const tx = db.transaction(STORES.packages, 'readonly');
            const vals = await reqToPromise(tx.objectStore(STORES.packages).getAll());
            await txDone(tx).catch(() => {});
            return vals;
        },

        // -------- document history --------
        async putRevision(fileId, revision) {
            const id = fileId + '::' + (revision.ts || Date.now()) + '::' + Math.random().toString(36).slice(2, 7);
            return putTo(STORES.history, id, { ...revision, fileId, id });
        },
        async listRevisions(fileId) {
            const db = await open();
            const tx = db.transaction(STORES.history, 'readonly');
            const all = await reqToPromise(tx.objectStore(STORES.history).getAll());
            await txDone(tx).catch(() => {});
            return (all || [])
                .filter((r) => r && r.fileId === fileId)
                .sort((a, b) => (b.ts || 0) - (a.ts || 0));
        },
        async deleteRevision(id) {
            return delFrom(STORES.history, id);
        },
        async pruneRevisions(fileId, keep = 20) {
            const list = await this.listRevisions(fileId);
            const drop = list.slice(keep);
            for (const r of drop) {
                if (r && r.id) await delFrom(STORES.history, r.id);
            }
            return drop.length;
        },

        /**
         * Atomic single-transaction restore across files, contents, packages, history, and kv.
         * If any write fails, IDB automatically rolls back the entire transaction.
         */
        async restoreAll(payload, { mode = 'replace' } = {}) {
            maintenanceOpInProgress = true;
            try {
                return await serialize(async () => {
                    try {
                        const db = await open();
                        const tx = db.transaction([STORES.files, STORES.contents, STORES.packages, STORES.history, STORES.kv], 'readwrite');
                        const files = tx.objectStore(STORES.files);
                        const contents = tx.objectStore(STORES.contents);
                        const pkgs = tx.objectStore(STORES.packages);
                        const hist = tx.objectStore(STORES.history);
                        const kv = tx.objectStore(STORES.kv);

                        if (mode === 'replace') {
                            files.clear();
                            contents.clear();
                            pkgs.clear();
                            hist.clear();
                            kv.clear();
                        }

                        if (Array.isArray(payload.files)) {
                            for (const item of payload.files) {
                                if (!item || !item.id) continue;
                                const meta = { ...item };
                                const content = meta.content;
                                delete meta.content;
                                files.put(meta, item.id);
                                if (content === null || content === undefined) {
                                    contents.delete(item.id);
                                } else {
                                    contents.put(content, item.id);
                                }
                            }
                        }

                        if (Array.isArray(payload.packages)) {
                            for (const pkg of payload.packages) {
                                if (pkg && pkg.id) pkgs.put(pkg, pkg.id);
                            }
                        }

                        if (payload.history && typeof payload.history === 'object') {
                            for (const [fileId, revs] of Object.entries(payload.history)) {
                                if (!Array.isArray(revs)) continue;
                                for (const rev of revs) {
                                    if (rev && rev.id) hist.put(rev, rev.id);
                                }
                            }
                        }

                        if (payload.settings && typeof payload.settings === 'object') {
                            for (const [k, val] of Object.entries(payload.settings)) {
                                kv.put(val, k);
                            }
                        }

                        await txDone(tx);
                        return ok(true);
                    } catch (e) {
                        return fail(e, 'STORAGE_RESTORE_FAILED');
                    }
                }, true);
            } finally {
                maintenanceOpInProgress = false;
            }
        },

        async runUnderMaintenance(fn) {
            maintenanceOpInProgress = true;
            try {
                return await fn();
            } finally {
                maintenanceOpInProgress = false;
            }
        },

        // -------- maintenance --------
        clearBigOSLocalStorage() {
            const removed = [];
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (!k) continue;
                if (BIGOS_LS_PREFIXES.some((p) => k.startsWith(p))) {
                    localStorage.removeItem(k);
                    removed.push(k);
                }
            }
            return removed;
        },

        /**
         * Delete the BigOS database. Resolves true ONLY on the success event.
         * Blocked/timeout is a failure — never pretend success.
         * Sets databaseDeletionPending to guard against normal writes reopening the DB.
         */
        async deleteDatabase({ timeoutMs = 5000 } = {}) {
            try { bigosDB.close(); } catch (_) { /* noop */ }
            dbPromise = null;
            databaseDeletionPending = true;

            try {
                if (maintenanceChannel) maintenanceChannel.postMessage({ type: 'maintenance_begin' });
            } catch (_) {}

            if (typeof indexedDB === 'undefined') {
                databaseDeletionPending = false;
                return fail(new Error('IndexedDB unavailable'), 'IDB_UNAVAILABLE');
            }

            return new Promise((resolve) => {
                let settled = false;
                const done = (result) => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    if (result && result.ok) {
                        databaseDeletionPending = false;
                    }
                    resolve(result);
                };

                const timer = setTimeout(() => {
                    // Do NOT clear databaseDeletionPending on timeout — the request is still pending.
                    diag().warn('storage', 'deleteDatabase timed out or blocked — pending flag remains engaged');
                    done(fail(
                        Object.assign(new Error('deleteDatabase blocked or timed out'), { code: 'DELETE_BLOCKED' }),
                        'DELETE_BLOCKED'
                    ));
                }, timeoutMs);

                let req;
                try {
                    req = indexedDB.deleteDatabase(DB_NAME);
                } catch (e) {
                    databaseDeletionPending = false;
                    done(fail(e, 'DELETE_FAILED'));
                    return;
                }

                req.onsuccess = () => {
                    dbPromise = null;
                    databaseDeletionPending = false;
                    done(ok(true));
                };
                req.onerror = () => {
                    databaseDeletionPending = false;
                    done(fail(req.error || new Error('deleteDatabase failed'), 'DELETE_FAILED'));
                };
                req.onblocked = () => {
                    diag().warn('storage', 'deleteDatabase blocked — another tab still holds a connection');
                    // Keep waiting until success/error or timeout. Do NOT resolve ok.
                };
            });
        },

        close() {
            if (dbPromise) {
                dbPromise.then((db) => {
                    try { db.close(); } catch (_) { /* noop */ }
                }).catch(() => {});
            }
            dbPromise = null;
        },

        setMaintenanceLock(locked) {
            maintenanceLock = !!locked;
            if (maintenanceLock) {
                diag().log('storage', 'Maintenance write lock engaged');
                try { if (maintenanceChannel) maintenanceChannel.postMessage({ type: 'maintenance_begin' }); } catch (_) {}
            } else {
                diag().log('storage', 'Maintenance write lock released');
                try { if (maintenanceChannel) maintenanceChannel.postMessage({ type: 'maintenance_end' }); } catch (_) {}
            }
        },
        isMaintenanceLocked() { return maintenanceLock; },
        isDeletionPending() { return databaseDeletionPending; },

        /** Clear every BigOS store (used by replace-restore). */
        async clear() {
            return serialize(async () => {
                try {
                    const db = await open();
                    const names = [STORES.meta, STORES.files, STORES.contents, STORES.kv, STORES.packages, STORES.history, STORES.legacy];
                    const existing = names.filter((n) => db.objectStoreNames.contains(n));
                    const tx = db.transaction(existing, 'readwrite');
                    existing.forEach((n) => { try { tx.objectStore(n).clear(); } catch (_) { /* noop */ } });
                    await txDone(tx);
                    return ok(true);
                } catch (e) {
                    return fail(e, 'STORAGE_CLEAR_FAILED');
                }
            });
        }
    };

    // Export.
    global.bigosDB = bigosDB;
    global.bigosStorage = {
        STORES, SCHEMA_VERSION, DB_NAME,
        get: getFrom,
        put: putTo,
        del: delFrom,
        serialize,
        open,
        ensureMigrated,
        reconcileFallback,
        txDone,
        get fallbackDiverged() { return fallbackDiverged; },
        clearBigOSLocalStorage: bigosDB.clearBigOSLocalStorage.bind(bigosDB),
        deleteDatabase: bigosDB.deleteDatabase.bind(bigosDB),
        setMaintenanceLock: bigosDB.setMaintenanceLock.bind(bigosDB),
        isMaintenanceLocked: bigosDB.isMaintenanceLocked.bind(bigosDB),
        isDeletionPending: bigosDB.isDeletionPending.bind(bigosDB)
    };
})(typeof window !== 'undefined' ? window : globalThis);
