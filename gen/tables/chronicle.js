// ROLL TABLES — the chronicle. What a day in this world looks like from inside it.
//
// THE BARGAIN THIS FILE MAKES, and it is the whole reason the seed engine exists:
// there is ONE pool of lines, shared by every world that will ever be generated.
// The old design hand-wrote 391 lines per world and that is why it only ever had
// one world. Here the lines are world-AGNOSTIC and the vocabulary is world-SPECIFIC,
// so a line about hauling {commodity} for {pays} is native in a salt desert, a
// mining republic, and a drowned forest, because the tree fills in what those words
// mean HERE.
//
// Vocabulary, resolved at render time from the place she is standing in — which
// means the same line re-colours itself as she walks:
//
//   {place}  where she is            {country}  who rules it (or nobody)
//   {commodity} what it produces     {pays}     who the economy is paid for by
//   {rich}   who holds the money     {currency} what they pay each other IN
//   {house}  the faction that operates here, by name
//   {power}  the god over this ground {working} the magic they use here, by name
//   {cost}   what that working takes  {quirk}   a fact about its machines
//   {coin}   a number
//
// {power}, {working} and {house} are chosen by HASHING THE PLACE NAME, never rolled. The
// god over a country does not change between one sentence and the next — and it used to,
// because vocab() called pick() on every render, which is exactly why the world felt
// arbitrary. A detail that changes when nothing has happened is not a fact, it is noise
// wearing a fact's clothes.
//
// THE VOICE: lowercase. terse. the interior revealed obliquely and usually
// self-deceiving. never sentimental. And every line must carry a FACT — a cost, a
// number, a limit, a casualty. A line that could be deleted without changing what
// the player knows does not belong here.

export const CHRONICLE = {
  // ------------------------------------------------------------------ the road
  // EVERY LINE CARRIES A FACT. The first version of this pool broke its own rule harder
  // than any other: sixteen lines of weather and mood, in which nothing was priced, nobody
  // was named, and nothing was true of THIS country that was not true of every other. It is
  // the pool that fires most often, so it was most of what the player ever read — which is
  // why the whole chronicle felt like it was about nowhere.
  road: [
    'a long day out of {place}. she followed a cart of {commodity} for six miles and could not get past it, and stopped minding around the third.',
    '{place}. she sat against a wall for an hour and watched {pays} go by, and counted them, and stopped counting.',
    'a day on the road out of {place} and nothing in it but the walking. bread has gone up again. it is always {pays} who notice first.',
    'she walked {place} end to end. every third door has {house}’s mark on it, and nobody she asked would say what the mark means.',
    'she crossed {place} in a day. they price everything here in {currency}, and she has not worked out yet who decides what it is worth.',
    'a slow day in {place}, where {quirk}. she has stopped finding that strange, and noticed that she has stopped.',
    'she made twenty miles out of {place} and felt almost young, and paid for it in the morning, and has stopped pretending she does not.',
    '{place}, and a hard wind all day, and grit in everything she owns, and {commodity} dust in the water.',
    'she passed the bones of something big outside {place}, picked clean. nobody had taken the metal. that told her more than the bones did.',
    'she spoke to nobody for four days out of {place}. she noticed on the fourth. that is longer than it used to take.',
    'nothing in {place} but people going somewhere else. she stood in the road and let all of them past, and none of them were going the way she is.',
    'she mended her boots badly in {place}. leather costs what a week costs here, and she is not spending a week on her feet.',
    'a day of waiting in {place} for a road that {house} had closed, and would not say why, and opened again at dusk.',
    'she counted what she has left, in {place}. she counted it twice. the number did not improve, and the price of everything here is set by {rich}.',
  ],

  // --------------------------------------------------------------------- work
  work: [
    'a week hauling {commodity} at {place}. {coin} coin, a bed, and a wound that finally closed.',
    'she cut {commodity} at {place} for {coin} coin. her back is ruined and everything else is better.',
    '{coin} coin for eight days at {place}, standing behind a man who could afford not to stand there himself.',
    'honest work at {place}: {coin} coin, a roof, and a week with no knife in it.',
    'she loaded {commodity} at {place} for {coin} coin and ate three times a day, and it frightened her a little.',
    'a week at {place} for {coin} coin. they wanted her back. she said maybe, and meant it, which is new.',
    'she dug at {place} for {coin} coin, alongside {pays}, and they did not talk about who was getting the rest of it.',
    '{coin} coin at {place}. she worked beside {pays} all week and could not look at them by Friday.',
    'she guarded a store of {commodity} at {place} for {coin} coin. nobody came. she slept indoors and healed.',
    '{coin} coin from {house} at {place}, for eight days of work they would not describe and she did not ask about.',
    'she was paid {coin} coin at {place}, in {currency}, which is worth what {rich} says it is worth on the day they hand it to you.',
    'work at {place}, {coin} coin, and on the last night she packed early, because she could feel herself settling.',
    'she was paid {coin} coin at {place} and it was short, and she counted it in front of him, and he did not blink.',
    'a fortnight at {place}. {coin} coin. she is good at this and does not know what to do with that information.',
  ],

  // ---------------------------------------------------------------------- law
  // Rendered when the LAW of the place she is standing in presses on her. The law is
  // not a fact about the world, it is a fact about the ground under her feet.
  law: [
    'they wanted her name at {place}, and a reason, and a fee for the reason. she gave all three and has been in a temper since.',
    'she could not sell what she was carrying at {place} without a licence, and the licence cost more than the thing was worth, which is the point of a licence.',
    'a clerk at {place} explained the statute to her, patiently, twice, and charged her {coin} coin for the explanation.',
    'they weighed her load at {place} and taxed it by weight, and the stone they weighed it with was theirs.',
    '{coin} coin at {place}, for the privilege of walking on a road. she paid.',
    'she was fined {coin} coin at {place} for a thing she had already paid for. she paid the fine. she paid for the receipt.',
    'the law at {place} is a man with a spear, and it depends entirely on which man, and today it was that one.',
    'they took {coin} coin at {place} and called it a levy. it goes to {house}. there is nobody to complain to. she checked.',
    'she was made to convert what she had into {currency} at {place}, at a rate {rich} set this morning, and it will be a different rate tomorrow.',
    'a clerk at {place} would not let her pass without a stamp from {house}, and {house} do not stamp anything on a {power}-day.',
    'at {place} a boy was taken up for carrying unmarked {commodity}. she watched, and did nothing, and has been arguing with herself since.',
    'she was told at {place} she could not stay four nights without a residency. she left on the third, out of spite.',
    'they hanged a man at {place} while she was buying bread. nobody stopped buying bread.',
    '{coin} coin to {rich} at {place}, for nothing she can name, and everyone else in the queue paid it too.',
  ],

  // ------------------------------------------------------------------ defiance
  defy: [
    'they asked for their due at {place}. she told them what she thought of that. word of it travels, and it travels to {power}.',
    'they put a hand on her pack at {place}. she took the hand off it. one of them wrote something down.',
    'she refused them at {place}, in front of forty people, and enjoyed it, and has been watching the road behind her since.',
    'she was stopped at {place} and asked for the tithe and said no, plainly, once, and walked on. nobody stopped her. that is not the same as nobody minding.',
    'she talked her way out of paying at {place} and it worked, and she has never seen a man look so patient. that patience is a thing she thinks about.',
    'she would not sign at {place}. they closed the book, and smiled, and told her the offer would not be made twice.',
  ],

  // ----------------------------------------------------------------- the find
  find: [
    '{coin} coin under a flagstone at {place}, in a pot, with a milk tooth beside it. she took the coin and put the tooth back.',
    'she found {coin} coin in the wall of a dead house at {place}. there was a ring with it. she left the ring.',
    '{coin} coin in a jar at {place}. somebody buried it meaning to come back. she thought about that for a mile and then stopped.',
    'she found {coin} coin at {place}, in a house where the table was still laid.',
    '{coin} coin at {place}, and a name scratched inside the lid, and she has not been able to stop reading it.',
    'she turned up {coin} coin at {place} and a knife better than hers, with a woman’s name on the grip. she left the knife.',
    '{coin} coin, hidden well at {place}. whoever hid it did not come back, and she is walking on, and she is aware those are the same sentence.',
    'she dug {coin} coin out of the old works at {place}. the flies will not go near the hole she made.',
  ],

  relic: [
    'she pulled something out of the ground at {place} that is the wrong weight for its size. she has not sold it. she has not shown it to anyone.',
    'a thing from under {place} that is warm when nothing else is. it is in her pack. she has decided nothing about it.',
    'she found something at {place} that the flies will not land on. {power} counts these things.',
    'a {working} charm, in a wall at {place}. she knows what it costs — {cost} — and she has not put it down.',
    'she has a thing from {place} that she does not like to touch and will not put down.',
    'she took something from the works at {place} that has not stopped being heavy. she knows what that attracts. she kept it.',
  ],

  // ------------------------------------------------------------------- danger
  // Fires where the DIVERGENCE is steepest — the exception has to be held down by
  // somebody, and she is walking through the part where the holding happens.
  danger: [
    'four men at {place}, and she was wrong about every one of them. she crawled out of it.',
    'ambushed at {place}. she came away with a cut, their coin, and no particular feeling about it.',
    'it was close at {place}, and there was nobody to be close with, and she noticed.',
    'they took her at {place} and left her with nothing but the walk to the next town. she was a long time getting up.',
    'a fight at {place} she should not have won, and did, and she is not asking why too loudly.',
    'something came out of the dark at {place} and opened her arm to the bone. she will not say what it was. she may not know.',
    'she was set on at {place} by men who were angrier than they were skilled. she got out of it. she has not slept since.',
    'three of them tried her outside {place} and it was finished before the third had his knife up. she has been in a good mood since, and knows what that says about her.',
  ],

  unrest: [
    'they are striking at {place}. there are men in the square who are not from here, and {rich} paid for them.',
    'the bread went up again at {place} and a woman put a window through, and everyone agreed she was right, and nobody helped her afterwards.',
    'there was a crowd at {place} and it had not decided yet what it was. she left before it did.',
    'they have started burning things at {place}. not buildings yet.',
    'the {commodity} price broke at {place} and {rich} were out of the city by the afternoon, which is how everybody else found out.',
    'they are striking against {house} at {place}. {house} have not answered, and the not-answering is the answer.',
    'a man at {place} said out loud what everyone here thinks, and he was taken up for it, and the taking-up was the loudest thing that has happened in years.',
    'the whole of {place} is waiting for something, and nobody will say what, and the waiting is doing the damage on its own.',
  ],

  // ------------------------------------------------------------------ the sick
  sick: [
    'fever took her at {place} and she walked through it, because stopping costs money. that was stupid, and she knew it while she did it.',
    'she was sick three days out of {place} and does not remember two of them.',
    'something in the water at {place}. she was down a day and up too early, and paid for it for a week.',
    'she woke at {place} unable to stand, and stood.',
    'she has been coughing since {place} and telling people it is the dust. it may be the dust.',
  ],

  rest: [
    'she made camp early outside {place} and let a wound have the air. it is closing. she checked it twice, which is once more than necessary.',
    'she took a room in {place}. it cost her a day’s work, in {currency}, and she slept as though she had been hit.',
    'she stopped early and could not settle. she walked the perimeter three times. there was no perimeter.',
    'nothing hurts. she cleaned a knife that was already clean, and listened to {house} moving people through the yard all night.',
    'she is not wounded, not hungry, not hunted. she sat up in {place} until the fire went out, looking for the catch.',
    'she slept nine hours in {place} and woke furious with herself, and better.',
    'a day off her feet at {place}. they are burning {commodity} in the square for {power} and it goes on until dawn, and she slept through it.',
  ],

  // NOTE: `figure_meet` and `figure_clash` used to live here. They are gone, and the
  // dead-pool test is what caught them: meeting a person is no longer a generic line
  // with a name slotted into it. It is written by src/sim.js against the actual state of
  // the actual relationship — a meeting with a rival is not a meeting with a friend, and
  // she does not get to choose which.

  // --------------------------------------------------------------- the faction
  faction_favour: [
    'someone from {faction} left food outside her door at {place} and was gone before she opened it.',
    '{faction} know her name at {place} now. she did not give it to them.',
    'a door was open to her at {place} that is open to nobody. {faction} have decided she is worth something.',
    '{faction} showed her a way around a checkpoint at {place} for nothing, and would not say why.',
  ],

  faction_shelter: [
    '{faction} took her in at {place} — a room, a bolt on the inside of the door, and no questions. she slept eleven hours and hated needing it.',
    'she was hidden at {place} by {faction} for four days while men went house to house. nobody gave her up. she does not know how to sit with that.',
    '{faction} dressed her wounds at {place} and asked for nothing, and she kept waiting for the price, and there was not one.',
    '{faction} moved her out of {place} under sacking, and would not say where they were going, and she let them.',
  ],

  faction_hunted: [
    '{faction} came for her at {place}. they know the roads better than she does, and they chose the spot.',
    'she was set on at {place} by people who used to feed her. {faction} do not forget who takes and never gives.',
    'at {place} every door {faction} own was shut to her, and then a man put a knife in her side in the street.',
    '{faction} have put her name on a wall somewhere. she found out at {place}, when three men came at her without a word.',
  ],

  // ------------------------------------------------------------------ arrival
  arrive: [
    'she left {from} and walked into {place}, and the ground changed under her, and so did the price of everything.',
    'out of {from}, into {place}. she has been here before, or somewhere enough like it, and neither is a comfort.',
    'she crossed into {place} out of {from} with her coin counted and her knife where she could reach it.',
    '{place}, after {from}. it is quieter here, and quiet is not the same as safe.',
    'she walked out of {from} and did not look back, which is a thing she has started noticing about herself. {place} by nightfall.',
    'she came into {place} from {from}. nobody counted her. nobody asked. she has not decided whether that is better.',
  ],

  // ----------------------------------------------------------------- witnessed
  // She is STANDING THERE when it happens. She does not hear this from anyone; it
  // happens to the street she is on, and to her, that morning.
  witness: [
    'the notice went up in {place} in the night. {news}',
    'she was in {place} when it happened. {news}',
    'the price of bread in {place} doubled between one morning and the next, and by evening she knew why. {news}',
    'they were pulling people out of houses in {place} by noon. {news}',
    'she watched it from a doorway in {place}, and stayed in the doorway. {news}',
    'nobody in {place} was pretending any more by the end of the week. {news}',
  ],

  // ----------------------------------------------------------------- the world
  // THE LENS. She does not get told what the world did. She FINDS OUT — standing
  // somewhere, late, from somebody who is frightened. A chronicle is not a newsfeed.
  rumour: [
    'she heard it at {place}, from a man who was packing while he said it: {news}',
    'the word at {place} is {news}. the woman who told her had already sold her house.',
    'at {place} they are taking the carts off the road. {news}',
    'she heard at {place}, a week late: {news}',
    'a soldier walking home told her at {place}: {news}. he did not seem to think it was over.',
    'the notice was up at {place} by morning. {news}',
    'nobody at {place} would say it above a whisper: {news}',
    'she paid for her bread at {place} and the price had doubled overnight, and then somebody told her why: {news}',
  ],

  // --------------------------------------------------------------------- death
  death: [
    '{name} died on day {day}, at {place}. the wound was older than she admitted, and she had stopped counting it.',
    '{name} died at {place} on day {day}. she was alone. it took most of the night.',
    '{name} died on day {day} at {place}. there was nothing within a day’s walk, and there had not been for some time.',
  ],
};
