import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BattleArt,STRUCTURE_ART} from '../dist/battle-art.js';
import {Renderer} from '../dist/render.js';
import {Game} from '../dist/engine.js';

const context=()=>new Proxy({globalAlpha:1},{get:(o,key)=>o[key]??(()=>{}),set:(o,key,value)=>(o[key]=value,true)});
function fixture(){
  const requests=[],image={},art=new BattleArt(async file=>{requests.push(file);return image;}),draws=[],health=[],tints=[];
  art.images.set(STRUCTURE_ART.raltsHut.file,image);
  const renderer=Object.assign(Object.create(Renderer.prototype),{battleArt:art,bodyHeights:new Map(),t:0,drawDt:0,reduced:false,verticalScale:1.5,effects:[],particles:[],frameActors:new Map(),burst(){},ensureSpecies(){throw Error('A building must not request Pokémon sprites.');},healthBar:(...args)=>health.push(args),targetTint:unit=>(...args)=>tints.push({id:unit.id,args})});
  const unit={id:42,key:'raltsHut',team:0,x:300,y:500,hp:1180,maxHp:1180,spawn:0,hit:0,card:{structure:true,structureArt:'raltsHut',summon:'raltsToken'}};
  const ctx=context();ctx.drawImage=(...args)=>draws.push(args);return{art,renderer,unit,ctx,draws,health,tints,requests};
}

test('a structure without a species preloads and draws its own body, health and target mask',async()=>{
  const{art,renderer,unit,ctx,draws,health,tints,requests}=fixture();
  assert.ok(art.files().includes(STRUCTURE_ART.raltsHut.file));await art.load(STRUCTURE_ART.raltsHut.file);
  renderer.onEvent({type:'spawn',unit});
  renderer.sprite(ctx,unit);assert.equal(unit.card.id,undefined);assert.equal(draws.length,1);assert.equal(tints.length,1);assert.equal(tints[0].id,unit.id);
  const body=draws[0].slice(1);assert.ok(body.every(Number.isFinite));assert.ok(health[0][3]<body[5],'The health bar is above the building.');
  renderer.sprite(ctx,{...unit,preview:true},true);assert.equal(draws.length,2);assert.equal(tints.length,1);assert.equal(health.length,1);
  assert.deepEqual(requests,[STRUCTURE_ART.raltsHut.file]);
});

test('a defeated structure keeps its visible collapse paused and respects reduced motion',()=>{
  const{renderer,unit,ctx,draws,health}=fixture(),scales=[];ctx.scale=(...args)=>scales.push(args);
  const game=new Game({tutorial:true});game.start();const building=game.spawn('vivero',unit.team,unit.x,unit.y,0);
  building.card={...building.card,id:undefined,structureArt:'raltsHut',deathSpawn:null,deathCount:0};
  game.onEvent=event=>{if(event.type==='structureDown')renderer.onEvent(event);};game.damage(building,building.hp+1,1-unit.team);
  const effect=renderer.effects.find(e=>e.kind==='structureDeath');assert.ok(effect);
  renderer.drawEffects(ctx,0);const first=draws.pop();renderer.drawEffects(ctx,0);assert.deepEqual(draws.pop(),first);assert.equal(effect.life,effect.max);assert.equal(health.length,0);
  scales.length=0;renderer.reduced=true;renderer.drawEffects(ctx,.1);assert.deepEqual(scales,[]);assert.ok(draws.length);
});
