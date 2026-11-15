const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));

export function whirlpoolPhase(field,age,reduced=false){
 const remaining=Math.max(0,field.life);
 // The seamless water body is present immediately, while the actual pull exists.
 return{frame:reduced?8:(Math.max(0,age)/.07)%20,opacity:clamp(remaining/.12,0,1)};
}

export function earthquakePhase(field,age,reduced=false){
 const period=field.fieldTick||1,beatAge=age%period;
 return{growth:reduced?1:clamp(age/.22,0,1),pulse:reduced?.35:age<period?.2:Math.exp(-beatAge*8),jitter:reduced?0:Math.sin(age*38)*.7};
}

