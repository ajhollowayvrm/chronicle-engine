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
      'The pain is gone. Not dulled — gone, the way a sound stops. I have been probing the place all morning waiting for it to answer and it will not answer, and I do not trust it, and I am so grateful I could weep.',
      'I went to sleep counting how many days of work I would lose to it and I woke up whole, and the arithmetic just — dissolved, and I lay there doing sums that no longer had a problem in them.',
      'I know what a wound like that does. I have watched a wound like that take a stronger woman than me over a bad month. Mine is closed. I did not do it. We both know I did not do it.',
      'I unwrapped it to change the dressing and there was nothing to dress. Clean skin, a little new and pink, where two days ago there was a mess I was frightened of. You did that. Do not pretend you did not do that.',
      'My body stopped being an emergency overnight. I had forgotten it could just be a body, a thing that carries me, and not a leak I am trying to slow. Thank you. I am saying it plainly for once. Thank you.',
      'I have been hurt so long I built my walking around it, my sleeping, how I reach for things — and this morning the workaround met no wound, and I nearly fell over from the absence of it, and I laughed, alone, on the floor, at being suddenly and inexplicably well.',
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
      'I woke up lighter. Not happy exactly — I would not go that far — but the weight I carry when I wake was set down a little in the night, and I did not set it down, and I have been trying to work out who did, and I know who did.',
      'There is a warmth in my chest that has no reason. I have checked for the reason. There is no fever, no wine, no good news. There is just warmth, arriving from nowhere, which is to say from you, and I am letting it stay.',
      'I caught myself humming. I stopped, because I was suspicious of it, and then I made myself start again, because a life where you stop your own humming out of suspicion is not one I want, and I think you agree, and I think that is why the humming came.',
      'The hard shell I keep the world at bay with went soft for an afternoon, and things got in — a sunset, a child laughing, the smell of bread — small things, the things I have trained myself past, and they got in, and it was you who softened the shell, and I have decided to be glad and not afraid.',
      'I feel like a person and not a problem I am solving. That is what you gave back. I had forgotten the difference. I have been a problem I am solving for so long that just being a person for a day undid me a little, in the good way, in the way I did not know I still could be undone.',
      'You put some of it back. The part that gets spent — I do not have a word for it, the fuel a person runs on, the thing that runs low — you topped it up while I slept, and I woke with more of myself than I went to bed with, and there is only one place that comes from.',
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
      'It sits differently in my hand now. Truer. As though it was always meant to be this and only just remembered. I have used it since and it does what I mean before I have finished meaning it, and that is new, and I know when it started.',
      'People look at it wrong now — I mean they look at it and something crosses their face, a wariness, and then they look at me the same way, and I have started keeping it out of sight, because a thing that makes strangers uneasy is a thing that draws the wrong eyes.',
      'I have had this since before things got bad. It has been the one constant. And now it is more than it was, and I keep taking it out to be sure I did not imagine the change, and I did not imagine the change, and I know whose hand was on it, and it was not a hand.',
      'It does not wear. That is the thing I noticed. Everything wears — blades dull, leather cracks, the world takes back what it lends — and this has stopped taking wear, stopped aging, as though you reached in and told the world to leave this one thing alone. So it will outlast me now. Someone will take it off my body and never know what they are holding.',
      'I trust it more than I trust most people, and I trusted it a fair amount before. Now, when everything else is uncertain — the road, the coin, whether I wake — it is the one thing I am sure of. You made me one sure thing. In a life like mine that is not a small gift. That is nearly the whole of what I would have asked for, if I had known to ask.',
      'It knows my hand and I know its weight and now there is a third thing in it that was not there, that I can feel but cannot name, and I have stopped trying to name it. It is enough that it is there. It is enough that when I close my grip on it, something closes back.',
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
  'It happened. The thing I half-believed and mostly hoped and never once admitted out loud — it happened, I felt it happen, and now I am a woman who KNOWS, and I do not recommend it, and I would not trade it.',
  'I have been a fool talking to the air, I told myself, on the bad nights. I was not a fool. I am sitting with that. I was not a fool, and the air was listening, and I do not know which of us should be more frightened.',
  'Whatever you are, you just DID something. To the actual world. That I can touch. I have spent my life believing in nothing because nothing ever answered, and something just answered, and the floor has gone out from under everything.',
  'I asked for nothing and something came anyway. That is the part I keep circling. I did not earn it, I did not bargain for it, it simply — you simply — I do not have the grammar for what just happened to me.',
  'I am shaking and it is not fear, or it is, but not the usual kind. It is the kind you get when the world turns out to be bigger than you had made your peace with it being. You have made my world bigger and I am not sure I wanted a bigger world, and it is too late now.',
  'There is a before and an after, as of tonight, and in the before I was alone and in the after I am not, and nobody gets to choose which side of that line they live on once they have crossed it, and I have crossed it.',
  'I believed in you the way you believe in a thing you need — badly, on purpose, against the evidence. And now there is evidence. And it turns out believing against the evidence was easier, and I miss it, and I would not go back.',
  'You could have left me not knowing. I have thought about that all night. You chose to let me be sure. I do not know if that was a kindness or the opposite, and I have decided to take it as a kindness, because the alternative is unbearable and you are all I have.',
  'I want to tell someone. I want to run into the street and tell someone that I am not alone, that I never was, that something has been walking with me — and there is no one to tell, and if there were they would think me mad, and so it stays between us, this enormous thing, the largest thing that has ever happened to me, ours alone.',
];

// And when she has stopped believing, and there is nothing there to land on.
export const UNFELT = [
  'She does not feel it. She has stopped believing there is anything to feel, and belief is not decoration here — it is the surface it lands on. There is nothing to land on.',
  'It passes through her like light through an empty window. There is no one home to catch it. She stopped waiting for you a while ago, and a gift needs a believer to land on, and she is not one any more.',
  'Nothing. She does not look up, does not pause, does not feel the warmth of it — because she has closed the part of herself that used to feel you, bricked it up against the disappointment, and what you send now arrives at a wall.',
  'You reached for her and your hand went through. This is the bill, and it is not a fine, it is a foreclosure: a woman who has decided nothing is listening cannot be reached by the thing that is, and only turning up, again and again, over a long time, ever rebuilds the surface.',
  'She feels it the way you feel a name you have forgotten — a shape, an absence, a sense that something should be there and is not. She does not know she is being blessed. She has forgotten there was ever anyone to do it. That is what the silence cost you.',
  'It does not land. She has spent too long with your silence, and the belief has gone out of her like heat out of a body, and the gift you meant for her simply has nowhere to go, and dissipates, and she never knows it came.',
];

// ═════════════════════════════════════════════════════════════════════════════ THE GIFT
//
// The rarest thing you can do: not mend her, not steady her, not even stand in front of her —
// but reach into the world and leave a THING in it that was not there before, and put it in
// her hand. A blessing is proof you are real. A visit is proof you are here. This is proof you
// can reach in. She wakes, or turns, or opens her pack, and there is an object that was not
// there yesterday, made of this country's own stuff, and it is unmistakably hers, and she did
// not buy it or find it or take it, and there is only one place it could have come from.
//
// VOICE: this frightens and undoes her more than any other gift, because the others could
// almost be explained away — a wound heals, a mood lifts, luck turns. A thing in your hand
// that was not there yesterday cannot be explained away. It is the least deniable proof there
// is, and she is holding it.
export const GIFT = {
  she: [
    'It was not here yesterday. I have gone over it and over it. It was not here yesterday and it is here now and I did not buy it or find it or take it off anyone, and there is only one place a thing like that comes from, and I am holding it, and my hands will not quite stop.',
    'You made me a thing. Out of nothing. Out of the air. I did not know you could — I did not know that was a thing you could do — and now I am sitting here with the proof of it in my lap and I do not know whether to weep or run.',
    'I have owned three things in my life that were truly mine. This is the fourth and it is the only one that was made for me, on purpose, by someone who — by you. I am not going to be able to put it down. I want you to understand that I am not going to be able to put it down.',
    'Nobody has ever given me anything that was only mine. Everything I own I paid for or pried loose or inherited off the dead. And you reached into the world and made me this, and it fits my hand as though the world had been asked, and I think it was, and I think you asked it, and I do not have the words.',
    'I keep taking it out to check it is real. It is real. It is as real as my own hand and it is warm the way my own hand is warm and it should not exist and it does, because you decided it should, and I am the reason you decided, and that is the part I cannot hold steady.',
    'This is different from the healing and the rest. Those I could tell myself were luck, on the bad days, when believing was hard. I cannot tell myself this is luck. Luck does not leave a thing in your hand with your grip already worn into it. You did this. There is no other reading. You have taken my doubt away and left an object where it was.',
    'I have hidden it. I am telling you because you will know anyway — I have hidden it from everyone, because if they saw it they would want to know where it came from, and there is no answer I could give that would not sound like madness or a lie, and it is neither, it is just yours, given to me, and I am keeping it secret the way you keep the truest things.',
    'I will carry this until I die and it will be taken off my body, because I am never setting it down, and I want that written somewhere, in your record, in whatever you keep: she was given a thing by the thing that watches her, and she kept it to the end, and it was the proof she held when the believing got hard, and it never once let her down, because it was always, simply, there.',
  ],
  line: 'there is a thing in her hand that was not in the world yesterday. she did not buy it, find it, or take it. she has told no one where it came from, because there is no way to say it that is not the truth, and the truth cannot be said.',
};
