// WHAT THEY CALL HER.
//
// ─────────────────────────────────────────────────────────────────────────────
// THIS IS THE CLASS SYSTEM, AND SHE DOES NOT PICK IT OFF A MENU.
//
// There are no levels in this game and there is no build screen, and the central claim of
// the whole design is that the player cannot move her directly. A class that you choose
// for her at level five deletes both of those in one afternoon.
//
// So: A CALLING IS A NAME THE WORLD HAS STARTED USING FOR HER.
//
// It arrives the way a reputation actually arrives — you find out that other people have
// been saying it for a while. And the requirement is HER STATS AND HER LEDGER, which is
// the only honest way to make a class "fit her stats": she is never offered a name her
// life does not already support. There is no list of nine things she is not. There is one
// name, and it is true, and the question is only whether she answers to it.
//
// Then she turns to you and asks. It is a `pending` judgment like any other, which means
// it goes through `answer()`, which means it is an input in the journal, which means the
// save and the replay work with no changes at all. And if you do not come, she decides
// alone, weighted by who she has become — the load-bearing mechanic, untouched.
//
// TAKING A NAME IS NOT FREE. It raises her Name, which is a liability (the thing that is
// counting finds a famous woman faster than a quiet one, and `sim.tick` has always known
// that). It makes factions decide about her. It changes what her days are made of —
// a Toll-Breaker is offered more chances to defy and more men who want her found. And she
// cannot put it back down.
//
// ─────────────────────────────────────────────────────────────────────────────
// FIELDS
//   needs    — effective stats. this is "the class must make sense for her stats", enforced.
//   lived    — the ledger. she cannot be called a thing she has not done.
//   when     — anything the ledger cannot say (a faction that has taken to her)
//   after    — the ladder. undefined: only if she answers to nothing yet.
//              a key: a promotion, and only from that one. '*': whatever she is now.
//   gives    — effect keys, summed with traits and kit (sim.bonus)
//   mods     — stat deltas, permanent, applied to the effective stat
//   weights  — what her days start being made of
//   opens    — items she now has the right to carry
//   factions — how the room reads it, by faction kind, the day she takes it

export const CALLINGS = {
  // ──────────────────────────────────────────────────────────────────── THE BODY
  knife: {
    name: 'the Knife',
    domain: 'body',
    needs: { hand: 11, nerve: 9 },
    lived: { fights: 10 },
    mods: { name: +2 },
    gives: { swing: +0.25, standing_speed: +0.3 },
    weights: { danger: +5, work: -3 },
    attention: +2,
    factions: { crime: +2, order: -1.5 },
    opens: ['knife'],
    world: 'they have started calling her the Knife. not to her face, yet, and not unkindly, and not entirely as a compliment.',
    prompt: 'They have a name for me in four towns now. The Knife. I have not corrected anybody and I have not agreed to anything. It is not nothing, to answer to a name. Do I let them have it?',
    took: 'All right. I am the Knife. I have been for a while and I was the last to hear it, which is how these things go.',
    refused: 'I told them my name. My actual one. They looked at me as though I had said something sad.',
  },

  walker: {
    name: 'the Walker',
    domain: 'body',
    needs: { foot: 12 },
    lived: { travelled: 18 },
    mods: { name: +1 },
    gives: { travel_cost: -0.35, travel_wound: -0.3 },
    weights: { travel: +5, rest: -2 },
    attention: +1,
    factions: {},
    opens: [],
    world: 'the carters know her. she is the woman who walks, and the roads have started being on her side.',
    prompt: 'The carters have a name for me. It is not a grand one. It is just what I do — I walk, and I get there. Is that a thing to be, or is that a thing that happened to me?',
    took: 'I am the woman who walks. It is not much of a name. It is the true one, which is more than most people get.',
    refused: 'I told them I was only passing through. I have been only passing through for eleven years.',
  },

  // ─────────────────────────────────────────────────────────────────── THE WORLD
  finder: {
    name: 'the Finder',
    domain: 'world',
    needs: { eye: 12 },
    lived: { found: 8 },
    mods: { name: +1 },
    gives: { find: +0.35, earn: +0.2 },
    weights: { find: +6, relic: +3, work: -2 },
    attention: +2,
    factions: { order: +0.5 },
    opens: ['finder'],
    world: 'people have started bringing her things and asking her what they are. she has started being right.',
    prompt: 'They bring things to me now. Broken things out of the ground, and they wait to see what I say about them. I could be that. I could be the woman they bring things to. I am asking because I want it and I do not trust that I want it.',
    took: 'They bring me things. I know what they are. I have stopped pretending to be surprised that I know.',
    refused: 'I told them I was nobody. They keep bringing me things anyway, and I keep looking at them, and I keep being right.',
  },

  voice: {
    name: 'the Voice',
    domain: 'world',
    needs: { tongue: 12, name: 8 },
    lived: { paid: 10 },
    mods: { name: +2 },
    gives: { toll: -0.3, standing_speed: +0.4, earn: +0.25 },
    weights: { law: +4, defy: +2, danger: -2 },
    attention: +2,
    factions: { order: +1.5 },
    opens: ['voice'],
    world: 'she is who they send for when it has to be said to somebody who does not want to hear it.',
    prompt: 'They send for me now, when it has to be said. I am good at it. I am good at it in a way that has started to worry me, because I am not always sure I believe the thing I am saying while I am saying it.',
    took: 'I speak for people now. I am careful about it. I am watching myself, and I am telling you that I am watching myself, so that one of us is.',
    refused: 'I told them to find somebody else. I could have talked them into anything and I talked them out of me.',
  },

  breaker: {
    name: 'the Toll-Breaker',
    domain: 'world',
    needs: { tongue: 11, nerve: 10 },
    lived: { defied: 8 },
    mods: { name: +3 },
    gives: { toll: -0.45, swing: +0.1 },
    weights: { defy: +7, law: -3, faction_hunted: +4 },
    attention: +5,
    factions: { order: -3, crime: +2.5 },
    opens: [],
    world: 'there is a word for her at the gate-houses now, and it is being passed between them in writing.',
    prompt: 'They have a name for me at the gates. It is not a name you can put down once you have picked it up — the men who use it write it in a book, and the book goes to other men. If I answer to this, I am answering to it in every country there is. Do I?',
    took: 'Then let them write it down. I want it in the book. I have wanted it in the book for a long time and I have only just admitted that to you.',
    refused: 'I have gone quiet. They will find somebody else to be angry at. I have never in my life been this sensible and I hate every hour of it.',
  },

  banner: {
    name: 'the Banner',
    domain: 'heart',
    needs: { name: 10 },
    lived: {},
    // The one thing the ledger cannot say: somebody has decided she is theirs.
    when: (s, sim) => sim.factionsHere().some((f) => sim.standing(f.name) >= 12),
    mods: { name: +2, nerve: +1 },
    gives: { earn: +0.3, heal: +0.05, standing_speed: +0.5 },
    weights: { faction_favour: +6, faction_shelter: +4, faction_hunted: +3 },
    attention: +3,
    factions: { order: +2, crime: +2 },
    opens: ['banner'],
    mark: 'sworn',            // she said the words out loud, in front of witnesses
    world: 'they have asked her to stand for them. out loud, in front of people, in a way that cannot be taken back.',
    prompt: 'They want me to stand for them. In front of everybody. They want the words said out loud. I have never belonged to anything and I have been proud of that, and I am not sure any more whether that is a principle or just what I am used to.',
    took: 'I said the words. I meant them. I want you to remember that I meant them, because I know how this kind of thing tends to end and so do you.',
    refused: 'I did not say the words. They were kind about it, and they have not asked me back, and they will not.',
  },

  // ───────────────────────────────────────────────────────────────── THE HUNTER
  // Not a brawler — the Knife is the brawler. This is the woman they send FOR the thing in
  // the hills that has a price on it and four dead names already. An eye that sees it coming
  // and a nerve that holds while it does.
  hunter: {
    name: 'the Hunter',
    domain: 'world',
    needs: { eye: 11, nerve: 10 },
    lived: { slain: 3, hunted: 4 },
    mods: { name: +2 },
    gives: { danger_weight: +0.2, swing: +0.15, find: +0.1 },
    weights: { board: +5, hunt: +3, danger: +2, rest: -2 },
    attention: +3,
    factions: { order: +1 },
    opens: [],
    world: 'they have stopped bringing the small jobs to her. it is the things with names now, and prices, and other people already dead.',
    prompt: 'They come to me for the bad ones now. The ones on the board that stay on the board. I am good at it — I am alive, which is the same thing in this line — and I want to know from you whether being good at killing the things people fear is a life or just a way of postponing my own.',
    took: 'I am the one they send. All right. I have killed things that emptied whole valleys and I walked back out, and I am going to keep doing it until one of them is faster, and I have made my peace with the shape of that sentence.',
    refused: 'I told them to find somebody else for the big ones. They will. Somebody worse at it than me, who will die doing what I would have lived doing. I think about that.',
  },

  // ────────────────────────────────────────────────────────────── THE OPEN HAND
  // The one calling the world gives her for what she GIVES. It is not soft — a woman known
  // for an open hand is a woman everyone comes to, and being everyone's is its own way of
  // being no one's.
  openhand: {
    name: 'the Open Hand',
    domain: 'heart',
    // Heart is a CONDITION — it moves both ways — so it cannot go in `needs`, which is only
    // ever measured against monotonic skills. It is a requirement all the same, checked the
    // day the name is offered: you cannot be called kind on an empty heart. If it drains
    // later, she keeps the name, which is its own quiet tragedy.
    needs: { name: 7 },
    lived: { gave: 6 },
    when: (s, sim) => sim.bare('heart') >= 11 && sim.off('generous') > 0.1,
    mods: { name: +2, heart: +1 },
    gives: { standing_speed: +0.3, heal: +0.03, earn: -0.1 },
    weights: { figure_meet: +4, faction_favour: +2, danger: -2 },
    attention: +2,
    factions: { order: +2, crime: +1 },
    opens: [],
    world: 'there is a word for her in the towns she has passed through, and it is a kind one, and she is not sure she has earned it or only failed to refuse it.',
    prompt: 'They have started calling me a kind woman. Me. I have given some things away, it is true, and now people arrive expecting it, and I cannot tell any more whether I am generous or just unable to say no to a face. Do I answer to it? A name like that is a debt you sign in front of witnesses.',
    took: 'All right. The open hand. I will keep it open. I want you to know it is not because I am good — it is because I found out what a closed one costs, on myself, and I would not wish it, and that is a worse reason and the only true one.',
    refused: 'I kept my hand where it was. They were disappointed in me, kindly, which is the worst way to be disappointed in. I can live with it. I have lived with worse.',
  },

  // ───────────────────────────────────────────────────────────── THE SECOND NAME
  // A promotion is not a bigger number. It is the same name, gone further than she meant
  // to take it — and every one of these costs her something she cannot get back.

  widow: {
    name: 'the Widow-Maker',
    domain: 'body',
    after: 'knife',
    needs: { hand: 16, nerve: 13 },
    lived: { fights: 30, buried: 1 },
    mods: { name: +3, heart: -2 },
    gives: { swing: +0.5, danger_weight: +0.4 },
    weights: { danger: +8, figure_meet: -4 },
    attention: +6,
    factions: { crime: +2, order: -3 },
    opens: ['knife'],
    world: 'nobody calls her the Knife any more. they have found a longer word for it, and they use it carefully.',
    prompt: 'The Knife was a young woman\'s name and I have outgrown it. They have a new one. It is not a name anybody says fondly. It is a name people say to warn each other, and I have earned every letter of it, and I do not know whether I am telling you that as a confession or as a boast.',
    took: 'It is the right name. That is the worst thing I have ever said to you and it is the truest.',
    refused: 'I would rather be the Knife. I am aware that is a distinction only I can see.',
  },

  pathbreaker: {
    name: 'the Pathbreaker',
    domain: 'body',
    after: 'walker',
    needs: { foot: 16, eye: 12 },
    lived: { travelled: 45 },
    mods: { name: +2 },
    gives: { travel_cost: -0.6, travel_wound: -0.5, find: +0.2 },
    weights: { travel: +6, find: +3 },
    attention: +2,
    factions: {},
    opens: ['pathbreaker'],
    world: 'she has been going where the roads are not, and the people who go after her have started calling it her way.',
    prompt: 'There is a crossing they have named after me. I did not do anything clever. I went, and it worked, and now other people go, and some of them will not come back, and it will still have my name on it.',
    took: 'It has my name on it. People will die on it. Both of those are going to be true for a long time after I am not.',
    refused: 'I asked them to call it something else. They will not. It is already on a map.',
  },

  broker: {
    name: 'the Broker',
    domain: 'world',
    after: 'voice',
    needs: { tongue: 16, name: 13 },
    lived: { paid: 15 },
    mods: { name: +3, heart: -1 },
    gives: { toll: -0.6, earn: +0.5, standing_speed: +0.6 },
    weights: { law: +5, faction_favour: +4, danger: -3 },
    attention: +4,
    factions: { order: +2.5, crime: +1 },
    opens: ['voice'],
    world: 'she does not speak for people any more. she decides which of them gets spoken for.',
    prompt: 'I am not talking for people now. I am choosing which people get talked for. That is a different job and nobody announced the change and I did not notice it happening. I could stop. I want you to tell me whether I should stop.',
    took: 'I am good at this. I have made four men rich and I have not decided yet whether I am one of the things they bought.',
    refused: 'I stepped back. I have watched who took my place, and they are worse, and I am not sure that absolves me.',
  },

  beastkiller: {
    name: 'the Beast-Killer',
    domain: 'world',
    after: 'hunter',
    needs: { eye: 13, nerve: 12, hand: 11 },
    lived: { slain: 5 },
    when: (s) => s.greatSlain || s.slain.length >= 6,
    mods: { name: +3, heart: -1 },
    gives: { danger_weight: +0.4, swing: +0.35, soak: +0.1 },
    weights: { hunt: +6, board: +4, danger: +4, figure_meet: -3 },
    attention: +5,
    factions: { order: +1, crime: +1 },
    opens: [],
    world: 'the Hunter was what they called her before she killed the one nobody was supposed to be able to kill. they have a heavier word for her now.',
    prompt: 'The Hunter was a name for a living woman doing a job. This new one is a name for what I did to the thing at the end of the valley, and it is not said fondly — it is said the way you say the name of a weather. I earned it. I do not know whether I am telling you that as a confession or a boast, and I have stopped being able to tell the difference, which may be the answer.',
    took: 'It is the right name. That is the worst true thing I have ever said to you. I go toward the ones that make grown men leave the country now, and I do not entirely remember choosing to become the kind of person who does.',
    refused: 'I would rather be the Hunter. It is a distinction I am aware only I can see, and I am holding on to it with both hands, which are not clean.',
  },

  shelter: {
    name: 'the Shelter',
    domain: 'heart',
    after: 'openhand',
    needs: { name: 11, tongue: 11 },
    lived: { gave: 14 },
    when: (s, sim) => sim.bare('heart') >= 14,
    mods: { name: +3, heart: +2 },
    gives: { standing_speed: +0.5, heal: +0.06, earn: -0.15 },
    weights: { faction_favour: +5, faction_shelter: +4, figure_meet: +3, danger: -3 },
    attention: +3,
    factions: { order: +3, crime: +2 },
    opens: [],
    world: 'she is not the woman who gives things any more. she is the place people go. they arrive at whatever town she is in the way water finds the low ground.',
    prompt: 'It has stopped being about a coin here and a coat there. People come to wherever I am now — hurt ones, hunted ones, ones with nothing — because the word has gone round that I will not turn them out. I could carry that, or it could bury me, and from the inside I genuinely cannot tell which is happening. Tell me whether to be the Shelter, knowing I will never again get to be only my own.',
    took: 'Then I am the Shelter. They can come. All of them. I gave up being only mine somewhere back down the road and I did not notice the day, and I am not going to spend what is left grieving a thing I would choose again.',
    refused: 'I stepped back from it. I watch who they go to instead, and it is nobody, and the nobody is on me now, and I have not worked out whether refusing was the selfish thing or the only sane one.',
  },

  // THE ONE THAT IS NOT A PROMOTION. It does not care what she was. It only cares that the
  // thing that has been counting has counted her, and that she looked straight back at it.
  counted: {
    name: 'the Counted',
    domain: 'heart',
    after: '*',
    needs: { nerve: 15 },
    lived: {},
    when: (s) => s.attention >= 22,
    mods: { nerve: +2, name: +2, faith: -1 },
    gives: { attention_rate: +0.8, swing: +0.2, soak: +0.1 },
    weights: { power: +5, relic: +4, rest: -2 },
    attention: +4,
    factions: { order: -1, crime: -1 },
    opens: ['counted'],
    world: 'the ones who watch have a word for her, and it is not a word people were supposed to hear.',
    prompt: 'It has a name for me. The thing that has been counting. I heard it said out loud, in a room I was not supposed to be in, by a man who went grey when he saw me. I can pretend I did not hear it. Or I can answer to it, and be a thing that answers when that calls.',
    took: 'I answered. It knows I answered. I want to be very clear that I understood exactly what I was doing.',
    refused: 'I did not answer to it. I have not slept properly since and I do not think that is a coincidence.',
  },
};

export const CALLING_KEYS = Object.keys(CALLINGS);

// Does her life support this name? THE STATS ARE THE GATE, and this is the only place that
// decides it. She is never offered a name she has not already earned the right to refuse.
export function qualifies(key, sim) {
  const c = CALLINGS[key];
  const s = sim.state;

  if (s.calling === key || s.called?.some((x) => x.key === key)) return false;

  // the ladder
  if (c.after === undefined && s.calling) return false;      // she already answers to something
  if (typeof c.after === 'string' && c.after !== '*' && s.calling !== c.after) return false;

  // MEASURED AGAINST THE WOMAN, NOT AGAINST HER KIT — her skill and what life has taken
  // out of it, and nothing she is holding. A woman is not the Knife because she bought a
  // good knife. This is the same rule the objects live under, for the same reason.
  for (const [k, v] of Object.entries(c.needs ?? {})) if (sim.bare(k) < v) return false;
  for (const [k, v] of Object.entries(c.lived ?? {})) if ((s.lived[k] ?? 0) < v) return false;
  if (c.when && !c.when(s, sim)) return false;
  return true;
}
