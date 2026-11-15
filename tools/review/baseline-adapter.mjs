const network = new WeakMap();
const supported = new Set(['clock','canvas','events','actorState','hp']);
function validate(config) {
  const requested=config.requiredObservations ?? [];
  if (!Array.isArray(requested) || requested.some(x=>!supported.has(x))) throw Error('unsupported required observation: '+(Array.isArray(requested)?requested.filter(x=>!supported.has(x)).join(', '):'invalid list'));
  if ('seed' in config) throw Error('seed injection is not supported by this transparent adapter');
  if(config.scenario){const x=config.scenario;if(!x.attacker?.key || !Number.isInteger(x.attacker.id) || !x.target?.key || !Number.isInteger(x.target.id) || !['north','east'].includes(x.orientation) || !Array.isArray(x.preload) || !x.preload.length || x.preload.some(p=>!Number.isInteger(p.id)||!p.animation) || !Number.isFinite(x.preRollMs) || x.preRollMs<400 || config.durationMs<x.preRollMs+3000) throw Error('invalid contact scenario');}

}
export async function beforeNavigate(page,config) {
  validate(config);
  const state={origin:null,requests:[],blocked:[],webSockets:[],webSocketIsolation:'unavailable'};
  network.set(page,state);
  if(typeof page.routeWebSocket==='function'){
    await page.routeWebSocket('**/*',async ws=>{const u=new URL(ws.url());state.webSockets.push({origin:u.origin,pathname:u.pathname});await ws.close({code:1008,reason:'local review isolation'});});
    state.webSocketIsolation='blocked-before-navigation';
  }else if(config.requireWebSocketIsolation!==false)throw Error('WebSocket isolation unavailable in this Playwright version');
  await page.route('**/*',route=>{
    const request=route.request(),u=new URL(request.url());
    if(!state.origin&&request.isNavigationRequest()&&request.frame()===page.mainFrame()&&u.protocol==='http:'&&u.hostname==='127.0.0.1'&&u.pathname==='/'+config.source){state.origin=u.origin;}
    const item={origin:u.origin,pathname:u.pathname};state.requests.push(item);
    if(!state.origin||u.origin!==state.origin||u.pathname==='/api'||u.pathname.startsWith('/api/')){state.blocked.push(item);return route.abort('blockedbyclient');}
    return route.continue();
  });
}
export async function prepare(page, config) {
  validate(config);
  if(!network.has(page)||!network.get(page).origin)throw Error('beforeNavigate isolation did not observe initial local navigation');
  await page.waitForFunction(()=>!document.querySelector('#start-btn')?.disabled);
  await page.evaluate(async()=>{
    const {Game,CARDS}=await import('./engine.js?v=34');
    const {Renderer}=await import('./render.js?v=36');
    const step=Game.prototype.step, emit=Game.prototype.emit, draw=Renderer.prototype.draw;
    const q=globalThis.__reviewAdapter={game:null,renderer:null,events:[],steps:0,draws:0,observations:0,action:false,CARDS,originals:{step,emit,draw},unsupported:['exact sprite frame','emitter position','visual particle seed','game constructor seed']};
    Game.prototype.step=function(...args){const value=step.apply(this,args);q.game=this;q.steps++;q.lastStepDt=args[0];return value;};
    Game.prototype.emit=function(type,data){const value=emit.apply(this,arguments);q.events.push({type,at:this.elapsed,key:data?.key??data?.unit?.key??null,attackerId:data?.attacker?.id??data?.sourceId??null,targetId:data?.target?.id??data?.targetId??null,sourceKey:data?.sourceKey??null,amount:data?.amount??null});if(q.events.length>500)q.events.shift();return value;};
    Renderer.prototype.draw=function(...args){const value=draw.apply(this,args);q.renderer=this;q.draws++;q.lastDrawDt=args[1];return value;};
  });
  await page.locator('#start-btn').click();
  await page.waitForFunction(()=>globalThis.__reviewAdapter?.game?.state==='playing' && globalThis.__reviewAdapter?.renderer);
  if(config.scenario) await page.evaluate(async scenario=>{
    const q=__reviewAdapter,g=q.game,r=q.renderer;
    const actor=q.CARDS[scenario.attacker.key], target=q.CARDS[scenario.target.key];
    if(actor?.id!==scenario.attacker.id || target?.id!==scenario.target.id) throw Error('scenario species ID mismatch');
    if(!scenario.preload.some(p=>p.id===actor.id && p.animation===(actor.attackAnim||'Attack')) || !scenario.preload.some(p=>p.id===target.id)) throw Error('actor and target must be preloaded');
    await r.ensureSpecies(scenario.preload.map(p=>p.id));
    for(const p of scenario.preload) if(!r.metadata[p.id]?.[p.animation] || !r.sprites.get(p.id+'-'+p.animation)?.width) throw Error('missing preloaded animation '+p.id+' '+p.animation);
    q.action=true;g.aiEnabled=false;g.towers.forEach(t=>t.active=false);
    g.units=[];g.projectiles=[];g.spells=[];g.fields=[];g.attacks=[];r.resetVisuals();r.effects=[];r.particles=[];q.events=[];
    q.fixture={scenario,ready:false,limits:'Isolated authored setup with original Game.step and app rAF; passive durable target, no network, visual RNG uncontrolled. Logical pose is not a sprite frame.'};
    setTimeout(()=>{
      const a=g.spawn(scenario.attacker.key,0,220,540,0), t=g.spawn(scenario.target.key,1,scenario.orientation==='north'?220:310,scenario.orientation==='north'?435:540,0);
      a.entryPending=t.entryPending=false;t.hp=t.maxHp=1e7;t.card={...t.card,passive:true,speed:0,damage:0};
      q.fixture.actors=[{id:a.id,key:a.key},{id:t.id,key:t.key}];q.fixture.startEpochMs=performance.timeOrigin+performance.now();q.fixture.startGameTime=g.elapsed;q.fixture.ready=true;
    },scenario.preRollMs);
  },config.scenario);
}
export async function observe(page) {
  const action=await page.evaluate(()=>{const q=globalThis.__reviewAdapter;if(q.observations++!==1||q.action)return null;const g=q.game;const index=g.hands[0].findIndex(k=>q.CARDS[k]&&!q.CARDS[k].spell&&q.CARDS[k].cost<=g.energy[0]);if(index<0)throw Error('no affordable troop in actual hand');q.action=true;return {index,key:g.hands[0][index]};});
  if(action){
    await page.locator(`#hand [data-card="${action.index}"]`).click();
    const point=await page.evaluate(()=>{const r=__reviewAdapter.renderer,canvas=r.canvas,b=canvas.getBoundingClientRect(),p=r.projection;return{x:b.x+p.x+300*p.scale,y:b.y+p.y+550*p.scale};});
    await page.mouse.click(point.x,point.y);
    await page.waitForFunction(()=>__reviewAdapter.events.some(e=>e.type==='deploy'),null,{timeout:5000});
  }
  const result=await page.evaluate(()=>{const q=globalThis.__reviewAdapter,g=q.game,r=q.renderer,c=r.canvas,b=c.getBoundingClientRect(),now=performance.now();
    return {wallTime:now,epochMs:performance.timeOrigin+now,gameTime:g.elapsed,viewport:{width:innerWidth,height:innerHeight},dpr:devicePixelRatio,canvas:{x:b.x,y:b.y,width:b.width,height:b.height,pixelWidth:c.width,pixelHeight:c.height},state:g.state,fixture:q.fixture??null,pose:g.units.map(u=>({id:u.id,key:u.key,x:u.x,y:u.y,dx:u.dx,dy:u.dy,moving:u.moving,attack:u.attack})),hp:g.units.map(u=>({id:u.id,hp:u.hp,maxHp:u.maxHp})),events:q.events.slice(),instrumentation:{kind:'transparent-prototype-wrappers',stepCalls:q.steps,drawCalls:q.draws,lastStepDt:q.lastStepDt,lastDrawDt:q.lastDrawDt,unsupported:q.unsupported,seed:'Game constructor uses its normal seed; not fixed or reproducible',visualRandom:'not controlled'},action:q.action};
  });
  const n=network.get(page);result.instrumentation.network={origin:n.origin,requests:n.requests.slice(),blocked:n.blocked.slice(),webSockets:n.webSockets.slice(),webSocketIsolation:n.webSocketIsolation,limitations:'Page routing covers requests and page-created WebSockets; no explicit Service Worker interception is configured.'};
  return result;
}
