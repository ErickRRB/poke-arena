// Tactical markings are deliberately separate from the illustrated attacks.
// All dimensions are ground coordinates, shared with the collision geometry.
export function areaGuide(c,x,y,radius,{team=0,valid=true,pending=false,progress=0}={}){
  const color=!valid?'#ed8873':team?'#ffc1a0':'#d5f7ed';
  c.save();c.fillStyle=!valid?'#a82f251c':team?'#bd4a3317':'#236e7018';
  c.beginPath();c.arc(x,y,radius,0,Math.PI*2);c.fill();
  c.strokeStyle='#213c42b3';c.lineWidth=pending?4:5;c.stroke();
  c.strokeStyle=color;c.lineWidth=pending?1.7:2.5;c.stroke();
  const tick=pending?4:7;
  c.strokeStyle=color;c.lineWidth=2;c.beginPath();
  for(let i=0;i<4;i++){const angle=i*Math.PI/2,dx=Math.cos(angle),dy=Math.sin(angle);c.moveTo(x+dx*(radius-tick),y+dy*(radius-tick));c.lineTo(x+dx*(radius+tick*.5),y+dy*(radius+tick*.5));}
  c.stroke();
  if(pending){
    c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.arc(x,y,Math.max(5,radius-5),-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(.02,Math.min(1,progress)));c.stroke();
  }
  c.restore();
}
export function cellGuide(c,x,y,size,valid=true){
  const half=size/2,corner=5;
  c.save();c.fillStyle=valid?'#eaf9e61c':'#de79612c';c.fillRect(x-half,y-half,size,size);
  c.strokeStyle=valid?'#f4ffdd':'#ffd2b9';c.lineWidth=2;c.beginPath();
  for(const[dx,dy]of[[-1,-1],[1,-1],[-1,1],[1,1]]){c.moveTo(x+dx*(half-corner),y+dy*half);c.lineTo(x+dx*half,y+dy*half);c.lineTo(x+dx*half,y+dy*(half-corner));}
  c.stroke();
  c.beginPath();c.moveTo(x,y-4);c.lineTo(x+4,y);c.lineTo(x,y+4);c.lineTo(x-4,y);c.closePath();c.fillStyle='#fff9dc';c.strokeStyle='#294c49';c.lineWidth=2;c.fill();c.stroke();c.restore();
}
export function travelGuide(c,x,y,radius,length,team=0,valid=true){
  const direction=team?1:-1,end=y+direction*length,color=valid?'#e8f6dc':'#ffc2a6';
  c.save();c.fillStyle=team?'#be4e371e':'#376b651e';c.fillRect(x-radius,Math.min(y,end),radius*2,length);
  c.strokeStyle='#294b45b3';c.lineWidth=5;c.strokeRect(x-radius,Math.min(y,end),radius*2,length);
  c.strokeStyle=color;c.lineWidth=2;c.strokeRect(x-radius,Math.min(y,end),radius*2,length);
  c.beginPath();c.moveTo(x,end-direction*18);c.lineTo(x,end-direction*4);c.moveTo(x-6,end-direction*10);c.lineTo(x,end-direction*4);c.lineTo(x+6,end-direction*10);c.stroke();c.restore();
}
