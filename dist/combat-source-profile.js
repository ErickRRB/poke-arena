// A produced profile survives its source actor. The current actor/catalog is a fallback.
export function combatSourceProfile(carrier,game,actor){
  return carrier?.sourceCard||carrier?.card||carrier?.attacker?.card||carrier?.attacker?.guard||carrier?.unit?.card||actor?.card||actor?.guard||game?.cardFor?.(carrier?.sourceKey??carrier?.key);
}
