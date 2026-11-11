import { Game, CARDS, DEFAULT_DECK, RARITIES, W, H } from './engine.js?v=7';
import { Renderer } from './render.js?v=7';
import { SoundSystem } from './audio.js?v=7';
import { OnlineClient } from './online.js?v=7';
import { unpackGame, perspective } from './snapshot.js?v=7';
import { cardArtMarkup } from './card-art.js?v=7';

const $ = id => document.getElementById(id);
const canvas = $('arena');
const renderer = new Renderer(canvas);
function fitDesktop(){
  const root=document.documentElement;
  if(innerWidth<=940){root.style.removeProperty('--arena-h');root.style.setProperty('--ui-scale','1');root.style.removeProperty('--battle-gap');return;}
  const scale=Math.max(1,Math.min(2.15,(innerHeight-112)/760)),gap=Math.round(28*scale);
  const width=innerWidth-48-294*scale-gap,height=Math.max(200,Math.min(innerHeight-112,width/.75));
  root.style.setProperty('--arena-h',`${height}px`);root.style.setProperty('--ui-scale',String(scale));root.style.setProperty('--battle-gap',`${gap}px`);
}
fitDesktop();addEventListener('resize',fitDesktop,{passive:true});
function fitViewport(){document.documentElement.style.setProperty('--app-height',`${window.visualViewport?.height || innerHeight}px`);}
fitViewport();addEventListener('resize',fitViewport,{passive:true});
window.visualViewport?.addEventListener('resize',fitViewport,{passive:true});
const store = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem(`poke-arena:${key}`)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(`poke-arena:${key}`, JSON.stringify(value)); } catch { /* Storage can be disabled in private browsing. */ } },
};
const storedDeck = store.get('deck', DEFAULT_DECK);
let deck = Array.isArray(storedDeck) && storedDeck.length <= 8 && new Set(storedDeck).size === storedDeck.length && storedDeck.every(k => CARDS[k]&&!CARDS[k].token) ? storedDeck : [...DEFAULT_DECK];
if(deck.join(',')==='pikachu,snorlax,squirtle,charmander,zubat,thunder,charizard,fireball')deck=[...DEFAULT_DECK];
const storedDifficulty = store.get('difficulty', 'normal');
let difficulty = ['easy', 'normal', 'hard'].includes(storedDifficulty) ? storedDifficulty : 'normal';
let sound = store.get('sound', true) === true;
let reduced = store.get('reduced', matchMedia('(prefers-reduced-motion: reduce)').matches) === true;
let game, selected = -1, handSignature = '', ready = false, walkthrough = null, deckDraft = [], deckEditable = true;
let toastTimer, lastUi = 0, drag = null, ignoreClickUntil = 0, online=null, onlineMode=false, closingOnline=Promise.resolve();
const sfx=new SoundSystem(sound);
let inspectedCard=null;

function audioInit() {
  sfx.setEnabled(sound);sfx.unlock();
}
function tone(freq = 440, duration = .08, wave = 'sine', volume = .035, slide = 0) {
  sfx.tone(freq,duration,wave,volume,slide);
}
function updateSound() {
  $('sound-btn').setAttribute('aria-pressed', String(sound));
  $('sound-btn').setAttribute('aria-label', sound ? 'Silenciar sonido' : 'Activar sonido');
  $('sound-btn').title = sound ? 'Silenciar sonido' : 'Activar sonido';
  $('sound-btn').querySelector('use').setAttribute('href', sound ? '#i-sound' : '#i-mute');
  $('sound-setting').checked = sound;
  store.set('sound', sound);
}
function setReduced(value) { reduced = value; renderer.reduced = reduced; document.body.classList.toggle('reduced-motion', reduced); $('motion-setting').checked = reduced; store.set('reduced', reduced); }
function toast(message) {
  if(game?.state==='playing'){live(message);$('online-status').hidden=false;$('online-status').textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('online-status').hidden=true;},2400);return;}
  $('toast').textContent = message; $('toast').classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2400);
}
function live(message) { $('live-status').textContent = message; }

function cardMarkup(key, index, collection = false) {
  const c = CARDS[key];
  return `<button class="pokemon-card type-${c.type}" data-rarity="${c.rarity}" data-${collection ? 'collection' : 'card'}="${collection ? key : index}" aria-label="${c.name}, ${RARITIES[c.rarity]}, ${c.cost} de elixir, ${c.role}" aria-pressed="false"><span class="card-cost">${c.cost}</span>${!collection ? `<span class="card-key">${index + 1}</span>` : ''}${cardArtMarkup(key)}<span class="card-name">${c.name}</span><span class="card-role">${c.role}</span></button>`;
}
function renderMenuDeck(){
  $('menu-deck-preview').innerHTML=Array.from({length:8},(_,i)=>{const key=deck[i],c=CARDS[key];return c?`<button class="menu-card pokemon-card type-${c.type}" data-rarity="${c.rarity}" data-menu-card="${key}" aria-label="${c.name}, ${c.cost} de elixir, ver detalles"><span class="card-cost">${c.cost}</span>${cardArtMarkup(key)}<span class="card-name">${c.name}</span></button>`:`<button class="menu-card pokemon-card empty" data-menu-empty aria-label="Elegir carta para el espacio ${i+1}">+</button>`;}).join('');
  $('menu-deck-average').textContent=deck.length?(deck.reduce((sum,key)=>sum+CARDS[key].cost,0)/deck.length).toFixed(1).replace('.',','):'—';
  $('menu-deck-status').hidden=deck.length===8;
  $('menu-deck-status').textContent=`Elegí ${8-deck.length} ${deck.length===7?'carta más':'cartas más'} para jugar.`;
  $('start-btn').disabled=$('online-btn').disabled=!ready||deck.length!==8;
}
function applyDeckChanges(){
  deck=[...deckDraft];store.set('deck',deck);renderMenuDeck();
  $('deck-edit-hint').textContent=deck.length===8?'':`${deck.length}/8 · Elegí ${8-deck.length} más`;
}
function syncHand() {
  const signature = game.hands[0].join(',');
  if (signature !== handSignature) {
    handSignature = signature;
    $('hand').innerHTML = game.hands[0].map((key,i) => cardMarkup(key,i)).join('');
    const key = game.queues[0][0], c = CARDS[key];
    $('next-preview').innerHTML = cardArtMarkup(key);
    $('next-name').textContent = c.name;
  }
  for (const el of $('hand').querySelectorAll('[data-card]')) {
    const i = Number(el.dataset.card), c = CARDS[game.hands[0][i]];
    el.classList.toggle('selected', selected === i);
    el.classList.toggle('unaffordable', game.energy[0] + .001 < c.cost);
    el.classList.toggle('guide-target', !!walkthrough && walkthrough.step === 1 && i === 0);
    el.disabled=game.tiebreaker||(onlineMode&&game.state==='ready');
    el.setAttribute('aria-pressed', String(selected === i));
  }
}
function updateDetail() {
  renderer.selection=game.hands[0][selected]||null;
}
function choose(index) {
  if (!ready || index < 0 || index > 3 || game.state === 'ended' || game.state === 'paused') return;
  if (selected !== index) audioInit();
  selected = index;
  renderer.pointer = null;
  if (walkthrough?.step === 1) setGuideStep(2);
  updateDetail(); syncHand();
  const c = CARDS[game.hands[0][selected]];
  live(`${c.name}. ${c.cost} de energía. ${c.spell ? 'Apuntá en cualquier lado.' : 'Apuntá en tu lado de la arena.'}`);
}
function cancelSelection() { selected = -1; renderer.pointer = null; renderer.selection = null; updateDetail(); syncHand(); }
function updateUi() {
  sfx.setBattleState(game.state==='playing'&&!document.hidden&&!document.body.classList.contains('menu-mode')&&!document.querySelector('dialog[open]'),game.overtime||game.time<=60);
  const energy = game.energy[0];
  $('energy-value').textContent = String(Math.floor(energy));
  $('energy-bar').setAttribute('aria-valuenow', energy.toFixed(1));
  [...$('energy-bar').children].forEach((el,i) => el.firstElementChild.style.width = `${Math.max(0,Math.min(1,energy-i))*100}%`);
  $('boost').hidden = game.multiplier === 1; $('boost').textContent = `×${game.multiplier}`;
  const total = Math.ceil(game.time); $('timer').textContent = `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`;
  $('battle-clock').classList.toggle('urgent', game.time <= 30 || game.overtime);
  $('phase-label').hidden=!game.overtime;$('phase-label').textContent=game.tiebreaker?'Desempate':'Extra';
  $('pause-btn').disabled = onlineMode||!['playing','paused'].includes(game.state);
  $('match-pause').hidden=onlineMode;
  const abilities=game.units.filter(u=>u.team===0&&u.card.ability&&!u.abilityUsed&&u.hp>0&&u.spawn<=0);
  $('abilities').hidden=!abilities.length;
  const signature=abilities.map(u=>`${u.id}:${game.energy[0]>=u.card.ability.cost}`).join(',');
  if($('abilities').dataset.signature!==signature){$('abilities').dataset.signature=signature;$('abilities').innerHTML=abilities.map(u=>`<button class="ability-btn" data-ability="${u.id}" ${game.energy[0]<u.card.ability.cost?'disabled':''} aria-label="${u.card.name}: ${u.card.ability.name}, ${u.card.ability.cost} de elixir"><img src="assets/pokemon/${u.card.id}/art.png" alt=""><span>${u.card.ability.name}</span><b class="card-cost">${u.card.ability.cost}</b></button>`).join('');}
  syncHand();
}
function handleEvent(e) {
  renderer.onEvent(e); sfx.event(e);
  if (e.type === 'deploy' && e.team === 0) {
    if (walkthrough?.step === 2) {
      setGuideStep(3); walkthrough.start = game.elapsed;
      game.spawn('squirtle',1,e.x < 300 ? 158 : 442,295,.75);
    }
  }
  if (e.type === 'towerDown') {
    live(e.team === 0 ? 'Destruiste una torre. Ahora podés desplegar más adelante en ese carril.' : 'El rival destruyó una de tus torres.');
    if (!reduced) { $('arena-frame').classList.remove('shake'); void $('arena-frame').offsetWidth; $('arena-frame').classList.add('shake'); }
  }
  if (e.type === 'energyBoost') live(`Elixir por ${e.multiplier}.`);
  if (e.type === 'overtime') live('Tiempo extra. La primera torre destruida decide la partida.');
  if (e.type === 'end') showResult(e);
}
function newGame({ start = false, tutorial = false } = {}) {
  sfx.resetMusic();
  $('result-overlay').hidden = true; $('pause-overlay').hidden = true; $('guide').hidden = true;
  walkthrough = null; selected = -1; handSignature = ''; renderer.pointer = null; renderer.selection = null; renderer.tutorialSpot = false;
  renderer.particles = []; renderer.rings = [];renderer.effects=[];renderer.numbers=[];
  renderer.deploymentPreview=null;
  game = new Game({ deck: tutorial||deck.length!==8 ? DEFAULT_DECK : deck, difficulty, tutorial, onEvent: handleEvent, animations:renderer.metadata });
  if(!tutorial){const pool=Object.keys(CARDS).filter(k=>!CARDS[k].token&&!CARDS[k].spell&&CARDS[k].cost<=6&&k!=='snorlax').sort(()=>Math.random()-.5),bot=['snorlax','log',...pool.slice(0,6)];game.hands[1]=bot.slice(0,4);game.queues[1]=bot.slice(4);}
  $('enemy-name').textContent = `${{easy:'Principiante',normal:'Entrenador',hard:'Líder de gimnasio'}[difficulty]} · CPU`;
  document.body.classList.toggle('menu-mode',!start);$('main-menu').hidden=start;
  renderMenuDeck();
  renderer.ensureSpecies(deck.map(k=>CARDS[k]?.id).filter(Boolean)).catch(()=>{});
  if (start) {
    audioInit(); game.start();
    if (tutorial) { game.energy = [10,6]; walkthrough = { step: 1, start: 0 }; setGuideStep(1); }
    live(tutorial ? 'Práctica guiada. Elegí un Pokémon de tu mano.' : 'Empieza la batalla. Elegí una carta y tocá tu lado de la arena.');
    canvas.focus({preventScroll:true});
  }
  updateDetail(); updateUi();
}
function setGuideStep(step) {
  if (!walkthrough) return;
  walkthrough.step = step; $('guide').hidden = false;
  $('guide-step').textContent = `${step} / 3`;
  $('guide-text').textContent = {1:'Elegí un Pokémon de tu mano.',2:'Tocá tu mitad de la arena para desplegarlo.',3:'Avanza y ataca solo. Sumá otro Pokémon para apoyarlo.'}[step];
  renderer.tutorialSpot = step === 2;
  $('skip-guide').textContent = step === 3 ? 'Listo' : 'Omitir'; syncHand();
}
function finishGuide() { walkthrough = null; game.aiEnabled = true; game.aiClock = 4; $('guide').hidden = true; renderer.tutorialSpot = false; syncHand(); }
function showResult(e) {
  if (walkthrough) finishGuide();
  selected = -1; renderer.selection = null;
  $('pause-overlay').hidden = true; $('result-overlay').hidden = false;
  $('result-title').textContent = e.winner === 0 ? 'Victoria' : e.winner === 1 ? 'Derrota' : 'Empate';
  $('result-overlay').querySelector('.result-crown').style.color = e.winner === 0 ? 'var(--gold)' : e.winner === 1 ? '#dc8b79' : '#abbca3';
  $('result-player').textContent = game.crowns(0); $('result-enemy').textContent = game.crowns(1);
  $('result-reason').textContent = e.reason;
  $('result-deployed').textContent = game.stats[0].deployed;
  $('result-damage').textContent = Math.round(game.stats[0].damage).toLocaleString('es-AR');
  if (e.winner === 0) { tone(660,.2,'triangle',.05); setTimeout(()=>tone(880,.35,'triangle',.05),150); }
  updateUi();
  live(`${$('result-title').textContent}. ${e.reason}. ${game.crowns(0)} a ${game.crowns(1)}.`);
  $('again-btn').focus({preventScroll:true});
}
function arenaPoint(clientX,clientY) {
  const r=canvas.getBoundingClientRect();
  return {x:(clientX-r.left)/r.width*W,y:(clientY-r.top)/r.height*H,inside:clientX>=r.left&&clientX<=r.right&&clientY>=r.top&&clientY<=r.bottom};
}
async function attemptDeploy(point) {
  if(game.state!=='playing')return;
  if(selected<0)return;
  const index=selected,key=game.hands[0][index];
  const result=onlineMode?await online.send({kind:'deploy',handIndex:index,key,x:online.team?W-point.x:point.x,y:online.team?H-point.y:point.y}):game.deploy(0,index,point.x,point.y);
  if(!result.ok){toast(result.reason);tone(150,.12,'triangle',.02);return;}
  renderer.deploymentPreview={key:result.key,x:result.x,y:result.y,until:renderer.t+1.5};
  live(`${CARDS[result.key].name} desplegado. ${Math.floor(game.energy[0])} de energía.`);
  cancelSelection();updateUi();
}
function togglePause() {
  if(onlineMode)return;
  if(document.querySelector('dialog[open]'))return;
  if(game.state==='playing'){game.pause();$('pause-overlay').hidden=false;$('resume-btn').focus({preventScroll:true});live('Partida en pausa.');}
  else if(game.state==='paused'){game.resume();$('pause-overlay').hidden=true;canvas.focus({preventScroll:true});live('Partida reanudada.');}
}
function openModal(id) {
  const dialog=$(id);dialog.dataset.resume=game.state==='playing'?'1':'0';
  if(game.state==='playing'&&!onlineMode)game.pause();
  dialog.showModal();
}
function closeModal(dialog,resume=true){if(!resume)dialog.dataset.resume='0';dialog.close();}
document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.addEventListener('close',()=>{if(dialog.dataset.resume==='1'&&game.state==='paused'){game.resume();$('pause-overlay').hidden=true;}});
  dialog.addEventListener('click',event=>{if(event.target.closest('[data-close]'))closeModal(dialog);else if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeModal(dialog);}});
});

function renderCollection() {
  renderDeckStrip();
  const term=($('collection-search')?.value||'').toLowerCase(),rarity=$('rarity-filter')?.value||'',order=$('collection-sort').value;
  const keys=Object.keys(CARDS).filter(k=>!CARDS[k].token&&(!rarity||CARDS[k].rarity===rarity)&&CARDS[k].name.toLowerCase().includes(term));
  const byName=(a,b)=>CARDS[a].name.localeCompare(CARDS[b].name,'es');
  if(order==='elixir-asc')keys.sort((a,b)=>CARDS[a].cost-CARDS[b].cost||byName(a,b));
  else if(order==='elixir-desc')keys.sort((a,b)=>CARDS[b].cost-CARDS[a].cost||byName(a,b));
  else if(order==='name')keys.sort(byName);
  $('collection').innerHTML=keys.map(k=>`<div class="collection-entry">${cardMarkup(k,0,true)}<button class="deck-toggle" data-toggle="${k}" ${!deckEditable?'disabled':''}>${deckDraft.includes(k)?'✓ En mazo':'+ Agregar'}</button></div>`).join('');
  for(const el of $('collection').querySelectorAll('[data-collection]')){const c=CARDS[el.dataset.collection],included=deckDraft.includes(el.dataset.collection);el.classList.toggle('selected',included);el.removeAttribute('aria-pressed');el.setAttribute('aria-haspopup','dialog');el.setAttribute('aria-label',`${c.name}, ${c.cost} de elixir, ${c.role}, ver detalles`);}
  $('deck-count').textContent=`${deckDraft.length}/8`;
  $('deck-average').textContent=deckDraft.length?(deckDraft.reduce((a,k)=>a+CARDS[k].cost,0)/deckDraft.length).toFixed(1).replace('.',','):'—';
  $('save-deck-btn').disabled=false;
  $('reset-deck-btn').disabled=!deckEditable;
}
function renderDeckStrip(){
  $('deck-strip').innerHTML=Array.from({length:8},(_,i)=>{
    const key=deckDraft[i],c=CARDS[key];
    if(!c)return`<span class="deck-slot empty" aria-label="Espacio ${i+1} vacío">+</span>`;
    return`<button class="deck-slot" data-rarity="${c.rarity}" data-deck-info="${key}" aria-label="${c.name}, ${c.cost} de elixir, ver detalles" title="${c.name}">${cardArtMarkup(key)}<span class="slot-cost">${c.cost}</span></button>`;
  }).join('');
}
$('deck-strip').addEventListener('click',e=>{const el=e.target.closest('[data-deck-info]');if(el){renderCardInfo(el.dataset.deckInfo);openModal('card-dialog');}});
$('menu-deck-preview').addEventListener('click',e=>{if(e.target.closest('[data-menu-empty]')){openDeck();return;}const el=e.target.closest('[data-menu-card]');if(el){deckEditable=true;deckDraft=[...deck];renderCardInfo(el.dataset.menuCard);openModal('card-dialog');}});
function openDeck() {
  deckEditable=!['playing','paused'].includes(game.state);deckDraft=[...deck];
  $('deck-edit-hint').textContent=!deckEditable?'En batalla':deck.length===8?'':`${deck.length}/8 · Elegí ${8-deck.length} más`;
  renderCollection();openModal('deck-dialog');
}
function toggleDeckCard(key){
  if(!deckEditable)return;
  if(deckDraft.includes(key))deckDraft=deckDraft.filter(k=>k!==key);
  else if(deckDraft.length<8)deckDraft.push(key);
  else { $('deck-edit-hint').textContent='Mazo completo';return; }
  applyDeckChanges();renderCollection();
}
function renderCardInfo(key){
  const c=CARDS[key];inspectedCard=key;
  audioInit();
  $('card-info-name').textContent=c.name;$('card-info-type').textContent=`${c.label} · ${RARITIES[c.rarity]}`;$('card-info-role').textContent=c.role;$('card-info-cost').textContent=c.cost;
  $('card-info-art').innerHTML=cardArtMarkup(key);$('card-dialog').dataset.rarity=c.rarity;
  $('card-info-art').style.setProperty('--card-tint',c.color);
  $('card-info-move').textContent=c.move||c.name;$('card-info-description').textContent=c.description;
  const stats=[];
  if(c.hp)stats.push(['Vida',c.hp]);stats.push(['Daño',c.burst?`${c.damage} × ${c.burst}`:c.damage]);
  if(c.range)stats.push(['Alcance',c.range<50?'Melee':`${(c.range/30).toFixed(1).replace('.',',')} casillas`]);
  if(c.interval)stats.push(['Cadencia',`${String(c.interval).replace('.',',')} s`]);
  if(c.speed!==undefined)stats.push(['Velocidad',c.structure?'Inmóvil':c.speed<=33?'Lenta':c.speed<=52?'Media':'Rápida']);
  stats.push(['Objetivos',c.building?'Estructuras':c.spell||c.air?'Tierra y aire':'Tierra']);
  if(c.lifetime)stats.push(['Duración',`${c.lifetime} s`]);if(c.count)stats.push(['Unidades',c.count]);
  if(c.burn)stats.push(['Quemadura',`${c.burn} / s`]);if(c.lifesteal)stats.push(['Curación',`${c.lifesteal} / golpe`]);
  if(c.towerDamage)stats.push(['Daño a torres',c.towerDamage]);
  if(c.shield)stats.push(['Escudo',c.shield]);if(c.summon)stats.push(['Invocación',`${CARDS[c.summon].name} · ${c.summonEvery} s`]);
  if(c.ability)stats.push(['Habilidad',`${c.ability.cost} elixir · 1 uso`]);
  if(c.ability?.damage)stats.push(['Daño de habilidad',c.ability.damage]);if(c.ability?.stun)stats.push(['Aturdimiento',`${c.ability.stun} s`]);
  if(c.heal)stats.push(['Curación',`${c.heal} / ${c.healEvery} s`]);if(c.reflect)stats.push(['Reflejo',`${Math.round(c.reflect*100)} %`]);if(c.armor)stats.push(['Reducción de daño',`${Math.round(c.armor*100)} %`]);
  if(c.spell)stats.push([c.rolling?'Recorrido':'Radio',`${((c.rolling?348:c.splash)/30).toFixed(1).replace('.',',')} casillas`]);
  const mainStats=stats.filter(([label])=>['Vida','Daño','Objetivos',c.count?'Unidades':'Alcance'].includes(label)),extraStats=stats.filter(stat=>!mainStats.includes(stat));
  const statMarkup=items=>items.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
  $('card-info-stats').innerHTML=statMarkup(mainStats);
  $('card-extra-stats').innerHTML=statMarkup(extraStats);
  $('card-more-stats').hidden=!extraStats.length;
  if($('card-dialog').open===false)$('card-more-stats').open=false;
  const included=deckDraft.includes(key);$('card-info-toggle').textContent=included?'Quitar del mazo':deckDraft.length===8?'Mazo completo':'Agregar al mazo';
  $('card-info-toggle').disabled=!deckEditable||(!included&&deckDraft.length===8);
}
$('collection').addEventListener('click',e=>{
  const toggle=e.target.closest('[data-toggle]');if(toggle){toggleDeckCard(toggle.dataset.toggle);return;}
  const el=e.target.closest('[data-collection]');if(el){renderCardInfo(el.dataset.collection);openModal('card-dialog');}
});
$('card-info-toggle').addEventListener('click',()=>{if(inspectedCard){toggleDeckCard(inspectedCard);if(!$('deck-dialog').open){closeModal($('card-dialog'),false);openModal('deck-dialog');}else renderCardInfo(inspectedCard);}});
$('save-deck-btn').addEventListener('click',()=>closeModal($('deck-dialog')));
$('reset-deck-btn').addEventListener('click',()=>{deckDraft=[...DEFAULT_DECK];applyDeckChanges();renderCollection();});

$('hand').addEventListener('click',e=>{const el=e.target.closest('[data-card]');if(el&&performance.now()>ignoreClickUntil)choose(Number(el.dataset.card));});
$('hand').addEventListener('pointerdown',e=>{const el=e.target.closest('[data-card]');if(!el||e.button!==0)return;drag={index:Number(el.dataset.card),x:e.clientX,y:e.clientY,active:false};});
document.addEventListener('pointermove',e=>{
  if(!drag)return;
  if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>7){drag.active=true;choose(drag.index);}
  if(drag.active){const p=arenaPoint(e.clientX,e.clientY);renderer.pointer=p.inside?p:null;e.preventDefault();}
},{passive:false});
document.addEventListener('pointerup',e=>{
  if(!drag)return;
  if(drag.active){ignoreClickUntil=performance.now()+350;const p=arenaPoint(e.clientX,e.clientY),key=game.hands[0][drag.index];if(p.inside&&game.resolveDeployment(0,key,p.x,p.y))attemptDeploy(p);else cancelSelection();renderer.pointer=null;}
  drag=null;
});
document.addEventListener('pointercancel',()=>{if(drag?.active)cancelSelection();drag=null;renderer.pointer=null;});
canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'&&!drag&&selected>=0)renderer.pointer=arenaPoint(e.clientX,e.clientY);});
canvas.addEventListener('pointerleave',()=>{if(!drag)renderer.pointer=null;});
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||drag?.active)return;audioInit();canvas.focus({preventScroll:true});attemptDeploy(arenaPoint(e.clientX,e.clientY));});
document.addEventListener('keydown',e=>{
  if(document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  if(e.key>='1'&&e.key<='4'){e.preventDefault();choose(Number(e.key)-1);return;}
  if(e.key==='Escape'){if(game.state==='paused')togglePause();else cancelSelection();return;}
  if(e.code==='Space'&&!e.repeat){if(e.target.tagName==='BUTTON')return;e.preventDefault();togglePause();return;}
  if(selected>=0&&game.state==='playing'){
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
      e.preventDefault();renderer.pointer||={x:158,y:520};
      if(e.key==='ArrowUp')renderer.pointer.y-=20;if(e.key==='ArrowDown')renderer.pointer.y+=20;if(e.key==='ArrowLeft')renderer.pointer.x-=20;if(e.key==='ArrowRight')renderer.pointer.x+=20;
      renderer.pointer.x=Math.max(45,Math.min(555,renderer.pointer.x));renderer.pointer.y=Math.max(45,Math.min(755,renderer.pointer.y));
      live(`Posición ${Math.round(renderer.pointer.x)}, ${Math.round(renderer.pointer.y)}.`);
    }else if(e.key==='Enter'&&renderer.pointer){e.preventDefault();attemptDeploy(renderer.pointer);}
  }
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)sfx.setBattleState(false);if(document.hidden&&game.state==='playing'&&!onlineMode){game.pause();$('pause-overlay').hidden=false;}});

$('start-btn').addEventListener('click',()=>{online?.close();onlineMode=false;newGame({start:true});});
$('practice-btn').addEventListener('click',()=>{online?.close();onlineMode=false;newGame({start:true,tutorial:true});});
$('skip-guide').addEventListener('click',finishGuide);
$('again-btn').addEventListener('click',()=>{if(onlineMode)beginOnline();else newGame({start:true});});
$('result-deck-btn').addEventListener('click',openDeck);
$('deck-btn').addEventListener('click',openDeck);
$('menu-deck-btn').addEventListener('click',openDeck);
function mainMenu(){closingOnline=online?.close()||Promise.resolve();online=null;onlineMode=false;$('search-panel').hidden=true;$('ready-overlay').classList.remove('searching');for(const dialog of document.querySelectorAll('dialog[open]'))closeModal(dialog,false);newGame();canvas.blur();}
$('menu-btn').addEventListener('click',mainMenu);
$('pause-menu-btn').addEventListener('click',mainMenu);
$('pause-btn').addEventListener('click',togglePause);
$('match-pause').addEventListener('click',togglePause);
$('resume-btn').addEventListener('click',togglePause);
$('help-btn').addEventListener('click',()=>openModal('help-dialog'));
$('settings-btn').addEventListener('click',()=>openModal('settings-dialog'));
$('credits-btn').addEventListener('click',()=>openModal('credits-dialog'));
$('settings-credits-btn').addEventListener('click',()=>openModal('credits-dialog'));
$('help-practice-btn').addEventListener('click',()=>{closeModal($('help-dialog'),false);newGame({start:true,tutorial:true});});
$('sound-btn').addEventListener('click',()=>{sound=!sound;updateSound();audioInit();if(sound)tone(580,.13,'sine',.05);});
$('sound-setting').addEventListener('change',e=>{sound=e.target.checked;updateSound();audioInit();});
$('motion-setting').addEventListener('change',e=>setReduced(e.target.checked));
$('difficulty').value=difficulty;
$('difficulty').addEventListener('change',e=>{difficulty=e.target.value;store.set('difficulty',difficulty);});
$('restart-btn').addEventListener('click',()=>{if(game.state==='ready'||game.state==='ended')newGame();else openModal('restart-dialog');});
$('confirm-restart-btn').addEventListener('click',()=>{closeModal($('restart-dialog'),false);newGame({start:true});});

for(let i=0;i<10;i++){const el=document.createElement('div');el.className='energy-segment';el.innerHTML='<div class="energy-fill"></div>';$('energy-bar').append(el);}
$('trainer-name').value=store.get('name','');$('trainer-name').addEventListener('change',()=>store.set('name',$('trainer-name').value));
const filters=document.createElement('div');filters.className='collection-tools';filters.innerHTML='<input id="collection-search" type="search" placeholder="Buscar carta" aria-label="Buscar carta"><select id="rarity-filter" aria-label="Filtrar rareza"><option value="">Todas las rarezas</option>'+Object.entries(RARITIES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')+'</select><select id="collection-sort" aria-label="Ordenar cartas"><option value="elixir-asc">Menor elixir</option><option value="elixir-desc">Mayor elixir</option><option value="name">Nombre A–Z</option><option value="original">Orden original</option></select>';$('collection').before(filters);$('collection-search').addEventListener('input',renderCollection);$('rarity-filter').addEventListener('change',renderCollection);$('collection-sort').value=store.get('collection-order','elixir-asc');if(!$('collection-sort').value)$('collection-sort').value='elixir-asc';$('collection-sort').addEventListener('change',()=>{store.set('collection-order',$('collection-sort').value);renderCollection();});
$('online-btn').addEventListener('click',beginOnline);$('cancel-search').addEventListener('click',mainMenu);
$('abilities').addEventListener('click',async e=>{const button=e.target.closest('[data-ability]');if(!button)return;const id=Number(button.dataset.ability);button.disabled=true;const result=onlineMode?await online.send({kind:'ability',unitId:id}):game.activateAbility(0,id);if(!result.ok)live(result.reason);updateUi();});
async function beginOnline(){
  if(deck.length!==8)return;
  await closingOnline;await online?.close();onlineMode=false;newGame();audioInit();$('search-panel').hidden=false;$('ready-overlay').classList.add('searching');$('search-status').textContent='Buscando rival…';$('search-time').textContent='0:00';
  online=new OnlineClient({onSearch:ms=>{const sec=Math.floor(ms/1000);$('search-time').textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;},onConnection:status=>{$('online-status').hidden=!status;$('online-status').textContent=status;if(!onlineMode)$('search-status').textContent=status||'Buscando rival…';},onSnapshot:packet=>{
    online.team=packet.team;onlineMode=true;document.body.classList.remove('menu-mode');$('main-menu').hidden=true;$('enemy-name').textContent=packet.opponent;
    const old=new Map(game.units.map(u=>[u.id,u]));game=unpackGame(perspective(packet.game,packet.team),handleEvent,renderer.metadata);
    for(const u of game.units){const previous=old.get(u.id);u.drawX=previous?.drawX??previous?.x??u.x;u.drawY=previous?.drawY??previous?.y??u.y;}
    for(const entry of packet.events)handleEvent(perspective(entry.event,packet.team));
    if(game.state==='ended'&&$('result-overlay').hidden)showResult({winner:game.winner,reason:game.reason});
    $('online-status').hidden=packet.startsIn<=0;$('online-status').textContent=packet.startsIn>0?'Preparados':'';updateUi();
  }});
  try{await online.start($('trainer-name').value||'Entrenador',deck);}catch(error){$('search-status').textContent=error.message;}
}
updateSound();setReduced(reduced);newGame();
let previous=performance.now(),accumulator=0;
function frame(now){
  const dt=Math.min((now-previous)/1000,.08);previous=now;
  if(onlineMode){
    for(const u of game.units){u.drawX+=(u.x-u.drawX)*Math.min(1,dt*15);u.drawY+=(u.y-u.drawY)*Math.min(1,dt*15);u.anim+=dt;u.attack=Math.max(0,u.attack-dt);u.hit=Math.max(0,u.hit-dt);}
    if(game.state==='playing'&&!game.tiebreaker){game.time=Math.max(0,game.time-dt);game.energy[0]=Math.min(10,game.energy[0]+dt*game.multiplier/2.8);}
  }else if(game.state==='playing'&&!(walkthrough&&walkthrough.step<3)){
    accumulator+=dt;
    while(accumulator>=1/30){game.step(1/30);accumulator-=1/30;}
    if(walkthrough?.step===3&&game.elapsed-walkthrough.start>8)finishGuide();
  }else accumulator=0;
  if(!document.body.classList.contains('menu-mode'))renderer.draw(game,game.state==='paused'?0:dt);
  if(now-lastUi>80){lastUi=now;updateUi();}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
try{
  await renderer.load(deck.length===8?deck:DEFAULT_DECK);ready=true;$('loading').hidden=true;$('menu-loading').hidden=true;$('practice-btn').disabled=false;renderMenuDeck();
}catch(error){
  console.error(error);$('menu-loading').innerHTML='<p>No se pudieron cargar los sprites.</p><button class="secondary-btn" id="retry-load">Volver a intentar</button>';
  $('retry-load').addEventListener('click',()=>location.reload());
}
