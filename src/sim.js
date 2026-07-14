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

      // People from the WORLD who walk with her. Not strangers — figures out of the
      // tree, with wants of their own and names that appear elsewhere.
      companions: [],
      met: {},             // figure name -> how many times she has dealt with them
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
        const f = this.pick(ctx.figures);
        this.use('tongue');
        s.met[f.name] = (s.met[f.name] ?? 0) + 1;      // this is how a companion begins
        this.drift('sociable', +0.02);
        return this.say(this.line('figure_meet', { figure: f.name, want: f.wants ?? 'something she cannot get out of them', known: f.known_for ?? 'nothing she can confirm' }), 'event', { id: act });
      }

      case 'figure_clash': {
        const f = this.pick(ctx.figures);
        s.attention += 1;
        return this.say(this.line('figure_clash', { figure: f.name }), 'event', { id: act });
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

  // =============================================================== THE COMPANIONS
  //
  // Not strangers. FIGURES OUT OF THE TREE — people the world already knows about, who
  // have a want of their own and a name that turns up elsewhere. When Ovett the Copyist
  // walks with her, she is walking with a man whose want is now in play, and you are
  // the one who gets asked whether she helps him get it.
  //
  // A figure with `in_person` is somewhere, and can move. So when one joins her, the
  // node MOVES in the tree, and the world stops having them where they were.
  withHer() { return this.state.companions.filter((c) => c.alive); }

  offerCompanion() {
    const s = this.state;
    if (this.withHer().length >= 2) return;
    if (s.pending.some((p) => p.kind === 'join')) return;

    for (const f of this.figuresHere()) {
      if (f.divine) continue;
      if (s.companions.some((c) => c.name === f.name)) continue;
      if ((s.met[f.name] ?? 0) < 2) continue;          // she has to actually know them
      // HEART: an empty woman cannot let anybody in. Not won't — CAN'T. This is what
      // burying people does to her, and it is why the companion system has stakes.
      if (!this.chance(clamp((s.stat.heart / 14) * (0.3 + 0.3 * this.off('sociable')), 0, 0.8))) continue;

      s.pending.push({
        id: `join_${f.name}`,
        kind: 'join',
        who: f.name,
        wants: f.wants ?? null,
        raisedOn: s.day,
        dueOn: s.day + 4,
        prompt: `${f.name} wants to come with me. ${f.wants ? `They want ${f.wants}.` : ''} ${this.pick(VOICE.ask)}`,
      });
      return;
    }
  }

  takeCompanion(name) {
    const s = this.state;
    const found = [...walk(this.world)].find(({ node: n }) => n.kind === 'figure' && n.name === name);
    if (!found) return;
    const { node: f, path } = found;

    // the figure LEAVES the world where they were. they are with her now.
    const parent = path[path.length - 1];
    parent.children = parent.children.filter((c) => c !== f);
    f.with_her = true;

    s.companions.push({ name: f.name, node: f, bond: 3, alive: true, joined: s.day, wants: f.wants ?? null });
    this.say(`${f.name} is walking with her now. ${f.one_line ?? ''}`.trim(), 'join');
  }

  companionTick() {
    const s = this.state;
    const with_ = this.withHer();
    if (!with_.length) {
      s.lived.nights_alone++;
      // being alone is not neutral. it costs her, slowly, and she does not notice until
      // she cannot do the other thing any more.
      if (s.lived.nights_alone % 45 === 0) this.condition('heart', HEART.alone_long, 'alone');
      return;
    }
    s.lived.with_someone++;

    const c = this.pick(with_);
    if (!this.chance(0.12)) return;

    // they die. they are figures, so the WORLD loses them too — and it remembers,
    // because a figure who is dead is a figure with a status, not a figure who is gone.
    if (s.wounds >= 3 && this.chance(0.2)) {
      c.alive = false;
      c.node.status = `dead — she buried them at ${this.here().name}`;
      s.ghosts.push({ name: c.name, why: 'died', day: s.day, wanted: c.wants });
      s.lived.buried++;
      this.condition('heart', HEART.buried, 'buried');   // this is what burying somebody costs
      this.say(
        `${c.name} is dead. she buried them at ${this.here().name}.` +
        (c.wants ? ` they never got ${c.wants}.` : ''),
        'loss'
      );
      this.speak(this.fresh(VOICE.grief), 'grief');
      return;
    }

    c.bond = Math.min(20, c.bond + 1);
    if (this.chance(0.35)) this.condition('heart', HEART.company, 'company');  // it comes back, slowly
    this.say(this.pick([
      `a quiet hour with ${c.name}. neither of them said anything worth writing down, and something got said anyway.`,
      `${c.name} asked her a question she did not answer, and did not leave, and that was the whole conversation.`,
      `${c.name} still wants ${c.wants ?? 'something they will not name'}. she has started to want it for them, which is new and unwelcome.`,
      `she took the second watch so ${c.name} could sleep, and did not tell them, and ${c.name} knew.`,
    ]), 'bond');
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
      // she waited. you did not come. she decides, weighted by how alone she is willing
      // to be — and then she tells you about it.
      const yes = this.chance(0.4 + 0.45 * this.off('sociable'));
      this.speak(this.fresh(VOICE.absent), 'absent');
      return this.resolveJoin(j, yes ? 'yes' : 'no', 'her');
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
    this.companionTick();  // and whoever is walking with her lives, or does not
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
