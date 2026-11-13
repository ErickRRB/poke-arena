import { DurableObject } from 'cloudflare:workers';
import animations from '../../dist/assets/pokemon/manifest.json' with { type: 'json' };
import { RealtimeMatch, validDeck, safeName } from './match.js';
import { ONLINE_PROTOCOL, SIMULATION_HZ, SNAPSHOT_HZ, RECONNECT_GRACE } from '../../dist/online-wire.js';

const OPEN = 1;
const tokenHash = async token => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))].map(byte => byte.toString(16).padStart(2, '0')).join('');
const attachment = ws => ws.deserializeAttachment() || {};
function send(ws, packet) { try { if (ws.readyState === OPEN) { ws.send(JSON.stringify(packet));return true; } } catch {} return false; }
function close(ws, code = 1000, reason = '') { try { ws.close(code, reason); } catch {} }
function reject(ws, message, code = 'invalid') { send(ws, { type: 'error', message, code, fatal: true });close(ws, 1008, 'Invalid request'); }
function parseMessage(message) {
  if (typeof message !== 'string' || message.length > 4096) throw Error('Mensaje demasiado grande.');
  const packet = JSON.parse(message);
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) throw Error('Mensaje no válido.');
  return packet;
}
function socket(ctx, request, limit) {
  if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
  const now = Date.now();
  for (const ws of ctx.getWebSockets()) if (!attachment(ws).authed && now - attachment(ws).connectedAt > 10000) close(ws, 1008, 'Handshake expired');
  if (ctx.getWebSockets().filter(ws => ws.readyState === OPEN).length >= limit) return new Response('Busy', { status: 503 });
  const [client, server] = Object.values(new WebSocketPair());
  ctx.acceptWebSocket(server);server.serializeAttachment({ connectedAt: now, authed: false });
  return new Response(null, { status: 101, webSocket: client });
}
function lastSeen(ctx, ws) { return Math.max(attachment(ws).seen || attachment(ws).connectedAt || 0, ctx.getWebSocketAutoResponseTimestamp(ws)?.getTime() || 0); }

export class ArenaLobby extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);this.sql = ctx.storage.sql;this.pendingMatches = new Map();
    this.sql.exec('CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,token_hash TEXT UNIQUE NOT NULL,name TEXT NOT NULL,deck TEXT NOT NULL,room_id TEXT,joined INTEGER,updated INTEGER NOT NULL)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS sessions_queue ON sessions(joined) WHERE room_id IS NULL');
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  fetch(request) { return socket(this.ctx, request, 128); }
  session(id) { return this.sql.exec('SELECT * FROM sessions WHERE id=?', id).toArray()[0]; }
  sockets(id) { return this.ctx.getWebSockets().filter(ws => ws.readyState === OPEN && attachment(ws).authed && attachment(ws).playerId === id); }
  async webSocketMessage(ws, message) {
    try {
      const packet = parseMessage(message), state = attachment(ws);
      if (!state.authed) { if (packet.type !== 'hello' || state.handshaking) return reject(ws, 'Volvé a conectar.');state.handshaking = true;ws.serializeAttachment(state);return await this.hello(ws, packet); }
      if (packet.type === 'cancel') return await this.cancel(state.playerId, ws);
      if (packet.type !== 'ack') reject(ws, 'Acción no válida.');
    } catch (error) { console.error(JSON.stringify({ event: 'lobby_message_error', message: error.message }));reject(ws, 'No se pudo conectar.', 'server'); }
  }
  async hello(ws, packet) {
    if (packet.protocol !== ONLINE_PROTOCOL || !['search', 'resume'].includes(packet.mode)) return reject(ws, 'Actualizá la página para conectar.', 'protocol');
    const now = Date.now();this.sql.exec('DELETE FROM sessions WHERE updated<?', now - 86400000);
    let session, token;
    if (typeof packet.token === 'string' && packet.token.length >= 48 && packet.token.length <= 160) session = this.sql.exec('SELECT * FROM sessions WHERE token_hash=?', await tokenHash(packet.token)).toArray()[0];
    if (!session) {
      if (packet.mode === 'resume') { send(ws, { type: 'idle', expired: true });close(ws);return; }
      if (!validDeck(packet.deck)) return reject(ws, 'Elegí ocho cartas diferentes.', 'deck');
      token = crypto.randomUUID() + crypto.randomUUID();
      session = { id: crypto.randomUUID(), token_hash: await tokenHash(token), name: safeName(packet.name), deck: JSON.stringify(packet.deck), room_id: null, joined: null, updated: now };
      this.sql.exec('INSERT INTO sessions(id,token_hash,name,deck,updated) VALUES(?,?,?,?,?)', session.id, session.token_hash, session.name, session.deck, now);
    }
    ws.serializeAttachment({ authed: true, playerId: session.id, seen: now, connectedAt: now });
    for (const previous of this.sockets(session.id)) if (previous !== ws) close(previous, 4001, 'Session replaced');
    send(ws, { type: 'welcome', protocol: ONLINE_PROTOCOL, ...(token ? { token } : {}) });
    if (session.room_id) {
      const summary = await this.env.ARENAS.getByName(session.room_id).summary();
      if (summary.state && summary.state !== 'ended') { send(ws, { type: 'matched', roomId: session.room_id });return; }
      this.sql.exec('UPDATE sessions SET room_id=NULL,joined=NULL WHERE id=?', session.id);session.room_id = null;session.joined = null;
    }
    if (packet.mode === 'resume' && session.joined === null) { send(ws, { type: 'idle' });close(ws);return; }
    if (packet.mode === 'search') {
      if (!validDeck(packet.deck)) return reject(ws, 'Elegí ocho cartas diferentes.', 'deck');
      session.name = safeName(packet.name);session.deck = JSON.stringify(packet.deck);
    }
    session.joined ??= now;
    this.sql.exec('UPDATE sessions SET name=?,deck=?,joined=?,updated=? WHERE id=? AND room_id IS NULL', session.name, session.deck, session.joined, now, session.id);
    send(ws, { type: 'searching', joined: session.joined });
    await this.match(session.id);
  }
  async match(id) {
    const own = this.session(id);if (!own || own.room_id || own.joined === null) return;
    const now = Date.now(), candidates = this.sql.exec('SELECT * FROM sessions WHERE room_id IS NULL AND joined IS NOT NULL AND id<>? ORDER BY joined,id LIMIT 128', id).toArray();
    const other = candidates.find(candidate => this.sockets(candidate.id).some(ws => now - lastSeen(this.ctx, ws) < 15000));
    if (!other) return;
    const roomId = crypto.randomUUID(), players = [other, own];
    this.sql.exec('UPDATE sessions SET room_id=?,joined=NULL,updated=? WHERE id IN (?,?) AND room_id IS NULL', roomId, now, other.id, own.id);
    const room = this.env.ARENAS.getByName(roomId);
    const pending = room.create({ id: roomId, players: players.map(player => ({ id: player.id, tokenHash: player.token_hash, name: player.name, deck: JSON.parse(player.deck) })) });
    this.pendingMatches.set(roomId, pending);
    try {
      await pending;
      for (const player of players) {
        if (this.session(player.id)?.room_id !== roomId) { await room.abandon(player.id);continue; }
        for (const ws of this.sockets(player.id)) send(ws, { type: 'matched', roomId });
      }
      console.log(JSON.stringify({ event: 'match_created', roomId }));
    } catch (error) {
      this.sql.exec('UPDATE sessions SET room_id=NULL,joined=? WHERE room_id=?', now, roomId);
      console.error(JSON.stringify({ event: 'match_create_failed', message: error.message }));
      for (const player of players) for (const ws of this.sockets(player.id)) reject(ws, 'No se pudo iniciar la partida.', 'server');
    } finally { this.pendingMatches.delete(roomId); }
  }
  async cancel(id, ws) {
    const session = this.session(id);if (!session) return;
    this.sql.exec('UPDATE sessions SET joined=NULL,room_id=NULL,updated=? WHERE id=?', Date.now(), id);
    if (session.room_id) { await this.pendingMatches.get(session.room_id);await this.env.ARENAS.getByName(session.room_id).abandon(id); }
    send(ws, { type: 'idle' });close(ws);
  }
  // A dropped socket may return to its existing queue. Only cancel dequeues it;
  // matchmaking above requires a live connection before reserving a room.
  webSocketClose() {}
  webSocketError(ws) { close(ws, 1011, 'Connection error'); }
}

export class ArenaRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);this.sql = ctx.storage.sql;this.epoch = crypto.randomUUID();this.lastSave = Date.now();this.lastBroadcast = 0;this.nextBroadcast = Date.now();
    this.sql.exec('CREATE TABLE IF NOT EXISTS match_state(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL)');
    const saved = this.sql.exec('SELECT data FROM match_state WHERE id=1').toArray()[0];
    this.match = saved ? new RealtimeMatch({ stored: JSON.parse(saved.data), animations }) : null;
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    if (this.match && this.match.game.state !== 'ended') this.start();
  }
  create({ id, players }) {
    if (this.match) return { state: this.match.game.state };
    this.match = new RealtimeMatch({ id, players, animations });this.persist();this.start();
    return { state: 'ready' };
  }
  summary() { return { state: this.match?.game.state || null }; }
  fetch(request) { return socket(this.ctx, request, 8); }
  persist() {
    if (!this.match) return;
    this.sql.exec('INSERT INTO match_state(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data', JSON.stringify(this.match.serialize()));this.lastSave = Date.now();
  }
  refreshSeen() {
    for (const ws of this.ctx.getWebSockets()) { const state = attachment(ws);if (state.authed && ws.readyState === OPEN) this.match.touch(state.team, lastSeen(this.ctx, ws)); }
  }
  start() { if (!this.timer) this.timer = setInterval(() => this.tick(), 1000 / SIMULATION_HZ); }
  stop() { clearInterval(this.timer);this.timer = null; }
  tick() {
    try {
      if (!this.match) return this.stop();
      const now = Date.now();this.refreshSeen();this.match.advance(now);
      const ended = this.match.game.state === 'ended';
      if (ended || now - this.lastSave >= 1000) this.persist();
      if (ended || now >= this.nextBroadcast) {
        this.broadcast();this.nextBroadcast += 1000 / SNAPSHOT_HZ;
        if (this.nextBroadcast < now) this.nextBroadcast = now + 1000 / SNAPSHOT_HZ;
      }
      if (ended) { this.stop();this.ctx.waitUntil(this.ctx.storage.setAlarm(now + 900000)); }
    } catch (error) { console.error(JSON.stringify({ event: 'room_tick_error', message: error.message }));this.stop();for (const ws of this.ctx.getWebSockets()) close(ws, 1012, 'Restarting room'); }
  }
  broadcast() {
    this.match.version++;this.lastBroadcast = Date.now();
    for (const ws of this.ctx.getWebSockets()) {
      const state = attachment(ws);if (!state.authed || ws.readyState !== OPEN || ws.bufferedAmount > 131072) continue;
      send(ws, this.match.packet(state.team, state.after || 0, this.epoch, this.lastBroadcast));
    }
  }
  async webSocketMessage(ws, message) {
    try {
      const packet = parseMessage(message), state = attachment(ws), now = Date.now();
      if (!state.authed) {
        if (packet.type !== 'hello' || packet.protocol !== ONLINE_PROTOCOL || state.handshaking || typeof packet.token !== 'string' || packet.token.length < 48 || packet.token.length > 160) return reject(ws, 'Volvé a conectar.', 'session');
        state.handshaking = true;ws.serializeAttachment(state);
        const hash = await tokenHash(packet.token), team = this.match?.players.findIndex(player => player.tokenHash === hash);
        if (team !== 0 && team !== 1) return reject(ws, 'La partida ya no está disponible.', 'session');
        this.refreshSeen();this.match.advance(now);
        if (packet.resume && this.match.game.state === 'ended') { send(ws, { type: 'idle' });close(ws);return; }
        ws.serializeAttachment({ authed: true, team, playerId: this.match.players[team].id, seen: now, connectedAt: now, after: Math.min(this.match.seq, Math.max(0, Number(packet.after) || 0)) });
        for (const previous of this.ctx.getWebSockets()) if (previous !== ws && attachment(previous).authed && attachment(previous).team === team) close(previous, 4001, 'Session replaced');
        this.match.touch(team, now);this.persist();this.broadcast();
        if (this.match.game.state !== 'ended') this.start();
        return;
      }
      state.seen = now;
      if (packet.type === 'ack') { state.after = Math.min(this.match.seq, Math.max(state.after || 0, Number(packet.seq) || 0));ws.serializeAttachment(state);return; }
      if (packet.type !== 'action') return reject(ws, 'Acción no válida.');
      if (now - (state.inputWindow || 0) >= 1000) { state.inputWindow = now;state.inputs = 0; }
      if (++state.inputs > 20) return reject(ws, 'Demasiadas acciones.');
      ws.serializeAttachment(state);this.refreshSeen();
      const result = this.match.action(state.team, packet, now);
      // Save receipts and actions before acknowledging them, including retries.
      this.persist();this.broadcast();send(ws, { type: 'result', nonce: packet.nonce, result });
      if (this.match.game.state === 'ended') this.tick();
    } catch (error) { console.error(JSON.stringify({ event: 'room_message_error', message: error.message }));reject(ws, 'No se pudo procesar la jugada.', 'server'); }
  }
  abandon(id) {
    const team = this.match?.players.findIndex(player => player.id === id);if (team !== 0 && team !== 1) return false;
    this.match.action(team, { kind: 'leave', nonce: crypto.randomUUID() });this.persist();this.broadcast();this.tick();return true;
  }
  webSocketClose(ws) {
    const state = attachment(ws);if (!state.authed || !this.match || this.match.game.state === 'ended') return;
    if (!this.ctx.getWebSockets().some(other => other !== ws && other.readyState === OPEN && attachment(other).authed && attachment(other).team === state.team)) { this.match.touch(state.team, Date.now());this.persist();this.start(); }
  }
  webSocketError(ws) { close(ws, 1011, 'Connection error'); }
  async alarm() {
    if (this.match?.game.state !== 'ended') return;
    for (const ws of this.ctx.getWebSockets()) close(ws, 1000, 'Match expired');
    await this.ctx.storage.deleteAll();this.match = null;
  }
}

export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (['/', '/health'].includes(url.pathname)) return Response.json({ ok: true, game: 'Poké Arena', protocol: ONLINE_PROTOCOL, transport: 'websocket', simulationHz: SIMULATION_HZ, snapshotHz: SNAPSHOT_HZ, reconnectGraceMs: RECONNECT_GRACE }, { headers: { 'Cache-Control': 'no-store' } });
    const origin = request.headers.get('origin');
    if (origin && !(env.ALLOWED_ORIGINS || '').split(',').includes(origin)) return new Response('Origin not allowed', { status: 403 });
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
    if (url.pathname === '/v1/lobby') return env.LOBBY.getByName('matchmaking-v2').fetch(request);
    const room = url.pathname.match(/^\/v1\/rooms\/([a-f0-9-]{36})$/);
    if (room) return env.ARENAS.getByName(room[1]).fetch(request);
    return new Response('Not found', { status: 404 });
  },
};
