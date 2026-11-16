import * as baseline from './baseline-adapter.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const states=new WeakMap();
export async function beforeNavigate(page,config){await baseline.beforeNavigate(page,config);await page.addInitScript(()=>localStorage.setItem('poke-arena:sound','false'));states.set(page,{observations:0,saved:false});}
export async function prepare(page,config){
  await baseline.prepare(page,config);
  await page.evaluate(async()=>{
    const q=__reviewAdapter,g=q.game,r=q.renderer;
    q.action=true;g.aiEnabled=false;await r.ensureSpecies([280,143]);
    g.hands[0][0]='raltsHut';g.hands[1][0]='snorlax';g.energy=[10,10];q.events=[];
    q.fixture={ready:true,deploys:[],summons:[],lastFrame:[],frames:[],limits:'Default public219 native catalogue. AI disabled; declared initial hands/energy, actual Game.deploy accepted points. No actor, HP, spawn, sort, physics or clock replacement. Captures two successive1-Ralts waves, not a2-Ralts wave.'};
    const draw=r.draw;r.draw=function(...args){q.fixture.lastFrame=[];return draw.apply(this,args);};
    const sprite=r.sprite;r.sprite=function(ctx,unit,...args){if(!unit.mounted&&!unit.preview&&!this.silhouettePass)q.fixture.lastFrame.push({kind:'sprite',id:unit.id,key:unit.key,parentId:unit.parentId??null,x:unit.x,y:unit.y,sortY:unit.visualSortY??unit.y});return sprite.call(this,ctx,unit,...args);};
    const health=r.healthBar;r.healthBar=function(ctx,unit,x,y,width){q.fixture.lastFrame.push({kind:'health',id:unit.id,key:unit.key,parentId:unit.parentId??null,x,y,width,outline:{left:x-width/2-2,right:x+width/2+2,top:y-2,bottom:y+(unit.maxHp<=1?4:8)+2},hp:unit.hp,maxHp:unit.maxHp});return health.call(this,ctx,unit,x,y,width);};
  });
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(resolve));});
}
export async function observe(page,config){
  const state=states.get(page);
  if(state.observations++===1)await page.evaluate(()=>{
    const q=__reviewAdapter,g=q.game,f=q.fixture;f.startAt=g.elapsed;
    f.deploys=[g.deploy(0,0,168,508),g.deploy(1,0,168,364)];if(f.deploys.some(result=>!result.ok))throw Error('native fixture placement rejected');
  });
  await page.evaluate(()=>{
    const q=__reviewAdapter,g=q.game,f=q.fixture,parent=g.units.find(u=>u.key==='raltsHut'),children=g.units.filter(u=>u.parentId===parent?.id);
    for(const u of children)if(!f.summons.some(x=>x.id===u.id))f.summons.push({id:u.id,key:u.key,x:u.x,y:u.y,parentId:u.parentId,hp:u.hp,maxHp:u.maxHp,spawn:u.spawn,createdAt:u.createdAt,observedAt:g.elapsed});
    if(children.length===2&&children.every(u=>u.spawn<=0)&&!f.pair){f.pair={epochMs:performance.timeOrigin+performance.now(),gameTime:g.elapsed,parent:{id:parent.id,x:parent.x,y:parent.y,hp:parent.hp},children:children.map(u=>({id:u.id,key:u.key,x:u.x,y:u.y,hp:u.hp,maxHp:u.maxHp,parentId:u.parentId,moving:u.moving,attack:u.attack,targetId:u.target?.id??null})),renderedFrame:f.lastFrame.slice()};}
  });
  const sample=await baseline.observe(page,config);
  if(sample.fixture.pair&&!state.saved){
    const output=process.env.REVIEW_STATIC_OUTPUT;if(!output)throw Error('Use fresh REVIEW_STATIC_OUTPUT');await mkdir(output,{recursive:true});
    await page.screenshot({path:path.join(output,'pair.png')});await page.locator('#arena').screenshot({path:path.join(output,'pair-canvas.png')});
    await writeFile(path.join(output,'pair.json'),JSON.stringify(sample.fixture,null,2));state.saved=true;
  }
  return sample;
}
