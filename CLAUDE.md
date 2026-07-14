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
- **The engine knows no proper nouns.** Not one. `src/events.js` and
  `src/engine.js` must never contain a name, a place, a power, or a line of prose;
  it all comes from the lore pack via `c.line()`. A test asserts that two worlds
  running the same seed produce identical *mechanics* and zero shared *words*. The
  moment the engine hard-codes a noun, every world is stuck with it forever.
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

1. **Companion churn is too high.** 6–9 ghosts per 200 days. Bonds rarely mature,
   so the `love` event is starved. `companion_leaves` needs a longer grace period
   or a harder check against the sociable dial.
2. **Drift works but is timid.** ±2 over 120 days. It should be capable of ±20
   over a long cycle so the reveal actually lands. Tune the nudges in `events.js`
   up, or `applyIntentPull` (currently 0.012) down further — but re-run
   `bin/balance.js` after, because this knob controls the whole feel.

   This is now the most visible problem, because the UI ships the reveal: the
   cold mark under each slider is her `true` value, and `web/app.js` prints the
   "she is beginning to stop listening" line once a dial drifts ≥8 from intent.
   At current tuning that line almost never fires. The game's best card is in the
   UI and the engine isn't dealing it. It now also governs `heeds()` — how much of
   the player's *suggestion* she takes — so tuning it up pays off twice.
3. **`web/` does not yet surface the world model.** The engine has regions,
   factions, schools and skills; the check-in screen shows none of them. There is
   no way to see where she is, who is sheltering or hunting her, what she has
   learned, or to make a suggestion — which means the one lever the player has
   over the map is currently unreachable from the game. This is the biggest gap.

### Fixed, and worth not re-breaking

- **Coin was a dead number** — she ended every run with 1,000+ and nothing to buy.
  The schools are the sink (see below). Median coin at death went 1,995 → 1,140,
  and she trains in ~79% of lives. If you add a new source of coin, check
  `bin/balance.js` again: the fortune events only have stakes because the money
  has somewhere to go.
- **Prose stuttered within a world** — a slot had 3–5 variants and a 300-day life
  showed you all of them five to seven times. Slot targets are now *measured*
  (p90 of that slot's real fire count across the dial space) and enforced by
  `npm run lore`. A 170-day life now repeats about three lines.
- **Four slots could never fire.** `ambush` and `beast` branched on `vary(0, 1)`,
  and `vary` multiplies its mean — so a mean of zero was always exactly zero. She
  never won an ambush outright, was never ruined by one, and was never mauled, in
  any life, at any dial setting. Use `swing()` for an outcome roll. There is a
  test (`every slot the manifest declares can actually happen`) that will fail if
  this class of bug ever comes back — extend it, don't delete it.

## The lore layer

`src/events.js` contains **no proper nouns and no prose**. It is mechanics only.
Every word the player reads comes from a lore pack in `lore/`, reached through
`c.line(slot, vars)`. `src/lore.js` holds `SLOTS` — the manifest of every line the
engine can ever ask for, what placeholders it may use, and what has just happened
mechanically. That manifest is the contract:

- **Add an event to `events.js` → add its slots to `SLOTS`.** Otherwise every
  existing pack is silently missing prose for it, and a player hits
  `[missing lore: your_event]` on day 40. `npm run lore` catches this.
- **The packs are written by Claude, in Claude Code. There is no API call in this
  repo and no key anywhere near the browser.** To mint more worlds, ask: "add N
  lore packs". The generator reads `SLOTS`, writes `lore/world-NN.json`, and
  `npm run lore` validates and rewrites `lore/index.json`.
- **No two worlds may share a line.** `npm run lore` fails on it. This is not
  fussiness: packs get written from an exemplar, and the failure mode is that
  whoever writes world-09 reads world-01, likes its best line, and keeps it. The
  *memorable* lines are exactly the ones that get copied, so the damage is
  invisible until two players compare notes. It happened on the first pass — 55
  borrowed lines across 17 packs, the love-judgment result in 16 of them.

The pack is chosen once, recorded in the journal by id, and never regenerated —
same reason the save is a journal of inputs. If prose were generated live on each
load, the day-5 line you read yesterday would say something different today, and
the chronicle would stop being a chronicle.

## The world model: regions, factions, schools

A world is not a bag of place-names. The rule that keeps this from violating "the
engine knows no proper nouns" is that **the engine owns the structures and the
pack owns every word**.

**Regions** (≥3). Each has a pool of places, weight multipliers per event *tag*,
and a wealth scalar on what she can earn there. She stands in exactly one, and
`{place}` only ever draws from that one — which is what silently re-colours all
391 world lines as she moves, with no per-region rewrite of the pack.

The corollary is a trap worth knowing: **the world pool must stay terrain-neutral.**
A line that says "out of the canal shade" will follow her into a salt flat. Lines
that name the ground belong to `region.lines`, which the engine appends to the
world pool for whichever region she is standing in. 28 lines had to be relocated
after the first pass, and the tell was "ambushed out of the canal shade" forty
miles into a desert.

**Factions** (≥2). Each has `wants`: an event id → standing delta. That is the
entire mechanism, and it is deliberate — she is scored on **what she actually did
while someone was watching**, never on a stated allegiance. Cross +9 and they offer
her a place (a judgment, with their rivals as the price); +6 and they shelter her;
−8 and they hunt her. Keep them in a *triangle*, not a line, or there is a safe
alignment and no politics. Deltas are fractional on purpose: at whole numbers the
high-frequency ambient events (`cache`, `work`) swamped the actual moral stances
and she ended up friends with everyone.

**Schools** (≥1 per skill). The coin sink. The engine knows exactly four things a
woman can be taught — `blade`, `mend`, `scavenge`, `road` — and the pack decides
who teaches them, where, and for how much. Cost escalates per level, so a mastery
is a fortune. A school is sited in a region, so she has to *get there*, which is
what makes the player's suggestion worth making.

**Suggestions, not orders.** `state.suggested` is a region the player would like
her to head for. `chooseDestination()` weights it by `heeds()`, which decays as
her `true` dials drift from the player's `intent`. So a woman who has stopped
listening to you about who to be also stops listening about where to go. Do not
turn this into a command — the moment the player can move her directly, the game's
central claim is gone.

## There is no cycle

She dies once. `reincarnate()` is gone, `state.cycle` is gone, and nothing carries
forward — not the dead, not the debts, not her drifted dials. When she dies the
player starts a **different world**: new pack, new seed, new woman, no through-line
of any kind. The only thing that survives is a list of names in `localStorage`,
which is the player's memory, not hers.

This replaced an earlier *Continuity* mythology (an eternal cycle, the Barons, the
Blade Keepers) that was wired into the mechanics. It is fully retired. The engine
now keeps a **nameless** watching power (`state.watch.attention`) and each pack
names it — the Tally, the Ember Court, the Thirst. Do not reintroduce canon into
`src/`: the moment the engine knows a proper noun, every world has to share it.

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
