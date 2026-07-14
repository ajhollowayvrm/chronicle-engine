import test from 'node:test';
import assert from 'node:assert';
import {
  newJournal, replay, targetElapsed, save, load, bury, epitaphs,
  SAVE_KEY, EPITAPH_KEY, SPEEDS, HEADSTART_DAYS,
} from '../src/game.js';
import { listPacks, loadPack } from '../bin/packs.js';

const ids = await listPacks();
const packs = await Promise.all(ids.map(loadPack));
const lore = packs[0];

const T0 = 1_700_000_000_000;   // fixed epoch: Date.now() is not allowed to leak into a test
const j = (over = {}) => newJournal({ seed: 7, loreId: lore.id, dials: { reckless: 68, sociable: 74 }, now: T0, ...over });

// in-memory localStorage stand-in
const mem = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
  };
};

test('replay is deterministic: the same journal rebuilds the same run', () => {
  const a = replay(j(), 150, lore);
  const b = replay(j(), 150, lore);
  assert.deepStrictEqual(a.state.log.map((l) => l.text), b.state.log.map((l) => l.text));
  assert.strictEqual(a.state.coin, b.state.coin);
});

test('replay is a prefix: stopping early matches the head of a longer run', () => {
  // this is what makes catch-up safe — day 80 of a 200-day run is day 80, full stop
  const short = replay(j(), 80, lore);
  const long = replay(j(), 200, lore);
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
  assert.deepStrictEqual(replay(back, 120, lore).state.log, replay(original, 120, lore).state.log);
});

test('a naive state dump would lose the pending judgments — do not "fix" the journal away', () => {
  // guards the comment at the top of game.js. state.pending carries closures;
  // JSON silently eats them. if this ever stops being true the design can change.
  let withPending = null;
  for (let seed = 1; seed <= 40 && !withPending; seed++) {
    for (let day = 20; day <= 200 && !withPending; day += 7) {
      const r = replay(newJournal({ seed, loreId: lore.id, dials: { sociable: 95 }, now: T0 }), day, lore);
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
  const base = j({ seed: 3, dials: { sociable: 95 } });
  let raised = null;
  for (let d = 2; d <= 120 && !raised; d++) {
    const r = replay(base, d, lore);
    if (r.state.pending.length) raised = { day: d, id: r.state.pending[0].id, opts: r.state.pending[0].options };
  }
  assert.ok(raised, 'expected a judgment');

  const answered = j({ seed: 3, dials: { sociable: 95 } });
  const key = Object.keys(raised.opts)[0];
  answered.entries.push({ elapsed: raised.day, type: 'answer', id: raised.id, key });

  const after = replay(answered, raised.day + 1, lore);
  const mine = after.state.log.filter((l) => l.kind === 'judgment' && l.by === 'player');
  assert.strictEqual(mine.length, 1, 'the answer should be recorded as the player\'s, not hers');
  assert.ok(!after.state.pending.some((p) => p.id === raised.id), 'answering must clear it from pending');
});

test('an ignored judgment still resolves itself on replay', () => {
  const { state } = replay(j({ seed: 11, dials: { sociable: 95 } }), 300, lore);
  assert.ok(
    state.log.some((l) => l.kind === 'judgment' && l.by === 'her'),
    'absence is a legitimate playstyle and must still move the story'
  );
  assert.ok(state.pending.length <= 2, 'judgments must expire, not pile up');
});

test('the same journal in a different world tells the same story in different words', () => {
  if (packs.length < 2) return;
  const jr = j();
  const a = replay(jr, 120, packs[0]);
  const b = replay(jr, 120, packs[1]);

  // identical mechanics...
  assert.deepStrictEqual(a.state.log.map((l) => l.id), b.state.log.map((l) => l.id));
  assert.strictEqual(a.state.coin, b.state.coin);
  // ...entirely different prose
  const shared = a.state.log.map((l) => l.text).filter((t) => b.state.log.some((l) => l.text === t));
  assert.strictEqual(shared.length, 0, `worlds shared a line: ${shared[0]}`);
});

test('ticks after death are inert — nothing carries forward, because there is no cycle', () => {
  const reckless = j({ seed: 2, dials: { reckless: 100 } });
  const atDeath = replay(reckless, 400, lore);
  if (atDeath.state.alive) return;   // not every seed kills her
  const wayPast = replay(reckless, 900, lore);
  assert.deepStrictEqual(
    wayPast.state.log.map((l) => l.text),
    atDeath.state.log.map((l) => l.text),
    'a dead adventurer must not keep generating chronicle'
  );
});

test('unseen is exactly the chronicle written since the player last looked', () => {
  // A careful woman, deliberately: this is a test about the unseen WINDOW, and it
  // needs her alive on day 70 to have written anything by then. At the default
  // dials she is reckless enough that some seeds bury her in the first month, and
  // a dead adventurer correctly produces no story — which used to fail this test
  // for a reason that had nothing to do with what it is checking.
  const careful = { reckless: 20, sociable: 74 };

  const jr = j({ dials: careful });
  jr.seenElapsed = 50;
  const r = replay(jr, 70, lore);
  assert.ok(r.state.alive, 'fixture must survive to day 70 for this test to mean anything');

  const all = r.state.log;
  assert.deepStrictEqual(r.unseen, all.slice(all.length - r.unseen.length));
  assert.ok(r.unseen.length > 0, 'twenty days should have produced some story');

  const caughtUp = j({ dials: careful });
  caughtUp.seenElapsed = 70;
  assert.strictEqual(replay(caughtUp, 70, lore).unseen.length, 0, 'nothing new if you never left');
});

test('the wall clock maps to days, and a clock jump cannot explode the replay', () => {
  const jr = j({ headstartDays: 0 });    // 'normal' speed: 15 real minutes per day
  assert.strictEqual(targetElapsed(jr, T0), 1);
  assert.strictEqual(targetElapsed(jr, T0 + SPEEDS.normal * 4), 5);

  assert.strictEqual(targetElapsed(jr, T0 - 999_999_999), 1, 'a backwards clock must not rewind her');
  const insane = targetElapsed(jr, T0 + 1e15);
  assert.ok(insane <= 20001, 'catch-up is capped');
  assert.ok(replay(jr, insane, lore).state, 'and the capped replay still completes');
});

test('a new life opens on a chronicle already in progress, not an empty page', () => {
  const fresh = j();
  assert.strictEqual(targetElapsed(fresh, T0), 1 + HEADSTART_DAYS);
  const { state } = replay(fresh, targetElapsed(fresh, T0), lore);
  assert.ok(state.log.length > 0, 'there should already be a story to read');
});

test('the world names her — she is not called the same thing in every life', () => {
  const names = new Set(
    packs.flatMap((p) => [1, 2, 3].map((seed) => replay(newJournal({ seed, loreId: p.id, now: T0 }), 2, p).state.name))
  );
  assert.ok(names.size > 1, 'her name should come from the world she was born into');
});

test('a corrupt or stale save starts a new life instead of a white screen', () => {
  const store = mem();
  store.setItem(SAVE_KEY, '{not json');
  assert.strictEqual(load(store), null);
  store.setItem(SAVE_KEY, JSON.stringify({ v: 1, seed: 7 }));   // the pre-lore format
  assert.strictEqual(load(store), null, 'a v1 save has no world and cannot be replayed');
  assert.strictEqual(load(mem()), null);
});

test('the dead are remembered by the player, if not by the world', () => {
  const store = mem();
  assert.deepStrictEqual(epitaphs(store), []);
  bury(store, { name: 'Vesh', world: 'The Salt Verdict', day: 88 });
  bury(store, { name: 'Marrow', world: 'The Vein', day: 31 });
  const list = epitaphs(store);
  assert.strictEqual(list.length, 2);
  assert.strictEqual(list[0].name, 'Marrow', 'most recent death first');

  store.setItem(EPITAPH_KEY, 'garbage');
  assert.deepStrictEqual(epitaphs(store), [], 'a corrupt graveyard is an empty one, not a crash');
});
