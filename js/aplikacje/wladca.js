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
                // Wklej w miejscu kursora
                const start = input.selectionStart;
                const end = input.selectionEnd;
                input.value = input.value.substring(0, start) + text + input.value.substring(end);
                input.selectionStart = input.selectionEnd = start + text.length;
                input.focus();
            }
        } catch (err) {
            // Niektóre przeglądarki ze względów bezpieczeństwa blokują czytanie schowka z kodu JS
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
                    'help', 'date', 'cls', 'clear', 'ver', 'dir', 'ls', 'cd', 'echo', 'whoami', 
                    'mkdir', 'touch', 'rm', 'theme', 'reboot', 'restart', 'format', 'sysinfo', 'lock', 'calc', 'matrix', 'pogoda',
                    'history', 'pwd', 'tree', 'ping', 'open', 'base64', 'timer', 'roll', 'color', 'cytat'
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
                if (isCommandMode) {
                    input.value = matches[0] + ' ';
                } else {
                    const cmd = cmdLine.substring(0, firstSpaceIndex);
                    input.value = cmd + ' ' + matches[0];
                }
            } else if (matches.length > 1) {
                let pathDisplay = '~';
                if (wladcaApp.currentPath !== 'root' && typeof fileSystem !== 'undefined') {
                    const f = fileSystem.find(i => i.id === wladcaApp.currentPath);
                    if (f) pathDisplay = `~/${f.name}`;
                }
                out.innerHTML += `\n<span class="text-blue-400">root@bigos:${pathDisplay}#</span> ${desktop.escapeHTML(cmdLine)}\n`;
                out.innerHTML += matches.join('   ');
                out.scrollTop = out.scrollHeight;
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

            out.innerHTML += `\n<span class="text-blue-400">root@bigos:${pathDisplay}#</span> ${desktop.escapeHTML(cmdLine)}`;
            
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
                out.innerHTML += `
Dostępne komendy:
  <span class="text-yellow-400">help</span>            - Wyświetla tę listę
  <span class="text-yellow-400">history</span>         - Wyświetla historię poleceń
  <span class="text-yellow-400">date</span>            - Wyświetla aktualną datę i czas
  <span class="text-yellow-400">sysinfo</span>         - Wyświetla informacje o sprzęcie
  <span class="text-yellow-400">cls / clear</span>     - Czyści ekran terminala
  <span class="text-yellow-400">ver</span>             - Wersja systemu BigOS
  <span class="text-yellow-400">dir / ls</span>        - Wyświetla pliki i foldery
  <span class="text-yellow-400">tree</span>            - Wyświetla drzewo obecnego katalogu
  <span class="text-yellow-400">pwd</span>             - Zwraca obecną ścieżkę
  <span class="text-yellow-400">cd [nazwa]</span>      - Zmiana katalogu (np. cd hasiok)
  <span class="text-yellow-400">echo</span>            - Wypisuje tekst na ekranie
  <span class="text-yellow-400">whoami</span>          - Wyświetla obecnego użytkownika
  <span class="text-yellow-400">mkdir [n]</span>       - Tworzy nowy folder
  <span class="text-yellow-400">touch [n]</span>       - Tworzy nowy, pusty plik
  <span class="text-yellow-400">rm [n]</span>          - Usuwa plik lub folder
  <span class="text-yellow-400">theme [motyw]</span>   - Zmienia motyw ('dark' lub 'light')
  <span class="text-yellow-400">color [kolor]</span>   - Zmienia kolor tekstu (np. color red)
  <span class="text-yellow-400">reboot/restart</span>  - Uruchamia ponownie system
  <span class="text-yellow-400">format</span>          - Przywraca ustawienia fabryczne
  <span class="text-yellow-400">lock</span>            - Blokuje ekran
  <span class="text-yellow-400">calc [wzór]</span>     - Kalkulator (np. calc 5*5)
  <span class="text-yellow-400">base64 [tryb]</span>   - base64 enc/dec [tekst]
  <span class="text-yellow-400">timer [sek]</span>     - Uruchamia odliczanie
  <span class="text-yellow-400">roll [n]</span>        - Rzuca wirtualną kością (1-n)
  <span class="text-yellow-400">cytat</span>           - Losuje motywujący cytat
  <span class="text-yellow-400">matrix</span>          - Efekt The Matrix
  <span class="text-yellow-400">pogoda [miasto]</span> - Pogoda dla zadanego miasta
  <span class="text-yellow-400">ping [adres]</span>    - Symuluje wysyłanie pakietów PING
  <span class="text-yellow-400">open [url]</span>      - Otwiera adres w Sieciosławiu
  <span class="text-yellow-400">[nazwa]</span>         - Otwiera plik lub aplikację`;
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
                
                out.innerHTML += `\n--- INFORMACJE O SYSTEMIE ---`;
                out.innerHTML += `\nSystem: BigOS Wersja 1.5`;
                out.innerHTML += `\nUżytkownik: root`;
                out.innerHTML += `\nRozdzielczość ekranu: ${window.innerWidth}x${window.innerHeight} px`;
                out.innerHTML += `\nSilnik przeglądarki: ${browserInfo}`;
                out.innerHTML += `\nZajęte miejsce na wirtualnym dysku: ${kbMemory} KB`;
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
                            if(i.type === 'folder') return `<span class="text-blue-400 font-bold">${i.name}/</span>`;
                            if(i.type === 'app') return `<span class="text-green-400 font-bold">${i.name}.exe</span>`;
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
                            let colorClass = 'text-gray-300';
                            if(item.type === 'folder') colorClass = 'text-blue-400 font-bold';
                            else if(item.type === 'app') colorClass = 'text-green-400 font-bold';
                            
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
                "Programista nie popełnia błędów. Tworzy nowe wyzwania dla debuggera.",
                "Najlepszy kod to ten, którego nie trzeba poprawiać... szkoda, że taki nie istnieje.",
                "Kawa jest paliwem, a kod skutkiem ubocznym.",
                "Jeśli działa za pierwszym razem, to znaczy, że coś przeoczyłeś.",
                "Programista zna odpowiedź. Tylko jeszcze nie zna pytania.",
                "Każdy bug ma swoje prawa obywatelskie.",
                "Debugowanie to detektywistyczna praca, w której sam jesteś przestępcą.",
                "Najgroźniejsze słowa w IT: 'To tylko mała zmiana'.",
                "Komputer robi dokładnie to, co mu każesz, a nie to, co masz na myśli.",
                "Najlepszy komentarz w kodzie to ten, którego nie trzeba pisać.",
                "Dobry programista rozwiązuje problemy. Świetny sprawia, że ich nie ma.",
                "Nie dotykaj działającego kodu. Nigdy.",
                "Każdy program jest prosty... dopóki nie trzeba go utrzymywać.",
                "Programista śpi spokojnie, dopóki produkcja nie zadzwoni o 3 nad ranem.",
                "To nie komputer jest wolny. To kod jest ambitny.",
                "Jedna linijka kodu potrafi zepsuć cały dzień.",
                "Programowanie uczy cierpliwości. Głównie do samego siebie.",
                "Najlepszym przyjacielem programisty jest Ctrl+Z.",
                "Backup jest jak spadochron. Lepiej go mieć.",
                "Jeśli kod wygląda idealnie, prawdopodobnie jeszcze go nie uruchomiłeś.",
                "Programista nie zgaduje. On testuje hipotezy.",
                "Każdy projekt zaczyna się od 'to zajmie godzinę'.",
                "Nie ma rzeczy niemożliwych. Są tylko źle nazwane zmienne.",
                "Komentarze w kodzie są jak notatki dla przyszłego siebie.",
                "Programowanie to sztuka zamieniania kawy w błędy.",
                "Bug znaleziony przez klienta jest zawsze najbardziej kreatywny.",
                "Najkrótsza droga do rozwiązania prowadzi przez Stack Overflow.",
                "Najpierw działało. Potem poprawiłem.",
                "Kompilator jest najlepszym nauczycielem pokory.",
                "Programista wierzy w cuda. Inaczej nie nacisnąłby 'Uruchom'.",
                "Nie ma nic bardziej trwałego niż tymczasowe rozwiązanie.",
                "Dobry kod jest jak dowcip – nie trzeba go tłumaczyć.",
                "Największy wróg projektu to zdanie: 'Mam jeszcze jeden pomysł'.",
                "Programowanie to jedyny zawód, w którym usuwanie kodu oznacza postęp.",
                "Każdy bug był kiedyś czyimś pomysłem.",
                "Najpierw piszesz kod. Potem kod pisze ciebie.",
                "Jeśli komputer milczy, to znaczy, że szykuje niespodziankę.",
                "Programista nigdy się nie nudzi. Zawsze znajdzie nowy błąd.",
                "Nie licz godzin spędzonych na debugowaniu. One same cię policzą.",
                "Najbardziej podejrzany kod to ten, który działa.",
                "Optymalizacja zaczyna się pięć minut przed terminem.",
                "Najłatwiej znaleźć błąd zaraz po wysłaniu programu klientowi.",
                "Programista zna tysiąc sposobów na zepsucie jednej funkcji.",
                "Najdroższy kod to ten napisany w pośpiechu.",
                "Każda poprawka ma ukryty koszt.",
                "Programowanie przypomina układanie puzzli, tylko ktoś ciągle zmienia obrazek.",
                "Nie ma lepszego testera niż użytkownik z piątkowego wieczoru.",
                "Jeżeli czegoś nie da się zepsuć, użytkownik znajdzie sposób.",
                "Programista nie walczy z komputerem. Prowadzi z nim długie negocjacje.",
                "Największym sukcesem programisty jest dzień bez komunikatu 'Unexpected Error'."
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
                        out.innerHTML += `<div class="text-green-500 opacity-80" style="font-size: 0.75rem;">${line}</div>`;
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
                        const urlInput = document.getElementById('url-input');
                        if(urlInput) {
                            urlInput.value = url;
                            if(typeof apps !== 'undefined') apps.navigate();
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
                    } else if (typeof skrybaApp !== 'undefined') {
                        skrybaApp.open(fileToOpen);
                    } else {
                        out.innerHTML += `\nBłąd: Brak przypisanego programu do otwarcia tego pliku.`;
                    }
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

// Automatyczne załadowanie konfiguracji po wczytaniu pliku
setTimeout(wladcaApp.init, 500);