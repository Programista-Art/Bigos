// ======================================================================
// PLIK: js/core/backup.js (Backup i przywracanie BigOS)
// Versioned backup format covering files, folders, app data, installed
// packages, settings and document history. API credentials EXCLUDED by
// default. Validate → preview → recoverable replace (full recovery copy).
// ======================================================================

(function (global) {
    'use strict';

    const diag = () => global.bigosDiag || { log() {}, warn() {}, error() {} };
    const FORMAT = 'bigos-backup-v1';
    const SENSITIVE = /api[-_]?key|password|token|secret|credential|authorization|bearer/i;
    const RECOVERY_KEY = 'bigos_recovery_copy';

    function stripSecrets(obj) {
        if (obj == null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(stripSecrets);
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
            if (SENSITIVE.test(k)) continue;
            out[k] = stripSecrets(v);
        }
        return out;
    }

    function collectLocalStorageSettings(includeCredentials) {
        const settings = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || !k.startsWith('bigos_')) continue;
            // Never nest a previous recovery copy inside a new backup.
            if (k === RECOVERY_KEY) continue;
            if (SENSITIVE.test(k) && !includeCredentials) continue;
            try { settings[k] = JSON.parse(localStorage.getItem(k)); }
            catch (_) { settings[k] = localStorage.getItem(k); }
        }
        return includeCredentials ? settings : stripSecrets(settings);
    }

    function arrayBufferToDataURL(buffer, mime = 'application/octet-stream') {
        const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
        const b64 = typeof Buffer !== 'undefined'
            ? Buffer.from(binary, 'binary').toString('base64')
            : (typeof btoa !== 'undefined' ? btoa(binary) : '');
        return `data:${mime};base64,${b64}`;
    }

    function dataURLToArrayBuffer(dataURL) {
        const parts = String(dataURL).split(',');
        const bin = typeof Buffer !== 'undefined'
            ? Buffer.from(parts[1] || '', 'base64').toString('binary')
            : (typeof atob !== 'undefined' ? atob(parts[1] || '') : '');
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return u8.buffer;
    }

    function blobToDataURL(blob) {
        if (typeof FileReader !== 'undefined') {
            return new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onload = () => resolve(r.result);
                r.onerror = () => reject(r.error);
                r.readAsDataURL(blob);
            });
        }
        if (blob && typeof blob.arrayBuffer === 'function') {
            return blob.arrayBuffer().then((ab) => arrayBufferToDataURL(ab, blob.type || 'application/octet-stream'));
        }
        if (blob && Array.isArray(blob.parts)) {
            const str = blob.parts.join('');
            const b64 = typeof Buffer !== 'undefined'
                ? Buffer.from(str, 'binary').toString('base64')
                : (typeof btoa !== 'undefined' ? btoa(str) : '');
            return Promise.resolve(`data:${blob.type || 'application/octet-stream'};base64,${b64}`);
        }
        return Promise.resolve('');
    }

    function dataURLToBlob(dataURL) {
        const parts = String(dataURL).split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const bin = typeof Buffer !== 'undefined'
            ? Buffer.from(parts[1] || '', 'base64').toString('binary')
            : (typeof atob !== 'undefined' ? atob(parts[1] || '') : '');
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        const BlobCtor = global.Blob || (typeof Blob !== 'undefined' ? Blob : null);
        if (BlobCtor) {
            return new BlobCtor([u8], { type: mime });
        }
        return { parts: [bin], type: mime };
    }

    /**
     * Wait for BOTH getAll and getAllKeys on the same transaction.
     */
    async function readAllWithKeys(store) {
        const db = await global.bigosDB.open();
        const tx = db.transaction(store, 'readonly');
        const os = tx.objectStore(store);
        const valsPromise = new Promise((resolve, reject) => {
            const r = os.getAll();
            r.onsuccess = () => resolve(r.result || []);
            r.onerror = () => reject(r.error);
        });
        const keysPromise = new Promise((resolve, reject) => {
            const r = os.getAllKeys();
            r.onsuccess = () => resolve(r.result || []);
            r.onerror = () => reject(r.error);
        });
        // Both must settle before we read either result.
        const [vals, keys] = await Promise.all([valsPromise, keysPromise]);
        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error || new Error('aborted'));
        });
        return { vals, keys };
    }

    async function collectFromDB(includeCredentials) {
        const store = global.bigosStorage;
        const dbApi = global.bigosDB;
        const out = {
            files: [],
            contents: {},
            contentsMeta: {},
            packages: [],
            settings: {},
            history: {},
            favorites: [],
            opHistory: []
        };

        if (!store || !dbApi) return out;

        // Typed file records.
        const metas = await dbApi.listFileMetas();
        out.files = metas.map((m) => stripSecrets(m));
        for (const m of metas) {
            let c = await dbApi.getContent(m.id);
            if (c instanceof (global.Blob || Object) || (c && typeof c === 'object' && typeof c.parts !== 'undefined')) {
                out.contentsMeta[m.id] = { type: 'blob', mime: c.type || 'application/octet-stream' };
                out.contents[m.id] = await blobToDataURL(c);
            } else if (c instanceof ArrayBuffer || (c && c.buffer instanceof ArrayBuffer)) {
                out.contentsMeta[m.id] = { type: 'arraybuffer' };
                out.contents[m.id] = arrayBufferToDataURL(c);
            } else if (typeof c === 'string') {
                out.contentsMeta[m.id] = { type: 'text' };
                out.contents[m.id] = c;
            } else if (c !== undefined && c !== null) {
                out.contentsMeta[m.id] = { type: 'object' };
                out.contents[m.id] = c;
            }
        }

        // Legacy monolithic array fallback when typed records are empty.
        if (out.files.length === 0) {
            const legacy = await dbApi.get('bigos_fs');
            if (Array.isArray(legacy)) {
                out.files = legacy.map((item) => {
                    const meta = { ...item };
                    const content = meta.content;
                    delete meta.content;
                    if (content !== undefined) {
                        out.contents[meta.id] = content;
                        out.contentsMeta[meta.id] = { type: typeof content === 'string' ? 'text' : 'object' };
                    }
                    return stripSecrets(meta);
                });
            }
        }

        const pkgs = await dbApi.listPackages();
        out.packages = pkgs.map((p) => (includeCredentials ? p : stripSecrets(p)));

        // KV settings — wait for every request on the transaction.
        try {
            const { vals, keys } = await readAllWithKeys(store.STORES.kv);
            keys.forEach((k, i) => {
                if (typeof k !== 'string') return;
                if (!k.startsWith('bigos_') && k !== 'bigos_fs') return;
                if (k === RECOVERY_KEY) return;
                if (SENSITIVE.test(k) && !includeCredentials) return;
                out.settings[k] = includeCredentials ? vals[i] : stripSecrets(vals[i]);
            });
        } catch (e) {
            diag().error('backup', 'kv collection failed', { error: e.message });
            throw new Error('Nie udało się odczytać ustawień systemowych (kv): ' + e.message);
        }

        // Document history.
        try {
            const db = await dbApi.open();
            const tx = db.transaction(store.STORES.history, 'readonly');
            const all = await new Promise((resolve, reject) => {
                const r = tx.objectStore(store.STORES.history).getAll();
                r.onsuccess = () => resolve(r.result || []);
                r.onerror = () => reject(r.error);
            });
            await new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
            });
            for (const rev of all) {
                if (!rev || !rev.fileId) continue;
                if (!out.history[rev.fileId]) out.history[rev.fileId] = [];
                out.history[rev.fileId].push(stripSecrets(rev));
            }
        } catch (e) {
            diag().warn('backup', 'history collection error', { error: e.message });
        }

        // Favorites / op history from the shared filesystem manager.
        if (global.fsManager) {
            if (Array.isArray(global.fsManager.favorites)) out.favorites = global.fsManager.favorites.slice();
            if (Array.isArray(global.fsManager.opHistory)) out.opHistory = global.fsManager.opHistory.slice();
        }

        return out;
    }

    const backup = {
        FORMAT,

        async create(opts = {}) {
            if (global.fsManager && typeof global.fsManager.flush === 'function') {
                await global.fsManager.flush();
            }
            const includeCredentials = !!opts.includeCredentials;
            const fromDb = await collectFromDB(includeCredentials);
            const lsSettings = collectLocalStorageSettings(includeCredentials);

            const payload = {
                format: FORMAT,
                schemaVersion: (global.bigosStorage && global.bigosStorage.SCHEMA_VERSION) || 2,
                createdAt: new Date().toISOString(),
                includeCredentials,
                files: fromDb.files,
                contents: fromDb.contents,
                contentsMeta: fromDb.contentsMeta,
                packages: fromDb.packages,
                settings: { ...fromDb.settings, ...lsSettings },
                history: fromDb.history,
                favorites: fromDb.favorites,
                opHistory: fromDb.opHistory,
                note: includeCredentials
                    ? 'Backup zawiera dane uwierzytelniające — chroń ten plik.'
                    : 'Backup BEZ kluczy API (domyślnie).'
            };
            diag().log('backup', 'Backup created', {
                files: payload.files.length,
                packages: payload.packages.length,
                settings: Object.keys(payload.settings).length,
                includeCredentials
            });
            return payload;
        },

        /** Structural + referential validation. Returns {ok, errors[], warnings[]}. */
        validate(obj) {
            const errors = [];
            const warnings = [];
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
                return { ok: false, errors: ['Backup nie jest obiektem JSON'], warnings };
            }
            if (obj.format !== FORMAT) errors.push(`Nieznany format: ${obj.format || '(brak)'}`);
            if (typeof obj.schemaVersion !== 'number' || obj.schemaVersion < 1 || obj.schemaVersion > 3) {
                errors.push(`Nieobsługiwana wersja schematu: ${obj.schemaVersion}`);
            }
            if (!Array.isArray(obj.files)) errors.push('Brak listy plików');
            if (obj.contents && typeof obj.contents !== 'object') errors.push('contents musi być obiektem');
            if (obj.packages && !Array.isArray(obj.packages)) errors.push('packages musi być tablicą');
            if (obj.settings && typeof obj.settings !== 'object') errors.push('settings musi być obiektem');
            if (obj.history && typeof obj.history !== 'object') errors.push('history musi być obiektem');

            const ids = new Set();
            if (Array.isArray(obj.files)) {
                obj.files.forEach((f, i) => {
                    if (!f || typeof f !== 'object') { errors.push(`Plik #${i} nie jest obiektem`); return; }
                    if (!f.id) { errors.push(`Plik #${i} bez id`); return; }
                    if (ids.has(f.id)) errors.push(`Duplikat id: ${f.id}`);
                    ids.add(f.id);
                    if (f.content !== undefined) warnings.push(`Plik ${f.id} ma treść w meta (stary format)`);
                });
                // Parent references must resolve (or be a known root).
                const roots = new Set(['root', 'hasiok']);
                obj.files.forEach((f) => {
                    if (!f || !f.parentId) return;
                    if (roots.has(f.parentId)) return;
                    if (!ids.has(f.parentId)) {
                        errors.push(`Plik "${f.name || f.id}" wskazuje nieistniejący katalog nadrzędny (${f.parentId})`);
                    }
                });
            }

            // Binary encoding validation for contents
            if (obj.contents && typeof obj.contents === 'object') {
                for (const [id, c] of Object.entries(obj.contents)) {
                    if (typeof c === 'string' && c.startsWith('data:')) {
                        const comma = c.indexOf(',');
                        if (comma === -1 || !c.slice(0, comma).includes(':')) {
                            errors.push(`Plik "${id}" posiada nieprawidłowe kodowanie binarne data URL`);
                        }
                    }
                }
            }

            // Package structure.
            if (Array.isArray(obj.packages)) {
                obj.packages.forEach((p, i) => {
                    if (!p || typeof p !== 'object') { errors.push(`Pakiet #${i} nie jest obiektem`); return; }
                    if (!p.id) errors.push(`Pakiet #${i} bez id`);
                });
            }

            // History structure.
            if (obj.history && typeof obj.history === 'object') {
                for (const [fileId, revs] of Object.entries(obj.history)) {
                    if (!Array.isArray(revs)) {
                        errors.push(`Historia dla pliku ${fileId} musi być tablicą`);
                    } else {
                        revs.forEach((r, idx) => {
                            if (!r || typeof r !== 'object' || !r.id) {
                                errors.push(`Nieprawidłowy rekord rewizji #${idx} dla pliku ${fileId}`);
                            }
                        });
                    }
                }
            }

            return { ok: errors.length === 0, errors, warnings };
        },

        async preview(obj) {
            const v = this.validate(obj);
            if (!v.ok) return { ok: false, errors: v.errors, warnings: v.warnings };

            const currentFiles = (global.fileSystem || []).length;
            let currentPackages = 0;
            try {
                currentPackages = ((await global.bigosDB.listPackages()) || []).length;
            } catch (_) { /* optional */ }

            return {
                ok: true,
                errors: [],
                warnings: v.warnings,
                summary: {
                    format: obj.format,
                    schemaVersion: obj.schemaVersion,
                    createdAt: obj.createdAt,
                    includeCredentials: !!obj.includeCredentials,
                    fileCount: obj.files.length,
                    folderCount: obj.files.filter((f) => f.type === 'folder').length,
                    appCount: obj.files.filter((f) => f.type === 'app').length,
                    contentCount: obj.contents ? Object.keys(obj.contents).length : 0,
                    packageCount: (obj.packages || []).length,
                    historyFileCount: obj.history ? Object.keys(obj.history).length : 0,
                    settingKeys: Object.keys(obj.settings || {}),
                    currentFileCount: currentFiles,
                    currentPackageCount: currentPackages
                }
            };
        },

        /**
         * Recoverable restore.
         * 1. Full recovery copy (including contents) before any mutation.
         * 2. Validate everything first.
         * 3. Replace atomically per store; abort and recover on failure.
         */
        async restore(obj, opts = {}) {
            const mode = opts.mode || 'replace';
            const keepRecovery = opts.keepRecovery !== false;
            const v = this.validate(obj);
            if (!v.ok) return { ok: false, errors: v.errors };

            const dbApi = global.bigosDB;
            if (!dbApi) return { ok: false, errors: ['Storage service unavailable'] };

            try {
                // --- 1. Recovery copy (must succeed before we touch live data). ---
                if (keepRecovery) {
                    let recovery = null;
                    try {
                        recovery = await this.create({ includeCredentials: true });
                    } catch (e) {
                        return { ok: false, errors: ['Nie udało się utworzyć kopii recovery: ' + e.message] };
                    }

                    // Validate recovery structure
                    const vRec = this.validate(recovery);
                    if (!vRec.ok) {
                        return { ok: false, errors: ['Kopia recovery jest nieprawidłowa: ' + vRec.errors.join('; ')] };
                    }

                    // Verify completeness: every live file with content must be present in recovery.contents
                    const liveFiles = (global.fileSystem && Array.isArray(global.fileSystem))
                        ? global.fileSystem
                        : (recovery.files || []);
                    const missing = [];
                    for (const f of liveFiles) {
                        if (!f || !f.id || f.type === 'folder' || f.type === 'app') continue;
                        if (f.content !== undefined && f.content !== null) {
                            if (!(f.id in (recovery.contents || {}))) {
                                missing.push(f.name || f.id);
                            }
                        }
                    }
                    if (missing.length > 0) {
                        return {
                            ok: false,
                            errors: [`Kopia recovery nie zawiera treści wszystkich plików (${missing.slice(0, 3).join(', ')}...) — przerwano przed modyfikacją danych.`]
                        };
                    }

                    try {
                        localStorage.setItem(RECOVERY_KEY, JSON.stringify(recovery));
                    } catch (e) {
                        // Quota exceeded: MUST stop before mutation. No slim copy that drops contents!
                        return { ok: false, errors: ['Brak miejsca na pełną kopię recovery (quota) — przerwano przed modyfikacją danych.'] };
                    }
                }

                // Engage maintenance write lock before beginning data replacement
                if (global.bigosStorage && global.bigosStorage.setMaintenanceLock) {
                    global.bigosStorage.setMaintenanceLock(true);
                }
                try {
                    const ch = new BroadcastChannel('bigos_maintenance');
                    ch.postMessage({ type: 'maintenance_begin', reason: 'restore' });
                    ch.close();
                } catch (_) {}

                // --- 2. Decode and normalize restored nodes ---
                const contents = obj.contents || {};
                const contentsMeta = obj.contentsMeta || {};
                const restoredNodes = [];
                for (const meta of obj.files) {
                    const m = { ...meta };
                    const rawContent = contents[meta.id] !== undefined ? contents[meta.id] : m.content;
                    delete m.content;
                    let value = rawContent;
                    const metaEntry = contentsMeta[meta.id];
                    if (metaEntry) {
                        if (metaEntry.type === 'blob' && typeof value === 'string' && value.startsWith('data:')) {
                            try { value = dataURLToBlob(value); } catch (_) {}
                        } else if (metaEntry.type === 'arraybuffer' && typeof value === 'string' && value.startsWith('data:')) {
                            try { value = dataURLToArrayBuffer(value); } catch (_) {}
                        } else if (metaEntry.type === 'text') {
                            value = typeof value === 'string' ? value : String(value || '');
                        }
                    } else {
                        // Legacy fallback: only convert to Blob if mime or extension indicates binary
                        const isBinary = (meta.mime && !meta.mime.startsWith('text/') && meta.mime !== 'application/json') ||
                                         (/\.(png|jpe?g|gif|webp|bmp|ico|mp3|wav|ogg|mp4|webm|bin|zip|gz|tar|pdf)$/i.test(meta.name || ''));
                        if (isBinary && typeof value === 'string' && value.startsWith('data:') && value.includes('base64,')) {
                            try { value = dataURLToBlob(value); } catch (_) {}
                        }
                    }
                    restoredNodes.push({ ...m, content: value });
                }

                // --- 3. Atomic replacement in one IndexedDB transaction ---
                if (typeof dbApi.restoreAll === 'function') {
                    const r = await dbApi.restoreAll({
                        files: restoredNodes,
                        packages: obj.packages,
                        history: obj.history,
                        settings: obj.settings
                    }, { mode });
                    if (r && r.ok === false) {
                        throw r.error || new Error('Błąd atomowego zapisu danych restoreAll');
                    }
                } else {
                    // Fallback path
                    const runFallback = async () => {
                        if (mode === 'replace') {
                            const cleared = await dbApi.clear();
                            if (cleared && cleared.ok === false) {
                                throw (cleared.error || new Error('Nie udało się wyczyścić bazy przed restore'));
                            }
                        }
                        const writeRes = await dbApi.putFileNodes(restoredNodes);
                        if (writeRes && writeRes.ok === false) throw writeRes.error || new Error('file restore failed');
                        for (const pkg of (obj.packages || [])) {
                            const r = await dbApi.putPackage(pkg);
                            if (r && r.ok === false) throw r.error || new Error('package restore failed');
                        }
                        if (obj.history && typeof obj.history === 'object') {
                            for (const [fileId, revs] of Object.entries(obj.history)) {
                                if (!Array.isArray(revs)) continue;
                                for (const rev of revs) {
                                    if (!rev) continue;
                                    const r = await dbApi.putRevision(fileId, rev);
                                    if (r && r.ok === false) throw r.error || new Error('history restore failed for ' + fileId);
                                }
                            }
                        }
                        for (const [k, val] of Object.entries(obj.settings || {})) {
                            const r = await dbApi.set(k, val);
                            if (r && r.ok === false) throw r.error || new Error('setting restore failed for ' + k);
                        }
                    };
                    if (typeof dbApi.runUnderMaintenance === 'function') {
                        await dbApi.runUnderMaintenance(runFallback);
                    } else {
                        await runFallback();
                    }
                }

                // Settings — update localStorage after IndexedDB transaction has succeeded
                for (const [k, val] of Object.entries(obj.settings || {})) {
                    try {
                        if (typeof val === 'string') {
                            localStorage.setItem(k, val);
                        } else {
                            localStorage.setItem(k, JSON.stringify(val));
                        }
                    } catch (_) { /* quota */ }
                }

                // Favorites / op history
                if (Array.isArray(obj.favorites) && global.fsManager) {
                    global.fsManager.favorites = obj.favorites.slice();
                }
                if (Array.isArray(obj.opHistory) && global.fsManager) {
                    global.fsManager.opHistory = obj.opHistory.slice();
                }

                // --- 4. Refresh shared filesystem from the SAME normalized records committed to storage ---
                const restored = restoredNodes.map((n) => ({ ...n }));
                if (global.bigosState && global.bigosState.setFileSystem) {
                    global.bigosState.setFileSystem(restored);
                } else if (global.fileSystem !== undefined) {
                    global.fileSystem = restored;
                }

                // Populate _lastSavedMap in fsManager so save does not rewrite correctly restored records
                if (global.fsManager) {
                    if (global.fsManager._lastSavedMap) {
                        global.fsManager._lastSavedMap.clear();
                        for (const n of restored) {
                            if (n && n.id) {
                                const s = { ...n };
                                delete s.x; delete s.y;
                                global.fsManager._lastSavedMap.set(n.id, JSON.stringify(s));
                            }
                        }
                    }
                    if (global.fsManager._dirtyIds) global.fsManager._dirtyIds.clear();
                    if (global.fsManager._deletedIds) global.fsManager._deletedIds.clear();
                }

                if (global.desktop && global.desktop.render) global.desktop.render();

                diag().log('backup', 'Restore completed', { mode, files: obj.files.length });
                return { ok: true, mode, fileCount: obj.files.length };
            } catch (e) {
                diag().error('backup', 'Restore failed — attempting recovery', { error: e.message });
                if (keepRecovery) {
                    try {
                        const rec = this.getRecoveryCopy();
                        if (rec) {
                            const rollback = await this.restore(rec, { mode: 'replace', keepRecovery: false });
                            if (rollback && rollback.ok) {
                                // Verify persistent state
                                let verified = false;
                                try {
                                    const metas = await dbApi.listFileMetas();
                                    verified = Array.isArray(metas);
                                } catch (_) { verified = false; }
                                if (verified) {
                                    return {
                                        ok: false,
                                        errors: ['Restore nie powiódł się (' + e.message + '). Przywrócono poprzedni stan z kopii recovery.'],
                                        recovered: true,
                                        rollback
                                    };
                                }
                            }
                            return {
                                ok: false,
                                errors: [
                                    'Restore nie powiódł się (' + e.message + ').',
                                    'Rollback z kopii recovery również nie powiódł się: ' +
                                        ((rollback && rollback.errors || []).join('; ') || 'niezweryfikowany stan') +
                                        '. Kopia recovery została zachowana w localStorage (bigos_recovery_copy).'
                                ],
                                recovered: false,
                                rollback
                            };
                        }
                    } catch (e2) {
                        return {
                            ok: false,
                            errors: ['Restore nie powiódł się (' + e.message + '), a recovery również zawiodło: ' + e2.message],
                            recovered: false
                        };
                    }
                }
                return { ok: false, errors: [e.message] };
            } finally {
                if (global.bigosStorage && global.bigosStorage.setMaintenanceLock) {
                    global.bigosStorage.setMaintenanceLock(false);
                }
                try {
                    const ch = new BroadcastChannel('bigos_maintenance');
                    ch.postMessage({ type: 'maintenance_end', reason: 'restore' });
                    ch.close();
                } catch (_) {}
            }
        },

        getRecoveryCopy() {
            try {
                const raw = localStorage.getItem(RECOVERY_KEY);
                return raw ? JSON.parse(raw) : null;
            } catch (_) { return null; }
        },

        async restoreRecovery() {
            const rec = this.getRecoveryCopy();
            if (!rec) return { ok: false, errors: ['Brak kopii zapasowej recovery'] };
            return this.restore(rec, { mode: 'replace', keepRecovery: false });
        },

        download(obj, filename) {
            const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename || `bigos-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        }
    };

    global.bigosBackup = backup;
})(typeof window !== 'undefined' ? window : globalThis);
