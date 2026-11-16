import * as baseline from './baseline-adapter.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const states=new WeakMap();
export async function beforeNavigate(page,config){await baseline.beforeNavigate(page,config);await page.addInitScript(()=>localStorage.setItem('poke-arena:sound','false'));states.set(page,{observations:0,saved:new Set()});}
export async function prepare(page,config){
  await baseline.prepare(page,config);
  await page.evaluate(async()=>{
    const q=__reviewAdapter,g=q.game,r=q.renderer;q.action=true;g.aiEnabled=false;await r.ensureSpecies([50]);g.hands[0][0]='diglettHorde';g.energy[0]=10;q.events=[];
    q.fixture={ready:true,phases:[],lastHealth:[],limits:'One native15-Diglett deployment through normal app hand/canvas clicks; AI disabled, declared first hand/energy. No unit/stat/formation/timing/HP overrides. Dense control justified by shared compact-health fallback and initial15-formation layout failures.'};
    const draw=r.draw;r.draw=function(...args){q.fixture.lastHealth=[];return draw.apply(this,args);};
    const health=r.healthBar;r.healthBar=function(c,u,x,y,width,compact=false){q.fixture.lastHealth.push({id:u.id,key:u.key,x,y,width,compact,ownerX:u.x,ownerY:u.y,hp:u.hp});return health.call(this,c,u,x,y,width,compact);};
  });
  await page.waitForFunction(()=>document.querySelector('#hand [data-card="0"]')?.textContent.includes('Diglett'));await page.evaluate(()=>document.fonts.ready);
}
export async function observe(page,config){
  const state=states.get(page);
  if(state.observations++===1){
    await page.evaluate(()=>__reviewAdapter.fixture.startAt=__reviewAdapter.game.elapsed);await page.locator('#hand [data-card="0"]').click();
    const p=await page.evaluate(()=>{const r=__reviewAdapter.renderer,b=r.canvas.getBoundingClientRect(),p=r.projection;return{x:b.x+p.x+288*p.scale,y:b.y+p.y+556*p.scale};});await page.mouse.click(p.x,p.y);
  }
  const sample=await baseline.observe(page,config),elapsed=sample.gameTime-sample.fixture.startAt;
  const phase=elapsed>=2.2?'spread':elapsed>=1.2?'moving':elapsed>=.4?'entry':null;
  if(phase&&!state.saved.has(phase)){
    const output=process.env.REVIEW_STATIC_OUTPUT;await mkdir(output,{recursive:true});
    await page.evaluate(phase=>{const q=__reviewAdapter;if(q.game.units.length!==15)throw Error('native swarm does not contain15 members');q.fixture.phases.push({phase,gameTime:q.game.elapsed,health:q.fixture.lastHealth.slice(),units:q.game.units.map(u=>({id:u.id,x:u.x,y:u.y,hp:u.hp,spawn:u.spawn}))});},phase);
    await page.screenshot({path:path.join(output,`${phase}.png`)});state.saved.add(phase);
  }
  if(state.saved.has('spread'))await writeFile(path.join(process.env.REVIEW_STATIC_OUTPUT,'group.json'),JSON.stringify(sample.fixture,null,2));
  return sample;
}
