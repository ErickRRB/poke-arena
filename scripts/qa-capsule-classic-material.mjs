import path from 'node:path';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createNativeIntegratedServer} from './qa-native-integrated-server.mjs';

const root=path.resolve(import.meta.dirname,'..'),checkpoint=process.argv.find(value=>value.startsWith('--checkpoint='))?.slice(13);
if(!checkpoint)throw new Error('Use --checkpoint=<immutable commit>');
const server=await createNativeIntegratedServer({checkpoint}),out=path.join(root,'docs/visual-followup/capsule-classic-v3',server.checkpoint.slice(0,7));await mkdir(path.join(out,'frames'),{recursive:true});
const module=process.env.POKE_ARENA_PLAYWRIGHT_MODULE||path.join(root,'../pokemon-arena/qa/node_modules/playwright/index.mjs');
const {chromium}=await import(pathToFileURL(module).href),browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1000,height:620},deviceScaleFactor:1}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.route('**/app.js?*',route=>route.fulfill({contentType:'text/javascript',body:'/* Isolated material preview: app intentionally not started. */'}));
  await page.goto(server.url);
  const result=await page.evaluate(async()=>{
    const {CapsuleArt,CAPSULE_TEXTURE}=await import('/capsule-art.js');
    const load=async file=>{const image=new Image();image.src='/'+file;await image.decode();return image;};
    const before=new CapsuleArt(await load('assets/battle/pokeball-material-v2.png')),after=new CapsuleArt(await load(CAPSULE_TEXTURE));
    const sheet=document.createElement('canvas');sheet.width=960;sheet.height=510;const c=sheet.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#a1ba7d';c.fillRect(0,0,960,510);
    c.fillStyle='#20392f';c.font='bold 16px system-ui';c.fillText('Mismo giro y luz · material anterior / clásico V3 · diámetro CSS real',16,24);
    const rows=[{art:before,y:85,size:32,label:'V2 rechazada · 32px'},{art:after,y:145,size:32,label:'Clásica V3 · 32px'},{art:before,y:230,size:40,label:'V2 rechazada · 40px'},{art:after,y:300,size:40,label:'Clásica V3 · 40px'}];
    for(const row of rows){c.fillStyle='#20392f';c.font='13px system-ui';c.fillText(row.label,16,row.y-28);for(let phase=0;phase<8;phase++)row.art.draw(c,58+phase*120,row.y,row.size,phase*Math.PI/4,0);}
    c.font='13px system-ui';c.fillText('Inspección ampliada: frente / perfil / dorso',16,370);for(const[index,phase]of[0,Math.PI/2,Math.PI].entries())after.draw(c,100+index*220,438,96,phase,0);
    const frames=[],motion=document.createElement('canvas');motion.width=256;motion.height=240;const m=motion.getContext('2d');m.imageSmoothingEnabled=false;
    for(let frame=0;frame<96;frame++){
      m.fillStyle='#a1ba7d';m.fillRect(0,0,256,240);m.fillStyle='#20392f';m.font='12px system-ui';m.fillText('V2 anterior',18,20);m.fillText('Clásica V3',142,20);m.fillText('32 CSSpx',8,100);m.fillText('40 CSSpx',8,215);
      const angle=frame/60*4;for(const[size,y]of[[32,65],[40,165]]){before.draw(m,65,y,size,angle,0);after.draw(m,185,y,size,angle,0);}
      frames.push(motion.toDataURL('image/png').split(',')[1]);
    }
    return{sheet:sheet.toDataURL('image/png').split(',')[1],frames,texture:CAPSULE_TEXTURE,diametersCss:[32,40],phases:8,angleRate:4};
  });
  if(errors.length)throw new Error(errors.join('\n'));
  await writeFile(path.join(out,'comparison.png'),Buffer.from(result.sheet,'base64'));delete result.sheet;
  for(const[index,png]of result.frames.entries())await writeFile(path.join(out,'frames',String(index).padStart(3,'0')+'.png'),Buffer.from(png,'base64'));
  const frameCount=result.frames.length;delete result.frames;
  const ffmpeg=process.env.POKE_ARENA_FFMPEG||'C:/Users/Mapa/AppData/Local/Programs/ffmpeg/ffmpeg-8.1.2-essentials_build/bin/ffmpeg.exe';
  execFileSync(ffmpeg,['-v','error','-y','-framerate','60','-i',path.join(out,'frames/%03d.png'),'-c:v','libx264','-crf','17','-pix_fmt','yuv420p',path.join(out,'material-cycle.mp4')],{windowsHide:true});
  const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
  const report={checkpoint:server.checkpoint,generatedAt:new Date().toISOString(),scope:'Isolated material A/B using the same CapsuleArt class, angle and light at actual 32/40 CSS pixels. V2 is its authentic texture, not a production gameplay recording. No Game, flight physics or input validation is claimed here.',...result,frameCount,fps:60,sourceHashes:server.sourceHashes,qaHashes:server.qaHashes,errors};
  report.artifacts=Object.fromEntries(await Promise.all(['comparison.png','material-cycle.mp4'].map(async file=>[file,sha(await readFile(path.join(out,file)))])));
  await writeFile(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({out,frameCount,fps:60,errors}));
}finally{await browser.close();await server.close();}
