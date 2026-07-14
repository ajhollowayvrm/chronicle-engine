// THE GROWTH BRIEF.
//
//   npm run grow 12 250
//
// Plays a life, then works out — deterministically, in code — WHERE SHE PRESSED ON
// THE WORLD, and writes a brief telling the model exactly what to add and what it may
// not touch.
//
// This is the part that makes chronicle-driven growth different from every other
// generator: depth is budgeted, and the budget is her life. She spent sixty days in
// the Waste and never set foot in Ottrenmark, so the Waste gets the town she kept
// walking through and the foreman she kept working for. Ottrenmark gets nothing. Every
// other generator spends its depth uniformly, which is exactly why the interesting
// parts are always somewhere you are not.
//
// The model never chooses the budget. It only supplies the words.

import { writeFile, mkdir } from 'node:fs/promises';
import { Sim } from '../src/sim.js';
import { walk } from '../gen/node.js';
import { CHRONICLE } from '../gen/tables/chronicle.js';

const args = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const seed = args[0] ?? 12;
const days = args[1] ?? 250;

const sim = new Sim({ seed, dials: { reckless: 68, sociable: 74, generous: 50 } });
sim.run(days);
const s = sim.state;
const w = sim.world;

// ---------------------------------------------------------------- the pressure
// Days she actually spent standing in each place. This is the only measure of what
// matters, and it is not a proxy for anything — it IS what her life was.
const daysAt = new Map();
let cur = null;
for (const l of s.log) {
  const at = sim.sites.find((x) => l.text.includes(x.node.name));
  if (at) cur = at.node.name;
  if (cur) daysAt.set(cur, (daysAt.get(cur) ?? 0) + 1);
}

const lived = [...daysAt.entries()].sort((a, b) => b[1] - a[1]);
const never = sim.sites.filter((x) => !s.seen.includes(x.i)).map((x) => x.node.name);

// people she actually dealt with
const met = new Map();
for (const l of s.log) {
  for (const { node: n } of walk(w)) {
    if (n.kind === 'figure' && l.text.includes(n.name)) met.set(n.name, (met.get(n.name) ?? 0) + 1);
  }
}

// prose that repeated. these are the pools that need lines ABOUT HER, not more
// generic ones — the whole point of growing from the chronicle.
const counts = new Map();
for (const l of s.log) counts.set(l.text, (counts.get(l.text) ?? 0) + 1);
const repeated = [...counts.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);

const hooksResolved = s.log.filter((l) => l.kind === 'judgment');
const standing = Object.entries(s.standing).filter(([, v]) => Math.abs(v) >= 2).sort((a, b) => b[1] - a[1]);

// ------------------------------------------------------------------- the brief
const F = (n) => `\`${n}\``;
const brief = `# GROWTH BRIEF — ${w.name}, seed ${seed}

She walked this world for ${s.day} days and ${s.alive ? 'is still walking' : 'died in it'}.
This brief is generated from what actually happened. **Do not invent a budget — the
budget is below, and it is her life.**

## The rules you are growing under

- **ADD ONLY.** You may not change a fact she has already lived through. The chronicle
  is immutable. Contradiction is allowed only as a \`divergence\`, and a divergence
  carries a \`why\`.
- **Every node you add names a constraining fact** — a cost, a limit, a number, a
  prohibition, a casualty. "An ancient and mysterious power" is not a fact.
- **Every hook cites two facts that are ALREADY IN THE TREE**, and names both.
- **Caps:** one_line ≤ 12 words · here ≤ 20 · why ≤ 25 · became ≤ 30.
- The patch is validated before it is applied. A bad patch changes nothing.

## Where she pressed on the world  — GROW THESE

${lived.slice(0, 4).map(([p, d]) => `- **${p}** — ${d} days of her life. ${F(p)}`).join('\n')}

## Where she never went — GROW NOTHING HERE

${never.length ? never.map((p) => `- ${p}`).join('\n') : '- (she saw all of it)'}

## Who she actually dealt with

${met.size ? [...met.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => `- **${n}** — appears in ${c} of her days`).join('\n') : '- nobody, which is itself a fact about her'}

## Who is keeping score on her

${standing.length ? standing.map(([n, v]) => `- **${n}** ${v > 0 ? '+' : ''}${v.toFixed(1)} — ${v > 0 ? 'they will shelter her' : 'they are hunting her'}`).join('\n') : '- nobody has an opinion of her yet'}

## What she worked out, and what she did about it

${hooksResolved.length ? hooksResolved.map((l) => `- day ${l.day} — ${l.text}`).join('\n') : '- nothing. she has put nothing together.'}

## The world moved without her

${s.eras ? `It wrote ${s.eras} new era${s.eras === 1 ? '' : 's'} while she walked.` : 'It did not, in her lifetime.'}
${s.news.length ? `${s.news.length} thing${s.news.length === 1 ? '' : 's'} happened that she never found out about.` : ''}

## Prose that repeated — she lived these more than once

These want lines **about her specific life**, not more generic ones. That is the entire
point of growing from the chronicle: the pool is shared across every world, and hers is
not.

${repeated.slice(0, 8).map(([t, n]) => `- **${n}×** — ${t}`).join('\n') || '- nothing repeated. she has not lived long enough.'}

## THE CHRONICLE

${s.log.map((l) => `${String(l.day).padStart(3)} · ${l.kind.padEnd(8)} · ${l.text}`).join('\n')}
`;

await mkdir(new URL('../growth/', import.meta.url), { recursive: true });
const path = new URL(`../growth/seed-${seed}.brief.md`, import.meta.url);
await writeFile(path, brief);

console.log(`\nwrote growth/seed-${seed}.brief.md`);
console.log(`\n  ${s.day} days · ${lived.length} places lived in · ${never.length} never seen`);
console.log(`  ${met.size} people dealt with · ${hooksResolved.length} things worked out`);
console.log(`  ${repeated.length} lines she lived more than once\n`);
console.log('  GROW:', lived.slice(0, 4).map(([p, d]) => `${p} (${d}d)`).join(', '));
console.log('  DO NOT GROW:', never.slice(0, 6).join(', ') || '(nothing — she saw it all)');
console.log('');
