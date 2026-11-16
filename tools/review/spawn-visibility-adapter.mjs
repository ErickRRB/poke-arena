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
  if(config.staticConcept&&state.saved&&!state.conceptDone){
    await staticConcept(page);state.conceptDone=true;
  }
  return sample;
}
async function staticConcept(page){
  const output=process.env.REVIEW_STATIC_OUTPUT;
  await page.waitForFunction(()=>__reviewAdapter.game.elapsed>=__reviewAdapter.fixture.startAt+5.65);
  await page.locator('#match-pause').click();await page.waitForFunction(()=>__reviewAdapter.game.state==='paused');
  await page.evaluate(()=>{
    const q=__reviewAdapter,g=q.game,parent=g.units.find(u=>u.key==='raltsHut'),children=g.units.filter(u=>u.parentId===parent.id).sort((a,b)=>a.x-b.x);
    if(children.length!==2)throw Error('static concept requires the actual settled native pair');
    q.concept={parentId:parent.id,children:children.map(u=>u.id),alpha:1,compact:false,views:[],before:JSON.stringify(g.units.map(u=>({id:u.id,x:u.x,y:u.y,hp:u.hp,spawn:u.spawn,parentId:u.parentId})))};
    const structure=q.renderer.structureSprite,queue=q.renderer.queueUnitHealth;
    q.renderer.structureSprite=function(ctx,unit,...args){ctx.save();if(unit.id===q.concept.parentId)ctx.globalAlpha*=q.concept.alpha;const value=structure.call(this,ctx,unit,...args);ctx.restore();return value;};
    q.renderer.queueUnitHealth=function(ctx,unit,x,y,width){
      if(q.concept.compact&&q.concept.children.includes(unit.id)){
        width=Math.min(width,Math.max(18,unit.radius*2+6));
        const list=q.concept.children.map(id=>g.units.find(u=>u.id===id)),distance=list[1].x-list[0].x,shift=Math.max(0,(width+7-distance)/2);
        x+=unit.id===list[0].id?-shift:shift;
      }
      return queue.call(this,ctx,unit,x,y,width);
    };
  });
  await page.screenshot({path:path.join(output,'static-native-pause-context.png')});
  for(const[caption,alpha,compact]of[['original',1,false],['roof55-compact',.55,true],['roof35-compact',.35,true],['parent-hidden-diagnostic',0,true]]){
    await page.evaluate(async({caption,alpha,compact})=>{
      const q=__reviewAdapter;Object.assign(q.concept,{alpha,compact});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const after=JSON.stringify(q.game.units.map(u=>({id:u.id,x:u.x,y:u.y,hp:u.hp,spawn:u.spawn,parentId:u.parentId})));
      if(after!==q.concept.before||q.game.state!=='paused')throw Error('static native scene changed');
      q.concept.views.push({caption,alpha,compact,gameTime:q.game.elapsed,frame:q.fixture.lastFrame.slice()});
    },{caption,alpha,compact});
    const data=await page.evaluate(()=>__reviewAdapter.renderer.canvas.toDataURL('image/png'));
    await writeFile(path.join(output,`${caption}.png`),Buffer.from(data.split(',')[1],'base64'));
  }
  const report=await page.evaluate(()=>({...__reviewAdapter.concept,limits:'Static native CPU-paused painter concept only. Temporary fixture overrides specific actual parent/pair; no production fix, physics change or motion-quality claim. Complete bodies/health/positions unchanged across views; native canvas PNGs exclude the real pause overlay shown in separate context image.'}));
  await writeFile(path.join(output,'static-concept.json'),JSON.stringify(report,null,2));
}
