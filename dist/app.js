import { screenToWorld } from './arena-geometry.js?v=34';
import { resolvePlacementInput, inPlacementInputArea } from './placement-input.js?v=34';
import { Game, CARDS, DEFAULT_DECK, RARITIES, W, H, TILE } from './engine.js?v=target-c1-1';
import { Renderer } from './render.js?v=c4-cpu-1';
import { SoundSystem } from './audio.js?v=c4-result-cue-1';
import {readAudioLevels} from './audio-preferences.js?v=1';
import {C1_SERVICE,C4_SERVICE} from './online-context.js?v=1';
import {onlineRouting} from './online-routing.js?v=c4-online-1';
import {prepareC4Catalog,getC4BaseCard} from './c4-catalog.js?v=1';
import {prepareC4Packet,prepareC4Transport} from './c4-packet.js?v=1';
import {c4SelectionFromLibrary} from './profile-selection.js?v=1';
import {resolveSavedSelectionKey} from './arena-profile-selection.js?v=1';
import {arenaCollectionProfile,arenaSelectionProfile} from './arena-selection-profiles.js?v=1';
import { OnlineClient, hasSavedOnlineSession, hasPendingC4Search } from './online.js?v=c4-online-1';
import { onlinePerf } from './perf.js?v=1';
import { unpackGame, perspective } from './snapshot.js?v=target-c1-1';
import { cardArtMarkup } from './card-art.js?v=target-c1-1';
import { cardEquivalentLabel } from './card-equivalents.js?v=34';
import { loadDeckLibrary, saveDeckLibrary } from './deck-storage.js?v=c4-editor-1';
import {savedSlotProfile,updateLibrarySlot} from './deck-provenance.js?v=c4-editor-1';
import {isLocalC4EditorPreview,cardForEditor,editorCardRole,conversionPresentation} from './deck-editor-profile.js?v=c4-editor-1';
import {isLocalC4CpuPreview,checkLocalCpuDeck,checkCpuDeck} from './local-cpu-profile.js?v=2';
import { checkSelectionCard, checkSelectionDeck, resolveSelectionKey } from './canonical-selection.js?v=1';
import { bindQuickStats } from './quick-stats.js?v=34';
import { BattlePhaseUi } from './battle-phase-ui.js?v=34';
import { loadUiResources } from './ui-resource-load.js?v=1';

const $ = id => document.getElementById(id);
const onlineRoutes=onlineRouting(location.href),c4WireEndpoint=onlineRoutes.c4Search,c4RecoveryEndpoint=onlineRoutes.c4Recovery;
const c4CpuPreview=!!onlineRoutes.localC4||isLocalC4CpuPreview(location.href);
let c4BootError=null;
const c4EditorPreview=!!c4WireEndpoint||c4CpuPreview||isLocalC4EditorPreview(location.href);
document.body.classList.toggle('c4-editor-preview',c4EditorPreview);
const battlePhaseUi = new BattlePhaseUi(document);
const canvas = $('arena');
const renderer = new Renderer(canvas);
function fitDesktop(){
  const root=document.documentElement;
  if(innerWidth<=940){root.style.removeProperty('--arena-h');root.style.setProperty('--ui-scale','1');root.style.removeProperty('--battle-gap');return;}
  const reserve=document.fullscreenElement||matchMedia('(display-mode:fullscreen)').matches?24:112;
  const scale=Math.max(1,Math.min(2.15,(innerHeight-reserve)/760)),gap=Math.round(28*scale);
  const width=innerWidth-48-294*scale-gap,height=Math.max(200,Math.min(innerHeight-reserve,width/.75));
  root.style.setProperty('--arena-h',`${height}px`);root.style.setProperty('--ui-scale',String(scale));root.style.setProperty('--battle-gap',`${gap}px`);
}
fitDesktop();addEventListener('resize',fitDesktop,{passive:true});
function fitViewport(){document.documentElement.style.setProperty('--app-height',`${window.visualViewport?.height || innerHeight}px`);}
fitViewport();addEventListener('resize',fitViewport,{passive:true});
window.visualViewport?.addEventListener('resize',fitViewport,{passive:true});
window.visualViewport?.addEventListener('scroll',fitViewport,{passive:true});
document.addEventListener('fullscreenchange',()=>{fitViewport();fitDesktop();});
matchMedia('(display-mode:fullscreen)').addEventListener('change',()=>{fitViewport();fitDesktop();});
const store = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem(`poke-arena:${key}`)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(`poke-arena:${key}`, JSON.stringify(value)); } catch { /* Storage can be disabled in private browsing. */ } },
};
let deckLibrary=loadDeckLibrary(),deck=[...(deckLibrary.slots[deckLibrary.active]||[])];
const storedDifficulty = store.get('difficulty', 'normal');
let difficulty = ['easy', 'normal', 'hard'].includes(storedDifficulty) ? storedDifficulty : 'normal';
let sound = store.get('sound', true) === true;
let reduced = store.get('reduced', matchMedia('(prefers-reduced-motion: reduce)').matches) === true;
let combatNumbers = store.get('combat-numbers', false) === true;
let game, selected = -1, handSignature = '', ready = false, walkthrough = null, deckDraft = [], deckEditable = true, resultCueGame = null;
let toastTimer, deckNoticeTimer, deckSaveErrorTimer, lastUi = 0, drag = null, ignoreClickUntil = 0, online=null, onlineMode=false, closingOnline=Promise.resolve(), deploying=false,deploymentSerial=0;
let cpuStarting=false,cpuStartSerial=0,cpuWaitEnd=null;
const quickStats=bindQuickStats({hand:$('hand'),cards:CARDS,getCard:el=>matchCard(game?.hands[0][Number(el.dataset.card)]),isPlaying:()=>game?.state==='playing'&&!document.body.classList.contains('menu-mode'),getSelection:()=>selected});
const sfx=new SoundSystem(sound,readAudioLevels(store.get));
let inspectedCard=null;
let cardActionKey=null,cardActionReference=null,replacementKey=null;
let cardActionSlot=null,inspectedSlotIndex=null;
const displayCard=key=>Object.hasOwn(CARDS,key)?CARDS[key]:null;
const matchCard=key=>game?.cardFor?.(key)||displayCard(key);
const infoCard=key=>document.body.classList.contains('menu-mode')?editorCard(key):matchCard(key);
const displayArt=key=>cardArtMarkup(key);
const editorDeck=cards=>Array.from({length:8},(_,i)=>cards?.[i]??null);
const cardForSavedKey=key=>{const resolved=resolveSavedSelectionKey(key);return resolved&&displayCard(resolved)?resolved:null;};
const sameSelection=(a,b)=>{const left=resolveSavedSelectionKey(a),right=resolveSavedSelectionKey(b);return left&&left===right;};
const hasEligibleSelection=cards=>checkSelectionDeck(cards).ok;
const eligibleDeckKeys=cards=>hasEligibleSelection(cards)?cards.map(key=>resolveSelectionKey(key).key):null;
const cpuDeckSelection=()=>checkCpuDeck(deckLibrary,deckLibrary.active,{forceC4:c4CpuPreview});
const savedDeckPlayable=(index=deckLibrary.active)=>checkCpuDeck(deckLibrary,index,{forceC4:c4CpuPreview}).ok;
const editorCard=(key,slotIndex=null)=>cardForEditor({key,cards:CARDS,library:deckLibrary,deckIndex:deckLibrary.active,slotIndex,preview:c4EditorPreview});
const editorSelectable=key=>checkSelectionCard(key).ok||c4EditorPreview&&key==='arcanine';
const editorSlotSelectable=(key,index)=>arenaSelectionProfile(key)?savedSlotProfile(deckLibrary,deckLibrary.active,index).kind==='profile':checkSelectionCard(key).ok||c4EditorPreview&&key==='arcanine'&&savedSlotProfile(deckLibrary,deckLibrary.active,index).kind==='hog';
const editorIncludedIndex=key=>deckDraft.findIndex((saved,index)=>saved!==null&&sameSelection(saved,key)&&(arenaCollectionProfile(key)?arenaSelectionProfile(saved)?.choice===arenaCollectionProfile(key).choice:!c4EditorPreview||key!=='arcanine'||savedSlotProfile(deckLibrary,deckLibrary.active,index).kind==='hog'));
{
  const row=document.createElement('div'),accept=document.createElement('button');row.className='card-info-actions';accept.id='card-info-accept';accept.type='button';accept.className='primary-btn';accept.hidden=true;
  $('card-info-toggle').before(row);row.append(accept,$('card-info-toggle'));
}

function audioInit() {
  sfx.setEnabled(sound);sfx.unlock(true);
}
function tone(freq = 440, duration = .08, wave = 'sine', volume = .035, slide = 0) {
  sfx.tone(freq,duration,wave,volume,slide);
}
const RESULT_CUE_TAG='result-cue';
function cancelResultCue(){sfx.cancelTaggedEffects(RESULT_CUE_TAG);}
function playResultCue(winner) {
  cancelResultCue();
  if(winner!==0)return;
  // Give the result reveal a brief breath, then let two rising phrases arrive
  // with the medal's settle and resolve into one warm, sustained major chord.
  const notes=[
    [392,.18,.032,.25,4],[494,.18,.034,.45,5],[587,.19,.036,.65,6],[784,.22,.038,.88,8],
    [440,.16,.03,1.22,3],[523,.16,.032,1.42,4],[659,.17,.034,1.62,5],
    [392,.46,.021,1.84,0],[494,.46,.021,1.84,0],[587,.46,.021,1.84,0],[784,.46,.029,1.84,0],[196,.46,.014,1.84,0],
  ];
  for(const[freq,duration,volume,delay,slide]of notes)sfx.tone(freq,duration,'triangle',volume,slide,0,delay,RESULT_CUE_TAG);
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
let menuToastTimer;
function toast(message) {
  if(document.body.classList.contains('menu-mode')){
    let notice=$('menu-toast');
    if(!notice){notice=document.createElement('div');notice.id='menu-toast';notice.className='toast menu-toast';notice.setAttribute('aria-hidden','true');document.body.append(notice);}
    live(message);notice.textContent=message;notice.classList.add('show');clearTimeout(menuToastTimer);menuToastTimer=setTimeout(()=>notice.classList.remove('show'),2400);return;
  }
  if(game?.state==='playing'){live(message);$('online-status').hidden=false;$('online-status').textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('online-status').hidden=true;},2400);return;}
  $('toast').textContent = message; $('toast').classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2400);
}
function live(message) { $('live-status').textContent = message; }

function cardMarkup(key, index, source = 'card', savedKey=key) {
  const c = source==='card'?matchCard(key):editorCard(key,source==='deck-info'?index:null),equivalent=cardEquivalentLabel(key,c);
  const collection=source!=='card',eligible=source==='collection'?editorSelectable(key):source==='deck-info'?editorSlotSelectable(savedKey,index):checkSelectionCard(savedKey).ok,name=`<span class="card-name">${c.name}</span>`;
  const heading=collection?`<span class="card-heading">${name}${c.count>1?`<span class="card-quantity" aria-hidden="true"><svg><use href="#i-units"/></svg>×${c.count}</span>`:''}</span>`:name;
  const unavailable=(source==='collection'||source==='deck-info')&&!eligible;
  return `<button class="${source==='deck-info'?'deck-slot ':''}pokemon-card type-${c.type}${unavailable?' selection-inactive':''}" data-rarity="${c.rarity}" data-${source}="${collection ? key : index}" ${source==='deck-info'?`data-deck-index="${index}" data-saved-key="${savedKey}"`:''} aria-label="${c.name}, ${RARITIES[c.rarity]}, ${c.cost} de elixir${equivalent?`, ${equivalent}`:''}${c.count>1?`, ${c.count} unidades`:''}${unavailable?', no disponible para mazos nuevos':''}" ${collection?'aria-haspopup="dialog" aria-expanded="false"':'aria-pressed="false"'}><span class="card-cost"><span class="cost-value">${c.cost}</span></span>${!collection ? `<span class="card-key">${index + 1}</span>` : ''}${displayArt(key)}${heading}${source==='deck-info'||!equivalent?'':`<span class="card-role">${equivalent}</span>`}${unavailable?'<span class="selection-status" aria-hidden="true">No disponible</span>':''}</button>`;
}
function renderMenuDeck(){
  renderDeckSlots();
  $('menu-deck-preview').innerHTML=Array.from({length:8},(_,i)=>{const raw=deck[i],key=cardForSavedKey(raw),c=key&&editorCard(key,i),eligible=c&&editorSlotSelectable(raw,i);return c?`<button class="menu-card pokemon-card type-${c.type}${eligible?'':' selection-inactive'}" data-rarity="${c.rarity}" data-menu-card="${key}" data-menu-index="${i}" aria-label="${c.name}, ${c.cost} de elixir${eligible?'':', no disponible para mazos nuevos'}, ver detalles"><span class="card-cost"><span class="cost-value">${c.cost}</span></span>${displayArt(key)}<span class="card-name">${c.name}</span>${eligible?'':'<span class="selection-status" aria-hidden="true">No disponible</span>'}</button>`:`<button class="menu-card pokemon-card empty${raw==='blastoise'?' historical-card':''}" data-menu-empty aria-label="${raw==='blastoise'?'Blastoise, carta histórica no disponible; revisar mazo':raw?'Carta histórica no disponible; revisar mazo':'Elegir carta para el espacio '+(i+1)}">${raw==='blastoise'?'Blastoise':raw?'!':'+'}</button>`;}).join('');
  updateMenuAvailability();
}
function updateMenuAvailability(){
  $('start-btn').disabled=!ready||cpuStarting||!!c4BootError||!cpuDeckSelection().ok;
  $('online-btn').disabled=!ready||cpuStarting||!!c4BootError||!(c4WireEndpoint?c4SelectionFromLibrary(deckLibrary,deckLibrary.active).ok:hasEligibleSelection(deck));
}
function applyDeckChanges({persist=true}={}){
  if(persist){const changed={...deckLibrary,slots:deckLibrary.slots.slice()};changed.slots[changed.active]=editorDeck(deckDraft);return commitDeckLibrary(changed);}
  deck=editorDeck(deckDraft);deckDraft=[...deck];renderMenuDeck();return true;
}
function positionDeckSaveError(notice){
  if(notice.parentElement!==$('main-menu'))return;
  const area=$('main-menu').getBoundingClientRect(),panel=$('ready-overlay').getBoundingClientRect();
  notice.style.left=`${panel.left-area.left}px`;notice.style.right=`${area.right-panel.right}px`;notice.style.bottom=`${area.bottom-panel.top+12}px`;
}
addEventListener('resize',()=>{const notice=$('deck-save-error');if(notice&&!notice.hidden)positionDeckSaveError(notice);},{passive:true});
function deckSaveError(message){
  let notice=$('deck-save-error');if(!notice){notice=document.createElement('div');notice.id='deck-save-error';notice.className='deck-save-error';notice.setAttribute('role','alert');}
  ($('card-dialog').open?$('card-dialog'):$('deck-dialog').open?$('deck-dialog'):$('main-menu')).append(notice);for(const property of ['left','right','bottom'])notice.style.removeProperty(property);notice.textContent=message;notice.hidden=false;positionDeckSaveError(notice);
  clearTimeout(deckSaveErrorTimer);deckSaveErrorTimer=setTimeout(()=>{notice.hidden=true;},3500);
}
function commitDeckLibrary(changed){
  let persisted=false;try{persisted=saveDeckLibrary(changed);}catch{}
  if(!persisted){deckDraft=[...deck];deckSaveError('No se pudo guardar. Reintentá.');return false;}
  clearTimeout(deckSaveErrorTimer);if($('deck-save-error'))$('deck-save-error').hidden=true;
  deckLibrary=changed;deck=editorDeck(changed.slots[changed.active]);deckDraft=[...deck];renderMenuDeck();return true;
}
function editDeckSlot(index,key,action='replace'){
  try{
    const changed=updateLibrarySlot(deckLibrary,deckLibrary.active,index,key,{action,profileChoice:arenaCollectionProfile(key)?.choice??null});if(!changed)return false;
    if(!c4EditorPreview)changed.slots[changed.active]=editorDeck(changed.slots[changed.active]);
    return commitDeckLibrary(changed);
  }catch{deckSaveError('No se pudo editar esta posición.');return false;}
}
function renderDeckSlots(){
  for(const id of['menu-deck-slots','deck-slots'])$(id).innerHTML=deckLibrary.slots.map((cards,i)=>{const count=(cards||[]).filter(key=>key!==null&&key!==undefined&&key!=='').length,valid=Array.isArray(cards)&&savedDeckPlayable(i);return`<button class="deck-preset${valid?'':' deck-preset-inactive'}" data-deck-slot="${i}" aria-pressed="${i===deckLibrary.active}" aria-label="Mazo ${i+1}, ${valid?'8 de 8 elegibles':`${count} posiciones guardadas, mazo inválido para partida nueva`}" ${id==='deck-slots'&&!deckEditable?'disabled':''}><svg aria-hidden="true"><use href="#i-deck"/></svg><span>${i+1}</span><small>${valid?'8/8':count?`${count}/8`:'+'}</small></button>`;}).join('');
  if(savedDeckPlayable()){$('deck-selection-notice').hidden=true;clearTimeout(deckNoticeTimer);}
}
for(const id of['menu-deck-slots','deck-slots'])$(id).addEventListener('click',event=>{
  if(!document.body.classList.contains('menu-mode'))return;
  const button=event.target.closest('[data-deck-slot]');if(!button||(!deckEditable&&id==='deck-slots'))return;
  const active=Number(button.dataset.deckSlot);if(!Number.isInteger(active)||active<0||active>=4)return;
  if(!commitDeckLibrary({...deckLibrary,active}))return;
  closeCardActions();clearReplacement();
  if($('deck-dialog').open){renderCollection();if(id==='deck-slots')showDeckTop();}
  $(id).querySelector(`[data-deck-slot="${deckLibrary.active}"]`).focus({preventScroll:true});
});
function syncHand() {
  const signature = [game.catalogVersion,game.ruleset,...game.hands[0],game.queues[0][0]].join(',');
  if (signature !== handSignature) {
    handSignature = signature;
    $('hand').innerHTML = game.hands[0].map((key,i) => cardMarkup(key,i)).join('');
    const key = game.queues[0][0], c = matchCard(key);
    $('next-preview').innerHTML = cardArtMarkup(key);
    $('next-card').setAttribute('aria-label',`Próxima carta: ${c.name}, ${c.cost} de elixir`);
    $('next-name').textContent=c.name;
  }
  for (const el of $('hand').querySelectorAll('[data-card]')) {
    const i = Number(el.dataset.card), c = matchCard(game.hands[0][i]);
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
  const c = matchCard(game.hands[0][selected]);
  live(`${c.name}. ${c.cost} de energía. ${c.spell ? 'Elegí una celda de la arena.' : 'Apuntá en tu lado de la arena.'}`);
}
function cancelSelection() { quickStats.hide(); selected = -1; renderer.pointer = null; renderer.selection = null; updateDetail(); syncHand(); }
function updateUi() {
  $('battle-loading').hidden=!renderer.pendingSpecies.size;
  const dialogs=[...document.querySelectorAll('dialog[open]')],settingsOnly=dialogs.length===1&&dialogs[0].id==='settings-dialog'&&dialogs[0].dataset.resume==='1'&&['playing','paused'].includes(game.state);
  sfx.setBattleState((game.state==='playing'&&!dialogs.length||settingsOnly)&&!document.hidden&&!document.body.classList.contains('menu-mode'),game.overtime||game.time<=60);
  const energy = game.energy[0];
  $('energy-value').textContent = String(Math.floor(energy));
  $('energy-bar').setAttribute('aria-valuenow', energy.toFixed(1));
  [...$('energy-bar').children].forEach((el,i) => el.firstElementChild.style.width = `${Math.max(0,Math.min(1,energy-i))*100}%`);
  battlePhaseUi.update(game,{reduced});
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
  syncHand();
}
function handleEvent(e) {
  renderer.onEvent(e,game); sfx.event(e);
  if(e.type==='burrow'&&e.unit.team===0)live(e.hidden?'Ampharos se oculta.':'Ampharos emerge.');
  if (e.type === 'deploy' && e.team === 0) {
    if (walkthrough?.step === 2) {
      setGuideStep(3); walkthrough.start = game.elapsed;
      game.spawn('snorlax',1,e.x < 300 ? 158 : 442,295,.75);
    }
  }
  if (e.type === 'towerDown') {
    live(e.team === 0 ? 'Destruiste una torre. Ahora podés desplegar más adelante en ese carril.' : 'El rival destruyó una de tus torres.');
    if (!reduced) { $('arena-frame').classList.remove('shake'); void $('arena-frame').offsetWidth; $('arena-frame').classList.add('shake'); }
  }
  if (e.type === 'end') showResult(e);
}
function adoptGame(next){
  quickStats.hide();game=next;game.onEvent=handleEvent;
  selected=-1;handSignature='';renderer.pointer=null;renderer.selection=null;renderer.tutorialSpot=false;
  renderer.particles=[];renderer.effects=[];renderer.numbers=[];renderer.resetVisuals();
  renderer.ensureSpecies([...game.hands[0],...game.queues[0]].map(k=>matchCard(k)?.id).filter(Boolean)).catch(()=>{});
  updateDetail();syncHand();
  if($('card-dialog').open&&inspectedCard&&matchCard(inspectedCard))renderCardInfo(inspectedCard,inspectedSlotIndex);
}
function newGame({ start = false, tutorial = false, preparedCpu = null } = {}) {
  const admitted=preparedCpu?.catalogVersion===4?preparedCpu:c4CpuPreview&&!c4BootError&&!tutorial?checkLocalCpuDeck(deckLibrary,deckLibrary.active):null;
  if(start&&!tutorial&&!(admitted?admitted.ok:hasEligibleSelection(deck))){mainMenu();openDeck();return;}
  const localOptions=admitted?.ok?{deck:admitted.keys,catalogVersion:admitted.catalogVersion,ruleset:admitted.ruleset,cpuDeck:DEFAULT_DECK}:{deck:tutorial||!hasEligibleSelection(deck)?DEFAULT_DECK:eligibleDeckKeys(deck)};
  const next=new Game({...localOptions,difficulty,tutorial,onEvent:handleEvent,animations:renderer.metadata});
  battlePhaseUi.reset();
  deploying=false;deploymentSerial++;
  cancelResultCue();
  resultCueGame=null;
  sfx.resetMusic();
  $('result-overlay').hidden = true; $('pause-overlay').hidden = true; $('guide').hidden = true;
  walkthrough = null;
  adoptGame(next);
  $('enemy-name').textContent = `${{easy:'Principiante',normal:'Entrenador',hard:'Líder de gimnasio'}[difficulty]} · CPU`;
  $('online-status').hidden=true;$('connection-loading').hidden=true;
  document.body.classList.toggle('menu-mode',!start);$('main-menu').hidden=start;
  renderMenuDeck();
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
  const overlay=$('result-overlay'),firstPresentation=overlay.hidden;
  $('pause-overlay').hidden = true; overlay.hidden = false;
  $('result-title').textContent = e.winner === 0 ? 'Victoria' : e.winner === 1 ? 'Derrota' : 'Empate';
  $('result-overlay').dataset.outcome=e.winner===0?'win':e.winner===1?'loss':'draw';
  $('result-overlay').querySelector('.result-crown use').setAttribute('href',e.winner===0?'#i-medal':e.winner===1?'#i-shield':'#i-ball');
  $('result-player').textContent = game.crowns(0); $('result-enemy').textContent = game.crowns(1);
  $('result-reason').textContent = e.reason;
  $('result-deployed').textContent = game.stats[0].deployed;
  $('result-damage').textContent = Math.round(game.stats[0].damage).toLocaleString('es-AR');
  updateUi();
  if(firstPresentation&&resultCueGame!==game){resultCueGame=game;playResultCue(e.winner);}
  live(`${$('result-title').textContent}. ${e.reason}. ${game.crowns(0)} a ${game.crowns(1)}.`);
  $('again-btn').focus({preventScroll:true});
}
function placementActive(){
  return ready&&game?.state==='playing'&&$('loading').hidden&&!document.body.classList.contains('menu-mode')&&!document.querySelector('dialog[open]');
}
function arenaPoint(clientX,clientY) {
  if(!placementActive())return{inside:false};
  const r=canvas.getBoundingClientRect();
  const point=screenToWorld({x:clientX-r.left,y:clientY-r.top},r.width,r.height);
  const hit=document.elementFromPoint(clientX,clientY);
  // The lateral margin may cover bare background, never cards, controls or
  // an overlay on top of the canvas. No extra hit layer changes the layout.
  const lateral=(clientX<r.left||clientX>r.right)&&hit?.matches('html,body,.battle-layout,.battle-stage,#arena-frame');
  return {...point,inside:inPlacementInputArea(point.x,point.y)&&(hit===canvas||lateral)};
}
async function attemptDeploy(point) {
  if(!placementActive()||deploying||selected<0)return;
  const index=selected,key=game.hands[0][index],client=online,isOnline=onlineMode,serial=++deploymentSerial;
  const placement=resolvePlacementInput(game,0,key,point.x,point.y);
  if(!placement){cancelSelection();return;}
  deploying=true;cancelSelection();
  try{
    const result=isOnline?await client.send({kind:'deploy',handIndex:index,key,x:client.team?W-placement.x:placement.x,y:client.team?H-placement.y:placement.y}):game.deploy(0,index,placement.x,placement.y);
    if(serial!==deploymentSerial||isOnline&&client!==online)return;
    if(!result?.ok){toast(result?.reason||'No se pudo colocar la carta.');tone(150,.12,'triangle',.02);return;}
    live(`${matchCard(result.key).name} desplegado. ${Math.floor(game.energy[0])} de energía.`);updateUi();
  }catch(error){toast(error.message||'No se pudo colocar la carta.');}
  finally{if(serial===deploymentSerial){deploying=false;syncHand();}}
}
function togglePause() {
  quickStats.hide();
  if(onlineMode)return;
  if(document.querySelector('dialog[open]'))return;
  if(game.state==='playing'){cancelSelection();game.pause();$('pause-overlay').hidden=false;$('resume-btn').focus({preventScroll:true});live('Partida en pausa.');}
  else if(game.state==='paused'){game.resume();$('pause-overlay').hidden=true;canvas.focus({preventScroll:true});live('Partida reanudada.');}
  updateUi();
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
  if(id==='settings-dialog'){$('difficulty-hint').hidden=document.body.classList.contains('menu-mode');drag=null;}
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
  const keys=Object.keys(CARDS).filter(k=>{const c=editorCard(k),text=`${c.name} ${editorCardRole(c,cardEquivalentLabel(k))} ${c.role} ${c.move}`.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');return !c.token&&editorSelectable(k)&&(!rarity||c.rarity===rarity)&&(!role||(role==='spell'?c.spell:role==='structure'?c.structure:role==='building'?c.building:role==='summon'?c.summon||c.deathSpawn:!c.spell&&!c.structure))&&text.includes(term);});
  const byName=(a,b)=>CARDS[a].name.localeCompare(CARDS[b].name,'es');
  if(order==='elixir-asc')keys.sort((a,b)=>editorCard(a).cost-editorCard(b).cost||byName(a,b));
  else if(order==='elixir-desc')keys.sort((a,b)=>editorCard(b).cost-editorCard(a).cost||byName(a,b));
  else if(order==='name')keys.sort(byName);
  $('collection').innerHTML=keys.map(k=>`<div class="collection-entry">${cardMarkup(k,0,'collection')}</div>`).join('')||'<div class="collection-empty"><svg aria-hidden="true"><use href="#i-search"/></svg><p role="status">No hay cartas con esos filtros.</p><button class="secondary-btn" data-reset-filters>Ver todas las cartas</button></div>';
  for(const el of $('collection').querySelectorAll('[data-collection]')){const key=el.dataset.collection,c=editorCard(key),equivalent=editorCardRole(c,cardEquivalentLabel(key)),included=editorIncludedIndex(key)>=0,eligible=editorSelectable(key);el.classList.toggle('selected',included);el.classList.toggle('selection-inactive',!eligible);el.setAttribute('aria-label',`${c.name}, ${c.cost} de elixir${equivalent?`, ${equivalent}`:''}${c.count>1?`, ${c.count} unidades`:''}${included?', en mazo':''}${eligible?'':', no disponible para mazos nuevos'}, acciones de la carta`);}
  $('collection-filters-btn').classList.toggle('has-filters',!!term||!!rarity||!!role||order!=='elixir-asc');
  const priced=deckDraft.flatMap((raw,index)=>{const key=cardForSavedKey(raw);return key&&editorSlotSelectable(raw,index)?[editorCard(key,index)]:[];});$('deck-average').textContent=priced.length?(priced.reduce((a,c)=>a+c.cost,0)/priced.length).toFixed(1).replace('.',','):'—';
  $('save-deck-btn').disabled=false;
  restoreFocus(reference);
}
function renderDeckStrip(){
  $('deck-strip').innerHTML=Array.from({length:8},(_,i)=>{
    const savedKey=deckDraft[i],key=cardForSavedKey(savedKey),c=key&&displayCard(key);
    if(savedKey===null||savedKey===undefined||savedKey==='')return`<span class="deck-slot empty" aria-label="Espacio ${i+1} vacío">+</span>`;
    if(!c)return`<button class="deck-slot empty selection-inactive" data-legacy-slot="${i}" aria-label="Espacio ${i+1}, ${savedKey==='blastoise'?'Blastoise, ':''}carta histórica no disponible; quitar o reemplazar">${savedKey==='blastoise'?'Blastoise':'!'}</button>`;
    return cardMarkup(key,i,'deck-info',savedKey);
  }).join('');
}
$('deck-strip').addEventListener('click',e=>{const el=e.target.closest('[data-deck-info],[data-legacy-slot]');if(!el)return;const index=Number(el.dataset.deckIndex??el.dataset.legacySlot);if(replacementKey){if(!editDeckSlot(index,replacementKey))return;clearReplacement();renderCollection();$('deck-strip').querySelector(`[data-deck-index="${index}"]`)?.focus({preventScroll:true});return;}const key=el.dataset.deckInfo||cardForSavedKey(deckDraft[index]);if(key)openCardActions(key,el,index);else openUnavailableSlotActions(index,el);});
$('menu-deck-preview').addEventListener('click',e=>{if(!document.body.classList.contains('menu-mode'))return;if(e.target.closest('[data-menu-empty]')){openDeck();return;}const el=e.target.closest('[data-menu-card]');if(el){deckEditable=true;deckDraft=editorDeck(deck);renderCardInfo(el.dataset.menuCard,Number(el.dataset.menuIndex));openModal('card-dialog');}});
function openDeck() {
  if(!document.body.classList.contains('menu-mode'))return;
  deckEditable=true;deckDraft=editorDeck(deckLibrary.slots[deckLibrary.active]??deck);
  clearReplacement();renderDeckSlots();renderCollection();openModal('deck-dialog');showDeckTop();
  const notice=$('deck-selection-notice');clearTimeout(deckNoticeTimer);notice.hidden=savedDeckPlayable();
  if(!notice.hidden){notice.textContent='Revisá los espacios vacíos y las cartas no disponibles.';deckNoticeTimer=setTimeout(()=>{notice.hidden=true;},3500);}
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
  reference?.element?.setAttribute('aria-expanded','false');cardActionKey=null;cardActionSlot=null;cardActionReference=null;if(restore)restoreFocus(reference);
}
function closeEditorPopovers(){closeCardActions();if($('collection-filters').matches(':popover-open'))$('collection-filters').hidePopover();}
function openCardActions(key,anchor,slotIndex=null){
  closeCardActions();cardActionKey=key;cardActionSlot=slotIndex;cardActionReference=focusReference(anchor);anchor.setAttribute('aria-expanded','true');
  const selectedIndex=slotIndex??editorIncludedIndex(key),eligible=editorSelectable(key);
  $('card-actions').setAttribute('aria-label',`Acciones de ${displayCard(key).name}`);$('card-action-info').disabled=false;$('card-action-toggle').textContent=selectedIndex>=0?'Quitar':eligible?'Usar':'No disponible';$('card-action-toggle').disabled=selectedIndex<0&&!eligible;
  $('card-actions').showPopover({source:anchor});positionEditorPopover($('card-actions'),anchor);$('card-action-info').focus({preventScroll:true});
}
function openUnavailableSlotActions(index,anchor){
  closeCardActions();cardActionKey=null;cardActionSlot=index;cardActionReference=focusReference(anchor);anchor.setAttribute('aria-expanded','true');
  $('card-actions').setAttribute('aria-label',`Carta histórica no disponible, espacio ${index+1}`);$('card-action-info').disabled=true;$('card-action-toggle').textContent='Quitar';$('card-action-toggle').disabled=false;
  $('card-actions').showPopover({source:anchor});positionEditorPopover($('card-actions'),anchor);$('card-action-toggle').focus({preventScroll:true});
}
$('card-actions').addEventListener('toggle',event=>{if(event.newState==='closed')cardActionReference?.element?.setAttribute('aria-expanded','false');});
$('card-action-info').addEventListener('click',()=>{const key=cardActionKey,slotIndex=cardActionSlot;if(!key)return;closeCardActions(true);renderCardInfo(key,slotIndex);openModal('card-dialog');});
$('card-action-toggle').addEventListener('click',()=>{
  const key=cardActionKey,slotIndex=cardActionSlot;
  if(slotIndex!==null){if(toggleDeckCard(key,slotIndex)===true)closeCardActions();return;}
  if(!key)return;const changed=toggleDeckCard(key);if(changed===null)return;closeCardActions();
  if(changed)return;
  if(!editorSelectable(key))return;
  replacementKey=key;$('deck-dialog').classList.add('replacing-card');$('deck-replace-hint').hidden=false;$('deck-scroll').scrollTop=0;$('deck-strip').querySelector('button')?.focus({preventScroll:true});
});
$('cancel-replace-btn').addEventListener('click',clearReplacement);
$('deck-scroll').addEventListener('scroll',()=>{
  const anchor=cardActionReference?.element;if(!$('card-actions').matches(':popover-open')||!anchor?.isConnected)return;
  const a=anchor.getBoundingClientRect(),pane=$('deck-scroll').getBoundingClientRect();
  if(a.bottom<=pane.top||a.top>=pane.bottom){closeCardActions();return;}
  cardActionReference.deckScroll=$('deck-scroll').scrollTop;positionEditorPopover($('card-actions'),anchor);
},{passive:true});
function toggleDeckCard(key,slotIndex=null){
  if(!deckEditable||!document.body.classList.contains('menu-mode'))return false;
  if(slotIndex!==null){if(slotIndex<0||slotIndex>=8||deckDraft[slotIndex]===null)return false;if(!editDeckSlot(slotIndex,null))return null;renderCollection();return true;}
  if(!editorSelectable(key))return false;
  const existing=editorIncludedIndex(key),empty=deckDraft.findIndex(saved=>saved===null||saved===undefined||saved==='');
  if(existing<0&&empty<0)return false;
  if(!editDeckSlot(existing>=0?existing:empty,existing>=0?null:key,existing>=0?'replace':'collection'))return null;
  renderCollection();return true;
}
function renderCardInfo(key,slotIndex=null){
  const inMenu=document.body.classList.contains('menu-mode'),c=inMenu?editorCard(key,slotIndex):matchCard(key);inspectedCard=key;inspectedSlotIndex=slotIndex;
  const converted=arenaCollectionProfile(key),choice=inMenu&&slotIndex!==null&&(converted||c4EditorPreview&&key==='arcanine')?savedSlotProfile(deckLibrary,deckLibrary.active,slotIndex):null;
  const presentation=choice?(converted?{label:choice.kind==='profile'?editorCard(key).role:'Versión anterior',action:choice.kind==='profile'?'✓ Eevee de 2 elixires':'Cambiar a Eevee de 2 elixires',selected:choice.kind==='profile'}:conversionPresentation(editorCardRole(editorCard(key),cardEquivalentLabel(key)),choice.kind==='hog')):null;
  audioInit();
  $('card-info-name').textContent=c.name;$('card-info-type').textContent=`${c.label} · ${RARITIES[c.rarity]}`;$('card-info-role').textContent=presentation?.label||editorCardRole(c,cardEquivalentLabel(key))||c.move||c.name;$('card-info-cost').textContent=c.cost;
  $('card-info-art').innerHTML=displayArt(key);$('card-dialog').dataset.rarity=c.rarity;
  $('card-info-art').style.setProperty('--card-tint',c.color);
  $('card-info-move').textContent=c.move||c.name;$('card-info-description').textContent=c.description;
  const number=value=>Number(value).toLocaleString('es-AR',{maximumFractionDigits:1});
  const seconds=value=>`${Number(value).toLocaleString('es-AR',{maximumFractionDigits:2})} s`,tiles=value=>`${number(value/TILE)} casillas`;
  const targets=c.spawnOnImpact||c.summon&&c.passive?'Invoca tropas':c.passive?'Contraataca':c.building?'Estructuras':c.rolling||c.groundOnly?'Tierra':c.spell||c.air||c.squad?'Tierra y aire':'Tierra';
  const stats=[],extraStats=[],traits=[];
  if(c.hp)stats.push(['Puntos de vida',number(c.hp),'heart']);
  const impacts=c.waves||c.bolts||c.burst||1;
  if(c.fieldPulseDamage)stats.push(['Daño por pulso',number(c.fieldPulseDamage),'damage']);
  else if(c.fieldDamage)stats.push(['Daño por segundo',number(c.fieldDamage),'dps']);
  else if(c.damage>0)stats.push([c.waves>1?'Daño total':c.bolts>1?'Daño de los rayos':c.burst>1?'Daño por ráfaga':'Daño por golpe',impacts>1?`${number(c.damage)} × ${impacts}`:number(c.damage),'damage']);
  if(!c.spell&&c.interval&&!c.passive){
    stats.push(['Daño por segundo',number(c.damage*impacts/c.interval),'dps']);
    stats.push(['Ataque cada',seconds(c.interval),'attack-speed']);
  }
  if(c.spell&&c.towerDamage)stats.push(['Daño a torres',c.waves>1?`${number(c.towerDamage)} × ${c.waves}`:number(c.towerDamage),'tower']);
  stats.push(['Objetivos',targets,'target']);
  if(c.speed!==undefined)stats.push(['Movimiento',c.structure||c.speed===0?'Inmóvil':c.speed<=21.6?'Lento':c.speed<=28.8?'Medio':c.speed<=43.2?'Rápido':'Muy rápido','move']);
  if(c.range&&!c.passive)stats.push(['Alcance',tiles(c.range),'range']);
  if(c.spell)stats.push([c.rolling?'Recorrido':'Radio',tiles(c.rolling?c.travelDistance:c.splash),'range']);
  stats.push([c.travelSpeed&&!c.rolling?'Lanzamiento':'Despliegue',seconds(c.spell?(c.rolling?0:c.castDelay??.4):c.deployTime??.75),'deploy']);
  if(c.count>1)traits.push(['Unidades',`×${c.count}`,'units']);
  if(c.spawnKey)stats.push(['Invocaciones',`${c.spawnTotal} ${infoCard(c.spawnKey).name}`,'units']);
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
  if(c.windup&&!c.passive)extraStats.push(['Preparación',seconds(c.windup),'attack-speed']);
  if(c.dash){extraStats.push(['Daño de embestida',number(c.dashDamage??c.damage*c.dashMultiplier),'damage'],['Prepara embestida',seconds(c.dashWindup),'attack-speed'],['Distancia de embestida',`${number(c.dashMin/TILE)}–${number(c.dashMax/TILE)} casillas`,'range']);}
  if(c.deathDamage)extraStats.push(['Daño al caer',number(c.deathDamage),'damage'],['Radio al caer',tiles(c.deathRadius),'range']);
  if(c.jumpRange)extraStats.push(['Distancia de salto',tiles(c.jumpRange),'range']);
  if(c.summonSpacing)extraStats.push(['Entre refuerzos',seconds(c.summonSpacing),'attack-speed']);
  if(c.lifesteal)extraStats.push(['Curación por golpe',number(c.lifesteal),'heart']);
  if(c.summon)stats.push([c.summonRequiresEnemy?'Invoca con rivales':'Invocación',`${c.summonCount||1} ${infoCard(c.summon).name} / ${seconds(c.summonEvery)}`,'units']);
  if(c.deathSpawn)extraStats.push(['Al caer',`${c.deathCount||1} ${infoCard(c.deathSpawn).name}`,'units']);
  if(c.targetLimit)extraStats.push(['Objetivos máximos',c.targetLimit,'target']);
  if(c.airMultiplier)extraStats.push(['Daño a voladores',`${number(c.fieldDamage*c.airMultiplier)} / s`,'damage']);
  if(c.fieldBuildingDamage||c.buildingMultiplier)extraStats.push(['Daño a estructuras',`${number(c.fieldBuildingDamage||c.fieldDamage*c.buildingMultiplier)} / s`,'damage']);
  if(c.heal)extraStats.push(['Curación',`${number(c.heal)} / ${seconds(c.healEvery)}`,'heart']);
  if(c.reflect)extraStats.push(['Daño reflejado',`${Math.round(c.reflect*100)} %`,'shield']);
  if(c.armor)extraStats.push(['Reducción de daño',`${Math.round(c.armor*100)} %`,'shield']);
  if(c.squad){
    const bodies=[...new Set(c.squad)].map(infoCard);
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
  $('card-stats-unit').textContent=c.squad?[...new Set(c.squad)].map(k=>infoCard(k).name).join(' / '):c.count>1?'Por unidad':'';
  $('card-extra-stats').innerHTML=statMarkup(extraStats);
  $('card-more-stats').hidden=!extraStats.length;
  if($('card-dialog').open===false)$('card-more-stats').open=false;
  const included=slotIndex!==null||editorIncludedIndex(key)>=0,eligible=editorSelectable(key);$('card-info-toggle').textContent=included?'Quitar del mazo':eligible?'Usar':'No disponible';
  $('card-info-toggle').disabled=!deckEditable||(!included&&!eligible);
  {const accept=$('card-info-accept');accept.hidden=!presentation;accept.textContent=presentation?.action||'';accept.disabled=!deckEditable||presentation?.selected;accept.classList.toggle('profile-selected',presentation?.selected===true);accept.setAttribute('aria-label',presentation?.selected?`${presentation.label}, versión actual`:presentation?.action||'');accept.parentElement.classList.toggle('profile-choices',!!presentation);}
}
$('collection').addEventListener('click',e=>{
  if(e.target.closest('[data-reset-filters]')){resetCollectionFilters();return;}
  const el=e.target.closest('[data-collection]');if(el)openCardActions(el.dataset.collection,el);
});
$('card-info-toggle').addEventListener('click',()=>{if(inspectedCard){const changed=toggleDeckCard(inspectedCard,inspectedSlotIndex);if(changed===null)return;if(!changed&&editorSelectable(inspectedCard)){closeModal($('card-dialog'),false);if(!$('deck-dialog').open)openDeck();replacementKey=inspectedCard;$('deck-dialog').classList.add('replacing-card');$('deck-replace-hint').hidden=false;}else if(changed)closeModal($('card-dialog'),false);}});
$('card-info-accept').addEventListener('click',()=>{if(inspectedSlotIndex===null||!(arenaCollectionProfile(inspectedCard)||c4EditorPreview&&inspectedCard==='arcanine'))return;if(editDeckSlot(inspectedSlotIndex,inspectedCard,'accept')){renderCollection();renderCardInfo(inspectedCard,inspectedSlotIndex);}});
$('save-deck-btn').addEventListener('click',()=>closeModal($('deck-dialog')));

$('hand').addEventListener('click',e=>{const el=e.target.closest('[data-card]');if(el&&!quickStats.isHoldClick(e)&&performance.now()>ignoreClickUntil)choose(Number(el.dataset.card));});
$('hand').addEventListener('pointerdown',e=>{const el=e.target.closest('[data-card]');if(!el||e.button!==0)return;drag={index:Number(el.dataset.card),x:e.clientX,y:e.clientY,active:false};});
document.addEventListener('pointermove',e=>{
  if(!drag){
    if(e.pointerType!=='touch'&&selected>=0){const p=arenaPoint(e.clientX,e.clientY);renderer.pointer=p.inside?p:null;}
    return;
  }
  if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>7){drag.active=true;choose(drag.index);}
  if(drag.active){const p=arenaPoint(e.clientX,e.clientY);renderer.pointer=p.inside?p:null;e.preventDefault();}
},{passive:false});
document.addEventListener('pointerup',e=>{
  if(!drag)return;
  if(drag.active){ignoreClickUntil=performance.now()+350;const p=arenaPoint(e.clientX,e.clientY);if(p.inside)attemptDeploy(p);else cancelSelection();renderer.pointer=null;}
  drag=null;
});
document.addEventListener('pointercancel',()=>{cancelSelection();drag=null;renderer.pointer=null;});
document.addEventListener('pointerout',e=>{if(!e.relatedTarget)renderer.pointer=null;});
document.addEventListener('pointerdown',e=>{
  if(e.button!==0||drag?.active)return;
  const p=arenaPoint(e.clientX,e.clientY);
  if(!p.inside){if(e.target===canvas)cancelSelection();return;}
  audioInit();canvas.focus({preventScroll:true});attemptDeploy(p);
});
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
      const point=resolvePlacementInput(game,0,game.hands[0][selected],renderer.pointer.x,renderer.pointer.y);
      live(point?`Posición ${Math.round(point.x)}, ${Math.round(point.y)}.`:'Zona no disponible.');
    }else if(e.key==='Enter'&&renderer.pointer){e.preventDefault();attemptDeploy(renderer.pointer);}
  }
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)sfx.setBattleState(false);else{sfx.recover();online?.reconnectIfStale();updateUi();}if(document.hidden&&game.state==='playing'&&!onlineMode){game.pause();$('pause-overlay').hidden=false;}});
addEventListener('online',()=>online?.reconnectIfStale());
addEventListener('pagehide',()=>online?.suspend());
addEventListener('pageshow',event=>{if(game){sfx.recover();updateUi();}if(event.persisted&&onlineMode&&game.state!=='ended')online?.resume();});
addEventListener('focus',()=>sfx.recover());
for(const event of['pointerdown','keydown'])document.addEventListener(event,()=>{if(sfx.ctx)sfx.unlock(true);},{capture:true,passive:true});

function cancelCpuStart(){
  if(!cpuStarting)return;
  cpuStartSerial++;cpuStarting=false;cpuWaitEnd?.();cpuWaitEnd=null;updateMenuAvailability();
}
async function startCpuGame({tutorial=false}={}){
  if(tutorial)cancelCpuStart();
  if(cpuStarting||!ready||onlineMode&&game.state!=='ended')return;
  const selectedIndex=deckLibrary.active,selected=tutorial?null:cpuDeckSelection();
  if(!tutorial&&!selected.ok){openDeck();return;}
  if(selected?.catalogVersion===4){
    const serial=++cpuStartSerial,originGame=game,inMenu=document.body.classList.contains('menu-mode'),controls=inMenu?$('ready-overlay'):$('again-btn').parentElement,progress=$('menu-load-progress');
    const currentEntry=()=>serial===cpuStartSerial&&game===originGame&&!onlineMode&&document.body.classList.contains('menu-mode')===inMenu&&!document.querySelector('dialog[open]')&&!(online?.active&&['search','resume','cancelling'].includes(online.mode));
    let wait=inMenu?$('menu-loading'):$('cpu-start-loading');
    if(!wait){wait=document.createElement('span');wait.id='cpu-start-loading';wait.className='battle-loading';wait.setAttribute('role','status');wait.setAttribute('aria-label','Preparando la batalla');wait.innerHTML='<span class="pokeball-loader is-indeterminate" aria-hidden="true"><svg viewBox="0 0 64 64" class="loading-ball"><use href="#i-loading-ball"/></svg></span>';$('result-overlay').append(wait);}
    cpuStarting=true;controls.inert=true;controls.setAttribute('aria-busy','true');wait.hidden=false;
    if(inMenu){progress.classList.add('is-indeterminate');progress.removeAttribute('aria-valuenow');progress.setAttribute('aria-label','Preparando la batalla');}
    cpuWaitEnd=()=>{controls.inert=false;controls.setAttribute('aria-busy','false');wait.hidden=true;if(inMenu){progress.classList.remove('is-indeterminate');progress.setAttribute('aria-valuenow','100');progress.setAttribute('aria-label','Cargando el juego');}};
    updateMenuAvailability();audioInit();
    try{
      await prepareC4Catalog();
      if(!currentEntry())return;
      await renderer.ensureSpecies(selected.keys.map(key=>getC4BaseCard(key)?.id).filter(Boolean));
      if(!currentEntry())return;
      const latest=loadDeckLibrary(),current=checkCpuDeck(latest,latest.active,{forceC4:c4CpuPreview}),liveChoice=cpuDeckSelection();
      const sameChoice=choice=>choice.ok&&choice.catalogVersion===4&&choice.ruleset===selected.ruleset&&choice.arenaProfileProducer===selected.arenaProfileProducer&&choice.keys.length===selected.keys.length&&choice.keys.every((key,index)=>key===selected.keys[index]);
      if(deckLibrary.active!==selectedIndex||latest.active!==selectedIndex||!sameChoice(current)||!sameChoice(liveChoice)){
        deckLibrary=latest;deckDraft=editorDeck(latest.slots[latest.active]);applyDeckChanges({persist:false});toast('El mazo cambió. Revisalo antes de jugar.');return;
      }
      online?.close();onlineMode=false;newGame({start:true,preparedCpu:current});
    }catch(error){if(serial===cpuStartSerial)toast('No se pudo preparar la batalla. Reintentá.');}
    finally{if(serial===cpuStartSerial){cpuStarting=false;cpuWaitEnd?.();cpuWaitEnd=null;updateMenuAvailability();}}
    return;
  }
  online?.close();onlineMode=false;newGame({start:true,tutorial});
}
$('start-btn').addEventListener('click',()=>startCpuGame());
$('practice-btn').addEventListener('click',()=>startCpuGame({tutorial:true}));
$('skip-guide').addEventListener('click',finishGuide);
$('again-btn').addEventListener('click',()=>{if(onlineMode)beginOnline();else startCpuGame();});
$('result-menu-btn').addEventListener('click',mainMenu);
$('menu-deck-btn').addEventListener('click',openDeck);
function mainMenu(){if(online?.service.id==='c4'&&online.c4Attempt&&(!onlineMode||game.state==='ended')){closingOnline=online.close();return;}if(online?.active&&(online.mode==='resume'||onlineMode&&game.state!=='ended'))return;cancelCpuStart();const searching=!$('search-panel').hidden;closingOnline=online?.close()||Promise.resolve();online=null;onlineMode=false;$('search-panel').hidden=true;$('ready-overlay').inert=false;for(const dialog of document.querySelectorAll('dialog[open]'))closeModal(dialog,false);newGame();canvas.blur();if(searching)$('online-btn').focus({preventScroll:true});}
function requestHome(event){
  event?.preventDefault();
  if(online?.active&&(online.mode==='resume'&&!online.c4Attempt||onlineMode&&game.state!=='ended'))return;
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
$('battle-settings-btn').addEventListener('click',()=>openModal('settings-dialog'));
$('pause-settings-btn').addEventListener('click',()=>openModal('settings-dialog'));
$('settings-credits-btn').addEventListener('click',()=>openModal('credits-dialog'));
$('help-practice-btn').addEventListener('click',()=>{if(!document.body.classList.contains('menu-mode'))return;closeModal($('help-dialog'),false);startCpuGame({tutorial:true});});
$('sound-btn').addEventListener('click',()=>{sound=!sound;updateSound();audioInit();if(sound)tone(580,.13,'sine',.05);});
$('sound-setting').addEventListener('change',e=>{sound=e.target.checked;updateSound();audioInit();});
for(const group of ['music','voices','effects']){const slider=$(group+'-volume'),output=$(group+'-volume-value');const update=()=>{const value=Number(slider.value);output.value=value+'%';slider.setAttribute('aria-valuetext',value+'%');};slider.value=sfx.levels[group];update();slider.addEventListener('input',()=>{sfx.setLevel(group,Number(slider.value));store.set(group+'-volume',sfx.levels[group]);update();});}
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
function showSearch(){if(!$('search-panel').hidden)return;$('menu-loading').hidden=true;$('search-panel').hidden=false;$('ready-overlay').inert=true;$('cancel-search').focus({preventScroll:true});}
function createOnlineClient({legacy=false}={}){
  const c4=c4RecoveryEndpoint&&!legacy;
  let resetC4Presentation=false,client;
  return client=new OnlineClient({...(c4?{serverUrl:c4RecoveryEndpoint,service:C4_SERVICE,prepareSnapshot:packet=>prepareC4Packet(packet,{viewTeam:packet.team,animations:renderer.metadata}),onPresentation:packet=>{
    if(ready){document.body.classList.remove('menu-mode');$('main-menu').hidden=true;$('menu-loading').hidden=true;$('ready-overlay').inert=false;}
    $('search-panel').hidden=true;
    if(resetC4Presentation)adoptGame(game);
    for(const entry of packet.events)handleEvent(entry.event);
    if(game.state==='ended'&&$('result-overlay').hidden)showResult({winner:game.winner,reason:game.reason});
    $('online-status').hidden=packet.startsIn<=0;$('online-status').textContent=packet.startsIn>0?'Preparados':'';updateUi();
  }}:{}),onSearch:ms=>{const sec=Math.floor(ms/1000);$('search-time').textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;if(ready)showSearch();},onConnection:status=>{
    if(c4&&online!==client)return;
    const reconnecting=status==='Reconectando…';$('connection-loading').hidden=!onlineMode||!reconnecting;$('online-status').hidden=!onlineMode||!status||reconnecting;$('online-status').textContent=reconnecting?'':status;
    if(!onlineMode)$('search-status').textContent=status||'Buscando rival…';
  },onIdle:message=>{
    if(c4&&online!==client)return;
    online=null;onlineMode=false;$('menu-loading').hidden=ready;$('ready-overlay').inert=false;$('search-panel').hidden=true;newGame();if(message)toast(message);if(c4&&ready)($('online-btn').disabled?$('menu-deck-btn'):$('online-btn')).focus({preventScroll:true});
  },onSnapshot:packet=>{
    if(c4){
      const next=packet.preparedGame;resetC4Presentation=!onlineMode||game.ruleset!==next.ruleset||game.catalogVersion!==next.catalogVersion;
      game=next;game.onEvent=handleEvent;onlineMode=true;$('enemy-name').textContent=packet.opponent;return;
    }
    const next=packet.preparedGame||unpackGame(perspective(packet.game,packet.team),handleEvent,renderer.metadata),events=packet.eventsPrepared?packet.events:packet.events.map(entry=>({...entry,event:perspective(entry.event,packet.team)}));
    const reset=!onlineMode||game.ruleset!==next.ruleset||game.catalogVersion!==next.catalogVersion;
    online.team=packet.team;onlineMode=true;$('enemy-name').textContent=packet.opponent;
    if(ready){document.body.classList.remove('menu-mode');$('main-menu').hidden=true;$('menu-loading').hidden=true;$('ready-overlay').inert=false;}
    $('search-panel').hidden=true;
    if(reset)adoptGame(next);else game=next;
    for(const entry of events)handleEvent(entry.event);
    if(game.state==='ended'&&$('result-overlay').hidden)showResult({winner:game.winner,reason:game.reason});
    $('online-status').hidden=packet.startsIn<=0;$('online-status').textContent=packet.startsIn>0?'Preparados':'';updateUi();
  }});
}
async function beginOnline(){
  const candidate=c4WireEndpoint?c4SelectionFromLibrary(deckLibrary,deckLibrary.active):null;
  if(c4BootError||!(candidate?candidate.ok:hasEligibleSelection(deck))||onlineMode&&game.state!=='ended')return;
  cancelCpuStart();
  await closingOnline;await online?.close();onlineMode=false;newGame();audioInit();showSearch();$('search-status').textContent='Buscando rival…';$('search-time').textContent='0:00';
  online=createOnlineClient({legacy:!c4WireEndpoint});
  try{await online.start($('trainer-name').value||'Entrenador',candidate?candidate.deck:eligibleDeckKeys(deck),candidate?.selection);}catch(error){$('search-status').textContent=error.message;}
}
if(c4CpuPreview)try{await prepareC4Catalog();if(c4WireEndpoint)await prepareC4Transport();}catch(error){c4BootError=error;}
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
  const audioActive=!document.hidden&&!document.body.classList.contains('menu-mode')&&(!onlineMode||!!online?.connected);
  sfx.updateKnight(game,audioActive);sfx.updateWalk(game,audioActive);
  if(!document.body.classList.contains('menu-mode')){const perfStart=onlineMode&&onlinePerf.active?performance.now():0;renderer.draw(game,game.state==='paused'?0:dt);if(perfStart)onlinePerf.frame(perfStart,renderer);}
  if(now-lastUi>80){lastUi=now;updateUi();}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
$('retry-load').addEventListener('click',()=>location.reload());
try{
  if(c4BootError)throw c4BootError;
  const savedC4=c4RecoveryEndpoint&&(hasPendingC4Search()||(()=>{try{return !!sessionStorage.getItem(C4_SERVICE.keys.token);}catch{return false;}})());
  if(savedC4||hasSavedOnlineSession()){
    $('ready-overlay').inert=true;online=createOnlineClient({legacy:!savedC4});if(savedC4)await online.resume();else online.resume().catch(()=>{});
  }
  await loadUiResources(progress=>renderer.load((c4CpuPreview&&checkLocalCpuDeck(deckLibrary,deckLibrary.active).keys)||eligibleDeckKeys(deck)||DEFAULT_DECK,progress),(loaded,total)=>{const progress=loaded/total,indicator=$('menu-load-progress');indicator.setAttribute('aria-valuenow',String(Math.floor(progress*100)));$('menu-load-fill').setAttribute('y',String(64*(1-progress)));$('menu-load-fill').setAttribute('height',String(64*progress));});
  ready=true;$('loading').hidden=true;$('ready-overlay').setAttribute('aria-busy','false');$('practice-btn').disabled=false;updateMenuAvailability();
  if(onlineMode){document.body.classList.remove('menu-mode');$('main-menu').hidden=true;$('menu-loading').hidden=true;$('ready-overlay').inert=false;}
  else if(online?.active&&(online.mode==='search'||online.mode==='cancelling'))showSearch();
  else if(online?.active){$('menu-load-progress').classList.add('is-indeterminate');$('menu-load-progress').setAttribute('aria-label','Reconectando a la partida');$('menu-load-progress').removeAttribute('aria-valuenow');}
  else{$('menu-loading').hidden=true;$('ready-overlay').inert=false;}
}catch(error){
  console.error(error);$('menu-loading-badge').hidden=true;$('menu-load-error').hidden=false;$('menu-loading').classList.add('load-failed');$('ready-overlay').setAttribute('aria-busy','false');
}
