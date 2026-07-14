import test from 'node:test';
import assert from 'node:assert';
import { Engine } from '../src/engine.js';
import { events } from '../src/events.js';
import { SLOTS, SKILLS } from '../src/lore.js';
import { listPacks, loadPack } from '../bin/packs.js';

const ids = await listPacks();
const packs = await Promise.all(ids.map(loadPack));
const lore = packs[0];

const run = (seed, days = 200, dials = {}, pack = lore) => {
  const e = new Engine({ seed, dials, lore: pack });
  e.run(days);
  return e.state;
};

test('determinism: same seed + same world produces an identical run', () => {
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
  const e = new Engine({ seed: 9, dials: { reckless: 0, sociable: 0, generous: 0 }, lore });
  const pool = events.filter((ev) => !ev.require || ev.require(e.state, e));
  const w = e.weightsFor(pool);
  assert.ok(w.every((x) => x > 0), 'a weight hit zero — dials must shift texture, never delete a genre');
});

test('every slot the manifest declares can actually happen', () => {
  // A slot nobody can reach is prose written for nothing, and it is invisible:
  // the pack validates, the tests pass, the game runs, and four outcomes simply
  // never occur. `ambush` and `beast` branched on `vary(0, 1)`, which multiplies
  // a mean of zero and is therefore always exactly zero — so across every dial
  // setting she never won an ambush outright, was never ruined by one, and was
  // never mauled. Twelve lines per pack, dead. This is the test that says so.
  const fired = new Set();
  for (const reckless of [10, 50, 90]) {
    for (const sociable of [10, 50, 90]) {
      for (const generous of [10, 50, 90]) {
        for (let seed = 1; seed <= 25; seed++) {
          const e = new Engine({ seed, dials: { reckless, sociable, generous }, lore });
          const line = e.line.bind(e);
          e.line = (slot, vars) => { fired.add(slot); return line(slot, vars); };
          e.run(300);
        }
      }
    }
  }
  const dead = Object.keys(SLOTS).filter((s) => !fired.has(s));
  assert.deepStrictEqual(dead, [], `slots that can never fire: ${dead.join(', ')}`);
});

test('every region and every faction actually gets used', () => {
  // Same bug class as the dead slots above, and a much easier one to ship now that
  // there are regions and factions: a region nobody can reach, or a faction whose
  // standing can never cross a threshold, is a page of prose that validates, tests
  // clean, and never once appears in anybody's game.
  const regions = new Set();
  const factionLines = new Set();

  for (const generous of [15, 50, 85]) {
    for (const reckless of [20, 55, 90]) {
      for (let seed = 1; seed <= 25; seed++) {
        const e = new Engine({ seed, dials: { reckless, sociable: 74, generous }, lore });
        const fl = e.factionLine.bind(e);
        const al = e.allegianceLine.bind(e);
        e.factionLine = (id, slot, vars) => { factionLines.add(`${id}.${slot}`); return fl(id, slot, vars); };
        e.allegianceLine = (id, slot, vars) => { factionLines.add(`${id}.${slot}`); return al(id, slot, vars); };
        e.run(300);
        for (const i of e.state.seen) regions.add(lore.regions[i].id);
      }
    }
  }

  const unreached = lore.regions.map((r) => r.id).filter((id) => !regions.has(id));
  assert.deepStrictEqual(unreached, [], `regions she can never get to: ${unreached.join(', ')}`);

  for (const f of lore.factions) {
    for (const slot of ['favour', 'shelter', 'hunted']) {
      assert.ok(
        factionLines.has(`${f.id}.${slot}`),
        `"${f.id}" can never ${slot} her — that faction's prose is unreachable`
      );
    }
  }
});

test('every skill can actually be learned, and coin has somewhere to go', () => {
  // "Coin is a dead number" has been the #1 known problem in CLAUDE.md since the
  // beginning. The schools are the answer, so this asserts the answer works: every
  // skill reachable, and the money actually leaving her pocket.
  const reached = new Set();
  let spent = 0;

  for (const reckless of [20, 55, 90]) {
    for (let seed = 1; seed <= 40; seed++) {
      const e = new Engine({ seed, dials: { reckless, sociable: 74 }, lore });
      const train = e.trainAt.bind(e);
      e.trainAt = (sc) => { const c = train(sc); spent += c; reached.add(sc.teaches); return c; };
      e.run(300);
    }
  }

  const unteachable = Object.keys(SKILLS).filter((k) => !reached.has(k));
  assert.deepStrictEqual(unteachable, [], `skills she can never learn: ${unteachable.join(', ')}`);
  assert.ok(spent > 0, 'nobody ever paid a school — coin is still a dead number');
});

test('a suggestion is a request, not an order — and she stops taking it', () => {
  // The player never moves her. They suggest, and `heeds()` decides how much of
  // that suggestion survives the woman she has become. If this ever asserts that
  // she always goes where she is told, the whole thesis is gone.
  //
  // Measure the DESTINATION CHOICE, not "did she ever set foot there" — over a
  // long life she wanders into every region eventually, so that saturates at 100%
  // and tests nothing.
  const target = lore.regions[3];

  const shareOfTravelsTo3 = (suggest, drift) => {
    let toTarget = 0, travels = 0;
    for (let seed = 1; seed <= 80; seed++) {
      const e = new Engine({ seed, dials: { reckless: 50, sociable: 50, generous: 50 }, lore });
      if (suggest) e.state.suggested = target.id;
      // drift her away from the player's dials: she is no longer the woman they set
      if (drift) for (const d of ['reckless', 'sociable', 'generous']) e.state.true[d] += 25;
      for (let i = 0; i < 400; i++) {
        if (e.state.region === 3) continue;
        travels++;
        if (e.chooseDestination() === 3) toTarget++;
      }
    }
    return toTarget / travels;
  };

  const ignored = shareOfTravelsTo3(false, false);
  const asked = shareOfTravelsTo3(true, false);
  const askedButDrifted = shareOfTravelsTo3(true, true);

  assert.ok(asked > ignored * 1.5, `a suggestion must actually pull her (${ignored.toFixed(2)} -> ${asked.toFixed(2)})`);
  assert.ok(asked < 0.95, 'she must not be a puppet — a suggestion is not a command');
  assert.ok(
    askedButDrifted < asked,
    `a woman who has drifted from the player must take their suggestion LESS (${asked.toFixed(2)} -> ${askedButDrifted.toFixed(2)})`
  );
});

test('true dials stay in bounds under drift', () => {
  for (const dials of [{ reckless: 100, sociable: 100, generous: 100 }, { reckless: 0, sociable: 0, generous: 0 }]) {
    const s = run(5, 400, dials);
    for (const k of ['reckless', 'sociable', 'generous']) {
      assert.ok(s.true[k] >= 0 && s.true[k] <= 100, `${k} escaped 0..100`);
    }
  }
});

test('an unanswered judgment resolves itself rather than piling up', () => {
  const s = run(11, 300, { sociable: 95 });
  assert.ok(s.pending.length <= 2, 'judgments are not expiring');
  assert.ok(
    s.log.some((l) => l.kind === 'judgment' && l.by === 'her'),
    'she should be deciding for herself when nobody answers'
  );
});

test('she dies once and stays dead — there is no cycle', () => {
  // find a run that kills her, then keep ticking well past it
  let dead = null;
  for (let seed = 1; seed <= 60 && !dead; seed++) {
    const e = new Engine({ seed, dials: { reckless: 100 }, lore });
    e.run(600);
    if (!e.state.alive) dead = e;
  }
  assert.ok(dead, 'expected some reckless seed to get her killed');

  const at = dead.state.log.length;
  dead.run(400);
  assert.strictEqual(dead.state.log.length, at, 'a dead adventurer must not keep generating chronicle');
  assert.strictEqual(typeof dead.reincarnate, 'undefined', 'reincarnate() is gone — nothing comes back');
  assert.strictEqual(dead.state.cycle, undefined, 'there is no cycle counter');
});

// ---------------------------------------------------------------- the lore

test('the engine hard-codes no proper nouns — every word comes from the pack', async () => {
  // the point of the lore layer: two worlds, same seed, same MECHANICS, no shared prose
  const a = run(21, 150, {}, packs[0]);
  const b = run(21, 150, {}, packs[packs.length - 1]);
  if (packs.length < 2) return;

  const textA = a.log.map((l) => l.text);
  const textB = b.log.map((l) => l.text);
  assert.strictEqual(textA.length, textB.length, 'same seed must fire the same events in any world');
  assert.deepStrictEqual(
    a.log.map((l) => l.id),
    b.log.map((l) => l.id),
    'the mechanics are the mechanics; only the words change'
  );
  const shared = textA.filter((t) => textB.includes(t));
  assert.strictEqual(shared.length, 0, `two worlds shared a line of prose: ${shared[0]}`);
});

test('no chronicle line leaks an unfilled {placeholder} or a missing slot', () => {
  for (const pack of packs) {
    for (let seed = 1; seed <= 12; seed++) {
      for (const l of run(seed, 250, { sociable: 90, reckless: 80 }, pack).log) {
        assert.ok(!/\{\w+\}/.test(l.text), `${pack.id}: unfilled placeholder -> "${l.text}"`);
        assert.ok(!l.text.includes('[missing lore'), `${pack.id}: ${l.text}`);
      }
    }
  }
});

test('a filled-in line never doubles an article', () => {
  // Places carry their own article about half the time ("the Glass Canal" vs
  // "Wellmouth"), so a template that writes "the {place}" reads correctly on some
  // rolls and renders "on the the Mirage Road road" on the others. It shipped.
  // bin/lore.js rejects the template; this catches the rendered line, whatever
  // wrote it.
  for (const pack of packs) {
    for (let seed = 1; seed <= 12; seed++) {
      for (const l of run(seed, 250, { sociable: 90, reckless: 80 }, pack).log) {
        assert.ok(
          !/\b(the the|a a|an an|the a|a the)\b/i.test(l.text),
          `${pack.id}: doubled article -> "${l.text}"`
        );
      }
    }
  }
});

test('every pack covers every slot the event table can reach', () => {
  for (const pack of packs) {
    for (const slot of Object.keys(SLOTS)) {
      assert.ok(
        pack.lines[slot]?.length > 0,
        `${pack.id} has no prose for "${slot}" — a player will hit it eventually`
      );
    }
  }
});

test('a pack missing prose is rejected at construction, not at day 40', () => {
  const broken = structuredClone(lore);
  delete broken.lines.ambush_triumph;
  assert.throws(
    () => new Engine({ seed: 1, lore: broken }),
    /ambush_triumph/,
    'bad packs must fail loudly and immediately'
  );
  assert.throws(() => new Engine({ seed: 1 }), /lore pack/, 'the engine cannot run without a world');
});
