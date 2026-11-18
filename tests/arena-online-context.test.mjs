import test from 'node:test';
import assert from 'node:assert/strict';
import {C1_SERVICE,C4_SERVICE,arenaServiceForContext,expectedContextForService,serviceEnvelope,assertC4Envelope,serviceForServer} from '../dist/online-context.js';
import {LIGHT_EEVEE_RULESET,LIGHT_EEVEE_PRODUCER} from '../dist/arena-profile-producers.js?v=1';
import {getC4BaseCard,C4_CATALOG_FINGERPRINT} from '../dist/c4-catalog.js?v=1';
import {DEFAULT_DECK} from '../dist/engine.js?v=target-c1-1';
import {newOnlineSelectionFromLibrary,admitArenaSelection} from '../dist/arena-profile-selection.js';
import {c4SearchRequest} from '../dist/c4-search.js';

const expectedContext={ruleset:LIGHT_EEVEE_RULESET,arenaProfileProducer:LIGHT_EEVEE_PRODUCER};
const library=row=>({version:1,active:0,updatedAt:100,slots:[row,null,null,null]});

test('known service contexts are immutable and validate envelopes without loading battle resources',()=>{
 assert.throws(()=>getC4BaseCard('eevee'),error=>error.code==='C4_CATALOG_UNPREPARED');
 const current=arenaServiceForContext(expectedContext),old=serviceEnvelope(C4_SERVICE);
 assert.equal(current,arenaServiceForContext({...expectedContext}));assert.equal(Object.isFrozen(current),true);assert.equal(Object.isFrozen(current.keys),true);
 assert.deepEqual(old,{service:'c4',protocol:5,catalogVersion:4,ruleset:'c4-1',selectionVersion:2,catalogRef:C4_CATALOG_FINGERPRINT});assert.deepEqual(serviceEnvelope(C1_SERVICE),{});
 const envelope=serviceEnvelope(current);assert.equal(envelope.selectionVersion,3);assert.equal(envelope.arenaProfileProducer,LIGHT_EEVEE_PRODUCER);assert.deepEqual(expectedContextForService(current),expectedContext);assert.equal(expectedContextForService(C4_SERVICE),undefined);
 assert.equal(assertC4Envelope(old),undefined);assert.equal(assertC4Envelope(envelope,{expectedContext}),undefined);assert.deepEqual(serviceEnvelope(C4_SERVICE,expectedContext),envelope);
 assert.throws(()=>assertC4Envelope(envelope));assert.throws(()=>assertC4Envelope(old,{expectedContext}));assert.throws(()=>assertC4Envelope({...old,arenaProfileProducer:LIGHT_EEVEE_PRODUCER}));
 for(const value of [null,{ruleset:'unknown'},{...expectedContext,arenaProfileProducer:undefined},{...expectedContext,arenaProfileProducer:LIGHT_EEVEE_PRODUCER+':changed'}])assert.throws(()=>arenaServiceForContext(value));
 assert.equal(serviceForServer({ONLINE_SERVICE:'c4'}),C4_SERVICE);assert.equal(serviceForServer({LOCAL_C4_TEST:'1'}),C4_SERVICE);assert.equal(serviceForServer({}),C1_SERVICE);
 assert.throws(()=>getC4BaseCard('eevee'),error=>error.code==='C4_CATALOG_UNPREPARED');
});

test('new Eevee and a compatible normal deck share the same producer while raw legacy Eevee remains old',()=>{
 const normal=newOnlineSelectionFromLibrary(library(DEFAULT_DECK.slice()),0),eevee=newOnlineSelectionFromLibrary(library(['arena:eevee-light-v1',...DEFAULT_DECK.slice(1)]),0);
 for(const chosen of [normal,eevee]){
  assert.equal(chosen.ok,true);assert.equal(chosen.selection.version,3);assert.equal(chosen.arenaProfileProducer,LIGHT_EEVEE_PRODUCER);assert.equal(admitArenaSelection(chosen.deck,chosen.selection).ok,true);
  const request=c4SearchRequest({name:'Entrenador',deck:chosen.deck,selection:chosen.selection},{expectedContext});assert.deepEqual(request,{name:'Entrenador',deck:chosen.deck,selection:chosen.selection});
  assert.throws(()=>c4SearchRequest(request));assert.throws(()=>c4SearchRequest({...request,stats:{damage:9999}},{expectedContext}));
 }
 const raw=['eevee',...DEFAULT_DECK.slice(1)],before=structuredClone(raw),legacy=newOnlineSelectionFromLibrary(library(raw),0);assert.equal(legacy.ok,true);assert.equal(legacy.selection.version,2);assert.equal(legacy.ruleset,'c4-1');assert.deepEqual(raw,before);
 const request={name:'Anterior',deck:legacy.deck,selection:legacy.selection};assert.deepEqual(c4SearchRequest(request),request);assert.throws(()=>c4SearchRequest(request,{expectedContext}));
 const unknown=structuredClone(eevee.selection);unknown.arenaProfileProducer+=':unknown';assert.throws(()=>c4SearchRequest({name:'X',deck:eevee.deck,selection:unknown},{expectedContext}));
});
