import { events, NAMES } from './events.js';

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

// ---------------------------------------------------------------- state
export function newAdventurer(name, dials) {
  return {
    name,
    day: 1,
    cycle: 1,
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

    companions: [],
    ghosts: [],
    debts: [],
    barons: { attention: 0 },
    flags: {},

    pending: [],   // judgments awaiting the player
    recent: [],    // event ids fired lately -> pity suppression
    log: [],       // the raw chronicle. this is what an LLM would narrate.
    usedNames: [],
  };
}

// ---------------------------------------------------------------- engine
export class Engine {
  constructor({ seed = 1, name = 'Kestrel of Ilmun', dials = {} } = {}) {
    this.rng = mulberry32(seed);
    this.state = newAdventurer(name, dials);
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

  chance(p) { return this.rng() < p; }
  pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }

  pickUnusedName() {
    const free = NAMES.filter((n) => !this.state.usedNames.includes(n));
    const n = free.length ? this.pick(free) : this.pick(NAMES);
    this.state.usedNames.push(n);
    return n;
  }

  // --- drift: lived experience moves who she actually is -------------------
  // intent pulls her back toward the dial each tick, but slowly. if the world
  // keeps punishing a disposition, the world wins.
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

  // --- event selection -----------------------------------------------------
  weightsFor(list) {
    return list.map((e) => {
      let w = e.base;
      let mult = 1;
      for (const [dial, s] of Object.entries(e.sens || {})) mult += this.off(dial) * s;
      w = Math.max(e.base * 0.15, w * mult);          // floor: nothing is ever impossible
      const seen = this.state.recent.filter((x) => x === e.id).length;
      w *= Math.pow(0.22, seen);                       // pity: recency suppression
      return w;
    });
  }

  rollEvent() {
    const pool = events.filter((e) => !e.require || e.require(this.state));
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

    s.recent.unshift(e.id);
    s.recent = s.recent.slice(0, 9);

    // upkeep
    s.morale = clamp(s.morale + (this.livingCompanion() ? 1 : -0.5) - s.wounds, 0, 100);
    if (s.wounds > 0 && this.chance(0.12)) s.wounds--;
    this.applyIntentPull();

    // death, and the turn of the cycle
    if (s.wounds >= 6) {
      s.alive = false;
      s.log.push({ day: s.day, kind: 'death', text: `${s.name} died on day ${s.day} of cycle ${s.cycle}.` });
    }
  }

  run(days) { for (let i = 0; i < days && this.state.alive; i++) this.tick(); return this.state; }

  // the cycle turns: level and coin are lost. the people are not.
  reincarnate(newName) {
    const s = this.state;
    const carried = { ghosts: s.ghosts, debts: s.debts, threads: s.threads, barons: s.barons, true: s.true };
    this.state = newAdventurer(newName, s.intent);
    Object.assign(this.state, carried, { cycle: s.cycle + 1 });
    this.state.log.push({ day: 1, kind: 'cycle', text: `the cycle turned. ${newName} wakes remembering nothing, and owing everything.` });
    return this.state;
  }
}
