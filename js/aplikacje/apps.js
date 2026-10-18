// ======================================================================
// PLIK: js/aplikacje/apps.js (Jądro Systemu - Zasilanie, Menu, Toasty)
// ======================================================================

const apps = {
    // ==================================================================
    // 1. KOMUNIKATY I SYSTEMOWE GUI
    // ==================================================================
    showToast: (t, m, type = 'info') => { 
        const c = document.getElementById('toast-container'); 
        if(!c) return;
        const el = document.createElement('div'); 
        const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600' }; 
        
        el.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-xl transform transition-all translate-y-10 opacity-0 pointer-events-auto border border-white/20 z-[9999]`; 
        el.innerHTML = `<strong>${t}</strong><br><span class="text-sm">${m}</span>`; 
        c.appendChild(el); 
        
        requestAnimationFrame(() => el.classList.remove('translate-y-10', 'opacity-0')); 
        
        setTimeout(() => { 
            el.classList.add('opacity-0'); 
            setTimeout(() => el.remove(), 300); 
        }, 3000); 
    },

    toggleStartMenu: () => { 
        const sm = document.getElementById('start-menu');
        if (!sm) return;

        sm.classList.toggle('hidden'); 
        sm.classList.toggle('flex'); 
        const calWidget = document.getElementById('calendar-widget');
        if(calWidget) calWidget.classList.add('hidden-cal'); 

        // ==================================================
        // ZAMROŻENIE WYSOKOŚCI SZUFLADY
        // Zamienia pływającą wysokość na stałą, aby menu nie skakało podczas szukania
        // ==================================================
        const listContainer = document.getElementById('start-menu-list');
        if (listContainer) {
            listContainer.style.height = '55vh';
            listContainer.style.minHeight = '300px';
        }

        // Auto-focus na pole wyszukiwarki (jeśli menu zostało otwarte)
        const searchInput = document.getElementById('start-menu-search');
        if (!sm.classList.contains('hidden') && searchInput) {
            searchInput.value = '';
            if (apps.searchMenu) apps.searchMenu('');
            setTimeout(() => searchInput.focus(), 50);
        }

        if (!document.getElementById('start-btn-format')) {
            const formatBtn = document.createElement('div');
            formatBtn.id = 'start-btn-format';
            formatBtn.className = 'w-full flex items-center gap-3 px-4 py-2 hover:bg-white/10 transition cursor-pointer text-red-400 hover:text-red-300 mt-1 border-t border-gray-700/50 pt-3';
            formatBtn.onclick = () => {
                apps.toggleStartMenu();
                apps.formatSystem();
            };
            formatBtn.innerHTML = `
                <span style="width: 20px; text-align: center;">⚠️</span>
                <span class="text-sm font-medium">Formatuj (usuń dane BigOS)</span>
            `;
            sm.appendChild(formatBtn);
        }

        if (!document.getElementById('start-btn-backup')) {
            const backupBtn = document.createElement('div');
            backupBtn.id = 'start-btn-backup';
            backupBtn.className = 'w-full flex items-center gap-3 px-4 py-2 hover:bg-white/10 transition cursor-pointer g-text mt-1';
            backupBtn.onclick = () => {
                apps.toggleStartMenu();
                apps.showBackupUI();
            };
            backupBtn.innerHTML = `
                <span style="width: 20px; text-align: center;">💾</span>
                <span class="text-sm font-medium">Kopia zapasowa / Przywróć</span>
            `;
            sm.appendChild(backupBtn);
        }

        if (!document.getElementById('start-btn-reset-settings')) {
            const rs = document.createElement('div');
            rs.id = 'start-btn-reset-settings';
            rs.className = 'w-full flex items-center gap-3 px-4 py-2 hover:bg-white/10 transition cursor-pointer g-text-muted mt-1';
            rs.onclick = () => { apps.toggleStartMenu(); apps.resetSettings(); };
            rs.innerHTML = `
                <span style="width: 20px; text-align: center;">🔧</span>
                <span class="text-sm font-medium">Reset ustawień (zachowaj pliki)</span>
            `;
            sm.appendChild(rs);
        }
    },

    // ==================================================================
    // 2b. KOPIA ZAPASOWA I PRZYWRACANIE
    // ==================================================================
    showBackupUI: () => {
        const modalId = 'backup-ui-modal';
        let modal = document.getElementById(modalId);
        if (modal) modal.remove();
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-black/70 z-[10000] flex items-center justify-center backdrop-blur-sm p-4';
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-lg w-full border g-border max-h-[85vh] overflow-y-auto">
                <h2 class="text-xl font-bold g-text mb-2">💾 Kopia zapasowa BigOS</h2>
                <p class="text-xs g-text-muted mb-4">Kopia obejmuje pliki, foldery, dane aplikacji, pakiety i ustawienia.
                <b>Klucze API są domyślnie wykluczane</b> — eksport danych logowania wymaga osobnej, świadomej zgody.</p>
                <p class="text-[10px] g-text-muted mb-4 border-t border-b g-border py-2">
                Trwałe magazynowanie (StorageManager.persist) <b>nie zastępuje kopii zapasowej</b>. Wykonuj regularne backupy.</p>
                <div class="flex flex-col gap-2 mb-4">
                    <label class="flex items-center gap-2 text-sm g-text cursor-pointer">
                        <input type="checkbox" id="backup-include-creds" class="w-4 h-4">
                        Dołącz klucze API / dane logowania (niezalecane)
                    </label>
                </div>
                <div class="flex flex-wrap gap-2 mb-4">
                    <button id="backup-create-btn" class="g-btn px-4 py-2 rounded-lg font-bold text-sm bg-blue-600/20 border-blue-500/50 hover:bg-blue-500 hover:text-white">Pobierz kopię (.json)</button>
                    <button id="backup-restore-btn" class="g-btn px-4 py-2 rounded-lg font-bold text-sm bg-emerald-600/20 border-emerald-500/50 hover:bg-emerald-500 hover:text-white">Przywróć z pliku…</button>
                    <button id="backup-recovery-btn" class="g-btn px-4 py-2 rounded-lg font-bold text-sm bg-yellow-600/20 border-yellow-500/50 hover:bg-yellow-500 hover:text-black">Przywróć recovery</button>
                </div>
                <div id="backup-status" class="text-xs g-text-muted mb-4 min-h-[2rem]"></div>
                <div class="flex justify-end">
                    <button class="px-4 py-2 g-bg g-text hover:bg-white/10 rounded-lg border g-border" onclick="document.getElementById('${modalId}').remove()">Zamknij</button>
                </div>
            </div>`;
        document.body.appendChild(modal);

        const status = modal.querySelector('#backup-status');
        modal.querySelector('#backup-create-btn').onclick = async () => {
            try {
                const includeCreds = modal.querySelector('#backup-include-creds').checked;
                status.textContent = 'Tworzenie kopii…';
                const payload = await bigosBackup.create({ includeCredentials: includeCreds });
                bigosBackup.download(payload);
                status.textContent = `Utworzono kopię: ${payload.files.length} plików, ${payload.packages.length} pakietów.`;
            } catch (e) {
                status.textContent = 'Błąd: ' + e.message;
            }
        };
        modal.querySelector('#backup-restore-btn').onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json,.json';
            input.onchange = async (ev) => {
                const f = ev.target.files[0];
                if (!f) return;
                try {
                    status.textContent = 'Walidacja…';
                    const data = JSON.parse(await f.text());
                    const preview = await bigosBackup.preview(data);
                    if (!preview.ok) {
                        status.textContent = 'Nieprawidłowa kopia: ' + preview.errors.join('; ');
                        return;
                    }
                    const s = preview.summary;
                    const msg = `Podgląd przywracania:\n` +
                        `• Pliki: ${s.fileCount} (foldery: ${s.folderCount}, app: ${s.appCount})\n` +
                        `• Treści: ${s.contentCount}\n` +
                        `• Pakiety: ${s.packageCount}\n` +
                        `• Ustawienia: ${s.settingKeys.length} kluczy\n` +
                        `• Utworzono: ${s.createdAt}\n\n` +
                        `Zastąpić bieżące dane? Kopia recovery zostanie zachowana.`;
                    if (!confirm(msg)) { status.textContent = 'Anulowano.'; return; }
                    status.textContent = 'Przywracanie…';
                    const res = await bigosBackup.restore(data, { mode: 'replace', keepRecovery: true });
                    if (res.ok) {
                        status.textContent = 'Przywrócono. Za chwilę nastąpi przeładowanie…';
                        setTimeout(() => location.reload(), 600);
                    } else {
                        status.textContent = 'Błąd: ' + (res.errors || []).join('; ');
                    }
                } catch (e) {
                    status.textContent = 'Błąd odczytu pliku: ' + e.message;
                }
            };
            input.click();
        };
        modal.querySelector('#backup-recovery-btn').onclick = async () => {
            const rec = bigosBackup.getRecoveryCopy();
            if (!rec) { status.textContent = 'Brak kopii recovery.'; return; }
            if (!confirm('Przywrócić kopię recovery (stan sprzed ostatniego przywracania/formatu)?')) return;
            const res = await bigosBackup.restoreRecovery();
            if (res.ok) {
                status.textContent = 'Przywrócono recovery. Przeładowanie…';
                setTimeout(() => location.reload(), 600);
            } else {
                status.textContent = 'Błąd: ' + (res.errors || []).join('; ');
            }
        };
    },

    showPersistentStorageStatus: async () => {
        const info = await (typeof bigosMaintenance !== 'undefined'
            ? bigosMaintenance.requestPersistentStorage()
            : Promise.resolve({ supported: false, note: 'Brak modułu' }));
        if (typeof apps !== 'undefined') {
            apps.showToast('Trwałe magazynowanie', info.note || String(info.persisted), info.persisted ? 'success' : 'info');
        }
        return info;
    },

    // ==================================================================
    // 2. ZARZĄDZANIE ZASILANIEM I SYSTEMEM
    // ==================================================================
    // Formatowanie: usuwa dane BigOS (IndexedDB + klucze bigos_* w localStorage),
    // zatrzymuje aplikacje i czeka na zakończenie zapisów przed przeładowaniem.
    formatSystem: async () => {
        if (typeof bigosMaintenance === 'undefined') {
            // Fallback zgodny ze starym API, gdy core się nie wczytał.
            if (confirm('Czy na pewno chcesz sformatować system BigOS? Utracisz wszystkie dane BigOS!')) {
                try {
                    for (let i = localStorage.length - 1; i >= 0; i--) {
                        const k = localStorage.key(i);
                        if (k && k.startsWith('bigos_')) localStorage.removeItem(k);
                    }
                    if (typeof indexedDB !== 'undefined') {
                        const r = await new Promise((resolve) => {
                            let settled = false;
                            const done = (v) => { if (!settled) { settled = true; clearTimeout(t); resolve(v); } };
                            const t = setTimeout(() => resolve({ ok: false }), 5000);
                            const req = indexedDB.deleteDatabase('BigOS_DB');
                            req.onsuccess = () => resolve({ ok: true });
                            req.onerror = () => resolve({ ok: false });
                            req.onblocked = () => { /* wait for success/error/timeout */ };
                        });
                        if (!r.ok) {
                            if (typeof apps !== 'undefined') {
                                apps.showToast('Formatowanie', 'Baza danych jest zablokowana — operacja nie została zakończona.', 'error');
                            }
                            return { ok: false, code: 'DELETE_BLOCKED' };
                        }
                    }
                } catch (e) { console.error(e); return { ok: false, error: e }; }
                location.reload();
                return { ok: true };
            }
            return { ok: false, cancelled: true };
        }
        return bigosMaintenance.formatSystem({ confirm: true });
    },

    resetSettings: async () => {
        if (typeof bigosMaintenance === 'undefined') return { ok: false, error: 'maintenance module missing' };
        return bigosMaintenance.resetSettings({ confirm: true });
    },

    resetPasswordOnly: async () => {
        if (typeof bigosMaintenance === 'undefined') return { ok: false, error: 'maintenance module missing' };
        return bigosMaintenance.resetPassword({ confirm: true });
    },

    requestPersistentStorage: async () => {
        if (typeof bigosMaintenance === 'undefined') return { supported: false };
        return bigosMaintenance.requestPersistentStorage();
    },

    lockSystem: () => { 
        document.getElementById('start-menu').classList.add('hidden'); 
        document.getElementById('login-screen').style.display = 'flex'; 
        document.getElementById('login-screen').style.opacity = '1'; 
        document.getElementById('password-input').value = ''; 
        document.getElementById('login-msg').innerText = "System Zablokowany. Podaj hasło."; 
    },

    sleepSystem: () => { 
        document.getElementById('start-menu').classList.add('hidden'); 
        const screen = document.getElementById('sleep-screen'); 
        screen.classList.remove('hidden'); 
        
        const wake = () => { 
            screen.classList.add('hidden'); 
            document.removeEventListener('mousemove', wake); 
            document.removeEventListener('keydown', wake); 
            document.removeEventListener('touchstart', wake); 
        }; 
        
        setTimeout(() => { 
            document.addEventListener('mousemove', wake); 
            document.addEventListener('keydown', wake); 
            document.addEventListener('touchstart', wake); 
        }, 1000); 
    },

    shutdownSystem: () => { 
        document.body.innerHTML = `<div class="w-full h-full bg-black flex flex-col items-center justify-center text-white"><button onclick="location.reload()" class="w-24 h-24 rounded-full border-4 border-gray-600 text-gray-600 hover:text-white hover:border-white transition flex items-center justify-center text-4xl mb-4" title="Włącz BigOS">⏻</button><p class="text-gray-500 font-mono">System BigOS wyłączony.</p></div>`; 
    },

    // Nowa, w 100% odporna funkcja filtrowania aplikacji
    searchMenu: (query) => {
        const term = query.toLowerCase().trim();
        
        const menu = document.getElementById('start-menu');
        if (!menu) return;

        // Szuka kontenera ze scrollem niezależnie od tego, czy ma ID czy nie
        const listContainer = document.getElementById('start-menu-list') || menu.querySelector('.overflow-y-auto');
        if (!listContainer) return;

        // Pobieramy absolutnie wszystkie przyciski w liście
        const items = listContainer.querySelectorAll('button');
        const headers = listContainer.querySelectorAll('div, .start-header');
        
        if (term === '') {
            // Czyszczenie wyszukiwarki - przywracamy wszystko
            items.forEach(el => el.style.display = ''); 
            headers.forEach(el => el.style.display = '');
        } else {
            items.forEach(el => {
                // Pobieramy cały widoczny tekst przycisku i sprawdzamy dopasowanie
                const name = el.innerText.toLowerCase();
                if (name.includes(term)) {
                    el.style.display = ''; // Pokazuje przycisk
                } else {
                    el.style.display = 'none'; // Ukrywa przycisk
                }
            });
            // Ukrywa nagłówki ("Gry", "Narzędzia"), żeby nie śmieciły w wynikach
            headers.forEach(el => el.style.display = 'none'); 
        }
    },

    // ==================================================================
    // 3. KOMPATYBILNOŚĆ WSTECZNA (Wrappery dla starszych linków w HTML)
    // ==================================================================
    // 3. KOMPATYBILNOŚĆ WSTECZNA DLA HTML (Tylko przekierowania do modułów!)
    // ==================================================================
    toggleCalendar: (e) => { if(typeof kalendarzApp !== 'undefined') kalendarzApp.toggleCalendar(e); },
    changeCalendarMonth: (dir) => { if(typeof kalendarzApp !== 'undefined') kalendarzApp.changeCalendarMonth(dir); },
    generateCalendar: () => { if(typeof kalendarzApp !== 'undefined') kalendarzApp.generateCalendar(); },
    
    createStickyNote: (id, text, x, y) => { if(typeof karteczkiApp !== 'undefined') karteczkiApp.createStickyNote(id, text, x, y); },
    saveStickyNotes: () => { if(typeof karteczkiApp !== 'undefined') karteczkiApp.saveStickyNotes(); },
    loadStickyNotes: () => { if(typeof karteczkiApp !== 'undefined') karteczkiApp.loadStickyNotes(); },
    
    navigate: () => { if(typeof siecioslawApp !== 'undefined') siecioslawApp.navigate(); },
    terminalHandle: (e) => { if(typeof wladcaApp !== 'undefined') wladcaApp.handle(e); }
};
// Explicit export — top-level const does NOT become a window property.
window.apps = apps;
if (typeof globalThis !== 'undefined') globalThis.apps = apps;
