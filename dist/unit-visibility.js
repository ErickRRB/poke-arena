const scratchCanvases=new WeakMap();
const intersects=(a,b,gap=3)=>a.left<b.right+gap&&a.right+gap>b.left&&a.top<b.bottom+gap&&a.bottom+gap>b.top;
const pixel=entry=>entry.compact?.pixel||1;
const border=entry=>entry.compact?pixel(entry):2;
const gap=entry=>(entry.compact?.dense?2:3)*pixel(entry);
const meterRect=entry=>({left:entry.x-entry.width/2-border(entry),right:entry.x+entry.width/2+border(entry),top:entry.y-border(entry),bottom:entry.y+(entry.unit.shield>0?(entry.compact?10*pixel(entry):15):(entry.compact?(entry.compact.heightCss||4)*pixel(entry):entry.unit.maxHp<=1?4:8)+border(entry))});

export function healthMeterWidth(unit,width,bodyHeight=Infinity,pixelSize){return unit.card?.structure||bodyHeight>32?width:pixelSize?Math.min(width,Math.max(12,Math.round(bodyHeight/pixelSize*.9))*pixelSize):Math.min(width,Math.max(18,bodyHeight*.7));}
export const summoningStructure=card=>!!(card?.structure&&card.summon&&!(card.speed>0));

export function layoutUnitHealth(entries,bounds={left:0,right:600}){
  const result=entries.map(entry=>({...entry})),pending=result.filter(entry=>!entry.unit.card?.structure),groups=[];
  const initialRects=new Map(result.map(entry=>[entry,meterRect(entry)]));
  const offsetsByWidth=new Map(),compare=(a,b)=>a.score-b.score||a.y-b.y||a.x-b.x;
  while(pending.length){
    const group=[pending.shift()];
    for(let i=0;i<group.length;i++)for(let j=pending.length-1;j>=0;j--)if(intersects(initialRects.get(group[i]),initialRects.get(pending[j])))group.push(...pending.splice(j,1));
    groups.push(group);
  }
  const inBounds=entry=>meterRect(entry).left>=bounds.left&&meterRect(entry).right<=bounds.right;
  for(const group of groups){
    if(group.length>=7)for(const entry of group)if(entry.compact){
      const p=pixel(entry);entry.width=Math.min(entry.width,Math.max(8*p,(entry.bodyHeight||entry.width)*.6));
      entry.compact={...(typeof entry.compact==='object'?entry.compact:{}),pixel:p,dense:true,heightCss:3};
      initialRects.set(entry,meterRect(entry));
    }
    group.sort((a,b)=>a.x-b.x||a.unit.id-b.unit.id);
    const occupied=result.filter(entry=>!group.includes(entry)).map(meterRect),positions=[];
    if(group.length<2&&!occupied.some(rect=>intersects(meterRect(group[0]),rect)))continue;
    let cursor=0;
    for(const entry of group){positions.push(cursor+entry.width/2+border(entry));cursor+=entry.width+2*border(entry)+gap(entry);}
    const shift=group.reduce((sum,entry,i)=>sum+entry.x-positions[i],0)/group.length;
    const spread=group.map((entry,i)=>({...entry,x:positions[i]+shift}));
    const clear=entry=>{const box=meterRect(entry);return!occupied.some(rect=>intersects(box,rect));};
    if(spread.every((entry,i)=>Math.abs(entry.x-group[i].x)<=14&&inBounds(entry)&&clear(entry))){group.forEach((entry,i)=>entry.x=spread[i].x);continue;}
    const neighbors=new Map(group.map(entry=>[entry,group.filter(other=>other!==entry&&intersects(initialRects.get(entry),initialRects.get(other))).length]));
    const order=[...group].sort((a,b)=>neighbors.get(b)-neighbors.get(a)||a.unit.id-b.unit.id);
    for(const entry of order){
      const horizontal=Math.min(12,entry.width*.4);
      if(!offsetsByWidth.has(horizontal)){
        const horizontalOffsets=[-horizontal,0,horizontal],grid=[];
        for(let x=4;x<horizontal;x+=4)horizontalOffsets.push(-x,x);
        for(let y=-48;y<=48;y+=4)for(const x of horizontalOffsets)grid.push({x,y,score:x*x+y*y*1.4});
        grid.sort(compare);offsetsByWidth.set(horizontal,{horizontalOffsets,grid});
      }
      const {horizontalOffsets,grid}=offsetsByWidth.get(horizontal);let point;
      for(const offset of grid){const candidate={...entry,x:entry.x+offset.x,y:entry.y+offset.y,score:offset.score};if(inBounds(candidate)&&clear(candidate)){point=candidate;break;}}
      const own=meterRect(entry);
      if(point?.score!==0)for(const rect of occupied)for(const dy of[rect.top-3-own.bottom,rect.bottom+3-own.top])if(Math.abs(dy)<=48)for(const dx of horizontalOffsets){
        const score=dx*dx+dy*dy*1.4;if(point&&score>point.score)continue;
        const candidate={...entry,x:entry.x+dx,y:entry.y+dy,score};
        if((!point||compare(candidate,point)<0)&&inBounds(candidate)&&clear(candidate))point=candidate;
      }
      if(point){entry.x=point.x;entry.y=point.y;}
      occupied.push(meterRect(entry));
    }
  }
  return result;
}

export function structureOcclusionRegions(structure,actors,box,measure){
  if(structure.burrowed)return[];
  const regions=[];
  for(const actor of actors){
    if(!actor.card||actor.card.structure||actor.hp<=0||actor.burrowed||actor.hidden||actor.invisible||(actor.visualSortY??actor.y)>=(structure.visualSortY??structure.y))continue;
    const body=measure(actor);if(!body)continue;
    const left=actor.x-body.width/2,right=actor.x+body.width/2,top=body.bottom-body.height,bottom=body.bottom;
    const overlap=Math.max(0,Math.min(right,box.right)-Math.max(left,box.left))*Math.max(0,Math.min(bottom,box.bottom)-Math.max(top,box.top));
    if(overlap<=0)continue;
    const entry=actor.spawn>0?.2+.8*Math.max(0,1-actor.spawn/Math.max(.001,actor.spawnGroup?.duration??.5)):1;
    regions.push({id:actor.id,x:actor.x,y:(top+bottom)/2,rx:body.width/2+4,ry:body.height/2+4,strength:entry});
  }
  return regions;
}

export function drawVisibleStructure(ctx,box,regions,draw,drawBody){
  const matrix=ctx.getTransform?.(),document=ctx.canvas?.ownerDocument;
  if(!regions.length||!drawBody||!matrix||!document||matrix.a<=0||matrix.d<=0||Math.abs(matrix.b)>1e-8||Math.abs(matrix.c)>1e-8)return draw(ctx);
  const left=Math.floor((box.left-26)*matrix.a+matrix.e),top=Math.floor((box.top-26)*matrix.d+matrix.f);
  const width=Math.ceil((box.right+26)*matrix.a+matrix.e)-left,height=Math.ceil((box.bottom+26)*matrix.d+matrix.f)-top;
  let pool=scratchCanvases.get(ctx.canvas);if(!pool){pool=Array.from({length:6},()=>document.createElement('canvas'));scratchCanvases.set(ctx.canvas,pool);}
  const[surface,bodies,body,outline,edge,shared]=pool;
  for(const canvas of pool){if(canvas.width<width)canvas.width=width;if(canvas.height<height)canvas.height=height;const c=canvas.getContext('2d');c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.filter='none';c.imageSmoothingEnabled=false;c.clearRect(0,0,canvas.width,canvas.height);}
  const paint=surface.getContext('2d');
  paint.setTransform(matrix.a,0,0,matrix.d,matrix.e-left,matrix.f-top);
  for(const name of['globalAlpha','globalCompositeOperation','imageSmoothingEnabled','filter'])paint[name]=ctx[name];
  draw(paint);
  const all=bodies.getContext('2d'),edges=outline.getContext('2d'),current=edge.getContext('2d'),single=body.getContext('2d'),sharedPaint=shared.getContext('2d');
  const cssPixel=ctx.canvas.width/(ctx.canvas.getBoundingClientRect?.().width||ctx.canvas.width);
  for(const region of regions){
    single.setTransform(1,0,0,1,0,0);single.clearRect(0,0,body.width,body.height);single.setTransform(matrix.a,0,0,matrix.d,matrix.e-left,matrix.f-top);drawBody(single,region.id);
    all.drawImage(body,0,0);current.globalCompositeOperation='source-over';current.clearRect(0,0,edge.width,edge.height);
    for(const[x,y]of[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]])current.drawImage(body,x*cssPixel,y*cssPixel);
    current.globalCompositeOperation='destination-out';current.drawImage(body,0,0);
    // Save contour intersections before adding the next outline. This gives
    // adjacent bodies a dark separating edge instead of one joined pale halo.
    paint.setTransform(1,0,0,1,0,0);paint.globalAlpha=1;paint.filter='none';paint.globalCompositeOperation='source-over';
    // The reusable body canvas is no longer needed until the next actor.
    single.setTransform(1,0,0,1,0,0);single.clearRect(0,0,body.width,body.height);single.drawImage(outline,0,0);single.globalCompositeOperation='destination-in';single.drawImage(edge,0,0);sharedPaint.drawImage(body,0,0);single.globalCompositeOperation='source-over';
    edges.drawImage(edge,0,0);
  }
  paint.setTransform(1,0,0,1,0,0);paint.globalAlpha=1;paint.filter='none';
  for(const[canvas,color]of[[outline,'#fff3d0'],[shared,'#14271f']]){
    const c=canvas.getContext('2d');c.globalCompositeOperation='source-in';c.fillStyle=color;c.fillRect(0,0,canvas.width,canvas.height);
    paint.globalCompositeOperation='source-atop';paint.drawImage(canvas,0,0);
  }
  paint.globalCompositeOperation='destination-out';paint.drawImage(bodies,0,0);
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.filter='none';ctx.drawImage(surface,left,top);ctx.restore();
}
