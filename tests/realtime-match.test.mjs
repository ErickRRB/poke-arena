import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RealtimeMatch,validDeck} from '../realtime/src/match.js';
import {Game,CARDS} from '../dist/engine.js?v=25';
import {packGame,unpackGame,perspective} from '../dist/snapshot.js?v=25';
import {publicSnapshot,publicEvent,unpackEvent,RECONNECT_GRACE} from '../dist/online-wire.js';

const deck=['diglett','voltorb','bulbasaur','eevee','ekans','gastly','grimer','squirtle'];
const match=()=>new RealtimeMatch({id:'room',seed:12,now:1000,players:[{id:'a',name:'Uno',deck,tokenHash:'a'},{id:'b',name:'Dos',deck,tokenHash:'b'}]});

test('continuous simulation advances without player commands and persistence restores it',()=>{
  const room=match();room.advance(3200);assert.equal(room.game.state,'playing');room.advance(4200);assert.ok(room.game.elapsed>.95&&room.game.elapsed<1.05);
  const action={nonce:crypto.randomUUID(),kind:'deploy',handIndex:0,key:'diglett',x:130,y:600},result=room.action(0,action,4200);assert.equal(result.ok,true);
  const restored=new RealtimeMatch({stored:JSON.parse(JSON.stringify(room.serialize()))});assert.equal(restored.game.units.length,3);assert.deepEqual(restored.action(0,action,4200),result);assert.equal(restored.game.units.length,3);
});
test('one disconnected player forfeits after the grace period and both missing players draw',()=>{
  const room=match();room.touch(0,1000+RECONNECT_GRACE);room.advance(1001+RECONNECT_GRACE);assert.equal(room.game.state,'ended');assert.equal(room.game.winner,0);
  const both=match();both.advance(1001+RECONNECT_GRACE);assert.equal(both.game.winner,-1);
});
test('wire snapshots hide the opponent hand and preserve custom summoned forms and references',()=>{
  const game=new Game({deck,seed:1});game.start();const troop=game.spawn('diglett',0,130,600),custom=game.spawn('geodude',1,130,200);custom.card={...custom.card,hp:321};troop.target=custom;
  const wire=publicSnapshot(game,0);assert.equal(wire.units[0].card,undefined);assert.equal(wire.units[1].card.hp,321);assert.deepEqual(wire.hands[1],[]);assert.deepEqual(wire.queues[1],[]);
  const restored=unpackGame(wire);assert.equal(restored.units[0].card,CARDS.diglett);assert.equal(restored.units[0].target,restored.units[1]);assert.equal(restored.units[1].card.hp,321);
  const mirrored=unpackGame(perspective(publicSnapshot(game,1),1));assert.deepEqual(mirrored.hands[0],game.hands[1]);assert.equal(mirrored.units[0].x,600-troop.x);
  const before=game.units[0].x;game.units[0].x=132.123456;assert.equal(publicSnapshot(game,0).units[0].x,132.123);assert.equal(game.units[0].x,132.123456);game.units[0].x=before;
  const event=unpackEvent(publicEvent({type:'hit',attacker:troop,target:custom}));assert.equal(event.attacker.card,CARDS.diglett);assert.equal(event.target.card.hp,321);
  assert.ok(JSON.stringify(wire).length<JSON.stringify(packGame(game)).length);
});
test('the public catalog replaces the duplicated Electrode without changing its explosive role',()=>{
  assert.equal(CARDS.electrode.token,true);assert.equal(CARDS.forretress.id,205);assert.equal(CARDS.forretress.building,true);assert.equal(CARDS.forretress.suicide,true);
  assert.equal(CARDS.forretress.damage,CARDS.electrode.damage);assert.equal(CARDS.forretress.hp,CARDS.electrode.hp);assert.equal(validDeck(['electrode',...deck.slice(1)]),false);assert.equal(validDeck(['forretress',...deck.slice(1)]),true);
  assert.match(CARDS.forretress.role,/^Win condition/);assert.ok(Number.isFinite(CARDS.forretress.scale));
});
