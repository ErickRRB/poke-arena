const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));

export function whirlpoolPhase(field,age,reduced=false){
 const remaining=Math.max(0,field.life);
 // The seamless water body is present immediately, while the actual pull exists.
 return{frame:reduced?8:(Math.max(0,age)/.07)%20,opacity:clamp(remaining/.12,0,1)};
}

export function nightmareFrame(age,reduced=false){
 if(reduced)return 7;
 const time=Math.max(0,age),opening=7/18;
 // The atlas closes after frame14 and is blank from24 onward. Its two full
 // portal frames breathe continuously; the field's native fade handles expiry.
 return time<opening?time*18:7+.5-.5*Math.cos((time-opening)*2.4);
}

export function earthquakePhase(field,age,reduced=false){
 const period=field.fieldTick||1,beatAge=age%period;
 return{growth:reduced?1:clamp(age/.34,0,1),pulse:reduced?.35:age<period?.2:Math.exp(-beatAge*8),jitter:reduced?0:Math.sin(age*38)*.7};
}

// Uneven, branching faults leave the centre readable and reach the open ground
// between actors. Coordinates describe ground detail, never an area outline.
const FISSURES=[
 [[-.15,.08],[-.32,.12],[-.43,.27],[-.63,.28],[-.77,.46],[-.87,.42]],
 [[-.08,.18],[.03,.36],[-.04,.53],[.12,.68],[.08,.88]],
 [[.12,.02],[.33,.18],[.48,.12],[.63,.3],[.82,.29],[.9,.37]],
 [[.16,-.06],[.37,-.25],[.53,-.26],[.63,-.47],[.81,-.5]],
 [[-.03,-.12],[.06,-.34],[-.02,-.53],[.14,-.69],[.12,-.88]],
 [[-.13,-.03],[-.35,-.13],[-.49,-.32],[-.68,-.28],[-.83,-.41]],
 [[-.43,.27],[-.48,.46],[-.66,.58]],
 [[.03,.36],[.27,.43],[.35,.59]],
 [[.63,.3],[.65,.54],[.73,.61]],
 [[.37,-.25],[.32,-.43],[.4,-.61]],
 [[.06,-.34],[-.16,-.44],[-.22,-.62]],
 [[-.49,-.32],[-.45,-.53],[-.59,-.66]]
];

export function earthquakeFissures(radius,growth){
 return FISSURES.map((path,index)=>{
  const delay=index<6?index*.035:.32+(index-6)*.035;
  const segments=clamp((growth-delay)/(1-delay),0,1)*(path.length-1),points=[];
  if(!(segments>0))return points;
  points.push(path[0].map(value=>value*radius));
  for(let i=1;i<path.length&&i-1<segments;i++){
   const part=Math.min(1,segments-(i-1));
   points.push(path[i].map((value,axis)=>(path[i-1][axis]+(value-path[i-1][axis])*part)*radius));
  }
  return points;
 });
}

