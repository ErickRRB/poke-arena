import {C1_SERVICE,C4_SERVICE,serviceForServer,serviceEnvelope,assertC4Envelope} from '../../dist/online-context.js?v=1';
import {prepareC4Transport} from '../../dist/c4-wire-preparation.js?v=1';
import {admitC4Selection} from '../../dist/profile-selection.js?v=1';
import {C4_SEARCH_VERSION,C4_SEARCH_TOKEN,c4SearchRequest} from '../../dist/c4-search.js?v=1';
import { DurableObject } from 'cloudflare:workers';
import animations from '../../dist/assets/pokemon/manifest.json' with { type: 'json' };
import { RealtimeMatch, safeName } from './match.js';
import { ONLINE_PROTOCOL, SIMULATION_HZ, SNAPSHOT_HZ, RECONNECT_GRACE } from '../../dist/online-wire.js?v=34';
import {selectionVersion,selectedDeck,validQueuedDeck,queueVersion,continuesQueue,legacyQueueExpired,LEGACY_QUEUE_MAX_AGE} from './selection.js';

const OPEN = 1;
const LEGACY_QUEUE_NOTICE = 'legacy-queue-expired';
// v1 terminal identities are retained. Future GC must define expiry/tombstones
// without turning a delayed pre-welcome retry into a fresh admission.
const C4_CANCELLING='c4-search-cancelling',C4_CANCELLED='c4-search-cancelled',C4_ENDED='c4-search-ended';
const legacyQueueIdle = () => ({type:'idle',selectionExpired:true,selectionVersion,message:'La búsqueda anterior terminó. Revisá tu mazo y volvé a buscar.'});
const tokenHash = async token => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))].map(byte => byte.toString(16).padStart(2, '0')).join('');
const attachment = ws => ws.deserializeAttachment() || {};
function send(ws, packet) { try { if (ws.readyState === OPEN) { const state=attachment(ws);ws.send(JSON.stringify(state.service==='c4'?{...packet,...serviceEnvelope(C4_SERVICE),...(state.c4SearchVersion===C4_SEARCH_VERSION?{c4SearchVersion:C4_SEARCH_VERSION}:{})}:packet));return true; } } catch {} return false; }
function close(ws, code = 1000, reason = '') { try { ws.close(code, reason); } catch {} }
function reject(ws, message, code = 'invalid') { send(ws, { type: 'error', message, code, fatal: true });close(ws, 1008, 'Invalid request'); }
function currentProtocol(ws, state,service=C1_SERVICE) {
  if (state.protocol === service.protocol) return true;
  reject(ws, 'Actualizá la página para conectar.', 'protocol');return false;
}
function parseMessage(message) {
  if (typeof message !== 'string' || message.length > 4096) throw Error('Mensaje demasiado grande.');
  const packet = JSON.parse(message);
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) throw Error('Mensaje no válido.');
  return packet;
}
function socket(ctx, request, limit,service=C1_SERVICE) {
  if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
  const now = Date.now();
  for (const ws of ctx.getWebSockets()) if (!attachment(ws).authed && now - attachment(ws).connectedAt > 10000) close(ws, 1008, 'Handshake expired');
  if (ctx.getWebSockets().filter(ws => ws.readyState === OPEN).length >= limit) return new Response('Busy', { status: 503 });
  const [client, server] = Object.values(new WebSocketPair());
  ctx.acceptWebSocket(server);server.serializeAttachment({ connectedAt: now, authed: false,...(service.id==='c4'?{service:'c4'}:{}) });
  return new Response(null, { status: 101, webSocket: client });
}
function lastSeen(ctx, ws) { return Math.max(attachment(ws).seen || attachment(ws).connectedAt || 0, ctx.getWebSocketAutoResponseTimestamp(ws)?.getTime() || 0); }

export class ArenaLobby extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);this.service=serviceForServer(env);this.ready=this.service.id==='c4'?ctx.blockConcurrencyWhile(()=>prepareC4Transport()):Promise.resolve();this.sql = ctx.storage.sql;this.pendingMatches = new Map();
    this.sql.exec('CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,token_hash TEXT UNIQUE NOT NULL,name TEXT NOT NULL,deck TEXT NOT NULL,room_id TEXT,joined INTEGER,updated INTEGER NOT NULL)');
    const columns=this.sql.exec('PRAGMA table_info(sessions)').toArray();
    if(!columns.some(column=>column.name==='selection_version'))this.sql.exec('ALTER TABLE sessions ADD COLUMN selection_version INTEGER NOT NULL DEFAULT 0');
    if(!columns.some(column=>column.name==='selection_notice'))this.sql.exec('ALTER TABLE sessions ADD COLUMN selection_notice TEXT');
    for(const column of ['profile_context','c4_selection'])if(!columns.some(value=>value.name===column))this.sql.exec('ALTER TABLE sessions ADD COLUMN '+column+' TEXT');
    this.sql.exec('CREATE INDEX IF NOT EXISTS sessions_queue ON sessions(joined) WHERE room_id IS NULL');
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    ctx.waitUntil(this.scheduleLegacyExpiry());
  }
  fetch(request) { return this.service.id==='c4'?this.ready.then(()=>socket(this.ctx,request,128,this.service)):socket(this.ctx, request,128); }
  session(id) { return this.sql.exec('SELECT * FROM sessions WHERE id=?', id).toArray()[0]; }
  async scheduleLegacyExpiry(){
    if(this.service.id==='c4')return;
    const row=this.sql.exec('SELECT MIN(joined) AS joined FROM sessions WHERE room_id IS NULL AND joined IS NOT NULL AND selection_version=0').toArray()[0];
    if(row?.joined===null||row?.joined===undefined)return;
    const when=Math.max(Date.now()+1,row.joined+LEGACY_QUEUE_MAX_AGE),existing=await this.ctx.storage.getAlarm();
    if(existing===null||when<existing)await this.ctx.storage.setAlarm(when);
  }
  endLegacyQueue(session,now=Date.now()){
    this.sql.exec('UPDATE sessions SET joined=NULL,selection_notice=?,updated=? WHERE id=? AND room_id IS NULL AND selection_version=0',LEGACY_QUEUE_NOTICE,now,session.id);
    for(const ws of this.sockets(session.id)){send(ws,legacyQueueIdle());close(ws);}
  }
  expireLegacyQueues(now=Date.now()){
    if(this.service.id==='c4')return;
    const live=new Set(this.livePlayerIds(now));
    for(const {id} of this.sql.exec('UPDATE sessions SET joined=NULL,selection_notice=?,updated=? WHERE room_id IS NULL AND joined IS NOT NULL AND selection_version=0 AND joined<=? RETURNING id',LEGACY_QUEUE_NOTICE,now,now-LEGACY_QUEUE_MAX_AGE)){
      if(live.has(id))for(const ws of this.sockets(id)){send(ws,legacyQueueIdle());close(ws);}
    }
  }
  async alarm(){this.expireLegacyQueues();for(const id of this.livePlayerIds())await this.match(id);await this.scheduleLegacyExpiry();}
  livePlayerIds(now=Date.now()){
    const ids=new Set();
    for(const ws of this.ctx.getWebSockets()){
      const state=attachment(ws);
      if(ws.readyState===OPEN&&state.authed&&state.protocol===this.service.protocol&&typeof state.playerId==='string'&&now-lastSeen(this.ctx,ws)<15000)ids.add(state.playerId);
    }
    return [...ids];
  }
  sockets(id) { return this.ctx.getWebSockets().filter(ws => { const state=attachment(ws);return ws.readyState===OPEN && state.authed && state.playerId===id && currentProtocol(ws,state,this.service); }); }
  async webSocketMessage(ws, message) {
    try {
      const packet = parseMessage(message), state = attachment(ws);
      if (!state.authed) { if (packet.type !== 'hello' || state.handshaking) return reject(ws, 'Volvé a conectar.');state.handshaking = true;ws.serializeAttachment(state);return await this.hello(ws, packet); }
      if (!currentProtocol(ws,state,this.service)) return;
      if (packet.type === 'cancel') return await this.cancel(state.playerId, ws);
      if (packet.type !== 'ack') reject(ws, 'Acción no válida.');
    } catch (error) { console.error(JSON.stringify({ event: 'lobby_message_error', message: error.message }));reject(ws, 'No se pudo conectar.', 'server'); }
  }
  async hello(ws, packet) {
    if(this.service.id==='c4'){await this.ready;return this.helloC4(ws,packet);}
    if (packet.protocol !== ONLINE_PROTOCOL || !['search', 'resume'].includes(packet.mode)) return reject(ws, 'Actualizá la página para conectar.', 'protocol');
    const now = Date.now();this.sql.exec('DELETE FROM sessions WHERE updated<?', now - 86400000);
    let session, token;
    if (typeof packet.token === 'string' && packet.token.length >= 48 && packet.token.length <= 160) session = this.sql.exec('SELECT * FROM sessions WHERE token_hash=?', await tokenHash(packet.token)).toArray()[0];
    if (!session) {
      if (packet.mode === 'resume') { send(ws, { type: 'idle', expired: true });close(ws);return; }
      const deck=selectedDeck(packet.deck);if(!deck)return reject(ws,'Revisá tu mazo antes de buscar.','deck');
      token = crypto.randomUUID() + crypto.randomUUID();
      session = { id: crypto.randomUUID(), token_hash: await tokenHash(token), name: safeName(packet.name), deck: JSON.stringify(deck), room_id: null, joined: null, updated: now,selection_version:selectionVersion };
      this.sql.exec('INSERT INTO sessions(id,token_hash,name,deck,updated,selection_version) VALUES(?,?,?,?,?,?)', session.id, session.token_hash, session.name, session.deck, now,selectionVersion);
    }
    ws.serializeAttachment({ authed: true, protocol: ONLINE_PROTOCOL, playerId: session.id, seen: now, connectedAt: now });
    for (const previous of this.sockets(session.id)) if (previous !== ws) close(previous, 4001, 'Session replaced');
    send(ws, { type: 'welcome', protocol: ONLINE_PROTOCOL, ...(token ? { token } : {}) });
    if (session.room_id) {
      const summary = await this.env.ARENAS.getByName(session.room_id).summary();
      if (summary.state && summary.state !== 'ended') { send(ws, { type: 'matched', roomId: session.room_id });return; }
      this.sql.exec('UPDATE sessions SET room_id=NULL,joined=NULL WHERE id=?', session.id);session.room_id = null;session.joined = null;
    }
    if (packet.mode === 'resume' && session.joined === null) { send(ws,session.selection_notice===LEGACY_QUEUE_NOTICE?legacyQueueIdle():{type:'idle'});close(ws);return; }
    const continuing=continuesQueue(session,packet);
    if(continuing&&legacyQueueExpired(session,now)){this.endLegacyQueue(session,now);return;}
    if (packet.mode === 'search'&&!continuing) {
      const deck=selectedDeck(packet.deck);if(!deck)return reject(ws,'Revisá tu mazo antes de buscar.','deck');
      session.name = safeName(packet.name);session.deck = JSON.stringify(deck);session.selection_version=selectionVersion;session.selection_notice=null;session.joined=now;
    } else if (!validQueuedDeck(session)) {
      this.sql.exec('UPDATE sessions SET joined=NULL,updated=? WHERE id=? AND room_id IS NULL', now, session.id);
      return reject(ws, 'Elegí ocho cartas diferentes.', 'deck');
    }
    session.joined ??= now;
    this.sql.exec('UPDATE sessions SET name=?,deck=?,joined=?,updated=?,selection_version=?,selection_notice=? WHERE id=? AND room_id IS NULL', session.name, session.deck, session.joined, now,queueVersion(session),session.selection_notice??null,session.id);
    send(ws, { type: 'searching', joined: session.joined,selectionVersion:queueVersion(session) });
    if(queueVersion(session)===0)await this.scheduleLegacyExpiry();
    await this.match(session.id);
  }
  async helloC4(ws,packet){
    try{assertC4Envelope(packet);}catch{return reject(ws,'Actualizá la página para conectar.','protocol');}
    // Unknown modes must fail before lookup/INSERT, including against the old
    // authority. A v1 attempt never falls back to server-allocated credentials.
    if(!['search-intent','cancel-intent','resume'].includes(packet.mode))return reject(ws,'Volvé a conectar.','protocol');
    const intent=packet.mode!=='resume';
    if((intent||packet.c4SearchVersion!==undefined)&&(packet.c4SearchVersion!==C4_SEARCH_VERSION||typeof packet.token!=='string'||!C4_SEARCH_TOKEN.test(packet.token)))return reject(ws,'Actualizá la página para conectar.','protocol');
    const now=Date.now(),hash=typeof packet.token==='string'&&packet.token.length>=48&&packet.token.length<=160?await tokenHash(packet.token):null;
    let session=hash?this.sql.exec('SELECT * FROM sessions WHERE token_hash=?',hash).toArray()[0]:null,context,request;
    if(session){try{context=JSON.parse(session.profile_context);assertC4Envelope(context);}catch{return reject(ws,'La sesión pertenece a otra partida.','session');}}
    if(intent){
      try{request=c4SearchRequest(packet);}catch{return reject(ws,'Revisá tu mazo antes de buscar.','deck');}
      if(session&&(context.c4SearchVersion!==C4_SEARCH_VERSION||JSON.stringify(context.searchRequest)!==JSON.stringify(request)))return reject(ws,'La búsqueda pertenece a otro mazo.','session');
      if(!session){
        const selected=admitC4Selection(request.deck,request.selection),cancelling=packet.mode==='cancel-intent';
        context={...serviceEnvelope(this.service),c4SearchVersion:C4_SEARCH_VERSION,searchRequest:request};
        this.sql.exec('INSERT INTO sessions(id,token_hash,name,deck,joined,updated,selection_version,profile_context,c4_selection,selection_notice) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(token_hash) DO NOTHING',crypto.randomUUID(),hash,safeName(request.name),JSON.stringify(selected.keys),cancelling?null:now,now,2,JSON.stringify(context),JSON.stringify(request.selection),cancelling?C4_CANCELLING:null);
        session=this.sql.exec('SELECT * FROM sessions WHERE token_hash=?',hash).toArray()[0];context=JSON.parse(session.profile_context);
        if(context.c4SearchVersion!==C4_SEARCH_VERSION||JSON.stringify(context.searchRequest)!==JSON.stringify(request))return reject(ws,'La búsqueda pertenece a otro mazo.','session');
      }
    }
    const versioned=packet.c4SearchVersion===C4_SEARCH_VERSION||context?.c4SearchVersion===C4_SEARCH_VERSION;
    if(!session){
      if(versioned)ws.serializeAttachment({...attachment(ws),c4SearchVersion:C4_SEARCH_VERSION});
      send(ws,{type:'idle',expired:true,...(versioned?{token:packet.token,searchState:'expired'}:{})});close(ws);return;
    }
    if(packet.c4SearchVersion===C4_SEARCH_VERSION&&context.c4SearchVersion!==C4_SEARCH_VERSION)return reject(ws,'La sesión pertenece a otra partida.','session');
    ws.serializeAttachment({authed:true,protocol:5,service:'c4',playerId:session.id,seen:now,connectedAt:now,...(versioned?{c4SearchVersion:C4_SEARCH_VERSION}:{})});
    for(const previous of this.sockets(session.id))if(previous!==ws)close(previous,4001,'Session replaced');
    send(ws,{type:'welcome',...(versioned?{token:packet.token}:{})});
    if(versioned&&(packet.mode==='cancel-intent'||session.selection_notice===C4_CANCELLING)){
      await this.cancelC4(session.id);send(ws,{type:'idle',searchState:'cancelled'});close(ws);return;
    }
    if(versioned&&[C4_CANCELLED,C4_ENDED].includes(session.selection_notice)){send(ws,{type:'idle',searchState:session.selection_notice===C4_CANCELLED?'cancelled':'ended'});close(ws);return;}
    if(session.room_id){
      await this.pendingMatches.get(session.room_id);session=this.session(session.id);
      if(versioned&&session.selection_notice===C4_CANCELLING){await this.cancelC4(session.id);send(ws,{type:'idle',searchState:'cancelled'});close(ws);return;}
      const summary=await this.env.ARENAS.getByName(session.room_id).summary();
      if(summary.state&&summary.state!=='ended'){send(ws,{type:'matched',roomId:session.room_id});return;}
      if(versioned&&summary.state!=='ended')throw Error('La sala todavía está pendiente.');
      if(versioned)this.sql.exec('UPDATE sessions SET room_id=NULL,joined=NULL,selection_notice=?,updated=? WHERE id=? AND selection_notice IS NULL',C4_ENDED,now,session.id);
      send(ws,{type:'idle',...(versioned?{searchState:'ended'}:{})});close(ws);return;
    }
    if(session.joined==null){send(ws,{type:'idle',...(versioned?{searchState:'ended'}:{})});close(ws);return;}
    if(!validQueuedDeck(session,this.service))return reject(ws,'Revisá tu mazo antes de buscar.','deck');
    send(ws,{type:'searching',joined:session.joined});await this.match(session.id);
  }
  async cancelC4(id){
    let session=this.session(id);if(!session)return;
    if([C4_CANCELLED,C4_ENDED].includes(session.selection_notice))return;
    // Retain the room until abandon actually succeeds. This survives a failed
    // RPC or a cold restart between create/handoff and cancellation.
    this.sql.exec('UPDATE sessions SET joined=NULL,selection_notice=?,updated=? WHERE id=?',C4_CANCELLING,Date.now(),id);
    if(session.room_id){
      await this.pendingMatches.get(session.room_id);
      const room=this.env.ARENAS.getByName(session.room_id),abandoned=await room.abandon(id);
      if(!abandoned&&(await room.summary()).state!=='ended')throw Error('Cancelación pendiente.');
    }
    this.sql.exec('UPDATE sessions SET room_id=NULL,joined=NULL,selection_notice=?,updated=? WHERE id=? AND selection_notice=?',C4_CANCELLED,Date.now(),id,C4_CANCELLING);
  }
  async match(id) {
    const now=Date.now();this.expireLegacyQueues(now);
    const live=this.livePlayerIds(now),own = this.session(id);if (!live.includes(id)||!own || own.room_id || own.joined === null || !validQueuedDeck(own,this.service)) return;
    // The connection cap bounds this set, before querying any persisted backlog.
    const peers=live.filter(peer=>peer!==id),candidates=[];
    for(let offset=0;offset<peers.length;offset+=64){
      const batch=peers.slice(offset,offset+64);
      candidates.push(...this.sql.exec(`SELECT * FROM sessions WHERE room_id IS NULL AND joined IS NOT NULL AND selection_version=? AND id IN (${batch.map(()=>'?').join(',')})`,queueVersion(own),...batch).toArray());
    }
    const other = candidates.sort((a,b)=>a.joined-b.joined||a.id.localeCompare(b.id)).find(session=>validQueuedDeck(session,this.service));
    if (!other) return;
    const roomId = crypto.randomUUID(), players = [other, own];
    this.sql.exec('UPDATE sessions SET room_id=?,joined=NULL,updated=? WHERE id IN (?,?) AND room_id IS NULL', roomId, now, other.id, own.id);
    const room = this.env.ARENAS.getByName(roomId);
    const pending = room.create({ id: roomId,selectionVersion:queueVersion(own), players: players.map(player => ({ id: player.id, tokenHash: player.token_hash, name: player.name, deck: JSON.parse(player.deck),...(this.service.id==='c4'?{selection:JSON.parse(player.c4_selection)}:{}) })) });
    this.pendingMatches.set(roomId, pending);
    try {
      await pending;
      for (const player of players) {
        if(this.service.id==='c4'&&this.session(player.id)?.selection_notice===C4_CANCELLING)continue;
        if (this.session(player.id)?.room_id !== roomId) { await room.abandon(player.id);continue; }
        for (const ws of this.sockets(player.id)) send(ws, { type: 'matched', roomId });
      }
      console.log(JSON.stringify({ event: 'match_created', roomId }));
    } catch (error) {
      for(const player of players)this.sql.exec('UPDATE sessions SET room_id=NULL,joined=? WHERE id=? AND room_id=?'+(this.service.id==='c4'?' AND selection_notice IS NULL':''),player.joined,player.id,roomId);
      await this.scheduleLegacyExpiry();
      console.error(JSON.stringify({ event: 'match_create_failed', message: error.message }));
      for (const player of players) for (const ws of this.sockets(player.id)) reject(ws, 'No se pudo iniciar la partida.', 'server');
    } finally { this.pendingMatches.delete(roomId); }
  }
  async cancel(id, ws) {
    const session = this.session(id);if (!session) return;
    if(this.service.id==='c4'&&JSON.parse(session.profile_context).c4SearchVersion===C4_SEARCH_VERSION){await this.cancelC4(id);send(ws,{type:'idle',searchState:'cancelled'});close(ws);return;}
    this.sql.exec('UPDATE sessions SET joined=NULL,room_id=NULL,selection_notice=NULL,updated=? WHERE id=?', Date.now(), id);
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
    super(ctx, env);this.service=serviceForServer(env);this.sql = ctx.storage.sql;this.epoch = crypto.randomUUID();this.lastSave = Date.now();this.lastBroadcast = 0;this.nextBroadcast = Date.now();
    this.sql.exec('CREATE TABLE IF NOT EXISTS match_state(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL)');
    const saved = this.sql.exec('SELECT data FROM match_state WHERE id=1').toArray()[0];
    const restore=()=>{this.match=saved?new RealtimeMatch({stored:JSON.parse(saved.data),animations,service:this.service}):null;};
    this.match=null;this.ready=this.service.id==='c4'?ctx.blockConcurrencyWhile(async()=>{await prepareC4Transport();restore();if(this.match&&this.match.game.state!=='ended')this.start();}):Promise.resolve();if(this.service.id!=='c4')restore();
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    if (this.match && this.match.game.state !== 'ended') this.start();
  }
  create(input) { return this.service.id==='c4'?this.ready.then(()=>this.createReady(input)):this.createReady(input); }
  createReady({ id, players,selectionVersion=0 }) {
    if (this.match) return { state: this.match.game.state };
    this.match = new RealtimeMatch({ id, players, animations,selectionVersion,service:this.service });this.persist();this.start();
    return { state: 'ready' };
  }
  summary() { const result=()=>({state:this.match?.game.state||null});return this.service.id==='c4'?this.ready.then(result):result(); }
  fetch(request) { return this.service.id==='c4'?this.ready.then(()=>socket(this.ctx,request,8,this.service)):socket(this.ctx,request,8); }
  persist() {
    if (!this.match) return;
    this.sql.exec('INSERT INTO match_state(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data', JSON.stringify(this.match.serialize()));this.lastSave = Date.now();
  }
  refreshSeen() {
    for (const ws of this.ctx.getWebSockets()) { const state = attachment(ws);if (state.authed && ws.readyState === OPEN && currentProtocol(ws,state,this.service)) this.match.touch(state.team, lastSeen(this.ctx, ws)); }
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
      if (!currentProtocol(ws,state,this.service)) continue;
      send(ws, this.match.packet(state.team, state.after || 0, this.epoch, this.lastBroadcast));
    }
  }
  async webSocketMessage(ws, message) {
    try {
      const packet = parseMessage(message), state = attachment(ws), now = Date.now();
      if (!state.authed) {
        if (packet.protocol !== this.service.protocol) return reject(ws, 'Actualizá la página para conectar.', 'protocol');
        if (packet.type !== 'hello' || state.handshaking || typeof packet.token !== 'string' || packet.token.length < 48 || packet.token.length > 160) return reject(ws, 'Volvé a conectar.', 'session');
        if(this.service.id==='c4')try{assertC4Envelope(packet);}catch{return reject(ws,'Actualizá la página para conectar.','protocol');}
        state.handshaking = true;ws.serializeAttachment(state);
        const hash = await tokenHash(packet.token), team = this.match?.players.findIndex(player => player.tokenHash === hash);
        if (team !== 0 && team !== 1) return reject(ws, 'La partida ya no está disponible.', 'session');
        this.refreshSeen();this.match.advance(now);
        if (packet.resume && this.match.game.state === 'ended') { send(ws, { type: 'idle' });close(ws);return; }
        ws.serializeAttachment({ authed: true, protocol:this.service.protocol,...(this.service.id==='c4'?{service:'c4'}:{}), team, playerId: this.match.players[team].id, seen: now, connectedAt: now, after: Math.min(this.match.seq, Math.max(0, Number(packet.after) || 0)) });
        for (const previous of this.ctx.getWebSockets()) if (previous !== ws && attachment(previous).authed && attachment(previous).team === team) close(previous, 4001, 'Session replaced');
        this.match.touch(team, now);this.persist();this.broadcast();
        if (this.match.game.state !== 'ended') this.start();
        return;
      }
      if (!currentProtocol(ws,state,this.service)) return;
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
  abandon(id) { return this.service.id==='c4'?this.ready.then(()=>this.abandonReady(id)):this.abandonReady(id); }
  abandonReady(id) {
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
    if (['/', '/health'].includes(url.pathname)) return Response.json({ ok: true, game: 'Poké Arena', protocol:serviceForServer(env).protocol,...serviceEnvelope(serviceForServer(env)), transport: 'websocket', simulationHz: SIMULATION_HZ, snapshotHz: SNAPSHOT_HZ, reconnectGraceMs: RECONNECT_GRACE }, { headers: { 'Cache-Control': 'no-store' } });
    const origin = request.headers.get('origin');
    if (origin && !(env.ALLOWED_ORIGINS || '').split(',').includes(origin)) return new Response('Origin not allowed', { status: 403 });
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
    if (url.pathname === '/v1/lobby') return env.LOBBY.getByName(serviceForServer(env).id==='c4'?'matchmaking-c4-local':'matchmaking-v2').fetch(request);
    const room = url.pathname.match(/^\/v1\/rooms\/([a-f0-9-]{36})$/);
    if (room) return env.ARENAS.getByName(room[1]).fetch(request);
    return new Response('Not found', { status: 404 });
  },
};
