export const TEST_SUITES=Object.freeze({
  deck:['deck-storage.test.mjs'],
  battle:['engine.test.mjs','combat.test.mjs','blastoise-cannon.test.mjs','electric-sequence.test.mjs','spawn-origin.test.mjs','spell-event-identities.test.mjs','attack-scheduling.test.mjs','crowd-movement.test.mjs','attack-roles.test.mjs','new-archetypes.test.mjs','classic-archetypes.test.mjs','expansion.test.mjs','grid-spells-roles.test.mjs','interaction-timing.test.mjs','knockback.test.mjs'],
  placement:['arena-layout.test.mjs','placement-targeting.test.mjs','mobile-balance.test.mjs','spell-footprints.test.mjs'],
  rendering:['native-sprite-sampling.test.mjs','canvas-raster.test.mjs','vine-contact.test.mjs','field-motion.test.mjs','charizard-presentation.test.mjs','vfx-assets.test.mjs','electric-hop-render.test.mjs','spell-carriers.test.mjs','initial-card-marker.test.mjs','arena-projection.test.mjs','tower-health-overlay.test.mjs','soft-area-guides.test.mjs','placement-preview.test.mjs','active-field-feedback.test.mjs','spell-indicator-lifecycle.test.mjs','battle-phase-ui.test.mjs','themed-effects.test.mjs','sprite-motion.test.mjs','attack-choreography.test.mjs','attack-contact-clock.test.mjs','native-contact-delivery.test.mjs','zero-windup-contact.test.mjs','projectile-contact-origin.test.mjs','combat-feedback.test.mjs','projectile-continuity.test.mjs','flight-continuity.test.mjs','golem-hurt.test.mjs','quick-stats.test.mjs','structure-art.test.mjs','replacement-identities.test.mjs'],
  online:['online.test.mjs','online-client.test.mjs','realtime-match.test.mjs'],
  server:['media-route.test.mjs'],
  audio:['audio-recovery.test.mjs','audio-catalog.test.mjs','music.test.mjs','clean-audio-bank.test.mjs'],
  balance:['balance.test.mjs','balance-sandbox.test.mjs','thresholds.test.mjs','balance-role-audit.test.mjs','current-reference.test.mjs','native-interactions.test.mjs','native-arena.test.mjs','native-generators-pull.test.mjs','catalog-initialization.test.mjs'],
  tooling:['test-suites.test.mjs','quality-review-gate.test.mjs'],
  sandbox:['sandbox.test.mjs'],
});

export function selectTests(names){
  if(!names.length)throw new Error('Indicá una sección. Usá --list para ver las opciones; all ejecuta la suite completa.');
  const unknown=names.filter(name=>name!=='all'&&!Object.hasOwn(TEST_SUITES,name));
  if(unknown.length)throw new Error(`Sección desconocida: ${unknown.join(', ')}.`);
  return [...new Set(names.flatMap(name=>name==='all'?Object.values(TEST_SUITES).flat():TEST_SUITES[name]))];
}
