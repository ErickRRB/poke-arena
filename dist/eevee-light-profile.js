import { getC4BaseCard } from './c4-catalog.js?v=1';

// Candidate for a future, explicitly identified producer. C4-1 stays unchanged.
let profile;
export const LIGHT_EEVEE_IDENTITY = 'ArenaLightEevee';
export function getEeveeLightProfile() {
  if (profile) return profile;
  const base = getC4BaseCard('eevee');
  if (!base || base.id !== 133) throw new Error('Eevee base profile unavailable');
  const value = structuredClone(base);
  Object.assign(value, {
    cost: 2, hp: 420, damage: 100, interval: 1.2, range: 18,
    speed: 43.2, moveSpeed: 43.2, pullSpeed: 43.2,
    role: 'Ciclo · presión', description: 'Se acerca rápido y ataca a un objetivo.',
    style: 'slam', attackAnim: 'Attack', attackDuration: 0.55, windup: 0.25,
    nativeReference: LIGHT_EEVEE_IDENTITY,
    charge: false, chargeDistance: 0, chargeSpeed: 0, chargeDamage: 0,
    riverJump: false, knockbackImmune: false
  });
  const freeze = item => {
    if (item && typeof item === 'object' && !Object.isFrozen(item)) {
      Object.values(item).forEach(freeze);
      Object.freeze(item);
    }
    return item;
  };
  profile = freeze(value);
  return profile;
}
