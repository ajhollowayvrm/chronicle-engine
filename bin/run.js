// Play a world and print the chronicle.
//
//   npm run sim 7 200     seed 7, 200 days

import { readFileSync, existsSync } from 'node:fs';
import { Sim } from '../src/sim.js';

const args = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const seed = args[0] ?? 7;
const days = args[1] ?? 120;

// if her life has already grown this world, walk the grown one
const grownPath = new URL(`../growth/seed-${seed}.patch.json`, import.meta.url);
const patches = existsSync(grownPath) ? [JSON.parse(readFileSync(grownPath, 'utf8'))] : [];

const sim = new Sim({ seed, dials: { reckless: 68, sociable: 74, generous: 50 }, patches });
if (patches.length) console.log('[2m(walking the world her last life grew)[0m');
const w = sim.world;

const D = (s) => `\x1b[2m${s}\x1b[0m`;
const B = (s) => `\x1b[1m${s}\x1b[0m`;
const I = (s) => `\x1b[3m${s}\x1b[0m`;

console.log(`\n${B(w.name)}  ${D(`· seed ${seed} · ${w.era.name}, ${w.era.year}`)}`);
console.log(I(w.aesthetic));
console.log(D(`tier ${w.technology.tier} · ${w.magic.prevalence} magic · who pays: ${w.economy.who_pays_for_it}`));
console.log(D(`she can stand in: ${sim.sites.map((s) => s.node.name).join(' · ')}`));
console.log('─'.repeat(78));
console.log(`${B(sim.state.name)} · ${days} days · starts at ${sim.here().name}\n`);

sim.run(days);

for (const l of sim.state.log) {
  const tag =
    l.kind === 'rumour' ? '\x1b[36m' :
    l.kind === 'travel' ? '\x1b[33m' :
    l.kind === 'death' ? '\x1b[31m' : '';
  const reset = tag ? '\x1b[0m' : '';
  console.log(`${D(`day ${String(l.day).padStart(3)}`)}  ${tag}${l.text}${reset}`);
}

const s = sim.state;
console.log('\n' + '─'.repeat(78));
console.log(
  `${s.alive ? 'still walking' : 'DEAD'} on day ${s.day} · ${Math.round(s.coin)} coin · ${s.wounds} wounds · watched ${s.attention}`
);
console.log(`stood in ${s.seen.length} of ${sim.sites.length} places · the world wrote ${s.eras} new era${s.eras === 1 ? '' : 's'} while she walked`);
const st = Object.entries(s.standing).filter(([, v]) => Math.abs(v) >= 1);
if (st.length) console.log('standing: ' + st.map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v.toFixed(1)}`).join(' · '));
if (s.news.length) console.log(D(`${s.news.length} thing${s.news.length === 1 ? '' : 's'} happened that she never found out about`));
console.log('');
