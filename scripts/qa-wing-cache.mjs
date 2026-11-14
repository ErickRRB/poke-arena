import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {FlightWings} from '../dist/wing-motion.js';
import {CARDS} from '../dist/engine.js';
import {animationFrame,attackAnimationFrame} from '../dist/sprite-motion.js';

const root=new URL('../',import.meta.url),manifest=JSON.parse(await readFile(new URL('dist/assets/pokemon/manifest.json',root)));
let allocations=0;
globalThis.document={createElement(){allocations++;return{width:0,height:0,getContext(){return new Proxy({getImageData(x,y,w,h){return{data:new Uint8ClampedArray(w*h*4)};}},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})}};}};
globalThis.ImageData=class{constructor(data){this.data=data;}};
const rows=[];
for(const directions of[1,2,4,8]){
  const rig=new FlightWings(),keys=new Set();let misses=0,warmMisses=0,warmAllocations=0;
  for(let frame=0;frame<60*30;frame++)for(let direction=0;direction<directions;direction++)for(const key of['charizard','scyther','salamence']){
    const card=CARDS[key],t=frame/60,cycle=(t+direction*.3)%card.interval,attacking=cycle<card.attackDuration;
    const animation=attacking?card.attackAnim:'Hop',meta=manifest[card.id][animation];
    const index=attacking?attackAnimationFrame(meta,cycle,card.attackDuration,card.windup,card.attackFrames,card):card.moveFrames[animationFrame({durations:card.moveFrames.map(()=>card.moveFrameDuration||8)},(t+direction*.173)*60)];
    const cacheKey=`${card.id}:${animation}:${direction}:${index}`,present=rig.cache.has(cacheKey),before=allocations;
    if(!rig.frame(card.id,animation,direction,index,{naturalWidth:meta.width},meta,t,false))continue;
    keys.add(cacheKey);if(!present){misses++;if(frame>=600){warmMisses++;warmAllocations+=allocations-before;}}
  }
  const surfaces=new Set([...rig.composites.values(),...Array.from(rig.cache.values()).flatMap(entry=>[entry.body,...entry.wings.map(wing=>wing.image)])]);
  const bytes=Array.from(surfaces).reduce((sum,surface)=>sum+surface.width*surface.height*4,0);
  assert.equal(warmMisses,0,`${directions} directions must stop extracting layers after warm-up`);
  assert.equal(warmAllocations,0,`${directions} directions must stop allocating after warm-up`);
  rows.push({directions,actors:directions*3,seconds:30,warmUpSeconds:10,uniqueKeys:keys.size,misses,afterWarmMisses:warmMisses,afterWarmAllocations:warmAllocations,immutableCacheEntries:rig.cache.size,sharedComposites:rig.composites.size,retainedCanvases:surfaces.size,rgbaEquivalentBytes:bytes,rgbaEquivalentMiB:Number((bytes/1024/1024).toFixed(3))});
}
const inputs=Object.fromEntries(await Promise.all(['dist/wing-motion.js','dist/wing-rigs.js','dist/attack-choreography.js','dist/assets/pokemon/manifest.json','scripts/qa-wing-cache.mjs'].map(async file=>[file,createHash('sha256').update(await readFile(new URL(file,root))).digest('hex')])));
const report={scope:'Allocation and working-set measurement with real FlightWings/card timing and transparent mocked raster input. It does not measure pixel extraction cost, GPU memory or FPS.',rows,inputs};
await mkdir(new URL('docs/battle-refinement/wing-cache/',root),{recursive:true});
await writeFile(new URL('docs/battle-refinement/wing-cache/verification.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows));
