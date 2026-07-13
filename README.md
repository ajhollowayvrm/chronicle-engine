# chronicle

An idle RPG where the adventurer lives her own life between your check-ins.

She walks the world on her own. You are not her — you're a voice she hears
between chapters. Every few hours you open the game, read what happened while you
were gone, make a judgment call or two, adjust her standing orders, and let her
go again.

If you don't check in, **she decides for herself** — and becomes whoever those
decisions make her.

**▶ Play it: https://ajhollowayvrm.github.io/chronicle-engine/**

## Play

Days pass on the wall clock, not while you watch — a day every 15 minutes by
default, so an afternoon away is a chapter. Come back and the chronicle is
waiting, along with any judgment she couldn't put off. Answer it and it's your
call. Ignore it and it's hers.

The save is a **journal of your decisions**, not a snapshot of her. See
"Why the save is a journal" below — it's the most load-bearing thing in the repo.

## Run the engine directly

```bash
node bin/run.js [seed] [days] [reckless] [sociable] [generous]

node bin/run.js                     # defaults: seed 7, 120 days
node bin/run.js 12 300 20 10 90     # cautious, solitary, generous
node bin/run.js 4 300 95 90 20      # reckless, sociable, grasping
```

Prints the chronicle day by day, then a summary: what she has, who she kept, who
she buried, and how far she has drifted from the person you told her to be.

## Balance it

```bash
node bin/balance.js [seeds] [days] [reckless] [sociable] [generous]

node bin/balance.js 200 200         # 200 seeds, 200 days each
```

Aggregate stats across many seeds. **Tune against this, never a single run.** A
single seed will lie to you — the first version of this engine looked healthy on
seed 7 and turned out to converge to the same end state on every seed.

A healthy sim shows a *wide* gap between p10 and p90. Narrow gaps mean an
attractor: every playthrough is the same story wearing different names.

## Test it

```bash
node --test test/*.test.js
```

The tests guard the invariants, not the balance. Determinism, weight floors,
no negative money, dials staying in bounds, judgments actually expiring, the
cycle carrying the dead forward — and, for the idle layer, that a replayed
journal rebuilds exactly the run you were looking at.

## Play it locally

```bash
npm run serve       # http://localhost:8080
```

ES modules won't load over `file://`, so you need an origin. That's all the
server does.

## The three dials

Standing orders the player sets. They bias the sim in three separate places —
which events fire, how wildly they resolve, and what she chooses when you're
absent.

| Dial | Pulls toward |
|---|---|
| cautious ↔ reckless | danger, fortune, and fatter tails in both directions |
| solitary ↔ sociable | strangers, bonds, and everything that can be lost |
| hoard ↔ give freely | debts owed to her, and the people who remember |

But the slider is a *request*. `state.intent` is what you asked for;
`state.true` is who she actually is. She drifts. Given long enough, she stops
listening. In the UI that's the cold mark under the gold slider handle: the gap
between them is the game.

## Why the save is a journal

The obvious way to save an idle game is `JSON.stringify(state)`. That is not
available here, and the reason is worth knowing before you "fix" it:

`state.pending` holds live judgments, and a judgment's options carry `weight` and
`apply` **functions** — closures over local variables inside `events.js`. The
`stranger` event closes over the generated name; `love` closes over the companion
object itself. JSON cannot represent a closure. Dumping state would silently drop
every pending judgment, which is the exact mechanic the game is built on.

So we persist the **inputs** instead of the output: seed, dials, and every
decision you've made, each stamped with the day you made it. The engine is
deterministic by invariant, so her whole life is a pure function of that list —
we replay it from day 1 on load. The save is ~200 bytes, no function is ever
serialized, and determinism stops being a nice property of the engine and starts
being the thing holding the game up.

## Layout

```
src/events.js     the event table — data, not logic. content grows here.
src/engine.js     seeded RNG, weighted selection, pity timers, drift, judgments, cycles.
src/game.js       the idle layer: journal, deterministic replay, wall-clock days.
web/              the check-in surface. no framework, no build step.
index.html        the game. imports src/ directly as ES modules.
bin/run.js        simulate and print a chronicle.
bin/balance.js    simulate many seeds and print the spread.
bin/serve.js      static server for local play.
test/             invariant guards.
CLAUDE.md         design thesis, invariants, and the current bug list. read this first.
```

Zero dependencies. Zero build step. GitHub Pages serves the repo as-is and the
browser imports the same `src/` files the tests and CLI use.

## Status

The engine runs, the stories diverge, the drift mechanic works, and it is now
actually playable. Still open: coin has no sink, companion churn is high, and
drift is too timid for the reveal to land as hard as it should.

See `CLAUDE.md` for the full list, in priority order.
