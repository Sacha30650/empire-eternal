const {execSync} = require('child_process');
const result = execSync(`chromium --headless --no-sandbox --disable-gpu --enable-logging=stderr --v=0 --virtual-time-budget=3000 --dump-dom "http://127.0.0.1:8080/index.html" 2>&1`, {encoding:'utf8', maxBuffer: 10*1024*1024});
const lines = result.split('\n');
const errors = lines.filter(l => l.includes('Uncaught') || l.includes('ERROR') || l.includes('error'));
console.log('=== ERREURS CONSOLE ===');
errors.slice(0, 15).forEach(e => console.log(e.trim()));
