// ======================================================================
// PLIK: js/core/system-maintenance.js (Formatowanie, reset hasła, trwałość)
// - formatSystem: stop apps → drain writes → clear BigOS IndexedDB + bigos_* LS
// - resetSettings: clear settings only (keep files)
// - resetPassword: remove password only
// Confirmation UI accurately states what each operation removes.
// ======================================================================

(function (global) {
    'use strict';

    const diag = () => global.bigosDiag || global.diag || { log() {}, warn() {}, error() {} };

    async function stopAllAppActivity() {
        try {
            if (global.appRegistry && global.appRegistry.closeAll) {
                await Promise.race([
                    global.appRegistry.closeAll(),
                    new Promise((r) => setTimeout(r, 1000))
                ]);
            }
        } catch (e) { diag().warn('maintain', 'closeAll failed', { error: e.message }); }

        // Legacy per-app stop hooks (compatibility).
        try {
            if (global.openAppsList) {
                for (const appId of Array.from(global.openAppsList)) {
                    try {
                        if (global.apps && global.apps.grajekStop && appId === 'grajek') global.apps.grajekStop();
                        if (global.grajaczApp && appId === 'grajacz' && global.grajaczApp.stop) global.grajaczApp.stop();
                        if (global.nadzorcaApp && appId === 'nadzorca' && global.nadzorcaApp.stop) global.nadzorcaApp.stop();
                        if (global.games && global.games[appId] && global.games[appId].stop) global.games[appId].stop();
                    } catch (_) { /* keep stopping others */ }
                }
            }
        } catch (_) { /* noop */ }

        // Fire a cancellable "before clear" event so apps can finish writes.
        try {
            global.dispatchEvent(new CustomEvent('bigos:before-clear'));
        } catch (_) { /* noop */ }
    }

    async function drainPendingWrites() {
        // Wait for the storage serialize() queue to empty — hard timeout so a
        // stuck transaction cannot block format/reset forever.
        try {
            if (global.bigosStorage && global.bigosStorage.serialize) {
                await Promise.race([
                    global.bigosStorage.serialize(async () => {}),
                    new Promise((r) => setTimeout(r, 1500))
                ]);
            }
            if (global.fsManager && global.fsManager.flush) {
                await Promise.race([
                    global.fsManager.flush(),
                    new Promise((r) => setTimeout(r, 1500))
                ]);
            }
            await new Promise((r) => setTimeout(r, 0));
            await new Promise((r) => setTimeout(r, 0));
        } catch (e) {
            diag().warn('maintain', 'drain writes issue', { error: e.message });
        }
    }

    function removeBigOSLocalStorage() {
        const removed = [];
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (!k) continue;
            if (k.startsWith('bigos_') || k.startsWith('bigos-') ||
                k === 'bigos_fs' || k === 'bigos_fs_favs' || k === 'bigos_fs_history') {
                localStorage.removeItem(k);
                removed.push(k);
            }
        }
        return removed;
    }

    function removeSettingsLocalStorage(keepPin = false) {
        const removed = [];
        const keep = new Set(['bigos_password', 'bigos_recovery_copy']);
        if (keepPin) keep.add('bigos_patrzalka_pin');
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (!k || !k.startsWith('bigos_')) continue;
            // Settings-like keys; leave file-ish keys for full format only.
            if (keep.has(k)) continue;
            if (k === 'bigos_fs' || k === 'bigos_fs_favs' || k === 'bigos_fs_history') continue;
            localStorage.removeItem(k);
            removed.push(k);
        }
        return removed;
    }

    const maintenance = {
        /**
         * Full format: erases ALL BigOS data (files, settings, password, packages).
         * Unrelated website localStorage entries are preserved.
         * Succeeds ONLY when the database deletion success event fires.
         * @param {{confirm?:boolean, reload?:boolean}} opts reload defaults true (UI path).
         */
        async formatSystem({ confirm = true, reload = true } = {}) {
            if (confirm) {
                const yes = await maintenance.confirmDialog({
                    title: 'Formatowanie Systemu',
                    body: 'To usunie <b>wszystkie dane BigOS</b>: pliki, foldery, zainstalowane aplikacje, ustawienia i hasło.<br><br>Dane innych stron w tej przeglądarce <b>zostaną zachowane</b>.<br><br>Czy na pewno kontynuować?',
                    confirmText: 'Formatuj'
                });
                if (!yes) return { ok: false, cancelled: true };
            }

            diag().log('maintain', 'Format started');
            try {
                // Engage storage maintenance write lock before destructive action
                if (global.bigosDB && global.bigosDB.setMaintenanceLock) {
                    global.bigosDB.setMaintenanceLock(true);
                }

                await stopAllAppActivity();
                await drainPendingWrites();

                // Close our DB handles explicitly before deleteDatabase.
                try { if (global.bigosDB) global.bigosDB.close(); } catch (_) { /* noop */ }
                try { if (global.bigosStorage) global.bigosStorage.serialize; } catch (_) { /* noop */ }

                // Delete the database. Success ONLY on the success event.
                let dbDeleted = false;
                let deleteError = null;
                try {
                    if (global.bigosDB && global.bigosDB.deleteDatabase) {
                        const r = await global.bigosDB.deleteDatabase({ timeoutMs: 5000 });
                        if (r && r.ok) {
                            dbDeleted = true;
                        } else {
                            deleteError = (r && r.error) || new Error('deleteDatabase failed');
                        }
                    } else if (typeof indexedDB !== 'undefined') {
                        const r = await new Promise((resolve) => {
                            let settled = false;
                            const done = (v) => { if (!settled) { settled = true; clearTimeout(t); resolve(v); } };
                            const t = setTimeout(() => done({ ok: false, error: new Error('deleteDatabase blocked or timed out') }), 5000);
                            const req = indexedDB.deleteDatabase('BigOS_DB');
                            req.onsuccess = () => done({ ok: true });
                            req.onerror = () => done({ ok: false, error: req.error });
                            req.onblocked = () => {
                                diag().warn('maintain', 'deleteDatabase blocked by another tab');
                                // Do not resolve ok — wait for success/error/timeout.
                            };
                        });
                        if (r && r.ok) dbDeleted = true;
                        else deleteError = (r && r.error) || new Error('deleteDatabase failed');
                    } else {
                        dbDeleted = true; // no IDB available — nothing to delete
                    }
                } catch (e) {
                    deleteError = e;
                    diag().error('maintain', 'deleteDatabase threw', { error: e.message });
                }

                if (!dbDeleted) {
                    // A blocked request or elapsed timeout is a failure or pending op.
                    // Do NOT reload and do NOT claim completion.
                    diag().error('maintain', 'Format FAILED — database not deleted', {
                        error: deleteError && deleteError.message
                    });
                    return {
                        ok: false,
                        error: deleteError || new Error('Database deletion did not complete'),
                        code: 'DELETE_BLOCKED',
                        message: 'Formatowanie nie zostało zakończone: baza danych jest zablokowana przez inną kartę lub operacja nie powiodła się. Zamknij inne karty BigOS i spróbuj ponownie.'
                    };
                }

                // Database is gone — now clear BigOS localStorage keys.
                const removedKeys = removeBigOSLocalStorage();
                diag().log('maintain', 'Format completed', { dbDeleted, removedKeys: removedKeys.length });

                // Only reload after verified success.
                if (reload) location.reload();
                return { ok: true, dbDeleted, removedKeys };
            } catch (e) {
                diag().error('maintain', 'Format failed', { error: e.message });
                return { ok: false, error: e };
            }
        },

        /** Reset settings only — keeps files and installed apps. */
        async resetSettings({ confirm = true } = {}) {
            if (confirm) {
                const yes = await maintenance.confirmDialog({
                    title: 'Reset ustawień',
                    body: 'Przywróci <b>ustawienia systemu</b> do wartości domyślnych (tapety, motywy, preferencje aplikacji).<br><br><b>Pliki i zainstalowane aplikacje pozostaną</b>. Hasło logowania zostanie zachowane.',
                    confirmText: 'Resetuj ustawienia'
                });
                if (!yes) return { ok: false, cancelled: true };
            }
            await drainPendingWrites();
            const removed = removeSettingsLocalStorage(false);
            let kvCleared = 0;
            try {
                const store = global.bigosStorage;
                const dbApi = global.bigosDB;
                if (store && store.STORES && dbApi) {
                    const db = await dbApi.open();
                    const storesToClear = [store.STORES.kv, store.STORES.legacy].filter((n) => {
                        try { return db.objectStoreNames.contains(n); } catch (_) { return false; }
                    });
                    if (storesToClear.length > 0) {
                        const tx = db.transaction(storesToClear, 'readwrite');
                        for (const sn of storesToClear) {
                            const os = tx.objectStore(sn);
                            const keys = await new Promise((resolve, reject) => {
                                const r = os.getAllKeys();
                                r.onsuccess = () => resolve(r.result || []);
                                r.onerror = () => reject(r.error);
                            });
                            for (const k of keys) {
                                if (typeof k !== 'string') continue;
                                if (!k.startsWith('bigos_')) continue;
                                if (k === 'bigos_password' || k === 'bigos_recovery_copy') continue;
                                if (k === 'bigos_fs' || k === 'bigos_fs_favs' || k === 'bigos_fs_history') continue;
                                os.delete(k);
                                kvCleared++;
                            }
                        }
                        await new Promise((resolve, reject) => {
                            tx.oncomplete = () => resolve();
                            tx.onerror = () => reject(tx.error);
                            tx.onabort = () => reject(tx.error);
                        });
                    }
                    // Set migration/reset marker so legacy stores cannot resurrect settings
                    try {
                        const txMeta = db.transaction(store.STORES.meta, 'readwrite');
                        txMeta.objectStore(store.STORES.meta).put(Date.now(), 'settingsResetAt');
                        await new Promise((res, rej) => {
                            txMeta.oncomplete = () => res();
                            txMeta.onerror = () => rej(txMeta.error);
                        });
                    } catch (_) {}

                    // Reconcile any fallback keys so LS cannot resurrect values.
                    if (typeof dbApi.reconcileFallback === 'function') {
                        try { await dbApi.reconcileFallback(); } catch (_) { /* optional */ }
                    }
                }
            } catch (e) {
                diag().warn('maintain', 'kv settings reset partial', { error: e.message });
            }
            diag().log('maintain', 'Settings reset', { removed: removed.length, kvCleared });
            return { ok: true, removed, kvCleared };
        },

        /** Reset password only — keeps files, apps and settings.
         *  Verifies the password is actually absent before reporting success. */
        async resetPassword({ confirm = true } = {}) {
            if (confirm) {
                const yes = await maintenance.confirmDialog({
                    title: 'Reset hasła',
                    body: 'Usunie <b>hasło logowania</b>. Przy następnym uruchomieniu ustawisz nowe hasło.<br><br><b>Pliki, aplikacje i ustawienia pozostaną</b>.',
                    confirmText: 'Resetuj hasło'
                });
                if (!yes) return { ok: false, cancelled: true };
            }
            const errors = [];
            try {
                if (global.bigosDB && global.bigosDB.delete) {
                    const r = await global.bigosDB.delete('bigos_password');
                    if (r && r.ok === false) errors.push('db delete failed: ' + (r.error && r.error.message));
                }
            } catch (e) { errors.push('db delete threw: ' + e.message); }
            try {
                localStorage.removeItem('bigos_password');
            } catch (e) { errors.push('ls remove failed: ' + e.message); }
            // Clear any in-memory auth cache.
            try {
                if (global.auth) global.auth._cachedPassword = undefined;
            } catch (_) { /* noop */ }

            // Verify the password is absent from every persistent location.
            let stillPresent = false;
            try {
                if (global.bigosDB && global.bigosDB.get) {
                    const v = await global.bigosDB.get('bigos_password');
                    if (v !== undefined && v !== null && v !== '') stillPresent = true;
                }
            } catch (_) { /* read failure is not proof of absence — treat as present */ stillPresent = true; }
            try {
                if (localStorage.getItem('bigos_password') != null) stillPresent = true;
            } catch (_) { stillPresent = true; }

            if (stillPresent || errors.length > 0) {
                diag().error('maintain', 'Password reset FAILED — password still present or errors occurred', { errors });
                return { ok: false, error: new Error('Hasło nadal obecne po resetowaniu'), errors };
            }
            diag().log('maintain', 'Password reset');
            return { ok: true, errors };
        },

        confirmDialog({ title, body, confirmText }) {
            return new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black/70 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
                modal.setAttribute('role', 'dialog');
                modal.setAttribute('aria-modal', 'true');
                modal.setAttribute('aria-label', title);
                modal.innerHTML = `
                    <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-md w-[90%] border g-border">
                        <h2 class="text-xl font-bold g-text mb-2">${title}</h2>
                        <div class="g-text-muted text-sm mb-6 leading-relaxed">${body}</div>
                        <div class="flex gap-3 justify-end">
                            <button data-act="cancel" class="px-5 py-2.5 g-bg g-text hover:bg-white/10 rounded-xl font-medium border g-border">Anuluj</button>
                            <button data-act="ok" class="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium border border-red-800">${confirmText || 'Potwierdź'}</button>
                        </div>
                    </div>`;
                document.body.appendChild(modal);
                const done = (val) => { modal.remove(); resolve(val); };
                modal.querySelector('[data-act="cancel"]').onclick = () => done(false);
                modal.querySelector('[data-act="ok"]').onclick = () => done(true);
                modal.querySelector('[data-act="ok"]').focus();
            });
        },

        /** StorageManager.persist + estimate — report persistence grant. */
        async requestPersistentStorage() {
            const out = { supported: false, persisted: false, estimate: null, note: '' };
            try {
                if (navigator.storage && navigator.storage.estimate) {
                    out.supported = true;
                    out.estimate = await navigator.storage.estimate();
                }
                if (navigator.storage && navigator.storage.persist) {
                    out.supported = true;
                    out.persisted = await navigator.storage.persist();
                } else if (navigator.storage && navigator.storage.persisted) {
                    out.persisted = await navigator.storage.persisted();
                }
                out.note = out.persisted
                    ? 'Przeglądarka przyznała trwałe magazynowanie danych BigOS. To NIE zastępuje kopii zapasowej — nadal wykonuj regularne backupy.'
                    : 'Trwałe magazynowanie nie zostało przyznane (lub nie jest wspierane). Przeglądarka może usunąć dane przy braku miejsca. Wykonuj kopie zapasowe!';
            } catch (e) {
                out.note = 'Nie udało się sprawdzić trwałego magazynowania: ' + e.message;
            }
            return out;
        }
    };

    global.bigosMaintenance = maintenance;
})(typeof window !== 'undefined' ? window : globalThis);
