import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {CARDS} from '../dist/engine.js';

const root=path.resolve(import.meta.dirname,'..'),archive=path.join(root,'artwork/imagenes-viejas');
const git=args=>execFileSync('git',args,{cwd:root,windowsHide:true,maxBuffer:32*1024*1024});
const entries=[],blobs=new Map();
const digest=data=>createHash('sha256').update(data).digest('hex');
async function save(file,data,source){
  const destination=path.join(archive,file);await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,data);
  entries.push({file,source,sha256:digest(data),bytes:data.length});return file;
}
const originals=['battle-1.webp','battle-2.webp','battle-3.webp','battle-4.webp','battle-5.webp','battle-6.webp',...['lightning','pinMissile','blizzard','spikes','whirlpool','earthquake','nightmare','stealthRock','hyperBeam'].map(key=>key+'.webp')];
for(const file of originals){const source='dist/assets/cards/'+file,data=await readFile(path.join(root,source));await save('originales/'+file,data,source);}
const head=new Map(git(['ls-tree','-r','HEAD','--','dist/assets/cards']).toString().trim().split('\n').map(line=>{const match=line.match(/^\d+ blob ([a-f0-9]+)\t(.+)$/);return match?[match[2],match[1]]:[];}));
const revisions=git(['log','--all','--format=%H','--','dist/assets/cards']).toString().trim().split('\n');
for(const revision of revisions)for(const line of git(['ls-tree','-r',revision,'--','dist/assets/cards']).toString().trim().split('\n')){
  const match=line.match(/^\d+ blob ([a-f0-9]+)\t(.+\.(?:webp|png|jpe?g|svg))$/i);if(!match)continue;
  const [,blob,source]=match;if(head.get(source)===blob||blobs.has(blob))continue;
  const extension=path.extname(source),file='historicas/'+path.basename(source,extension)+'-'+blob.slice(0,10)+extension;
  await save(file,git(['cat-file','blob',blob]),{path:source,revision,blob});blobs.set(blob,file);
}
const alternative=path.join(root,'dist/assets/cards/hyperBeamV2.webp');
try{await save('variantes/hiperrayo-simplificado.webp',await readFile(alternative),'Variante simplificada de Hiperrayo');}catch(error){if(error.code!=='ENOENT')throw error;}
const input=process.argv[2];
if(input)for(const variant of JSON.parse(await readFile(input,'utf8')))await save('variantes/'+variant.name,await readFile(variant.path),variant.description);

const sheets=[
  ['pikachu','snorlax','machamp','blastoise','zubat','thunder','charizard','fireball','treecko','log','squirtle','charmander','bulbasaur','gengar','eevee','onix'],
  ['vulpix','psyduck','alakazam','geodude','magnemite','scyther','lapras','mewtwo','golem','venusaur','butterfree','beedrill','pidgeot','ekans','sandshrew','nidoqueen'],
  ['nidoking','mankey','arcanine','slowbro','grimer','cloyster','gastly','voltorb','electrode','exeggutor','koffing','chansey','kangaskhan','starmie','mrmime','gyarados'],
  ['ditto','articuno','zapdos','moltres','dragonite','meganium','typhlosion','feraligatr','crobat','ampharos','espeon','umbreon','wobbuffet','steelix','scizor','skarmory'],
  ['blissey','lugia','hooh','sceptile','blaziken','swampert','gardevoir','sableye','aggron','sharpedo','flygon','altaria','absol','salamence','metagross','kyogre'],
  ['groudon','rayquaza'],
];
const changed=['hyperBeam','stealthRock','fireball','golem','electrode','ekans','zubat','beedrill','sandshrew','mankey','nidoqueen','exeggutor','altaria','treecko','kangaskhan','lightning','pinMissile','blizzard','spikes','whirlpool','earthquake','nightmare'];
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function figure(title,markup,file){return '<figure>'+markup+'<figcaption>'+escape(title)+' <a href="'+escape(file)+'">Abrir original</a></figcaption></figure>';}
const cards=changed.map(key=>{
  const sheet=sheets.findIndex(keys=>keys.includes(key));let file,markup;
  if(sheet<0){file='originales/'+key+'.webp';markup='<img src="'+file+'" alt="'+escape(CARDS[key].name)+'" loading="lazy">';}
  else{const index=sheets[sheet].indexOf(key),columns=sheet===5?2:4,rows=sheet===5?1:4,width=sheet===5?1586:1122,height=sheet===5?992:1402,tw=width/columns,th=height/rows;file='originales/battle-'+(sheet+1)+'.webp';markup='<svg viewBox="'+(index%columns*tw)+' '+(Math.floor(index/columns)*th)+' '+tw+' '+th+'" role="img" aria-label="'+escape(CARDS[key].name)+'" preserveAspectRatio="xMidYMid slice"><image href="'+file+'" width="'+width+'" height="'+height+'"/></svg>';}
  return figure(CARDS[key].name+(key==='hyperBeam'?' · se conserva en el juego':''),markup,file);
}).join('\n');
const variants=entries.filter(entry=>!entry.file.startsWith('originales/')).map(entry=>figure(path.basename(entry.file),'<img src="'+entry.file+'" alt="'+escape(path.basename(entry.file))+'" loading="lazy">',entry.file)).join('\n');
await writeFile(path.join(archive,'catalogo.json'),JSON.stringify({date:new Date().toISOString().slice(0,10),entries},null,2)+'\n');
await writeFile(path.join(archive,'index.html'),'<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Poké Arena · Imágenes anteriores</title><style>body{margin:0;padding:24px;background:#f8f1d5;color:#34413a;font:16px system-ui}main{max-width:1200px;margin:auto}h1{font-size:28px}section{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:20px}figure{margin:0;background:#fffbed;border:1px solid #acb29c;border-radius:10px;overflow:hidden}figure>img,figure>svg{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:contain}figcaption{padding:12px;overflow-wrap:anywhere;font-weight:600}a{display:block;font-size:13px;margin-top:5px;color:#a33334}p{max-width:65ch}</style><main><h1>Imágenes anteriores</h1><p>Ilustraciones originales, alternativas y versiones históricas para comparar.</p><section>'+cards+'</section><h2>Variantes y archivos históricos</h2><section>'+variants+'</section></main></html>');
console.log(JSON.stringify({folder:archive,files:entries.length,bytes:entries.reduce((sum,entry)=>sum+entry.bytes,0),historical:blobs.size}));
