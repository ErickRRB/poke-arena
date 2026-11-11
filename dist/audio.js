// Short synthesized effects stay local and follow the simulation's release/impact events.
export class SoundSystem {
  constructor(enabled = true) { this.enabled=enabled;this.ctx=null;this.last=new Map(); }
  unlock() {
    if(!this.enabled)return;
    try{
      if(!this.ctx){
        this.ctx=new(window.AudioContext||window.webkitAudioContext)();
        this.master=this.ctx.createGain();this.master.gain.value=.7;
        const compressor=this.ctx.createDynamicsCompressor();compressor.threshold.value=-18;compressor.ratio.value=5;
        this.master.connect(compressor);compressor.connect(this.ctx.destination);
        this.noiseBuffer=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate);
        const data=this.noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      }
      if(this.ctx.state==='suspended')this.ctx.resume();
    }catch{this.ctx=null;}
  }
  setEnabled(value) { this.enabled=value;if(this.master)this.master.gain.setTargetAtTime(value?.7:0,this.ctx.currentTime,.02);if(value)this.unlock(); }
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
  noise(duration,freq,volume,pan=0,type='lowpass') {
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter();source.buffer=this.noiseBuffer;
    filter.type=type;filter.frequency.setValueAtTime(freq,this.ctx.currentTime);filter.frequency.exponentialRampToValueAtTime(Math.max(50,freq*.4),this.ctx.currentTime+duration);filter.Q.value=type==='bandpass'?1.5:.7;
    source.connect(filter);const now=this.output(filter,volume,duration,pan);source.start(now);source.stop(now+duration+.01);
  }
  play(style,x=300,impact=false,shot=0) {
    if(!this.enabled||!this.ctx)return;
    const now=this.ctx.currentTime,key=`${style}:${impact}`;
    if(now-(this.last.get(key)??-100)<.035)return;this.last.set(key,now);
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
    if(e.type==='attackRelease')this.play(e.style,e.from.x,false,e.shot);
    if(e.type==='hit'&&['bubble','hydro','rock','ember','coin'].includes(e.style))this.play(e.style,e.x,true);
    if(e.type==='blink')this.play('shadow',e.from.x);
    if(e.type==='deploy'){this.tone(440,.13,'sine',.055,240);this.tone(880,.12,'sine',.025,120,0,.05);}
    if(e.type==='structureDown'||e.type==='towerDown'){this.noise(.5,480,.12);this.tone(80,.5,'triangle',.09,-45);}
    if(e.type==='spellHit')this.play(e.key==='thunder'?'lightning':'ember',e.x,true);
    if(e.type==='step'&&e.unit.key==='snorlax'&&this.ctx){const now=this.ctx.currentTime;if(now-(this.last.get('step')??-1)>.25){this.last.set('step',now);this.tone(60,.07,'sine',.035,-20,(e.unit.x-300)/500);}}
  }
}
