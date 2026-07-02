  const kalkulatorApp = {
            expr: '',
            appendNum: (n) => { if(kalkulatorApp.expr === '0' && n !== '.') kalkulatorApp.expr = ''; if(kalkulatorApp.expr === 'Błąd') kalkulatorApp.expr = ''; kalkulatorApp.expr += n; kalkulatorApp.update(); },
            appendOp: (o) => { if(kalkulatorApp.expr === 'Błąd') kalkulatorApp.expr = ''; const lastChar = kalkulatorApp.expr.slice(-1); if(['+','-','*','/'].includes(lastChar)) { kalkulatorApp.expr = kalkulatorApp.expr.slice(0, -1) + o; } else { kalkulatorApp.expr += o; } kalkulatorApp.update(); },
            calculate: () => { try { const result = new Function('return ' + kalkulatorApp.expr)(); if(result === Infinity || isNaN(result)) throw new Error(); kalkulatorApp.expr = String(Math.round(result * 100000000) / 100000000); kalkulatorApp.update(); } catch(e) { kalkulatorApp.expr = 'Błąd'; kalkulatorApp.update(); } },
            clear: () => { kalkulatorApp.expr = ''; kalkulatorApp.update(); },
            update: () => { document.getElementById('calc-display').innerText = kalkulatorApp.expr || '0'; }
        };
