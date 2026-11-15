// Recorded combat cues follow real release/contact events, including cold loads.
import { BattleMusic } from './music.js?v=36';
import { CARDS } from './engine.js?v=34';
import {publicAssetUrl} from './online-config.js?v=36';
export const MAX_EFFECT_VOICES=12;
// Leave room for the orchestral bed in dense fights without changing cue
// priorities, phase balance or the separate voice and interface buses.
export const AUDIO_LEVELS=Object.freeze({master:.8,effects:.65*10**(-3/20),voices:.7,ui:.55,music:.65});
import {ATTACK_AUDIO,soundStyle,attackCue,prepareSample,installAttackFallbacks} from './attack-audio.js?v=36';
export class SoundSystem {
  constructor(enabled = true) { this.enabled=enabled;this.ctx=null;this.last=new Map();this.encoded=new Map();this.buffers=new Map();this.voiceSlots=[];this.effectSlots=[];this.battlePlaying=false;this.intense=false;this.ready=this.preload().catch(()=>false); }
  async preload(){
    const response=await fetch(publicAssetUrl('assets/audio/manifest.json?v=36'),{credentials:'omit'});if(!response.ok)throw Error('Audio manifest unavailable');
    const manifest=await response.json();
    const results=await Promise.allSettled(Object.entries(manifest).filter(([group])=>['cries','moves'].includes(group)).flatMap(([group,entries])=>Object.entries(entries).map(async([id,file])=>{const r=await fetch(publicAssetUrl(file),{credentials:'omit'});if(!r.ok)throw Error(`Audio unavailable: ${file}`);this.encoded.set(`${group}:${id}`,await r.arrayBuffer());})));
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
  createMixGraph(){
    const ctx=this.ctx;this.master=ctx.createGain();this.master.gain.value=this.enabled?AUDIO_LEVELS.master:0;
    // The ceiling only catches exceptional peaks. Music no longer goes through
    // the old shared-18dB compressor whenever an army attacks.
    this.limiter=ctx.createDynamicsCompressor();
    for(const[key,value]of Object.entries({threshold:-1,knee:0,ratio:20,attack:.003,release:.12}))if(this.limiter[key])this.limiter[key].value=value;
    this.master.connect(this.limiter);this.limiter.connect(ctx.destination);
    for(const[name,level]of Object.entries({effects:AUDIO_LEVELS.effects,voices:AUDIO_LEVELS.voices,ui:AUDIO_LEVELS.ui,music:AUDIO_LEVELS.music})){const bus=ctx.createGain();bus.gain.value=level;bus.connect(this.master);this[name+'Bus']=bus;}
  }
  clearEffects(){
    const now=this.ctx?.currentTime||0;
    for(const slot of this.activeEffects||[]){try{slot.gain.gain.cancelScheduledValues(now);slot.gain.gain.setTargetAtTime(.0001,now,.008);slot.node.stop(now+.035);}catch{}}
    this.activeEffects=[];this.effectSlots=[];this.recentEffects=[];this.voiceSlots=[];
  }
  discardContext(){
    clearTimeout(this.recoveryTimer);this.musicState=this.music?.snapshot?.()??this.musicState;
    if(this.music?.dispose)this.music.dispose();else this.music?.setPlaying(false);this.clearEffects();
    const previous=this.ctx;if(previous){previous.onstatechange=null;try{previous.close()?.catch(()=>{});}catch{}}
    this.ctx=null;this.master=null;this.music=null;this.limiter=null;this.effectsBus=null;this.voicesBus=null;this.uiBus=null;this.musicBus=null;this.decoded=null;this.resumePending=null;this.needsRebuild=false;this.last.clear();this.recentEffects=[];this.voiceSlots=[];this.effectSlots=[];
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
        this.createMixGraph();
        this.music=new BattleMusic(this.ctx,this.musicBus);this.music.restore?.(this.musicState);
        this.decodeSamples();
        const ctx=this.ctx;ctx.onstatechange=()=>{if(this.ctx===ctx)this.syncMusic();};
      }
      const ctx=this.ctx;
      if(ctx.state!=='running'){
        this.resumePending=ctx;
        Promise.resolve(ctx.resume()).then(()=>{if(this.ctx===ctx){this.resumePending=null;this.syncMusic();}}).catch(()=>{if(this.ctx===ctx)this.needsRebuild=true;});
        this.watchRecovery(ctx);
      }
      if(userGesture)this.music?.userGesture?.();
      this.syncMusic();
    }catch{this.discardContext();}
  }
  setEnabled(value) { this.enabled=value;if(this.master&&this.ctx.state!=='closed')this.master.gain.setTargetAtTime(value?AUDIO_LEVELS.master:0,this.ctx.currentTime,.02);if(value)this.unlock();else{clearTimeout(this.recoveryTimer);this.clearEffects();this.music?.setPlaying(false);} }
  setBattleState(playing,intense=false){if(this.battlePlaying&&!playing)this.clearEffects();this.battlePlaying=!!playing;this.intense=intense;this.syncMusic();}
  resetMusic(){this.musicState=null;this.music?.reset();}
  sample(key,x=300,{volume=.25,rate=1,maxDuration=Infinity,reverse=false,delay=0,priority=1}={}){
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return false;
    let buffer=this.buffers.get(key);if(!buffer)return false;
    if(reverse){const reversedKey=`reversed:${key}`;if(!this.buffers.has(reversedKey)){const length=Math.min(buffer.length,Math.round(buffer.sampleRate*.65)),reversed=this.ctx.createBuffer(buffer.numberOfChannels,length,buffer.sampleRate);for(let ch=0;ch<buffer.numberOfChannels;ch++)reversed.getChannelData(ch).set(buffer.getChannelData(ch).slice(0,length).reverse());this.buffers.set(reversedKey,reversed);}buffer=this.buffers.get(reversedKey);}
    const source=this.ctx.createBufferSource();source.buffer=buffer;source.playbackRate.value=rate;
    const duration=Math.min(maxDuration,buffer.duration/rate),pan=Math.max(-.65,Math.min(.65,(x-300)/400));
    const voice=key.startsWith('cries:'),now=this.output(source,volume,duration,pan,delay,voice,!voice,priority);if(now===null)return false;source.start(now);source.stop(now+duration+.015);return true;
  }
  cry(id,x=300){
    if(!id||!this.enabled||!this.ctx)return;
    const now=this.ctx.currentTime,key=`cry:${id}`;this.voiceSlots=this.voiceSlots.filter(t=>t>now);
    if(this.voiceSlots.length>=3||now-(this.last.get(key)??-100)<.6)return;
    if(this.sample(`cries:${id}`,x,{volume:.22,maxDuration:2.5})){this.last.set(key,now);this.voiceSlots.push(now+Math.min(2.5,this.buffers.get(`cries:${id}`).duration));}
  }
  recorded(style,x,impact,shot=0,id=0,options={}){
    const cue=ATTACK_AUDIO[soundStyle(style)]||ATTACK_AUDIO.punch,keys=impact?cue.contact:cue.release;
    if(!keys.length)return false;
    const key=keys[Math.abs((Number(shot)||0)+(Number(id)||0))%keys.length];
    const settings={volume:impact?cue.volume:cue.releaseVolume??cue.volume*.55,maxDuration:impact?cue.contactTime:cue.releaseTime,priority:impact?2:1,...options};
    if(this.sample('moves:'+key,x,settings))return true;
    // The same clean phase has an embedded PCM excerpt for cold downloads.
    const fallback=(impact?cue.contactFallback:cue.releaseFallback)??cue.fallback;
    if(!fallback)return false;
    installAttackFallbacks(this.ctx,this.buffers,fallback);
    return this.sample('fallback:'+fallback,x,settings);
  }
  output(node,volume,duration,pan=0,delay=0,voice=false,recording=false,priority=1) {
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return null;
    const clock=this.ctx.currentTime;this.activeEffects=(this.activeEffects||[]).filter(slot=>slot.end>clock);
    const fx=this.activeEffects.filter(slot=>slot.recording&&!slot.voice),releases=fx.filter(slot=>slot.priority<2);
    if(!voice&&recording&&(fx.length>=MAX_EFFECT_VOICES||priority<2&&releases.length>=MAX_EFFECT_VOICES/2)){
      const replace=priority>1?releases.sort((a,b)=>a.start-b.start)[0]:null;if(!replace)return null;
      replace.gain.gain.cancelScheduledValues(clock);replace.gain.gain.setTargetAtTime(.0001,clock,.006);try{replace.node.stop(clock+.025);}catch{}this.activeEffects=this.activeEffects.filter(slot=>slot!==replace);
    }
    const now=clock+delay,gain=this.ctx.createGain(),destination=(voice?this.voicesBus:recording?this.effectsBus:this.uiBus)||this.master;
    const slot={node,gain,start:now,end:now+duration+.015,voice,recording,priority};this.activeEffects.push(slot);this.effectSlots=this.activeEffects.filter(slot=>slot.recording&&!slot.voice).map(slot=>slot.end);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.006);
    if(recording)gain.gain.setValueAtTime(volume,now+Math.max(.006,duration-.045));
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    node.connect(gain);
    let stereo;if(this.ctx.createStereoPanner){stereo=this.ctx.createStereoPanner();stereo.pan.value=pan;gain.connect(stereo);stereo.connect(destination);}else gain.connect(destination);
    node.onended=()=>{node.disconnect?.();gain.disconnect?.();stereo?.disconnect?.();this.activeEffects=this.activeEffects.filter(active=>active!==slot);};
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
    // A nearby squad shares an audible gesture. Keep two separate archers and
    // the opposite lane, rather than stacking fifteen identical transients.
    if(this.recentEffects.filter(e=>e.style===style&&e.impact===impact&&Math.abs(e.x-x)<60).length>=2)return;
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
    if(e.type==='beam'&&!e.shot&&!e.missed)this.play(e.style,e.to.x,true,e.hop??e.attackSeq??0,CARDS[e.key]?.id,e.attackId||e.sourceId&&e.sourceId+':'+(e.attackSeq||0));
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
    if(e.type==='structureDown'||e.type==='towerDown')this.play('explosion',e.x??e.unit?.x??e.tower?.x??300,true,0,0,null,{volume:.24});
    if(e.type==='spellHit'&&e.key!=='lightning'){
      const style={pinMissile:'volley',lightning:'lightning',hyperBeam:'aura',blizzard:'ice',spikes:'rock',stealthRock:'rock',whirlpool:'hydro',nightmare:'shadow',sneaselAmbush:'shadow',log:'rock',earthquake:'slam',thunder:'lightning',fireball:'flame'}[e.key]||soundStyle(CARDS[e.key]?.style)||'ember';
      this.play(style,e.x,true);
      if(e.key==='sneaselAmbush')this.cry(215,e.x);
    }
  }
}
