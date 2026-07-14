// THE FENCE AROUND THE CHRONICLE'S CLASS NAMES.
//
// This bug shipped twice, and the second time it shipped BECAUSE the first fix was a rename.
//
// The log renders each entry as `class="entry <kind>"`, and the sim's kinds are words like
// `mark`, `kit`, `calling`, `hunt`, `bless`, `stat` — every one of which is also the class
// name of a container somewhere in the panel. So a chronicle entry silently inherited the
// styling of an unrelated component. `.mark` is the 1px absolutely-positioned tick on the
// dial slider that shows who she has actually become; every mark in her chronicle therefore
// became a one-pixel-wide absolutely-positioned column of text, spilling across the whole
// log in an unreadable heap. On a phone it looked like the app had been shredded.
//
// Renaming the offender fixed it, and it came straight back the moment new log kinds were
// added — because the bug was never the name. It was that the log reached into the global
// class namespace at all. `k-` is the fence, and this is what keeps anybody from stepping
// over it.

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');

test('the chronicle namespaces its class names, so a log kind can never style itself as a panel', () => {
  const app = read('web/app.js');
  const css = read('web/style.css');
  const sim = read('src/sim.js');

  // 1. the renderer must fence every entry
  assert.match(
    app,
    /el\('div', `entry k-\$\{l\.kind\}`\)/,
    'renderLog is putting a raw log kind into the global class namespace. That is how `.mark` — a 1px absolutely-positioned slider tick — ate the entire chronicle.'
  );

  // 2. and no stylesheet rule may reach for an unfenced one
  const unfenced = [...css.matchAll(/\.entry\.(?!k-)([\w-]+)/g)].map((m) => m[1]);
  assert.deepStrictEqual(unfenced, [], `unfenced .entry.<kind> selectors: ${unfenced.join(', ')}`);

  // 3. THE REAL GUARD. Every kind the sim can emit, checked against every top-level class the
  //    stylesheet defines. They are allowed to collide — that is exactly the point of the
  //    fence — but if the fence is ever removed, this is the list that will hurt.
  const kinds = new Set([...sim.matchAll(/this\.say\([^,]*,\s*'([\w-]+)'/g)].map((m) => m[1]));
  const classes = new Set([...css.matchAll(/^\.([\w-]+)[\s,{]/gm)].map((m) => m[1]));
  const collide = [...kinds].filter((k) => classes.has(k));

  // These MUST still collide — if they stop, somebody has renamed something and the fence is
  // now load-bearing for a reason nobody remembers.
  assert.ok(
    collide.length > 0,
    'no log kind collides with a panel class any more, which means the fence looks unnecessary. It is not. Leave it.'
  );
});
