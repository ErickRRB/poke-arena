import * as baseline from './baseline-adapter.mjs';
export async function beforeNavigate(page,config){await page.addInitScript(()=>localStorage.setItem('poke-arena:sound','false'));await baseline.beforeNavigate(page,config);}
export async function prepare(page,config){
  await baseline.prepare(page,config);
  await page.evaluate(async config=>{
    const q=__reviewAdapter,g=q.game,r=q.renderer;q.action=true;g.pause();
    await r.ensureSpecies([143,6]);
    for(const id of [143,6])if(!r.sprites.get(id+'-Walk')?.width)throw Error('Missing sprite '+id);
    if(q.CARDS.snorlax.id!==143||q.CARDS.charizard.id!==6)throw Error('Wrong species');
    g.units=[];g.projectiles=[];g.spells=[];g.fields=[];g.attacks=[];r.resetVisuals();r.effects=[];r.particles=[];q.events=[];
    g.seed=4;g.energy[1]=3;g.aiEnabled=true;g.aiClock=0;g.hands[1]=['whirlpool','pikachu','snorlax','charizard'];g.queues[1]=['thunder','fireball','zubat','machamp'];
    const a=g.spawn('snorlax',0,210,300,0),b=g.spawn('snorlax',0,270,300,0),ally=g.spawn('charizard',1,240,215,0);
    const actors=[a,b,ally].map(u=>({id:u.id,key:u.key,team:u.team,x:u.x,y:u.y,hp:u.hp,maxHp:u.maxHp,spawn:u.spawn,target:u.target?.id??null}));
    const dialogs=[...document.querySelectorAll('dialog[open]')].map(d=>d.id);
    if(dialogs.length||actors.some(u=>u.hp!==u.maxHp||u.spawn!==0)||g.state!=='paused'||g.hands[1][0]!=='whirlpool'||g.energy[1]!==3)throw Error('Scene preflight failed');
    q.fixture={ready:true,actors,dialogs,initialGameTime:g.elapsed,hand:[...g.hands[1]],energy:g.energy[1],preRollMs:config.preRollMs,limits:'Authored starting positions/hand/seed, full native HP, tower behavior and CPU enabled. Original Game.step and app rAF; fixture creates actors directly, not through player hand. Audio muted.'};
    setTimeout(()=>{q.fixture.resumeEpochMs=performance.timeOrigin+performance.now();q.fixture.resumeGameTime=g.elapsed;g.resume();},config.preRollMs);
  },config);
}
export async function observe(page,config){
  const result=await baseline.observe(page,config);
  result.fixture=await page.evaluate(()=>{const q=__reviewAdapter,g=q.game;return {...q.fixture,fields:g.fields.map(f=>({key:f.key,x:f.x,y:f.y,life:f.life,duration:f.duration})),actors:q.fixture.actors.map(a=>{const u=g.units.find(u=>u.id===a.id);return {...a,current:u?{x:u.x,y:u.y,hp:u.hp,target:u.target?.id??null,attack:u.attack,cooldown:u.cooldown}:null};})};});
  if(result.instrumentation.lastStepDt!==1/30)throw Error('Expected 30 Hz Game.step');
  return result;
}
