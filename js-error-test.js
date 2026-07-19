const {execSync} = require('child_process');
const result = execSync(`chromium --headless --no-sandbox --disable-gpu --enable-logging=stderr --v=0 --virtual-time-budget=3000 --dump-dom "http://127.0.0.1:8080/index.html" 2>&1`, {encoding:'utf8', maxBuffer: 10*1024*1024});
const lines = result.split('\n');
const jsErrors = lines.filter(l => 
  (l.includes('Uncaught') || l.includes('SyntaxError') || l.includes('ReferenceError') || l.includes('TypeError')) &&
  !l.includes('dbus') && !l.includes('DBus')
);
console.log('=== ERREURS JS ===');
jsErrors.slice(0, 10).forEach(e => console.log(e.trim()));
console.log('=== FIN ===');
