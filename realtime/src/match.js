import {C1_SERVICE,C4_SERVICE,isC4Game,serviceEnvelope,arenaServiceForContext} from '../../dist/online-context.js?v=1';
import {validateC4WireEventIdentity,validateC4WireGameShape,validateC4WireEventLog} from '../../dist/c4-wire-preparation.js?v=1';
import {getC4BaseCatalog} from '../../dist/c4-catalog.js?v=1';
import {admitC4Selection} from '../../dist/profile-selection.js?v=1';
import {admitArenaSelection} from '../../dist/arena-profile-selection.js?v=1';
import { Game, currentDeck, validDeck } from '../../dist/engine.js?v=34';
import { packGame, unpackGame, migrateLegacyCardIdentity } from '../../dist/snapshot.js?v=34';
import { publicSnapshot, publicEvent, unpackEvent, SIMULATION_HZ, RECONNECT_GRACE, ONLINE_PROTOCOL } from '../../dist/online-wire.js?v=34';
import {selectedDeck,selectionVersion as currentSelectionVersion} from './selection.js';

export { validDeck };
export const safeName = name => String(name || 'Entrenador').replace(/[<>\x00-\x1f]/g, '').trim().slice(0, 20) || 'Entrenador';
export class RealtimeMatch {
  constructor({ id, players, now = Date.now(), seed, animations = {}, stored,selectionVersion=currentSelectionVersion,service=C1_SERVICE,expectedContext } = {}) {
    this.animations = animations;
    if (stored) {
      if(service.id==='c4'){
        const context=stored.expectedContext;if(context)arenaServiceForContext(context);
        getC4BaseCatalog();if(stored.cohort!=='c4'||stored.game?.catalogVersion!==4||stored.game.ruleset!==(context?.ruleset??'c4-1')||(context&&stored.game.arenaProfileProducer!==context.arenaProfileProducer)||stored.game.catalogRef!==C4_SERVICE.catalogRef||stored.selectionVersion!==(context?3:2))throw Error('Stored match context mismatch');
        validateC4WireGameShape(stored.game,{visibility:'private',expectedContext:context});validateC4WireEventLog(stored.events,{maxSeq:stored.seq,expectedContext:context});
        const next=unpackGame(stored.game,()=>{},animations),events=structuredClone(stored.events);
        for(const entry of events)unpackEvent(entry.event,{game:next,expectedContext:context,validateEvent:event=>validateC4WireEventIdentity(event,{expectedContext:context})});
        Object.assign(this,stored);this.events=events;this.game=next;this.game.onEvent=event=>this.event(event);return;
      }
      else if(isC4Game(stored.game)||stored.expectedContext||stored.game?.arenaProfileProducer)throw Error('Stored C4 match requires its service');
      Object.assign(this, stored);
      this.events=isC4Game(stored.game)?structuredClone(this.events||[]):migrateLegacyCardIdentity(this.events||[]);
      this.game = unpackGame(stored.game, event => this.event(event), animations);
    } else {
      if(service.id==='c4'){
        getC4BaseCatalog();if(expectedContext)arenaServiceForContext(expectedContext);if(selectionVersion!==(expectedContext?3:2))throw Error('Unsupported C4 selection');
        if(players)players=players.map(player=>{const selected=expectedContext?admitArenaSelection(player.deck,player.selection):admitC4Selection(player.deck,player.selection);if(!selected.ok||(expectedContext&&(selected.ruleset!==expectedContext.ruleset||selected.arenaProfileProducer!==expectedContext.arenaProfileProducer)))throw Error('Invalid consented deck');return{...player,deck:selected.keys};});this.cohort='c4';if(expectedContext)this.expectedContext=structuredClone(expectedContext);
      }else{
        if(selectionVersion!==0&&selectionVersion!==currentSelectionVersion)throw Error('Unsupported selection version');
        if(players)players=players.map(player=>({...player,deck:selectionVersion===0?currentDeck(player.deck):selectedDeck(player.deck)}));
      }
      if (players?.length !== 2 || !players.every(player => validDeck(player.deck))) throw Error('Invalid decks');
      this.selectionVersion=selectionVersion;
      this.id = id;
      this.players = players.map(({ id, name, tokenHash }) => ({ id, name: safeName(name), tokenHash }));
      this.seen = [now, now];this.starts = now + 2200;this.last = this.starts;
      this.seq = 0;this.version = 0;this.events = [];this.receipts = [[], []];
      this.game = new Game({ deck: players[0].deck, seed, animations, onEvent: event => this.event(event),...(service.id==='c4'?{catalogVersion:4,ruleset:expectedContext?.ruleset??'c4-1',cpuDeck:players[1].deck}:{}) });
      if(service.id==='c4')this.game.catalogRef=C4_SERVICE.catalogRef;
      this.game.hands[1] = players[1].deck.slice(0, 4);this.game.queues[1] = players[1].deck.slice(4);this.game.aiEnabled = false;
    }
  }
  event(event) {
    if (event.type === 'step') return;
    this.events.push({ seq: ++this.seq, event: publicEvent(event,this.game||(this.cohort==='c4'?{catalogVersion:4,ruleset:'c4-1'}:undefined)) });
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
    }
    else result = { ok: false, reason: 'Acción no válida.' };
    this.receipts[team].push({ nonce: action.nonce, result });
    // Successful commands remain deduplicated for the whole match. Keep a
    // bounded retry window for failed inputs as well.
    const firstRecent = this.receipts[team].length - 256;
    this.receipts[team] = this.receipts[team].filter((receipt, index) => receipt.result.ok || index >= firstRecent);
    return result;
  }
  packet(team, after = 0, epoch = '', now = Date.now()) {
    return { type: 'snapshot', protocol: ONLINE_PROTOCOL,...serviceEnvelope(this.cohort==='c4'?(this.expectedContext?arenaServiceForContext(this.expectedContext):C4_SERVICE):C1_SERVICE), status: 'matched', roomId: this.id, epoch, team, version: this.version, serverTime: now, startsIn: Math.max(0, this.starts - now), opponent: this.players[1 - team].name, game: publicSnapshot(this.game, team), events: this.events.filter(entry => entry.seq > after), seq: this.seq };
  }
  serialize() {
    const { game, animations, ...data } = this;
    return { ...data, game: packGame(game) };
  }
}
