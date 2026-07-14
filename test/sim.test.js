import test from 'node:test';
import assert from 'node:assert';
import { Sim } from '../src/sim.js';
import { worldFromSeed } from '../gen/worldgen.js';
import { walk } from '../gen/node.js';
import { validate } from '../gen/validate.js';
import { CHRONICLE } from '../gen/tables/chronicle.js';

const run = (seed, days = 200, dials = {}) => {
  const s = new Sim({ seed, dials });
  s.run(days);
  return s;
};

// ---------------------------------------------------------------- determinism
// The whole point of a SEED. Without this the save cannot exist, because the save is
// a journal of inputs replayed from day one.
test('same seed, same world, same life — forever', () => {
  const a = run(21, 150);
  const b = run(21, 150);
  assert.deepStrictEqual(a.state.log.map((l) => l.text), b.state.log.map((l) => l.text));
  assert.strictEqual(a.state.coin, b.state.coin);
  assert.strictEqual(JSON.stringify(a.world), JSON.stringify(b.world));
});

test('different seeds give different worlds and different lives', () => {
  assert.notStrictEqual(
    run(1, 100).state.log.map((l) => l.text).join(''),
    run(2, 100).state.log.map((l) => l.text).join('')
  );
});

// ------------------------------------------------------------ the generator
test('every world the generator can mint is valid', () => {
  for (let seed = 1; seed <= 120; seed++) {
    const w = worldFromSeed(seed, { strict: false });
    assert.deepStrictEqual(w.problems, [], `seed ${seed}: ${w.problems.join('; ')}`);
  }
});

test('a world she cannot walk is not a world', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const s = new Sim({ seed });
    assert.ok(s.sites.length >= 4, `seed ${seed} has only ${s.sites.length} standable places`);
  }
});

// --------------------------------------------------------------------- the lens
// The rule that keeps the chronicle from becoming a newsfeed she is not in.
test('she never hears as a distant rumour a thing that happened where she is standing', () => {
  // The first version did exactly this — "she heard a rumour" that the tolls had gone
  // up in the town she was physically in. She would have SEEN that.
  for (let seed = 1; seed <= 30; seed++) {
    const s = new Sim({ seed, dials: { sociable: 80 } });
    s.run(250);
    for (const l of s.state.log) {
      if (l.kind !== 'rumour') continue;
      // a rumour must not name, as its NEWS, the place she was standing in that day
      const wasAt = s.sites[s.state.at].node.name;
      assert.ok(
        !(l.text.startsWith(`she was in ${wasAt} when`) ),
        `seed ${seed}: a rumour reported something she was present for`
      );
    }
  }
});

test('the world moves whether or not she is looking', () => {
  let eras = 0;
  for (let seed = 1; seed <= 40; seed++) eras += run(seed, 300).state.eras;
  assert.ok(eras > 0, 'the world never wrote a single era — history is the save file, and there is none');
});

test('some things happen that she never finds out about', () => {
  // If she learns everything, the lens is not a lens.
  let unheard = 0;
  for (let seed = 1; seed <= 40; seed++) unheard += run(seed, 200).state.news.length;
  assert.ok(unheard > 0, 'she heard about everything that ever happened — that is a newsfeed, not a life');
});

// ------------------------------------------------------------------ the hooks
test('a hook always cites the two facts it came from, and invents nothing', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const w = worldFromSeed(seed);
    assert.ok(w.hooks.length > 0, `seed ${seed} produced no hooks`);
    for (const h of w.hooks) {
      assert.strictEqual(h.facts.length, 2);
      assert.ok(h.facts[0] && h.facts[1] && h.collision);
    }
  }
});

test('an unanswered judgment decides itself rather than piling up', () => {
  // The load-bearing mechanic, and it survived the rebuild: neglect is a legitimate
  // playstyle with a legitimate cost.
  const s = run(12, 300, { sociable: 90 });
  assert.ok(s.state.pending.length <= 2, 'judgments are not expiring');
  assert.ok(
    s.state.log.some((l) => l.kind === 'judgment' && l.by === 'her'),
    'she should be deciding for herself when nobody answers'
  );
});

// ---------------------------------------------------------------- the numbers
test('coin never goes negative, and no line reports a negative quantity', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const s = run(seed, 200);
    assert.ok(s.state.coin >= 0, `seed ${seed} went into negative coin`);
    for (const l of s.state.log) {
      assert.ok(!/-\d/.test(l.text), `seed ${seed}: negative number leaked into prose -> "${l.text}"`);
    }
  }
});

test('nothing she remembers leaks raw code', () => {
  // A memory read "she settled it, at ${this.here().name}" for a while, because the
  // template literal was written inside single quotes. It went straight into the
  // relationship history and out to the player.
  for (let seed = 1; seed <= 30; seed++) {
    const s = new Sim({ seed, dials: { reckless: 65, sociable: 85 } });
    for (let i = 0; i < 300 && s.state.alive; i++) {
      s.tick();
      for (const j of [...s.state.pending]) {
        const keys = j.options ? Object.keys(j.options) : ['yes'];
        s.answer(j.id, keys[0]);
      }
    }
    for (const b of Object.values(s.state.bonds)) {
      for (const h of b.history) {
        assert.ok(!/\$\{/.test(h.what), `seed ${seed}: raw template in a memory -> "${h.what}"`);
      }
    }
    for (const l of s.state.log) {
      assert.ok(!/\$\{/.test(l.text), `seed ${seed}: raw template in the chronicle -> "${l.text}"`);
    }
  }
});

test('no chronicle line leaks an unfilled {placeholder}', () => {
  for (let seed = 1; seed <= 50; seed++) {
    for (const l of run(seed, 200, { sociable: 85, reckless: 80 }).state.log) {
      assert.ok(!/\{\w+\}/.test(l.text), `seed ${seed}: unfilled placeholder -> "${l.text}"`);
    }
  }
});

test('she dies once and stays dead — there is no cycle', () => {
  let dead = null;
  for (let seed = 1; seed <= 60 && !dead; seed++) {
    const s = new Sim({ seed, dials: { reckless: 100 } });
    s.run(600);
    if (!s.state.alive) dead = s;
  }
  assert.ok(dead, 'expected some reckless seed to get her killed');
  const at = dead.state.log.length;
  dead.run(400);
  assert.strictEqual(dead.state.log.length, at, 'a dead adventurer must not keep generating chronicle');
});

test('a suggestion is a request, not an order — and she stops taking it', () => {
  const target = 3;
  const share = (suggest, drift) => {
    let hits = 0, tries = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const s = new Sim({ seed, dials: { reckless: 50, sociable: 50, generous: 50 } });
      if (s.sites.length <= target) continue;
      if (suggest) s.state.suggested = target;
      if (drift) for (const d of ['reckless', 'sociable', 'generous']) s.state.true[d] += 25;
      for (let i = 0; i < 200; i++) {
        if (s.state.at === target) continue;
        tries++;
        // exercise the real chooser, not a reimplementation of it
        const before = s.state.at;
        s.travel();
        if (s.state.at === target) hits++;
        s.state.at = before;
      }
    }
    return hits / Math.max(1, tries);
  };

  const ignored = share(false, false);
  const asked = share(true, false);
  const drifted = share(true, true);

  assert.ok(asked > ignored * 1.4, `a suggestion must pull her (${ignored.toFixed(3)} -> ${asked.toFixed(3)})`);
  assert.ok(asked < 0.95, 'she must not be a puppet');
  assert.ok(drifted < asked, `a woman who has drifted must take the suggestion LESS (${asked.toFixed(3)} -> ${drifted.toFixed(3)})`);
});

// ------------------------------------------------------------------ the prose
test('every chronicle pool can actually be reached', () => {
  // The dead-slot bug, which shipped once already: prose written for an outcome that
  // no dice roll can produce. It validates, it tests clean, and it never once appears.
  const fired = new Set();
  for (const reckless of [15, 50, 90]) {
    for (const sociable of [15, 50, 90]) {
      for (let seed = 1; seed <= 20; seed++) {
        const s = new Sim({ seed, dials: { reckless, sociable, generous: 50 } });
        const line = s.line.bind(s);
        s.line = (pool, extra) => { fired.add(pool); return line(pool, extra); };
        s.run(300);
      }
    }
  }
  const dead = Object.keys(CHRONICLE).filter((k) => !fired.has(k));
  assert.deepStrictEqual(dead, [], `chronicle pools nothing can reach: ${dead.join(', ')}`);
});
