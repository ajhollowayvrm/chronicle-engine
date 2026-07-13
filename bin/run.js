import { Engine } from '../src/engine.js';

// node bin/run.js [seed] [days] [reckless] [sociable] [generous]
const [, , seedArg, daysArg, r, o, g] = process.argv;

const seed = Number(seedArg ?? 7);
const days = Number(daysArg ?? 120);

const eng = new Engine({
  seed,
  name: 'Kestrel of Ilmun',
  dials: {
    reckless: Number(r ?? 68),
    sociable: Number(o ?? 74),
    generous: Number(g ?? 50),
  },
});

const d = eng.state.intent;
console.log(`\nseed ${seed} · ${days} days · dials  reckless ${d.reckless}  sociable ${d.sociable}  generous ${d.generous}`);
console.log('-'.repeat(78));

eng.run(days);
const s = eng.state;

for (const l of s.log) {
  const tag = l.kind === 'judgment' ? (l.by === 'her' ? ' [she decided]' : ' [you decided]')
    : l.kind === 'death' ? ' [death]'
    : l.kind === 'cycle' ? ' [cycle]' : '';
  console.log(`day ${String(l.day).padStart(3)}  ${l.text}${tag}`);
}

console.log('-'.repeat(78));
console.log(`alive: ${s.alive}   coin ${Math.round(s.coin)}   wounds ${s.wounds}   renown ${s.renown}   relics ${s.relics}   threads ${s.threads}`);
console.log(`companions: ${s.companions.filter((c) => c.alive).map((c) => `${c.name}(bond ${c.bond}${c.beloved ? ', beloved' : ''})`).join(', ') || 'none'}`);
console.log(`ghosts:     ${s.ghosts.map((x) => `${x.name} (${x.why}, day ${x.day})`).join(', ') || 'none'}`);
console.log(`baron attention: ${s.barons.attention}`);
console.log('');
console.log('DIAL DRIFT  (what you asked for -> who she became)');
for (const k of ['reckless', 'sociable', 'generous']) {
  const gap = Math.round(s.true[k] - s.intent[k]);
  const arrow = gap === 0 ? '  =  ' : gap > 0 ? '  ->+' : '  ->-';
  console.log(`  ${k.padEnd(9)} intent ${String(s.intent[k]).padStart(3)}   true ${String(Math.round(s.true[k])).padStart(3)}${arrow}${gap === 0 ? '' : Math.abs(gap)}`);
}
console.log('');
