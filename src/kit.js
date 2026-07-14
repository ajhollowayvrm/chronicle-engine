// THE KIT, AND THE ARITHMETIC OF WHAT SHE CAN ACTUALLY DO TODAY.
//
// Three numbers, and they must never be confused with each other:
//
//   RAW        what she has learned. `use()` moves it, and only up, forever.
//   BARE       raw + her marks. THE WOMAN. what is left of what she learned.
//   EFFECTIVE  bare + the kit she can actually use. what she can do today.
//
// The demand an object makes is measured against BARE, never against EFFECTIVE — because
// otherwise a sword hands you the arm to swing it with, and the gate means nothing. A
// woman does not become strong enough for the blade BY HOLDING THE BLADE.

import { SHAPES, material, an } from '../gen/tables/goods.js';
import { MARKS } from '../gen/tables/marks.js';
import { CALLINGS } from '../gen/tables/callings.js';
import { STAT_MAX } from '../gen/tables/stats.js';

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// ─────────────────────────────────────────────────────────────────────── MINTING
//
// An item is rolled out of the ground she is standing on. There is no catalogue.

export function mint(roll, { shape, econ = {}, tech = {}, magic = {}, factions = [], where, tier }) {
  const S = SHAPES[shape];
  if (!S) return null;

  // WHICH ONE. Better country, better thing — and the good ones are rare everywhere.
  const t = tech.tier ?? 3;
  const tiers = S.tiers;
  const level = tier !== undefined
    ? clamp(tier, 0, tiers.length - 1)
    : roll.chance(0.04 + t * 0.02) ? tiers.length - 1       // the good ones are rare everywhere
      : roll.chance(0.35 + t * 0.04) ? Math.min(1, tiers.length - 1) : 0;
  const spec = tiers[level];

  // WHAT IT IS MADE OF. The seam under the town — where you can honestly make the thing
  // out of it. A country whose whole economy is oaths does not forge knives out of them.
  const stuff = material(roll, S.stock, econ.resources, t);

  const adj = roll.pick(spec.adj);
  const word = roll.pick(S.words);

  let name, cost = null;
  if (S.magical) {
    // THE RELIC IS ONE OF THIS WORLD'S MAGICS, AND IT CHARGES THIS WORLD'S PRICE.
    // `validate.js` has always forced every magic type to name what it takes. Nothing has
    // ever made anybody pay it. This does, and the sentence is the seed's, not mine.
    const types = magic.types ?? [];
    if (!types.length) return null;
    const m = roll.pick(types);
    name = `${an(adj)} ${adj} ${m.name} ${word}`;
    cost = m.cost ?? null;
  } else if (shape === 'token') {
    // A writ is worth exactly as much as whatever set its seal on it, and not one step
    // outside that thing's reach — which the tree already knows, because placement IS scope.
    const seal = factions.length ? roll.pick(factions).name : (econ.who_is_rich ?? 'somebody who is not here');
    name = `${an(adj)} ${adj} ${word} under the seal of ${seal}`;
  } else {
    // A LENS IS MADE OF GLASS AND IS ALSO CALLED A GLASS. The material vocabulary and the
    // noun vocabulary overlap, and unguarded that produces "a true true glass glass" and
    // "a ground works glass glass" — which is the kind of thing that makes a player stop
    // believing anybody is looking. Collapse a word that has already been said.
    const words = `${adj} ${stuff} ${word}`.split(/\s+/);
    const tidy = words.filter((w, i) => i === 0 || w.toLowerCase() !== words[i - 1].toLowerCase()).join(' ');
    // boots are a pair of things and do not take an article
    name = S.plural ? tidy : `${an(tidy)} ${tidy}`;
  }

  const [lo, hi] = spec.worth;
  return {
    shape,
    slot: S.slot,
    name,
    asks: spec.ask > 0 ? { [S.asks]: spec.ask } : {},
    gives: { ...spec.gives },
    only: spec.only ?? null,
    strains: S.strains,
    cost,                                   // what the working takes. quoted from the tree.
    worth: Math.round(roll.int(lo, hi) * (0.6 + t / 7)),
    from: `out of ${where}`,                // overwritten by whoever hands it over
    given_by: null,
    since: 0,
  };
}

// ───────────────────────────────────────────────────────────────────── THE MARKS
// What is left of what she learned. Never touches the raw number: she keeps the knowing.

export function markMod(marks, stat) {
  let v = 0;
  for (const m of marks) v += MARKS[m.key]?.mods?.[stat] ?? 0;
  return v;
}

// THE WOMAN. Her skill, and what has happened to her, and nothing she is holding.
export function bare(state, stat) {
  return clamp((state.stat[stat] ?? 0) + markMod(state.marks ?? [], stat), 0, STAT_MAX);
}

// ────────────────────────────────────────────────────────────────── THE DEMAND
//
// Can she actually use this? Two ways to fail, and they are different failures:
//
//   UNDER THE ASK  — the thing is faster/heavier/louder than she is. She carries it
//                    anyway, and it uses her. She knows. She has opinions about it.
//   NO RIGHT TO IT — a thing only a sworn Knife may carry, carried by a woman who has
//                    refused every name she was offered. It is dead in her hands, and
//                    every room she walks into can see her holding it.
export function usable(item, state) {
  if (!item || item.broken) return false;
  if (item.only && !item.only.includes(state.calling)) return false;
  for (const [k, v] of Object.entries(item.asks ?? {})) if (bare(state, k) < v) return false;
  return true;
}

export function underAsk(item, state) {
  if (!item || item.broken) return false;
  for (const [k, v] of Object.entries(item.asks ?? {})) if (bare(state, k) < v) return true;
  return false;
}

export function unsworn(item, state) {
  return !!item && !item.broken && !!item.only && !item.only.includes(state.calling);
}

// She carries one of each shape at most — a woman has one good knife, not four.
export function wielded(state, shape) {
  return (state.kit ?? []).find((i) => i.shape === shape) ?? null;
}

// ───────────────────────────────────────────────────────────── WHAT IT ALL ADDS UP TO
// The effective stat. Everything in the sim reads this, and only `use()` writes the raw.
export function eff(state, stat) {
  let v = bare(state, stat);
  for (const i of state.kit ?? []) {
    if (!usable(i, state)) continue;
    v += i.mods?.[stat] ?? 0;
  }
  for (const [k, d] of Object.entries(CALLINGS[state.calling]?.mods ?? {})) {
    if (k === stat) v += d;
  }
  return clamp(v, 0, STAT_MAX);
}

// Effect keys — swing, earn, toll, soak, travel_cost… — summed across everything she has
// become and everything she is carrying that she can actually use.
export function kitBonus(state, key) {
  let v = 0;
  for (const i of state.kit ?? []) {
    if (!usable(i, state)) continue;
    v += i.gives?.[key] ?? 0;
  }
  return v;
}

export function callingBonus(state, key) {
  return CALLINGS[state.calling]?.gives?.[key] ?? 0;
}

// The thing she is carrying that is over her head, for the act she is about to do. This is
// the whole of the soft gate: it does not stop her. It costs her.
export function straining(state, act) {
  for (const i of state.kit ?? []) {
    if (i.broken || i.strains !== act) continue;
    if (underAsk(i, state)) return i;
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────── the ledger
export const best = (kit) => kit.slice().sort((a, b) => b.worth - a.worth)[0] ?? null;
export const worst = (kit) => kit.slice().sort((a, b) => a.worth - b.worth)[0] ?? null;

// What the player is shown. Not a stat block — a thing, and where it came from.
export function describeItem(item, state) {
  const bits = [item.name, `— ${item.from}`];
  if (unsworn(item, state)) bits.push('She has no right to carry it, and everyone who looks at it knows.');
  else if (underAsk(item, state)) bits.push('It is more than she can handle, and it has started to cost her.');
  if (item.cost) bits.push(`It takes its price: ${item.cost}.`);
  return bits.join(' ');
}
