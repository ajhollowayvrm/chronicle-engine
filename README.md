# chronicle

An idle RPG where the adventurer lives her own life between your check-ins — in a
world that is different every time.

She walks it on her own. You are not her — you're a voice she hears between
chapters. Every few hours you open the game, read what happened while you were
gone, make a judgment call or two, adjust her standing orders, and let her go
again.

If you don't check in, **she decides for herself** — and becomes whoever those
decisions make her.

Then she dies, and that is all. There is no cycle. The next world is not this one.

**▶ Play it: https://ajhollowayvrm.github.io/chronicle-engine/**

## Every world is its own

There is no canon. `src/events.js` contains **not one proper noun** — it is pure
mechanics. Every name, every place, every god, and every line of prose comes from
a lore pack in `lore/`, and there are twenty of them: a drowned coast of tidal
debt-courts, a frozen steppe paved in bone, a mining republic that cares less what
you owe the company than what you owe the mountain.

Run the same seed in two worlds and she lives the *same life* — same ambush on day
12, same stranger on day 19 — in completely different words, under a power with a
different name. That is enforced by a test, and by `npm run lore`, which fails if
any two worlds share a single line.

The packs are **written by Claude, in Claude Code**. There is no API call anywhere
in this repo and no key anywhere near the browser. To mint more worlds, ask for
them.

## Play

Days pass on the wall clock, not while you watch — a day every 15 minutes by
default, so an afternoon away is a chapter. Come back and the chronicle is
waiting, along with any judgment she couldn't put off. Answer it and it's your
call. Ignore it and it's hers.

The save is a **journal of your decisions**, not a snapshot of her. See "Why the
save is a journal" below — it's the most load-bearing thing in the repo.

## Run the engine directly

```bash
node bin/run.js [seed] [days] [world] [reckless] [sociable] [generous]

node bin/run.js                            # seed 7, 120 days, world picked by seed
node bin/run.js 12 300 world-03 20 10 90   # cautious, solitary, generous
node bin/run.js 12 300 world-14 20 10 90   # the same life, on a whaling coast
```

Prints the chronicle day by day, then a summary: what she has, who she kept, who
she buried, and how far she has drifted from the person you told her to be.

## Balance it

```bash
node bin/balance.js 200 200         # 200 seeds, 200 days, swept across all worlds
```

Balance is a property of the mechanics, not the words — every world runs the same
event table — so this sweeps seeds across every pack and reports one spread.
**Tune against this, never a single run.** A single seed will lie to you: the first
version of this engine looked healthy on seed 7 and converged to the same end state
on every other seed.

A healthy sim shows a *wide* gap between p10 and p90. Narrow gaps mean an
attractor: every playthrough is the same story wearing different names.

## Check the lore

```bash
npm run lore
```

Validates every pack against the slot manifest in `src/lore.js`, rejects any
unknown `{placeholder}`, fails on any line shared between two worlds, and rewrites
`lore/index.json`. Run it after adding an event — every existing pack will be
missing prose for it, and this is how you find out before a player does.

## Test it

```bash
node --test test/*.test.js
```

Determinism, weight floors, no negative money, dials in bounds, judgments
expiring, that a replayed journal rebuilds exactly the run you were looking at,
that she stays dead — and that two worlds running one seed share every mechanic and
zero words.

## Play it locally

```bash
npm run serve       # http://localhost:8080
```

ES modules won't load over `file://`, so you need an origin. That's all it does.

## The three dials

Standing orders the player sets. They bias the sim in three separate places —
which events fire, how wildly they resolve, and what she chooses when you're
absent.

| Dial | Pulls toward |
|---|---|
| cautious ↔ reckless | danger, fortune, and fatter tails in both directions |
| solitary ↔ sociable | strangers, bonds, and everything that can be lost |
| hoard ↔ give freely | debts owed to her, and the people who remember |

But the slider is a *request*. `state.intent` is what you asked for; `state.true`
is who she actually is. She drifts. Given long enough, she stops listening. In the
UI that's the cold mark under the gold slider handle: the gap between them is the
game.

## Why the save is a journal

The obvious way to save an idle game is `JSON.stringify(state)`. That is not
available here, and the reason is worth knowing before you "fix" it:

`state.pending` holds live judgments, and a judgment's options carry `weight` and
`apply` **functions** — closures over local variables inside `events.js`. The
`stranger` event closes over the generated name; `love` closes over the companion
object itself. JSON cannot represent a closure. Dumping state would silently drop
every pending judgment, which is the exact mechanic the game is built on.

So we persist the **inputs** instead of the output: seed, world, dials, and every
decision you've made, each stamped with the day you made it. The engine is
deterministic by invariant, so her whole life is a pure function of that list — we
replay it from day 1 on load. The save is ~250 bytes, no function is ever
serialized, and determinism stops being a nice property of the engine and starts
being the thing holding the game up.

The lore pack is an input too, which is why the journal records it by id and never
regenerates it. If prose were generated live on every load, the day-5 line you read
yesterday would say something different today, and the chronicle would stop being a
chronicle.

## Layout

```
src/events.js     the event table — MECHANICS ONLY. not one proper noun.
src/engine.js     seeded RNG, weighted selection, pity timers, drift, judgments.
src/lore.js       the slot manifest: every line the engine can ask a world for.
src/game.js       the idle layer: journal, deterministic replay, wall-clock days.
lore/             twenty worlds. written by Claude; no API call at runtime.
web/              the check-in surface. no framework, no build step.
index.html        the game. imports src/ directly as ES modules.
bin/run.js        simulate one life and print the chronicle.
bin/balance.js    sweep seeds across every world and print the spread.
bin/lore.js       validate the packs. run this after touching events.js.
bin/serve.js      static server for local play.
test/             invariant guards.
CLAUDE.md         design thesis, invariants, and the current bug list. read first.
```

Zero dependencies. Zero build step. GitHub Pages serves the repo as-is and the
browser imports the same `src/` files the tests and CLI use.

## Status

The engine runs, the stories diverge, the drift mechanic works, the worlds are all
different, and it is playable. Still open: coin has no sink, companion churn is
high, and drift is too timid for the reveal to land as hard as it should.

See `CLAUDE.md` for the full list, in priority order.
