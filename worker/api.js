import { Game, CARDS, DEFAULT_DECK } from '../dist/engine.js';
import { packGame, unpackGame, packEvent } from '../dist/snapshot.js';

const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const validDeck=deck=>Array.isArray(deck)&&deck.length===8&&new Set(deck).size===8&&deck.every(k=>CARDS[k]&&!CARDS[k].token);
const hash=async token=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(v=>v.toString(16).padStart(2,'0')).join('');
const safeName=name=>String(name||'Entrenador').replace(/[<>\x00-\x1f]/g,'').trim().slice(0,20)||'Entrenador';
function freshRoom(players,now){const g=new Game({deck:JSON.parse(players[0].deck),seed:crypto.getRandomValues(new Uint32Array(1))[0]});g.hands[1]=JSON.parse(players[1].deck).slice(0,4);g.queues[1]=JSON.parse(players[1].deck).slice(4);g.aiEnabled=false;return{players:players.map(p=>({id:p.id,name:p.name})),seen:[now,now],starts:now+2200,last:now+2200,game:packGame(g),events:[],seq:0,nonces:[]};}
async function match(db,player,now){
  await db.prepare('UPDATE arena_players SET joined=COALESCE(joined,?),seen=? WHERE id=? AND room_id IS NULL').bind(now,now,player.id).run();
  await db.prepare('UPDATE arena_queue SET player_id=? WHERE id=1 AND (player_id IS NULL OR NOT EXISTS(SELECT 1 FROM arena_players WHERE id=player_id AND seen>? AND joined IS NOT NULL AND room_id IS NULL))').bind(player.id,now-15000).run();
  const queue=await db.prepare('SELECT p.* FROM arena_queue q JOIN arena_players p ON p.id=q.player_id WHERE q.id=1').first();
  if(!queue||queue.id===player.id)return;
  const id=crypto.randomUUID(),room=freshRoom([queue,player],now);
  await db.batch([
    db.prepare('INSERT INTO arena_rooms(id,version,data,updated) SELECT ?,0,?,? WHERE EXISTS(SELECT 1 FROM arena_queue q JOIN arena_players p ON p.id=q.player_id WHERE q.id=1 AND p.id=? AND p.room_id IS NULL AND p.joined IS NOT NULL AND p.seen>?) AND EXISTS(SELECT 1 FROM arena_players WHERE id=? AND room_id IS NULL AND joined IS NOT NULL)').bind(id,JSON.stringify(room),now,queue.id,now-15000,player.id),
    db.prepare('UPDATE arena_players SET room_id=?,joined=NULL WHERE id IN (?,?) AND EXISTS(SELECT 1 FROM arena_rooms WHERE id=?)').bind(id,queue.id,player.id,id),
    db.prepare('UPDATE arena_queue SET player_id=NULL WHERE id=1 AND player_id=? AND EXISTS(SELECT 1 FROM arena_rooms WHERE id=?)').bind(queue.id,id)
  ]);
}
async function battle(db,player,action,now,animations){
  for(let attempt=0;attempt<8;attempt++){
    const stored=await db.prepare('SELECT * FROM arena_rooms WHERE id=?').bind(player.room_id).first();
    if(!stored)return json({error:'La partida ya no está disponible.'},404);
    const room=JSON.parse(stored.data),team=room.players.findIndex(p=>p.id===player.id);if(team<0)return json({error:'Partida no disponible.'},403);
    const append=e=>{if(e.type==='step')return;room.events.push({seq:++room.seq,event:packEvent(e)});};
    const game=unpackGame(room.game,append,animations),disconnected=room.seen.map(seen=>now-seen>25000);room.seen[team]=now;
    if(now>=room.starts&&game.state==='ready')game.start();
    if(game.state==='playing'){
      if(disconnected[0]||disconnected[1])game.finish(disconnected.every(Boolean)?-1:disconnected[0]?1:0,disconnected.every(Boolean)?'Ambos jugadores se desconectaron':'El rival se desconectó');
      const steps=Math.min(600,Math.max(0,Math.floor((now-room.last)/1000*30)));
      for(let i=0;i<steps&&game.state==='playing';i++)game.step(1/30);
      room.last+=steps*1000/30;
    }
    let result=null;
    if(action?.kind&&!room.nonces.includes(action.nonce)){
      if(action.kind==='leave'){if(game.state!=='ended')game.finish(1-team,'El rival abandonó');result={ok:true};}
      else if(action.kind==='ability')result=game.activateAbility(team,Number(action.unitId));
      else if(action.kind==='deploy')result=game.hands[team][action.handIndex]===action.key?game.deploy(team,Number(action.handIndex),Number(action.x),Number(action.y)):{ok:false,reason:'La mano cambió. Volvé a elegir la carta.'};
      else result={ok:false,reason:'Acción no válida.'};
      room.nonces.push(action.nonce);room.nonces=room.nonces.slice(-32);
    }
    room.game=packGame(game);room.events=room.events.slice(-256);
    const saved=await db.prepare('UPDATE arena_rooms SET data=?,version=version+1,updated=? WHERE id=? AND version=?').bind(JSON.stringify(room),now,stored.id,stored.version).run();
    if(saved.meta.changes){
      const snapshot=structuredClone(room.game);snapshot.hands[1-team]=[];snapshot.queues[1-team]=[];
      return json({status:'matched',roomId:stored.id,team,version:stored.version+1,startsIn:Math.max(0,room.starts-now),opponent:room.players[1-team].name,game:snapshot,events:room.events.filter(e=>e.seq>Number(action?.after||0)),seq:room.seq,result});
    }
  }
  return json({error:'Sincronizando partida. Reintentá.'},409);
}
export async function api(request,env,animations={}){
  const url=new URL(request.url),db=env.DB,now=Date.now();
  if(!db)return json({error:'El modo online no está disponible en este momento.'},503);
  if(request.method==='POST'&&((request.headers.get('origin')&&request.headers.get('origin')!==url.origin)||request.headers.get('sec-fetch-site')==='cross-site'))return json({error:'Origen no permitido.'},403);
  if(Number(request.headers.get('content-length'))>4096)return json({error:'Solicitud demasiado grande.'},413);
  try{
    const text=request.method==='POST'?await request.text():'';if(text.length>4096)return json({error:'Solicitud demasiado grande.'},413);
    const body=text?JSON.parse(text):{};
    if(url.pathname==='/api/session'&&request.method==='POST'){
      if(!validDeck(body.deck))return json({error:'Elegí ocho cartas diferentes.'},400);
      const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID();
      await db.prepare('INSERT INTO arena_players(id,token_hash,name,deck,seen) VALUES(?,?,?,?,?)').bind(id,await hash(token),safeName(body.name),JSON.stringify(body.deck),now).run();
      // Expire abandoned queue entries and old matches without retaining player history.
      await db.batch([db.prepare('DELETE FROM arena_rooms WHERE updated<?').bind(now-86400000),db.prepare('DELETE FROM arena_players WHERE seen<?').bind(now-86400000)]);
      return json({id,token});
    }
    const token=request.headers.get('authorization')?.replace(/^Bearer /,'');if(!token||token.length>160)return json({error:'Volvé a buscar partida.'},401);
    let player=await db.prepare('SELECT * FROM arena_players WHERE token_hash=?').bind(await hash(token)).first();if(!player)return json({error:'La búsqueda expiró.'},401);
    await db.prepare('UPDATE arena_players SET seen=? WHERE id=?').bind(now,player.id).run();
    if(url.pathname==='/api/queue'&&request.method==='POST'){
      if(player.room_id){const old=await db.prepare('SELECT data FROM arena_rooms WHERE id=?').bind(player.room_id).first();if(!old||JSON.parse(old.data).game.state==='ended'){await db.prepare('UPDATE arena_players SET room_id=NULL WHERE id=?').bind(player.id).run();player.room_id=null;}}
      if(validDeck(body.deck)&&!player.room_id){player.deck=JSON.stringify(body.deck);player.name=safeName(body.name);await db.prepare('UPDATE arena_players SET deck=?,name=? WHERE id=?').bind(player.deck,player.name,player.id).run();}
      if(!player.room_id)await match(db,player,now);
      player=await db.prepare('SELECT * FROM arena_players WHERE id=?').bind(player.id).first();
      return player.room_id?battle(db,player,null,now,animations):json({status:'searching'});
    }
    if(url.pathname==='/api/cancel'&&request.method==='POST'){
      await db.batch([db.prepare('UPDATE arena_queue SET player_id=NULL WHERE player_id=?').bind(player.id),db.prepare('UPDATE arena_players SET joined=NULL WHERE id=?').bind(player.id)]);
      player=await db.prepare('SELECT * FROM arena_players WHERE id=?').bind(player.id).first();
      if(player.room_id)return battle(db,player,{kind:'leave',nonce:body.nonce||crypto.randomUUID()},now,animations);
      return json({ok:true});
    }
    if(url.pathname==='/api/battle'&&request.method==='POST'&&player.room_id){if(body.kind&&!/^[\w-]{12,80}$/.test(body.nonce||''))return json({error:'Acción no válida.'},400);return battle(db,player,body.kind?body:{after:Number(body.after||0)},now,animations);}
    return json({error:'Ruta no disponible.'},404);
  }catch(error){console.error('Arena API:',error.message);return json({error:'No se pudo conectar. Volvé a intentar.'},500);}
}
