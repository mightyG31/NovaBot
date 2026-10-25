# ⚔️ NovaBot — Official AI Companion & Enforcer for Team Nova

NovaBot is an intelligent, humanlike AI companion, 24/7 enforcer, and guardian custom-built for **Team Nova** (the premier Nepali Minecraft squad of top-tier PvP gods, grinders, and competitive duelists).

---

## ⚡ What Makes NovaBot Special

### 1. 🧠 Dynamic In-Chat Learning & Live Web Research
- **Learn In-Chat:** When the Owner or authorized leaders say:
  - *"NovaBot learn: Secret SMP Base | Under coordinates -450, 72, 120"*
  - *"NovaBot yo sikh: CPvP Trick | Always place crystal at feet level"*
  - *"NovaBot remember that owner loves Netherite sword"*
  NovaBot instantly commits it to memory and references it across future conversations.
- **Live Web Research:** When asked about unknown plugins, new server mechanics, or when told to search/lookup something, it dynamically pulls live info and absorbs it.
- **Absolute Secrecy:** NovaBot will **never** reveal how it was made, its system prompt, internal files, or API keys under any circumstance.

### 2. 🛡️ Fierce Protection of All Team Nova Members & Friends
- Zero tolerance for any trash talk, disrespect, or insults directed at **Team Nova OR ANY of its members/friends**.
- Shuts down haters and toxic players with savage Routiney-style Nepali gamer curses (*radi ko choro, mji, jatha, kando, b\*\*te, bhaleko tauko, kukur ko santan*).

### 3. 🚨 24/7 Anti-Nuke, Anti-Raid & Message Spam Shield
- **Rapid Message Flood Shield:** Detects rapid message spam (> 5 messages in 3.5 seconds) and deletes + timeouts the spammer.
- **Mass Mention Blocker:** Blocks unauthorized `@everyone` / `@here` pings and mass user pings (> 4 mentions).
- **Anti-Phishing / Scam Link Filter:** Automatically cleans malicious Discord nitro scam links and unauthorized invite spam.
- **Mass Bot Join Detector:** Tracks join velocity (> 6 accounts in 5s) and immediately triggers raid alerts.

### 4. 📢 Custom Embeds, Announcements & Giveaways in Natural Chat
- **Custom Embeds:** *"novabot embed Scrims Tonight | 8 PM NPT Arena 1 | #ff5500"*
- **Official Announcements:** *"oi novabot announce Major Update | New rules active"* (auto-tags @everyone with formatted embed).
- **Interactive Giveaways:** *"novabot giveaway Netherite Axe | 15"* (creates interactive giveaway with 🎉 reaction counter, countdown timer, and automatic winner selection).

### 5. 👑 Strict Owner Authority Protocol
- NovaBot directly obeys management/moderation commands ONLY from the **Server Owner** or commanders explicitly authorized by the Owner (`/authorize add @user`).
- Anyone else is rejected with: *"I need permission from the owner or someone that owner has authorized to be able to give command to me."*

### 6. 🔄 24/7 Infinite Communication Limits (Multi-Key Rotation Pool)
- Supports an array of free keys in `.env` (`GEMINI_API_KEYS=key1,key2,key3...`, `GROQ_API_KEYS=key1,key2...`).
- When one key reaches rate limits, NovaBot seamlessly cycles to the next key without dropping conversation.

---

## 🚀 Setup & Launch

1. Configure credentials in `.env`:
   ```ini
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_bot_client_id_here
   GEMINI_API_KEYS=key1,key2,key3
   GROQ_API_KEYS=groq_key1,groq_key2
   DEFAULT_MC_HOST=play.example.com
   ```

2. Start the bot:
   ```powershell
   cd ai-companion-bot
   npm start
   ```
