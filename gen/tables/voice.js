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
