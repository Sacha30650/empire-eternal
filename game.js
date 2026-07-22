(() => {
  'use strict';

  // =========================================================
  // EMPIRE ETERNAL v4 — état, progression et migration
  // =========================================================
  const SAVE_KEY = 'empire-eternal-v4';
  const OLD_KEY = 'empirefx';
  const VERSION = 4;
  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const todayKey = () => new Date().toISOString().slice(0, 10);
  const formatNumber = (n) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 10000 ? `${(n / 1000).toFixed(1)}k` : Math.floor(n).toString();
  const uid = () => Math.random().toString(36).slice(2, 9);

  const HERO_LIBRARY = [
    {key:'maeve', name:'Maeve', role:'Gardienne', icon:'🛡️', color:'#667eea', skill:'Bastion astral', base:180, blurb:'Absorbe le choc et protège toute l’escouade.'},
    {key:'lyra', name:'Lyra', role:'Rôdeuse', icon:'🏹', color:'#49d890', skill:'Pluie d’étoiles', base:170, blurb:'Frappe tous les ennemis avant qu’ils n’approchent.'},
    {key:'orion', name:'Orion', role:'Chronomage', icon:'🔮', color:'#ad70ff', skill:'Nova temporelle', base:185, blurb:'Ralentit le temps et fracture les lignes ennemies.'},
    {key:'aldric', name:'Aldric', role:'Paladin', icon:'⚔️', color:'#efb956', skill:'Serment solaire', base:205, blurb:'Un duelliste capable de survivre au cœur de la mêlée.'},
    {key:'nyx', name:'Nyx', role:'Assassine', icon:'🗡️', color:'#f05d7b', skill:'Éclipse', base:220, blurb:'Téléporte ses lames derrière la cible prioritaire.'},
    {key:'eira', name:'Eira', role:'Tisseuse', icon:'❄️', color:'#63c8ff', skill:'Hiver immobile', base:200, blurb:'Gèle les groupes et rend chaque seconde précieuse.'}
  ];

  const CAMPAIGN = [
    {id:1, x:.16, y:.76, region:'Val d’Astra', name:'La route brisée', biome:'meadow', enemy:'Éclaireurs du Néant', power:420, waves:2},
    {id:2, x:.38, y:.68, region:'Val d’Astra', name:'Bois des murmures', biome:'forest', enemy:'Meute corrompue', power:560, waves:2},
    {id:3, x:.65, y:.73, region:'Val d’Astra', name:'Le pont des cendres', biome:'meadow', enemy:'Légion grise', power:710, waves:2},
    {id:4, x:.83, y:.60, region:'Val d’Astra', name:'Gardien du val', biome:'ruins', enemy:'Golem d’obsidienne', power:930, waves:3, boss:true},
    {id:5, x:.64, y:.49, region:'Marches de Cendre', name:'La gorge rouge', biome:'ash', enemy:'Pillards de braise', power:1170, waves:2},
    {id:6, x:.38, y:.45, region:'Marches de Cendre', name:'Forges abandonnées', biome:'ash', enemy:'Automates fous', power:1420, waves:2},
    {id:7, x:.19, y:.35, region:'Marches de Cendre', name:'Le siège silencieux', biome:'ruins', enemy:'Chevaliers creux', power:1710, waves:3},
    {id:8, x:.42, y:.27, region:'Marches de Cendre', name:'La Reine de braise', biome:'lava', enemy:'Vharra l’Incandescente', power:2050, waves:3, boss:true},
    {id:9, x:.70, y:.31, region:'Faille d’Onyx', name:'Lisière impossible', biome:'void', enemy:'Ombres inversées', power:2450, waves:2},
    {id:10,x:.84, y:.20, region:'Faille d’Onyx', name:'Archives du temps', biome:'void', enemy:'Archivistes déchus', power:2920, waves:3},
    {id:11,x:.57, y:.13, region:'Faille d’Onyx', name:'Trône des échos', biome:'void', enemy:'Conseil des doubles', power:3470, waves:3},
    {id:12,x:.27, y:.16, region:'Faille d’Onyx', name:'Kaeltherion éternel', biome:'cosmic', enemy:'Kaeltherion, Roi-Némésis', power:4200, waves:3, boss:true}
  ];

  const QUEST_TEMPLATES = [
    {id:'wins', title:'Briser la ligne', text:'Remporte 2 missions', target:2, reward:{gold:500}, metric:'wins'},
    {id:'skills', title:'Maîtrise tactique', text:'Utilise 6 compétences', target:6, reward:{aether:35}, metric:'skills'},
    {id:'upgrade', title:'Un royaume plus fort', text:'Améliore un héros ou un bâtiment', target:1, reward:{gold:350,aether:15}, metric:'upgrades'}
  ];

  function newHero(key, level = 1) {
    const def = HERO_LIBRARY.find((h) => h.key === key) || HERO_LIBRARY[0];
    return {id:uid(), key:def.key, name:def.name, role:def.role, icon:def.icon, color:def.color, level, xp:0, power:def.base + (level - 1) * 55, shards:0, alive:true, age:24, gen:1};
  }

  function defaultState() {
    return {
      version:VERSION, player:'Sacha', level:1, xp:0, gold:1500, aether:260, energy:100,
      campaign:1, nodeStars:{}, totalStars:0, battles:0, wins:0, skills:0, upgrades:0,
      heroes:[newHero('maeve'), newHero('lyra'), newHero('orion')],
      active:['maeve','lyra','orion'],
      buildings:{castle:1, mine:1, forge:1, guild:1},
      production:0, productionTick:Date.now(), lastSeen:Date.now(),
      portalPity:0, portalPulls:0, freePullDate:'',
      questsDate:todayKey(), questClaims:{},
      sound:true, haptics:true, tutorialSeen:false,
      nemesis:{name:'Kaeltherion', rank:1}, relics:0
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return normalizeState(JSON.parse(raw));
      const oldRaw = localStorage.getItem(OLD_KEY);
      if (oldRaw) {
        const old = JSON.parse(oldRaw);
        const fresh = defaultState();
        fresh.gold = Math.max(1500, Number(old.gold) || 0);
        fresh.aether = Math.max(260, Number(old.gems) || 0);
        fresh.energy = clamp(Number(old.energy) || 100, 0, 100);
        if (Array.isArray(old.heroes) && old.heroes.length) {
          const keys = ['maeve','aldric','orion'];
          fresh.heroes = old.heroes.slice(0, 3).map((h, i) => {
            const hero = newHero(keys[i] || 'lyra', Math.max(1, Math.floor((Number(h.power) || 200) / 300)));
            hero.name = String(h.name || hero.name);
            hero.power = Math.max(hero.power, Number(h.power) || hero.power);
            hero.age = Number(h.age) || 24;
            hero.gen = Number(h.gen) || 1;
            return hero;
          });
          while (fresh.heroes.length < 3) fresh.heroes.push(newHero(keys[fresh.heroes.length]));
          fresh.active = fresh.heroes.slice(0, 3).map((h) => h.key);
        }
        return fresh;
      }
    } catch (error) {
      console.warn('Sauvegarde illisible, nouveau royaume.', error);
    }
    return defaultState();
  }

  function normalizeState(input) {
    const base = defaultState();
    const state = {...base, ...input};
    state.version = VERSION;
    state.buildings = {...base.buildings, ...(input.buildings || {})};
    state.nodeStars = input.nodeStars || {};
    state.questClaims = input.questClaims || {};
    state.heroes = Array.isArray(input.heroes) && input.heroes.length ? input.heroes.map((h) => {
      const def = HERO_LIBRARY.find((d) => d.key === h.key) || HERO_LIBRARY[0];
      return {...newHero(def.key), ...h, icon:def.icon, color:def.color, role:def.role};
    }) : base.heroes;
    if (state.questsDate !== todayKey()) {
      state.questsDate = todayKey();
      state.questClaims = {};
      state.dailyBaseline = {wins:state.wins || 0, skills:state.skills || 0, upgrades:state.upgrades || 0};
      state.freePullDate = '';
    }
    state.dailyBaseline = state.dailyBaseline || {wins:0, skills:0, upgrades:0};
    return state;
  }

  let S = loadState();
  let pendingOffline = null;
  const elapsedOffline = clamp(Date.now() - (Number(S.lastSeen) || Date.now()), 0, 8 * 60 * 60 * 1000);
  if (elapsedOffline > 3 * 60 * 1000) {
    const hours = elapsedOffline / 3600000;
    pendingOffline = {
      gold:Math.floor(hours * (90 + S.buildings.mine * 45)),
      energy:Math.min(40, Math.floor(hours * 5)),
      minutes:Math.floor(elapsedOffline / 60000)
    };
  }
  S.lastSeen = Date.now();

  function saveState() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (error) { console.warn('Sauvegarde impossible', error); }
  }
  window.addEventListener('pagehide', () => { S.lastSeen = Date.now(); saveState(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { S.lastSeen = Date.now(); saveState(); } });

  // =========================================================
  // DOM, audio, vibration, affichage général
  // =========================================================
  const canvas = $('game');
  const ctx = canvas.getContext('2d', {alpha:false});
  let W = 430, H = 932, DPR = 1;
  let scene = 'base';
  let sceneTime = 0;
  let lastFrame = performance.now();
  let toastTimer = 0;
  let deferredInstall = null;
  let audioContext = null;
  let userActivated = false;
  document.addEventListener('pointerdown', (event) => { if (event.isTrusted) userActivated = true; }, {capture:true});
  let shake = 0;
  let particles = [];
  let floaters = [];
  let projectiles = [];
  let hotspots = [];
  let selectedNode = null;
  let battle = null;
  let timing = null;
  let portalAnim = null;
  let productionAccumulator = 0;
  const captureMode = new URLSearchParams(location.search).get('capture');

  const UNIT_SPRITE_PATHS = {
    maeve:'assets/units/allies/maeve.png',
    lyra:'assets/units/allies/lyra.png',
    orion:'assets/units/allies/orion.png',
    brute:'assets/units/enemies/brute.png',
    raider:'assets/units/enemies/raider.png',
    caster:'assets/units/enemies/caster.png'
  };
  const unitSprites = {};
  for (const [key, src] of Object.entries(UNIT_SPRITE_PATHS)) {
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
    unitSprites[key] = image;
  }
  const battleBackgrounds = {};
  const forestBackground = new Image();
  forestBackground.decoding = 'async';
  forestBackground.src = 'assets/environments/forest.webp';
  battleBackgrounds.forest = forestBackground;

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.min(window.innerWidth, 700);
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function initAudio() {
    if (!S.sound) return;
    try { audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)(); if (audioContext.state === 'suspended') audioContext.resume(); } catch (_) {}
  }
  function tone(freq = 440, duration = .08, type = 'sine', volume = .04, delay = 0) {
    if (!S.sound) return;
    initAudio();
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, audioContext.currentTime + delay);
    gain.gain.setValueAtTime(0, audioContext.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, audioContext.currentTime + delay + .01);
    gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + delay + duration);
    osc.connect(gain).connect(audioContext.destination); osc.start(audioContext.currentTime + delay); osc.stop(audioContext.currentTime + delay + duration + .02);
  }
  function sound(name) {
    if (name === 'tap') tone(280,.05,'sine',.025);
    if (name === 'hit') tone(105,.07,'square',.025);
    if (name === 'skill') { tone(280,.14,'sine',.04); tone(560,.2,'sine',.035,.05); }
    if (name === 'coin') { tone(660,.09,'sine',.035); tone(880,.12,'sine',.03,.06); }
    if (name === 'victory') [523,659,784,1046].forEach((f,i)=>tone(f,.32,'triangle',.04,i*.1));
    if (name === 'defeat') { tone(180,.3,'sawtooth',.035); tone(120,.45,'sawtooth',.03,.18); }
  }
  function haptic(pattern = 12) { if (userActivated && S.haptics && navigator.vibrate) navigator.vibrate(pattern); }
  function toast(text) {
    const el = $('toast'); el.textContent = text; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
  function flash(color = '#fff', opacity = .7) {
    const el = $('flash'); el.style.background = color; el.style.opacity = opacity;
    setTimeout(() => { el.style.opacity = 0; }, 90);
  }
  function addParticles(x, y, color, count = 15, speed = 140) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * speed + 20;
      particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-20,life:.45+Math.random()*.55,max:1,size:1.5+Math.random()*3.5,color,gravity:90});
    }
  }
  function addFloater(x, y, text, color = '#fff', size = 12) { floaters.push({x,y,text,color,size,life:.85,max:.85}); }

  function playerXpNeeded() { return 220 + (S.level - 1) * 140; }
  function teamPower() { return S.heroes.filter((h) => S.active.includes(h.key)).reduce((sum,h)=>sum+h.power,0) + (S.buildings.forge - 1) * 90; }
  function addPlayerXp(amount) {
    S.xp += amount;
    while (S.xp >= playerXpNeeded()) {
      S.xp -= playerXpNeeded(); S.level++; S.energy = Math.min(100, S.energy + 30);
      toast(`👑 Niveau de royaume ${S.level} !`); sound('victory');
    }
  }
  function refreshHUD() {
    $('gold').textContent = formatNumber(S.gold);
    $('aether').textContent = formatNumber(S.aether);
    $('energy').textContent = Math.floor(S.energy);
    $('levelBadge').textContent = S.level;
    const claimable = QUEST_TEMPLATES.some((q) => questProgress(q) >= q.target && !S.questClaims[q.id]);
    $('questDot').classList.toggle('hidden', !claimable);
    $('mapDot').classList.toggle('hidden', S.campaign > CAMPAIGN.length);
    saveState();
  }

  // =========================================================
  // Quêtes et récompenses
  // =========================================================
  function questProgress(q) {
    const baseline = S.dailyBaseline || {wins:0,skills:0,upgrades:0};
    return Math.max(0, (S[q.metric] || 0) - (baseline[q.metric] || 0));
  }
  function claimQuest(id) {
    const q = QUEST_TEMPLATES.find((x) => x.id === id);
    if (!q || questProgress(q) < q.target || S.questClaims[id]) return;
    S.questClaims[id] = true;
    if (q.reward.gold) S.gold += q.reward.gold;
    if (q.reward.aether) S.aether += q.reward.aether;
    addParticles(W/2,H*.35,'#f2c45e',28,190); sound('coin'); haptic([15,30,15]);
    refreshHUD(); showQuests(); toast('Récompense de quête récupérée !');
  }
  function showQuests() {
    const completed = QUEST_TEMPLATES.filter((q)=>S.questClaims[q.id]).length;
    showSheet(`
      <div class="sheetEyebrow">ORDRES DU CONSEIL</div>
      <h2 class="sheetTitle">Quêtes du jour</h2>
      <p class="sheetLead">De courts objectifs qui récompensent votre façon de jouer, sans série punitive.</p>
      <div class="row"><span>Progression du conseil</span><b>${completed}/${QUEST_TEMPLATES.length}</b></div>
      ${QUEST_TEMPLATES.map((q)=>{
        const p = Math.min(q.target, questProgress(q)); const claimed = !!S.questClaims[q.id];
        return `<div class="quest ${p>=q.target?'done':''}"><div class="questHead"><b>${q.title}</b><span>${p}/${q.target}</span></div><p>${q.text}</p><div class="progress"><i style="width:${p/q.target*100}%"></i></div>${claimed?'<p>✓ Récompense récupérée</p>':p>=q.target?`<button onclick="EE.claimQuest('${q.id}')">RÉCUPÉRER</button>`:`<p>${rewardText(q.reward)}</p>`}</div>`;
      }).join('')}
    `);
  }
  function rewardText(r) { return [r.gold?`${r.gold} 🪙`:'',r.aether?`${r.aether} ✦`:''].filter(Boolean).join(' + '); }

  // =========================================================
  // Feuilles / navigation
  // =========================================================
  function showSheet(html) { $('sheetContent').innerHTML = html; $('sheet').classList.remove('hidden'); $('sheetBackdrop').classList.remove('hidden'); }
  function closeSheet() { $('sheet').classList.add('hidden'); $('sheetBackdrop').classList.add('hidden'); }
  $('sheetClose').addEventListener('click', closeSheet);
  $('sheetBackdrop').addEventListener('click', closeSheet);
  $('questsBtn').addEventListener('click', () => { sound('tap'); showQuests(); });
  $('profileBtn').addEventListener('click', () => {
    sound('tap');
    showSheet(`<div class="sheetEyebrow">PROFIL DU SOUVERAIN</div><h2 class="sheetTitle">${S.player}</h2>
      <div class="statGrid"><div class="stat"><small>NIVEAU</small><b>${S.level}</b></div><div class="stat"><small>VICTOIRES</small><b>${S.wins}</b></div><div class="stat"><small>ÉTOILES</small><b>${S.totalStars}</b></div></div>
      <div class="row"><span>Progression</span><b>${S.xp}/${playerXpNeeded()} XP</b></div><div class="progress"><i style="width:${S.xp/playerXpNeeded()*100}%"></i></div>
      <button class="secondaryButton" onclick="EE.toggleSound()">${S.sound?'🔊 Sons activés':'🔇 Sons coupés'}</button>
      <button class="secondaryButton" onclick="EE.toggleHaptics()">${S.haptics?'📳 Vibrations activées':'📴 Vibrations coupées'}</button>
      <button class="secondaryButton" onclick="EE.install()">＋ INSTALLER L’APPLICATION</button>`);
  });

  function switchScene(next) {
    if (battle && !battle.ended && scene === 'battle') return;
    closeSheet(); scene = next; sceneTime = 0; hotspots = []; selectedNode = null;
    $('battleHUD').classList.add('hidden'); $('combatActions').classList.add('hidden'); $('bottomNav').classList.remove('hidden'); $('sceneTitle').classList.remove('hidden');
    if (deferredInstall) $('installBtn').classList.remove('hidden');
    document.querySelectorAll('#bottomNav button').forEach((b)=>b.classList.toggle('active',b.dataset.scene===next));
    const labels = {
      base:["CITADELLE D'ASTRA",'Votre royaume'], map:['CHRONIQUES DE LA FRACTURE','La campagne'],
      heroes:['LA GARDE ÉTERNELLE','Vos héros'], portal:['SANCTUAIRE DES ÉCHOS','Le portail astral']
    }[next] || ['', ''];
    $('sceneEyebrow').textContent = labels[0]; $('sceneName').textContent = labels[1]; sound('tap');
  }
  document.querySelectorAll('#bottomNav button').forEach((button)=>button.addEventListener('click',()=>switchScene(button.dataset.scene)));

  // =========================================================
  // Citadelle : production et bâtiments
  // =========================================================
  const BUILDING_DATA = {
    castle:{name:'Château d’Astra',icon:'🏰',desc:'Le cœur du royaume. Chaque niveau renforce toute l’escouade.'},
    mine:{name:'Mine stellaire',icon:'⛏️',desc:'Produit de l’or pendant votre présence et votre absence.'},
    forge:{name:'Forge runique',icon:'⚒️',desc:'Ajoute de la puissance à tous les héros actifs.'},
    guild:{name:'Hall des héros',icon:'🛡️',desc:'Améliore les récompenses d’expérience de mission.'}
  };
  function buildingCost(key) { const level = S.buildings[key]; const base = {castle:900,mine:420,forge:650,guild:550}[key]; return Math.floor(base * Math.pow(1.72, level - 1)); }
  function buildingBonus(key) {
    const l=S.buildings[key];
    if(key==='castle')return `+${(l-1)*4}% PV d’escouade`;
    if(key==='mine')return `${90+l*45} or/heure`;
    if(key==='forge')return `+${(l-1)*90} puissance`;
    return `+${(l-1)*8}% XP de mission`;
  }
  function showBuilding(key) {
    const data=BUILDING_DATA[key], level=S.buildings[key], cost=buildingCost(key);
    showSheet(`<div class="sheetEyebrow">BÂTIMENT DE LA CITADELLE</div><h2 class="sheetTitle">${data.icon} ${data.name}</h2><p class="sheetLead">${data.desc}</p>
      <div class="statGrid"><div class="stat"><small>NIVEAU</small><b>${level}</b></div><div class="stat"><small>BONUS</small><b>${buildingBonus(key)}</b></div><div class="stat"><small>PROCHAIN</small><b>Niv. ${level+1}</b></div></div>
      ${key==='mine'?`<div class="row"><span>Stock produit</span><b>${Math.floor(S.production)} 🪙</b></div><button class="secondaryButton" ${S.production<1?'disabled':''} onclick="EE.collectProduction()">RÉCOLTER LA PRODUCTION</button>`:''}
      <button class="primaryButton" ${S.gold<cost?'disabled':''} onclick="EE.upgradeBuilding('${key}')">AMÉLIORER — ${cost} 🪙</button>`);
  }
  function upgradeBuilding(key) {
    const cost=buildingCost(key); if(S.gold<cost)return;
    S.gold-=cost;S.buildings[key]++;S.upgrades++;addPlayerXp(35+S.buildings[key]*8);refreshHUD();
    sound('victory');haptic([15,30,15]);flash('#f2c45e',.28);addParticles(W/2,H*.55,'#f2c45e',38,210);showBuilding(key);toast(`${BUILDING_DATA[key].name} niveau ${S.buildings[key]} !`);
  }
  function collectProduction() {
    const amount=Math.floor(S.production);if(amount<1)return;S.production-=amount;S.gold+=amount;refreshHUD();sound('coin');haptic(15);showBuilding('mine');toast(`+${amount} or récolté`);
  }

  // =========================================================
  // Héros : amélioration et portail
  // =========================================================
  function heroUpgradeCost(hero) { return Math.floor(240 * Math.pow(1.35, hero.level - 1)); }
  function upgradeHero(id) {
    const hero=S.heroes.find((h)=>h.id===id);if(!hero)return;const cost=heroUpgradeCost(hero);if(S.gold<cost)return;
    S.gold-=cost;hero.level++;hero.power+=55+S.buildings.forge*8;S.upgrades++;addPlayerXp(28);refreshHUD();sound('skill');haptic(18);addParticles(W*.5,H*.45,hero.color,25,170);showHeroesPanel();toast(`${hero.name} atteint le niveau ${hero.level}`);
  }
  function showHeroesPanel() {
    showSheet(`<div class="sheetEyebrow">GARDE ÉTERNELLE</div><h2 class="sheetTitle">Escouade active</h2><p class="sheetLead">Trois rôles complémentaires. Améliorez-les pour progresser, mais vos compétences en combat restent décisives.</p>
      <div class="row"><span>Puissance totale</span><b>${teamPower()} ⚔️</b></div>
      ${S.heroes.map((hero)=>{const active=S.active.includes(hero.key),cost=heroUpgradeCost(hero);return `<div class="heroCard"><div class="portrait" style="border-color:${hero.color};box-shadow:0 0 18px ${hero.color}33">${hero.icon}</div><div class="heroMeta"><h3>${hero.name} ${active?'✦':''}</h3><small>${hero.role} • Niv. ${hero.level}</small><small>${(HERO_LIBRARY.find(h=>h.key===hero.key)||HERO_LIBRARY[0]).skill}</small></div><div class="heroPower">${hero.power}⚔️<button ${S.gold<cost?'disabled':''} onclick="EE.upgradeHero('${hero.id}')">+ NIV. ${cost}🪙</button></div></div>`}).join('')}`);
  }
  function portalCost() { return S.freePullDate===todayKey()?120:0; }
  function summon() {
    const cost=portalCost();if(S.aether<cost)return;if(cost)S.aether-=cost;else S.freePullDate=todayKey();S.portalPulls++;S.portalPity++;
    closeSheet();portalAnim={time:0,reveal:false,result:null};sound('skill');addParticles(W/2,H*.43,'#9d6bff',45,230);refreshHUD();
  }
  function resolveSummon() {
    const ownedKeys=S.heroes.map((h)=>h.key);let pool=HERO_LIBRARY.filter((h)=>!ownedKeys.includes(h.key));const guaranteed=S.portalPity>=10;
    if((Math.random()<.32||guaranteed)&&pool.length){const def=pick(pool);const hero=newHero(def.key,Math.max(1,S.level));hero.power+=guaranteed?90:0;S.heroes.push(hero);S.portalPity=0;portalAnim.result={title:'NOUVEAU HÉROS',name:def.name,icon:def.icon,color:def.color,text:def.blurb};}
    else{const hero=pick(S.heroes);const shards=rand(12,22);hero.shards=(hero.shards||0)+shards;portalAnim.result={title:'ÉCHO RENFORCÉ',name:hero.name,icon:hero.icon,color:hero.color,text:`+${shards} fragments. À 50, sa puissance augmente.`};if(hero.shards>=50){hero.shards-=50;hero.power+=80;hero.level++;portalAnim.result.text+=' Éveil accompli : +80 puissance !';}}
    portalAnim.reveal=true;flash('#c7a3ff',.65);sound('victory');haptic([20,40,20]);addParticles(W/2,H*.43,portalAnim.result.color,65,300);refreshHUD();
  }
  function showPortalPanel() {
    const cost=portalCost();
    showSheet(`<div class="sheetEyebrow">SANCTUAIRE DES ÉCHOS</div><h2 class="sheetTitle">Appel astral</h2><p class="sheetLead">Invoquez un nouveau héros ou renforcez un compagnon existant. Un héros non possédé est garanti au dixième écho.</p>
      <div class="statGrid"><div class="stat"><small>ÉTHER</small><b>${S.aether} ✦</b></div><div class="stat"><small>GARANTI</small><b>${S.portalPity}/10</b></div><div class="stat"><small>HÉROS</small><b>${S.heroes.length}/6</b></div></div>
      <button class="primaryButton" ${S.aether<cost?'disabled':''} onclick="EE.summon()">${cost===0?'ÉCHO GRATUIT DU JOUR':`INVOQUER — ${cost} ✦`}</button>
      <p class="sheetLead" style="text-align:center;margin-top:8px">L’éther s’obtient en campagne et via les quêtes. Aucun paiement réel dans ce prototype.</p>`);
  }

  // =========================================================
  // Campagne et combat
  // =========================================================
  function missionCost(node) { return node.boss ? 10 : 7; }
  function showMission(id) {
    const node=CAMPAIGN.find((n)=>n.id===id);if(!node)return;selectedNode=id;const unlocked=id<=S.campaign;const stars=S.nodeStars[id]||0;const cost=missionCost(node);
    showSheet(`<div class="sheetEyebrow">${node.region.toUpperCase()} • MISSION ${String(id).padStart(2,'0')}</div><h2 class="sheetTitle">${node.boss?'☠️ ':''}${node.name}</h2><p class="sheetLead">${node.enemy} contrôle ce passage. ${node.boss?'Une relique ancienne pulse derrière son armure.':'Reprenez la route avant que la fracture ne gagne du terrain.'}</p>
      <div class="statGrid"><div class="stat"><small>ENNEMI</small><b>${node.power}⚔️</b></div><div class="stat"><small>VAGUES</small><b>${node.waves}</b></div><div class="stat"><small>RECORD</small><b>${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</b></div></div>
      <div class="rewardPills"><span class="pill">🪙 ${120+id*65}</span><span class="pill">✦ ${node.boss?45:12+id}</span><span class="pill">👑 ${55+id*8} XP</span></div>
      <button class="primaryButton ${node.boss?'dangerButton':''}" ${!unlocked||S.energy<cost?'disabled':''} onclick="EE.startMission(${id})">${unlocked?S.energy<cost?'ÉNERGIE INSUFFISANTE':`DÉPLOYER — ${cost} ⚡`:'MISSION VERROUILLÉE'}</button>
      <p class="sheetLead" style="text-align:center;margin-top:8px">En combat : touchez un ennemi pour le cibler et enchaînez vos trois compétences.</p>`);
  }

  function makeFighter(type, ally, x, y, index, node) {
    if(ally){
      const hero=S.heroes.filter(h=>S.active.includes(h.key))[index%3] || S.heroes[index%S.heroes.length];
      const castleHp=1+(S.buildings.castle-1)*.04;const hp=Math.round((210+hero.level*34+hero.power*.16)*castleHp);
      const data={maeve:{range:35,speed:44,rate:1.05},lyra:{range:170,speed:50,rate:1.22},orion:{range:145,speed:45,rate:1.38},aldric:{range:38,speed:52,rate:.94},nyx:{range:32,speed:68,rate:.8},eira:{range:135,speed:43,rate:1.3}}[hero.key]||{range:45,speed:48,rate:1.1};
      return{id:uid(),ally:true,type:hero.key,name:hero.name,icon:hero.icon,color:hero.color,x,y,hp,maxHp:hp,shield:0,dmg:Math.round(17+hero.power*.055),range:data.range,speed:data.speed,rate:data.rate,cd:Math.random()*.5,target:null,hit:0,slow:0,phase:index*.8,dead:false};
    }
    const elite=node.boss&&index===0;const waveScale=1+(battle.wave-1)*.17;const baseHp=(elite?560:100+node.id*21)*waveScale;const colors={meadow:'#d65e62',forest:'#a75c52',ruins:'#8b7d9f',ash:'#d06b46',lava:'#ec4e33',void:'#7354b7',cosmic:'#cf477e'};
    return{id:uid(),ally:false,type:elite?'boss':pick(['raider','brute','caster']),name:elite?node.enemy:'Corrompu',icon:elite?'☠️':'',color:colors[node.biome]||'#d65e62',x,y,hp:Math.round(baseHp),maxHp:Math.round(baseHp),shield:0,dmg:Math.round((12+node.id*2.3)*(elite?1.55:1)),range:elite?48:rand(0,2)===0?120:35,speed:elite?32:35+rand(0,14),rate:elite?1.15:1.25+Math.random()*.35,cd:Math.random(),target:null,hit:0,slow:0,phase:index*.7,dead:false};
  }

  function startMission(id) {
    const node=CAMPAIGN.find((n)=>n.id===id);if(!node||id>S.campaign)return;const cost=missionCost(node);if(S.energy<cost)return;
    S.energy-=cost;S.battles++;refreshHUD();closeSheet();scene='battle';sceneTime=0;particles=[];floaters=[];projectiles=[];shake=0;
    battle={node,wave:1,totalWaves:node.waves,time:0,units:[],ended:false,won:false,waveDelay:0,timingDone:false,paused:false,combo:1,lastSkill:-99,skills:{bulwark:0,volley:0,nova:0},maxTeamHp:0,startAt:performance.now(),focus:null};
    spawnWave(true);$('bottomNav').classList.add('hidden');$('sceneTitle').classList.add('hidden');$('battleHUD').classList.remove('hidden');$('combatActions').classList.remove('hidden');
    $('installBtn').classList.add('hidden');sound('skill');haptic(15);toast(`Mission ${id} — ${node.name}`);
  }

  function spawnWave(first=false) {
    const node=battle.node;const allies=battle.units.filter((u)=>u.ally&&!u.dead&&u.hp>0);
    if(first){for(let i=0;i<3;i++)battle.units.push(makeFighter('hero',true,58, H*.40+i*86,i,node));battle.maxTeamHp=battle.units.reduce((s,u)=>s+u.maxHp,0);}
    else{allies.forEach((u,i)=>{u.x=58;u.y=H*.40+i*86;u.target=null;u.hp=Math.min(u.maxHp,u.hp+Math.round(u.maxHp*.12));});}
    const count=Math.min(7,3+Math.floor(node.id/2)+(battle.wave>1?1:0));
    const enemyTop=H*.28,enemyBottom=H*.74;
    for(let i=0;i<count;i++)battle.units.push(makeFighter('enemy',false,W-48-rand(0,24),enemyTop+i*((enemyBottom-enemyTop)/Math.max(1,count-1)),i,node));
    battle.waveDelay=0; $('waveLabel').textContent=`VAGUE ${battle.wave}/${battle.totalWaves}`;sound('tap');
  }

  function useSkill(key) {
    if(!battle||battle.ended||battle.paused||battle.skills[key]>0)return;
    const now=battle.time;battle.combo=now-battle.lastSkill<=3?Math.min(4,battle.combo+1):1;battle.lastSkill=now;S.skills++;
    const mult=1+(battle.combo-1)*.18;const allies=battle.units.filter(u=>u.ally&&!u.dead);const enemies=battle.units.filter(u=>!u.ally&&!u.dead);
    if(key==='bulwark'){allies.forEach(u=>{u.shield+=Math.round((55+S.buildings.castle*12)*mult);addFloater(u.x,u.y-40,'BOUCLIER','#77b9ff',10)});battle.skills[key]=12;addParticles(W*.25,H*.52,'#61a7ff',38,180);}
    if(key==='volley'){enemies.forEach((u,i)=>{const damage=Math.round((42+teamPower()*.018)*mult);setTimeout(()=>{if(!u.dead){projectiles.push({x:W*.3+i*5,y:80,tx:u,life:.35,max:.35,damage,color:'#f2c45e',arc:true});}},i*55)});battle.skills[key]=9;addParticles(W*.35,H*.22,'#f2c45e',28,160);}
    if(key==='nova'){enemies.forEach(u=>{dealDamage(u,Math.round((28+teamPower()*.012)*mult),'#ca9cff');u.slow=5;});battle.skills[key]=14;addParticles(W*.68,H*.48,'#9d6bff',55,240);shake=7;flash('#9d6bff',.23);}
    updateSkillButtons();sound('skill');haptic([12,20,12]);saveState();
  }
  document.querySelectorAll('.skill').forEach((button)=>button.addEventListener('click',()=>useSkill(button.dataset.skill)));

  function dealDamage(target, amount, color='#fff') {
    if(!target||target.dead)return;let remaining=amount;
    if(target.shield>0){const absorbed=Math.min(target.shield,remaining);target.shield-=absorbed;remaining-=absorbed;if(absorbed)addFloater(target.x,target.y-35,`-${absorbed} 🛡`,'#77b9ff',9);}
    if(remaining>0){target.hp-=remaining;target.hit=.14;addFloater(target.x+rand(-7,7),target.y-33,`-${remaining}`,color,11);}
    addParticles(target.x,target.y-12,target.ally?'#72b8ff':'#ff777d',4,85);sound('hit');
    if(target.hp<=0){target.hp=0;target.dead=true;target.target=null;addParticles(target.x,target.y-8,target.color,18,190);haptic(8);}
  }

  function triggerTiming() {
    if(!battle||battle.timingDone||battle.ended)return;battle.paused=true;battle.timingDone=true;
    timing={start:performance.now(),duration:5200,resolved:false,scale:2.5};$('timingEvent').classList.remove('hidden');sound('skill');haptic([10,40,10]);
  }
  function resolveTiming(auto=false) {
    if(!timing||timing.resolved)return;timing.resolved=true;const scale=timing.scale;const diff=Math.abs(scale-1);let grade,damage,color;
    if(!auto&&diff<.12){grade='PARFAIT';damage=185;color='#f2c45e';}
    else if(!auto&&diff<.36){grade='BIEN';damage=105;color='#9d6bff';}
    else{grade='MANQUÉ';damage=45;color='#8890a4';}
    $('timingGrade').textContent=grade;$('timingGrade').style.color=color;flash(color,.5);shake=grade==='PARFAIT'?13:5;haptic(grade==='PARFAIT'?[25,30,25]:12);sound(grade==='PARFAIT'?'victory':'hit');
    battle.units.filter(u=>!u.ally&&!u.dead).forEach(u=>dealDamage(u,damage,color));
    setTimeout(()=>{$('timingEvent').classList.add('hidden');$('timingGrade').textContent='';battle.paused=false;timing=null;},700);
  }
  $('timingTarget').addEventListener('pointerdown',(event)=>{event.preventDefault();resolveTiming(false)});

  function updateBattle(dt) {
    if(!battle||battle.ended||battle.paused)return;
    battle.time+=dt;sceneTime+=dt;Object.keys(battle.skills).forEach(k=>battle.skills[k]=Math.max(0,battle.skills[k]-dt));updateSkillButtons();
    const alive=battle.units.filter(u=>!u.dead);const allies=alive.filter(u=>u.ally);const enemies=alive.filter(u=>!u.ally);
    $('allyCount').textContent=allies.length;$('enemyCount').textContent=enemies.length;$('battleTime').textContent=`${Math.floor(battle.time/60)}:${String(Math.floor(battle.time%60)).padStart(2,'0')}`;
    if(!battle.timingDone&&battle.time>3.2&&allies.length&&enemies.length)triggerTiming();
    if(enemies.length===0){
      if(battle.wave<battle.totalWaves){battle.waveDelay+=dt;if(battle.waveDelay>1.15){battle.wave++;spawnWave(false);toast(`Vague ${battle.wave}/${battle.totalWaves}`);}}
      else finishBattle(true);return;
    }
    if(allies.length===0){finishBattle(false);return;}
    for(const u of alive){
      u.cd=Math.max(0,u.cd-dt);u.hit=Math.max(0,u.hit-dt);u.slow=Math.max(0,u.slow-dt);u.phase+=dt*7;
      const foes=u.ally?enemies:allies;
      if(!u.target||u.target.dead){let best=Infinity;for(const f of foes){const d=Math.hypot(f.x-u.x,f.y-u.y);if(d<best){best=d;u.target=f;}}}
      if(!u.target)continue;const d=Math.hypot(u.target.x-u.x,u.target.y-u.y);
      if(d<=u.range){if(u.cd<=0){u.cd=u.rate;const damage=Math.round(u.dmg*(.88+Math.random()*.24));if(u.range>70)projectiles.push({x:u.x,y:u.y-18,tx:u.target,life:.32,max:.32,damage,color:u.color,arc:u.type==='lyra'});else{dealDamage(u.target,damage,u.color);shake=Math.max(shake,2.5);}}}
      else{const slow=u.slow>0?.48:1;u.x+=(u.target.x-u.x)/d*u.speed*slow*dt;u.y+=(u.target.y-u.y)/d*u.speed*slow*dt;}
    }
    // Painted sprites need more breathing room than the former geometric tokens.
    // Keep members of the same faction apart without preventing melee contact.
    for(let i=0;i<alive.length;i++)for(let j=i+1;j<alive.length;j++){
      const a=alive[i],b=alive[j];if(a.ally!==b.ally)continue;
      let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);const min=a.type==='brute'||b.type==='brute'?54:46;
      if(d>=min)continue;if(d<.01){dx=1;dy=0;d=1;}
      const push=(min-d)*.5,nx=dx/d,ny=dy/d;
      a.x=clamp(a.x-nx*push,28,W-28);a.y=clamp(a.y-ny*push,H*.20,H*.78);
      b.x=clamp(b.x+nx*push,28,W-28);b.y=clamp(b.y+ny*push,H*.20,H*.78);
    }
    for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];if(!p.tx||p.tx.dead){projectiles.splice(i,1);continue;}p.life-=dt;if(p.life<=0){dealDamage(p.tx,p.damage,p.color);projectiles.splice(i,1);}}
  }

  function updateSkillButtons() {
    if(!battle)return;document.querySelectorAll('.skill').forEach(button=>{const cd=battle.skills[button.dataset.skill];const max={bulwark:12,volley:9,nova:14}[button.dataset.skill];button.classList.toggle('ready',cd<=0);button.querySelector('.cooldown').style.transform=`scaleY(${clamp(cd/max,0,1)})`;});$('comboMeter').querySelector('b').textContent=`x${battle.combo}`;
  }

  function finishBattle(won) {
    if(!battle||battle.ended)return;battle.ended=true;battle.won=won;
    setTimeout(()=>showResult(won),650);
  }
  function showResult(won) {
    const node=battle.node;let stars=0,gold=0,aether=0,xp=0;
    if(won){const allies=battle.units.filter(u=>u.ally&&!u.dead);const hp=allies.reduce((s,u)=>s+u.hp,0);const ratio=hp/Math.max(1,battle.maxTeamHp);stars=1+(ratio>.45?1:0)+(ratio>.72&&battle.time<70?1:0);gold=120+node.id*65;aether=node.boss?45:12+node.id;xp=Math.round((55+node.id*8)*(1+(S.buildings.guild-1)*.08));S.gold+=gold;S.aether+=aether;S.wins++;addPlayerXp(xp);const previous=S.nodeStars[node.id]||0;S.nodeStars[node.id]=Math.max(previous,stars);S.totalStars+=Math.max(0,stars-previous);if(node.id===S.campaign)S.campaign=Math.min(CAMPAIGN.length+1,S.campaign+1);if(node.boss)S.relics++;sound('victory');haptic([25,40,25]);}
    else{sound('defeat');haptic(80);}
    refreshHUD();$('resultKicker').textContent=won?'MISSION ACCOMPLIE':'L’ESCOUADE A CÉDÉ';$('resultTitle').textContent=won?'VICTOIRE':'DÉFAITE';$('resultStars').textContent=won?'★'.repeat(stars)+'☆'.repeat(3-stars):'☠';$('resultSummary').textContent=won?`${node.enemy} est vaincu en ${Math.floor(battle.time)} secondes. La route suivante est désormais accessible.`:'Améliorez vos héros, votre forge ou changez le rythme de vos compétences avant de revenir.';$('resultLoot').innerHTML=won?`<span>🪙 ${gold}</span><span>✦ ${aether}</span><span>👑 ${xp} XP</span>`:'<span>💡 Les compétences interrompent l’avantage ennemi.</span>';$('resultContinue').textContent=won?'VOIR LA CARTE':'RETOURNER À LA CITADELLE';$('resultScreen').classList.remove('hidden');
  }
  $('resultContinue').addEventListener('click',()=>{$('resultScreen').classList.add('hidden');battle=null;projectiles=[];floaters=[];particles=[];switchScene(scene==='battle'&&$('resultTitle').textContent==='VICTOIRE'?'map':'base');refreshHUD();});

  // =========================================================
  // Dessin procédural — scènes
  // =========================================================
  const stars=Array.from({length:95},()=>({x:Math.random(),y:Math.random(),s:.4+Math.random()*1.5,p:Math.random()*6.28}));
  const clouds=Array.from({length:7},(_,i)=>({x:Math.random(),y:.12+Math.random()*.32,s:.55+Math.random()*.8,v:3+Math.random()*4,p:i}));
  const walkers=Array.from({length:8},(_,i)=>({x:Math.random(),y:.68+Math.random()*.18,v:(i%2?1:-1)*(5+Math.random()*7),color:pick(['#b95b55','#486da5','#c89b48','#735c9c'])}));
  function rounded(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
  function text(txt,x,y,size,color='#fff',align='center',font='Inter',weight=700){ctx.fillStyle=color;ctx.textAlign=align;ctx.font=`${weight} ${size}px ${font}`;ctx.fillText(txt,x,y);}
  function gradient(top,bottom){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,top);g.addColorStop(1,bottom);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
  function drawImageCover(image,x,y,w,h){const scale=Math.max(w/image.naturalWidth,h/image.naturalHeight),sw=w/scale,sh=h/scale,sx=(image.naturalWidth-sw)/2,sy=(image.naturalHeight-sh)/2;ctx.drawImage(image,sx,sy,sw,sh,x,y,w,h);}
  function drawStars(t,alpha=1,maxY=.75){for(const s of stars){ctx.globalAlpha=(.25+.75*Math.abs(Math.sin(t*.001+s.p)))*alpha;ctx.fillStyle='#fff';ctx.fillRect(s.x*W,s.y*H*maxY,s.s,s.s);}ctx.globalAlpha=1;}
  function drawParticles(dt){
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.gravity*dt;ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    for(let i=floaters.length-1;i>=0;i--){const f=floaters[i];f.life-=dt;if(f.life<=0){floaters.splice(i,1);continue;}f.y-=26*dt;ctx.globalAlpha=f.life/f.max;text(f.text,f.x,f.y,f.size,f.color); }ctx.globalAlpha=1;
  }

  function drawBase(t,dt) {
    hotspots=[];gradient('#161232','#5b4267');drawStars(t,.65,.48);
    const moonX=W*.82,moonY=H*.16;ctx.fillStyle='#fff1c8';ctx.beginPath();ctx.arc(moonX,moonY,24,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,241,200,.12)';ctx.beginPath();ctx.arc(moonX,moonY,43,0,Math.PI*2);ctx.fill();
    for(const c of clouds){c.x+=c.v*dt;if(c.x>1.2)c.x=-.25;ctx.globalAlpha=.12;ctx.fillStyle='#efeaff';ctx.beginPath();ctx.ellipse(c.x*W,c.y*H,50*c.s,14*c.s,0,0,Math.PI*2);ctx.ellipse(c.x*W+25*c.s,c.y*H-8*c.s,32*c.s,17*c.s,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    ctx.fillStyle='#252342';ctx.beginPath();ctx.moveTo(0,H*.58);for(let x=0;x<=W;x+=18)ctx.lineTo(x,H*.56+Math.sin(x*.026)*28);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
    ctx.fillStyle='#1b2635';ctx.fillRect(0,H*.64,W,H*.4);ctx.fillStyle='#243b3b';for(let i=0;i<80;i++){const x=(i*83)%W,y=H*.65+(i*47)%(H*.26);ctx.fillRect(x,y,2,5);}
    // Rivière animée
    ctx.fillStyle='#263e63';ctx.beginPath();ctx.moveTo(W*.63,H*.62);ctx.bezierCurveTo(W*.55,H*.72,W*.78,H*.78,W*.7,H);ctx.lineTo(W,H);ctx.bezierCurveTo(W*.86,H*.82,W*.73,H*.70,W*.77,H*.62);ctx.fill();for(let i=0;i<8;i++){ctx.strokeStyle=`rgba(117,179,229,${.1+i*.015})`;ctx.beginPath();const yy=H*.67+i*37+(t*.02%25);ctx.moveTo(W*.62,yy);ctx.lineTo(W*.79,yy+9);ctx.stroke();}
    drawCastle(W*.47,H*.57,1.12+S.buildings.castle*.045,t);
    drawMine(W*.13,H*.66,.84,t);drawForge(W*.77,H*.61,.84,t);drawGuild(W*.19,H*.82,.78,t);
    // habitants
    for(const p of walkers){p.x+=p.v*dt/W;if(p.x<-.05)p.x=1.05;if(p.x>1.05)p.x=-.05;drawTinyPerson(p.x*W,p.y*H,p.color,t+p.x*9);}
    // points interactifs
    const basePulse=1+Math.sin(t*.004)*.06;
    const defs=[['castle',W*.47,H*.45,'CHÂTEAU'],['mine',W*.13,H*.62,'MINE'],['forge',W*.77,H*.56,'FORGE'],['guild',W*.19,H*.78,'HÉROS']];
    for(const [key,x,y,label] of defs){hotspots.push({type:'building',key,x,y,r:42});ctx.save();ctx.translate(x,y-45);ctx.scale(basePulse,basePulse);ctx.fillStyle='rgba(12,9,28,.82)';rounded(-34,-10,68,20,9);ctx.fill();ctx.strokeStyle='#7c679f';ctx.stroke();text(label,0,4,7,'#e9ddff');ctx.restore();}
    if(S.production>=1){const x=W*.13,y=H*.53;ctx.fillStyle='#f2c45e';ctx.beginPath();ctx.arc(x,y,16+Math.sin(t*.005)*2,0,Math.PI*2);ctx.fill();text('🪙',x,y+5,15,'#201401');hotspots.push({type:'collect',x,y,r:28});}
    drawParticles(dt);
  }

  function drawCastle(x,y,s,t){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(0,105,105,18,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#68657a';ctx.fillRect(-67,-18,134,112);ctx.fillStyle='#555265';for(let i=-2;i<=2;i++)ctx.fillRect(i*28-10,-34,20,20);for(const tx of[-86,55]){ctx.fillStyle='#5e5b70';ctx.fillRect(tx,-64,54,156);ctx.fillStyle='#d45355';ctx.beginPath();ctx.moveTo(tx-7,-64);ctx.lineTo(tx+27,-107);ctx.lineTo(tx+61,-64);ctx.fill();ctx.fillStyle=Math.sin(t*.003+tx)>-.2?'#ffd77b':'#282339';ctx.fillRect(tx+20,-24,14,24);}ctx.fillStyle='#777389';ctx.fillRect(-34,-85,68,70);ctx.fillStyle='#e8b64c';ctx.beginPath();ctx.moveTo(-40,-85);ctx.lineTo(0,-126);ctx.lineTo(40,-85);ctx.fill();ctx.fillStyle='#272239';ctx.beginPath();ctx.arc(0,93,25,Math.PI,0);ctx.fill();ctx.fillRect(-25,70,50,24);for(let i=0;i<4;i++){ctx.fillStyle=Math.sin(t*.004+i)>.1?'#ffd77b':'#302944';ctx.fillRect(-48+i*30,8,13,20);}ctx.strokeStyle='#aaa';ctx.beginPath();ctx.moveTo(0,-126);ctx.lineTo(0,-157);ctx.stroke();ctx.fillStyle='#c94250';ctx.beginPath();ctx.moveTo(0,-157);ctx.quadraticCurveTo(18,-153+Math.sin(t*.004)*5,32,-154);ctx.lineTo(30,-140);ctx.quadraticCurveTo(14,-142,0,-140);ctx.fill();ctx.restore();}
  function drawMine(x,y,s,t){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle='#312c3b';ctx.beginPath();ctx.moveTo(-48,34);ctx.lineTo(-34,-15);ctx.lineTo(0,-42);ctx.lineTo(42,-20);ctx.lineTo(54,34);ctx.fill();ctx.fillStyle='#11101b';ctx.beginPath();ctx.arc(0,30,24,Math.PI,0);ctx.fill();ctx.fillRect(-24,28,48,20);ctx.strokeStyle='#8c6b45';ctx.lineWidth=4;ctx.strokeRect(-28,3,56,47);ctx.fillStyle='#75c7ff';ctx.globalAlpha=.6+.3*Math.sin(t*.006);for(const [px,py] of[[-34,-5],[38,8],[8,-25]]){ctx.beginPath();ctx.moveTo(px,py-7);ctx.lineTo(px+6,py);ctx.lineTo(px,py+7);ctx.lineTo(px-5,py);ctx.fill();}ctx.globalAlpha=1;ctx.restore();}
  function drawForge(x,y,s,t){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle='#49404a';ctx.fillRect(-45,-30,90,74);ctx.fillStyle='#9b4c37';ctx.beginPath();ctx.moveTo(-52,-30);ctx.lineTo(0,-65);ctx.lineTo(52,-30);ctx.fill();ctx.fillStyle='#2a1c1c';ctx.fillRect(-20,5,40,39);const glow=.55+.35*Math.sin(t*.008);ctx.fillStyle=`rgba(255,110,43,${glow})`;ctx.fillRect(-14,13,28,25);ctx.fillStyle='#555';ctx.fillRect(26,-75,17,60);ctx.globalAlpha=.18;ctx.fillStyle='#ddd';ctx.beginPath();ctx.arc(35,-90-(t*.01%25),12,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.restore();}
  function drawGuild(x,y,s,t){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle='#50485f';ctx.fillRect(-55,-30,110,70);ctx.fillStyle='#6f4a61';ctx.beginPath();ctx.moveTo(-65,-30);ctx.lineTo(0,-69);ctx.lineTo(65,-30);ctx.fill();ctx.fillStyle='#282139';ctx.fillRect(-14,2,28,38);ctx.strokeStyle='#f2c45e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-7,-42);ctx.lineTo(7,-25);ctx.moveTo(7,-42);ctx.lineTo(-7,-25);ctx.stroke();ctx.restore();}
  function drawTinyPerson(x,y,color,t){ctx.save();ctx.translate(x,y);const b=Math.sin(t*6)*1.5;ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(0,4,5,2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=color;ctx.fillRect(-3,-8+b,6,10);ctx.fillStyle='#dcb894';ctx.beginPath();ctx.arc(0,-11+b,3,0,Math.PI*2);ctx.fill();ctx.restore();}

  function drawMap(t,dt){
    hotspots=[];gradient('#172339','#351f47');drawStars(t,.35,.4);
    // parchemin/carte vivante
    ctx.fillStyle='#28344a';ctx.beginPath();ctx.moveTo(0,H*.22);for(let x=0;x<=W;x+=16)ctx.lineTo(x,H*.22+Math.sin(x*.022)*17);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
    // régions colorées
    ctx.fillStyle='rgba(63,119,85,.38)';ctx.beginPath();ctx.ellipse(W*.42,H*.69,W*.44,H*.24,-.1,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(151,71,45,.25)';ctx.beginPath();ctx.ellipse(W*.45,H*.39,W*.39,H*.21,.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(105,68,150,.25)';ctx.beginPath();ctx.ellipse(W*.59,H*.20,W*.38,H*.15,-.15,0,Math.PI*2);ctx.fill();
    // chemins
    ctx.lineCap='round';for(let i=0;i<CAMPAIGN.length-1;i++){const a=mapPos(CAMPAIGN[i]),b=mapPos(CAMPAIGN[i+1]);ctx.strokeStyle=i+2<=S.campaign?'rgba(242,196,94,.78)':'rgba(128,117,151,.28)';ctx.lineWidth=4;ctx.setLineDash(i+2<=S.campaign?[]:[4,7]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo((a.x+b.x)/2,a.y-18,(b.x),(b.y));ctx.stroke();}ctx.setLineDash([]);
    for(const node of CAMPAIGN){const p=mapPos(node),unlocked=node.id<=S.campaign,complete=(S.nodeStars[node.id]||0)>0,current=node.id===S.campaign;const pulse=current?1+Math.sin(t*.005)*.12:1;ctx.save();ctx.translate(p.x,p.y);ctx.scale(pulse,pulse);if(current){ctx.strokeStyle='rgba(242,196,94,.25)';ctx.lineWidth=8;ctx.beginPath();ctx.arc(0,0,25,0,Math.PI*2);ctx.stroke();}ctx.fillStyle=!unlocked?'#29273a':node.boss?'#a53b4c':complete?'#b9832f':'#635092';ctx.beginPath();ctx.arc(0,0,node.boss?19:15,0,Math.PI*2);ctx.fill();ctx.strokeStyle=unlocked?'#f5dc93':'#5d5870';ctx.lineWidth=2;ctx.stroke();text(!unlocked?'🔒':node.boss?'☠':String(node.id),0,5,node.boss?13:10,'#fff');if(complete)text('★'.repeat(S.nodeStars[node.id]),0,31,8,'#f2c45e');ctx.restore();hotspots.push({type:'node',key:node.id,x:p.x,y:p.y,r:27});}
    text(`${S.totalStars} ★ obtenues`,W/2,H-83,10,'#e7d8ff');drawParticles(dt);
  }
  function mapPos(node){const top=86,bottom=H-77;return{x:node.x*W,y:top+node.y*(bottom-top)}}

  function drawHeroes(t,dt){
    hotspots=[];gradient('#100c25','#291f43');drawStars(t,.5,.55);ctx.fillStyle='#17132c';ctx.fillRect(0,H*.65,W,H*.35);ctx.fillStyle='#211941';ctx.beginPath();ctx.ellipse(W/2,H*.72,W*.43,48,0,0,Math.PI*2);ctx.fill();
    const active=S.heroes.filter(h=>S.active.includes(h.key)).slice(0,3);active.forEach((h,i)=>{const x=W*(.22+i*.28),y=H*.53+Math.sin(t*.002+i)*4;drawHeroPortrait(h,x,y,1.15,t);text(h.name,x,y+74,11,'#fff');text(`${h.role} • ${h.power}⚔`,x,y+90,8,'#9f94be');hotspots.push({type:'hero',key:h.id,x,y,r:48});});
    ctx.fillStyle='rgba(16,12,35,.82)';rounded(20,H*.76,W-40,70,14);ctx.fill();text('GARDE ÉTERNELLE',W/2,H*.79,9,'#f2c45e');text(`${teamPower()} puissance d’escouade`,W/2,H*.82,16,'#fff','center','Cinzel',700);text('Touchez un héros pour consulter sa fiche',W/2,H*.845,9,'#9186ab');drawParticles(dt);
  }
  function drawHeroPortrait(hero,x,y,s,t){
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);
    // Socle, halo et cadre de rareté
    ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(0,31,29,8,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=hero.color;ctx.lineWidth=3;ctx.fillStyle='#171128';ctx.beginPath();ctx.arc(0,-6,34,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle=hero.color;ctx.globalAlpha=.20+.08*Math.sin(t*.003);ctx.beginPath();ctx.arc(0,-6,29,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    // Épaules et cape
    ctx.fillStyle=darken(hero.color,.28);ctx.beginPath();ctx.moveTo(-25,23);ctx.quadraticCurveTo(-21,5,-10,2);ctx.lineTo(10,2);ctx.quadraticCurveTo(22,6,25,23);ctx.closePath();ctx.fill();
    ctx.fillStyle=hero.color;ctx.beginPath();ctx.moveTo(-18,25);ctx.lineTo(-12,3);ctx.lineTo(12,3);ctx.lineTo(18,25);ctx.closePath();ctx.fill();
    // Visage
    ctx.fillStyle='#e6b790';ctx.beginPath();ctx.ellipse(0,-9,12,15,0,0,Math.PI*2);ctx.fill();
    // Coiffure / casque distinctif
    if(hero.key==='maeve'||hero.key==='aldric'){
      ctx.fillStyle='#8a91a7';ctx.beginPath();ctx.arc(0,-13,13,Math.PI,0);ctx.lineTo(12,-7);ctx.lineTo(-12,-7);ctx.closePath();ctx.fill();
      ctx.fillStyle='#d1d5df';ctx.fillRect(-2,-25,4,12);
    }else if(hero.key==='orion'||hero.key==='eira'){
      ctx.fillStyle=darken(hero.color,.35);ctx.beginPath();ctx.arc(0,-10,16,Math.PI*.8,Math.PI*2.2);ctx.lineTo(10,5);ctx.lineTo(-10,5);ctx.closePath();ctx.fill();
    }else{
      ctx.fillStyle=hero.key==='nyx'?'#322238':'#6d3d31';ctx.beginPath();ctx.arc(0,-14,13,Math.PI,Math.PI*2);ctx.lineTo(10,-5);ctx.quadraticCurveTo(0,-12,-11,-4);ctx.closePath();ctx.fill();
    }
    // Yeux lumineux
    ctx.fillStyle='#fff';ctx.fillRect(-6,-10,3,2);ctx.fillRect(3,-10,3,2);ctx.fillStyle=hero.color;ctx.fillRect(-5,-10,1,2);ctx.fillRect(4,-10,1,2);
    // Emblème de classe
    ctx.fillStyle='rgba(13,9,27,.72)';ctx.beginPath();ctx.arc(0,13,9,0,Math.PI*2);ctx.fill();text(hero.icon,0,17,10,'#fff');
    // Barre de niveau
    ctx.fillStyle='#302644';ctx.fillRect(-22,28,44,5);ctx.fillStyle=hero.color;ctx.fillRect(-22,28,44*clamp(hero.level/10,.1,1),5);
    ctx.restore();
  }

  function drawPortal(t,dt){
    hotspots=[];gradient('#0b071b','#281344');drawStars(t,.8,.8);const x=W/2,y=H*.43;const rot=t*.0008*(portalAnim?3:1);for(let i=0;i<5;i++){ctx.strokeStyle=`rgba(${150+i*15},${88+i*12},255,${.58-i*.08})`;ctx.lineWidth=2+i*.4;ctx.beginPath();ctx.arc(x,y,48+i*23+Math.sin(t*.002+i)*5,rot+i*.9,rot+i*.9+Math.PI*1.55);ctx.stroke();}const g=ctx.createRadialGradient(x,y,2,x,y,65);g.addColorStop(0,'rgba(255,222,139,.9)');g.addColorStop(.25,'rgba(172,105,255,.55)');g.addColorStop(1,'rgba(89,47,151,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,66,0,Math.PI*2);ctx.fill();for(let i=0;i<18;i++){const a=rot*1.5+i*.35,r=75+(i%4)*14;ctx.fillStyle=i%3?'#ad70ff':'#f2c45e';ctx.globalAlpha=.35+.5*Math.sin(t*.004+i);ctx.beginPath();ctx.arc(x+Math.cos(a)*r,y+Math.sin(a)*r,2+(i%2),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    if(portalAnim){portalAnim.time+=dt;if(portalAnim.time>1.15&&!portalAnim.reveal)resolveSummon();if(portalAnim.reveal){const r=portalAnim.result;const scale=clamp((portalAnim.time-1.15)*3,0,1);ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='rgba(15,10,31,.92)';rounded(-145,-73,290,160,18);ctx.fill();ctx.strokeStyle=r.color;ctx.lineWidth=2;ctx.stroke();text(r.title,0,-45,9,r.color,'center','Cinzel',800);text(r.icon,0,8,48,'#fff');text(r.name,0,38,18,'#fff','center','Cinzel',800);text(r.text.length>45?r.text.slice(0,45)+'…':r.text,0,61,8,'#aaa0bf');ctx.restore();hotspots.push({type:'portalResult',x,y,r:155});}}
    else{ctx.fillStyle='rgba(15,11,32,.78)';rounded(22,H*.69,W-44,76,14);ctx.fill();text('LE PORTAIL ATTEND VOTRE APPEL',W/2,H*.72,9,'#f2c45e');text(portalCost()===0?'Écho gratuit disponible':`${portalCost()} éther par invocation`,W/2,H*.755,15,'#fff','center','Cinzel');hotspots.push({type:'portal',x:W/2,y:H*.73,r:80});}
    drawParticles(dt);
  }

  function drawBattle(t,dt){
    const node=battle.node;const palettes={meadow:['#223d31','#496346'],forest:['#122b26','#284536'],ruins:['#29283a','#484257'],ash:['#392a29','#6a4537'],lava:['#291b1c','#713324'],void:['#141027','#30234d'],cosmic:['#090718','#431b51']};const pal=palettes[node.biome]||palettes.meadow;
    const painted=battleBackgrounds[node.biome],paintedReady=painted&&painted.complete&&painted.naturalWidth;
    if(paintedReady){drawImageCover(painted,0,0,W,H);ctx.fillStyle='rgba(5,8,15,.14)';ctx.fillRect(0,0,W,H);}else gradient(pal[0],pal[1]);
    // terrain et perspective
    if(!paintedReady){ctx.fillStyle='rgba(255,255,255,.025)';for(let i=0;i<130;i++){const x=(i*97)%W,y=100+(i*53)%(H-190);ctx.fillRect(x,y,2,4);}ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=2;for(let i=0;i<8;i++){const y=H*.24+i*70;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y+12);ctx.stroke();}}
    if(!paintedReady&&(node.biome==='forest'||node.biome==='meadow')){for(let i=0;i<9;i++)drawBattleTree((i*83)%W,140+(i*119)%(H-270),.45+(i%3)*.09);}if(node.biome==='ruins'||node.biome==='ash'){for(let i=0;i<6;i++)drawRuin((i*103)%W,160+(i*97)%(H-270),.55);}if(node.biome==='void'||node.biome==='cosmic'){drawStars(t,.55,1);}
    // projectiles
    for(const p of projectiles){const q=1-p.life/p.max;const tx=p.tx.x,ty=p.tx.y-18;let x=lerp(p.x,tx,q),y=lerp(p.y,ty,q);if(p.arc)y-=Math.sin(q*Math.PI)*70;ctx.strokeStyle=p.color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-(tx-p.x)*.035,y-(ty-p.y)*.035);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();}
    const alive=battle.units.filter(u=>!u.dead).sort((a,b)=>a.y-b.y);for(const u of alive)drawFighter(u,t);
    drawParticles(dt);
  }
  function drawBattleTree(x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle='#252016';ctx.fillRect(-5,-2,10,35);ctx.fillStyle='#183829';for(const [dx,dy,r] of[[0,-20,25],[-17,-8,19],[17,-6,21]]){ctx.beginPath();ctx.arc(dx,dy,r,0,Math.PI*2);ctx.fill();}ctx.restore();}
  function drawRuin(x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle='#55505d';ctx.fillRect(-18,-25,36,55);ctx.fillStyle='#383541';ctx.fillRect(-10,-12,10,20);ctx.clearRect(2,-25,12,18);ctx.restore();}
  function drawFighter(u,t){
    ctx.save();ctx.translate(u.x,u.y);
    const moving=u.target&&!u.dead&&Math.hypot(u.target.x-u.x,u.target.y-u.y)>u.range;
    const bob=moving?Math.sin(u.phase)*2:Math.sin(t*.002+u.phase)*.7;
    const sprite=unitSprites[u.type];
    const size=u.type==='brute'?84:u.type==='raider'?70:76;

    // Grounding, target selection and shield remain procedural so every state stays readable.
    ctx.fillStyle='rgba(0,0,0,.42)';ctx.beginPath();ctx.ellipse(0,8,size*.25,5.5,0,0,Math.PI*2);ctx.fill();
    if(!u.ally){ctx.fillStyle='rgba(255,74,86,.13)';ctx.strokeStyle='rgba(255,98,111,.62)';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,5,size*.32,9,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
    if(battle.focus===u.id){ctx.strokeStyle='#f2c45e';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,5,size*.34,11,0,0,Math.PI*2);ctx.stroke();}
    if(u.shield>0){ctx.strokeStyle='rgba(105,183,255,.82)';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,-21+bob,size*.39,size*.48,0,0,Math.PI*2);ctx.stroke();}

    if(sprite&&sprite.complete&&sprite.naturalWidth){
      ctx.save();
      if(u.hit>0)ctx.filter='brightness(2.5) saturate(.25)';
      ctx.drawImage(sprite,-size/2,-size+12+bob,size,size);
      ctx.restore();
    }else{
      drawProceduralFighter(u,bob);
    }

    const barWidth=u.type==='brute'?48:42,barY=-size+8;
    ctx.fillStyle='rgba(10,7,20,.92)';rounded(-barWidth/2-2,barY-2,barWidth+4,9,4);ctx.fill();
    ctx.fillStyle=u.ally?'#55e596':'#ff626f';ctx.fillRect(-barWidth/2,barY,barWidth*clamp(u.hp/u.maxHp,0,1),5);
    if(u.shield>0){ctx.fillStyle='#61a7ff';ctx.fillRect(-barWidth/2,barY-6,barWidth*clamp(u.shield/u.maxHp,0,1),3);}
    if(u.ally||u.type==='boss')text(u.name,0,23,8,'#fff');
    ctx.restore();
  }
  function drawProceduralFighter(u,bob){
    ctx.fillStyle=u.hit>0?'#fff':u.color;ctx.beginPath();ctx.arc(0,-8+bob,u.type==='boss'?16:11,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=u.hit>0?'#fff':darken(u.color,.22);ctx.fillRect(u.type==='boss'?-12:-7,-10+bob,u.type==='boss'?24:14,u.type==='boss'?17:11);
    ctx.fillStyle=u.hit>0?'#fff':lighten(u.color,.18);ctx.beginPath();ctx.arc(0,-19+bob,u.type==='boss'?9:6,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#d9dce7';ctx.lineWidth=2;ctx.beginPath();if(u.range>70){ctx.arc(u.ally?9:-9,-9+bob,7,-1.4,1.4);}else{ctx.moveTo(u.ally?8:-8,-4+bob);ctx.lineTo(u.ally?17:-17,-18+bob);}ctx.stroke();
    if(u.icon)text(u.icon,0,-31+bob,u.type==='boss'?16:10,'#fff');
  }
  function darken(hex,a){return shadeColor(hex,-a)}function lighten(hex,a){return shadeColor(hex,a)}function shadeColor(hex,a){const n=parseInt(hex.slice(1),16),f=a<0?0:255,p=Math.abs(a),r=n>>16,g=n>>8&255,b=n&255;return'#'+(0x1000000+(Math.round((f-r)*p)+r)*0x10000+(Math.round((f-g)*p)+g)*0x100+(Math.round((f-b)*p)+b)).toString(16).slice(1)}

  // =========================================================
  // Interaction canvas
  // =========================================================
  canvas.addEventListener('pointerdown',(event)=>{
    initAudio();const rect=canvas.getBoundingClientRect();const x=(event.clientX-rect.left)*(W/rect.width),y=(event.clientY-rect.top)*(H/rect.height);
    if(scene==='battle'&&battle&&!battle.paused){const enemy=battle.units.filter(u=>!u.ally&&!u.dead).find(u=>Math.hypot(u.x-x,u.y-y)<30);if(enemy){battle.focus=enemy.id;battle.units.filter(u=>u.ally&&!u.dead).forEach(u=>u.target=enemy);addParticles(enemy.x,enemy.y,'#f2c45e',10,110);toast(`Cible prioritaire : ${enemy.name}`);haptic(9);}return;}
    const hit=[...hotspots].reverse().find(h=>Math.hypot(h.x-x,h.y-y)<=h.r);if(!hit)return;sound('tap');haptic(7);
    if(hit.type==='building')showBuilding(hit.key);
    if(hit.type==='collect')collectProduction();
    if(hit.type==='node')showMission(hit.key);
    if(hit.type==='hero')showHeroesPanel();
    if(hit.type==='portal')showPortalPanel();
    if(hit.type==='portalResult'){portalAnim=null;showPortalPanel();}
  });

  // =========================================================
  // Boucle principale
  // =========================================================
  function updateTiming(now){if(!timing||timing.resolved)return;const elapsed=now-timing.start;const phase=(elapsed%1500)/1500;timing.scale=2.5-1.75*phase;$('timingRing').style.transform=`scale(${timing.scale})`;if(elapsed>timing.duration)resolveTiming(true);}
  function updateProduction(dt){productionAccumulator+=dt;if(productionAccumulator>=1){const seconds=Math.floor(productionAccumulator);productionAccumulator-=seconds;const hourly=90+S.buildings.mine*45;const cap=hourly*8;S.production=Math.min(cap,(S.production||0)+hourly/3600*seconds);}}
  function frame(now){let dt=Math.min(.05,(now-lastFrame)/1000||0);lastFrame=now;updateProduction(dt);updateTiming(now);if(scene==='battle')updateBattle(dt);else sceneTime+=dt;
    ctx.save();if(shake>0){ctx.translate(rand(-shake,shake),rand(-shake,shake));shake=Math.max(0,shake-30*dt);}if(scene==='base')drawBase(now,dt);else if(scene==='map')drawMap(now,dt);else if(scene==='heroes')drawHeroes(now,dt);else if(scene==='portal')drawPortal(now,dt);else if(scene==='battle'&&battle)drawBattle(now,dt);ctx.restore();requestAnimationFrame(frame);}

  // =========================================================
  // PWA, hors-ligne et API de test
  // =========================================================
  window.addEventListener('beforeinstallprompt',(event)=>{event.preventDefault();deferredInstall=event;if(scene!=='battle')$('installBtn').classList.remove('hidden');});
  $('installBtn').addEventListener('click',installApp);
  async function installApp(){closeSheet();if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('installBtn').classList.add('hidden');}else{toast('Sur iPhone : Partager → Sur l’écran d’accueil');}}
  if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Service worker',error)));
  function claimOffline(){if(!pendingOffline)return;S.gold+=pendingOffline.gold;S.energy=Math.min(100,S.energy+pendingOffline.energy);pendingOffline=null;$('offlineReward').classList.add('hidden');sound('coin');haptic([15,25,15]);refreshHUD();}
  $('offlineClaim').addEventListener('click',claimOffline);
  function showOffline(){if(!pendingOffline)return;$('offlineText').textContent=`Pendant ${pendingOffline.minutes} minutes, la mine a produit ${pendingOffline.gold} or et votre armée a récupéré ${pendingOffline.energy} énergie.`;$('offlineReward').classList.remove('hidden');}

  window.EE={
    claimQuest,upgradeBuilding,collectProduction,upgradeHero,summon,startMission,
    switchScene,showMission,showHeroesPanel,showPortalPanel,install:installApp,
    toggleSound(){S.sound=!S.sound;saveState();$('sheetClose').click();$('profileBtn').click();},
    toggleHaptics(){S.haptics=!S.haptics;saveState();$('sheetClose').click();$('profileBtn').click();}
  };
  window.__EE_TEST__={getState:()=>JSON.parse(JSON.stringify(S)),getScene:()=>scene,teamPower,startMission,useSkill,triggerTiming,resolveTiming,finishBattle,switchScene,reset(){localStorage.removeItem(SAVE_KEY);location.reload();}};

  // Démarrage
  refreshHUD();switchScene('base');
  if(captureMode){
    S.tutorialSeen=true;
    if(captureMode==='battle'){setTimeout(()=>startMission(1),120);}
    else if(['base','map','heroes','portal'].includes(captureMode)){switchScene(captureMode);}
  } else if(!S.tutorialSeen){S.tutorialSeen=true;setTimeout(()=>showSheet(`<div class="sheetEyebrow">BIENVENUE, SOUVERAIN</div><h2 class="sheetTitle">La Fracture s’éveille</h2><p class="sheetLead">Votre citadelle vit, produit et grandit. Reprenez les douze territoires, améliorez vos trois héros et maîtrisez la Frappe temporelle.</p><div class="rewardPills"><span class="pill">🏰 Bâtir</span><span class="pill">🗺️ Explorer</span><span class="pill">⚔️ Commander</span></div><button class="primaryButton" onclick="document.getElementById('sheetClose').click();EE.switchScene('map')">COMMENCER LA CAMPAGNE</button>`),450);}
  if(!captureMode)setTimeout(showOffline,700);
  setInterval(()=>{S.lastSeen=Date.now();saveState();},30000);
  requestAnimationFrame(frame);
})();
