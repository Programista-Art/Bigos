     
        const grajaczApp = {
            playUrl: () => {
                const url = document.getElementById('grajacz-url').value; const vid = document.getElementById('grajacz-video'); const yt = document.getElementById('grajacz-yt'); const ph = document.getElementById('grajacz-placeholder');
                if(!url) return apps.showToast('Grajacz', 'Podaj link do filmu!', 'error');
                ph.classList.add('hidden');
                if(url.includes('youtube.com') || url.includes('youtu.be')) {
                    let ytId = ''; if(url.includes('v=')) ytId = url.split('v=')[1].split('&')[0]; else if(url.includes('youtu.be/')) ytId = url.split('youtu.be/')[1].split('?')[0];
                    if(ytId) { vid.classList.add('hidden'); vid.pause(); vid.src = ''; yt.classList.remove('hidden'); yt.src = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1`; apps.showToast('Grajacz', 'Odtwarzanie YT.', 'info'); }
                } else { yt.classList.add('hidden'); yt.src = ''; vid.classList.remove('hidden'); vid.src = url; vid.play(); }
            },
            loadPC: (e) => { const file = e.target.files[0]; if(file) { const url = URL.createObjectURL(file); document.getElementById('grajacz-url').value = url; grajaczApp.playUrl(); } e.target.value = ''; },
            stop: () => { const vid = document.getElementById('grajacz-video'); const yt = document.getElementById('grajacz-yt'); const ph = document.getElementById('grajacz-placeholder'); vid.pause(); vid.src = ''; yt.src = ''; vid.classList.add('hidden'); yt.classList.add('hidden'); ph.classList.remove('hidden'); document.getElementById('grajacz-url').value = ''; }
        };