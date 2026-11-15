import { ARENA_TILEMAP } from './arena-tilemap.js?v=34';
export const W=600,H=800,TILE=24,BOARD_VERSION=2;
export const ARENA=Object.freeze({left:84,right:516,top:16,bottom:784,width:432,height:768});
export const DEPLOY_GRID=Object.freeze({size:TILE,left:ARENA.left,top:ARENA.top,columns:18,rows:32});
export const RIVER=Object.freeze({top:376,bottom:424});
export const LANES=Object.freeze([168,432]);
export const BRIDGE=Object.freeze({top:RIVER.top,bottom:RIVER.bottom,halfWidth:TILE});
export const PRINCESS_Y=Object.freeze([628,172]),KING_Y=Object.freeze([712,88]);
// Focus on the complete map, one tile of side context and tower-health headroom.
// Controls overlay this view; isolated off-map sprite poses do not zoom it out.
export const ARENA_CAMERA=Object.freeze({left:60,top:-48,width:480,height:848});
export function arenaProjection(width,height){
  const scale=Math.min(width/ARENA_CAMERA.width,height/ARENA_CAMERA.height);
  return{scale,x:(width-ARENA_CAMERA.width*scale)/2-ARENA_CAMERA.left*scale,y:(height-ARENA_CAMERA.height*scale)/2-ARENA_CAMERA.top*scale};
}
export function worldToScreen(point,width,height){const p=arenaProjection(width,height);return{x:point.x*p.scale+p.x,y:point.y*p.scale+p.y};}
export function screenToWorld(point,width,height){const p=arenaProjection(width,height);return{x:(point.x-p.x)/p.scale,y:(point.y-p.y)/p.scale};}
export function snapToCell(team,x,y){
  const nearest=value=>team?Math.ceil(value-.5+1e-9):Math.floor(value+.5-1e-9);
  return{x:ARENA.left+TILE/2+nearest((x-ARENA.left-TILE/2)/TILE)*TILE,y:ARENA.top+TILE/2+nearest((y-ARENA.top-TILE/2)/TILE)*TILE};
}
export const inArena=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&x>ARENA.left&&x<ARENA.right&&y>ARENA.top&&y<ARENA.bottom;
const touchingAxis=(value,start,count)=>{const n=(value-start)/(TILE/2),i=Math.floor(n);return[Math.max(0,Math.abs(n-i)<1e-7?i-1:i),Math.min(count-1,i)];};
export function arenaBits(x,y,{skipKing=false}={}){
  if(!inArena(x,y))return 0;
  const[x0,x1]=touchingAxis(x,ARENA.left,36),[y0,y1]=touchingAxis(y,ARENA.top,64);let bits=0;
  for(let row=y0;row<=y1;row++)for(let col=x0;col<=x1;col++){
    const cx=ARENA.left+(col+.5)*12,cy=ARENA.top+(row+.5)*12;
    if(skipKing&&Math.abs(cx-W/2)<36&&KING_Y.some(ky=>Math.abs(cy-ky)<36))continue;
    bits|=ARENA_TILEMAP[row][col];
  }
  return bits;
}
export const inKingBlock=(x,y)=>x>=W/2-36&&x<W/2+36&&KING_Y.some(ky=>y>=ky-36&&y<ky+36);
export const onBridge=x=>LANES.some(lane=>Math.abs(x-lane)<BRIDGE.halfWidth-1e-7);
export const laneAt=(x,team)=>Math.abs(x-W/2)<1e-7?1-team:x<W/2?0:1;
export function arenaCellBits(x,y){const col=Math.max(0,Math.min(35,Math.floor((x-ARENA.left)/12))),row=Math.max(0,Math.min(63,Math.floor((y-ARENA.top)/12)));return ARENA_TILEMAP[row][col];}
export function pullPosition(unit,nx,ny){
  const bounded=(v,min,max)=>Math.max(min+1e-6,Math.min(max-1e-6,v));
  nx=bounded(nx,ARENA.left,ARENA.right);ny=bounded(ny,ARENA.top,ARENA.bottom);
  if(unit.card.flying)return{x:nx,y:ny};
  // Pulls stop independently at water half-cell edges. The other axis keeps
  // moving, allowing a unit on the bank or bridge edge to slide along it.
  const axis=(from,to,other,horizontal)=>{
    const origin=horizontal?ARENA.left:ARENA.top,dir=Math.sign(to-from);if(!dir)return to;
    let boundary=origin+(dir>0?Math.floor((from-origin)/12)+1:Math.ceil((from-origin)/12)-1)*12;
    while(dir*(to-boundary)>=-1e-7){
      const v=boundary+dir*1e-6,x=horizontal?v:other,y=horizontal?other:v;
      if(arenaCellBits(x,y)&32)return boundary-dir*1e-6;
      boundary+=dir*12;
    }
    return to;
  };
  return{x:axis(unit.x,nx,unit.y,true),y:axis(unit.y,ny,unit.x,false)};
}
// Historical snapshots keep body/range/speed in native units. Only positions
// migrate, with lane/tower/bank anchors mapped piecewise rather than scaled stats.
const migrateAxis=(v,oldPoints,newPoints)=>{let i=1;while(i<oldPoints.length-1&&v>oldPoints[i])i++;return newPoints[i-1]+(v-oldPoints[i-1])/(oldPoints[i]-oldPoints[i-1])*(newPoints[i]-newPoints[i-1]);};
export const migrateLegacyX=x=>migrateAxis(x,[0,46,158,300,442,554,600],[84,96,168,300,432,504,516]);
export const migrateLegacyY=y=>migrateAxis(y,[0,40,94,172,388,412,628,706,760,800],[16,28,88,172,376,424,628,712,772,784]);
