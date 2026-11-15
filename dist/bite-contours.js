const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));

// A contact is an occupied pixel on the current painted body, in actor-local
// world coordinates. Shadows, meters and status decals are excluded by paint.
export function contourContact(mask,from){
  if(!mask?.bounds)return null;
  const {width,height,alpha,left,top,scale,bounds:b}=mask;
  const center={x:left+(b.left+b.right+1)/2/scale,y:top+(b.top+b.bottom+1)/2/scale};
  let dx=from.x-center.x,dy=from.y-center.y,length=Math.hypot(dx,dy);
  if(length<1e-7){dx=-1;dy=0;length=1;}
  dx/=length;dy/=length;
  const span=Math.max(length+2,Math.hypot(b.right-b.left+2,b.bottom-b.top+2)/scale);
  const occupied=(x,y)=>{
    const px=Math.floor((x-left)*scale),py=Math.floor((y-top)*scale);
    return px>=0&&px<width&&py>=0&&py<height&&alpha[py*width+px]>=96?{x:left+(px+.5)/scale,y:top+(py+.5)/scale}:null;
  };
  for(let step=span;step>=0;step-=.45/scale){
    const hit=occupied(center.x+dx*step,center.y+dy*step);if(hit)return hit;
  }
  // A ray can cross the transparent gap between disjoint native body parts.
  // Choose the nearest actual part rather than manufacturing a solid ellipse.
  let nearest=null,distance=Infinity;
  for(let y=b.top;y<=b.bottom;y++)for(let x=b.left;x<=b.right;x++)if(alpha[y*width+x]>=96){
    const point={x:left+(x+.5)/scale,y:top+(y+.5)/scale},d=(point.x-from.x)**2+(point.y-from.y)**2;
    if(d<distance){distance=d;nearest=point;}
  }
  return nearest;
}

export class BiteContours{
  constructor(){this.records=new Map();this.maxEntries=12;this.maxSide=512;this.surface=null;this.frames=new Map();this.frameBytes=0;this.maxFrameEntries=64;this.maxFrameBytes=512*1024;}
  beginFrame(){this.records.clear();}
  contact(actor,from,box,paint,frameKey,offset={x:0,y:0}){
    let mask=this.records.get(actor.id);
    if(!this.records.has(actor.id)){
      mask=frameKey&&this.frames.get(frameKey);
      if(mask){this.frames.delete(frameKey);this.frames.set(frameKey,mask);}
      else{
      const scale=box.scale||Math.min(1,this.maxSide/(box.right-box.left),this.maxSide/(box.bottom-box.top));
      const width=clamp(Math.ceil((box.right-box.left)*scale),1,this.maxSide),height=clamp(Math.ceil((box.bottom-box.top)*scale),1,this.maxSide);
      const surface=this.surface??=document.createElement('canvas');surface.width=width;surface.height=height;
      const c=surface.getContext('2d',{willReadFrequently:true});c.imageSmoothingEnabled=false;c.setTransform(scale,0,0,scale,-box.left*scale,-box.top*scale);
      paint(c);
      const rgba=c.getImageData(0,0,width,height).data;
      const bounds={left:width,right:-1,top:height,bottom:-1};
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const a=rgba[(y*width+x)*4+3];
        if(a>=96){bounds.left=Math.min(bounds.left,x);bounds.right=Math.max(bounds.right,x);bounds.top=Math.min(bounds.top,y);bounds.bottom=Math.max(bounds.bottom,y);}
      }
      mask=null;
      if(bounds.right>=0){
        const w=bounds.right-bounds.left+1,h=bounds.bottom-bounds.top+1,alpha=new Uint8Array(w*h);
        for(let y=0;y<h;y++)for(let x=0;x<w;x++)alpha[y*w+x]=rgba[((y+bounds.top)*width+x+bounds.left)*4+3];
        mask={width:w,height:h,scale,alpha,left:box.left+bounds.left/scale,top:box.top+bounds.top/scale,bounds:{left:0,top:0,right:w-1,bottom:h-1}};
        if(frameKey&&alpha.length<=this.maxFrameBytes){
          while(this.frames.size&&(this.frames.size>=this.maxFrameEntries||this.frameBytes+alpha.length>this.maxFrameBytes)){
            const oldest=this.frames.keys().next().value;this.frameBytes-=this.frames.get(oldest).alpha.length;this.frames.delete(oldest);
          }
          this.frames.set(frameKey,mask);this.frameBytes+=alpha.length;
        }
      }
      }
      if(this.records.size>=this.maxEntries)this.records.delete(this.records.keys().next().value);
      this.records.set(actor.id,mask);
    }
    const local=contourContact(mask,{x:from.x-actor.x-offset.x,y:from.y-actor.y-offset.y});
    return local?{x:actor.x+offset.x+local.x,y:actor.y+offset.y+local.y}:null;
  }
}
