import { W, H, TILE, DEPLOY_GRID, LANES, RIVER, BRIDGE, PRINCESS_Y, CARDS, DEFAULT_DECK, directionRow, attackPoseProgress } from './engine.js?v=13';

function rect(c, color, x, y, w, h) { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function ellipse(c, color, x, y, rx, ry) { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
function line(c, color, x1, y1, x2, y2, width = 1) { c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function text(c, label, x, y, color = '#f8f1d6', size = 12, weight = 600) { c.font = `${weight} ${size}px "DM Sans", "Segoe UI", sans-serif`; c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x, y); }
const visualScale = unit => unit.scale ?? unit.card?.scale ?? 1.5;
function ball(c, x, y, r, color) {
  c.fillStyle = '#26382f'; c.beginPath(); c.arc(x, y, r + 2, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#e1d9b9'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = color; c.beginPath(); c.arc(x, y, r, Math.PI, Math.PI * 2); c.fill();
  rect(c, '#2b3b31', x - r, y - 1.5, r * 2, 3);
  ellipse(c, '#293c30', x, y, r * .38, r * .38); ellipse(c, '#efdfb0', x, y, r * .2, r * .2);
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.background = document.createElement('canvas'); this.background.width = W; this.background.height = H;
    this.sprites = new Map(); this.metadata = {};
    this.anchors = new Map(); this.bodyHeights = new Map(); this.effects = [];
    this.particles = []; this.rings = []; this.numbers = [];
    this.healthStates=new Map();this.speciesLoads=new Map();this.imageLoads=new Map();
    this.t = 0; this.reduced = false; this.pointer = null; this.selection = null; this.tutorialSpot = false;
    this.buildBackground();
  }
  async load(keys=DEFAULT_DECK) {
    const response = await fetch('assets/pokemon/manifest.json?v=11');
    if (!response.ok) throw new Error('No se pudo cargar el archivo de sprites.');
    this.metadata = await response.json();
    await this.ensureSpecies([...keys.map(k=>CARDS[k]?.id),31,34,52].filter(Boolean));
  }
  ensureSpecies(ids){if(!Object.keys(this.metadata).length)return Promise.resolve();return Promise.all([...new Set(ids)].map(id=>{
    if(this.speciesLoads.has(id))return this.speciesLoads.get(id);
    const names=new Set(['Walk','Idle','Attack','Hurt',...([31,34,52].includes(Number(id))?['Shoot']:[]),...Object.values(CARDS).filter(c=>c.id===Number(id)).map(c=>c.attackAnim)]);
    const pending=Promise.all(Object.entries(this.metadata[id]||{}).filter(([name])=>names.has(name)).map(async([name,meta])=>{
      const loadImage=file=>{if(!this.imageLoads.has(file)){const image=new Image();image.src=file;this.imageLoads.set(file,image.decode().then(()=>image));}return this.imageLoads.get(file);};
      const img=await loadImage(meta.file);
      this.sprites.set(`${id}-${name}`, img);
      const shadow=await loadImage(meta.shadow);
      const surface=document.createElement('canvas');surface.width=shadow.width;surface.height=shadow.height;
      const ctx=surface.getContext('2d',{willReadFrequently:true});ctx.drawImage(shadow,0,0);
      const pixels=ctx.getImageData(0,0,shadow.width,shadow.height).data,anchors=[];
      for(let y=0;y<shadow.height;y++)for(let x=0;x<shadow.width;x++){
        const n=(y*shadow.width+x)*4;
        if(pixels[n]===255&&pixels[n+1]===255&&pixels[n+2]===255&&pixels[n+3]>0){
          const row=Math.floor(y/meta.height),frame=Math.floor(x/meta.width);
          (anchors[row]||=[])[frame]={x:x%meta.width,y:y%meta.height};
        }
      }
      this.anchors.set(`${id}-${name}`,anchors);
      if(name==='Idle'){
        surface.width=img.width;surface.height=img.height;ctx.drawImage(img,0,0);
        const data=ctx.getImageData(0,0,img.width,img.height).data;let top=meta.height;
        for(let y=0;y<meta.height;y++)for(let x=0;x<meta.width;x++)if(data[(y*img.width+x)*4+3]>0)top=Math.min(top,y);
        this.bodyHeights.set(Number(id),(anchors[0]?.[0]?.y||meta.height*.7)-top);
      }
    }));this.speciesLoads.set(id,pending);return pending;
  }));
  }
  rng(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  tree(c, x, y, scale = 1, variant = 0) {
    c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(scale, scale);
    ellipse(c, '#163e2b60', 8, 9, 28, 13);
    rect(c, '#594b2c', -5, -7, 10, 22); rect(c, '#8a7140', -3, -7, 4, 20);
    const colors = variant ? ['#194833', '#24603b', '#327549', '#438750'] : ['#1c4a31', '#2b6539', '#397a42', '#51904d'];
    const layers = [[-25,-27,50,25],[-31,-41,62,26],[-24,-58,48,28],[-16,-72,32,25],[-9,-78,18,15]];
    for (let i = 0; i < layers.length; i++) { const [xx,yy,w,h] = layers[i]; rect(c, colors[0], xx + 3, yy + 5, w, h); rect(c, colors[1], xx, yy, w - 3, h); rect(c, colors[2], xx + 4, yy, w - 13, h - 7); rect(c, colors[3], xx + 6, yy + 2, w * .25, 5); }
    rect(c, '#19472d', 2, -42, 18, 6); rect(c, '#5d9650', -16, -33, 8, 4); rect(c, '#5d9650', -7, -57, 6, 4);
    c.restore();
  }
  rock(c, x, y, scale = 1) {
    c.save(); c.translate(x,y); c.scale(scale,scale);
    rect(c, '#35523c66', -10, 2, 24, 9); rect(c, '#656f57', -10, -5, 23, 11); rect(c, '#899079', -7, -12, 17, 13); rect(c, '#9b9f85', -5, -12, 12, 4); rect(c, '#58674f', 7, -7, 6, 10); c.restore();
  }
  flower(c, x, y, color) { rect(c, '#3f733a', x, y, 2, 6); rect(c, color, x - 2, y - 1, 6, 2); rect(c, color, x, y - 3, 2, 6); rect(c, '#e8d591', x, y - 1, 2, 2); }
  bridge(c, x) {
    const {top,bottom}=BRIDGE,height=bottom-top;
    rect(c, '#174f475e', x - 45, top + 4, 99, height + 4);
    rect(c, '#513f2a', x - 41, top, 82, height);
    for (let y = top; y < bottom; y += 8) { rect(c, (y-top) % 16 ? '#a18a53' : '#b0985c', x - 39, y, 78, 6); rect(c, '#c2a56a', x - 37, y + 1, 72, 2); rect(c, '#76613c', x - 37, y + 6, 72, 2); rect(c, '#897447', x - 15 + (y % 3) * 10, y + 4, 17, 1); }
    for (const side of [-1,1]) {
      const xx = x + side * 42;
      rect(c, '#4e432d', xx - 3, top - 5, 7, height + 10); rect(c, '#c0a56e', xx - 2, top - 5, 3, height + 10);
      for (const yy of [top+6,bottom-6]) { rect(c, '#5e4f33', xx - 5, yy - 9, 10, 17); rect(c, '#bc9d66', xx - 3, yy - 10, 6, 14); rect(c, '#dfc387', xx - 4, yy - 11, 8, 3); }
    }
  }
  buildBackground() {
    const c = this.background.getContext('2d');
    c.imageSmoothingEnabled = false;
    const rnd = this.rng(8318);
    rect(c, '#466d3e', 0, 0, W, H);
    for (let row=0;row<DEPLOY_GRID.rows;row++)for(let col=0;col<DEPLOY_GRID.columns;col++)rect(c,(row+col)%2?'#527e45':'#568348',col*TILE,DEPLOY_GRID.top+row*TILE,TILE,TILE);
    // Inset field, worn edges, and fine pixel texture.
    for (let i = 0; i < 4200; i++) {
      const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H);
      rect(c, rnd() > .5 ? '#82a75b28' : '#284d3024', x, y, 2 + rnd() * 3, 2);
    }
    for (const x of LANES) {
      rect(c, '#738d4b', x - 40, PRINCESS_Y[1]-16, 80, PRINCESS_Y[0]-PRINCESS_Y[1]+32);
      rect(c, '#a4a067', x - 28, PRINCESS_Y[1], 56, PRINCESS_Y[0]-PRINCESS_Y[1]);
      for (let y = PRINCESS_Y[1]+2; y < PRINCESS_Y[0]; y += 22) {
        for (let col = 0; col < 3; col++) {
          const xx = x - 27 + col * 18 + (Math.floor(y / 22) % 2) * 2;
          rect(c, '#7e8b50', xx, y, 17, 19); rect(c, rnd() > .6 ? '#abb078' : '#a2a66e', xx, y, 15, 16); rect(c, '#bec08644', xx + 1, y + 1, 12, 2);
        }
      }
      // Irregular grass at the paths keeps the arena from looking tiled flat.
      for (let y = PRINCESS_Y[1]+24; y < PRINCESS_Y[0]-12; y += 18) {
        const s = rnd() > .5 ? 1 : -1;
        rect(c, '#729553', x + s * 29 - 3, y, 8, 10); rect(c, '#587f45', x + s * 34 - 2, y + 5, 7, 8);
      }
    }
    for (const yy of [106, 669]) {
      rect(c, '#789553', 227, yy - 15, 147, 61); rect(c, '#879958', 236, yy - 10, 128, 48);
      for (let y = yy - 10; y < yy + 38; y += 16) for (let x = 237; x < 363; x += 20) { rect(c, '#96a367', x, y, 18, 14); rect(c, '#b8bb7d44', x+1, y, 16, 2); }
    }
    // Small deployment pockets behind each central tower, mirrored for both teams.
    for(const yy of [44,747]){
      rect(c,'#68894a',248,yy-5,104,20);
      for(let x=253;x<350;x+=18){rect(c,'#94a56655',x,yy-2,13,13);rect(c,'#b6bf7e33',x,yy-2,13,2);}
    }
    // River banks are deliberately jagged at pixel scale.
    const {top,bottom}=RIVER,riverHeight=bottom-top;
    rect(c, '#365c36', 0, top-10, W, riverHeight+20); rect(c, '#7f9e57', 0, top-8, W, 5);
    rect(c, '#bfd18b', 0, top-3, W, 3); rect(c, '#326e64', 0, top, W, riverHeight);
    rect(c, '#438e81', 0, top+3, W, riverHeight-6); rect(c, '#5aa291', 0, top+6, W, riverHeight-12);
    rect(c, '#a7c785', 0, bottom, W, 3); rect(c, '#7d9e56', 0, bottom+3, W, 5);
    for (let i = 0; i < 45; i++) { const x = i * 14 + rnd() * 8; rect(c, '#b4c883', x, top-6 + rnd() * 3, 7, 2); rect(c, '#d0dba3', x + 3, bottom+1, 4, 2); }
    // Side stone walls and thick forest enclose the actual battlefield.
    for (const side of [0,1]) {
      const x = side ? 566 : 16;
      for (let y = 28; y < H - 18; y += 24) { rect(c, '#3b593b', x + 2, y + 3, 19, 24); rect(c, '#798463', x, y, 17, 21); rect(c, '#9aa17d', x + 1, y + 1, 14, 4); rect(c, '#5a7350', x + 12, y + 6, 5, 14); }
    }
    for (let x = 24; x < W - 24; x += 25) { rect(c, '#6f7f58', x, 18, 24, 15); rect(c, '#98a06e', x + 1, 18, 21, 4); rect(c, '#6f7f58', x, 775, 24, 15); rect(c, '#98a06e', x + 1, 775, 21, 4); }
    for (const x of LANES) for (const y of PRINCESS_Y) {
      ellipse(c, '#3f663832', x + 5, y + 8, 55, 40);
      for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4; const xx = x + Math.cos(a) * 42, yy = y + Math.sin(a) * 32; rect(c, '#879568', xx - 8, yy - 5, 16, 12); rect(c, '#a6b080', xx - 7, yy - 5, 13, 3); }
    }
    // Distinct team flags, without covering the deployment area.
    for (const x of [72,528]) for (const y of [245,562]) { rect(c, '#514d33', x, y - 27, 3, 51); rect(c, '#d3ba7b', x, y - 29, 3, 4); rect(c, y < 400 ? '#a6644d' : '#577e95', x + 3, y - 23, 20, 19); rect(c, y < 400 ? '#ce8c6c' : '#86b4bc', x + 4, y - 22, 16, 3); rect(c, '#e9d29c', x + 10, y - 17, 4, 7); }
    for (let i = 0; i < 80; i++) {
      const x = 45 + rnd() * 510, y = 39 + rnd() * 720;
      if (Math.abs(y - 400) < 60 || LANES.some(xx => Math.abs(x - xx) < 60) || (Math.abs(x - 300) < 85 && (y < 140 || y > 650))) continue;
      if (i % 3 === 0) this.flower(c, x, y, i % 2 ? '#c6c785' : '#c9afab');
      else { rect(c, '#477a3c', x, y, 2, 5); rect(c, '#6c9a4f', x + 2, y - 3, 2, 7); rect(c, '#477a3c', x + 4, y, 2, 5); }
    }
    for (const p of [[60,120,.75],[535,118,.85],[65,692,.6],[538,705,.7],[300,285,.65],[299,531,.65]]) this.rock(c,...p);
    for (const p of [[5,65,1.15],[62,48,.9],[118,34,.8],[480,33,.83],[544,49,.97],[600,76,1.15],[-6,196,.8],[602,234,.85],[0,342,.9],[603,358,.9],[-5,515,.85],[605,556,.85],[0,695,.85],[42,782,.98],[99,803,.9],[499,808,.9],[557,783,1.05],[609,701,.85]]) this.tree(c,...p,Math.floor(rnd()*2));
    for (const x of LANES) this.bridge(c, x);
    // Small lily pads and reeds, outside the routes across the river.
    for (const [x,y] of [[71,396],[310,404],[527,400]]) { ellipse(c, '#487b4c', x, y, 9, 4); rect(c, '#91b465', x - 5, y - 2, 7, 2); }
    for (const x of [38,260,365,553]) { rect(c, '#477a43', x, top-14, 2, 14); rect(c, '#a2af64', x, top-16, 2, 5); rect(c, '#477a43', x + 5, top-9, 2, 10); }
  }
  tower(c, tower) {
    const { x,y,team,king } = tower;
    const pal = team ? ['#af6653','#d6866a','#edac83','#753e3b'] : ['#4e8198','#75aec0','#a8d0d4','#335b70'];
    if (tower.hp <= 0) {
      ellipse(c, '#233c2b55', x, y + 11, king ? 42 : 35, 18);
      for (const [xx,yy,ww] of [[-23,3,16],[8,9,21],[-10,-5,18],[14,-7,12],[-27,14,12],[-5,16,15]]) { rect(c, '#737d5c', x + xx, y + yy, ww, 9); rect(c, '#9ea07b', x+xx,y+yy,ww-2,3); }
      rect(c, '#5b6e4b', x - 17,y - 14,5,17); rect(c,pal[3],x - 12,y - 14,17,10); return;
    }
    const ww = king ? 62 : 49, hh = king ? 58 : 48;
    c.save(); if (tower.hit > 0) { c.translate(Math.sin(this.t * 150) * 1.5,0); }
    ellipse(c, '#17392c70', x + 5, y + 15, ww*.7, 20);
    rect(c, '#4d5c49', x - ww/2 - 6,y + 8,ww + 12,14); rect(c, '#9da27c', x - ww/2 - 6,y + 7,ww + 12,4);
    rect(c, '#6e795a', x - ww/2,y-hh+18,ww,hh-3); rect(c, '#aaa98a', x - ww/2 + 2,y-hh+18,ww - 9,hh-4);
    for (let row = 0; row < 3; row++) { const yy = y - hh + 29 + row*14; rect(c, '#7e8866',x-ww/2+2,yy,ww-9,2); rect(c,'#7d8567',x+(row%2?-10:6),yy-12,2,12); }
    rect(c,'#596c54',x - ww/2,y+6,ww,8); rect(c,'#d3c89b',x - ww/2+3,y+7,ww-10,3);
    // Recessed doorway and team-coloured roof.
    rect(c,'#4a5240',x-8,y-8,16,21); rect(c,'#293c31',x-5,y-10,10,20); rect(c,'#c1b280',x-7,y-11,14,3);
    const roofY = y - hh + 13;
    rect(c,pal[3],x-ww/2-5,roofY+1,ww+10,13); rect(c,pal[0],x-ww/2-6,roofY-4,ww+12,12);
    rect(c,pal[1],x-ww/2-2,roofY-8,ww+4,9); rect(c,pal[2],x-ww/2-1,roofY-8,ww,3);
    for (let i = -1; i < 2; i++) { rect(c,pal[3],x+i*17-5,roofY-17,11,12); rect(c,pal[1],x+i*17-6,roofY-18,10,10); rect(c,pal[2],x+i*17-6,roofY-18,10,3); }
    ball(c,x,roofY+7,king?8:6,pal[0]);
    if (king) {
      rect(c,'#847951',x+27,roofY-32,3,42);
      c.fillStyle = pal[1]; c.beginPath(); c.moveTo(x+30,roofY-30); c.lineTo(x+54,roofY-26+Math.sin(this.t*3)*2);c.lineTo(x+51,roofY-12+Math.sin(this.t*3+1)*2);c.lineTo(x+30,roofY-15);c.fill();
      text(c,'★',x+40,roofY-22,'#e8dca5',11);
      if (!tower.active) { ellipse(c, '#1a322785',x,y+22,13,7);text(c,'z',x,y+21,'#cbd6b7',10); }
    }
    // Guardians use the same feet anchors and aiming as units on the arena floor.
    if(tower.guard)this.sprite(c,{...tower,attack:!tower.active?0:tower.attack,card:{id:tower.guard.id},scale:king?1.15:1.3,x,y:y-hh+4,mounted:true,attackAnim:tower.guard.attackAnim,moving:false},true);
    if (tower.stun > 0) { c.globalAlpha = .5 + Math.sin(this.t*25)*.3; ellipse(c,'#fff3a48a',x,y-35,ww*.6,30);c.globalAlpha=1; }
    const bw = king ? 64 : 58, by = y + 26;
    rect(c,'#20352ad9',x-bw/2-2,by-2,bw+4,10);rect(c,'#435845',x-bw/2,by,bw,6);rect(c,pal[1],x-bw/2,by,bw*(tower.hp/tower.maxHp),6);rect(c,pal[2],x-bw/2,by,bw*(tower.hp/tower.maxHp),2);
    c.font='600 12px "DM Sans",sans-serif';const hpWidth=c.measureText(String(Math.ceil(tower.hp))).width+12;
    rect(c,'#243b2ad9',x-hpWidth/2,by+10,hpWidth,16);text(c,String(Math.ceil(tower.hp)),x,by+18,team?'#f0c3a8':'#c4e3e8',11,700);
    c.restore();
  }
  sprite(c, unit, idle = false) {
    const id = unit.card.id;
    if(!this.speciesLoads.has(id))this.ensureSpecies([id]).catch(()=>{});
    let anim = unit.attack > 0 ? (unit.attackAnim||unit.card.attackAnim||'Attack') : unit.moving ? 'Walk' : unit.hit>0?'Hurt':'Idle';
    if (!this.sprites.has(`${id}-${anim}`)) anim = 'Walk';
    const meta = this.metadata[id]?.[anim], img = this.sprites.get(`${id}-${anim}`);
    if (!meta || !img) return;
    const scale = visualScale(unit),vertical=this.verticalScale||1;
    let frame = 0;
    const attacking=unit.attack>0;
    const duration = meta.durations.reduce((a,b)=>a+b,0);
    const elapsed = (unit.attackDuration || .6) - unit.attack;
    const windup = unit.attackWindup ?? unit.card.windup ?? .18;
    const progress=attacking?attackPoseProgress(meta,elapsed,unit.attackDuration||.6,windup):0;
    const clock=this.reduced?0:attacking?progress*duration:(unit.anim||this.t)*60*(unit.card.charge&&unit.charge>=unit.card.charge?1.65:1);
    let cursor = attacking?clock:((clock % duration) + duration) % duration;
    for (let i=0;i<meta.durations.length;i++) { if(cursor<meta.durations[i]) {frame=i;break;}cursor-=meta.durations[i]; }
    let direction = directionRow(unit.dx,unit.dy);
    if(img.height/meta.height<8)direction=0;
    const {x,y}=unit;
    const anchor=this.anchors.get(`${id}-${anim}`)?.[direction]?.[frame]||{x:meta.width/2,y:meta.height*.65};
    const lift=unit.card.structure?23:unit.card.flying?16+(this.reduced?0:Math.sin(this.t*5+unit.id)*3):0;
    const sinceHit = elapsed - windup;
    const pulse = sinceHit >= 0 && unit.card.burst ? Math.max(0,1-(sinceHit % unit.card.burstSpacing)/.13) : Math.sin(progress*Math.PI);
    const lunge=attacking&&!unit.mounted&&unit.card.range<50&&!this.reduced?pulse*5:0;
    const radius=unit.radius||12;
    if(!unit.mounted){
      ellipse(c,'#15382a65',x,y+2,radius+2,unit.card.flying?6:4);
      c.strokeStyle=unit.team?'#e89a7888':'#90d9f099'; c.lineWidth=1.5;
      c.beginPath();c.ellipse(x,y+1,radius+2,5,0,0,Math.PI*2);c.stroke();
    }
    if(unit.card.structure)this.platform(c,unit);
    c.save();
    if(unit.spawn>0) { c.globalAlpha=.5; }
    if(unit.hit>0) c.filter='brightness(1.8)';
    const px=x+unit.dx*lunge-anchor.x*scale,py=y+unit.dy*lunge-lift-anchor.y*scale/vertical;
    if(unit.card.charge&&unit.charge>=unit.card.charge&&!this.reduced){for(let i=3;i>0;i--){c.globalAlpha=.08*(4-i);c.drawImage(img,frame*meta.width,direction*meta.height,meta.width,meta.height,Math.round(px-unit.dx*i*9),Math.round(py-unit.dy*i*9),meta.width*scale,meta.height*scale/vertical);}c.globalAlpha=1;}
    c.drawImage(img,frame*meta.width,direction*meta.height,meta.width,meta.height,Math.round(px),Math.round(py),meta.width*scale,meta.height*scale/vertical);
    c.restore();
    if(unit.shield>0&&!unit.mounted){c.save();c.strokeStyle='#c4eaf0aa';c.lineWidth=2;c.beginPath();c.ellipse(x,y-lift-15,radius+7,24,0,Math.PI*.05,Math.PI*.95);c.stroke();c.restore();}
    if(idle)return;
    if(unit.spawn>0){
      const progress=1-unit.spawn/.75;
      c.strokeStyle='#ecdfae';c.lineWidth=2;c.beginPath();c.arc(x,y-5,17,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);c.stroke();
    }
    const by=y-lift-((this.bodyHeights.get(id)||22)*scale+9)/vertical;
    this.healthBar(c,unit,x,by,unit.maxHp<=1?18:unit.card.count?30:unit.maxHp>=1800?52:44);
    if(unit.card.ability&&!unit.abilityUsed){ellipse(c,'#382448',x+27,by+4,6,6);text(c,'◆',x+27,by+4,'#e9beff',10,800);}
    if(unit.stun>0){text(c,'ϟ',x,by-10,'#fff3a4',15,800);}
    else if(unit.slow>0){text(c,'↓',x,by-10,'#bae2a2',12);}
    if(unit.burn){for(let i=0;i<3;i++){const phase=(this.t*4+i*.3)%1;ellipse(c,unit.burn.kind==='poison'?(i%2?'#d1addf':'#9871b3'):(i%2?'#e9b66c':'#e58449'),x-8+i*7,y-6-phase*13,3*(1-phase)+1,unit.burn.kind==='poison'?3:5*(1-phase)+2);}}
  }
  healthBar(c,unit,x,y,width){
    const ratio=Math.max(0,unit.hp/unit.maxHp);let h=this.healthStates.get(unit.id);
    if(!h){h={chip:ratio,last:ratio,at:-10};this.healthStates.set(unit.id,h);}
    if(ratio<h.last-.001){h.at=this.t;h.chip=Math.max(h.chip,h.last);}if(ratio>h.chip)h.chip=ratio;h.last=ratio;
    if(this.t-h.at>.35)h.chip=Math.max(ratio,h.chip-(this.drawDt||0)*.9);
    const height=unit.maxHp<=1?4:8;
    rect(c,'#09170f',x-width/2-2,y-2,width+4,height+4);rect(c,'#32413b',x-width/2,y,width,height);
    if(h.chip>ratio)rect(c,'#ffe2a2',x-width/2,y,width*h.chip,height);
    rect(c,unit.team?'#ef615a':'#43baf1',x-width/2,y,width*ratio,height);rect(c,unit.team?'#ffaaa0':'#a3e5ff',x-width/2,y,width*ratio,2);
    if(unit.maxHp>1)for(let i=1;i<4;i++)rect(c,'#061a243d',x-width/2+width*i/4,y,1,height);
    if(unit.hit>.12){c.save();c.globalAlpha=(unit.hit-.12)/.12;rect(c,'#fff5cf',x-width/2,y,width*ratio,3);c.restore();}
    if(unit.shield>0){rect(c,'#102a36',x-width/2-1,y+10,width+2,5);rect(c,'#f1e0ff',x-width/2,y+11,width*unit.shield/Math.max(unit.shield,unit.maxShield||1),3);}
  }
  platform(c,u){
    const {x,y,team}=u,pal=team?'#bb7e65':'#74aab6';
    ellipse(c,'#1e392c66',x+3,y+5,35,13);rect(c,'#435d4c',x-29,y-14,58,20);rect(c,'#8d9a78',x-28,y-17,56,18);rect(c,'#a8b294',x-28,y-17,56,4);
    rect(c,'#667b61',x-25,y-5,50,2);rect(c,'#60745b',x-9,y-13,2,8);rect(c,'#60745b',x+11,y-2,2,7);
    rect(c,'#344e43',x-33,y-26,66,11);rect(c,pal,x-33,y-26,66,5);rect(c,'#c4d4af',x-29,y-26,58,2);
    for(const xx of[-27,22]){rect(c,'#435b4c',x+xx,y-29,7,13);rect(c,pal,x+xx,y-30,7,7);}
    const remaining=Math.max(0,u.lifetime/u.card.lifetime);rect(c,'#243a2d',x-22,y+10,44,3);rect(c,'#c7b97d',x-22,y+10,44*remaining,2);
  }
  onEvent(event) {
    const {type}=event;
    if(type==='attackStart'&&['lightning','aura','psychic'].includes(event.style))this.effects.push({kind:'charge',actor:event.attacker,style:event.style,life:event.windup,max:event.windup});
    if(type==='attackStart'&&['slam','eruption'].includes(event.style))this.effects.push({kind:'windup',actor:event.attacker,style:event.style,life:event.windup,max:event.windup});
    if(type==='beam')this.effects.push({...event,kind:'beam',life:.28,max:.28});
    if(type==='flame')this.effects.push({...event,kind:'flame',life:.3,max:.3});
    if(type==='melee')this.effects.push({...event,kind:'melee',life:['slam','eruption'].includes(event.style)?.5:.27,max:['slam','eruption'].includes(event.style)?.5:.27});
    if(type==='counter')this.effects.push({...event,kind:'counter',life:.3,max:.3});
    if(type==='attackRelease'&&event.style==='hydro')this.burst(event.from.x,event.from.y,'#b4ebef',8,45);
    if(type==='step'){
      const u=event.unit;if(u.key!=='gengar')this.burst(u.x-u.dx*5,u.y-u.dy*5,'#c3bd874d',u.key==='snorlax'?4:2,12);
    }
    if(type==='blink'){
      this.burst(event.from.x,event.from.y-10,'#aa80d1',18,65);this.burst(event.to.x,event.to.y-10,'#bb99e0',18,55);
      this.effects.push({kind:'blink',from:event.from,to:event.to,life:.35,max:.35});
    }
    if(type==='damage'&&event.amount>0){this.floatingNumber(event.target,event.amount,event.dot?'dot':'damage');const target=event.target,old=this.healthStates.get(target.id);this.healthStates.set(target.id,{chip:Math.max(old?.chip||0,Math.min(1,(target.hp+event.amount)/target.maxHp)),last:target.hp/target.maxHp,at:this.t});}
    if(type==='heal'&&event.amount>0){this.floatingNumber(event.unit,event.amount,'heal');this.rings.push({x:event.unit.x,y:event.unit.y-7,color:'#a5e4a5',life:.4,max:.4,radius:22});}
    if(type==='spawn'){this.ensureSpecies([event.unit.card.id]).catch(()=>{});this.rings.push({x:event.unit.x,y:event.unit.y,color:event.unit.team?'#e89a78':'#96d5df',life:.7,max:.7,radius:24});}
    if(type==='entry'){this.burst(event.x,event.y-10,event.style==='lightning'?'#f8e78d':'#a7e4ed',18,80);this.rings.push({x:event.x,y:event.y,color:event.style==='lightning'?'#fff1b3':'#a7e4ed',life:.55,max:.55,radius:event.radius,spell:event.style==='lightning'?'thunder':'ice'});}
    if(type==='ability'||type==='deathBurst'){this.burst(event.unit.x,event.unit.y-15,type==='ability'?'#d7adff':'#d9c794',25,100);this.rings.push({x:event.unit.x,y:event.unit.y,spell:'pulse',color:type==='ability'?'#deb8ff':'#e4cca0',life:.7,max:.7,radius:event.radius});}
    if(type==='hit'){
      const color=CARDS[event.key]?.color||'#eee8bc';
      this.burst(event.x,event.y,color,5,35);
      if(['poison','powder','egg','song'].includes(event.style))this.effects.push({...event,kind:'impact',life:.4,max:.4,radius:CARDS[event.key]?.splash||18});
      if(event.style==='bubble'||event.style==='hydro')this.rings.push({x:event.x,y:event.y,color:'#b0e3ea',life:.25,max:.25,radius:13});
    }
    if(type==='faint')this.burst(event.unit.x,event.unit.y-15,'#ddd9bd',12,55);
    if(type==='structureDown'){this.burst(event.unit.x,event.unit.y-10,'#a9b395',28,85);this.burst(event.unit.x,event.unit.y-24,'#a4d5de',10,60);}
    if(type==='towerDown'){
      this.burst(event.tower.x,event.tower.y-20,'#c5b88d',35,110);
      this.rings.push({x:event.tower.x,y:event.tower.y,color:'#f3d683',life:1,max:1,radius:85});
    }
    if(type==='spellHit'){
      this.burst(event.x,event.y,event.key==='thunder'?'#fff0a0':'#ef9c5a',35,130);
      this.rings.push({x:event.x,y:event.y,color:event.key==='thunder'?'#fff0a0':'#f4b26e',life:.7,max:.7,radius:event.radius,spell:event.key});
    }
    if(type==='end'&&event.winner===0){for(let i=0;i<35;i++)this.particles.push({x:70+Math.random()*460,y:100+Math.random()*220,vx:(Math.random()-.5)*80,vy:-50-Math.random()*100,color:['#e8c777','#92c6ce','#b99ed9'][i%3],life:3,max:3,gravity:55,size:4});}
  }
  burst(x,y,color,count,speed) {
    if(this.reduced)count=Math.min(count,3);
    for(let i=0;i<count&&this.particles.length<350;i++)this.particles.push({x,y,vx:(Math.random()-.5)*speed,vy:(Math.random()-.5)*speed-20,color,life:.3+Math.random()*.4,max:.7,gravity:65,size:2+Math.random()*3});
  }
  floatingNumber(target,amount,kind='damage'){
    const combined=this.numbers.find(n=>n.targetId===target.id&&n.kind===kind&&this.t-n.lastAt<.22);
    if(combined){combined.amount+=amount;combined.life=combined.max;combined.lastAt=this.t;return;}
    const id=target.card?.id,scale=visualScale(target);
    const height='king'in target?(target.king?83:72):(this.bodyHeights.get(id)||23)*scale+(target.card.structure?23:target.card.flying?16:0)+13;
    const life=kind==='dot'?.95:1.15;
    if(this.numbers.length>=32)this.numbers.shift();
    this.numbers.push({targetId:target.id,kind,x:Math.max(24,Math.min(W-24,target.x+(target.id%3-1)*7+(kind==='dot'?15:kind==='heal'?-15:0))),y:Math.max(27,Math.min(H-27,target.y-height+(kind==='dot'?12:0))),amount,color:kind==='heal'?'#baf3a2':kind==='dot'?'#ffc27d':target.team?'#ffe8a0':'#ffd2c8',life,max:life,lastAt:this.t});
  }
  drawNumbers(c,dt){
    for(const n of this.numbers){
      n.life-=dt;if(n.life<=0)continue;
      const age=n.max-n.life,progress=age/n.max,size=n.kind==='dot'?17:n.amount>=160?23:20;
      const scale=this.reduced?1:age<.1?.8+age*3.2:age<.22?1.12-(age-.1):1;
      const value=`${n.kind==='heal'?'+':''}${Math.round(n.amount)}`;
      c.save();c.globalAlpha=progress<.62?1:(1-progress)/.38;
      c.translate(n.x,n.y-(this.reduced?0:progress*30));c.scale(scale,scale);
      c.font=`800 ${size}px "Barlow Condensed", "Segoe UI", sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
      c.strokeStyle='#0c180f';c.lineWidth=4.5;c.shadowColor='#08110d';c.shadowBlur=3;c.shadowOffsetY=2;c.strokeText(value,0,0);
      c.shadowBlur=0;c.shadowOffsetY=0;c.fillStyle=n.color;c.fillText(value,0,0);c.restore();
    }
    this.numbers=this.numbers.filter(n=>n.life>0);
  }
  projectile(c,p){
    const progress=Math.min(1,p.travelled/Math.max(1,p.totalDistance)),height=Math.sin(progress*Math.PI)*p.arc;
    const x=p.x,y=p.y-height;
    const color=p.style==='coin'?'#f4da87':CARDS[p.key]?.color||'#ebdfaa';
    for(let i=0;i<p.trace.length;i++){
      const q=p.trace[i];c.globalAlpha=(i+1)/p.trace.length*.28;ellipse(c,color,q.x,q.y-height,p.style==='hydro'?4:2,2);
    }
    c.globalAlpha=1;
    if(p.style==='coin'){
      const rx=1.5+Math.abs(Math.cos(this.t*22))*3;ellipse(c,'#836342',x+1,y+1,rx+1,5);ellipse(c,'#f1cf6e',x,y,rx,4);line(c,'#fff0b2',x,y-2,x,y+2,1);
    }else if(p.style==='leaf'){
      c.save();c.translate(x,y);c.rotate(this.t*12);ellipse(c,'#bcdf80',0,0,8,3);line(c,'#4d853d',-6,0,6,0,1);c.restore();
    }else if(p.style==='bubble'){
      ellipse(c,'#83d3d57a',x,y,6,6);c.strokeStyle='#b6edf1';c.lineWidth=1.5;c.beginPath();c.arc(x,y,6,0,Math.PI*2);c.stroke();ellipse(c,'#eefef4',x-2,y-2,1.5,1.5);
    }else if(p.style==='hydro'){
      const angle=Math.atan2(p.target.y-p.y-18,p.target.x-p.x);c.save();c.translate(x,y);c.rotate(angle);ellipse(c,'#70bdcf',-3,0,13,4);ellipse(c,'#c4f1ee',1,0,9,2);c.restore();
    }else if(p.style==='egg'){
      c.save();c.translate(x,y);c.rotate(progress*9);ellipse(c,'#877c63',1,1,7,9);ellipse(c,'#f6e9bf',0,0,6,8);ellipse(c,'#d2bd8c',-2,-2,2,2);ellipse(c,'#d2bd8c',2,3,1.5,2);c.restore();
    }else if(p.style==='poison'||p.style==='powder'){
      for(let i=0;i<5;i++){const angle=i*Math.PI*.4+this.t*2,spread=p.style==='powder'?9:5;ellipse(c,i%2?'#cdb0dc99':'#9872baaa',x+Math.cos(angle)*spread,y+Math.sin(angle)*spread,p.style==='powder'?2:4,p.style==='powder'?2:4);}
    }else if(p.style==='song'){
      c.save();c.translate(x,y);c.rotate(Math.atan2(p.target.y-p.y,p.target.x-p.x));for(let i=0;i<3;i++){c.strokeStyle=['#f5e2f6','#d0c5f2','#b6dfe8'][i];c.lineWidth=2;c.beginPath();c.arc(-i*5,0,5+i*3,-.9,.9);c.stroke();}c.restore();
    }else if(p.style==='rock'){
      ellipse(c,'#233b2955',p.x,p.y+12,11,5);c.save();c.translate(x,y);c.rotate(this.t*7);c.fillStyle='#7b8580';c.beginPath();c.moveTo(-8,-4);c.lineTo(-2,-10);c.lineTo(7,-7);c.lineTo(10,3);c.lineTo(0,9);c.lineTo(-9,4);c.fill();rect(c,'#bec3a7',-3,-7,7,4);rect(c,'#56675b',2,1,5,5);c.restore();
    }else if(p.style==='ember'){
      ellipse(c,'#ed944ab0',x,y,8,7);ellipse(c,'#f8d581',x,y,4,4);rect(c,'#fff2b9',x-1,y-2,2,3);
      if(!this.reduced&&Math.random()<.35)this.burst(x,y,'#efb767',1,10);
    }else if(p.style==='ice'){
      c.save();c.translate(x,y);c.rotate(this.t*7);c.fillStyle='#d9f7fa';c.beginPath();c.moveTo(0,-10);c.lineTo(5,1);c.lineTo(0,9);c.lineTo(-5,-1);c.fill();line(c,'#7bc8de',0,-7,0,7,1);c.restore();
    }else if(p.style==='aura'||p.style==='confusion'){
      const radius=p.style==='aura'?11:7;ellipse(c,p.style==='aura'?'#a389db66':'#e3a8d366',x,y,radius+5,radius+5);ellipse(c,p.style==='aura'?'#cbb5ef':'#e5b3dc',x,y,radius,radius);ellipse(c,'#f7eafb',x-2,y-2,radius*.45,radius*.45);
      c.strokeStyle='#eee0ff';c.lineWidth=1;c.beginPath();c.ellipse(x,y,radius+4,radius*.5,this.t*7,0,Math.PI*2);c.stroke();
    }else if(p.style==='magnet'){
      ellipse(c,'#8abfc4',x,y,6,6);c.strokeStyle='#f4d58a';c.lineWidth=2;c.beginPath();c.moveTo(x-11,y-6);c.lineTo(x-6,y-2);c.lineTo(x-8,y+2);c.moveTo(x+11,y+6);c.lineTo(x+6,y+2);c.lineTo(x+8,y-2);c.stroke();
    }else{ellipse(c,color,x,y,4,4);}
  }
  drawEffects(c,dt){
    for(const e of this.effects){
      e.life-=dt;if(e.life<=0)continue;const progress=1-e.life/e.max;c.save();c.globalAlpha=Math.max(0,Math.min(1,e.life/e.max*1.8));
      if(e.kind==='beam'){
        const {from:a,to:b}=e;
        if(e.style==='vine'){
          c.strokeStyle='#6b9b4e';c.lineWidth=4;c.beginPath();c.moveTo(a.x,a.y);c.quadraticCurveTo((a.x+b.x)/2+Math.sin(this.t*20)*12,(a.y+b.y)/2-15,b.x,b.y);c.stroke();c.strokeStyle='#bed783';c.lineWidth=1;c.stroke();
          for(let j=1;j<4;j++){const t=j/4,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t-10;ellipse(c,'#8fbe67',x,y,4,2);}
        }else if(e.style==='psychic'){
          c.strokeStyle='#c8a1e6';c.lineWidth=7;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.strokeStyle='#f1e2fa';c.lineWidth=2;c.stroke();
          for(let i=1;i<5;i++){const t=(i/5+progress*.15)%1;c.strokeStyle='#dfc8f0';c.lineWidth=1;c.beginPath();c.ellipse(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,8,12,this.t*5,0,Math.PI*2);c.stroke();}
        }else{
          c.shadowColor='#ffe59c';c.shadowBlur=this.reduced?0:8;c.strokeStyle='#edd36c';c.lineWidth=4;c.beginPath();c.moveTo(a.x,a.y);
          for(let i=1;i<8;i++){const t=i/8,offset=Math.sin(i*17+this.t*75)*9;c.lineTo(a.x+(b.x-a.x)*t+offset,a.y+(b.y-a.y)*t-offset*.5);}
          c.lineTo(b.x,b.y);c.stroke();c.strokeStyle='#fff8cf';c.lineWidth=1.5;c.stroke();
        }
      }else if(e.kind==='windup'){
        const a=e.actor;c.strokeStyle=e.style==='eruption'?'#f2a26d':'#dac79a';c.lineWidth=1+progress*2;c.beginPath();c.ellipse(a.x,a.y,8+progress*9,3+progress*3,0,0,Math.PI*2);c.stroke();
      }else if(e.kind==='counter'){
        line(c,'#8cc8f2',e.from.x,e.from.y,e.to.x,e.to.y,4*(1-progress)+1);c.strokeStyle='#d0ecff';c.lineWidth=2;c.beginPath();c.arc(e.to.x,e.to.y,6+progress*14,0,Math.PI*2);c.stroke();
      }else if(e.kind==='impact'){
        const x=e.x,y=e.y,r=8+progress*e.radius;
        if(e.style==='egg'){for(let i=0;i<6;i++){const angle=i*Math.PI/3;rect(c,'#f5e6bd',x+Math.cos(angle)*r,y+Math.sin(angle)*r*.65,3,4);}}
        else{c.strokeStyle=e.style==='song'?'#d5d3f0':'#c9a2db';c.lineWidth=2;c.beginPath();c.ellipse(x,y,r,r*.6,0,0,Math.PI*2);c.stroke();}
      }else if(e.kind==='charge'){
        const a=e.actor,y=a.y-('king'in a?69:a.card.muzzleHeight||20);c.strokeStyle=e.style==='lightning'?'#efd978':'#d0b3ed';c.lineWidth=1.5;c.beginPath();c.arc(a.x,y,10+Math.sin(this.t*20)*3,0,Math.PI*2);c.stroke();
      }else if(e.kind==='flame'){
        const a=e.from,b=e.to,angle=Math.atan2(b.y-a.y,b.x-a.x),length=Math.min(200,e.length+10);
        c.translate(a.x,a.y);c.rotate(angle);
        const gradient=c.createLinearGradient(0,0,length,0);gradient.addColorStop(0,'#fff0a4b0');gradient.addColorStop(.45,'#f6bb67a0');gradient.addColorStop(1,'#db744b00');c.fillStyle=gradient;
        c.beginPath();c.moveTo(0,-3);c.lineTo(length,-length*.32);c.quadraticCurveTo(length+15,0,length,length*.32);c.lineTo(0,3);c.fill();
        for(let i=0;i<12;i++){const t=(i/12+progress*.6)%1,x=t*length,w=(3+t*16),yy=Math.sin(i*7+this.t*13)*t*length*.27;ellipse(c,i%3?'#ec9f50':'#ffe5a0',x,yy,w,w*.45);}
      }else if(e.kind==='melee'){
        const x=e.to.x,y=e.to.y;
        if(e.style==='eruption'){
          const radius=Math.max(20,e.radius||30);for(let i=0;i<10;i++){const angle=i*Math.PI/5,r=radius*(.25+progress*.75);ellipse(c,i%2?'#f5bc6a':'#ed884e',x+Math.cos(angle)*r,y+10+Math.sin(angle)*r*.5,4*(1-progress)+2,12*(1-progress)+3);}
        }else if(e.style==='slam'){
          const radius=e.radius||14;c.strokeStyle='#e2d8ae';c.lineWidth=3*(1-progress)+1;c.beginPath();c.ellipse(x,y+13,7+progress*radius,4+progress*radius*.35,0,0,Math.PI*2);c.stroke();
          for(let i=0;i<6;i++){const a=i*Math.PI/3;line(c,'#8b7855',x+Math.cos(a)*6,y+14+Math.sin(a)*3,x+Math.cos(a)*(10+progress*radius),y+14+Math.sin(a)*(5+progress*radius*.4),2);}
        }else if(e.style==='shadow'||e.style==='slash'){
          for(let i=0;i<(e.style==='slash'?2:3);i++){c.strokeStyle=e.style==='slash'?(i%2?'#f0f5d7':'#a7cd7c'):(i%2?'#dec5f0':'#a67cce');c.lineWidth=3;c.beginPath();c.moveTo(x-17+i*7,y-15);c.quadraticCurveTo(x+15+i*3,y-3,x-4+i*7,y+16);c.stroke();}
        }else if(e.style==='lick'){
          c.strokeStyle='#c88fbc';c.lineWidth=5*(1-progress)+1;c.beginPath();c.moveTo(e.from.x,e.from.y);c.quadraticCurveTo((e.from.x+x)/2+10,(e.from.y+y)/2+8,x,y);c.stroke();ellipse(c,'#efd1e4',x,y,3,2);
        }else if(e.style==='horn'){
          c.fillStyle='#eed6eb';c.beginPath();c.moveTo(x-7,y+8);c.lineTo(x+2,y-13);c.lineTo(x+7,y+7);c.fill();line(c,'#ba90c8',x,y+5,x+2,y-8,2);
        }else if(e.style==='bite'){
          c.strokeStyle='#d7b6f0';c.lineWidth=2;c.beginPath();c.arc(x,y-4,10,0,Math.PI);c.stroke();line(c,'#f1deed',x-7,y-1,x-5,y+5,2);line(c,'#f1deed',x+7,y-1,x+5,y+5,2);
        }else{
          const from=e.from,dx=x-from.x,dy=y-from.y,d=Math.hypot(dx,dy)||1,px=x-dx/d*(10-progress*8),py=y-dy/d*(10-progress*8)+(e.shot%2?3:-3);
          line(c,e.style==='dash'?'#f2e6c0':'#e4d6aa',from.x,from.y,px,py,e.charged?6:3);
          ellipse(c,'#efe1b5',px,py,5,5);rect(c,'#c4ad83',px-3,py-1,6,3);
          for(let i=0;i<5;i++){const a=i*Math.PI*.4;line(c,'#f5df9b',x+Math.cos(a)*5,y+Math.sin(a)*5,x+Math.cos(a)*(11+progress*7),y+Math.sin(a)*(11+progress*7),2);}
        }
      }else if(e.kind==='blink'){
        for(const p of[e.from,e.to]){ellipse(c,'#a581c34a',p.x,p.y-9,18*(1-progress),20*(1-progress));}
      }
      c.restore();
    }
    this.effects=this.effects.filter(e=>e.life>0);
    this.drawNumbers(c,dt);c.globalAlpha=1;
  }
  drawWater(c) {
    const height=RIVER.bottom-RIVER.top;
    c.save();c.beginPath();c.rect(0,RIVER.top+2,W,height-4);c.clip();
    for(let i=0;i<25;i++){
      const x=(i*97+this.t*(i%2?9:14))%640-20;
      const y=RIVER.top+4+(i*13)%(height-8);
      rect(c,i%3?'#a2d0b947':'#d8e8c34a',x,y,10+(i%4)*7,2);
    }
    c.restore();
    for(const x of LANES)this.bridge(c,x);
  }
  drawPlacement(c, game) {
    const recent=this.deploymentPreview&&this.deploymentPreview.until>this.t?this.deploymentPreview:null;
    const key=this.selection||recent?.key,card=CARDS[key];
    if(!card||game.state!=='playing')return;
    c.save();
    if((!card.spell||card.rolling)&&this.selection){
      rect(c,'#132e2570',35,36,530,339);
      for(const lane of [0,1]){
        if(game.towers.some(t=>t.team===1&&t.lane===lane&&t.hp<=0))rect(c,'#8ed2a018',lane?300:36,252,264,104);
      }
      c.strokeStyle='#d9ebbc35';c.lineWidth=.7;
      for(let row=0;row<DEPLOY_GRID.rows;row++)for(let col=0;col<DEPLOY_GRID.columns;col++){
        const x=col*TILE+TILE/2,y=DEPLOY_GRID.top+row*TILE+TILE/2;
        if(game.canDeploy(0,key,x,y))c.strokeRect(x-TILE/2,y-TILE/2,TILE,TILE);
      }
      if(this.tutorialSpot)text(c,'D E S P L E G Á  A C Á',300,480,'#e0ecc7aa',10,500);
    }
    if(this.tutorialSpot&&!card.spell){
      const r=29+(this.reduced?0:Math.sin(this.t*4)*4);
      ellipse(c,'#e3d48a25',158,520,r,r*.6);c.strokeStyle='#e6d790';c.lineWidth=2;c.setLineDash([4,4]);c.beginPath();c.ellipse(158,520,r,r*.6,0,0,Math.PI*2);c.stroke();c.setLineDash([]);text(c,'↓',158,482,'#eee2a3',24);
    }
    const p=this.pointer||(!this.selection?recent:null);
    if(p){
      const placed=!!recent&&!this.selection;
      const placement=placed?recent:game.resolveDeployment(0,key,p.x,p.y),point=placement||p;
      const valid=!!placement&&(placed||game.energy[0]>=card.cost);
      const color=valid?'#e9dc9e':'#e7947b';
      if(card.rolling){const length=card.travelDistance;c.fillStyle='#f3d38930';c.fillRect(point.x-card.splash,point.y-length,card.splash*2,length);c.strokeStyle=color;c.lineWidth=2;line(c,color,point.x-card.splash,point.y-length,point.x+card.splash,point.y-length,2);}
      if(!card.spell){
        c.fillStyle='#9fe4e415';c.strokeStyle='#b7ededbb';c.lineWidth=1.5;c.setLineDash([5,6]);c.beginPath();c.arc(point.x,point.y,card.range,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);
        for(const enemy of game.deploymentThreats(0,key,point.x,point.y,placed)){
          const id=enemy.card?.id,scale=visualScale(enemy);
          const height='king'in enemy?(enemy.king?106:96):(this.bodyHeights.get(id)||23)*scale+(enemy.card.structure?24:enemy.card.flying?16:0)+25;
          const bx=enemy.x+18,by=Math.max(22,enemy.y-height/(this.verticalScale||1));
          ellipse(c,'#ef554944',enemy.x,enemy.y,enemy.radius+7,9);
          c.save();c.translate(bx,by);c.scale(1,1/(this.verticalScale||1));
          ellipse(c,'#b9202e',0,0,12,14);c.strokeStyle='#ffe7cd';c.lineWidth=2;c.beginPath();c.ellipse(0,0,12,14,0,0,Math.PI*2);c.stroke();
          text(c,'!',0,0,'#fff7e9',22,900);c.restore();
        }
      }
      c.globalAlpha=.12;ellipse(c,color,point.x,point.y,card.spell?card.splash:27,card.spell?card.splash:18);c.globalAlpha=1;
      c.strokeStyle=color;c.lineWidth=2;c.setLineDash([5,4]);c.beginPath();c.ellipse(point.x,point.y,card.spell?card.splash:27,card.spell?card.splash:18,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
      if((!card.spell||card.rolling)&&valid&&this.selection){
        const positions=card.rolling?[point]:game.deploymentPositions(0,key,point.x,point.y);
        for(const [index,position]of positions.entries()){
          c.fillStyle='#b6f1ec30';c.strokeStyle='#c2f4ed';c.lineWidth=1.5;c.fillRect(position.x-TILE/2,position.y-TILE/2,TILE,TILE);c.strokeRect(position.x-TILE/2,position.y-TILE/2,TILE,TILE);
          if(!card.spell){c.globalAlpha=.55;this.sprite(c,{...position,card,team:0,dx:0,dy:-1,anim:this.t,id:-1-index,lifetime:card.lifetime},true);c.globalAlpha=1;}
        }
      }
      if(!valid){line(c,color,p.x-5,p.y-5,p.x+5,p.y+5,2);line(c,color,p.x+5,p.y-5,p.x-5,p.y+5,2);}
    }
    c.restore();
  }
  fireball(c,spell){
    if(spell.delay>0||spell.done)return;
    const progress=Math.min(1,spell.flightElapsed/Math.max(.001,spell.flightTime));
    const distance=Math.hypot(spell.x-spell.startX,spell.y-spell.startY),arc=Math.min(120,40+distance*.18);
    const position=t=>({x:spell.startX+(spell.x-spell.startX)*t,y:spell.startY+(spell.y-spell.startY)*t-60*(1-t)-Math.sin(Math.PI*t)*arc});
    const point=position(progress);
    ellipse(c,'#251d1940',point.x,spell.startY+(spell.y-spell.startY)*progress,15,6);
    for(let i=8;i>0;i--){const tail=position(Math.max(0,progress-i*.012));c.globalAlpha=(1-i/10)*.65;ellipse(c,i>4?'#e96330':'#ffc35e',tail.x,tail.y,Math.max(3,14-i),Math.max(3,12-i));}
    c.globalAlpha=1;c.save();c.shadowColor='#ff9a36';c.shadowBlur=18;ellipse(c,'#e95125',point.x,point.y,14,14);ellipse(c,'#ffbf50',point.x-2,point.y-2,10,11);ellipse(c,'#fff1b0',point.x-3,point.y-3,5,7);c.restore();
  }
  draw(game, dt = .016) {
    const c=this.ctx;this.t+=dt;this.drawDt=dt;const bounds=this.canvas.getBoundingClientRect();this.verticalScale=bounds.width?bounds.height/bounds.width*W/H:1;
    c.imageSmoothingEnabled=false;c.drawImage(this.background,0,0);this.drawWater(c);
    // Forest shade falls softly over the far edge; the play area stays readable.
    const shade=c.createLinearGradient(0,0,0,180);shade.addColorStop(0,'#142c2733');shade.addColorStop(1,'#142c2700');c.fillStyle=shade;c.fillRect(0,0,W,180);
    for(const field of game.fields||[]){
      const psychic=field.style==='psychic';ellipse(c,psychic?'#8779cc30':'#845aa640',field.x,field.y,field.radius,field.radius*.65);c.strokeStyle=psychic?'#bcb6f1aa':'#ce9bdd77';c.lineWidth=2;c.beginPath();c.ellipse(field.x,field.y,field.radius,field.radius*.65,psychic?Math.sin(this.t)*.1:0,0,Math.PI*2);c.stroke();
      for(let i=0;i<4;i++)if(psychic){const a=this.t+i*Math.PI/2;line(c,'#d8d2f7aa',field.x+Math.cos(a)*30-3,field.y+Math.sin(a)*17,field.x+Math.cos(a)*30+3,field.y+Math.sin(a)*17-4,2);}else ellipse(c,'#c7a0d65a',field.x+Math.sin(i*2+this.t)*field.radius*.6,field.y-((this.t*25+i*13)%40),3,5);
    }
    for(const spell of game.spells){
      if(spell.card.rolling){c.save();c.translate(spell.x,spell.y);c.rotate(Math.sin(this.t*16)*.04);ellipse(c,'#233b2966',0,8,50,12);rect(c,'#68472e',-43,-13,86,25);rect(c,'#ae7c43',-42,-13,84,18);line(c,'#dcaf68',-35,-8,35,-8,3);for(const x of[-43,43]){ellipse(c,'#c6a16b',x,0,8,13);ellipse(c,'#815932',x,0,4,8);}for(const x of[-24,0,24]){rect(c,'#634b35',x,-20,4,11);}c.restore();continue;}
      c.strokeStyle=spell.team?'#ed9e78':'#d4e8aa';c.lineWidth=2;c.setLineDash([5,5]);c.beginPath();c.arc(spell.x,spell.y,spell.card.splash,0,Math.PI*2);c.stroke();c.setLineDash([]);
    }
    // Sort by feet position so sprites and towers overlap naturally.
    const objects=[...game.towers.map(t=>({y:t.y,kind:'tower',value:t})),...game.units.map(u=>({y:u.drawY??u.y,kind:'unit',value:u.drawX===undefined?u:{...u,x:u.drawX,y:u.drawY}}))].sort((a,b)=>a.y-b.y);
    for(const o of objects){if(o.kind==='tower')this.tower(c,o.value);else this.sprite(c,o.value);}
    if(game.state==='ready'){
      for(const [key,x,y,team] of [['pikachu',217,286,1],['squirtle',393,290,1],['charmander',210,554,0],['bulbasaur',390,550,0]])this.sprite(c,{id:x,card:CARDS[key],x,y,team,anim:this.t,dx:0,dy:team?1:-1},true);
    }
    for(const p of game.projectiles)this.projectile(c,p);
    for(const spell of game.spells)if(spell.card.travelSpeed&&!spell.card.rolling)this.fireball(c,spell);
    this.drawEffects(c,dt);
    this.drawPlacement(c,game);
    if(this.healthStates.size>300){const ids=new Set(game.units.map(u=>u.id));for(const id of this.healthStates.keys())if(!ids.has(id))this.healthStates.delete(id);}
    for(const r of this.rings){
      r.life-=dt;const progress=1-r.life/r.max;
      c.globalAlpha=Math.max(0,r.life/r.max);c.strokeStyle=r.color;c.lineWidth=r.spell?3:2;c.beginPath();c.ellipse(r.x,r.y,r.radius*(.35+progress*.9),r.radius*(r.spell?1:.45)*(.35+progress*.9),0,0,Math.PI*2);c.stroke();
      if(r.spell==='thunder'&&progress<.5){c.strokeStyle='#fff5b4';c.lineWidth=4;c.beginPath();c.moveTo(r.x+15,r.y-170);c.lineTo(r.x-12,r.y-85);c.lineTo(r.x+9,r.y-86);c.lineTo(r.x-4,r.y);c.stroke();}
      c.globalAlpha=1;
    }
    this.rings=this.rings.filter(r=>r.life>0);
    for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.gravity*dt;c.globalAlpha=Math.max(0,p.life/p.max);rect(c,p.color,p.x,p.y,p.size,p.size);}
    this.particles=this.particles.filter(p=>p.life>0);c.globalAlpha=1;
    // Occasional leaves and fireflies are purely ambient.
    if(!this.reduced)for(let i=0;i<9;i++){
      const x=35+((i*113+this.t*(i%2?3:-2)+6000)%530),y=50+((i*171+this.t*8)%700);
      if(y>365&&y<440)continue;
      rect(c,'#e3dc9d',x,y,2,2);c.globalAlpha=.12;ellipse(c,'#f3e5a1',x+1,y+1,5,5);c.globalAlpha=1;
    }
  }
}
