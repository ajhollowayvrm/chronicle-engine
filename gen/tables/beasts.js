// WHAT SHE FIGHTS.
//
// ─────────────────────────────────────────────────────────────────────────────
// THERE ARE NO DRAGONS IN THIS FILE, AND THAT IS THE WHOLE POINT.
//
// A stock bestiary — dragon, troll, lich — would be a table of monsters dropped into a
// world that has no reason to contain them. It would be legible immediately and it would
// make the seed engine stop paying for itself: the same wyrm would turn up in the salt
// desert, the refinery country and the drowned forest, and none of the three would be able
// to say where it came from.
//
// So a beast is rolled out of the tree, exactly the way an item is. It is made of THIS
// world's fuel, THIS world's dead god, THIS world's magic and the price that magic charges.
// The horror is not that there is a monster. It is that the monster is downstream of
// something the player already read about in the economy.
//
//   A country that burns godash — refined divine remains — to run its trains gets a thing
//   that came back up out of the refinery. It is not a demon. It is the fuel, and it
//   remembers.
//
// ─────────────────────────────────────────────────────────────────────────────
// AND ONE OF THEM IS THE DRAGON.
//
// Every world has exactly one GREAT beast: the largest fact in it, standing up and walking
// around. It is not scaled to her. It does not wait for her to be ready. Most women who go
// after it die, and the chronicle says so, and there is no second attempt because there is
// no second life. That is what makes killing one mean anything at all.
//
// FIELDS
//   needs  — the world fact this kind is made OF. no fact, no beast.
//   power  — how hard. measured against her hand, her nerve and what she is carrying.
//   asks   — the stat it punishes hardest. a thing that is quick is not a thing that is strong.
//   name   — what people call it. built from the fact.
//   what   — one line. cites the fact, so the player can trace it back to the economy.

export const KINDS = {
  // ── THE ORDINARY ANSWER, and the most common one. Most of what kills people is people.
  men: {
    needs: 'faction',
    power: [2, 4],
    asks: 'hand',
    worth: [40, 110],
    name: (f, roll) => roll.pick([
      `the men ${f.who} keep`,
      `${f.who}'s collectors`,
      `the company out of ${f.where}`,
    ]),
    what: (f) => `men. ${f.who} pay them, and nobody at ${f.where} will say for what. it is not a monster and it will kill her exactly as dead.`,
  },

  // ── THE SEAM. The fuel is finite, the fuel is being dug, and something in the dig is
  //    wrong. This is the one that indicts the whole economy.
  seam: {
    needs: 'fuel',
    power: [4, 7],
    asks: 'nerve',
    worth: [140, 320],
    name: (f, roll) => roll.pick([
      `what came up with the ${f.what}`,
      `the thing in the ${f.what} seam`,
      `the ${f.what}-drowned`,
    ]),
    what: (f) => `${f.where} runs on ${f.what}${f.gloss ? ` — ${f.gloss}` : ''}. they dug too far along the seam and something came up with the last of it. the diggers knew first. nobody asked the diggers.`,
  },

  // ── THE WORKS. A machine that was never switched off, in a country that has forgotten
  //    how to build one.
  works: {
    needs: 'machine',
    power: [3, 6],
    asks: 'eye',
    worth: [110, 260],
    name: (f, roll) => roll.pick([
      `the engine that did not stop`,
      `the long machine at ${f.where}`,
      `whatever is still running under ${f.where}`,
    ]),
    what: (f) => `at ${f.where}, ${f.what}. one of them has been running without anybody attending it for longer than anybody has been alive, and it has started coming out to be attended.`,
  },

  // ── THE PRICE, WALKING. Every magic in this engine is forced to name what it takes.
  //    This is what happens to the people who paid it and went on paying.
  cost: {
    needs: 'magic',
    power: [4, 7],
    asks: 'nerve',
    worth: [130, 300],
    name: (f, roll) => roll.pick([
      `the ones who paid for ${f.who}`,
      `what ${f.who} leaves behind`,
      `the ${f.who}-spent`,
    ]),
    what: (f) => `${f.who} charges a price and the price is not a secret: ${f.what}. these are the people who kept paying it. they are still paying it. they are still, in the technical sense, people.`,
  },

  // ── THE GOD'S LEAVINGS. Not the god. What the god left, or what is wearing it.
  relict: {
    needs: 'god',
    power: [5, 8],
    asks: 'nerve',
    worth: [180, 400],
    name: (f, roll) => roll.pick([
      `a thing that answers to ${f.who}`,
      `${f.who}'s left hand`,
      `what is wearing ${f.who}'s name`,
    ]),
    what: (f) => `${f.who} is ${f.what}. this is not ${f.who}. this is something that got in afterwards and has been using the name, and the people who pray at ${f.where} have not been told the difference.`,
  },

  // ── THE EXCEPTION, DEFENDED. A place is an exception because somebody is holding it
  //    down, and the holding is done with something.
  keeper: {
    needs: 'gap',
    power: [4, 7],
    asks: 'hand',
    worth: [150, 330],
    name: (f, roll) => roll.pick([
      `the thing that keeps ${f.where}`,
      `what ${f.where} does not talk about`,
      `the keeper at ${f.where}`,
    ]),
    what: (f) => `${f.where} is an exception, and this is why: ${f.what}. an exception has to be held down by something, and this is the something, and everybody at ${f.where} knows and nobody says.`,
  },
};

// ══════════════════════════════════════════════════════════════════════ THE GREAT ONE
//
// One per world. It is not a bigger version of the above — it is the world's single largest
// fact, standing up. It does not scale to her, it does not wait, and it is worth a fortune
// because the men offering the fortune have already paid four other people who did not come
// back.
export const GREAT = {
  power: [9, 12],
  worth: [900, 2200],

  // WEIGHTED, NOT RANKED. A strict order made every world's great beast the same kind —
  // eighty worlds, eighty relicts. The deepest and most damning facts are LIKELIER to stand
  // up and walk; they are not certain to. And it is never `men`: the worst thing in a
  // country can be its people, and that is not a thing you go and kill.
  weights: { seam: 4, relict: 3, cost: 3, keeper: 2, works: 2 },

  name: (kind, f, roll) => roll.pick(
    kind === 'seam'
      ? [`the Deep ${f.what}`, `what is at the bottom of the ${f.what}`, `the last thing in the seam`]
      : kind === 'relict'
        ? [`the Wearer of ${f.who}`, `${f.who}, or what answers when you say it`, `the thing that took the name`]
        : kind === 'cost'
          ? [`the Whole Price of ${f.who}`, `what ${f.who} has been building`, `the sum of it`]
          : kind === 'works'
            ? [`the Great Engine at ${f.where}`, `the works that will not stop`, `what ${f.where} was really for`]
            : [`the Keeper of ${f.where}`, `the thing ${f.where} is built on`]
  ),

  // She is not told what it is. She is told what happened to the people who went before.
  rumour: [
    'four have gone after it that anybody can name. one came back and does not speak.',
    'the bounty on it has been raised twice this year, which tells her exactly how it is going.',
    'nobody at the posting will look at her while she reads it.',
    'they have stopped putting a number on the dead. that is not because the number is small.',
  ],

  // What she says when she has found it and has not yet gone in.
  before: [
    'I have found it. I want to tell you that I have found it and I want you to tell me not to.',
    'It is real. I have seen what it did and I have not seen it, and I would like to keep it that way, and I am not going to.',
    'Everyone who went before me is dead. I have their names. I have been reading their names.',
  ],

  // And after, if she lives, which is not the way to bet.
  after: [
    'It is dead. I am not going to describe it. I want you to know that I am not going to describe it because I cannot, and not because I will not.',
    'I killed it. Nobody is going to believe me and I find that I do not care, which surprises me.',
    'It is done. I have been sitting here since it stopped moving and I have not been able to stand up.',
  ],
};

// ══════════════════════════════════════════════════════════════════════ THE BOUNTY
//
// A bounty is not a quest board. It is a fact about a world with a price on it, and
// SOMEBODY IS PAYING — which is the same question this engine asks about everything else.
// Who pays for it, and what do they get if she dies trying?
export const POSTED = [
  'it is posted at {place}, and the price has been up since the spring, and it has not been taken.',
  'the notice at {place} is new. the last one is still on the board underneath it, with a line through the name.',
  '{who} are paying for it, and they will not say why they want it done, and the price is higher than the work.',
  'the posting at {place} has been amended twice. both times upward.',
  'nobody at {place} would tell her what happened to the last one who took it. that is an answer.',
  'the paper at {place} is weathered grey and the price is fresh black ink, painted over the old number, which was lower. they have given up hiding the desperation.',
  'there are four names on the posting at {place}, each struck through, and a space left below them, deliberately, for the fifth.',
  '{who} posted it and have not taken it down though the work is plainly killing whoever tries, which means they would rather burn strangers than send their own.',
  'the reward at {place} would keep a family a year. that is not what you pay for a job. that is what you pay to not have to think about a thing any more.',
  'the notice at {place} names no method and no advice, only the price and the place, and a posting that will not tell you how is a posting written by people who do not know either.',
  'they have started posting it in the next towns over from {place} as well, wider each month, the circle of the reward spreading like the circle of the fear.',
  'the innkeeper at {place} took the posting down when she asked about it, quickly, and would not give a reason, and put it back up after she left, which she saw through the window.',
  'the price at {place} is in {who}’s own seal, not the town’s, which means it is personal, which means it is worse than money, which means they will pay it and mean it.',
  'somebody has written a single word across the bottom of the posting at {place}, in a different hand, and the word is don’t, and it has not been scrubbed off.',
  'the bounty has been open so long at {place} that the townsfolk have stopped seeing the notice, the way you stop seeing a grave you pass daily, and that is its own kind of verdict on the odds.',
];

// She takes a bounty because she needs the money, or because she is the kind of woman who
// takes bounties, and she has stopped pretending those are different.
export const TOOK = [
  'I have taken it. I need the money. That is the whole of the reason and I would like it written down as the whole of the reason.',
  'I took it down off the board myself. Everyone watched me do it. I have not decided how I feel about being watched.',
  'I said yes. I am aware of what happened to the last one. I said yes anyway and I am not going to pretend I do not know why.',
  'I signed. The clerk looked relieved and then looked guilty about being relieved, and I have been thinking about that second look since.',
  'I took the money up front. You are not supposed to be able to, for this kind of work, and they let me, which told me more about my odds than the posting did.',
  'It is mine now. I have taken worse for less. I keep telling myself that. It is even true. It is not as comforting as true things are supposed to be.',
  'I put my name where the four struck-through names are. Fifth. I did it in a steady hand, on purpose, so that whoever reads it after knows I was not shaking when I chose this.',
  'I took it because somebody has to, and I have run out of reasons why it should not be me, which is not the same as having a reason why it should, and I know the difference, and I took it anyway.',
  'The whole room went quiet when I reached for it, and I liked the quiet, God help me, I liked being the one brave or stupid enough, and that is a bad reason and it was one of my reasons.',
  'I have taken it and I have already spent the reward in my head twice over, on things I need, and that is the trap of a big price — you spend it before you have earned it, and then you have to go and earn it, or admit you cannot.',
  'Yes. I took it. Do not — I know what you would say. I have said it all to myself on the walk to the board and I took it regardless, and I would rather you were with me on it than right about it.',
  'I took it the way you take a breath before going under. Not gladly. Because the alternative is worse. Because I have looked at the alternative for a long time and it is worse.',
];

export const REFUSED = [
  'I left it on the board. Somebody else will take it and somebody else will die of it, and I will have been sensible.',
  'Not this one. I have walked past it four times now and I am still walking past it.',
  'No. I read the odds off the struck-through names and the odds read no, and I have got old by listening to that particular arithmetic.',
  'I want the money. I want it badly. I do not want it as much as I want to still be here next month, and this once, those two wants got weighed against each other honestly, and the second one won.',
  'I left it. And I felt the room change when I put it back — a little less afraid of me, a little more like themselves — and I told myself I did not care, and I mostly do not.',
  'Not for that price. Not for any price, but especially not for that one, because a price that high is the town telling you exactly how likely you are to collect it.',
  'I walked away from it. There was a time I would not have, when I had less to lose or thought I did, and the fact that I can walk away now is either wisdom or the beginning of the end of me, and I have not decided which.',
  'Somebody else will take it. I know that. I know roughly who, even — there is always a hungrier or younger or more foolish one — and I have made my peace with not being them, and it took me years to be able to.',
  'I said no and I meant it and I have not looked back at the board, which is the trick — you cannot look back at the board, because the board is patient and you are hungry and the two of those left alone together will change your mind.',
  'No. I have carried enough. I know what taking that one would cost even if I won, and I have started counting the winning costs too, now, which is what surviving long enough teaches you.',
  'I left it for the same reason I have left the last three: I would like, for once, to die of something other than a job I took because the number was large. It is a small ambition. It is mine.',
  'Not this one. I cannot tell you exactly why — the eye sees something the words will not say — but I have learned that when the eye says no and the mouth cannot explain it, you listen to the eye, and I am listening.',
];
