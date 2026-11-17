import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,DEFAULT_DECK,validDeck} from '../dist/engine.js?v=34';
import {RealtimeMatch} from '../realtime/src/match.js';
import {selectedDeck,validQueuedDeck,continuesQueue,legacyQueueExpired,LEGACY_QUEUE_MAX_AGE,selectionVersion} from '../realtime/src/selection.js';

const legacy=['diglett','voltorb','bulbasaur','eevee','ekans','gastly','grimer','squirtle'];
const players=deck=>[{id:'a',name:'Uno',deck,tokenHash:'a'},{id:'b',name:'Dos',deck,tokenHash:'b'}];
test('new authoritative selection rejects preserved originals and pending conversions without mutating cards',()=>{
  const before=JSON.stringify(CARDS);assert.equal(validDeck(legacy),true);assert.equal(selectedDeck(legacy),null);assert.deepEqual(selectedDeck(DEFAULT_DECK),DEFAULT_DECK);
  for(const key of ['onix','rapidash','arcanine','celebi','octillery','blastoise','charmander','espeon'])assert.equal(selectedDeck([key,...DEFAULT_DECK.slice(1)]),null,key);
  assert.equal(JSON.stringify(CARDS),before);assert.ok(CARDS.onix&&CARDS.rapidash&&CARDS.squirtle);
});
test('aliases normalize only a new selected deck and duplicate alias positions remain rejected',()=>{
  const input=['shuppet',...DEFAULT_DECK.slice(1)],before=[...input],selected=selectedDeck(input);assert.equal(selected[0],'diglett');assert.deepEqual(input,before);
  assert.equal(selectedDeck(['shuppet','diglett',...DEFAULT_DECK.slice(2)]),null);assert.equal(selectedDeck([null,...DEFAULT_DECK.slice(1)]),null);
});
test('fresh match validates canonical admission while stored C1 keeps original cards, hands and receipts',()=>{
  assert.throws(()=>new RealtimeMatch({players:players(legacy)}),/Invalid decks/);
  const room=new RealtimeMatch({id:'legacy',players:players(legacy),selectionVersion:0,now:1000,seed:12});room.game.start();room.game.aiEnabled=false;room.game.spawn('arcanine',0,300,600,0);room.game.spawn('grimer',1,300,200,0);
  const stored=JSON.parse(JSON.stringify(room.serialize()));delete stored.selectionVersion;
  const restored=new RealtimeMatch({stored});assert.deepEqual(restored.game.hands,stored.game.hands);assert.deepEqual(restored.game.queues,stored.game.queues);assert.deepEqual(restored.receipts,stored.receipts);
  for(const key of ['arcanine','grimer']){const unit=restored.game.units.find(unit=>unit.key===key);assert.deepEqual(unit.card,CARDS[key]);assert.equal(unit.card.nativeReference,CARDS[key].nativeReference);}
  const fresh=new RealtimeMatch({players:players(DEFAULT_DECK)});assert.equal(fresh.selectionVersion,selectionVersion);
});
test('authenticated legacy queue resume ignores new selection, preserves same search reconnect and has finite age',()=>{
  const session={deck:JSON.stringify(legacy),joined:1000,selection_version:0};assert.equal(validQueuedDeck(session),true);assert.equal(validQueuedDeck({...session,selection_version:1}),false);
  assert.equal(continuesQueue(session,{mode:'resume',deck:DEFAULT_DECK}),true);assert.equal(continuesQueue(session,{mode:'search',deck:legacy}),true);assert.equal(continuesQueue(session,{mode:'search',deck:DEFAULT_DECK}),false);
  assert.equal(legacyQueueExpired(session,1000+LEGACY_QUEUE_MAX_AGE-1),false);assert.equal(legacyQueueExpired(session,1000+LEGACY_QUEUE_MAX_AGE),true);assert.equal(legacyQueueExpired({...session,selection_version:1},1e9),false);
  assert.equal(validQueuedDeck({...session,deck:'{'}),false);assert.equal(validQueuedDeck({...session,selection_version:99}),false);
});
