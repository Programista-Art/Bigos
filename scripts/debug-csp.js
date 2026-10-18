const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  
  const html = `<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
</head>
<body>
<div id="root"></div>
<script>
window.canEval = false;
window.canAppendScript = false;
try {
  eval("window.canEval = true");
} catch (e) {
  window.evalErr = e.message;
}

try {
  var s = document.createElement('script');
  s.textContent = "window.canAppendScript = true; window.myVal = 42;";
  document.body.appendChild(s);
} catch (e) {
  window.appendErr = e.message;
}
</script>
</body>
</html>`;

  await p.setContent(html);
  const res = await p.evaluate(() => ({
    canEval: window.canEval,
    evalErr: window.evalErr,
    canAppendScript: window.canAppendScript,
    myVal: window.myVal,
    appendErr: window.appendErr
  }));
  console.log('Result:', JSON.stringify(res, null, 2));
  await b.close();
})();
