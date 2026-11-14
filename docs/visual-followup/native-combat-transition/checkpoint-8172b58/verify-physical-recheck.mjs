import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const directory=import.meta.dirname,root=path.resolve(directory,'../../../..');
const report=JSON.parse(await readFile(path.join(directory,'physical-recheck/summary.json'),'utf8'));
const inputs=JSON.parse(await readFile(path.join(directory,'frozen-inputs.json'),'utf8'));
assert.equal(report.candidateCommit,'8172b584dbf10acb7d663ba12371e10cda2c6e39');
assert.deepEqual(report.engineImportAudit.requestedEngineURLs,['/frozen/engine.js?v=26']);
assert.deepEqual(report.pageErrors,[]);
const paths=execFileSync('git',['ls-tree','-r',report.candidateCommit,'dist'],{cwd:root,encoding:'utf8',windowsHide:true}).trim().split(/\r?\n/);
const objects=new Map(paths.map(line=>{const [header,file]=line.split('\t');return[file,header.split(' ')[2]];}));
const normalized=[];
for(const file of report.servedFiles){
  const bytes=await readFile(path.join(inputs.candidate.sourceDirectory,file.file));assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);
  const blob=data=>createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
  if(blob(bytes)!==objects.get(file.file)){assert(/\.(js|mjs|json|html|css|svg|xml|txt)$/.test(file.file));assert.equal(blob(Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n'))),objects.get(file.file));normalized.push(file.file);}
}
const cases=[];
for(const key of ['beedrill','treecko']){
  const traces=JSON.parse(gunzipSync(await readFile(path.join(directory,'physical-recheck/traces',key+'.json.gz'))));
  assert.equal(traces.length,8);assert.deepEqual(traces.map(t=>t.direction).sort(),[0,1,2,3,4,5,6,7]);
  for(const trace of traces){
    assert.equal(trace.mode,'local30');assert.equal(trace.trigger,'direct');assert.equal(trace.releases.length,1);
    const release=trace.releases[0],frame=trace.frames[release.rendered.index],p=frame.projectiles[0],draw=frame.projectileDraws[0],marker=frame.drawMarker.expected;
    assert(p.groundPath&&draw&&frame.drawMarker.available);assert(frame.drawMarker.error<=1.01);assert.equal(release.rasterMatches,true);
    const progress=p.travelled/p.totalDistance;
    const storedTrajectory={x:p.x+p.liftX*(1-progress),y:p.y+p.liftY*(1-progress)+p.endLiftY*progress-Math.sin(progress*Math.PI)*(p.arc||0)};
    const actualMatchesStoredLaunchError=Math.hypot(draw.x-storedTrajectory.x,draw.y-storedTrajectory.y);assert(actualMatchesStoredLaunchError<1e-5);
    const contactTrajectory={x:storedTrajectory.x+(marker.x-p.launch.x)*(1-progress),y:storedTrajectory.y+(marker.y-p.launch.y)*(1-progress)};
    cases.push({key,direction:trace.direction,releaseAt:release.at,windup:trace.profile.windup,sourcePose:release.sourcePose,drawnPose:{animation:frame.animation,frame:frame.frame,direction:frame.direction},
      engineFrom:release.from,storedLaunch:p.launch,drawnMarker:marker,visualEmission:frame.drawMarker.actual,drawMarkerRoundingError:frame.drawMarker.error,
      launchToDrawnMarkerError:Math.hypot(p.launch.x-marker.x,p.launch.y-marker.y),actualProjectileCenter:draw,actualMatchesStoredLaunchError,storedTrajectory,
      contactMarkerTrajectory:contactTrajectory,residualAtFirstDraw:Math.hypot(draw.x-contactTrajectory.x,draw.y-contactTrajectory.y),progress,
      source:release.source,sheet:`physical-recheck/contacts/${key}-local30-${trace.direction}-direct-viewer0.png`});
  }
}
const verification={status:'physical_launch_mismatch_persists',checkpoint:report.candidateCommit,sourceWorkingTreeUsed:false,scope:'Only Treecko and Beedrill, local30, eight directions, direct real Game.attack, passive resistant target60wu away, actual Renderer.sprite/projectile and native marker from drawImage destination. No balance edits, camera, other cards or online QA.',
  engineImportAudit:report.engineImportAudit,sourceHashes:report.sourceHashes,gitExport:inputs.candidate.checkpoint,servedGitObjectsVerified:report.servedFiles.length,gitExportCRLFTextFiles:normalized,
  cases:16,releases:16,visualContactRasterDifferences:report.cases.reduce((s,c)=>s+c.missingContactRasters.length,0),visualMarkerFindings:report.cases.reduce((s,c)=>s+c.markerFindings.length,0),
  byKey:Object.fromEntries(['beedrill','treecko'].map(key=>{const measured=cases.filter(c=>c.key===key);return[key,{directions:measured.length,minLaunchError:Math.min(...measured.map(c=>c.launchToDrawnMarkerError)),maxLaunchError:Math.max(...measured.map(c=>c.launchToDrawnMarkerError)),allFirstCentersMatchStoredLaunch:measured.every(c=>c.actualMatchesStoredLaunchError<1e-5)}];})),
  measurements:cases,method:'All numbers are newly measured on8172b58. Native contact and marker come from the current drawn frame, not old expected coordinates. The contact-marker trajectory is a counterfactual comparison; the stored trajectory is independently checked against the real Renderer projectile center.'};
await writeFile(path.join(directory,'physical-verification.json'),JSON.stringify(verification,null,2)+'\n');
console.log(JSON.stringify({status:verification.status,checkpoint:verification.checkpoint,engineURL:report.engineImportAudit.requestedEngineURLs,cases:16,byKey:verification.byKey,sourceObjects:verification.servedGitObjectsVerified},null,2));
