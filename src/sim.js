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
  figuresHere() {
    return this.here().children.filter((c) => c.kind === 'figure');
  }
  standing(name) { return this.state.standing[name] ?? 0; }
  nudge(name, d) {
    this.state.standing[name] = clamp(this.standing(name) + d, -20, 20);
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
      danger: (4 + 8 * this.off('reckless') + unrest) * (1 - 0.7 * hurt),
      unrest: unrest * 1.5,
      sick: 3,
      travel: 5 + 3 * this.off('reckless'),
      figure_meet: figures.length ? 5 + 6 * this.off('sociable') : 0,
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
        const pay = Math.round(this.int(18, 40) * wealth);
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
        const toll = Math.round(this.int(10, 40) * (0.5 + tier / 6) * (1 + (econ.pressure ?? 0) * 0.4));
        const paid = Math.min(s.coin, toll);
        s.coin -= paid;
        s.attention += 1;
        for (const f of ctx.factions) this.nudge(f.name, 0.5);   // compliance is noticed
        return this.say(this.line('law', { coin: paid }), 'event', { id: act });
      }

      case 'defy':
        s.attention += 2;
        if (this.chance(0.45)) s.wounds += 1;
        this.drift('reckless', +0.03);
        for (const f of ctx.factions) this.nudge(f.name, f.kind === 'crime' ? 1.6 : -1.2);
        return this.say(this.line('defy'), 'event', { id: act });

      case 'find': {
        const take = Math.round(this.int(20, 90) * wealth);
        s.coin += take;
        return this.say(this.line('find', { coin: take }), 'event', { id: act });
      }

      case 'relic':
        s.attention += 2;
        return this.say(this.line('relic'), 'event', { id: act });

      case 'danger': {
        const swing = this.rng() * 2 - 1 + 0.4 * this.off('reckless');
        if (swing < -0.45) {
          s.wounds += 2;
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
        s.wounds += 1;
        return this.say(this.line('sick'), 'event', { id: act });

      case 'travel':
        return this.travel();

      case 'power': {
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
    this.state.coin = Math.max(0, this.state.coin - this.int(5, 18));
    if (this.chance(0.15)) this.state.wounds += 1;

    // the arrival is rendered from where she now IS, so the vocabulary (commodity,
    // who pays, the law) is already the new country's before the sentence is written
    return this.say(this.line('arrive', { from: from.node.name }), 'travel', { id: 'travel' });
  }

  // how much of the player's suggestion survives contact with the woman she has
  // become. falls as `true` drifts from `intent`.
  heeds() {
    const gap = ['reckless', 'sociable', 'generous']
      .reduce((m, d) => m + Math.abs(this.state.true[d] - this.state.intent[d]), 0) / 3;
    return clamp(1 - gap / 22, 0.1, 1);
  }

  drift(dial, d) {
    this.state.true[dial] = clamp(this.state.true[dial] + d * 10, 0, 100);
  }

  applyIntentPull() {
    for (const d of ['reckless', 'sociable', 'generous']) {
      const gap = this.state.intent[d] - this.state.true[d];
      this.state.true[d] = clamp(this.state.true[d] + gap * 0.012, 0, 100);
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
    this.resolveHook(j, key, 'you');
    return j;
  }

  // Unanswered judgments resolve THEMSELVES, weighted by who she has become. This is
  // the load-bearing mechanic and it survived the rebuild: it gives a real reason to
  // check in, it makes her a person rather than a puppet, and it makes neglect a
  // legitimate playstyle with a legitimate cost.
  autoResolve(j) {
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

    // judgments she never answered decide themselves, weighted by who she has become
    for (const j of [...s.pending]) {
      if (s.day >= j.dueOn) {
        s.pending = s.pending.filter((p) => p !== j);
        this.autoResolve(j);
      }
    }

    this.worldTick();     // the world moves, with or without her
    this.herTick();       // she does something, where she is
    this.raiseHooks();    // and sometimes puts two things together

    const learned = this.lens();   // and finds out — witnessed, or late and secondhand
    if (learned) this.say(learned.text, learned.kind);

    // upkeep
    if (s.wounds > 0 && this.chance(0.12)) s.wounds--;
    this.applyIntentPull();

    if (s.wounds >= 6) {
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
