// WHAT SHE IS, MEASURED.
//
// Nine numbers in three domains. Not a build — a PORTRAIT. You never spend a point,
// there is nothing to optimise, and she cannot be respecced.
//
//   THE BODY   what she can do          Body · Hand · Foot
//   THE WORLD  how she reads it         Eye · Tongue · Name
//   THE HEART  what she can carry       Nerve · Heart · Faith
//
// ─────────────────────────────────────────────────────────────────────────────
// TWO KINDS OF NUMBER, and the difference is the whole design.
//
// SKILLS grow by USE and never go back. She gets better at what she actually does and
// at nothing else. A woman who has walked four hundred miles has feet; a woman who has
// never drawn a knife does not have a hand, however long she has been alive.
//
// CONDITION moves BOTH WAYS. Heart and Faith are not skills — they are how much of her
// is left. Grief takes Heart. Being alone takes Heart. Company gives it back, slowly. A
// skill that only ever rises is a treadmill; a condition that can be spent is a person.
//
// FAITH is the one you touch. It rises when you answer her, and falls when she asks and
// you do not come. It IS the relationship, and everything about how she speaks to you
// and whether she takes your word reads off it. It is the only number in this game the
// player is directly responsible for, and it is the one that can be lost.

export const DOMAINS = {
  body:  { name: 'The Body',  blurb: 'what she can do' },
  world: { name: 'The World', blurb: 'how she reads it' },
  heart: { name: 'The Heart', blurb: 'what she can carry' },
};

export const STATS = {
  // ─────────────────────────────────────────────────────────── THE BODY
  body: {
    domain: 'body', kind: 'skill', name: 'Body',
    blurb: 'what she can take before she stops',
    does: 'how many wounds kill her, and how fast she closes',
  },
  hand: {
    domain: 'body', kind: 'skill', name: 'Hand',
    blurb: 'what she can do with a knife',
    does: 'which way a fight breaks',
  },
  foot: {
    domain: 'body', kind: 'skill', name: 'Foot',
    blurb: 'the road, and how much of it she can read',
    does: 'what a crossing costs her',
  },

  // ────────────────────────────────────────────────────────── THE WORLD
  eye: {
    domain: 'world', kind: 'skill', name: 'Eye',
    blurb: 'what she notices, and what she notices in time',
    does: 'what she turns up, and what she sees coming',
  },
  tongue: {
    domain: 'world', kind: 'skill', name: 'Tongue',
    blurb: 'what she can talk her way past',
    does: 'the law, and what a toll costs her',
  },
  name: {
    domain: 'world', kind: 'skill', name: 'Name',
    blurb: 'what her name is worth in a room she has not entered',
    does: 'how fast people take sides about her — and how fast she is found',
  },

  // ────────────────────────────────────────────────────────── THE HEART
  nerve: {
    domain: 'heart', kind: 'skill', name: 'Nerve',
    blurb: 'whether she holds',
    does: 'whether she panics, and how loud she is to the thing that is counting',
  },
  heart: {
    domain: 'heart', kind: 'condition', name: 'Heart',
    blurb: 'what she can carry, and how much of it is left',
    does: 'whether she can be close to anyone. it empties, and it does not refill on its own',
  },
  faith: {
    domain: 'heart', kind: 'condition', name: 'Faith',
    blurb: 'whether she still believes you are there',
    does: 'whether she takes your word — and whether she says anything to you at all',
  },
};

export const STAT_MAX = 20;
export const SKILLS = Object.keys(STATS).filter((k) => STATS[k].kind === 'skill');
export const CONDITIONS = Object.keys(STATS).filter((k) => STATS[k].kind === 'condition');

// RANKS. The number is for you; the sentence is for her. An idle game needs the digit
// going up — but "Hand 14" tells you nothing about a woman, and "there are not many
// people who would take her on purpose" does.
export const RANKS = {
  body: [
    [0, 5, 'she is not built for this and never was'],
    [6, 9, 'she keeps going, and it costs her every time'],
    [10, 13, 'she has been broken and set, and it held'],
    [14, 17, 'she does not get ill any more. she has forgotten that she used to'],
    [18, 20, 'you would have to kill her, and it would take a while'],
  ],
  hand: [
    [0, 5, 'she has held a knife. that is the whole of it'],
    [6, 9, 'she wins the ones she should win'],
    [10, 13, 'she is quick, and she has stopped announcing herself'],
    [14, 17, 'she does not fight fair and has stopped pretending she used to'],
    [18, 20, 'there are not many people who would take her on purpose'],
  ],
  foot: [
    [0, 5, 'she walks. everyone walks'],
    [6, 9, 'she knows which roads lie'],
    [10, 13, 'she can read a country before she is in it'],
    [14, 17, 'the road has stopped costing her anything it did not have to'],
    [18, 20, 'she has never once been lost, and does not believe in being lost'],
  ],
  eye: [
    [0, 5, 'she misses things. she knows she misses things'],
    [6, 9, 'she checks the room now, without deciding to'],
    [10, 13, 'she finds what other people have already given up on'],
    [14, 17, 'she sees it a beat before it happens, and has stopped explaining how'],
    [18, 20, 'nothing gets close to her that she has not already counted'],
  ],
  tongue: [
    [0, 5, 'she says the wrong thing, and knows it as it leaves her'],
    [6, 9, 'she can hold a room for a minute, which is usually enough'],
    [10, 13, 'she has talked her way out of two hangings and one marriage'],
    [14, 17, 'people believe her. she has stopped being pleased about that'],
    [18, 20, 'she could sell a man his own coat, and has'],
  ],
  name: [
    [0, 5, 'nobody has heard of her, which is the safest thing she owns'],
    [6, 9, 'they know her in three towns, and not always well'],
    [10, 13, 'her name gets to a room before she does'],
    [14, 17, 'people take sides about her before they have met her'],
    [18, 20, 'she cannot go anywhere quietly again, and she knows exactly what that cost'],
  ],
  nerve: [
    [0, 5, 'she goes to pieces, quietly, where nobody can see'],
    [6, 9, 'she holds. afterwards she shakes, and she hides that too'],
    [10, 13, 'she does not flinch, and cannot remember when she stopped'],
    [14, 17, 'she is calm in the way that frightens people'],
    [18, 20, 'she has looked at the thing that is counting, and did not look away'],
  ],

  // CONDITION. These read DOWNWARD — a low Heart is not a woman who has not trained,
  // it is a woman who has spent it.
  heart: [
    [0, 3, 'there is nothing left in her to give anybody. she is not cruel. she is empty'],
    [4, 7, 'she keeps people at the length of an arm, which is the length of a blade'],
    [8, 12, 'she can still be reached, if somebody is patient, and nobody is'],
    [13, 16, 'she loves people badly and often, and would deny both'],
    [17, 20, 'she has not been hurt enough yet to stop, and it is coming'],
  ],
  faith: [
    [0, 3, 'she has stopped believing anything is listening. she talks to herself now, and knows it'],
    [4, 7, 'she thinks you might be there. she has stopped acting like it'],
    [8, 12, 'she knows you are there. she is not sure it helps'],
    [13, 16, 'she checks with you before she decides. not asking. checking'],
    [17, 20, 'she trusts you more than she trusts herself, and that frightens her'],
  ],
};

export const rankOf = (stat, v) =>
  (RANKS[stat] ?? []).find(([lo, hi]) => v >= lo && v <= hi)?.[2] ?? '';

// The cost of the NEXT point. Rises with the level she is at, so early growth is
// visible and late growth is earned — the shape of every skill anybody has ever had.
// The twentieth point costs six times the fifth: a mastery is a life's work, a
// competence is a season.
export const toNext = (level) => Math.round(3 + Math.pow(level, 1.35));

// She notices when something in her changes. She is the one who says so, not the UI.
export const SHE_NOTICED = {
  body: [
    'I do not get ill any more. I noticed that, and then I noticed I had not noticed for a year.',
    'It closed in four days. It would have taken two weeks once.',
  ],
  hand: [
    'It was over before I decided to do it. That is new and I do not entirely like it.',
    'I am quicker than I was. I would rather have had the years.',
  ],
  foot: [
    'I knew what the country was going to do before it did it. I have no idea when that started.',
    'I have stopped being tired. That cannot be right, and it is.',
  ],
  eye: [
    'I saw him before he moved. I want to be clear that I did not think about it.',
    'I find things now. Other people have walked over the same ground and found nothing.',
  ],
  tongue: [
    'I talked my way out of it. I have started to enjoy that, and I am watching myself about it.',
    'They believed me. They should not have. I am getting good at the wrong thing.',
  ],
  name: [
    'A man in a town I have never been to knew what I was. I did not like it. I did not hate it either.',
    'They have started stepping aside. I did not ask for that and I am not giving it back.',
  ],
  nerve: [
    'I did not shake afterwards. I stood there and waited to shake and it did not come.',
    'I looked at it. Whatever it is that is counting — I looked straight at it and it was fine.',
  ],
};

// ─────────────────────────────────────────────────────────────────── CONDITION
// What it costs her to lose something, and what gives it back. These are the only
// numbers in the game that go DOWN, and they are the only ones that hurt.
export const HEART = {
  buried: -4,          // she buried somebody. this is the big one.
  left: -2,            // somebody walked out on her in the night
  alone_long: -1,      // a long stretch with nobody. slow, and it adds up
  company: +1,         // a quiet hour with somebody who stayed
  kindness: +1,        // she gave something away and it was received

  // she says it herself, when it moves
  lost: [
    'I have less of this than I had. I am not going to pretend otherwise to you.',
    'Something has closed. I felt it close.',
    'I am not going to be able to do that again. Not for a while. Maybe not.',
  ],
  gained: [
    'I laughed today. I want you to know, because it surprised me too.',
    'Something has opened up again. I am being careful with it.',
  ],
  empty: [
    'There is nothing left in me for anybody. I am telling you plainly so you stop trying.',
  ],
};

export const FAITH = {
  answered: +2,        // you came, and you answered
  answered_well: +1,   // and it went the way you said it would
  absent: -3,          // she asked, and you were not there
  neglect: -1,         // a long silence from you while she was in trouble

  lost: [
    'You did not come. I have stopped expecting you to.',
    'I am not asking any more. I want to be clear that this is a decision and not a lapse.',
    'I used to think you were helping.',
  ],
  gained: [
    'You were there. I noticed. I notice every time, which I have not admitted before.',
    'That was you. I felt it go the way you wanted it to go.',
  ],
  empty: [
    'I do not think there is anything there. I have thought that for a while. I am still talking, which tells you what I am.',
  ],
};
