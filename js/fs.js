// ======================================================================
// PLIK: js/fs.js (System Plików, Pamięć i Eksplorator Aktówka PRO)
// Storage is provided exclusively by js/core/storage.js (window.bigosDB).
// Shared filesystem lives in js/core/state.js (window.fileSystem).
// ======================================================================

// Resolve the single authoritative storage service.
function bigosStorageApi() {
    if (typeof window !== 'undefined' && window.bigosDB) return window.bigosDB;
    if (typeof globalThis !== 'undefined' && globalThis.bigosDB) return globalThis.bigosDB;
    throw new Error('bigosDB storage service is not loaded');
}

function bigosFs() {
    if (typeof window !== 'undefined' && window.fileSystem) return window.fileSystem;
    if (typeof globalThis !== 'undefined' && globalThis.fileSystem) return globalThis.fileSystem;
    return [];
}

// Explicit export — top-level const does NOT become a window property.
function snapshotItem(item) {
    if (!item) return '';
    return JSON.stringify({
        id: item.id,
        name: item.name,
        type: item.type,
        icon: item.icon,
        content: item.content,
        parentId: item.parentId,
        x: item.x,
        y: item.y,
        appId: item.appId
    });
}

const fsManager = {
    currentFolder: 'root',
    searchQuery: '',
    sortBy: 'name_asc',
    selectedItemId: null,
    favorites: ['root', 'hasiok'],
    opHistory: [],
    // 'ready' | 'recovery' | 'new_install' | 'storage_error'
    initStatus: 'ready',
    _saveQueue: Promise.resolve(),
    _dirtyIds: new Set(),
    _deletedIds: new Set(),
    _lastSavedMap: new Map(),
    _saveSeq: 0,
    _fullSyncDone: false,

    init: async () => {
        const store = bigosStorageApi();
        const fs = bigosFs();
        let saved = null, savedFavs = null, savedHist = null;
        let readError = null;

        try {
            // Real migration from legacy stores / localStorage into typed records.
            if (store.ensureMigrated) await store.ensureMigrated();

            // Authoritative representation after migration: typed file records.
            let typedMetas = null;
            if (typeof store.listFileMetas === 'function') {
                try {
                    typedMetas = await store.listFileMetas();
                } catch (e) {
                    readError = e;
                }
            }

            if (!readError && Array.isArray(typedMetas) && typedMetas.length > 0) {
                const items = [];
                for (const meta of typedMetas) {
                    const full = { ...meta };
                    try {
                        const c = await store.getContent(meta.id);
                        if (c !== undefined) full.content = c;
                    } catch (e) {
                        readError = e;
                        break;
                    }
                    items.push(full);
                }
                if (!readError) saved = items;
            } else if (!readError) {
                // Fall back to legacy kv array only if no typed records exist.
                saved = await store.get('bigos_fs');
            }

            if (!readError) {
                savedFavs = await store.get('bigos_fs_favs');
                savedHist = await store.get('bigos_fs_history');
            }
        } catch (error) {
            readError = error;
            if (typeof bigosDiag !== 'undefined') bigosDiag.error('fs', 'Filesystem read failed', { error: error && error.message });
        }

        // Distinguish: confirmed new install vs unreadable/corrupt storage.
        // A failed read is NEVER permission to create a replacement filesystem.
        if (readError) {
            fsManager.initStatus = 'recovery';
            // Do NOT overwrite existing data. Try localStorage as a recovery source.
            try {
                const ls = localStorage.getItem('bigos_fs');
                if (ls) {
                    bigosState.setFileSystem(JSON.parse(ls));
                } else {
                    bigosState.setFileSystem([]);
                }
            } catch (_) {
                bigosState.setFileSystem([]);
            }
            fsManager.showRecoveryBanner(readError);
        } else if (saved && Array.isArray(saved) && saved.length > 0) {
            bigosState.setFileSystem(saved);
            for (const item of saved) {
                if (item && item.id) fsManager._lastSavedMap.set(item.id, snapshotItem(item));
            }
            fsManager._fullSyncDone = true;
            fsManager.initStatus = 'ready';
            try {
                if (typeof bigosAppRegistry !== 'undefined') bigosAppRegistry.readiness.markReady('filesystem', true);
            } catch (e) {
                if (typeof bigosDiag !== 'undefined') bigosDiag.warn('fs', 'readiness mark skipped', { error: e.message });
            }
        } else if (saved && Array.isArray(saved) && saved.length === 0) {
            // Explicit empty array = user deleted everything — do not rebuild.
            bigosState.setFileSystem([]);
            fsManager._lastSavedMap.clear();
            fsManager._fullSyncDone = true;
            fsManager.initStatus = 'ready';
            if (typeof bigosAppRegistry !== 'undefined') bigosAppRegistry.readiness.markReady('filesystem', true);
        } else if (saved === undefined || saved === null) {
            // Absent record with a successful read = confirmed new installation.
            bigosState.setFileSystem([]);
            fsManager.initStatus = 'new_install';
            const defaults = (typeof defaultApps !== 'undefined' && Array.isArray(defaultApps)) ? defaultApps
                : (typeof window !== 'undefined' && Array.isArray(window.defaultApps)) ? window.defaultApps
                : [];
            defaults.forEach((app, i) => {
                let obj = { ...app, parentId: 'root' };
                obj.x = (Math.floor(i / 6) * GRID) + 20;
                obj.y = (i % 6) * GRID + 20;
                fs.push(obj);
            });
            await fsManager.save();
            if (typeof bigosAppRegistry !== 'undefined') bigosAppRegistry.readiness.markReady('filesystem', true);
        } else {
            // Unexpected data shape — do not overwrite, enter recovery.
            fsManager.initStatus = 'recovery';
            bigosState.setFileSystem(Array.isArray(saved) ? saved : []);
            fsManager.showRecoveryBanner(new Error('Nieoczekiwany format danych systemu plików'));
        }

        if (savedFavs && Array.isArray(savedFavs)) fsManager.favorites = savedFavs;
        if (savedHist && Array.isArray(savedHist)) fsManager.opHistory = savedHist;

        // Tapety — tylko istniejące assety z katalogu tapety/
        const savedBg = localStorage.getItem('bigos_bg');
        if(savedBg && savedBg !== 'undefined' && savedBg !== 'null' && savedBg.trim() !== '') {
            document.getElementById('desktop-bg').style.backgroundImage = `url('${savedBg}')`;
            document.getElementById('desktop-bg').classList.add('custom-wp');
        } else {
            document.getElementById('desktop-bg').style.backgroundImage = `url('tapety/bigos.webp')`;
            document.getElementById('desktop-bg').classList.add('custom-wp');
        }

        const savedLoginBg = localStorage.getItem('bigos_login_bg');
        if(savedLoginBg && savedLoginBg !== 'undefined' && savedLoginBg !== 'null' && savedLoginBg.trim() !== '') {
            document.getElementById('login-screen').style.backgroundImage = `url('${savedLoginBg}')`;
        } else {
            document.getElementById('login-screen').style.backgroundImage = `url('tapety/bigos.webp')`;
        }

        if (typeof desktop !== 'undefined') {
            desktop.render();
        }

        fsManager.upgradeUI();
    },

    showRecoveryBanner: (err) => {
        if (typeof bigosDiag !== 'undefined') bigosDiag.error('fs', 'Entering recovery state — original data preserved', { error: err && err.message });
        const banner = document.createElement('div');
        banner.id = 'fs-recovery-banner';
        banner.className = 'fixed top-0 left-0 right-0 z-[10001] bg-red-700 text-white text-sm px-4 py-2 flex flex-wrap items-center gap-3 justify-center';
        banner.setAttribute('role', 'alert');
        banner.innerHTML = `
            <strong>⚠️ Problem z odczytem dysku BigOS.</strong>
            <span>Twoje dane nie zostały nadpisane. Spróbuj ponownie odczytać lub odzyskać kopię.</span>
            <button id="fs-recovery-retry" class="px-3 py-1 bg-white/20 hover:bg-white/30 rounded font-bold">Ponów odczyt</button>
            <button id="fs-recovery-backup" class="px-3 py-1 bg-white/20 hover:bg-white/30 rounded font-bold">Przywróć z backupu</button>
            <button id="fs-recovery-dismiss" class="px-2 py-1 opacity-70 hover:opacity-100">Ukryj</button>`;
        document.body.appendChild(banner);
        const retry = document.getElementById('fs-recovery-retry');
        if (retry) retry.onclick = async () => {
            banner.remove();
            try {
                const store = bigosStorageApi();
                const saved = await store.get('bigos_fs');
                if (saved && Array.isArray(saved)) {
                    bigosState.setFileSystem(saved);
                    fsManager.initStatus = 'ready';
                    if (typeof desktop !== 'undefined') desktop.render();
                    if (typeof apps !== 'undefined') apps.showToast('Odzyskiwanie', 'Odczyt zakończony pomyślnie.', 'success');
                } else if (typeof apps !== 'undefined') {
                    apps.showToast('Odzyskiwanie', 'Nadal brak danych w bazie — oryginalne rekordy zachowane.', 'error');
                }
            } catch (e2) {
                if (typeof apps !== 'undefined') apps.showToast('Odzyskiwanie', 'Ponowny odczyt nie powiódł się.', 'error');
                fsManager.showRecoveryBanner(e2);
            }
        };
        const bak = document.getElementById('fs-recovery-backup');
        if (bak) bak.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json,.json';
            input.onchange = async (ev) => {
                const f = ev.target.files[0];
                if (!f) return;
                try {
                    const data = JSON.parse(await f.text());
                    if (typeof bigosBackup === 'undefined') throw new Error('Moduł backupu niedostępny');
                    const preview = await bigosBackup.preview(data);
                    if (!preview.ok) {
                        if (typeof apps !== 'undefined') apps.showToast('Backup', 'Nieprawidłowa struktura pliku: ' + preview.errors.join('; '), 'error');
                        return;
                    }
                    if (!confirm(`Przywrócić backup?\nPliki: ${preview.summary.fileCount}\nAplikacje: ${preview.summary.packageCount}\nUstawienia: ${preview.summary.settingKeys.length}\n\nBieżące dane zostaną zastąpione (kopia recovery zostanie zachowana).`)) return;
                    const res = await bigosBackup.restore(data, { mode: 'replace', keepRecovery: true });
                    if (res.ok) {
                        if (typeof apps !== 'undefined') apps.showToast('Backup', 'Przywrócono dane z kopii.', 'success');
                        location.reload();
                    } else {
                        if (typeof apps !== 'undefined') apps.showToast('Backup', 'Błąd: ' + (res.errors || []).join('; '), 'error');
                    }
                } catch (e2) {
                    if (typeof apps !== 'undefined') apps.showToast('Backup', 'Nie udało się odczytać pliku backupu.', 'error');
                }
            };
            input.click();
        };
        const dismiss = document.getElementById('fs-recovery-dismiss');
        if (dismiss) dismiss.onclick = () => banner.remove();
    },

    save: async () => {
        // Recovery mode write protection: reject ordinary writes to protect unreadable data.
        if (fsManager.initStatus === 'recovery') {
            const err = new Error('Filesystem is in recovery mode — ordinary writes are blocked to protect unreadable data');
            err.code = 'RECOVERY_MODE';
            if (typeof bigosDiag !== 'undefined') bigosDiag.warn('fs', 'Write rejected: recovery mode active');
            return [{ ok: false, error: err, code: 'RECOVERY_MODE' }];
        }

        // Serialize writes through one queue; resolve only after transactions commit.
        const run = fsManager._saveQueue.then(async () => {
            const store = bigosStorageApi();
            const fs = bigosFs();
            const results = [];

            // Monotonic revision counter for write sequencing
            const savingRevision = ++fsManager._saveSeq;

            // Automatic dirty detection against _lastSavedMap:
            // 1) Find new or modified items in live fileSystem
            const currentIds = new Set();
            for (const item of fs) {
                if (!item || !item.id) continue;
                currentIds.add(item.id);
                const snap = snapshotItem(item);
                if (!fsManager._lastSavedMap.has(item.id) || fsManager._lastSavedMap.get(item.id) !== snap) {
                    fsManager._dirtyIds.add(item.id);
                }
            }
            // 2) Find items in _lastSavedMap that are no longer in live fileSystem (deleted)
            for (const [id] of fsManager._lastSavedMap) {
                if (!currentIds.has(id)) {
                    fsManager._deletedIds.add(id);
                }
            }

            // Snapshot dirty/deleted sets for this revision
            const dirtySnapshot = new Set(fsManager._dirtyIds || []);
            const deletedSnapshot = new Set(fsManager._deletedIds || []);

            // 1. Persist deletions (meta + content + revisions) first.
            for (const id of deletedSnapshot) {
                try {
                    const r = await store.deleteFileNode(id);
                    results.push(r);
                    if (r && r.ok !== false) {
                        fsManager._lastSavedMap.delete(id);
                        fsManager._deletedIds.delete(id);
                    }
                } catch (e) {
                    results.push({ ok: false, error: e });
                }
            }

            // 2. Incremental per-node persistence of dirty records.
            try {
                const itemsToSave = fs.filter(i => i && dirtySnapshot.has(i.id));
                if (itemsToSave.length > 0 && typeof store.putFileNodes === 'function') {
                    const r = await store.putFileNodes(itemsToSave);
                    results.push(r);
                    if (r && r.ok) {
                        for (const it of itemsToSave) {
                            if (it && it.id) {
                                fsManager._lastSavedMap.set(it.id, snapshotItem(it));
                                fsManager._dirtyIds.delete(it.id);
                            }
                        }
                        fsManager._fullSyncDone = true;
                    }
                } else {
                    fsManager._fullSyncDone = true;
                }
            } catch (e) {
                if (typeof bigosDiag !== 'undefined') bigosDiag.warn('fs', 'per-file sync failed', { error: e.message });
                results.push({ ok: false, error: e });
            }

            // 3. Keep the legacy array snapshot + favorites/history in kv so older
            // readers and backups still see a consistent view.
            results.push(await store.set('bigos_fs', fs));
            results.push(await store.set('bigos_fs_favs', fsManager.favorites));
            results.push(await store.set('bigos_fs_history', fsManager.opHistory));

            const failed = results.find(r => r && r.ok === false);
            if (failed) {
                if (typeof bigosDiag !== 'undefined') bigosDiag.error('fs', 'Save failed', { error: failed.error && failed.error.message });
                if (typeof apps !== 'undefined') apps.showToast('Błąd Zapisu', 'Nie udało się zapisać danych na dysku!', 'error');
            }
            return results;
        });

        // A rejected queue entry must not poison future saves.
        fsManager._saveQueue = run.catch(() => {});
        return run;
    },

    /**
     * Flush all pending writes and wait for the save queue to drain.
     */
    flush: async () => {
        if ((fsManager._dirtyIds && fsManager._dirtyIds.size > 0) || (fsManager._deletedIds && fsManager._deletedIds.size > 0)) {
            await fsManager.save();
        }
        if (fsManager._saveQueue) {
            await fsManager._saveQueue;
        }
    },

    /** Zaznacz rekord jako zmieniony (do zapisu indywidualnego). */
    markDirty: (id) => {
        if (!fsManager._dirtyIds) fsManager._dirtyIds = new Set();
        if (id) fsManager._dirtyIds.add(id);
    },

    /**
     * Authoritative node deletion: removes from live filesystem, typed
     * storage (meta + content + revisions) and the legacy snapshot.
     * Folder deletion cascades to descendants.
     */
    deleteNode: async (id) => {
        if (!id || id === 'hasiok' || id === 'root') return { ok: false, error: 'cannot delete protected node' };
        const fs = bigosFs();
        const store = bigosStorageApi();

        // Collect the node and all descendants (for folders).
        const toRemove = new Set([id]);
        let changed = true;
        while (changed) {
            changed = false;
            for (const item of fs) {
                if (item && item.parentId && toRemove.has(item.parentId) && !toRemove.has(item.id)) {
                    toRemove.add(item.id);
                    changed = true;
                }
            }
        }

        // Remove from the live shared array (in place).
        bigosState.removeWhere((f) => f && toRemove.has(f.id));

        // Queue typed-storage deletions.
        for (const rid of toRemove) {
            fsManager._deletedIds.add(rid);
            if (fsManager._dirtyIds) fsManager._dirtyIds.delete(rid);
        }

        // Persist immediately so backups and other consumers cannot see ghosts.
        const results = [];
        for (const rid of toRemove) {
            try {
                const r = await store.deleteFileNode(rid);
                results.push(r);
                if (r && r.ok) fsManager._deletedIds.delete(rid);
            } catch (e) {
                results.push({ ok: false, error: e });
            }
        }
        await fsManager.save();
        return { ok: results.every(r => r && r.ok !== false), removed: Array.from(toRemove) };
    },

    /** Await pending saves (used before format/reset/reload). */
    flush: async () => { return fsManager._saveQueue; },

    logHistory: (actionMsg) => {
        let time = new Date().toLocaleTimeString('pl-PL', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
        fsManager.opHistory.unshift(`[${time}] ${actionMsg}`);
        if(fsManager.opHistory.length > 50) fsManager.opHistory.pop();
        fsManager.save();
    },
    
    upgradeUI: () => {
        let appWindow = document.getElementById('app-aktowka');
        if (!appWindow) return setTimeout(fsManager.upgradeUI, 500);
        if (typeof appWindow.querySelector !== 'function') return; // non-DOM test host

        appWindow.style.width = '800px';
        appWindow.style.height = '500px';
        appWindow.style.background = 'transparent';
        appWindow.style.border = 'none';
        appWindow.style.boxShadow = 'none';

        const titleBar = appWindow.querySelector('.title-bar');
        Array.from(appWindow.children).forEach(child => { if (child !== titleBar) child.remove(); });
        if (titleBar) titleBar.style.display = 'none';

        const proUI = document.createElement('div');
        proUI.className = 'flex flex-col overflow-hidden relative themed-app g-panel rounded-lg shadow-2xl h-full';

        proUI.innerHTML = `
            <div class="px-4 py-2 border-b g-border flex justify-between items-center cursor-move bg-black/30 shrink-0" onmousedown="winManager.startDrag(event, 'app-aktowka')" ontouchstart="winManager.startDrag(event, 'app-aktowka')">
                <span class="text-sm font-bold g-accent drop-shadow-md">📁 Aktówka</span>
                <div class="flex gap-2">
                    <button onclick="winManager.minimize('aktowka')" class="g-icon-btn px-1 hover:text-white transition">_</button>
                    <button onclick="winManager.maximize('app-aktowka')" class="g-icon-btn px-1 hover:text-white transition">□</button>
                    <button onclick="winManager.close('aktowka')" class="text-red-500 hover:text-red-400 px-1 font-bold transition">✖</button>
                </div>
            </div>

            <div class="flex items-center gap-2 p-2 border-b g-border bg-black/20 shrink-0 flex-wrap">
                <div class="flex gap-1">
                    <button onclick="fsManager.navigateUp()" id="explorer-back-btn" class="g-btn w-8 h-8 rounded flex items-center justify-center shadow-sm text-lg" title="W górę">⬆️</button>
                    <button onclick="fsManager.refresh()" class="g-btn w-8 h-8 rounded flex items-center justify-center shadow-sm text-lg" title="Odśwież">🔄</button>
                </div>
                
                <div id="explorer-path" class="flex-grow g-bg g-text border g-border rounded px-3 py-1.5 text-xs font-mono truncate shadow-inner">
                    BigOS:\\Pulpit
                </div>
                
                <div class="flex gap-2 w-full sm:w-auto">
                    <input type="text" id="fs-search-input" placeholder="Szukaj..." class="g-bg g-text border g-border rounded px-3 py-1.5 text-xs outline-none focus:border-blue-500 flex-grow sm:w-32" oninput="fsManager.setSearch(this.value)">
                    <select id="fs-sort-select" class="g-bg g-text border g-border rounded px-2 py-1.5 text-xs outline-none cursor-pointer w-24" onchange="fsManager.setSort(this.value)">
                        <option value="name_asc">A-Z</option>
                        <option value="name_desc">Z-A</option>
                        <option value="type">Typ</option>
                    </select>
                </div>
                
                <div class="w-px h-6 bg-gray-600 mx-1 hidden sm:block"></div>
                
                <div class="flex gap-1">
                    <button onclick="desktop.createFolder(fsManager.currentFolder)" class="g-btn px-2 py-1 rounded text-xs shadow-sm flex items-center gap-1"><span class="text-sm">📁</span> <span class="hidden sm:inline">Nowy Folder</span></button>
                    <button onclick="desktop.createFile(fsManager.currentFolder)" class="g-btn px-2 py-1 rounded text-xs shadow-sm flex items-center gap-1"><span class="text-sm">📄</span> <span class="hidden sm:inline">Nowy Plik</span></button>
                    <button onclick="fsManager.showHistoryModal()" class="g-btn px-2 py-1 rounded text-xs shadow-sm" title="Historia Operacji">📜</button>
                </div>
            </div>

            <div class="flex flex-row flex-grow overflow-hidden relative">
                
                <div class="w-[150px] border-r g-border bg-black/10 flex flex-col p-2 shrink-0 hidden sm:flex overflow-y-auto custom-scrollbar" id="fs-sidebar">
                    <div class="text-[10px] g-text-muted font-bold uppercase tracking-widest mb-2 px-2">Szybki dostęp</div>
                    <div id="fs-fav-list" class="flex flex-col gap-1"></div>
                </div>

                <div class="flex-grow bg-black/20 p-4 overflow-y-auto custom-scrollbar relative" id="explorer-content-wrapper" onclick="fsManager.selectItem(null)">
                    <div id="explorer-content" class="flex flex-wrap gap-4 content-start">
                        <!-- Pliki -->
                    </div>
                </div>

                <div class="w-[200px] border-l g-border bg-black/30 flex flex-col p-3 shrink-0 overflow-y-auto custom-scrollbar transition-all duration-200" id="fs-preview-panel">
                    <div class="text-[10px] g-text-muted font-bold uppercase tracking-widest mb-3 text-center border-b g-border pb-2">Podgląd Elementu</div>
                    
                    <div id="fs-prev-empty" class="text-center text-xs g-text-muted mt-10">Zaznacz plik lub folder, aby zobaczyć opcje.</div>
                    
                    <div id="fs-prev-data" class="hidden flex-col items-center w-full">
                        <div class="text-6xl mb-2 drop-shadow-lg" id="fs-prev-icon">📄</div>
                        <div class="font-bold text-sm g-text text-center break-all mb-1 w-full px-1" id="fs-prev-name">Nazwa</div>
                        <div class="text-[10px] g-text-muted text-center mb-4 uppercase tracking-wider" id="fs-prev-type">Typ</div>
                        
                        <div class="flex flex-col gap-1.5 w-full border-t border-b g-border py-3 mb-3">
                            <button class="g-btn py-1.5 rounded text-xs text-left px-3 hover:pl-4 transition-all" onclick="fsManager.action('open')">▶ Otwórz</button>
                            <button class="g-btn py-1.5 rounded text-xs text-left px-3 hover:pl-4 transition-all" onclick="fsManager.action('rename')">✏️ Zmień nazwę</button>
                            <button class="g-btn py-1.5 rounded text-xs text-left px-3 hover:pl-4 transition-all" onclick="fsManager.action('copy')">📋 Kopiuj</button>
                            <button class="g-btn py-1.5 rounded text-xs text-left px-3 hover:pl-4 transition-all" onclick="fsManager.action('cut')">✂️ Wytnij</button>
                            <button id="fs-prev-zip-btn" class="g-btn py-1.5 rounded text-xs text-left px-3 hover:pl-4 transition-all" onclick="fsManager.action('zip')">🗜️ Kompresuj ZIP</button>
                            <button class="g-btn py-1.5 rounded text-xs text-left px-3 hover:pl-4 transition-all text-blue-400 border-blue-500/30" onclick="fsManager.action('share')">🔗 Pobierz na PC</button>
                            <button class="g-btn py-1.5 rounded text-xs text-left px-3 hover:pl-4 transition-all text-red-500 mt-2 border-red-500/30" onclick="fsManager.action('delete')">🗑️ Usuń</button>
                        </div>
                        
                        <div id="fs-prev-content-box" class="w-full">
                            <div class="text-[10px] g-text-muted mb-1">Zawartość:</div>
                            <div id="fs-prev-content" class="text-[10px] g-text-muted bg-black/40 p-2 rounded max-h-32 overflow-y-auto break-words font-mono shadow-inner border border-gray-700/50">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        appWindow.appendChild(proUI);

        const wrapper = document.getElementById('explorer-content-wrapper');
        if (wrapper) {
            wrapper.oncontextmenu = (e) => {
                if (!e.target.closest('.folder-item')) {
                    e.preventDefault();
                    e.stopPropagation();
                    fsManager.selectItem(null);
                    if (typeof desktop !== 'undefined') desktop.showContextMenu(e, 'folder_bg', fsManager.currentFolder);
                }
            };
        }
        
        fsManager.renderSidebar();
    },

    setSearch: (val) => { fsManager.searchQuery = val.trim(); fsManager.renderExplorerContent(fsManager.currentFolder); },
    setSort: (val) => { fsManager.sortBy = val; fsManager.renderExplorerContent(fsManager.currentFolder); },
    refresh: () => { fsManager.renderExplorerContent(fsManager.currentFolder); },

    renderSidebar: () => {
        const list = document.getElementById('fs-fav-list');
        if (!list) return;
        list.innerHTML = '';

        fsManager.favorites.forEach(favId => {
            let name = "Błąd"; let icon = "📁";
            if (favId === 'root') { name = "Pulpit"; icon = "🖥️"; }
            else if (favId === 'hasiok') { name = "Kosz"; icon = "🗑️"; }
            else {
                const f = fileSystem.find(i => i.id === favId);
                if (f) { name = f.name; icon = f.icon || "📁"; }
            }

            const isActive = fsManager.currentFolder === favId;
            const btn = document.createElement('button');
            btn.className = `w-full text-left px-3 py-1.5 rounded transition text-xs font-semibold flex items-center gap-2 truncate ${isActive ? 'bg-blue-600 text-white shadow' : 'g-text hover:bg-white/10'}`;
            btn.innerHTML = `<span>${icon}</span> <span class="truncate">${typeof desktop !== 'undefined' ? desktop.escapeHTML(name) : name}</span>`;
            btn.onclick = () => fsManager.openFolder(favId);
            
            if(favId !== 'root' && favId !== 'hasiok') {
                btn.oncontextmenu = (e) => {
                    e.preventDefault(); e.stopPropagation();
                    if(confirm(`Usunąć z ulubionych: ${name}?`)) {
                        fsManager.favorites = fsManager.favorites.filter(id => id !== favId);
                        fsManager.save(); fsManager.renderSidebar();
                    }
                };
            }
            list.appendChild(btn);
        });

        if(fsManager.currentFolder !== 'root' && fsManager.currentFolder !== 'hasiok' && !fsManager.favorites.includes(fsManager.currentFolder)) {
            const addBtn = document.createElement('button');
            addBtn.className = 'w-full text-left px-3 py-1.5 rounded transition text-xs font-semibold flex items-center gap-2 mt-2 border border-dashed border-gray-500 text-gray-400 hover:text-white hover:border-white';
            addBtn.innerHTML = `<span>⭐</span> Przypnij folder`;
            addBtn.onclick = () => {
                fsManager.favorites.push(fsManager.currentFolder);
                fsManager.save(); fsManager.renderSidebar();
                fsManager.logHistory(`Przypięto folder do Ulubionych`);
            };
            list.appendChild(addBtn);
        }
    },

    renderExplorerContent: (folderId = fsManager.currentFolder) => {
        fsManager.currentFolder = folderId;
        fsManager.selectedItemId = null; 
        fsManager.updatePreview();

        const pathEl = document.getElementById('explorer-path');
        const backBtn = document.getElementById('explorer-back-btn');
        
        if (pathEl && backBtn) {
            if(folderId === 'root') { pathEl.innerText = 'BigOS:\\Pulpit'; backBtn.classList.add('opacity-30', 'pointer-events-none'); }
            else if(folderId === 'hasiok') { pathEl.innerText = 'BigOS:\\Hasiok (Kosz)'; backBtn.classList.remove('opacity-30', 'pointer-events-none'); }
            else { pathEl.innerText = fsManager.getPath(folderId); backBtn.classList.remove('opacity-30', 'pointer-events-none'); }
        }
        
        fsManager.renderSidebar(); 

        const container = document.getElementById('explorer-content');
        if(!container) return;
        container.innerHTML = '';
        
        let items = fileSystem.filter(i => i.parentId === folderId);
        
        if(fsManager.searchQuery) {
            const q = fsManager.searchQuery.toLowerCase();
            items = items.filter(i => i.name.toLowerCase().includes(q));
        }

        items.sort((a, b) => {
            if (fsManager.sortBy === 'name_asc') return a.name.localeCompare(b.name);
            if (fsManager.sortBy === 'name_desc') return b.name.localeCompare(a.name);
            if (fsManager.sortBy === 'type') {
                if(a.type === b.type) return a.name.localeCompare(b.name);
                return a.type.localeCompare(b.type);
            }
            return 0;
        });
        
        if(folderId === 'hasiok' && items.length === 0) {
            container.innerHTML = '<div class="w-full text-center g-text-muted font-bold mt-10 text-sm">Kosz jest pusty. Wreszcie porządek!</div>';
        } else if (items.length === 0) {
            container.innerHTML = `<div class="w-full text-center g-text-muted font-bold mt-10 text-sm">${fsManager.searchQuery ? 'Brak wyników wyszukiwania.' : 'Ten folder jest pusty.'}</div>`;
        }
        
        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'folder-item relative border border-transparent hover:border-white/20 transition-all rounded-xl p-2 w-[80px] h-[100px] flex flex-col items-center justify-start gap-1 cursor-pointer group';
            el.dataset.id = item.id; 
            
            el.innerHTML = `
                <div class="text-4xl drop-shadow-md group-hover:scale-110 transition-transform pointer-events-none">${item.icon}</div>
                <div class="text-[10px] text-center g-text font-medium leading-tight pointer-events-none w-full break-words line-clamp-2" title="${typeof desktop !== 'undefined' ? desktop.escapeHTML(item.name) : item.name}">${typeof desktop !== 'undefined' ? desktop.escapeHTML(item.name) : item.name}</div>
            `;
            
            el.onclick = (e) => {
                e.stopPropagation();
                fsManager.selectItem(item.id);
            };

            el.ondblclick = (e) => { e.stopPropagation(); desktop.executeItem(item); };
            
            el.oncontextmenu = (e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                fsManager.selectItem(item.id); 
                desktop.showContextMenu(e, item.type, item.id); 
            };
            
            el.onmousedown = (e) => { if(e.button !== 2) desktop.startIconDrag(e, el, item); };
            el.addEventListener('touchstart', (e) => { desktop.startIconDrag(e, el, item); }, {passive: false});

            container.appendChild(el);
        });
    },

    selectItem: (itemId) => {
        fsManager.selectedItemId = itemId;
        
        document.querySelectorAll('#explorer-content .folder-item').forEach(el => {
            el.classList.remove('bg-blue-500/30', 'border-blue-500');
            el.classList.add('border-transparent');
        });

        if (itemId) {
            const el = document.querySelector(`#explorer-content .folder-item[data-id="${itemId}"]`);
            if (el) {
                el.classList.remove('border-transparent');
                el.classList.add('bg-blue-500/30', 'border-blue-500');
            }
        }
        
        fsManager.updatePreview();
    },

    updatePreview: () => {
        const emptyEl = document.getElementById('fs-prev-empty');
        const dataEl = document.getElementById('fs-prev-data');
        if (!emptyEl || !dataEl) return;

        if (!fsManager.selectedItemId) {
            emptyEl.classList.remove('hidden');
            dataEl.classList.add('hidden', 'flex');
            return;
        }

        const item = fileSystem.find(i => i.id === fsManager.selectedItemId);
        if (!item) return;

        emptyEl.classList.add('hidden');
        dataEl.classList.remove('hidden');
        dataEl.classList.add('flex');

        document.getElementById('fs-prev-icon').innerText = item.icon || '📄';
        document.getElementById('fs-prev-name').innerText = item.name;
        
        let typeName = 'Nieznany plik';
        if(item.type === 'folder') typeName = 'Katalog';
        if(item.type === 'app') typeName = 'Aplikacja (.exe)';
        if(item.type === 'image') typeName = 'Obraz graficzny';
        if(item.type === 'file') {
            if(item.name.endsWith('.txt')) typeName = 'Dokument tekstowy';
            else if(item.name.endsWith('.csv')) typeName = 'Arkusz CSV';
            else if(item.name.endsWith('.zip')) typeName = 'Archiwum ZIP';
            else if(item.name.endsWith('.wasm')) typeName = 'Moduł WebAssembly';
            else typeName = 'Plik';
        }
        document.getElementById('fs-prev-type').innerText = typeName;

        const zipBtn = document.getElementById('fs-prev-zip-btn');
        if (zipBtn) {
            if (item.name.endsWith('.zip')) {
                zipBtn.innerHTML = '🗜️ Otwórz w Upychaczu';
            } else {
                zipBtn.innerHTML = '🗜️ Kompresuj ZIP';
            }
        }

        const contentBox = document.getElementById('fs-prev-content-box');
        const contentVal = document.getElementById('fs-prev-content');
        
        if (item.type === 'file' && item.content) {
            contentBox.classList.remove('hidden');
            if(item.content.startsWith('data:')) {
                contentVal.innerText = '[Plik binarny - Zoptymalizowany dla wydajności]';
            } else {
                let txt = item.content;
                if(txt.length > 200) txt = txt.substring(0, 200) + '...';
                contentVal.innerText = txt;
            }
        } else if (item.type === 'image' && item.content) {
            contentBox.classList.remove('hidden');
            contentVal.innerHTML = `<img src="${item.content}" class="w-full h-auto rounded">`;
        } else if (item.type === 'folder') {
            contentBox.classList.remove('hidden');
            const childCount = fileSystem.filter(i => i.parentId === item.id).length;
            contentVal.innerText = `Zawiera elementów: ${childCount}`;
        } else {
            contentBox.classList.add('hidden');
        }
    },

    action: (type) => {
        const id = fsManager.selectedItemId;
        if (!id) return;
        const item = fileSystem.find(i => i.id === id);
        if (!item) return;

        switch(type) {
            case 'open':
                desktop.executeItem(item);
                break;
            case 'rename':
                desktop.renameItem(id);
                fsManager.logHistory(`Zmieniono nazwę na: ${item.name}`);
                break;
            case 'copy':
                desktop.actionClipboard('copy', id);
                if(typeof apps !== 'undefined') apps.showToast('Aktówka', 'Skopiowano element', 'info');
                break;
            case 'cut':
                desktop.actionClipboard('cut', id);
                if(typeof apps !== 'undefined') apps.showToast('Aktówka', 'Wycięto element', 'info');
                break;
            case 'delete':
                if (id === 'hasiok') return;
                if (fsManager.currentFolder === 'hasiok') {
                    desktop.deletePermanent(id);
                    fsManager.logHistory(`Usunięto bezpowrotnie plik: ${item.name}`);
                } else {
                    desktop.deleteItem(id);
                    fsManager.logHistory(`Przeniesiono do kosza: ${item.name}`);
                }
                break;
            case 'zip':
                if (typeof kompresorApp !== 'undefined') {
                    kompresorApp.openWithItem(id);
                    return;
                }
                break;
            case 'share':
                if (item.type !== 'file' && item.type !== 'image') {
                    if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Do pobrania wybierz plik lub obraz.', 'error');
                    return;
                }
                
                try {
                    let blob;
                    if (item.content && item.content.startsWith('data:')) {
                        const parts = item.content.split(',');
                        const mimeMatch = parts[0].match(/:(.*?);/);
                        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
                        
                        const bstr = atob(parts[1]);
                        let n = bstr.length;
                        const u8arr = new Uint8Array(n);
                        while(n--) { u8arr[n] = bstr.charCodeAt(n); }
                        blob = new Blob([u8arr], {type: mime});
                    } else {
                        let mime = item.name.endsWith('.csv') ? 'text/csv' : 'text/plain';
                        blob = new Blob([item.content || ''], { type: mime });
                    }
                    
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.download = item.name;
                    link.click();
                    
                    fsManager.logHistory(`Udostępniono (Pobrano na PC) plik: ${item.name}`);
                    if(typeof apps !== 'undefined') apps.showToast('Pobieranie', `Pobrano ${item.name} na dysk!`, 'success');
                } catch(err) {
                    console.error(err);
                    if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Nie udało się wyeksportować pliku. Archiwum może być uszkodzone.', 'error');
                }
                break;
        }
    },

    showHistoryModal: () => {
        const modalId = 'fs-history-modal';
        let modal = document.getElementById(modalId);
        if(modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'grajek-modal-overlay fixed inset-0 z-[10001] bg-black/70 backdrop-blur-sm flex items-center justify-center';
        
        let histHtml = '';
        if(fsManager.opHistory.length === 0) {
            histHtml = '<div class="text-center text-gray-400 my-10">Brak historii operacji w systemie.</div>';
        } else {
            fsManager.opHistory.forEach(msg => {
                histHtml += `<div class="text-xs g-text-muted border-b border-gray-600/30 py-2">${typeof desktop !== 'undefined' ? desktop.escapeHTML(msg) : msg}</div>`;
            });
        }

        modal.innerHTML = `
            <div class="grajek-modal-box g-panel p-6 rounded-2xl w-full max-w-md border g-border shadow-2xl bg-gray-900/90 flex flex-col max-h-[80vh]">
                <h3 class="font-bold mb-4 g-text text-lg flex justify-between items-center">
                    <span>📜 Historia Operacji na Plikach</span>
                    <button class="g-btn text-[10px] px-2 py-1 rounded text-red-400 border-red-500/50 hover:bg-red-500 hover:text-white" onclick="fsManager.opHistory=[]; fsManager.save(); document.getElementById('${modalId}').remove();">Wyczyść</button>
                </h3>
                <div class="flex-grow overflow-y-auto custom-scrollbar pr-2 mb-4 bg-black/40 p-2 rounded border border-gray-700/50">
                    ${histHtml}
                </div>
                <button class="w-full g-btn py-2 rounded-lg text-sm font-bold transition shadow-md bg-blue-600 border-blue-500 text-white hover:bg-blue-500" onclick="document.getElementById('${modalId}').remove()">Zamknij</button>
            </div>
        `;
        document.body.appendChild(modal);
    },

    getPath: (folderId) => {
        let path = []; let currentId = folderId;
        while(currentId && currentId !== 'root') {
            const f = fileSystem.find(i => i.id === currentId);
            if(f) { path.unshift(f.name); currentId = f.parentId; } else break;
        }
        return 'BigOS:\\Pulpit\\' + path.join('\\');
    },
    
    openFolder: (folderId) => { 
        if (typeof winManager !== 'undefined') winManager.open('aktowka'); 
        fsManager.renderExplorerContent(folderId); 
    },
    
    navigateUp: () => {
        if(fsManager.currentFolder === 'root') return;
        if(fsManager.currentFolder === 'hasiok') { fsManager.openFolder('root'); return; }
        const current = fileSystem.find(i => i.id === fsManager.currentFolder);
        if(current && current.parentId) fsManager.openFolder(current.parentId);
        else fsManager.openFolder('root');
    }
};

// Explicit export — top-level const does NOT become a window property.
window.fsManager = fsManager;
if (typeof globalThis !== 'undefined') globalThis.fsManager = fsManager;