import test from 'node:test';
import assert from 'node:assert';
import { newJournal, replay, targetElapsed, save, load, SAVE_KEY, SPEEDS, HEADSTART_DAYS } from '../src/game.js';

const T0 = 1_700_000_000_000;   // fixed epoch: Date.now() is not allowed to leak into a test
const j = (over = {}) => newJournal({ seed: 7, dials: { reckless: 68, sociable: 74 }, now: T0, ...over });

// in-memory localStorage stand-in
const mem = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

test('replay is deterministic: the same journal rebuilds the same run', () => {
  const a = replay(j(), 150);
  const b = replay(j(), 150);
  assert.deepStrictEqual(a.state.log.map((l) => l.text), b.state.log.map((l) => l.text));
  assert.strictEqual(a.state.coin, b.state.coin);
});

test('replay is a prefix: stopping early matches the head of a longer run', () => {
  // this is what makes catch-up safe — day 80 of a 200-day run is day 80, full stop
  const short = replay(j(), 80);
  const long = replay(j(), 200);
  assert.deepStrictEqual(
    short.state.log.map((l) => l.text),
    long.state.log.slice(0, short.state.log.length).map((l) => l.text)
  );
});

test('the journal survives a JSON round-trip — the whole reason it exists', () => {
  const store = mem();
  const original = j();
  original.entries.push({ elapsed: 10, type: 'dials', dials: { reckless: 90 } });
  save(original, store);
  const back = load(store);
  assert.deepStrictEqual(back, original);
  assert.deepStrictEqual(replay(back, 120).state.log, replay(original, 120).state.log);
});

test('a naive state dump would lose the pending judgments — do not "fix" the journal away', () => {
  // guards the comment at the top of game.js. state.pending carries closures;
  // JSON silently eats them. if this ever stops being true the design can change.
  const { state } = replay(newJournal({ seed: 11, dials: { sociable: 95 }, now: T0 }), 300);
  const raised = state.log.filter((l) => l.kind === 'judgment');
  assert.ok(raised.length > 0, 'expected this seed to raise judgments');

  // find a run that has one actually pending, then prove JSON destroys it
  let withPending = null;
  for (let seed = 1; seed <= 40 && !withPending; seed++) {
    for (let day = 20; day <= 200 && !withPending; day += 7) {
      const r = replay(newJournal({ seed, dials: { sociable: 95 }, now: T0 }), day);
      if (r.state.pending.length) withPending = r.state;
    }
  }
  assert.ok(withPending, 'expected some run to have a live pending judgment');

  const opt = Object.values(withPending.pending[0].options)[0];
  assert.strictEqual(typeof opt.apply, 'function', 'judgment options carry live closures');
  const revived = JSON.parse(JSON.stringify(withPending));
  assert.strictEqual(
    typeof Object.values(revived.pending[0].options)[0].apply,
    'undefined',
    'JSON dropped the closure, exactly as the journal design assumes'
  );
});

test('a recorded answer overrides what she would have chosen alone', () => {
  // find the first judgment this seed raises, and the day it was raised
  const base = j({ seed: 3, dials: { sociable: 95 } });
  let raised = null;
  for (let d = 2; d <= 120 && !raised; d++) {
    const r = replay(base, d);
    if (r.state.pending.length) raised = { day: d, id: r.state.pending[0].id, opts: r.state.pending[0].options };
  }
  assert.ok(raised, 'expected a judgment');

  const answered = j({ seed: 3, dials: { sociable: 95 } });
  const key = Object.keys(raised.opts)[0];
  answered.entries.push({ elapsed: raised.day, type: 'answer', id: raised.id, key });

  const after = replay(answered, raised.day + 1);
  const mine = after.state.log.filter((l) => l.kind === 'judgment' && l.by === 'player');
  assert.strictEqual(mine.length, 1, 'the answer should be recorded as the player\'s, not hers');
  assert.ok(!after.state.pending.some((p) => p.id === raised.id), 'answering must clear it from pending');
});

test('an ignored judgment still resolves itself on replay', () => {
  const { state } = replay(j({ seed: 11, dials: { sociable: 95 } }), 300);
  assert.ok(
    state.log.some((l) => l.kind === 'judgment' && l.by === 'her'),
    'absence is a legitimate playstyle and must still move the story'
  );
  assert.ok(state.pending.length <= 2, 'judgments must expire, not pile up');
});

test('reincarnation replays through the journal and carries the dead forward', () => {
  const jr = j();
  const before = replay(jr, 60);
  const ghosts = before.state.ghosts.length;
  assert.ok(ghosts > 0, 'expected this seed to have buried someone by day 60');

  jr.entries.push({ elapsed: 60, type: 'reincarnate', name: 'Vaun of the Wend' });

  // stop ON the day the cycle turns: one more tick and she has already earned
  // road-coin into the new life, which would mask the reset
  const turned = replay(jr, 60);
  assert.strictEqual(turned.state.cycle, 2);
  assert.strictEqual(turned.state.name, 'Vaun of the Wend');
  assert.strictEqual(turned.state.coin, 40, 'wealth is left behind');
  assert.ok(turned.state.ghosts.length >= ghosts, 'the dead are not');

  const onward = replay(jr, 75);
  assert.strictEqual(onward.state.cycle, 2, 'and the new life goes on being lived');
  assert.ok(onward.state.day > 1);
});

test('ticks after death are inert, so the world waits for you to turn the cycle', () => {
  // she dies at some point on this seed; replaying far past it must not corrupt anything
  const reckless = j({ seed: 2, dials: { reckless: 100 } });
  const atDeath = replay(reckless, 400);
  if (atDeath.state.alive) return;   // not every seed kills her; that's fine
  const wayPast = replay(reckless, 900);
  assert.deepStrictEqual(
    wayPast.state.log.map((l) => l.text),
    atDeath.state.log.map((l) => l.text),
    'a dead adventurer must not keep generating chronicle'
  );
});

test('unseen is exactly the chronicle written since the player last looked', () => {
  const jr = j();
  jr.seenElapsed = 50;
  const r = replay(jr, 70);
  const all = r.state.log;
  assert.deepStrictEqual(r.unseen, all.slice(all.length - r.unseen.length));
  assert.ok(r.unseen.length > 0, 'twenty days should have produced some story');

  const caughtUp = j();
  caughtUp.seenElapsed = 70;
  assert.strictEqual(replay(caughtUp, 70).unseen.length, 0, 'nothing new if you never left');
});

test('the wall clock maps to days, and a clock jump cannot explode the replay', () => {
  const jr = j({ headstartDays: 0 });    // 'normal' speed: 15 real minutes per day
  assert.strictEqual(targetElapsed(jr, T0), 1);
  assert.strictEqual(targetElapsed(jr, T0 + SPEEDS.normal * 4), 5);

  assert.strictEqual(targetElapsed(jr, T0 - 999_999_999), 1, 'a backwards clock must not rewind her');
  const insane = targetElapsed(jr, T0 + 1e15);
  assert.ok(insane <= 20001, 'catch-up is capped');
  assert.ok(replay(jr, insane).state, 'and the capped replay still completes');
});

test('a new life opens on a chronicle already in progress, not an empty page', () => {
  // she was walking before you thought to look. an empty first screen is a
  // dead first impression, and a 15-minute wait for line one is worse.
  const fresh = j();
  assert.strictEqual(targetElapsed(fresh, T0), 1 + HEADSTART_DAYS);
  const { state } = replay(fresh, targetElapsed(fresh, T0));
  assert.ok(state.log.length > 0, 'there should already be a story to read');
});

test('a corrupt save starts a new life instead of a white screen', () => {
  const store = mem();
  store.setItem(SAVE_KEY, '{not json');
  assert.strictEqual(load(store), null);
  store.setItem(SAVE_KEY, JSON.stringify({ v: 99 }));
  assert.strictEqual(load(store), null);
  assert.strictEqual(load(mem()), null);
});
