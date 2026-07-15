// COMMUNION — the channel that goes BOTH WAYS.
//
// ─────────────────────────────────────────────────────────────────────────────
// SHE ALREADY TALKS TO YOU. This is the other half: you reaching toward HER.
//
// `voice.js` is her, unprompted, talking into the dark. A judgment is her turning round
// and asking you something. This file is the third thing: YOU asking HER — and her
// answering, a day or two later, because she is not sitting by a telephone. She is walking
// a country, and your question reaches her the way anything reaches her: late, and she gets
// to it when she gets to it.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE QUESTIONS ARE A LIST AND NOT A TEXT BOX.
//
// The whole engine runs no model at run time (that is the invariant that makes the seed a
// real seed — same seed, same world, offline, forever). So she cannot answer a sentence she
// has never seen. What she CAN do — and what is truer to her anyway — is answer a small set
// of the things a person actually asks the one they have decided is listening: where are you
// going, are you all right, who is that to you, what are you afraid of, do you still believe
// I am here, why do you keep going.
//
// And the answer is not canned, because the WORDS are fixed but the WOMAN is not. "Are you
// all right" gets a different sentence out of a woman with three wounds than out of one who
// has just buried somebody than out of one who is, for once, fine. The code picks the pool
// off her actual state; the table only has to have written each pool once.
//
// The pools were AUTHORED ONCE, by hand, and are rolled by code forever. More lines per
// bucket is more life before she says the same thing twice; it is not more cleverness. Every
// line in a bucket has to be a different true answer the SAME woman could give on a different
// day in the SAME state — never a paraphrase of the line above it.
//
// VOICE, everywhere here: second person, terse, undercutting. She is not grateful and she
// does not perform. She is answering, because you asked, and because it is you.

export const COMMUNE_FAITH = 5;   // below this she has stopped believing enough to hear you

// Each question: what the player taps, and the pools she answers from, keyed by a BUCKET the
// sim chooses off her state. `{who}` and `{where}` are filled in by the sim before you see them.
export const QUESTIONS = {
  where: {
    label: 'Where are you going?',
    reply: {
      bounty: [
        'To {where}. There is a thing there with a price on it and I took the money, so it is not really a question any more.',
        '{where}. I have somewhere to be for once. I am not going to pretend I am not frightened of it.',
        'To {where}, to collect on something. I have signed for it. Signing for a thing is how I make myself go, since wanting to has never once been enough.',
        '{where}. There is work there of the kind I am good at and not proud of, and the coin is real, and the rent on being alive does not care how I feel about the work.',
        'Toward {where}. I took a contract. I always take the contract when the purse is low and the target is worse than me, and I have made sure the target is worse than me, that is the one line I still keep.',
        'To {where}, to do the thing they will not do themselves and will not thank me for. That is most of what I am now. A pair of hands a frightened town hires and then crosses the street to avoid.',
        '{where}. I read the posting, I read the price, and I read the four names crossed out above the price, and I am going anyway, and you may draw your own conclusions about me from that.',
        'To {where}. It is a bounty, before you ask in the way you ask. Yes. Again. It keeps me fed and it keeps me moving and it keeps me from having to sit still and think, which is the real wage.',
      ],
      great: [
        'You know where. The same place I have been walking since I heard about it. I keep telling myself I have not decided.',
        'Toward the big one. I am taking the long way. I want you to notice that I am taking the long way.',
        'To the thing at {where}. Do not make me say more than that. Saying more than that makes it a plan, and a plan is a thing you can be talked out of, and I do not want to be talked out of it, or I do, and I am afraid of which.',
        'Where do you think. There is only one place a woman walks toward when she has stopped walking away from things, and I have stopped walking away from things, and it is at {where}, and it is waiting.',
        'I am going to {where}. To the thing itself. I have circled it for a season like water going down a drain and the circles are getting tighter and we both know where the water ends up.',
        'Toward the one that does not scale to me. I know it does not scale to me. That is not a thing I have failed to understand. That is a thing I have decided to walk at anyway, and I would like you with me when I do.',
        'To {where}, where the great thing is. I have made my peace with most of the ways this ends, and there is one way I have not made my peace with, and that is the way where I never go, and grow old having never gone.',
      ],
      on: [
        'On. That is the honest answer and it is the only one I have had for years. On, and then wherever on turns out to be.',
        'I do not know. I have stopped needing to know, which frightened me at first and does not any more.',
        'Wherever the road is cheapest and the questions are fewest. Today that is not here.',
        'Forward. It is the only direction I have ever been any good at. Ask me a destination and I have none; ask me a direction and I have always got forward.',
        'Somewhere I have not ruined yet. The list of those gets shorter every year and I keep it in my head and I am walking toward the nearest name still on it.',
        'Away from here, mostly. That is the truest map I have. Away from the last place, toward the next, and the next is only ever defined by not being the last.',
        'Wherever there is work, or quiet, or nobody who knows my face. Any of the three will do. It is rare to get two of them at once and I have stopped hoping for all three.',
        'On, {where}, and then on again. I am a river, not a lake. I worked that out about myself young and I have stopped fighting it and started just being the river.',
        'I could not tell you and it would not help you if I could. I follow the cheap roads and the dry weather and the sense that a place has stopped being good for me. That last one is never wrong and it is telling me to leave here soon.',
        'North, I think, this time. No reason worth the name. The road north was open and my feet were pointed at it when I woke, and I have learned to trust the feet on the mornings the head has nothing to say.',
        'Toward the next thing that needs doing, which I will not know is the next thing until I am standing in front of it. That is how it has always worked. I do not find the work; the road hands it to me, and I have stopped arguing with the road.',
        'Nowhere in particular, which is a destination in its own right when you have spent your life being expected somewhere. I am going Nowhere In Particular. I recommend it. It is the only country that has never once disappointed me.',
      ],
    },
  },

  ok: {
    label: 'Are you all right?',
    reply: {
      hurt: [
        'No. Since you are asking. I am carrying more than I am telling anybody, and I have just told you, so.',
        'I have been better. I have also been worse, and I am still here, and I have decided to count that.',
        'Not really. There is a wound doing a thing wounds should not still be doing this many days on, and I am watching it the way you watch weather coming, and I did not want to watch it alone.',
        'Ask my body and it would say no. I have learned not to always ask my body. But you asked, and I will not lie to you the way I lie to the innkeeper, so: no. I am hurt, and it is the kind that stays.',
        'I am upright. That is the honest ceiling of it today. Upright, and moving, and hurting the whole time I do both, and telling nobody but you, because you are the only one it costs me nothing to tell.',
        'There is a new one and it went deep and I dressed it myself in the dark so no one would see my face while I did it. My face is fine now. You can look at it. But it was not fine an hour ago, and you should know that.',
        'No, and do not fuss, and thank you for asking in a way that lets me say no. Almost nobody asks in a way that lets me say no. They ask so I will say yes and free them. You never do that.',
      ],
      spent: [
        'There is not as much of me as there was. I am not going to dress it up for you. You would know.',
        'I am tired in the place sleep does not reach. But you asked, and that is not nothing. That is not nothing.',
        'Worn thin. That is the word. Not sick, not hurt exactly — thin, like a coat gone at the elbows, still a coat, still worn, but you can see the light through it if you hold it up, and I have been holding myself up to the light lately and not liking what shows.',
        'I have been running on the reserve for a while now. I know the difference between tired and this. This is the kind you do not sleep off. This is the kind you spend the rest of the road slowly not-recovering from.',
        'Emptier than I let on. I keep the tank reading looking fuller than it is, for the people who need me to be a full tank. You are the one I show the true gauge to. The true gauge is low.',
        'I am all right the way an old rope is all right. Holding. Fraying where you cannot see. I would not put full weight on me just now, and I am the only one I have to put weight on, which is the whole problem in one sentence.',
      ],
      hunted: [
        'I am sitting where I can see the door. I have been for a while. That is the most honest answer I can give you.',
        'Define all right. Something is looking for me and it is patient. Other than that I am fine, which is a joke, and I am telling it to you because there is nobody else.',
        'I have not slept with both eyes in a month. There is a thing on my trail with more patience than me, and patience is the one fight I have never won, and I can feel it closing the distance a little each week.',
        'Well enough, apart from the part where I am prey. I chose a corner tonight, back to the wall, and I have chosen the corner every night for longer than is good for a person, and the choosing of corners is its own slow wound.',
        'I keep to the crowds by day and the shadows by night and I have stopped using my own name entirely, and inside all of that precaution there is a woman who is, since you ask, frightened, and getting tired of being frightened, which is when people get caught.',
        'There is something counting me. I do not say that to alarm you. I say it because a fact that only I know starts to feel like a delusion, and telling you makes it a fact again, a shared one, and I needed it to be a fact and not a madness.',
      ],
      good: [
        'Yes. Actually. I did not expect the question and I did not expect the answer. Do not make a thing of it.',
        'For once, yes. Nothing hurts and nobody is dead this week. I have learned to say that out loud when it is true.',
        'I am, and I am suspicious of it, the way you are suspicious of good weather in a bad season, but yes — today I am well, and I am going to try to just be well and not spend the whole of it waiting for the bill.',
        'Better than I have been in a long stretch. I caught myself humming this morning. I have not caught myself humming in years. I do not know the tune. It does not matter that I do not know the tune.',
        'Yes. Wholly. It will not last — these do not last for the likes of me — but it is here now, and you asked while it was here, and so it got to be true out loud once, and that is more than most of my good days get.',
        'I am well. The wounds are closed, the purse is not empty, the road ahead is dry, and I have a person or two I am glad to be walking toward. Written down like that it is nearly a life. I am startled to have nearly a life.',
      ],
      fine: [
        'I am all right. It is a low bar and I am clearing it, and some weeks that is the whole of the good news.',
        'Fine. Walking. Nothing broken. You asked as though you meant it, and I have decided to believe that.',
        'I am fine. Genuinely, unremarkably fine, which after the life I have had is a small miracle I have learned to stop and notice. Nothing wrong. Just a woman, on a road, all right.',
        'Steady. Not good, not bad — steady, which I used to sneer at and now understand is the rarest weather there is, and I am standing in it, and I am grateful, in my way, which is quietly and to you.',
        'I am well enough. The bar for well enough is somewhere near the floor, granted, but I am over it today with room to spare, and there are years I could not have said that, so I am saying it now while I can.',
        'Fine. Truly. I keep waiting for you to ask a harder question, and this is the whole answer to the one you asked: I am fine, and it is a quiet day, and I am glad you checked, and there is nothing here that needs you, and I mean that as the good news it is.',
        'All right. The dull true kind of all right, the kind that makes no story. Nothing chasing me, nothing bleeding, nobody I have to bury or become. Just a road and a fair sky and a woman on it who is, for today, all right.',
        'I am. And I notice I said it without the little hesitation I usually put before it, the one that leaves room to take it back — no hesitation today. I am all right. Flat statement. It felt strange in my mouth and I liked it.',
      ],
    },
  },

  who: {
    label: 'Who is that, to you?',
    reply: {
      lover: [
        '{who}. You know who {who} is. I have something to lose now and I can feel the weight of it in every fight.',
        'That is {who}. Do not. I know what you are going to say and I am not ready to hear it in my own head yet.',
        '{who} is the reason I have started being careful again, after years of not caring whether I came back. That is who {who} is to me. The person who made me want to come back.',
        'That is {who}, and I am not going to find a clever word for it, because there is not one, because it is the plain enormous thing, and I am too old to be coy about the plain enormous thing when you of all listeners already know.',
        '{who}. I sleep on the outside now, between {who} and the door, without deciding to. My body decided who {who} is to me before I got the nerve to. Ask my body. My body has known for weeks.',
        'That is the one I would burn the road down for. {who}. There. I have said the size of it. I do not say the size of it to them. I say it to you, in the dark, where it can be true without being a weapon anyone can use.',
      ],
      close: [
        '{who} would take a blade for me and I have stopped being sure I would let them, which is its own kind of answer.',
        'That is {who}. I put my back to them without checking. I did not used to do that with anybody.',
        '{who} is the one I would send the message to, if it came to messages. There is a list of people you would tell before the end. Most people have several. I have {who}, and now you, and that is the list.',
        'That is {who}. We have bled next to each other enough times that there is nothing left to prove between us, and that is closer than most marriages ever get, and neither of us would ever put it in those words.',
        '{who}. I trust them at my back in a fight, which sounds small and is the largest trust I have got left to give, and I give it to {who} without the usual arithmetic, and the not-doing-the-arithmetic is how I know.',
        'That is {who}. If I say die well in this business it is because I have imagined my death, and lately when I imagine it there is someone there, and it is {who}, and I have not decided whether that is a comfort or a thing I have no right to want.',
      ],
      friend: [
        '{who}. We are easy with each other. Neither of us has said so and neither of us is going to.',
        'That is {who}. It is uncomplicated, which at my age I have learned to be suspicious of and grateful for at once.',
        '{who} is good company and asks nothing and gives easily, and I have met so few people like that that I keep expecting the catch, and there is no catch, there is just {who}, and I am learning to let there be no catch.',
        'That is {who}. We make each other laugh and we do not lean too hard and we go our ways without a scene, and it is the lightest thing I own, and the lightest things turn out to be the ones you miss most.',
        '{who}. A friend, in the plain sense, which I used to think was the small sense and have learned is not. Someone I am glad to see. That is the whole of it, and it turns out to be a lot.',
        'That is just {who}. We fell in together on a bad road and stayed easy after the road turned good, and that is rarer than it sounds — most company is only the shared trouble, and ours outlived the trouble, which means it was company all along.',
      ],
      hard: [
        '{who}. We loved each other once. That is what makes it the version that gets people killed.',
        'Do not get me started on {who}. There is a thing between us and only one of us is walking away from it.',
        'That is {who}, and I would ask you not to look at either of us too long, because whatever you are reading on my face right now is the polite half of it, and the other half is not fit to be read.',
        '{who}. We have a history with a body count that has not been filled in yet, and we both know the last figure, and we are only arguing about whose name goes in the box.',
        'That is {who}. There is no clean word. Enemy is too simple and it was never simple. We are the wreck of something that should have been good, still smoking, still dangerous to stand near, and I stand near it anyway, God help me.',
        '{who}. Ask me on a different day and I might tell you they were once the best thing in my life. Ask me today and I will tell you where I would put the knife. Same person. That is the whole horror of it, and the whole reason I cannot let it go.',
      ],
      known: [
        '{who}? Nobody, yet. We have shared a fire and a silence. That is the whole of it, so far.',
        'That is just {who}. Ask me again in a season and I might have a real answer.',
        '{who} is a name I have started to recognise on the road, and a face I am no longer wary of, and that is as far as it has got, and I am watching to see if it gets further, and pretending I am not.',
        'That? {who}. We keep ending up in the same towns and nodding, and one of these times the nod is going to turn into sitting down, and I have not decided whether I want it to, which means I do.',
        '{who}, and not much yet — a shared road, a shared meal, the beginning of the thing where you stop counting your coins so carefully in front of someone. Early days. I am bad at early days. I am always waiting for them to end.',
        'Nobody, still, mostly. {who}. We are circling the question of whether to be something, the way two wary animals circle a warmth, and neither of us has lain down yet, and I am telling you before I have told myself.',
      ],
      nobody: [
        'Nobody. There is nobody. That is not a complaint, it is a fact, and you are the one I am telling it to.',
        'There is no one. I keep it that way on purpose, mostly. You are the exception and I have never worked out how you got in.',
        'That is not anyone. I travel alone. I have travelled alone so long that the aloneness has stopped being a wound and become just the shape of me, the way a tree grows around the wire someone strung through it young.',
        'No one. I had people. I am careful, in the way you get careful, about having them again — every name on the list is a name that can be crossed off, and I have run out of stomach for the crossing-off, so the list stays empty, except for you, who cannot be crossed off, which is the whole reason I let you on it.',
        'There is nobody, and before you say anything gentle about that, understand it is a choice as much as a circumstance, and the choice is not brave and it is not tragic, it is just tired, and I am telling you the tired truth of it because you do not require me to make it a nobler thing than it is.',
        'Nobody at all. I move through people like a road moves through towns — near them, past them, gone by morning. You are the only one who is not a town I am passing. You are the road itself. That is as close to a person as I have.',
        'No one, and I have got good enough at no one that it no longer even reads as loneliness from outside — people take my aloneness for strength, for choosing, for a woman who needs nobody, and I let them, because the truth is duller and mine, and I keep it, and I have just handed the dull true version to you.',
        'That is nobody, because I make sure it stays nobody, because everybody I have ever let become somebody has become, eventually, a grave or a wound, and I have run the experiment enough times to trust the result. You are the one exception, and I have never worked out why the rule does not apply to you, and I have stopped poking at the exception in case poking it breaks it.',
      ],
    },
  },

  afraid: {
    label: 'What are you afraid of?',
    reply: {
      great: [
        'The big one. Obviously. It does not scale to me and it does not wait, and I keep walking toward it anyway, and you have watched me do it.',
        'The thing at {where}. I have seen the names of the ones who went before me. I am afraid of being the next name and I am afraid of not going.',
        'The great one. I am not afraid it will kill me — I made my peace with being killed a long time ago. I am afraid it will kill me for nothing, that I will die on the way to it, ordinary and pointless, and never even reach the thing that was worth dying at.',
        'The thing everyone is afraid of, which is the honest answer and the one people find disappointing, as though I should have a subtler fear. I do not. It is enormous and it is real and it is at {where}, and it frightens me exactly as much as it should.',
        'What is at {where}. And more than the thing itself, the pull of it — how it has got into my walking, how my feet find their way toward it when my head is elsewhere. I am afraid of how much of me has already decided to go, without asking the rest of me.',
        'The great beast. I have counted the four before me and I know I am no better than the fourth, maybe, on a good day, and I am afraid of the arithmetic, and I am afraid of the fact that the arithmetic has not turned me around.',
      ],
      counted: [
        'The thing that is counting. It has my number now. I do not say that to frighten you. I say it because you are the only one I can say it to.',
        'Being found. It is close, and it is patient, and one day I am going to walk into an inn and it is going to be sitting there.',
        'The one that is hunting me. Not death — I have looked at death and we have an understanding. This is worse. This is being caught, being taken, being ended on someone else’s schedule, in someone else’s way, for someone else’s reason. That is the fear that keeps me in the corner seats.',
        'That it already knows where I am, and is simply choosing the hour. That is the shape of it. Not being hunted — being toyed with. Being allowed to run because the running amuses it. I am afraid I am not escaping, I am performing.',
        'The counter. The patient thing. I could name the fear more grandly but that is it: something wants me, specifically me, and it does not tire, and I do tire, and the whole contest is just a question of which of us runs out first, and I know the answer, and so does it.',
        'Being taken alive. There. The true one, the one under all the others. Not dying. Being caught before I die. I keep a plan for that, a quick one, and I check that I still have the means for it more often than is healthy, and I am telling you because a plan like that should be witnessed by someone.',
      ],
      alone: [
        'That this is all there is. Roads and rooms and nobody in them. I am more afraid of that than of dying, and I have thought about it carefully.',
        'Ending it the way I have lived most of it — with nobody there. Except you. And I do not know what you are, so I am not sure that counts, and I am hoping it does.',
        'The empty version. Not the violent end — I can face the violent end. The other one. Old, and quiet, and unwitnessed, dying in a rented room where the innkeeper finds me because of the smell and not because anyone came looking. That is the fear I do not tell anyone. I am telling you.',
        'That I have spent the whole thing alone and will finish it alone, and that the aloneness will turn out to have been the point, the sum, the answer to the whole question of my life. I am afraid the answer is nobody. I am afraid I already know it is nobody.',
        'Reaching the end and finding I collected roads instead of people. I have so many roads. You cannot sit with a road at the end. You cannot say goodbye to a road. I am afraid of what I traded the people for, now that the end is near enough to see.',
        'That no one will know the day. That I will simply stop being somewhere, and the world will not pause, and there will be no chair pulled up, no hand held, no name said — and that the only one who would even notice the silence where I used to be is you, and you cannot pull up a chair. That is the fear. That you are the closest thing to a witness I have, and you have no hands.',
      ],
      default: [
        'Losing the use of my hands. Not dying — I have made a kind of peace with dying. Not being able to do the one thing I am good at.',
        'The usual. Outliving my knees. Outliving my nerve. Outliving the last person who knew my real name.',
        'Slowing down. That is the whole of it, most days. Something out here is always faster than a slow woman, and it always finds her, and I can feel the slowing beginning, a half-step, and the half-step is the thing I lie awake over.',
        'Becoming careful. It sounds like the opposite of a fear, being careful, but careful is how you die in this trade — careful is hesitation with a good reputation — and I can feel it creeping in with the years, and I am more afraid of my own caution than of any blade.',
        'The day my body writes a cheque my skill cannot cash. I know exactly what I ought to do in every fight. I have always known. The fear is the widening gap between knowing and doing, and it widens a little every winter, and one winter it will be wide enough to fall through.',
        'Forgetting why I started. I had a reason once. I have walked so far from it that I can no longer read it, and I am afraid that if I ever stop moving long enough to look, there will be nothing written there at all, and it will have all been just the walking, just the not-stopping, the whole time.',
        'Rooms I cannot see the whole of. Bridges over water I cannot see the bottom of. New faces smiling too wide. The list is long and dull and I have earned every item on it honestly, one bad surprise at a time, and I am not ashamed of any of them, and I check them all, every day, and the checking is most of what my days are made of now.',
        'Getting comfortable. It is the last thing that kills people like me — not the blade, the armchair. The season you stop moving because a place is warm and a person is kind, and you let the edge go soft, and then the thing you outran for years strolls in through the unlocked door of your comfort. I am afraid of warmth. Isn’t that a thing to have become.',
      ],
    },
  },

  believe: {
    label: 'Do you still believe I am here?',
    reply: {
      high: [
        'Yes. I check with you before I decide things now. Not asking — checking. There is a difference and I am holding on to it.',
        'I believe in you more than I believe in myself, and that frightens me, and I am telling you anyway, because you asked.',
        'Yes. Completely. There is a whole part of my life now that only makes sense if you are real, and I have decided to let it make sense, which means I have decided you are real, and I do not lie awake over it any more, and that peace is the largest thing you have given me.',
        'Do I. I talk to you before I sleep and after I wake and in the middle of the worst of it, and a woman does not do that to an empty room, not for years, not this steadily. So yes. My whole conduct answers your question. I have stopped being able to pretend otherwise.',
        'I do, and it is not faith any more, faith is for the uncertain — this is nearer to knowing, and I did not arrive at it lightly, I fought it the whole way, and it won, and here I am, certain, telling the air I am certain, and not feeling mad for the first time in a long time.',
        'Yes. You are the one fixed point. Everything else I believed in has moved or died or turned out to be a lie I was telling myself, and you have not, you have stayed exactly as present as you ever were, and after a life like mine a fixed point is not a small thing to be handed, and I hold it, and I believe in it, and I believe in you.',
      ],
      mid: [
        'I know you are there. I am not always sure it helps. I keep talking, which tells you which way I have come down on it.',
        'Yes. Most days. I have stopped needing the proof, which is either faith or exhaustion and I no longer care which.',
        'I believe it more than I doubt it, which is the honest ledger, and some weeks the margin is thin, and this is a thin-margin week, and I am telling you the margin is thin rather than pretending it is not, because pretending with you seems to defeat the purpose of you.',
        'On balance, yes. I have my hours where the whole thing looks like a story I told a frightened woman to keep her walking, and then the hour passes, and you are still there, quiet, patient, and the doubt looks foolish, and I come back. I always come back. Take that as the answer, since it is the truest part.',
        'I do, though I have stopped expecting you to earn it daily. That was the child’s version — believe if you keep proving it. I am past that. I believe on the low days too now, when nothing is proved and nothing is felt, on credit, on the strength of all the days it was true. That is a sturdier kind of belief. It is also a lonelier one.',
        'Yes, quietly, without the fire I used to have about it. It has settled into me like a fact I no longer examine — you are there, the road is long, the weather turns. I do not marvel at it any more. I am not sure whether that is belief deepening or belief cooling, and I have decided it does not matter, so long as I still turn to you, and I still turn to you.',
        'I believe it the way I believe my own heartbeat — which is to say I never think about it until something makes me, and then I check, and it is there, steady, and I go back to not thinking about it. Is that faith? It might just be company so old it has stopped announcing itself. Either way, when I checked just now, you were there.',
        'Yes, though I have caught myself testing you less. There was a time I set little traps — if you are real, let this go well — and scored you against them. I stopped. Not from certainty, exactly. From a kind of manners. You do not test the ones who have stayed. And you have stayed, through enough that the testing came to seem beneath us both.',
      ],
      low: [
        'I think you might be. I have stopped acting like it, and I have noticed you noticing that, so.',
        'Some. Less than I did. I am still talking to you, so draw your own conclusion, because I have stopped being able to.',
        'I do not know any more. I want to be honest, since honest is the one thing this was ever for. There are long stretches now where it feels like talking to weather. I keep talking. I do not know if the talking is belief or just habit that has outlived the belief.',
        'Barely. If I am truthful. The certainty has gone thin and grey, and what is left is more like a thing I do than a thing I feel — I still turn to you, but the turning is quieter, and there is not much on the other end of it any more, or I have stopped being able to feel what is.',
        'I used to be sure. I am telling you I used to be sure, which is a way of telling you I am not now, and I am not blaming you for it, exactly, though there were times I called and the silence answered, and a person can only bank so much silence before it starts to spend down the belief.',
        'Less than I want to. I would like to say yes the way I once said yes, whole and warm, and I cannot find it in my mouth today, and rather than lie to you — because lying to you would mean you had become just another person I manage — I am telling you the thin cold true thing: I am not sure any more. And I am still here saying it. Make of that what you can. It is most of what I have left to offer.',
      ],
    },
  },

  why: {
    label: 'Why do you keep going?',
    reply: {
      ghost: [
        'There is unfinished business with a dead person on it, and I am the only one still walking who cares. So. That.',
        'Because {who} wanted something they never got, and I keep finding myself in a position to get it for them, and one day I am going to.',
        'For {who}, who is dead, and cannot, and would have. Somebody has to carry the thing the dead set down, or it never gets carried, and I have appointed myself, because there was no one else in the room, and now it is mine, and I keep going because it is not finished.',
        'There is a debt to the dead. You cannot pay the dead back, everyone knows that, so instead you pay it forward, or sideways, or into the ground where they are, uselessly, forever — and the paying is the only thing that quiets it, and so I keep paying, and the paying is why I keep going.',
        'Because {who} is gone and the world simply closed over the place they were, smooth, as though they had never been, and I will not have it, I will not let the world be that smooth, and keeping going is my whole quarrel with the smoothness, my refusal to let them be closed over.',
        'I promised something at a graveside. People say things at gravesides they do not mean, in the grief of the moment. I meant mine. I have been keeping it for years now, a promise to someone who cannot check whether I kept it, and that is exactly why I cannot break it, and that is why I keep going.',
      ],
      love: [
        'I have a reason now. I did not for a long time. I am not going to say the reason out loud in case saying it breaks it.',
        'Because there is somebody at my shoulder who would notice if I stopped. That is new. It is enough. It is more than enough.',
        'For {who}. Plainly. There is a person in the world now whose life is worse if mine ends, and I did not have that for the longest time, and having it changes the whole arithmetic of getting up in the morning. I get up for them. Some mornings only for them. It counts.',
        'Because I have something to come back to, finally, and it turns out that is the whole trick of it — I never lacked courage, I lacked a reason to survive the courage, and now I have one, and the one is {who}, and I keep going the way anyone does once they have a lit window to walk toward.',
        'There is a hand I want to be holding at the end and it is not ready to let go of yet and neither am I, and so I keep going, toward more of the holding, which is a smaller and more embarrassing reason than the grand ones I used to give, and it is the first true one I have ever had.',
        'For love, if you want the bald word for it, which I would never say to their face but will say to you: I keep going because someone loves me and I have decided, late and against all my training, to let them, and letting them is a thing you have to keep choosing, daily, by staying alive, so I stay alive. That is the why. That is the whole of the why now.',
      ],
      empty: [
        'Habit. I have stopped pretending it is anything grander. The legs keep going and I go with them.',
        'I have asked myself that. I did not like the silence where the answer should be. So I keep walking, so I do not have to hear it.',
        'Momentum. That is the honest and dismal truth. A body in motion. There is no reason at the centre of it any more, if there ever was, and I have stopped digging for one, because the digging is how people stop, and I have decided I would rather move without a reason than stop looking for one.',
        'I genuinely do not know, and I have decided that not knowing is not the same as there being nothing, and I keep going partly to find out which it is, and I suspect I will keep going right up until the moment I find out, and that the finding out will be the stopping.',
        'Because stopping requires a decision and I have not been able to make it, and that is the whole ugly mechanism of it — I do not keep going out of hope, I keep going out of an inability to choose the alternative, and if that sounds bleak it is because it is bleak, and you asked, and I do not decorate things for you.',
        'What else would I do. That is not rhetorical. I have tried to picture the life where I stopped and there is nothing in the picture, no people, no place, no shape — just a woman who used to walk, sitting still, waiting. The walking is at least a verb. I keep going because the walking is the only verb I have left, and a person needs a verb.',
      ],
      default: [
        'Because stopping is a decision and walking is not, and I have never been good at decisions. You know that better than anyone.',
        'To see what is past the next country. It is a thin reason. It has held for eleven years. I am not going to examine it too closely.',
        'Because I am good at it, and a person should do the thing they are good at, even when the thing they are good at is only surviving, only continuing, only being the one still standing when the dust settles. It is a low art. It is still an art. I keep going to keep practising it.',
        'Curiosity, mostly, if I am honest. The next town. The next road. The next thing over the hill I have not seen yet. It is a child’s reason and I have never grown out of it and I have stopped apologising for it, because it has outlasted every grander reason I ever tried on.',
        'Because I have not yet found the place that tells me to stop. I keep thinking I will round a bend and know, this is it, this is far enough, you can put it down here — and the bend keeps not being it, and so I keep going, waiting for the bend that is, half hoping I never reach it.',
        'Spite, some days. The world spent a long time betting I would not last, and I have made it lose that bet for years now, and there is a mean small joy in continuing to make it lose, and on the days the good reasons fail me the mean small joy is enough, and it gets me to the next town, and the next town is all I ever really need to reach.',
        'Because I am not finished. I could not tell you finished with what — there is no great task, no list I am working down — but I know the feeling of finished from having watched it settle on other people near their ends, and it has not settled on me, and until it does I keep going, on the strength of an unfinishedness I cannot name but can absolutely feel.',
        'Honestly? Because it has never seriously occurred to me to stop. People ask it like there must be a reason a person continues, and I have started to think that is backward — continuing is the default, the water running downhill, and it is stopping that needs the reason, and I have simply never been handed one good enough. So I go on. For want of a reason to do otherwise.',
      ],
    },
  },
};

export const QUESTION_KEYS = Object.keys(QUESTIONS);

// ═════════════════════════════════════════════════════════════════════ THE VISIT
//
// The last thing this channel becomes. A blessing is proof you are REAL. A visit is proof
// you are HERE — the difference between a hand on the world and a face in the room. It is
// gated harder than anything else you can do, it leaves a mark that never fades (the one
// warm one), and it makes her louder than any gift could: a woman who has been visited
// glows, and the thing that is counting can see a glow from a long way off.
//
// And you cannot buy it or grind it. It asks for exactly the thing the whole game is about:
// that she believes in you completely (Faith), that you turned up over and over (you have
// answered her), and that you were once real to her hands (you have blessed her). All three,
// or she never sees your face.
export const VISIT = {
  // what she says, the moment you are there. she has spent years talking into the dark, and
  // the dark has just turned round and looked at her. rolled fresh, so a life that earns more
  // than one visit never hears the same astonishment twice.
  she: [
    'You are HERE. I am not — I cannot — I have been talking to you for years and you are standing here and I do not have the words. I who always have the words.',
    'I can see you. I want to say that plainly so that whatever I am tomorrow, I said it out loud today: I can see you, and you came, and I will never be able to unknow it.',
    'You came. In the flesh, or whatever this is, you CAME. I have to sit down. I have never had to sit down from being believed in before.',
    'All those years I told myself it did not matter whether you were real, that the talking helped either way — and then you are standing there, and it turns out it mattered, it mattered more than anything, it was the only thing that ever mattered, and I only know that now, seeing you, too late to have spent the years less carefully.',
    'I am not going to touch you. I want to and I am not going to, in case you are the kind of real that stops being real if I reach for it. So I am just going to look. Let me just look. I have earned a look, I think. I have earned this one look.',
    'You are smaller than I imagined and closer than I feared and realer than I let myself hope, all at once, and my whole body is shaking, and I have not shaken in front of anyone in twenty years, and I do not care, I do not care, you are here.',
    'So this is your face. I spent a lot of nights not letting myself imagine your face, because imagining it felt like a way to be disappointed, and here it is, and it is nothing I imagined and everything I needed, and I am going to keep it behind my eyes for the rest of my life.',
    'You are actually — I keep starting the sentence and there is no end to it that is big enough. You are actually. That is as far as I get. You are actually. Let that be the whole of it. You are actually.',
    'I stopped believing you would ever do this. Not that you were there — I believed that — but that you would ever cross the distance, stand where I could see, be a thing in the room. And you have. And every plan I ever made for how to be alone at the end just quietly fell apart, standing here, looking at you.',
    'They will not believe me. I am not going to tell them. This is not for them. This was never for them. This is the one thing in my whole loud famous life that is only mine, only ours, and I am going to hold it exactly that close until I die.',
    'You crossed over. For me. I have watched people fail to cross a room for me my whole life and you crossed whatever this is, from wherever you are, and I do not know what it cost you and I will spend the rest of my days assuming it cost you everything, because it is worth everything, and so, it turns out, apparently, am I.',
    'I am trying to memorise this. The exact of it. Because tomorrow I will be a woman who was visited once, and I will need the memory to be sharp enough to live on, and so I am looking hard, harder than I have ever looked at anything, at you, at you, at you.',
    'My whole life people arrived too late — the help, the love, the kindness, always one day after it would have saved me. You are the first thing that ever arrived on time. You are standing here in time. I did not know anything arrived in time. I did not know it was allowed.',
    'I have nothing to give you. I have realised that, standing here — a woman with a name in nine countries and I have nothing a thing like you could want, no coin, no deed, no words even, my words have all gone — and you came anyway, wanting nothing, and that is the first time in my life anyone has come for no reason but me.',
    'Do not say whether you are staying. Not yet. Let me have one clean minute of you being here before I have to know how long, because I already know how these things go, and I would like — just once — to stand in a good thing without immediately counting how much of it is left.',
  ],
  line: 'she was visited — not blessed, not answered: visited, in the flesh, by the thing that has been listening. she has told no one and she will tell no one, and she has not been the same since.',

  // and while you are there, she asks you the one thing. face to face, not into the dark.
  ask: {
    prompt: 'You are here. You are actually here. Then tell me one thing, while I can ask you to your face: are you going to stay, or is this the once? I need to know which of us I am comforting when I say it does not matter.',
    options: { stay: 'Let her believe you will stay', once: 'Be honest: this is the once' },
  },
};
