// The check-in surface. All the simulation lives in src/; this file only shows
// what happened and records what you did.
//
// On load we rebuild her whole life by replaying the journal (see src/game.js)
// against the lore pack the journal names. After that we hold the engine live and
// tick it forward as real days pass; every player action is applied to that live
// engine AND appended to the journal. Both paths apply inputs in the same order,
// so a reload reproduces exactly the run you were already looking at.

import {
  newJournal, replay, targetElapsed, msUntilNextDay,
  save, load, bury, epitaphs, SAVE_KEY,
} from '../src/game.js';

const $ = (id) => document.getElementById(id);
const store = window.localStorage;

let worlds = [];        // lore/index.json — id, title, premise
let journal = null;
let pack = null;
let eng = null;
let elapsed = 1;
let away = [];          // the chronicle written while the player was gone
let timer = null;

const RANDOM = '__random__';

async function fetchJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

const loadWorlds = () => fetchJSON('./lore/index.json');
const loadPack = (id) => fetchJSON(`./lore/${id}.json`);

// ---------------------------------------------------------------- boot screen

function wireBoot() {
  for (const k of ['reckless', 'sociable', 'generous']) {
    const input = $(`boot-${k}`);
    const out = input.parentElement.querySelector('output');
    input.addEventListener('input', () => { out.value = input.value; });
  }

  const sel = $('boot-world');
  sel.replaceChildren();
  sel.append(new Option('Somewhere I have not been — surprise me', RANDOM));
  for (const w of worlds) sel.append(new Option(w.title, w.id));

  const showPremise = () => {
    const w = worlds.find((x) => x.id === sel.value);
    $('boot-premise').textContent = w ? w.premise : `${worlds.length} worlds. Each has its own names, its own powers, and its own words for everything.`;
  };
  sel.addEventListener('change', showPremise);
  showPremise();

  renderGraves();
}

function renderGraves() {
  const dead = epitaphs(store);
  $('boot-graves').hidden = dead.length === 0;
  const ul = $('boot-graves-list');
  ul.replaceChildren();
  for (const g of dead.slice(0, 8)) {
    const li = document.createElement('li');
    li.textContent = `${g.name} — ${g.world}, day ${g.day}`;
    ul.append(li);
  }
}

const randomWorldId = () => worlds[Math.floor(Math.random() * worlds.length)].id;

async function startNewLife({ worldId, seed, speed, dials }) {
  journal = newJournal({
    seed,
    loreId: worldId,
    speed,
    dials,
    now: Date.now(),
  });
  pack = await loadPack(journal.loreId);
  save(journal, store);
  enter();
}

function bootSubmit() {
  const raw = Number($('boot-seed').value);
  const chosen = $('boot-world').value;
  return startNewLife({
    worldId: chosen === RANDOM ? randomWorldId() : chosen,
    seed: Number.isFinite(raw) ? Math.abs(Math.trunc(raw)) : 7,
    speed: $('boot-speed').value,
    dials: {
      reckless: Number($('boot-reckless').value),
      sociable: Number($('boot-sociable').value),
      generous: Number($('boot-generous').value),
    },
  });
}

// ---------------------------------------------------------------- lifecycle

function enter() {
  const r = replay(journal, targetElapsed(journal, Date.now()), pack);

  eng = r.eng;
  elapsed = r.elapsed;
  away = r.unseen;

  // she has been walking; you have not been reading. mark you caught up.
  journal.seenElapsed = elapsed;
  save(journal, store);

  $('boot').hidden = true;
  $('game').hidden = false;

  render();
  if (!timer) timer = setInterval(loop, 1000);
}

// The live tick. Days arrive on the wall clock, not on a game loop.
function loop() {
  const target = targetElapsed(journal, Date.now());

  let moved = false;
  while (elapsed < target) {
    eng.tick();       // inert once she is dead — nothing more happens to her, ever
    elapsed++;
    moved = true;
  }

  if (moved) {
    if (document.visibilityState === 'visible') {
      journal.seenElapsed = elapsed;
      save(journal, store);
    }
    render();
  } else {
    renderClock(Date.now());
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

// A SUGGESTION, not an order. The engine weighs it by heeds(), which decays as she
// drifts from you — so this button becomes quieter the less she listens, and that
// is the point. Same journal shape as everything else the player does.
function suggest(regionId) {
  const next = eng.state.suggested === regionId ? null : regionId;
  eng.state.suggested = next;
  journal.entries.push({ elapsed, type: 'suggest', region: next });
  save(journal, store);
  render();
}

// She does not come back. This is a different woman, in a different world.
async function walkANewWorld() {
  const s = eng.state;
  bury(store, { name: s.name, world: pack.title, day: s.day });

  await startNewLife({
    worldId: randomWorldId(),
    seed: Math.floor(Math.random() * 1e9),
    speed: journal.speed,          // your pace is yours; keep it
    dials: journal.dials,          // your standing orders survive you. she doesn't.
  });
  away = [];
  render();
}

// ---------------------------------------------------------------- render

function render() {
  const s = eng.state;

  $('her-name').textContent = s.name;
  $('her-day').textContent = `day ${s.day}`;

  renderTopbar(s);
  renderAlerts(s);
  renderClock(Date.now());
  renderAway();
  renderDeath(s);
  renderJudgments(s);

  renderVitals(s);
  renderSkills(s);
  renderPeople(s);
  renderGhosts(s);

  renderMap(s);
  renderPolities(s);
  renderFactions(s);
  renderSchools(s);

  renderDials(s);
  renderHeeds(s);
  renderWorldInfo(s);

  renderLog($('log'), s.log.slice(-300));

  $('save-note').textContent = `${pack.title} · seed ${journal.seed} · ${journal.entries.length} decisions recorded`;
}

// ---- the sticky bar: the four things that decide whether you must act now
function renderTopbar(s) {
  const region = eng.region();
  const law = eng.laws();
  const country = eng.here();

  $('t-coin').textContent = Math.round(s.coin);
  $('t-wounds').textContent = s.wounds;
  $('t-wounds-wrap').className = `tstat ${s.wounds >= 4 ? 'bad' : s.wounds >= 2 ? 'warn' : ''}`;
  $('t-eye').textContent = s.watch.attention;
  $('t-eye-label').textContent = pack.power.name.replace(/^the /, '');
  $('t-eye-wrap').className = `tstat ${s.watch.attention >= 14 ? 'bad' : s.watch.attention >= 7 ? 'warn' : ''}`;

  $('her-where').textContent = region.name;

  const chip = $('her-law');
  if (!country) {
    chip.textContent = 'unclaimed';
    chip.className = 'law-chip free';
  } else {
    chip.textContent = country.name.replace(/^the /, '');
    chip.className = `law-chip ${law.toll >= 1.6 ? 'hard' : ''}`;
  }
}

// ---- things that are true RIGHT NOW and might kill her
function renderAlerts(s) {
  const host = $('alerts');
  host.replaceChildren();
  if (!s.alive) return;

  const add = (cls, text) => host.append(el('div', `alert ${cls}`, text));

  if (eng.atWarBorder()) {
    add('war', `She is on a frontier with a war on the other side of it. The roads here are worse than the map says.`);
  }
  const wanted = eng.outlawedHere();
  for (const f of wanted) {
    add('bad', `${f.name} is outlawed here, and she is known to them. She does not get to explain that.`);
  }
  for (const f of eng.enemies()) {
    add('warn', `${f.name} are hunting her.`);
  }
  if (s.wounds >= 4) add('bad', `She is badly hurt. Six wounds kill her, and she is at ${s.wounds}.`);
}

function renderClock(now) {
  if (!eng.state.alive) { $('next-day').textContent = '—'; return; }
  const total = Math.max(0, Math.ceil(msUntilNextDay(journal, now) / 1000));
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
    $('death-line').textContent = d ? d.text : `${s.name} is dead.`;
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
  // the watching power has no name in the engine — only the world knows it
  const rows = [
    ['coin', Math.round(s.coin), s.coin >= 500 ? 'rich' : ''],
    ['wounds', s.wounds, s.wounds >= 3 ? 'hurt' : ''],
    ['morale', Math.round(s.morale), ''],
    ['renown', s.renown, ''],
    ['relics', s.relics, ''],
    ['threads', s.threads, ''],
    [`${pack.power.name} watches`, s.watch.attention, s.watch.attention >= 8 ? 'watched' : ''],
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

  host.append(row('lost', s.ghosts.length
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
    input.disabled = !s.alive;
    input.addEventListener('input', () => {
      setDial(dial, Number(input.value));
      renderDials(eng.state);
    });
    track.append(input);

    // the cold tick under the gold handle: who she actually is
    const mark = el('div', 'true-mark');
    mark.style.left = `calc(${actual}% + ${(50 - actual) * 0.13}px)`;
    mark.title = `she is ${Math.round(actual)}`;
    track.append(mark);

    rowEl.append(track);
    host.append(rowEl);
  }

  // the reveal: the moment she has visibly stopped listening
  const note = $('drift-note');
  if (worstDial && Math.abs(worst) >= 8) {
    const n = Math.round(Math.abs(worst));
    const dir = {
      reckless: worst > 0 ? 'more reckless than you asked her to be' : 'more careful than you asked her to be',
      sociable: worst > 0 ? 'more open to people than you told her to be' : 'more alone than you told her to be',
      generous: worst > 0 ? 'freer with her coin than you told her to be' : 'tighter with her coin than you told her to be',
    }[worstDial];
    note.textContent = `She is ${n} points ${dir}. The road taught her that, not you. She is beginning to stop listening.`;
    note.hidden = false;
  } else {
    note.hidden = true;
  }
}

// ---- SKILLS: the only thing in this game that gets strictly better
function renderSkills(s) {
  const host = $('skills');
  host.replaceChildren();

  const NAMES = {
    blade: ['Blade', 'fights better — ambushes and beasts break her way'],
    mend: ['Mend', 'heals, instead of carrying a wound for a month'],
    scavenge: ['Scavenge', 'finds more, and finds it worth more'],
    road: ['Road', 'crossings cost less; the fevers take less out of her'],
  };

  let any = false;
  for (const [k, [label, what]] of Object.entries(NAMES)) {
    const lvl = eng.skill(k);
    if (lvl > 0) any = true;
    const row = el('div', `skill ${lvl ? 'has' : ''}`);
    const head = el('div', 'skill-head');
    head.append(el('b', null, label));
    const pips = el('span', 'pips');
    for (let i = 0; i < 3; i++) pips.append(el('i', i < lvl ? 'pip on' : 'pip'));
    head.append(pips);
    row.append(head);
    row.append(el('span', 'dim small', what));
    host.append(row);
  }

  $('skills-note').textContent = any
    ? 'She paid for these. It is the only thing coin is for.'
    : 'She has been taught nothing. Schools cost coin and a season — she has to be standing in the right country, and able to pay.';
}

// ---- THE MAP: where she is, what the ground is worth, and where you wish she'd go
function renderMap(s) {
  const host = $('map');
  host.replaceChildren();

  pack.regions.forEach((r, i) => {
    const country = r.polity ? eng.polity(r.polity) : null;
    const isHere = i === s.region;
    const isSuggested = s.suggested === r.id;
    const seen = s.seen.includes(i);

    const card = el('button', `region ${isHere ? 'here' : ''} ${isSuggested ? 'suggested' : ''} ${seen ? '' : 'unseen'}`);
    card.disabled = !s.alive;

    const head = el('div', 'region-head');
    head.append(el('b', null, r.name));
    if (isHere) head.append(el('span', 'tag now', 'she is here'));
    else if (isSuggested) head.append(el('span', 'tag sug', 'suggested'));
    card.append(head);

    card.append(el('span', 'dim small', country ? country.name : 'no law reaches here'));

    const facts = el('div', 'region-facts');
    facts.append(el('span', null, `wealth ${r.wealth}×`));
    const schoolsHere = pack.schools.filter((sc) => sc.region === r.id);
    if (schoolsHere.length) facts.append(el('span', 'good', schoolsHere.map((x) => x.name).join(', ')));
    if (!seen) facts.append(el('span', 'dim', 'never been'));
    card.append(facts);

    card.addEventListener('click', () => suggest(r.id));
    host.append(card);
  });

  const sug = s.suggested ? pack.regions.find((r) => r.id === s.suggested) : null;
  const heeds = Math.round(eng.heeds() * 100);
  $('suggest-note').textContent = sug
    ? `You have asked her to make for ${sug.name}. She is taking suggestions at about ${heeds}% right now — she will go when she goes, or she will not.`
    : 'You cannot move her. You can tell her where you would rather she was, and she will weigh it against who she has become.';
}

// ---- COUNTRIES: law, and who is at war with whom
function renderPolities(s) {
  const host = $('polities');
  host.replaceChildren();

  if (!pack.polities?.length) {
    host.append(el('p', 'dim small', 'Nobody rules here. There is no law in this world to cross.'));
    return;
  }

  for (const p of pack.polities) {
    const law = eng.lawOf(p.id);
    const here = eng.region().polity === p.id;
    const card = el('div', `polity ${here ? 'here' : ''}`);

    const head = el('div', 'polity-head');
    head.append(el('b', null, p.name));
    head.append(el('span', 'dim small', p.kind));
    if (here) head.append(el('span', 'tag now', 'she is here'));
    card.append(head);

    const bars = el('div', 'lawbars');
    const bar = (label, v, max, cls) => {
      const b = el('div', 'lawbar');
      b.append(el('span', 'k', label));
      const track = el('div', 'meter');
      const fill = el('div', `meter-fill ${cls}`);
      fill.style.width = `${Math.min(100, (v / max) * 100)}%`;
      track.append(fill);
      b.append(track);
      b.append(el('span', 'v', label === 'tax' ? `${Math.round(v * 100)}%` : v.toFixed(1)));
      return b;
    };
    bars.append(bar('toll', law.toll, 3, law.toll >= 1.8 ? 'hot' : ''));
    bars.append(bar('tax', law.tax, 0.45, law.tax >= 0.2 ? 'hot' : ''));
    bars.append(bar('zeal', law.zeal, 3, law.zeal >= 2 ? 'hot' : ''));
    card.append(bars);

    // war and peace
    const rels = [];
    for (const other of pack.polities) {
      if (other.id === p.id) continue;
      const rel = eng.relation(p.id, other.id);
      if (rel) rels.push([other, rel]);
    }
    if (rels.length) {
      const r = el('div', 'rels');
      for (const [other, rel] of rels) {
        r.append(el('span', `rel ${rel}`, `${rel} with ${other.name}`));
      }
      card.append(r);
    }

    const out = (law.outlaws ?? []).map((id) => eng.faction(id)?.name).filter(Boolean);
    if (out.length) card.append(el('div', 'outlaws', `outlawed here: ${out.join(', ')}`));

    host.append(card);
  }
}

// ---- FACTIONS: standing, which is a ledger of what she actually did
function renderFactions(s) {
  const host = $('factions');
  host.replaceChildren();

  for (const f of pack.factions) {
    const st = eng.standing(f.id);
    const sworn = s.allegiance === f.id;
    const card = el('div', `faction ${sworn ? 'sworn' : ''}`);

    const head = el('div', 'faction-head');
    head.append(el('b', null, f.name));
    if (sworn) head.append(el('span', 'tag sworn', 'she is one of them'));
    else if (st <= -8) head.append(el('span', 'tag bad', 'hunting her'));
    else if (st >= 6) head.append(el('span', 'tag good', 'will shelter her'));
    card.append(head);

    // a -20..+20 bar with a centre line
    const track = el('div', 'standing');
    const fill = el('div', `standing-fill ${st < 0 ? 'neg' : 'pos'}`);
    const pctv = Math.min(100, (Math.abs(st) / 20) * 50);
    fill.style.width = `${pctv}%`;
    fill.style[st < 0 ? 'right' : 'left'] = '50%';
    track.append(el('div', 'standing-zero'));
    track.append(fill);
    card.append(track);

    const foot = el('div', 'faction-foot');
    foot.append(el('span', 'dim small', st === 0 ? 'they have no opinion of her' : `standing ${st > 0 ? '+' : ''}${st.toFixed(1)}`));
    if (f.rivals?.length) {
      foot.append(el('span', 'dim small', `against ${f.rivals.map((r) => eng.faction(r)?.name).filter(Boolean).join(', ')}`));
    }
    card.append(foot);
    host.append(card);
  }
}

// ---- SCHOOLS: where the coin goes, and whether she can afford it today
function renderSchools(s) {
  const host = $('schools');
  host.replaceChildren();

  for (const sc of pack.schools) {
    const where = pack.regions.find((r) => r.id === sc.region);
    const lvl = eng.skill(sc.teaches);
    const cost = eng.schoolCost(sc);
    const maxed = lvl >= 3;
    const hereNow = eng.region().id === sc.region;
    const canPay = s.coin >= cost;

    const card = el('div', `school ${maxed ? 'done' : ''}`);
    const head = el('div', 'school-head');
    head.append(el('b', null, sc.name));
    head.append(el('span', 'dim small', `${sc.teaches} · ${where.name}`));
    card.append(head);

    let status, cls;
    if (maxed) { status = 'they have nothing left to teach her'; cls = 'good'; }
    else if (!hereNow) { status = `she is not there — ${where.name}`; cls = 'dim'; }
    else if (!canPay) { status = `${cost} coin, and she has ${Math.round(s.coin)}`; cls = 'warn'; }
    else { status = `${cost} coin — she can afford this now`; cls = 'good'; }
    card.append(el('span', `small ${cls}`, status));

    host.append(card);
  }
}

function renderGhosts(s) {
  const host = $('ghosts');
  host.replaceChildren();
  if (!s.ghosts.length) {
    host.append(el('p', 'dim small', 'Nobody, yet.'));
    return;
  }
  for (const g of s.ghosts) {
    const r = el('div', 'ghost');
    r.append(el('b', null, g.name));
    r.append(el('span', 'dim small', `${g.why} · day ${g.day}`));
    host.append(r);
  }
}

function renderHeeds(s) {
  const h = eng.heeds();
  const pct = Math.round(h * 100);
  $('heeds-pct').textContent = `${pct}%`;
  const bar = $('heeds-bar');
  bar.style.width = `${pct}%`;
  bar.className = `meter-fill ${pct < 40 ? 'hot' : pct < 70 ? 'warn' : ''}`;
}

function renderWorldInfo(s) {
  const host = $('worldinfo');
  host.replaceChildren();
  const row = (k, v) => {
    host.append(el('dt', null, k));
    host.append(el('dd', null, v));
  };
  row('world', pack.title);
  row('premise', pack.premise);
  row('the watching power', `${pack.power.name} — its ${pack.power.agents}`);
  row('countries', pack.polities?.map((p) => p.name).join(', ') ?? 'none');
  row('regions', pack.regions.map((r) => r.name).join(', '));
  row('her seed', String(journal.seed));
  if (pack.generated) row('minted', `generated world, seed ${pack.seed}`);
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

// Tabs. On a phone there is not room for the whole world at once, and the four
// panes are the four questions: what happened, who is she, where is she, what do
// you want. Judgments live OUTSIDE the panes because they expire.
for (const b of $('tabs').querySelectorAll('button')) {
  b.addEventListener('click', () => {
    for (const other of $('tabs').querySelectorAll('button')) other.classList.toggle('on', other === b);
    for (const pane of ['chronicle', 'her', 'world', 'orders']) {
      $(`pane-${pane}`).hidden = pane !== b.dataset.pane;
    }
    window.scrollTo({ top: 0 });
  });
}

$('boot-go').addEventListener('click', () => { bootSubmit().catch(fail); });
$('away-dismiss').addEventListener('click', () => { away = []; renderAway(); });
$('new-world').addEventListener('click', () => { walkANewWorld().catch(fail); });
$('abandon').addEventListener('click', () => {
  if (!confirm('Abandon her? The chronicle and everything she became are lost, and she does not get a death for it.')) return;
  store.removeItem(SAVE_KEY);
  location.reload();
});

function fail(err) {
  console.error(err);
  alert(`The world would not load.\n\n${err.message}`);
}

// ---------------------------------------------------------------- start

try {
  worlds = await loadWorlds();
  if (!worlds.length) throw new Error('no worlds in lore/index.json');
  wireBoot();

  // resume the life already in progress, if there is one and its world still exists
  const saved = load(store);
  if (saved && worlds.some((w) => w.id === saved.loreId)) {
    journal = saved;
    pack = await loadPack(journal.loreId);
    enter();
  }
} catch (err) {
  fail(err);
}
