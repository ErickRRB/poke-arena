import { CARDS, DEFAULT_DECK } from './engine.js?v=13';

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
