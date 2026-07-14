// PASS 6 — HOOKS.
//
// "A hook is never new information. It is a collision of two facts already in the
// tree, and it must name both."
//
// That constraint is the anti-drift mechanism of the entire engine, so this file
// cannot invent. It does three things, all of them mechanical:
//
//   1. TAG every fact already in the world.
//   2. ENUMERATE every pair whose tags collide — typically 200+ candidates.
//   3. SCORE them and keep the best four, each CITING BOTH parent facts.
//
// The spec hands step 3 to a model. We do it in code instead, because a model here
// would break determinism for the sake of taste.
//
// ─────────────────────────────────────────────────────────────────────────────
// AND THE HOOK MUST SAY THE NAMES IT KNOWS.
//
// The first version of this file scored the collision correctly and then described it
// with a FIXED SENTENCE — one of sixteen, shared by every world that would ever exist.
// So three completely different worlds all told the player "someone already knows how
// this ends and has said nothing", and it read like a fortune cookie, because that is
// what it was.
//
// Underneath, the engine knew: there is a man called Nettle Vott, he is known for signing
// a contract after the other party had died, and the country he is standing in is walking
// toward a war everyone can see and nobody will name. It had a named man, a named country,
// and a real reason for him to keep quiet — and it threw all three away.
//
// So a collision rule no longer WRITES the sentence. It READS the two facts, and the two
// facts bring their own proper nouns with them. That is not a loosening of the "a hook may
// never invent" rule, it is the strictest possible reading of it: every noun in the output
// came out of the tree, and the rule contributes nothing but the word "and".

import { walk } from './node.js';

// A fact knows what it is ABOUT — who, what, and where — and not merely how it reads.
// The old version stored only prose, which is why nothing downstream could name anybody.
const tag = (text, tags, where, extra = {}) => ({ text, tags, where, ...extra });

// "godash — refined divine remains" is two things: a substance you can put in a sentence,
// and a gloss that is the whole horror of the setting. Keep both.
const head = (s) => String(s ?? '').split('—')[0].trim();
const tail = (s) => String(s ?? '').split('—').slice(1).join('—').trim();

// SOME OF THESE FIELDS ARE WORDS AND SOME OF THEM ARE PARAGRAPHS, and the generator was
// never asked to be consistent about it. A god's `status` is "silent" in one world and
// "Every train and rifle runs on her. Worshipped and consumed on the same day" in the next.
// Written as `${who} is ${what}` the first is English and the second is "Ashra is Every
// train and rifle runs on her", which is the kind of sentence that makes a player stop
// believing the world is real.
//
// So: a lowercase fragment gets a verb. Anything that starts like a sentence is left to be
// one, and simply given its subject.
const describe = (who, what) =>
  /^[a-z]/.test(String(what ?? '')) ? `${who} is ${what}` : `${who}. ${what}`;

// The cost of a working is always written as a clause with its own verb — "it takes your
// sleep", "you get colder, permanently" — so `${name} costs ${cost}` reads as "Emberment
// costs it takes your sleep". Name the price instead of verbing it.
const price = (who, what) => `the price of ${who} is not a secret: ${what}`;

// A trajectory is USUALLY "toward a war everyone can see and nobody will name" and reads
// straight into "Vasht is going ___". But it is sometimes a whole sentence of its own — "the
// priests are running out of ways to explain it" — and then "Vasht is going the priests are
// running out of ways" is gibberish. Take the verb only when the string will hold one.
const heading = (where, what) =>
  /^(toward|towards|into|down|up|back)/i.test(String(what ?? ''))
    ? `${where} is going ${what}`
    : `at ${where}, this is what is coming: ${what}`;

// Some of these fields are two sentences. Dropped inside an em-dash aside they detonate:
// "Ansel Brack — who is known for humming the chord in her sleep. nobody taught it to her —
// can see it coming". When a fact has to be worn INSIDE another clause, wear the first
// sentence of it and leave the rest.
const clause = (s) => String(s ?? '').split(/\.\s+/)[0].replace(/\.$/, '');

// A FACT THAT SAYS NOTHING HAPPENED IS NOT A FACT.
//
// The generator is allowed to answer "what upheaval?" with "nothing. it is farmland. the
// farmers know, and do not care to discuss it" — which is a good joke and a real answer, and
// it is not something two facts can collide over. Collided anyway, it produced hooks like
// "at The Ottren Directorate: nothing. it is farmland… whatever was signed then is still
// binding", which is a sentence about a document that does not exist.
const empty = (t) => /^(nothing|none|no one|nobody)\b/i.test(String(t ?? '').trim());

function facts(world) {
  const out = [];
  const push = (t, tags, where, extra) => { if (t && !empty(t)) out.push(tag(t, tags, where, extra)); };

  for (const { node: n, path } of walk(world)) {
    // WHERE A FACT IS, NOT WHAT IT IS CALLED.
    //
    // This was `n.name`, which is right for a country and nonsense for anything else: a
    // faction's "where" became the faction's own name, and the hooks duly reported that
    // "The Black Hand is run out of The Black Hand" and that a chapter of The Long Company
    // was standing at The Long Company. A person is not a place. Walk up to the ground they
    // are standing on.
    const where = n.kind === 'place'
      ? n.name
      : ([...path].reverse().find((p) => p.kind === 'place')?.name ?? n.name);

    if (n.era?.recent_upheaval) push(n.era.recent_upheaval, ['upheaval', 'past'], where, { what: n.era.recent_upheaval });
    if (n.era?.trajectory) push(n.era.trajectory, ['future', 'doom'], where, { what: n.era.trajectory });

    for (const q of n.technology?.quirks ?? []) push(q, ['machine'], where, { what: q });
    if (n.technology?.power_source) {
      push(n.technology.power_source, ['fuel', 'finite'], where, {
        what: head(n.technology.power_source),
        gloss: tail(n.technology.power_source),
      });
    }

    for (const t of n.magic?.types ?? []) {
      push(`${t.name} costs ${t.cost}`, ['cost', 'magic'], where, { who: t.name, what: t.cost });
    }
    if (n.magic?.limits) push(n.magic.limits, ['limit', 'magic'], where, { what: n.magic.limits });

    if (n.economy?.who_pays_for_it) {
      push(`the bill is paid by ${n.economy.who_pays_for_it}`, ['victim', 'cost'], where, { who: n.economy.who_pays_for_it });
    }
    if (n.economy?.who_is_rich) {
      push(`the money sits with ${n.economy.who_is_rich}`, ['money'], where, { who: n.economy.who_is_rich });
    }

    for (const d of n.divergences ?? []) push(d.why, ['gap', 'divergence'], where, { what: d.why });

    if (n.kind === 'figure') {
      if (n.known_for) push(`${n.name} is known for ${n.known_for}`, ['secret', 'person'], where, { who: n.name, what: n.known_for });
      if (n.wants) push(`${n.name} wants ${n.wants}`, ['desire', 'person'], where, { who: n.name, what: n.wants });
      if (n.divine && n.status) push(`${n.name} is ${n.status}`, ['god', 'person'], where, { who: n.name, what: n.status });
      if (n.here && n.divine) push(n.here, ['god', 'rule'], where, { who: n.name, what: n.here });
    }

    if (n.kind === 'faction') {
      if (n.here) push(`${n.name} here: ${n.here}`, ['faction'], where, { who: n.name, what: n.here });
      if (n.relationship_to_center?.startsWith('unaware')) {
        push(`a chapter of ${n.name} does not know it has a head`, ['faultline', 'faction'], where, { who: n.name });
      }
      if (n.center === 'supreme') push(`${n.name} is run from here`, ['head', 'faction'], where, { who: n.name });
    }

    if (n.kind === 'era' && n.became) push(n.became, ['past', 'succession'], where, { what: n.became });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────── THE COLLISION TABLE
//
// A pair of tags, and how to READ those two facts when both are true. `read` may only
// rearrange what the facts already say and add the connective tissue — it may not add a
// fact. Every proper noun below comes out of A or B.
//
// A always carries tag `a` and B always carries tag `b`; the enumerator swaps them if it
// matched backwards, so these can be written without defending against the mirror case.
const COLLISIONS = [
  {
    a: 'secret', b: 'finite',
    read: (A, B) => `${A.who} is known for ${A.what}. and ${B.where} runs on ${B.what}, and there is less of it every year. one person here has done that arithmetic, and it is ${A.who}.`,
  },
  {
    a: 'secret', b: 'doom',
    read: (A, B) => `${heading(B.where, B.what)}. ${A.who} — who is known for ${clause(A.what)} — can see it coming, and has said nothing to anybody.`,
  },
  {
    a: 'desire', b: 'victim',
    read: (A, B) => `${A.who} wants ${A.what}. it will be paid for by ${B.who}, at ${B.where}, and nobody is going to ask them first.`,
  },
  {
    a: 'desire', b: 'gap',
    read: (A, B) => `${A.who} wants ${A.what}. and the only reason ${B.where} is the exception it is, is this: ${B.what}.`,
  },
  {
    a: 'god', b: 'fuel',
    read: (A, B) => `at ${B.where} they burn ${B.what}${B.gloss ? ` — ${B.gloss}` : ''}. and on the same day, in the same clothes, they pray to ${A.who}.`,
  },
  {
    a: 'god', b: 'rule',
    read: (A, B) => `${describe(A.who, A.what)}. and where she is standing, this is what that means: ${B.what}`,
  },
  {
    a: 'faultline', b: 'head',
    read: (A, B) => `${B.who} is run out of ${B.where}. the chapter at ${A.where} does not know that, and has been obeying orders it believes are its own.`,
  },
  {
    a: 'faultline', b: 'money',
    read: (A, B) => `the chapter of ${A.who} at ${A.where} answers to nobody, and does not know it. and at ${B.where} the money sits with ${B.who}.`,
  },
  {
    a: 'machine', b: 'magic',
    read: (A, B) => `at ${A.where}: ${A.what}. and ${price(B.who, B.what)}. nobody at ${A.where} has said out loud that those two are the same sentence.`,
  },
  {
    a: 'machine', b: 'fuel',
    read: (A, B) => `at ${A.where}, ${A.what} — and the whole of it runs on ${B.what}, and there is less of that every year than the year before.`,
  },
  {
    a: 'cost', b: 'victim',
    read: (A, B) => `${price(A.who, A.what)}. and it is not the people who use it who pay: the bill goes to ${B.who}, at ${B.where}, who get no vote and no warning.`,
  },
  {
    a: 'gap', b: 'victim',
    read: (A, B) => `${A.where} is an exception, and this is why: ${A.what}. it is subsidised by ${B.who}, who are at the bottom of it and are not told.`,
  },
  {
    a: 'gap', b: 'doom',
    read: (A, B) => `${A.where} only works because ${A.what}. and ${heading(B.where, B.what)}. the whole arrangement is built on it.`,
  },
  {
    a: 'upheaval', b: 'succession',
    read: (A, B) => `at ${A.where}: ${A.what}. and what stands there now is ${B.what}. the same people, under a new name.`,
  },
  {
    a: 'limit', b: 'desire',
    read: (A, B) => `the working at ${A.where}: ${A.what}. and ${B.who} wants ${B.what} — which is the one thing it will not do.`,
  },
  {
    a: 'past', b: 'god',
    read: (A, B) => `at ${A.where}: ${A.what}. and ${describe(B.who, B.what)}. whatever was signed then was signed to them, and it did not stop being binding when they died.`,
  },
];

export function findHooks(world, seed, want = 4) {
  const fs = facts(world);
  const found = [];

  for (let i = 0; i < fs.length; i++) {
    for (let j = i + 1; j < fs.length; j++) {
      for (const c of COLLISIONS) {
        // orient them, so `read` always gets (the one with tag a, the one with tag b)
        let A = fs[i], B = fs[j];
        const forward = A.tags.includes(c.a) && B.tags.includes(c.b);
        const backward = A.tags.includes(c.b) && B.tags.includes(c.a);
        if (!forward && !backward) continue;
        if (!forward) [A, B] = [B, A];

        // a fact colliding with itself is not a story
        if (A.text === B.text) continue;

        let collision;
        try {
          collision = c.read(A, B);
        } catch {
          continue;   // a fact missing the field this rule wanted. it is not a hook, then.
        }
        // A rule that cannot name anybody has produced exactly the fortune cookie this
        // rewrite exists to kill. Throw it away rather than print it.
        if (!collision || /undefined|null/.test(collision)) continue;

        found.push({
          // the hook CITES BOTH PARENT FACTS. this is the whole constraint: a hook
          // that cannot name its two inputs is a hook that made something up.
          facts: [A.text, B.text],
          where: [A.where, B.where],
          collision,
          rule: `${c.a}+${c.b}`,
          // prefer collisions that reach ACROSS the tree — two facts in the same node
          // are usually just one fact said twice — and prefer the ones with a PERSON in
          // them, because a named man doing a specific thing is a story and an
          // institution having a property is a fact.
          score: (A.where !== B.where ? 2 : 0)
            + (A.who ? 1 : 0) + (B.who ? 1 : 0)
            + (A.tags.length + B.tags.length) / 10,
        });
      }
    }
  }

  found.sort((x, y) => y.score - x.score || (x.collision < y.collision ? -1 : 1));

  // dedupe on the RULE, so four hooks are four different shapes of story — not on the
  // text, which is now unique per pair and would let four flavours of the same idea through
  const seen = new Set();
  const out = [];
  for (const h of found) {
    if (seen.has(h.rule)) continue;
    seen.add(h.rule);
    out.push(h);
    if (out.length >= want) break;
  }
  return out;
}

export const candidateCount = (world) => {
  const fs = facts(world);
  return (fs.length * (fs.length - 1)) / 2;
};
