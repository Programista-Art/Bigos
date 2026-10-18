// ======================================================================
// PLIK: js/core/diagnostics.js (Diagnostyka systemu BigOS)
// Structured diagnostic log for startup, storage lifecycle and app errors.
// Never logs credentials or private document contents.
// ======================================================================

(function (global) {
    'use strict';

    const MAX_ENTRIES = 500;
    const entries = [];
    let seq = 0;

    const SENSITIVE_KEY = /api[-_]?key|password|pass|token|secret|credential|authorization|bearer|pin/i;
    // Fields that carry private user content — never retain their values.
    const PRIVATE_CONTENT_KEY = /^(content|text|body|html|prompt|selectedText|selection|document|docBody|fileContent|innerhtml|innerText|value|response|completion|transcript|note|notes)$/i;

    function sanitizeString(str) {
        if (typeof str !== 'string') return str;
        let s = str
            .replace(/AIza[0-9A-Za-z-_]{35}/g, '[api-key-redacted]')
            .replace(/sk-[a-zA-Z0-9]{20,}/g, '[api-key-redacted]')
            .replace(/gsk_[a-zA-Z0-9]{20,}/g, '[api-key-redacted]')
            .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [redacted]')
            .replace(/(password|pass|secret)=[^&\s]+/gi, '$1=[redacted]');
        if (s.length > 40 && /^[A-Za-z0-9_\-\.]{20,}$/.test(s)) return '[redacted]';
        return s.length > 200 ? s.slice(0, 200) + '…' : s;
    }

    function sanitize(value, depth = 0) {
        if (value == null) return value;
        if (depth > 4) return '[deep]';
        if (value instanceof Error) {
            return {
                name: value.name,
                message: sanitizeString(value.message),
                stack: '[redacted-stack]'
            };
        }
        if (typeof value === 'string') {
            return sanitizeString(value);
        }
        if (typeof value !== 'object') return value;
        if (Array.isArray(value)) return value.slice(0, 20).map((v) => sanitize(v, depth + 1));
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            if (k.toLowerCase().includes('stack')) {
                out[k] = '[redacted-stack]';
            } else if (SENSITIVE_KEY.test(k)) {
                out[k] = '[redacted]';
            } else if (PRIVATE_CONTENT_KEY.test(k)) {
                // Private document bodies, prompts, selections — never retain.
                out[k] = '[private]';
            } else {
                out[k] = sanitize(v, depth + 1);
            }
        }
        return out;
    }

    function push(level, category, message, data) {
        const safeMessage = sanitize(String(message), 0);
        const entry = {
            id: ++seq,
            ts: Date.now(),
            level,
            category,
            message: typeof safeMessage === 'string' ? safeMessage.slice(0, 300) : String(message).slice(0, 300),
            data: data === undefined ? undefined : sanitize(data)
        };
        entries.push(entry);
        if (entries.length > MAX_ENTRIES) entries.shift();

        const line = `[BigOS:${category}] ${entry.message}`;
        if (level === 'error') console.error(line, entry.data ?? '');
        else if (level === 'warn') console.warn(line, entry.data ?? '');
        else console.log(line, entry.data ?? '');

        try {
            global.dispatchEvent(new CustomEvent('bigos:diag', { detail: entry }));
        } catch (_) { /* CustomEvent unavailable in some test hosts */ }
        return entry;
    }

    const diag = {
        log(category, message, data) { return push('info', category, message, data); },
        warn(category, message, data) { return push('warn', category, message, data); },
        error(category, message, data) { return push('error', category, message, data); },
        getEntries(filter) {
            let list = entries.slice();
            if (filter && filter.level) list = list.filter((e) => e.level === filter.level);
            if (filter && filter.category) list = list.filter((e) => e.category === filter.category);
            return list;
        },
        clear() { entries.length = 0; },
        exportJSON() {
            return JSON.stringify({ format: 'bigos-diag-v1', exportedAt: new Date().toISOString(), entries }, null, 2);
        }
    };

    global.bigosDiag = diag;
    // Compatibility alias used by older call sites / tests.
    global.diag = diag;
})(typeof window !== 'undefined' ? window : globalThis);
