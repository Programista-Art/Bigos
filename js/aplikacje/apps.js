// ======================================================================
// PLIK: js/apps.js (Logika wbudowanych Aplikacji, Szuflady, Tapet)
// ======================================================================

let calOffset = 0; 

const apps = {
    // 1. ZARZĄDZANIE TAPETAMI (KOMBINATOR)
    defaultWallpapers: [
        { name: 'BigOS', url: 'tapety/bigos.jpg' },
        { name: 'Natura', url: 'tapety/natura.jpg' },
        { name: 'Kosmos', url: 'tapety/kosmos.jpg' },
        { name: 'Abstrakcja', url: 'tapety/abstrakcja.jpg' }
    ],
    renderWallpaperGallery: () => {
        const gallery = document.getElementById('wallpaper-gallery');
        if(!gallery) return;
        gallery.innerHTML = '';
        const customWp = JSON.parse(localStorage.getItem('bigos_custom_wp') || '[]');
        const allWp = [...apps.defaultWallpapers, ...customWp];
        allWp.forEach((wp, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'relative group';
            
            const img = document.createElement('img');
            img.src = wp.url; 
            img.alt = wp.name; 
            img.title = wp.name;
            img.onerror = function() { 
                this.onerror = null; 
                this.src = 'tapety/bigos.jpg'; // Ochrona przed brakującym plikiem
            };
            img.className = 'cursor-pointer border-2 border-gray-300 dark:border-gray-600 hover:border-purple-500 wp-thumbnail w-full h-20 object-cover rounded shadow bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500';
            img.onclick = () => apps.setWallpaperUrl(wp.url);
            
            imgContainer.appendChild(img);
            
            if (index >= apps.defaultWallpapers.length) {
                const delBtn = document.createElement('button'); 
                delBtn.innerHTML = '✖'; 
                delBtn.className = 'absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition';
                delBtn.onclick = (e) => { 
                    e.stopPropagation(); 
                    customWp.splice(index - apps.defaultWallpapers.length, 1); 
                    localStorage.setItem('bigos_custom_wp', JSON.stringify(customWp)); 
                    apps.renderWallpaperGallery(); 
                };
                imgContainer.appendChild(delBtn);
            }
            gallery.appendChild(imgContainer);
        });
    },
    setWallpaperUrl: (customUrl) => { 
        const u = customUrl || document.getElementById('wallpaper-url').value; 
        const target = document.getElementById('wallpaper-target').value;
        if(u){ 
            if(target === 'desktop') {
                document.getElementById('desktop-bg').style.backgroundImage=`url('${u}')`; 
                document.getElementById('desktop-bg').classList.add('custom-wp'); 
                localStorage.setItem('bigos_bg',u); 
            } else {
                document.getElementById('login-screen').style.backgroundImage=`url('${u}')`; 
                localStorage.setItem('bigos_login_bg',u); 
            }
            apps.showToast('Kombinator','Ustawiono nową tapetę!','success');
        } 
    },
// ZAKTUALIZOWANA FUNKCJA - Kompresuje zdjęcia przed zapisem!
    setWallpaperFile: (e) => { 
        const f = e.target.files[0]; 
        if(!f) return; 
        const target = document.getElementById('wallpaper-target').value;
        
        const r = new FileReader(); 
        r.onload = (ev) => { 
            const res = ev.target.result;
            
            // Kompresja obrazka przy użyciu wbudowanego Canvas
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                let width = img.width;
                let height = img.height;
                const maxWidth = 1920;
                const maxHeight = 1080;
                
                // Zmniejszamy obraz, jeśli przekracza Full HD (1080p)
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = width * ratio;
                    height = height * ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Zapis jako zoptymalizowany plik JPEG (80% jakości) - drastycznie zmniejsza wagę pliku!
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                
                try {
                    if(target === 'desktop') {
                        document.getElementById('desktop-bg').style.backgroundImage=`url('${compressedDataUrl}')`; 
                        document.getElementById('desktop-bg').classList.add('custom-wp'); 
                        localStorage.setItem('bigos_bg', compressedDataUrl); 
                    } else {
                        document.getElementById('login-screen').style.backgroundImage=`url('${compressedDataUrl}')`; 
                        localStorage.setItem('bigos_login_bg', compressedDataUrl); 
                    }
                    
                    const customWp = JSON.parse(localStorage.getItem('bigos_custom_wp') || '[]');
                    if(!customWp.find(w => w.name === f.name)) {
                        customWp.push({ name: f.name, url: compressedDataUrl });
                        localStorage.setItem('bigos_custom_wp', JSON.stringify(customWp));
                    }
                    apps.renderWallpaperGallery();
                    apps.showToast('Kombinator','Wgrano i zoptymalizowano tapetę lokalną!','success');
                } catch(error) {
                    apps.showToast('Błąd Pamięci','Zdjęcie nadal jest zbyt gigantyczne by je zapisać!','error');
                }
            };
            img.src = res;
        }; 
        r.readAsDataURL(f); 
        e.target.value = '';
    },

    
    resetWallpaper: () => { 
        const defaultBg = apps.defaultWallpapers[0].url; 
        const target = document.getElementById('wallpaper-target').value;
        if(target === 'desktop') {
            document.getElementById('desktop-bg').style.backgroundImage = `url('${defaultBg}')`; 
            document.getElementById('desktop-bg').classList.add('custom-wp'); 
            localStorage.setItem('bigos_bg', defaultBg); 
        } else {
            document.getElementById('login-screen').style.backgroundImage = `url('${defaultBg}')`; 
            localStorage.setItem('bigos_login_bg', defaultBg); 
        }
        apps.showToast('Kombinator', 'Przywrócono tapetę domyślną', 'info'); 
    },

    // 2. FUNKCJE SYSTEMOWE I MOTYWY
    setTheme: (theme) => { currentTheme = theme; localStorage.setItem('bigos_theme', theme); document.getElementById('system-theme-select').value = theme; if(theme === 'dark') document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark'); },
    showToast: (t, m, type = 'info') => { const c = document.getElementById('toast-container'); const el = document.createElement('div'); const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600' }; el.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-xl transform transition-all translate-y-10 opacity-0 pointer-events-auto border border-white/20 z-[9999]`; el.innerHTML = `<strong>${t}</strong><br><span class="text-sm">${m}</span>`; c.appendChild(el); requestAnimationFrame(() => el.classList.remove('translate-y-10', 'opacity-0')); setTimeout(() => { el.classList.add('opacity-0'); setTimeout(() => el.remove(), 300); }, 3000); },
    toggleStartMenu: () => { document.getElementById('start-menu').classList.toggle('hidden'); document.getElementById('start-menu').classList.toggle('flex'); document.getElementById('calendar-widget').classList.add('hidden-cal'); },
    formatSystem: () => { ui.showPrompt("POTWIERDŹ", "Wpisz 'RESET' aby formatować system", "Formatuj", (val) => { if(val === 'RESET') { localStorage.clear(); location.reload(); } }); },
    lockSystem: () => { document.getElementById('start-menu').classList.add('hidden'); document.getElementById('login-screen').style.display = 'flex'; document.getElementById('login-screen').style.opacity = '1'; document.getElementById('password-input').value = ''; document.getElementById('login-msg').innerText = "System Zablokowany. Podaj hasło."; },
    sleepSystem: () => { document.getElementById('start-menu').classList.add('hidden'); const screen = document.getElementById('sleep-screen'); screen.classList.remove('hidden'); const wake = () => { screen.classList.add('hidden'); document.removeEventListener('mousemove', wake); document.removeEventListener('keydown', wake); document.removeEventListener('touchstart', wake); }; setTimeout(() => { document.addEventListener('mousemove', wake); document.addEventListener('keydown', wake); document.addEventListener('touchstart', wake); }, 1000); },
    shutdownSystem: () => { document.body.innerHTML = `<div class="w-full h-full bg-black flex flex-col items-center justify-center text-white"><button onclick="location.reload()" class="w-24 h-24 rounded-full border-4 border-gray-600 text-gray-600 hover:text-white hover:border-white transition flex items-center justify-center text-4xl mb-4" title="Włącz BigOS">⏻</button><p class="text-gray-500 font-mono">System BigOS wyłączony.</p></div>`; },
    
    // 3. KALENDARZ I KARTECZKI
    toggleCalendar: (e) => { if(e)e.stopPropagation(); calOffset = 0; apps.generateCalendar(); document.getElementById('calendar-widget').classList.toggle('hidden-cal'); document.getElementById('start-menu').classList.add('hidden'); },
    changeCalendarMonth: (dir) => { calOffset += dir; apps.generateCalendar(); },
    generateCalendar: () => {
        const c = document.getElementById('cal-days'); const t = document.getElementById('cal-month-year'); const targetDate = new Date(); targetDate.setMonth(targetDate.getMonth() + calOffset); const now = new Date(); const mPl = ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"]; t.innerText = `${mPl[targetDate.getMonth()]} ${targetDate.getFullYear()}`; const first = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).getDay(); const days = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate(); let start = first === 0 ? 6 : first - 1; c.innerHTML = ''; for(let i=0; i<start; i++) c.innerHTML += `<div></div>`;
        for(let i=1; i<=days; i++) { const isToday = (i === now.getDate() && targetDate.getMonth() === now.getMonth() && targetDate.getFullYear() === now.getFullYear()); c.innerHTML += `<div class="${isToday?'bg-blue-600 text-white rounded-full shadow-md':'hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer rounded-full transition text-gray-800 dark:text-gray-300'} w-7 h-7 flex items-center justify-center mx-auto">${i}</div>`; }
    },
    createStickyNote: (id='n_'+Date.now(), text='', x=100, y=100) => { const c = document.getElementById('sticky-notes-container'); const n = document.createElement('div'); n.id=id; n.className='sticky-note pointer-events-auto rounded p-2'; n.style.left=x+'px'; n.style.top=y+'px'; n.innerHTML = `<div class="flex justify-between items-center mb-1 cursor-move" onmousedown="desktop.activeDrag={el:this.parentElement,type:'sticky',id:'${id}',oX:event.clientX-this.parentElement.getBoundingClientRect().left,oY:event.clientY-this.parentElement.getBoundingClientRect().top};winManager.bringToFront(this.parentElement)" ontouchstart="const p=getEventPos(event); desktop.activeDrag={el:this.parentElement,type:'sticky',id:'${id}',oX:p.x-this.parentElement.getBoundingClientRect().left,oY:p.y-this.parentElement.getBoundingClientRect().top};winManager.bringToFront(this.parentElement)"><span class="text-xs font-bold text-yellow-800">📌</span><button onclick="this.parentElement.parentElement.remove();apps.saveStickyNotes()" class="text-red-700 font-bold">✖</button></div><div contenteditable="true" class="flex-grow outline-none text-sm text-yellow-900" oninput="apps.saveStickyNotes()">${text}</div>`; c.appendChild(n); apps.saveStickyNotes(); },
    saveStickyNotes: () => { const ns=[]; document.querySelectorAll('.sticky-note').forEach(el=>{ ns.push({id:el.id, x:parseInt(el.style.left), y:parseInt(el.style.top), t:el.querySelector('div[contenteditable]').innerHTML});}); localStorage.setItem('bigos_stickies',JSON.stringify(ns)); },
    loadStickyNotes: () => { const s = localStorage.getItem('bigos_stickies'); if(s) JSON.parse(s).forEach(n=>apps.createStickyNote(n.id, n.t, n.x, n.y)); },
    
    // 4. SIECIOSŁAW I WŁADCA POLECEŃ
    navigate: () => { document.getElementById('browser-frame').src = document.getElementById('url-input').value; },
    terminalHandle: (e) => {
        if(e.key === 'Enter') {
            const input = document.getElementById('term-in'); const out = document.getElementById('terminal-out'); const cmd = input.value.trim();
            out.innerHTML += `\n<span class="text-blue-400">root@bigos:~#</span> ${desktop.escapeHTML(cmd)}`;
            if(cmd.toLowerCase() === 'pomoc') out.innerHTML += `\nKomendy: pomoc, data, wyczysc, wersja`; else if(cmd.toLowerCase() === 'data') out.innerHTML += `\n` + new Date().toString(); else if(cmd.toLowerCase() === 'wyczysc') out.innerHTML = 'Witaj we Władcy Poleceń!'; else if(cmd.toLowerCase() === 'wersja') out.innerHTML += `\nBigOS Wersja 1.21 Modularna`; else if(cmd !== '') out.innerHTML += `\nbash: ${desktop.escapeHTML(cmd)}: nieznane polecenie`;
            input.value = ''; out.scrollTop = out.scrollHeight;
        }
    },

    // 5. GRAJEK (ODTWARZACZ)
    grajekAudio: new Audio(), grajekIntv: null, grajkoteka: [], currentGrajekIndex: -1,
    loadGrajkoteka: () => { const saved = localStorage.getItem('bigos_grajkoteka'); if(saved) apps.grajkoteka = JSON.parse(saved); apps.renderGrajkoteka(); },
    saveGrajkoteka: () => { localStorage.setItem('bigos_grajkoteka', JSON.stringify(apps.grajkoteka)); apps.renderGrajkoteka(); },
    renderGrajkoteka: () => { const list = document.getElementById('grajkoteka-list'); list.innerHTML = ''; apps.grajkoteka.forEach((track, i) => { const isPlaying = i === apps.currentGrajekIndex; const el = document.createElement('div'); el.className = `grajkoteka-item p-2 border-b border-gray-200 dark:border-[#333] cursor-pointer flex justify-between items-center text-gray-800 dark:text-green-300 hover:bg-gray-100 dark:hover:bg-[#222] ${isPlaying ? 'bg-green-100 dark:bg-[#112211] font-bold text-green-700 dark:text-green-400 border-l-4 border-green-500' : ''}`; el.innerHTML = `<span class="truncate pr-2">${desktop.escapeHTML(track.name)}</span><button onclick="event.stopPropagation(); apps.grajkoteka.splice(${i}, 1); apps.saveGrajkoteka();" class="text-red-500 hover:text-red-400 font-bold">✖</button>`; el.onclick = () => { apps.playGrajkotekaTrack(i); }; list.appendChild(el); }); },
    grajkotekaAdd: () => { const url = document.getElementById('grajek-url').value; if(!url) return apps.showToast('Błąd', 'Wklej link w pole', 'error'); let name = 'Nieznany Utwór'; if(url.includes('youtube.com') || url.includes('youtu.be')) name = 'Wideo z YouTube'; else if(url.includes('.mp3') || url.includes('.wav')) name = 'Plik Audio z sieci'; ui.showPrompt("Nazwa piosenki (Grajkoteka):", name, "Dodaj", (customName) => { if(customName) { apps.grajkoteka.push({ name: customName, url: url }); apps.saveGrajkoteka(); apps.showToast('Sukces', 'Dodano do Grajkoteki!', 'success'); document.getElementById('grajek-url').value = ''; } }); },
    playGrajkotekaTrack: (index) => { if(index < 0 || index >= apps.grajkoteka.length) return; apps.currentGrajekIndex = index; document.getElementById('grajek-url').value = apps.grajkoteka[index].url; apps.renderGrajkoteka(); apps.grajekPlay(); },
    grajekNext: () => { if(apps.grajkoteka.length === 0) return; let nextIdx = apps.currentGrajekIndex + 1; if(nextIdx >= apps.grajkoteka.length) nextIdx = 0; apps.playGrajkotekaTrack(nextIdx); },
    grajekPrev: () => { if(apps.grajkoteka.length === 0) return; let prevIdx = apps.currentGrajekIndex - 1; if(prevIdx < 0) prevIdx = apps.grajkoteka.length - 1; apps.playGrajkotekaTrack(prevIdx); },
    grajekSeek: (val) => { if(apps.grajekAudio && apps.grajekAudio.duration) { apps.grajekAudio.currentTime = (val / 100) * apps.grajekAudio.duration; } },
    grajekPlay: () => { 
        const u=document.getElementById('grajek-url').value; 
        if(u.includes('youtube.com') || u.includes('youtu.be')) {
            let ytId = ''; if(u.includes('v=')) ytId = u.split('v=')[1].split('&')[0]; else if(u.includes('youtu.be/')) ytId = u.split('youtu.be/')[1].split('?')[0];
            if(ytId) { apps.grajekAudio.pause(); document.getElementById('grajek-yt-container').classList.remove('hidden'); document.getElementById('grajek-yt-container').innerHTML = `<iframe width="100%" height="200" src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`; apps.showToast('Grajek', 'Odtwarzanie z YouTube...', 'info'); document.getElementById('grajek-time').innerText = "YouTube"; document.getElementById('grajek-progress').value = 0; return; }
        }
        document.getElementById('grajek-yt-container').classList.add('hidden'); document.getElementById('grajek-yt-container').innerHTML = '';
        if(u && apps.grajekAudio.src!==u) apps.grajekAudio.src=u; 
        if(!apps.grajekAudio.src) return apps.showToast('Grajek', 'Wybierz piosenkę z listy', 'error');
        apps.grajekAudio.play(); clearInterval(apps.grajekIntv); apps.grajekIntv=setInterval(()=>{ const p=document.getElementById('grajek-progress'); if(apps.grajekAudio.duration){ p.value=(apps.grajekAudio.currentTime/apps.grajekAudio.duration)*100; document.getElementById('grajek-time').innerText=apps.grajekFmt(apps.grajekAudio.currentTime); } }, 1000); 
        apps.grajekAudio.onended = () => apps.grajekNext();
    },
    grajekPause: () => { apps.grajekAudio.pause(); },
    grajekStop: () => { apps.grajekAudio.pause(); apps.grajekAudio.currentTime=0; document.getElementById('grajek-progress').value=0; document.getElementById('grajek-time').innerText="00:00"; document.getElementById('grajek-yt-container').classList.add('hidden'); document.getElementById('grajek-yt-container').innerHTML = ''; },
    grajekLoadPC: (e) => { const files = e.target.files; if(files.length > 0) { for(let i=0; i<files.length; i++) { const file = files[i]; const url = URL.createObjectURL(file); apps.grajkoteka.push({ name: `${file.name}`, url: url }); } apps.saveGrajkoteka(); apps.showToast('Grajek', `Załadowano: ${files.length} plików`, 'success'); if(apps.currentGrajekIndex === -1) { apps.playGrajkotekaTrack(apps.grajkoteka.length - files.length); } } e.target.value = ''; },
    grajekFmt: (s) => { let m=Math.floor(s/60), sec=Math.floor(s%60); return (m<10?'0'+m:m)+':'+(sec<10?'0'+sec:sec); }
};