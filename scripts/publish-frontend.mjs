import {readFileSync,writeFileSync,readdirSync,lstatSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve,dirname,relative,join,basename,sep,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const worker='poke-arena-web',canonical='https://poke-arena-web.eriickramiirez.workers.dev';
const assetPrefix='workers/default/assets/';
const publicFiles=['index.html','app.js','render.js'];
const hash=value=>createHash('sha256').update(value).digest('hex');
const objectHash=value=>hash(JSON.stringify(value));
const text=value=>typeof value==='string'&&value.trim().length>0;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=(code,message)=>{throw new Error(`QUALITY_${code}: ${message}`);};
const need=(condition,code,message)=>{if(!condition)fail(code,message);};
const readJson=file=>JSON.parse(readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const identity=value=>String(value||'').trim().toLowerCase().replace(/^\//,'');
const validDate=value=>text(value)&&Number.isFinite(Date.parse(value));

function git(source,...args){
 const result=spawnSync('git',['-C',source,...args],{encoding:'utf8',windowsHide:true});
 need(result.status===0,'SOURCE',result.stderr||result.error?.message||'Git source check failed');
 return result.stdout.trim();
}
function frozenSource(source){
 const candidate={sha:git(source,'rev-parse','HEAD'),tree:git(source,'rev-parse','HEAD^{tree}')};
 need(git(source,'status','--porcelain')==='','SOURCE','Reviewed source must remain clean, including untracked files.');
 return candidate;
}
export function inventoryBuild(directory){
 const files=[];
 function walk(folder){
  for(const entry of readdirSync(folder,{withFileTypes:true})){
   const file=join(folder,entry.name);
   need(!lstatSync(file).isSymbolicLink(),'BUILD','Build Output may not contain symbolic links.');
   if(entry.isDirectory())walk(file);
   else{
    need(entry.isFile(),'BUILD','Build Output contains a non-file entry.');
    const bytes=readFileSync(file);
    files.push({path:relative(directory,file).split(sep).join('/'),bytes:bytes.length,sha256:hash(bytes)});
   }
  }
 }
 walk(directory);
 files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 need(files.some(file=>file.path==='workers/default/bundle/index.js'),'BUILD','Full Build Output, including the Worker bundle, is required.');
 return files;
}
function reference(file,base){return {path:relative(base,resolve(file)),sha256:hash(readFileSync(file))};}
function readReference(ref,base,label){
 need(text(ref?.path)&&/^[a-f0-9]{64}$/.test(ref.sha256||''),'INPUT',`${label} reference with SHA-256 is required.`);
 const file=resolve(base,ref.path);
 need(hash(readFileSync(file))===ref.sha256,'IDENTITY',`${label} changed after preparation.`);
 return {file,value:readJson(file)};
}
function declaredAuthorship(review){
 const result={};
 for(const key of ['planAuthors','scopeAuthors']){
  const entries=review.authorship?.[key];
  need(Array.isArray(entries)&&entries.length>0&&entries.every(text),'AUTHOR',`Review must declare consistent ${key} identifiers.`);
  const ids=entries.map(identity);
  need(new Set(ids).size===ids.length,'AUTHOR',`Duplicate ${key} identifiers.`);
  result[key]=ids.sort();
 }
 const scoped=new Set([...review.scope.criteria,...review.scope.dependencies]);
 for(const record of review.records.filter(record=>scoped.has(record.id)))need(text(record.author)&&result.scopeAuthors.includes(identity(record.author)),'AUTHOR',`Scoped record ${record.id} author contradicts declared scope authorship.`);
 if(review.plan.author!==undefined)need(text(review.plan.author)&&result.planAuthors.includes(identity(review.plan.author)),'AUTHOR','Plan author contradicts declared plan authorship.');
 if(review.plan.authors!==undefined)need(Array.isArray(review.plan.authors)&&review.plan.authors.length>0&&same(review.plan.authors.map(identity).sort(),result.planAuthors),'AUTHOR','Plan authors contradict declared plan authorship.');
 return result;
}
function checkPreview(proof,manifest,files){
 need(proof.version===manifest.versionId&&proof.origin===manifest.immutableOrigin&&same({sha:proof.source?.sha,tree:proof.source?.tree},manifest.candidate),'PREVIEW','Preview identity differs from the reviewed candidate/version.');
 need(proof.source.status===''&&Array.isArray(proof.resources)&&proof.resources.length>0&&proof.canvas?.clean===true,'PREVIEW','A clean source and actual clean-canvas browser proof are required.');
 for(const key of ['errors','canonicalRequests','externalOrigins'])need(Array.isArray(proof[key])&&proof[key].length===0,'PREVIEW',`Preview ${key} must be empty.`);
 const inventory=new Map(files.map(file=>[file.path,file]));
 for(const resource of proof.resources){
  const file=inventory.get(assetPrefix+resource.file),url=new URL(resource.url);
  const requestedFile=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).slice(1);
  need(url.origin===manifest.immutableOrigin&&requestedFile===resource.file&&file?.sha256===resource.sha256&&file.bytes===resource.bytes,'PREVIEW','Preview resource differs from its own Build Output.');
 }
 for(const file of publicFiles)need(proof.resources.some(resource=>resource.file===file),'PREVIEW',`Preview did not observe ${file}.`);
}

// Preparation is local and never uploads or activates a Worker version.
export function prepareManifest({source,review,planReview,previewProof,versionId,output}){
 need([source,review,planReview,previewProof,versionId,output].every(text),'INPUT','prepare requires --source, --review, --plan-review, --preview-proof, --version and --output.');
 need(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(versionId),'VERSION','A full immutable version UUID is required.');
 const base=dirname(resolve(output)),sourceRoot=resolve(source),bundle=readJson(review);
 const outputRelative=relative(sourceRoot,resolve(output));
 need((outputRelative==='..'||outputRelative.startsWith('..'+sep)||isAbsolute(outputRelative))&&![review,planReview,previewProof].some(file=>resolve(file)===resolve(output)),'INPUT','Manifest output must be outside the frozen source and may not overwrite review evidence.');
 const directory=resolve(sourceRoot,'realtime/frontend/.cloudflare/output/v0'),files=inventoryBuild(directory),authorship=declaredAuthorship(bundle);
 const manifest={schemaVersion:1,createdAt:new Date().toISOString(),worker,versionId,immutableOrigin:`https://${versionId.slice(0,8)}-${worker}.eriickramiirez.workers.dev`,candidate:frozenSource(sourceRoot),sourceDirectory:relative(base,sourceRoot),planHash:objectHash(bundle.plan),scopeHash:objectHash(bundle.scope),authorship,authorshipHash:objectHash(authorship),review:reference(review,base),planReview:reference(planReview,base),previewProof:reference(previewProof,base),buildOutput:{directory:relative(base,directory),files,sha256:objectHash(files)},publicArtifacts:publicFiles.map(file=>{
  const entry=files.find(item=>item.path===assetPrefix+file);
  need(entry,'BUILD',`Missing public artifact ${file}.`);
  return {path:file,sha256:entry.sha256};
 })};
 need(same(bundle.candidate,manifest.candidate),'SOURCE','Review and frozen source differ.');
 checkPreview(readJson(previewProof),manifest,files);
 writeFileSync(output,JSON.stringify(manifest,null,2)+'\n');
 return manifest;
}

export function validateRelease(manifestFile,decisionFile){
 need(text(manifestFile)&&text(decisionFile),'INPUT','Publication requires --manifest and --decision. Missing quality records cannot be replaced by another user permission.');
 const file=resolve(manifestFile),base=dirname(file),manifest=readJson(file);
 need(manifest.schemaVersion===1&&manifest.worker===worker&&validDate(manifest.createdAt),'INPUT','Invalid frontend release manifest.');
 need(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(manifest.versionId||'')&&manifest.immutableOrigin===`https://${manifest.versionId.slice(0,8)}-${worker}.eriickramiirez.workers.dev`,'VERSION','Immutable version/origin mismatch.');
 const source=resolve(base,manifest.sourceDirectory);
 need(same(frozenSource(source),manifest.candidate),'SOURCE','Source SHA/tree differ from the reviewed candidate.');
 const directory=resolve(base,manifest.buildOutput.directory);
 need(directory===resolve(source,'realtime/frontend/.cloudflare/output/v0'),'BUILD','Build Output must belong to the frozen source.');
 const files=inventoryBuild(directory);
 need(same(files,manifest.buildOutput.files)&&objectHash(files)===manifest.buildOutput.sha256,'BUILD','Build Output changed, including assets, bundle, configuration or extra files.');
 const review=readReference(manifest.review,base,'Review'),planReview=readReference(manifest.planReview,base,'Plan review'),proof=readReference(manifest.previewProof,base,'Preview proof');
 need(same(review.value.candidate,manifest.candidate)&&objectHash(review.value.plan)===manifest.planHash&&objectHash(review.value.scope)===manifest.scopeHash,'REVIEW','Review candidate, plan or scope differs from manifest.');
 const authorship=declaredAuthorship(review.value);
 need(same(authorship,manifest.authorship)&&objectHash(authorship)===manifest.authorshipHash,'AUTHOR','Manifest authorship differs from the review authority.');
 checkPreview(proof.value,manifest,files);
 need(same(manifest.publicArtifacts,publicFiles.map(path=>({path,sha256:files.find(file=>file.path===assetPrefix+path)?.sha256}))),'BUILD','Public checks do not match the reviewed Build Output.');
 const p=planReview.value;
 need(p.outcome==='sufficient'&&text(p.author)&&text(p.reviewer)&&identity(p.author)!==identity(p.reviewer)&&validDate(p.reviewedAt)&&text(p.chronology)&&same(p.candidate,manifest.candidate)&&p.planHash===manifest.planHash,'PLAN','An independent, explicitly sufficient plan review for this candidate/plan is required.');
 need(authorship.planAuthors.includes(identity(p.author)),'PLAN','Plan-review author contradicts the review authority.');
 need(![...authorship.planAuthors,...authorship.scopeAuthors].includes(identity(p.reviewer)),'PLAN','Plan reviewer is an author of the plan or scoped change.');
 for(const key of ['requestAndDiff','sharedPathsAndRisks','exclusionsAndLimits'])need(text(p.basis?.[key]),'PLAN',`Plan review must explain ${key}; hashes and dates do not establish sufficiency.`);
 // Invoke the actual CLI behind npm run review:check; never trust a saved ok flag.
 const checked=spawnSync(process.execPath,[join(repoRoot,'scripts/quality-review-gate.mjs'),review.file],{cwd:repoRoot,encoding:'utf8',windowsHide:true,timeout:55000,maxBuffer:8*1024*1024});
 let guard;
 try{guard=JSON.parse(checked.stdout);}catch{fail('REVIEW',checked.stderr||checked.error?.message||'The real review guard did not return a result.');}
 need(checked.status===0&&guard.ok===true&&guard.planHash===manifest.planHash,'REVIEW',`The real review guard rejected publication: ${(guard.errors||[]).join('; ')}`);
 const decision=readJson(resolve(decisionFile));
 need(decision.schemaVersion===1&&decision.outcome==='approve_publication'&&identity(decision.reviewer)==='root'&&validDate(decision.reviewedAt)&&text(decision.reason),'ROOT','Explicit Root quality decision is required; deployment authorization alone is insufficient.');
 for(const [key,expected] of Object.entries({manifestSha256:hash(readFileSync(file)),reviewSha256:manifest.review.sha256,planReviewSha256:manifest.planReview.sha256,planHash:manifest.planHash,scopeHash:manifest.scopeHash,authorshipHash:manifest.authorshipHash,versionId:manifest.versionId,globalOpen:guard.globalOpen}))need(decision[key]===expected,'ROOT',`Root decision ${key} differs from the prepared release.`);
 need(same(decision.candidate,manifest.candidate),'ROOT','Root decision candidate differs.');
 const scoped=new Set([...review.value.scope.criteria,...review.value.scope.dependencies]);
 const selected=review.value.records.filter(record=>scoped.has(record.id));
 need(![...authorship.planAuthors,...authorship.scopeAuthors].includes(identity(decision.reviewer))&&selected.every(record=>identity(record.author)!==identity(decision.reviewer)),'ROOT','Root may not approve their own authored plan/change.');
 need([manifest.createdAt,p.reviewedAt,...selected.map(record=>record.reviewedAt)].every(date=>Date.parse(decision.reviewedAt)>=Date.parse(date)),'ROOT','Root decision predates the prepared release or its reviews.');
 return {manifest,source,guard};
}

function runCf(args,source){
 return spawnSync(process.execPath,[join(source,'realtime/node_modules/cf/bin/cf'),...args],{cwd:join(source,'realtime/frontend'),encoding:'utf8',windowsHide:true,timeout:55000,maxBuffer:8*1024*1024});
}
export async function promoteRelease(manifestFile,decisionFile,{dryRun=false,cfRunner=runCf,publicFetch=fetch}={}){
 const {manifest,source,guard}=validateRelease(manifestFile,decisionFile);
 const temp=mkdtempSync(join(tmpdir(),'poke-arena-promotion-'));
 let promotionRequested=false,activeConfirmed=false;
 const invoke=async args=>{
  const result=await cfRunner(args,source);
  need(result.status===0,'CF',result.stderr||result.error?.message||'Cloudflare command failed; inspect active version before retrying.');
  return result.stdout;
 };
 try{
  const versions=join(temp,'versions.json');
  writeFileSync(versions,JSON.stringify([{version_id:manifest.versionId,percentage:100}]));
  const args=['workers','deployments','create','--worker',worker,'--strategy','percentage','--versions','@'+versions];
  if(dryRun)args.push('--dry-run');
  promotionRequested=!dryRun;
  await invoke(args);
  if(dryRun)return {status:'dry_run_only',versionId:manifest.versionId,guard,publicBehaviorReview:'pending'};
  const active=JSON.parse(await invoke(['workers','deployments','list','--worker',worker,'--per-page','1'])).deployments?.[0];
  need(same(active?.versions,[{version_id:manifest.versionId,percentage:100}]),'PUBLIC','Expected reviewed version is not active at 100%; do not claim publication complete.');
  activeConfirmed=true;
  const artifacts=[];
  for(const artifact of manifest.publicArtifacts){
   const response=await publicFetch(canonical+'/'+(artifact.path==='index.html'?'':artifact.path),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
   need(response.status===200&&hash(Buffer.from(await response.arrayBuffer()))===artifact.sha256,'PUBLIC',`Public ${artifact.path} differs from the reviewed build. Promotion may already be active; inspect before retrying.`);
   artifacts.push(artifact.path);
  }
  return {status:'promoted_public_behavior_review_pending',versionId:manifest.versionId,deploymentId:active.id,publicArtifacts:artifacts,guard,publicBehaviorReview:'pending'};
 }catch(error){
  if(promotionRequested){
   error.publicationState=activeConfirmed?'activated_not_verified':'activation_requested_not_verified';
   error.versionId=manifest.versionId;
  }
  throw error;
 }finally{
  const inside=relative(tmpdir(),temp);
  need(inside&&!inside.startsWith('..')&&basename(temp).startsWith('poke-arena-promotion-'),'TEMP','Unexpected temporary cleanup path.');
  rmSync(temp,{recursive:true,force:true});
 }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const [command,...args]=process.argv.slice(2),options={};
  const allowed=new Set(command==='prepare'?['--source','--review','--plan-review','--preview-proof','--version','--output']:['--manifest','--decision','--dry-run']);
  need(['prepare','promote'].includes(command),'INPUT','Use prepare or promote; build/preview are separate and never authorize publication.');
  for(let i=0;i<args.length;i++){
   const flag=args[i];need(allowed.has(flag)&&!Object.hasOwn(options,flag),'INPUT',`Unknown or repeated option ${flag}.`);
   if(flag==='--dry-run')options[flag]=true;
   else{need(text(args[i+1])&&!args[i+1].startsWith('--'),'INPUT',`Missing value for ${flag}.`);options[flag]=args[++i];}
  }
  const result=command==='prepare'?prepareManifest({source:options['--source'],review:options['--review'],planReview:options['--plan-review'],previewProof:options['--preview-proof'],versionId:options['--version'],output:options['--output']}):await promoteRelease(options['--manifest'],options['--decision'],{dryRun:options['--dry-run']===true});
  console.log(JSON.stringify(command==='prepare'?{status:'prepared_not_approved',candidate:result.candidate,versionId:result.versionId,manifestSha256:hash(readFileSync(options['--output'])),reviewSha256:result.review.sha256,planReviewSha256:result.planReview.sha256,planHash:result.planHash,scopeHash:result.scopeHash,authorshipHash:result.authorshipHash}:result,null,2));
 }catch(error){
  const message=error.message.startsWith('QUALITY_')?error.message:`QUALITY_${error.publicationState?'PUBLIC':'INPUT'}: ${error.message}`;
  console.error(JSON.stringify({error:message,publicationState:error.publicationState||'not_attempted',versionId:error.versionId,releaseComplete:false}));
  process.exitCode=1;
 }
}
