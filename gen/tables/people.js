// ROLL TABLES — names, factions, figures, languages, species.
//
// Same rule as systems.js: every row carries a constraining fact. A faction whose
// `here` could be swapped with any other faction's `here` is not a faction, it is
// a logo.

// ------------------------------------------------------------------- naming
// Assembled from parts so the tables stay small and the space stays large. Place
// names are rolled per SCALE, because a planet and a mining camp are not named by
// the same kind of person.
export const PLACE_NAMES = {
  planet:     ['Keshara', 'Ambril', 'Sunder', 'Vasht', 'Oren', 'Thal', 'Cinder', 'Mourne'],
  continent:  ['Vess', 'Karrow', 'the Long Reach', 'Ashwold', 'Tessa', 'the Spine', 'Hallow'],
  country:    ['{The} {Adj} {Body}', '{The} {Place}lands', '{The} {Body} of {Stem}', '{Stem}mark', '{The} {Stem} Directorate'],
  region:     ['{The} {Adj} {Land}', '{The} {Stem} Waste', '{Stem} Reach', '{The} {Land} of {Stem}'],
  city:       ['{Stem}hold', '{Stem}wake', '{Stem}mouth', '{Stem}gate', 'Old {Stem}', '{Stem} Bar'],
  town:       ['{Stem} Halt', '{Stem}bridge', 'Low {Stem}', '{Stem}ford', '{Stem}cross'],
};

export const NAME_PARTS = {
  The:   ['The'],
  Adj:   ['Kesharan', 'Sundered', 'Ashen', 'Quiet', 'Drowned', 'Iron', 'Hollow', 'Bitter', 'Long', 'Cold'],
  Body:  ['Directorate', 'Confederation', 'Concern', 'Assize', 'League', 'Crown', 'Ministry', 'March'],
  Land:  ['Waste', 'Marches', 'Fen', 'Reach', 'Steppe', 'Basin', 'Downs', 'Flats'],
  Place: ['Oath', 'Ash', 'Salt', 'Ember', 'Thirst', 'Mourn', 'Cinder', 'Vell'],
  Stem:  ['Vess', 'Kell', 'Ashra', 'Vell', 'Ottren', 'Serel', 'Mourn', 'Bittern', 'Vane', 'Ord', 'Thal', 'Rook', 'Sever', 'Halt'],
  // people, as name PARTS, so the global namer can assemble and reserve them the
  // same way it does places
  First: ['Ivo', 'Maren', 'Wren', 'Serel', 'Ottren', 'Kessa', 'Halven', 'Dree', 'Isolt', 'Corb', 'Nettle', 'Ansel', 'Sedge', 'Marla', 'Gethin', 'Oren', 'Halda', 'Piscet', 'Rendal', 'Tuck'],
  Last:  ['Serel', 'Vott', 'Kell', 'Brack', 'Orme', 'Sunder', 'Vane', 'Tally', 'Rook', 'Ord', 'Mourn', 'Sever'],
  Bare:  ['Old Wren', 'Nine-Finger', 'The Notary', 'Cold Marla', 'The Digger'],
};

export const PERSON_NAMES = {
  first: ['Ivo', 'Maren', 'Wren', 'Serel', 'Ottren', 'Ashra', 'Vell', 'Kessa', 'Halven', 'Dree', 'Isolt', 'Corb', 'Nettle', 'Ansel', 'Sedge', 'Marla', 'Gethin', 'Oren', 'Halda', 'Piscet'],
  last:  ['Serel', 'Vott', 'Kell', 'Brack', 'Orme', 'Sunder', 'Vane', 'Tally', 'Rook', 'Ord'],
  bare:  ['Old Wren', 'The Quiet', 'Nine-Finger', 'The Notary', 'Cold Marla'],
};

// ----------------------------------------------------------------- factions
// `here` is rolled PER APPEARANCE, not per faction — Rule 2, placement is scope.
// The same organisation is a smuggling ring in one country and a legal aid society
// in another, and that difference is the entire point of the faction system.
export const FACTIONS = [
  {
    id: 'hand', names: ['The Black Hand', 'The Open Palm', 'The Quiet Hand'],
    one_line: 'One name, five organisations, and only one of them knows',
    here: [
      'a smuggling ring moving unpermitted fuel',
      'a legal aid society and shadow parliament',
      'a diggers’ mutual-aid gang that kills company foremen',
      'a dining club that has not admitted a new member in forty years',
      'the only bank that will lend to a woman',
      'a name written on walls by children who have never met one',
    ],
  },
  {
    id: 'ministry', names: ['The Ash Ministry', 'The Registry', 'The Quiet Office'],
    one_line: 'Clerks who inherited a religion and kept the filing system',
    here: [
      'the state church, and the state, and the church',
      'a licensing office with the power to starve a town',
      'four men in a room with the only complete copy of the tax roll',
      'a charity, technically, and it does technically feed people',
    ],
  },
  {
    id: 'guild', names: ['The Guild of Kindlers', 'The Standing Watch', 'The Long Company'],
    one_line: 'Labour, organising, one strike away from mattering',
    here: [
      'labour, organising, one strike away from mattering',
      'the only people who know how the machines work, and they know it',
      'a veterans’ association that is arming, slowly, and legally',
      'a strike fund that is now larger than the treasury it is striking against',
    ],
  },
  {
    id: 'order', names: ['The Kept Vow', 'The Penitents', 'The Bleached'],
    one_line: 'They keep a promise nobody wants to be the one to break',
    here: [
      'a monastic order that has not spoken aloud in three generations',
      'the last people who can read the old contracts, and they are for hire',
      'mendicants who are fed by everyone and trusted by no one',
      'a vow-house where the oaths are stored physically, in a cellar',
    ],
  },
  {
    id: 'runners', names: ['The Under-Road', 'The Night Carriers', 'The Runners'],
    one_line: 'They move what the law says cannot move',
    here: [
      'a smuggling route that is now the only functioning postal service',
      'the people who get you out, and the price is not money',
      'a cartel that fixes the price of the thing it is illegal to sell',
    ],
  },
];

export const COMMAND = ['supreme', 'chapter', 'cell'];
export const RELATIONSHIP_TO_CENTER = [
  'loyal, resentfully',
  'unaware — they think they invented the name',
  'in open schism, and winning',
  'obedient, and the obedience is the problem',
  'nominally subordinate, financially dominant',
  'estranged; they still send the money',
];

// ------------------------------------------------------------------ figures
export const FIGURE_KNOWN_FOR = [
  'having calculated, in private, the exact year the fuel runs out',
  'humming the chord in her sleep. nobody taught it to her',
  'dressing like a notary. being a notary',
  'never having lost an argument, and having lost everything else',
  'signing a contract after the other party had died',
  'refusing a throne, twice, in writing',
  'knowing where the bodies are, and having put several there personally',
  'walking out of the Waste alone, which nobody does',
  'having been legally dead for eleven days and coming back with the ledger',
  'burning the only copy, and being thanked for it',
];

export const FIGURE_WANTS = [
  'to be believed', 'more', 'twenty more years', 'to be left alone, genuinely',
  'the debt paid, in full, by the right person', 'to see it fail before she dies',
  'a name on the building', 'to go home, which no longer exists',
  'to know what the chord is', 'nothing, and this is what frightens people',
];

export const FIGURE_ANYTHING_FOR = [
  'twenty more years', 'her son’s name off the list', 'one honest audit',
  'the refineries', 'a witness who will testify', 'the truth, and she is not ready for it',
];

export const DIVINE_FIGURES = [
  { name: 'Ashra', status: 'dead, forty years, and being burned', one_line: 'She threw herself into the Sundering to end a war', here: 'Every train and rifle runs on her. Worshipped and consumed on the same day, by the same people, without irony' },
  { name: 'Vell', status: 'alive, attentive', one_line: 'Keeps accounts. Does not punish — records, then makes the record true', here: 'Broken oaths fade your name from documents, then from mouths' },
  { name: 'Ottren', status: 'alive, hostile', one_line: 'Does not demand worship. Rewards it, immediately and generously, which is worse', here: 'His temples are full and his priests are frightened' },
  { name: 'The Quiet', status: 'silent', one_line: 'Has never spoken, intervened, or asked for anything', here: 'This frightens theologians more than the hostile one does' },
  { name: 'Orrun', status: 'ascended, recently, and it went badly', one_line: 'Was a man. There are people alive who owed him money', here: 'The paperwork of his mortal life is a live theological crisis' },
  { name: 'The Tally', status: 'alive, indifferent', one_line: 'Counts. Has never said what it is counting toward', here: 'Every temple has a number on the door and the numbers go up' },
];

// ---------------------------------------------------------------- languages
export const LANGUAGES = [
  { name: 'Old Liturgic', one_line: 'Spoken only in court and in cantment', here: 'liturgical; a witness who cannot speak it cannot swear' },
  { name: 'Trade Vessic', one_line: 'Everyone’s second language and nobody’s first', here: 'the language of contracts, and therefore of lies' },
  { name: 'The Chord', one_line: 'Not spoken. Heard, in the teeth, near the fall', here: 'nobody agrees it is a language and everybody learns it' },
  { name: 'Kell Cant', one_line: 'A thieves’ argot that became a literature', here: 'illegal to print, taught in every kitchen' },
];

export const SPECIES = [
  { name: 'the Rendered', one_line: 'People who worked the refineries too long', here: 'they are not sick. they are becoming the fuel, slowly, and legally they are still men' },
  { name: 'the Thawborn', one_line: 'Came out of the ice with the rest of it', here: 'they remember a country that no map has, and they are not lying' },
];
