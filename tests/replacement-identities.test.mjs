import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,CARDS} from '../dist/engine.js?v=34';
import {CARD_ART} from '../dist/card-art.js';
import {normalizeDeck} from '../dist/deck-storage.js';
import {SPRITE_GEOMETRY} from '../dist/sprite-geometry.js';

test('saved Knight and Bowler keys keep their order and resolve to the matching artwork and native species',()=>{
  const deck=['geodude','graveler','golem','log','pikachu','roselia','fireball','diglett'];assert.deepEqual(normalizeDeck(deck),deck);
  const manifest=JSON.parse(readFileSync(new URL('../dist/assets/pokemon/manifest.json',import.meta.url)));
  for(const[key,id,name,animation,emitter,art]of[['geodude',83,'Farfetch’d','Attack','head','farfetchd-knight-v1.png'],['graveler',534,'Conkeldurr','Shoot','body','conkeldurr-bowler-v1.png']]){
    const card=CARDS[key];assert.equal(card.id,id);assert.equal(card.name,name);assert.equal(card.attackAnim,animation);assert.equal(card.emitter,emitter);
    assert.ok(CARD_ART[key].file.endsWith(art));assert.ok(manifest[id][animation]);assert.equal(SPRITE_GEOMETRY[id][animation].points.length,8);
  }
});

test('Golem children remain separate small Geodude after Knight becomes Farfetchd',()=>{
  const game=new Game({tutorial:true});game.start();game.aiEnabled=false;
  const knight=game.spawn('geodude',0,100,500,0),golem=game.spawn('golem',0,300,500,0);game.damage(golem,golem.hp+1,1);
  const children=game.units.filter(unit=>unit.key==='geodudeToken');assert.equal(children.length,2);
  for(const child of children){assert.equal(child.card.id,74);assert.equal(child.card.token,true);assert.equal(child.card.scale,1.3);}
  assert.equal(knight.card.id,83);
});
