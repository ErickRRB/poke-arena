import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:workers';
import { runInDurableObject, evictDurableObject } from 'cloudflare:test';
import worker from '../src/index.js';
import { ONLINE_PROTOCOL } from '../../dist/online-wire.js?v=34';
import { unpackGame } from '../../dist/snapshot.js?v=34';

const deck = ['diglett','voltorb','bulbasaur','eevee','ekans','gastly','grimer','squirtle'];
const sockets = [];
function messages(ws) {
  const packets = [], waits = [];
  ws.addEventListener('message', event => {
    const packet = event.data === 'pong' ? event.data : JSON.parse(event.data);packets.push(packet);
    for (const wait of [...waits]) if (wait.test(packet)) { waits.splice(waits.indexOf(wait), 1);clearTimeout(wait.timer);wait.resolve(packet); }
  });
  return {
    packets,
    next(test) {
      const previous = packets.find(test);if (previous) return Promise.resolve(previous);
      return new Promise((resolve, reject) => { const wait = { test, resolve, timer: setTimeout(() => { waits.splice(waits.indexOf(wait), 1);reject(Error('WebSocket packet timed out')); }, 10000) };waits.push(wait); });
    },
  };
}
async function connect(path = '/v1/lobby', origin = 'http://127.0.0.1:4173') {
  const response = await worker.fetch(new Request('https://arena.test' + path, { headers: { Upgrade: 'websocket', Origin: origin } }), env);
  expect(response.status).toBe(101);const ws = response.webSocket;ws.accept();sockets.push(ws);
  return { ws, ...messages(ws), send: packet => ws.send(typeof packet === 'string' ? packet : JSON.stringify(packet)) };
}
async function join({decks=[deck,deck]}={}) {
  const a = await connect(), b = await connect();
  a.send({ type: 'hello', protocol: ONLINE_PROTOCOL, mode: 'search', name: 'Uno', deck:decks[0] });
  const tokenA = (await a.next(p => p.type === 'welcome')).token;
  b.send({ type: 'hello', protocol: ONLINE_PROTOCOL, mode: 'search', name: 'Dos', deck:decks[1] });
  const tokenB = (await b.next(p => p.type === 'welcome')).token;
  const roomA = await a.next(p => p.type === 'matched'), roomB = await b.next(p => p.type === 'matched');
  expect(roomA.roomId).toBe(roomB.roomId);
  const room = roomA.roomId;
  const players = await Promise.all([connect('/v1/rooms/' + room), connect('/v1/rooms/' + room)]);
  players.forEach((player, index) => player.send({ type: 'hello', protocol: ONLINE_PROTOCOL, token: [tokenA, tokenB][index] }));
  await Promise.all(players.map(player => player.next(p => p.type === 'snapshot')));
  a.ws.close();b.ws.close();
  return { players, tokens: [tokenA, tokenB], room };
}
async function finish(room) {
  await runInDurableObject(env.ARENAS.getByName(room), instance => { instance.match.game.finish(-1, 'Test finished');instance.tick(); });
  for (const ws of sockets.splice(0)) { try { ws.close(); } catch {} }
}

describe('Cloudflare WebSocket rooms', () => {
  it('streams the separate Cannon and mobile replacement to two current clients',async()=>{
    const{players,room}=await join({decks:[['blastoiseCannon',...deck.slice(0,7)],['octillery',...deck.slice(0,7)]]});
    try{
      await runInDurableObject(env.ARENAS.getByName(room),instance=>{const now=Date.now();instance.match.starts=now-1;instance.match.last=now;instance.match.game.start();instance.match.game.energy=[10,10];instance.persist();instance.broadcast();});
      for(const player of players){const packet=await player.next(p=>p.type==='snapshot'&&p.game.state==='playing'),team=packet.team,nonce=crypto.randomUUID();player.send({type:'action',kind:'deploy',nonce,handIndex:0,key:packet.game.hands[team][0],x:300,y:team?200:600});expect((await player.next(p=>p.type==='result'&&p.nonce===nonce)).result.ok).toBe(true);}
      for(const player of players){const packet=await player.next(p=>p.type==='snapshot'&&p.game.units.some(u=>u.key==='blastoiseCannon')&&p.game.units.some(u=>u.key==='octillery'));expect(packet.protocol).toBe(ONLINE_PROTOCOL);const game=unpackGame(packet.game),cannon=game.units.find(u=>u.key==='blastoiseCannon'),mobile=game.units.find(u=>u.key==='octillery');expect(cannon.card.id).toBe(9);expect(cannon.card.cost).toBe(3);expect(cannon.card.structure).toBe(true);expect(mobile.card.id).toBe(224);expect(mobile.card.cost).toBe(4);expect(mobile.card.structure).toBe(false);}
    }finally{await finish(room);}
  });
  it('persists a consumed Spirit chain through room eviction and resumes each real contact on both clients',async()=>{
    const{players,room,tokens}=await join(),stub=env.ARENAS.getByName(room);
    try{
      await runInDurableObject(stub,instance=>{
        const g=instance.match.game;g.state='playing';g.aiEnabled=false;g.towers=[];g.units=[];g.projectiles=[];g.attacks=[];
        const spirit=g.spawn('voltorb',0,200,670,0);
        for(const x of[200,242,284]){const u=g.spawn('geodude',1,x,610,0);u.card={...u.card,damage:0,speed:0,passive:true};u.hp=u.maxHp=10000;u.cooldown=100;}
        expect(g.startLeap(spirit,g.units.find(u=>u.team===1))).toBe(true);spirit.cooldown=100;
        for(let i=0;i<60&&spirit.hp>0;i++)g.step(1/30);
        expect(g.units.some(u=>u.id===spirit.id)).toBe(false);expect(g.projectiles.filter(p=>p.electricChain)).toHaveLength(1);expect(g.units.filter(u=>u.hp<10000)).toHaveLength(1);
        g.pause();instance.match.starts=Date.now()-1;instance.match.last=Date.now();instance.persist();instance.broadcast();
      });
      const first=await players[0].next(p=>p.type==='snapshot'&&p.game.projectiles.some(s=>s.electricChain));
      for(const player of players){const packet=await player.next(p=>p.type==='snapshot'&&p.game.projectiles.some(s=>s.electricChain));expect(packet.protocol).toBe(4);expect(packet.game.units.some(u=>u.id===packet.game.projectiles[0].sourceId)).toBe(false);expect(packet.game.projectiles[0].hitIds).toHaveLength(2);}
      await runInDurableObject(stub,instance=>{instance.persist();instance.stop();});await evictDurableObject(stub,{webSockets:'close'});
      const resumed=await connect('/v1/rooms/'+room);resumed.send({type:'hello',protocol:ONLINE_PROTOCOL,token:tokens[0],resume:true,after:first.seq});
      const restored=await resumed.next(p=>p.type==='snapshot');expect(restored.game.projectiles[0].nextStepAt).toBe(first.game.projectiles[0].nextStepAt);expect(restored.game.projectiles[0].sourceId).toBe(first.game.projectiles[0].sourceId);
      await runInDurableObject(stub,instance=>{const g=instance.match.game;g.resume();for(let i=0;i<40;i++)g.step(1/30);g.pause();expect(g.projectiles).toHaveLength(0);expect(g.units.every(u=>u.hp===9901)).toBe(true);const hits=instance.match.events.filter(row=>row.event.type==='beam'&&row.event.key==='voltorb');expect(hits).toHaveLength(3);expect(new Set(hits.map(row=>row.event.attackId)).size).toBe(3);instance.persist();instance.broadcast();});
      const completed=await resumed.next(p=>p.type==='snapshot'&&p.seq>restored.seq);expect(completed.game.projectiles).toHaveLength(0);expect(completed.events.filter(row=>row.event.type==='beam')).toHaveLength(2);
    }finally{await finish(room);}
  });
  it('rejects an old protocol in both handshakes before creating a session or reading a room', async () => {
    for (const path of ['/v1/lobby','/v1/rooms/'+crypto.randomUUID()]) {
      const player=await connect(path);player.send({type:'hello',protocol:ONLINE_PROTOCOL-1,mode:'search',deck});
      expect((await player.next(p=>p.type==='error')).code).toBe('protocol');
      expect(player.packets.some(p=>p.type==='welcome'||p.type==='snapshot'||p.type==='matched')).toBe(false);
    }
    for (const ws of sockets.splice(0)) { try { ws.close(); } catch {} }
  });
  it('rejects an authenticated socket from before the update and keeps its room resumable', async () => {
    const {players:[a,b],tokens,room}=await join();
    try {
      const team=(await a.next(p=>p.type==='snapshot')).team;
      const version=await runInDurableObject(env.ARENAS.getByName(room),instance=>{
        instance.stop();
        for (const ws of instance.ctx.getWebSockets()) {
          const state=ws.deserializeAttachment();if(!state.authed||state.team!==team)continue;
          delete state.protocol;ws.serializeAttachment(state);
        }
        instance.broadcast();return instance.match.version;
      });
      expect((await a.next(p=>p.type==='error')).code).toBe('protocol');
      expect((await b.next(p=>p.type==='snapshot'&&p.version===version)).version).toBe(version);
      expect(a.packets.some(p=>p.type==='snapshot'&&p.version===version)).toBe(false);
      const restored=await connect('/v1/rooms/'+room);restored.send({type:'hello',protocol:ONLINE_PROTOCOL,token:tokens[0],resume:true});
      const snapshot=await restored.next(p=>p.type==='snapshot');expect(snapshot.roomId).toBe(room);expect(snapshot.team).toBe(team);
    } finally { await finish(room); }
  });
  it('rejects an old authenticated action before applying it or creating a receipt', async () => {
    const {players:[a],room}=await join();
    try {
      const team=(await a.next(p=>p.type==='snapshot')).team,nonce=crypto.randomUUID();
      await runInDurableObject(env.ARENAS.getByName(room),async instance=>{
        instance.stop();const ws=instance.ctx.getWebSockets().find(ws=>ws.deserializeAttachment()?.team===team);
        const state=ws.deserializeAttachment();state.protocol=ONLINE_PROTOCOL-1;ws.serializeAttachment(state);
        await instance.webSocketMessage(ws,JSON.stringify({type:'action',kind:'leave',nonce}));
        expect(instance.match.receipts[team].some(receipt=>receipt.nonce===nonce)).toBe(false);
        expect(instance.match.game.state).not.toBe('ended');
      });
      expect((await a.next(p=>p.type==='error')).code).toBe('protocol');
    } finally { await finish(room); }
  });
  it('pairs players, streams authoritative snapshots, validates and deduplicates actions, restores sockets', async () => {
    const { players: [a, b], tokens, room } = await join();
    try {
      const initialA = await a.next(p => p.type === 'snapshot'), initialB = await b.next(p => p.type === 'snapshot');
      expect(initialA.team).not.toBe(initialB.team);expect(initialA.game.aiEnabled).toBe(false);
      expect(initialA.game.hands[initialA.team]).toHaveLength(4);expect(initialA.game.hands[1 - initialA.team]).toEqual([]);
      const later = await a.next(p => p.type === 'snapshot' && p.version > initialA.version + 1);
      expect(later.version).toBeGreaterThan(initialA.version);a.send('ping');expect(await a.next(p => p === 'pong')).toBe('pong');
      await runInDurableObject(env.ARENAS.getByName(room), instance => {
        const now = Date.now();instance.match.starts = now - 1;instance.match.last = now;instance.match.game.start();instance.match.game.energy = [10,10];instance.persist();instance.broadcast();
      });
      const playing = await a.next(p => p.type === 'snapshot' && p.game.state === 'playing');
      const team = playing.team, nonce = crypto.randomUUID(), action = { type: 'action', kind: 'deploy', nonce, handIndex: 0, key: playing.game.hands[team][0], x: 130, y: team ? 200 : 600 };
      a.send(action);const first = await a.next(p => p.type === 'result' && p.nonce === nonce);expect(first.result.ok).toBe(true);
      a.send(action);
      await runInDurableObject(env.ARENAS.getByName(room), instance => {
        expect(instance.match.receipts[team].filter(receipt => receipt.nonce === nonce)).toHaveLength(1);
        const saved = JSON.parse(instance.sql.exec('SELECT data FROM match_state WHERE id=1').one().data);
        expect(saved.receipts[team].some(receipt => receipt.nonce === nonce && receipt.result.ok)).toBe(true);
        expect(instance.match.game.stats[team].deployed).toBe(3);
      });
      a.ws.close();const restored = await connect('/v1/rooms/' + room);
      restored.send({ type: 'hello', protocol: ONLINE_PROTOCOL, token: tokens[0], resume: true, after: first.seq || 0 });
      const snapshot = await restored.next(p => p.type === 'snapshot');expect(snapshot.roomId).toBe(room);expect(snapshot.team).toBe(team);
      restored.send(action);expect((await restored.next(p => p.type === 'result' && p.nonce === nonce)).result).toEqual(first.result);
      const badNonce = crypto.randomUUID();restored.send({ ...action, nonce: badNonce, x: 1e20 });
      expect((await restored.next(p => p.type === 'result' && p.nonce === badNonce)).result.ok).toBe(false);
      const stub = env.ARENAS.getByName(room);
      await runInDurableObject(stub, instance => { instance.persist();instance.stop(); });
      await evictDurableObject(stub, { webSockets: 'close' });
      const afterRestart = await connect('/v1/rooms/' + room);afterRestart.send({ type: 'hello', protocol: ONLINE_PROTOCOL, token: tokens[0], resume: true });
      const restarted = await afterRestart.next(p => p.type === 'snapshot');expect(restarted.epoch).not.toBe(snapshot.epoch);expect(restarted.game.stats[team].deployed).toBe(3);
      afterRestart.send(action);expect((await afterRestart.next(p => p.type === 'result' && p.nonce === nonce)).result).toEqual(first.result);
    } finally { await finish(room); }
  });
  it('isolates matches and rejects unauthorized sockets and origins', async () => {
    const one = await join(), two = await join();
    try {
      expect(one.room).not.toBe(two.room);
      const attacker = await connect('/v1/rooms/' + one.room);attacker.send({ type: 'hello', protocol: ONLINE_PROTOCOL, token: two.tokens[0] });
      expect((await attacker.next(p => p.type === 'error')).code).toBe('session');
      const forbidden = await worker.fetch(new Request('https://arena.test/v1/lobby', { headers: { Upgrade: 'websocket', Origin: 'https://unrelated.invalid' } }), env);expect(forbidden.status).toBe(403);
    } finally { await finish(one.room);await finish(two.room); }
  });
  it('cancel removes a queued player and resume returns idle without a new search', async () => {
    const player = await connect();player.send({ type: 'hello', protocol: ONLINE_PROTOCOL, mode: 'search', deck });
    const token = (await player.next(p => p.type === 'welcome')).token;await player.next(p => p.type === 'searching');
    player.send({ type: 'cancel' });await player.next(p => p.type === 'idle');
    const resume = await connect();resume.send({ type: 'hello', protocol: ONLINE_PROTOCOL, mode: 'resume', token });await resume.next(p => p.type === 'idle');
    expect(resume.packets.some(p => p.type === 'searching')).toBe(false);
    for (const ws of sockets.splice(0)) { try { ws.close(); } catch {} }
  });
  it('a dropped search resumes its original queue without a new deck or session', async () => {
    const player = await connect();player.send({ type: 'hello', protocol: ONLINE_PROTOCOL, mode: 'search', name: 'Reload', deck });
    const token = (await player.next(p => p.type === 'welcome')).token, joined = (await player.next(p => p.type === 'searching')).joined;
    player.ws.close();
    const resume = await connect();resume.send({ type: 'hello', protocol: ONLINE_PROTOCOL, mode: 'resume', token });
    expect((await resume.next(p => p.type === 'searching')).joined).toBe(joined);
    const second = await connect();second.send({ type: 'hello', protocol: ONLINE_PROTOCOL, mode: 'search', name: 'Other', deck });
    const room = (await second.next(p => p.type === 'matched')).roomId;expect((await resume.next(p => p.type === 'matched')).roomId).toBe(room);await finish(room);
  });
});

describe('deck key validation at lobby boundaries',()=>{
  const lobby=()=>env.LOBBY.getByName('matchmaking-v2');
  const closeAll=()=>{for(const ws of sockets.splice(0))try{ws.close();}catch{}};
  const clearQueue=()=>runInDurableObject(lobby(),instance=>{instance.sql.exec('DELETE FROM sessions WHERE room_id IS NULL');});
  it('rejects inherited and JSON-coerced keys before inserting a fresh session',async()=>{
    try{
      for(const key of['toString','constructor','__proto__',[deck[0]]]){
        const name=crypto.randomUUID().slice(0,20),player=await connect();
        player.send({type:'hello',protocol:ONLINE_PROTOCOL,mode:'search',name,deck:[key,...deck.slice(1)]});
        const first=await player.next(p=>p.type==='error'||p.type==='welcome');expect(first.type).toBe('error');expect(first.code).toBe('deck');
        const count=await runInDurableObject(lobby(),instance=>instance.sql.exec('SELECT count(*) AS n FROM sessions WHERE name=?',name).one().n);expect(count).toBe(0);
      }
    }finally{await clearQueue();closeAll();}
  });
  it('dequeues and rejects invalid persisted queued resumes including malformed JSON',async()=>{
    try{
      for(const raw of[JSON.stringify(['constructor',...deck.slice(1)]),JSON.stringify([[deck[0]],...deck.slice(1)]),'{']){
        const player=await connect();player.send({type:'hello',protocol:ONLINE_PROTOCOL,mode:'search',deck});
        const token=(await player.next(p=>p.type==='welcome')).token;await player.next(p=>p.type==='searching');
        await runInDurableObject(lobby(),instance=>instance.sql.exec('UPDATE sessions SET deck=? WHERE joined IS NOT NULL',raw));player.ws.close();
        const resumed=await connect();resumed.send({type:'hello',protocol:ONLINE_PROTOCOL,mode:'resume',token});
        const result=await resumed.next(p=>p.type==='error'||p.type==='searching');expect(result.type).toBe('error');expect(result.code).toBe('deck');
        const queued=await runInDurableObject(lobby(),instance=>instance.sql.exec('SELECT count(*) AS n FROM sessions WHERE joined IS NOT NULL').one().n);expect(queued).toBe(0);
      }
    }finally{await clearQueue();closeAll();}
  });
  it('skips a live invalid queued candidate and allows the two valid players to match',async()=>{
    let room;
    try{
      const bad=await connect();bad.send({type:'hello',protocol:ONLINE_PROTOCOL,mode:'search',name:'Invalid row',deck});await bad.next(p=>p.type==='searching');
      const badId=await runInDurableObject(lobby(),instance=>{const row=instance.sql.exec('SELECT id FROM sessions WHERE name=? AND joined IS NOT NULL','Invalid row').one();instance.sql.exec('UPDATE sessions SET deck=?,joined=1 WHERE id=?',JSON.stringify([[deck[0]],...deck.slice(1)]),row.id);return row.id;});
      const a=await connect();a.send({type:'hello',protocol:ONLINE_PROTOCOL,mode:'search',deck});await a.next(p=>p.type==='searching');
      const unchanged=await runInDurableObject(lobby(),async instance=>{await Promise.all(instance.pendingMatches.values());return instance.session(badId);});
      expect(unchanged.room_id).toBe(null);expect(unchanged.joined).toBe(1);
      const b=await connect();b.send({type:'hello',protocol:ONLINE_PROTOCOL,mode:'search',deck});
      room=(await b.next(p=>p.type==='matched')).roomId;expect((await a.next(p=>p.type==='matched')).roomId).toBe(room);
      expect(bad.packets.some(p=>p.type==='matched'||p.type==='error')).toBe(false);
      const stillQueued=await runInDurableObject(lobby(),instance=>instance.session(badId));expect(stillQueued.room_id).toBe(null);expect(stillQueued.joined).toBe(1);
    }finally{if(room)await finish(room);await clearQueue();closeAll();}
  });
  it('recovers an active room before inspecting an unrelated persisted queue deck',async()=>{
    const joined=await join();
    try{
      await runInDurableObject(lobby(),instance=>instance.sql.exec('UPDATE sessions SET deck=? WHERE room_id=?','{',joined.room));
      const resumed=await connect();resumed.send({type:'hello',protocol:ONLINE_PROTOCOL,mode:'resume',token:joined.tokens[0]});
      expect((await resumed.next(p=>p.type==='matched'||p.type==='error')).roomId).toBe(joined.room);
    }finally{await finish(joined.room);}
  });
});
