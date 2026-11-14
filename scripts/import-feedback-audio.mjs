import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),base=path.join(root,'qa/audio-source'),destination=path.join(root,'dist/assets/audio/feedback');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
if(hash(fs.readFileSync(path.join(base,'tinysized.zip')))!=='7f00e2b1dae15e68db0e1d6096767f03755e9e7c247128afc3e935e63774d7db')throw Error('Unexpected Vehicle archive');
if(hash(fs.readFileSync(path.join(base,'bow-shoot-original.ogg')))!=='ac3e1f9868946cfd2fdfe00f65d7170d1e30d66ec626ba7767a5370dacedaba6')throw Error('Unexpected bow source');
fs.mkdirSync(destination,{recursive:true});
const sources={
 'bow-release':['bow-shoot-original.ogg','dorkster; remix of qubodup and remaxim','CC-BY-SA-3.0','https://opengameart.org/content/bow-arrow-shot'],
 'petal-rustle':['arrow-feathers-01.wav','Vehicle / Jan Schupke','CC0-1.0','https://opengameart.org/content/fantasy-sound-effects-tinysized-sfx'],
 'dart-air':['compressed-air-spray-01.wav','Vehicle / Jan Schupke','CC0-1.0','https://opengameart.org/content/fantasy-sound-effects-tinysized-sfx'],
 'light-contact':['wood-twigs-break-01.wav','Vehicle / Jan Schupke','CC0-1.0','https://opengameart.org/content/fantasy-sound-effects-tinysized-sfx'],
 'stone-crack':['wood-twigs-break-02.wav','Vehicle / Jan Schupke','CC0-1.0','https://opengameart.org/content/fantasy-sound-effects-tinysized-sfx'],
 'bite-crunch':['apple-cut-02.wav','Vehicle / Jan Schupke','CC0-1.0','https://opengameart.org/content/fantasy-sound-effects-tinysized-sfx'],
 'body-contact':['cloth-pouch-shake-01.wav','Vehicle / Jan Schupke','CC0-1.0','https://opengameart.org/content/fantasy-sound-effects-tinysized-sfx'],
};
const manifestFile=path.join(root,'dist/assets/audio/manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestFile));manifest.feedback={};const rows=[];
for(const [key,[file,author,license,url]] of Object.entries(sources)){
 const original=key==='bow-release'?path.join(base,file):path.join(base,'vehicle-original/sfx-cc0',file),target=path.join(destination,key+'.ogg');
 if(key==='bow-release')fs.copyFileSync(original,target);
 else execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',original,'-ac','1','-ar','44100','-c:a','libvorbis','-q:a','4',target],{windowsHide:true});
 manifest.feedback[key]='assets/audio/feedback/'+key+'.ogg';
 rows.push({key,author,license,url,sourceFile:file,sourceSha256:hash(fs.readFileSync(original)),asset:manifest.feedback[key],sha256:hash(fs.readFileSync(target)),transform:key==='bow-release'?'Unmodified original Ogg.':'Lossy Ogg encoding, mono44.1kHz; no pitch or source substitution. Runtime trims silence and applies its documented gain envelope.'});
}
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(destination,'SOURCES.json'),JSON.stringify({archive:'https://opengameart.org/sites/default/files/tinysized.zip',archiveSha256:'7f00e2b1dae15e68db0e1d6096767f03755e9e7c247128afc3e935e63774d7db',rows},null,2)+'\n');
fs.writeFileSync(path.join(destination,'CREDITS.txt'),'Bow & Arrow Shot by dorkster, a remix of qubodup Swish - bamboo stick weapon swhoshes and Arrow hit twang; Arrow hit twang derives from remaxim Vibrating Plastic.\nhttps://opengameart.org/content/bow-arrow-shot\nhttps://opengameart.org/content/swish-bamboo-stick-weapon-swhoshes\nhttps://opengameart.org/content/arrow-hit-twang\nLicense: Creative Commons Attribution-ShareAlike3.0 Unported, https://creativecommons.org/licenses/by-sa/3.0/\nThe included bow-release.ogg is unmodified. Its source and license remain available in this directory.\n\nOther feedback recordings: Vehicle / Jan Schupke, Tinysized SFX Library, CC0.\nhttps://opengameart.org/content/fantasy-sound-effects-tinysized-sfx\nhttps://creativecommons.org/publicdomain/zero/1.0/\nRecordings converted from WAV to Ogg. Original file names and hashes are in SOURCES.json.\n');
fs.copyFileSync(path.join(base,'vehicle-original/readme.txt'),path.join(destination,'Vehicle-CC0.txt'));
console.log(JSON.stringify({imported:rows.length,removedGenericKeys:['punch-1','punch-2','punch-3','heavy']}));
