// Authored recordings stream independently of the combat sample decoder.
// Full, attributed orchestral recordings; see assets/audio/music/SOURCES.json.
import{publicAssetUrl}from'./online-config.js?v=36';
export const MUSIC_TRACKS=Object.freeze([
  {id:'rynos-theme',file:'assets/audio/music/rynos-theme.mp3',role:'main',duration:185.678375,gain:.28},
  {id:'five-armies',file:'assets/audio/music/five-armies.mp3',role:'intense',duration:155.84655,gain:.225},
]);
export const MUSIC_CROSSFADE=2.2;
export const MAX_MUSIC_RETRIES=4;

export class BattleMusic {
  constructor(ctx,destination,{tracks=MUSIC_TRACKS,createElement=()=>typeof Audio==='function'?new Audio():null}={}){
    this.ctx=ctx;this.tracks=tracks;this.createElement=createElement;
    this.bus=ctx.createGain();this.bus.gain.value=0;this.bus.connect(destination);
    this.playing=false;this._intense=false;this.slots=new Set();this.failed=new Set();this.failures=new Map();this.cleanupTimers=new Set();this.generation=0;this.rotation=0;this.pending=false;this.bookmark=null;
  }
  get intense(){return this._intense;}
  set intense(value){
    value=!!value;if(this._intense===value)return;this._intense=value;
    if(this.playing)this.bus.gain.setTargetAtTime(value?1:.88,this.ctx.currentTime,.7);
  }
  chooseTrack(){
    const available=this.tracks.filter(t=>!this.failed.has(t.id)),role=this.intense?'intense':'main';
    const fresh=available.filter(t=>t.id!==this.current?.track.id),preferred=fresh.filter(t=>t.role===role);
    const choices=preferred.length?preferred:fresh.length?fresh:available;
    return choices[this.rotation++%Math.max(1,choices.length)];
  }
  makeSlot(track,offset=0){
    const element=this.createElement();if(!element||!this.ctx.createMediaElementSource)return null;
    element.preload='metadata';element.loop=false;element.playsInline=true;element.crossOrigin='anonymous';element.src=publicAssetUrl(track.file);
    const gain=this.ctx.createGain();gain.gain.value=0;const source=this.ctx.createMediaElementSource(element);source.connect(gain);gain.connect(this.bus);
    const slot={element,gain,source,track,offset};this.slots.add(slot);
    const seek=()=>{if(slot.offset>0){try{element.currentTime=slot.offset;slot.offset=0;}catch{}}};
    slot.onMetadata=seek;element.addEventListener('loadedmetadata',seek);seek();
    slot.onEnded=()=>{if(this.current===slot&&this.playing)this.startNext(0);};element.addEventListener('ended',slot.onEnded);
    slot.onError=()=>{this.noteFailure(slot);if(this.playing&&!this.pending)this.startNext(.3);};element.addEventListener('error',slot.onError);
    return slot;
  }
  releaseSlot(slot){
    if(!slot||!this.slots.has(slot))return;
    slot.element.pause();slot.element.removeEventListener('loadedmetadata',slot.onMetadata);slot.element.removeEventListener('ended',slot.onEnded);slot.element.removeEventListener('error',slot.onError);
    slot.element.removeAttribute('src');slot.element.load();slot.source.disconnect();slot.gain.disconnect();this.slots.delete(slot);
    if(this.waitingSlot===slot)this.waitingSlot=null;
  }
  fade(slot,to,duration){
    const now=this.ctx.currentTime,param=slot.gain.gain;param.cancelScheduledValues(now);param.setValueAtTime(to?0:(slot.track.gain??1),now);param.linearRampToValueAtTime(to?(slot.track.gain??1):0,now+duration);
  }
  noteFailure(slot){
    if(slot.failed)return;slot.failed=true;this.failed.add(slot.track.id);this.failures.set(slot.track.id,(this.failures.get(slot.track.id)||0)+1);
    if(this.current===slot){this.bookmark={trackId:slot.track.id,position:slot.element.currentTime||0};this.current=null;}
    this.releaseSlot(slot);this.scheduleRetry();
  }
  scheduleRetry(){
    if(!this.playing||this.retryTimer||!this.failed.size)return;
    const retryable=[...this.failures.values()].filter(n=>n<=MAX_MUSIC_RETRIES);if(!retryable.length)return;
    const generation=this.generation,delay=1000*2**(Math.min(...retryable)-1);
    this.retryTimer=setTimeout(()=>{
      this.retryTimer=null;if(!this.playing||generation!==this.generation||this.ctx.state!=='running')return;
      for(const[id,count]of this.failures)if(count<=MAX_MUSIC_RETRIES)this.failed.delete(id);
      if(this.current&&!this.current.element.ended&&!this.current.element.paused)return;
      const saved=this.bookmark&&this.tracks.find(t=>t.id===this.bookmark.trackId&&!this.failed.has(t.id));this.startNext(.3,saved,saved?this.bookmark.position:0);
    },delay);
  }
  async startSlot(slot,fade=MUSIC_CROSSFADE){
    if(this.pending)return false;
    const generation=this.generation,token={};this.pending=true;this.pendingToken=token;
    try{
      await slot.element.play();
      if(!this.playing||generation!==this.generation){if(!this.playing)slot.element.pause();if(slot!==this.current)this.releaseSlot(slot);return false;}
      const previous=this.current;this.current=slot;this.bookmark=null;this.waitingSlot=null;this.waitingForGesture=false;this.failed.delete(slot.track.id);this.failures.delete(slot.track.id);this.fade(slot,1,previous?fade:.45);
      if(previous&&previous!==slot){this.fade(previous,0,fade);const timer=setTimeout(()=>{this.cleanupTimers.delete(timer);this.releaseSlot(previous);},fade*1000+50);this.cleanupTimers.add(timer);}
      return true;
    }catch(error){
      if(generation!==this.generation)return false;
      if(error?.name!=='NotAllowedError')this.noteFailure(slot);
      this.waitingForGesture=error?.name==='NotAllowedError';if(this.waitingForGesture)this.waitingSlot=slot;return false;
    }finally{if(this.pendingToken===token){this.pending=false;this.pendingToken=null;}}
  }
  async startNext(fade=MUSIC_CROSSFADE,preferred=null,offset=0){
    if(this.pending||!this.playing)return;
    const track=preferred||this.chooseTrack();if(!track){this.scheduleRetry();return;}
    for(const old of [...this.slots])if(old!==this.current)this.releaseSlot(old);
    const slot=this.makeSlot(track,offset);if(!slot)return;
    if(!await this.startSlot(slot,fade)&&!this.waitingForGesture&&this.playing&&this.failed.size<this.tracks.length)this.startNext(fade);
  }
  checkProgress(){
    if(!this.playing||this.pending||this.waitingForGesture)return;
    if(!this.current){this.scheduleRetry();return;}
    const {element}=this.current,duration=element.duration;
    if(Number.isFinite(duration)&&duration>0&&duration-element.currentTime<=MUSIC_CROSSFADE)this.startNext();
  }
  setPlaying(value){
    value=!!value;if(this.playing===value)return;this.playing=value;this.generation++;
    const now=this.ctx.currentTime;this.bus.gain.cancelScheduledValues(now);this.bus.gain.setTargetAtTime(value?(this.intense?1:.88):0,now,value?.35:.025);
    if(!value){
      clearInterval(this.timer);clearTimeout(this.retryTimer);this.retryTimer=null;for(const timer of this.cleanupTimers)clearTimeout(timer);this.cleanupTimers.clear();
      for(const slot of [...this.slots]){slot.element.pause();if(slot!==this.current)this.releaseSlot(slot);}
      this.pending=false;this.pendingToken=null;return;
    }
    if(!this.tracks.length||this.ctx.state!=='running')return;
    this.waitingForGesture=false;this.failed.clear();this.failures.clear();
    if(this.current&&!this.current.element.ended)this.startSlot(this.current,.25);
    else{const saved=this.bookmark&&this.tracks.find(t=>t.id===this.bookmark.trackId);this.startNext(MUSIC_CROSSFADE,saved,saved?this.bookmark.position:0);}
    clearInterval(this.timer);this.timer=setInterval(()=>this.checkProgress(),250);
  }
  userGesture(){
    if(!this.playing||this.ctx.state!=='running'||this.pending||!this.waitingForGesture&&this.current&&!this.current.element.paused)return;
    this.waitingForGesture=false;this.failed.clear();this.failures.clear();const slot=this.waitingSlot||this.current;if(slot&&!slot.element.ended)this.startSlot(slot,.25);else this.startNext(.25);
  }
  snapshot(){
    return{trackId:this.current?.track.id||this.bookmark?.trackId||null,position:this.current?.element.currentTime??this.bookmark?.position??0,intense:this.intense,rotation:this.rotation};
  }
  restore(state){
    if(!state)return;this.bookmark={trackId:state.trackId,position:Math.max(0,state.position||0)};this.rotation=state.rotation||0;this.intense=!!state.intense;
  }
  reset(){
    this.setPlaying(false);clearTimeout(this.retryTimer);this.retryTimer=null;for(const slot of [...this.slots])this.releaseSlot(slot);this.current=null;this.waitingSlot=null;this.bookmark=null;this.failed.clear();this.failures.clear();this.generation++;
  }
  dispose(){this.reset();this.bus.disconnect();}
}
