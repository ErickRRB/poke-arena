import { WING_RIGS } from './wing-rigs.js';
import { SPRITE_GEOMETRY } from './sprite-geometry.js';

export function insideWing(x,y,polygon){
  let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }return inside;
}
const canvas=(width,height)=>{const c=document.createElement('canvas');c.width=width;c.height=height;return c;};
const wingEdge=(x,y,polygon)=>polygon.some((a,i)=>{
  const b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t)<=1.3;
});

// Only the visible painted wings move. The head, hands and body remain native,
// so the gameplay emitter follows the same unmodified attachment marker.
export class FlightWings{
  constructor(){this.cache=new Map();this.phases=new Map();this.composites=new Map();}
  clock(key,now,frozen=false){
    const previous=this.phases.get(key);
    const phase=!previous||now<previous.now?now:previous.phase+(frozen?0:now-previous.now);
    this.phases.set(key,{now,phase});
    if(this.phases.size>256)this.phases.delete(this.phases.keys().next().value);
    return phase;
  }
  frame(id,animation,direction,index,image,meta,clock,reduced){
    if(!WING_RIGS[id]||reduced||!image.naturalWidth||!(animation==='Hop'||id===6&&animation==='Shoot'))return null;
    const rig=WING_RIGS[id]?.directions[direction],points=SPRITE_GEOMETRY[id]?.[animation]?.points[direction]?.[index];
    if(!rig||!points)return null;
    const key=`${id}:${animation}:${direction}:${index}`;
    let entry=this.cache.get(key);
    if(!entry){
      const w=meta.width,h=meta.height,source=canvas(w,h),ctx=source.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(image,index*w,direction*h,w,h,0,0,w,h);const original=ctx.getImageData(0,0,w,h),body=new Uint8ClampedArray(original.data);
      const shift=[points[2]-rig.body[0],points[3]-rig.body[1]],markers=[[points[2],points[3],1.5],[points[4],points[5],1.6],[points[6],points[7],1],[points[8],points[9],1]];
      const fixed=new Set((rig.fixedPixels||[]).map(([x,y])=>`${x},${y}`));
      const wings=rig.wings.map(wing=>({...wing,side:wing.polygon.reduce((sum,p)=>sum+p[0],0)/wing.polygon.length<wing.root[0]?1:-1,root:[wing.root[0]+shift[0],wing.root[1]+shift[1]],pixels:new Uint8ClampedArray(body.length)}));
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const n=(y*w+x)*4;if(!original.data[n+3])continue;
        if(fixed.has(`${x-shift[0]},${y-shift[1]}`)||markers.some(([mx,my,r])=>Math.hypot(x-mx,y-my)<=r))continue;
        for(let i=0;i<wings.length;i++){
          const wing=wings[i],mx=x+.5-shift[0],my=y+.5-shift[1];if(!insideWing(mx,my,wing.polygon)&&!wingEdge(mx,my,wing.polygon))continue;
          const rootDistance=Math.hypot(x-wing.root[0],y-wing.root[1]);
          wing.pixels.set(original.data.subarray(n,n+4),n);
          if(rootDistance>2.5)body[n+3]=0;
          break;
        }
      }
      const bodyCanvas=canvas(w,h);bodyCanvas.getContext('2d').putImageData(new ImageData(body,w,h),0,0);
      for(const wing of wings){wing.image=canvas(w,h);wing.image.getContext('2d').putImageData(new ImageData(wing.pixels,w,h),0,0);delete wing.pixels;}
      wings.sort((a,b)=>Number(a.name==='near')-Number(b.name==='near'));
      // The current three rigs use at most 104 native frame/view keys. Keep their
      // small immutable layers, and share one immediate-use composite per size.
      const padding=12,resolution=4,size=`${w}:${h}`;
      let composite=this.composites.get(size);
      if(!composite){composite=canvas((w+padding*2)*resolution,(h+padding*2)*resolution);this.composites.set(size,composite);}
      entry={body:bodyCanvas,wings,composite,padding,w,h};this.cache.set(key,entry);
      if(this.cache.size>128)this.cache.delete(this.cache.keys().next().value);
    }
    const {composite,padding,w,h}=entry,c=composite.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,composite.width,composite.height);c.imageSmoothingEnabled=false;c.scale(4,4);
    const frequency=id===123?7.5:id===373?2.2:2.6,amplitude=id===123?.34:.24;
    const wave=Math.sin(clock*Math.PI*2*frequency);
    for(const wing of entry.wings){
      c.save();c.translate(padding+wing.root[0],padding+wing.root[1]);c.rotate(wing.side*wave*amplitude);c.scale(1,.94+.06*Math.cos(clock*Math.PI*2*frequency));
      c.drawImage(wing.image,-wing.root[0],-wing.root[1]);c.restore();
    }
    c.drawImage(entry.body,padding,padding);
    return{image:composite,padding,width:w+padding*2,height:h+padding*2,resolution:4};
  }
}
