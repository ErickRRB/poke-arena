import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),plan=JSON.parse(await readFile(new URL('./pokemon-audio-source.json',import.meta.url),'utf8')),output=path.join(root,'dist/assets/audio/moves');
await mkdir(output,{recursive:true});const rows=[];let next=0;
await Promise.all(Array.from({length:6},async()=>{while(next<plan.files.length){const item=plan.files[next++],target=path.join(output,item.key+'.wav');let bytes;try{bytes=await readFile(target);}catch{const r=await fetch(item.sourceUrl,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(item.file+': '+r.status);bytes=Buffer.from(await r.arrayBuffer());}const blob=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');if(blob!==item.gitBlob||bytes.length!==item.bytes)throw Error('Source mismatch: '+item.file);if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('Not WAV: '+item.file);await writeFile(target,bytes);rows.push({...item,path:'assets/audio/moves/'+item.key+'.wav',sha256:createHash('sha256').update(bytes).digest('hex')});}}));
rows.sort((a,b)=>a.key.localeCompare(b.key));
const licenseUrl='https://raw.githubusercontent.com/'+plan.repository+'/'+plan.commit+'/LICENSES/LicenseRef-POKEMON-REBORN.txt',licenseResponse=await fetch(licenseUrl);if(!licenseResponse.ok)throw Error('Missing source attribution');await writeFile(path.join(output,'LICENSE-POKEMON-REBORN.txt'),await licenseResponse.text());
await writeFile(path.join(output,'SOURCES.json'),JSON.stringify({...plan,files:rows,processing:'Original WAV bytes, no pitch shift, no renamed/recycled prior foley. Runtime trims leading/trailing silence and applies its existing gain envelope. Source-move sounds are mapped separately to local release/contact events; this does not assert their source-game phase timing.'},null,2)+'\n');
await writeFile(path.join(output,'CREDITS.txt'),plan.attribution+'\nSource repository: https://github.com/'+plan.repository+'/tree/'+plan.commit+'/'+plan.folder+'\n'+plan.sourceLicence+'\n');
// A short mono PCM excerpt per family makes the first gesture independent of
// network/decode completion. Keep the original sample rate; no pitch changes.
const fallbackKeys=['pound','rock-throw2','ember','hydro-pump','thundershock','razor-leaf2','poison-sting','confusion','aura-sphere1','shadow-ball2','slash','bite','recover','egg-bomb1','quick-attack','acid','icy-wind1'],fallback={},excerpts=[];
for(const key of fallbackKeys){
 const source=rows.find(row=>row.key===key),bytes=await readFile(path.join(output,key+'.wav'));let offset=12,format,data;
 while(offset+8<=bytes.length){const size=bytes.readUInt32LE(offset+4),tag=bytes.toString('ascii',offset,offset+4);if(tag==='fmt ')format={encoding:bytes.readUInt16LE(offset+8),channels:bytes.readUInt16LE(offset+10),rate:bytes.readUInt32LE(offset+12),bits:bytes.readUInt16LE(offset+22)};if(tag==='data')data=bytes.subarray(offset+8,offset+8+size);offset+=8+size+(size%2);}
 if(format.encoding!==1||![8,16].includes(format.bits)||!data)throw Error('Unsupported fallback PCM '+key);
 const stride=format.channels*format.bits/8,frames=data.length/stride,mono=new Float32Array(frames);let peak=0;
 for(let i=0;i<frames;i++){for(let ch=0;ch<format.channels;ch++){const at=i*stride+ch*format.bits/8;mono[i]+=(format.bits===8?(data[at]-128)/128:data.readInt16LE(at)/32768)/format.channels;}peak=Math.max(peak,Math.abs(mono[i]));}
 let first=0;while(first<frames-1&&Math.abs(mono[first])<peak*.015)first++;first=Math.max(0,first-Math.round(format.rate*.005));
 const length=Math.min(frames-first,Math.ceil(format.rate*.36)),pcm=Buffer.alloc(length);
 for(let i=0;i<length;i++)pcm[i]=Math.max(0,Math.min(255,Math.round(mono[first+i]*128+128)));
 fallback[key]={rate:format.rate,data:pcm.toString('base64')};excerpts.push({key,sourceSha256:source.sha256,sourceGitBlob:source.gitBlob,firstFrame:first,frames:length,sampleRate:format.rate,processing:'Mono channel average, unsigned8-bit PCM excerpt, original sample rate; no pitch change.',pcmSha256:createHash('sha256').update(pcm).digest('hex')});
}
await writeFile(path.join(root,'dist/attack-audio-fallback.js'),'// Derived only from the attributed Pokémon move recordings. See assets/audio/moves/FALLBACK-SOURCES.json.\nexport const FALLBACK_PCM='+JSON.stringify(fallback)+';\n');
await writeFile(path.join(output,'FALLBACK-SOURCES.json'),JSON.stringify({sourceCommit:plan.commit,attribution:plan.attribution,excerpts},null,2)+'\n');
const manifestFile=path.join(root,'dist/assets/audio/manifest.json'),previous=JSON.parse(await readFile(manifestFile,'utf8'));
await writeFile(manifestFile,JSON.stringify({cries:previous.cries,moves:Object.fromEntries(rows.map(row=>[row.key,row.path]))},null,2)+'\n');
console.log(JSON.stringify({files:rows.length,bytes:rows.reduce((n,r)=>n+r.bytes,0),verifiedGitBlobs:true,source:plan.commit}));
