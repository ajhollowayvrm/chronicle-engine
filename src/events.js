import { STANDING_OFFER } from './lore.js';

// The event table. MECHANICS ONLY — there is not one proper noun in this file,
// and there must never be. Every line of prose comes from the lore pack via
// `c.line(slot, vars)`; every name and place comes from `c.name()` / `c.place()`.
// That is what lets two runs of the same seed tell the same story in two
// completely different worlds.
//
// Every event carries:
//   base    - raw weight before dials
//   sens    - how each dial pulls on its likelihood, in -1..+1 offset space
//   tags    - used for pity/recency suppression and for narration hints
//   require - optional gate (state) => bool
//   fire    - (ctx) => log line; may mutate state, may push a judgment
//
// If you add an event, add its prose slots to SLOTS in lore.js — otherwise every
// existing pack is missing lines for it and validation will (correctly) reject.

export const events = [

  // ---------- the map ----------
  {
    // She crosses out of one region and into another. The player may have
    // suggested where — `chooseDestination` decides how much of that suggestion
    // she takes, which is a function of how far she has drifted from them.
    //
    // Deliberately not rare. A world of five regions where she leaves one twice a
    // year is a world with one region in it.
    id: 'travel',
    base: 5,
    sens: { reckless: +0.25, sociable: -0.15, generous: 0 },
    tags: ['travel'],
    fire: (c) => {
      const to = c.chooseDestination();
      const toName = c.regionName(to);
      const leaving = c.regionLine(c.state.region, 'depart', {
        region: c.regionName(c.state.region),
        place: c.place(),
        to: toName,
      });

      const from = c.travelTo(to);   // she is now standing in the new region

      // the crossing costs. it is a long way between anywhere in these worlds.
      c.state.coin = Math.max(0, c.state.coin - c.varyPos(12, 0.4));
      if (c.chance(Math.max(0.03, 0.14 - 0.04 * c.skill('road')))) c.state.wounds += 1;

      const arriving = c.regionLine(to, 'arrive', {
        region: toName,
        place: c.place(),          // drawn from the NEW region: she is there now
        from: c.regionName(from),
      });

      // If she has crossed a FRONTIER, not just a border of terrain, the law she
      // lives under has just changed. That is worth a sentence, and it is the
      // sentence that makes a country mean something.
      const wasIn = c.lore.regions[from].polity;
      const nowIn = c.region().polity;
      if (wasIn !== nowIn && nowIn) {
        const crossed = c.polityLine(nowIn, 'cross', {
          place: c.place(),
          from: wasIn ? c.polity(wasIn).name : c.regionName(from),
        });
        return `${leaving} ${arriving} ${crossed}`;
      }
      return `${leaving} ${arriving}`;
    },
  },
  {
    // The law of this country, run into rather than read about. Only fires where
    // somebody actually rules — out on unclaimed ground there is no law to meet.
    id: 'law',
    base: 5,
    sens: { reckless: +0.30, sociable: 0, generous: 0 },
    tags: ['power', 'town'],
    require: (s, c) => !!c.region().polity,
    fire: (c) => {
      const law = c.laws();
      c.state.watch.attention += Math.round(law.zeal ?? 1);

      // being a known friend of a faction this country has outlawed is not
      // something she gets to explain her way out of
      const wanted = c.outlawedHere();
      if (wanted.length && c.chance(0.6)) {
        const f = c.pick(wanted);
        c.state.wounds += 1;
        c.state.coin = Math.max(0, c.state.coin - c.varyPos(40, 0.5));
        return c.factionLine(f.id, 'hunted', { place: c.place() });
      }

      c.state.coin = Math.max(0, c.state.coin - c.varyPos(20 * (law.toll ?? 1), 0.4));
      return c.polityLine(c.region().polity, 'law', { place: c.place() });
    },
  },
  {
    // The world moves while she is in it. She does not get told; she FINDS OUT,
    // standing somewhere, late, from somebody who is frightened.
    id: 'world_turns',
    base: 3,
    sens: { reckless: 0, sociable: +0.30, generous: 0 },
    tags: ['thread'],
    require: (s, c) => c.polities().length >= 2,
    fire: (c) => c.turnTheWorld(),
  },

  // ---------- the baseline: quiet ----------
  {
    id: 'quiet_road',
    base: 34,
    sens: { reckless: -0.30, sociable: -0.20, generous: 0 },
    tags: ['quiet'],
    fire: (c) => {
      c.state.coin += c.earn(6, 0.3);
      return c.line('quiet_road', { place: c.place() });
    },
  },
  {
    id: 'quiet_camp',
    base: 14,
    sens: { reckless: -0.45, sociable: -0.10, generous: 0 },
    tags: ['quiet', 'rest'],
    fire: (c) => {
      const healed = c.state.wounds > 0;
      if (healed) c.state.wounds -= 1;
      return c.line(healed ? 'quiet_camp_healed' : 'quiet_camp_restless');
    },
  },

  // ---------- danger ----------
  {
    id: 'ambush',
    base: 12,
    sens: { reckless: +0.90, sociable: 0, generous: 0 },
    tags: ['danger', 'combat'],
    fire: (c) => {
      const place = c.place();
      // `blade` is what she paid a school for. it shows up here, and only here.
      const swing = c.swing() + 0.45 * c.skill('blade');
      const ally = c.livingCompanion();

      if (swing > 0.9) {
        c.state.coin += c.earn(70, 0.5);
        c.state.renown += 4;
        c.drift('reckless', +0.02);
        return c.line('ambush_triumph', { place });
      }
      if (swing < -0.9) {
        c.state.wounds += 3;
        c.state.coin = Math.max(0, c.state.coin - c.varyPos(40, 0.4));
        c.drift('reckless', -0.05);
        if (ally && c.chance(0.30)) {
          c.wound(ally, 2);
          return c.line('ambush_ruin_ally', { place, ally: ally.name });
        }
        return c.line('ambush_ruin', { place });
      }
      c.state.wounds += 1;
      c.state.coin += c.earn(20, 0.4);
      if (ally) {
        c.bond(ally, +2);
        if (c.chance(0.22 + 0.2 * c.off('reckless'))) c.wound(ally, 1);
        return c.line('ambush_scrape_ally', { place, ally: ally.name });
      }
      return c.line('ambush_scrape', { place });
    },
  },
  {
    id: 'patrol',
    // Raised from 4. Defying or paying a toll is the single loudest STANCE she
    // takes in a week — it is what the factions score her on, and what the
    // watching power notices. At base 4 it fired ~7 times in a whole life, which
    // made a faction built on defiance mathematically unreachable, and left a
    // world whose premise is "water is the law" barely enforcing any.
    base: 9,
    sens: { reckless: +0.70, sociable: 0, generous: -0.40 },
    tags: ['danger', 'power'],
    fire: (c) => {
      const place = c.place();
      c.state.flags.seenPatrol = true;
      const law = c.laws();
      if (c.chance(0.5 + 0.3 * c.off('reckless'))) {
        c.state.renown += 6;
        // saying no is not the same as being beaten for it. it only sometimes
        // turns physical — at base 9, an automatic wound here made defiance a
        // slow suicide and killed one life in ten before day 27.
        if (c.chance(0.45)) c.state.wounds += 1;
        // a zealous country's agents take it far more personally
        c.state.watch.attention += Math.round(2 * (law.zeal ?? 1));
        return c.line('patrol_defied', { place });
      }
      // what a toll costs is a fact about the country, not about her
      const asked = c.varyPos(60 * (0.4 + (law.toll ?? 1)), 0.3);
      const paid = Math.max(0, Math.min(c.state.coin, asked));
      c.state.coin -= paid;
      return c.line('patrol_paid', { place, coin: paid });
    },
  },
  {
    id: 'sickness',
    base: 5,
    sens: { reckless: +0.25, sociable: +0.20, generous: 0 },
    tags: ['danger'],
    fire: (c) => {
      // a woman who has been taught the country still catches the fever. she just
      // does not lose a fortnight to it. the prose is the same; the wound is not.
      if (!c.chance(0.25 * c.skill('road'))) c.state.wounds += 1;
      return c.line('sickness', { place: c.place() });
    },
  },
  {
    id: 'beast',
    base: 7,
    sens: { reckless: +0.60, sociable: -0.20, generous: 0 },
    tags: ['danger', 'combat'],
    fire: (c) => {
      const place = c.place();
      const swing = c.swing() + 0.45 * c.skill('blade');
      if (swing < -0.7) {
        c.state.wounds += 2;
        return c.line('beast_maul', { place });
      }
      c.state.coin += c.earn(35, 0.5);
      c.state.renown += 2;
      return c.line('beast_kill', { place });
    },
  },

  // ---------- fortune ----------
  {
    id: 'cache',
    base: 13,
    sens: { reckless: +0.50, sociable: 0, generous: 0 },
    tags: ['fortune'],
    fire: (c) => {
      // floor the haul: "found a cache of 0 coin" is not a windfall, and the
      // gaussian tail will happily hand you one
      const take = Math.max(8, Math.round(c.earn(55, 0.6) * (1 + 0.3 * c.skill('scavenge'))));
      c.state.coin += take;
      return c.line('cache', { place: c.place(), coin: take });
    },
  },
  {
    id: 'relic',
    base: 3,
    sens: { reckless: +0.40, sociable: 0, generous: -0.20 },
    tags: ['fortune', 'thread'],
    fire: (c) => {
      c.state.relics += 1;
      c.state.watch.attention += 1;
      return c.line('relic', { place: c.place() });
    },
  },
  {
    id: 'work',
    base: 11,
    sens: { reckless: -0.35, sociable: +0.30, generous: 0 },
    tags: ['town', 'rest'],
    fire: (c) => {
      const pay = Math.max(5, c.earn(30, 0.25));
      c.state.coin += pay;
      c.state.wounds = Math.max(0, c.state.wounds - 1);
      return c.line('work', { place: c.place(), coin: pay });
    },
  },

  // ---------- people ----------
  {
    id: 'stranger',
    base: 9,
    sens: { reckless: 0, sociable: +1.20, generous: +0.20 },
    tags: ['people'],
    require: (s) => s.companions.filter((x) => x.alive).length < 2,
    fire: (c) => {
      const name = c.pickUnusedName();
      const place = c.place();
      const j = c.lore.judgments.trust;

      c.judgment({
        id: `trust_${name}`,
        prompt: c.judgmentPrompt('trust', { name, place }),
        expires: 4,
        options: {
          trust: {
            label: j.options.trust.label,
            weight: (s) => 0.5 + 0.5 * ((s.true.sociable - 50) / 50),
            apply: (c2) => {
              c2.addCompanion(name, { bond: 3, trust: true });
              c2.drift('sociable', +0.04);
              return c2.judgmentLine('trust', 'trust', { name });
            },
          },
          wary: {
            label: j.options.wary.label,
            weight: () => 0.35,
            apply: (c2) => {
              c2.addCompanion(name, { bond: 1, trust: false });
              return c2.judgmentLine('trust', 'wary', { name });
            },
          },
          send: {
            label: j.options.send.label,
            weight: (s) => 0.4 - 0.4 * ((s.true.sociable - 50) / 50),
            apply: (c2) => {
              c2.state.ghosts.push({ name, why: 'sent away', day: c2.state.day });
              c2.drift('sociable', -0.05);
              return c2.judgmentLine('trust', 'send', { name });
            },
          },
        },
      });
      return c.line('stranger', { name, place });
    },
  },
  {
    id: 'companion_talk',
    base: 10,
    sens: { reckless: -0.20, sociable: +0.60, generous: +0.10 },
    tags: ['people', 'quiet'],
    require: (s) => s.companions.some((x) => x.alive),
    fire: (c) => {
      const a = c.livingCompanion();
      c.bond(a, +2);
      return c.line('companion_talk', { ally: a.name });
    },
  },
  {
    id: 'companion_leaves',
    base: 5,
    sens: { reckless: +0.30, sociable: -0.70, generous: -0.30 },
    tags: ['people', 'loss'],
    require: (s) => s.companions.some((x) => x.alive && x.bond < 6 && s.day - x.joined >= 12),
    fire: (c) => {
      const a = c.state.companions.find((x) => x.alive && x.bond < 6 && c.state.day - x.joined >= 12);
      a.alive = false;
      c.state.ghosts.push({ name: a.name, why: 'walked away', day: c.state.day });
      c.drift('sociable', -0.03);
      return c.line('companion_leaves', { ally: a.name });
    },
  },
  {
    id: 'companion_dies',
    base: 3,
    sens: { reckless: +0.80, sociable: 0, generous: 0 },
    tags: ['people', 'loss', 'danger'],
    require: (s) => s.companions.some((x) => x.alive && x.wounds >= 2),
    fire: (c) => {
      const a = c.state.companions.find((x) => x.alive && x.wounds >= 2);
      const place = c.place();
      a.alive = false;
      c.state.ghosts.push({ name: a.name, why: 'died', day: c.state.day, bond: a.bond });
      c.state.grief += a.bond;
      c.drift('reckless', a.bond > 8 ? +0.10 : -0.04);
      c.drift('sociable', -0.06);
      return c.line(a.bond > 8 ? 'companion_dies_beloved' : 'companion_dies_plain', { ally: a.name, place });
    },
  },
  {
    id: 'love',
    base: 4,
    sens: { reckless: 0, sociable: +0.90, generous: +0.30 },
    tags: ['people', 'bond'],
    require: (s) => s.companions.some((x) => x.alive && x.bond >= 9 && !x.beloved),
    fire: (c) => {
      const a = c.state.companions.find((x) => x.alive && x.bond >= 9 && !x.beloved);
      const place = c.place();
      const j = c.lore.judgments.love;

      c.judgment({
        id: `love_${a.name}`,
        prompt: c.judgmentPrompt('love', { ally: a.name }),
        expires: 3,
        options: {
          yes: {
            label: j.options.yes.label,
            weight: (s) => 0.45 + 0.45 * ((s.true.sociable - 50) / 50),
            apply: (c2) => {
              a.beloved = true;
              c2.state.morale += 12;
              c2.drift('reckless', -0.06);
              return c2.judgmentLine('love', 'yes', { ally: a.name });
            },
          },
          no: {
            label: j.options.no.label,
            weight: () => 0.4,
            apply: (c2) => {
              c2.bond(a, -3);
              c2.drift('sociable', -0.05);
              return c2.judgmentLine('love', 'no', { ally: a.name });
            },
          },
        },
      });
      return c.line('love', { ally: a.name, place });
    },
  },
  {
    id: 'charity',
    base: 6,
    sens: { reckless: 0, sociable: +0.30, generous: +1.30 },
    tags: ['people'],
    fire: (c) => {
      const place = c.place();
      const give = Math.max(0, Math.min(c.state.coin, c.varyPos(25, 0.4)));
      c.state.coin -= give;
      c.state.renown += 3;
      c.state.debts.push({ place, day: c.state.day });
      return c.line('charity', { place, coin: give });
    },
  },
  {
    id: 'debt_repaid',
    base: 4,
    sens: { reckless: 0, sociable: +0.30, generous: +0.40 },
    tags: ['people', 'fortune'],
    require: (s) => s.debts.length > 0,
    fire: (c) => {
      const d = c.state.debts.shift();
      c.state.coin += c.earn(45, 0.4);
      c.state.wounds = Math.max(0, c.state.wounds - 1);
      return c.line('debt_repaid', { place: d.place });
    },
  },

  // ---------- threads ----------
  {
    id: 'rumor',
    base: 8,
    sens: { reckless: +0.20, sociable: +0.50, generous: +0.20 },
    tags: ['thread'],
    fire: (c) => {
      c.state.threads += 1;
      return c.line('rumor', { place: c.place() });
    },
  },
  {
    id: 'ghost',
    base: 4,
    sens: { reckless: 0, sociable: -0.20, generous: 0 },
    tags: ['thread', 'loss'],
    require: (s) => s.ghosts.length > 0,
    fire: (c) => {
      const g = c.pick(c.state.ghosts);
      if (g.why === 'died') {
        c.state.morale -= 4;
        return c.line('ghost_dead', { ghost: g.name });
      }
      c.drift('sociable', +0.02);
      return c.line('ghost_gone', { ghost: g.name, place: c.place() });
    },
  },
  {
    id: 'power_moves',
    base: 3,
    sens: { reckless: +0.30, sociable: 0, generous: 0 },
    tags: ['power', 'thread'],
    require: (s) => s.watch.attention >= 4,
    fire: (c) => {
      c.state.watch.attention += 1;
      c.state.flags.hunted = true;
      return c.line('power_moves', { place: c.place() });
    },
  },

  // ---------- the schools ----------
  {
    // Where the coin goes. She has to be standing in the right country, and she
    // has to be able to pay — so this is the one event in the table the player
    // can genuinely set up: keep her alive, keep her earning, suggest the region,
    // and the door opens.
    id: 'school',
    base: 7,
    sens: { reckless: -0.25, sociable: 0, generous: -0.20 },
    tags: ['town', 'thread'],
    require: (s, c) => c.schools().some((sc) => c.canTrain(sc)),
    fire: (c) => {
      const sc = c.pick(c.schools().filter((x) => c.canTrain(x)));
      const place = c.place();
      const cost = c.schoolCost(sc);

      c.judgment({
        id: `school_${sc.id}_${c.skill(sc.teaches)}`,
        prompt: c.schoolLine(sc.id, 'prompt', { place, coin: cost }),
        expires: 3,
        options: {
          train: {
            label: 'Pay, and learn',
            // a careful woman invests in herself; a reckless one has better uses
            // for a fortune, and is why she will not live to spend it
            weight: (s) => 0.55 - 0.35 * ((s.true.reckless - 50) / 50),
            apply: (c2) => {
              const paid = c2.trainAt(sc);
              return c2.schoolLine(sc.id, 'train', { place, coin: paid });
            },
          },
          refuse: {
            label: 'Keep the coin',
            weight: (s) => 0.35 + 0.3 * ((s.true.reckless - 50) / 50),
            apply: (c2) => c2.schoolLine(sc.id, 'refuse', { place, coin: cost }),
          },
        },
      });

      return c.schoolLine(sc.id, 'prompt', { place, coin: cost });
    },
  },

  // ---------- the factions ----------
  //
  // None of these can fire until she has EARNED them, for good or ill. That is
  // the point: the player never picks a side, they set a temperament, and the
  // sides pick her. A generous woman finds doors open. A woman who spits at every
  // toll finds men waiting at the next one.
  {
    id: 'faction_favour',
    base: 5,
    sens: { reckless: 0, sociable: +0.30, generous: 0 },
    tags: ['people', 'town'],
    require: (s, c) => c.friends().length > 0,
    fire: (c) => {
      const f = c.pick(c.friends());
      c.state.coin += c.earn(15, 0.5);
      c.nudgeStanding(f.id, +1);
      return c.factionLine(f.id, 'favour', { place: c.place() });
    },
  },
  {
    id: 'faction_shelter',
    base: 6,
    sens: { reckless: -0.40, sociable: +0.20, generous: 0 },
    tags: ['rest', 'people', 'town'],
    require: (s, c) => c.friends().length > 0,
    fire: (c) => {
      const f = c.pick(c.friends());
      c.state.wounds = Math.max(0, c.state.wounds - 2);
      // a faction that will hide you is worth more than a faction that will pay
      // you: they can put the watching power off your scent for a while
      c.state.watch.attention = Math.max(0, c.state.watch.attention - 2);
      return c.factionLine(f.id, 'shelter', { place: c.place() });
    },
  },
  {
    id: 'faction_hunted',
    base: 7,
    sens: { reckless: +0.30, sociable: 0, generous: 0 },
    tags: ['danger', 'combat'],
    require: (s, c) => c.enemies().length > 0,
    fire: (c) => {
      const f = c.pick(c.enemies());
      const place = c.place();
      const swing = c.swing();
      // being hunted is worse than being ambushed: they know who she is, and they
      // came for her specifically, and they will come again
      c.state.wounds += swing < -0.5 ? 3 : 1;
      c.state.coin = Math.max(0, c.state.coin - c.varyPos(30, 0.5));
      c.nudgeStanding(f.id, -1);
      return c.factionLine(f.id, 'hunted', { place });
    },
  },
  {
    id: 'faction_offer',
    base: 6,
    sens: { reckless: 0, sociable: +0.40, generous: 0 },
    tags: ['people', 'thread'],
    require: (s, c) => !s.allegiance && c.factions().some((f) => c.standing(f.id) >= STANDING_OFFER),
    fire: (c) => {
      const f = c.pick(c.factions().filter((x) => c.standing(x.id) >= STANDING_OFFER));
      const place = c.place();

      c.judgment({
        id: `allegiance_${f.id}`,
        prompt: c.allegianceLine(f.id, 'prompt', { place }),
        expires: 4,
        options: {
          join: {
            label: 'Take the place',
            weight: (s) => 0.4 + 0.5 * ((s.true.sociable - 50) / 50),
            apply: (c2) => {
              c2.state.allegiance = f.id;
              c2.nudgeStanding(f.id, +6);
              // their enemies are hers now. this is the cost, and it is a real one.
              for (const r of f.rivals ?? []) c2.nudgeStanding(r, -10);
              c2.drift('sociable', +0.05);
              return c2.allegianceLine(f.id, 'join', { place });
            },
          },
          use: {
            label: 'Take the help, not the collar',
            weight: (s) => 0.35 + 0.35 * ((s.true.reckless - 50) / 50),
            apply: (c2) => {
              c2.state.coin += c2.earn(60, 0.5);
              c2.nudgeStanding(f.id, -4);   // they are not fools
              c2.drift('sociable', -0.02);
              return c2.allegianceLine(f.id, 'use', { place });
            },
          },
          refuse: {
            label: 'She belongs to nobody',
            weight: (s) => 0.4 - 0.4 * ((s.true.sociable - 50) / 50),
            apply: (c2) => {
              c2.nudgeStanding(f.id, -3);
              c2.drift('sociable', -0.04);
              return c2.allegianceLine(f.id, 'refuse', { place });
            },
          },
        },
      });

      return c.factionLine(f.id, 'favour', { place });
    },
  },
];
