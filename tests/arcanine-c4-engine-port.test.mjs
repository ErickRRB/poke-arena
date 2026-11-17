import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Game,CARDS,DEFAULT_DECK} from '../dist/engine.js?v=target-c1-1';
import {HOG_ARCANINE} from '../dist/hog-profiles.js';
import {packGame,unpackGame,perspective,packEvent} from '../dist/snapshot.js';
import {cardEquivalentLabel} from '../dist/card-equivalents.js';
import {quickStats} from '../dist/quick-stats.js';
import {SoundSystem} from '../dist/audio.js';
import {prepareC4Catalog} from '../dist/c4-catalog.js?v=1';
await prepareC4Catalog();
const fixture=async key=>JSON.parse(await readFile(new URL('./fixtures/arcanine-producers/'+key+'.json',import.meta.url),'utf8'));
const next=(g,n)=>{for(let i=0;i<n;i++)g.step(1/30);};
const clean=card=>{const {legacyProfile,...rest}=card;return rest;};
test('actual C1 and C3 old/Hog producers restore full profiles, hand and pending job',async()=>{
 for(const [revision,hog] of [['6044941',false],['29e8869',false],['decb9f9',true]]){
  const {producer,snapshot}=await fixture(revision),g=unpackGame(snapshot),u=g.units.find(x=>x.key==='arcanine');assert.deepEqual(clean(u.card),snapshot.units.find(x=>x.key==='arcanine').card,revision);assert.equal(g.cardFor('arcanine').nativeReference==='HogRider',hog,revision);assert.equal(g.hands[0][0],'arcanine');assert.equal(g.attacks.length,1);assert.equal(g.attacks[0].attacker.id,u.id);
  const again=unpackGame(packGame(g));assert.equal(again.attacks.length,1);assert.deepEqual(clean(again.cardFor('arcanine')),clean(g.cardFor('arcanine')));if(revision!=='6044941')assert.equal(again.profileProducer,producer);
 }
});
test('C3 validation rejects ambiguous, conflicting and orphaned contradictory producers before input mutation',async()=>{
 const {producer,snapshot}=await fixture('29e8869'),{snapshot:hog}=await fixture('decb9f9');const source=structuredClone(snapshot);source.units=[];source.attacks=[];delete source.profileProducer;const before=JSON.stringify(source);assert.throws(()=>unpackGame(source),{code:'C3_PROFILE_AMBIGUOUS'});assert.equal(JSON.stringify(source),before);
 const mixed=structuredClone(snapshot);mixed.profileProducer=producer;mixed.projectiles.push({key:'arcanine',sourceKey:'arcanine',card:hog.units[0].card,targetId:null});const original=JSON.stringify(mixed);assert.throws(()=>unpackGame(mixed),{code:'C3_PROFILE_AMBIGUOUS'});assert.equal(JSON.stringify(mixed),original);
 const orphan=structuredClone(hog);orphan.units=[];orphan.attacks=[];delete orphan.profileProducer;orphan.projectiles.push({key:'arcanine',sourceKey:'arcanine',card:hog.units[0].card,impactPoint:{x:100,y:100},x:80,y:80,life:1});assert.equal(unpackGame(orphan).cardFor('arcanine').nativeReference,'HogRider');
});
test('C4 action crosses river and snapshot preserves target, leap, attack and perspective',()=>{
 const events=[],g=new Game({catalogVersion:4,ruleset:'c4-1',seed:42,deck:['arcanine',...DEFAULT_DECK.slice(0,7)],onEvent:e=>events.push(e)});g.start();g.aiEnabled=false;for(const t of g.towers)t.cooldown=1000;
 const enemy=g.spawn('machamp',1,315,400,0);enemy.card={...enemy.card,speed:0,passive:true};const structure=g.spawn('blastoiseCannon',1,250,330,0);structure.card={...structure.card,passive:true};assert.equal(g.deploy(0,0,250,460).ok,true);
 let jump=false,attack=false;for(let i=0;i<180;i++){g.step(1/30);const u=g.units.find(x=>x.key==='arcanine');assert.notEqual(u?.target?.id,enemy.id);if(u?.leap?.kind==='river'&&!jump){jump=true;const restored=unpackGame(packGame(g)),v=restored.units.find(x=>x.key==='arcanine');assert.deepEqual(v.leap,u.leap);assert.equal(v.card.nativeReference,'HogRider');assert.equal(v.target.id,structure.id);const flipped=perspective(packGame(g),1).units.find(x=>x.key==='arcanine');assert.equal(flipped.leap.startX,600-u.leap.startX);}
 if(g.attacks.some(x=>x.attacker.key==='arcanine')&&!attack){attack=true;const resumedEvents=[],resumed=unpackGame(packGame(g),e=>resumedEvents.push(e));assert.equal(resumed.attacks.filter(j=>j.attacker.key==='arcanine').length,1);next(resumed,25);const damage=resumedEvents.filter(e=>e.type==='damage'&&e.sourceKey==='arcanine');assert.equal(damage.length,1);assert.equal(damage[0].target.id,structure.id);assert.equal(damage[0].amount,317);}
 if(events.some(e=>e.type==='damage'&&e.sourceKey==='arcanine'))break;
 }assert.ok(jump&&attack);const hit=events.find(e=>e.type==='damage'&&e.sourceKey==='arcanine');assert.equal(hit.target.id,structure.id);assert.equal(hit.amount,317);assert.equal(enemy.hp,enemy.maxHp);assert.equal(g.units.find(x=>x.key==='arcanine').card.burn,0);
 const hitEvent=events.find(e=>e.type==='hit'&&e.key==='arcanine');assert.equal(packEvent(hitEvent).sourceCard.nativeReference,'HogRider');
});
test('C4 rejects contradictory cards before snapshot mutation',async()=>{const {snapshot}=await fixture('6044941');snapshot.catalogVersion=4;snapshot.ruleset='c4-1';const before=JSON.stringify(snapshot);assert.throws(()=>unpackGame(snapshot),{code:'C4_PROFILE_INVALID'});assert.equal(JSON.stringify(snapshot),before);});
test('Hog retains current building acquisition and retargets after structure removal',()=>{
 const g=new Game({catalogVersion:4,ruleset:'c4-1',seed:42});g.start();g.aiEnabled=false;g.towers.forEach(t=>t.cooldown=1000);const a=g.spawn('arcanine',0,240,460,0),enemy=g.spawn('machamp',1,315,400,0),building=g.spawn('blastoiseCannon',1,250,330,0);enemy.card={...enemy.card,passive:true,speed:0};building.card={...building.card,passive:true};next(g,4);assert.equal(a.target.id,building.id);building.hp=0;next(g,1);assert.ok(a.target&&a.target.id!==building.id);assert.notEqual(a.target.id,enemy.id);assert.ok('king'in a.target||a.target.card.structure);
});
test('actual 65ab C1 bridge snapshot keeps C1 semantics despite catalog4 metadata',async()=>{
 const {snapshot}=await fixture('65ab375'),g=unpackGame(snapshot);assert.equal(g.catalogVersion,4);assert.equal(g.ruleset,'c1-733');assert.equal(g.cardFor('arcanine').charge,1.5);assert.equal(g.cardFor('arcanine').burn,13);assert.deepEqual(clean(g.cardFor('arcanine')),CARDS.arcanine);assert.notEqual(g.cardFor('arcanine').nativeReference,'HogRider');assert.equal(g.attacks.length,1);const again=unpackGame(packGame(g));assert.equal(again.ruleset,'c1-733');assert.equal(again.cardFor('arcanine').charge,1.5);
});

test('C1 is default and C4 opts into the complete Hog profile',()=>{const old=new Game({seed:1}),hog=new Game({seed:1,catalogVersion:4,ruleset:'c4-1'});assert.equal(old.cardFor('arcanine'),CARDS.arcanine);assert.equal(CARDS.arcanine.charge,1.5);assert.equal(CARDS.arcanine.burn,13);assert.deepEqual(hog.cardFor('arcanine'),HOG_ARCANINE);assert.equal(HOG_ARCANINE.building,true);assert.equal(HOG_ARCANINE.riverJump,true);assert.equal(HOG_ARCANINE.charge,0);assert.equal(HOG_ARCANINE.burn,0);assert.throws(()=>new Game({catalogVersion:4}));});
