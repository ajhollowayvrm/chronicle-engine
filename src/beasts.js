// THE BESTIARY, DERIVED.
//
// Nothing here is authored per world and nothing is stored in the tree. A beast is a fact
// the world already contains, stood up and given a body — so the bestiary is a pure function
// of the world, exactly like `web-of.js` is a pure function of the world.
//
// IT DOES NOT TOUCH `sim.rng`. Not once. Every choice below is hashed off a stable string
// (the place's name, the world's seed), because the sim's random stream is the spine of the
// entire save: consume one draw here that the client does not consume there, and the same
// seed stops producing the same life. The bestiary must be able to look at her world without
// changing it.

import { walk, resolve } from '../gen/node.js';
import { KINDS, GREAT } from '../gen/tables/beasts.js';

// A stable little RNG from a string. Same string, same rolls, forever, on any machine.
function stream(key) {
  let h = 2166136261;
  const s = String(key);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  const next = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
  };
}

const head = (s) => String(s ?? '').split('—')[0].trim();
const tail = (s) => String(s ?? '').split('—').slice(1).join('—').trim();

// WHAT THIS GROUND CAN MAKE A MONSTER OUT OF. Every one of these is a fact the player can
// already read somewhere else in the game — in the economy, in the magic, on the tech.
function material(world, site) {
  const n = site.node;
  const path = site.path;
  const where = n.name;

  const tech = resolve(path, n, 'technology') ?? {};
  const magic = resolve(path, n, 'magic') ?? {};
  const gods = world.children.filter((c) => c.kind === 'figure' && c.divine && c.status);
  const factions = n.children.filter((c) => c.kind === 'faction');
  const roll = stream(`${where}:material`);

  const out = {};

  if (factions.length) {
    const f = roll.pick(factions);
    out.faction = { who: f.name, where };
  }
  // THE SEAM UNDER THE TOWN. `technology.power_source` is the richest version of this fact
  // ("godash — refined divine remains") but `resolve` inherits a technology object WHOLE, so
  // most places get one that has no power_source in it at all — and the seam-beast, which is
  // the best idea in the table, fired exactly zero times in eighty worlds.
  //
  // The economy's resource is the same fact, said plainer, and every country has one. That
  // is what they are digging. Use the fuel when the tree offers it and the seam otherwise.
  const econ = resolve(path, n, 'economy') ?? {};
  const seam = tech.power_source ?? econ.resources;
  if (seam && !/^(nothing|none)\b/i.test(seam)) {
    out.fuel = { what: head(seam), gloss: tech.power_source ? tail(seam) : '', where };
  }
  if (tech.quirks?.length) {
    out.machine = { what: roll.pick(tech.quirks), where };
  }
  if (magic.types?.length) {
    const m = roll.pick(magic.types);
    out.magic = { who: m.name, what: m.cost, where };
  }
  if (gods.length) {
    const g = roll.pick(gods);
    out.god = { who: g.name, what: g.status, where };
  }
  if (n.divergences?.length) {
    out.gap = { what: roll.pick(n.divergences).why, where };
  }
  return out;
}

function makeBeast(kindKey, fact, where, roll, great = false) {
  const K = KINDS[kindKey];
  const spec = great ? GREAT : K;
  const [plo, phi] = spec.power;
  const [wlo, whi] = spec.worth;

  return {
    kind: kindKey,
    great,
    name: great ? GREAT.name(kindKey, fact, roll) : K.name(fact, roll),
    what: K.what(fact),
    where,
    power: roll.int(plo, phi),
    asks: K.asks,
    worth: roll.int(wlo, whi),
    alive: true,
  };
}

// ══════════════════════════════════════════════════════════════════ WHAT IS OUT THERE
//
// One beast per place, at most, and plenty of places have nothing worse in them than the
// people. Plus exactly ONE great beast in the world, in a lair, which does not scale to her
// and does not wait for her to be ready.
export function bestiary(world, sites, seed) {
  const beasts = {};             // site index -> beast

  for (const site of sites) {
    const where = site.node.name;
    const roll = stream(`${seed}:${where}:beast`);

    // most ground has nothing on it. a monster everywhere is a monster nowhere.
    if (roll.next() > 0.42) continue;

    const mat = material(world, site);
    const possible = Object.keys(KINDS).filter((k) => mat[KINDS[k].needs]);
    if (!possible.length) continue;

    const kind = roll.pick(possible);
    beasts[site.i] = makeBeast(kind, mat[KINDS[kind].needs], where, roll);
  }

  // ── THE GREAT ONE. The world's largest fact, standing up. Its lair is the place whose
  //    material can carry it — and a world that burns its own dead god has only one
  //    possible answer to what the worst thing in it is.
  // WEIGHTED, NOT RANKED. A strict preference order made every world's great beast the same
  // KIND — eighty worlds, eighty relicts — which is the monoculture this whole file exists to
  // avoid. The deep, damning facts are likelier; they are not certain. And it is never `men`:
  // the worst thing in a country can be its people, but that is not a thing you go and kill.
  let great = null;
  const roll = stream(`${seed}:great`);

  const options = [];
  for (const site of sites) {
    const mat = material(world, site);
    for (const [kind, w] of Object.entries(GREAT.weights)) {
      const fact = mat[KINDS[kind].needs];
      if (fact) options.push({ kind, fact, site, w });
    }
  }

  if (options.length) {
    const total = options.reduce((a, o) => a + o.w, 0);
    let r = roll.next() * total;
    let chosen = options[options.length - 1];
    for (const o of options) { r -= o.w; if (r <= 0) { chosen = o; break; } }

    great = makeBeast(chosen.kind, chosen.fact, chosen.site.node.name, roll, true);
    great.at = chosen.site.i;
    great.rumour = roll.pick(GREAT.rumour);
  }

  return { beasts, great };
}
