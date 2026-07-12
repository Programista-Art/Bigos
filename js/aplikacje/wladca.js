// ======================================================================
// PLIK: js/aplikacje/wladca.js (Władca Poleceń - Terminal)
// ======================================================================

const wladcaApp = {
    currentPath: 'root', // Terminal domyślnie startuje na Pulpicie
    history: [],         // Tablica przechowująca historię komend
    historyIndex: -1,    // Aktualna pozycja w historii podczas używania strzałek
    matrixInterval: null,// Interwał dla efektu Matrix
    
    init: () => {
        // Zezwalamy na swobodne zaznaczanie tekstu myszką w terminalu (nadpisuje globalną blokadę BigOS)
        const out = document.getElementById('terminal-out');
        if (out) {
            out.style.userSelect = 'text';
            out.style.webkitUserSelect = 'text';
            out.style.fontFamily = 'monospace, monospace'; // Wymuszamy monospace, ignorując motywy
        }
        
        const termIn = document.getElementById('term-in');
        if (termIn) {
            termIn.style.fontFamily = 'monospace, monospace';
        }
        
        // Podpięcie dedykowanego menu kontekstowego pod okno Władcy Poleceń
        const appWindow = document.getElementById('app-wladca');
        if (appWindow) {
            appWindow.addEventListener('contextmenu', wladcaApp.showContextMenu);
        }
    },

    // ------------------------------------------------------------------
    // MENU KONTEKSTOWE I SCHOWEK (Prawy Przycisk Myszy)
    // ------------------------------------------------------------------
    showContextMenu: (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const menu = document.getElementById('context-menu');
        if (!menu) return;
        
        const btnClass = "px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition text-sm text-gray-800 dark:text-gray-200";
        const sep = "<div class='border-t border-gray-300 dark:border-gray-600 my-1'></div>";
        
        menu.innerHTML = `
            <div class="${btnClass}" onclick="wladcaApp.copyText()">Kopiuj</div>
            <div class="${btnClass}" onclick="wladcaApp.cutText()">Wytnij</div>
            <div class="${btnClass}" onclick="wladcaApp.pasteText()">Wklej</div>
            ${sep}
            <div class="${btnClass}" onclick="wladcaApp.execute('cls', [], document.getElementById('terminal-out')); document.getElementById('context-menu').classList.remove('active');">Czyść terminal</div>
        `;
        
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        menu.classList.add('active');
    },
    
    copyText: () => {
        document.execCommand('copy');
        document.getElementById('context-menu').classList.remove('active');
        if(typeof apps !== 'undefined') apps.showToast('Terminal', 'Skopiowano zaznaczony tekst', 'info');
    },
    
    cutText: () => {
        document.execCommand('cut');
        document.getElementById('context-menu').classList.remove('active');
    },
    
    pasteText: async () => {
        try {
            const text = await navigator.clipboard.readText();
            const input = document.getElementById('term-in');
            if (input) {
                const start = input.selectionStart;
                const end = input.selectionEnd;
                input.value = input.value.substring(0, start) + text + input.value.substring(end);
                input.selectionStart = input.selectionEnd = start + text.length;
                input.focus();
            }
        } catch (err) {
            if(typeof apps !== 'undefined') apps.showToast('Terminal', 'Brak dostępu. Użyj skrótu CTRL+V.', 'error');
        }
        document.getElementById('context-menu').classList.remove('active');
    },

    // ------------------------------------------------------------------
    // LOGIKA TERMINALA (Klawisze, Komendy, Parsowanie)
    // ------------------------------------------------------------------
    handle: (e) => {
        const input = document.getElementById('term-in');
        const out = document.getElementById('terminal-out');
        let popup = document.getElementById('term-autocomplete-popup');

        // Ukrywamy okienko podpowiedzi jeśli naciśnięto inny klawisz niż Tab
        if (e.key !== 'Tab' && popup) {
            popup.remove();
        }
        
        // 1. HISTORIA KOMEND (Strzałki Góra/Dół)
        if (e.key === 'ArrowUp') {
            e.preventDefault(); 
            if (wladcaApp.history.length > 0) {
                if (wladcaApp.historyIndex <= 0) wladcaApp.historyIndex = 0;
                else wladcaApp.historyIndex--;
                input.value = wladcaApp.history[wladcaApp.historyIndex];
            }
            return;
        }
        else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (wladcaApp.historyIndex >= 0 && wladcaApp.historyIndex < wladcaApp.history.length - 1) {
                wladcaApp.historyIndex++;
                input.value = wladcaApp.history[wladcaApp.historyIndex];
            } else if (wladcaApp.historyIndex === wladcaApp.history.length - 1) {
                wladcaApp.historyIndex = wladcaApp.history.length;
                input.value = ''; 
            }
            return;
        }
        
        // 2. AUTOUZUPEŁNIANIE (Klawisz Tab)
        else if (e.key === 'Tab') {
            e.preventDefault(); 
            const cmdLine = input.value;
            if (cmdLine.trim() === '') return;

            const firstSpaceIndex = cmdLine.indexOf(' ');
            let possibilities = [];
            let isCommandMode = (firstSpaceIndex === -1); 
            let prefix = '';

            if (isCommandMode) {
                prefix = cmdLine.toLowerCase();
                const baseCommands = [
                    'help', 'history', 'date', 'sysinfo', 'cls', 'clear', 'ver', 'dir', 'ls', 'tree', 'pwd', 'cd', 'echo', 'whoami', 
                    'mkdir', 'touch', 'rm', 'theme', 'color', 'reboot', 'restart', 'format', 'lock', 'calc', 'base64', 'timer', 'roll', 'cytat', 'matrix', 'pogoda',
                    'ping', 'open', 'kod', 'upychacz', 'zip', 'kasiarz', 'przelicznik'
                ];
                let appCommands = [];
                if (typeof fileSystem !== 'undefined') {
                    appCommands = fileSystem.filter(i => i.type === 'app').map(i => i.name.toLowerCase());
                }
                possibilities = [...baseCommands, ...appCommands];
            } else {
                prefix = cmdLine.substring(firstSpaceIndex + 1).toLowerCase();
                if (typeof fileSystem !== 'undefined') {
                    possibilities = fileSystem.filter(i => i.parentId === wladcaApp.currentPath).map(i => i.name);
                }
            }

            const matches = possibilities.filter(p => p.toLowerCase().startsWith(prefix));

            if (matches.length === 1) {
                // Jeśli jest jeden wynik - autouzupełnia od razu
                if (isCommandMode) {
                    input.value = matches[0] + ' ';
                } else {
                    const cmd = cmdLine.substring(0, firstSpaceIndex);
                    input.value = cmd + ' ' + matches[0];
                }
                if (popup) popup.remove();
            } else if (matches.length > 1) {
                // Wiele wyników - pokazuje pływające okienko nad inputem
                if (!popup) {
                    popup = document.createElement('div');
                    popup.id = 'term-autocomplete-popup';
                    popup.className = 'absolute bottom-full left-2 mb-2 bg-black/90 border g-border rounded-lg shadow-2xl p-2 flex flex-wrap gap-1.5 z-50 max-w-[95%] max-h-[120px] overflow-y-auto custom-scrollbar backdrop-blur-md';
                    input.parentElement.style.position = 'relative';
                    input.parentElement.appendChild(popup);
                }
                
                popup.innerHTML = matches.map(m => {
                    const insertVal = isCommandMode ? m + ' ' : cmdLine.substring(0, firstSpaceIndex) + ' ' + m;
                    return `<span class="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-[10px] font-bold border border-blue-500/30 cursor-pointer hover:bg-blue-500 hover:text-white transition" onclick="document.getElementById('term-in').value = '${insertVal}'; document.getElementById('term-in').focus(); document.getElementById('term-autocomplete-popup').remove();">${m}</span>`;
                }).join('');
            }
            return;
        }

        // 3. WYKONYWANIE KOMENDY (Enter)
        else if(e.key === 'Enter') {
            const cmdLine = input.value.trim();
            if(cmdLine === '') return;

            if (wladcaApp.history.length === 0 || wladcaApp.history[wladcaApp.history.length - 1] !== cmdLine) {
                wladcaApp.history.push(cmdLine);
            }
            wladcaApp.historyIndex = wladcaApp.history.length;

            let pathDisplay = '~';
            if (wladcaApp.currentPath !== 'root' && typeof fileSystem !== 'undefined') {
                const f = fileSystem.find(i => i.id === wladcaApp.currentPath);
                if (f) pathDisplay = `~/${f.name}`;
            }

            out.innerHTML += `\n<span class="g-accent font-bold">root@bigos:${pathDisplay}#</span> ${desktop.escapeHTML(cmdLine)}`;
            
            const args = cmdLine.split(' ').filter(arg => arg !== '');
            const cmd = args[0].toLowerCase();
            const cmdArgs = args.slice(1);
            
            wladcaApp.execute(cmd, cmdArgs, out);
            
            input.value = '';
            out.scrollTop = out.scrollHeight;
        }
    },
    
    execute: (cmd, args, out) => {
        switch(cmd) {
            case 'help':
                // Kulooodporne renderowanie poleceń gwarantujące równiutką kolumnę "schodów"
                const commandsList = [
                    { c: 'help', d: 'Wyświetla tę listę' },
                    { c: 'history', d: 'Wyświetla historię poleceń' },
                    { c: 'date', d: 'Wyświetla aktualną datę i czas' },
                    { c: 'sysinfo', d: 'Wyświetla informacje o sprzęcie' },
                    { c: 'cls / clear', d: 'Czyści ekran terminala' },
                    { c: 'ver', d: 'Wersja systemu BigOS' },
                    { c: 'dir / ls', d: 'Wyświetla pliki i foldery' },
                    { c: 'tree', d: 'Wyświetla drzewo obecnego katalogu' },
                    { c: 'pwd', d: 'Zwraca obecną ścieżkę' },
                    { c: 'cd [nazwa]', d: 'Zmiana katalogu (np. cd hasiok)' },
                    { c: 'echo', d: 'Wypisuje tekst na ekranie' },
                    { c: 'whoami', d: 'Wyświetla obecnego użytkownika' },
                    { c: 'mkdir [n]', d: 'Tworzy nowy folder' },
                    { c: 'touch [n]', d: 'Tworzy nowy, pusty plik' },
                    { c: 'rm [n]', d: 'Usuwa plik lub folder' },
                    { c: 'theme [motyw]', d: 'Zmienia motyw (\'dark\' lub \'light\')' },
                    { c: 'color [kolor]', d: 'Zmienia kolor tekstu (np. color red)' },
                    { c: 'reboot/restart', d: 'Uruchamia ponownie system' },
                    { c: 'format', d: 'Przywraca ustawienia fabryczne' },
                    { c: 'lock', d: 'Blokuje ekran' },
                    { c: 'calc [wzór]', d: 'Kalkulator (np. calc 5*5)' },
                    { c: 'base64 [tryb]', d: 'base64 enc/dec [tekst]' },
                    { c: 'timer [sek]', d: 'Uruchamia odliczanie' },
                    { c: 'roll [n]', d: 'Rzuca wirtualną kością (1-n)' },
                    { c: 'cytat', d: 'Losuje motywujący cytat' },
                    { c: 'matrix', d: 'Efekt The Matrix' },
                    { c: 'pogoda [miasto]', d: 'Pogoda dla zadanego miasta' },
                    { c: 'ping [adres]', d: 'Symuluje wysyłanie pakietów PING' },
                    { c: 'open [url]', d: 'Otwiera adres w Sieciosławiu' }
                ];

                const aliasesList = [
                    { c: 'kod', d: 'Otwiera Rachmistrz Kodu' },
                    { c: 'upychacz / zip', d: 'Otwiera Kompresor ZIP' },
                    { c: 'kasiarz', d: 'Kalkulator Finansowy' },
                    { c: 'przelicznik', d: 'Przelicznik jednostek' },
                    { c: '[nazwa]', d: 'Otwiera plik lub aplikację' }
                ];

                let hHTML = '\nDostępne komendy:\n';
                commandsList.forEach(cmd => { 
                    hHTML += `  <span class="g-accent opacity-80" style="display:inline-block; width:150px;">${cmd.c}</span> - ${cmd.d}\n`; 
                });
                
                hHTML += '\nAplikacje (Szybkie aliasy):\n';
                aliasesList.forEach(cmd => { 
                    hHTML += `  <span class="g-accent opacity-80" style="display:inline-block; width:150px;">${cmd.c}</span> - ${cmd.d}\n`; 
                });

                out.innerHTML += hHTML;
                break;
                
            case 'date':
                out.innerHTML += `\n${new Date().toLocaleString()}`;
                break;
                
            case 'history':
                if (wladcaApp.history.length === 0) {
                    out.innerHTML += `\nBrak wpisów w historii.`;
                } else {
                    wladcaApp.history.forEach((h, i) => {
                        out.innerHTML += `\n  ${i + 1}  ${desktop.escapeHTML(h)}`;
                    });
                }
                break;

            case 'cls':
            case 'clear':
                if (wladcaApp.matrixInterval) {
                    clearInterval(wladcaApp.matrixInterval);
                    wladcaApp.matrixInterval = null;
                }
                out.innerHTML = 'Witaj we Władcy Poleceń!\nWpisz \'help\' aby uzyskać listę komend.\n';
                break;
                
            case 'ver':
            case 'version':
                out.innerHTML += `\nBigOS Wersja 1.5 (Wydanie Modularne PRO)`;
                break;

            case 'sysinfo':
                const usedMemory = JSON.stringify(localStorage).length;
                const kbMemory = (usedMemory / 1024).toFixed(2);
                let browserInfo = "Nieznana";
                if(navigator.userAgent.includes("Chrome")) browserInfo = "Google Chrome / Edge";
                if(navigator.userAgent.includes("Firefox")) browserInfo = "Mozilla Firefox";
                if(navigator.userAgent.includes("Safari") && !navigator.userAgent.includes("Chrome")) browserInfo = "Apple Safari";
                
                out.innerHTML += `\n--- INFORMACJE O SYSTEMIE ---`;
                out.innerHTML += `\nSystem: BigOS Wersja 1.5`;
                out.innerHTML += `\nUżytkownik: root`;
                out.innerHTML += `\nRozdzielczość ekranu: ${window.innerWidth}x${window.innerHeight} px`;
                out.innerHTML += `\nSilnik przeglądarki: ${browserInfo}`;
                out.innerHTML += `\nZajęte miejsce na dysku wirtualnym: ${kbMemory} KB`;
                break;
                
            case 'echo':
                out.innerHTML += `\n${desktop.escapeHTML(args.join(' '))}`;
                break;
                
            case 'whoami':
                out.innerHTML += `\nroot (Administrator Systemu BigOS)`;
                break;

            case 'pwd':
                let fullPath = 'BigOS:\\Pulpit';
                if (wladcaApp.currentPath !== 'root' && typeof fsManager !== 'undefined') {
                    fullPath = fsManager.getPath(wladcaApp.currentPath);
                }
                out.innerHTML += `\n${desktop.escapeHTML(fullPath)}`;
                break;

            case 'dir':
            case 'ls':
                if (typeof fileSystem !== 'undefined') {
                    const items = fileSystem.filter(i => i.parentId === wladcaApp.currentPath);
                    if(items.length === 0) {
                        out.innerHTML += `\n(katalog jest pusty)`;
                    } else {
                        let list = items.map(i => {
                            if(i.type === 'folder') return `<span class="g-accent font-bold">${i.name}/</span>`;
                            if(i.type === 'app') return `<span class="text-emerald-400 font-bold">${i.name}.exe</span>`;
                            return i.name;
                        }).join('  ');
                        out.innerHTML += `\n${list}`;
                    }
                } else {
                    out.innerHTML += `\nBłąd: Nie można nawiązać połączenia z systemem plików BigOS.`;
                }
                break;

            case 'tree':
                out.innerHTML += `\n.`;
                if (typeof fileSystem !== 'undefined') {
                    const treeItems = fileSystem.filter(i => i.parentId === wladcaApp.currentPath);
                    if (treeItems.length === 0) {
                        out.innerHTML += `\n(pusty)`;
                    } else {
                        treeItems.forEach((item, index) => {
                            const isLast = index === treeItems.length - 1;
                            const prefix = isLast ? '└── ' : '├── ';
                            let colorClass = 'g-text';
                            if(item.type === 'folder') colorClass = 'g-accent font-bold';
                            else if(item.type === 'app') colorClass = 'text-emerald-400 font-bold';
                            
                            out.innerHTML += `\n${prefix}<span class="${colorClass}">${desktop.escapeHTML(item.name)}</span>`;
                        });
                    }
                }
                break;
                
            case 'cd':
                if (args.length === 0) {
                    wladcaApp.currentPath = 'root';
                } else {
                    const target = args.join(' ').toLowerCase(); 
                    if (target === '..') {
                        if(wladcaApp.currentPath !== 'root') {
                            const currentFolder = fileSystem.find(i => i.id === wladcaApp.currentPath);
                            wladcaApp.currentPath = (currentFolder && currentFolder.parentId) ? currentFolder.parentId : 'root';
                        }
                    } else if (target === 'root' || target === '~' || target === '/') {
                        wladcaApp.currentPath = 'root';
                    } else {
                        const folder = fileSystem.find(i => i.type === 'folder' && i.parentId === wladcaApp.currentPath && i.name.toLowerCase() === target);
                        if(folder) {
                            wladcaApp.currentPath = folder.id;
                        } else {
                            out.innerHTML += `\nbash: cd: ${desktop.escapeHTML(args.join(' '))}: Nie ma takiego katalogu`;
                        }
                    }
                }
                break;

            case 'mkdir':
                if(args.length === 0) {
                    out.innerHTML += `\nbash: mkdir: brakujący argument operacji (podaj nazwę)`;
                } else {
                    const dirName = args.join(' ').trim();
                    const existingDir = fileSystem.find(i => i.parentId === wladcaApp.currentPath && i.name.toLowerCase() === dirName.toLowerCase());
                    
                    if (existingDir) {
                        out.innerHTML += `\nbash: mkdir: nie można utworzyć katalogu '${desktop.escapeHTML(dirName)}': Plik lub folder istnieje`;
                    } else {
                        fileSystem.push({ id: 'fld_'+Date.now(), type: 'folder', name: dirName, icon: '📁', parentId: wladcaApp.currentPath, x: 20, y: 20 });
                        
                        if(typeof fsManager !== 'undefined') fsManager.save();
                        if(typeof desktop !== 'undefined') desktop.render();
                        if(typeof fsManager !== 'undefined' && fsManager.currentFolder === wladcaApp.currentPath) fsManager.renderExplorerContent(wladcaApp.currentPath);
                        
                        out.innerHTML += `\nUtworzono katalog: ${desktop.escapeHTML(dirName)}`;
                    }
                }
                break;

            case 'touch':
                if(args.length === 0) {
                    out.innerHTML += `\nbash: touch: brakujący argument operacji (podaj nazwę)`;
                } else {
                    const touchName = args.join(' ').trim();
                    const existingFile = fileSystem.find(i => i.parentId === wladcaApp.currentPath && i.name.toLowerCase() === touchName.toLowerCase());
                    
                    if (existingFile) {
                        out.innerHTML += `\nAktualizacja pliku '${desktop.escapeHTML(touchName)}' (plik już istnieje)`;
                    } else {
                        fileSystem.push({ id: 'file_'+Date.now(), type: 'file', name: touchName, icon: '📄', content: '', parentId: wladcaApp.currentPath, x: 20, y: 20 });
                        
                        if(typeof fsManager !== 'undefined') fsManager.save();
                        if(typeof desktop !== 'undefined') desktop.render();
                        if(typeof fsManager !== 'undefined' && fsManager.currentFolder === wladcaApp.currentPath) fsManager.renderExplorerContent(wladcaApp.currentPath);
                        
                        out.innerHTML += `\nUtworzono plik: ${desktop.escapeHTML(touchName)}`;
                    }
                }
                break;

            case 'rm':
                if(args.length === 0) {
                    out.innerHTML += `\nbash: rm: brakujący argument operacji (podaj nazwę)`;
                } else {
                    const rmName = args.join(' ').trim();
                    const rmItem = fileSystem.find(i => i.parentId === wladcaApp.currentPath && i.name.toLowerCase() === rmName.toLowerCase());
                    
                    if (rmItem) {
                        if (rmItem.id === 'hasiok') {
                            out.innerHTML += `\nbash: rm: nie można usunąć Kosza systemu!`;
                        } else {
                            rmItem.parentId = 'hasiok';
                            if(typeof fsManager !== 'undefined') fsManager.save();
                            if(typeof desktop !== 'undefined') desktop.render();
                            if(typeof fsManager !== 'undefined' && fsManager.currentFolder === wladcaApp.currentPath) fsManager.renderExplorerContent(wladcaApp.currentPath);
                            
                            out.innerHTML += `\nUsunięto do Hasioka: ${desktop.escapeHTML(rmItem.name)}`;
                        }
                    } else {
                        out.innerHTML += `\nbash: rm: nie można usunąć '${desktop.escapeHTML(rmName)}': Nie ma takiego pliku ani katalogu`;
                    }
                }
                break;

            case 'theme':
                if (args.length === 0) {
                    out.innerHTML += `\nbash: theme: podaj wartość 'dark' lub 'light'`;
                } else {
                    const t = args[0].toLowerCase();
                    if (t === 'dark' || t === 'light') {
                        if (typeof apps !== 'undefined') apps.setTheme(t);
                        out.innerHTML += `\nZmieniono motyw systemu na: ${t}`;
                    } else {
                        out.innerHTML += `\nbash: theme: nieznany motyw '${desktop.escapeHTML(t)}'`;
                    }
                }
                break;

            case 'color':
                if (args.length === 0) {
                    out.innerHTML += `\nbash: color: podaj kolor (np. red, #ff00ff, default)`;
                } else {
                    const c = args[0].toLowerCase();
                    const termIn = document.getElementById('term-in');
                    if (c === 'default') {
                        out.style.color = '';
                        if(termIn) termIn.style.color = '';
                        out.innerHTML += `\nPrzywrócono domyślny kolor terminala.`;
                    } else {
                        out.style.color = c;
                        if(termIn) termIn.style.color = c;
                        out.innerHTML += `\nZmieniono kolor terminala.`;
                    }
                }
                break;

            case 'reboot':
            case 'restart':
                out.innerHTML += `\nRestartowanie systemu BigOS...`;
                setTimeout(() => location.reload(), 500);
                break;

            case 'format':
                out.innerHTML += `\nWywoływanie procedury formatowania systemu...`;
                if (typeof apps !== 'undefined') {
                    apps.formatSystem();
                } else {
                    out.innerHTML += `\n[BŁĄD] Brak podłączonego modułu "Kombinator". Formatowanie przerwane.`;
                }
                break;

            case 'lock':
                out.innerHTML += `\nBlokowanie sesji użytkownika...`;
                setTimeout(() => {
                    if (typeof apps !== 'undefined') apps.lockSystem();
                }, 300);
                break;

            case 'calc':
                if (args.length === 0) {
                    out.innerHTML += `\nbash: calc: podaj wyrażenie do obliczenia (np. calc 10 * 5)`;
                } else {
                    try {
                        const expr = args.join('');
                        if (/^[0-9+\-*/().\s]+$/.test(expr)) {
                            const result = new Function('return ' + expr)();
                            out.innerHTML += `\nWynik: ${result}`;
                        } else {
                            out.innerHTML += `\nbash: calc: niedozwolone znaki w równaniu`;
                        }
                    } catch(e) {
                        out.innerHTML += `\nbash: calc: błąd matematyczny (sprawdź zapis działania)`;
                    }
                }
                break;

            case 'base64':
                if (args.length < 2) {
                    out.innerHTML += `\nbash: base64: użycie: base64 [enc/dec] [tekst]`;
                } else {
                    const mode = args[0].toLowerCase();
                    const textData = args.slice(1).join(' ');
                    try {
                        if (mode === 'enc') {
                            out.innerHTML += `\nZakodowano: ${btoa(textData)}`;
                        } else if (mode === 'dec') {
                            out.innerHTML += `\nOdkodowano: ${atob(textData)}`;
                        } else {
                            out.innerHTML += `\nbash: base64: nieznany tryb (użyj 'enc' lub 'dec')`;
                        }
                    } catch(e) {
                        out.innerHTML += `\nbash: base64: błąd dekodowania ciągu`;
                    }
                }
                break;

            case 'timer':
                const secs = parseInt(args[0]);
                if (isNaN(secs) || secs <= 0) {
                    out.innerHTML += `\nbash: timer: podaj liczbę sekund (np. timer 5)`;
                } else {
                    out.innerHTML += `\nUruchomiono odliczanie na ${secs} sekund...`;
                    setTimeout(() => {
                        if (typeof apps !== 'undefined') apps.showToast('Odliczanie', `Minęło ${secs} sekund!`, 'success');
                    }, secs * 1000);
                }
                break;

            case 'roll':
                let max = parseInt(args[0]);
                if (isNaN(max) || max <= 1) max = 6;
                const roll = Math.floor(Math.random() * max) + 1;
                out.innerHTML += `\n🎲 Rzut kością (1-${max}): Wylosowano ${roll}!`;
                break;

            case 'cytat':
                const quotes = [
                    "Programowanie to w 10% pisanie kodu, a w 90% szukanie dlaczego nie działa.",
                    "Jeśli to głupie, ale działa, to nie jest głupie.",
                    "Istnieje 10 rodzajów ludzi: ci, którzy rozumieją system binarny, i ci, którzy go nie rozumieją.",
                    "To nie jest błąd, to nieudokumentowana funkcja.",
                    "W teorii teoria i praktyka są tym samym. W praktyce nie są.",
                    "Jeśli coś działa, nie dotykaj.",
                    "Programista – organizm, który zamienia kofeinę w kod.",
                    "Błędy to po prostu nieoczekiwane cechy programu.",
                    "Kompiluje się? Wrzucamy na produkcję!",
                    "Na moim komputerze działało.",
                    "Dobry kod sam się dokumentuje.",
                    "Nie martw się, jeśli coś nie działa. Gdyby wszystko działało, nie miałbyś pracy.",
                    "Każdy kod, którego nie pisałeś przez ostatnie 6 miesięcy, mógłby równie dobrze być napisany przez kogoś innego.",
                    "Mierzenie postępu programowania w liniach kodu to jak mierzenie postępu budowy samolotu w kilogramach.",
                    "Sprzęt to część komputera, którą można kopnąć. Oprogramowanie to część, którą można tylko przekląć.",
                    "Prawdziwi programiści nie komentują kodu. Jeśli trudno było to napisać, powinno być trudno to przeczytać.",
                    "Zrób to dobrze za pierwszym razem.",
                    "Dwa najważniejsze narzędzia programisty to gumka do ścierania i kosz na śmieci.",
                    "Przedwczesna optymalizacja to korzeń wszelkiego zła.",
                    "Koduj tak, jakby osoba utrzymująca twój kod była brutalnym psychopatą, który wie, gdzie mieszkasz.",
                    "Gdy uderzasz głową w klawiaturę, tracisz 150 kalorii na godzinę.",
                    "Najlepszym sposobem przewidzenia przyszłości jest jej zaimplementowanie.",
                    "W C++ trudniej strzelić sobie w stopę, ale jeśli to zrobisz, odstrzelisz sobie całą nogę.",
                    "Jedyne zabezpieczenie to brak prądu.",
                    "Internet Explorer to narzędzie do pobierania innych przeglądarek.",
                    "Najgorszą rzeczą w programowaniu jest to, że musisz myśleć, zanim coś napiszesz.",
                    "Upewnij się, że komputer jest podłączony do gniazdka.",
                    "Języki programowania dzielą się na te, na które wszyscy narzekają, i te, których nikt nie używa.",
                    "Czasem najlepszym kodem jest ten, którego w ogóle nie napisano.",
                    "Ctrl+C, Ctrl+V - klawisze, które zbudowały nowoczesny internet.",
                    "Kto rano wstaje, ten ma więcej czasu na debugowanie.",
                    "Złota zasada IT: Uruchom ponownie i sprawdź czy działa.",
                    "Chmura to po prostu komputer kogoś innego.",
                    "Zrób kopię zapasową, zanim będzie za późno.",
                    "Działające oprogramowanie to podstawowa miara postępu.",
                    "Im więcej wiesz, tym bardziej zdajesz sobie sprawę, że nic nie wiesz.",
                    "AI nie zastąpi programistów, ale programiści używający AI zastąpią tych, którzy jej nie używają.",
                    "Pamiętaj o zamknięciu tagu </div>",
                    "Nie ma głupich pytań, są tylko głupie błędy w kodzie.",
                    "Pętla nieskończona - wejście jest, wyjścia brak.",
                    "Rekurencja: patrz -> Rekurencja.",
                    "Gdzie dwóch programistów, tam trzy frameworki JS.",
                    "Wydawało mi się to proste, dopóki nie zacząłem tego kodować.",
                    "Zawsze zostawiaj kod czystszym, niż go zastałeś.",
                    "Życie to nie program, nie ma przycisku Cofnij.",
                    "Najtrudniejsze w IT jest nazwanie zmiennej i unieważnienie pamięci podręcznej.",
                    "Gdy brakuje argumentów, zacznij rzucać wyjątki.",
                    "JavaScript to asynchroniczny chaos trzymany w ryzach taśmą klejącą.",
                    "Zanim użyjesz AI, sprawdź w dokumentacji.",
                    "Lepiej mieć jeden duży błąd niż tysiąc małych.",
                    "Przerwa na kawę rozwiązuje 50% błędów w kodzie.",
                    "Każdy problem w informatyce można rozwiązać przez dodanie kolejnego poziomu abstrakcji.",
                    "System BigOS nie potrzebuje aktualizacji, BigOS JEST aktualizacją!"
                ];
                const randQuote = quotes[Math.floor(Math.random() * quotes.length)];
                out.innerHTML += `\n💡 Cytat dla Ciebie:\n"${randQuote}"`;
                break;

            case 'matrix':
                if (wladcaApp.matrixInterval) {
                    clearInterval(wladcaApp.matrixInterval);
                    wladcaApp.matrixInterval = null;
                    out.innerHTML += `\n\nPrzerwano połączenie z Matrixem. Witaj z powrotem.`;
                } else {
                    out.innerHTML += `\nWchodzisz do Matrixa... (Wpisz 'matrix' jeszcze raz aby opuścić symulację)\n\n`;
                    const chars = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%^&*';
                    wladcaApp.matrixInterval = setInterval(() => {
                        let line = '';
                        for(let i = 0; i < 50; i++) {
                            line += chars.charAt(Math.floor(Math.random() * chars.length)) + ' ';
                        }
                        out.innerHTML += `<div class="text-emerald-500 opacity-80 font-bold" style="font-size: 0.75rem;">${line}</div>`;
                        out.scrollTop = out.scrollHeight;
                    }, 80);
                }
                break;

            case 'ping':
                if(args.length === 0) {
                    out.innerHTML += `\nbash: ping: podaj adres (np. ping wp.pl)`;
                } else {
                    const host = desktop.escapeHTML(args[0]);
                    out.innerHTML += `\nPING ${host} (192.168.1.${Math.floor(Math.random()*255)}): 56 data bytes`;
                    let count = 0;
                    const pingInt = setInterval(() => {
                        count++;
                        const time = (Math.random() * 20 + 5).toFixed(1);
                        out.innerHTML += `\n64 bytes from ${host}: icmp_seq=${count} ttl=119 time=${time} ms`;
                        out.scrollTop = out.scrollHeight;
                        if(count >= 4) {
                            clearInterval(pingInt);
                            out.innerHTML += `\n--- ${host} ping statistics ---\n4 packets transmitted, 4 packets received, 0.0% packet loss`;
                            out.scrollTop = out.scrollHeight;
                        }
                    }, 800);
                }
                break;

            case 'open':
                if (args.length === 0) {
                    out.innerHTML += `\nbash: open: podaj adres URL (np. open google.com)`;
                } else {
                    let url = args[0];
                    if (!url.startsWith('http')) url = 'https://' + url;
                    out.innerHTML += `\nOtwieranie ${desktop.escapeHTML(url)} w przeglądarce Sieciosław...`;
                    
                    if (typeof winManager !== 'undefined') {
                        const urlInput = document.getElementById('s-url-input');
                        if(urlInput) {
                            urlInput.value = url;
                            if(typeof siecioslawApp !== 'undefined') siecioslawApp.navigateFromBar();
                        }
                        winManager.open('siecioslaw');
                    }
                }
                break;

            case 'pogoda':
                if (args.length === 0) {
                    out.innerHTML += `\nbash: pogoda: podaj nazwę miasta (np. pogoda Warszawa)`;
                } else {
                    const city = args.join(' ');
                    out.innerHTML += `\nPobieranie danych meteorologicznych dla: ${desktop.escapeHTML(city)}...`;
                    
                    fetch(`https://wttr.in/${encodeURIComponent(city)}?format=4&lang=pl`)
                        .then(res => res.text())
                        .then(text => {
                            let resultText = text;
                            if (resultText.includes('<html')) {
                                const parser = new DOMParser();
                                const doc = parser.parseFromString(resultText, 'text/html');
                                resultText = doc.body.textContent || '';
                            }
                            resultText = resultText.trim();
                            out.innerHTML += `\n🌦️ ${desktop.escapeHTML(resultText)}`;
                            out.scrollTop = out.scrollHeight;
                        })
                        .catch(err => {
                            out.innerHTML += `\n[BŁĄD] Nie można nawiązać połączenia z serwerem pogodowym.`;
                            out.scrollTop = out.scrollHeight;
                        });
                }
                break;
                
            default:
                const fullItemName = [cmd, ...args].join(' ').toLowerCase();
                let fileToOpen = null;
                
                if (typeof fileSystem !== 'undefined') {
                    fileToOpen = fileSystem.find(i => i.type === 'file' && i.parentId === wladcaApp.currentPath && i.name.toLowerCase() === fullItemName);
                }

                if (fileToOpen) {
                    out.innerHTML += `\nOtwieranie pliku: ${desktop.escapeHTML(fileToOpen.name)}...`;
                    if (fileToOpen.name.endsWith('.csv') && typeof tabelarzApp !== 'undefined') {
                        tabelarzApp.openFromFS(fileToOpen);
                    } else if (fileToOpen.name.endsWith('.zip') && typeof kompresorApp !== 'undefined') {
                        kompresorApp.openWithItem(fileToOpen.id);
                    } else if (fileToOpen.name.endsWith('.wasm') && typeof wasmEngineApp !== 'undefined') {
                        wasmEngineApp.open(fileToOpen);
                    } else if (typeof skrybaApp !== 'undefined') {
                        skrybaApp.open(fileToOpen);
                    } else {
                        out.innerHTML += `\nBłąd: Brak przypisanego programu do otwarcia tego pliku.`;
                    }
                    break;
                }

                // INTELIGENTNE ALIASY DLA APLIKACJI
                let appIdTarget = null;
                let appNameDisplay = fullItemName;

                if (fullItemName === 'rachmistrz kodu' || fullItemName === 'kod' || fullItemName === 'rachmistrz-kodu') {
                    appIdTarget = 'rachmistrz-kodu';
                    appNameDisplay = 'Rachmistrz Kodu';
                } else if (fullItemName === 'upychacz' || fullItemName === 'upychacz zip' || fullItemName === 'zip' || fullItemName === 'kompresor') {
                    appIdTarget = 'kompresor';
                    appNameDisplay = 'Upychacz ZIP';
                } else if (fullItemName === 'kasiarz') {
                    appIdTarget = 'kasiarz';
                    appNameDisplay = 'Kasiarz';
                } else if (fullItemName === 'przelicznik') {
                    appIdTarget = 'przelicznik';
                    appNameDisplay = 'Przelicznik';
                } else if (fullItemName === 'tablica' || fullItemName === 'tabelarz') {
                    appIdTarget = 'tabelarz';
                    appNameDisplay = 'Tabelarz';
                }

                if (appIdTarget) {
                    out.innerHTML += `\nUruchamianie: ${desktop.escapeHTML(appNameDisplay)}...`;
                    if (typeof winManager !== 'undefined') winManager.open(appIdTarget);
                    break;
                }

                const appName = cmd.endsWith('.exe') ? cmd.slice(0, -4) : cmd;
                const appItem = typeof fileSystem !== 'undefined' ? fileSystem.find(i => i.type === 'app' && (i.name.toLowerCase() === appName || i.appId.toLowerCase() === appName)) : null;
                
                if (appItem) {
                    out.innerHTML += `\nUruchamianie: ${desktop.escapeHTML(appItem.name)}...`;
                    if (typeof winManager !== 'undefined') {
                        winManager.open(appItem.appId);
                    }
                } else {
                    out.innerHTML += `\nbash: ${desktop.escapeHTML(cmd)}: nieznane polecenie lub brak pliku`;
                }
        }
    }
};

setTimeout(wladcaApp.init, 500);