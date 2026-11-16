import { SPRITE_GEOMETRY } from './sprite-geometry.js?v=34';

const canvas=(width,height)=>{const c=document.createElement('canvas');c.width=width;c.height=height;return c;};
const flowerColor=(r,g,b)=>r>g*1.35&&r>b*1.2?0:b>r*1.25&&b>g*.95?1:-1;

// Roselia's native rear Shoot hides both flowers almost immediately. Articulate
// only its own bouquets during anticipation; the body, feet and release remain
// the authored poses. Immutable layers are read once per view, never each draw.
export class RoseliaBouquets{
  constructor(){this.cache=new Map();}
  frame(id,animation,direction,image,meta,preparation){
    if(id!==315||animation!=='Shoot'||!preparation||!image.naturalWidth)return null;
    let entry=this.cache.get(direction);
    if(!entry){
      const points=SPRITE_GEOMETRY[315].Shoot.points[direction],open=points[0],release=points[3],w=meta.width,h=meta.height;
      const source=canvas(w,h),ctx=source.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(image,0,direction*h,w,h,0,0,w,h);
      const original=ctx.getImageData(0,0,w,h),body=new Uint8ClampedArray(original.data),seeds=[[],[]];
      const markers=[[open[6],open[7]],[open[8],open[9]]];
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const n=(y*w+x)*4;if(!original.data[n+3])continue;
        const color=flowerColor(...original.data.subarray(n,n+3));
        if(color>=0&&markers.some(p=>Math.hypot(x-p[0],y-p[1])<8))seeds[color].push([x,y]);
      }
      const flowers=seeds.map(pixels=>{
        const center=pixels.reduce((p,q)=>[p[0]+q[0]/pixels.length,p[1]+q[1]/pixels.length],[0,0]);
        const hand=Math.hypot(center[0]-markers[0][0],center[1]-markers[0][1])<Math.hypot(center[0]-markers[1][0],center[1]-markers[1][1])?0:1;
        const mask=new Set(pixels.map(([x,y])=>y*w+x));
        for(const[x,y]of pixels)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;
          const n=(ny*w+nx)*4,[r,g,b,a]=original.data.subarray(n,n+4);
          if(a&&!(g>r*.95&&g>b*.9&&g>60))mask.add(ny*w+nx);
        }
        const layer=new Uint8ClampedArray(body.length);
        for(const index of mask){const n=index*4;layer.set(original.data.subarray(n,n+4),n);body[n+3]=0;}
        const part=canvas(w,h);part.getContext('2d').putImageData(new ImageData(layer,w,h),0,0);
        const end=[open[0]+(release[6+hand*2]-release[0])*.65,open[1]+release[7+hand*2]-release[1]];
        return{image:part,center,from:markers[hand],to:end};
      });
      const fixed=canvas(w,h);fixed.getContext('2d').putImageData(new ImageData(body,w,h),0,0);
      entry={body:fixed,flowers,w,h,root:[open[2],open[3]],composite:canvas(w*4,h*4)};this.cache.set(direction,entry);
    }
    const c=entry.composite.getContext('2d'),gather=preparation.gather;
    c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,entry.composite.width,entry.composite.height);c.imageSmoothingEnabled=false;c.scale(4,4);
    // Stems connect to the torso behind its native leaves; the flowers retain
    // their original palette, outline and size instead of becoming light dots.
    for(const flower of entry.flowers){
      const x=flower.from[0]+(flower.to[0]-flower.from[0])*gather,y=flower.from[1]+(flower.to[1]-flower.from[1])*gather;
      c.beginPath();c.moveTo(...entry.root);c.lineTo(x,y);c.strokeStyle='#203f18';c.lineWidth=2;c.stroke();
      c.strokeStyle='#78a640';c.lineWidth=1;c.stroke();
    }
    c.drawImage(entry.body,0,0);
    for(const flower of entry.flowers)c.drawImage(flower.image,(flower.to[0]-flower.from[0])*gather,(flower.to[1]-flower.from[1])*gather);
    return{image:entry.composite,padding:0,width:entry.w,height:entry.h};
  }
}
