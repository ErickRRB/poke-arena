import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..'),directory=path.join(root,'docs/visual-followup/native-combat-transition/checkpoint-01ec423');
const browser=JSON.parse(await readFile(path.join(directory,'browser/summary.json'),'utf8'));
const input=JSON.parse(await readFile(path.join(directory,'frozen-inputs.json'),'utf8'));
const paths=execFileSync('git',['ls-tree','-r',input.candidate.gitHead,'dist'],{cwd:root,encoding:'utf8',windowsHide:true}).trim().split(/\r?\n/);
const objects=new Map(paths.map(line=>{const [header,file]=line.split('\t');return[file,header.split(' ')[2]];}));
const normalizedTextFiles=[];
for(const file of browser.servedFiles){
  const bytes=await readFile(path.join(input.candidate.sourceDirectory,file.file)),blobHash=value=>createHash('sha1').update(`blob ${value.length}\0`).update(value).digest('hex');
  if(blobHash(bytes)!==objects.get(file.file)){
    assert(/\.(js|mjs|json|html|css|svg|xml|txt)$/.test(file.file),'Binary asset changed after the Git export: '+file.file);
    const canonical=Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n'));
    assert.equal(blobHash(canonical),objects.get(file.file),'Change beyond Git-export line endings: '+file.file);normalizedTextFiles.push(file.file);
  }
}
const affected=[...new Set(browser.cases.filter(c=>c.missingContactRasters.length).map(c=>c.key))].sort();
await writeFile(path.join(directory,'affected-contact-keys.json'),JSON.stringify({checkpoint:browser.candidateCommit,keys:affected,selector:affected.join(','),reason:'Actual native RGBA differs at public attackRelease delivery; local30/local60 contact raster checks passed.'},null,2)+'\n');
let cadenceComparisons=0,cadenceFailures=[],startProfileFailures=[],firstOrFinalRecoveryFailures=[];
for(const file of await readdir(path.join(directory,'browser/traces'))){
  const traces=JSON.parse(gunzipSync(await readFile(path.join(directory,'browser/traces',file))));
  for(const trace of traces){
    const dt=trace.mode==='local60'?1/60:1/30;
    for(const interval of trace.intervals){cadenceComparisons++;if(Math.abs(interval-trace.profile.interval)>dt+1e-6)cadenceFailures.push({key:trace.key,mode:trace.mode,direction:trace.direction,interval,expected:trace.profile.interval});}
    for(const start of trace.starts)if(Math.abs(start.windup-trace.profile.windup)>1e-7||Math.abs(start.duration-trace.profile.duration)>1e-7)startProfileFailures.push({key:trace.key,mode:trace.mode,direction:trace.direction,start,profile:trace.profile});
    if(trace.releases.some(r=>!r.retiredAtRelease)&&trace.recoveries.length&&!trace.recoveries.at(-1).observed)firstOrFinalRecoveryFailures.push({key:trace.key,mode:trace.mode,direction:trace.direction});
  }
}
const physical=[];
for(const key of ['beedrill','treecko']){
  const traces=JSON.parse(gunzipSync(await readFile(path.join(directory,'repro-flight-source/traces',key+'.json.gz'))));
  for(const trace of traces){
    const release=trace.releases[0],frame=trace.frames[release.rendered.index],p=frame.projectiles[0],draw=frame.projectileDraws[0],marker=frame.drawMarker.expected;
    assert(p.groundPath&&frame.drawMarker.available&&draw,'The physical proof needs a visible real projectile and native draw destination');
    const progress=p.travelled/p.totalDistance;
    const fromStoredLaunch={x:p.x+p.liftX*(1-progress),y:p.y+p.liftY*(1-progress)+p.endLiftY*progress-Math.sin(progress*Math.PI)*(p.arc||0)};
    const fromDrawnMarker={x:fromStoredLaunch.x+(marker.x-p.launch.x)*(1-progress),y:fromStoredLaunch.y+(marker.y-p.launch.y)*(1-progress)};
    const actualError=Math.hypot(draw.x-fromStoredLaunch.x,draw.y-fromStoredLaunch.y);
    assert(actualError<1e-5,'Actual Renderer projectile center must agree with its stored launch, not a hypothetical path');
    physical.push({key,direction:trace.direction,trigger:trace.trigger,mode:trace.mode,releaseAt:release.at,sourcePose:release.sourcePose,drawnPose:{animation:frame.animation,frame:frame.frame,direction:frame.direction},
      engineFrom:release.from,storedLaunch:p.launch,drawnMarker:marker,visualEmission:frame.drawMarker.actual,drawMarkerRoundingError:frame.drawMarker.error,
      launchToDrawnMarkerError:Math.hypot(p.launch.x-marker.x,p.launch.y-marker.y),actualProjectileCenter:draw,fromStoredLaunch,actualMatchesStoredLaunchError:actualError,
      hypotheticalCenterFromDrawnMarker:fromDrawnMarker,residualAtFirstDraw:Math.hypot(draw.x-fromDrawnMarker.x,draw.y-fromDrawnMarker.y),progress,
      sheet:`repro-flight-source/contacts/${key}-${trace.mode}-${trace.direction}-${trace.trigger}-viewer0.png`});
  }
}
await writeFile(path.join(directory,'physical-launch-evidence.json'),JSON.stringify({status:'confirmed_stored_projectile_launch_uses_previous_native_pose',checkpoint:browser.candidateCommit,scope:'Two explicit ranged cards, all eight directions, real Game direct attack at30Hz + real Renderer.sprite/projectile. Resistant passive target60wu away keeps the projectile visible. Yellow: native marker of actual drawn contact; cyan: stored projectile launch; red: actual projectile center. The counterfactual from the current contact marker is explanatory only.',cases:physical},null,2)+'\n');
const summary={checkpoint:browser.candidateCommit,sourceWorkingTreeUsed:false,servedGitObjectsVerified:browser.servedFiles.length,gitExportCRLFTextFiles:normalizedTextFiles,
  cases:browser.cases.length,releases:browser.cases.reduce((s,c)=>s+c.releases,0),contactRasterDifferenceEvents:browser.cases.reduce((s,c)=>s+c.missingContactRasters.length,0),contactRasterAffectedKeys:affected,
  rasterDifferencesByMode:Object.fromEntries(['local30','local60','public15'].map(mode=>[mode,browser.cases.filter(c=>c.mode===mode).reduce((s,c)=>s+c.missingContactRasters.length,0)])),
  markerDifferenceEvents:browser.cases.reduce((s,c)=>s+c.markerFindings.length,0),markerAffectedKeys:[...new Set(browser.cases.filter(c=>c.markerFindings.length).map(c=>c.key))],
  earlyReleases:browser.cases.reduce((s,c)=>s+c.earlyReleases,0),lateReleases:browser.cases.reduce((s,c)=>s+c.lateReleases,0),clockRewinds:browser.cases.reduce((s,c)=>s+c.clockRewinds,0),cadenceComparisons,cadenceFailures,startProfileFailures,firstOrFinalRecoveryFailures,
  physicalLaunchCases:physical.length,physicalSourceErrorsByKey:Object.fromEntries(['beedrill','treecko'].map(key=>{const cases=physical.filter(p=>p.key===key);return[key,{directions:cases.length,min:Math.min(...cases.map(p=>p.launchToDrawnMarkerError)),max:Math.max(...cases.map(p=>p.launchToDrawnMarkerError)),allActualProjectilesUseStoredLaunch:cases.every(p=>p.actualMatchesStoredLaunchError<1e-5)}]})),pageErrors:browser.pageErrors};
await writeFile(path.join(directory,'analysis-summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
