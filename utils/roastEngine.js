const fs = require('fs');
const path = require('path');

const ROASTS_FILE = path.join(__dirname, '..', 'data', 'roasts.json');

// Base Core Bank of Competitive Gaming Roasts & Disrespect Shredders
const DEFAULT_ROASTS = [
  'Totem pop huna na paudai lobby pugchas radi ko choro, yaha aayera thulo kura garna laaz lagdaina?',
  'Screen ma herera khelirasas ki kando le? 0 hits connect bhako chaina, chat ma chai 100 excuses!',
  'W-tap garna aaudaina, sprint reset ko spelling thaha chaina, aayera daju haru agadi ufrincha b**te!',
  'Tero game sense herda lagcha PC ma Minecraft haina ludo kheliraheko chas!',
  'Afno tier herda negative points aauncha hola, ani yaha aayera pro banna khojchas radi ko choro!',
  'Nova ko agadi tero aukaat k ho? Euta bot bhanda badi damage ta server ko zombie le garcha!',
  'Mji aafno haisiyat her, owner ko agadi euta sabda bolne aukat chaina tero!',
  'Aru ko server ma aayera barking garna banda gar, aafno inventory her pahila khali cha!',
  'Who invited this unranked clown to bark in Nova server? Sidhai nikalera phaldim?',
  'Tero bau le internet bill tiridiyeko Nova ko chat ma clown banera comedy garna ho?',
  'Mic on garera VC ma bolne himmat chaina, text chat ma matra keyboard warrior banchas mji!',
  'Pahila pearl throw garera safe land garna sikh, void ma khasera kando dekhaune clown!',
  'Pot splash garda aafnai feet ma hanna aaudaina, hawa ma fyalera opponent lai heal garidincha jatha!',
  'Duel ma 1 hit lagyo ki sidhai disconnect garera bhaagne coward, yaha aayera sher banchas?',
  'Tero aim ta NASA le research garnu parne raicha — screen ko charai tira ghumcha tara player lai chhudaina!',
  'Bro le mouse haina washing machine chalayera kheliracha jasto cha, 0 tracking!',
  'Euta crystal place garna 5 second lagcha mji, ani CPvP ko kura garna aayeko chas?',
  'Ping ko excuse dina banda gar radi ko choro, 20-ping ma ni tero skill 999-ping jastai cha!',
  'Lag bhayo bhandai roiraheko chas, tero dimag ma chai real lag bhako raicha!',
  'Nova ko members sanga duel ma 0-5 le hareko birsis ki aaja feri aafno aukaat dekhauna aais?',
  'Tero armor dura her, Prot IV ko netherite lagayera ni leather armor jasto tutchas!',
  'Mace smash garna uffrincha, ani tala khsera aafai half-heart ma pugcha clown!',
  'Inventory organize garna aaudaina, hotbar ma ghas ra dirt bokera fight khelna aauxas jatha?',
  'Chat ma matra thulo banne keyboard warrior, 1v1 duel ma request aayo ki offline hunchas radi ko choro!',
  'Tero game mechanics herda lagcha Minecraft aaja bihana matra install gareko chas!',
];

function loadRoasts() {
  try {
    if (fs.existsSync(ROASTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ROASTS_FILE, 'utf8'));
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.error('[RoastEngine] Error loading roasts.json:', err.message);
  }
  saveRoasts(DEFAULT_ROASTS);
  return [...DEFAULT_ROASTS];
}

function saveRoasts(list) {
  try {
    fs.writeFileSync(ROASTS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.error('[RoastEngine] Error saving roasts.json:', err.message);
  }
}

let activeRoastPool = loadRoasts();

/**
 * Modular Dynamic Roast Ingredients for Real-Time On-The-Fly Synthesis
 */
const ROAST_PARTS = {
  openers: [
    'Oi clown,',
    'Aukaat ma bas b**te,',
    'Radi ko choro,',
    'Mji sun na,',
    'Who let this zero-skill clown speak?',
    'Tero dimag ghoda le lathyeko ho ki,',
    'Screen ma herera bol jatha,',
    'Aru ko chat ma aayera hero nabana mji,',
  ],
  gameplayFails: [
    '0 hits connect garna sakya chainas',
    'totem pop bhayera lobby pugsakyo tero character',
    'pearl void ma falera aafai marchas',
    'pot splash opponent lai garera heal dinchas',
    'aim hawa ma falera 360 degree spin matra hanchas',
    'ping ko excuse diyera aafno noobpana lukauna khojchas',
    'duel ma 1 hit lagepachi logout garera vagchas',
    'Prot IV set lagayera ni 2 hit ma melt hunchas',
  ],
  closers: [
    'ani yaha aayera pro banera barking garna laaz lagdaina?',
    'pahila tutorial herera game khelna sikh b**te!',
    'tero bau le internet bill yehi clown show garna tirya ho?',
    'Nova ko owner ko agadi bolne haisiyat chaina tero!',
    'VC ma aayera 1v1 duel khelne aat chaina, chat ma matra keyboard warrior banchas!',
    'sidhai lobby ma pathaidim radi ko choro?',
    'euta bot bhanda kam skill cha tero, kando ma lathhi thosdim?',
  ],
};

/**
 * Dynamically synthesizes a brand-new, unique gaming roast in real time
 */
function synthesizeDynamicRoast(topicContext = '') {
  const opener = ROAST_PARTS.openers[Math.floor(Math.random() * ROAST_PARTS.openers.length)];
  const fail = ROAST_PARTS.gameplayFails[Math.floor(Math.random() * ROAST_PARTS.gameplayFails.length)];
  const closer = ROAST_PARTS.closers[Math.floor(Math.random() * ROAST_PARTS.closers.length)];

  const roast = `${opener} ${fail}, ${closer}`;

  // Automatically learn and evolve: save newly combined novel roasts into persistent memory
  recordLearnedRoast(roast);
  return roast;
}

/**
 * Gets a fresh roast from the growing active pool or dynamically creates a new one
 */
function getRandomRoast(userContext = '') {
  if (Math.random() < 0.4 || activeRoastPool.length < 5) {
    return synthesizeDynamicRoast(userContext);
  }
  const idx = Math.floor(Math.random() * activeRoastPool.length);
  return activeRoastPool[idx];
}

/**
 * Records a newly generated or experienced roast into persistent memory so it never forgets
 */
function recordLearnedRoast(newRoast = '') {
  const clean = newRoast.trim();
  if (!clean || clean.length < 15) return false;

  const exists = activeRoastPool.some((r) => r.toLowerCase() === clean.toLowerCase());
  if (!exists) {
    activeRoastPool.push(clean);
    // Keep top 200 persistent roasts
    if (activeRoastPool.length > 200) {
      activeRoastPool.shift();
    }
    saveRoasts(activeRoastPool);
    return true;
  }
  return false;
}

module.exports = {
  loadRoasts,
  getRandomRoast,
  synthesizeDynamicRoast,
  recordLearnedRoast,
  ROAST_PARTS,
};
