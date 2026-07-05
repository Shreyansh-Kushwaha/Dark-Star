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

// Read PNG width/height from the 24-byte IHDR header (no external deps)
function readPNGDims(absPath) {
  try {
    const buf = Buffer.alloc(24);
    const fd = fs.openSync(absPath, 'r');
    fs.readSync(fd, buf, 0, 24, 0);
    fs.closeSync(fd);
    if (buf[0] !== 0x89 || buf[1] !== 0x50) return null;
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  } catch { return null; }
}

// Explicit spritesheet overrides for files that don't fit auto-detection
// (e.g. square grids, non-power-of-two strips). Keyed by relative path from GAME_ROOT.
// frameW/frameH = one frame size, frameCount = frames to cycle (single row), frameRow = 0-indexed row to read from.
const EXPLICIT_SHEETS = {
  'assest2/Monster Pack (Free)/Spritesheets/Updated Rabbit/Rabbit_Brown_Idle.png':    { frameW: 64, frameH: 64, frameCount: 8, frameRow: 1 },
  'assest2/Monster Pack (Free)/Spritesheets/Updated Rabbit/Rabbit_Brown_Move.png':    { frameW: 64, frameH: 64, frameCount: 8, frameRow: 1 },
  'assest2/Monster Pack (Free)/Spritesheets/Updated Rabbit Horned/Rabbit_Horned_Idle.png':   { frameW: 64, frameH: 64, frameCount: 8, frameRow: 1 },
  'assest2/Monster Pack (Free)/Spritesheets/Updated Rabbit Horned/Rabbit_Horned_Move.png':   { frameW: 64, frameH: 64, frameCount: 8, frameRow: 1 },
  'assest2/Monster Pack (Free)/Spritesheets/Updated Rabbit Horned/Rabbit_Horned_Attack.png': { frameW: 64, frameH: 64, frameCount: 8, frameRow: 1 },
  // assets_custom/anim — non-square strips (64×80 frames)
  'assets_custom/anim/crystal_glow.png':     { frameW: 64, frameH: 80, frameCount: 4, frameRow: 0 },
  'assets_custom/anim/wind_banner_anim.png': { frameW: 64, frameH: 80, frameCount: 4, frameRow: 0 },
};

// Returns { frameW, frameH, frameCount } if PNG is a horizontal spritesheet, else null.
// A horizontal spritesheet has width = N × height exactly, N in [2..24], height in [8..512].
function detectSpritesheet(absPath) {
  // Check explicit overrides first
  const rel = path.relative(GAME_ROOT, absPath).replace(/\\/g, '/');
  if (EXPLICIT_SHEETS[rel]) {
    const { frameW, frameH, frameCount, frameRow } = EXPLICIT_SHEETS[rel];
    return { frameW, frameH, frameCount, frameRow: frameRow || 0 };
  }

  const dims = readPNGDims(absPath);
  if (!dims) return null;
  const { w, h } = dims;
  if (h < 8 || h > 512) return null;
  if (w <= h) return null;
  const n = Math.round(w / h);
  if (n < 2 || n > 24 || w !== h * n) return null;
  return { frameW: h, frameH: h, frameCount: n, frameRow: 0 };
}

function frameNum(name) {
  const m = name.match(/(\d+)\.png$/i);
  return m ? parseInt(m[1], 10) : 0;
}

// Editor / aux folders that never contain usable game sprites — skip them so big
// packs (assets5/assets6) don't flood the manifest with source files or macOS junk.
const SKIP_DIRS = new Set([
  '__MACOSX', 'PSD', 'PSD files', 'ASEPRITE', 'Aseprite', 'ASE',
  'Tiled', 'Tiled_files', 'Vector Parts', 'Audio', 'Music',
  // Packs that ship per-action numbered "PNG Sequences" AND a redundant "Spritesheets"
  // copy (huge multi-row grids the single-row player can't animate). Prefer the
  // sequences; skip the grid duplicates so they don't appear as broken stills.
  'Spritesheets',
]);

function scanDir(dir) {
  try {
    return fs.readdirSync(dir)
      // Drop dotfiles (incl. ._* AppleDouble resource forks) and known aux/source dirs.
      .filter(name => !name.startsWith('.') && !SKIP_DIRS.has(name))
      .map(name => {
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

  // If every "animation frame" file is itself a horizontal spritesheet, treat each as a
  // separate animated sprite rather than grouping all files into one multi-frame sequence.
  const potentialFrames = pngs.filter(e => isAnimFrame(e.name));
  const allAreSheets = potentialFrames.length > 0 && potentialFrames.every(e => detectSpritesheet(e.full) !== null);

  const frames   = allAreSheets ? [] : potentialFrames.sort((a,b) => frameNum(a.name) - frameNum(b.name));
  const statics  = allAreSheets ? pngs : pngs.filter(e => !isAnimFrame(e.name));
  const out      = [];

  if (subDirs.length > 0) {
    for (const sub of subDirs) {
      const subE = scanDir(sub.full);
      const subF = subE.filter(e => !e.isDir && isAnimFrame(e.name))
                       .sort((a,b) => frameNum(a.name) - frameNum(b.name));
      const subRel = relDir + '/' + sub.name;
      if (subF.length > 0) {
        out.push({ name: path.basename(absDir) + ' — ' + sub.name, dir: subRel, frames: subF.map(f => f.name), animated: subF.length > 1 });
        // Also surface standalone PNG animation strips living alongside the frames
        // — e.g. enemy folders with Attack_1/2/3 frames plus separate Run/Walk/Idle sheets.
        // Restrict to detectable spritesheets so stray single-frame stills aren't picked up.
        for (const png of subE.filter(e => !e.isDir && e.name.toLowerCase().endsWith('.png') && !isAnimFrame(e.name))) {
          const sh = detectSpritesheet(png.full);
          if (!sh) continue;
          out.push({ name: png.name.replace(/\.png$/i, ''), dir: subRel, frames: [png.name],
            animated: true, ...sh });
        }
      } else {
        out.push(...spritesFromDir(sub.full, subRel));
      }
    }
  } else if (frames.length > 0) {
    out.push({ name: path.basename(absDir), dir: relDir, frames: frames.map(f => f.name), animated: frames.length > 1 });
  }

  for (const png of statics) {
    const sh = detectSpritesheet(png.full);
    out.push({ name: png.name.replace(/\.png$/i, ''), dir: relDir, frames: [png.name],
      animated: sh !== null, ...(sh || {}) });
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
  { cat:'Assets4',   grp:'Map Objects',    rel:'assest4/map_objects' },
  { cat:'Assets4',   grp:'Next2',          rel:'assest4/next2' },
  { cat:'Cropped',   grp:'My Crops',       rel:'cropped' },
  { cat:'Uploads',   grp:'My Assets',      rel:'uploads' },
  // Custom hand-crafted assets
  { cat:'Custom',    grp:'Props',          rel:'assets_custom/props' },
  { cat:'Custom',    grp:'Animations',     rel:'assets_custom/anim' },
  { cat:'Custom',    grp:'Rocks Basalt',   rel:'assets_custom/rocks_basalt' },
  { cat:'Custom',    grp:'Rocks Sand',     rel:'assets_custom/rocks_sand' },
  { cat:'Custom',    grp:'Rocks Void',     rel:'assets_custom/rocks_void' },
  { cat:'Custom',    grp:'Structures',     rel:'assets_custom/structures' },

  // ── Assets5 (one category; each pack/section is a group) ───────────────────
  { cat:'Assets5', grp:'Dungeon II — Frames',  rel:'assets5/0x72_dungeon_tileset_ii/0x72_DungeonTilesetII_v1.7/frames' },
  { cat:'Assets5', grp:'Dungeon Crawl — Dungeon',    rel:'assets5/dungeon_crawl_32x32_cc0/Dungeon Crawl Stone Soup Full/dungeon' },
  { cat:'Assets5', grp:'Dungeon Crawl — Monster',    rel:'assets5/dungeon_crawl_32x32_cc0/Dungeon Crawl Stone Soup Full/monster' },
  { cat:'Assets5', grp:'Dungeon Crawl — Player',     rel:'assets5/dungeon_crawl_32x32_cc0/Dungeon Crawl Stone Soup Full/player' },
  { cat:'Assets5', grp:'Dungeon Crawl — Item',       rel:'assets5/dungeon_crawl_32x32_cc0/Dungeon Crawl Stone Soup Full/item' },
  { cat:'Assets5', grp:'Dungeon Crawl — Effect',     rel:'assets5/dungeon_crawl_32x32_cc0/Dungeon Crawl Stone Soup Full/effect' },
  { cat:'Assets5', grp:'Dungeon Crawl — Misc',       rel:'assets5/dungeon_crawl_32x32_cc0/Dungeon Crawl Stone Soup Full/misc' },
  { cat:'Assets5', grp:'Dungeon Crawl — GUI',        rel:'assets5/dungeon_crawl_32x32_cc0/Dungeon Crawl Stone Soup Full/gui' },
  { cat:'Assets5', grp:'Dungeon Crawl — Emissaries', rel:'assets5/dungeon_crawl_32x32_cc0/Dungeon Crawl Stone Soup Full/emissaries' },
  { cat:'Assets5', grp:'Ninja — Characters',         rel:'assets5/ninja_adventure_pack/Ninja Adventure - Asset Pack/Actor/Character' },
  { cat:'Assets5', grp:'Ninja — Characters Anim',    rel:'assets5/ninja_adventure_pack/Ninja Adventure - Asset Pack/Actor/CharacterAnimated' },
  { cat:'Assets5', grp:'Ninja — Monsters',           rel:'assets5/ninja_adventure_pack/Ninja Adventure - Asset Pack/Actor/Monster' },
  { cat:'Assets5', grp:'Ninja — Bosses',             rel:'assets5/ninja_adventure_pack/Ninja Adventure - Asset Pack/Actor/Boss' },
  { cat:'Assets5', grp:'Ninja — Animals',            rel:'assets5/ninja_adventure_pack/Ninja Adventure - Asset Pack/Actor/Animal' },
  { cat:'Assets5', grp:'Ninja — Items',              rel:'assets5/ninja_adventure_pack/Ninja Adventure - Asset Pack/Items' },
  { cat:'Assets5', grp:'Ninja — FX',                 rel:'assets5/ninja_adventure_pack/Ninja Adventure - Asset Pack/FX' },
  { cat:'Assets5', grp:'Ninja — UI',                 rel:'assets5/ninja_adventure_pack/Ninja Adventure - Asset Pack/Ui' },
  { cat:'Assets5', grp:'Ninja — Backgrounds',        rel:'assets5/ninja_adventure_pack/Ninja Adventure - Asset Pack/Backgrounds' },
  { cat:'Assets5', grp:'Fantasy Icons',              rel:"assets5/shikashi_fantasy_icons/Shikashi's Fantasy Icons Pack v2" },

  // ── Assets6 (one category; each pack is a group) ───────────────────────────
  { cat:'Assets6', grp:'Animals',          rel:'assets6/animal/PNG' },
  { cat:'Assets6', grp:'Animals 2',        rel:'assets6/animal 2/PNG' },
  { cat:'Assets6', grp:'Enemies',          rel:'assets6/enemy' },
  { cat:'Assets6', grp:'Slime',            rel:'assets6/slime/PNG' },
  { cat:'Assets6', grp:'Leaders',          rel:'assets6/enemy 2' },
  { cat:'Assets6', grp:'Seers',            rel:'assets6/enemy 3' },
  { cat:'Assets6', grp:'Viking/Caveman/Goblin', rel:'assets6/enemy 4' },
  { cat:'Assets6', grp:'Minotaur',         rel:'assets6/minotaur' },
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

const NPC_DIALOGUE_DIR = path.join(GAME_ROOT, 'npc_dialogue');
if (!fs.existsSync(NPC_DIALOGUE_DIR)) fs.mkdirSync(NPC_DIALOGUE_DIR, { recursive: true });

const server = http.createServer((req, res) => {
  // ── Region map list ────────────────────────────────────────────────────────
  if (req.method === 'GET' && req.url === '/api/regions') {
    const files = fs.readdirSync(REGIONS_DIR).filter(f => f.endsWith('.json'));
    // Cheap validator: the newest region-file mtime. Lets the browser revalidate
    // with a 304 instead of re-downloading ~5.8 MB of region JSON every reload;
    // saving a region in the editor bumps the mtime, so changes still show.
    let newest = 0;
    for (const f of files) {
      try { newest = Math.max(newest, fs.statSync(path.join(REGIONS_DIR, f)).mtimeMs); } catch {}
    }
    const lastMod = new Date(newest).toUTCString();
    if (req.headers['if-modified-since'] === lastMod) {
      res.writeHead(304, { 'Cache-Control': 'no-cache', 'Last-Modified': lastMod });
      res.end();
      return;
    }
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
    // readdirSync order is filesystem/alphabetical (region_10 before region_2), not
    // numeric — GameScene builds its seamless-streaming chain straight from this
    // array's order, so an unsorted list scrambles which regions border which.
    result.sort((a, b) => (a.regionIndex ?? 0) - (b.regionIndex ?? 0));
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'Last-Modified': lastMod });
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

  // ── Delete region map ──────────────────────────────────────────────────────
  if (req.method === 'DELETE' && req.url.startsWith('/api/regions/')) {
    try {
      const filename = path.basename(req.url.slice('/api/regions/'.length));
      if (!filename.endsWith('.json')) throw new Error('Invalid filename');
      const filepath = path.join(REGIONS_DIR, filename);
      if (!fs.existsSync(filepath)) throw new Error('File not found');
      fs.unlinkSync(filepath);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // ── NPC Dialogue list ──────────────────────────────────────────────────────
  if (req.method === 'GET' && req.url === '/api/npc-dialogue') {
    const files = fs.readdirSync(NPC_DIALOGUE_DIR).filter(f => f.endsWith('.json'));
    const result = [];
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(NPC_DIALOGUE_DIR, file), 'utf8');
        result.push(JSON.parse(raw));
      } catch {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(result));
    return;
  }

  // ── Save NPC dialogue ──────────────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/npc-dialogue/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const entry = JSON.parse(body);
        if (!entry.id) throw new Error('id required');
        const filename = entry.id + '.json';
        fs.writeFileSync(path.join(NPC_DIALOGUE_DIR, filename), JSON.stringify(entry, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, filename }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // ── Delete NPC dialogue ────────────────────────────────────────────────────
  if (req.method === 'DELETE' && req.url.startsWith('/api/npc-dialogue/')) {
    try {
      const id = path.basename(req.url.slice('/api/npc-dialogue/'.length));
      if (!id) throw new Error('Invalid id');
      const filepath = path.join(NPC_DIALOGUE_DIR, id + '.json');
      if (!fs.existsSync(filepath)) throw new Error('File not found');
      fs.unlinkSync(filepath);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
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

  // ── Animation reviewer: list real frame files in a folder ───────────────────
  // assets.json stores frame_count + an example name, not the full ordered list,
  // so the reviewer reads the directory directly to play frames reliably.
  if (req.method === 'GET' && req.url.startsWith('/api/list-frames')) {
    try {
      const q = new URL(req.url, 'http://x').searchParams;
      const rel = q.get('dir') || '';
      const absDir = path.join(GAME_ROOT, rel);
      if (!absDir.startsWith(GAME_ROOT)) throw new Error('Forbidden');
      const frames = fs.readdirSync(absDir)
        .filter(n => !n.startsWith('.') && n.toLowerCase().endsWith('.png'))
        .sort((a, b) => frameNum(a) - frameNum(b));
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({ ok: true, dir: rel, frames }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // ── Animation reviewer: save the working draft (approvals + remarks) ─────────
  if (req.method === 'POST' && req.url === '/api/animations-draft/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const draft = JSON.parse(body);
        if (!draft || !Array.isArray(draft.packs)) throw new Error('expected { packs: [...] }');
        fs.writeFileSync(path.join(GAME_ROOT, 'docs', 'animations_draft.json'),
          JSON.stringify(draft, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // ── Animation reviewer: export APPROVED entries → docs/animations.json ───────
  // Reads the on-disk draft so the "final output" logic lives in one place.
  if (req.method === 'POST' && req.url === '/api/animations/export') {
    try {
      const draftPath = path.join(GAME_ROOT, 'docs', 'animations_draft.json');
      const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
      // Group approved animations by their per-animation entity_key, so a
      // multi-character source pack exports as several distinct entities.
      const byEntity = new Map();
      let count = 0;
      for (const p of draft.packs || []) {
        for (const a of p.animations || []) {
          if (a.status !== 'approved') continue;
          const ek = a.entity_key || p.entity_key;
          let anim;
          if (a.source === 'spritesheet') {
            anim = { name: a.name, source: 'spritesheet', spritesheet: a.spritesheet,
              frame_count: a.frame_count, frame_size: a.frame_size, frame_start: a.frame_start || 0,
              horizontal: a.horizontal, framerate: a.framerate, loop: a.loop };
          } else {
            // Embed the real ordered frame filenames so the runtime AnimationLoader
            // builds exact URLs/keys with no filename guessing.
            let frames = [];
            try {
              frames = fs.readdirSync(path.join(GAME_ROOT, a.dir))
                .filter(n => !n.startsWith('.') && n.toLowerCase().endsWith('.png'))
                .sort((x, y) => frameNum(x) - frameNum(y));
            } catch { /* dir missing — leave frames empty */ }
            anim = { name: a.name, source: 'frame_folder', dir: a.dir, frames,
              frame_count: a.frame_count, frame_size: a.frame_size,
              framerate: a.framerate, loop: a.loop };
          }
          if (!byEntity.has(ek)) {
            byEntity.set(ek, { entity_key: ek, entity_type: p.entity_type,
              pack_path: p.pack_path, animations: [] });
          }
          byEntity.get(ek).animations.push(anim);
          count++;
        }
      }
      const packs = [...byEntity.values()];
      const out = { version: 1, generated: draft.generated,
        source: 'docs/animations_draft.json (approved entries, grouped by entity_key)', packs };
      fs.writeFileSync(path.join(GAME_ROOT, 'docs', 'animations.json'),
        JSON.stringify(out, null, 2));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, packs: packs.length, animations: count }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // ── Serve the approved animation definitions (for the runtime loader) ────────
  if (req.method === 'GET' && req.url === '/api/animations') {
    try {
      const p = path.join(GAME_ROOT, 'docs', 'animations.json');
      // 304 revalidation so the 640 KB anim registry isn't re-downloaded every
      // reload; re-exporting from the reviewer bumps the mtime so it refreshes.
      const lastMod = fs.statSync(p).mtime.toUTCString();
      if (req.headers['if-modified-since'] === lastMod) {
        res.writeHead(304, { 'Cache-Control': 'no-cache', 'Last-Modified': lastMod });
        res.end();
        return;
      }
      const data = fs.readFileSync(p, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'Last-Modified': lastMod });
      res.end(data);
    } catch {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ version: 1, packs: [], error: 'not exported yet' }));
    }
    return;
  }

  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(GAME_ROOT, urlPath);

  if (!filePath.startsWith(GAME_ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.stat(filePath, (serr, stat) => {
    if (serr || !stat.isFile()) {
      res.writeHead(404); res.end('Not found: ' + urlPath); return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const ct = MIME[ext] || 'application/octet-stream';
    const mtime = stat.mtime.toUTCString();

    // Conditional request: if the browser's cached copy is current, reply 304 with
    // no body. Turns a full re-download into a header-only round-trip. The browser
    // echoes back exactly the Last-Modified we sent, so string equality is safe
    // (both are second-precision).
    if (req.headers['if-modified-since'] === mtime) {
      res.writeHead(304, { 'Last-Modified': mtime, 'Cache-Control': 'no-cache' });
      res.end();
      return;
    }

    // Images/audio effectively never change during play, so let the browser reuse
    // them for a day with NO revalidation round-trip — this is what makes reloads
    // fast (hundreds of PNGs otherwise re-fetched every time). Code/markup stays
    // no-cache so edits always show, but revalidation is cheap via Last-Modified.
    const IMMUTABLE = ['.png', '.jpg', '.wav', '.ogg'];
    const cache = IMMUTABLE.includes(ext) ? 'public, max-age=86400' : 'no-cache';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404); res.end('Not found: ' + urlPath); return;
      }
      res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': cache, 'Last-Modified': mtime });
      res.end(data);
    });
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
