// Recorded foley and Pokémon voices follow release/impact events; synthesis is a loading fallback.
import { BattleMusic } from './music.js?v=23';
import { CARDS } from './engine.js?v=23';
export class SoundSystem {
  constructor(enabled = true) { this.enabled=enabled;this.ctx=null;this.last=new Map();this.encoded=new Map();this.buffers=new Map();this.voiceSlots=[];this.battlePlaying=false;this.intense=false;this.ready=this.preload().catch(()=>false); }
  async preload(){
    const response=await fetch('assets/audio/manifest.json?v=23');if(!response.ok)throw Error('Audio manifest unavailable');
    const manifest=await response.json();
    await Promise.all(Object.entries(manifest).flatMap(([group,entries])=>Object.entries(entries).map(async([id,file])=>{const r=await fetch(file);if(!r.ok)throw Error(`Audio unavailable: ${file}`);this.encoded.set(`${group}:${id}`,await r.arrayBuffer());})));
    this.bytesReady=true;if(this.ctx)await this.decodeSamples();return true;
  }
  decodeSamples(){
    if(!this.ctx||!this.bytesReady)return;
    const ctx=this.ctx;
    this.decoded||=Promise.all([...this.encoded].filter(([key])=>!this.buffers.has(key)).map(async([key,bytes])=>{
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
    this.ctx=null;this.master=null;this.music=null;this.noiseBuffer=null;this.decoded=null;this.resumePending=null;this.needsRebuild=false;this.last.clear();this.voiceSlots=[];
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
    const now=this.output(source,volume,duration,pan,delay);source.start(now);source.stop(now+duration+.015);return true;
  }
  cry(id,x=300){
    if(!id||!this.enabled||!this.ctx)return;
    const now=this.ctx.currentTime,key=`cry:${id}`;this.voiceSlots=this.voiceSlots.filter(t=>t>now);
    if(this.voiceSlots.length>=3||now-(this.last.get(key)??-100)<.6)return;
    if(this.sample(`cries:${id}`,x,{volume:.22,maxDuration:2.5})){this.last.set(key,now);this.voiceSlots.push(now+Math.min(2.5,this.buffers.get(`cries:${id}`).duration));}
  }
  recorded(style,x,impact,shot,id){
    style = ({powder:'leaf',poison:'confusion',egg:'rock',song:'confusion',eruption:'flame',horn:'punch',lick:'shadow'})[style] || style;
    if(!this.buffers.has('foley:punch-1'))return false;
    const play=(key,options={})=>this.sample(`foley:${key}`,x,options),pan=Math.max(-.65,Math.min(.65,(x-300)/400));
    if(style==='punch'){play(`punch-${shot%3+1}`,{volume:.34,rate:1+shot*.045,maxDuration:.2});}
    else if(style==='slam'){play(id===74?'stone':'heavy',{volume:.36,rate:id===74?.85:.62,maxDuration:.5});play('punch-1',{volume:.16,rate:.58,maxDuration:.35});}
    else if(style==='rock'){play(impact?'stone':'heavy',{volume:impact?.32:.15,rate:impact?.75:1.5,maxDuration:impact?.5:.15});}
    else if(style==='bubble'){play('water',{volume:.21,rate:1.3+shot*.13,maxDuration:impact?.22:.17});}
    else if(style==='hydro'){play('water',{volume:.3,rate:.66,maxDuration:impact?.3:.46});this.noise(.18,1700,.025,pan);}
    else if(style==='ember'||style==='flame'){play('cloth',{volume:.17,rate:style==='flame'?.58:1.15,maxDuration:style==='flame'?.4:.18});this.noise(style==='flame'?.34:.16,style==='flame'?700:1900,.045,pan,'bandpass');}
    else if(style==='lightning'){play('metal',{volume:.09,rate:1.7,maxDuration:.16});for(let i=0;i<4;i++)this.noise(.025,3000-i*280,.055,pan,'bandpass',i*.035);}
    else if(style==='magnet'){play('metal',{volume:.25,rate:.72,maxDuration:.32});play('bell',{volume:.06,rate:1.6,maxDuration:.25});}
    else if(style==='ice'){play('glass',{volume:.28,rate:1.2,maxDuration:.42});this.noise(.1,3400,.02,pan);}
    else if(style==='coin'){play('coin',{volume:.2,rate:1.65,maxDuration:.28});}
    else if(style==='slash'){play(shot%2?'swish-1':'swish-2',{volume:.28,rate:1.13,maxDuration:.25});}
    else if(style==='vine'||style==='leaf'){play(style==='leaf'?'swish-2':'swish-1',{volume:.24,rate:style==='leaf'?1.5:.72,maxDuration:.35});play('heavy',{volume:.06,rate:1.7,maxDuration:.12});}
    else if(style==='bite'){play('punch-3',{volume:.2,rate:1.65,maxDuration:.13});play('swish-2',{volume:.1,rate:1.5,maxDuration:.1});}
    else if(style==='dash'){play('cloth',{volume:.16,rate:1.5,maxDuration:.17});play('punch-3',{volume:.2,rate:1.3,maxDuration:.16});}
    else if(style==='shadow'){play('cloth',{volume:.2,rate:.7,reverse:true,maxDuration:.35});play('bell',{volume:.08,rate:.6,reverse:true,maxDuration:.4});}
    else if(['psychic','confusion','aura'].includes(style)){play('bell',{volume:style==='aura'?.18:.12,rate:style==='confusion'?1.1:style==='psychic'?.68:.45,reverse:!impact,maxDuration:style==='aura'?.7:.42});play('swish-1',{volume:.12,rate:.7,maxDuration:.3});}
    else return false;
    return true;
  }
  output(node,volume,duration,pan=0,delay=0) {
    const now=this.ctx.currentTime+delay,gain=this.ctx.createGain();
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    node.connect(gain);
    if(this.ctx.createStereoPanner){const stereo=this.ctx.createStereoPanner();stereo.pan.value=pan;gain.connect(stereo);stereo.connect(this.master);}else gain.connect(this.master);
    return now;
  }
  tone(freq,duration=.1,wave='sine',volume=.04,slide=0,pan=0,delay=0) {
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    const oscillator=this.ctx.createOscillator();oscillator.type=wave;
    const now=this.output(oscillator,volume,duration,pan,delay);oscillator.frequency.setValueAtTime(freq,now);
    if(slide)oscillator.frequency.exponentialRampToValueAtTime(Math.max(25,freq+slide),now+duration);
    oscillator.start(now);oscillator.stop(now+duration+.01);
  }
  noise(duration,freq,volume,pan=0,type='lowpass',delay=0) {
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter();source.buffer=this.noiseBuffer;
    filter.type=type;filter.frequency.setValueAtTime(freq,this.ctx.currentTime+delay);filter.frequency.exponentialRampToValueAtTime(Math.max(50,freq*.4),this.ctx.currentTime+delay+duration);filter.Q.value=type==='bandpass'?1.5:.7;
    source.connect(filter);const now=this.output(filter,volume,duration,pan,delay);source.start(now);source.stop(now+duration+.01);
  }
  play(style,x=300,impact=false,shot=0,id=0) {
    style = ({powder:'leaf',poison:'confusion',egg:'rock',song:'confusion',eruption:'flame',horn:'punch',lick:'shadow'})[style] || style;
    if(!this.enabled||!this.ctx)return;
    const now=this.ctx.currentTime,key=`${style}:${impact}`;
    if(now-(this.last.get(key)??-100)<.035)return;this.last.set(key,now);
    if(this.recorded(style,x,impact,shot,id))return;
    const pan=Math.max(-.65,Math.min(.65,(x-300)/400));
    if(style==='lightning'){
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
      this.tone(155+shot*19,.085,'triangle',.075,-90,pan);this.noise(.07,900+shot*200,.045,pan);
    }else if(style==='slam'){
      this.tone(94,.3,'sine',.12,-64,pan);this.noise(.22,420,.09,pan);this.tone(48,.35,'triangle',.03,-16,pan);
    }else if(style==='bite'){
      this.tone(1050,.085,'sine',.04,-600,pan);this.noise(.045,2400,.023,pan,'bandpass');
    }else if(style==='vine'){
      this.noise(.15,1800,.055,pan,'bandpass');this.tone(250,.15,'triangle',.025,300,pan);
    }else if(style==='shadow'){
      this.tone(340,.2,'sine',.045,-230,pan);this.tone(510,.25,'sine',.022,-340,pan);this.noise(.11,1400,.03,pan,'bandpass');
    }else if(style==='dash'){
      this.noise(.12,2000,.035,pan,'bandpass');this.tone(200,.1,'triangle',.07,-120,pan);
    }else if(style==='rock'){
      this.noise(impact?.23:.11,impact?500:350,.08,pan);this.tone(impact?83:125,.23,'triangle',.07,-50,pan);
    }else if(style==='coin'){
      this.tone(1340,.12,'sine',.042,300,pan);this.tone(2210,.09,'triangle',.015,-160,pan);
    }
  }
  event(e) {
    if(e.type==='entry')this.play(e.style,e.x,true,0,e.unit.card.id);
    if(e.type==='ability'){this.play(e.unit.card.style,e.unit.x,true,0,e.unit.card.id);this.sample('foley:bell',e.unit.x,{volume:.2,rate:.65,maxDuration:.75});}
    if(e.type==='transform')this.play('shadow',e.unit.x);
    if(e.type==='attackRelease'){const id=e.attacker.card?.id||e.attacker.guard?.id;this.play(e.style,e.from.x,false,e.shot,id);}
    if(e.type==='hit'&&['bubble','hydro','rock','ember','coin','magnet','ice','confusion','aura'].includes(e.style))this.play(e.style,e.x,true);
    if(e.type==='blink')this.play('shadow',e.from.x);
    if(e.type==='leap')this.play('dash',e.unit.x);
    if(e.type==='deploy'){this.cry(CARDS[e.key]?.id,e.x);this.tone(440,.13,'sine',.025,240);this.tone(880,.12,'sine',.012,120,0,.05);}
    if(e.type==='structureDown'||e.type==='towerDown'){this.noise(.5,480,.12);this.tone(80,.5,'triangle',.09,-45);}
    if(e.type==='spellHit'){
      const style={pinMissile:'leaf',lightning:'lightning',hyperBeam:'aura',blizzard:'ice',spikes:'rock',stealthRock:'rock',whirlpool:'hydro',nightmare:'shadow',earthquake:'slam',thunder:'lightning'}[e.key]||'ember';
      this.play(style,e.x,true);
    }
    if(e.type==='step'&&e.unit.key==='snorlax'&&this.ctx){const now=this.ctx.currentTime;if(now-(this.last.get('step')??-1)>.25){this.last.set('step',now);this.tone(60,.07,'sine',.035,-20,(e.unit.x-300)/500);}}
  }
}
