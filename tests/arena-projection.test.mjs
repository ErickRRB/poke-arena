import test from 'node:test';
import assert from 'node:assert/strict';
import {ARENA,TILE,DEPLOY_GRID,worldToScreen,screenToWorld} from '../dist/arena-geometry.js?v=26';
import {Game} from '../dist/engine.js?v=26';
import {packGame,unpackGame,perspective} from '../dist/snapshot.js';

const sizes=[[320,430],[370,533],[370,557],[370,677],[410,765],[490,857],[643,860]];
for(const[width,height]of sizes)test(`the full native board and every deployment center have one uniform invertible projection at${width}x${height}`,()=>{
  const topLeft=worldToScreen({x:ARENA.left,y:ARENA.top},width,height),bottomRight=worldToScreen({x:ARENA.right,y:ARENA.bottom},width,height);
  assert.ok(topLeft.x>=0&&topLeft.y>=0);assert.ok(bottomRight.x<=width&&bottomRight.y<=height);
  for(let row=0;row<DEPLOY_GRID.rows;row++)for(let col=0;col<DEPLOY_GRID.columns;col++){
    const p={x:ARENA.left+(col+.5)*TILE,y:ARENA.top+(row+.5)*TILE},screen=worldToScreen(p,width,height),restored=screenToWorld(screen,width,height);
    assert.ok(Math.abs(p.x-restored.x)<1e-9&&Math.abs(p.y-restored.y)<1e-9);
    const next=worldToScreen({x:p.x+TILE,y:p.y+TILE},width,height);assert.ok(Math.abs(next.x-screen.x-(next.y-screen.y))<1e-9);
  }
});
test('all six towers remain on screen from both public snapshot perspectives',()=>{
  const source=packGame(new Game());
  for(const view of [0,1])for(const[width,height]of sizes){
    const game=unpackGame(perspective(source,view));
    for(const tower of game.towers){const p=worldToScreen(tower,width,height);assert.ok(p.x>0&&p.x<width&&p.y>0&&p.y<height);const q=screenToWorld(p,width,height);assert.ok(Math.abs(tower.x-q.x)<1e-9&&Math.abs(tower.y-q.y)<1e-9);}
  }
});
