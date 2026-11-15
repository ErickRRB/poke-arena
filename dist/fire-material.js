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
    spin:direction*travelled/32};
}

// A closed molten wheel: fixed light on the sidewall gives volume, while large
// surface currents and tread marks turn around it with the distance travelled.
export function drawFireWheel(c,pose,drawFlame,{vertical=1,reduced=false,opacity=1}={}){
  const age=reduced?.4:pose.age,spin=pose.spin;
  c.save();c.translate(pose.x,pose.y);c.scale(1,1/vertical);c.globalAlpha*=opacity;
  const face=(x,y,rx,ry,color)=>{
    c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();
  };
  face(2,4,32,6,'#372b2638');c.translate(-5,-29);c.lineJoin='round';c.lineCap='round';
  face(10,0,23,29,'#8d3122');face(7,-1,23,29,'#c44820');
  face(0,0,23,29,'#a53520');face(-1,-2,21,27,'#df6221');
  face(-4,-5,17,22,'#f6972b');face(-6,-9,12,16,'#ffc450');
  // The paint moves over a shaded solid face, not around an empty aperture.
  c.save();c.beginPath();c.ellipse(-1,-1,21,27,0,0,Math.PI*2);c.clip();c.scale(.76,1);c.rotate(spin);
  const current=(points,width,color)=>{
    c.beginPath();c.moveTo(points[0],points[1]);c.bezierCurveTo(...points.slice(2));c.strokeStyle=color;c.lineWidth=width;c.stroke();
  };
  current([-28,-10,-9,-31,7,18,28,-2],12,'#bb3b20');
  current([-28,-13,-9,-34,7,15,28,-5],6,'#ffe88e');
  current([-25,16,-8,-9,9,34,27,8],10,'#d34c1e');
  current([-25,13,-8,-12,9,31,27,5],4,'#ffbf47');
  face(-13,-10,5,6,'#fff1b1');face(14,12,4,5,'#f78822');c.restore();
  // Bands on the curved side move across its depth and disappear at the back.
  for(let i=0;i<3;i++){
    const a=spin+i*Math.PI*2/3;if(Math.cos(a)<0)continue;
    const x=Math.cos(a)*22,y=Math.sin(a)*28;
    c.beginPath();c.moveTo(x,y);c.lineTo(x+9,y+1);c.strokeStyle=i===0?'#ffe19a':'#ec8a2b';c.lineWidth=i===0?5:3;c.stroke();
  }
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3+spin*.12,x=Math.cos(a)*23,y=Math.sin(a)*28;
    const size=14+(reduced?0:2*Math.sin(age*11+i*1.7));
    drawFlame('emberShot',x,y,size,a+Math.PI*.6,{frame:flameFrame(age,reduced,i),trim:true});
  }
  c.restore();
}
