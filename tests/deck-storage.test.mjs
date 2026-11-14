import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDeck,saveDeck,normalizeDeck,loadDeckLibrary,saveDeckLibrary } from '../dist/deck-storage.js';
import { DEFAULT_DECK } from '../dist/engine.js';
const memory=()=>{const values=new Map();return{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};};
const chosen=['gastly','vivero','kyogre','ditto','hooh','treecko','log','sandshrew'];
test('saved Registeel selections migrate to Rhydon without duplicating or filling other slots',()=>{
  assert.deepEqual(normalizeDeck(['gastly','registeel','ditto']),['gastly','rhydon','ditto']);assert.deepEqual(normalizeDeck(['registeel','rhydon','ampharos']),['rhydon','ampharos']);
  const storage=memory();storage.setItem('poke-arena:deck-slots',JSON.stringify({version:1,active:1,slots:[['registeel'],['ampharos','registeel'],[],null]}));assert.deepEqual(loadDeckLibrary({storage,cookie:''}).slots,[['rhydon'],['ampharos','rhydon'],[],null]);
});

test('the last chosen deck is written immediately and restored in the same order',()=>{
  const storage=memory();let cookie='';assert.ok(saveDeck(chosen,{storage,cookie,writeCookie:v=>cookie=v,now:100}));
  assert.deepEqual(loadDeck({storage,cookie}),chosen);assert.deepEqual(JSON.parse(storage.getItem('poke-arena:deck')),chosen);
});
test('a saved former starter deck is never replaced by the current default deck',()=>{
  const storage=memory(),old=['pikachu','snorlax','squirtle','charmander','zubat','thunder','charizard','fireball'];
  storage.setItem('poke-arena:deck',JSON.stringify(old));assert.deepEqual(loadDeck({storage,cookie:''}),old);assert.notDeepEqual(old,DEFAULT_DECK);
});
test('partial and empty decks survive closing and reloading instead of resetting',()=>{
  for(const cards of[[],chosen.slice(0,5)]){const storage=memory();saveDeck(cards,{storage,cookie:'',writeCookie:()=>{}});assert.deepEqual(loadDeck({storage,cookie:''}),cards);}
});
test('catalog migration preserves valid choices and order while removing retired or duplicate entries',()=>{
  const storage=memory();storage.setItem('poke-arena:deck',JSON.stringify(['gastly','shuppet','removed-card','nidoranScouts','gastly','nidoranPack','shuppetSwarm']));
  assert.deepEqual(loadDeck({storage,cookie:''}),['gastly','diglett','raltsTrio','poochyenaPack','diglettHorde']);
  assert.deepEqual(normalizeDeck(['constructor','__proto__','nidoranF','gastly']),['gastly']);
});

test('Electrode migrates to Forretress across saved decks without filling incomplete slots',()=>{
  const storage=memory();storage.setItem('poke-arena:deck-slots',JSON.stringify({version:1,active:1,slots:[['voltorb','electrode'],['centralElectrode','electrode','gastly'],[],null]}));
  const loaded=loadDeckLibrary({storage,cookie:''});assert.equal(loaded.active,1);assert.deepEqual(loaded.slots,[['voltorb','forretress'],['centralElectrode','forretress','gastly'],[],null]);
});
test('retired Exeggutor migrates to the three-elixir nursery in decks, slots and backups',()=>{
  const storage=memory(),old=['gastly','exeggutor','kyogre'];
  storage.setItem('poke-arena:deck',JSON.stringify(old));assert.deepEqual(loadDeck({storage,cookie:''}),['gastly','vivero','kyogre']);
  storage.setItem('poke-arena:deck-slots',JSON.stringify({version:1,active:1,slots:[old,['exeggutor','vivero','ditto'],[],null]}));
  assert.deepEqual(loadDeckLibrary({storage,cookie:''}).slots,[['gastly','vivero','kyogre'],['vivero','ditto'],[],null]);
  const cookie='poke_arena_deck='+encodeURIComponent(JSON.stringify({cards:old,updatedAt:100}));
  assert.deepEqual(loadDeck({storage:memory(),cookie}),['gastly','vivero','kyogre']);
});
test('the local cookie backup preserves edits when browser storage is unavailable',()=>{
  const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};let cookie='';
  assert.ok(saveDeck(chosen,{storage:blocked,cookie,writeCookie:v=>cookie=v,now:200}));assert.deepEqual(loadDeck({storage:blocked,cookie}),chosen);
});
test('a newer backup takes precedence over an older local deck after storage recovers',()=>{
  const storage=memory();let cookie='';saveDeck(DEFAULT_DECK,{storage,cookie,writeCookie:v=>cookie=v,now:100});
  saveDeck(chosen,{storage:{getItem:k=>storage.getItem(k),setItem(){throw Error('blocked');}},cookie,writeCookie:v=>cookie=v,now:200});
  assert.deepEqual(loadDeck({storage,cookie}),chosen);
});
test('corrupt data can fall back to the backup without discarding a valid saved deck',()=>{
  const storage=memory();let cookie='';saveDeck(chosen,{storage,cookie,writeCookie:v=>cookie=v,now:100});
  storage.setItem('poke-arena:deck','broken-json');assert.deepEqual(loadDeck({storage,cookie}),chosen);
  storage.setItem('poke-arena:deck',JSON.stringify(chosen));assert.deepEqual(loadDeck({storage,cookie:'poke_arena_deck=broken-json'}),chosen);
});

test('the four-slot library migrates an existing incomplete deck into slot one',()=>{
  const storage=memory();saveDeck(chosen.slice(0,5),{storage,cookie:'',writeCookie:()=>{}});const library=loadDeckLibrary({storage,cookie:''});assert.equal(library.active,0);assert.deepEqual(library.slots,[chosen.slice(0,5),null,null,null]);
});
test('four deck selections, empty slots and the active slot persist independently',()=>{
  const storage=memory(),library={version:1,active:2,slots:[chosen,[],DEFAULT_DECK.slice(0,6),null]};let cookie='';assert.ok(saveDeckLibrary(library,{storage,cookie,writeCookie:v=>cookie=v,now:100}));const loaded=loadDeckLibrary({storage,cookie});assert.equal(loaded.active,2);assert.deepEqual(loaded.slots,library.slots);loaded.slots[2].pop();saveDeckLibrary(loaded,{storage,cookie,writeCookie:v=>cookie=v,now:101});assert.deepEqual(loadDeckLibrary({storage,cookie}).slots[0],chosen);
});
test('slot cookies restore all four decks if browser storage fails',()=>{
  const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},library={version:1,active:3,slots:[chosen,DEFAULT_DECK,[],['shuppet','gastly']]};let cookie='';saveDeckLibrary(library,{storage:blocked,cookie,writeCookie:v=>cookie=v});const loaded=loadDeckLibrary({storage:blocked,cookie});assert.equal(loaded.active,3);assert.deepEqual(loaded.slots[3],['diglett','gastly']);assert.deepEqual(loaded.slots[2],[]);
});
test('a newer slot backup beats older data and corrupt libraries preserve the legacy deck',()=>{
  const storage=memory();saveDeck(chosen,{storage,cookie:'',writeCookie:()=>{}});storage.setItem('poke-arena:deck-slots','invalid');assert.deepEqual(loadDeckLibrary({storage,cookie:''}).slots[0],chosen);let cookie='';saveDeckLibrary({version:1,active:0,slots:[DEFAULT_DECK,null,null,null]},{storage,cookie,writeCookie:v=>cookie=v,now:100});saveDeckLibrary({version:1,active:1,slots:[DEFAULT_DECK,chosen,null,null]},{storage:{getItem:k=>storage.getItem(k),setItem(){throw Error('blocked');}},cookie,writeCookie:v=>cookie=v,now:200});assert.deepEqual(loadDeckLibrary({storage,cookie}).slots[1],chosen);
});
