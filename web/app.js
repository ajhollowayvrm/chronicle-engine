// The check-in surface. All the simulation lives in src/; this file only shows
// what happened and records what you did.
//
// On load we rebuild her whole life by replaying the journal (see src/game.js).
// After that we hold the engine live and tick it forward as real days pass, and
// every player action is applied to that live engine AND appended to the journal.
// The two paths apply inputs in the same order, so a reload reproduces exactly
// the run you were already looking at.

import { NAMES, PLACES } from '../src/events.js';
import {
  newJournal, replay, targetElapsed, msUntilNextDay,
  save, load, SPEEDS,
} from '../src/game.js';

const $ = (id) => document.getElementById(id);
const store = window.localStorage;

let journal = null;
let eng = null;
let elapsed = 1;
let away = [];          // the chronicle written while the player was gone

// ---------------------------------------------------------------- boot screen

function wireBootDials() {
  for (const k of ['reckless', 'sociable', 'generous']) {
    const input = $(`boot-${k}`);
    const out = input.parentElement.querySelector('output');
    input.addEventListener('input', () => { out.value = input.value; });
  }
}

function startNewLife() {
  const seed = Number($('boot-seed').value);
  journal = newJournal({
    seed: Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 7,
    name: $('boot-name').value.trim() || 'Kestrel of Ilmun',
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

// ---------------------------------------------------------------- lifecycle

function enter() {
  const target = targetElapsed(journal, Date.now());
  const r = replay(journal, target);

  eng = r.eng;
  elapsed = r.elapsed;
  away = r.unseen;

  // she has been walking; you have not been reading. mark you caught up.
  journal.seenElapsed = elapsed;
  save(journal, store);

  $('boot').hidden = true;
  $('game').hidden = false;

  render();
  setInterval(loop, 1000);
}

// The live tick. Days arrive on the wall clock, not on a game loop.
function loop() {
  const now = Date.now();
  const target = targetElapsed(journal, now);

  let moved = false;
  while (elapsed < target) {
    eng.tick();       // inert once she is dead — the world waits for the cycle
    elapsed++;
    moved = true;
  }

  if (moved) {
    // you are here, so you are reading it as it happens
    if (document.visibilityState === 'visible') {
      journal.seenElapsed = elapsed;
      save(journal, store);
    }
    render();
  } else {
    renderClock(now);
  }
}

// ---------------------------------------------------------------- player acts
// each of these mirrors exactly one branch of replay()'s apply().

function answer(id, key) {
  eng.answer(id, key);
  journal.entries.push({ elapsed, type: 'answer', id, key });
  save(journal, store);
  render();
}

function setDial(dial, value) {
  eng.state.intent[dial] = value;
  journal.entries.push({ elapsed, type: 'dials', dials: { [dial]: value } });
  save(journal, store);
}

function reincarnate() {
  const name = `${pick(NAMES)} of ${pick(PLACES).replace(/^the /, '')}`;
  eng.reincarnate(name);
  journal.entries.push({ elapsed, type: 'reincarnate', name });
  save(journal, store);
  away = [];
  render();
}

// only used to name the next life, which is a player input and gets journalled —
// so it never touches the simulation's determinism
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// ---------------------------------------------------------------- render

function render() {
  const s = eng.state;

  $('her-name').textContent = s.name;
  $('her-cycle').textContent = `cycle ${s.cycle}`;
  $('her-day').textContent = `day ${s.day}`;

  renderClock(Date.now());
  renderAway();
  renderDeath(s);
  renderJudgments(s);
  renderVitals(s);
  renderPeople(s);
  renderDials(s);
  renderLog($('log'), s.log.slice(-300));

  $('save-note').textContent = `seed ${journal.seed} · ${journal.entries.length} decisions recorded`;
}

function renderClock(now) {
  if (!eng.state.alive) { $('next-day').textContent = '—'; return; }
  const ms = msUntilNextDay(journal, now);
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  $('next-day').textContent = m > 0 ? `${m}m ${String(sec).padStart(2, '0')}s` : `${sec}s`;
}

function renderAway() {
  const el = $('away');
  if (!away.length) { el.hidden = true; return; }
  el.hidden = false;
  renderLog($('away-log'), away);
}

function renderDeath(s) {
  const el = $('death');
  el.hidden = s.alive;
  if (!s.alive) {
    const d = s.log.find((l) => l.kind === 'death');
    $('death-line').textContent = d ? d.text : 'She is dead.';
  }
}

function renderJudgments(s) {
  const host = $('judgments');
  host.replaceChildren();

  for (const j of s.pending) {
    const left = j.dueOn - s.day;
    const card = el('section', 'card judgment-card');

    const h = el('h2');
    h.append(el('span', null, 'A judgment awaits'));
    h.append(el('span', 'expires', left <= 1 ? 'she decides tomorrow' : `she decides in ${left} days`));
    card.append(h);

    card.append(el('p', 'prompt', j.prompt));

    const opts = el('div', 'judgment-opts');
    for (const [key, opt] of Object.entries(j.options)) {
      const b = el('button', 'primary', opt.label);
      b.addEventListener('click', () => answer(j.id, key));
      opts.append(b);
    }
    card.append(opts);
    host.append(card);
  }
}

function renderVitals(s) {
  const rows = [
    ['coin', Math.round(s.coin), s.coin >= 500 ? 'rich' : ''],
    ['wounds', s.wounds, s.wounds >= 3 ? 'hurt' : ''],
    ['morale', Math.round(s.morale), ''],
    ['renown', s.renown, ''],
    ['relics', s.relics, ''],
    ['threads', s.threads, ''],
    ['baron’s eye', s.barons.attention, s.barons.attention >= 8 ? 'watched' : ''],
  ];
  const host = $('vitals');
  host.replaceChildren();
  for (const [k, n, cls] of rows) {
    const v = el('div', `vital ${cls}`.trim());
    v.append(el('span', 'n', String(n)));
    v.append(el('span', 'k', k));
    host.append(v);
  }
}

function renderPeople(s) {
  const host = $('people');
  host.replaceChildren();

  const living = s.companions.filter((c) => c.alive);
  host.append(row('with her', living.length
    ? living.map((c) => `${c.name} (bond ${c.bond}${c.beloved ? ', beloved' : ''})`).join(', ')
    : 'no one', living.some((c) => c.beloved) ? 'beloved' : ''));

  host.append(row('buried', s.ghosts.length
    ? s.ghosts.map((g) => `${g.name} — ${g.why}`).join(', ')
    : 'no one, yet', 'ghost-name'));

  function row(k, v, cls) {
    const r = el('div', 'row');
    r.append(el('span', 'k', k));
    r.append(el('span', cls || null, v));
    return r;
  }
}

function renderDials(s) {
  const host = $('dials');
  host.replaceChildren();

  const labels = {
    reckless: 'cautious ↔ reckless',
    sociable: 'solitary ↔ sociable',
    generous: 'hoard ↔ give freely',
  };

  let worst = 0;
  let worstDial = null;

  for (const dial of ['reckless', 'sociable', 'generous']) {
    const intent = s.intent[dial];
    const actual = s.true[dial];
    const gap = actual - intent;
    if (Math.abs(gap) > Math.abs(worst)) { worst = gap; worstDial = dial; }

    const rowEl = el('div', 'dial-row');

    const head = el('div', 'dial-head');
    head.append(el('span', null, labels[dial]));
    const nums = el('span', 'nums');
    nums.append(el('span', null, `you asked ${intent}`));
    nums.append(el('span', 'true', ` · she is ${Math.round(actual)}`));
    head.append(nums);
    rowEl.append(head);

    const track = el('div', 'dial-track');
    const input = document.createElement('input');
    input.type = 'range';
    input.min = 0; input.max = 100; input.value = intent;
    input.addEventListener('input', () => {
      setDial(dial, Number(input.value));
      renderDials(eng.state);
    });
    track.append(input);

    // the cold tick under the gold handle: who she actually is
    const mark = el('div', 'true-mark');
    mark.style.left = `calc(${actual}% + ${(50 - actual) * 0.13}px)`;   // track inset for the thumb
    mark.title = `she is ${Math.round(actual)}`;
    track.append(mark);

    rowEl.append(track);
    host.append(rowEl);
  }

  // the reveal: the moment she has visibly stopped listening
  const note = $('drift-note');
  if (worstDial && Math.abs(worst) >= 8) {
    const away_ = Math.round(Math.abs(worst));
    const dir = {
      reckless: worst > 0 ? 'more reckless than you asked her to be' : 'more careful than you asked her to be',
      sociable: worst > 0 ? 'more open to people than you told her to be' : 'more alone than you told her to be',
      generous: worst > 0 ? 'freer with her coin than you told her to be' : 'tighter with her coin than you told her to be',
    }[worstDial];
    note.textContent = `She is ${away_} points ${dir}. The road taught her that, not you. She is beginning to stop listening.`;
    note.hidden = false;
  } else {
    note.hidden = true;
  }
}

function renderLog(host, lines) {
  host.replaceChildren();
  for (const l of lines) {
    const line = el('div', `log-line ${l.kind}`);
    line.append(el('span', 'log-day', `day ${l.day}`));
    const t = el('span', 'log-text', l.text);
    if (l.kind === 'judgment') t.dataset.by = l.by === 'her' ? 'she decided' : 'you decided';
    line.append(t);
    host.append(line);
  }
  host.scrollTop = host.scrollHeight;
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

// ---------------------------------------------------------------- wiring

wireBootDials();
$('boot-go').addEventListener('click', startNewLife);
$('away-dismiss').addEventListener('click', () => { away = []; renderAway(); });
$('reincarnate').addEventListener('click', reincarnate);
$('new-life').addEventListener('click', () => {
  if (!confirm('Abandon her? The chronicle, the dead, and everything she became are lost.')) return;
  store.removeItem('chronicle.save.v1');
  location.reload();
});

// resume the life already in progress, if there is one
journal = load(store);
if (journal) enter();
