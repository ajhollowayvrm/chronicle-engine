// THE TEMPLATE POOL — the prose half of the content library.
//
// Every entry is a hand-written line. `worldgen` selects the ones compatible with
// the world it just rolled and substitutes the VOCAB SLOTS ({commodity}, {beast},
// {staple}, {vessel}) with that world's own nouns. Everything else in the string
// is an ENGINE placeholder and survives into the pack untouched.
//
//   { t: 'she hauled {commodity} at {place} for {coin} coin. her back is ruined
//        and everything else is better.' }
//
// Optional constraint: `req: { climate: 'arid' }`. No `req` means universal, and
// most lines SHOULD be universal — the universal pool is what stops every world
// needing its own four hundred lines.
//
// TO GROW THIS: pick the slot with the worst ratio in `npm run world <seed>` and
// write more. The generator reports exactly how thin each world came out, per
// slot, which is your worklist. Do not pad — a bad line is worse than a missing
// one, because a missing one shows up in the report and a bad one does not.

const u = (t) => ({ t });   // universal
const r = (t, req) => ({ t, req });

export const TEMPLATES = {
  quiet_road: [
    u('a long day on the road to {place} and nothing in it but the walking. she has had worse days, and fewer of them lately.'),
    u('{place}. she sat in the shade of a wall for an hour and watched people come and go and did not speak to any of them.'),
    u('nothing happened on the way to {place}. she has begun to notice the days when nothing happens, and to count them.'),
    u('she came into {place} with a stone in her boot she had been ignoring for two days. she took it out. it was nothing at all.'),
    u('a slow road to {place}. she has begun talking to herself out loud, and has decided to call it efficiency.'),
    u('she reached {place} a day earlier than she meant to, and spent the day doing nothing, badly.'),
    u('bought {staple} at {place}. it was bad {staple}. she ate all of it.'),
    u('she walked behind {vessel} for six miles out of {place} and could not get past it, and stopped minding around the third.'),
    u('{place}, and a hard wind all day, and grit in everything she owns.'),
    u('she earned a few coin at {place} carrying {commodity} for a man who could afford not to carry it. she thought about that all evening.'),
    u('she spoke to nobody for four days out of {place}. she noticed on the fourth. that is longer than it used to take.'),
    u('a good road, flat and hard, out of {place}. she made twenty miles and felt almost young, and paid for it in the morning.'),
    u('{place}. a boy asked her where she was going and she told him the truth and he lost interest immediately, which was fair.'),
    u('she passed the bones of something big near {place}, picked clean. she did not slow down.'),
    u('a day of walking to {place} and a day of waiting in it, and the waiting was harder.'),
    u('she mended her boots badly outside {place} and walked on them and they held, and she is treating that as a verdict on something.'),
    r('the light comes up off the ground here all day until her eyes ache. she did not close them. that is how people go missing.', { climate: 'arid' }),
    r('she rations her spit now, which she did not used to do, and has not decided how she feels about that.', { climate: 'arid' }),
    r('she walked the boardwalks at {place} all day without once putting a foot on the ground, and slept in a hut on stilts, and slept well.', { climate: 'drowned' }),
    r('{place}. something big moved in the water twenty feet from her and did not come out, and she did not go in.', { climate: 'drowned' }),
    r('the cold at {place} is not weather, it is a fact, and she has stopped arguing with it.', { climate: 'frozen' }),
    r('she walked to {place} on a road paved with bones and thought nothing of it, and noticed that she thought nothing of it.', { climate: 'frozen' }),
  ],

  quiet_camp_healed: [
    u('made camp while the sun was still up and let a wound have the air. it is closing. she checked it twice, which is once more than necessary.'),
    u('she rested. it worked. she does not like how much she resents that.'),
    u('the wound is closing. she has stopped bracing when she rolls over at night, and only noticed because she slept.'),
    u('she made camp early and slept nine hours and woke furious with herself, and better.'),
    u('she cut the dead skin away and it bled clean, which is what you want, and she said so out loud to nobody.'),
    u('an early camp, and a wound that has decided to close on its own. she did nothing to earn it and is taking the credit anyway.'),
    u('camp early. she has run out of the good cloth and used the bad, and it is closing anyway. bodies do not know the difference. she does.'),
    u('the swelling is down. she can make a fist. she made a fist several times, unnecessarily.'),
  ],

  quiet_camp_restless: [
    u('she made camp early with nothing to tend and no reason to stop, and stopped anyway, and lay awake.'),
    u('nothing hurts. she cleaned a knife that was already clean.'),
    u('she is not wounded, not hungry, not hunted. she sat up until the fire went out, looking for the catch.'),
    u('she stopped early and could not settle. she walked the perimeter three times. there was no perimeter.'),
    u('no wounds. she sharpened everything she owns.'),
    u('she is fine. that is the entire report, and she turned it over half the night.'),
    u('nothing to do. she reorganised the pack, which is now organised exactly as it was.'),
    u('no pain anywhere. she keeps checking, the way you check a pocket.'),
    u('she is uninjured and unhurried and she hates it, and would deny hating it, and did, out loud, to the fire.'),
  ],

  ambush_triumph: [
    u('four of them at {place}, and she was better than all four, and knew it by the second one. she is not proud of how good that felt.'),
    u('ambushed at {place}. she walked away with their purses, their water, and a grin she could not get off her face for a day.'),
    u('they picked her badly at {place}. she has told the story twice already and improved it both times.'),
    u('three of them tried her outside {place} and it was finished before the third had his knife up. she has been in a good mood since, and knows what that says about her.'),
    u('she killed two men at {place} and took a third\'s boots while he watched. she has thought about his face since, and not with regret.'),
  ],
  ambush_ruin_ally: [
    u('jumped at {place}, and it went badly, and {ally} stepped into a blade that had her name on it. she is carrying that, and the wound, and a good deal less coin.'),
    u('they had her down at {place} before she understood it was happening. {ally} took a knife pulling them off her. she has not said thank you and does not know how.'),
    u('it went wrong at {place}. {ally} took the cut that would have finished her, and has not mentioned it once, which is worse than mentioning it.'),
  ],
  ambush_ruin: [
    u('they took her at {place} and left her with nothing but the walk to the next town. she was a long time getting up.'),
    u('it went badly at {place}. she does not remember the end of it, and her coin is gone, and she has resolved to be careful for a while.'),
    u('four men at {place}, and she was wrong about every one of them. she crawled out of it. she says she will not make that mistake twice.'),
    u('ambushed at {place} and beaten, properly beaten, for the first time in years. she has been quiet since, and slower.'),
  ],
  ambush_scrape_ally: [
    u('they came at her and {ally} on the road out of {place}, and the two of them put their backs together and got through it. neither has said much since.'),
    u('ambushed at {place}. {ally} took the two on the left without being asked. that is the whole of it, and it is not nothing.'),
    u('jumped at {place}. she heard {ally} laugh in the middle of it, which she found appalling, and thinks about often.'),
    u('men in the road at {place}. she went left, {ally} went right, and neither of them had to say so.'),
    u('it was close at {place}. {ally} was closer than she was, and stayed.'),
    u('ambushed at {place}. afterwards {ally} sat down and shook for a while, and she let them, and said nothing, and stood watch.'),
    u('a scrap at {place} that could have gone the other way. {ally} bound her arm afterwards without being asked, and did it well.'),
    u('she took a cut at {place} keeping it off {ally} and has not mentioned it, and {ally} noticed anyway.'),
    u('bandits at {place}, and a short ugly fight, and afterwards {ally} handed her a flask without a word and she drank from it without wiping it.'),
    u('it went badly at {place} for about ten seconds. {ally} made it go the other way.'),
  ],
  ambush_scrape: [
    u('ambushed alone at {place}. she won it, barely, and afterwards sat down in the road for longer than she would admit.'),
    u('two men at {place}. she came away with a cut, their coin, and no particular feeling about it.'),
    u('it was close at {place}, and there was nobody to be close with, and she noticed.'),
    u('she was alone at {place} when they came. she is still alone. that is the report.'),
    u('a fight at {place} she should not have won, and did, and she is not asking why too loudly.'),
  ],

  sickness: [
    u('fever took her outside {place} and she walked through it, because stopping costs money. that was stupid, and she knew it while she did it.'),
    u('she was sick for three days on the road out of {place} and does not remember two of them.'),
    u('a fever at {place}, and she kept walking. she has always believed you can outpace a thing like that, and has never once been right.'),
    u('something in the water at {place}. she was down a day and up too early, and paid for it for a week.'),
    u('she went hot and grey past {place} and told a stranger she was fine, and the stranger did not believe her, and she resented that.'),
    u('sick, and alone, and moving. she has done this before. it does not get easier. it gets familiar.'),
    u('she woke at {place} unable to stand, and stood.'),
    u('she has been coughing since {place} and telling people it is the dust. it may be the dust.'),
  ],

  beast_maul: [
    u('something came out of the dark at {place} and opened her arm to the bone. she will not say what it was. she may not know.'),
    u('it took her down at {place} before she heard it. she got the knife in eventually. she has not slept properly since.'),
    u('{beast}, at {place}, and faster than she is. she is alive. she does not want to discuss the terms.'),
    u('she was mauled near {place}. she killed it, or it left. she has told it both ways and does not seem sure.'),
  ],
  beast_kill: [
    u('she killed {beast} at {place} and sold the hide for less than it was worth, and knew it, and took the money.'),
    u('something big came for her near {place} and she was ready and it was not. she sold the teeth.'),
    u('a long ugly kill at {place}. it took an hour and three tries. she is fine and it is not.'),
    u('she brought down {beast} outside {place}. the meat was foul. the skin paid for a week.'),
    u('killed something at {place} that she has no name for, and sold it in pieces to people who did.'),
    u('a beast at {place}, and she killed it well and quickly and stood over it feeling nothing much at all.'),
    u('she killed the thing that had been taking children near {place}. they paid her and could not look at her, and she left the same night.'),
    u('it came at her twice at {place}. it did not come a third time.'),
    u('she killed {beast} near {place} and it was a long time dying and she stayed for all of it, because that is the least you can do.'),
  ],

  patrol_defied: [
    u('the {agents} stopped her at {place} and named a price. she told them what she thought of that. {power} does not forget being told.'),
    u('they put a hand on her pack at {place}. she took the hand off it. word of that runs faster than she does, and it runs to {power}.'),
    u('{agents} at a checkpoint outside {place}, wanting their share. she walked around them. one of them wrote something down.'),
    u('she refused the {agents} at {place}, in front of forty people, and enjoyed it, and has been watching the road behind her since.'),
    u('she was stopped at {place} and asked for the tithe and said no, plainly, once, and walked on. nobody stopped her. that is not the same as nobody minding.'),
    u('she talked her way out of paying at {place} and it worked, and she has never seen a man look so patient. that patience is a thing she thinks about.'),
  ],
  patrol_paid: [
    u('the {agents} took {coin} coin off her at {place}. she paid, and smiled, and has been chewing on it for days.'),
    u('{coin} coin to the {agents} at {place}, for the privilege of walking on a road. she paid.'),
    u('{coin} coin to {power}\'s men at {place}. she handed it over the way you hand over a tooth.'),
    u('a checkpoint at {place}. {coin} coin, no receipt, no argument. she is getting good at no argument, and it is doing something to her.'),
    u('the {agents} at {place} were polite about it. that made the {coin} coin worse.'),
    u('she paid the {agents} {coin} coin at {place} and thanked them, because it was cheaper than not thanking them.'),
    u('{coin} coin at {place}. she thought about the knife the whole time and did not touch it, and she thinks about that too.'),
  ],

  cache: [
    u('{coin} coin under a flagstone in a ruin at {place}, in a pot, with a milk tooth beside it. she took the coin and put the tooth back.'),
    u('she found {coin} coin in the wall of a dead house near {place}. there was a ring with it. she left the ring.'),
    u('a stash at {place}: {coin} coin, and a folded letter she did not read and did not burn.'),
    u('{coin} coin in a jar at {place}. somebody buried it meaning to come back. she thought about that for a mile and then stopped thinking about it.'),
    u('she found {coin} coin in the ruins outside {place}, under a body\'s worth of dust, and no body. she did not look further.'),
    u('{coin} coin at {place}, in an old boot, wrapped in cloth and wrapped again. whoever hid it was frightened. she took it anyway.'),
    u('she found {coin} coin at {place}, and a name scratched inside the lid of the box, and she has not been able to stop reading it.'),
    u('{coin} coin in a ruin at {place}. beside it a smaller purse, empty. someone got here first, once, and did not take everything.'),
    u('{coin} coin at {place}. she counted it twice in the dark and once more in the light, and it was the same, and she still did not believe it.'),
    u('she found {coin} coin at {place}, in a house where the table was still laid.'),
    u('{coin} coin under a slab at {place}. there was a smaller hollow beside it, exactly the size of a hand, and empty.'),
    u('she found {coin} coin at {place} and a mirror the size of her palm. she looked at herself in it, and put it back face down.'),
    u('{coin} coin, hidden well at {place}. whoever hid it did not come back, and she is walking on, and she is aware those are the same sentence.'),
  ],

  relic: [
    u('she dug something out of the ground at {place} that is the wrong weight for its size. she has not sold it. she has not shown it to anyone.'),
    u('a thing from under {place} that is warm when nothing else is. it is in her pack. she has decided nothing about it.'),
    u('something came up out of the ground at {place} with writing on it in no hand she has seen. she could sell it in a day. she has not.'),
    u('she has a thing in her pack from the ruins at {place} that she does not like to touch and will not put down.'),
    u('a relic from {place}. every buyer she has shown it to has gone quiet and offered too much. she has kept it, which is how one attracts {power}\'s notice.'),
    u('she found something at {place} that the flies will not land on.'),
    u('she took something from a ruin at {place} that has not stopped being heavy. {power} counts these things. she knows that, and has kept it.'),
    u('she has a bone from {place} that is not a bone. she carries it wrapped, and moves it from pocket to pack and back, and cannot let it alone.'),
  ],

  work: [
    u('a week of honest work at {place} hauling {commodity}. {coin} coin, a bed, and a wound that finally closed.'),
    u('{coin} coin for a week of guarding a store at {place}. nobody came. she slept indoors and healed.'),
    u('she took work at {place} — {coin} coin, a roof, and eight days of nothing worse than lifting. she was almost content, and noticed, and did not stop.'),
    u('she carried stone at {place} for {coin} coin, and slept like the dead, and woke without pain.'),
    u('honest work at {place}: {coin} coin, a bed with a mattress in it, and a week with no knife in it.'),
    u('she worked {vessel} out of {place} and back. {coin} coin, and nobody died, and the cut on her hand closed.'),
    u('{coin} coin for a week of standing behind a merchant at {place} looking dangerous. easiest money she has made in a year.'),
    u('a week\'s work at {place}. {coin} coin. she ate three times a day and it frightened her a little.'),
    u('she hauled {commodity} at {place} for {coin} coin. her back is ruined and everything else is better.'),
    u('honest work, {coin} coin, and a week at {place} in which nothing at all went wrong.'),
    u('a week at {place}. {coin} coin, and a woman who fed her twice a day and asked nothing, and she waited the whole week for the asking.'),
    u('she dug graves at {place} for a week. {coin} coin. steady work, here.'),
    u('work at {place}: {coin} coin, and they wanted her back, and she said maybe, and meant it, which is new.'),
    u('she worked a week at {place} and healed and ate and was paid {coin} coin, and on the last night she packed early, because she could feel herself settling.'),
  ],

  stranger: [
    u('a stranger called {name} fell in beside her outside {place}, armed, offering no reason, and has not left.'),
    u('{name} was at the gate at {place} when she got there, and on the road when she left it, and has been ever since.'),
    u('she has picked up a shadow. {name}: armed, uninvited, walking half a step behind her since {place}.'),
    u('{name} sat down at her fire outside {place} without asking, and put a sword down where she could see it, which she took as manners.'),
    u('someone named {name} has been walking with her since {place}. she has not asked why. she is aware that she has not asked.'),
    u('she woke at {place} and {name} was awake, and had built up the fire, and had not gone through her pack. she checked.'),
    u('{name} attached themselves at {place}. armed, quiet, competent. she cannot decide whether that is better or worse.'),
    u('she found {name} sitting on her pack at {place}. she did not like that. {name} is still here.'),
    u('someone called {name} has decided to walk her road. she has not agreed to this. she has also not said no.'),
  ],

  companion_talk: [
    u('a quiet hour with {ally}. neither of them said anything worth writing down, and something got said anyway.'),
    u('{ally} told her how they lost the finger. she told them something back, and only lied about part of it.'),
    u('{ally} asked her a question she did not answer, and did not leave, and that was the whole conversation.'),
    u('she and {ally} argued about the road for an hour, badly, and both enjoyed it enormously.'),
    u('{ally} laughed at something she said. she has been repeating it to herself since, to find out what was funny.'),
    u('a night with {ally} and a bad bottle. she said more than she meant to, and is less worried about that than she should be.'),
    u('{ally} sharpened her knife without asking. she let them.'),
    u('she told {ally} the name of a place she has not said out loud in eleven years.'),
    u('{ally} is a bad cook and does it anyway, and she eats it and says nothing, and that is a kind of trust.'),
    u('she and {ally} walked eleven miles without a word and arrived somehow better than they set out.'),
    u('{ally} said something true about her, plainly, over the fire. she did not argue. she thought about it for two days.'),
    u('she caught {ally} looking at her, and neither of them looked away fast enough to pretend.'),
    u('{ally} asked what she is walking toward. she gave the answer she gives, and heard how thin it has got.'),
    u('she took the second watch so {ally} could sleep, and did not tell them, and {ally} knew.'),
    u('{ally} told her about someone they buried. she listened. she is not good at that, and did it anyway.'),
    u('{ally} put a hand on her shoulder and she did not shrug it off. that is the entire event, and it took her all night to get over.'),
    u('{ally} asked nothing of her all evening, and she found she had been braced for it.'),
    u('she made {ally} laugh on purpose, and then had to go and see to the fire.'),
    u('{ally} knows what she is now, near enough, and was still there in the morning.'),
  ],
  companion_leaves: [
    u('{ally} was gone before dawn. she did not look for tracks. she stood in the road a while, looking at the ground.'),
    u('{ally} left in the night. she noticed the missing weight of them before she noticed the empty place by the fire.'),
    u('she woke and {ally} had gone, and had taken nothing of hers, which she keeps coming back to.'),
    u('{ally} is gone. no word, no note, nothing missing. she has decided not to have a feeling about it.'),
    u('she woke alone. {ally}\'s fire was banked properly, which means they left slowly, which means they thought about it.'),
  ],
  companion_dies_beloved: [
    u('{ally} died at {place}. she carried the body eight miles before she put it in the ground, and she has not been careful about anything since.'),
    u('she loved {ally}, and {ally} is dead at {place}, and she buried them herself and would not let anyone help. she is taking risks now that she would once have called stupid.'),
    u('{ally} is dead and she was there. she has not slept a full night since {place}, and she has stopped bothering to look before she crosses open ground.'),
  ],
  companion_dies_plain: [
    u('{ally} is dead at {place}. she buried them and walked on before noon.'),
    u('{ally} did not get up at {place}. she said the words she knows and they came out wrong, and she went on anyway.'),
    u('{ally} died at {place}. she is telling herself that burying someone properly is the same as grieving. she is not convinced, and she is still walking.'),
  ],
  love: [
    u('she and {ally} sat past the end of the fire at {place}, and neither of them stood up.'),
    u('at {place}, {ally} reached over to look at a wound that healed weeks ago, and she let them, and neither said anything about it.'),
    u('the cold came down at {place} and they shared a blanket out of sense, and stayed under it out of something else.'),
    u('she and {ally} talked until the fire was out at {place}, and then sat in the dark, and did not talk, and did not go.'),
  ],

  charity: [
    u('she gave {coin} coin to a family at {place} with nothing, and left before they could thank her, because she cannot take it.'),
    u('{coin} coin to a man at {place} who had less than nothing. she told him to buy {staple} and not to eat it all.'),
    u('{coin} coin to a widow at {place}. she was rough about it, deliberately, so it would not look like what it was.'),
    u('{coin} coin to a girl at {place} who reminded her of nobody in particular, she says.'),
    u('she gave {coin} coin away at {place} and then walked twenty miles on short rations. she does not want that mentioned.'),
    u('{coin} coin to a man at {place} who was going to die anyway. she knew it. she gave it anyway.'),
    u('she gave {coin} coin to some children at {place} and was short with them, and they will remember the coin and not the shortness, which was the plan.'),
    u('she left {coin} coin where a beggar at {place} would find it, and did not stay to watch, and that is the closest thing to tenderness in her.'),
    u('{coin} coin at {place} for a burial that was not hers to pay for.'),
    u('{coin} coin to strangers at {place}, and afterwards she was in a foul mood for a day and could not say why.'),
    u('{coin} coin at {place}. they blessed her. she took the blessing badly, the way she takes most things.'),
    u('{coin} coin at {place}. she will be poorer for it in a month, and remembered for it longer than that, and only one of those was the point.'),
  ],
  debt_repaid: [
    u('someone she helped once took her in at {place}, fed her, and asked for nothing. she did not know where to put her hands.'),
    u('a woman at {place} recognised her, and fed her, and would not take coin. she has been chewing on it since.'),
    u('she was taken in at {place} by a family she does not remember helping. they remember. she let them tell her about it.'),
    u('a man at {place} paid her bill before she reached the counter. she has no memory of him at all, and did not say so.'),
    u('at {place} someone gave her a bed for nothing and would not explain, and she lay awake in it.'),
    u('they knew her name at {place} before she gave it. it was not a debt she remembered being owed.'),
    u('someone at {place} said \'you don\'t remember me\', and she did not, and they fed her anyway and asked for nothing, and she has thought about it every day since.'),
    u('a household at {place} took her in and fed her and asked for nothing, and she left a week\'s coin under the bowl and went before dawn.'),
  ],

  rumor: [
    u('heard at {place}: {power} is not counting what everyone thinks it is counting.'),
    u('a keeper at {place} would not say {power}\'s name aloud, and would not say why not, and changed the subject twice.'),
    u('they say at {place} that the {agents} do not eat. she has watched. she has not seen one eat.'),
    u('a caravan master at {place} told her never to be the last to leave a dead place. he would not say more, and he was not drunk.'),
    u('someone at {place} said {power} was here before the roads were. someone else said {power} is what happened to whoever built them.'),
    u('a woman at {place} said the {agents} came for her neighbour, and were kind about it, and that was the part she could not get past.'),
    u('heard at {place} that {power} has begun taking its share from people who have never given it anything.'),
    u('a {agent} at {place} asked a child what her mother had given away that week. just that. then he thanked her, and went on.'),
    u('heard at {place}: {power} does not take anything that is not offered. the man who said it would not explain what counts as an offer.'),
    u('a drunk at {place} said he had been down into the works beneath the country. he was not lying. that is the part she keeps returning to.'),
    u('someone at {place} said the {agents} keep a list of people who give things away. not who hoards. who gives.'),
    u('she heard at {place} that when {power} is finished counting there will be an answer, and nobody in the room wanted to say what the question was.'),
    u('a girl at {place} sang a song about {power} that her mother tried to stop her singing.'),
    u('heard at {place} that the {agents} were people once, and that this is not a figure of speech, and that they were promoted.'),
    u('the story at {place} is that {power} is patient because it has already won and is only tidying up. she has decided that is a story people tell to feel important.'),
  ],

  ghost_dead: [
    u('she dreamed about {ghost} again, and woke before dawn, and walked until it was light.'),
    u('{ghost} was in the fire tonight, the way the dead get into fires. she let it burn down.'),
    u('she said {ghost}\'s name out loud in her sleep and woke herself doing it, and did not sleep again.'),
  ],
  ghost_gone: [
    u('she heard {ghost}\'s name at {place}, spoken by someone who had seen them recently. she paid for her {staple} and left.'),
    u('{ghost} is alive. someone at {place} said so in passing, about somebody else\'s business. she did not ask a single question.'),
    u('at {place} a man described {ghost} without knowing it. she listened to all of it and then walked out mid-sentence.'),
    u('{ghost} was at {place} a month ago. she found this out by accident, and has not gone looking.'),
    u('she heard {ghost} is well, and married, or something like it, near {place}. she is glad. she left the same day.'),
    u('{ghost}\'s name came up at {place} and she found she had stopped breathing, and started again, and said nothing.'),
    u('she saw a back at {place} that was {ghost}\'s back. it was not. she stood in the street a while afterwards.'),
    u('someone at {place} asked whether she knew {ghost}. she said no.'),
    u('a trader at {place} had a knife of {ghost}\'s and did not know it. she bought it, and has not looked at it since.'),
  ],

  power_moves: [
    u('there were {agents} outside the inn at {place} all night and they were not trying to hide it. {power} knows her name now.'),
    u('a {agent} sat down across from her at {place}, said nothing, ate, and left. she has not eaten since.'),
    u('{power} has taken an interest. two {agents} walked her road at her pace for four hours out of {place}, and never once closed the distance.'),
    u('she found her pack searched at {place} and nothing taken, which is a message, and she has received it.'),
    u('the {agents} at {place} let her through without stopping her. that is new, and it is worse.'),
    u('a {agent} at {place} used her name. she has never given it to one of them.'),
    u('{power}\'s people are watching her openly now. at {place} one of them nodded to her. she nodded back, and has been furious with herself since.'),
    u('at {place} the innkeeper would not take her coin and would not look at her, and there was a {agent} at the door.'),
  ],

  death: [
    u('{name} died on day {day}, at {place}. the wound was older than she admitted, and she had stopped counting it.'),
    u('{name} died at {place} on day {day}. she was alone. it took most of the night.'),
    u('{name} died on day {day} at {place}. there was nothing within a day\'s walk, and there had not been for some time.'),
  ],
};

// Region arrival/departure, written against the TERRAIN rather than the world.
export const REGION_TEMPLATES = {
  arrive: {
    _any: [
      'she came into {region} at {place} and stood a while, getting the measure of it.',
      'into {region} out of {from}. the ground changes here, and so does what happens to people on it.',
      '{region}. she has been here before, or somewhere enough like it, and neither is a comfort.',
      'she walked into {region} at {place} with her water counted and her knife where she could reach it.',
      '{region}, after {from}. it is quieter here, and quiet is not the same as safe.',
    ],
    saltflat: ['she came out onto the flats at {place}. forty miles of nothing in every direction, and a man walking toward you takes a day to arrive.'],
    'oasis-city': ['she came into {region} at {place} and heard running water for the first time in a month, and it did something to her she did not care for.'],
    'ruin-desert': ['{region}. nothing lives here. that is precisely why there is anything left in it to find.'],
    canopy: ['she came up into {region} at {place}, where the roads are rope and the ground is a rumour.'],
    blackwater: ['{region}: black water, and things moving in it that she cannot see and has stopped pretending she can.'],
    reedfen: ['she walked into the wet country at {place}. there are birds here. she had forgotten about birds.'],
    'bone-road': ['she came onto the bone road at {place}. it is paved with the herds, and it goes on for as long as anyone has walked it.'],
    'high-pass': ['{region}. the air is thin and the mountain sheds without warning and she is climbing anyway.'],
    'winter-seat': ['she came into {region} at {place}, where there are walls and fires and men who own both.'],
  },
  depart: {
    _any: [
      'she left {region} at {place}, bound for {to}, and did not look back, which is a thing she has started noticing about herself.',
      'out of {region} toward {to}. she took the long way to avoid a checkpoint, lost a day, and considered it money well spent.',
      'she walked out of {region} toward {to} with her hood up. too many people here know her face now.',
      'leaving {region} for {to}. she stood at the edge of it a while first, which is not like her.',
      'she came out of {region} at {place} and went for {to} with her boots in ruins and her coin in worse shape.',
    ],
  },
};

export const FACTION_TEMPLATES = {
  charity: {
    favour: [
      'someone from {faction} left food outside her door at {place} and was gone before she opened it.',
      '{faction} know her name at {place} now. she did not give it to them.',
      'a door was open to her at {place} that is open to nobody. {faction} have decided she is worth feeding.',
      'at {place} a child sent by {faction} brought her {staple}, and stood there until she had eaten it.',
    ],
    shelter: [
      '{faction} took her in at {place} — a room, a bolt on the inside of the door, and no questions. she slept eleven hours and hated needing it.',
      'she was hidden at {place} by {faction} for four days while {agents} went house to house. nobody gave her up. she does not know how to sit with that.',
      '{faction} dressed her wounds at {place}, and fed her, and asked for nothing, and she kept waiting for the price, and there was not one.',
      'she stayed with {faction} at {place}. they gave her the good bed. she gave it to someone worse off and slept on the floor and felt like herself again.',
      'at {place}, {faction} put her in {vessel} under sacking and drove her out past a checkpoint, and would not say where they were going, and she let them.',
    ],
    hunted: [
      '{faction} came for her at {place}. she had not thought they had it in them. she was wrong, and she is bleeding, and she had it coming.',
      'she was set on at {place} by people who used to feed her. {faction} do not forget who takes and never gives.',
      'at {place} every door of {faction} was shut to her, and then their people were behind her, and one of them said her name like a charge being read.',
      '{faction} put four of theirs on her at {place}. they were not good at it. that is not the same as it not hurting.',
      'she was jumped at {place} by {faction}, who were angrier than they were skilled. she got out of it. she has not slept since.',
    ],
  },
  order: {
    favour: [
      '{faction} extended her credit at {place} without being asked. that is how it starts.',
      'a clerk of {faction} at {place} waved her past a fee, and made a small mark in a book, and smiled at her.',
      '{faction} sent word ahead of her to {place}. the innkeeper knew her name, and the price had already been agreed.',
      'someone from {faction} bought her a drink at {place} and talked about nothing for an hour, which cost her a great deal more than the drink.',
    ],
    shelter: [
      '{faction} put her up at {place} in a clean room with an account attached to it, and told her not to worry about the account.',
      'she was ill at {place} and {faction} paid the physician and never mentioned it again, and she thinks about that more than she would like.',
      '{faction} hid her at {place} behind a counting-house door, and {agents} walked past it twice and did not knock.',
      'at {place}, {faction} settled a debt of hers that she had told nobody about. she does not know how they knew. she has stopped asking.',
      '{faction} gave her a bed and a week of quiet at {place}. she healed. she has never in her life felt so purchased.',
    ],
    hunted: [
      '{faction} called in everything she owes at once at {place}, and when she could not pay they sent men, and the men were professional.',
      'she was taken at {place} by {faction} and worked over carefully, by somebody who does it for a living and does not enjoy it.',
      'at {place} every door {faction} own was shut to her — which is most of the doors — and then a man put a knife in her side in the street.',
      '{faction} have put a price on her. she learned this at {place}, from a man she had never met, who was trying to collect it.',
      'they came for her at {place} with a paper, and when she would not sign it they took payment out of her instead.',
    ],
  },
  crime: {
    favour: [
      'someone from {faction} showed her a way around a checkpoint at {place} for nothing, and would not say why.',
      '{faction} left a mark on a wall at {place} that she now knows how to read. it meant: not this road.',
      'a runner at {place} put {commodity} in her pack while she was not looking. it had not been stolen from her. it had been stolen for her.',
      '{faction} let her sleep in one of their holes at {place}. it stank. nobody asked her to pay for it.',
    ],
    shelter: [
      '{faction} moved her out of {place} in {vessel} with a false bottom. she lay in the dark for nine hours and did not complain once.',
      'she was hidden by {faction} at {place} in a hole with two feet of air at the top of it, and it was the safest she has been in a year.',
      '{faction} took her in at {place} — no bed, no bath, no questions, and a knife within reach, and she slept like a child.',
      'she healed up in a hole of {faction} under {place}. they fed her stolen {staple} and told her stolen jokes, and she laughed at both.',
      '{faction} kept her out of {agents} hands at {place} for a week, and never once asked her what she had done.',
    ],
    hunted: [
      '{faction} caught up with her at {place}. they know the roads better than she does, and they chose the spot.',
      'she was ambushed at {place} by {faction}, out of a hole she had not known was there, which is the whole of their argument.',
      'at {place}, {faction} took her {commodity}. not her coin. she understood the message perfectly.',
      '{faction} have put her name on a wall somewhere. she found out at {place}, when three men came at her without a word.',
      'she was jumped by {faction} at {place}. they were fast and quiet and she is lucky to be walking.',
    ],
  },
  faith: {
    favour: [
      'a penitent of {faction} washed her feet at {place} and would not be stopped, and would not explain.',
      '{faction} have begun leaving a lamp burning for her at {place}. she has asked them not to. it is still burning.',
      'someone of {faction} at {place} told her she is closer to it than she knows. she did not ask what it is.',
      'at {place} {faction} fed her without being asked and prayed over the food, at length, while it got cold.',
    ],
    shelter: [
      '{faction} took her into their house at {place} and asked her nothing, and the silence in there was the first rest she has had in months.',
      'she was hidden by {faction} at {place} under the floor of a chapel, and lay listening to them sing above her, and did not hate it.',
      '{faction} nursed her at {place} for a fortnight and would take no coin, and the refusal was worse than a bill.',
      'at {place} {faction} put her in a habit and walked her out through a line of {agents} who did not look twice.',
      'she healed in the house of {faction} at {place}. they did not once mention what she is. she kept waiting for it.',
    ],
    hunted: [
      '{faction} have named her at {place}, out loud, in front of people, and naming is what they do instead of a knife, and it works.',
      'she was stoned out of {place} by {faction}. actual stones. she has a cut above her eye and a great deal to think about.',
      'at {place} {faction} would not let her buy, sell, or drink, and by the third day she understood that was the sentence.',
      '{faction} came for her at {place} in the small hours, singing, which she found worse than shouting.',
      'they have made her a lesson at {place}. {faction} tell it to children now, and she has heard it told, and it is not accurate.',
    ],
  },
  martial: {
    favour: [
      'an old soldier of {faction} at {place} bought her a drink and told her she holds a blade like somebody who has had to.',
      '{faction} let her drill with them at {place}. nobody said anything about it. she was better afterwards.',
      'someone of {faction} at {place} gave her a knife with a name already on it, and did not explain the name.',
      '{faction} have started nodding to her at {place}. that is the whole of the honour and she is aware it took ten years.',
    ],
    shelter: [
      '{faction} put her up in their barracks at {place} and nobody asked her a single question, and it was the best sleep of the year.',
      'she was hidden by {faction} at {place} in a room full of men who had all done worse, and none of them looked at her twice.',
      '{faction} sewed her up at {place} with the same needle they use on themselves, and gave her the good drink, and made her tell the story twice.',
      'at {place} {faction} put her in a line of theirs and marched her past {agents} in step, and she has never been so invisible.',
      'she healed in a hall of {faction} at {place}, and they fed her, and made her fight a boy of sixteen, and she lost, and they liked her for it.',
    ],
    hunted: [
      '{faction} came for her at {place} in a line, in the open, at noon, which is their way and it very nearly worked.',
      'she was called out at {place} by {faction}, formally, in front of a crowd, and she has never wanted less to fight anybody.',
      'at {place} {faction} took her in the street, professionally, and left her alive on purpose, which is a message.',
      '{faction} have set their young men on her at {place}. they are not good yet. they are keen, and there are a great many of them.',
      'she was beaten at {place} by {faction} and left in the road, and a woman she did not know dragged her inside.',
    ],
  },
};

export const SCHOOL_TEMPLATES = {
  prompt: [
    '{school} at {place} will take her for {coin} coin and a season. she has never once paid to be taught anything.',
    'it is {coin} coin to sit with {school} at {place} and learn what they know. does she pay?',
    '{school} take students. {coin} coin, a season, and no promises. does she?',
    'she watched {school} at work at {place} for an hour and could not look away. it is {coin} coin to be let in.',
  ],
  train: [
    'she paid {school} {coin} coin and spent a season at {place} being shown how little she knew. she is better now. she is furious about how much better.',
    '{coin} coin to {school}. they took the flourish out of her and left the economy in.',
    'she trained at {place} with {school} until her hands bled, and then trained with them bandaged. {coin} coin. worth every one.',
    'she gave {school} {coin} coin and they gave her back the same body, moving differently.',
  ],
  refuse: [
    'she walked past {school} at {place} with {coin} coin in her pocket and told herself she has done all right so far.',
    'she would not pay {school}. she has been doing this since she was fourteen and does not care to be a beginner at it now.',
    '{coin} coin was too much for {school}, or she said it was. she has thought about {place} most days since.',
    'she kept her {coin} coin and left {place}. she can already do it. that is what she said, out loud, to nobody.',
  ],
};

export const HISTORY_TEMPLATES = {
  war_declared: [
    'the word at {place} is that {polity} and {other} are at war as of Tuesday. the man who told her was packing while he said it.',
    'at {place} they are taking the carts off the road. {polity} and {other} have gone to war and everyone here has done this before.',
    '{polity} and {other} are fighting. she heard it at {place} from a woman who had already sold her house.',
    'war between {polity} and {other}. at {place} the price of {staple} doubled inside a day, and nobody was surprised, and that was the frightening part.',
  ],
  peace_made: [
    '{polity} and {other} have stopped fighting. at {place} nobody cheered. the men who did well out of it were the quietest in the room.',
    'peace between {polity} and {other}, apparently. at {place} they are already arguing about who won.',
    'the war is over. she heard at {place}, from a soldier walking home, who did not seem to think it was over.',
    '{polity} and {other} have made peace. the roads are open again, and full of people who have nowhere to go back to.',
  ],
  ruler_dies: [
    'whoever ruled {polity} is dead. at {place} the bells went all night and nobody could tell her whether it was grief or relief.',
    'the news reached {place} a week late: {polity} has lost whoever was holding it. nothing has changed yet. that is the part she does not like.',
    '{polity} is without a ruler. at {place} the {agents} are standing in the road doing nothing at all, and waiting, and it is unbearable.',
    'they are burying somebody important in {polity}. at {place} the taverns are full and very quiet.',
  ],
  tolls_raised: [
    '{polity} has put the tolls up overnight and given no reason. at {place} everyone is doing sums in their heads and going quiet.',
    'the toll at {place} is half again what it was last month. {polity} did not announce it. they simply began charging it.',
    'at {place} the new rates of {polity} went up on the door in the night. a man read them aloud twice and then went home.',
    '{polity} wants more now. she paid it at {place}, and looked at the man taking it, and he would not look back.',
    'the toll went up again in {polity} this week. at {place} a carter said it was the third rise this year, and then looked round to see who had heard him.',
  ],
  faction_outlawed: [
    '{polity} has outlawed {faction}. the notices were up at {place} by morning, and there is a price on the list of names, and she has been on lists before.',
    'at {place} they are pulling {faction} out of houses. {polity} decided overnight, and the men doing the pulling are not from here.',
    '{faction} is illegal in {polity} as of this week. she read the notice at {place} twice and walked away slowly.',
    '{polity} has made it a crime to be {faction}. at {place} a woman she has drunk with was arrested for a conversation.',
  ],
};
