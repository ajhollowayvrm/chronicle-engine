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
import { VOICE, speaksTo } from '../gen/tables/voice.js';
import { TRAITS } from '../gen/tables/traits.js';
import { STATS, STAT_MAX, SKILLS, CONDITIONS, toNext, SHE_NOTICED, HEART, FAITH } from '../gen/tables/stats.js';

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
        buried: 0, nights_alone: 0, with_someone: 0, fights: 0,
      },
      traits: [],          // what she has become. she cannot choose these. neither can you.

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
  st(k) { return (this.state.stat[k] - 6) / 12; }

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
  killedAt() { return 5 + Math.floor(this.state.stat.body / 4); }

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

  standing(name) { return this.state.standing[name] ?? 0; }
  nudge(name, d) {
    // NAME: how fast people take sides about her. A woman nobody has heard of is judged
    // slowly; a woman whose name reaches a room before she does is judged the moment
    // she walks in — for and against.
    const speed = 1 + this.trait('standing_speed') + this.st('tongue') * 0.3 + this.st('name') * 0.9;
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
  vocab(extra = {}) {
    const econ = this.law('economy') ?? {};
    const country = this.country();
    const gods = this.world.children.filter((c) => c.kind === 'figure' && c.divine);
    const magic = this.law('magic') ?? {};

    return {
      place: this.here().name,
      country: country?.name ?? 'nobody',
      commodity: econ.resources ?? 'whatever there is',
      pays: econ.who_pays_for_it ?? 'somebody',
      rich: econ.who_is_rich ?? 'whoever holds the paper',
      power: gods.length ? this.pick(gods).name : 'nothing anyone can name',
      cost: magic.types?.length ? this.pick(magic.types).cost : 'more than it says',
      quirk: this.law('technology')?.quirks?.[0] ?? 'nothing anyone will explain',
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

  say(text, kind = 'event', meta = {}) {
    this.state.log.push({ day: this.state.day, kind, text, ...meta });
  }

  // ------------------------------------------------------------------ HER VOICE
  // She knows you are there. This is her talking to you, and it is the only channel
  // in the game that is not the world's account of things.
  speak(text, why = 'close') {
    this.state.spoken++;
    this.state.lastSpoke = this.state.day;
    (this.state.said ??= []).unshift(text);
    this.state.said = this.state.said.slice(0, 6);
    this.state.log.push({ day: this.state.day, kind: 'her', why, text });
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
    if (this.state.day - this.state.lastSpoke < 4) return;
    if (!this.chance(speaksTo(h))) return;

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
    this.speak(this.fresh(cold ? VOICE.cold : VOICE.close), cold ? 'cold' : 'close');
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
      danger: (4 + 8 * this.off('reckless') + unrest) * (1 - 0.7 * hurt) * (1 + this.trait('danger_weight')),
      unrest: unrest * 1.5,
      sick: 3,
      travel: 5 + 3 * this.off('reckless'),
      figure_meet: figures.length ? 9 + 8 * this.off('sociable') : 0,
      figure_clash: figures.length ? 2 + 4 * this.off('reckless') : 0,
      faction_favour: friends.length ? 5 : 0,
      faction_shelter: friends.length ? 3 + 6 * hurt : 0,
      faction_hunted: enemies.length ? 6 : 0,
      // the more the watching power has noticed, the likelier it is to do something
      power: Math.max(0, (s.attention - 8) * 0.7),
    };

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
        const pay = Math.round(this.int(18, 40) * wealth * (1 + this.trait('earn')));
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
        // a tongue is worth money. she argues the figure down, and they let her.
        const toll = Math.round(this.int(10, 40) * (0.5 + tier / 6) * (1 + (econ.pressure ?? 0) * 0.4) * (1 - this.st('tongue') * 0.45));
        const paid = Math.min(s.coin, toll);
        s.coin -= paid;
        s.attention += 1;
        for (const f of ctx.factions) this.nudge(f.name, 0.5);   // compliance is noticed
        return this.say(this.line('law', { coin: paid }), 'event', { id: act });
      }

      case 'defy':
        s.lived.defied++;
        this.use('tongue', 2);
        this.use('nerve', 2);
        this.use('name', 2);      // word of it travels. that is what a name IS.
        // NERVE decides how loud she is to the thing that is counting. a woman who does
        // not shake is a woman it takes longer to find.
        s.attention += Math.max(1, Math.round((2 + this.trait('attention_rate')) * (1 - this.st('nerve') * 0.55)));
        // and a tongue talks her out of the beating
        if (this.chance(Math.max(0.05, 0.45 - this.st('tongue') * 0.5))) s.wounds += 1;
        this.drift('reckless', +0.03);
        for (const f of ctx.factions) this.nudge(f.name, f.kind === 'crime' ? 1.6 : -1.2);
        return this.say(this.line('defy'), 'event', { id: act });

      case 'find': {
        this.use('eye', 3);
        const take = Math.round(this.int(20, 90) * wealth * (1 + this.st('eye') * 0.6));
        s.coin += take;
        return this.say(this.line('find', { coin: take }), 'event', { id: act });
      }

      case 'relic':
        this.use('eye');
        s.attention += Math.max(1, Math.round(2 * (1 - this.st('nerve') * 0.5)));
        return this.say(this.line('relic'), 'event', { id: act });

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
        if (with_.length && s.wounds >= 3 && this.chance(0.3)) {
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
        // her traits and her hand are here, and only here, and she paid for both
        const swing = this.rng() * 2 - 1 + 0.4 * this.off('reckless') + this.trait('swing')
          + this.st('hand') * 0.9 + this.st('nerve') * 0.45;
        if (swing < -0.45) {
          s.wounds += 2;
          s.lived.hurt_badly++;
          this.use('body', 3);   // she was hurt, and got up. that is how a body is made.
          s.coin = Math.max(0, s.coin - this.int(10, 50));
          this.drift('reckless', -0.05);
        } else {
          s.wounds += 1;
          s.coin += this.int(10, 40);
          this.drift('reckless', +0.02);
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
        s.coin += this.int(8, 25);
        this.nudge(f.name, 0.5);
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
    this.state.coin = Math.max(0, this.state.coin - Math.round(this.int(5, 18) * (1 + this.trait('travel_cost') - foot * 0.4)));
    if (this.chance(Math.max(0.02, (0.15 - foot * 0.09) * (1 + this.trait('travel_wound'))))) this.state.wounds += 1;

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
    const faith = clamp(this.state.stat.faith / 14, 0.08, 1);
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
          ? `${f.name} knew who she was at ${this.here().name} before she said a word, and had already decided. she has stopped being surprised by this and has not stopped minding it.`
          : `${f.name} had heard of her at ${this.here().name}, and was pleased to, and she cannot work out whether that is worse.`,
        'event', { id: 'meet' });
    }

    // What passes between them depends on what is ALREADY between them. A meeting with a
    // rival is not a meeting with a friend, and she does not get to choose which.
    if (k === 'enemy' || k === 'feud') {
      shift(b, { friction: +1 }, null, s.day);
      this.use('nerve');
      return this.say(this.pick([
        `${f.name} was at ${this.here().name}. neither of them left, and neither of them spoke, and the whole room understood.`,
        `she and ${f.name} were in one room at ${this.here().name} for an hour. she counted every minute of it.`,
      ]), 'event', { id: 'meet' });
    }

    if (k === 'rival' || k === 'complicated') {
      shift(b, {
        friction: this.chance(0.6) ? +1 : 0,
        closeness: this.chance(0.3) ? +1 : 0,
      }, 'they cannot leave each other alone', s.day);
      return this.say(this.pick([
        `she drank with ${f.name} at ${this.here().name} and they argued about nothing for three hours, and both enjoyed it, and neither will admit that.`,
        `${f.name} still wants ${b.node?.wants ?? 'the thing she wants'}. so does she. they were civil about it, and it cost them both.`,
        `she and ${f.name} were pleasant to each other at ${this.here().name}. it was the most unpleasant hour of her week.`,
      ]), 'event', { id: 'meet' });
    }

    // an ordinary meeting. this is how all of it starts.
    b.lastSeen = s.day;
    const isNew = b.closeness === 0 && b.friction === 0;
    shift(b, { closeness: +1, trust: this.chance(0.5) ? +1 : 0 },
      isNew ? `she met them at ${this.here().name}` : null, s.day, isNew);
    this.ripple(f.name, 0.5);   // even drinking with somebody is taking a side, a little

    return this.say(this.pick([
      `she met ${f.name} at ${this.here().name}. they want ${f.wants ?? 'something they would not say'}. she has not decided yet whether that is a problem.`,
      `she drank with ${f.name} at ${this.here().name}, who said out loud what they wanted, which she found either brave or stupid.`,
      `${f.name} bought her a drink at ${this.here().name} and asked her nothing, and she has been braced ever since.`,
      `${f.name} is at ${this.here().name}, known for ${f.known_for ?? 'nothing she can confirm'}. she has been careful to be somewhere else, and today she was not.`,
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
    if ((b.friction >= 12 || s.stat.heart <= 3) && this.chance(0.12)) return this.lose(b, 'left');

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

    // ── ROMANCE. It does not happen because a bar filled. It happens because two people
    //    kept turning up, and then one of them noticed. She does not start a second one
    //    while she is in the first — she is not a saint, but she is not a fool either.
    if (!lover && b.romance === 0 && b.closeness >= 11 && b.trust >= 9 && s.stat.heart >= 7 && this.chance(0.10)) {
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
      // HEART gates this. An empty woman cannot let anybody in. Not won't — CAN'T.
      if (!this.chance(clamp((s.stat.heart / 14) * (0.28 + 0.3 * this.off('sociable')), 0, 0.8))) continue;

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
      day: s.day, kind: 'judgment', by, id: j.id,
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
    if (!this.chance(0.05 + 0.05 * (s.stat.faith / 20))) return;   // she asks more if she believes in you

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
    const said = (text) => s.log.push({ day: s.day, kind: 'judgment', by, id: j.id, text: `${text} [${by === 'you' ? 'you' : 'she'} decided]` });

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
        this.say(`she settled it with ${j.who} at ${this.here().name}.${b.alive ? ' they are still breathing. neither of them is sure why.' : ' they are not breathing.'}`, 'loss');
        said(`she settled it with ${j.who}`);
      } else {
        // FORGIVENESS IS THE HARDEST THING IN THE GAME AND IT COSTS THE MOST.
        shift(b, { friction: -6, trust: +1 }, 'she let it go, which nobody who knows her believed she would', s.day, true);
        this.condition('heart', +2, 'forgave');
        this.speak(this.pick([
          'I let it go. I want to be clear that I did not forgive them. I let it go. There is a difference and it is the only thing I have.',
          'I did not settle it. Everyone is waiting for me to and I am not going to and I cannot explain why to them or to you.',
        ]), 'close');
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

    // ── the dead
    if (j.id.startsWith('ghost_')) {
      const g = s.ghosts.find((x) => x.name === j.who);
      if (key === 'finish' && g) {
        g.settled = s.day;
        s.coin = Math.max(0, s.coin - this.int(40, 120));
        this.condition('heart', +3, 'settled');
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
      this.say(
        `she put two things together at ${site.node.name}. ${h.facts[0]}. and: ${h.facts[1]}.`,
        'hook'
      );
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
    // for, and it is the one that can be lost.
    this.condition('faith', FAITH.answered, 'answered');
    s.lastAnswered = s.day;
    if (j.kind === 'join') this.resolveJoin(j, key, 'you');
    else if (j.kind === 'romance') this.resolveRomance(j, key, 'you');
    else if (j.kind === 'counsel') this.resolveCounsel(j, key, 'you');
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
      day: this.state.day, kind: 'judgment', by, id: j.id,
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
      const closed = this.state.stat.faith < 8 || this.state.stat.heart < 7;
      const pickKey = closed ? keys[keys.length - 1] : this.pick(keys);
      this.speak(this.fresh(VOICE.absent), 'absent');
      return this.resolveCounsel(j, pickKey, 'her');
    }
    if (j.kind === 'romance') {
      // SHE ASKED YOU ABOUT LOVE AND YOU DID NOT COME. She decides — and a woman who has
      // stopped believing anybody is listening is far likelier to let it go past. This is
      // the cruellest thing Faith does, and it is the correct thing for it to do.
      const yes = this.chance(clamp(0.25 + 0.4 * this.off('sociable') + this.state.stat.faith / 40, 0, 0.85));
      this.speak(this.fresh(VOICE.absent), 'absent');
      return this.resolveRomance(j, yes ? 'yes' : 'no', 'her');
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
      text = this.pick([
        `she said nothing, and kept it. ${j.collision}. she is the only person she knows who knows.`,
        `she has told nobody. ${j.collision}. she takes it out and looks at it some nights, the way you check a wound.`,
        `she kept it to herself. ${j.collision}. it is the most valuable thing she owns and she cannot spend it.`,
      ]);
    }
    this.state.log.push({ day: s.day, kind: 'judgment', by, text, id: j.id });
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
    this.ghostTick();      // and the dead keep asking for what they never got
    this.counsel();        // and sometimes she turns to you and asks what to do about a person
    this.raiseHooks();     // and sometimes puts two things together
    this.offerCompanion(); // and sometimes asks you about somebody
    this.earnTraits();     // and slowly becomes someone she did not choose to be
    this.maybeSpeak();     // and talks to you, less and less

    const learned = this.lens();   // and finds out — witnessed, or late and secondhand
    if (learned) this.say(learned.text, learned.kind);

    // She is badly hurt and has been asking into the dark for a fortnight. That costs
    // her something, and it is not a fortnight of nothing.
    if (s.wounds >= 4 && s.day - (s.lastAnswered ?? 0) > 60 && s.day % 30 === 0) {
      this.condition('faith', FAITH.neglect, 'neglect');
    }

    // upkeep
    if (s.wounds > 0 && this.chance(0.12 + this.trait('heal') + this.st('body') * 0.10)) s.wounds--;

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
