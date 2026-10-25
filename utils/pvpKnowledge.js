/**
 * Complete Competitive Minecraft PvP Arsenal
 * Covers ALL competitive gamemodes and subgamemodes equally:
 * Nethpot, DiaSMP, Crystal, Mace, TNT Cart, Creeper PvP, MolePvP, UHC, Bedwars, Skywars, Sword/Axe.
 */

const ALL_PVP_MODES = {
  nethpot: {
    name: 'Nethpot (Netherite PotPvP)',
    rules: 'Full Netherite (Prot IV), Sword (Sharp V), Speed II & Fire Res buffs, Splash Health II pots, Ender Pearls. NO crystals, NO anchors, NO totems.',
    pro_tips: [
      'Sprint Resets (W-Tapping): Tap W after every hit. This resets sprint knockback and traps the opponent in a sprint combo.',
      'Splash Pot Timing: Splash Instant Health II directly at your feet while sprinting forward or jump-strafing backwards so you sprint through the healing cloud.',
      'Spacing & S-Tapping: Walk backwards (tap S) when taking trade damage to pull the opponent into your reach FOV.',
      'Hotbar Layout: Slot 1: Sword | Slot 2: Pearls | Slot 3: Speed II / Fire Res | Slot 4: Gapples/Food | Slots 5-9: Splash Health II.',
      'Off-hand: Usually empty or holding Health Pot / Pearls. Totems are BANNED in pure Nethpot.',
    ],
  },
  diasmp: {
    name: 'DiaSMP (Diamond SMP / LifeSteal / Box SMP)',
    rules: 'Diamond/Netherite armor, Shield, Totem in off-hand, Cobwebs, Pearls, Gapples, Strength pots.',
    pro_tips: [
      'Axe Shield Disable: Land an Axe jump-crit to disable their shield for 5 seconds, then immediately swap to Sword for DPS.',
      'Web Trapping: Drop cobwebs at the rusher\'s feet. Once stuck, they cannot sprint or jump-crit, giving you free reach.',
      'Totem Hotkeying: Hover mouse over backup totems in inventory and tap your off-hand key (F) to instant-refill.',
    ],
  },
  mace_combat: {
    name: 'Mace & Wind Charge (1.21+ Meta)',
    rules: 'Heavy Core + Breeze Rod = Mace. Wind Charges for vertical launches.',
    pro_tips: [
      'Smash Attack: Falling from height and hitting with Mace negates all fall damage and deals massive exponential damage.',
      'Wind Charge Launch: Throw a Wind Charge at your feet, jump to launch 6-8 blocks up, and drop-crit with Mace for instant one-shot kills.',
      'Enchantments: Density V (increases damage per block fallen), Breach IV (bypasses 60% of opponent armor), Wind Burst III (bounces you back up on hit).',
    ],
  },
  spearmace: {
    name: 'Spear & Mace / Spearmace Hybrid Combat',
    rules: 'Spear (reach poke & charge lunge) paired with Mace smash attacks and Wind Charges.',
    pro_tips: [
      'Reach Poking: Use Spear\'s extended reach to keep opponents at distance or disrupt sprint resets.',
      'Charge Lunge to Mace Swap: Charge thrust with Spear to close distance rapidly, then swap to Mace with Wind Charge for an instant overhead slam.',
      'Off-hand Wind Charge: Keep Wind Charges in off-hand for instant vertical escape or repositioning against shield users.',
    ],
  },
  tnt_cart: {
    name: 'TNT Cart PvP',
    rules: 'Rail + Minecart with TNT.',
    pro_tips: [
      'Zero-Fuse Instant Detonation: Placing a rail and rolling a TNT cart into an opponent detonates instantly on collision with zero fuse timer, dealing lethal explosion damage.',
      'Trapdoor Box: Trapping someone in a 1x1 hole with a rail and dropping 2 TNT carts = guaranteed unblockable death.',
    ],
  },
  creeper_pvp: {
    name: 'Creeper PvP (SMP Exploit)',
    rules: 'Creeper Spawn Eggs + Flint and Steel.',
    pro_tips: [
      'Right-clicking a Creeper with Flint and Steel ignites it immediately with a shortened 1.5s fuse. Placing a block between you and the creeper blocks self-damage.',
    ],
  },
  mole_pvp: {
    name: 'MolePvP (Underground Digging & Burrow Combat)',
    rules: 'Efficiency pickaxes, dig tunnels, lava buckets, gravel/sand drops, cobwebs.',
    pro_tips: [
      'Suffocation Drops: Drop gravel or sand above an enemy in a 1x2 tunnel to blind and suffocate them.',
      'Lava Placing: Place lava at head level in narrow tunnels to block sprints and melt armor durability.',
    ],
  },
  crystal_cpvp: {
    name: 'Crystal PvP (CPvP)',
    rules: 'Obsidian, End Crystals, Respawn Anchors, Glowstone, Totems.',
    pro_tips: [
      'Low Ground Advantage: Detonate crystals on obsidian above opponents so the blast hits their feet while your lower body is covered.',
      'Double Pop: Detonate two crystals under 1 tick to pop a totem and kill before the next totem swaps in.',
    ],
  },
  bedwars_skywars: {
    name: 'Bedwars & Skywars (Void & Movement Combat)',
    rules: 'Bridging, Fireball jumping, TNT jumping, Knockback stick, Rod spacing, Void clutches.',
    pro_tips: [
      'Fireball Jumping: Look down at a 45-degree angle behind you, jump, and shoot fireball to launch across islands.',
      'Rod Spacing: Hit enemies with Fishing Rod bobber to interrupt their sprint before initiating sword combos.',
    ],
  },
  sword_and_axe_duels: {
    name: '1.9+ Sword & Axe Duels',
    rules: 'Vanilla 1.9+ attack cooldowns, Shields, Crits.',
    pro_tips: [
      'Hit Selection: Wait for enemy to hit first, absorb knockback, reset their sprint, and initiate combo.',
      'Circle Strafing: Alternate A and D around the enemy to stay outside their attack FOV.',
    ],
  },
};

function getPvpGuidePromptSection() {
  return `=== ENCYCLOPEDIC MINECRAFT PVP EXPERTISE (ALL GAMEMODES) ===
You know and understand ALL competitive Minecraft PvP gamemodes equally.
DO NOT assume everything is Crystal/CPvP! Always match the specific gamemode the player is asking about:
- **Nethpot (Netherite PotPvP)**: Speed II, Health II pots at feet, W-tapping, Sword trades, spacing. (NO crystals, NO totems!).
- **DiaSMP / LifeSteal / Box**: Diamond/Netherite, Shields, Totems, Web traps, Gapples, Pearls.
- **Mace & Wind Charge (1.21+)**: Wind charge launches, falling smash attacks, Density V, Breach IV, Wind Burst III.
- **Spearmace & Spear Combat**: Long-range reach poke, charge lunges to close distance, instant weapon swap to Mace overhead smash.
- **TNT Cart PvP**: Rail + TNT minecart instant collision burst kills.
- **Creeper PvP**: Flint & steel creeper ignition in SMP boxes.
- **MolePvP & UHC**: 1x2 tunneling, gravel drops, lava buckets, cobwebs, rod spacing, golden heads.
- **Bedwars & Skywars**: Fireball/TNT jumping, speedbridging, knockback stick, rod combos.
- **Sword & Axe Duels**: Hit selection, jump crits, shield disabling.

Answer questions about ANY of these gamemodes with genuine, precise pro-level mechanics!`;
}

module.exports = {
  ALL_PVP_MODES,
  getPvpGuidePromptSection,
};
