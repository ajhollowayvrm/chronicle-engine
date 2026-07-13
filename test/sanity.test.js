import test from 'node:test';
import assert from 'node:assert';
import { Engine } from '../src/engine.js';
import { events } from '../src/events.js';

const run = (seed, days = 200, dials = {}) => {
  const e = new Engine({ seed, dials });
  e.run(days);
  return e.state;
};

test('determinism: same seed produces an identical run', () => {
  const a = run(42);
  const b = run(42);
  assert.deepStrictEqual(
    a.log.map((l) => l.text),
    b.log.map((l) => l.text),
    'the client must be able to recompute an absence offline'
  );
});

test('determinism: different seeds produce different runs', () => {
  const a = run(1).log.map((l) => l.text).join('');
  const b = run(2).log.map((l) => l.text).join('');
  assert.notStrictEqual(a, b);
});

test('coin never goes negative', () => {
  for (let seed = 1; seed <= 50; seed++) {
    assert.ok(run(seed).coin >= 0, `seed ${seed} went into negative coin`);
  }
});

test('no chronicle line reports a negative quantity', () => {
  for (let seed = 1; seed <= 50; seed++) {
    for (const l of run(seed).log) {
      assert.ok(!/-\d/.test(l.text), `seed ${seed}: negative number leaked into prose -> "${l.text}"`);
    }
  }
});

test('no event family is ever locked out by the dials', () => {
  // an extreme dial config must still leave every eligible event reachable
  const e = new Engine({ seed: 9, dials: { reckless: 0, sociable: 0, generous: 0 } });
  const pool = events.filter((ev) => !ev.require || ev.require(e.state));
  const w = e.weightsFor(pool);
  assert.ok(w.every((x) => x > 0), 'a weight hit zero — dials must shift texture, never delete a genre');
});

test('true dials stay in bounds under drift', () => {
  for (const dials of [{ reckless: 100, sociable: 100, generous: 100 }, { reckless: 0, sociable: 0, generous: 0 }]) {
    const s = run(5, 400, dials);
    for (const k of ['reckless', 'sociable', 'generous']) {
      assert.ok(s.true[k] >= 0 && s.true[k] <= 100, `${k} escaped 0..100`);
    }
  }
});

test('the cycle carries people forward and leaves wealth behind', () => {
  const e = new Engine({ seed: 3 });
  e.run(200);
  const ghostsBefore = e.state.ghosts.length;
  const s = e.reincarnate('Vaun of the Wend');
  assert.strictEqual(s.coin, 40, 'coin should reset');
  assert.strictEqual(s.cycle, 2);
  assert.strictEqual(s.ghosts.length, ghostsBefore, 'the dead must carry over — this is the whole point');
});

test('an unanswered judgment resolves itself rather than piling up', () => {
  const s = run(11, 300, { sociable: 95 });
  assert.ok(s.pending.length <= 2, 'judgments are not expiring');
  assert.ok(
    s.log.some((l) => l.kind === 'judgment' && l.by === 'her'),
    'she should be deciding for herself when nobody answers'
  );
});
