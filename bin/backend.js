// ASSEMBLE THE LAMBDA.
//
// The Lambda runs THE ACTUAL GAME — `foresee()` imports `src/sim.js` and the whole `gen/`
// tree unmodified, because the entire trick is that the server and the browser run the same
// deterministic engine and therefore agree, without ever talking to each other, about what
// she is going to do next.
//
// So the bundle is just: server/ + src/ + gen/, with the relative import paths preserved.
// No bundler, no transpile, no dependencies — the AWS SDK is already in the Node 20 runtime
// and everything else is our own source. `node_modules` (playwright, 200MB, build-time only)
// must never go near it, which is the entire reason this script exists instead of pointing
// CodeUri at the repo root.
//
//   npm run backend:build

import { cpSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');   // root, not server/dist — you cannot copy a directory into itself

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// the handlers, and the game they foresee
for (const dir of ['server', 'src', 'gen']) {
  cpSync(join(root, dir), join(dist, dir), { recursive: true });
}

// Node needs to be told these are ES modules, and there are no dependencies to declare.
writeFileSync(join(dist, 'package.json'), JSON.stringify({
  name: 'chronicle-vigil',
  private: true,
  type: 'module',
}, null, 2) + '\n');

console.log('dist/ — server/ + src/ + gen/, no dependencies');
