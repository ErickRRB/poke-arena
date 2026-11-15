import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const sha = data => createHash('sha256').update(data).digest('hex');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inRoot = p => { const full=path.resolve(root,p); if (!full.startsWith(root+path.sep)) throw Error('source and adapter must be inside repository'); return full; };
export function validateCase(c) {
  if (!c || !/^[\w-]+$/.test(c.id || '') || !c.source || !c.adapter || c.clock !== 'natural-app' || !c.expectedEvent) throw Error('case requires id, source, adapter, natural-app clock and expectedEvent');
  const {width,height,dpr}=c.viewport || {};
  if (![width,height,dpr,c.durationMs,c.sampleMs,c.extractIntervalMs].every(Number.isFinite) || width<1 || height<1 || dpr<=0 || c.durationMs<100 || c.sampleMs<10 || c.extractIntervalMs<=0) throw Error('invalid viewport or timing');
  if (c.maxGapMs !== undefined && (!Number.isFinite(c.maxGapMs) || c.maxGapMs<=0)) throw Error('invalid maximum gap');
  if (c.recordCanvas !== undefined && (typeof c.recordCanvas !== 'string' || !c.recordCanvas.trim())) throw Error('invalid canvas selector');
  const q=c.crop;
  if (!q || ![q.x,q.y,q.width,q.height].every(Number.isFinite) || q.x<0 || q.y<0 || q.width<=0 || q.height<=0 || q.x+q.width>width || q.y+q.height>height) throw Error('invalid fixed crop');
  inRoot(c.source); inRoot(c.adapter);
}
export function jpegSize(data) {
  if (data[0] !== 0xff || data[1] !== 0xd8) throw Error('invalid JPEG');
  for (let i=2; i+8<data.length;) {
    if (data[i] !== 0xff) throw Error('invalid JPEG segment');
    const marker=data[i+1], length=data.readUInt16BE(i+2);
    if ([0xc0,0xc1,0xc2].includes(marker)) return {width:data.readUInt16BE(i+7),height:data.readUInt16BE(i+5)};
    if (length<2) break; i+=2+length;
  }
  throw Error('JPEG size unavailable');
}
export function selectFrames(pts, interval) {
  const selected=[]; let last=-Infinity;
  for (let i=0;i<pts.length;i++) if (Number.isFinite(pts[i]) && pts[i]>=last+interval-1e-9) { selected.push({index:i,pts:pts[i]}); last=pts[i]; }
  return selected;
}
function viewer(c, selected) {
  const {width,height}=c.viewport, q=c.crop;
  const frames=selected.map(f=>`<section><p>Tiempo original ${f.pts.toFixed(6)} s · cuadro ${f.index}</p><div class="row"><div class="full"><img src="${f.path}" alt="Contexto completo"></div><div class="crop"><img src="${f.path}" alt="Recorte fijo"></div></div></section>`).join('\n');
  return `<!doctype html><html lang="es"><meta charset="utf-8"><title>${esc(c.id)} · evidencia</title><style>body{font:14px system-ui;margin:16px} .row{display:flex;gap:12px;align-items:start}.full,.crop{overflow:hidden;flex:none}.full{width:${width}px;height:${height}px}.crop{width:${q.width}px;height:${q.height}px}.row img{display:block;width:${width}px;height:${height}px;max-width:none}.crop img{margin-left:-${q.x}px;margin-top:-${q.y}px}section{margin:24px 0}video{max-width:100%}</style><h1>${esc(c.id)}</h1><p>Secuencia de cuadros recibidos de CDP con tiempos originales; no es video continuo ni un veredicto perceptual. CDP puede omitir presentaciones o alterar el ritmo.</p><p><a href="run.json">Manifiesto</a></p>${c.recordCanvas ? '<p>Video de canvas (sin interfaz completa):</p><video controls src="canvas.webm"></video>' : ''}${frames}</html>`;
}
async function playwright() {
  if (process.env.PLAYWRIGHT_MODULE) return import(pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)));
  try { return await import('playwright'); } catch { return import(pathToFileURL(path.resolve(root,'../pokemon-arena/qa/node_modules/playwright/index.mjs'))); }
}
function command(exe,args) { return execFileSync(exe,args,{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024}); }
function serve() {
  const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ogg':'audio/ogg','.mp3':'audio/mpeg'};
  const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=inRoot(pathname.replace(/^\//,''));const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404).end();}});
  return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve(server));});
}
export async function runCase(c,{mode='capture',out='workbench-runs'}={}) {
  validateCase(c);
  if (!['capture','observe'].includes(mode)) throw Error('mode must be capture or observe');
  const result={schema:1,id:c.id,mode,status:'running',requested:c,limitations:['Emulación de navegador; no dispositivo físico.','La semilla del motor no determina Math.random del renderer.','Una secuencia de imágenes no demuestra fluidez perceptual.'],samples:[]};
  let dir,server,browser,context,cdp; const captured=[]; let pending=Promise.resolve();
  if (mode==='capture') { await mkdir(out,{recursive:true}); dir=path.resolve(out,`${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID()}`); await mkdir(dir); await mkdir(path.join(dir,'frames'));  }
  try {
    for (const p of [c.source,c.adapter]) { const data=await readFile(inRoot(p)); (result.inputs ||= []).push({path:p,sha256:sha(data)}); }
    result.git={sha:command('git',['rev-parse','HEAD']).trim(),tree:command('git',['rev-parse','HEAD^{tree}']).trim(),status:command('git',['status','--porcelain']).trim()};
    const adapter=await import(pathToFileURL(inRoot(c.adapter)).href+'?v='+Date.now());
    if (typeof adapter.prepare!=='function' || typeof adapter.observe!=='function') throw Error('adapter requires prepare and observe');
    server=await serve(); const pw=await playwright(); browser=await pw.chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:mode!=='observe'});
    const viewport={width:c.viewport.width,height:c.viewport.height};
    context=await browser.newContext({viewport,deviceScaleFactor:c.viewport.dpr});
    const page=await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/${c.source.split('/').map(encodeURIComponent).join('/')}`);
    await adapter.prepare(page,c);
    if (dir && c.recordCanvas) {
      result.canvasCaptureStartEpochMs=await page.evaluate(selector=>{
        const canvas=document.querySelector(selector); if(!canvas || typeof canvas.captureStream!=='function') throw Error('recordCanvas requires a canvas with captureStream');
        const stream=canvas.captureStream(), recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'}), chunks=[];
        window.__workbenchRecording={stream,recorder,chunks}; recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)}; recorder.start(); return performance.timeOrigin+performance.now();
      },c.recordCanvas);
    }
    if (dir) {
      cdp=await context.newCDPSession(page); await cdp.send('Page.enable');
      cdp.on('Page.screencastFrame', frame=> {
        const index=captured.length, name=`frames/${String(index).padStart(5,'0')}.jpg`;
        const entry={index,path:name,timestamp:frame.metadata.timestamp,deviceWidth:frame.metadata.deviceWidth,deviceHeight:frame.metadata.deviceHeight}; captured.push(entry);
        pending=pending.then(()=>writeFile(path.join(dir,name),Buffer.from(frame.data,'base64')));
        cdp.send('Page.screencastFrameAck',{sessionId:frame.sessionId}).catch(()=>{});
      });
      await cdp.send('Page.startScreencast',{format:'jpeg',quality:100,maxWidth:viewport.width,maxHeight:viewport.height,everyNthFrame:1});
    }
    const start=Date.now();
    do { result.samples.push(await adapter.observe(page,c)); await page.waitForTimeout(c.sampleMs); } while(Date.now()-start<c.durationMs);
    const observed=result.samples;
    if (!observed.length || observed.some(s=>s.viewport?.width!==viewport.width || s.viewport?.height!==viewport.height || s.dpr!==c.viewport.dpr)) throw Error('observed viewport or DPR differs from requested');
    if (observed[0].events?.some(e=>e.type===c.expectedEvent) || !observed.slice(1).some(s=>s.events?.some(e=>e.type===c.expectedEvent && Number.isFinite(e.at) && e.at>=observed[0].gameTime && e.at<=s.gameTime))) throw Error('expected event not observed during case');
    if (observed.some(s=>!Number.isFinite(s.wallTime)||!Number.isFinite(s.epochMs)||!Number.isFinite(s.gameTime)||!s.canvas||s.pose==null||s.hp==null)) throw Error('required observed state missing');
    if (dir) {
      await cdp.send('Page.stopScreencast'); await pending;
      if (!captured.length || captured.some((f,i)=>!Number.isFinite(f.timestamp)||(i && f.timestamp<captured[i-1].timestamp))) throw Error('missing or unordered original CDP timestamps');
      if (c.recordCanvas) {
        const b64=await page.evaluate(async()=>{const v=window.__workbenchRecording;await new Promise(resolve=>{v.recorder.onstop=resolve;v.recorder.stop()});v.stream.getTracks().forEach(t=>t.stop());const data=new Uint8Array(await new Blob(v.chunks,{type:'video/webm'}).arrayBuffer());let binary='';for(let i=0;i<data.length;i+=8192)binary+=String.fromCharCode(...data.subarray(i,i+8192));return btoa(binary);});
        const bytes=Buffer.from(b64,'base64'),file=path.join(dir,'canvas.webm'); await writeFile(file,bytes);
        const probe=JSON.parse(command(process.env.FFPROBE||'ffprobe',['-v','error','-select_streams','v:0','-show_streams','-show_frames','-show_entries','stream=width,height,avg_frame_rate,r_frame_rate,duration:frame=best_effort_timestamp_time','-of','json',file]));
        const timestamps=(probe.frames||[]).map(f=>Number(f.best_effort_timestamp_time));
        if (!timestamps.length || timestamps.some((v,i)=>!Number.isFinite(v)||(i&&v<timestamps[i-1]))) throw Error('missing or unordered canvas video PTS');
        result.canvasVideo={path:'canvas.webm',sha256:sha(bytes),stream:probe.streams?.[0],pts:timestamps,limitations:'Canvas only, MediaRecorder timestamps; cadence and capture loss depend on browser. This is not full DOM context.'};
      }
      const origin=captured[0].timestamp, pts=captured.map(f=>f.timestamp-origin);
      const selected=selectFrames(pts,c.extractIntervalMs/1000).map(f=>({...f,path:captured[f.index].path}));
      const gaps=pts.slice(1).map((t,i)=>t-pts[i]); if(c.maxGapMs !== undefined && gaps.some(g=>g*1000>c.maxGapMs)) throw Error('requested maximum gap exceeded');
      result.capture={kind:'cdp-screencast',clock:'CDP metadata.timestamp (seconds since epoch)',origin,frames:captured,selected,observedCadence: {count:captured.length, durationSeconds:pts.at(-1), meanDeliveredFps:pts.at(-1)>0?(pts.length-1)/pts.at(-1):null,maxGapMs:gaps.length?Math.max(...gaps)*1000:null,gapsSeconds:gaps},limitations:'CDP delivers browser frames opportunistically; timestamps describe delivered frames, not every display presentation. No continuous video or perceptual fluency is claimed.'};
      for (const frame of captured) { const bytes=await readFile(path.join(dir,frame.path)); const size=jpegSize(bytes); if(size.width!==viewport.width || size.height!==viewport.height) throw Error('captured frame size differs from CSS viewport'); frame.sha256=sha(bytes); }
      await writeFile(path.join(dir,'index.html'),viewer(c,selected));
    }
    result.status='complete';
  } catch(e) { result.status='failed'; result.error=e.message; }
  finally { if(context) await context.close(); if(browser) await browser.close(); if(server) await new Promise(r=>server.close(r)); if(dir) await writeFile(path.join(dir,'run.json'),JSON.stringify(result,null,2)); }
  if(result.status!=='complete') throw Object.assign(Error(result.error),{runDirectory:dir});
  return {directory:dir,result};
}
if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try { if(process.argv[2]==='--help'){ console.log('capture|observe case.json [--out directory] — local fixture, CDP timestamps, no perceptual verdict. Case: id, source, adapter, viewport {width,height,dpr}, durationMs, sampleMs, clock natural-app, expectedEvent, extractIntervalMs, crop {x,y,width,height}; optional maxGapMs and recordCanvas selector. Adapter exports prepare(page,case) and observe(page,case); observations include wallTime, epochMs, gameTime, viewport, dpr, canvas, pose, hp, events [{type,at: gameTime}]. Playwright and Edge required.'); process.exit(0); } const [mode,file,flag,out]=process.argv.slice(2); if(!['capture','observe'].includes(mode)||!file||(flag&&flag!=='--out')||(flag&&!out)) throw Error('usage: node scripts/review-workbench.mjs capture|observe case.json [--out directory]'); const c=JSON.parse(await readFile(file,'utf8')); const r=await runCase(c,{mode,out}); console.log(JSON.stringify({status:r.result.status,directory:r.directory},null,2)); }
  catch(e) {console.error(e.message, e.runDirectory||'');process.exitCode=1;}
}
