// PASS 6 — HOOKS.
//
// "A hook is never new information. It is a collision of two facts already in the
// tree, and it must name both."
//
// That constraint is the anti-drift mechanism of the entire engine, so this file
// cannot invent. It does three things, all of them mechanical:
//
//   1. TAG every fact already in the world.
//   2. ENUMERATE every pair whose tags collide — typically 200+ candidates.
//   3. SCORE them and keep the best four, each CITING BOTH parent facts.
//
// The spec hands step 3 to a model. We do it in code instead, because a model here
// would break determinism for the sake of taste. The trade is real: code cannot tell
// "this is a story" from "this is two facts next to each other". So the scoring
// leans entirely on the COLLISION TABLE below — a pair only becomes a hook if some
// rule already says what those two kinds of fact MEAN together. A collision with no
// rule is discarded, however tempting. That is the price of a seed that reproduces.

import { walk } from './node.js';

// What a fact can be about. A fact carries tags; a hook is two tags meeting.
const tag = (text, tags, where) => ({ text, tags, where });

function facts(world) {
  const out = [];
  const push = (t, tags, where) => { if (t) out.push(tag(t, tags, where)); };

  for (const { node: n, path } of walk(world)) {
    const where = n.name;

    if (n.era?.recent_upheaval) push(n.era.recent_upheaval, ['upheaval', 'past'], where);
    if (n.era?.trajectory) push(n.era.trajectory, ['future', 'doom'], where);

    for (const q of n.technology?.quirks ?? []) push(q, ['machine'], where);
    if (n.technology?.power_source) push(n.technology.power_source, ['fuel', 'finite'], where);

    for (const t of n.magic?.types ?? []) {
      push(`${t.name} costs ${t.cost}`, ['cost', 'magic'], where);
    }
    if (n.magic?.limits) push(n.magic.limits, ['limit', 'magic'], where);

    if (n.economy?.who_pays_for_it) push(`the bill is paid by ${n.economy.who_pays_for_it}`, ['victim', 'cost'], where);
    if (n.economy?.who_is_rich) push(`the money sits with ${n.economy.who_is_rich}`, ['money'], where);

    for (const d of n.divergences ?? []) push(d.why, ['gap', 'divergence'], where);

    if (n.kind === 'figure') {
      if (n.known_for) push(`${n.name} is known for ${n.known_for}`, ['secret', 'person'], where);
      if (n.wants) push(`${n.name} wants ${n.wants}`, ['desire', 'person'], where);
      if (n.divine && n.status) push(`${n.name} is ${n.status}`, ['god', 'person'], where);
      if (n.here && n.divine) push(n.here, ['god', 'rule'], where);
    }

    if (n.kind === 'faction') {
      if (n.here) push(`${n.name} here: ${n.here}`, ['faction'], where);
      if (n.relationship_to_center?.startsWith('unaware')) {
        push(`a chapter of ${n.name} does not know it has a head`, ['faultline', 'faction'], where);
      }
      if (n.center === 'supreme') push(`${n.name} is run from here`, ['head', 'faction'], where);
    }

    if (n.kind === 'era' && n.became) push(n.became, ['past', 'succession'], where);
  }
  return out;
}

// THE COLLISION TABLE. A pair of tags, and what those two facts MEAN when they are
// both true. This is the only place the engine is allowed to say something that is
// not already written in the tree — and even here it may only say what the collision
// implies, never a new fact.
const COLLISIONS = [
  { a: 'secret', b: 'finite', says: 'the fuel is running out, and one person has done the arithmetic' },
  { a: 'secret', b: 'doom', says: 'someone already knows how this ends and has said nothing' },
  { a: 'desire', b: 'victim', says: 'what they want will be paid for by people who will not be asked' },
  { a: 'desire', b: 'gap', says: 'the thing they want is the thing that makes this place an exception' },
  { a: 'god', b: 'fuel', says: 'the thing they are burning was a person, and is being worshipped on the same day' },
  { a: 'god', b: 'rule', says: 'the god does not need to punish, and that is worse than punishing' },
  { a: 'faultline', b: 'head', says: 'the head gives orders a chapter does not know it is supposed to obey' },
  { a: 'faultline', b: 'money', says: 'the cell that answers to nobody is the one holding the money' },
  { a: 'machine', b: 'magic', says: 'the machines have started doing something nobody built them to do' },
  { a: 'machine', b: 'fuel', says: 'the engines have preferences, and the fuel is what they prefer' },
  { a: 'cost', b: 'victim', says: 'the price is real and it is billed downstream, to people with no vote' },
  { a: 'gap', b: 'victim', says: 'the exception is subsidised by whoever is at the bottom of it' },
  { a: 'gap', b: 'doom', says: 'the advantage has an expiry date and the country is built on it' },
  { a: 'upheaval', b: 'succession', says: 'the institution that caused it is still here, under a new name' },
  { a: 'limit', b: 'desire', says: 'the one thing they want is the one thing it cannot do' },
  { a: 'past', b: 'god', says: 'something signed before the death is still legally binding after it' },
];

export function findHooks(world, seed, want = 4) {
  const fs = facts(world);
  const found = [];

  // enumerate every pair; keep only the pairs some rule can already interpret
  for (let i = 0; i < fs.length; i++) {
    for (let j = i + 1; j < fs.length; j++) {
      const A = fs[i], B = fs[j];
      for (const c of COLLISIONS) {
        const forward = A.tags.includes(c.a) && B.tags.includes(c.b);
        const backward = A.tags.includes(c.b) && B.tags.includes(c.a);
        if (!forward && !backward) continue;

        // a fact colliding with itself is not a story
        if (A.text === B.text) continue;

        found.push({
          // the hook CITES BOTH PARENT FACTS. this is the whole constraint: a hook
          // that cannot name its two inputs is a hook that made something up.
          facts: [A.text, B.text],
          where: [A.where, B.where],
          collision: c.says,
          // prefer collisions that reach ACROSS the tree — two facts in the same node
          // are usually just one fact said twice
          score: (A.where !== B.where ? 2 : 0) + (A.tags.length + B.tags.length) / 10,
        });
      }
    }
  }

  found.sort((x, y) => y.score - x.score || (x.collision < y.collision ? -1 : 1));

  // dedupe on the collision rule, so four hooks are four DIFFERENT shapes of story
  const seen = new Set();
  const out = [];
  for (const h of found) {
    if (seen.has(h.collision)) continue;
    seen.add(h.collision);
    out.push(h);
    if (out.length >= want) break;
  }
  return out;
}

export const candidateCount = (world) => {
  const fs = facts(world);
  return (fs.length * (fs.length - 1)) / 2;
};
