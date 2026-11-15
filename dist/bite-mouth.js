// Base head rig from the independently accepted native-size Zubat proposal.
// Leading blue lip material corrected after the 97b0 contact composition review.
// Original sprite PNGs remain untouched. This first action uses the genuine
// east/west native bodies; only the local mouth articulation is mirrored.
const P={outline:'#090b19',blue:'#5767b7',light:'#879fff',shine:'#b7cfff',cavity:'#1e1631',gum:'#873f87',tongue:'#af6fb7',fang:'#ffffff'};
const mix=(a,b,t)=>a+(b-a)*t;
function shape(c,color,closed,open,t){
  c.fillStyle=color;c.beginPath();
  closed.forEach(([x,y],i)=>{const p=open[i];c[i?'lineTo':'moveTo'](Math.round(mix(x,p[0],t)),Math.round(mix(y,p[1],t)));});
  c.closePath();c.fill();
}
// The leading blue lip and the lower jaw catch light as they close. These are
// solid parts of the head, inside its existing extent, not a contact flash.
export function drawJawLipEdges(c,x,y,scale,open){
  c.save();c.translate(x,y);c.scale(scale,scale);
  shape(c,P.shine,[[-1,-4],[1,-4],[3,-2],[3,-1],[2,-1],[1,-3],[-1,-3]],
    [[-1,-7],[1,-7],[3,-5],[3,-4],[2,-4],[1,-6],[-1,-6]],open);
  shape(c,P.shine,[[1,1],[3,0],[3,2],[1,3],[-2,3],[-2,2],[0,2]],
    [[1,5],[3,4],[3,6],[1,7],[-2,6],[-2,5],[0,5]],open);
  c.restore();
}
export function drawEastMouth(c,x,y,scale,open){
  open=Math.max(0,Math.min(1,open));
  c.save();c.translate(x,y);c.scale(scale,scale);
  shape(c,P.outline,[[-7,-4],[-5,-6],[-2,-6],[2,-5],[3,-3],[3,2],[1,4],[-3,4],[-7,1]],
    [[-7,-4],[-5,-7],[-2,-8],[2,-7],[3,-5],[3,5],[1,7],[-3,5],[-7,1]],open);
  shape(c,P.blue,[[-6,-3],[-5,-5],[-2,-5],[1,-4],[2,-2],[2,1],[0,3],[-3,3],[-6,0]],
    [[-6,-3],[-5,-6],[-2,-7],[1,-6],[2,-4],[2,4],[0,6],[-3,4],[-6,0]],open);
  shape(c,P.cavity,[[-5,-1],[-2,-2],[2,-2],[2,0],[0,1],[-3,0]],
    [[-5,-2],[-2,-5],[2,-5],[2,4],[0,5],[-4,1]],open);
  shape(c,P.gum,[[-5,0],[-3,0],[-1,1],[-3,1]],
    [[-5,0],[-3,1],[-1,4],[-3,3]],open);
  shape(c,P.tongue,[[-3,0],[-1,0],[0,1],[-2,1]],
    [[-3,2],[-1,3],[0,4],[-2,4]],open);
  shape(c,P.light,[[-5,-4],[-2,-5],[1,-4],[2,-3],[-1,-3],[-4,-2]],
    [[-5,-5],[-2,-7],[1,-6],[2,-5],[-1,-5],[-4,-3]],open);
  shape(c,P.shine,[[-3,-4],[-1,-4],[0,-3],[-2,-3]],
    [[-3,-6],[-1,-6],[0,-5],[-2,-5]],open);
  shape(c,P.light,[[-4,1],[-1,2],[2,1],[1,3],[-2,3],[-5,1]],
    [[-4,2],[-1,5],[2,4],[1,6],[-2,5],[-5,2]],open);
  shape(c,P.fang,[[0,-2],[2,-2],[1,0]],[[0,-5],[2,-5],[1,-2]],open);
  shape(c,P.fang,[[0,1],[2,0],[1,-1]],[[0,4],[2,3],[1,1]],open);
  drawJawLipEdges(c,0,0,1,open);
  c.restore();
}
