import * as native from './live-feedback-adapter.mjs';
export const beforeNavigate=native.beforeNavigate;
export async function prepare(page,config){
 await native.prepare(page,config);
 await page.evaluate(concept=>{
  const q=__reviewAdapter,r=q.renderer;
  q.fixture.concept={name:concept,method:'Review-only renderer override; native Game.step, field age, radius and ticks unchanged; original continuous texture; no screen readback.'};
  const surface=document.createElement('canvas');surface.width=256;surface.height=256;
  r.earthquake=function(c,field,age){
   const image=this.battleArt.image('earthquakeGround');if(!image)return;
   const radius=field.radius,beat=age%(field.fieldTick||1),pulse=this.reduced?0:Math.sin(Math.PI*Math.min(1,beat/.62));
   const ctx=surface.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,256,256);ctx.imageSmoothingEnabled=false;
   const map=y=>concept==='ridge'?y-.14*pulse*Math.sin(Math.PI*y):y-.075*pulse*Math.sin(2*Math.PI*y);
   for(let i=0;i<32;i++){
    const y0=map(i/32)*256,y1=map((i+1)/32)*256;
    ctx.drawImage(image,0,i*32,1536,32,0,y0,256,y1-y0);
   }
   if(pulse>0){
    ctx.globalCompositeOperation='source-atop';const g=ctx.createLinearGradient(0,0,0,256),a=(v)=>Math.round(v*pulse).toString(16).padStart(2,'0');
    if(concept==='ridge'){
     g.addColorStop(0,'#e8d09a00');g.addColorStop(.28,'#f2d7a7'+a(120));g.addColorStop(.44,'#f1d4a2'+a(150));g.addColorStop(.59,'#4f3420'+a(150));g.addColorStop(.76,'#583c2600');g.addColorStop(1,'#583c2600');
    }else{
     g.addColorStop(0,'#e8d09a00');g.addColorStop(.2,'#f1d4a2'+a(135));g.addColorStop(.36,'#513722'+a(130));g.addColorStop(.54,'#ead09e'+a(125));g.addColorStop(.7,'#513722'+a(140));g.addColorStop(.9,'#e8d09a00');g.addColorStop(1,'#e8d09a00');
    }
    ctx.fillStyle=g;ctx.fillRect(0,0,256,256);ctx.globalCompositeOperation='source-over';
   }
   c.save();c.beginPath();c.arc(field.x,field.y,radius,0,Math.PI*2);c.clip();c.globalAlpha*=.85*(this.reduced?1:Math.min(1,age/.2));c.drawImage(surface,field.x-radius,field.y-radius,radius*2,radius*2);c.restore();
  };
 },config.concept);
}
export const observe=native.observe;
