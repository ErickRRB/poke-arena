import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, writeFile, mkdir, access, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const argument = (name, fallback) => process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3) || fallback;
const baselineRef = argument('baseline-ref','6ab2d56'), candidateRef = argument('candidate-ref','01ec423');
const git = (...args) => execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024}).trim();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const cache = path.join(root,'qa/native-combat-checkpoint');
const output = path.resolve(root,argument('output',`docs/visual-followup/native-combat-transition/checkpoint-${candidateRef}`));
assert(output.startsWith(path.join(root,'docs/visual-followup/native-combat-transition')+path.sep),'Use a fresh checkpoint subdirectory');
await mkdir(output,{recursive:true}); await mkdir(cache,{recursive:true});

async function freeze(ref,label) {
  const commit = git('rev-parse',`${ref}^{commit}`), destination=path.join(cache,commit);
  assert(destination.startsWith(cache+path.sep));
  await mkdir(destination,{recursive:true});
  const names=git('ls-tree','--name-only',commit,'dist/').split(/\r?\n/).filter(name=>/^dist\/[^/]+\.js$/.test(name));
  assert(names.includes('dist/engine.js'),'No engine module in commit');
  const all=git('ls-tree','-r',commit,'dist/assets/pokemon','dist/assets/battle');
  assert(!all.split(/\r?\n/).some(line=>line.startsWith('120000 ')),'Unexpected symlink in asset archive');
  const ready=path.join(destination,'checkpoint.json'); let metadata;
  try { metadata=JSON.parse(await readFile(ready,'utf8')); assert.equal(metadata.commit,commit); await access(path.join(destination,'dist/engine.js')); }
  catch {
    const archive=path.join(cache,`${commit}.tar`);
    execFileSync('git',['archive','--format=tar','-o',archive,commit,...names,'dist/assets/pokemon','dist/assets/battle'],{cwd:root,windowsHide:true});
    const archiveBytes=await readFile(archive);
    execFileSync('tar',['-xf',archive,'-C',destination],{cwd:root,windowsHide:true});
    await writeFile(path.join(destination,'package.json'),'{"type":"module"}\n');
    metadata={commit,archiveSha256:hash(archiveBytes),archiveBytes:archiveBytes.length,frozenAt:new Date().toISOString(),source:'git archive from immutable commit; no working-tree bytes'};
    await writeFile(ready,JSON.stringify(metadata,null,2)+'\n'); await unlink(archive);
  }
  const inputs=[];
  for(const file of [...names,'dist/assets/pokemon/manifest.json'].sort()) { const bytes=await readFile(path.join(destination,file)); inputs.push({file,bytes:bytes.length,sha256:hash(bytes)}); }
  return {label,sourceDirectory:destination,gitHead:commit,workingTreeStatus:[],frozenCache:path.relative(root,destination).replaceAll('\\','/'),inputs,checkpoint:metadata};
}
const baseline=await freeze(baselineRef,'baseline'),candidate=await freeze(candidateRef,'candidate');
const seed={generatedAt:new Date().toISOString(),sourceCutGeneratedAt:candidate.checkpoint.frozenAt,baseline,candidate,assetInputs:[]};
const seedFile=path.join(output,'frozen-inputs.json'); await writeFile(seedFile,JSON.stringify(seed,null,2)+'\n');
execFileSync(process.execPath,[path.join(root,'scripts/inventory-native-combat-transition.mjs'),`--baseline=${baseline.sourceDirectory}`,`--candidate=${candidate.sourceDirectory}`,`--output=${output}`,`--reuse-input=${seedFile}`],{cwd:root,windowsHide:true,stdio:'pipe'});
const inventoryFile=path.join(output,'inventory-provisional.json'); const inventory=JSON.parse(await readFile(inventoryFile,'utf8'));
const beforeCards=JSON.parse(await readFile(path.join(output,'cards-baseline.json'),'utf8')),afterCards=JSON.parse(await readFile(path.join(output,'cards-main-working-tree.json'),'utf8'));
// The original inspector remains closed. Refine its scope here for fields added
// by the final contract and for the new engine's generic pierce branch.
function delivery(card,native){
  if(!card)return null;if(card.spell)return'spell';if(card.passive||!(card.damage>0))return'passive';
  if(card.rollingShot)return'rolling-ground-projectile';
  if(native?card.pierce:card.style==='psychic')return'linear-projectile';
  if(card.bolts)return'multi-beam';if(['lightning','vine'].includes(card.style))return'beam';if(card.style==='flame')return'flame-cone';
  return(native?card.rangedAttack??card.range>=50:card.range>=50)?'ground-path-projectile':'melee';
}
for(const row of inventory.cards){
  const b=beforeCards[row.key],a=afterCards[row.key];
  const inactive=row.controlChanges.filter(field=>field==='platform'&&!b?.structure&&!a?.structure||field==='jumpRange'&&(b?.jumpRange||0)===(a?.jumpRange||0)||['deathSpawnDelay','deathSpawnRadius'].includes(field)&&!b?.deathSpawn&&!a?.deathSpawn);
  row.inactiveContractChanges=inactive;row.controlChanges=row.controlChanges.filter(f=>!inactive.includes(f));row.bodyChanges=row.bodyChanges.filter(f=>!inactive.includes(f));
  row.defaultOrBookkeepingChanges=[...new Set([...row.defaultOrBookkeepingChanges,...inactive])];
  if(row.before)row.before.delivery=delivery(b,false);if(row.after)row.after.delivery=delivery(a,true);
  row.deliveryChanged=row.before?.delivery!==row.after?.delivery;
  row.scope=!b?'added':!a?'removed':row.controlChanges.length||row.effectiveRangedChanged||row.emitterChanged||row.deliveryChanged?'integrated_visual_qa_required':row.movementPhysicsChanges.length?'movement_physics_only':row.changedFields.length?'stats_or_copy_only':'unchanged';
}
const scopeChanges=new Set(inventory.cards.filter(r=>['added','removed','integrated_visual_qa_required'].includes(r.scope)).map(r=>r.key));
for(const row of inventory.cards){row.changedChildren=row.childrenAfter.filter(c=>scopeChanges.has(c.key)).map(c=>c.key);if(row.changedChildren.length&&['unchanged','stats_or_copy_only'].includes(row.scope))row.scope='deployment_dependency_qa_required';}
inventory.qaKeys=inventory.cards.filter(r=>!['unchanged','stats_or_copy_only','movement_physics_only'].includes(r.scope)).map(r=>r.key);
const groups=inventory.qaGroups,rows=inventory.cards;
groups.find(g=>g.id==='P1-emitter-delivery').keys=rows.filter(r=>r.after?.active&&r.after?.clip&&(r.deliveryChanged||r.emitterChanged||r.controlChanges.some(f=>/projectile|emitter|style|attackAnim|attackFrames|attackGestures|attackContactFrame/.test(f)))).map(r=>r.key);
groups.find(g=>g.id==='P2-bodies').keys=rows.filter(r=>r.bodyChanges.some(f=>!['scale','name','deployTime','deployStagger'].includes(f))||r.changedChildren.length).map(r=>r.key);
groups.find(g=>g.id==='P2-special-paths').keys=rows.filter(r=>r.controlChanges.some(f=>/entry|death|heal|dash|blink|charge|jump|leap|copy|rolling|suicide|summon|spawn|castDelay|wave|travel|ability/i.test(f))).map(r=>r.key);
Object.assign(inventory.summary,{changedControlKeys:rows.filter(r=>r.scope==='integrated_visual_qa_required').length,dependencyOnlyKeys:rows.filter(r=>r.scope==='deployment_dependency_qa_required').length,
  statsOrCopyOnlyKeys:rows.filter(r=>r.scope==='stats_or_copy_only').length,movementPhysicsOnlyKeys:rows.filter(r=>r.scope==='movement_physics_only').length,unchangedKeys:rows.filter(r=>r.scope==='unchanged').length,
  scopeCounts:Object.fromEntries([...new Set(rows.map(r=>r.scope))].map(scope=>[scope,rows.filter(r=>r.scope===scope).length])),qaKeyCount:inventory.qaKeys.length});
inventory.normalization+=' Final-checkpoint refinement: platform is inactive on non-structures, jumpRange0 is inactive, death-spawn radius/delay are inactive without a child, and candidate delivery uses its actual generic pierce branch.';
// Preserve the complete CSV schema while replacing the refined scope/delivery.
const csvFile=path.join(output,'all-key-transition.csv'),csvText=await readFile(csvFile,'utf8'),csv=[];let row=[],value='',quoted=false;
for(let i=0;i<csvText.length;i++){const c=csvText[i];if(c==='"'){if(quoted&&csvText[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(!quoted&&c===','){row.push(value);value='';}else if(!quoted&&c==='\n'){row.push(value);csv.push(row);row=[];value='';}else value+=c;}
for(const cells of csv.slice(1)){const item=rows.find(r=>r.key===cells[0]);for(const [column,v]of Object.entries({scope:item.scope,controlChanges:item.controlChanges.join('|'),bodyChanges:item.bodyChanges.join('|'),beforeDelivery:item.before?.delivery||'',afterDelivery:item.after?.delivery||''}))cells[csv[0].indexOf(column)]=v;}
await writeFile(csvFile,csv.map(cells=>cells.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n')+'\n');
inventory.status='frozen_git_checkpoint_inventory_not_combat_validation';
inventory.checkpointSource={baseline:baseline.checkpoint,candidate:candidate.checkpoint,workingTreeBytesUsed:false};
inventory.wrapper={file:'scripts/inventory-native-checkpoint.mjs',sha256:hash(await readFile(new URL(import.meta.url)))};
await writeFile(inventoryFile,JSON.stringify(inventory,null,2)+'\n');
const minimumFile=path.join(output,'qa-minimum-provisional.json');const minimum=JSON.parse(await readFile(minimumFile,'utf8'));minimum.status=inventory.status;minimum.candidateCommit=candidate.gitHead;minimum.groups=groups;await writeFile(minimumFile,JSON.stringify(minimum,null,2)+'\n');
console.log(JSON.stringify({output:path.relative(root,output),baseline:baseline.gitHead,candidate:candidate.gitHead,summary:inventory.summary,groups:inventory.qaGroups.map(group=>({id:group.id,keys:group.keys.length})),findings:inventory.findings},null,2));
