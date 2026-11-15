const network = new WeakMap();
const supported = new Set(['clock','canvas','events','actorState','hp']);
function validate(config) {
  const requested=config.requiredObservations ?? [];
  if (!Array.isArray(requested) || requested.some(x=>!supported.has(x))) throw Error('unsupported required observation: '+(Array.isArray(requested)?requested.filter(x=>!supported.has(x)).join(', '):'invalid list'));
  if ('seed' in config) throw Error('seed injection is not supported by this transparent adapter');
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
    Game.prototype.emit=function(type,data){const value=emit.apply(this,arguments);q.events.push({type,at:this.elapsed,key:data?.key??data?.unit?.key??null});if(q.events.length>500)q.events.shift();return value;};
    Renderer.prototype.draw=function(...args){const value=draw.apply(this,args);q.renderer=this;q.draws++;q.lastDrawDt=args[1];return value;};
  });
  await page.locator('#start-btn').click();
  await page.waitForFunction(()=>globalThis.__reviewAdapter?.game?.state==='playing' && globalThis.__reviewAdapter?.renderer);
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
    return {wallTime:now,epochMs:performance.timeOrigin+now,gameTime:g.elapsed,viewport:{width:innerWidth,height:innerHeight},dpr:devicePixelRatio,canvas:{x:b.x,y:b.y,width:b.width,height:b.height,pixelWidth:c.width,pixelHeight:c.height},state:g.state,pose:g.units.map(u=>({id:u.id,key:u.key,x:u.x,y:u.y,dx:u.dx,dy:u.dy,moving:u.moving,attack:u.attack})),hp:g.units.map(u=>({id:u.id,hp:u.hp,maxHp:u.maxHp})),events:q.events.slice(),instrumentation:{kind:'transparent-prototype-wrappers',stepCalls:q.steps,drawCalls:q.draws,lastStepDt:q.lastStepDt,lastDrawDt:q.lastDrawDt,unsupported:q.unsupported,seed:'Game constructor uses its normal seed; not fixed or reproducible',visualRandom:'not controlled'},action:q.action};
  });
  const n=network.get(page);result.instrumentation.network={origin:n.origin,requests:n.requests.slice(),blocked:n.blocked.slice(),webSockets:n.webSockets.slice(),webSocketIsolation:n.webSocketIsolation,limitations:'Page routing covers requests and page-created WebSockets; no explicit Service Worker interception is configured.'};
  return result;
}
