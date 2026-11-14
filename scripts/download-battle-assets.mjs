import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..'),pin='03c80dad937911572f8fb19903771a47956fc696';
const definitions={
 flame:'Particle/Flamethrower_2.None.png',ember:'Particle/Flamethrower.None.png',hydro:'Particle/Water_Column_Ranger.None.png',bubble:'Particle/Bubbles_Blue.None.png',leaf:'Particle/Razor_Leaf.None.png',poison:'Particle/Poison_Ball_Ranger.None.png',shadow:'Particle/Shadow_Ball.None.png',psychic:'Particle/Aura_Sphere.None.png',impact:'Particle/Dizzy_Punch_Hit.None.png',ice:'Particle/Ice_Shard_Hit.None.png',heal:'Particle/Heal_Order.None.png',rock:'Particle/Rock_Wrecker_Boulder.None.png',dust:'Particle/Puff_Brown.None.png',slash:'Particle/Scratch.Dir1.png',explosion:'Particle/Explosion.None.png',egg:'Particle/Egg_Bomb_Egg.None.png',coin:'Item/Money_Yellow.None.png',song:'Particle/Growl.Dir8.png',horn:'Particle/Megahorn_Front.None.png',lick:'Particle/Lick.None.png',vine:'Particle/Vine_Whip.Dir1.png',whirlpool:'Particle/Gust_Blue.None.png',spikes:'Particle/Spikes_RSE.Flip.png',stealthBack:'Particle/Stealth_Rock_Back.None.png',stealthFront:'Particle/Stealth_Rock_Front.None.png',nightmareBack:'Particle/Dark_Void_Back.None.png',nightmareFront:'Particle/Dark_Void_Front.None.png',quake:'Particle/Earth_Power_Eruption.None.png',snow:'Particle/Ice_Shard.Dir8.png',freeze:'Particle/Ice_Ball.None.png',shield:'Particle/Protect_Blue.None.png',puff:'Particle/Puff_White.None.png',needle:'Particle/Pin_Missile.Dir5.png',grass:'Tile/8x8/TownBase.png',water:'Tile/24x24/BeachWaves.png',tree:'Object/Tree_Town.Flip.png',fence:'Object/Fence.Flip.png',log:'Object/Logs_Large.Flip.png',rubble:'Particle/Rock_Pieces.None.png',
};
definitions.bite='Particle/Bite.Dir8.png';
definitions.flameWheel='Particle/Flame_Wheel.None.png';
definitions.petalShot='Particle/Petal_Dance_Flower_Pink.None.png';
for(const [name,folder]of [['lightning','Lightning'],['beam','Beam'],['waterBeam','Column_Blue'],['hyper','Column_Yellow']])for(const section of ['Body','Head','Tail'])definitions[name+section]='Beam/'+folder+'/'+section+'.png';
const destination=path.join(root,'dist/assets/battle');await mkdir(destination,{recursive:true});
const animations={},sources=[];
for(const[name,source]of Object.entries(definitions)){
 const filename=source.replaceAll('/','__'),target=path.join(destination,filename),url='https://raw.githubusercontent.com/PMDCollab/RawAsset/'+pin+'/'+source;
 let data;try{data=await readFile(path.join(root,'qa/battle-assets/raw',filename));}catch{const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(source+': '+response.status);data=Buffer.from(await response.arrayBuffer());}
 if(data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG: '+source);
 await writeFile(target,data);const width=data.readUInt32BE(16),height=data.readUInt32BE(20);
 let rows=Number(source.match(/\.Dir(\d+)\./)?.[1])||1,columns=1;
 if(source.startsWith('Particle/')){const side=height/rows;columns=width/side;if(!Number.isInteger(columns))throw Error('Non-square particle frames: '+source+' '+width+'x'+height);}
 if(source.startsWith('Beam/')){columns=name.startsWith('lightning')?6:name.startsWith('waterBeam')||name.startsWith('hyper')?14:2;rows=1;}
 animations[name]={file:'assets/battle/'+filename,width:width/columns,height:height/rows,columns,rows,fps:name==='petalShot'?8:['whirlpool','heal','ice','quake'].includes(name)?24:18};
 sources.push({key:name,file:animations[name].file,source:url,sha256:createHash('sha256').update(data).digest('hex')});
}
let ball;try{ball=Buffer.from(await readFile(path.join(destination,'poke-ball.png')));}catch{const response=await fetch('https://raw.githubusercontent.com/PokeAPI/sprites/1b3b7c0a538dd2226ae08d0d2f8955125075bbd4/sprites/items/poke-ball.png');if(!response.ok)throw Error('Poké Ball: '+response.status);ball=Buffer.from(await response.arrayBuffer());}
await writeFile(path.join(destination,'poke-ball.png'),ball);animations.pokeball={file:'assets/battle/poke-ball.png',width:ball.readUInt32BE(16),height:ball.readUInt32BE(20),columns:1,rows:1,fps:1};
sources.push({key:'pokeball',file:animations.pokeball.file,source:'https://raw.githubusercontent.com/PokeAPI/sprites/1b3b7c0a538dd2226ae08d0d2f8955125075bbd4/sprites/items/poke-ball.png',sha256:createHash('sha256').update(ball).digest('hex')});
await writeFile(path.join(destination,'manifest.json'),JSON.stringify({animations,sources},null,2)+'\n');
await writeFile(path.join(destination,'manifest.js'),'// Original PMD animation sheet dimensions. Sources: manifest.json.\nexport const BATTLE_ASSETS='+JSON.stringify(animations)+';\n');
await writeFile(path.join(destination,'README.txt'),'Original animated effects and scenery: PMDCollab/RawAsset, revision '+pin+'.\nOriginal PMD game graphics: Nintendo, Creatures, GAME FREAK and Chunsoft; community additions by PMDCollab contributors.\nPoké Ball item sprite: PokeAPI/sprites.\nSources and checksums: manifest.json.\nTower bitmap atlas: original ImageGen illustration for Poké Arena; prompt in docs/BATTLE-ART-REVIEW.json.\n');
console.log(JSON.stringify({animations:Object.keys(animations).length,sourceFiles:sources.length,folder:destination}));
