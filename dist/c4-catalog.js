export const C4_CATALOG_REFERENCE='c4-1:cards-c1-733';
export const C4_CATALOG_FINGERPRINT='2777afac1f4101a1762cbdc7015acacdf8d2d640d5b4e95ce172c24cce4b2748';
let prepared,pending;
const fail=(code,message)=>Object.assign(new Error(message),{code});
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const entry of Object.values(value))freeze(entry);Object.freeze(value);}return value;}
export function prepareC4Catalog(){
 if(arguments.length)return Promise.reject(fail('C4_CATALOG_ARGUMENT','La referencia C4 fija no acepta un catálogo de origen.'));
 if(pending)return pending;
 pending=(async()=>{const {C4_CANONICAL_JSON}=await import('./c4-catalog-data.js?v=1');const bytes=new TextEncoder().encode(C4_CANONICAL_JSON),hash=await globalThis.crypto.subtle.digest('SHA-256',bytes),actual=Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
  if(actual!==C4_CATALOG_FINGERPRINT)throw fail('C4_CATALOG_DRIFT','Catálogo C4 incompatible.');
  const catalog=JSON.parse(C4_CANONICAL_JSON);if(!catalog||typeof catalog!=='object'||Array.isArray(catalog)||Object.keys(catalog).length!==125)throw fail('C4_CATALOG_DRIFT','Catálogo C4 inválido.');
  prepared=freeze(catalog);return prepared;
 })().catch(error=>{pending=undefined;throw error;});return pending;
}
export function getC4BaseCatalog(){if(!prepared)throw fail('C4_CATALOG_UNPREPARED','Prepará el catálogo C4 antes de usarlo.');return prepared;}
export function getC4BaseCard(key){const cards=getC4BaseCatalog();return Object.hasOwn(cards,key)?cards[key]:undefined;}

// Shape comparison only; values and additional opaque fields remain unchanged.
function compatibleC4Value(actual,expected){
 if(actual===undefined)return false;
 if(expected===null)return true;
 if(Array.isArray(expected))return Array.isArray(actual)&&(!expected.length||actual.every((value,index)=>compatibleC4Value(value,expected[Math.min(index,expected.length-1)])));
 if(expected&&typeof expected==='object')return isCompleteC4CardProfile(actual,expected);
 return typeof actual===typeof expected&&(typeof actual!=='number'||Number.isFinite(actual));
}
export function isCompleteC4CardProfile(profile,expected){
 if(!profile||typeof profile!=='object'||Array.isArray(profile)||!expected||typeof expected!=='object'||Array.isArray(expected))return false;
 return Object.keys(expected).every(key=>Object.hasOwn(profile,key)&&compatibleC4Value(profile[key],expected[key]));
}
