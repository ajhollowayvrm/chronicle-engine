// PUT HER SOMEWHERE SHE CAN REACH YOU FROM.
//
//   npm run backend:deploy
//
// Reads the VAPID keys from infra/.vapid (gitignored, minted once by `npm run vapid`),
// assembles the Lambda bundle, and hands the stack to SAM. Then it prints the Function URL,
// which is the one thing you have to paste into web/config.js.
//
// The private key is passed as a NoEcho CloudFormation parameter and is never written to
// samconfig.toml, never logged, and never committed.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let vapid;
try {
  vapid = JSON.parse(readFileSync(join(root, 'infra', '.vapid'), 'utf8'));
} catch {
  console.error('No infra/.vapid. Run `npm run vapid` first — ONCE, and only once:\nregenerating silently breaks every phone that already has her installed.');
  process.exit(1);
}

const run = (cmd, args) =>
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });

run('node', ['bin/backend.js']);

run('sam', [
  'deploy',
  '--template', 'infra/template.yaml',
  '--stack-name', 'chronicle-vigil',
  '--resolve-s3',
  '--capabilities', 'CAPABILITY_IAM',
  '--no-confirm-changeset',
  '--no-fail-on-empty-changeset',
  '--parameter-overrides',
  `VapidPublic=${vapid.publicKey}`,
  `VapidPrivate=${vapid.privateKey}`,
  `VapidSubject=${vapid.subject}`,
]);

const out = execFileSync('aws', [
  'cloudformation', 'describe-stacks',
  '--stack-name', 'chronicle-vigil',
  '--query', 'Stacks[0].Outputs',
  '--output', 'json',
], { cwd: root, shell: process.platform === 'win32' }).toString();

const url = JSON.parse(out).find((o) => o.OutputKey === 'ApiUrl')?.OutputValue;
console.log(`\nShe can be reached at:\n\n  ${url}\n\nThat goes in web/config.js.\n`);
