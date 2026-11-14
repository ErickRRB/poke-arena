import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const option = (name, fallback) => process.argv.find(v => v.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback;
const baselineRoot = path.resolve(option('baseline', root));
const candidateRoot = path.resolve(option('candidate', path.join(root, '../pokemon-arena')));
const output = path.resolve(root, option('output', 'docs/visual-followup/native-combat-transition'));
const generatedAt = new Date().toISOString();
const captureId = generatedAt.replaceAll(/[^0-9A-Za-z]/g, '-');
const cacheRoot = path.join(root, 'qa/native-combat-transition', captureId);
const reuseFilename = option('reuse-input', '');
const reusedInventory = reuseFilename ? JSON.parse(await readFile(path.resolve(root, reuseFilename), 'utf8')) : null;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const stable = value => JSON.stringify(value, (_, v) => v && !Array.isArray(v) && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
const equal = (a, b) => stable(a) === stable(b);
await mkdir(output, { recursive: true });

async function freeze(label, directory) {
  const destination = path.join(cacheRoot, label); await mkdir(destination, { recursive: true });
  const inherited = reusedInventory?.[label], readDirectory = inherited ? path.resolve(root, inherited.frozenCache) : directory;
  const files = inherited ? inherited.inputs.map(input => input.file) : (await readdir(path.join(directory, 'dist'))).filter(n => n.endsWith('.js')).map(n => `dist/${n}`);
  if (!inherited) files.push('dist/assets/pokemon/manifest.json');
  const bytes = new Map(), inputs = [];
  for (const file of files.sort()) {
    const data = await readFile(path.join(readDirectory, file));
    if (inherited) assert.equal(sha(data), inherited.inputs.find(i=>i.file===file).sha256, `Frozen input changed: ${label}/${file}`);
    bytes.set(file, data); inputs.push({ file, bytes: data.length, sha256: sha(data) });
    const target = path.join(destination, file); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, data);
  }
  await writeFile(path.join(destination, 'package.json'), '{"type":"module"}\n');
  const changedDuringFreeze = [];
  for (const input of inputs) if (sha(await readFile(path.join(readDirectory, input.file))) !== input.sha256) changedDuringFreeze.push(input.file);
  assert.deepEqual(changedDuringFreeze, [], `${label} changed while freezing; rerun the inventory`);
  const engine = await import(pathToFileURL(path.join(destination, 'dist/engine.js')).href);
  const motion = await import(pathToFileURL(path.join(destination, 'dist/sprite-motion.js')).href + '?v=26');
  const geometry = await import(pathToFileURL(path.join(destination, 'dist/sprite-geometry.js')).href);
  const manifest = JSON.parse(bytes.get('dist/assets/pokemon/manifest.json'));
  const cards = JSON.parse(JSON.stringify(engine.CARDS));
  const game = new engine.Game({ seed: 833 }); // Constructor inventory only: no step, attack, render or battle test.
  const towers = game.towers.map(t => ({ team: t.team, lane: t.lane, king: t.king, active: t.active, radius: t.radius, range: t.range, interval: t.interval, windup: t.windup ?? .18, storedInitialAttackDuration: t.attackDuration, damage: t.damage, projectileSpeed: t.projectileSpeed, projectileStart: t.projectileStart, guard: t.guard }));
  const publicInfo = { label, sourceDirectory: directory, gitHead: inherited?.gitHead || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8', windowsHide: true }).trim(),
    workingTreeStatus: inherited?.workingTreeStatus || execFileSync('git', ['status', '--short', '--untracked-files=normal'], { cwd: directory, encoding: 'utf8', windowsHide: true }).trim().split(/\r?\n/).filter(Boolean),
    inputs, snapshotSha256: sha(Buffer.from(inputs.map(i=>`${i.file}:${i.sha256}`).join('\n'))), changedDuringFreeze, frozenCache: path.relative(root, destination).replaceAll('\\', '/'), catalogueKeys: Object.keys(cards).length, bodyKeys: Object.values(cards).filter(c => c.id).length };
  if (inherited) { publicInfo.reusedCoherentCut = inherited.frozenCache; publicInfo.originalCutGeneratedAt = reusedInventory.sourceCutGeneratedAt || reusedInventory.generatedAt; }
  return { directory, publicInfo, cards, towers, manifest, motion, geometry: geometry.SPRITE_GEOMETRY, sources: Object.fromEntries([...bytes].filter(([name]) => name.endsWith('.js')).map(([name, data]) => [name, data.toString('utf8')])) };
}
const baseline = await freeze('baseline', baselineRoot);
const candidate = await freeze('candidate', candidateRoot);
const bodyFields = new Set(['id', 'name', 'scale', 'token', 'count', 'squad', 'deployTime', 'deployStagger', 'spawnWith', 'summon', 'summonCount', 'summonMax', 'summonEvery', 'firstSummon', 'summonDeployTime', 'summonSpacing', 'deathSpawn', 'deathCount', 'split', 'splitCount', 'spawnKey', 'spawnTotal', 'spawnEvery', 'spawnRadius', 'spawnFirstDelay', 'spawnDeployTime', 'structure', 'structureArt', 'platform', 'burrow', 'moveAnim', 'moveFrames', 'moveFrameDuration', 'idleAnim', 'movementAnchor']);
const controls = new Set(['range', 'radius', 'speed', 'mass', 'pullRange', 'air', 'flying', 'building', 'sightRange', 'passive', 'style', 'muzzleHeight', 'pierce', 'cone', 'splash', 'chain', 'bolts', 'burn', 'burnKind', 'slow', 'slowFactor', 'slowAttackFactor', 'stun', 'freeze', 'copy', 'suicide', 'ttl', 'ability', ...bodyFields]);
const isControl = field => controls.has(field) || /attack|anim|frame|gesture|emitter|windup|interval|burst|shot|projectile|ranged|deploy|spawn|summon|dash|blink|charge|jump|leap|field|wave|castDelay|travel|knockback|entry|death|heal|chain/i.test(field);
const effectiveRanged = card => card ? !!(card.rangedAttack ?? card.range >= 50) : null;
function delivery(card, side) {
  if (!card || card.spell) return card?.spell ? 'spell' : null;
  if (card.passive || !(card.damage > 0)) return 'passive';
  if (card.rollingShot) return 'rolling-ground-projectile';
  if (card.style === 'psychic') return 'linear-psychic-projectile';
  if (card.bolts) return 'multi-beam';
  if (['lightning', 'vine'].includes(card.style)) return 'beam';
  if (card.style === 'flame') return 'flame-cone';
  const ranged = side.publicInfo.label === 'baseline' ? card.range >= 50 : effectiveRanged(card);
  return ranged ? 'ground-path-projectile' : 'melee';
}
const falseDefaults = new Set(['air','flying','building','structure','passive','pierce','split','riverJump','burrow','suicide','dash','knockbackImmune','selfSplash','copy']);
const zeroDefaults = new Set(['burstSpacing','bolts','splash','burn','poisonField','slow','stun','freeze','chain','cone','charge','blink','ttl','deployStagger','entryDamage','entryRadius','entryStun','entrySlow','entryShield','entryTowerDamage','deathDamage','deathRadius','deathHeal','deathStun','heal','healEvery','deathCount','deathKnockback','deathField','summonMax','projectileStart','projectileRange','knockback','shotRadius','fieldDamage','fieldTowerDamage','fieldBuildingDamage']);
const physicsFields = new Set(['speed','radius','sightRange','mass','pullRange']);
const bookkeepingFields = new Set(['attackRoleOverride','attackKind']);
function semantic(side, card, field) {
  if (!card) return undefined;
  if (field === 'emitter') return side.motion.emitterPart(card);
  if (field === 'rangedAttack') return effectiveRanged(card);
  if (field === 'burst' || field === 'count') return card[field] || 1;
  if (field === 'burstSpacing' && (card.burst || 1) === 1) return 0;
  if (field === 'summonMax' && !card.summon) return 0;
  if (field === 'deathCount' && !card.deathSpawn) return 0;
  if (field === 'deathAir' || field === 'deathRadius') return card.deathDamage ? card[field] ?? (field === 'deathAir' ? true : 0) : null;
  if (field === 'deployTime') return card.spell || card.token ? null : card.deployTime ?? .75;
  if (field === 'deployStagger' && (card.count || 1) === 1) return 0;
  if (field === 'radius') return card.radius ?? 12;
  if (field === 'mass') return card.mass ?? 1;
  if (field === 'projectileHoming') return card.projectileHoming ?? true;
  let value = card[field];
  if (falseDefaults.has(field)) return !!value;
  if (value === undefined || value === null) return zeroDefaults.has(field) ? 0 : null;
  return typeof value === 'number' ? Math.round(value * 1e7) / 1e7 : value;
}
const clipInfo = (side, card) => {
  if (!card?.id) return null;
  const animation = card.attackAnim || 'Attack', meta = side.manifest[card.id]?.[animation], g = side.geometry[card.id]?.[animation];
  return { animation, presentInManifest: !!meta, frameCount: meta?.durations?.length ?? 0, hitFrame: meta?.hitFrame ?? null, durations: meta?.durations ?? null, file: meta?.file ?? null, shadow: meta?.shadow ?? null,
    presentInGeometry: !!g, geometryViews: g?.points?.length ?? 0, geometryFramesByView: g?.points?.map(view => view.length) ?? [], meta };
};
function validate(side, key, card) {
  const active = !card.spell && !card.passive && (card.damage || 0) > 0;
  const issues = [], clip = clipInfo(side, card), basic = { issues, clip: null, active, effectiveRanged: effectiveRanged(card), delivery: delivery(card, side), emitter: card.id ? side.motion.emitterPart(card) : null, explicitEmitter: card.emitter ?? null, profile: Object.fromEntries(Object.entries(card).filter(([field]) => isControl(field))) };
  if (!clip) return basic;
  const frames = [];
  for (const frame of card.attackFrames || []) frames.push({ source: 'attackFrames', frame });
  if (card.attackContactFrame !== undefined) frames.push({ source: 'attackContactFrame', frame: card.attackContactFrame });
  for (const [index, gesture] of (card.attackGestures || []).entries()) for (const name of ['prepare', 'contact', 'follow', 'rest']) frames.push({ source: `attackGestures[${index}].${name}`, frame: gesture[name] });
  if (!clip.presentInManifest && active) issues.push({ severity: 'error', kind: 'missing_attack_animation', key, animation: clip.animation });
  for (const ref of frames) if (!Number.isInteger(ref.frame) || ref.frame < 0 || ref.frame >= clip.frameCount) issues.push({ severity: 'error', kind: 'frame_out_of_bounds', key, animation: clip.animation, frameCount: clip.frameCount, ...ref });
  if (card.attackFrames?.length === 0) issues.push({ severity: 'error', kind: 'empty_attack_frames', key });
  if (card.attackFrames?.length && card.attackContactFrame !== undefined && !card.attackFrames.includes(card.attackContactFrame)) issues.push({ severity: 'error', kind: 'contact_not_in_attack_frames', key, contact: card.attackContactFrame, frames: card.attackFrames });
  if (active && !clip.presentInGeometry) issues.push({ severity: 'error', kind: 'missing_attack_geometry', key, animation: clip.animation });
  for (const ref of frames) if (Number.isInteger(ref.frame) && clip.geometryFramesByView.some(count => ref.frame >= count)) issues.push({ severity: 'error', kind: 'frame_missing_in_geometry', key, animation: clip.animation, ...ref });
  const lastRelease = (card.windup ?? .3) + Math.max(0, (card.burst || 1) - 1) * (card.burstSpacing || 0);
  if (active && lastRelease > card.attackDuration + 1e-7) issues.push({ severity: 'error', kind: 'release_after_visual_duration', key, lastRelease, duration: card.attackDuration });
  else if (active && lastRelease >= card.attackDuration - 1e-7) issues.push({ severity: 'review', kind: 'no_post_contact_visual_window', key, lastRelease, duration: card.attackDuration });
  if (active && card.windup >= card.interval - 1e-7) issues.push({ severity: 'review', kind: 'windup_meets_or_exceeds_interval', key, windup: card.windup, interval: card.interval });
  if ((card.burst || 1) === 1 && card.attackGestures?.length > 1) issues.push({ severity: 'note', kind: 'unused_gesture_variants_after_single_hit', key, gestures: card.attackGestures.length });
  if (delivery(card, side) === 'ground-path-projectile' && card.range < 50) issues.push({ severity: 'review', kind: 'explicit_ranged_below_legacy_range_threshold', key, range: card.range, emitter: side.motion.emitterPart(card) });
  if (delivery(card, side) === 'ground-path-projectile' && ['punch', 'slash', 'bite', 'slam', 'horn', 'dash'].includes(card.style) && !card.projectileArt) issues.push({ severity: 'review', kind: 'ranged_delivery_with_physical_style', key, style: card.style, emitter: side.motion.emitterPart(card) });
  const part = side.motion.emitterPart(card), markerOffsets = part === 'body' ? [2, 3] : part === 'hands' || part === 'leadHand' || part === 'cannons' ? [6, 7, 8, 9] : [4, 5];
  const contacts = card.attackGestures?.map(g => g.contact) || [card.attackContactFrame ?? clip.hitFrame];
  for (const frame of new Set(contacts.filter(Number.isInteger))) {
    for (const [direction, view] of (side.geometry[card.id]?.[clip.animation]?.points || []).entries()) {
      const points = view[frame]; if (!points || markerOffsets.some(offset => !Number.isFinite(points[offset]))) issues.push({ severity: 'error', kind: 'missing_emitter_marker', key, part, direction, frame });
    }
  }
  const publicClip = { ...clip }; delete publicClip.meta;
  return { ...basic, issues, clip: publicClip, emitter: part, lastScheduledRelease: lastRelease,
    referencedFrames: frames, plannedContacts: contacts, profile: Object.fromEntries(Object.entries(card).filter(([field]) => isControl(field))) };
}
function children(side, key) {
  const c = side.cards[key]; if (!c) return [];
  const edges = [], add = (kind, ref, count, extra = {}) => {
    if (typeof ref === 'string') edges.push({ kind, key: ref, id: side.cards[ref]?.id ?? null, count, ...extra });
  };
  for (const ref of new Set(c.squad || [])) add('squad', ref, c.squad.filter(k => k === ref).length);
  add('spawn_with', c.spawnWith, 1);
  add('summon_wave', c.summon, c.summonCount || 1, { firstDelay: c.firstSummon ?? c.summonEvery ?? 0, every: c.summonEvery ?? null, deploymentDelay: c.summonDeployTime ?? null });
  add('death_spawn', c.deathSpawn, c.deathCount || 1, { delay: c.deathSpawnDelay ?? .4 });
  add('spell_spawn_schedule', c.spawnKey, c.spawnTotal || 1, { every: c.spawnEvery ?? null, firstDelay: c.spawnFirstDelay ?? null });
  if (c.split) {
    const legacy = side.sources['dist/engine.js'].match(/for\(const offset of\[([^\]]+)\]\)this\.spawn\('(geodudeToken|geodude)'/);
    assert(legacy || c.splitCount, `Unknown legacy split count for ${key}; inspect the frozen engine before reporting bodies`);
    add('legacy_split', legacy?.[2] || 'geodudeToken', c.splitCount || legacy[1].split(',').length, { derivedFromFrozenEngine: true });
  }
  return edges;
}
const rows = [], findings = [];
const keys = [...new Set([...Object.keys(baseline.cards), ...Object.keys(candidate.cards)])].sort();
for (const key of keys) {
  const before = baseline.cards[key], after = candidate.cards[key];
  const changed = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])].filter(field => !equal(before?.[field], after?.[field]));
  const rawControlChanges = changed.filter(isControl), semanticControlChanges = rawControlChanges.filter(field => !equal(semantic(baseline, before, field), semantic(candidate, after, field)));
  const controlChanges = semanticControlChanges.filter(field => !physicsFields.has(field) && !bookkeepingFields.has(field));
  const movementPhysicsChanges = semanticControlChanges.filter(field => physicsFields.has(field));
  const defaultOrBookkeepingChanges = rawControlChanges.filter(field => !semanticControlChanges.includes(field) || bookkeepingFields.has(field));
  const statOnlyChanges = changed.filter(field => !isControl(field));
  const b = before ? validate(baseline, key, before) : null, a = after ? validate(candidate, key, after) : null;
  const rangedChanged = b?.effectiveRanged !== a?.effectiveRanged, emitterChanged = b?.emitter !== a?.emitter;
  const deliveryChanged = b?.delivery !== a?.delivery;
  const bodyChanges = controlChanges.filter(field => bodyFields.has(field));
  const row = { key, name: after?.name || before?.name, beforeId: before?.id ?? null, afterId: after?.id ?? null, nativeReference: after?.nativeReference ?? null,
    scope: !before ? 'added' : !after ? 'removed' : controlChanges.length || rangedChanged || emitterChanged || deliveryChanged ? 'integrated_visual_qa_required' : movementPhysicsChanges.length ? 'movement_physics_only' : changed.length ? 'stats_or_copy_only' : 'unchanged',
    changedFields: changed, rawControlChanges, controlChanges, movementPhysicsChanges, defaultOrBookkeepingChanges, statOnlyChanges, bodyChanges, effectiveRangedChanged: rangedChanged, emitterChanged, deliveryChanged,
    before: b, after: a, childrenBefore: children(baseline, key), childrenAfter: children(candidate, key), changedValues: Object.fromEntries(changed.map(field => [field, { before: before?.[field] ?? null, after: after?.[field] ?? null }])) };
  if (a && before?.attackAnim !== after.attackAnim && ['attackFrames', 'attackGestures', 'attackContactFrame'].some(field => after[field] !== undefined && equal(before?.[field], after[field]))) a.issues.push({ severity: 'review', kind: 'animation_changed_with_inherited_frame_profile', key, beforeAnimation: before.attackAnim, afterAnimation: after.attackAnim });
  if (a && before?.id !== after.id && after.emitter && before?.emitter === after.emitter) a.issues.push({ severity: 'review', kind: 'species_changed_with_explicit_inherited_emitter', key, emitter: after.emitter });
  if (a && rangedChanged && after.emitter && before?.emitter === after.emitter) a.issues.push({ severity: 'review', kind: 'delivery_mode_changed_with_inherited_emitter', key, emitter: after.emitter });
  if (a && before && before.id !== after.id) a.issues.push({ severity: 'review', kind: 'body_identity_changed', key, beforeId: before.id ?? null, afterId: after.id ?? null });
  rows.push(row); if (a && !['unchanged', 'stats_or_copy_only', 'movement_physics_only'].includes(row.scope)) findings.push(...a.issues);
}
const changedKeys = new Set(rows.filter(r => r.scope === 'integrated_visual_qa_required' || r.scope === 'added' || r.scope === 'removed').map(r => r.key));
for (const row of rows) {
  row.changedChildren = row.childrenAfter.filter(child => changedKeys.has(child.key)).map(child => child.key);
  if (row.changedChildren.length && ['unchanged', 'stats_or_copy_only'].includes(row.scope)) row.scope = 'deployment_dependency_qa_required';
}
function derivedTowerAttack(side, tower) {
  const source = side.sources['dist/engine.js'];
  const usesTowerWindup = source.includes('const windup = card?.windup ?? attacker.windup ?? .18;');
  const usesExtendedDuration = source.includes('const duration = card?.attackDuration || Math.max(.6,(attacker.windup??.18)+.16);');
  assert(usesTowerWindup || source.includes('const windup = card?.windup ?? .18;'), 'Unrecognized tower windup expression; inspect the frozen source');
  assert(usesExtendedDuration || source.includes('const duration = card?.attackDuration || .6;'), 'Unrecognized tower duration expression; inspect the frozen source');
  const windup = usesTowerWindup ? tower.windup : .18, duration = usesExtendedDuration ? Math.max(.6, windup + .16) : .6;
  return { basis: 'static derivation from the frozen Game.attack source; not an executed attack', windup, duration,
    guardValidation: validate(side, `guard-${tower.guard.id}`, { ...tower.guard, damage: tower.damage, interval: tower.interval, range: tower.range, attackDuration: duration, windup }) };
}
const towerComparisons = candidate.towers.map((after, i) => {
  const before = baseline.towers[i], fields = [...new Set([...Object.keys(before || {}), ...Object.keys(after)])].filter(key => !equal(before?.[key], after[key]));
  return { key: `${after.king ? 'king' : 'princess'}-team${after.team}-lane${after.lane}`, changedFields: fields, before, after,
    beforeAttack: derivedTowerAttack(baseline, before), afterAttack: derivedTowerAttack(candidate, after),
    windupMeetsInterval: after.windup >= after.interval - 1e-7, needsIntegratedQA: fields.length > 0 };
});
const code = candidate.sources['dist/engine.js'], renderer = candidate.sources['dist/render.js'], visual = candidate.sources['dist/combat-visuals.js'];
const copyFields = code.match(/for\(const key of\[([^\]]+)\]\)if\(key in target.card\)/)?.[1].match(/'[^']+'/g)?.map(v=>v.slice(1,-1)) || [];
const probes = { releaseBeforeTowerLoop: /this\.releaseAttacks\(\);\s*for\s*\(const tower/.test(code), rendererUsesLegacyRangeForLunge: /card(?:\?\.|\.)range\s*<\s*50/.test(renderer), combatVisualUsesLegacyRangeForAreaProjectile: /card\.range\s*>=\s*50/.test(visual), engineUsesExplicitRangedAttack: /card\.rangedAttack\?\?card\.range>=50/.test(code), copyFields, nativeDeliveryFieldsNotCopied: ['rangedAttack','projectileStart','projectileHoming'].filter(f=>!copyFields.includes(f)), cameraAndScaleValidation: 'deferred_until_final_engine_and_camera_checkpoint' };
const assetInputs = [];
for (const side of [baseline, candidate]) {
  const files = new Set();
  for (const row of rows.filter(row => !['unchanged', 'stats_or_copy_only', 'movement_physics_only'].includes(row.scope))) {
    const profile = row[side === baseline ? 'before' : 'after']; if (!profile?.clip?.file) continue;
    files.add(`dist/${profile.clip.file}`); if (profile.clip.shadow) files.add(`dist/${profile.clip.shadow}`); files.add(`dist/${profile.clip.file.replace(/-Anim\.png$/, '-Offsets.png')}`);
  }
  for (const tower of towerComparisons) {
    const clip = tower[side === baseline ? 'beforeAttack' : 'afterAttack'].guardValidation.clip;
    if (clip?.file) { files.add(`dist/${clip.file}`); if (clip.shadow) files.add(`dist/${clip.shadow}`); files.add(`dist/${clip.file.replace(/-Anim\.png$/, '-Offsets.png')}`); }
  }
  for (const file of [...files].sort()) {
    try { const bytes = await readFile(path.join(side.directory, file)); const png = file.endsWith('.png') && bytes.readUInt32BE(0) === 0x89504e47; assetInputs.push({ side: side.publicInfo.label, file, sha256: sha(bytes), bytes: bytes.length, ...(png ? { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) } : {}) }); }
    catch (error) { if (error.code !== 'ENOENT') throw error; assetInputs.push({ side: side.publicInfo.label, file, missing: true }); }
  }
}
const qaKeys = rows.filter(r => !['unchanged', 'stats_or_copy_only', 'movement_physics_only'].includes(r.scope)).map(r => r.key);
const groups = [
  { id: 'P0-frames', purpose: 'Resolve invalid clip indices/geometry before browser QA; valid indices do not prove an appropriate gesture.', keys: [...new Set(findings.filter(f => f.severity === 'error').map(f => f.key))] },
  { id: 'P1-contact-clock', purpose: 'For each changed cadence/burst/animation: automatic and direct attacks at 30/60 Hz, at least 3 cycles; gesture contact at real attackRelease, target impact at damage, recovery, no clock rewind; snapshots at 15 Hz. Projectile damage need not coincide with release.', keys: rows.filter(r => r.after?.active && r.after?.clip && r.controlChanges.some(f => /attack|windup|interval|burst/i.test(f))).map(r => r.key) },
  { id: 'P1-emitter-delivery', purpose: 'Eight actual views of changed delivery/clip/emitter/projectile origin; verify first release, visual attachment and path handoff, without remeasuring global scales.', keys: rows.filter(r => r.after?.active && r.after?.clip && (r.deliveryChanged || r.emitterChanged || r.controlChanges.some(f => /projectile|emitter|style|attackAnim|attackFrames|attackGestures|attackContactFrame/.test(f)))).map(r => r.key) },
  { id: 'P1-full-windup', purpose: 'Towers with windup=interval and Tesla control: first attack, sustained firing, next sequence, reacquisition, stun, pause and 15 Hz packet batches. Check event order and visible contact independently; Tesla equality is not assumed if absent in this cut. Also verify the two changed King guards after activation.', keys: [...new Set(['ampharos', ...findings.filter(f => f.kind === 'windup_meets_or_exceeds_interval').map(f => f.key)])], towerGuards: [...new Set(candidate.towers.map(t => t.guard.id))], towers: towerComparisons.filter(t => t.windupMeetsInterval).map(t => t.key), otherChangedTowers: towerComparisons.filter(t=>t.needsIntegratedQA&&!t.windupMeetsInterval).map(t=>t.key) },
  { id: 'P2-bodies', purpose: 'Deploy changed counts/squads and produce tokens from their real parent; check body identity, exact members, spawn timing, split lanes and one recovery into idle. No global scale audit.', keys: rows.filter(r => r.bodyChanges.some(f => !['scale','name','deployTime','deployStagger'].includes(f)) || r.changedChildren.length).map(r => r.key) },
  { id: 'P2-deployment-clock', purpose: 'Compare real deployment time and first available attack after spawn. A card whose only control change is deployment delay needs this bounded clock check, not a fresh eight-view pose gallery.', keys: rows.filter(r=>r.controlChanges.some(f=>['deployTime','deployStagger'].includes(f))).map(r=>r.key) },
  { id: 'P2-special-paths', purpose: 'Changed entry/death effects, dash/leap/copy/rolling/suicide/summon/spell schedules and ability removals use their actual engine path; a direct Game.attack fixture alone does not cover them.', keys: rows.filter(r => r.controlChanges.some(f => /entry|death|heal|dash|blink|charge|jump|leap|copy|rolling|suicide|summon|spawn|castDelay|wave|travel|ability/i.test(f))).map(r => r.key) },
  { id: 'P2-range-interaction', purpose: 'Changed attack reach or target eligibility: acquire just inside/outside the new reach and verify beam/cone/projectile/melee outcome against eligible ground/air targets. Reuse a contact-clock or delivery scene when possible.', keys: rows.filter(r => r.after?.active && r.controlChanges.some(f => ['range','air','building','pierce','splash','cone','chain','bolts'].includes(f))).map(r => r.key) },
  { id: 'P2-copy-contract', purpose: 'Ditto is a dependency case despite only movement metadata changing on its own card: transform into a changed explicit rangedAttack target below range 50 and a non-homing projectile target; verify delivery, projectile start and homing policy survive the copy.', keys: ['ditto'], targets: ['forretress','graveler'], staticRiskOnly: true },
];
const scopeCounts = Object.fromEntries([...new Set(rows.map(r=>r.scope))].map(scope=>[scope,rows.filter(r=>r.scope===scope).length]));
assert.equal(Object.values(scopeCounts).reduce((sum,count)=>sum+count,0), rows.length);
const summary = { catalogueKeysCompared: rows.length, baselineBodies: baseline.publicInfo.bodyKeys, candidateBodies: candidate.publicInfo.bodyKeys,
  changedControlKeys: rows.filter(r => r.scope === 'integrated_visual_qa_required').length, dependencyOnlyKeys: rows.filter(r => r.scope === 'deployment_dependency_qa_required').length,
  deploymentOnlyControlKeys: rows.filter(r=>r.controlChanges.length&&r.controlChanges.every(f=>['deployTime','deployStagger'].includes(f))).length,
  addedKeys: rows.filter(r=>r.scope==='added').length, removedKeys: rows.filter(r=>r.scope==='removed').length,
  statsOrCopyOnlyKeys: rows.filter(r => r.scope === 'stats_or_copy_only').length, movementPhysicsOnlyKeys: rows.filter(r=>r.scope==='movement_physics_only').length, unchangedKeys: rows.filter(r => r.scope === 'unchanged').length,
  scopeCounts, qaKeyCount: qaKeys.length, affectedBeforeBodyKeys: rows.filter(r=>qaKeys.includes(r.key)&&r.beforeId).length, affectedAfterBodyKeys: rows.filter(r=>qaKeys.includes(r.key)&&r.afterId).length,
  affectedBeforeSpeciesCount: new Set(rows.filter(r=>qaKeys.includes(r.key)&&r.beforeId).map(r=>r.beforeId)).size, affectedAfterSpeciesCount: new Set(rows.filter(r=>qaKeys.includes(r.key)&&r.afterId).map(r=>r.afterId)).size,
  affectedSpecies: [...new Set(rows.filter(r => qaKeys.includes(r.key)).flatMap(r => [r.beforeId, r.afterId]).filter(Boolean))].sort((a,b)=>a-b),
  structuralErrors: findings.filter(f => f.severity === 'error').length, reviewFindings: findings.filter(f => f.severity === 'review').length, changedTowers: towerComparisons.filter(t => t.needsIntegratedQA).length,
  towerStructuralErrors: towerComparisons.flatMap(t=>t.afterAttack.guardValidation.issues).filter(f=>f.severity==='error').length };
const inventory = { generatedAt, sourceCutGeneratedAt: reusedInventory?.sourceCutGeneratedAt || reusedInventory?.generatedAt || generatedAt, status: 'provisional_working_tree_inventory_not_validation', reusedCoherentCut: !!reusedInventory,
  generator: {file:'scripts/inventory-native-combat-transition.mjs',sha256:sha(await readFile(new URL(import.meta.url)))}, baseline: baseline.publicInfo, candidate: candidate.publicInfo,
  scope: 'Read-only frozen module exports, manifest/geometry/frame references and constructor tower data. No Game.step, attack, rendering, browser, camera, scale or combat verification.',
  oldEvidenceAppliesToNewConfiguration: false, normalization: 'Equivalent absent/false/0/1 defaults and float noise are recorded in raw changes but do not alone schedule sprite QA. Deployment defaults use the actual .75 fallback and do not apply to direct-only tokens/spells. Movement/collision-only changes are kept separate; actual delivery honors engine branch order, not just rangedAttack.', summary, sourceProbes: probes, findings, qaGroups: groups, qaKeys, cards: rows, towers: towerComparisons, assetInputs,
  assetsChangedSincePriorInventory: reusedInventory ? assetInputs.filter(a=>{const previous=reusedInventory.assetInputs.find(p=>p.side===a.side&&p.file===a.file);return previous&&!equal(previous,a);}).map(a=>({side:a.side,file:a.file})) : [] };
await writeFile(path.join(output, 'inventory-provisional.json'), JSON.stringify(inventory, null, 2) + '\n');
await writeFile(path.join(output, 'cards-baseline.json'), JSON.stringify(baseline.cards, null, 2) + '\n');
await writeFile(path.join(output, 'cards-main-working-tree.json'), JSON.stringify(candidate.cards, null, 2) + '\n');
const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
const columns = ['key','name','scope','beforeId','afterId','nativeReference','changedFields','controlChanges','bodyChanges','effectiveRangedChanged','emitterChanged',
  ...['Anim','Windup','Duration','Interval','Burst','Count','Range','EffectiveRanged','Delivery','Emitter','Frames','Gestures','Contact','DeployTime'].flatMap(field=>[`before${field}`,`after${field}`]), 'issues'];
function csvValues(row) {
  const values = { ...row, issues: row.after?.issues.map(f=>f.kind).join('|') };
  for (const [prefix, side] of [['before',baseline],['after',candidate]]) {
    const state = row[prefix], profile = state?.profile;
    const expanded = { Anim:state?.clip?.animation, Windup:profile?.windup, Duration:profile?.attackDuration, Interval:profile?.interval,
      Burst:profile?.burst, Count:profile?.count, Range:profile?.range, EffectiveRanged:state?.effectiveRanged, Delivery:state?.delivery, Emitter:state?.emitter,
      Frames:JSON.stringify(profile?.attackFrames??null), Gestures:JSON.stringify(profile?.attackGestures??null), Contact:profile?.attackContactFrame,
      DeployTime:state ? semantic(side,side.cards[row.key],'deployTime') : null };
    for (const [name,value] of Object.entries(expanded)) values[`${prefix}${name}`] = value;
  }
  return columns.map(column=>values[column]);
}
const csv = [columns, ...rows.map(csvValues)].map(row => row.map(v => quote(Array.isArray(v) ? v.join('|') : v)).join(',')).join('\n') + '\n';
await writeFile(path.join(output, 'all-key-transition.csv'), csv);
await writeFile(path.join(output, 'qa-minimum-provisional.json'), JSON.stringify({ status: inventory.status, candidateInputHashes: candidate.publicInfo.inputs, groups }, null, 2) + '\n');
console.log(JSON.stringify({ summary, baseline: baseline.publicInfo.gitHead, candidate: candidate.publicInfo.gitHead, candidateDirtyFiles: candidate.publicInfo.workingTreeStatus.length, findings: findings.filter(f=>f.severity==='error'), output }));
