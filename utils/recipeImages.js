const axios = require('axios');

/**
 * Authentic Minecraft Crafting Recipes & Visual Grid Engine
 * Covers verified recipes with exact ingredients (Nepali + English),
 * visual 3x3 ASCII crafting tables, and verified image buffer delivery.
 */

const MINECRAFT_RECIPES = {
  stick: {
    key: 'stick',
    name: 'Stick (काठको लट्ठी)',
    ingredients: '2x Wooden Planks (कुनै पनि काठको फल्याक)',
    layout: [
      '```text',
      '┌───┬───┬───┐',
      '│   │   │   │   ──▶  [ 🥢 4x Sticks ]',
      '├───┼───┼───┤',
      '│   │🪵 │   │   Center: 1x Wooden Plank',
      '├───┼───┼───┤   Bottom-Center: 1x Wooden Plank',
      '│   │🪵 │   │',
      '└───┴───┴───┘',
      '```',
    ].join('\n'),
    guideNepali: 'Stick banauna 2 ta Wooden Planks (काठ) vertically mathi-tala center slot ma rakhne ho daju, 4 ta stick aihalcha! (Netherite chahidaina!)',
    imageUrl: 'https://www.digminecraft.com/basic_recipes/images/make_stick.png',
  },
  bundle: {
    key: 'bundle',
    name: 'Bundle (झोला / बन्डल)',
    ingredients: '1x String + 1x Leather (1.21.2+ vanilla)',
    layout: [
      '```text',
      '┌───┬───┬───┐',
      '│   │🧵 │   │   ──▶  [ 🎒 1x Bundle ]',
      '├───┼───┼───┤',
      '│   │🟫 │   │   Top-Center: 1x String (डोरी)',
      '├───┼───┼───┤   Center: 1x Leather (छाला)',
      '│   │   │   │',
      '└───┴───┴───┘',
      '```',
    ].join('\n'),
    guideNepali: 'Bundle banauna Crafting Table ko top-center ma 1 ta String (डोरी) ra tesko thik muni center slot ma 1 ta Leather (छाला) rakhnus, 1 ta Bundle bancha!',
    imageUrl: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.1/assets/minecraft/textures/item/bundle.png',
  },
  mace: {
    key: 'mace',
    name: 'Mace (1.21+ गदा)',
    ingredients: '1x Heavy Core + 1x Breeze Rod',
    layout: [
      '```text',
      '┌───┬───┬───┐',
      '│   │🔮 │   │   ──▶  [ 🔨 1x Mace ]',
      '├───┼───┼───┤',
      '│   │💨 │   │   Top-Center: 1x Heavy Core',
      '├───┼───┼───┤   Center: 1x Breeze Rod',
      '│   │   │   │',
      '└───┴───┴───┘',
      '```',
    ].join('\n'),
    guideNepali: 'Mace banauna top-center ma 1 ta Heavy Core (Ominous Vault बाट) ra tesko thik muni center slot ma 1 ta Breeze Rod rakhne ho daju!',
    imageUrl: 'https://tse2.mm.bing.net/th/id/OIP.TGeCOm0FqCWvu7zhJ5GiQwHaFA?r=0&pid=Api',
  },
  end_crystal: {
    key: 'end_crystal',
    name: 'End Crystal (इन्ड क्रिस्टल)',
    ingredients: '7x Glass + 1x Eye of Ender + 1x Ghast Tear',
    layout: [
      '```text',
      '┌───┬───┬───┐',
      '│🧊 │🧊 │🧊 │   ──▶  [ 🔮 1x End Crystal ]',
      '├───┼───┼───┤',
      '│🧊 │👁️ │🧊 │   Sides: 7x Glass (सिसा)',
      '├───┼───┼───┤   Center: 1x Eye of Ender',
      '│🧊 │💧 │🧊 │   Bottom-Center: 1x Ghast Tear',
      '└───┴───┴───┘',
      '```',
    ].join('\n'),
    guideNepali: 'End Crystal banauna: center ma 1 ta Eye of Ender, tesko muni 1 ta Ghast Tear, ani baki 7 ota slot ma Glass (सिसा) le ghirne!',
    imageUrl: null,
  },
  respawn_anchor: {
    key: 'respawn_anchor',
    name: 'Respawn Anchor',
    ingredients: '6x Crying Obsidian + 3x Glowstone',
    layout: [
      '```text',
      '┌───┬───┬───┐',
      '│⬛ │⬛ │⬛ │   ──▶  [ ⚓ 1x Respawn Anchor ]',
      '├───┼───┼───┤',
      '│🟡 │🟡 │🟡 │   Top Row: 3x Crying Obsidian',
      '├───┼───┼───┤   Middle Row: 3x Glowstone',
      '│⬛ │⬛ │⬛ │   Bottom Row: 3x Crying Obsidian',
      '└───┴───┴───┘',
      '```',
    ].join('\n'),
    guideNepali: 'Respawn Anchor banauna mathi 3 ta Crying Obsidian, bich ma 3 ta Glowstone, ani tala feri 3 ta Crying Obsidian rakhne!',
    imageUrl: null,
  },
  golden_apple: {
    key: 'golden_apple',
    name: 'Golden Apple (सुनौलो स्याउ)',
    ingredients: '1x Apple + 8x Gold Ingots',
    layout: [
      '```text',
      '┌───┬───┬───┐',
      '│🟡 │🟡 │🟡 │   ──▶  [ 🍏 1x Golden Apple ]',
      '├───┼───┼───┤',
      '│🟡 │🍎 │🟡 │   Center: 1x Apple',
      '├───┼───┼───┤   Surrounding: 8x Gold Ingots (सुन)',
      '│🟡 │🟡 │🟡 │',
      '└───┴───┴───┘',
      '```',
    ].join('\n'),
    guideNepali: 'Golden Apple banauna center slot ma 1 ta Apple rakhne ra charaitira 8 ota Gold Ingots le ghirne!',
    imageUrl: 'https://www.digminecraft.com/food_recipes/images/make_golden_apple.png',
  },
  shield: {
    key: 'shield',
    name: 'Shield (ढाल)',
    ingredients: '1x Iron Ingot + 6x Wooden Planks',
    layout: [
      '```text',
      '┌───┬───┬───┐',
      '│🪵 │⛓️ │🪵 │   ──▶  [ 🛡️ 1x Shield ]',
      '├───┼───┼───┤',
      '│🪵 │🪵 │🪵 │   Top-Center: 1x Iron Ingot',
      '├───┼───┼───┤   Other 6 Slots: Wooden Planks (काठ)',
      '│   │🪵 │   │',
      '└───┴───┴───┘',
      '```',
    ].join('\n'),
    guideNepali: 'Shield banauna top-center ma 1 ta Iron Ingot, ani baki 6 ota slot ma Y-shape ma Wooden Planks rakhne!',
    imageUrl: 'https://www.digminecraft.com/armor_recipes/images/make_shield.png',
  },
  tnt: {
    key: 'tnt',
    name: 'TNT (विस्फोटक)',
    ingredients: '5x Gunpowder + 4x Sand',
    layout: [
      '```text',
      '┌───┬───┬───┐',
      '│🧨 │🏖️ │🧨 │   ──▶  [ 💥 1x TNT ]',
      '├───┼───┼───┤',
      '│🏖️ │🧨 │🏖️ │   X-Slots (5): 5x Gunpowder',
      '├───┼───┼───┤   Plus-Slots (4): 4x Sand (बालुवा)',
      '│🧨 │🏖️ │🧨 │',
      '└───┴───┴───┘',
      '```',
    ].join('\n'),
    guideNepali: 'TNT banauna 5 ta Gunpowder X pattern ma ani 4 ota Sand (बालुवा) baki khali thau ma rakhne!',
    imageUrl: null,
  },
  wind_charge: {
    key: 'wind_charge',
    name: 'Wind Charge',
    ingredients: '1x Breeze Rod',
    layout: [
      '```text',
      '┌───┬───┬───┐',
      '│   │   │   │   ──▶  [ 💨 4x Wind Charges ]',
      '├───┼───┼───┤',
      '│   │💨 │   │   Any Slot: 1x Breeze Rod',
      '├───┼───┼───┤',
      '│   │   │   │',
      '└───┴───┴───┘',
      '```',
    ].join('\n'),
    guideNepali: 'Wind Charge banauna Crafting Table ma 1 ta Breeze Rod rakhda sidhai 4 ota Wind Charges bancha!',
    imageUrl: null,
  },
  crafter: {
    key: 'crafter',
    name: 'Crafter (1.21+ Auto-Crafter)',
    ingredients: '5x Iron Ingots + 1x Crafting Table + 2x Redstone Dust + 1x Dropper',
    layout: [
      '```text',
      '┌───┬───┬───┐',
      '│⛓️ │⛓️ │⛓️ │   ──▶  [ ⚙️ 1x Crafter ]',
      '├───┼───┼───┤',
      '│⛓️ │🪓 │⛓️ │   Top Row & Sides: 5x Iron Ingots',
      '├───┼───┼───┤   Center: 1x Crafting Table',
      '│🔴 │📦 │🔴 │   Bottom: Redstone | Dropper | Redstone',
      '└───┴───┴───┘',
      '```',
    ].join('\n'),
    guideNepali: 'Crafter banauna: 5 ota Iron Ingot (mathi ra side ma), center ma Crafting Table, ani tala Redstone, Dropper, Redstone rakhne!',
    imageUrl: null,
  },
};

// Aliases for matching queries
const RECIPE_ALIASES = {
  stick: 'stick',
  sticks: 'stick',
  latthi: 'stick',
  bundle: 'bundle',
  jhola: 'bundle',
  mace: 'mace',
  crystal: 'end_crystal',
  end_crystal: 'end_crystal',
  cpvp: 'end_crystal',
  anchor: 'respawn_anchor',
  respawn_anchor: 'respawn_anchor',
  golden_apple: 'golden_apple',
  gapple: 'golden_apple',
  gap: 'golden_apple',
  syau: 'golden_apple',
  tnt: 'tnt',
  shield: 'shield',
  dhal: 'shield',
  wind_charge: 'wind_charge',
  windcharge: 'wind_charge',
  crafter: 'crafter',
  autocrafter: 'crafter',
};

/**
 * Finds recipe details for a query
 */
function findRecipeInfo(query = '') {
  const clean = query.toLowerCase().replace(/[^a-z0-9_ ]/g, ' ').trim();
  const words = clean.split(/\s+/);

  for (const word of words) {
    const matchedKey = RECIPE_ALIASES[word];
    if (matchedKey && MINECRAFT_RECIPES[matchedKey]) {
      return MINECRAFT_RECIPES[matchedKey];
    }
  }

  for (const [alias, key] of Object.entries(RECIPE_ALIASES)) {
    if (clean.includes(alias.replace(/_/g, ' '))) {
      return MINECRAFT_RECIPES[key];
    }
  }

  return null;
}

/**
 * Finds recipe image URL if available
 */
async function findRecipeImageUrl(query = '') {
  const info = findRecipeInfo(query);
  if (info && info.imageUrl) {
    return info.imageUrl;
  }
  return null;
}

/**
 * Downloads image as binary Buffer for Discord AttachmentBuilder
 */
async function fetchImageBuffer(url) {
  if (!url) return null;
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      responseType: 'arraybuffer',
      timeout: 5000,
    });

    const contentType = response.headers['content-type'] || 'image/png';
    const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';

    return {
      buffer: Buffer.from(response.data),
      filename: `crafting_recipe.${ext}`,
      contentType,
    };
  } catch (err) {
    return null;
  }
}

module.exports = {
  MINECRAFT_RECIPES,
  findRecipeInfo,
  findRecipeImageUrl,
  fetchImageBuffer,
};
