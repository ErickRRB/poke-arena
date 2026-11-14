// Integer ring/spiral rules: RoyaleGym/RoyaleSim formation.rs,
// blob a0166e82e5e0674aee1070675ca1273010fb8c11 (measured197 members).
// Native units are1/1000 tile; each division truncates toward zero.
const SINE=[0,18,36,54,71,89,107,125,143,160,178,195,213,230,248,265,282,299,316,333,350,367,384,400,416,433,449,465,481,496,512,527,543,558,573,587,602,616,630,644,658,672,685,698,711,724,737,749,761,773,784,796,807,818,828,839,849,859,868,878,887,896,904,912,920,928,935,943,949,956,962,968,974,979,984,989,994,998,1002,1005,1008,1011,1014,1016,1018,1020,1022,1023,1023,1024,1024];
const trunc=Math.trunc,sin=a=>{a=(a%360+360)%360;const neg=a>=180;if(neg)a-=180;return SINE[a<=90?a:180-a]*(neg?-1:1);};
export function nativeFormationOffsets(layout,team,anchorX){
 const n=Math.max(1,layout.primaries),s=layout.seconds||0,count=n+s,ownerX=team?600-anchorX:anchorX,lane=ownerX<300?1:2,direction=team?-1:1;
 return Array.from({length:count},(_,index)=>{
  let ring=s?2*Math.max(n,s):n,k=index,r=layout.radius,base=0,mirror=false;
  if(ring===1)return{x:0,y:0};
  if(ring===2){base=layout.angleShift+90;mirror=lane===1;}
  else{
   const rule={3:[180,1],4:[45,2],5:[180,2],6:[0,2]};[base,mirror]=rule[ring]||[0,2];mirror=lane===mirror;
   if(ring===7){if(!k)return{x:0,y:0};k--;ring=6;mirror=false;base=0;}
   if(!layout.width)r=trunc(r*577/Math.max(1,trunc(1000*sin(trunc(90/n))/1024)));
   base+=layout.angleShift;
   if(ring>=7)r=trunc(r*((3*k)%7)/6);
  }
  let ax,ay,ysign=1;
  if(s){
   const half=trunc(trunc(360/ring)/2);let a=half,esi=half;
   if(n<s)a=trunc(trunc(180/s)/2)+half;else if(n>s)esi=trunc(trunc(180/n)/2)+half;
   let edi=k>0?a:90;if(n===1)base=0;else edi=a;
   if(n>1&&s===1){base=0;if(k<n)edi=trunc(90/n);}
   if(k<n){const ang=trunc(k*360/ring);edi+=base;ay=edi+ang;ax=edi+ang+90;}
   else{const ang=trunc((k-n)*360/ring);esi+=base;ay=ang+esi+180;ax=ang+esi+270;}
   ysign=-1;
  }else{const ang=trunc(k*360/ring);ay=ang+base+90;ax=ang+base+180;}
  let x=trunc(sin(ax)*r/1024),y=trunc(sin(ay)*r/(ysign*1024));
  if(layout.width){x=-trunc(layout.width*k/Math.max(1,ring-1))+trunc(layout.width/2);y=-(k%2)*r+trunc(r/2);mirror=lane===1;}else y=-y;
  if(mirror)x=-x;
  return{x:x*.024*direction,y:-y*.024*direction};
 });
}
