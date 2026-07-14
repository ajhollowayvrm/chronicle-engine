// The lore layer. The engine knows mechanics; it does not know a single proper
// noun. Every name, place, myth, and line of prose comes from a lore pack, and a
// pack is generated per world (see bin/lore.js).
//
// WHY THE PACK IS FROZEN INTO THE JOURNAL
//
// Same reason the save is a journal of inputs (see game.js): replay runs on every
// page load. If prose were generated live, the day-5 line you read yesterday
// would say something different today, and the chronicle would stop being a
// chronicle. So the pack is an INPUT — chosen once at world creation, recorded by
// id, and never regenerated. The engine picks variants through `this.rng`, so the
// same seed + the same pack always writes the same words.
//
// The engine carries no canon and no continuity. There is a watching power that
// accrues attention; what it is CALLED is the pack's business. There is no cycle,
// no recurrence, and nothing survives her death — when she dies, the next life is
// a different world, freshly generated, connected to this one by nothing at all.

// ---------------------------------------------------------------- the manifest
//
// Every line the engine can ever ask for. This is the single source of truth:
// the engine reads it to validate a pack, and bin/lore.js reads it to write the
// generation prompt. Add an event to events.js -> add its slots here, or the
// pack that ships tomorrow won't have prose for it.
//
//   vars  - placeholders a template MAY use, as {name}
//   n     - how many variants to generate (pity suppression needs choices)
//   note  - what has just happened, mechanically. this is what the writer is told.

export const SLOTS = {
  quiet_road: { vars: ['place'], n: 46,
    note: 'Nothing happened. She walked, and earned a little coin, and the day closed. The baseline of her life — must not read as filler.' },

  quiet_camp_healed: { vars: [], n: 17,
    note: 'She made camp early and dressed her wounds. One is closing.' },
  quiet_camp_restless: { vars: [], n: 22,
    note: 'She made camp early with nothing to tend. She is restless when nothing hurts.' },

  ambush_triumph: { vars: ['place'], n: 6,
    note: 'Ambushed and won outright. Took their coin, gained renown, and liked it — this makes her MORE reckless.' },
  ambush_ruin_ally: { vars: ['place', 'ally'], n: 3,
    note: 'Ambushed and badly beaten. She is wounded and poorer, and {ally} took a blade meant for her.' },
  ambush_ruin: { vars: ['place'], n: 4,
    note: 'Ambushed and badly beaten. Wounded, and most of her coin is gone. This makes her more careful.' },
  ambush_scrape_ally: { vars: ['place', 'ally'], n: 15,
    note: 'Ambushed; she and {ally} fought back to back and came through it. The bond deepens.' },
  ambush_scrape: { vars: ['place'], n: 6,
    note: 'Ambushed alone and won, barely. One wound, some coin.' },

  sickness: { vars: ['place'], n: 17,
    note: 'Fever took her on the road. She walked through it, which was stupid.' },

  beast_maul: { vars: ['place'], n: 5,
    note: 'Something large came out of the dark and hurt her. She does not want to talk about it.' },
  beast_kill: { vars: ['place'], n: 16,
    note: 'She killed something large and sold the parts of it that would sell.' },

  patrol_defied: { vars: ['place'], n: 7,
    note: 'The {agents} of {power} stopped her and demanded their due. She refused. Word of that travels — {power} is now watching her more closely.' },
  patrol_paid: { vars: ['place', 'coin'], n: 9,
    note: 'The {agents} of {power} stopped her and took {coin} coin. She paid, and hated every coin of it.' },

  cache: { vars: ['place', 'coin'], n: 27,
    note: 'Found {coin} coin hidden in a ruin — and something small and human beside it that she did not take.' },
  relic: { vars: ['place'], n: 12,
    note: 'Pulled something out of the ground that should not be what it is. She has not sold it. {power} notices such things.' },
  work: { vars: ['place', 'coin'], n: 30,
    note: 'Honest work for a week. {coin} coin, a bed, and a wound that finally closed.' },

  stranger: { vars: ['name', 'place'], n: 13,
    note: 'A stranger named {name} appeared and attached themselves to her, armed and without explanation. This raises a judgment.' },

  companion_talk: { vars: ['ally'], n: 27,
    note: 'A quiet hour with {ally}. Something true passed between them. The bond deepens. Not sentimental — these two are hard people.' },
  companion_leaves: { vars: ['ally'], n: 7,
    note: '{ally} left in the night without a word. She pretended not to look for tracks.' },
  companion_dies_beloved: { vars: ['ally', 'place'], n: 3,
    note: '{ally}, who she loved, is dead. She carried the body before she buried it, and she has not been careful since.' },
  companion_dies_plain: { vars: ['ally', 'place'], n: 3,
    note: '{ally} is dead. She buried them and went on, and is telling herself that is the same as grieving.' },

  love: { vars: ['ally', 'place'], n: 4,
    note: 'She and {ally} sat past the fire\'s end and neither went to sleep. This raises a judgment.' },

  charity: { vars: ['place', 'coin'], n: 24,
    note: 'Gave {coin} coin to people with nothing. They will remember her. That may matter later.' },
  debt_repaid: { vars: ['place'], n: 15,
    note: 'Someone she once helped took her in, fed her, and asked for nothing. She did not know what to do with that.' },

  rumor: { vars: ['place'], n: 23,
    note: 'Something overheard that widens the world — a hint about {power}, or about what it is really counting. Ominous, oblique, never explained. Do NOT imply recurrence, past lives, or prophecy: this world has no cycle and no destiny.' },

  ghost_dead: { vars: ['ghost'], n: 3,
    note: 'She dreamed about {ghost}, who is dead. She woke before dawn and walked until it was light.' },
  ghost_gone: { vars: ['ghost', 'place'], n: 14,
    note: 'She heard {ghost}\'s name in a market. {ghost} is alive and gone. She did not go and look.' },

  power_moves: { vars: ['place'], n: 10,
    note: '{power} has taken a direct interest. There were {agents} watching the inn and they were not trying to hide it.' },

  death: { vars: ['name', 'day', 'place'], n: 3,
    note: '{name} died on day {day}. Flat, factual, no comfort, no hint of anything after. She does not come back. One line.' },
};

// Judgments carry prompt variants and per-option label + result lines.
//
// `prompt` in a PACK is a list, not a string. This is the line the player is
// looking at while they decide, and `trust` is raised ~13 times in a long life —
// one fixed sentence there is the most-read repetition in the game. `label` stays
// a single string: it is a button, and a button that renames itself is a bug.
export const JUDGMENT_SLOTS = {
  trust: {
    vars: ['name', 'place'],
    n: 10,
    prompt: 'Ask the player what {name}\'s standing is. {name} has walked beside her since {place} and shows no sign of leaving.',
    options: {
      trust: { n: 12, label: 'Take them in fully', note: 'She told {name} her real name. That is not nothing, for her.' },
      wary: { n: 12, label: 'Keep them at a distance', note: '{name} walks half a pace behind her now. She likes it that way. She thinks she likes it that way.' },
      send: { n: 12, label: 'Send them away', note: 'She sent {name} back down the road, and watched until they were out of sight, which she would deny.' },
    },
  },
  love: {
    vars: ['ally'],
    n: 4,
    prompt: 'Ask the player whether she lets herself love {ally}. Something has changed between them.',
    options: {
      yes: { n: 6, label: 'Let her have it', note: 'She let it happen. She is more careful now, and she is furious about that.' },
      no: { n: 6, label: 'She has work to do', note: 'She said nothing and let the moment go past. {ally} understood, which was worse.' },
    },
  },
};

// ------------------------------------------------------------------- regions
//
// A world is not a flat bag of place names. It is a handful of REGIONS, and she
// is standing in exactly one of them. The engine knows a region only as numbers:
// a pool of places to draw {place} from, a set of weight multipliers by event
// TAG, and a wealth scalar on what she can earn there. The pack supplies what any
// of it is called.
//
// This is what makes the geography free. `{place}` only ever draws from the
// region she is actually in, so all 391 existing lines re-colour themselves as
// she moves — "ambushed at Slagmouth" in the mining country, "ambushed at
// Stiltmarket" up in the canopy — with no per-region rewrite of the whole pack.
// Only arrival and departure need their own prose, and those live on the region.
//
//   traits  - multiplier per event tag. 1 = as anywhere. >1 likelier, <1 rarer.
//             a floor applies (see weightsFor): a region shifts texture, it never
//             deletes a genre, same rule the dials live under.
//   wealth  - scales what she EARNS here, not what she is charged.
export const REGION_SLOTS = {
  arrive: { vars: ['region', 'place', 'from'], n: 5,
    note: 'She has crossed into {region} and is standing in it. What the place is like, in her eyes, on arrival. Not a travelogue — she is not a tourist.' },
  depart: { vars: ['region', 'place', 'to'], n: 5,
    note: 'She is leaving {region} for {to}. The crossing itself: what it costs her, what she is walking away from.' },
};

export const REGION_TAGS = [
  'quiet', 'rest', 'danger', 'combat', 'power', 'fortune',
  'thread', 'town', 'people', 'loss', 'bond', 'travel',
];

// ------------------------------------------------------------------ polities
//
// A country is a set of RULES over the regions it owns, not a bigger word for
// "region". If a polity is only a label, a border is only a line, and crossing it
// means nothing the player can feel. So a polity owns law:
//
//   toll  - how hard its patrols press. scales both how often `patrol` fires and
//           what it takes off her.
//   tax   - a cut of what she EARNS inside its borders. this is what makes a poor
//           free city worth more to her than a rich kingdom.
//   zeal  - how hard the watching power's agents push here. scales attention.
//   outlaws - faction ids that are illegal in this country. being a known friend
//           of one of them here is dangerous, and she does not get to explain.
//
// And a polity holds RELATIONS with its neighbours — war, trade, or a cold
// standoff. A region that borders a country you are at war with is a different
// place to walk than an interior one, and that is what gives travel weight.
export const POLITY_RELATIONS = ['war', 'trade', 'cold'];

export const POLITY_SLOTS = {
  cross: { vars: ['polity', 'place', 'from'], n: 5,
    note: 'She has crossed a frontier into {polity}. What changes: the law, the coin, the way the guards look at her. Not a travelogue.' },
  law: { vars: ['polity', 'place'], n: 11,
    note: 'The law of {polity}, experienced rather than described — a rule she runs into, a thing she cannot do here that she could do a week ago.' },
};

// The world moves while she is in it. A history event does not narrate itself at
// her from a great height — she FINDS OUT, standing somewhere, usually late and
// from someone who is frightened. A chronicle is not a newsfeed.
export const HISTORY_SLOTS = {
  war_declared: { vars: ['polity', 'other', 'place'], n: 4,
    note: '{polity} and {other} are at war as of this week. She heard at {place}. The roads between them are about to become something else.' },
  peace_made: { vars: ['polity', 'other', 'place'], n: 4,
    note: '{polity} and {other} have stopped fighting. Nobody is happy. The people who did well out of it are the quietest.' },
  ruler_dies: { vars: ['polity', 'place'], n: 4,
    note: 'Whoever ruled {polity} is dead. Nothing has changed yet, which is the frightening part.' },
  tolls_raised: { vars: ['polity', 'place'], n: 5,
    note: '{polity} has put its tolls up, overnight, without explanation. Everyone at {place} is doing arithmetic and going quiet.' },
  faction_outlawed: { vars: ['polity', 'faction', 'place'], n: 4,
    note: '{polity} has outlawed {faction}. There were notices up at {place} by morning. If she is known to them, this is now about her.' },
};

// ------------------------------------------------------------------ factions
//
// Who is keeping score on her, besides the watching power. A faction is, to the
// engine, three numbers and a grudge list:
//
//   wants   - event id -> standing delta. THIS IS THE WHOLE MECHANISM. An
//             almsgiving order warms to her every time `charity` fires and cools
//             every time she walks past; a ring of smugglers warms when she
//             defies a patrol and cools when she pays one. She never chooses a
//             faction directly — she is scored on what she actually does, which
//             is the same trick `true` plays on `intent`.
//   rivals  - taking a place with one costs you standing with these.
//
// Standing runs -20..+20. Past +STANDING_OFFER they offer her a place (a
// judgment). Past +STANDING_FRIEND they shelter her. Past -STANDING_ENEMY they
// hunt her, which is a whole danger family the player brought on themselves.
// Tuned against the allegiance matrix, not guessed. At OFFER 12 a reckless woman
// died before anybody got round to recruiting her — 95% of reckless lives ended
// sworn to nobody, which meant the faction built ON recklessness could never
// actually land. Her life is short; the offer has to reach her inside it.
export const STANDING_OFFER = 9;
export const STANDING_FRIEND = 6;
export const STANDING_ENEMY = 8;

// ------------------------------------------------------------------- schools
//
// The thing this game has never had: somewhere for the coin to GO, and a way for
// her to get better at being alive. `CLAUDE.md` has listed "coin is a dead
// number" as the number-one known problem since the beginning — she ends every
// run with a thousand-odd coin and nothing to spend it on, which quietly drains
// the stakes out of every fortune event in the table.
//
// A school takes her money and a piece of her year and teaches her ONE of these
// four things. The engine knows the four; the pack decides who teaches them and
// what they are called. Cost escalates per level, so a third mastery is a real
// fortune and she has to choose.
export const SKILLS = {
  blade:    'She fights better. Ambushes and beasts break her way more often than they used to.',
  mend:     'She heals. Wounds stop being things she carries around for a month.',
  scavenge: 'She finds more, and she finds it worth more.',
  road:     'The country stops killing her. Crossings cost less and the fevers take less out of her.',
};
export const SCHOOL_MAX = 3;

export const SCHOOL_SLOTS = {
  prompt: { vars: ['school', 'place', 'coin'], n: 4,
    note: 'The {school} will teach her, for {coin} coin and a season of her life. Ask the player whether she spends it. She has never paid to be taught anything.' },
  train: { vars: ['school', 'place', 'coin'], n: 4,
    note: 'She paid the {school} and learned. Hard, humbling, and worth it. She is better at this now, and she knows it.' },
  refuse: { vars: ['school', 'place', 'coin'], n: 4,
    note: 'She kept her {coin} coin and walked past the {school}. Pride, or thrift, or fear of being a beginner at anything.' },
};

export const FACTION_SLOTS = {
  shelter: { vars: ['faction', 'place'], n: 5,
    note: 'The {faction} took her in — fed her, hid her, asked nothing. She is safer here than anywhere, and it costs her something to accept it.' },
  hunted: { vars: ['faction', 'place'], n: 5,
    note: 'The {faction} came for her. She has made an enemy and it has found her. Violent, and personal in a way a bandit never is.' },
  favour: { vars: ['faction', 'place'], n: 4,
    note: 'A small kindness from the {faction} — a door left open, a word in the right ear. They are courting her, and both parties know it.' },
};

export const ALLEGIANCE_SLOTS = {
  prompt: { n: 5,
    note: 'The {faction} have offered her a place among them. Ask the player whether she takes it. This is a real cost: their enemies become hers.' },
  join: { n: 5, label: 'Take the place',
    note: 'She is one of the {faction} now. Their enemies are hers. She has never belonged to anything and does not know how to hold it.' },
  refuse: { n: 5, label: 'She belongs to nobody',
    note: 'She turned the {faction} down. They took it well, which is not the same as taking it kindly.' },
  use: { n: 5, label: 'Take the help, not the collar',
    note: 'She took what the {faction} offered and gave nothing back. It will work, for a while. They are not fools.' },
};

// ---------------------------------------------------------------- validation

export function validatePack(pack) {
  const bad = [];
  if (!pack || typeof pack !== 'object') return ['not an object'];
  if (pack.v !== 1) bad.push(`unknown pack version: ${pack.v}`);
  if (!pack.id) bad.push('missing id');
  // `agents` is plural ("waterwrights"), `agent` is one of them ("waterwright").
  // Both, because prose needs both: "there were {agents} outside the inn" and
  // "a {agent} sat down across from her". Without the singular every pack writes
  // "a waterwrights sat down", which is what the first one did.
  if (!pack.power?.name || !pack.power?.agents || !pack.power?.agent) {
    bad.push('missing power.name / power.agents (plural) / power.agent (singular)');
  }
  if (!pack.title) bad.push('missing title');
  if (!Array.isArray(pack.names) || pack.names.length < 8) bad.push('needs at least 8 names');
  // the adventurer is always "she"; `names` is the whole population and includes
  // men. without a `heroines` pool she can end up called Torvald.
  if (!Array.isArray(pack.heroines) || pack.heroines.length < 4) bad.push('needs at least 4 heroines (names she can be given)');

  // there is no flat `places` list any more — places belong to a region, because
  // where she is standing is the whole point of having regions at all
  if (!Array.isArray(pack.regions) || pack.regions.length < 3) {
    bad.push('needs at least 3 regions');
  } else {
    const ids = new Set();
    pack.regions.forEach((r, i) => {
      const at = r?.id ?? `regions[${i}]`;
      if (!r?.id) bad.push(`region ${i} has no id`);
      else if (ids.has(r.id)) bad.push(`duplicate region id "${r.id}"`);
      else ids.add(r.id);
      if (!r?.name) bad.push(`region "${at}" has no name`);
      if (!Array.isArray(r?.places) || r.places.length < 4) bad.push(`region "${at}" needs at least 4 places`);
      if (r?.traits) {
        for (const [tag, v] of Object.entries(r.traits)) {
          if (!REGION_TAGS.includes(tag)) bad.push(`region "${at}" has an unknown trait tag "${tag}"`);
          if (typeof v !== 'number' || v <= 0) bad.push(`region "${at}" trait "${tag}" must be a positive number`);
        }
      }
      if (r?.wealth != null && (typeof r.wealth !== 'number' || r.wealth <= 0)) {
        bad.push(`region "${at}" wealth must be a positive number`);
      }
      for (const [slot] of Object.entries(REGION_SLOTS)) {
        const lines = r?.lines?.[slot];
        if (!Array.isArray(lines) || !lines.length) bad.push(`region "${at}" has no "${slot}" lines`);
        else if (lines.some((l) => typeof l !== 'string' || !l.trim())) bad.push(`region "${at}" has an empty "${slot}" line`);
      }
    });
  }

  // Polities are OPTIONAL, and a region may deliberately belong to none — an
  // unclaimed country is one of the most interesting places on a map, because it
  // is the only ground where no law reaches her.
  if (pack.polities != null) {
    if (!Array.isArray(pack.polities)) bad.push('polities must be a list');
    else {
      const pids = new Set(pack.polities.map((p) => p?.id).filter(Boolean));
      for (const p of pack.polities) {
        const at = p?.id ?? '(unnamed polity)';
        if (!p?.id) bad.push('a polity has no id');
        if (!p?.name) bad.push(`polity "${at}" has no name`);
        for (const k of ['toll', 'tax', 'zeal']) {
          if (p?.laws?.[k] == null || typeof p.laws[k] !== 'number' || p.laws[k] < 0) {
            bad.push(`polity "${at}" needs a non-negative laws.${k}`);
          }
        }
        if (p?.laws?.tax > 0.5) bad.push(`polity "${at}" taxes over half her earnings — nobody would walk in`);
        for (const [other, rel] of Object.entries(p?.relations ?? {})) {
          if (!pids.has(other)) bad.push(`polity "${at}" has a relation with "${other}", which is not in this world`);
          if (!POLITY_RELATIONS.includes(rel)) bad.push(`polity "${at}" has an unknown relation "${rel}"`);
        }
        for (const [slot] of Object.entries(POLITY_SLOTS)) {
          if (!Array.isArray(p?.lines?.[slot]) || !p.lines[slot].length) bad.push(`polity "${at}" has no "${slot}" lines`);
        }
      }
      for (const r of pack.regions ?? []) {
        if (r.polity != null && !pids.has(r.polity)) {
          bad.push(`region "${r.id}" is claimed by "${r.polity}", which is not a polity in this world`);
        }
      }
      // if the world has countries, it has to be able to tell her when they move
      for (const [slot] of Object.entries(HISTORY_SLOTS)) {
        const lines = pack.history?.[slot];
        if (!Array.isArray(lines) || !lines.length) bad.push(`no history lines for "${slot}" — the world cannot change`);
      }
    }
  }

  if (!Array.isArray(pack.factions) || pack.factions.length < 2) {
    bad.push('needs at least 2 factions — one faction is not a politics, it is a landlord');
  } else {
    const fids = new Set(pack.factions.map((f) => f?.id).filter(Boolean));
    for (const f of pack.factions) {
      const at = f?.id ?? '(unnamed faction)';
      if (!f?.id) bad.push('a faction has no id');
      if (!f?.name) bad.push(`faction "${at}" has no name`);
      if (!f?.wants || !Object.keys(f.wants).length) {
        bad.push(`faction "${at}" wants nothing — then it cannot keep score, and it does not exist`);
      } else {
        for (const [ev, d] of Object.entries(f.wants)) {
          if (typeof d !== 'number' || d === 0) bad.push(`faction "${at}" wants "${ev}" by a non-number or zero`);
        }
      }
      for (const r of f?.rivals ?? []) {
        if (!fids.has(r)) bad.push(`faction "${at}" names a rival "${r}" that is not in this world`);
        if (r === f.id) bad.push(`faction "${at}" is its own rival`);
      }
      for (const [slot] of Object.entries(FACTION_SLOTS)) {
        const lines = f?.lines?.[slot];
        if (!Array.isArray(lines) || !lines.length) bad.push(`faction "${at}" has no "${slot}" lines`);
      }
      for (const [slot] of Object.entries(ALLEGIANCE_SLOTS)) {
        const lines = f?.allegiance?.[slot];
        if (!Array.isArray(lines) || !lines.length) bad.push(`faction "${at}" has no allegiance "${slot}" lines`);
      }
    }
  }

  if (!Array.isArray(pack.schools) || !pack.schools.length) {
    bad.push('needs at least one school — otherwise coin has nowhere to go, which is the oldest bug in this repo');
  } else {
    const taught = new Set();
    for (const sc of pack.schools) {
      const at = sc?.id ?? '(unnamed school)';
      if (!sc?.id) bad.push('a school has no id');
      if (!sc?.name) bad.push(`school "${at}" has no name`);
      if (!SKILLS[sc?.teaches]) {
        bad.push(`school "${at}" teaches "${sc?.teaches}", which the engine cannot do. one of: ${Object.keys(SKILLS).join(', ')}`);
      } else taught.add(sc.teaches);
      if (typeof sc?.cost !== 'number' || sc.cost <= 0) bad.push(`school "${at}" needs a positive cost`);
      if (sc?.region && !(pack.regions ?? []).some((r) => r.id === sc.region)) {
        bad.push(`school "${at}" sits in region "${sc.region}", which is not in this world`);
      }
      for (const [slot] of Object.entries(SCHOOL_SLOTS)) {
        const lines = sc?.lines?.[slot];
        if (!Array.isArray(lines) || !lines.length) bad.push(`school "${at}" has no "${slot}" lines`);
      }
    }
    // a skill nobody teaches is a skill that cannot be learned — dead mechanics,
    // the same failure as a slot nobody can reach
    for (const k of Object.keys(SKILLS)) {
      if (!taught.has(k)) bad.push(`nobody in this world teaches "${k}" — that skill is unreachable`);
    }
  }

  for (const slot of Object.keys(SLOTS)) {
    const lines = pack.lines?.[slot];
    if (!Array.isArray(lines) || lines.length === 0) { bad.push(`no lines for "${slot}"`); continue; }
    if (lines.some((l) => typeof l !== 'string' || !l.trim())) bad.push(`empty line in "${slot}"`);
  }

  for (const [key, spec] of Object.entries(JUDGMENT_SLOTS)) {
    const j = pack.judgments?.[key];
    // a lone string is still accepted — the engine picks from a list or takes the
    // string as-is — but a pack that ships one prompt will read as a stutter
    const prompts = Array.isArray(j?.prompt) ? j.prompt : j?.prompt ? [j.prompt] : [];
    if (!prompts.length) { bad.push(`no prompt for judgment "${key}"`); continue; }
    if (prompts.some((p) => typeof p !== 'string' || !p.trim())) bad.push(`empty prompt in judgment "${key}"`);
    for (const opt of Object.keys(spec.options)) {
      const o = j.options?.[opt];
      if (!o?.label) bad.push(`judgment "${key}" option "${opt}" has no label`);
      if (!Array.isArray(o?.lines) || !o.lines.length) bad.push(`judgment "${key}" option "${opt}" has no lines`);
    }
  }
  return bad;
}

// A template is "walked {place}. nothing happened." The pack-level nouns
// ({power}, {agents}) are always in scope; the rest come from the caller.
export function fill(template, pack, vars = {}) {
  const all = {
    power: pack.power.name,
    agents: pack.power.agents,
    agent: pack.power.agent,
    ...vars,
  };
  return template.replace(/\{(\w+)\}/g, (whole, key) =>
    // an unknown placeholder is a bug in the pack, not a crash in the game:
    // leave it visible so it shows up in review instead of throwing at a player
    Object.prototype.hasOwnProperty.call(all, key) ? String(all[key]) : whole
  );
}
