import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const expected='2777afac1f4101a1762cbdc7015acacdf8d2d640d5b4e95ce172c24cce4b2748';
const mode=process.argv[2];if(!['--check','--write'].includes(mode)||process.argv.length!==3)throw Error('Use --check or --write');
const source=await readFile(new URL('../data/c4-catalog-2777.json',import.meta.url));
const hash=createHash('sha256').update(source).digest('hex');if(hash!==expected)throw Error('C4 catalog source fingerprint mismatch');
const value=JSON.parse(source.toString('utf8'));
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(key=>[key,canonical(x[key])])):x;
if(Object.keys(value).length!==125||JSON.stringify(canonical(value))!==source.toString('utf8'))throw Error('C4 catalog source is not canonical');
const output='// Generated from data/c4-catalog-2777.json; do not edit.\nexport const C4_CANONICAL_JSON='+JSON.stringify(source.toString('utf8'))+';\n';
const target=new URL('../dist/c4-catalog-data.js',import.meta.url);
if(mode==='--check'){if((await readFile(target,'utf8')).replace(/\r\n/g,'\n')!==output)throw Error('C4 catalog generated output differs');}
else await writeFile(target,output,'utf8');
console.log(`${mode}: 125 profiles, sha256 ${expected}`);
