import {assertC4Envelope,C4_SERVICE} from './online-context.js?v=1';
import {unpackGame,perspective} from './snapshot.js?v=34';
import {unpackEvent} from './online-wire.js?v=34';
import {validateC4WireEventIdentity} from './c4-wire-preparation.js?v=1';
export {prepareC4Transport} from './c4-wire-preparation.js?v=1';
const uuid=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
export function prepareC4Packet(packet,{onEvent=()=>{},animations={},viewTeam=0,validateEvent=validateC4WireEventIdentity}={}){
  assertC4Envelope(packet);
  if(packet.type!=='snapshot'||packet.status!=='matched'||!uuid(packet.roomId)||!uuid(packet.epoch)||![0,1].includes(packet.team)||!integer(packet.version)||!integer(packet.seq)||!Array.isArray(packet.events)||!Number.isFinite(packet.serverTime)||!Number.isFinite(packet.startsIn)||packet.startsIn<0)throw Error('Snapshot C4 no válido.');
  if(packet.game?.catalogVersion!==4||packet.game.ruleset!=='c4-1'||packet.game.catalogRef!==C4_SERVICE.catalogRef)throw Error('Perfil de partida incompatible.');
  for(const field of ['hands','queues']){
    const rows=packet.game[field];if(!Array.isArray(rows)||rows.length!==2||!rows.every(Array.isArray)||rows[packet.team].length!==4||rows[1-packet.team].length!==0)throw Error('Mano privada C4 no válida.');
  }
  let previous=-1;for(const entry of packet.events){if(!integer(entry.seq)||entry.seq<=previous||entry.seq>packet.seq||!entry.event||typeof entry.event!=='object'||Array.isArray(entry.event))throw Error('Eventos C4 no válidos.');previous=entry.seq;}
  const raw=viewTeam?perspective(packet.game,viewTeam):packet.game,game=unpackGame(raw,onEvent,animations);
  const events=packet.events.map(entry=>({...entry,event:unpackEvent(viewTeam?perspective(entry.event,viewTeam):entry.event,{game,validateEvent})}));
  return{game,events};
}
