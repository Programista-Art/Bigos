// (Zarządzanie modalami i interfejsem wspólnym)
const ui = {
    promptCallback: null,
    showPrompt: (title, defaultValue, btnText, callback) => {
        document.getElementById('system-prompt-title').innerText = title;
        document.getElementById('system-prompt-input').value = defaultValue;
        document.getElementById('system-prompt-btn').innerText = btnText;
        ui.promptCallback = callback;
        document.getElementById('system-prompt-modal').classList.remove('hidden');
        setTimeout(() => { document.getElementById('system-prompt-input').focus(); document.getElementById('system-prompt-input').select(); }, 50);
    },
    closePrompt: () => {
        document.getElementById('system-prompt-modal').classList.add('hidden');
        ui.promptCallback = null;
    },
    confirmPrompt: () => {
        const val = document.getElementById('system-prompt-input').value;
        if(ui.promptCallback) ui.promptCallback(val);
        ui.closePrompt();
    }
};