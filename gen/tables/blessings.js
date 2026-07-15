// WHAT YOU CAN DO TO HER.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE FIRST DIRECT POWER THE PLAYER HAS EVER HAD, AND IT HAD BETTER COST SOMETHING.
//
// Everything else in this game is a REQUEST. You answer when she asks; you say where you
// would rather she went and `heeds()` decides how much of that survives; you cannot move
// her hand. That is the central claim, and a "+2 Hand" button would delete it in an
// afternoon.
//
// So a blessing is bound by two things, and neither of them is negotiable:
//
// 1. SHE HAS TO BELIEVE YOU ARE THERE. A blessing lands on Faith. A woman who has stopped
//    believing anything is listening CANNOT be blessed — not "it is less effective": it does
//    not land, she does not feel it, and the only thing you get back is the knowledge that
//    you left it too long. Neglect does not merely cost you a judgment any more. It closes
//    off your hands.
//
// 2. YOU CANNOT BE A CONSTANT MIRACLE. There is a long silence between blessings (canBless's
//    cooldown, BLESS_GAP). If you could bless her every day she would stop being a woman
//    walking a hard country and start being a character you are buffing, and the game would
//    be over without anybody noticing.
//
// A GIFT IS FREE, OTHERWISE. It once had a third binding — it made her LOUD, added to the
// `attention` the counting thing reads, so every gift was a light switched on over her head.
// That binding has been deliberately cut. A blessing no longer costs her anything: it is a
// pure gift, held back only by belief and by the silence between miracles. (The fields below
// no longer carry an `attention` cost; the sim does not read one.)
//
// AND SHE FINDS OUT SOMETHING SHE DID NOT KNOW.
//
// This is the real weight of it, and it is why blessing is worth having in the game at all:
// it is the first PROOF. Up to now she has believed in you the way people believe in things —
// on nothing, out of need, and with a great deal of doubt. A blessing is evidence. She will
// know something happened. She will not know what you are.
//
// Her Faith goes UP, because you were real. And she is frightened, because you were real.

export const BLESSINGS = {
  mend: {
    name: 'Mend her',
    blurb: 'Close what is open. She will heal in a night, and wake not knowing why.',
    needs: 4,               // the Faith she must have for it to land at all
    wounds: -3,
    heart: +1,
    she: [
      'It closed overnight. I have had that wound for three weeks and it closed overnight, and I have been sitting here looking at my own arm.',
      'I am not hurt any more. I was hurt. I want somebody to explain that to me and there is nobody to ask but you.',
    ],
    line: 'the wound closed in a night, which is not how wounds work, and she has not shown it to anybody.',
  },

  warmth: {
    name: 'Warm her',
    blurb: 'Give her back some of what she has spent. Heart does not refill on its own.',
    needs: 6,
    heart: +4,
    she: [
      'Something has opened up in me and I did not do it. I am being careful with it. I am aware that I did not do it.',
      'I laughed today. I have not laughed in a year and I did not decide to and I would like to know what that was.',
    ],
    line: 'something opened in her that she had closed a long time ago, and she did not do it herself.',
  },

  // ── THE LASTING ONES. These go into her marks — the same list her scars are in, because
  //    that is what they are: things that happened to her and stuck. One each, forever.
  quick: {
    name: 'Quicken her hand',
    blurb: 'She will be faster than she has any right to be, and she will notice.',
    needs: 9,
    mark: 'blessed_hand',
  },
  sure: {
    name: 'Steady her foot',
    blurb: 'The road stops costing her what it costs everybody else.',
    needs: 7,
    mark: 'blessed_foot',
  },
  clear: {
    name: 'Clear her eye',
    blurb: 'She will see it coming. It is the stat that keeps her alive.',
    needs: 8,
    mark: 'blessed_eye',
  },
  hold: {
    name: 'Hold her nerve',
    blurb: 'She will not break. She may come to wish she could.',
    needs: 8,
    mark: 'blessed_nerve',
  },

  // ── AND THE THING IN HER HAND. It is not hers any more, quite.
  item: {
    name: 'Bless what she carries',
    blurb: 'The thing in her hand stops being an ordinary thing. Everyone who sees it will know.',
    needs: 10,
    onItem: true,
    she: [
      'Something happened to it. I did not do anything. It is warmer than it was and I have not put it down and I am not going to.',
      'It is not the same. I know how that sounds. I have carried it for a year and it is not the same and I want you to tell me what you did.',
    ],
    line: 'the thing in her hand is not what it was. she has not put it down since, and she has stopped letting people look at it.',
  },
};

// SHE FINDS OUT SOMETHING SHE DID NOT KNOW. The first blessing is the moment the central
// question of her life gets an answer, and the answer frightens her more than the doubt did.
export const FIRST = [
  'Something is there. I have been talking into the dark for a year and a half and something is THERE. I am not going to sleep tonight.',
  'You are real. I said it out loud to an empty room and then I said it again. You are real and I do not know what you are and those are not the same thing.',
  'I have proof now. I want you to understand what that has done to me. I would rather have gone on not knowing and I would not give it back.',
];

// And when she has stopped believing, and there is nothing there to land on.
export const UNFELT = [
  'She does not feel it. She has stopped believing there is anything to feel, and belief is not decoration here — it is the surface it lands on. There is nothing to land on.',
];
