// WHAT SHE IS, MEASURED.
//
// Six numbers. Not a build — a PORTRAIT. You never spend a point, there is nothing to
// optimise, and she cannot be respecced. They are simply what she is, and they move
// because of what she does.
//
// USE IS GROWTH. She gets better at what she actually does and at nothing else. A woman
// who has walked four hundred miles has feet; a woman who has never drawn a knife does
// not have a hand, however long she has been alive. This is the same rule the traits
// live under, and it is the whole reason the numbers mean anything: they are a RECORD
// OF HER LIFE, not a shopping trip.
//
// Not STR/DEX/CON. That is somebody else's game, and it would tell you nothing about
// her. These are the six things that actually decide whether she lives out here, and
// they are named the way she would name them: short, physical, Anglo-Saxon.
//
//   start  — rolled per woman, so two women in the same world are not the same woman
//   grows  — what she has to DO to move it
//   does   — what it changes. read by the sim, nowhere else.

export const STATS = {
  body: {
    name: 'Body',
    blurb: 'what she can take before she stops',
    grows: 'being hurt, and getting up',
    does: 'how many wounds kill her, and how fast she closes',
  },
  hand: {
    name: 'Hand',
    blurb: 'what she can do with a knife',
    grows: 'fighting, and surviving it',
    does: 'which way a fight breaks',
  },
  foot: {
    name: 'Foot',
    blurb: 'the road, and how much of it she can read',
    grows: 'crossing country',
    does: 'what a crossing costs her',
  },
  eye: {
    name: 'Eye',
    blurb: 'what she notices, and what she notices in time',
    grows: 'finding things, and looking for them',
    does: 'what she turns up, and what she sees coming',
  },
  tongue: {
    name: 'Tongue',
    blurb: 'what she can talk her way past',
    grows: 'refusing, arguing, and being believed',
    does: 'the law, and how fast people take sides about her',
  },
  nerve: {
    name: 'Nerve',
    blurb: 'whether she holds',
    grows: 'standing somewhere she should not be',
    does: 'how loud she is to the thing that is counting',
  },
};

export const STAT_MAX = 20;

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
  nerve: [
    [0, 5, 'she goes to pieces, quietly, where nobody can see'],
    [6, 9, 'she holds. afterwards she shakes, and she hides that too'],
    [10, 13, 'she does not flinch, and cannot remember when she stopped'],
    [14, 17, 'she is calm in the way that frightens people'],
    [18, 20, 'she has looked at the thing that is counting, and did not look away'],
  ],
};

export const rankOf = (stat, v) =>
  (RANKS[stat] ?? []).find(([lo, hi]) => v >= lo && v <= hi)?.[2] ?? '';

// The cost of the NEXT point. Rises with the level she is at, so early growth is
// visible and late growth is earned — the shape of every skill anyone has ever had.
// Tuned against a 400-day life. At 4 + level^1.55 a woman who fought every week for a
// year ended at Hand 9 — she had grown, but you could not WATCH her grow, and this is
// an idle game. The curve still bends hard: the twentieth point costs six times the
// fifth, so a mastery is a life's work and a competence is a season.
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
  nerve: [
    'I did not shake afterwards. I stood there and waited to shake and it did not come.',
    'I looked at it. Whatever it is that is counting — I looked straight at it and it was fine.',
  ],
};
