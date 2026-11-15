import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {LEGAL_CAMERA_SCENARIOS,runLegalCameraScenario} from './native-camera-legal-scenarios.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=path.resolve(root,'../.supervision/mobile-board-20261114/art-physics'),baseDir=path.join(out,'base-21b');
await mkdir(baseDir,{recursive:true});
const git=(...args)=>execFileSync('git',args,{cwd:root,windowsHide:true,maxBuffer:3000000});
const digest=bytes=>createHash('sha256').update(bytes).digest('hex'),inputs={};
const paths=git('ls-tree','-r','--name-only','21b3eaa','dist').toString().trim().split(/\r?\n/).filter(p=>/^dist\/[^/]+\.js$/.test(p));
for(const file of paths){const bytes=git('show','21b3eaa:'+file);await writeFile(path.join(baseDir,path.basename(file)),bytes);inputs[file]=digest(bytes);}
await writeFile(path.join(baseDir,'package.json'),'\n{"type":"module"}\n');
const norm=bytes=>bytes.toString().replaceAll('\r\n','\n');
const unchanged=[];
for(const file of ['engine.js','balance.js','catalog.js','pokemon-stats.js','unit-sizes.js','attack-choreography.js','sprite-motion.js','sprite-geometry.js','knockback-profiles.js','native-formations.js','arena-tilemap.js']){
 const before=await readFile(path.join(baseDir,file)),after=await readFile(path.join(root,'dist',file));assert.equal(norm(before),norm(after),file);unchanged.push(file);
}
const beforeGeometry=await readFile(path.join(baseDir,'arena-geometry.js')),afterGeometry=await readFile(path.join(root,'dist/arena-geometry.js'));
const physical=bytes=>norm(bytes).split('\n').filter(line=>!line.trim().startsWith('//')&&!line.startsWith('export const ARENA_CAMERA=')).join('\n');
assert.equal(physical(beforeGeometry),physical(afterGeometry),'Only the camera literal and its comments may change.');
const oldEngine=await import(pathToFileURL(path.join(baseDir,'engine.js')).href+'?v=26'),oldSnapshot=await import(pathToFileURL(path.join(baseDir,'snapshot.js')).href+'?v=26');
const newEngine=await import(pathToFileURL(path.join(root,'dist/engine.js')).href+'?v=26'),newSnapshot=await import(pathToFileURL(path.join(root,'dist/snapshot.js')).href+'?v=26');
const cases=[];
for(const scenario of LEGAL_CAMERA_SCENARIOS){
 const runs=[];
 for(const [engine,snapshot]of [[oldEngine,oldSnapshot],[newEngine,newSnapshot]]){
  const hash=createHash('sha256');let frames=0;
  const result=runLegalCameraScenario(engine,scenario.name,{onFrame:game=>{hash.update(JSON.stringify(snapshot.packGame(game)));frames++;}});
  runs.push({frames,sha256:hash.digest('hex'),deployments:result.deployments.map(d=>({key:d.key,team:d.team,x:d.x,y:d.y,ok:d.result.ok,at:d.executedAt}))});
 }
 assert.deepEqual(runs[0],runs[1],scenario.name);cases.push({scenario:scenario.name,...runs[1],matchesBaseline:true});
}
const report={at:new Date().toISOString(),baseline:'21b3eaae2b42c8ad0c0f60f45812383aefd575bd',candidate:git('rev-parse','HEAD').toString().trim(),baselineGeometrySha256:digest(beforeGeometry),candidateGeometrySha256:digest(afterGeometry),physicalDefinitionsSha256:digest(physical(afterGeometry)),unchangedFiles:unchanged,baselineModuleHashes:inputs,cases,pass:true,scope:'Fresh baseline modules exported from the actual Git commit. Same paid deployments and real Game.step in both module trees; every packed game frame hashes identically. This checks unchanged mechanics without recalibrating the balance matrix. No renderer or audio performance claim.'};
await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:true,unchangedFiles:unchanged.length,identicalPhysicalDefinitions:true,scenarios:cases.length,frames:cases.reduce((n,c)=>n+c.frames,0)}));
