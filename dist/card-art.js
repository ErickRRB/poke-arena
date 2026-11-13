import { CARDS } from './engine.js?v=17';
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
export function cardArtMarkup(key) {
  const art = CARD_ART[key];
  if (!art) return '';
  const x = art.columns === 1 ? 0 : art.x * 100 / (art.columns - 1), y = art.rows === 1 ? 0 : art.y * 100 / (art.rows - 1);
  const flip = ['pikachu','charizard','treecko','eevee','vulpix','alakazam','scyther','beedrill','ekans','arcanine','cloyster','starmie','dragonite','feraligatr','espeon','scizor','sceptile','gardevoir','sharpedo','salamence','rayquaza'].includes(key);
  return `<span class="card-art" data-art="${key}" aria-hidden="true" style="background-image:url('${art.file}');background-size:${art.columns * 100}% ${art.rows * 100}%;background-position:${x}% ${y}%;${flip?'transform:scaleX(-1)':''}"></span>${CARDS[key]?.rarity==='legendaria'?'<span class="legend-frame" aria-hidden="true"></span>':''}`;
}
