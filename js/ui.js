// ======================================================================
// PLIK: js/ui.js (Zarządzanie oknami modalnymi i powiadomieniami)
// ======================================================================

const ui = {
    promptCallback: null,
    showPrompt: (title, defaultValue, btnText, callback) => {
        // Zawsze tworzymy świeży modal, by na żywo wstrzyknąć aktualne klasy motywów
        let modal = document.getElementById('system-prompt-modal');
        if (modal) modal.remove();
        
        modal = document.createElement('div');
        modal.id = 'system-prompt-modal';
        modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm transition-opacity';
        
        modal.innerHTML = `
            <div class="g-panel p-6 rounded-2xl shadow-2xl max-w-sm w-[90%] border g-border transform scale-100 transition-transform">
                <h2 class="text-lg font-bold g-accent mb-4 drop-shadow-md" id="system-prompt-title">${title}</h2>
                <input type="text" id="system-prompt-input" value="${defaultValue}" class="w-full p-3 g-bg g-text border g-border rounded-lg outline-none focus:border-blue-500 font-medium mb-6 shadow-inner transition-colors">
                <div class="flex gap-3 justify-end">
                    <button onclick="ui.closePrompt()" class="px-5 py-2 g-bg g-text hover:bg-white/10 rounded-lg transition font-medium border g-border shadow-sm">Anuluj</button>
                    <button onclick="ui.confirmPrompt()" id="system-prompt-btn" class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-600/30 transition font-bold border border-blue-700">${btnText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        ui.promptCallback = callback;
        
        setTimeout(() => { 
            const inp = document.getElementById('system-prompt-input');
            if(inp) { inp.focus(); inp.select(); }
        }, 50);
        
        // Obsługa klawisza Enter
        const inp = document.getElementById('system-prompt-input');
        if (inp) inp.onkeydown = (e) => { if(e.key === 'Enter') ui.confirmPrompt(); };
    },
    closePrompt: () => {
        const modal = document.getElementById('system-prompt-modal');
        if (modal) modal.remove();
        ui.promptCallback = null;
    },
    confirmPrompt: () => {
        const inp = document.getElementById('system-prompt-input');
        const val = inp ? inp.value : '';
        if(ui.promptCallback) ui.promptCallback(val);
        ui.closePrompt();
    }
};