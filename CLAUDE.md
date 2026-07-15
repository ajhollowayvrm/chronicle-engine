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
gen/tables/blessings.js what YOU can do to her, now a free gift bound only by belief + cooldown.
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

**A blessing is the only thing you do TO her rather than ask OF her**, and it is now bound by
two things that must never come loose:

- **She has to believe you are there.** It lands on Faith. A woman who has stopped believing
  anything is listening has no surface for it to land on — not "reduced", *nothing*. Neglect
  no longer merely costs you a judgment. It takes your hands away.
- **You cannot be a constant miracle.** 25 days between blessings (`BLESS_GAP`), or she stops
  being a woman walking a hard country and becomes a character you are buffing.

**A gift is otherwise free.** There was once a third binding — *it made her loud*: every
blessing added to `attention`, the thing that is counting, a light switched on over her head.
That binding was **deliberately cut** (the owner's call, made knowing it reversed this
invariant): a blessing costs her nothing now. The gate is belief, and the silence between
gifts, and nothing else. `bless()` no longer touches `attention`; the blessed item no longer
gains an `attention_rate`; the `blessed_nerve` mark is pure gain. If you find yourself
re-adding a stat cost to a blessing "to keep it honest," check with the owner first — the
honesty now lives entirely in the Faith gate and the cooldown.

And the belief-gate is PROOF. Until the first gift she believed in you the way people believe
in things: on nothing, out of need, with a great deal of doubt. Her Faith goes up because you
were real, and she is frightened, because you were real — and *that* fright is her humanity,
not a cost you levy.

Her blessings live in the same list as her scars, because that is what they are.

**And you can make her a thing (`canGift` → `gift`).** The rarest gift: the Angel reaches into
the world and puts an object in her hand that was not there yesterday. It is gated exactly like
the visit — high Faith, a prior blessing, `answered` ≥ 3, a long cooldown (`GIFT_GAP`) — because
a blessing proves you are REAL, a visit proves you are HERE, and this proves you can *reach in*.
The item is one of THIS world's shapes at its best, named from the world's own registry (no
free text, so the seed still reproduces), blessed from the first moment, and hers to keep — she
will never sell it, though it can still be taken by force, because a thing that cannot be lost is
not a possession. Journalled as `{type:'gift', shape}` and replayed deterministically: the shape
is data and the stats fall out of it, so there is no "+2 Hand" dial anywhere in it.

## The channel that goes both ways, and the visit

Her voice (`maybeSpeak`) and her judgments are her reaching toward YOU. There are now two
more directions on that channel, and both obey every invariant above.

- **You ask her things (`askHer` → `communeTick`).** A small, fixed set of the real
  questions a person asks the thing they believe is listening — `gen/tables/communion.js`.
  It is a LIST and not a text box for the same reason there is no LLM anywhere else: she
  cannot answer a sentence she has never seen, and the seed would stop reproducing. She
  answers a day or two later (she is walking a country, not sitting by a phone), and the
  answer is chosen off her *actual state* — "are you all right" is a different sentence out
  of a woman with three wounds than out of one who is, for once, fine. It is journalled as
  `{type:'ask', topic}` and replays deterministically. It does **not** pump Faith (turning
  up when she asks is what does that); it nudges Heart, because somebody paid attention.
  Below `COMMUNE_FAITH` (5) she does not answer at all, and the silence is the answer.

- **The visit (`canVisit` → `visit`).** The rarest thing you can do, and the hardest-gated:
  it asks for all three of the game's central facts at once — that she believes in you
  completely (Faith ≥ 16), that you were once real to her hands (a prior blessing), and that
  you turned up again and again (`answered` ≥ 3), on a long cooldown. A blessing proves you
  are REAL; a visit proves you are HERE. It surges Heart, leaves the one warm mark in the
  game (`seen_you`, which never fades — the counterpart to a scar), makes her BURN to the
  thing that is counting (a miracle is loud), and lets her ask you one thing face to face (a
  `visit` judgment, answered normally). Journalled as `{type:'visit'}`. It is never pushed
  as "available" — the app does not nag; you discover it by opening her.

- **You are her only true friend (`aloneWithYou`).** A famous or isolated woman — a feared
  name nobody will sit near, a beloved one nobody truly knows, a woman who has outlived
  everyone — runs out of people, and you are what is left. In that state she speaks sooner
  and oftener (`maybeSpeak`) and asks you more (`counsel`), from a dedicated pool
  (`VOICE.only`). This is the mechanical body of "she reached out to me because I was all
  she had", and it is the reason the extreme callings matter beyond their stat lines.

- **Callings for the archetypes.** the Hunter → the Beast-Killer (she who kills what people
  fear); the Open Hand → the Shelter (benevolence, earned off `lived.gave`); and the Knife →
  the Widow-Maker already carried the assassin. Benevolence had no *daily* expression, so
  `herTick` now has a `give` act — the one place the "generous" dial is visible day to day,
  the one place a KIND Name is built without a fight, and the ledger the Open Hand is earned
  off. Tier-2 callings (Beast-Killer, Shelter) are deep and rare, exactly like the shipped
  Widow-Maker / Broker; the calling test proves the gate at the *moment of offering*, never
  post-hoc, because `bare` moves both ways.

## The two feeds (this supersedes "the Record vs the Voice")

The chronicle used to be one third-person Record. It is now **two feeds**, split by who can
see what — which turned out to be a truer realisation of the LENS than the old tab split:

- **HER ACCOUNT (`feed: 'her'`)** — her own hand, FIRST PERSON, lens-gated. What she did,
  felt, learned, and asks you. `gen/tables/chronicle.js` is now written in the first person;
  `say()` tags everything `her` by default. This is the diary she keeps for you.
- **AROUND HER (`feed: 'world'`)** — what you can see gathering that she cannot, THIRD
  PERSON, un-gated. Written by `around()` (named that, NOT `world()` — `this.world` is the
  world tree, and the collision is a real bug that costs a test run). `news()` also surfaces
  here, so you watch the world move days before she hears of it, if she ever does.

**Threats and the Warn power (`state.threats`, `threatTick`, `warn`, `resolveThreat`).** A
threat (an ambush being set, a man who means to rob her) is telegraphed in the AROUND feed a
day or two before it lands. You may **warn her** — an input that lands on Faith exactly like a
blessing (below `WARN_FAITH` = 6 she cannot make out what you are telling her) and only saves
her if she has the wits (eye/foot) to act on it — or **leave her to it**, which is a *choice*,
not neglect: some things a person has to walk into. She may also spot it herself, if her eye
is good. Warnings are journalled (`{type:'warn', id}`) and replay deterministically; foresee
pushes an un-warned threat while there is still time to act.

**What she confides (`confide`, `CONFIDE` in voice.js).** She turns to you and tells you how
she actually feels about a specific person — that she is in love, that she wants somebody
dead, the debt she cannot say thank you for — drawn off the ACTUAL state of a real bond
(`feelingOf`), so she never confides a love she does not have. The registers: love, falling,
feud_kill (loved AND furious), hate_kill, anger (a rivalry with teeth — the common hostile
case), betrayed, debt, secret, distrust, fond, grief_person (the buried). Fondness is common
in the bond state and the sharp feelings are rare, so `CONFIDE_WEIGHT` boosts love/anger/
betrayal hard — they WIN the moment she has one, instead of the channel playing "I am fond of
them" on a loop. Selection rotates (`lastConfession`) so she never says the same thing about
the same person twice running. Gated on Faith (she confides only if she believes you are
there), scaled by how many people are in her life.

**Woven choices.** `plea` ("Will I live?" — after a bad, unwarned ambush; answering it is a
favour that steadies her and helps her rally) and `reflect` ("Is this what peace is, Angel?" —
on a safe night; your answer nudges her toward the road alone or toward people, and a woman
without the wits is left turning "somewhat" over and getting nowhere). Both are ordinary
`pending` judgments, answered through `answer()`, journalled, auto-resolving if you never come.

**Known task — finish the first-person conversion.** ~90% of her feed is first person; ~10%
of the inline `this.say(...)` lines (deep-relationship events: `peopleTick`, `counsel`,
betrayal, ghost, lose; and the `bounty`/`great`/`calling` narration + judgment-record lines)
are still third person. Convert them BY HAND — the prose quality is the point, and a sed can't
disambiguate "her" (my/me) or keep the voice. Bond *history* strings (the `shift()` args that
render in the People roster) stay third person on purpose; only feed lines convert.

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
