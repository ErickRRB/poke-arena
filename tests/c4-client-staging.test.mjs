import test from 'node:test';import assert from 'node:assert/strict';
import {OnlineClient} from '../dist/online.js';
import {Game,DEFAULT_DECK} from '../dist/engine.js?v=target-c1-1';
import {C4_SERVICE,serviceEnvelope} from '../dist/online-context.js?v=1';
import {prepareC4Transport,prepareC4Packet} from '../dist/c4-packet.js?v=1';
import {publicSnapshot,publicEvent} from '../dist/online-wire.js?v=target-c1-1';
import {c4SelectionFromLibrary} from '../dist/profile-selection.js?v=1';
import {updateLibrarySlot} from '../dist/deck-provenance.js?v=c4-editor-1';
import {C4_PENDING_KEY,C4_SEARCH_TOKEN} from '../dist/c4-search.js?v=1';
await prepareC4Transport();
const ROOM='d521bab0-5618-404e-96dc-5b73fcb51b77',OTHER='7c47c7ec-a56d-45e6-b16e-642638b33c53',EPOCH='512f2058-46ab-4d54-bb2d-96798df66192',TOKEN='a'.repeat(72),NEW_TOKEN='b'.repeat(72);
function packet({partial=false,invalidEvent=false,override=false,seq=10,version=1,roomId=ROOM}={}){
 const g=new Game({catalogVersion:4,ruleset:'c4-1',seed:3}),u=g.spawn('arcanine',0,240,500,0);g.start();g.catalogRef=C4_SERVICE.catalogRef;
 const event=override?{type:'hit',key:u.key,team:u.team,sourceId:u.id,sourceKey:u.key,sourceCard:{...u.card,damage:u.card.damage+.123456789,opaque:{key:'blastoise',card:{id:9}}},style:'slam',x:u.x,y:u.y}:{type:'spawn',unit:u};
 const result={type:'snapshot',...serviceEnvelope(C4_SERVICE),status:'matched',roomId,epoch:EPOCH,team:0,version,seq,serverTime:1000,startsIn:0,opponent:'Rival',game:publicSnapshot(g,0),events:[{seq,event:publicEvent(event,g)}]};
 if(partial)result.game.units[0].card={id:59};if(invalidEvent)result.events[0].event.unit.card={id:59};return result;
}
function setup(t){
 const storage=new Map([[C4_SERVICE.keys.token,TOKEN],[C4_SERVICE.keys.room,ROOM],[C4_SERVICE.keys.seq,'9'],['poke-arena:ws-token','c1-confirmed-token'],['poke-arena:ws-room','c1-confirmed-room']]),original=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage'),sockets=[],snapshots=[],idles=[],clients=[],faults={};let adopted={fixture:'prior-game'},onlineMode=false,opponent='prior-opponent';
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:k=>{if(faults.get===k)throw Error('controlled read failure');return faults.mismatch===k&&storage.has(k)?null:storage.get(k)||null;},setItem:(k,v)=>{if(faults.set===k)throw Error('controlled write failure');storage.set(k,String(v));},removeItem:k=>{if(faults.remove===k)throw Error('controlled remove failure');storage.delete(k);}}});
 t.mock.timers.enable({apis:['setTimeout','setInterval']});
 const makeClient=()=>{const result=new OnlineClient({service:C4_SERVICE,serverUrl:'http://127.0.0.1:4180',onSnapshot:p=>{adopted=p.preparedGame;onlineMode=true;opponent=p.opponent;snapshots.push(p);},onConnection(){},onSearch(){},onIdle:v=>idles.push(v),createSocket:url=>{const socket={url,readyState:0,sent:[],send(data){this.sent.push(data==='ping'?data:JSON.parse(data));},close(){this.readyState=3;},open(){this.readyState=1;this.onopen?.();},packet(value){this.onmessage?.({data:JSON.stringify(value)});},disconnect(code=1006){this.readyState=3;this.onclose?.({code});}};sockets.push(socket);return socket;}});clients.push(result);return result;},client=makeClient();
 t.after(()=>{for(const value of clients)value.suspend();if(original)Object.defineProperty(globalThis,'sessionStorage',original);else delete globalThis.sessionStorage;});
 return{client,makeClient,sockets,snapshots,idles,storage,faults,get adopted(){return adopted;},get onlineMode(){return onlineMode;},get opponent(){return opponent;}};
}
const choice=()=>c4SelectionFromLibrary(updateLibrarySlot({version:1,updatedAt:1,slots:[['arcanine',...DEFAULT_DECK.slice(1)]]},0,0,'arcanine',{action:'accept',now:2}),0);
const pending=s=>JSON.parse(s.storage.get(C4_PENDING_KEY));
const lobbyPacket=(type,extra={})=>({type,...serviceEnvelope(C4_SERVICE),c4SearchVersion:1,...extra});
async function start(s){const q=choice();await s.client.start('A',q.deck,q.selection);const socket=s.sockets.at(-1);socket.open();return socket;}
function welcome(s,socket=s.sockets.at(-1)){socket.packet(lobbyPacket('welcome',{token:pending(s).token}));}
test('C4 stages welcome/room and rejects a partial snapshot without replacing confirmed credentials or Game',async t=>{
 const s=setup(t),saved=[...s.storage],previous=s.adopted;
 const lobby=await start(s),token=pending(s).token;welcome(s,lobby);lobby.packet(lobbyPacket('matched',{roomId:OTHER}));s.sockets[1].open();
 assert.deepEqual([...s.storage].filter(([key])=>key!==C4_PENDING_KEY),saved);assert.equal(s.client.roomId,ROOM);assert.equal(s.client.token,TOKEN);
 s.sockets[1].packet(packet({partial:true,roomId:OTHER,seq:1000,version:50}));assert.deepEqual([...s.storage].filter(([key])=>key!==C4_PENDING_KEY),saved);assert.equal(pending(s).token,token);assert.equal(s.adopted,previous);assert.equal(s.snapshots.length,0);assert.equal(s.idles.length,0);assert.equal(s.client.seq,9);
 t.mock.timers.tick(250);const lookup=s.sockets.at(-1);lookup.open();assert.equal(lookup.sent[0].mode,'resume');assert.equal(lookup.sent[0].token,token);welcome(s,lookup);lookup.packet(lobbyPacket('matched',{roomId:OTHER}));const room=s.sockets.at(-1);room.open();room.packet(packet({roomId:OTHER}));assert.equal(s.snapshots.length,1);assert.equal(s.client.roomId,OTHER);assert.equal(s.client.seq,10);assert.equal(s.client.token,token);assert.equal(s.storage.has(C4_PENDING_KEY),false);assert.equal(s.storage.get('poke-arena:ws-token'),'c1-confirmed-token');
});
test('a malformed event aborts the entire staged packet, including cursor and ack',async t=>{
 const s=setup(t);await s.client.resume();const first=s.sockets[0];first.open();first.packet(packet());const accepted=s.adopted,saved=[...s.storage];
 const bad=packet({invalidEvent:true,seq:11,version:2});bad.events[0].seq=10;first.packet(bad);assert.equal(s.adopted,accepted);assert.equal(s.snapshots.length,1);assert.deepEqual([...s.storage],saved);assert.equal(s.client.seq,10);assert.ok(!first.sent.some(p=>p.type==='ack'&&p.seq===11));
});
test('complete coherent instance overrides and opaque metadata survive the real JSON codec',()=>{
 const data=JSON.parse(JSON.stringify(packet({override:true}))),before=JSON.stringify(data),prepared=prepareC4Packet(data);
 assert.equal(prepared.events[0].event.sourceCard.damage,317.123456789);assert.deepEqual(prepared.events[0].event.sourceCard.opaque,{key:'blastoise',card:{id:9}});assert.equal(JSON.stringify(data),before);
});
test('an invalid welcome cannot replace an existing token or redirect its confirmed room',async t=>{
 const s=setup(t),before=[...s.storage];await s.client.resume();s.sockets[0].open();s.sockets[0].packet({type:'welcome',...serviceEnvelope(C4_SERVICE),catalogRef:'wrong',token:NEW_TOKEN});assert.deepEqual([...s.storage],before);assert.equal(s.client.token,TOKEN);assert.equal(s.client.roomId,ROOM);assert.equal(s.snapshots.length,0);
});

test('invalid consumer families cannot mutate App state, opponent, credentials, effects or ack even when already seen',async t=>{
 const s=setup(t),presented=[];s.client.onPresentation=p=>presented.push(p);await s.client.resume();s.sockets[0].open();s.sockets[0].packet(packet());
 const prior={game:s.adopted,opponent:s.opponent,mode:s.onlineMode,storage:[...s.storage],seq:s.client.seq,version:s.client.version,room:s.client.roomId,token:s.client.token};
 const corruptions=[p=>p.game.energy=null,p=>p.game.stats=[null,null],p=>p.game.spells=null,p=>p.events=[{seq:10,event:{type:'burrow',hidden:true}}],p=>p.events=[{seq:10,event:{type:'counter',from:{x:1,y:2},to:{x:1,y:2}}}],p=>p.events=[{seq:10,event:{type:'end',winner:0}}]];
 for(const corrupt of corruptions){const socket=s.sockets.at(-1);if(socket.readyState!==1)socket.open();const invalid=packet({seq:1000,version:100});invalid.opponent='unconfirmed-opponent';corrupt(invalid);socket.packet(invalid);
  assert.equal(s.adopted,prior.game);assert.equal(s.opponent,prior.opponent);assert.equal(s.onlineMode,prior.mode);assert.deepEqual([...s.storage],prior.storage);assert.equal(s.client.seq,prior.seq);assert.equal(s.client.version,prior.version);assert.equal(s.client.roomId,prior.room);assert.equal(s.client.token,prior.token);assert.equal(s.snapshots.length,1);assert.equal(presented.length,1);assert.ok(!socket.sent.some(p=>p.type==='ack'&&p.seq===1000));
  t.mock.timers.tick(3000);s.sockets.at(-1).open();
 }
 s.sockets.at(-1).packet(packet({seq:11,version:2}));assert.equal(s.client.seq,11);assert.equal(s.snapshots.length,2);assert.equal(presented.length,2);
});

test('presentation exceptions occur after an integral commit and are not relabeled as invalid packets',async t=>{
 const s=setup(t);await s.client.resume();const socket=s.sockets[0];socket.open();let committed=false;
 const presentationFailure=Error('controlled presentation failure');s.client.onPresentation=()=>{committed=s.onlineMode&&s.client.connected&&s.client.mode==='battle'&&s.client.seq===10&&s.storage.get(C4_SERVICE.keys.seq)==='10'&&s.opponent==='Rival';throw presentationFailure;};
 assert.throws(()=>socket.packet(packet()),error=>error===presentationFailure);assert.equal(committed,true);assert.equal(s.snapshots.length,1);assert.equal(s.client.lastValidationError,undefined);assert.equal(s.client.connected,true);assert.equal(s.idles.length,0);
 t.mock.timers.tick(200);assert.ok(socket.sent.some(p=>p.type==='ack'&&p.seq===10));
});

test('pre-welcome reload repeats one durable credential/request before any socket send',async t=>{
 const s=setup(t),saved=[...s.storage],first=await start(s),record=pending(s);assert.equal(record.phase,'intent');assert.equal(C4_SEARCH_TOKEN.test(record.token),true);assert.equal(first.sent[0].mode,'search-intent');assert.deepEqual(first.sent[0].deck,record.request.deck);assert.deepEqual([...s.storage].filter(([key])=>key!==C4_PENDING_KEY),saved);
 s.client.suspend();const reloaded=s.makeClient();assert.equal(await reloaded.resume(),true);const socket=s.sockets.at(-1);socket.open();assert.equal(new URL(socket.url).pathname,'/v1/lobby');assert.equal(socket.sent[0].token,record.token);assert.equal(socket.sent[0].mode,'search-intent');assert.deepEqual(socket.sent[0].selection,record.request.selection);assert.equal(pending(s).token,record.token);
});

test('initial storage write/readback and secure entropy failures never open a search socket',async t=>{
 const s=setup(t),q=choice();
 for(const fault of ['set','get','mismatch']){s.storage.delete(C4_PENDING_KEY);s.faults[fault]=C4_PENDING_KEY;await assert.rejects(s.client.start('A',q.deck,q.selection));assert.equal(s.sockets.length,0);delete s.faults[fault];}
 s.storage.delete(C4_PENDING_KEY);t.mock.method(globalThis.crypto,'getRandomValues',()=>{throw Error('controlled entropy failure');});await assert.rejects(s.client.start('A',q.deck,q.selection));assert.equal(s.sockets.length,0);assert.equal(s.storage.has(C4_PENDING_KEY),false);
});

test('incompatible saved context and old/mismatched welcome never promote or replace credentials',async t=>{
 const s=setup(t),first=await start(s),token=pending(s).token;first.packet({type:'welcome',...serviceEnvelope(C4_SERVICE),token});assert.equal(pending(s).phase,'intent');assert.equal(s.client.token,TOKEN);assert.equal(s.snapshots.length,0);
 const value=pending(s);value.context.catalogRef='wrong';s.storage.set(C4_PENDING_KEY,JSON.stringify(value));s.client.suspend();const client=s.makeClient(),count=s.sockets.length;await assert.rejects(client.resume());assert.equal(s.sockets.length,count);assert.equal(s.storage.get(C4_SERVICE.keys.token),TOKEN);
});

test('failed owned/confirmed writes keep the original attempt as recovery without trusting partial triples',async t=>{
 const s=setup(t),lobby=await start(s),token=pending(s).token;s.faults.set=C4_PENDING_KEY;welcome(s,lobby);assert.equal(pending(s).phase,'intent');delete s.faults.set;lobby.packet(lobbyPacket('matched',{roomId:OTHER}));const room=s.sockets.at(-1);room.open();s.faults.set=C4_SERVICE.keys.room;room.packet(packet({roomId:OTHER}));assert.equal(s.snapshots.length,1);assert.equal(pending(s).token,token);assert.equal(s.storage.get(C4_SERVICE.keys.room),ROOM);
 s.client.suspend();delete s.faults.set;const client=s.makeClient();await client.resume();const lookup=s.sockets.at(-1);lookup.open();assert.equal(new URL(lookup.url).pathname,'/v1/lobby');assert.equal(lookup.sent[0].token,token);welcome(s,lookup);lookup.packet(lobbyPacket('matched',{roomId:OTHER}));const next=s.sockets.at(-1);next.open();assert.equal(next.sent[0].after,0);next.packet(packet({roomId:OTHER,seq:11}));assert.equal(s.storage.has(C4_PENDING_KEY),false);assert.equal(s.storage.get(C4_SERVICE.keys.room),OTHER);
});

test('failed removal preserves a recoverable pending record after an integral valid commit',async t=>{
 const s=setup(t),lobby=await start(s);welcome(s,lobby);lobby.packet(lobbyPacket('matched',{roomId:OTHER}));const room=s.sockets.at(-1);room.open();s.faults.remove=C4_PENDING_KEY;room.packet(packet({roomId:OTHER}));assert.equal(s.snapshots.length,1);assert.equal(s.storage.get(C4_SERVICE.keys.token),pending(s).token);assert.equal(s.storage.get(C4_SERVICE.keys.room),OTHER);assert.equal(s.storage.get(C4_SERVICE.keys.seq),'10');assert.ok(s.client.c4StorageError);
});

test('cancel during room handoff persists intent, ignores late Game, and resolves only on authoritative idle',async t=>{
 const s=setup(t),lobby=await start(s),token=pending(s).token;welcome(s,lobby);lobby.packet(lobbyPacket('matched',{roomId:OTHER}));const room=s.sockets.at(-1);room.open();let complete=false;const closing=s.client.close().then(value=>{complete=value;});assert.equal(pending(s).phase,'cancelling');assert.equal(complete,false);room.packet(packet({roomId:OTHER}));assert.equal(s.snapshots.length,0);
 const cancel=s.sockets.at(-1);cancel.open();assert.equal(cancel.sent[0].mode,'cancel-intent');assert.equal(cancel.sent[0].token,token);assert.notEqual(cancel.sent[0].token,TOKEN);welcome(s,cancel);cancel.packet(lobbyPacket('error',{code:'server'}));assert.equal(complete,false);assert.equal(pending(s).token,token);t.mock.timers.tick(3000);const retry=s.sockets.at(-1);retry.open();assert.equal(retry.sent[0].mode,'cancel-intent');welcome(s,retry);retry.packet(lobbyPacket('idle',{searchState:'cancelled'}));await closing;assert.equal(complete,true);assert.equal(s.storage.has(C4_PENDING_KEY),false);assert.equal(s.storage.get(C4_SERVICE.keys.token),TOKEN);assert.equal(s.storage.get(C4_SERVICE.keys.room),ROOM);assert.ok(!room.sent.some(p=>p.type==='action'));
});

test('4001 and late callbacks preserve the attempt without cancellation or promotion of a newer owner',async t=>{
 const s=setup(t),socket=await start(s),record=pending(s);socket.disconnect(4001);assert.equal(s.client.active,false);assert.equal(pending(s).token,record.token);assert.ok(!socket.sent.some(p=>p.type==='cancel'||p.mode==='cancel-intent'));
 const client=s.makeClient();await client.resume();const current=s.sockets.at(-1);current.open();welcome(s,current);s.storage.set(C4_PENDING_KEY,JSON.stringify({...record,token:'f'.repeat(64)}));current.packet(lobbyPacket('matched',{roomId:OTHER}));assert.equal(client.active,false);assert.equal(pending(s).token,'f'.repeat(64));assert.equal(s.storage.get(C4_SERVICE.keys.token),TOKEN);assert.equal(s.snapshots.length,0);
});

test('expiry removes only its pending attempt and never clears confirmed C or starts another queue',async t=>{
 const s=setup(t),socket=await start(s),token=pending(s).token;socket.packet(lobbyPacket('idle',{token,expired:true,searchState:'expired'}));assert.equal(s.storage.has(C4_PENDING_KEY),false);assert.equal(s.storage.get(C4_SERVICE.keys.token),TOKEN);assert.equal(s.storage.get(C4_SERVICE.keys.room),ROOM);const count=s.sockets.length;t.mock.timers.tick(10000);assert.equal(s.sockets.length,count);
});

test('if both cancelling storage and network fail, reload can recover identity but not unsaved cancellation',async t=>{
 const s=setup(t);await start(s);const token=pending(s).token;s.faults.set=C4_PENDING_KEY;s.client.close();const cancel=s.sockets.at(-1);assert.equal(cancel.readyState,0);assert.equal(s.client.c4Attempt.phase,'cancelling');assert.equal(pending(s).phase,'intent');s.client.suspend();delete s.faults.set;
 const client=s.makeClient();await client.resume();const lookup=s.sockets.at(-1);lookup.open();assert.equal(lookup.sent[0].token,token);assert.equal(lookup.sent[0].mode,'search-intent');assert.equal(pending(s).phase,'intent');
});
