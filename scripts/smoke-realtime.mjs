import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { DEFAULT_DECK } from '../dist/engine.js';

const base = process.argv[2] || 'http://127.0.0.1:4180';
const health = await (await fetch(new URL('/health', base))).json();
assert.equal(health.protocol, 2);assert.equal(health.transport, 'websocket');
const clients = [];
async function connect(path) {
  const url = new URL(path, base);url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(url), packets = [], waits = [];
  const send = packet => ws.send(typeof packet === 'string' ? packet : JSON.stringify(packet));
  ws.addEventListener('message', event => {
    const packet = event.data === 'pong' ? event.data : JSON.parse(event.data);packets.push({ packet, at: performance.now(), bytes: Buffer.byteLength(event.data) });
    if (packet.type === 'snapshot') send({ type: 'ack', seq: packet.seq });
    for (const wait of [...waits]) if (packets.length > wait.after && wait.test(packet)) { clearTimeout(wait.timer);waits.splice(waits.indexOf(wait), 1);wait.resolve(packet); }
  });
  const client = { ws, packets, send, next(test, after = 0) {
    const previous = packets.slice(after).find(entry => test(entry.packet));if (previous) return Promise.resolve(previous.packet);
    return new Promise((resolve, reject) => { const wait = { test, after, resolve, timer: setTimeout(() => { waits.splice(waits.indexOf(wait), 1);reject(Error('WebSocket timeout: '+path)); }, 15000) };waits.push(wait); });
  } };
  clients.push(client);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true });ws.addEventListener('error', reject, { once: true }); });
  client.ping = setInterval(() => { if (ws.readyState === 1) send('ping'); }, 2500);
  return client;
}
let room;
try {
  const [a,b] = await Promise.all([connect('/v1/lobby'), connect('/v1/lobby')]);
  for (const [index,client] of [a,b].entries()) client.send({ type: 'hello', protocol: 2, mode: 'search', name: 'QA '+(index+1), deck: DEFAULT_DECK });
  const welcomes = await Promise.all([a,b].map(client => client.next(packet => packet.type === 'welcome')));
  const matches = await Promise.all([a,b].map(client => client.next(packet => packet.type === 'matched')));
  room = matches[0].roomId;assert.equal(matches[1].roomId,room);
  const [one,two] = await Promise.all([connect('/v1/rooms/'+room),connect('/v1/rooms/'+room)]);
  for (const [index,client] of [one,two].entries()) client.send({ type: 'hello', protocol: 2, token: welcomes[index].token });
  a.ws.close();b.ws.close();
  const initial = await one.next(packet => packet.type === 'snapshot' && packet.game.state === 'playing');
  const action = { type: 'action', kind: 'deploy', nonce: crypto.randomUUID(), key: initial.game.hands[initial.team][0], handIndex: 0, x: initial.team ? 442 : 158, y: initial.team ? 280 : 520 };
  const sentAt = performance.now();one.send(action);const result = await one.next(packet => packet.type === 'result' && packet.nonce === action.nonce), actionAckMs = Math.round(performance.now()-sentAt);assert.equal(result.result.ok,true);
  const mirrored = await two.next(packet => packet.type === 'snapshot' && packet.game.units.length > 0);assert.notEqual(mirrored.team,initial.team);
  const deployed = mirrored.game.stats[initial.team].deployed;
  const marker = one.packets.length;one.send(action);assert.deepEqual((await one.next(packet => packet.type === 'result' && packet.nonce === action.nonce,marker)).result,result.result);
  await delay(3000);
  const last = one.packets.filter(entry => entry.packet.type === 'snapshot').at(-1).packet;assert.equal(last.game.stats[initial.team].deployed,deployed);
  one.ws.close();
  const restored = await connect('/v1/rooms/'+room);restored.send({ type: 'hello', protocol: 2, token: welcomes[0].token, resume: true, after: last.seq });
  const recovered = await restored.next(packet => packet.type === 'snapshot');assert.equal(recovered.roomId,room);assert.equal(recovered.team,initial.team);assert.ok(recovered.game.elapsed >= last.game.elapsed);
  const snapshots = one.packets.filter(entry => entry.packet.type === 'snapshot' && entry.packet.serverTime > initial.serverTime);
  const gaps = snapshots.slice(1).map((entry,index)=>entry.packet.serverTime-snapshots[index].packet.serverTime).sort((a,b)=>a-b);
  console.log(JSON.stringify({ server: base, protocol: 2, sameRoomAfterReconnect: true, duplicateDeploys: 0, actionAckMs, snapshots: snapshots.length, medianServerFrameGapMs: gaps[Math.floor(gaps.length/2)], p95ServerFrameGapMs: gaps[Math.floor(gaps.length*.95)], maxPacketBytes: Math.max(...snapshots.map(entry=>entry.bytes)) },null,2));
  restored.send({ type: 'action', kind: 'leave', nonce: crypto.randomUUID() });await restored.next(packet => packet.type === 'snapshot' && packet.game.state === 'ended');
} finally { for (const client of clients) { clearInterval(client.ping);try{client.ws.close();}catch{} } }
