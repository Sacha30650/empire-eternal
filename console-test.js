const {execSync} = require('child_process');
// Charger la page et capturer les erreurs console
const result = execSync(`chromium --headless --no-sandbox --disable-gpu --dump-dom --virtual-time-budget=3000 "http://127.0.0.1:8080/index.html" 2>&1`, {encoding:'utf8', maxBuffer: 10*1024*1024});
// Chercher les erreurs JS dans le HTML
const errors = result.match(/Uncaught|Error|error/gi);
console.log('Erreurs trouvées:', errors ? errors.length : 0);
// Extraire le contenu du body
const body = result.match(/<body[^>]*>([\s\S]*)<\/body>/i);
if (body) {
  const text = body[1].replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').trim();
  console.log('Contenu visible:', text.substring(0, 500));
}
