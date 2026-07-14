// WHEN WILL SHE NEXT NEED YOU?
//
// ─────────────────────────────────────────────────────────────────────────────
// THE SERVER DOES NOT SIMULATE HER. IT FORESEES HER.
//
// This is the whole reason the notification layer is nearly free. The engine is
// deterministic by invariant — same seed, same inputs, same run, forever — and the save is
// a journal of INPUTS. So the server does not need to run a live world, hold state, or
// stay in sync with anything. Given (seed, dials, the answers you have given), it replays
// her and then keeps ticking, and it can tell you THE EXACT DAY she will next turn round
// and ask you something. Then it sets an alarm for that moment and forgets about her.
//
// Nothing runs between now and then. No polling, no clock, no per-user process. A cron
// wakes every five minutes, looks for alarms that have come due, and goes back to sleep.
//
// When you answer her, the future changes — so we throw the prediction away and foresee
// her again. That is the only time this ever runs.
//
// ─────────────────────────────────────────────────────────────────────────────
// AND SHE DOES NOT ALWAYS TELL YOU.
//
// `maybeSpeak()` has always made her talk to you LESS, and colder, as she stops believing
// you are there. If the notifications ignored that, we would have broken the best thing in
// the game: neglect would stop costing anything, because the game would nag you.
//
// So the push reads off Faith, exactly as her voice does. A woman who still believes in you
// tells you when she needs you. A woman who has stopped believing anybody is listening
// mostly does not bother — and at Faith 0 she never does, and your phone simply goes quiet,
// and the only way you will ever find out what became of her is to open the app and look.
//
// That is the cruellest thing in this codebase and I am fairly sure it is the best.

import { replay, targetElapsed, msPerDay } from '../src/game.js';

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// How far ahead we are willing to look. She raises something every few days, so this is
// generous; if a run is genuinely quiet for this long, the cron simply looks again later.
const HORIZON = 120;

// A stable [0,1) from a string. NOT the sim's RNG — reaching into `sim.rng` would consume
// draws the client is not consuming, and the server's forward prediction would silently
// diverge from the life the player is actually living. The prediction must be a pure
// observer, and it must not touch her.
function dice(...parts) {
  const s = parts.join('|');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

// DOES SHE ACTUALLY REACH OUT? `heeds()` is the game's own answer to "does she still turn
// to you" — it blends her Faith with how far she has drifted from the woman you asked for.
// We do not invent a second notion of it here.
export function reachesOut(eng, id) {
  const faith = eng.eff('faith');
  if (faith <= 0) return false;             // she has stopped believing anything is there.

  // ^0.7, so warmth is reliable and silence ramps. A woman who trusts you tells you almost
  // every time; a woman who has nearly given up tells you almost never.
  const p = clamp(Math.pow(eng.heeds(), 0.7), 0.02, 1);
  return dice(eng.seed, id, faith) < p;
}

// What she is asking, in her own words, for a lock screen belonging to somebody who has not
// thought about her all day.
function words(eng, j) {
  const s = eng.state;
  const her = s.name;

  if (j.kind === 'calling') {
    return { title: `${her} is being called something`, body: j.prompt };
  }
  if (j.kind === 'romance' || j.kind === 'counsel' || j.kind === 'join') {
    return { title: `${her} is asking you`, body: j.prompt };
  }
  // a hook: two facts she already knew, put next to each other
  return {
    title: `${her} has worked something out`,
    body: j.collision ? `${j.collision} — and she does not know what to do about it.` : 'She has put two things together, and she is waiting on you.',
  };
}

// ══════════════════════════════════════════════════════════════════ THE PREDICTION
//
// Returns the next moment she will need you — or null, if she will get through the whole
// horizon without turning round, or if she has stopped talking to you altogether.
//
//   { at, day, id, title, body, kind }
//
// `told` is the set of judgment ids she has already knocked about, so a judgment that sits
// open for six days does not knock six times.
export function foresee(journal, now, told = []) {
  const seen = new Set(told);
  const per = msPerDay(journal);
  const at = (day) => journal.startedAt + (day - 1) * per;

  const start = targetElapsed(journal, now);
  const { eng } = replay(journal, start);

  // ── SHE MAY ALREADY BE ASKING. A judgment raised while the player was away is not a
  //    future event, it is an unanswered one, and it is the most urgent thing there is.
  for (const j of eng.state.pending) {
    if (seen.has(j.id)) continue;
    if (!reachesOut(eng, j.id)) { seen.add(j.id); continue; }
    return { at: now, day: eng.state.day, id: j.id, kind: j.kind ?? 'hook', ...words(eng, j) };
  }

  // ── AND THEN WE WALK FORWARD THROUGH HER LIFE UNTIL SHE NEEDS US.
  for (let i = 0; i < HORIZON && eng.state.alive; i++) {
    const before = new Set(eng.state.pending.map((p) => p.id));
    eng.tick();

    // SHE DIED. This one is not gated on Faith and it never will be: she is not the one
    // telling you. She cannot. The world is.
    if (!eng.state.alive) {
      const d = [...eng.state.log].reverse().find((l) => l.kind === 'death');
      return {
        at: at(eng.state.day),
        day: eng.state.day,
        id: `death_${eng.state.day}`,
        kind: 'death',
        title: `${eng.state.name} is dead`,
        body: d?.text ?? 'She is dead. Nothing carries over.',
      };
    }

    for (const j of eng.state.pending) {
      if (before.has(j.id) || seen.has(j.id)) continue;
      if (!reachesOut(eng, j.id)) { seen.add(j.id); continue; }
      return { at: at(eng.state.day), day: eng.state.day, id: j.id, kind: j.kind ?? 'hook', ...words(eng, j) };
    }
  }

  return null;   // she gets through the horizon without you. look again later.
}
