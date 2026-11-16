import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS,DEFAULT_DECK} from '../dist/engine.js?v=34';
import {packGame,unpackGame} from '../dist/snapshot.js?v=34';
import {publicSnapshot,unpackEvent} from '../dist/online-wire.js?v=34';
import {RealtimeMatch} from '../realtime/src/match.js';
import legacy from './fixtures/madriguera-5d1.json' with {type:'json'};

const legacyCard=()=>structuredClone(legacy.card);
const mechanical=card=>{const {id,name,structureArt,...rest}=card;return rest;};
const identity=card=>[card.id,card.name,card.structureArt];
const expected=[null,'Madriguera Nidoran','nidoranBurrow'];

test('Madriguera canonical identity changes without changing its Barbarian Hut body or Nidoqueen tank',()=>{
 assert.deepEqual(identity(CARDS.madriguera),expected);assert.equal(CARDS.nidoqueen.id,31);assert.equal(CARDS.nidoqueen.name,'Nidoqueen');
 assert.deepEqual([CARDS.madriguera.nativeReference,CARDS.madriguera.cost,CARDS.madriguera.hp,CARDS.madriguera.radius,CARDS.madriguera.lifetime,CARDS.madriguera.summon,CARDS.madriguera.summonCount,CARDS.madriguera.deathCount],['BarbarianHut',6,1164,24,30,'nidoranM',3,1]);
});

test('full-card snapshot from an old server restores the burrow while preserving mechanics, health, clocks and deck keys',()=>{
 const game=new Game({tutorial:true,seed:941});game.start();game.hands[0][0]='madriguera';game.queues[0][0]='nidoqueen';
 const unit=game.spawn('madriguera',0,168,600,0),tank=game.spawn('nidoqueen',0,300,600,0);unit.card=legacyCard();Object.assign(unit,{hp:631.25,lifetime:16.271,summonClock:2.5});game.pause();
 const wire=publicSnapshot(game,0);assert.equal(wire.units[0].card.id,31);
 for(const data of [packGame(game),wire]){const restored=unpackGame(data),body=restored.units.find(u=>u.id===unit.id);assert.deepEqual(identity(body.card),expected);assert.deepEqual(mechanical(body.card),JSON.parse(JSON.stringify(mechanical(unit.card))));assert.deepEqual([body.key,body.hp,body.maxHp,body.lifetime,body.summonClock],['madriguera',631.25,1164,16.271,2.5]);assert.equal(restored.hands[0][0],'madriguera');assert.equal(restored.queues[0][0],'nidoqueen');assert.equal(restored.units.find(u=>u.id===tank.id).card.id,31);}
 assert.equal(unit.card.id,31,'input authoritative state is not mutated');
});

test('incoming events with complete or omitted cards use the burrow identity before reaching the renderer',()=>{
 const old=legacyCard(),event={type:'spawn',unit:{key:'madriguera',id:70,card:old,hp:400,maxHp:1164}},decoded=unpackEvent(event);
 assert.deepEqual(identity(decoded.unit.card),expected);assert.deepEqual(mechanical(decoded.unit.card),mechanical(old));assert.equal(decoded.unit.hp,400);assert.equal(event.unit.card.id,31);
 assert.deepEqual(identity(unpackEvent({type:'spawn',unit:{key:'madriguera'}}).unit.card),expected);assert.equal(unpackEvent({type:'spawn',unit:{key:'nidoqueen',card:CARDS.nidoqueen}}).unit.card.id,31);
 const oldCannon={type:'spawn',unit:{key:'blastoise',card:{id:9,hp:1400,damage:170,cost:4,range:120}}},migrated=unpackEvent(oldCannon).unit;
 assert.equal(migrated.key,'octillery');assert.equal(migrated.card.id,224);assert.deepEqual([migrated.card.hp,migrated.card.damage,migrated.card.cost,migrated.card.range],[1400,170,4,120]);assert.equal(oldCannon.unit.key,'blastoise');
});

test('the authoritative server restores old unit and event cards without changing the saved rules',()=>{
 const players=[0,1].map(id=>({id:String(id),name:'Player'+id,tokenHash:'test'+id,deck:[...DEFAULT_DECK]})),match=new RealtimeMatch({id:'burrow',players,now:1000,seed:941});match.advance(match.starts);
 const unit=match.game.spawn('madriguera',0,168,600,0);unit.card=legacyCard();match.event({type:'spawn',unit});
 const restored=new RealtimeMatch({stored:JSON.parse(JSON.stringify(match.serialize()))}),body=restored.game.units.find(u=>u.id===unit.id),event=restored.events.at(-1).event;
 assert.deepEqual(identity(body.card),expected);assert.deepEqual(identity(event.unit.card),expected);assert.deepEqual(mechanical(body.card),JSON.parse(JSON.stringify(mechanical(unit.card))));assert.equal(body.hp,unit.hp);assert.equal(body.id,unit.id);
});
