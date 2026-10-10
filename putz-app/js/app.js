import { TASKS, DAILY, AREAS, INTERVALS } from './tasks.js';
import { compute, rewardFairness, picksAvailable, personalTitle, xpOf, threshold, activePause, DAY, RULES, TEAM } from './game.js';
import { createStore, cloudEnabled } from './store.js';

const $app = document.getElementById('app');
const DEVICE_KEY = 'putz:device';
const PLAYER_COLORS = { a: '#2E6F73', b: '#C8553D' };
const SOON_MS = 7 * DAY;
const DEFAULT_REWARDS ={ 2: 'Pizzaabend', 3: 'Kinoabend', 4: 'Essen gehen', 5: 'Wochenendausflug' };

const ui = { view: 'home', search: '', filter: 'all', showFresh: false, statsRange: 'week', sheet: null, modal: null, toast: null, error: null };
let device = loadDevice();
let store = null;
let renderDeferred = false;

// ---------- Hilfsfunktionen ----------

function loadDevice() {
  try { return JSON.parse(localStorage.getItem(DEVICE_KEY)) ?? {}; } catch { return {}; }
}
function saveDevice() {
  try { localStorage.setItem(DEVICE_KEY, JSON.stringify(device)); } catch { /* privat-Modus */ }
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const fmtNum = n => Math.round(n).toLocaleString('de-DE');
const fmtDec = n => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
const fmtDate = ts => new Date(ts).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });
const fmtDateTime = ts => new Date(ts).toLocaleString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const taskById = id => TASKS.find(t => t.id === id) ?? DAILY.find(t => t.id === id);

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newHouseholdCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return [...bytes].map(b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('').match(/.{4}/g).join('-');
}
function normalizeCode(s) {
  const c = String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return c.length === 20 ? c.match(/.{4}/g).join('-') : null;
}

function relDue(ms) {
  const d = Math.ceil(ms / DAY);
  return d <= 0 ? 'heute' : d === 1 ? 'morgen' : `in ${d} Tagen`;
}

function syncLabel() {
  const s = store.status;
  if (s === 'local') return 'Nur auf diesem Gerät';
  if (s === 'ok') return 'Synchronisiert';
  if (s === 'syncing' || s === 'idle') return 'Synchronisiere …';
  if (s === 'offline') return 'Offline, wird nachgeholt';
  return 'Sync-Fehler';
}

function ctx() {
  const settings = store.get('settings');
  const players = settings.players;
  const now = Date.now();
  const state = compute({ tasks: TASKS, completions: store.list('completion'), settings, players, now });
  return {
    settings, players, now, state,
    me: players.find(p => p.id === device.me),
    partner: players.find(p => p.id !== device.me),
    name: id => players.find(p => p.id === id),
    vouchers: store.list('voucher'),
    rewards: store.list('reward'),
  };
}

// ---------- Icons ----------

const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
  gift: '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5v8h14v-8M12 8.5v12"/><path d="M12 8.5c-1.5-3.5-5.5-4-5.5-1.5S10 8.5 12 8.5c2 0 5.5 1 5.5-1.5S13.5 5 12 8.5Z"/>',
  chart: '<path d="M4 20h16"/><path d="M7 16v-5M12 16V6M17 16v-8"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
};
const icon = name => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

// ---------- Bausteine ----------

const bar = (progress, color) =>
  `<div class="bar"><span style="width:${Math.round(progress * 100)}%;${color ? `background:${color}` : ''}"></span></div>`;

function ring(pct) {
  const r = 42, circ = 2 * Math.PI * r;
  const tone = pct >= 70 ? 'var(--good)' : pct >= 40 ? 'var(--warn)' : 'var(--bad)';
  return `<svg class="ring" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="${r}" class="ring-bg"/>
    <circle cx="50" cy="50" r="${r}" class="ring-fg" style="stroke:${tone}"
      stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - pct / 100)}"/>
  </svg>`;
}

function avatar(p) {
  return `<span class="avatar" style="--pc:${PLAYER_COLORS[p.id]}">${esc(p.emoji || p.name[0])}</span>`;
}

function taskRow(t, st, now, paused = false) {
  const a = AREAS[t.area];
  let note;
  if (st.overdue) {
    note = `<span class="bad">überfällig ${st.overdueDays ? `seit ${plural(st.overdueDays, 'Tag', 'Tagen')}` : 'seit heute'}</span>` +
           (st.penaltyPerDay ? ` · −${fmtDec(st.penaltyPerDay)} Team/Tag` : paused ? ' · pausiert' : '');
  } else if (now < st.earlyUntil) {
    note = `frisch · wieder ab ${fmtDate(st.earlyUntil)}`;
  } else {
    note = `fällig ${relDue(st.due - now)}`;
  }
  return `<button class="task${st.overdue ? ' is-overdue' : ''}" data-action="open" data-id="${t.id}" style="--c:${a.color}">
    <span class="task-icon">${a.icon}</span>
    <span class="task-main">
      <span class="task-name">${esc(t.name)}</span>
      <span class="task-note">${note}</span>
      <span class="fresh"><span style="width:${Math.round(st.freshness * 100)}%"></span></span>
    </span>
    <span class="pts">${st.points}</span>
  </button>`;
}

// ---------- Ansichten ----------

// Suche: Groß/Klein und Umlaute egal („spuele“ findet „Spüle“), alle Wörter müssen vorkommen.
const fold = s => String(s).toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .normalize('NFD').replace(/[̀-ͯ]/g, '');
function matchesSearch(t, query) {
  const hay = fold(`${t.name} ${AREAS[t.area].name} ${INTERVALS[t.interval].label}`);
  return fold(query).split(/\s+/).filter(Boolean).every(word => hay.includes(word));
}

function homeList(c) {
  const { state, now } = c;
  const st = id => state.status[id];
  const query = ui.search.trim();

  if (query) {
    const order = t => (st(t.id).overdue ? 0 : now >= st(t.id).earlyUntil ? 1 : 2);
    const hits = TASKS.filter(t => matchesSearch(t, query))
      .sort((a, b) => order(a) - order(b) || st(a.id).due - st(b.id).due);
    return hits.length
      ? `<h3 class="sec">Treffer <span>${hits.length}</span></h3><div class="list">${hits.map(t => taskRow(t, st(t.id), now, state.paused)).join('')}</div>`
      : `<p class="muted pad">Keine Aufgabe passt zu „${esc(query)}“. Versuch ein anderes Wort, z. B. „Bad“ oder „Fenster“.</p>`;
  }

  const inFilter = t => ui.filter === 'all' || (ui.filter === 'W' ? t.interval === 'W' || t.interval === '2W' : t.interval === ui.filter);
  const tasks = TASKS.filter(inFilter);
  const overdue = tasks.filter(t => st(t.id).overdue)
    .sort((a, b) => st(b.id).overdueDays * st(b.id).points - st(a.id).overdueDays * st(a.id).points);
  const byDue = (a, b) => st(a.id).due - st(b.id).due || st(b.id).points - st(a.id).points;
  const isSoon = t => !st(t.id).overdue && now >= st(t.id).earlyUntil && st(t.id).due - now <= SOON_MS;
  const ready = tasks.filter(isSoon).sort(byDue);
  const fresh = tasks.filter(t => !st(t.id).overdue && !isSoon(t)).sort(byDue);

  const chip = (val, label) => `<button class="chip${ui.filter === val ? ' on' : ''}" data-action="filter" data-val="${val}">${label}</button>`;
  const section = (title, list, cls = '') => list.length
    ? `<h3 class="sec ${cls}">${title} <span>${list.length}</span></h3><div class="list">${list.map(t => taskRow(t, st(t.id), now, state.paused)).join('')}</div>`
    : '';

  return `
    <div class="chips">${chip('all', 'Alle')}${chip('W', 'Woche')}${chip('M', 'Monat')}${chip('Q', 'Quartal')}</div>
    ${section('Überfällig', overdue, 'bad')}
    ${section('Bald fällig', ready)}
    ${!overdue.length && !ready.length ? '<p class="muted small pad">In den nächsten 7 Tagen ist nichts fällig.</p>' : ''}
    ${fresh.length ? `<button class="sec toggle" data-action="toggleFresh">Später <span>${fresh.length}</span> ${ui.showFresh ? '▲' : '▼'}</button>
      ${ui.showFresh ? `<div class="list">${fresh.map(t => taskRow(t, st(t.id), now, state.paused)).join('')}</div>` : ''}` : ''}`;
}

function dailyCountToday(c, taskId) {
  const midnight = new Date(c.now).setHours(0, 0, 0, 0);
  return c.state.done.filter(x => x.taskId === taskId && x.at >= midnight).length;
}

function dailyBar(c) {
  const btn = t => {
    const n = dailyCountToday(c, t.id);
    const full = n >= t.perDay;
    return `<button class="daily${full ? ' full' : ''}" data-action="daily" data-id="${t.id}" ${full ? 'disabled' : ''}
        aria-label="${esc(t.name)} erledigt, ${t.points} Punkte">
      <span class="daily-icon">${t.icon}</span>
      <span class="daily-name">${esc(t.name)}</span>
      <span class="daily-meta">${full ? '✓ für heute' : `+${t.points}`} · ${n}/${t.perDay}</span>
    </button>`;
  };
  return `<h3 class="sec">Alltag <span class="sec-hint">ein Tipp genügt</span></h3>
    <div class="daily-row">${DAILY.map(btn).join('')}</div>`;
}

function vacationCard(c) {
  const pause = activePause(c.settings);
  if (!pause) return '';
  return `<section class="card vacation">
    <div class="vacation-icon" aria-hidden="true">🏖️</div>
    <div class="vacation-text"><b>Urlaubsmodus seit ${fmtDate(pause.from)}</b>
      <span class="small muted">Die Putz-Uhr steht. Nichts wird überfällig, es gibt keine Minuspunkte. Abhaken geht trotzdem.</span></div>
    <button class="btn small primary" data-action="endVacation">Beenden</button>
  </section>`;
}

function viewHome(c) {
  const { state, me, partner } = c;
  const picks = picksAvailable(state, me.id, c.vouchers);
  const ti = state.teamInfo;
  const weekTotal = state.week[me.id] + state.week[partner.id];
  const overdueCount = TASKS.filter(t => state.status[t.id].overdue).length;

  return `
    <header class="top">
      <div><div class="hello">Hallo ${esc(me.name)} ${esc(me.emoji)}</div><div class="sync s-${esc(store.status.split(':')[0])}">${syncLabel()}</div></div>
      ${avatar(me)}
    </header>

    <div class="search">
      <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
      <input id="search" type="search" enterkeyhint="search" autocomplete="off" placeholder="Was hast du gemacht? z. B. Spüle"
        value="${esc(ui.search)}" aria-label="Aufgabe suchen">
      <button class="x" data-action="clearSearch" aria-label="Suche leeren" ${ui.search ? '' : 'hidden'}>×</button>
    </div>

    <div id="home-cards" ${ui.search.trim() ? 'hidden' : ''}>
      ${vacationCard(c)}
      <section class="card hero">
        ${ring(state.cleanliness)}
        <div class="hero-text">
          <div class="big">${state.cleanliness} %</div>
          <div class="muted">der Wohnung sind frisch</div>
          ${state.paused
            ? '<div class="small vacation-ink">Urlaubsmodus: alles pausiert</div>'
            : overdueCount
            ? `<div class="bad small">${plural(overdueCount, 'Aufgabe', 'Aufgaben')} überfällig · −${fmtDec(state.penaltyPerDayNow)} Pkt/Tag</div>`
            : '<div class="good small">Nichts überfällig. Stark!</div>'}
        </div>
      </section>

      <section class="card">
        <div class="row-between"><b>Team-Level ${ti.level}</b><span class="muted small">${fmtNum(state.teamScore)} / ${fmtNum(ti.next)}</span></div>
        ${bar(ti.progress)}
        <div class="week">
          <span class="muted small">Diese Woche ${fmtNum(weekTotal)} Pkt</span>
          <span class="small">${avatar(me)} ${fmtNum(state.week[me.id])} · ${avatar(partner)} ${fmtNum(state.week[partner.id])}</span>
        </div>
      </section>

      ${dailyBar(c)}

      ${picks ? `<button class="card banner" data-action="tab" data-view="rewards">🎁 <span><b>${picks === 1 ? 'Eine Überraschung' : `${picks} Überraschungen`} freigespielt!</b><br><span class="small">Jetzt verdeckt wählen</span></span></button>` : ''}
    </div>

    <div id="home-list">${homeList(c)}</div>
  `;
}

function viewRewards(c) {
  const { state, me, partner, vouchers, rewards } = c;
  const picks = picksAvailable(state, me.id, vouchers);
  const pool = vouchers.filter(v => v.to === me.id && !v.pickedAt);
  const mine = vouchers.filter(v => v.to === me.id && v.pickedAt).sort((a, b) => b.pickedAt - a.pickedAt);
  const open = mine.filter(v => !v.redeemedAt), used = mine.filter(v => v.redeemedAt);
  const fromMe = vouchers.filter(v => v.from === me.id).sort((a, b) => b.createdAt - a.createdAt);
  const partnerPool = fromMe.filter(v => !v.pickedAt).length;
  const pi = state.personal[me.id];

  const surprise = picks
    ? `<div class="card banner static">🎁 <span><b>${picks === 1 ? 'Eine Überraschung' : `${picks} Überraschungen`} freigespielt</b><br>
        ${pool.length ? `<span class="small">${esc(partner.name)} hat ${plural(pool.length, 'Karte', 'Karten')} für dich im Topf.</span>`
                      : `<span class="small">${esc(partner.name)} hat noch nichts hinterlegt. Sag Bescheid!</span>`}</span></div>
       ${pool.length ? '<button class="btn primary" data-action="pickStart">Karte verdeckt wählen</button>' : ''}`
    : `<p class="muted">Nächste Überraschung bei Level ${pi.level + 1}: noch ${fmtNum(pi.next - state.xp[me.id])} Punkte.</p>`;

  const teamLevels = Array.from({ length: Math.max(5, state.teamLevel + 2) - 1 }, (_, i) => i + 2);
  const rewardRow = level => {
    const r = rewards.find(x => x.level === level);
    let status;
    if (r?.redeemedAt) status = `<span class="good small">✓ eingelöst am ${fmtDate(r.redeemedAt)}</span>`;
    else if (state.teamLevel >= level) {
      const f = rewardFairness(state, level, c.players);
      status = f.ok
        ? (r?.text ? `<button class="btn small primary" data-action="redeemReward" data-level="${level}">Einlösen</button>` : '<span class="small muted">freigeschaltet</span>')
        : `<span class="small warn">Fast! Noch ${f.missing.map(m => `${fmtNum(m.need)} Pkt von ${esc(c.name(m.player).name)}`).join(', ')}</span>`;
    } else status = `<span class="small muted">ab ${fmtNum(threshold(TEAM, level))} Teampunkten</span>`;
    return `<div class="reward${state.teamLevel >= level ? ' unlocked' : ''}">
      <span class="lvl">${level}</span>
      <button class="reward-text" data-action="editReward" data-level="${level}">${r?.text ? esc(r.text) : '<span class="muted">Belohnung festlegen …</span>'}</button>
      <div class="reward-status">${status}</div>
    </div>`;
  };

  return `
    <header class="top"><h1>Belohnungen</h1></header>

    <h3 class="sec">Deine Überraschungen</h3>
    ${surprise}
    ${open.map(v => `<div class="card voucher"><div class="voucher-text">${esc(v.text)}</div>
        <div class="row-between"><span class="small muted">von ${esc(partner.name)} · gezogen ${fmtDate(v.pickedAt)}</span>
        <button class="btn small" data-action="redeemVoucher" data-id="${v.id}">Eingelöst</button></div></div>`).join('')}
    ${used.length ? `<details class="card"><summary>Eingelöst (${used.length})</summary>${used.map(v => `<div class="used">${esc(v.text)} <span class="small muted">${fmtDate(v.redeemedAt)}</span></div>`).join('')}</details>` : ''}

    <h3 class="sec">Für ${esc(partner.name)} hinterlegen</h3>
    <div class="card">
      <p class="small muted">${esc(partner.name)} zieht bei jedem Levelaufstieg eine von bis zu drei verdeckten Karten und sieht den Text erst dann.
        Im Topf: <b>${partnerPool}</b>${partnerPool < 3 ? ' (mindestens 3 sind ideal)' : ''}.</p>
      <textarea id="voucher-text" rows="2" maxlength="200" placeholder="z. B. Ich koche dein Lieblingsessen"></textarea>
      <button class="btn primary" data-action="addVoucher">In den Topf legen</button>
      ${fromMe.length ? `<div class="mine">${fromMe.map(v => `<div class="mine-row">
          <span>${esc(v.text)}</span>
          ${v.pickedAt ? `<span class="small muted">${v.redeemedAt ? 'eingelöst' : 'gezogen'}</span>`
                       : `<button class="x" data-action="deleteVoucher" data-id="${v.id}" aria-label="Entfernen">×</button>`}
        </div>`).join('')}</div>` : ''}
    </div>

    <h3 class="sec">Team-Belohnungen</h3>
    <p class="small muted pad">Gemeinsam festlegen. Einlösbar, wenn ihr seit dem vorigen Level beide mindestens ein Drittel beigetragen habt.</p>
    <div class="card list-card">${teamLevels.map(rewardRow).join('')}</div>
  `;
}

function viewStats(c) {
  const { state, players, me, partner } = c;
  const range = { week: ['Woche', state.week], month: ['Monat', state.month], all: ['Gesamt', state.total] };
  const pts = range[ui.statsRange][1];
  const sum = pts[me.id] + pts[partner.id];
  const share = id => (sum ? Math.round((pts[id] / sum) * 100) : 50);

  const playerCard = p => {
    const li = state.personal[p.id];
    return `<div class="card player">
      <div class="row">${avatar(p)}<div><b>${esc(p.name)}</b><div class="small muted">Level ${li.level} · ${personalTitle(li.level)}</div></div></div>
      ${bar(li.progress, PLAYER_COLORS[p.id])}
      <div class="small muted">${fmtNum(state.xp[p.id])} / ${fmtNum(li.next)} Punkte</div>
    </div>`;
  };

  const favourites = p => {
    const counts = {};
    for (const x of state.done) if (x.player === p.id) counts[x.taskId] = (counts[x.taskId] ?? 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return `<div><div class="small"><b>${esc(p.name)}</b></div>${top.length
      ? top.map(([id, n]) => `<div class="small muted">${n}× ${esc(taskById(id)?.name ?? id)}</div>`).join('')
      : '<div class="small muted">noch nichts</div>'}</div>`;
  };

  const history = [...state.done].reverse().slice(0, 40);
  const tab = (key) => `<button class="chip${ui.statsRange === key ? ' on' : ''}" data-action="statsRange" data-val="${key}">${range[key][0]}</button>`;

  return `
    <header class="top"><h1>Statistik</h1></header>
    <div class="grid2">${players.map(playerCard).join('')}</div>

    <h3 class="sec">Wer hat beigetragen?</h3>
    <div class="chips">${tab('week')}${tab('month')}${tab('all')}</div>
    <div class="card">
      <div class="split">
        <span style="flex:${pts[me.id] || (sum ? 0 : 1)};background:${PLAYER_COLORS[me.id]}"></span>
        <span style="flex:${pts[partner.id] || (sum ? 0 : 1)};background:${PLAYER_COLORS[partner.id]}"></span>
      </div>
      <div class="row-between small">
        <span>${avatar(me)} ${esc(me.name)} · ${fmtNum(pts[me.id])} Pkt (${share(me.id)} %)</span>
        <span>${fmtNum(pts[partner.id])} Pkt (${share(partner.id)} %) ${avatar(partner)}</span>
      </div>
    </div>

    <h3 class="sec">Liegengeblieben</h3>
    <div class="card row-between">
      <span>Minuspunkte bisher</span>${state.penaltyTotal ? `<b class="bad">−${fmtNum(state.penaltyTotal)}</b>` : '<b class="good">keine</b>'}
    </div>

    <h3 class="sec">Am häufigsten erledigt</h3>
    <div class="card grid2 plain">${players.map(favourites).join('')}</div>

    <h3 class="sec">Verlauf</h3>
    <div class="card list-card">${history.length ? history.map(x => `<div class="hist">
        ${avatar(c.name(x.player))}
        <div class="hist-main"><div>${esc(taskById(x.taskId)?.name ?? x.taskId)}</div>
          <div class="small muted">${fmtDateTime(x.at)}${x.rescue ? ' · Rettung' : ''}</div></div>
        <b class="small">+${xpOf(x)}</b>
        <button class="x" data-action="deleteCompletion" data-id="${x.id}" aria-label="Eintrag löschen">×</button>
      </div>`).join('') : '<p class="muted small">Noch nichts erledigt.</p>'}</div>
  `;
}

function pastPauses(settings) {
  const past = (settings.pauses ?? []).filter(p => p.to).slice(-3).reverse();
  if (!past.length) return '';
  const days = p => Math.max(1, Math.round((p.to - p.from) / DAY));
  return `<div class="small muted pauses">Bisher: ${past.map(p => `${fmtDate(p.from)} – ${fmtDate(p.to)} (${plural(days(p), 'Tag', 'Tage')})`).join(' · ')}</div>`;
}

function viewSettings(c) {
  const { players, settings, me } = c;
  const link = `${location.origin}${location.pathname}#join=${device.household}`;
  const areaBlock = ([key, area]) => `<details class="card">
      <summary>${area.icon} ${area.name}</summary>
      ${TASKS.filter(t => t.area === key).map(t => `<label class="pt-row">
        <span>${esc(t.name)}<span class="small muted"> · ${INTERVALS[t.interval].label}</span></span>
        <input type="number" inputmode="numeric" min="0" max="200" value="${settings.pointOverrides?.[t.id] ?? t.points}"
          data-change="points" data-id="${t.id}">
      </label>`).join('')}
    </details>`;

  return `
    <header class="top"><h1>Einstellungen</h1></header>

    <h3 class="sec">Wer nutzt dieses Handy?</h3>
    <div class="chips">${players.map(p => `<button class="chip${p.id === me.id ? ' on' : ''}" data-action="setMe" data-id="${p.id}">${esc(p.emoji)} ${esc(p.name)}</button>`).join('')}</div>

    <h3 class="sec">Namen</h3>
    <div class="card">${players.map(p => `<div class="name-row">
        <input class="emoji-in" value="${esc(p.emoji)}" maxlength="4" data-change="playerEmoji" data-id="${p.id}" aria-label="Emoji">
        <input value="${esc(p.name)}" maxlength="24" data-change="playerName" data-id="${p.id}" aria-label="Name">
      </div>`).join('')}</div>

    <h3 class="sec">Zweites Handy verbinden</h3>
    <div class="card">
      ${cloudEnabled ? `
        <p class="small muted">Schick den Link an das andere Handy. Dort in Safari öffnen, dann über „Teilen → Zum Home-Bildschirm“ installieren.
          Falls die installierte App den Code nicht übernimmt: unter „Haushalt beitreten“ einfügen.</p>
        <div class="code">${esc(device.household)}</div>
        <div class="row gap">
          <button class="btn primary" data-action="share" data-link="${esc(link)}">Link teilen</button>
          <button class="btn" data-action="copyCode">Code kopieren</button>
        </div>
        <p class="small muted">Der Code ist euer Schlüssel. Nur an deine Partnerin oder deinen Partner weitergeben.</p>
        <div class="row-between"><span class="small">Status: ${syncLabel()}</span><button class="btn small" data-action="syncNow">Jetzt abgleichen</button></div>
        ${store.status.startsWith('error') ? `<p class="small bad">${esc(store.status)}</p>` : ''}`
      : `<p class="small">Die App speichert gerade <b>nur auf diesem Gerät</b>. Für zwei Handys einmal Supabase einrichten (README, Schritt 1).</p>`}
    </div>

    <h3 class="sec">Urlaubsmodus</h3>
    <div class="card">
      ${activePause(settings)
        ? `<p class="small">Aktiv seit <b>${fmtDate(activePause(settings).from)}</b>. Die Putz-Uhr steht für euch beide.</p>
           <button class="btn primary" data-action="endVacation">Urlaub beenden</button>`
        : `<p class="small muted">Wenn ihr länger weg seid oder nicht putzen könnt: Die Zeit bleibt stehen, nichts wird überfällig, es gibt keine Minuspunkte. Danach geht es dort weiter, wo ihr aufgehört habt. Gilt für euch beide.</p>
           <button class="btn" data-action="startVacation">🏖️ Urlaub starten</button>`}
      ${pastPauses(settings)}
    </div>

    <h3 class="sec">Punkte anpassen</h3>
    ${Object.entries(AREAS).map(areaBlock).join('')}

    <h3 class="sec">Regeln</h3>
    <div class="card small rules">
      <p>Überfällige Aufgaben kosten das Team pro Tag ${Math.round(RULES.penaltyRate * 100)} % ihrer Punkte, höchstens ${RULES.penaltyCapDays} Tage lang.</p>
      <p>Wer eine überfällige Aufgabe erledigt, bekommt +${Math.round(RULES.rescueBonus * 100)} % aufs persönliche Level.</p>
      <p>Punkte gibt es erst wieder, wenn die Hälfte des Intervalls vorbei ist.</p>
    </div>

    <button class="btn ghost danger" data-action="leave">Auf diesem Gerät abmelden</button>
  `;
}

// ---------- Overlays ----------

function sheetHtml(c) {
  if (!ui.sheet) return '';
  const t = taskById(ui.sheet);
  const st = c.state.status[t.id];
  const a = AREAS[t.area];
  const early = c.now < st.earlyUntil;
  const xp = Math.round(st.points * (st.overdue ? 1 + RULES.rescueBonus : 1));
  const last = st.count ? `Zuletzt ${fmtDateTime(st.last)} von ${esc(c.name(st.lastBy)?.name ?? '?')}` : 'Noch nie erledigt';
  return `<div class="backdrop" data-action="closeSheet"></div>
    <div class="sheet" role="dialog" aria-modal="true" style="--c:${a.color}">
      <div class="grab"></div>
      <div class="sheet-area">${a.icon} ${a.name} · ${INTERVALS[t.interval].label}</div>
      <h2>${esc(t.name)}</h2>
      <div class="sheet-pts"><b>${st.points}</b> Punkte${st.overdue ? ` <span class="badge">+${Math.round(RULES.rescueBonus * 100)} % Rettungsbonus</span>` : ''}</div>
      <p class="small muted">${last}</p>
      ${st.overdue ? (c.state.paused
        ? '<p class="small muted">Überfällig, aber im Urlaubsmodus pausiert. Kostet gerade nichts.</p>'
        : `<p class="small bad">Überfällig. Kostet das Team gerade −${fmtDec(st.penaltyPerDay)} Punkte pro Tag.</p>`) : ''}
      ${early ? `<p class="hint">Noch frisch. Punkte gibt es wieder ab ${fmtDate(st.earlyUntil)}.</p>` : ''}
      <button class="btn primary big" data-action="complete" data-id="${t.id}" data-player="${c.me.id}" ${early ? 'disabled' : ''}>✓ Erledigt · +${xp}</button>
      <button class="btn ghost" data-action="complete" data-id="${t.id}" data-player="${c.partner.id}" ${early ? 'disabled' : ''}>Von ${esc(c.partner.name)} erledigt eintragen</button>
    </div>`;
}

function modalHtml(c) {
  const m = ui.modal;
  if (!m) return '';
  let body = '';
  if (m.type === 'levelup') {
    const p = c.name(m.player);
    const isMe = p.id === c.me.id;
    body = `<div class="burst">🏆</div><h2>${isMe ? 'Level' : `${esc(p.name)}: Level`} ${m.level}!</h2>
      <p>${personalTitle(m.level)}</p>
      <p class="muted small">${isMe ? `Du hast eine Überraschung von ${esc(c.partner.name)} freigespielt.` : `${esc(p.name)} darf jetzt eine Überraschung von dir ziehen.`}</p>
      ${isMe ? '<button class="btn primary" data-action="tab" data-view="rewards">Zur Überraschung</button>' : ''}
      <button class="btn ghost" data-action="closeModal">Weiter</button>`;
  } else if (m.type === 'teamup') {
    const r = c.rewards.find(x => x.level === m.level);
    body = `<div class="burst">🎉</div><h2>Team-Level ${m.level}!</h2>
      <p>${r?.text ? `Freigeschaltet: <b>${esc(r.text)}</b>` : 'Legt gemeinsam eine Belohnung fest.'}</p>
      <button class="btn primary" data-action="tab" data-view="rewards">Zu den Belohnungen</button>
      <button class="btn ghost" data-action="closeModal">Weiter</button>`;
  } else if (m.type === 'pick') {
    body = `<h2>Wähle eine Karte</h2><p class="muted small">Was drauf steht, hat ${esc(c.partner.name)} für dich ausgesucht.</p>
      <div class="cards">${m.cards.map((id, i) => `<button class="pick-card" data-action="pickCard" data-id="${id}" style="--d:${i * 80}ms">?</button>`).join('')}</div>
      <button class="btn ghost" data-action="closeModal">Später</button>`;
  } else if (m.type === 'revealed') {
    const v = c.vouchers.find(x => x.id === m.id);
    body = `<div class="pick-card flipped">${esc(v?.text ?? '')}</div>
      <p class="muted small">Gespeichert unter „Deine Überraschungen“. Einlösen, wann ihr wollt.</p>
      <button class="btn primary" data-action="closeModal">Juhu!</button>`;
  } else if (m.type === 'reward') {
    const r = c.rewards.find(x => x.level === m.level);
    body = `<h2>Belohnung für Team-Level ${m.level}</h2>
      <input id="reward-text" maxlength="80" value="${esc(r?.text ?? '')}" placeholder="z. B. Pizzaabend">
      <button class="btn primary" data-action="saveReward" data-level="${m.level}">Speichern</button>
      <button class="btn ghost" data-action="closeModal">Abbrechen</button>`;
  }
  return `<div class="backdrop" data-action="closeModal"></div><div class="modal" role="dialog" aria-modal="true">${body}</div>`;
}

function toastHtml() {
  if (!ui.toast) return '';
  return `<div class="toast"><span>${ui.toast.text}</span>${ui.toast.undo ? `<button data-action="undo" data-id="${ui.toast.undo}">Rückgängig</button>` : ''}</div>`;
}

function tabbar(c) {
  const picks = picksAvailable(c.state, c.me.id, c.vouchers);
  const tab = (view, ic, label, badge) => `<button class="tab${ui.view === view ? ' on' : ''}" data-action="tab" data-view="${view}">
    ${icon(ic)}${badge ? `<span class="dot">${badge}</span>` : ''}<span>${label}</span></button>`;
  return `<nav class="tabbar">${tab('home', 'home', 'Heute')}${tab('rewards', 'gift', 'Belohnungen', picks)}${tab('stats', 'chart', 'Statistik')}${tab('settings', 'gear', 'Einstellungen')}</nav>`;
}

// ---------- Einrichtung ----------

function renderSetup() {
  const joinCode = new URLSearchParams(location.hash.slice(1)).get('join') ?? '';
  $app.innerHTML = `<main class="setup">
    <div class="logo">✨</div>
    <h1>Putzplan</h1>
    <p class="muted">Euer gemeinsamer Putzplan mit Punkten, Leveln und Überraschungen.</p>
    ${ui.error ? `<p class="bad small">${esc(ui.error)}</p>` : ''}
    ${cloudEnabled ? `<div class="card">
      <h3>Haushalt beitreten</h3>
      <p class="small muted">Dein Partner oder deine Partnerin hat den Haushalt schon angelegt? Code einfügen.</p>
      <input id="join-code" value="${esc(joinCode)}" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" autocapitalize="characters" autocomplete="off">
      <button class="btn ${joinCode ? 'primary' : ''}" data-action="join">Beitreten</button>
    </div>` : ''}
    <div class="card">
      <h3>Neuen Haushalt anlegen</h3>
      <div class="name-row"><input class="emoji-in" id="e1" value="🧽" maxlength="4"><input id="n1" placeholder="Dein Name" maxlength="24"></div>
      <div class="name-row"><input class="emoji-in" id="e2" value="🫧" maxlength="4"><input id="n2" placeholder="Name Partner/in" maxlength="24"></div>
      <button class="btn ${joinCode ? '' : 'primary'}" data-action="create">Los geht's</button>
    </div>
    ${cloudEnabled ? '' : '<p class="small muted">Hinweis: Noch kein Supabase eingerichtet. Alles wird nur auf diesem Gerät gespeichert.</p>'}
  </main>`;
}

function renderWhoAmI(settings) {
  $app.innerHTML = `<main class="setup"><div class="logo">👋</div><h1>Wer bist du?</h1>
    <p class="muted">Nur für dieses Handy. Lässt sich später in den Einstellungen ändern.</p>
    ${settings.players.map(p => `<button class="btn big who" data-action="setMe" data-id="${p.id}">${esc(p.emoji)} ${esc(p.name)}</button>`).join('')}
  </main>`;
}

function openHousehold(code) {
  device.household = code;
  saveDevice();
  store = createStore(code);
  store.subscribe(scheduleRender);
}

// ---------- Rendern ----------

function render() {
  renderDeferred = false;
  if (!store) return renderSetup();
  const settings = store.get('settings');
  if (!settings) {
    $app.innerHTML = `<main class="setup"><div class="logo">⏳</div><h1>Verbinde …</h1><p class="muted">${syncLabel()}</p></main>`;
    return;
  }
  if (!device.me || !settings.players.some(p => p.id === device.me)) return renderWhoAmI(settings);
  const c = ctx();
  const views = { home: viewHome, rewards: viewRewards, stats: viewStats, settings: viewSettings };
  $app.innerHTML = `<main class="view">${views[ui.view](c)}</main>${tabbar(c)}${sheetHtml(c)}${modalHtml(c)}${toastHtml()}`;
}

// Während getippt wird nicht neu zeichnen, sonst verliert das Feld den Fokus.
function scheduleRender() {
  if (document.activeElement?.matches?.('input, textarea')) { renderDeferred = true; return; }
  render();
}
// Verzögert, damit ein Tipp auf einen Treffer noch ankommt, bevor neu gezeichnet wird (iOS schließt erst die Tastatur).
document.addEventListener('focusout', () => setTimeout(() => { if (renderDeferred) scheduleRender(); }, 300));

// Suche: nur die Trefferliste neu zeichnen, damit das Eingabefeld den Fokus behält.
document.addEventListener('input', e => {
  if (e.target.id !== 'search') return;
  ui.search = e.target.value;
  const active = Boolean(ui.search.trim());
  document.getElementById('home-cards').hidden = active;
  document.querySelector('[data-action="clearSearch"]').hidden = !ui.search;
  document.getElementById('home-list').innerHTML = homeList(ctx());
});

// ---------- Aktionen ----------

function celebrate() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#D9662B', '#2F7BBF', '#3E8E54', '#7A9A1E', '#7D55B0', '#F2B705'];
  const box = document.createElement('div');
  box.className = 'confetti';
  for (let i = 0; i < 28; i++) {
    const s = document.createElement('span');
    s.style.cssText = `left:${50 + (Math.random() - 0.5) * 40}%;background:${colors[i % colors.length]};` +
      `--x:${(Math.random() - 0.5) * 320}px;--y:${-120 - Math.random() * 260}px;--r:${Math.random() * 720}deg`;
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 1400);
}

let toastTimer;
function showToast(text, undo) {
  ui.toast = { text, undo };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { ui.toast = null; scheduleRender(); }, 5000);
}

function complete(taskId, playerId) {
  const st = ctx().state.status[taskId];
  logCompletion({ taskId, player: playerId, at: Date.now(), points: st.points, rescue: st.overdue });
}

function completeDaily(taskId) {
  const task = DAILY.find(t => t.id === taskId);
  if (dailyCountToday(ctx(), taskId) >= task.perDay) return;
  logCompletion({ taskId, player: device.me, at: Date.now(), points: task.points, rescue: false, daily: true }, { quiet: true });
}

function logCompletion(data, { quiet = false } = {}) {
  const before = ctx();
  const id = uid('c');
  ui.sheet = null;
  showToast(`+${xpOf(data)} Punkte für ${esc(before.name(data.player).name)}${data.rescue ? ' · Rettung!' : ''}`, id);
  store.put('completion', id, data);
  const playerId = data.player;
  const after = ctx();
  if (after.state.personal[playerId].level > before.state.personal[playerId].level) {
    ui.modal = { type: 'levelup', player: playerId, level: after.state.personal[playerId].level };
  } else if (after.state.teamLevel > before.state.teamLevel) {
    ui.modal = { type: 'teamup', level: after.state.teamLevel };
  }
  if (!quiet || ui.modal) celebrate();
  render();
}

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const actions = {
  tab: d => { ui.view = d.view; ui.sheet = null; ui.modal = null; render(); scrollTo(0, 0); },
  filter: d => { ui.filter = d.val; render(); },
  toggleFresh: () => { ui.showFresh = !ui.showFresh; render(); },
  clearSearch: () => { ui.search = ''; render(); document.getElementById('search')?.focus(); },
  statsRange: d => { ui.statsRange = d.val; render(); },
  open: d => { ui.sheet = d.id; render(); },
  closeSheet: () => { ui.sheet = null; render(); },
  closeModal: () => { ui.modal = null; render(); },
  complete: d => complete(d.id, d.player),
  daily: d => completeDaily(d.id),
  undo: d => { store.update(d.id, { deleted: true }); ui.toast = null; render(); },
  deleteCompletion: d => { if (confirm('Diesen Eintrag löschen? Die Punkte werden abgezogen.')) store.update(d.id, { deleted: true }); },

  pickStart: () => {
    const c = ctx();
    const pool = c.vouchers.filter(v => v.to === c.me.id && !v.pickedAt);
    ui.modal = { type: 'pick', cards: shuffle(pool).slice(0, 3).map(v => v.id) };
    render();
  },
  pickCard: d => {
    const c = ctx();
    if (!picksAvailable(c.state, c.me.id, c.vouchers)) return;
    store.update(d.id, { pickedAt: Date.now(), pickLevel: c.state.personal[c.me.id].level });
    ui.modal = { type: 'revealed', id: d.id };
    celebrate();
    render();
  },
  redeemVoucher: d => store.update(d.id, { redeemedAt: Date.now() }),
  addVoucher: () => {
    const el = document.getElementById('voucher-text');
    const text = el.value.trim();
    if (!text) return el.focus();
    const c = ctx();
    el.value = '';
    el.blur();
    store.put('voucher', uid('v'), { from: c.me.id, to: c.partner.id, text, createdAt: Date.now() });
    showToast('Liegt verdeckt im Topf');
    render();
  },
  deleteVoucher: d => { if (confirm('Diese Überraschung aus dem Topf nehmen?')) store.update(d.id, { deleted: true }); },

  editReward: d => { ui.modal = { type: 'reward', level: Number(d.level) }; render(); document.getElementById('reward-text')?.focus(); },
  saveReward: d => {
    const level = Number(d.level);
    const text = document.getElementById('reward-text').value.trim();
    const existing = store.get(`reward-L${level}`);
    ui.modal = null;
    store.put('reward', `reward-L${level}`, { ...existing, level, text });
    render();
  },
  redeemReward: d => {
    if (confirm('Belohnung als eingelöst markieren?')) store.update(`reward-L${d.level}`, { redeemedAt: Date.now() });
  },

  startVacation: () => {
    if (!confirm('Urlaubsmodus starten? Die Putz-Uhr bleibt für euch beide stehen, bis ihr ihn beendet.')) return;
    const settings = store.get('settings');
    if (activePause(settings)) return;
    store.put('settings', 'settings', { ...settings, pauses: [...(settings.pauses ?? []), { from: Date.now(), to: null }] });
    showToast('Urlaubsmodus an. Erholt euch!');
    render();
  },
  endVacation: () => {
    const settings = store.get('settings');
    store.put('settings', 'settings', { ...settings, pauses: (settings.pauses ?? []).map(p => (p.to ? p : { ...p, to: Date.now() })) });
    showToast('Willkommen zurück! Die Uhr läuft wieder.');
    render();
  },
  setMe: d => { device.me = d.id; saveDevice(); render(); },
  share: async d => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Unser Putzplan', text: 'Tritt unserem Putzplan bei:', url: d.link }); } catch { /* abgebrochen */ }
    } else {
      await navigator.clipboard?.writeText(d.link);
      showToast('Link kopiert');
      render();
    }
  },
  copyCode: async () => { await navigator.clipboard?.writeText(device.household); showToast('Code kopiert'); render(); },
  syncNow: () => store.sync(),
  leave: () => {
    if (!confirm('Auf diesem Gerät abmelden? Die Daten bleiben im Haushalt erhalten. Ohne Code kommst du nicht wieder rein.')) return;
    device = {};
    saveDevice();
    store = null;
    ui.view = 'home';
    render();
  },

  create: () => {
    const v = id => document.getElementById(id).value.trim();
    if (!v('n1') || !v('n2')) { ui.error = 'Bitte beide Namen eintragen.'; return renderSetup(); }
    ui.error = null;
    openHousehold(newHouseholdCode());
    store.put('settings', 'settings', {
      players: [{ id: 'a', name: v('n1'), emoji: v('e1') || '🧽' }, { id: 'b', name: v('n2'), emoji: v('e2') || '🫧' }],
      startedAt: Date.now(),
      pointOverrides: {},
    });
    for (const [level, text] of Object.entries(DEFAULT_REWARDS)) {
      store.put('reward', `reward-L${level}`, { level: Number(level), text });
    }
    device.me = 'a';
    saveDevice();
    history.replaceState(null, '', location.pathname);
    render();
  },
  join: async () => {
    const code = normalizeCode(document.getElementById('join-code').value);
    if (!code) { ui.error = 'Der Code hat 20 Zeichen, z. B. ABCD-EFGH-JKMN-PQRS-TUVW.'; return renderSetup(); }
    ui.error = null;
    openHousehold(code);
    render();
    await store.sync();
    if (!store.get('settings')) {
      ui.error = store.status.startsWith('error') ? `Verbindung fehlgeschlagen: ${store.status}` : 'Zu diesem Code gibt es keinen Haushalt.';
      device = {};
      saveDevice();
      store = null;
    } else {
      history.replaceState(null, '', location.pathname);
    }
    render();
  },
};

const changes = {
  points: (el, d) => {
    const settings = store.get('settings');
    const n = Math.max(0, Math.min(200, Math.round(Number(el.value) || 0)));
    store.put('settings', 'settings', { ...settings, pointOverrides: { ...settings.pointOverrides, [d.id]: n } });
  },
  playerName: (el, d) => updatePlayer(d.id, { name: el.value.trim() || '?' }),
  playerEmoji: (el, d) => updatePlayer(d.id, { emoji: el.value.trim() }),
};

function updatePlayer(id, patch) {
  const settings = store.get('settings');
  store.put('settings', 'settings', { ...settings, players: settings.players.map(p => (p.id === id ? { ...p, ...patch } : p)) });
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  actions[el.dataset.action]?.(el.dataset, el);
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (el) changes[el.dataset.change]?.(el, el.dataset);
});

// ---------- Start ----------

if (device.household) openHousehold(device.household);
render();

if (cloudEnabled) {
  const syncIfVisible = () => { if (store && document.visibilityState === 'visible') store.sync(); };
  store?.sync();
  document.addEventListener('visibilitychange', syncIfVisible);
  addEventListener('online', syncIfVisible);
  setInterval(syncIfVisible, 30_000);
}
// Frische und Fälligkeiten hängen an der Uhrzeit.
setInterval(scheduleRender, 60_000);

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* ohne Offline-Cache weiter */ });
}
