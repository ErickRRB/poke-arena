import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {openPage,ready} from '../tests/browser/helpers.mjs';

let playwright;
for(const location of[process.env.POKE_ARENA_PLAYWRIGHT_MODULE,new URL('../qa/node_modules/playwright/index.mjs',import.meta.url).href,'playwright'].filter(Boolean)){
 try{playwright=await import(/^[A-Za-z]:[\\/]/.test(location)?pathToFileURL(location).href:location);break;}catch{}
}
if(!playwright)throw Error('Set POKE_ARENA_PLAYWRIGHT_MODULE or install Playwright in qa.');
const url=process.argv[2]||'http://127.0.0.1:4173',browser=await playwright.chromium.launch({...(process.platform==='win32'?{channel:'msedge'}:{}),headless:true});
try{
 const{page,context,errors}=await openPage(browser,{width:1366,height:900});page.setDefaultTimeout(60000);await page.goto(url);await ready(page);
 const result=await page.evaluate(async()=>{
  const query=new URL([...document.scripts].find(s=>s.type==='module').src).search,{CARDS}=await import('/engine.js'+query),{emissionPoint,emitterPart}=await import('/sprite-motion.js'+query),renderer=__qa.renderer;
  const cards=Object.entries(CARDS).filter(([,card])=>!card.spell);await renderer.ensureSpecies([...new Set(cards.map(([,c])=>c.id))]);renderer.verticalScale=1;renderer.reduced=false;
  const test=document.createElement('canvas');test.width=400;test.height=400;const ctx=test.getContext('2d'),nativeDraw=ctx.drawImage.bind(ctx),sheetHashes=new Map();let captureImage,captureMeta,drawn=[];
  ctx.drawImage=(image,...args)=>{if(image===captureImage)drawn.push({frame:Math.round(args[0]/captureMeta.width),direction:Math.round(args[1]/captureMeta.height)});nativeDraw(image,...args);};
  const pixelHash=(image,meta,frame,direction)=>{
   const key=image.src+':'+frame+':'+direction;if(sheetHashes.has(key))return sheetHashes.get(key);
   const native=document.createElement('canvas');native.width=meta.width;native.height=meta.height;const c=native.getContext('2d',{willReadFrequently:true});c.drawImage(image,frame*meta.width,direction*meta.height,meta.width,meta.height,0,0,meta.width,meta.height);
   const pixels=c.getImageData(0,0,meta.width,meta.height).data;let hash=2166136261,opaque=0;for(let i=0;i<pixels.length;i++){hash=Math.imul(hash^pixels[i],16777619);if(i%4===3&&pixels[i])opaque++;}const result={hash:hash>>>0,opaque};sheetHashes.set(key,result);return result;
  };
  const rows=[];
  for(const[index,[key,card]]of cards.entries()){
   const moveName=card.structure?'Idle':card.moveAnim||'Walk',attackName=card.attackAnim||'Attack',moveMeta=renderer.metadata[card.id]?.[moveName],attackMeta=renderer.metadata[card.id]?.[attackName];
   const moveImage=renderer.sprites.get(card.id+'-'+moveName),attackImage=renderer.sprites.get(card.id+'-'+attackName),directions=[];
   for(let direction=0;direction<8;direction++){
    const angle=(2-direction)*Math.PI/4,actor={id:1000+index,key,card,x:200,y:270,dx:Math.cos(angle),dy:Math.sin(angle),team:0,spawn:0,hit:0,attack:0,moving:!card.structure,preview:true,lifetime:card.lifetime||0,maxHp:card.hp,hp:card.hp,radius:card.radius};
    const movement=new Set(),attacks=new Set();let emptyFrames=0;
    captureImage=moveImage;captureMeta=moveMeta;
    for(let phase=0;phase<16;phase++){drawn=[];renderer.t=phase*.11;ctx.clearRect(0,0,400,400);renderer.sprite(ctx,actor,true);for(const pose of drawn){const pixel=pixelHash(moveImage,moveMeta,pose.frame,pose.direction);movement.add(pixel.hash);if(!pixel.opaque)emptyFrames++;}}
    if(!card.passive){captureImage=attackImage;captureMeta=attackMeta;actor.moving=false;actor.attackDuration=card.attackDuration;actor.attackWindup=card.windup;actor.attackAnim=attackName;
     for(let phase=0;phase<12;phase++){actor.attack=actor.attackDuration*(1-phase/12);drawn=[];ctx.clearRect(0,0,400,400);renderer.sprite(ctx,actor,true);const point=emissionPoint(actor);if(!Number.isFinite(point.x)||!Number.isFinite(point.y))throw Error('Invalid emitter: '+key);
      for(const pose of drawn){const pixel=pixelHash(attackImage,attackMeta,pose.frame,pose.direction);attacks.add(pixel.hash);if(!pixel.opaque)emptyFrames++;}}
    }
    directions.push({direction,movementPoses:movement.size,attackPoses:attacks.size,emptyFrames});
   }
   rows.push({key,name:card.name,species:card.id,kind:card.structure?'structure':card.flying?'air':'ground',movement:moveName,attack:card.passive?null:attackName,emitter:emitterPart(card),customLoop:card.moveFrames||null,directions,warnings:directions.some(d=>d.emptyFrames)?['Empty original frame']:directions.some(d=>!card.structure&&d.movementPoses<2)?['Movement needs visual review']:[]});
  }
  captureImage=null;const sheets=[];
  for(const mode of['movement','attack'])for(let start=0;start<cards.length;start+=24){
   const group=cards.slice(start,start+24),canvas=document.createElement('canvas');canvas.width=1080;canvas.height=Math.ceil(group.length/3)*170;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#355744';c.fillRect(0,0,canvas.width,canvas.height);
   group.forEach(([key,card],index)=>{const left=index%3*360,top=Math.floor(index/3)*170;c.fillStyle='#fff5d3';c.font='13px sans-serif';c.fillText(card.name+' · '+(card.structure?'estructura':card.flying?'aéreo':'terrestre'),left+10,top+19);
    for(let phase=0;phase<3;phase++){const actor={id:1000+start+index,key,card,x:left+52+phase*108,y:top+143,dx:0,dy:-1,team:0,spawn:0,hit:0,moving:!card.structure,attack:mode==='attack'&&!card.passive?card.attackDuration*(1-[.12,.4,.7][phase]):0,attackDuration:card.attackDuration,attackWindup:card.windup,attackAnim:card.attackAnim,preview:true,lifetime:card.lifetime||0,maxHp:card.hp,hp:card.hp,radius:card.radius};renderer.t=[0,.25,.6][phase];renderer.sprite(c,actor,true);if(mode==='attack'&&!card.passive){const point=emissionPoint(actor);c.fillStyle='#f9da65';c.fillRect(Math.round(point.x)-1,Math.round(point.y)-1,3,3);}}
   });sheets.push({file:`${mode}-${Math.floor(start/24)+1}.png`,data:canvas.toDataURL('image/png')});
  }
  return{rows,sheets};
 });
 if(errors.length)throw Error(errors.join('\n'));
 await mkdir('docs/motion-review',{recursive:true});
 for(const sheet of result.sheets)await writeFile('docs/motion-review/'+sheet.file,Buffer.from(sheet.data.split(',')[1],'base64'));
 const report={date:new Date().toISOString().slice(0,10),protocol:{directions:8,movementSamples:16,attackSamples:12,source:'Original PMDCollab sprite sheets rendered by the actual game renderer'},species:new Set(result.rows.map(r=>r.species)).size,pokemonCards:result.rows.length,rows:result.rows};
 await writeFile('docs/POKEMON-MOTION-REVIEW.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({species:report.species,pokemonCards:report.pokemonCards,warnings:report.rows.filter(r=>r.warnings.length).map(r=>({key:r.key,warnings:r.warnings}))}));await context.close();
}finally{await browser.close();}
