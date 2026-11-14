import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const directory=import.meta.dirname,root=path.resolve(directory,'../../../..');
const report=JSON.parse(await readFile(path.join(directory,'cloyster/summary.json'),'utf8'));
const inputs=JSON.parse(await readFile(path.join(directory,'frozen-inputs.json'),'utf8'));
const cards=JSON.parse(await readFile(path.join(directory,'cards-main-working-tree.json'),'utf8')),card=cards.cloyster;
const traces=JSON.parse(gunzipSync(await readFile(path.join(directory,'cloyster/traces/cloyster.json.gz'))));
assert.equal(report.candidateCommit,'d7e379cb2aa37839708b664793557c82de85b1c0');
assert.deepEqual(report.engineImportAudit.requestedEngineURLs,['/frozen/engine.js?v=26']);
assert.deepEqual(report.pageErrors,[]);assert.equal(report.findings.length,0);assert.equal(traces.length,48);
assert.equal(card.damage,210);assert.equal(card.interval,1.6);assert.equal(card.burst,1);
let releases=0,damages=0,recoveries=0,intervals=0,markerError=0,physicalError=0;
for(const mode of ['local30','local60','public15'])for(const trigger of ['automatic','direct'])assert.deepEqual(traces.filter(t=>t.mode===mode&&t.trigger===trigger).map(t=>t.direction).sort(),[0,1,2,3,4,5,6,7]);
for(const trace of traces){
  const expected=trace.trigger==='automatic'?3:1;assert.equal(trace.starts.length,expected);assert.equal(trace.releases.length,expected);assert.equal(trace.damages.length,expected);assert.equal(trace.clockRewinds,0);
  for(const start of trace.starts){assert.equal(start.windup,card.windup);assert.equal(start.duration,card.attackDuration);}
  for(const release of trace.releases){assert.equal(release.shot,0);assert.equal(release.rasterMatches,true);assert.equal(release.drawMarker.available,true);assert(release.drawMarker.error<=1.01);assert(release.engineToVisualSourceError<=1.01);assert(release.at>=release.expectedAt-1e-6);assert(release.at<release.expectedAt+(trace.mode==='local60'?1/60:1/30)+1e-6);markerError=Math.max(markerError,release.drawMarker.error);physicalError=Math.max(physicalError,release.engineToVisualSourceError);releases++;}
  for(const damage of trace.damages){assert.equal(damage.amount,210);damages++;}
  for(const recovery of trace.recoveries){assert.equal(recovery.observed,true);assert.equal(recovery.replacedBeforeRest,false);recoveries++;}
  for(const interval of trace.intervals){assert(Math.abs(interval-1.6)<1e-6);intervals++;}
}
const control=JSON.parse(await readFile(path.join(directory,'south-control/summary.json'),'utf8'));assert.equal(control.candidateCommit,report.candidateCommit);assert.equal(control.cases.length,1);assert.equal(control.cases[0].direction,0);assert.equal(control.findings.length,0);
const tree=execFileSync('git',['ls-tree','-r',report.candidateCommit,'dist'],{cwd:root,encoding:'utf8',windowsHide:true}).trim().split(/\r?\n/),objects=new Map(tree.map(line=>{const [header,file]=line.split('\t');return[file,header.split(' ')[2]];}));let normalizedTextFiles=0;
for(const file of report.servedFiles){const bytes=await readFile(path.join(inputs.candidate.sourceDirectory,file.file));assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);const blob=data=>createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');if(blob(bytes)!==objects.get(file.file)){assert(/\.(js|mjs|json|html|css|svg|xml|txt)$/.test(file.file));assert.equal(blob(Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n'))),objects.get(file.file));normalizedTextFiles++;}}
const verification={status:'cloyster_native_mode_verified',checkpoint:report.candidateCommit,sourceWorkingTreeUsed:false,scope:'Cloyster only, eight views, direct single attack and automatic three cycles; local30/local60/publicSnapshot15 with Renderer60, viewer0. No balance calibration, other-card, camera or scale QA.',
  contract:{damage:card.damage,interval:card.interval,burst:card.burst,animation:card.attackAnim,windup:card.windup,attackDuration:card.attackDuration},cases:48,releases,damageEvents:damages,observedFinalAndIntermediateRecoveries:recoveries,cadenceComparisons:intervals,
  contactRasterDifferences:0,markerFailures:0,releaseClockFailures:0,clockRewinds:0,maxDrawnMarkerRoundingError:markerError,maxEventToVisualEmitterError:physicalError,
  engineImportAudit:report.engineImportAudit,servedGitObjectsVerified:report.servedFiles.length,gitExportCRLFTextFiles:normalizedTextFiles,
  control:{cases:1,releases:control.cases[0].releases,mode:'public15',direction:0,trigger:'automatic',png:'south-control/contacts/cloyster-public15-0-automatic-viewer0.png'},
  fixtureNotes:'The single south control uses an adapted runner copy saved here; only its root resolution and fixed direction0 differ. Prior scripts and product source remain unchanged. All data and labels identify d7e379c directly.'};
await writeFile(path.join(directory,'verification.json'),JSON.stringify(verification,null,2)+'\n');console.log(JSON.stringify(verification,null,2));
