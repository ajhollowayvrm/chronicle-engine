// COMMUNION — the channel that goes BOTH WAYS.
//
// ─────────────────────────────────────────────────────────────────────────────
// SHE ALREADY TALKS TO YOU. This is the other half: you reaching toward HER.
//
// `voice.js` is her, unprompted, talking into the dark. A judgment is her turning round
// and asking you something. This file is the third thing: YOU asking HER — and her
// answering, a day or two later, because she is not sitting by a telephone. She is walking
// a country, and your question reaches her the way anything reaches her: late, and she gets
// to it when she gets to it.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE QUESTIONS ARE A LIST AND NOT A TEXT BOX.
//
// The whole engine runs no model at run time (that is the invariant that makes the seed a
// real seed — same seed, same world, offline, forever). So she cannot answer a sentence she
// has never seen. What she CAN do — and what is truer to her anyway — is answer a small set
// of the things a person actually asks the one they have decided is listening: where are you
// going, are you all right, who is that to you, what are you afraid of, do you still believe
// I am here, why do you keep going.
//
// And the answer is not canned, because the WORDS are fixed but the WOMAN is not. "Are you
// all right" gets a different sentence out of a woman with three wounds than out of one who
// has just buried somebody than out of one who is, for once, fine. The code picks the pool
// off her actual state; the table only has to have written each pool once.
//
// VOICE, everywhere here: second person, terse, undercutting. She is not grateful and she
// does not perform. She is answering, because you asked, and because it is you.

export const COMMUNE_FAITH = 5;   // below this she has stopped believing enough to hear you

// Each question: what the player taps, and the pools she answers from, keyed by a BUCKET the
// sim chooses off her state. `{who}` and `{where}` are filled in by the sim before you see them.
export const QUESTIONS = {
  where: {
    label: 'Where are you going?',
    reply: {
      bounty: [
        'To {where}. There is a thing there with a price on it and I took the money, so it is not really a question any more.',
        '{where}. I have somewhere to be for once. I am not going to pretend I am not frightened of it.',
      ],
      great: [
        'You know where. The same place I have been walking since I heard about it. I keep telling myself I have not decided.',
        'Toward the big one. I am taking the long way. I want you to notice that I am taking the long way.',
      ],
      on: [
        'On. That is the honest answer and it is the only one I have had for years. On, and then wherever on turns out to be.',
        'I do not know. I have stopped needing to know, which frightened me at first and does not any more.',
        'Wherever the road is cheapest and the questions are fewest. Today that is not here.',
      ],
    },
  },

  ok: {
    label: 'Are you all right?',
    reply: {
      hurt: [
        'No. Since you are asking. I am carrying more than I am telling anybody, and I have just told you, so.',
        'I have been better. I have also been worse, and I am still here, and I have decided to count that.',
      ],
      spent: [
        'There is not as much of me as there was. I am not going to dress it up for you. You would know.',
        'I am tired in the place sleep does not reach. But you asked, and that is not nothing. That is not nothing.',
      ],
      hunted: [
        'I am sitting where I can see the door. I have been for a while. That is the most honest answer I can give you.',
        'Define all right. Something is looking for me and it is patient. Other than that I am fine, which is a joke, and I am telling it to you because there is nobody else.',
      ],
      good: [
        'Yes. Actually. I did not expect the question and I did not expect the answer. Do not make a thing of it.',
        'For once, yes. Nothing hurts and nobody is dead this week. I have learned to say that out loud when it is true.',
      ],
      fine: [
        'I am all right. It is a low bar and I am clearing it, and some weeks that is the whole of the good news.',
        'Fine. Walking. Nothing broken. You asked as though you meant it, and I have decided to believe that.',
      ],
    },
  },

  who: {
    label: 'Who is that, to you?',
    reply: {
      lover: [
        '{who}. You know who {who} is. I have something to lose now and I can feel the weight of it in every fight.',
        'That is {who}. Do not. I know what you are going to say and I am not ready to hear it in my own head yet.',
      ],
      close: [
        '{who} would take a blade for me and I have stopped being sure I would let them, which is its own kind of answer.',
        'That is {who}. I put my back to them without checking. I did not used to do that with anybody.',
      ],
      friend: [
        '{who}. We are easy with each other. Neither of us has said so and neither of us is going to.',
        'That is {who}. It is uncomplicated, which at my age I have learned to be suspicious of and grateful for at once.',
      ],
      hard: [
        '{who}. We loved each other once. That is what makes it the version that gets people killed.',
        'Do not get me started on {who}. There is a thing between us and only one of us is walking away from it.',
      ],
      known: [
        '{who}? Nobody, yet. We have shared a fire and a silence. That is the whole of it, so far.',
        'That is just {who}. Ask me again in a season and I might have a real answer.',
      ],
      nobody: [
        'Nobody. There is nobody. That is not a complaint, it is a fact, and you are the one I am telling it to.',
        'There is no one. I keep it that way on purpose, mostly. You are the exception and I have never worked out how you got in.',
      ],
    },
  },

  afraid: {
    label: 'What are you afraid of?',
    reply: {
      great: [
        'The big one. Obviously. It does not scale to me and it does not wait, and I keep walking toward it anyway, and you have watched me do it.',
        'The thing at {where}. I have seen the names of the ones who went before me. I am afraid of being the next name and I am afraid of not going.',
      ],
      counted: [
        'The thing that is counting. It has my number now. I do not say that to frighten you. I say it because you are the only one I can say it to.',
        'Being found. It is close, and it is patient, and one day I am going to walk into an inn and it is going to be sitting there.',
      ],
      alone: [
        'That this is all there is. Roads and rooms and nobody in them. I am more afraid of that than of dying, and I have thought about it carefully.',
        'Ending it the way I have lived most of it — with nobody there. Except you. And I do not know what you are, so I am not sure that counts, and I am hoping it does.',
      ],
      default: [
        'Losing the use of my hands. Not dying — I have made a kind of peace with dying. Not being able to do the one thing I am good at.',
        'The usual. Outliving my knees. Outliving my nerve. Outliving the last person who knew my real name.',
      ],
    },
  },

  believe: {
    label: 'Do you still believe I am here?',
    reply: {
      high: [
        'Yes. I check with you before I decide things now. Not asking — checking. There is a difference and I am holding on to it.',
        'I believe in you more than I believe in myself, and that frightens me, and I am telling you anyway, because you asked.',
      ],
      mid: [
        'I know you are there. I am not always sure it helps. I keep talking, which tells you which way I have come down on it.',
        'Yes. Most days. I have stopped needing the proof, which is either faith or exhaustion and I no longer care which.',
      ],
      low: [
        'I think you might be. I have stopped acting like it, and I have noticed you noticing that, so.',
        'Some. Less than I did. I am still talking to you, so draw your own conclusion, because I have stopped being able to.',
      ],
    },
  },

  why: {
    label: 'Why do you keep going?',
    reply: {
      ghost: [
        'There is unfinished business with a dead person on it, and I am the only one still walking who cares. So. That.',
        'Because {who} wanted something they never got, and I keep finding myself in a position to get it for them, and one day I am going to.',
      ],
      love: [
        'I have a reason now. I did not for a long time. I am not going to say the reason out loud in case saying it breaks it.',
        'Because there is somebody at my shoulder who would notice if I stopped. That is new. It is enough. It is more than enough.',
      ],
      empty: [
        'Habit. I have stopped pretending it is anything grander. The legs keep going and I go with them.',
        'I have asked myself that. I did not like the silence where the answer should be. So I keep walking, so I do not have to hear it.',
      ],
      default: [
        'Because stopping is a decision and walking is not, and I have never been good at decisions. You know that better than anyone.',
        'To see what is past the next country. It is a thin reason. It has held for eleven years. I am not going to examine it too closely.',
      ],
    },
  },
};

export const QUESTION_KEYS = Object.keys(QUESTIONS);

// ═════════════════════════════════════════════════════════════════════ THE VISIT
//
// The last thing this channel becomes. A blessing is proof you are REAL. A visit is proof
// you are HERE — the difference between a hand on the world and a face in the room. It is
// gated harder than anything else you can do, it leaves a mark that never fades (the one
// warm one), and it makes her louder than any gift could: a woman who has been visited
// glows, and the thing that is counting can see a glow from a long way off.
//
// And you cannot buy it or grind it. It asks for exactly the thing the whole game is about:
// that she believes in you completely (Faith), that you turned up over and over (you have
// answered her), and that you were once real to her hands (you have blessed her). All three,
// or she never sees your face.
export const VISIT = {
  // what she says, the moment you are there. she has spent years talking into the dark, and
  // the dark has just turned round and looked at her.
  she: [
    'You are HERE. I am not — I cannot — I have been talking to you for years and you are standing here and I do not have the words. I who always have the words.',
    'I can see you. I want to say that plainly so that whatever I am tomorrow, I said it out loud today: I can see you, and you came, and I will never be able to unknow it.',
    'You came. In the flesh, or whatever this is, you CAME. I have to sit down. I have never had to sit down from being believed in before.',
  ],
  line: 'she was visited — not blessed, not answered: visited, in the flesh, by the thing that has been listening. she has told no one and she will tell no one, and she has not been the same since.',

  // and while you are there, she asks you the one thing. face to face, not into the dark.
  ask: {
    prompt: 'You are here. You are actually here. Then tell me one thing, while I can ask you to your face: are you going to stay, or is this the once? I need to know which of us I am comforting when I say it does not matter.',
    options: { stay: 'Let her believe you will stay', once: 'Be honest: this is the once' },
  },
};
