import * as native from'./spawn-motion-adapter.mjs';
import{mkdir,writeFile}from'node:fs/promises';
import path from'node:path';
export const beforeNavigate=native.beforeNavigate;
export async function prepare(page,config){
  await native.prepare(page,config);
  await page.evaluate(config=>{
    if(!config.towerDamage)return;
    const q=__reviewAdapter,g=q.game,r=q.renderer,draw=r.draw;
    r.draw=function(...args){
      const value=draw.apply(this,args),f=q.fixture;
      if(f.ready&&!f.frames['tower-damaged']&&g.towers.some(t=>t.hp>0&&t.hp<t.maxHp))f.frames['tower-damaged']={gameTime:g.elapsed,renderTime:r.t,towers:g.towers.map(t=>({id:t.id,team:t.team,king:t.king,x:t.x,y:t.y,hp:t.hp,maxHp:t.maxHp})),draws:f.lastFrame,png:r.canvas.toDataURL()};
      return value;
    };
  },config);
  const measured=await page.evaluate(async()=>{
    const faces=await document.fonts.load('400 18px "Lilita One"');await document.fonts.ready;
    const q=__reviewAdapter,g=q.game,r=q.renderer,real=r.canvas,b=real.getBoundingClientRect(),p=r.projection,dpr=real.width/b.width;
    const initial={game:g.elapsed,render:r.t},previous=r.silhouettePass;
    const make=()=>{const s=document.createElement('canvas');s.width=real.width;s.height=real.height;const c=s.getContext('2d');c.imageSmoothingEnabled=false;c.setTransform(p.scale*dpr,0,0,p.scale*dpr,p.x*dpr,p.y*dpr);return s;};
    const bounds=data=>{let left=real.width,top=real.height,right=-1,bottom=-1,count=0;for(let y=0;y<real.height;y++)for(let x=0;x<real.width;x++)if(data[(y*real.width+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);count++;}return{css:{x:left/dpr,y:top/dpr,width:(right-left+1)/dpr,height:(bottom-top+1)/dpr},normalized:{x:left/real.width,y:top/real.height,width:(right-left+1)/real.width,height:(bottom-top+1)/real.height},pixels:count};};
    const records=[];
    try{for(const tower of g.towers){
      const structure=make(),combined=make(),health=make(),digits=make(),kind=tower.king?'king':'princess',width=tower.king?102:72;
      r.battleArt.structure(structure.getContext('2d'),kind,tower.team,tower.x,tower.y,width,r.verticalScale||1);
      r.silhouettePass=true;r.tower(combined.getContext('2d'),tower);r.silhouettePass=previous;
      r.towerHealth(health.getContext('2d'),tower);
      const glyph=digits.getContext('2d'),fill=glyph.fillRect;glyph.fillRect=()=>{};try{r.towerHealth(glyph,tower);}finally{glyph.fillRect=fill;}
      const read=s=>s.getContext('2d').getImageData(0,0,real.width,real.height).data,a=read(structure),c=read(combined),h=read(health),n=read(digits),box=bounds(a),guardBox=bounds(c),hpBox=bounds(h),glyphBox=bounds(n);let overArt=0,glyphOverArt=0;
      for(let i=3;i<a.length;i+=4){if(h[i]>16&&c[i]>16)overArt++;if(n[i]>16&&c[i]>16)glyphOverArt++;}
      records.push({id:tower.id,team:tower.team,kind,guardId:tower.guard?.id,world:{x:tower.x,y:tower.y,radius:tower.radius,artWidth:width,guardMount:tower.king?59:46},baseCss:{x:p.x+tower.x*p.scale,y:p.y+tower.y*p.scale},structure:box,combined:guardBox,health:hpBox,digits:glyphBox,healthOverArtFraction:overArt/hpBox.pixels,digitsOverArtFraction:glyphOverArt/glyphBox.pixels,pngs:{structure:structure.toDataURL(),combined:combined.toDataURL(),health:health.toDataURL(),digits:digits.toDataURL()}});
    }}finally{r.silhouettePass=previous;}
    if(g.elapsed!==initial.game||r.t!==initial.render)throw Error('Diagnostic alpha pass changed clocks');
    return{viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},canvas:{x:b.x,y:b.y,width:b.width,height:b.height,backingWidth:real.width,backingHeight:real.height},projection:p,vertical:r.verticalScale,font:{family:'Lilita One',weight:400,loaded:faces.map(f=>({family:f.family,status:f.status,weight:f.weight}))},records,clock:initial,method:'Actual live native tower/guard draw at original position and same unchanged clock; isolated transparent offscreen passes, not a gameplay pose. Structure-only and combined art, fullHP overlay and glyph-only alpha threshold16 measured at real projection/backing. Glyph-only pass suppresses rectangles for QA and restores the native method. No product sprite/physics/viewport override; frame does not prove physical-device behavior.'};
  });
  const output=process.env.REVIEW_STATIC_OUTPUT;if(!output)throw Error('Use fresh REVIEW_STATIC_OUTPUT');await mkdir(output,{recursive:true});
  for(const record of measured.records){for(const[k,png]of Object.entries(record.pngs))await writeFile(path.join(output,`tower-${record.id}-${k}.png`),Buffer.from(png.split(',')[1],'base64'));delete record.pngs;}
  await writeFile(path.join(output,'tower-alpha.json'),JSON.stringify(measured,null,2));await page.evaluate(data=>__reviewAdapter.fixture.towerAlpha=data,measured);
  await page.screenshot({path:path.join(output,'before-action.png')});
}
export const observe=native.observe;
