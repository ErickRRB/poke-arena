// Recorded CC0 combat phases. Damage and event timing remain owned by Game.
import { FALLBACK_PCM } from './attack-audio-fallback.js?v=35';
const cue=(release,contact,fallback,releaseTime=.4,contactTime=.6,volume=.22,releaseVolume=.075)=>({release:[].concat(release),contact:[].concat(contact),fallback,releaseTime,contactTime,volume,releaseVolume});
export const ATTACK_AUDIO=Object.freeze({
 punch:cue([],['punch-medium-1','punch-medium-2'],'punch-medium-1',0,.4,.18),
 body:cue([],['punch-heavy-3','punch-heavy-5'],'punch-heavy-3',0,.6,.29),
 slam:cue([],['earth-2','earth-4'],'earth-2',0,1.6,.29),
 rock:cue('air-flight-b',['earth-2','earth-4'],'earth-2',.27,1.6,.24,.045),
 horn:cue([],['punch-heavy-1','punch-heavy-3'],'punch-heavy-3',0,.6,.27),
 bite:cue([],['punch-medium-3','punch-medium-2'],'punch-medium-1',0,.4,.19),
 slash:cue([],['punch-medium-2','punch-medium-3'],'punch-medium-1',0,.4,.18),
 dash:cue('air-flight-b','punch-heavy-3','punch-heavy-3',.27,.46,.24,.07),
 bubble:cue('water-flight','water-tap','water-tap',.34,.56,.18,.065),
 hydro:cue('water-flight',['water-1','water-3'],'water-tap',.34,2.32,.24,.09),
 ember:cue('fire-flight','fire-tap','fire-tap',.24,.61,.2,.07),
 flame:cue('fire-flight',['fire-1','fire-3'],'fire-tap',.24,1.8,.27,.09),
 lightning:cue('electric-flight',['electric-tap-a','electric-tap-b'],'electric-tap-a',.43,.56,.22,.07),
 magnet:cue('electric-flight','electric-tap-b','electric-tap-a',.43,.56,.19,.06),
 ice:cue('ice-flight',['ice-tap','ice-3'],'ice-tap',.21,1.47,.19,.065),
 bow:cue('leaf-flight',['punch-medium-2','punch-medium-3'],'punch-medium-1',.27,.4,.16,.085),
 petalBow:cue('petal-flight','plant-2','leaf-tap',.15,1.85,.22,.085),
 dart:cue('air-flight-a','punch-medium-1','punch-medium-1',.16,.33,.14,.06),
 magicArrow:cue('magic-flight','healing-10','healing-10',.32,.9,.18,.07),
 volley:cue('leaf-flight','leaf-tap','leaf-tap',.27,.46,.2,.085),
 leaf:cue('leaf-flight','leaf-tap','leaf-tap',.27,.46,.19,.07),
 vine:cue('petal-flight','plant-1','leaf-tap',.15,1.57,.19,.065),
 psychic:cue('magic-flight','healing-9','healing-9',.32,1.21,.19,.065),
 confusion:cue('shadow-flight','healing-15','healing-15',.26,1.21,.17,.065),
 aura:cue('magic-flight','healing-12','healing-12',.32,1.03,.23,.08),
 shadow:cue('shadow-flight','healing-15','healing-15',.26,1.21,.2,.07),
 poison:cue('water-flight','water-tap','water-tap',.34,.56,.18,.06),
 egg:cue('air-flight-b','punch-heavy-5','punch-heavy-3',.27,.51,.24,.06),
 coin:cue('air-flight-a','punch-medium-2','punch-medium-1',.16,.32,.14,.055),
 heal:cue('magic-flight','healing-4','healing-4',.32,1.25,.075,.03),
 explosion:cue('fire-flight','fire-1','fire-tap',.24,1.78,.3,.085),
 wind:cue('air-flight-b',['wind-1','wind-5'],'wind-5',.27,2.57,.18,.065),
});
export const soundStyle=style=>({powder:'leaf',song:'confusion',eruption:'flame',lick:'shadow',missiles:'volley',hyperbeam:'aura',freeze:'ice',spikes:'rock',stealthrock:'rock',whirlpool:'hydro',nightmare:'shadow',earthquake:'slam'})[style]||style;
const ATTACK_CUES={Archer:'bow',Princess:'petalBow',BlowdartGoblin:'dart',EliteArcher:'magicArrow',Pekka:'horn',Giant:'body',Golem:'rock',Prince:'body',HogRider:'body'};
const SPECIES_CUES={50:'punch',252:'bow',315:'petalBow',274:'dart',254:'dart',65:'magicArrow',121:'magicArrow',196:'magicArrow',112:'horn',143:'body',76:'rock',78:'body',353:'punch'};
export const attackCue=(profile,style)=>ATTACK_CUES[profile?.nativeReference]||SPECIES_CUES[profile?.id]||soundStyle(style||profile?.style||'punch');

export function prepareSample(ctx,buffer,move=false){
 if(!buffer.length)return buffer;
 let peak=0,first=buffer.length,last=-1;
 for(let ch=0;ch<buffer.numberOfChannels;ch++)for(const value of buffer.getChannelData(ch))peak=Math.max(peak,Math.abs(value));
 if(!peak)return buffer;
 // Preserve the quiet recorded decay of modern SFX. Voices keep their existing trim.
 const threshold=move?Math.max(.00003,peak*.0005):peak*.015;
 for(let ch=0;ch<buffer.numberOfChannels;ch++){
  const data=buffer.getChannelData(ch);let a=0,b=data.length-1;
  while(a<data.length&&Math.abs(data[a])<threshold)a++;
  while(b>=a&&Math.abs(data[b])<threshold)b--;
  if(b>=a){first=Math.min(first,a);last=Math.max(last,b);}
 }
 if(last<first)return buffer;
 first=Math.max(0,first-Math.round(buffer.sampleRate*.005));last=Math.min(buffer.length-1,last+Math.round(buffer.sampleRate*.025));
 if(first>0||last<buffer.length-1){
  const trimmed=ctx.createBuffer(buffer.numberOfChannels,last-first+1,buffer.sampleRate);
  for(let ch=0;ch<buffer.numberOfChannels;ch++)trimmed.getChannelData(ch).set(buffer.getChannelData(ch).subarray(first,last+1));
  buffer=trimmed;
 }
 // Measure retained samples only. Attenuate loud SFX without raising quiet noise.
 let sum=0;for(let ch=0;ch<buffer.numberOfChannels;ch++)for(const value of buffer.getChannelData(ch))sum+=value*value;
 const rms=Math.sqrt(sum/(buffer.length*buffer.numberOfChannels));
 const gain=move?Math.min(1,.6/peak,.09/Math.max(rms,.001)):peak>.01?.8/peak:1;
 for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]*=gain;}
 return buffer;
}
export function installAttackFallbacks(ctx,buffers){
 for(const[key,{rate,bits,channels,data}]of Object.entries(FALLBACK_PCM)){
  const id='fallback:'+key;if(buffers.has(id))continue;
  if(bits!==16||rate<44100||channels!==1)throw Error('Unsupported clean fallback '+key);
  const bytes=Uint8Array.from(atob(data),value=>value.charCodeAt(0)),view=new DataView(bytes.buffer),frames=bytes.length/2;
  const buffer=ctx.createBuffer(1,frames,rate),pcm=buffer.getChannelData(0);
  for(let i=0;i<frames;i++)pcm[i]=view.getInt16(i*2,true)/32768;
  buffers.set(id,prepareSample(ctx,buffer,true));
 }
}
