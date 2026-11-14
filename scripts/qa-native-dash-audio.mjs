import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createNativeIntegratedServer} from './qa-native-integrated-server.mjs';

const root=path.resolve(import.meta.dirname,'..'),option=(key,fallback)=>process.argv.find(value=>value.startsWith(`--${key}=`))?.slice(key.length+3)||fallback;
const checkpoint=option('checkpoint',null);assert.ok(checkpoint,'Use --checkpoint=<immutable commit>');
const server=await createNativeIntegratedServer({checkpoint});
const output=path.join(root,'docs/visual-followup/native-dash',server.checkpoint.slice(0,7));await mkdir(output,{recursive:true});
const module=process.env.POKE_ARENA_PLAYWRIGHT_MODULE||path.join(root,'../pokemon-arena/qa/node_modules/playwright/index.mjs');
const {chromium}=await import(pathToFileURL(module).href),browser=await chromium.launch({channel:'msedge',headless:true});
const report={generatedAt:new Date().toISOString(),checkpoint:server.checkpoint,scope:'Real Game chained dash, basic attacks on the surviving close target, Renderer and decoded SoundSystem through the public wire. No combat numbers or attack clocks are changed. Two passive stationary target fixtures replace enemy AI; the second target has extra HP. Real-time WebAudio and MediaRecorder, not simulated sound callbacks.',cases:[],findings:[]};
try{
  for(const mode of ['local30','snapshots15']){
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1}),errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    await page.addInitScript(()=>localStorage.setItem('poke-arena:sound','false'));
    await page.goto(server.url);await page.waitForFunction(()=>globalThis.__nativeIntegratedApp&&!document.getElementById('start-btn').disabled);
    await page.locator('#start-btn').click();
    await page.evaluate(async()=>{await import('/__qa/native-integrated-harness.mjs');await __nativeIntegrated.ready;const {SoundSystem}=await import('/audio.js?v=32');globalThis.__dashSound=new SoundSystem(true);await __dashSound.ready;const button=document.createElement('button');button.id='qa-audio-start';button.textContent='Reproducir prueba de sonido';button.style='position:fixed;inset:2px auto auto 2px;z-index:10000';button.onclick=()=>{__dashSound.unlock(true);button.remove();};document.body.append(button);});
    await page.locator('#qa-audio-start').click();
    await page.waitForFunction(()=>__dashSound.ctx?.state==='running');
    await page.evaluate(async()=>{await __dashSound.decodeSamples();});
    const result=await page.evaluate(async mode=>{
      const q=__nativeIntegrated,r=q.renderer,sound=__dashSound;
      await r.ensureSpecies([302,261,378]);
      const g=q.init({mode}),actor=g.spawn('sableye',0,96,604,0),first=g.spawn('poochyenaToken',1,240,604,0),second=g.spawn('regice',1,344,604,0);
      g.towers=[];
      for(const target of[first,second]){target.card={...target.card,passive:true,speed:0,damage:0,reflect:0,heal:0,lifetime:1e12};target.entryPending=false;}
      second.hp=second.maxHp=1e6;q.draw(0);
      const rect=q.canvas.getBoundingClientRect(),width=Math.round(rect.width/2)*2,height=Math.round(rect.height/2)*2;
      const surface=document.createElement('canvas');surface.width=width;surface.height=height;const ctx=surface.getContext('2d');ctx.imageSmoothingEnabled=false;
      const destination=sound.ctx.createMediaStreamDestination(),analyser=sound.ctx.createAnalyser();analyser.fftSize=1024;sound.master.connect(destination);sound.master.connect(analyser);
      const buffer=new Float32Array(analyser.fftSize),stream=destination.stream;
      const mime='audio/webm;codecs=opus',recorder=new MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:128000}),chunks=[];
      const videoChunks=[],encoderErrors=[],videoConfig={codec:'vp8',width,height,framerate:60,bitrate:1800000,latencyMode:'quality'};
      if(!(await VideoEncoder.isConfigSupported(videoConfig)).supported)throw new Error('VP8 VideoEncoder required for an exact 480-frame recording');
      const encoder=new VideoEncoder({output:chunk=>{const data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);videoChunks.push({data,timestamp:chunk.timestamp});},error:error=>encoderErrors.push(String(error))});encoder.configure(videoConfig);
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const stopped=new Promise(resolve=>recorder.onstop=resolve);
      let activeEvent=null;const outputs=[],events=[],frames=[],captures=[],nativeOutput=sound.output.bind(sound);
      sound.output=(node,volume,duration,pan,delay,voice)=>{const at=nativeOutput(node,volume,duration,pan,delay,voice);if(at!==null)outputs.push({event:activeEvent?.type,style:activeEvent?.style||null,sourceId:activeEvent?.unit?.id||activeEvent?.attacker?.id||null,gameTime:g.elapsed,at,volume,duration,voice:!!voice});return at;};
      const off=q.onEvent(event=>{
        activeEvent=event;
        const index=outputs.length;sound.event(event);
        if((event.unit?.id||event.attacker?.id)===actor.id&&['dashWindup','dashStart','attackRelease'].includes(event.type)){
          const source=event.unit||event.attacker,target=event.target||g.units.find(unit=>unit.id===source.dash?.targetId);
          events.push({type:event.type,style:event.style||null,at:g.elapsed,frame:q.frame,targetId:target?.id||null,gap:target?Math.hypot(source.x-target.x,source.y-target.y)-source.radius-target.radius:null,outputCount:outputs.length-index,audioTime:sound.ctx.currentTime,dash:event.unit?.dash?structuredClone(event.unit.dash):null});
        }
        activeEvent=null;
      });
      let lastDraw=null;const nativeDraw=r.ctx.drawImage.bind(r.ctx),images=new Map([...r.sprites].map(([key,image])=>[image,key]));
      r.ctx.drawImage=(image,...args)=>{const key=images.get(image);if(key?.startsWith('302-')){const animation=key.slice(4),meta=r.metadata[302][animation];lastDraw={animation,frame:args[0]/meta.width,direction:args[1]/meta.height};}return nativeDraw(image,...args);};
      const start=performance.now();recorder.start();let peak=0,seenEvents=0;
      for(let index=0;index<480;index++){
        const deadline=start+(index+1)*1000/60;
        await new Promise(resolve=>{const tick=now=>now+.1>=deadline?resolve():requestAnimationFrame(tick);requestAnimationFrame(tick);});
        lastDraw=null;q.step(1);ctx.drawImage(q.canvas,0,0,width,height);
        const videoFrame=new VideoFrame(surface,{timestamp:Math.round(index*1000000/60),duration:Math.round(1000000/60)});encoder.encode(videoFrame,{keyFrame:index%120===0});videoFrame.close();
        analyser.getFloatTimeDomainData(buffer);let energy=0;for(const value of buffer)energy+=value*value;const rms=Math.sqrt(energy/buffer.length);peak=Math.max(peak,rms);
        const displayed=r.frameActors.get(actor.id),row={index,wallMs:performance.now()-start,gameTime:g.elapsed,draw:lastDraw,attackSeq:displayed?.attackSeq,attackAge:displayed?.attackDuration-displayed?.attack,dash:displayed?.dash?.phase||null,x:displayed?.x,y:displayed?.y,rms};frames.push(row);
        const fresh=events.slice(seenEvents);seenEvents=events.length;
        for(const event of fresh)if(captures.filter(c=>c.type===event.type&&c.style===event.style).length<3)captures.push({type:event.type,style:event.style,frame:index,draw:lastDraw,png:surface.toDataURL('image/png').split(',')[1]});
        const lastStart=events.findLast(event=>event.type==='dashStart');
        if(row.dash==='travel'&&lastStart&&[2,8,14,20].includes(index+1-lastStart.frame))captures.push({type:'travel',style:null,frame:index,draw:lastDraw,png:surface.toDataURL('image/png').split(',')[1]});
      }
      recorder.stop();await stopped;await encoder.flush();encoder.close();off();r.ctx.drawImage=nativeDraw;sound.output=nativeOutput;
      sound.master.disconnect(destination);sound.master.disconnect(analyser);for(const track of stream.getTracks())track.stop();
      const encode64=bytes=>{let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);};
      videoChunks.sort((a,b)=>a.timestamp-b.timestamp);
      const ivf=new Uint8Array(32+videoChunks.reduce((n,chunk)=>n+12+chunk.data.length,0)),header=new DataView(ivf.buffer);
      ivf.set(new TextEncoder().encode('DKIF'),0);header.setUint16(6,32,true);ivf.set(new TextEncoder().encode('VP80'),8);header.setUint16(12,width,true);header.setUint16(14,height,true);header.setUint32(16,60,true);header.setUint32(20,1,true);header.setUint32(24,videoChunks.length,true);
      let offset=32;for(const chunk of videoChunks){header.setUint32(offset,chunk.data.length,true);header.setUint32(offset+4,Math.round(chunk.timestamp*60/1000000),true);ivf.set(chunk.data,offset+12);offset+=chunk.data.length+12;}
      return {mode,board:{width:rect.width,height:rect.height,recordingWidth:width,recordingHeight:height,camera:r.projection},durationMs:performance.now()-start,mime,videoFrames:videoChunks.length,videoCodec:'vp8',encoderErrors,audioState:sound.ctx.state,decodedSamples:sound.buffers.size,failedAssets:sound.failedAssets,peakRms:peak,nativeDashMin:actor.card.dashMin,firstTarget:{id:first.id,hp:first.hp},secondTarget:{id:second.id,hp:second.hp},actorId:actor.id,events,outputs,frames,captures,ivf:encode64(ivf),webm:encode64(new Uint8Array(await new Blob(chunks,{type:mime}).arrayBuffer()))};
    },mode);
    const {webm:media,ivf:video,captures:images,...diagnostic}=result;await writeFile(path.join(output,mode+'-diagnostic.json'),JSON.stringify(diagnostic,null,2)+'\n');
    assert.ok(result.durationMs>=7800&&result.durationMs<=9000,'eight simulated seconds must be recorded at their real-time cadence');
    assert.equal(result.videoFrames,480);assert.deepEqual(result.encoderErrors,[]);
    assert.deepEqual(errors,[]);assert.equal(result.failedAssets,0);assert.equal(result.audioState,'running');assert.ok(result.peakRms>.0001,'the recorded audio graph must contain a signal');
    const starts=result.events.filter(e=>e.type==='dashStart'),dashes=result.events.filter(e=>e.type==='attackRelease'&&e.style==='dash'),basics=result.events.filter(e=>e.type==='attackRelease'&&e.style!=='dash');
    assert.equal(starts.length,2,'dash again only at the new valid target');assert.equal(dashes.length,2);assert.ok(starts.every(event=>event.gap>=result.nativeDashMin),'both starts have a valid native body gap');assert.ok(basics.length>=2,'use basics while the second target remains close');assert.ok(starts.every(event=>event.outputCount>0),'both dash starts schedule real audio');assert.ok(dashes.every(event=>event.outputCount>0),'both dash impacts schedule real audio');assert.ok(result.firstTarget.hp<=0&&result.secondTarget.hp>0);
    const webm=path.join(output,mode+'-audio.webm'),ivf=path.join(output,mode+'.ivf');await writeFile(webm,Buffer.from(result.webm,'base64'));await writeFile(ivf,Buffer.from(result.ivf,'base64'));delete result.webm;delete result.ivf;
    for(const [index,capture]of result.captures.entries()){const filename=`${mode}-${index}-${capture.type}.png`;await writeFile(path.join(output,filename),Buffer.from(capture.png,'base64'));delete capture.png;capture.file=filename;}
    const ffmpeg=process.env.POKE_ARENA_FFMPEG||'C:/Users/Mapa/AppData/Local/Programs/ffmpeg/ffmpeg-8.1.2-essentials_build/bin/ffmpeg.exe';
    execFileSync(ffmpeg,['-v','error','-y','-i',ivf,'-i',webm,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','18','-fps_mode','passthrough','-c:a','aac','-b:a','160k',path.join(output,mode+'.mp4')],{windowsHide:true});
    report.cases.push(result);console.log(`${mode}: 2 dash starts + 2 dash contacts with real audio; ${basics.length} close basic attacks; RMS ${result.peakRms.toFixed(4)}`);
    await page.close();
  }
  assert.deepEqual([...server.engineURLs],['/engine.js?v=26']);report.sourceHashes=server.sourceHashes;report.qaHashes=server.qaHashes;report.engineURLs=[...server.engineURLs];report.missing=server.missing;
  report.runnerSha256=createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex');
  await writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();await server.close();}
