import * as catalog from './c4-catalog.js?v=1';
import {getArenaProducerByRuleset,arenaProducerCard,validateArenaProducerEventProfiles,validateHistoricalProducerEvent} from './arena-profile-producers.js?v=1';
let pending,identityRule,completenessRule,shapeModule,gamePrototype,hogProfile;
const shapeRules=new Map();
export function resolveC4ExpectedContext(expectedContext){
  if(expectedContext===undefined)return Object.freeze({ruleset:'c4-1',arenaProfileProducer:null,selectionVersion:2});
  if(!expectedContext||typeof expectedContext!=='object'||Array.isArray(expectedContext))throw Error('Contexto C4 esperado inválido.');
  const producer=getArenaProducerByRuleset(expectedContext.ruleset);
  if(!producer||expectedContext.arenaProfileProducer!==producer.marker)throw Error('Productor C4 esperado inválido.');
  return Object.freeze({ruleset:producer.ruleset,arenaProfileProducer:producer.marker,selectionVersion:3});
}
function shapeFor(expectedContext){
  if(!shapeModule)throw Error('Forma C4 no preparada.');
  const {ruleset}=resolveC4ExpectedContext(expectedContext);
  if(!shapeRules.has(ruleset))shapeRules.set(ruleset,shapeModule.createC4ShapeValidator({gamePrototype,cardFor:key=>arenaProducerCard(ruleset,key)??(key==='arcanine'?hogProfile:catalog.getC4BaseCard(key))}));
  return shapeRules.get(ruleset);
}
export async function prepareC4Transport(){
  if(arguments.length)throw new TypeError('La preparación C4 no recibe un catálogo C1.');
  await catalog.prepareC4Catalog();
  pending??=(async()=>{
    const [module,shape,engine,profiles]=await Promise.all([import('./c4-restore.js?v=1'),import('./c4-shape.js?v=1'),import('./engine.js?v=target-c1-1'),import('./hog-profiles.js?v=1')]);
    if(typeof module.validateC4EventIdentity!=='function'||typeof catalog.isCompleteC4CardProfile!=='function')throw Error('Validación C4 de transporte no disponible.');
    identityRule=module.validateC4EventIdentity;completenessRule=catalog.isCompleteC4CardProfile;shapeModule=shape;gamePrototype=engine.Game.prototype;hogProfile=profiles.HOG_ARCANINE;
  })().catch(error=>{pending=undefined;throw error;});
  await pending;
}
export function validateC4WireEventIdentity(event,{expectedContext}={}){
  if(!identityRule)throw Error('Transporte C4 no preparado.');
  const context=resolveC4ExpectedContext(expectedContext);shapeFor(expectedContext).validateEvent(event);
  identityRule(event,catalog.getC4BaseCatalog());
  if(context.arenaProfileProducer)validateArenaProducerEventProfiles(event,context.ruleset);else validateHistoricalProducerEvent(event);
  return true;
}
export function validateC4WireEventShape(event,{expectedContext}={}){
  return shapeFor(expectedContext).validateEvent(event);
}
export function validateC4WireGameShape(game,options={}){
  return shapeFor(options.expectedContext).validateGame(game,options);
}
export function validateC4WireEventLog(events,options={}){
  return shapeFor(options.expectedContext).validateEventLog(events,options);
}
export function isCompleteWireProfile(profile,expected){
  if(!completenessRule)throw Error('Completitud C4 no preparada.');
  return completenessRule(profile,expected);
}
