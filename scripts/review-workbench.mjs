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
export function validatePublicOrigin(value){
  let url;try{url=new URL(value);}catch{throw Error('publicOrigin must be an explicit HTTPS origin');}
  if(url.protocol!=='https:'||url.origin!==value||url.username||url.password)throw Error('publicOrigin must be an explicit HTTPS origin without credentials, path, query or fragment');
  return url.origin;
}
export function validateCase(c) {
  if (!c || !/^[\w-]+$/.test(c.id || '') || !c.source || !c.adapter || c.clock !== 'natural-app' || !c.expectedEvent) throw Error('case requires id, source, adapter, natural-app clock and expectedEvent');
  const {width,height,dpr}=c.viewport || {};
  if (![width,height,dpr,c.durationMs,c.sampleMs,c.extractIntervalMs].every(Number.isFinite) || width<1 || height<1 || dpr<=0 || c.durationMs<100 || c.sampleMs<10 || c.extractIntervalMs<=0) throw Error('invalid viewport or timing');
  if (c.maxGapMs !== undefined && (!Number.isFinite(c.maxGapMs) || c.maxGapMs<=0)) throw Error('invalid maximum gap');
  if (c.recordCanvas !== undefined && (typeof c.recordCanvas !== 'string' || !c.recordCanvas.trim())) throw Error('invalid canvas selector');
  const q=c.crop;
  if (!q || ![q.x,q.y,q.width,q.height].every(Number.isFinite) || q.x<0 || q.y<0 || q.width<=0 || q.height<=0 || q.x+q.width>width || q.y+q.height>height) throw Error('invalid fixed crop');
  inRoot(c.source); inRoot(c.adapter);
  if (c.runtime && (c.source !== 'dist/index.html' || typeof c.runtime.root !== 'string' || !/^[a-f0-9]{40}$/.test(c.runtime.sha || '') || !/^[a-f0-9]{40}$/.test(c.runtime.tree || ''))) throw Error('runtime requires dist/index.html, repository root, full SHA and tree');
  if(c.adapterDependencies!==undefined&&(!Array.isArray(c.adapterDependencies)||c.adapterDependencies.some(p=>typeof p!=='string'||!p.trim())||new Set(c.adapterDependencies.map(inRoot)).size!==c.adapterDependencies.length||c.adapterDependencies.some(p=>inRoot(p)===inRoot(c.adapter))))throw Error('adapterDependencies must list distinct local dependency paths');
  if(c.publicOrigin!==undefined){validatePublicOrigin(c.publicOrigin);if(!c.runtime||typeof c.runtime.buildOutput!=='string'||!c.runtime.buildOutput.trim())throw Error('publicOrigin requires frozen runtime and buildOutput');if(!Array.isArray(c.adapterDependencies))throw Error('publicOrigin requires explicit adapterDependencies, empty for a standalone adapter');}
}
function inputDefinitions(c){return [['source',c.source],['adapter',c.adapter],['runner','scripts/review-workbench.mjs'],...(c.adapterDependencies||[]).map((p,i)=>['adapterDependency:'+i,p])];}
export function inputInventory(c){return{expectedInputs:['case',...inputDefinitions(c).map(([role])=>role)],inputs:[{role:'case',origin:'case',sha256:sha(Buffer.from(JSON.stringify(c)))}],adapterDependencyCoverage:{declared:c.adapterDependencies??null,limits:'Caller-declared local Node-side imports, including transitives; no automatic import discovery or ESM-cache invalidation. Without a declaration only primary inputs are recorded.'}};}
export async function recordInputs(result,c,runtime){
  for(const[role,p]of inputDefinitions(c)){const origin=runtime&&role==='source'?'runtime':'tooling',data=await readFile(origin==='runtime'?path.join(runtime.cwd,p):inRoot(p));result.inputs.push({role,path:p,origin,sha256:sha(data)});}
}
export async function rehashInputs(result,c,runtime){
  const changed=[];
  for(const input of result.inputs){try{const data=input.role==='case'?Buffer.from(JSON.stringify(c)):await readFile(input.origin==='runtime'?path.join(runtime.cwd,input.path):inRoot(input.path));input.finalSha256=sha(data);if(input.finalSha256!==input.sha256)changed.push(input.role);}catch{input.finalSha256=null;changed.push(input.role);}}
  const roles=result.inputs.map(input=>input.role);result.missingInputs=result.expectedInputs.filter(role=>!roles.includes(role));result.changedInputs=changed;
  if(result.missingInputs.length||changed.length||new Set(roles).size!==roles.length)throw Error('input inventory incomplete or changed: '+[...result.missingInputs,...changed].join(', '));
}
export function pngSize(data) {
  const signature=Buffer.from([137,80,78,71,13,10,26,10]);
  if (data.length<24 || !data.subarray(0,8).equals(signature) || data.readUInt32BE(8)!==13 || data.toString('ascii',12,16)!=='IHDR') throw Error('invalid PNG');
  return {width:data.readUInt32BE(16),height:data.readUInt32BE(20)};
}
export function timestampAnomalies(frames) {
  return frames.flatMap((frame,index)=>{
    const previous=frames[index-1]?.timestamp;
    if(!Number.isFinite(frame.timestamp)) return [{index,reason:'missing',value:frame.timestamp??null}];
    if(index && Number.isFinite(previous) && frame.timestamp<previous) return [{index,reason:'decreased',value:frame.timestamp,previous}];
    return [];
  });
}
export function selectFrames(pts, interval) {
  const selected=[]; let last=-Infinity;
  for (let i=0;i<pts.length;i++) if (Number.isFinite(pts[i]) && pts[i]>=last+interval-1e-9) { selected.push({index:i,pts:pts[i]}); last=pts[i]; }
  return selected;
}
function viewer(c, selected, result) {
  const {width,height}=c.viewport, q=c.crop;
  const frames=selected.map(f=>`<section><p>Tiempo original ${f.pts.toFixed(6)} s · cuadro ${f.index}</p><div class="row"><div class="full"><img src="${f.path}" alt="Contexto completo"></div><div class="crop"><img src="${f.path}" alt="Recorte fijo"></div></div></section>`).join('\n');
  const cadence=result.capture.observedCadence;
  const samples=result.samples.map((sample,i)=>`<tr><td>${i+1}</td><td>${esc(sample.epochMs)}</td><td>${esc(sample.wallTime)}</td><td>${esc(sample.gameTime)}</td><td>${esc(JSON.stringify(sample.pose))}</td><td>${esc(JSON.stringify(sample.hp))}</td><td>${esc(JSON.stringify(sample.events))}</td></tr>`).join('');
  const first=result.samples[0], viewport=first.viewport, image=result.capture.frames[0];
  const eventSamples=result.samples.filter(sample=>sample.events?.some(event=>event.type===c.expectedEvent)).length;
  const conditions=esc(JSON.stringify({requested:c.viewport,observed:first,capture:cadence},null,2));
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.id)} · evidencia</title><style>body{font:14px system-ui;margin:16px;overflow-wrap:anywhere} .row{display:flex;flex-wrap:wrap;gap:12px;align-items:start}.full,.crop{overflow:auto;flex:none;max-width:100%}.full{width:${width}px;height:${height}px}.crop{width:${q.width}px;height:${q.height}px}.row img{display:block;width:${width}px;height:${height}px;max-width:none}.crop img{margin-left:-${q.x}px;margin-top:-${q.y}px}section{margin:24px 0}video{max-width:100%}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-width:100%}.table-wrap{max-width:100%;overflow-x:auto}td{overflow-wrap:anywhere}</style><h1>${esc(c.id)}</h1><p>Secuencia de cuadros recibidos de CDP; puede omitir presentaciones. No demuestra fluidez.</p><p><a href="run.json">Manifiesto completo</a></p>${c.recordCanvas ? '<p>Video de canvas (sin interfaz completa):</p><video controls src="canvas.webm"></video>' : ''}<h2 id="capture-summary">Condiciones y cadencia observadas</h2><p>Viewport solicitado ${width} × ${height}, DPR ${esc(c.viewport.dpr)}; observado ${esc(viewport.width)} × ${esc(viewport.height)}, DPR ${esc(first.dpr)}.</p><p>Fuente: ${esc(c.source)}; herramientas ${esc(result.git.sha)}; runtime ${esc(result.runtime?.sha ?? result.git.sha)}; cuadros ${esc(image.format)} de ${image.width} × ${image.height} píxeles capturados (dimensiones de imagen, no DPR físico inferido). Evento ${esc(c.expectedEvent)} presente en ${eventSamples} muestras; las repeticiones no implican eventos distintos.</p><p>Cuadros CDP recibidos: ${cadence.count}; duración: ${cadence.durationSeconds.toFixed(3)} s; media: ${cadence.meanDeliveredFps?.toFixed(2) ?? '—'} por segundo; hueco máximo: ${cadence.maxGapMs?.toFixed(2) ?? '—'} ms. Son valores de entrega, no fluidez.</p><details><summary>Condiciones y huecos completos</summary><pre>${conditions}</pre></details><details><summary>Tiempos, poses, HP y eventos observados (${result.samples.length})</summary><div class="table-wrap"><table><thead><tr><th>Muestra</th><th>Época (ms)</th><th>Reloj página (ms)</th><th>Juego (s)</th><th>Pose</th><th>HP</th><th>Eventos</th></tr></thead><tbody>${samples}</tbody></table></div></details>${frames}</html>`;

}
async function playwright() {
  if (process.env.PLAYWRIGHT_MODULE) return import(pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)));
  try { return await import('playwright'); } catch { return import(pathToFileURL(path.resolve(root,'../pokemon-arena/qa/node_modules/playwright/index.mjs'))); }
}
function command(exe,args) { return execFileSync(exe,args,{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024}); }
function runtimeSource(config) {
  if (!config.runtime) return null;
  const cwd=path.resolve(root,config.runtime.root), git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024}).trim();
  const sha=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}'),status=config.publicOrigin?git('status','--porcelain'):git('status','--porcelain','--','dist');
  if(sha!==config.runtime.sha || tree!==config.runtime.tree || status) throw Error('runtime SHA/tree mismatch or dirty dist');
  const blobs=new Map(git('ls-tree','-r','HEAD','--','dist').split(/\r?\n/).filter(Boolean).map(line=>{const m=/^\d+ blob ([a-f0-9]+)\t(.+)$/.exec(line);if(!m) throw Error('unsupported runtime tree entry');return [m[2],m[1]];}));
  return {cwd,sha,tree,status,blobs,served:new Map(),errors:[]};
}
function runtimeBlob(runtime,relative,data){
  const blobId=bytes=>createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
  let blob=blobId(data);if(blob!==runtime.blobs.get(relative))blob=blobId(Buffer.from(data.toString('utf8').replace(/\r\n/g,'\n'),'utf8'));
  if(runtime.blobs.get(relative)!==blob)throw Error('runtime blob mismatch: '+relative);return blob;
}
export async function publicBuild(runtime,relative){
  const directory=path.resolve(runtime.cwd,relative);if(!directory.startsWith(runtime.cwd+path.sep))throw Error('buildOutput must be inside frozen runtime');
  const files=[],assets=new Map(),prefix='workers/default/assets/';
  async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const absolute=path.join(dir,entry.name);if(entry.isDirectory()){await walk(absolute);continue;}if(!entry.isFile())throw Error('Build Output contains a non-file');const data=await readFile(absolute),file=path.relative(directory,absolute).split(path.sep).join('/'),item={path:file,bytes:data.length,sha256:sha(data)};files.push(item);
    if(file.startsWith(prefix)){const name=file.slice(prefix.length),source='dist/'+name;if(!data.equals(await readFile(path.join(runtime.cwd,source))))throw Error('build/source bytes differ: '+name);assets.set(name,{...item,absolute,source,gitBlob:runtimeBlob(runtime,source,data)});}
  }}await walk(directory);files.sort((a,b)=>a.path.localeCompare(b.path));
  const missing=[...runtime.blobs.keys()].filter(file=>file.startsWith('dist/')&&!assets.has(file.slice(5)));if(missing.length)throw Error('Build Output is missing source assets: '+missing.join(', '));
  if(!files.some(f=>f.path==='workers/default/bundle/index.js')||!['index.html','app.js','render.js','engine.js'].every(file=>assets.has(file)))throw Error('complete Build Output and core app assets required');
  return{directory,files,sha256:sha(JSON.stringify(files)),assets};
}
async function timed(promise,ms){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('response body timed out')),ms);})]);}finally{clearTimeout(timer);}}
export function collectPublicResponse(response,remote,runtime){
  const url=new URL(response.url());if(url.origin!==remote.origin)return;
  const job=(async()=>{
    const file=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).slice(1),entry=remote.build.assets.get(file);if(!entry)throw Error('unexpected public response: '+file);
    const expected=await readFile(entry.absolute);if(sha(expected)!==entry.sha256)throw Error('Build Output changed: '+file);
    const body=await timed(response.body(),10000),status=response.status();let bytes=expected,range=null;
    if(status===206){const m=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers()['content-range']||'');if(!m||+m[3]!==expected.length||+m[1]>+m[2]||+m[2]>=expected.length)throw Error('invalid public content-range: '+file);range={start:+m[1],end:+m[2],total:+m[3]};bytes=expected.subarray(range.start,range.end+1);}else if(status!==200)throw Error('unexpected public status '+status+': '+file);
    if(!body.equals(bytes))throw Error('public resource mismatch: '+file);
    const record={file,url:response.url(),status,bytes:body.length,sha256:sha(body),range};remote.responses.push(record);
    const served=runtime.served.get(entry.source)||{path:entry.source,gitBlob:entry.gitBlob,sha256:entry.sha256,publicResponses:[]};served.publicResponses.push(record);runtime.served.set(entry.source,served);
  })().catch(error=>remote.errors.push(error.message));remote.jobs.push(job);return job;
}
export async function drainResponses(jobs){for(let done=0;done<jobs.length;){const batch=jobs.slice(done);done=jobs.length;await Promise.all(batch);}}
export async function isolatePublicPage(page,remote){
  page.on('pageerror',error=>remote.network.pageErrors.push(error.message));
  if(typeof page.routeWebSocket!=='function')throw Error('WebSocket isolation unavailable');
  await page.routeWebSocket('**/*',async ws=>{const u=new URL(ws.url());remote.network.webSockets.push({origin:u.origin,pathname:u.pathname});await ws.close({code:1008,reason:'review isolation'});});
  await page.route('**/*',route=>{const u=new URL(route.request().url()),entry={origin:u.origin,pathname:u.pathname};remote.network.requests.push(entry);
    if(u.origin!==remote.origin||u.pathname==='/api'||u.pathname.startsWith('/api/')){remote.network.blocked.push(entry);return route.abort('blockedbyclient');}return route.fallback();
  });
}
export async function finishPublicPage(page,remote){
  const errors=[];
  try{await page.waitForLoadState('networkidle',{timeout:10000});}catch(error){errors.push(error.message);}
  try{await drainResponses(remote.jobs);}catch(error){errors.push(error.message);}
  try{await page.close();}catch(error){errors.push(error.message);}
  await drainResponses(remote.jobs);
  if(remote.network.pageErrors.length||remote.network.blocked.length||remote.network.webSockets.length)errors.push('page errors or isolated network attempts observed');
  if(errors.length)throw Error(errors.join('; '));
}
function serve(runtime) {
  const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ogg':'audio/ogg','.mp3':'audio/mpeg'};
  const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const relative=pathname.replace(/^\//,''); const runtimeFile=runtime && relative.startsWith('dist/');
    const file=runtimeFile?path.resolve(runtime.cwd,relative):inRoot(relative);
    if(runtimeFile && !file.startsWith(path.join(runtime.cwd,'dist')+path.sep)) throw Error('invalid runtime path');
    const data=await readFile(file);
    if(runtimeFile){let blob;try{blob=runtimeBlob(runtime,relative,data);}catch(error){runtime.errors.push(error.message);throw error;}runtime.served.set(relative,{path:relative,gitBlob:blob,sha256:sha(data)});}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404).end();}});
  return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve(server));});
}
export async function runCase(c,{mode='capture',out='workbench-runs',observeDurationMs,headless,additionalCdpAnomalies=()=>[]}={}) {
  validateCase(c);
  if (!['capture','observe'].includes(mode)) throw Error('mode must be capture or observe');
  if (observeDurationMs !== undefined && (mode !== 'observe' || !Number.isFinite(observeDurationMs) || observeDurationMs<100)) throw Error('observe duration must be at least 100 ms and only applies to observe');
  const result={schema:1,id:c.id,mode,status:'running',requested:structuredClone(c),limitations:['Emulación de navegador; no dispositivo físico.','La semilla del motor no determina Math.random del renderer.','Una secuencia de imágenes no demuestra fluidez perceptual.'],samples:[]};
  Object.assign(result,inputInventory(c));
  result.phases={observation:'not_started',cdp:'not_started',canvas:'not_started',runtime:'not_started',resources:'not_started',inputs:'not_started',metadata:'not_started'}; result.errors=[];
  let dir,server,browser,context,cdp,runtime,page,adapter,remote,cdpStarted=false,canvasStarted=false; const captured=[]; let pending=Promise.resolve();
  const fail=(phase,error)=>{const message=error.message||String(error);result.phases[phase]='failed';result.errors.push({phase,error:message});result.error??=message;result.status='failed';};
  const finalize=async(phase,fn)=>{try{await fn();result.phases[phase]='complete';}catch(error){fail(phase,error);}};
  if (mode==='capture') { await mkdir(out,{recursive:true}); dir=path.resolve(out,`${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID()}`); await mkdir(dir); await mkdir(path.join(dir,'frames'));  }
  try {
    runtime=runtimeSource(c);
    if(c.publicOrigin){remote={origin:c.publicOrigin,build:await publicBuild(runtime,c.runtime.buildOutput),jobs:[],responses:[],errors:[],network:{requests:[],blocked:[],webSockets:[],pageErrors:[],serviceWorkers:'blocked'}};result.publicBuild={directory:remote.build.directory,files:remote.build.files,sha256:remote.build.sha256,verification:'incomplete'};}
    await recordInputs(result,c,runtime);
    result.git={sha:command('git',['rev-parse','HEAD']).trim(),tree:command('git',['rev-parse','HEAD^{tree}']).trim(),status:command('git',['status','--porcelain']).trim()};
    adapter=await import(pathToFileURL(inRoot(c.adapter)).href+'?v='+Date.now());
    if (typeof adapter.prepare!=='function' || typeof adapter.observe!=='function') throw Error('adapter requires prepare and observe');
    if(!remote)server=await serve(runtime); const pw=await playwright(); browser=await pw.chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:headless ?? mode!=='observe'});
    const viewport={width:c.viewport.width,height:c.viewport.height};
    context=await browser.newContext({viewport,deviceScaleFactor:c.viewport.dpr,...(remote?{serviceWorkers:'block'}:{})});
    page=await context.newPage();
    if (adapter.beforeNavigate !== undefined) { if (typeof adapter.beforeNavigate !== 'function') throw Error('beforeNavigate must be a function'); await adapter.beforeNavigate(page,c); }
    if(remote){await isolatePublicPage(page,remote);page.on('response',response=>collectPublicResponse(response,remote,runtime));}
    await page.goto(remote?remote.origin+'/':`http://127.0.0.1:${server.address().port}/${c.source.split('/').map(encodeURIComponent).join('/')}`);
    await adapter.prepare(page,c);
    if (dir && c.recordCanvas) {
      result.canvasCaptureStartEpochMs=await page.evaluate(selector=>{
        const canvas=document.querySelector(selector); if(!canvas || typeof canvas.captureStream!=='function') throw Error('recordCanvas requires a canvas with captureStream');
        const stream=canvas.captureStream(), recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'}), chunks=[];
        window.__workbenchRecording={stream,recorder,chunks}; recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)}; recorder.start(); return performance.timeOrigin+performance.now();
      },c.recordCanvas); canvasStarted=true;
    }
    if (dir) {
      cdp=await context.newCDPSession(page); await cdp.send('Page.enable');
      cdp.on('Page.screencastFrame', frame=> {
        const index=captured.length, name=`frames/${String(index).padStart(5,'0')}.png`;
        const entry={index,path:name,timestamp:frame.metadata?.timestamp??null,metadata:frame.metadata??null,receivedAtEpochMs:Date.now(),receivedAtMonotonicMs:performance.now(),deviceWidth:frame.metadata?.deviceWidth,deviceHeight:frame.metadata?.deviceHeight}; captured.push(entry);
        pending=pending.then(()=>writeFile(path.join(dir,name),Buffer.from(frame.data,'base64')));
        cdp.send('Page.screencastFrameAck',{sessionId:frame.sessionId}).catch(()=>{});
      });
      await cdp.send('Page.startScreencast',{format:'png',maxWidth:viewport.width,maxHeight:viewport.height,everyNthFrame:1}); cdpStarted=true;
    }
    const start=Date.now();
    do { result.samples.push(await adapter.observe(page,c)); await page.waitForTimeout(c.sampleMs); } while(Date.now()-start<(observeDurationMs ?? c.durationMs));
    const observed=result.samples;
    if (!observed.length || observed.some(s=>s.viewport?.width!==viewport.width || s.viewport?.height!==viewport.height || s.dpr!==c.viewport.dpr)) throw Error('observed viewport or DPR differs from requested');
    if (observed[0].events?.some(e=>e.type===c.expectedEvent) || !observed.slice(1).some(s=>s.events?.some(e=>e.type===c.expectedEvent && Number.isFinite(e.at) && e.at>=observed[0].gameTime && e.at<=s.gameTime))) throw Error('expected event not observed during case');
    if (observed.some(s=>!Number.isFinite(s.wallTime)||!Number.isFinite(s.epochMs)||!Number.isFinite(s.gameTime)||!s.canvas||s.pose==null||s.hp==null)) throw Error('required observed state missing');
    result.observation={durationMs:observed.at(-1).epochMs-observed[0].epochMs,firstEpochMs:observed[0].epochMs,lastEpochMs:observed.at(-1).epochMs,firstGameTime:observed[0].gameTime,lastGameTime:observed.at(-1).gameTime,events:observed.flatMap((sample,index)=>(sample.events||[]).map(event=>({event,sampleIndex:index,epochMs:sample.epochMs,gameTime:sample.gameTime})))};
    result.phases.observation='complete';
  } catch(e) { fail('observation',e); }
  finally {
    if(cdpStarted) await finalize('cdp',async()=>{
      await cdp.send('Page.stopScreencast'); await pending;
      const anomalies=[...timestampAnomalies(captured),...additionalCdpAnomalies(captured)]; if(captured.length<2 || anomalies.length) { result.captureDebug={count:captured.length,anomalies,metadataPath:'cdp-frames.json'}; throw Error('missing or unordered original CDP timestamps: '+JSON.stringify(anomalies.slice(0,10))); }
      const origin=captured[0].timestamp,pts=captured.map(f=>f.timestamp-origin);
      const selected=selectFrames(pts,c.extractIntervalMs/1000).map(f=>({...f,path:captured[f.index].path}));
      const gaps=pts.slice(1).map((t,i)=>t-pts[i]); if(c.maxGapMs!==undefined && gaps.some(g=>g*1000>c.maxGapMs)) throw Error('requested maximum gap exceeded');
      for(const frame of captured){const bytes=await readFile(path.join(dir,frame.path));const size=pngSize(bytes);if(size.width!==c.viewport.width||size.height!==c.viewport.height)throw Error('captured frame size differs from CSS viewport');Object.assign(frame,{format:'png',width:size.width,height:size.height,sha256:sha(bytes)});}
      result.capture={kind:'cdp-screencast',clock:'CDP metadata.timestamp (seconds since epoch)',origin,frames:captured,selected,observedCadence:{count:captured.length,durationSeconds:pts.at(-1),meanDeliveredFps:pts.at(-1)>0?(pts.length-1)/pts.at(-1):null,maxGapMs:gaps.length?Math.max(...gaps)*1000:null,gapsSeconds:gaps},limitations:'CDP delivers browser frames opportunistically; timestamps describe delivered frames, not every display presentation. No continuous video or perceptual fluency is claimed.'};
      result.selectedFrames=selected;
    });
    if(canvasStarted) await finalize('canvas',async()=>{
      const b64=await page.evaluate(async()=>{const v=window.__workbenchRecording;await new Promise(resolve=>{v.recorder.onstop=resolve;v.recorder.stop()});v.stream.getTracks().forEach(t=>t.stop());const data=new Uint8Array(await new Blob(v.chunks,{type:'video/webm'}).arrayBuffer());let binary='';for(let i=0;i<data.length;i+=8192)binary+=String.fromCharCode(...data.subarray(i,i+8192));return btoa(binary);});
      const bytes=Buffer.from(b64,'base64'),file=path.join(dir,'canvas.webm');await writeFile(file,bytes);result.canvasVideo={path:'canvas.webm',sha256:sha(bytes),verification:'incomplete'};
      const probe=JSON.parse(command(process.env.FFPROBE||'ffprobe',['-v','error','-select_streams','v:0','-show_streams','-show_frames','-show_entries','stream=width,height,avg_frame_rate,r_frame_rate,duration:frame=best_effort_timestamp_time','-of','json',file]));
      const timestamps=(probe.frames||[]).map(f=>Number(f.best_effort_timestamp_time));
      if(!timestamps.length||timestamps.some((v,i)=>!Number.isFinite(v)||(i&&v<timestamps[i-1])))throw Error('missing or unordered canvas video PTS');
      result.canvasVideo={...result.canvasVideo,verification:'complete',stream:probe.streams?.[0],pts:timestamps,limitations:'Canvas only, MediaRecorder timestamps; cadence and capture loss depend on browser. This is not full DOM context.'};
    });
    if(remote&&page)await finalize('publicNetwork',()=>finishPublicPage(page,remote));
    if(context) await finalize('contextClose',()=>context.close());
    if(browser) await finalize('browserClose',()=>browser.close());
    if(remote)await finalize('publicResponses',async()=>{
      await drainResponses(remote.jobs);result.publicNetwork=structuredClone(remote.network);result.publicResponses=remote.responses.slice();result.publicResponseErrors=remote.errors.slice();
      if(remote.errors.length||remote.network.pageErrors.length||remote.network.blocked.length||remote.network.webSockets.length)throw Error([...remote.errors,'public response/network verification failed'].join('; '));
    });
    if(server) await finalize('serverClose',()=>new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve())));
    if(runtime) {
      const inventory=[...runtime.served.values()].sort((a,b)=>a.path.localeCompare(b.path));
      result.runtime={root:runtime.cwd,sha:runtime.sha,tree:runtime.tree,servedFiles:inventory,identityVerification:'incomplete',resourceVerification:'incomplete'};
      await finalize('runtime',async()=>{const current=runtimeSource(c);result.runtime.status=current.status;result.runtime.identityVerification='complete';});
      await finalize('resources',async()=>{
        if(remote){const current=await publicBuild(runtime,c.runtime.buildOutput);result.publicBuild.finalSha256=current.sha256;if(current.sha256!==remote.build.sha256)throw Error('Build Output changed during run');if(remote.errors.length||result.phases.publicNetwork!=='complete'||result.phases.publicResponses!=='complete')throw Error('public response/network finalization incomplete');if(!['dist/index.html','dist/app.js','dist/render.js','dist/engine.js'].every(file=>inventory.some(entry=>entry.path===file)))throw Error('core public resource inventory incomplete');result.publicBuild.verification='complete';}
        const changed=[];for(const entry of inventory){try{entry.finalSha256=sha(await readFile(path.join(runtime.cwd,entry.path)));if(entry.finalSha256!==entry.sha256)changed.push(entry.path);}catch{entry.finalSha256=null;changed.push(entry.path);}}
        result.runtime.changedFiles=changed;result.runtime.servingErrors=runtime.errors.slice();
        if(changed.length || runtime.errors.length)throw Error(['runtime changed during run: '+changed.join(', '),...runtime.errors].join('; '));
        if(result.phases.observation!=='complete' || !inventory.some(entry=>entry.path===c.source)) throw Error('resource inventory incomplete: navigation or observation did not complete');
        result.runtime.resourceVerification='complete';
      });
    }
    await finalize('inputs',()=>rehashInputs(result,c,runtime));
    if(dir && cdpStarted) await finalize('metadata',async()=>{await pending;await writeFile(path.join(dir,'cdp-frames.json'),JSON.stringify({clock:'CDP metadata.timestamp; receipt clocks are diagnostics only, not presentation time',frames:captured},null,2));});
    if(dir && !result.error && result.phases.cdp==='complete') await finalize('viewer',()=>writeFile(path.join(dir,'index.html'),viewer(c,result.selectedFrames,result)));
    if(!result.error) result.status='complete';
    if(dir) await writeFile(path.join(dir,'run.json'),JSON.stringify(result,null,2));
  }
  if(result.status!=='complete') throw Object.assign(Error(result.error),{runDirectory:dir});
  return {directory:dir,result};
}
if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if(process.argv[2]==='--help'){ console.log('capture|observe case.json [--out directory] [--duration-ms milliseconds for observe] — local by default; publicOrigin requires an explicit HTTPS origin and frozen runtime SHA/tree/buildOutput. CDP timestamps, no perceptual verdict. Adapter exports optional beforeNavigate(page,case), prepare(page,case), observe(page,case). Each observation.events entry is {event, sampleIndex, epochMs, gameTime}; repeated accumulated events are not deduplicated. See tools/review/BASELINE.md. Playwright, Edge and optional canvas ffprobe required.'); process.exit(0); }
    const [mode,file,...args]=process.argv.slice(2); if(!['capture','observe'].includes(mode)||!file||args.length%2) throw Error('usage: capture|observe case.json [--out directory] [--duration-ms milliseconds]');
    let out,observeDurationMs; const seen=new Set();
    for(let i=0;i<args.length;i+=2){const flag=args[i],value=args[i+1];if(seen.has(flag)||!value) throw Error('duplicate or missing option');seen.add(flag);if(flag==='--out')out=value;else if(flag==='--duration-ms')observeDurationMs=Number(value);else throw Error('unknown option: '+flag);}
    const c=JSON.parse(await readFile(file,'utf8')); const r=await runCase(c,{mode,out,observeDurationMs}); console.log(JSON.stringify({status:r.result.status,directory:r.directory,observation:r.result.observation},null,2));
  }
  catch(e) {console.error(e.message, e.runDirectory||'');process.exitCode=1;}
}
