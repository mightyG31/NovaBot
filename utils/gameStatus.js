const mcu = require('minecraft-server-util');

// Short TTL cache so rapid chat questions don't spam the game server
const statusCache = new Map();
const CACHE_TTL_MS = 20 * 1000;

function stripMinecraftCodes(str = '') {
  return String(str).replace(/§[0-9a-fk-or]/gi, '').trim();
}

async function queryMinecraftServer(host, port = 25565, name = host) {
  const cacheKey = `${host}:${port}`;
  const cached = statusCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const start = Date.now();
  try {
    const res = await mcu.status(host, Number(port), {
      timeout: 3500,
      enableSRV: true,
    });
    const latency = Date.now() - start;
    const samplePlayers = (res.players?.sample || [])
      .map((p) => stripMinecraftCodes(p.name))
      .filter(Boolean);

    const data = {
      name,
      host,
      port: Number(port),
      online: true,
      version: stripMinecraftCodes(res.version?.name || 'Unknown'),
      playersOnline: res.players?.online ?? 0,
      playersMax: res.players?.max ?? 0,
      playerNames: samplePlayers,
      motd: stripMinecraftCodes(res.motd?.clean || res.motd?.raw || ''),
      latencyMs: res.roundTripLatency ?? latency,
      checkedAt: new Date().toLocaleTimeString(),
    };

    statusCache.set(cacheKey, { timestamp: Date.now(), data });
    return data;
  } catch (javaErr) {
    try {
      const bRes = await mcu.statusBedrock(host, Number(port) === 25565 ? 19132 : Number(port), {
        timeout: 2500,
      });
      const data = {
        name,
        host,
        port: Number(port) === 25565 ? 19132 : Number(port),
        online: true,
        edition: 'Bedrock',
        version: stripMinecraftCodes(bRes.version?.name || 'Bedrock'),
        playersOnline: Number(bRes.players?.online ?? 0),
        playersMax: Number(bRes.players?.max ?? 0),
        playerNames: [],
        motd: stripMinecraftCodes(bRes.motd?.clean || ''),
        latencyMs: Date.now() - start,
        checkedAt: new Date().toLocaleTimeString(),
      };
      statusCache.set(cacheKey, { timestamp: Date.now(), data });
      return data;
    } catch (_) {
      const offlineData = {
        name,
        host,
        port: Number(port),
        online: false,
        error: javaErr.message || 'Server unreachable / offline',
        checkedAt: new Date().toLocaleTimeString(),
      };
      statusCache.set(cacheKey, { timestamp: Date.now(), data: offlineData });
      return offlineData;
    }
  }
}

async function getAllConfiguredServersStatus(gameServers = []) {
  if (!gameServers || gameServers.length === 0) return [];
  const results = await Promise.all(
    gameServers.map((srv) => queryMinecraftServer(srv.host, srv.port || 25565, srv.name || srv.host))
  );
  return results;
}

function formatServerStatusForPrompt(statuses = []) {
  if (!statuses || statuses.length === 0) {
    return 'No live game servers configured yet (Admins can add one via `/config gameserver`).';
  }
  return statuses
    .map((s) => {
      if (!s.online) {
        return `- **${s.name}** (${s.host}:${s.port}): 🔴 OFFLINE / Unreachable`;
      }
      const roster =
        s.playerNames && s.playerNames.length > 0
          ? ` | Online Roster: ${s.playerNames.join(', ')}`
          : '';
      return `- **${s.name}** (${s.host}:${s.port}): 🟢 ONLINE | Players: ${s.playersOnline}/${s.playersMax}${roster} | Version: ${s.version} | Ping: ${s.latencyMs}ms | MOTD: "${s.motd}"`;
    })
    .join('\n');
}

module.exports = {
  queryMinecraftServer,
  getAllConfiguredServersStatus,
  formatServerStatusForPrompt,
};
