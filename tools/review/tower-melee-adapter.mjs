import * as baseline from'./baseline-adapter.mjs';
import{mkdir,writeFile}from'node:fs/promises';
import path from'node:path';
const states=new WeakMap();
export async function beforeNavigate(page,config){await baseline.beforeNavigate(page,config);await page.addInitScript(()=>localStorage.setItem('poke-arena:sound','false'));states.set(page,new Set());}
async function exportAlpha(output,prefix,alpha){
 for(const[name,png]of Object.entries(alpha.pngs))await writeFile(path.join(output,prefix+'-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 delete alpha.pngs;return alpha;
}
export async function prepare(page,config){
 await baseline.prepare(page,config);
 await page.evaluate(async()=>{
  const q=__reviewAdapter,g=q.game,r=q.renderer;q.action=true;g.aiEnabled=false;
  await r.ensureSpecies([...new Set([112,...g.towers.map(t=>t.guard?.id)].filter(Number.isInteger))]);
  await document.fonts.load('400 18px "Lilita One"');await document.fonts.ready;
  g.hands[0][0]='rhydon';g.energy=[10,10];
  q.actionRects=()=>Object.fromEntries(['arena','hand','energy-bar'].map(id=>{const b=document.getElementById(id).getBoundingClientRect();return[id,[b.x,b.y,b.width,b.height]];}));
  const enemy=g.towers.find(t=>t.team===1&&!t.king&&t.lane===1);if(!enemy||enemy.hp!==enemy.maxHp)throw Error('Original enemy tower missing or not healthy');
  q.fixture={ready:false,frames:{},targetId:enemy.id,initialTowerHP:g.towers.map(t=>({id:t.id,hp:t.hp,maxHp:t.maxHp})),profile:structuredClone(q.CARDS.rhydon),initialRects:q.actionRects(),limits:'Actual Rhydon112/Pekka native legal Game.deploy and original towers/guards/HP/attacks. AIoff, declaredslot/energy10, soundmuted. No g.spawn, actor/HP/position/stat/target/release/clock override. QA only observes exact phases and isolated same-clock alpha; per-phase PNG/alpha may add recording overhead, not performance proof.'};
  q.contactAlpha=(tower,actor)=>{
   const b=r.canvas.getBoundingClientRect(),dpr=r.canvas.width/b.width,p=r.projection,clock={game:g.elapsed,render:r.t},previous=r.silhouettePass;
   const make=()=>{const s=document.createElement('canvas');s.width=r.canvas.width;s.height=r.canvas.height;const c=s.getContext('2d');c.imageSmoothingEnabled=false;c.setTransform(p.scale*dpr,0,0,p.scale*dpr,p.x*dpr,p.y*dpr);return s;};
   const surfaces={tower:make(),guard:make(),health:make(),attacker:make()};
   try{
    r.battleArt.structure(surfaces.tower.getContext('2d'),tower.king?'king':'princess',tower.team,tower.x,tower.y,tower.king?102:72,r.verticalScale||1);
    r.silhouettePass=true;
    if(tower.guard)r.sprite(surfaces.guard.getContext('2d'),{...tower,attack:!tower.active?0:tower.attack,card:{id:tower.guard.id},scale:tower.king?1.15:1.3,x:tower.x,y:tower.y-(tower.king?59:46)/(r.verticalScale||1),mounted:true,attackAnim:tower.guard.attackAnim,moving:false},true);
    if(actor)r.sprite(surfaces.attacker.getContext('2d'),actor,true);
    r.silhouettePass=previous;r.towerHealth(surfaces.health.getContext('2d'),tower);
   }finally{r.silhouettePass=previous;}
   const data=Object.fromEntries(Object.entries(surfaces).map(([k,s])=>[k,s.getContext('2d').getImageData(0,0,s.width,s.height).data]));
   const bounds=bytes=>{let left=r.canvas.width,top=r.canvas.height,right=-1,bottom=-1,pixels=0;for(let y=0;y<r.canvas.height;y++)for(let x=0;x<r.canvas.width;x++)if(bytes[(y*r.canvas.width+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);pixels++;}return pixels?{x:left/dpr,y:top/dpr,width:(right-left+1)/dpr,height:(bottom-top+1)/dpr,pixels}:null;};
   let overTower=0,overGuard=0,overAttacker=0;for(let i=3;i<data.health.length;i+=4)if(data.health[i]>16){if(data.tower[i]>16)overTower++;if(data.guard[i]>16)overGuard++;if(data.attacker[i]>16)overAttacker++;}
   if(g.elapsed!==clock.game||r.t!==clock.render)throw Error('Isolated contact alpha changed clocks');
   return{clock,tower:{id:tower.id,team:tower.team,king:tower.king,x:tower.x,y:tower.y,radius:tower.radius,hp:tower.hp,maxHp:tower.maxHp},attacker:actor?{id:actor.id,key:actor.key,x:actor.x,y:actor.y,radius:actor.radius}:null,projection:p,canvas:{x:b.x,y:b.y,width:b.width,height:b.height,dpr},bounds:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,bounds(v)])),overlapPixels:{healthOverTower:overTower,healthOverGuard:overGuard,healthOverAttacker:overAttacker},pngs:Object.fromEntries(Object.entries(surfaces).map(([k,s])=>[k,s.toDataURL()])),limits:'Actual original native painters and same world/backing transform, isolated transparent surfaces at unchanged clock. QA masks measure geometry only; actual full canvas/video show composition. Alpha threshold16, no changed poses or product-readback code.'};
  };
  const draw=r.draw;r.draw=function(...args){
   const value=draw.apply(this,args),f=q.fixture,u=g.units.find(u=>u.key==='rhydon'),tower=g.towers.find(t=>t.id===f.targetId);if(!f.ready||!u||!tower)return value;
   const shown=r.frameActors.get(u.id)||u,pose=r.nativeSpritePose(shown),hit=q.events.find(e=>e.type==='damage'&&e.attackerId===u.id&&e.targetId===tower.id),distance=Math.hypot(u.x-tower.x,u.y-tower.y);
   if(u.target?.id===tower.id&&u.attack>0&&f.firstSeq===undefined)f.firstSeq=u.attackSeq;
   const save=name=>{if(f.frames[name])return;f.frames[name]={gameTime:g.elapsed,renderTime:r.t,actor:{id:u.id,key:u.key,x:u.x,y:u.y,hp:u.hp,maxHp:u.maxHp,radius:u.radius,moving:u.moving,attack:u.attack,attackSeq:u.attackSeq,windup:u.attackWindup,duration:u.attackDuration,targetId:u.target?.id},pose:{animation:pose.anim,frame:pose.frame,direction:pose.direction,anchor:pose.anchor,scale:pose.scale,lift:pose.lift,lunge:pose.lunge},target:{id:tower.id,x:tower.x,y:tower.y,radius:tower.radius,hp:tower.hp,maxHp:tower.maxHp,attack:tower.attack,guard:tower.guard?.id},distance,hit:hit||null,alpha:q.contactAlpha(tower,shown),png:r.canvas.toDataURL()};};
   if(distance<=150&&u.attack<=0)save('approach');
   if(u.attackSeq===f.firstSeq&&u.attack>0&&!hit)save('prepare');
   if(hit){save('contact');if(u.attack<=0)save('recovered');}
   return value;
  };
 });
 const output=process.env.REVIEW_STATIC_OUTPUT;if(!output)throw Error('Use fresh REVIEW_STATIC_OUTPUT');await mkdir(output,{recursive:true});
 const initial=await page.evaluate(()=>__reviewAdapter.game.towers.map(t=>__reviewAdapter.contactAlpha(t,null)));
 for(const alpha of initial)await exportAlpha(output,'initial-tower-'+alpha.tower.id,alpha);
 await writeFile(path.join(output,'initial-tower-alpha.json'),JSON.stringify(initial,null,2));
 await page.evaluate(initial=>__reviewAdapter.fixture.initialAlpha=initial,initial);await page.screenshot({path:path.join(output,'before-contact.png')});
}
export async function observe(page,config){
 const sample=await baseline.observe(page,config),saved=states.get(page),output=process.env.REVIEW_STATIC_OUTPUT;
 await page.evaluate(()=>{const q=__reviewAdapter,g=q.game,f=q.fixture;if(q.observations===2&&!f.ready){f.startAt=g.elapsed;f.deploy=g.deploy(0,0,432,436);if(!f.deploy.ok)throw Error('Real Rhydon deploy rejected');f.ready=true;}});
 const fixture=await page.evaluate(()=>{const q=__reviewAdapter,f=q.fixture;return{...f,frames:Object.fromEntries(Object.entries(f.frames).map(([k,{png,alpha,...frame}])=>{const{pngs,...geometry}=alpha;return[k,{...frame,alpha:geometry}];})),rects:q.actionRects()};});
 if(JSON.stringify(fixture.initialRects)!==JSON.stringify(fixture.rects))throw Error('Board or hand displaced');
 for(const name of Object.keys(fixture.frames))if(!saved.has(name)){
  const data=await page.evaluate(name=>{const f=__reviewAdapter.fixture.frames[name],data={png:f.png,alpha:f.alpha.pngs};delete f.png;delete f.alpha.pngs;return data;},name);
  await writeFile(path.join(output,name+'.png'),Buffer.from(data.png.split(',')[1],'base64'));
  for(const[key,png]of Object.entries(data.alpha))await writeFile(path.join(output,name+'-alpha-'+key+'.png'),Buffer.from(png.split(',')[1],'base64'));
  await writeFile(path.join(output,name+'.json'),JSON.stringify(fixture.frames[name],null,2));saved.add(name);
 }
 return{...sample,fixture};
}
