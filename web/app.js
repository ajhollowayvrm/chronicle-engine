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
  render();
}

function setDial(dial, value) {
  sim.state.intent[dial] = value;
  journal.entries.push({ elapsed, type: 'dials', dials: { [dial]: value } });
  save(journal, store);
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

  $('her-name').textContent = s.name;
  $('her-day').textContent = `day ${s.day}`;
  $('her-where').textContent = sim.here().name;

  renderVoice(s);
  renderAsking(s);
  renderDeath(s);
  renderLog(s);
  renderStats(s);
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
  if (j.kind === 'join') {
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
  const options = j.kind === 'join'
    ? { yes: 'Let them walk with her', no: 'She goes on alone' }
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
      const v = s.stat[k];
      const grew = before ? v - before[k] : 0;
      const cond = S.kind === 'condition';

      const row = el('div', `stat ${cond ? 'condition' : ''} ${k === 'faith' ? 'faith' : ''}`);

      const head = el('div', 'stat-head');
      head.append(el('b', null, S.name));
      const n = el('span', 'n', String(v));
      // What the time did to her while you were not looking. A condition can go DOWN,
      // and when it has, that is the most important thing on this screen.
      if (grew > 0) n.append(el('i', 'up', `+${grew}`));
      if (grew < 0) n.append(el('i', 'down', String(grew)));
      head.append(n);
      row.append(head);

      const bar = el('div', 'bar');
      const fill = el('div', 'fill');
      fill.style.width = `${(v / STAT_MAX) * 100}%`;
      bar.append(fill);
      if (grew !== 0 && before) {
        const was = el('div', 'was');
        was.style.left = `${(before[k] / STAT_MAX) * 100}%`;
        bar.append(was);
      }
      row.append(bar);

      row.append(el('span', 'rank', rankOf(k, v)));
      group.append(row);
    }
    host.append(group);
  }

  $('kill').textContent = `It takes ${sim.killedAt()} wounds to kill her. She is carrying ${s.wounds}.`;
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

function renderPeople(s) {
  const host = $('people');
  host.replaceChildren();
  const with_ = s.companions.filter((c) => c.alive);
  if (!with_.length) {
    host.append(el('p', 'quiet small', 'Nobody. She is on her own out there.'));
    return;
  }
  for (const c of with_) {
    const row = el('div', 'person');
    row.append(el('b', null, c.name));
    if (c.wants) row.append(el('span', 'want', `wants ${c.wants}`));
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
  location.reload();
});

$('abandon').addEventListener('click', () => {
  if (!confirm('Abandon her? She does not get a death for it. She simply stops.')) return;
  store.removeItem(SAVE_KEY);
  location.reload();
});

// ─────────────────────────────────────────────────────────────────────── start
wireBoot();
const saved = load(store);
if (saved) {
  journal = saved;
  enter();
}
