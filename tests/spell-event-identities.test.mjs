import test from'node:test';import assert from'node:assert/strict';
import{Game,CARDS,DEFAULT_DECK}from'../dist/engine.js?v=34';import{packGame,unpackGame,perspective}from'../dist/snapshot.js?v=34';import{publicSnapshot,publicEvent,unpackEvent}from'../dist/online-wire.js?v=34';

for(const[key,card]of Object.entries(CARDS).filter(([,c])=>c.spell))test(`${key} retains its own identity, carrier and timing across both wire perspectives`,()=>{
 const events=[],deck=[key,...DEFAULT_DECK.filter(k=>k!==key).slice(0,7)];let game;game=new Game({seed:901,deck,onEvent:event=>events.push({at:game.elapsed,event})});game.start();game.aiEnabled=false;game.energy[0]=10;for(const t of game.towers)t.active=false;
 assert.ok(game.deploy(0,0,168,card.rolling?500:320).ok);const cast=events.find(e=>e.event.type==='cast').event,spell=game.spells[0];assert.equal(cast.key,key);assert.equal(cast.castDelay,card.castDelay??.4);assert.equal(cast.waves,card.waves||1);assert.equal(cast.waveEvery,card.waveEvery||0);
 for(const viewer of[0,1]){
  const restored=unpackGame(perspective(publicSnapshot(game,viewer),viewer)),copy=restored.spells[0];assert.equal(copy.key,key);assert.equal(copy.card.nativeReference,card.nativeReference);assert.equal(copy.card.style,card.style);assert.equal(copy.card.travelSpeed,card.travelSpeed);assert.ok(Math.abs(copy.flightTime-spell.flightTime)<=.001,'wire travel time keeps millisecond precision');assert.equal(copy.visualId,spell.visualId);assert.equal(copy.startY,viewer?800-spell.startY:spell.startY);
 }
 const forwarded=unpackEvent(publicEvent(cast));for(const field of['key','team','flightTime','castDelay','waves','waveEvery'])assert.equal(forwarded[field],cast[field],field);
 for(let i=0;i<600&&game.spells.length;i++)game.step(1/30);
 for(const{at,event}of events.filter(e=>e.event.type==='spellHit')){assert.equal(event.key,key);assert.equal(unpackEvent(publicEvent(event)).key,key);assert.ok(at+1e-8>=(card.castDelay??.4)+(card.rolling?0:spell.flightTime),'the impact follows its actual preparation and travel');}
 if(!card.rolling)assert.ok(events.some(e=>e.event.type==='spellHit'),key+' resolves independently of a visible target');
 if(key==='pinMissile')assert.equal(events.filter(e=>e.event.type==='spellHit').length,3,'Arrows keep three real damage waves');
 assert.equal(packGame(game).boardVersion,2);
});
