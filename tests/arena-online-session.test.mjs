import test from 'node:test';
import assert from 'node:assert/strict';
import {OnlineClient,savedC4Service} from '../dist/online.js';
import {Game,DEFAULT_DECK} from '../dist/engine.js?v=target-c1-1';
import {C4_SERVICE,C4_CONFIRMED_KEY,arenaServiceForContext,serviceEnvelope} from '../dist/online-context.js?v=1';
import {LIGHT_EEVEE_RULESET,LIGHT_EEVEE_PRODUCER} from '../dist/arena-profile-producers.js?v=1';
import {newOnlineSelectionFromLibrary} from '../dist/arena-profile-selection.js';
import {prepareC4Transport} from '../dist/c4-packet.js?v=1';
import {publicSnapshot,publicEvent} from '../dist/online-wire.js?v=target-c1-1';
import {C4_PENDING_KEY} from '../dist/c4-search.js?v=1';

await prepareC4Transport();
const SERVER='http://127.0.0.1:4180',ROOM='d521bab0-5618-404e-96dc-5b73fcb51b77',OLD_ROOM='7c47c7ec-a56d-45e6-b16e-642638b33c53',EPOCH='512f2058-46ab-4d54-bb2d-96798df66192',OLD_TOKEN='a'.repeat(72);
const service=arenaServiceForContext({ruleset:LIGHT_EEVEE_RULESET,arenaProfileProducer:LIGHT_EEVEE_PRODUCER});
const selection=(old=false)=>newOnlineSelectionFromLibrary({version:1,active:0,updatedAt:1,slots:[[old?'eevee':'arena:eevee-light-v1',...DEFAULT_DECK.slice(1)],null,null,null]},0);
function packet({context=service,seq=10,version=1,roomId=ROOM}={}){
 const game=new Game({catalogVersion:4,ruleset:context.ruleset,seed:3}),unit=game.spawn('eevee',0,240,500,0);game.start();game.catalogRef=C4_SERVICE.catalogRef;
 return{type:'snapshot',...serviceEnvelope(context),status:'matched',roomId,epoch:EPOCH,team:0,version,seq,serverTime:1000,startsIn:0,opponent:'Rival',game:publicSnapshot(game,0),events:[{seq,event:publicEvent({type:'spawn',unit},game)}]};
}
function setup(t){
 const storage=new Map([[C4_SERVICE.keys.token,OLD_TOKEN],[C4_SERVICE.keys.room,OLD_ROOM],[C4_SERVICE.keys.seq,'9'],['poke-arena:ws-token','c1-retained']]);
 const previous=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage'),faults={},writes=[],sockets=[],clients=[],adopted=[];
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>{writes.push({operation:'set',key});if(faults.set===key)throw Error('declared write failure');storage.set(key,String(value));},removeItem:key=>{writes.push({operation:'remove',key});if(faults.remove===key)throw Error('declared remove failure');storage.delete(key);}}});
 t.mock.timers.enable({apis:['setTimeout','setInterval']});
 const make=(current=service)=>{
  const client=new OnlineClient({service:current,serverUrl:SERVER,onSnapshot:value=>adopted.push(value),onConnection(){},onSearch(){},onIdle(){},createSocket:url=>{
   const socket={url,readyState:0,sent:[],send(value){this.sent.push(value==='ping'?value:JSON.parse(value));},close(){this.readyState=3;},open(){this.readyState=1;this.onopen?.();},packet(value){this.onmessage?.({data:JSON.stringify(value)});}};sockets.push(socket);return socket;
  }});clients.push(client);return client;
 };
 t.after(()=>{for(const client of clients)client.suspend();if(previous)Object.defineProperty(globalThis,'sessionStorage',previous);else delete globalThis.sessionStorage;});
 return{storage,faults,writes,sockets,adopted,make};
}
const pending=s=>JSON.parse(s.storage.get(C4_PENDING_KEY));
const lobby=(context,type,extra={})=>({type,...serviceEnvelope(context),c4SearchVersion:1,...extra});
async function start(s,client=s.make(),old=false){const choice=selection(old);await client.start('A',choice.deck,choice.selection);const socket=s.sockets.at(-1);socket.open();return{client,socket,token:pending(s).token};}
function matched(s,client,socket){socket.packet(lobby(client.service,'welcome',{token:pending(s).token}));socket.packet(lobby(client.service,'matched',{roomId:ROOM}));const room=s.sockets.at(-1);room.open();return room;}

test('new producer persists one atomic confirmed context before retiring its original attempt',async t=>{
 const s=setup(t),{client,socket,token}=await start(s),room=matched(s,client,socket);
 assert.equal(s.storage.has(C4_CONFIRMED_KEY),false);assert.equal(s.storage.get(C4_SERVICE.keys.token),OLD_TOKEN);
 room.packet(packet());const record=JSON.parse(s.storage.get(C4_CONFIRMED_KEY));
 assert.equal(record.token,token);assert.equal(record.roomId,ROOM);assert.equal(record.epoch,EPOCH);assert.equal(record.context.arenaProfileProducer,LIGHT_EEVEE_PRODUCER);assert.equal(record.seq,10);
 assert.equal(s.storage.has(C4_PENDING_KEY),false);assert.equal(s.storage.get(C4_SERVICE.keys.room),OLD_ROOM);assert.equal(s.storage.get('poke-arena:ws-token'),'c1-retained');
 const confirmed=s.writes.findIndex(entry=>entry.operation==='set'&&entry.key===C4_CONFIRMED_KEY),retired=s.writes.findIndex(entry=>entry.operation==='remove'&&entry.key===C4_PENDING_KEY);assert.ok(confirmed>=0&&retired>confirmed);
 assert.equal(savedC4Service(SERVER),service);assert.equal(s.adopted[0].preparedGame.cardFor('eevee').cost,2);
});

test('reload resumes the stored new room while an absent new record restores the historical room',async t=>{
 const s=setup(t),first=await start(s);matched(s,first.client,first.socket).packet(packet());first.client.suspend();
 const next=s.make(C4_SERVICE);await next.resume();const room=s.sockets.at(-1);room.open();assert.equal(new URL(room.url).pathname,'/v1/rooms/'+ROOM);assert.equal(room.sent[0].selectionVersion,3);assert.equal(room.sent[0].arenaProfileProducer,LIGHT_EEVEE_PRODUCER);assert.equal(room.sent[0].after,10);room.packet(packet({seq:11,version:2}));assert.equal(next.seq,11);assert.equal(s.adopted.at(-1).preparedGame.cardFor('eevee').cost,2);next.suspend();
 s.storage.delete(C4_CONFIRMED_KEY);const old=s.make(service);await old.resume();const historical=s.sockets.at(-1);historical.open();assert.equal(new URL(historical.url).pathname,'/v1/rooms/'+OLD_ROOM);assert.equal(historical.sent[0].selectionVersion,2);assert.equal(Object.hasOwn(historical.sent[0],'arenaProfileProducer'),false);
 historical.packet(packet({context:C4_SERVICE,roomId:OLD_ROOM}));assert.equal(s.adopted.at(-1).preparedGame.cardFor('eevee').cost,5);assert.equal(old.service,C4_SERVICE);
});

test('failure writing the confirmed record retains the same attempt for a different default client after reload',async t=>{
 const s=setup(t),first=await start(s),room=matched(s,first.client,first.socket);s.faults.set=C4_CONFIRMED_KEY;room.packet(packet());assert.equal(pending(s).token,first.token);assert.equal(s.storage.has(C4_CONFIRMED_KEY),false);assert.ok(first.client.c4StorageError);first.client.suspend();delete s.faults.set;
 const reloaded=s.make(C4_SERVICE);await reloaded.resume();const lookup=s.sockets.at(-1);lookup.open();assert.equal(lookup.sent[0].token,first.token);assert.equal(lookup.sent[0].mode,'resume');assert.equal(lookup.sent[0].selectionVersion,3);matched(s,reloaded,lookup).packet(packet({seq:11,version:2}));assert.equal(s.storage.has(C4_PENDING_KEY),false);assert.equal(JSON.parse(s.storage.get(C4_CONFIRMED_KEY)).token,first.token);
});

test('a historical pending search and cancellation retain their original producer after the saved choice changes',async t=>{
 const s=setup(t),first=await start(s,s.make(C4_SERVICE),true),original=pending(s);first.client.suspend();
 const current=s.make(service),choice=selection(),before=structuredClone(choice);await current.start('Changed',choice.deck,choice.selection);const socket=s.sockets.at(-1);socket.open();assert.equal(socket.sent[0].token,original.token);assert.equal(socket.sent[0].ruleset,'c4-1');assert.equal(socket.sent[0].selectionVersion,2);assert.deepEqual(socket.sent[0].deck,original.request.deck);assert.deepEqual(choice,before);
 const closing=current.close(),cancel=s.sockets.at(-1);cancel.open();assert.equal(cancel.sent[0].mode,'cancel-intent');assert.equal(cancel.sent[0].ruleset,'c4-1');assert.equal(cancel.sent[0].token,original.token);cancel.packet(lobby(C4_SERVICE,'welcome',{token:original.token}));cancel.packet(lobby(C4_SERVICE,'idle',{searchState:'cancelled'}));assert.equal(await closing,true);assert.equal(s.storage.has(C4_PENDING_KEY),false);assert.equal(s.storage.get(C4_SERVICE.keys.token),OLD_TOKEN);
});

test('malformed new producer packets never adopt state or overwrite confirmed credentials',async t=>{
 const s=setup(t),first=await start(s),room=matched(s,first.client,first.socket);room.packet(packet());const saved=[...s.storage],adopted=s.adopted.at(-1);
 const malformed=packet({seq:1000,version:30});malformed.game.units[0].card={id:133};room.packet(malformed);assert.equal(s.adopted.at(-1),adopted);assert.equal(s.adopted.length,1);assert.deepEqual([...s.storage],saved);assert.equal(first.client.seq,10);assert.ok(!room.sent.some(value=>value.type==='ack'&&value.seq===1000));
 t.mock.timers.tick(250);const reconnect=s.sockets.at(-1);reconnect.open();const wrong=packet({seq:1000,version:30});wrong.arenaProfileProducer+=':unknown';reconnect.packet(wrong);assert.deepEqual([...s.storage],saved);assert.equal(s.adopted.length,1);
});

test('an invalid durable producer cannot fall back to legacy credentials or create a fresh search',async t=>{
 const s=setup(t),first=await start(s);matched(s,first.client,first.socket).packet(packet());first.client.suspend();const valid=JSON.parse(s.storage.get(C4_CONFIRMED_KEY));
 for(const alter of [value=>{value.context.arenaProfileProducer+=':unknown';},value=>{delete value.context;},value=>{value.seq=-1;}]){
  const bad=structuredClone(valid);alter(bad);s.storage.set(C4_CONFIRMED_KEY,JSON.stringify(bad));const before=[...s.storage],count=s.sockets.length,current=s.make(C4_SERVICE),choice=selection();assert.throws(()=>savedC4Service(SERVER));await assert.rejects(current.resume());await assert.rejects(current.start('B',choice.deck,choice.selection));assert.equal(s.sockets.length,count);assert.deepEqual([...s.storage],before);assert.equal(s.storage.has(C4_PENDING_KEY),false);
 }
});
