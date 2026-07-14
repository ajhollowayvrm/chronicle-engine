// The vigil.
//
// You are assigned to one woman. You cannot move her, save her, or make her do
// anything. You can answer, when she asks. This file renders that and nothing else.
//
// THE ONE THING THIS SCREEN EXISTS FOR: her voice. It is the hero, it is the only
// warm thing on the page, and it goes COLD as she drifts from you. The colour is the
// mechanic — you catch it before you read the words, which is exactly how it happens.
//
// No game logic lives here. If you find yourself wanting to put a rule in web/, the
// rule belongs in src/sim.js.

import {
  newJournal, replay, targetElapsed, msUntilNextDay, save, load, bury,
  SAVE_KEY, SPEEDS, DEFAULT_SPEED,
} from '../src/game.js';
import { TRAITS } from '../gen/tables/traits.js';
import { STATS, DOMAINS, STAT_MAX, rankOf } from '../gen/tables/stats.js';
import { kindOf, describe } from '../src/bonds.js';
import { MARKS } from '../gen/tables/marks.js';
import { CALLINGS } from '../gen/tables/callings.js';
import { SHAPES } from '../gen/tables/goods.js';
import { usable, underAsk, unsworn } from '../src/kit.js';
import { reachable, letHerReachYou, tellTheServer, stopWatching, vigilId } from './reach.js';

const $ = (id) => document.getElementById(id);
const store = window.localStorage;

let journal = null;
let sim = null;
let elapsed = 1;
let timer = null;

// Her stats as they were WHEN YOU LAST LOOKED. This is the whole point of checking in
// on someone: you come back and find out what the time did to them. It is recomputed by
// replaying the journal to the day you last read, which costs nothing and keeps the
// save a pure journal of inputs — no snapshot to drift out of sync.
let before = null;

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

// ─────────────────────────────────────────────────────────────── the assignment
function wireBoot() {
  for (const d of ['reckless', 'sociable', 'generous']) {
    const input = $(`boot-${d}`);
    const out = input.nextElementSibling;
    input.addEventListener('input', () => { out.value = input.value; });
  }
  $('boot-go').addEventListener('click', begin);
}

function begin() {
  journal = newJournal({
    seed: Number($('boot-seed').value) || 12,
    speed: $('boot-speed').value,
    dials: {
      reckless: Number($('boot-reckless').value),
      sociable: Number($('boot-sociable').value),
      generous: Number($('boot-generous').value),
    },
    now: Date.now(),
  });
  save(journal, store);
  enter();
}

function enter() {
  const wasAt = journal.seenElapsed ?? 1;
  before = wasAt > 1 ? { ...replay(journal, wasAt).state.stat } : null;

  const r = replay(journal, targetElapsed(journal, Date.now()));
  sim = r.eng;
  elapsed = r.elapsed;

  journal.seenElapsed = elapsed;
  save(journal, store);

  $('boot').hidden = true;
  $('game').hidden = false;

  render();
  window.scrollTo(0, 0);   // you open this to hear from her. she goes first, every time.
  if (!timer) timer = setInterval(loop, 1000);
}

// Days arrive on the wall clock, not on a game loop. She is out there whether or not
// this tab is open.
function loop() {
  const target = targetElapsed(journal, Date.now());
  let moved = false;
  while (elapsed < target) { sim.tick(); elapsed++; moved = true; }

  if (moved) {
    journal.seenElapsed = elapsed;
    save(journal, store);
    render();
  } else {
    renderTick();
  }
}

// ───────────────────────────────────────────────────────────────── you answer
function answer(id, key) {
  sim.answer(id, key);
  journal.entries.push({ elapsed, type: 'answer', id, key });
  save(journal, store);
  // YOU CAME, so her future is a different future — and the server's prediction of when she
  // will next need you is now a prediction about a woman who no longer exists.
  tellTheServer(journal);
  render();
}

function setDial(dial, value) {
  sim.state.intent[dial] = value;
  journal.entries.push({ elapsed, type: 'dials', dials: { [dial]: value } });
  save(journal, store);
  tellTheServer(journal);
}

// You cannot move her. You can tell her where you would rather she was, and she will
// weigh it against who she has become.
function suggest(i) {
  const next = sim.state.suggested === i ? null : i;
  sim.state.suggested = next;
  journal.entries.push({ elapsed, type: 'suggest', at: next });
  save(journal, store);
  render();
}

// ────────────────────────────────────────────────────────────────────── render
function render() {
  const s = sim.state;

  // Her name, and the one the world gave her. She wears the second one whether she likes
  // it or not, so it belongs next to the first.
  $('her-name').textContent = s.calling ? `${s.name}, ${CALLINGS[s.calling].name}` : s.name;
  $('her-day').textContent = `day ${s.day}`;
  $('her-where').textContent = sim.here().name;

  renderVoice(s);
  renderAsking(s);
  renderDeath(s);
  renderLog(s);
  renderStats(s);
  renderReach(s);
  renderCalling(s);
  renderKit(s);
  renderMarks(s);
  renderTraits(s);
  renderPeople(s);
  renderGhosts(s);
  renderMap(s);
  renderDials(s);
  renderHeeds(s);
  renderVitals(s);
  renderTick();
}

// ══════════════════════════════════════════════════════════════════ HER VOICE
// The last thing she said to you. And if she has not said anything in a long time,
// THAT is the thing to say — an angel who is still assigned, still watching, and no
// longer spoken to.
function renderVoice(s) {
  const said = [...s.log].reverse().find((l) => l.kind === 'her');
  const box = $('voice');
  const text = $('voice-text');
  const when = $('voice-when');

  if (!said) {
    box.dataset.mood = 'silent';
    text.textContent = 'She has not said anything to you yet.';
    when.textContent = s.day < 8 ? 'she has only just started walking' : 'she knows you are there';
    return;
  }

  const ago = s.day - said.day;
  box.dataset.mood = said.why;
  text.textContent = said.text;

  // Silence is the loudest thing this screen can show you.
  when.textContent =
    ago === 0 ? 'she said this today'
    : ago === 1 ? 'she said this yesterday'
    : ago > 25 ? `she has not spoken to you in ${ago} days`
    : `${ago} days ago`;
}

// ─────────────────────────────────────────────────────────────── she is asking
function renderAsking(s) {
  const box = $('asking');
  const j = s.pending[0];
  if (!j || !s.alive) { box.hidden = true; return; }
  box.hidden = false;

  const facts = $('ask-facts');
  // A calling carries a `prompt` and no `facts` — read it as a hook and the screen throws
  // on `j.facts[0]` the first time the world offers her a name.
  if (j.kind === 'join' || j.kind === 'romance' || j.kind === 'counsel' || j.kind === 'calling') {
    $('ask-prompt').textContent = j.prompt;
    facts.hidden = true;
  } else {
    // A hook is two facts she already knew, put next to each other. Show her working.
    $('ask-prompt').textContent = j.collision;
    facts.hidden = false;
    facts.textContent = `${j.facts[0]} — and — ${j.facts[1]}`;
  }

  const opts = $('ask-options');
  opts.replaceChildren();
  const options =
    j.options ? j.options
    : j.kind === 'join' ? { yes: 'Let them walk with her', no: 'She goes on alone' }
    : j.kind === 'romance' ? { yes: 'Let her have it', no: 'She has work to do' }
    : { act: 'Act on it', tell: 'Tell someone', keep: 'Say nothing, and keep it' };

  for (const [key, label] of Object.entries(options)) {
    const b = el('button', null, label);
    b.addEventListener('click', () => answer(j.id, key));
    opts.append(b);
  }

  const left = j.dueOn - s.day;
  $('ask-due').textContent = left <= 1 ? 'she decides tomorrow' : `she decides in ${left} days`;
}

function renderDeath(s) {
  const box = $('death');
  box.hidden = s.alive;
  if (s.alive) return;
  const d = [...s.log].reverse().find((l) => l.kind === 'death');
  $('death-line').textContent = d ? d.text : `${s.name} is dead.`;
}

// ══════════════════════════════════════════════════════════════════ THE RECORD
function renderLog(s) {
  const host = $('log');
  host.replaceChildren();
  for (const l of s.log.slice(-160)) {
    const row = el('div', `entry ${l.kind}`);
    if (l.why) row.dataset.mood = l.why;
    row.append(el('span', 'd', String(l.day)));
    row.append(el('p', null, l.text));
    host.append(row);
  }
}

// ══════════════════════════════════════════════════════════════════ WHAT SHE IS
// Six numbers, and the sentence that says what the number means. The digit is for you
// — an idle game needs the digit going up. The sentence is for her, because "Hand 14"
// tells you nothing about a woman and "there are not many people who would take her on
// purpose" does.
function renderStats(s) {
  const host = $('stats');
  host.replaceChildren();

  for (const [dom, D] of Object.entries(DOMAINS)) {
    const group = el('div', 'domain');
    const h = el('div', 'domain-head');
    h.append(el('span', 'k', D.name));
    h.append(el('span', 'domain-blurb', D.blurb));
    group.append(h);

    for (const [k, S] of Object.entries(STATS)) {
      if (S.domain !== dom) continue;
      const v = s.stat[k];                 // what she KNOWS. never falls.
      const can = sim.eff(k);              // what she can DO with it today.
      const grew = before ? v - before[k] : 0;
      const cond = S.kind === 'condition';

      const row = el('div', `stat ${cond ? 'condition' : ''} ${k === 'faith' ? 'faith' : ''}`);

      const head = el('div', 'stat-head');
      head.append(el('b', null, S.name));
      const n = el('span', 'n', String(can));
      // What the time did to her while you were not looking. A condition can go DOWN,
      // and when it has, that is the most important thing on this screen.
      if (grew > 0) n.append(el('i', 'up', `+${grew}`));
      if (grew < 0) n.append(el('i', 'down', String(grew)));
      head.append(n);
      row.append(head);

      const bar = el('div', 'bar');
      // THE GAP IS THE CHARACTER. The pale bar is everything she has learned; the solid
      // one is how much of it she can still reach. A ruined hand does not un-learn the
      // knife — it leaves her staring at the part of herself she cannot get to.
      const knew = el('div', 'knew');
      knew.style.width = `${(Math.max(v, can) / STAT_MAX) * 100}%`;
      bar.append(knew);
      const fill = el('div', 'fill');
      fill.style.width = `${(can / STAT_MAX) * 100}%`;
      bar.append(fill);
      if (grew !== 0 && before) {
        const was = el('div', 'was');
        was.style.left = `${(before[k] / STAT_MAX) * 100}%`;
        bar.append(was);
      }
      row.append(bar);

      if (can !== v) {
        row.append(el('span', can < v ? 'gap short' : 'gap over',
          can < v
            ? `she knows ${v}. she can reach ${can} of it.`
            : `she knows ${v}. what she is carrying makes it ${can}.`));
      }

      row.append(el('span', 'rank', rankOf(k, can)));
      group.append(row);
    }
    host.append(group);
  }

  $('kill').textContent = `It takes ${sim.killedAt()} wounds to kill her. She is carrying ${s.wounds}.`;
}

// ══════════════════════════════════════════════════════════════════ CAN SHE REACH YOU
//
// And the honest version of this, which is the only one worth shipping: turning this on
// does NOT guarantee she will use it. `foresee()` gates the knock on Faith, exactly as
// `maybeSpeak()` gates her voice — so a woman who has stopped believing anybody is
// listening stops reaching out, and your phone goes quiet, and that is not a bug in the
// notification system. It is the thing the notification system is FOR.
//
// So this panel tells the player the truth: she can reach you, and whether she will is
// between the two of you.
function renderReach(s) {
  const host = $('reach');
  host.replaceChildren();

  const state = reachable();
  const say = (t, cls) => host.append(el('p', cls ?? 'quiet small', t));

  if (state === 'install-first') {
    // The one that catches everybody. On iOS there is no push in a browser tab — not
    // "disabled", not "denied": the API does not exist. Say what to do about it.
    say('She cannot reach a browser tab. Nothing can — iOS does not allow it.');
    say('Tap Share, then “Add to Home Screen”, and open her from there. Then she can wake your phone when she needs you.', 'reach-how');
    return;
  }

  if (state === 'never') {
    say('This device cannot be reached. She will be here whenever you open her.');
    return;
  }

  if (state === 'denied') {
    say('You told your phone she was not allowed to reach you, and your phone believed you.');
    say('If you change your mind, it is in Settings, not here. She cannot ask twice.', 'reach-how');
    return;
  }

  if (state === 'granted' && vigilId()) {
    say('She can reach you.', 'reach-on');
    // THE HONEST SENTENCE. A player whose phone has gone silent should be able to find out,
    // here, that it went silent because of what they did.
    const faith = sim.eff('faith');
    say(
      faith <= 0
        ? 'She has stopped believing there is anybody there. She will not reach out again. If you want to know what becomes of her, you will have to come and look.'
        : faith < 8
          ? 'She has mostly stopped asking. You will hear from her less now, and that is not the phone.'
          : 'She will wake you when she needs you — and she does not need you often.'
    );
    return;
  }

  const b = el('button', 'primary', 'Let her reach you');
  b.addEventListener('click', async () => {
    b.disabled = true;
    b.textContent = 'asking your phone…';
    const r = await letHerReachYou(journal);
    if (!r.ok) {
      b.remove();
      say(r.why === 'denied'
        ? 'Your phone said no. She will not ask again.'
        : 'That did not work. She is still here; she just cannot reach you.');
      return;
    }
    render();
  });
  host.append(b);
  say('She will wake your phone when she turns to you and asks something — and not otherwise. No streaks, no reminders, nothing daily. She is not trying to retain you.');
}

// ══════════════════════════════════════════════════════════════ WHAT THEY CALL HER
// Not a class you picked. A name the world started using, that she asked you about, and
// that she cannot put back down.
function renderCalling(s) {
  const host = $('calling');
  host.replaceChildren();

  if (!s.calling) {
    const refused = s.called.filter((c) => !c.took);
    host.append(el('p', 'quiet small',
      refused.length
        ? `She has been offered ${refused.length === 1 ? 'a name' : `${refused.length} names`} and would not answer to ${refused.length === 1 ? 'it' : 'any of them'}. She is nobody, and it is the safest thing she owns.`
        : 'Nothing yet. Nobody has decided what she is.'));
    for (const c of refused) {
      host.append(el('span', 'moment', `day ${c.day} — they offered her ${CALLINGS[c.key].name}. she refused it.`));
    }
    return;
  }

  const C = CALLINGS[s.calling];
  const row = el('div', 'calling-now');
  row.append(el('b', null, C.name));
  row.append(el('span', 'says', C.world));

  const does = el('div', 'calling-does');
  for (const [k, v] of Object.entries(C.mods ?? {})) {
    does.append(el('span', `tagline ${v > 0 ? '' : 'bad'}`,
      `${STATS[k].name.toLowerCase()} ${v > 0 ? 'up' : 'down'}`));
  }
  if (C.attention) does.append(el('span', 'tagline bad', 'the watching thing finds her faster'));
  if (C.opens?.length) does.append(el('span', 'tagline', 'she may carry what only her kind may carry'));
  row.append(does);

  // the ladder she climbed to get here
  for (const c of s.called.filter((x) => x.took)) {
    row.append(el('span', 'moment', `day ${c.day} — she answered to ${CALLINGS[c.key].name}.`));
  }
  host.append(row);
}

// ══════════════════════════════════════════════════════════════════ WHAT SHE CARRIES
// Objects, with provenance. This list is not an inventory screen — every line says where
// the thing came from, because that is the only reason it hurts to lose it.
function renderKit(s) {
  const host = $('kit');
  host.replaceChildren();

  if (!s.kit.length) {
    host.append(el('p', 'quiet small', 'What she stands up in. Nothing else.'));
    return;
  }

  for (const it of s.kit) {
    const dead = !usable(it, s);
    const row = el('div', `item ${dead ? 'dead' : ''}`);
    row.append(el('b', null, it.name));
    row.append(el('span', 'from', it.from));

    if (unsworn(it, s)) {
      row.append(el('span', 'tagline bad', 'she has no right to carry it, and every room can see'));
    } else if (underAsk(it, s)) {
      const [stat, need] = Object.entries(it.asks)[0];
      row.append(el('span', 'tagline bad',
        `it needs ${STATS[stat].name.toLowerCase()} ${need}. she has ${sim.bare(stat)}. it is using her.`));
    } else {
      row.append(el('span', 'tagline', WHAT_IT_DOES[it.shape] ?? 'it does its job'));
    }

    if (it.given_by) row.append(el('span', 'tagline warm', `${it.given_by} gave it to her`));
    if (it.cost) row.append(el('span', 'moment', `it takes its price: ${it.cost}`));
    host.append(row);
  }

  // and what she has put into somebody else's hands
  for (const b of Object.values(s.bonds)) {
    if (!b.carries || !b.alive) continue;
    const row = el('div', 'item lent');
    row.append(el('b', null, b.carries.name));
    row.append(el('span', 'from', `she gave it to ${b.who}, and told them not to make a thing of it`));
    host.append(row);
  }
}

const WHAT_IT_DOES = {
  blade: 'she is worse to fight',
  coat: 'it takes the wounds that would have taken her',
  boot: 'the road costs her less',
  glass: 'she finds what other people walked over',
  token: 'the law is cheaper where this seal is good',
  relic: 'it works, and it charges',
};

// ══════════════════════════════════════════════════════════════ WHAT IT LEFT ON HER
// The only thing in this game that takes a number away — and it still does not touch what
// she knows. She keeps the knowing. She loses the use.
function renderMarks(s) {
  const host = $('marks');
  host.replaceChildren();

  if (!s.marks.length) {
    host.append(el('p', 'quiet small', 'Nothing has stuck to her yet.'));
    return;
  }

  for (const m of s.marks) {
    const M = MARKS[m.key];
    const row = el('div', 'mark');
    row.append(el('b', null, M.name));
    row.append(el('span', 'says', M.line));

    const does = el('div', 'calling-does');
    const took = [];
    for (const [k, v] of Object.entries(M.mods ?? {})) {
      does.append(el('span', `tagline ${v > 0 ? '' : 'bad'}`, `${STATS[k].name.toLowerCase()} ${v > 0 ? 'up' : 'down'}`));
      // ONLY THE SKILLS. "She has not forgotten a thing" is a sentence about the gap
      // between knowing and doing, and Heart is not a thing you know — it is how much of
      // her is left. Saying she "still has the heart she earned, but cannot reach it" is
      // both wrong and cruel in a way the game does not mean.
      if (v < 0 && STATS[k].kind === 'skill') took.push(STATS[k].name.toLowerCase());
    }
    row.append(does);

    // SAID ONCE, NOT ONCE PER STAT. This is the sentence the whole system exists for and
    // it does not survive being repeated three times in a row in small caps.
    if (took.length) {
      row.append(el('span', 'moment',
        `She has not forgotten a thing. Her ${took.join(' and ')} ${took.length > 1 ? 'are' : 'is'} exactly what she earned. She simply cannot reach all of it any more.`));
    }

    row.append(el('span', 'moment',
      M.mends ? `day ${m.since} — it may still mend` : `day ${m.since} — she carries this to the grave`));
    if (m.why) row.append(el('span', 'moment', m.why));
    host.append(row);
  }
}

// ─────────────────────────────────────────────── what she has become, and its cost
function renderTraits(s) {
  const host = $('traits');
  host.replaceChildren();
  if (!s.traits.length) {
    host.append(el('p', 'quiet small', 'Nothing yet. She is still whoever she was when you found her.'));
    return;
  }
  for (const key of s.traits) {
    const T = TRAITS[key];
    const row = el('div', 'trait');
    row.append(el('b', null, T.name));
    row.append(el('span', 'k', GIVES[key] ?? ''));
    row.append(el('span', 'cost', COSTS[key] ?? 'nothing she will admit to'));
    host.append(row);
  }
}

// Plain-language readings of the mechanics. The player manages a person, not a stat block.
const GIVES = {
  hardened: 'harder to break',
  roadwise: 'the road is cheaper',
  practiced: 'she earns more',
  known: 'people take sides faster',
  haunted: 'she walks toward it',
  steady: 'she heals',
  alone: 'she is better at it',
};
const COSTS = {
  hardened: 'she does not flinch, and she used to',
  roadwise: 'nothing. this one was free, and she is suspicious of it',
  practiced: 'nothing yet',
  known: 'the watching thing finds her faster',
  haunted: 'she has stopped being careful, and says she has not',
  steady: 'she avoids the fights she used to take',
  alone: 'company has started to feel like a debt',
};

// EVERYONE WHO MATTERS. Not a friends list — a relationship has closeness AND friction,
// and the interesting ones have both.
function renderPeople(s) {
  const host = $('people');
  host.replaceChildren();

  const bonds = Object.values(s.bonds)
    .filter((b) => b.alive && (b.closeness >= 3 || b.friction >= 5))
    .sort((a, b) => (b.closeness + b.friction) - (a.closeness + a.friction))
    .slice(0, 8);

  if (!bonds.length) {
    host.append(el('p', 'quiet small', 'Nobody, yet. She has not let anyone near her.'));
    return;
  }

  for (const b of bonds) {
    const k = kindOf(b);
    const row = el('div', `person ${k.replace(/[ ,]+/g, '-')}`);

    const head = el('div', 'person-head');
    head.append(el('b', null, b.who));
    head.append(el('span', 'kind', k));
    row.append(head);

    row.append(el('span', 'says', describe(b)));

    // the two axes, shown as two bars, because that is the whole model
    const axes = el('div', 'axes');
    for (const [label, v, cls] of [['close', b.closeness, 'warm'], ['friction', b.friction, 'hot']]) {
      const a = el('div', 'axis');
      a.append(el('span', 'k', label));
      const bar = el('div', 'axis-bar');
      const fill = el('div', `axis-fill ${cls}`);
      fill.style.width = `${(v / 20) * 100}%`;
      bar.append(fill);
      a.append(bar);
      axes.append(a);
    }
    row.append(axes);

    if (b.withHer) row.append(el('span', 'tagline', 'walks with her'));
    if (b.knows.length) row.append(el('span', 'tagline secret', `knows ${b.knows[0]}`));
    if (b.owes > 3) row.append(el('span', 'tagline', 'she owes them her life'));
    if (b.betrayed) row.append(el('span', 'tagline bad', 'sold her'));

    // what actually happened between them. two most recent moments.
    for (const h of b.history.slice(-2)) {
      row.append(el('span', 'moment', `day ${h.day} — ${h.what}`));
    }

    host.append(row);
  }
}

// The dead are STRUCK OFF, because in this world a name coming off a roll is how a
// person stops existing.
function renderGhosts(s) {
  const host = $('ghosts');
  host.replaceChildren();
  if (!s.ghosts.length) {
    host.append(el('p', 'quiet small', 'Nobody, yet.'));
    return;
  }
  for (const g of s.ghosts) {
    const row = el('div', 'ghost');
    row.append(el('b', null, g.name));
    if (g.wanted) row.append(el('span', 'never', `never got ${g.wanted}`));
    host.append(row);
  }
}

function renderMap(s) {
  const host = $('map');
  host.replaceChildren();
  sim.sites.forEach((site, i) => {
    const b = el('button', `place ${i === s.at ? 'here' : ''} ${s.suggested === i ? 'want' : ''}`);
    b.disabled = !s.alive;
    b.append(el('span', null, site.node.name));
    b.append(el('span', 'tag',
      i === s.at ? 'she is here'
      : s.suggested === i ? 'you asked'
      : !s.seen.includes(i) ? 'never been' : ''));
    b.addEventListener('click', () => suggest(i));
    host.append(b);
  });
}

function renderDials(s) {
  const host = $('dials');
  host.replaceChildren();
  const labels = {
    reckless: 'careful — reckless',
    sociable: 'alone — with people',
    generous: 'keeps — gives',
  };

  for (const d of ['reckless', 'sociable', 'generous']) {
    const label = el('label');
    label.append(el('span', null, labels[d]));

    const track = el('div', 'track');
    const input = document.createElement('input');
    input.type = 'range';
    input.min = 0; input.max = 100;
    input.value = s.intent[d];
    input.disabled = !s.alive;
    input.addEventListener('input', () => {
      setDial(d, Number(input.value));
      renderDials(sim.state);
      renderHeeds(sim.state);
    });
    track.append(input);

    // the cold mark: who she has actually become, under the slider you set
    const mark = el('div', 'mark');
    const v = Math.round(s.true[d]);
    mark.style.left = `calc(${v}% + ${(50 - v) * 0.15}px)`;
    mark.dataset.v = v;
    track.append(mark);

    label.append(track);
    host.append(label);
  }
}

function renderHeeds(s) {
  const h = sim.heeds();
  const pct = Math.round(h * 100);
  $('heeds-pct').textContent = `${pct}%`;
  const bar = $('heeds-bar');
  bar.style.width = `${pct}%`;
  bar.className = pct < 70 ? 'cold' : '';

  const worst = ['reckless', 'sociable', 'generous']
    .map((d) => ({ d, gap: Math.round(s.true[d] - s.intent[d]) }))
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0];

  $('heeds-note').textContent =
    Math.abs(worst.gap) < 6
      ? 'She is still, more or less, who you asked her to be.'
      : `She is ${Math.abs(worst.gap)} points ${DRIFT[worst.d][worst.gap > 0 ? 1 : 0]}. The world taught her that, not you.`;
}

const DRIFT = {
  reckless: ['more careful than you asked', 'more reckless than you asked'],
  sociable: ['more alone than you asked', 'more open than you asked'],
  generous: ['tighter with her coin than you asked', 'freer with her coin than you asked'],
};

function renderVitals(s) {
  const host = $('vitals');
  host.replaceChildren();
  const rows = [
    ['coin', Math.round(s.coin)],
    ['wounds', `${s.wounds} of 6`],
    ['watched', s.attention],
    ['days walked', s.day],
    ['places stood in', `${s.seen.length} of ${sim.sites.length}`],
    ['nights alone', s.lived.nights_alone],
    ['buried', s.lived.buried],
    ['people she knows', Object.values(s.bonds).filter((b) => b.closeness >= 3).length],
    ['spoke to you', `${s.spoken} times`],
  ];
  for (const [k, v] of rows) {
    host.append(el('dt', null, k));
    host.append(el('dd', null, String(v)));
  }
}

function renderTick() {
  if (!sim.state.alive) { $('next-day').textContent = ''; return; }
  const total = Math.max(0, Math.ceil(msUntilNextDay(journal, Date.now()) / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  $('next-day').textContent = m > 0 ? `next day in ${m}m ${String(sec).padStart(2, '0')}s` : `next day in ${sec}s`;
}

// ────────────────────────────────────────────────────────────────────── wiring
$('nav-toggle').addEventListener('click', () => {
  const p = $('panel');
  p.hidden = !p.hidden;
  $('nav-toggle').setAttribute('aria-expanded', String(!p.hidden));
  $('nav-toggle').textContent = p.hidden ? 'Her state' : 'Hide';
});

$('new-life').addEventListener('click', () => {
  const s = sim.state;
  bury(store, { name: s.name, world: String(journal.seed), day: s.day });
  store.removeItem(SAVE_KEY);
  stopWatching();     // she is dead. nobody should be knocking on her behalf.
  location.reload();
});

$('abandon').addEventListener('click', () => {
  if (!confirm('Abandon her? She does not get a death for it. She simply stops.')) return;
  store.removeItem(SAVE_KEY);
  stopWatching();
  location.reload();
});

// ══════════════════════════════════════════════════════════ SHE RUNS WITH THE LIGHTS OFF
//
// The game is a deterministic function of (seed, inputs) and has no backend, so once the
// worker has cached it, the whole thing runs on a plane with the wifi off — forever. For an
// idle game you check from a phone that is not a nicety, it is the difference between a
// game and a website.
//
// The worker is also the ONLY way she can ever reach your lock screen: iOS gives a
// home-screen web app no background execution at all, so there is no timer that outlives
// the app being closed, and the ping has to be a server push waking this worker.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // no worker: she still runs, she just cannot reach you and she needs the network.
      // Not worth a word to the player, who did not ask for a service worker.
    });
  });
}

// ─────────────────────────────────────────────────────────────────────── start
wireBoot();
const saved = load(store);
if (saved) {
  journal = saved;
  enter();
}
