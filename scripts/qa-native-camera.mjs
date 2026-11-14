import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'dist');
const readingOnly=process.argv.includes('--reading-only'),matrix=process.argv.includes('--matrix'),legal=readingOnly||process.argv.includes('--legal'),outliers=process.argv.includes('--outliers'),cut=process.argv.find(arg=>arg.startsWith('--cut='))?.slice(6),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const requireClearBody=process.argv.includes('--require-clear-body');
const requireClearHud=process.argv.includes('--require-clear-hud');
if(cut)assert.match(cut,/^[a-z0-9_-]+$/i);
const out=path.join(root,'docs/visual-followup/native-camera',cut||'');
await mkdir(out,{recursive:true});
const frozen=new Map(),sourceHashes={};
for(const file of [...(await readdir(dist)).filter(name=>/\.(js|css|html)$/.test(name)),'assets/pokemon/manifest.json']){
  const bytes=await readFile(path.join(dist,file));frozen.set('/'+file,bytes);sourceHashes['dist/'+file]=sha(bytes);
}
const metadata=JSON.parse(frozen.get('/assets/pokemon/manifest.json'));
for(const id of legal?[76,384,215,315,25]:outliers?[76,384]:[]){for(const animation of ['Idle','Walk','Hurt','Shoot','Attack']){const meta=metadata[id]?.[animation];if(!meta)continue;for(const file of [meta.file,meta.shadow]){const bytes=await readFile(path.join(dist,file));frozen.set('/'+file,bytes);sourceHashes['dist/'+file]=sha(bytes);}}}
for(const file of ['assets/battle/arena-ground-v2.webp','assets/battle/arena-bridge-v2.webp','assets/battle/riverbank-v2.webp','assets/battle/Object__Tree_Town.Flip.png']){const bytes=await readFile(path.join(dist,file));frozen.set('/'+file,bytes);sourceHashes['dist/'+file]=sha(bytes);}
for(const file of ['scripts/qa-native-camera.mjs','scripts/qa-native-camera-harness.mjs','scripts/native-camera-legal-scenarios.mjs'])sourceHashes[file]=sha(await readFile(path.join(root,file)));
const report={generatedAt:new Date().toISOString(),sourceHead:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceHashes,scope:legal?'Actual UI/Renderer and successful Game.deploy commands after real energy regeneration. All positions, facing, attacks and Log pushes come from Game.step at 60 simulation steps/s; no actor positions, stats, directions or hit timers are assigned. The capture is a deterministic functional check, not a measured 60FPS performance claim.':outliers?'Actual UI/Renderer and stable Game.spawn, Game.attack/tickStatus or effective forced Game.pushUnit. Controlled pose captures, not full combat scheduling. Original full pixels stay visible; alpha128 and main body-component bounds are diagnostic only.':'Actual UI/Renderer with explicit visual fixtures at the shared 18x32 anchors. No combat, deployment legality, input, or engine certification.',viewports:[],findings:[]};
const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.svg':'image/svg+xml'};
const server=http.createServer(async(request,response)=>{
  try{
    const pathname=new URL(request.url,'http://localhost').pathname,local=pathname==='/'?'/index.html':pathname;
    let filename,bytes;
    if(pathname==='/__qa/native-camera.mjs'){filename=path.join(root,'scripts/qa-native-camera-harness.mjs');bytes=await readFile(filename);}
    else if(pathname==='/__qa/native-camera-legal-scenarios.mjs'){filename=path.join(root,'scripts/native-camera-legal-scenarios.mjs');bytes=await readFile(filename);}
    else{
      filename=path.resolve(dist,'.'+local);if(!filename.startsWith(dist+path.sep)){response.writeHead(403).end();return;}
      bytes=frozen.get(local)||await readFile(filename);
      if(local==='/app.js')bytes=Buffer.from(bytes.toString('utf8')+'\nglobalThis.__nativeCameraApp={get game(){return game},renderer,updateUi};');
    }
    response.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream'}).end(bytes);
  }catch{response.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let playwright,browser;
for(const location of [process.env.POKE_ARENA_PLAYWRIGHT_MODULE,new URL('../../pokemon-arena/qa/node_modules/playwright/index.mjs',import.meta.url).href,'playwright'].filter(Boolean)){
  try{playwright=await import(/^[A-Za-z]:[\\/]/.test(location)?pathToFileURL(location).href:location);break;}catch{}
}
const close=(a,b,tolerance=1e-7)=>Math.abs(a-b)<tolerance;
function verify(result){
  assert.equal(result.verticalScale,1);assert.equal(result.grid.columns,18);assert.equal(result.grid.rows,32);
  assert.ok(close(result.cellCss.width,result.cellCss.height));
  for(const point of result.points)assert.ok(close(point.world.x,point.roundTrip.x)&&close(point.world.y,point.roundTrip.y));
  if(result.backgroundCache){const {origin,width,height}=result.backgroundCache;assert.ok(origin.x<=result.worldBounds.left&&origin.y<=result.worldBounds.top&&origin.x+width>=result.worldBounds.right&&origin.y+height>=result.worldBounds.bottom);}
  for(const state of ['selected','transient'])assert.deepEqual(result.rects.before,result.rects[state]);
  assert.equal(result.bankCalls[1][1],376);assert.equal(result.bankCalls[1][3],48);
  for(const lane of result.lanes){const slices=result.bridgeCalls.filter(([x,,w])=>x>=lane-24&&x+w<=lane+24);assert.equal(slices.length,3);assert.equal(Math.min(...slices.map(([x])=>x)),lane-24);assert.equal(Math.max(...slices.map(([x,,w])=>x+w)),lane+24);}
  for(const body of result.bodies)for(const edge of ['left','top','right','bottom'])assert.ok(close(body.css[edge],body.actualCss[edge],1e-4),JSON.stringify(body));
}
try{
  assert.ok(playwright,'Existing Playwright is required.');browser=await playwright.chromium.launch({...(process.platform==='win32'?{channel:'msedge'}:{}),headless:true});report.browser=await browser.version();
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>localStorage.setItem('poke-arena:sound','false'));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>globalThis.__nativeCameraApp&&!document.getElementById('start-btn').disabled);
  await page.locator('#start-btn').click();await page.evaluate(async({outliers,legal})=>{await import('/__qa/native-camera.mjs'+(legal?'?legal=1':outliers?'?outliers=1':''));await __nativeCamera.ready;await document.fonts.ready;},{outliers,legal});
  if((outliers||legal)&&!readingOnly){report.nativeContacts=[];for(const contact of await page.evaluate(()=>__nativeCamera.nativeContacts())){await writeFile(path.join(out,contact.file),Buffer.from(contact.png,'base64'));delete contact.png;report.nativeContacts.push(contact);}}
  if(process.argv.includes('--ray-audit')){
    const audit=await page.evaluate(()=>__nativeCamera.rayFootAudit());assert.equal(audit.profile.movementAnchor,'foot');assert.equal(audit.profile.attackContactFrame,2);assert.ok(audit.maxEmitterErrorWorld<.71);
    assert.ok(audit.rows.every(row=>row.frame===row.actualFrame));assert.ok(audit.recovery.every(row=>row.shootLastEqualsWalk0&&row.walk0EqualsIdle0&&row.bodyDelta.every(v=>v===0)&&row.headDelta.every(v=>v===0)));
    await writeFile(path.join(out,'ray-foot-audit.json'),JSON.stringify(audit,null,2)+'\n');report.rayFootAudit={file:'ray-foot-audit.json',profile:audit.profile,frames:audit.frames,maxEmitterErrorWorld:audit.maxEmitterErrorWorld,recoveryViews:audit.recovery.length};
  }
  const viewports=matrix?[{width:390,height:844},{width:768,height:1024},{width:1440,height:980}]:[{width:390,height:844}];
  for(const viewport of viewports){
    await page.setViewportSize(viewport);await page.waitForTimeout(100);
    if(legal){
      const layout=await page.evaluate(()=>__nativeCamera.layoutProbe());verify(layout);const result={viewport,layout,scenarios:[],images:[]};
      result.usefulAreaCss={width:layout.arena.width*layout.projection.scale,height:layout.arena.height*layout.projection.scale,widthFractionOfCanvas:layout.arena.width*layout.projection.scale/layout.board.width,heightFractionOfCanvas:layout.arena.height*layout.projection.scale/layout.board.height};
      if(readingOnly){result.reading=await page.evaluate(()=>__nativeCamera.roleReading());const file=`${viewport.width}-roles-reading.png`;await page.screenshot({path:path.join(out,file)});result.images.push({file});report.viewports.push(result);console.log(JSON.stringify({viewport,camera:layout.camera,useful:result.usefulAreaCss,roles:result.reading.rows.map(row=>({name:row.name,role:row.role,scale:row.scale}))}));continue;}
      for(const name of await page.evaluate(()=>__nativeCamera.legalNames)){
        const scene=await page.evaluate(name=>__nativeCamera.legalScenario(name),name);
        assert.ok(scene.deployments.every(command=>command.result.ok&&command.requestedCellLegal));
        const bodies=scene.samples.flatMap(sample=>sample.bodies.filter(body=>body.opacity>=128/255).map(body=>({frame:sample.frame,at:sample.at,actors:sample.actors,...body})));assert.ok(bodies.length);
        let maxProjectionErrorCss=0;
        for(const body of bodies)for(const edge of ['left','top','right','bottom'])maxProjectionErrorCss=Math.max(maxProjectionErrorCss,Math.abs(body.css[edge]-body.actualCss[edge]));assert.ok(maxProjectionErrorCss<1e-4);
        if(scene.key==='rayquaza')assert.ok(scene.events.some(event=>event.type==='attackRelease'&&event.key==='rayquaza'));
        if(scene.key==='golem')assert.ok(bodies.some(body=>body.animation==='Hurt'));
        const extrema=Object.fromEntries(['left','top','right','bottom'].map(edge=>[edge,bodies.toSorted((a,b)=>(['left','top'].includes(edge)?1:-1)*(a.physicalBodyDiagnostic.world[edge]-b.physicalBodyDiagnostic.world[edge]))[0]]));
        const clipped=bodies.filter(body=>Object.values(body.physicalBodyDiagnostic.overflowCss).some(value=>value>1e-6)),occluded=bodies.filter(body=>body.hudOpaqueIntersection.projectedAreaCss>1e-6);
        const summary={visibleBodyFrames:bodies.length,clippedBodyFrames:clipped.length,hudIntersectingBodyFrames:occluded.length,maxProjectionErrorCss,maxHudProjectedAreaCss:Math.max(0,...bodies.map(body=>body.hudOpaqueIntersection.projectedAreaCss)),maxOverflowBodyCss:Object.fromEntries(['left','top','right','bottom'].map(edge=>[edge,Math.max(0,...bodies.map(body=>body.physicalBodyDiagnostic.overflowCss[edge]))]))};
        const hurt=bodies.find(body=>body.animation==='Hurt'),hudWorst=occluded.toSorted((a,b)=>b.hudOpaqueIntersection.projectedAreaCss-a.hudOpaqueIntersection.projectedAreaCss)[0],worst=clipped.toSorted((a,b)=>Math.max(...Object.values(b.physicalBodyDiagnostic.overflowCss))-Math.max(...Object.values(a.physicalBodyDiagnostic.overflowCss)))[0]||hurt||hudWorst||extrema.top;
        result.scenarios.push({name:scene.name,key:scene.key,origin:scene.origin,deployments:scene.deployments,events:scene.events,summary,extrema,firstHurt:hurt??null});
        if(clipped.length)report.findings.push({viewport,scenario:name,type:'reachable-body-clipping',...summary});
        if(occluded.length)report.findings.push({viewport,scenario:name,type:'hud-opaque-body-intersection',...summary});
        await page.evaluate(({name,frame})=>__nativeCamera.legalScenario(name,frame),{name,frame:worst.frame});
        const file=`${viewport.width}-${name}.png`;await page.screenshot({path:path.join(out,file)});result.images.push({file,scenario:name,frame:worst.frame,at:worst.at});
        if(requireClearBody)assert.equal(clipped.length,0,'Body clipping in reachable scenario '+name+' at '+viewport.width);
        if(requireClearHud)assert.equal(occluded.length,0,'HUD/body intersection in reachable scenario '+name+' at '+viewport.width);
      }
      if(process.argv.includes('--include-reading')){result.reading=await page.evaluate(()=>__nativeCamera.roleReading());const file=`${viewport.width}-roles-reading.png`;await page.screenshot({path:path.join(out,file)});result.images.push({file,kind:'controlled native-size reference'});}
      report.viewports.push(result);console.log(JSON.stringify({viewport,camera:layout.camera,scenarios:result.scenarios.map(s=>({name:s.name,...s.summary}))}));continue;
    }
    if(outliers){
      const layout=await page.evaluate(()=>__nativeCamera.layoutProbe());verify(layout);
      const samples=await page.evaluate(()=>__nativeCamera.outlierMeasurements()),result={viewport,layout,samples,images:[]};
      let maxProjectionError=0;
      for(const sample of samples)for(const body of sample.bodies){
        for(const edge of ['left','top','right','bottom'])maxProjectionError=Math.max(maxProjectionError,Math.abs(body.css[edge]-body.actualCss[edge]));assert.ok(maxProjectionError<1e-4);assert.deepEqual(body.source.alphaValues,[0,255]);
        if(sample.key==='rayquaza'&&sample.state==='contact'){assert.equal(body.source.frame,2);assert.equal(body.source.components.length,1);}
        if(sample.key==='golem'&&sample.state.startsWith('hurt')){assert.equal(sample.pushed,true);assert.equal(body.animation,'Hurt');assert.equal(body.source.frame,Number(sample.state.at(-1)));assert.ok(body.physicalBodyDiagnostic.outsideRgb.every(rgb=>['255,255,255','215,223,223','175,183,191'].includes(rgb)));}
      }
      result.maxProjectionErrorCss=maxProjectionError;
      for(const sample of samples)sample.hudIntersections=sample.bodies.flatMap(body=>sample.hud.map(box=>({selector:box.selector,width:Math.max(0,Math.min(body.physicalBodyDiagnostic.css.right+sample.board.x,box.x+box.width)-Math.max(body.physicalBodyDiagnostic.css.left+sample.board.x,box.x)),height:Math.max(0,Math.min(body.physicalBodyDiagnostic.css.bottom+sample.board.y,box.y+box.height)-Math.max(body.physicalBodyDiagnostic.css.top+sample.board.y,box.y))})).filter(box=>box.width>0&&box.height>0));
      for(const[key,state,direction,edge]of[['rayquaza','contact',3,'center'],['rayquaza','contact',3,'left'],['rayquaza','contact',1,'top'],['golem','hurt0',2,'center'],['golem','hurt0',2,'left'],['golem','hurt0',0,'top'],['golem','hurt1',2,'left']]){
        const sample=await page.evaluate(({key,state,direction,edge})=>__nativeCamera.outlierScene(key,state,direction,edge),{key,state,direction,edge});
        const body=sample.bodies[0],b=sample.board,left=Math.max(0,body.css.left-12),top=Math.max(0,body.css.top-12),right=Math.min(b.width,body.css.right+12),bottom=Math.min(b.height,body.css.bottom+12),file=`${viewport.width}-${key}-${state}-${edge}.png`;
        await page.screenshot({path:path.join(out,file),clip:{x:b.x+left,y:b.y+top,width:right-left,height:bottom-top}});result.images.push({file,sample});
      }
      const clipped=samples.filter(sample=>sample.bodies.some(body=>Object.values(body.alpha128.overflowCss).some(value=>value>1e-6)));
      const clippedBodies=samples.filter(sample=>sample.bodies.some(body=>Object.values(body.physicalBodyDiagnostic.overflowCss).some(value=>value>1e-6)));
      result.summary={samples:samples.length,clippedFull:clipped.length,clippedBodies:clippedBodies.length,hudBoundingBoxIntersections:samples.filter(sample=>sample.hudIntersections.length).length,maxOverflowFullCss:Object.fromEntries(['left','top','right','bottom'].map(edge=>[edge,Math.max(0,...samples.flatMap(sample=>sample.bodies.map(body=>body.alpha128.overflowCss[edge])))])),maxOverflowBodyCss:Object.fromEntries(['left','top','right','bottom'].map(edge=>[edge,Math.max(0,...samples.flatMap(sample=>sample.bodies.map(body=>body.physicalBodyDiagnostic.overflowCss[edge])))]))};
      if(clipped.length)report.findings.push({viewport,type:'camera-clipping',...result.summary});
      if(result.summary.hudBoundingBoxIntersections)report.findings.push({viewport,type:'hud-body-bounds-intersection',count:result.summary.hudBoundingBoxIntersections,note:'Bounding-box intersection is a separate occlusion risk, not an exact count of covered opaque pixels.'});
      report.viewports.push(result);console.log(JSON.stringify({viewport,outliers:result.summary}));continue;
    }
    const result=await page.evaluate(()=>__nativeCamera.overview());verify(result);
    const overview=`${viewport.width}-overview.png`;await page.screenshot({path:path.join(out,overview)});result.overview=overview;
    result.edges=await page.evaluate(()=>__nativeCamera.edgeScene());const edges=`${viewport.width}-edges.png`;await page.screenshot({path:path.join(out,edges)});result.edges.image=edges;
    result.measurements=await page.evaluate(()=>__nativeCamera.edgeMeasurements());result.placement=await page.evaluate(()=>__nativeCamera.placementSamples());
    assert.deepEqual(result.placement,{count:576,minX:96,maxX:504,minY:28,maxY:772});
    const bodies=result.measurements.flatMap(sample=>sample.bodies.map(body=>({key:sample.key,state:sample.state,edge:sample.edge,direction:sample.direction,...body}))),clipped=bodies.filter(body=>Object.values(body.overflowCss).some(value=>value>1e-6));
    result.summary={species:new Set(result.measurements.map(sample=>sample.key)).size,bodySamples:bodies.length,clipped:clipped.length,hudBoundingBoxIntersections:result.measurements.filter(sample=>sample.hudIntersections.length).length,maxOverflowCss:Object.fromEntries(['left','top','right','bottom'].map(edge=>[edge,Math.max(0,...bodies.map(body=>body.overflowCss[edge]))]))};
    if(clipped.length)report.findings.push({viewport,type:'camera-clipping',...result.summary});
    report.viewports.push(result);console.log(JSON.stringify({viewport,overview,summary:result.summary}));
    await writeFile(path.join(out,matrix?'matrix.json':'first-cut.json'),JSON.stringify(report,null,2)+'\n');
  }
  assert.deepEqual(errors,[]);report.pageErrors=errors;
}catch(error){report.error=error.stack;throw error;}
finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(out,readingOnly?'reading.json':legal?'legal.json':outliers?'outliers.json':matrix?'matrix.json':'first-cut.json'),JSON.stringify(report,null,2)+'\n');}
