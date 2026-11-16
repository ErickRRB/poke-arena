import * as baseline from './baseline-adapter.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

const states=new WeakMap();
export async function beforeNavigate(page,config){
  await baseline.beforeNavigate(page,config);
  await page.addInitScript(()=>localStorage.setItem('poke-arena:sound','false'));
  const state={observations:0,cdp:null};states.set(page,state);
  if(config.input==='touch'){
    state.cdp=await page.context().newCDPSession(page);
    await state.cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  }
}
export async function prepare(page,config){
  await baseline.prepare(page,config);
  await page.evaluate(async config=>{
    const q=__reviewAdapter,g=q.game,r=q.renderer;
    q.action=true;g.aiEnabled=false;
    await r.ensureSpecies([315]);g.hands[0][0]='roselia';g.energy[0]=10;
    if(config.destroyedLane!==undefined){const tower=g.towers.find(t=>t.team===1&&!t.king&&t.lane===config.destroyedLane);g.damage(tower,tower.hp,0);}
    const rects=()=>Object.fromEntries(['arena','hand','energy-bar'].map(id=>{const b=document.getElementById(id).getBoundingClientRect();return[id,{x:b.x,y:b.y,width:b.width,height:b.height}];}));
    const stamp=()=>({epochMs:performance.timeOrigin+performance.now(),gameTime:g.elapsed});
    q.fixture={ready:true,input:config.input,raw:config.raw,expected:config.expected,destroyedLane:config.destroyedLane??null,rects:{before:rects()},phases:[],inputEvents:[],submissions:[],ghosts:[],limits:'Native app gesture, CPU game with AI disabled, first hand slot Roselia and initial energy10. Optional princess destroyed through native damage. Browser touch emulation, not a physical device. No time, renderer or deployment rule replacements.'};
    q.fixtureReadRects=rects;q.fixtureStamp=stamp;
    const deploy=g.deploy;g.deploy=function(team,index,x,y){
      const before=this.energy[team],result=deploy.apply(this,arguments),f=q.fixture;
      f.submissions.push({...stamp(),team,index,x,y,before,after:this.energy[team],result,spawnGroups:this.units.filter(u=>u.team===team&&u.spawnGroup?.startAt===this.elapsed).map(u=>({id:u.id,key:u.key,x:u.x,y:u.y,anchorX:u.spawnGroup.x,anchorY:u.spawnGroup.y}))});return result;
    };
    const sprite=r.sprite;r.sprite=function(ctx,unit,...args){
      if(unit.preview){const f=q.fixture,last=f.ghosts.at(-1);if(!last||last.x!==unit.x||last.y!==unit.y)f.ghosts.push({...stamp(),x:unit.x,y:unit.y,key:this.selection,raw:this.pointer?{...this.pointer}:null});}
      return sprite.call(this,ctx,unit,...args);
    };
    for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])document.addEventListener(type,e=>{
      const hit=document.elementFromPoint(e.clientX,e.clientY),f=q.fixture;
      f.inputEvents.push({...stamp(),type,pointerType:e.pointerType,pointerId:e.pointerId,x:e.clientX,y:e.clientY,target:e.target.id||e.target.tagName,hit:hit?.id||hit?.tagName,control:hit?.closest('button')?.id||null});
    },true);
    q.events=[];
  },config);
  await page.waitForFunction(()=>document.querySelector('#hand [data-card="0"]')?.textContent.includes('Roselia'));
  if(config.destroyedLane!==undefined)await page.waitForTimeout(900);
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));__reviewAdapter.fixture.rects.before=__reviewAdapter.fixtureReadRects();});
}
async function savePhase(page,config,name){
  const output=process.env.REVIEW_STATIC_OUTPUT;if(!output)throw Error('Use a fresh REVIEW_STATIC_OUTPUT for native phase evidence');
  await mkdir(output,{recursive:true});
  await page.evaluate(name=>{const q=__reviewAdapter;q.fixture.phases.push({name,...q.fixtureStamp(),selection:q.renderer.selection,pointer:q.renderer.pointer?{...q.renderer.pointer}:null});q.fixture.rects[name]=q.fixtureReadRects();},name);
  await page.screenshot({path:path.join(output,`${config.id}-${name}.png`)});
  await page.locator('#arena').screenshot({path:path.join(output,`${config.id}-${name}-canvas.png`)});
}
async function perform(page,config,state){
  const card=await page.locator('#hand [data-card="0"]').boundingBox();
  const points=await page.evaluate(({raw})=>{const r=__reviewAdapter.renderer,b=r.canvas.getBoundingClientRect(),p=r.projection,screen=point=>({x:b.x+p.x+point.x*p.scale,y:b.y+p.y+point.y*p.scale});return{legal:screen({x:168,y:520}),raw:screen(raw)};},config);
  const start={x:card.x+card.width/2,y:card.y+card.height/2};
  if(config.input==='touch'){
    const dispatch=(type,p)=>state.cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p?[{x:p.x,y:p.y,id:1}]:[]});
    await dispatch('touchStart',start);await dispatch('touchMove',points.legal);await dispatch('touchMove',points.raw);
  }else if(config.input==='keyboard'){
    await page.locator('#arena').focus();await page.keyboard.press('1');
    for(let i=0;i<11;i++)await page.keyboard.press('ArrowUp');
  }else if(config.input==='mouse-click'){
    await page.locator('#hand [data-card="0"]').click();await page.mouse.move(points.raw.x,points.raw.y);
  }else{
    await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(points.legal.x,points.legal.y);await page.mouse.move(points.raw.x,points.raw.y);
  }
  await page.waitForFunction(expected=>{const g=__reviewAdapter.fixture.ghosts.at(-1);return g&&g.x===expected.x&&g.y===expected.y;},config.expected,{timeout:4000});
  if(config.input==='keyboard')await page.evaluate(expected=>{
    const text=document.getElementById('live-status').textContent;
    __reviewAdapter.fixture.keyboardAnnouncement=text;
    if(text!==`Posición ${expected.x}, ${expected.y}.`)throw Error('keyboard announcement differs from actual placement: '+text);
  },config.expected);
  await savePhase(page,config,'ghost');
  if(config.input==='touch')await state.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  else if(config.input==='keyboard')await page.keyboard.press('Enter');
  else if(config.input==='mouse-click')await page.mouse.click(points.raw.x,points.raw.y);
  else await page.mouse.up();
  await page.waitForFunction(()=>__reviewAdapter.fixture.submissions.length===1);
  await savePhase(page,config,'drop');
  await page.evaluate(expected=>{
    const q=__reviewAdapter,f=q.fixture,s=f.submissions[0],ghost=f.ghosts.at(-1);
    if(!s.result.ok||s.x!==expected.x||s.y!==expected.y||ghost.x!==s.x||ghost.y!==s.y)throw Error('preview and accepted placement differ');
    if(Math.abs(s.before-s.after-q.CARDS.roselia.cost)>1e-8||s.spawnGroups.length!==1||s.spawnGroups[0].anchorX!==s.x||s.spawnGroups[0].anchorY!==s.y)throw Error('unexpected native spawn or energy cost');
    if(q.renderer.selection!==null||q.renderer.pointer!==null)throw Error('preview not cleared after release');
    f.complete=true;
  },config.expected);
  if(config.focusedChecks)await cancellations(page,config,state,points);
}
async function cancellations(page,config,state,points){
  for(const name of ['outside','control',...(config.input==='touch'?['pointercancel']:[])]){
    const setup=await page.evaluate(name=>{
      const q=__reviewAdapter,g=q.game,index=g.hands[0].findIndex(key=>q.CARDS[key]?.cost<=g.energy[0]);
      if(index<0)throw Error('no affordable native hand card for cancellation');
      return{name,index,submissions:q.fixture.submissions.length,spent:g.stats[0].energy,state:g.state};
    },name);
    const box=await page.locator(`#hand [data-card="${setup.index}"]`).boundingBox(),start={x:box.x+box.width/2,y:box.y+box.height/2};
    const control=await page.locator('#match-pause').boundingBox();
    const end=name==='outside'?{x:4,y:4}:name==='control'?{x:control.x+control.width/2,y:control.y+control.height/2}:points.legal;
    if(config.input==='touch'){
      const dispatch=(type,p)=>state.cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p?[{x:p.x,y:p.y,id:1}]:[]});
      await dispatch('touchStart',start);await dispatch('touchMove',points.legal);await dispatch('touchMove',end);
      await dispatch(name==='pointercancel'?'touchCancel':'touchEnd');
    }else{
      await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(points.legal.x,points.legal.y);await page.mouse.move(end.x,end.y);await page.mouse.up();
    }
    await page.waitForTimeout(120);
    await page.evaluate(setup=>{
      const q=__reviewAdapter,g=q.game,f=q.fixture;
      const result={...setup,...q.fixtureStamp(),afterSubmissions:f.submissions.length,afterSpent:g.stats[0].energy,afterState:g.state,selection:q.renderer.selection,pointer:q.renderer.pointer,lastInput:f.inputEvents.at(-1)};
      (f.cancellations??=[]).push(result);
      if(result.afterSubmissions!==setup.submissions||result.afterSpent!==setup.spent||result.afterState!==setup.state||result.selection!==null||result.pointer!==null)throw Error('gesture did not cancel: '+JSON.stringify(result));
      if(setup.name==='control'&&result.lastInput.control!=='match-pause')throw Error('control case did not hit the real pause control');
    },setup);
  }
  await savePhase(page,config,'canceled');
}
export async function observe(page,config){
  const state=states.get(page);
  if(state.observations++===1)await perform(page,config,state);
  const sample=await baseline.observe(page,config);
  if(sample.fixture.complete){
    const output=process.env.REVIEW_STATIC_OUTPUT;await writeFile(path.join(output,`${config.id}-gesture.json`),JSON.stringify(sample.fixture,null,2));
    const before=sample.fixture.rects.before;
    for(const [phase,rects] of Object.entries(sample.fixture.rects))for(const id of Object.keys(before))if(JSON.stringify(before[id])!==JSON.stringify(rects[id]))throw Error(`layout changed during placement: ${phase} ${id} ${JSON.stringify(before[id])} -> ${JSON.stringify(rects[id])}`);
  }
  return sample;
}
