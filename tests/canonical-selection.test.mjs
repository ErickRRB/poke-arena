import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkSelectionCard,checkSelectionDeck,selectionVersion} from '../dist/canonical-selection.js';
import {loadDeckLibrary,saveDeckLibrary} from '../dist/deck-storage.js';
import {CARDS,CPU_DECKS,DEFAULT_DECK} from '../dist/engine.js?v=34';
import {SandboxGame} from '../dist/sandbox.js';

const memory=()=>{const values=new Map();return{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),values};};

test('selection policy is a pure versioned 46-representative allowlist',()=>{
  assert.equal(selectionVersion,1);
  assert.equal(checkSelectionCard('pikachu').ok,true);
  assert.equal(checkSelectionCard('charmander').ok,false);
  assert.equal(checkSelectionCard('octillery').ok,false);
  assert.equal(checkSelectionCard('onix').ok,false);
  assert.equal(checkSelectionCard('rapidash').ok,false);
  assert.equal(checkSelectionCard('typhlosion').ok,true);
  assert.deepEqual(checkSelectionCard('blastoise'),{ok:false,key:'blastoise',canonicalKey:'blastoise',reason:'inactive-or-unknown'});
  assert.equal(CARDS.squirtle.id,7,'Squirtle remains in the source inventory even though it is not a selection option');
  assert.equal(CARDS.exeggutor.token,true,'Exeggutor remains an internal unit, not a selectable card');
  assert.equal(checkSelectionDeck(DEFAULT_DECK).ok,true);
  assert.ok(CPU_DECKS.every(deck=>checkSelectionDeck(deck.cards).ok),'every CPU preset uses eligible representatives');
  assert.equal(checkSelectionDeck(['pikachu','snorlax','zubat','charizard','thunder','fireball','machamp','eevee']).ok,true);
  assert.ok(checkSelectionDeck(['pikachu','snorlax','zubat','charizard','thunder','fireball','machamp','charmander']).reasons.includes('slot-8-inactive-or-unknown'));
  assert.ok(checkSelectionDeck(['pikachu','snorlax','zubat','charizard','thunder','fireball','machamp','pikachu']).reasons.includes('duplicate-canonical-card-pikachu'));
});

test('opening a historical deck preserves holes, inactive keys and alias conflicts without a write',()=>{
  const storage=memory();
  const raw=['pikachu',null,'blastoise','charizard','squirtle','rhydon','registeel','pikachu'];
  const original=JSON.stringify({version:1,active:0,slots:[raw,['onix','rapidash'],[],null],updatedAt:10});
  storage.setItem('poke-arena:deck-slots',original);
  const loaded=loadDeckLibrary({storage,cookie:''});
  assert.deepEqual(loaded.slots[0],raw);
  assert.deepEqual(loaded.slots[1],['onix','rapidash']);
  assert.equal(storage.getItem('poke-arena:deck-slots'),original,'loading does not rewrite the saved payload');
  const check=checkSelectionDeck(loaded.slots[0]);
  assert.equal(check.slots[2].canonicalKey,'blastoise');
  assert.equal(check.slots[2].ok,false,'a changed historical role is never promoted through an engine restoration alias');
  assert.ok(check.reasons.includes('duplicate-canonical-card-pikachu'));
  assert.ok(check.reasons.includes('duplicate-canonical-card-rhydon'));
  assert.ok(check.reasons.includes('deck-must-have-eight-positions')===false);
});

test('an explicit edit persists only the edited slot and leaves the historical legacy payload intact',()=>{
  const storage=memory();
  const rawLegacy=['pikachu',null,'blastoise','charizard','squirtle','rhydon','registeel','pikachu'];
  const legacyPayload=JSON.stringify(rawLegacy);storage.setItem('poke-arena:deck',legacyPayload);
  const loaded=loadDeckLibrary({storage,cookie:''});
  loaded.slots[0]=rawLegacy.slice();loaded.slots[0][1]='snorlax';
  assert.equal(saveDeckLibrary(loaded,{storage,cookie:'',writeCookie:()=>{},now:20}),true);
  const after=loadDeckLibrary({storage,cookie:''});
  assert.deepEqual(after.slots[0],['pikachu','snorlax','blastoise','charizard','squirtle','rhydon','registeel','pikachu']);
  assert.deepEqual(after.slots[1],null);assert.deepEqual(after.slots[2],null);assert.deepEqual(after.slots[3],null);
  assert.equal(storage.getItem('poke-arena:deck'),legacyPayload,'the old payload remains byte-identical until explicit replacement');
});

test('sandbox admits compatible aliases and rejects inactive direct placements',()=>{
  const game=new SandboxGame();
  assert.equal(game.place(0,'charmander',158,550).ok,false);
  assert.equal(game.place(0,'blastoise',158,550).ok,false);
  assert.equal(game.place(0,'exeggutor',158,550).ok,true);
  assert.ok(game.units.some(unit=>unit.key==='vivero'));
});
