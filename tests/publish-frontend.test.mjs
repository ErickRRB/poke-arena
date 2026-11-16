import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join,resolve,relative,basename,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildRelease,prepareManifest,promoteRelease} from '../scripts/publish-frontend.mjs';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=value=>createHash('sha256').update(value).digest('hex');
const jsonHash=value=>hash(JSON.stringify(value));
const versionId='12345678-1234-1234-1234-123456789abc';
const otherVersion='87654321-1234-1234-1234-123456789abc';
const writeJson=(file,value)=>writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const readJson=file=>JSON.parse(readFileSync(file,'utf8'));

// These are explicitly synthetic quality receipts, never approvals of real code.
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'poke-publisher-test-')),source=join(root,'source');
 t.after(()=>{
  const inside=relative(tmpdir(),root);
  assert.ok(inside&&!inside.startsWith('..')&&basename(root).startsWith('poke-publisher-test-'));
  rmSync(root,{recursive:true,force:true});
 });
 const assets=join(source,'realtime/frontend/.cloudflare/output/v0/workers/default/assets');
 const bundleFile=join(source,'realtime/frontend/.cloudflare/output/v0/workers/default/bundle/index.js');
 mkdirSync(assets,{recursive:true});mkdirSync(dirname(bundleFile),{recursive:true});mkdirSync(join(source,'dist'));
 writeFileSync(join(source,'.gitignore'),'realtime/frontend/.cloudflare/\n');
 for(const file of ['index.html','app.js','render.js']){
  writeFileSync(join(assets,file),'synthetic '+file);
  writeFileSync(join(source,'dist',file),'synthetic '+file);
 }
 writeFileSync(bundleFile,'synthetic Worker bundle');
 const git=(...args)=>{
  const result=spawnSync('git',['-C',source,...args],{encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr);return result.stdout.trim();
 };
 git('init','-q');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','Synthetic frozen source');
 const candidate={sha:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}')};
 const criterion=id=>({id,requirement:'synthetic release check',category:'technical',expected:'synthetic check succeeds',coverage:'synthetic fixture',context:'synthetic frontend',required:true,evidenceKind:'technical'});
 const plan={version:'fixture-1',createdAt:'2026-01-01T00:00:00Z',request:'synthetic request',scope:'synthetic frontend',exclusions:'not real product quality',criteria:[criterion('ready'),criterion('public')]};
 const reviewFile=join(root,'review.json'),planReviewFile=join(root,'plan-review.json'),proofFile=join(root,'proof.json'),manifestFile=join(root,'release.json'),decisionFile=join(root,'root-decision.json');
 writeFileSync(join(root,'evidence.txt'),'synthetic evidence');
 const review={plan,candidate,authorship:{planAuthors:['Main'],scopeAuthors:['Main']},scope:{mode:'partial',criteria:['ready'],dependencies:[],noDependenciesReason:'synthetic independent stage',description:'synthetic prepublication only',integrationRisk:'synthetic fixture'},previousPlans:[],previousFindings:[],findings:[],records:[{id:'ready',planVersion:plan.version,planHash:jsonHash(plan),status:'pass',observedResult:'synthetic checks passed',coverage:'synthetic fixture',limits:'not real quality',author:'Main',reviewer:'Independent reviewer',method:'synthetic technical fixture',reviewedAt:'2026-01-02T00:00:00Z',candidate,context:'synthetic frontend',evidence:[{path:'evidence.txt',sha256:hash('synthetic evidence'),kind:'technical'}]},{id:'public',planVersion:plan.version,planHash:jsonHash(plan),status:'not_evaluated'}]};
 const planReview={outcome:'sufficient',author:'Main',reviewer:'Independent reviewer',reviewedAt:'2026-01-01T12:00:00Z',chronology:'Synthetic scope review before the synthetic verdict.',candidate,planHash:jsonHash(plan),basis:{requestAndDiff:'Synthetic request and diff inspected.',sharedPathsAndRisks:'Synthetic shared path checked.',exclusionsAndLimits:'Synthetic postpublication remains pending.'}};
 const origin='https://12345678-poke-arena-web.eriickramiirez.workers.dev';
 const proof={version:versionId,origin,source:{...candidate,status:''},resources:['index.html','app.js','render.js'].map(file=>({file,url:origin+'/'+file,bytes:readFileSync(join(assets,file)).length,sha256:hash(readFileSync(join(assets,file)))})),errors:[],canonicalRequests:[],externalOrigins:[],canvas:{clean:true}};
 writeJson(reviewFile,review);writeJson(planReviewFile,planReview);writeJson(proofFile,proof);
 const decide=()=>{
  const m=readJson(manifestFile);
  writeJson(decisionFile,{schemaVersion:1,outcome:'approve_publication',reviewer:'/root',reviewedAt:new Date().toISOString(),reason:'Synthetic decision only, not real product approval.',manifestSha256:hash(readFileSync(manifestFile)),reviewSha256:m.review.sha256,planReviewSha256:m.planReview.sha256,planHash:m.planHash,scopeHash:m.scopeHash,authorshipHash:m.authorshipHash,candidate:m.candidate,versionId:m.versionId,globalOpen:true});
 };
 const prepare=()=>{prepareManifest({source,review:reviewFile,planReview:planReviewFile,previewProof:proofFile,versionId,output:manifestFile});decide();};
 prepare();
 const calls=[];
 const cfRunner=args=>{
  const call={args:[...args]};calls.push(call);
  if(args[2]==='create')call.versions=readJson(args[args.indexOf('--versions')+1].slice(1));
  return {status:0,stdout:args[2]==='list'?JSON.stringify({deployments:[{id:'synthetic-deployment',versions:[{version_id:versionId,percentage:100}]}]}):'{}'};
 };
 const publicFetch=async url=>new Response(readFileSync(join(assets,new URL(url).pathname==='/'?'index.html':new URL(url).pathname.slice(1))));
 const run=options=>promoteRelease(manifestFile,decisionFile,{cfRunner,publicFetch,...options});
 return {root,source,assets,bundleFile,reviewFile,planReviewFile,proofFile,manifestFile,decisionFile,prepare,decide,calls,cfRunner,run};
}

test('preparation rejects missing plan chronology before replacing the manifest',t=>{
 const f=fixture(t),before=readFileSync(f.manifestFile),review=readJson(f.planReviewFile);
 delete review.chronology;writeJson(f.planReviewFile,review);
 assert.throws(()=>f.prepare(),/QUALITY_PLAN/);
 assert.deepEqual(readFileSync(f.manifestFile),before);assert.equal(f.calls.length,0);
});
test('preparation accepts a complete independent plan review without invoking Cloudflare',t=>{
 const f=fixture(t);assert.doesNotThrow(()=>f.prepare());
 assert.equal(readJson(f.manifestFile).planReview.sha256,hash(readFileSync(f.planReviewFile)));
 assert.equal(f.calls.length,0);
});

test('release build rejects dirty source before Cloudflare and reports pre-build source identity without claiming Build Output verification',t=>{
 const f=fixture(t),calls=[];
 const cfRunner=(args,source)=>{calls.push({args,source});return{status:0,stdout:'dry-run prepared'};};
 writeFileSync(join(f.source,'private-review.json'),'untracked');
 assert.throws(()=>buildRelease(f.source,{cfRunner}),error=>{
  assert.match(error.message,/QUALITY_SOURCE/);assert.match(error.message,new RegExp(readJson(f.manifestFile).candidate.sha));
  assert.match(error.message,new RegExp(readJson(f.manifestFile).candidate.tree));assert.match(error.message,/\?\? private-review\.json/);return true;
 });assert.equal(calls.length,0);
 rmSync(join(f.source,'private-review.json'));
 const result=buildRelease(f.source,{cfRunner});
 assert.deepEqual(result,{status:'build_command_completed',candidate:readJson(f.manifestFile).candidate,sourcePrecheck:'clean_before_build',sourceStatus:'clean_before_build',buildOutputVerified:false,stdout:'dry-run prepared',stderr:''});
 assert.deepEqual(calls,[{args:['workers','versions','create','--dry-run'],source:f.source}]);
});

test('valid partial executes the real guard and proposes only the reviewed version; dry-run never checks live',async t=>{
 const f=fixture(t),result=await f.run({dryRun:true,publicFetch:()=>assert.fail('dry-run must not fetch public resources')});
 assert.equal(result.status,'dry_run_only');assert.equal(result.guard.ok,true);assert.equal(result.guard.globalOpen,true);
 assert.equal(f.calls.length,1);assert.deepEqual(f.calls[0].versions,[{version_id:versionId,percentage:100}]);
 assert.deepEqual(f.calls[0].args.slice(0,8),['workers','deployments','create','--worker','poke-arena-web','--strategy','percentage','--versions']);
 assert.ok(f.calls[0].args.includes('--dry-run'));assert.ok(!f.calls[0].args.includes('deploy'));
});
test('live simulation checks active 100% and public bytes but preserves public behavior pending',async t=>{
 const f=fixture(t),result=await f.run();assert.equal(result.status,'promoted_public_behavior_review_pending');
 assert.equal(result.publicBehaviorReview,'pending');assert.equal(result.guard.globalOpen,true);
 assert.deepEqual(f.calls.map(c=>c.args[2]),['create','list']);assert.deepEqual(result.publicArtifacts,['index.html','app.js','render.js']);
});
test('missing records and the actual habitual deploy alias reject before CF',()=>{
 const pkg=readJson(join(repoRoot,'realtime/frontend/package.json'));
 assert.equal(pkg.scripts.deploy,'node ../../scripts/publish-frontend.mjs promote');
 assert.ok(!pkg.scripts.deploy.includes('cf deploy'));assert.ok(!pkg.scripts.build.includes('cf deploy'));
 const result=spawnSync(process.execPath,[join(repoRoot,'scripts/publish-frontend.mjs'),'promote'],{encoding:'utf8',windowsHide:true});
 assert.equal(result.status,1);const error=JSON.parse(result.stderr);assert.match(error.error,/QUALITY_INPUT/);assert.equal(error.publicationState,'not_attempted');
});
test('saved ok flag cannot bypass the real guard with a required pending criterion',async t=>{
 const f=fixture(t),review=readJson(f.reviewFile);review.records[0].status='not_evaluated';review.guard={ok:true};writeJson(f.reviewFile,review);f.prepare();
 await assert.rejects(f.run({dryRun:true}),/QUALITY_REVIEW.*real review guard rejected/);assert.equal(f.calls.length,0);
});
test('altered evidence is rejected by the real guard before CF',async t=>{
 const f=fixture(t);writeFileSync(join(f.root,'evidence.txt'),'changed evidence');
 await assert.rejects(f.run(),/QUALITY_REVIEW.*evidence hash mismatch/);assert.equal(f.calls.length,0);
});
for(const [name,change,expected] of [
 ['plan',m=>m.planHash='0'.repeat(64),/QUALITY_REVIEW/],
 ['scope',m=>m.scopeHash='0'.repeat(64),/QUALITY_REVIEW/],
 ['source tree',m=>m.candidate.tree='0'.repeat(40),/QUALITY_SOURCE/],
 ['immutable version',m=>{m.versionId=otherVersion;m.immutableOrigin=m.immutableOrigin.replace('12345678','87654321');},/QUALITY_PREVIEW/],
 ['review reference',m=>m.review.sha256='0'.repeat(64),/QUALITY_IDENTITY/],
])test(`mismatched ${name} rejects even with a newly matching declared Root receipt`,async t=>{
 const f=fixture(t),m=readJson(f.manifestFile);change(m);writeJson(f.manifestFile,m);f.decide();
 await assert.rejects(f.run(),expected);assert.equal(f.calls.length,0);
});
for(const [name,change] of [
 ['missing sufficiency',p=>delete p.outcome],
 ['author reviewing own plan',p=>p.reviewer=p.author],
 ['missing scope reasoning',p=>delete p.basis.sharedPathsAndRisks],
])test(`plan review ${name} rejects during preparation`,t=>{
 const f=fixture(t),p=readJson(f.planReviewFile);change(p);writeJson(f.planReviewFile,p);
 assert.throws(()=>f.prepare(),/QUALITY_PLAN/);assert.equal(f.calls.length,0);
});
test('Root quality decision must match hashes, candidate, scope, version and actual reviews',async t=>{
 const f=fixture(t),original=readJson(f.decisionFile);
 for(const change of [d=>d.reviewer='Main',d=>d.versionId=otherVersion,d=>d.scopeHash='0'.repeat(64),d=>d.manifestSha256='0'.repeat(64),d=>d.globalOpen=false,d=>d.reviewedAt='2026-01-01T00:00:00Z']){
  const decision=structuredClone(original);change(decision);writeJson(f.decisionFile,decision);
  await assert.rejects(f.run(),/QUALITY_ROOT/);assert.equal(f.calls.length,0);
 }
});
test('counterexample: product author cannot review a plan declared as written by someone else',t=>{
 const f=fixture(t),review=readJson(f.reviewFile),p=readJson(f.planReviewFile);
 review.authorship.planAuthors=['Art'];p.author='Art';p.reviewer='Main';
 writeJson(f.reviewFile,review);writeJson(f.planReviewFile,p);
 assert.throws(()=>f.prepare(),/QUALITY_PLAN.*author of the plan or scoped change/);assert.equal(f.calls.length,0);
});
test('legitimate separate plan author and code author permit a third independent reviewer',async t=>{
 const f=fixture(t),review=readJson(f.reviewFile),p=readJson(f.planReviewFile);
 review.authorship.planAuthors=['Art'];p.author='Art';p.reviewer='Independent reviewer';
 writeJson(f.reviewFile,review);writeJson(f.planReviewFile,p);f.prepare();
 assert.equal((await f.run({dryRun:true})).status,'dry_run_only');assert.equal(f.calls.length,1);
});
test('declared authorship cannot omit available scoped authors or contradict plan author facts',t=>{
 const f=fixture(t),original=readJson(f.reviewFile);
 for(const change of [r=>r.authorship.scopeAuthors=['Art'],r=>r.plan.author='Art',r=>r.plan.authors=['Art'],r=>delete r.authorship]){
  const review=structuredClone(original);change(review);writeJson(f.reviewFile,review);assert.throws(()=>f.prepare(),/QUALITY_AUTHOR/);
 }
 assert.equal(f.calls.length,0);
});
test('plan-review author and Root authorship binding must match declared authority',async t=>{
 const f=fixture(t),p=readJson(f.planReviewFile);p.author='Art';writeJson(f.planReviewFile,p);
 assert.throws(()=>f.prepare(),/QUALITY_PLAN.*contradicts/);assert.equal(f.calls.length,0);
 p.author='Main';writeJson(f.planReviewFile,p);f.prepare();const d=readJson(f.decisionFile);d.authorshipHash='0'.repeat(64);writeJson(f.decisionFile,d);
 await assert.rejects(f.run(),/QUALITY_ROOT.*authorshipHash/);assert.equal(f.calls.length,0);
});
test('dirty source, altered Worker bundle and extra Build Output files reject before mutation',async t=>{
 const f=fixture(t);writeFileSync(join(f.source,'untracked.txt'),'dirty');await assert.rejects(f.run(),/QUALITY_SOURCE/);rmSync(join(f.source,'untracked.txt'));
 writeFileSync(f.bundleFile,'altered Worker');await assert.rejects(f.run(),/QUALITY_BUILD/);writeFileSync(f.bundleFile,'synthetic Worker bundle');
 writeFileSync(join(f.assets,'unexpected.txt'),'extra');await assert.rejects(f.run(),/QUALITY_BUILD/);assert.equal(f.calls.length,0);
});
test('preview resources cannot escape to canonical or external origins',t=>{
 const f=fixture(t),proof=readJson(f.proofFile);proof.resources[0].url='https://poke-arena-web.eriickramiirez.workers.dev/';writeJson(f.proofFile,proof);
 assert.throws(()=>f.prepare(),/QUALITY_PREVIEW/);assert.equal(f.calls.length,0);
});
test('preparation cannot alter frozen source or overwrite review evidence',t=>{
 const f=fixture(t);
 for(const output of [join(f.source,'release.json'),join(f.source,'..not-outside.json'),f.reviewFile])assert.throws(()=>prepareManifest({source:f.source,review:f.reviewFile,planReview:f.planReviewFile,previewProof:f.proofFile,versionId,output}),/QUALITY_INPUT/);
});
test('public mismatch preserves activated-but-unverified state and never rolls back',async t=>{
 const f=fixture(t);await assert.rejects(f.run({publicFetch:async()=>new Response('wrong bytes')}),error=>{
  assert.equal(error.publicationState,'activated_not_verified');assert.equal(error.versionId,versionId);assert.match(error.message,/QUALITY_PUBLIC/);return true;
 });assert.deepEqual(f.calls.map(c=>c.args[2]),['create','list']);
});
test('unknown activation after CF failure is open and not retried automatically',async t=>{
 const f=fixture(t);await assert.rejects(f.run({cfRunner:args=>{f.calls.push({args});return {status:1,stderr:'connection lost after request'};}}),error=>{
  assert.equal(error.publicationState,'activation_requested_not_verified');assert.equal(error.versionId,versionId);return true;
 });assert.equal(f.calls.length,1);
});
test('ambiguous promotion timeout and postactivation fetch timeout retain distinct open states',async t=>{
 const f=fixture(t);
 await assert.rejects(f.run({cfRunner:()=>{throw new Error('promotion request timed out');}}),error=>{assert.equal(error.publicationState,'activation_requested_not_verified');return true;});
 await assert.rejects(f.run({publicFetch:()=>{throw new Error('public fetch timed out');}}),error=>{assert.equal(error.publicationState,'activated_not_verified');return true;});
});
test('wrong active version fails without a public success claim',async t=>{
 const f=fixture(t);await assert.rejects(f.run({cfRunner:args=>{
  if(args[2]==='create')return f.cfRunner(args);
  return {status:0,stdout:JSON.stringify({deployments:[{versions:[{version_id:otherVersion,percentage:100}]}]})};
 }}),error=>{assert.equal(error.publicationState,'activation_requested_not_verified');assert.match(error.message,/QUALITY_PUBLIC/);return true;});
});
