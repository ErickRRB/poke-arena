const FLAME_FRAMES=Object.freeze([3,4,5,6,7,8,7,6,5,4]);
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));

// Active flame silhouettes only: the Weather Ball atlas is a birth flash and
// one static flame, so alternating its two frames would not animate combustion.
export function flameFrame(age,reduced=false,offset=0){
  return reduced?5:FLAME_FRAMES[((Math.floor(Math.max(0,age)*14)+offset)%FLAME_FRAMES.length+FLAME_FRAMES.length)%FLAME_FRAMES.length];
}

export function rollingFirePose(spell,previous,dt=0){
  const distance=spell.card.travelDistance,speed=spell.card.travelSpeed||96;
  const logical=clamp(distance-(spell.travelRemaining??distance),0,distance)/speed;
  // Display cadence follows the native path between CPU ticks/wire packets.
  // Prediction is bounded to one room interval and never changes the spell.
  const elapsed=previous?Math.max(logical,Math.min(logical+1/15,previous.elapsed+Math.max(0,dt))):logical;
  const travelled=Math.min(distance,elapsed*speed),direction=spell.team?1:-1;
  const startY=spell.startY??spell.y-direction*logical*speed;
  return{kind:'rollingFire',elapsed,logical,travelled,direction,startY,
    x:spell.x,y:startY+direction*travelled,endY:startY+direction*distance,
    age:previous?previous.age+Math.max(0,dt):logical,
    spin:direction*travelled/32,halfWidth:Math.max(0,spell.card.splash||0)};
}

export function fireWheelGeometry(halfWidth){
  if(!Number.isFinite(halfWidth)||halfWidth<=0)throw Error('A fire wheel needs its native rolling half-width');
  const faceRadius=Math.min(15,halfWidth*.45);
  return{halfWidth,left:-halfWidth,right:halfWidth,faceRadius,front:-halfWidth+faceRadius,back:halfWidth-faceRadius,depth:2*(halfWidth-faceRadius),radiusY:29};
}

export const FIRE_WHEEL_FILES=Object.freeze(['assets/battle/fire-wheel-v2/normal.webp','assets/battle/fire-wheel-v2/reduced.webp']);
export const FIRE_WHEEL_MATERIAL=Object.freeze({frames:128,columns:16,frameWidth:193,frameHeight:121,worldHeight:58});
// Shared by every Renderer in the page, including all laboratory columns.
// Renderer.load supplies decoded images from its existing shared image cache.
let wheelAtlases,wheelMaterialLoad;
export function setFireWheelMaterial(images){
  const m=FIRE_WHEEL_MATERIAL,width=m.columns*m.frameWidth,height=Math.ceil(m.frames/m.columns)*m.frameHeight;
  if(images.length!==2||images.some(image=>(image?.naturalWidth??image?.width)!==width||(image?.naturalHeight??image?.height)!==height))throw Error('No se pudo cargar el efecto de fuego.');
  wheelAtlases=images;
}
export function loadFireWheelMaterial(loadImage){
  if(!wheelMaterialLoad){
    const images=FIRE_WHEEL_FILES.map(file=>Promise.resolve().then(()=>loadImage(file)));
    const ready=Promise.all(images).then(setFireWheelMaterial).catch(error=>{wheelMaterialLoad=null;throw error;});
    wheelMaterialLoad=Object.freeze({images:Object.freeze(images),ready});
  }
  return wheelMaterialLoad;
}
export function fireWheelFrame(spin){
  const phase=spin/(Math.PI*2);
  return Math.floor((phase-Math.floor(phase))*FIRE_WHEEL_MATERIAL.frames)%FIRE_WHEEL_MATERIAL.frames;
}

// The authored opaque body includes its flame contours. Its width is the
// native corridor, independently of shadows, trails, targets and cast age.
export function drawFireWheelBody(c,pose,{vertical=1,reduced=false,opacity=1,halfWidth=pose.halfWidth}={}){
  if(!wheelAtlases)return false; // Initial/error overlays keep interaction gated.
  fireWheelGeometry(halfWidth);
  const m=FIRE_WHEEL_MATERIAL,frame=fireWheelFrame(pose.spin),image=wheelAtlases[reduced?1:0];
  c.save();c.translate(pose.x,pose.y);c.scale(1,1/vertical);c.globalAlpha*=opacity;
  c.imageSmoothingEnabled=false;
  c.drawImage(image,(frame%m.columns)*m.frameWidth,Math.floor(frame/m.columns)*m.frameHeight,m.frameWidth,m.frameHeight,-halfWidth,-m.worldHeight,halfWidth*2,m.worldHeight);
  c.restore();return true;
}

export function drawFireWheel(c,pose,drawFlame,{vertical=1,reduced=false,opacity=1,halfWidth=pose.halfWidth}={}){
  if(!wheelAtlases)return false;
  c.save();c.translate(pose.x,pose.y);c.scale(1,1/vertical);c.globalAlpha*=opacity;
  c.fillStyle='#372b2638';c.beginPath();c.ellipse(0,4,halfWidth,6,0,0,Math.PI*2);c.fill();c.restore();
  return drawFireWheelBody(c,pose,{vertical,reduced,opacity,halfWidth});
}
