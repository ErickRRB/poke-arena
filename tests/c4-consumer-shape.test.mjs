import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {Game,DEFAULT_DECK} from '../dist/engine.js?v=target-c1-1';
import {getC4BaseCatalog} from '../dist/c4-catalog.js?v=1';
import {prepareC4Packet,prepareC4Transport} from '../dist/c4-packet.js?v=1';
import {validateC4WireGameShape,validateC4WireEventIdentity,validateC4WireEventLog} from '../dist/c4-wire-preparation.js?v=1';
import {publicEvent,unpackEvent} from '../dist/online-wire.js?v=target-c1-1';
import {unpackGame,packGame} from '../dist/snapshot.js?v=target-c1-1';
await prepareC4Transport();
const native=JSON.parse(await readFile(new URL('fixtures/c4-native-consumer-shapes-v1.json',import.meta.url))),json=value=>JSON.parse(JSON.stringify(value)),good=()=>structuredClone(native.public[1].packet),bad=fn=>assert.throws(fn,error=>['C4_SHAPE_INVALID','C4_PROFILE_INVALID'].includes(error.code));
const unit=structuredClone(native.events.find(sample=>sample.event.type==='spawn').event.unit),point={x:200,y:400};

test('original native event variants, public masks, detached graph and stored states remain decodable',()=>{
 assert.equal(native.events.length,23);assert.equal(native.public.length,3);assert.equal(native.private.length,2);
 const original=JSON.stringify(native),context=prepareC4Packet(good()).game;
 for(const sample of native.events)assert.doesNotThrow(()=>unpackEvent(sample.event,{game:context,validateEvent:validateC4WireEventIdentity}),sample.event.type);
 for(const sample of native.public){const prepared=prepareC4Packet(sample.packet,{viewTeam:sample.packet.team});assert.equal(prepared.game.ruleset,'c4-1');assert.equal(prepared.game.hands[0].length,4);assert.equal(prepared.game.hands[1].length,0);assert.equal(Object.hasOwn(prepared.game,'cpuDeck'),false);}
 for(const sample of native.private){assert.equal(validateC4WireGameShape(sample.stored.game,{visibility:'private'}),true);assert.equal(validateC4WireEventLog(sample.stored.events,{maxSeq:sample.stored.seq}),true);assert.doesNotThrow(()=>unpackGame(sample.stored.game));}
 assert.equal(JSON.stringify(native),original);
});

test('null/missing public collections and their consumed members fail before rehydration',()=>{
 for(const name of ['energy','stats','hands','queues','units','towers','attacks','projectiles','spells','fields','reinforcements'])for(const mode of ['null','missing']){
  const packet=good();if(mode==='null')packet.game[name]=null;else delete packet.game[name];bad(()=>prepareC4Packet(packet));
 }
 for(const name of ['units','towers','attacks','projectiles','spells','fields','reinforcements']){const packet=good();packet.game[name]=[null];bad(()=>prepareC4Packet(packet));}
 for(const [name,value]of [['energy',[null,6]],['stats',[{},{}]],['detachedEntities',null],['winner',null]]){const packet=good();packet.game[name]=value;if(name==='winner')packet.game.state='ended';bad(()=>prepareC4Packet(packet));}
});

test('public/private forms retain privacy and do not invent private execution state',()=>{
 const packet=good();for(const name of ['seed','nextId','aiClock','aiEnabled','tutorial','difficulty'])delete packet.game[name];assert.doesNotThrow(()=>prepareC4Packet(packet));
 const privateGame=structuredClone(native.private[0].stored.game);delete privateGame.seed;bad(()=>validateC4WireGameShape(privateGame,{visibility:'private'}));
 for(const field of ['hands','queues']){const candidate=good();candidate.game[field][1-candidate.team]=['pikachu'];bad(()=>prepareC4Packet(candidate));}
 for(const field of ['cpuDeck','cpuDeckName']){const candidate=good();candidate.game[field]=field==='cpuDeck'?[]:'privado';bad(()=>prepareC4Packet(candidate));}
});

test('real prototype descriptors protect runtime members and leave opaque metadata alone',()=>{
 for(const name of ['cardFor','random','multiplier','onEvent','animations','__proto__']){
  const packet=good();Object.defineProperty(packet.game,name,{value:null,enumerable:true,configurable:true});bad(()=>prepareC4Packet(packet));
 }
 const packet=good();packet.game.if={unit:null,card:{key:'blastoise'},from:'opaque'};packet.game.opaque={constructor:null,unit:{card:null}};
 const prepared=prepareC4Packet(packet);assert.deepEqual(prepared.game.if,packet.game.if);assert.deepEqual(prepared.game.opaque,packet.game.opaque);assert.equal(typeof Game.prototype.cardFor,'function');
});

test('required event actors and points are checked across sibling consumers, including silent audio',()=>{
 const actorEvents={spawn:{unit},step:{unit},burrow:{unit,hidden:true},faint:{unit},structureDown:{unit},transform:{unit},heal:{unit,amount:1},deathBurst:{unit,radius:20},dashWindup:{unit,duration:.2},dashStart:{unit,from:point,to:point,duration:.2},blink:{unit,from:point,to:point},leap:{unit,from:point,to:point},entry:{unit,x:200,y:400,radius:20,style:'ice'},counter:{unit,from:point,to:point}};
 for(const[type,data]of Object.entries(actorEvents)){
  const event=json({type,...data});assert.doesNotThrow(()=>validateC4WireEventIdentity(event),type);
  for(const value of [undefined,null,{}]){const invalid=structuredClone(event);if(value===undefined)delete invalid.unit;else invalid.unit=value;bad(()=>validateC4WireEventIdentity(invalid));}
 }
 for(const type of ['blink','leap','dashStart','counter'])for(const field of ['from','to']){const event=json({type,...actorEvents[type]});delete event[field];bad(()=>validateC4WireEventIdentity(event));}
 const release=json(native.events.find(sample=>sample.event.type==='attackRelease').event);for(const field of ['attacker','from','to']){const invalid=structuredClone(release);delete invalid[field];bad(()=>validateC4WireEventIdentity(invalid));}
 const damage={type:'damage',amount:1};bad(()=>validateC4WireEventIdentity(damage));assert.equal(validateC4WireEventIdentity({...damage,amount:0}),true);
 bad(()=>validateC4WireEventIdentity({type:'towerDown',team:0}));bad(()=>validateC4WireEventIdentity({type:'end',winner:0}));bad(()=>validateC4WireEventIdentity({type:'end',winner:null,reason:'x'}));
});

test('counter and end retain actual engine-produced payloads through the codec',()=>{
 const events=[],game=new Game({catalogVersion:4,ruleset:'c4-1',seed:7,onEvent:event=>events.push(event)});game.start();
 const source=game.spawn('pikachu',0,200,500,0),key=Object.entries(getC4BaseCatalog()).find(([,card])=>card.reflect>0)?.[0]||'magnemite',defender=game.spawn(key,1,200,400,0);
 // A complete controlled instance exercises the real producer even if catalog
 // balance later removes the stock reflection card; the role is unchanged.
 if(!defender.card.reflect)defender.card={...defender.card,reflect:.25};
 game.damage(defender,10,0,{sourceId:source.id,sourceKey:source.key});game.finish(0,'Resultado de fixture');
 for(const type of ['counter','end']){const event=events.find(event=>event.type===type);assert.ok(event,type);assert.doesNotThrow(()=>unpackEvent(json(publicEvent(event,game)),{game,validateEvent:validateC4WireEventIdentity}));}
});

test('branch-specific carrier and actor state are checked without requiring absent sibling fields',()=>{
 const packet=good(),actor=json(unit);actor.leap={kind:'river',startX:200,startY:440,endX:220,endY:360,elapsed:.2,duration:.9};actor.burn={remaining:2,tick:.2,damage:3,team:1,kind:'fire',sourceKey:'vulpix'};actor.dash={phase:'windup',elapsed:.1,targetId:1,startX:200,startY:400};packet.game.units=[actor];assert.doesNotThrow(()=>prepareC4Packet(packet));
 for(const [field,broken]of [['leap',{...actor.leap,duration:null}],['burn',{...actor.burn,remaining:null}],['dash',{...actor.dash,phase:'travel'}]]){const invalid=structuredClone(packet);invalid.game.units[0][field]=broken;bad(()=>prepareC4Packet(invalid));}
 const original=native.private.find(sample=>sample.stored.game.projectiles.length)?.stored.game;
 if(original){const state=structuredClone(original);state.projectiles[0].trace=null;bad(()=>validateC4WireGameShape(state,{visibility:'private'}));}
});

test('packet preparation has no presentation callback and rejects a malformed seen event',()=>{
 assert.throws(()=>prepareC4Packet(good(),{onEvent(){throw Error('must not run');}}),TypeError);
 const packet=good();packet.seq=1000;packet.version=1000;packet.events=[{seq:0,event:{type:'burrow',hidden:true}}];bad(()=>prepareC4Packet(packet));
 const game=prepareC4Packet(good()).game;bad(()=>unpackEvent({type:'burrow',hidden:true},{game,validateEvent(){}}));bad(()=>validateC4WireEventIdentity(null));
});

test('native collection producers retain spell, field, reinforcement and flight variants',()=>{
 const catalog=getC4BaseCatalog(),fresh=options=>{const game=new Game({catalogVersion:4,ruleset:'c4-1',seed:4,...options});game.start();return game;},check=game=>validateC4WireGameShape(json(packGame(game)),{visibility:'private'});
 for(const key of ['log','fireball']){
  const game=fresh({deck:[key,...DEFAULT_DECK.filter(other=>other!==key).slice(0,7)]});assert.equal(game.deploy(0,0,240,400).ok,true);assert.equal(game.spells.length,1);assert.equal(check(game),true);
 }
 const game=fresh(),owner=game.spawn('vulpix',0,200,450,0);game.addField(200,400,0,4,owner.id);
 const normal=Object.entries(catalog).find(([,card])=>card.spell&&card.fieldDuration&&!card.nativePull),pull=Object.entries(catalog).find(([,card])=>card.nativePull);
 assert.ok(normal&&pull);for(const [key,card]of [normal,pull])game.spellField({key,card,team:0,x:200,y:400,castAt:game.elapsed});game.spawn('snorlax',1,200,400,0);
 for(let i=0;i<15;i++)game.step(1/30);assert.ok(game.fields.some(field=>field.nativePull));assert.ok(game.fields.some(field=>!field.id));assert.equal(check(game),true);
 const parent=game.spawn('madriguera',0,150,550,0);game.spawnReinforcements(parent,'nidoranM',3,.5);assert.ok(game.reinforcements.length);assert.equal(check(game),true);
 for(const [flag,predicate]of [['rolling',card=>card.rollingShot],['linear',card=>card.pierce&&!card.rollingShot],['flameCone',card=>card.style==='flame'&&!card.suicide],['impactPoint',card=>card.projectileHoming===false&&!card.pierce&&!card.rollingShot&&card.style!=='flame'&&!card.building&&(card.rangedAttack??card.range>=50)]]){
  const entry=Object.entries(catalog).find(([,card])=>!card.spell&&predicate(card))||(flag==='flameCone'?['charizard',catalog.charizard]:null);assert.ok(entry,flag);const shotGame=fresh(),attacker=shotGame.spawn(entry[0],0,200,500,0),target=shotGame.spawn('snorlax',1,200,400,0);
  if(flag==='flameCone'&&!predicate(attacker.card))attacker.card={...attacker.card,style:'flame',cone:.65}; // Complete controlled instance for the retained cone producer.
  shotGame.attack(attacker,target);
  for(let i=0;i<90&&!shotGame.projectiles.some(shot=>shot[flag]);i++)shotGame.step(1/30);
  assert.ok(shotGame.projectiles.some(shot=>shot[flag]),flag);assert.equal(check(shotGame),true);
 }
});
