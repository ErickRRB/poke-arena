import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'dist'),out=path.join(root,'docs/audio-feedback-2026-11-14');await mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;if(p==='/'){res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><title>Audio audit</title>');return;}const file=path.resolve(dist,'.'+p);if(!file.startsWith(dist+path.sep))throw Error('Path');const bytes=await readFile(file);res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':'application/octet-stream'}).end(bytes);}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const{chromium}=await import(pathToFileURL(path.join(root,'qa/node_modules/playwright/index.mjs')).href),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);
 const report=await page.evaluate(async()=>{
  const{SoundSystem}=await import('/audio.js'),{Game,CARDS}=await import('/engine.js?v=26'),{BattleMusic}=await import('/music.js?v=26');
  const preload=new SoundSystem();await preload.ready;preload.ctx=new OfflineAudioContext(2,44100,44100);await preload.decodeSamples();
  const rate=44100,span=2.1,keys=['treecko','treecko-pair','roselia','nuzleaf','alakazam','rhydon','snorlax','sableye','squirtle','ampharos-up','ampharos-down','pinMissile','fireball','heal','mixed-voices','mixed-music'];
  const rows=[],demo=[new Float32Array(Math.ceil(keys.length*span*rate)),new Float32Array(Math.ceil(keys.length*span*rate))];
  for(let index=0;index<keys.length;index++){
   const key=keys[index],ctx=new OfflineAudioContext(2,Math.ceil(span*rate),rate);let clock=0;
   Object.defineProperty(ctx,'state',{get:()=> 'running'});Object.defineProperty(ctx,'currentTime',{get:()=>clock});
   const sound=Object.assign(Object.create(SoundSystem.prototype),{enabled:true,ctx,last:new Map(),buffers:preload.buffers,voiceSlots:[],effectSlots:[],master:ctx.createGain(),noiseBuffer:ctx.createBuffer(1,rate,rate)});
   sound.master.gain.value=.7;const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-18;compressor.ratio.value=5;sound.master.connect(compressor);compressor.connect(ctx.destination);let seed=937;const noise=sound.noiseBuffer.getChannelData(0);for(let i=0;i<noise.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;noise[i]=(seed/4294967296*2-1)*.7;}
   const events=[],outputs=[],original=sound.output;
   sound.output=function(node,volume,duration,pan,delay=0,voice){const at=original.call(this,node,volume,duration,pan,delay,voice);if(at!==null)outputs.push({at,volume,duration,pan:pan||0,voice:!!voice});return at;};
   const emit=e=>{const before=outputs.length;sound.event(e);if(outputs.length>before)events.push({type:e.type,at:clock,outputs:outputs.length-before});};
   if(key==='mixed-music'){sound.music=new BattleMusic(ctx,sound.master);sound.music.seed=937;sound.music.noise=sound.noiseBuffer;sound.music.setPlaying(true);clearInterval(sound.music.timer);}
   if(key.startsWith('mixed-'))for(const id of [25,6,315])sound.cry(id,300);
   if(key.startsWith('ampharos-'))emit({type:'burrow',unit:{x:180},hidden:key.endsWith('down')});
   else if(key==='heal')emit({type:'heal',unit:{x:180}});
   else{
    let game;game=new Game({seed:937,onEvent:e=>{clock=game?.elapsed||0;emit(e);}});game.start();game.aiEnabled=false;for(const tower of game.towers)tower.active=false;
    const spell=!!CARDS[key]?.spell,target=game.spawn('snorlax',1,180,440,0);target.hp=target.maxHp=1e8;target.card={...target.card,passive:true,speed:0,structure:true,lifetime:1e12};
    if(spell){game.hands[0][0]=key;game.energy[0]=10;game.deploy(0,0,180,440);}
    else{
      const squad=key==='treecko-pair'?['treecko','treecko']:key.startsWith('mixed-')?['treecko','nuzleaf','roselia','rhydon']: [key];
      for(const [index,species] of squad.entries()){
        const x=180+index*36,actor=game.spawn(species,0,x,500,0),victim=index?game.spawn('snorlax',1,x,440,0):target;
        victim.hp=victim.maxHp=1e8;victim.card={...victim.card,passive:true,speed:0,structure:true,lifetime:1e12};actor.entryPending=false;game.attack(actor,victim);actor.cooldown=999;
      }
    }
    while(game.elapsed<span-.1){game.step(1/30);clock=game.elapsed;}
   }
   const buffer=await ctx.startRendering();let peak=0,sum=0,nonzero=0;
   for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);demo[channel].set(data,Math.floor(index*span*rate));for(const sample of data){peak=Math.max(peak,Math.abs(sample));sum+=sample*sample;if(Math.abs(sample)>1e-6)nonzero++;}}
   if(!nonzero||peak>=.98)throw Error(key+' silent or clipping: '+peak);
   rows.push({key,previewAt:index*span,events,outputs,peak,rms:Math.sqrt(sum/buffer.length/2)});
  }
  const frames=demo[0].length,bytes=new Uint8Array(44+frames*4),view=new DataView(bytes.buffer),ascii=(at,text)=>{for(let i=0;i<text.length;i++)view.setUint8(at+i,text.charCodeAt(i));};
  ascii(0,'RIFF');view.setUint32(4,bytes.length-8,true);ascii(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,rate,true);view.setUint32(28,rate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);ascii(36,'data');view.setUint32(40,frames*4,true);
  for(let i=0;i<frames;i++)for(let channel=0;channel<2;channel++)view.setInt16(44+i*4+channel*2,Math.round(Math.max(-1,Math.min(1,demo[channel][i]))*32767),true);
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return{rows,decodedSamples:preload.buffers.size,preview:btoa(binary),sampleRate:rate,scope:'Actual Game events and SoundSystem rendered by browser OfflineAudioContext at production master .7 and compressor settings. Controlled stationary targets, one/two/mixed attacks, three simultaneous voices and the real BattleMusic first bar. Peak/RMS verify output and headroom, not perceived quality or speaker balance.'};
 });
 const wav=Buffer.from(report.preview,'base64');delete report.preview;await writeFile(path.join(out,'feedback-preview.wav'),wav);
 report.hashes=Object.fromEntries(await Promise.all(['dist/audio.js','dist/engine.js','dist/assets/audio/manifest.json'].map(async file=>[file,createHash('sha256').update(await readFile(path.join(root,file))).digest('hex')])));report.previewSha256=createHash('sha256').update(wav).digest('hex');
 report.retired=Object.fromEntries(['heavy','punch-1','punch-2','punch-3'].map(name=>{const file='dist/assets/audio/foley/'+name+'.ogg',bytes=execFileSync('git',['show','ab068f3:'+file],{cwd:root,windowsHide:true});return[file,{publicSourceCommit:'ab068f3',sha256:createHash('sha256').update(bytes).digest('hex'),removedFrom:'Manifest, recorded routes, synthesis fallback, downloader and distributed file.'}];}));
 await writeFile(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({cases:report.rows.length,decoded:report.decodedSamples,peak:Math.max(...report.rows.map(r=>r.peak)),output:out}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
