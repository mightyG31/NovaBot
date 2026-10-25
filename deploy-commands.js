require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

async function deployCommands() {
  const token = process.env.DISCORD_TOKEN?.trim();
  const clientId = process.env.CLIENT_ID?.trim();
  const guildId = process.env.GUILD_ID?.trim();

  if (!token || !clientId || token === 'your_new_bot_token_here') {
    console.warn(
      '⚠️ [Deploy] DISCORD_TOKEN or CLIENT_ID not set in .env yet. Skipping command deployment.'
    );
    return false;
  }

  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data && command.execute) {
      commands.push(command.data.toJSON());
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log(`🚀 Deploying ${commands.length} slash commands...`);
    if (guildId && guildId !== '123456789012345678') {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
      console.log(`✅ Successfully deployed ${commands.length} guild commands to ${guildId}!`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });
      console.log(`✅ Successfully deployed ${commands.length} global slash commands!`);
    }
    return true;
  } catch (err) {
    console.error('❌ [Deploy] Error deploying slash commands:', err.message);
    return false;
  }
}

if (require.main === module) {
  deployCommands();
}

module.exports = { deployCommands };
