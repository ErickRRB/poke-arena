// An original evolving score. Sections change harmony, melody, register and
// instrumentation; playback never loops a short audio file.
const scale=[0,2,4,5,7,9,11];
const progressions=[[0,3,5,4,0,2,3,4],[5,3,0,4,2,5,3,4],[0,4,5,2,3,0,3,4],[3,0,5,4,2,3,0,4]];
const motifs=[[0,2,4,2,1,0],[4,3,2,0,1,2],[0,1,2,4,3,2],[2,4,6,4,2,1],[4,2,1,0,2,0],[0,2,3,4,2,1]];
const noteAt=degree=>55+scale[((degree%7)+7)%7]+12*Math.floor(degree/7);
function randomFor(seed){let value=seed>>>0||1;return()=>{value^=value<<13;value^=value>>>17;value^=value<<5;return(value>>>0)/4294967296;};}
export function composeBar(bar,seed=1){
  const section=Math.floor(bar/8),random=randomFor((seed+Math.imul(bar+1,2654435761))>>>0),sectionRandom=randomFor(seed+section*11717);
  const chord=progressions[Math.floor(sectionRandom()*progressions.length)][bar%8],notes=[];
  for(const degree of[chord,chord+2,chord+4])notes.push({kind:'pad',midi:noteAt(degree),beat:0,length:3.7,volume:.026});
  for(const beat of[0,2])notes.push({kind:'bass',midi:noteAt(chord)-12,beat,length:1.35,volume:.11});
  const motif=motifs[Math.floor(random()*motifs.length)],rhythm=bar%3===0?[0,.75,1.5,2,2.75,3.5]:[0,.5,1.25,2,2.5,3.25];
  const register=section%3===2?-12:0;
  motif.forEach((degree,index)=>{
    if(bar%8===3&&index>3)return;
    const cadence=bar%8===7&&index===5;
    notes.push({kind:section%2?'bell':'lead',midi:noteAt(cadence?7:chord+degree)+12+register,beat:rhythm[index],length:cadence?.7:.3+random()*.3,volume:.07+random()*.025});
  });
  if(section%4!==1)for(let i=0;i<4;i++)notes.push({kind:'bell',midi:noteAt(chord+[0,4,2,4][(i+section)%4])+12,beat:i+.25,length:.55,volume:.025});
  return notes;
}
export class BattleMusic {
  constructor(ctx,destination){
    this.ctx=ctx;this.bus=ctx.createGain();this.bus.gain.value=0;this.bus.connect(destination);this.nodes=new Set();this.seed=Date.now()>>>0;this.bar=0;this.playing=false;this.intense=false;
    this.noise=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.12),ctx.sampleRate);const data=this.noise.getChannelData(0),random=randomFor(this.seed);for(let i=0;i<data.length;i++)data[i]=(random()*2-1)*.5;
  }
  reset(){this.setPlaying(false);this.seed=(Date.now()+this.seed+7919)>>>0;this.bar=0;}
  setPlaying(value){
    if(this.playing===value)return;this.playing=value;const now=this.ctx.currentTime;
    this.bus.gain.cancelScheduledValues(now);this.bus.gain.setTargetAtTime(value?.18:0,now,value?.25:.045);
    if(value){this.nextBar=now+.08;this.schedule();this.timer=setInterval(()=>this.schedule(),100);}
    else{clearInterval(this.timer);for(const node of this.nodes)try{node.stop(now+.18);}catch{};}
  }
  attach(source,gain,filter){
    this.nodes.add(source);source.onended=()=>{source.disconnect();gain.disconnect();filter?.disconnect();this.nodes.delete(source);};
  }
  note({kind,midi,volume,length},at,beatSeconds){
    const ctx=this.ctx,osc=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter(),duration=length*beatSeconds,release=kind==='pad'?.55:.18;
    osc.type=kind==='bass'?'triangle':'sine';osc.frequency.value=440*2**((midi-69)/12);filter.type='lowpass';filter.frequency.value=kind==='pad'?1100:kind==='bass'?650:3400;
    const attack=kind==='pad'?.14:.008;
    gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(volume,at+attack);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume*(kind==='pad'?.65:.18)),at+Math.max(attack+.01,duration));gain.gain.exponentialRampToValueAtTime(.0001,at+duration+release);
    osc.connect(filter);filter.connect(gain);gain.connect(this.bus);this.attach(osc,gain,filter);osc.start(at);osc.stop(at+duration+release+.02);
    if(kind==='bell'||kind==='lead'){
      const partial=ctx.createOscillator(),upper=ctx.createGain();partial.type='sine';partial.frequency.value=osc.frequency.value*(kind==='bell'?3:2);
      upper.gain.setValueAtTime(volume*.18,at);upper.gain.exponentialRampToValueAtTime(.0001,at+duration*.6+.1);partial.connect(upper);upper.connect(this.bus);this.attach(partial,upper);partial.start(at);partial.stop(at+duration+.12);
    }
  }
  percussion(at,strong=false){
    const ctx=this.ctx,gain=ctx.createGain(),source=strong?ctx.createOscillator():ctx.createBufferSource();
    if(strong){source.type='sine';source.frequency.setValueAtTime(105,at);source.frequency.exponentialRampToValueAtTime(45,at+.12);}else source.buffer=this.noise;
    gain.gain.setValueAtTime(strong?.09:.014,at);gain.gain.exponentialRampToValueAtTime(.0001,at+(strong?.16:.07));source.connect(gain);gain.connect(this.bus);this.attach(source,gain);source.start(at);source.stop(at+.19);
  }
  schedule(){
    if(!this.playing||this.ctx.state!=='running')return;
    const seconds=60/(this.intense?118:108),now=this.ctx.currentTime;
    if(this.nextBar<now-.5)this.nextBar=now+.05;
    while(this.nextBar<now+.35){
      const at=this.nextBar;
      for(const note of composeBar(this.bar,this.seed))this.note(note,at+note.beat*seconds,seconds);
      for(let beat=0;beat<4;beat++){this.percussion(at+beat*seconds,beat===0||beat===2);if((this.bar+Math.floor(this.bar/8))%3!==0)this.percussion(at+(beat+.5)*seconds);}
      this.bar++;this.nextBar+=seconds*4;
    }
  }
}
