// Explicitly started, per-tab, in-memory diagnostics. Never stores game content.
const CAPACITY = 8192, LIMIT_MS = 60000;
class Ring {
  constructor() { this.values = new Float64Array(CAPACITY);this.count = 0;this.next = 0; }
  add(v) { if (!Number.isFinite(v) || v < 0) return;this.values[this.next] = v;this.next = (this.next + 1) % CAPACITY;this.count = Math.min(CAPACITY,this.count + 1); }
  summary() {
    const v = Array.from(this.values.subarray(0,this.count)).sort((a,b)=>a-b), at=q=>v.length?v[Math.floor((v.length-1)*q)]:null;
    return { n:v.length,p50:at(.5),p95:at(.95),p99:at(.99),max:v.length?v[v.length-1]:null,atLeast1000:v.filter(x=>x>=1000).length };
  }
}
export class OnlinePerf {
  constructor(clock=()=>performance.now()) { this.clock=clock;this.active=false;this.socketReset(); }
  start() {
    this.active=true;this.started=this.clock();this.lastFrame=null;this.lastSnapshot=null;this.pingAt=null;this.lastVersion=null;this.lastSeq=null;this.epoch=null;
    this.frames=new Ring();this.draw=new Ring();this.snapshots=new Ring();this.bytes=new Ring();this.rtt=new Ring();this.age=new Ring();this.correction=new Ring();
    this.versionSkips=0;this.seqAdvance=0;this.epochChanges=0;this.reconnects=0;this.overlappingPings=0;this.ambiguousPongs=0;this.reason=null;this.windows=[];
  }
  now() { const now=this.clock();if (this.active && now-this.started>=LIMIT_MS) this.stop('limit');return now; }
  stop(reason='manual') { if(this.active){this.active=false;this.reason=reason;} }
  mark(now,key,value) { if(!Number.isFinite(value)||value<0)return;const second=Math.min(59,Math.floor((now-this.started)/1000));const w=this.windows[second]??={second};w[key]=Math.max(w[key]??0,value); }
  socketReset() { this.pingPending=false;this.pingUnsafe=false;this.pingAt=null; }
  ping() {
    const now=this.active?this.now():null;
    if(this.pingPending){this.pingUnsafe=true;if(this.active)this.overlappingPings++;}
    this.pingPending=true;this.pingAt=null;
    if(this.active&&!this.pingUnsafe)this.pingAt=now;
  }
  pong() {
    const now=this.active?this.now():null;
    if(this.pingUnsafe || !this.pingPending){this.pingUnsafe=true;if(this.active)this.ambiguousPongs++;return;}
    this.pingPending=false;
    if(this.active&&this.pingAt!==null){const rtt=now-this.pingAt;this.rtt.add(rtt);this.mark(now,'rttMaxMs',rtt);}
    this.pingAt=null;
  }
  reconnect() { if(this.active && (this.now(),this.active))this.reconnects++; }
  snapshot(packet,bytes) {
    if(!this.active)return;const now=this.now();if(!this.active)return;
    if(this.lastSnapshot!==null){const gap=now-this.lastSnapshot;this.snapshots.add(gap);this.mark(now,'snapshotGapMaxMs',gap);}this.lastSnapshot=now;this.bytes.add(bytes);
    if(this.epoch!==null&&packet.epoch!==this.epoch){this.epochChanges++;this.lastVersion=null;this.lastSeq=null;}
    this.epoch=packet.epoch;
    if(Number.isSafeInteger(packet.version)){if(this.lastVersion!==null)this.versionSkips+=Math.max(0,packet.version-this.lastVersion-1);this.lastVersion=packet.version;}
    if(Number.isSafeInteger(packet.seq)){if(this.lastSeq!==null)this.seqAdvance+=Math.max(0,packet.seq-this.lastSeq);this.lastSeq=packet.seq;}
  }
  frame(start,renderer) {
    if(!this.active)return;const now=this.now();if(!this.active)return;
    if(this.lastFrame!==null){const gap=now-this.lastFrame;this.frames.add(gap);this.mark(now,'frameGapMaxMs',gap);}this.lastFrame=now;this.draw.add(now-start);this.mark(now,'drawMaxMs',now-start);
    if(this.lastSnapshot!==null){const age=now-this.lastSnapshot;this.age.add(age);this.mark(now,'snapshotAgeMaxMs',age);}
    // Only a numeric maximum per frame enters the ring, not actor identity or position.
    let maximum=0,n=0;for(const pose of renderer.frameActors.values()){if(++n>64)break;if(Number.isFinite(pose.logicalX)&&Number.isFinite(pose.logicalY))maximum=Math.max(maximum,Math.hypot(pose.x-pose.logicalX,pose.y-pose.logicalY));}
    this.correction.add(maximum);this.mark(now,'visualDifferenceMaxUnits',maximum);
  }
  report() {
    if(this.active)this.now();
    if(!this.frames)return null;
    return {schema:1,active:this.active,stopReason:this.reason,limitMs:LIMIT_MS,capacity:CAPACITY,frameGapMs:this.frames.summary(),drawMs:this.draw.summary(),snapshotGapMs:this.snapshots.summary(),snapshotBytes:this.bytes.summary(),rttMs:this.rtt.summary(),overlappingPings:this.overlappingPings,ambiguousPongs:this.ambiguousPongs,rttQuarantined:this.pingUnsafe,ageSinceSnapshotMs:this.age.summary(),maxVisualDifferenceUnits:this.correction.summary(),versionSkips:this.versionSkips,seqAdvance:this.seqAdvance,epochChanges:this.epochChanges,reconnects:this.reconnects,windows:this.windows.filter(Boolean)};
  }
}
export const onlinePerf = new OnlinePerf();
if(typeof window!=='undefined')Object.defineProperty(window,'pokeArenaPerf',{value:Object.freeze({start:()=>onlinePerf.start(),stop:()=>onlinePerf.stop(),report:()=>onlinePerf.report()}),configurable:false});
