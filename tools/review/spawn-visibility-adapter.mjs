import * as baseline from './baseline-adapter.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const states=new WeakMap();
export async function beforeNavigate(page,config){await baseline.beforeNavigate(page,config);await page.addInitScript(()=>localStorage.setItem('poke-arena:sound','false'));states.set(page,{observations:0,saved:false});}
export async function prepare(page,config){
  await baseline.prepare(page,config);
  await page.evaluate(async config=>{
    const q=__reviewAdapter,g=q.game,r=q.renderer;
    const parentKey=config.parentKey||'raltsHut',parent=q.CARDS[parentKey];
    q.action=true;g.aiEnabled=false;await r.ensureSpecies([50,261,280,143,parent.id,q.CARDS[parent.summon].id].filter(Number.isInteger));
    g.hands[0][0]=parentKey;g.hands[1][0]='snorlax';g.energy=[10,10];q.events=[];
    const measuredHeights=Object.fromEntries(['diglettHorde','poochyenaToken','raltsToken','raltsTrio','exeggcute'].map(key=>[key,r.bodyHeight({card:q.CARDS[key]})]));
    q.fixture={ready:true,parentKey,measuredHeights,deploys:[],summons:[],lastFrame:[],frames:[],limits:'Default public219 native catalogue. AI disabled; declared initial hands/energy, actual Game.deploy accepted points. No actor, HP, spawn, sort, physics or clock replacement. Parent uses actual card summon count, delays and spacing; no fixture override.'};
    const draw=r.draw;r.draw=function(...args){q.fixture.lastFrame=[];return draw.apply(this,args);};
    const sprite=r.sprite;r.sprite=function(ctx,unit,...args){if(!unit.mounted&&!unit.preview&&!this.silhouettePass)q.fixture.lastFrame.push({kind:'sprite',id:unit.id,key:unit.key,parentId:unit.parentId??null,x:unit.x,y:unit.y,sortY:unit.visualSortY??unit.y});return sprite.call(this,ctx,unit,...args);};
    const health=r.healthBar;r.healthBar=function(ctx,unit,x,y,width,compact=false){const border=compact?1:2;q.fixture.lastFrame.push({kind:'health',id:unit.id,key:unit.key,parentId:unit.parentId??null,x,y,width,compact,outline:{left:x-width/2-border,right:x+width/2+border,top:y-border,bottom:y+(compact||unit.maxHp<=1?4:8)+border},hp:unit.hp,maxHp:unit.maxHp});return health.call(this,ctx,unit,x,y,width,compact);};
  },config);
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(resolve));});
}
export async function observe(page,config){
  const state=states.get(page);
  if(state.observations++===1)await page.evaluate(()=>{
    const q=__reviewAdapter,g=q.game,f=q.fixture;f.startAt=g.elapsed;
    f.deploys=[g.deploy(0,0,168,508),g.deploy(1,0,168,364)];if(f.deploys.some(result=>!result.ok))throw Error('native fixture placement rejected');
  });
  await page.evaluate(()=>{
    const q=__reviewAdapter,g=q.game,f=q.fixture,parent=g.units.find(u=>u.key===f.parentKey),children=g.units.filter(u=>u.parentId===parent?.id);
    for(const u of children)if(!f.summons.some(x=>x.id===u.id))f.summons.push({id:u.id,key:u.key,x:u.x,y:u.y,parentId:u.parentId,hp:u.hp,maxHp:u.maxHp,spawn:u.spawn,createdAt:u.createdAt,observedAt:g.elapsed});
    if(children.length===2&&children.every(u=>u.spawn<=0)&&!f.pair){f.pair={epochMs:performance.timeOrigin+performance.now(),gameTime:g.elapsed,parent:{id:parent.id,x:parent.x,y:parent.y,hp:parent.hp},children:children.map(u=>({id:u.id,key:u.key,x:u.x,y:u.y,hp:u.hp,maxHp:u.maxHp,parentId:u.parentId,moving:u.moving,attack:u.attack,targetId:u.target?.id??null})),renderedFrame:f.lastFrame.slice()};}
    if(children.length===2&&g.elapsed>=f.startAt+5.7&&!f.clearPair)f.clearPair={epochMs:performance.timeOrigin+performance.now(),gameTime:g.elapsed,parent:{id:parent.id,x:parent.x,y:parent.y,hp:parent.hp},children:children.map(u=>({id:u.id,key:u.key,x:u.x,y:u.y,hp:u.hp,parentId:u.parentId})),renderedFrame:f.lastFrame.slice()};
  });
  const sample=await baseline.observe(page,config);
  if(config.rasterControl&&sample.fixture.pair&&!state.rasterDone){await rasterControl(page);state.rasterDone=true;}
  if(sample.fixture.pair&&!state.saved){
    const output=process.env.REVIEW_STATIC_OUTPUT;if(!output)throw Error('Use fresh REVIEW_STATIC_OUTPUT');await mkdir(output,{recursive:true});
    await page.screenshot({path:path.join(output,'pair.png')});await page.locator('#arena').screenshot({path:path.join(output,'pair-canvas.png')});
    await writeFile(path.join(output,'pair.json'),JSON.stringify(sample.fixture,null,2));state.saved=true;
  }
  if(config.clearPair&&sample.fixture.clearPair&&!state.clearSaved){
    const output=process.env.REVIEW_STATIC_OUTPUT;await page.screenshot({path:path.join(output,'pair-clear.png')});await page.locator('#arena').screenshot({path:path.join(output,'pair-clear-canvas.png')});await writeFile(path.join(output,'pair-clear.json'),JSON.stringify(sample.fixture,null,2));state.clearSaved=true;
  }
  if(config.staticConcept&&state.saved&&!state.conceptDone){
    await staticConcept(page);state.conceptDone=true;
  }
  return sample;
}
async function rasterControl(page){
  const output=process.env.REVIEW_STATIC_OUTPUT;
  await mkdir(output,{recursive:true});
  await page.locator('#match-pause').click();await page.waitForFunction(()=>__reviewAdapter.game.state==='paused');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const before=await page.evaluate(()=>({time:__reviewAdapter.game.elapsed,renderTime:__reviewAdapter.renderer.t,canvas:__reviewAdapter.renderer.canvas.toDataURL('image/png')}));
  await page.waitForTimeout(350);
  const after=await page.evaluate(()=>({time:__reviewAdapter.game.elapsed,renderTime:__reviewAdapter.renderer.t,canvas:__reviewAdapter.renderer.canvas.toDataURL('image/png')}));
  if(before.time!==after.time||before.renderTime!==after.renderTime||before.canvas!==after.canvas)throw Error('native pause changed the visible body/health scene');
  const raster=await page.evaluate(async()=>{
    const {drawVisibleStructure,structureOcclusionRegions}=await import('./unit-visibility.js?v=34'),{STRUCTURE_ART}=await import('./battle-art.js?v=36');
    const q=__reviewAdapter,r=q.renderer,actor=[...r.frameActors.values()].find(u=>u.key===q.fixture.parentKey),p=r.projection,real=r.canvas,b=real.getBoundingClientRect(),dpr=real.width/b.width;
    const height=r.bodyHeight(actor),width=Math.max(actor.radius*3,STRUCTURE_ART[actor.card.structureArt]?.width||height*.82),box={left:actor.x-width/2,right:actor.x+width/2,top:actor.y-height,bottom:actor.y+8};
    const regions=structureOcclusionRegions(actor,r.frameActors.values(),box,u=>({width:Math.max(10,u.radius*2+6),height:r.bodyHeight(u)-(u.card.flying?16:0),bottom:u.y-(u.card.flying?16:0)}));
    const make=()=>{const c=document.createElement('canvas');c.width=real.width;c.height=real.height;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#b2ce88';ctx.fillRect(0,0,c.width,c.height);ctx.setTransform(p.scale*dpr,0,0,p.scale*dpr,p.x*dpr,p.y*dpr);return c;};
    const direct=make(),masked=make();r.sprite(direct.getContext('2d'),actor,true);drawVisibleStructure(masked.getContext('2d'),box,regions,ctx=>r.sprite(ctx,actor,true));
    const a=direct.getContext('2d').getImageData(0,0,real.width,real.height).data,z=masked.getContext('2d').getImageData(0,0,real.width,real.height).data;
    let changedInside=0,changedOutside=0,maxOutside=0;
    for(let y=0;y<real.height;y++)for(let x=0;x<real.width;x++){
      const i=(y*real.width+x)*4,delta=Math.max(...[0,1,2,3].map(k=>Math.abs(a[i+k]-z[i+k])));if(!delta)continue;
      const wx=(x+.5-p.x*dpr)/(p.scale*dpr),wy=(y+.5-p.y*dpr)/(p.scale*dpr),padding=2/(p.scale*dpr);
      if(regions.some(region=>Math.abs(wx-region.x)<=region.rx+padding&&Math.abs(wy-region.y)<=region.ry+padding))changedInside++;
      else{changedOutside++;maxOutside=Math.max(maxOutside,delta);}
    }
    if(!regions.length||!changedInside||maxOutside>1)throw Error('native raster control failed: '+JSON.stringify({regions:regions.length,changedInside,changedOutside,maxOutside}));
    return{direct:direct.toDataURL('image/png'),masked:masked.toDataURL('image/png'),stats:{parentKey:q.fixture.parentKey,regions,changedInside,changedOutside,maxOutside,paddingDevicePixels:2,limits:'Direct original body painter versus production local-mask wrapper at the same real device-pixel transform. Outside expanded mask bounds must differ by at most one8bit channel step; no texture/frame/physics changes.'}};
  });
  for(const name of['direct','masked'])await writeFile(path.join(output,`raster-${name}.png`),Buffer.from(raster[name].split(',')[1],'base64'));
  await page.evaluate(data=>__reviewAdapter.fixture.control=data,{pause:{equal:true,gameTime:before.time,renderTime:before.renderTime,durationMs:350},raster:raster.stats});
  await writeFile(path.join(output,'raster-pause-control.json'),JSON.stringify({pause:{equal:true,gameTime:before.time,renderTime:before.renderTime,durationMs:350},raster:raster.stats},null,2));
  await page.locator('#resume-btn').click();
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
