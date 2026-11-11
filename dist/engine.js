export const W = 600, H = 800;
export const RIVER = { top: 375, bottom: 425 };
export const LANES = [158, 442];
export const CARDS = {
  pikachu: { name: 'Pikachu', id: 25, cost: 3, type: 'electric', label: 'Eléctrico', role: 'A distancia', hp: 310, damage: 76, range: 128, speed: 52, interval: 1.05, air: true, stun: .18, color: '#f8d66d', description: 'Impactrueno alcanza a rivales terrestres y aéreos, y los frena un instante.' },
  squirtle: { name: 'Squirtle', id: 7, cost: 2, type: 'water', label: 'Agua', role: 'A distancia', hp: 390, damage: 46, range: 112, speed: 44, interval: 1.05, air: true, color: '#79c9ed', description: 'Ataca con burbujas. Su bajo coste permite acompañar a un tanque.' },
  charmander: { name: 'Charmander', id: 4, cost: 3, type: 'fire', label: 'Fuego', role: 'Daño de área', hp: 330, damage: 72, range: 112, speed: 46, interval: 1.25, air: true, splash: 32, color: '#f19c6b', description: 'Sus ascuas dañan a varios rivales cercanos. Cuidalo detrás de un tanque.' },
  snorlax: { name: 'Snorlax', id: 143, cost: 5, type: 'normal', label: 'Normal', role: 'Tanque · torres', hp: 1720, damage: 135, range: 29, speed: 27, interval: 1.5, building: true, radius: 20, color: '#86b6ab', description: 'Ignora a los Pokémon y avanza hacia las torres. Tiene mucha vida y camina lento.' },
  zubat: { name: 'Zubat', id: 41, cost: 2, type: 'flying', label: 'Volador', role: 'Enjambre · ×3', hp: 115, damage: 32, range: 27, speed: 66, interval: .9, air: true, flying: true, count: 3, color: '#ad9be4', description: 'Despliega tres Zubat. Vuelan sobre el río, pero son vulnerables al daño de área.' },
  charizard: { name: 'Charizard', id: 6, cost: 5, type: 'fire', label: 'Fuego / volador', role: 'Volador · área', hp: 760, damage: 98, range: 120, speed: 40, interval: 1.4, air: true, flying: true, splash: 45, radius: 18, color: '#f19c6b', description: 'Cruza el río volando y lanza fuego en área contra objetivos terrestres y aéreos.' },
  thunder: { name: 'Impactrueno', cost: 3, type: 'electric', label: 'Eléctrico', role: 'Hechizo · aturde', spell: true, damage: 215, towerDamage: 100, splash: 70, stun: 1.5, color: '#f8d66d', description: 'Golpea cualquier zona de la arena y aturde a sus objetivos durante 1,5 segundos.' },
  fireball: { name: 'Bola de fuego', cost: 4, type: 'fire', label: 'Fuego', role: 'Hechizo · área', spell: true, damage: 320, towerDamage: 165, splash: 82, knockback: 22, color: '#f19c6b', description: 'Daña y empuja a los Pokémon en un área. También puede rematar una torre.' },
  bulbasaur: { name: 'Bulbasaur', id: 1, cost: 3, type: 'grass', label: 'Planta', role: 'Apoyo · ralentiza', hp: 420, damage: 58, range: 122, speed: 40, interval: 1.1, slow: 1.3, air: true, color: '#9ad69c', description: 'Látigo cepa ralentiza a su objetivo. Combina bien con Pokémon de ataque a distancia.' },
  gengar: { name: 'Gengar', id: 94, cost: 4, type: 'ghost', label: 'Fantasma', role: 'Cuerpo a cuerpo · área', hp: 650, damage: 100, range: 32, speed: 65, interval: 1.1, splash: 35, color: '#b9a0e6', description: 'Se acerca rápido y golpea en área. Es eficaz contra grupos terrestres.' },
  machamp: { name: 'Machamp', id: 68, cost: 4, type: 'fighting', label: 'Lucha', role: 'Cuerpo a cuerpo', hp: 940, damage: 122, range: 28, speed: 44, interval: 1.0, radius: 17, color: '#c1b4a1', description: 'Sus golpes fuertes y rápidos eliminan tanques. Necesita apoyo contra voladores.' },
  eevee: { name: 'Eevee', id: 133, cost: 2, type: 'normal', label: 'Normal', role: 'Ataque rápido', hp: 300, damage: 65, range: 26, speed: 76, interval: .8, color: '#d6b18b', description: 'Corre hacia sus rivales y ataca muy rápido. Sirve para defender o presionar un carril.' },
  onix: { name: 'Onix', id: 95, cost: 5, type: 'rock', label: 'Roca', role: 'Tanque · torres', hp: 1500, damage: 165, range: 30, speed: 33, interval: 1.8, building: true, radius: 20, color: '#b2b7bc', description: 'Avanza directo a las torres y las golpea fuerte. Sus ataques son lentos.' },
};
export const DEFAULT_DECK = ['pikachu', 'snorlax', 'squirtle', 'charmander', 'zubat', 'thunder', 'charizard', 'fireball'];
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class Game {
  constructor({ deck = DEFAULT_DECK, difficulty = 'normal', seed = Date.now(), onEvent = () => {}, tutorial = false } = {}) {
    const valid = Array.isArray(deck) && deck.length === 8 && new Set(deck).size === 8 && deck.every(k => CARDS[k]);
    if (!valid) throw new Error('El mazo necesita ocho cartas diferentes.');
    this.seed = seed >>> 0 || 1;
    this.difficulty = difficulty;
    this.onEvent = onEvent;
    this.tutorial = tutorial;
    this.aiEnabled = !tutorial;
    this.state = 'ready';
    this.time = 180;
    this.elapsed = 0;
    this.overtime = false;
    this.winner = null;
    this.reason = '';
    this.energy = [6, 6];
    this.hands = [deck.slice(0, 4), DEFAULT_DECK.slice(0, 4)];
    this.queues = [deck.slice(4), DEFAULT_DECK.slice(4)];
    this.units = [];
    this.projectiles = [];
    this.spells = [];
    this.towers = [];
    this.nextId = 1;
    this.aiClock = 3.5;
    this.stats = [{ deployed: 0, damage: 0, energy: 0, defeated: 0 }, { deployed: 0, damage: 0, energy: 0, defeated: 0 }];
    for (let team = 0; team < 2; team++) {
      for (let lane = 0; lane < 2; lane++) this.towers.push({ id: this.nextId++, team, lane, x: LANES[lane], y: team ? 188 : 612, hp: 1900, maxHp: 1900, king: false, active: true, radius: 29, range: 180, damage: 54, interval: .9, cooldown: .3, stun: 0, hit: 0 });
      this.towers.push({ id: this.nextId++, team, lane: -1, x: 300, y: team ? 82 : 718, hp: 3000, maxHp: 3000, king: true, active: false, radius: 34, range: 185, damage: 62, interval: 1, cooldown: .5, stun: 0, hit: 0 });
    }
  }
  random() {
    let n = this.seed;
    n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
    this.seed = n >>> 0;
    return this.seed / 4294967296;
  }
  emit(type, data = {}) { this.onEvent({ type, ...data }); }
  start() { if (this.state === 'ready') { this.state = 'playing'; this.emit('start'); } }
  pause() { if (this.state === 'playing') { this.state = 'paused'; return true; } return false; }
  resume() { if (this.state === 'paused') this.state = 'playing'; }
  get multiplier() { return this.overtime && this.elapsed >= 240 ? 3 : this.time <= 60 || this.overtime ? 2 : 1; }
  crowns(team) {
    if (this.towers.some(t => t.team !== team && t.king && t.hp <= 0)) return 3;
    return this.towers.filter(t => t.team !== team && !t.king && t.hp <= 0).length;
  }
  canDeploy(team, key, x, y) {
    const card = CARDS[key];
    if (!card || !Number.isFinite(x) || !Number.isFinite(y) || x < 44 || x > 556 || y < 44 || y > 756) return false;
    if (card.spell) return true;
    const lane = x < 300 ? 0 : 1;
    const laneDestroyed = this.towers.some(t => t.team !== team && t.lane === lane && !t.king && t.hp <= 0);
    const inOwnHalf = team === 0 ? y >= 444 : y <= 356;
    const inCaptured = laneDestroyed && (team === 0 ? y >= 252 && y <= 356 : y >= 444 && y <= 548);
    if (!inOwnHalf && !inCaptured) return false;
    return !this.towers.some(t => t.hp > 0 && distance(t, { x, y }) < t.radius + 27);
  }
  deploy(team, handIndex, x, y) {
    if (this.state !== 'playing') return { ok: false, reason: 'La partida no está en marcha.' };
    const key = this.hands[team]?.[handIndex];
    const card = CARDS[key];
    if (!card) return { ok: false, reason: 'Elegí una carta.' };
    if (this.energy[team] + .00001 < card.cost) return { ok: false, reason: `Necesitás ${card.cost} de energía.` };
    if (!this.canDeploy(team, key, x, y)) return { ok: false, reason: card.spell ? 'Elegí un punto dentro de la arena.' : 'Desplegá en tu lado, lejos de las torres.' };
    this.energy[team] = Math.max(0, this.energy[team] - card.cost);
    this.stats[team].energy += card.cost;
    this.hands[team][handIndex] = this.queues[team].shift();
    this.queues[team].push(key);
    if (card.spell) {
      this.spells.push({ key, card, team, x, y, delay: .4 });
      this.emit('cast', { key, team, x, y, radius: card.splash });
    } else {
      const count = card.count || 1;
      for (let i = 0; i < count; i++) {
        const offset = count > 1 ? (i - (count - 1) / 2) * 22 : 0;
        this.spawn(key, team, clamp(x + offset, 48, 552), y + (i % 2) * 15);
      }
    }
    this.emit('deploy', { team, key, x, y, cost: card.cost });
    return { ok: true, key };
  }
  spawn(key, team, x, y, delay = .75) {
    const card = CARDS[key];
    const u = { id: this.nextId++, key, card, team, x, y, hp: card.hp, maxHp: card.hp, radius: card.radius || 12, lane: x < 300 ? 0 : 1, cooldown: .4, spawn: delay, stun: 0, slow: 0, hit: 0, attack: 0, anim: this.random() * 2, dx: 0, dy: team ? 1 : -1, moving: false, target: null };
    this.units.push(u);
    this.stats[team].deployed++;
    this.emit('spawn', { unit: u });
    return u;
  }
  damage(target, amount, team, { stun = 0, slow = 0 } = {}) {
    if (target.hp <= 0 || this.state !== 'playing') return;
    const actual = Math.min(target.hp, amount);
    target.hp = Math.max(0, target.hp - amount);
    target.hit = .15;
    target.stun = Math.max(target.stun, stun);
    target.slow = Math.max(target.slow || 0, slow);
    this.stats[team].damage += actual;
    if (target.king) target.active = true;
    if (target.hp <= 0) {
      if ('king' in target) {
        const king = this.towers.find(t => t.team === target.team && t.king);
        king.active = true;
        this.emit('towerDown', { tower: target, team, crowns: this.crowns(team) });
        if (target.king || this.overtime) this.finish(team, target.king ? 'Torre central destruida' : 'Primera torre en tiempo extra');
      } else { this.stats[team].defeated++; this.emit('faint', { unit: target }); }
    }
  }
  finish(winner, reason) {
    if (this.state === 'ended') return;
    this.state = 'ended'; this.winner = winner; this.reason = reason;
    this.emit('end', { winner, reason });
  }
  endClock() {
    const a = this.crowns(0), b = this.crowns(1);
    if (a !== b) { this.finish(a > b ? 0 : 1, 'Más torres destruidas'); return; }
    if (!this.overtime) {
      this.overtime = true; this.time = 60; this.emit('overtime');
    } else {
      // As in a tower tiebreaker, the lowest surviving tower decides the result.
      const lowest = team => Math.min(...this.towers.filter(t => t.team === team && t.hp > 0).map(t => t.hp));
      const p = lowest(0), e = lowest(1);
      this.finish(p === e ? -1 : p > e ? 0 : 1, p === e ? 'Empate en vida de las torres' : 'Desempate por vida de la torre más dañada');
    }
  }
  validTarget(unit, target) {
    return !!(target && target.hp > 0 && target.team !== unit.team && (!target.card?.flying || unit.card.air) && (!unit.card.building || 'king' in target) && (target.spawn === undefined || target.spawn <= 0));
  }
  acquire(unit) {
    if (!unit.card.building) {
      const nearby = this.units.filter(other => this.validTarget(unit, other) && distance(unit, other) < 155);
      nearby.sort((a, b) => distance(unit, a) - distance(unit, b));
      if (nearby.length) return nearby[0];
    }
    const towers = this.towers.filter(t => this.validTarget(unit, t));
    towers.sort((a, b) => (distance(unit, a) + (a.king ? 55 : 0)) - (distance(unit, b) + (b.king ? 55 : 0)));
    return towers[0] || null;
  }
  waypoint(unit, target) {
    if (unit.card.flying) return target;
    const bridge = LANES[unit.lane];
    if (unit.y > RIVER.bottom && target.y < RIVER.bottom) return Math.abs(unit.x - bridge) > 20 ? { x: bridge, y: RIVER.bottom + 20 } : { x: bridge, y: RIVER.top - 20 };
    if (unit.y < RIVER.top && target.y > RIVER.top) return Math.abs(unit.x - bridge) > 20 ? { x: bridge, y: RIVER.top - 20 } : { x: bridge, y: RIVER.bottom + 20 };
    if (unit.y >= RIVER.top && unit.y <= RIVER.bottom) return { x: bridge, y: target.y < unit.y ? RIVER.top - 20 : RIVER.bottom + 20 };
    return target;
  }
  move(unit, target, dt) {
    const goal = this.waypoint(unit, target);
    let dx = goal.x - unit.x, dy = goal.y - unit.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    dx /= d; dy /= d;
    const speed = unit.card.speed * (unit.slow > 0 ? .58 : 1);
    let nx = unit.x + dx * Math.min(d, speed * dt), ny = unit.y + dy * Math.min(d, speed * dt);
    // Give crowds space without allowing ground units to step off a bridge.
    for (const other of this.units) {
      if (other === unit || other.hp <= 0 || other.spawn > 0 || !!other.card.flying !== !!unit.card.flying) continue;
      const ox = nx - other.x, oy = ny - other.y, od = Math.hypot(ox, oy);
      const gap = (unit.radius + other.radius) * .7;
      if (od > .1 && od < gap) {
        const push = Math.min((gap - od) * .25, 35 * dt);
        nx += ox / od * push; ny += oy / od * push;
      }
    }
    if (!unit.card.flying) {
      for (const tower of this.towers) {
        if (tower.hp <= 0) continue;
        let tx = nx - tower.x, ty = ny - tower.y, td = Math.hypot(tx, ty);
        const gap = tower.radius + unit.radius * .7;
        if (td < gap) {
          if (Math.abs(tx) < 1) tx = unit.id % 2 ? 1 : -1;
          td = Math.hypot(tx, ty) || 1;
          nx = tower.x + tx / td * gap; ny = tower.y + ty / td * gap;
        }
      }
      if (ny >= RIVER.top - 3 && ny <= RIVER.bottom + 3 && Math.min(...LANES.map(x => Math.abs(nx - x))) > 29) {
        ny = unit.y > 400 ? RIVER.bottom + 4 : RIVER.top - 4;
      }
    }
    unit.x = clamp(nx, 46, 554); unit.y = clamp(ny, 42, 758);
    unit.dx = dx; unit.dy = dy; unit.moving = true;
  }
  attack(attacker, target) {
    const card = attacker.card;
    attacker.cooldown = card?.interval || attacker.interval;
    attacker.attack = .36;
    attacker.dx = target.x - attacker.x; attacker.dy = target.y - attacker.y;
    const projectile = { x: attacker.x, y: attacker.y - 12, target, team: attacker.team, damage: card?.damage || attacker.damage, speed: card?.type === 'electric' ? 620 : 340, key: attacker.key || 'tower', splash: card?.splash || 0, stun: card?.stun || 0, slow: card?.slow || 0, air: !card || !!card.air, life: 2 };
    if (card && card.range < 50) {
      this.damage(target, card.damage, attacker.team, card);
      if (card.splash) for (const u of this.units) if (u !== target && u.team !== attacker.team && u.hp > 0 && !u.card.flying && distance(u, target) < card.splash) this.damage(u, card.damage, attacker.team, card);
      this.emit('hit', { x: target.x, y: target.y - 12, key: attacker.key, team: attacker.team });
    } else this.projectiles.push(projectile);
  }
  ai(dt) {
    if (!this.aiEnabled) return;
    this.aiClock -= dt;
    if (this.aiClock > 0) return;
    const level = this.difficulty === 'easy' ? .7 : this.difficulty === 'hard' ? 1.3 : 1;
    this.aiClock = (1.3 + this.random() * 1.5) / level;
    const hand = this.hands[1];
    const threats = this.units.filter(u => u.team === 0 && u.hp > 0 && u.y < 380);
    const affordable = hand.map((key, i) => ({ key, i, card: CARDS[key] })).filter(c => c.card.cost <= this.energy[1]);
    if (!affordable.length || (!threats.length && this.energy[1] < (this.difficulty === 'easy' ? 7 : 5))) return;
    let choice = affordable[Math.floor(this.random() * affordable.length)];
    if (threats.some(u => u.card.flying)) choice = affordable.find(c => c.card.air && !c.card.spell) || choice;
    if (choice.card.spell) {
      const weak = this.towers.find(t => t.team === 0 && t.hp > 0 && t.hp <= choice.card.towerDamage);
      const enemy = this.units.filter(u => u.team === 0 && u.hp > 0).sort((a, b) => a.y - b.y)[0];
      if (weak || enemy) { const t = weak || enemy; this.deploy(1, choice.i, t.x, t.y); return; }
      choice = affordable.find(c => !c.card.spell);
      if (!choice) return;
    }
    let lane = Math.floor(this.random() * 2);
    if (threats.length) lane = threats[0].x < 300 ? 0 : 1;
    const x = LANES[lane] + (this.random() - .5) * 65;
    const y = threats.length ? 285 : choice.card.building ? 115 : 272;
    this.deploy(1, choice.i, x, y);
  }
  step(dt) {
    if (this.state !== 'playing') return;
    dt = clamp(dt, 0, .1);
    const oldMultiplier = this.multiplier;
    this.time = Math.max(0, this.time - dt); this.elapsed += dt;
    if (oldMultiplier !== this.multiplier) this.emit('energyBoost', { multiplier: this.multiplier });
    const regen = this.multiplier / 2.8;
    for (let team = 0; team < 2; team++) this.energy[team] = Math.min(10, this.energy[team] + regen * dt);
    this.ai(dt);
    for (const spell of this.spells) {
      spell.delay -= dt;
      if (spell.delay > 0 || spell.done) continue;
      spell.done = true;
      const targets = [...this.units, ...this.towers].filter(t => t.team !== spell.team && t.hp > 0 && (t.spawn === undefined || t.spawn <= 0) && distance(t, spell) < spell.card.splash + t.radius * .4);
      for (const target of targets) {
        this.damage(target, 'king' in target ? spell.card.towerDamage : spell.card.damage, spell.team, spell.card);
        if (target.card && spell.card.knockback && !target.card.building) {
          const d = distance(target, spell) || 1;
          const nx = clamp(target.x + (target.x - spell.x) / d * spell.card.knockback, 46, 554);
          const ny = clamp(target.y + (target.y - spell.y) / d * spell.card.knockback, 42, 758);
          const onGround = !target.card.flying;
          const offBridge = Math.min(...LANES.map(x => Math.abs(nx - x))) > 29;
          if (!(onGround && ny > RIVER.top && ny < RIVER.bottom && offBridge)) { target.x = nx; target.y = ny; }
        }
      }
      this.emit('spellHit', { key: spell.key, x: spell.x, y: spell.y, radius: spell.card.splash, team: spell.team });
    }
    this.spells = this.spells.filter(s => !s.done);
    for (const tower of this.towers) {
      tower.hit = Math.max(0, tower.hit - dt); tower.stun = Math.max(0, tower.stun - dt);
      tower.cooldown -= dt;
      if (tower.hp <= 0 || !tower.active || tower.stun > 0 || tower.cooldown > 0) continue;
      const enemies = this.units.filter(u => u.team !== tower.team && u.hp > 0 && u.spawn <= 0 && distance(tower, u) <= tower.range);
      enemies.sort((a, b) => distance(tower, a) - distance(tower, b));
      if (enemies[0]) this.attack(tower, enemies[0]);
    }
    for (const unit of this.units) {
      if (unit.hp <= 0) continue;
      unit.spawn = Math.max(0, unit.spawn - dt); unit.hit = Math.max(0, unit.hit - dt); unit.attack = Math.max(0, unit.attack - dt);
      unit.stun = Math.max(0, unit.stun - dt); unit.slow = Math.max(0, unit.slow - dt); unit.cooldown -= dt; unit.anim += dt;
      unit.moving = false;
      if (unit.spawn > 0 || unit.stun > 0) continue;
      if (!this.validTarget(unit, unit.target) || (unit.target?.card && distance(unit, unit.target) > 210)) unit.target = this.acquire(unit);
      // Ground troops engage nearby defenders even while walking toward a tower.
      if (unit.target && 'king' in unit.target && !unit.card.building) {
        const defender = this.units.find(u => this.validTarget(unit, u) && distance(unit, u) < 120);
        if (defender) unit.target = defender;
      }
      const target = unit.target;
      if (!target) continue;
      const reach = unit.card.range + target.radius;
      if (distance(unit, target) <= reach) { if (unit.cooldown <= 0) this.attack(unit, target); }
      else this.move(unit, target, dt);
    }
    for (const p of this.projectiles) {
      p.life -= dt;
      if (p.target.hp <= 0) { p.life = 0; continue; }
      const tx = p.target.x, ty = p.target.y - 10;
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
      if (d < p.speed * dt + 7) {
        this.damage(p.target, p.damage, p.team, p);
        if (p.splash) for (const u of this.units) if (u !== p.target && u.team !== p.team && u.hp > 0 && u.spawn <= 0 && (!u.card.flying || p.air) && distance(u, p.target) < p.splash) this.damage(u, p.damage, p.team, p);
        this.emit('hit', { key: p.key, x: tx, y: ty, team: p.team }); p.life = 0;
      } else { p.x += dx / d * p.speed * dt; p.y += dy / d * p.speed * dt; }
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0);
    this.units = this.units.filter(u => u.hp > 0);
    if (this.time <= 0 && this.state === 'playing') this.endClock();
  }
}
