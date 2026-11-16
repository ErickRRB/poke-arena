import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS} from '../dist/engine.js?v=34';
test('barrel prediction is pure and matches actual summons with obstacles and both perspectives',()=>{
 for(const team of [0,1]){const game=new Game({seed:192});game.start();game.aiEnabled=false;const tower=game.towers.find(t=>t.team!==team&&!t.king),card=CARDS.sneaselAmbush,spell={card,team,x:tower.x,y:tower.y};const before=JSON.stringify({units:game.units,towers:game.towers,nextId:game.nextId});const predicted=game.summonSpellPositions(spell);assert.equal(JSON.stringify({units:game.units,towers:game.towers,nextId:game.nextId}),before);game.summonSpell(spell);assert.deepEqual(game.units.map(({x,y})=>({x,y})),predicted);assert.equal(predicted.length,3);}
});
