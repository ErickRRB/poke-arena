import { readFile, writeFile } from 'node:fs/promises';
import { CARDS } from '../dist/engine.js';

// Code-native portraits retain the project's original Pokémon artwork.
const keys=['centralElectrode','madriguera','vivero','regice','duskull','raichu','registeel','regirock','celebi','pandilla','pinMissile','lightning','hyperBeam','blizzard','spikes','stealthRock','whirlpool','nightmare','earthquake'];
const png=async id=>'data:image/png;base64,'+(await readFile(new URL(`../dist/assets/pokemon/${id}/art.png`,import.meta.url))).toString('base64');
const bolt='<path d="m232 55-118 159h76l-25 123 116-171h-80z" fill="url(#power)" stroke="#fff6cf" stroke-width="7" stroke-linejoin="round"/>';
const spike=(x,y,size=1)=>`<g transform="translate(${x} ${y}) scale(${size})"><path d="m-18 20 14-58 13 51 20-22 5 37z" fill="url(#power)" stroke="#fff4d1" stroke-width="3"/></g>`;
const ghost=(x,y,scale=1)=>`<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-45 38v-42a45 45 0 0 1 90 0v42L23 25 0 42-23 25Z" fill="url(#power)" stroke="#dfc6ff" stroke-width="3"/><ellipse cx="-15" cy="-6" rx="7" ry="10" fill="#211839"/><ellipse cx="15" cy="-6" rx="7" ry="10" fill="#211839"/></g>`;
for(const key of keys){
  const c=CARDS[key],color=c.color,structure=c.structure;
  let drawing='';
  if(!c.spell){
    if(structure)drawing+='<path d="m65 300 135-40 135 40v50l-135 42-135-42Z" fill="#3b4b6b" stroke="#aeb9cd" stroke-width="4"/><path d="m65 300 135 40 135-40M200 340v52" stroke="#7b91b5" stroke-width="4" fill="none"/>';
    if(key==='pandilla'){
      drawing+=`<image href="${await png(280)}" x="25" y="110" width="140" height="180"/><image href="${await png(280)}" x="235" y="110" width="140" height="180"/><image href="${await png(261)}" x="95" y="105" width="210" height="230"/>`;
    }else drawing+=`<image href="${await png(c.id)}" x="${structure?45:20}" y="${structure?60:35}" width="${structure?310:360}" height="${structure?285:345}" filter="url(#shadow)"/>`;
    if(c.summon){drawing+=`<image href="${await png(CARDS[c.summon].id)}" x="240" y="285" width="120" height="125" filter="url(#shadow)"/>`;}
  }else if(key==='lightning')drawing=bolt+'<g transform="translate(-65 15) scale(.7)">'+bolt+'</g><g transform="translate(175 65) scale(.6)">'+bolt+'</g>';
  else if(key==='pinMissile')for(let i=0;i<7;i++){const x=80+i%3*100,y=95+Math.floor(i/3)*75;drawing+=`<g transform="translate(${x} ${y}) rotate(27)"><path d="M0-60v90M-7-45V4M7-35v24" stroke="#eaffb9" stroke-width="4" opacity=".7"/><path d="m0 50-13-28 13 7 13-7Z" fill="#f2ffc9" stroke="${color}" stroke-width="4"/></g>`;}
  else if(key==='hyperBeam')drawing='<path d="m170 0-12 270-82 40 124 57 124-57-82-40L230 0Z" fill="url(#power)" opacity=".85"/><path d="m190 0-4 300 14 20 14-20-4-300" fill="#fff8da"/><ellipse cx="200" cy="315" rx="126" ry="42" fill="none" stroke="#ffe8af" stroke-width="8"/>';
  else if(key==='blizzard')for(let i=0;i<6;i++){const a=i*Math.PI/3;drawing+=`<g transform="translate(200 205) rotate(${i*60})"><path d="M0 0V-135m0 45-27-27m27 27 27-27m-27 72-40-30m40 30 40-30" fill="none" stroke="#defbff" stroke-width="8" stroke-linecap="round"/></g>`;} 
  else if(key==='spikes'||key==='stealthRock')for(let i=0;i<7;i++)drawing+=spike(80+i%3*115,160+Math.floor(i/3)*77,.8+(i%2)*.25);
  else if(key==='whirlpool')for(let i=0;i<6;i++)drawing+=`<ellipse cx="200" cy="${160+i*22}" rx="${133-i*17}" ry="${54-i*5}" fill="none" stroke="${i%2?'#dafaff':'#55b9ed'}" stroke-width="${9-i}" transform="rotate(${-13+i*5} 200 ${160+i*22})"/>`;
  else if(key==='nightmare')drawing='<path d="M260 74a92 92 0 1 0 18 161 83 83 0 0 1-18-161Z" fill="#ccb7ff" opacity=".8"/>'+ghost(110,235,.8)+ghost(230,290,1.1)+ghost(310,210,.65);
  else if(key==='earthquake')drawing='<ellipse cx="200" cy="270" rx="165" ry="75" fill="#97775c" stroke="#e2b680" stroke-width="6"/><path d="m220 193-35 52 45 22-57 50 30 24m-18-96-80-22-35 28m160 16 80-20 37 26m-164 44-60-25-54 20" fill="none" stroke="#2e2634" stroke-width="12" stroke-linejoin="round"/><path d="m220 193-35 52 45 22-57 50" fill="none" stroke="#ffd598" stroke-width="3"/>';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><defs><radialGradient id="bg" cx="50%" cy="35%" r="75%"><stop stop-color="${color}" stop-opacity=".8"/><stop offset=".65" stop-color="#243655"/><stop offset="1" stop-color="#0a152c"/></radialGradient><linearGradient id="power" x2=".7" y2="1"><stop stop-color="#fff9db"/><stop offset=".45" stop-color="${color}"/><stop offset="1" stop-color="#697c9b"/></linearGradient><filter id="shadow"><feDropShadow dy="12" stdDeviation="5" flood-color="#020817" flood-opacity=".7"/></filter></defs><path fill="url(#bg)" d="M0 0h400v500H0z"/><path d="M0 350 400 230v270H0Z" fill="#0c1a32" opacity=".3"/><circle cx="200" cy="220" r="149" fill="none" stroke="${color}" stroke-opacity=".22" stroke-width="2"/><circle cx="200" cy="220" r="125" fill="none" stroke="#fff" stroke-opacity=".1" stroke-dasharray="7 18" stroke-width="3"/>${drawing}<path d="M0 440 400 350v150H0Z" fill="#081329" opacity=".3"/></svg>`;
  await writeFile(new URL(`../dist/assets/cards/${key}.svg`,import.meta.url),svg);
}
console.log(`Created ${keys.length} expansion portraits.`);
