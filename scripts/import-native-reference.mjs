import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const input=process.argv[2]||'qa/reference/native-160635007-20261103.json',bytes=await fs.readFile(input);
const hash=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
if(hash!=='6dd5bd2272b948fd04759007fc2ba2750a58ad39')throw Error('Unexpected native reference revision');
const data=JSON.parse(bytes),old=JSON.parse(await fs.readFile('docs/KNOCKBACK-REVIEW-2026-11-14.json','utf8'));
const names=new Set(old.nativeReferences.map(row=>row.nativeUnit).filter(Boolean));
for(const name of['GoblinHut','GoblinHut_Rework','SpearGoblin_Dummy','FirespiritHut','Furnace_rework','FireSpirits'])names.add(name);
for(const name of ['Skeletons','SkeletonArmy','Archers','Goblins','GoblinGang','Minions','Guards','Bats','SpearGoblins','Golemite','Graveyard_rework_Skeleton','BarrelGoblin','Barbarian','Graveyard','Zap','Fireball','Log','Arrows','Lightning','Rocket','Freeze','Poison','Tornado','Earthquake','GoblinBarrel'])names.add(name);
const cards=data.cards.filter(card=>names.has(card.name)||names.has(card.summon_character));
for(const card of cards){for(const name of[card.spawner?.character,card.interval_spawner?.character,card.death_spawn?.character,card.second_summon?.character,card.spell?.spawn?.character])if(name)names.add(name);}
const units=Object.fromEntries(Object.entries(data.units).filter(([name])=>names.has(name)));
const projectileNames=new Set(Object.values(units).flatMap(unit=>[unit.raw?.CustomFirstProjectile,unit.raw?.Projectile]).filter(Boolean));
const projectiles=Object.fromEntries([...projectileNames].map(name=>[name,data.projectiles[name]]).filter(([,p])=>p));
const keep=(key,value)=>value;
const result={asOf:'2026-11-14',level:11,source:{...old.source,blobSha:hash,vintage:data.provenance.vintage,rawSha256:createHash('sha256').update(bytes).digest('hex')},conventions:data.conventions,scaling:data.rarities,cards,units,towers:data.towers,areaEffects:data.area_effect_objects,projectiles};
await fs.writeFile('docs/CR-NATIVE-2026-11-03.json',JSON.stringify(result,keep,2)+'\n');
console.log(JSON.stringify({cards:cards.length,units:Object.keys(units).length,blobSha:hash}));
