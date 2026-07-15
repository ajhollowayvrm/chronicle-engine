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
    she: [
      'I know exactly what to do. I have never known better. I cannot do it, and I get to watch myself not do it.',
      'The knowing is all still there. That is the cruelty of it. If I had forgotten how, I could make my peace — but I remember perfectly, in the fingers, and the fingers will not answer, and every day is a small argument between what I know and what I can do, and what I know loses.',
      'It set wrong and there was no one to set it right, and now it is a hand that has opinions the rest of me does not share, a hand that quits halfway through the thing I have asked it, and I have learned to plan around a traitor I carry on the end of my own arm.',
    ],
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
    she: [
      'It took what it said it would take. Nobody warned me because nobody had to. It is written on the side of it.',
      'The price was named and the price was fair and I paid it anyway, and I keep telling people that as though it makes me clever, and it does not make me clever, it makes me someone who read the cost and reached for the thing regardless.',
      'I knew the exact toll before I used it and I used it, and now I carry the toll, and the worst part is there is no one to be angry at — not the maker, not the seller, not the world. It said what it would cost. I simply wanted the thing more than I wanted to keep what it asked.',
    ],
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
    she: [
      'I did what you said. It worked. People are careful with me now, and nobody sits down at my table any more, and those are the same fact.',
      'You told me to settle it and I settled it and I am a woman who settles things now, in every room, forever, and I did not know when I did the one thing that I was choosing to be the kind of woman who does it, but I was, and I am.',
      'It is done and it stayed done and the story of how went ahead of me to the next town and the one after, and now I do not have to settle things any more, mostly, because the story does it for me, and I am safer and more alone than I have ever been, and you did that with me, and I let you.',
    ],
  },

  let_it_go: {
    name: 'She let it go',
    mods: { heart: +2, name: -1 },
    line: 'she had it in her hand and she put it down, and the ones who were waiting to see have told everyone.',
    she: [
      'I let it go. They think I could not. Let them. I know what it took and there is nobody I can tell, except you.',
      'I had it. It was mine to take and everyone knew it was mine to take and I put it down, and the putting-down cost me more than the taking ever would have, and it bought me nothing anyone can see, and I would do it again, and I am telling you because you are the only one who knows it was a choice and not a failure of nerve.',
      'They read it as weakness, my letting it go. I have let them. It is the cheapest coin I have, their misreading, and I spend it freely, and only you and I know that the strongest thing I did that year was the thing they filed under could not.',
    ],
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

  // ──────────────────────────────────────────────────────────── WHAT YOU DID TO HER
  //
  // Your blessings live in HER SCAR LIST. Not in a separate golden panel — here, in among
  // the ruined hand and the fever that stayed, because that is honestly what they are:
  // things that happened to her, that she did not choose, that she cannot put down, and that
  // she can feel. She did not ask to be quick. You made her quick. She has opinions about it.

  blessed_hand: {
    name: 'A hand that is not hers',
    blessing: true,
    mods: { hand: +3 },
    line: 'she is faster than she has any business being, and she knows exactly when it started.',
    she: [
      'My hand is not mine. I want to be careful how I say this. It does what I want before I have finished wanting it, and I did not earn that, and I have not given it back.',
      'It is faster than thought now. I mean that plainly — the hand has moved and done the thing before the thought that ordered it has finished forming, and there is something frightening in being outrun by your own hand, even when it is winning.',
      'I have started hiding how quick I am. In a fight I let the first exchange look ordinary, because a hand this fast makes people ask questions, and there are no answers to those questions that do not end with them looking at me the way they look at me now.',
    ],
  },

  blessed_foot: {
    name: 'The road gave way',
    blessing: true,
    mods: { foot: +3 },
    line: 'the country has stopped arguing with her. she noticed the day it stopped.',
    she: [
      'The road is easy now. The road has never been easy. I have walked this country for eleven years and it has decided to let me.',
      'My feet find the ground before I set them down. I do not slip, I do not turn an ankle, the mud does not take me — it is as though the country has agreed to hold still under me, and it agreed the night you asked it to.',
      'I made forty miles yesterday and could have made more, and forty miles used to be two days and a limp, and I keep waiting to pay for it in the morning and the morning keeps not sending a bill.',
    ],
  },

  blessed_eye: {
    name: 'She sees it coming',
    blessing: true,
    mods: { eye: +3 },
    line: 'she has started seeing it a long beat before it happens, and she has stopped explaining how.',
    she: [
      'I see things before they happen now. Not visions. Just — early. I have stopped telling people, because of the way they look at me.',
      'The room tells me things it did not used to. Who is going to move, and where, a whole breath before they know it themselves. I read the flinch that has not happened yet. It is not magic. It only looks like magic to the ones about to lose.',
      'I caught a blade coming this week that I had no business catching — I was turned away, I could not have seen it — and my hand was already there, and I have stopped asking how, because the how is you, and asking it aloud frightens me.',
    ],
  },

  blessed_nerve: {
    name: 'She does not break',
    blessing: true,
    mods: { nerve: +3 },
    line: 'she has stopped being frightened of things that should frighten her, and the people around her have noticed before she has.',
    she: [
      'I am not afraid. Of anything. I have tested it and I could not find the bottom of it and I am telling you because I think you should know what you have done.',
      'The fear is just gone. I reach for it the way you reach for a tooth that has been pulled, and there is only the smooth place where it was, and I do not entirely trust a woman with no fear, and the woman is me.',
      'I walked toward a thing this week that every sense told me to run from, and I felt nothing, no lurch, no cold, and I did the brave thing easily, too easily, and I have started to wonder whether what you took was the fear or the wisdom, because out here they were the same organ.',
    ],
  },

  kept_it: {
    name: 'The thing she knows',
    mods: { eye: +1, heart: -1 },
    line: 'she worked something out and told nobody, and it has been sitting in her ever since.',
    she: [
      'I know a thing that nobody else knows and it is the most valuable thing I own and I cannot spend it or put it down.',
      'I kept it. Whatever it cost to keep, I kept it, and it sits in me now like a stone swallowed, valuable and heavy and mine, and there are nights I would give a great deal to be rid of the knowing, and I keep it, because letting it out would cost more than carrying it, and I have measured both.',
      'There is a thing I worked out and told no one, and the not-telling has become its own habit, its own muscle, and I am better in a room for it — I give nothing away now, nothing — and a little colder, and those, as ever, turn out to be the same fact.',
    ],
  },

  // ─────────────────────────────────────────────────────── THE ONE WARM MARK
  //
  // Everything else in this file is a scar or a blessing — a thing done TO her from the
  // outside. This one is a thing she SAW. She looked at the listener and it looked back, and
  // that does not come off, and it does not fade, and it is the only mark in the game that is
  // pure gain — because being seen, once, all the way, is the thing she stopped believing she
  // would ever get. It steadies her (she has looked at something bigger than the thing that
  // is counting), and it isolates her a little further, because now she carries a certainty
  // nobody else on the road will ever share.
  seen_you: {
    name: 'She has seen you',
    blessing: true,
    mods: { nerve: +1 },
    line: 'she looked at the thing that has been listening, and it looked back, and whatever else is taken from her now, that cannot be.',
    she: [
      'I have seen you. I am not going to try to describe it and I am not going to let anyone ask. I could not stop believing now if I set out to, and some nights, God help me, I have set out to.',
      'They can take everything else. The kit, the coin, the years, the people — all of it can go, all of it has gone before. But I have seen you, and that is the one thing in me that is past the reach of any of them, and I hold it on the nights everything else is being taken.',
      'I do not need faith any more, about you. Faith is for the unproven. I stood in front of you and you looked back and now it is not faith, it is memory, and memory is the one possession they have never once managed to rob me of.',
    ],
  },
};

export const MARK_KEYS = Object.keys(MARKS);
