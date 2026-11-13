import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:workers';
import { runInDurableObject, evictDurableObject } from 'cloudflare:test';
import worker from '../src/index.js';

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
async function join() {
  const a = await connect(), b = await connect();
  a.send({ type: 'hello', protocol: 2, mode: 'search', name: 'Uno', deck });
  const tokenA = (await a.next(p => p.type === 'welcome')).token;
  b.send({ type: 'hello', protocol: 2, mode: 'search', name: 'Dos', deck });
  const tokenB = (await b.next(p => p.type === 'welcome')).token;
  const roomA = await a.next(p => p.type === 'matched'), roomB = await b.next(p => p.type === 'matched');
  expect(roomA.roomId).toBe(roomB.roomId);
  const room = roomA.roomId;
  const players = await Promise.all([connect('/v1/rooms/' + room), connect('/v1/rooms/' + room)]);
  players.forEach((player, index) => player.send({ type: 'hello', protocol: 2, token: [tokenA, tokenB][index] }));
  await Promise.all(players.map(player => player.next(p => p.type === 'snapshot')));
  a.ws.close();b.ws.close();
  return { players, tokens: [tokenA, tokenB], room };
}
async function finish(room) {
  await runInDurableObject(env.ARENAS.getByName(room), instance => { instance.match.game.finish(-1, 'Test finished');instance.tick(); });
  for (const ws of sockets.splice(0)) { try { ws.close(); } catch {} }
}

describe('Cloudflare WebSocket rooms', () => {
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
      restored.send({ type: 'hello', protocol: 2, token: tokens[0], resume: true, after: first.seq || 0 });
      const snapshot = await restored.next(p => p.type === 'snapshot');expect(snapshot.roomId).toBe(room);expect(snapshot.team).toBe(team);
      restored.send(action);expect((await restored.next(p => p.type === 'result' && p.nonce === nonce)).result).toEqual(first.result);
      const badNonce = crypto.randomUUID();restored.send({ ...action, nonce: badNonce, x: 1e20 });
      expect((await restored.next(p => p.type === 'result' && p.nonce === badNonce)).result.ok).toBe(false);
      const stub = env.ARENAS.getByName(room);
      await runInDurableObject(stub, instance => { instance.persist();instance.stop(); });
      await evictDurableObject(stub, { webSockets: 'close' });
      const afterRestart = await connect('/v1/rooms/' + room);afterRestart.send({ type: 'hello', protocol: 2, token: tokens[0], resume: true });
      const restarted = await afterRestart.next(p => p.type === 'snapshot');expect(restarted.epoch).not.toBe(snapshot.epoch);expect(restarted.game.stats[team].deployed).toBe(3);
      afterRestart.send(action);expect((await afterRestart.next(p => p.type === 'result' && p.nonce === nonce)).result).toEqual(first.result);
    } finally { await finish(room); }
  });
  it('isolates matches and rejects unauthorized sockets and origins', async () => {
    const one = await join(), two = await join();
    try {
      expect(one.room).not.toBe(two.room);
      const attacker = await connect('/v1/rooms/' + one.room);attacker.send({ type: 'hello', protocol: 2, token: two.tokens[0] });
      expect((await attacker.next(p => p.type === 'error')).code).toBe('session');
      const forbidden = await worker.fetch(new Request('https://arena.test/v1/lobby', { headers: { Upgrade: 'websocket', Origin: 'https://unrelated.invalid' } }), env);expect(forbidden.status).toBe(403);
    } finally { await finish(one.room);await finish(two.room); }
  });
  it('cancel removes a queued player and resume returns idle without a new search', async () => {
    const player = await connect();player.send({ type: 'hello', protocol: 2, mode: 'search', deck });
    const token = (await player.next(p => p.type === 'welcome')).token;await player.next(p => p.type === 'searching');
    player.send({ type: 'cancel' });await player.next(p => p.type === 'idle');
    const resume = await connect();resume.send({ type: 'hello', protocol: 2, mode: 'resume', token });await resume.next(p => p.type === 'idle');
    expect(resume.packets.some(p => p.type === 'searching')).toBe(false);
    for (const ws of sockets.splice(0)) { try { ws.close(); } catch {} }
  });
  it('a dropped search resumes its original queue without a new deck or session', async () => {
    const player = await connect();player.send({ type: 'hello', protocol: 2, mode: 'search', name: 'Reload', deck });
    const token = (await player.next(p => p.type === 'welcome')).token, joined = (await player.next(p => p.type === 'searching')).joined;
    player.ws.close();
    const resume = await connect();resume.send({ type: 'hello', protocol: 2, mode: 'resume', token });
    expect((await resume.next(p => p.type === 'searching')).joined).toBe(joined);
    const second = await connect();second.send({ type: 'hello', protocol: 2, mode: 'search', name: 'Other', deck });
    const room = (await second.next(p => p.type === 'matched')).roomId;expect((await resume.next(p => p.type === 'matched')).roomId).toBe(room);await finish(room);
  });
});
