import * as baseline from './baseline-adapter.mjs';
import{mkdir,writeFile}from'node:fs/promises';
import path from'node:path';
const states=new WeakMap();
export async function beforeNavigate(page,config){
  await baseline.beforeNavigate(page,config);await page.addInitScript(()=>localStorage.setItem('poke-arena:sound','false'));
  await page.emulateMedia({reducedMotion:config.reduced?'reduce':'no-preference'});states.set(page,{});
}
export async function prepare(page,config){
  await baseline.prepare(page,config);
  await page.evaluate(async config=>{
    const q=__reviewAdapter,g=q.game,r=q.renderer,team=config.team||0,key=config.parentKey||'raltsHut',parent=q.CARDS[key];q.action=true;g.aiEnabled=false;
    await r.ensureSpecies([50,280,143,parent.id,q.CARDS[parent.summon].id,...(config.healthDamageAndDeath?[227]:[])].filter(Number.isInteger));
    g.hands[team][0]=key;g.hands[1-team][0]='snorlax';g.energy=[10,10];if(config.denseSidecar)g.hands[1-team][1]='diglettHorde';
    if(config.healthDamageAndDeath){if(team!==0)throw Error('Health/death fixture requires its declared side0');g.hands[0][1]='diglettHorde';g.hands[0][2]='thunder';g.hands[1][1]='skarmory';}
    q.actionRects=()=>Object.fromEntries(['arena','hand','energy-bar'].map(id=>{const b=document.getElementById(id).getBoundingClientRect();return[id,[b.x,b.y,b.width,b.height]];}));
    q.fixture={ready:false,parentKey:key,team,initialRects:q.actionRects(),lastFrame:[],summons:[],frames:{},reduced:r.reduced,limits:'Actual frozen public catalogue plus authored mask/HP delta. AI off, declared hands/energy10, native Game.deploy accepted points and original towers. No actor/card/spawn/physics/HP/target/clock replacement. Sound muted; visual RNG uncontrolled. Transparent wrappers observe actual painters, including final fillRect geometry. Health/death case uses public7283, one actual native Thunder and synchronously encodes one exact canvas per new phase; no posed state.'};
    const draw=r.draw;r.draw=function(...args){
      const f=q.fixture;f.lastFrame=[];const value=draw.apply(this,args);if(!config.healthDamageAndDeath||!f.ready)return value;
      const parent=g.units.find(u=>u.key===f.parentKey),army=g.units.filter(u=>u.key==='diglettHorde'),shield=g.units.find(u=>u.key==='skarmory');
      if(parent)f.parentId=parent.id;
      const fields=u=>({id:u.id,key:u.key,parentId:u.parentId,x:u.x,y:u.y,hp:u.hp,maxHp:u.maxHp,shield:u.shield,maxShield:u.maxShield,spawn:u.spawn,lifetime:u.lifetime});
      const effect=r.effects.find(e=>e.kind==='structureDeath'&&e.art==='raltsHut'),progress=effect?1-effect.life/effect.max:null;
      const save=name=>{if(!f.frames[name])f.frames[name]={gameTime:g.elapsed,renderTime:r.t,parent:parent?fields(parent):null,units:g.units.map(fields),draws:f.lastFrame,effect:effect?{art:effect.art,life:effect.life,max:effect.max,progress}:null,png:r.canvas.toDataURL()};};
      if(army.length===15&&army.every(u=>u.spawn<=0&&u.hp===u.maxHp&&u.shield===u.maxShield)&&shield?.spawn<=0&&shield.shield===shield.maxShield){
        save('healthy');if(f.lastFrame.some(d=>d.kind==='health'&&army.some(u=>u.id===d.id)))f.error='Healthy native army unexpectedly paints health';
      }
      if(shield?.shield<shield?.maxShield){save('shield-damaged');if(shield.hp!==shield.maxHp)f.error='Declared shield-only first damage unexpectedly changed HP';}
      if(parent?.hp>0&&parent.hp<parent.maxHp*.2)save('before-death');
      if(effect){save('death');if(progress>=.45)save('collapse');}
      if(!parent&&!effect&&f.frames.death)save('after-death');return value;
    };
    const sprite=r.sprite;r.sprite=function(c,u,...args){if(!u.preview&&!u.mounted&&!this.silhouettePass)q.fixture.lastFrame.push({kind:'sprite',id:u.id,key:u.key,parentId:u.parentId,x:u.x,y:u.y});return sprite.call(this,c,u,...args);};
    const health=r.healthBar;r.healthBar=function(c,u,x,y,width,compact=false){
      const rectangles=[],fill=c.fillRect,m=c.getTransform(),dpr=r.canvas.width/r.canvas.getBoundingClientRect().width;
      c.fillRect=function(a,b,w,h){rectangles.push({color:c.fillStyle,css:[(a*m.a+m.e)/dpr,(b*m.d+m.f)/dpr,w*m.a/dpr,h*m.d/dpr]});return fill.call(this,a,b,w,h);};
      try{return health.call(this,c,u,x,y,width,compact);}finally{c.fillRect=fill;q.fixture.lastFrame.push({kind:'health',id:u.id,key:u.key,parentId:u.parentId,x,y,width,compact,hp:u.hp,maxHp:u.maxHp,rectangles});}
    };
  },config);
}
export async function observe(page,config){
  const sample=await baseline.observe(page,config),state=states.get(page),output=process.env.REVIEW_STATIC_OUTPUT;
  if(!output)throw Error('Use fresh REVIEW_STATIC_OUTPUT');
  await page.evaluate(config=>{
    const q=__reviewAdapter,g=q.game,f=q.fixture,team=f.team;
    if(!f.ready&&q.observations===2){
      const x=config.denseSidecar?444:168;f.startAt=g.elapsed;f.deploys=[g.deploy(team,0,x,team?292:508),g.deploy(1-team,0,x,team?436:364)];
      if(config.denseSidecar)f.deploys.push(g.deploy(1-team,1,168,700));
      if(config.healthDamageAndDeath)f.deploys.push(g.deploy(0,1,444,700),g.deploy(1,1,444,244));
      if(f.deploys.some(d=>!d.ok))throw Error('Native placement rejected');f.ready=true;
    }
    const parent=g.units.find(u=>u.key===f.parentKey),children=g.units.filter(u=>u.parentId===parent?.id);
    for(const u of children)if(!f.summons.some(v=>v.id===u.id))f.summons.push({id:u.id,key:u.key,parentId:u.parentId,x:u.x,y:u.y,hp:u.hp,maxHp:u.maxHp,spawn:u.spawn,at:g.elapsed});
    const frame=()=>({at:g.elapsed,epochMs:performance.timeOrigin+performance.now(),parent:parent?{id:parent.id,x:parent.x,y:parent.y,hp:parent.hp}:null,children:children.map(u=>({id:u.id,key:u.key,parentId:u.parentId,x:u.x,y:u.y,hp:u.hp,spawn:u.spawn,moving:u.moving,attack:u.attack,targetId:u.target?.id})),draws:f.lastFrame});
    if(children.length>=2&&children.slice(0,2).every(u=>u.spawn<=0)&&!f.pair)f.pair=frame();
    if(f.ready&&g.elapsed-f.startAt>=5.7&&!f.settled)f.settled=frame();
    if(config.denseSidecar&&f.ready&&g.elapsed-f.startAt>=1.25&&!f.denseEntry)f.denseEntry={at:g.elapsed,units:g.units.filter(u=>u.key==='diglettHorde').map(u=>({id:u.id,x:u.x,y:u.y,hp:u.hp,spawn:u.spawn})),draws:f.lastFrame.filter(d=>d.key==='diglettHorde')};
  },config);
  if(config.healthDamageAndDeath)await page.evaluate(()=>{const q=__reviewAdapter,f=q.fixture;if(f.frames.healthy&&!f.zap){const u=q.game.units.find(u=>u.key==='skarmory');f.zap={at:q.game.elapsed,before:{hp:u.hp,maxHp:u.maxHp,shield:u.shield,maxShield:u.maxShield},aim:{x:u.x,y:u.y},result:q.game.deploy(0,2,u.x,u.y)};if(!f.zap.result.ok)f.error='Native Thunder placement rejected';}});
  const fixture=await page.evaluate(()=>{const q=__reviewAdapter;return{...q.fixture,frames:Object.fromEntries(Object.entries(q.fixture.frames).map(([k,{png,...frame}])=>[k,frame])),rects:q.actionRects()};});
  if(fixture.error)throw Error(fixture.error);
  if(JSON.stringify(fixture.rects)!==JSON.stringify(fixture.initialRects))throw Error('Arena or hand displaced');
  await mkdir(output,{recursive:true});
  if(config.healthDamageAndDeath){
    for(const name of Object.keys(fixture.frames))if(!state[name]){
      const png=await page.evaluate(name=>{const frame=__reviewAdapter.fixture.frames[name],png=frame.png;delete frame.png;return png;},name);
      await writeFile(path.join(output,name+'.png'),Buffer.from(png.split(',')[1],'base64'));await writeFile(path.join(output,name+'.json'),JSON.stringify(fixture.frames[name],null,2));state[name]=true;
      if(name==='healthy')await page.screenshot({path:path.join(output,'healthy-context.png')});
    }
    return{...sample,fixture};
  }
  for(const name of['pair','settled','denseEntry'])if(fixture[name]&&!state[name]){
    await page.screenshot({path:path.join(output,name+'.png')});await page.locator('#arena').screenshot({path:path.join(output,name+'-canvas.png')});
    await writeFile(path.join(output,name+'.json'),JSON.stringify(fixture[name],null,2));state[name]=true;
  }
  if(config.pauseControl&&fixture.settled&&!state.pause){
    state.pause=true;await page.locator('#match-pause').click();await page.waitForFunction(()=>__reviewAdapter.game.state==='paused');
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const before=await page.evaluate(()=>({time:__reviewAdapter.game.elapsed,render:__reviewAdapter.renderer.t,png:__reviewAdapter.renderer.canvas.toDataURL()}));await page.waitForTimeout(350);
    const proof=await page.evaluate(before=>{
      const q=__reviewAdapter,g=q.game,r=q.renderer,method=CanvasRenderingContext2D.prototype.getImageData;let reads=0;
      try{CanvasRenderingContext2D.prototype.getImageData=function(...args){reads++;return method.apply(this,args);};r.draw(g,0);}finally{CanvasRenderingContext2D.prototype.getImageData=method;}
      return{gameStable:g.elapsed===before.time,renderStable:r.t===before.render,rasterStable:r.canvas.toDataURL()===before.png,pixelReadbacksDuringActualPausedDraw:reads,gameTime:g.elapsed,renderTime:r.t,holdMs:350,limits:'Actual CPU pause, original overlay visible. One observed paused product draw; not a browser performance or continuous perceptual pass.'};
    },before);
    if(!proof.gameStable||!proof.renderStable||!proof.rasterStable)throw Error('Actual paused scene changed');
    await page.evaluate(proof=>__reviewAdapter.fixture.pause=proof,proof);await writeFile(path.join(output,'pause.json'),JSON.stringify(proof,null,2));await page.locator('#resume-btn').click();
  }
  return{...sample,fixture};
}
