import test from 'node:test';
import assert from 'node:assert/strict';
import {contourContact,BiteContours} from '../dist/bite-contours.js';

function mask(width,height,points,{left=0,top=0,scale=1}={}){
  const alpha=new Uint8Array(width*height),bounds={left:width,right:-1,top:height,bottom:-1};
  for(const[x,y,a=255]of points){alpha[y*width+x]=a;if(a>=96){bounds.left=Math.min(bounds.left,x);bounds.right=Math.max(bounds.right,x);bounds.top=Math.min(bounds.top,y);bounds.bottom=Math.max(bounds.bottom,y);}}
  return {width,height,alpha,left,top,scale,bounds:bounds.right<0?null:bounds};
}
test('contact enters the painted edge rather than a padded or estimated body ellipse',()=>{
  const filled=Array.from({length:5},(_,y)=>Array.from({length:3},(_,x)=>[x+8,y+2])).flat();
  const raster=mask(20,12,filled);
  const west=contourContact(raster,{x:1,y:4}),east=contourContact(raster,{x:19,y:4});
  assert.equal(west.x,8.5);assert.equal(east.x,10.5);
  assert.ok(raster.alpha[Math.floor(west.y)*20+Math.floor(west.x)]>=96);
  assert.notEqual(west.x,0,'transparent cell padding never becomes a contact');
});
test('local geometry, scale and approach direction retain the actual pixel union',()=>{
  const raster=mask(8,8,[[2,2],[3,2],[2,3],[3,3]],{left:-20,top:-30,scale:.5});
  const p=contourContact(raster,{x:-40,y:-25});
  assert.equal(p.x,-15);assert.ok(p.y>=-25&&p.y<=-23);
  const fromInside=contourContact(raster,{x:-14,y:-24});
  assert.ok(Number.isFinite(fromInside.x)&&Number.isFinite(fromInside.y));
});
test('disjoint parts, transparent centers and empty frames never create an invented solid hit',()=>{
  const raster=mask(12,12,[[2,1],[9,10]]);
  const p=contourContact(raster,{x:-5,y:5});
  assert.ok([[2.5,1.5],[9.5,10.5]].some(([x,y])=>p.x===x&&p.y===y));
  assert.equal(contourContact(mask(8,8,[]),{x:0,y:0}),null);
  assert.equal(contourContact(null,{x:0,y:0}),null);
});

test('immutable ground poses share compact masks across actors and evict within the cache bound',()=>{
  let reads=0,paints=0;
  const context={imageSmoothingEnabled:false,setTransform(){},getImageData(x,y,w,h){reads++;const data=new Uint8ClampedArray(w*h*4);for(const[px,py]of[[3,4],[4,4],[3,5],[4,5]])data[(py*w+px)*4+3]=255;return{data};}};
  const contours=new BiteContours();contours.surface={getContext(){return context;}};contours.maxFrameEntries=2;
  const box={left:0,right:20,top:0,bottom:20},paint=()=>paints++;
  const first=contours.contact({id:1,x:0,y:0},{x:-10,y:4},box,paint,'pose-a');
  contours.beginFrame();const translated=contours.contact({id:2,x:100,y:40},{x:90,y:44},box,paint,'pose-a');
  assert.equal(reads,1);assert.equal(paints,1);assert.deepEqual(translated,{x:first.x+100,y:first.y+40});
  assert.equal(contours.frames.get('pose-a').alpha.length,4,'padding is not retained as alpha cache');
  contours.beginFrame();const shifted=contours.contact({id:2,x:100,y:40},{x:92,y:43},box,paint,'pose-a',{x:2,y:-1});
  assert.deepEqual(shifted,{x:translated.x+2,y:translated.y-1},'rigid displacement follows the actor without a new mask');assert.equal(reads,1);
  for(const key of['pose-b','pose-c']){contours.beginFrame();contours.contact({id:1,x:0,y:0},{x:-10,y:4},box,paint,key);}
  assert.equal(contours.frames.size,2);assert.ok(!contours.frames.has('pose-a'));assert.ok(contours.frameBytes<=contours.maxFrameBytes);
  contours.beginFrame();contours.contact({id:1,x:0,y:0},{x:-10,y:4},box,paint,'pose-a');assert.equal(reads,4,'an evicted pose is read again');
});
