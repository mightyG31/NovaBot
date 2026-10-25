/**
 * Multi-Key Rotation Pool for 24/7 Non-Stop AI Operation
 * Rotates through multiple API keys for Google Gemini and Groq Cloud.
 * Automatically fails over to the next key upon rate-limits (HTTP 429) or quota exhaustion.
 */

class KeyRotator {
  constructor(envKeyName, singleKeyEnvName) {
    this.envKeyName = envKeyName;
    this.singleKeyEnvName = singleKeyEnvName;
    this.keys = [];
    this.currentIndex = 0;
    this.keyCoolDowns = new Map(); // key -> cooldown until timestamp
    this.refreshKeys();
  }

  refreshKeys() {
    const rawMulti = process.env[this.envKeyName] || '';
    const rawSingle = process.env[this.singleKeyEnvName] || '';

    const extracted = [
      ...rawMulti.split(/[\r\n,;]+/),
      ...rawSingle.split(/[\r\n,;]+/),
    ]
      .map((k) => k.trim().replace(/^["']|["']$/g, '').trim())
      .filter((k) => k && !k.startsWith('your_') && k.length > 8);

    // Deduplicate
    this.keys = Array.from(new Set(extracted));
  }

  hasKeys() {
    this.refreshKeys();
    return this.keys.length > 0;
  }

  getNextKey() {
    this.refreshKeys();
    if (this.keys.length === 0) return null;

    const now = Date.now();
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.currentIndex + i) % this.keys.length;
      const key = this.keys[idx];
      const cooldownUntil = this.keyCoolDowns.get(key) || 0;

      if (now >= cooldownUntil) {
        this.currentIndex = (idx + 1) % this.keys.length;
        return key;
      }
    }

    // If all are temporarily cooled down, return the one that will cool down earliest
    let earliestKey = this.keys[0];
    let earliestTime = Infinity;
    for (const key of this.keys) {
      const time = this.keyCoolDowns.get(key) || 0;
      if (time < earliestTime) {
        earliestTime = time;
        earliestKey = key;
      }
    }
    return earliestKey;
  }

  markRateLimited(key, cooldownSeconds = 60) {
    if (!key) return;
    this.keyCoolDowns.set(key, Date.now() + cooldownSeconds * 1000);
  }

  markInvalid(key, cooldownHours = 24) {
    if (!key) return;
    this.keyCoolDowns.set(key, Date.now() + cooldownHours * 3600 * 1000);
  }
}

const geminiPool = new KeyRotator('GEMINI_API_KEYS', 'GEMINI_API_KEY');
const groqPool = new KeyRotator('GROQ_API_KEYS', 'GROQ_API_KEY');

module.exports = {
  geminiPool,
  groqPool,
};
