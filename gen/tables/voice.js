// HER VOICE — the second channel.
//
// The chronicle is the RECORD: third person, what happened, the world's account. This
// is the other thing. This is her, talking to you.
//
// She knows you are there. She does not know what you are, she has never had it
// explained, and she has stopped asking. She talks to you the way people talk to the
// thing they have decided is listening: not reverently. Bluntly. Often to complain.
//
// ---------------------------------------------------------------------------
// THE ONE RULE THAT MATTERS
//
// She speaks to you LESS as she drifts away from you.
//
// `heeds()` already falls as her `true` dials pull away from the `intent` you set. So
// the frequency and the WARMTH of this channel are both a function of heeds(). A woman
// who still listens to you talks to you like a friend. A woman who has stopped talks
// to you the way you talk to a room you are not sure is empty.
//
// That is the whole reveal, and it is not a line the UI prints at you. It is her going
// quiet. You will feel it before you can name it, which is the point.
//
// VOICE: second person, addressed to you. Terse. Never devotional — she is not
// praying, she is talking. She undercuts herself constantly. She is not grateful by
// default and she does not perform.

export const VOICE = {
  // ------------------------------------------------- the first time she says anything
  first: [
    'I know you are there. I have known for a while. I am not going to make a thing of it.',
    'You have been there since the beginning, I think. I would rather you said so, but here we are.',
    'I talk out loud on empty roads. I have been calling it efficiency. We both know what it is.',
    'I am not going to ask what you are. I have decided I would rather not be told.',
  ],

  // ------------------------------------------------------ she is warm, and hates it
  // fires when heeds() is HIGH — she is still listening to you
  close: [
    'That was you. I felt it go the way you wanted it to go, and I have not decided how I feel about that.',
    'Thank you. There. I have said it. Do not expect it often.',
    'I was going to do the other thing. You know I was going to do the other thing.',
    'I have started checking, before I decide. Not asking. Checking. There is a difference and I am holding on to it.',
    'You are quiet today, and I noticed, and that is the part I did not expect.',
    'If you are ever going to say something useful, this would be the week.',
    'I sleep better when you are paying attention. I have no evidence for that and I believe it anyway.',
    'I told someone about you today. I lied about it immediately. I want you to know I lied about it.',
  ],

  // --------------------------------------------------------- she is drifting from you
  // fires when heeds() is LOW — the reveal, and it never announces itself
  cold: [
    'I did not wait for you.',
    'You would have said no. I know you would have said no.',
    'I have stopped explaining myself to you. You may have noticed. I assume you notice everything.',
    'I am not asking any more. I want to be clear that this is a decision and not a lapse.',
    'You are still here. I can tell. I am telling you that I can tell, and that it does not change anything.',
    'It has been a long time since I did what you wanted. I am not sorry. I am telling you, which is not the same.',
    'I used to think you were helping.',
  ],

  // ----------------------------------------------------------------- you were not there
  // fires when a judgment expires unanswered. this is the cost of neglect, and it is
  // the only thing in this game that is allowed to be an accusation.
  absent: [
    'You were not there. I waited. I want you to know I waited, and then I decided.',
    'I asked. You said nothing. So it is mine now, whatever it turns out to be.',
    'I gave you four days. That is more than I give anyone.',
    'I have decided. You do not get to have an opinion about it later.',
    'Where were you. I am not going to ask twice, but: where were you.',
    'I stopped waiting. I want that written down somewhere, if you are writing any of this down.',
  ],

  // ---------------------------------------------------------------------- she is afraid
  afraid: [
    'I am not going to be able to keep doing this. I wanted somebody to have heard me say it.',
    'If it goes badly, it will go badly quickly. You should know that going in.',
    'I am frightened. That is all. You do not have to do anything.',
    'Do not let me be clever about this. I get clever when I am frightened and it has nearly killed me twice.',
  ],

  // ------------------------------------------------------------------------ she is hurt
  hurt: [
    'I am hurt. Properly. I am telling you because there is nobody else to tell.',
    'It has stopped closing. I am not going to think about that too hard and I would appreciate it if you did not either.',
    'Do not let me get up tomorrow. I will want to get up tomorrow.',
  ],

  // ------------------------------------------------------------------------- she grieves
  grief: [
    'They are dead. I want you to have known them, and you did not, and that is the worst of it.',
    'I buried them. You were there. That is not nothing, and it is not much.',
    'Do not say anything. I know you cannot say anything. I am asking anyway.',
    'I have been careful my whole life and I was careful with them and it did not matter.',
  ],

  // ------------------------------------------------------- something in her has changed
  // fires when she earns a TRAIT. she is the one who notices, not the UI.
  became: [
    'Something has gone out of me. I noticed it today and I am not looking for it.',
    'I am not who I was when you found me. I do not think that is your fault.',
    'I did that without thinking. A year ago I would have thought about it. I do not know which of those is worse.',
    'I have got good at this. I would like the record to show that I did not want to.',
  ],

  // ------------------------------------------------------ you are the only one left
  // Fires when she is FAMOUS or ISOLATED enough that there is genuinely nobody else — a
  // feared name nobody will sit near, a beloved one nobody truly knows, a woman who has
  // outlived everyone who remembers her. In that state she reaches out to you far more, and
  // this is the register she does it in: not warm exactly, but need, admitted.
  only: [
    'You are the only one who has been here the whole way. I did the arithmetic the other night. It comes out to you.',
    'There is nobody left who remembers who I was before this. Except you, and you never met her, and I have started telling you about her.',
    'I have a name in nine countries and not one person in any of them I could say this to. So it is you. It has been you for a long time.',
    'They step aside for me now. All of them. Nobody steps toward me. You do not step at all and somehow that is more.',
    'I talk to you more than I used to. I have noticed. It is not that I believe in you more. It is that the room got emptier.',
    'Do not go quiet on me. Of everything I have lost I could not stand to lose the one thing that was never really here.',
  ],

  // -------------------------------------------------------------- she is asking you
  // the prompt on a judgment. it is not an abstract question — it is HER, asking.
  ask: [
    'I am asking you. I do not do that often, so.',
    'Tell me what to do. Or do not. But be quick about which.',
    'I have thought about it from every side and I am still standing here. So.',
    'You have an opinion. You always have an opinion. Say it.',
    'I will do what you say. This once. Do not read anything into it.',
  ],
};

// She talks to you more when she is still listening, and hardly at all when she is not.
// This is the curve, and it is the whole design in one function.
export const speaksTo = (heeds) => 0.06 + 0.22 * heeds;

// ─────────────────────────────────────────────────────────────────────────────
// WHAT SHE CONFIDES — the people in her life, and how she actually feels about them.
//
// The chronicle says what she DID. Her voice, above, says how she is. This is the third
// thing, and it is the one you asked for: she turns to you and tells you what she feels
// about a specific person — that she is in love, that she wants somebody dead, that she owes
// a debt she cannot say thank you for. You are the only one she will say any of it to. Some
// of it she would deny to their face. That is exactly why it comes to you.
//
// Every bucket is chosen by the ACTUAL STATE of an ACTUAL bond (src/sim.js confide()), so
// she never confides a love she does not have or a hatred she has not earned. `{who}` is the
// person, filled in before you see it.
export const CONFIDE = {
  // she is in love, and it terrifies her, and she tells you and not them
  love: [
    'I am in love with {who}. I have not said it to them in those words. I said it to you first, which tells you which of the two of you I trust, and frightens me.',
    'It is {who}. I did not go looking and I found it anyway. I have something to lose now — I feel the weight of it in every fight, and I am not giving it back.',
    'I woke before {who} this morning and did not get up. I lay there. That is the whole of the entry, and it is more than I have had in years.',
    'I love {who}. I am telling you because once I say it to them I cannot unsay it, and I am not ready, and I wanted it to exist somewhere first.',
  ],
  // it has not happened yet, and she can feel it deciding to
  falling: [
    'I could love {who}, if I let myself. I have been very careful not to let myself. I am telling you because you are the only one who will not go and tell them.',
    'I keep finding reasons to be wherever {who} is. I have noticed I am doing it. I have not started stopping.',
    'Something has changed with {who} and I have not decided whether to allow it. Do not say anything. I know exactly what you would say.',
  ],
  // close AND furious — the one that gets people killed, because she loved them once
  feud_kill: [
    'I want to kill {who}. I mean that plainly. And I loved them once, and that is the only reason it is still a want and not a thing already done.',
    'There is nobody I hate the way I hate {who}, and nobody I have been closer to, and if you think those are two different sentences you have never hated anyone properly.',
    '{who} and I are going to end each other one day. We both know it. We are only deciding which of us gets tired first.',
  ],
  // a rivalry with teeth — she is angry, and the anger does not cool, and she has started
  // thinking about the person simply not being in the way
  anger: [
    'I am angry with {who} in a way that does not cool. We want the same thing and there is one of it, and I have started thinking about {who} not being in the way, and I mean that more literally each week.',
    'I could do without {who}. I caught myself working out how permanent I would want that to be. The answer moved while I was looking at it, and I did not like where it went.',
    'There is a thing between {who} and me that is going to have to be settled. I am telling you now, while I still mean "settled" and not the shorter, worse word I have been trying not to use.',
    '{who} crossed me and has not stopped, and I have a long memory and a short list, and they have put themselves on it.',
  ],

  // clean hatred, no history to soften it
  hate_kill: [
    'I could kill {who} and sleep the same night. I have worked out how. I am telling you so that somebody knows it was not a thing that just happened to me.',
    'I hate {who}. Cleanly. No history to complicate it. It is almost restful, hating somebody I never once liked.',
    'If {who} died tomorrow I would not pretend to grieve — and I would not have had to do it myself, and I turn that second part over more than is good for me.',
  ],
  // they sold her, and they are still breathing
  betrayed: [
    'I want {who} dead for what they did to me. I gave them everything and they sold it. Tell me that is not a reason. You cannot, and you will not, and that is why I am telling you and not somebody who would stop me.',
    'I trusted {who}. That is the whole of it. I do not want to talk about it, and I am telling you, which tells you what I am under the not-wanting.',
    'Every road I walk now, I am half looking for {who}. Not to talk. I want you to know that about me, in case it matters later.',
  ],
  // closer to them than she trusts them, and she knows it
  distrust: [
    'I am closer to {who} than I trust them, and I know precisely how that sentence tends to end, and I keep letting them closer anyway.',
    'I would put my back to {who}. I am not certain I should. I have not worked out whether that makes me a fool or just tired of checking.',
  ],
  // a life saved, a thank-you she cannot say
  debt: [
    'I owe {who} my life and I have not said thank you. I do not know how to begin, and the longer I do not, the more it curdles into something near resentment, and I am ashamed of that, and I am telling you the ashamed part too.',
    '{who} stepped in front of a blade that had my name on it. Now I owe them, and owing somebody is its own kind of debt collector, and it does not sleep.',
  ],
  // she handed somebody the knife
  secret: [
    'I told {who} a thing I have told nobody. I put the knife in their hand myself. I have been sick about it all week. I would do it again, and I do not know what that says about me.',
    '{who} knows the true thing about me now. I gave it to them freely, one night, because I wanted somebody in the world to be holding it. I am aware of what I have done.',
  ],
  // the warmth she will not admit to their face
  fond: [
    'I am fond of {who} in a way I would deny to their face and am admitting to yours. Do not make a thing of it.',
    '{who} is easy to be around, and I have not had easy in a long time. I keep waiting for the price. There does not seem to be one, and that is its own kind of unease.',
    'I took the second watch so {who} could sleep, and did not tell them, and I think they knew. That is the nearest thing to happy I can point at just now.',
    '{who} makes me laugh, which I had thought was a thing that had been trained out of me. Apparently not. Apparently it was just waiting.',
    'I trust {who}. I want that noted somewhere, because I do not say it about many people, and I have said it about fewer and been right about almost none.',
    'If it came to it, I would stand between {who} and the thing coming for them, and I would not think about it first. I have thought about the not-thinking, though.',
    'I told {who} a joke my mother used to tell. I have not thought about my mother in years. {who} is doing something to me and I have not decided to stop it.',
  ],
  // and the dead, who she still talks to
  grief_person: [
    'I still talk to {who} sometimes, out loud, on empty roads. They are dead. I know they are dead. I do it anyway.',
    'I dreamed about {who} again. I woke before dawn and walked until it was light. I would give a great deal to have buried them old.',
    'Nobody says {who}’s name any more except me, and I only say it to you. That is what it comes to, in the end. That is what a person comes to.',
  ],
};
