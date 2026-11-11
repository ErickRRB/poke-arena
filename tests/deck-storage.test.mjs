import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDeck,saveDeck,normalizeDeck } from '../dist/deck-storage.js';
import { DEFAULT_DECK } from '../dist/engine.js';
const memory=()=>{const values=new Map();return{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};};
const chosen=['gastly','exeggutor','kyogre','ditto','hooh','treecko','log','sandshrew'];

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
