import { Game, CARDS, W, H, PRINCESS_RANGE, KING_Y } from './engine.js?v=25';

// Entity references are IDs on the wire; full cards preserve summoned forms.
const entityCopy=e=>{const{target,...copy}=e;return{...copy,targetId:target?.id??null};};
export function packGame(game){
  const{onEvent,animations,units,towers,attacks,projectiles,...plain}=game;
  return{...plain,units:units.map(entityCopy),towers:towers.map(entityCopy),attacks:attacks.map(({attacker,target,...job})=>({...job,attackerId:attacker.id,targetId:target.id})),projectiles:projectiles.map(({target,...p})=>({...p,targetId:target.id}))};
}
export function unpackGame(data,onEvent=()=>{},animations={}){
  const game=Object.assign(Object.create(Game.prototype),structuredClone(data));game.onEvent=onEvent;game.animations=animations;
  game.reinforcements??=[];
  for(const tower of game.towers)if(tower.king){if(tower.y===(tower.team?118:682))tower.y=KING_Y[tower.team];}else tower.range=PRINCESS_RANGE;
  const entities=new Map([...game.units,...game.towers].map(e=>[e.id,e]));
  for(const entity of entities.values()){entity.card=entity.card||CARDS[entity.key];entity.target=entities.get(entity.targetId)||null;}
  game.attacks=game.attacks.map(j=>({...j,attacker:entities.get(j.attackerId),target:entities.get(j.targetId)})).filter(j=>j.attacker&&j.target);
  game.projectiles=game.projectiles.map(p=>({...p,target:entities.get(p.targetId)})).filter(p=>p.target);
  return game;
}
export function packEvent(event){
  const copy={...event};for(const key of['attacker','target','unit','tower'])if(copy[key])copy[key]=entityCopy(copy[key]);return structuredClone(copy);
}
function turn(value){
  if(Array.isArray(value))return value.map(turn);
  if(!value||typeof value!=='object')return value;
  const copy={};for(const[key,item]of Object.entries(value))copy[key]=['card','guard','stats'].includes(key)?structuredClone(item):turn(item);
  if(typeof copy.x==='number')copy.x=W-copy.x;if(typeof copy.y==='number')copy.y=H-copy.y;
  if(typeof copy.startX==='number')copy.startX=W-copy.startX;if(typeof copy.startY==='number')copy.startY=H-copy.startY;
  if(typeof copy.endX==='number')copy.endX=W-copy.endX;if(typeof copy.endY==='number')copy.endY=H-copy.endY;
  if(typeof copy.dx==='number')copy.dx=-copy.dx;if(typeof copy.dy==='number')copy.dy=-copy.dy;
  for(const key of['steerX','steerY','separateX','separateY'])if(typeof copy[key]==='number')copy[key]=-copy[key];
  if(typeof copy.angle==='number')copy.angle+=Math.PI;
  if(copy.team===0||copy.team===1)copy.team=1-copy.team;
  if(copy.lane===0||copy.lane===1)copy.lane=1-copy.lane;
  if(copy.winner===0||copy.winner===1)copy.winner=1-copy.winner;
  return copy;
}
export function perspective(data,team){
  if(!team)return structuredClone(data);const result=turn(data);
  if(result.hands){result.hands.reverse();result.queues.reverse();result.energy.reverse();result.stats.reverse();}
  return result;
}
