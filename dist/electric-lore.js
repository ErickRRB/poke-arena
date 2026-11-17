// Materials only. Resolve active keys as well as species: legacy Electrode and
// the actual chaining Electro Spirit must not inherit the Furnace's appearance.
export function electricLore(key,card){
  if(key==='centralElectrode'&&card?.id===101)return 'electrode';
  if(key==='fireSpiritToken'&&card?.id===100)return 'child';
  return null;
}
const clamp=value=>Math.max(0,Math.min(1,value));
const ease=value=>{value=clamp(value);return value*value*(3-2*value);};

// A continuous bend with fixed endpoints; no random per-frame teleporting.
export function electricArc(c,from,to,age,seed=0,width=2){
  const dx=to.x-from.x,dy=to.y-from.y,distance=Math.hypot(dx,dy);
  if(distance<.5)return;
  const nx=-dy/distance,ny=dx/distance,amplitude=Math.min(5,distance*.18);
  const points=[from];
  for(let i=1;i<5;i++){
    const t=i/5,bend=Math.sin(i*2.7+seed+age*19)*amplitude*Math.sin(Math.PI*t);
    points.push({x:from.x+dx*t+nx*bend,y:from.y+dy*t+ny*bend});
  }
  points.push(to);
  c.save();c.lineJoin='bevel';c.lineCap='square';
  for(const [color,w] of [['#19394d',width+2],['#ffe52b',width],['#fffce5',Math.max(.8,width*.45)]]){
    c.strokeStyle=color;c.lineWidth=w;c.beginPath();
    points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();
  }
  c.restore();
}

export function electricUnitState(unit){
  const lore=electricLore(unit.key,unit.card);
  if(!lore||unit.preview||unit.mounted||unit.hp<=0||unit.stun>0||unit.spawn>0)return null;
  if(lore==='child'){
    // Native spirits prepare their leap without emitting attackStart. Read
    // that live phase; spawning, walking and flight are not attack charge.
    const remaining=unit.leap?.prepare,windup=unit.attackWindup??unit.card.windup;
    if(!(remaining>0&&windup>0))return null;
    return{energy:.25+.75*ease(1-remaining/windup),phase:'prepare'};
  }
  const windup=unit.attackWindup??unit.card.windup,duration=unit.attackDuration??unit.card.attackDuration;
  const elapsed=duration-unit.attack;
  if(unit.attack>0&&windup>0&&elapsed>=0&&elapsed<windup)return{energy:.25+.75*ease(elapsed/windup),phase:'charge'};
  return null;
}

export function drawElectricAura(c,{x,y,radius,energy,age,seed=0,reduced=false,vertical=1,birth=false}){
  c.save();c.translate(x,y);c.scale(1,1/vertical);
  const clock=reduced?0:age;
  if(birth){
    // Side forks make the real birth legible without covering the small face
    // or drawing an extra summon. Their clock/extent is the native spawn state.
    const r=radius+2;c.globalAlpha*=.5+.5*energy;
    for(const side of [-1,1]){
      electricArc(c,{x:side*(r-1),y:-r*.35},{x:side*(r+5),y:r*.55},clock,side,2.5);
      electricArc(c,{x:side*(r+3),y:r*.15},{x:side*(r+10),y:-r*.25},clock,side+2,2.1);
    }
    c.restore();return;
  }
  for(let i=0;i<(reduced?2:3);i++){
    const a=seed*.73+i*Math.PI*2/3+.16*Math.sin(clock*7+i),r=radius+2+energy*2;
    const from={x:Math.cos(a-.18)*r,y:Math.sin(a-.18)*r};
    const to={x:Math.cos(a+.3)*(r+2),y:Math.sin(a+.3)*(r+2)};
    c.save();c.globalAlpha*=.65+.35*energy;electricArc(c,from,to,clock,seed+i,2.1);c.restore();
    if(!reduced){c.fillStyle='#fff0a7';c.fillRect(Math.cos(a)*r-1,Math.sin(a)*r-1,2,2);}
  }
  c.restore();
}

export function drawElectricCore(c,{x,y,size,angle=0,age=0,reduced=false,vertical=1}){
  c.save();c.translate(x,y);c.scale(1,1/vertical);c.rotate(angle);
  const r=size*.34,pulse=reduced?1:1+.045*Math.sin(age*24);
  c.scale(pulse,pulse);c.beginPath();
  c.moveTo(r,0);c.lineTo(r*.35,-r*.45);c.lineTo(-r*.25,-r*.72);
  c.lineTo(-r*.7,-r*.23);c.lineTo(-r*.48,r*.15);c.lineTo(-r*.18,r*.65);c.lineTo(r*.5,r*.4);c.closePath();
  c.fillStyle='#ffe52b';c.strokeStyle='#19394d';c.lineWidth=2;c.fill();c.stroke();
  c.fillStyle='#fffce5';c.fillRect(-r*.22,-r*.25,r*.62,r*.55);
  if(!reduced)for(const side of [-1,1])electricArc(c,{x:-r*.3,y:side*r*.45},{x:-r*.7,y:side*(r+3)},age,side,1.4);
  c.restore();
}

export function drawElectricCharge(c,point,size,progress,age,reduced,vertical=1){
  const gather=ease(progress),r=size*(.3+.25*gather);
  drawElectricCore(c,{...point,size:r,age,reduced,vertical});
  if(reduced)return;
  for(let i=0;i<3;i++){
    const a=i*Math.PI*2/3+age*.7,outer=size*(.9-.35*gather);
    electricArc(c,{x:point.x+Math.cos(a)*outer,y:point.y+Math.sin(a)*outer/vertical},{x:point.x+Math.cos(a)*r*.3,y:point.y+Math.sin(a)*r*.3/vertical},age,i,1.5);
  }
}

export function drawElectricTrail(c,{x,y,angle,age,travelled,vertical=1,reduced=false}){
  if(!reduced){
    const length=Math.min(travelled,26),from={x:x-Math.cos(angle)*length,y:y-Math.sin(angle)*length/vertical};
    c.save();c.globalAlpha*=.7;electricArc(c,from,{x,y},age,1,1.8);c.restore();
  }
}

export function drawElectricImpact(c,{x,y,radius=0,size=28,progress,age,reduced=false,vertical=1}){
  const fade=1-ease(progress),spread=reduced?.72:.5+.45*ease(Math.min(1,progress*2.7));
  c.save();c.globalAlpha*=fade;
  if(radius>0){
    // The footprint is the actual native splash. It is not a chain to targets.
    c.beginPath();c.arc(x,y,radius,0,Math.PI*2);c.clip();
    for(let i=0;i<(reduced?4:6);i++){
      const a=i*Math.PI/3+.35,r=radius*spread;
      // Separate tangential sparks read as a local ground discharge. Long
      // centre-to-edge spokes can join into a misleading target-to-target link.
      const from={x:x+Math.cos(a-.15)*r,y:y+Math.sin(a-.15)*r};
      const to={x:x+Math.cos(a+.15)*r*.93,y:y+Math.sin(a+.15)*r*.93};
      electricArc(c,from,to,reduced?0:age,i,1.9);
    }
  }else for(let i=0;i<(reduced?2:4);i++){
    const a=i*Math.PI/2+.4,r=size*(.3+.4*spread);
    electricArc(c,{x:x+Math.cos(a)*r*.3,y:y+Math.sin(a)*r*.3/vertical},{x:x+Math.cos(a)*r,y:y+Math.sin(a)*r/vertical},reduced?0:age,i,1.8);
  }
  drawElectricCore(c,{x,y:y-(radius?3:0)/vertical,size:size*(radius?.65:1)*(reduced?.7:1-progress*.5),age,reduced,vertical});
  c.restore();
}
