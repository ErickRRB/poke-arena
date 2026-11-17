import {ARENA,TILE,snapToCell} from './arena-geometry.js?v=34';

export const PLACEMENT_INPUT_TILES=8;

export function inPlacementInputArea(x,y){
  const margin=PLACEMENT_INPUT_TILES*TILE;
  return Number.isFinite(x)&&Number.isFinite(y)&&x>ARENA.left-margin&&x<ARENA.right+margin&&y>ARENA.top&&y<ARENA.bottom;
}

// This projects pointer intent only. The normal deploy path still validates
// the final legal cell, including the current match's territory and occupants.
export function resolvePlacementInput(game,team,key,x,y){
  if(!inPlacementInputArea(x,y))return null;
  const direct=game.resolveDeployment(team,key,x,y);if(direct)return direct;
  const nearest=snapToCell(team,x,y),candidates=[];
  for(let row=-PLACEMENT_INPUT_TILES;row<=PLACEMENT_INPUT_TILES;row++)for(let col=-PLACEMENT_INPUT_TILES;col<=PLACEMENT_INPUT_TILES;col++){
    const point={x:nearest.x+col*TILE,y:nearest.y+row*TILE};
    if(game.canDeploy(team,key,point.x,point.y))candidates.push(point);
  }
  const score=point=>(point.x-x)**2+(point.y-y)**2,direction=team?-1:1;
  candidates.sort((a,b)=>score(a)-score(b)||direction*(a.y-b.y)||direction*(a.x-b.x));
  return candidates[0]||null;
}
