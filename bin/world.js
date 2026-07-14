// Mint a world from a seed and print it the way the spec's worked example reads.
//
//   npm run world 7             one world, seed 7
//   npm run world -- --sweep 200   mint 200 worlds; report validator failures + variety
//
// Same seed, same world, forever. No LLM runs here — the tables were authored once
// and this rolls against them. That is the difference between a seed and a filename.

import { worldFromSeed } from '../gen/worldgen.js';
import { walk, resolve, centerOf, reachOf } from '../gen/node.js';
import { candidateCount } from '../gen/hooks.js';

const args = process.argv.slice(2);
const sweep = args.includes('--sweep');
const json = args.includes('--json');
const n = Number(args.find((a) => /^\d+$/.test(a)) ?? 1);

// ------------------------------------------------------------------- the sweep
if (sweep) {
  let failed = 0;
  const problems = new Map();
  const shapes = new Set();
  let hooks = 0, cands = 0, divs = 0;

  for (let seed = 1; seed <= n; seed++) {
    let w;
    try {
      w = worldFromSeed(seed, { strict: false });
    } catch (e) {
      failed++;
      problems.set(e.message.split('\n')[1] ?? e.message, (problems.get(e.message) ?? 0) + 1);
      continue;
    }
    if (w.problems.length) {
      failed++;
      for (const p of w.problems) {
        const kind = p.replace(/"[^"]*"/g, '"…"').replace(/\d+/g, 'N');
        problems.set(kind, (problems.get(kind) ?? 0) + 1);
      }
    }
    hooks += w.hooks.length;
    cands += candidateCount(w);
    divs += [...walk(w)].reduce((a, { node: x }) => a + (x.divergences?.length ?? 0), 0);
    shapes.add(`${w.technology.tier}/${w.magic.prevalence}/${w.era.name}/${w.economy.resources}`);
  }

  console.log(`\n${n} worlds minted from seeds 1..${n}\n`);
  console.log(`  valid                ${n - failed}/${n}`);
  console.log(`  distinct shapes      ${shapes.size}`);
  console.log(`  divergences / world  ${(divs / n).toFixed(1)}`);
  console.log(`  hook candidates      ${Math.round(cands / n)} per world  (the collision space)`);
  console.log(`  hooks kept           ${(hooks / n).toFixed(1)} per world`);
  if (problems.size) {
    console.log('\n  VALIDATOR FAILURES — bad worlds are supposed to die cheap:\n');
    for (const [p, c] of [...problems].sort((a, b) => b[1] - a[1])) console.log(`   ${String(c).padStart(4)}×  ${p}`);
  }
  console.log('');
  process.exit(failed ? 1 : 0);
}

// -------------------------------------------------------------------- one world
const w = worldFromSeed(n);
if (json) {
  console.log(JSON.stringify(w, null, 2));
  process.exit(0);
}

const B = (s) => `\x1b[1m${s}\x1b[0m`;
const D = (s) => `\x1b[2m${s}\x1b[0m`;
const I = (s) => `\x1b[3m${s}\x1b[0m`;

console.log(`\n🌍 ${B(w.name)} ${D('(planet)')}   ${D(`seed ${w.seed}`)}`);
console.log(`   ${I(w.aesthetic)}\n`);
console.log(`  variance:   ${w.variance}`);
console.log(`  era:        ${w.era.name} · ${w.era.year} · ${w.era.analogue}`);
console.log(`              ${D('upheaval:')} ${w.era.recent_upheaval}`);
console.log(`              ${D('trajectory:')} ${w.era.trajectory}`);
console.log(`  technology: tier ${w.technology.tier} · ${w.technology.kind}`);
console.log(`              ${D('power:')} ${w.technology.power_source}`);
for (const q of w.technology.quirks) console.log(`              ${D('quirk:')} ${q}`);
console.log(`  magic:      ${w.magic.prevalence}${w.magic.rate ? ` · ${w.magic.rate}` : ''}`);
console.log(`              ${D('source:')} ${w.magic.source}`);
for (const t of w.magic.types) {
  console.log(`              ${B(t.name)} — ${t.method} · ${t.effects}`);
  console.log(`                ${D('cost:')} ${t.cost}  ${D(`(${t.social})`)}`);
}
console.log(`              ${D('limits:')} ${w.magic.limits}`);
console.log(`              ${D('governance:')} ${w.magic.governance}`);
console.log(`  divine:     ${w.divine.origin}`);
console.log(`              ${D('interaction:')} ${w.divine.interaction} · ${D('ascension:')} ${w.divine.ascension}`);
console.log(`  economy:    ${w.economy.resources} → ${w.economy.exports} · ${w.economy.currency}`);
console.log(`              ${D('rich:')} ${w.economy.who_is_rich}`);
console.log(`              ${B('who pays:')} ${w.economy.who_pays_for_it}`);

// ---- the tree
const ICON = { place: '🗺', faction: '🏴', figure: '👤', language: '🗣', species: '🧬', era: '🕰' };
const SCALE = { planet: '🌍', continent: '🗺', country: '🏛', region: '🏜', city: '🏙', town: '⌂' };

function show(node, depth) {
  if (depth > 0) {
    const pad = '  ' + '　'.repeat(depth - 1) + '└ ';
    const icon = node.kind === 'place' ? (SCALE[node.scale] ?? '🗺') : ICON[node.kind];
    let line = `${pad}${icon} ${B(node.name)}`;
    if (node.scale) line += ` ${D(`(${node.scale})`)}`;
    if (node.status) line += ` ${D('·')} ${node.status}`;
    if (node.center) line += `  \x1b[33m[${node.center}]\x1b[0m`;
    console.log(line);

    const sub = '  ' + '　'.repeat(depth) + '  ';
    if (node.one_line) console.log(`${sub}${I(node.one_line)}`);
    if (node.here) console.log(`${sub}${D('here:')} ${node.here}`);
    if (node.technology?.tier != null) console.log(`${sub}${D('tier')} ${node.technology.tier}${node.merge === 'local' ? D('  [local — stops at the walls]') : ''}`);
    if (node.economy?.who_pays_for_it) console.log(`${sub}${D('who pays:')} ${node.economy.who_pays_for_it}`);
    if (node.command) console.log(`${sub}${D('command:')} ${node.command}${node.relationship_to_center ? ` · ${node.relationship_to_center}` : ''}`);
    if (node.known_for) console.log(`${sub}${D('known for:')} ${node.known_for}`);
    if (node.wants) console.log(`${sub}${D('wants:')} ${node.wants}`);
    for (const d of node.divergences ?? []) {
      console.log(`${sub}\x1b[31mdivergence\x1b[0m ${d.key}: ${d.from} → ${d.to} — ${I(d.why)}`);
    }
    if (node.why_it_ended) console.log(`${sub}${D('why it ended:')} ${node.why_it_ended}`);
    if (node.became) console.log(`${sub}${D('became:')} ${I(node.became)}`);
  }
  for (const c of node.children) show(c, depth + 1);
  for (const h of node.history) show(h, depth + 1);
}

console.log('');
show(w, 0);

// ---- the hooks
console.log(`\n${B('hooks @ world')}   ${D(`(${candidateCount(w)} candidate collisions considered)`)}`);
console.log(D('  each is two existing facts colliding. none introduce anything new.\n'));
for (const h of w.hooks) {
  console.log(`  ${I(h.facts[0])}`);
  console.log(`  ${D('+')} ${I(h.facts[1])}`);
  console.log(`  ${D('→')} ${B(h.collision)}\n`);
}

// ---- rule 4, demonstrated: who has a center and who does not
const factionNames = [...new Set([...walk(w)].filter(({ node: x }) => x.kind === 'faction').map(({ node: x }) => x.name))];
if (factionNames.length) {
  console.log(B('centers'));
  for (const name of factionNames) {
    const c = centerOf(w, 'faction', name);
    const reach = reachOf(w, 'faction', name);
    const where = reach.map((x) => x.at?.name).filter(Boolean).join(', ');
    console.log(`  ${name.padEnd(22)} ${c ? `run from ${c.path[c.path.length - 1].name}` : D('no center — decentralised, and nobody had to say so')}`);
    console.log(`  ${''.padEnd(22)} ${D('reach:')} ${where}`);
  }
  console.log('');
}
