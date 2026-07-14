// Load lore packs from disk, for the CLI tools. The browser can't readdir over
// HTTP, so it reads lore/index.json instead — which `npm run lore` writes.

import { readFile, readdir } from 'node:fs/promises';

const dir = new URL('../lore/', import.meta.url);

export async function listPacks() {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json') && f !== 'index.json');
  return files.map((f) => f.replace(/\.json$/, '')).sort();
}

export async function loadPack(id) {
  const ids = await listPacks();
  if (!ids.length) throw new Error('no lore packs in lore/ — the world has no names');
  const want = id ?? ids[0];
  if (!ids.includes(want)) {
    throw new Error(`no such world "${want}". have: ${ids.join(', ')}`);
  }
  return JSON.parse(await readFile(new URL(`${want}.json`, dir), 'utf8'));
}

// Deterministic: the same seed always lands in the same world, so `node bin/run.js 7`
// tells the same story twice.
export async function packForSeed(seed) {
  const ids = await listPacks();
  return loadPack(ids[Math.abs(Math.trunc(seed)) % ids.length]);
}
