// WHAT SHE BECOMES.
//
// Traits are EARNED, never bought. The old design let her pay a school for a skill,
// and that was a shop — a shop is the wrong verb for a life. These come from what she
// actually did, in the quantity she actually did it, and she cannot choose them and
// neither can you.
//
// Every trait costs something. A woman who has survived nine bad fights is better in a
// fight and worse with people, and she did not get to pick which half of that she
// wanted. That is what makes it growth rather than a levelling curve.
//
//   when   — the threshold on `lived`, the ledger of what she has actually done
//   gives  — the effect. read by the sim.
//   costs  — the other half. there is always another half.
//   line   — the record. third person, because the world sees it before she does.
//   she    — what she says to YOU about it. she is the one who notices.

export const TRAITS = {
  hardened: {
    when: (l) => l.hurt_badly >= 5,
    name: 'Hardened',
    gives: { swing: +0.35 },
    costs: { sociable_drift: -0.10 },
    line: 'she has been beaten enough times that it has stopped being an event. it is a Tuesday.',
    she: 'I do not flinch any more. I used to flinch. I am aware that I have lost something and I cannot make myself want it back.',
  },

  roadwise: {
    when: (l) => l.travelled >= 12,
    name: 'Roadwise',
    gives: { travel_cost: -0.5, travel_wound: -0.6 },
    costs: {},
    line: 'she has crossed enough country to read it. she knows which roads lie and she stopped taking them.',
    she: 'I can tell what a place is before I am in it now. It is not a gift. It is just miles.',
  },

  practiced: {
    when: (l) => l.worked >= 18,
    name: 'Practiced',
    gives: { earn: +0.35 },
    costs: {},
    line: 'she is good at this now. properly good, in the way that gets you asked back.',
    she: 'I have got good at this. I would like the record to show that I did not want to.',
  },

  known: {
    when: (l, s) => s.attention >= 18 || l.defied >= 8,
    name: 'Known',
    gives: { standing_speed: +0.8 },
    costs: { attention_rate: +0.5 },
    line: 'people know her name in towns she has never been to. some of them are pleased about it.',
    she: 'They know me. I did not build that on purpose and I cannot put it down.',
  },

  haunted: {
    when: (l) => l.buried >= 1,
    name: 'Haunted',
    gives: { danger_weight: +0.5 },
    costs: { reckless_drift: +0.12 },
    line: 'she buried someone. she has not been careful since, and she would tell you she has.',
    she: 'I keep the pace up. If I stop I will have to think about it, so I do not stop.',
  },

  steady: {
    when: (l) => l.with_someone >= 50,
    name: 'Steady',
    gives: { heal: +0.10 },
    costs: { danger_weight: -0.2 },
    line: 'she has had somebody at her back for long enough to sleep properly. it shows in her hands.',
    she: 'I sleep now. Both eyes. I did not know I had stopped.',
  },

  alone: {
    when: (l) => l.nights_alone >= 130,
    name: 'Alone',
    gives: { swing: +0.15 },
    costs: { sociable_drift: -0.14, heal: -0.04 },
    line: 'she has been on her own so long that company has started to feel like a debt.',
    she: 'I am better on my own. I have tested it. I am telling you the result, not the feeling.',
  },
};
