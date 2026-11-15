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

// A solid disc with an oblique face and visible depth. The rim and radial
// currents preserve wheel identity while native flames keep the material alive.
export function drawFireWheel(c,pose,drawFlame,{vertical=1,reduced=false,opacity=1}={}){
  const age=reduced?.4:pose.age,spin=pose.spin;
  c.save();c.translate(pose.x,pose.y);c.scale(1,1/vertical);c.globalAlpha*=opacity;
  const face=(x,y,rx,ry,color)=>{
    c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();
  };
  face(2,4,32,6,'#372b2638');c.translate(-5,-29);c.lineJoin='round';c.lineCap='round';
  face(12,0,15,29,'#72231d');
  c.fillStyle='#b83c1d';c.fillRect(-4,-28,16,56);
  face(8,0,15,28,'#ce4b1b');
  face(-4,0,16,29,'#81271d');face(-4,0,14,27,'#f39c2b');
  // Opaque hot material fills the face; the darker center is never a hole.
  face(-4,0,10.5,21.5,'#9f3020');
  c.save();c.beginPath();c.ellipse(-4,0,10.5,21.5,0,0,Math.PI*2);c.clip();
  c.translate(-4,0);c.scale(.5,1);c.rotate(spin);
  for(let i=0;i<4;i++){
    c.save();c.rotate(i*Math.PI/2);
    c.beginPath();c.moveTo(0,0);c.bezierCurveTo(7,-5,15,-2,26,5);c.strokeStyle='#eb651f';c.lineWidth=10;c.stroke();
    c.beginPath();c.moveTo(0,0);c.bezierCurveTo(7,-5,15,-2,26,5);c.strokeStyle='#ffd468';c.lineWidth=4;c.stroke();
    c.restore();
  }
  face(0,0,5.5,5.5,'#ffe79a');c.restore();
  // Hot seams move over the exposed cylindrical edge with distance travelled.
  for(let i=0;i<6;i++){
    const a=spin+i*Math.PI/3;if(Math.cos(a)<0)continue;
    const x=-4+Math.cos(a)*14,y=Math.sin(a)*27;
    c.beginPath();c.moveTo(x,y);c.lineTo(x+16,y);c.strokeStyle=i%2?'#f18422':'#ffca57';c.lineWidth=3;c.stroke();
  }
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3+spin*.12,x=-4+Math.cos(a)*15,y=Math.sin(a)*28;
    const size=14+(reduced?0:2*Math.sin(age*11+i*1.7));
    drawFlame('emberShot',x,y,size,a+Math.PI*.6,{frame:flameFrame(age,reduced,i),trim:true});
  }
  c.restore();
}
