# CLAUDE.md

Context for working on this repo. Read this before touching anything.

## What this is

An idle RPG built on a **seed engine**. One integer in, one whole world out —
countries, gods, factions, languages, a history — and then one woman walks it while
you are not looking.

**The world is the game. She is the lens.**

Two clocks run. The world tick moves the tree whether or not anyone is watching:
factions gain and lose ground, tolls go up, a chapter breaks with its leadership, a
country falls and *becomes an era*. Her tick moves one woman through that. Between
them sits the LENS, and it is the rule the whole design rests on:

> **She only learns what she could plausibly learn.**

The world does not narrate itself at her. If it happens where she is standing, she
sees it. If it happens elsewhere, it takes days to reach her, it arrives secondhand,
and it arrives from somebody who is frightened. Get this wrong and the chronicle
becomes a newsfeed she is not in. (The first version had her "hearing a rumour" that
the tolls had risen in the town she was physically standing in.)

## Architecture

```
gen/node.js        the six rules, as semantics. inheritance, propagation, centers.
gen/tables/*       the roll tables. AUTHORED ONCE BY A MODEL, rolled by code forever.
gen/worldgen.js    the seven passes. worldFromSeed(n) -> a validated world tree.
gen/validate.js    pass 7. bad worlds die cheap, before any detail exists.
gen/hooks.js       pass 6. two-fact collisions, enumerated and code-scored.
src/sim.js         the tick: the world moves, she moves, the lens decides what reached her.
src/game.js        the save. a journal of inputs, replayed from day 1.
bin/world.js       npm run world 7    — mint a world and look at it
bin/run.js         npm run sim 7 200  — play one and read the chronicle

gen/tables/goods.js    SHAPES with holes in them. the world fills the holes.
gen/tables/marks.js    what a life took. the only thing that lowers a stat.
gen/tables/callings.js what they call her. the class system, and she is not shown a menu.
src/kit.js             minting, and the arithmetic of raw vs bare vs effective.
```

## What she is, what she has, what they call her

Three numbers, and confusing them breaks the game:

```
raw    what she has LEARNED.   use() writes it, and only ever upward. never falls.
bare   raw + her marks.        THE WOMAN — what is left of what she learned.
eff    bare + kit + calling.   what she can actually do today. everything reads this.
```

A **mark** is what a life took, and it is the only downward pressure in the game — but it
never touches the raw number. Her Hand is still fourteen; the hand is ruined. She knows
exactly what to do and cannot do it. That is the same two points as `−2 Hand` and a
completely different sentence, and the difference is the whole game.

Marks are also **where the player's answers land**. Before them, you told her to settle it,
a friction number moved, and it had cooled off by the spring. Now she is a woman who
settles it, in every room, for the rest of her life. `kept_it` is the most common mark in
the game: the deepest marks on her are the ones you put there.

An **item** is rolled out of the tree — the seam under the town, a seal from a faction that
actually operates here, and a relic is one of THIS world's magics charging the price the
seed already wrote for it. Its stat gate is a **demand, not a lock**: she can pick anything
up, and under the ask the thing uses her — worse swing, more wounds, and she says so.

A **calling** is a name the world starts using for her, offered only when her stats and her
ledger already support it, and she asks YOU whether to answer to it. It is a `pending`
judgment like any other, so it routes through `answer()`, so it is a journal input, so the
save needed no changes at all.

## Invariants (breaking these breaks the game)

- **No LLM runs at generation time. Ever.** A model wrote `gen/tables/*` once; code
  rolls against them forever. This is what makes the seed a real seed — same seed,
  same world, on any machine, offline, with no key in the repo. If you find yourself
  adding an API call to make the prose better, you have deleted the seed.
- **Determinism.** Same seed + same inputs = same run. `worldFromSeed()` rebuilds the
  tree; every roll goes through `this.rng`. Never `Math.random()`. The save is a
  journal of *inputs* replayed from day one, so this is not a nice-to-have — it is the
  only reason the game can be saved at all.
- **The tree is the data.** No registry, no ids, no pointers. Where a thing appears
  IS its reach (`reachOf`). A faction written into three countries operates in exactly
  those three. Cross-kind links are a plain name said again (`created_by`).
- **Blank means inherit — but blindness protects FACTS, not names.** Sibling places
  roll on independent RNG streams so they cannot *average* into a committee-designed
  set (the tidy one, the desert one, the evil one). Names are the exception: they come
  from a global registry. Letting blindness cover names produced two figures with the
  same name both carrying `in_person` — two centers for one name, a straight Rule 4
  violation, in ~5% of worlds.
- **Forced scarcity, enforced by the validator.** Every magic type names a cost. Every
  economy names who pays for it. Every divergence has a why. These are validation
  rules, not style advice: a model required to answer "what does this cost?" cannot
  write "an ancient and mysterious power."
- **A hook never invents.** It is two facts *already in the tree* colliding, and it
  must cite both. That is the anti-drift mechanism, and it is why `gen/hooks.js` may
  only say what a collision *implies* — never a new fact.
- **Unanswered judgments resolve themselves**, weighted by who she has become. This is
  load-bearing: it gives a real reason to check in, it makes her a person rather than a
  puppet, and it makes neglect a legitimate playstyle with a legitimate cost.
- **A suggestion is not an order.** The player can say where they would rather she
  went. `heeds()` weighs it, and decays as her `true` dials drift from your `intent`.
  The moment the player can move her directly, the game's central claim is gone.
- **A skill she has learned is never taken away — only the use of it.** Marks move the
  EFFECTIVE stat and never the raw one. The day something in this repo decrements
  `state.stat.hand`, the game has become a levelling curve with a bad mood.
- **The demand is measured against the woman, not against her kit.** `usable()` and
  `qualifies()` both read `bare` — raw plus marks, nothing she is holding. Read `eff`
  instead and a sword hands her the arm to swing it with, and a good knife makes her the
  Knife, and both gates evaporate.
- **She is never shown a menu of nine things she is not.** `qualifies()` gates every
  calling on her stats AND her ledger, so the only name she is ever offered is one her life
  already supports. That is what "the class must fit her stats" means when it is enforced
  rather than advised. And she asks you — the player never picks it.
- **A calling cannot conjure an act whose precondition is absent.** A weight of zero in
  `herTick` is not "unlikely", it is IMPOSSIBLE — no enemies in this town, no market on
  this mountain. Lift one off zero and `do()` goes looking for an enemy in an empty list.

## Known problems (in priority order)

1. ~~**`web/` is dead.**~~ **It is not, and this entry was stale for three commits.** The
   UI imports `src/game.js`, `src/bonds.js` and the tables, all of which exist; it survived
   the seed-engine rebuild and runs. Verified in a real browser. It now renders her kit,
   her marks and the name she answers to, and the stat sheet shows the gap — a pale bar for
   everything she has LEARNED, a solid one for how much of it she can still REACH. That gap
   is the character, and it is the one thing on that page not to remove.
2. **Code-scored hooks are hit-and-miss.** Roughly half land. Code can tell you two
   facts share a tag; it cannot tell you they make a *story*. `doom` is doing too much
   work as a tag, and some `says` lines presume a tech advantage that isn't there. The
   fix is narrower tags and less presumptuous collision text — it will never be as good
   as a model picking from four candidates, and that was the price of the seed
   reproducing.
3. **The chronicle table is thin.** ~120 lines shared across every world that will ever
   exist. It holds up for 200 days; a 400-day life repeats. Grow `gen/tables/chronicle.js`.
4. **Figures barely act.** They have `wants` and the world tick nudges them, but two
   figures in one place with overlapping wants — the spec's best free idea — is not
   implemented.

## Working here

- Plain ES modules, **zero dependencies**, Node 18+. Keep it that way.
- Always use the `.js` extension in imports — the browser resolves nothing for you.
- `npm run world 7` before you trust a generator change. `npm run sim 7 200` before you
  trust a sim change. `npm test` pins the invariants above.
- The old design hand-wrote 391 prose lines *per world*, which is why it only ever had
  one world. If you catch yourself writing per-world prose, you are rebuilding the thing
  this replaced.
