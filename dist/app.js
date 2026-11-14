import { Game, CARDS, DEFAULT_DECK, RARITIES, W, H, TILE } from './engine.js?v=26';
import { Renderer } from './render.js?v=32';
import { SoundSystem } from './audio.js?v=32';
import { OnlineClient, hasSavedOnlineSession } from './online.js?v=26';
import { unpackGame, perspective } from './snapshot.js?v=26';
import { cardArtMarkup } from './card-art.js?v=26';
import { cardEquivalentLabel } from './card-equivalents.js?v=30';
import { loadDeckLibrary, saveDeckLibrary, saveDeck } from './deck-storage.js?v=26';
import { bindQuickStats } from './quick-stats.js';

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
let deckLibrary=loadDeckLibrary(),deck=[...deckLibrary.slots[deckLibrary.active]];
const storedDifficulty = store.get('difficulty', 'normal');
let difficulty = ['easy', 'normal', 'hard'].includes(storedDifficulty) ? storedDifficulty : 'normal';
let sound = store.get('sound', true) === true;
let reduced = store.get('reduced', matchMedia('(prefers-reduced-motion: reduce)').matches) === true;
let combatNumbers = store.get('combat-numbers', false) === true;
let game, selected = -1, handSignature = '', ready = false, walkthrough = null, deckDraft = [], deckEditable = true;
let toastTimer, lastUi = 0, drag = null, ignoreClickUntil = 0, online=null, onlineMode=false, closingOnline=Promise.resolve(), deploying=false,deploymentSerial=0;
const quickStats=bindQuickStats({hand:$('hand'),cards:CARDS,getCard:el=>CARDS[game?.hands[0][Number(el.dataset.card)]],isPlaying:()=>game?.state==='playing'&&!document.body.classList.contains('menu-mode'),getSelection:()=>selected});
const sfx=new SoundSystem(sound);
let inspectedCard=null;
let cardActionKey=null,cardActionReference=null,replacementKey=null;

function audioInit() {
  sfx.setEnabled(sound);sfx.unlock(true);
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
function setCombatNumbers(value){combatNumbers=value===true;renderer.setCombatNumbers(combatNumbers);$('damage-numbers-setting').checked=combatNumbers;store.set('combat-numbers',combatNumbers);}
function toast(message) {
  if(game?.state==='playing'){live(message);$('online-status').hidden=false;$('online-status').textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('online-status').hidden=true;},2400);return;}
  $('toast').textContent = message; $('toast').classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2400);
}
function live(message) { $('live-status').textContent = message; }

function cardMarkup(key, index, source = 'card') {
  const c = CARDS[key],equivalent=cardEquivalentLabel(key);
  const collection=source!=='card',name=`<span class="card-name">${c.name}</span>`;
  const heading=collection?`<span class="card-heading">${name}${c.count>1?`<span class="card-quantity" aria-hidden="true"><svg><use href="#i-units"/></svg>×${c.count}</span>`:''}</span>`:name;
  return `<button class="${source==='deck-info'?'deck-slot ':''}pokemon-card type-${c.type}" data-rarity="${c.rarity}" data-${source}="${collection ? key : index}" aria-label="${c.name}, ${RARITIES[c.rarity]}, ${c.cost} de elixir${equivalent?`, ${equivalent}`:''}${c.count>1?`, ${c.count} unidades`:''}" ${collection?'aria-haspopup="dialog" aria-expanded="false"':'aria-pressed="false"'}><span class="card-cost"><span class="cost-value">${c.cost}</span></span>${!collection ? `<span class="card-key">${index + 1}</span>` : ''}${cardArtMarkup(key)}${heading}${source==='deck-info'||!equivalent?'':`<span class="card-role">${equivalent}</span>`}</button>`;
}
function renderMenuDeck(){
  renderDeckSlots();
  $('menu-deck-preview').innerHTML=Array.from({length:8},(_,i)=>{const key=deck[i],c=CARDS[key];return c?`<button class="menu-card pokemon-card type-${c.type}" data-rarity="${c.rarity}" data-menu-card="${key}" aria-label="${c.name}, ${c.cost} de elixir, ver detalles"><span class="card-cost"><span class="cost-value">${c.cost}</span></span>${cardArtMarkup(key)}<span class="card-name">${c.name}</span></button>`:`<button class="menu-card pokemon-card empty" data-menu-empty aria-label="Elegir carta para el espacio ${i+1}">+</button>`;}).join('');
  updateMenuAvailability();
}
function updateMenuAvailability(){ $('start-btn').disabled=$('online-btn').disabled=!ready||deck.length!==8; }
function applyDeckChanges(){
  deck=[...deckDraft];deckLibrary.slots[deckLibrary.active]=[...deck];saveDeck(deck);saveDeckLibrary(deckLibrary);renderMenuDeck();
}
function renderDeckSlots(){
  for(const id of['menu-deck-slots','deck-slots'])$(id).innerHTML=deckLibrary.slots.map((cards,i)=>`<button class="deck-preset" data-deck-slot="${i}" aria-pressed="${i===deckLibrary.active}" aria-label="Mazo ${i+1}, ${cards?.length??0} de 8 cartas" ${id==='deck-slots'&&!deckEditable?'disabled':''}><svg aria-hidden="true"><use href="#i-deck"/></svg><span>${i+1}</span><small>${cards?.length?`${cards.length}/8`:'+'}</small></button>`).join('');
}
for(const id of['menu-deck-slots','deck-slots'])$(id).addEventListener('click',event=>{
  if(!document.body.classList.contains('menu-mode'))return;
  const button=event.target.closest('[data-deck-slot]');if(!button||(!deckEditable&&id==='deck-slots'))return;
  closeCardActions();clearReplacement();
  deckLibrary.active=Number(button.dataset.deckSlot);deckDraft=[...(deckLibrary.slots[deckLibrary.active]||[])];applyDeckChanges();
  if($('deck-dialog').open){renderCollection();if(id==='deck-slots')showDeckTop();}
  $(id).querySelector(`[data-deck-slot="${deckLibrary.active}"]`).focus({preventScroll:true});
});
function syncHand() {
  const signature = game.hands[0].join(',');
  if (signature !== handSignature) {
    handSignature = signature;
    $('hand').innerHTML = game.hands[0].map((key,i) => cardMarkup(key,i)).join('');
    const key = game.queues[0][0], c = CARDS[key];
    $('next-preview').innerHTML = cardArtMarkup(key);
    $('next-card').setAttribute('aria-label',`Próxima carta: ${c.name}, ${c.cost} de elixir`);
    $('next-name').textContent=c.name;
  }
  for (const el of $('hand').querySelectorAll('[data-card]')) {
    const i = Number(el.dataset.card), c = CARDS[game.hands[0][i]];
    el.classList.toggle('selected', selected === i);
    el.classList.toggle('unaffordable', game.energy[0] + .001 < c.cost);
    el.classList.toggle('guide-target', !!walkthrough && walkthrough.step === 1 && i === 0);
    el.disabled=deploying||game.tiebreaker||(onlineMode&&(game.state==='ready'||!online?.connected));
    el.setAttribute('aria-pressed', String(selected === i));
  }
}
function updateDetail() {
  renderer.selection=game.hands[0][selected]||null;
}
function choose(index) {
  if (!ready || deploying || index < 0 || index > 3 || game.state === 'ended' || game.state === 'paused') return;
  if (selected !== index) audioInit();
  selected = index;
  renderer.pointer = null;
  if (walkthrough?.step === 1) setGuideStep(2);
  updateDetail(); syncHand();
  const c = CARDS[game.hands[0][selected]];
  live(`${c.name}. ${c.cost} de energía. ${c.spell ? 'Elegí una celda de la arena.' : 'Apuntá en tu lado de la arena.'}`);
}
function cancelSelection() { quickStats.hide(); selected = -1; renderer.pointer = null; renderer.selection = null; updateDetail(); syncHand(); }
function updateUi() {
  $('battle-loading').hidden=!renderer.pendingSpecies.size;
  sfx.setBattleState(game.state==='playing'&&!document.hidden&&!document.body.classList.contains('menu-mode')&&!document.querySelector('dialog[open]'),game.overtime||game.time<=60);
  const energy = game.energy[0];
  $('energy-value').textContent = String(Math.floor(energy));
  $('energy-bar').setAttribute('aria-valuenow', energy.toFixed(1));
  [...$('energy-bar').children].forEach((el,i) => el.firstElementChild.style.width = `${Math.max(0,Math.min(1,energy-i))*100}%`);
  $('boost').hidden = game.multiplier === 1; $('boost').textContent = `×${game.multiplier}`;
  const total = Math.ceil(game.time); $('timer').textContent = `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`;
  $('battle-clock').classList.toggle('urgent', game.time <= 30 || game.overtime);
  $('phase-label').hidden=!game.overtime;$('phase-label').textContent=game.tiebreaker?'Desempate':'Extra';
  $('match-pause').hidden=onlineMode||!['playing','paused'].includes(game.state);
  $('match-leave').hidden=onlineMode||!['playing','paused'].includes(game.state);
  $('menu-btn').disabled=!!online?.active&&(onlineMode&&game.state!=='ended'||online.mode==='resume');
  document.querySelector('.brand').setAttribute('aria-disabled',String($('menu-btn').disabled));
  const battleAction=game.state==='paused'?'resume':'pause';
  if($('match-pause').dataset.action!==battleAction){
    const label=battleAction==='resume'?'Reanudar':'Pausar';
    $('match-pause').dataset.action=battleAction;$('match-pause').setAttribute('aria-label',label);$('match-pause').title=`${label} (Espacio)`;
    $('match-pause').querySelector('use').setAttribute('href',battleAction==='resume'?'#i-play':'#i-pause');
  }
  const abilities=game.units.filter(u=>u.team===0&&u.card.ability&&!u.abilityUsed&&u.hp>0&&u.spawn<=0);
  $('abilities').hidden=!abilities.length;
  const signature=abilities.map(u=>`${u.id}:${game.energy[0]>=u.card.ability.cost}`).join(',');
  if($('abilities').dataset.signature!==signature){$('abilities').dataset.signature=signature;$('abilities').innerHTML=abilities.map(u=>`<button class="ability-btn" data-ability="${u.id}" ${game.energy[0]<u.card.ability.cost?'disabled':''} aria-label="${u.card.name}: ${u.card.ability.name}, ${u.card.ability.cost} de elixir"><span class="ability-portrait">${cardArtMarkup(u.key)}</span><span class="ability-name">${u.card.ability.name}</span><span class="ability-cost" aria-hidden="true"><svg><use href="#i-energy"/></svg><b>${u.card.ability.cost}</b></span></button>`).join('');}
  syncHand();
}
function handleEvent(e) {
  renderer.onEvent(e); sfx.event(e);
  if(e.type==='burrow'&&e.unit.team===0)live(e.hidden?'Ampharos se oculta.':'Ampharos emerge.');
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
  deploying=false;deploymentSerial++;
  sfx.resetMusic();
  $('result-overlay').hidden = true; $('pause-overlay').hidden = true; $('guide').hidden = true;
  walkthrough = null; selected = -1; handSignature = ''; renderer.pointer = null; renderer.selection = null; renderer.tutorialSpot = false;
  renderer.particles = [];renderer.effects=[];renderer.numbers=[];renderer.resetVisuals();
  game = new Game({ deck: tutorial||deck.length!==8 ? DEFAULT_DECK : deck, difficulty, tutorial, onEvent: handleEvent, animations:renderer.metadata });
  $('enemy-name').textContent = `${{easy:'Principiante',normal:'Entrenador',hard:'Líder de gimnasio'}[difficulty]} · CPU`;
  $('online-status').hidden=true;$('connection-loading').hidden=true;
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
  $('guide-step').textContent = String(step);$('guide-step').setAttribute('aria-label',`Paso ${step} de 3`);
  $('guide-text').textContent = {1:'Elegí una carta.',2:'Tocá tu lado de la arena.',3:'Sumá otro Pokémon para apoyarlo.'}[step];
  renderer.tutorialSpot = step === 2;
  $('skip-guide').textContent = step === 3 ? 'Listo' : 'Omitir'; syncHand();
}
function finishGuide() { walkthrough = null; game.aiEnabled = true; game.aiClock = 4; $('guide').hidden = true; renderer.tutorialSpot = false; syncHand(); }
function showResult(e) {
  if (walkthrough) finishGuide();
  selected = -1; renderer.selection = null;
  $('pause-overlay').hidden = true; $('result-overlay').hidden = false;
  $('result-title').textContent = e.winner === 0 ? 'Victoria' : e.winner === 1 ? 'Derrota' : 'Empate';
  $('result-overlay').dataset.outcome=e.winner===0?'win':e.winner===1?'loss':'draw';
  $('result-overlay').querySelector('.result-crown use').setAttribute('href',e.winner===0?'#i-medal':e.winner===1?'#i-shield':'#i-ball');
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
  if(game.state!=='playing'||deploying)return;
  if(selected<0)return;
  const index=selected,key=game.hands[0][index],client=online,isOnline=onlineMode,serial=++deploymentSerial;
  deploying=true;cancelSelection();
  try{
    const result=isOnline?await client.send({kind:'deploy',handIndex:index,key,x:client.team?W-point.x:point.x,y:client.team?H-point.y:point.y}):game.deploy(0,index,point.x,point.y);
    if(serial!==deploymentSerial||isOnline&&client!==online)return;
    if(!result?.ok){toast(result?.reason||'No se pudo colocar la carta.');tone(150,.12,'triangle',.02);return;}
    live(`${CARDS[result.key].name} desplegado. ${Math.floor(game.energy[0])} de energía.`);updateUi();
  }catch(error){toast(error.message||'No se pudo colocar la carta.');}
  finally{if(serial===deploymentSerial){deploying=false;syncHand();}}
}
function togglePause() {
  quickStats.hide();
  if(onlineMode)return;
  if(document.querySelector('dialog[open]'))return;
  if(game.state==='playing'){cancelSelection();game.pause();$('pause-overlay').hidden=false;$('resume-btn').focus({preventScroll:true});live('Partida en pausa.');}
  else if(game.state==='paused'){game.resume();$('pause-overlay').hidden=true;canvas.focus({preventScroll:true});live('Partida reanudada.');}
}
const modalFocus = new WeakMap();
function focusReference(element) {
  const attribute=['data-collection','data-deck-info','data-menu-card'].find(name=>element?.hasAttribute(name));
  return {element,attribute,value:attribute?element.getAttribute(attribute):null,deckScroll:element&&$('deck-scroll').contains(element)?$('deck-scroll').scrollTop:null};
}
function restoreFocus(reference) {
  if(!reference)return;
  const target=reference.attribute?document.querySelector(`[${reference.attribute}="${CSS.escape(reference.value)}"]`):reference.element;
  const topDialog=[...document.querySelectorAll('dialog[open]')].at(-1);
  if(target?.isConnected&&!target.disabled&&(!topDialog||topDialog.contains(target)))target.focus({preventScroll:true});
  if(reference.deckScroll!==null&&topDialog?.id==='deck-dialog')$('deck-scroll').scrollTop=reference.deckScroll;
}
function openModal(id) {
  if($('portrait-dialog').open&&id!=='portrait-dialog')return;
  if(id==='deck-dialog'&&!document.body.classList.contains('menu-mode'))return;
  if(id==='help-dialog')$('help-practice-btn').hidden=!document.body.classList.contains('menu-mode');
  if(id==='settings-dialog')$('difficulty-hint').hidden=document.body.classList.contains('menu-mode');
  closeEditorPopovers();
  const dialog=$(id);dialog.dataset.resume=game.state==='playing'?'1':'0';
  modalFocus.set(dialog,focusReference(document.activeElement));
  if(game.state==='playing'&&!onlineMode)game.pause();
  dialog.showModal();
}
function closeModal(dialog,resume=true){if(!resume)dialog.dataset.resume='0';dialog.close();}
document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.addEventListener('close',()=>{if(dialog.id==='deck-dialog'){closeEditorPopovers();clearReplacement();}if(dialog.dataset.resume==='1'&&game.state==='paused'){game.resume();$('pause-overlay').hidden=true;}restoreFocus(modalFocus.get(dialog));});
  dialog.addEventListener('click',event=>{if(dialog.id==='portrait-dialog')return;if(event.target.closest('[data-close]'))closeModal(dialog);else if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeModal(dialog);}});
});
const portraitMedia=matchMedia('(pointer: coarse) and (hover: none) and (orientation: landscape)');
function syncPortrait(){
  const dialog=$('portrait-dialog');
  if(portraitMedia.matches){if(!dialog.open)openModal('portrait-dialog');}
  else if(dialog.open)closeModal(dialog);
}
$('portrait-dialog').addEventListener('cancel',event=>event.preventDefault());
portraitMedia.addEventListener('change',syncPortrait);
document.addEventListener('pointerdown',()=>{
  if(!matchMedia('(pointer: coarse)').matches)return;
  try{screen.orientation?.lock?.('portrait')?.catch(()=>{});}catch{/* Portrait notice covers browsers without orientation locking. */}
},{once:true});

function renderCollection() {
  const focused=document.activeElement,reference=$('collection').contains(focused)||$('deck-strip').contains(focused)?focusReference(focused):null;
  renderDeckStrip();
  const term=($('collection-search')?.value||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,''),rarity=$('rarity-filter')?.value||'',role=$('role-filter')?.value||'',order=$('collection-sort').value;
  const keys=Object.keys(CARDS).filter(k=>{const c=CARDS[k],text=`${c.name} ${cardEquivalentLabel(k)} ${c.role} ${c.move}`.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');return !c.token&&(!rarity||c.rarity===rarity)&&(!role||(role==='spell'?c.spell:role==='structure'?c.structure:role==='building'?c.building:role==='summon'?c.summon||c.deathSpawn:!c.spell&&!c.structure))&&text.includes(term);});
  const byName=(a,b)=>CARDS[a].name.localeCompare(CARDS[b].name,'es');
  if(order==='elixir-asc')keys.sort((a,b)=>CARDS[a].cost-CARDS[b].cost||byName(a,b));
  else if(order==='elixir-desc')keys.sort((a,b)=>CARDS[b].cost-CARDS[a].cost||byName(a,b));
  else if(order==='name')keys.sort(byName);
  $('collection').innerHTML=keys.map(k=>`<div class="collection-entry">${cardMarkup(k,0,'collection')}</div>`).join('')||'<div class="collection-empty"><svg aria-hidden="true"><use href="#i-search"/></svg><p role="status">No hay cartas con esos filtros.</p><button class="secondary-btn" data-reset-filters>Ver todas las cartas</button></div>';
  for(const el of $('collection').querySelectorAll('[data-collection]')){const c=CARDS[el.dataset.collection],equivalent=cardEquivalentLabel(el.dataset.collection),included=deckDraft.includes(el.dataset.collection);el.classList.toggle('selected',included);el.setAttribute('aria-label',`${c.name}, ${c.cost} de elixir${equivalent?`, ${equivalent}`:''}${c.count>1?`, ${c.count} unidades`:''}${included?', en mazo':''}, acciones de la carta`);}
  $('collection-filters-btn').classList.toggle('has-filters',!!term||!!rarity||!!role||order!=='elixir-asc');
  $('deck-average').textContent=deckDraft.length?(deckDraft.reduce((a,k)=>a+CARDS[k].cost,0)/deckDraft.length).toFixed(1).replace('.',','):'—';
  $('save-deck-btn').disabled=false;
  restoreFocus(reference);
}
function renderDeckStrip(){
  $('deck-strip').innerHTML=Array.from({length:8},(_,i)=>{
    const key=deckDraft[i],c=CARDS[key];
    if(!c)return`<span class="deck-slot empty" aria-label="Espacio ${i+1} vacío">+</span>`;
    return cardMarkup(key,i,'deck-info');
  }).join('');
}
$('deck-strip').addEventListener('click',e=>{const el=e.target.closest('[data-deck-info]');if(!el)return;if(replacementKey){const index=deckDraft.indexOf(el.dataset.deckInfo);deckDraft[index]=replacementKey;clearReplacement();applyDeckChanges();renderCollection();$('deck-strip').querySelectorAll('[data-deck-info]')[index]?.focus({preventScroll:true});return;}openCardActions(el.dataset.deckInfo,el);});
$('menu-deck-preview').addEventListener('click',e=>{if(!document.body.classList.contains('menu-mode'))return;if(e.target.closest('[data-menu-empty]')){openDeck();return;}const el=e.target.closest('[data-menu-card]');if(el){deckEditable=true;deckDraft=[...deck];renderCardInfo(el.dataset.menuCard);openModal('card-dialog');}});
function openDeck() {
  if(!document.body.classList.contains('menu-mode'))return;
  deckEditable=true;deckDraft=[...deck];
  clearReplacement();renderDeckSlots();renderCollection();openModal('deck-dialog');showDeckTop();
  requestAnimationFrame(()=>{if($('deck-slots').contains(document.activeElement))showDeckTop();});
}
function showDeckTop(){
  const dialog=$('deck-dialog');if(!dialog.open)return;
  $('deck-slots').querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
  dialog.scrollTop=0;$('deck-scroll').scrollTop=0;
}
function clearReplacement(){replacementKey=null;$('deck-dialog').classList.remove('replacing-card');$('deck-replace-hint').hidden=true;}
function positionEditorPopover(popover,anchor){
  const a=anchor.getBoundingClientRect(),p=popover.getBoundingClientRect(),view=window.visualViewport,top=view?.offsetTop||0,height=view?.height||innerHeight;
  const x=Math.max(12,Math.min(innerWidth-p.width-12,a.x+a.width/2-p.width/2));
  const below=a.bottom+8,y=below+p.height<=top+height-12?below:a.top-p.height-8;
  popover.style.left=`${x}px`;popover.style.top=`${Math.max(top+12,Math.min(top+height-p.height-12,y))}px`;
}
function closeCardActions(restore=false){
  const reference=cardActionReference;if($('card-actions').matches(':popover-open'))$('card-actions').hidePopover();
  reference?.element?.setAttribute('aria-expanded','false');cardActionKey=null;cardActionReference=null;if(restore)restoreFocus(reference);
}
function closeEditorPopovers(){closeCardActions();if($('collection-filters').matches(':popover-open'))$('collection-filters').hidePopover();}
function openCardActions(key,anchor){
  closeCardActions();cardActionKey=key;cardActionReference=focusReference(anchor);anchor.setAttribute('aria-expanded','true');
  $('card-actions').setAttribute('aria-label',`Acciones de ${CARDS[key].name}`);$('card-action-toggle').textContent=deckDraft.includes(key)?'Quitar':'Usar';
  $('card-actions').showPopover({source:anchor});positionEditorPopover($('card-actions'),anchor);$('card-action-info').focus({preventScroll:true});
}
$('card-actions').addEventListener('toggle',event=>{if(event.newState==='closed')cardActionReference?.element?.setAttribute('aria-expanded','false');});
$('card-action-info').addEventListener('click',()=>{const key=cardActionKey;if(!key)return;closeCardActions(true);renderCardInfo(key);openModal('card-dialog');});
$('card-action-toggle').addEventListener('click',()=>{
  const key=cardActionKey;if(!key)return;closeCardActions();
  if(deckDraft.includes(key)||deckDraft.length<8){toggleDeckCard(key);return;}
  replacementKey=key;$('deck-dialog').classList.add('replacing-card');$('deck-replace-hint').hidden=false;$('deck-scroll').scrollTop=0;$('deck-strip').querySelector('button')?.focus({preventScroll:true});
});
$('cancel-replace-btn').addEventListener('click',clearReplacement);
$('deck-scroll').addEventListener('scroll',()=>{
  const anchor=cardActionReference?.element;if(!$('card-actions').matches(':popover-open')||!anchor?.isConnected)return;
  const a=anchor.getBoundingClientRect(),pane=$('deck-scroll').getBoundingClientRect();
  if(a.bottom<=pane.top||a.top>=pane.bottom){closeCardActions();return;}
  cardActionReference.deckScroll=$('deck-scroll').scrollTop;positionEditorPopover($('card-actions'),anchor);
},{passive:true});
function toggleDeckCard(key){
  if(!deckEditable||!document.body.classList.contains('menu-mode'))return;
  if(deckDraft.includes(key))deckDraft=deckDraft.filter(k=>k!==key);
  else if(deckDraft.length<8)deckDraft.push(key);
  else return;
  applyDeckChanges();renderCollection();
}
function renderCardInfo(key){
  const c=CARDS[key];inspectedCard=key;
  audioInit();
  $('card-info-name').textContent=c.name;$('card-info-type').textContent=`${c.label} · ${RARITIES[c.rarity]}`;$('card-info-role').textContent=cardEquivalentLabel(key)||c.move||c.name;$('card-info-cost').textContent=c.cost;
  $('card-info-art').innerHTML=cardArtMarkup(key);$('card-dialog').dataset.rarity=c.rarity;
  $('card-info-art').style.setProperty('--card-tint',c.color);
  $('card-info-move').textContent=c.move||c.name;$('card-info-description').textContent=c.description;
  const number=value=>Number(value).toLocaleString('es-AR',{maximumFractionDigits:1});
  const seconds=value=>`${Number(value).toLocaleString('es-AR',{maximumFractionDigits:2})} s`,tiles=value=>`${number(value/TILE)} casillas`;
  const targets=c.spawnOnImpact||c.summon&&c.passive?'Invoca tropas':c.passive?'Contraataca':c.building?'Estructuras':c.rolling||c.groundOnly?'Tierra':c.spell||c.air||c.squad?'Tierra y aire':'Tierra';
  const stats=[],extraStats=[],traits=[];
  if(c.hp)stats.push(['Puntos de vida',number(c.hp),'heart']);
  const impacts=c.bolts||c.burst||1;
  if(c.fieldDamage)stats.push(['Daño por segundo',number(c.fieldDamage),'dps']);
  else if(c.damage>0)stats.push([c.bolts?'Daño de los rayos':c.burst?'Daño por ráfaga':'Daño por golpe',impacts>1?`${number(c.damage)} × ${impacts}`:number(c.damage),'damage']);
  if(!c.spell&&c.interval&&!c.passive){
    stats.push(['Daño por segundo',number(c.damage*impacts/c.interval),'dps']);
    stats.push(['Ataque cada',seconds(c.interval),'attack-speed']);
  }
  if(c.spell&&c.towerDamage)stats.push(['Daño a torres',number(c.towerDamage),'tower']);
  stats.push(['Objetivos',targets,'target']);
  if(c.speed!==undefined)stats.push(['Movimiento',c.structure||c.speed===0?'Inmóvil':c.speed<=18?'Lento':c.speed<=26?'Medio':c.speed<=32?'Rápido':'Muy rápido','move']);
  if(c.range&&!c.passive)stats.push(['Alcance',c.range<50?'Cuerpo a cuerpo':tiles(c.range),'range']);
  if(c.spell)stats.push([c.rolling?'Recorrido':'Radio',tiles(c.rolling?c.travelDistance:c.splash),'range']);
  stats.push([c.travelSpeed&&!c.rolling?'Lanzamiento':'Despliegue',seconds(c.spell?(c.rolling?0:c.castDelay??.4):.75),'deploy']);
  if(c.count>1)traits.push(['Unidades',`×${c.count}`,'units']);
  if(c.spawnKey)stats.push(['Invocaciones',`${c.spawnTotal} ${CARDS[c.spawnKey].name}`,'units']);
  if(c.fieldDuration)stats.push(['Duración',seconds(c.fieldDuration),'duration']);
  if(c.shield)traits.push(['Escudo',number(c.shield),'shield']);
  if(c.flying)traits.push(['Desplazamiento','Vuela','move']);
  if(c.riverJump)traits.push(['Desplazamiento','Salta el río','move']);
  if(c.burrow)traits.push(['Defensa','Se oculta sin enemigos','effect']);
  if(c.rollingShot)extraStats.push(['Recorrido de la roca',tiles(c.projectileRange),'range']);
  if(c.knockback)extraStats.push(['Empuje',tiles(c.knockback),'effect']);
  if(c.lifetime)extraStats.push(['Duración',seconds(c.lifetime),'duration']);
  if(c.burn)extraStats.push([c.burnKind==='poison'?'Veneno':'Quemadura',`${number(c.burn)} / s`,'effect']);
  if(c.stun)extraStats.push([c.freeze?'Congelación':'Aturdimiento',seconds(c.stun),'effect']);
  if(c.entryDamage)extraStats.push(['Daño al aparecer',number(c.entryDamage),'damage']);
  if(c.entryRadius)extraStats.push(['Área al aparecer',tiles(c.entryRadius),'range']);
  if(c.entryStun)extraStats.push(['Aturdimiento al aparecer',seconds(c.entryStun),'effect']);
  if(c.travelSpeed&&!c.rolling)extraStats.push(['Viaje',`${number(c.travelSpeed/TILE)} casillas / s`,'move']);
  if(c.slow)extraStats.push(['Ralentización',seconds(c.slow),'effect']);
  if(c.splash&&!c.spell)extraStats.push([c.suicide?'Radio de explosión':'Radio de impacto',tiles(c.splash),'range']);
  if(c.jumpRange)extraStats.push(['Distancia de salto',tiles(c.jumpRange),'range']);
  if(c.summonSpacing)extraStats.push(['Entre refuerzos',seconds(c.summonSpacing),'attack-speed']);
  if(c.lifesteal)extraStats.push(['Curación por golpe',number(c.lifesteal),'heart']);
  if(c.summon)stats.push(['Invocación',`${c.summonCount||1} ${CARDS[c.summon].name} / ${seconds(c.summonEvery)}`,'units']);
  if(c.deathSpawn)extraStats.push(['Al caer',`${c.deathCount||1} ${CARDS[c.deathSpawn].name}`,'units']);
  if(c.targetLimit)extraStats.push(['Objetivos máximos',c.targetLimit,'target']);
  if(c.airMultiplier)extraStats.push(['Daño a voladores',`${number(c.fieldDamage*c.airMultiplier)} / s`,'damage']);
  if(c.buildingMultiplier)extraStats.push(['Daño a estructuras',`${number(c.fieldDamage*c.buildingMultiplier)} / s`,'damage']);
  if(c.ability)extraStats.push(['Habilidad',`${c.ability.cost} elixir · 1 uso`,'effect']);
  if(c.ability?.damage)extraStats.push(['Daño de habilidad',number(c.ability.damage),'damage']);
  if(c.ability?.stun)extraStats.push(['Aturdimiento de habilidad',seconds(c.ability.stun),'effect']);
  if(c.heal)extraStats.push(['Curación',`${number(c.heal)} / ${seconds(c.healEvery)}`,'heart']);
  if(c.reflect)extraStats.push(['Daño reflejado',`${Math.round(c.reflect*100)} %`,'shield']);
  if(c.armor)extraStats.push(['Reducción de daño',`${Math.round(c.armor*100)} %`,'shield']);
  if(c.squad){
    const bodies=[...new Set(c.squad)].map(k=>CARDS[k]);
    for(const stat of stats){
      if(stat[2]==='heart')stat[1]=bodies.map(b=>number(b.hp)).join(' / ');
      if(stat[2]==='damage')stat[1]=bodies.map(b=>number(b.damage)).join(' / ');
      if(stat[2]==='dps')stat[1]=bodies.map(b=>number(b.damage/b.interval)).join(' / ');
      if(stat[2]==='attack-speed')stat[1]=bodies.map(b=>seconds(b.interval)).join(' / ');
      if(stat[2]==='range')stat[1]=bodies.map(b=>b.range<50?'Contacto':tiles(b.range)).join(' / ');
    }
  }
  const statMarkup=items=>items.map(([label,value,icon])=>`<div class="stat-item stat-${icon}"><dt><span class="stat-icon stat-icon-${icon}" aria-hidden="true"></span><span>${label}</span></dt><dd>${value}</dd></div>`).join('');
  $('card-info-stats').innerHTML=statMarkup(stats);
  $('card-info-traits').innerHTML=statMarkup(traits);$('card-info-traits').hidden=!traits.length;
  $('card-stats-unit').textContent=c.squad?[...new Set(c.squad)].map(k=>CARDS[k].name).join(' / '):c.count>1?'Por unidad':'';
  $('card-extra-stats').innerHTML=statMarkup(extraStats);
  $('card-more-stats').hidden=!extraStats.length;
  if($('card-dialog').open===false)$('card-more-stats').open=false;
  const included=deckDraft.includes(key);$('card-info-toggle').textContent=included?'Quitar del mazo':'Agregar al mazo';
  $('card-info-toggle').disabled=!deckEditable||(!included&&deckDraft.length===8);
}
$('collection').addEventListener('click',e=>{
  if(e.target.closest('[data-reset-filters]')){resetCollectionFilters();return;}
  const el=e.target.closest('[data-collection]');if(el)openCardActions(el.dataset.collection,el);
});
$('card-info-toggle').addEventListener('click',()=>{if(inspectedCard){toggleDeckCard(inspectedCard);closeModal($('card-dialog'),false);}});
$('save-deck-btn').addEventListener('click',()=>closeModal($('deck-dialog')));

$('hand').addEventListener('click',e=>{const el=e.target.closest('[data-card]');if(el&&!quickStats.isHoldClick(e)&&performance.now()>ignoreClickUntil)choose(Number(el.dataset.card));});
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
  if(e.target.closest?.('#hand [data-card]')&&['Space','Enter'].includes(e.code))return;
  if(document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  if(e.key>='1'&&e.key<='4'){e.preventDefault();choose(Number(e.key)-1);return;}
  if(e.key==='Escape'){if(game.state==='paused')togglePause();else cancelSelection();return;}
  if(e.code==='Space'&&!e.repeat){if(e.target.tagName==='BUTTON')return;e.preventDefault();togglePause();return;}
  if(selected>=0&&game.state==='playing'){
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
      e.preventDefault();renderer.pointer||={x:158,y:520};
      if(e.key==='ArrowUp')renderer.pointer.y-=TILE;if(e.key==='ArrowDown')renderer.pointer.y+=TILE;if(e.key==='ArrowLeft')renderer.pointer.x-=TILE;if(e.key==='ArrowRight')renderer.pointer.x+=TILE;
      renderer.pointer.x=Math.max(45,Math.min(555,renderer.pointer.x));renderer.pointer.y=Math.max(45,Math.min(755,renderer.pointer.y));
      live(`Posición ${Math.round(renderer.pointer.x)}, ${Math.round(renderer.pointer.y)}.`);
    }else if(e.key==='Enter'&&renderer.pointer){e.preventDefault();attemptDeploy(renderer.pointer);}
  }
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)sfx.setBattleState(false);else{sfx.recover();online?.reconnectIfStale();updateUi();}if(document.hidden&&game.state==='playing'&&!onlineMode){game.pause();$('pause-overlay').hidden=false;}});
addEventListener('online',()=>online?.reconnectIfStale());
addEventListener('pagehide',()=>online?.suspend());
addEventListener('pageshow',event=>{if(game){sfx.recover();updateUi();}if(event.persisted&&onlineMode&&game.state!=='ended')online?.resume();});
addEventListener('focus',()=>sfx.recover());
for(const event of['pointerdown','keydown'])document.addEventListener(event,()=>{if(sfx.ctx)sfx.unlock(true);},{capture:true,passive:true});

$('start-btn').addEventListener('click',()=>{online?.close();onlineMode=false;newGame({start:true});});
$('practice-btn').addEventListener('click',()=>{online?.close();onlineMode=false;newGame({start:true,tutorial:true});});
$('skip-guide').addEventListener('click',finishGuide);
$('again-btn').addEventListener('click',()=>{if(onlineMode)beginOnline();else newGame({start:true});});
$('result-menu-btn').addEventListener('click',mainMenu);
$('menu-deck-btn').addEventListener('click',openDeck);
function mainMenu(){if(online?.active&&(online.mode==='resume'||onlineMode&&game.state!=='ended'))return;const searching=!$('search-panel').hidden;closingOnline=online?.close()||Promise.resolve();online=null;onlineMode=false;$('search-panel').hidden=true;$('ready-overlay').inert=false;for(const dialog of document.querySelectorAll('dialog[open]'))closeModal(dialog,false);newGame();canvas.blur();if(searching)$('online-btn').focus({preventScroll:true});}
function requestHome(event){
  event?.preventDefault();
  if(online?.active&&(online.mode==='resume'||onlineMode&&game.state!=='ended'))return;
  if(!document.body.classList.contains('menu-mode')&&!onlineMode&&['playing','paused'].includes(game.state)){if(!$('leave-dialog').open)openModal('leave-dialog');return;}
  mainMenu();
}
$('menu-btn').addEventListener('click',requestHome);
document.querySelector('.brand').addEventListener('click',requestHome);
$('pause-menu-btn').addEventListener('click',requestHome);
$('match-pause').addEventListener('click',togglePause);
$('match-leave').addEventListener('click',requestHome);
$('confirm-leave-btn').addEventListener('click',mainMenu);
$('resume-btn').addEventListener('click',togglePause);
$('help-btn').addEventListener('click',()=>openModal('help-dialog'));
$('settings-btn').addEventListener('click',()=>openModal('settings-dialog'));
$('settings-credits-btn').addEventListener('click',()=>openModal('credits-dialog'));
$('help-practice-btn').addEventListener('click',()=>{if(!document.body.classList.contains('menu-mode'))return;closeModal($('help-dialog'),false);newGame({start:true,tutorial:true});});
$('sound-btn').addEventListener('click',()=>{sound=!sound;updateSound();audioInit();if(sound)tone(580,.13,'sine',.05);});
$('sound-setting').addEventListener('change',e=>{sound=e.target.checked;updateSound();audioInit();});
$('motion-setting').addEventListener('change',e=>setReduced(e.target.checked));
$('damage-numbers-setting').addEventListener('change',e=>setCombatNumbers(e.target.checked));
$('difficulty').value=difficulty;
$('difficulty').addEventListener('change',e=>{difficulty=e.target.value;store.set('difficulty',difficulty);});

for(let i=0;i<10;i++){const el=document.createElement('div');el.className='energy-segment';el.innerHTML='<div class="energy-fill"></div>';$('energy-bar').append(el);}
$('trainer-name').value=store.get('name','');$('trainer-name').addEventListener('change',()=>store.set('name',$('trainer-name').value));
$('rarity-filter').innerHTML='<option value="">Todas las rarezas</option>'+Object.entries(RARITIES).map(([key,value])=>`<option value="${key}">${value}</option>`).join('');
$('collection-sort').value=store.get('collection-order','elixir-asc');if(!$('collection-sort').value)$('collection-sort').value='elixir-asc';
function filterCollection(){closeCardActions();renderCollection();$('deck-scroll').scrollTop=$('collection').offsetTop;}
function resetCollectionFilters(){$('collection-search').value='';$('rarity-filter').value='';$('role-filter').value='';filterCollection();}
for(const id of['collection-search','rarity-filter','role-filter'])$(id).addEventListener(id==='collection-search'?'input':'change',filterCollection);
$('collection-sort').addEventListener('change',()=>{store.set('collection-order',$('collection-sort').value);filterCollection();});
$('collection-filters-btn').addEventListener('click',()=>{const popover=$('collection-filters');if(popover.matches(':popover-open')){popover.hidePopover();return;}popover.showPopover({source:$('collection-filters-btn')});positionEditorPopover(popover,$('collection-filters-btn'));popover.focus({preventScroll:true});});
$('collection-filters').addEventListener('toggle',event=>$('collection-filters-btn').setAttribute('aria-expanded',String(event.newState==='open')));
$('reset-filters-btn').addEventListener('click',resetCollectionFilters);
$('apply-filters-btn').addEventListener('click',()=>{$('collection-filters').hidePopover();$('collection-filters-btn').focus({preventScroll:true});});
addEventListener('resize',()=>{if($('collection-filters').matches(':popover-open'))positionEditorPopover($('collection-filters'),$('collection-filters-btn'));closeCardActions();},{passive:true});
$('online-btn').addEventListener('click',beginOnline);$('cancel-search').addEventListener('click',mainMenu);
$('abilities').addEventListener('click',async e=>{const button=e.target.closest('[data-ability]');if(!button)return;const id=Number(button.dataset.ability);button.disabled=true;const result=onlineMode?await online.send({kind:'ability',unitId:id}):game.activateAbility(0,id);if(!result.ok)live(result.reason);updateUi();});
function showSearch(){if(!$('search-panel').hidden)return;$('menu-loading').hidden=true;$('search-panel').hidden=false;$('ready-overlay').inert=true;$('cancel-search').focus({preventScroll:true});}
function createOnlineClient(){
  return new OnlineClient({onSearch:ms=>{const sec=Math.floor(ms/1000);$('search-time').textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;if(ready)showSearch();},onConnection:status=>{
    const reconnecting=status==='Reconectando…';$('connection-loading').hidden=!onlineMode||!reconnecting;$('online-status').hidden=!onlineMode||!status||reconnecting;$('online-status').textContent=reconnecting?'':status;
    if(!onlineMode)$('search-status').textContent=status||'Buscando rival…';
  },onIdle:message=>{
    online=null;onlineMode=false;$('menu-loading').hidden=ready;$('ready-overlay').inert=false;$('search-panel').hidden=true;newGame();if(message)toast(message);
  },onSnapshot:packet=>{
    online.team=packet.team;onlineMode=true;$('enemy-name').textContent=packet.opponent;
    if(ready){document.body.classList.remove('menu-mode');$('main-menu').hidden=true;$('menu-loading').hidden=true;$('ready-overlay').inert=false;}
    $('search-panel').hidden=true;
    game=unpackGame(perspective(packet.game,packet.team),handleEvent,renderer.metadata);
    for(const entry of packet.events)handleEvent(perspective(entry.event,packet.team));
    if(game.state==='ended'&&$('result-overlay').hidden)showResult({winner:game.winner,reason:game.reason});
    $('online-status').hidden=packet.startsIn<=0;$('online-status').textContent=packet.startsIn>0?'Preparados':'';updateUi();
  }});
}
async function beginOnline(){
  if(deck.length!==8||onlineMode&&game.state!=='ended')return;
  await closingOnline;await online?.close();onlineMode=false;newGame();audioInit();showSearch();$('search-status').textContent='Buscando rival…';$('search-time').textContent='0:00';
  online=createOnlineClient();
  try{await online.start($('trainer-name').value||'Entrenador',deck);}catch(error){$('search-status').textContent=error.message;}
}
updateSound();setReduced(reduced);setCombatNumbers(combatNumbers);newGame();syncPortrait();
let previous=performance.now(),accumulator=0;
function frame(now){
  const dt=Math.min((now-previous)/1000,.08);previous=now;
  if(onlineMode){
    for(const u of [...game.units,...game.towers]){
      u.anim+=dt;u.hit=Math.max(0,(u.hit||0)-dt);
      if(u.card&&game.state==='playing'&&!game.tiebreaker){const activeDt=Math.max(0,dt-u.spawn);u.spawn=Math.max(0,u.spawn-dt);if(u.card.summon)u.summonClock=Math.max(0,u.summonClock-activeDt);}
    }
    if(game.state==='playing'){
      for(const field of game.fields)field.life=Math.max(0,field.life-dt);
    }
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
$('retry-load').addEventListener('click',()=>location.reload());
try{
  if(hasSavedOnlineSession()){
    $('ready-overlay').inert=true;online=createOnlineClient();online.resume().catch(()=>{});
  }
  await renderer.load(deck.length===8?deck:DEFAULT_DECK,(loaded,total)=>{const progress=loaded/total,indicator=$('menu-load-progress');indicator.setAttribute('aria-valuenow',String(Math.floor(progress*100)));$('menu-load-fill').setAttribute('y',String(64*(1-progress)));$('menu-load-fill').setAttribute('height',String(64*progress));});
  ready=true;$('loading').hidden=true;$('ready-overlay').setAttribute('aria-busy','false');$('practice-btn').disabled=false;updateMenuAvailability();
  if(onlineMode){document.body.classList.remove('menu-mode');$('main-menu').hidden=true;$('menu-loading').hidden=true;$('ready-overlay').inert=false;}
  else if(online?.active&&online.mode==='search')showSearch();
  else if(online?.active){$('menu-load-progress').classList.add('is-indeterminate');$('menu-load-progress').setAttribute('aria-label','Reconectando a la partida');$('menu-load-progress').removeAttribute('aria-valuenow');}
  else{$('menu-loading').hidden=true;$('ready-overlay').inert=false;}
}catch(error){
  console.error(error);$('menu-loading-badge').hidden=true;$('menu-load-error').hidden=false;$('menu-loading').classList.add('load-failed');$('ready-overlay').setAttribute('aria-busy','false');
}
