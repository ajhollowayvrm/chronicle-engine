// THE SEED ENGINE — worldFromSeed(seed) -> one validated world tree.
//
// Pure code. No LLM runs here, ever. The model authored gen/tables/* once; this
// rolls against them forever. That is what makes the seed a real seed: same seed,
// same world, on any machine, offline, with no key in the repo.
//
// The seven passes, in the order the spec puts them — and the order matters more
// than it looks. Divergence runs BEFORE detail, because divergence is what CAUSES
// detail: a country that is tier 5 in a tier 6 world now needs an economy that
// explains it, and the explanation is the content.

import { node, add, walk, all, resolve, effective, centerOf, CENTERS } from './node.js';
import * as T from './tables/systems.js';
import * as P from './tables/people.js';
import { validate } from './validate.js';
import { findHooks } from './hooks.js';

// ---------------------------------------------------------------------- rng
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// BLIND SIBLINGS. Each child gets its own stream, derived from the parent's seed and
// its own index — so a sibling cannot see, and cannot be influenced by, what its
// siblings rolled. This is deliberate and it is the single most important line in
// the file. The moment generation can see the other countries it starts AVERAGING:
// the tidy one, the desert one, the evil one, a balanced set designed by committee.
// Blind siblings collide messily, and then the variance dial reconciles them.
const derive = (seed, i) => (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(i, 0xc2b2ae35)) | 0;

function roller(seed) {
  const rng = mulberry32(seed);
  const r = {
    rng,
    pick: (a) => a[Math.floor(rng() * a.length)],
    int: (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1)),
    chance: (p) => rng() < p,
    some: (a, n) => {
      const c = [...a];
      const out = [];
      for (let i = 0; i < n && c.length; i++) out.push(...c.splice(Math.floor(rng() * c.length), 1));
      return out;
    },
  };
  return r;
}

const fill = (pattern, r) =>
  pattern.replace(/\{(\w+)\}/g, (_m, k) => r.pick(P.NAME_PARTS[k] ?? [k]));

// BLINDNESS PROTECTS FACTS, NOT NAMES.
//
// Blind siblings exist so that two countries cannot AVERAGE — so that one is tier 7
// and the next is tier 2 and neither was moderated by knowing about the other. That
// is about facts. It was never about names, and letting it cover names cost real
// bugs: a 300-world sweep found ~5% of worlds with two different figures carrying the
// same name and BOTH holding `in_person`, which is a straight Rule 4 violation — two
// centers for one name.
//
// So the name registry is global while every fact stays blind. The RNG streams are
// untouched; the only thing shared across siblings is a set of names already spent.
function namer() {
  const used = new Set();
  return (pools, r, tries = 24) => {
    for (let i = 0; i < tries; i++) {
      const n = fill(r.pick(pools), r);
      if (!used.has(n)) { used.add(n); return n; }
    }
    // the pool is exhausted for this world; disambiguate rather than collide
    let n, k = 2;
    do { n = `${fill(r.pick(pools), r)} ${'II III IV V VI'.split(' ')[k - 2] ?? k}`; k++; } while (used.has(n));
    used.add(n);
    return n;
  };
}

const placeName = (mint, scale, r) => mint(P.PLACE_NAMES[scale] ?? P.PLACE_NAMES.town, r);
const personName = (mint, r) => mint(['{First} {Last}', '{First} {Last}', '{Bare}'], r);

// =============================================================== PASS 1 — SKELETON
// Pure code. Scalars roll; structure rolls. Placeholder-free but prose-free: you can
// see the bones before any writing exists, which is the whole point of doing it first.
function skeleton(seed, mint) {
  const r = roller(seed);

  const era = r.pick(T.ERAS);
  const power = r.pick(T.POWER_SOURCES);
  const econ = r.pick(T.ECONOMIES);
  const prev = r.pick(T.MAGIC_PREVALENCE.slice(1));       // a world with no magic at all is a different game

  const world = node('place', placeName(mint, 'planet', r), {
    scale: 'planet',
    variance: r.pick(['low', 'medium', 'high']),
    era: {
      name: era.name,
      year: `${r.int(400, 1400)} AF`,
      analogue: era.analogue,
      recent_upheaval: `${era.upheaval}, ${r.pick(T.RECENT_UPHEAVAL_AGES)} years ago`,
      trajectory: era.trajectory,
    },
    technology: {
      tier: r.int(3, 7),
      kind: r.pick(T.TECH_KINDS),
      power_source: `${power.name} — ${power.what}`,
      quirks: r.some(T.TECH_QUIRKS, 2),
    },
    magic: {
      prevalence: prev.label,
      rate: prev.rate,
      source: r.pick(T.MAGIC_SOURCES),
      types: r.some(T.MAGIC_METHODS, r.int(2, 3)).map((method) => ({
        name: r.pick(P.NAME_PARTS.Place) + r.pick(['work', 'ment', 'craft', 'song', 'binding']),
        method,
        effects: r.pick(T.MAGIC_EFFECTS),
        cost: r.pick(T.MAGIC_COSTS),          // FORCED SCARCITY — validated, not hoped for
        social: r.pick(T.MAGIC_SOCIAL),
      })),
      limits: r.pick(T.MAGIC_LIMITS),
      governance: r.pick(T.MAGIC_GOVERNANCE),
    },
    divine: {
      exists: true,
      origin: r.pick(T.DIVINE_ORIGINS),
      interaction: r.pick(T.DIVINE_INTERACTION),
      ascension: r.pick(T.DIVINE_ASCENSION),
    },
    economy: {
      resources: econ.resource,
      exports: econ.export,
      currency: econ.currency,
      who_is_rich: econ.rich,
      who_pays_for_it: econ.pays,           // FORCED SCARCITY — an economy without a victim is a brochure
    },
    aesthetic: r.pick(T.AESTHETICS),
  });

  // the place tree. depth and breadth roll; this is the idle game's expansion spine
  // (village -> city -> country -> continent -> planet) and it is not lore structure,
  // it is progression.
  const continents = r.int(1, 2);
  for (let c = 0; c < continents; c++) {
    const cr = roller(derive(seed, 100 + c));
    const cont = add(world, node('place', placeName(mint, 'continent', cr), {
      scale: 'continent',
      aesthetic: cr.pick(T.AESTHETICS),      // everything else blank: it inherits wholesale
    }));

    const countries = cr.int(2, 3);
    for (let k = 0; k < countries; k++) {
      // BLIND: this country's stream knows nothing of its siblings'
      const kr = roller(derive(derive(seed, 100 + c), 200 + k));
      const isRegion = kr.chance(0.3);
      const country = add(cont, node('place', placeName(mint, isRegion ? 'region' : 'country', kr), {
        scale: isRegion ? 'region' : 'country',
        variance: kr.pick(['none', 'low', 'medium', 'high']),
        technology: {
          tier: Math.max(0, Math.min(10, world.technology.tier + kr.int(-3, 2))),
          ...(kr.chance(0.5) ? { quirks: kr.some(T.TECH_QUIRKS, 1) } : {}),
        },
        // a capital at tier 7 must not drag its farming villages to tier 7 (Rule 3)
        merge: kr.chance(0.45) ? 'local' : 'override',
        economy: (() => {
          const e = kr.pick(T.ECONOMIES);
          return { resources: e.resource, exports: e.export, who_is_rich: e.rich, who_pays_for_it: e.pays };
        })(),
        aesthetic: kr.pick(T.AESTHETICS),
        ...(kr.chance(0.4) ? { magic: { governance: kr.pick(T.MAGIC_GOVERNANCE) } } : {}),
      }));

      const cities = kr.int(0, 2);
      for (let s = 0; s < cities; s++) {
        const sr = roller(derive(derive(derive(seed, 100 + c), 200 + k), 300 + s));
        const isCity = sr.chance(0.5);
        // A settlement always carries a fact of its own. A city with nothing but a
        // mood is a name on a map, and the validator is right to refuse it — so the
        // generator gives every one of them a tier it holds LOCALLY (the refineries
        // do not raise the villages) and somebody who pays for it.
        const e = sr.pick(T.ECONOMIES);
        add(country, node('place', placeName(mint, isCity ? 'city' : 'town', sr), {
          scale: isCity ? 'city' : 'town',
          merge: 'local',                     // a city's excesses stop at its walls
          technology: { tier: Math.max(0, Math.min(10, world.technology.tier + sr.int(-1, 3))) },
          economy: { resources: e.resource, who_is_rich: e.rich, who_pays_for_it: e.pays },
          aesthetic: sr.pick(T.AESTHETICS),
          ...(sr.chance(0.25) ? { status: sr.pick(['running out', 'suppressed', 'underwater, still humming']) } : {}),
        }));
      }
    }
  }

  return world;
}

// ============================================================== PASS 2 — DIVERGENCE
// Code FINDS the gap. The table supplies the WHY. This runs before detail because
// divergence is what causes detail. Rule 5: contradiction is content — a tier-7 city
// in a tier-3 world is not an error, it is the plot, and it owes you an explanation.
const SCALARS = [
  { key: 'technology', path: 'tier', ahead: 'tech_ahead', behind: 'tech_behind', min: 2 },
];

function divergence(world, seed) {
  let n = 0;
  for (const { node: self, path } of walk(world)) {
    if (self.kind !== 'place' || !path.length) continue;
    const r = roller(derive(seed, 700 + n++));

    for (const s of SCALARS) {
      const parent = path[path.length - 1];
      const mine = self[s.key]?.[s.path];
      if (mine == null) continue;
      const theirs = resolve(path.slice(0, -1), parent, s.key)?.[s.path];
      if (theirs == null) continue;

      const gap = mine - theirs;
      if (Math.abs(gap) < s.min) continue;

      const why = r.pick(T.DIVERGENCE_REASONS[gap > 0 ? s.ahead : s.behind]);
      (self.divergences ??= []).push({
        key: `${s.key}.${s.path}`,
        from: theirs,
        to: mine,
        why,                                  // validated: a divergence without a why is rejected
      });
    }

    // variance is its own kind of divergence: a place with `none` is making a claim
    if (self.variance === 'none' || self.variance === 'high') {
      (self.divergences ??= []).push({
        key: 'variance',
        from: resolve(path.slice(0, -1), path[path.length - 1], 'variance') ?? 'medium',
        to: self.variance,
        why: r.pick(T.DIVERGENCE_REASONS[self.variance === 'none' ? 'variance_low' : 'variance_high']),
      });
    }
  }
  return world;
}

// =============================================================== PASS 3 — PLACEMENT
// The engine's spine, and pure graph logic. Factions, figures, languages and species
// get ASSIGNED — which nodes they appear in, who carries the center marker, what
// propagates. Rule 2: placement IS scope. There is no registry and no ids; where a
// thing appears is its reach.
function placement(world, seed, mint) {
  const r = roller(derive(seed, 900));
  const places = all(world, 'place').filter(({ node: n }) => n.scale !== 'planet');
  const countries = places.filter(({ node: n }) => n.scale === 'country' || n.scale === 'region');

  // --- the gods: figures at world scope, because that is their reach
  for (const g of r.some(P.DIVINE_FIGURES, r.int(3, 4))) {
    add(world, node('figure', g.name, {
      divine: true,
      status: g.status,
      one_line: g.one_line,
      here: g.here,
      ...(g.status.startsWith('dead') ? { center: 'in_person' } : {}),  // she is, technically, everywhere
      ...(r.chance(0.4) ? { wants: r.pick(P.FIGURE_WANTS) } : {}),
    }));
  }

  // --- factions. The SAME organisation appears in several countries and is a
  //     different thing in each (its `here`), which is the entire faction system.
  const chosen = r.some(P.FACTIONS, Math.min(countries.length, r.int(2, 3)));
  for (const f of chosen) {
    const name = r.pick(f.names);
    const appearsIn = r.some(countries, Math.max(1, Math.min(countries.length, r.int(1, 3))));

    // Rule 4: at most ONE supreme, anywhere. Zero is a real answer — a decentralised
    // organisation, declared by silence — so we roll for whether it has a head at all.
    const hasCenter = r.chance(0.75);
    const centerAt = hasCenter ? r.int(0, appearsIn.length - 1) : -1;

    const heres = r.some(f.here, appearsIn.length);
    appearsIn.forEach((p, i) => {
      const isCenter = i === centerAt;
      const ap = add(p.node, node('faction', name, {
        one_line: f.one_line,
        here: heres[i] ?? r.pick(f.here),
        command: isCenter ? 'supreme' : r.pick(['chapter', 'cell']),
        ...(isCenter ? { center: 'supreme' } : { relationship_to_center: hasCenter ? r.pick(P.RELATIONSHIP_TO_CENTER) : 'there is no center. they do not know that either' }),
        merge: r.chance(0.3) ? 'accumulate' : 'local',
      }));

      // the head of the organisation is a figure inside its supreme appearance
      if (isCenter) {
        add(ap, node('figure', personName(mint, r), {
          center: 'in_person',
          one_line: r.pick(['Dresses like a notary. Is a notary', 'Has not raised his voice in thirty years', 'Was a digger. Says so, constantly, and it is true']),
          known_for: r.pick(P.FIGURE_KNOWN_FOR),
          wants: r.pick(P.FIGURE_WANTS),
          will_do_anything_for: r.pick(P.FIGURE_ANYTHING_FOR),
        }));
      }
    });
  }

  // --- mortal figures, scattered. A figure with `in_person` is SOMEWHERE, and can move.
  for (const p of r.some(places, r.int(1, 3))) {
    add(p.node, node('figure', personName(mint, r), {
      center: 'in_person',
      status: r.pick(['alive, mostly', 'alive, attentive', 'suppressed']),
      known_for: r.pick(P.FIGURE_KNOWN_FOR),
      wants: r.pick(P.FIGURE_WANTS),
    }));
  }

  // --- a language, with its origin. Blank everywhere = everyone understands everyone,
  //     and that was a real authorial decision made by silence (Rule 1).
  if (r.chance(0.7) && countries.length) {
    const l = r.pick(P.LANGUAGES);
    const home = r.pick(countries);
    add(home.node, node('language', l.name, {
      center: 'origin',
      one_line: l.one_line,
      here: l.here,
      created_by: r.chance(0.5) ? r.pick(all(world, 'figure').map(({ node: n }) => n.name)) : undefined,
    }));
  }

  if (r.chance(0.35) && countries.length) {
    const s = r.pick(P.SPECIES);
    const home = r.pick(countries);
    add(home.node, node('species', s.name, { center: 'homeland', one_line: s.one_line, here: s.here }));
  }

  return world;
}

// ================================================================ PASS 5 — HISTORY
// For each node, backwards: what was here before, what killed it, what it became.
// `era` nodes have the SAME SHAPE as places — which is what will let the tick write
// new ones while the player is away. History is the save file.
function history(world, seed, mint) {
  const r = roller(derive(seed, 1300));
  const targets = [world, ...all(world, 'place').filter(({ node: n }) => n.scale === 'country').map(({ node: n }) => n)];

  targets.forEach((target, i) => {
    const hr = roller(derive(seed, 1400 + i));
    if (target !== world && !hr.chance(0.5)) return;

    const start = hr.int(300, 900);
    const era = node('era', hr.pick(['The Third Choir', 'The Long Account', 'The First Directorate', 'The Hanging Years', 'The Green Peace']), {
      years: `${start}–${start + hr.int(80, 360)} AF`,
      status: hr.pick(['transformed', 'eradicated here', 'suppressed', 'dead']),
      variance: hr.chance(0.4) ? 'none' : undefined,
      why_it_ended: hr.pick(T.WHY_IT_ENDED),
      became: hr.pick(T.BECAME),
    });
    if (era.variance === 'none') {
      era.divergences = [{ key: 'variance', from: 'medium', to: 'none', why: r.pick(T.DIVERGENCE_REASONS.variance_low) }];
    }
    if (hr.chance(0.4)) {
      add(era, node('place', placeName(mint, 'city', hr), { scale: 'city', status: hr.pick(['underwater, still humming', 'eradicated here', 'dead']) }));
    }
    target.history.push(era);
  });

  return world;
}

// ================================================================ THE ORCHESTRATOR
export function worldFromSeed(seed, { strict = true } = {}) {
  const s = Number(seed) >>> 0;

  // one global name registry for the whole world. blindness protects FACTS, not
  // names — see namer() above for what that cost before it was fixed.
  const mint = namer();

  let world = skeleton(s, mint);        // PASS 1 — bones
  world = divergence(world, s);         // PASS 2 — the gaps, and why (before detail)
  world = placement(world, s, mint);    // PASS 3 — the spine: who is where, who is the head
                                        // PASS 4 — shading: table-driven, done inline above
  world = history(world, s, mint);      // PASS 5 — what was here before
  world.hooks = findHooks(world, s);   // PASS 6 — two-fact collisions, code-scored

  world.seed = s;

  const problems = validate(world);   // PASS 7 — bad worlds die cheap
  if (problems.length && strict) {
    const e = new Error(`seed ${s} produced an invalid world:\n  - ${problems.join('\n  - ')}`);
    e.problems = problems;
    throw e;
  }
  world.problems = problems;
  return world;
}
