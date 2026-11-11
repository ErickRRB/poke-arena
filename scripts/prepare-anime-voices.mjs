import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
const source=path.resolve(process.argv[2]||'qa/audio-source/anime'),root=path.resolve(import.meta.dirname,'../dist/assets/audio');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
await mkdir(path.join(root,'voices'),{recursive:true});
const ids=Object.keys(manifest.cries),results=[];
for(let start=0;start<ids.length;start+=4)await Promise.all(ids.slice(start,start+4).map(async id=>{
  const input=path.join(source,`${id}.wav`),output=path.join(root,'voices',`${id}.mp3`);await access(input);
  await new Promise((resolve,reject)=>{const process=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',input,'-af','silenceremove=start_periods=1:start_duration=0.01:start_threshold=-45dB','-ar','22050','-ac','1','-c:a','libmp3lame','-b:a','80k','-t','2.5',output],{windowsHide:true,stdio:['ignore','ignore','pipe']});let error='';process.stderr.on('data',chunk=>error+=chunk);process.on('error',reject);process.on('exit',code=>code===0?resolve():reject(Error(`${id}: ${error}`)));});
  manifest.cries[id]=`assets/audio/voices/${id}.mp3`;results.push(id);
}));
await writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
const sources=await readFile(path.join(root,'SOURCES.txt'),'utf8');
if(!sources.includes('RealCries.zip'))await writeFile(path.join(root,'SOURCES.txt'),sources+'\nAnime deployment voices: HQ Pokemon Anime Cries Gen 1-5, Galladito/RojoY, public fan compilation.\nhttps://forums.pokemmo.com/index.php?/topic/86447-mod-hq-pokemon-anime-cries-gen-1-5/\nhttps://www.mediafire.com/file/bwtoaxbvt2fnage/RealCries.zip/file\nOnly the 94 numbered WAVs needed by this project are converted to mono MP3 for browser playback. Original Pokemon character recordings belong to their respective owners.\n');
console.log(`Prepared ${results.length} anime deployment voices.`);
