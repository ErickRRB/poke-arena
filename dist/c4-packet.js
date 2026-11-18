import {assertC4Envelope,C4_SERVICE} from './online-context.js?v=1';
import {unpackGame,perspective} from './snapshot.js?v=34';
import {unpackEvent} from './online-wire.js?v=34';
import {validateC4WireEventIdentity,validateC4WireGameShape,validateC4WireEventLog,resolveC4ExpectedContext} from './c4-wire-preparation.js?v=1';
export {prepareC4Transport} from './c4-wire-preparation.js?v=1';
const uuid=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
export function prepareC4Packet(packet,options={}){
  if(Object.hasOwn(options,'onEvent'))throw new TypeError('C4 prepara sin callbacks de presentación.');
  const {animations={},viewTeam=0,validateEvent,expectedContext}=options,context=resolveC4ExpectedContext(expectedContext);
  if(!context.arenaProfileProducer){assertC4Envelope(packet);if(Object.hasOwn(packet,'arenaProfileProducer'))throw Error('Productor inesperado.');}
  else for(const [key,value] of Object.entries({service:'c4',protocol:5,catalogVersion:4,ruleset:context.ruleset,selectionVersion:context.selectionVersion,catalogRef:C4_SERVICE.catalogRef,arenaProfileProducer:context.arenaProfileProducer}))if(packet?.[key]!==value)throw Object.assign(Error('Contexto de partida incompatible.'),{code:'C4_CONTEXT_INVALID'});
  if(packet.type!=='snapshot'||packet.status!=='matched'||!uuid(packet.roomId)||!uuid(packet.epoch)||![0,1].includes(packet.team)||!integer(packet.version)||!integer(packet.seq)||typeof packet.opponent!=='string'||!Number.isFinite(packet.serverTime)||!Number.isFinite(packet.startsIn)||packet.startsIn<0)throw Error('Snapshot C4 no válido.');
  if(packet.game?.catalogVersion!==4||packet.game.ruleset!==context.ruleset||packet.game.catalogRef!==C4_SERVICE.catalogRef||(context.arenaProfileProducer?packet.game.arenaProfileProducer!==context.arenaProfileProducer:Object.hasOwn(packet.game,'arenaProfileProducer')))throw Error('Perfil de partida incompatible.');
  validateC4WireGameShape(packet.game,{visibility:'public',team:packet.team,expectedContext});
  validateC4WireEventLog(packet.events,{maxSeq:packet.seq,expectedContext});
  for(const entry of packet.events)validateC4WireEventIdentity(entry.event,{expectedContext});
  const eventValidator=event=>validateC4WireEventIdentity(event,{expectedContext});
  const raw=viewTeam?perspective(packet.game,viewTeam):packet.game,game=unpackGame(raw,()=>{},animations);
  const events=packet.events.map(entry=>({...entry,event:unpackEvent(viewTeam?perspective(entry.event,viewTeam):entry.event,{game,validateEvent:eventValidator,expectedContext})}));
  if(validateEvent&&validateEvent!==validateC4WireEventIdentity)for(const entry of packet.events)validateEvent(structuredClone(viewTeam?perspective(entry.event,viewTeam):entry.event));
  return{game,events};
}
