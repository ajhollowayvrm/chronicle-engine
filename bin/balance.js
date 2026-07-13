// Run many seeds and report the spread. Tune against THIS, never a single run.
// A single seed will lie to you: the first version of this engine looked healthy
// on seed 7 and converged to an identical end state on every other seed.
//
//   node bin/balance.js [seeds] [days] [reckless] [sociable] [generous]

import { Engine } from '../src/engine.js';

const [, , nArg, daysArg, r, o, g] = process.argv;
const N = Number(nArg ?? 200);
const days = Number(daysArg ?? 200);
const dials = { reckless: Number(r ?? 68), sociable: Number(o ?? 74), generous: Number(g ?? 50) };

const runs = [];
for (let seed = 1; seed <= N; seed++) {
  const e = new Engine({ seed, dials });
  e.run(days);
  const s = e.state;
  runs.push({
    alive: s.alive,
    day: s.day,
    coin: Math.round(s.coin),
    renown: s.renown,
    threads: s.threads,
    attention: s.barons.attention,
    kept: s.companions.filter((c) => c.alive).length,
    beloved: s.companions.some((c) => c.beloved),
    ghosts: s.ghosts.length,
    died: s.ghosts.filter((x) => x.why === 'died').length,
    drift: {
      reckless: s.true.reckless - s.intent.reckless,
      sociable: s.true.sociable - s.intent.sociable,
      generous: s.true.generous - s.intent.generous,
    },
  });
}

const num = (f) => runs.map(f).sort((a, b) => a - b);
const q = (a, p) => a[Math.floor((a.length - 1) * p)];
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const pct = (f) => Math.round((runs.filter(f).length / N) * 100);

const line = (name, arr, dp = 0) => {
  const a = num(() => 0).length ? arr : arr;
  console.log(
    `  ${name.padEnd(18)} p10 ${q(a, 0.1).toFixed(dp).padStart(7)}   median ${q(a, 0.5).toFixed(dp).padStart(7)}   p90 ${q(a, 0.9).toFixed(dp).padStart(7)}   mean ${mean(a).toFixed(dp).padStart(7)}`
  );
};

console.log(`\n${N} seeds x ${days} days   dials: reckless ${dials.reckless}  sociable ${dials.sociable}  generous ${dials.generous}`);
console.log('='.repeat(84));
console.log('SPREAD  (a healthy sim has wide gaps between p10 and p90 — narrow gaps mean an attractor)');
line('coin', num((x) => x.coin));
line('renown', num((x) => x.renown));
line('threads', num((x) => x.threads));
line('baron attention', num((x) => x.attention));
line('ghosts', num((x) => x.ghosts));
line('companions dead', num((x) => x.died));
line('drift: reckless', num((x) => x.drift.reckless), 1);
line('drift: sociable', num((x) => x.drift.sociable), 1);
line('drift: generous', num((x) => x.drift.generous), 1);

console.log('-'.repeat(84));
console.log('OUTCOMES');
console.log(`  she survived ${days} days      ${pct((x) => x.alive)}%`);
console.log(`  ended with someone         ${pct((x) => x.kept > 0)}%`);
console.log(`  ended with someone beloved ${pct((x) => x.beloved)}%`);
console.log(`  ended alone                ${pct((x) => x.kept === 0)}%`);
console.log(`  lost someone to death      ${pct((x) => x.died > 0)}%`);
console.log(`  drew a Baron's eye (>=10)  ${pct((x) => x.attention >= 10)}%`);
console.log('');
