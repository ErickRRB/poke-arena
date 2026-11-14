// Recorded foley and PokÃ©mon voices follow release/impact events; synthesis is a loading fallback.
import { BattleMusic } from './music.js?v=26';
import { CARDS } from './engine.js?v=26';
export const MAX_EFFECT_VOICES=24;
const soundStyle=style=>({powder:'leaf',poison:'confusion',egg:'rock',song:'confusion',eruption:'flame',horn:'punch',lick:'shadow'})[style]||style;
const ATTACK_CUES={Archer:'bow',Princess:'petalBow',BlowdartGoblin:'dart',EliteArcher:'magicArrow',Pekka:'rock',Giant:'body',Golem:'rock',Prince:'body',HogRider:'body'};
const attackCue=(profile,style)=>ATTACK_CUES[profile?.nativeReference]||style||profile?.style||'punch';
export class SoundSystem {
  constructor(enabled = true) { this.enabled=enabled;this.ctx=null;this.last=new Map();this.encoded=new Map();this.buffers=new Map();this.voiceSlots=[];this.effectSlots=[];this.battlePlaying=false;this.intense=false;this.ready=this.preload().catch(()=>false); }
  async preload(){
    const response=await fetch('assets/audio/manifest.json?v=29');if(!response.ok)throw Error('Audio manifest unavailable');
    const manifest=await response.json();
    const results=await Promise.allSettled(Object.entries(manifest).flatMap(([group,entries])=>Object.entries(entries).map(async([id,file])=>{const r=await fetch(file);if(!r.ok)throw Error(`Audio unavailable: ${file}`);this.encoded.set(`${group}:${id}`,await r.arrayBuffer());})));
    this.failedAssets=results.filter(result=>result.status==='rejected').length;
    this.bytesReady=true;if(this.ctx)await this.decodeSamples();return this.failedAssets===0;
  }
  decodeSamples(){
    if(!this.ctx||!this.bytesReady)return;
    const ctx=this.ctx;
    this.decoded||=Promise.allSettled([...this.encoded].filter(([key])=>!this.buffers.has(key)).map(async([key,bytes])=>{
      let buffer=await ctx.decodeAudioData(bytes.slice(0));let peak=0;
      for(let channel=0;channel<buffer.numberOfChannels;channel++){const data=buffer.getChannelData(channel);for(let i=0;i<data.length;i++)peak=Math.max(peak,Math.abs(data[i]));}
      const data=buffer.getChannelData(0),threshold=peak*.015;let first=0,last=data.length-1;
      while(first<last&&Math.abs(data[first])<threshold)first++;while(last>first&&Math.abs(data[last])<threshold)last--;
      first=Math.max(0,first-Math.round(buffer.sampleRate*.005));last=Math.min(data.length-1,last+Math.round(buffer.sampleRate*.025));
      if(first>0||last<data.length-1){const trimmed=ctx.createBuffer(buffer.numberOfChannels,last-first+1,buffer.sampleRate);for(let ch=0;ch<buffer.numberOfChannels;ch++)trimmed.getChannelData(ch).set(buffer.getChannelData(ch).subarray(first,last+1));buffer=trimmed;}
      const gain=peak>.01?.8/peak:1;
      for(let channel=0;channel<buffer.numberOfChannels;channel++){const data=buffer.getChannelData(channel);for(let i=0;i<data.length;i++)data[i]*=gain;}
      this.buffers.set(key,buffer);
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
        this.noiseBuffer=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate);
        const data=this.noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
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
    const now=this.output(source,volume,duration,pan,delay,key.startsWith('cries:'));if(now===null)return false;source.start(now);source.stop(now+duration+.015);return true;
  }
  cry(id,x=300){
    if(!id||!this.enabled||!this.ctx)return;
    const now=this.ctx.currentTime,key=`cry:${id}`;this.voiceSlots=this.voiceSlots.filter(t=>t>now);
    if(this.voiceSlots.length>=3||now-(this.last.get(key)??-100)<.6)return;
    if(this.sample(`cries:${id}`,x,{volume:.22,maxDuration:2.5})){this.last.set(key,now);this.voiceSlots.push(now+Math.min(2.5,this.buffers.get(`cries:${id}`).duration));}
  }
  recorded(style,x,impact,shot,id){
    style=soundStyle(style);
    if(id&&this.sample(`combat:${id}-${impact?'impact':'release'}`,x,{volume:impact?.19:.15,maxDuration:impact?.35:.55,rate:1+(shot%2)*.025}))return true;
    let played=false;
    const play=(key,options={})=>{const result=this.sample(`foley:${key}`,x,options);played=result||played;return result;},pan=Math.max(-.65,Math.min(.65,(x-300)/400));
    const feedback=(key,options={})=>{const result=this.sample(`feedback:${key}`,x,options);played=result||played;return result;};
    const noise=(...args)=>{played=this.noise(...args)||played;};
    if(['bow','petalBow','dart','magicArrow','volley'].includes(style)){
      if(impact){
        feedback(style==='petalBow'?'petal-rustle':'light-contact',{volume:style==='petalBow'?.14:.1,rate:style==='dart'?1.3:1,maxDuration:style==='petalBow'?.22:.11});
        if(style==='magicArrow')play('glass',{volume:.07,rate:1.4,maxDuration:.16});
      }else{
        feedback(style==='dart'?'dart-air':'bow-release',{volume:style==='dart'?.15:.18,maxDuration:style==='petalBow'?.35:.28});
        if(style==='petalBow')feedback('petal-rustle',{volume:.06,maxDuration:.2});
        if(style==='magicArrow')play('bell',{volume:.06,rate:1.6,maxDuration:.15});
      }
      return played;
    }
    if(style==='punch'||style==='body'){if(impact)feedback('body-contact',{volume:.14,maxDuration:.12});else play('cloth',{volume:.07,rate:1.2,maxDuration:.09});noise(impact?.045:.075,impact?1700:2600,impact?.025:.02,pan,'bandpass');}
    else if(style==='slam'||style==='rock'){if(impact)feedback('stone-crack',{volume:.19,maxDuration:.22});else play('cloth',{volume:.08,rate:.8,maxDuration:.12});noise(impact?.07:.09,impact?1400:2300,impact?.025:.018,pan,'bandpass');}
    else if(style==='bubble'){play('water',{volume:.21,rate:1.3+shot*.13,maxDuration:impact?.22:.17});}
    else if(style==='hydro'){play('water',{volume:.3,rate:.66,maxDuration:impact?.3:.46});noise(.18,1700,.025,pan);}
    else if(style==='ember'||style==='flame'){play('cloth',{volume:.17,rate:style==='flame'?.58:1.15,maxDuration:style==='flame'?.4:.18});noise(style==='flame'?.34:.16,style==='flame'?700:1900,.045,pan,'bandpass');}
    else if(style==='lightning'){play('metal',{volume:.09,rate:1.7,maxDuration:.16});for(let i=0;i<4;i++)noise(.025,3000-i*280,.055,pan,'bandpass',i*.035);}
    else if(style==='magnet'){play('metal',{volume:.25,rate:.72,maxDuration:.32});play('bell',{volume:.06,rate:1.6,maxDuration:.25});}
    else if(style==='ice'){play('glass',{volume:.28,rate:1.2,maxDuration:.42});noise(.1,3400,.02,pan);}
    else if(style==='coin'){play('coin',{volume:.2,rate:1.65,maxDuration:.28});}
    else if(style==='heal'){play('bell',{volume:.08,rate:1.5,maxDuration:.2});}
    else if(style==='slash'){play(shot%2?'swish-1':'swish-2',{volume:.28,rate:1.13,maxDuration:.25});}
    else if(style==='vine'||style==='leaf'){if(impact)feedback('petal-rustle',{volume:.1,maxDuration:.13});else play(style==='leaf'?'swish-2':'swish-1',{volume:.18,rate:style==='leaf'?1.5:.72,maxDuration:.22});}
    else if(style==='bite'){if(impact)feedback('bite-crunch',{volume:.14,maxDuration:.12});else play('swish-2',{volume:.08,rate:1.5,maxDuration:.085});noise(.045,3200,.025,pan,'highpass');}
    else if(style==='dash'){play(impact?'swish-2':'cloth',{volume:impact?.14:.12,rate:1.5,maxDuration:.14});noise(.055,2400,.02,pan,'bandpass');}
    else if(style==='shadow'){play('cloth',{volume:.2,rate:.7,reverse:true,maxDuration:.35});play('bell',{volume:.08,rate:.6,reverse:true,maxDuration:.4});}
    else if(['psychic','confusion','aura'].includes(style)){play('bell',{volume:style==='aura'?.18:.12,rate:style==='confusion'?1.1:style==='psychic'?.68:.45,reverse:!impact,maxDuration:style==='aura'?.7:.42});play('swish-1',{volume:.12,rate:.7,maxDuration:.3});}
    else return false;
    return played;
  }
  output(node,volume,duration,pan=0,delay=0,voice=false) {
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return null;
    this.effectSlots=(this.effectSlots||[]).filter(end=>end>this.ctx.currentTime);
    if(!voice&&this.effectSlots.length>=MAX_EFFECT_VOICES)return null;
    const now=this.ctx.currentTime+delay,gain=this.ctx.createGain();if(!voice)this.effectSlots.push(now+duration+.015);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
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
  noise(duration,freq,volume,pan=0,type='lowpass',delay=0) {
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter();source.buffer=this.noiseBuffer;
    filter.type=type;filter.frequency.setValueAtTime(freq,this.ctx.currentTime+delay);filter.frequency.exponentialRampToValueAtTime(Math.max(50,freq*.4),this.ctx.currentTime+delay+duration);filter.Q.value=type==='bandpass'?1.5:.7;
    source.connect(filter);const now=this.output(filter,volume,duration,pan,delay);if(now===null)return false;source.start(now);source.stop(now+duration+.01);return true;
  }
  play(style,x=300,impact=false,shot=0,id=0,action=null) {
    style=soundStyle(style);
    if(!this.enabled||!this.ctx)return;
    const now=this.ctx.currentTime;
    this.recentEffects=(this.recentEffects||[]).filter(e=>now>=e.at&&now-e.at<.035);
    if(this.recentEffects.some(e=>e.style===style&&e.impact===impact&&(action?e.action===action:!e.action&&Math.abs(e.x-x)<48)))return;
    this.recentEffects.push({style,impact,action,x,at:now});
    if(this.recorded(style,x,impact,shot,id))return;
    const pan=Math.max(-.65,Math.min(.65,(x-300)/400));
    if(['bow','petalBow','dart','magicArrow','volley'].includes(style)){
      if(impact){
        this.noise(style==='petalBow'?.2:.055,style==='magicArrow'?4200:2200,style==='petalBow'?.035:.025,pan,'bandpass');
        this.tone(style==='magicArrow'?1320:style==='dart'?970:480,style==='magicArrow'?.15:.055,'triangle',.025,style==='magicArrow'?180:-180,pan);
      }else{
        const dart=style==='dart',magic=style==='magicArrow',long=style==='petalBow'||style==='volley';
        this.noise(dart?.07:long?.2:.12,dart?3900:magic?4400:2800,dart?.04:.03,pan,'bandpass');
        this.tone(dart?1280:magic?850:680,dart?.045:.085,magic?'sine':'triangle',dart?.025:.04,dart?-750:magic?320:-360,pan);
        if(!dart)this.tone(magic?1280:310,long?.16:.11,'sine',.025,magic?200:-90,pan,.008);
      }
    }else if(style==='body'){
      this.noise(impact?.055:.08,impact?1700:2600,impact?.035:.02,pan,'bandpass');
    }else if(style==='lightning'){
      this.noise(.15,2600,.045,pan,'bandpass');this.tone(850,.16,'sawtooth',.018,-570,pan);this.tone(1350,.08,'square',.009,-400,pan);
    }else if(style==='bubble'){
      this.tone(impact?480:900+shot*140,.13,'sine',.065,impact?400:-600,pan);if(impact)this.noise(.06,1700,.025,pan);
    }else if(style==='hydro'){
      this.noise(impact?.13:.25,1800,.06,pan);this.tone(impact?210:150,.2,'triangle',.04,impact?70:-65,pan);
    }else if(style==='ember'){
      this.noise(.18,1300,.06,pan,'bandpass');this.tone(180,.15,'triangle',.035,-95,pan);
    }else if(style==='flame'){
      this.noise(.28,900,.07,pan);this.tone(76,.28,'sawtooth',.013,-32,pan);
    }else if(style==='punch'){
      this.noise(impact?.045:.075,impact?1700:2600,impact?.035:.02,pan,'bandpass');
    }else if(style==='slam'){
      this.noise(impact?.1:.09,impact?1200:2300,impact?.05:.018,pan,'bandpass');
    }else if(style==='bite'){
      this.noise(.045,3200,.03,pan,'highpass');
    }else if(style==='vine'||style==='leaf'){
      this.noise(.15,1800,.055,pan,'bandpass');this.tone(250,.15,'triangle',.025,300,pan);
    }else if(style==='slash'){
      this.noise(.085,2800,.045,pan,'bandpass');this.tone(950,.09,'triangle',.018,-700,pan);
    }else if(style==='ice'){
      this.noise(.12,3600,.035,pan,'highpass');this.tone(1650,.18,'sine',.028,-400,pan);
    }else if(style==='magnet'){
      this.tone(580,.14,'sine',.028,180,pan);this.tone(890,.12,'triangle',.015,-110,pan);this.noise(.05,3200,.02,pan,'bandpass');
    }else if(['psychic','confusion','aura'].includes(style)){
      const base={psychic:480,confusion:640,aura:220}[style];this.tone(base,.23,'sine',.035,-base*.25,pan);this.tone(base*1.5,.18,'triangle',.018,-base*.15,pan,.03);this.noise(.1,1400,.018,pan,'bandpass');
    }else if(style==='shadow'){
      this.tone(340,.2,'sine',.045,-230,pan);this.tone(510,.25,'sine',.022,-340,pan);this.noise(.11,1400,.03,pan,'bandpass');
    }else if(style==='dash'){
      this.noise(.1,2400,.03,pan,'bandpass');
    }else if(style==='rock'){
      this.noise(impact?.1:.09,impact?1400:2300,impact?.045:.018,pan,'bandpass');
    }else if(style==='coin'){
      this.tone(1340,.12,'sine',.042,300,pan);this.tone(2210,.09,'triangle',.015,-160,pan);
    }else if(style==='heal'){
      this.tone(600,.12,'sine',.025,300,pan);this.tone(900,.16,'sine',.02,300,pan,.06);
    }
  }
  event(e) {
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    if(e.type==='dashWindup'){this.tone(230,.2,'sine',.018,120,(e.unit.x-300)/500);}
    if(e.type==='dashStart')this.play('dash',e.from.x);
    if(e.type==='entry')this.play(e.style,e.x,true,0,e.unit.card.id);
    if(e.type==='transform')this.play('shadow',e.unit.x);
    if(e.type==='attackRelease'){const profile=e.attacker.card||e.attacker.guard;this.play(attackCue(profile,e.style),e.from.x,false,e.shot,profile?.id,`${e.attacker.id||e.key}:${e.attacker.attackSeq||0}:${e.shot||0}`);}
    if(e.type==='hit')this.play(attackCue(CARDS[e.key],e.style),e.x,true,0,CARDS[e.key]?.id,e.attackId||e.sourceId&&`${e.sourceId}:${e.attackSeq||0}`);
    if(e.type==='beam'&&!e.shot)this.play(e.style,e.to.x,true,0,CARDS[e.key]?.id,e.sourceId&&`${e.sourceId}:${e.attackSeq||0}`);
    if(e.type==='deathBurst')this.play(e.style||e.unit.card.style,e.unit.x,true,0,e.unit.card.id);
    if(e.type==='heal')this.play('heal',e.unit.x,true);
    if(e.type==='counter')this.play('magnet',e.unit?.x||e.from.x,true);
    if(e.type==='blink')this.play('shadow',e.from.x);
    if(e.type==='leap')this.play('dash',e.unit.x);
    if(e.type==='burrow'){
      const pan=Math.max(-.65,Math.min(.65,(e.unit.x-300)/400));
      this.noise(.08,900,.018,pan);this.tone(e.hidden?430:220,.13,'sine',.025,e.hidden?-220:300,pan);
    }
    if(e.type==='deploy'){if(CARDS[e.key]?.id)this.cry(CARDS[e.key].id,e.x);this.sample('foley:cloth',e.x,{volume:.06,rate:1,maxDuration:.15});}
    if(e.type==='cast'&&e.key==='sneaselAmbush')this.sample('foley:swish-1',e.x,{volume:.18,rate:.85,maxDuration:.4,delay:CARDS.sneaselAmbush.castDelay});
    if(e.type==='cast'&&e.key==='log')this.play('flame',e.x);
    if(e.type==='cast'&&e.key!=='log'&&e.key!=='sneaselAmbush'){
      const pan=Math.max(-.65,Math.min(.65,(e.x-300)/400)),delay=Math.max(0,e.castDelay??CARDS[e.key]?.castDelay??0);
      this.noise(e.key==='pinMissile'?.16:.09,e.key==='fireball'?950:2800,.022,pan,'bandpass',delay);
      this.tone(e.key==='fireball'?150:640,.08,'triangle',.018,-90,pan,delay);
    }
    if(e.type==='structureDown'||e.type==='towerDown'){this.noise(.5,480,.12);this.tone(80,.5,'triangle',.09,-45);}
    if(e.type==='spellHit'){
      const style={pinMissile:'volley',lightning:'lightning',hyperBeam:'aura',blizzard:'ice',spikes:'rock',stealthRock:'rock',whirlpool:'hydro',nightmare:'shadow',sneaselAmbush:'shadow',log:'flame',earthquake:'slam',thunder:'lightning'}[e.key]||'ember';
      this.play(style,e.x,true);
      if(e.key==='sneaselAmbush'){this.cry(215,e.x);this.sample('foley:bell',e.x,{volume:.1,rate:1.4,maxDuration:.25});}
    }
    if(e.type==='step'&&e.unit.key==='snorlax'&&this.ctx){const now=this.ctx.currentTime;if(now-(this.last.get('step')??-1)>.25){this.last.set('step',now);this.tone(60,.07,'sine',.035,-20,(e.unit.x-300)/500);}}
  }
}
