import { events } from './events.js';
import { fill, validatePack, STANDING_FRIEND, STANDING_ENEMY, SCHOOL_MAX } from './lore.js';

// ---------------------------------------------------------------- seeded RNG
// mulberry32: same seed => same run, always. essential for an idle game,
// because the client must be able to recompute an absence deterministically.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// box-muller, for outcome variance
function gauss(rng) {
  const u = 1 - rng(), v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// Unclaimed ground. No toll, no tax, and the watching power has to come and find
// her itself. This is what an unowned region is worth, and why she goes there.
const NO_LAW = { toll: 0, tax: 0, zeal: 0.5, outlaws: [] };

// ---------------------------------------------------------------- state
export function newAdventurer(name, dials) {
  return {
    name,
    day: 1,
    alive: true,
    coin: 40,
    wounds: 0,
    renown: 0,
    relics: 0,
    threads: 0,
    morale: 50,
    grief: 0,

    // INTENT: what the player sets on the dials.
    intent: { reckless: 50, sociable: 50, generous: 50, ...dials },
    // TRUE: who she actually is. lags behind intent. drifts from lived events.
    true: { reckless: 50, sociable: 50, generous: 50, ...dials },

    // The world's law and its quarrels, as they stand TODAY. Seeded from the pack
    // and then mutated by history — a king dies, the tolls double, a war starts.
    // The pack is the world as she found it; this is the world as it is now.
    law: {},
    relations: {},

    // What she has actually been TAUGHT, and paid for. skill -> 0..SCHOOL_MAX.
    // The only thing in this state that gets strictly better, and the only thing
    // coin can buy.
    skills: {},

    // Who is keeping score on her. id -> -20..+20. She never sets these; they are
    // a ledger of what she has actually done, kept by people who were watching.
    standing: {},
    allegiance: null,   // the one she has actually thrown in with, if any

    region: 0,          // which region she is standing in. index into lore.regions.
    // Where the player has SUGGESTED she go — a region id, or null. It is not an
    // order. `chooseDestination` weights it by `heeds()`, so a woman who has
    // stopped listening will take the suggestion under advisement and go
    // somewhere else. The player never moves her directly; that is the thesis.
    suggested: null,
    seen: [],           // regions she has set foot in

    companions: [],
    ghosts: [],
    debts: [],
    // the watching power. the engine does not know its name — the lore pack does.
    watch: { attention: 0 },
    flags: {},

    pending: [],   // judgments awaiting the player
    recent: [],    // event ids fired lately -> pity suppression
    log: [],       // the raw chronicle
    usedNames: [],
  };
}

// ---------------------------------------------------------------- engine
export class Engine {
  constructor({ seed = 1, name, dials = {}, lore } = {}) {
    if (!lore) throw new Error('Engine needs a lore pack — the world has no names without one');
    const bad = validatePack(lore);
    if (bad.length) throw new Error(`bad lore pack "${lore.id}": ${bad.join('; ')}`);

    this.rng = mulberry32(seed);
    this.lore = lore;

    // Even her name comes from the world she was born into. `heroines` exists
    // because the adventurer is always "she" and `names` is the whole population,
    // male names included — drawing hers from the general pool produced a woman
    // called Torvald. Packs without a `heroines` list fall back to the pool.
    const hers = lore.heroines?.length ? lore.heroines : lore.names;
    this.state = newAdventurer(name ?? this.pick(hers), dials);
    this.state.usedNames.push(this.state.name);

    // she is from somewhere. two women in the same world do not start in the same
    // place, and the region she opens in colours her first fifty days.
    this.state.region = Math.floor(this.rng() * lore.regions.length);
    this.state.seen = [this.state.region];

    // the world as she found it. history edits these, not the pack.
    for (const p of lore.polities ?? []) {
      this.state.law[p.id] = { ...p.laws, outlaws: [...(p.laws.outlaws ?? [])] };
      for (const [other, rel] of Object.entries(p.relations ?? {})) {
        this.state.relations[`${p.id}|${other}`] = rel;
      }
    }
  }

  // dial offset in -1..+1. NOTE: reads from `true`, not `intent`.
  // the player's slider is a request; her history is the answer.
  off(dial) { return (this.state.true[dial] - 50) / 50; }

  // variance scales with recklessness: same mean, fatter tails
  vary(mean, spread) {
    const sigma = spread * (1 + 0.6 * this.off('reckless'));
    return mean * (1 + sigma * gauss(this.rng));
  }

  // any quantity that reaches the player must be non-negative. vary() is a
  // gaussian and its tails WILL go under zero. always use this for money.
  varyPos(mean, spread) { return Math.max(0, Math.round(this.vary(mean, spread))); }

  // How well a thing went, as a z-score around zero: negative is bad, positive
  // is good, and recklessness widens BOTH tails. Use this to branch an outcome.
  //
  // Do not reach for vary(0, ...) here — it scales a mean, so a mean of zero is
  // always exactly zero. `ambush` and `beast` did exactly that, which quietly
  // pinned every fight to its middle branch: across 1,620 lives at every corner
  // of the dial space, she never once won an ambush outright, was never once
  // ruined by one, and was never once mauled. Four slots of prose were dead.
  swing() { return gauss(this.rng) * (1 + 0.6 * this.off('reckless')); }

  chance(p) { return this.rng() < p; }
  pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }

  // --- the lore surface ----------------------------------------------------
  // everything the event table uses to say a word out loud. all of it routes
  // through this.rng, so a seed + a pack is still a deterministic run.

  // --- geography -----------------------------------------------------------
  // She is always standing in exactly one region, and {place} only ever draws
  // from that region's pool. This is what re-colours the whole pack as she moves
  // without a line of it being rewritten per region.

  region(i = this.state.region) { return this.lore.regions[i]; }
  regionName(i) { return this.region(i).name; }
  place() { return this.pick(this.region().places); }
  wealth() { return this.region().wealth ?? 1; }

  // what she EARNS, scaled by how rich the ground under her is. what she is
  // charged is not scaled — a toll is a toll, and being shaken down in a poor
  // country is exactly as expensive and hurts more.
  earn(mean, spread) {
    const gross = this.vary(mean, spread) * this.wealth();
    return Math.max(0, Math.round(gross * (1 - (this.laws().tax ?? 0))));
  }

  // How much of the player's suggestion she actually takes. `intent` is a request
  // and `true` is who she is, so the further she has drifted from the dials you
  // set, the less she listens — including about where to go. This is the "she
  // stops listening to you" reveal made mechanical rather than printed.
  heeds() {
    const gap = ['reckless', 'sociable', 'generous']
      .reduce((m, d) => m + Math.abs(this.state.true[d] - this.state.intent[d]), 0) / 3;
    return clamp(1 - gap / 22, 0.1, 1);
  }

  fill(template, vars) {
    return fill(template, this.lore, { region: this.regionName(), ...vars });
  }

  regionLine(i, slot, vars) {
    const options = this.region(i)?.lines?.[slot];
    if (!options?.length) return `[missing lore: region.${slot}]`;
    return this.fill(this.pick(options), vars);
  }

  // --- polities: the law of the ground she is standing on ------------------
  //
  // Law is not a property of the world, it is a property of WHERE SHE IS. Walk
  // across a frontier and the tolls, the taxes, and how hard the power's agents
  // lean on her all change. A region may belong to nobody, and an unclaimed
  // country is the only ground in the world where none of this reaches her.

  polities() { return this.lore.polities ?? []; }
  polity(id) { return this.polities().find((p) => p.id === id) ?? null; }

  // Live law: the pack ships the starting values, and history mutates them, so
  // this reads from state, not from the pack.
  lawOf(id) {
    if (!id) return null;
    return this.state.law[id] ?? this.polity(id)?.laws ?? null;
  }

  here() { return this.polity(this.region().polity); }
  laws() { return this.lawOf(this.region().polity) ?? NO_LAW; }

  relation(a, b) {
    if (!a || !b || a === b) return null;
    return this.state.relations?.[`${a}|${b}`] ?? this.polity(a)?.relations?.[b] ?? null;
  }

  setRelation(a, b, rel) {
    this.state.relations[`${a}|${b}`] = rel;
    this.state.relations[`${b}|${a}`] = rel;
  }

  // A region on the frontier of a country its owner is at war with is a different
  // place to walk than an interior one, and this is what gives the map teeth.
  atWarBorder() {
    const mine = this.region().polity;
    if (!mine) return false;
    return (this.region().borders ?? []).some((other) => this.relation(mine, other) === 'war');
  }

  polityLine(id, slot, vars) {
    const options = this.polity(id)?.lines?.[slot];
    if (!options?.length) return `[missing lore: polity.${slot}]`;
    return this.fill(this.pick(options), { polity: this.polity(id).name, ...vars });
  }

  historyLine(slot, vars) {
    const options = this.lore.history?.[slot];
    if (!options?.length) return `[missing lore: history.${slot}]`;
    return this.fill(this.pick(options), vars);
  }

  // Being a known friend of a faction this country has outlawed is not a thing she
  // gets to explain her way out of.
  outlawedHere() {
    const out = this.laws().outlaws ?? [];
    return this.factions().filter((f) => out.includes(f.id) && this.standing(f.id) >= STANDING_FRIEND);
  }

  // The world turns. Kings die, tolls go up, wars start and stop, and a country
  // decides overnight that a faction she drinks with is illegal.
  //
  // The rule that keeps this from becoming a newsfeed she is not in: every one of
  // these mutates law she will actually FEEL — the toll she pays next week, the
  // frontier that just became a war zone, the friends who are now a liability.
  // Nothing happens here that she cannot run into.
  turnTheWorld() {
    const ps = this.polities();
    // Mostly it is THIS country that moves, because she is standing in it and
    // {place} is one of its towns. Picking freely posted the March's proclamations
    // on League noticeboards and read like nonsense. She can still hear about
    // somewhere else — news travels — but the default is the ground under her.
    const a = this.here() && this.chance(0.7) ? this.here() : this.pick(ps);
    const others = ps.filter((p) => p.id !== a.id);
    const b = others.length ? this.pick(others) : null;
    const place = this.place();
    const law = this.state.law[a.id];

    const roll = this.rng();

    if (b && roll < 0.22 && this.relation(a.id, b.id) !== 'war') {
      this.setRelation(a.id, b.id, 'war');
      // a war makes both of them harder places to be
      this.state.law[a.id].toll += 0.3;
      this.state.law[b.id].toll += 0.3;
      return this.historyLine('war_declared', { polity: a.name, other: b.name, place });
    }

    if (b && roll < 0.38 && this.relation(a.id, b.id) === 'war') {
      this.setRelation(a.id, b.id, 'cold');
      return this.historyLine('peace_made', { polity: a.name, other: b.name, place });
    }

    if (roll < 0.58) {
      law.toll = Math.min(3, law.toll + 0.35);
      law.tax = Math.min(0.45, law.tax + 0.03);
      return this.historyLine('tolls_raised', { polity: a.name, place });
    }

    if (roll < 0.78) {
      // a dead ruler is a coin-flip: the next one is worse, or the grip slackens
      const worse = this.chance(0.5);
      law.zeal = clamp(law.zeal + (worse ? 0.5 : -0.4), 0, 3);
      law.toll = clamp(law.toll + (worse ? 0.2 : -0.3), 0, 3);
      return this.historyLine('ruler_dies', { polity: a.name, place });
    }

    // outlaw a faction that is not already outlawed here
    const legal = this.factions().filter((f) => !law.outlaws.includes(f.id));
    if (legal.length) {
      const f = this.pick(legal);
      law.outlaws.push(f.id);
      return this.historyLine('faction_outlawed', { polity: a.name, faction: f.name, place });
    }

    law.toll = Math.min(3, law.toll + 0.2);
    return this.historyLine('tolls_raised', { polity: a.name, place });
  }

  // --- factions ------------------------------------------------------------

  factions() { return this.lore.factions ?? []; }
  faction(id) { return this.factions().find((f) => f.id === id) ?? null; }
  standing(id) { return this.state.standing[id] ?? 0; }

  factionLine(id, slot, vars) {
    const options = this.faction(id)?.lines?.[slot];
    if (!options?.length) return `[missing lore: faction.${slot}]`;
    return this.fill(this.pick(options), { faction: this.faction(id).name, ...vars });
  }

  allegianceLine(id, slot, vars) {
    const options = this.faction(id)?.allegiance?.[slot];
    if (!options?.length) return `[missing lore: allegiance.${slot}]`;
    return this.fill(this.pick(options), { faction: this.faction(id).name, ...vars });
  }

  nudgeStanding(id, d) {
    if (!this.faction(id)) return;
    this.state.standing[id] = clamp(this.standing(id) + d, -20, 20);
  }

  // Every faction scores every event she survives. She is not asked her opinion.
  // This is the whole faction system: her reputation is the sum of what she did
  // while somebody was watching, which is the only kind of reputation there is.
  scoreEvent(eventId) {
    for (const f of this.factions()) {
      const d = f.wants?.[eventId];
      if (d) this.nudgeStanding(f.id, d);
    }
  }

  friends() { return this.factions().filter((f) => this.standing(f.id) >= STANDING_FRIEND); }
  enemies() { return this.factions().filter((f) => this.standing(f.id) <= -STANDING_ENEMY); }

  // --- schools -------------------------------------------------------------
  // Where the coin finally goes. Every school teaches exactly one of the four
  // things the engine knows how to do; the pack decides who they are.

  schools() { return this.lore.schools ?? []; }
  school(id) { return this.schools().find((s) => s.id === id) ?? null; }
  skill(k) { return this.state.skills?.[k] ?? 0; }

  // the second lesson costs twice the first, the third three times. a mastery is
  // meant to be a fortune, so that the fortune events have something to be for.
  schoolCost(sc) { return Math.round(sc.cost * (1 + this.skill(sc.teaches))); }

  // she can only be taught here if she is standing in the right country, can pay,
  // and has not already learned everything they know
  canTrain(sc) {
    if (sc.region && this.region().id !== sc.region) return false;
    if (this.skill(sc.teaches) >= SCHOOL_MAX) return false;
    return this.state.coin >= this.schoolCost(sc);
  }

  trainAt(sc) {
    const cost = this.schoolCost(sc);
    this.state.coin = Math.max(0, this.state.coin - cost);
    this.state.skills[sc.teaches] = this.skill(sc.teaches) + 1;
    return cost;
  }

  schoolLine(id, slot, vars) {
    const options = this.school(id)?.lines?.[slot];
    if (!options?.length) return `[missing lore: school.${slot}]`;
    return this.fill(this.pick(options), { school: this.school(id).name, ...vars });
  }

  // A slot draws from the world's pool PLUS whatever the region she is standing in
  // adds to it. The world pool must stay terrain-neutral — she carries it from the
  // salt to the reeds — and anything that names the ground belongs to the region
  // that has that ground. Otherwise she gets "ambushed out of the canal shade"
  // forty miles into a salt flat, which is what the first pass did.
  line(slot, vars) {
    const world = this.lore.lines[slot] ?? [];
    const local = this.region().lines?.[slot] ?? [];
    const options = local.length ? [...world, ...local] : world;
    // validatePack guarantees this exists; if it somehow doesn't, say so loudly
    // in the chronicle rather than writing "undefined" into the player's story
    if (!options.length) return `[missing lore: ${slot}]`;
    return this.fill(this.pick(options), vars);
  }

  judgmentLine(judgment, option, vars) {
    const lines = this.lore.judgments[judgment]?.options?.[option]?.lines;
    if (!lines?.length) return `[missing lore: ${judgment}.${option}]`;
    return this.fill(this.pick(lines), vars);
  }

  // The question the player is actually asked. A pack may give one string or a
  // list — a list, please: `stranger` raises this ~13 times in a long life, and
  // a single fixed prompt is the stutter the player sees MOST, because it is the
  // one thing on screen when they are asked to decide something.
  judgmentPrompt(judgment, vars) {
    const p = this.lore.judgments[judgment]?.prompt;
    if (!p?.length) return `[missing lore: ${judgment}.prompt]`;
    return this.fill(Array.isArray(p) ? this.pick(p) : p, vars);
  }

  pickUnusedName() {
    const free = this.lore.names.filter((n) => !this.state.usedNames.includes(n));
    const n = free.length ? this.pick(free) : this.pick(this.lore.names);
    this.state.usedNames.push(n);
    return n;
  }

  // --- drift: lived experience moves who she actually is -------------------
  drift(dial, delta) {
    this.state.true[dial] = clamp(this.state.true[dial] + delta * 50, 0, 100);
  }
  // the slider is a request, not a command. pull is deliberately weak: if the
  // world keeps punishing a disposition, the world wins and she stops listening.
  applyIntentPull() {
    for (const d of ['reckless', 'sociable', 'generous']) {
      const gap = this.state.intent[d] - this.state.true[d];
      this.state.true[d] = clamp(this.state.true[d] + gap * 0.012, 0, 100);
    }
  }

  // --- companions ----------------------------------------------------------
  addCompanion(name, { bond = 1, trust = false } = {}) {
    this.state.companions.push({ name, bond, trust, wounds: 0, alive: true, beloved: false, joined: this.state.day });
  }
  livingCompanion() { return this.state.companions.find((c) => c.alive) || null; }
  bond(c, d) { if (c) c.bond = clamp(c.bond + d, 0, 20); }
  wound(c, d) { if (c) c.wounds += d; }

  // --- judgments -----------------------------------------------------------
  judgment(j) {
    this.state.pending.push({ ...j, raisedOn: this.state.day, dueOn: this.state.day + j.expires });
  }

  // player answers a pending judgment by key
  answer(id, optionKey) {
    const i = this.state.pending.findIndex((j) => j.id === id);
    if (i < 0) return null;
    const j = this.state.pending.splice(i, 1)[0];
    const line = j.options[optionKey].apply(this);
    this.state.log.push({ day: this.state.day, kind: 'judgment', by: 'player', text: line });
    return line;
  }

  // she decides for herself. weights come from `true`, i.e. from who she has become.
  autoResolve(j) {
    const keys = Object.keys(j.options);
    const w = keys.map((k) => Math.max(0.02, j.options[k].weight(this.state)));
    const total = w.reduce((a, b) => a + b, 0);
    let r = this.rng() * total;
    let chosen = keys[keys.length - 1];
    for (let i = 0; i < keys.length; i++) { r -= w[i]; if (r <= 0) { chosen = keys[i]; break; } }
    const line = j.options[chosen].apply(this);
    this.state.log.push({ day: this.state.day, kind: 'judgment', by: 'her', text: line });
  }

  // A badly hurt woman does not go looking for a fight, and she takes the paying
  // work that lets her sit still. This is NOT a fourth dial — it is her body
  // overriding her intentions, and it reads from `wounds`, not from `true`.
  //
  // It is also the only negative feedback in the sim, and it has to exist. Death
  // is a hard threshold (6 wounds) and healing is slow, so without this a single
  // bad week compounds: ruin (+3), maul (+2), fever (+1) and she is dead on day
  // 20 of a world the player has not met yet. One life in ten ended before day 24.
  // Now the wounds bend the road toward rest, and she limps out of it — or she
  // doesn't, and that reads as a life rather than a dice accident.
  // Swept against lifespan (see the tuning note below): a heavier rest-pull than
  // this turns a wounded stretch into a monotonous run of camp-and-work, which is
  // safe and boring. Danger is pushed down harder than rest is pulled up.
  woundAversion(e) {
    const hurt = Math.min(1, this.state.wounds / 5);   // 0 when whole, 1 when nearly dead
    if (e.tags?.includes('danger')) return 1 - 0.65 * hurt;   // bottoms out at 35%, never zero
    if (e.tags?.includes('rest')) return 1 + 0.40 * hurt;     // quiet_camp and work — the two that mend her
    return 1;
  }

  // The ground she is standing on gets a vote too. A region multiplies an event's
  // weight by its trait for each of that event's tags: a border march makes
  // `danger` likelier, a market delta makes `fortune` and `town` likelier. Same
  // rule as the dials — a region shifts texture, it can never delete a genre, so
  // this is floored below rather than allowed to run to zero.
  regionPull(e) {
    let m = 1;
    const traits = this.region().traits;
    if (traits) for (const tag of e.tags ?? []) m *= traits[tag] ?? 1;

    // the law of the ground presses on the events it owns
    const toll = this.laws().toll ?? 0;
    if (e.tags?.includes('power')) m *= 0.35 + toll;      // a hard country stops her more

    // and a frontier with a war on the other side of it is not a road, it is a
    // place where things happen to people
    if (this.atWarBorder()) {
      if (e.tags?.includes('danger')) m *= 1.45;
      if (e.tags?.includes('town')) m *= 0.7;
      if (e.tags?.includes('fortune')) m *= 1.2;   // and it pays, for exactly that reason
    }
    return m;
  }

  // --- event selection -----------------------------------------------------
  weightsFor(list) {
    return list.map((e) => {
      let w = e.base;
      let mult = 1;
      for (const [dial, s] of Object.entries(e.sens || {})) mult += this.off(dial) * s;
      mult *= this.regionPull(e);                      // where she is shapes what happens
      w = Math.max(e.base * 0.12, w * mult);          // floor: nothing is ever impossible
      w *= this.woundAversion(e);                      // and her body gets a vote
      const seen = this.state.recent.filter((x) => x === e.id).length;
      w *= Math.pow(0.22, seen);                       // pity: recency suppression
      return w;
    });
  }

  // Where she goes next. The player's suggestion is one voice among several, and
  // a quiet one once she has drifted. Otherwise: reckless women walk toward
  // trouble, careful ones toward the places that pay, and everyone would rather
  // see somewhere new than double back.
  chooseDestination() {
    const here = this.state.region;
    const options = this.lore.regions.map((r, i) => i).filter((i) => i !== here);

    const w = options.map((i) => {
      const r = this.region(i);
      let x = 1;
      if (this.state.suggested === r.id) x += 6 * this.heeds();   // your voice, if she still hears it
      if (!this.state.seen.includes(i)) x += 0.8;                 // somewhere new
      const danger = r.traits?.danger ?? 1;
      x *= Math.pow(danger, this.off('reckless'));                // toward or away from trouble
      x *= Math.pow(r.wealth ?? 1, 0.5 - 0.5 * this.off('reckless'));
      return Math.max(0.05, x);
    });

    const total = w.reduce((a, b) => a + b, 0);
    let roll = this.rng() * total;
    for (let k = 0; k < options.length; k++) {
      roll -= w[k];
      if (roll <= 0) return options[k];
    }
    return options[options.length - 1];
  }

  travelTo(i) {
    const from = this.state.region;
    this.state.region = i;
    if (!this.state.seen.includes(i)) this.state.seen.push(i);
    return from;
  }

  rollEvent() {
    const pool = events.filter((e) => !e.require || e.require(this.state, this));
    const w = this.weightsFor(pool);
    const total = w.reduce((a, b) => a + b, 0);
    let r = this.rng() * total;
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  // --- the tick ------------------------------------------------------------
  tick() {
    const s = this.state;
    if (!s.alive) return;
    s.day++;

    // expire judgments she was never given an answer to
    for (const j of [...s.pending]) {
      if (s.day >= j.dueOn) {
        s.pending.splice(s.pending.indexOf(j), 1);
        this.autoResolve(j);
      }
    }

    const e = this.rollEvent();
    const text = e.fire(this);
    s.log.push({ day: s.day, kind: 'event', id: e.id, tags: e.tags, text });

    // somebody was watching. every faction in the world scores what she just did.
    this.scoreEvent(e.id);

    s.recent.unshift(e.id);
    s.recent = s.recent.slice(0, 9);

    // upkeep
    s.morale = clamp(s.morale + (this.livingCompanion() ? 1 : -0.5) - s.wounds, 0, 100);
    if (s.wounds > 0 && this.chance(0.12 + 0.07 * this.skill('mend'))) s.wounds--;
    this.applyIntentPull();

    // and then she dies, and that is all. there is no cycle: nothing carries
    // forward, nothing comes back. the next life is a different world.
    if (s.wounds >= 6) {
      s.alive = false;
      s.log.push({
        day: s.day,
        kind: 'death',
        text: this.line('death', { name: s.name, day: s.day, place: this.place() }),
      });
    }
  }

  run(days) { for (let i = 0; i < days && this.state.alive; i++) this.tick(); return this.state; }
}
