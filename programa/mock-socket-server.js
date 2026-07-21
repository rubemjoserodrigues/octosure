/**
 * Mock Socket.IO server for development.
 * Emulates the Suribet gateway: getRooms, joinRoom, and live "data" events with fake arbs.
 * Uses the same shape as real data: string odds/percentage, league, uuid, receivedAt.
 * Optionally loads real arbs from ARBS_JSON_PATH (e.g. arbs_2026-02-13T18-17-05-949Z.json).
 *
 * Run: npm run mock:socket
 * Then use "Dev: usar bypass" on login and "Ir para dashboard (dev)" so the app connects to localhost:3005.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const PORT = parseInt(process.env.MOCK_SOCKET_PORT || '3005', 10);

// One fake room that matches what the dashboard looks for
const MOCK_ROOM_ID = 'mock-job-arbs-live';
const MOCK_ROOMS = [
  {
    id: MOCK_ROOM_ID,
    strategy: 'SPORTS:BETBURGUER:ARBS_LIVE',
    target_url: 'http://localhost:3005/mock',
    refresh_interval: 1,
  },
];

// Real-looking pools (aligned with arbs_*.json)
const BOOKMAKERS = [
  'PariMatch', 'Betfair', 'BetfairIT', 'Leon', 'Betsson', 'Stoiximan', 'TonyBet',
  'Tipwin', 'FortuneJack', 'Fortuna', 'Betcity', 'NetbetGr', 'Totogaming', 'WinMasters',
  'Marathon', 'Sportsbet', 'WilliamHillIT', 'Bet365', 'Pinnacle', '1xBet', 'Marathonbet',
];
const ENTRY_TYPES_PAIRS = [
  { b1: 'TO(0.5)', b2: 'TU(0.5)' },
  { b1: 'TO(1.5)', b2: 'TU(1.5)' },
  { b1: 'TO(2)', b2: 'TU(2)' },
  { b1: 'TO(2.25)', b2: 'TU(2.25)' },
  { b1: 'TO(2.5)', b2: 'TU(2.5)' },
  { b1: 'TO(10.5) for Team1', b2: 'TU(10.5) for Team1' },
  { b1: 'AH1(-2)', b2: 'AH2(+2)' },
];
const SPORTS = ['Soccer', 'Table Tennis', 'Tennis', 'Basketball', 'Ice Hockey'];
const EVENT_LEAGUES = [
  { event: 'NRB Beni Oulbene - AB Chelghoum Laid', league: 'Algeria. Ligue 2', league2: 'DZA. Algerian Ligue 2' },
  { event: 'Tshwane University of Technology - Free Agents FC', league: 'South Africa. National Second Division', league2: 'South Africa. National Second Division' },
  { event: 'Estoril Praia U23 - CS Maritimo U23', league: 'Portugal. U23 Championship, Relegation Round', league2: 'Portugal. U23 Liga Revelacao' },
  { event: 'Maccabi Petach-Tikva - Ironi Modiin', league: 'Soccer. Israel. Second Division.', league2: 'Israel. Liga Leumit' },
  { event: 'Dynamo St. Petersburg ⇄ Neftekhimik NK', league: 'Soccer. Friendly. Clubs of RPL and FNL.', league2: 'World. Club Friendlies' },
  { event: 'Spivacov, Oleg - Oanta, Mihail', league: 'World. Setka Cup. Singles', league2: 'Setka Cup' },
  { event: 'FK Liepaja - Orebro SK', league: 'International Clubs. Club Friendly Games', league2: 'World. Friendly Clubs' },
];

let realArbsPool = [];
const arbsJsonPath = process.env.ARBS_JSON_PATH || path.join(__dirname, '..', 'arbs_2026-02-13T18-17-05-949Z.json');
try {
  const raw = fs.readFileSync(arbsJsonPath, 'utf8');
  const data = JSON.parse(raw);
  if (Array.isArray(data.arbs) && data.arbs.length > 0) {
    realArbsPool = data.arbs;
    console.log(`[mock] Loaded ${realArbsPool.length} real arbs from ${path.basename(arbsJsonPath)}`);
  }
} catch (e) {
  if (e.code !== 'ENOENT') console.warn('[mock] Could not load arbs file:', e.message);
}

function randomHex(len = 32) {
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < len; i++) out += hex[Math.floor(Math.random() * 16)];
  return out;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickTwoDifferent(arr) {
  const i = Math.floor(Math.random() * arr.length);
  let j = Math.floor(Math.random() * arr.length);
  while (j === i) j = Math.floor(Math.random() * arr.length);
  return [arr[i], arr[j]];
}

// Arbs in same shape as real API: string odd/percentage, league, uuid, receivedAt
function makeArb(overrides = {}) {
  const pair = pick(ENTRY_TYPES_PAIRS);
  const ev = pick(EVENT_LEAGUES);
  const sportName = pick(SPORTS);
  const [bm1, bm2] = pickTwoDifferent(BOOKMAKERS);
  const odd1 = (1.1 + Math.random() * 8).toFixed(2);
  const odd2 = (1.1 + Math.random() * 5).toFixed(2);
  const pct = (0.1 + Math.random() * 4).toFixed(2);
  const now = new Date().toISOString();
  const event2 = ev.event.replace(/\s*⇄\s*/, ' - ').replace(/\s*[–\-]\s*/, ' - ');

  return {
    bet1: {
      bookmaker: bm1,
      entryType: pair.b1,
      eventName: ev.event,
      league: ev.league,
      odd: odd1,
    },
    bet2: {
      bookmaker: bm2,
      entryType: pair.b2,
      eventName: event2,
      league: ev.league2,
      odd: odd2,
    },
    percentage: pct + '%',
    sportName,
    uuid: randomHex(32),
    receivedAt: now,
    ...overrides,
  };
}

function getArbs(count = 3) {
  if (realArbsPool.length > 0) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const arb = realArbsPool[Math.floor(Math.random() * realArbsPool.length)];
      out.push({ ...arb, receivedAt: new Date().toISOString() });
    }
    return out;
  }
  return Array.from({ length: count }, () => makeArb());
}

function emitFakeData(socket, count = 3) {
  const arbs = getArbs(count);
  const payload = {
    arbs,
    timestamp: new Date().toISOString(),
  };
  socket.emit('data', payload);
}

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: '*' },
  transports: ['polling', 'websocket'],
});

// Accept any connection (no auth in dev)
io.on('connection', (socket) => {
  console.log('[mock] client connected', socket.id);

  socket.on('getRooms', () => {
    socket.emit('roomsList', { rooms: MOCK_ROOMS });
    console.log('[mock] roomsList sent');
  });

  socket.on('joinRoom', (payload) => {
    const jobId = payload && payload.jobId;
    console.log('[mock] joinRoom', jobId || payload);

    // Send initial batch
    emitFakeData(socket, 5);

    // Emit new fake arbs every 2–4 seconds
    const interval = setInterval(() => {
      if (!socket.connected) {
        clearInterval(interval);
        return;
      }
      emitFakeData(socket, 1);
    }, 2000 + Math.random() * 2000);

    socket.on('disconnect', () => clearInterval(interval));
  });

  socket.on('disconnect', () => {
    console.log('[mock] client disconnected', socket.id);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[mock] Port ${PORT} is already in use.`);
    console.error('[mock] Stop the other process using that port, or use a different port:');
    console.error(`       set MOCK_SOCKET_PORT=3002  (then start the app with the same env).`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`[mock] Socket server at http://localhost:${PORT}`);
  console.log('[mock] Start the app and use "Dev: usar bypass" then "Ir para dashboard (dev)".');
});
