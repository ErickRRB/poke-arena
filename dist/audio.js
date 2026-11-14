// Recorded Pokémon moves follow release/contact events, including cold-load fallbacks.
import { BattleMusic } from './music.js?v=26';
import { CARDS } from './engine.js?v=26';
export const MAX_EFFECT_VOICES=24;
import {ATTACK_AUDIO,soundStyle,attackCue,prepareSample,installAttackFallbacks} from './attack-audio.js?v=1';
export class SoundSystem {
  constructor(enabled = true) { this.enabled=enabled;this.ctx=null;this.last=new Map();this.encoded=new Map();this.buffers=new Map();this.voiceSlots=[];this.effectSlots=[];this.battlePlaying=false;this.intense=false;this.ready=this.preload().catch(()=>false); }
  async preload(){
    const response=await fetch('assets/audio/manifest.json?v=33');if(!response.ok)throw Error('Audio manifest unavailable');
    const manifest=await response.json();
    const results=await Promise.allSettled(Object.entries(manifest).flatMap(([group,entries])=>Object.entries(entries).map(async([id,file])=>{const r=await fetch(file);if(!r.ok)throw Error(`Audio unavailable: ${file}`);this.encoded.set(`${group}:${id}`,await r.arrayBuffer());})));
    this.failedAssets=results.filter(result=>result.status==='rejected').length;
    this.bytesReady=true;if(this.ctx)await this.decodeSamples();return this.failedAssets===0;
  }
  decodeSamples(){
    if(!this.ctx||!this.bytesReady)return;
    const ctx=this.ctx;
    this.decoded||=Promise.allSettled([...this.encoded].filter(([key])=>!this.buffers.has(key)).map(async([key,bytes])=>{
      const buffer=await ctx.decodeAudioData(bytes.slice(0));
      this.buffers.set(key,prepareSample(ctx,buffer,key.startsWith('moves:')));
    }));
    this.decoded.catch(()=>{});return this.decoded;
  }
  syncMusic(){if(this.music){this.music.intense=this.intense;this.music.setPlaying(this.battlePlaying&&this.enabled&&!this.needsRebuild&&this.ctx.state==='running');}}
  discardContext(){
    clearTimeout(this.recoveryTimer);this.music?.setPlaying(false);
    const previous=this.ctx;if(previous){previous.onstatechange=null;try{previous.close()?.catch(()=>{});}catch{}}
    this.ctx=null;this.master=null;this.music=null;this.noiseBuffer=null;this.decoded=null;this.resumePending=null;this.needsRebuild=false;this.last.clear();this.recentEffects=[];this.voiceSlots=[];this.effectSlots=[];
  }
  watchRecovery(ctx){
    clearTimeout(this.recoveryTimer);const time=ctx.currentTime;
    this.recoveryTimer=setTimeout(()=>{
      if(this.ctx!==ctx||!this.enabled||document.hidden)return;
      if(ctx.state!=='running'||ctx.currentTime<=time+.01){this.needsRebuild=true;this.music?.setPlaying(false);}
    },500);
  }
  recover(){if(!this.enabled||!this.ctx||document.hidden)return;this.music?.setPlaying(false);this.unlock();if(this.ctx)this.watchRecovery(this.ctx);}
  unlock(userGesture=false) {
    if(!this.enabled)return;
    try{
      if(this.ctx&&(this.ctx.state==='closed'||this.needsRebuild||userGesture&&this.resumePending===this.ctx&&this.ctx.state!=='running'))this.discardContext();
      if(!this.ctx){
        this.ctx=new(window.AudioContext||window.webkitAudioContext)();
        this.master=this.ctx.createGain();this.master.gain.value=.7;
        const compressor=this.ctx.createDynamicsCompressor();compressor.threshold.value=-18;compressor.ratio.value=5;
        this.master.connect(compressor);compressor.connect(this.ctx.destination);
        this.music=new BattleMusic(this.ctx,this.master);
        this.decodeSamples();
        const ctx=this.ctx;ctx.onstatechange=()=>{if(this.ctx===ctx)this.syncMusic();};
      }
      const ctx=this.ctx;
      if(ctx.state!=='running'){
        this.resumePending=ctx;
        Promise.resolve(ctx.resume()).then(()=>{if(this.ctx===ctx){this.resumePending=null;this.syncMusic();}}).catch(()=>{if(this.ctx===ctx)this.needsRebuild=true;});
        this.watchRecovery(ctx);
      }
      this.syncMusic();
    }catch{this.discardContext();}
  }
  setEnabled(value) { this.enabled=value;if(this.master&&this.ctx.state!=='closed')this.master.gain.setTargetAtTime(value?.7:0,this.ctx.currentTime,.02);if(value)this.unlock();else{clearTimeout(this.recoveryTimer);this.music?.setPlaying(false);} }
  setBattleState(playing,intense=false){this.battlePlaying=!!playing;this.intense=intense;this.syncMusic();}
  resetMusic(){this.music?.reset();}
  sample(key,x=300,{volume=.25,rate=1,maxDuration=.65,reverse=false,delay=0}={}){
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return false;
    let buffer=this.buffers.get(key);if(!buffer)return false;
    if(reverse){const reversedKey=`reversed:${key}`;if(!this.buffers.has(reversedKey)){const length=Math.min(buffer.length,Math.round(buffer.sampleRate*.65)),reversed=this.ctx.createBuffer(buffer.numberOfChannels,length,buffer.sampleRate);for(let ch=0;ch<buffer.numberOfChannels;ch++)reversed.getChannelData(ch).set(buffer.getChannelData(ch).slice(0,length).reverse());this.buffers.set(reversedKey,reversed);}buffer=this.buffers.get(reversedKey);}
    const source=this.ctx.createBufferSource();source.buffer=buffer;source.playbackRate.value=rate;
    const duration=Math.min(maxDuration,buffer.duration/rate),pan=Math.max(-.65,Math.min(.65,(x-300)/400));
    const voice=key.startsWith('cries:'),now=this.output(source,volume,duration,pan,delay,voice,!voice);if(now===null)return false;source.start(now);source.stop(now+duration+.015);return true;
  }
  cry(id,x=300){
    if(!id||!this.enabled||!this.ctx)return;
    const now=this.ctx.currentTime,key=`cry:${id}`;this.voiceSlots=this.voiceSlots.filter(t=>t>now);
    if(this.voiceSlots.length>=3||now-(this.last.get(key)??-100)<.6)return;
    if(this.sample(`cries:${id}`,x,{volume:.22,maxDuration:2.5})){this.last.set(key,now);this.voiceSlots.push(now+Math.min(2.5,this.buffers.get(`cries:${id}`).duration));}
  }
  recorded(style,x,impact,shot=0,id=0,options={}){
    const cue=ATTACK_AUDIO[soundStyle(style)]||ATTACK_AUDIO.punch,keys=impact?cue.contact:cue.release;
    const key=keys[Math.abs((Number(shot)||0)+(Number(id)||0))%keys.length];
    const settings={volume:impact?cue.volume:cue.volume*.8,maxDuration:impact?cue.contactTime:cue.releaseTime,...options};
    if(this.sample('moves:'+key,x,settings))return true;
    // Small original-move PCM clips ship with the code. No network, codec or
    // unrelated Foley/synth fallback is needed for a cold or failed download.
    installAttackFallbacks(this.ctx,this.buffers);
    return this.sample('fallback:'+cue.fallback,x,settings);
  }
  output(node,volume,duration,pan=0,delay=0,voice=false,recording=false) {
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return null;
    this.effectSlots=(this.effectSlots||[]).filter(end=>end>this.ctx.currentTime);
    if(!voice&&this.effectSlots.length>=MAX_EFFECT_VOICES)return null;
    const now=this.ctx.currentTime+delay,gain=this.ctx.createGain();if(!voice)this.effectSlots.push(now+duration+.015);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.006);
    if(recording)gain.gain.setValueAtTime(volume,now+Math.max(.006,duration-.045));
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    node.connect(gain);
    if(this.ctx.createStereoPanner){const stereo=this.ctx.createStereoPanner();stereo.pan.value=pan;gain.connect(stereo);stereo.connect(this.master);}else gain.connect(this.master);
    return now;
  }
  tone(freq,duration=.1,wave='sine',volume=.04,slide=0,pan=0,delay=0) {
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    const oscillator=this.ctx.createOscillator();oscillator.type=wave;
    const now=this.output(oscillator,volume,duration,pan,delay);if(now===null)return false;oscillator.frequency.setValueAtTime(freq,now);
    if(slide)oscillator.frequency.exponentialRampToValueAtTime(Math.max(25,freq+slide),now+duration);
    oscillator.start(now);oscillator.stop(now+duration+.01);return true;
  }
  play(style,x=300,impact=false,shot=0,id=0,action=null,options={}) {
    style=soundStyle(style);
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    const now=this.ctx.currentTime;
    this.recentEffects=(this.recentEffects||[]).filter(e=>now>=e.at&&now-e.at<.035);
    if(this.recentEffects.some(e=>e.style===style&&e.impact===impact&&(action?e.action===action:!e.action&&Math.abs(e.x-x)<48)))return;
    this.recentEffects.push({style,impact,action,x,at:now});
    return this.recorded(style,x,impact,shot,id,options);
  }
  event(e) {
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    if(e.type==='dashWindup')this.play('wind',e.unit.x,false,0,0,null,{volume:.045,maxDuration:.2});
    if(e.type==='dashStart')this.play('dash',e.from.x);
    if(e.type==='entry')this.play(e.style,e.x,true,0,e.unit.card.id);
    if(e.type==='transform')this.play('shadow',e.unit.x);
    if(e.type==='attackRelease'){
      const profile=e.attacker.card||e.attacker.guard,seq=e.attacker.attackSeq||0;
      this.play(attackCue(profile,e.style),e.from.x,false,(e.shot||0)+seq,profile?.id,e.attacker.id?e.attacker.id+':'+seq+':'+(e.shot||0):null);
    }
    if(e.type==='hit')this.play(attackCue(CARDS[e.key],e.style),e.x,true,e.attackSeq||0,CARDS[e.key]?.id,e.attackId||e.sourceId&&e.sourceId+':'+(e.attackSeq||0));
    if(e.type==='beam'&&!e.shot)this.play(e.style,e.to.x,true,e.attackSeq||0,CARDS[e.key]?.id,e.sourceId&&e.sourceId+':'+(e.attackSeq||0));
    if(e.type==='deathBurst')this.play(e.unit.key==='golem'?'explosion':e.style||e.unit.card.style,e.unit.x,true,0,e.unit.card.id);
    if(e.type==='heal')this.play('heal',e.unit.x,true);
    if(e.type==='counter')this.play('magnet',e.unit?.x||e.from.x,true);
    if(e.type==='blink')this.play('shadow',e.from.x);
    if(e.type==='leap')this.play('dash',e.unit.x);
    if(e.type==='burrow')this.play(e.hidden?'shadow':'lightning',e.unit.x,false,0,0,null,{volume:.025,maxDuration:.12});
    if(e.type==='deploy'&&CARDS[e.key]?.id)this.cry(CARDS[e.key].id,e.x);
    if(e.type==='cast'){
      const style={sneaselAmbush:'wind',log:'rock',fireball:'flame',pinMissile:'volley',lightning:'lightning',thunder:'lightning'}[e.key]||soundStyle(CARDS[e.key]?.style)||'aura';
      const delay=e.key==='log'?0:Math.max(0,e.castDelay??CARDS[e.key]?.castDelay??.4);
      this.play(style,e.x,false,0,0,null,{delay});
    }
    if(e.type==='structureDown'||e.type==='towerDown')this.play('explosion',e.x||300,true,0,0,null,{volume:.24,maxDuration:.45});
    if(e.type==='spellHit'){
      const style={pinMissile:'volley',lightning:'lightning',hyperBeam:'aura',blizzard:'ice',spikes:'rock',stealthRock:'rock',whirlpool:'hydro',nightmare:'shadow',sneaselAmbush:'shadow',log:'rock',earthquake:'slam',thunder:'lightning',fireball:'flame'}[e.key]||soundStyle(CARDS[e.key]?.style)||'ember';
      this.play(style,e.x,true);
      if(e.key==='sneaselAmbush')this.cry(215,e.x);
    }
    if(e.type==='step'&&e.unit.key==='snorlax'){
      const now=this.ctx.currentTime;if(now-(this.last.get('step')??-1)>.25){this.last.set('step',now);this.sample('moves:stomp',e.unit.x,{volume:.035,maxDuration:.12});}
    }
  }
}
