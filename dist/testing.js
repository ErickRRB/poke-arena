import {CARDS,W,H,TILE} from './engine.js?v=26';
import {SandboxGame} from './sandbox.js?v=1';
import {Renderer} from './render.js?v=32';
import {cardArtMarkup} from './card-art.js?v=26';
import {cardEquivalentLabel} from './card-equivalents.js?v=30';
import {SoundSystem} from './audio.js?v=32';

const $=id=>document.getElementById(id),columns=[],catalog=Object.keys(CARDS).filter(key=>!CARDS[key].token).sort((a,b)=>CARDS[a].name.localeCompare(CARDS[b].name,'es'));
let selected='roselia',team=0,nextColumn=1,speed=1,noticeTimer,ready=false,last=performance.now(),uiClock=0,sfx,activeColumn=null;
let soundEnabled=true;try{soundEnabled=JSON.parse(localStorage.getItem('poke-arena:sound')??'true');}catch{}
$('lab-sound').setAttribute('aria-pressed',String(soundEnabled));$('lab-sound').textContent=soundEnabled?'Sonido: sí':'Sonido: no';
sfx=new SoundSystem(soundEnabled);
function focusColumn(column){activeColumn=column.id;for(const item of columns)item.element.classList.toggle('active-column',item.id===column.id);if(soundEnabled){sfx??=new SoundSystem(true);sfx.unlock(true);}}
function columnEvent(column,event){column.renderer.onEvent(event);if(activeColumn===column.id&&soundEnabled)sfx?.event(event);}
const loaderMarkup='<img class="lab-pokeball" src="favicon.svg" alt="">';
const presetOptions=`<option value="free">Vacía · libre</option><option value="princess">Torre princesa</option><option value="towers">Torres completas</option><option value="fireball-check">Torre + defensa central</option><optgroup label="Rival preparado">${catalog.filter(key=>!CARDS[key].spell).map(key=>`<option value="${key}">${CARDS[key].name} · ${cardEquivalentLabel(key)||'Función propia'}</option>`).join('')}</optgroup>`;
function notice(message){$('lab-notice').textContent=message;$('lab-notice').classList.add('visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('lab-notice').classList.remove('visible'),3500);}
function choose(key){selected=key;$('chosen-name').textContent=CARDS[key].name;$('chosen-equivalent').textContent=cardEquivalentLabel(key)||'Función propia';$('chosen-art').innerHTML=cardArtMarkup(key);for(const column of columns)column.renderer.selection=key;}
function chooseTeam(value){team=value;for(const button of document.querySelectorAll('[data-team]'))button.setAttribute('aria-pressed',String(Number(button.dataset.team)===team));for(const column of columns)column.renderer.placementTeam=team;}
function renderPicker(){
  const query=$('card-search').value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
  const keys=catalog.filter(key=>`${CARDS[key].name} ${cardEquivalentLabel(key)}`.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().includes(query));
  $('picker-list').innerHTML=keys.map(key=>`<button data-pick="${key}" aria-label="Elegir ${CARDS[key].name}"><span class="picker-art">${cardArtMarkup(key)}</span><span class="picker-name"><strong>${CARDS[key].name}</strong><small>${cardEquivalentLabel(key)||'Función propia'}</small></span><span class="picker-cost" aria-label="${CARDS[key].cost} de elixir">${CARDS[key].cost}</span></button>`).join('');
  $('picker-empty').hidden=keys.length>0;
}
function cleanVisuals(renderer){renderer.effects=[];renderer.particles=[];renderer.numbers=[];renderer.healthStates.clear();renderer.resetVisuals();}
function reset(column){
  const preset=column.element.querySelector('select').value,mode=['princess','towers','fireball-check'].includes(preset)?preset:'duel';
  column.game=new SandboxGame({mode,towerFire:$('tower-fire').checked,animations:column.renderer.metadata,seed:column.id,onEvent:event=>columnEvent(column,event)});
  if(preset==='fireball-check'){
    column.game.place(1,'regice',300,232);for(const unit of column.game.units)unit.spawn=0;
  }else if(CARDS[preset]){
    column.game.place(1,preset,158,304);for(const unit of column.game.units)unit.spawn=0;
  }else if(mode!=='duel')column.game.preparedTeams.add(1);
  column.started=false;column.accumulator=0;cleanVisuals(column.renderer);syncColumn(column);syncTabs();
}
function play(column){focusColumn(column);column.game.resume();column.started=true;syncColumn(column);}
function syncTabs(){
  let free=0;
  $('lab-scenarios').innerHTML=columns.map(column=>{const key=column.element.querySelector('select').value,label=key==='free'?`Libre ${++free}`:key==='princess'?'Torre princesa':key==='towers'?'Torres':key==='fireball-check'?'Bola de fuego':CARDS[key].name;return`<button data-go="${column.id}" title="Prueba ${column.id}: ${CARDS[key]?cardEquivalentLabel(key):label}">${label}</button>`;}).join('');
}
function syncColumn(column){
  const {game,element}=column,playing=game.state==='playing';
  element.querySelector('.column-play').textContent=playing?'Pausar':'Iniciar';
  element.querySelector('.column-state').textContent=playing?'En marcha':!column.started&&game.preparedTeams.size===1?'Esperando al otro bando':'En pausa';
  element.querySelector('.column-time').textContent=`${game.elapsed.toFixed(1)} s`;
  element.querySelector('.column-count').textContent=`${game.units.length} unidades`;
  const abilities=game.units.filter(u=>u.hp>0&&u.spawn<=0&&u.card.ability&&!u.abilityUsed),actions=element.querySelector('.column-abilities');
  const signature=abilities.map(u=>u.id).join(',');actions.hidden=!abilities.length;
  if(actions.dataset.signature!==signature){actions.dataset.signature=signature;actions.innerHTML=abilities.map(u=>`<button data-lab-ability="${u.id}" data-ability-team="${u.team}" aria-label="${u.card.ability.name} de ${u.card.name}, bando ${u.team?'rojo':'azul'}">${u.card.ability.name}</button>`).join('');}
  for(const value of[0,1]){
    const measure=game.measurement(value);
    for(const key of['total','dps','hp'])element.querySelector(`[data-metric="${value}-${key}"]`).textContent=Math.round(measure[key]).toLocaleString('es-AR');
  }
}
async function place(column,x,y){
  if(!ready||column.loading)return;
  focusColumn(column);
  const key=selected,value=team,card=CARDS[key],overlay=column.element.querySelector('.column-loading');
  column.loading=true;
  try{
    const ids=[card.id,...(card.squad||[]).map(key=>CARDS[key].id),...['spawnWith','summon','spawnKey','deathSpawn'].map(name=>CARDS[card[name]]?.id)].filter(Boolean);
    const needs=ids.some(id=>!column.renderer.speciesLoads.has(id));if(needs)overlay.hidden=false;
    await column.renderer.ensureSpecies(ids);
    if(!columns.includes(column))return;
    const result=column.game.place(value,key,x,y);
    if(!result.ok){notice(result.reason);return;}
    column.renderer.pointer=null;
    if($('auto-start').checked&&!column.started&&column.game.preparedTeams.size===2)play(column);
    syncColumn(column);
  }catch{notice('No se pudo cargar esa carta. Volvé a intentarlo.');}
  finally{column.loading=false;overlay.hidden=true;}
}
const observer=new IntersectionObserver(entries=>{for(const entry of entries){const column=columns.find(column=>column.canvas===entry.target);if(column)column.visible=entry.isIntersecting;}},{root:$('lab-columns'),rootMargin:'80px'});
function addColumn(preset='free'){
  if(columns.length>=24){notice('Podés comparar hasta 24 columnas a la vez.');return;}
  const id=nextColumn++,element=document.createElement('section');element.className='lab-column';element.setAttribute('aria-label',`Prueba ${id}`);
  element.innerHTML=`<div class="column-heading"><strong>Prueba ${id}</strong><button class="column-close" aria-label="Cerrar prueba ${id}">×</button></div><label class="column-preset"><span class="sr-only">Escenario de la prueba ${id}</span><select>${presetOptions}</select></label><div class="column-arena"><canvas width="600" height="800" tabindex="0" role="application" aria-label="Prueba ${id}. Tocá tu mitad para colocar la carta. Flechas para apuntar, Enter para colocar."></canvas><span class="column-state">En pausa</span><div class="column-abilities" role="group" aria-label="Habilidades de la prueba ${id}" hidden></div><div class="column-loading" role="status" aria-label="Cargando carta" hidden>${loaderMarkup}</div></div><div class="column-actions"><button class="column-play">Iniciar</button><button class="column-step" aria-label="Avanzar 0,1 segundos en la prueba ${id}">+0,1 s</button><button class="column-clear" title="Reiniciar este escenario">Reiniciar</button></div><div class="column-metrics"><span class="metric-team">Bando</span><span>Daño</span><span>DPS · 5 s</span><span>Vida</span>${[0,1].map(team=>`<span class="metric-team ${team?'red':'blue'}">${team?'Rojo':'Azul'}</span>${['total','dps','hp'].map(key=>`<output data-metric="${team}-${key}" aria-label="${key==='total'?'Daño total':key==='dps'?'Daño por segundo':'Vida restante, incluido escudo'} del bando ${team?'rojo':'azul'}">0</output>`).join('')}`).join('')}</div><div class="column-footer"><span class="column-time">0,0 s</span><span class="column-count">0 unidades</span></div>`;
  element.querySelector('select').value=preset;$('lab-columns').append(element);
  const canvas=element.querySelector('canvas'),renderer=new Renderer(canvas),column={id,element,canvas,renderer,visible:true,loading:false,accumulator:0,started:false};
  const source=columns[0]?.renderer;
  if(source){
    for(const key of['metadata','sprites','anchors','bodyHeights','speciesLoads','imageLoads','pendingSpecies'])renderer[key]=source[key];
    renderer.battleArt.images=source.battleArt.images;renderer.buildBackground();
  }
  renderer.selection=selected;renderer.placementTeam=team;renderer.placementWhenPaused=true;renderer.showCombatNumbers=$('damage-numbers').checked;renderer.reduced=$('reduced-motion').checked;
  columns.push(column);reset(column);observer.observe(canvas);
  const point=event=>{const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)/rect.width*W,y:(event.clientY-rect.top)/rect.height*H};};
  canvas.addEventListener('pointermove',event=>{renderer.pointer=point(event);});canvas.addEventListener('pointerleave',()=>{renderer.pointer=null;});
  canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;const p=point(event);renderer.pointer=p;place(column,p.x,p.y);});
  canvas.addEventListener('keydown',event=>{
    if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter',' '].includes(event.key))return;event.preventDefault();
    const p=renderer.pointer||{x:158,y:team?290:510};
    if(event.key==='Enter'){place(column,p.x,p.y);return;}
    if(event.key===' '){column.game.state==='playing'?column.game.pause():play(column);syncColumn(column);return;}
    renderer.pointer={x:Math.min(556,Math.max(44,p.x+(event.key==='ArrowLeft'?-TILE:event.key==='ArrowRight'?TILE:0))),y:Math.min(760,Math.max(40,p.y+(event.key==='ArrowUp'?-TILE:event.key==='ArrowDown'?TILE:0)))};
  });
  element.querySelector('.column-play').addEventListener('click',()=>{column.game.state==='playing'?column.game.pause():play(column);syncColumn(column);});
  element.querySelector('.column-step').addEventListener('click',()=>{focusColumn(column);column.game.resume();for(let i=0;i<6;i++){column.game.step(1/60);renderer.draw(column.game,1/60);}column.game.pause();column.started=true;syncColumn(column);});
  element.querySelector('.column-clear').addEventListener('click',()=>reset(column));element.querySelector('select').addEventListener('change',()=>reset(column));
  element.querySelector('.column-abilities').addEventListener('click',event=>{const button=event.target.closest('[data-lab-ability]');if(!button)return;focusColumn(column);const result=column.game.useAbility(Number(button.dataset.abilityTeam),Number(button.dataset.labAbility));if(!result.ok)notice(result.reason);syncColumn(column);canvas.focus({preventScroll:true});});
  element.querySelector('.column-close').addEventListener('click',()=>{if(columns.length===1){notice('Conservá al menos una columna de prueba.');return;}observer.unobserve(canvas);renderer.resizeObserver.disconnect();columns.splice(columns.indexOf(column),1);element.remove();syncTabs();});
  return column;
}
$('choose-card').addEventListener('click',()=>{renderPicker();$('card-picker').showModal();$('card-search').focus();});$('card-search').addEventListener('input',renderPicker);
$('picker-list').addEventListener('click',event=>{const button=event.target.closest('[data-pick]');if(button){choose(button.dataset.pick);$('card-picker').close();}});
for(const button of document.querySelectorAll('[data-team]'))button.addEventListener('click',()=>chooseTeam(Number(button.dataset.team)));
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>button.closest('dialog').close());
$('lab-help').addEventListener('click',()=>$('lab-guide').showModal());
$('lab-retry').addEventListener('click',()=>location.reload());
$('lab-sound').addEventListener('click',()=>{soundEnabled=!soundEnabled;sfx??=new SoundSystem(soundEnabled);sfx.setEnabled(soundEnabled);if(soundEnabled)sfx.unlock(true);$('lab-sound').setAttribute('aria-pressed',String(soundEnabled));$('lab-sound').textContent=soundEnabled?'Sonido: sí':'Sonido: no';try{localStorage.setItem('poke-arena:sound',JSON.stringify(soundEnabled));}catch{}});
$('lab-scenarios').addEventListener('click',event=>{const button=event.target.closest('[data-go]'),column=columns.find(column=>column.id===Number(button?.dataset.go));column?.element.scrollIntoView({block:'nearest',inline:'start',behavior:$('reduced-motion').checked?'instant':'smooth'});});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sfx?.recover();});
$('lab-speed').addEventListener('change',event=>{speed=Number(event.target.value);});
$('pause-all').addEventListener('click',()=>{for(const column of columns){column.game.pause();syncColumn(column);}});
$('start-all').addEventListener('click',()=>{for(const column of columns)play(column);});
$('add-column').addEventListener('click',()=>{const column=addColumn();column?.element.scrollIntoView({block:'nearest',inline:'end',behavior:$('reduced-motion').checked?'instant':'smooth'});});
$('tower-fire').addEventListener('change',event=>{for(const column of columns)column.game.towerFire=event.target.checked;});
$('damage-numbers').addEventListener('change',event=>{for(const column of columns)column.renderer.showCombatNumbers=event.target.checked;});
$('reduced-motion').checked=matchMedia('(prefers-reduced-motion:reduce)').matches;
$('reduced-motion').addEventListener('change',event=>{document.documentElement.classList.toggle('reduce-motion',event.target.checked);for(const column of columns)column.renderer.reduced=event.target.checked;});
const parameters=new URLSearchParams(location.search),requestedCard=parameters.get('card');if(CARDS[requestedCard]&&!CARDS[requestedCard].token)selected=requestedCard;
choose(selected);for(const preset of['geodude','rhydon','charmander','diglettHorde','princess','sableye','free','free','free','fireball-check'])addColumn(preset);
function frame(now){
  const dt=document.hidden?0:Math.min(.1,(now-last)/1000);last=now;uiClock+=dt;
  if(ready)for(const column of columns){
    const playing=column.game.state==='playing';let advanced=0;
    if(playing){column.accumulator+=dt*speed;while(column.accumulator>=1/60){column.game.step(1/60);column.accumulator-=1/60;advanced+=1/60;}}
    if(column.visible)column.renderer.draw(column.game,advanced);
    else if(advanced){for(const effect of column.renderer.effects)effect.life-=advanced;column.renderer.effects=column.renderer.effects.filter(effect=>effect.life>0);column.renderer.particles=[];column.renderer.numbers=[];}
    if(uiClock>=.15)syncColumn(column);
  }
  if(uiClock>=.15)uiClock=0;requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
try{
  const source=columns[0].renderer;
  await source.load(['roselia','nuzleaf','graveler','rhydon','charizard','grimer','fireball','sneaselAmbush','geodude','charmander','diglettHorde','sableye','regice'],(loaded,total)=>{const progress=Math.floor(loaded/total*100);$('lab-loading').setAttribute('aria-valuenow',String(progress));$('lab-loading').style.setProperty('--lab-load',`${progress}%`);});
  for(const column of columns){column.renderer.metadata=source.metadata;column.game.animations=source.metadata;column.renderer.buildBackground();}
  ready=true;$('lab-loading').hidden=true;
  const scenario=columns.find(column=>column.element.querySelector('select').value===parameters.get('scenario'));scenario?.element.scrollIntoView({block:'nearest',inline:'start'});
}catch{notice('No se pudo cargar la arena. Volvé a intentar.');$('lab-loading').removeAttribute('aria-valuenow');$('lab-loading').setAttribute('role','alert');$('lab-loading').setAttribute('aria-label','No se pudo cargar la arena');$('lab-loading').classList.add('load-failed');$('lab-retry').hidden=false;}
// A stable inspection surface for reproducible visual and combat checks.
globalThis.arenaLab={columns,choose,chooseTeam,addColumn,place,reset,get ready(){return ready;},get sound(){return sfx;}};
