import {assertC4Envelope,C4_SERVICE} from './online-context.js?v=1';
import {unpackGame,perspective} from './snapshot.js?v=target-c1-1';
import {unpackEvent} from './online-wire.js?v=target-c1-1';
import {validateC4WireEventIdentity,validateC4WireGameShape,validateC4WireEventLog} from './c4-wire-preparation.js?v=1';
export {prepareC4Transport} from './c4-wire-preparation.js?v=1';
const uuid=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
export function prepareC4Packet(packet,options={}){
  if(Object.hasOwn(options,'onEvent'))throw new TypeError('C4 prepara sin callbacks de presentación.');
  const {animations={},viewTeam=0,validateEvent=validateC4WireEventIdentity}=options;
  assertC4Envelope(packet);
  if(packet.type!=='snapshot'||packet.status!=='matched'||!uuid(packet.roomId)||!uuid(packet.epoch)||![0,1].includes(packet.team)||!integer(packet.version)||!integer(packet.seq)||typeof packet.opponent!=='string'||!Number.isFinite(packet.serverTime)||!Number.isFinite(packet.startsIn)||packet.startsIn<0)throw Error('Snapshot C4 no válido.');
  if(packet.game?.catalogVersion!==4||packet.game.ruleset!=='c4-1'||packet.game.catalogRef!==C4_SERVICE.catalogRef)throw Error('Perfil de partida incompatible.');
  validateC4WireGameShape(packet.game,{visibility:'public',team:packet.team});
  validateC4WireEventLog(packet.events,{maxSeq:packet.seq});
  const raw=viewTeam?perspective(packet.game,viewTeam):packet.game,game=unpackGame(raw,()=>{},animations);
  const events=packet.events.map(entry=>({...entry,event:unpackEvent(viewTeam?perspective(entry.event,viewTeam):entry.event,{game,validateEvent})}));
  return{game,events};
}
