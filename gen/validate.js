// PASS 7 — VALIDATE.
//
// Built fourth in the build order, on purpose: before any shading exists, so bad
// worlds die cheap. Every rule here is one of the five anti-prose constraints made
// mechanical. None of them are style advice; a world that fails is not generated.
//
//   Every prose field is capped        -> if it does not fit, you have not decided what it is
//   Every node has a constraining fact -> a cost, a limit, a number, a prohibition
//   Every magic type has a cost        -> FORCED SCARCITY
//   Every economy names who pays       -> an economy without a victim is a brochure
//   Every divergence has a why         -> contradiction is content, and content owes a reason
//   Every hook cites two facts         -> a model that must cite its inputs cannot drift
//   One supreme per faction, at most   -> zero is a real answer; two is a bug

import { walk, CAPS, CENTERS, words, MAY_CONTAIN } from './node.js';

export function validate(world) {
  const bad = [];
  const nodes = [...walk(world)];

  // ---- prose caps. the cheapest and most effective rule in the engine.
  for (const { node: n } of nodes) {
    for (const [field, cap] of Object.entries(CAPS)) {
      const v = n[field];
      if (typeof v === 'string' && words(v) > cap) {
        bad.push(`${n.kind} "${n.name}": ${field} is ${words(v)} words (cap ${cap}) — "${v.slice(0, 48)}…"`);
      }
    }
    for (const d of n.divergences ?? []) {
      if (!d.why) bad.push(`${n.kind} "${n.name}": a divergence on ${d.key} has no why — contradiction is content, and content owes a reason`);
      else if (words(d.why) > CAPS.why) bad.push(`${n.kind} "${n.name}": divergence why is ${words(d.why)} words (cap ${CAPS.why})`);
    }
  }

  // ---- containment. cross-kind relationships never nest; they use created_by.
  for (const { node: n } of nodes) {
    for (const c of n.children) {
      if (!(MAY_CONTAIN[n.kind] ?? []).includes(c.kind)) {
        bad.push(`a ${n.kind} contains a ${c.kind} ("${c.name}") — not allowed`);
      }
    }
  }

  // ---- FORCED SCARCITY: every magic type names a cost.
  for (const { node: n } of nodes) {
    for (const t of n.magic?.types ?? []) {
      if (!t.cost) bad.push(`magic "${t.name}" in "${n.name}" has no cost — every system must name what it takes`);
    }
    if (n.magic?.types?.length && !n.magic.limits) {
      bad.push(`"${n.name}" has magic and no limits — "powerful and mysterious" is not a fact`);
    }
  }

  // ---- FORCED SCARCITY: every economy names who pays.
  for (const { node: n } of nodes) {
    if (n.economy && !n.economy.who_pays_for_it) {
      bad.push(`"${n.name}" has an economy that names nobody who pays for it — that is a brochure, not an economy`);
    }
  }

  // ---- RULE 4: at most one center per (kind, name). Zero is a real answer.
  const centers = new Map();
  for (const { node: n } of nodes) {
    if (!n.center) continue;
    const want = CENTERS[n.kind];
    if (n.center !== want) {
      bad.push(`${n.kind} "${n.name}" carries center "${n.center}" — a ${n.kind}'s center marker is "${want}"`);
      continue;
    }
    const key = `${n.kind}:${n.name}`;
    centers.set(key, (centers.get(key) ?? 0) + 1);
  }
  for (const [key, count] of centers) {
    if (count > 1) bad.push(`${key} has ${count} centers — there can be at most one, anywhere in the tree`);
  }

  // ---- every hook cites two facts, and invents nothing.
  for (const h of world.hooks ?? []) {
    if (!Array.isArray(h.facts) || h.facts.length !== 2 || !h.facts[0] || !h.facts[1]) {
      bad.push(`a hook does not cite two facts: ${JSON.stringify(h).slice(0, 70)}`);
    }
    if (!h.collision) bad.push('a hook cites two facts but does not say what their collision means');
  }

  // ---- Part 0, constraint 2: every node contains at least one CONSTRAINING FACT —
  //      a cost, a limit, a number, a prohibition, a casualty.
  //
  //      The subtlety, which cost me a rewrite: this cannot mean "every node must
  //      declare one". Rule 1 says blank means inherit, and the spec's own worked
  //      example has a continent (Vess) that declares nothing but an aesthetic and a
  //      faction — "Vess inherits wholesale" — and that is CORRECT. A pass-through
  //      node is a real authorial decision made by silence.
  //
  //      So the rule is: a node may inherit its facts, but it may not make CLAIMS it
  //      does not back. Prose (one_line / here / status) with no constraining fact
  //      anywhere in its inheritance is exactly "an ancient and mysterious power",
  //      and that is the thing this whole engine exists to make impossible.
  const owns = (n) =>
    n.technology?.tier != null ||
    n.economy?.who_pays_for_it ||
    n.magic?.governance ||
    n.magic?.types?.length ||
    n.divergences?.length ||
    n.command ||
    n.wants ||
    n.known_for ||
    n.why_it_ended;

  for (const { node: n, path } of nodes) {
    const inherited = [...path, n].some(owns);
    const hasProse = Boolean(n.one_line || n.here || n.description);

    if (hasProse && !inherited) {
      bad.push(`${n.kind} "${n.name}" makes a claim it does not back — prose, and no cost, limit, number or prohibition anywhere above it`);
    }

    // and a PLACE that neither says anything of its own nor holds anything is a name
    // on a map. It is not inheriting; there is simply nothing there.
    if (n.kind === 'place' && !owns(n) && !n.children.length && !n.history.length && !n.aesthetic && !n.status) {
      bad.push(`place "${n.name}" is set dressing — it declares no fact, holds nothing, and is not even a mood`);
    }
  }

  return bad;
}
