// RELATIONSHIPS.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE MODEL, AND WHY IT IS NOT A NUMBER.
//
// The old bond was a single value that only went up. That is the least human thing in
// this codebase: it says a relationship is a bar you fill, and that people are either
// more or less your friend.
//
// Real ones run on TWO AXES AT ONCE, and they are independent:
//
//   CLOSENESS — how much of herself she has given them
//   FRICTION  — how much they grate; what is unresolved; what was said
//
// You can love somebody and be furious with them. You can respect a rival you would
// never drink with. You can be close to somebody you no longer trust — that is most
// of the interesting ones. A single number cannot say any of that.
//
// So the KIND of a relationship is DERIVED from where it sits on those axes, never
// declared. Nobody in this game is assigned "rival". They become one, and they can stop.
//
//         friction
//            ▲
//   enemy    │   feud          ← close AND furious: the worst ones
//            │
//   rival    │   complicated
//            │
//   stranger │   friend  ─ lover
//            └──────────────────▶ closeness
//
// TRUST is a third thing and it is not closeness. She can be closer to somebody than she
// trusts them, and she will know it, and it will eat her.

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export function newBond(name, node, day) {
  return {
    who: name,
    node,                 // the figure in the tree. they have a want, and a place, and kin.
    met: day,

    closeness: 0,         // how much of herself she has given them
    friction: 0,          // what is unresolved between them
    trust: 5,             // whether she would put her back to them
    owes: 0,              // + she owes them · − they owe her. a life saved is a debt.

    romance: 0,           // 0 none · 1 she has noticed · 2 circling · 3 admitted · 4 together
    romanceOneSided: false,

    withHer: false,       // travelling together
    alive: true,
    history: [],          // {day, what} — the things that actually happened between them
    knows: [],            // what she has told them that she has told nobody else
  };
}

// The kind is DERIVED. Nobody is assigned "rival" — they become one, and they can stop.
export function kindOf(b) {
  if (!b.alive) return 'dead';
  if (b.romance >= 3) return b.friction >= 10 ? 'lovers, badly' : 'lover';
  if (b.friction >= 14 && b.closeness >= 10) return 'feud';        // the worst kind: close AND furious
  if (b.friction >= 14) return 'enemy';
  if (b.friction >= 8 && b.closeness >= 8) return 'complicated';
  if (b.friction >= 8) return 'rival';
  if (b.closeness >= 14) return 'close';
  if (b.closeness >= 7) return 'friend';
  if (b.closeness >= 3 || b.friction >= 3) return 'known';
  return 'stranger';
}

// What the player is shown. Not a stat — a sentence about two people.
export function describe(b) {
  const k = kindOf(b);
  const owed = b.owes > 3 ? ' She owes them, and it is not a small thing.'
    : b.owes < -3 ? ' They owe her, and both of them know it.' : '';
  const distrust = b.closeness >= 10 && b.trust <= 6
    ? ' She is closer to them than she trusts them, and she knows it, and it is eating her.' : '';

  const base = {
    stranger:      'She has barely spoken to them.',
    known:         'They know each other. That is the whole of it, so far.',
    friend:        'They are easy with each other. Neither has said so.',
    close:         'She would put her back to them without checking. She has.',
    lover:         'They found each other, and neither of them was looking.',
    'lovers, badly': 'They are together, and they are tearing pieces off each other, and neither will stop.',
    rival:         'They want the same thing, and only one of them is going to have it.',
    complicated:   'She likes them and cannot forgive them, and both are true at once.',
    feud:          'She loved them once. That is what makes this the version that kills people.',
    enemy:         'It has gone past argument. One of them is going to end it.',
    dead:          'They are dead.',
  }[k];

  return (base + owed + distrust).trim();
}

// ─────────────────────────────────────────────────────────────────── movement
// Every change to a relationship is an EVENT with a day and a reason, not a silent
// increment. The history is what makes it a relationship rather than a meter — and it
// is what she remembers when they are dead.
export function shift(b, { closeness = 0, friction = 0, trust = 0, owes = 0 }, what, day, memorable = false) {
  b.closeness = clamp(b.closeness + closeness, 0, 20);
  b.friction = clamp(b.friction + friction, 0, 20);
  b.trust = clamp(b.trust + trust, 0, 20);
  b.owes = clamp(b.owes + owes, -20, 20);

  // A RELATIONSHIP REMEMBERS MOMENTS, NOT TICKS.
  //
  // The first version logged every quiet hour, and the history read "a quiet hour · a
  // quiet hour · a quiet hour" forty times over. That is not how anybody remembers a
  // person. You remember the day they turned up. The day they did the unforgivable
  // thing. The day they did not leave.
  //
  // So only MEMORABLE things go in — and the same thing never goes in twice, because
  // the ninth time somebody's cousin took against her is not a memory, it is a mood.
  if (what && memorable && !b.history.some((h) => h.what === what)) {
    b.history.push({ day, what });
  }
  return b;
}

// TIME PASSES, AND IT DOES TWO THINGS.
//
// FRICTION COOLS if nothing feeds it. People do get over things — slowly, and never all
// the way. It floors at a third of its worst, because you do not forget.
//
// TRUST GOES QUIETLY OUT OF THINGS. This is the one I missed, and it broke the saddest
// mechanic in the game: she would tell somebody her real name, and then nothing could
// ever make her stop trusting them, so the person she had handed the knife to could never
// use it. In sixty lives she told fifty-three people her secret and not one of them ever
// sold her with it.
//
// But trust is not destroyed in a moment. It ERODES when you are not there. She is on the
// road for a year; they hear things about her; she does not write, because she cannot.
// Closeness stays — you do not stop loving somebody because you are away from them — and
// the trust goes, and neither of them can say when it went.
//
// That is how somebody who knows her real name ends up selling it.
export function cool(b, day) {
  if (b.friction > 0 && b.friction > (b.peakFriction ?? 0) / 3) b.friction -= 0.05;
  b.peakFriction = Math.max(b.peakFriction ?? 0, b.friction);

  const away = day - (b.lastSeen ?? b.met);
  if (!b.withHer && away > 60 && b.trust > 3) {
    b.trust -= 0.02;                    // about a point a season. you would not notice.
    if (away > 200 && b.friction < 8) b.friction += 0.01;   // and a little resentment settles
  }
}
