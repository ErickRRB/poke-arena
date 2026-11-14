import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, Game } from '../dist/engine.js?v=26';
import { packGame, unpackGame } from '../dist/snapshot.js?v=26';

const EPSILON = 1e-7;
const ACTIVE_KEYS = Object.keys(CARDS).filter(key => !CARDS[key].spell && !CARDS[key].passive && CARDS[key].damage > 0);
const GUARDS = ['guard:52', 'guard:31', 'guard:34'];

function record(game, events) {
  game.onEvent = event => {
    if (event.type === 'attackStart') {
      events.push({
        type: event.type, at: game.elapsed, actorId: event.attacker.id,
        seq: event.attacker.attackSeq, windup: event.windup,
        jobs: game.attacks.filter(job => job.attacker === event.attacker).map(job => ({
          shot: job.shot, releaseAt: job.releaseAt, delay: job.delay,
        })),
      });
      // Isolate this attack cycle without replacing attack(), release(), or step().
      event.attacker.cooldown = 10000;
    } else if (event.type === 'attackRelease') {
      events.push({
        type: event.type, at: game.elapsed, actorId: event.attacker.id,
        seq: event.attacker.attackSeq, shot: event.shot, targetId: event.target.id,
      });
    }
  };
}

function fixture(key) {
  const game = new Game({ seed: 129 });
  const events = [];
  record(game, events);
  game.start();
  game.aiEnabled = false;
  for (const tower of game.towers) tower.active = false;
  // Nonzero time catches deadlines accidentally stored relative to match start.
  game.step(.071);

  let attacker;
  if (key.startsWith('guard:')) {
    attacker = game.towers.find(tower => tower.guard.id === Number(key.slice(6)));
    assert.ok(attacker, `missing native tower guard ${key}`);
    attacker.active = true;
  } else {
    attacker = game.spawn(key, 0, 158, 550, 0);
    // Ignore deployment effects and companions; preserve every combat profile value.
    attacker.entryPending = false;
    attacker.summonClock = 10000;
    game.units = [attacker];
  }
  attacker.cooldown = 0;
  const target = game.spawn('regice', 1 - attacker.team, attacker.x, attacker.y + (attacker.team ? 30 : -30), 0);
  target.card = { ...CARDS.regice, passive: true, damage: 0, lifetime: 1e12 };
  target.hp = target.maxHp = 1e9;
  target.lifetime = 1e12;
  target.shield = target.maxShield = 0;
  return { game, events, attacker, target, key };
}

function advanceUntil(game, condition, dt, label, limit = 3) {
  for (let frame = 0; frame <= Math.ceil(limit / dt); frame++) {
    if (condition()) return;
    game.step(dt);
  }
  assert.fail(`${label}: condition not reached within ${limit}s`);
}

function advanceThrough(game, deadline, dt) {
  while (game.elapsed < deadline - EPSILON) game.step(dt);
}

function start(f, mode, dt) {
  if (mode === 'direct') {
    if (f.attacker.burrowed) {
      // A direct call must start from a visible, combat-ready Tesla, too.
      f.attacker.cooldown = 10000;
      f.game.step(dt);
      assert.equal(f.attacker.burrowed, false, `${f.key}: never surfaced for its nearby target`);
    }
    f.game.attack(f.attacker, f.target);
  }
  else advanceUntil(f.game, () => f.events.some(event => event.type === 'attackStart' && event.actorId === f.attacker.id), dt, `${f.key} automatic attack`);
  const began = f.events.find(event => event.type === 'attackStart' && event.actorId === f.attacker.id);
  assert.ok(began, `${f.key}: no attackStart`);
  return began;
}

function releases(f, seq) {
  return f.events.filter(event => event.type === 'attackRelease' && event.actorId === f.attacker.id && (seq === undefined || event.seq === seq));
}

function assertWindow(actual, expected, dt, label) {
  assert.ok(actual >= expected - EPSILON, `${label}: released at ${actual}, before deadline ${expected}`);
  assert.ok(actual < expected + dt + EPSILON, `${label}: released at ${actual}, over one tick after ${expected}`);
}

function checkCycle(f, began, dt) {
  const count = f.attacker.card?.burst || 1;
  const spacing = f.attacker.card?.burstSpacing || 0;
  const windup = f.attacker.card?.windup ?? .18;
  const lastDeadline = began.at + windup + (count - 1) * spacing;
  assert.equal(began.jobs.length, count, `${f.key}: queued shot count`);
  for (const [shot, job] of began.jobs.entries()) {
    assert.equal(job.shot, shot, `${f.key}: queued shot order`);
    assert.ok(Math.abs(job.releaseAt - (began.at + windup + shot * spacing)) < EPSILON, `${f.key}: absolute deadline for shot ${shot}`);
  }

  advanceThrough(f.game, lastDeadline + dt, dt);
  const actual = releases(f, began.seq);
  assert.deepEqual(actual.map(event => event.shot), Array.from({ length: count }, (_, shot) => shot), `${f.key}: missing, duplicate, or reordered release`);
  for (const event of actual) {
    assert.equal(event.targetId, f.target.id, `${f.key}: unexpected target`);
    assertWindow(event.at - began.at, windup + event.shot * spacing, dt, `${f.key} shot ${event.shot}`);
  }
  for (let shot = 1; shot < count; shot++) {
    assert.ok(Math.abs(actual[shot].at - actual[shot - 1].at - spacing) < dt + EPSILON, `${f.key}: burst interval ${shot - 1}→${shot}`);
  }
  assert.equal(f.events.filter(event => event.type === 'attackStart' && event.actorId === f.attacker.id).length, 1, `${f.key}: fixture allowed another attack cycle`);
}

for (const hz of [30, 60]) {
  const dt = 1 / hz;
  for (const mode of ['direct', 'automatic']) {
    test(`${mode} attacks respect windup and every burst deadline across active profiles and guards at ${hz}Hz`, () => {
      for (const key of [...ACTIVE_KEYS, ...GUARDS]) {
        // Voltorb's automatic attack uses stepLeap, not the scheduled-attack queue.
        if (mode === 'automatic' && CARDS[key]?.jumpRange) continue;
        const f = fixture(key);
        const began = start(f, mode, dt);
        if (mode === 'automatic') {
          assert.ok(began.at >= .071 + dt - EPSILON, `${key}: attack did not originate inside step`);
          assert.equal(releases(f, began.seq).length, 0, `${key}: newly scheduled attack released in its birth tick`);
          for (const job of f.game.attacks.filter(job => job.attacker === f.attacker)) {
            assert.ok(Math.abs(job.delay - (job.releaseAt - began.at)) < EPSILON, `${key}: consumed dt in its birth tick`);
          }
        }
        checkCycle(f, began, dt);
      }
    });
  }

  test(`snapshot round trips continue pending deadlines and entity references at ${hz}Hz`, () => {
    for (const mode of ['direct', 'automatic']) {
      for (const key of ['machamp', 'squirtle', ...GUARDS]) {
        for (const afterFirst of [false, true]) {
          if (afterFirst && key.startsWith('guard:')) continue;
          const f = fixture(key);
          const began = start(f, mode, dt);
          if (afterFirst) advanceUntil(f.game, () => releases(f, began.seq).length === 1, dt, `${key} first release`);
          else f.game.step(dt);
          const pending = f.game.attacks.filter(job => job.attacker === f.attacker);
          assert.ok(pending.length > 0, `${key}: snapshot has no pending attack`);
          const wire = JSON.parse(JSON.stringify(packGame(f.game)));
          const wireJobs = wire.attacks.filter(job => job.attackerId === f.attacker.id);
          assert.deepEqual(wireJobs.map(job => job.releaseAt), pending.map(job => job.releaseAt), `${key}: snapshot lost absolute deadlines`);

          const restoredGame = unpackGame(wire);
          const restoredEvents = [];
          record(restoredGame, restoredEvents);
          const restoredAttacker = [...restoredGame.units, ...restoredGame.towers].find(entity => entity.id === f.attacker.id);
          const restoredTarget = restoredGame.units.find(entity => entity.id === f.target.id);
          for (const job of restoredGame.attacks) {
            assert.equal(job.attacker, restoredAttacker, `${key}: attacker reference not restored`);
            assert.equal(job.target, restoredTarget, `${key}: target reference not restored`);
          }
          const restored = { ...f, game: restoredGame, attacker: restoredAttacker, target: restoredTarget, events: restoredEvents };
          const previous = releases(f, began.seq).length;
          const deadline = Math.max(...pending.map(job => job.releaseAt));
          advanceThrough(f.game, deadline + dt, dt);
          advanceThrough(restoredGame, deadline + dt, dt);
          assert.deepEqual(releases(restored, began.seq), releases(f, began.seq).slice(previous), `${key}: restored release timing diverged`);
          assert.deepEqual(releases(restored, began.seq).map(event => event.shot), wireJobs.map(job => job.shot), `${key}: snapshot replayed a completed shot`);
        }
      }
    }
  });

  test(`an absolute release deadline overrides stale relative delay at ${hz}Hz`, () => {
    const f = fixture('machamp');
    const began = start(f, 'direct', dt);
    f.game.attacks.forEach(job => { job.delay = -100; });
    f.game.step(dt);
    assert.equal(releases(f).length, 0, 'stale delay released before the absolute deadline');
    checkCycle(f, began, dt);
  });

  test(`snapshot continuation can switch from ${hz}Hz to ${hz === 30 ? 60 : 30}Hz without rebasing deadlines`, () => {
    const resumedDt = 1 / (hz === 30 ? 60 : 30);
    for (const mode of ['direct', 'automatic']) {
      const f = fixture('machamp');
      const began = start(f, mode, dt);
      advanceUntil(f.game, () => releases(f, began.seq).length === 1, dt, 'first contact before cadence change');
      const wire = JSON.parse(JSON.stringify(packGame(f.game)));
      const game = unpackGame(wire);
      const events = [];
      record(game, events);
      const restored = { ...f, game, events, attacker: game.units.find(unit => unit.id === f.attacker.id) };
      advanceThrough(game, wire.attacks.at(-1).releaseAt + resumedDt, resumedDt);
      const actual = releases(restored, began.seq);
      assert.deepEqual(actual.map(event => event.shot), [1, 2, 3]);
      for (const event of actual) assertWindow(event.at, began.jobs[event.shot].releaseAt, resumedDt, `resumed shot ${event.shot}`);
    }
  });

  test(`stun and death cancel pending contacts before or during a burst at ${hz}Hz`, () => {
    for (const mode of ['direct', 'automatic']) {
      for (const interruption of ['stun', 'attacker death', 'target death']) {
        for (const afterFirst of [false, true]) {
          const f = fixture('machamp');
          const began = start(f, mode, dt);
          if (afterFirst) advanceUntil(f.game, () => releases(f, began.seq).length === 1, dt, 'first melee contact');
          else f.game.step(dt);
          const released = releases(f, began.seq).length;
          if (interruption === 'stun') f.game.damage(f.attacker, 0, f.target.team, { stun: 2 });
          else if (interruption === 'attacker death') f.game.damage(f.attacker, 1e12, f.target.team);
          else f.game.damage(f.target, 1e12, f.attacker.team);
          advanceThrough(f.game, began.jobs.at(-1).releaseAt + dt, dt);
          assert.equal(releases(f, began.seq).length, released, `${mode} ${interruption}: canceled attack released`);
          assert.ok(!f.game.attacks.some(job => job.attacker.id === f.attacker.id && job.seq === began.seq), `${interruption}: canceled jobs remained queued`);
        }
      }
    }
  });

  test(`pause preserves pending attack time before and during a burst at ${hz}Hz`, () => {
    for (const mode of ['direct', 'automatic']) {
      for (const key of ['machamp', 'guard:52']) {
        for (const afterFirst of [false, true]) {
          if (afterFirst && key.startsWith('guard:')) continue;
          const f = fixture(key);
          const began = start(f, mode, dt);
          if (afterFirst) advanceUntil(f.game, () => releases(f, began.seq).length === 1, dt, 'first contact before pause');
          assert.equal(f.game.pause(), true);
          const paused = {
            elapsed: f.game.elapsed, time: f.game.time, attack: f.attacker.attack,
            jobs: f.game.attacks.map(job => ({ shot: job.shot, delay: job.delay, releaseAt: job.releaseAt })),
            releases: releases(f).length,
          };
          for (let frame = 0; frame < hz * 2; frame++) f.game.step(dt);
          assert.deepEqual({
            elapsed: f.game.elapsed, time: f.game.time, attack: f.attacker.attack,
            jobs: f.game.attacks.map(job => ({ shot: job.shot, delay: job.delay, releaseAt: job.releaseAt })),
            releases: releases(f).length,
          }, paused, `${key}: pause advanced attack state`);
          f.game.resume();
          checkCycle(f, began, dt);
        }
      }
    }
  });

  test(`legacy snapshot jobs without releaseAt retain their relative delay at ${hz}Hz`, () => {
    const f = fixture('machamp');
    const began = start(f, 'direct', dt);
    const wire = JSON.parse(JSON.stringify(packGame(f.game)));
    wire.attacks.forEach(job => { delete job.releaseAt; });
    const game = unpackGame(wire);
    const events = [];
    record(game, events);
    const restored = {
      ...f, game, events,
      attacker: game.units.find(unit => unit.id === f.attacker.id),
      target: game.units.find(unit => unit.id === f.target.id),
    };
    assert.ok(game.attacks.every(job => !Object.hasOwn(job, 'releaseAt')));
    advanceThrough(game, began.jobs.at(-1).releaseAt + dt, dt);
    const actual = releases(restored, began.seq);
    assert.deepEqual(actual.map(event => event.shot), [0, 1, 2, 3]);
    for (const event of actual) assertWindow(event.at, began.jobs[event.shot].releaseAt, dt, `legacy shot ${event.shot}`);
  });

  test(`Voltorb's separate automatic leap keeps its own travel duration at ${hz}Hz`, () => {
    const f = fixture('voltorb');
    advanceUntil(f.game, () => !!f.attacker.leap, dt, 'Voltorb leap');
    const began = f.game.elapsed;
    const duration = f.attacker.leap.duration;
    assert.equal(f.game.attacks.length, 0, 'leap unexpectedly used releaseAt scheduling');
    advanceUntil(f.game, () => releases(f).length > 0, dt, 'Voltorb leap contact');
    const actual = releases(f);
    assert.equal(actual.length, 1);
    assertWindow(actual[0].at - began, duration, dt, 'Voltorb leap duration');
    assert.ok(actual[0].at - began >= CARDS.voltorb.windup - EPSILON);
  });
}
