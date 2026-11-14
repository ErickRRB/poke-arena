import { Game, CARDS } from '/engine.js?v=26';
import { ARENA, DEPLOY_GRID, TILE, LANES, RIVER, PRINCESS_Y, KING_Y, ARENA_CAMERA, arenaProjection, screenToWorld, worldToScreen, arenaBits } from '/arena-geometry.js?v=26';
import { LEGAL_CAMERA_SCENARIOS, runLegalCameraScenario } from './native-camera-legal-scenarios.mjs';
import { SPRITE_GEOMETRY } from '/sprite-geometry.js';

const app=globalThis.__nativeCameraApp,r=app.renderer,canvas=r.canvas,draw=r.draw.bind(r);
r.draw=()=>{};app.game.step=()=>{};
const legalMode=new URL(import.meta.url).searchParams.has('legal'),outliersMode=legalMode||new URL(import.meta.url).searchParams.has('outliers');
const keys=(legalMode?['golem','rayquaza','sneaselToken','roselia','pikachu']:outliersMode?['golem','rayquaza']:['golem','graveler','geodude','charizard','scyther','salamence','dragonite','pidgeot','celebi','regirock','snorlax','rhydon']).filter(key=>CARDS[key]);
const ready=r.ensureSpecies(keys.map(key=>CARDS[key].id));
const rect=node=>{const b=node.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height};};
const rects=()=>Object.fromEntries(['arena','arena-frame','hand','energy-bar','battle-overlays'].map(id=>[id,document.getElementById(id)]).filter(([,node])=>node).map(([id,node])=>[id,rect(node)]));
const hudRects=()=>[...document.querySelectorAll('.battle-hud .trainer-id,.battle-hud .battle-clock,#match-pause,#match-leave')].map(node=>({selector:node.id?'#'+node.id:'.'+[...node.classList].join('.'),...rect(node)})).filter(b=>b.width&&b.height);
const unit=(key,id,x,y,dx=0,dy=-1)=>{const card=CARDS[key];return{key,id,x,y,dx,dy,team:0,card,hp:card.hp||1000,maxHp:card.hp||1000,radius:card.radius||14,anim:0,attack:0,spawn:0,hit:0,stun:0,slow:0,shield:0,freeze:0,moving:false,attackSeq:0,scale:card.scale??1.5};};
const towers=()=>app.game.towers.map(tower=>({...tower,x:tower.king?300:LANES[tower.lane??(tower.x<300?0:1)],y:(tower.king?KING_Y:PRINCESS_Y)[tower.team],attack:0,stun:0,freeze:0,hit:0}));
function fixture(units=[],withTowers=true){
  return{state:'playing',towers:withTowers?towers():[],units,fields:[],spells:[],projectiles:[],energy:[10,10],
    canDeploy:(team,key,x,y)=>x>ARENA.left&&x<ARENA.right&&y>RIVER.bottom&&y<ARENA.bottom&&!(arenaBits(x,y)&16),
    resolveDeployment:(team,key,x,y)=>({x,y}),deploymentPositions:(team,key,x,y)=>[{x,y}],deploymentThreats:()=>[]};
}
function reset(){r.resetVisuals();r.effects=[];r.particles=[];r.numbers=[];r.t=0;r.reduced=false;r.selection=null;r.pointer=null;r.tutorialSpot=false;r.healthStates.clear();}

const imageKeys=new Map();let activeUnit=null,draws=[],bridgeCalls=[],bankCalls=[];
function connectedBounds(data,width,height){
  const seen=new Uint8Array(width*height),components=[];
  for(let i=0;i<seen.length;i++)if(!seen[i]&&data[i*4+3]>=128){
    const stack=[i];seen[i]=1;let count=0,left=width,top=height,right=0,bottom=0;
    while(stack.length){const at=stack.pop(),x=at%width,y=Math.floor(at/width);count++;left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);
      for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const xx=x+ox,yy=y+oy,n=yy*width+xx;if(xx>=0&&xx<width&&yy>=0&&yy<height&&!seen[n]&&data[n*4+3]>=128){seen[n]=1;stack.push(n);}}
    }
    components.push({pixels:count,bounds:[left,top,right,bottom]});
  }
  return components.sort((a,b)=>b.pixels-a.pixels);
}
const sprite=r.sprite.bind(r),nativeDraw=r.ctx.drawImage.bind(r.ctx);
r.sprite=(c,actor,...args)=>{const previous=activeUnit;activeUnit=actor;try{return sprite(c,actor,...args);}finally{activeUnit=previous;}};
r.ctx.drawImage=(image,...args)=>{
  if(image===r.battleArt.images.get('assets/battle/arena-bridge-v2.webp'))bridgeCalls.push(args.slice(4));
  if(image===r.battleArt.images.get('assets/battle/riverbank-v2.webp'))bankCalls.push(args.slice(4));
  if(activeUnit&&args.length===8&&(imageKeys.has(image)||image instanceof HTMLCanvasElement)){
    const [sx,sy,sw,sh,x,y,w,h]=args,probe=document.createElement('canvas');probe.width=sw;probe.height=sh;
    const pc=probe.getContext('2d',{willReadFrequently:true});pc.drawImage(image,sx,sy,sw,sh,0,0,sw,sh);
    const data=pc.getImageData(0,0,sw,sh).data;let left=sw,top=sh,right=-1,bottom=-1;
    for(let yy=0;yy<sh;yy++)for(let xx=0;xx<sw;xx++)if(data[(yy*sw+xx)*4+3]>0){left=Math.min(left,xx);top=Math.min(top,yy);right=Math.max(right,xx);bottom=Math.max(bottom,yy);}
    if(right>=left){
      const world={left:x+left/sw*w,top:y+top/sh*h,right:x+(right+1)/sw*w,bottom:y+(bottom+1)/sh*h};
      const b=canvas.getBoundingClientRect(),a=worldToScreen({x:world.left,y:world.top},b.width,b.height),z=worldToScreen({x:world.right,y:world.bottom},b.width,b.height),m=r.ctx.getTransform();
      const actual={left:(m.a*world.left+m.c*world.top+m.e)*b.width/canvas.width,top:(m.b*world.left+m.d*world.top+m.f)*b.height/canvas.height,right:(m.a*world.right+m.c*world.bottom+m.e)*b.width/canvas.width,bottom:(m.b*world.right+m.d*world.bottom+m.f)*b.height/canvas.height};
      const row={key:activeUnit.key,id:activeUnit.card.id,direction:{x:activeUnit.dx,y:activeUnit.dy},opacity:r.ctx.globalAlpha,nativeDestination:{x,y,width:w,height:h},animation:imageKeys.get(image)?.name||'articulated-native',world,css:{left:a.x,top:a.y,right:z.x,bottom:z.y},actualCss:actual,
        overflowCss:{left:Math.max(0,-a.x),top:Math.max(0,-a.y),right:Math.max(0,z.x-b.width),bottom:Math.max(0,z.y-b.height)}};
      if(outliersMode&&['golem','rayquaza'].includes(activeUnit.key)){
        const components=connectedBounds(data,sw,sh),alphaValues=[...new Set(Array.from({length:sw*sh},(_,i)=>data[i*4+3]))].sort((a,b)=>a-b),bounds=components.map(component=>component.bounds);
        const box=[Math.min(...bounds.map(b=>b[0])),Math.min(...bounds.map(b=>b[1])),Math.max(...bounds.map(b=>b[2])),Math.max(...bounds.map(b=>b[3]))];
        const project=box=>{
          const world={left:x+box[0]/sw*w,top:y+box[1]/sh*h,right:x+box[2]/sw*w,bottom:y+box[3]/sh*h},a=worldToScreen({x:world.left,y:world.top},b.width,b.height),z=worldToScreen({x:world.right,y:world.bottom},b.width,b.height);
          return{world,css:{left:a.x,top:a.y,right:z.x,bottom:z.y},overflowCss:{left:Math.max(0,-a.x),top:Math.max(0,-a.y),right:Math.max(0,z.x-b.width),bottom:Math.max(0,z.y-b.height)}};
        };
        row.source={frame:sx/sw,direction:sy/sh,size:{width:sw,height:sh},alphaValues,components};row.alpha128={sourceBounds:box,...project(box)};
        row.bodyComponentDiagnostic={note:'Largest 8-connected component only. Some Golem Hurt white/gray hit marks touch it diagonally; it is a conservative union, not a semantic body mask.',sourceBounds:components[0].bounds,...project(components[0].bounds)};
        row.physicalBodyDiagnostic={note:'Full connected native body; no embedded projectile/effect is visible in the Rayquaza poses.',sourceBounds:components[0].bounds,...project(components[0].bounds)};
        if(activeUnit.key==='golem'&&row.animation==='Hurt'){
          const black=[sw,sh,0,0];
          for(let yy=0;yy<sh;yy++)for(let xx=0;xx<sw;xx++){const at=(yy*sw+xx)*4;if(data[at+3]>=128&&data[at]===0&&data[at+1]===0&&data[at+2]===0){black[0]=Math.min(black[0],xx);black[1]=Math.min(black[1],yy);black[2]=Math.max(black[2],xx+1);black[3]=Math.max(black[3],yy+1);}}
          const outside=new Set();for(let yy=0;yy<sh;yy++)for(let xx=0;xx<sw;xx++){const at=(yy*sw+xx)*4;if(data[at+3]>=128&&(xx<black[0]||xx>=black[2]||yy<black[1]||yy>=black[3]))outside.add([data[at],data[at+1],data[at+2]].join(','));}
          row.physicalBodyDiagnostic={note:'Golem Hurt body outline, manually checked in all 16 source poses. Every pixel outside the black-outline bounds is one of the three white-hit-mark colors listed here. This is measurement only: all original body/effect pixels remain rendered.',sourceBounds:black,outsideRgb:[...outside].sort(),...project(black)};
        }
        if(legalMode){
          const bodyBox=row.physicalBodyDiagnostic.sourceBounds,hud=hudRects();let pixels=0,area=0;
          for(let yy=bodyBox[1];yy<bodyBox[3];yy++)for(let xx=bodyBox[0];xx<bodyBox[2];xx++)if(data[(yy*sw+xx)*4+3]>=128){
            const first=worldToScreen({x:x+xx/sw*w,y:y+yy/sh*h},b.width,b.height),last=worldToScreen({x:x+(xx+1)/sw*w,y:y+(yy+1)/sh*h},b.width,b.height);let covered=0;
            for(const box of hud)covered+=Math.max(0,Math.min(last.x+b.x,box.x+box.width)-Math.max(first.x+b.x,box.x))*Math.max(0,Math.min(last.y+b.y,box.y+box.height)-Math.max(first.y+b.y,box.y));
            if(covered>1e-8){pixels++;area+=covered;}
          }
          row.hudOpaqueIntersection={sourcePixels:pixels,projectedAreaCss:area,note:'Projected alpha>=128 body pixels intersect HUD rectangles; body/effect distinction follows the checked outline bounds. This does not measure browser compositing at subpixel edges.'};
        }
      }
      draws.push(row);
    }
  }
  return nativeDraw(image,...args);
};
function render(scene,selection=null,time=0){reset();r.t=time;r.selection=selection;r.pointer=selection?{x:LANES[0],y:652}:null;draws=[];bridgeCalls=[];bankCalls=[];draw(scene,0);return draws;}
function overview(){
  const actors=[unit('golem',201,300,596),unit('graveler',202,LANES[0],552),unit('geodude',203,LANES[1],552),unit('charizard',204,LANES[0],302),unit('scyther',205,LANES[1],302),unit('celebi',206,300,242)];
  const before=rects(),bodies=render(fixture(actors),'pikachu'),selected=rects(),loading=document.getElementById('loading'),hidden=loading.hidden;
  loading.hidden=false;const transient=rects();loading.hidden=hidden;
  const b=canvas.getBoundingClientRect(),p=arenaProjection(b.width,b.height),points=[];
  for(const point of [{x:ARENA.left,y:ARENA.top},{x:ARENA.right,y:ARENA.bottom},{x:96,y:28},{x:504,y:772},...LANES.flatMap(x=>[{x,y:RIVER.top},{x,y:RIVER.bottom}])]){
    const screen=worldToScreen(point,b.width,b.height),roundTrip=screenToWorld(screen,b.width,b.height);points.push({world:point,screen,roundTrip});
  }
  return{viewport:{width:innerWidth,height:innerHeight},board:rect(canvas),bitmap:{width:canvas.width,height:canvas.height},verticalScale:r.verticalScale,projection:p,worldBounds:r.worldBounds,arena:ARENA,camera:ARENA_CAMERA,grid:DEPLOY_GRID,lanes:LANES,river:RIVER,cellCss:{width:TILE*p.scale,height:TILE*p.scale},rects:{before,selected,transient},hud:hudRects(),bridgeCalls,bankCalls,points,bodies};
}
function edgeScene(){
  const actors=[unit('golem',301,96,28,1,0),unit('celebi',302,300,28,0,-1),unit('dragonite',303,504,28,-1,0),unit('graveler',304,96,404,1,0),unit('rhydon',305,504,404,-1,0),unit('charizard',306,96,772,0,1),unit('salamence',307,504,772,0,1)];
  const bodies=render(fixture(actors,false));return{bodies};
}
function edgeMeasurements(){
  const results=[],directions=Array.from({length:8},(_,i)=>({x:Math.cos(Math.PI/2-i*Math.PI/4),y:Math.sin(Math.PI/2-i*Math.PI/4)}));
  for(const key of keys)for(const state of ['idle','move','contact'])for(const [edge,x,y]of[['top',300,28],['left',96,400],['right',504,400],['bottom',300,772]])for(let direction=0;direction<8;direction++){
    const a=unit(key,1,x,y,directions[direction].x,directions[direction].y);
    if(state==='move')a.moving=true;
    if(state==='contact'){a.attackDuration=a.card.attackDuration||.75;a.attackWindup=a.card.windup??.3;a.attack=a.attackDuration-a.attackWindup;}
    const bodies=render(fixture([a],false));
    const board=canvas.getBoundingClientRect(),hud=hudRects();
    const hudIntersections=bodies.flatMap(body=>hud.map(box=>({selector:box.selector,width:Math.max(0,Math.min(body.css.right+board.x,box.x+box.width)-Math.max(body.css.left+board.x,box.x)),height:Math.max(0,Math.min(body.css.bottom+board.y,box.y+box.height)-Math.max(body.css.top+board.y,box.y))})).filter(box=>box.width>0&&box.height>0));
    results.push({key,state,edge,direction,anchor:{x,y},bodies,hudIntersections});
  }
  return results;
}
function placementSamples(){
  const queried=[],scene=fixture(),can=scene.canDeploy;scene.canDeploy=(team,key,x,y)=>{queried.push({x,y});return can(team,key,x,y);};
  render(scene,'pikachu');return{count:queried.length,minX:Math.min(...queried.map(p=>p.x)),maxX:Math.max(...queried.map(p=>p.x)),minY:Math.min(...queried.map(p=>p.y)),maxY:Math.max(...queried.map(p=>p.y))};
}
function layoutProbe(){
  const game=new Game({seed:402});game.start();game.aiEnabled=false;game.towers=[];game.units=[];game.energy=[10,10];reset();
  const before=rects();r.selection='pikachu';draws=[];bridgeCalls=[];bankCalls=[];draw(game,0);const selected=rects(),loading=document.getElementById('loading'),hidden=loading.hidden;
  loading.hidden=false;const transient=rects();loading.hidden=hidden;
  const b=canvas.getBoundingClientRect(),p=arenaProjection(b.width,b.height),points=[{x:ARENA.left,y:ARENA.top},{x:ARENA.right,y:ARENA.bottom},{x:96,y:28},{x:504,y:772},...LANES.flatMap(x=>[{x,y:RIVER.top},{x,y:RIVER.bottom}])].map(world=>{const screen=worldToScreen(world,b.width,b.height);return{world,screen,roundTrip:screenToWorld(screen,b.width,b.height)};});
  return{viewport:{width:innerWidth,height:innerHeight},board:rect(canvas),bitmap:{width:canvas.width,height:canvas.height},backgroundCache:{origin:r.backgroundOrigin||{x:0,y:0},width:r.background.width,height:r.background.height},verticalScale:r.verticalScale,projection:p,worldBounds:r.worldBounds,arena:ARENA,camera:ARENA_CAMERA,grid:DEPLOY_GRID,lanes:LANES,river:RIVER,cellCss:{width:TILE*p.scale,height:TILE*p.scale},rects:{before,selected,transient},hud:hudRects(),bridgeCalls,bankCalls,points,bodies:[]};
}
const contrast=document.createElement('canvas');contrast.width=600;contrast.height=800;
const contrastContext=contrast.getContext('2d');for(let y=0;y<800;y+=24)for(let x=0;x<600;x+=24){contrastContext.fillStyle=((x+y)/24)%2?'#263a53':'#304660';contrastContext.fillRect(x,y,24,24);}
function outlierScene(key,state,direction,edge){
  const positions={center:[300,500],left:[96,500],right:[504,500],top:[300,28]},[x,y]=positions[edge],angle=Math.PI/2-direction*Math.PI/4;
  const g=new Game({seed:401});g.start();g.aiEnabled=false;g.towers=[];g.units=[];
  const hurt=state.startsWith('hurt'),a=g.spawn(key,0,x+(hurt?12:0),y,0);a.dx=Math.cos(angle);a.dy=Math.sin(angle);
  const initial={x:a.x,y:a.y};let pushed=null;
  if(hurt){pushed=g.pushUnit(a,-12,0,{force:true});if(state==='hurt1')g.tickStatus(a,.05);}
  else if(state==='contact'){
    const target=g.spawn('golem',1,x+a.dx*60,y+a.dy*60,0);g.attack(a,target);g.tickStatus(a,a.attackWindup);g.units=[a];
  }
  const background=r.background,pattern=r.landscapePattern,water=r.drawWater;r.background=contrast;r.landscapePattern='#263a53';r.drawWater=()=>{};
  let bodies;try{bodies=render(g);}finally{r.background=background;r.landscapePattern=pattern;r.drawWater=water;}
  return{key,state,direction,edge,initial,anchor:{x:a.x,y:a.y},pushed,pushHurt:a.pushHurt??0,attack:a.attack,attackWindup:a.attackWindup,bodies,board:rect(canvas),hud:hudRects()};
}
function outlierMeasurements(){const samples=[];for(const[key,states]of[['rayquaza',['idle','contact']],['golem',['idle','hurt0','hurt1']]])for(const state of states)for(const edge of ['center','left','right','top'])for(let direction=0;direction<8;direction++)samples.push(outlierScene(key,state,direction,edge));return samples;}
function nativeContacts(){return[[384,'Shoot',2],[76,'Hurt',0],[76,'Hurt',1]].map(([id,animation,frame])=>{
  const meta=r.metadata[id][animation],image=r.sprites.get(`${id}-${animation}`),sheet=document.createElement('canvas'),zoom=4;sheet.width=meta.width*zoom*4;sheet.height=meta.height*zoom*2;
  const c=sheet.getContext('2d');c.fillStyle='#233145';c.fillRect(0,0,sheet.width,sheet.height);c.imageSmoothingEnabled=false;
  for(let direction=0;direction<8;direction++){const x=direction%4*meta.width*zoom,y=Math.floor(direction/4)*meta.height*zoom;c.drawImage(image,frame*meta.width,direction*meta.height,meta.width,meta.height,x,y,meta.width*zoom,meta.height*zoom);c.fillStyle='white';c.font='12px monospace';c.fillText(['S','SE','E','NE','N','NW','W','SW'][direction],x+5,y+15);}
  return{file:`${id}-${animation.toLowerCase()}-${frame}-native-contact.png`,source:meta.file,frame,directions:8,png:sheet.toDataURL('image/png').split(',')[1]};
});}
function legalScenario(name,stopFrame=null){
  reset();const samples=[];
  const result=runLegalCameraScenario({Game},name,{stopFrame,onEvent:event=>r.onEvent(event),onFrame:(game,frame,definition)=>{
    if(frame===0)r.t=game.elapsed;draws=[];bridgeCalls=[];bankCalls=[];draw(game,frame?1/60:0);
    const tracked=draws.filter(body=>body.key===definition.key&&body.physicalBodyDiagnostic);
    if(tracked.length)samples.push({frame,at:game.elapsed,bodies:tracked,actors:game.units.filter(u=>u.key===definition.key).map(u=>({id:u.id,x:u.x,y:u.y,dx:u.dx,dy:u.dy,spawn:u.spawn,attack:u.attack,pushHurt:u.pushHurt??0,hp:u.hp}))});
  }});
  return{name,key:result.definition.key,duration:result.definition.duration,origin:result.origin,deployments:result.deployments,events:result.events,samples};
}
function roleReading(){
  const game=new Game({seed:4382});game.start();game.aiEnabled=false;
  const placed=[['golem',168,532],['rayquaza',432,532],['pikachu',168,700],['roselia',432,700]].map(([key,x,y])=>{if(!game.canDeploy(0,key,x,y))throw Error('Invalid role-reading position');return game.spawn(key,0,x,y,0);});
  const bodies=render(game),board=canvas.getBoundingClientRect(),rows=placed.map(actor=>({key:actor.key,name:actor.card.name,role:actor.card.role,scale:actor.scale,radius:actor.radius,hp:actor.hp,anchor:{x:actor.x,y:actor.y},body:bodies.find(body=>body.key===actor.key)}));
  const c=r.ctx;c.save();c.setTransform(canvas.width/board.width,0,0,canvas.height/board.height,0,0);c.font='9px sans-serif';c.textAlign='center';c.textBaseline='top';
  for(const [index,row]of rows.entries()){
    const p=worldToScreen(row.anchor,board.width,board.height),width=c.measureText(row.name).width+8;c.fillStyle='#fff9e2ec';c.fillRect(p.x-width/2,p.y+8,width,13);c.fillStyle='#283e35';c.fillText(row.name,p.x,p.y+10);
    const label=row.name+' · '+row.role,lx=(index%2+.5)*board.width/2,ly=60+Math.floor(index/2)*15,lw=c.measureText(label).width+8;c.fillStyle='#fff9e2df';c.fillRect(lx-lw/2,ly,lw,13);c.fillStyle='#283e35';c.fillText(label,lx,ly+2);
  }
  c.restore();return{kind:'Controlled native-size reference, not a simulated paid deployment. All four positions pass actual canDeploy; profile stats and native sprites are unchanged.',rows};
}
function rayFootAudit(){
  const meta=SPRITE_GEOMETRY[384],card=CARDS.rayquaza,rows=[];let maxEmitterError=0;
  for(let direction=0;direction<8;direction++)for(const animation of['Walk','Shoot'])for(let frame=0;frame<meta[animation].durations.length;frame++){
    const angle=Math.PI/2-direction*Math.PI/4,actor=unit('rayquaza',1,300,500,Math.cos(angle),Math.sin(angle)),clip=meta[animation],tick=clip.durations.slice(0,frame).reduce((a,b)=>a+b,0)+.01;let time=0;
    if(animation==='Walk'){actor.moving=true;time=(tick+clip.durations.reduce((a,b)=>a+b,0)*2)/(60*.85)-actor.id*.173;}
    else{const duration=card.attackDuration,windup=card.windup,total=clip.durations.reduce((a,b)=>a+b,0),pre=clip.durations.slice(0,card.attackContactFrame).reduce((a,b)=>a+b,0),elapsed=tick<pre?windup*tick/pre:windup+(duration-windup)*(tick-pre)/(total-pre);actor.attackDuration=duration;actor.attackWindup=windup;actor.attack=duration-elapsed;}
    const body=render(fixture([actor],false),null,time)[0],points=meta[animation].points[direction][frame],destination=body.nativeDestination,pose=r.frameActors.get(actor.id),muzzle=r.visualEmission(pose),head={x:destination.x+points[4]*actor.scale,y:destination.y+points[5]*actor.scale};
    const error=Math.hypot(muzzle.x-head.x-actor.dx*2*actor.scale,muzzle.y-head.y-actor.dy*2*actor.scale);maxEmitterError=Math.max(maxEmitterError,error);
    rows.push({direction,animation,frame,actualFrame:body.source.frame,emitterErrorWorld:error,foot:points.slice(0,2),body:points.slice(2,4),head:points.slice(4,6)});
  }
  const pose=(animation,direction,frame)=>{const m=r.metadata[384][animation],source=r.sprites.get('384-'+animation),p=meta[animation].points[direction][frame],c=document.createElement('canvas');c.width=m.width;c.height=m.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,frame*m.width,direction*m.height,m.width,m.height,0,0,m.width,m.height);const bytes=ctx.getImageData(0,0,m.width,m.height).data;let l=m.width,t=m.height,rr=0,bb=0;for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++)if(bytes[(y*m.width+x)*4+3]){l=Math.min(l,x);t=Math.min(t,y);rr=Math.max(rr,x+1);bb=Math.max(bb,y+1);}const values=[];for(let y=t;y<bb;y++)for(let x=l;x<rr;x++)values.push(...bytes.slice((y*m.width+x)*4,(y*m.width+x)*4+4));return{bounds:[l-p[0],t-p[1],rr-p[0],bb-p[1]],pixels:values,points:p};};
  const recovery=Array.from({length:8},(_,direction)=>{const from=pose('Shoot',direction,meta.Shoot.durations.length-1),to=pose('Walk',direction,0),idle=pose('Idle',direction,0),equal=(a,b)=>JSON.stringify(a.bounds)===JSON.stringify(b.bounds)&&a.pixels.length===b.pixels.length&&a.pixels.every((v,i)=>v===b.pixels[i]);return{direction,shootLastEqualsWalk0:equal(from,to),walk0EqualsIdle0:equal(to,idle),bodyDelta:[2,3].map((i,k)=>(to.points[i]-to.points[k])-(from.points[i]-from.points[k])),headDelta:[4,5].map((i,k)=>(to.points[i]-to.points[k])-(from.points[i]-from.points[k]))};});
  return{kind:'Native pose/emitter reference, not a combat simulation',profile:{movementAnchor:card.movementAnchor,scale:card.scale,attackContactFrame:card.attackContactFrame},frames:rows.length,maxEmitterErrorWorld:maxEmitterError,rows,recovery};
}
globalThis.__nativeCamera={ready:ready.then(()=>{for(const[key,image]of r.sprites){const split=key.indexOf('-');imageKeys.set(image,{id:Number(key.slice(0,split)),name:key.slice(split+1)});}}),overview,edgeScene,edgeMeasurements,placementSamples,layoutProbe,outlierScene,outlierMeasurements,nativeContacts,legalScenario,roleReading,rayFootAudit,legalNames:LEGAL_CAMERA_SCENARIOS.map(s=>s.name)};
