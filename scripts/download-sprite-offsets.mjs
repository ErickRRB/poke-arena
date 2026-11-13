import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),manifest=JSON.parse(await readFile(path.join(root,'dist/assets/pokemon/manifest.json'),'utf8'));
const commit='576a7f13b5b7f6ad09a5877d5ae6b2d33458c245',files=new Map();
for(const [id,animations]of Object.entries(manifest))for(const meta of Object.values(animations)){
  const file=meta.file.replace('-Anim.png','-Offsets.png');files.set(file,{id,file});
}
const entries=[...files.values()],failed=[];
for(let i=0;i<entries.length;i+=12){await Promise.all(entries.slice(i,i+12).map(async({id,file})=>{
  const target=path.join(root,'dist',file);try{await readFile(target);return;}catch{}
  const url='https://raw.githubusercontent.com/PMDCollab/SpriteCollab/'+commit+'/sprite/'+String(id).padStart(4,'0')+'/'+path.basename(file);
  try{const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(response.status);const data=Buffer.from(await response.arrayBuffer());if(data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG');await mkdir(path.dirname(target),{recursive:true});await writeFile(target,data);}catch(error){failed.push({file,error:String(error)});}
}));}
console.log(JSON.stringify({files:entries.length,failed}));if(failed.length)process.exitCode=1;
