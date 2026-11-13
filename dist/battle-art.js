import {BATTLE_ASSETS} from './assets/battle/manifest.js';
import {WHIRLPOOL_BOUNDS} from './assets/battle/frame-bounds.js';

export const CARD_PLACEHOLDERS=Object.freeze({});
export const cardPlaceholder=key=>Object.hasOwn(CARD_PLACEHOLDERS,key);
const ALIASES={aura:'psychic',confusion:'psychic',lightning:'lightningHead',magnet:'lightningHead',powder:'poison',punch:'impact',slam:'dust',eruption:'explosion',dash:'impact'};
const STRUCTURES={princess:[[161,7,309,395],[794,7,309,395]],king:[[29,428,574,476],[662,428,574,476]],platform:[[92,959,449,271],[725,959,448,271]]};

export class BattleArt {
  constructor(loadImage){this.loadImage=loadImage;this.images=new Map();this.failed=new Set();this.time=0;}
  files(){return [...new Set([...Object.values(BATTLE_ASSETS).map(asset=>asset.file),'assets/battle/structures-v1.png'])];}
  async load(file){try{const image=await this.loadImage(file);this.images.set(file,image);return image;}catch{this.failed.add(file);return null;}}
  async preload(onFile=()=>{}){await Promise.all(this.files().map(file=>this.load(file).then(onFile)));}
  image(name){const meta=BATTLE_ASSETS[ALIASES[name]||name];return meta?this.images.get(meta.file):null;}
  draw(c,name,x,y,width,height=width,options={}){
    const meta=BATTLE_ASSETS[ALIASES[name]||name];if(!meta)return false;
    const image=this.images.get(meta.file);if(!image)return false;
    const clock=options.age===undefined?this.time:options.age;
    const phase=options.progress===undefined?clock*meta.fps:Math.max(0,Math.min(1,options.progress))*(meta.columns-1);
    const at=options.frame??Math.floor(phase)%meta.columns,frame=Math.max(0,Math.min(meta.columns-1,at));
    let row=options.direction||0,flip=false;
    if(meta.rows===1)row=0;else if(meta.rows===5&&row>4){row=8-row;flip=true;}else row%=meta.rows;
    c.save();c.translate(x,y);if(options.angle)c.rotate(options.angle);if(flip)c.scale(-1,1);
    const render=(index,alpha)=>{c.globalAlpha=alpha;
      if(options.trim&&name==='whirlpool'){
        const [left,top,right,bottom]=WHIRLPOOL_BOUNDS[index],scale=width/(right-left),visibleHeight=(bottom-top)*scale;
        c.drawImage(image,index*meta.width+left,top,right-left,bottom-top,-width/2,-visibleHeight/2,width,visibleHeight);return;
      }
      c.drawImage(image,index*meta.width,row*meta.height,meta.width,meta.height,-width/2,-height/2,width,height);
    };
    const alpha=Number.isFinite(c.globalAlpha)?c.globalAlpha:1,mix=options.blend?phase-Math.floor(phase):0;
    render(frame,alpha*(1-mix));if(mix>0)render((frame+1)%meta.columns,alpha*mix);
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
    const image=this.images.get('assets/battle/structures-v1.png');if(!image)return false;
    const [sx,sy,sw,sh]=STRUCTURES[kind][team],height=sh/sw*width/vertical;
    const frame=[sx,sy,sw,sh,x-width/2,y-height,width,height];
    c.drawImage(image,...frame);afterDraw?.(c,image,...frame);return true;
  }
  tile(c,name,sx,sy,sw,sh,x,y,width,height){const image=this.image(name);if(!image)return false;c.drawImage(image,sx,sy,sw,sh,x,y,width,height);return true;}
}
