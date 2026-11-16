import * as baseline from './baseline-adapter.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const states=new WeakMap();
export async function beforeNavigate(page,config){await baseline.beforeNavigate(page,config);await page.addInitScript(()=>localStorage.setItem('poke-arena:sound','false'));states.set(page,{observations:0,saved:new Set(),seen:false});}
export async function prepare(page,config){
  await baseline.prepare(page,config);
  await page.evaluate(async()=>{
    const q=__reviewAdapter,g=q.game,r=q.renderer;q.action=true;g.aiEnabled=false;
    await r.ensureSpecies([143]);g.hands[0][0]='stealthRock';g.hands[1][0]='snorlax';g.energy=[10,10];q.events=[];
    q.fixture={ready:true,phases:[],lastRocks:[],field:null,limits:'Public219 native current field profile:6s/r72/damage60. AI disabled, declared initial hand/energy. Enemy uses accepted native Game.deploy; player uses actual app hand/canvas clicks. Original actors, HP, timers, ticks, geometry and normal Game.step30Hz/rAF; no posed/frozen cycle. Silent capture, no sound judgment.'};
    const draw=r.draw;r.draw=function(...args){q.fixture.lastRocks=[];return draw.apply(this,args);};
    const field=r.field;r.field=function(ctx,f,front){q.currentField=f;try{return field.call(this,ctx,f,front);}finally{q.currentField=null;}};
    const art=r.combatArt;r.combatArt=function(ctx,name,x,y,...args){if(name==='rock'&&q.currentField?.key==='stealthRock')q.fixture.lastRocks.push({x,y,age:q.currentField.visualAge,fieldId:q.currentField.id});return art.call(this,ctx,name,x,y,...args);};
  });
  await page.waitForFunction(()=>document.querySelector('#hand [data-card="0"]')?.textContent.includes('Trampa rocas'));
  await page.evaluate(()=>document.fonts.ready);
}
async function save(page,name,state){
  const output=process.env.REVIEW_STATIC_OUTPUT;if(!output)throw Error('Use a fresh REVIEW_STATIC_OUTPUT');await mkdir(output,{recursive:true});
  await page.evaluate(name=>{const q=__reviewAdapter,g=q.game,f=g.fields.find(f=>f.key==='stealthRock');q.fixture.phases.push({name,epochMs:performance.timeOrigin+performance.now(),gameTime:g.elapsed,field:f?{...f}:null,rocks:q.fixture.lastRocks.slice()});},name);
  await page.screenshot({path:path.join(output,`${name}.png`)});await page.locator('#arena').screenshot({path:path.join(output,`${name}-canvas.png`)});state.saved.add(name);
}
export async function observe(page,config){
  const state=states.get(page);
  if(state.observations++===1){
    await page.evaluate(()=>{const q=__reviewAdapter;q.fixture.enemyDeploy=q.game.deploy(1,0,312,364);if(!q.fixture.enemyDeploy.ok)throw Error('native enemy deploy rejected');});
    await page.locator('#hand [data-card="0"]').click();
    const p=await page.evaluate(()=>{const r=__reviewAdapter.renderer,b=r.canvas.getBoundingClientRect(),p=r.projection;return{x:b.x+p.x+312*p.scale,y:b.y+p.y+436*p.scale};});
    await page.mouse.click(p.x,p.y);await page.waitForFunction(()=>__reviewAdapter.events.some(e=>e.type==='cast'));
  }
  const current=await page.evaluate(()=>{const q=__reviewAdapter,g=q.game,f=g.fields.find(f=>f.key==='stealthRock');q.fixture.field=f?{...f}:null;return f?{life:f.life,duration:f.duration}:null;});
  if(current){
    state.seen=true;
    if(!state.saved.has('start'))await save(page,'start',state);
    else if(current.duration-current.life>=1.5&&!state.saved.has('active'))await save(page,'active',state);
    else if(current.duration-current.life>=2.3&&!state.saved.has('active-later'))await save(page,'active-later',state);
  }else if(state.seen&&!state.saved.has('gone'))await save(page,'gone',state);
  const sample=await baseline.observe(page,config);
  if(state.saved.has('gone'))await writeFile(path.join(process.env.REVIEW_STATIC_OUTPUT,'lifecycle.json'),JSON.stringify({fixture:sample.fixture,events:sample.events,instrumentation:sample.instrumentation},null,2));
  return sample;
}
