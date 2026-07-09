// ======================================================================
// PLIK: js/paint.js (Szkicownik - Zaawansowany edytor grafiki w stylu Paint.net)
// ======================================================================

let paintLayers = []; 
let paintCurrentLayerIndex = -1; 
let paintActiveTool = 'pencil'; 
let paintIsDrawing = false; 
let paintLastX = 0; 
let paintLastY = 0;

// PREVIEW LAYER (Do rysowania kształtów i linii na żywo)
let paintPreviewCanvas = null;
let paintPreviewCtx = null;

// SYSTEM HISTORII (Undo / Redo)
let paintHistory = [];
let paintHistoryStep = -1;
let isPaintInitialized = false;

// SYSTEM TEKSTOWY (Interaktywny)
window.paintTextActive = false;
window.paintTextElement = null;
window.paintTextCoords = { x: 0, y: 0 };

function initPaint() {
    if (isPaintInitialized) return;
    isPaintInitialized = true;
    
    const workspace = document.getElementById('paint-workspace');
    if(!workspace) {
        setTimeout(initPaint, 500); // Ponów próbę jeśli DOM się nie załadował
        return;
    }

    // 1. WSTRZYKIWANIE WIDOCZNEJ PALETY KOLORÓW
    const colorInput = document.getElementById('paint-color');
    if (colorInput && !document.getElementById('paint-swatches')) {
        const swatches = document.createElement('div');
        swatches.id = 'paint-swatches';
        swatches.className = 'flex gap-1 mr-3 flex-wrap items-center';
        const colors = [
            '#000000', '#4b5563', '#ef4444', '#f97316', '#eab308', 
            '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#ffffff'
        ];
        colors.forEach(c => {
            const btn = document.createElement('div');
            btn.className = 'w-5 h-5 rounded cursor-pointer border border-gray-300 dark:border-gray-600 shadow-sm hover:scale-125 transition-transform';
            btn.style.backgroundColor = c;
            btn.onclick = () => { 
                colorInput.value = c; 
                if(window.paintTextElement) window.paintUpdateTextPreview();
            };
            swatches.appendChild(btn);
        });
        colorInput.parentElement.insertBefore(swatches, colorInput);
        
        colorInput.addEventListener('input', () => {
            if(window.paintTextElement) window.paintUpdateTextPreview();
        });
    }

    // 2. WSTRZYKIWANIE PASKA OPCJI TEKSTOWYCH
    let textToolbar = document.getElementById('paint-text-toolbar');
    if (!textToolbar) {
        const workspaceContainer = document.getElementById('paint-workspace').closest('.flex-grow.flex');
        textToolbar = document.createElement('div');
        textToolbar.id = 'paint-text-toolbar';
        textToolbar.className = 'hidden w-full bg-gray-100 dark:bg-[#222] border-b border-gray-300 dark:border-[#444] p-2 flex gap-3 items-center text-sm z-30 shadow-sm transition-all';
        textToolbar.innerHTML = `
            <div class="flex items-center gap-1">
                <span class="text-xs text-gray-500 dark:text-gray-400 font-bold">Czcionka:</span>
                <select id="paint-text-font" class="p-1 rounded bg-white dark:bg-[#111] border border-gray-300 dark:border-[#555] text-gray-800 dark:text-white outline-none" onchange="window.paintUpdateTextPreview()">
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Comic Sans MS">Comic Sans</option>
                    <option value="Impact">Impact</option>
                </select>
            </div>
            <div class="flex items-center gap-1">
                <span class="text-xs text-gray-500 dark:text-gray-400 font-bold">Rozmiar:</span>
                <input type="number" id="paint-text-size" value="24" min="8" max="200" class="w-16 p-1 rounded bg-white dark:bg-[#111] border border-gray-300 dark:border-[#555] text-gray-800 dark:text-white outline-none" onchange="window.paintUpdateTextPreview()" oninput="window.paintUpdateTextPreview()">
            </div>
            <div class="flex gap-1 border-l border-gray-300 dark:border-[#555] pl-3">
                <button id="paint-text-bold" class="w-8 h-8 font-bold rounded bg-white dark:bg-[#111] text-gray-800 dark:text-white border border-gray-300 dark:border-[#555] hover:bg-gray-200 dark:hover:bg-[#333] transition" onclick="this.classList.toggle('bg-gray-300'); this.classList.toggle('dark:bg-[#444]'); this.classList.toggle('border-blue-500'); window.paintUpdateTextPreview()">B</button>
                <button id="paint-text-italic" class="w-8 h-8 italic rounded bg-white dark:bg-[#111] text-gray-800 dark:text-white border border-gray-300 dark:border-[#555] hover:bg-gray-200 dark:hover:bg-[#333] transition" onclick="this.classList.toggle('bg-gray-300'); this.classList.toggle('dark:bg-[#444]'); this.classList.toggle('border-blue-500'); window.paintUpdateTextPreview()">I</button>
                <button id="paint-text-underline" class="w-8 h-8 underline rounded bg-white dark:bg-[#111] text-gray-800 dark:text-white border border-gray-300 dark:border-[#555] hover:bg-gray-200 dark:hover:bg-[#333] transition" onclick="this.classList.toggle('bg-gray-300'); this.classList.toggle('dark:bg-[#444]'); this.classList.toggle('border-blue-500'); window.paintUpdateTextPreview()">U</button>
            </div>
            <span class="text-xs text-gray-400 ml-auto italic hidden sm:block">Kliknij w puste miejsce, by zatwierdzić wpisany tekst</span>
        `;
        workspaceContainer.parentElement.insertBefore(textToolbar, workspaceContainer);
    }

    // Tworzenie warstwy podglądu (Preview Canvas)
    paintPreviewCanvas = document.createElement('canvas');
    paintPreviewCanvas.id = 'paint-preview-layer';
    paintPreviewCanvas.className = 'absolute top-0 left-0 pointer-events-none z-[999]';
    workspace.appendChild(paintPreviewCanvas);

    // NOWOŚĆ: ZAAWANSOWANE POINTER EVENTS
    workspace.addEventListener('pointerdown', paintPointerDown); 
    workspace.addEventListener('pointermove', paintPointerMove); 
    window.addEventListener('pointerup', paintPointerUp);
    window.addEventListener('pointercancel', paintPointerUp);

    // Skróty klawiszowe
    window.addEventListener('keydown', (e) => {
        const appWin = document.getElementById('app-szkicownik');
        if (appWin && appWin.classList.contains('active')) {
            // Blokada Undo/Redo jeśli edytujemy tekst
            if (window.paintTextActive && document.activeElement === window.paintTextElement) return;
            
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); paintUndo(); }
            if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); paintRedo(); }
        }
    });

    if (paintLayers.length === 0) {
        setTimeout(showPaintNewModal, 200);
    }
}

function paintCloseFile() {
    window.paintFinishText(); // Zabezpieczenie przed zamknięciem niezatwierdzonego tekstu
    paintLayers.forEach(l => l.canvas.remove());
    paintLayers = [];
    paintHistory = [];
    paintHistoryStep = -1;
    paintCurrentLayerIndex = -1;
    if (paintPreviewCanvas && paintPreviewCtx) {
        paintPreviewCtx.clearRect(0, 0, paintPreviewCanvas.width, paintPreviewCanvas.height);
    }
    paintRenderLayersList();
    if(typeof apps !== 'undefined') apps.showToast('Szkicownik', 'Plik został zamknięty, a pamięć zwolniona.', 'info');
    showPaintNewModal(); 
}

function getActiveCanvas() { 
    if (paintCurrentLayerIndex < 0 || paintCurrentLayerIndex >= paintLayers.length) return null; 
    return paintLayers[paintCurrentLayerIndex].canvas; 
}

function getActiveCtx() { 
    const canvas = getActiveCanvas(); 
    if(!canvas) return null;
    try {
        return canvas.getContext('2d', { willReadFrequently: true, colorSpace: 'display-p3' });
    } catch(e) {
        return canvas.getContext('2d', { willReadFrequently: true });
    }
}

// ------------------------------------------------------------------
// ZARZĄDZANIE WARSTWAMI
// ------------------------------------------------------------------
function paintAddLayer() {
    window.paintFinishText();
    paintSaveHistoryState();
    
    const workspace = document.getElementById('paint-workspace'); 
    const canvas = document.createElement('canvas'); 
    canvas.width = workspace.clientWidth || 800; 
    canvas.height = workspace.clientHeight || 600; 
    canvas.className = 'absolute top-0 left-0 pointer-events-none';
    
    if (paintPreviewCanvas) {
        paintPreviewCanvas.width = canvas.width;
        paintPreviewCanvas.height = canvas.height;
        paintPreviewCtx = paintPreviewCanvas.getContext('2d');
    }
    
    if (paintLayers.length === 0) { 
        const ctx = canvas.getContext('2d'); 
        ctx.fillStyle = '#ffffff'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height); 
    }
    
    workspace.appendChild(canvas); 
    
    const layer = { 
        id: Date.now() + Math.random(), 
        canvas: canvas, 
        name: `Warstwa ${paintLayers.length + 1}`, 
        visible: true, 
        blendMode: 'normal',
        opacity: 100
    };
    
    paintLayers.unshift(layer); 
    paintCurrentLayerIndex = 0; 
    paintRenderLayersList(); 
    paintUpdateCanvasesStyle();
}

function paintDeleteLayer(index) { 
    window.paintFinishText();
    if (paintLayers.length <= 1) {
        if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Musisz zostawić przynajmniej jedną warstwę!', 'error');
        return;
    }
    paintSaveHistoryState();
    paintLayers[index].canvas.remove(); 
    paintLayers.splice(index, 1); 
    if (paintCurrentLayerIndex >= paintLayers.length) paintCurrentLayerIndex = Math.max(0, paintLayers.length - 1); 
    paintRenderLayersList();
    paintUpdateCanvasesStyle();
}

function paintToggleLayerVisibility(index) { 
    paintLayers[index].visible = !paintLayers[index].visible; 
    paintUpdateCanvasesStyle();
    paintRenderLayersList(); 
}

function paintSelectLayer(index) { 
    paintCurrentLayerIndex = index; 
    paintRenderLayersList(); 
}

function paintUpdateLayerBlendMode(index, mode) { 
    paintLayers[index].blendMode = mode; 
    paintUpdateCanvasesStyle(); 
}

function paintUpdateLayerOpacity(index, opacity) {
    paintLayers[index].opacity = opacity;
    paintUpdateCanvasesStyle();
}

function paintRenameLayer(index) {
    if(typeof ui !== 'undefined') {
        ui.showPrompt("Zmień nazwę warstwy:", paintLayers[index].name, "Zapisz", (newName) => {
            if(newName && newName.trim() !== '') {
                paintLayers[index].name = newName.trim();
                paintRenderLayersList();
            }
        });
    } else {
        let n = prompt("Zmień nazwę warstwy:", paintLayers[index].name);
        if(n) { paintLayers[index].name = n; paintRenderLayersList(); }
    }
}

function paintUpdateCanvasesStyle() { 
    for (let i = 0; i < paintLayers.length; i++) { 
        const layer = paintLayers[i];
        layer.canvas.style.zIndex = paintLayers.length - i; 
        layer.canvas.style.display = layer.visible ? 'block' : 'none';
        layer.canvas.style.opacity = layer.opacity / 100;
        layer.canvas.style.mixBlendMode = layer.blendMode; 
    } 
}

function paintRenderLayersList() {
    const list = document.getElementById('paint-layers-list'); 
    if (!list) return;
    list.innerHTML = '';
    
    paintLayers.forEach((layer, index) => {
        const isSelected = index === paintCurrentLayerIndex;
        
        const html = `
        <div class="flex flex-col p-2 border-b border-gray-200 dark:border-[#333] cursor-pointer ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50 border-l-4 border-blue-500' : 'hover:bg-gray-100 dark:hover:bg-[#333]'}" onclick="paintSelectLayer(${index})">
            <div class="flex items-center w-full">
                <button class="mr-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white w-6 flex-shrink-0" onclick="event.stopPropagation(); paintToggleLayerVisibility(${index})" title="Pokaż/Ukryj">
                    ${layer.visible ? '👁️' : '🕶️'}
                </button>
                <div class="flex-1 text-xs font-semibold truncate text-gray-800 dark:text-white select-none" ondblclick="event.stopPropagation(); paintRenameLayer(${index})" title="Kliknij dwukrotnie by zmienić nazwę">
                    ${typeof desktop !== 'undefined' ? desktop.escapeHTML(layer.name) : layer.name}
                </div>
                <button class="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-lg w-5 flex-shrink-0 font-bold" onclick="event.stopPropagation(); paintDeleteLayer(${index})" title="Usuń warstwę">&times;</button>
            </div>
            
            ${isSelected ? `
            <div class="flex items-center justify-between mt-2 gap-2" onclick="event.stopPropagation()">
                <select class="text-[10px] p-1 border bg-white dark:bg-[#222] text-gray-800 dark:text-white rounded border-gray-300 dark:border-[#444] flex-1 outline-none w-1/2" onchange="paintUpdateLayerBlendMode(${index}, this.value)" title="Tryb Mieszania">
                    <option value="normal" ${layer.blendMode === 'normal' ? 'selected' : ''}>Normalny</option>
                    <option value="multiply" ${layer.blendMode === 'multiply' ? 'selected' : ''}>Mnożenie</option>
                    <option value="screen" ${layer.blendMode === 'screen' ? 'selected' : ''}>Ekran</option>
                    <option value="overlay" ${layer.blendMode === 'overlay' ? 'selected' : ''}>Nakładka</option>
                    <option value="darken" ${layer.blendMode === 'darken' ? 'selected' : ''}>Ciemniej</option>
                    <option value="lighten" ${layer.blendMode === 'lighten' ? 'selected' : ''}>Jaśniej</option>
                    <option value="color-dodge" ${layer.blendMode === 'color-dodge' ? 'selected' : ''}>Rozjaśn.</option>
                    <option value="difference" ${layer.blendMode === 'difference' ? 'selected' : ''}>Różnica</option>
                </select>
                <div class="flex items-center gap-1 w-1/2" title="Krycie (Przezroczystość)">
                    <span class="text-[10px] text-gray-500">👻</span>
                    <input type="range" min="0" max="100" value="${layer.opacity}" class="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer" oninput="paintUpdateLayerOpacity(${index}, this.value)">
                </div>
            </div>
            ` : ''}
        </div>`;
        list.insertAdjacentHTML('beforeend', html);
    });
}

// ------------------------------------------------------------------
// NARZĘDZIA RYSOWANIA
// ------------------------------------------------------------------
function paintSelectTool(toolName) {
    if (paintActiveTool === 'text' && toolName !== 'text') {
        window.paintFinishText(); // Automatyczne zatwierdzenie tekstu po zmianie narzędzia!
    }

    paintActiveTool = toolName; 
    document.querySelectorAll('.paint-tool-btn').forEach(b => b.classList.remove('bg-gray-300', 'dark:bg-[#444]', 'ring-2', 'ring-blue-500')); 
    const btn = document.querySelector(`.paint-tool-btn[data-tool="${toolName}"]`); 
    if (btn) btn.classList.add('bg-gray-300', 'dark:bg-[#444]', 'ring-2', 'ring-blue-500');
    
    // Obsługa Paska Narzędzi Tekstowych
    const tt = document.getElementById('paint-text-toolbar');
    if (tt) {
        if (toolName === 'text') tt.classList.remove('hidden');
        else tt.classList.add('hidden');
    }

    const sizeInput = document.getElementById('paint-size'); 
    if(!sizeInput) return;
    
    if (toolName === 'pencil') { 
        sizeInput.value = 1; 
        document.getElementById('paint-size-label').textContent = '1px'; 
    } else if (sizeInput.value === '1' && (toolName === 'brush' || toolName === 'eraser')) { 
        sizeInput.value = 5; 
        document.getElementById('paint-size-label').textContent = '5px'; 
    }
}

function paintGetCanvasCoords(e) { 
    const workspace = document.getElementById('paint-workspace'); 
    const rect = workspace.getBoundingClientRect(); 
    let clientX = e.clientX, clientY = e.clientY;
    if(e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
    }
    return { 
        x: (clientX - rect.left) * (workspace.clientWidth / rect.width), 
        y: (clientY - rect.top) * (workspace.clientHeight / rect.height) 
    }; 
}

function getPressure(e) {
    if (e.pointerType === 'pen' && e.pressure !== undefined) {
        return e.pressure; 
    }
    return 1.0; 
}

function paintPointerDown(e) {
    if (paintLayers.length === 0) return;
    if (paintCurrentLayerIndex < 0 || !paintLayers[paintCurrentLayerIndex].visible) {
        if(typeof apps !== 'undefined') apps.showToast('Błąd', 'Zaznacz widoczną warstwę, aby na niej rysować!', 'error');
        return;
    }
    
    const coords = paintGetCanvasCoords(e); 
    paintLastX = coords.x; paintLastY = coords.y;

    // Zaawansowana obsługa Narzędzia Tekstowego
    if (paintActiveTool === 'text') {
        if (window.paintTextActive) {
            // Jeśli klikniemy obok pola tekstowego - zapisujemy tekst
            if (e.target.id === 'paint-text-input' || e.target.closest('#paint-text-toolbar')) return; 
            window.paintFinishText();
        } else {
            // Inicjacja nowego interaktywnego pola tekstowego
            window.paintTextCoords = { x: coords.x, y: coords.y };
            window.paintTextActive = true;
            
            const workspace = document.getElementById('paint-workspace');
            const input = document.createElement('div');
            input.id = 'paint-text-input';
            input.contentEditable = "true";
            
            input.style.position = 'absolute';
            input.style.left = `${coords.x}px`;
            input.style.top = `${coords.y}px`;
            input.style.minWidth = '50px';
            input.style.minHeight = '1em';
            input.style.outline = 'none';
            input.style.border = '1px dashed #666';
            input.style.padding = '0';
            input.style.margin = '0';
            input.style.background = 'transparent';
            input.style.lineHeight = '1.2';
            input.style.zIndex = '1000';
            input.style.whiteSpace = 'pre-wrap';
            
            workspace.appendChild(input);
            window.paintTextElement = input;
            
            window.paintUpdateTextPreview();
            setTimeout(() => input.focus(), 10);
        }
        return;
    }

    if (e.pointerType === 'touch' || e.pointerType === 'pen') e.preventDefault();
    document.getElementById('paint-workspace').setPointerCapture(e.pointerId);
    
    const color = document.getElementById('paint-color').value; 
    const baseSize = parseInt(document.getElementById('paint-size').value, 10);
    const pressure = getPressure(e);
    const size = Math.max(1, baseSize * pressure); 
    
    if (paintActiveTool === 'picker') {
        paintPickColor(Math.floor(coords.x), Math.floor(coords.y));
        return;
    }
    if (paintActiveTool === 'fill') { 
        paintSaveHistoryState();
        paintFloodFill(Math.floor(coords.x), Math.floor(coords.y), color); 
        return; 
    }
    
    paintIsDrawing = true; 
    paintSaveHistoryState();

    const ctx = getActiveCtx(); 
    
    if (paintActiveTool === 'pencil' || paintActiveTool === 'brush' || paintActiveTool === 'eraser') {
        ctx.beginPath(); 
        ctx.fillStyle = paintActiveTool === 'eraser' ? '#000000' : color;
        ctx.globalCompositeOperation = paintActiveTool === 'eraser' ? 'destination-out' : 'source-over';
        
        if (paintActiveTool === 'pencil') { 
            ctx.fillRect(Math.floor(coords.x), Math.floor(coords.y), size, size); 
        } else { 
            ctx.arc(coords.x, coords.y, size / 2, 0, Math.PI * 2); 
            ctx.fill(); 
        }
    }
}

function paintPointerMove(e) {
    if (!paintIsDrawing || paintActiveTool === 'text') return;
    if (e.pointerType === 'touch' || e.pointerType === 'pen') e.preventDefault();
    
    const coords = paintGetCanvasCoords(e); 
    const color = document.getElementById('paint-color').value; 
    const baseSize = parseInt(document.getElementById('paint-size').value, 10);
    const pressure = getPressure(e);
    const size = Math.max(1, baseSize * pressure); 
    
    if (paintActiveTool === 'pencil' || paintActiveTool === 'brush' || paintActiveTool === 'eraser') {
        const ctx = getActiveCtx();
        ctx.beginPath();
        if (paintActiveTool === 'eraser') { 
            ctx.globalCompositeOperation = 'destination-out'; 
            ctx.strokeStyle = '#000000'; 
        } else { 
            ctx.globalCompositeOperation = 'source-over'; 
            ctx.strokeStyle = color; 
        }
        
        ctx.lineWidth = size; 
        if (paintActiveTool === 'pencil') { 
            ctx.lineCap = 'square'; 
            ctx.lineJoin = 'miter'; 
            ctx.moveTo(Math.floor(paintLastX) + 0.5, Math.floor(paintLastY) + 0.5); 
            ctx.lineTo(Math.floor(coords.x) + 0.5, Math.floor(coords.y) + 0.5); 
        } else { 
            ctx.lineCap = 'round'; 
            ctx.lineJoin = 'round'; 
            ctx.moveTo(paintLastX, paintLastY); 
            ctx.lineTo(coords.x, coords.y); 
        }
        
        ctx.stroke(); 
        paintLastX = coords.x; 
        paintLastY = coords.y;
    } 
    else if (paintActiveTool === 'line' || paintActiveTool === 'rect' || paintActiveTool === 'gradient') {
        if (!paintPreviewCtx) paintPreviewCtx = paintPreviewCanvas.getContext('2d');
        paintPreviewCtx.clearRect(0, 0, paintPreviewCanvas.width, paintPreviewCanvas.height);
        
        paintPreviewCtx.strokeStyle = color;
        paintPreviewCtx.lineWidth = baseSize;
        paintPreviewCtx.lineCap = 'round';
        paintPreviewCtx.lineJoin = 'round';

        if (paintActiveTool === 'line') {
            paintPreviewCtx.beginPath();
            paintPreviewCtx.moveTo(paintLastX, paintLastY);
            paintPreviewCtx.lineTo(coords.x, coords.y);
            paintPreviewCtx.stroke();
        } 
        else if (paintActiveTool === 'rect') {
            paintPreviewCtx.fillStyle = color;
            let w = coords.x - paintLastX;
            let h = coords.y - paintLastY;
            paintPreviewCtx.fillRect(paintLastX, paintLastY, w, h);
            paintPreviewCtx.strokeRect(paintLastX, paintLastY, w, h);
        }
        else if (paintActiveTool === 'gradient') {
            const grad = paintPreviewCtx.createLinearGradient(paintLastX, paintLastY, coords.x, coords.y);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'transparent');
            paintPreviewCtx.fillStyle = grad;
            paintPreviewCtx.fillRect(0, 0, paintPreviewCanvas.width, paintPreviewCanvas.height);
        }
    }
}

function paintPointerUp(e) { 
    if (paintIsDrawing) { 
        document.getElementById('paint-workspace').releasePointerCapture(e.pointerId);
        
        const coords = paintGetCanvasCoords(e);
        const ctx = getActiveCtx(); 
        if (ctx) ctx.globalCompositeOperation = 'source-over'; 
        
        if (paintActiveTool === 'line' || paintActiveTool === 'rect' || paintActiveTool === 'gradient') {
            if (paintPreviewCanvas && ctx) {
                ctx.drawImage(paintPreviewCanvas, 0, 0);
                paintPreviewCtx.clearRect(0, 0, paintPreviewCanvas.width, paintPreviewCanvas.height);
            }
        }
    } 
    paintIsDrawing = false; 
}

// ------------------------------------------------------------------
// OBSŁUGA INTERAKTYWNEGO TEKSTU I KROPLOMIERZA
// ------------------------------------------------------------------
window.paintUpdateTextPreview = function() {
    if (!window.paintTextElement) return;
    const font = document.getElementById('paint-text-font').value;
    const size = document.getElementById('paint-text-size').value;
    const isBold = document.getElementById('paint-text-bold').classList.contains('border-blue-500');
    const isItalic = document.getElementById('paint-text-italic').classList.contains('border-blue-500');
    const isUnderline = document.getElementById('paint-text-underline').classList.contains('border-blue-500');
    const color = document.getElementById('paint-color').value;
    
    const el = window.paintTextElement;
    el.style.fontFamily = `"${font}", sans-serif`;
    el.style.fontSize = `${size}px`;
    el.style.fontWeight = isBold ? 'bold' : 'normal';
    el.style.fontStyle = isItalic ? 'italic' : 'normal';
    el.style.textDecoration = isUnderline ? 'underline' : 'none';
    el.style.color = color;
};

window.paintFinishText = function() {
    if (!window.paintTextActive || !window.paintTextElement) return;
    const text = window.paintTextElement.innerText;
    
    if (text.trim() !== '') {
        paintSaveHistoryState();
        const ctx = getActiveCtx();
        
        const font = document.getElementById('paint-text-font').value;
        const size = parseInt(document.getElementById('paint-text-size').value, 10);
        const isBold = document.getElementById('paint-text-bold').classList.contains('border-blue-500');
        const isItalic = document.getElementById('paint-text-italic').classList.contains('border-blue-500');
        const isUnderline = document.getElementById('paint-text-underline').classList.contains('border-blue-500');
        const color = document.getElementById('paint-color').value;
        
        ctx.font = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${size}px "${font}"`;
        ctx.fillStyle = color;
        ctx.textBaseline = 'top';
        
        const lines = text.split('\n');
        let curY = window.paintTextCoords.y;
        lines.forEach(line => {
            ctx.fillText(line, window.paintTextCoords.x, curY);
            if (isUnderline) {
                const metrics = ctx.measureText(line);
                ctx.beginPath();
                ctx.moveTo(window.paintTextCoords.x, curY + size * 1.1); // Linia pod spodem liter
                ctx.lineTo(window.paintTextCoords.x + metrics.width, curY + size * 1.1);
                ctx.strokeStyle = color;
                ctx.lineWidth = Math.max(1, size / 15);
                ctx.stroke();
            }
            curY += size * 1.2;
        });
    }
    
    window.paintTextElement.remove();
    window.paintTextElement = null;
    window.paintTextActive = false;
};

function paintPickColor(x, y) {
    const workspace = document.getElementById('paint-workspace'); 
    const tempCanvas = document.createElement('canvas'); 
    tempCanvas.width = workspace.clientWidth; tempCanvas.height = workspace.clientHeight;
    const ctx = tempCanvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    for (let i = paintLayers.length - 1; i >= 0; i--) { 
        if (paintLayers[i].visible) { 
            ctx.globalCompositeOperation = paintLayers[i].blendMode === 'normal' ? 'source-over' : paintLayers[i].blendMode; 
            ctx.globalAlpha = paintLayers[i].opacity / 100;
            ctx.drawImage(paintLayers[i].canvas, 0, 0); 
        } 
    }
    
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = "#" + ("000000" + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6);
    
    document.getElementById('paint-color').value = hex;
    if(window.paintTextElement) window.paintUpdateTextPreview();
    paintSelectTool('brush'); 
    if(typeof apps !== 'undefined') apps.showToast('Kroplomierz', `Pobrano kolor: ${hex}`, 'info');
}

function hexToRgba(hex) { 
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255]; 
}

function paintFloodFill(startX, startY, fillColorHex) {
    const canvas = getActiveCanvas(); const ctx = getActiveCtx(); if (!canvas || !ctx) return;
    const w = canvas.width; const h = canvas.height; 
    if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;
    
    const imgData = ctx.getImageData(0, 0, w, h); 
    const data = imgData.data;
    const targetIdx = (startY * w + startX) * 4; 
    const targetColor = [data[targetIdx], data[targetIdx+1], data[targetIdx+2], data[targetIdx+3]];
    const fillColor = hexToRgba(fillColorHex);
    
    if (targetColor[0] === fillColor[0] && targetColor[1] === fillColor[1] && targetColor[2] === fillColor[2] && targetColor[3] === fillColor[3]) return;
    
    const stack = [[startX, startY]];
    while(stack.length > 0) {
        let [x, y] = stack.pop(); let idx = (y * w + x) * 4;
        while (y >= 0 && data[idx]===targetColor[0] && data[idx+1]===targetColor[1] && data[idx+2]===targetColor[2] && data[idx+3]===targetColor[3]) { y--; idx -= w * 4; }
        y++; idx += w * 4; let reachLeft = false; let reachRight = false;
        
        while (y < h && data[idx]===targetColor[0] && data[idx+1]===targetColor[1] && data[idx+2]===targetColor[2] && data[idx+3]===targetColor[3]) {
            data[idx] = fillColor[0]; data[idx+1] = fillColor[1]; data[idx+2] = fillColor[2]; data[idx+3] = fillColor[3];
            if (x > 0) { if (data[idx-4]===targetColor[0] && data[idx-3]===targetColor[1] && data[idx-2]===targetColor[2] && data[idx-1]===targetColor[3]) { if (!reachLeft) { stack.push([x - 1, y]); reachLeft = true; } } else if (reachLeft) { reachLeft = false; } }
            if (x < w - 1) { if (data[idx+4]===targetColor[0] && data[idx+5]===targetColor[1] && data[idx+6]===targetColor[2] && data[idx+7]===targetColor[3]) { if (!reachRight) { stack.push([x + 1, y]); reachRight = true; } } else if (reachRight) { reachRight = false; } }
            y++; idx += w * 4;
        }
    }
    ctx.putImageData(imgData, 0, 0);
}

// ------------------------------------------------------------------
// ZAAWANSOWANE EFEKTY (Własne Modalne Okna z Podglądem!)
// ------------------------------------------------------------------
function paintApplyFilter(filterType) {
    if (paintLayers.length === 0) return;
    window.paintFinishText(); // Bezpieczeństwo
    
    const simpleFilters = ['invert', 'grayscale', 'sepia'];
    
    if (simpleFilters.includes(filterType)) {
        paintSaveHistoryState();
        paintExecuteFilter(filterType, null);
        return;
    }

    let title = "", desc = "", def = "", unit = "", min = "0", max = "100";
    if(filterType === 'blur') { title = "Rozmycie"; desc = "Siła promienia:"; def = "5"; unit = "px"; max = "50"; }
    else if(filterType === 'brightness') { title = "Jasność"; desc = "Mnożnik jasności:"; def = "150"; unit = "%"; max = "300"; }
    else if(filterType === 'contrast') { title = "Kontrast"; desc = "Wartość kontrastu:"; def = "150"; unit = "%"; max = "300"; }
    else if(filterType === 'hue') { title = "Odcień"; desc = "Obrót koła barw:"; def = "90"; unit = "deg"; max = "360"; }
    else if(filterType === 'saturate') { title = "Nasycenie"; desc = "Moc kolorów:"; def = "200"; unit = "%"; max = "500"; }
    else if(filterType === 'noise') { title = "Szum pikseli"; desc = "Intensywność zniekształceń:"; def = "40"; unit = ""; max = "255"; }

    const modalId = 'paint-effect-modal';
    let modal = document.getElementById(modalId);
    if(modal) modal.remove();

    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-purple-500/30 transform transition-transform">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">✨ Efekt: ${title}</h2>
            <div class="mb-6">
                <label class="block text-sm text-gray-600 dark:text-gray-400 mb-2">${desc}</label>
                <div class="flex items-center gap-3">
                    <input type="range" id="paint-eff-slider" min="${min}" max="${max}" value="${def}" class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700">
                    <div class="w-16 flex items-center bg-gray-100 dark:bg-gray-700 rounded px-2">
                        <input type="number" id="paint-eff-val" value="${def}" class="w-full bg-transparent border-none text-right outline-none text-gray-800 dark:text-white font-bold">
                        <span class="text-xs text-gray-500 ml-1">${unit}</span>
                    </div>
                </div>
            </div>
            <div class="flex gap-3 justify-end">
                <button id="paint-eff-cancel" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition font-medium">Anuluj</button>
                <button id="paint-eff-ok" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg shadow-purple-600/30 transition font-medium">Zastosuj</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const slider = document.getElementById('paint-eff-slider');
    const input = document.getElementById('paint-eff-val');
    
    slider.oninput = () => input.value = slider.value;
    input.oninput = () => slider.value = input.value;

    document.getElementById('paint-eff-cancel').onclick = () => modal.remove();
    document.getElementById('paint-eff-ok').onclick = () => {
        let finalVal = input.value;
        if(unit) finalVal += unit;
        
        paintSaveHistoryState();
        paintExecuteFilter(filterType, finalVal);
        modal.remove();
    };
}

function paintExecuteFilter(filterType, val) {
    const canvas = getActiveCanvas(); const ctx = getActiveCtx(); if (!canvas || !ctx) return;
    const w = canvas.width; const h = canvas.height;

    const hardwareFilters = ['blur', 'brightness', 'contrast', 'hue', 'saturate'];
    if (hardwareFilters.includes(filterType)) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w; tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        
        let cssFilter = filterType === 'hue' ? `hue-rotate(${val})` : `${filterType}(${val})`;
        tempCtx.filter = cssFilter;
        tempCtx.drawImage(canvas, 0, 0);
        
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(tempCanvas, 0, 0);
        if(typeof apps !== 'undefined') apps.showToast('Efekty', 'Nałożono filtr sprzętowy', 'success');
        return;
    }

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    if (filterType === 'invert') {
        for (let i = 0; i < data.length; i += 4) {
            if(data[i+3] > 0) { data[i] = 255 - data[i]; data[i+1] = 255 - data[i+1]; data[i+2] = 255 - data[i+2]; }
        }
    } else if (filterType === 'grayscale') {
        for (let i = 0; i < data.length; i += 4) {
            if(data[i+3] > 0) {
                const avg = 0.3 * data[i] + 0.59 * data[i+1] + 0.11 * data[i+2];
                data[i] = data[i+1] = data[i+2] = avg;
            }
        }
    } else if (filterType === 'sepia') {
        for (let i = 0; i < data.length; i += 4) {
            if(data[i+3] > 0) {
                let r = data[i], g = data[i+1], b = data[i+2];
                data[i] = Math.min(255, (r * .393) + (g *.769) + (b * .189));
                data[i+1] = Math.min(255, (r * .349) + (g *.686) + (b * .168));
                data[i+2] = Math.min(255, (r * .272) + (g *.534) + (b * .131));
            }
        }
    } else if (filterType === 'noise') {
        let intensity = parseInt(val, 10);
        for (let i = 0; i < data.length; i += 4) {
            if(data[i+3] > 0) {
                let rand = (0.5 - Math.random()) * intensity;
                data[i] = Math.min(255, Math.max(0, data[i] + rand));
                data[i+1] = Math.min(255, Math.max(0, data[i+1] + rand));
                data[i+2] = Math.min(255, Math.max(0, data[i+2] + rand));
            }
        }
    }

    ctx.putImageData(imgData, 0, 0);
    if(typeof apps !== 'undefined') apps.showToast('Efekty', 'Zastosowano efekt!', 'success');
}

// ------------------------------------------------------------------
// SYSTEM HISTORII (Undo / Redo)
// ------------------------------------------------------------------
function paintSaveHistoryState() {
    if (paintHistoryStep < paintHistory.length - 1) {
        paintHistory = paintHistory.slice(0, paintHistoryStep + 1);
    }
    
    const snapshot = paintLayers.map(l => ({
        name: l.name, visible: l.visible, blendMode: l.blendMode, opacity: l.opacity,
        data: l.canvas.toDataURL()
    }));
    
    paintHistory.push(snapshot);
    if (paintHistory.length > 30) paintHistory.shift(); 
    else paintHistoryStep++;
}

function paintUndo() {
    window.paintFinishText();
    if (paintHistoryStep < 0) return; 
    if (paintHistoryStep === paintHistory.length - 1) {
        paintSaveHistoryState(); paintHistoryStep--; 
    }
    if (paintHistoryStep < 0) return;
    paintRestoreHistoryState(paintHistory[paintHistoryStep]);
    paintHistoryStep--;
    if(typeof apps !== 'undefined') apps.showToast('Historia', 'Cofnięto krok (Undo)', 'info');
}

function paintRedo() {
    window.paintFinishText();
    if (paintHistoryStep >= paintHistory.length - 2) return;
    paintHistoryStep++;
    paintRestoreHistoryState(paintHistory[paintHistoryStep + 1]);
    if(typeof apps !== 'undefined') apps.showToast('Historia', 'Ponowiono krok (Redo)', 'info');
}

function paintRestoreHistoryState(snapshot) {
    const workspace = document.getElementById('paint-workspace');
    paintLayers.forEach(l => l.canvas.remove());
    paintLayers = [];
    
    let loadedCount = 0;
    snapshot.forEach((snapLayer, i) => {
        const canvas = document.createElement('canvas'); 
        canvas.width = workspace.clientWidth; canvas.height = workspace.clientHeight; 
        canvas.className = 'absolute top-0 left-0 pointer-events-none';
        workspace.appendChild(canvas);
        
        const layerObj = { 
            id: Date.now()+i, canvas: canvas, name: snapLayer.name, 
            visible: snapLayer.visible, blendMode: snapLayer.blendMode, opacity: snapLayer.opacity || 100 
        };
        paintLayers.push(layerObj);
        
        const img = new Image();
        img.onload = () => {
            canvas.getContext('2d').drawImage(img, 0, 0);
            loadedCount++;
            if(loadedCount === snapshot.length) {
                paintCurrentLayerIndex = 0;
                paintRenderLayersList();
                paintUpdateCanvasesStyle();
            }
        };
        img.src = snapLayer.data;
    });
}

// ------------------------------------------------------------------
// ZAPISYWANIE, WYMIARY, ŁADOWANIE
// ------------------------------------------------------------------
function paintSaveDefault() { paintSaveAs('png'); }

function paintSaveAs(format) {
    window.paintFinishText(); // Zabezpieczenie by wypalić napis przed zapisem
    if (paintLayers.length === 0) return;
    const workspace = document.getElementById('paint-workspace'); 
    const compositeCanvas = document.createElement('canvas'); 
    compositeCanvas.width = workspace.clientWidth; compositeCanvas.height = workspace.clientHeight;
    const ctx = compositeCanvas.getContext('2d'); 
    
    if (format === 'jpeg') { 
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height); 
    }
    
    for (let i = paintLayers.length - 1; i >= 0; i--) { 
        if (paintLayers[i].visible) { 
            ctx.globalCompositeOperation = paintLayers[i].blendMode === 'normal' ? 'source-over' : paintLayers[i].blendMode; 
            ctx.globalAlpha = paintLayers[i].opacity / 100;
            ctx.drawImage(paintLayers[i].canvas, 0, 0); 
        } 
    }
    
    const mimeType = format === 'jpeg' ? 'image/jpeg' : (format === 'webp' ? 'image/webp' : 'image/png'); 
    const a = document.createElement('a'); 
    a.href = compositeCanvas.toDataURL(mimeType, 1.0); 
    a.download = `szkic_bigos.${format}`; 
    a.click(); 
    if(typeof apps !== 'undefined') apps.showToast('Szkicownik', `Pobrano obraz na PC (.${format.toUpperCase()})`, 'success');
}

function paintSaveToSystem(format) {
    window.paintFinishText();
    if (paintLayers.length === 0) return;
    if(typeof ui === 'undefined') return;
    ui.showPrompt("Podaj nazwę dla obrazka:", `Nowy Obraz.${format === 'jpeg' ? 'jpg' : 'png'}`, "Zapisz", (name) => {
        if(!name) return;
        const workspace = document.getElementById('paint-workspace'); 
        const compositeCanvas = document.createElement('canvas'); 
        compositeCanvas.width = workspace.clientWidth; compositeCanvas.height = workspace.clientHeight;
        const ctx = compositeCanvas.getContext('2d'); 
        
        if (format === 'jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height); }
        
        for (let i = paintLayers.length - 1; i >= 0; i--) { 
            if (paintLayers[i].visible) { 
                ctx.globalCompositeOperation = paintLayers[i].blendMode === 'normal' ? 'source-over' : paintLayers[i].blendMode; 
                ctx.globalAlpha = paintLayers[i].opacity / 100;
                ctx.drawImage(paintLayers[i].canvas, 0, 0); 
            } 
        }
        
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'; 
        const dataURL = compositeCanvas.toDataURL(mimeType, 0.9);
        const id = 'img_'+Date.now(); 
        
        if(typeof fileSystem !== 'undefined' && typeof fsManager !== 'undefined') {
            fileSystem.push({ id: id, type: 'image', name: name, icon: '🖼️', content: dataURL, parentId: fsManager.currentFolder || 'root', x: 40, y: 40 });
            fsManager.save(); 
            if(typeof desktop !== 'undefined') desktop.render(); 
            const aW = document.getElementById('app-aktowka');
            if(aW && aW.classList.contains('active')) fsManager.renderExplorerContent(fsManager.currentFolder);
            if(typeof apps !== 'undefined') apps.showToast('Szkicownik', 'Zapisano w systemie BigOS', 'success');
        }
    });
}

function paintOpen(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader(); 
        reader.onload = (e) => { 
            const img = new Image(); 
            img.onload = () => { 
                window.paintFinishText();
                paintHistory = []; paintHistoryStep = -1;
                paintLayers.forEach(l => l.canvas.remove()); 
                paintLayers = []; 
                const workspace = document.getElementById('paint-workspace'); 
                workspace.style.width = `${img.width}px`; 
                workspace.style.height = `${img.height}px`; 
                
                const canvas = document.createElement('canvas'); 
                canvas.width = img.width; 
                canvas.height = img.height; 
                canvas.className = 'absolute top-0 left-0 pointer-events-none';
                if (paintPreviewCanvas) {
                    paintPreviewCanvas.width = img.width;
                    paintPreviewCanvas.height = img.height;
                    paintPreviewCtx = paintPreviewCanvas.getContext('2d');
                }
                workspace.appendChild(canvas); 
                
                const layer = { 
                    id: Date.now() + Math.random(), canvas: canvas, name: "Wczytany obraz", 
                    visible: true, blendMode: 'normal', opacity: 100
                };
                paintLayers.unshift(layer); 
                paintCurrentLayerIndex = 0; 
                
                const ctx = getActiveCtx(); 
                ctx.clearRect(0, 0, img.width, img.height); 
                ctx.drawImage(img, 0, 0); 
                
                paintRenderLayersList(); 
                paintUpdateCanvasesStyle();
            }; 
            img.src = e.target.result; 
        }; 
        reader.readAsDataURL(file);
    } 
    if(event.target) event.target.value = '';
}

function paintShowBigOSPicker() {
    if(typeof fileSystem === 'undefined') return;
    
    const modalId = 'paint-picker-modal';
    let modal = document.getElementById(modalId);
    if(modal) modal.remove();

    const images = fileSystem.filter(f => f.type === 'image' || (f.type === 'file' && (f.name.endsWith('.png') || f.name.endsWith('.jpg') || f.name.endsWith('.webp'))));

    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center backdrop-blur-sm';
    
    let listHTML = '';
    if(images.length === 0) {
        listHTML = '<div class="text-gray-500 text-center py-6">Brak obrazów zapisanych w systemie BigOS</div>';
    } else {
        images.forEach(f => {
            listHTML += `<button class="w-full text-left px-3 py-2 bg-gray-100 dark:bg-[#111] hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition text-gray-800 dark:text-white border border-gray-200 dark:border-[#333] mb-2 font-medium" onclick="document.getElementById('${modalId}').remove(); paintOpenFromFS('${f.id}')">🖼️ ${typeof desktop !== 'undefined' ? desktop.escapeHTML(f.name) : f.name}</button>`;
        });
    }

    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-blue-500/30">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Otwórz z BigOS</h2>
            <div class="max-h-64 overflow-y-auto mb-4 pr-1 custom-scrollbar">
                ${listHTML}
            </div>
            <div class="flex justify-end">
                <button onclick="document.getElementById('${modalId}').remove()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition font-medium">Anuluj</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function paintOpenFromFS(fileId) {
    if(typeof fileSystem === 'undefined') return;
    const item = fileSystem.find(i => i.id === fileId);
    if(item) { 
        const img = new Image(); 
        img.onload = () => { 
            window.paintFinishText();
            paintHistory = []; paintHistoryStep = -1;
            paintLayers.forEach(l => l.canvas.remove()); 
            paintLayers = []; 
            const workspace = document.getElementById('paint-workspace'); 
            workspace.style.width = `${img.width}px`; 
            workspace.style.height = `${img.height}px`; 
            
            const canvas = document.createElement('canvas'); 
            canvas.width = img.width; 
            canvas.height = img.height; 
            canvas.className = 'absolute top-0 left-0 pointer-events-none';
            if (paintPreviewCanvas) {
                paintPreviewCanvas.width = img.width;
                paintPreviewCanvas.height = img.height;
                paintPreviewCtx = paintPreviewCanvas.getContext('2d');
            }
            workspace.appendChild(canvas); 
            
            const layer = { 
                id: Date.now() + Math.random(), canvas: canvas, name: item.name, 
                visible: true, blendMode: 'normal', opacity: 100
            };
            paintLayers.unshift(layer); 
            paintCurrentLayerIndex = 0; 
            
            const ctx = getActiveCtx(); 
            ctx.clearRect(0, 0, img.width, img.height); 
            ctx.drawImage(img, 0, 0); 
            
            paintRenderLayersList(); 
            paintUpdateCanvasesStyle();
        }; 
        img.src = item.content; 
    }
}

function showPaintNewModal() { 
    document.getElementById('paint-modal-title').innerText = "Wymiary Nowego Obrazka"; 
    document.getElementById('paint-modal-confirm').onclick = () => { 
        window.paintFinishText();
        paintHistory = []; paintHistoryStep = -1;
        paintLayers.forEach(l => l.canvas.remove()); paintLayers = []; 
        paintApplyResize(true); 
    }; 
    showPaintResizeModal(true); 
}

function showPaintResizeModal(isNew = false) { 
    if(!isNew) { 
        document.getElementById('paint-modal-title').innerText = "Zmień rozmiar płótna"; 
        document.getElementById('paint-modal-confirm').onclick = () => { paintSaveHistoryState(); paintApplyResize(false); }; 
    } 
    const workspace = document.getElementById('paint-workspace'); 
    
    let curW = workspace.clientWidth || 800;
    let curH = workspace.clientHeight || 600;
    if(curW < 10) curW = 800; if(curH < 10) curH = 600;

    document.getElementById('paint-resize-w-px').value = curW; 
    document.getElementById('paint-resize-h-px').value = curH; 
    const pxPerCm = 37.79527559; 
    document.getElementById('paint-resize-w-cm').value = (curW / pxPerCm).toFixed(2); 
    document.getElementById('paint-resize-h-cm').value = (curH / pxPerCm).toFixed(2); 
    document.getElementById('paint-resize-modal').classList.remove('hidden'); 
}

function paintResizeCalc(axis, source) { 
    const pxPerCm = 37.79527559; 
    if (source === 'px') { 
        const px = parseInt(document.getElementById(`paint-resize-${axis}-px`).value, 10) || 0; 
        document.getElementById(`paint-resize-${axis}-cm`).value = (px / pxPerCm).toFixed(2); 
    } else { 
        const cm = parseFloat(document.getElementById(`paint-resize-${axis}-cm`).value) || 0; 
        document.getElementById(`paint-resize-${axis}-px`).value = Math.round(cm * pxPerCm); 
    } 
}

function paintApplyResize(isNewFile = false) {
    const newW = parseInt(document.getElementById('paint-resize-w-px').value, 10); 
    const newH = parseInt(document.getElementById('paint-resize-h-px').value, 10);
    if (newW > 0 && newH > 0) { 
        window.paintFinishText();
        const workspace = document.getElementById('paint-workspace'); 
        
        let savedContents = [];
        if (!isNewFile) {
            savedContents = paintLayers.map(layer => { 
                const temp = document.createElement('canvas'); 
                temp.width = layer.canvas.width; temp.height = layer.canvas.height; 
                temp.getContext('2d').drawImage(layer.canvas, 0, 0); 
                return temp; 
            }); 
        }

        workspace.style.width = `${newW}px`; workspace.style.height = `${newH}px`; 
        
        if (paintPreviewCanvas) {
            paintPreviewCanvas.width = newW;
            paintPreviewCanvas.height = newH;
        }

        if (isNewFile) {
            paintAddLayer(); 
        } else {
            paintLayers.forEach((layer, i) => { 
                layer.canvas.width = newW; layer.canvas.height = newH; 
                if (i === paintLayers.length - 1) { 
                    layer.canvas.getContext('2d').fillStyle = '#ffffff'; 
                    layer.canvas.getContext('2d').fillRect(0, 0, newW, newH); 
                } 
                layer.canvas.getContext('2d').drawImage(savedContents[i], 0, 0); 
            }); 
        }
    } 
    document.getElementById('paint-resize-modal').classList.add('hidden');
}

// ------------------------------------------------------------------
// KOMPATYBILNOŚĆ GLOBALNA DLA HTML
// ------------------------------------------------------------------
window.initPaint = initPaint;
window.paintAddLayer = paintAddLayer;
window.paintDeleteLayer = paintDeleteLayer;
window.paintToggleLayerVisibility = paintToggleLayerVisibility;
window.paintSelectLayer = paintSelectLayer;
window.paintUpdateLayerBlendMode = paintUpdateLayerBlendMode;
window.paintUpdateLayerOpacity = paintUpdateLayerOpacity;
window.paintRenameLayer = paintRenameLayer;
window.paintSelectTool = paintSelectTool;
window.paintSaveDefault = paintSaveDefault;
window.paintSaveAs = paintSaveAs;
window.paintSaveToSystem = paintSaveToSystem;
window.paintOpen = paintOpen;
window.paintOpenFromFS = paintOpenFromFS;
window.showPaintNewModal = showPaintNewModal;
window.showPaintResizeModal = showPaintResizeModal;
window.paintResizeCalc = paintResizeCalc;
window.paintApplyResize = paintApplyResize;
window.paintUndo = paintUndo;
window.paintRedo = paintRedo;
window.paintApplyFilter = paintApplyFilter;
window.paintCloseFile = paintCloseFile;
window.paintShowBigOSPicker = paintShowBigOSPicker;

const paintApp = {
    init: initPaint,
    openFromFS: paintOpenFromFS
};

// Startujemy lekko opóźnieni, by HTML załapał wymiary
setTimeout(initPaint, 500);