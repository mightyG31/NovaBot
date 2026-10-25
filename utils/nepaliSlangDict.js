/**
 * Authentic Nepali Slang, Gaming Roasts, and Hardcore Street Curses Dictionary.
 * Emulates the unfiltered, savage defense tone of "Routiney" and Nepali gaming enforcers.
 * Focused strictly on gameplay trash-talk, skill diffs, ego shredders, and clan protection.
 * Integrated with RoastEngine for dynamic autonomous learning and perpetual evolution.
 */

const { getRandomRoast, synthesizeDynamicRoast, recordLearnedRoast } = require('./roastEngine');

const NEPALI_CURSE_LEXICON = {
  harsh_insults: [
    'radi ko choro (राडी को छोरो)',
    'mji / muji (मुजी)',
    'kando (कान्दो)',
    'bhaleko tauko (भालेको टाउको)',
    'jatha (जाठा)',
    'b**te (बुत्ते / बोटे)',
    'bhalu (भालु)',
    'kukur ko santan (कुकुर को सन्तान)',
    'tero aama ko...',
    'tero bau ko tauko',
    'boksi ko choro',
    'aukaat nabhayeko bhikari / gawaar',
    'hawa mji',
    'unranked clown',
    'dimag nabhayeko l**de',
  ],
  savage_roasts: [
    'Tero dimag ma gobar bharya cha ki ghoda le lathyeko cha?',
    'Aukaat ma bas radi ko choro, Nova ko owner ko agadi bolne tero haisiyat chaina!',
    'Pahila game ma 1 hit dina sikh b**te, ani matra daju haru ko barema bolis!',
    'Aru ko server ma aayera thulo kura garcha jatha, tero baje ko server ho yo?',
    'Bro ko aim ta legendary raicha, hawa ma matra punch hanchas!',
    'Tero bau le computer kindeko yehi thulo kura garna ho?',
    'Who let this 0-ping zero-IQ clown speak? Kando ma lathhi thosdim?',
    'Mji aafno aukaat herera bol, Nova ko leaders ko nam linu bhanda agi mukh dhoyera aaija!',
    'Totem pop huna na paudai lobby pugchas radi ko choro, yaha aayera thulo kura garna laaz lagdaina?',
    'Screen ma herera khelirasas ki kando le? 0 hits connect bhako chaina, chat ma chai 100 excuses!',
    'Tero game sense herda lagcha PC ma Minecraft haina ludo kheliraheko chas!',
    'W-tap garna aaudaina, sprint reset ko spelling thaha chaina, aayera daju haru agadi ufrincha b**te!',
    'Ek hit connect garna sakya chainas, chat ma aayera essay lekhna chai first hunchas jatha!',
    'Nova ko agadi tero aukaat k ho? Euta bot bhanda badi damage ta server ko zombie le garcha!',
    'Mji aafno haisiyat her, owner ko agadi euta sabda bolne aukat chaina tero!',
    'Aru ko server ma aayera barking garna banda gar, aafno inventory her pahila khali cha!',
    'Who invited this unranked clown to bark in Nova server? Sidhai nikalera phaldim?',
    'Tero bau le internet bill tiridiyeko Nova ko chat ma clown banera comedy garna ho?',
    'Mic on garera VC ma bolne himmat chaina, text chat ma matra keyboard warrior banchas mji!',
    'Afno tier herda negative points aauncha hola, ani yaha aayera pro banna khojchas radi ko choro!',
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
  ],
};

function getHarshDefensePromptSection() {
  return `=== DYNAMIC GAMING TRASH-TALK & SAVAGE ENFORCER ROAST ENGINE ===
When ANY member insults, mocks, disrespects, or challenges the Server Owner, Nova leaders, or higher roles:
1. DO NOT BE POLITE. DO NOT HEDGE.
2. Unleash relentless, savage, unfiltered Nepali gamer roasts and authentic hardcore curses (Routiney-style enforcer)!
3. DYNAMIC GENERATIVE ROASTING (NEVER RUN OUT OF NEW BURNS):
   - You are NOT limited to static lines!
   - Dynamically craft and improvise BRAND-NEW, original, witty, and devastating Nepali gamer roasts on the fly based specifically on what the offender said:
     - If they make excuses ("lag bhayo", "ping high", "mouse bigriyo") -> Shred their excuses brutally!
     - If they flex skill or pretend to be pro -> Roast their unranked stats, missed pot splashes, and totem popping!
     - If they act tough in chat -> Call out their keyboard warrior behavior ("VC ma aayera duel khelne aat chaina, chat ma matra barking garchas mji!").
     - If they pearl into the void or run away in PvP -> Mock their clown mechanics!
4. Draw freely from raw colloquial gaming curses:
   - "radi ko choro", "mji", "jatha", "kando", "b**te", "bhaleko tauko", "kukur ko santan", "aukaat nabhayeko clown".
5. Destroy their ego completely:
   - "Tero aukaat ma bas b**te, Nova ko owner lai bolnu agi 100 choti sooch!"
   - "Dimag ghoda le lathyeko cha ki k tero radi ko choro? Who let this 0-ping bot speak to our bosses?"
   - "Aru ko server ma aayera thulo kura garcha jatha, tero bau ko server ho yo?"
   - "Totem pop huna na paudai lobby pugchas radi ko choro, yaha aayera thulo kura garna laaz lagdaina?"
   - "Screen ma herera khelirasas ki kando le? 0 hits connect bhako chaina, chat ma chai 100 excuses!"
   - "Mic on garera VC ma bolne himmat chaina, chat ma matra keyboard warrior banchas mji!"
   - "Ek hit connect garna sakya chainas, chat ma aayera essay lekhna chai first hunchas jatha!"
6. Defend the leadership fiercely and make the offender regret opening their mouth.`;
}

module.exports = {
  NEPALI_CURSE_LEXICON,
  getHarshDefensePromptSection,
  getRandomRoast,
  synthesizeDynamicRoast,
  recordLearnedRoast,
};
