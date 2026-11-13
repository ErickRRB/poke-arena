import { Game, CARDS } from '../../dist/engine.js?v=24';
import { packGame, unpackGame } from '../../dist/snapshot.js?v=24';
import { publicSnapshot, publicEvent, SIMULATION_HZ, RECONNECT_GRACE, ONLINE_PROTOCOL } from '../../dist/online-wire.js';

export const validDeck = deck => Array.isArray(deck) && deck.length === 8 && new Set(deck).size === 8 && deck.every(key => CARDS[key] && !CARDS[key].token);
export const safeName = name => String(name || 'Entrenador').replace(/[<>\x00-\x1f]/g, '').trim().slice(0, 20) || 'Entrenador';
export class RealtimeMatch {
  constructor({ id, players, now = Date.now(), seed, animations = {}, stored } = {}) {
    this.animations = animations;
    if (stored) {
      Object.assign(this, stored);
      this.game = unpackGame(stored.game, event => this.event(event), animations);
    } else {
      if (players?.length !== 2 || !players.every(player => validDeck(player.deck))) throw Error('Invalid decks');
      this.id = id;
      this.players = players.map(({ id, name, tokenHash }) => ({ id, name: safeName(name), tokenHash }));
      this.seen = [now, now];this.starts = now + 2200;this.last = this.starts;
      this.seq = 0;this.version = 0;this.events = [];this.receipts = [[], []];
      this.game = new Game({ deck: players[0].deck, seed, animations, onEvent: event => this.event(event) });
      this.game.hands[1] = players[1].deck.slice(0, 4);this.game.queues[1] = players[1].deck.slice(4);this.game.aiEnabled = false;
    }
  }
  event(event) {
    if (event.type === 'step') return;
    this.events.push({ seq: ++this.seq, event: publicEvent(event) });
    if (this.events.length > 128) this.events.splice(0, this.events.length - 128);
  }
  touch(team, now) { this.seen[team] = Math.max(this.seen[team], now); }
  advance(now) {
    const missing = this.seen.map(seen => now - seen > RECONNECT_GRACE);
    if (this.game.state !== 'ended' && missing.some(Boolean)) this.game.finish(missing.every(Boolean) ? -1 : missing[0] ? 1 : 0, missing.every(Boolean) ? 'Ambos jugadores se desconectaron' : 'El rival se desconectó');
    if (now >= this.starts && this.game.state === 'ready') this.game.start();
    const steps = this.game.state === 'playing' ? Math.min(900, Math.max(0, Math.floor((now - this.last) * SIMULATION_HZ / 1000))) : 0;
    for (let i = 0; i < steps && this.game.state === 'playing'; i++) { this.game.step(1 / SIMULATION_HZ);this.last += 1000 / SIMULATION_HZ; }
    return steps;
  }
  action(team, action, now = Date.now()) {
    this.advance(now);this.touch(team, now);
    if (!action || !/^[\w-]{12,80}$/.test(action.nonce || '')) return { ok: false, reason: 'Acción no válida.' };
    const previous = this.receipts[team].find(receipt => receipt.nonce === action.nonce);
    if (previous) return previous.result;
    let result;
    if (action.kind === 'leave') {
      if (this.game.state !== 'ended') this.game.finish(1 - team, 'El rival abandonó');
      result = { ok: true };
    } else if (this.game.state !== 'playing') result = { ok: false, reason: 'La partida todavía no está lista.' };
    else if (action.kind === 'deploy' && Number.isInteger(action.handIndex) && action.handIndex >= 0 && action.handIndex < 4 && Number.isFinite(action.x) && Number.isFinite(action.y) && Math.abs(action.x) <= 8192 && Math.abs(action.y) <= 8192) {
      result = this.game.hands[team][action.handIndex] === action.key ? this.game.deploy(team, action.handIndex, action.x, action.y) : { ok: false, reason: 'La mano cambió. Volvé a elegir la carta.' };
    } else if (action.kind === 'ability' && Number.isSafeInteger(action.unitId)) result = this.game.activateAbility(team, action.unitId);
    else result = { ok: false, reason: 'Acción no válida.' };
    this.receipts[team].push({ nonce: action.nonce, result });
    // Successful commands remain deduplicated for the whole match. Keep a
    // bounded retry window for failed inputs as well.
    const firstRecent = this.receipts[team].length - 256;
    this.receipts[team] = this.receipts[team].filter((receipt, index) => receipt.result.ok || index >= firstRecent);
    return result;
  }
  packet(team, after = 0, epoch = '', now = Date.now()) {
    return { type: 'snapshot', protocol: ONLINE_PROTOCOL, status: 'matched', roomId: this.id, epoch, team, version: this.version, serverTime: now, startsIn: Math.max(0, this.starts - now), opponent: this.players[1 - team].name, game: publicSnapshot(this.game, team), events: this.events.filter(entry => entry.seq > after), seq: this.seq };
  }
  serialize() {
    const { game, animations, ...data } = this;
    return { ...data, game: packGame(game) };
  }
}
