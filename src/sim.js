// THE SIMULATION.
//
// The world is the game. She is the lens.
//
// Two clocks run every day. The WORLD tick moves the tree — factions gain and lose
// ground, tolls go up, a chapter schisms, a country falls and becomes an `era`. It
// does this whether or not she is there, whether or not anyone is watching. Then HER
// tick moves one woman through that world.
//
// Between them sits the LENS, which is the rule that keeps this from becoming a
// newsfeed she is not in: SHE ONLY LEARNS WHAT SHE COULD PLAUSIBLY LEARN. The world
// does not narrate itself at her. She finds out — standing somewhere, late, from
// somebody who is frightened, and usually after the price of bread has already told
// her most of it.
//
// Determinism is absolute: worldFromSeed(seed) rebuilds the tree, and every roll goes
// through this.rng. Same seed + same decisions = same run, forever. That is what lets
// the client recompute an absence offline, and it is the only reason the game can be
// saved at all.

import { worldFromSeed } from '../gen/worldgen.js';
import { walk, resolve, effective } from '../gen/node.js';
import { CHRONICLE } from '../gen/tables/chronicle.js';
import { applyPatch } from '../gen/patch.js';
import { newBond, kindOf, describe, shift, cool } from './bonds.js';
import { webOf, tangledWith, sideEffects, vendetta } from './web-of.js';
import { VOICE, speaksTo, CONFIDE } from '../gen/tables/voice.js';
import { TRAITS } from '../gen/tables/traits.js';
import { STATS, STAT_MAX, SKILLS, CONDITIONS, toNext, SHE_NOTICED, HEART, FAITH } from '../gen/tables/stats.js';
import { SHAPES, OF_KIT, FROM } from '../gen/tables/goods.js';
import { MARKS } from '../gen/tables/marks.js';
import { CALLINGS, CALLING_KEYS, qualifies } from '../gen/tables/callings.js';
import {
  mint, bare, eff, usable, underAsk, unsworn, wielded,
  kitBonus, callingBonus, straining, best, worst,
} from './kit.js';
import { bestiary } from './beasts.js';
import { GREAT, POSTED, TOOK, REFUSED } from '../gen/tables/beasts.js';
import { BLESSINGS, FIRST, UNFELT, GIFT } from '../gen/tables/blessings.js';
import { QUESTIONS, COMMUNE_FAITH, VISIT } from '../gen/tables/communion.js';

// YOU CANNOT BE A CONSTANT MIRACLE. A long silence between blessings, or she stops being a
// woman walking a hard country and becomes a character you are buffing.
const BLESS_GAP = 25;

// THE VISIT IS RARER THAN THE MIRACLE, AND IT ASKS FOR MORE. She has to believe in you
// completely, you have to have been real to her once (a blessing), and you have to have
// turned up over and over (answered her). And even then, only now and then — a face in the
// room every few days would stop being a visitation and start being a housemate.
const VISIT_FAITH = 16;   // near the top of the scale: she trusts you more than herself
const VISIT_GAP = 55;     // longer than two blessings put together
const VISIT_ANSWERED = 3; // you have actually turned up, more than once

// THE GIFT IS RAREST OF ALL. A blessing proves you are REAL; a visit proves you are HERE;
// making a thing appear in her hand proves you can REACH IN. So it asks for exactly what the
// visit asks — deep belief, a prior blessing, a record of turning up — on a silence longer
// than any other, because a world where objects keep materialising is a world with no weight.
const GIFT_FAITH = 16;
const GIFT_GAP = 60;      // longer than the visit: matter does not come cheap
const GIFT_ANSWERED = 3;

// A WARNING LANDS ON FAITH, exactly like a blessing. You can see the thing closing on her;
// whether she can make out what you are trying to tell her depends on whether she still
// believes there is anyone there to tell it. Below this she does not feel the warning.
const WARN_FAITH = 6;
const THREAT_GAP = 8;     // the world does not set a fresh trap for her every other day

// WHAT SHE CONFIDES, WEIGHTED FOR VARIETY. Fondness is common in the bond state and the
// sharp feelings are rare — so left to raw charge she would only ever tell you she is fond of
// somebody. These multipliers make love, hatred and betrayal WIN the moment she actually has
// one, so the range you asked for shows up instead of a single note played over and over.
const CONFIDE_WEIGHT = {
  betrayed: 4, feud_kill: 3.5, hate_kill: 3.5, love: 3, anger: 3, secret: 2.6, debt: 2.6,
  falling: 2.2, distrust: 2, grief_person: 2, fond: 1,
};

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// Places she can actually STAND in. Not a planet, not a continent — those are scopes,
// not ground. The place tree is the expansion tree; these are its playable nodes.
const STANDABLE = new Set(['country', 'region', 'city', 'town']);

export class Sim {
  constructor({ seed = 1, dials = {}, name, patches = [] } = {}) {
    this.seed = seed >>> 0;
    this.rng = mulberry32(this.seed ^ 0x5eed);
    this.world = worldFromSeed(this.seed);

    // GROWTH. A patch is an INPUT, not a generation — authored once by a model that
    // read her chronicle, then frozen. Applying it here (before day 1) means replay
    // reproduces the grown world exactly, and nothing is ever called again.
    //
    // The grown chronicle lines are merged for THIS RUN ONLY. They must never leak
    // into the shared CHRONICLE table: they are about HER life, in HER world, and a
    // line about the water roll at Struck Ford has no business turning up in somebody
    // else's frozen steppe.
    this.lines = CHRONICLE;
    for (const patch of patches) {
      const { lines, problems } = applyPatch(this.world, patch);
      if (problems.length) throw new Error(`growth patch rejected: ${problems.join(' · ')}`);
      if (Object.keys(lines).length) {
        this.lines = { ...this.lines };
        for (const [pool, extra] of Object.entries(lines)) {
          this.lines[pool] = [...(this.lines[pool] ?? []), ...extra];
        }
      }
    }

    // Everyone in this world already knows somebody. They had all of it before she got
    // here and they will have it after she is dead. She is one more person walking into
    // a room where everybody else has history.
    this.web = webOf(this.world);

    // every standable place, with the ancestor chain that gives it its law
    this.sites = [...walk(this.world)]
      .filter(({ node: n, path }) => n.kind === 'place' && STANDABLE.has(n.scale) && !path.some((p) => p.kind === 'era'))
      .map(({ node: n, path }, i) => ({ i, node: n, path }));

    // WHAT IS OUT THERE. Derived from the tree, never rolled against `this.rng` — a beast is
    // a fact this world already contains, stood up and given a body. Which beast is where is
    // therefore a property of the WORLD and not of her life, and looking at it cannot change
    // what happens to her.
    const { beasts, great } = bestiary(this.world, this.sites, this.seed);
    this.beasts = beasts;
    this.great = great;

    const her = this.pickHeroine(name);

    this.state = {
      day: 1,
      alive: true,
      name: her,
      coin: 40,
      wounds: 0,
      at: Math.floor(this.rng() * this.sites.length),

      intent: { reckless: 50, sociable: 50, generous: 50, ...dials },
      true: { reckless: 50, sociable: 50, generous: 50, ...dials },

      standing: {},        // faction NAME -> -20..20. the same name, judged everywhere.
      allegiance: null,
      attention: 0,        // the watching power notices

      suggested: null,     // a place the player would rather she went. not an order.
      seen: [],            // sites she has stood in

      news: [],            // world events that have HAPPENED but not yet reached her
      pending: [],         // hooks awaiting the player
      log: [],
      eras: 0,             // eras the world has written since she started walking

      // WHAT SHE IS, MEASURED. Rolled at birth — so the woman the seed hands you is a
      // particular person before she has done anything — and then moved by USE, and only
      // by use. She gets better at what she actually does and at nothing else.
      stat: {
        // SKILLS — rolled low, grown by use, never lost
        body: this.int(3, 7), hand: this.int(3, 7), foot: this.int(3, 7),
        eye: this.int(3, 7), tongue: this.int(3, 7), nerve: this.int(3, 7),
        name: this.int(1, 3),          // nobody has heard of her yet. that is the safest thing she owns.

        // CONDITION — how much of her is left. These go DOWN, and they are the only
        // numbers in this game that hurt.
        heart: this.int(11, 15),       // she starts open. the world has not got to her yet.
        faith: 10,                     // she knows something is there. she is not sure it helps.
      },
      practice: { body: 0, hand: 0, foot: 0, eye: 0, tongue: 0, nerve: 0, name: 0 },

      // THE LEDGER. Everything she has actually done. Traits are earned off this and
      // nothing else — she cannot buy what she has not lived.
      lived: {
        hurt_badly: 0, travelled: 0, worked: 0, defied: 0, paid: 0,
        buried: 0, nights_alone: 0, with_someone: 0, fights: 0, found: 0,
        hunted: 0, slain: 0,
        // WHAT SHE HAS GIVEN AWAY. Not coin spent — coin given, mercy extended, a thing put
        // into somebody else's hands. It is the ledger the Open Hand is earned off, the same
        // way `slain` earns the Hunter: you cannot be called kind if you have not been.
        gave: 0,
      },

      // WHAT SHE HUNTS. A bounty is a fact about this world with a price on it, and somebody
      // is paying — which is the same question the engine asks about everything else.
      bounty: null,          // the one she has taken. she goes toward it.
      slain: [],             // by name. the dead do not come back, and neither does the coin.
      knowsGreat: false,     // she has read the posting, and the names of the ones before her
      greatSlain: false,     // almost nobody gets to write this down
      traits: [],          // what she has become. she cannot choose these. neither can you.

      // WHAT SHE CARRIES. Not a build. A blade she bought, a coat somebody dead put on
      // her, a writ that is worthless one country over. All of it can be lost, and that
      // is the only reason any of it means anything.
      kit: [],

      // WHAT IT LEFT ON HER. Marks move the EFFECTIVE stat and never the raw one: she
      // keeps everything she ever learned, and a ruined hand cannot use it.
      marks: [],

      // WHAT THEY CALL HER. She does not pick this off a menu — the world starts saying
      // it, and she asks you whether to answer to it.
      calling: null,
      called: [],          // every name she was ever offered, and what she did about it

      // EVERY PERSON SHE HAS DEALT WITH, and what is between them. Not a friends list —
      // a bond has closeness AND friction AND trust, independently, because you can love
      // somebody and be furious with them, and a single number cannot say that.
      bonds: {},           // name -> bond, for people she has actually MET
      // What people who have NEVER MET HER already think. Her name gets to a room before
      // she does — and if she has been drinking with a man's rival, he has made his mind
      // up about her and she has not said a word yet.
      predisposed: {},     // name -> friction they will start with
      ghosts: [],

      // SHE KNOWS YOU ARE THERE. This is how often she says anything about it, and it
      // decays with heeds() — a woman who has stopped listening stops talking.
      spoken: 0,
      lastSpoke: 0,

      // THE CHANNEL THAT GOES BOTH WAYS. `youAsked` holds a question YOU put to her that she
      // has not answered yet — she is walking a country, not sitting by a phone, so it takes
      // her a day or two to turn round and answer it. `answered`/`reached` are the tally of
      // how much you have actually turned up: they are two of the three things a visit asks
      // for, and they are the honest measure of whether you are her angel or her app.
      youAsked: null,      // { topic, on } — a question of yours she owes an answer to
      answered: 0,         // judgments of hers you have come and answered
      reached: 0,          // questions you have put to her
      lastReached: 0,
      visits: 0,           // times you have stood in front of her, in the flesh
      lastVisited: undefined,

      // THE SECOND FEED. Things closing on her that she has not yet seen and you have — a man
      // who watched her pay, an ambush being set on the road out. You may warn her, or leave
      // her to it. These live here until they land; the WORLD feed narrates them building.
      threats: [],
      lastThreat: -99,
      lastReflect: -99,
      lastConfide: -99,   // when she last told you how she feels about a specific person
      lastConfession: null,   // {who, bucket} of the last one, so she does not repeat it back to back
    };
    this.state.seen.push(this.state.at);
  }

  // ---------------------------------------------------------------- utilities
  pick(a) { return a[Math.floor(this.rng() * a.length)]; }
  chance(p) { return this.rng() < p; }
  int(lo, hi) { return lo + Math.floor(this.rng() * (hi - lo + 1)); }
  off(d) { return (this.state.true[d] - 50) / 50; }

  site(i = this.state.at) { return this.sites[i]; }
  here() { return this.site().node; }

  // The law of the ground under her feet. This is where the node tree pays for
  // itself: inheritance ALREADY does this. A city with no economy of its own gets
  // its country's; a country with no tier gets the world's. No parallel "polity"
  // structure, no duplicated law — resolve() walks up and the answer falls out.
  law(key) {
    const s = this.site();
    return resolve(s.path, s.node, key);
  }

  // the nearest thing that rules her. may be nobody, which is a real answer.
  country() {
    const s = this.site();
    return [...s.path, s.node].reverse().find((p) => p.kind === 'place' && (p.scale === 'country' || p.scale === 'region')) ?? null;
  }

  // faction appearances present where she is standing. Rule 2 — placement IS scope,
  // so "who operates here" is not a lookup, it is the children of this node.
  factionsHere() {
    return this.here().children.filter((c) => c.kind === 'faction');
  }
  // People she could run into. NOT just the children of the exact node she is standing
  // in — a figure who lives "in Ottrenmark" is somebody you can meet in Ottrenmark's
  // towns, because you are in their country. Requiring an exact node match meant she
  // met a person once in three hundred days, and walked the whole world alone.
  figuresHere() {
    const site = this.site();
    const scope = [site.node, ...site.path.filter((p) => p.kind === 'place' && p.scale !== 'planet')];
    const out = [];
    for (const n of scope) {
      for (const c of n.children) {
        if (c.kind === 'figure' && !c.divine && !c.with_her) out.push(c);
      }
    }
    return out;
  }
  // ─────────────────────────────────────────────────────────────────── the stats
  // How good she is at a thing, as a number the sim can multiply by.
  //
  // CENTRED ON 6, NOT 8. She is BORN at 3–7, so centring on 8 meant every new woman was
  // below baseline at everything she did — penalised for being new, with her starting
  // rolls as dead weight until she ground past a threshold she could not see. Worse, it
  // made whole stats inert: `eye` gated its effect on st() > 0, so a woman born with a
  // good eye got nothing for it, and the numbers proved it (she did not live any longer
  // than a blind one). Centre it where she actually starts, and being born quick means
  // being quick.
  st(k) { return (this.eff(k) - 6) / 12; }

  // THREE NUMBERS, AND THEY ARE NOT THE SAME NUMBER.
  //
  //   raw   what she has learned. `use()` writes it, and only ever upward.
  //   bare  raw + her marks. THE WOMAN — what is left of what she learned.
  //   eff   bare + the kit she can actually use + the name she answers to. TODAY.
  //
  // Everything in the sim reads `eff`. Nothing but `use()` and `condition()` writes raw.
  // The demand an object makes is measured against BARE, never against EFF, because a
  // woman does not become strong enough for a blade BY PICKING UP THE BLADE.
  bare(k) { return bare(this.state, k); }
  eff(k) { return eff(this.state, k); }

  // What she has become, what she is carrying, and what she answers to — summed. Traits
  // were the only source of these once; there are three now, and they read as one.
  bonus(key) { return this.trait(key) + kitBonus(this.state, key) + callingBonus(this.state, key); }

  // USE IS GROWTH. She practises a thing by doing it, and the next point costs more
  // than the last — so early growth is visible and late growth is earned, which is the
  // shape of every skill anybody has ever had.
  use(k, n = 1) {
    const s = this.state;
    if (s.stat[k] >= STAT_MAX) return;
    s.practice[k] += n;
    const need = toNext(s.stat[k]);
    if (s.practice[k] < need) return;

    s.practice[k] -= need;
    s.stat[k]++;
    this.say(`${STATS[k].name.toLowerCase()} — ${s.stat[k]}. ${STATS[k].does}.`, 'stat', { stat: k, to: s.stat[k] });
    // she is the one who notices. not the interface.
    if (this.chance(0.5)) this.speak(this.fresh(SHE_NOTICED[k]), 'became');
  }

  // ───────────────────────────────────────────────────────────────── condition
  // Heart and Faith are not skills. They move both ways, and she says so when they do.
  // A skill that only rises is a treadmill; a condition that can be spent is a person.
  condition(k, d, why) {
    const s = this.state;
    const was = s.stat[k];
    s.stat[k] = clamp(s.stat[k] + d, 0, STAT_MAX);
    const now = s.stat[k];
    if (now === was) return;

    const T = k === 'heart' ? HEART : FAITH;
    if (now === 0 && was > 0) return this.speak(this.pick(T.empty), 'cold');
    // she does not remark on every point. she remarks when it has gone somewhere.
    if (d <= -2 && this.chance(0.6)) this.speak(this.fresh(T.lost), k === 'faith' ? 'cold' : 'grief');
    else if (d >= 2 && this.chance(0.5)) this.speak(this.fresh(T.gained), 'close');
  }

  // How many wounds it takes to kill her. NOT a constant — a woman who has been broken
  // and set can take more than one who has not, and that is the entire point of Body.
  killedAt() { return 5 + Math.floor(this.eff('body') / 4); }

  // what her traits give her. earned, and every one of them cost something.
  trait(key) {
    let v = 0;
    for (const t of this.state.traits) {
      const T = TRAITS[t];
      v += (T.gives?.[key] ?? 0) + (T.costs?.[key] ?? 0);
    }
    return v;
  }
  has(t) { return this.state.traits.includes(t); }

  // Check the ledger. A trait is not announced by the UI — SHE notices it, and says so.
  earnTraits() {
    for (const [key, T] of Object.entries(TRAITS)) {
      if (this.state.traits.includes(key)) continue;
      if (!T.when(this.state.lived, this.state)) continue;
      this.state.traits.push(key);
      this.say(T.line, 'became', { trait: key });
      this.speak(T.she, 'became');
    }
  }

  // ══════════════════════════════════════════════════════════════════ THE MARKS
  //
  // A mark is what a life took, and it is the ONLY thing in the game that can lower a
  // stat — and it still does not touch the raw number. She keeps every point she ever
  // earned. She just cannot get at some of them any more.
  //
  // This is also where the player's answers finally land. Before marks, you told her to
  // settle it, she settled it, a friction number moved, and it cooled off by the spring.
  // Now she is a woman who settles it, and she is that woman in every room she walks into
  // for the rest of her life.
  mark(key, why) {
    const s = this.state;
    if (!MARKS[key] || s.marks.some((m) => m.key === key)) return;
    s.marks.push({ key, since: s.day, why: why ?? null });
    this.say(MARKS[key].line, 'mark', { mark: key });
    this.speak(MARKS[key].she, 'became');
  }

  // Some of it mends. Not all of it, and she cannot tell which is which at the time.
  markTick() {
    const s = this.state;
    for (const m of [...s.marks]) {
      const M = MARKS[m.key];
      if (!M.mends || s.day - m.since < M.mends) continue;
      s.marks = s.marks.filter((x) => x !== m);
      this.say(`the ${M.name.toLowerCase().replace(/^(a|the)\s+/, '')} has gone. she had stopped expecting it to.`, 'mark');
    }
  }

  // ════════════════════════════════════════════════════════════════════ THE KIT
  //
  // Everything she owns came from somewhere and can be taken. `from` is the whole reason
  // objects are in this game: the coat is not +1 Body, it is the coat, and the chronicle
  // knows who put it on her.
  gain(item, from, givenBy = null) {
    const s = this.state;
    if (!item) return null;
    item.from = from;
    item.given_by = givenBy;
    item.since = s.day;

    // A THING SHE HAS NO RIGHT TO CARRY IS MOSTLY A THING SHE SELLS. It is dead in her
    // hands and every room can see her holding it, and a woman with any sense turns that
    // into money — unless she is exactly the kind of woman who would keep it, which is what
    // `reckless` has always meant. Without this, four lives in five ended up hauling around
    // a sworn blade they could not draw, and the gate stopped meaning anything.
    if (unsworn(item, s) && !this.chance(0.15 + 0.25 * Math.max(0, this.off('reckless')))) {
      s.coin += Math.round(item.worth * 0.5);
      this.say(`she came by ${item.name} and sold it on. it was never going to be hers to carry.`, 'kit');
      return null;
    }

    // She carries one of each. A woman has one good knife, not four — and if the new one
    // is worse than the one she has, she does not take it.
    const had = wielded(s, item.shape);
    if (had) {
      // she does not trade away a thing the Angel put in her hand for anything she finds on a
      // road, however fine. a kept thing stays until force takes it.
      if (had.kept || had.worth >= item.worth) return null;
      s.kit = s.kit.filter((i) => i !== had);
      // she does not throw away a thing somebody gave her. she keeps it and says nothing.
      s.coin += had.given_by ? 0 : Math.round(had.worth * 0.4);
    }
    s.kit.push(item);
    return item;
  }

  // The thing she is holding that is over her head. It does not stop her. It costs her,
  // and she is the one who says so.
  strain(act) {
    const it = straining(this.state, act);
    if (it && this.chance(0.06)) this.speak(this.fresh(OF_KIT.strains), 'cold');
    return it ? 1 : 0;
  }

  // SHE HAS CAUGHT UP TO IT. A knife she could not use a year ago, and can now — which is
  // the soft gate paying off: the thing did not unlock. She got better.
  kitTick() {
    const s = this.state;
    for (const i of s.kit) {
      if (i.caught || !i.overOnce) continue;
      if (underAsk(i, s)) continue;
      i.caught = true;
      this.speak(this.fresh(OF_KIT.caught_up), 'close');
      this.say(`the ${SHAPES[i.shape].noun} does not fight her any more. it took a year, and she noticed the day it stopped.`, 'kit');
    }
    for (const i of s.kit) if (underAsk(i, s)) i.overOnce = true;

    // CARRYING A THING SHE HAS NO RIGHT TO. The room can see it. So can the thing that is
    // counting.
    if (s.kit.some((i) => unsworn(i, s)) && this.chance(0.05)) {
      s.attention += 1;
      if (this.chance(0.3)) this.speak(this.fresh(OF_KIT.unsworn), 'cold');
    }

    // THE WORKING CHARGES WHAT IT SAYS IT CHARGES. The seed wrote the price into the world
    // and the validator forced it to. Nothing has ever made anybody pay it. This does.
    const relic = wielded(s, 'relic');
    if (relic && relic.cost && usable(relic, s) && this.chance(0.012)) {
      this.say(`she used the ${relic.name.replace(/^an? /, '')}. it took what it takes: ${relic.cost}.`, 'kit');
      this.mark('the_cost', relic.cost);
    }
  }

  // AN OBJECT IS ROLLED OUT OF THE GROUND SHE IS STANDING ON, and there is no catalogue
  // anywhere in this repo. The material is the seam under the town; the seal is a faction
  // that actually operates here (placement IS scope, so `factionsHere` is already the
  // answer); the price is what the tier can afford; and a working is one of THIS world's
  // magics, charging THIS world's price, in the words the seed wrote for it.
  //
  // A relic is never rolled at random — she has to go looking.
  mintHere(shape, tier) {
    const roll = {
      pick: (a) => this.pick(a),
      int: (lo, hi) => this.int(lo, hi),
      chance: (p) => this.chance(p),
    };
    const ordinary = Object.keys(SHAPES).filter((k) => !SHAPES[k].magical);
    return mint(roll, {
      shape: shape ?? this.pick(ordinary),
      econ: this.law('economy') ?? {},
      tech: this.law('technology') ?? {},
      magic: this.law('magic') ?? {},
      factions: this.factionsHere(),
      where: this.here().name,
      tier,                                 // forced when the Angel makes it; rolled otherwise
    });
  }

  // ══════════════════════════════════════════════════════════════════════ THE HUNT
  //
  // WHAT SHE BRINGS TO IT. Her hand, her nerve, what she is carrying, what she has become,
  // and whatever you have laid on her. Everything she has ever earned arrives here at once,
  // which is exactly what a boss fight is for.
  might() {
    return 1.5
      + this.eff('hand') * 0.34
      + this.eff('nerve') * 0.20
      + this.bonus('swing') * 2.2
      + this.bonus('soak') * 1.5
      + this.withHer().length * 0.6;      // somebody at her back is worth more than a knife
  }

  // Some beasts are NAMED for where they are ("the long machine at The Basin of Kell"), and
  // then saying it again gives you "the long machine at The Basin of Kell at The Basin of
  // Kell". Say it once.
  beastAt(b) { return b.name.includes(b.where) ? '' : ` at ${b.where}`; }

  // WHAT SHE THINKS HER CHANCES ARE. She is the one who has to do it, and she knows more
  // about what she is than you do. She does not give you a number. She tells you.
  odds(b) {
    const edge = this.might() - b.power;
    if (edge > 2.5) return 'I can do this one. I want to be honest that I could do this one in my sleep, and that I am going to charge them full price anyway.';
    if (edge > 0.5) return 'I think I can take it. I am not certain. I have not been certain about anything for a long time and I have not stopped working.';
    if (edge > -1.5) return 'It is close. It is genuinely close, and I am telling you that because you are the only one I can tell.';
    return 'I do not think I can take it. I want you to know that I have looked at this squarely, and that I am asking anyway, and you should think about why.';
  }

  beastHere() {
    const b = this.beasts[this.state.at];
    if (!b || this.state.slain.includes(b.name)) return null;
    return b;
  }

  // Every beast still standing, anywhere she could walk to.
  quarry() {
    return Object.entries(this.beasts)
      .filter(([, b]) => !this.state.slain.includes(b.name))
      .map(([i, b]) => ({ at: Number(i), beast: b }));
  }

  // ── SHE READS THE BOARD. A posting is not a quest marker; it is a fact with a price on it
  //    and somebody paying, and she asks you whether it is worth her life.
  readBoard() {
    const s = this.state;
    if (s.bounty || s.pending.some((p) => p.kind === 'bounty')) return;

    const open = this.quarry();
    if (!open.length) return;

    // she takes an interest in what is near her, but a good price travels
    const q = this.pick(open);
    const b = q.beast;

    const posted = this.pick(POSTED)
      .replace('{place}', this.here().name)
      .replace('{who}', this.factionsHere()[0]?.name ?? (this.law('economy')?.who_is_rich ?? 'somebody who will not give a name'));

    this.say(`there is a posting at ${this.here().name}: ${b.name}, at ${b.where}. ${b.worth} coin. ${posted}`, 'bounty');

    s.pending.push({
      id: `bounty_${b.name}`,
      kind: 'bounty',
      who: b.name,
      at: q.at,
      raisedOn: s.day,
      dueOn: s.day + 5,
      // HER OWN READ ON IT, and it is the single most useful thing she can tell you: she is
      // the one who has to fight it, and she has a better idea than you do of what she is.
      prompt: `${b.what} They are paying ${b.worth} coin for it, at ${b.where}. ${posted} ${this.odds(b)}`,
      options: { take: 'Take it', leave: 'Leave it on the board' },
    });
  }

  resolveBounty(j, key, by) {
    const s = this.state;
    const q = this.quarry().find((x) => x.beast.name === j.who);

    if (key === 'take' && q) {
      s.bounty = { at: q.at, name: q.beast.name, where: q.beast.where, worth: q.beast.worth };
      this.use('name');
      this.speak(this.fresh(TOOK), 'close');
      this.say(`she took ${q.beast.name} off the board at ${this.here().name}. everyone watched her do it.`, 'bounty');
    } else {
      this.speak(this.fresh(REFUSED), 'cold');
      this.say(`she left ${j.who} on the board. somebody else will take it.`, 'event');
    }

    s.log.push({
      day: s.day, kind: 'judgment', by, id: j.id, feed: 'her',
      text: key === 'take' ? `she is going after ${j.who}. [${by === 'you' ? 'you' : 'she'} decided]`
                           : `she left ${j.who} on the board. [${by === 'you' ? 'you' : 'she'} decided]`,
    });
  }

  // ══════════════════════════════════════════════════════════════════ SHE FIGHTS IT
  hunt(beast) {
    const s = this.state;
    s.lived.hunted++;
    s.lived.fights++;
    this.use('hand', 4);
    this.use('nerve', 3);
    this.use(beast.asks, 2);
    this.strain('danger');

    // EVERYTHING SHE HAS, AGAINST A NUMBER THAT DOES NOT CARE. The great one does not scale
    // to her and it never will: she is either ready or she is the fifth name on the notice.
    const edge = this.might() - beast.power + (this.rng() * 3 - 1.5);

    if (edge > 0.6) return this.slay(beast, edge);

    // ── SHE BREAKS OFF. Badly outmatched, and an eye is the thing that tells her so in time.
    //    This is the same mechanic that already makes a woman with an eye outlive a woman
    //    with a hand, and it is why a failed hunt is a bad week rather than a funeral.
    if (edge < -2.2 && this.chance(clamp(0.35 + this.st('eye') * 0.45 + this.st('foot') * 0.2, 0, 0.85))) {
      s.wounds += 1;
      this.use('eye', 2);
      this.use('foot', 2);
      this.drift('reckless', -0.03);
      this.speak(this.pick([
        `I turned around and walked out. I have been telling myself all week that that was the brave thing.`,
        `I got one look at it and I did not go any further. I am not going to apologise for that to you or to anybody.`,
      ]), 'cold');
      return this.say(
        `I got close enough to ${beast.name}${this.beastAt(beast)} to see what it was, and turned round, and came back. It is still there.`,
        'hunt');
    }

    // ── it went badly.
    const bad = edge < -1.6;
    s.wounds += bad ? 2 : 1;
    s.lived.hurt_badly++;
    this.use('body', 4);
    this.drift('reckless', -0.04);
    s.attention += 1;

    if (this.chance(bad ? 0.3 : 0.12)) {
      this.mark(this.pick(['ruined_hand', 'limp', 'bad_eye', 'scarred']), `${beast.name} did this to her${this.beastAt(beast)}`);
    }

    // she does not have to die to lose. she can simply not be enough, and know it.
    this.speak(this.pick([
      `I could not do it. I want to be clear that it was not close. I have been telling people it was close.`,
      `It is still there. I am not. I got out and I do not entirely remember how.`,
    ]), 'cold');

    return this.say(
      `I went after ${beast.name}${this.beastAt(beast)} and came back out of it, and it did not.` +
      (bad ? ' I was a long time getting up.' : ''),
      'hunt');
  }

  slay(beast, edge) {
    const s = this.state;
    s.slain.push(beast.name);
    s.lived.slain++;

    const paid = beast.worth + (s.bounty?.name === beast.name ? Math.round(beast.worth * 0.2) : 0);
    s.coin += paid;
    s.wounds += beast.great ? 3 : this.chance(0.6) ? 1 : 2;

    // A NAME IS THE REAL PAYMENT, AND IT IS A LIABILITY. Killing the thing everybody was
    // frightened of is the loudest thing a person can do, and the thing that is counting has
    // been counting.
    this.use('name', beast.great ? 12 : 4);
    s.attention += beast.great ? 8 : 2;
    for (const f of this.factionsHere()) this.nudge(f.name, 2);

    if (s.bounty?.name === beast.name) s.bounty = null;

    if (beast.great) {
      s.greatSlain = true;
      this.condition('faith', +2, 'she lived');
      this.speak(this.fresh(GREAT.after), 'close');
      return this.say(
        `${beast.name} is dead. I killed it${this.beastAt(beast)}, and I am alive, and almost nobody who has ever gone after it has been able to say both of those things. ${paid} coin. I have not spent any of it.`,
        'hunt', { great: true });
    }

    return this.say(this.pick([
      `${beast.name} is dead${this.beastAt(beast)}. ${paid} coin. I collected it myself and did not say a word to anyone in the room.`,
      `I killed ${beast.name}${this.beastAt(beast)}. ${paid} coin, and a long walk back with it in a sack, and nobody would sit near me on the road.`,
    ]), 'hunt');
  }

  // ══════════════════════════════════════════════════════════════ AND THE GREAT ONE
  //
  // She does not stumble into it. She finds out about it — the posting, the raised price, the
  // names of the four before her — and then she has to stand outside it and decide. That is a
  // judgment, and it is the biggest one this game has: she is asking you whether to die.
  offerGreat() {
    const s = this.state;
    const g = this.great;
    if (!g || s.greatSlain || s.slain.includes(g.name)) return;
    if (s.pending.some((p) => p.kind === 'great')) return;

    // she has to have heard of it first, and she hears of it the way anybody hears of
    // anything: standing somewhere, from somebody who is frightened.
    if (!s.knowsGreat) {
      if (s.at !== g.at && !this.chance(0.02)) return;
      s.knowsGreat = true;
      return this.say(
        `she heard about ${g.name} at ${this.here().name}. ${g.what} ${g.rumour}`,
        'bounty');
    }

    // and she has to be standing in front of it
    if (s.at !== g.at) return;
    if (!this.chance(0.25)) return;

    this.speak(this.fresh(GREAT.before), 'afraid');
    s.pending.push({
      id: `great_${g.name}`,
      kind: 'great',
      who: g.name,
      raisedOn: s.day,
      dueOn: s.day + 4,
      prompt: `${g.what} ${g.rumour} It is here. I am standing outside it. They are paying ${g.worth} coin and the coin is not why, and we both know the coin is not why.`,
      options: { go: 'Go in', walk: 'Walk away from it' },
    });
  }

  resolveGreat(j, key, by) {
    const s = this.state;
    const g = this.great;

    if (key === 'go') {
      s.log.push({
        day: s.day, kind: 'judgment', by, id: j.id, feed: 'her',
        text: `she went in after ${g.name}. [${by === 'you' ? 'you' : 'she'} decided]`,
      });
      return this.hunt(g);
    }

    // SHE WALKED AWAY, AND IT COSTS. Not a scolding — she is the one who has to live with
    // having been outside it and not gone in.
    s.attention = Math.max(0, s.attention - 2);
    this.condition('heart', -1, 'walked away');
    this.speak(this.pick([
      `I walked away from it. I am going to be walking away from it for the rest of my life.`,
      `We did the sensible thing. I want that on the record in exactly those words, because I am going to want to reread it.`,
    ]), 'cold');
    this.say(`she stood outside ${g.name} at ${g.where}, and she did not go in. it is still there.`, 'event');
    s.log.push({
      day: s.day, kind: 'judgment', by, id: j.id, feed: 'her',
      text: `she walked away from ${g.name}. [${by === 'you' ? 'you' : 'she'} decided]`,
    });
  }

  // ══════════════════════════════════════════════════════════════════ YOU BLESS HER
  //
  // The only thing in this game you do TO her rather than ask OF her — and it is bound by
  // three things, none of them negotiable (see gen/tables/blessings.js):
  //
  //   SHE HAS TO BELIEVE. A blessing lands on Faith, and a woman who has stopped believing
  //   anything is listening has no surface for it to land on. Not "reduced effect" — nothing.
  //   Neglect no longer merely costs you a judgment. It takes your hands away.
  //
  //   IT MAKES HER LOUD. `attention` is the thing that is counting, and it is what eventually
  //   sends men to the inn she is sleeping in. Every gift is a light switched on over her
  //   head, in a country where something is looking for exactly that.
  //
  //   YOU CANNOT BE A CONSTANT MIRACLE. There is a long silence between blessings, or she
  //   stops being a woman walking a hard country and becomes a character you are buffing.

  canBless(key) {
    const s = this.state;
    const B = BLESSINGS[key];
    if (!B || !s.alive) return { ok: false, why: 'no' };
    if (s.day - (s.lastBlessed ?? -BLESS_GAP) < BLESS_GAP) {
      return { ok: false, why: `not yet — ${BLESS_GAP - (s.day - s.lastBlessed)} days` };
    }
    if (B.mark && s.marks.some((m) => m.key === B.mark)) return { ok: false, why: 'she already carries this' };
    if (B.onItem && !s.kit.length) return { ok: false, why: 'she is carrying nothing' };
    if (this.eff('faith') < B.needs) return { ok: false, why: 'she does not believe in you enough for this' };
    return { ok: true };
  }

  bless(key, target) {
    const s = this.state;
    const B = BLESSINGS[key];
    if (!B || !s.alive) return null;

    // ── SHE HAS STOPPED BELIEVING, AND THERE IS NOTHING TO LAND ON.
    //    This is not a failure message. It is the bill for a year of not turning up.
    if (this.eff('faith') < B.needs) {
      this.say(this.pick(UNFELT), 'bless');
      return { landed: false };
    }

    s.lastBlessed = s.day;
    s.blessings = (s.blessings ?? 0) + 1;

    // A GIFT COSTS HER NOTHING NOW. It once made her loud — attention, the thing that is
    // counting — and that binding has been deliberately cut: a blessing is a pure gift,
    // gated only by whether she still believes you are there (the Faith check above) and by
    // the long silence between gifts (canBless's cooldown). She still finds out you are real,
    // and that still frightens her — but the fright is her humanity, not a tax you levy.

    if (B.wounds) s.wounds = Math.max(0, s.wounds + B.wounds);
    if (B.heart) this.condition('heart', B.heart, 'blessed');
    if (B.mark) this.mark(B.mark, 'you did this to her');

    if (B.onItem) {
      const it = s.kit.find((i) => i.shape === target) ?? best(s.kit);
      if (it && !it.blessed) {
        it.blessed = true;
        it.name = `${it.name}, and it is not what it was`;
        // it gives more, full stop. it no longer also makes her louder — a blessed thing is
        // a pure gift now, like every other blessing.
        for (const k of Object.keys(it.gives)) it.gives[k] *= 1.8;
        it.worth = Math.round(it.worth * 2.5);
        this.say(BLESSINGS.item.line, 'bless');
        this.speak(this.fresh(BLESSINGS.item.she), 'close');
      }
    } else if (B.she) {
      this.say(B.line, 'bless');
      this.speak(this.fresh(B.she), 'close');
    }

    // ── AND SHE FINDS OUT SOMETHING SHE DID NOT KNOW.
    //
    // This is the real weight of it. Until now she has believed in you the way people believe
    // in things — on nothing, out of need, with a great deal of doubt. A blessing is PROOF.
    // Her faith goes up because you were real. And she is frightened, because you were real.
    this.condition('faith', +3, 'you were real');
    if (s.blessings === 1) this.speak(this.pick(FIRST), 'afraid');

    return { landed: true };
  }

  standing(name) { return this.state.standing[name] ?? 0; }
  nudge(name, d) {
    // NAME: how fast people take sides about her. A woman nobody has heard of is judged
    // slowly; a woman whose name reaches a room before she does is judged the moment
    // she walks in — for and against.
    const speed = 1 + this.bonus('standing_speed') + this.st('tongue') * 0.3 + this.st('name') * 0.9;
    this.state.standing[name] = clamp(this.standing(name) + d * speed, -20, 20);
  }

  // How steep the exception is where she is standing. A tier-7 city in a tier-3
  // country is not a curiosity — it is being HELD DOWN by somebody, and she is
  // walking through the part of it where the holding happens.
  unrest() {
    const n = this.here();
    let u = 0;
    for (const d of n.divergences ?? []) {
      if (typeof d.from === 'number' && typeof d.to === 'number') u += Math.abs(d.to - d.from);
      else u += 1;
    }
    return u;
  }

  // ---------------------------------------------------------------- vocabulary
  // The same line re-colours itself as she walks, because these all resolve from
  // where she is standing. This is what buys one shared chronicle table instead of
  // 391 hand-written lines per world.
  // A HASH, NOT A ROLL.
  //
  // `vocab` used `this.pick` for the god and for the price of magic — which meant it rolled
  // the RNG on every line it rendered, and named A DIFFERENT GOD EVERY TIME. Monday the
  // power watching Ambril was Orrun; Tuesday it was Ashra; nobody had done anything. That is
  // not atmosphere, it is the world failing to hold still, and it is precisely why the
  // chronicle read as arbitrary — the details were not FACTS about a place, they were noise
  // dressed as facts.
  //
  // The god over a place does not change between one sentence and the next. Choose by the
  // name of the ground she is standing on, and it is the same answer forever.
  steady(list, key) {
    if (!list?.length) return null;
    const s = String(key);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return list[(h >>> 0) % list.length];
  }

  vocab(extra = {}) {
    const econ = this.law('economy') ?? {};
    const country = this.country();
    const gods = this.world.children.filter((c) => c.kind === 'figure' && c.divine);
    const magic = this.law('magic') ?? {};
    const tech = this.law('technology') ?? {};
    const here = this.here().name;
    const factions = this.factionsHere();

    return {
      place: here,
      country: country?.name ?? 'nobody',
      commodity: econ.resources ?? 'whatever there is',
      pays: econ.who_pays_for_it ?? 'somebody',
      rich: econ.who_is_rich ?? 'whoever holds the paper',
      // NAME THE MONEY. She is paid in it, taxed in it and cheated in it every day of her
      // life, and the chronicle has never once said what it was.
      currency: econ.currency ?? 'coin',
      // Who actually operates here. Placement IS scope, so this is not a lookup — it is the
      // children of the node she is standing in.
      house: this.steady(factions, here)?.name ?? (econ.who_is_rich ?? 'the men who collect here'),
      power: this.steady(gods, here)?.name ?? 'nothing anyone can name',
      cost: this.steady(magic.types, here)?.cost ?? 'more than it says',
      working: this.steady(magic.types, here)?.name ?? 'whatever they call it here',
      quirk: tech.quirks?.[0] ?? 'nothing anyone will explain',
      name: this.state.name,
      day: this.state.day,
      ...extra,
    };
  }

  line(pool, extra = {}) {
    const v = this.vocab(extra);
    const t = this.pick(this.lines[pool]);
    return t.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));
  }

  // ─────────────────────────────────────────────────────────────── THE TWO FEEDS
  // Everything she records is one of two things. HER feed is her own account — first person,
  // lens-gated, what she did and felt and learned and asks you. THE WORLD feed is what is
  // gathering around her that she has not yet seen and you have: the watcher, the ambush, the
  // world moving in the dark. You read both; she writes only the first. Death is the one line
  // in her feed she cannot write, so it belongs to the world.
  feedOf(kind) {
    return (kind === 'world' || kind === 'threat' || kind === 'death') ? 'world' : 'her';
  }

  say(text, kind = 'event', meta = {}) {
    this.state.log.push({ day: this.state.day, kind, feed: this.feedOf(kind), text, ...meta });
  }

  // A line in the WORLD feed — what you can see closing on her and she cannot. (Named
  // `around`, not `world`, because `this.world` is the world TREE — the collision cost one
  // test run to find.) Written in the third person on purpose: it is not her voice, it is the
  // sight she does not have.
  around(text, kind = 'world', meta = {}) {
    this.state.log.push({ day: this.state.day, kind, feed: 'world', text, ...meta });
  }

  // ------------------------------------------------------------------ HER VOICE
  // She knows you are there. This is her talking to you, and it is the only channel
  // in the game that is not the world's account of things.
  speak(text, why = 'close') {
    this.state.spoken++;
    this.state.lastSpoke = this.state.day;
    (this.state.said ??= []).unshift(text);
    this.state.said = this.state.said.slice(0, 6);
    this.state.log.push({ day: this.state.day, kind: 'her', feed: 'her', why, text });
  }

  // she does not say the same thing to you twice in a fortnight. the chronicle has had
  // pity suppression since the beginning; her voice did not, and it showed.
  fresh(pool) {
    const said = this.state.said ?? [];
    const open = pool.filter((t) => !said.includes(t));
    return this.pick(open.length ? open : pool);
  }

  // Whether she says anything unprompted today. She talks to you LESS the further she
  // has drifted from you — and when she does talk, it is colder. That is the reveal,
  // and it is never printed at you. It is her going quiet.
  maybeSpeak() {
    const h = this.heeds();
    if (!this.state.spoken) {
      // the first time. she has known for a while and has been deciding whether to say so.
      if (this.state.day > 6 && this.chance(0.3)) this.speak(this.fresh(VOICE.first), 'first');
      return;
    }
    // YOU ARE ALL SHE HAS. A famous or isolated woman reaches out to you MORE OFTEN, and
    // sooner — the room got emptier, and you are what is left in it.
    const alone = this.aloneWithYou();
    if (this.state.day - this.state.lastSpoke < (alone ? 2 : 4)) return;
    if (!this.chance(alone ? Math.min(1, speaksTo(h) * 1.7) : speaksTo(h))) return;

    if (this.state.wounds >= 4) return this.speak(this.fresh(VOICE.hurt), 'hurt');
    if (this.state.attention >= 16 && this.chance(0.4)) return this.speak(this.fresh(VOICE.afraid), 'afraid');
    // NOT A SWITCH. She does not go cold on you on a Tuesday because a number crossed
    // a line — she goes cold by degrees, and the odds of any given thing she says to
    // you being a cold one rise as she drifts. You will feel it long before you can
    // point at it, which is exactly how it happens to people.
    // ^1.7, not linear. A linear (1 - heeds) meant a woman who still heeds you 90% got
    // a cold line one time in ten, and over a long life she was snapping at you
    // constantly while nominally devoted. Warmth has to be STABLE while she is
    // listening, and coldness has to ramp — otherwise the drift reads as noise.
    const cold = this.chance(Math.pow(1 - h, 1.7));
    // and when it is not a cold day, and there is genuinely nobody else, she says the thing
    // she would never say to a person: that it comes out to you, and only you.
    if (!cold && alone && this.chance(0.45)) return this.speak(this.fresh(VOICE.only), 'close');
    this.speak(this.fresh(cold ? VOICE.cold : VOICE.close), cold ? 'cold' : 'close');
  }

  // ══════════════════════════════════════════════════════════════ WHAT SHE CONFIDES
  //
  // She turns to you and tells you how she actually feels about a specific person — that she
  // is in love, that she wants somebody dead, that she owes a debt she cannot say thank you
  // for. You are the only one she will say any of it to; some of it she would deny to their
  // face. The bucket is chosen off the ACTUAL state of an ACTUAL bond, so she never confides
  // a love she does not have or a hatred she has not earned.
  confide() {
    const s = this.state;
    if (this.eff('faith') < COMMUNE_FAITH) return;      // she only opens up if she believes you are there
    if (s.day - (s.lastConfide ?? -20) < 5) return;

    // the people she has real feeling about — love, hatred, debt, a secret handed over
    const living = this.bondList().filter((b) => b.alive && (
      b.romance >= 1 || b.betrayed || b.friction >= 6 || b.owes >= 6 ||
      (b.knows?.length) || b.closeness >= 5));
    const grievable = s.ghosts.filter((g) => g.was && g.was !== 'betrayer');
    if (!living.length && !grievable.length) return;

    // she confides MORE the fuller her life is — a woman with people in her life talks about
    // them, and a woman with nobody has nobody to tell you about.
    if (!this.chance(clamp(0.12 + 0.05 * (living.length + grievable.length), 0, 0.42))) return;

    // EVERY relationship she could talk about, weighted. The point is VARIETY: the sharp
    // feelings — love, hatred, a life she owes — are rare in the state, so they are boosted
    // hard, and they win the moment she actually has one. Fondness is common, so it is not.
    const cands = [];
    for (const b of living) {
      const { bucket, mood } = this.feelingOf(b);
      cands.push({ who: b.who, bucket, mood, w: (1 + this.charge(b)) * (CONFIDE_WEIGHT[bucket] ?? 1) });
    }
    for (const g of grievable) cands.push({ who: g.name, bucket: 'grief_person', mood: 'grief', w: 7 });
    if (!cands.length) return;

    // do not tell you the same thing about the same person twice running — rotate.
    const last = s.lastConfession;
    let pool = last ? cands.filter((c) => !(c.who === last.who && c.bucket === last.bucket)) : cands;
    if (!pool.length) pool = cands;

    const total = pool.reduce((a, c) => a + c.w, 0);
    let r = this.rng() * total;
    let pick = pool[pool.length - 1];
    for (const c of pool) { r -= c.w; if (r <= 0) { pick = c; break; } }

    s.lastConfide = s.day;
    s.lastConfession = { who: pick.who, bucket: pick.bucket };
    this.confess(CONFIDE[pick.bucket], pick.who, pick.mood);
  }

  // how loudly a relationship is asking to be talked about. love and hatred both shout.
  charge(b) {
    return (b.romance >= 3 ? 22 : b.romance >= 1 ? 11 : 0)
      + (b.betrayed ? 20 : 0)
      + Math.max(0, b.friction)
      + b.closeness * 0.5
      + (b.owes >= 6 ? 9 : 0)
      + (b.knows?.length ? 7 : 0)
      + (b.closeness >= 10 && b.trust <= 5 ? 8 : 0);
  }

  // which confession this bond calls for. order matters: the sharpest feeling wins.
  feelingOf(b) {
    if (b.betrayed) return { bucket: 'betrayed', mood: 'cold' };
    if (b.romance >= 3) return { bucket: 'love', mood: 'close' };
    if (b.closeness >= 8 && b.friction >= 11) return { bucket: 'feud_kill', mood: 'cold' };   // loved AND furious
    if (b.friction >= 12 && b.closeness < 5) return { bucket: 'hate_kill', mood: 'cold' };     // clean hatred
    if (b.friction >= 8) return { bucket: 'anger', mood: 'cold' };                             // a rivalry with teeth
    if (b.romance >= 1 || (b.closeness >= 10 && b.trust >= 8)) return { bucket: 'falling', mood: 'close' };
    if (b.owes >= 6) return { bucket: 'debt', mood: 'cold' };
    if (b.closeness >= 10 && b.trust <= 5) return { bucket: 'distrust', mood: 'cold' };
    if (b.knows?.length) return { bucket: 'secret', mood: 'close' };
    return { bucket: 'fond', mood: 'close' };
  }

  // fill in the name, and do not say the same confession twice in a fortnight.
  confess(pool, who, mood) {
    const filled = pool.map((t) => t.replaceAll('{who}', who));
    const said = this.state.said ?? [];
    const open = filled.filter((t) => !said.includes(t));
    this.speak(this.pick(open.length ? open : filled), mood);
  }

  // ════════════════════════════════════════════════════════ THE CHANNEL BOTH WAYS
  //
  // She talks to you (maybeSpeak) and she asks you (the judgments). This is the third
  // thing: YOU asking HER. It is not a text box — the engine runs no model, so she cannot
  // answer a sentence she has never seen — and it is not instant, because she is walking a
  // country, not waiting on you. You put one of a handful of real questions to her, and a
  // day or two later she turns round and answers it, in her own voice, out of her own state.

  // Are you the only one left? A woman who is FAMOUS (a name that precedes her, a thing that
  // is counting her) or ISOLATED (nobody living she is close to, nobody at her shoulder) has
  // run out of people — and you are what is left. This gates how often she reaches out to
  // you, and it is the mechanical heart of "I became her only true friend".
  aloneWithYou() {
    const s = this.state;
    const closeLiving = this.bondList().filter(
      (b) => b.alive && !b.betrayed && (b.closeness >= 8 || b.withHer)).length;
    if (closeLiving >= 2) return false;                 // she has people; you are not all she has
    const famous = this.eff('name') >= 12 || s.attention >= 15;
    const isolated = closeLiving === 0 && !this.withHer().length;
    // and she has to still believe you are there for you to BE what is left
    return (famous || isolated) && this.eff('faith') >= COMMUNE_FAITH;
  }

  // YOU PUT A QUESTION TO HER. It is an input like any other — recorded, replayed — and it
  // does nothing loud: it does not pump her Faith (turning up when she asks is what does
  // that). It just means that in a day or two, she answers. She holds one at a time; a new
  // one replaces an old one she has not got to, because that is how a person works.
  askHer(topic) {
    const s = this.state;
    if (!s.alive || !QUESTIONS[topic]) return;
    s.reached = (s.reached ?? 0) + 1;
    s.lastReached = s.day;
    s.youAsked = { topic, on: s.day };
  }

  // She turns round and answers — the day after, or the one after that. The WORDS were
  // authored once; the WOMAN is picked off her actual state, so "are you all right" is a
  // different sentence out of a woman with three wounds than out of one who is, for once,
  // fine. Below COMMUNE_FAITH she does not answer at all: she has stopped believing there is
  // anybody on the other end of the question, and the silence is the answer.
  communeTick() {
    const s = this.state;
    if (!s.youAsked) return;

    if (this.eff('faith') < COMMUNE_FAITH) {
      // she cannot hear you any more. the question sits, and then she lets it go, and does
      // not say so, and that is its own kind of answer.
      if (s.day - s.youAsked.on > 6) s.youAsked = null;
      return;
    }

    const waited = s.day - s.youAsked.on;
    if (waited < 1) return;
    if (waited < 2 && !this.chance(0.5)) return;   // a day, or two. never the same minute.

    const answer = this.commune(s.youAsked.topic);
    s.youAsked = null;
    if (!answer) return;
    this.speak(answer.text, answer.mood);
    // she is a little less alone for having been asked. not Faith — Heart. somebody paid
    // attention, and attention is the thing she stopped getting.
    if (this.chance(0.5)) this.condition('heart', HEART.company, 'attended');
  }

  // Choose the pool off her state, fill in {who}/{where}, and hand back a line and a mood.
  // Everything here reads state and rolls `this.rng` through `this.fresh` — deterministic,
  // replayable, no model, exactly like every other line she says.
  commune(topic) {
    const s = this.state;
    const Q = QUESTIONS[topic];
    if (!Q) return null;

    // her most significant living person, for the questions that are about somebody
    const someone = this.bondList()
      .filter((b) => b.alive)
      .sort((a, b) => (b.closeness + b.friction) - (a.closeness + a.friction))[0];

    let bucket, mood = 'close';
    switch (topic) {
      case 'where':
        bucket = s.bounty ? 'bounty' : (s.knowsGreat && !s.greatSlain) ? 'great' : 'on';
        break;
      case 'ok':
        if (s.wounds >= 3) { bucket = 'hurt'; mood = 'hurt'; }
        else if (s.attention >= 14) { bucket = 'hunted'; mood = 'afraid'; }
        else if (this.eff('heart') <= 6) { bucket = 'spent'; mood = 'grief'; }
        else if (s.wounds === 0 && this.eff('heart') >= 12) bucket = 'good';
        else bucket = 'fine';
        break;
      case 'who': {
        if (!someone || (someone.closeness < 3 && someone.friction < 3)) { bucket = 'nobody'; break; }
        const k = kindOf(someone);
        bucket = someone.romance >= 3 ? 'lover'
          : (k === 'feud' || k === 'enemy' || k === 'complicated' || k === 'rival') ? 'hard'
          : k === 'close' ? 'close'
          : k === 'friend' ? 'friend'
          : 'known';
        break;
      }
      case 'afraid':
        mood = 'afraid';
        bucket = (s.knowsGreat && !s.greatSlain) ? 'great'
          : s.attention >= 14 ? 'counted'
          : (this.eff('heart') <= 6 || this.aloneWithYou()) ? 'alone'
          : 'default';
        break;
      case 'believe': {
        const f = this.eff('faith');
        bucket = f >= 14 ? 'high' : f >= 8 ? 'mid' : 'low';
        mood = f >= 8 ? 'close' : 'cold';
        break;
      }
      case 'why':
        bucket = s.ghosts.some((g) => g.wanted && !g.settled) ? 'ghost'
          : (someone && (someone.romance >= 3 || someone.withHer)) ? 'love'
          : this.eff('heart') <= 6 ? 'empty'
          : 'default';
        if (bucket === 'empty') mood = 'cold';
        break;
      default:
        return null;
    }

    const pool = Q.reply[bucket] ?? Q.reply.default ?? Object.values(Q.reply)[0];
    let text = this.fresh(pool);
    if (text.includes('{who}')) text = text.replaceAll('{who}', someone?.who ?? 'nobody');
    if (text.includes('{where}')) {
      text = text.replaceAll('{where}', s.bounty?.where ?? (this.great?.where ?? this.here().name));
    }
    return { text, mood };
  }

  // ═══════════════════════════════════════════════════════════════════ THE VISIT
  //
  // A blessing is proof you are REAL. This is proof you are HERE — and it is the rarest,
  // most-gated thing in the game, because it should be. It asks for all three of the things
  // the whole design is about: that she believes in you completely, that you were once real
  // to her hands, and that you turned up for her again and again. Grind none of them; the
  // only way to the visit is to have actually been her angel.
  canVisit() {
    const s = this.state;
    if (!s.alive) return { ok: false, why: 'no' };
    if (s.day - (s.lastVisited ?? -VISIT_GAP) < VISIT_GAP) {
      return { ok: false, why: `not yet — she could not bear it so soon. ${VISIT_GAP - (s.day - s.lastVisited)} days` };
    }
    if (this.eff('faith') < VISIT_FAITH) return { ok: false, why: 'she does not yet believe in you the way this asks — her Faith is not high enough' };
    if ((s.blessings ?? 0) < 1) return { ok: false, why: 'she has never once felt you were real. prove it first — bless her, then she has a surface for this to land on' };
    if ((s.answered ?? 0) < VISIT_ANSWERED) return { ok: false, why: 'you have not turned up enough. answer her when she asks, and keep answering, and then come' };
    return { ok: true };
  }

  visit() {
    const s = this.state;
    if (!this.canVisit().ok) return { visited: false };

    s.lastVisited = s.day;
    s.visits = (s.visits ?? 0) + 1;

    // IT MAKES HER LOUDER THAN ANY GIFT. A blessed woman glows; a visited one burns. The
    // thing that is counting can see this from the far side of a country.
    s.attention += 6;

    // the big gift is Heart — she has just been given the thing she stopped believing she
    // would ever get — and a little more Faith, though hers is already near the top.
    this.condition('heart', +6, 'seen');
    this.condition('faith', +2, 'you came, in the flesh');

    // AND THE MARK THAT NEVER FADES. The one warm one. She looked at you and you looked back.
    this.mark('seen_you', 'you stood in front of her');

    this.say(VISIT.line, 'bless', { visit: true });
    this.speak(this.fresh(VISIT.she), 'afraid');

    // and while you are there, she asks you the one thing — face to face, not into the dark.
    // it is a judgment like any other, so it journals and it foresees with no special case.
    if (!s.pending.some((p) => p.kind === 'visit')) {
      s.pending.push({
        id: `visit_${s.day}`,
        kind: 'visit',
        raisedOn: s.day,
        dueOn: s.day + 3,
        prompt: VISIT.ask.prompt,
        options: VISIT.ask.options,
      });
    }
    return { visited: true };
  }

  // ═════════════════════════════════════════════════════════════════════════ THE GIFT
  //
  // The Angel reaches into the world and puts a thing in her hand that was not there
  // yesterday. Gated exactly like the visit — she has to believe in you completely, you have
  // to have been real to her once, you have to have turned up again and again — on the
  // longest silence in the game. It is never pushed as "available"; you discover it by
  // opening her. Journalled as {type:'gift', shape} and replayed deterministically, because
  // the shape is data and every number falls out of the shape — there is no dial for how
  // strong it is, which is the whole point: you choose WHAT it is, never HOW GOOD.
  canGift() {
    const s = this.state;
    if (!s.alive) return { ok: false, why: 'no' };
    if (s.day - (s.lastGifted ?? -GIFT_GAP) < GIFT_GAP) {
      return { ok: false, why: `not yet — a thing like this cannot come often. ${GIFT_GAP - (s.day - s.lastGifted)} days` };
    }
    if (this.eff('faith') < GIFT_FAITH) return { ok: false, why: 'she does not believe in you deeply enough to receive this — her Faith is not high enough' };
    if ((s.blessings ?? 0) < 1) return { ok: false, why: 'she has never once felt you were real. bless her first — a gift needs a believer to put it into the hand of' };
    if ((s.answered ?? 0) < GIFT_ANSWERED) return { ok: false, why: 'you have not turned up enough. answer her when she asks, and keep answering, and then reach in' };
    return { ok: true };
  }

  gift(shape) {
    const s = this.state;
    if (!this.canGift().ok) return { gifted: false };
    const S = SHAPES[shape];
    if (!S) return { gifted: false };

    // The best of this world's version of the thing — its top tier, forced. A relic needs
    // this world to HAVE a magic to make it of; if it does not, the gift cannot be that
    // shape, and we say so rather than mint nothing.
    const it = this.mintHere(shape, S.tiers.length - 1);
    if (!it) return { gifted: false };

    s.lastGifted = s.day;
    s.gifts = (s.gifts ?? 0) + 1;

    // IT IS BLESSED, IT IS HERS, AND IT WAS NOT HERE YESTERDAY.
    it.blessed = true;
    it.kept = true;                                   // she never sells it; only force takes it
    for (const k of Object.keys(it.gives)) it.gives[k] *= 1.8;
    it.worth = Math.round(it.worth * 2.5);
    it.asks = {};                                     // fitted to her hand — it never strains her
    it.only = null;                                   // made for her, not for a rank she must hold
    it.name = `${it.name}, and it was not here yesterday`;
    it.from = 'it was not in her hand yesterday, and it is now';
    it.given_by = 'you';
    it.since = s.day;

    // she carries one of each shape; the gift takes the slot, and the old one is set aside.
    const had = wielded(s, shape);
    if (had) s.kit = s.kit.filter((i) => i !== had);
    s.kit.push(it);

    // proof again — not the first, but the largest kind. you did not send a feeling. you
    // reached in and left something she can hold in the morning.
    this.condition('faith', +2, 'you reached into the world');
    this.say(GIFT.line, 'bless');
    this.speak(this.fresh(GIFT.she), 'afraid');
    return { gifted: true, item: it };
  }

  resolveVisit(j, key, by) {
    const s = this.state;
    if (key === 'stay') {
      // you let her believe you will stay. it is a kindness and it is a lie, and she half
      // knows it, and takes it anyway, and is steadier for it.
      this.condition('heart', +2, 'told she is not alone');
      if (by === 'you') this.speak(this.pick([
        'You are going to stay. All right. I am going to hold you to that in the small hours, and we both know how that will go, and I do not care.',
        'You will stay. I heard you. I am going to believe it for as long as I can, which is a skill I have, unfortunately.',
      ]), 'close');
    } else {
      // you were honest: this is the once. it costs her, and it is the truer gift, and part
      // of her knows that too.
      this.condition('heart', -1, 'the once');
      this.condition('faith', +1, 'you did not lie to her');
      if (by === 'you') this.speak(this.pick([
        'The once. Thank you for not lying to me. Nobody has told me a hard thing straight in years and I had forgotten I preferred it.',
        'Just the once, then. I would rather have the truth and the ache than a comfort I would catch you in later. I think. Ask me at night and I will tell you different.',
      ]), 'close');
    }
    s.log.push({
      day: s.day, kind: 'judgment', by, id: j.id, feed: 'her',
      text: key === 'stay'
        ? `I asked whether you would stay, and you let me believe you would. [${by === 'you' ? 'you' : 'she'} decided]`
        : `I asked whether you would stay, and you told me the truth. [${by === 'you' ? 'you' : 'she'} decided]`,
    });
  }

  // ══════════════════════════════════════════ WHAT IS CLOSING ON HER (the world feed)
  //
  // The second feed, and the second power. You see the world gather around her — a man who
  // watched her pay, three at the inn, a road being chosen for her — a day or two before she
  // does. Then you decide: WARN her, or LEAVE her to it. Warning is not free (it lands on
  // Faith, and it only saves her if she has the wits to act on it), and NOT warning is not
  // neglect — some things a person has to walk into to become who they are, and you are
  // allowed to let her.

  // a plausible local name for whoever it is. rolled off the tree where she stands, so the
  // man who wants her sword is a man who could actually be in this town.
  threatName() {
    const here = this.figuresHere().filter((f) => !this.state.bonds[f.name]);
    if (here.length) return this.pick(here).name;
    const f = this.factionsHere()[0];
    return f ? `a man who runs errands for ${f.name}` : 'a man with nothing and good eyes';
  }

  threatTick() {
    const s = this.state;

    // ── the ones that have come due
    for (const t of [...s.threats]) {
      if (s.day >= t.dueOn) { s.threats = s.threats.filter((x) => x !== t); this.resolveThreat(t); }
    }

    // ── she may spot it herself, in time, if her eye is good enough. this is the same stat
    //    that keeps her alive everywhere else, doing the same job.
    for (const t of s.threats) {
      if (t.noticed || t.warned) continue;
      if (this.chance(clamp(this.st('eye') * 0.16, 0, 0.32))) {
        t.noticed = true;
        this.speak(this.pick([
          `Somebody has been watching me. I clocked him. I am not blind, whatever you think.`,
          `There is a man who keeps being wherever I am. I have started sitting where I can see the door.`,
        ]), 'afraid');
        this.around(`she has seen him herself. she is watching the door now, and she is right to.`, 'threat', { threat: t.id });
      }
    }

    // ── it builds. the day after it begins, if she is still unready, you get a clearer look
    //    at it than she has — and a second chance to warn her.
    for (const t of s.threats) {
      if (s.day !== t.bornOn + 1 || t.warned || t.noticed || t.escalated) continue;
      t.escalated = true;
      this.around(t.kind === 'theft'
        ? `${t.who} knows which inn she is in now. somebody told him. tonight, most likely.`
        : `${t.who} has taken the road out of ${t.at} with two others, to where it narrows. they are waiting.`,
        'threat', { threat: t.id, warn: true });
    }

    // ── and sometimes a new one begins. she is carrying something worth taking, or she has
    //    made herself loud, and this is the country noticing.
    if (s.threats.length) return;                       // one at a time. she has enough to carry.
    if (s.day - (s.lastThreat ?? -THREAT_GAP) < THREAT_GAP) return;
    const carryingWorth = best(s.kit)?.worth ?? 0;
    const rich = s.coin >= 120 || carryingWorth >= 80;
    const loud = s.attention >= 6;
    if (!(rich || loud)) return;
    if (!this.chance(0.10 + 0.06 * Math.max(0, this.off('reckless')))) return;

    this.spawnThreat(rich && this.chance(0.5) ? 'theft' : 'ambush', this.threatName());
  }

  spawnThreat(kind, who) {
    const s = this.state;
    const at = this.here().name;
    const t = {
      id: `threat_${s.day}_${kind}`, kind, who, at,
      bornOn: s.day, dueOn: s.day + this.int(2, 3),
      told: false, warned: false, noticed: false, escalated: false,
    };
    s.threats.push(t);
    s.lastThreat = s.day;
    this.around(kind === 'theft'
      ? `${who} watched her count out her coin at ${at}, and did the arithmetic, and has not stopped doing it.`
      : `${who} saw what she is carrying out of ${at}. he wants it, and he has friends, and she has not noticed any of them.`,
      'threat', { threat: t.id, warn: true });
  }

  // YOU WARN HER. An input like a blessing: it lands on Faith. If she still believes you are
  // there, she takes it and readies for the thing; if she has stopped, she cannot make out
  // what you are trying to tell her, and it lands on nothing.
  warn(id) {
    const s = this.state;
    const t = s.threats.find((x) => x.id === id);
    if (!t || t.told) return;
    t.told = true;

    if (this.eff('faith') >= WARN_FAITH) {
      t.warned = true;
      this.speak(this.pick([
        `You are trying to tell me something. I do not know how you know, and I have stopped asking. I will watch for it.`,
        `All right. I felt that. I do not like the feeling and I have learned not to argue with it.`,
        `There is something coming. You would not push at me like this for nothing. I am ready.`,
      ]), 'afraid');
      this.around(`she took the warning. she is ready for it now, because of you.`, 'threat', { threat: t.id });
    } else {
      this.speak(this.fresh(VOICE.cold), 'cold');
      this.around(`you tried to warn her, and it landed on nothing. she has stopped believing there is anyone there to feel.`, 'threat', { threat: t.id });
    }
  }

  resolveThreat(t) {
    const s = this.state;
    const ready = t.warned || t.noticed;
    // being ready is not the same as getting clear — her eye and her feet decide whether the
    // warning turns into a dodge. a warning she cannot act on does not save her.
    const dodged = ready && this.chance(clamp(0.5 + this.st('eye') * 0.3 + this.st('foot') * 0.2, 0, 0.95));

    if (dodged) {
      this.condition('faith', +1, 'you saw it coming, and you were right');
      const how = t.warned ? `You told me, Angel. I still do not know how.` : `I felt it first this time.`;
      this.say(t.kind === 'theft'
        ? `Somebody meant to rob me at ${t.at}. I moved my coin, moved my bed, and sat up with a knife across my knees. In the morning my door had been tried. ${how} I was ready.`
        : `They were waiting on the road out of ${t.at} — ${t.who} and two others, where it narrows. I did not take that road. ${how} I slept badly and I slept alive.`,
        'event', { id: 'dodged' });
      return;
    }

    if (t.kind === 'theft') {
      const took = Math.round(s.coin * 0.4) + this.int(10, 40);
      s.coin = Math.max(0, s.coin - Math.min(s.coin, took));
      s.attention += 1;
      const prize = best(s.kit);
      const lostIt = prize && this.chance(0.5);
      if (lostIt) s.kit = s.kit.filter((i) => i !== prize);
      this.drift('reckless', -0.02);
      this.speak(this.fresh(OF_KIT.lost), 'cold');
      this.say(`I was robbed at ${t.at} in the night. ${took} coin gone${lostIt ? `, and ${prize.name} with it` : ''}. ${ready ? 'I was warned and still not quick enough, and that is on me.' : `I never saw ${t.who} coming, and I should have.`}`,
        'loss', { id: 'robbed' });
      return;
    }

    // an ambush. it lands, and it lands hard, because nobody turned it aside.
    s.lived.fights++;
    this.use('hand', 2);
    this.use('nerve', 2);
    s.attention += 1;
    const bad = this.chance(0.5);
    s.wounds += bad ? 2 : 1;
    if (bad) s.lived.hurt_badly++;
    this.drift('reckless', -0.03);
    this.say(`I was ambushed on the road out of ${t.at} — ${t.who} and two others. I fought them off and took ${bad ? 'a wound that went deep' : 'a cut for my trouble'}. ${ready ? 'I was ready and it still cost me this much.' : 'I did not see it coming. I should have. I am telling you so one of us remembers.'}`,
      'hunt', { id: 'ambushed' });

    // BADLY HURT, AND SHE ASKS YOU THE ONE THING. "Will I live?" — plainly, the way she never
    // does, because there is nobody on that road but you.
    if (bad && this.chance(0.7)) this.plea(t);
    else this.speak(this.fresh(VOICE.hurt), 'hurt');
  }

  // ─────────────────────────────────────────────────────────── will I live, Angel
  plea(t) {
    const s = this.state;
    if (s.pending.some((p) => p.kind === 'plea')) return;
    s.pending.push({
      id: `plea_${s.day}`, kind: 'plea', raisedOn: s.day, dueOn: s.day + 2,
      prompt: `It went deep, Angel. I have stopped the worst of the bleeding and I am not sure it is enough. I am asking your favor, plainly, the way I never do. Will I live?`,
      options: { hold: 'Tell her to hold on', quiet: 'Say nothing' },
    });
  }

  resolvePlea(j, key, by) {
    const s = this.state;
    if (key === 'hold') {
      this.condition('faith', +2, 'you answered when it mattered most');
      this.condition('heart', +1, 'held on');
      // hope is not medicine. but a woman who believes she is being kept alive fights to stay
      // alive, and sometimes that is the whole of it.
      if (this.chance(0.6)) s.wounds = Math.max(0, s.wounds - 1);
      if (by === 'you') this.speak(this.pick([
        `You told me to hold on. So I held on. I want it written down that I held on because you told me to.`,
        `I am going to live. You do not get to take the credit for that and you are going to anyway.`,
      ]), 'close');
    } else {
      this.condition('faith', FAITH.absent, 'silence, in the dark, at the worst of it');
      this.speak(this.fresh(VOICE.absent), 'absent');
    }
    s.log.push({
      day: s.day, kind: 'judgment', by, id: j.id, feed: 'her',
      text: key === 'hold'
        ? `I asked whether I would live, and you told me to hold on. [${by === 'you' ? 'you' : 'she'} decided]`
        : `I asked whether I would live, and heard nothing back. [${by === 'you' ? 'you' : 'she'} decided]`,
    });
  }

  // ───────────────────────────────────────────────── is this what peace is, Angel
  // A woven choice: not a crisis, just a quiet night and a question she turns to you with.
  // Your answer nudges who she becomes — toward the road alone, or toward people — and a
  // woman who is not a deep thinker is left turning "somewhat" over and getting nowhere.
  reflect() {
    const s = this.state;
    if (s.pending.length) return;   // she does not muse about peace with anything else unanswered
    if (s.wounds > 0 || s.attention >= 8 || this.eff('heart') < 7) return;   // only when she is genuinely at rest
    if (s.day - (s.lastReflect ?? -30) < 20) return;
    if (!this.chance(0.045)) return;
    s.lastReflect = s.day;
    s.pending.push({
      id: `reflect_${s.day}`, kind: 'reflect', raisedOn: s.day, dueOn: s.day + 3,
      prompt: `I got a room. Bolt on the inside of the door, coin in my boot, nothing hunting me tonight. I have been sitting here a while now. Is this what peace is, Angel?`,
      options: { yes: 'Yes', no: 'No', somewhat: 'Somewhat' },
    });
  }

  resolveReflect(j, key, by) {
    const s = this.state;
    if (key === 'yes') {
      this.drift('sociable', -0.03);
      this.condition('heart', +1, 'peace');
      this.speak(`Then I will take it. Just me, the bolt, and you. I have had worse company and worse locks.`, 'close');
    } else if (key === 'no') {
      this.drift('sociable', +0.04);
      this.speak(`No. I did not think so either. A locked room is not the same as not being alone in it. I should find someone before I forget how.`, 'close');
    } else {
      // SOMEWHAT. A considered answer for a woman with the wits to hold it — and a snare for
      // one without, who cannot keep the shape of it and is left worse than before she asked.
      if (this.eff('eye') + this.eff('nerve') >= 20) {
        this.speak(`Somewhat. It is peace and it is a held breath at the same time, and I have learned to live in the difference.`, 'close');
      } else {
        this.condition('heart', -1, 'left turning it over');
        this.speak(`Somewhat. I cannot — I cannot hold the shape of that. It slips when I look at it straight. I am better with a road than a question and now I am up all night with the question.`, 'cold');
      }
    }
    s.log.push({
      day: s.day, kind: 'judgment', by, id: j.id, feed: 'her',
      text: `I asked you whether this was peace, and you answered. [${by === 'you' ? 'you' : 'she'} decided]`,
    });
  }

  // ============================================================== THE WORLD TICK
  // It runs whether she is there or not. Nothing in here writes to her chronicle —
  // it writes to `news`, and the LENS decides what she ever hears about.
  worldTick() {
    if (!this.chance(0.14)) return;          // the world does not lurch every day

    const countries = this.sites.filter((s) => s.node.scale === 'country' || s.node.scale === 'region');
    if (!countries.length) return;
    const target = this.pick(countries).node;
    const roll = this.rng();

    // --- a faction moves. the interesting case is the UNAWARE cell: the supreme
    //     gives an order a chapter does not know it is supposed to obey, and the
    //     organisation walks into its own fault line without anyone deciding to.
    const factions = target.children.filter((c) => c.kind === 'faction');
    if (roll < 0.3 && factions.length) {
      const f = this.pick(factions);
      if (f.relationship_to_center?.startsWith('unaware')) {
        this.news(`${f.name} at ${target.name} has done something its own leadership did not order, and does not know it`, target);
      } else if (f.center === 'supreme') {
        this.news(`${f.name} is moving, and it is moving from ${target.name}`, target);
      } else {
        f.relationship_to_center = this.pick(['in open schism, and winning', 'loyal, resentfully', 'estranged; they still send the money']);
        this.news(`${f.name} at ${target.name} has broken with whoever it answers to`, target);
      }
      return;
    }

    // --- the law tightens. she will feel this in the toll next week.
    if (roll < 0.55) {
      const e = (target.economy ??= {});
      e.pressure = (e.pressure ?? 0) + 1;
      this.news(`${target.name} has put its tolls up overnight and given no reason`, target);
      return;
    }

    // --- a figure acts on what they WANT. figures are people; people do things.
    const figs = target.children.filter((c) => c.kind === 'figure' && c.wants);
    if (roll < 0.75 && figs.length) {
      const f = this.pick(figs);
      this.news(`${f.name} has moved on what they want, and what they want is ${f.wants}`, target);
      return;
    }

    // --- A COUNTRY FALLS, AND BECOMES AN ERA.
    //     This is the one the whole schema was built for: `era` nodes have the same
    //     shape as places, so the simulation does not merely READ the world — it
    //     WRITES history, in the same format the seed used to create it. The world
    //     she comes back to has a past it did not start with.
    if (roll < 0.85 && !target.status && this.chance(0.5)) {
      const era = {
        kind: 'era',
        name: `The ${target.name.replace(/^[Tt]he /, '')} Years`,
        years: `?–${this.state.day} (she was there)`,
        status: 'transformed',
        why_it_ended: this.pick([
          'the seam ran out, and the country was the seam',
          'they won, and could not afford it',
          'a bad winter, then a worse spring, then nobody',
          'the strike held, and then it did not, and then there was nothing to strike against',
        ]),
        became: this.pick([
          'the neighbours split it and neither will admit the border is a compromise',
          'a ruin people dig in, and a name people use for a kind of arrogance',
          'the same clerks, the same ledgers, a new name over the door',
        ]),
        children: [],
        history: [],
      };
      target.history.push(era);
      target.status = 'transformed';
      this.state.eras++;
      this.news(`${target.name} has fallen. ${era.why_it_ended}`, target, 3);
      return;
    }

    // --- unrest where the exception is steepest. somebody is holding it down.
    const steep = countries.filter((s) => (s.node.divergences?.length ?? 0) > 1);
    if (steep.length) {
      const s = this.pick(steep);
      s.node.unrest = (s.node.unrest ?? 0) + 1;
      this.news(`there is trouble at ${s.node.name}, and it is the kind that does not settle`, s.node);
    }
  }

  // The world does not tell her. It puts a fact into the air, at a distance, and the
  // fact takes time to travel. `delay` is how many days before it can reach her at all.
  news(text, where, delay = 2) {
    // the same thing does not happen twice. two identical items in the queue got
    // delivered as two identical rumours on consecutive days, which reads as a bug
    // because it is one.
    if (this.state.news.some((n) => n.text === text)) return;
    this.state.news.push({ text, where: where?.name ?? null, on: this.state.day, delay });
    // AND YOU SEE IT HAPPEN. The world feed is the Angel's sight: the event goes up here the
    // day it happens, in the third person, while she is still days from hearing of it — if she
    // ever does. The gap between this line and the one she eventually writes is the lens.
    this.around(`${text}.`, 'world');
  }

  // ==================================================================== THE LENS
  // What could she plausibly have learned?
  //
  // TWO CHANNELS, and the distinction is the whole rule:
  //
  //   WITNESSED — it happened to the street she was standing on. No delay, no
  //               source, no "she heard". The price of bread told her before anyone
  //               did.
  //   HEARD     — it happened somewhere else. It takes days to reach her, it arrives
  //               secondhand, and it arrives from somebody who is frightened.
  //
  // Getting this wrong is what makes a chronicle read like a newsfeed: the first
  // version had her "hearing a rumour" that the tolls had gone up in the town she was
  // physically standing in. She would have SEEN that.
  lens() {
    const here = this.here().name;

    // things happening where she is reach her immediately, because she is there
    const witnessed = this.state.news.find((n) => n.where === here);
    if (witnessed) {
      this.state.news = this.state.news.filter((n) => n !== witnessed);
      return { text: this.line('witness', { news: witnessed.text }), kind: 'witness' };
    }

    const ready = this.state.news.filter((n) => this.state.day - n.on >= n.delay);
    if (!ready.length) return null;

    const item = this.pick(ready);
    this.state.news = this.state.news.filter((n) => n !== item);
    return { text: this.line('rumour', { news: item.text }), kind: 'rumour' };
  }

  // ==================================================================== HER TICK
  herTick() {
    const s = this.state;
    const hurt = clamp(s.wounds / 5, 0, 1);
    const unrest = this.unrest() + (this.here().unrest ?? 0);
    const tier = this.law('technology')?.tier ?? 3;
    const pressure = this.law('economy')?.pressure ?? 0;

    const factions = this.factionsHere();
    const friends = factions.filter((f) => this.standing(f.name) >= 6);
    const enemies = factions.filter((f) => this.standing(f.name) <= -8);
    const figures = this.figuresHere();
    const market = this.here().scale === 'city' || this.here().scale === 'town';

    // weights. a hurt woman does not go looking for a fight; a rich country has more
    // law in it; a steep divergence has more violence in it.
    const w = {
      road: 22 - 8 * this.off('reckless'),
      work: 12 + 5 * hurt + 2 * (tier / 7),
      rest: 6 + 14 * hurt,
      law: 4 + 3 * (tier / 7) + 2 * pressure,
      defy: 3 + 6 * this.off('reckless'),
      find: 5 + 4 * this.off('reckless') + (this.here().status ? 4 : 0),
      relic: 2 + 2 * this.off('reckless'),
      danger: (4 + 8 * this.off('reckless') + unrest) * (1 - 0.7 * hurt) * (1 + this.bonus('danger_weight')),
      unrest: unrest * 1.5,
      sick: 3,
      travel: 5 + 3 * this.off('reckless'),
      // There is a market here and she has money in her pocket. That is the whole of the
      // condition — she does not go shopping on a mountain.
      buy: market && s.coin >= 70 ? 3 + Math.min(4, s.coin / 220) : 0,

      // SHE GIVES. Generosity had almost no daily expression — it moved whether she sold a
      // sworn blade and whether she armed a companion, and that was all, so the dial you set
      // to "gives" mostly did nothing you could see. A generous woman gives: to the people in
      // the room, to whoever is worse off, on the road. It is where the Open Hand is earned,
      // and it is the one place a benevolent reputation (Name) is built without a fight.
      give: (figures.length || market) && s.coin >= 20
        ? Math.max(0, 2 + 6 * this.off('generous'))
        : 0,

      // THE BOARD, AND THE THING ON IT. A posting is read where people are; a beast is
      // fought where it lives. And she goes at the one she took the money for far harder
      // than at the one she merely walked into.
      board: market && !s.bounty && this.quarry().length ? 4 : 0,
      // SHE IS NOT AN IDIOT, AND THIS COST HER HER LIFE FORTY-ONE TIMES IN SIXTY.
      //
      // Unguarded, she picked a fight with anything standing in the same town — including
      // things four times her weight — and mortality doubled against the pre-hunting
      // baseline. A woman with an eye does not walk into that. She walks AROUND it, and she
      // has been walking around things her whole life.
      //
      // The exception is a bounty: she took the money, and she goes, ready or not. That is
      // what taking the money means, and it is why she asks YOU first.
      hunt: this.beastHere()
        ? (s.bounty?.at === s.at ? 24
           : this.might() >= this.beastHere().power - 0.5 ? 2 + 5 * this.off('reckless') : 0)
        : 0,
      figure_meet: figures.length ? 9 + 8 * this.off('sociable') : 0,
      figure_clash: figures.length ? 2 + 4 * this.off('reckless') : 0,
      faction_favour: friends.length ? 5 : 0,
      faction_shelter: friends.length ? 3 + 6 * hurt : 0,
      faction_hunted: enemies.length ? 6 : 0,
      // the more the watching power has noticed, the likelier it is to do something
      power: Math.max(0, (s.attention - 8) * 0.7),
    };

    // THE NAME CHANGES WHAT THE DAYS ARE MADE OF. This is the real weight of a calling and
    // it is not a stat bonus: a Toll-Breaker is not merely better at defying, she is
    // OFFERED more of it — the gate-houses know her, and the men who want her found have
    // her description. She cannot go back to being a woman who works and rests.
    //
    // A CALLING CANNOT CONJURE AN ACT WHOSE PRECONDITION IS NOT THERE. A weight of zero
    // above is not "unlikely" — it is IMPOSSIBLE: there are no enemies in this town, there
    // is no market on this mountain, there is nobody here to meet. A Toll-Breaker is hunted
    // more by the people who want her, and she is not hunted by nobody. (This shipped as a
    // crash for exactly ten minutes: `faction_hunted` lifted off zero, and then `do()` went
    // looking for an enemy to be hunted by, in an empty list.)
    for (const [k, d] of Object.entries(CALLINGS[s.calling]?.weights ?? {})) {
      if (w[k] > 0) w[k] = Math.max(0, w[k] + d);
    }

    const keys = Object.keys(w).filter((k) => w[k] > 0);
    const total = keys.reduce((a, k) => a + w[k], 0);
    let r = this.rng() * total;
    let act = keys[keys.length - 1];
    for (const k of keys) { r -= w[k]; if (r <= 0) { act = k; break; } }

    this.do(act, { factions, friends, enemies, figures });
  }

  do(act, ctx) {
    const s = this.state;
    const econ = this.law('economy') ?? {};
    const tier = this.law('technology')?.tier ?? 3;
    const wealth = 0.5 + tier / 7;

    switch (act) {
      case 'road':
        s.coin += this.int(2, 8);
        return this.say(this.line('road'), 'event', { id: act });

      case 'work': {
        s.lived.worked++;
        this.use('body');
        const pay = Math.round(this.int(18, 40) * wealth * (1 + this.bonus('earn')));
        s.coin += pay;
        s.wounds = Math.max(0, s.wounds - 1);
        // working is how the country's own factions learn who she is
        for (const f of ctx.factions) this.nudge(f.name, f.kind === 'order' ? 0.4 : 0);
        return this.say(this.line('work', { coin: pay }), 'event', { id: act });
      }

      case 'rest':
        if (s.wounds > 0 && this.chance(0.7)) s.wounds--;
        return this.say(this.line('rest'), 'event', { id: act });

      case 'law': {
        s.lived.paid++;
        this.use('tongue');
        // A tongue is worth money — and so is a piece of paper with the right seal on it,
        // in the country that seal is good in. A writ she cannot read is worse than none:
        // presenting a document you do not understand is how people get arrested.
        this.strain('law');
        const toll = Math.round(
          this.int(10, 40) * (0.5 + tier / 6) * (1 + (econ.pressure ?? 0) * 0.4)
          * Math.max(0.1, 1 + this.bonus('toll') - this.st('tongue') * 0.45));

        // SHE CANNOT PAY IT. So they take something, and they take the good one, and this
        // is why an object in this game has to be losable to be worth having. But she will
        // not hand over the Angel's gift for a toll — she gives them the best of the rest, or
        // makes a scene; only outright force (robbery, betrayal) ever takes a kept thing.
        const sellable = s.kit.filter((i) => !i.kept);
        if (toll > s.coin && sellable.length && this.chance(0.5)) {
          const took = best(sellable);
          s.kit = s.kit.filter((i) => i !== took);
          s.attention += 1;
          this.speak(this.fresh(OF_KIT.sold), 'cold');
          return this.say(
            `she could not pay at ${this.here().name}, so they took ${took.name} instead. it was ${took.from}.`,
            'kit', { id: act });
        }

        const paid = Math.min(s.coin, toll);
        s.coin -= paid;
        s.attention += 1;
        for (const f of ctx.factions) this.nudge(f.name, 0.5);   // compliance is noticed
        return this.say(this.line('law', { coin: paid }), 'event', { id: act });
      }

      // ─────────────────────────────────────────────────────────────────── SHE BUYS
      // There is a market here and money in her pocket. What is on the stall came out of
      // the ground under it — she cannot buy a bone-glass knife in a country with no seam.
      case 'buy': {
        const it = this.mintHere();
        if (!it) return this.say(this.line('road'), 'event', { id: 'road' });

        // SHE IS NOT AN IDIOT. She mostly walks past the thing she cannot use — mostly,
        // because people do buy the coat they intend to grow into, and a reckless woman
        // does it more. Without this she spent five hundred coin on a lens she could not
        // focus, twice, in a fortnight.
        if (underAsk(it, s) && !this.chance(0.12 + 0.18 * Math.max(0, this.off('reckless')))) {
          return this.say(
            `I priced ${it.name} at ${this.here().name} and put it back. It is more than I can handle and I know exactly by how much.`,
            'kit', { id: act });
        }

        const price = Math.round(it.worth * (1.1 - this.st('tongue') * 0.3));
        if (price > s.coin) {
          return this.say(
            `I priced ${it.name} at ${this.here().name} and walked away from it, and I have thought about it every day since.`,
            'kit', { id: act });
        }
        this.use('tongue');
        s.coin -= price;
        if (!this.gain(it, FROM.bought(this.here().name))) {
          s.coin += price;   // she already had better. she put it back.
          return this.say(`I looked at ${it.name} at ${this.here().name} and decided that what I have is better.`, 'kit', { id: act });
        }
        if (this.chance(0.4)) this.speak(this.fresh(OF_KIT.bought), 'close');
        return this.say(
          `I bought ${it.name} at ${this.here().name}, for ${price} coin.` +
          (underAsk(it, s) ? ' It is more than I can handle, and I knew that when I paid for it.' : ''),
          'kit', { id: act });
      }

      // ─────────────────────────────────────────────────────────────── SHE GIVES
      // Not a transaction. A thing handed to somebody who needed it more, with nothing asked
      // back — which is exactly why it builds her a KIND name and not a feared one, and why
      // it slowly refills the Heart that everything else in this game spends.
      case 'give': {
        s.lived.gave++;
        const alms = Math.min(s.coin, this.int(5, 25));
        s.coin -= alms;
        this.condition('heart', HEART.kindness, 'gave');
        // a kind name travels, slowly, and the orders remember who is easy with them
        if (this.chance(0.4)) this.use('name');
        for (const f of ctx.factions) this.nudge(f.name, f.kind === 'order' ? 0.4 : 0);
        return this.say(this.pick([
          `I gave what I had at ${this.here().name} — ${alms} coin, and no name to go with it — to somebody who needed it more, and did not stay to be thanked.`,
          `There was a family at ${this.here().name} with less than I have, which is not a high bar, and I left them the difference and moved on before the crying started.`,
          `I paid a stranger's toll at ${this.here().name} and told them it was already settled. It was not. It is now.`,
          `I have started leaving coin where the hungry ones at ${this.here().name} will find it and I will not have to watch them take it.`,
        ]), 'event', { id: act });
      }

      case 'defy':
        s.lived.defied++;
        this.use('tongue', 2);
        this.use('nerve', 2);
        this.use('name', 2);      // word of it travels. that is what a name IS.
        // NERVE decides how loud she is to the thing that is counting. a woman who does
        // not shake is a woman it takes longer to find.
        s.attention += Math.max(1, Math.round((2 + this.bonus('attention_rate')) * (1 - this.st('nerve') * 0.55)));
        // and a tongue talks her out of the beating
        if (this.chance(Math.max(0.05, 0.45 - this.st('tongue') * 0.5))) s.wounds += 1;
        this.drift('reckless', +0.03);
        for (const f of ctx.factions) this.nudge(f.name, f.kind === 'crime' ? 1.6 : -1.2);
        return this.say(this.line('defy'), 'event', { id: act });

      case 'find': {
        this.use('eye', 3);
        s.lived.found++;
        this.strain('find');
        // SOMETIMES IT IS NOT COIN. It is a thing, in the ground, where the last person to
        // hold it left it.
        if (this.chance(0.22 + this.st('eye') * 0.2)) {
          // things, not paperwork. nobody buries a writ.
          const it = this.mintHere(this.pick(['blade', 'coat', 'boot', 'glass']));
          if (it && this.gain(it, FROM.found(this.here().name))) {
            return this.say(`she dug ${it.name} out of the ground at ${this.here().name}. somebody put it there, and did not come back for it.`, 'kit', { id: act });
          }
        }
        const take = Math.round(this.int(20, 90) * wealth * (1 + this.st('eye') * 0.6 + this.bonus('find')));
        s.coin += take;
        return this.say(this.line('find', { coin: take }), 'event', { id: act });
      }

      case 'relic': {
        this.use('eye');
        s.lived.found++;
        s.attention += Math.max(1, Math.round((2 + this.bonus('attention_rate')) * (1 - this.st('nerve') * 0.5)));
        // THE WORLD'S OWN MAGIC, WITH THE WORLD'S OWN PRICE WRITTEN ON THE SIDE OF IT.
        if (this.chance(0.18)) {
          const it = this.mintHere('relic');
          if (it && this.gain(it, FROM.found(this.here().name))) {
            return this.say(
              `she came away from ${this.here().name} with ${it.name}. she knows what it costs — it does not hide what it costs — and she took it anyway.`,
              'kit', { id: act });
          }
        }
        return this.say(this.line('relic'), 'event', { id: act });
      }

      case 'danger': {
        if (this.chance(0.3)) this.use('name');   // people talk about the ones who win

        // ── RECONCILIATION. Nothing on earth unmakes a rivalry like the two of you
        //    coming out the other side of something. People do not forgive each other in
        //    conversations. They forgive each other in ditches.
        const enemyHere = this.figuresHere()
          .map((f) => s.bonds[f.name])
          .filter((b) => b && b.alive && b.friction >= 7);
        if (enemyHere.length && this.chance(0.22)) {
          const b = this.pick(enemyHere);
          shift(b, { friction: -6, trust: +3, closeness: +2 },
            `it came for both of them at ${this.here().name}, and they got out, together`, s.day, true);
          this.say(this.pick([
            `it came for her and ${b.who} at ${this.here().name}, and they were back to back before either of them thought about it, and neither has mentioned it since.`,
            `she and ${b.who} came out of it at ${this.here().name} together. they have not spoken about the thing between them. it is smaller than it was.`,
          ]), 'bond');
          this.speak(this.pick([
            `I would have let ${b.who} drown last month. I pulled them out today. I have not worked out what that means.`,
            `${b.who} and I are not friends. We got out of that together and I do not know what we are.`,
          ]), 'close');
          return;
        }

        // ── A LIFE SAVED IS A DEBT, AND IT IS THE MOST HUMAN THING IN THIS FILE.
        //
        // Somebody steps into a blade that had her name on it. Now she owes them, and
        // owing somebody is not the same as loving them — it can sit alongside friction
        // and make it worse, because there is nothing that grates like being in debt to a
        // person you cannot stand. `owes` was in the model from the beginning and nothing
        // ever set it. This sets it.
        const with_ = this.withHer();
        // AND THE ONE SHE ARMED IS THE ONE WHO CAN REACH HER IN TIME. That is what the
        // spare knife was for. She did not know that when she handed it over.
        const armed = with_.filter((x) => x.carries).length;
        if (with_.length && s.wounds >= 3 && this.chance(0.3 + 0.15 * armed)) {
          const saver = this.pick(with_);
          s.wounds = Math.max(0, s.wounds - 2);
          shift(saver, { owes: +6, trust: +3, closeness: +2 },
            `they stepped into something that had her name on it, at ${this.here().name}`, s.day, true);
          this.condition('heart', +1, 'saved');
          this.speak(this.pick([
            `${saver.who} got in front of it. I did not ask them to. I would not have asked.`,
            `I am alive because of ${saver.who}. I have not said thank you. I do not know how to start.`,
          ]), 'close');
          return this.say(
            `it went badly at ${this.here().name}, and ${saver.who} took the blade that had her name on it. she is alive. she has not said thank you and does not know how.`,
            'bond');
        }
        // EYE: she saw it before it happened. this is the stat that stops a fight
        // being a fight, and it is why a woman with an eye lives longer than one with
        // a hand.
        if (this.chance(clamp(0.10 + this.st('eye') * 0.40, 0, 0.55))) {
          this.use('eye', 2);
          return this.say(this.pick([
            `she saw them at ${this.here().name} before they saw her, and took the long way round, and said nothing about it to anyone.`,
            `there was going to be trouble at ${this.here().name}. she was somewhere else by the time it arrived.`,
          ]), 'event', { id: 'avoided' });
        }

        s.lived.fights++;
        this.use('hand', 3);
        this.use('nerve', 2);

        // A BLADE SHE CANNOT HANDLE IS WORSE THAN NO BLADE. It is not a locked slot and it
        // is not a warning tooltip — it is a real, negative number, in the only place that
        // has ever mattered, and she has been telling you about it for weeks.
        const over = this.strain('danger') * 0.5;

        // her traits, her name, her kit and her hand are here, and only here, and she paid
        // for every one of them
        const swing = this.rng() * 2 - 1 + 0.4 * this.off('reckless') + this.bonus('swing') - over
          + this.st('hand') * 0.9 + this.st('nerve') * 0.45;

        // a coat is not a stat. it is two of the wounds that would have killed her.
        const soak = this.bonus('soak');

        if (swing < -0.45) {
          s.wounds += this.chance(soak) ? 1 : 2;
          s.lived.hurt_badly++;
          this.use('body', 3);   // she was hurt, and got up. that is how a body is made.
          s.coin = Math.max(0, s.coin - this.int(10, 50));
          this.drift('reckless', -0.05);

          // ── AND SOMETIMES IT DOES NOT HEAL. This is where the only downward pressure in
          //    the game comes from, and it still does not touch what she knows: her Hand is
          //    the same number it was this morning. The hand is not.
          if (this.chance(0.14 - soak * 0.2)) {
            this.mark(this.pick(['ruined_hand', 'limp', 'bad_eye', 'scarred']), `it went badly at ${this.here().name}`);
          }
        } else {
          s.wounds += 1;
          s.coin += this.int(10, 40);
          this.drift('reckless', +0.02);

          // SHE WON, AND THE OTHER ONE HAD A KNIFE. It is hers now, and the chronicle will
          // say where it came from for as long as she carries it.
          if (this.chance(0.16)) {
            const it = this.mintHere(this.chance(0.7) ? 'blade' : undefined);
            if (it && this.gain(it, FROM.taken(this.here().name))) {
              return this.say(`it went her way at ${this.here().name}. she came out of it with ${it.name}, off somebody who did not need it any more.`, 'kit', { id: act });
            }
          }
        }
        return this.say(this.line('danger'), 'event', { id: act });
      }

      case 'unrest':
        s.attention += 1;
        if (this.chance(0.3)) s.wounds += 1;
        return this.say(this.line('unrest'), 'event', { id: act });

      case 'sick':
        this.use('body', 2);
        // a body that has been ill enough times stops being ill
        if (!this.chance(Math.max(0, this.st('body')) * 0.5)) s.wounds += 1;
        return this.say(this.line('sick'), 'event', { id: act });

      case 'board':
        return this.readBoard();

      case 'hunt': {
        const beast = this.beastHere();
        if (!beast) return this.say(this.line('road'), 'event', { id: 'road' });
        return this.hunt(beast);
      }

      case 'travel':
        return this.travel();

      case 'power': {
        this.use('nerve', 3);
        const gods = this.world.children.filter((c) => c.kind === 'figure' && c.divine);
        const g = gods.length ? this.pick(gods) : null;
        s.attention = Math.max(0, s.attention - 4);
        s.coin = Math.max(0, s.coin - this.int(20, 90));
        if (this.chance(0.4)) s.wounds += 1;
        return this.say(
          this.pick([
            `they came for her at ${this.here().name} and did not say who sent them, and did not have to. ${g ? g.name : 'something'} has been counting.`,
            `she found her pack searched at ${this.here().name} and nothing taken, which is a message, and she has received it.`,
            `${g ? g.name : 'it'} has noticed her. at ${this.here().name} a man used her name, and she has never given it to anyone here.`,
            `there were people outside the inn at ${this.here().name} all night and they were not trying to hide it.`,
          ]),
          'power'
        );
      }

      case 'figure_meet': {
        this.drift('sociable', +0.02);
        return this.meet(this.pick(ctx.figures));
      }

      case 'figure_clash': {
        const f = this.pick(ctx.figures);
        const b = this.bond(f.name, f);
        s.attention += 1;
        this.use('nerve');
        // FRICTION. This is where it comes from — she crossed somebody, and the crossing
        // sticks. It cools later, slowly, and never all the way back to nothing.
        shift(b, { friction: +3, trust: -1 }, `she crossed them at ${this.here().name}`, s.day, true);
        return this.say(this.pick([
          `she and ${f.name} want the same thing at ${this.here().name}, and only one of them is going to have it, and neither has said so out loud.`,
          `${f.name} got there first at ${this.here().name}. she is telling herself it does not matter.`,
          `she crossed ${f.name} at ${this.here().name}. she did it deliberately. she is not sure why she did it deliberately.`,
          `${f.name} knows what she is now, near enough, and has said nothing, and the saying-nothing is the threat.`,
        ]), 'event', { id: act });
      }
      case 'faction_favour': {
        const f = this.pick(ctx.friends);
        this.nudge(f.name, 0.5);
        // A WRIT UNDER THEIR SEAL. Worth a great deal in the countries they operate in, and
        // exactly nothing one border over — which is the whole nature of a faction, and the
        // tree has always known where they operate, because placement IS scope.
        if (this.chance(0.25)) {
          const it = this.mintHere('token');
          if (it && this.gain(it, FROM.favour(f.name, this.here().name))) {
            return this.say(`${f.name} put ${it.name} into her hand at ${this.here().name}. it is worth a great deal here. it is worth nothing at all one country over.`, 'kit', { id: act });
          }
        }
        s.coin += this.int(8, 25);
        return this.say(this.line('faction_favour', { faction: f.name }), 'event', { id: act });
      }

      case 'faction_shelter': {
        const f = this.pick(ctx.friends);
        s.wounds = Math.max(0, s.wounds - 2);
        s.attention = Math.max(0, s.attention - 2);
        return this.say(this.line('faction_shelter', { faction: f.name }), 'event', { id: act });
      }

      case 'faction_hunted': {
        this.use('name');
        const f = this.pick(ctx.enemies);
        s.wounds += this.chance(0.4) ? 2 : 1;
        s.coin = Math.max(0, s.coin - this.int(10, 40));
        this.nudge(f.name, -0.5);
        return this.say(this.line('faction_hunted', { faction: f.name }), 'event', { id: act });
      }
    }
  }

  // She moves through the place TREE — to a sibling, up to the country that holds
  // her, or down into a city inside it. The player may have suggested somewhere; how
  // much of that suggestion survives is `heeds()`, which decays as she drifts.
  travel() {
    const from = this.site();
    const options = this.sites.filter((s) => s.i !== from.i);
    if (!options.length) return this.say(this.line('road'), 'event', { id: 'road' });

    const w = options.map((s) => {
      let x = 1;
      // the tree is the map: places that share a parent are near each other
      const shared = s.path.filter((p) => from.path.includes(p)).length;
      x *= 1 + shared;
      if (this.state.suggested === s.i) x += 8 * this.heeds();
      if (!this.state.seen.includes(s.i)) x += 1;
      // SHE TOOK THE MONEY. She is going there, and she does not need to be asked twice.
      if (this.state.bounty?.at === s.i) x += 14;
      if (s.node.status) x += 0.5 * this.off('reckless');   // a fallen place draws the reckless
      return Math.max(0.05, x);
    });

    const total = w.reduce((a, b) => a + b, 0);
    let r = this.rng() * total;
    let to = options[options.length - 1];
    for (let k = 0; k < options.length; k++) { r -= w[k]; if (r <= 0) { to = options[k]; break; } }

    this.state.at = to.i;
    if (!this.state.seen.includes(to.i)) this.state.seen.push(to.i);
    this.state.lived.travelled++;
    this.use('foot', 3);
    const foot = this.st('foot');
    // a coat she cannot carry is a punishment on the road, and boots she cannot fill are
    // the same punishment twice
    const heavy = this.strain('travel') * 0.35;
    this.state.coin = Math.max(0, this.state.coin - Math.round(this.int(5, 18) * Math.max(0.15, 1 + this.bonus('travel_cost') + heavy - foot * 0.4)));
    if (this.chance(Math.max(0.02, (0.15 - foot * 0.09) * (1 + this.bonus('travel_wound') + heavy)))) this.state.wounds += 1;

    // the arrival is rendered from where she now IS, so the vocabulary (commodity,
    // who pays, the law) is already the new country's before the sentence is written
    return this.say(this.line('arrive', { from: from.node.name }), 'travel', { id: 'travel' });
  }

  // how much of the player's suggestion survives contact with the woman she has
  // become. falls as `true` drifts from `intent`.
  // How much of your word she takes. TWO THINGS DECIDE IT, and they are different
  // questions:
  //
  //   FAITH — does she believe you are there, and that it helps? This one is YOURS. It
  //           rises when you answer her and falls when she asks and you do not come.
  //   DRIFT — is she still the woman you asked for? This one is the WORLD'S. It moves
  //           whether you show up or not.
  //
  // A woman can believe in you completely and still have become someone who cannot do
  // what you want. And a woman can be exactly who you asked for and have stopped
  // believing anyone is listening. Those are sad in different ways and the game should
  // be able to tell them apart.
  heeds() {
    const gap = ['reckless', 'sociable', 'generous']
      .reduce((m, d) => m + Math.abs(this.state.true[d] - this.state.intent[d]), 0) / 3;
    const drift = clamp(1 - gap / 26, 0.15, 1);
    const faith = clamp(this.eff('faith') / 14, 0.08, 1);
    return clamp(drift * faith, 0.04, 1);
  }

  // what happens to her changes her. this is the only thing that does.
  drift(dial, d) {
    this.state.true[dial] = clamp(this.state.true[dial] + d * 22, 0, 100);
  }

  // the half of a trait she did not want. Haunted makes her reckless; Alone closes her.
  applyTraitDrift() {
    const r = this.trait('reckless_drift');
    const so = this.trait('sociable_drift');
    if (r) this.drift('reckless', r * 0.02);
    if (so) this.drift('sociable', so * 0.02);
  }

  // The slider is a REQUEST. This is the weak hand pulling her back toward it — and it
  // has to be weak, or she can never become anyone. At 0.012 it dragged her back to
  // your dials every single day, she never drifted more than a point or two, and the
  // game's best card was never dealt: after three hundred days she still heeded you at
  // 99%, and the cold voice was mathematically unreachable.
  applyIntentPull() {
    for (const d of ['reckless', 'sociable', 'generous']) {
      const gap = this.state.intent[d] - this.state.true[d];
      this.state.true[d] = clamp(this.state.true[d] + gap * 0.003, 0, 100);
    }
  }

  // ================================================================ THE PEOPLE
  //
  // Not a friends list. Every person she has dealt with has a BOND, and a bond runs on
  // two axes at once — closeness and friction — because you can love somebody and be
  // furious with them, and a single number cannot say that.
  //
  // And nobody exists alone. Getting close to one person moves her against everybody
  // they are tangled with: their kin, their rivals, the people who answer to the same
  // men they do. A friendship is a POSITION, whether or not she meant it as one, and the
  // world files her accordingly.

  bond(name, node) {
    const s = this.state;
    if (!s.bonds[name]) {
      const b = newBond(name, node ?? null, s.day);
      // HER NAME GOT HERE BEFORE SHE DID. Whatever the room already decided about her —
      // because of who she drinks with, whose cousin she buried, whose rival she took the
      // side of — is what she is walking into. The bigger her Name, the more of it
      // reached them. She cannot put that down.
      const heard = s.predisposed[name] ?? 0;
      if (heard) {
        const carried = heard * clamp(0.4 + this.st('name'), 0.3, 1.6);
        if (carried > 0) b.friction = clamp(carried, 0, 14);
        else b.closeness = clamp(-carried, 0, 8);
        b.preceded = true;
        delete s.predisposed[name];
      }
      s.bonds[name] = b;
    }
    if (node && !s.bonds[name].node) s.bonds[name].node = node;
    return s.bonds[name];
  }
  bondList() { return Object.values(this.state.bonds); }
  withHer() { return this.bondList().filter((b) => b.withHer && b.alive); }

  // She got closer to somebody. The room notices.
  ripple(name, magnitude = 1) {
    const s = this.state;
    for (const e of sideEffects(this.web, name)) {
      // ── SHE HAS NOT MET THEM. She does not have a relationship with a man she has
      //    never seen — but he has one with her. Her name got there first. It waits, and
      //    it is the first thing he knows about her when she walks in.
      if (!s.bonds[e.other]) {
        s.predisposed[e.other] = (s.predisposed[e.other] ?? 0)
          + ((e.friction ?? 0) - (e.closeness ?? 0)) * magnitude;
        continue;
      }
      const b = s.bonds[e.other];
      const was = b.friction;
      shift(b, {
        closeness: (e.closeness ?? 0) * magnitude,
        friction: (e.friction ?? 0) * magnitude,
      }, e.why, s.day, (e.friction ?? 0) > 0 && was < 4);
    }
  }

  // ───────────────────────────────────────────────────────────── meeting people
  meet(f) {
    const s = this.state;
    const first = !s.bonds[f.name];
    const b = this.bond(f.name, f);
    const k = kindOf(b);
    this.use('tongue');

    // her name arrived first, and it had already been read
    if (first && b.preceded) {
      this.use('name');
      return this.say(
        b.friction > 0
          ? `${f.name} knew who I was at ${this.here().name} before I said a word, and had already decided. I have stopped being surprised by this and I have not stopped minding it.`
          : `${f.name} had heard of me at ${this.here().name}, and was pleased to, and I cannot work out whether that is worse.`,
        'event', { id: 'meet' });
    }

    // What passes between them depends on what is ALREADY between them. A meeting with a
    // rival is not a meeting with a friend, and she does not get to choose which.
    if (k === 'enemy' || k === 'feud') {
      shift(b, { friction: +1 }, null, s.day);
      this.use('nerve');
      return this.say(this.pick([
        `${f.name} was at ${this.here().name}. Neither of us left, and neither of us spoke, and the whole room understood.`,
        `${f.name} and I were in one room at ${this.here().name} for an hour. I counted every minute of it.`,
      ]), 'event', { id: 'meet' });
    }

    if (k === 'rival' || k === 'complicated') {
      shift(b, {
        friction: this.chance(0.6) ? +1 : 0,
        closeness: this.chance(0.3) ? +1 : 0,
      }, 'they cannot leave each other alone', s.day);
      return this.say(this.pick([
        `I drank with ${f.name} at ${this.here().name} and we argued about nothing for three hours, and both enjoyed it, and neither will admit it.`,
        `${f.name} still wants ${b.node?.wants ?? 'the thing I want'}. So do I. We were civil about it, and it cost us both.`,
        `${f.name} and I were pleasant to each other at ${this.here().name}. It was the most unpleasant hour of my week.`,
      ]), 'event', { id: 'meet' });
    }

    // an ordinary meeting. this is how all of it starts.
    b.lastSeen = s.day;
    const isNew = b.closeness === 0 && b.friction === 0;
    shift(b, { closeness: +1, trust: this.chance(0.5) ? +1 : 0 },
      isNew ? `she met them at ${this.here().name}` : null, s.day, isNew);
    this.ripple(f.name, 0.5);   // even drinking with somebody is taking a side, a little

    return this.say(this.pick([
      `I met ${f.name} at ${this.here().name}. They want ${f.wants ?? 'something they would not say'}. I have not decided yet whether that is a problem.`,
      `I drank with ${f.name} at ${this.here().name}, who said out loud what they wanted, which I found either brave or stupid.`,
      `${f.name} bought me a drink at ${this.here().name} and asked me nothing, and I have been braced ever since.`,
      `${f.name} is at ${this.here().name}, known for ${f.known_for ?? 'nothing I can confirm'}. I have been careful to be somewhere else, and today I was not.`,
    ]), 'event', { id: 'meet' });
  }

  // ───────────────────────────────────────────────── the day-to-day of having people
  peopleTick() {
    const s = this.state;

    // Friction cools if nothing feeds it. People do get over things — slowly, and never
    // all the way. It floors at a third of its worst, because you do not forget.
    for (const b of this.bondList()) cool(b, s.day);

    const with_ = this.withHer();
    if (!with_.length) {
      s.lived.nights_alone++;
      if (s.lived.nights_alone % 45 === 0) this.condition('heart', HEART.alone_long, 'alone');
      return;
    }
    s.lived.with_someone++;

    for (const x of with_) x.lastSeen = s.day;   // she is with them. the clock resets.
    const b = this.pick(with_);
    if (!this.chance(0.16)) return;

    // ── THEY DIE. And they die WANTING something, which is the whole of it.
    if (s.wounds >= 3 && this.chance(0.18)) return this.lose(b, 'died');

    // ── THEY LEAVE. Friction does this. So does a woman with nothing left to give.
    if ((b.friction >= 12 || this.eff('heart') <= 3) && this.chance(0.12)) return this.lose(b, 'left');

    // ══════════════════════════════════════════════════════════════ JEALOUSY
    //
    // She is with somebody, and somebody else has got close. Nobody in this game is
    // punished for it and nobody is a villain — but the person she is with is not blind,
    // and the room is not blind, and the friction is real and it lands on all three of
    // them.
    const lover = this.withHer().find((x) => x.romance >= 3 && x !== b);
    if (lover && b.closeness >= 10 && b.romance === 0 && this.chance(0.12)) {
      shift(lover, { friction: +4, trust: -2 },
        `they saw how she is with ${b.who}, and said nothing, which was worse`, s.day, true);
      shift(b, { friction: +2 }, `${lover.who} saw`, s.day, true);
      this.speak(this.pick([
        `${lover.who} has not said anything about ${b.who}. That is how I know.`,
        `I have not done anything. I want that on the record. I have not done anything and I know exactly what I have done.`,
      ]), 'cold');
      return this.say(
        `${lover.who} watched her with ${b.who} across the fire and said nothing about it, all evening, deliberately.`,
        'bond');
    }

    // ══════════════════════════════════════════════════════════ THEY GIVE HER THINGS
    //
    // Not loot. A thing of theirs, that was theirs, that they wanted her to have — and the
    // chronicle names them every single time she uses it, which is the entire reason
    // objects in this game carry their provenance around with them.
    if (b.closeness >= 12 && b.trust >= 8 && !b.gave && this.chance(0.10)) {
      const it = this.mintHere();
      if (it && this.gain(it, FROM.given(b.who, this.here().name), b.who)) {
        b.gave = s.day;
        shift(b, { closeness: +2 }, `they gave her ${it.name}`, s.day, true);
        this.speak(this.fresh(OF_KIT.given), 'close');
        return this.say(
          `${b.who} gave her ${it.name} at ${this.here().name}. they did not make anything of it. she has not once stopped noticing it.`,
          'bond');
      }
    }

    // ═══════════════════════════════════════════ SHE ARMS THE PERSON WALKING BESIDE HER
    //
    // "Others can wield them" is not a stat-sharing feature. It is this: she hands the
    // spare knife to the person at her shoulder, tells them not to make a thing of it, and
    // months later it is the reason they get to her in time — and then she owes them, and
    // owing somebody is its own kind of hell, and the game already knows how to do that.
    if (!b.carries && s.kit.length >= 2 && this.chance(0.06 + 0.10 * Math.max(0, this.off('generous')))) {
      const spare = worst(s.kit);
      if (spare) {
        s.kit = s.kit.filter((i) => i !== spare);
        b.carries = spare;
        shift(b, { closeness: +2, trust: +1 }, `she gave them ${spare.name}`, s.day, true);
        this.condition('heart', HEART.kindness, 'gave');
        s.lived.gave++;
        return this.say(
          `she put ${spare.name} into ${b.who}'s hands at ${this.here().name} and told them not to make a thing of it.`,
          'bond');
      }
    }

    // ── ROMANCE. It does not happen because a bar filled. It happens because two people
    //    kept turning up, and then one of them noticed. She does not start a second one
    //    while she is in the first — she is not a saint, but she is not a fool either.
    if (!lover && b.romance === 0 && b.closeness >= 11 && b.trust >= 9 && this.eff('heart') >= 7 && this.chance(0.10)) {
      b.romance = 1;
      shift(b, {}, 'she noticed, and wishes she had not', s.day, true);
      this.speak(this.pick([
        'Do not say anything. I know what you are going to say and I am not ready to hear it in my own head yet.',
        'Something has changed and I have not decided whether to let it.',
      ]), 'close');
      return this.say(`she caught herself looking at ${b.who}, and neither of them looked away fast enough to pretend.`, 'bond');
    }
    if (b.romance === 1 && this.chance(0.12)) {
      b.romance = 2;
      return this.say(this.pick([
        `she and ${b.who} sat past the end of the fire and neither of them stood up.`,
        `${b.who} reached over to look at a wound that healed weeks ago, and she let them, and neither said anything about it.`,
      ]), 'bond');
    }
    if (b.romance === 2 && this.chance(0.15)) return this.askRomance(b);

    // ══════════════════════════════════════════════════════════ THE ARGUMENT
    //
    // THE PEOPLE SHE LOVES HAVE TO BE ABLE TO FIGHT WITH HER.
    //
    // Without this the model is broken in the most important place: friction was only
    // ever landing on strangers and closeness only ever on friends, so they never
    // coincided — and `complicated` happened twice in forty lives and `feud` never
    // happened at all. Those are the DEEPEST relationships anybody has. The ones where
    // both things are true.
    //
    // So the people closest to her argue with her, and about real things: what she did
    // with what she knows, who she has thrown in with, and the fact that she will not
    // stop walking toward the thing that is going to kill her.
    if (b.closeness >= 8 && this.chance(0.14)) {
      const about = this.pick([
        s.allegiance ? `who she has thrown in with` : `the people she drinks with`,
        `what she did with the thing she found out`,
        `the fact that she will not stop, and cannot say what she is walking toward`,
        `something small, which was not what it was about`,
        b.node?.wants ? `what they want, which she has stopped pretending to help with` : `the road`,
      ]);
      const bad = this.chance(0.4);
      shift(b, {
        friction: bad ? +4 : +2,
        trust: bad ? -2 : 0,
        closeness: bad ? 0 : +1,   // a good row can bring people closer. it often does.
      }, `they had it out about ${about}`, s.day, true);

      return this.say(bad
        ? this.pick([
            `she and ${b.who} had it out about ${about}. things were said that neither of them is going to take back, and neither of them left.`,
            `${b.who} told her the truth about herself tonight. she has not spoken to them since and she has not stopped thinking about it.`,
          ])
        : this.pick([
            `she and ${b.who} argued about ${about} for three hours and went to bed angry and got up fine.`,
            `${b.who} said she was wrong. she was wrong. she has not admitted it and they have not pressed it.`,
          ]), 'bond');
    }

    // ══════════════════════════════════════════════════════════════ THE SECRET
    //
    // She tells somebody a thing she has told nobody. That is what intimacy IS — not
    // hours logged, but a piece of herself handed over that she cannot take back.
    //
    // And it is a WEAPON she has just given them. `knows` was in the model from the start
    // and nothing ever put anything in it. It goes in here, and it comes out in a
    // betrayal, and that is why the betrayal hurts more than the money.
    if (b.trust >= 12 && b.closeness >= 12 && !b.knows.length && this.chance(0.08)) {
      const secret = this.pick([
        'her real name',
        'what she did before any of this',
        'what she is walking toward, which she has never said out loud',
        'the name of the person she is still not over',
        'that she talks to something, and that it answers',
      ]);
      b.knows.push(secret);
      shift(b, { closeness: +3, trust: +2 }, `she told them ${secret}`, s.day, true);
      this.speak(this.pick([
        `I told ${b.who} something I have never told anybody. I have been sick about it all week. I would do it again.`,
        `They know now. ${b.who}. I handed it to them and they could do anything with it and I gave it to them anyway.`,
      ]), 'close');
      return this.say(`she told ${b.who} ${secret}. she has never told anyone. she has been sick about it all week, and she would do it again.`, 'bond');
    }

    // ── the ordinary hours, which are what a relationship actually is
    shift(b, { closeness: +1, trust: this.chance(0.4) ? +1 : 0 }, null, s.day);
    if (this.chance(0.35)) this.condition('heart', HEART.company, 'company');

    const k = kindOf(b);
    const pool =
      k === 'lover' ? [
        `an ordinary evening with ${b.who}, which she has decided is the thing she was missing and could not name.`,
        `she woke before ${b.who} and did not get up, and lay there, and that is the whole of the entry.`,
      ] : k === 'lovers, badly' ? [
        `she and ${b.who} said things tonight that neither of them will take back, and both of them stayed.`,
        `they are still here. she does not know whether that is love or whether neither of them has anywhere to go.`,
      ] : k === 'complicated' ? [
        `${b.who} did something months ago that she has forgiven and not forgotten, and both of those are true at once.`,
        `she likes ${b.who} and cannot trust them, and has stopped trying to reconcile the two.`,
      ] : [
        `a quiet hour with ${b.who}. neither of them said anything worth writing down, and something got said anyway.`,
        `${b.who} asked her a question she did not answer, and did not leave, and that was the whole conversation.`,
        `she took the second watch so ${b.who} could sleep, and did not tell them, and ${b.who} knew.`,
        `${b.who} still wants ${b.node?.wants ?? 'something they will not name'}. she has started to want it for them, which is new and unwelcome.`,
      ];
    return this.say(this.pick(pool), 'bond');
  }

  // ───────────────────────────────────────────────────────────────── losing them
  lose(b, how) {
    const s = this.state;
    b.withHer = false;

    if (how === 'left') {
      shift(b, { closeness: -3, friction: +2 }, 'they walked out in the night', s.day, true);
      this.condition('heart', HEART.left, 'left');
      return this.say(
        b.romance >= 3
          ? `${b.who} left in the night. she did not look for tracks. she has not said their name since, and she says it constantly, in her head.`
          : `${b.who} left in the night. she noticed the missing weight of them before she noticed the empty place by the fire.`,
        'loss');
    }

    // THEY DIED, AND THEY DIED WANTING SOMETHING. That is the line that hurts.
    b.alive = false;
    if (b.node) b.node.status = `dead — she buried them at ${this.here().name}`;
    s.ghosts.push({
      name: b.who,
      why: 'died',
      day: s.day,
      // THEY DIED HOLDING THE THING SHE GAVE THEM. It is in her hands again and she cannot
      // make herself look at it.
      carried: b.carries ?? null,
      wanted: b.node?.wants ?? null,
      was: b.romance >= 3 ? 'lover' : kindOf({ ...b, alive: true }),
    });
    s.lived.buried++;
    this.condition('heart', HEART.buried, 'buried');

    // THEIR FAMILY FINDS OUT. This arrives late and uninvited: a man she has never met,
    // in a country she was only passing through, furious with her for a reason she had
    // genuinely forgotten. Which is how it works.
    for (const v of vendetta(this.web, b.who)) {
      shift(this.bond(v.other), { friction: v.friction, trust: -3 }, v.why, s.day, true);
    }

    this.say(
      `${b.who} is dead. she buried them at ${this.here().name}.` +
      (b.node?.wants ? ` they never got ${b.node.wants}.` : ''),
      'loss');
    this.speak(this.fresh(VOICE.grief), 'grief');
  }

  // ══════════════════════════════════════════════════════════════ THE BETRAYAL
  //
  // THE PERSON WHO SELLS YOU DOES NOT HAVE TO BE SLEEPING NEXT TO YOU.
  //
  // The first version gated this on `withHer`, so only a travelling companion could
  // betray her — and in sixty lives it happened ONCE, because the state that makes a
  // betrayal possible (close, but no longer trusted) almost never coincides with the two
  // people she happens to be walking with. Which is backwards. The friend in the town who
  // knows where she sleeps is a far better informer than the woman at her shoulder.
  //
  // It needs: CLOSE ENOUGH TO HURT HER, and TRUST THAT HAS FALLEN. That is exactly the
  // state the two-axis model exists to hold and a single bond number could never reach.
  betrayalTick() {
    const s = this.state;
    if (!this.chance(0.02)) return;

    // Close enough to hurt her — AND one of two things has happened:
    //
    //   the trust went out of it, and there is friction; or
    //   SHE TOLD THEM NO. They needed something, they asked, and she decided they were
    //   not worth it. That is who sells you. Not the one who drifted — the one who
    //   watched you weigh them.
    const able = this.bondList().filter((b) =>
      b.alive && !b.betrayed && b.closeness >= 9 && (
        (b.trust <= 6 && b.friction >= 6) ||
        (b.refused && b.friction >= 4)
      ));
    if (!able.length) return;

    const b = this.pick(able);
    const took = Math.round(s.coin * 0.35) + this.int(20, 60);
    s.coin = Math.max(0, s.coin - took);
    s.attention += 3;
    if (this.chance(0.4)) s.wounds += 1;

    // AND THEY TOOK THE BEST THING SHE OWNED. Of everything they could have taken. They
    // knew which one it was, because she told them where it came from.
    const prize = best(s.kit);
    if (prize && this.chance(0.6)) {
      s.kit = s.kit.filter((i) => i !== prize);
      this.speak(this.fresh(OF_KIT.lost), 'cold');
      this.say(
        `${b.who} took ${prize.name} when they went. it was ${prize.from}.` +
        (prize.given_by ? ` ${prize.given_by} gave it to her.` : ''),
        'loss');
    }

    shift(b, { friction: +8, trust: -10, closeness: -2 },
      `they sold her, at ${this.here().name}, and they did it well`, s.day, true);
    b.withHer = false;
    b.betrayed = true;
    this.condition('heart', -3, 'betrayed');
    this.condition('faith', -1, 'betrayed');

    // and everybody they are tangled with now has to decide what they think about it
    this.ripple(b.who, -0.5);

    this.speak(this.pick([
      `${b.who} sold me. I saw it coming. I let it happen anyway, because the alternative was being alone.`,
      `I trusted them. That is the whole of it. I do not want to talk about it, and I am telling you, which tells you something.`,
    ]), 'cold');

    this.say(
      b.knows.length
        // she gave them the knife herself
        ? `${b.who} sold her at ${this.here().name}. they told them ${b.knows[0]} — which she gave them, freely, one night, because she wanted somebody in the world to know it.`
        : `${b.who} sold her at ${this.here().name} — for ${took} coin, and for ${b.node?.wants ?? 'something she never got out of them'}. she had seen it coming. she had let it happen anyway.`,
      'loss');
    if (b.knows.length) {
      s.attention += 4;   // whatever they told, it travelled
      this.speak(`They knew ${b.knows[0]}. Because I told them. I want that written down: I told them.`, 'cold');
    }
  }

  // ══════════════════════════════════════════════════════════════ THE DEAD
  //
  // They do not stop when they are buried. They died WANTING something, and the want is
  // still in the world, and she is still in the world, and she knows exactly where it is.
  //
  // A ghost is not a memory. It is a piece of unfinished business with a name on it.
  ghostTick() {
    const s = this.state;
    const unfinished = s.ghosts.filter((g) => g.wanted && !g.settled);
    if (!unfinished.length || !this.chance(0.03)) return;

    const g = this.pick(unfinished);

    // She can finish it. Nobody asked her to. It does not bring them back and she knows
    // that, and she does it anyway, and it is the closest thing to grief she permits.
    if (this.chance(0.35)) {
      g.settled = s.day;
      this.condition('heart', +3, 'settled');
      s.lived.gave++;
      this.use('name');
      this.speak(this.pick([
        `I did the thing ${g.name} wanted. They are still dead. I know that. I did it anyway.`,
        `It is finished. ${g.name} never saw it. I am not sure who I did it for.`,
      ]), 'grief');
      return this.say(
        `she finished it. ${g.name} wanted ${g.wanted}, and never got it, and now it is done, and they are still dead.`,
        'bond');
    }

    return this.say(this.pick([
      `she dreamed about ${g.name} again. she woke before dawn and walked until it was light.`,
      `${g.name} wanted ${g.wanted}. she keeps finding herself in a position to get it for them, and keeps not doing it.`,
      `somebody said ${g.name}'s name at ${this.here().name}, meaning nothing by it, and she had to leave the room.`,
      `she still has not settled what ${g.name} wanted. she tells herself it is not hers to settle.`,
    ]), 'loss');
  }

  // ─────────────────────────────────────────────────── she asks you about them
  offerCompanion() {
    const s = this.state;
    if (this.withHer().length >= 2) return;
    if (s.pending.some((p) => p.kind === 'join' || p.kind === 'romance')) return;

    for (const f of this.figuresHere()) {
      if (f.divine) continue;
      const b = s.bonds[f.name];
      if (!b || b.withHer || !b.alive) continue;
      if (b.closeness < 4) continue;      // she has to actually know them
      if (b.friction >= 8) continue;      // and not be at war with them
      // SHE ALREADY SAID NO TO THEM. A man who has been turned down does not ask again on
      // Thursday. This had no memory at all, so a refused companion re-asked every few days
      // for the rest of her life, and the chronicle read `Wren Mourn does not` nine times
      // in a fortnight — which is not a person, it is a stuck valve.
      if (b.joinAsked && s.day - b.joinAsked < 90) continue;
      // HEART gates this. An empty woman cannot let anybody in. Not won't — CAN'T.
      if (!this.chance(clamp((this.eff('heart') / 14) * (0.28 + 0.3 * this.off('sociable')), 0, 0.8))) continue;

      b.joinAsked = s.day;
      s.pending.push({
        id: `join_${f.name}`,
        kind: 'join',
        who: f.name,
        wants: f.wants ?? null,
        raisedOn: s.day,
        dueOn: s.day + 4,
        // She tells you what it will cost her. She can see it. She tells you anyway,
        // because she wants you to be the one who says it is worth it.
        prompt: `${f.name} wants to come with me. ${f.wants ? `They want ${f.wants}.` : ''} ${this.costOf(f.name)} ${this.pick(VOICE.ask)}`.replace(/\s+/g, ' ').trim(),
      });
      return;
    }
  }

  costOf(name) {
    const hurt = sideEffects(this.web, name).filter((e) => (e.friction ?? 0) > 0);
    if (!hurt.length) return '';
    const who = [...new Set(hurt.map((e) => e.other))].slice(0, 2).join(' and ');
    return `${who} will not forgive me for it.`;
  }

  askRomance(b) {
    const s = this.state;
    if (s.pending.some((p) => p.kind === 'romance')) return;
    s.pending.push({
      id: `romance_${b.who}`,
      kind: 'romance',
      who: b.who,
      raisedOn: s.day,
      dueOn: s.day + 4,
      prompt: `It is ${b.who}. You know it is ${b.who}. I can have this, or I can stay as I am, and I have been as I am for a very long time.`,
    });
  }

  resolveRomance(j, key, by) {
    const s = this.state;
    const b = this.bond(j.who);
    if (key === 'yes') {
      b.romance = 3;
      shift(b, { closeness: +5, trust: +3 }, 'she let herself have it', s.day, true);
      this.condition('heart', +2, 'love');
      this.ripple(j.who, 1.5);   // everybody knows. it is a position, and a loud one.
      this.say(`she and ${b.who} stopped pretending. nobody was surprised, which stung, and then stopped stinging.`, 'bond');
      this.speak(this.pick([
        'I have something to lose now. I can feel the weight of it in every fight, and I am not giving it up.',
        'I let it happen. I am more careful now and I am furious about that.',
      ]), 'close');
    } else {
      b.romance = 0;
      b.romanceOneSided = true;
      shift(b, { closeness: -2, friction: +3, trust: -1 }, 'she let the moment go past, and they understood', s.day, true);
      this.say(`she said nothing and let the moment go past. ${b.who} understood, which was worse.`, 'bond');
      this.speak(this.pick([
        'I have work to do. I said that out loud and heard exactly how it sounded.',
        'I turned it down. I have not slept well since, and I would tell you the two things are unrelated.',
      ]), 'cold');
    }
    s.log.push({
      day: s.day, kind: 'judgment', by, id: j.id, feed: 'her',
      text: key === 'yes'
        ? `she let herself have ${b.who}. [${by === 'you' ? 'you' : 'she'} decided]`
        : `she let ${b.who} go. [${by === 'you' ? 'you' : 'she'} decided]`,
    });
  }

  takeCompanion(name) {
    const s = this.state;
    const b = this.bond(name);
    const found = [...walk(this.world)].find(({ node: n }) => n.kind === 'figure' && n.name === name);
    if (found) {
      const { node: f, path } = found;
      const parent = path[path.length - 1];
      parent.children = parent.children.filter((c) => c !== f);
      f.with_her = true;
      b.node = f;
    }
    b.withHer = true;
    shift(b, { closeness: +2, trust: +2 }, `they threw in together at ${this.here().name}`, s.day, true);

    // SHE TOOK A SIDE. The room finds out, and the room has opinions.
    this.ripple(name, 1);

    this.say(`${name} is walking with her now.` + (b.node?.one_line ? ` ${b.node.one_line}.` : ''), 'join');
  }

  // ══════════════════════════════════════════════════════ SHE ASKS YOU ABOUT THEM
  //
  // The biggest hole in the whole design, and it was hiding in plain sight: she had a
  // rich life full of people and NEVER ONCE ASKED YOU ABOUT ANY OF THEM. You are her
  // angel. The single most human thing she can do is turn to the thing she believes is
  // listening and say: what do I do about him.
  //
  // These are not event cards. Every one of them is generated out of the actual state of
  // an actual relationship — she only asks whether to trust somebody when she is closer
  // to them than she trusts them, and she only asks about forgiveness when there is
  // something to forgive.
  counsel() {
    const s = this.state;
    if (s.pending.some((p) => p.kind === 'counsel')) return;
    // she asks more if she believes in you — and MORE AGAIN if you are the only one left to
    // ask, which is the whole of what "her only true friend" means at the mechanical level.
    const lonely = this.aloneWithYou();
    if (!this.chance((0.05 + 0.05 * (this.eff('faith') / 20)) * (lonely ? 1.8 : 1))) return;

    const ask = (id, who, prompt, options) => {
      s.pending.push({ id, kind: 'counsel', who, prompt, options, raisedOn: s.day, dueOn: s.day + 5 });
    };

    // ── she is closer to somebody than she trusts them, and it is eating her
    const uneasy = this.bondList().find(
      (b) => b.alive && b.closeness >= 10 && b.trust <= 6 && !b.asked?.trust);
    if (uneasy) {
      (uneasy.asked ??= {}).trust = true;
      return ask(`trust_${uneasy.who}`, uneasy.who,
        `I am closer to ${uneasy.who} than I trust them. I know how that sounds. Do I let them all the way in, or do I keep the door where it is?`,
        { open: 'Let them in', keep: 'Keep the door where it is' });
    }

    // ── somebody she loves wants something, and she has been pretending to help
    // Some wants cannot be fetched. "I could get them nothing, and this is what frightens
    // people" is not a sentence, and it shipped.
    const gettable = (w) => w && !/^nothing/.test(w) && !/left alone/.test(w);
    const wanting = this.withHer().find(
      (b) => gettable(b.node?.wants) && b.closeness >= 9 && !b.asked?.want);
    if (wanting) {
      (wanting.asked ??= {}).want = true;
      return ask(`want_${wanting.who}`, wanting.who,
        `${wanting.who} wants ${wanting.node.wants}. They have never asked me for it. I could get it for them and it would cost me, and I have been pretending not to notice for a month.`,
        { help: 'Get it for them', no: 'It is not hers to give' });
    }

    // ── somebody sold her, and they are still breathing
    const traitor = this.bondList().find((b) => b.betrayed && !b.asked?.forgive);
    if (traitor) {
      (traitor.asked ??= {}).forgive = true;
      return ask(`forgive_${traitor.who}`, traitor.who,
        `${traitor.who} sold me. They are in the same town as me tonight and they know I know. I can settle it or I can let it go, and I have never once let anything go.`,
        { settle: 'Settle it', forgive: 'Let it go' });
    }

    // ── two people she cares about, and only one thing between them
    const rivals = this.web.links.find((l) =>
      l.kind === 'rivals'
      && s.bonds[l.a]?.closeness >= 7 && s.bonds[l.b]?.closeness >= 7
      && s.bonds[l.a]?.alive && s.bonds[l.b]?.alive
      && !s.asked?.[`side_${l.a}_${l.b}`]);
    if (rivals) {
      (s.asked ??= {})[`side_${rivals.a}_${rivals.b}`] = true;
      return ask(`side_${rivals.a}_${rivals.b}`, rivals.a,
        `${rivals.a} and ${rivals.b} both want the same thing and there is only the one of it. They have both been good to me. They are both waiting to see which of them I am.`,
        { a: `Stand with ${rivals.a}`, b: `Stand with ${rivals.b}`, out: 'Stay out of it' });
    }

    // ── THEY DIED WITH HER KNIFE IN THEIR HAND. It came back to her, and it is the most
    //    ordinary object in the world, and she cannot make herself pick it up.
    const holding = s.ghosts.find((g) => g.carried && !g.askedKit);
    if (holding) {
      holding.askedKit = true;
      return ask(`kit_${holding.name}`, holding.name,
        `${holding.name} was carrying ${holding.carried.name} when they died. I gave it to them. I put it in their hands myself and told them not to make a thing of it. It is back in my pack and I have not been able to look at it for a week.`,
        { keep: 'Use it. They would want you to', bury: 'Put it in the ground with them' });
    }

    // ── the dead are still asking
    const owed = s.ghosts.find((g) => g.wanted && !g.settled && !g.asked);
    if (owed) {
      owed.asked = true;
      return ask(`ghost_${owed.name}`, owed.name,
        `${owed.name} wanted ${owed.wanted} and died without it. I am in a position to finish it. It will not bring them back. I know it will not bring them back.`,
        { finish: 'Finish it', leave: 'Leave it. They are dead.' });
    }
  }

  resolveCounsel(j, key, by) {
    const s = this.state;
    const b = s.bonds[j.who];
    const said = (text) => s.log.push({ day: s.day, kind: 'judgment', by, id: j.id, feed: 'her', text: `${text} [${by === 'you' ? 'you' : 'she'} decided]` });

    // ── trust
    if (j.id.startsWith('trust_')) {
      if (key === 'open') {
        shift(b, { trust: +6, closeness: +2 }, 'she let them all the way in', s.day, true);
        this.speak('I told them. All of it. I have not done that since I was a child and I am not sure I have stopped shaking.', 'close');
        said(`she let ${j.who} all the way in`);
      } else {
        shift(b, { trust: -1, friction: +2 }, 'she kept the door where it was', s.day, true);
        this.speak('I kept the door where it is. They noticed. Of course they noticed.', 'cold');
        said(`she kept ${j.who} at the door`);
      }
      return;
    }

    // ── their want
    if (j.id.startsWith('want_')) {
      if (key === 'help') {
        const cost = this.int(60, 180);
        s.coin = Math.max(0, s.coin - cost);
        s.attention += 2;
        shift(b, { closeness: +4, trust: +4, owes: -6 }, `she got them ${b.node.wants}. it cost her ${cost} coin and she has never mentioned it`, s.day, true);
        this.condition('heart', +2, 'gave');
        s.lived.gave++;
        this.ripple(j.who, 1);   // helping somebody get what they want is a very loud position
        this.say(`she got ${j.who} what they wanted. it cost her ${cost} coin and she has not mentioned it, and will not.`, 'bond');
        said(`she got ${j.who} what they wanted`);
      } else {
        // SHE SAID NO TO SOMEBODY WHO NEEDED SOMETHING. Remember it. This is the single
        // best predictor of who eventually sells her, and it is the correct one: the
        // person who informs on you is almost never the one who drifted away. It is the
        // one who came to you needing something and watched you decide they were not
        // worth it.
        b.refused = s.day;
        shift(b, { friction: +4, trust: -2 }, 'she could have helped, and did not, and they know', s.day, true);
        this.mark('said_no', `${j.who} asked, and she decided they were not worth it`);
        this.say(`she could have got ${j.who} what they wanted. she did not. they have not asked why, which is worse than asking.`, 'bond');
        said(`she did not help ${j.who}`);
      }
      return;
    }

    // ── the betrayal
    if (j.id.startsWith('forgive_')) {
      if (key === 'settle') {
        s.wounds += this.chance(0.5) ? 1 : 0;
        s.attention += 2;
        this.use('hand');
        shift(b, { friction: +6, closeness: -4, trust: -4 }, `she settled it, at ${this.here().name}`, s.day, true);
        b.alive = this.chance(0.4) ? false : b.alive;
        if (!b.alive) {
          s.ghosts.push({ name: b.who, why: 'she killed them', day: s.day, wanted: b.node?.wants ?? null, was: 'betrayer' });
          for (const v of vendetta(this.web, b.who)) shift(this.bond(v.other), { friction: v.friction, trust: -3 }, v.why, s.day, true);
          this.speak('It is settled. I do not feel any better. I was told I would feel better.', 'cold');
        }
        this.mark('blood_answer', `she settled it with ${j.who}`);
        this.say(`she settled it with ${j.who} at ${this.here().name}.${b.alive ? ' they are still breathing. neither of them is sure why.' : ' they are not breathing.'}`, 'loss');
        said(`she settled it with ${j.who}`);
      } else {
        // FORGIVENESS IS THE HARDEST THING IN THE GAME AND IT COSTS THE MOST.
        shift(b, { friction: -6, trust: +1 }, 'she let it go, which nobody who knows her believed she would', s.day, true);
        this.condition('heart', +2, 'forgave');
        s.lived.gave++;   // mercy is a thing given, and the Open Hand is earned off it
        this.speak(this.pick([
          'I let it go. I want to be clear that I did not forgive them. I let it go. There is a difference and it is the only thing I have.',
          'I did not settle it. Everyone is waiting for me to and I am not going to and I cannot explain why to them or to you.',
        ]), 'close');
        this.mark('let_it_go', `she let it go with ${j.who}`);
        this.say(`she let it go with ${j.who}. nobody who knows her believed she would. she is not sure she has.`, 'bond');
        said(`she let it go with ${j.who}`);
      }
      return;
    }

    // ── the two of them
    if (j.id.startsWith('side_')) {
      const [, A, B] = j.id.split('_');
      if (key === 'out') {
        for (const n of [A, B]) shift(this.bond(n), { friction: +3, trust: -1 }, 'she would not choose, and both of them counted that as an answer', s.day, true);
        this.say(`she would not take a side between ${A} and ${B}. both of them counted that as an answer.`, 'bond');
        said(`she stayed out of it between ${A} and ${B}`);
      } else {
        const chose = key === 'a' ? A : B, lost = key === 'a' ? B : A;
        shift(this.bond(chose), { closeness: +4, trust: +3 }, `she stood with them, and everybody saw it`, s.day, true);
        shift(this.bond(lost), { friction: +9, trust: -6, closeness: -3 }, `she stood with ${chose}. in front of them.`, s.day, true);
        this.ripple(chose, 1);
        this.say(`she stood with ${chose}, in front of ${lost}, in front of everybody. it is done now and it cannot be undone.`, 'bond');
        said(`she stood with ${chose} against ${lost}`);
      }
      return;
    }

    // ── the thing they died holding
    if (j.id.startsWith('kit_')) {
      const g = s.ghosts.find((x) => x.name === j.who);
      if (!g?.carried) return;
      const it = g.carried;
      g.carried = null;

      if (key === 'keep') {
        this.gain(it, FROM.buried(g.name), g.name);
        this.condition('heart', -1, 'kept it');
        this.speak(this.pick([
          `I am using it. They would want me to use it. I have told myself that in those words about forty times now.`,
          `I kept it. I do not know whether that is love or whether I am just a person who does not waste a good knife.`,
        ]), 'grief');
        this.say(`she kept ${it.name}. it was ${g.name}'s. she uses it, and she does not talk about it, and she thinks about it every time.`, 'bond');
        said(`she kept what ${g.name} was carrying`);
      } else {
        this.condition('heart', +2, 'buried it');
        s.lived.gave++;
        this.speak(`It went in the ground with them. It was worth more than everything else I own. I have not regretted it and I have thought about it every day, and those are both true.`, 'grief');
        this.say(`she put ${it.name} in the ground with ${g.name}. it was worth more than everything else she owns.`, 'loss');
        said(`she buried ${g.name} with what she gave them`);
      }
      return;
    }

    // ── the dead
    if (j.id.startsWith('ghost_')) {
      const g = s.ghosts.find((x) => x.name === j.who);
      if (key === 'finish' && g) {
        g.settled = s.day;
        s.coin = Math.max(0, s.coin - this.int(40, 120));
        this.condition('heart', +3, 'settled');
        s.lived.gave++;
        this.speak('It is done. They are still dead. I knew they would still be dead.', 'grief');
        this.say(`she finished what ${g.name} started. it cost her, and it changed nothing, and she would do it again.`, 'bond');
        said(`she finished what ${g.name} wanted`);
      } else if (g) {
        g.settled = -1;
        this.condition('heart', -1, 'left it');
        this.say(`she left it. ${g.name} wanted ${g.wanted}, and did not get it, and is not going to.`, 'loss');
        said(`she left ${g.name}'s business unfinished`);
      }
      return;
    }
  }

  // ══════════════════════════════════════════════════════════ WHAT THEY CALL HER
  //
  // THE CLASS SYSTEM, AND SHE DOES NOT PICK IT OFF A MENU.
  //
  // A calling is a name the world has started using for her, and it arrives the way a
  // reputation actually arrives: she finds out that other people have been saying it for a
  // while. `qualifies()` will not offer her a name her stats and her ledger do not already
  // support — which is what "the class has to fit her stats" means when it is ENFORCED
  // instead of advised. There is never a menu of nine things she is not. There is one name,
  // it is true, and the only question left is whether she answers to it.
  //
  // Then she turns to you and asks. It is a judgment like any other, so it goes through
  // `answer()`, so it is an input in the journal, so the save and the replay work with no
  // changes at all — and if you do not come, she decides alone, weighted by who she has
  // become. Which is the mechanic the whole game rests on, and it did not need touching.
  offerCalling() {
    const s = this.state;
    if (s.pending.some((p) => p.kind === 'calling')) return;
    if (!this.chance(0.12)) return;

    const ready = CALLING_KEYS.filter((k) => qualifies(k, this));
    if (!ready.length) return;

    const key = this.pick(ready);
    const c = CALLINGS[key];

    this.say(c.world, 'calling', { calling: key });
    s.pending.push({
      id: `calling_${key}`,
      kind: 'calling',
      key,
      who: c.name,
      raisedOn: s.day,
      dueOn: s.day + 6,
      prompt: c.prompt,
      options: { take: 'Answer to it', refuse: 'Refuse the name' },
    });
  }

  resolveCalling(j, key, by) {
    const s = this.state;
    const c = CALLINGS[j.key];

    if (key === 'take') {
      s.calling = j.key;
      s.called.push({ key: j.key, day: s.day, took: true });

      // A NAME IS A LIABILITY, AND THE GAME HAS ALWAYS KNOWN THAT. The thing that is
      // counting finds a famous woman faster than a quiet one, and this is the single
      // largest voluntary step she can take toward being found.
      s.attention += c.attention ?? 0;
      this.use('name', 4);
      if (c.mark) this.mark(c.mark, 'she said the words out loud, in front of witnesses');

      // and the room decides about her the day she takes it
      for (const f of this.factionsHere()) {
        const d = c.factions?.[f.kind];
        if (d) this.nudge(f.name, d);
      }

      this.speak(c.took, 'became');
      this.say(
        `she answers to ${c.name} now. she cannot put it back down, and she knew that when she said yes.`,
        'calling', { calling: j.key });
    } else {
      // Refusing is not free either — it is quieter, which is worth a great deal, and the
      // offer does not come round twice. `qualifies()` will never raise this name again.
      s.called.push({ key: j.key, day: s.day, took: false });
      s.attention = Math.max(0, s.attention - 2);
      this.speak(c.refused, 'cold');
      this.say(`they offered her ${c.name}, and she would not answer to it. nobody is going to ask her twice.`, 'calling');
    }

    s.log.push({
      day: s.day, kind: 'judgment', by, id: j.id, feed: 'her',
      text: key === 'take'
        ? `she is ${c.name} now. [${by === 'you' ? 'you' : 'she'} decided]`
        : `she refused ${c.name}. [${by === 'you' ? 'you' : 'she'} decided]`,
    });
  }

  // ================================================================= THE HOOKS
  //
  // "Hooks are the check-in." A hook is two facts already in the world colliding —
  // which is exactly what a decision point is, and it is NOT a random event card:
  // it has a traceable cause, and the player can see both halves of it.
  //
  // A hook only reaches her when she is standing where one of its facts lives. She
  // cannot act on the fuel running out if she has never been to the refineries.
  raiseHooks() {
    const s = this.state;
    if (s.pending.length >= 2) return;

    // Where a hook can reach her. A fact that lives on the WORLD node (a magic cost,
    // the economy, the era) is true everywhere she stands — so the test is not "is she
    // in that node" but "is that node above her, or under her feet". Requiring the
    // former meant hooks essentially never fired, because most facts are world-scope.
    const site = this.site();
    const scope = new Set([site.node.name, ...site.path.map((p) => p.name)]);

    for (const h of this.world.hooks ?? []) {
      if (s.knows?.includes(h.collision)) continue;
      if (!h.where.some((w) => scope.has(w))) continue;
      if (s.pending.some((p) => p.id === h.collision)) continue;
      if (!this.chance(0.035)) continue;

      s.pending.push({
        id: h.collision,
        facts: h.facts,
        collision: h.collision,
        raisedOn: s.day,
        dueOn: s.day + 6,
        at: site.node.name,
      });
      // SHOW THE READING, NOT THE TWO HALVES OF IT. This printed the raw facts side by side
      // — "a chapter of The Long Company does not know it has a head. and: the money sits
      // with whoever wrote the roll." — which is the working, not the conclusion. The
      // collision now names every party in both facts, so it cites them BY SAYING THEM, and
      // it is the sentence a person would actually say when the penny dropped.
      this.say(`she put two things together at ${site.node.name}. ${h.collision}`, 'hook');
      return;
    }
  }

  // What do you do with a thing you have worked out? You act on it, you tell
  // somebody, or you keep it. That is the entire decision, and it is the same
  // decision for every hook this engine will ever generate — which is why it can be
  // generic without being empty.
  hookOptions() {
    return {
      act: { label: 'Act on it' },
      tell: { label: 'Tell someone' },
      keep: { label: 'Say nothing, and keep it' },
    };
  }

  answer(id, key) {
    const s = this.state;
    const i = s.pending.findIndex((p) => p.id === id);
    if (i < 0) return null;
    const j = s.pending.splice(i, 1)[0];
    // YOU CAME. This is the only number in the game the player is directly responsible
    // for, and it is the one that can be lost. And it is TALLIED: turning up again and again
    // is one of the three things a visit asks for, and this is where "again and again" is
    // counted.
    this.condition('faith', FAITH.answered, 'answered');
    s.lastAnswered = s.day;
    s.answered = (s.answered ?? 0) + 1;
    if (j.kind === 'join') this.resolveJoin(j, key, 'you');
    else if (j.kind === 'romance') this.resolveRomance(j, key, 'you');
    else if (j.kind === 'counsel') this.resolveCounsel(j, key, 'you');
    else if (j.kind === 'calling') this.resolveCalling(j, key, 'you');
    else if (j.kind === 'bounty') this.resolveBounty(j, key, 'you');
    else if (j.kind === 'great') this.resolveGreat(j, key, 'you');
    else if (j.kind === 'visit') this.resolveVisit(j, key, 'you');
    else if (j.kind === 'plea') this.resolvePlea(j, key, 'you');
    else if (j.kind === 'reflect') this.resolveReflect(j, key, 'you');
    else this.resolveHook(j, key, 'you');
    return j;
  }

  // She asked you whether to let somebody walk with her. That is not a hook and it does
  // not resolve like one.
  resolveJoin(j, key, by) {
    if (key === 'yes') {
      this.takeCompanion(j.who);
      this.drift('sociable', +0.04);
      if (by === 'you') this.speak(this.pick([
        `You said yes. I hope you know what you have done. I hope one of us does.`,
        `All right. They are coming. If this goes badly I am going to remember that you said yes.`,
      ]), 'close');
    } else {
      this.drift('sociable', -0.05);
      this.say(`she sent ${j.who} back. she did not explain, and they did not ask, and that was worse.`, 'event');
      if (by === 'you') this.speak(this.pick([
        `You said no. Fine. It is easier alone and we both know that is not why you said it.`,
        `No, then. I did not want them anyway. Write that down as a lie if you are writing.`,
      ]), 'close');
    }
    this.state.log.push({
      day: this.state.day, kind: 'judgment', by, id: j.id, feed: 'her',
      text: key === 'yes' ? `${j.who} walks with her now. [${by === 'you' ? 'you' : 'she'} decided]`
                          : `${j.who} does not. [${by === 'you' ? 'you' : 'she'} decided]`,
    });
  }

  // Unanswered judgments resolve THEMSELVES, weighted by who she has become. This is
  // the load-bearing mechanic and it survived the rebuild: it gives a real reason to
  // check in, it makes her a person rather than a puppet, and it makes neglect a
  // legitimate playstyle with a legitimate cost.
  autoResolve(j) {
    // SHE ASKED, AND YOU WERE NOT THERE. Not a scolding line in the UI — three points
    // off the number that decides whether she ever asks you again.
    this.condition('faith', FAITH.absent, 'absent');
    if (j.kind === 'join') {
      const yes = this.chance(0.4 + 0.45 * this.off('sociable'));
      this.speak(this.fresh(VOICE.absent), 'absent');
      return this.resolveJoin(j, yes ? 'yes' : 'no', 'her');
    }
    if (j.kind === 'counsel') {
      // SHE ASKED YOU ABOUT A PERSON AND YOU DID NOT COME. She decides alone, and a woman
      // who is alone and has stopped believing anybody is listening decides the closed way
      // — she keeps the door where it is, she does not help, she settles it. Neglect does
      // not just cost her a judgment. It makes her a harder person.
      const keys = Object.keys(j.options);
      const closed = this.eff('faith') < 8 || this.eff('heart') < 7;
      const pickKey = closed ? keys[keys.length - 1] : this.pick(keys);
      this.speak(this.fresh(VOICE.absent), 'absent');
      return this.resolveCounsel(j, pickKey, 'her');
    }
    if (j.kind === 'bounty') {
      // She asked whether it was worth her life, and nobody answered. A reckless woman takes
      // it; a careful one does not; a broke one takes it whatever she is.
      const broke = this.state.coin < 60;
      const yes = this.chance(clamp(0.3 + 0.4 * this.off('reckless') + (broke ? 0.25 : 0), 0, 0.9));
      this.speak(this.fresh(VOICE.absent), 'absent');
      return this.resolveBounty(j, yes ? 'take' : 'leave', 'her');
    }
    if (j.kind === 'great') {
      // SHE STOOD OUTSIDE THE WORST THING IN THE WORLD AND ASKED YOU WHETHER TO GO IN, AND
      // YOU WERE NOT THERE.
      //
      // A woman who still believes somebody is watching goes in. That is the whole of it, and
      // it is the cruellest thing Faith does in this entire game: your silence is what stops
      // her — or your silence is what kills her, and you will not know which until you look.
      const yes = this.chance(clamp(0.2 + 0.5 * this.off('reckless') + this.eff('faith') / 30, 0, 0.85));
      this.speak(this.fresh(VOICE.absent), 'absent');
      return this.resolveGreat(j, yes ? 'go' : 'walk', 'her');
    }
    if (j.kind === 'calling') {
      // SHE ASKED YOU WHO SHE IS AND YOU DID NOT COME.
      //
      // A woman whose name already precedes her takes it — it is hers whether she agrees to
      // it or not, and she knows that. A woman who has stopped believing anybody is
      // listening goes quiet instead: taking a name is an act of belief that somebody is
      // watching you take it.
      const yes = this.chance(clamp(
        0.15 + 0.35 * this.off('sociable') + this.st('name') * 0.5 + this.eff('faith') / 40, 0, 0.9));
      this.speak(this.fresh(VOICE.absent), 'absent');
      return this.resolveCalling(j, yes ? 'take' : 'refuse', 'her');
    }
    if (j.kind === 'romance') {
      // SHE ASKED YOU ABOUT LOVE AND YOU DID NOT COME. She decides — and a woman who has
      // stopped believing anybody is listening is far likelier to let it go past. This is
      // the cruellest thing Faith does, and it is the correct thing for it to do.
      const yes = this.chance(clamp(0.25 + 0.4 * this.off('sociable') + this.state.stat.faith / 40, 0, 0.85));
      this.speak(this.fresh(VOICE.absent), 'absent');
      return this.resolveRomance(j, yes ? 'yes' : 'no', 'her');
    }
    if (j.kind === 'visit') {
      // YOU STOOD IN FRONT OF HER, SHE ASKED YOU ONE THING, AND YOU WERE GONE BEFORE SHE
      // FINISHED. That is its own small cruelty, and she answers it herself — she has just
      // been visited, so her Faith is high, and she lets herself believe you will stay,
      // which is the sadder of the two outcomes and she chooses it anyway.
      this.speak(this.fresh(VOICE.absent), 'absent');
      return this.resolveVisit(j, this.eff('faith') >= 12 ? 'stay' : 'once', 'her');
    }
    if (j.kind === 'plea') {
      // SHE ASKED YOU WHETHER SHE WOULD LIVE, AND YOU WERE NOT THERE. She lives or dies on her
      // own body now, not your word — the wound is already counted; this only decides whether
      // she faced it believing anybody heard her. She did not.
      return this.resolvePlea(j, 'quiet', 'her');
    }
    if (j.kind === 'reflect') {
      // She asked you what this was, on a quiet night, and you did not answer. She decides —
      // and a woman who has stopped believing anybody is listening settles into the room and
      // the road and calls it peace, because the alternative is to keep asking an empty room.
      return this.resolveReflect(j, this.eff('faith') < 8 ? 'yes' : 'somewhat', 'her');
    }
    const w = {
      act: 0.3 + 0.5 * this.off('reckless'),
      tell: 0.3 + 0.5 * this.off('sociable'),
      keep: 0.4 - 0.3 * this.off('sociable'),
    };
    const keys = Object.keys(w);
    const total = keys.reduce((a, k) => a + Math.max(0.05, w[k]), 0);
    let r = this.rng() * total;
    let chosen = keys[keys.length - 1];
    for (const k of keys) { r -= Math.max(0.05, w[k]); if (r <= 0) { chosen = k; break; } }
    this.resolveHook(j, chosen, 'her');
  }

  resolveHook(j, key, by) {
    const s = this.state;
    (s.knows ??= []).push(j.collision);
    const factions = this.factionsHere();

    let text;
    if (key === 'act') {
      s.attention += 3;
      if (this.chance(0.5)) s.wounds += 1;
      s.coin += this.int(30, 120);
      this.drift('reckless', +0.06);
      for (const f of factions) this.nudge(f.name, this.chance(0.5) ? 2 : -2);
      text = this.pick([
        `she did something about it — ${j.collision} — and she has not said what, and she is limping.`,
        `she acted on it. ${j.collision}. it paid, and it cost, and she will not tell you the ratio.`,
        `she moved on it before anyone else could. ${j.collision}. there are people who will not forgive that.`,
      ]);
    } else if (key === 'tell') {
      s.attention += 1;
      this.drift('sociable', +0.05);
      for (const f of factions) this.nudge(f.name, 1.5);
      text = this.pick([
        `she told someone. by the end of the week it was everywhere: ${j.collision}. she is not sure that was hers to give away.`,
        `she said it out loud, in a room with the wrong people in it: ${j.collision}. it is not hers any more.`,
        `she passed it on and asked for nothing. ${j.collision}. she has been waiting to find out what that bought her.`,
      ]);
    } else {
      this.drift('sociable', -0.04);
      // KEEPING A THING IS NOT FREE. It sharpens her and it closes her, and the mark says
      // both at once, which is the only honest way to say it.
      if (this.chance(0.5)) this.mark('kept_it', j.collision);
      text = this.pick([
        `she said nothing, and kept it. ${j.collision}. she is the only person she knows who knows.`,
        `she has told nobody. ${j.collision}. she takes it out and looks at it some nights, the way you check a wound.`,
        `she kept it to herself. ${j.collision}. it is the most valuable thing she owns and she cannot spend it.`,
      ]);
    }
    this.state.log.push({ day: s.day, kind: 'judgment', feed: 'her', by, text, id: j.id });
  }

  // ======================================================================== TICK
  tick() {
    const s = this.state;
    if (!s.alive) return s;

    s.day++;

    // Judgments she never answered decide themselves, weighted by who she has become.
    // She waited, you were not there, and she will tell you so. This is the cost of
    // being an angel who does not turn up.
    for (const j of [...s.pending]) {
      if (s.day >= j.dueOn) {
        s.pending = s.pending.filter((p) => p !== j);
        this.autoResolve(j);
      }
    }

    this.worldTick();      // the world moves, with or without her
    this.herTick();        // she does something, where she is
    this.peopleTick();     // and the people in her life live, or leave, or sell her
    this.betrayalTick();   // and somebody close enough to hurt her sometimes does
    this.threatTick();     // and the world sets itself against her, in the feed only you can see
    this.ghostTick();      // and the dead keep asking for what they never got
    this.reflect();        // and on a safe night she turns to you and asks what this is
    this.counsel();        // and sometimes she turns to you and asks what to do about a person
    this.raiseHooks();     // and sometimes puts two things together
    this.offerCompanion(); // and sometimes asks you about somebody
    this.offerCalling();   // and sometimes the world tells her what it has decided she is
    this.offerGreat();     // and one day she is standing outside the worst thing in the world
    this.earnTraits();     // and slowly becomes someone she did not choose to be
    this.confide();        // and tells you how she feels about the people in her life
    this.maybeSpeak();     // and talks to you, less and less
    this.communeTick();    // and answers, a day or two late, the things you asked her

    const learned = this.lens();   // and finds out — witnessed, or late and secondhand
    if (learned) this.say(learned.text, learned.kind);

    // She is badly hurt and has been asking into the dark for a fortnight. That costs
    // her something, and it is not a fortnight of nothing.
    if (s.wounds >= 4 && s.day - (s.lastAnswered ?? 0) > 60 && s.day % 30 === 0) {
      this.condition('faith', FAITH.neglect, 'neglect');
    }

    // upkeep
    if (s.wounds > 0 && this.chance(0.12 + this.bonus('heal') + this.st('body') * 0.10)) s.wounds--;
    this.kitTick();        // what she is carrying, what it costs her, what she has grown into
    this.markTick();       // and some of what it took, it gives back. not all of it.

    // A NAME IS A LIABILITY. The watching power finds a famous woman faster than a
    // quiet one, and there is nothing she can do about it — she cannot put a name down
    // once she has picked it up. This is the cost, and it is not optional.
    if (this.chance(Math.max(0, this.st('name')) * 0.10)) s.attention++;
    this.applyTraitDrift();
    this.applyIntentPull();

    if (s.wounds >= this.killedAt()) {
      s.alive = false;
      this.say(this.line('death'), 'death');
    }
    return s;
  }

  run(days) {
    for (let i = 0; i < days && this.state.alive; i++) this.tick();
    return this.state;
  }

  pickHeroine(name) {
    if (name) return name;
    const pool = ['Suri', 'Kessa', 'Sarel', 'Ossa', 'Nim', 'Ammer', 'Willa', 'Isolt', 'Marla', 'Halda'];
    return this.pick(pool);
  }
}
