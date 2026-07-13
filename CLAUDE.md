# CLAUDE.md

Context for working on this repo. Read this before touching anything.

## What this is

An idle RPG. One adventurer walks a world on her own. The player is not the
adventurer — the player is a voice she hears between chapters. You check in every
few hours, read what happened, make one or two judgment calls, adjust her standing
orders, and let her go again.

The tick engine is still the part that matters and the part that can be wrong in
ways a UI can't fix — but there is now a playable check-in surface on top of it
(`index.html` + `web/`), deployed to GitHub Pages. It is a thin renderer. No game
logic lives there. If you find yourself wanting to put a rule in `web/`, the rule
belongs in `src/`.

## The thesis

Most idle RPGs treat the adventurer as a stat block that moves. This one treats
her as a person things happen to. Three commitments follow from that, and they
are not negotiable without a conversation:

**1. Every narrative event moves a number.** If "she fell in love" is flavor
text, players skim it. A bond is a survival modifier *and* a liability. Story
is not decoration on the numbers; story *is* the numbers.

**2. Unanswered judgments resolve themselves.** If the player doesn't check in,
she decides — weighted by who she has become. This is the load-bearing mechanic.
It gives a real (non-bribed) reason to open the app, it makes her a person rather
than a puppet, and it makes neglect a legitimate playstyle with a legitimate cost.

**3. The dials are intent, not control.** `state.intent` is what the player asks
for. `state.true` is who she actually is. `true` drifts from lived experience and
is pulled back toward `intent` only weakly. Over a long enough cycle she can stop
listening to you. That divergence is the game's best card and must not be
balanced away.

## Architecture

```
src/events.js   the event table. data, not logic. this is where content grows.
src/engine.js   seeded RNG, weighted selection, pity, drift, judgments, cycles.
src/game.js     the idle layer. journal, deterministic replay, wall-clock days.
web/            the check-in surface. renders state, records inputs, nothing else.
index.html      the game. imports src/ directly as ES modules — no build step.
bin/run.js      simulate N days, print the chronicle.
bin/balance.js  run many seeds, report aggregate stats. use this before tuning.
bin/serve.js    static server, because ES modules will not load over file://.
```

The dials touch the simulation in **three separate places**. Keep them separate:

- **Weighting** — `weightsFor()`. Which events are likely to fire at all.
  `weight = base × (1 + Σ(dial_offset × sensitivity))`
- **Resolution** — `vary()`. How an event goes once it fires. Recklessness scales
  *variance*, not mean: same average outcome, fatter tails both directions.
- **Autonomy** — `autoResolve()`. How she chooses when you aren't there.

Collapsing these into one "power" number is the failure mode. Don't.

## Invariants (breaking these breaks the game)

- **Determinism.** Same seed + same inputs = same run, always. The client has to
  be able to recompute an absence offline. Never call `Math.random()`. Everything
  goes through `this.rng`.
- **No weight ever hits zero.** `weightsFor()` floors at 15% of base. If dials can
  delete an event family, players will find the optimal config and the world
  quietly narrows to four repeating events. Dials shift *texture*, never delete
  a genre.
- **`off()` reads `state.true`, never `state.intent`.** The slider is a request.
  Her history is the answer.
- **Pity timers stay.** Raw weighted rolls will happily fire "quiet road" nine
  days running. `recent` suppresses repeats. Without it the chronicle stutters.
- **Clamp anything money-shaped.** `vary()` returns a gaussian and *will* go
  negative in the tails. Every payout and payment needs `Math.max(0, ...)`.
  This shipped as a bug once already ("she paid -26 coin").
- **The save is a journal of inputs, never a dump of state.** `state.pending`
  holds judgments whose options carry `weight`/`apply` **closures** over locals in
  `events.js` (`stranger` closes over the generated name, `love` over the
  companion object). `JSON.stringify(state)` silently drops all of it. So
  `src/game.js` persists only seed + dials + the player's decisions, each stamped
  with its day, and replays from day 1 on load. This is why determinism is not a
  nice-to-have: it is the only reason the game can be saved at all. There is a
  test that asserts JSON really does eat the closures — if it ever starts failing,
  the design is free to change, and not before.

## Known problems (in priority order)

1. **Coin is a dead number.** She ends every run with 1,000+ and nothing to spend
   it on. There is no upgrade layer. This is the biggest missing system, and until
   it exists the fortune events have no stakes.
2. **Companion churn is too high.** 6–9 ghosts per 200 days. Bonds rarely mature,
   so the `love` event is starved. `companion_leaves` needs a longer grace period
   or a harder check against the sociable dial.
3. **Drift works but is timid.** ±2 over 120 days. It should be capable of ±20
   over a long cycle so the reveal actually lands. Tune the nudges in `events.js`
   up, or `applyIntentPull` (currently 0.012) down further — but re-run
   `bin/balance.js` after, because this knob controls the whole feel.

   This is now the most visible problem, because the UI ships the reveal: the
   cold mark under each slider is her `true` value, and `web/app.js` prints the
   "she is beginning to stop listening" line once a dial drifts ≥8 from intent.
   At current tuning that line almost never fires. The game's best card is in the
   UI and the engine isn't dealing it.
4. **`varyPos` can round a windfall down to zero**, and the prose doesn't check.
   The cache event happily writes "found a cache … 0 coin and a child's shoe."
   The clamp keeps it non-negative, which is the invariant, but zero is not a
   windfall. Payout events should floor at something meaningful, or the prose
   should branch on an empty haul.
5. **Fixed prose stutters** over long runs. Do NOT fix this by writing more
   strings. See "the narration layer" below.

## The narration layer (not built yet)

`state.log` is a structured event log — `{day, kind, id, tags, text}`. The `text`
is placeholder prose. The intent is a two-layer design:

- **Simulate mechanically.** Deterministic, cheap, exactly balanceable. That's
  this repo.
- **Narrate on check-in.** One API call to Claude that takes the raw log of the
  absence and writes the chronicle as actual prose.

The caveat that matters: unconstrained LLM prose gets mushy and same-y fast. It
must be fed the *exact* events, held to a fixed voice, and kept short. Done
loosely it's slop. Done tight, it's the reason someone opens the app.

## The cycle

`reincarnate()` is the prestige reset. It drops coin, level, and wounds — but
carries `ghosts`, `debts`, `threads`, `barons`, and her drifted `true` dials into
the next life. That's what turns prestige from a treadmill into a chronicle: the
companion from cycle 3 shows up in cycle 7, older and resentful.

This connects to the wider *Continuity* mythology (eternal human cycle, the
Barons, the Blade Keepers). The mechanic and the mythology are the same thing.
Build outward from this function.

## Working here

- Plain ES modules, zero dependencies, Node 18+. Keep it that way. (This was
  CommonJS, on the grounds that it "has to be portable into a browser bundle
  later." ESM reaches that goal without the bundle: the browser imports `src/`
  directly, so the game, the CLI, and the tests all run the same files and there
  is no build step to go stale. Same constraint, one less moving part.)
- Always use the `.js` extension in imports — the browser will not resolve
  `./events` and there is no resolver in front of it.
- `npm run sim` before you trust a change. `npm run balance` before you tune a
  number. `npm run serve` to actually play it.
- **Always check across multiple seeds.** A single run tells you nothing. The
  first version of this engine looked fine on one seed and turned out to converge
  to an identical end state on every seed — an attractor. That's only visible in
  aggregate.
