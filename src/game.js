// The idle layer: turns the tick engine into a game that runs while you're gone.
//
// WHY THIS IS A JOURNAL AND NOT A STATE DUMP
//
// The obvious way to save an idle game is JSON.stringify(state). That is not
// available to us, and the reason is worth writing down because it will look
// like an easy "fix" to someone later:
//
//   state.pending holds live judgments. A judgment's options carry `weight` and
//   `apply` FUNCTIONS, and those functions are closures over local variables
//   inside events.js — `stranger` closes over the generated `name`, `love` closes
//   over the companion object itself. JSON cannot represent a closure. Dumping
//   state would silently drop every pending judgment and every captured binding,
//   which is precisely the mechanic the game is built on.
//
// So we persist the INPUTS instead of the OUTPUT. The engine is deterministic by
// invariant — same seed, same inputs, same run, always — so the full state is a
// pure function of (seed, dials, the things the player
// did, how many days passed). We store that short list and replay it from day 1
// on load. The save file stays tiny, no function is ever serialized, and
// determinism stops being a nice property of the engine and starts being the
// thing that holds the game up.
//
// THE LORE PACK IS AN INPUT TOO. It is chosen once, recorded by id, and never
// regenerated — otherwise the day-5 line you read yesterday would say something
// different today, and the chronicle would stop being a chronicle.
//
// THERE IS NO CYCLE. She dies once. Nothing carries forward, there is no prestige
// reset, and the next life is a different world with a different name for the sky.

import { Sim } from './sim.js';

export const SPEEDS = {
  brisk: 60 * 1000,           // 1 day per real minute — for tasting the thing
  normal: 15 * 60 * 1000,     // 1 day per 15 real minutes — ~96 days/day away
  slow: 60 * 60 * 1000,       // 1 day per real hour — a chronicle, not a feed
};

export const DEFAULT_SPEED = 'normal';
export const SAVE_KEY = 'chronicle.save.v2';
export const EPITAPH_KEY = 'chronicle.epitaphs.v1';

// A clock jump (timezone change, a machine waking from sleep with a bad RTC)
// must not blow up into a million-tick replay. Cap the catch-up.
const MAX_ELAPSED = 20000;

// She was already out there before you thought to look. A new life starts with a
// few days behind it, so the first thing you ever see is a chronicle and possibly
// a judgment already waiting — not an empty page and a fifteen-minute wait.
export const HEADSTART_DAYS = 5;

export function newJournal({
  seed,                    // the world AND the life. worldFromSeed(seed) rebuilds the
                           // whole tree, so there is no pack to record and no file to
                           // go missing — the seed is the world.
  name,                    // omit and the world names her itself
  dials = {},
  speed = DEFAULT_SPEED,
  headstartDays = HEADSTART_DAYS,
  now,
}) {
  const per = SPEEDS[speed] ?? SPEEDS[DEFAULT_SPEED];
  return {
    v: 3,
    seed,
    name: name ?? null,
    speed,
    dials: { reckless: 50, sociable: 50, generous: 50, ...dials },
    startedAt: now - headstartDays * per,
    seenElapsed: 1,   // how far the player has actually read
    entries: [],      // every input the player has ever made, stamped with its day
  };
}

export function msPerDay(journal) {
  return SPEEDS[journal.speed] ?? SPEEDS[DEFAULT_SPEED];
}

// Which day she should be on right now, given the wall clock.
export function targetElapsed(journal, now) {
  const days = Math.floor((now - journal.startedAt) / msPerDay(journal));
  return 1 + Math.min(Math.max(0, days), MAX_ELAPSED);
}

// Real time until the next day ticks over. Drives the countdown in the UI.
export function msUntilNextDay(journal, now) {
  const per = msPerDay(journal);
  const since = now - journal.startedAt;
  if (since < 0) return per;
  return per - (since % per);
}

// Replay the journal from day 1 to `toElapsed`. Deterministic and pure: this is
// the only way state is ever constructed, on first load and on every load after.
//
// `elapsed` is our own day counter, and it keeps running after she dies — a dead
// tick is a no-op, so over-ticking a corpse is harmless.
export function replay(journal, toElapsed) {
  const eng = new Sim({
    seed: journal.seed,
    name: journal.name ?? undefined,
    dials: journal.dials,
  });

  const byDay = new Map();
  for (const e of journal.entries) {
    if (!byDay.has(e.elapsed)) byDay.set(e.elapsed, []);
    byDay.get(e.elapsed).push(e);
  }

  const target = Math.max(1, Math.min(toElapsed, MAX_ELAPSED));
  let seenMark = null;

  const apply = (elapsed) => {
    for (const entry of byDay.get(elapsed) ?? []) {
      if (entry.type === 'answer') {
        // Returns null if it isn't pending. That can only happen if the journal
        // and the engine have diverged, which would be a determinism bug.
        eng.answer(entry.id, entry.key);
      } else if (entry.type === 'dials') {
        Object.assign(eng.state.intent, entry.dials);
      } else if (entry.type === 'suggest') {
        // Where the player would LIKE her to go — an index into sim.sites. It is not
        // an order: `heeds()` weighs it, and that decays as she drifts away from them.
        // A suggestion is an input like any other, so it lives in the journal and
        // replays with everything else. `null` withdraws it.
        eng.state.suggested = entry.at ?? null;
      }
    }
    // Mark where the player's attention stopped, so we can show them the gap.
    if (elapsed === journal.seenElapsed) seenMark = eng.state.log.length;
  };

  let elapsed = 1;
  apply(elapsed);
  while (elapsed < target) {
    eng.tick();     // a no-op once she's dead: nothing more will ever happen to her
    elapsed++;
    apply(elapsed);
  }

  return {
    eng,
    state: eng.state,
    elapsed,
    // Everything that happened while the player wasn't looking.
    unseen: eng.state.log.slice(seenMark ?? eng.state.log.length),
  };
}

// ---------------------------------------------------------------- persistence

export function save(journal, storage) {
  storage.setItem(SAVE_KEY, JSON.stringify(journal));
}

export function load(storage) {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    if (j && j.v === 3 && typeof j.seed === 'number' && Array.isArray(j.entries)) return j;
    return null;
  } catch {
    return null;   // a corrupt save should start a new life, not a white screen
  }
}

// The player's memory, not hers. She gets no afterlife; you get a list of names.
export function epitaphs(storage) {
  try {
    const raw = storage.getItem(EPITAPH_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function bury(storage, { name, world, day }) {
  const list = epitaphs(storage);
  list.unshift({ name, world, day });
  storage.setItem(EPITAPH_KEY, JSON.stringify(list.slice(0, 40)));
  return list;
}
