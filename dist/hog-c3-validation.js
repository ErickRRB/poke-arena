import {LEGACY_ARCANINE,C3_HOG_ARCANINE,C3_OLD_ONIX,C3_OLD_RAPIDASH,C3_HOG_ONIX,C3_HOG_RAPIDASH} from './hog-producer-profiles.js?v=1';

// C3 was never a public cohort: two development producers used the same id.
// A source SHA or a complete matching profile is required to distinguish them.
export const C3_PRODUCERS=Object.freeze({
  '29e8869d113fce50c1fb541c4a66d486abcb5c9e':'old',
  'decb9f931485052e9ccb31ae897d9118130a07d5':'hog',
});
const {legacyProfile,...oldArcanine}=LEGACY_ARCANINE;
const profiles={old:{arcanine:oldArcanine,onix:C3_OLD_ONIX,rapidash:C3_OLD_RAPIDASH},hog:{arcanine:C3_HOG_ARCANINE,onix:C3_HOG_ONIX,rapidash:C3_HOG_RAPIDASH}};
const same=(a,b)=>{
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const ak=Object.keys(a).sort(),bk=Object.keys(b).sort();
  return ak.length===bk.length&&ak.every((key,i)=>key===bk[i]&&same(a[key],b[key]));
};
const subset=(a,b)=>{
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  if(Array.isArray(a))return same(a,b);
  return Object.keys(a).every(key=>Object.hasOwn(b,key)&&subset(a[key],b[key]));
};
const clean=card=>{const {legacyProfile,...rest}=card;return rest;};
const fail=reason=>{const e=new Error(`No se puede restaurar el borrador C3: ${reason}.`);e.code='C3_PROFILE_AMBIGUOUS';throw e;};
export function resolveC3Profiles(data){
  const explicit=data.profileProducer;
  if(explicit!==undefined&&!Object.hasOwn(C3_PRODUCERS,explicit))fail('productor desconocido');
  const evidence=[];
  for(const key of ['arcanine','onix','rapidash'])for(const card of [data.legacyCardOverrides?.[key],data.snapshotProfiles?.[key],...(data.units||[]).filter(u=>u.key===key).map(u=>u.card)])if(card!=null)evidence.push({key,card});
  // Full cards normally appear on electric-chain projectiles; keep validating
  // an orphaned projectile when its source is one of the changed C3 cards.
  for(const projectile of data.projectiles||[]){
    if((projectile.card!=null||projectile.sourceCard!=null)&&projectile.sourceKey!=null&&projectile.key!=null&&projectile.sourceKey!==projectile.key&&[projectile.sourceKey,projectile.key].some(key=>['arcanine','onix','rapidash'].includes(key)))fail('identidad de proyectil contradictoria');
    const source=projectile.sourceKey??projectile.key;
    if(['arcanine','onix','rapidash'].includes(source))for(const card of [projectile.card,projectile.sourceCard])if(card!=null)evidence.push({key:source,card});
  }
  if(evidence.some(({card})=>typeof card!=='object'||Array.isArray(card)))fail('perfil inválido');
  const candidates=evidence.map(({key,card})=>({key,card:clean(card)}));
  const full=candidates.map(({key,card})=>Object.entries(profiles).find(([,expected])=>same(card,expected[key]))?.[0]).filter(Boolean);
  let producer=explicit?C3_PRODUCERS[explicit]:null;
  if(!producer&&full.length)producer=full[0];
  if(!producer)fail('falta productor o perfil completo');
  if(full.some(value=>value!==producer)||candidates.some(({key,card})=>!subset(card,profiles[producer][key])))fail('productor y perfil se contradicen');
  // Missing entity-card fields can be filled only after a producer is proven.
  const overrides=structuredClone(profiles[producer]);
  // Old Arcanine must also keep the legacy label path in hand/quick stats.
  if(producer==='old')overrides.arcanine.legacyProfile=1;
  const source=explicit||Object.keys(C3_PRODUCERS).find(key=>C3_PRODUCERS[key]===producer);
  return{source,overrides};
}
