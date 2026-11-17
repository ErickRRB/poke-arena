import {TOWER_MOUNTS} from './sprite-motion.js?v=34';

const royal=tower=>tower?.king&&(tower.guard?.id===31||tower.guard?.id===34);
export function towerGuardianScale(tower){
  return royal(tower)?1.32:tower.king?1.15:1.3;
}
// Render-only mapping of an unprojected native point about the same foot mount.
// The engine's emissionPoint, projectile data and all collision bodies stay native.
export function guardianEmitterPoint(tower,point){
  if(!royal(tower))return point;
  const ratio=towerGuardianScale(tower)/1.15,mount=tower.y-TOWER_MOUNTS.king;
  return{x:tower.x+(point.x-tower.x)*ratio,y:mount+(point.y-mount)*ratio};
}
