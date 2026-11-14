import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MAX_EFFECT_VOICES} from '../dist/audio.js';
import {CARDS,makeSound,attackScene,featureScene,spellScene} from './helpers/audio-catalog-harness.mjs';

for(const buffered of[true,false])test(`all active attack families remain audible with ${buffered?'decoded samples':'samples still loading'}`,()=>{
  const silent=[];
  for(const[key,card]of Object.entries(CARDS).filter(([,card])=>!card.spell&&!card.passive&&card.damage>0)){
    const audio=makeSound({buffered});
    audio.event({type:'attackRelease',key,style:card.style,attacker:{card},from:{x:180},shot:0});
    if(!audio.trace.length)silent.push(`${key}:${card.style}`);
    for(const output of audio.trace){assert.ok(output.volume>0&&output.volume<=1,key);assert.ok(output.duration>0&&output.duration<=3,key);assert.ok(output.rate>0&&output.rate<4,key);assert.ok(Math.abs(output.pan)<=1,key);}
  }
  assert.deepEqual(silent,[],'Every attack must have an audible release even before its samples are decoded');
});

test('delayed projectile contacts preserve the sound of the actual attack family, including aliases',()=>{
  const silent=[];
  for(const[key,card]of Object.entries(CARDS).filter(([,card])=>!card.spell&&!card.passive&&card.range>=50&&card.damage>0)){
    const row=attackScene(key);
    if(row.events.some(event=>event.type==='hit'&&event.outputs.length===0))silent.push(`${key}:${card.style}`);
  }
  assert.deepEqual(silent,[],'A travelling projectile must not become silent when it reaches its target');
});

test('a failed family-specific sample falls back even when unrelated foley decoded',()=>{
  const audio=makeSound();
  for(const key of['foley:swish-1','foley:swish-2','combat:215-release'])audio.sound.buffers.delete(key);
  audio.event({type:'attackRelease',key:'sneaselToken',style:'slash',attacker:{card:CARDS.sneaselToken},from:{x:180},shot:0});
  assert.ok(audio.trace.length,'Unrelated decoded samples must not hide missing slash samples');
});

test('the opposite lane remains audible when two different attackers release the same family together',()=>{
  const audio=makeSound();
  const left=audio.event({type:'attackRelease',style:'leaf',attacker:{card:CARDS.treecko},from:{x:120},shot:0},10);
  const right=audio.event({type:'attackRelease',style:'leaf',attacker:{card:CARDS.nuzleaf},from:{x:480},shot:0},10);
  assert.ok(left.length&&right.length,'Family rate limiting must not mute the other lane');
  assert.ok(left.some(output=>output.pan<0)&&right.some(output=>output.pan>0));
});

test('muting before audio unlock handles battle, death and spell events without scheduling output',()=>{
  const audio=makeSound({enabled:false});audio.sound.ctx=null;
  for(const event of[
    {type:'towerDown'},{type:'structureDown'},
    {type:'deathBurst',unit:{key:'golem',card:CARDS.golem,x:300}},
    {type:'spellHit',key:'sneaselAmbush',x:300},
    {type:'attackRelease',style:'flame',attacker:{card:CARDS.charizard},from:{x:300},shot:0},
    {type:'deploy',key:'pikachu',x:300}
  ])assert.doesNotThrow(()=>audio.sound.event(event),event.type);
  assert.equal(audio.trace.length,0);
});

test('muting an unlocked context prevents new samples, noise and tones',()=>{
  const audio=makeSound();audio.sound.setEnabled(false);
  audio.sound.event({type:'towerDown'});
  audio.sound.event({type:'spellHit',key:'lightning',x:300});
  audio.sound.event({type:'deploy',key:'charizard',x:300});
  assert.equal(audio.trace.length,0);
  assert.equal(audio.sound.master.gain.value,0);
});

test('an interrupted context queues no stale effect nodes before recovery',()=>{
  const audio=makeSound({state:'interrupted'});
  audio.sound.event({type:'towerDown'});
  audio.sound.event({type:'attackRelease',style:'lightning',attacker:{card:CARDS.pikachu},from:{x:300},shot:0});
  assert.equal(audio.trace.length,0);
});

test('the ambush gives one voice at impact and no duplicate voices for its three tokens',()=>{
  const row=spellScene('sneaselAmbush');
  assert.equal(row.outputs.filter(output=>output.sample==='cries:215').length,1);
  assert.equal(row.events.filter(event=>event.type==='spawn'&&event.at>0).length,3);
});

test('death explosions have an audible event independent of a previous attack',()=>{
  const row=featureScene('golem','death');
  assert.ok(row.events.some(event=>event.type==='deathBurst'));
  assert.ok(row.outputs.length,'Golem death damage needs its own explosion cue');
  assert.equal(row.outputs.filter(output=>output.sample.startsWith('cries:')).length,0,'A death effect must not add a character voice');
});

test('voice concurrency stays bounded and rapid same-species deploys do not stack copies',()=>{
  const audio=makeSound();
  for(const id of[25,25,6,215,356,112])audio.sound.cry(id,300);
  const voices=audio.trace.filter(output=>output.sample.startsWith('cries:'));
  assert.equal(voices.filter(output=>output.sample==='cries:25').length,1);
  assert.ok(voices.length<=3);
});

test('a full-arena mixed burst has a global output budget',()=>{
  const audio=makeSound(),families=[...new Map(Object.entries(CARDS).filter(([,card])=>!card.spell&&!card.passive).map(([key,card])=>[card.style,{key,card}])).values()];
  // At most 156 attacking bodies, below the engine's 160-body ceiling. Check
  // the exported production policy instead of fixing a second budget here.
  for(let burst=0;burst<6;burst++)for(const[index,{key,card}]of families.entries())audio.event({type:'attackRelease',key,style:card.style,attacker:{id:burst*families.length+index+1,card},from:{x:burst%2?120:480},shot:burst%3},10+burst*.04);
  const peak=Math.max(0,...audio.trace.map(({at})=>audio.trace.filter(output=>output.at<=at&&output.at+output.duration>at).length));
  assert.ok(peak>0&&peak<=MAX_EFFECT_VOICES,`The ${MAX_EFFECT_VOICES}-voice FX budget produced ${peak} concurrent output nodes for ${families.length*6} attacks`);
});

test('character voices keep their priority when the FX budget is full',()=>{
  const audio=makeSound();
  for(let i=0;i<MAX_EFFECT_VOICES+10;i++)audio.sound.noise(.5,1000,.02);
  const fx=audio.trace.length;assert.equal(fx,MAX_EFFECT_VOICES);
  audio.sound.cry(25,300);
  assert.equal(audio.trace.filter(output=>output.sample==='cries:25').length,1);
  assert.equal(audio.trace.filter(output=>!output.sample.startsWith('cries:')).length,MAX_EFFECT_VOICES);
});

test('finished output nodes release their FX slots for later effects',()=>{
  const audio=makeSound();
  for(let i=0;i<MAX_EFFECT_VOICES;i++)audio.sound.noise(.1,1000,.02);
  const before=audio.trace.length;audio.ctx.currentTime=11;audio.sound.noise(.1,1000,.02);
  assert.equal(audio.trace.length,before+1);
});

test('entry effects and transformation retain cues from their real engine events',()=>{
  for(const[key,feature]of[['pikachu','entry'],['slowbro','entry'],['ditto','transform']]){
    const row=featureScene(key,feature);
    assert.ok(row.events.some(event=>event.type===feature),`${key} must emit ${feature}`);
    assert.ok(row.outputs.length,`${key} ${feature} must remain audible`);
  }
});

test('reflection is audible without adding character voices',()=>{
  for(const key of['wobbuffet','aggron']){
    const row=featureScene(key,'counter');
    assert.ok(row.events.some(event=>event.type==='counter'),key);
    assert.ok(row.outputs.length,`${key} reflection needs a short cue`);
    assert.equal(row.outputs.filter(output=>output.sample.startsWith('cries:')).length,0);
  }
});

test('a group heal coalesces locally while preserving the other lane',()=>{
  const audio=makeSound();
  const left=audio.event({type:'heal',unit:{x:180}},10);
  const sameGroup=audio.event({type:'heal',unit:{x:190}},10);
  const right=audio.event({type:'heal',unit:{x:480}},10);
  assert.ok(left.length&&right.length);assert.equal(sameGroup.length,0);
  assert.ok([...left,...right].every(output=>output.volume<=.12&&output.duration<=.3));
});

test('archer, princess, dart and magic-arrow releases differ from their actual delayed contacts',()=>{
  const signatures=[];
  for(const key of ['treecko','roselia','nuzleaf','alakazam']){
    const scene=attackScene(key,{distance:60}),release=scene.events.find(e=>e.type==='attackRelease'),impact=scene.events.find(e=>e.type==='hit');
    assert.ok(release?.outputs.length&&impact?.outputs.length,key+' has release and impact feedback');
    assert.ok(impact.at>release.at,key+' impact follows the projectile');
    assert.ok(scene.events.filter(e=>e.type==='attackStart').every(e=>e.outputs.length===0),'preparation must not play a release early');
    assert.ok(release.outputs.every(o=>o.delay>=0&&o.delay<=.01));
    assert.ok(!release.outputs.some(o=>o.sample==='foley:heavy'),'a light projectile does not sound like a heavy collision at launch');
    const signature=outputs=>JSON.stringify(outputs.map(o=>[o.sample,o.volume,o.duration,o.frequency]));
    assert.notEqual(signature(release.outputs),signature(impact.outputs),key+' has a distinct contact');signatures.push(signature(release.outputs));
  }
  assert.equal(new Set(signatures).size,4,'the four projectile families retain distinct cues');
});

test('spell launch feedback follows cast preparation and does not stand in for the impact',()=>{
  for(const key of ['fireball','pinMissile','hyperBeam','thunder']){
    const scene=spellScene(key),cast=scene.events.find(e=>e.type==='cast'),hit=scene.events.find(e=>e.type==='spellHit');
    assert.ok(cast.outputs.length&&hit.outputs.length,key);
    assert.ok(cast.outputs.every(o=>Math.abs(o.delay-CARDS[key].castDelay)<1e-6),key+' respects the launch preparation');
    assert.ok(hit.at>=cast.at+CARDS[key].castDelay);
  }
});

test('Tesla emerge and conceal feedback is short, distinct and remains silent when muted',()=>{
  const sound=makeSound(),unit={x:180},up=sound.event({type:'burrow',unit,hidden:false},10),down=sound.event({type:'burrow',unit,hidden:true},11);
  assert.ok(up.length&&down.length);assert.notDeepEqual(up.map(o=>o.frequency),down.map(o=>o.frequency));
  assert.ok([...up,...down].every(o=>o.volume<=.025&&o.duration<=.14));
  sound.sound.setEnabled(false);const before=sound.trace.length;sound.event({type:'burrow',unit,hidden:false},12);sound.event({type:'cast',key:'fireball',x:180},12);assert.equal(sound.trace.length,before);
});

test('nearby archers retain independent releases and only the same action is coalesced',()=>{
  for(const positions of [[327,340],[297,310]]){
    const sound=makeSound(),packet=(id,x)=>({type:'attackRelease',key:'treecko',attacker:{id,attackSeq:3,card:CARDS.treecko},from:{x},shot:0});
    const a=sound.event(packet(11,positions[0]),10),b=sound.event(packet(12,positions[1]),10),duplicate=sound.event(packet(11,positions[0]),10);
    assert.ok(a.length&&b.length,'world-coordinate bucket boundaries must not silence the second archer');assert.equal(duplicate.length,0);
  }
});

test('rejected generic impacts are absent from every recorded and loading-fallback route',()=>{
  for(const buffered of [true,false]){
    for(const key of Object.keys(CARDS).filter(key=>!CARDS[key].spell&&!CARDS[key].passive&&CARDS[key].damage>0)){
      const scene=attackScene(key,{buffered});
      assert.ok(scene.outputs.every(o=>!/^foley:(heavy|punch-[123])$/.test(o.sample)),key);
      assert.ok(scene.outputs.every(o=>!o.frequency.some(f=>f.kind==='set'&&[94,155,174,193,48].includes(f.value))),key+' must not restore the old generic drum fallback');
    }
  }
});
