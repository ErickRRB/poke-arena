import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {prepare} from '../tools/review/baseline-adapter.mjs';
const c=JSON.parse(await readFile(new URL('../tools/review/tower-retarget.case.json',import.meta.url),'utf8'));
test('escenario de torre exige torre activa y HP inicial explícito',async()=>{
 await assert.rejects(prepare(null,{...c,scenario:{...c.scenario,keepTowers:false}}),/invalid contact scenario/);
 await assert.rejects(prepare(null,{...c,scenario:{...c.scenario,targetTower:{...c.scenario.targetTower,initialHp:0}}}),/invalid contact scenario/);
 await assert.rejects(prepare(null,{...c,scenario:{...c.scenario,targetTower:{...c.scenario.targetTower,lane:3}}}),/invalid contact scenario/);
 await assert.rejects(prepare(null,c),/beforeNavigate isolation/);
});
