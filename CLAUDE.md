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

gen/tables/beasts.js   what she fights. there are no dragons in it, and that is the point.
gen/tables/blessings.js what YOU can do to her, and the three things that bind it.
src/beasts.js          the bestiary, derived from the tree. never touches sim.rng.
sw.js                  offline, and the only route she has to your lock screen.
web/reach.js           asking your phone whether she may wake it.
server/foresee.js      WHEN will she next need you. the whole backend rests on this.
server/push.js         Web Push (VAPID + RFC-8291) on node:crypto alone. no dependencies.
server/api.js          subscribe / sync / unsubscribe. a Lambda Function URL.
server/wake.js         a cron, every five minutes: is anybody's alarm due?
infra/template.yaml    SAM. one table, two Lambdas. free tier, and it stays there.
```

## What she hunts, and what you can do about it

**A beast is rolled out of the tree, exactly like an item.** There is no dragon in
`gen/tables/beasts.js` and there never will be: a stock bestiary would be monsters dropped
into a world with no reason to contain them, and the seed engine would stop paying for
itself. A country that burns godash — refined divine remains — to run its trains gets a
thing that came back up out of the refinery. The horror is not that there is a monster. It
is that the monster is downstream of something the player already read in the economy.

Every world has exactly **one great beast**: its largest fact, standing up. It does not
scale to her and it does not wait. She finds out about it the way anybody finds out about
anything — a posting, a raised price, the names of the four before her — and then she stands
outside it and asks you whether to go in. About **9% of lives kill it**.

**A blessing is the only thing you do TO her rather than ask OF her**, and it is bound by
three things that must never come loose:

- **She has to believe you are there.** It lands on Faith. A woman who has stopped believing
  anything is listening has no surface for it to land on — not "reduced", *nothing*. Neglect
  no longer merely costs you a judgment. It takes your hands away.
- **It makes her loud.** `attention` is what eventually sends men to the inn she is sleeping
  in. Every gift is a light switched on over her head in a country where something is looking
  for exactly that.
- **You cannot be a constant miracle.** 25 days between blessings, or she stops being a woman
  walking a hard country and becomes a character you are buffing.

And the first one is PROOF. Until then she believed in you the way people believe in things:
on nothing, out of need, with a great deal of doubt. Her Faith goes up because you were real,
and she is frightened, because you were real.

Her blessings live in the same list as her scars, because that is what they are.

## How she reaches you

**The server never simulates her. It foresees her.** This is the whole reason the
notification layer is nearly free, and it falls straight out of determinism: given
`(seed, dials, your answers)`, `foresee()` replays her and keeps ticking until she next
turns round and asks something — then writes down the exact minute and goes back to sleep.
Nothing runs in between. No live world, no per-player process, no polling. When you answer
her, her future is a different future, so the client re-syncs and we foresee her again.

**And she does not always tell you.** The knock is gated on Faith, exactly as `maybeSpeak()`
gates her voice. A woman who still believes in you tells you when she needs you. One who has
stopped believing anybody is listening mostly does not bother — and **at Faith 0 she never
does**, and your phone simply goes quiet, and the only way to find out what became of her is
to open the app and look. A silent phone is not a broken feature. It is the game.

- **iOS: push does not exist in a Safari tab.** Not disabled — *absent*. She has to be added
  to the Home Screen. `web/reach.js` detects this and says so rather than offering a button
  that cannot work.
- **Every push MUST show a notification.** iOS silently revokes a subscription that receives
  a push and shows nothing, and a silent revocation means she just stops being able to reach
  you and nobody ever finds out why.
- **A push loop must survive a bad row.** One subscription with an unusable key threw inside
  the cron and killed the whole run — every *other* person's notifications would have stopped
  from that moment on. Caught by a smoke test with a deliberately malformed key. Never let a
  single vigil take down the sweep.
- `infra/.vapid` is **gitignored** and minted once. Regenerating it silently breaks every
  phone that already has her installed.

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
