// Validate every lore pack against the slot manifest in src/lore.js.
//
//   npm run lore
//
// Packs are AUTHORED BY CLAUDE, not generated at runtime — there is no API call
// anywhere in this repo and no key to leak into a static page. To mint new
// worlds, ask Claude Code: "add N new lore packs". It reads SLOTS in src/lore.js,
// writes lore/world-NN.json, and appends to lore/index.json.
//
// This script is the guard rail on that process. Add an event to events.js and
// every existing pack is silently missing its prose — run this and it says so,
// instead of a player reading "[missing lore: your_new_event]" on day 40.

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { SLOTS, JUDGMENT_SLOTS, REGION_SLOTS, FACTION_SLOTS, ALLEGIANCE_SLOTS, SCHOOL_SLOTS, POLITY_SLOTS, HISTORY_SLOTS, validatePack } from '../src/lore.js';

const dir = new URL('../lore/', import.meta.url);
const index = [];

const files = (await readdir(dir)).filter((f) => f.endsWith('.json') && f !== 'index.json').sort();
if (!files.length) {
  console.error('no packs in lore/ — the game has no worlds');
  process.exit(1);
}

const slotCount = Object.keys(SLOTS).length;
const wantLines = Object.values(SLOTS).reduce((n, s) => n + s.n, 0);

console.log(`\n${files.length} packs · ${slotCount} slots · ${wantLines} lines wanted per pack`);
console.log('='.repeat(72));

let failed = 0;

for (const file of files) {
  const pack = JSON.parse(await readFile(new URL(file, dir), 'utf8'));
  const problems = validatePack(pack);

  const lines = Object.values(pack.lines ?? {}).reduce((n, a) => n + (a?.length ?? 0), 0);
  const thin = Object.entries(SLOTS)
    .filter(([slot, spec]) => (pack.lines?.[slot]?.length ?? 0) < spec.n)
    .map(([slot]) => `${slot} ${pack.lines?.[slot]?.length ?? 0}/${spec.n}`);

  // judgments are held to their targets too — the trust prompt is the single
  // most-repeated string in the game
  for (const [key, spec] of Object.entries(JUDGMENT_SLOTS)) {
    const j = pack.judgments?.[key];
    const prompts = Array.isArray(j?.prompt) ? j.prompt.length : j?.prompt ? 1 : 0;
    if (prompts < spec.n) thin.push(`${key}.prompt ${prompts}/${spec.n}`);
    for (const [opt, ospec] of Object.entries(spec.options)) {
      const got = j?.options?.[opt]?.lines?.length ?? 0;
      if (got < ospec.n) thin.push(`${key}.${opt} ${got}/${ospec.n}`);
    }
  }

  // a placeholder the pack uses but the manifest never supplies is a line that
  // will render as a literal "{whatever}" in someone's chronicle
  const unknown = new Set();
  for (const [slot, spec] of Object.entries(SLOTS)) {
    const allowed = new Set([...spec.vars, 'power', 'agents', 'agent']);
    for (const line of pack.lines?.[slot] ?? []) {
      for (const [, key] of line.matchAll(/\{(\w+)\}/g)) if (!allowed.has(key)) unknown.add(`${slot}:{${key}}`);
    }
  }
  for (const [key, spec] of Object.entries(JUDGMENT_SLOTS)) {
    const allowed = new Set([...spec.vars, 'power', 'agents', 'agent']);
    const j = pack.judgments?.[key];
    const prompts = Array.isArray(j?.prompt) ? j.prompt : [j?.prompt ?? ''];
    const texts = [...prompts, ...Object.values(j?.options ?? {}).flatMap((o) => o?.lines ?? [])];
    for (const t of texts) {
      for (const [, k] of t.matchAll(/\{(\w+)\}/g)) if (!allowed.has(k)) unknown.add(`${key}:{${k}}`);
    }
  }

  // Most packs name half their places WITH the article already on ("the Glass
  // Canal") and half without ("Wellmouth"). So "the {place} road" reads fine for
  // Wellmouth and renders "on the the Mirage Road road" for the others — it ships
  // looking correct and breaks on half the rolls. {place} is a proper noun. Let it
  // stand by itself: "past {place}", "the road out of {place}".
  const grammar = [];
  const everyText = [
    ...Object.entries(pack.lines ?? {}).flatMap(([s, a]) => (a ?? []).map((t) => [s, t])),
    ...Object.entries(pack.judgments ?? {}).flatMap(([k, j]) => [
      ...(Array.isArray(j?.prompt) ? j.prompt : [j?.prompt ?? '']).map((t) => [`${k}.prompt`, t]),
      ...Object.entries(j?.options ?? {}).flatMap(([o, v]) => (v?.lines ?? []).map((t) => [`${k}.${o}`, t])),
    ]),
    ...(pack.regions ?? []).flatMap((r) =>
      Object.entries(r?.lines ?? {}).flatMap(([s, a]) => (a ?? []).map((t) => [`${r.id}.${s}`, t]))
    ),
    ...(pack.factions ?? []).flatMap((f) => [
      ...Object.entries(f?.lines ?? {}).flatMap(([s, a]) => (a ?? []).map((t) => [`${f.id}.${s}`, t])),
      ...Object.entries(f?.allegiance ?? {}).flatMap(([s, a]) => (a ?? []).map((t) => [`${f.id}.allegiance.${s}`, t])),
    ]),
    ...(pack.schools ?? []).flatMap((sc) =>
      Object.entries(sc?.lines ?? {}).flatMap(([s, a]) => (a ?? []).map((t) => [`${sc.id}.${s}`, t]))
    ),
    ...(pack.polities ?? []).flatMap((pol) =>
      Object.entries(pol?.lines ?? {}).flatMap(([s, a]) => (a ?? []).map((t) => [`${pol.id}.${s}`, t]))
    ),
    ...Object.entries(pack.history ?? {}).flatMap(([s, a]) => (a ?? []).map((t) => [`history.${s}`, t])),
  ];

  // a country whose law she meets fifteen times a year needs more than four ways
  // of saying so, and history that only knows one way to raise a toll reads like
  // a bug the third time it happens
  for (const pol of pack.polities ?? []) {
    for (const [slot, spec] of Object.entries(POLITY_SLOTS)) {
      const lines = pol?.lines?.[slot];
      if ((lines?.length ?? 0) < spec.n) thin.push(`${pol.id}.${slot} ${lines?.length ?? 0}/${spec.n}`);
      const allowed = new Set([...spec.vars, 'power', 'agents', 'agent']);
      for (const t of lines ?? []) {
        for (const [, k] of t.matchAll(/\{(\w+)\}/g)) if (!allowed.has(k)) unknown.add(`${pol.id}.${slot}:{${k}}`);
      }
    }
  }
  if (pack.polities) {
    for (const [slot, spec] of Object.entries(HISTORY_SLOTS)) {
      const lines = pack.history?.[slot];
      if ((lines?.length ?? 0) < spec.n) thin.push(`history.${slot} ${lines?.length ?? 0}/${spec.n}`);
      const allowed = new Set([...spec.vars, 'power', 'agents', 'agent']);
      for (const t of lines ?? []) {
        for (const [, k] of t.matchAll(/\{(\w+)\}/g)) if (!allowed.has(k)) unknown.add(`history.${slot}:{${k}}`);
      }
    }
  }

  for (const sc of pack.schools ?? []) {
    for (const [slot, spec] of Object.entries(SCHOOL_SLOTS)) {
      const lines = sc?.lines?.[slot];
      if ((lines?.length ?? 0) < spec.n) thin.push(`${sc.id}.${slot} ${lines?.length ?? 0}/${spec.n}`);
      const allowed = new Set([...spec.vars, 'power', 'agents', 'agent']);
      for (const t of lines ?? []) {
        for (const [, k] of t.matchAll(/\{(\w+)\}/g)) if (!allowed.has(k)) unknown.add(`${sc.id}.${slot}:{${k}}`);
      }
    }
  }

  // factions are held to their targets and their placeholders checked, same as
  // everything else. {faction} and {place} are always in scope for them.
  for (const f of pack.factions ?? []) {
    const check = (spec, group, lines) => {
      const allowed = new Set([...(spec.vars ?? ['faction', 'place']), 'power', 'agents', 'agent', 'faction', 'place']);
      if ((lines?.length ?? 0) < spec.n) thin.push(`${f.id}.${group} ${lines?.length ?? 0}/${spec.n}`);
      for (const t of lines ?? []) {
        for (const [, k] of t.matchAll(/\{(\w+)\}/g)) if (!allowed.has(k)) unknown.add(`${f.id}.${group}:{${k}}`);
      }
    };
    for (const [slot, spec] of Object.entries(FACTION_SLOTS)) check(spec, slot, f?.lines?.[slot]);
    for (const [slot, spec] of Object.entries(ALLEGIANCE_SLOTS)) check(spec, `allegiance.${slot}`, f?.allegiance?.[slot]);
  }

  // regions are held to their line targets, and their placeholders checked, the
  // same as everything else — {region}, {place}, {from}, {to} and nothing exotic
  for (const r of pack.regions ?? []) {
    for (const [slot, spec] of Object.entries(REGION_SLOTS)) {
      const got = r?.lines?.[slot]?.length ?? 0;
      if (got < spec.n) thin.push(`${r.id}.${slot} ${got}/${spec.n}`);
      const allowed = new Set([...spec.vars, 'power', 'agents', 'agent']);
      for (const t of r?.lines?.[slot] ?? []) {
        for (const [, k] of t.matchAll(/\{(\w+)\}/g)) if (!allowed.has(k)) unknown.add(`${r.id}.${slot}:{${k}}`);
      }
    }
  }
  // {place}, {region}, {to} and {from} all resolve to proper nouns that carry
  // their own article about half the time ("the Glass Canal" / "Wellmouth"), so
  // any article in front of one of them doubles up on half the rolls.
  for (const [slot, text] of everyText) {
    const hit = text.match(/\b(the|a|an) \{(place|region|to|from|faction|school)\}/i);
    if (hit) grammar.push(`${slot}: "${hit[1]} {${hit[2]}}" doubles the article — these are proper nouns, let them stand alone`);
  }

  const ok = !problems.length && !unknown.size && !grammar.length;
  if (!ok) failed++;
  else index.push({ id: pack.id, title: pack.title, premise: pack.premise ?? '' });

  console.log(`${ok ? '✔' : '✖'} ${(pack.id ?? file).padEnd(10)} ${String(lines).padStart(4)} lines  ${pack.title ?? '(untitled)'}`);
  for (const p of problems) console.log(`    ✖ ${p}`);
  for (const u of unknown) console.log(`    ✖ unknown placeholder ${u}`);
  for (const g of grammar) console.log(`    ✖ ${g}`);
  if (ok && thin.length) console.log(`    · thin (fewer variants than wanted): ${thin.join(', ')}`);
}

// ---------------------------------------------------------------- cross-pack
//
// The whole promise is that every world reads differently. A line shared between
// two packs quietly breaks that — and it is the FAILURE MODE OF WRITING THEM FROM
// AN EXEMPLAR: whoever writes world-09 reads world-01 for the format, likes its
// best line, and keeps it. The memorable lines are exactly the ones that get
// copied, so the damage is invisible until two players compare notes.
//
// Convention: the lowest-numbered pack owns a line. Every later pack must write
// its own.

const owner = new Map();
const dupes = [];

for (const file of files) {
  const pack = JSON.parse(await readFile(new URL(file, dir), 'utf8'));
  const texts = [
    ...Object.entries(pack.lines ?? {}).flatMap(([s, a]) => (a ?? []).map((t) => [s, t])),
    ...Object.entries(pack.judgments ?? {}).flatMap(([k, j]) => [
      ...(Array.isArray(j?.prompt) ? j.prompt : [j?.prompt ?? '']).map((t) => [`${k}.prompt`, t]),
      ...Object.entries(j?.options ?? {}).flatMap(([o, v]) => (v?.lines ?? []).map((t) => [`${k}.${o}`, t])),
    ]),
  ];
  for (const [slot, text] of texts) {
    const key = text.trim().toLowerCase();
    if (!key) continue;
    if (owner.has(key)) dupes.push({ text, slot, pack: pack.id, first: owner.get(key) });
    else owner.set(key, pack.id);
  }
}

if (dupes.length) {
  console.log('');
  console.log(`✖ ${dupes.length} line(s) copied between worlds — every world must write its own`);
  const byPack = new Map();
  for (const d of dupes) {
    if (!byPack.has(d.pack)) byPack.set(d.pack, []);
    byPack.get(d.pack).push(d);
  }
  for (const [id, list] of byPack) {
    console.log(`\n  ${id} — ${list.length} borrowed:`);
    for (const d of list) console.log(`    ${d.slot.padEnd(24)} (from ${d.first})  "${d.text}"`);
  }
  failed += dupes.length;
}

// the browser can't readdir over HTTP — it reads this
await writeFile(new URL('index.json', dir), JSON.stringify(index, null, 2) + '\n');

console.log('');
console.log('='.repeat(72));
console.log(`wrote lore/index.json — ${index.length} playable worlds`);
console.log(failed ? `\n✖ ${failed} problem(s)\n` : '\n✔ all packs valid, and no two worlds share a line\n');
process.exit(failed ? 1 : 0);
