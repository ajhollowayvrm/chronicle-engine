// THE WEB SHE WALKS INTO.
//
// Everyone in this world already knows somebody. They had all of this before she
// arrived and they will have it after she is dead, and she is one more person moving
// through a room where everybody else has history.
//
// Nothing here is authored. It is DERIVED from facts the seed engine already produced
// and never introduced to each other:
//
//   SAME SURNAME     → kin. The namer builds "{First} {Last}" from a small pool, so
//                      Halda Vott and Nettle Vott are family and always were. Free, and
//                      the world did not have to be told.
//   SAME FACTION     → they answer to the same people, which is not the same as liking
//                      each other. A cell that is `unaware` of its own leadership and a
//                      chapter that is `loyal, resentfully` are in the same organisation
//                      and would not spit on each other in a fire.
//   RIVAL FACTIONS   → enemies before they have met.
//   THE SAME WANT    → the sharpest one. Two people who want the same thing, in the same
//                      place, are a rivalry the moment they see each other, and neither
//                      of them chose it.
//
// She can walk into all of that, take a side, and find out what it costs.

import { walk } from '../gen/node.js';

const surname = (name) => {
  const parts = name.split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : null;
};

export function webOf(world) {
  const figures = [...walk(world)]
    .filter(({ node: n }) => n.kind === 'figure' && !n.divine)
    .map(({ node: n, path }) => ({
      node: n,
      name: n.name,
      // the nearest faction they sit inside, and the nearest place
      faction: [...path].reverse().find((p) => p.kind === 'faction') ?? null,
      place: [...path].reverse().find((p) => p.kind === 'place') ?? null,
    }));

  const links = [];
  const add = (a, b, kind, why) => links.push({ a: a.name, b: b.name, kind, why });

  for (let i = 0; i < figures.length; i++) {
    for (let j = i + 1; j < figures.length; j++) {
      const A = figures[i], B = figures[j];

      // KIN — and kin is COMPLICATED.
      //
      // "They are Votts" is not a relationship, it is a surname. What makes a family
      // human is that it is at war with itself: the brother who will not speak, the
      // cousin who owes money and has stopped coming to things, the one everybody agrees
      // is the good one and nobody can stand. So a kin tie carries its own weather, and
      // it is derived from what these two people are ALREADY like — a figure who is
      // `suppressed` and a figure who is `alive, and owed` are not going to be close.
      const sa = surname(A.name), sb = surname(B.name);
      if (sa && sa === sb) {
        const owed = [A, B].some((x) => x.node.status?.includes('owed'));
        const bothWant = A.node.wants === B.node.wants;
        const apart = A.place?.name !== B.place?.name;

        const weather =
          bothWant ? { kind: 'kin, at war', why: `they are ${sa}s and they want the same thing, which is how it always starts.` }
          : owed    ? { kind: 'kin, in debt', why: `they are ${sa}s. one of them owes the other, and it has never once been mentioned.` }
          : apart   ? { kind: 'kin, estranged', why: `they are ${sa}s. they have not spoken in years, and neither of them started it.` }
          :           { kind: 'kin', why: `they are ${sa}s, and they close ranks. it is the only thing they all still do.` };

        add(A, B, weather.kind, weather.why);
        continue;
      }

      // THE SAME WANT, IN THE SAME ROOM.
      //
      // The co-location matters and I got it wrong the first time. Two people who both
      // want "twenty more years" from opposite ends of a continent are not rivals — they
      // are two people with the same human problem, and calling that a rivalry produced
      // 190 of them in one world, which is noise. A rivalry needs SCARCITY: the same
      // want, and only one of the thing, and both of them standing next to it.
      const together = A.place && B.place && A.place.name === B.place.name;
      if (together && A.node.wants && A.node.wants === B.node.wants) {
        add(A, B, 'rivals', `they both want ${A.node.wants}, and there is only the one of it, and they are both standing here.`);
        continue;
      }

      // THE SAME ORGANISATION — which is not the same as liking each other.
      if (A.faction && B.faction && A.faction.name === B.faction.name) {
        const schism = [A.faction, B.faction].some((f) =>
          f.relationship_to_center?.startsWith('unaware') || f.relationship_to_center?.includes('schism'));
        add(A, B, schism ? 'estranged' : 'sworn',
          schism
            ? `${A.faction.name} on paper. in practice one of them does not know who they answer to.`
            : `both of ${A.faction.name}. they answer to the same people.`);
        continue;
      }

      // RIVAL ORGANISATIONS. Enemies before they have met.
      if (A.faction && B.faction && (A.faction.rivals ?? []).includes(B.faction.id)) {
        add(A, B, 'opposed', `${A.faction.name} and ${B.faction.name} are not on speaking terms, and neither are they.`);
        continue;
      }

      // Same place, no other connection. They have at least seen each other. Only in a
      // town or a city — "neighbours" across a whole country is not a relationship, it
      // is a census.
      if (together && ['city', 'town'].includes(A.place.scale)) {
        add(A, B, 'neighbours', 'they drink in the same three places.');
      }
    }
  }

  return { figures, links };
}

// Everyone this person is tangled up with.
export const tangledWith = (web, name) =>
  web.links
    .filter((l) => l.a === name || l.b === name)
    .map((l) => ({ ...l, other: l.a === name ? l.b : l.a }));

// SHE TAKES A SIDE, AND IT COSTS HER THE OTHER ONE.
//
// This is the whole reason the web exists. Getting close to somebody does not happen in
// a vacuum: it happens in front of their kin, their rivals, and the people who answer
// to the same men they do. A friendship is a position, whether or not she meant it as
// one — and the world will file her accordingly.
export function sideEffects(web, name) {
  return tangledWith(web, name).map((l) => {
    switch (l.kind) {
      case 'rivals':          return { other: l.other, friction: +4, why: `she took ${name}'s side. ${l.other} wanted the same thing.` };
      case 'opposed':         return { other: l.other, friction: +3, why: `${l.other} does not forgive who she drinks with.` };
      case 'kin':             return { other: l.other, closeness: +2, why: `${l.other} is ${name}'s blood. the family closes ranks, and she is inside it now.` };
      case 'kin, at war':     return { other: l.other, friction: +3, why: `${l.other} is ${name}'s blood, and cannot stand them, and she has just picked a side in somebody else's family.` };
      case 'kin, estranged':  return { other: l.other, closeness: +1, friction: +1, why: `${l.other} has not spoken to ${name} in years, and wants to know how they are, and will not ask.` };
      case 'kin, in debt':    return { other: l.other, friction: +2, why: `${l.other} owes ${name}, and does not care to be reminded of it by a stranger.` };
      case 'sworn':           return { other: l.other, closeness: +1, why: `${l.other} answers to the same people ${name} does.` };
      case 'estranged':       return { other: l.other, friction: +2, why: `${l.other} and ${name} are on paper the same thing, and are not.` };
      default:                return null;
    }
  }).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────── THE VENDETTA
// She buried somebody. Their family finds out.
//
// This is the sharpest thing the web does, because it is the one that arrives LATE and
// UNINVITED — a man she has never met, in a country she was passing through, who is
// angry with her for a reason she had genuinely forgotten. Which is how it works.
export function vendetta(web, name) {
  return tangledWith(web, name)
    .filter((l) => l.kind.startsWith('kin'))
    .map((l) => ({
      other: l.other,
      friction: l.kind === 'kin, at war' ? +2 : +8,   // even a family at war closes for a funeral
      why: l.kind === 'kin, at war'
        ? `${l.other} is ${name}'s blood and hated them, and is furious with her anyway, and cannot say why.`
        : `${l.other} is ${name}'s blood. word got to them. it always gets to them.`,
    }));
}
