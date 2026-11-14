import {readFileSync} from 'node:fs';
import {SoundSystem} from '../../dist/audio.js';
import {Game,CARDS} from '../../dist/engine.js';

export const manifest=JSON.parse(readFileSync(new URL('../../dist/assets/audio/manifest.json',import.meta.url)));
const durations=new Map();
export function setNativeAudioMetadata(rows){durations.clear();for(const row of rows)durations.set(row.file,row.durationSeconds);}
const param=()=>({value:0,events:[],setValueAtTime(value,time){this.value=value;this.events.push({kind:'set',value,time});},linearRampToValueAtTime(value,time){this.value=value;this.events.push({kind:'linear',value,time});},exponentialRampToValueAtTime(value,time){this.value=value;this.events.push({kind:'exponential',value,time});},setTargetAtTime(value,time,constant){this.value=value;this.events.push({kind:'target',value,time,constant});},cancelScheduledValues(){}});
const node=(kind,onStart=()=>{},onStop=()=>{})=>({kind,gain:param(),frequency:param(),Q:param(),playbackRate:param(),pan:param(),connections:[],connect(other){this.connections.push(other);},disconnect(){},start(time){this.startedAt=time;onStart(this,time);},stop(time){this.stoppedAt=time;onStop(this,time);}});
function buffer(key,duration=.7,sampleRate=22050){
  const length=Math.ceil(duration*sampleRate);let data;
  return{key,duration,length,sampleRate,numberOfChannels:1,getChannelData(){return data??=new Float32Array(length);}};
}

// Captures the real sample selection, playback rate and output envelopes. It does
// not claim to reproduce browser mixing, perceived loudness or speaker output.
export function makeSound({buffered=true,enabled=true,state='running'}={}){
  const trace=[],sources=new Set();let clock=10,sound;
  const route=source=>{const found=[],seen=new Set(),visit=value=>{if(seen.has(value))return;seen.add(value);found.push(value);for(const next of value.connections)visit(next);};visit(source);return found;};
  const start=(source,time)=>{
    const graph=route(source),gain=graph.find(value=>value.kind==='gain'),panner=graph.find(value=>value.kind==='panner');
    if(!gain)throw Error('Audio source started without an output envelope');
    const end=gain.gain.events.findLast(event=>event.kind==='exponential')?.time??time;
    const key=[...sound.buffers].find(([,value])=>value===source.buffer)?.[0]||source.buffer?.key||source.kind;
    const entry={kind:graph.some(value=>value.kind==='noise')?'noise':source.kind,sample:key,volume:Math.max(0,...gain.gain.events.map(event=>event.value)),duration:Math.max(0,end-time),pan:panner?.pan.value||0,delay:time-clock,rate:source.playbackRate?.value||1,at:time,frequency:graph.find(value=>value.kind==='noise')?.frequency.events||source.frequency?.events||[]};
    source.record=entry;trace.push(entry);sources.add(source);
  };
  const stop=(source,time)=>{if(source.record)source.record.duration=Math.min(source.record.duration,Math.max(0,time-source.record.at));if(time<=clock&&!source.ended){source.ended=true;source.onended?.();sources.delete(source);}};
  const ctx={state,get currentTime(){return clock;},set currentTime(value){clock=value;for(const source of sources)if(source.stoppedAt<=value&&!source.ended){source.ended=true;source.onended?.();sources.delete(source);}},sampleRate:22050,createBufferSource:()=>node('sample',start,stop),createOscillator:()=>node('oscillator',start,stop),createBiquadFilter:()=>node('noise'),createGain:()=>node('gain'),createStereoPanner:()=>node('panner'),createBuffer:(channels,length,rate)=>buffer('generated',length/rate,rate)};
  class TestSound extends SoundSystem{preload(){return Promise.resolve(true);}}
  sound=Object.assign(new TestSound(enabled),{ctx,noiseBuffer:buffer('noise',1),master:node('master'),music:{playing:false,setPlaying(value){this.playing=value;}}});sound.master.gain.value=.7;
  if(buffered)for(const[group,entries]of Object.entries(manifest))for(const[id,file]of Object.entries(entries))sound.buffers.set(`${group}:${id}`,buffer(`${group}:${id}`,durations.get(file)||.7));
  return{sound,ctx,trace,event(event,time=ctx.currentTime){ctx.currentTime=time;const start=trace.length;sound.event(event);return trace.slice(start);}};
}

function summary(event){return Object.fromEntries(Object.entries({type:event.type,key:event.key,style:event.style,sourceKey:event.sourceKey,dot:event.dot,shot:event.shot,amount:event.amount}).filter(([,value])=>value!==undefined));}
function scene(buffered=true){
  const audio=makeSound({buffered}),events=[];let game;
  game=new Game({seed:37,tutorial:true,onEvent:event=>{const output=audio.event(event,10+(game?.elapsed||0));events.push({...summary(event),at:game?.elapsed||0,outputs:output});}});
  game.state='playing';game.aiEnabled=false;for(const tower of game.towers){tower.active=false;tower.hp=tower.maxHp=1e6;tower.damage=0;}
  return{game,audio,events};
}
export function attackScene(key,{buffered=true}={}){
  const card=CARDS[key],{game,audio,events}=scene(buffered);
  const actor=game.spawn(key,0,300,300,0);
  actor.card={...card,speed:0,copy:false};actor.cooldown=0;actor.entryPending=false;
  const target=card.building?game.towers.find(t=>t.team===1&&!t.king):game.spawn('snorlax',1,300,280,0);
  target.x=300;target.y=280;target.hp=target.maxHp=1e6;
  if(target.card)target.card={...target.card,passive:true,speed:0,damage:0,armor:0,reflect:0};
  actor.target=target;actor.engaged=true;game.face(actor,target);
  if(!card.jumpRange)game.attack(actor,target);
  for(let i=0;i<240;i++){
    game.step(1/60);
    if(events.some(event=>event.type==='damage'&&!event.dot&&event.sourceKey===key))break;
  }
  return{key,id:card.id,style:card.style,range:card.range,passive:!!card.passive,burst:card.burst||1,events,outputs:audio.trace};
}
export function spellScene(key,{buffered=true}={}){
  const card=CARDS[key],{game,audio,events}=scene(buffered),y=card.rolling?500:300;
  const target=game.spawn('snorlax',1,300,y-40,0);target.hp=target.maxHp=1e6;target.card={...target.card,passive:true,speed:0,damage:0};
  game.hands[0][0]=key;game.energy[0]=10;
  const result=game.deploy(0,0,300,y);
  if(!result.ok)throw Error(`Cannot cast ${key}: ${result.reason}`);
  for(let i=0;i<480;i++){game.step(1/60);if(game.spells.length===0&&game.elapsed>.05)break;}
  return{key,style:card.style||null,rolling:!!card.rolling,fieldDuration:card.fieldDuration||0,events,outputs:audio.trace};
}
export function singleEvent(event,{buffered=true}={}){const audio=makeSound({buffered});audio.event(event);return audio.trace;}
export function featureScene(key,feature,{buffered=true}={}){
  const {game,audio,events}=scene(buffered),actor=game.spawn(key,0,300,300,0);
  actor.card={...actor.card,speed:0};actor.entryPending=false;
  const target=game.spawn('snorlax',1,300,280,0);target.hp=target.maxHp=1e6;target.card={...target.card,passive:true,speed:0,armor:0,reflect:0};
  if(feature==='death')game.damage(actor,1e9,1);
  else if(feature==='ability'){game.energy[0]=10;game.activateAbility(0,actor.id);}
  else if(feature==='dot'){game.damage(target,1,0,{burn:actor.card.burn||1,burnKind:actor.card.burnKind||'fire',sourceId:actor.id,sourceKey:key});game.tickStatus(target,.5);}
  else if(feature==='field'){game.addField(target.x,target.y,0,actor.card.poisonField||actor.card.deathField||1,actor.id);game.stepFields(.5);}
  else if(feature==='heal'){target.team=0;target.hp-=100;game.healNearby(actor,50,150,true);}
  else if(feature==='counter')game.damage(actor,10,1,{sourceId:target.id,sourceKey:'snorlax'});
  else if(feature==='blink'){actor.blinkCooldown=0;game.blink(actor,target);}
  else if(feature==='entry'){actor.entryPending=true;game.step(1/60);}
  else if(feature==='burrow'){actor.burrowed=true;actor.burrowProgress=1;game.updateBurrows(1/60);}
  else if(feature==='transform')game.step(1/60);
  else if(feature==='summon'){game.spawnReinforcements(actor,actor.card.summon,actor.card.summonCount||1,0);game.step(.1);}
  return{key,feature,events,outputs:audio.trace};
}
export {CARDS,Game,SoundSystem};
