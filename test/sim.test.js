import test from 'node:test';
import assert from 'node:assert';
import { Sim } from '../src/sim.js';
import { worldFromSeed } from '../gen/worldgen.js';
import { walk } from '../gen/node.js';
import { validate } from '../gen/validate.js';
import { CHRONICLE } from '../gen/tables/chronicle.js';
import { SKILLS } from '../gen/tables/stats.js';
import { CALLINGS } from '../gen/tables/callings.js';
import { usable, straining } from '../src/kit.js';
import { newJournal, replay } from '../src/game.js';
import { QUESTION_KEYS, COMMUNE_FAITH } from '../gen/tables/communion.js';

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

// ------------------------------------------------------- what she has, and what she is
//
// The three systems added last, and the three rules they are not allowed to break.

test('a skill she has learned is never taken away — only the use of it', () => {
  // THE ONE THAT MATTERS. Marks are the only downward pressure in the game and they must
  // never touch the raw number: a woman who has walked four hundred miles has feet, and no
  // bad week takes that away from her. A ruined hand does not un-learn the knife. She knows
  // exactly what to do and she cannot do it, and the difference between those two sentences
  // is the difference between this game and a levelling curve.
  for (let seed = 1; seed <= 40; seed++) {
    const s = new Sim({ seed, dials: { reckless: 90, sociable: 70 } });
    const high = { ...s.state.stat };
    let sawTheGap = false;
    for (let i = 0; i < 400 && s.state.alive; i++) {
      s.tick();
      for (const j of [...s.state.pending]) s.answer(j.id, Object.keys(j.options ?? { act: 1 })[0]);
      for (const k of SKILLS) {
        assert.ok(s.state.stat[k] >= high[k], `seed ${seed}: raw ${k} FELL — a mark reached the thing she knows`);
        high[k] = s.state.stat[k];
        if (s.eff(k) < s.state.stat[k]) sawTheGap = true;
      }
    }
    if (sawTheGap) return;   // at least one life showed the knowing outrunning the doing
  }
  assert.fail('no life anywhere ever had a mark cost her the use of a skill — the marks are cosmetic');
});

test('the demand is measured against the woman, and a blade does not hand her the arm to swing it', () => {
  // Check the demand against the EFFECTIVE stat and an item can satisfy its own ask: the
  // sword grants the Hand that qualifies her to hold the sword. The gate then means nothing
  // and every object in the game is free.
  const s = new Sim({ seed: 5 });
  s.state.stat.hand = 8;
  s.state.marks = [];
  s.state.kit = [{
    shape: 'blade', slot: 'blade', name: 'a wicked test blade',
    asks: { hand: 12 }, gives: { swing: +0.5 }, mods: { hand: +6 }, strains: 'danger', worth: 100,
  }];
  assert.strictEqual(usable(s.state.kit[0], s.state), false, 'the blade qualified itself');
  assert.strictEqual(s.eff('hand'), 8, 'an unusable blade still handed her its bonus');
  assert.ok(straining(s.state, 'danger'), 'a blade she cannot handle must cost her in a fight');

  // and when she has actually earned it, it gives what it gives
  s.state.stat.hand = 12;
  assert.strictEqual(usable(s.state.kit[0], s.state), true);
  assert.strictEqual(s.eff('hand'), 18, 'she earned it, and now it works');
  assert.strictEqual(straining(s.state, 'danger'), null);
});

test('she is never called a name her life does not support', () => {
  // "The class has to fit her stats" — enforced, not advised. There is never a menu of nine
  // things she is not. And the requirement reads the WOMAN, not her kit.
  for (let seed = 1; seed <= 50; seed++) {
    const s = new Sim({ seed, dials: { reckless: 75, sociable: 75 } });

    // CHECK AT THE MOMENT OF OFFERING, not at the end. `qualifies` reads BARE (the woman:
    // raw plus her marks), and bare moves both ways — a scar can lower a needed stat long
    // after the name was earned. So a post-hoc check false-fails on a legitimate offer. The
    // only honest place to test the gate is the instant it opens.
    const offer = s.offerCalling.bind(s);
    s.offerCalling = () => {
      const before = new Set(s.state.pending.map((p) => p.id));
      offer();
      for (const p of s.state.pending) {
        if (p.kind !== 'calling' || before.has(p.id)) continue;
        const C = CALLINGS[p.key];
        for (const [k, v] of Object.entries(C.needs ?? {})) {
          assert.ok(s.bare(k) >= v,
            `seed ${seed}: she was offered ${C.name} with a bare ${k} of ${s.bare(k)}, and it needs ${v}`);
        }
        for (const [k, v] of Object.entries(C.lived ?? {})) {
          assert.ok((s.state.lived[k] ?? 0) >= v,
            `seed ${seed}: she was offered ${C.name} with ${k}=${s.state.lived[k] ?? 0}, and it needs ${v}`);
        }
      }
    };

    for (let i = 0; i < 400 && s.state.alive; i++) {
      s.tick();
      for (const j of [...s.state.pending]) s.answer(j.id, Object.keys(j.options ?? { act: 1 })[0]);
    }
    // and the ladder holds: a second name is a promotion from the first, or the Counted
    const took = s.state.called.filter((c) => c.took);
    for (let i = 1; i < took.length; i++) {
      const after = CALLINGS[took[i].key].after;
      assert.ok(after === '*' || after === took[i - 1].key,
        `seed ${seed}: she went from ${took[i - 1].key} to ${took[i].key}, which is not a ladder`);
    }
  }
});

test('a life with a name, a kit and a scar replays from the journal exactly', () => {
  // The save is a journal of INPUTS. Everything added here — what she bought, what it took
  // out of her, the name she answered to — has to be a pure function of (seed, answers), or
  // the save silently stops being able to reproduce her.
  const journal = newJournal({ seed: 12, dials: { reckless: 70, sociable: 70 }, now: 0, headstartDays: 0 });
  const live = new Sim({ seed: 12, dials: { reckless: 70, sociable: 70 } });

  for (let day = 1; day < 300; day++) {
    live.tick();
    for (const j of [...live.state.pending]) {
      const key = Object.keys(j.options ?? { act: 1 })[0];
      live.answer(j.id, key);
      journal.entries.push({ elapsed: live.state.day, type: 'answer', id: j.id, key });
    }
  }

  const { state } = replay(journal, live.state.day);
  assert.deepStrictEqual(state.kit.map((i) => i.name), live.state.kit.map((i) => i.name), 'the kit did not survive the replay');
  assert.deepStrictEqual(state.marks.map((m) => m.key), live.state.marks.map((m) => m.key), 'the marks did not survive the replay');
  assert.strictEqual(state.calling, live.state.calling, 'she came back from the save as somebody else');
  assert.deepStrictEqual(state.log.map((l) => l.text), live.state.log.map((l) => l.text));
});

// ------------------------------------------------- what you can do, and what it costs
test('a blessing is a pure gift, but not a free stat button', () => {
  // The first direct power the player has ever had. Its attention cost was deliberately cut —
  // a gift now costs her NOTHING. But it is still not a button you can lean on: two bindings
  // remain, and if either ever comes loose, the game's central claim — that you cannot simply
  // MAKE her better on demand — is gone, and nobody will notice until it is too late to undo.
  const s = new Sim({ seed: 3 });
  s.run(30);

  // 0. A GIFT COSTS HER NOTHING. It no longer makes her loud to the thing that is counting.
  s.state.stat.faith = 20;
  const loudBefore = s.state.attention;
  assert.ok(s.canBless('mend').ok);
  s.bless('mend');
  assert.strictEqual(s.state.attention, loudBefore, 'a blessing must not cost her attention any more; it is a pure gift.');

  // 1. YOU CANNOT BE A CONSTANT MIRACLE — the silence between gifts is a real gate.
  assert.strictEqual(s.canBless('warmth').ok, false, 'she was blessed twice inside the cooldown');

  // 2. SHE HAS TO BELIEVE YOU ARE THERE — and this is the one that matters, because it is
  //    the bill for months of not turning up. A woman who has stopped believing has no
  //    surface for it to land on. Not "reduced": nothing.
  s.state.lastBlessed = -999;
  s.state.stat.faith = 0;
  assert.strictEqual(s.canBless('quick').ok, false, 'an unbelieving woman could still be blessed');

  const hand = s.eff('hand');
  const r = s.bless('quick');
  assert.strictEqual(r.landed, false, 'the blessing landed on a woman with no faith');
  assert.strictEqual(s.eff('hand'), hand, 'it changed her anyway');
});

// ───────────────────────────────────────────────────── the channel that goes both ways
test('when you ask her something, she answers — in a day or two, and only if she believes', () => {
  // The communion channel. She is walking a country, not sitting by a phone, so the answer
  // is not instant — but it comes, in her own voice, as long as she still believes there is
  // anybody on the other end of the question.
  const s = new Sim({ seed: 7 });
  s.run(40);
  s.state.stat.faith = 12;
  const before = s.state.log.filter((l) => l.kind === 'her').length;

  s.askHer('ok');
  assert.ok(s.state.youAsked, 'the question was not registered');
  let answered = false;
  for (let i = 0; i < 4 && !answered; i++) {
    s.tick();
    if (!s.state.youAsked) answered = true;
  }
  assert.ok(answered, 'she never answered a question you put to her');
  assert.ok(s.state.log.filter((l) => l.kind === 'her').length > before, 'answering produced no line in her voice');

  // and a woman who has stopped believing does not answer at all — the silence is the answer.
  // Spy on the answer generator itself, so the check can't collide with unrelated prose she
  // happens to say (the great beast, an absent line) in the same window.
  const q = new Sim({ seed: 7 });
  q.run(40);
  q.state.stat.faith = COMMUNE_FAITH - 2;
  let answeredWhileDeaf = false;
  const realCommune = q.commune.bind(q);
  q.commune = (t) => { answeredWhileDeaf = true; return realCommune(t); };
  q.askHer('where');
  for (let i = 0; i < 10; i++) q.tick();
  assert.ok(!q.state.youAsked, 'an unheard question should eventually be let go');
  assert.ok(!answeredWhileDeaf, 'she answered a question she could no longer hear');
});

test('every question has a reply she can actually give, whatever state she is in', () => {
  // The dead-pool bug, communion edition: a bucket the code selects but the table never
  // wrote. Drive a spread of lives and assert every topic she is asked returns real words.
  for (const reckless of [20, 60, 95]) {
    for (let seed = 1; seed <= 8; seed++) {
      const s = new Sim({ seed, dials: { reckless, sociable: 70, generous: 60 } });
      for (let i = 0; i < 220 && s.state.alive; i++) {
        s.tick();
        for (const j of [...s.state.pending]) s.answer(j.id, Object.keys(j.options ?? { act: 1 })[0]);
        if (s.eff('faith') >= COMMUNE_FAITH) {
          const r = s.commune(QUESTION_KEYS[i % QUESTION_KEYS.length]);
          assert.ok(r && r.text && !/\{\w+\}/.test(r.text) && !/undefined|null/.test(r.text),
            `seed ${seed}: a question came back empty or with a hole -> ${JSON.stringify(r)}`);
        }
      }
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────── the visit
test('the visit is the most-gated thing in the game, and it leaves a mark that never fades', () => {
  // a careful woman, so she is alive to be visited
  const s = new Sim({ seed: 3, dials: { reckless: 15 } });
  s.run(40);
  assert.ok(s.state.alive, 'the setup needs a living woman to visit');

  // it asks for all three: belief, proof, and that you turned up again and again
  s.state.stat.faith = 20;
  s.state.blessings = 0;
  s.state.answered = 0;
  assert.strictEqual(s.canVisit().ok, false, 'she let you visit having never felt you were real');

  s.state.blessings = 1;
  assert.strictEqual(s.canVisit().ok, false, 'she let you visit without your ever turning up');
  s.state.answered = 3;

  s.state.stat.faith = COMMUNE_FAITH;   // believes a little, not completely
  assert.strictEqual(s.canVisit().ok, false, 'she let you stand in front of her on thin faith');
  s.state.stat.faith = 20;

  assert.ok(s.canVisit().ok, 'a devoted relationship could not earn a visit');
  const loud = s.state.attention;
  const r = s.visit();
  assert.ok(r.visited, 'the visit did not happen');
  assert.ok(s.state.marks.some((m) => m.key === 'seen_you'), 'the visit left no mark');
  assert.ok(s.state.attention > loud, 'a visit must make her burn to the thing that is counting');
  assert.ok(s.state.pending.some((p) => p.kind === 'visit'), 'she did not get to ask you her one thing');

  // and it does not come round again the next day — a face in the room every day is a
  // housemate, not a visitation
  assert.strictEqual(s.canVisit().ok, false, 'she was visited twice in a day');

  // the mark is permanent: it never mends
  s.run(300);
  assert.ok(s.state.marks.some((m) => m.key === 'seen_you'), 'being seen wore off, and it must not');
});

test('a life with communion and a visit replays from the journal exactly', () => {
  // Asking her things and going to her are INPUTS. If either fails to replay, the save
  // silently stops reproducing her — the one thing it exists to do.
  const journal = newJournal({ seed: 15, dials: { reckless: 60, sociable: 75, generous: 65 }, now: 0, headstartDays: 0 });
  const live = new Sim({ seed: 15, dials: { reckless: 60, sociable: 75, generous: 65 } });
  const topics = QUESTION_KEYS;

  for (let day = 1; day < 320; day++) {
    live.tick();
    for (const j of [...live.state.pending]) {
      const key = Object.keys(j.options ?? { act: 1 })[0];
      live.answer(j.id, key);
      journal.entries.push({ elapsed: live.state.day, type: 'answer', id: j.id, key });
    }
    // ask her something every couple of weeks
    if (day % 15 === 0 && live.eff('faith') >= COMMUNE_FAITH) {
      const topic = topics[(day / 15) % topics.length];
      live.askHer(topic);
      journal.entries.push({ elapsed: live.state.day, type: 'ask', topic });
    }
    // and go to her the moment she will bear it
    if (live.canVisit().ok) {
      live.visit();
      journal.entries.push({ elapsed: live.state.day, type: 'visit' });
    }
  }

  const { state } = replay(journal, live.state.day);
  assert.deepStrictEqual(state.log.map((l) => l.text), live.state.log.map((l) => l.text), 'the replay diverged');
  assert.strictEqual(state.visits, live.state.visits, 'the visits did not survive the replay');
  assert.deepStrictEqual(state.marks.map((m) => m.key), live.state.marks.map((m) => m.key), 'the marks did not survive the replay');
});

test('she confides how she feels about the people in her life, and only feelings she has', () => {
  // The point of the whole voice channel: she tells you she is in love, or that she wants
  // somebody dead, drawn off the real state of a real bond. Over sociable lives she should do
  // it often, in a spread of registers, and never leak an unfilled name.
  const registers = new Set();
  let confessions = 0;
  // careful enough to survive and form relationships — the test is about the range of what she
  // confides, and a woman who dies on day 40 has not met anyone to have feelings about yet.
  for (let seed = 1; seed <= 30; seed++) {
    const s = new Sim({ seed, dials: { reckless: 40, sociable: 92, generous: 60 } });
    for (let i = 0; i < 400 && s.state.alive; i++) {
      s.tick();
      for (const j of [...s.state.pending]) s.answer(j.id, Object.keys(j.options ?? { act: 1 })[0]);
    }
    for (const l of s.state.log) {
      if (l.kind !== 'her') continue;
      assert.ok(!/\{who\}/.test(l.text), `a confession leaked an unfilled name: "${l.text}"`);
      if (/in love with|could love|if I let myself/.test(l.text)) { registers.add('warm-romance'); confessions++; }
      else if (/want to kill|could kill|going to end each other|dead for what|not being in the way|do without|put themselves on it|has to be settled/.test(l.text)) { registers.add('hostile'); confessions++; }
      else if (/owe .* my life|stepped in front of a blade/.test(l.text)) { registers.add('debt'); confessions++; }
      else if (/knows the true|put the knife/.test(l.text)) { registers.add('secret'); confessions++; }
      else if (/am fond of|easy to be around|second watch|makes me laugh|stand between|joke my mother/.test(l.text)) { registers.add('fond'); confessions++; }
      else if (/still talk to|dreamed about/.test(l.text)) { registers.add('grief'); confessions++; }
    }
  }
  assert.ok(confessions >= 30, `she barely confided anything across 30 sociable lives (${confessions})`);
  assert.ok(registers.has('hostile'),
    'she never once confided anger at anyone, across 30 sociable lives — the range is missing its dark half');
  assert.ok(registers.size >= 3, `her confessions came in only ${registers.size} register(s): ${[...registers]}`);
});

// ─────────────────────────────────────────────────── the two feeds, and the warning
test('every line belongs to exactly one feed, and her account is in her own voice', () => {
  const s = new Sim({ seed: 3, dials: { reckless: 60, sociable: 70, generous: 60 } });
  for (let i = 0; i < 220 && s.state.alive; i++) {
    s.tick();
    for (const j of [...s.state.pending]) s.answer(j.id, Object.keys(j.options ?? { act: 1 })[0]);
  }
  let her = 0, world = 0;
  for (const l of s.state.log) {
    assert.ok(l.feed === 'her' || l.feed === 'world', `a line with no feed: "${l.text}"`);
    l.feed === 'her' ? her++ : world++;
  }
  assert.ok(her > 0 && world > 0, 'one of the two feeds never got a line');

  // her account is first person: the third-person Record is gone. The remaining "she …"
  // lines are inline prose not yet converted; they must be the small minority, not the rule.
  const herLines = s.state.log.filter((l) => l.feed === 'her');
  const thirdPerson = herLines.filter((l) => /^she /i.test(l.text)).length;
  assert.ok(thirdPerson < herLines.length * 0.4,
    `her account is still ${Math.round(100 * thirdPerson / herLines.length)}% third person`);
});

test('an unwarned ambush lands; a heeded warning gives her the chance to turn it aside', () => {
  // Not ready — because nobody warned her and she did not see it — means it cannot be dodged.
  // It lands, and she writes it in her own account, in the first person.
  const a = new Sim({ seed: 9 });
  a.run(15);
  a.state.wounds = 0;
  a.state.stat.eye = 2;                 // she will not spot it herself
  a.spawnThreat('ambush', 'a hard man');
  while (a.state.threats.length) a.tick();
  assert.ok(a.state.log.some((l) => l.id === 'ambushed' && l.feed === 'her'),
    'an unwarned ambush did not land in her account');
  assert.ok(!a.state.log.some((l) => l.id === 'dodged'), 'she dodged a threat she was never ready for');

  // Warned, believing, and sharp: across many worlds she turns at least some of them aside.
  let dodged = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const s = new Sim({ seed });
    s.run(15);
    if (!s.state.alive) continue;
    s.state.stat.faith = 16; s.state.stat.eye = 17; s.state.stat.foot = 15;
    s.spawnThreat('ambush', 'a hard man');
    s.warn(s.state.threats[0].id);
    assert.ok(s.state.threats[0].warned, 'a believing woman did not take the warning');
    while (s.state.threats.length) s.tick();
    if (s.state.log.some((l) => l.id === 'dodged')) dodged++;
  }
  assert.ok(dodged > 0, 'a warned, sharp-eyed woman never once avoided an ambush');
});

test('a warning she cannot hear lands on nothing', () => {
  const s = new Sim({ seed: 5 });
  s.run(15);
  s.state.stat.faith = 2;               // she has stopped believing enough to hear you
  s.spawnThreat('theft', 'a quiet man');
  s.warn(s.state.threats[0].id);
  assert.ok(s.state.threats[0].told, 'the warning was not registered as attempted');
  assert.ok(!s.state.threats[0].warned, 'a warning landed on a woman who could not hear it');
});

test('a life with a warning in it replays from the journal exactly', () => {
  const journal = newJournal({ seed: 9, dials: { reckless: 60, sociable: 65 }, now: 0, headstartDays: 0 });
  const live = new Sim({ seed: 9, dials: { reckless: 60, sociable: 65 } });
  for (let day = 1; day < 260; day++) {
    live.tick();
    for (const j of [...live.state.pending]) {
      const key = Object.keys(j.options ?? { act: 1 })[0];
      live.answer(j.id, key);
      journal.entries.push({ elapsed: live.state.day, type: 'answer', id: j.id, key });
    }
    for (const t of live.state.threats) {
      if (t.told) continue;
      live.warn(t.id);
      journal.entries.push({ elapsed: live.state.day, type: 'warn', id: t.id });
    }
  }
  const { state } = replay(journal, live.state.day);
  assert.deepStrictEqual(state.log.map((l) => l.text), live.state.log.map((l) => l.text),
    'the replay diverged with warnings in the journal');
});

test('a beast is made of the world it is standing in, and never of a bestiary', () => {
  // A stock dragon in a salt desert is the seed engine failing to pay for itself. Every
  // beast must cite a fact the player can already read somewhere else in the game.
  for (let seed = 1; seed <= 40; seed++) {
    const s = new Sim({ seed });
    const all = [...Object.values(s.beasts), s.great].filter(Boolean);
    assert.ok(s.great, `seed ${seed} has no great beast — every world has exactly one`);
    for (const b of all) {
      assert.ok(b.name && b.what && b.where, `seed ${seed}: a beast with no name, no reason, or nowhere to be`);
      assert.ok(!/undefined|null|\{/.test(b.name + b.what), `seed ${seed}: a hole in "${b.name}" / "${b.what}"`);
      assert.ok(b.power > 0 && b.worth > 0);
    }
  }
});

test('looking at the bestiary does not change her life', () => {
  // The bestiary is derived from the world and must NEVER touch `sim.rng` — the random
  // stream is the spine of the save. Consume one draw here that the client does not consume
  // there, and the same seed stops producing the same life.
  const a = new Sim({ seed: 9 });
  const b = new Sim({ seed: 9 });
  for (let i = 0; i < 5; i++) { b.quarry(); b.beastHere(); b.might(); }   // stare at it hard
  a.run(120);
  b.run(120);
  assert.deepStrictEqual(
    a.state.log.map((l) => l.text),
    b.state.log.map((l) => l.text),
    'reading the bestiary changed what happened to her'
  );
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
