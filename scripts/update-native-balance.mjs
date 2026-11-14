import fs from 'node:fs';
import {CLASH_ROSTER,ORIGINAL_ADAPTATIONS} from '../dist/clash-roster.js';
const source=JSON.parse(fs.readFileSync(new URL('../docs/CR-NATIVE-2026-11-03.json',import.meta.url),'utf8'));
const tile=24,scaled=n=>n==null?0:Math.floor(n*256/100),distance=n=>(n||0)*tile/1000,seconds=n=>(n||0)/1000;
const profiles={},audit=[];
const summonKeys={Skeleton:'duskullToken',Barbarian:'nidoranM',Golemite:'geodudeToken'};
for(const[key,name]of Object.entries(CLASH_ROSTER)){
 const c=source.cards.find(c=>c.name===name)||source.units[name];if(!c)throw Error('Missing '+name);
 const raw=source.units[c.summon_character||c.name]?.raw||{},p=source.projectiles[raw.CustomFirstProjectile]||c.projectile,hs=seconds(c.hit_speed_ms)||1,load=seconds(c.load_time_ms),windup=Math.max(0,hs-load),buff=p?.target_buff||c.buff_on_damage?.buff;
 const patch={nativeReference:name,hp:scaled(c.hitpoints),damage:scaled(c.damage??p?.damage),interval:hs,windup,attackDuration:Math.min(hs,windup+.16),speed:(c.speed||0)*.48,range:distance(c.range_milli),sightRange:distance(c.sight_range_milli),radius:distance(c.collision_radius_milli)||12,mass:c.mass||1,deployTime:seconds(c.deploy_time_ms),count:c.count||1,burst:1,burstSpacing:0,bolts:0,air:!!c.attacks_air,flying:!!c.flying_height,building:!!c.target_only_buildings,structure:c.kind==='building',passive:false,splash:distance(c.area_damage_radius_milli),selfSplash:!!c.self_as_aoe_center,shield:scaled(c.shield_hitpoints),lifetime:seconds(c.lifetime_ms),knockbackImmune:!!c.ignore_pushback,rangedAttack:!!p,projectileStart:distance(c.projectile_start_radius_milli),burn:0,poisonField:0,lifesteal:0,slow:0,stun:0,chain:0,cone:0,pierce:false,armor:0,reflect:0,charge:0,dash:false,blink:0,entryDamage:0,entryRadius:0,entryStun:0,entrySlow:0,split:false,deathSpawn:null,deathCount:0,deathDamage:scaled(c.death_damage),deathRadius:distance(c.death_damage_radius_milli),deathKnockback:distance(c.death_pushback_milli),deathAir:!!c.attacks_air,deathField:0,deathHeal:0,deathStun:0,heal:0,summon:null,summonMax:0,ttl:0,riverJump:false,burrow:!!c.hides_when_not_attacking,suicide:!!c.kamikaze,execute:0,enrage:false,attackRoleOverride:true};
 if(c.elixir!=null)patch.cost=key.endsWith('Token')?0:c.elixir;
 Object.assign(patch,{platform:false,jumpRange:0,jumpDuration:null});
 patch.moveSpeed=(c.stop_movement_after_ms?Math.floor(c.speed*(c.stop_movement_after_ms+(c.wait_ms||0))/c.stop_movement_after_ms):c.speed||0)*.48;
 patch.pullSpeed=patch.moveSpeed;patch.stompMoveFor=seconds(c.stop_movement_after_ms);patch.stompWait=seconds(c.wait_ms);
 patch.deployStagger=seconds(c.summon_deploy_delay_ms);
 const secondary=c.second_summon?.count||0,unit=source.units[c.summon_character||c.name]||c;
 patch.nativeFormation=(c.count||1)+secondary>1?{primaries:c.count,seconds:secondary,radius:c.summon_radius_milli??unit.spawn_radius_milli??c.collision_radius_milli??500,width:c.summon_width_milli||0,angleShift:unit.spawn_angle_shift_deg||0}:null;
 patch.memberDelays=Array.from({length:(c.count||1)+secondary},(_,i)=>i<(c.count||1)?i*seconds(c.summon_deploy_delay_ms):(i-(c.count||1)+1)*seconds(c.summon_deploy_delay_second_ms));
 if(p){patch.projectileSpeed=p.speed*.48;patch.projectileHoming=!!p.homing;patch.projectileRange=distance(p.projectile_range_milli);patch.shotRadius=distance(p.projectile_radius_milli||p.radius_milli);patch.knockback=distance(p.pushback_milli);patch.splash=distance(p.radius_milli);patch.pierce=!!p.projectile_range_milli&&name==='EliteArcher';}
 if(buff){const duration=seconds(p?.buff_time_ms||c.buff_on_damage?.time_ms);if(buff.speed_multiplier_raw===-100)patch.stun=duration;else if(buff.speed_multiplier_raw<0){patch.slow=duration;patch.slowFactor=1+buff.speed_multiplier_raw/100;patch.slowAttackFactor=buff.hit_speed_multiplier_raw==null?1:1+buff.hit_speed_multiplier_raw/100;}}
 const entry=source.areaEffects[c.deploy_area_effect];if(entry){patch.entryDamage=scaled(entry.damage);patch.entryRadius=distance(entry.radius_milli);patch.entryTowerDamage=scaled(entry.tower_damage);if(entry.buff?.speed_multiplier_raw===-100)patch.entryStun=seconds(entry.buff_time_ms);else if(entry.buff?.speed_multiplier_raw<0){patch.entrySlow=seconds(entry.buff_time_ms);patch.slowFactor=1+entry.buff.speed_multiplier_raw/100;patch.slowAttackFactor=1+entry.buff.hit_speed_multiplier_raw/100;}}
 if(c.charge){patch.chargeDistance=c.charge.charge_range_raw*tile/100;patch.chargeSpeed=c.charge.charge_speed_multiplier_percent/100;patch.chargeDamage=scaled(c.charge.damage_special);patch.charge=true;}
 if(c.dash){Object.assign(patch,{dash:true,dashWindup:seconds(c.dash.cooldown_ms),dashSpeed:c.dash.speed*.48,dashMin:distance(c.dash.min_range_milli),dashMax:distance(c.dash.max_range_milli),dashDamage:scaled(c.dash.damage),dashMultiplier:c.dash.damage/c.damage,dashInvulnerable:true});}
 if(c.spawner){const s=c.spawner;patch.summon=key==='vivero'?'exeggcute':summonKeys[s.character];patch.summonCount=s.number;patch.summonSpacing=seconds(s.interval_ms);patch.summonEvery=seconds(s.pause_time_ms+(s.number-1)*(s.interval_ms||0));patch.firstSummon=seconds(s.start_time_ms);patch.summonMax=s.limit??0;patch.summonDeployTime=seconds(source.units[s.character]?.deploy_time_ms)||1;}
 if(c.life_state_spawner){const s=c.life_state_spawner;Object.assign(patch,{summon:'raltsToken',summonCount:s.number,summonEvery:seconds(s.spawn_interval_ms),firstSummon:seconds(s.action_delay_ms),summonMax:0,summonDeployTime:seconds(source.units[s.character]?.deploy_time_ms),summonRequiresEnemy:true,summonOffset:distance(s.offset_milli),summonAngle:s.offset_angle_deg,passive:true});}
 if(c.interval_spawner){const s=c.interval_spawner;Object.assign(patch,{summon:'fireSpiritToken',summonCount:1,summonEvery:seconds(s.interval_ms),firstSummon:seconds(s.interval_ms-s.start_counter_at_ms),summonDeployTime:seconds(s.deploy_time_ms),summonOwnerOffset:{x:s.mirrored_x*tile/2,y:s.mirrored_y*tile/2},style:'ember',attackAnim:'Shoot'});}
 if(c.death_spawn){patch.deathSpawn=key==='vivero'?'exeggcute':c.death_spawn.character==='SpearGoblin'?'raltsToken':summonKeys[c.death_spawn.character];patch.deathCount=c.death_spawn.count;patch.deathSpawnRadius=distance(c.death_spawn.radius_milli);patch.deathSpawnDelay=seconds(c.death_spawn.deploy_time_ms)||1;}
 if(c.target_only_buildings)patch.pullRange=patch.sightRange;
 if(c.jump){patch.riverJump=true;patch.riverJumpSpeed=c.jump.speed*.48;patch.riverJumpHeight=distance(c.jump.height_raw);}
 if(name==='ElectroWizard'){patch.bolts=2;patch.rangedAttack=true;patch.style='lightning';}
 if(name==='BabyDragon')patch.style='ember';
 if(name==='Wizard')patch.style=key==='gardevoir'?'confusion':key==='venusaur'?'leaf':'ember';
 if(name==='IceWizard'){patch.style=key==='bulbasaur'?'leaf':'ice';patch.rangedAttack=true;}
 if(name==='EliteArcher'){patch.style='psychic';patch.splash=0;}
 if(name==='BlowdartGoblin'){patch.style='leaf';patch.attackAnim='Shoot';}
 if(name==='ElectroDragon'){patch.chain=2;patch.chainMultiplier=1;patch.chainRange=distance(p?.chained_hit_radius_milli||3000);patch.style='lightning';}
 if(name==='ElectroSpirit'){patch.jumpRange=distance(c.range_milli);patch.jumpDuration=null;patch.chain=8;patch.chainMultiplier=1;patch.chainRange=distance(p.chained_hit_radius_milli);patch.splash=0;patch.style='lightning';}
 if(name==='FireSpirits'){patch.jumpRange=distance(c.range_milli);patch.jumpDuration=null;patch.style='ember';}
 if(name==='Bowler'){patch.rollingShot=true;patch.splash=0;patch.style='rock';}
 if(name==='Valkyrie')patch.style='slam';
 if(name==='Tombstone'||name==='BarbarianHut')patch.passive=true;
 if(key==='pandilla'){patch.squad=['poochyenaToken','poochyenaToken','poochyenaToken','raltsToken','raltsToken','raltsToken'];patch.count=6;patch.formation=[[-.8,-.35],[0,-.65],[.8,-.35],[-.8,.7],[0,.7],[.8,.7]];}
 if(key==='shuppetToken')patch.flying=false;
 patch.attackKind=patch.rangedAttack?'ranged':'melee';
 if(name==='BarrelGoblin')patch.vulnerableDuringDeploy=true;
 profiles[key]=patch;audit.push({key,reference:name,sourceFields:Object.keys(c).filter(k=>c[k]!==null),patch});
}
const nativeSpellNames={thunder:'Zap',fireball:'Fireball',log:'Log',pinMissile:'Arrows',lightning:'Lightning',hyperBeam:'Rocket',blizzard:'Freeze',nightmare:'Graveyard',earthquake:'Earthquake',sneaselAmbush:'GoblinBarrel',whirlpool:'Tornado'};
for(const[key,name]of Object.entries(nativeSpellNames)){
 const c=source.cards.find(c=>c.name===name),ae=c.spell.area_effect_object,p=c.projectile||ae?.projectile,patch={nativeReference:name,cost:c.elixir,castDelay:0};
 if(p?.damage!=null){patch.damage=scaled(p.damage);patch.towerDamage=Math.ceil(patch.damage*p.crown_tower_damage_percent/100);patch.splash=distance(p.radius_milli||c.spell.radius_milli);}
 if(ae?.damage!=null){patch.damage=scaled(ae.damage);patch.towerDamage=scaled(ae.tower_damage);patch.splash=distance(ae.radius_milli);}
 if(ae?.buff?.speed_multiplier_raw===-100)patch.stun=seconds(ae.buff_time_ms);
 if(key==='fireball')Object.assign(patch,{travelSpeed:p.speed*.48,knockback:distance(p.pushback_milli)});
 if(key==='log'){const rolling=p.spawn_projectile,d=scaled(rolling.damage);Object.assign(patch,{damage:d,towerDamage:Math.ceil(d*rolling.crown_tower_damage_percent/100),travelDistance:distance(rolling.projectile_range_milli),travelSpeed:rolling.speed*.48,splash:distance(rolling.projectile_radius_milli),sweepHalfLength:distance(rolling.projectile_radius_y_milli),knockback:distance(rolling.pushback_milli),groundOnly:true});}
 if(key==='pinMissile')Object.assign(patch,{splash:distance(c.spell.radius_milli),waves:c.spell.projectile_waves,waveEvery:seconds(c.spell.projectile_wave_interval_ms),travelSpeed:p.speed*.48});
 if(key==='hyperBeam')Object.assign(patch,{travelSpeed:p.speed*.48,groundOnly:false});
 if(key==='lightning')Object.assign(patch,{splash:distance(ae.radius_milli),stun:seconds(p.buff_time_ms),targetLimit:3,hitEvery:seconds(ae.hit_speed_ms)});
 if(key==='blizzard')Object.assign(patch,{freeze:seconds(ae.buff_time_ms)});
 if(key==='sneaselAmbush')Object.assign(patch,{spawnKey:'sneaselToken',spawnTotal:c.spell.spawn.count,spawnDeployTime:seconds(c.spell.spawn.deploy_time_ms),spawnRadius:distance(p.radius_milli),travelSpeed:p.speed*.48});
 if(key==='earthquake'){const b=ae.buff,d=scaled(b.damage_per_second);Object.assign(patch,{damage:0,towerDamage:0,splash:distance(ae.radius_milli),fieldDuration:seconds(ae.life_duration_ms),fieldDamage:d,fieldTowerDamage:Math.ceil(d*b.crown_tower_damage_percent/100),fieldBuildingDamage:scaled(ae.hidden_split.damage),fieldTick:seconds(b.hit_frequency_ms),fieldSlow:seconds(ae.buff_time_ms),fieldSlowFactor:.5,fieldSlowAttackFactor:1,affectsHidden:true,groundOnly:true});}
 if(key==='nightmare')Object.assign(patch,{damage:0,towerDamage:0,splash:distance(ae.radius_milli),fieldDuration:seconds(ae.life_duration_ms),spawnKey:'shuppetToken',spawnTotal:ae.schedule.entries.length,spawnSchedule:ae.schedule.entries.map(e=>({at:seconds(e.delay_ms),x:distance(e.x.offset_milli),y:distance(e.y.offset_milli),deploy:seconds(e.deploy_time_ms)}))});
 if(key==='whirlpool'){const b=ae.buff,pulse=Math.floor(scaled(b.damage_per_second)*b.hit_frequency_ms/1000);Object.assign(patch,{damage:0,towerDamage:0,splash:distance(ae.radius_milli),fieldDuration:seconds(ae.life_duration_ms),fieldTick:seconds(b.hit_frequency_ms),fieldDamage:scaled(b.damage_per_second),fieldPulseDamage:pulse,fieldPulseTowerDamage:Math.ceil(pulse*b.crown_tower_damage_percent/100),fieldTowerDamage:scaled(b.damage_per_second)*b.crown_tower_damage_percent/100,nativePull:true,pull:0,pullPercent:b.attract_percentage,fieldStep:seconds(ae.hit_speed_ms),buffDuration:seconds(ae.buff_time_ms),spellAsDeploy:!!c.spell.spell_as_deploy,groundOnly:false});}
 profiles[key]=patch;audit.push({key,reference:name,sourceFields:Object.keys(c),patch});
}
// A different tower scaling ladder is measured in the native live-level fixture.
const towers={princess:{hp:3052,damage:109,interval:.8,windup:.8,range:180,radius:24,projectileSpeed:288,projectileStart:7.2},king:{hp:4824,damage:109,interval:1,windup:.5,range:168,radius:33.6,projectileSpeed:480,projectileStart:18}};
const clean=value=>typeof value==='number'?Math.round(value*1e9)/1e9:Array.isArray(value)?value.map(clean):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,clean(v)])):value;
for(const[key,profile]of Object.entries(profiles))profiles[key]=clean(profile);
const header='// Generated by scripts/update-native-balance.mjs. Source: CR-NATIVE-2026-11-03.json.\n// Troop speed *.48 is measured. Projectile speed uses the provisional native tick conversion; see the audit.\n';
fs.writeFileSync(new URL('../dist/current-reference.js',import.meta.url),header+'export const CURRENT_REFERENCE_BALANCE = '+JSON.stringify(profiles,null,2)+';\nexport const REFERENCE_TOWERS = '+JSON.stringify(towers,null,2)+';\n');
fs.writeFileSync(new URL('../docs/NATIVE-BALANCE-AUDIT-2026-11-14.json',import.meta.url),JSON.stringify({source:source.source,level:11,units:'24u/tile',coverage:audit.length,troopSpeed:'Native Speed millitiles per50ms, *.48 units/s, measured',projectileSpeed:'Provisional *.48; native projectile trajectories require additional live calibration. No claim of universal path/trade identity.',attackRange:'Range+attacker collision radius+target collision radius; RoyaleSim measured ATTACK_RANGE_RULE',firstAttack:'HitSpeed-LoadTime; RoyaleSim measured progress_credit',towerScaling:'Measured live_levels.json:3052/4824HP and109damage atL11',nativeProfiles:audit,originalAdaptations:ORIGINAL_ADAPTATIONS},null,2)+'\n');
console.log(`Generated ${audit.length} complete native field profiles.`);
