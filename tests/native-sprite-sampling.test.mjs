import {test} from 'node:test';import assert from 'node:assert/strict';
import {expandPixelEdges,reduceNativeSprite,NativeSpriteSampler} from '../dist/native-sprite-sampling.js';

test('edge reconstruction uses only native colors and leaves the source pixels intact',()=>{
 const pixels=new Uint8ClampedArray([0,0,0,0,255,143,175,255,0,0,0,0,255,199,215,255,0,0,0,255,255,199,215,255,0,0,0,0,255,143,175,255,0,0,0,0]),saved=pixels.slice(),expanded=expandPixelEdges(pixels,3,3),palette=new Set(new Uint32Array(pixels.buffer));
 assert.deepEqual(pixels,saved);assert.equal(expanded.width,6);assert.equal(expanded.height,6);assert.ok([...new Uint32Array(expanded.data.buffer)].every(pixel=>palette.has(pixel)));
});

test('area reduction preserves a solid source and transparent pixels without a dark fringe',()=>{
 const solid=new Uint8ClampedArray(4*4*4);for(let i=0;i<solid.length;i+=4)solid.set([255,143,175,255],i);
 const sampled=reduceNativeSprite(solid,4,4,3,3);for(let i=0;i<sampled.length;i+=4)assert.deepEqual([...sampled.slice(i,i+4)],[255,143,175,255]);
 assert.ok(reduceNativeSprite(new Uint8ClampedArray(4*4*4),4,4,3,3).every(value=>value===0));
 const edge=new Uint8ClampedArray([0,0,0,0,255,143,175,255]);assert.deepEqual([...reduceNativeSprite(edge,2,1,1,1)],[255,143,175,128]);
});

test('sampling scope preserves all other species, high density and transformed attack poses',()=>{
 const sampler=new NativeSpriteSampler(),meta={width:32,height:40},small={a:.66,b:0,c:0,d:.66,e:0,f:0};
 assert.equal(sampler.frame(50,'Walk',0,0,meta,1,1,small,{}),null);
 assert.equal(sampler.frame(102,'Walk',0,0,meta,1,1,{...small,a:1.2,d:1.2},{}),null);
 assert.equal(sampler.frame(102,'Attack',0,0,meta,1,1,{...small,c:.1},{}),null);
 sampler.enabled=false;assert.equal(sampler.frame(102,'Walk',0,0,meta,1,1,small,{}),null);
});
