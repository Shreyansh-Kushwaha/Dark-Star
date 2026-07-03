const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;

export class NetworkManager {
  constructor() {
    this.ws = null;
    this.role = null;     // 'host' | 'client'
    this.roomCode = null;
    this.connected = false;
    this._handlers = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL);
      // Fail fast if the socket opens but the server never responds (or never
      // opens) — otherwise `await net.connect()` callers hang forever.
      const timer = setTimeout(() => {
        if (!this.connected) { try { this.ws.close(); } catch (_) {} reject(new Error('connect timeout')); }
      }, 8000);
      this.ws.onopen = () => { clearTimeout(timer); this.connected = true; resolve(); };
      this.ws.onerror = (e) => { clearTimeout(timer); reject(e); };
      this.ws.onmessage = (e) => {
        // A single malformed/non-JSON frame must not kill the socket handler.
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }
        this._onMessage(msg);
      };
      this.ws.onclose = () => {
        clearTimeout(timer);
        this.connected = false;
        this._emit('disconnected', {});
      };
    });
  }

  createRoom() {
    this._send({ type: 'ROOM_CREATE' });
  }

  joinRoom(code) {
    this._send({ type: 'ROOM_JOIN', code });
  }

  on(type, fn) {
    if (!this._handlers.has(type)) this._handlers.set(type, []);
    this._handlers.get(type).push(fn);
  }

  off(type, fn) {
    const arr = this._handlers.get(type) || [];
    const idx = arr.indexOf(fn);
    if (idx > -1) arr.splice(idx, 1);
  }

  send(type, payload = {}) {
    this._send({ type, ...payload });
  }

  _send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  _onMessage(msg) {
    if (msg.type === 'ROOM_READY') {
      this.role = msg.role;
      this.roomCode = msg.code;
    }
    this._emit(msg.type, msg);
    this._emit('*', msg);
  }

  _emit(type, msg) {
    (this._handlers.get(type) || []).forEach(fn => fn(msg));
  }

  isHost() { return this.role === 'host'; }
  isClient() { return this.role === 'client'; }

  disconnect() {
    if (this.ws) { this.ws.close(); this.ws = null; }
    this.connected = false;
    this.role = null;
    this.roomCode = null;
  }
}
