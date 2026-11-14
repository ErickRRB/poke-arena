import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {openPage,ready,rects,stable} from '../tests/browser/helpers.mjs';
import {run as checkBattle} from '../tests/browser/battle.mjs';
import {run as checkLoading} from '../tests/browser/loading.mjs';

const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'dist'),output=path.join(root,'docs/battle-refinement');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg'};
const server=http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(dist,'.'+(pathname==='/'?'/index.html':decodeURIComponent(pathname)));
  if(!file.startsWith(dist+path.sep)){res.writeHead(403).end();return;}
  try{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(await readFile(file));}catch{res.writeHead(404).end();}
});
await mkdir(output,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`,viewports=[{width:390,height:844},{width:768,height:1024},{width:1440,height:980}];
const {chromium}=await import(pathToFileURL(process.env.POKE_ARENA_PLAYWRIGHT_MODULE||path.join(root,'../pokemon-arena/qa/node_modules/playwright/index.mjs')).href);
const browser=await chromium.launch({channel:'msedge',headless:true});const report={date:'2026-11-14',viewports:[],firstGroup:null};
try{
  if(!process.argv.includes('--frames-only'))for(const viewport of viewports){
    const{context,page,errors}=await openPage(browser,viewport);
    try{
      await page.addInitScript(()=>{
        const original=Date.now;globalThis.__clockShift=0;Date.now=()=>original()+__clockShift;
        globalThis.WebSocket=class{
          constructor(){this.readyState=0;setTimeout(()=>{this.readyState=1;this.onopen?.();},0);}
          send(raw){if(raw==='ping'){queueMicrotask(()=>this.onmessage?.({data:'pong'}));return;}const message=JSON.parse(raw);if(message.type==='hello')setTimeout(()=>{this.onmessage?.({data:JSON.stringify({type:'welcome',token:'local-ui-check'})});this.onmessage?.({data:JSON.stringify({type:'searching',joined:Date.now()+60000})});},250);}
          close(){this.readyState=3;this.onclose?.({code:1000});}
        };
      });
      await page.goto(url);await ready(page);await page.evaluate(()=>document.fonts.ready);
      const menu=await rects(page,['ready-overlay','trainer-name','start-btn','online-btn','menu-deck-preview']);
      await page.locator('#online-btn').click();await page.locator('#search-panel').waitFor({state:'visible'});await page.waitForTimeout(400);
      assert.equal(await page.locator('#search-time').textContent(),'0:00');stable(menu,await rects(page,Object.keys(menu)),'search overlay');
      const search=await rects(page,['search-panel','cancel-search','search-time']);await page.evaluate(()=>__clockShift=-7200000);await page.waitForTimeout(1100);
      assert.match(await page.locator('#search-time').textContent(),/^0:0[12]$/);stable(search,await rects(page,Object.keys(search)),'monotonic search timer');
      await page.evaluate(()=>__qa.online.onConnection('Reconectando con la arena…'));stable(search,await rects(page,Object.keys(search)),'connection status');
      await page.screenshot({path:path.join(output,`search-${viewport.width}.png`)});await page.locator('#cancel-search').click();await page.waitForFunction(()=>document.getElementById('search-panel').hidden);
      await page.locator('#start-btn').click();await page.evaluate(()=>{__qa.game.aiEnabled=false;__qa.game.step=()=>{};__qa.game.time=120;__qa.updateUi();});
      const ids=['arena','hand','energy-bar','battle-clock','match-pause','menu-btn'],before=await rects(page,ids);
      for(const phase of[{time:59,overtime:false,tiebreaker:false},{time:90,overtime:true,tiebreaker:false},{time:50,overtime:true,tiebreaker:false},{time:0,overtime:true,tiebreaker:true}]){
        await page.evaluate(phase=>{Object.assign(__qa.game,phase);__qa.updateUi();},phase);stable(before,await rects(page,ids),'elixir/phase overlay');
        const boost=await page.locator('#boost').boundingBox(),clock=await page.locator('#battle-clock').boundingBox();assert.ok(boost.width>=76&&boost.height>=36);assert.ok(boost.y>=clock.y+clock.height+5);
      }
      await page.screenshot({path:path.join(output,`hud-${viewport.width}.png`)});
      await page.evaluate(()=>{__qa.game.time=59;__qa.game.overtime=false;__qa.game.tiebreaker=false;__qa.game.energy[0]=10;__qa.renderer.selection='treecko';__qa.renderer.pointer={x:158,y:300};__qa.updateUi();});
      await page.waitForTimeout(100);await page.screenshot({path:path.join(output,`placement-${viewport.width}.png`)});
      await page.emulateMedia({reducedMotion:'reduce'});stable(before,await rects(page,ids),'reduced motion');
      report.viewports.push({...viewport,searchStarts:'0:00',clockShiftMs:-7200000,rectDelta:0,boostSize:[76,36]});assert.deepEqual(errors,[]);
    }finally{await context.close();}
  }
  console.log('Search, HUD and reduced-motion layout: mobile, tablet and desktop passed.');
  if(!process.argv.includes('--frames-only')){report.battle=await checkBattle({browser,url,viewports,output});report.loading=await checkLoading({browser,url,viewports,output});}
  console.log('Existing battle and delayed-loading browser checks passed.');

  const{context,page,errors}=await openPage(browser,{width:768,height:1024});
  try{
    await page.goto(url);await ready(page);await page.locator('#start-btn').click();
    const result=await page.evaluate(async()=>{
      const{renderer:r,game}=__qa,{CARDS,directionRow}=await import('/engine.js?v=26'),{SoundSystem}=await import('/audio.js?v=26');
      const draw=r.draw.bind(r);r.draw=()=>{};game.step=()=>{};
      await r.ensureSpecies([6,25,215,74,315,112,356,355,103,261,280,50]);
      const sound=new SoundSystem(true);await sound.ready;sound.unlock();await sound.ctx.resume();await sound.decodeSamples();
      const audioOutput=sound.ctx.createMediaStreamDestination();sound.master.connect(audioOutput);
      const frames=[],scenes=[],times=[];
      const contact=document.createElement('canvas');contact.width=1440;contact.height=1536;const cc=contact.getContext('2d');cc.imageSmoothingEnabled=false;cc.fillStyle='#f5edce';cc.fillRect(0,0,contact.width,contact.height);
      let thumbnail=0;
      for(const key of['pikachu','charizard','sneaselAmbush']){
        r.resetVisuals();r.effects=[];r.particles=[];r.numbers=[];r.t=0;r.selection=null;r.pointer=null;
        const events=[],g=new game.constructor({seed:1114,onEvent:e=>{events.push({type:e.type,key:e.key,at:g.elapsed,shot:e.shot});r.onEvent(e);sound.event(e);}});g.start();g.aiEnabled=false;g.towers.forEach(t=>t.active=false);
        let actor,spell,flight=[];
        if(key==='sneaselAmbush'){g.hands[0][0]=key;g.energy[0]=10;g.deploy(0,0,158,172);spell=g.spells[0];}
        else{
          actor=g.spawn(key,0,300,560,0);actor.entryPending=false;const target=g.spawn('geodude',1,300,460,0);target.hp=target.maxHp=1e6;target.card={...target.card,speed:0,damage:0,passive:true};
        }
        const chunks=[],stream=r.canvas.captureStream(60);stream.addTrack(audioOutput.stream.getAudioTracks()[0].clone());
        const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8,opus',videoBitsPerSecond:1600000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.start();
        if(actor)sound.event({type:'deploy',key,x:actor.x});
        const count=key==='sneaselAmbush'?300:180;let last=performance.now(),nextFrame=last;
        for(let frame=0;frame<count;frame++){
          nextFrame+=1000/60;do{await new Promise(requestAnimationFrame);}while(performance.now()+.5<nextFrame);
          const now=performance.now();times.push(now-last);last=now;
          if(frame%2===0)g.step(1/30);draw(g,1/60);
          const visual=spell&&r.visualFlights?.get(spell.visualId);if(visual&&spell.flightElapsed<spell.flightTime)flight.push(visual.elapsed);
          frames.push({key,frame,time:frame/60,engineTime:g.elapsed,actor:actor?{x:actor.x,y:actor.y,attack:actor.attack,attackSeq:actor.attackSeq}:undefined,flight:visual?.elapsed,spawned:g.units.filter(u=>u.key==='sneaselToken').length});
          if(frame%15===0&&thumbnail<48){
            const x=thumbnail%8*180,y=Math.floor(thumbnail/8)*256;cc.fillStyle='#324f3d';cc.fillRect(x,y,180,256);
            if(key==='sneaselAmbush')cc.drawImage(r.canvas,0,0,600,800,x,y+16,180,240);
            else cc.drawImage(r.canvas,150,350,300,400,x,y+16,180,240);
            cc.fillStyle='#fff1c2';cc.font='12px sans-serif';cc.fillText(`${key} ${(frame/60).toFixed(2)}s`,x+4,y+12);thumbnail++;
          }
        }
        await new Promise(resolve=>{recorder.onstop=resolve;recorder.stop();});stream.getTracks().forEach(t=>t.stop());
        const bytes=new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
        scenes.push({key,frames:count,events,flightSamples:flight.length,uniqueFlightPositions:new Set(flight.map(x=>x.toFixed(6))).size,video:btoa(binary)});
      }
      const nativeSheets=[];
      const savedVertical=r.verticalScale;r.verticalScale=1;
      for(const key of['pikachu','charizard','sneaselToken']){
        const card=CARDS[key],count=Math.ceil(card.attackDuration*60)+1,columns=12,lines=Math.ceil(count/columns),cell=96;
        const sheet=document.createElement('canvas');sheet.width=columns*cell;sheet.height=lines*8*cell;const c=sheet.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#314e3e';c.fillRect(0,0,sheet.width,sheet.height);
        for(let direction=0;direction<8;direction++)for(let frame=0;frame<count;frame++){
          const elapsed=Math.min(card.attackDuration,frame/60),angle=(2-direction)*Math.PI/4,x=frame%columns*cell,y=(direction*lines+Math.floor(frame/columns))*cell;
          const actor={id:400,card,scale:card.scale*1.35,x:x+48,y:y+82,dx:Math.cos(angle),dy:Math.sin(angle),attack:card.attackDuration-elapsed,attackDuration:card.attackDuration,attackWindup:card.windup,attackAnim:card.attackAnim,hp:card.hp,maxHp:card.hp,team:0,moving:false,anim:elapsed};
          r.t=elapsed;r.sprite(c,actor,true);const head=r.visualEmission(actor);c.fillStyle='#ffed96';c.fillRect(head.x-1,head.y-1,2,2);c.font='9px sans-serif';c.fillText(`${direction} ${elapsed.toFixed(2)}`,x+3,y+11);
        }
        nativeSheets.push({key,framesPerDirection:count,directions:8,png:sheet.toDataURL('image/png').split(',')[1]});
      }
      r.verticalScale=savedVertical;sound.discardContext();
      // Decode the new voices and sounds through the browser audio decoder.
      const manifest=await(await fetch('/assets/audio/manifest.json')).json(),audio=new AudioContext();
      const decoded=await Promise.all([...Object.entries(manifest.cries).filter(([id])=>[75,78,112,215,274,315,356].includes(Number(id))),...Object.entries(manifest.combat)].map(async([key,file])=>{const b=await audio.decodeAudioData(await(await fetch(file)).arrayBuffer());return{key,channels:b.numberOfChannels,duration:b.duration,rate:b.sampleRate};}));await audio.close();
      const sorted=times.slice(5).sort((a,b)=>a-b);return{frames,scenes,nativeSheets,decoded,displayIntervals:{medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],meanMs:sorted.reduce((a,b)=>a+b,0)/sorted.length},contact:contact.toDataURL('image/png').split(',')[1]};
    });
    for(const scene of result.scenes){await writeFile(path.join(output,`${scene.key}-60hz.webm`),Buffer.from(scene.video,'base64'));delete scene.video;}
    await writeFile(path.join(output,'first-group-frames.png'),Buffer.from(result.contact,'base64'));delete result.contact;
    for(const sheet of result.nativeSheets){await writeFile(path.join(output,`${sheet.key}-eight-directions.png`),Buffer.from(sheet.png,'base64'));delete sheet.png;}
    const flight=result.scenes.find(s=>s.key==='sneaselAmbush');assert.ok(flight.uniqueFlightPositions>=flight.flightSamples*.9,'flight advances on each display frame');
    assert.equal(result.decoded.length,13);assert.ok(result.decoded.every(s=>s.duration>0&&s.channels===1));assert.deepEqual(errors,[]);
    report.firstGroup={scenes:result.scenes,nativeSheets:result.nativeSheets,displayIntervals:result.displayIntervals,decoded:result.decoded,scope:'Frame-by-frame browser review of the first group only; hardware frame rate is measured, not guaranteed.'};
    await writeFile(path.join(output,'first-group-samples.json'),JSON.stringify(result.frames,null,2)+'\n');
  }finally{await context.close();}
  if(process.argv.includes('--frames-only')){const previous=JSON.parse(await readFile(path.join(output,'validation.json'),'utf8'));report.viewports=previous.viewports;report.battle=previous.battle;report.loading=previous.loading;}
  await writeFile(path.join(output,'validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({viewports:report.viewports,firstGroup:report.firstGroup.scenes.map(({key,frames,flightSamples,uniqueFlightPositions})=>({key,frames,flightSamples,uniqueFlightPositions})),displayIntervals:report.firstGroup.displayIntervals,decodedAudio:report.firstGroup.decoded.length}));
}catch(error){await writeFile(path.join(output,'failure.txt'),error.stack);throw error;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
