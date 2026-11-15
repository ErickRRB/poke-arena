import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const root=path.resolve(import.meta.dirname,'..'),main=path.resolve(root,'../pokemon-arena');
const cardsOnly=process.argv.includes('--cards-only');
const fieldsOnly=process.argv.includes('--fields-only');
const out=path.resolve(root,`../.supervision/mobile-board-20261114/${cardsOnly?'art-cards-final':fieldsOnly?'art-fields-final':'art-completion'}`);
await mkdir(out,{recursive:true});
const git=(...args)=>execFileSync('git',args,{cwd:root,windowsHide:true,maxBuffer:32_000_000});
const art=git('rev-parse','HEAD^{commit}').toString().trim();
const mainSha=execFileSync('git',['rev-parse','HEAD'],{cwd:main,windowsHide:true}).toString().trim();
const overrides=new Set(['render.js','arena-geometry.js','targeting-art.js','sprite-motion.js','sprite-geometry.js','pokemon-silhouettes.js','attack-choreography.js','unit-sizes.js','card-art.js','assets/pokemon/manifest.json']);
const cache=new Map(),sourceHashes={},missing=[],hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function source(file){
 if(!cache.has(file)){
  const origin=overrides.has(file)||file.startsWith('assets/pokemon/224/')||file==='assets/cards/octillery-mobile-v1.png'?art:mainSha;
  const bytes=git('show',`${origin}:dist/${file}`);cache.set(file,bytes);sourceHashes[file]={commit:origin,bytes:bytes.length,sha256:hash(bytes)};
 }
 return cache.get(file);
}
const engineSpecifier=source('app.js').toString().match(/from\s*['"]\.\/(engine\.js[^'"]*)['"]/)[1];
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.ogg':'audio/ogg','.wav':'audio/wav','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname,file=pathname==='/'?'index.html':decodeURIComponent(pathname.slice(1));
  assert.ok(!file.split('/').some(p=>!p||p==='..'||p==='.'));
  let bytes=source(file);
  if(file==='app.js')bytes=Buffer.from(bytes+'\nglobalThis.__artQA={renderer,get game(){return game}};');
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes);
 }catch{missing.push(req.url);res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {chromium}=await import(pathToFileURL(path.join(main,'qa/node_modules/playwright/index.mjs')).href);
const browser=await chromium.launch({channel:'msedge',headless:true});
const report={mainSha,art,engineSpecifier,scope:'Immutable Main commit plus explicit immutable Art modules/assets. Real CPU start/screens; controlled native renderer and Game samples for pixel, temporal and attachment review. Not a device Safari or subjective animation-quality claim.',cases:[],images:[],missing};
async function save(name,data){const bytes=Buffer.from(data.split(',')[1],'base64');await writeFile(path.join(out,name),bytes);report.images.push({file:name,bytes:bytes.length,sha256:hash(bytes)});}
try{
 for(const [width,height] of cardsOnly||fieldsOnly?[[390,700]]:[[390,700],[390,844],[768,1024],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(cardsOnly=>{localStorage.setItem('poke-arena:sound','false');if(cardsOnly)localStorage.setItem('poke-arena:deck',JSON.stringify(['octillery','blastoiseCannon','fireball','pikachu','snorlax','machamp','zubat','charizard']));},cardsOnly);
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>globalThis.__artQA&&!document.getElementById('start-btn').disabled);
  if(cardsOnly){
   await page.locator('#menu-deck-btn').click();report.cards=[];
   for(const key of ['octillery','blastoiseCannon']){
    const card=page.locator(`[data-collection="${key}"]`);await card.scrollIntoViewIfNeeded();
    const dimensions=await card.evaluate(async el=>{const art=el.querySelector('.card-art'),bg=getComputedStyle(art).backgroundImage,url=bg.match(/url\(["']?(.*?)["']?\)/)?.[1];if(url){const image=new Image();image.src=url;await image.decode();}const b=el.getBoundingClientRect();return{width:b.width,height:b.height,text:el.innerText,background:bg};});
    await card.screenshot({path:path.join(out,`real-card-${key}.png`)});report.cards.push({key,...dimensions});
   }
   await page.locator('#deck-dialog [data-close]').click();
  }
  await page.locator('#start-btn').click();
  const frame=await page.evaluate(()=>{const r=__artQA.renderer,b=r.canvas.getBoundingClientRect();return{viewport:{width:innerWidth,height:innerHeight},arena:{x:b.x,y:b.y,width:b.width,height:b.height},projection:r.projection,worldBounds:r.worldBounds};});
  await page.screenshot({path:path.join(out,`perimeter-${width}x${height}.png`)});
  if(cardsOnly){
   const first=page.locator('#hand [data-card="0"]');assert.ok((await first.innerText()).includes('Octillery'));await first.click();
   const point=await page.evaluate(async()=>{const{worldToScreen}=await import('/arena-geometry.js?v=26'),b=document.getElementById('arena').getBoundingClientRect();return worldToScreen({x:168,y:532},b.width,b.height);});
   await page.locator('#arena').click({position:point});assert.ok(!(await first.innerText()).includes('Octillery'),'real paid deployment cycles the card');await page.waitForTimeout(1300);
   await page.screenshot({path:path.join(out,'octillery-real-paid-deployment.png')});
   report.identities=await page.evaluate(async engineSpecifier=>{
    const{Game,CARDS}=await import('/'+engineSpecifier),{POKEMON_SILHOUETTES}=await import('/pokemon-silhouettes.js');
    const r=__artQA.renderer,draw=r.draw.bind(r);r.draw=()=>{};__artQA.game.step=()=>{};await r.ensureSpecies([9,224,143]);const result=[];
    const capture=()=>{const b=r.canvas.getBoundingClientRect(),copy=Object.assign(document.createElement('canvas'),{width:Math.round(b.width),height:Math.round(b.height)}),c=copy.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(r.canvas,0,0,copy.width,copy.height);return copy.toDataURL();};
    for(const key of['blastoiseCannon','octillery']){
     r.resetVisuals();r.effects=[];r.particles=[];r.numbers=[];r.selection=null;r.pointer=null;r.t=0;const events=[],samples=[];
     const game=new Game({seed:20261114,onEvent:e=>{r.onEvent(e);events.push({type:e.type,time:game.elapsed,key:e.key});}});game.start();game.aiEnabled=false;game.towers.forEach(t=>t.active=false);
     const actor=game.spawn(key,0,300,550,0);game.spawn('snorlax',1,300,440,0);
     for(let frame=0;frame<180;frame++){game.step(1/60);draw(game,1/60);if([18,20,54,56,60,90,120,179].includes(frame))samples.push({frame,x:actor.x,y:actor.y,png:capture()});}
     result.push({key,species:CARDS[key].id,body:POKEMON_SILHOUETTES[CARDS[key].id],events,samples});
    }return result;
   },engineSpecifier);
   for(const identity of report.identities){assert.ok(identity.body?.body>0,'measured native silhouette exists');for(const sample of identity.samples){await save(`native-combat-${identity.key}-${sample.frame}.png`,sample.png);delete sample.png;}}
  }else if(width===390&&height===700){
   const detail=await page.evaluate(async engineSpecifier=>{
    const {Game,CARDS}=await import('/'+engineSpecifier),{ARENA}=await import('/arena-geometry.js?v=26');
    const {packGame}=await import('/snapshot.js?v=26'),{emissionPoint,attackAnimationFrame}=await import('/sprite-motion.js?v=26');
    const r=__artQA.renderer,draw=r.draw.bind(r);r.draw=()=>{};__artQA.game.step=()=>{};
    await r.ensureSpecies([9,224,143,76,25,7,41,31,34,52]);
    const canvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
    const perimeter=canvas(600,848),pc=perimeter.getContext('2d',{willReadFrequently:true});pc.translate(0,48);r.drawPerimeter(pc);
    const pixels=pc.getImageData(0,0,600,848).data,counts={inside:0,left:0,right:0,top:0,bottom:0};
    for(let y=0;y<848;y++)for(let x=0;x<600;x++)if(pixels[(y*600+x)*4+3]){const wy=y-48;if(x>=ARENA.left&&x<ARENA.right&&wy>=ARENA.top&&wy<ARENA.bottom)counts.inside++;else if(wy<ARENA.top)counts.top++;else if(wy>=ARENA.bottom)counts.bottom++;else if(x<ARENA.left)counts.left++;else counts.right++;}
    const bounds=r.worldBounds;r.worldBounds={left:0,top:-48,right:600,bottom:800};r.buildBackground();
    const bg=r.background.getContext('2d',{willReadFrequently:true}),grass=[];
    for(let dy=0;dy<6;dy++)for(let dx=0;dx<6;dx++){const outside=[...bg.getImageData(40+dx,488+dy,1,1).data],inside=[...bg.getImageData(280+dx,488+dy,1,1).data];grass.push({inside,outside,equal:inside.every((v,i)=>v===outside[i])});}
    r.worldBounds=bounds;r.buildBackground();
    const reset=()=>{r.resetVisuals();r.effects=[];r.particles=[];r.numbers=[];r.selection=null;r.pointer=null;r.t=0;r.reduced=false;};
    const capture=()=>{const b=r.canvas.getBoundingClientRect(),copy=canvas(Math.round(b.width),Math.round(b.height)),c=copy.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(r.canvas,0,0,copy.width,copy.height);return copy.toDataURL();};
    const samples=[],fade=[],fields=[];
    for(const key of ['whirlpool','spikes','stealthRock','nightmare','earthquake']){
     reset();const game=new Game({seed:20261114});game.start();game.aiEnabled=false;game.towers.forEach(t=>t.active=false);game.energy[0]=10;game.hands[0][0]=key;
     if(!game.deploy(0,0,300,532).ok)throw Error('Cannot cast '+key);
     for(let frame=0;frame<300&&!game.fields.length;frame++)game.step(1/60);
     const field=game.fields[0];if(!field)throw Error('No field '+key);
     let elapsed=0;for(const at of key==='whirlpool'?[0,1/30,2/30,.1333333333,.2,.4,.8,1.2]:[0,.2,.5]){
      while(elapsed+1/120<at){game.step(1/60);elapsed+=1/60;}
      const before=JSON.stringify(packGame(game));draw(game,0);if(before!==JSON.stringify(packGame(game)))throw Error('Rendering mutates '+key);
      fields.push({key,elapsed,radius:field.radius,life:field.life});samples.push({name:`field-${key}-${Math.round(at*1000)}ms.png`,png:capture()});
      if(key==='whirlpool'){
       const radius=field.radius,size=Math.ceil(radius*2),raw=canvas(size,size),soft=canvas(size,size),a=raw.getContext('2d',{willReadFrequently:true}),b=soft.getContext('2d',{willReadFrequently:true});
       a.imageSmoothingEnabled=false;b.imageSmoothingEnabled=false;
       const age=Math.max(0,field.duration-field.life);r.battleArt.draw(a,'whirlpool',radius,radius,radius*1.95,radius*1.95,{age,trim:true,blend:true});r.softWhirlpool(b,{...field,x:radius,y:radius},age);
       const ra=a.getImageData(0,0,size,size).data,sa=b.getImageData(0,0,size,size).data;let inner=0,innerChanged=0,innerError=0,outerRaw=0,outerSoft=0,outerPixels=0;
       const {WHIRLPOOL_BOUNDS}=await import('/assets/battle/frame-bounds.js'),{BATTLE_ASSETS}=await import('/assets/battle/manifest.js');
       const phase=age*BATTLE_ASSETS.whirlpool.fps,frame=Math.floor(phase)%WHIRLPOOL_BOUNDS.length,mix=phase-Math.floor(phase),aspect=f=>{const b=WHIRLPOOL_BOUNDS[f];return(b[3]-b[1])/(b[2]-b[0]);},height=Math.min(1,aspect(frame)*(1-mix)+aspect((frame+1)%WHIRLPOOL_BOUNDS.length)*mix);
       for(let y=0;y<size;y++)for(let x=0;x<size;x++){const d=Math.hypot(x+.5-radius,(y+.5-radius)/height)/radius,i=(y*size+x)*4;if(d<.25){inner++;if(ra[i+3]!==sa[i+3])innerChanged++;innerError+=Math.abs(ra[i+3]-sa[i+3]);}if(d>.82&&d<1){outerRaw+=ra[i+3];outerSoft+=sa[i+3];outerPixels++;}}
       fade.push({elapsed,height,inner,innerChanged,innerError,outerRaw,outerSoft,outerPixels});
       if(at===.4){game.state='paused';draw(game,0);const first=capture();draw(game,0);samples.push({name:'field-whirlpool-paused.png',png:first});if(first!==capture())throw Error('Paused active field changed');game.state='playing';}
      }
     }
     if(key==='whirlpool'){
      r.reduced=true;const surface=canvas(field.radius*2,field.radius*2),c=surface.getContext('2d');r.softWhirlpool(c,{...field,x:field.radius,y:field.radius},0);const reducedA=surface.toDataURL();c.clearRect(0,0,surface.width,surface.height);r.softWhirlpool(c,{...field,x:field.radius,y:field.radius},1.2);if(reducedA!==surface.toDataURL())throw Error('Reduced motion field moved');
      samples.push({name:'field-whirlpool-reduced.png',png:reducedA});r.reduced=false;
     }
    }
    const identities=[];
    for(const key of ['blastoiseCannon','octillery']){
     reset();const card=CARDS[key];if(!card||!Number.isFinite(card.scale))throw Error('Missing identity scale '+key);
     const sheet=canvas(960,640),c=sheet.getContext('2d');c.fillStyle='#c9d8ae';c.fillRect(0,0,960,640);
     const metadata=r.metadata[card.id][card.attackAnim],phases=[0,card.windup*.35,card.windup*.75,card.windup,card.windup+1/60,card.windup+(card.attackDuration-card.windup)*.8];
     const rows=[];
     for(let direction=0;direction<8;direction++)for(let column=0;column<6;column++){
      const angle=(2-direction)*Math.PI/4,elapsed=phases[column],actor={id:900+direction,card,team:0,x:column*160+80,y:direction*80+66,dx:Math.cos(angle),dy:Math.sin(angle),attack:Math.max(.000001,card.attackDuration-elapsed),attackDuration:card.attackDuration,attackWindup:card.windup,scale:card.scale,spawn:0,hp:card.hp,maxHp:card.hp,radius:card.radius,preview:true};
      r.sprite(c,actor,true);const point=emissionPoint(actor,0);if(!Number.isFinite(point.x)||!Number.isFinite(point.y))throw Error('Invalid emitter '+key);
      c.fillStyle='#e83e38';c.fillRect(point.x-1,point.y-1,3,3);rows.push({direction,elapsed,frame:attackAnimationFrame(metadata,elapsed,card.attackDuration,card.windup,card.attackFrames,card),emitter:{x:point.x-actor.x,y:point.y-actor.y}});
     }
     samples.push({name:`native-poses-${key}.png`,png:sheet.toDataURL()});
     const events=[],game=new Game({seed:20261114,onEvent:e=>events.push({type:e.type,time:game.elapsed})});game.start();game.aiEnabled=false;game.towers.forEach(t=>t.active=false);
     const unit=game.spawn(key,0,300,550,0),target=game.spawn('snorlax',1,300,440,0),origin={x:unit.x,y:unit.y},trace=[];
     for(let frame=0;frame<180;frame++){game.step(1/60);draw(game,1/60);trace.push({frame,time:game.elapsed,x:unit.x,y:unit.y,attack:unit.attack,projectiles:game.projectiles.filter(p=>p.team===0).map(p=>({x:p.x,y:p.y}))});if([0,30,54,55,60,90,120,179].includes(frame))samples.push({name:`combat-${key}-${frame}.png`,png:capture()});}
     if(card.structure&&trace.some(row=>row.x!==origin.x||row.y!==origin.y))throw Error('Stationary Cannon moved');
     identities.push({key,id:card.id,scale:card.scale,platform:card.platform,emitterRows:rows,trace,events:events.filter(e=>/attack|projectile|damage/i.test(e.type))});
    }
    return{counts,grassEqual:grass.every(p=>p.equal),grassSamples:grass.slice(0,4),fields,fade,samples,identities};
   },engineSpecifier);
   for(const sample of detail.samples)await save(sample.name,sample.png);delete detail.samples;report.detail=detail;
   await writeFile(path.join(out,'partial.json'),JSON.stringify({...report,sourceHashes},null,2)+'\n');
   assert.equal(detail.counts.inside,0,'perimeter art must not paint any playable pixel');for(const edge of ['left','right','top','bottom'])assert.ok(detail.counts[edge]>0,edge+' boundary has physical props');
   assert.equal(detail.grassEqual,true,'same texture phase has exactly the same grass color inside/outside');
   for(const row of detail.fade){assert.ok(row.innerError<=row.inner,'at most one alpha rounding level on average in the untouched native core');assert.ok(row.outerSoft<row.outerRaw*.1,'native outer water alpha is strongly attenuated');}
  }
  assert.deepEqual(errors,[]);report.cases.push({...frame,errors});await context.close();
  console.log(JSON.stringify({viewport:{width,height},errors}));
 }
 report.sourceHashes=sourceHashes;report.runnerSha256=hash(await readFile(new URL(import.meta.url)));
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(cardsOnly?{cards:report.cards,identities:report.identities.map(({key,species,body})=>({key,species,body})),images:report.images.length}:{perimeter:report.detail.counts,grassEqual:report.detail.grassEqual,fieldFrames:report.detail.fields.length,identities:report.detail.identities.map(({key,id,scale,platform})=>({key,id,scale,platform})),images:report.images.length}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
