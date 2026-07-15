// ROLL TABLES — the chronicle, in HER OWN HAND.
//
// ─────────────────────────────────────────────────────────────────────────────
// THIS IS HER ACCOUNT NOW. First person, past tense, plain. She keeps it for you —
// the Angel — the way a person keeps a journal they suspect is being read. Not literary,
// not cryptic: a woman telling you what she did today and what it cost. Cause, then effect.
// "I did X. Then Y. I did not like it." Sometimes she turns and speaks to you inside it.
//
// It is HER FEED — one of the two the game runs. The other is what is happening AROUND her,
// which she cannot always see and you can (src/sim.js writes that one). So the rule that
// governed the old third-person Record still holds, and matters more than ever: SHE ONLY
// WRITES WHAT SHE KNOWS. She does not write "a man is going to ambush me on the east road."
// She writes "I was ambushed." The gap between those two sentences is where you live.
//
// THE BARGAIN THIS FILE STILL MAKES: one pool of lines, shared by every world. The
// vocabulary is world-specific and resolved at render time, so the same sentence re-colours
// itself as she walks:
//
//   {place}  where I am              {country}  who rules it (or nobody)
//   {commodity} what it produces     {pays}     who the economy is paid for by
//   {rich}   who holds the money     {currency} what we pay each other IN
//   {house}  the faction that operates here, by name
//   {power}  the god over this ground {working} the magic they use here, by name
//   {cost}   what that working takes  {quirk}   a fact about its machines
//   {coin}   a number
//
// THE VOICE: first person, terse, plain. Every line still carries a FACT — a number, a
// price, a limit, a wound, a name. A line that could be cut without changing what you KNOW
// does not belong here. She undercuts herself. She is not sentimental and she is talking to
// you, not to a page.

export const CHRONICLE = {
  // ------------------------------------------------------------------ the road
  road: [
    'A long day out of {place}. I followed a cart of {commodity} for six miles, could not get past it, and stopped minding around the third.',
    'I crossed {place}. They price everything here in {currency}, and I have not worked out yet who decides what it is worth.',
    'A day out of {place} and nothing in it but the walking. Bread is up again. It is always {pays} who feel it first.',
    'I walked {place} end to end. Every third door has {house}’s mark on it, and nobody I asked would tell me what the mark means.',
    'I made twenty miles out of {place} and felt almost young. I paid for it this morning, and I am not going to pretend I did not.',
    'I passed the bones of something big outside {place}, picked clean, and nobody had taken the metal. That told me more than the bones did.',
    'I spoke to nobody for four days out of {place}. I noticed on the fourth. That is longer than it used to take me, Angel.',
    'I mended my boots badly in {place}. Leather costs a week’s wage here, and I am not spending a week on my feet.',
    'I counted what I have left, in {place}, twice. The number did not improve. Everything here is priced by {rich}.',
  ],

  // --------------------------------------------------------------------- work
  work: [
    'A week hauling {commodity} at {place}. {coin} coin, a bed, and a wound that finally closed.',
    'I cut {commodity} at {place} for {coin} coin. My back is ruined and everything else is better.',
    '{coin} coin for eight days at {place}, standing behind a man who could afford not to stand there himself.',
    'Honest work at {place}: {coin} coin, a roof, and a week with no knife in it.',
    'I loaded {commodity} at {place} for {coin} coin and ate three times a day, and it frightened me a little.',
    'A week at {place} for {coin} coin. They wanted me back. I said maybe and meant it, which is new.',
    'I dug at {place} for {coin} coin, alongside {pays}, and none of us talked about who was getting the rest of it.',
    'They paid me {coin} coin at {place}, in {currency}, which is worth what {rich} says it is worth on the day they hand it over.',
    'A fortnight at {place}. {coin} coin. I am good at this and I do not know what to do with that.',
  ],

  // ---------------------------------------------------------------------- law
  law: [
    'They wanted my name at {place}, and a reason, and a fee for the reason. I gave all three and I have been in a temper since.',
    'I could not sell what I was carrying at {place} without a licence, and the licence cost more than the thing was worth. That is the point of a licence.',
    'A clerk at {place} explained the statute to me, patiently, twice, and charged me {coin} coin for the explanation.',
    '{coin} coin at {place}, for the privilege of walking on a road. I paid.',
    'They fined me {coin} coin at {place} for a thing I had already paid for. I paid the fine. I paid for the receipt.',
    'They took {coin} coin at {place} and called it a levy. It goes to {house}. There is nobody to complain to — I checked.',
    'They hanged a man at {place} while I was buying bread. Nobody stopped buying bread. I did not stop either.',
    'A boy was taken up at {place} for carrying unmarked {commodity}. I watched, and did nothing, and I have been arguing with myself since.',
  ],

  // ------------------------------------------------------------------ defiance
  defy: [
    'They asked for their due at {place}. I told them what I thought of that. Word of it travels, and it travels to {power}.',
    'They put a hand on my pack at {place}. I took the hand off it. One of them wrote something down.',
    'I refused them at {place}, in front of forty people, and enjoyed it, and I have been watching the road behind me since.',
    'They stopped me at {place} and asked for the tithe. I said no, once, plainly, and walked on. Nobody stopped me. That is not the same as nobody minding.',
    'I talked my way out of paying at {place}. It worked, and I have never seen a man look so patient. I think about that patience.',
    'I would not sign at {place}. They closed the book, and smiled, and told me the offer would not be made twice.',
  ],

  // ----------------------------------------------------------------- the find
  find: [
    '{coin} coin under a flagstone at {place}, in a pot, with a milk tooth beside it. I took the coin and put the tooth back.',
    'I found {coin} coin in the wall of a dead house at {place}. There was a ring with it. I left the ring.',
    '{coin} coin in a jar at {place}. Somebody buried it meaning to come back. I thought about that for a mile, then stopped.',
    'I found {coin} coin at {place}, in a house where the table was still laid.',
    '{coin} coin at {place}, and a name scratched inside the lid, and I have not been able to stop reading it.',
    '{coin} coin, hidden well at {place}. Whoever hid it did not come back. I am walking on. I am aware those are the same sentence.',
    'I dug {coin} coin out of the old works at {place}. The flies will not go near the hole I made.',
  ],

  relic: [
    'I pulled something out of the ground at {place} that is the wrong weight for its size. I have not sold it. I have not shown it to anyone.',
    'A thing from under {place} that is warm when nothing else is. It is in my pack. I have decided nothing about it.',
    'I found a {working} charm in a wall at {place}. I know what it costs — {cost} — and I have not put it down.',
    'I took something from the works at {place} that has not stopped being heavy. I know what that attracts. I kept it anyway.',
  ],

  // ------------------------------------------------------------------- danger
  danger: [
    'Four men at {place}, and I was wrong about every one of them. I crawled out of it.',
    'It was close at {place}, and there was nobody to be close with, and I noticed.',
    'They took me at {place} and left me with nothing but the walk to the next town. I was a long time getting up.',
    'A fight at {place} I should not have won, and did. I am not asking why too loudly.',
    'Something came out of the dark at {place} and opened my arm to the bone. I will not say what it was. I may not know.',
    'Three of them tried me outside {place} and it was finished before the third had his knife up. I have been in a good mood since, and I know what that says about me.',
  ],

  unrest: [
    'They are striking at {place}. There are men in the square who are not from here, and {rich} paid for them.',
    'The bread went up again at {place} and a woman put a window through, and everyone agreed she was right, and nobody helped her afterward.',
    'There was a crowd at {place} and it had not decided yet what it was. I left before it did.',
    'The {commodity} price broke at {place} and {rich} were out of the city by afternoon, which is how the rest of us found out.',
    'They are striking against {house} at {place}. {house} have not answered, and the not-answering is the answer.',
    'The whole of {place} is waiting for something, and nobody will say what, and the waiting is doing the damage on its own.',
  ],

  // ------------------------------------------------------------------ the sick
  sick: [
    'Fever took me at {place} and I walked through it, because stopping costs money. That was stupid, and I knew it while I did it.',
    'I was sick three days out of {place} and I do not remember two of them.',
    'Something in the water at {place}. I was down a day and up too early, and paid for it for a week.',
    'I woke at {place} unable to stand, and stood.',
    'I have been coughing since {place} and telling people it is the dust. It may be the dust.',
  ],

  rest: [
    'I made camp early outside {place} and let a wound have the air. It is closing. I checked it twice, which is once more than I needed to.',
    'I took a room in {place}. It cost me a day’s work, in {currency}, and I slept as though I had been hit.',
    'I stopped early and could not settle. I walked the perimeter three times. There was no perimeter.',
    'Nothing hurts. I cleaned a knife that was already clean and listened to {house} moving people through the yard all night.',
    'I am not wounded, not hungry, not hunted. I sat up in {place} until the fire went out, looking for the catch.',
    'I slept nine hours in {place} and woke furious with myself, and better.',
    'A day off my feet at {place}. They are burning {commodity} in the square for {power} until dawn, and I slept through it.',
  ],

  // --------------------------------------------------------------- the faction
  faction_favour: [
    'Someone from {faction} left food outside my door at {place} and was gone before I opened it.',
    '{faction} know my name at {place} now. I did not give it to them.',
    'A door was open to me at {place} that is open to nobody. {faction} have decided I am worth something.',
    '{faction} showed me a way around a checkpoint at {place} for nothing, and would not say why.',
  ],

  faction_shelter: [
    '{faction} took me in at {place} — a room, a bolt on the inside of the door, no questions. I slept eleven hours and hated needing it.',
    '{faction} hid me at {place} for four days while men went house to house. Nobody gave me up. I do not know how to sit with that.',
    '{faction} dressed my wounds at {place} and asked for nothing, and I kept waiting for the price, and there was not one.',
    '{faction} moved me out of {place} under sacking and would not say where we were going, and I let them.',
  ],

  faction_hunted: [
    '{faction} came for me at {place}. They know the roads better than I do, and they chose the spot.',
    'I was set on at {place} by people who used to feed me. {faction} do not forget who takes and never gives.',
    'At {place} every door {faction} own was shut to me, and then a man put a knife in my side in the street.',
    '{faction} have put my name on a wall somewhere. I found out at {place}, when three men came at me without a word.',
  ],

  // ------------------------------------------------------------------ arrival
  arrive: [
    'I left {from} and walked into {place}, and the ground changed under me, and so did the price of everything.',
    'Out of {from}, into {place}. I have been here before, or somewhere enough like it, and neither is a comfort.',
    'I crossed into {place} out of {from} with my coin counted and my knife where I could reach it.',
    '{place}, after {from}. It is quieter here, and quiet is not the same as safe.',
    'I walked out of {from} and did not look back, which is a thing I have started noticing about myself. {place} by nightfall.',
    'I came into {place} from {from}. Nobody counted me. Nobody asked. I have not decided whether that is better.',
  ],

  // ----------------------------------------------------------------- witnessed
  // I am STANDING THERE when it happens. I do not hear this from anyone; it happens to the
  // street I am on, that morning.
  witness: [
    'The notice went up in {place} in the night. {news}',
    'I was in {place} when it happened. {news}',
    'The price of bread in {place} doubled between one morning and the next, and by evening I knew why. {news}',
    'They were pulling people out of houses in {place} by noon. {news}',
    'I watched it from a doorway in {place}, and I stayed in the doorway. {news}',
  ],

  // ----------------------------------------------------------------- the world
  // THE LENS. Nobody tells me what the world did. I FIND OUT — standing somewhere, late,
  // from somebody who is frightened. A chronicle is not a newsfeed.
  rumour: [
    'I heard it at {place}, from a man who was packing while he said it: {news}',
    'The word at {place} is {news}. The woman who told me had already sold her house.',
    'I heard at {place}, a week late: {news}',
    'A soldier walking home told me at {place}: {news}. He did not seem to think it was over.',
    'Nobody at {place} would say it above a whisper: {news}',
    'I paid for my bread at {place} and the price had doubled overnight, and then somebody told me why: {news}',
  ],

  // --------------------------------------------------------------------- death
  // The one feed she cannot write. She does not narrate her own death; the world does. This
  // stays third person on purpose — it is the moment her account STOPS, and yours goes quiet.
  death: [
    '{name} died on day {day}, at {place}. The wound was older than she admitted, and she had stopped counting it.',
    '{name} died at {place} on day {day}. She was alone. It took most of the night.',
    '{name} died on day {day} at {place}. There was nothing within a day’s walk, and there had not been for some time.',
  ],
};
