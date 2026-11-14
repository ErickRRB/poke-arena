// Original Pokémon move recordings. Local release/contact timing is owned by Game.
import { FALLBACK_PCM } from './attack-audio-fallback.js?v=1';
const cue=(release,contact,fallback,releaseTime=.3,contactTime=.28,volume=.32)=>({release:[].concat(release),contact:[].concat(contact),fallback,releaseTime,contactTime,volume});
export const ATTACK_AUDIO=Object.freeze({
 punch:cue('quick-attack',['pound','horn-attack'],'pound',.2,.23),
 body:cue('strength',['body-slam1','body-slam2'],'pound',.26,.36,.4),
 slam:cue('strength',['stomp','body-slam2'],'rock-throw2',.25,.38,.42),
 rock:cue('rock-throw1',['rock-throw2','rock-slide'],'rock-throw2',.3,.38,.38),
 horn:cue('fury-attack','horn-attack','pound',.21,.28,.38),
 bite:cue('quick-attack','bite','bite',.16,.27),
 slash:cue('agility','slash','slash',.2,.28),
 dash:cue('agility','feint-attack2','quick-attack',.26,.25),
 bubble:cue('bubble','bubblebeam','hydro-pump',.3,.29),
 hydro:cue('water-gun','hydro-pump','hydro-pump',.38,.4,.38),
 ember:cue('ember','fire-spin','ember',.3,.32,.34),
 flame:cue('fire-spin','fire-blast','ember',.35,.48,.4),
 lightning:cue('thundershock','thunderbolt1','thundershock',.28,.34,.34),
 magnet:cue('thundershock','discharge','thundershock',.22,.29,.3),
 ice:cue('icy-wind1','ice-beam','icy-wind1',.33,.35,.32),
 bow:cue('bullet-seed','razor-leaf2','razor-leaf2',.22,.2,.28),
 petalBow:cue('petal-dance','petal-blizzard2','razor-leaf2',.36,.36,.34),
 dart:cue('poison-sting','fury-attack','poison-sting',.16,.17,.24),
 magicArrow:cue('aura-sphere1','aura-sphere2','aura-sphere1',.28,.29,.3),
 volley:cue('bullet-seed','petal-blizzard2','razor-leaf2',.3,.32,.34),
 leaf:cue('razor-leaf2','petal-dance','razor-leaf2',.25,.26),
 vine:cue('petal-dance','razor-leaf2','razor-leaf2',.24,.22),
 psychic:cue('psychic','psybeam','confusion',.34,.33,.32),
 confusion:cue('confusion','psychic','confusion',.3,.3),
 aura:cue('aura-sphere1','aura-sphere2','aura-sphere1',.32,.38,.36),
 shadow:cue('shadow-ball1','shadow-ball2','shadow-ball2',.32,.32,.32),
 poison:cue('acid','sludge-bomb2','acid',.3,.33),
 egg:cue('egg-bomb1','egg-bomb2','egg-bomb1',.24,.34),
 coin:cue('pay-day1','horn-attack','pound',.23,.18,.22),
 heal:cue('healing-pulse','recover','recover',.28,.28,.1),
 explosion:cue('fire-spin','explosion2','ember',.34,.55,.4),
 wind:cue('gust','quick-attack','quick-attack',.32,.25,.25),
});
export const soundStyle=style=>({powder:'leaf',song:'confusion',eruption:'flame',lick:'shadow',missiles:'volley',hyperbeam:'aura',freeze:'ice',spikes:'rock',stealthrock:'rock',whirlpool:'hydro',nightmare:'shadow',earthquake:'slam'})[style]||style;
const ATTACK_CUES={Archer:'bow',Princess:'petalBow',BlowdartGoblin:'dart',EliteArcher:'magicArrow',Pekka:'horn',Giant:'body',Golem:'rock',Prince:'body',HogRider:'body'};
const SPECIES_CUES={252:'bow',315:'petalBow',274:'dart',254:'dart',65:'magicArrow',121:'magicArrow',196:'magicArrow',112:'horn',143:'body',76:'rock',78:'body'};
export const attackCue=(profile,style)=>ATTACK_CUES[profile?.nativeReference]||SPECIES_CUES[profile?.id]||soundStyle(style||profile?.style||'punch');

export function prepareSample(ctx,buffer,move=false){
 let peak=0,sum=0,first=buffer.length,last=-1;
 for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch);for(const value of data){peak=Math.max(peak,Math.abs(value));sum+=value*value;}}
 const threshold=peak*.015;
 for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch);let a=0,b=data.length-1;while(a<b&&Math.abs(data[a])<threshold)a++;while(b>a&&Math.abs(data[b])<threshold)b--;first=Math.min(first,a);last=Math.max(last,b);}
 first=Math.max(0,first-Math.round(buffer.sampleRate*.005));last=Math.min(buffer.length-1,last+Math.round(buffer.sampleRate*.025));
 if(first>0||last<buffer.length-1){const trimmed=ctx.createBuffer(buffer.numberOfChannels,last-first+1,buffer.sampleRate);for(let ch=0;ch<buffer.numberOfChannels;ch++)trimmed.getChannelData(ch).set(buffer.getChannelData(ch).subarray(first,last+1));buffer=trimmed;}
 // PRSFX is loud (the source game halves its gain). Match quiet recordings with
 // bounded RMS correction, rather than boosting every transient to full scale.
 const rms=Math.sqrt(sum/(buffer.length*buffer.numberOfChannels)),gain=move?Math.min(2,.5/Math.max(peak,.001),.09/Math.max(rms,.001)):peak>.01?.8/peak:1;
 for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]*=gain;}
 return buffer;
}
export function installAttackFallbacks(ctx,buffers){
 for(const[key,{rate,data}]of Object.entries(FALLBACK_PCM)){
  const id='fallback:'+key;if(buffers.has(id))continue;
  const bytes=atob(data),buffer=ctx.createBuffer(1,bytes.length,rate),pcm=buffer.getChannelData(0);
  for(let i=0;i<bytes.length;i++)pcm[i]=(bytes.charCodeAt(i)-128)/128;
  buffers.set(id,prepareSample(ctx,buffer,true));
 }
}
