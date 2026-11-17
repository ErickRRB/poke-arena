import {W,H,ARENA,LANES,RIVER,KING_Y,PRINCESS_Y} from './arena-geometry.js?v=34';

// Presentation only: original floor art and world-anchored worn-earth paths.
// All raster work happens inside the existing background-cache lifecycle.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
function hash(x,y,seed){
  let n=Math.imul(x,374761393)^Math.imul(y,668265263)^seed;
  n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;
}
function noise(x,y,size,seed){
  x/=size;y/=size;const ix=Math.floor(x),iy=Math.floor(y),u=smooth(x-ix),v=smooth(y-iy);
  return mix(mix(hash(ix,iy,seed),hash(ix+1,iy,seed),u),mix(hash(ix,iy+1,seed),hash(ix+1,iy+1,seed),u),v);
}
function texture(image,x,y,w,h,scale=1){
  if(!image)return null;
  const tile=document.createElement('canvas');tile.width=w*scale;tile.height=h*scale;
  const c=tile.getContext('2d');c.imageSmoothingEnabled=false;
  c.drawImage(image,x,y,w,h,0,0,tile.width,tile.height);return tile;
}

function trailGeometry(){
  const trails=[];
  const curve=(kind,seed,gap,a,b,c,d)=>{
    const points=[];
    for(let i=0;i<=24;i++){
      const t=i/24,u=1-t,x=u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0];
      const y=u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1];
      points.push({x,y,t,width:(kind==='lane'?16.5:10)*(.9+.24*noise(x,y,47,seed))});
    }
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y),margin=27;
    trails.push({kind,seed,gap,points,left:Math.min(...xs)-margin,right:Math.max(...xs)+margin,top:Math.min(...ys)-margin,bottom:Math.max(...ys)+margin});
  };
  for(const [index,lane] of LANES.entries()){
    const side=index?1:-1,seed=130+index*31;
    curve('lane',seed,0,[lane,PRINCESS_Y[1]],[lane+side*6,242],[lane-side*4,316],[lane,RIVER.top+4]);
    curve('lane',seed+3,0,[lane,RIVER.bottom-4],[lane-side*8,483],[lane+side*3,570],[lane,PRINCESS_Y[0]]);
    curve('approach',seed+9,index?.61:.43,[lane,PRINCESS_Y[1]],[lane-side*18,PRINCESS_Y[1]-22],[300+side*46,KING_Y[1]+26],[300,KING_Y[1]+8]);
    curve('approach',seed+17,index?.39:.57,[lane,PRINCESS_Y[0]],[lane-side*15,PRINCESS_Y[0]+24],[300+side*48,KING_Y[0]-28],[300,KING_Y[0]-8]);
  }
  return trails;
}
function trailAmount(trail,x,y){
  if(x<trail.left||x>trail.right||y<trail.top||y>trail.bottom)return 0;
  let best=Infinity,along=0,width=0;
  for(let i=1;i<trail.points.length;i++){
    const a=trail.points[i-1],b=trail.points[i],dx=b.x-a.x,dy=b.y-a.y;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));
    const px=x-a.x-dx*t,py=y-a.y-dy*t,d=px*px+py*py;
    if(d<best){best=d;along=mix(a.t,b.t,t);width=mix(a.width,b.width,t);}
  }
  const edge=(noise(x,y,13,trail.seed+2)-.5)*7+(hash(Math.floor(x/4),Math.floor(y/4),trail.seed)-.5)*2;
  const coverage=1-smooth((Math.sqrt(best)+edge-width+5)/10);
  let wear=.59+.31*noise(x,y,37,trail.seed+4);
  if(trail.kind==='approach'){
    // Reclaimed stretches break the continuous ring. These are differences
    // in floor wear, never objects or changes to a unit's physical route.
    const reclaimed=Math.exp(-Math.pow((along-trail.gap)/.14,2));
    wear=(.38+.23*noise(x,y,31,trail.seed+7))*(1-.9*reclaimed);
  }
  return coverage*wear;
}
function paintTrails(floor,bounds,ground){
  const {left,top,width,height}=bounds,soil=document.createElement('canvas');
  soil.width=floor.width;soil.height=floor.height;
  const c=soil.getContext('2d',{willReadFrequently:true});c.imageSmoothingEnabled=false;
  c.scale(.5,.5);c.translate(-left,-top);
  const dirt=texture(ground,146,240,24,72,2);
  c.fillStyle=dirt?c.createPattern(dirt,'repeat'):'#c8b384';c.fillRect(left,top,width,height);
  const image=c.getImageData(0,0,soil.width,soil.height),pixels=image.data,trails=trailGeometry();
  const pads=PRINCESS_Y.flatMap(y=>LANES.map(x=>({x,y,rx:25,ry:15}))).concat(KING_Y.map(y=>({x:300,y,rx:31,ry:17})));
  for(let py=0;py<soil.height;py++)for(let px=0;px<soil.width;px++){
    const x=left+px*2+1,y=top+py*2+1,index=(py*soil.width+px)*4;
    let amount=0;
    for(const trail of trails)amount=Math.max(amount,trailAmount(trail,x,y));
    for(const pad of pads){
      if(Math.abs(x-pad.x)>pad.rx*1.2||Math.abs(y-pad.y)>pad.ry*1.2)continue;
      const d=Math.hypot((x-pad.x)/pad.rx,(y-pad.y)/pad.ry);
      amount=Math.max(amount,(1-smooth((d-.5)/.65))*.56);
    }
    if(amount<=.01){pixels[index+3]=0;continue;}
    const shade=.91+.1*noise(x,y,29,883);
    // Slightly warmer, quieter earth lets the illustrated turf show through.
    pixels[index]*=shade*.98;pixels[index+1]*=shade*.97;pixels[index+2]*=shade*.89;
    pixels[index+3]=Math.round(amount*255);
  }
  c.putImageData(image,0,0);
  const destination=floor.getContext('2d');destination.save();destination.setTransform(1,0,0,1,0,0);
  destination.drawImage(soil,0,0);destination.restore();
}

export function paintArenaScenery(target,bounds,ground,meadow){
  const left=Math.floor(bounds.left/2)*2,top=Math.floor(bounds.top/2)*2;
  const width=Math.ceil((bounds.right-left)/2)*2,height=Math.ceil((bounds.bottom-top)/2)*2;
  const floor=document.createElement('canvas');floor.width=width/2;floor.height=height/2;
  const c=floor.getContext('2d');c.imageSmoothingEnabled=false;c.scale(.5,.5);c.translate(-left,-top);
  const lawn=texture(ground,200,224,120,128);
  c.fillStyle=lawn?c.createPattern(lawn,'repeat'):'#a8bf72';c.fillRect(left,top,width,height);
  if(meadow){
    c.drawImage(meadow,0,0,W,H);
    if(top<0){const h=-top,sourceHeight=meadow.height*h/H;c.drawImage(meadow,0,0,meadow.width,sourceHeight,0,top,W,h);}
    if(top+height>H){const h=top+height-H,sourceHeight=meadow.height*h/H;c.drawImage(meadow,0,meadow.height-sourceHeight,meadow.width,sourceHeight,0,H,W,h);}
  }
  paintTrails(floor,{left,top,width,height},ground);
  target.drawImage(floor,left,top,width,height);
  return lawn?target.createPattern(lawn,'repeat'):'#a8bf72';
}

// Real alpha bounds from the original1254px sprite sheet, plus4px padding.
// The original alpha/source/prompt and exact crops are kept with its provenance.
const BORDER_PARTS=Object.freeze({edgeA:[28,290,571,136],edgeB:[645,283,581,146],cornerA:[126,796,369,286],cornerB:[750,806,378,276]});
export function paintArenaBorder(c,image){
  if(!image)return;
  const sprite=(name,x,y,width,angle=0)=>{
    const [sx,sy,sw,sh]=BORDER_PARTS[name],height=width*sh/sw;
    c.save();c.translate(x,y);c.rotate(angle);
    c.drawImage(image,sx,sy,sw,sh,-width/2,-height/2,width,height);c.restore();
  };
  // Everything is additionally clipped outside ARENA by drawPerimeter.
  // The side strips occupy the24world units actually visible on mobile.
  const sizes=[90,96,92,94,88];
  for(let index=0,x=ARENA.left+56;x<ARENA.right-20;x+=84,index++){
    sprite(index%2?'edgeB':'edgeA',x,ARENA.top-12,sizes[index%sizes.length]);
    sprite(index%2?'edgeA':'edgeB',x+3,ARENA.bottom+12,sizes[(index+2)%sizes.length]);
  }
  for(const [start,end] of [[ARENA.top+50,RIVER.top-30],[RIVER.bottom+52,ARENA.bottom-20]]){
    for(let index=0,y=start;y<end;y+=82,index++){
      sprite(index%2?'edgeA':'edgeB',ARENA.left-12,y,sizes[index%sizes.length],Math.PI/2);
      sprite(index%2?'edgeB':'edgeA',ARENA.right+12,y+4,sizes[(index+1)%sizes.length],-Math.PI/2);
    }
  }
  sprite('cornerA',ARENA.left-22,ARENA.top-18,44);
  sprite('cornerB',ARENA.right+22,ARENA.top-18,44);
  sprite('cornerB',ARENA.left-22,ARENA.bottom+18,44);
  sprite('cornerA',ARENA.right+22,ARENA.bottom+18,44);
}
