import {test} from 'node:test';import assert from 'node:assert/strict';
import {canvasBackingSize,alignedSpriteRect} from '../dist/canvas-raster.js';
import {Renderer} from '../dist/render.js';

test('the backing matches mobile DPR without changing CSS/world geometry and is bounded for large screens',()=>{
 for(const dpr of[1,1.25,2,3]){const size=canvasBackingSize(370,686,dpr);assert.equal(size.width,Math.round(370*dpr));assert.equal(size.height,Math.round(686*dpr));}
 for(const dpr of[4,8,Infinity]){const size=canvasBackingSize(2000,2000,dpr);assert.ok(size.width*size.height<=6_010_000);assert.ok(size.width<=4096&&size.height<=4096);}
 assert.equal(canvasBackingSize(0,600,2),null);
 const viewport={width:370,height:686},canvas={width:600,height:800},renderer=Object.assign(Object.create(Renderer.prototype),{viewport,canvas,ctx:{}});
 renderer.resizeBacking(2);assert.equal(canvas.width,740);assert.equal(canvas.height,1372);assert.deepEqual(viewport,{width:370,height:686});assert.equal(renderer.ctx.imageSmoothingEnabled,false);
 renderer.rasterVisible=false;renderer.resizeBacking(3);assert.equal(canvas.width,370);assert.equal(canvas.height,686);assert.deepEqual(viewport,{width:370,height:686});renderer.rasterVisible=true;renderer.resizeBacking(2);
 let writes=0;Object.defineProperty(canvas,'width',{get:()=>740,set:()=>writes++});Object.defineProperty(canvas,'height',{get:()=>1372,set:()=>writes++});renderer.resizeBacking(2);assert.equal(writes,0,'stable frames must not clear the drawing buffer');
});

test('sprite alignment changes only raster translation, with at most half a physical pixel of error',()=>{
 for(const dpr of[1,1.25,2,3])for(let step=0;step<20;step++){
  const rect=[64,32,32,40,125.2+step*.23,310.12-step*.17,27.4272,34.284],t={a:.770833*dpr,b:0,c:0,d:.770833*dpr,e:-46.25*dpr,f:53.16666*dpr},saved=rect.slice(),out=alignedSpriteRect(rect,t);
  assert.deepEqual(rect,saved);assert.deepEqual(out.slice(0,4),rect.slice(0,4));assert.deepEqual(out.slice(6),rect.slice(6));
  for(const[index,scale,offset]of[[4,t.a,t.e],[5,t.d,t.f]]){const physical=out[index]*scale+offset;assert.ok(Math.abs(physical-Math.round(physical))<1e-8);assert.ok(Math.abs(out[index]-rect[index])*Math.abs(scale)<=.5000001);}
 }
});
