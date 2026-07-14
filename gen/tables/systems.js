// ROLL TABLES — the systems.
//
// Authored ONCE by a model. Rolled against by code, forever. This is what makes the
// seed a real seed: no LLM runs at generation time, so the same seed gives the same
// world on any machine, offline, with no key anywhere near the repo.
//
// THE RULE THAT MAKES THIS TABLE WORTH ANYTHING (Part 0, constraint 2): every entry
// contains at least one CONSTRAINING FACT — a cost, a limit, a number, a
// prohibition, a casualty. "Magic is mysterious and powerful" is not a fact.
// "Costs the caster's voice, permanently" is. If you add an entry that could be
// deleted without changing what a player can do, it does not belong here.
//
// TO GROW: add rows. Never add a row that hedges. A weak row does more damage than
// a missing one, because the missing one shows up in the coverage report.

// ---------------------------------------------------------------------- eras
export const ERAS = [
  { name: 'The Ashen Century', analogue: '~1870s Earth', upheaval: 'a god was killed and left her body as burnable rock', trajectory: 'twenty years from a singularity nobody is ready for' },
  { name: 'The Long Thaw', analogue: '~1300s Earth', upheaval: 'the ice went back and uncovered what it had been keeping', trajectory: 'the ice is coming again and the almanacs disagree by a decade' },
  { name: 'The Quiet Restoration', analogue: '~1660s Earth', upheaval: 'the old dynasty was put back on a throne it no longer fits', trajectory: 'toward a war everyone can see and nobody will name' },
  { name: 'The Account', analogue: '~1930s Earth', upheaval: 'a debt came due that three countries had pretended was theoretical', trajectory: 'a generation that will be poorer than its parents and knows it' },
  { name: 'The Second Silence', analogue: '~800s Earth', upheaval: 'every temple stopped hearing anything, on the same night', trajectory: 'the priests are running out of ways to explain it' },
  { name: 'The Boom', analogue: '~1850s Earth', upheaval: 'something was found in the ground that pays better than farming', trajectory: 'it runs out in eleven years and four people have done the arithmetic' },
  { name: 'The Reckoning of Names', analogue: '~1790s Earth', upheaval: 'the registry burned and nobody can prove who owns what', trajectory: 'toward a settlement that will be enforced by whoever gets there first' },
  { name: 'The Grace', analogue: '~1000s Earth', upheaval: 'forty years without a war, which nobody alive knows how to use', trajectory: 'the first generation with no soldiers is inheriting the border' },
];

export const RECENT_UPHEAVAL_AGES = [8, 12, 20, 40, 60];

// ---------------------------------------------------------------- technology
export const TECH_KINDS = [
  'industrial + magic-driven', 'pre-industrial, water and muscle', 'clockwork and glass',
  'alchemical, no engines', 'salvage — nothing here was built here', 'bronze, and very good at it',
  'steam without steel', 'printing, powder, and not much else',
];

export const POWER_SOURCES = [
  { name: 'godash', what: 'refined divine remains', limit: 'finite, and the smoke is addictive' },
  { name: 'tidewood', what: 'timber that grew underwater and remembers it', limit: 'burns for a week and screams for the first hour' },
  { name: 'blackdamp', what: 'gas from the deep seams', limit: 'kills the men who cut it, at a known and accepted rate' },
  { name: 'thawfat', what: 'rendered from things the ice gave back', limit: 'the ice is not giving much back any more' },
  { name: 'coal, water, stubbornness', what: 'exactly what it says', limit: 'twelve tons for what a rival does with one' },
  { name: 'the standing current', what: 'a river that runs uphill and nobody asks why', limit: 'it has slowed 4% in a decade and the millers are lying about it' },
  { name: 'bound oath', what: 'promises, held under pressure', limit: 'a broken oath releases all of it at once, wherever it is stored' },
  { name: 'sunsalt', what: 'crystal that gives back heat it was shown years ago', limit: 'gives back exactly what it was given, and no more, ever' },
];

export const TECH_QUIRKS = [
  'no electricity — the world skipped it entirely',
  'long-running engines develop preferences',
  'every machine is a repair of an older machine nobody can build',
  'the good steel all comes from one valley and that valley knows it',
  'clocks are law: the state owns the time and sells it',
  'glass is cheaper than wood and the buildings show it',
  'nothing complicated survives more than one winter out here',
  'the guns work. the guns have always worked. nothing else does',
  'every bridge in the country was built by the same dead man',
  'writing is common; reading is a licensed profession',
];

// ------------------------------------------------------------------- magic
export const MAGIC_PREVALENCE = [
  { label: 'absent', rate: null },
  { label: 'rare', rate: '1 in 40,000 can learn it' },
  { label: 'uncommon', rate: '1 in 5,000 can learn it' },
  { label: 'common', rate: '1 in 400 can learn it' },
  { label: 'ubiquitous', rate: 'people catch it like weather' },
];

export const MAGIC_SOURCES = [
  'a god noticing you. dead gods notice louder',
  'inheritance, strictly — it cannot be taught and everyone keeps trying',
  'proximity to the place where the sky broke',
  'debt. someone owed you, and it has to come out somewhere',
  'having been legally dead for at least an hour',
  'the language itself — speak it well enough and it starts obeying',
  'grief, and only grief, and it stops when the grief does',
  'a bargain made by an ancestor you cannot name and cannot renegotiate',
  'drinking from the standing current, which most people do not survive',
  'being born during the eight minutes the year turns over',
  'the residue in the soil where the old works are',
  'nobody knows, and the three schools that claim to know all execute each other',
];

// SIXTY COSTS. This is the most important table in the engine. A model required to
// answer "what does this cost?" cannot write "an ancient and mysterious power" — it
// has to decide something, and the decision is the content.
export const MAGIC_COSTS = [
  'your voice, permanently',
  'you are slowly forgotten by everyone who loves you',
  'the fuel is finite and the smoke is addictive',
  'every working ages you a season, and it does not come back',
  'it takes a memory, and you do not get to choose which',
  'it works. it will always work. it is keeping a tally',
  'you must be owed something, and it spends the debt',
  'the residue attracts attention, and the attention is not human',
  'your name comes off documents first, then out of mouths',
  'it requires a witness, and the witness pays half',
  'a year of your life per working, paid up front, non-refundable',
  'you can never again be lied to, and this ruins you socially',
  'it costs blood, and specifically it costs someone else’s',
  'it is loud in a register you cannot hear and the dogs can',
  'you stop being able to sleep indoors',
  'each use makes the next one cheaper, and that is the trap',
  'you cannot cross running water afterward for nine days',
  'the working is permanent and cannot be undone by you or anyone',
  'it takes your capacity to be surprised, which you will miss',
  'it must be paid for in advance, and the creditor sets the price later',
  'you go grey — not your hair, all of you, to look at',
  'you owe the next person who asks you for help, absolutely',
  'it burns something irreplaceable and there is not much left',
  'you lose the ability to recognise faces, starting with the ones you love',
  'it needs silence, and afterwards there is rather more silence than you wanted',
  'every working writes your name somewhere you cannot read',
  'the thing you unmake stays unmade, including if it was load-bearing',
  'it eats a promise. if you have made none, it takes one on credit',
  'you get colder, permanently, about a degree a year',
  'the effect is real and the cause is billed to someone downstream',
  'it works best on the dying, which shapes who becomes a practitioner',
  'you cannot lie afterwards for a day, and the day is not negotiable',
  'it costs a tooth. it is always a tooth. nobody knows why',
  'the price is paid by whoever you were thinking about',
  'it draws on the caster’s future, and the future is not infinite',
  'each working leaves a mark, and the marks are being counted',
  'you must give it a true name, and it keeps the name',
  'it is illegal, and the penalty is that they refine your body afterwards',
  'you will be able to hear the chord for the rest of your life',
  'it fails if you are loved, which is a difficult thing to arrange around',
  'the working holds only while you are awake, and you do sleep',
  'it costs exactly what you can afford, which is how it knows you',
  'your shadow goes first, and people notice within the month',
  'it requires the consent of the thing being worked, and things do refuse',
  'you cannot use it twice in one place, ever, and the world is not that big',
  'you must be standing where it happened, and it happened somewhere terrible',
  'the god that grants it also grants it to your enemies, on request',
  'it makes you certain, and certainty is not the same as being right',
  'each use takes a year off someone in the room, and it picks',
  'it works only on what you have already lost',
  'the working is inherited by your children, whether or not they want it',
  'you have to mean it, and meaning it costs what meaning it costs',
  'it will not work for pay, and it will not work for free',
  'the price rises every year and nobody can find who is setting it',
  'it takes your sense of smell, then taste, then the rest, in order',
  'you must burn something you made, and the better it was the better it works',
  'it costs a witness their sanity, and they are always volunteers',
  'the residue is toxic, and it is dumped where the poor live',
  'you will never again be able to enter the place you were born',
  'it does not cost you. it costs the town, and the town does not know',
];

export const MAGIC_METHODS = [
  'spoken, in a dead tongue', 'burns fuel', 'silence and blood', 'written, then burned',
  'sung, badly, on purpose', 'drawn on the body', 'traded for', 'inherited and involuntary',
  'built into a machine and forgotten', 'walked — the route is the working',
];

export const MAGIC_EFFECTS = [
  'binds oaths', 'heat, force, industry', 'scrying, unmaking', 'healing, at a price',
  'the dead can be asked one question', 'weather, locally, badly', 'true names',
  'makes a thing what it is called', 'moves the boundary of a field, legally',
  'preserves — nothing rots inside it',
];

export const MAGIC_SOCIAL = ['respectable', 'patriotic', 'outlawed, ubiquitous', 'clerical only', 'a servant’s trade', 'aristocratic and useless', 'licensed, taxed', 'a hanging offence'];

export const MAGIC_LIMITS = [
  'cannot create food, cannot cure death, and every working leaves residue',
  'cannot cross salt water; the empire is built on this fact',
  'does not work on anything that has a name given by a mother',
  'nothing worked can be worked again — one shot per object, forever',
  'it cannot lie, so it cannot be used to deceive, so it is used to interrogate',
  'it fails in daylight, which has shaped the entire architecture',
  'cannot affect anything the caster has eaten or been fed by',
  'it works, but never twice the same way, and the schools have given up',
];

export const MAGIC_GOVERNANCE = [
  'state monopoly · burn-permits revocable without cause',
  'ungoverned — people catch it like weather',
  'guild-licensed, and the guild is three families',
  'temple-held; practising outside orders is heresy and heresy is capital',
  'legal, taxed at 40%, and the tax is the only thing anyone complies with',
  'banned, universally practised, prosecuted selectively against the poor',
  'a registered profession with an examination nobody passes honestly',
];

// ------------------------------------------------------------------- divine
export const DIVINE_ORIGINS = [
  'unknown — the gods arrived after the world did, and something made them',
  'they were people, and the paperwork survives',
  'they are the world; the split is a translation error nobody will correct',
  'made, on purpose, by a committee, whose minutes are in a vault',
  'there is one, and the rest are its opinions',
];

export const DIVINE_INTERACTION = ['direct but degraded', 'direct, and it is worse', 'silent for eight hundred years', 'through intermediaries who are themselves unsure', 'constant, petty, and legally binding'];
export const DIVINE_ASCENSION = ['possible, never confirmed', 'possible, and three have done it, and all three regret it', 'impossible, and the attempt is the crime', 'routine, and this is the problem', 'it is how all of them got there'];

// ------------------------------------------------------------------ economy
// FORCED SCARCITY: every economy must name who_pays_for_it. This is a validation
// rule, not a suggestion. An economy without a victim is a brochure.
export const ECONOMIES = [
  { resource: 'godash', export: 'refined godash', currency: 'burn-permits', rich: 'eleven refinery families', pays: 'the Waste diggers' },
  { resource: 'grain', export: 'bread, and soldiers', currency: 'stamped tin', rich: 'whoever holds the granary in a bad year', pays: 'the tenants, in the spring, before the harvest' },
  { resource: 'salt', export: 'salt, and the law about salt', currency: 'salt-notes', rich: 'the pan-holders, four of them', pays: 'anyone who must drink' },
  { resource: 'furs and ivory', export: 'warmth, to people who have never been cold', currency: 'weighed silver', rich: 'the factors, who never go north', pays: 'the trappers, who do' },
  { resource: 'iron', export: 'rails, guns, and obligation', currency: 'company scrip', rich: 'the Concern', pays: 'men who owe the Concern more than they can earn' },
  { resource: 'water', export: 'nothing — water does not leave', currency: 'water-roll credits', rich: 'whoever wrote the roll', pays: 'everyone struck off it' },
  { resource: 'amber, and what is in the amber', export: 'curiosities, at absurd margin', currency: 'letters of credit, honoured in three cities', rich: 'two auction houses', pays: 'the resin camps, in forty-year debts' },
  { resource: 'nothing — it is a crossroads', export: 'passage', currency: 'foreign coin, all of it, badly', rich: 'the toll-farmers', pays: 'everyone going anywhere' },
  { resource: 'oaths', export: 'enforcement', currency: 'the promise itself, which circulates', rich: 'the notaries', pays: 'whoever breaks one, eventually, in full' },
  { resource: 'salvage from the old works', export: 'things nobody can make', currency: 'barter, and it is exhausting', rich: 'the crews who got there first', pays: 'the crews who go now' },
];

export const AESTHETICS = [
  'soot, brass, cathedral-scale machinery, hymns sung over turbines',
  'rail smoke, wheat, wet stone',
  'heat shimmer, boomtowns, the chord you hear in your teeth',
  'salt glare, bleached wood, the sound of a queue',
  'peat smoke, black water, wool that never dries',
  'incense, ledgers, the particular quiet of a room where money is counted',
  'ice fog, dog-breath, iron that takes skin off',
  'green light through leaves, standing water, birds going up all at once',
  'lamp oil, paper, the smell of a courtroom',
  'red dust, sun-cracked paint, a well with a line at it',
];

// -------------------------------------------------------------- divergences
// PASS 2. Code finds the gap; this table supplies the WHY. Keyed by the SHAPE of the
// gap, because a country that is ahead of its world is a different story from one
// that is behind, and the reason has to know which it is.
export const DIVERGENCE_REASONS = {
  tech_ahead: [
    'they alone can refine the fuel, and it bought them twenty years',
    'they took the works intact when everyone else burned theirs',
    'one family has been buying engineers for sixty years and telling nobody',
    'they are not ahead. they are spending the future and the bill is dated',
    'a foreign power arms them, and the price has not been named yet',
    'they kept the archive. everyone else kept the relics',
  ],
  tech_behind: [
    'they chose it. every year they fall further behind, and every year they are more certain they were right',
    'the doctrine forbids the fuel, and the doctrine is load-bearing',
    'they were ahead. then the war, and then nobody who knew how',
    'the terrain will not take a rail and the terrain is not negotiable',
    'their neighbour sells them everything at a price that makes building it pointless',
    'the guild would have to be broken first, and nobody has the votes',
  ],
  magic_ahead: [
    'the ground here is soaked in it and nobody had to learn anything',
    'the school here never closed, because the war never came this far',
    'they are not better at it. there are simply more of them, and fewer of them last long',
  ],
  magic_behind: [
    'it was burned out of them within living memory and the ashes are still legally admissible',
    'the price here is higher, for reasons the priests will not discuss',
    'they can. they do not. the last time they did, this happened',
  ],
  wealth_ahead: [
    'they sit on the only road, and they charge for it',
    'they got there first and wrote the law on the way back',
    'the money is not theirs. they are holding it, and the owners are coming',
  ],
  wealth_behind: [
    'everything they dig up is owed before it leaves the ground',
    'the capital takes it, calls it a levy, and returns it as a road nobody asked for',
    'they were rich. one man made one decision, and they have not recovered',
  ],
  variance_low: [
    'identical liturgy in every temple on two continents — and they check',
    'one authority, one language, one price, and it has been that way for a century',
  ],
  variance_high: [
    'nobody has ruled all of it at once and nobody has stopped trying',
    'three legal systems overlap here and the overlap is where everyone lives',
  ],
};

// ------------------------------------------------------------------ history
export const WHY_IT_ENDED = [
  'they started the war the god died to stop',
  'the seam ran out, and the town was the seam',
  'a bad winter, then a worse spring, then nobody',
  'they were annexed, politely, over eleven years, by treaty',
  'the river moved. it did not ask',
  'plague, and then the quarantine, and the quarantine did the rest',
  'they won, and could not afford it',
  'the last of them left. it was not dramatic. they simply left',
];

export const BECAME = [
  'their clerks reorganised within a decade. same building, same ledgers, new god — and this one is dead and cannot object',
  'the survivors are a minority in their own country and it is on their papers',
  'a ruin people dig in, and a name people use for a kind of arrogance',
  'the neighbours split it and neither will admit the border is a compromise',
  'nothing. it is farmland. the farmers know, and do not care to discuss it',
  'a shrine, then a market, then a shrine again',
];
