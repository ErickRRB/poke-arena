import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ATTACK_AUDIO,attackCue,prepareSample,installAttackFallbacks} from '../dist/attack-audio.js';
import {FALLBACK_PCM} from '../dist/attack-audio-fallback.js';
import {CARDS} from '../dist/engine.js?v=34';

const json=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
const manifest=json('dist/assets/audio/manifest.json');
const provenance=json('dist/assets/audio/clean-v1/SOURCES.json');
const fallback=json('dist/assets/audio/clean-v1/FALLBACK-SOURCES.json');
const retired=json('docs/audio-clean-2026-11-15/retired-pack.json');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const context={createBuffer(channels,length,sampleRate){
 const data=Array.from({length:channels},()=>new Float32Array(length));
 return{numberOfChannels:channels,length,sampleRate,duration:length/sampleRate,getChannelData:ch=>data[ch]};
}};

test('the new bank has pinned CC0 sources and genuine PCM16 at native 48kHz',()=>{
 assert.equal(Object.keys(manifest.cries).length,108);
 assert.equal(provenance.sources.length,26);
 assert.equal(provenance.archive.sha256,'11891df177ed5f74bcf6798e149733258e5550dc1a4951af323bbf66be30cd47');
 assert.equal(provenance.license,'CC0-1.0');
 assert.deepEqual(new Set(provenance.sources.map(row=>row.sourceId)),new Set(['s02','s06','s07','s08']));
 assert.equal(provenance.files.length,Object.keys(manifest.moves).length);
 for(const row of provenance.files){
  assert.equal(manifest.moves[row.key],row.path);
  const bytes=readFileSync(new URL('../dist/'+row.path,import.meta.url));
  assert.equal(sha(bytes),row.sha256,row.key);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.readUInt16LE(20),1);
  assert.equal(bytes.readUInt16LE(22),2);
  assert.equal(bytes.readUInt32LE(24),48000);
  assert.equal(bytes.readUInt16LE(34),16);
  assert.equal(row.rate,provenance.sources.find(source=>source.key===row.sourceKey).rate);
  assert.ok(!retired.files.some(old=>old.sha256===row.sha256));
 }
 for(const row of retired.files)assert.equal(existsSync(new URL('../dist/'+row.path,import.meta.url)),false,row.path);
 const importer=readFileSync(new URL('../scripts/import-pokemon-audio.mjs',import.meta.url),'utf8');
 assert.match(importer,/import-clean-audio/);assert.doesNotMatch(importer,/fetch\(/);
});

test('every attacker has a clean contact; quiet melee explicitly omits a launch',()=>{
 for(const card of Object.values(CARDS).filter(card=>!card.spell&&!card.passive&&card.damage>0)){
  const cue=ATTACK_AUDIO[attackCue(card,card.style)];assert.ok(cue,card.name);
  assert.ok(cue.contact.length,card.name);
 }
 for(const [family,cue] of Object.entries(ATTACK_AUDIO)){
  assert.ok(FALLBACK_PCM[cue.fallback],family);
  for(const phase of ['release','contact'])for(const key of cue[phase])assert.ok(manifest.moves[key],family+':'+phase+':'+key);
  assert.ok(cue.volume>0&&cue.volume<=.3);
 }
 for(const family of ['punch','body','slam','horn','bite','slash'])assert.deepEqual(ATTACK_AUDIO[family].release,[]);
 assert.equal(attackCue({id:50,style:'slash'}),'punch');
});

test('cold/failure PCM is sourced from the new recordings at 48kHz/16bit',()=>{
 const buffers=new Map();installAttackFallbacks(context,buffers);
 for(const row of fallback.excerpts){
  const encoded=FALLBACK_PCM[row.key],bytes=Buffer.from(encoded.data,'base64');
  assert.equal(encoded.rate,48000);assert.equal(encoded.bits,16);assert.equal(encoded.channels,1);
  assert.equal(sha(bytes),row.pcmSha256);assert.equal(bytes.length,row.frames*2);
  assert.ok(provenance.files.some(file=>file.sha256===row.clipSha256));
  const buffer=buffers.get('fallback:'+row.key);
  assert.ok(buffer?.duration>0&&buffer.duration<=.65);
  assert.ok([...buffer.getChannelData(0)].every(Number.isFinite));
 }
 const first=buffers.get('fallback:punch-medium-1');installAttackFallbacks(context,buffers);
 assert.equal(buffers.get('fallback:punch-medium-1'),first);
});

test('a cold phase prepares only its requested fallback and reuses it on the next attack',()=>{
 const buffers=new Map();installAttackFallbacks(context,buffers,'air-flight-a');assert.equal(buffers.size,1);const first=buffers.get('fallback:air-flight-a');assert.ok(first);
 installAttackFallbacks(context,buffers,'air-flight-a');assert.equal(buffers.size,1);assert.equal(buffers.get('fallback:air-flight-a'),first);
 installAttackFallbacks(context,buffers,'punch-medium-1');assert.equal(buffers.size,2);assert.ok(buffers.has('fallback:punch-medium-1'));
 installAttackFallbacks(context,buffers,'missing-phase');assert.equal(buffers.size,2);
});

test('normalization measures the retained recording and never raises quiet SFX',()=>{
 const input=context.createBuffer(2,480000,48000);
 for(let ch=0;ch<2;ch++){
  input.getChannelData(ch).fill(.00004);
  input.getChannelData(ch).fill(.2,240000,244800);
 }
 const output=prepareSample(context,input,true);let energy=0;
 for(let ch=0;ch<2;ch++)for(const value of output.getChannelData(ch))energy+=value*value;
 assert.ok(output.length<input.length);
 assert.ok(Math.abs(Math.sqrt(energy/(output.length*2))-.09)<1e-8);
 const quiet=context.createBuffer(1,1000,48000);quiet.getChannelData(0).fill(.001);
 prepareSample(context,quiet,true);assert.ok(Math.abs(quiet.getChannelData(0)[500]-.001)<1e-9);
 const silent=context.createBuffer(1,1000,48000);assert.equal(prepareSample(context,silent,true),silent);
});
test('cold release and contact use their own phase recordings, without inventing silent launches',()=>{
 for(const [name,cue] of Object.entries(ATTACK_AUDIO)){
  assert.ok(FALLBACK_PCM[cue.contactFallback],name+' contact');
  if(!cue.release.length){assert.equal(cue.releaseFallback,undefined,name);continue;}
  assert.ok(FALLBACK_PCM[cue.releaseFallback],name+' release');
  assert.ok(!cue.contact.includes(cue.releaseFallback),name+' distinct phases');
 }
});
