
const fs = require('fs');
const html = fs.readFileSync('/root/empire-eternal/index.html', 'utf8');
const js = html.split('<script>')[1].split('</script>')[0];

// ---- Stubs navigateur ----
const el = (id) => ({
  _id: id, textContent:'', innerHTML:'', classList:{ add(){}, remove(){}, toggle(){} },
  style:{}, dataset:{}, onclick:null, disabled:false, querySelectorAll: () => []
});
const cache = {};
global.document = {
  getElementById: (id) => cache[id] || (cache[id] = el(id)),
  querySelectorAll: () => [],
  querySelector: () => el('q')
};
global.window = global;
global.localStorage = { _s:{}, getItem(k){return this._s[k]||null}, setItem(k,v){this._s[k]=v}, removeItem(k){delete this._s[k]} };
global.confirm = () => true;
// Forcer le hasard pour un run déterministe
let seed = 42;
Math.random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

// Pas de timers dans le stub : on court-circuite les animations
global.setInterval = () => 0; global.clearInterval = () => {};
global.setTimeout = (fn) => { fn(); return 0; };


(0,eval)(js + ';globalThis.__game={S,RANKS,teamPower,nemPower,vip,buy,pull,startBattle,resolveBattle,buyVengeance,night,closeReport,heir,save,log};');
const {S,RANKS,teamPower,nemPower,vip,buy,pull,startBattle,resolveBattle,buyVengeance,night,closeReport,heir,save,log} = globalThis.__game;


// ================= SIMULATION =================
console.log('=== 1. ÉTAT INITIAL ===');
console.log('Héros:', S.heroes.map(h=>`${h.name}(${h.age}a,${h.power}pw)`).join(', '));
console.log('Or:', S.gold, '| Gemmes:', S.gems, '| Énergie:', S.energy, '| Némésis:', S.nemesis.name, RANKS[S.nemesis.rank]);
console.log('teamPower():', teamPower(), '| nemPower():', nemPower(), '| vip():', vip());

console.log('\n=== 2. ACHAT PACK DÉBUTANT (conversion) ===');
buy(0.99, 100);
console.log('Gemmes:', S.gems, '| Dépensé:', S.spent, '| VIP:', vip());

console.log('\n=== 3. GACHA x10 (pity 0→10) ===');
const before = S.heroes.length;
for (let i=0;i<10;i++) pull();
console.log('Héros après 10 pulls:', S.heroes.length, '(+'+(S.heroes.length-before)+')', '| Pity:', S.pity, '| Pulls:', S.pulls, '| Gemmes restantes:', S.gems);

console.log('\n=== 4. COMBAT : bataille + Moment Décisif ===');
startBattle();
console.log('Énergie après combat:', S.energy);
// Le Moment Décisif est ouvert (ovMD) → simuler choix "ultime" rapide (sang-froid)
resolveBattle('ultime', false, 1.5);
console.log('Némésis après combat:', S.nemesis.name, RANKS[S.nemesis.rank], '| wins:', S.nemesis.wins, '| taunt:', S.nemesis.taunt);
console.log('Or:', S.gold, '| Journal[0]:', S.journal[0]);

console.log('\n=== 5. COMBAT DÉSÉQUILIBRÉ : on force la défaite ===');
S.heroes.forEach(h=>{ if(h.alive) h.power = Math.round(h.power*0.3); });
startBattle();
resolveBattle('charge', true, 9); // paniqué
console.log('Après défaite — Or volé, némésis rank:', RANKS[S.nemesis.rank], 'wins:', S.nemesis.wins, 'margin:', S.nemesis.margin);
console.log('Pack Vengeance proposé ? Oui (margin =', S.nemesis.margin, '%)');

console.log('\n=== 6. PACK VENGEANCE (rage-pay) ===');
buyVengeance();
console.log('Dépensé total:', S.spent, '| Gemmes:', S.gems, '| VIP:', vip());

console.log('\n=== 7. 30 NUITS : vieillissement, morts, héritiers ===');
let heirs = 0, deaths = 0;
for (let n=0; n<30; n++) {
  const deadBefore = S.heroes.filter(h=>!h.alive).length;
  night();
  closeReport();
  if (S.pendingHeir) { heirs++; heir(Math.random()<0.5); }
  const deadAfter = S.heroes.filter(h=>!h.alive).length;
  if (deadAfter > deadBefore) deaths += deadAfter - deadBefore;
}
console.log('Jour:', S.day, '| Morts:', deaths, '| Héritiers formés:', heirs);
console.log('Héros:', S.heroes.map(h=>`${h.name}${h.alive?'':'💀'}(${h.age}a,G${h.gen},${h.power})`).join(', '));

console.log('\n=== 8. WHALE SIMULATION : pack 99.99 x3 ===');
buy(99.99, 13000); buy(99.99, 13000); buy(99.99, 13000);
console.log('Dépensé:', S.spent.toFixed(2), '| VIP:', vip(), vip()>=5 ? '🐋 BALEINE' : '');

console.log('\n=== 9. PERSISTANCE ===');
save();
const reloaded = JSON.parse(global.localStorage.getItem('empire'));
console.log('Sauvegarde OK:', reloaded.player, 'jour', reloaded.day, '|', reloaded.heroes.length, 'héros |', reloaded.journal.length, 'entrées journal');

console.log('\n=== 10. TIRAGE PITY GARANTI ===');
S.pity = 89; const b4 = S.heroes.length; pull();
console.log('Pull à pity 89→ garanti SSR ?', S.heroes.length > b4 ? 'OUI ✅' : 'NON ❌', '| pity reset:', S.pity);

console.log('\n=== TOUS LES SYSTÈMES TESTÉS ===');
console.log('Journal (10 dernières entrées):');
S.journal.slice(0,10).forEach(j=>console.log('  ', j));
