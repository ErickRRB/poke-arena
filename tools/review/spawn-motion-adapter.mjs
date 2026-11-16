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
    await r.ensureSpecies([50,280,143,parent.id,q.CARDS[parent.summon].id].filter(Number.isInteger));
    g.hands[team][0]=key;g.hands[1-team][0]='snorlax';g.energy=[10,10];if(config.denseSidecar)g.hands[1-team][1]='diglettHorde';
    q.actionRects=()=>Object.fromEntries(['arena','hand','energy-bar'].map(id=>{const b=document.getElementById(id).getBoundingClientRect();return[id,[b.x,b.y,b.width,b.height]];}));
    q.fixture={ready:false,parentKey:key,team,initialRects:q.actionRects(),lastFrame:[],summons:[],reduced:r.reduced,limits:'Actual public audioD2 catalogue plus authored mask/HP delta. AI off, declared hands/energy, native Game.deploy accepted points and original towers. No actor/card/spawn/physics/HP/target/clock replacement. Sound muted; visual RNG uncontrolled. Transparent wrappers observe actual painters, including final fillRect geometry.'};
    const draw=r.draw;r.draw=function(...args){q.fixture.lastFrame=[];return draw.apply(this,args);};
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
      if(f.deploys.some(d=>!d.ok))throw Error('Native placement rejected');f.ready=true;
    }
    const parent=g.units.find(u=>u.key===f.parentKey),children=g.units.filter(u=>u.parentId===parent?.id);
    for(const u of children)if(!f.summons.some(v=>v.id===u.id))f.summons.push({id:u.id,key:u.key,parentId:u.parentId,x:u.x,y:u.y,hp:u.hp,maxHp:u.maxHp,spawn:u.spawn,at:g.elapsed});
    const frame=()=>({at:g.elapsed,epochMs:performance.timeOrigin+performance.now(),parent:parent?{id:parent.id,x:parent.x,y:parent.y,hp:parent.hp}:null,children:children.map(u=>({id:u.id,key:u.key,parentId:u.parentId,x:u.x,y:u.y,hp:u.hp,spawn:u.spawn,moving:u.moving,attack:u.attack,targetId:u.target?.id})),draws:f.lastFrame});
    if(children.length>=2&&children.slice(0,2).every(u=>u.spawn<=0)&&!f.pair)f.pair=frame();
    if(f.ready&&g.elapsed-f.startAt>=5.7&&!f.settled)f.settled=frame();
    if(config.denseSidecar&&f.ready&&g.elapsed-f.startAt>=1.25&&!f.denseEntry)f.denseEntry={at:g.elapsed,units:g.units.filter(u=>u.key==='diglettHorde').map(u=>({id:u.id,x:u.x,y:u.y,hp:u.hp,spawn:u.spawn})),draws:f.lastFrame.filter(d=>d.key==='diglettHorde')};
  },config);
  const fixture=await page.evaluate(()=>({...__reviewAdapter.fixture,rects:__reviewAdapter.actionRects()}));
  if(JSON.stringify(fixture.rects)!==JSON.stringify(fixture.initialRects))throw Error('Arena or hand displaced');
  await mkdir(output,{recursive:true});
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
