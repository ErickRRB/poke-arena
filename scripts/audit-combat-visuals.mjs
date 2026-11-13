import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {openPage,ready} from '../tests/browser/helpers.mjs';
const module=process.env.POKE_ARENA_PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(/^[A-Za-z]:[\\/]/.test(module)?pathToFileURL(module).href:module);
const url=process.argv[2]||'http://127.0.0.1:4173',browser=await chromium.launch({...(process.platform==='win32'?{channel:'msedge'}:{}),headless:true});
try{
 const {page,context,errors}=await openPage(browser,{width:1366,height:900});page.setDefaultTimeout(60000);await page.goto(url);await ready(page);
 const review=await page.evaluate(async()=>{
  const {Game,CARDS}=await import('/engine.js?v=26'),{emitterPart}=await import('/sprite-motion.js?v=26'),{combatVisual,projectileVisual}=await import('/combat-visuals.js?v=29'),{SoundSystem}=await import('/audio.js?v=29');
  const renderer=__qa.renderer,cards=Object.entries(CARDS).filter(([,c])=>!c.spell);
  await renderer.ensureSpecies([...new Set(cards.map(([,c])=>c.id))]);renderer.verticalScale=1;renderer.reduced=false;renderer.drawDt=1/60;
  const panels=[],rows=[];
  for(let start=0;start<cards.length;start+=20){
   const panel=document.createElement('canvas');panel.width=1200;panel.height=Math.ceil(Math.min(20,cards.length-start)/3)*180;
   const ctx=panel.getContext('2d');ctx.fillStyle='#355744';ctx.fillRect(0,0,panel.width,panel.height);ctx.imageSmoothingEnabled=false;
   for(const [index,[key,card]]of cards.slice(start,start+20).entries()){
    const cell=document.createElement('canvas');cell.width=400;cell.height=180;const c=cell.getContext('2d');c.imageSmoothingEnabled=false;
    const events=[],game=new Game({seed:123,onEvent:event=>{events.push(event);renderer.onEvent(event);}});
    game.state='playing';game.aiEnabled=false;game.towers.forEach(t=>t.active=false);renderer.effects=[];renderer.particles=[];renderer.resetVisuals();
    const actor=game.spawn(key,0,80,140,0),target=card.building?game.towers.find(t=>t.team===1&&!t.king):game.spawn('snorlax',1,80+Math.min(135,card.range),140,0);
    target.x=80+Math.min(135,card.range);target.y=140;
    if(target.card)target.card={...target.card,damage:0,speed:0,hp:999999};target.hp=target.maxHp=999999;actor.card={...card,speed:0,copy:false};actor.spawn=target.spawn=0;
    game.face(actor,target);if(!card.passive)game.attack(actor,target);
    const snapshotAt=card.windup+.16;let projectiles=0,drawnSize=0;
    const originalArt=renderer.combatArt;renderer.combatArt=function(...args){drawnSize=Math.max(drawnSize,args[4]||0);return originalArt.apply(this,args);};
    for(let step=0;step<=Math.ceil(snapshotAt*60);step++){
     game.step(1/60);renderer.t=step/60;renderer.frameActors=new Map(game.units.map(unit=>[unit.id,unit]));
     c.clearRect(0,0,400,180);renderer.sprite(c,{...actor,preview:true},true);
     for(const projectile of game.projectiles){projectiles++;renderer.projectile(c,projectile);}
     renderer.drawEffects(c,1/60);
    }
    renderer.combatArt=originalArt;
    // Beside the actual attack, show the travelling raster at its reviewed size.
    const visual=combatVisual(card),motion=projectileVisual(card.style,.25);
    if(card.range>70&&!card.passive)renderer.combatArt(c,motion.name,330,115,visual.projectile,0,visual.projectile,{age:.25,fps:motion.fps,frame:motion.frame,frames:motion.frames,trim:true});
    ctx.drawImage(cell,index%3*400,Math.floor(index/3)*180);ctx.fillStyle='#fff5d3';ctx.font='13px sans-serif';ctx.fillText(card.name+' · '+visual.projectile.toFixed(1)+' px',index%3*400+10,Math.floor(index/3)*180+20);
    rows.push({key,name:card.name,species:card.id,source:'PMDCollab original, eight directions',emitter:emitterPart(card),visual,projectileRaster:motion.name,releaseEvents:events.filter(e=>e.type==='attackRelease').length,travellingSamples:projectiles,maxEffectSize:drawnSize,passive:!!card.passive,suicide:!!card.suicide});
   }
   panels.push(panel.toDataURL('image/png'));
  }
  const audio=new SoundSystem(false);await audio.ready;const context=new AudioContext(),voices=[];
  for(const id of [...new Set(cards.map(([,c])=>c.id))]){
   const bytes=audio.encoded.get('cries:'+id);if(!bytes)throw Error('Missing voice '+id);
   const buffer=await context.decodeAudioData(bytes.slice(0));voices.push({id,seconds:buffer.duration,channels:buffer.numberOfChannels,sampleRate:buffer.sampleRate});
  }
  await context.close();
  const fire=document.createElement('canvas');fire.width=1100;fire.height=330;const c=fire.getContext('2d');c.fillStyle='#355744';c.fillRect(0,0,1100,330);
  for(let i=0;i<5;i++){
   c.save();c.translate(i*220,0);const spell={startX:180,startY:290,x:70,y:70,flightElapsed:(i+1)*.16,flightTime:1,card:CARDS.fireball};renderer.fireball(c,spell);c.restore();
  }
  return {rows,panels,voices,fire:fire.toDataURL('image/png')};
 });
 assert.deepEqual(errors,[]);assert.equal(review.rows.length,101);assert.equal(review.voices.length,93);
 assert.deepEqual(review.rows.filter(row=>!row.passive&&!row.suicide&&!row.releaseEvents).map(row=>row.key),[],'each attack must actually release in its legal matchup');
 await mkdir('docs/combat-review',{recursive:true});
 for(const[index,data]of review.panels.entries())await writeFile(`docs/combat-review/attacks-${index+1}.png`,Buffer.from(data.split(',')[1],'base64'));
 await writeFile('docs/combat-review/fireball.png',Buffer.from(review.fire.split(',')[1],'base64'));
 await writeFile('docs/COMBAT-VISUAL-REVIEW.json',JSON.stringify({date:new Date().toISOString().slice(0,10),rows:review.rows,voices:review.voices},null,2)+'\n');
 console.log(JSON.stringify({pokemonCards:review.rows.length,voicesDecoded:review.voices.length,attackReleases:review.rows.reduce((sum,r)=>sum+r.releaseEvents,0),browserErrors:errors.length}));await context.close();
}finally{await browser.close();}
