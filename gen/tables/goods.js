// WHAT SHE CARRIES.
//
// ─────────────────────────────────────────────────────────────────────────────
// AN ITEM IS NOT A STAT STICK. IT IS A THING SHE GOT SOMEWHERE.
//
// The old design had a shop, and `traits.js` already says why that was wrong: a shop is
// the wrong verb for a life. So the rules here are narrow and they are not negotiable:
//
// 1. ITEMS ARE ROLLED OUT OF THE TREE, NOT OUT OF A CATALOGUE. There is no Iron Sword +1
//    in this file and there never will be. A blade bought in a country whose seam is
//    bone-glass is a bone-glass blade; a writ is written in the local currency; a relic is
//    one of THIS world's magics and it charges THIS world's price, quoted. The tables
//    below hold SHAPES with holes in them. The world fills the holes. Same discipline as
//    the chronicle: authored once by a model, rolled by code forever, no key in the repo.
//
// 2. THE STAT GATE IS A DEMAND, NOT A LOCK. `asks: { hand: 11 }` does not mean she cannot
//    pick the thing up. She can pick anything up. It means that under the ask, the thing
//    USES HER — it is quicker than she is, it is heavier than she is, and it will get her
//    hurt, and she will say so. Over the ask, it gives what it gives. A greyed-out CANNOT
//    EQUIP is a lie the interface tells. "This knife is faster than I am" is true, and it
//    is the same number.
//
//    The demand is measured against the WOMAN — her stats and her marks — and never
//    against her kit. Otherwise a sword hands you the arm to swing it with.
//
// 3. PROVENANCE IS A FIELD. Every object records where it came from and off whom. This is
//    the entire reason to have objects at all: the coat a dead companion put on her is not
//    +1 Body, it is the coat, and when a betrayer takes the best thing she owns, the
//    chronicle can say which thing and who gave it to her.
//
// 4. IF IT CANNOT BE LOST IT IS NOT A POSSESSION. Everything here can be sold in a bad
//    month, handed over at a toll she cannot pay, given away, broken, taken off her, or
//    buried with the person who gave it to her.
//
// ─────────────────────────────────────────────────────────────────────────────
// FIELDS
//   asks    — { stat: level }. the demand. under it, the thing uses her.
//   gives   — effect keys, summed with traits and her calling (see sim.bonus)
//   mods    — stat deltas, but ONLY while she can actually use it
//   strains — the act it makes worse when she is under its demand
//   only    — a calling. a thing she has no right to carry is dead in her hands, and loud.

// ───────────────────────────────────────────────────────────────────── THE SHAPES
export const SHAPES = {
  blade: {
    slot: 'blade',
    asks: 'hand',
    noun: 'knife',
    stock: 'metal',
    strains: 'danger',
    words: ['knife', 'blade', 'short sword', 'razor', 'cleaver', 'falling-knife', 'boarding axe'],
    // a knife is a knife. what changes is whether she is fast enough for it.
    tiers: [
      { at: 0, ask: 0, gives: { swing: +0.10 }, worth: [18, 40], adj: ['plain', 'worn', 'honest'] },
      { at: 1, ask: 9, gives: { swing: +0.30 }, worth: [70, 140], adj: ['good', 'balanced', 'quiet'] },
      { at: 2, ask: 13, gives: { swing: +0.55, attention_rate: +0.2 }, worth: [180, 340], adj: ['wicked', 'famous', 'unkind'], only: ['knife', 'widow'] },
    ],
  },

  coat: {
    slot: 'coat',
    asks: 'body',
    noun: 'coat',
    stock: 'worn',
    strains: 'travel',      // armour you cannot carry is a punishment on the road
    words: ['coat', 'jack', 'mail shirt', 'brigandine', 'road-coat'],
    tiers: [
      { at: 0, ask: 0, gives: { soak: +0.08 }, worth: [20, 45], adj: ['patched', 'thin', 'borrowed'] },
      { at: 1, ask: 9, gives: { soak: +0.20, heal: +0.03 }, worth: [80, 160], adj: ['heavy', 'good', 'lined'] },
      { at: 2, ask: 13, gives: { soak: +0.34, heal: +0.05, travel_cost: +0.2 }, worth: [200, 380], adj: ['proper', 'plated', 'unfashionable'] },
    ],
  },

  boot: {
    slot: 'boot',
    asks: 'foot',
    noun: 'boots',
    stock: 'worn',
    strains: 'travel',
    plural: true,           // "a good waxed canvas boots" — no. boots are a pair of things.
    words: ['boots', 'road-boots', 'stiff boots', 'walking boots'],
    tiers: [
      { at: 0, ask: 0, gives: { travel_cost: -0.10 }, worth: [12, 30], adj: ['old', 'split', 'serviceable'] },
      { at: 1, ask: 8, gives: { travel_cost: -0.30, travel_wound: -0.25 }, worth: [50, 110], adj: ['good', 'hard-soled', 'quiet'] },
      { at: 2, ask: 12, gives: { travel_cost: -0.50, travel_wound: -0.45 }, worth: [140, 260], adj: ['made-to-measure', 'faultless'] },
    ],
  },

  glass: {
    slot: 'glass',
    asks: 'eye',
    noun: 'glass',
    stock: 'clear',
    strains: 'find',
    words: ['glass', 'lens', 'looking-glass', 'reading glass', 'set of glasses'],
    tiers: [
      { at: 0, ask: 0, gives: { find: +0.10 }, worth: [25, 60], adj: ['scratched', 'cheap'] },
      { at: 1, ask: 10, gives: { find: +0.30 }, worth: [90, 190], adj: ['ground', 'true'] },
      { at: 2, ask: 14, gives: { find: +0.55 }, worth: [220, 400], adj: ['perfect', 'illegal'], only: ['finder', 'pathbreaker'] },
    ],
  },

  // A WRIT. The most underrated object in the game: it is the law, on paper, in her
  // pocket. It is written in the local currency and under a local seal, and outside the
  // reach of the thing that sealed it, it is a piece of paper.
  token: {
    slot: 'token',
    asks: 'tongue',
    noun: 'writ',
    strains: 'law',
    words: ['writ', 'seal', 'letter of passage', 'stamped chit', 'bond'],
    tiers: [
      { at: 0, ask: 0, gives: { toll: -0.10 }, worth: [30, 70], adj: ['expired', 'forged, badly'] },
      { at: 1, ask: 10, gives: { toll: -0.30, standing_speed: +0.2 }, worth: [110, 220], adj: ['good', 'countersigned'] },
      { at: 2, ask: 13, gives: { toll: -0.55, standing_speed: +0.4, earn: +0.15 }, worth: [260, 460], adj: ['irrefutable', 'terrifying'], only: ['voice', 'broker', 'banner'] },
    ],
  },

  // THE RELIC. It is one of this world's magics, and it charges this world's price —
  // quoted, from the tree, in the words the seed already wrote. `validate.js` forces every
  // magic type to name a cost, and this is the system that finally makes somebody pay it.
  //
  // NERVE is the ask, because the thing is not heavy. It is loud.
  relic: {
    slot: 'relic',
    asks: 'nerve',
    noun: 'working',
    strains: 'danger',
    magical: true,
    words: ['working', 'charm', 'piece', 'instrument'],
    tiers: [
      { at: 1, ask: 9, gives: { swing: +0.25, find: +0.20, attention_rate: +0.4 }, worth: [150, 300], adj: ['small', 'unfinished'] },
      { at: 2, ask: 13, gives: { swing: +0.45, find: +0.35, soak: +0.15, attention_rate: +0.8 }, worth: [340, 700], adj: ['whole', 'unwise'], only: ['counted', 'finder'] },
    ],
  },
};

// ────────────────────────────────────────────────────────────────── THE MATERIAL
//
// THE SEAM UNDER THE TOWN IS WHAT THE TOWN MAKES THINGS OUT OF — but only when you can
// honestly make the thing out of it. The first cut of this file took the first word of
// `economy.resources` and put it in front of the noun, and the world duly produced A
// FAMOUS OATHS FALLING-KNIFE and a fur short sword. You cannot forge a knife out of an
// oath. That is not a rounding error, it is the generator lying about the world.
//
// So the seam shows through WHERE IT CAN. A country that lives on iron makes iron blades;
// a country that lives on furs makes fur coats and buys its steel in; a country that lives
// on oaths makes neither, and its knives are whatever its works can turn out. This is a
// short closed mapping and not a curated catalogue: what it does is refuse to lie. If a
// future seed mints a resource nobody listed here, it falls back, and the fallback is
// always true.
const SEAM = {
  metal: { iron: 'iron', salvage: 'salvage steel', godash: 'godash-black steel' },
  worn: { furs: 'fur', salvage: 'salvage-leather' },
  clear: { amber: 'amber', salt: 'salt-glass' },
};

// What a country makes a thing out of when the ground under it is no help.
const FALLBACK = {
  metal: {
    1: ['bone', 'flint'], 2: ['grey iron', 'bog iron'], 3: ['good steel', 'valley steel'],
    4: ['mill steel', 'rolled steel'], 5: ['works steel', 'proofed steel'],
    6: ['furnace steel', 'crucible steel'], 7: ['old-works steel', 'serial-numbered steel'],
  },
  worn: {
    1: ['hide'], 2: ['hide', 'boiled leather'], 3: ['boiled leather'], 4: ['oiled canvas'],
    5: ['waxed canvas'], 6: ['mill cloth'], 7: ['works cloth'],
  },
  clear: {
    1: ['horn'], 2: ['horn', 'poured glass'], 3: ['poured glass'], 4: ['ground glass'],
    5: ['ground glass'], 6: ['true glass'], 7: ['works glass'],
  },
};

const clampTier = (t) => Math.max(1, Math.min(7, t ?? 3));

// The first word of the seam, which is the only part of it you could hold.
export const matter = (resources) =>
  String(resources ?? '').trim().split(/[\s,—]+/)[0].replace(/[^\w'-]/g, '').toLowerCase();

export function material(roll, stock, resources, tier) {
  if (!stock) return null;
  const seam = SEAM[stock]?.[matter(resources)];
  return seam ?? roll.pick(FALLBACK[stock][clampTier(tier)]);
}

// "a unfinished Emberment working" shipped for about ten minutes and it was the only thing
// anybody would have noticed.
export const an = (word) => (/^[aeiou]/i.test(String(word)) ? 'an' : 'a');

// ───────────────────────────────────────────────────────────────── HOW SHE GOT IT
// Provenance, as a sentence. This is the field that makes an object hurt to lose.
export const FROM = {
  bought: (where) => `bought at ${where}`,
  found: (where) => `dug out of the ground at ${where}`,
  taken: (where) => `taken off somebody at ${where}, who did not need it any more`,
  given: (who, where) => `${who} gave it to her at ${where}`,
  favour: (faction, where) => `${faction} put it in her hand at ${where}, and smiled`,
  buried: (who) => `it was ${who}'s, and she did not put it in the ground with them`,
};

// ─────────────────────────────────────────────────────────────────── WHAT SHE SAYS
// She is the one who notices, not the interface. Never the numbers — the weight of it.
export const OF_KIT = {
  // it is over her, and she knows exactly by how much
  strains: [
    'It is faster than I am. I know that. I am carrying it anyway and I would like that noted.',
    'This thing was made for a better hand than mine. I have started to resent it.',
    'I am not big enough for it. I have been telling myself I will grow into it, which is a thing children say.',
    'It uses me. That is the honest way round of it. I do not use it, it uses me, and it gets me hurt in the using, and I keep it, because a thing that is too good for you is still better than a thing that is not good enough.',
    'Every time I reach for it there is a half-beat where it is quicker than my hand and the half-beat is where a woman my age gets killed, and I know that, and I have not put it down.',
    'It is heavier than I have the back for, and I feel the weight of it in my shoulders at the end of a day, and in my sleep, and I am carrying more than I can carry and calling it being well-equipped.',
    'I am overmatched by my own kit and there is a grim joke in that somewhere. The thing that is supposed to save me is a little beyond me, so it is one more thing I am managing, one more thing that could turn on me, and I chose it, so I cannot even be angry.',
  ],
  // she has finally caught up to a thing she was carrying badly
  caught_up: [
    'It stopped fighting me. I noticed the day it stopped and I have not told anyone.',
    'I can use it now. It took a year and I would rather not talk about the year.',
    'We have come to an understanding, the thing and I. It took long enough, and cost enough, and now it does what I ask, and I did not so much master it as outlast its resistance.',
    'It fits my hand at last. Not because it changed — because I did, slowly, without noticing, until one day the thing that was too much for me simply was not, and I have grown into it the way children swear they will and mostly do not.',
    'I stopped being afraid of it. That is what caught up, really. Not skill — nerve. I trust my hand with it now, and the trust was the last piece, and it was the piece that took the longest.',
  ],
  bought: [
    'I bought it. I have not spent money on myself in a long time and I am being strange about it.',
    'It cost more than I have ever spent on anything and I have not stopped checking it is still there.',
    'I paid full price and did not haggle, which is not like me, and I think I did not haggle because I wanted, for once, to simply deserve a good thing without also winning the argument about it.',
    'I have wanted one this good for years and always talked myself out of it, and today I did not, and I keep waiting to feel foolish about the money and instead I feel like a person who is allowed things.',
    'It is the first thing I have owned that nobody died for and nobody gave me and I did not pry out of the ground. I just — bought it. Like an ordinary person. I am absurdly proud of how ordinary it is.',
  ],
  given: [
    'They gave it to me. I have not worked out what I owe for that and I know they would say nothing.',
    'It was a gift. I do not do well with gifts. I keep turning it over looking for the hook and there is no hook and the no-hook is the thing I cannot get comfortable with.',
    'They put it in my hands and closed my fingers over it and would not take it back, and I have carried gifts lighter than the weight of being given something freely.',
    'Someone thought of me when they were not obliged to, and this is the proof of it, and I look at it more than it warrants, because proof that someone thought of me is rarer in my life than the thing itself.',
    'I did not earn it and they gave it anyway and I have decided to let that be all right, which is harder than it sounds for a woman who has paid for everything she owns twice over.',
  ],
  sold: [
    'I sold it. I needed to eat. I am aware of how that sentence sounds and it is still the sentence.',
    'It is gone. It was only a thing. I have been saying that all week.',
    'I took what they offered, which was half what it was worth, because a starving woman is not in a negotiating position and the buyer knew it and I knew he knew it.',
    'I sold it to a man who did not know what he had and I did not tell him, and that is the closest thing to satisfaction I got out of losing it, and it is a thin satisfaction.',
    'I let it go. I have let a lot go. There is a version of my life laid out in the shops of six countries, one good thing at a time, sold in one bad month after another, and I could nearly walk it backward by the trail.',
  ],
  lost: [
    'They took it. Of everything they could have taken.',
    'It is gone, taken off me, and it is not the worth of it I keep circling, it is that it was mine, and now it is being carried by someone who did nothing to earn it but be stronger than me that day.',
    'They took the good one. They always know the good one. I do not know how they always know the good one, but they took it, and left me the rest, which is its own kind of insult.',
    'Somebody is walking around out there with my thing, and every so often I picture it, and I have to make myself stop, because that picture is a road that only ends one way and I have promised myself I am done walking that particular road.',
  ],
  // she is carrying something she has no right to carry
  unsworn: [
    'I have no right to this and everyone who looks at it knows. I have not put it down.',
    'It is dead in my hands. A thing like this answers to a name I never took, and it can tell I never took it, and it gives me nothing but the looks of everyone who understands what it means that I am holding it.',
    'I carry it anyway. I know I should sell it. It is loud and useless and a kind of lie, a claim I have no right to make — and I have made a life of claims I had no right to, so it feels, if I am honest, a little like home.',
    'Every room reads it the moment I walk in: a thing only a sworn one may carry, carried by a woman who swore nothing. I have stopped explaining. There is no explaining it. There is only carrying it, and being looked at, and carrying it.',
  ],
};
