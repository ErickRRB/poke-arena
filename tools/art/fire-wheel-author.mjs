// V2: same material/geometry with two distance-locked, trackable flame streams.
// Local art proposal only. No engine or production file imports/mutations.
// Generated original raster is the colour field, not a recoloured primitive.
export const MATERIAL = Object.freeze({
  frames:128, columns:16, frameWidth:193, frameHeight:121,
  worldWidth:93.6, worldHeight:58, angularPeriod:Math.PI*2,
  distancePerTurn:Math.PI*2*32, source:'fire-texture-original-v1.png',
});
const TAU=Math.PI*2, clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const fract=n=>n-Math.floor(n), smooth=n=>n*n*(3-2*n);
const ramp=(a,b,n)=>smooth(clamp((n-a)/(b-a),0,1));
const angularDistance=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
let atlas, reducedAtlas, proof, initPromise;

// These are organic patches in material coordinates, not time-born sparks.
// The primary has one broad hooked head; the smaller second stream is offset
// around the back and favours the far end. Their identities survive a turn.
function flameStreams(axial,materialAngle,radius=1){
  const bend=.35+.55*Math.sin(axial*Math.PI*1.5)+.28*axial;
  const faceCurl=.75*(1-radius);
  const organic=.07*Math.sin(axial*19+materialAngle*4)+.035*Math.sin(axial*43-materialAngle*7);
  const firstCenter=bend+faceCurl+organic;
  const secondCenter=bend+Math.PI+.25+.25*Math.sin(axial*Math.PI)+faceCurl+organic*.6;
  const firstWidth=.22+.14*Math.sin(axial*Math.PI);
  const secondWidth=.17+.08*Math.sin(axial*Math.PI);
  const d1=angularDistance(materialAngle,firstCenter),d2=angularDistance(materialAngle,secondCenter);
  const first=(1-.7*ramp(.62,.98,axial))*Math.exp(-((d1/firstWidth)**2)*.5);
  const second=(.32+.5*ramp(.05,.72,axial))*Math.exp(-((d2/secondWidth)**2)*.5);
  const centerFade=ramp(.04,.25,radius);
  return Math.max(first,second)*centerFade;
}

function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
async function loadImage(url){const i=new Image();i.src=url;await i.decode();return i;}

// Overlap the source's opposite edges, retaining its large flame shapes.
// The overlap has matching values/derivatives at each periodic boundary.
function periodicTexture(image){
  const c=canvas(256,256),ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,0,0,256,256);const raw=ctx.getImageData(0,0,256,256).data;
  const out=new Uint8ClampedArray(256*256*4);
  const at=(u,v,k)=>raw[(clamp(Math.floor(v*255),0,255)*256+clamp(Math.floor(u*255),0,255))*4+k];
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const u=x/256*.8,v=y/256*.8,wx=u<.2?smooth(u/.2):1,wy=v<.2?smooth(v/.2):1;
    const ux=u<.2?u+.8:u,vy=v<.2?v+.8:v;
    const p=(y*256+x)*4;
    for(let k=0;k<3;k++)out[p+k]=
      at(u,v,k)*wx*wy+at(ux,v,k)*(1-wx)*wy+
      at(u,vy,k)*wx*(1-wy)+at(ux,vy,k)*(1-wx)*(1-wy);
    out[p+3]=255;
  }
  return out;
}

function bakeFrame(texture,phase,flutter=true){
  const {frameWidth:w,frameHeight:h}=MATERIAL;
  const pixels=new Uint8ClampedArray(w*h*4),half=46.8,front=-31.8,back=31.8,rx=15,ry=29;
  const flicker=flutter?phase:0,cs=Math.cos(phase),sn=Math.sin(phase);
  for(let py=0;py<h;py++)for(let px=0;px<w;px++){
    const x=-half+px/(w-1)*half*2,y=-ry+py/(h-1)*ry*2;
    const end=x<front?(x-front)/rx:x>back?(x-back)/rx:0;
    if(end*end+(y/ry)**2>1.00001)continue;
    // Undulating flame peaks carve the contour inward. The opaque mass never
    // shrinks with cast age and keeps both native edges, with no halo support.
    const crest=4.8*Math.max(0,Math.sin(x*.31+flicker*2)+.24*Math.sin(x*.67-flicker*3)-.15);
    const sole=1.5*Math.max(0,Math.sin(x*.37-flicker*3)-.2);
    if(x>front&&x<back&&(y< -ry+crest||y>ry-sole))continue;
    const nx=(x-front)/rx,ny=y/ry,face=nx*nx+ny*ny<=1;
    let u,v,shade,materialAngle,axial,radius=1;
    if(face){
      radius=Math.sqrt(nx*nx+ny*ny);
      materialAngle=Math.atan2(ny,nx)+phase;
      axial=0;
      const turnX=nx*cs+ny*sn,turnY=ny*cs-nx*sn;
      const swirl=.13*(1-Math.min(1,nx*nx+ny*ny));
      u=.48+turnX*.36+swirl*Math.sin(3*Math.atan2(turnY,turnX)+flicker);
      v=.5+turnY*.36+swirl*Math.cos(3*Math.atan2(turnY,turnX)+flicker);
      shade=.84+.16*Math.sqrt(Math.max(0,1-nx*nx-ny*ny));
    }else{
      const angle=Math.asin(clamp(y/ry,-1,1));
      // At the front rim this axial coordinate is exactly0, so a stream
      // crossing the face continues across the exposed surface coherently.
      axial=clamp((x-rx*Math.cos(angle)-front)/(back-front),0,1);
      materialAngle=angle+phase;
      u=(x+half)/(half*2)*.88+.025*Math.sin(angle*3-flicker*2)+.018*Math.sin(x*.21+flicker*3);
      v=angle/TAU+phase/TAU+.028*Math.sin(u*TAU*3-flicker*2);
      shade=.8+.2*Math.sqrt(Math.max(0,1-(y/ry)**2));
    }
    const tx=Math.floor(fract(u)*256),ty=Math.floor(fract(v)*256),s=(ty*256+tx)*4,p=(py*w+px)*4;
    const heat=(texture[s+1]-85)/170;
    const edge=Math.max(0,(Math.abs(y)/ry-.78)/.22)*Math.max(0,heat-.4);
    const stream=flameStreams(axial,materialAngle,radius);
    // Fine fire remains, while cream cores belong to the same large flowing
    // portions all the way around. No rim, axle or straight coloured seam.
    const mix=ramp(.08,.95,stream)*.82,core=ramp(.28,1,stream);
    const baseR=clamp(texture[s]*shade+edge*20,0,255);
    const baseG=clamp((texture[s+1]*.66+29)*shade+edge*20,0,255);
    const baseB=clamp(texture[s+2]*.6*shade+edge*18,0,255);
    pixels[p]=baseR*(1-mix)+255*mix;
    pixels[p+1]=baseG*(1-mix)+(185+62*core)*shade*mix;
    pixels[p+2]=baseB*(1-mix)+(39+151*core)*shade*mix;
    pixels[p+3]=255;
  }
  return new ImageData(pixels,w,h);
}

function bakeAtlas(texture,flutter){
  const m=MATERIAL,c=canvas(m.columns*m.frameWidth,Math.ceil(m.frames/m.columns)*m.frameHeight),ctx=c.getContext('2d');
  const bounds=[];let worstGap=0;
  for(let f=0;f<m.frames;f++){
    const data=bakeFrame(texture,f/m.frames*TAU,flutter);
    ctx.putImageData(data,(f%m.columns)*m.frameWidth,Math.floor(f/m.columns)*m.frameHeight);
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    const cols=new Set();
    for(let y=0;y<m.frameHeight;y++)for(let x=0;x<m.frameWidth;x++)if(data.data[(y*m.frameWidth+x)*4+3]){
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);cols.add(x);
    }
    let gaps=0;for(let x=minX;x<=maxX;x++)if(!cols.has(x))gaps++;
    worstGap=Math.max(worstGap,gaps);bounds.push({frame:f,bounds:[minX,minY,maxX+1,maxY+1],gaps});
  }
  return{canvas:c,bounds,worstGap};
}

export function initMaterial(url){
  if(!initPromise)initPromise=(async()=>{
    const started=performance.now(),source=await loadImage(url),texture=periodicTexture(source);
    const normal=bakeAtlas(texture,true),reduced=bakeAtlas(texture,false);
    atlas=normal.canvas;reducedAtlas=reduced.canvas;
    proof={...MATERIAL,sourcePixels:[source.naturalWidth,source.naturalHeight],normalBounds:normal.bounds,reducedBounds:reduced.bounds,worstColumnGap:Math.max(normal.worstGap,reduced.worstGap),bakeMs:performance.now()-started,
      method:'V2,128 raster samples per distance-driven turn. Same original texture, silhouette and shading; two asymmetric large flame streams fixed in material coordinates pass between the face and surface as spin advances. Fine turbulence stays secondary. Reduced freezes ornament and retains both structural streams. No additive halo or native sprite substitutions.',
      limits:'Prototype baking cost is authoring, not a production runtime budget. Static PNG atlases are exported for a future loader. Raster bounds are technical evidence, not an art verdict.'};
    return proof;
  })();
  return initPromise;
}

export async function loadBakedAtlases(normalUrl,reducedUrl){
  [atlas,reducedAtlas]=await Promise.all([loadImage(normalUrl),loadImage(reducedUrl)]);
}
export function materialProof(){return proof;}
export function atlasDataUrls(){return{normal:atlas.toDataURL('image/png'),reduced:reducedAtlas.toDataURL('image/png')};}
export function materialFrameIndex(spin){return Math.floor(fract(spin/TAU)*MATERIAL.frames)%MATERIAL.frames;}

export function drawMaterialBody(ctx,pose,{vertical=1,reduced=false,opacity=1,halfWidth=pose.halfWidth}={}){
  if(!atlas)throw Error('Material atlas has not been initialized');
  const m=MATERIAL,frame=materialFrameIndex(pose.spin),image=reduced?reducedAtlas:atlas;
  ctx.save();ctx.translate(pose.x,pose.y);ctx.scale(1,1/vertical);ctx.globalAlpha*=opacity;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(image,(frame%m.columns)*m.frameWidth,Math.floor(frame/m.columns)*m.frameHeight,m.frameWidth,m.frameHeight,-halfWidth,-m.worldHeight,halfWidth*2,m.worldHeight);
  ctx.restore();
}

export function drawMaterial(ctx,pose,drawFlame,{vertical=1,reduced=false,opacity=1,halfWidth=pose.halfWidth}={}){
  ctx.save();ctx.translate(pose.x,pose.y);ctx.scale(1,1/vertical);ctx.globalAlpha*=opacity;
  ctx.fillStyle='#372b2638';ctx.beginPath();ctx.ellipse(0,4,halfWidth,6,0,0,TAU);ctx.fill();ctx.restore();
  drawMaterialBody(ctx,pose,{vertical,reduced,opacity,halfWidth});
}
