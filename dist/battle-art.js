import {BATTLE_ASSETS} from './assets/battle/manifest.js?v=34';
import {PROJECTILE_BOUNDS} from './assets/battle/projectile-bounds.js?v=34';
import {WHIRLPOOL_BOUNDS} from './assets/battle/frame-bounds.js?v=34';
import {CAPSULE_TEXTURE} from './capsule-art.js?v=34';
import * as onlineConfig from './online-config.js?v=36';
const publicAssetUrl=onlineConfig.publicAssetUrl||((file)=>file);
const {PVFX_ASSETS}=await import(publicAssetUrl('./assets/battle/vfx-manifest.js?v=36'));
const ART_ASSETS={...BATTLE_ASSETS,...PVFX_ASSETS};

export const CARD_PLACEHOLDERS=Object.freeze({});
export const cardPlaceholder=key=>Object.hasOwn(CARD_PLACEHOLDERS,key);
const ALIASES={aura:'psychic',confusion:'psychic',lightning:'lightningHead',magnet:'lightningHead',powder:'poison',punch:'impact',slam:'dust',eruption:'explosion',dash:'impact'};
const STRUCTURES={princess:[[161,7,309,395],[794,7,309,395]],king:[[29,428,574,476],[662,428,574,476]],platform:[[92,959,449,271],[725,959,448,271]]};
export const STRUCTURE_ART=Object.freeze({
  raltsHut:Object.freeze({file:'assets/battle/ralts-hut-v1.png',bounds:[81,118,1035,1108],width:74,height:74*1108/1035,baseOffset:4,windowGlow:'#ffd7ed'}),
  nidoranBurrow:Object.freeze({file:'assets/battle/nidoran-burrow-v1.png',bounds:[98,216,1247,709],width:76,height:76*709/1247,baseOffset:2,healthOffset:10})
});

export class BattleArt {
  constructor(loadImage){this.loadImage=loadImage;this.images=new Map();this.failed=new Set();this.time=0;}
  files(){return [...new Set([...Object.values(ART_ASSETS).map(asset=>asset.file),...Object.values(STRUCTURE_ART).map(asset=>asset.file),CAPSULE_TEXTURE,'assets/battle/structures-v1.png','assets/battle/arena-ground-v2.webp','assets/battle/arena-bridge-v2.webp','assets/battle/riverbank-v2.webp'])];}
  async load(file){try{const image=await this.loadImage(file);this.images.set(file,image);return image;}catch{this.failed.add(file);return null;}}
  async preload(onFile=()=>{}){await Promise.all(this.files().map(file=>this.load(file).then(onFile)));}
  image(name){const meta=ART_ASSETS[ALIASES[name]||name];return meta?this.images.get(meta.file):null;}
  draw(c,name,x,y,width,height=width,options={}){
    const meta=ART_ASSETS[ALIASES[name]||name];if(!meta)return false;
    const image=this.images.get(meta.file);if(!image)return false;
    const clock=options.age===undefined?this.time:options.age;
    const count=meta.frameCount||meta.columns,first=meta.firstVisible||0,last=meta.lastVisible??count-1;
    const phase=options.progress===undefined?clock*(options.fps??meta.fps):first+Math.max(0,Math.min(1,options.progress))*(last-first);
    const automatic=meta.loop===false?Math.min(last,Math.floor(phase)):Math.floor(phase)%count;
    const at=options.frame??options.frames?.[Math.floor(phase)%options.frames.length]??automatic,frame=Math.max(0,Math.min(count-1,at));
    let row=options.direction||0,flip=false;
    if(meta.rows===1)row=0;else if(meta.rows===5&&row>4){row=8-row;flip=true;}else row%=meta.rows;
    c.save();c.translate(x,y);if(options.angle)c.rotate(options.angle);if(flip)c.scale(-1,1);
    const render=(index,alpha)=>{c.globalAlpha=alpha;
      if(options.trim&&name==='whirlpool'){
        const [left,top,right,bottom]=WHIRLPOOL_BOUNDS[index],scale=width/(right-left),visibleHeight=(bottom-top)*scale;
        c.drawImage(image,index*meta.width+left,top,right-left,bottom-top,-width/2,-visibleHeight/2,width,visibleHeight);return;
      }
      const sx=(meta.grid?index%meta.columns:index)*meta.width,sy=(meta.grid?Math.floor(index/meta.columns):row)*meta.height;
      const bounds=options.trim&&(meta.bounds||PROJECTILE_BOUNDS[ALIASES[name]||name]);
      if(bounds){const [left,top,right,bottom]=bounds,scale=width/Math.max(right-left,bottom-top),w=options.stretch?width:(right-left)*scale,h=options.stretch?height:(bottom-top)*scale*height/width;
        c.drawImage(image,sx+left,sy+top,right-left,bottom-top,-w/2,-h/2,w,h);return;}
      const pivot=options.anchor==='pivot'&&meta.pivot;
      c.drawImage(image,sx,sy,meta.width,meta.height,pivot?-pivot[0]*width/meta.width:-width/2,pivot?-pivot[1]*height/meta.height:-height/2,width,height);
    };
    const alpha=Number.isFinite(c.globalAlpha)?c.globalAlpha:1,mix=options.blend?phase-Math.floor(phase):0;
    render(frame,alpha*(1-mix));if(mix>0)render(meta.loop===false?Math.min(last,frame+1):(frame+1)%count,alpha*mix);
    c.restore();return true;
  }
  beam(c,name,from,to,width,age=0){
    const prefix=name==='lightning'?'lightning':name==='hydro'?'waterBeam':name==='hyper'?'hyper':'beam',body=BATTLE_ASSETS[prefix+'Body'],image=this.images.get(body.file);
    if(!image)return false;
    const distance=Math.hypot(to.x-from.x,to.y-from.y),frame=Math.floor((age+(prefix==='hyper'?.18:0))*18)%body.columns;
    c.save();c.translate(from.x,from.y);c.rotate(Math.atan2(to.y-from.y,to.x-from.x)-Math.PI/2);
    c.drawImage(image,frame*body.width,0,body.width,body.height,-width/2,0,width,distance);
    c.restore();this.draw(c,prefix+'Head',to.x,to.y,width*2,width*2,{age});return true;
  }
  structure(c,kind,team,x,y,width,vertical=1,afterDraw){
    const custom=STRUCTURE_ART[kind],image=this.images.get(custom?.file||'assets/battle/structures-v1.png');if(!image)return false;
    const bounds=custom?.bounds||STRUCTURES[kind]?.[team];if(!bounds)return false;
    const [sx,sy,sw,sh]=bounds,height=sh/sw*width/vertical;
    const frame=[sx,sy,sw,sh,x-width/2,y-height,width,height];
    c.drawImage(image,...frame);afterDraw?.(c,image,...frame);return true;
  }
  tile(c,name,sx,sy,sw,sh,x,y,width,height){const image=this.image(name);if(!image)return false;c.drawImage(image,sx,sy,sw,sh,x,y,width,height);return true;}
}
