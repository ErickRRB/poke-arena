import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const text = x => typeof x === 'string' && x.trim().length > 0;
const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => /^[a-f0-9]{64}$/i.test(x || '');
const gitHash = x => /^[a-f0-9]{40,64}$/i.test(x || '');
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// The input is read-only. Evidence paths are relative to the review file.
export function checkReview(bundle, base = process.cwd()) {
  const errors = [];
  const fail = (where, message) => errors.push(`${where}: ${message}`);
  const { plan, records, findings, candidate, scope, previousPlans = [] } = bundle;
  if (!plan || !Array.isArray(plan.criteria) || !plan.criteria.length) return { ok: false, globalOpen: true, errors: ['plan: missing criteria'] };
  if (!text(plan.version) || !text(plan.request) || !text(plan.scope) || !text(plan.exclusions) || !Number.isFinite(Date.parse(plan.createdAt))) fail('plan', 'version, request, scope, exclusions and creation time required');
  if (!Array.isArray(records) || !Array.isArray(findings)) return { ok: false, globalOpen: true, errors: [...errors, 'records and findings must be arrays'] };
  if (!candidate || !gitHash(candidate.sha) || !gitHash(candidate.tree)) fail('candidate', 'full SHA and tree required');
  if (!scope || !['global', 'partial'].includes(scope.mode) || !Array.isArray(scope.criteria) || !scope.criteria.length || !text(scope.description) || !text(scope.integrationRisk) || !Array.isArray(scope.dependencies)) fail('scope', 'mode, criteria, description, integration risk and dependencies required');
  const criteria = new Map();
  for (const c of plan.criteria) {
    if (!text(c.id) || criteria.has(c.id)) fail('plan', `missing or duplicate criterion ${c.id}`);
    if (![c.requirement, c.category, c.expected, c.coverage, c.context, c.evidenceKind].every(text) || typeof c.required !== 'boolean') fail(`criterion ${c.id}`, 'incomplete criterion');
    if (!['technical', 'visual', 'motion', 'audio_perceptual', 'use'].includes(c.evidenceKind)) fail(`criterion ${c.id}`, 'unknown evidence kind');
    criteria.set(c.id, c);
  }
  const planHash = hash(JSON.stringify(plan));
  if (plan.previous) {
    const previous = previousPlans.find(p => hash(JSON.stringify(p)) === plan.previous.hash);
    if (!previous || !text(plan.previous.reason) || previous.version === plan.version) fail('plan', 'revision requires previous plan, hash, new version and reason');
    else {
      for (const old of previous.criteria || []) {
        const now = criteria.get(old.id);
        if ((!now || !equal(old, now)) && !text(plan.previous.changes?.[old.id])) fail('plan', `changed or removed ${old.id} without justification`);
      }
    }
  } else if (previousPlans.length) fail('plan', 'previous plan supplied without revision link');
  const byId = new Map();
  for (const r of records) {
    if (!criteria.has(r.id)) { fail('record', `unknown criterion ${r.id}`); continue; }
    if (byId.has(r.id)) fail('record', `duplicate ${r.id}`);
    byId.set(r.id, r);
    if (r.planVersion !== plan.version || r.planHash !== planHash) fail(`record ${r.id}`, 'plan version/hash mismatch');
    if ('required' in r && r.required !== criteria.get(r.id).required) fail(`record ${r.id}`, 'required differs from plan');
  }
  const scopeIds = new Set([...(scope?.criteria || []), ...(scope?.dependencies || [])]);
  for (const id of scopeIds) if (!criteria.has(id)) fail('scope', `unknown criterion ${id}`);
  if (scope?.mode === 'global' && [...criteria.values()].some(c => c.required && !scopeIds.has(c.id))) fail('scope', 'global scope omits required criteria');
  if (scope?.mode === 'partial' && Array.isArray(scope.dependencies) && !scope.dependencies.length && !text(scope.noDependenciesReason)) fail('scope', 'explain absence of dependencies');

  function validPass(r, c, target, where) {
    let valid = true;
    const bad = message => { fail(where, message); valid = false; };
    if (!text(r.observedResult) || !text(r.coverage) || !text(r.limits) || !text(r.author) || !text(r.reviewer) || r.author.trim().toLowerCase() === r.reviewer.trim().toLowerCase() || !text(r.method)) bad('result, coverage, limits, distinct author/reviewer and method required');
    if (!Number.isFinite(Date.parse(r.reviewedAt)) || Date.parse(r.reviewedAt) < Date.parse(plan.createdAt)) bad('review must follow plan');
    if (!r.candidate || !gitHash(r.candidate.sha) || !gitHash(r.candidate.tree) || r.candidate.sha !== target?.sha || r.candidate.tree !== target?.tree) bad('candidate mismatch');
    if (r.context !== c.context) bad('context mismatch');
    if (!Array.isArray(r.evidence) || !r.evidence.length) bad('evidence required');
    for (const e of r.evidence || []) {
      if (!text(e.path) || !digest(e.sha256) || !text(e.kind)) { bad('evidence path, SHA-256 and kind required'); continue; }
      try { if (hash(readFileSync(resolve(base, e.path))) !== e.sha256.toLowerCase()) bad(`evidence hash mismatch: ${e.path}`); }
      catch { bad(`evidence unavailable: ${e.path}`); }
    }
    const kinds = new Set((r.evidence || []).map(e => e.kind));
    if (['visual', 'motion', 'audio_perceptual', 'use'].includes(c.evidenceKind) && !text(r.capability)) bad('perceptual capability required');
    if (c.evidenceKind === 'visual' && !kinds.has('visual_observation')) bad('visual observation required');
    if (c.evidenceKind === 'use' && !kinds.has('task_observation')) bad('task observation required');
    if (c.evidenceKind === 'audio_perceptual' && !kinds.has('audio_perceptual_observation')) bad('perceptual audio observation required');
    if (c.evidenceKind === 'motion') {
      if (!kinds.has('continuous_video') && !kinds.has('dense_sequence')) bad('natural temporal evidence required');
      if (!text(r.motion?.captureConditions) || r.motion?.naturalClock !== true || !text(r.motion?.originalTiming) || !text(r.motion?.realGameTimeTrace)) bad('natural clock, original timing, capture conditions and real/game time trace required');
      if (kinds.has('dense_sequence') && (!text(r.motion?.cadenceChosenBeforeReview) || !text(r.motion?.cycleCoverage))) bad('sequence cadence and cycle coverage required');
      if (kinds.has('dense_sequence') && r.motion?.claimsContinuousPlayback === true) bad('sequence cannot claim continuous playback');
      if (kinds.has('dense_sequence') && r.motion?.judgesPerceptualFluidity === true && !kinds.has('continuous_video')) bad('sequence alone cannot judge perceptual fluidity');
    }
    return valid;
  }
  const state = new Map();
  for (const c of criteria.values()) {
    const r = byId.get(c.id);
    if (!r) { state.set(c.id, false); continue; }
    if (!['pass', 'needs_fix', 'not_evaluated', 'not_applicable'].includes(r.status)) { fail(`record ${c.id}`, 'invalid status'); state.set(c.id, false); continue; }
    if (r.status === 'not_applicable') {
      const ok = text(r.reason) && text(r.coverage) && text(r.limits) && text(r.method) && r.context === c.context && r.candidate?.sha === candidate?.sha && r.candidate?.tree === candidate?.tree && Number.isFinite(Date.parse(r.reviewedAt)) && Date.parse(r.reviewedAt) >= Date.parse(plan.createdAt) && text(r.author) && text(r.reviewer) && r.author.trim().toLowerCase() !== r.reviewer.trim().toLowerCase();
      if (!ok) fail(`record ${c.id}`, 'not applicable requires reason and independent reviewer');
      state.set(c.id, ok); continue;
    }
    if (r.status !== 'pass') { state.set(c.id, false); continue; }
    if (r.transfer) {
      const t = r.transfer, prior = t.prior;
      const same = prior && prior.id === c.id && prior.planVersion === plan.version && prior.planHash === planHash && prior.status === 'pass' && prior.context === r.context && text(t.conditions) && Array.isArray(t.artifacts) && t.artifacts.length > 0 && t.artifacts.every(a => text(a.path) && digest(a.sha256) && (() => { try { return hash(readFileSync(resolve(base, a.path))) === a.sha256.toLowerCase(); } catch { return false; } })()) && digest(t.artifactsHash) && t.artifactsHash === hash(JSON.stringify(t.artifacts)) && t.previousArtifactsHash === t.artifactsHash && t.previousConditions === t.conditions && text(t.integrationIndependence);
      if (!same) fail(`record ${c.id}`, 'transfer requires prior pass and identical artifacts/conditions with integration justification');
      const previousValid = same && validPass(prior, c, prior.candidate, `prior ${c.id}`);
      const currentValid = validPass(r, c, candidate, `record ${c.id}`);
      state.set(c.id, Boolean(previousValid && currentValid));
    } else state.set(c.id, validPass(r, c, candidate, `record ${c.id}`));
  }
  for (const f of findings) {
    if (!text(f.id) || typeof f.required !== 'boolean' || !['open', 'closed'].includes(f.status) || !Array.isArray(f.criteria) || !f.criteria.length || f.criteria.some(id => !criteria.has(id))) fail('finding', 'invalid finding');
  }
  const blocked = ids => [...ids].some(id => criteria.get(id)?.required && !state.get(id)) || findings.some(f => f.required && f.status === 'open' && f.criteria?.some(id => ids.has(id)));
  const globalOpen = blocked(new Set(criteria.keys()));
  const scopeBlocked = blocked(scopeIds);
  if (scopeBlocked) fail('scope', 'required criteria or findings remain open');
  return { ok: errors.length === 0 && !scopeBlocked, globalOpen, planHash, errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 3) throw new Error('usage: node scripts/quality-review-gate.mjs review.json');
    const file = resolve(process.argv[2]);
    const result = checkReview(JSON.parse(readFileSync(file, 'utf8')), dirname(file));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
