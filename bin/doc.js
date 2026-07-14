// THE DOCUMENT.
//
//   npm run doc 12        the world of seed 12, as prose
//
// Renders the grown world as a readable document. Not a data dump — a thing you can
// read straight through, which is the only real test of whether the world holds
// together. A generator can always produce JSON that validates; it cannot always
// produce a world you would want to read about.
//
// What she GREW is marked. That is the interesting column: it is the part of the world
// that exists because of how one woman spent 251 days.

import { writeFile } from 'node:fs/promises';
import { existsSync, readFileSync as read } from 'node:fs';
import { worldFromSeed } from '../gen/worldgen.js';
import { applyPatch } from '../gen/patch.js';
import { walk, resolve, centerOf, reachOf } from '../gen/node.js';

const seed = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 12);

let world = worldFromSeed(seed);
const patchPath = new URL(`../growth/seed-${seed}.patch.json`, import.meta.url);
let grown = false;
if (existsSync(patchPath)) {
  const patch = JSON.parse(read(patchPath, 'utf8'));
  const r = applyPatch(world, patch);
  if (r.problems.length) throw new Error(r.problems.join('\n'));
  world = r.world;
  grown = true;
}

const G = (n) => (n.grown ? ' ★' : '');
const out = [];
const p = (s = '') => out.push(s);

const places = [...walk(world)].filter(({ node: n }) => n.kind === 'place');
const countries = places.filter(({ node: n }) => ['country', 'region'].includes(n.scale));

p(`# ${world.name}`);
p();
p(`*${world.aesthetic}*`);
p();
p(`> ${world.era.name} · ${world.era.year} · about ${world.era.analogue}.`);
p(`> **${world.era.recent_upheaval}.**`);
p(`> It is heading ${world.era.trajectory}.`);
p();
if (grown) {
  p(`Entries marked ★ do not come from the seed. They exist because of how one woman`);
  p(`spent her life here — the world grew where she pressed on it, and nowhere else.`);
  p();
}
p('---');
p();

// ------------------------------------------------------------------ the systems
p('## How it works');
p();
p(`**Technology.** Tier ${world.technology.tier} — ${world.technology.kind}. It runs on ${world.technology.power_source}.`);
for (const q of world.technology.quirks) p(`Also: ${q}.`);
p();
p(`**Magic.** ${world.magic.prevalence[0].toUpperCase() + world.magic.prevalence.slice(1)}${world.magic.rate ? ` — ${world.magic.rate}` : ''}. It comes from ${world.magic.source}.`);
p();
for (const t of world.magic.types) {
  p(`- **${t.name}** — ${t.method}; ${t.effects}. *${t.social}.*`);
  p(`  **Cost: ${t.cost}.**`);
}
p();
p(`**Limits:** ${world.magic.limits}.`);
p();
p(`**Legally:** ${world.magic.governance}.`);
p();
p(`**The gods.** ${world.divine.origin[0].toUpperCase() + world.divine.origin.slice(1)}. They interact ${world.divine.interaction}, and ascension is ${world.divine.ascension}.`);
p();
for (const { node: n } of walk(world)) {
  if (n.kind !== 'figure' || !n.divine) continue;
  p(`- **${n.name}** — *${n.status}.* ${n.one_line}.`);
  if (n.here) p(`  ${n.here}.`);
}
p();
p(`**The money.** ${world.economy.resources} → ${world.economy.exports}, paid in ${world.economy.currency}.`);
p(`The money sits with ${world.economy.who_is_rich}. **The bill is paid by ${world.economy.who_pays_for_it}.**`);
p();
p('---');
p();

// ----------------------------------------------------------------- the countries
p('## The country');
p();
for (const { node: n, path } of countries) {
  const tier = resolve(path, n, 'technology')?.tier;
  const econ = resolve(path, n, 'economy') ?? {};
  p(`### ${n.name}${G(n)}`);
  p();
  if (n.one_line) p(`*${n.one_line}.*`);
  p();
  p(`Tier ${tier}${n.merge === 'local' ? ' — and it stops at the walls; the villages below it are not tier ' + tier + '.' : '.'} ${n.aesthetic ? n.aesthetic[0].toUpperCase() + n.aesthetic.slice(1) + '.' : ''}`);
  if (econ.who_pays_for_it) p(`It lives on ${econ.resources}. The money sits with ${econ.who_is_rich}. **The bill is paid by ${econ.who_pays_for_it}.**`);
  p();
  for (const d of n.divergences ?? []) {
    p(`> **It does not fit.** ${d.key} runs ${d.from} → ${d.to} here — *${d.why}.*`);
    p();
  }
  const kids = n.children.filter((c) => c.kind === 'place');
  if (kids.length) {
    p(`Inside it: ${kids.map((c) => `**${c.name}**${c.grown ? ' ★' : ''}${c.status ? ` (${c.status})` : ''}`).join(', ')}.`);
    p();
  }
  for (const f of n.children.filter((c) => c.kind === 'faction')) {
    p(`**${f.name}** is here${f.grown ? ' ★' : ''}, and here it is *${f.here}*.`);
    p(f.center === 'supreme'
      ? `  This is where it is run from.`
      : `  It is a ${f.command}, and its relationship to whoever leads it is: ${f.relationship_to_center}.`);
    p();
  }
  for (const g of n.children.filter((c) => c.kind === 'figure')) {
    p(`**${g.name}**${G(g)}${g.status ? ` — *${g.status}*` : ''}. ${g.one_line ? g.one_line + '.' : ''}`);
    if (g.here) p(`  ${g.here}.`);
    if (g.known_for) p(`  Known for ${g.known_for}.`);
    if (g.wants) p(`  Wants ${g.wants}.`);
    p();
  }
  for (const sp of n.children.filter((c) => ['language', 'species'].includes(c.kind))) {
    p(`**${sp.name}** (${sp.kind})${G(sp)} — ${sp.one_line}. ${sp.here ?? ''}`);
    p();
  }
  for (const e of n.history) {
    p(`> **Before this: ${e.name}**${e.grown ? ' ★' : ''} (${e.years ?? '?'}) — *${e.status}.*`);
    p(`> It ended because ${e.why_it_ended}.`);
    p(`> It became: ${e.became}.`);
    p();
  }
}

// -------------------------------------------------------------------- the reach
p('---');
p();
p('## Who runs what');
p();
const factionNames = [...new Set([...walk(world)].filter(({ node: n }) => n.kind === 'faction').map(({ node: n }) => n.name))];
for (const name of factionNames) {
  const c = centerOf(world, 'faction', name);
  const reach = reachOf(world, 'faction', name).map((x) => x.at?.name).filter(Boolean);
  p(`**${name}** operates in ${reach.join(', ')}.`);
  p(c
    ? `It is run from ${c.path[c.path.length - 1].name}.`
    : `**It has no head at all** — nobody carries the mark, and that was not an omission. It is decentralised, and nobody had to say so.`);
  p();
}

// -------------------------------------------------------------------- the hooks
p('---');
p();
p('## What is about to go wrong');
p();
p('*Each is two facts already true, put next to each other. None of them introduce anything new.*');
p();
for (const h of world.hooks) {
  p(`- ${h.facts[0]}`);
  p(`  **+** ${h.facts[1]}`);
  p(`  **→ ${h.collision}**${h.grown ? ' ★' : ''}`);
  p();
}

const doc = out.join('\n');
await writeFile(new URL(`../growth/${world.name}-seed-${seed}.md`, import.meta.url), doc);
console.log(doc);
console.error(`\n[wrote growth/${world.name}-seed-${seed}.md — ${doc.split('\n').length} lines]`);
