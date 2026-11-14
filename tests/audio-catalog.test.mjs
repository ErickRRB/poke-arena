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
  assert.ok(audio.trace.length,'The presence of punch-1 must not hide missing slash samples');
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

test('shield, healing fire and dash abilities use their own effect cues',()=>{
  const shield=featureScene('lugia','ability').outputs,fire=featureScene('hooh','ability').outputs,dash=featureScene('rayquaza','ability').outputs;
  assert.ok(shield.some(output=>output.sample==='foley:metal'));
  assert.equal(shield.some(output=>output.sample==='foley:water'),false);
  assert.ok(fire.some(output=>output.kind==='noise'));
  assert.equal(fire.some(output=>output.sample==='foley:punch-3'),false);
  assert.ok(dash.some(output=>output.sample==='foley:cloth'));
});
