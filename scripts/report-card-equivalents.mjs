import {writeFile} from 'node:fs/promises';
import {CARDS} from '../dist/engine.js';
import {CARD_EQUIVALENTS,cardEquivalentLabel} from '../dist/card-equivalents.js';

const playable=Object.entries(CARDS).filter(([,card])=>!card.token);
const groups=[['Tropas',card=>!card.spell&&!card.structure],['Estructuras',card=>card.structure],['Hechizos',card=>card.spell]];
const output=[
 '# Equivalencias de Poké Arena con Clash Royale','',
 `Las ${playable.length} cartas jugables se comparan por su comportamiento con las cartas base de Clash Royale. «Parcial de» señala una adaptación que conserva diferencias. «Sin similitud» queda sin etiqueta en las cartas del juego. Las correspondencias identifican el perfil de referencia; las pruebas de interacciones y sus límites se documentan por separado en la matriz de combate.`,
 '',
 'Vivero Exeggutor cuesta 3, libera parejas de Exeggcute con la vida de Esqueletos y deja cuatro al caer. Refugio Ralts es otra carta: cuesta 4 y libera tiradores cuando hay enemigos cerca. La Pandilla lleva tres Poochyena y tres Ralts. Exeggutor suelto y Registeel están retirados; los mazos guardados migran al Vivero y a Rhydon, respectivamente.',
 '',
];
for(const [title,include] of groups){
 output.push('## '+title,'','| Carta Pokémon | Elixir | Clash Royale | Comportamiento |','| --- | ---: | --- | --- |');
 const cards=playable.filter(([,card])=>include(card)).sort((a,b)=>a[1].name.localeCompare(b[1].name,'es'));
 for(const [key,card] of cards){
   const equivalent=CARD_EQUIVALENTS[key];if(!equivalent)throw Error('Missing equivalent '+key);
   output.push(`| ${card.name} | ${card.cost} | ${cardEquivalentLabel(key)||'Sin similitud'} | ${equivalent.reason} |`);
 }
 output.push('');
}
output.push('## Invocaciones','','Estos cuerpos aparecen mediante otra carta y no ocupan un lugar independiente en la colección.','','| Pokémon | Clash Royale |','| --- | --- |');
for(const [key,card] of Object.entries(CARDS).filter(([key,card])=>card.token&&!['electrode','exeggutor','registeel'].includes(key))){
 output.push(`| ${card.name} | ${cardEquivalentLabel(key)||'Sin similitud'} |`);
}
output.push('');
await writeFile(new URL('../docs/CARD-EQUIVALENTS.md',import.meta.url),output.join('\n'));
console.log(JSON.stringify({playable:playable.length,equivalent:playable.filter(([key])=>CARD_EQUIVALENTS[key].similarity==='equivalent').length,partial:playable.filter(([key])=>CARD_EQUIVALENTS[key].similarity==='partial').length}));
