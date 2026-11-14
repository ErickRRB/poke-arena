// Measured client 16.402 layouts (RoyaleGym/RoyaleSim formation.rs and calibration.json).
// Coordinates are tiles relative to one anchor, never individual snapped board cells.
const triangle=r=>[[0,r],[-Math.sqrt(3)*r/2,-r/2],[Math.sqrt(3)*r/2,-r/2]];
export const GROUP_FORMATIONS={
  diglett:[[0,.807],[-.699,-.403],[.699,-.403]],
  diglettHorde:Array.from({length:15},(_,i)=>{
    const radius=2.774*((3*i)%7)/6,angle=(270-i*24)*Math.PI/180;
    if(!radius)return[(i/7-1)*.02,0]; // Distinct center bodies, within half a source pixel.
    return[Math.trunc(Math.cos(angle)*radius*1000)/1000,Math.trunc(Math.sin(angle)*radius*1000)/1000];
  }),
  poochyenaPack:[[-.761,-.761],[.761,-.761],[-.761,.761],[.761,.761]],
  raltsTrio:triangle(.577),beedrill:triangle(.577),
  sandshrew:[[0,.923],[-.799,-.461],[.799,-.461]],
  zubat:Array.from({length:5},(_,i)=>{const a=(45+i*72)*Math.PI/180;return[Math.cos(a)*1.405,Math.sin(a)*1.405];}),
  treecko:[[-.5,0],[.5,0]],
  // User-requested five-member gang: three melee in front, two ranged behind.
  pandilla:[[-.8,-.35],[0,-.65],[.8,-.35],[-.5,.7],[.5,.7]],
};
