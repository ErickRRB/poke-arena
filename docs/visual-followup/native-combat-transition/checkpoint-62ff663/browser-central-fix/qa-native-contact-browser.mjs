import assert from 'node:assert/strict';
import path from 'node:path';
import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';

const root=path.resolve(import.meta.dirname,'..'),argument=(name,fallback)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3)||fallback;
const directory=path.resolve(root,argument('inventory','docs/visual-followup/native-combat-transition/checkpoint-01ec423'));
const inventory=JSON.parse(await readFile(path.join(directory,'inventory-provisional.json'),'utf8'));
const inputs=JSON.parse(await readFile(path.join(directory,'frozen-inputs.json'),'utf8'));
const frozenDist=path.join(inputs.candidate.sourceDirectory,'dist'),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const input of inventory.candidate.inputs)assert.equal(hash(await readFile(path.join(inputs.candidate.sourceDirectory,input.file))),input.sha256,input.file);
const group=id=>inventory.qaGroups.find(g=>g.id===id).keys;
const allKeys=[...new Set([...group('P1-contact-clock'),...group('P1-emitter-delivery')])];
const selected=argument('keys','')?argument('keys','').split(','):allKeys;
const emitterKeys=new Set(group('P1-emitter-delivery')),allDirections=argument('directions','north');
const modes=argument('modes','local30,local60,public15').split(','),triggers=argument('triggers','automatic,direct').split(','),teams=argument('team','0')==='both'?[0,1]:[Number(argument('team','0'))],capture=argument('capture','0')==='1';
const output=path.join(directory,argument('name','browser'));await mkdir(path.join(output,'traces'),{recursive:true});await mkdir(path.join(output,'contacts'),{recursive:true});
const harness=await readFile(path.join(root,'scripts/qa-native-contact-harness.mjs'));
const config={moduleBase:'/frozen',keys:allKeys};
const served=new Map(),cache=new Map(),mime={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp'};
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}canvas{width:320px;height:240px;image-rendering:pixelated}</style><canvas width="320" height="240"></canvas><script type="module" src="/__qa/harness.mjs"></script>');return;}
    if(pathname==='/__qa/config.json'){res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(config));return;}
    if(pathname==='/__qa/harness.mjs'){res.writeHead(200,{'Content-Type':'text/javascript'}).end(harness);return;}
    const relative=pathname.replace(/^\/frozen\//,'').replace(/^\//,''),file=path.resolve(frozenDist,relative);
    if(!file.startsWith(frozenDist+path.sep)){res.writeHead(403).end();return;}
    let bytes=cache.get(file);if(!bytes){bytes=await readFile(file);cache.set(file,bytes);served.set(relative,{file:'dist/'+relative.replaceAll('\\','/'),bytes:bytes.length,sha256:hash(bytes)});}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes);
  }catch(error){res.writeHead(error.code==='ENOENT'?404:500).end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const playwrightPath=process.env.PLAYWRIGHT_MODULE||path.resolve(root,'../pokemon-arena/qa/node_modules/playwright/index.mjs');
const {chromium}=await import(pathToFileURL(playwrightPath).href);let browser;
const cases=[],findings=[],errors=[];
try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(()=>!!globalThis.__nativeContact,null,{timeout:30000});
  await page.evaluate(()=>globalThis.__nativeContact.ready);
  for(const key of [...new Set([...selected,...(argument('extra-guards','1')==='0'?[]:['tower-52','tower-31','tower-34'])])]){
    const directions=allDirections==='all'||allDirections==='emitters'&&(emitterKeys.has(key)||key.startsWith('tower-'))?[0,1,2,3,4,5,6,7]:[4],traces=[];
    for(const mode of modes)for(const direction of directions)for(const trigger of triggers)for(const team of teams){
      const fixtureOptions={team,capture,verboseSources:capture,drawProjectiles:argument('draw-projectiles','0')==='1',distance:Number(argument('distance','20'))};
      const result=await page.evaluate(async({key,mode,direction,trigger,fixtureOptions})=>{const result=globalThis.__nativeContact.run(key,mode,direction,trigger,fixtureOptions);if(fixtureOptions.capture)result.sheet=await globalThis.__nativeContact.contactSheet(result);return result;},{key,mode,direction,trigger,fixtureOptions});
      if(result.sheet){await writeFile(path.join(output,'contacts',`${key}-${mode}-${direction}-${trigger}-viewer${team}.png`),Buffer.from(result.sheet.png,'base64'));delete result.sheet.png;for(const row of result.frames)delete row.png;for(const release of result.releases)delete release.rendered.png;}
      const badRaster=result.releases.filter(r=>r.rasterMatches===false&&!r.retiredAtRelease);
      const badMarkers=result.releases.filter(r=>r.drawMarker&&(r.drawMarker.available===false||r.drawMarker.error>1.01));
      const early=result.releases.filter(r=>r.expectedAt!==null&&r.at<r.expectedAt-1e-6);
      const late=result.releases.filter(r=>r.expectedAt!==null&&r.at>=r.expectedAt+(mode==='local60'?1/60:1/30)+1e-6);
      const summary={key,mode,direction,trigger,team,starts:result.starts.length,releases:result.releases.length,damageEvents:result.damages.length,leaps:result.leaps.length,intervals:result.intervals,clockRewinds:result.clockRewinds,earlyReleases:early.length,lateReleases:late.length,
        missingContactRasters:badRaster.map(r=>({at:r.at,seq:r.seq,shot:r.shot,expected:r.expectedFrame,shown:r.rendered.frame,animation:r.rendered.animation,sameTickNextStart:r.sameTickNextStart})),
        markerFindings:badMarkers.map(r=>({at:r.at,seq:r.seq,shot:r.shot,marker:r.drawMarker})),retiredReleases:result.releases.filter(r=>r.retiredAtRelease).length,recoveries:result.recoveries,
        maximumEngineToDrawnSourceError:Math.max(0,...result.releases.map(r=>r.engineToVisualSourceError||0))};
      cases.push(summary);traces.push(result);
      if(badRaster.length||badMarkers.length||early.length||late.length||result.clockRewinds||!result.releases.length)findings.push(summary);
    }
    await writeFile(path.join(output,'traces',key+'.json.gz'),gzipSync(JSON.stringify(traces)));
    console.log(`${key}: ${traces.length} cases; ${traces.reduce((s,r)=>s+r.releases.length,0)} releases; ${traces.reduce((s,r)=>s+r.releases.filter(x=>x.rasterMatches===false&&!x.retiredAtRelease).length,0)} raster differences`);
    await writeFile(path.join(output,'progress.json'),JSON.stringify({completedKeys:key,cases:cases.length,findingCases:findings.length})+'\n');
  }
  const report={status:'real_game_and_real_renderer_sprite_numeric_and_raster_readback',generatedAt:new Date().toISOString(),candidateCommit:inventory.candidate.gitHead,gitCheckpoint:inputs.candidate.checkpoint,
    sourceHashes:inventory.candidate.inputs,servedFiles:[...served.values()],harnessSha256:hash(harness),runnerSha256:hash(await readFile(new URL(import.meta.url))),keys:selected,
    scope:'Immutable checkpoint only. Real Game automatic three starts and direct single attacks. Local engine 30/60 Hz; publicSnapshot/publicEvent/unpackEvent at 15 Hz over engine 30 Hz; Renderer.visualActor/sprite/tower/visualEmission at 60 Hz. Canvas source crop only; no whole-board camera or scale validation. Passive resistant structure target, no AI/other towers, companions isolated. Exact trimmed native RGBA equivalence filters duplicate contact drawings; actual drawImage destinations checked against native emitter geometry with 1.01 world-unit tolerance for rounding.',
    cases,findings,pageErrors:errors};
  await writeFile(path.join(output,'summary.json'),JSON.stringify(report,null,2)+'\n');
  await writeFile(path.join(output,'qa-native-contact-harness.mjs'),harness);await writeFile(path.join(output,'qa-native-contact-browser.mjs'),await readFile(new URL(import.meta.url)));
  console.log(JSON.stringify({cases:cases.length,releases:cases.reduce((s,r)=>s+r.releases,0),findingCases:findings.length,keysWithFindings:[...new Set(findings.map(f=>f.key))],pageErrors:errors,output:path.relative(root,output)}));
}catch(error){await writeFile(path.join(output,'runner-error.json'),JSON.stringify({error:String(error),pageErrors:errors},null,2)+'\n');throw error;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
