// A sphere turning about its vertical axis. The latch is only visible on the
// front hemisphere, so it disappears naturally as the back comes into view.
export function drawCapsule(c,x,y,size,angle=0){
  const r=size/2,front=Math.cos(angle),side=Math.sin(angle);
  c.save();c.translate(x,y);
  c.shadowColor='#17232780';c.shadowBlur=r*.22;c.shadowOffsetY=r*.1;
  c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fillStyle='#f4f3e9';c.fill();c.shadowColor='transparent';
  c.save();c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.clip();
  c.fillStyle='#d52c32';c.fillRect(-r,-r,size,r);
  c.fillStyle='#252d35';c.fillRect(-r,-r*.105,size,r*.21);
  if(front>0){
    const bx=side*r*.82,width=Math.max(.025,front),br=r*.255;
    c.save();c.translate(bx,0);c.scale(width,1);
    c.beginPath();c.arc(0,0,br,0,Math.PI*2);c.fillStyle='#202830';c.fill();
    c.beginPath();c.arc(0,0,br*.7,0,Math.PI*2);c.fillStyle='#f4f4ec';c.fill();
    c.beginPath();c.arc(0,0,br*.42,0,Math.PI*2);c.fillStyle='#cbd4d4';c.fill();c.restore();
  }
  const shade=c.createRadialGradient(-r*.38,-r*.48,r*.04,0,0,r*1.16);
  shade.addColorStop(0,'#ffffff5c');shade.addColorStop(.43,'#ffffff00');shade.addColorStop(1,'#1018219c');
  c.fillStyle=shade;c.fillRect(-r,-r,size,size);c.restore();
  c.beginPath();c.arc(0,0,r-.75,0,Math.PI*2);c.strokeStyle='#202830';c.lineWidth=1.5;c.stroke();c.restore();
}
