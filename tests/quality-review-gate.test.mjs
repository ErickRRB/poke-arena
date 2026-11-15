import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { checkReview } from '../scripts/quality-review-gate.mjs';
const hash = x => createHash('sha256').update(x).digest('hex');
const base = mkdtempSync(join(tmpdir(), 'review-gate-'));
writeFileSync(join(base, 'evidence.txt'), 'synthetic');
const candidate = { sha: 'a'.repeat(40), tree: 'b'.repeat(40) };
const criterion = id => ({ id, requirement: 'acción', category: 'visual', expected: 'evolución visible', coverage: 'móvil', context: 'combate móvil', evidenceKind: 'motion', required: true });
const plan = { version: '1', request: 'acción visible', scope: 'combate', exclusions: 'sin audio', createdAt: '2026-01-01T00:00:00Z', criteria: [criterion('roll'), criterion('fire')] };
const record = id => ({ id, planVersion: '1', planHash: hash(JSON.stringify(plan)), status: 'pass', observedResult: 'se observa evolución', coverage: 'móvil', limits: 'emulado', author: 'autor', reviewer: 'revisor', method: 'secuencia', capability: 'inspección visual de imágenes', reviewedAt: '2026-01-02T00:00:00Z', candidate, context: 'combate móvil', evidence: [{ path: 'evidence.txt', sha256: hash('synthetic'), kind: 'dense_sequence' }], motion: { naturalClock: true, captureConditions: 'juego real', originalTiming: 'tiempos originales', realGameTimeTrace: 'traza', cadenceChosenBeforeReview: '20 fps', cycleCoverage: 'ciclo completo' } });
const bundle = () => ({ plan: structuredClone(plan), candidate: structuredClone(candidate), scope: { mode: 'global', criteria: ['roll', 'fire'], dependencies: [], description: 'ambos', integrationRisk: 'comprobado' }, records: [record('roll'), record('fire')], findings: [], previousFindings: [] });
const check = b => checkReview(b, base);
test('pase completo y NA justificado', () => { const b=bundle(); assert.equal(check(b).ok,true); Object.assign(b.records[1], {status:'not_applicable',reason:'no corresponde'}); assert.equal(check(b).ok,true); });
test('omisión, cambio de obligatoriedad y revisión propia bloquean', () => { for (const change of [b=>b.records.pop(), b=>b.records[0].required=false, b=>b.records[0].reviewer='autor']) { const b=bundle(); change(b); assert.equal(check(b).ok,false); } });
test('candidato, evidencia, estados y excepción sin motivo bloquean', () => { for (const change of [b=>b.records[0].candidate.sha='c'.repeat(40), b=>b.records[0].evidence=[], b=>b.records[0].status='needs_fix', b=>b.records[0].status='not_evaluated', b=>b.records[0].status='not_applicable', b=>b.records[0].evidence[0].sha256='c'.repeat(64)]) { const b=bundle(); change(b); assert.equal(check(b).ok,false); } });
test('una captura pausada, eventos o hashes no prueban movimiento', () => { for (const kind of ['paused', 'events', 'hashes']) { const b=bundle(); b.records[0].evidence[0].kind=kind; assert.equal(check(b).ok,false); } });
test('transferencia sin pase previo válido bloquea', () => { const b=bundle(); b.records[0].transfer={artifacts:[{path:'evidence.txt',sha256:hash('synthetic')}], conditions:'móvil',previousConditions:'móvil',integrationIndependence:'sin cambio'}; assert.equal(check(b).ok,false); });
test('hallazgo bloquea y publicación parcial mantiene global abierto sin alterar estados', () => { const b=bundle(); b.records[1].status='needs_fix'; b.findings=[{id:'f',required:true,status:'open',criteria:['fire'],openedAt:'2026-01-01T12:00:00Z'}]; assert.equal(check(b).ok,false); b.scope={mode:'partial',criteria:['roll'],dependencies:[],noDependenciesReason:'rutas independientes',description:'rodadura',integrationRisk:'revisado'}; const before=JSON.stringify(b); const r=check(b); assert.equal(r.ok,true); assert.equal(r.globalOpen,true); assert.equal(JSON.stringify(b),before); });
test('plan revisado exige justificación para criterios alterados', () => { const b=bundle(); b.previousPlans=[structuredClone(plan)]; b.plan.version='2'; b.plan.previous={hash:hash(JSON.stringify(plan)),reason:'cambio',changes:{}}; b.plan.criteria[0].required=false; for(const r of b.records){r.planVersion='2';r.planHash=hash(JSON.stringify(b.plan));} assert.equal(check(b).ok,false); });
test('transferencia válida exige pase previo, identidad de archivos y condiciones', () => { const b=bundle(); const prior=structuredClone(b.records[0]); prior.candidate={sha:'c'.repeat(40),tree:'d'.repeat(40)}; const artifacts=[{path:'evidence.txt',sha256:hash('synthetic')}]; b.records[0].transfer={prior,artifacts,artifactsHash:hash(JSON.stringify(artifacts)),previousArtifactsHash:hash(JSON.stringify(artifacts)),conditions:'móvil',previousConditions:'móvil',integrationIndependence:'ruta no afectada'}; assert.equal(check(b).ok,true); b.records[0].transfer.previousConditions='escritorio'; assert.equal(check(b).ok,false); });

test('recorre toda la cadena de planes y detecta ancestro ausente o cambio injustificado', () => {
 const b=bundle(), p1=structuredClone(b.plan), p2=structuredClone(p1); p2.version='2'; p2.criteria.pop(); p2.previous={hash:hash(JSON.stringify(p1)),reason:'ajuste',changes:{}};
 const p3=structuredClone(p2); p3.version='3'; p3.previous={hash:hash(JSON.stringify(p2)),reason:'ajuste',changes:{}};
 b.plan=p3; b.previousPlans=[p2]; b.scope.criteria=['roll']; b.records=[record('roll')]; b.records[0].planVersion='3'; b.records[0].planHash=hash(JSON.stringify(p3));
 assert.equal(check(b).ok,false); b.previousPlans.push(p1); assert.equal(check(b).ok,false);
 p2.previous.changes.fire='exclusión justificada'; p3.previous.hash=hash(JSON.stringify(p2)); b.records[0].planHash=hash(JSON.stringify(p3)); assert.equal(check(b).ok,true);
});
test('registro ajeno inválido no impide parcial y conserva diagnóstico', () => {
 const b=bundle(); b.scope={mode:'partial',criteria:['roll'],dependencies:[],noDependenciesReason:'independiente',description:'A',integrationRisk:'revisado'}; b.records[1].reviewer='autor';
 const r=check(b); assert.equal(r.ok,true); assert.equal(r.globalOpen,true); assert.ok(r.diagnostics.some(e=>e.includes('fire')));
});
test('cierre requiere historial y recheck independiente del fix', () => {
 const b=bundle(), old={id:'bug',required:true,status:'open',criteria:['fire'],openedAt:'2026-01-01T12:00:00Z'};
 b.previousFindings=[old]; b.findings=[{id:'bug',required:true,status:'closed',criteria:['fire'],previousHash:hash(JSON.stringify(old)),fix:{author:'autor',description:'corregido',completedAt:'2026-01-01T13:00:00Z',candidate}}];
 assert.equal(check(b).ok,true); b.findings[0].fix.completedAt='2026-01-03T00:00:00Z'; assert.equal(check(b).ok,false); b.findings[0].fix.completedAt='2026-01-01T13:00:00Z'; b.findings[0].fix.author='revisor'; assert.equal(check(b).ok,false); b.findings[0].fix.author='autor'; delete b.findings[0].previousHash; assert.equal(check(b).ok,false);
 b.findings=[]; assert.equal(check(b).ok,false);
});
