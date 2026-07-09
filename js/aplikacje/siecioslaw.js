// ======================================================================
// PLIK: js/aplikacje/siecioslaw.js (Przeglądarka Internetowa)
// ======================================================================

const siecioslawApp = {
    navigate: () => { 
        const frame = document.getElementById('browser-frame');
        const input = document.getElementById('url-input');
        if(frame && input) {
            let url = input.value.trim();
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            frame.src = url;
            input.value = url;
        }
    }
};

setTimeout(() => {
    if(typeof apps !== 'undefined') {
        apps.navigate = siecioslawApp.navigate;
    }
}, 100);