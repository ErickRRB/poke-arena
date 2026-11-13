import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {openPage,ready} from '../tests/browser/helpers.mjs';

const module=process.env.POKE_ARENA_PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(/^[A-Za-z]:[\\/]/.test(module)?pathToFileURL(module).href:module);
const url=process.argv[2]||'http://127.0.0.1:4173';
const browser=await chromium.launch({...(process.platform==='win32'?{channel:'msedge'}:{}),headless:true});
try{
 const {page,context,errors}=await openPage(browser,{width:1440,height:980});await page.goto(url);await ready(page);
 const result=await page.evaluate(async()=>{
  const query=new URL([...document.scripts].find(s=>s.type==='module').src).search;
  const {CARDS}=await import('/engine.js'+query),renderer=__qa.renderer;
  const cards=Object.entries(CARDS).filter(([,card])=>card.flying);await renderer.ensureSpecies([...new Set(cards.map(([,card])=>card.id))]);renderer.verticalScale=1;renderer.reduced=false;
  const surface=document.createElement('canvas');surface.width=400;surface.height=400;
  const c=surface.getContext('2d',{willReadFrequently:true}),draw=c.drawImage.bind(c),cache=new Map();let poseCapture=[];
  c.drawImage=(img,...args)=>{poseCapture.push({img,args});draw(img,...args);};
  const pixelHash=({img,args})=>{
   const [sx,sy,w,h]=args,key=img.src+':'+sx+':'+sy;if(cache.has(key))return cache.get(key);
   const tile=document.createElement('canvas');tile.width=w;tile.height=h;const ctx=tile.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,sx,sy,w,h,0,0,w,h);
   const pixels=ctx.getImageData(0,0,w,h).data;let hash=2166136261,opaque=0;
   for(let i=0;i<pixels.length;i++){hash=Math.imul(hash^pixels[i],16777619);if(i%4===3&&pixels[i])opaque++;}
   const value={hash:hash>>>0,opaque};cache.set(key,value);return value;
  };
  const rows=[];
  for(const[index,[key,card]]of cards.entries()){
   const actor={id:700+index,key,card,x:200,y:285,dx:0,dy:-1,team:0,moving:true,attack:0,hit:0,spawn:0,preview:true};
   const directions=[];
   for(let direction=0;direction<8;direction++){
    const angle=(2-direction)*Math.PI/4;actor.dx=Math.cos(angle);actor.dy=Math.sin(angle);
    const poses=new Set();let empty=0,missing=0;
    for(let frame=0;frame<120;frame++){
     renderer.t=frame/60;poseCapture=[];c.clearRect(0,0,400,400);renderer.sprite(c,actor,true);
     if(!poseCapture.length)missing++;
     for(const draw of poseCapture){const pixels=pixelHash(draw);poses.add(pixels.hash);if(!pixels.opaque)empty++;}
    }
    const point=renderer.visualEmission(actor);
    directions.push({direction,poses:poses.size,empty,missing,emitter:point});
   }
   rows.push({key,name:card.name,source:'PMD original',directions});
  }
  const strips=[];
  for(let start=0;start<cards.length;start+=6){
   const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=Math.min(6,cards.length-start)*130;const ctx=canvas.getContext('2d');ctx.fillStyle='#355744';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
   cards.slice(start,start+6).forEach(([key,card],row)=>{
    ctx.fillStyle='#fff5d3';ctx.font='13px sans-serif';ctx.fillText(card.name,8,row*130+18);
    for(let phase=0;phase<10;phase++){
     const actor={id:700+start+row,key,card,x:56+phase*120,y:row*130+121,dx:0,dy:phase<5?-1:1,team:0,moving:true,attack:0,hit:0,spawn:0,preview:true};renderer.t=phase%5*.32;renderer.sprite(ctx,actor,true);
    }
   });strips.push(canvas.toDataURL('image/png'));
  }
  return{rows,strips};
 });
 assert.deepEqual(errors,[]);
 for(const row of result.rows)for(const direction of row.directions){assert.equal(direction.empty,0,row.key);assert.equal(direction.missing,0,row.key);assert.ok(direction.poses>1,row.key);}
 await mkdir('docs/flight-review',{recursive:true});
 for(const[index,data]of result.strips.entries())await writeFile(`docs/flight-review/fliers-${index+1}.png`,Buffer.from(data.split(',')[1],'base64'));
 const report={date:new Date().toISOString().slice(0,10),directions:8,samples:120,seconds:2,rows:result.rows};
 await writeFile('docs/FLIGHT-MOTION-REVIEW.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({fliers:result.rows.length,directions:8,framesPerDirection:120,missing:0,empty:0}));await context.close();
}finally{await browser.close();}
