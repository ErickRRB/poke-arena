export const TEST_SUITES=Object.freeze({
  deck:['deck-storage.test.mjs'],
  battle:['engine.test.mjs','combat.test.mjs','attack-scheduling.test.mjs','crowd-movement.test.mjs','attack-roles.test.mjs','new-archetypes.test.mjs','classic-archetypes.test.mjs','expansion.test.mjs','grid-spells-roles.test.mjs'],
  placement:['arena-layout.test.mjs','placement-targeting.test.mjs','mobile-balance.test.mjs'],
  rendering:['placement-preview.test.mjs','themed-effects.test.mjs','sprite-motion.test.mjs','attack-choreography.test.mjs','attack-contact-clock.test.mjs','combat-feedback.test.mjs','flight-continuity.test.mjs','quick-stats.test.mjs'],
  online:['online.test.mjs','online-client.test.mjs','realtime-match.test.mjs'],
  server:['media-route.test.mjs'],
  audio:['audio-recovery.test.mjs','audio-catalog.test.mjs'],
  balance:['balance.test.mjs','balance-sandbox.test.mjs','thresholds.test.mjs','balance-role-audit.test.mjs','current-reference.test.mjs'],
  tooling:['test-suites.test.mjs'],
});

export function selectTests(names){
  if(!names.length)throw new Error('Indicá una sección. Usá --list para ver las opciones; all ejecuta la suite completa.');
  const unknown=names.filter(name=>name!=='all'&&!Object.hasOwn(TEST_SUITES,name));
  if(unknown.length)throw new Error(`Sección desconocida: ${unknown.join(', ')}.`);
  return [...new Set(names.flatMap(name=>name==='all'?Object.values(TEST_SUITES).flat():TEST_SUITES[name]))];
}
