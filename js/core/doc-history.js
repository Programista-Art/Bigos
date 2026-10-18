// ======================================================================
// PLIK: js/core/doc-history.js (Historia wersji dokumentów)
// Practical retention: keep last N revisions per file (default 20) plus
// daily rollups for 30 days. Restore earlier revisions safely.
// ======================================================================

(function (global) {
    'use strict';

    const diag = () => global.bigosDiag || global.diag || { log() {}, warn() {}, error() {} };
    const DEFAULT_KEEP = 20;
    const DAILY_KEEP_DAYS = 30;
    let revSeq = 0;

    const docHistory = {
        /** Snapshot current content of a file.
         *  Does NOT silently truncate: if content exceeds the size limit,
         *  returns a clear failure rather than storing an incomplete source. */
        async snapshot(fileId, content, label) {
            if (!fileId) return { ok: false, error: 'no fileId' };
            const MAX_REV_BYTES = 2 * 1024 * 1024;
            const size = typeof content === 'string' ? content.length
                : (content && content.size) ? content.size : 0;
            if (size > MAX_REV_BYTES) {
                return {
                    ok: false,
                    error: 'revision too large (' + size + ' bytes > ' + MAX_REV_BYTES + ')',
                    code: 'REVISION_TOO_LARGE'
                };
            }
            const ts = Date.now();
            revSeq = (revSeq + 1) % 100000;
            const rev = {
                ts,
                label: label || 'auto',
                content: content,
                size
            };
            if (global.bigosDB && global.bigosDB.putRevision) {
                const r = await global.bigosDB.putRevision(fileId, rev);
                if (r && r.ok === false) return r;
            }
            // Retention policy.
            try {
                if (global.bigosDB && global.bigosDB.listRevisions) {
                    const list = await global.bigosDB.listRevisions(fileId);
                    const now = Date.now();
                    const keep = [];
                    const daySeen = new Set();
                    for (const revItem of list) {
                        const ageDays = Math.floor((now - (revItem.ts || 0)) / 86400000);
                        const dayKey = new Date(revItem.ts || 0).toDateString();
                        if (keep.length < DEFAULT_KEEP) { keep.push(revItem); daySeen.add(dayKey); continue; }
                        if (ageDays <= DAILY_KEEP_DAYS && !daySeen.has(dayKey)) {
                            keep.push(revItem);
                            daySeen.add(dayKey);
                            continue;
                        }
                        // Drop the rest.
                    }
                    const keepIds = new Set(keep.map((k) => k.id));
                    for (const revItem of list) {
                        if (!keepIds.has(revItem.id) && global.bigosDB.delete) {
                            await global.bigosDB.delete(revItem.id).catch(() => {});
                            // history store uses its own keys
                            try {
                                const store = global.bigosStorage && global.bigosStorage.STORES.history;
                                if (store && global.bigosStorage.del) await global.bigosStorage.del(store, revItem.id);
                            } catch (_) { /* noop */ }
                        }
                    }
                }
            } catch (e) {
                diag().warn('doc-history', 'retention failed', { error: e.message });
            }
            diag().log('doc-history', 'Revision saved', { fileId, label: rev.label, size: rev.size });
            return { ok: true, ts: rev.ts };
        },

        async list(fileId) {
            if (global.bigosDB && global.bigosDB.listRevisions) return global.bigosDB.listRevisions(fileId);
            return [];
        },

        /** Restore a revision into the live fileSystem entry (returns content).
         *  Checks snapshot result, target file and final committed save. */
        async restore(fileId, revisionId) {
            const list = await this.list(fileId);
            const rev = list.find((r) => r.id === revisionId || String(r.ts) === String(revisionId));
            if (!rev) return { ok: false, error: 'revision not found' };

            // Snapshot current state before overwriting (for undo).
            const item = (global.fileSystem || []).find((f) => f.id === fileId);
            if (!item) return { ok: false, error: 'target file not found' };
            const previousContent = item.content;
            if (previousContent !== undefined) {
                const snap = await this.snapshot(fileId, previousContent, 'przed-przywróceniem');
                if (snap && snap.ok === false) {
                    return { ok: false, error: 'pre-restore snapshot failed: ' + (snap.error || '') };
                }
            }
            item.content = rev.content;
            if (global.fsManager && global.fsManager.save) {
                try {
                    const saveRes = await global.fsManager.save();
                    const saveFailed = Array.isArray(saveRes) && saveRes.some((r) => r && r.ok === false);
                    if (saveFailed) {
                        // Revert in-memory change so editor and disk agree.
                        item.content = previousContent;
                        return { ok: false, error: 'save after restore failed' };
                    }
                } catch (e) {
                    item.content = previousContent;
                    return { ok: false, error: 'save after restore failed: ' + e.message };
                }
            }
            diag().log('doc-history', 'Revision restored', { fileId, revisionId });
            return { ok: true, content: rev.content, rev, previousContent };
        }
    };

    global.bigosDocHistory = docHistory;
})(typeof window !== 'undefined' ? window : globalThis);
