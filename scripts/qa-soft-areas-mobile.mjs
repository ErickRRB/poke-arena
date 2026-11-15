import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createNativeIntegratedServer} from './qa-native-integrated-server.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=path.resolve(root,'../.supervision/mobile-board-20261114/art-guides');
await mkdir(out,{recursive:true});
const checkpoint=process.argv.find(arg=>arg.startsWith('--checkpoint='))?.slice(13);assert.ok(checkpoint,'Pass --checkpoint=<immutable SHA>.');
const server=await createNativeIntegratedServer({checkpoint});
const{chromium}=await import(pathToFileURL(path.resolve(root,'../pokemon-arena/qa/node_modules/playwright/index.mjs')).href);
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:390,height:700}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('poke-arena:sound','false'));
try{
 await page.goto(server.url);await page.waitForFunction(()=>globalThis.__nativeIntegratedApp&&!document.getElementById('start-btn').disabled);await page.locator('#start-btn').click();
 const report=await page.evaluate(async()=>{
  const{Game,CARDS}=await import('/engine.js?v=26'),{packGame,unpackGame,perspective}=await import('/snapshot.js?v=26'),{SandboxGame}=await import('/sandbox.js'),{softDisc}=await import('/targeting-art.js?v=32');
  const app=__nativeIntegratedApp,r=app.renderer,draw=r.draw.bind(r);r.draw=()=>{};app.game.step=()=>{};
  const keys=Object.entries(CARDS).filter(([,c])=>c.spell).map(([key])=>key),ranges=['pikachu','regice','roselia'];
  await r.ensureSpecies([...new Set([25,7,41,76,143,31,34,52,...ranges.map(k=>CARDS[k].id)])]);
  const rows=[],health=[],proof=[],reset=()=>{r.resetVisuals();r.effects=[];r.particles=[];r.selection=null;r.pointer=null;r.t=1;r.viewerTeam=0;r.placementTeam=0;};
  const capture=()=>{const b=r.canvas.getBoundingClientRect(),copy=document.createElement('canvas');copy.width=Math.round(b.width);copy.height=Math.round(b.height);const c=copy.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(r.canvas,0,0,copy.width,copy.height);return copy.toDataURL();};
  for(const view of[0,1])for(const key of keys){
   reset();const source=new Game({seed:2026});source.start();source.aiEnabled=false;source.towers.forEach(t=>t.active=false);
   const caster=view,victim=1-view,point=view?{x:432,y:628}:{x:168,y:172};
   for(const[k,dx]of[['squirtle',0],['zubat',24],['regice',-24]])source.spawn(k,victim,point.x+dx,point.y,0);
   const game=unpackGame(perspective(packGame(source),view));game.energy[0]=10;
   const p=key==='log'?{x:168,y:508}:{x:168,y:172};r.selection=key;r.pointer={...p,inside:true};
   const before=JSON.stringify(packGame(game));draw(game,0);if(before!==JSON.stringify(packGame(game)))throw Error('Preview changed mechanics '+key);
   rows.push({key,view,radius:CARDS[key].splash,targets:[...r.spellTargets],mechanicsUnchanged:true,png:capture()});
  }
  for(const key of ranges){reset();const game=new Game({seed:2026});game.start();game.aiEnabled=false;game.energy[0]=10;r.selection=key;r.pointer={x:300,y:532,inside:true};draw(game,0);rows.push({key,kind:'range',radius:CARDS[key].range,png:capture()});}
  for(const key of['spikes','stealthRock','whirlpool','nightmare','earthquake']){
   reset();const game=new Game({seed:2026,onEvent:e=>r.onEvent(e,game)});game.start();game.aiEnabled=false;game.towers.forEach(t=>t.active=false);game.energy[0]=10;game.hands[0][0]=key;
   if(!game.deploy(0,0,300,532).ok)throw Error('Deploy failed '+key);for(let i=0;i<240&&!game.fields.length;i++)game.step(1/60);
   const before=JSON.stringify(packGame(game));r.effects=[];draw(game,0);if(before!==JSON.stringify(packGame(game)))throw Error('Field changed mechanics '+key);
   rows.push({key,kind:'field',radius:game.fields[0].radius,mechanicsUnchanged:true,png:capture()});
  }
  for(const view of[0,1]){
   reset();const source=new Game({seed:2026});source.start();source.aiEnabled=false;const game=unpackGame(perspective(packGame(source),view));
   for(const tower of game.towers.filter(t=>t.team===1))game.spawn('golem',0,tower.x,tower.y+24,0);
   const original=r.towerHealth;r.towerHealth=function(c,tower){
    const texts=[],fills=[],t=c.fillText,f=c.fillRect;c.fillText=function(value,x,y,...args){texts.push({value,x,y});return t.call(this,value,x,y,...args);};c.fillRect=function(x,y,w,h){fills.push({x,y,w,h});return f.call(this,x,y,w,h);};
    try{original.call(this,c,tower);}finally{c.fillText=t;c.fillRect=f;}
    const guardHeight=(this.bodyHeights.get(tower.guard.id)||28)*(tower.king?1.15:1.3),structureHeight=tower.king?102*476/574:72*395/309;
    health.push({view,id:tower.id,team:tower.team,king:tower.king,y:tower.y,guardId:tower.guard.id,bodyHeight:this.bodyHeights.get(tower.guard.id),bodyTop:tower.y-Math.max(structureHeight,(tower.king?59:46)+guardHeight),texts,fills});
   };draw(game,0);r.towerHealth=original;rows.push({kind:'health',view,png:capture()});
  }
  const canvas=document.createElement('canvas');canvas.width=300;canvas.height=300;const c=canvas.getContext('2d');
  for(const radius of[24,60,132]){c.clearRect(0,0,300,300);softDisc(c,150,150,radius,{color:'#e7b5f5',opacity:.25});const alpha=distance=>c.getImageData(Math.round(150+distance),150,1,1).data[3];proof.push({radius,middle:alpha(radius*.5),innerEdge:alpha(radius*.82),fading:alpha(radius*.95),outside:alpha(radius+2)});}
  return{rows,health,proof,canvas:{width:r.canvas.width,height:r.canvas.height,rect:JSON.parse(JSON.stringify(r.canvas.getBoundingClientRect()))}};
 });
 for(const p of report.proof){assert.ok(p.innerEdge>p.fading&&p.fading>p.outside);assert.equal(p.outside,0);}
 for(const h of report.health.filter(h=>h.team===1)){assert.ok(h.texts[0].y+8<h.bodyTop);assert.ok(h.fills[0].y+h.fills[0].h<h.bodyTop);}
 const images=[];for(const row of report.rows){const name=`${row.kind||'preview'}-${row.key||'towers'}-view${row.view??0}.png`,bytes=Buffer.from(row.png.split(',')[1],'base64');await writeFile(path.join(out,name),bytes);images.push({file:name,sha256:createHash('sha256').update(bytes).digest('hex')});delete row.png;}
 assert.deepEqual(errors,[]);Object.assign(report,{checkpoint:server.checkpoint,scope:'Controlled real Game/Renderer samples, not an app-input or FPS claim. PNGs use a browser canvas copy at the recorded CSS dimensions, preserving the real uniform projection instead of exposing the differently shaped backing bitmap.',images,errors,sourceHashes:server.sourceHashes,qaHashes:server.qaHashes,runnerSha256:createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex')});
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({previews:report.rows.filter(r=>!r.kind).length,ranges:3,fields:5,viewers:2,healthOverlays:report.health.length,edgeFade:report.proof,errors}));
}finally{await browser.close();await server.close();}
