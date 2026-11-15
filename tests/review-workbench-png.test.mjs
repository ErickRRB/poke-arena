import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runCase } from '../scripts/review-workbench.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/workbench/case.json',import.meta.url)));
test('captura PNG conserva dimensiones reales y muestra resumen antes de cuadros',async()=>{
 const out=await mkdtemp(path.join(tmpdir(),'workbench-png-'));
 try {
  const run=await runCase({...fixture,viewport:{...fixture.viewport,dpr:2}},{out});
  const {result,directory}=run, frame=result.capture.frames[0], bytes=await readFile(path.join(directory,frame.path));
  assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]); assert.equal(frame.format,'png'); assert.equal(frame.width,bytes.readUInt32BE(16)); assert.equal(frame.height,bytes.readUInt32BE(20)); assert.equal(result.samples[0].dpr,2);
  const {chromium}=await import(pathToFileURL(path.resolve('../pokemon-arena/qa/node_modules/playwright/index.mjs')).href),browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});
  try {const page=await browser.newPage({viewport:{width:900,height:800}}); await page.goto(pathToFileURL(path.join(directory,'index.html')).href);const info=await page.evaluate(()=>{const summary=document.querySelector('#capture-summary'),img=document.querySelector('section img'),video=document.querySelector('video');return {summaryBeforeFrames:!!(summary.compareDocumentPosition(img)&Node.DOCUMENT_POSITION_FOLLOWING),videoBeforeSummary:!!(video.compareDocumentPosition(summary)&Node.DOCUMENT_POSITION_FOLLOWING),naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,cssWidth:img.getBoundingClientRect().width,scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth};});assert.equal(info.summaryBeforeFrames,true);assert.equal(info.videoBeforeSummary,true);assert.equal(info.naturalWidth,frame.width);assert.equal(info.naturalHeight,frame.height);assert.equal(info.cssWidth,fixture.viewport.width);assert.equal(info.scroll,info.viewport);}finally{await browser.close();}
 }finally{await rm(out,{recursive:true,force:true});}
});
