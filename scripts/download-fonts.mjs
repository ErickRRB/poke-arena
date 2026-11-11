import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../dist/assets/fonts');
await mkdir(root,{recursive:true});
const response=await fetch('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap',{headers:{'User-Agent':'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36'}});
if(!response.ok)throw new Error(`Font CSS: ${response.status}`);
let css=await response.text();
const urls=[...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map(m=>m[1]))];
await Promise.all(urls.map(async(url,i)=>{const r=await fetch(url);if(!r.ok)throw new Error('Font download failed');const data=Buffer.from(await r.arrayBuffer());const ext=data.toString('ascii',0,4)==='wOF2'?'woff2':'ttf';const name=`font-${i}.${ext}`;await writeFile(path.join(root,name),data);css=css.replaceAll(url,name);}));
for(const name of ['barlowcondensed','dmsans']){const r=await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${name}/OFL.txt`);if(!r.ok)throw new Error(`Missing ${name} license`);await writeFile(path.join(root,`${name}-OFL.txt`),await r.text());}
await writeFile(path.join(root,'fonts.css'),css);
console.log(`Saved ${urls.length} fonts locally.`);
