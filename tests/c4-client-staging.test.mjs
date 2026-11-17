import test from 'node:test';import assert from 'node:assert/strict';
import {OnlineClient} from '../dist/online.js';
import {Game,DEFAULT_DECK} from '../dist/engine.js?v=target-c1-1';
import {C4_SERVICE,serviceEnvelope} from '../dist/online-context.js?v=1';
import {prepareC4Transport,prepareC4Packet} from '../dist/c4-packet.js?v=1';
import {publicSnapshot,publicEvent} from '../dist/online-wire.js?v=target-c1-1';
import {c4SelectionFromLibrary} from '../dist/profile-selection.js?v=1';
import {updateLibrarySlot} from '../dist/deck-provenance.js?v=c4-editor-1';
await prepareC4Transport();
const ROOM='d521bab0-5618-404e-96dc-5b73fcb51b77',OTHER='7c47c7ec-a56d-45e6-b16e-642638b33c53',EPOCH='512f2058-46ab-4d54-bb2d-96798df66192',TOKEN='a'.repeat(72),NEW_TOKEN='b'.repeat(72);
function packet({partial=false,invalidEvent=false,override=false,seq=10,version=1,roomId=ROOM}={}){
 const g=new Game({catalogVersion:4,ruleset:'c4-1',seed:3}),u=g.spawn('arcanine',0,240,500,0);g.start();g.catalogRef=C4_SERVICE.catalogRef;
 const event=override?{type:'hit',key:u.key,team:u.team,sourceId:u.id,sourceKey:u.key,sourceCard:{...u.card,damage:u.card.damage+.123456789,opaque:{key:'blastoise',card:{id:9}}},style:'slam',x:u.x,y:u.y}:{type:'spawn',unit:u};
 const result={type:'snapshot',...serviceEnvelope(C4_SERVICE),status:'matched',roomId,epoch:EPOCH,team:0,version,seq,serverTime:1000,startsIn:0,opponent:'Rival',game:publicSnapshot(g,0),events:[{seq,event:publicEvent(event,g)}]};
 if(partial)result.game.units[0].card={id:59};if(invalidEvent)result.events[0].event.unit.card={id:59};return result;
}
function setup(t){
 const storage=new Map([[C4_SERVICE.keys.token,TOKEN],[C4_SERVICE.keys.room,ROOM],[C4_SERVICE.keys.seq,'9'],['poke-arena:ws-token','c1-confirmed-token'],['poke-arena:ws-room','c1-confirmed-room']]),original=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage'),sockets=[],snapshots=[],idles=[];let adopted={fixture:'prior-game'},onlineMode=false,opponent='prior-opponent';
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)}});
 t.mock.timers.enable({apis:['setTimeout','setInterval']});
 const client=new OnlineClient({service:C4_SERVICE,serverUrl:'http://127.0.0.1:4180',onSnapshot:p=>{adopted=p.preparedGame;onlineMode=true;opponent=p.opponent;snapshots.push(p);},onConnection(){},onSearch(){},onIdle:v=>idles.push(v),createSocket:url=>{const socket={url,readyState:0,sent:[],send(data){this.sent.push(data==='ping'?data:JSON.parse(data));},close(){this.readyState=3;},open(){this.readyState=1;this.onopen?.();},packet(value){this.onmessage?.({data:JSON.stringify(value)});}};sockets.push(socket);return socket;}});
 t.after(()=>{client.suspend();if(original)Object.defineProperty(globalThis,'sessionStorage',original);else delete globalThis.sessionStorage;});
 return{client,sockets,snapshots,idles,storage,get adopted(){return adopted;},get onlineMode(){return onlineMode;},get opponent(){return opponent;}};
}
test('C4 stages welcome/room and rejects a partial snapshot without replacing confirmed credentials or Game',async t=>{
 const s=setup(t),saved=[...s.storage],previous=s.adopted;
 const library=updateLibrarySlot({version:1,updatedAt:1,slots:[['arcanine',...DEFAULT_DECK.slice(1)]]},0,0,'arcanine',{action:'accept',now:2}),choice=c4SelectionFromLibrary(library,0);
 await s.client.start('A',choice.deck,choice.selection);s.sockets[0].open();
 s.sockets[0].packet({type:'welcome',...serviceEnvelope(C4_SERVICE),token:NEW_TOKEN});s.sockets[0].packet({type:'matched',...serviceEnvelope(C4_SERVICE),roomId:OTHER});s.sockets[1].open();
 assert.deepEqual([...s.storage],saved);assert.equal(s.client.roomId,ROOM);assert.equal(s.client.token,TOKEN);
 s.sockets[1].packet(packet({partial:true,roomId:OTHER,seq:1000,version:50}));assert.deepEqual([...s.storage],saved);assert.equal(s.adopted,previous);assert.equal(s.snapshots.length,0);assert.equal(s.idles.length,0);assert.equal(s.client.seq,9);
 t.mock.timers.tick(250);s.sockets.at(-1).open();s.sockets.at(-1).packet(packet());assert.equal(s.snapshots.length,1);assert.equal(s.client.roomId,ROOM);assert.equal(s.client.seq,10);assert.equal(s.storage.get('poke-arena:ws-token'),'c1-confirmed-token');
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
