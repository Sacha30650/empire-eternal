const {execSync} = require('child_process');
const tabs = ['combat', 'gacha', 'dynasty', 'shop'];
for (const tab of tabs) {
  // Créer une version temporaire avec l'onglet actif
  const html = require('fs').readFileSync('index.html', 'utf8');
  const modified = html.replace(
    `document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>{`,
    `setTimeout(()=>{document.querySelector('[data-t="${tab}"]').click()},100);document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>{`
  );
  require('fs').writeFileSync(`temp-${tab}.html`, modified);
  execSync(`chromium --headless --no-sandbox --disable-gpu --window-size=430,932 --screenshot=v3-${tab}.png --hide-scrollbars --virtual-time-budget=5000 "http://127.0.0.1:8080/temp-${tab}.html" 2>&1 | tail -1`);
  require('fs').unlinkSync(`temp-${tab}.html`);
}
console.log('Captures terminées');
