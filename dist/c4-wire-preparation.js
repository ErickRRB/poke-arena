import * as catalog from './c4-catalog.js?v=1';
let pending,identityRule,completenessRule;
export async function prepareC4Transport(){
  if(arguments.length)throw new TypeError('La preparación C4 no recibe un catálogo C1.');
  await catalog.prepareC4Catalog();
  pending??=(async()=>{
    const module=await import('./c4-restore.js?v=1');
    if(typeof module.validateC4EventIdentity!=='function'||typeof catalog.isCompleteC4CardProfile!=='function')throw Error('Validación C4 de transporte no disponible.');
    identityRule=module.validateC4EventIdentity;completenessRule=catalog.isCompleteC4CardProfile;
  })().catch(error=>{pending=undefined;throw error;});
  await pending;
}
export function validateC4WireEventIdentity(event){
  if(!identityRule)throw Error('Transporte C4 no preparado.');
  return identityRule(event,catalog.getC4BaseCatalog());
}
export function isCompleteWireProfile(profile,expected){
  if(!completenessRule)throw Error('Completitud C4 no preparada.');
  return completenessRule(profile,expected);
}
