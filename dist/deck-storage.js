import { CARDS, DEFAULT_DECK } from './engine.js?v=target-c1-1';

const KEY='poke-arena:deck',STAMP='poke-arena:deck-updated',COOKIE='poke_arena_deck';
const replacements={shuppet:'diglett',shuppetSwarm:'diglettHorde',nidoranScouts:'raltsTrio',nidoranPack:'poochyenaPack',electrode:'forretress',exeggutor:'vivero',registeel:'rhydon',blastoise:'octillery'};
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
function preserveDeck(value){return Array.isArray(value)?value.slice():null;}
export function loadDeck({storage=browserStorage(),cookie=browserCookie()}={}){
  let stored=null,updated=0;
  try{stored=preserveDeck(JSON.parse(storage?.getItem(KEY)||'null'));updated=Number(storage?.getItem(STAMP))||0;}catch{}
  const backup=cookieValue(cookie),backupCards=preserveDeck(backup?.cards);
  if(backupCards&&(!stored||Number(backup.updatedAt)>updated))return backupCards;
  return stored??[...DEFAULT_DECK];
}
export function saveDeck(value,{storage=browserStorage(),cookie=browserCookie(),writeCookie,now=Date.now()}={}){
  const cards=preserveDeck(value);if(!cards)return false;
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
const revision=value=>Number.isSafeInteger(Number(value))&&Number(value)>=0?Number(value):0;
const equivalent=(a,b)=>{
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&equivalent(a[key],b[key]));
};
function normalizeLibrary(value){
  if(!value||value.version!==1||!Array.isArray(value.slots))return null;
  const slots=Array.from({length:4},(_,i)=>value.slots[i]===null||value.slots[i]===undefined?null:Array.isArray(value.slots[i])?value.slots[i].slice():null);
  const active=Number.isInteger(value.active)&&value.active>=0&&value.active<4?value.active:0;
  return{...value,version:1,active,slots,updatedAt:revision(value.updatedAt)};
}
function slotsCookieValue(cookie){
  try{const value=cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(SLOTS_COOKIE+'='));return value?normalizeLibrary(JSON.parse(decodeURIComponent(value.slice(SLOTS_COOKIE.length+1)))):null;}catch{return null;}
}
export function loadDeckLibrary({storage=browserStorage(),cookie=browserCookie()}={}){
  let stored=null;try{stored=normalizeLibrary(JSON.parse(storage?.getItem(SLOTS_KEY)||'null'));}catch{}
  const backup=slotsCookieValue(cookie);
  if(backup&&(!stored||backup.updatedAt>stored.updatedAt))return backup;
  if(stored&&backup&&backup.updatedAt===stored.updatedAt&&!equivalent(backup,stored)){
    return{...stored,provenanceConflict:{updatedAt:stored.updatedAt,storage:stored,cookie:backup}};
  }
  if(stored)return stored;
  let legacy=null,legacyUpdated=0;try{legacy=JSON.parse(storage?.getItem(KEY)||'null');legacyUpdated=Number(storage?.getItem(STAMP))||0;}catch{}
  const backupDeck=cookieValue(cookie);
  if(Array.isArray(backupDeck?.cards)&&(!Array.isArray(legacy)||Number(backupDeck.updatedAt)>legacyUpdated)){legacy=backupDeck.cards;legacyUpdated=revision(backupDeck.updatedAt);}
  return{version:1,active:0,slots:[Array.isArray(legacy)?legacy.slice():[...DEFAULT_DECK],null,null,null],updatedAt:revision(legacyUpdated)};
}
export function saveDeckLibrary(value,{storage=browserStorage(),cookie=browserCookie(),writeCookie,now=Date.now()}={}){
  const library=normalizeLibrary(value);if(!library)return false;
  let previous=0,legacyPrevious=0;try{previous=revision(JSON.parse(storage?.getItem(SLOTS_KEY)||'null')?.updatedAt);legacyPrevious=revision(storage?.getItem(STAMP));}catch{}
  library.updatedAt=Math.max(revision(now),revision(value.updatedAt)+1,previous+1,legacyPrevious+1,revision(slotsCookieValue(cookie)?.updatedAt)+1,revision(cookieValue(cookie)?.updatedAt)+1);
  let persisted=false;try{if(storage){storage.setItem(SLOTS_KEY,JSON.stringify(library));persisted=true;}}catch{}
  const encoded=encodeURIComponent(JSON.stringify(library));
  const assignment=`${SLOTS_COOKIE}=${encoded}; Path=/; Max-Age=31536000; SameSite=Lax${globalThis.location?.protocol==='https:'?'; Secure':''}`;
  try{if(writeCookie){writeCookie(assignment);persisted=true;}else if(globalThis.document){globalThis.document.cookie=assignment;persisted=browserCookie().split(';').some(s=>s.trim()===`${SLOTS_COOKIE}=${encoded}`)||persisted;}}catch{}
  return persisted;
}
