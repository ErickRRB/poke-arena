// Tactical markings are deliberately separate from the illustrated attacks.
// All dimensions are ground coordinates, shared with the collision geometry.
export function softDisc(c,x,y,radius,{color='#fff4ce',opacity=.2,interior,feather}={}){
  if(!(radius>0))return;
  const hex=/^#[\da-f]{6}$/i.test(color)?color:'#fff4ce',value=Number.parseInt(hex.slice(1),16);
  const rgba=alpha=>`rgba(${value>>16},${value>>8&255},${value&255},${alpha})`;
  const glow=c.createRadialGradient(x,y,0,x,y,radius);
  glow.addColorStop(0,rgba(opacity*(interior??.55)));glow.addColorStop(.6,rgba(opacity*(interior??.65)));
  glow.addColorStop(feather===undefined?.82:Math.max(.6,1-feather/radius),rgba(opacity));glow.addColorStop(1,rgba(0));
  c.save();c.fillStyle=glow;c.beginPath();c.arc(x,y,radius,0,Math.PI*2);c.fill();c.restore();
}
export function areaGuide(c,x,y,radius,{team=0,valid=true,color,emphasis=false}={}){
  let fill=color||(team?'#ffd8b2':'#e5f3ed'),opacity=.25;
  if(valid&&/^#[\da-f]{6}$/i.test(fill)){
    const value=Number.parseInt(fill.slice(1),16),r=value>>16,g=value>>8&255,b=value&255;
    // Grass greens and muted sand share the arena's palette. A warm light
    // veil keeps their targeting area visible without drawing an outline.
    if(g>r+12&&g>b+25||r>=g&&g>=b&&r-b<80&&r-g<35){fill='#fff1b8';opacity=.38;}
  }
  softDisc(c,x,y,radius,{color:valid?fill:'#ed8873',opacity:valid?(emphasis?Math.min(.52,opacity*1.65):opacity):emphasis?.45:.3});
}
export function cellGuide(c,x,y,size,valid=true,emphasis=false){
  const half=size/2;
  c.save();
  for(let inset=0;inset<5;inset++){
    c.fillStyle=valid?`rgba(247,235,190,${(emphasis?2.3:1)*(.025+inset*.008)})`:`rgba(237,136,115,${(emphasis?2:1)*(.03+inset*.008)})`;
    c.fillRect(x-half+inset,y-half+inset,size-inset*2,size-inset*2);
  }
  c.restore();
}
export function travelGuide(c,x,y,radius,length,team=0,valid=true){
  const direction=team?1:-1,end=y+direction*length,color=valid?'#e8f6dc':'#ffc2a6';
  c.save();c.fillStyle=team?'#be4e371e':'#376b651e';c.fillRect(x-radius,Math.min(y,end),radius*2,length);
  c.strokeStyle='#294b45b3';c.lineWidth=5;c.strokeRect(x-radius,Math.min(y,end),radius*2,length);
  c.strokeStyle=color;c.lineWidth=2;c.strokeRect(x-radius,Math.min(y,end),radius*2,length);
  c.beginPath();c.moveTo(x,end-direction*18);c.lineTo(x,end-direction*4);c.moveTo(x-6,end-direction*10);c.lineTo(x,end-direction*4);c.lineTo(x+6,end-direction*10);c.stroke();c.restore();
}
