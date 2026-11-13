import { W, H, TILE, DEPLOY_GRID, LANES, RIVER, BRIDGE, PRINCESS_Y, CARDS, DEFAULT_DECK, directionRow, attackPoseProgress } from './engine.js?v=17';

function rect(c, color, x, y, w, h) { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function ellipse(c, color, x, y, rx, ry) { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
function line(c, color, x1, y1, x2, y2, width = 1) { c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function text(c, label, x, y, color = '#f8f1d6', size = 12, weight = 600) { c.font = `${weight} ${size}px "DM Sans", "Segoe UI", sans-serif`; c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x, y); }
const visualScale = unit => unit.scale ?? unit.card?.scale ?? 1.5;
const COMBAT_ART={flame:0,hydro:1,bubble:2,missile:3,leaf:4,poison:5,shadow:6,psychic:7,lightning:8,impact:9,ice:10,heal:11,rock:12,dust:13,slash:14,explosion:15};
function atlasSprite(c,img,index,x,y,width,height=width,angle=0){
  if(!img?.complete||!img.naturalWidth)return false;
  const cell=img.naturalWidth/4;
  c.save();c.translate(x,y);if(angle)c.rotate(angle);
  c.drawImage(img,index%4*cell,Math.floor(index/4)*cell,cell,cell,-width/2,-height/2,width,height);c.restore();return true;
}
function pixelBall(c,x,y,open=0){
  const split=Math.round(open*4);
  rect(c,'#25352f',x-4,y-8-split,8,2);rect(c,'#25352f',x-6,y-6-split,12,3);rect(c,'#25352f',x-8,y-3-split,16,4);
  rect(c,'#d85c4e',x-4,y-6-split,8,2);rect(c,'#e7745c',x-6,y-4-split,12,3);rect(c,'#ffd8a0',x-3,y-5-split,4,2);
  rect(c,'#25352f',x-8,y+split,16,4);rect(c,'#25352f',x-6,y+4+split,12,3);rect(c,'#25352f',x-4,y+7+split,8,2);
  rect(c,'#f3e8bd',x-6,y+2+split,12,2);rect(c,'#fff5d5',x-4,y+4+split,8,3);
  rect(c,'#25352f',x-4,y-2,8,6);rect(c,open?'#fff6cc':'#c8caaa',x-2,y,4,2);
}
function pixelMeter(c,x,y,width,progress,color,segments=6){
  rect(c,'#24352e',x-2,y-2,width+4,8);rect(c,'#495346',x,y,width,4);
  const gap=2,step=(width+gap)/segments,filled=Math.floor(Math.max(0,Math.min(1,progress))*segments+1e-6);
  for(let i=0;i<segments;i++)if(i<filled){rect(c,color,x+i*step,y,step-gap,4);rect(c,'#fff3c1',x+i*step,y,step-gap,1);}
}
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
    this.verticalScale=1;
    this.resizeObserver=new ResizeObserver(([entry])=>{const{width,height}=entry.contentRect;this.verticalScale=width?height/width*W/H:1;});
    this.resizeObserver.observe(canvas);
    this.background = document.createElement('canvas'); this.background.width = W; this.background.height = H;
    this.sprites = new Map(); this.metadata = {};
    this.anchors = new Map(); this.bodyHeights = new Map(); this.effects = [];
    this.particles = []; this.numbers = [];
    this.healthStates=new Map();this.speciesLoads=new Map();this.imageLoads=new Map();
    this.uiAtlas=new Image();this.uiAtlas.src='assets/ui/menu-icons-v1.webp';
    this.combatAtlas=new Image();this.combatAtlas.src='assets/ui/combat-effects-v1.webp';
    this.t = 0; this.reduced = false; this.pointer = null; this.selection = null; this.tutorialSpot = false;
    this.buildBackground();
  }
  async load(keys=DEFAULT_DECK) {
    const response = await fetch('assets/pokemon/manifest.json?v=17');
    if (!response.ok) throw new Error('No se pudo cargar el archivo de sprites.');
    this.metadata = await response.json();
    await Promise.all([this.ensureSpecies([...keys.map(k=>CARDS[k]?.id),31,34,52].filter(Boolean)),this.uiAtlas.decode().catch(()=>{}),this.combatAtlas.decode().catch(()=>{})]);
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
        const data=ctx.getImageData(0,0,img.width,img.height).data;let height=0;
        for(let row=0;row<img.height/meta.height;row++)for(let frame=0;frame<meta.durations.length;frame++){
          let top=meta.height;
          for(let y=0;y<meta.height&&top===meta.height;y++)for(let x=0;x<meta.width;x++)if(data[((row*meta.height+y)*img.width+frame*meta.width+x)*4+3]>0){top=y;break;}
          height=Math.max(height,(anchors[row]?.[frame]?.y??meta.height*.7)-top);
        }
        this.bodyHeights.set(Number(id),height);
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
    c.save(); if (tower.hit > 0&&!this.reduced) { c.translate(Math.sin(this.t * 150) * 1.5,0); }
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
    if (tower.stun > 0) { c.globalAlpha = this.reduced?.5:.5 + Math.sin(this.t*12)*.2; ellipse(c,'#fff3a48a',x,y-35,ww*.6,30);c.globalAlpha=1; }
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
    const clock=attacking?progress*duration:this.reduced?0:(unit.anim||this.t)*60*(unit.card.charge&&unit.charge>=unit.card.charge?1.65:1);
    let cursor = attacking?clock:((clock % duration) + duration) % duration;
    for (let i=0;i<meta.durations.length;i++) { if(cursor<meta.durations[i]) {frame=i;break;}cursor-=meta.durations[i]; }
    let direction = directionRow(unit.dx,unit.dy);
    if(img.height/meta.height<8)direction=0;
    const {x,y}=unit;
    const anchor=this.anchors.get(`${id}-${anim}`)?.[direction]?.[frame]||{x:meta.width/2,y:meta.height*.65};
    const leapLift=unit.leap?Math.sin(Math.PI*unit.leap.elapsed/unit.leap.duration)*(this.reduced?12:48):0;
    const lift=leapLift+(unit.card.structure?23:unit.card.flying?16+(this.reduced?0:Math.sin(this.t*5+unit.id)*3):0);
    const sinceHit = elapsed - windup;
    const pulse = sinceHit >= 0 && unit.card.burst ? Math.max(0,1-(sinceHit % unit.card.burstSpacing)/.13) : Math.sin(progress*Math.PI);
    const lunge=attacking&&!unit.mounted&&unit.card.range<50&&!this.reduced?pulse*5:0;
    const radius=unit.radius||12;
    if(!unit.mounted&&!unit.preview){
      ellipse(c,'#15382a65',x,y+2,radius+2,unit.card.flying?6:4);
    }
    if(unit.card.structure)this.platform(c,unit);
    c.save();
    const spawnProgress=unit.spawn>0?Math.max(0,1-unit.spawn/Math.max(.001,unit.spawnGroup?.duration??.75)):1;
    if(unit.spawn>0)c.globalAlpha=.2+.8*spawnProgress;
    if(unit.hit>0&&!this.reduced) c.filter='brightness(1.5)';
    const px=x+unit.dx*lunge-anchor.x*scale,py=y+unit.dy*lunge-lift-(this.reduced?0:(1-spawnProgress)*12/vertical)-anchor.y*scale/vertical;
    if(unit.card.charge&&unit.charge>=unit.card.charge&&!this.reduced){for(let i=3;i>0;i--){c.globalAlpha=.08*(4-i);c.drawImage(img,frame*meta.width,direction*meta.height,meta.width,meta.height,Math.round(px-unit.dx*i*9),Math.round(py-unit.dy*i*9),meta.width*scale,meta.height*scale/vertical);}c.globalAlpha=1;}
    c.drawImage(img,frame*meta.width,direction*meta.height,meta.width,meta.height,Math.round(px),Math.round(py),meta.width*scale,meta.height*scale/vertical);
    c.restore();
    if(unit.shield>0&&!unit.mounted){c.save();c.strokeStyle='#c4eaf0aa';c.lineWidth=2;c.beginPath();c.ellipse(x,y-lift-15,radius+7,24,0,Math.PI*.05,Math.PI*.95);c.stroke();c.restore();}
    if(idle)return;
    const by=y-lift-((this.bodyHeights.get(id)||22)*scale+9)/vertical;
    this.healthBar(c,unit,x,by,unit.maxHp<=1?18:unit.card.count?30:unit.maxHp>=1800?52:44);
    if(unit.card.ability&&!unit.abilityUsed){ellipse(c,'#382448',x+27,by+4,6,6);text(c,'◆',x+27,by+4,'#e9beff',10,800);}
    if(unit.card.summon&&unit.spawn<=0)this.summonIndicator(c,unit,x,by-(unit.shield>0?13:12)/vertical);
    if(unit.stun>0){text(c,'ϟ',x,by-10,'#fff3a4',15,800);}
    else if(unit.slow>0){text(c,'↓',x,by-10,'#bae2a2',12);}
    if(unit.burn){for(let i=0;i<3;i++){const phase=(this.t*4+i*.3)%1;ellipse(c,unit.burn.kind==='poison'?(i%2?'#d1addf':'#9871b3'):(i%2?'#e9b66c':'#e58449'),x-8+i*7,y-6-phase*13,3*(1-phase)+1,unit.burn.kind==='poison'?3:5*(1-phase)+2);}}
  }
  drawDeployments(c,game){
    const groups=new Map(),vertical=this.verticalScale||1;
    for(const unit of game.units){
      if(unit.hp<=0||unit.spawn<=0)continue;
      const group=unit.spawnGroup||{id:unit.id,x:unit.x,y:unit.y,duration:.75};
      let marker=groups.get(group.id);
      if(!marker){marker={...group,top:H,remaining:0};groups.set(group.id,marker);}
      const lift=unit.card.structure?23:unit.card.flying?16:0;
      marker.top=Math.min(marker.top,(unit.drawY??unit.y)-lift-((this.bodyHeights.get(unit.card.id)||22)*visualScale(unit)+35)/vertical);
      marker.remaining=Math.max(marker.remaining,unit.spawn);
    }
    for(const marker of groups.values()){
      const progress=Math.max(0,Math.min(1,1-marker.remaining/Math.max(.001,marker.duration)));
      this.deploymentIndicator(c,marker,progress);
    }
  }
  deploymentIndicator(c,marker,progress){
    const vertical=this.verticalScale||1,x=Math.max(28,Math.min(W-28,marker.x)),y=Math.max(18/vertical,marker.top);
    c.save();c.translate(Math.round(x),Math.round(y));c.scale(1,1/vertical);
    rect(c,'#26382f',-27,-12,54,24);rect(c,'#eee2b8',-25,-10,50,20);rect(c,'#fff4ce',-23,-8,46,2);
    if(!atlasSprite(c,this.uiAtlas,13,-13,0,23))pixelBall(c,-13,0,this.reduced?0:Math.max(0,(progress-.78)/.22));
    pixelMeter(c,-1,-1,21,progress,'#d8ac52',4);
    c.restore();
  }
  summonIndicator(c,unit,x,y){
    const progress=1-Math.min(1,Math.max(0,unit.summonClock)/Math.max(.001,unit.summonCycle||unit.card.summonEvery));
    c.save();c.translate(Math.round(x),Math.round(y));c.scale(1,1/(this.verticalScale||1));
    if(!atlasSprite(c,this.uiAtlas,13,-23,0,21))pixelBall(c,-23,0);
    pixelMeter(c,-10,-1,32,progress,unit.card.color||'#bea2d8',8);
    c.restore();
  }
  combatArt(c,name,x,y,size,angle=0,height=size){
    c.save();c.translate(x,y);c.scale(1,1/(this.verticalScale||1));
    const drawn=atlasSprite(c,this.combatAtlas,COMBAT_ART[name],0,0,size,height,angle);c.restore();return drawn;
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
    if(type==='cast'&&event.key==='pinMissile'){
      const hitAt=CARDS.pinMissile.castDelay??.55,life=hitAt+.42;
      this.effects.push({...event,kind:'missiles',hitAt,life,max:life});
    }
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
    if(type==='heal'&&event.amount>0){this.floatingNumber(event.unit,event.amount,'heal');this.effects.push({kind:'artImpact',art:'heal',x:event.unit.x,y:event.unit.y-18,radius:30,life:.45,max:.45});}
    if(type==='spawn'){
      const u=event.unit,group=u.spawnGroup||{id:u.id,x:u.x,y:u.y};this.ensureSpecies([u.card.id]).catch(()=>{});
      if(u.spawn>0&&!this.effects.some(e=>e.kind==='release'&&e.groupId===group.id))this.effects.push({kind:'release',groupId:group.id,x:group.x,y:group.y,color:u.card.color,delay:u.spawn,life:.3,max:.3});
    }
    if(type==='entry')this.effects.push({...event,kind:'entry',life:.36,max:.36});
    if(type==='ability'||type==='deathBurst'){
      const art={electric:'lightning',water:'hydro',fire:'explosion',grass:'leaf',psychic:'psychic',ghost:'shadow',rock:'dust'}[event.unit.card.type]||'impact';
      this.effects.push({kind:'artImpact',art,x:event.unit.x,y:event.unit.y-15,radius:Math.min(95,event.radius||55),life:.5,max:.5});
    }
    if(type==='hit'){
      const color=CARDS[event.key]?.color||'#eee8bc';
      const art={ember:'explosion',hydro:'hydro',bubble:'bubble',leaf:'leaf',poison:'poison',powder:'poison',shadow:'shadow',confusion:'psychic',aura:'psychic',ice:'ice',rock:'dust'}[event.style];
      if(art)this.effects.push({kind:'artImpact',art,x:event.x,y:event.y,radius:28,life:.28,max:.28});
      else this.burst(event.x,event.y,color,4,30);
      if(['egg','song'].includes(event.style))this.effects.push({...event,kind:'impact',life:.4,max:.4,radius:CARDS[event.key]?.splash||18});
    }
    if(type==='faint')this.burst(event.unit.x,event.unit.y-15,'#ddd9bd',12,55);
    if(type==='structureDown'){this.burst(event.unit.x,event.unit.y-10,'#a9b395',28,85);this.burst(event.unit.x,event.unit.y-24,'#a4d5de',10,60);}
    if(type==='towerDown'){
      this.burst(event.tower.x,event.tower.y-20,'#c5b88d',35,110);
      this.effects.push({kind:'artImpact',art:'dust',x:event.tower.x,y:event.tower.y-15,radius:85,life:.8,max:.8});
    }
    if(type==='spellHit'){
      if(event.key==='pinMissile'){
        const volley=this.effects.find(e=>e.kind==='missiles'&&!e.landed&&e.team===event.team&&e.x===event.x&&e.y===event.y);
        if(volley){volley.life=Math.min(volley.life,.42);volley.landed=true;}
        else{const hitAt=CARDS.pinMissile.castDelay??.55;this.effects.push({...event,kind:'missiles',landed:true,hitAt,life:.42,max:hitAt+.42});}
        return;
      }
      if(event.key==='thunder'){this.effects.push({...event,kind:'entry',style:'lightning',life:.36,max:.36});return;}
      if(CARDS[event.key].fieldDuration)return;
      const art={fireball:'explosion',lightning:'lightning',hyperBeam:'impact',blizzard:'ice',log:'dust'}[event.key]||'impact';
      this.effects.push({...event,kind:'artImpact',art,life:.4,max:.4});
      if(['hyperBeam','blizzard'].includes(event.key))this.effects.push({...event,kind:'spell',life:.65,max:.65});
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
    const art={leaf:'leaf',bubble:'bubble',hydro:'hydro',poison:'poison',powder:'poison',ember:'flame',ice:'ice',aura:'psychic',confusion:'psychic',shadow:'shadow',rock:'rock',magnet:'lightning'}[p.style];
    if(art){
      const angle=['bubble','poison','powder','aura','confusion'].includes(p.style)?0:p.style==='rock'?(this.reduced?0:progress*5):Math.atan2((p.target.y-18-p.y)*(this.verticalScale||1),p.target.x-p.x);
      const size={hydro:42,bubble:23,shadow:38,aura:38,confusion:30,poison:30,powder:36,rock:38,leaf:29,ice:32,ember:34,magnet:28}[p.style]||30;
      if(p.style==='rock')ellipse(c,'#233b2955',p.x,p.y+12,11,5);
      if(this.combatArt(c,art,x,y,size,angle))return;
    }
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
  drawMissiles(c,e){
    const age=e.max-e.life,after=age-e.hitAt,count=this.reduced?9:21;
    for(let i=0;i<count;i++){
      const angle=i*2.39996,r=Math.sqrt((i+.5)/count)*e.radius*.91;
      const x=e.x+Math.cos(angle)*r,y=e.y+Math.sin(angle)*r,launch=(i%3)*.055;
      if(age<launch)continue;
      const flight=Math.max(0,Math.min(1,(age-launch)/(e.hitAt-launch))),direction=e.team?-1:1;
      if(after<0){
        const travel=this.reduced?0:(1-flight),px=x-direction*travel*108,py=y-travel*210;
        c.globalAlpha=this.reduced?.6:Math.min(1,flight*3);
        rect(c,'#30413270',x-3,y,6,2);
        c.save();c.translate(Math.round(px),Math.round(py));c.rotate(Math.atan2(210,direction*108));
        if(!this.reduced){rect(c,'#cee89650',-31,-1,17,2);rect(c,'#f0f3c480',-20,-1,8,2);}
        if(!atlasSprite(c,this.combatAtlas,COMBAT_ART.missile,-3,0,36)){
          rect(c,'#354b32',-13,-3,14,6);rect(c,'#70934c',-11,-2,13,4);rect(c,'#d4ed9f',-11,-2,10,2);
          c.fillStyle='#f5f6cc';c.beginPath();c.moveTo(8,0);c.lineTo(-3,-3);c.lineTo(-3,3);c.closePath();c.fill();
          rect(c,'#a7c875',-14,-4,4,3);rect(c,'#a7c875',-14,1,4,3);
        }c.restore();
      }else{
        const fade=Math.max(0,1-after/.42),spread=this.reduced?3:3+after*22;
        c.globalAlpha=fade;
        rect(c,'#35452d80',x-4,y,8,3);line(c,'#48623b',x-3,y+2,x-7,y-10,3);line(c,'#e3edb7',x-3,y,x-7,y-10,1);
        if(after<.14){line(c,'#fff2bc',x-6,y-4,x+5,y+3,2);line(c,'#fff2bc',x-5,y+3,x+5,y-5,2);}
        for(let j=0;j<3;j++){const a=i+j*Math.PI*2/3;rect(c,j?'#b0c27c':'#e0cf97',x+Math.cos(a)*spread,y+Math.sin(a)*spread*.5-(this.reduced?0:Math.sin(after/.42*Math.PI)*7),3,2);}
      }
    }
    c.globalAlpha=1;
  }
  entryEffect(c,e,progress){
    const lightning=e.style==='lightning',radius=e.radius||60,phase=this.reduced?0:Math.floor(progress*5);
    if(lightning&&progress<.35){
      c.strokeStyle='#ae792d';c.lineWidth=6;c.beginPath();c.moveTo(e.x+12,e.y-100);c.lineTo(e.x-7,e.y-53);c.lineTo(e.x+10,e.y-53);c.lineTo(e.x-2,e.y-4);c.stroke();c.strokeStyle='#fff3b2';c.lineWidth=3;c.stroke();
    }
    for(let i=0;i<(this.reduced?4:8);i++){
      const a=i*Math.PI/4+.2,r=radius*(.35+(this.reduced?.2:progress*.65)),x=e.x+Math.cos(a)*r,y=e.y+Math.sin(a)*r*.65;
      if(lightning){
        const start=radius*.16;c.strokeStyle='#e1b548';c.lineWidth=3;c.beginPath();c.moveTo(e.x+Math.cos(a)*start,e.y+Math.sin(a)*start*.65);c.lineTo(x-Math.sin(a)*(phase%2?6:-6),y+Math.cos(a)*5);c.lineTo(x,y-4);c.stroke();c.strokeStyle='#fff2b2';c.lineWidth=1;c.stroke();
        rect(c,'#fff3bd',x-2,y-7,4,4);
      }else{
        line(c,'#82bfd5',x,y-9,x,y+1,3);line(c,'#e2f9f3',x-4,y-4,x+4,y-4,2);line(c,'#e2f9f3',x,y-8,x,y,1);
      }
    }
  }
  drawEffects(c,dt){
    for(const e of this.effects){
      let activeDt=dt;
      if(e.delay>0){activeDt=Math.max(0,dt-e.delay);e.delay-=dt;if(e.delay>0)continue;}
      e.life-=activeDt;if(e.life<=0)continue;const progress=1-e.life/e.max;c.save();c.globalAlpha=Math.max(0,Math.min(1,e.life/e.max*1.8));
      if(e.kind==='missiles')this.drawMissiles(c,e);
      else if(e.kind==='entry')this.entryEffect(c,e,progress);
      else if(e.kind==='artImpact'){
        const size=Math.max(24,Math.min(120,(e.radius||30)*1.4)),spread=this.reduced?0:progress*14;
        if(e.art==='dust'||e.art==='poison'||e.art==='heal'){
          for(let i=0;i<(this.reduced?1:3);i++){
            const x=e.x+(i-1)*(8+spread),y=e.y-(this.reduced?0:progress*18)+(i%2?4:0);
            if(!this.combatArt(c,e.art,x,y,size*.65))rect(c,e.art==='heal'?'#b7da93':'#c8b389',x-3,y-3,6,6);
          }
        }else if(!this.combatArt(c,e.art,e.x,e.y,size*(this.reduced?1:.65+Math.sin(Math.min(1,progress*2)*Math.PI/2)*.4))){rect(c,'#ebdcab',e.x-5,e.y-1,10,2);rect(c,'#fff2c2',e.x-1,e.y-5,2,10);}
      }
      else if(e.kind==='release'){
        for(let i=0;i<(this.reduced?3:6);i++){
          const a=i*Math.PI/3,r=8+(this.reduced?4:progress*24),x=e.x+Math.cos(a)*r,y=e.y-6+Math.sin(a)*r*.45-(this.reduced?0:progress*14);
          if(!this.combatArt(c,'impact',x,y,15)){rect(c,e.color||'#e4dba7',x-3,y-1,6,2);rect(c,'#fff0bf',x-1,y-3,2,6);}
        }
      }else if(e.kind==='beam'){
        const {from:a,to:b}=e;
        if(e.style==='vine'){
          c.strokeStyle='#6b9b4e';c.lineWidth=4;c.beginPath();c.moveTo(a.x,a.y);c.quadraticCurveTo((a.x+b.x)/2+(this.reduced?0:Math.sin(progress*Math.PI)*9),(a.y+b.y)/2-15,b.x,b.y);c.stroke();c.strokeStyle='#bed783';c.lineWidth=1;c.stroke();
          for(let j=1;j<4;j++){const t=j/4,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t-10;ellipse(c,'#8fbe67',x,y,4,2);}
        }else if(e.style==='psychic'){
          c.strokeStyle='#c8a1e6';c.lineWidth=7;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.strokeStyle='#f1e2fa';c.lineWidth=2;c.stroke();
          for(let i=1;i<5;i++){const t=(i/5+(this.reduced?0:progress*.15))%1;this.combatArt(c,'psychic',a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,20);}
        }else{
          c.shadowColor='#ffe59c';c.shadowBlur=this.reduced?0:8;c.strokeStyle='#edd36c';c.lineWidth=4;c.beginPath();c.moveTo(a.x,a.y);
          for(let i=1;i<8;i++){const t=i/8,offset=Math.sin(i*17+(this.reduced?0:Math.floor(progress*3)))*7;c.lineTo(a.x+(b.x-a.x)*t+offset,a.y+(b.y-a.y)*t-offset*.5);}
          c.lineTo(b.x,b.y);c.stroke();c.strokeStyle='#fff8cf';c.lineWidth=1.5;c.stroke();
        }
      }else if(e.kind==='windup'){
        const a=e.actor;this.combatArt(c,e.style==='eruption'?'flame':'dust',a.x,a.y-4,22+progress*10);
      }else if(e.kind==='counter'){
        line(c,'#8cc8f2',e.from.x,e.from.y,e.to.x,e.to.y,4*(1-progress)+1);this.combatArt(c,'psychic',e.to.x,e.to.y,28);
      }else if(e.kind==='impact'){
        const x=e.x,y=e.y,r=8+progress*e.radius;
        if(e.style==='egg'){for(let i=0;i<6;i++){const angle=i*Math.PI/3;rect(c,'#f5e6bd',x+Math.cos(angle)*r,y+Math.sin(angle)*r*.65,3,4);}}
        else{c.strokeStyle=e.style==='song'?'#d5d3f0':'#c9a2db';c.lineWidth=2;c.beginPath();c.ellipse(x,y,r,r*.6,0,0,Math.PI*2);c.stroke();}
      }else if(e.kind==='charge'){
        const a=e.actor,y=a.y-('king'in a?69:a.card.muzzleHeight||20),color=e.style==='lightning'?'#efd978':'#d0b3ed';
        for(let i=0;i<4;i++){const angle=i*Math.PI/2+.6,distance=4+(this.reduced?4:(1-progress)*13),x=a.x+Math.cos(angle)*distance,yy=y+Math.sin(angle)*distance;rect(c,color,x-3,yy-1,6,2);rect(c,'#fff2cf',x-1,yy-3,2,6);}
        rect(c,'#fff2cf',a.x-2,y-2,4,4);
      }else if(e.kind==='flame'){
        const a=e.from,b=e.to,angle=Math.atan2(b.y-a.y,b.x-a.x),length=Math.min(200,e.length+10);
        c.translate(a.x,a.y);c.rotate(angle);
        const gradient=c.createLinearGradient(0,0,length,0);gradient.addColorStop(0,'#fff0a4b0');gradient.addColorStop(.45,'#f6bb67a0');gradient.addColorStop(1,'#db744b00');c.fillStyle=gradient;
        c.beginPath();c.moveTo(0,-3);c.lineTo(length,-length*.32);c.quadraticCurveTo(length+15,0,length,length*.32);c.lineTo(0,3);c.fill();
        for(let i=0;i<(this.reduced?3:7);i++){
          const t=(i/7+(this.reduced?0:progress*.6))%1,x=t*length,yy=Math.sin(i*7+progress*5)*t*length*.2;
          if(!atlasSprite(c,this.combatAtlas,COMBAT_ART.flame,x,yy,30+t*48,22+t*40))ellipse(c,i%3?'#ec9f50':'#ffe5a0',x,yy,3+t*16,3+t*8);
        }
      }else if(e.kind==='melee'){
        const x=e.to.x,y=e.to.y;
        if(e.style==='eruption'){
          const radius=Math.max(20,e.radius||30);for(let i=0;i<10;i++){const angle=i*Math.PI/5,r=radius*(.25+progress*.75);ellipse(c,i%2?'#f5bc6a':'#ed884e',x+Math.cos(angle)*r,y+10+Math.sin(angle)*r*.5,4*(1-progress)+2,12*(1-progress)+3);}
        }else if(e.style==='slam'){
          const radius=e.radius||14;c.strokeStyle='#e2d8ae';c.lineWidth=3*(1-progress)+1;c.beginPath();c.ellipse(x,y+13,7+progress*radius,4+progress*radius*.35,0,0,Math.PI*2);c.stroke();
          for(let i=0;i<6;i++){const a=i*Math.PI/3;line(c,'#8b7855',x+Math.cos(a)*6,y+14+Math.sin(a)*3,x+Math.cos(a)*(10+progress*radius),y+14+Math.sin(a)*(5+progress*radius*.4),2);}
        }else if(e.style==='shadow'||e.style==='slash'){
          this.combatArt(c,e.style==='shadow'?'shadow':'slash',x,y,45);
        }else if(e.style==='lick'){
          c.strokeStyle='#c88fbc';c.lineWidth=5*(1-progress)+1;c.beginPath();c.moveTo(e.from.x,e.from.y);c.quadraticCurveTo((e.from.x+x)/2+10,(e.from.y+y)/2+8,x,y);c.stroke();ellipse(c,'#efd1e4',x,y,3,2);
        }else if(e.style==='horn'){
          c.fillStyle='#eed6eb';c.beginPath();c.moveTo(x-7,y+8);c.lineTo(x+2,y-13);c.lineTo(x+7,y+7);c.fill();line(c,'#ba90c8',x,y+5,x+2,y-8,2);
        }else if(e.style==='bite'){
          c.strokeStyle='#d7b6f0';c.lineWidth=2;c.beginPath();c.arc(x,y-4,10,0,Math.PI);c.stroke();line(c,'#f1deed',x-7,y-1,x-5,y+5,2);line(c,'#f1deed',x+7,y-1,x+5,y+5,2);
        }else{
          const from=e.from,dx=x-from.x,dy=y-from.y,d=Math.hypot(dx,dy)||1,px=x-dx/d*(10-progress*8),py=y-dy/d*(10-progress*8)+(e.shot%2?3:-3);
          line(c,e.style==='dash'?'#f2e6c0':'#e4d6aa',from.x,from.y,px,py,e.charged?6:3);
          if(!this.combatArt(c,'impact',px,py,e.charged?45:30)){ellipse(c,'#efe1b5',px,py,5,5);rect(c,'#c4ad83',px-3,py-1,6,3);}
          for(let i=0;i<5;i++){const a=i*Math.PI*.4;line(c,'#f5df9b',x+Math.cos(a)*5,y+Math.sin(a)*5,x+Math.cos(a)*(11+progress*7),y+Math.sin(a)*(11+progress*7),2);}
        }
      }else if(e.kind==='spell'){
        if(e.key==='hyperBeam'){
          const width=(1-progress)*17;c.shadowColor='#ffe7aa';c.shadowBlur=this.reduced?0:22;line(c,'#ffc575',e.x,e.y-330,e.x,e.y,width*2);line(c,'#fff6d6',e.x,e.y-330,e.x,e.y,width);
        }else for(let i=0;i<12;i++){const a=i*Math.PI/6,r=e.radius*progress;line(c,'#d2f8ff',e.x+Math.cos(a)*r-4,e.y+Math.sin(a)*r,e.x+Math.cos(a)*r+4,e.y+Math.sin(a)*r,2);line(c,'#d2f8ff',e.x+Math.cos(a)*r,e.y+Math.sin(a)*r-4,e.x+Math.cos(a)*r,e.y+Math.sin(a)*r+4,2);}
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
      const x=(i*97+(this.reduced?0:this.t*(i%2?9:14)))%640-20;
      const y=RIVER.top+4+(i*13)%(height-8);
      rect(c,i%3?'#a2d0b947':'#d8e8c34a',x,y,10+(i%4)*7,2);
    }
    c.restore();
    for(const x of LANES)this.bridge(c,x);
  }
  drawPlacement(c, game) {
    const key=this.selection,card=CARDS[key];
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
      c.strokeStyle='#e6d790';c.lineWidth=2;c.setLineDash([4,4]);c.strokeRect(158-TILE,520-TILE,TILE*2,TILE*2);c.setLineDash([]);text(c,'↓',158,482,'#eee2a3',24);
    }
    const p=this.pointer;
    if(p){
      const placement=game.resolveDeployment(0,key,p.x,p.y),point=placement||p;
      const valid=!!placement&&game.energy[0]>=card.cost;
      const color=valid?'#e9dc9e':'#e7947b';
      if(placement&&this.selection&&Math.hypot(point.x-p.x,point.y-p.y)>TILE/2){
        c.strokeStyle=color;c.lineWidth=2;c.setLineDash([3,5]);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(point.x,point.y);c.stroke();c.setLineDash([]);ellipse(c,color,p.x,p.y,3,3);
      }
      if(card.rolling){const length=card.travelDistance;c.fillStyle='#f3d38930';c.fillRect(point.x-card.splash,point.y-length,card.splash*2,length);c.strokeStyle=color;c.lineWidth=2;line(c,color,point.x-card.splash,point.y-length,point.x+card.splash,point.y-length,2);}
      if(!card.spell&&placement){
        const range=card.squad?Math.max(...card.squad.map(k=>CARDS[k].range)):card.range;
        if(!card.passive&&range>=50){
        c.fillStyle='#9fe4e415';c.strokeStyle='#b7ededbb';c.lineWidth=1.5;c.setLineDash([5,6]);c.beginPath();c.arc(point.x,point.y,range,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);
        }
        for(const enemy of game.deploymentThreats(0,key,point.x,point.y)){
          const id=enemy.card?.id,scale=visualScale(enemy);
          const height='king'in enemy?(enemy.king?106:96):(this.bodyHeights.get(id)||23)*scale+(enemy.card.structure?24:enemy.card.flying?16:0)+25;
          const bx=enemy.x+18,by=Math.max(22,enemy.y-height/(this.verticalScale||1));
          ellipse(c,'#ef554944',enemy.x,enemy.y,enemy.radius+7,9);
          c.save();c.translate(bx,by);c.scale(1,1/(this.verticalScale||1));
          ellipse(c,'#b9202e',0,0,12,14);c.strokeStyle='#ffe7cd';c.lineWidth=2;c.beginPath();c.ellipse(0,0,12,14,0,0,Math.PI*2);c.stroke();
          text(c,'!',0,0,'#fff7e9',22,900);c.restore();
        }
      }
      if(card.spell&&!card.rolling){
        c.globalAlpha=.12;ellipse(c,color,point.x,point.y,card.splash,card.splash);c.globalAlpha=1;
        c.strokeStyle=color;c.lineWidth=2;c.setLineDash([5,4]);c.beginPath();c.arc(point.x,point.y,card.splash,0,Math.PI*2);c.stroke();c.setLineDash([]);
      }
      if((!card.spell||card.rolling)&&valid&&this.selection){
        const positions=card.rolling?[point]:game.deploymentPositions(0,key,point.x,point.y);
        for(const [index,position]of positions.entries()){
          c.fillStyle='#b6f1ec30';c.strokeStyle='#c2f4ed';c.lineWidth=1.5;c.fillRect(position.x-TILE/2,position.y-TILE/2,TILE,TILE);c.strokeRect(position.x-TILE/2,position.y-TILE/2,TILE,TILE);
          if(!card.spell){const previewCard=CARDS[card.squad?.[index]]||card;c.globalAlpha=.55;this.sprite(c,{...position,card:previewCard,preview:true,team:0,dx:0,dy:-1,anim:this.t,id:-1-index,lifetime:card.lifetime},true);c.globalAlpha=1;}
        }
      }
      if(!valid){line(c,color,p.x-5,p.y-5,p.x+5,p.y+5,2);line(c,color,p.x+5,p.y-5,p.x-5,p.y+5,2);}
    }
    c.restore();
  }
  field(c,f){
    if(!f.key){
      const psychic=f.style==='psychic',motion=this.reduced?0:this.t;
      ellipse(c,psychic?'#8779cc30':'#845aa630',f.x,f.y,f.radius,f.radius*.65);
      for(let i=0;i<3;i++){
        const a=motion*.4+i*Math.PI*2/3,x=f.x+Math.cos(a)*f.radius*.4,y=f.y+Math.sin(a)*f.radius*.25-8;
        c.save();c.globalAlpha=Math.min(.65,f.life);this.combatArt(c,psychic?'psychic':'poison',x,y,psychic?23:37);c.restore();
      }
      return;
    }
    const color=CARDS[f.key].color,fade=Math.min(1,f.life),radius=f.radius;
    c.save();c.globalAlpha=fade;ellipse(c,color+'30',f.x,f.y,radius,radius);
    c.strokeStyle=color+'bb';c.lineWidth=2;c.setLineDash([4,6]);c.beginPath();c.arc(f.x,f.y,radius,0,Math.PI*2);c.stroke();c.setLineDash([]);
    c.save();c.translate(f.x,Math.min(H-12,f.y+radius+9));c.scale(1,1/(this.verticalScale||1));pixelMeter(c,-20,0,40,f.life/f.duration,color);c.restore();
    if(f.key==='spikes'||f.key==='stealthRock'){
      for(let i=0;i<13;i++){
        const angle=i*2.4,r=Math.sqrt((i+.5)/13)*radius*.82,x=f.x+Math.cos(angle)*r,y=f.y+Math.sin(angle)*r;
        const lift=f.key==='stealthRock'?10+(this.reduced?0:Math.sin(this.t*3+i)*3):0;
        if(lift)ellipse(c,'#19213850',x,y+3,6,3);
        c.fillStyle=f.key==='spikes'?'#b9a88a':'#a69181';c.strokeStyle='#f6e9c8';c.lineWidth=1.2;c.beginPath();c.moveTo(x-5,y-lift);c.lineTo(x-2,y-lift-12);c.lineTo(x+5,y-lift-3);c.lineTo(x+4,y-lift+3);c.closePath();c.fill();c.stroke();
      }
    }else if(f.key==='whirlpool'){
      for(let i=0;i<5;i++){const phase=this.reduced?i/5:(i/5+this.t*.4)%1;c.strokeStyle=i%2?'#d9faffbb':'#70d1f1bb';c.lineWidth=2;c.beginPath();c.ellipse(f.x,f.y,5+phase*radius*.85,3+phase*radius*.6,this.reduced?0:this.t*.2,phase*Math.PI*2,phase*Math.PI*2+Math.PI*1.6);c.stroke();}
    }else if(f.key==='nightmare'){
      ellipse(c,'#271d4577',f.x,f.y,radius*.6,radius*.38);
      for(let i=0;i<6;i++){const angle=i*Math.PI/3+(this.reduced?0:this.t*.4),x=f.x+Math.cos(angle)*radius*.7,y=f.y+Math.sin(angle)*radius*.6;ellipse(c,'#dcc3ff',x,y,2,4);line(c,'#ab8ada',x-3,y+7,x+3,y+7,1);}
    }else if(f.key==='earthquake'){
      for(let i=0;i<7;i++){const a=i*Math.PI/3.5,r=radius*.85;c.strokeStyle=i%2?'#392b25':'#f2c58d';c.lineWidth=i%2?3:1.5;c.beginPath();c.moveTo(f.x+Math.cos(a)*12,f.y+Math.sin(a)*12);c.lineTo(f.x+Math.cos(a+.3)*r*.6,f.y+Math.sin(a+.3)*r*.6);c.lineTo(f.x+Math.cos(a)*r,f.y+Math.sin(a)*r);c.stroke();}
    }
    c.restore();
  }
  frozen(c,actor){
    if(!(actor.freeze>0)||actor.hp<=0)return;
    const tower='king'in actor,width=tower?60:actor.radius*2+12,height=tower?90:38,y=actor.y-(actor.card?.flying?16:0);
    c.save();c.globalAlpha=Math.min(1,actor.freeze*2);c.fillStyle='#93e4ff44';c.strokeStyle='#d1faff';c.lineWidth=2;
    c.beginPath();c.moveTo(actor.x-width/2,y+5);c.lineTo(actor.x-width/2-4,y-height+8);c.lineTo(actor.x+width*.25,y-height-5);c.lineTo(actor.x+width/2+3,y-height+12);c.lineTo(actor.x+width/2,y+5);c.closePath();c.fill();c.stroke();
    line(c,'#e7fcff99',actor.x-width/2+8,y-10,actor.x+width*.2,y-height+3,2);c.restore();
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
    const c=this.ctx;this.t+=dt;this.drawDt=dt;
    c.imageSmoothingEnabled=false;c.drawImage(this.background,0,0);this.drawWater(c);
    // Forest shade falls softly over the far edge; the play area stays readable.
    const shade=c.createLinearGradient(0,0,0,180);shade.addColorStop(0,'#142c2733');shade.addColorStop(1,'#142c2700');c.fillStyle=shade;c.fillRect(0,0,W,180);
    for(const field of game.fields||[])this.field(c,field);
    for(const spell of game.spells){
      if(spell.key==='pinMissile')continue;
      if(spell.card.rolling){c.save();c.translate(spell.x,spell.y);c.rotate(Math.sin(this.t*16)*.04);ellipse(c,'#233b2966',0,8,50,12);rect(c,'#68472e',-43,-13,86,25);rect(c,'#ae7c43',-42,-13,84,18);line(c,'#dcaf68',-35,-8,35,-8,3);for(const x of[-43,43]){ellipse(c,'#c6a16b',x,0,8,13);ellipse(c,'#815932',x,0,4,8);}for(const x of[-24,0,24]){rect(c,'#634b35',x,-20,4,11);}c.restore();continue;}
      c.strokeStyle=spell.team?'#ed9e78':'#d4e8aa';c.lineWidth=2;c.setLineDash([5,5]);c.beginPath();c.arc(spell.x,spell.y,spell.card.splash,0,Math.PI*2);c.stroke();c.setLineDash([]);
    }
    // Sort by feet position so sprites and towers overlap naturally.
    const objects=[...game.towers.map(t=>({y:t.y,kind:'tower',value:t})),...game.units.map(u=>({y:u.drawY??u.y,kind:'unit',value:u.drawX===undefined?u:{...u,x:u.drawX,y:u.drawY}}))].sort((a,b)=>a.y-b.y);
    for(const o of objects){if(o.kind==='tower')this.tower(c,o.value);else this.sprite(c,o.value);this.frozen(c,o.value);}
    this.drawDeployments(c,game);
    if(game.state==='ready'){
      for(const [key,x,y,team] of [['pikachu',217,286,1],['squirtle',393,290,1],['charmander',210,554,0],['bulbasaur',390,550,0]])this.sprite(c,{id:x,card:CARDS[key],x,y,team,anim:this.t,dx:0,dy:team?1:-1},true);
    }
    for(const p of game.projectiles)this.projectile(c,p);
    for(const spell of game.spells)if(spell.card.travelSpeed&&!spell.card.rolling)this.fireball(c,spell);
    this.drawEffects(c,dt);
    this.drawPlacement(c,game);
    if(this.healthStates.size>300){const ids=new Set(game.units.map(u=>u.id));for(const id of this.healthStates.keys())if(!ids.has(id))this.healthStates.delete(id);}
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
