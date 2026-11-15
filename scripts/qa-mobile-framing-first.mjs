import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const root=path.resolve(import.meta.dirname,'..'),main=path.resolve(root,'../pokemon-arena'),output=path.resolve(root,'../.supervision/mobile-board-20261114/art-first');
await mkdir(output,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),shared=new Map(),sourceHashes={};
for(const file of (await readdir(path.join(main,'dist'))).filter(f=>/\.(js|css|html)$/.test(f))){
 const bytes=await readFile(path.join(main,'dist',file));shared.set('/'+file,bytes);sourceHashes['Main/dist/'+file]=hash(bytes);
}
const ownership=['arena-geometry.js','render.js','targeting-art.js'];
const before=new Map(),after=new Map();
for(const file of ownership){
 const baseline=execFileSync('git',['show','21b3eaa:dist/'+file],{cwd:root,windowsHide:true,maxBuffer:2000000}),candidate=await readFile(path.join(root,'dist',file));
 before.set('/'+file,baseline);after.set('/'+file,candidate);sourceHashes['baseline/'+file]=hash(baseline);sourceHashes['Art/'+file]=hash(candidate);
}
let active=before;
const served=new Map(),missing=[],mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg'};
const server=http.createServer(async(req,res)=>{
 try{
  const name=new URL(req.url,'http://localhost').pathname,relative=name==='/'?'index.html':name.slice(1);
  let bytes=active.get('/'+relative)||shared.get('/'+relative);
  if(!bytes){
   const file=path.resolve(main,'dist',relative);assert.ok(file.startsWith(path.join(main,'dist')+path.sep));
   if(!served.has(relative))served.set(relative,await readFile(file));bytes=served.get(relative);
  }
  res.writeHead(200,{'Content-Type':mime[path.extname(relative)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes);
 }catch{missing.push(req.url);res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {chromium}=await import(pathToFileURL(path.join(main,'qa/node_modules/playwright/index.mjs')).href),browser=await chromium.launch({channel:'msedge',headless:true});
const report={at:new Date().toISOString(),scope:'Draft real app comparison: Main UI text frozen at start, Art ownership modules compared with public21b baseline. Actual CPU start and paid card deployment; no game hooks, modified cards or actor positions. Not an audio, Safari-device or publication certification.',sourceHashes,cases:[],missing};
try{
 for(const[width,height]of [[390,700],[390,724],[390,844],[430,932]])for(const variant of ['baseline','P480']){
  active=variant==='baseline'?before:after;
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('poke-arena:sound','false'));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(()=>!document.getElementById('start-btn').disabled);await page.locator('#start-btn').click();
  const measurements=await page.evaluate(async()=>{
   const {ARENA,ARENA_CAMERA,arenaProjection,worldToScreen,screenToWorld}=await import('/arena-geometry.js?v=26'),canvas=document.getElementById('arena'),box=canvas.getBoundingClientRect();
   const a=worldToScreen({x:ARENA.left,y:ARENA.top},box.width,box.height),b=worldToScreen({x:ARENA.right,y:ARENA.bottom},box.width,box.height);
   const inverse=screenToWorld(a,box.width,box.height);
   return{box:{x:box.x,y:box.y,width:box.width,height:box.height},camera:ARENA_CAMERA,projection:arenaProjection(box.width,box.height),field:{x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y,widthFraction:(b.x-a.x)/box.width,heightFraction:(b.y-a.y)/box.height,areaFraction:(b.x-a.x)*(b.y-a.y)/(box.width*box.height)},inverse};
  });
  assert.ok(Math.abs(measurements.inverse.x-84)<1e-8&&Math.abs(measurements.inverse.y-16)<1e-8);
  const initial=`${variant}-${width}x${height}-start.png`;await page.screenshot({path:path.join(output,initial)});
  const card=page.locator('#hand [data-card="0"]'),originalCard=await card.innerText();await card.click();
  const point=await page.evaluate(async()=>{const{worldToScreen}=await import('/arena-geometry.js?v=26');const b=document.getElementById('arena').getBoundingClientRect();return worldToScreen({x:168,y:532},b.width,b.height);});
  await page.locator('#arena').click({position:point});assert.notEqual(await card.innerText(),originalCard,'A real paid deployment advances the hand.');
  await page.waitForTimeout(1100);
  const deployed=`${variant}-${width}x${height}-deployed.png`;await page.screenshot({path:path.join(output,deployed)});
  assert.deepEqual(errors,[]);report.cases.push({viewport:{width,height},variant,measurements,initial,deployed,paidDeployment:true,errors});
  console.log(JSON.stringify({viewport:{width,height},variant,field:measurements.field}));await context.close();
 }
 report.servedAssetHashes=Object.fromEntries([...served].map(([name,bytes])=>[name,hash(bytes)]));
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
