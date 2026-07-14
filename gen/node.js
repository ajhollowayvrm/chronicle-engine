// THE NODE — and the six rules, which are all semantics on this one object.
//
// One object type. Nests infinitely. `kind` decides which keys matter.
//
// Nothing in this file rolls dice or writes prose. It is the grammar of the tree:
// what may contain what, what a blank field means, and how a value travels down.
// Everything else in gen/ is built on top of it, so if this is wrong, all of it is.

export const KINDS = ['place', 'faction', 'figure', 'language', 'species', 'era'];

// PART 3 — CONTAINMENT. Cross-kind relationships never nest; they use `created_by`,
// a plain name said again. The name IS the link, which is why there is no registry
// anywhere in this engine and no ids to keep in sync.
export const MAY_CONTAIN = {
  place:    ['place', 'faction', 'figure', 'language', 'species'],
  era:      ['place', 'faction', 'figure', 'language', 'species'],
  faction:  ['faction', 'figure'],          // cells, chapters
  figure:   ['figure'],                     // heirs, protégés, students
  language: ['language'],                   // dialects, descendants
  species:  ['species'],                    // subspecies
};

// RULE 4 — the center marker carries the global fact. At most ONE across the tree
// per (kind, name). Zero anywhere is not an omission, it is a statement: the thing
// has no center. A faction with no `supreme` is decentralised, and nobody had to
// say so.
export const CENTERS = {
  faction: 'supreme',
  figure: 'in_person',
  language: 'origin',
  species: 'homeland',
};

// PART 0 — every prose field is capped. Not style advice: a validation rule. If it
// does not fit, you have not decided what the thing is yet.
export const CAPS = { one_line: 12, here: 20, description: 40, why: 25, became: 30 };

export const words = (s) => (s ? String(s).trim().split(/\s+/).filter(Boolean).length : 0);

export function node(kind, name, props = {}) {
  if (!KINDS.includes(kind)) throw new Error(`no such kind: ${kind}`);
  return { kind, name, children: [], history: [], ...props };
}

export function add(parent, child) {
  const allowed = MAY_CONTAIN[parent.kind] ?? [];
  if (!allowed.includes(child.kind)) {
    throw new Error(`a ${parent.kind} may not contain a ${child.kind} (only: ${allowed.join(', ')})`);
  }
  parent.children.push(child);
  return child;
}

// Walk the whole tree, parents-first, handing each node its ancestor chain. Every
// pass in this engine is a walk; none of them get to keep their own index of the
// world, because the tree IS the data (Rule 2).
export function* walk(root, path = []) {
  yield { node: root, path };
  const next = [...path, root];
  for (const c of root.children) yield* walk(c, next);
  for (const h of root.history) yield* walk(h, next);
}

export const all = (root, kind) =>
  [...walk(root)].filter(({ node: n }) => !kind || n.kind === kind);

// ---------------------------------------------------------------------------
// RULE 1 — BLANK MEANS INHERIT, and RULE 3 — propagation is declared per entry.
//
//   override   replaces the parent's value, and passes down
//   accumulate adds to the parent's, and passes down — BOTH are true
//   local      applies HERE ONLY, and stops
//
// The `local` case is the one that earns its keep: a tier-7 capital should not drag
// its farming villages up to tier 7. Mark it local and the tier stops at the city
// walls. Without this, one rich city silently industrialises a whole continent.
export function resolve(path, self, key) {
  const chain = [...path, self];

  let value;
  for (let i = 0; i < chain.length; i++) {
    const n = chain[i];
    if (!(key in n) || n[key] == null) continue;      // blank: say nothing, inherit

    const isSelf = i === chain.length - 1;
    const mode = n.merge ?? 'override';

    // a `local` value belongs to the node that declared it and to nobody below it
    if (mode === 'local' && !isSelf) continue;

    if (mode === 'accumulate' && value != null) {
      value = accumulate(value, n[key]);
    } else {
      value = n[key];
    }
  }
  return value;
}

function accumulate(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) return [...[].concat(a ?? []), ...[].concat(b ?? [])];
  if (typeof a === 'object' && typeof b === 'object') return { ...a, ...b };
  return b;
}

// Everything a node actually is, once inheritance has been applied. This is what
// the game reads — never the raw node, which is full of holes on purpose.
export function effective(path, self, keys) {
  const out = {};
  for (const k of keys) {
    const v = resolve(path, self, k);
    if (v != null) out[k] = v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// RULE 4 — find the center. Returns the single node carrying the marker, or null,
// which is a real answer and not a failure.
export function centerOf(root, kind, name) {
  const marker = CENTERS[kind];
  const hits = [...walk(root)]
    .filter(({ node: n }) => n.kind === kind && n.name === name && n.center === marker)
    .map(({ node: n, path }) => ({ node: n, path }));
  if (hits.length > 1) return { conflict: hits };
  return hits[0] ?? null;
}

// RULE 2 — PLACEMENT IS SCOPE. Where a thing appears IS its reach. A faction written
// at the continent operates continent-wide; written into three countries, it operates
// in exactly those three. So "what is this faction's reach" is not a field you read,
// it is a question you answer by looking at where it sits.
export function reachOf(root, kind, name) {
  return [...walk(root)]
    .filter(({ node: n }) => n.kind === kind && n.name === name)
    .map(({ node: n, path }) => ({
      appearance: n,
      // the nearest enclosing place is the scope of this appearance
      at: [...path].reverse().find((p) => p.kind === 'place' || p.kind === 'era') ?? null,
    }));
}

// RULE 6 — removal is a status, not an absence. A country that hanged every Black
// Hand member does not leave the key blank; blank means "nothing to say". It writes
// status: eradicated, which is louder, and tells you more about the country than
// about the faction.
export const STATUSES = [
  'dead', 'suppressed', 'ascended', 'eradicated here', 'running out',
  'outlawed', 'ubiquitous', 'transformed', 'underwater, still humming',
  'alive, attentive', 'alive, hostile', 'silent', 'alive, mostly',
];
