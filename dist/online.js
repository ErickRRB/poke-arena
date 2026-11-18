import {C1_SERVICE,C4_SERVICE,C4_CONFIRMED_KEY,arenaServiceForContext,expectedContextForService,serviceEnvelope,assertC4Envelope} from './online-context.js?v=eevee-1';
import {prepareC4Packet,prepareC4Transport} from './c4-packet.js?v=eevee-1';
import {C4_SEARCH_VERSION,C4_PENDING_KEY,C4_SEARCH_TOKEN,c4SearchRequest,newC4SearchToken,c4SearchEndpoint} from './c4-search.js?v=eevee-1';
import {allowedC4Server} from './online-routing.js?v=eevee-1';
import { ONLINE_PROTOCOL, unpackEvent } from './online-wire.js?v=eevee-1';
import { onlineServer } from './online-config.js?v=34';
import { onlinePerf } from './perf.js?v=1';

export const ONLINE_TOKEN_KEY = 'poke-arena:ws-token';
const ROOM_KEY = 'poke-arena:ws-room', SEQ_KEY = 'poke-arena:ws-seq';
const read = key => { try { return globalThis.sessionStorage?.getItem(key) || null; } catch { return null; } };
function save(key, value) { try { if (value === null) globalThis.sessionStorage?.removeItem(key);else globalThis.sessionStorage?.setItem(key, String(value)); } catch {} }
export const hasSavedOnlineSession = () => !!read(ONLINE_TOKEN_KEY);
export function hasPendingC4Search(){try{return globalThis.sessionStorage?.getItem(C4_PENDING_KEY)!=null;}catch{throw Error('No se pudo guardar.');}}
function checkedSave(key,value){
  try{
    const storage=globalThis.sessionStorage;if(!storage)throw Error();
    if(value===null)storage.removeItem(key);else storage.setItem(key,String(value));
    if(storage.getItem(key)!==(value===null?null:String(value)))throw Error();
  }catch{throw Error('No se pudo guardar.');}
}
function storedService(context){
  const service=arenaServiceForContext(context),envelope=serviceEnvelope(service);
  assertC4Envelope(context,{expectedContext:expectedContextForService(service)});
  if(Object.keys(context).length!==Object.keys(envelope).length||Object.keys(context).some(key=>!Object.hasOwn(envelope,key)))throw Error('Contexto guardado incompatible.');
  return service;
}
function checkedRead(key){try{return globalThis.sessionStorage?.getItem(key)??null;}catch{throw Error('No se pudo guardar.');}}
function readStoredC4Attempt(serverUrl){
  const raw=checkedRead(C4_PENDING_KEY);if(raw===null)return null;
  try{
    const value=JSON.parse(raw),service=storedService(value.context);
    if(value.version!==1||typeof value.token!=='string'||!C4_SEARCH_TOKEN.test(value.token)||!['intent','owned','cancelling'].includes(value.phase)||value.endpoint!==c4SearchEndpoint(serverUrl))throw Error();
    return{...value,request:c4SearchRequest(value.request,{expectedContext:expectedContextForService(service)})};
  }catch{throw Error('Búsqueda incompatible.');}
}
function readConfirmedC4(serverUrl){
  const raw=checkedRead(C4_CONFIRMED_KEY);if(raw===null)return null;
  try{
    const value=JSON.parse(raw);storedService(value.context);
    const fields=['version','endpoint','context','token','roomId','seq','epoch'],uuid=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
    if(value.version!==1||Object.keys(value).length!==fields.length||Object.keys(value).some(key=>!fields.includes(key))||value.endpoint!==c4SearchEndpoint(serverUrl)||typeof value.token!=='string'||value.token.length<48||value.token.length>160||!uuid(value.roomId)||!uuid(value.epoch)||!Number.isSafeInteger(value.seq)||value.seq<0)throw Error();
    return value;
  }catch{throw Error('Sesión incompatible.');}
}
// Pending ownership takes precedence. A present invalid record never falls
// through to legacy credentials or a fresh search.
export function savedC4Service(serverUrl){
  const attempt=readStoredC4Attempt(serverUrl);if(attempt)return storedService(attempt.context);
  const confirmed=readConfirmedC4(serverUrl);if(confirmed)return storedService(confirmed.context);
  return read(C4_SERVICE.keys.token)?C4_SERVICE:null;
}

export class OnlineClient {
  constructor({ onSnapshot, onSearch, onConnection, onIdle = () => {}, serverUrl = onlineServer(), createSocket = url => new WebSocket(url),service=C1_SERVICE,prepareSnapshot=(packet,options)=>prepareC4Packet(packet,options),onPresentation=()=>{} }) {
    Object.assign(this, { onSnapshot, onSearch, onConnection, onIdle, serverUrl, createSocket,service,prepareSnapshot,onPresentation });
    this.keys=service.keys;
    if(service.id==='c4'&&!allowedC4Server(serverUrl))throw Error('Servidor de partida incompatible.');
    if(service.id==='c4'){this.service=arenaServiceForContext(service);this.keys=this.service.keys;}
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
      this.write(this.service.id==='c4'&&this.c4Attempt?this.c4Hello(kind):{ type: 'hello', protocol:this.service.protocol, token:this.service.id==='c4'?this.pendingToken??this.token:this.token, ...serviceEnvelope(this.service), ...(kind === 'room' ? { after:this.service.id==='c4'&&this.routeRoom!==this.roomId?0:this.seq, resume: this.restoring } : { mode: this.mode === 'resume' || this.restoring ? 'resume' : 'search', name: this.name, deck: this.deck,...(this.service.id==='c4'?{selection:this.selection}:{}) }) });
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
    if(this.readC4Attempt())return this.resumeC4();
    readConfirmedC4(this.serverUrl);
    const request=c4SearchRequest({name:String(name||'Entrenador'),deck,selection},{expectedContext:expectedContextForService(this.service)}),generation=this.generation;
    await prepareC4Transport();if(generation!==this.generation)return false;
    const attempt={version:1,token:newC4SearchToken(),endpoint:c4SearchEndpoint(this.serverUrl),context:serviceEnvelope(this.service),phase:'intent',request};
    if(hasPendingC4Search())throw Error('Hay una búsqueda pendiente.');
    checkedSave(C4_PENDING_KEY,JSON.stringify(attempt));this.activateC4Attempt(attempt);return true;
  }
  async resumeC4(){
    const attempt=this.readC4Attempt(),confirmed=attempt?null:readConfirmedC4(this.serverUrl),service=attempt?storedService(attempt.context):confirmed?storedService(confirmed.context):C4_SERVICE;
    const token=confirmed?.token??read(C4_SERVICE.keys.token);if(!attempt&&!token)return false;
    this.service=service;this.keys=service.keys;
    this.c4Terminal=false;
    const generation=this.generation;await prepareC4Transport();if(generation!==this.generation)return false;
    if(attempt){this.activateC4Attempt(attempt);return true;}
    this.active=true;this.mode='resume';this.restoring=true;this.token=token;this.roomId=confirmed?.roomId??read(this.keys.room);this.routeRoom=this.roomId;this.seq=confirmed?.seq??Math.max(0,Number(read(this.keys.seq))||0);this.epoch=confirmed?.epoch??null;this.lookupTried=false;this.pendingToken=undefined;this.connect(this.routeRoom?'room':'lobby');return true;
  }
  readC4Attempt(){
    return readStoredC4Attempt(this.serverUrl);
  }
  activateC4Attempt(attempt){
    this.service=storedService(attempt.context);this.keys=this.service.keys;
    this.c4Terminal=false;
    this.suspend();this.c4Attempt=attempt;this.c4Welcomed=false;this.c4Promoted=false;this.c4StorageError=null;this.cancelPromise=null;this.cancelResolve=null;
    this.active=true;this.mode=attempt.phase==='cancelling'?'cancelling':'search';this.started=Date.now();this.restoring=false;this.lookupTried=false;
    this.token=this.service.arenaProfileProducer?null:read(this.keys.token);this.roomId=this.service.arenaProfileProducer?null:read(this.keys.room);this.seq=this.service.arenaProfileProducer?0:Math.max(0,Number(read(this.keys.seq))||0);this.version=-1;this.epoch=null;this.routeRoom=null;this.pendingToken=attempt.token;
    if(attempt.phase==='cancelling')this.onConnection('Cancelando…');this.connect('lobby');
  }
  c4Hello(kind){
    const attempt=this.c4Attempt,base={type:'hello',...serviceEnvelope(this.service),token:attempt.token};
    if(kind==='room')return{...base,after:this.c4Promoted?this.seq:0,resume:this.restoring};
    this.c4Welcomed=false;
    this.c4LobbyMode=attempt.phase==='cancelling'?'cancel-intent':attempt.phase==='intent'?'search-intent':'resume';
    return{...base,c4SearchVersion:C4_SEARCH_VERSION,mode:this.c4LobbyMode,...(attempt.phase==='owned'?{}:attempt.request)};
  }
  updateC4Attempt(phase){
    const attempt=this.c4Attempt;if(!attempt)return;
    this.c4Attempt={...attempt,phase};
    try{if(this.readC4Attempt()?.token!==attempt.token)throw Error('Búsqueda reemplazada.');checkedSave(C4_PENDING_KEY,JSON.stringify(this.c4Attempt));this.c4StorageError=null;}
    catch(error){this.c4StorageError=error;}
  }
  clearC4Attempt(token){
    try{if(this.readC4Attempt()?.token!==token)throw Error('Búsqueda reemplazada.');checkedSave(C4_PENDING_KEY,null);this.c4Attempt=null;this.pendingToken=undefined;this.c4StorageError=null;return true;}
    catch(error){this.c4StorageError=error;return false;}
  }
  closeC4Attempt(){
    if(this.cancelPromise)return this.cancelPromise;
    this.updateC4Attempt('cancelling');this.suspend();this.active=true;this.mode='cancelling';this.routeRoom=null;
    this.cancelPromise=new Promise(resolve=>{this.cancelResolve=resolve;});this.onConnection('Cancelando…');this.connect('lobby');return this.cancelPromise;
  }
  receiveC4(packet,bytes=0){
    if(this.c4Attempt){
      let raw;try{raw=globalThis.sessionStorage?.getItem(C4_PENDING_KEY);}catch(error){this.c4StorageError=error;}
      if(raw!=null){let owner;try{owner=JSON.parse(raw).token;}catch{}if(owner!==this.c4Attempt.token){this.suspend();this.cancelResolve?.(false);return;}}
    }
    if(packet?.type==='snapshot'){
      if(this.c4Attempt?.phase==='cancelling')return;
      let staged;
      try{assertC4Envelope(packet,{expectedContext:expectedContextForService(this.service)});staged=this.stageC4(packet);}
      catch(error){this.rejectC4Packet(error);return;}
      if(!staged)return;
      // This callback only adopts prepared references/flags. Presentation is
      // outside both preparation and the catch that rejects invalid packets.
      this.commitC4(staged);
      this.onConnection(this.c4StorageError?'No se pudo guardar.':'');
      if(onlinePerf.active)onlinePerf.snapshot(packet,bytes);
      this.onPresentation(staged.snapshot);return;
    }
    try{
      assertC4Envelope(packet,{expectedContext:expectedContextForService(this.service)});
      if(this.c4Attempt&&this.kind==='lobby'&&packet.type!=='error'){
        if(packet.c4SearchVersion!==C4_SEARCH_VERSION)throw Error('Búsqueda incompatible.');
        if(packet.type==='welcome'||!this.c4Welcomed){if(packet.token!==this.c4Attempt.token)throw Error('Búsqueda incompatible.');}
        if(!this.c4Welcomed&&!['welcome','idle'].includes(packet.type))throw Error('Falta confirmar la búsqueda.');
      }
      if(packet.type==='welcome'){
        if(this.c4Attempt){this.c4Welcomed=true;if(this.c4Attempt.phase!=='cancelling')this.updateC4Attempt('owned');return;}
        if(packet.token!==undefined){if(typeof packet.token!=='string'||packet.token.length<48||packet.token.length>160)throw Error('Token no válido.');this.pendingToken=packet.token;}return;
      }
      if(packet.type==='searching'){
        if(this.c4Attempt?.phase==='cancelling')throw Error('Cancelación pendiente.');
        if(!Number.isSafeInteger(packet.joined)||packet.joined<0)throw Error('Búsqueda no válida.');
        const now=Date.now();this.mode='search';this.connected=true;this.retry=0;this.started=Math.min(packet.joined||this.started||now,now);this.onConnection('');
        const elapsed=now-this.started,clock=performance.now();clearInterval(this.searchTimer);const update=()=>this.onSearch(Math.max(0,elapsed+performance.now()-clock));update();this.searchTimer=setInterval(update,1000);return;
      }
      if(packet.type==='matched'){
        if(this.c4Attempt?.phase==='cancelling')return;
        if(typeof packet.roomId!=='string'||!/^[a-f0-9-]{36}$/.test(packet.roomId))throw Error('Sala no válida.');
        this.routeRoom=packet.roomId;this.connect('room');return;
      }
      if(packet.type==='result'){
        const entry=this.pending.get(packet.nonce);if(!entry)return;
        if(!packet.result||typeof packet.result.ok!=='boolean')throw Error('Resultado no válido.');clearTimeout(entry.timer);this.pending.delete(packet.nonce);entry.resolve(packet.result);return;
      }
      if(packet.type==='idle'){
        if(packet.expired!==undefined&&typeof packet.expired!=='boolean')throw Error('Sesión no válida.');
        if(this.c4Attempt){
          if(this.kind!=='lobby'){this.routeRoom=null;this.connect('lobby');return;}
          const closed=packet.searchState==='closed';
          if(closed&&(this.c4Attempt.phase!=='intent'||this.c4LobbyMode!=='search-intent'||packet.token!==this.c4Attempt.token||typeof packet.message!=='string'))throw Error('Búsqueda incompatible.');
          if(!['cancelled','ended','expired','closed'].includes(packet.searchState)||(packet.searchState==='expired')!==(packet.expired===true))throw Error('Cancelación pendiente.');
          this.clearC4Attempt(this.c4Attempt.token);this.c4Terminal=true;this.suspend();this.cancelResolve?.(true);this.onConnection('');this.onIdle(this.c4StorageError?'No se pudo guardar.':packet.message||'');return;
        }
        if(this.service.arenaProfileProducer){
          const confirmed=readConfirmedC4(this.serverUrl);if(confirmed&&confirmed.token===this.token)checkedSave(C4_CONFIRMED_KEY,null);
        }else{if(packet.expired)save(this.keys.token,null);save(this.keys.room,null);save(this.keys.seq,null);}
        if(packet.expired)this.token=null;this.roomId=null;this.routeRoom=null;this.pendingToken=undefined;this.c4Terminal=true;this.suspend();this.onConnection('');this.onIdle(packet.message||'');return;
      }
      if(packet.type==='error'){
        if(packet.code==='session'&&this.kind==='room'&&!this.lookupTried){this.lookupTried=true;this.routeRoom=null;this.mode='resume';this.connect('lobby');return;}
        if(packet.code==='server'){this.reconnect();return;}this.suspend();this.cancelResolve?.(false);this.onIdle(packet.message||'No se pudo conectar.');return;
      }
      throw Error('Mensaje no válido.');
    }catch(error){this.rejectC4Packet(error);}
  }
  rejectC4Packet(error){
    this.lastValidationError=error;if(this.c4Attempt){this.pendingToken=this.c4Attempt.token;this.routeRoom=null;}else{this.pendingToken=undefined;this.routeRoom=this.roomId;}this.onConnection('No se pudo validar la partida.');this.dropSocket();this.reconnect();
  }
  stageC4(packet){
    if(this.c4Attempt&&!this.c4Welcomed)throw Error('Falta confirmar la búsqueda.');
    const token=this.pendingToken??this.token;if(typeof token!=='string'||token.length<48||token.length>160)throw Error('Falta sesión validable.');
    const prepared=this.prepareSnapshot(packet,{expectedContext:expectedContextForService(this.service)});if(!prepared||typeof prepared.then==='function'||!prepared.game||!Array.isArray(prepared.events))throw Error('Preparación de partida incompleta.');
    const sameRoom=packet.roomId===this.roomId,sameEpoch=packet.epoch===this.epoch;
    if(sameRoom&&sameEpoch&&packet.version<this.version)return;
    if(this.routeRoom&&packet.roomId!==this.routeRoom)throw Error('Sala inesperada.');
    const previousSeq=this.c4Attempt&&!this.c4Promoted?0:sameRoom&&(sameEpoch||this.epoch==null)?this.seq:0;
    if(sameRoom&&sameEpoch&&packet.seq<this.seq)throw Error('Cursor atrasado.');
    const events=prepared.events.filter(entry=>entry.seq>previousSeq);
    return{token,snapshot:{...packet,events,preparedGame:prepared.game,eventsPrepared:true}};
  }
  commitC4({token,snapshot:packet}){
    this.onSnapshot(packet);
    this.token=token;this.pendingToken=undefined;this.roomId=packet.roomId;this.routeRoom=packet.roomId;this.seq=packet.seq;this.version=packet.version;this.epoch=packet.epoch;this.team=packet.team;this.mode='battle';this.connected=true;this.restoring=false;this.retry=0;this.lastSnapshot=Date.now();this.gameState=packet.preparedGame.state;
    this.c4Promoted=true;
    try{
      if(this.service.arenaProfileProducer){
        const record={version:1,endpoint:c4SearchEndpoint(this.serverUrl),context:serviceEnvelope(this.service),token:this.token,roomId:this.roomId,seq:this.seq,epoch:this.epoch};
        checkedSave(C4_CONFIRMED_KEY,JSON.stringify(record));
      }else{
        const confirmed=[[this.keys.token,this.token],[this.keys.room,this.roomId],[this.keys.seq,this.seq]];
        for(const[key,value]of confirmed)checkedSave(key,value);
        if(confirmed.some(([key,value])=>globalThis.sessionStorage.getItem(key)!==String(value)))throw Error('No se pudo guardar.');
      }
      if(this.c4Attempt)this.clearC4Attempt(token);else this.c4StorageError=null;
    }
    catch(error){this.c4StorageError=error;}
    if(!this.ackTimer)this.ackTimer=setTimeout(()=>{this.ackTimer=null;this.write({type:'ack',seq:this.seq});},200);
  }
  reconnect() {
    if (!this.active || this.reconnectTimer) return;
    if(onlinePerf.active)onlinePerf.reconnect();
    this.connected = false;this.dropSocket();this.onConnection(this.service.id==='c4'&&this.c4Attempt?.phase==='cancelling'?'Cancelando…':'Reconectando…');
    const delay = Math.min(3000, 250 * 2 ** Math.min(4, this.retry++));
    this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null;this.connect((this.service.id==='c4'?this.routeRoom:this.roomId) ? 'room' : 'lobby'); }, delay);
  }
  reconnectIfStale() {
    if (!this.active) return;
    if (!this.socket || this.socket.readyState > 1 || Date.now() - (this.lastMessage || 0) > 4500) { clearTimeout(this.reconnectTimer);this.reconnectTimer = null;this.reconnect(); }
  }
  send(action) {
    if(this.service.id==='c4'&&this.c4Attempt&&(!this.c4Promoted||this.c4Attempt.phase==='cancelling'))return Promise.resolve({ok:false,reason:'Partida cerrada.'});
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
    if(this.service.id==='c4'&&this.c4Attempt)return this.closeC4Attempt();
    if (this.mode === 'battle' && this.gameState !== 'ended') this.write({ type: 'action', kind: 'leave', nonce: crypto.randomUUID() });
    else if (this.kind === 'lobby') this.write({ type: 'cancel' });
    this.suspend();return Promise.resolve();
  }
}
