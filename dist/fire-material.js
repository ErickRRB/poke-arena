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

// A complete fire wheel has a rim, an inner surface and rotating hot seams.
// The structure turns with distance; individual flames burn on the cast clock.
export function drawFireWheel(c,pose,drawFlame,{vertical=1,reduced=false,opacity=1}={}){
  const age=reduced?.4:pose.age,spin=reduced?.35:pose.spin;
  c.save();c.translate(pose.x,pose.y);c.scale(1,1/vertical);c.globalAlpha*=opacity;
  c.fillStyle='#372b2638';c.beginPath();c.ellipse(0,5,43,7,0,0,Math.PI*2);c.fill();
  c.translate(0,-17);c.lineJoin='round';c.lineCap='round';
  const ring=(rx,ry,width,color,shift=0)=>{
    c.beginPath();
    for(let i=0;i<=48;i++){
      const a=i*Math.PI/24,ripple=reduced?0:1.1*Math.sin(a*5-age*9)+.6*Math.sin(a*9+age*6);
      const x=Math.cos(a)*(rx+ripple),y=Math.sin(a)*(ry+ripple*.7)+shift;
      if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
    }
    c.strokeStyle=color;c.lineWidth=width;c.stroke();
  };
  ring(32,25,12,'#a83d23',3);
  ring(33,25,10,'#ee6b23');ring(31,23,6,'#ffb83d');ring(28,21,2.5,'#ffeb96');
  c.fillStyle='#e57d2528';c.beginPath();c.ellipse(0,0,23,17,0,0,Math.PI*2);c.fill();
  // Unequal seams are landmarks, so rotation is perceptible on a symmetric rim.
  for(let i=0;i<5;i++){
    const a=spin+i*Math.PI*2/5,arc=i===0?.45:.19;
    c.beginPath();c.ellipse(0,0,33,25,0,a,a+arc);
    c.strokeStyle=i===0?'#fff2bd':'#ffdb70';c.lineWidth=i===0?4:2.5;c.stroke();
    const inner=a+.09;c.strokeStyle='#d54c22';c.lineWidth=2;c.beginPath();
    c.moveTo(Math.cos(inner)*24,Math.sin(inner)*17);c.lineTo(Math.cos(inner)*34,Math.sin(inner)*26);c.stroke();
  }
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4+spin*.25,x=Math.cos(a)*33,y=Math.sin(a)*24;
    const size=15+(reduced?0:2*Math.sin(age*11+i*1.7));
    drawFlame('emberShot',x,y,size,a+Math.PI*.7,{frame:flameFrame(age,reduced,i),trim:true});
  }
  for(let i=0;i<2;i++){
    const a=spin+i*Math.PI;c.save();c.globalAlpha*=.75;
    drawFlame('emberShot',Math.cos(a)*10,Math.sin(a)*7,18,a-Math.PI/2,{frame:flameFrame(age,reduced,i*3),trim:true});c.restore();
  }
  c.restore();
}
