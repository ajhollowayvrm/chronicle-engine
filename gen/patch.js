// GROWTH — the world grows from the chronicle.
//
// A patch is a set of ADD-ONLY operations, authored by a model that has read what
// actually happened to her, and then FROZEN. It is applied at replay like any other
// input, so determinism survives: the model runs once, offline; the game replays the
// patch forever and never calls anything.
//
//   worldFromSeed(seed)            the world she was born into
//   + the patches in her journal   the world she made by living in it
//   = the world she is standing in
//
// Two players with the same seed get the same world — until they live differently in
// it. That is a strictly better property than a world that is only ever a function of
// its seed.
//
// ---------------------------------------------------------------------------
// ADD ONLY. THIS IS NOT NEGOTIABLE.
//
// The model may add places, figures, factions, hooks, eras and prose. It may NOT
// change a fact she has already lived through. The chronicle is immutable: a world
// that quietly rewrites what she remembers is a world with no stakes in it, because
// nothing she did can be relied on to have happened.
//
// Contradiction is still allowed — but only the way the spec already allows it: as a
// `divergence`, which carries a `why`. A tier-7 city in a tier-3 country is not an
// edit. It is the plot.

import { node, add, walk, MAY_CONTAIN, CAPS, words } from './node.js';
import { validate } from './validate.js';

const OPS = ['add_child', 'add_hook', 'add_era', 'add_lines'];

// Find a node by name. The tree is the data — there is no registry, so this is how
// you point at something: you say its name again.
function find(world, name, kind) {
  for (const { node: n, path } of walk(world)) {
    if (n.name === name && (!kind || n.kind === kind)) return { node: n, path };
  }
  return null;
}

// ---------------------------------------------------------------------------
// What a patch may NOT do. Checked before anything is applied, so a bad patch
// changes nothing at all — no half-grown worlds.
function illegal(world, patch) {
  const bad = [];

  // A patch is validated against ITSELF AS IT BUILDS, not against the world as it was.
  // Otherwise a perfectly reasonable patch that adds a town and then puts a person in
  // that town is rejected, because at the moment we check the person the town does not
  // exist yet. Growth naturally builds on what it just grew, and it must be allowed to.
  const pending = new Map();   // name -> kind, for nodes this patch will have created

  const resolveKind = (name) => {
    const real = find(world, name);
    if (real) return real.node.kind;
    return pending.get(name) ?? null;
  };

  for (const [i, op] of (patch.ops ?? []).entries()) {
    const at = `op ${i} (${op.op})`;
    if (!OPS.includes(op.op)) { bad.push(`${at}: unknown operation`); continue; }

    if (op.op === 'add_child') {
      const parentKind = resolveKind(op.parent);
      if (!parentKind) { bad.push(`${at}: no node named "${op.parent}" to add to`); continue; }
      if (!op.node?.kind || !op.node?.name) { bad.push(`${at}: the new node needs a kind and a name`); continue; }
      if (!(MAY_CONTAIN[parentKind] ?? []).includes(op.node.kind)) {
        bad.push(`${at}: a ${parentKind} may not contain a ${op.node.kind}`);
      }
      if (find(world, op.node.name, op.node.kind) || pending.has(op.node.name)) {
        bad.push(`${at}: there is already a ${op.node.kind} called "${op.node.name}" — growth adds, it does not shadow`);
      }
      pending.set(op.node.name, op.node.kind);
    }

    if (op.op === 'add_hook') {
      // THE ANTI-DRIFT RULE, and it is the whole reason a model can be trusted here:
      // a hook is a collision of two facts ALREADY IN THE TREE, and it must name both.
      // A model that must cite its inputs cannot invent.
      if (!Array.isArray(op.hook?.facts) || op.hook.facts.length !== 2) {
        bad.push(`${at}: a hook must cite exactly two facts`);
      }
      if (!op.hook?.collision) bad.push(`${at}: a hook must say what the collision means`);
    }

    if (op.op === 'add_era') {
      if (!resolveKind(op.at)) { bad.push(`${at}: no node named "${op.at}"`); continue; }
      if (!op.era?.why_it_ended || !op.era?.became) {
        bad.push(`${at}: an era must say why it ended and what it became`);
      }
    }

    if (op.op === 'add_lines') {
      if (!op.pool || !Array.isArray(op.lines) || !op.lines.length) {
        bad.push(`${at}: add_lines needs a pool and at least one line`);
      }
      for (const l of op.lines ?? []) {
        if (typeof l !== 'string' || !l.trim()) bad.push(`${at}: an empty line`);
      }
    }

    // the prose caps apply to grown nodes exactly as they apply to born ones. if it
    // does not fit, the model has not decided what the thing is yet.
    for (const [field, cap] of Object.entries(CAPS)) {
      const v = op.node?.[field] ?? op.era?.[field];
      if (typeof v === 'string' && words(v) > cap) {
        bad.push(`${at}: ${field} is ${words(v)} words (cap ${cap})`);
      }
    }
  }

  return bad;
}

// ---------------------------------------------------------------------------
// Apply. Returns { world, lines, problems }. If `problems` is non-empty NOTHING was
// applied — a patch is all-or-nothing, because a half-grown world is worse than an
// ungrown one.
// A fingerprint of the world the patch was GROWN FROM.
//
// Growth patches name their anchors ("add Struck Ford to Ottrenmark"), and the tree is
// the data — there are no ids, only names. So if the generator or the tables change and
// the RNG stream shifts, a patch can quietly land on a DIFFERENT world that happens to
// still contain a node with the right name. That is a silently wrong world, which is
// the worst kind.
//
// (This nearly happened: drawing magic effects without replacement shifted the
// world-level stream. The map survived only because blind siblings give each subtree
// its own derived stream — luck, not a guarantee.)
export function worldPrint(world) {
  const names = [...walk(world)].map(({ node: n }) => `${n.kind}:${n.name}`).sort().join('|');
  let h = 2166136261;
  for (let i = 0; i < names.length; i++) {
    h ^= names.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function applyPatch(world, patch) {
  if (patch.worldPrint && patch.worldPrint !== worldPrint(world)) {
    return {
      world,
      lines: {},
      problems: [
        `this patch was grown from a different world (${patch.worldPrint}, but seed ${patch.seed} now prints ${worldPrint(world)}). ` +
        'The generator or the tables changed underneath it. Re-grow, or pin the generator.',
      ],
    };
  }

  const problems = illegal(world, patch);
  if (problems.length) return { world, lines: {}, problems };

  const lines = {};   // new chronicle lines, by pool

  for (const op of patch.ops) {
    if (op.op === 'add_child') {
      const parent = find(world, op.parent);
      const n = node(op.node.kind, op.node.name, { ...op.node, kind: undefined, name: undefined });
      n.kind = op.node.kind;
      n.name = op.node.name;
      n.children ??= [];
      n.history ??= [];
      n.grown = true;                 // so the UI and the doc can show what SHE grew
      add(parent.node, n);
    }

    if (op.op === 'add_hook') {
      (world.hooks ??= []).push({ ...op.hook, grown: true });
    }

    if (op.op === 'add_era') {
      const target = find(world, op.at);
      target.node.history.push({
        kind: 'era', children: [], history: [], grown: true, ...op.era,
      });
    }

    if (op.op === 'add_lines') {
      (lines[op.pool] ??= []).push(...op.lines);
    }
  }

  // the grown world is held to exactly the same bar as a born one
  const after = validate(world);
  return { world, lines, problems: after };
}

// A patch is an INPUT. It lives in the journal, stamped with the day it was grown, and
// replays with everything else. The model is never called again.
export const growthEntry = (day, patch) => ({ elapsed: day, type: 'grow', patch });
