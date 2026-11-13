import { CARDS, DEFAULT_DECK } from './engine.js?v=20';

const KEY='poke-arena:deck',STAMP='poke-arena:deck-updated',COOKIE='poke_arena_deck';
const replacements={shuppet:'diglett',shuppetSwarm:'diglettHorde',nidoranScouts:'raltsTrio',nidoranPack:'poochyenaPack'};
function browserStorage(){try{return globalThis.localStorage;}catch{return null;}}
function browserCookie(){try{return globalThis.document?.cookie||'';}catch{return '';}}
function cookieValue(cookie){
  try{const value=cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='));return value?JSON.parse(decodeURIComponent(value.slice(COOKIE.length+1))):null;}catch{return null;}
}
export function normalizeDeck(value){
  if(!Array.isArray(value))return null;
  const cards=[];
  for(const oldKey of value){
    if(typeof oldKey!=='string')continue;
    const key=Object.hasOwn(replacements,oldKey)?replacements[oldKey]:oldKey;
    if(Object.hasOwn(CARDS,key)&&!CARDS[key].token&&!cards.includes(key))cards.push(key);
    if(cards.length===8)break;
  }
  return cards;
}
export function loadDeck({storage=browserStorage(),cookie=browserCookie()}={}){
  let stored=null,updated=0;
  try{stored=normalizeDeck(JSON.parse(storage?.getItem(KEY)||'null'));updated=Number(storage?.getItem(STAMP))||0;}catch{}
  const backup=cookieValue(cookie),backupCards=normalizeDeck(backup?.cards);
  if(backupCards&&(!stored||Number(backup.updatedAt)>updated))return backupCards;
  return stored??[...DEFAULT_DECK];
}
export function saveDeck(value,{storage=browserStorage(),cookie=browserCookie(),writeCookie,now=Date.now()}={}){
  const cards=normalizeDeck(value);if(!cards)return false;
  let previous=0;try{previous=Number(storage?.getItem(STAMP))||0;}catch{}
  const updatedAt=Math.max(now,previous+1,(Number(cookieValue(cookie)?.updatedAt)||0)+1);
  let persisted=false;
  try{if(storage){storage.setItem(KEY,JSON.stringify(cards));storage.setItem(STAMP,String(updatedAt));persisted=true;}}catch{}
  const encoded=encodeURIComponent(JSON.stringify({cards,updatedAt}));
  const assignment=`${COOKIE}=${encoded}; Path=/; Max-Age=31536000; SameSite=Lax${globalThis.location?.protocol==='https:'?'; Secure':''}`;
  try{
    if(writeCookie){writeCookie(assignment);persisted=true;}
    else if(globalThis.document){globalThis.document.cookie=assignment;persisted=browserCookie().split(';').some(s=>s.trim()===`${COOKIE}=${encoded}`)||persisted;}
  }catch{}
  return persisted;
}

const SLOTS_KEY='poke-arena:deck-slots',SLOTS_COOKIE='poke_arena_decks';
function normalizeLibrary(value){
  if(!value||value.version!==1||!Array.isArray(value.slots))return null;
  const slots=Array.from({length:4},(_,i)=>value.slots[i]===null||value.slots[i]===undefined?null:normalizeDeck(value.slots[i]));
  const active=Number.isInteger(value.active)&&value.active>=0&&value.active<4?value.active:0;
  slots[active]??=[];
  return{version:1,active,slots,updatedAt:Number(value.updatedAt)||0};
}
function slotsCookieValue(cookie){
  try{const value=cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(SLOTS_COOKIE+'='));return value?normalizeLibrary(JSON.parse(decodeURIComponent(value.slice(SLOTS_COOKIE.length+1)))):null;}catch{return null;}
}
export function loadDeckLibrary({storage=browserStorage(),cookie=browserCookie()}={}){
  let stored=null;try{stored=normalizeLibrary(JSON.parse(storage?.getItem(SLOTS_KEY)||'null'));}catch{}
  const backup=slotsCookieValue(cookie);
  if(backup&&(!stored||backup.updatedAt>stored.updatedAt))return backup;
  return stored||{version:1,active:0,slots:[loadDeck({storage,cookie}),null,null,null],updatedAt:0};
}
export function saveDeckLibrary(value,{storage=browserStorage(),cookie=browserCookie(),writeCookie,now=Date.now()}={}){
  const library=normalizeLibrary(value);if(!library)return false;
  let previous=0;try{previous=Number(JSON.parse(storage?.getItem(SLOTS_KEY)||'null')?.updatedAt)||0;}catch{}
  library.updatedAt=Math.max(now,previous+1,(slotsCookieValue(cookie)?.updatedAt||0)+1);
  let persisted=false;try{if(storage){storage.setItem(SLOTS_KEY,JSON.stringify(library));persisted=true;}}catch{}
  const encoded=encodeURIComponent(JSON.stringify(library));
  const assignment=`${SLOTS_COOKIE}=${encoded}; Path=/; Max-Age=31536000; SameSite=Lax${globalThis.location?.protocol==='https:'?'; Secure':''}`;
  try{if(writeCookie){writeCookie(assignment);persisted=true;}else if(globalThis.document){globalThis.document.cookie=assignment;persisted=browserCookie().split(';').some(s=>s.trim()===`${SLOTS_COOKIE}=${encoded}`)||persisted;}}catch{}
  return persisted;
}
