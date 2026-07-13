// Every event carries:
//   base    - raw weight before dials
//   sens    - how each dial pulls on its likelihood, in -1..+1 offset space
//   tags    - used for pity/recency suppression and for narration hints
//   require - optional gate (state) => bool
//   fire    - (ctx) => log line; may mutate state, may push a judgment

export const NAMES = [
  'Lyra', 'Sable', 'Ondrey', 'Marn', 'Kestwyn', 'Ilo', 'Fennick', 'Varo',
  'Tessine', 'Grael', 'Oleander', 'Rusk', 'Immeth', 'Calla', 'Doryn', 'Wen',
];

export const PLACES = [
  'the Fenwater crossing', 'Ashgate', 'the Wend', 'Bellow Hollow', 'the salt road',
  'Tarn Mill', 'the Cindershelf', 'Low Ilmun', 'the Weeping Stair', 'Bryn Coldwater',
  'the tithe-road', 'Ossuary Fields', 'Greyhalt', 'the Drowned Orchard',
];

export const events = [

  // ---------- the baseline: quiet ----------
  {
    id: 'quiet_road',
    base: 34,
    sens: { reckless: -0.30, sociable: -0.20, generous: 0 },
    tags: ['quiet'],
    fire: (c) => {
      c.state.coin += c.varyPos(6, 0.3);
      return c.pick([
        `walked ${c.pick(PLACES)}. nothing happened. she slept badly.`,
        `three days of rain on the road to ${c.pick(PLACES)}. she counted her coin twice out of boredom.`,
        `passed through ${c.pick(PLACES)}. nobody looked at her. she found she minded.`,
        `a long empty stretch past ${c.pick(PLACES)}. she talked to the horse. the horse is dead. she talked anyway.`,
        `${c.pick(PLACES)}, and then more road. she is beginning to suspect the road is the point.`,
      ]);
    },
  },
  {
    id: 'quiet_camp',
    base: 14,
    sens: { reckless: -0.45, sociable: -0.10, generous: 0 },
    tags: ['quiet', 'rest'],
    fire: (c) => {
      const healed = c.state.wounds > 0 ? 1 : 0;
      c.state.wounds = Math.max(0, c.state.wounds - healed);
      return healed
        ? `made camp early. dressed her wounds. one of them is closing.`
        : `made camp early. sharpened everything twice. she is restless when nothing hurts.`;
    },
  },

  // ---------- danger ----------
  {
    id: 'ambush',
    base: 12,
    sens: { reckless: +0.90, sociable: 0, generous: 0 },
    tags: ['danger', 'combat'],
    fire: (c) => {
      const place = c.pick(PLACES);
      const swing = c.vary(0, 1); // variance scales with recklessness
      const ally = c.livingCompanion();

      if (swing > 0.9) {
        c.state.coin += c.varyPos(70, 0.5);
        c.state.renown += 4;
        c.drift('reckless', +0.02);
        return `ambushed at ${place}. she did not run. she came out of it with their purses and a new scar she seems proud of.`;
      }
      if (swing < -0.9) {
        c.state.wounds += 3;
        c.state.coin = Math.max(0, c.state.coin - c.varyPos(40, 0.4));
        c.drift('reckless', -0.05);
        if (ally && c.chance(0.30)) {
          c.wound(ally, 2);
          return `ambushed at ${place}. it went badly. ${ally.name} took a blade meant for her and is not walking well.`;
        }
        return `ambushed at ${place}. it went badly. she left blood on the road and most of her coin.`;
      }
      c.state.wounds += 1;
      c.state.coin += c.varyPos(20, 0.4);
      if (ally) { c.bond(ally, +2); if (c.chance(0.22 + 0.2 * c.off('reckless'))) c.wound(ally, 1); }
      return ally
        ? `ambushed at ${place}. they fought back to back. it worked.`
        : `ambushed at ${place}. she won, barely, and did not stop to count the bodies.`;
    },
  },
  {
    id: 'tithe_men',
    base: 4,
    sens: { reckless: +0.70, sociable: 0, generous: -0.40 },
    tags: ['danger', 'baron'],
    fire: (c) => {
      c.state.flags.seenTitheMen = true;
      if (c.chance(0.5 + 0.3 * c.off('reckless'))) {
        c.state.renown += 6;
        c.state.wounds += 1;
        c.state.barons.attention += 2;
        return `the Baron's tithe-men stopped her on ${c.pick(PLACES)}. she did not pay. word of that will travel faster than she does.`;
      }
      const paid = Math.max(0, Math.min(c.state.coin, c.varyPos(60, 0.3)));
      c.state.coin -= paid;
      return `the Baron's tithe-men stopped her on ${c.pick(PLACES)}. she paid ${paid} and hated every coin of it.`;
    },
  },
  {
    id: 'sickness',
    base: 5,
    sens: { reckless: +0.25, sociable: +0.20, generous: 0 },
    tags: ['danger'],
    fire: (c) => {
      c.state.wounds += 1;
      return `fever took her outside ${c.pick(PLACES)}. she walked through it, which was stupid.`;
    },
  },
  {
    id: 'beast',
    base: 7,
    sens: { reckless: +0.60, sociable: -0.20, generous: 0 },
    tags: ['danger', 'combat'],
    fire: (c) => {
      const swing = c.vary(0, 1);
      if (swing < -0.7) {
        c.state.wounds += 2;
        return `something came out of the trees near ${c.pick(PLACES)}. she does not want to talk about it. she is limping.`;
      }
      c.state.coin += c.varyPos(35, 0.5);
      c.state.renown += 2;
      return `killed something large near ${c.pick(PLACES)} and sold the parts of it that would sell.`;
    },
  },

  // ---------- fortune ----------
  {
    id: 'cache',
    base: 13,
    sens: { reckless: +0.50, sociable: 0, generous: 0 },
    tags: ['fortune'],
    fire: (c) => {
      const take = c.varyPos(55, 0.6);
      c.state.coin += take;
      return `found a cache under the floor of a burned house at ${c.pick(PLACES)}. ${take} coin and a child's shoe.`;
    },
  },
  {
    id: 'relic',
    base: 3,
    sens: { reckless: +0.40, sociable: 0, generous: -0.20 },
    tags: ['fortune', 'thread'],
    fire: (c) => {
      c.state.relics += 1;
      c.state.barons.attention += 1;
      return `pulled something out of the silt at ${c.pick(PLACES)} that hums when she is asleep. she has not sold it.`;
    },
  },
  {
    id: 'work',
    base: 11,
    sens: { reckless: -0.35, sociable: +0.30, generous: 0 },
    tags: ['town', 'rest'],
    fire: (c) => {
      const pay = c.varyPos(30, 0.25);
      c.state.coin += pay;
      c.state.wounds = Math.max(0, c.state.wounds - 1);
      return `took honest work in ${c.pick(PLACES)} for a week. ${pay} coin, a bed, and a wound that finally closed.`;
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
      const place = c.pick(PLACES);
      c.judgment({
        id: `trust_${name}`,
        prompt: `${name} has walked beside her since ${place} and shows no sign of leaving. What is her disposition?`,
        expires: 4,
        options: {
          trust: {
            label: 'Trust them',
            weight: (s) => 0.5 + 0.5 * ((s.true.sociable - 50) / 50),
            apply: (c2) => {
              c2.addCompanion(name, { bond: 3, trust: true });
              c2.drift('sociable', +0.04);
              return `she told ${name} her real name. that is not nothing, for her.`;
            },
          },
          wary: {
            label: 'Keep them at arm\u2019s length',
            weight: () => 0.35,
            apply: (c2) => {
              c2.addCompanion(name, { bond: 1, trust: false });
              return `${name} walks half a pace behind her now. she likes it that way. she thinks she likes it that way.`;
            },
          },
          send: {
            label: 'Send them away',
            weight: (s) => 0.4 - 0.4 * ((s.true.sociable - 50) / 50),
            apply: (c2) => {
              c2.state.ghosts.push({ name, why: 'sent away', day: c2.state.day });
              c2.drift('sociable', -0.05);
              return `she sent ${name} back down the road. she watched until they were out of sight, which she would deny.`;
            },
          },
        },
      });
      return `a stranger named ${name} came out of the reeds at ${place} with a bill-hook and no explanation.`;
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
      const lines = [
        `${a.name} told her about the war, and what they did in it. she did not flinch, which ${a.name} noticed.`,
        `they argued about the road for an hour and then walked it together anyway.`,
        `${a.name} sang something in a language she doesn't know. she asked them to sing it again.`,
        `${a.name} asked her what she is running toward. she gave an answer she has given before and believed less this time.`,
      ];
      return c.pick(lines);
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
      return `${a.name} was gone before dawn. no note. she pretended not to look for tracks.`;
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
      a.alive = false;
      c.state.ghosts.push({ name: a.name, why: 'died', day: c.state.day, bond: a.bond });
      c.state.grief += a.bond;
      c.drift('reckless', a.bond > 8 ? +0.10 : -0.04);
      c.drift('sociable', -0.06);
      return a.bond > 8
        ? `${a.name} died at ${c.pick(PLACES)}. she carried the body two days before she buried it. she has not been careful since.`
        : `${a.name} died at ${c.pick(PLACES)}. she buried them and went on. she is telling herself that is the same as grieving.`;
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
      c.judgment({
        id: `love_${a.name}`,
        prompt: `Something has changed between her and ${a.name}. Does she let it?`,
        expires: 3,
        options: {
          yes: {
            label: 'Let her love them',
            weight: (s) => 0.45 + 0.45 * ((s.true.sociable - 50) / 50),
            apply: (c2) => {
              a.beloved = true;
              c2.state.morale += 12;
              c2.drift('reckless', -0.06);
              return `she let it happen. she is more careful now, and she is furious about that.`;
            },
          },
          no: {
            label: 'She has work to do',
            weight: () => 0.4,
            apply: (c2) => {
              c2.bond(a, -3);
              c2.drift('sociable', -0.05);
              return `she said nothing, and let the moment go past. ${a.name} understood, which was worse.`;
            },
          },
        },
      });
      return `she and ${a.name} sat up past the fire's end at ${c.pick(PLACES)} and neither of them went to sleep.`;
    },
  },
  {
    id: 'charity',
    base: 6,
    sens: { reckless: 0, sociable: +0.30, generous: +1.30 },
    tags: ['people'],
    fire: (c) => {
      const give = Math.max(0, Math.min(c.state.coin, c.varyPos(25, 0.4)));
      c.state.coin -= give;
      c.state.renown += 3;
      c.state.debts.push({ place: c.pick(PLACES), day: c.state.day });
      return `gave ${give} coin to a family with nothing at ${c.pick(PLACES)}. they will remember her. that may matter later.`;
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
      c.state.coin += c.varyPos(45, 0.4);
      c.state.wounds = Math.max(0, c.state.wounds - 1);
      return `someone she helped near ${d.place} took her in, fed her, and asked for nothing. she did not know what to do with that.`;
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
      const lines = [
        `heard in a taproom at ${c.pick(PLACES)}: the Barons are counting something, and it isn't coin.`,
        `a drunk at ${c.pick(PLACES)} said the cycle has turned before. he said it like a warning, not a story.`,
        `heard that a Blade Keeper passed through ${c.pick(PLACES)} a month ago, asking after her by a name she has not used in years.`,
      ];
      return c.pick(lines);
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
        return `she dreamed about ${g.name} again. she woke before dawn and walked until it was light.`;
      }
      c.drift('sociable', +0.02);
      return `heard ${g.name}'s name in a market at ${c.pick(PLACES)}. she did not go and look.`;
    },
  },
  {
    id: 'baron_moves',
    base: 3,
    sens: { reckless: +0.30, sociable: 0, generous: 0 },
    tags: ['baron', 'thread'],
    require: (s) => s.barons.attention >= 4,
    fire: (c) => {
      c.state.barons.attention += 1;
      c.state.flags.hunted = true;
      return `a Baron has taken an interest. there were men watching the inn at ${c.pick(PLACES)} and they were not trying to hide it.`;
    },
  },
];
