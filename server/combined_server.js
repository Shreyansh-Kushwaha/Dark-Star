const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = 8080;
const GAME_ROOT = path.join(__dirname, '..');

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.json': 'application/json',
  '.wav':  'audio/wav',
  '.ogg':  'audio/ogg',
};

// ─── Asset manifest ──────────────────────────────────────────────────────────

function isAnimFrame(name) {
  return /^\d+\.png$/i.test(name) || /_\d+\.png$/i.test(name);
}

function frameNum(name) {
  const m = name.match(/(\d+)\.png$/i);
  return m ? parseInt(m[1], 10) : 0;
}

function scanDir(dir) {
  try {
    return fs.readdirSync(dir).map(name => {
      const full = path.join(dir, name);
      let isDir = false;
      try { isDir = fs.statSync(full).isDirectory(); } catch {}
      return { name, full, isDir };
    });
  } catch { return []; }
}

// Returns [{name, dir (relative URL path), frames[], animated}]
function spritesFromDir(absDir, relDir) {
  const entries  = scanDir(absDir);
  const subDirs  = entries.filter(e => e.isDir);
  const pngs     = entries.filter(e => !e.isDir && e.name.toLowerCase().endsWith('.png'));
  const frames   = pngs.filter(e => isAnimFrame(e.name)).sort((a,b) => frameNum(a.name) - frameNum(b.name));
  const statics  = pngs.filter(e => !isAnimFrame(e.name));
  const out      = [];

  if (subDirs.length > 0) {
    for (const sub of subDirs) {
      const subE = scanDir(sub.full);
      const subF = subE.filter(e => !e.isDir && isAnimFrame(e.name))
                       .sort((a,b) => frameNum(a.name) - frameNum(b.name));
      const subRel = relDir + '/' + sub.name;
      if (subF.length > 0) {
        out.push({ name: path.basename(absDir) + ' — ' + sub.name, dir: subRel, frames: subF.map(f => f.name), animated: subF.length > 1 });
      } else {
        out.push(...spritesFromDir(sub.full, subRel));
      }
    }
  } else if (frames.length > 0) {
    out.push({ name: path.basename(absDir), dir: relDir, frames: frames.map(f => f.name), animated: frames.length > 1 });
  }

  for (const png of statics) {
    out.push({ name: png.name.replace(/\.png$/i, ''), dir: relDir, frames: [png.name], animated: false });
  }
  return out;
}

const ASSET_GROUPS = [
  { cat:'Terrain',   grp:'Tileset',        rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Tileset' },
  { cat:'Terrain',   grp:'Bushes',         rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Bushes' },
  { cat:'Terrain',   grp:'Rocks',          rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Rocks' },
  { cat:'Terrain',   grp:'Rocks in Water', rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Rocks in the Water' },
  { cat:'Terrain',   grp:'Clouds',         rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Clouds' },
  { cat:'Terrain',   grp:'Rubber Duck',    rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Rubber Duck' },
  { cat:'Terrain',   grp:'Trees',          rel:'craftpix-net-168228-free-tree-pixel-art-asset-pack/trees' },
  { cat:'Buildings', grp:'Black',          rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Buildings/Black Buildings' },
  { cat:'Buildings', grp:'Blue',           rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Buildings/Blue Buildings' },
  { cat:'Buildings', grp:'Purple',         rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Buildings/Purple Buildings' },
  { cat:'Buildings', grp:'Red',            rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Buildings/Red Buildings' },
  { cat:'Buildings', grp:'Yellow',         rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Buildings/Yellow Buildings' },
  { cat:'Monsters',  grp:'King Slime',     rel:'THE PACK/Monsters/KING SLIME' },
  { cat:'Monsters',  grp:'ORC',            rel:'THE PACK/Monsters/ORC' },
  { cat:'Monsters',  grp:'ORC2',           rel:'THE PACK/Monsters/ORC2' },
  { cat:'Monsters',  grp:'Slime',          rel:'THE PACK/Monsters/Slime' },
  { cat:'Monsters',  grp:'Slime 2',        rel:'THE PACK/Monsters/Slime 2' },
  { cat:'Monsters',  grp:'Tree Monster',   rel:'THE PACK/Monsters/Tree' },
  { cat:'Monsters',  grp:'Frost Guardian', rel:'assest2/Frost_Guardian_FREE_v1.0/PNG files' },
  { cat:'Monsters',  grp:'Demon Slime',    rel:'assest2/boss_demon_slime_FREE_v1.0/individual sprites' },
  { cat:'Monsters',  grp:'Minotaur',       rel:'assest2/mino_v1.1_free/animations' },
  { cat:'Monsters',  grp:'Goblin',         rel:'assest2/craftpix-064112-free-orc-ogre-and-goblin-chibi-2d-game-sprites/Goblin/PNG/PNG Sequences' },
  { cat:'Monsters',  grp:'Orc',            rel:'assest2/craftpix-064112-free-orc-ogre-and-goblin-chibi-2d-game-sprites/Orc/PNG/PNG Sequences' },
  { cat:'Monsters',  grp:'Ogre',           rel:'assest2/craftpix-064112-free-orc-ogre-and-goblin-chibi-2d-game-sprites/Ogre/PNG/PNG Sequences' },
  { cat:'Monsters',  grp:'Rabbit',         rel:'assest2/Monster Pack (Free)/Spritesheets' },
  { cat:'Units',     grp:'Black',          rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Units/Black Units' },
  { cat:'Units',     grp:'Blue',           rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Units/Blue Units' },
  { cat:'Units',     grp:'Purple',         rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Units/Purple Units' },
  { cat:'Units',     grp:'Red',            rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Units/Red Units' },
  { cat:'Units',     grp:'Yellow',         rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Units/Yellow Units' },
  { cat:'Resources', grp:'Gold',           rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Gold' },
  { cat:'Resources', grp:'Meat',           rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Meat' },
  { cat:'Resources', grp:'Wood',           rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Wood' },
  { cat:'Resources', grp:'Tools',          rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Tools' },
  { cat:'FX',        grp:'Particle FX',    rel:'Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Particle FX' },
  { cat:'Assets3',   grp:'Food',           rel:'assets3/food' },
  { cat:'Assets3',   grp:'Monsters/Bat',   rel:'assets3/monsters/bat' },
  { cat:'Assets3',   grp:'Monsters/Mimic', rel:'assets3/monsters/mimic' },
  { cat:'Assets3',   grp:'Monsters/Rat',   rel:'assets3/monsters/rat' },
  { cat:'Assets3',   grp:'Monsters/Slime', rel:'assets3/monsters/slime' },
  { cat:'Assets3',   grp:'VFX/Fireball',   rel:'assets3/vfx/fireball' },
  { cat:'Assets3',   grp:'VFX/Frost',      rel:'assets3/vfx/frost' },
  { cat:'Assets3',   grp:'VFX/Green',      rel:'assets3/vfx/green' },
  { cat:'Assets3',   grp:'VFX/Lightning',  rel:'assets3/vfx/lightning' },
  { cat:'Assets3',   grp:'VFX/Smoke',      rel:'assets3/vfx/smoke' },
  { cat:'Assets3',   grp:'VFX/Yellow',     rel:'assets3/vfx/yellow' },
  { cat:'Cropped',   grp:'My Crops',       rel:'cropped' },
  { cat:'Uploads',   grp:'My Assets',      rel:'uploads' },
];

function buildManifest() {
  const catMap = {};
  for (const { cat, grp, rel } of ASSET_GROUPS) {
    const sprites = spritesFromDir(path.join(GAME_ROOT, rel), rel);
    if (!sprites.length) continue;
    if (!catMap[cat]) catMap[cat] = { name: cat, groups: [] };
    catMap[cat].groups.push({ name: grp, sprites });
  }
  return { categories: Object.values(catMap) };
}

// ─────────────────────────────────────────────────────────────────────────────

const REGIONS_DIR = path.join(GAME_ROOT, 'regions');
if (!fs.existsSync(REGIONS_DIR)) fs.mkdirSync(REGIONS_DIR, { recursive: true });

const server = http.createServer((req, res) => {
  // ── Region map list ────────────────────────────────────────────────────────
  if (req.method === 'GET' && req.url === '/api/regions') {
    const files = fs.readdirSync(REGIONS_DIR).filter(f => f.endsWith('.json'));
    const result = [];
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(REGIONS_DIR, file), 'utf8');
        const data = JSON.parse(raw);
        // Derive regionIndex from filename (region_N.json) or from data field
        const match = file.match(/region_(\d+)\.json$/i);
        const regionIndex = data.regionIndex ?? (match ? parseInt(match[1], 10) : null);
        result.push({ filename: file, regionIndex, data });
      } catch {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(result));
    return;
  }

  // ── Save region map ────────────────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/regions/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { regionIndex, data } = JSON.parse(body);
        if (typeof regionIndex !== 'number') throw new Error('regionIndex required');
        data.regionIndex = regionIndex;
        const filename = `region_${regionIndex}.json`;
        fs.writeFileSync(path.join(REGIONS_DIR, filename), JSON.stringify(data, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, filename }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  if (req.url === '/api/assets') {
    const manifest = buildManifest();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(manifest));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/upload-asset') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { name, dataURL } = JSON.parse(body);
        const base64 = dataURL.split(',')[1];
        const buf = Buffer.from(base64, 'base64');
        const uploadDir = path.join(GAME_ROOT, 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const safeName = name.replace(/[^a-zA-Z0-9_\-. ]/g, '_').slice(0, 80).trim();
        const ext = path.extname(safeName).toLowerCase() || '.png';
        const base = path.basename(safeName, ext).trim() || 'asset';
        const fileName = base + ext;
        fs.writeFileSync(path.join(uploadDir, fileName), buf);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, file: fileName }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/save-crop') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { name, dataURL } = JSON.parse(body);
        const base64 = dataURL.split(',')[1];
        const buf = Buffer.from(base64, 'base64');
        const cropDir = path.join(GAME_ROOT, 'cropped');
        if (!fs.existsSync(cropDir)) fs.mkdirSync(cropDir, { recursive: true });
        const safeName = name.replace(/[^a-zA-Z0-9_\- ]/g, '_').slice(0, 64).trim() + '.png';
        fs.writeFileSync(path.join(cropDir, safeName), buf);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, file: safeName }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(GAME_ROOT, urlPath);

  if (!filePath.startsWith(GAME_ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not found: ' + urlPath); return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const ct = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// --- WebSocket relay ---
const wss = new WebSocketServer({ server });
const rooms = new Map(); // roomCode -> { host, client, code }

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c = '';
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(c) ? genCode() : c;
}

function send(ws, obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

wss.on('connection', (ws) => {
  ws._room = null;
  ws._role = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'ROOM_CREATE') {
      const code = genCode();
      rooms.set(code, { host: ws, client: null, code });
      ws._room = code;
      ws._role = 'host';
      send(ws, { type: 'ROOM_READY', code, role: 'host' });
      return;
    }

    if (msg.type === 'ROOM_JOIN') {
      const room = rooms.get(msg.code);
      if (!room || room.client) {
        send(ws, { type: 'ROOM_ERROR', reason: 'Room not found or full' });
        return;
      }
      room.client = ws;
      ws._room = msg.code;
      ws._role = 'client';
      send(ws, { type: 'ROOM_READY', code: msg.code, role: 'client' });
      send(room.host, { type: 'CLIENT_JOINED' });
      return;
    }

    // Relay all other messages to the other player
    if (!ws._room) return;
    const room = rooms.get(ws._room);
    if (!room) return;
    const other = ws._role === 'host' ? room.client : room.host;
    if (other) other.send(raw.toString('utf8'));
  });

  ws.on('close', () => {
    if (!ws._room) return;
    const room = rooms.get(ws._room);
    if (!room) return;
    if (ws._role === 'host') {
      send(room.client, { type: 'HOST_DISCONNECTED' });
      rooms.delete(ws._room);
    } else {
      send(room.host, { type: 'CLIENT_DISCONNECTED' });
      room.client = null;
    }
  });
});

server.listen(PORT, () => {
  console.log(`Akhand Sutra server running at http://localhost:${PORT}`);
});
