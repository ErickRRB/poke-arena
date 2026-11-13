import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const folder=new URL('../artwork/imagenes-viejas/',import.meta.url),catalog=JSON.parse(await readFile(new URL('catalogo.json',folder),'utf8'));
const additions=[['variantes/arena-con-torres-anteriores.png','Renderer screenshot before the raster structure pass'],['originales/combat-effects-v1.webp','dist/assets/ui/combat-effects-v1.webp']];
for(const[file,source]of additions){const bytes=await readFile(new URL(file,folder));if(!catalog.entries.some(entry=>entry.file===file))catalog.entries.push({file,source,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});}
await writeFile(new URL('catalogo.json',folder),JSON.stringify(catalog,null,2)+'\n');
let html=await readFile(new URL('index.html',folder),'utf8');
for(const[file]of additions)if(!html.includes('src="'+file+'"'))html=html.replace('</section></main>',`<figure><img src="${file}" alt="${file}" loading="lazy"><figcaption>${file} <a href="${file}">Abrir original</a></figcaption></figure></section></main>`);
await writeFile(new URL('index.html',folder),html);
for(const entry of catalog.entries){const data=await readFile(new URL(entry.file,folder));if(createHash('sha256').update(data).digest('hex')!==entry.sha256)throw Error('Changed archive: '+entry.file);}
console.log(JSON.stringify({verified:catalog.entries.length}));
