import { ONLINE_PROTOCOL, unpackEvent } from './online-wire.js?v=25';
import { onlineServer } from './online-config.js?v=25';

export const ONLINE_TOKEN_KEY = 'poke-arena:ws-token';
const ROOM_KEY = 'poke-arena:ws-room', SEQ_KEY = 'poke-arena:ws-seq';
const read = key => { try { return globalThis.sessionStorage?.getItem(key) || null; } catch { return null; } };
function save(key, value) { try { if (value === null) globalThis.sessionStorage?.removeItem(key);else globalThis.sessionStorage?.setItem(key, String(value)); } catch {} }
export const hasSavedOnlineSession = () => !!read(ONLINE_TOKEN_KEY);

export class OnlineClient {
  constructor({ onSnapshot, onSearch, onConnection, onIdle = () => {}, serverUrl = onlineServer(), createSocket = url => new WebSocket(url) }) {
    Object.assign(this, { onSnapshot, onSearch, onConnection, onIdle, serverUrl, createSocket });
    this.active = false;this.connected = false;this.version = -1;this.seq = 0;this.generation = 0;this.socketId = 0;this.pending = new Map();this.retry = 0;
  }
  async start(name, deck) {
    this.suspend();this.active = true;this.mode = 'search';this.started = Date.now();this.name = name;this.deck = [...deck];this.token = read(ONLINE_TOKEN_KEY);
    this.roomId = null;this.seq = 0;this.version = -1;this.epoch = null;this.restoring = false;save(ROOM_KEY, null);save(SEQ_KEY, null);
    this.connect('lobby');return true;
  }
  async resume() {
    this.token = read(ONLINE_TOKEN_KEY);if (!this.token) return false;
    this.active = true;this.mode = 'resume';this.restoring = true;this.roomId = read(ROOM_KEY);this.seq = Math.max(0, Number(read(SEQ_KEY)) || 0);this.lookupTried = false;
    this.connect(this.roomId ? 'room' : 'lobby');return true;
  }
  url(kind) {
    const url = new URL(this.serverUrl);url.protocol = url.protocol === 'https:' || url.protocol === 'wss:' ? 'wss:' : 'ws:';
    url.pathname = kind === 'room' ? '/v1/rooms/' + this.roomId : '/v1/lobby';url.search = '';url.hash = '';return url.href;
  }
  dropSocket() {
    const previous = this.socket;this.socket = null;this.socketId++;clearInterval(this.heartbeat);clearInterval(this.searchTimer);clearTimeout(this.ackTimer);this.ackTimer = null;
    if (previous) try { previous.close(); } catch {}
  }
  connect(kind) {
    if (!this.active) return;
    clearTimeout(this.reconnectTimer);this.reconnectTimer = null;this.dropSocket();this.kind = kind;this.connected = false;
    const generation = this.generation, socketId = this.socketId;
    let socket;
    try { socket = this.createSocket(this.url(kind)); } catch { this.reconnect();return; }
    this.socket = socket;
    const current = () => this.active && generation === this.generation && socketId === this.socketId && socket === this.socket;
    socket.onopen = () => {
      if (!current()) return;
      this.lastMessage = Date.now();this.lastSnapshot = Date.now();
      this.write({ type: 'hello', protocol: ONLINE_PROTOCOL, token: this.token, ...(kind === 'room' ? { after: this.seq, resume: this.restoring } : { mode: this.mode === 'resume' || this.restoring ? 'resume' : 'search', name: this.name, deck: this.deck }) });
      this.heartbeat = setInterval(() => {
        if (!current()) return;
        const now = Date.now();
        if (now - this.lastMessage > 10000 || this.mode === 'battle' && this.gameState !== 'ended' && now - this.lastSnapshot > 4500) { this.reconnect();return; }
        this.pingAt = now;this.write('ping');
      }, 2500);
    };
    socket.onmessage = event => {
      if (!current()) return;
      this.lastMessage = Date.now();
      if (event.data === 'pong') { this.latency = this.lastMessage - (this.pingAt || this.lastMessage);return; }
      let packet;try { packet = JSON.parse(event.data); } catch { this.reconnect();return; }
      this.receive(packet);
    };
    socket.onerror = () => { if (current()) this.reconnect(); };
    socket.onclose = event => {
      if (!current()) return;
      if (event.code === 4001) { this.suspend();this.onIdle('La partida se abrió en otra pestaña.');return; }
      this.reconnect();
    };
  }
  write(packet) {
    if (this.socket?.readyState !== 1) return false;
    try { this.socket.send(typeof packet === 'string' ? packet : JSON.stringify(packet));return true; } catch { return false; }
  }
  receive(packet) {
    if (packet.type === 'welcome') { if (packet.token) { this.token = packet.token;save(ONLINE_TOKEN_KEY, packet.token); }return; }
    if (packet.type === 'searching') {
      this.mode = 'search';this.connected = true;this.retry = 0;this.started = packet.joined || this.started || Date.now();this.onConnection('');
      clearInterval(this.searchTimer);const update = () => this.onSearch(Date.now() - this.started);update();this.searchTimer = setInterval(update, 1000);return;
    }
    if (packet.type === 'matched') {
      if (!/^[a-f0-9-]{36}$/.test(packet.roomId || '')) { this.reconnect();return; }
      if (this.roomId !== packet.roomId) { this.seq = 0;this.version = -1;this.epoch = null;save(SEQ_KEY, null); }
      this.roomId = packet.roomId;save(ROOM_KEY, this.roomId);this.connect('room');return;
    }
    if (packet.type === 'snapshot') { this.apply(packet);return; }
    if (packet.type === 'result') {
      const entry = this.pending.get(packet.nonce);if (!entry) return;
      clearTimeout(entry.timer);this.pending.delete(packet.nonce);entry.resolve(packet.result || { ok: false });return;
    }
    if (packet.type === 'idle') {
      if (packet.expired) { this.token = null;save(ONLINE_TOKEN_KEY, null); }
      save(ROOM_KEY, null);save(SEQ_KEY, null);this.roomId = null;this.suspend();this.onConnection('');this.onIdle();return;
    }
    if (packet.type === 'error') {
      if (packet.code === 'session' && this.kind === 'room' && !this.lookupTried) { this.lookupTried = true;this.roomId = null;save(ROOM_KEY, null);this.mode = 'resume';this.connect('lobby');return; }
      if (packet.code === 'server') { this.reconnect();return; }
      this.suspend();this.onIdle(packet.message || 'No se pudo conectar.');
    }
  }
  apply(packet) {
    if (packet.status !== 'matched' || !packet.game || !Array.isArray(packet.events)) return;
    if (packet.epoch !== this.epoch) { this.epoch = packet.epoch;this.version = -1; }
    if (packet.version < this.version) return;
    this.mode = 'battle';this.connected = true;this.restoring = false;this.retry = 0;this.version = packet.version;this.team = packet.team;this.roomId = packet.roomId;this.lastSnapshot = Date.now();this.gameState = packet.game.state;
    save(ROOM_KEY, this.roomId);
    const events = packet.events.filter(entry => entry.seq > this.seq).map(entry => ({ ...entry, event: unpackEvent(entry.event) }));
    this.seq = Math.max(this.seq, packet.seq);save(SEQ_KEY, this.seq);this.onConnection('');this.onSnapshot({ ...packet, events });
    if (!this.ackTimer) this.ackTimer = setTimeout(() => { this.ackTimer = null;this.write({ type: 'ack', seq: this.seq }); }, 200);
  }
  reconnect() {
    if (!this.active || this.reconnectTimer) return;
    this.connected = false;this.dropSocket();this.onConnection('Reconectando…');
    const delay = Math.min(3000, 250 * 2 ** Math.min(4, this.retry++));
    this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null;this.connect(this.roomId ? 'room' : 'lobby'); }, delay);
  }
  reconnectIfStale() {
    if (!this.active) return;
    if (!this.socket || this.socket.readyState > 1 || Date.now() - (this.lastMessage || 0) > 4500) { clearTimeout(this.reconnectTimer);this.reconnectTimer = null;this.reconnect(); }
  }
  send(action) {
    if (!this.active || !this.roomId) return Promise.resolve({ ok: false, reason: 'Partida cerrada.' });
    const body = { ...action, type: 'action', nonce: crypto.randomUUID() }, generation = this.generation, roomId = this.roomId;
    return new Promise(resolve => {
      const entry = { body, resolve, started: Date.now(), roomId };this.pending.set(body.nonce, entry);
      const attempt = () => {
        if (!this.pending.has(body.nonce)) return;
        if (!this.active || generation !== this.generation || roomId !== this.roomId || Date.now() - entry.started > 8000) {
          this.pending.delete(body.nonce);resolve({ ok: false, reason: 'No se pudo enviar la jugada.' });return;
        }
        if (this.connected) this.write(body);
        entry.timer = setTimeout(attempt, 700);
      };
      attempt();
    });
  }
  suspend() {
    this.active = false;this.connected = false;this.generation++;clearTimeout(this.reconnectTimer);this.reconnectTimer = null;this.dropSocket();
    for (const entry of this.pending.values()) { clearTimeout(entry.timer);entry.resolve({ ok: false, reason: 'Partida cerrada.' }); }this.pending.clear();
  }
  close() {
    if (this.mode === 'battle' && this.gameState !== 'ended') this.write({ type: 'action', kind: 'leave', nonce: crypto.randomUUID() });
    else if (this.kind === 'lobby') this.write({ type: 'cancel' });
    this.suspend();return Promise.resolve();
  }
}
