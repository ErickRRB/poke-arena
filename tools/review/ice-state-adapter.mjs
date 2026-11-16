import * as baseline from './baseline-adapter.mjs';

export async function beforeNavigate(page,config){
  if(config.reviewReduced)await page.emulateMedia({reducedMotion:'reduce'});
  return baseline.beforeNavigate(page,config);
}
export async function prepare(page,config){
  await baseline.prepare(page,config);
  if(config.reviewPause)await page.evaluate(()=>{
    const q=globalThis.__reviewAdapter;q.reviewPause=[];
    const timer=setInterval(()=>{
      const actor=q.game.units.find(u=>u.key==='lapras');
      if(!actor||q.game.state!=='playing'||!(actor.attack>0)||actor.card.attackDuration-actor.attack<.22)return;
      clearInterval(timer);document.querySelector('#match-pause').click();
      q.reviewPause.push({event:'pause',epochMs:performance.timeOrigin+performance.now(),gameTime:q.game.elapsed,state:q.game.state,attack:actor.attack});
      setTimeout(()=>{document.querySelector('#match-pause').click();q.reviewPause.push({event:'resume',epochMs:performance.timeOrigin+performance.now(),gameTime:q.game.elapsed,state:q.game.state,attack:actor.attack});},800);
    },10);
  });
}
export async function observe(page,config){
  const result=await baseline.observe(page,config);
  result.reviewState=await page.evaluate(()=>({reduced:__reviewAdapter.renderer.reduced,pause:__reviewAdapter.reviewPause||[]}));
  return result;
}
