import * as catalog from './c4-catalog.js?v=1';
let pending,identityRule,completenessRule,shapeRules;
export async function prepareC4Transport(){
  if(arguments.length)throw new TypeError('La preparación C4 no recibe un catálogo C1.');
  await catalog.prepareC4Catalog();
  pending??=(async()=>{
    const [module,shape,engine,profiles]=await Promise.all([import('./c4-restore.js?v=1'),import('./c4-shape.js?v=1'),import('./engine.js?v=34'),import('./hog-profiles.js?v=1')]);
    if(typeof module.validateC4EventIdentity!=='function'||typeof catalog.isCompleteC4CardProfile!=='function')throw Error('Validación C4 de transporte no disponible.');
    const rules=shape.createC4ShapeValidator({gamePrototype:engine.Game.prototype,cardFor:key=>key==='arcanine'?profiles.HOG_ARCANINE:catalog.getC4BaseCard(key)});
    identityRule=module.validateC4EventIdentity;completenessRule=catalog.isCompleteC4CardProfile;shapeRules=rules;
  })().catch(error=>{pending=undefined;throw error;});
  await pending;
}
export function validateC4WireEventIdentity(event){
  if(!identityRule)throw Error('Transporte C4 no preparado.');
  shapeRules.validateEvent(event);return identityRule(event,catalog.getC4BaseCatalog());
}
export function validateC4WireEventShape(event){
  if(!shapeRules)throw Error('Forma C4 no preparada.');return shapeRules.validateEvent(event);
}
export function validateC4WireGameShape(game,options){
  if(!shapeRules)throw Error('Forma C4 no preparada.');return shapeRules.validateGame(game,options);
}
export function validateC4WireEventLog(events,options){
  if(!shapeRules)throw Error('Forma C4 no preparada.');return shapeRules.validateEventLog(events,options);
}
export function isCompleteWireProfile(profile,expected){
  if(!completenessRule)throw Error('Completitud C4 no preparada.');
  return completenessRule(profile,expected);
}
