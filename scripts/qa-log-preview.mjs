import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url)),dist=path.join(root,'dist'),output=path.join(root,'docs/visual-followup/log-preview');
await mkdir(output,{recursive:true});
let playwright;
for(const location of[process.env.POKE_ARENA_PLAYWRIGHT_MODULE,new URL('../../pokemon-arena/qa/node_modules/playwright/index.mjs',import.meta.url).href,'playwright'].filter(Boolean)){
  try{playwright=await import(/^[A-Za-z]:[\\/]/.test(location)?pathToFileURL(location).href:location);break;}catch{}
}
assert.ok(playwright,'Playwright is required.');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server=http.createServer(async(request,response)=>{
  try{
    const pathname=new URL(request.url,'http://localhost').pathname,filename=path.resolve(dist,'.'+(pathname==='/'?'/index.html':pathname));
    if(!filename.startsWith(dist+path.sep)){response.writeHead(403).end();return;}
    response.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream'}).end(await readFile(filename));
  }catch{response.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await playwright.chromium.launch({...(process.platform==='win32'?{channel:'msedge'}:{}),headless:true});
const report={browser:await browser.version(),viewport:{width:390,height:844},sources:{},cases:[]};
for(const file of['dist/render.js','dist/spell-preview.js','dist/engine.js','scripts/qa-log-preview.mjs'])report.sources[file]=createHash('sha256').update(await readFile(path.join(root,file))).digest('hex');
try{
  const page=await browser.newPage({viewport:report.viewport}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>localStorage.setItem('poke-arena:sound','false'));
  await page.route('**/app.js?*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\nglobalThis.__qa={get game(){return game},renderer,updateUi,choose,cancelSelection};'});});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(()=>globalThis.__qa&&!document.getElementById('start-btn').disabled);
  await page.locator('#start-btn').click();
  await page.evaluate(async()=>{
    const q=__qa,g=q.game,r=q.renderer;q.draw=r.draw.bind(r);r.draw=()=>{};g.step=()=>{};g.aiEnabled=false;
    for(const tower of g.towers){tower.active=false;tower.cooldown=999;}
    g.hands[0]=['log','fireball','sneaselAmbush','golem'];g.energy=[10,10];q.updateUi();
    await r.ensureSpecies([7,41]);
  });
  for(const team of[0,1]){
    const result=await page.evaluate(team=>{
      const q=__qa,g=q.game,r=q.renderer;g.units=[];r.selection='log';r.placementTeam=team;
      r.pointer={x:300,y:team?280:520};const anchor=g.resolveDeployment(team,'log',r.pointer.x,r.pointer.y),direction=team?1:-1;
      const ground=g.spawn('squirtle',1-team,anchor.x,anchor.y+direction*100,0),air=g.spawn('zubat',1-team,anchor.x+20,anchor.y+direction*100,0);
      r.t=.3;q.draw(g,0);const targets=[...r.spellTargets],calls=[],ctx=new Proxy({},{get:(o,key)=>o[key]??((...args)=>calls.push({method:key,args})),set:(o,key,value)=>(o[key]=value,true)});
      r.drawPlacement(ctx,g);
      const canvas=r.canvas.getBoundingClientRect();return{team,anchor,targets,ground:ground.id,air:air.id,calls,board:{x:canvas.x,y:canvas.y,width:canvas.width,height:canvas.height}};
    },team);
    assert.ok(result.targets.includes(result.ground));assert.ok(!result.targets.includes(result.air));
    assert.deepEqual(result.calls.filter(call=>call.method==='fillRect').map(call=>call.args),[[result.anchor.x-12,result.anchor.y-12,24,24]]);
    assert.equal(result.calls.filter(call=>['arc','ellipse','strokeRect','setLineDash','closePath'].includes(call.method)).length,0);
    const vertices=result.calls.filter(call=>['moveTo','lineTo'].includes(call.method));assert.equal(vertices.length,16);
    for(const{args:[x,y]}of vertices){assert.ok(Math.abs(x-result.anchor.x)<=12);assert.ok(Math.abs(y-result.anchor.y)<=12);}
    await page.screenshot({path:path.join(output,`team-${team}.png`)});
    result.clears=await page.evaluate(()=>{
      const q=__qa,r=q.renderer,g=q.game;r.pointer=null;r.updateSpellTargets(g);const exit=r.spellTargets.size===0;
      r.pointer={x:300,y:r.placementTeam?280:520};r.updateSpellTargets(g);const returns=r.spellTargets.size>0;
      q.cancelSelection();r.updateSpellTargets(g);return{exit,returns,release:r.spellTargets.size===0};
    });
    assert.deepEqual(result.clears,{exit:true,returns:true,release:true});report.cases.push(result);
  }
  assert.deepEqual(errors,[]);report.errors=errors;console.log('Log preview: 2 perspectives; anchor only; ground target tint; exit/release clear.');
}catch(error){report.error=error.stack;throw error;}finally{
  await browser.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
}
