import { W, H, LANES, RIVER, CARDS } from './engine.js';

function rect(c, color, x, y, w, h) { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function ellipse(c, color, x, y, rx, ry) { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
function line(c, color, x1, y1, x2, y2, width = 1) { c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function text(c, label, x, y, color = '#f8f1d6', size = 12, weight = 600) { c.font = `${weight} ${size}px "DM Sans", "Segoe UI", sans-serif`; c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x, y); }
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
    this.particles = []; this.rings = []; this.numbers = [];
    this.t = 0; this.reduced = false; this.pointer = null; this.selection = null; this.tutorialSpot = false;
    this.buildBackground();
  }
  async load() {
    const response = await fetch('assets/pokemon/manifest.json');
    if (!response.ok) throw new Error('No se pudo cargar el archivo de sprites.');
    this.metadata = await response.json();
    await Promise.all(Object.entries(this.metadata).flatMap(([id, anims]) => Object.entries(anims).map(async ([name, meta]) => {
      const img = new Image(); img.src = meta.file;
      await img.decode();
      this.sprites.set(`${id}-${name}`, img);
    })));
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
    rect(c, '#174f475e', x - 45, 366, 99, 78);
    rect(c, '#513f2a', x - 41, 362, 82, 79);
    for (let y = 362; y < 441; y += 10) { rect(c, y % 20 === 2 ? '#a18a53' : '#b0985c', x - 39, y, 78, 8); rect(c, '#c2a56a', x - 37, y + 1, 72, 2); rect(c, '#76613c', x - 37, y + 8, 72, 2); rect(c, '#897447', x - 15 + (y % 3) * 10, y + 4, 17, 1); }
    for (const side of [-1,1]) {
      const xx = x + side * 42;
      rect(c, '#4e432d', xx - 3, 350, 7, 92); rect(c, '#c0a56e', xx - 2, 350, 3, 92);
      for (const yy of [355,393,433]) { rect(c, '#5e4f33', xx - 5, yy - 9, 10, 17); rect(c, '#bc9d66', xx - 3, yy - 10, 6, 14); rect(c, '#dfc387', xx - 4, yy - 11, 8, 3); }
    }
  }
  buildBackground() {
    const c = this.background.getContext('2d');
    c.imageSmoothingEnabled = false;
    const rnd = this.rng(8318);
    rect(c, '#466d3e', 0, 0, W, H);
    for (let y = 0; y < H; y += 24) for (let x = 0; x < W; x += 24) rect(c, (x/24 + y/24) % 2 ? '#527e45' : '#568348', x, y, 24, 24);
    // Inset field, worn edges, and fine pixel texture.
    for (let i = 0; i < 4200; i++) {
      const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H);
      rect(c, rnd() > .5 ? '#82a75b28' : '#284d3024', x, y, 2 + rnd() * 3, 2);
    }
    for (const x of LANES) {
      rect(c, '#738d4b', x - 40, 172, 80, 456);
      rect(c, '#a4a067', x - 28, 188, 56, 425);
      for (let y = 190; y < 616; y += 22) {
        for (let col = 0; col < 3; col++) {
          const xx = x - 27 + col * 18 + (Math.floor(y / 22) % 2) * 2;
          rect(c, '#7e8b50', xx, y, 17, 19); rect(c, rnd() > .6 ? '#abb078' : '#a2a66e', xx, y, 15, 16); rect(c, '#bec08644', xx + 1, y + 1, 12, 2);
        }
      }
      // Irregular grass at the paths keeps the arena from looking tiled flat.
      for (let y = 212; y < 600; y += 18) {
        const s = rnd() > .5 ? 1 : -1;
        rect(c, '#729553', x + s * 29 - 3, y, 8, 10); rect(c, '#587f45', x + s * 34 - 2, y + 5, 7, 8);
      }
    }
    for (const yy of [70, 705]) {
      rect(c, '#789553', 227, yy - 15, 147, 61); rect(c, '#879958', 236, yy - 10, 128, 48);
      for (let y = yy - 10; y < yy + 38; y += 16) for (let x = 237; x < 363; x += 20) { rect(c, '#96a367', x, y, 18, 14); rect(c, '#b8bb7d44', x+1, y, 16, 2); }
    }
    // River banks are deliberately jagged at pixel scale.
    rect(c, '#365c36', 0, 359, 600, 86); rect(c, '#7f9e57', 0, 365, 600, 8);
    rect(c, '#bfd18b', 0, 371, 600, 4); rect(c, '#326e64', 0, 375, 600, 50);
    rect(c, '#438e81', 0, 380, 600, 39); rect(c, '#5aa291', 0, 386, 600, 26);
    rect(c, '#a7c785', 0, 425, 600, 5); rect(c, '#7d9e56', 0, 430, 600, 9);
    for (let i = 0; i < 45; i++) { const x = i * 14 + rnd() * 8; rect(c, '#b4c883', x, 369 + rnd() * 5, 7, 3); rect(c, '#d0dba3', x + 3, 426, 4, 2); }
    // Side stone walls and thick forest enclose the actual battlefield.
    for (const side of [0,1]) {
      const x = side ? 566 : 16;
      for (let y = 28; y < H - 18; y += 24) { rect(c, '#3b593b', x + 2, y + 3, 19, 24); rect(c, '#798463', x, y, 17, 21); rect(c, '#9aa17d', x + 1, y + 1, 14, 4); rect(c, '#5a7350', x + 12, y + 6, 5, 14); }
    }
    for (let x = 24; x < W - 24; x += 25) { rect(c, '#6f7f58', x, 18, 24, 15); rect(c, '#98a06e', x + 1, 18, 21, 4); rect(c, '#6f7f58', x, 775, 24, 15); rect(c, '#98a06e', x + 1, 775, 21, 4); }
    for (const x of LANES) for (const y of [188,612]) {
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
    for (const [x,y] of [[71,392],[310,410],[527,402]]) { ellipse(c, '#487b4c', x, y, 9, 4); rect(c, '#91b465', x - 5, y - 2, 7, 2); }
    for (const x of [38,260,365,553]) { rect(c, '#477a43', x, 359, 2, 14); rect(c, '#a2af64', x, 357, 2, 5); rect(c, '#477a43', x + 5, 364, 2, 10); }
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
    ball(c,x,roofY-4,king?12:9,pal[0]);
    if (king) {
      rect(c,'#847951',x+27,roofY-32,3,42);
      c.fillStyle = pal[1]; c.beginPath(); c.moveTo(x+30,roofY-30); c.lineTo(x+54,roofY-26+Math.sin(this.t*3)*2);c.lineTo(x+51,roofY-12+Math.sin(this.t*3+1)*2);c.lineTo(x+30,roofY-15);c.fill();
      text(c,'★',x+40,roofY-22,'#e8dca5',11);
      if (!tower.active) { ellipse(c, '#1a322785',x,y+22,13,7);text(c,'z',x,y+21,'#cbd6b7',10); }
    }
    if (tower.stun > 0) { c.globalAlpha = .5 + Math.sin(this.t*25)*.3; ellipse(c,'#fff3a48a',x,y-35,ww*.6,30);c.globalAlpha=1; }
    const bw = king ? 64 : 58, by = y + 26;
    rect(c,'#20352ad9',x-bw/2-2,by-2,bw+4,10);rect(c,'#435845',x-bw/2,by,bw,6);rect(c,pal[1],x-bw/2,by,bw*(tower.hp/tower.maxHp),6);rect(c,pal[2],x-bw/2,by,bw*(tower.hp/tower.maxHp),2);
    c.font='600 12px "DM Sans",sans-serif';const hpWidth=c.measureText(String(Math.ceil(tower.hp))).width+12;
    rect(c,'#243b2ad9',x-hpWidth/2,by+10,hpWidth,16);text(c,String(Math.ceil(tower.hp)),x,by+18,team?'#f0c3a8':'#c4e3e8',11,700);
    c.restore();
  }
  sprite(c, unit, idle = false) {
    const id = unit.card.id;
    let anim = !idle && unit.attack > 0 ? 'Attack' : unit.moving ? 'Walk' : 'Idle';
    if (!this.sprites.has(`${id}-${anim}`)) anim = 'Walk';
    const meta = this.metadata[id]?.[anim], img = this.sprites.get(`${id}-${anim}`);
    if (!meta || !img) return;
    const scale = id === 95 ? 1.35 : id === 6 ? 1.55 : id === 143 ? 1.65 : 1.8;
    let frame = 0;
    const clock = this.reduced ? 0 : (anim === 'Attack' ? .36 - unit.attack : unit.anim || this.t) * 60;
    const duration = meta.durations.reduce((a,b)=>a+b,0);
    let cursor = ((clock % duration) + duration) % duration;
    for (let i=0;i<meta.durations.length;i++) { if(cursor<meta.durations[i]) {frame=i;break;}cursor-=meta.durations[i]; }
    let direction = (Math.round(Math.atan2(unit.dy,unit.dx)/(Math.PI/4))+6+8)%8;
    if(img.height/meta.height<8)direction=0;
    const bob = unit.card.flying && !this.reduced ? Math.sin(this.t*5+unit.id)*3 : 0;
    const {x,y}=unit;
    const radius=unit.radius||12;
    ellipse(c,'#15382a58',x+2,y+7,radius+3,7);
    c.strokeStyle=unit.team?'#e89a7866':'#90d9f077'; c.lineWidth=2;
    c.beginPath();c.ellipse(x,y+6,radius+2,6,0,0,Math.PI*2);c.stroke();
    c.save();
    if(unit.spawn>0) { c.globalAlpha=.5; }
    if(unit.hit>0) c.filter='brightness(1.8)';
    c.drawImage(img,frame*meta.width,direction*meta.height,meta.width,meta.height,Math.round(x-meta.width*scale/2),Math.round(y-meta.height*scale/2-12+bob),meta.width*scale,meta.height*scale);
    c.restore();
    if(idle)return;
    if(unit.spawn>0){
      const progress=1-unit.spawn/.75;
      c.strokeStyle='#ecdfae';c.lineWidth=2;c.beginPath();c.arc(x,y-5,17,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);c.stroke();
    }
    const by=y-(id===6?58:id===95?62:id===143?49:36);
    rect(c,'#172b20',x-15,by,30,5);rect(c,unit.team?'#df9177':'#91c8d6',x-14,by+1,28*(unit.hp/unit.maxHp),3);
    if(unit.stun>0){text(c,'ϟ',x,by-10,'#fff3a4',15,800);}
    else if(unit.slow>0){text(c,'↓',x,by-10,'#bae2a2',12);}
  }
  onEvent(event) {
    const {type}=event;
    if(type==='spawn')this.rings.push({x:event.unit.x,y:event.unit.y,color:event.unit.team?'#e89a78':'#96d5df',life:.7,max:.7,radius:24});
    if(type==='hit'){
      const color=CARDS[event.key]?.color||'#eee8bc';
      this.burst(event.x,event.y,color,5,35);
    }
    if(type==='faint')this.burst(event.unit.x,event.unit.y-15,'#ddd9bd',12,55);
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
    for(let i=0;i<count;i++)this.particles.push({x,y,vx:(Math.random()-.5)*speed,vy:(Math.random()-.5)*speed-20,color,life:.3+Math.random()*.4,max:.7,gravity:65,size:2+Math.random()*3});
  }
  drawWater(c) {
    c.save();c.beginPath();c.rect(0,377,W,46);c.clip();
    for(let i=0;i<25;i++){
      const x=(i*97+this.t*(i%2?9:14))%640-20;
      const y=382+(i*13)%35;
      rect(c,i%3?'#a2d0b947':'#d8e8c34a',x,y,10+(i%4)*7,2);
    }
    c.restore();
    for(const x of LANES)this.bridge(c,x);
  }
  drawPlacement(c, game) {
    const key=this.selection,card=CARDS[key];
    if(!card||game.state!=='playing')return;
    c.save();
    if(!card.spell){
      rect(c,'#132e2570',35,36,530,339);
      for(const lane of [0,1]){
        if(game.towers.some(t=>t.team===1&&t.lane===lane&&t.hp<=0))rect(c,'#8ed2a018',lane?300:36,252,264,104);
      }
      c.strokeStyle='#d9ebbc55';c.lineWidth=1;c.setLineDash([5,6]);c.strokeRect(42,445,516,305);c.setLineDash([]);
      text(c,'D E S P L E G Á  A C Á',300,480,'#e0ecc7aa',10,500);
    }
    if(this.tutorialSpot&&!card.spell){
      const r=29+(this.reduced?0:Math.sin(this.t*4)*4);
      ellipse(c,'#e3d48a25',158,520,r,r*.6);c.strokeStyle='#e6d790';c.lineWidth=2;c.setLineDash([4,4]);c.beginPath();c.ellipse(158,520,r,r*.6,0,0,Math.PI*2);c.stroke();c.setLineDash([]);text(c,'↓',158,482,'#eee2a3',24);
    }
    const p=this.pointer;
    if(p){
      const valid=game.canDeploy(0,key,p.x,p.y)&&game.energy[0]>=card.cost;
      const color=valid?'#e9dc9e':'#e7947b';
      c.globalAlpha=.12;ellipse(c,color,p.x,p.y,card.spell?card.splash:27,card.spell?card.splash:18);c.globalAlpha=1;
      c.strokeStyle=color;c.lineWidth=2;c.setLineDash([5,4]);c.beginPath();c.ellipse(p.x,p.y,card.spell?card.splash:27,card.spell?card.splash:18,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
      if(!card.spell&&valid){c.globalAlpha=.6;this.sprite(c,{x:p.x,y:p.y,card,team:0,dx:0,dy:-1,anim:this.t,id:-1},true);c.globalAlpha=1;}
      else if(card.spell)text(c,card.name,p.x,p.y-card.splash-13,color,12);
      if(!valid){line(c,color,p.x-5,p.y-5,p.x+5,p.y+5,2);line(c,color,p.x+5,p.y-5,p.x-5,p.y+5,2);}
    }
    c.restore();
  }
  draw(game, dt = .016) {
    const c=this.ctx;this.t+=dt;
    c.imageSmoothingEnabled=false;c.drawImage(this.background,0,0);this.drawWater(c);
    // Forest shade falls softly over the far edge; the play area stays readable.
    const shade=c.createLinearGradient(0,0,0,180);shade.addColorStop(0,'#142c2733');shade.addColorStop(1,'#142c2700');c.fillStyle=shade;c.fillRect(0,0,W,180);
    for(const spell of game.spells){
      c.strokeStyle=spell.team?'#ed9e78':'#d4e8aa';c.lineWidth=2;c.setLineDash([5,5]);c.beginPath();c.arc(spell.x,spell.y,spell.card.splash,0,Math.PI*2);c.stroke();c.setLineDash([]);
    }
    // Sort by feet position so sprites and towers overlap naturally.
    const objects=[...game.towers.map(t=>({y:t.y,kind:'tower',value:t})),...game.units.map(u=>({y:u.y,kind:'unit',value:u}))].sort((a,b)=>a.y-b.y);
    for(const o of objects){if(o.kind==='tower')this.tower(c,o.value);else this.sprite(c,o.value);}
    if(game.state==='ready'){
      for(const [key,x,y,team] of [['pikachu',217,286,1],['squirtle',393,290,1],['charmander',210,554,0],['bulbasaur',390,550,0]])this.sprite(c,{id:x,card:CARDS[key],x,y,team,anim:this.t,dx:0,dy:team?1:-1},true);
    }
    for(const p of game.projectiles){
      const color=CARDS[p.key]?.color||(p.team?'#f5ba8a':'#bddfe0');
      const dx=p.target.x-p.x,dy=p.target.y-10-p.y,d=Math.hypot(dx,dy)||1;
      line(c,color+'66',p.x-dx/d*13,p.y-dy/d*13,p.x,p.y,p.key==='pikachu'?3:4);
      ellipse(c,color,p.x,p.y,p.key==='charmander'||p.key==='charizard'?6:4,4);rect(c,'#fff4d0',p.x-1,p.y-2,2,2);
    }
    this.drawPlacement(c,game);
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
