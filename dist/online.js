import {C1_SERVICE,C4_SERVICE,serviceEnvelope,assertC4Envelope} from './online-context.js?v=1';
import {CARDS} from './engine.js?v=target-c1-1';
import {admitC4Selection} from './profile-selection.js?v=1';
import {prepareC4Packet,prepareC4Transport} from './c4-packet.js?v=1';
import { ONLINE_PROTOCOL, unpackEvent } from './online-wire.js?v=target-c1-1';
import { onlineServer } from './online-config.js?v=34';
import { onlinePerf } from './perf.js?v=1';

export const ONLINE_TOKEN_KEY = 'poke-arena:ws-token';
const ROOM_KEY = 'poke-arena:ws-room', SEQ_KEY = 'poke-arena:ws-seq';
const read = key => { try { return globalThis.sessionStorage?.getItem(key) || null; } catch { return null; } };
function save(key, value) { try { if (value === null) globalThis.sessionStorage?.removeItem(key);else globalThis.sessionStorage?.setItem(key, String(value)); } catch {} }
export const hasSavedOnlineSession = () => !!read(ONLINE_TOKEN_KEY);

export class OnlineClient {
  constructor({ onSnapshot, onSearch, onConnection, onIdle = () => {}, serverUrl = onlineServer(), createSocket = url => new WebSocket(url),service=C1_SERVICE,prepareSnapshot=packet=>prepareC4Packet(packet) }) {
    Object.assign(this, { onSnapshot, onSearch, onConnection, onIdle, serverUrl, createSocket,service,prepareSnapshot });
    this.keys=service.keys;
    if(service.id==='c4'){const endpoint=new URL(serverUrl);if(!['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname)||endpoint.username||endpoint.password)throw Error('El servidor de prueba debe ser local.');}
    this.active = false;this.connected = false;this.version = -1;this.seq = 0;this.generation = 0;this.socketId = 0;this.pending = new Map();this.retry = 0;
  }
  async start(name, deck,selection) {
    if(this.service.id==='c4')return this.startC4(name,deck,selection);
    this.suspend();this.active = true;this.mode = 'search';this.started = Date.now();this.name = name;this.deck = [...deck];this.token = read(ONLINE_TOKEN_KEY);
    this.roomId = null;this.seq = 0;this.version = -1;this.epoch = null;this.restoring = false;save(ROOM_KEY, null);save(SEQ_KEY, null);
    this.connect('lobby');return true;
  }
  async resume() {
    if(this.service.id==='c4')return this.resumeC4();
    this.token = read(ONLINE_TOKEN_KEY);if (!this.token) return false;
    this.active = true;this.mode = 'resume';this.restoring = true;this.roomId = read(ROOM_KEY);this.seq = Math.max(0, Number(read(SEQ_KEY)) || 0);this.lookupTried = false;
    this.connect(this.roomId ? 'room' : 'lobby');return true;
  }
  url(kind) {
    const url = new URL(this.serverUrl);url.protocol = url.protocol === 'https:' || url.protocol === 'wss:' ? 'wss:' : 'ws:';
    url.pathname = kind === 'room' ? '/v1/rooms/' + (this.service.id==='c4'?this.routeRoom:this.roomId) : '/v1/lobby';url.search = '';url.hash = '';return url.href;
  }
  dropSocket() {
    onlinePerf.socketReset();
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
      this.write({ type: 'hello', protocol:this.service.protocol, token:this.service.id==='c4'?this.pendingToken??this.token:this.token, ...serviceEnvelope(this.service), ...(kind === 'room' ? { after:this.service.id==='c4'&&this.routeRoom!==this.roomId?0:this.seq, resume: this.restoring } : { mode: this.mode === 'resume' || this.restoring ? 'resume' : 'search', name: this.name, deck: this.deck,...(this.service.id==='c4'?{selection:this.selection}:{}) }) });
      this.heartbeat = setInterval(() => {
        if (!current()) return;
        const now = Date.now();
        if (now - this.lastMessage > 10000 || this.mode === 'battle' && this.gameState !== 'ended' && now - this.lastSnapshot > 4500) { this.reconnect();return; }
        this.pingAt = now;if(this.write('ping'))onlinePerf.ping();
      }, 2500);
    };
    socket.onmessage = event => {
      if (!current()) return;
      this.lastMessage = Date.now();
      if (event.data === 'pong') { this.latency = this.lastMessage - (this.pingAt || this.lastMessage);onlinePerf.pong();return; }
      let packet;try { packet = JSON.parse(event.data); } catch { this.reconnect();return; }
      this.receive(packet,onlinePerf.active&&packet.type==='snapshot'?new TextEncoder().encode(event.data).byteLength:0);
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
  receive(packet,bytes=0) {
    if(this.service.id==='c4')return this.receiveC4(packet,bytes);
    if (['welcome','snapshot'].includes(packet.type) && packet.protocol !== ONLINE_PROTOCOL) {
      this.suspend();this.onConnection('');this.onIdle('Actualizá la página para conectar.');return;
    }
    if (packet.type === 'welcome') { if (packet.token) { this.token = packet.token;save(ONLINE_TOKEN_KEY, packet.token); }return; }
    if (packet.type === 'searching') {
      const now=Date.now();
      this.mode = 'search';this.connected = true;this.retry = 0;this.started = Math.min(packet.joined || this.started || now,now);this.onConnection('');
      const elapsed=now-this.started,clock=performance.now();
      clearInterval(this.searchTimer);const update = () => this.onSearch(Math.max(0,elapsed+performance.now()-clock));update();this.searchTimer = setInterval(update, 1000);return;
    }
    if (packet.type === 'matched') {
      if (!/^[a-f0-9-]{36}$/.test(packet.roomId || '')) { this.reconnect();return; }
      if (this.roomId !== packet.roomId) { this.seq = 0;this.version = -1;this.epoch = null;save(SEQ_KEY, null); }
      this.roomId = packet.roomId;save(ROOM_KEY, this.roomId);this.connect('room');return;
    }
    if (packet.type === 'snapshot') { this.apply(packet,bytes);return; }
    if (packet.type === 'result') {
      const entry = this.pending.get(packet.nonce);if (!entry) return;
      clearTimeout(entry.timer);this.pending.delete(packet.nonce);entry.resolve(packet.result || { ok: false });return;
    }
    if (packet.type === 'idle') {
      if (packet.expired) { this.token = null;save(ONLINE_TOKEN_KEY, null); }
      save(ROOM_KEY, null);save(SEQ_KEY, null);this.roomId = null;this.suspend();this.onConnection('');this.onIdle(packet.message||'');return;
    }
    if (packet.type === 'error') {
      if (packet.code === 'session' && this.kind === 'room' && !this.lookupTried) { this.lookupTried = true;this.roomId = null;save(ROOM_KEY, null);this.mode = 'resume';this.connect('lobby');return; }
      if (packet.code === 'server') { this.reconnect();return; }
      this.suspend();this.onIdle(packet.message || 'No se pudo conectar.');
    }
  }
  apply(packet,bytes=0) {
    if (packet.status !== 'matched' || !packet.game || !Array.isArray(packet.events)) return;
    if (packet.epoch !== this.epoch) { this.epoch = packet.epoch;this.version = -1; }
    if (packet.version < this.version) return;
    if(onlinePerf.active)onlinePerf.snapshot(packet,bytes);
    this.mode = 'battle';this.connected = true;this.restoring = false;this.retry = 0;this.version = packet.version;this.team = packet.team;this.roomId = packet.roomId;this.lastSnapshot = Date.now();this.gameState = packet.game.state;
    save(ROOM_KEY, this.roomId);
    const events = packet.events.filter(entry => entry.seq > this.seq).map(entry => ({ ...entry, event: unpackEvent(entry.event) }));
    this.seq = Math.max(this.seq, packet.seq);save(SEQ_KEY, this.seq);this.onConnection('');this.onSnapshot({ ...packet, events });
    if (!this.ackTimer) this.ackTimer = setTimeout(() => { this.ackTimer = null;this.write({ type: 'ack', seq: this.seq }); }, 200);
  }
  async startC4(name,deck,selection){
    if(!admitC4Selection(deck,selection).ok)throw Error('Revisá tu mazo antes de buscar.');
    await prepareC4Transport(CARDS);
    this.suspend();this.active=true;this.mode='search';this.started=Date.now();this.name=name;this.deck=[...deck];this.selection=structuredClone(selection);
    this.token=read(this.keys.token);this.roomId=read(this.keys.room);this.seq=Math.max(0,Number(read(this.keys.seq))||0);this.version=-1;this.epoch=null;this.routeRoom=null;this.pendingToken=undefined;this.restoring=false;this.connect('lobby');return true;
  }
  async resumeC4(){
    const token=read(this.keys.token);if(!token)return false;
    await prepareC4Transport(CARDS);this.active=true;this.mode='resume';this.restoring=true;this.token=token;this.roomId=read(this.keys.room);this.routeRoom=this.roomId;this.seq=Math.max(0,Number(read(this.keys.seq))||0);this.lookupTried=false;this.pendingToken=undefined;this.connect(this.routeRoom?'room':'lobby');return true;
  }
  receiveC4(packet,bytes=0){
    try{
      assertC4Envelope(packet);
      if(packet.type==='welcome'){
        if(packet.token!==undefined){if(typeof packet.token!=='string'||packet.token.length<48||packet.token.length>160)throw Error('Token no válido.');this.pendingToken=packet.token;}return;
      }
      if(packet.type==='searching'){
        if(!Number.isSafeInteger(packet.joined)||packet.joined<0)throw Error('Búsqueda no válida.');
        const now=Date.now();this.mode='search';this.connected=true;this.retry=0;this.started=Math.min(packet.joined||this.started||now,now);this.onConnection('');
        const elapsed=now-this.started,clock=performance.now();clearInterval(this.searchTimer);const update=()=>this.onSearch(Math.max(0,elapsed+performance.now()-clock));update();this.searchTimer=setInterval(update,1000);return;
      }
      if(packet.type==='matched'){
        if(typeof packet.roomId!=='string'||!/^[a-f0-9-]{36}$/.test(packet.roomId))throw Error('Sala no válida.');
        this.routeRoom=packet.roomId;this.connect('room');return;
      }
      if(packet.type==='snapshot')return this.applyC4(packet,bytes);
      if(packet.type==='result'){
        const entry=this.pending.get(packet.nonce);if(!entry)return;
        if(!packet.result||typeof packet.result.ok!=='boolean')throw Error('Resultado no válido.');clearTimeout(entry.timer);this.pending.delete(packet.nonce);entry.resolve(packet.result);return;
      }
      if(packet.type==='idle'){
        if(packet.expired!==undefined&&typeof packet.expired!=='boolean')throw Error('Sesión no válida.');
        if(packet.expired){this.token=null;save(this.keys.token,null);}save(this.keys.room,null);save(this.keys.seq,null);this.roomId=null;this.routeRoom=null;this.pendingToken=undefined;this.suspend();this.onConnection('');this.onIdle(packet.message||'');return;
      }
      if(packet.type==='error'){
        if(packet.code==='session'&&this.kind==='room'&&!this.lookupTried){this.lookupTried=true;this.routeRoom=null;this.mode='resume';this.connect('lobby');return;}
        if(packet.code==='server'){this.reconnect();return;}this.suspend();this.onIdle(packet.message||'No se pudo conectar.');return;
      }
      throw Error('Mensaje no válido.');
    }catch(error){
      this.lastValidationError=error;this.pendingToken=undefined;this.routeRoom=this.roomId;this.onConnection('No se pudo validar la partida.');this.dropSocket();this.reconnect();
    }
  }
  applyC4(packet,bytes=0){
    const token=this.pendingToken??this.token;if(typeof token!=='string'||token.length<48||token.length>160)throw Error('Falta sesión validable.');
    const prepared=this.prepareSnapshot(packet);if(!prepared||typeof prepared.then==='function'||!prepared.game||!Array.isArray(prepared.events))throw Error('Preparación de partida incompleta.');
    const sameRoom=packet.roomId===this.roomId,sameEpoch=packet.epoch===this.epoch;
    if(sameRoom&&sameEpoch&&packet.version<this.version)return;
    if(this.routeRoom&&packet.roomId!==this.routeRoom)throw Error('Sala inesperada.');
    const previousSeq=sameRoom&&(sameEpoch||this.epoch==null)?this.seq:0;
    if(sameRoom&&sameEpoch&&packet.seq<this.seq)throw Error('Cursor atrasado.');
    const events=prepared.events.filter(entry=>entry.seq>previousSeq);
    // All fallible decoding, including every event, completed before App or credentials change.
    this.onSnapshot({...packet,events,preparedGame:prepared.game,eventsPrepared:true});
    this.token=token;this.pendingToken=undefined;this.roomId=packet.roomId;this.routeRoom=packet.roomId;this.seq=packet.seq;this.version=packet.version;this.epoch=packet.epoch;this.team=packet.team;this.mode='battle';this.connected=true;this.restoring=false;this.retry=0;this.lastSnapshot=Date.now();this.gameState=prepared.game.state;
    save(this.keys.token,this.token);save(this.keys.room,this.roomId);save(this.keys.seq,this.seq);this.onConnection('');
    if(onlinePerf.active)onlinePerf.snapshot(packet,bytes);
    if(!this.ackTimer)this.ackTimer=setTimeout(()=>{this.ackTimer=null;this.write({type:'ack',seq:this.seq});},200);
  }
  reconnect() {
    if (!this.active || this.reconnectTimer) return;
    if(onlinePerf.active)onlinePerf.reconnect();
    this.connected = false;this.dropSocket();this.onConnection('Reconectando…');
    const delay = Math.min(3000, 250 * 2 ** Math.min(4, this.retry++));
    this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null;this.connect((this.service.id==='c4'?this.routeRoom:this.roomId) ? 'room' : 'lobby'); }, delay);
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
