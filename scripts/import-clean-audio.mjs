import {readFile,writeFile,mkdir,unlink,rmdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const plan=JSON.parse(await readFile(new URL('./clean-audio-source.json',import.meta.url),'utf8'));
const output=path.join(root,'dist/assets/audio/clean-v1');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const archiveArg=process.argv.indexOf('--archive');
let archive;
if(archiveArg>=0){
 if(!process.argv[archiveArg+1])throw Error('--archive needs a ZIP file');
 archive=await readFile(process.argv[archiveArg+1]);
}else{
 const response=await fetch(plan.archive.url,{signal:AbortSignal.timeout(120000)});
 if(!response.ok)throw Error('Audio archive: HTTP '+response.status);
 archive=Buffer.from(await response.arrayBuffer());
}
if(archive.length!==plan.archive.bytes||sha(archive)!==plan.archive.sha256)throw Error('The pinned audio archive has changed');

// Read only explicitly listed entries. Never extract archive paths to disk.
function zipEntries(bytes){
 let end=-1;
 for(let at=bytes.length-22;at>=Math.max(0,bytes.length-65557);at--)if(bytes.readUInt32LE(at)===0x06054b50){end=at;break;}
 if(end<0)throw Error('ZIP directory missing');
 const count=bytes.readUInt16LE(end+10),entries=new Map();let at=bytes.readUInt32LE(end+16);
 for(let i=0;i<count;i++){
  if(bytes.readUInt32LE(at)!==0x02014b50)throw Error('Invalid ZIP directory');
  const method=bytes.readUInt16LE(at+10),compressed=bytes.readUInt32LE(at+20),size=bytes.readUInt32LE(at+24);
  const nameLength=bytes.readUInt16LE(at+28),extra=bytes.readUInt16LE(at+30),comment=bytes.readUInt16LE(at+32);
  const name=bytes.toString('utf8',at+46,at+46+nameLength),offset=bytes.readUInt32LE(at+42);
  entries.set(name,()=>{
   if(bytes.readUInt32LE(offset)!==0x04034b50||size>32*1024*1024)throw Error('Invalid source entry '+name);
   const start=offset+30+bytes.readUInt16LE(offset+26)+bytes.readUInt16LE(offset+28);
   const source=bytes.subarray(start,start+compressed),data=method===0?source:method===8?inflateRawSync(source):null;
   if(!data||data.length!==size)throw Error('Unsupported source entry '+name);
   return data;
  });
  at+=46+nameLength+extra+comment;
 }
 return entries;
}
function wav(bytes){
 if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('Not a WAV');
 let format,data;
 for(let at=12;at+8<=bytes.length;){
  const size=bytes.readUInt32LE(at+4),tag=bytes.toString('ascii',at,at+4);
  if(at+8+size>bytes.length)throw Error('Truncated WAV');
  if(tag==='fmt ')format={encoding:bytes.readUInt16LE(at+8),channels:bytes.readUInt16LE(at+10),rate:bytes.readUInt32LE(at+12),bits:bytes.readUInt16LE(at+22)};
  if(tag==='data')data=bytes.subarray(at+8,at+8+size);
  at+=8+size+(size%2);
 }
 if(format?.encoding!==1||format.bits!==16||format.rate<44100||!data)throw Error('Expected genuine high resolution PCM16 source');
 return{...format,data,frames:data.length/(format.channels*2)};
}
function writeWav(data,rate,channels){
 const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(data.length+36,4);header.write('WAVEfmt ',8);
 header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(channels,22);header.writeUInt32LE(rate,24);
 header.writeUInt32LE(rate*channels*2,28);header.writeUInt16LE(channels*2,32);header.writeUInt16LE(16,34);
 header.write('data',36);header.writeUInt32LE(data.length,40);return Buffer.concat([header,data]);
}
function excerpt(source,clip){
 const {startFrame:first,endFrame:last,fadeInFrames:attack,fadeOutFrames:tail}=clip;
 if(!Number.isInteger(first)||!Number.isInteger(last)||first<0||last>source.frames||last<=first)throw Error('Invalid excerpt '+clip.key);
 const frames=last-first,data=Buffer.alloc(frames*source.channels*2);
 for(let i=0;i<frames;i++){
  const envelope=Math.min(1,attack?i/attack:1,tail?(frames-1-i)/tail:1);
  for(let ch=0;ch<source.channels;ch++)data.writeInt16LE(Math.round(source.data.readInt16LE(((first+i)*source.channels+ch)*2)*envelope),(i*source.channels+ch)*2);
 }
 return{...source,data,frames};
}
const zip=zipEntries(archive),sources=new Map();
for(const row of plan.sources){
 const bytes=zip.get(row.file)?.();
 if(!bytes||bytes.length!==row.bytes||sha(bytes)!==row.sha256)throw Error('Source mismatch: '+row.file);
 const source=wav(bytes);
 if(source.rate!==row.rate||source.bits!==row.bits||source.channels!==row.channels||source.frames!==row.frames)throw Error('Source format mismatch: '+row.key);
 sources.set(row.key,source);
}
await mkdir(output,{recursive:true});
const files=[],clips=new Map();
for(const clip of plan.clips){
 if(!/^[a-z0-9-]+$/.test(clip.key))throw Error('Invalid clip key');
 const source=plan.sources.find(row=>row.key===clip.sourceKey),result=excerpt(sources.get(clip.sourceKey),clip);
 const bytes=writeWav(result.data,result.rate,result.channels),file='assets/audio/clean-v1/'+clip.key+'.wav';
 await writeFile(path.join(output,clip.key+'.wav'),bytes);clips.set(clip.key,result);
 files.push({...clip,path:file,bytes:bytes.length,sha256:sha(bytes),sourceSha256:source.sha256,sourceId:source.sourceId,rate:result.rate,bits:16,channels:result.channels,frames:result.frames});
}
const fallback={},excerpts=[];
for(const key of plan.fallbackKeys){
 const source=clips.get(key),file=files.find(row=>row.key===key),length=Math.min(source.frames,Math.round(source.rate*file.fallbackSeconds));
 const pcm=Buffer.alloc(length*2),fade=Math.min(length,Math.round(source.rate*.035));
 for(let i=0;i<length;i++){
  let value=0;for(let ch=0;ch<source.channels;ch++)value+=source.data.readInt16LE((i*source.channels+ch)*2)/source.channels;
  pcm.writeInt16LE(Math.round(value*Math.min(1,(length-1-i)/fade)),i*2);
 }
 fallback[key]={rate:source.rate,bits:16,channels:1,data:pcm.toString('base64')};
 excerpts.push({key,sourceSha256:file.sourceSha256,clipSha256:file.sha256,frames:length,sampleRate:source.rate,bits:16,channels:1,pcmSha256:sha(pcm),processing:'Mono average of the new PCM16 phase clip, 35ms ending fade; original sample rate. No synthesis, pitch shift, resampling or old PRSFX data.'});
}
const processing='Recorded sources split into event-aligned phases; original sample rate and PCM16 retained. Only exact frame cuts and short linear edge fades listed for each clip. No synthesis, EQ, pitch shift, resampling or old PRSFX data. File metadata and tests do not establish perceived quality.';
await writeFile(path.join(output,'SOURCES.json'),JSON.stringify({...plan,files,processing},null,2)+'\n');
await writeFile(path.join(output,'FALLBACK-SOURCES.json'),JSON.stringify({archiveSha256:plan.archive.sha256,license:plan.license,excerpts},null,2)+'\n');
await writeFile(path.join(output,'LICENSES.txt'),zip.get('LICENSES.txt')());
await writeFile(path.join(output,'CREDITS.txt'),'Clean combat recordings — CC0 1.0 Universal.\nKenney: Impact Sounds.\nlentikula: Basic Spell Impacts, Druid Spell Impacts, Healing Spell Impacts.\nCurated archive: untamedpixels, '+plan.archive.page+'\n'+Object.values(plan.upstream).map(row=>row.author+' — '+row.title+': '+row.url).join('\n')+'\n'+processing+'\n');
await writeFile(path.join(root,'dist/attack-audio-fallback.js'),'// PCM16 excerpts of the new clean recordings; provenance: assets/audio/clean-v1/FALLBACK-SOURCES.json.\nexport const FALLBACK_PCM='+JSON.stringify(fallback)+';\n');
const manifestPath=path.join(root,'dist/assets/audio/manifest.json'),previous=JSON.parse(await readFile(manifestPath,'utf8'));
await writeFile(manifestPath,JSON.stringify({cries:previous.cries,moves:Object.fromEntries(files.map(row=>[row.key,row.path]))},null,2)+'\n');

// Retire only the explicitly enumerated, hash-verified rejected files.
const retired=JSON.parse(await readFile(path.join(root,'docs/audio-clean-2026-11-15/retired-pack.json'),'utf8'));
const retiredRoot=path.resolve(root,'dist/assets/audio/moves');
for(const row of retired.files){
 const target=path.resolve(root,'dist',row.path);
 if(path.dirname(target)!==retiredRoot)throw Error('Retired file escaped its directory');
 let bytes;try{bytes=await readFile(target);}catch(error){if(error.code==='ENOENT')continue;throw error;}
 if(sha(bytes)!==row.sha256)throw Error('Refusing to remove modified retired asset '+row.path);
 await unlink(target);
}
for(const name of retired.metadata){
 const target=path.resolve(retiredRoot,name);
 if(path.dirname(target)!==retiredRoot)throw Error('Invalid retired metadata path');
 await unlink(target).catch(error=>{if(error.code!=='ENOENT')throw error;});
}
await rmdir(retiredRoot).catch(error=>{if(!['ENOENT','ENOTEMPTY'].includes(error.code))throw error;});
console.log(JSON.stringify({sourceRecordings:sources.size,phaseClips:files.length,fallbacks:excerpts.length,bytes:files.reduce((sum,row)=>sum+row.bytes,0),archiveSha256:plan.archive.sha256}));
