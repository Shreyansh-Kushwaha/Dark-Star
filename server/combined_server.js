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

const server = http.createServer((req, res) => {
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
    if (other) other.send(raw);
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
