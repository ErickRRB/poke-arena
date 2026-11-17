import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game,CARDS} from '../dist/engine.js?v=target-c1-1';
import {packGame,unpackGame} from '../dist/snapshot.js';
import {prepareC4Catalog,getC4BaseCatalog,getC4BaseCard,C4_CATALOG_REFERENCE,C4_CATALOG_FINGERPRINT} from '../dist/c4-catalog.js?v=1';
import {validateC4Profiles} from '../dist/hog-profiles.js?v=1';
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
test('C1 works without C4 and C4 rejects use before preparation',()=>{assert.equal(new Game({seed:1}).ruleset,'c1-733');assert.throws(()=>new Game({catalogVersion:4,ruleset:'c4-1'}),{code:'C4_CATALOG_UNPREPARED'});assert.throws(()=>getC4BaseCatalog(),{code:'C4_CATALOG_UNPREPARED'})});
test('preflight freezes exact 125 profile catalog and preserves C1',async()=>{const before=structuredClone(CARDS),catalog=await prepareC4Catalog(CARDS);assert.equal(C4_CATALOG_REFERENCE,'c4-1:cards-c1-733');assert.equal(Object.keys(catalog).length,125);assert.equal(createHash('sha256').update(JSON.stringify(canonical(catalog))).digest('hex'),C4_CATALOG_FINGERPRINT);assert.equal(C4_CATALOG_FINGERPRINT,'2777afac1f4101a1762cbdc7015acacdf8d2d640d5b4e95ce172c24cce4b2748');assert.ok(Object.isFrozen(catalog)&&Object.isFrozen(catalog.voltorb)&&Object.isFrozen(catalog.voltorb.memberDelays));assert.deepEqual(CARDS,before);assert.equal(new Game({catalogVersion:4,ruleset:'c4-1'}).cardFor('voltorb'),getC4BaseCard('voltorb'));assert.throws(()=>{catalog.voltorb.scale=7},TypeError)});
test('unknown visual drift fails closed before installation',async()=>{const isolated=await import('../dist/c4-catalog.js?unknown-drift'),drift=structuredClone(CARDS);drift.voltorb.scale=7;await assert.rejects(isolated.prepareC4Catalog(drift),{code:'C4_CATALOG_DRIFT'});assert.throws(()=>isolated.getC4BaseCatalog(),{code:'C4_CATALOG_UNPREPARED'})});
test('C4 restore keeps the actual Voltorb instance profile',()=>{const game=new Game({catalogVersion:4,ruleset:'c4-1'});game.start();const actor=game.spawn('voltorb',0,200,500,0);actor.card={...actor.card,scale:9,visualScale:9};const restored=unpackGame(packGame(game));assert.equal(restored.units[0].card.scale,9);assert.equal(restored.units[0].card.visualScale,9)});

test('validation requires the verified catalog, not local CARDS',()=>{assert.throws(()=>validateC4Profiles({projectiles:[]},CARDS),{code:'C4_CATALOG_SOURCE'});assert.equal(validateC4Profiles({projectiles:[]},getC4BaseCatalog()),true);assert.equal(getC4BaseCard('toString'),undefined)});
