import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,DEFAULT_DECK} from '../dist/engine.js?v=eevee-1';
import {getC4BaseCatalog} from '../dist/c4-catalog.js?v=1';
import {prepareC4Packet,prepareC4Transport} from '../dist/c4-packet.js?v=formation-1';
import {validateC4WireGameShape,validateC4WireEventLog} from '../dist/c4-wire-preparation.js?v=formation-1';
import {publicSnapshot,publicEvent} from '../dist/online-wire.js?v=formation-1';
import {packGame,unpackGame} from '../dist/snapshot.js?v=eevee-1';
import {C4_SERVICE,C4_CONFIRMED_KEY,arenaServiceForContext,serviceEnvelope} from '../dist/online-context.js?v=eevee-1';
import {LIGHT_EEVEE_RULESET,LIGHT_EEVEE_PRODUCER} from '../dist/arena-profile-producers.js?v=eevee-1';
import {OnlineClient} from '../dist/online.js?v=formation-1';
import {c4SearchEndpoint} from '../dist/c4-search.js?v=eevee-1';

await prepareC4Transport();
const json=value=>JSON.parse(JSON.stringify(value)),ROOM='d521bab0-5618-404e-96dc-5b73fcb51b77',EPOCH='512f2058-46ab-4d54-bb2d-96798df66192',TOKEN='a'.repeat(72),SERVER='http://127.0.0.1:4180';
const contexts=[C4_SERVICE,arenaServiceForContext({ruleset:LIGHT_EEVEE_RULESET,arenaProfileProducer:LIGHT_EEVEE_PRODUCER})];
const keys=Object.entries(getC4BaseCatalog()).filter(([,card])=>card.nativeFormation!=null).map(([key])=>key);
function fixture(key,service){
 const raw=[],deck=[key,...DEFAULT_DECK.filter(k=>k!==key).slice(0,7)];
 const game=new Game({catalogVersion:4,ruleset:service.ruleset,deck,seed:19852,onEvent:event=>raw.push(event)});
 game.catalogRef=C4_SERVICE.catalogRef;game.aiEnabled=false;game.start();
 const initial=packet(game,raw,0,1,service),cost=game.cardFor(key).cost;
 while(game.energy[0]<cost)game.step(1/30);
 const action=game.deploy(0,0,168,460);assert.equal(action.ok,true,key);
 return{game,raw,initial,packets:[0,1].map(team=>packet(game,raw,team,2,service))};
}
function packet(game,raw,team,version,service){
 const events=raw.filter(event=>event.type!=='step').map((event,index)=>({seq:index+1,event:publicEvent(event,game)}));
 return json({type:'snapshot',...serviceEnvelope(service),status:'matched',roomId:ROOM,epoch:EPOCH,team,version,seq:events.length,serverTime:1000,startsIn:0,opponent:'Fixture',game:publicSnapshot(game,team),events});
}

for(const service of contexts)test(`${service.ruleset}: every native formation survives public state, pending events and private restore`,()=>{
 assert.equal(keys.length,10);
 for(const key of keys){
  const f=fixture(key,service),expectedContext=service.arenaProfileProducer?{ruleset:service.ruleset,arenaProfileProducer:service.arenaProfileProducer}:undefined;
  for(const p of f.packets){
   const prepared=prepareC4Packet(p,{viewTeam:p.team,expectedContext});assert.equal(prepared.game.units.length,f.game.units.length,key);
   const eventOnly=structuredClone(p);eventOnly.game.units=[];
   assert.doesNotThrow(()=>prepareC4Packet(eventOnly,{viewTeam:p.team,expectedContext}),key+' retained events');
  }
  const stored=json(packGame(f.game));assert.equal(validateC4WireGameShape(stored,{visibility:'private',expectedContext}),true,key);
  assert.equal(validateC4WireEventLog(f.packets[0].events,{maxSeq:f.packets[0].seq,expectedContext}),true,key);
  const restored=unpackGame(stored);assert.equal(restored.units.length,f.game.units.length,key);
  for(const unit of restored.units)assert.deepEqual(unit.card.nativeFormation,f.game.cardFor(unit.key).nativeFormation,key);
 }
});

test('malformed descriptors and tuple arrays are still rejected before adoption',()=>{
 const f=fixture('diglett',C4_SERVICE),base=f.game.cardFor('diglett');
 const values=[[],{}, {...base.nativeFormation,primaries:0},{...base.nativeFormation,primaries:1.5},{...base.nativeFormation,seconds:-1},{...base.nativeFormation,radius:null},{...base.nativeFormation,width:'wide'},{...base.nativeFormation,angleShift:null},{...base.nativeFormation,angleShift:.5}];
 for(const value of values){const p=structuredClone(f.packets[0]);p.game.units[0].card={...base,nativeFormation:value};assert.throws(()=>prepareC4Packet(p),error=>error.code==='C4_SHAPE_INVALID'&&error.message.includes('nativeFormation'));}
 const p=structuredClone(f.packets[0]);p.game.units[0].card={...base,formation:{primaries:3}};
 assert.throws(()=>prepareC4Packet(p),error=>error.code==='C4_SHAPE_INVALID'&&error.message.includes('.formation'));
});

for(const service of contexts)test(`${service.ruleset}: a legal Diglett deploy keeps the live client connected to the same room`,async t=>{
 const storage=new Map(),sockets=[],adopted=[];
 const previous=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)}});
 if(service.arenaProfileProducer)storage.set(C4_CONFIRMED_KEY,JSON.stringify({version:1,endpoint:c4SearchEndpoint(SERVER),context:serviceEnvelope(service),token:TOKEN,roomId:ROOM,seq:0,epoch:EPOCH}));
 else for(const[key,value]of [[service.keys.token,TOKEN],[service.keys.room,ROOM],[service.keys.seq,'0']])storage.set(key,value);
 t.mock.timers.enable({apis:['setTimeout','setInterval']});
 const client=new OnlineClient({service,serverUrl:SERVER,onSnapshot:p=>adopted.push(p),onSearch(){},onConnection(){},createSocket:url=>{
  const socket={url,readyState:0,sent:[],send(value){this.sent.push(value);},close(){this.readyState=3;},open(){this.readyState=1;this.onopen();},packet(value){this.onmessage({data:JSON.stringify(value)});}};sockets.push(socket);return socket;
 }});
 t.after(()=>{client.suspend();if(previous)Object.defineProperty(globalThis,'sessionStorage',previous);else delete globalThis.sessionStorage;});
 const f=fixture('diglett',service);await client.resume();const socket=sockets[0];socket.open();socket.packet(f.initial);assert.equal(client.connected,true);
 socket.packet(f.packets[0]);assert.equal(client.connected,true,client.lastValidationError?.message);assert.equal(client.lastValidationError,undefined);
 assert.equal(adopted.length,2);assert.equal(adopted[1].preparedGame.units.length,3);assert.equal(client.roomId,ROOM);assert.equal(client.token,TOKEN);assert.equal(sockets.length,1);
});
