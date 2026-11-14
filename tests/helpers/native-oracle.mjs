// Read-only native asset extract, independent of the runtime profile generator.
// This small event oracle covers stationary single-contact melee exchanges.
// It deliberately does not claim to predict paths, splash, flying counterplay,
// spawn graphs or the provisional native projectile conversion.
import fs from 'node:fs';
export const native=JSON.parse(fs.readFileSync(new URL('../../docs/CR-NATIVE-2026-11-03.json',import.meta.url),'utf8'));
export function meleeBody(name){
 const row=native.cards.find(c=>c.name===name)||native.units[name];
 if(!row||row.projectile||row.area_damage_radius_milli||row.charge||row.dash)throw Error('Outside melee oracle: '+name);
 return{hp:Math.floor(row.hitpoints*2.56+1e-9),damage:Math.floor(row.damage*2.56+1e-9),first:(row.hit_speed_ms-(row.load_time_ms||0))/1000,interval:row.hit_speed_ms/1000,shield:Math.floor((row.shield_hitpoints||0)*2.56+1e-9)};
}
export function meleeExchange(first,second){
 const bodies=[meleeBody(first),meleeBody(second)].map(body=>({...body,next:body.first,hits:0}));
 let time=0;
 while(bodies.every(body=>body.hp>0)&&time<120){
  const actor=bodies[0].next<=bodies[1].next+1e-9?0:1,a=bodies[actor],b=bodies[1-actor];time=a.next;a.next+=a.interval;a.hits++;
  if(b.shield>0)b.shield=Math.max(0,b.shield-a.damage);else b.hp=Math.max(0,b.hp-a.damage);
 }
 return{time,tiePolicy:'First argument resolves an exact release-time tie. This is an explicit helper convention, not evidence of the native client simultaneous-hit rule.',bodies:bodies.map(({hp,shield,hits})=>({hp,shield,hits}))};
}
