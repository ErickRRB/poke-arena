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

// The upright face and its offset back edge give the wheel thickness. Surface
// landmarks roll with distance; tongues and hot currents use the cast clock.
export function drawFireWheel(c,pose,drawFlame,{vertical=1,reduced=false,opacity=1}={}){
  const age=reduced?.4:pose.age,spin=pose.spin;
  c.save();c.translate(pose.x,pose.y);c.scale(1,1/vertical);c.globalAlpha*=opacity;
  c.fillStyle='#372b2638';c.beginPath();c.ellipse(1,4,35,6,0,0,Math.PI*2);c.fill();
  c.translate(-3,-35);c.lineJoin='round';c.lineCap='round';
  const ring=(rx,ry,width,color,offsetX=0,offsetY=0)=>{
    c.beginPath();
    for(let i=0;i<=48;i++){
      const a=i*Math.PI/24,ripple=reduced?0:.8*Math.sin(a*5-age*9)+.5*Math.sin(a*9+age*6);
      const x=Math.cos(a)*(rx+ripple)+offsetX,y=Math.sin(a)*(ry+ripple)+offsetY;
      if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
    }
    c.strokeStyle=color;c.lineWidth=width;c.stroke();
  };
  ring(25,30,12,'#8f3023',8,1);ring(25,30,8,'#c64a21',7,0);
  ring(25,30,12,'#b3421f');ring(25,30,9,'#ed6b21');ring(24,29,4,'#ffba43');
  c.fillStyle='#ec8b2424';c.beginPath();c.ellipse(2,0,19,24,0,0,Math.PI*2);c.fill();
  for(let i=0;i<7;i++){
    const a=spin+i*Math.PI*2/7,arc=i===0?.52:.22;
    c.beginPath();c.ellipse(0,0,25,30,0,a,a+arc);
    c.strokeStyle=i===0?'#fff0ad':'#ffd366';c.lineWidth=i===0?5:3;c.stroke();
    const inner=a+.12;c.strokeStyle='#ce4a20';c.lineWidth=3;c.beginPath();
    c.moveTo(Math.cos(inner)*20,Math.sin(inner)*24);c.lineTo(Math.cos(inner)*29,Math.sin(inner)*35);c.stroke();
  }
  for(let i=0;i<11;i++){
    const a=i*Math.PI*2/11+spin*.18,x=Math.cos(a)*25,y=Math.sin(a)*30;
    const size=16+(reduced?0:3*Math.sin(age*11+i*1.7));
    drawFlame('emberShot',x,y,size,a+Math.PI*.6,{frame:flameFrame(age,reduced,i),trim:true});
  }
  for(let i=0;i<2;i++){
    const a=spin+i*Math.PI;c.save();c.globalAlpha*=.6;
    drawFlame('emberShot',Math.cos(a)*10,Math.sin(a)*14,18,a-Math.PI/2,{frame:flameFrame(age,reduced,i*3),trim:true});c.restore();
  }
  c.restore();
}
