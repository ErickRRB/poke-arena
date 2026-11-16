const scratchCanvases=new WeakMap();
const intersects=(a,b,gap=3)=>a.left<b.right+gap&&a.right+gap>b.left&&a.top<b.bottom+gap&&a.bottom+gap>b.top;
const border=entry=>entry.compact?1:2;
const meterRect=entry=>({left:entry.x-entry.width/2-border(entry),right:entry.x+entry.width/2+border(entry),top:entry.y-border(entry),bottom:entry.y+(entry.unit.shield>0?(entry.compact?10:15):(entry.compact?4:entry.unit.maxHp<=1?4:8)+border(entry))});

export function healthMeterWidth(unit,width,bodyHeight=Infinity){return unit.card?.structure?width:Math.min(width,Math.max(18,bodyHeight*.7));}

export function layoutUnitHealth(entries,bounds={left:0,right:600}){
  const result=entries.map(entry=>({...entry})),pending=result.filter(entry=>!entry.unit.card?.structure),groups=[];
  while(pending.length){
    const group=[pending.shift()];
    for(let i=0;i<group.length;i++)for(let j=pending.length-1;j>=0;j--)if(intersects(meterRect(group[i]),meterRect(pending[j])))group.push(...pending.splice(j,1));
    groups.push(group);
  }
  const inBounds=entry=>meterRect(entry).left>=bounds.left&&meterRect(entry).right<=bounds.right;
  for(const group of groups){
    if(group.length<2)continue;
    group.sort((a,b)=>a.x-b.x||a.unit.id-b.unit.id);
    const occupied=result.filter(entry=>!group.includes(entry)).map(meterRect),positions=[];
    let cursor=0;
    for(const entry of group){positions.push(cursor+entry.width/2+border(entry));cursor+=entry.width+2*border(entry)+3;}
    const shift=group.reduce((sum,entry,i)=>sum+entry.x-positions[i],0)/group.length;
    const spread=group.map((entry,i)=>({...entry,x:positions[i]+shift}));
    const clear=entry=>!occupied.some(rect=>intersects(meterRect(entry),rect));
    if(spread.every((entry,i)=>Math.abs(entry.x-group[i].x)<=14&&inBounds(entry)&&clear(entry))){group.forEach((entry,i)=>entry.x=spread[i].x);continue;}
    const neighbors=entry=>group.filter(other=>other!==entry&&intersects(meterRect(entry),meterRect(other))).length;
    const order=[...group].sort((a,b)=>neighbors(b)-neighbors(a)||a.unit.id-b.unit.id);
    for(const entry of order){
      const horizontal=Math.min(12,entry.width*.4),offsets=[-horizontal,0,horizontal],candidates=[];
      for(let x=4;x<horizontal;x+=4)offsets.push(-x,x);
      for(let dy=-48;dy<=48;dy+=4)for(const dx of offsets)candidates.push({...entry,x:entry.x+dx,y:entry.y+dy,score:dx*dx+dy*dy*1.4});
      candidates.sort((a,b)=>a.score-b.score||a.y-b.y||a.x-b.x);
      const point=candidates.find(candidate=>inBounds(candidate)&&clear(candidate));
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
    const body=measure(actor),left=actor.x-body.width/2,right=actor.x+body.width/2,top=body.bottom-body.height,bottom=body.bottom;
    const overlap=Math.max(0,Math.min(right,box.right)-Math.max(left,box.left))*Math.max(0,Math.min(bottom,box.bottom)-Math.max(top,box.top));
    const fraction=overlap/(body.width*body.height);if(fraction<=.1)continue;
    const entry=actor.spawn>0?.2+.8*Math.max(0,1-actor.spawn/Math.max(.001,actor.spawnGroup?.duration??.5)):1;
    regions.push({id:actor.id,x:actor.x,y:(top+bottom)/2,rx:body.width/2+4,ry:body.height/2+4,strength:.86*entry*Math.min(1,(fraction-.1)/.4)});
  }
  return regions;
}

export function drawVisibleStructure(ctx,box,regions,draw){
  const matrix=ctx.getTransform?.(),document=ctx.canvas?.ownerDocument;
  if(!regions.length||!matrix||!document||matrix.a<=0||matrix.d<=0||Math.abs(matrix.b)>1e-8||Math.abs(matrix.c)>1e-8)return draw(ctx);
  const left=Math.floor((box.left-26)*matrix.a+matrix.e),top=Math.floor((box.top-26)*matrix.d+matrix.f);
  const width=Math.ceil((box.right+26)*matrix.a+matrix.e)-left,height=Math.ceil((box.bottom+26)*matrix.d+matrix.f)-top;
  let surface=scratchCanvases.get(ctx.canvas);if(!surface){surface=document.createElement('canvas');scratchCanvases.set(ctx.canvas,surface);}
  if(surface.width!==width||surface.height!==height){surface.width=width;surface.height=height;}
  const paint=surface.getContext('2d');paint.setTransform(1,0,0,1,0,0);paint.clearRect(0,0,width,height);
  paint.setTransform(matrix.a,0,0,matrix.d,matrix.e-left,matrix.f-top);
  for(const name of['globalAlpha','globalCompositeOperation','imageSmoothingEnabled','filter'])paint[name]=ctx[name];
  draw(paint);
  paint.save();paint.globalCompositeOperation='destination-out';paint.globalAlpha=1;paint.filter='none';
  for(const region of regions){
    paint.save();paint.translate(region.x,region.y);paint.scale(region.rx,region.ry);
    const mask=paint.createRadialGradient(0,0,0,0,0,1);mask.addColorStop(0,`rgba(0,0,0,${region.strength})`);mask.addColorStop(.65,`rgba(0,0,0,${region.strength})`);mask.addColorStop(1,'rgba(0,0,0,0)');
    paint.fillStyle=mask;paint.fillRect(-1,-1,2,2);paint.restore();
  }
  paint.restore();ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.filter='none';ctx.drawImage(surface,left,top);ctx.restore();
}
