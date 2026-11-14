import http from 'node:http';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),here=path.join(root,'qa/global-motion-audit'),dist=path.join(root,'dist');
const output=path.join(root,'docs/battle-refinement/wing-prototype');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
const frozenFiles=new Map();
const html='<!doctype html><html><meta charset="utf-8"><style>html,body{margin:0;background:#17232c}canvas{display:block}#arena{width:390px;height:520px;position:absolute;left:-9999px}</style><canvas id="video" width="390" height="684"></canvas><canvas id="arena" width="600" height="800"></canvas><script type="module">import {Renderer} from "/render.js";import {CARDS} from "/engine.js";const r=new Renderer(document.getElementById("arena"));r.metadata=await(await fetch("/assets/pokemon/manifest.json")).json();await Promise.all([r.ensureSpecies([6,18,123,149,373]),r.battleArt.preload()]);r.verticalScale=1;globalThis.fixture={r,CARDS,video:document.getElementById("video")};</script></html>';
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 if(pathname==='/wing-qa'){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'}).end(html);return;}
 const file=path.resolve(dist,'.'+decodeURIComponent(pathname));
 if(!file.startsWith(dist+path.sep)){res.writeHead(403).end();return;}
 try{const bytes=frozenFiles.get(pathname)||await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes);}catch{res.writeHead(404).end();}
});
await Promise.all([mkdir(output,{recursive:true}),mkdir(here,{recursive:true})]);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const inputs=[];for(const file of ['dist/render.js','dist/engine.js','dist/catalog.js','dist/wing-motion.js','dist/wing-rigs.js','dist/sprite-motion.js','dist/sprite-geometry.js','dist/combat-visuals.js','dist/balance.js','dist/assets/pokemon/manifest.json',...[6,18,123,149,373].map(id=>`dist/assets/pokemon/${id}/Hop-Anim.png`),'dist/assets/pokemon/6/Shoot-Anim.png']){const bytes=await readFile(path.join(root,file));frozenFiles.set('/'+file.slice(5),bytes);inputs.push({file,sha256:createHash('sha256').update(bytes).digest('hex')});}
const {chromium}=await import(pathToFileURL('C:/Users/Mapa/Documents/ChatGPT/Plugins/pokemon-arena/qa/node_modules/playwright/index.mjs').href);
let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='log'&&message.text().startsWith('WING_QA_PARTIAL '))console.log(message.text());});page.setDefaultTimeout(30000);
 await page.goto(`http://127.0.0.1:${server.address().port}/wing-qa`);await page.waitForFunction(()=>globalThis.fixture);
 if(process.argv.includes('--fragments-only')){
  const diagnostics=await page.evaluate(async()=>{
   const {r}=fixture,{FlightWings}=await import('/wing-motion.js'),{SPRITE_GEOMETRY}=await import('/sprite-geometry.js');
   const results=[],colors=['#ff7e7e','#e2acff','#ffff75'];
   for(const spec of[...[0,4,5,6,7].flatMap(direction=>[2,6].map(phase=>({id:123,direction,phase,frequency:7.5}))),{id:373,direction:2,phase:6,frequency:2.2},{id:373,direction:6,phase:6,frequency:2.2}]){
    const rig=new FlightWings(),meta=r.metadata[spec.id].Hop,image=r.sprites.get(`${spec.id}-Hop`),clock=spec.phase/(8*spec.frequency),out=rig.frame(spec.id,'Hop',spec.direction,5,image,meta,clock,false),entry=rig.cache.get(`${spec.id}:Hop:${spec.direction}:5`),resolution=out.resolution||1,w=out.image.width,h=out.image.height,pixels=out.image.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data,body=entry.body.getContext('2d').getImageData(0,0,meta.width,meta.height).data,seen=new Uint8Array(w*h),parts=[];
    const wingData=entry.wings.map(wing=>({...wing,alpha:wing.image.getContext('2d').getImageData(0,0,meta.width,meta.height).data}));
    for(let p=0;p<w*h;p++)if(pixels[p*4+3]>127&&!seen[p]){
     const todo=[p],positions=[];seen[p]=1;while(todo.length){const n=todo.pop(),x=n%w,y=Math.floor(n/w);positions.push([x,y]);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,q=yy*w+xx;if(xx<0||xx>=w||yy<0||yy>=h||seen[q]||pixels[q*4+3]<=127)continue;seen[q]=1;todo.push(q);}}
     const fixed=[],owners=wingData.map(wing=>({name:wing.name,pixels:0,source:[]})),wave=Math.sin(clock*Math.PI*2*spec.frequency),stretch=.94+.06*Math.cos(clock*Math.PI*2*spec.frequency),amplitude=spec.id===123?.34:.24;
     for(const [px,py]of positions){const x=(px+.5)/resolution-out.padding,y=(py+.5)/resolution-out.padding,sx=Math.floor(x),sy=Math.floor(y);if(sx>=0&&sx<meta.width&&sy>=0&&sy<meta.height&&body[(sy*meta.width+sx)*4+3]>127){fixed.push([sx,sy]);continue;}
      for(let i=wingData.length-1;i>=0;i--){const wing=wingData[i],angle=wing.side*wave*amplitude,dx=x-wing.root[0],dy=y-wing.root[1],ox=wing.root[0]+Math.cos(angle)*dx+Math.sin(angle)*dy,oy=wing.root[1]+(-Math.sin(angle)*dx+Math.cos(angle)*dy)/stretch,xx=Math.floor(ox),yy=Math.floor(oy);if(xx>=0&&xx<meta.width&&yy>=0&&yy<meta.height&&wing.alpha[(yy*meta.width+xx)*4+3]>127){owners[i].pixels++;owners[i].source.push([xx,yy]);break;}}
     }
     const bounds=positions.length?[Math.min(...positions.map(p=>p[0]))/resolution-out.padding,Math.min(...positions.map(p=>p[1]))/resolution-out.padding,(Math.max(...positions.map(p=>p[0]))+1)/resolution-out.padding,(Math.max(...positions.map(p=>p[1]))+1)/resolution-out.padding]:null;
     parts.push({pixelsNative:positions.length/(resolution*resolution),boundsNative:bounds,retainedBodyPixelsNative:fixed.length/(resolution*resolution),retainedBodyCoordinates:[...new Set(fixed.map(p=>p.join(',')))].slice(0,80),movingWingOwners:owners.filter(o=>o.pixels).map(o=>({name:o.name,pixelsNative:o.pixels/(resolution*resolution),sourceBounds:[Math.min(...o.source.map(p=>p[0])),Math.min(...o.source.map(p=>p[1])),Math.max(...o.source.map(p=>p[0])),Math.max(...o.source.map(p=>p[1]))]}))});
    }
    parts.sort((a,b)=>b.pixelsNative-a.pixelsNative);
    const canvas=document.createElement('canvas');canvas.width=720;canvas.height=580;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#223039';c.fillRect(0,0,720,580);c.fillStyle='white';c.font='16px monospace';c.fillText(`#${spec.id} dir${spec.direction} phase${spec.phase}: red=body residue; purple=moving wing`,10,22);const points=SPRITE_GEOMETRY[spec.id].Hop.points[spec.direction][5],cropX=points[2]+out.padding-36,cropY=points[3]+out.padding-28;c.drawImage(out.image,cropX*resolution,cropY*resolution,72*resolution,56*resolution,0,30,720,560);
    for(let i=1;i<parts.length;i++){const part=parts[i],[x,y,xx,yy]=part.boundsNative;c.strokeStyle=part.retainedBodyPixelsNative===part.pixelsNative?colors[0]:colors[1];c.lineWidth=2;c.strokeRect((x-points[2]+36)*10,30+(y-points[3]+28)*10,(xx-x)*10,(yy-y)*10);}
    results.push({...spec,clock,components:parts.length,fragments:parts.slice(1),roots:entry.wings.map(wing=>({name:wing.name,root:wing.root})),png:canvas.toDataURL('image/png').split(',')[1]});
   }
   return results;
  });
  for(const row of diagnostics){await writeFile(path.join(here,`rig-${row.id}-dir${row.direction}-phase${row.phase}.png`),Buffer.from(row.png,'base64'));delete row.png;}
  await writeFile(path.join(here,'rig-fragments-location.json'),JSON.stringify(diagnostics,null,2)+'\n');console.log(JSON.stringify(diagnostics));await context.close();
 }else{
 const result=await page.evaluate(async({measureOnly})=>{
  const {r,CARDS,video}=fixture,{FlightWings}=await import('/wing-motion.js'),{SPRITE_GEOMETRY}=await import('/sprite-geometry.js'),{movementAnchor,emissionPoint,emitterPart,attackAnimationFrame}=await import('/sprite-motion.js');
  const card=CARDS.charizard,dirs=['S','SE','E','NE','N','NW','W','SW'],period=1/2.6,cardScale=card.scale??1.5;
  const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
  const rgba=(canvas)=>canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;
  const alpha=bytes=>Uint8Array.from({length:bytes.length/4},(_,i)=>bytes[i*4+3]>127?255:0);
  const componentInfo=(mask,body,padding,nativeWidth,nativeHeight)=>{const w=mask.width,h=mask.height,data=mask.data,seen=new Uint8Array(w*h),parts=[];for(let p=0;p<w*h;p++)if(data[p]&&!seen[p]){const pixels=[],todo=[p];seen[p]=1;while(todo.length){const n=todo.pop(),x=n%w,y=Math.floor(n/w);pixels.push([x-padding,y-padding]);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;const q=yy*w+xx;if(data[q]&&!seen[q]){seen[q]=1;todo.push(q);}}}parts.push({size:pixels.length,bounds:[Math.min(...pixels.map(p=>p[0])),Math.min(...pixels.map(p=>p[1])),Math.max(...pixels.map(p=>p[0])),Math.max(...pixels.map(p=>p[1]))],retainedBodyPixels:pixels.filter(([x,y])=>x>=0&&x<nativeWidth&&y>=0&&y<nativeHeight&&body[(y*nativeWidth+x)*4+3]===255).length,...(pixels.length<=24?{pixels}:{})});}parts.sort((a,b)=>b.size-a.size);return{components:parts.length,tinyComponents:parts.filter(p=>p.size<=3).length,sizes:parts.map(p=>p.size).slice(0,10),fragments:parts.slice(1)};};
  const actor=(d,scale=cardScale)=>{const angle=(2-d)*Math.PI/4;return{id:100+d,direction:d,key:'charizard',card,x:150+(d%2)*300,y:130+Math.floor(d/2)*200,dx:Math.cos(angle),dy:Math.sin(angle),scale,attack:0,attackDuration:card.attackDuration,attackWindup:card.windup,attackAnim:card.attackAnim,moving:true,hit:0,stun:0,freeze:0,spawn:0,hp:card.hp,maxHp:card.hp,radius:card.radius,preview:true};};
  const rig=new FlightWings(),phases=[],bodyDiffs=[],phaseMetrics=[],diagnostic=makeCanvas(1600,1760),dc=diagnostic.getContext('2d');dc.imageSmoothingEnabled=false;dc.fillStyle='#21303a';dc.fillRect(0,0,1600,1760);
  for(let d=0;d<8;d++){
   const perDirection=[];
   for(const animation of ['Hop','Shoot']){
    const index=animation==='Hop'?5:2,meta=r.metadata[6][animation],image=r.sprites.get(`6-${animation}`),points=SPRITE_GEOMETRY[6][animation].points[d][index];
    const source=makeCanvas(meta.width,meta.height);source.getContext('2d').drawImage(image,index*meta.width,d*meta.height,meta.width,meta.height,0,0,meta.width,meta.height);const original=rgba(source);
    for(let phase=0;phase<8;phase++){
     const clock=phase*period/8,frame=rig.frame(6,animation,d,index,image,meta,clock,false),resolution=frame.resolution||1,downsample=makeCanvas(frame.width,frame.height),nd=downsample.getContext('2d');nd.imageSmoothingEnabled=false;nd.drawImage(frame.image,0,0,frame.width,frame.height);
     const pixels=rgba(downsample),entry=rig.cache.get(`6:${animation}:${d}:${index}`),body=rgba(entry.body);let protectedChanges=0,bodyChanges=0,intermediateAlpha=0;
     const markers=[[points[2],points[3],1.5],[points[4],points[5],1.6],[points[6],points[7],1],[points[8],points[9],1]];
     for(let y=0;y<meta.height;y++)for(let x=0;x<meta.width;x++){
      const s=(y*meta.width+x)*4,o=((y+frame.padding)*frame.width+x+frame.padding)*4;
      if(!original[s+3])continue;const differs=[0,1,2,3].some(k=>pixels[o+k]!==original[s+k]);
      if(body[s+3]===255&&differs)bodyChanges++;
      if(markers.some(([mx,my,radius])=>Math.hypot(x-mx,y-my)<=radius)&&differs)protectedChanges++;
     }
     for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0&&pixels[i]<255)intermediateAlpha++;
     const mask=alpha(pixels),silhouetteHash=await digest(mask),rgbaHash=await digest(pixels),components=componentInfo({width:frame.width,height:frame.height,data:mask},body,frame.padding,meta.width,meta.height);
     const rawMask=alpha(rgba(frame.image)),rawComponents=componentInfo({width:frame.image.width,height:frame.image.height,data:rawMask},[],0,0,0);
     const item={direction:d,name:dirs[d],animation,index,phase,clock,resolution,silhouetteHash,rgbaHash,protectedChanges,bodyChanges,intermediateAlpha,...components,supersampledComponents:rawComponents.components,supersampledFragmentSizes:rawComponents.sizes.slice(1),supersampledFragments:rawComponents.fragments.map(part=>({pixels:part.size,nativeEquivalentPixels:part.size/(resolution*resolution),boundsNative:part.bounds.map(v=>v/resolution-frame.padding)}))};phaseMetrics.push(item);perDirection.push(item);
     if(animation==='Hop')phases.push({direction:d,phase,silhouetteHash});
     if(animation==='Hop'){
      const x0=phase*200,y0=d*220;dc.fillStyle='#d5ebe2';dc.font='12px monospace';dc.fillText(`${dirs[d]} phase ${phase}: ${components.sizes.join('+')}px`,x0+4,y0+14);
      const cropX=points[2]+frame.padding-24,cropY=points[3]+frame.padding-24;dc.drawImage(frame.image,cropX*resolution,cropY*resolution,48*resolution,48*resolution,x0+4,y0+22,192,192);
      for(const part of components.fragments){const [x,y,xx,yy]=part.bounds;dc.strokeStyle=part.retainedBodyPixels===part.size?'#ff6b6b':'#f7a2ff';dc.strokeRect(x0+4+(x-points[2]+24)*4,y0+22+(y-points[3]+24)*4,(xx-x+1)*4,(yy-y+1)*4);}
     }
     if(protectedChanges||bodyChanges)bodyDiffs.push(item);
    }
   }
  }
  const sweep=[];
  for(let d=0;d<8;d++)for(const animation of ['Hop','Shoot']){
   const index=animation==='Hop'?5:2,meta=r.metadata[6][animation],image=r.sprites.get(`6-${animation}`),points=SPRITE_GEOMETRY[6][animation].points[d][index];
   const failures=[];let largest=0;
   for(let sample=0;sample<Math.ceil(period*60);sample++){
    const clock=sample/60,frame=rig.frame(6,animation,d,index,image,meta,clock,false),resolution=frame.resolution||1;
    const crop=frame.image.getContext('2d',{willReadFrequently:true}).getImageData((points[2]+frame.padding-24)*resolution,(points[3]+frame.padding-24)*resolution,48*resolution,48*resolution);
    const parts=componentInfo({width:crop.width,height:crop.height,data:alpha(crop.data)},[],0,0,0);
    largest=Math.max(largest,...parts.sizes.slice(1).map(n=>n/(resolution*resolution)));
    if(parts.components>1)failures.push({sample,clock,components:parts.components,fragmentNativePixels:parts.sizes.slice(1).map(n=>n/(resolution*resolution))});
   }
   sweep.push({direction:d,name:dirs[d],animation,index,hz:60,samples:Math.ceil(period*60),failures,largestFragmentNativePixels:largest});
  }
  const contact=makeCanvas(1650,1194),cc=contact.getContext('2d');cc.imageSmoothingEnabled=false;cc.fillStyle='#202b35';cc.fillRect(0,0,contact.width,contact.height);cc.fillStyle='#edf3e6';cc.font='15px monospace';cc.fillText('Charizard — renderer real, secuencia sintética — 8 fases × 8 direcciones',12,22);cc.font='12px monospace';cc.fillText('Cada celda: izquierda escala 1:1 del PNG; derecha tamaño equivalente al tablero de 390 px. Cian: emisor.',12,43);
  for(let phase=0;phase<8;phase++)cc.fillText(`fase ${phase}/8`,58+phase*200,65);
  for(let d=0;d<8;d++)for(let phase=0;phase<8;phase++){
   const x=50+phase*200,y=76+d*125;cc.fillStyle=phase%2?'#25343b':'#223039';cc.fillRect(x,y,200,125);cc.strokeStyle='#3c4d56';cc.strokeRect(x,y,200,125);cc.fillStyle='#e3eadf';if(!phase)cc.fillText(dirs[d],10,y+56);
   r.t=phase*period/8;r.reduced=false;r.verticalScale=1;
   for(const [offset,scale]of[[48,1],[142,cardScale*.65]]){
    const u={...actor(d,scale),id:0,x:x+offset,y:y+93};r.sprite(cc,u,true);const p=r.visualEmission(u);cc.strokeStyle='#7af6ed';cc.beginPath();cc.moveTo(p.x-2,p.y);cc.lineTo(p.x+2,p.y);cc.moveTo(p.x,p.y-2);cc.lineTo(p.x,p.y+2);cc.stroke();
   }
  }
  const stage=(t)=>t<1?'vuelo':t<1+card.windup?'preparación':t<1.6?'lanzamientos':t<1+card.attackDuration?'recuperación':t<2.4?'vuelo':t<2.7?'aturdimiento':t<3.1?'congelación':'movimiento reducido';
  const configure=(u,t)=>{u.attack=t>=1&&t<1+card.attackDuration?1+card.attackDuration-t:0;u.stun=t>=2.4&&t<2.7?.3:0;u.freeze=t>=2.7&&t<3.1?.4:0;return u;};
  const poseFrame=(u,t)=>u.attack>0?attackAnimationFrame(r.metadata[6].Shoot,card.attackDuration-u.attack,card.attackDuration,card.windup,card.attackFrames):card.moveFrames[Math.floor(((((r.flightWings?.phases.get(u.id)?.phase??t)+u.id*.173)*60)%(card.moveFrames.length*(card.moveFrameDuration||8)))/(card.moveFrameDuration||8))];
  const drawScene=(t,dt)=>{
   r.t=t;r.reduced=t>=3.1;r.verticalScale=1;const c=r.ctx;c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;c.fillStyle='#e5ead6';c.fillRect(0,0,600,800);r.frameActors.clear();
   for(let d=0;d<8;d++){const u=configure(actor(d),t);r.frameActors.set(u.id,u);}
   for(const u of r.frameActors.values()){c.fillStyle='#536459';c.font='16px monospace';c.fillText(dirs[u.direction],u.x-8,u.y-105);r.sprite(c,u,false);const p=r.visualEmission(u);c.strokeStyle='#128c91';c.lineWidth=1;c.beginPath();c.arc(p.x,p.y,3,0,Math.PI*2);c.stroke();}
   r.drawEffects(c,dt);
   const v=video.getContext('2d');v.imageSmoothingEnabled=false;v.fillStyle='#17232c';v.fillRect(0,0,390,684);v.fillStyle='#edf3e6';v.font='bold 16px sans-serif';v.fillText('Charizard · 8 direcciones',12,23);v.font='13px monospace';v.fillStyle='#98e1da';v.fillText(`${t.toFixed(2)} s  ${stage(t)}`,12,44);v.drawImage(r.canvas,0,56,390,520);v.fillStyle='#c4d3cb';v.font='12px sans-serif';v.fillText('Renderer real · tablero equivalente a 390 px',12,598);v.fillText('Secuencia sintética de animación; sin combate simulado.',12,618);v.fillText('60 Hz objetivo; ritmo real medido en metrics.json.',12,638);v.fillStyle='#98e1da';v.fillText('Círculo cian: punto real de emisión.',12,659);
  };
  const transitions=[];
  for(const boundary of[1,1+card.windup,1+card.attackDuration,2.4,2.7,3.1]){
   const samples=[];
   for(const t of[boundary-1/60,boundary,boundary+1/60]){
    const u=configure(actor(2),t);r.t=t;r.reduced=t>=3.1;const p=r.visualEmission(u);samples.push({t,stage:stage(t),emitter:p,frame:poseFrame(u,t),attack:u.attack,freeze:u.freeze,reduced:r.reduced});
   }
   transitions.push({boundary,samples,emitterStepBeforeToBoundary:Math.hypot(samples[1].emitter.x-samples[0].emitter.x,samples[1].emitter.y-samples[0].emitter.y),emitterStepBoundaryToAfter:Math.hypot(samples[2].emitter.x-samples[1].emitter.x,samples[2].emitter.y-samples[1].emitter.y)});
  }
  const renderPose=(direction,t,patch={},reduced=false)=>{const surface=makeCanvas(256,256),context=surface.getContext('2d');context.imageSmoothingEnabled=false;r.t=t;r.reduced=reduced;r.verticalScale=1;const u={...actor(direction,1),x:128,y:150,...patch};r.sprite(context,u,true);return rgba(surface);};
  const changedPixels=(a,b)=>{let n=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3])n++;return n;};
  const poseComparisons=[];
  for(let direction=0;direction<8;direction++){
   const flightAtStart=renderPose(direction,1),attackAtStart=renderPose(direction,1,{attack:card.attackDuration}),flightAtEnd=renderPose(direction,1.95),attackAtEnd=renderPose(direction,1.95,{attack:.00001});
   const freezeReset=changedPixels(renderPose(direction,2.7),renderPose(direction,2.7,{freeze:.4}));
   poseComparisons.push({direction,name:dirs[direction],attackEntryChangedNativePixels:changedPixels(flightAtStart,attackAtStart),attackExitChangedNativePixels:changedPixels(flightAtEnd,attackAtEnd),freezeResetChangedNativePixels:freezeReset,reducedMotionChangedPixelsAcrossTime:changedPixels(renderPose(direction,3.2,{},true),renderPose(direction,3.8,{},true))});
  }
  const freezeValidation=[];
  for(let direction=0;direction<8;direction++){
   const id=2000+direction,patch={id,freeze:0};r.flightWings.phases?.delete(id);
   renderPose(direction,1,patch);const before=renderPose(direction,1.1,patch),phaseBefore=r.flightWings.phases?.get(id)?.phase;
   const frozenPixels=renderPose(direction,1.1,{...patch,freeze:.4}),phaseAtFreeze=r.flightWings.phases?.get(id)?.phase;
   const frozenActor={...actor(direction,1),x:128,y:150,id,freeze:.4};r.t=1.1;const emitterStart=r.visualEmission(frozenActor);
   let maxCanvasChange=0,maxEmitterDrift=0,maxPhaseDrift=0;
   for(let step=1;step<=18;step++){
    const t=1.1+step/60,pixels=renderPose(direction,t,{...patch,freeze:.4}),phase=r.flightWings.phases?.get(id)?.phase;
    maxCanvasChange=Math.max(maxCanvasChange,changedPixels(frozenPixels,pixels));maxPhaseDrift=Math.max(maxPhaseDrift,Math.abs(phase-phaseAtFreeze));
    const p=r.visualEmission(frozenActor);maxEmitterDrift=Math.max(maxEmitterDrift,Math.hypot(p.x-emitterStart.x,p.y-emitterStart.y));
   }
   const thawTime=1.1+18/60,resumed=renderPose(direction,thawTime,patch),resumePhase=r.flightWings.phases?.get(id)?.phase;renderPose(direction,thawTime+1/60,patch);const nextPhase=r.flightWings.phases?.get(id)?.phase;
   freezeValidation.push({direction,name:dirs[direction],phaseBefore,phaseAtFreeze,freezeEntryChangedNativePixels:changedPixels(before,frozenPixels),maxFrozenCanvasChangedNativePixels:maxCanvasChange,maxFrozenPhaseDrift:maxPhaseDrift,maxFrozenEmitterDriftWorldUnits:maxEmitterDrift,resumeSameTimeChangedNativePixels:changedPixels(frozenPixels,resumed),resumePhase,nextPhase,resumeAdvanceSeconds:nextPhase-resumePhase});
  }
  const flightReferences=[],extraContacts=[];
  for(const spec of[{key:'charizard',id:6,frequency:2.6,rigged:true},{key:'scyther',id:123,frequency:7.5,rigged:true},{key:'salamence',id:373,frequency:2.2,rigged:true},{key:'pidgeot',id:18,rigged:false},{key:'dragonite',id:149,rigged:false}]){
   const profile=CARDS[spec.key],meta=r.metadata[spec.id].Hop,image=r.sprites.get(`${spec.id}-Hop`),loop=profile.moveFrames||meta.durations.map((_,i)=>i),duration=spec.rigged?1/spec.frequency:loop.length*(profile.moveFrameDuration||8)/60;
   const rows=[],sheet=makeCanvas(1650,1080),sc=sheet.getContext('2d');sc.imageSmoothingEnabled=false;sc.fillStyle='#21303a';sc.fillRect(0,0,sheet.width,sheet.height);sc.fillStyle='#e1eee4';sc.font='14px monospace';sc.fillText(`${spec.key}: renderer real — 8 fases × 8 vistas; izquierda 1:1, derecha equivalente a 390 px`,10,23);
   for(let d=0;d<8;d++){
    const exactPhases=[],localRig=new FlightWings();
    if(spec.rigged)for(let phase=0;phase<8;phase++){
     const out=localRig.frame(spec.id,'Hop',d,5,image,meta,phase*duration/8,false);
     if(!out){exactPhases.push({phase,active:false});continue;}
     const source=makeCanvas(meta.width,meta.height);source.getContext('2d').drawImage(image,5*meta.width,d*meta.height,meta.width,meta.height,0,0,meta.width,meta.height);const original=rgba(source),native=makeCanvas(out.width,out.height),nc=native.getContext('2d');nc.imageSmoothingEnabled=false;nc.drawImage(out.image,0,0,out.width,out.height);
     const pixels=rgba(native),entry=localRig.cache.get(`${spec.id}:Hop:${d}:5`),body=rgba(entry.body),points=SPRITE_GEOMETRY[spec.id].Hop.points[d][5],markers=[[points[2],points[3],1.5],[points[4],points[5],1.6],[points[6],points[7],1],[points[8],points[9],1]],foregroundComponents=componentInfo({width:meta.width,height:meta.height,data:alpha(body)},[],0,0,0).components;let protectedChanges=0,retainedBodyChanges=0,partialAlpha=0,phaseZeroSourceChanges=0;
     for(let y=0;y<meta.height;y++)for(let x=0;x<meta.width;x++){
      const a=(y*meta.width+x)*4,b=((y+out.padding)*out.width+x+out.padding)*4;if(!original[a+3])continue;
      const differs=[0,1,2,3].some(k=>original[a+k]!==pixels[b+k]);if(phase===0&&differs)phaseZeroSourceChanges++;if(body[a+3]===255&&differs)retainedBodyChanges++;if(differs&&markers.some(([mx,my,rr])=>Math.hypot(x-mx,y-my)<=rr))protectedChanges++;
     }
     for(let a=3;a<pixels.length;a+=4)if(pixels[a]>0&&pixels[a]<255)partialAlpha++;
     const resolution=out.resolution||1,crop=out.image.getContext('2d',{willReadFrequently:true}).getImageData((points[2]+out.padding-32)*resolution,(points[3]+out.padding-32)*resolution,64*resolution,64*resolution),components=componentInfo({width:crop.width,height:crop.height,data:alpha(crop.data)},[],0,0,0),nativeComponents=componentInfo({width:out.width,height:out.height,data:alpha(pixels)},body,out.padding,meta.width,meta.height);
     exactPhases.push({phase,active:true,silhouetteHash:await digest(alpha(pixels)),protectedChanges,retainedBodyChanges,partialAlpha,foregroundComponents,phaseZeroSourceChanges:phase===0?phaseZeroSourceChanges:null,components:components.components,fragmentNativePixels:components.sizes.slice(1).map(n=>n/(resolution*resolution)),nativeFragments:nativeComponents.fragments});
    }
    const surface=makeCanvas(256,256),context=surface.getContext('2d'),framesSeen=new Set(),poseHashes=new Set(),poseHashCache=new Map(),failures=[];let maxEmitterError=0;
    const originalMethod=r.flightWings.frame;let lastCall,lastOutput;
    r.flightWings.frame=function(...args){lastCall=args;lastOutput=originalMethod.apply(this,args);return lastOutput;};
    try{
     for(let step=0;step<Math.ceil(duration*60);step++){
      const t=step/60,u={...actor(d),id:4000+spec.id*8+d,card:profile,key:spec.key,scale:profile.scale??1.5,x:128,y:150,attack:0,freeze:0};r.t=t;r.reduced=false;r.verticalScale=1;context.clearRect(0,0,256,256);r.sprite(context,u,true);
      const [sid,animation,direction,index]=lastCall,points=SPRITE_GEOMETRY[sid][animation].points[direction][index],a=movementAnchor(sid,animation,direction,index,{x:points[0],y:points[1]}),clock=r.flightWings.phases.get(u.id)?.phase??t,bob=Math.sin(clock*2.6+u.id)*1.5,scale=u.scale,part=emitterPart(profile),offset=part==='body'?2:['hands','cannons'].includes(part)?6:4,forward=part==='head'?2:1,padding=lastOutput?.padding||0;
      framesSeen.add(index);
      if(!poseHashCache.has(index)){
       const canon=makeCanvas(128,128),cx=canon.getContext('2d');cx.drawImage(image,index*meta.width,d*meta.height,meta.width,meta.height,64-points[2],64-points[3],meta.width,meta.height);poseHashCache.set(index,await digest(alpha(rgba(canon))));
      }
      poseHashes.add(poseHashCache.get(index));
      const lead=(points[6]-points[8])*u.dx+(points[7]-points[9])*u.dy>=0?6:8,actualOffset=part==='leadHand'?lead:offset;
      const px=Math.round(u.x-a.x*scale),py=Math.round(u.y-16-bob-a.y*scale),paintX=lastOutput?Math.round(px-padding*scale):px,paintY=lastOutput?Math.round(py-padding*scale):py,drawn={x:paintX+(points[actualOffset]+padding)*scale,y:paintY+(points[actualOffset+1]+padding)*scale},point=r.visualEmission(u);
      maxEmitterError=Math.max(maxEmitterError,Math.hypot(point.x-u.dx*forward*scale-drawn.x,point.y-u.dy*forward*scale-drawn.y));
      if(spec.rigged&&lastOutput){const resolution=lastOutput.resolution||1,crop=lastOutput.image.getContext('2d',{willReadFrequently:true}).getImageData((points[2]+padding-32)*resolution,(points[3]+padding-32)*resolution,64*resolution,64*resolution),parts=componentInfo({width:crop.width,height:crop.height,data:alpha(crop.data)},[],0,0,0);if(parts.components>1)failures.push({step,t,components:parts.components,fragmentNativePixels:parts.sizes.slice(1).map(n=>n/(resolution*resolution))});}
     }
    }finally{r.flightWings.frame=originalMethod;}
    rows.push({direction:d,name:dirs[d],samples:Math.ceil(duration*60),actualNativeFrames:[...framesSeen],distinctNativeDrawings:poseHashes.size,exactPhases,uniqueArticulatedSilhouettes:new Set(exactPhases.filter(p=>p.active).map(p=>p.silhouetteHash)).size,protectedPatchChanges:exactPhases.reduce((n,p)=>n+(p.protectedChanges||0),0),retainedBodyChanges:exactPhases.reduce((n,p)=>n+(p.retainedBodyChanges||0),0),partialAlphaPixelsMax:Math.max(0,...exactPhases.map(p=>p.partialAlpha||0)),sweepFragments:failures,maxEmitterRoundingErrorWorldUnits:maxEmitterError,maxEmitterRoundingErrorCss390:maxEmitterError*.65});
    for(let phase=0;phase<8;phase++){
     const x=50+phase*200,y=60+d*125;sc.fillStyle=phase%2?'#25343b':'#223039';sc.fillRect(x,y,200,125);sc.strokeStyle='#3c4d56';sc.strokeRect(x,y,200,125);sc.fillStyle='#e1eee4';sc.font='12px monospace';if(!phase)sc.fillText(dirs[d],10,y+55);if(!d)sc.fillText(`fase ${phase}/8`,x+40,y-8);
     r.t=phase*duration/8;r.reduced=false;r.verticalScale=1;
     for(const [offset,scale]of[[48,1],[142,(profile.scale??1.5)*.65]]){const u={...actor(d,scale),id:0,card:profile,key:spec.key,x:x+offset,y:y+93};r.sprite(sc,u,true);}
    }
   }
   flightReferences.push({...spec,periodSeconds:duration,sourceMoveFrames:loop,sourceFrameHoldTicks:profile.moveFrameDuration||8,directions:rows});if(spec.key!=='charizard')extraContacts.push({key:spec.key,png:sheet.toDataURL('image/png').split(',')[1]});
   console.log('WING_QA_PARTIAL '+JSON.stringify({key:spec.key,frames:loop,uniqueSilhouettes:rows.map(row=>row.uniqueArticulatedSilhouettes),nativeDrawings:rows.map(row=>row.distinctNativeDrawings),protectedChanges:rows.reduce((n,row)=>n+row.protectedPatchChanges,0),fragmentedExactPhases:rows.reduce((n,row)=>n+row.exactPhases.filter(p=>p.components>1).length,0),fragmentedSweepSamples:rows.reduce((n,row)=>n+row.sweepFragments.length,0),maxEmitterCss390:Math.max(...rows.map(row=>row.maxEmitterRoundingErrorCss390))}));
  }
  const targeting=[],targetScreens=[],surfaces=[];r.targetTintCache?.clear();
  for(const [direction,phase]of[[0,0],[0,2],[3,6]]){
   const clock=phase*period/8,u={...actor(direction,cardScale*.65),id:0,x:144,y:165,preview:false},normal=makeCanvas(288,230),targeted=makeCanvas(288,230),nc=normal.getContext('2d'),tc=targeted.getContext('2d');nc.imageSmoothingEnabled=false;tc.imageSmoothingEnabled=false;r.t=clock;r.reduced=false;r.verticalScale=1;r.flightWings.phases?.delete(u.id);r.spellTargets=new Set();r.sprite(nc,u,true);const before=rgba(normal);r.spellTargets=new Set([u.id]);r.sprite(tc,u,true);const after=rgba(targeted);let outsideBaseChanges=0,alphaChanges=0,coloredPixels=0;
   for(let i=0;i<before.length;i+=4){if(before[i+3]!==after[i+3])alphaChanges++;if(before[i]!==after[i]||before[i+1]!==after[i+1]||before[i+2]!==after[i+2]){coloredPixels++;if(!before[i+3])outsideBaseChanges++;}}
   const surface=[...r.targetTintCache.values()][0];surfaces.push(surface);targeting.push({direction,name:dirs[direction],phase,clock,alphaChanges,outsideBaseChanges,coloredPixels,silhouetteHash:await digest(alpha(before)),tintSurfaceCount:r.targetTintCache.size,reusesFirstSurface:surface===surfaces[0]});
   const sheet=makeCanvas(576,260),sc=sheet.getContext('2d');sc.imageSmoothingEnabled=false;sc.fillStyle='#21303a';sc.fillRect(0,0,576,260);sc.fillStyle='#edf3e6';sc.font='13px monospace';sc.fillText(`Charizard ${dirs[direction]} fase ${phase}/8 — normal / objetivo`,10,18);sc.drawImage(normal,0,25);sc.drawImage(targeted,288,25);targetScreens.push({key:`targeting-${dirs[direction].toLowerCase()}-phase${phase}`,png:sheet.toDataURL('image/png').split(',')[1]});
  }
  r.spellTargets=new Set();
  if(measureOnly)return{metrics:{scope:'Synthetic flight-pose measurement; actual renderer, no combat scheduling claim.',flightReferences,phaseMetrics,sweep,freezeValidation,poseComparisons,targeting,protectedPatchChanges:bodyDiffs.length,intermediateAlphaPixelsMax:Math.max(...phaseMetrics.map(p=>p.intermediateAlpha))},diagnostic:diagnostic.toDataURL('image/png').split(',')[1],contact:contact.toDataURL('image/png').split(',')[1],extraContacts,targetScreens};
  // Save source-scale state samples in the contact footer using the same real sprite renderer.
  const snapshots=[.8,1.15,1.3,1.7,1.97,2.5,2.9,3.5];cc.fillStyle='#edf3e6';cc.font='12px monospace';
  for(let i=0;i<snapshots.length;i++){const t=snapshots[i],u=configure(actor(2,cardScale*.8),t);r.t=t;r.reduced=t>=3.1;u.x=150+i*200;u.y=1168;cc.fillText(`${t.toFixed(2)} ${stage(t)}`,60+i*200,1110);r.sprite(cc,u,true);}
  const timing=[],samples=[],emitterErrors=[],framePngs=[];r.effects=[];r.particles=[];r.numbers=[];
  const stream=video.captureStream(60),chunks=[],recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:3000000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  const started=performance.now();let last=started,nextFrame=started,releaseCount=0;drawScene(0,0);recorder.start();
  for(let frame=0;frame<240;frame++){
   nextFrame+=1000/60;do{await new Promise(requestAnimationFrame);}while(performance.now()+.35<nextFrame);
   const now=performance.now(),t=(now-started)/1000,dt=(now-last)/1000;timing.push(now-last);last=now;
   const releaseTimes=[1+card.windup,1+card.windup+(card.burstSpacing||.14),1+card.windup+2*(card.burstSpacing||.14)];
   while(releaseCount<releaseTimes.length&&t>=releaseTimes[releaseCount]){
    for(let d=0;d<8;d++){const u=configure(actor(d),t),from=emissionPoint(u),to={x:u.x+u.dx*80,y:u.y+u.dy*80-15};r.onEvent({type:'flame',key:'charizard',sourceId:u.id,targetId:-1,from,to,groundFrom:{x:u.x,y:u.y},groundTo:{x:u.x+u.dx*80,y:u.y+u.dy*80},length:80,speed:300,angle:Math.atan2(u.dy,u.dx),shot:releaseCount});}releaseCount++;
   }
   drawScene(t,dt);
   framePngs.push(video.toDataURL('image/png').split(',')[1]);
   for(const u of r.frameActors.values()){
    const p=r.visualEmission(u),animation=u.attack>0?'Shoot':'Hop',index=poseFrame(u,t),points=SPRITE_GEOMETRY[6][animation].points[u.direction][index],a=movementAnchor(6,animation,u.direction,index,{x:points[0],y:points[1]}),flightClock=r.flightWings.phases?.get(u.id)?.phase??t,bob=r.reduced?0:Math.sin(flightClock*2.6+u.id)*1.5;
    const px=Math.round(u.x-a.x*cardScale),py=Math.round(u.y-16-bob-a.y*cardScale),padding=r.reduced?0:12,head={x:(padding?Math.round(px-padding*cardScale):px)+(points[4]+padding)*cardScale,y:(padding?Math.round(py-padding*cardScale):py)+(points[5]+padding)*cardScale};
    const error=Math.hypot((p.x-u.dx*2*cardScale)-head.x,(p.y-u.dy*2*cardScale)-head.y);emitterErrors.push(error);
   }
   samples.push({frame,t,dt,stage:stage(t),rigActive:t<2.7||t>=3.1?(!r.reduced):false});
  }
  await new Promise(resolve=>{recorder.onstop=resolve;recorder.stop();});stream.getTracks().forEach(track=>track.stop());
  const blob=new Blob(chunks,{type:'video/webm'}),buffer=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<buffer.length;i+=8192)binary+=String.fromCharCode(...buffer.subarray(i,i+8192));
  const sorted=timing.slice(5).sort((a,b)=>a-b),counts=dirs.map((name,d)=>({direction:d,name,uniqueHopSilhouettes:new Set(phaseMetrics.filter(p=>p.direction===d&&p.animation==='Hop').map(p=>p.silhouetteHash)).size,uniqueShootSilhouettes:new Set(phaseMetrics.filter(p=>p.direction===d&&p.animation==='Shoot').map(p=>p.silhouetteHash)).size}));
  const metrics={scope:'Synthetic animation reference using the actual Renderer.sprite, FlightWings and visualEmission. No combat simulation or engine scheduling claim.',viewport:{width:390,height:844,deviceScaleFactor:1},video:{width:390,height:684,targetHz:60,frames:samples.length,elapsedSeconds:(last-started)/1000,mimeType:'video/webm;codecs=vp8'},timing:{medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],meanMs:timing.reduce((a,b)=>a+b,0)/timing.length,intervalsOver25ms:timing.filter(v=>v>25).length},perDirection:counts,protectedPatchChanges:bodyDiffs.length,allRetainedBodyPixelsStable:bodyDiffs.length===0,intermediateAlphaPixelsMax:Math.max(...phaseMetrics.map(p=>p.intermediateAlpha)),emitterErrorAfterExplicitForwardOffset:{maxWorldUnits:Math.max(...emitterErrors),maxCssPixelsAt390:Math.max(...emitterErrors)*.65,note:'Includes both rounding operations used to place the articulated image; the emitter retains its explicit 2-native-pixel forward offset.'},flightReferences,sweep,freezeValidation,poseComparisons,targeting,transitions,phaseMetrics,samples};
  return{metrics,contact:contact.toDataURL('image/png').split(',')[1],diagnostic:diagnostic.toDataURL('image/png').split(',')[1],video:btoa(binary),framePngs,extraContacts,targetScreens};
 },{measureOnly:process.argv.includes('--measure-only')});
 result.metrics.date='2026-11-14';result.metrics.inputs=inputs;result.metrics.browserErrors=errors;result.metrics.sourceSnapshot='All listed source files were captured before browser launch and served from those exact bytes throughout this run.';
 if(process.argv.includes('--measure-only')){
  await writeFile(path.join(here,'wing-prototype-measure.json'),JSON.stringify(result.metrics,null,2)+'\n');await writeFile(path.join(here,'wing-prototype-fragments.png'),Buffer.from(result.diagnostic,'base64'));await writeFile(path.join(here,'charizard-runtime-flight.png'),Buffer.from(result.contact,'base64'));for(const contact of result.extraContacts)await writeFile(path.join(here,`${contact.key}-runtime-flight.png`),Buffer.from(contact.png,'base64'));for(const shot of result.targetScreens)await writeFile(path.join(here,shot.key+'.png'),Buffer.from(shot.png,'base64'));console.log(JSON.stringify({measurement:'qa/global-motion-audit/wing-prototype-measure.json',targeting:result.metrics.targeting,browserErrors:errors}));
 }else{
 await writeFile(path.join(output,'contacto.png'),Buffer.from(result.contact,'base64'));await writeFile(path.join(here,'charizard-raw-capture.webm'),Buffer.from(result.video,'base64'));
 const frameFolder=path.join(here,'wing-prototype-video-frames');await mkdir(frameFolder,{recursive:true});
 await Promise.all(result.framePngs.map((png,index)=>writeFile(path.join(frameFolder,String(index).padStart(4,'0')+'.png'),Buffer.from(png,'base64'))));
 const encoded=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','60','-i',path.join(frameFolder,'%04d.png'),'-frames:v','240','-c:v','libvpx-vp9','-lossless','1','-r','60','-pix_fmt','yuv444p',path.join(output,'charizard-390.webm')],{encoding:'utf8'});
 if(encoded.status!==0)throw Error('Video encoding failed: '+encoded.stderr);
 const probed=spawnSync('ffprobe',['-v','error','-count_frames','-show_entries','stream=codec_name,width,height,nb_read_frames','-show_entries','format=duration','-of','json',path.join(output,'charizard-390.webm')],{encoding:'utf8'});
 if(probed.status!==0)throw Error('Video validation failed: '+probed.stderr);
 result.metrics.video.captureMethod='240 real wall-clock RAF-deadline canvas samples, saved losslessly and encoded at 60 Hz to retain every sampled frame; not a fixed simulation step or MediaRecorder frame-count claim.';
 result.metrics.video.mimeType='video/webm;codecs=vp9';result.metrics.video.encoding='Lossless VP9 with 4:4:4 chroma to avoid codec blur at native pixel edges.';
 result.metrics.video.encoded=JSON.parse(probed.stdout);
 const fragmented=result.metrics.phaseMetrics.filter(phase=>phase.supersampledComponents>1);
 const sweepFailures=result.metrics.sweep.reduce((n,row)=>n+row.failures.length,0);
 const freezeStable=result.metrics.freezeValidation.every(p=>p.freezeEntryChangedNativePixels===0&&p.maxFrozenCanvasChangedNativePixels===0&&p.maxFrozenPhaseDrift===0&&p.maxFrozenEmitterDriftWorldUnits<.000001&&p.resumeSameTimeChangedNativePixels===0&&Math.abs(p.resumePhase-p.phaseAtFreeze)<.000001&&Math.abs(p.resumeAdvanceSeconds-1/60)<.000001);
 const flightChecks=result.metrics.flightReferences.map(spec=>{
  const phases=spec.directions.flatMap(row=>row.exactPhases),maxFragment=Math.max(0,...phases.flatMap(ph=>ph.fragmentNativePixels||[]),...spec.directions.flatMap(row=>row.sweepFragments.flatMap(f=>f.fragmentNativePixels)));
  return{key:spec.key,rigged:spec.rigged,protectedChanges:spec.directions.reduce((n,row)=>n+row.protectedPatchChanges,0),retainedBodyChanges:spec.directions.reduce((n,row)=>n+row.retainedBodyChanges,0),foregroundComponents:[...new Set(phases.map(p=>p.foregroundComponents))],phaseZeroSourceChanges:phases.reduce((n,p)=>n+(p.phaseZeroSourceChanges||0),0),minimumAnimatedSilhouettes:spec.rigged?Math.min(...spec.directions.map(row=>row.uniqueArticulatedSilhouettes)):null,minimumNativeDrawings:Math.min(...spec.directions.map(row=>row.distinctNativeDrawings)),largestMobileFragmentNativePixels:maxFragment,maxEmitterCss390:Math.max(...spec.directions.map(row=>row.maxEmitterRoundingErrorCss390)),nativeVisibleFragments:phases.flatMap(ph=>(ph.nativeFragments||[]).filter(f=>f.retainedBodyPixels===0).map(f=>({phase:ph.phase,pixels:f.size}))) };
 });
 const anatomyStable=flightChecks.every(row=>!row.rigged||row.protectedChanges===0&&row.retainedBodyChanges===0&&row.foregroundComponents.length===1&&row.foregroundComponents[0]===1&&row.phaseZeroSourceChanges===0&&row.minimumAnimatedSilhouettes>=2);
 const targetingStable=result.metrics.targeting.every(row=>row.alphaChanges===0&&row.outsideBaseChanges===0&&row.reusesFirstSurface);
 const largestFlightFragment=Math.max(0,...flightChecks.map(row=>row.largestMobileFragmentNativePixels));
 result.metrics.review={status:!anatomyStable||!targetingStable||!freezeStable||largestFlightFragment>1?'needs_correction':largestFlightFragment>0?'prototype_reference_with_raster_limit':'synthetic_flight_checks_passed',anatomyStable,targetingStable,flightChecks,fragmentedPoseSamples:fragmented.length,sweepFragmentedSamples:sweepFailures,largestFragmentNativePixels:largestFlightFragment,protectedPatchChanges:result.metrics.protectedPatchChanges,freezeStable,freezePoseResetObserved:result.metrics.poseComparisons.some(p=>p.freezeResetChangedNativePixels>0),reducedMotionStable:result.metrics.poseComparisons.every(p=>p.reducedMotionChangedPixelsAcrossTime===0),approvalScope:'Synthetic flight/targeting references only. Live combat scheduling, impacts, unit interactions and the remaining Pokemon require their separate review.',note:'Some mobile one-native-pixel or smaller fragments appear at specific raster angles. The original opaque foreground is one connected component in all 24 rig views, with no detached retained-body residues. No source pixels or components were deleted.'};
 await writeFile(path.join(output,'metrics.json'),JSON.stringify(result.metrics,null,2)+'\n');
 await writeFile(path.join(here,'wing-prototype-fragments.png'),Buffer.from(result.diagnostic,'base64'));
 for(const contact of result.extraContacts){const bytes=Buffer.from(contact.png,'base64');await writeFile(path.join(here,`${contact.key}-runtime-flight.png`),bytes);await writeFile(path.join(output,`${contact.key}-contacto.png`),bytes);}
 for(const shot of result.targetScreens)await writeFile(path.join(output,shot.key+'.png'),Buffer.from(shot.png,'base64'));
 console.log(JSON.stringify({output,video:result.metrics.video,timing:result.metrics.timing,perDirection:result.metrics.perDirection,protectedPatchChanges:result.metrics.protectedPatchChanges,intermediateAlphaPixelsMax:result.metrics.intermediateAlphaPixelsMax,emitter:result.metrics.emitterErrorAfterExplicitForwardOffset,browserErrors:errors}));
 }
 await context.close();
 }
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
