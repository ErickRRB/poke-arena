export const TEST_SUITES=Object.freeze({
  deck:['deck-storage.test.mjs','canonical-selection.test.mjs','deck-provenance.test.mjs','deck-editor-profile.test.mjs'],
  battle:['engine.test.mjs','combat.test.mjs','blastoise-cannon.test.mjs','electric-sequence.test.mjs','spawn-origin.test.mjs','spell-event-identities.test.mjs','attack-scheduling.test.mjs','crowd-movement.test.mjs','attack-roles.test.mjs','new-archetypes.test.mjs','classic-archetypes.test.mjs','expansion.test.mjs','grid-spells-roles.test.mjs','tower-structure-distance.test.mjs','interaction-timing.test.mjs','knockback.test.mjs','live-target-priority.test.mjs'],
  placement:['arena-layout.test.mjs','placement-targeting.test.mjs','placement-input.test.mjs','mobile-balance.test.mjs','spell-footprints.test.mjs','summon-preview.test.mjs'],
  rendering:['ui-resource-load.test.mjs','health-visibility.test.mjs','bite-contours.test.mjs','native-sprite-sampling.test.mjs','canvas-raster.test.mjs','vine-contact.test.mjs','field-motion.test.mjs','charizard-presentation.test.mjs','fire-presentation-clock.test.mjs','vfx-assets.test.mjs','electric-hop-render.test.mjs','electric-lore.test.mjs','meowth-guardian-art.test.mjs','spell-carriers.test.mjs','initial-card-marker.test.mjs','arena-projection.test.mjs','tower-health-overlay.test.mjs','soft-area-guides.test.mjs','placement-preview.test.mjs','active-field-feedback.test.mjs','spell-indicator-lifecycle.test.mjs','battle-phase-ui.test.mjs','themed-effects.test.mjs','sprite-motion.test.mjs','attack-choreography.test.mjs','attack-contact-clock.test.mjs','native-contact-delivery.test.mjs','zero-windup-contact.test.mjs','projectile-contact-origin.test.mjs','combat-feedback.test.mjs','projectile-continuity.test.mjs','flight-continuity.test.mjs','golem-hurt.test.mjs','quick-stats.test.mjs','structure-art.test.mjs','unit-visibility.test.mjs','replacement-identities.test.mjs','voltorb-visual-scale.test.mjs','alakazam-visual.test.mjs'],
  online:['madriguera-identity.test.mjs','online.test.mjs','online-client.test.mjs','online-client-rtt.test.mjs','online-perf.test.mjs','realtime-match.test.mjs'],
  server:['asset-origin.test.mjs','media-route.test.mjs'],
  audio:['audio-soft-walk.test.mjs','audio-soft-gain.test.mjs','audio-knight.test.mjs','audio-recovery.test.mjs','audio-catalog.test.mjs','music.test.mjs','clean-audio-bank.test.mjs','audio-levels.test.mjs','audio-gain-feedback.test.mjs'],
  balance:['balance.test.mjs','balance-sandbox.test.mjs','thresholds.test.mjs','balance-role-audit.test.mjs','current-reference.test.mjs','native-interactions.test.mjs','native-arena.test.mjs','native-generators-pull.test.mjs','catalog-initialization.test.mjs'],
  tooling:['test-suites.test.mjs','quality-review-gate.test.mjs','publish-frontend.test.mjs','review-baseline-adapter.test.mjs','review-tower-scenario.test.mjs','review-workbench-finalize.test.mjs','review-workbench-partial.test.mjs','review-workbench-png.test.mjs','review-workbench-timing.test.mjs','review-workbench-origin.test.mjs','review-workbench-summary.test.mjs','review-workbench-channels.test.mjs','review-workbench.test.mjs'],
  sandbox:['sandbox.test.mjs'],
});

export function selectTests(names){
  if(!names.length)throw new Error('Indicá una sección. Usá --list para ver las opciones; all ejecuta la suite completa.');
  const unknown=names.filter(name=>name!=='all'&&!Object.hasOwn(TEST_SUITES,name));
  if(unknown.length)throw new Error(`Sección desconocida: ${unknown.join(', ')}.`);
  return [...new Set(names.flatMap(name=>name==='all'?Object.values(TEST_SUITES).flat():TEST_SUITES[name]))];
}
