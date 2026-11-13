import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OnlineClient,ONLINE_TOKEN_KEY,hasSavedOnlineSession} from '../dist/online.js';

const ROOM='d521bab0-5618-404e-96dc-5b73fcb51b77';
const deck=['diglett','voltorb','bulbasaur','eevee','ekans','gastly','grimer','squirtle'];
const snapshot=(extra={})=>({type:'snapshot',status:'matched',protocol:2,roomId:ROOM,epoch:'worker-one',team:0,version:5,seq:8,events:[],game:{state:'playing'},...extra});
function setup(t,{token='existing-session',room=null}={}){
  const storage=new Map(token?[[ONLINE_TOKEN_KEY,token]]:[]),sockets=[],snapshots=[],statuses=[],searches=[],idles=[];
  if(room)storage.set('poke-arena:ws-room',room);
  const previous=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,'sessionStorage',previous);else delete globalThis.sessionStorage;});
  t.mock.timers.enable({apis:['setTimeout','setInterval']});let now=100000;
  t.mock.method(Date,'now',()=>now);
  const client=new OnlineClient({serverUrl:'https://realtime.example',onSnapshot:p=>snapshots.push(p),onConnection:s=>statuses.push(s),onSearch:ms=>searches.push(ms),onIdle:message=>idles.push(message),
    createSocket:url=>{const socket={url,readyState:0,sent:[],send(value){this.sent.push(value==='ping'?value:JSON.parse(value));},close(){this.readyState=3;},open(){this.readyState=1;this.onopen?.();},packet(value){this.onmessage?.({data:typeof value==='string'?value:JSON.stringify(value)});},disconnect(code=1006){this.readyState=3;this.onclose?.({code});}};sockets.push(socket);return socket;}});
  t.after(()=>client.suspend());
  return{client,sockets,snapshots,statuses,searches,idles,storage,advance(ms){now+=ms;t.mock.timers.tick(ms);}};
}

test('a fresh visit does not create a socket or join the queue',async t=>{
  const s=setup(t,{token:null});assert.equal(hasSavedOnlineSession(),false);assert.equal(await s.client.resume(),false);assert.equal(s.sockets.length,0);
});
test('search authenticates in messages, hands off to a room and uses no HTTP polling',async t=>{
  const s=setup(t,{token:null});t.mock.method(globalThis,'fetch',()=>{throw Error('Unexpected HTTP polling');});
  await s.client.start('Erick',deck);const lobby=s.sockets[0];lobby.open();assert.equal(lobby.sent[0].mode,'search');assert.deepEqual(lobby.sent[0].deck,deck);
  lobby.packet({type:'welcome',token:'capability-token'});lobby.packet({type:'searching',joined:96000});assert.equal(s.searches[0],4000);
  lobby.packet({type:'matched',roomId:ROOM});const room=s.sockets[1];room.open();assert.equal(room.sent[0].token,'capability-token');assert.ok(!room.url.includes('capability-token'));
  room.packet(snapshot());assert.equal(s.client.connected,true);assert.equal(s.client.mode,'battle');s.advance(250);assert.equal(room.sent.at(-1).type,'ack');
});
test('reload restores the same room and suspension never abandons it',async t=>{
  const s=setup(t,{room:ROOM});assert.equal(await s.client.resume(),true);let room=s.sockets[0];room.open();assert.equal(room.sent[0].resume,true);
  room.packet(snapshot());s.client.suspend();s.advance(5000);assert.equal(s.sockets.length,1);assert.ok(!room.sent.some(p=>p.type==='action'||p.type==='cancel'));
  await s.client.resume();room=s.sockets[1];room.open();assert.equal(new URL(room.url).pathname,'/v1/rooms/'+ROOM);assert.equal(room.sent[0].after,8);
});
test('an idle or expired session returns to the menu without starting a search',async t=>{
  const s=setup(t);await s.client.resume();s.sockets[0].open();assert.equal(s.sockets[0].sent[0].mode,'resume');
  s.sockets[0].packet({type:'idle',expired:true});assert.equal(s.idles.length,1);assert.equal(hasSavedOnlineSession(),false);assert.equal(s.storage.size,0);s.advance(10000);assert.equal(s.sockets.length,1);
});
test('a queued resume keeps its session and resume intent after a network failure',async t=>{
  const s=setup(t);await s.client.resume();let lobby=s.sockets[0];lobby.open();lobby.packet({type:'searching',joined:96000});lobby.disconnect();assert.equal(s.statuses.at(-1),'Reconectando…');
  s.advance(250);lobby=s.sockets[1];lobby.open();assert.equal(lobby.sent[0].mode,'resume');assert.equal(lobby.sent[0].token,'existing-session');assert.equal(lobby.sent[0].deck,undefined);
});
test('temporary drops reconnect the same room and ignore obsolete socket events',async t=>{
  const s=setup(t,{room:ROOM});await s.client.resume();const first=s.sockets[0];first.open();first.packet(snapshot());first.disconnect();
  s.advance(250);const second=s.sockets[1];second.open();second.packet(snapshot({version:6}));first.packet({type:'idle'});
  assert.equal(s.client.active,true);assert.equal(s.client.connected,true);assert.equal(s.client.roomId,ROOM);assert.equal(s.idles.length,0);
});
test('retries preserve the action nonce and resolve the durable receipt exactly once',async t=>{
  const s=setup(t,{room:ROOM});await s.client.resume();const room=s.sockets[0];room.open();room.packet(snapshot());
  const result=s.client.send({kind:'deploy',handIndex:0,key:'diglett',x:130,y:600}),action=room.sent.at(-1);assert.equal(action.type,'action');
  s.advance(700);assert.deepEqual(room.sent.at(-1),action);room.packet({type:'result',nonce:action.nonce,result:{ok:true}});assert.deepEqual(await result,{ok:true});
  const before=room.sent.length;s.advance(700);assert.equal(room.sent.length,before);
});
test('snapshots deduplicate events and recover after a worker epoch changes',async t=>{
  const s=setup(t,{room:ROOM});await s.client.resume();const room=s.sockets[0];room.open();
  room.packet(snapshot({events:[{seq:7,event:{type:'spawn',unit:{key:'diglett',id:100}}}]}));assert.equal(s.snapshots[0].events[0].event.unit.card.name,'Diglett');
  room.packet(snapshot({version:6,events:[{seq:7,event:{type:'spawn'}},{seq:9,event:{type:'hit'}}],seq:9}));assert.equal(s.snapshots[1].events.length,1);
  room.packet(snapshot({version:4}));assert.equal(s.snapshots.length,2);
  room.packet(snapshot({epoch:'worker-two',version:1,seq:9}));assert.equal(s.snapshots.length,3);assert.equal(s.client.version,1);
});
test('missing snapshots trigger recovery even while ping replies arrive',async t=>{
  const s=setup(t,{room:ROOM});await s.client.resume();const room=s.sockets[0];room.open();room.packet(snapshot());
  s.advance(2500);room.packet('pong');s.advance(2500);assert.equal(s.client.connected,false);assert.equal(s.statuses.at(-1),'Reconectando…');s.advance(250);assert.equal(s.sockets.length,2);
});
test('a finished game keeps its result without reconnecting for absent simulation frames',async t=>{
  const s=setup(t,{room:ROOM});await s.client.resume();const room=s.sockets[0];room.open();room.packet(snapshot({game:{state:'ended'}}));
  for(let i=0;i<5;i++){s.advance(2500);room.packet('pong');}assert.equal(s.sockets.length,1);assert.equal(s.client.connected,true);
});
test('explicit cancellation sends cancel while closing an active match sends leave',async t=>{
  const s=setup(t);await s.client.start('Erick',deck);s.sockets[0].open();await s.client.close();assert.equal(s.sockets[0].sent.at(-1).type,'cancel');
  await s.client.resume();s.sockets[1].open();s.sockets[1].packet({type:'matched',roomId:ROOM});const room=s.sockets[2];room.open();room.packet(snapshot());await s.client.close();assert.equal(room.sent.at(-1).kind,'leave');
});
