export const C4_CATALOG_REFERENCE='c4-1:cards-c1-733';
export const C4_CATALOG_FINGERPRINT='2777afac1f4101a1762cbdc7015acacdf8d2d640d5b4e95ce172c24cce4b2748';
const AUTHORITY_FINGERPRINT='3b40485763a686139dfb975d7c3521a01d3a0fa392727a9292c7cc0889498275';
let prepared, pending, source;
const fail=(code,message)=>Object.assign(new Error(message),{code});
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
async function fingerprint(value){const bytes=new TextEncoder().encode(JSON.stringify(canonical(value))),hash=await globalThis.crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');}
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const entry of Object.values(value))freeze(entry);Object.freeze(value);}return value;}
export function prepareC4Catalog(cards){
 if(pending){if(cards!==source)return Promise.reject(fail('C4_CATALOG_SOURCE','Catálogo C4 de origen distinto.'));return pending;}
 source=cards;
 pending=(async()=>{const copy=structuredClone(cards),input=await fingerprint(copy);if(input!==C4_CATALOG_FINGERPRINT&&input!==AUTHORITY_FINGERPRINT)throw fail('C4_CATALOG_DRIFT','Catálogo C4 desconocido.');
  if(input===AUTHORITY_FINGERPRINT){Object.assign(copy.voltorb,{visualScale:1.35,scale:1.35});Object.assign(copy.madriguera,{name:'Madriguera Nidoran',id:null,structureArt:'nidoranBurrow'});delete copy.madriguera.scale;}
  if(await fingerprint(copy)!==C4_CATALOG_FINGERPRINT)throw fail('C4_CATALOG_DRIFT','Catálogo C4 incompatible.');prepared=freeze(copy);return prepared;
 })().catch(error=>{pending=undefined;source=undefined;throw error;});return pending;
}
export function getC4BaseCatalog(){if(!prepared)throw fail('C4_CATALOG_UNPREPARED','Prepará el catálogo C4 antes de usarlo.');return prepared;}
export function getC4BaseCard(key){const cards=getC4BaseCatalog();return Object.hasOwn(cards,key)?cards[key]:undefined;}
