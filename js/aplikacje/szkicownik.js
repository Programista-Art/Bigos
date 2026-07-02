
        let paintLayers = []; let paintCurrentLayerIndex = -1; let paintActiveTool = 'pencil'; let paintIsDrawing = false; let paintLastX = 0; let paintLastY = 0;
        function initPaint() {
            if (paintLayers.length > 0) return; paintAddLayer(); const workspace = document.getElementById('paint-workspace');
            workspace.addEventListener('mousedown', paintMouseDown); workspace.addEventListener('mousemove', paintMouseMove); window.addEventListener('mouseup', paintMouseUp);
            workspace.addEventListener('touchstart', paintMouseDown, {passive: false}); workspace.addEventListener('touchmove', paintMouseMove, {passive: false}); window.addEventListener('touchend', paintMouseUp);
        }
        function getActiveCanvas() { if (paintCurrentLayerIndex < 0 || paintCurrentLayerIndex >= paintLayers.length) return null; return paintLayers[paintCurrentLayerIndex].canvas; }
        function getActiveCtx() { const canvas = getActiveCanvas(); return canvas ? canvas.getContext('2d', { willReadFrequently: true }) : null; }
        function paintAddLayer() {
            const workspace = document.getElementById('paint-workspace'); const canvas = document.createElement('canvas'); canvas.width = workspace.clientWidth; canvas.height = workspace.clientHeight; canvas.className = 'absolute top-0 left-0 pointer-events-none';
            if (paintLayers.length === 0) { const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
            workspace.appendChild(canvas); const layer = { id: Date.now() + Math.random(), canvas: canvas, name: `Warstwa ${paintLayers.length + 1}`, visible: true, blendMode: 'normal' };
            paintLayers.unshift(layer); paintCurrentLayerIndex = 0; paintRenderLayersList(); paintUpdateCanvasesStyle();
        }
        function paintDeleteLayer(index) { if (paintLayers.length <= 1) return; paintLayers[index].canvas.remove(); paintLayers.splice(index, 1); if (paintCurrentLayerIndex >= paintLayers.length) paintCurrentLayerIndex = Math.max(0, paintLayers.length - 1); paintRenderLayersList(); }
        function paintToggleLayerVisibility(index) { paintLayers[index].visible = !paintLayers[index].visible; paintLayers[index].canvas.style.display = paintLayers[index].visible ? 'block' : 'none'; paintRenderLayersList(); }
        function paintSelectLayer(index) { paintCurrentLayerIndex = index; paintRenderLayersList(); }
        function paintUpdateLayerBlendMode(index, mode) { paintLayers[index].blendMode = mode; paintUpdateCanvasesStyle(); }
        function paintUpdateCanvasesStyle() { for (let i = 0; i < paintLayers.length; i++) { paintLayers[i].canvas.style.zIndex = paintLayers.length - i; let mix = 'normal'; if (paintLayers[i].blendMode === 'multiply') mix = 'multiply'; if (paintLayers[i].blendMode === 'overlay') mix = 'overlay'; paintLayers[i].canvas.style.mixBlendMode = mix; } }
        function paintRenderLayersList() {
            const list = document.getElementById('paint-layers-list'); list.innerHTML = '';
            paintLayers.forEach((layer, index) => {
                const isSelected = index === paintCurrentLayerIndex;
                const html = `<div class="flex items-center p-2 border-b border-gray-200 dark:border-[#333] cursor-pointer ${isSelected ? 'bg-blue-200 dark:bg-blue-800' : 'hover:bg-gray-200 dark:hover:bg-[#333]'}" onclick="paintSelectLayer(${index})"><button class="mr-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white w-6" onclick="event.stopPropagation(); paintToggleLayerVisibility(${index})">${layer.visible ? '👁️' : '🕶️'}</button><div class="flex-1 text-xs font-semibold truncate text-gray-800 dark:text-white">${layer.name}</div><select class="text-[10px] border mr-2 bg-white dark:bg-[#222] text-gray-800 dark:text-white rounded border-gray-300 dark:border-[#444]" onclick="event.stopPropagation()" onchange="paintUpdateLayerBlendMode(${index}, this.value)"><option value="normal" ${layer.blendMode === 'normal' ? 'selected' : ''}>Norm.</option><option value="multiply" ${layer.blendMode === 'multiply' ? 'selected' : ''}>Mnoż.</option><option value="overlay" ${layer.blendMode === 'overlay' ? 'selected' : ''}>Nakł.</option></select><button class="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-lg w-5" onclick="event.stopPropagation(); paintDeleteLayer(${index})">&times;</button></div>`;
                list.insertAdjacentHTML('beforeend', html);
            });
        }
        function paintSelectTool(toolName) {
            paintActiveTool = toolName; document.querySelectorAll('.paint-tool-btn').forEach(b => b.classList.remove('bg-gray-300', 'dark:bg-[#444]')); const btn = document.querySelector(`.paint-tool-btn[data-tool="${toolName}"]`); if (btn) btn.classList.add('bg-gray-300', 'dark:bg-[#444]');
            const sizeInput = document.getElementById('paint-size'); if (toolName === 'pencil') { sizeInput.value = 1; document.getElementById('paint-size-label').textContent = '1px'; } else if (sizeInput.value === '1' && toolName === 'brush') { sizeInput.value = 5; document.getElementById('paint-size-label').textContent = '5px'; }
        }
        document.getElementById('paint-size').addEventListener('input', (e) => { document.getElementById('paint-size-label').textContent = `${e.target.value}px`; });
        function paintGetCanvasCoords(e) { 
            const workspace = document.getElementById('paint-workspace'); const rect = workspace.getBoundingClientRect(); 
            const pos = getEventPos(e);
            return { x: (pos.x - rect.left) * (workspace.clientWidth / rect.width), y: (pos.y - rect.top) * (workspace.clientHeight / rect.height) }; 
        }
        function paintMouseDown(e) {
            if (paintCurrentLayerIndex < 0 || !paintLayers[paintCurrentLayerIndex].visible) return;
            if(e.type === 'touchstart') e.preventDefault();
            paintIsDrawing = true; const coords = paintGetCanvasCoords(e); paintLastX = coords.x; paintLastY = coords.y;
            const ctx = getActiveCtx(); const color = document.getElementById('paint-color').value; const size = parseInt(document.getElementById('paint-size').value, 10);
            if (paintActiveTool === 'fill') { paintFloodFill(Math.floor(coords.x), Math.floor(coords.y), color); paintIsDrawing = false; return; }
            ctx.beginPath(); ctx.fillStyle = paintActiveTool === 'eraser' ? '#000000' : color;
            if (paintActiveTool === 'eraser') ctx.globalCompositeOperation = 'destination-out'; else ctx.globalCompositeOperation = 'source-over';
            if (paintActiveTool === 'pencil') ctx.fillRect(Math.floor(coords.x), Math.floor(coords.y), 1, 1); else { ctx.arc(coords.x, coords.y, size / 2, 0, Math.PI * 2); ctx.fill(); }
        }
        function paintMouseMove(e) {
            if (!paintIsDrawing || paintActiveTool === 'fill') return;
            if(e.type === 'touchmove') e.preventDefault();
            const coords = paintGetCanvasCoords(e); const ctx = getActiveCtx(); const color = document.getElementById('paint-color').value; const size = parseInt(document.getElementById('paint-size').value, 10);
            ctx.beginPath();
            if (paintActiveTool === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = '#000000'; } else { ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = color; }
            if (paintActiveTool === 'pencil') { ctx.lineWidth = 1; ctx.lineCap = 'square'; ctx.lineJoin = 'miter'; ctx.moveTo(Math.floor(paintLastX) + 0.5, Math.floor(paintLastY) + 0.5); ctx.lineTo(Math.floor(coords.x) + 0.5, Math.floor(coords.y) + 0.5); ctx.stroke(); } 
            else { ctx.lineWidth = size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.moveTo(paintLastX, paintLastY); ctx.lineTo(coords.x, coords.y); ctx.stroke(); }
            paintLastX = coords.x; paintLastY = coords.y;
        }
        function paintMouseUp() { if (paintIsDrawing) { const ctx = getActiveCtx(); if (ctx) ctx.globalCompositeOperation = 'source-over'; } paintIsDrawing = false; }
        function hexToRgba(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255]; }
        function paintFloodFill(startX, startY, fillColorHex) {
            const canvas = getActiveCanvas(); const ctx = getActiveCtx(); if (!canvas || !ctx) return;
            const w = canvas.width; const h = canvas.height; if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;
            const imgData = ctx.getImageData(0, 0, w, h); const data = imgData.data;
            const targetIdx = (startY * w + startX) * 4; const targetColor = [data[targetIdx], data[targetIdx+1], data[targetIdx+2], data[targetIdx+3]];
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
        function paintSaveDefault() { paintSaveAs('png'); }
        function paintSaveAs(format) {
            const workspace = document.getElementById('paint-workspace'); const compositeCanvas = document.createElement('canvas'); compositeCanvas.width = workspace.clientWidth; compositeCanvas.height = workspace.clientHeight;
            const ctx = compositeCanvas.getContext('2d'); if (format === 'jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height); }
            for (let i = paintLayers.length - 1; i >= 0; i--) { if (paintLayers[i].visible) { let mix = 'source-over'; if (paintLayers[i].blendMode === 'multiply') mix = 'multiply'; if (paintLayers[i].blendMode === 'overlay') mix = 'overlay'; ctx.globalCompositeOperation = mix; ctx.drawImage(paintLayers[i].canvas, 0, 0); } }
            const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'; const a = document.createElement('a'); a.href = compositeCanvas.toDataURL(mimeType, 1.0); a.download = `szkic_bigos.${format}`; a.click(); apps.showToast('Szkicownik', `Obraz zapisany na PC (.${format.toUpperCase()})`, 'success');
        }
        function paintSaveToSystem(format) {
            ui.showPrompt("Podaj nazwę dla obrazka:", `Nowy Obraz.${format === 'jpeg' ? 'jpg' : 'png'}`, "Zapisz", (name) => {
                if(!name) return;
                const workspace = document.getElementById('paint-workspace'); const compositeCanvas = document.createElement('canvas'); compositeCanvas.width = workspace.clientWidth; compositeCanvas.height = workspace.clientHeight;
                const ctx = compositeCanvas.getContext('2d'); if (format === 'jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height); }
                for (let i = paintLayers.length - 1; i >= 0; i--) { if (paintLayers[i].visible) { let mix = 'source-over'; if (paintLayers[i].blendMode === 'multiply') mix = 'multiply'; if (paintLayers[i].blendMode === 'overlay') mix = 'overlay'; ctx.globalCompositeOperation = mix; ctx.drawImage(paintLayers[i].canvas, 0, 0); } }
                const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'; const dataURL = compositeCanvas.toDataURL(mimeType, 1.0);
                const id = 'img_'+Date.now(); fileSystem.push({ id: id, type: 'image', name: name, icon: '🖼️', content: dataURL, parentId: fsManager.currentFolder || 'root', x: 40, y: 40 });
                fsManager.save(); desktop.render(); if(document.getElementById('app-aktowka').classList.contains('active')) fsManager.renderExplorerContent(fsManager.currentFolder);
                apps.showToast('Szkicownik', 'Zapisano w systemie BigOS', 'success');
            });
        }
        function paintOpen(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader(); reader.onload = (e) => { const img = new Image(); img.onload = () => { paintLayers.forEach(l => l.canvas.remove()); paintLayers = []; const workspace = document.getElementById('paint-workspace'); workspace.style.width = `${img.width}px`; workspace.style.height = `${img.height}px`; paintAddLayer(); const ctx = getActiveCtx(); ctx.clearRect(0, 0, img.width, img.height); ctx.drawImage(img, 0, 0); paintLayers[0].name = "Wczytany obraz"; paintRenderLayersList(); }; img.src = e.target.result; }; reader.readAsDataURL(file);
            } event.target.value = '';
        }
        function paintOpenFromFS(fileId) {
            const item = fileSystem.find(i => i.id === fileId);
            if(item) { const img = new Image(); img.onload = () => { paintLayers.forEach(l => l.canvas.remove()); paintLayers = []; const workspace = document.getElementById('paint-workspace'); workspace.style.width = `${img.width}px`; workspace.style.height = `${img.height}px`; paintAddLayer(); const ctx = getActiveCtx(); ctx.clearRect(0, 0, img.width, img.height); ctx.drawImage(img, 0, 0); paintLayers[0].name = item.name; paintRenderLayersList(); }; img.src = item.content; }
        }
        function showPaintNewModal() { document.getElementById('paint-modal-title').innerText = "Wymiary Nowego Obrazka"; document.getElementById('paint-modal-confirm').onclick = () => { paintApplyResize(); paintLayers.forEach(l => l.canvas.remove()); paintLayers = []; paintAddLayer(); }; showPaintResizeModal(true); }
        function showPaintResizeModal(isNew = false) { if(!isNew) { document.getElementById('paint-modal-title').innerText = "Zmień rozmiar obrazka"; document.getElementById('paint-modal-confirm').onclick = paintApplyResize; } const workspace = document.getElementById('paint-workspace'); document.getElementById('paint-resize-w-px').value = workspace.clientWidth; document.getElementById('paint-resize-h-px').value = workspace.clientHeight; const pxPerCm = 37.79527559; document.getElementById('paint-resize-w-cm').value = (workspace.clientWidth / pxPerCm).toFixed(2); document.getElementById('paint-resize-h-cm').value = (workspace.clientHeight / pxPerCm).toFixed(2); document.getElementById('paint-resize-modal').classList.remove('hidden'); }
        function paintResizeCalc(axis, source) { const pxPerCm = 37.79527559; if (source === 'px') { const px = parseInt(document.getElementById(`paint-resize-${axis}-px`).value, 10) || 0; document.getElementById(`paint-resize-${axis}-cm`).value = (px / pxPerCm).toFixed(2); } else { const cm = parseFloat(document.getElementById(`paint-resize-${axis}-cm`).value) || 0; document.getElementById(`paint-resize-${axis}-px`).value = Math.round(cm * pxPerCm); } }
        function paintApplyResize() {
            const newW = parseInt(document.getElementById('paint-resize-w-px').value, 10); const newH = parseInt(document.getElementById('paint-resize-h-px').value, 10);
            if (newW > 0 && newH > 0) { const workspace = document.getElementById('paint-workspace'); const savedContents = paintLayers.map(layer => { const temp = document.createElement('canvas'); temp.width = layer.canvas.width; temp.height = layer.canvas.height; temp.getContext('2d').drawImage(layer.canvas, 0, 0); return temp; }); workspace.style.width = `${newW}px`; workspace.style.height = `${newH}px`; paintLayers.forEach((layer, i) => { layer.canvas.width = newW; layer.canvas.height = newH; if (i === paintLayers.length - 1) { layer.canvas.getContext('2d').fillStyle = '#ffffff'; layer.canvas.getContext('2d').fillRect(0, 0, newW, newH); } layer.canvas.getContext('2d').drawImage(savedContents[i], 0, 0); }); } document.getElementById('paint-resize-modal').classList.add('hidden');
        }