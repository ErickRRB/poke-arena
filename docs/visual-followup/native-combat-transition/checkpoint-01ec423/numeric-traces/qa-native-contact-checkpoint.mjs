import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..'),option=(name,fallback)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3)||fallback;
const directory=path.resolve(root,option('inventory','docs/visual-followup/native-combat-transition/checkpoint-01ec423'));
const inventory=JSON.parse(await readFile(path.join(directory,'inventory-provisional.json'),'utf8'));
const inputs=JSON.parse(await readFile(path.join(directory,'frozen-inputs.json'),'utf8'));
const group=id=>inventory.qaGroups.find(g=>g.id===id).keys;
const keys=[...new Set([...group('P1-contact-clock'),...group('P1-emitter-delivery')])];
const frozenDist=path.join(inputs.candidate.sourceDirectory,'dist');
for(const input of inventory.candidate.inputs)assert.equal(createHash('sha256').update(await readFile(path.join(inputs.candidate.sourceDirectory,input.file))).digest('hex'),input.sha256,input.file);
const metadata=JSON.parse(await readFile(path.join(frozenDist,'assets/pokemon/manifest.json'),'utf8'));
const engineReferences=[];
for(const file of ['render.js','snapshot.js','online-wire.js','spell-preview.js']){const source=await readFile(path.join(frozenDist,file),'utf8');const reference=source.match(/from\s*['"](.\/engine\.js[^'"]*)['"]/)?.[1];assert(reference,`Missing canonical engine import in ${file}`);engineReferences.push({file,reference});}
assert.equal(new Set(engineReferences.map(r=>r.reference)).size,1,'The tested runtime graph mixes engine URLs; fix the checkpoint instead of calibrating this probe');
const engineSpecifier=engineReferences[0].reference.slice(1);
globalThis.__nativeContactConfig={moduleBase:pathToFileURL(frozenDist).href,engineSpecifier,metadata,keys};
const harness=await import('./qa-native-contact-harness.mjs');await harness.ready;
const output=path.join(directory,'numeric-traces');await mkdir(output,{recursive:true});
const summaries=[],findings=[];const directions=option('directions','north')==='all'?[0,1,2,3,4,5,6,7]:[4];
const selected=option('keys','')?option('keys','').split(','):keys;
for(const key of [...selected,'tower-52','tower-31','tower-34']){
  const traces=[];
  for(const mode of ['local30','local60','public15'])for(const direction of directions)for(const trigger of ['automatic','direct']){
    const result=harness.run(key,mode,direction,trigger);traces.push(result);
    const mismatches=result.releases.filter(r=>!r.frameMatches&&!r.retiredAtRelease);
    const summary={key,mode,direction,trigger,starts:result.starts.length,releases:result.releases.length,damageEvents:result.damages.length,leaps:result.leaps.length,clockRewinds:result.clockRewinds,intervals:result.intervals,
      frameMismatches:mismatches.map(r=>({at:r.at,seq:r.seq,shot:r.shot,expected:r.expectedFrame,shown:r.rendered?.frame,animation:r.rendered?.animation,sameTickNextStart:r.sameTickNextStart})),retiredReleases:result.releases.filter(r=>r.retiredAtRelease).length,recoveries:result.recoveries};
    summaries.push(summary);
    if(mismatches.length||result.clockRewinds||!result.releases.length)findings.push(summary);
  }
  await writeFile(path.join(output,`${key}.json.gz`),gzipSync(JSON.stringify(traces)));
  console.log(`${key}: ${traces.length} traces; ${traces.reduce((sum,r)=>sum+r.releases.length,0)} releases; ${traces.reduce((sum,r)=>sum+r.releases.filter(x=>!x.frameMatches&&!x.retiredAtRelease).length,0)} frame-index differences`);
}
const report={status:'numeric_real_engine_and_renderer_pose_selection_not_browser_raster_validation',generatedAt:new Date().toISOString(),candidateCommit:inventory.candidate.gitHead,sourceHashes:inventory.candidate.inputs,keys:selected,directions,
  scope:'Real Game automatic sustained three starts and direct single attack; local engine 30/60 Hz, publicSnapshot/publicEvent/unpackEvent 15 Hz over engine 30 Hz; Renderer.visualActor 60 Hz. Passive resistant structure target, no AI or other towers, companions isolated. No network jitter, camera or scale validation.',
  harnessSha256:createHash('sha256').update(await readFile(new URL('./qa-native-contact-harness.mjs',import.meta.url))).digest('hex'),cases:summaries,frameIndexDifferencesNeedRasterReview:findings};
report.engineImportAudit={engineSpecifier,engineReferences};
await writeFile(path.join(directory,'numeric-summary.json'),JSON.stringify(report,null,2)+'\n');
await writeFile(path.join(output,'qa-native-contact-harness.mjs'),await readFile(new URL('./qa-native-contact-harness.mjs',import.meta.url)));await writeFile(path.join(output,'qa-native-contact-checkpoint.mjs'),await readFile(new URL(import.meta.url)));
console.log(JSON.stringify({cases:summaries.length,releases:summaries.reduce((s,r)=>s+r.releases,0),differenceCases:findings.length,output:path.relative(root,output)}));
