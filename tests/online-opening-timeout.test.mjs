import test from 'node:test';
import assert from 'node:assert/strict';
import {OnlineClient} from '../dist/online.js';
import {C4_SERVICE,C4_CONFIRMED_KEY,arenaServiceForContext,serviceEnvelope} from '../dist/online-context.js?v=eevee-1';
import {LIGHT_EEVEE_RULESET,LIGHT_EEVEE_PRODUCER} from '../dist/arena-profile-producers.js?v=eevee-1';
import {prepareC4Transport} from '../dist/c4-packet.js?v=eevee-1';
import {Game} from '../dist/engine.js?v=eevee-1';
import {publicSnapshot,publicEvent} from '../dist/online-wire.js?v=eevee-1';
await prepareC4Transport();
const ROOM='d521bab0-5618-404e-96dc-5b73fcb51b77',EPOCH='512f2058-46ab-4d54-bb2d-96798df66192',TOKEN='a'.repeat(72);
function packet(seq=10){
 const game=new Game({catalogVersion:4,ruleset:'c4-1',seed:3}),unit=game.spawn('arcanine',0,240,500,0);game.start();game.catalogRef=C4_SERVICE.catalogRef;
 return{type:'snapshot',...serviceEnvelope(C4_SERVICE),status:'matched',roomId:ROOM,epoch:EPOCH,team:0,version:seq,seq,serverTime:1000,startsIn:0,opponent:'Propio',game:publicSnapshot(game,0),events:[{seq,event:publicEvent({type:'spawn',unit},game)}]};
}
function setup(t){
 const storage=new Map([[C4_SERVICE.keys.token,TOKEN],[C4_SERVICE.keys.room,ROOM],[C4_SERVICE.keys.seq,'9'],['poke-arena:ws-token','legacy-preserved']]);
 const previous=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage'),sockets=[],snapshots=[],statuses=[],idles=[];
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)}});
 t.mock.timers.enable({apis:['setTimeout','setInterval']});
 const client=new OnlineClient({service:C4_SERVICE,serverUrl:'http://127.0.0.1:4180',onSnapshot:value=>snapshots.push(value),onConnection:value=>statuses.push(value),onSearch(){},onIdle:value=>idles.push(value),createSocket:url=>{
  const socket={url,readyState:0,sent:[],closed:0,send(value){this.sent.push(value==='ping'?value:JSON.parse(value));},close(){this.closed++;this.readyState=3;},open(){this.readyState=1;this.onopen?.();},packet(value){this.onmessage?.({data:JSON.stringify(value)});},disconnect(){this.readyState=3;this.onclose?.({code:1006});}};sockets.push(socket);return socket;
 }});
 t.after(()=>{client.suspend();if(previous)Object.defineProperty(globalThis,'sessionStorage',previous);else delete globalThis.sessionStorage;});
 return{client,sockets,snapshots,statuses,idles,storage};
}

test('a reconnect socket stuck CONNECTING times out and recovers the same confirmed room and cursor',async t=>{
 const s=setup(t);await s.client.resume();const initial=s.sockets[0];initial.open();initial.packet(packet());assert.equal(s.snapshots.length,1);assert.equal(s.client.connected,true);
 const saved=[...s.storage],generation=s.client.generation;initial.disconnect();t.mock.timers.tick(250);const stalled=s.sockets[1];assert.equal(stalled.readyState,0);assert.equal(s.client.connected,false);assert.equal(s.statuses.at(-1),'Reconectando…');
 t.mock.timers.tick(7999);assert.equal(stalled.closed,0);assert.equal(s.sockets.length,2);assert.deepEqual([...s.storage],saved);
 t.mock.timers.tick(1);assert.equal(stalled.closed,1);assert.equal(s.client.openingTimer,null);t.mock.timers.tick(500);assert.equal(s.sockets.length,3);const replacement=s.sockets[2],timer=s.client.openingTimer;
 stalled.onopen();assert.equal(s.client.socket,replacement);assert.equal(s.client.openingTimer,timer);assert.equal(stalled.sent.length,0);
 replacement.open();assert.equal(s.client.openingTimer,null);const hello=replacement.sent[0];assert.equal(new URL(replacement.url).pathname,'/v1/rooms/'+ROOM);assert.equal(hello.token,TOKEN);assert.equal(hello.after,10);assert.equal(Object.hasOwn(hello,'mode'),false);assert.equal(hello.selectionVersion,2);
 replacement.packet(packet(11));assert.equal(s.client.connected,true);assert.equal(s.client.roomId,ROOM);assert.equal(s.client.seq,11);assert.equal(s.client.generation,generation);assert.equal(s.snapshots.length,2);assert.equal(s.storage.get(C4_SERVICE.keys.token),TOKEN);assert.equal(s.storage.get(C4_SERVICE.keys.room),ROOM);assert.equal(s.storage.get(C4_SERVICE.keys.seq),'11');assert.equal(s.storage.get('poke-arena:ws-token'),'legacy-preserved');assert.equal(s.idles.length,0);assert.ok(s.sockets.every(socket=>socket.sent.every(value=>typeof value==='string'||value.mode!=='search-intent')));
});

test('onopen and cancellation clear the opening deadline without a late reconnect',async t=>{
 const s=setup(t);await s.client.resume();const socket=s.sockets[0];t.mock.timers.tick(2000);socket.open();assert.equal(s.client.openingTimer,null);assert.equal(socket.sent.length,1);await s.client.close();assert.equal(s.client.openingTimer,null);const count=s.sockets.length;t.mock.timers.tick(30000);assert.equal(s.sockets.length,count);assert.equal(s.client.active,false);assert.equal(s.storage.get(C4_SERVICE.keys.room),ROOM);
});

test('error, close and superseding an opening socket cannot retain its watchdog or revive its callbacks',async t=>{
 const s=setup(t);
 for(const trigger of ['error','close','supersede']){
  await s.client.resume();const socket=s.sockets.at(-1),oldTimer=s.client.openingTimer;
  if(trigger==='error')socket.onerror();else if(trigger==='close')socket.disconnect();else s.client.connect('room');
  if(trigger==='supersede'){assert.notEqual(s.client.openingTimer,oldTimer);const current=s.client.openingTimer;socket.onopen();assert.equal(s.client.openingTimer,current);}else assert.equal(s.client.openingTimer,null);
  await s.client.close();const count=s.sockets.length;socket.onopen();t.mock.timers.tick(30000);assert.equal(s.sockets.length,count);assert.equal(s.client.openingTimer,null);assert.equal(s.client.active,false);assert.equal(s.storage.get(C4_SERVICE.keys.token),TOKEN);assert.equal(s.storage.get(C4_SERVICE.keys.room),ROOM);
 }
});
test('an Eevee room retains its producer and cursor across a stuck opening and stale callback',async t=>{
 const s=setup(t),service=arenaServiceForContext({ruleset:LIGHT_EEVEE_RULESET,arenaProfileProducer:LIGHT_EEVEE_PRODUCER});
 const saved={version:1,endpoint:'ws://127.0.0.1:4180',context:serviceEnvelope(service),token:TOKEN,roomId:ROOM,seq:10,epoch:EPOCH};
 s.storage.set(C4_CONFIRMED_KEY,JSON.stringify(saved));await s.client.resume();const stalled=s.sockets[0];
 t.mock.timers.tick(7999);assert.equal(s.sockets.length,1);assert.equal(stalled.closed,0);
 t.mock.timers.tick(1);assert.equal(stalled.closed,1);t.mock.timers.tick(250);const replacement=s.sockets[1],timer=s.client.openingTimer;
 stalled.onopen();assert.equal(s.client.socket,replacement);assert.equal(s.client.openingTimer,timer);assert.equal(stalled.sent.length,0);
 replacement.open();const hello=replacement.sent[0];assert.equal(new URL(replacement.url).pathname,'/v1/rooms/'+ROOM);assert.equal(hello.after,10);assert.equal(hello.token,TOKEN);assert.equal(hello.arenaProfileProducer,LIGHT_EEVEE_PRODUCER);assert.equal(hello.selectionVersion,3);assert.deepEqual(JSON.parse(s.storage.get(C4_CONFIRMED_KEY)),saved);
});
