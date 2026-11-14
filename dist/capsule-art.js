export const CAPSULE_TEXTURE='assets/battle/pokeball-material-v2.png';
export const CAPSULE_FRAME_SIZE=64,CAPSULE_PHASES=96;
const TAU=Math.PI*2,AXES=32,SLOTS=256,COLUMNS=16;
const normals=Array.from({length:CAPSULE_FRAME_SIZE**2},(_,index)=>{
  const x=(index%CAPSULE_FRAME_SIZE+.5)*2/CAPSULE_FRAME_SIZE-1,y=1-(Math.floor(index/CAPSULE_FRAME_SIZE)+.5)*2/CAPSULE_FRAME_SIZE;
  if(x*x+y*y>1)return null;
  const z=Math.sqrt(1-x*x-y*y),light=Math.max(0,-x*.45+y*.72+z*.52);
  return[x,y,z,Math.round((.58+.42*light)/.065)*.065,Math.pow(Math.max(0,-x*.38+y*.62+z*.69),36)*42];
});
const wrap=value=>((value%TAU)+TAU)%TAU;
export const capsulePhase=angle=>Math.floor(wrap(angle)/TAU*CAPSULE_PHASES+1e-7)%CAPSULE_PHASES;

// Rotate the MATERIAL over a sphere. The screen-space light never turns with it.
// The rolling axis lies in the screen plane, perpendicular to the flight vector.
export function capsulePixels(angle=0,axis=0,texture=null,output=new Uint8ClampedArray(CAPSULE_FRAME_SIZE**2*4)){
  const phase=capsulePhase(angle)*TAU/CAPSULE_PHASES,cos=Math.cos(phase),sin=Math.sin(phase),ax=Math.cos(axis),ay=Math.sin(axis);
  output.fill(0);
  for(let index=0;index<normals.length;index++){
    const normal=normals[index];if(!normal)continue;
    const[nx,ny,nz,shade,specular]=normal,dot=ax*nx+ay*ny;
    const lx=nx*cos-ay*nz*sin+ax*dot*(1-cos),ly=ny*cos+ax*nz*sin+ay*dot*(1-cos),lz=nz*cos-(ax*ny-ay*nx)*sin;
    const u=(.5+Math.atan2(lx,lz)/TAU+1)%1,v=.5-Math.asin(Math.max(-1,Math.min(1,ly)))/Math.PI;
    let red,green,blue;
    if(texture){
      const x=Math.min(texture.width-1,Math.floor(u*texture.width)),y=Math.min(texture.height-1,Math.floor(v*texture.height)),at=(y*texture.width+x)*4;
      red=texture.data[at];green=texture.data[at+1];blue=texture.data[at+2];
    }else{
      // A failed texture still gets the same rotating material and pixel shading.
      const latch=Math.hypot((u-.5)*2,v-.5),belt=Math.abs(v-.5)<.016;
      const color=latch<.065?[246,240,215]:latch<.08?[131,143,144]:latch<.102||belt?[32,42,46]:v<.5?[224,42,45]:[244,237,216];
      [red,green,blue]=color;
    }
    const at=index*4;
    if(nz<.25){output[at]=35;output[at+1]=45;output[at+2]=46;}
    else{
      output[at]=Math.min(255,Math.round((red*shade+specular)/4)*4);
      output[at+1]=Math.min(255,Math.round((green*shade+specular)/4)*4);
      output[at+2]=Math.min(255,Math.round((blue*shade+specular)/4)*4);
    }
    output[at+3]=255;
  }
  return{width:CAPSULE_FRAME_SIZE,height:CAPSULE_FRAME_SIZE,data:output};
}

function surface(width,height){
  const canvas=typeof document!=='undefined'?document.createElement('canvas'):new OffscreenCanvas(width,height);
  canvas.width=width;canvas.height=height;return canvas;
}
export class CapsuleArt{
  constructor(image){
    if(image){const source=surface(512,256),ctx=source.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,512,256);this.texture=ctx.getImageData(0,0,512,256);}
    this.atlas=surface(CAPSULE_FRAME_SIZE*COLUMNS,CAPSULE_FRAME_SIZE*SLOTS/COLUMNS);this.ctx=this.atlas.getContext('2d');
    this.pixels=this.ctx.createImageData(CAPSULE_FRAME_SIZE,CAPSULE_FRAME_SIZE);this.cache=new Map();this.stats={built:0,totalMs:0,maxMs:0};
  }
  frame(angle,axis=0){
    const phase=capsulePhase(angle),direction=phase?Math.round(wrap(axis)/TAU*AXES)%AXES:0,key=direction+':'+phase;
    let frame=this.cache.get(key);
    if(frame){this.cache.delete(key);this.cache.set(key,frame);return frame;}
    const started=performance.now();let slot=this.cache.size;
    if(slot===SLOTS){const oldest=this.cache.keys().next().value;slot=this.cache.get(oldest).slot;this.cache.delete(oldest);}
    capsulePixels(phase*TAU/CAPSULE_PHASES,direction*TAU/AXES,this.texture,this.pixels.data);
    frame={slot,x:slot%COLUMNS*CAPSULE_FRAME_SIZE,y:Math.floor(slot/COLUMNS)*CAPSULE_FRAME_SIZE,phase,direction};
    this.ctx.putImageData(this.pixels,frame.x,frame.y);this.cache.set(key,frame);
    const elapsed=performance.now()-started;this.stats.built++;this.stats.totalMs+=elapsed;this.stats.maxMs=Math.max(this.stats.maxMs,elapsed);return frame;
  }
  draw(c,x,y,size,angle=0,axis=0){
    const frame=this.frame(angle,axis);this.lastFrame=frame;
    c.drawImage(this.atlas,frame.x,frame.y,CAPSULE_FRAME_SIZE,CAPSULE_FRAME_SIZE,x-size/2,y-size/2,size,size);
  }
}
let fallback;
export function drawCapsule(c,x,y,size,angle=0,axis=0,art){
  (art||(fallback??=new CapsuleArt())).draw(c,x,y,size,angle,axis);
}
