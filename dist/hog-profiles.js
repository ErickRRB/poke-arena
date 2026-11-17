// Explicit Arcanine C4 profile, retained from producer decb9f9. CARDS remains C1.
export const C1_RULESET='c1-733',C3_RULESET='c3-1',C4_RULESET='c4-1';
export const HOG_ARCANINE=Object.freeze({"name":"Arcanine","id":59,"cost":4,"type":"fire","label":"Fuego","role":"Win condition · estructuras","hp":1697,"damage":317,"range":19.2,"speed":57.6,"interval":1.6,"attackDuration":0.76,"attackAnim":"Attack","style":"slam","muzzleHeight":26,"color":"#b9d49d","move":"Golpe cuerpo","rarity":"especial","description":"Corre hacia las estructuras y salta el río para alcanzarlas.","building":true,"riverJump":true,"attackRoleOverride":true,"scale":1.5,"pullRange":228,"windup":0.6,"nativeReference":"HogRider","sightRange":228,"radius":14.4,"mass":4,"deployTime":1,"count":1,"burst":1,"burstSpacing":0,"bolts":0,"air":false,"flying":false,"structure":false,"passive":false,"splash":0,"selfSplash":false,"shield":0,"lifetime":0,"knockbackImmune":false,"rangedAttack":false,"projectileStart":10.8,"burn":0,"poisonField":0,"lifesteal":0,"slow":0,"stun":0,"chain":0,"cone":0,"pierce":false,"armor":0,"reflect":0,"charge":0,"dash":false,"blink":0,"entryDamage":0,"entryRadius":0,"entryStun":0,"entrySlow":0,"split":false,"deathSpawn":null,"deathCount":0,"deathDamage":0,"deathRadius":0,"deathKnockback":0,"deathAir":false,"deathField":0,"deathHeal":0,"deathStun":0,"heal":0,"summon":null,"summonMax":0,"ttl":0,"burrow":false,"suicide":false,"execute":0,"enrage":false,"platform":false,"jumpRange":0,"jumpDuration":null,"moveSpeed":57.6,"pullSpeed":57.6,"stompMoveFor":0,"stompWait":0,"deployStagger":0,"nativeFormation":null,"memberDelays":[0],"riverJumpSpeed":76.8,"riverJumpHeight":96,"attackKind":"melee"});

const sameProfile=(a,b)=>{
  if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const ak=Object.keys(a).sort(),bk=Object.keys(b).sort();return ak.length===bk.length&&ak.every((key,i)=>key===bk[i]&&sameProfile(a[key],b[key]));
};
// Run before applying a C4 snapshot or changing session credentials. Missing
// compact cards may be resolved from the explicitly tagged cohort.
export function validateC4Profiles(data,cards){
  const evidence=[data.legacyCardOverrides?.arcanine,data.snapshotProfiles?.arcanine,...(data.units||[]).filter(u=>u.key==='arcanine').map(u=>u.card)];
  for(const p of data.projectiles||[]){
    const fail=()=>{const e=new Error('Procedencia de proyectil C4 incompatible o ausente.');e.code='C4_PROFILE_INVALID';throw e;};
    if(typeof p.key!=='string'||p.key!==p.sourceKey)fail();
    if(p.key==='tower'){
      if(p.sourceProfile!=null||p.sourceCard!=null||p.card!=null||!(data.towers||[]).some(t=>t.id===p.sourceId&&t.team===p.team&&'king'in t&&t.guard))fail();
      continue;
    }
    if(!cards||!Object.hasOwn(cards,p.key))fail();
    if(p.electricChain?p.card==null:p.card!=null)fail();
    const canonical=cards[p.key],expected=p.key==='arcanine'?HOG_ARCANINE:canonical;
    const complete=card=>!!card&&typeof card==='object'&&!Array.isArray(card)&&Object.keys(expected).every(key=>Object.hasOwn(card,key));
    if(p.sourceProfile!=null&&(p.sourceProfile!=='c4-1:cards-c1-733'||p.key==='arcanine'))fail();
    if(p.sourceCard!=null&&!complete(p.sourceCard)||p.card!=null&&!complete(p.card))fail();
    if(p.sourceProfile==null&&p.sourceCard==null&&p.card==null)fail();
    if(p.sourceProfile!=null&&((p.sourceCard!=null&&!sameProfile(p.sourceCard,canonical))||(p.card!=null&&!sameProfile(p.card,canonical))))fail();
    if(p.sourceCard!=null&&p.card!=null&&!sameProfile(p.sourceCard,p.card))fail();
    if((p.sourceKey??p.key)==='arcanine')evidence.push(p.card,p.sourceCard);
  }
  if(evidence.some(card=>card!=null&&!sameProfile(card,HOG_ARCANINE))){const e=new Error('Perfil C4 de Arcanine incompatible.');e.code='C4_PROFILE_INVALID';throw e;}
  return true;
}
