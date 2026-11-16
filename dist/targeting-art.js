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
export function areaGuide(c,x,y,radius,{valid=true}={}){
  if(!(radius>0))return;
  const color=valid?'255,250,224':'237,136,115',glow=c.createRadialGradient(x,y,0,x,y,radius);
  glow.addColorStop(0,`rgba(${color},0.01)`);glow.addColorStop(.65,`rgba(${color},0.035)`);
  glow.addColorStop(.87,`rgba(${color},0.25)`);glow.addColorStop(.95,`rgba(${color},0.45)`);glow.addColorStop(1,`rgba(${color},0)`);
  c.save();c.fillStyle=glow;c.beginPath();c.arc(x,y,radius,0,Math.PI*2);c.fill();c.restore();
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
  const direction=team?1:-1,visible=Math.min(length,100),color=valid?'255,250,224':'237,136,115';
  c.save();
  const glow=c.createLinearGradient(x,y,x,y+direction*visible);
  glow.addColorStop(0,`rgba(${color},0.18)`);glow.addColorStop(1,`rgba(${color},0)`);
  const top=y+Math.min(0,direction*visible);
  c.fillStyle=glow;c.fillRect(x-radius,top,radius*2,visible);
  c.globalAlpha=.7;c.fillRect(x-radius,top,6,visible);c.fillRect(x+radius-6,top,6,visible);
  c.restore();
}
