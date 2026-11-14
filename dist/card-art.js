import { CARDS } from './engine.js?v=26';
import { cardPlaceholder } from './battle-art.js?v=26';
// Each atlas contains opaque, full-bleed battle scenes in row-major order.
const sheets = [
  ['pikachu','snorlax','machamp','blastoise','zubat','thunder','charizard','fireball','treecko','log','squirtle','charmander','bulbasaur','gengar','eevee','onix'],
  ['vulpix','psyduck','alakazam','geodude','magnemite','scyther','lapras','mewtwo','golem','venusaur','butterfree','beedrill','pidgeot','ekans','sandshrew','nidoqueen'],
  ['nidoking','mankey','arcanine','slowbro','grimer','cloyster','gastly','voltorb','electrode','exeggutor','koffing','chansey','kangaskhan','starmie','mrmime','gyarados'],
  ['ditto','articuno','zapdos','moltres','dragonite','meganium','typhlosion','feraligatr','crobat','ampharos','espeon','umbreon','wobbuffet','steelix','scizor','skarmory'],
  ['blissey','lugia','hooh','sceptile','blaziken','swampert','gardevoir','sableye','aggron','sharpedo','flygon','altaria','absol','salamence','metagross','kyogre'],
  ['groudon','rayquaza'],
];
export const CARD_ART = Object.fromEntries(sheets.flatMap((keys, sheet) => keys.map((key, index) => {
  const columns = sheet === 5 ? 2 : 4, rows = sheet === 5 ? 1 : 4;
  return [key, { file: `assets/cards/battle-${sheet + 1}.webp`, columns, rows, x: index % columns, y: Math.floor(index / columns) }];
})));
for (const key of ['diglett', 'diglettHorde', 'raltsTrio', 'poochyenaPack']) {
  CARD_ART[key] = { file: `assets/cards/${key}.webp`, columns: 1, rows: 1, x: 0, y: 0 };
}
for(const key of ['centralElectrode','madriguera','vivero','regice','duskull','raichu','registeel','regirock','celebi','pandilla','pinMissile','lightning','hyperBeam','blizzard','spikes','stealthRock','whirlpool','nightmare','earthquake']){
  CARD_ART[key]={file:`assets/cards/${key}.webp`,columns:1,rows:1,x:0,y:0};
}
for(const key of ['lightning','pinMissile','blizzard','spikes','whirlpool','earthquake','nightmare','stealthRock'])CARD_ART[key].file=`assets/cards/${key}V2.webp`;
for(const key of ['fireball','forretress'])CARD_ART[key]={file:`assets/cards/${key}${key==='fireball'?'V2':''}.webp`,columns:1,rows:1,x:0,y:0};
const SCENE_ART = new Set(['ekans','zubat','beedrill','sandshrew','mankey','nidoqueen','exeggutor','altaria','treecko','kangaskhan']);
for(const key of SCENE_ART)CARD_ART[key]={file:`assets/cards/${key}SceneV2.webp`,columns:1,rows:1,x:0,y:0};
CARD_ART.golem={file:'assets/cards/golemSceneV3.webp',columns:1,rows:1,x:0,y:0};
CARD_ART.blastoise={file:'assets/cards/blastoise-mobile-v1.png',columns:1,rows:1,x:0,y:0};
CARD_ART.log={file:'assets/cards/flame-wheel-v1.png',columns:1,rows:1,x:0,y:0};
for(const key of ['rapidash','roselia','graveler','nuzleaf','sneaselAmbush']){
  CARD_ART[key]={file:`assets/cards/${key}-v1.webp`,columns:1,rows:1,x:0,y:0};
}
// Separate files keep corrected anatomy out of the older atlases and browser caches.
for(const [key,file]of Object.entries({diglett:'diglettV2',diglettHorde:'diglettHordeV2',zubat:'zubatSceneV3',crobat:'crobatSceneV2',raltsTrio:'raltsTrioV2',registeel:'registeelV2',celebi:'celebiV2',duskull:'duskullV2',nuzleaf:'nuzleafV2'})){
  CARD_ART[key]={file:`assets/cards/${file}.webp`,columns:1,rows:1,x:0,y:0};
}
export function cardArtMarkup(key) {
  const art = CARD_ART[key];
  if (!art) return '';
  const flip = !SCENE_ART.has(key)&&['pikachu','charizard','treecko','eevee','vulpix','alakazam','scyther','beedrill','ekans','arcanine','cloyster','starmie','dragonite','feraligatr','espeon','scizor','sceptile','gardevoir','sharpedo','salamence','rayquaza'].includes(key);
  // The SVG viewport crops a raster atlas tile using cover semantics. Scaling a
  // background to columns × rows stretched every portrait into its container.
  const width = art.columns === 2 ? 1586 : 1122, height = art.columns === 2 ? 992 : 1402;
  const tileWidth = width / art.columns, tileHeight = height / art.rows;
  const raster = art.columns > 1 ? `<svg viewBox="${art.x * tileWidth} ${art.y * tileHeight} ${tileWidth} ${tileHeight}" preserveAspectRatio="xMidYMid slice" focusable="false"><image href="${art.file}" width="${width}" height="${height}"/></svg>` : '';
  return `<span class="card-art" data-art="${key}" aria-hidden="true" style="${art.columns===1?`background-image:url('${art.file}');background-size:cover;background-position:center;`:''}${flip?'transform:scaleX(-1)':''}">${raster}</span>${CARDS[key]?.rarity==='legendaria'?'<span class="legend-frame" aria-hidden="true"></span>':''}${cardPlaceholder(key)?'<span class="art-placeholder">PLACEHOLDER</span>':''}`;
}
