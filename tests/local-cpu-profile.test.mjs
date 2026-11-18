import {prepareC4Catalog} from '../dist/c4-catalog.js?v=1';
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkCpuDeck,checkLocalCpuDeck,isLocalC4CpuPreview} from '../dist/local-cpu-profile.js';
import {updateLibrarySlot} from '../dist/deck-provenance.js';
import {Game,CARDS,DEFAULT_DECK} from '../dist/engine.js?v=target-c1-1';
import {HOG_ARCANINE} from '../dist/hog-profiles.js?v=1';
import {combatSourceProfile} from '../dist/combat-source-profile.js';
import {cardEquivalentLabel} from '../dist/card-equivalents.js';
import {quickStats} from '../dist/quick-stats.js';
import {SoundSystem} from '../dist/audio.js';
import {attackVisualProfile} from '../dist/combat-visuals.js';
import {attackAnimationFrame} from '../dist/sprite-motion.js';
import {Renderer} from '../dist/render.js';
await prepareC4Catalog();
const raw=()=>({version:1,active:0,updatedAt:100,slots:[['arcanine',...DEFAULT_DECK.slice(1)],['arcanine',...DEFAULT_DECK.slice(1)],DEFAULT_DECK.slice(),[]]});
const accepted=()=>updateLibrarySlot(raw(),0,0,'arcanine',{action:'accept',now:200});

test('the diagnostic C4 override stays restricted to loopback, independent of ordinary CPU admission',()=>{
  for(const host of ['localhost','127.0.0.1','[::1]'])assert.equal(isLocalC4CpuPreview(`http://${host}:3000/?preview=c4-cpu-1`),true);
  for(const url of ['http://localhost/','http://localhost/?preview=c4-editor-1','https://localhost.example/?preview=c4-cpu-1','https://poke-arena-web.eriickramiirez.workers.dev/?preview=c4-cpu-1','file:///tmp/?preview=c4-cpu-1'])assert.equal(isLocalC4CpuPreview(url),false);
});

test('CPU uses accepted Hog only in its exact slot while ordinary decks keep C1 and old Game profiles',()=>{
  const library=accepted(),before=structuredClone(library),oldGame=new Game(),hog=checkCpuDeck(library,0),ordinary=checkCpuDeck(library,2);
  assert.equal(hog.ok,true);assert.equal(hog.catalogVersion,4);assert.equal(hog.ruleset,'c4-1');
  assert.equal(checkCpuDeck(library,1).ok,false);assert.equal(ordinary.ok,true);assert.equal(ordinary.catalogVersion,1);assert.deepEqual(ordinary.keys,DEFAULT_DECK);
  assert.equal(checkCpuDeck(library,2,{forceC4:true}).catalogVersion,4);
  const next=new Game({deck:hog.keys,catalogVersion:hog.catalogVersion,ruleset:hog.ruleset,cpuDeck:DEFAULT_DECK});
  assert.equal(next.cardFor('arcanine'),HOG_ARCANINE);assert.equal(next.cardFor('arcanine').cost,4);assert.equal(next.cardFor('arcanine').damage,317);
  assert.equal(oldGame.cardFor('arcanine'),CARDS.arcanine);assert.deepEqual(library,before);
});

test('CPU admission rejects missing/conflicting consent and malformed rows without rewriting the library',()=>{
  const cases=[raw(),null,{version:2,slots:[DEFAULT_DECK]}];
  for(const alter of [v=>{v.slots[0][1]=null;},v=>{delete v.slots[0][1];},v=>{v.slotProvenance.slots[0][0].ruleset='c1-733';},v=>{v.provenanceConflict={updatedAt:201};}]){const v=accepted();alter(v);cases.push(v);}
  for(const library of cases){const before=structuredClone(library);assert.equal(checkCpuDeck(library,0).ok,false);assert.deepEqual(library,before);}
  const alias=accepted();alias.slots[2][0]='registeel';const before=structuredClone(alias),choice=checkCpuDeck(alias,2);assert.equal(choice.ok,true);assert.equal(choice.catalogVersion,1);assert.equal(choice.keys[0],'rhydon');assert.deepEqual(alias,before);
});

test('failed sprite downloads can be retried through the shared species loader',async t=>{
  const previousImage=Object.getOwnPropertyDescriptor(globalThis,'Image'),previousDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),calls=new Map();
  class TestImage{constructor(){this.width=1;this.height=1;}decode(){const count=(calls.get(this.src)||0)+1;calls.set(this.src,count);return this.src==='retry-sprite.png'&&count===1?Promise.reject(Error('declared temporary image failure')):Promise.resolve();}}
  Object.defineProperty(globalThis,'Image',{configurable:true,value:TestImage});Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8Array(4)})})})}});
  t.after(()=>{for(const[key,descriptor]of[['Image',previousImage],['document',previousDocument]]){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  const renderer=Object.assign(Object.create(Renderer.prototype),{metadata:{59:{}},imageLoads:new Map(),speciesLoads:new Map(),pendingSpecies:new Set(),sprites:new Map(),anchors:new Map(),bodyHeights:new Map(),animationEntries:()=>[['Attack',{file:'retry-sprite.png',shadow:'retry-shadow.png',width:1,height:1,durations:[1]}]]});
  await assert.rejects(renderer.ensureSpecies([59]),/temporary image failure/);await renderer.ensureSpecies([59]);
  assert.equal(calls.get('retry-sprite.png'),2);assert.equal(calls.get('retry-shadow.png'),1);assert.ok(renderer.sprites.has('59-Attack'));assert.equal(renderer.pendingSpecies.size,0);
});
test('admission requires the exact accepted position and never writes or adopts the other raw deck',()=>{
  const library=accepted(),before=structuredClone(library),admission=checkLocalCpuDeck(library,0);
  assert.equal(admission.ok,true);assert.deepEqual(admission.keys,library.slots[0]);
  const game=new Game({deck:admission.keys,catalogVersion:admission.catalogVersion,ruleset:admission.ruleset,cpuDeck:DEFAULT_DECK});
  assert.equal(game.cardFor('arcanine'),HOG_ARCANINE);assert.equal(game.hands[0][0],'arcanine');
  assert.equal(checkLocalCpuDeck(library,1).reason,'acceptance-required');assert.deepEqual(library,before);
  const moved=structuredClone(library);[moved.slots[0][0],moved.slots[0][1]]=[moved.slots[0][1],moved.slots[0][0]];assert.equal(checkLocalCpuDeck(moved,0).ok,false);
});
test('conflicting/unknown provenance, legacy aliases, holes and duplicate identities remain rejected',()=>{
  const cases=[];
  for(const alter of [v=>{v.slotProvenance.version=2;},v=>{v.slotProvenance.slots[0][0].ruleset='c1-733';},v=>{v.provenanceConflict={updatedAt:201};},v=>{v.slots[0][1]=null;},v=>{delete v.slots[0][1];},v=>{v.slots[0][1]='onix';},v=>{v.slots[0][1]='rapidash';},v=>{v.slots[0][1]='rhydon';v.slots[0][2]='registeel';}]){const v=accepted();alter(v);cases.push(v);}
  for(const v of cases){const before=structuredClone(v);assert.equal(checkLocalCpuDeck(v,0).ok,false);assert.deepEqual(v,before);}
  for(const index of [-1,4,0.5,undefined])assert.equal(checkLocalCpuDeck(accepted(),index).ok,false);
});
test('eligible aliases resolve only in the match copy and C1 policy/default remain unchanged',()=>{
  const library=accepted();library.slots[0][1]='registeel';const before=structuredClone(library),choice=checkLocalCpuDeck(library,0);
  assert.equal(choice.ok,true);assert.equal(choice.keys[1],'rhydon');assert.deepEqual(library,before);
  assert.equal(new Game().cardFor('arcanine'),CARDS.arcanine);assert.ok(CARDS.arcanine.charge>0);assert.notEqual(cardEquivalentLabel('arcanine'),'Montapuercos');
  assert.equal(cardEquivalentLabel('arcanine',HOG_ARCANINE),'Montapuercos');assert.ok(quickStats(HOG_ARCANINE).some(s=>s.value.includes('317')));
});
test('produced profiles take precedence over later actors and current match lookups',()=>{
  const source={...HOG_ARCANINE,style:'horn'},actor={card:CARDS.arcanine},game=new Game({catalogVersion:4,ruleset:'c4-1'});
  assert.equal(combatSourceProfile({key:'arcanine',sourceCard:source},game,actor),source);
  assert.equal(combatSourceProfile({key:'arcanine',card:source},game,actor),source);
  assert.equal(combatSourceProfile({key:'arcanine'},game,actor),CARDS.arcanine);
  assert.equal(combatSourceProfile({key:'arcanine'},game),HOG_ARCANINE);
});
test('audio release and orphaned contact use the produced Hog cue without changing recipes',()=>{
  const calls=[],sound=Object.create(SoundSystem.prototype);Object.assign(sound,{enabled:true,ctx:{state:'running'},play:(...a)=>calls.push(a)});
  sound.event({type:'hit',key:'arcanine',sourceCard:HOG_ARCANINE,style:'slam',sourceId:27,x:200,attackSeq:1});
  sound.event({type:'attackRelease',key:'arcanine',sourceCard:HOG_ARCANINE,attacker:{id:27,card:CARDS.arcanine},from:{x:200},style:'slam'});
  assert.deepEqual(calls.map(c=>[c[0],c[4]]),[['body',59],['body',59]]);
});
test('native Hog contact frame and recovery apply only to the accepted profile',()=>{
  const profile=attackVisualProfile(HOG_ARCANINE),meta={durations:[8,8,8,8,8,8,8]};
  assert.equal(attackAnimationFrame(meta,.6,.76,.6,undefined,profile),5);
  assert.equal(attackVisualProfile(CARDS.arcanine),CARDS.arcanine);
  const renderer=Object.create(Renderer.prototype);renderer.attackContacts=new Map();
  const actor={id:1,card:HOG_ARCANINE,hp:1697,attackSeq:2,attack:.16,attackDuration:.76,attackWindup:.6,moving:false},pose={};
  renderer.presentAttack(actor,pose,0);const continued=renderer.presentAttack({...actor,attack:0},pose,.1);
  assert.ok(continued.attack>0);assert.ok(continued.attackDuration>=.92-1e-9);
  assert.equal(renderer.presentAttack({...actor,card:CARDS.arcanine}, {},0).attack,.16);
});
