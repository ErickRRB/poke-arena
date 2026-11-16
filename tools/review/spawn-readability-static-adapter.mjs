import * as spawn from './spawn-visibility-adapter.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const states=new WeakMap();
export async function beforeNavigate(page,config){await spawn.beforeNavigate(page,config);states.set(page,{done:false});}
export async function prepare(page,config){await spawn.prepare(page,config);}
export async function observe(page,config){
  const sample=await spawn.observe(page,config),state=states.get(page);
  if(!state.done&&sample.fixture.pair&&sample.gameTime>=sample.fixture.startAt+5.65){await compose(page);state.done=true;}
  return sample;
}
async function compose(page){
  const output=process.env.REVIEW_STATIC_OUTPUT;if(!output)throw Error('Use a fresh REVIEW_STATIC_OUTPUT');await mkdir(output,{recursive:true});
  await page.locator('#match-pause').click();await page.waitForFunction(()=>__reviewAdapter.game.state==='paused');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.screenshot({path:path.join(output,'native-pause-context.png')});
  await page.evaluate(async()=>{
    const q=__reviewAdapter,g=q.game,r=q.renderer,parent=g.units.find(u=>u.key==='raltsHut'),children=g.units.filter(u=>u.parentId===parent.id).sort((a,b)=>a.x-b.x),p=r.projection,canvas=r.canvas,b=canvas.getBoundingClientRect(),dpr=canvas.width/b.width;
    if(children.length!==2||children.some(u=>u.spawn>0))throw Error('Requires the same settled native pair');
    const structure=r.structureSprite,sprite=r.sprite,health=r.healthBar,readout=r.healthReadout,draw=r.draw,has=r.bodyHeights.has,overlay=document.getElementById('pause-overlay'),visibility=overlay.style.visibility;
    const snapshot=()=>JSON.stringify({elapsed:g.elapsed,renderTime:r.t,units:g.units.map(u=>({id:u.id,key:u.key,x:u.x,y:u.y,hp:u.hp,spawn:u.spawn,attack:u.attack,anim:u.anim,parentId:u.parentId,targetId:u.target?.id??null}))});
    const rects=()=>Object.fromEntries(['arena','hand','energy-bar'].map(id=>{const b=document.getElementById(id).getBoundingClientRect();return[id,{x:b.x,y:b.y,width:b.width,height:b.height}];}));
    const before=snapshot(),beforeRects=rects(),make=()=>{const s=document.createElement('canvas');s.width=canvas.width;s.height=canvas.height;const c=s.getContext('2d');c.imageSmoothingEnabled=false;return s;};
    const world=c=>c.setTransform(p.scale*dpr,0,0,p.scale*dpr,p.x*dpr,p.y*dpr),material=make();world(material.getContext('2d'));structure.call(r,material.getContext('2d'),r.frameActors.get(parent.id),true);
    const stencils=children.map(unit=>{
      const visual=r.frameActors.get(unit.id),s=make(),c=s.getContext('2d');world(c);const previous=r.silhouettePass;r.silhouettePass=true;try{sprite.call(r,c,visual,true);}finally{r.silhouettePass=previous;}
      const data=c.getImageData(0,0,s.width,s.height).data;let left=s.width,top=s.height,right=-1,bottom=-1;
      for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++)if(data[(y*s.width+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      return{unit,visual,canvas:s,bounds:{left:left/dpr,top:top/dpr,right:(right+1)/dpr,bottom:(bottom+1)/dpr},ownerX:p.x+visual.x*p.scale,healthY:Math.round(p.y+(visual.y-r.bodyHeight(visual)-9)*p.scale)-2};
    });
    const cut=make(),paint=cut.getContext('2d'),edges=[];paint.drawImage(material,0,0);
    for(const item of stencils){
      paint.globalCompositeOperation='destination-out';paint.drawImage(item.canvas,0,0);
      const edge=make(),c=edge.getContext('2d');
      for(const[x,y]of[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]])c.drawImage(item.canvas,x*dpr,y*dpr);
      c.globalCompositeOperation='source-in';c.fillStyle='#fff3d0';c.fillRect(0,0,edge.width,edge.height);
      c.globalCompositeOperation='destination-out';c.drawImage(item.canvas,0,0);c.globalCompositeOperation='destination-in';c.drawImage(material,0,0);
      edges.push(edge);
    }
    paint.globalCompositeOperation='source-over';for(const edge of edges)paint.drawImage(edge,0,0);
    for(let i=0;i<edges.length;i++)for(let j=0;j<i;j++){
      const shared=make(),c=shared.getContext('2d');c.drawImage(edges[i],0,0);c.globalCompositeOperation='destination-in';c.drawImage(edges[j],0,0);
      c.globalCompositeOperation='source-in';c.fillStyle='#14271f';c.fillRect(0,0,shared.width,shared.height);
      c.globalCompositeOperation='destination-out';for(const item of stencils)c.drawImage(item.canvas,0,0);paint.drawImage(shared,0,0);
    }
    const childIds=new Set(children.map(u=>u.id)),species=new Set(children.map(u=>u.card.id)),view={mode:0,frames:[]};
    r.bodyHeights.has=function(id){return !(view.mode&&species.has(id))&&has.call(this,id);};
    r.structureSprite=function(c,u,...args){
      if(!view.mode||u.id!==parent.id)return structure.call(this,c,u,...args);
      c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.filter='none';c.drawImage(cut,0,0);c.restore();
      this.queueUnitHealth(c,u,u.x,u.y-(this.bodyHeight(u)+9)/(this.verticalScale||1),44);
    };
    r.healthBar=function(c,u,...args){if(view.mode&&(childIds.has(u.id)||u.id===parent.id))return;return health.call(this,c,u,...args);};
    r.healthReadout=function(c,u,...args){if(view.mode&&(childIds.has(u.id)||u.id===parent.id))return;return readout.call(this,c,u,...args);};
    r.draw=function(...args){
      const value=draw.apply(this,args);if(!view.mode)return value;
      const c=this.ctx;c.save();world(c);const parentY=view.mode===2?parent.y+10:parent.y-(this.bodyHeight(parent)+9);health.call(this,c,parent,parent.x,parentY,44,false);readout.call(this,c,parent,parent.x,parentY,44,false);c.restore();
      const items=stencils.map(item=>({...item,width:Math.max(12,Math.round(r.bodyHeight(item.visual)*p.scale*.9))})),rowWidth=items.reduce((sum,item)=>sum+item.width+2,0)+(items.length-1)*3,center=items.reduce((sum,item)=>sum+item.ownerX,0)/items.length;
      let left=Math.round(center-rowWidth/2);const fillY=Math.min(...items.map(item=>item.healthY));
      c.save();c.setTransform(dpr,0,0,dpr,0,0);const geometry=[];
      for(const item of items){
        const x=left+1,ratio=item.unit.hp/item.unit.maxHp,stemX=Math.round(item.ownerX),stemTop=fillY+5,stemBottom=Math.floor(item.bounds.top)-1;
        c.fillStyle='#14271f';if(stemBottom>=stemTop)c.fillRect(stemX,stemTop,1,stemBottom-stemTop+1);
        c.fillStyle='#09170f';c.fillRect(left,fillY-1,item.width+2,6);c.fillStyle='#32413b';c.fillRect(x,fillY,item.width,4);
        c.fillStyle='#43baf1';c.fillRect(x,fillY,Math.round(item.width*ratio),4);c.fillStyle='#a3e5ff';c.fillRect(x,fillY,Math.round(item.width*ratio),1);
        c.fillStyle='#061a245c';for(let mark=1;mark<4;mark++)c.fillRect(x+Math.round(item.width*mark/4),fillY,1,4);
        geometry.push({id:item.unit.id,fillCss:{x,y:fillY,width:item.width,height:4},borderCss:1,ownerX:item.ownerX,bodyBoundsCss:item.bounds,stemCss:{x:stemX,top:stemTop,bottom:stemBottom}});left+=item.width+5;
      }
      c.restore();view.geometry={children:geometry,parent:{x:parent.x,y:parentY,widthWorld:44,rule:view.mode===2?'stationary summon structures at fixed base+10':'unchanged original above-body'}};return value;
    };
    overlay.style.visibility='hidden';
    q.readabilityComposition={view,before,beforeRects,snapshot,rects,parentId:parent.id,childIds:[...childIds],restore(){r.structureSprite=structure;r.sprite=sprite;r.healthBar=health;r.healthReadout=readout;r.draw=draw;r.bodyHeights.has=has;overlay.style.visibility=visibility;},limits:'Static same-pair composition only. Native CPU paused; only modal visual visibility hidden equally for full-context diagnostic images. Exact native sprite silhouettes cut parent material;1CSS cream edge only on original parent alpha, shared edge pixels use dark ink instead of bridging adjacent bodies. Native opaque body pixels are protected. No unit/card/pose/HP/clock changes, no motion/production approval. Parent-base variant is a semantic spawner class proposal, not a species offset.'};
  });
  const views=[];
  try{
    for(const[name,mode]of[['baseline',0],['silhouette-readable-hp',1],['silhouette-spawner-base-hp',2]]){
      const info=await page.evaluate(async({name,mode})=>{const q=__reviewAdapter,s=q.readabilityComposition;s.view.mode=mode;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));if(s.snapshot()!==s.before||JSON.stringify(s.rects())!==JSON.stringify(s.beforeRects)||q.game.state!=='paused')throw Error('same-pair diagnostic state or layout changed');return{name,mode,gameTime:q.game.elapsed,renderTime:q.renderer.t,parentId:s.parentId,childIds:s.childIds,geometry:mode?s.view.geometry:null,rects:s.rects()};},{name,mode});
      await page.screenshot({path:path.join(output,`${name}.png`)});const data=await page.evaluate(()=>__reviewAdapter.renderer.canvas.toDataURL('image/png'));await writeFile(path.join(output,`${name}-canvas.png`),Buffer.from(data.split(',')[1],'base64'));views.push(info);
    }
  }finally{await page.evaluate(()=>__reviewAdapter.readabilityComposition.restore());}
  const limits=await page.evaluate(()=>__reviewAdapter.readabilityComposition.limits);
  await writeFile(path.join(output,'composition.json'),JSON.stringify({views,limits},null,2));
}
