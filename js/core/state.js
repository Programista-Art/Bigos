// ======================================================================
// PLIK: js/core/state.js (Współdzielony stan systemu BigOS)
// Explicit shared interfaces. Top-level let/const in classic scripts do
// NOT become window properties — every module must read/write these.
// ======================================================================

(function (global) {
    'use strict';

    /** Authoritative mutable filesystem array (same reference always). */
    const fileSystem = [];

    const state = {
        fileSystem,
        openAppsList: new Set(),
        clipboard: { action: null, item: null },
        windows: new Map(),
        session: { openDocs: [], activeAppId: null, savedAt: null },
        defaultApps: null
    };

    /**
     * Replace filesystem contents in place so every holder of the array
     * reference sees the update (no divergent copies).
     */
    state.setFileSystem = function setFileSystem(items) {
        const src = Array.isArray(items) ? items : [];
        if (src === fileSystem) return fileSystem;
        fileSystem.length = 0;
        for (let i = 0; i < src.length; i++) fileSystem.push(src[i]);
        return fileSystem;
    };

    /** Remove items by predicate, in place. */
    state.removeWhere = function removeWhere(pred) {
        for (let i = fileSystem.length - 1; i >= 0; i--) {
            if (pred(fileSystem[i], i)) fileSystem.splice(i, 1);
        }
        return fileSystem;
    };

    // Publish as window properties using accessors that keep one backing store.
    // Bare `fileSystem = x` in a classic script assigns window.fileSystem.
    Object.defineProperty(global, 'fileSystem', {
        get() { return fileSystem; },
        set(v) { state.setFileSystem(v); },
        configurable: true,
        enumerable: true
    });

    global.bigosState = state;

    // Compatibility aliases used across the codebase.
    global.openAppsList = state.openAppsList;
    global.clipboard = state.clipboard;
    // GRID / defaultApps / currentTheme / highestZ are published by js/globals.js.
})(typeof window !== 'undefined' ? window : globalThis);
