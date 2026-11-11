import { Game, CARDS, DEFAULT_DECK, W, H } from './engine.js';
import { Renderer } from './render.js';

const $ = id => document.getElementById(id);
const canvas = $('arena');
const renderer = new Renderer(canvas);
const store = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem(`poke-arena:${key}`)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(`poke-arena:${key}`, JSON.stringify(value)); } catch { /* Storage can be disabled in private browsing. */ } },
};
const storedDeck = store.get('deck', DEFAULT_DECK);
let deck = Array.isArray(storedDeck) && storedDeck.length === 8 && new Set(storedDeck).size === 8 && storedDeck.every(k => CARDS[k]) ? storedDeck : [...DEFAULT_DECK];
const storedDifficulty = store.get('difficulty', 'normal');
let difficulty = ['easy', 'normal', 'hard'].includes(storedDifficulty) ? storedDifficulty : 'normal';
let sound = store.get('sound', false) === true;
let reduced = store.get('reduced', matchMedia('(prefers-reduced-motion: reduce)').matches) === true;
const savedRecord = store.get('record', { wins: 0, losses: 0 });
let record = { wins: Math.max(0, Number(savedRecord?.wins) || 0), losses: Math.max(0, Number(savedRecord?.losses) || 0) };
let game, selected = -1, handSignature = '', ready = false, walkthrough = null, deckDraft = [], deckEditable = true;
let toastTimer, announcementTimer, lastUi = 0, drag = null, ignoreClickUntil = 0;
let audio;

function audioInit() {
  if (!sound) return;
  try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch { /* Audio is optional. */ }
}
function tone(freq = 440, duration = .08, wave = 'sine', volume = .035, slide = 0) {
  if (!sound || !audio || audio.state !== 'running') return;
  const o = audio.createOscillator(), gain = audio.createGain();
  o.type = wave; o.frequency.setValueAtTime(freq, audio.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), audio.currentTime + duration);
  gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
  o.connect(gain); gain.connect(audio.destination); o.start(); o.stop(audio.currentTime + duration);
}
function soundEffect(type) {
  if (type === 'deploy') tone(530,.16,'sine',.05,310);
  if (type === 'hit' && Math.random() < .12) tone(180,.035,'triangle',.012,80);
  if (type === 'towerDown') { tone(120,.4,'sawtooth',.025,-60); setTimeout(() => tone(220,.25,'triangle',.04),120); }
  if (type === 'spellHit') tone(700,.27,'triangle',.035,-500);
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
function announce(message, duration = 1800) {
  const el = $('arena-announcement'); el.textContent = message; el.classList.add('show');
  clearTimeout(announcementTimer); announcementTimer = setTimeout(() => el.classList.remove('show'), duration);
}
function toast(message) {
  $('toast').textContent = message; $('toast').classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2400);
}
function live(message) { $('live-status').textContent = message; }

function spellIcon(key) {
  if (key === 'thunder') return '<svg class="spell-image" viewBox="0 0 80 80" aria-hidden="true"><path d="M44 4 16 45h20l-6 31 34-44H43l9-28Z" fill="#e8c66c" stroke="#fff0b3" stroke-width="2"/><path d="m19 12-4 6m47 33 5 5M9 45H4m57-33 4-5" stroke="#d0b764" stroke-width="3" stroke-linecap="round"/></svg>';
  return '<svg class="spell-image" viewBox="0 0 80 80" aria-hidden="true"><path d="M67 6c-8 22 8 22-4 43C49 76 17 78 10 57 2 34 31 28 34 10c8 8 6 18 6 18C46 20 54 21 67 6Z" fill="#dd8951" stroke="#eab06b" stroke-width="2"/><path d="M42 37c9 8 14 16 6 25-8 9-23 8-27-2-4-11 10-14 12-27 4 5 3 12 3 12l6-8Z" fill="#f4d183"/><path d="m60 11 6-6m4 19 6-6M20 15l-4 8" stroke="#ebbd75" stroke-width="3" stroke-linecap="round"/></svg>';
}
function cardMarkup(key, index, collection = false) {
  const c = CARDS[key];
  return `<button class="pokemon-card type-${c.type}" data-${collection ? 'collection' : 'card'}="${collection ? key : index}" aria-label="${c.name}, ${c.cost} de energía, ${c.role}" aria-pressed="false"><span class="card-cost">${c.cost}</span>${!collection ? `<span class="card-key">${index + 1}</span>` : ''}${c.id ? `<img class="card-image" src="assets/pokemon/${c.id}/card.png" alt="" draggable="false">` : spellIcon(key)}<span class="card-name">${c.name}</span><span class="card-role">${c.role}</span></button>`;
}
function syncHand() {
  const signature = game.hands[0].join(',');
  if (signature !== handSignature) {
    handSignature = signature;
    $('hand').innerHTML = game.hands[0].map((key,i) => cardMarkup(key,i)).join('');
    const key = game.queues[0][0], c = CARDS[key];
    $('next-preview').innerHTML = c.id ? `<img src="assets/pokemon/${c.id}/card.png" alt="">` : spellIcon(key).replace('class="spell-image"', '');
    $('next-name').textContent = c.name;
  }
  for (const el of $('hand').querySelectorAll('[data-card]')) {
    const i = Number(el.dataset.card), c = CARDS[game.hands[0][i]];
    el.classList.toggle('selected', selected === i);
    el.classList.toggle('unaffordable', game.energy[0] + .001 < c.cost);
    el.classList.toggle('guide-target', !!walkthrough && walkthrough.step === 1 && i === 0);
    el.setAttribute('aria-pressed', String(selected === i));
  }
}
function updateDetail() {
  const c = CARDS[game.hands[0][selected]];
  if (!c) {
    $('selected-detail').innerHTML = '<span class="detail-marker"><svg><use href="#i-ball"/></svg></span><div><strong>Elegí una carta</strong><p>Después, tocá tu lado de la arena.</p></div>';
    renderer.selection = null; return;
  }
  renderer.selection = game.hands[0][selected];
  $('selected-detail').innerHTML = `<span class="detail-marker" style="color:${c.color}"><svg><use href="${c.spell ? '#i-energy' : '#i-ball'}"/></svg></span><div><strong>${c.name}</strong><span class="detail-role">${c.role}</span><p>${c.spell ? 'Tocá cualquier punto de la arena.' : 'Tocá tu lado de la arena para desplegar.'}</p><p class="detail-stats">${c.hp ? `<span>♥ ${c.hp} vida</span>` : `<span>◉ ${c.splash} de área</span>`}<span>⚔ ${c.damage} daño</span><span>♦ ${c.cost} energía</span></p></div>`;
  $('selected-detail').title = c.description;
}
function choose(index) {
  if (!ready || index < 0 || index > 3 || game.state === 'ended' || game.state === 'paused') return;
  if (selected !== index) { audioInit(); tone(420+index*70,.06,'sine',.03); }
  selected = index;
  renderer.pointer = null;
  if (walkthrough?.step === 1) setGuideStep(2);
  updateDetail(); syncHand();
  const c = CARDS[game.hands[0][selected]];
  live(`${c.name}. ${c.cost} de energía. ${c.spell ? 'Apuntá en cualquier lado.' : 'Apuntá en tu lado de la arena.'}`);
}
function cancelSelection() { selected = -1; renderer.pointer = null; renderer.selection = null; updateDetail(); syncHand(); }
function updateUi() {
  const energy = game.energy[0];
  $('energy-value').textContent = String(Math.floor(energy));
  $('energy-bar').setAttribute('aria-valuenow', energy.toFixed(1));
  [...$('energy-bar').children].forEach((el,i) => el.firstElementChild.style.width = `${Math.max(0,Math.min(1,energy-i))*100}%`);
  $('energy-caption').textContent = energy >= 9.99 ? 'Energía al máximo · desplegá una carta' : 'Se recarga automáticamente';
  $('energy-speed').textContent = game.multiplier === 1 ? '+1 / 2,8 s' : '+1 / 1,4 s';
  $('boost').hidden = game.multiplier === 1; $('boost').textContent = `×${game.multiplier}`;
  const total = Math.ceil(game.time); $('timer').textContent = `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`;
  $('battle-clock').classList.toggle('urgent', game.time <= 30 || game.overtime);
  $('enemy-score').textContent = game.crowns(1); $('player-score').textContent = game.crowns(0);
  $('enemy-score').parentElement.setAttribute('aria-label', `${game.crowns(1)} torres destruidas por el rival`);
  $('player-score').parentElement.setAttribute('aria-label', `${game.crowns(0)} torres destruidas por vos`);
  $('pause-btn').disabled = !['playing','paused'].includes(game.state);
  syncHand();
}
function updateRecord() { $('player-record').textContent = record.wins || record.losses ? `${record.wins} ${record.wins === 1 ? 'victoria' : 'victorias'} · ${record.losses} derrotas` : 'Entrenador'; }
function handleEvent(e) {
  renderer.onEvent(e); soundEffect(e.type);
  if (e.type === 'deploy' && e.team === 0) {
    if (walkthrough?.step === 2) {
      setGuideStep(3); walkthrough.start = game.elapsed;
      game.spawn('squirtle',1,e.x < 300 ? 158 : 442,295,.75);
    }
  }
  if (e.type === 'towerDown') {
    announce(e.team === 0 ? 'Torre rival destruida' : 'Perdiste una torre');
    live(e.team === 0 ? 'Destruiste una torre. Ahora podés desplegar más adelante en ese carril.' : 'El rival destruyó una de tus torres.');
    if (!reduced) { $('arena-frame').classList.remove('shake'); void $('arena-frame').offsetWidth; $('arena-frame').classList.add('shake'); }
  }
  if (e.type === 'energyBoost') announce(`ENERGÍA ×${e.multiplier}`);
  if (e.type === 'overtime') { announce('TIEMPO EXTRA · MUERTE SÚBITA',2600); live('Tiempo extra. La primera torre destruida decide la partida.'); }
  if (e.type === 'end') showResult(e);
}
function newGame({ start = false, tutorial = false } = {}) {
  clearTimeout(announcementTimer); $('arena-announcement').classList.remove('show');
  $('result-overlay').hidden = true; $('pause-overlay').hidden = true; $('guide').hidden = true;
  walkthrough = null; selected = -1; handSignature = ''; renderer.pointer = null; renderer.selection = null; renderer.tutorialSpot = false;
  renderer.particles = []; renderer.rings = [];
  game = new Game({ deck: tutorial ? DEFAULT_DECK : deck, difficulty, tutorial, onEvent: handleEvent });
  $('difficulty-label').textContent = `${{easy:'Principiante',normal:'Entrenador',hard:'Líder de gimnasio'}[difficulty]} · CPU`;
  $('ready-overlay').hidden = start || !ready;
  if (start) {
    audioInit(); game.start();
    if (tutorial) { game.energy = [10,6]; walkthrough = { step: 1, start: 0 }; setGuideStep(1); }
    else announce('¡A BATALLAR!',1300);
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
  if (e.winner === 0) { record.wins++; tone(660,.2,'triangle',.05); setTimeout(()=>tone(880,.35,'triangle',.05),150); }
  if (e.winner === 1) record.losses++;
  store.set('record',record); updateRecord(); updateUi();
  live(`${$('result-title').textContent}. ${e.reason}. ${game.crowns(0)} a ${game.crowns(1)}.`);
  $('again-btn').focus({preventScroll:true});
}
function arenaPoint(clientX,clientY) {
  const r=canvas.getBoundingClientRect();
  return {x:(clientX-r.left)/r.width*W,y:(clientY-r.top)/r.height*H,inside:clientX>=r.left&&clientX<=r.right&&clientY>=r.top&&clientY<=r.bottom};
}
function attemptDeploy(point) {
  if(game.state!=='playing')return;
  if(selected<0){toast('Elegí una carta primero.');return;}
  const result=game.deploy(0,selected,point.x,point.y);
  if(!result.ok){toast(result.reason);tone(150,.12,'triangle',.02);return;}
  live(`${CARDS[result.key].name} desplegado. ${Math.floor(game.energy[0])} de energía.`);
  cancelSelection();updateUi();
}
function togglePause() {
  if(document.querySelector('dialog[open]'))return;
  if(game.state==='playing'){game.pause();$('pause-overlay').hidden=false;$('resume-btn').focus({preventScroll:true});live('Partida en pausa.');}
  else if(game.state==='paused'){game.resume();$('pause-overlay').hidden=true;canvas.focus({preventScroll:true});live('Partida reanudada.');}
}
function openModal(id) {
  const dialog=$(id);dialog.dataset.resume=game.state==='playing'?'1':'0';
  if(game.state==='playing')game.pause();
  dialog.showModal();
}
function closeModal(dialog,resume=true){if(!resume)dialog.dataset.resume='0';dialog.close();}
document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.addEventListener('close',()=>{if(dialog.dataset.resume==='1'&&game.state==='paused'){game.resume();$('pause-overlay').hidden=true;}});
  dialog.addEventListener('click',event=>{if(event.target.closest('[data-close]'))closeModal(dialog);else if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeModal(dialog);}});
});

function renderCollection() {
  $('collection').innerHTML=Object.keys(CARDS).map(k=>cardMarkup(k,0,true)).join('');
  for(const el of $('collection').children){const included=deckDraft.includes(el.dataset.collection);el.classList.toggle('selected',included);el.setAttribute('aria-pressed',String(included));el.disabled=!deckEditable;}
  $('deck-count').textContent=`${deckDraft.length}/8`;
  $('deck-average').textContent=deckDraft.length?(deckDraft.reduce((a,k)=>a+CARDS[k].cost,0)/deckDraft.length).toFixed(1).replace('.',','):'—';
  $('save-deck-btn').disabled=deckDraft.length!==8||!deckEditable;
  $('reset-deck-btn').disabled=!deckEditable;
}
function openDeck() {
  deckEditable=!['playing','paused'].includes(game.state);deckDraft=[...deck];
  $('deck-edit-hint').textContent=deckEditable?'Elegí 8 cartas para la próxima batalla.':'Podés editarlo al terminar esta batalla.';
  renderCollection();openModal('deck-dialog');
}
$('collection').addEventListener('click',e=>{
  const el=e.target.closest('[data-collection]');if(!el||!deckEditable)return;
  const key=el.dataset.collection;
  if(deckDraft.includes(key))deckDraft=deckDraft.filter(k=>k!==key);
  else if(deckDraft.length<8)deckDraft.push(key);
  else { $('deck-edit-hint').textContent='Quitá una carta para agregar otra.';return; }
  $('deck-edit-hint').textContent='Elegí 8 cartas para la próxima batalla.';renderCollection();
});
$('save-deck-btn').addEventListener('click',()=>{if(deckDraft.length!==8||!deckEditable)return;deck=[...deckDraft];store.set('deck',deck);closeModal($('deck-dialog'),false);newGame();toast('Mazo guardado.');});
$('reset-deck-btn').addEventListener('click',()=>{deckDraft=[...DEFAULT_DECK];renderCollection();});

$('hand').addEventListener('click',e=>{const el=e.target.closest('[data-card]');if(el&&performance.now()>ignoreClickUntil)choose(Number(el.dataset.card));});
$('hand').addEventListener('pointerdown',e=>{const el=e.target.closest('[data-card]');if(!el||e.button!==0)return;drag={index:Number(el.dataset.card),x:e.clientX,y:e.clientY,active:false};});
document.addEventListener('pointermove',e=>{
  if(!drag)return;
  if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>7){drag.active=true;choose(drag.index);}
  if(drag.active){const p=arenaPoint(e.clientX,e.clientY);renderer.pointer=p.inside?p:null;e.preventDefault();}
},{passive:false});
document.addEventListener('pointerup',e=>{
  if(!drag)return;
  if(drag.active){ignoreClickUntil=performance.now()+350;const p=arenaPoint(e.clientX,e.clientY);if(p.inside)attemptDeploy(p);renderer.pointer=null;}
  drag=null;
});
document.addEventListener('pointercancel',()=>{drag=null;renderer.pointer=null;});
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
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.state==='playing'){game.pause();$('pause-overlay').hidden=false;}});

$('start-btn').addEventListener('click',()=>newGame({start:true}));
$('practice-btn').addEventListener('click',()=>newGame({start:true,tutorial:true}));
$('skip-guide').addEventListener('click',finishGuide);
$('again-btn').addEventListener('click',()=>newGame({start:true}));
$('result-deck-btn').addEventListener('click',openDeck);
$('deck-btn').addEventListener('click',openDeck);
$('pause-btn').addEventListener('click',togglePause);
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
updateSound();setReduced(reduced);updateRecord();newGame();
let previous=performance.now(),accumulator=0;
function frame(now){
  const dt=Math.min((now-previous)/1000,.08);previous=now;
  if(game.state==='playing'&&!(walkthrough&&walkthrough.step<3)){
    accumulator+=dt;
    while(accumulator>=1/30){game.step(1/30);accumulator-=1/30;}
    if(walkthrough?.step===3&&game.elapsed-walkthrough.start>8){finishGuide();toast('La guía terminó. ¡Seguí defendiendo tus torres!');}
  }else accumulator=0;
  renderer.draw(game,game.state==='paused'?0:dt);
  if(now-lastUi>80){lastUi=now;updateUi();}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
try{
  await renderer.load();ready=true;$('loading').hidden=true;$('ready-overlay').hidden=false;
}catch(error){
  console.error(error);$('loading').innerHTML='<div style="text-align:center;padding:25px"><p>No se pudieron cargar los sprites.</p><button class="primary-btn" id="retry-load">Volver a intentar</button></div>';
  $('retry-load').addEventListener('click',()=>location.reload());
}
