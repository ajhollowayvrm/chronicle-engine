// WHAT IT LEFT ON HER.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE RULE THIS FILE EXISTS TO NOT BREAK.
//
// `stats.js`: skills grow by USE and NEVER GO BACK. That is load-bearing — a woman who has
// walked four hundred miles has feet, and no bad week takes that away from her.
//
// But a life takes things. So a MARK does not touch what she KNOWS. It touches what she
// can DO with it. Her Hand is still fourteen. The hand is ruined. She knows exactly what
// to do and she cannot do it, and she can feel the gap, and that is a worse and truer
// sentence than "−2 Hand" — while being, arithmetically, the identical two points.
//
//   raw stat   what she has learned. only `use()` moves it. only ever up.
//   marks      what has happened to her. moves both ways. this file.
//   effective  raw + marks. what she can actually do today. everything reads this.
//
// ─────────────────────────────────────────────────────────────────────────────
// AND THIS IS WHERE THE PLAYER'S ANSWERS GO.
//
// Before this file, an answer moved a bond number that cooled off again in a season, and
// three hundred days later there was no trace on her of anything you had ever told her to
// do. A mark is the trace. You told her to settle it, and she settled it, and she has been
// a woman who settles it ever since — better in a fight, worse in a room. You cannot take
// that back and neither can she.
//
//   mods    — stat deltas. + and −. applied to the effective stat, never to the raw one.
//   mends   — days until it fades. omit for something she carries to the grave.
//   line    — the record, third person: the world sees it before she does.
//   she     — what she says to YOU about it.

export const MARKS = {
  // ────────────────────────────────────────────────────────── WHAT THE WORLD DID
  ruined_hand: {
    name: 'A ruined hand',
    mods: { hand: -3 },
    line: 'the hand set badly. she has all of the knowing of it and none of the use.',
    she: 'I know exactly what to do. I have never known better. I cannot do it, and I get to watch myself not do it.',
  },

  limp: {
    name: 'A limp',
    mods: { foot: -2 },
    mends: 90,
    line: 'she is walking wrong, and pretending she is not, and everyone on the road can see it.',
    she: 'I am slow. Do not say anything about it. I know how far behind I am.',
  },

  bad_eye: {
    name: 'The eye',
    mods: { eye: -2 },
    line: 'something got past her guard and into her face. she sees most of the room now, and she has learned which half to keep to the wall.',
    she: 'I have a side people can come at me from now. I have not decided which side I am angrier about.',
  },

  fever: {
    name: 'A fever that stayed',
    mods: { body: -2, nerve: -1 },
    mends: 60,
    line: 'she took a fever in a country with no answer to it, and it has not entirely let go.',
    she: 'I am tired in a way that sleep does not touch. It has been six weeks. I am not worried. I am telling you, which means I am worried.',
  },

  scarred: {
    name: 'The scar',
    mods: { name: +1, tongue: -1 },
    line: 'it healed across her face, and now it introduces her before she opens her mouth.',
    she: 'People decide about me before I speak now. Some of them decide right, which is the part I did not expect.',
  },

  // THE PRICE OF THE WORKING. Quoted from the world's own magic, which the validator has
  // already forced to name what it costs. The seed wrote the sentence; she pays it.
  the_cost: {
    name: 'The cost',
    mods: { nerve: -2, heart: -2 },
    line: 'she used the thing, and the thing charged what it says it charges, and it did not haggle.',
    she: 'It took what it said it would take. Nobody warned me because nobody had to. It is written on the side of it.',
  },

  hunted: {
    name: 'Hunted',
    mods: { nerve: -1, name: +2 },
    mends: 120,
    line: 'somebody has put her name on a list, and lists are copied.',
    she: 'I have started sitting where I can see the door. I did not decide to start.',
  },

  // ──────────────────────────────────────────────────────────── WHAT SHE CHOSE
  //
  // These are the ones you wrote. Each of them is the far end of an answer you gave, or
  // did not give, and none of them come off.

  blood_answer: {
    name: 'She settles it',
    mods: { hand: +1, nerve: +1, tongue: -2 },
    line: 'she settled it, and the room found out how, and the rooms after that already knew.',
    she: 'I did what you said. It worked. People are careful with me now, and nobody sits down at my table any more, and those are the same fact.',
  },

  let_it_go: {
    name: 'She let it go',
    mods: { heart: +2, name: -1 },
    line: 'she had it in her hand and she put it down, and the ones who were waiting to see have told everyone.',
    she: 'I let it go. They think I could not. Let them. I know what it took and there is nobody I can tell, except you.',
  },

  said_no: {
    name: 'The one who said no',
    mods: { tongue: -1, heart: -1 },
    mends: 200,
    line: 'somebody needed something she had, and asked, and watched her decide they were not worth it.',
    she: 'They asked me and I said no and they said it was fine. I have been carrying the way they said it was fine.',
  },

  sworn: {
    name: 'Sworn',
    mods: { name: +2, nerve: +1 },
    line: 'she gave her word to something bigger than she is, in front of witnesses, out loud.',
    she: 'I said the words. I meant them at the time and I want you to remember that I meant them at the time.',
  },

  kept_it: {
    name: 'The thing she knows',
    mods: { eye: +1, heart: -1 },
    line: 'she worked something out and told nobody, and it has been sitting in her ever since.',
    she: 'I know a thing that nobody else knows and it is the most valuable thing I own and I cannot spend it or put it down.',
  },
};

export const MARK_KEYS = Object.keys(MARKS);
