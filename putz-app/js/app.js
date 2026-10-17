import { TASKS, DAILY, RETIRED, AREAS, INTERVALS } from './tasks.js';
import { compute, buildCatalog, rewardFairness, picksAvailable, personalTitle, xpOf, threshold, activePause, taskPoints,
  areaSummary, focusTasks, pointsByArea, weekStart, monthStart, DAY, RULES, TEAM } from './game.js';
import { createStore, cloudEnabled } from './store.js';

const $app = document.getElementById('app');
// Demo-Modus (Adresse mit ?demo): eigener Test-Haushalt nur im Browser, nie mit Supabase verbunden.
const DEMO = new URLSearchParams(location.search).has('demo');
const CLOUD = cloudEnabled && !DEMO;
const DEVICE_KEY = DEMO ? 'putz:demo:device' : 'putz:device';
// Bei jeder Veröffentlichung hochzählen und in CHANGELOG.md eintragen.
const APP_VERSION = '2.2';
const DEFAULT_REWARDS = { 2: 'Pizzaabend', 3: 'Kinoabend', 4: 'Essen gehen', 5: 'Wochenendausflug' };
const POINT_STEPS = [3, 5, 10, 15, 20, 30, 35, 50, 60];
// Überschrift der Übersichtskarte, grammatisch passend je Bereich
const NEEDS = { kueche: 'Die Küche braucht', bad: 'Die Bäder brauchen', wohnen: 'Die Wohnräume brauchen',
  pflanzen: 'Die Pflanzen brauchen', robo: 'Der Roboter braucht' };

const ui = {
  view: 'home', search: '', openArea: null,
  rewardsTab: 'me', editRewards: false, deck: null, flipped: null,
  statsView: 'over', statsRange: 'week', histWho: 'all',
  pointsArea: null, joinOpen: false, copied: false,
  sheet: null, modal: null, toast: null, error: null,
};
let device = loadDevice();
let store = null;
let unsubscribe = null;
let renderDeferred = false;
let holdUntil = 0;

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
const fmtDate = ts => new Date(ts).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' });
const fmtDay = ts => new Date(ts).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
const fmtTime = ts => new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
const fmtDateTime = ts => `${fmtDay(ts)}, ${fmtTime(ts)}`;
const pct = x => Math.round(x * 100);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
// Aktueller Katalog inkl. eigener und ausgeblendeter Aufgaben, bei jedem ctx() neu aufgebaut.
let catalog = buildCatalog(TASKS);
const taskById = id => [catalog.all, DAILY, RETIRED].flat().find(t => t.id === id);
const areaOf = id => taskById(id)?.area;
const iconOf = id => { const t = taskById(id); return t?.icon ?? AREAS[t?.area]?.icon ?? 'check'; };
const startOfDay = ts => new Date(ts).setHours(0, 0, 0, 0);

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newHouseholdCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return [...bytes].map(b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('').match(/.{4}/g).join('-');
}
function normalizeCode(s) {
  const c = String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return c.length === 20 ? c.match(/.{4}/g).join('-') : null;
}
// Einladungslink: ?join=CODE (früher #join=CODE, wird weiter verstanden)
function joinParam() {
  return new URLSearchParams(location.search).get('join') ?? new URLSearchParams(location.hash.slice(1)).get('join') ?? '';
}
function cleanUrl() {
  if (!joinParam()) return;
  const q = new URLSearchParams(location.search);
  q.delete('join');
  const rest = q.toString().replace(/=(?=&|$)/g, ''); // ?demo statt ?demo=
  history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : ''));
}
const inviteLink = () => `${location.origin}${location.pathname}?join=${device.household}`;

function syncLabel() {
  const s = store.status;
  if (s === 'local') return 'nur auf diesem Gerät';
  if (s === 'ok') return 'alles synchron';
  if (s === 'syncing' || s === 'idle') return 'synchronisiere …';
  if (s === 'offline') return 'offline, wird nachgeholt';
  return 'Sync-Fehler';
}

function ctx() {
  const settings = store.get('settings');
  const players = settings.players;
  const now = Date.now();
  catalog = buildCatalog(TASKS, store.list('task'));
  const tasks = catalog.active;
  const state = compute({ tasks, completions: store.list('completion'), settings, players, now });
  return {
    settings, players, now, state, tasks, allTasks: catalog.all,
    me: players.find(p => p.id === device.me),
    partner: players.find(p => p.id !== device.me),
    name: id => players.find(p => p.id === id),
    vouchers: store.list('voucher'),
    rewards: store.list('reward'),
  };
}

// ---------- Bausteine ----------

const ms = (name, cls = '') => `<span class="ms ${cls}" aria-hidden="true">${name}</span>`;
const colorIndex = p => p.color ?? (p.id === 'a' ? 0 : 1);
const pColor = p => `var(--swatch-${colorIndex(p) + 1})`;
const initial = p => esc((p?.name?.trim()?.[0] ?? '?').toUpperCase());
const avatar = (p, cls = '') => `<span class="avatar ${cls}" style="--pc:${pColor(p)}">${initial(p)}</span>`;
const avatars = c => `<div class="avatars">${avatar(c.me)}${avatar(c.partner)}</div>`;
const tile = (area, size = '', icon = AREAS[area].icon) =>
  `<span class="tile ${size}" style="--ac:var(--area-${area})">${ms(icon)}</span>`;
const sec = (title, hint = '') => `<div class="sec"><h3>${title}</h3>${hint}</div>`;
const hint = text => `<span>${text}</span>`;
const bar = (progress, color) =>
  `<div class="bar"><span style="width:${pct(Math.max(0, Math.min(1, progress)))}%;${color ? `background:${color}` : ''}"></span></div>`;
const segmented = (items, current, action, cls = '') =>
  `<div class="seg ${cls}">${items.map(([val, label, badge]) => `<button class="${val === current ? 'on' : ''}" data-action="${action}" data-val="${val}">
    ${label}${badge ? `<span class="badge">${badge}</span>` : ''}</button>`).join('')}</div>`;

function dueMeta(s, now, paused) {
  if (s.overdue) {
    const days = s.overdueDays ? `${plural(s.overdueDays, 'Tag', 'Tage')} überfällig` : 'seit heute überfällig';
    const cost = paused ? ' · pausiert' : s.penaltyPerDay ? ` · −${fmtDec(s.penaltyPerDay)}/Tag` : '';
    return `<span class="od">${days}</span>${cost}`;
  }
  const d = Math.ceil((s.due - now) / DAY);
  const fresh = now < s.freshUntil ? 'frisch · ' : '';
  return fresh + (d <= 0 ? 'heute fällig' : d === 1 ? 'morgen fällig' : `in ${d} Tagen fällig`);
}

const ptsButton = (t, s, cls = '') =>
  `<button class="pts ${cls}" data-action="quick" data-id="${t.id}"
    aria-label="${esc(t.name)} erledigt, ${s.points} Punkte">+${s.points}</button>`;

// Aufgabenzeile in der Bereichsliste und in den Suchtreffern: Name öffnet das Sheet, Pille erledigt direkt.
const taskLine = (t, c) => {
  const s = c.state.status[t.id];
  return `<div class="atask">
    <button class="tmain" data-action="open" data-id="${t.id}">
      <span class="tname">${esc(t.name)}</span><span class="tmeta">${dueMeta(s, c.now, c.state.paused)}</span>
    </button>${ptsButton(t, s, 'sm')}</div>`;
};

function vacationBanner(c) {
  const pause = activePause(c.settings);
  if (!pause) return '';
  const since = startOfDay(pause.from) === startOfDay(c.now) ? 'heute' : fmtDate(pause.from);
  return `<div class="banner-vac">${ms('beach_access')}Urlaub · die Uhr steht seit ${since}</div>`;
}

// ---------- Heute ----------

// Suche: Groß/Klein und Umlaute egal („spuele“ findet „Spüle“), alle Wörter müssen vorkommen.
const fold = s => String(s).toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .normalize('NFD').replace(/[̀-ͯ\u00AD]/g, '');
function matchesSearch(t, query) {
  const hay = fold(`${t.name} ${AREAS[t.area].name} ${INTERVALS[t.interval].label}`);
  return fold(query).split(/\s+/).filter(Boolean).every(word => hay.includes(word));
}

function searchResults(c) {
  const query = ui.search.trim();
  if (!query) return '';
  const st = id => c.state.status[id];
  const order = t => (st(t.id).overdue ? 0 : c.now >= st(t.id).freshUntil ? 1 : 2);
  const hits = c.tasks.filter(t => matchesSearch(t, query))
    .sort((a, b) => order(a) - order(b) || st(a.id).due - st(b.id).due);
  return hits.length
    ? hits.map(t => taskLine(t, c)).join('')
    : `<p class="none">Nichts zu „${esc(query)}“. Versuch es mit „Bad“ oder „Fenster“.</p>`;
}

function dailyCountToday(c, taskId) {
  const midnight = startOfDay(c.now);
  return c.state.done.filter(x => x.taskId === taskId && x.at >= midnight).length;
}

function viewHome(c) {
  const { state, me, now } = c;
  const st = id => state.status[id];
  const pi = state.personal[me.id];
  const areas = areaSummary(c.tasks, state.status);
  const keys = Object.keys(AREAS);
  const totalWeight = keys.reduce((s, k) => s + areas[k].weight, 0);
  const behind = keys.filter(k => areas[k].overdue).length;
  const overdueTotal = c.tasks.filter(t => st(t.id).overdue).length;
  const worst = keys.reduce((a, b) => (areas[b].freshness < areas[a].freshness ? b : a));
  const headline = state.paused ? 'Urlaub. Die Uhr steht, nichts wird überfällig.'
    : areas[worst].freshness >= 0.9 ? 'Alles frisch. Stark!'
    : `${NEEDS[worst]} euch gerade am meisten`;
  const ti = state.teamInfo;
  const nextReward = c.rewards.find(r => r.level === ti.level + 1)?.text || `Team-Level ${ti.level + 1}`;
  const date = new Date(now).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  const segment = k => {
    const f = areas[k].freshness;
    return `<button class="${ui.openArea === k ? 'on' : ''}" data-action="openArea" data-val="${k}" data-scroll="1"
        style="--w:${areas[k].weight / totalWeight};--ac:var(--area-${k});--dim:var(--area-${k}-dim)"
        aria-label="${AREAS[k].name}: ${pct(f)} % frisch">
      <span class="fill" style="height:${pct(f)}%"></span>${ms(AREAS[k].icon, f > 0.72 ? 'ink' : '')}</button>`;
  };

  const dailyTile = t => {
    const n = dailyCountToday(c, t.id);
    const full = n >= t.perDay;
    return `<button class="daily" data-action="daily" data-id="${t.id}" ${full ? 'disabled' : ''}
        aria-label="${esc(t.name)} erledigt, ${t.points} Punkte, heute ${n} von ${t.perDay}">
      <span class="circle">${ms(t.icon)}</span>
      <span class="name">${esc(t.name)}</span>
      <span class="meta">+${t.points}${Array.from({ length: t.perDay }, (_, i) => `<i class="dot${i < n ? ' on' : ''}"></i>`).join('')}</span>
    </button>`;
  };

  let focus = focusTasks(c.tasks, state.status);
  let focusTitle = 'Lohnt sich jetzt', focusHint = `Rettung +${pct(RULES.rescueBonus)} %`;
  if (!focus.length) {
    focus = c.tasks.filter(t => now >= st(t.id).freshUntil).sort((a, b) => st(a.id).due - st(b.id).due).slice(0, 3);
    focusTitle = 'Als Nächstes';
    focusHint = 'nichts überfällig';
  }
  const focusRow = t => `<div class="frow">${tile(t.area)}
      <button class="tmain" data-action="open" data-id="${t.id}">
        <span class="tname">${esc(t.name)}</span><span class="tmeta">${dueMeta(st(t.id), now, state.paused)}</span>
      </button>${ptsButton(t, st(t.id))}</div>`;

  const areaRow = k => {
    const open = ui.openArea === k;
    const tasks = c.tasks.filter(t => t.area === k).sort((a, b) => st(a.id).due - st(b.id).due);
    const status = areas[k].overdue ? `<span class="od">${areas[k].overdue} überfällig</span>` : 'alles im Plan';
    return `<div id="area-${k}" class="${open ? 'open' : ''}">
      <button class="acc-head" data-action="openArea" data-val="${k}" aria-expanded="${open}">
        ${tile(k)}
        <span class="grow"><span class="line1"><b>${AREAS[k].name}</b><span>${status}</span></span>
          ${bar(areas[k].freshness, `var(--area-${k})`)}</span>
        ${ms('expand_more', 'chev outline')}
      </button>
      ${open ? `<div class="acc-body">${tasks.map(t => taskLine(t, c)).join('')}</div>` : ''}
    </div>`;
  };

  return `
    ${vacationBanner(c)}
    <header class="hello-head">
      <div class="hello-row">
        <div><div class="date">${date}</div><div class="hello">Hallo ${esc(me.name)}</div></div>
        <div class="hello-right">
          <span class="lvl-chip"><span class="star">${ms('star')}</span>Level ${pi.level}</span>
          ${avatars(c)}
        </div>
      </div>
      <div class="lvl-line">
        <div><b>${personalTitle(pi.level)}</b><span>noch ${fmtNum(pi.next - state.xp[me.id])} bis Level ${pi.level + 1}</span></div>
        ${bar(pi.progress)}
      </div>
    </header>

    <section class="card overview">
      <div class="ov-top"><b>Wohnung</b><span>${behind} von ${keys.length} mit Rückstand</span></div>
      <h2>${headline}</h2>
      <div class="levels">${keys.map(segment).join('')}</div>
      <span class="hint">Je voller, desto frischer · antippen zum Öffnen</span>
      <div class="kpis">
        <div><b class="od">${overdueTotal}</b><span>überfällig</span></div>
        <div><b>${state.penaltyPerDayNow ? `−${fmtDec(state.penaltyPerDayNow)}` : '0'}</b><span>Team pro Tag</span></div>
        <div><b style="color:var(--accent)">${fmtNum(ti.next - state.teamScore)}</b><span>bis ${esc(nextReward)}</span></div>
      </div>
    </section>

    <section class="stack">
      ${sec('Alltag', hint('ein Tipp genügt'))}
      <div class="daily-row">${DAILY.map(dailyTile).join('')}</div>
    </section>

    <section class="stack">
      ${sec(focusTitle, hint(focusHint))}
      <div class="stack-8">${focus.length ? focus.map(focusRow).join('') : '<p class="empty">Gerade ist alles frisch. Genießt es!</p>'}</div>
    </section>

    <section class="stack">
      ${sec('Bereiche', hint(`${overdueTotal} überfällig`))}
      <div class="card area-list rows">${keys.map(areaRow).join('')}</div>
    </section>
  `;
}

function dockHtml(c) {
  const search = ui.view === 'home' ? `
    <div id="search-results" class="results" ${ui.search.trim() ? '' : 'hidden'}>${searchResults(c)}</div>
    <label class="search">${ms('search', 'outline')}
      <input id="search" type="search" enterkeyhint="search" autocomplete="off" placeholder="Was hast du gemacht?"
        value="${esc(ui.search)}" aria-label="Aufgabe suchen">
      <button class="icon-btn" data-action="clearSearch" aria-label="Suche leeren" ${ui.search ? '' : 'hidden'}>${ms('close')}</button>
    </label>` : '';
  const picks = picksAvailable(c.state, c.me.id, c.vouchers);
  const tab = (view, ic, label, badge) => `<button class="tab${ui.view === view ? ' on' : ''}" data-action="tab" data-view="${view}">
    ${ms(ic)}${badge ? `<span class="tab-badge">${badge}</span>` : ''}<span>${label}</span></button>`;
  return `<nav class="dock">${search}<div class="tabbar">${tab('home', 'home', 'Heute')}${tab('rewards', 'redeem', 'Belohnungen', picks)}${tab('stats', 'bar_chart', 'Statistik')}${tab('settings', 'settings', 'Einstellungen')}</div></nav>`;
}

// ---------- Belohnungen ----------

function rewardIcon(text) {
  const t = fold(text ?? '');
  if (t.includes('pizza')) return 'local_pizza';
  if (t.includes('kino') || t.includes('film')) return 'movie';
  if (t.includes('essen') || t.includes('restaurant')) return 'restaurant';
  if (t.includes('ausflug') || t.includes('wochenende') || t.includes('urlaub')) return 'landscape';
  return 'redeem';
}

const FAN = { 1: [[0, 0, 0]], 2: [[-46, 10, -6], [46, 10, 6]], 3: [[-78, 18, -10], [0, 0, 0], [78, 18, 10]] };

function stageHtml(c) {
  const { state, me, partner, vouchers } = c;
  const picks = picksAvailable(state, me.id, vouchers);
  const pool = vouchers.filter(v => v.to === me.id && !v.pickedAt);
  const flipped = ui.flipped ? vouchers.find(v => v.id === ui.flipped) : null;
  const canPick = !flipped && picks > 0 && pool.length > 0;
  if (canPick && (!ui.deck || ui.deck.length < Math.min(3, pool.length) || ui.deck.some(id => !pool.some(v => v.id === id)))) {
    ui.deck = shuffle(pool).slice(0, 3).map(v => v.id);
  }
  const deck = flipped ? ui.deck ?? [flipped.id] : canPick ? ui.deck : [null, null, null];
  const fan = FAN[deck.length];
  const pi = state.personal[me.id];

  const card = (id, i) => {
    const [x, y, r] = fan[i];
    const v = id && vouchers.find(x => x.id === id);
    const sel = flipped && id === flipped.id;
    const cls = sel ? 'sel' : flipped ? 'dim' : canPick ? '' : 'locked';
    return `<button class="pcard ${cls}" style="--x:${x}px;--y:${y}px;--r:${r}deg;z-index:${sel ? 5 : i === 1 ? 2 : 1}"
        ${canPick ? `data-action="flip" data-id="${id}" aria-label="Karte ${i + 1} umdrehen"` : 'disabled aria-hidden="true"'}>
      <span class="pcard-inner">
        <span class="face back"><span>${ms(canPick ? 'touch_app' : 'lock')}</span></span>
        <span class="face front"><small>Von ${esc(partner.name)}</small><b>${esc(v?.text ?? '')}</b>${ms('favorite')}</span>
      </span></button>`;
  };

  let title, sub, extra = '';
  if (flipped) {
    title = 'Glückwunsch!';
    sub = 'Löse sie ein, wann immer du magst.';
    extra = `<button class="pill primary" data-action="keepCard">${ms('check')}In meine Karten</button>`;
  } else if (canPick) {
    title = picks > 1 ? `Zieh eine Karte · ${picks} frei` : 'Zieh eine Karte';
    sub = `${esc(partner.name)} hat sie verdeckt für dich hinterlegt. Eine davon gehört dir.`;
  } else if (picks > 0) {
    title = 'Karte freigespielt!';
    sub = `${esc(partner.name)} hat noch nichts in den Topf gelegt. Sag Bescheid!`;
  } else {
    title = `Nächste Karte bei Level ${pi.level + 1}`;
    sub = `Noch ${fmtNum(pi.next - state.xp[me.id])} Punkte. ${pool.length
      ? `${esc(partner.name)} hat schon ${pool.length === 1 ? 'eine Karte' : 'Karten'} für dich hinterlegt.`
      : `${esc(partner.name)} hat noch nichts hinterlegt.`}`;
    extra = bar(pi.progress);
  }
  return `<section class="stage">
      <div class="stage-cards">${deck.map(card).join('')}</div>
      <div class="stage-text"><h2>${title}</h2><p>${sub}</p>${extra}</div>
    </section>`;
}

function viewRewards(c) {
  const { state, me, partner, vouchers, rewards, players } = c;
  const picks = picksAvailable(state, me.id, vouchers);
  const fromMe = vouchers.filter(v => v.from === me.id).sort((a, b) => b.createdAt - a.createdAt);
  const partnerPool = fromMe.filter(v => !v.pickedAt);

  let body;
  if (ui.rewardsTab === 'me') {
    const mine = vouchers.filter(v => v.to === me.id && v.pickedAt && v.id !== ui.flipped)
      .sort((a, b) => Boolean(a.redeemedAt) - Boolean(b.redeemedAt) || b.pickedAt - a.pickedAt);
    const open = mine.filter(v => !v.redeemedAt).length;
    body = `${stageHtml(c)}
      <section class="stack">
        ${sec('Deine Karten', hint(`${open} offen`))}
        <div class="stack-8">${mine.length ? mine.map(v => `<div class="vrow${v.redeemedAt ? ' used' : ''}">
            <span class="mini-card">${ms('redeem')}</span>
            <span class="tmain"><span class="tname">${esc(v.text)}</span>
              <span class="tmeta">${v.redeemedAt ? `eingelöst · von ${esc(partner.name)}` : `von ${esc(partner.name)} · gezogen ${fmtDate(v.pickedAt)}`}</span></span>
            ${v.redeemedAt ? '' : `<button class="pill" data-action="redeemVoucher" data-id="${v.id}">Einlösen</button>`}
          </div>`).join('') : `<p class="empty">${ui.flipped || picks ? 'Gezogene Karten landen hier, bis ihr sie einlöst.' : 'Noch keine Karten gezogen. Die erste gibt es beim nächsten Level.'}</p>`}</div>
      </section>`;
  } else if (ui.rewardsTab === 'partner') {
    const n = partnerPool.length;
    const gone = fromMe.filter(v => v.pickedAt);
    body = `<section class="card pad stack" style="gap:14px">
        <div class="pot-head"><h2>Für ${esc(partner.name)} in den Topf</h2>
          <span class="slots">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}${n >= 3 ? `${n} im Topf` : `${n} von 3`}</span></div>
        <p class="tmeta" style="margin-top:-6px;line-height:1.4">${esc(partner.name)} zieht bei jedem Levelaufstieg eine von bis zu drei verdeckten Karten und sieht den Text erst dann. Drei oder mehr sind ideal.</p>
        <div class="add-row">
          <input id="voucher-text" class="field" maxlength="200" enterkeyhint="done" placeholder="z. B. Ich koche dein Lieblingsessen" aria-label="Neuer Gutschein">
          <button class="round-add" data-action="addVoucher" disabled aria-label="In den Topf legen">${ms('add')}</button>
        </div>
        ${partnerPool.length || gone.length ? `<div>${partnerPool.map(v => `<div class="pot-row"><span class="stripe"></span><span>${esc(v.text)}</span>
            <button class="icon-btn del" data-action="deleteVoucher" data-id="${v.id}" aria-label="Aus dem Topf nehmen">${ms('close', 'outline')}</button></div>`).join('')}
          ${gone.map(v => `<div class="pot-row"><span class="stripe gone"></span><span class="muted">${esc(v.text)}</span><small>${v.redeemedAt ? 'eingelöst' : 'gezogen'}</small></div>`).join('')}</div>` : ''}
      </section>
      <div class="note-dashed">${ms('visibility_off')}${esc(partner.name)} sieht nur, wie viele Karten im Topf liegen, nicht was darauf steht.</div>`;
  } else {
    const nextLevel = state.teamLevel + 1;
    const f = rewardFairness(state, nextLevel, players);
    const shareMe = f.total ? f.pts[me.id] / f.total : 0.5;
    const fairMsg = !f.total ? '<span>Noch keine Punkte</span>'
      : f.ok ? '<span class="ok">Ja, beide über einem Drittel</span>'
      : `<span class="no">${esc(c.name(f.missing[0].player).name)} fehlen noch ${fmtNum(f.missing[0].need)} Punkte</span>`;
    const levels = Array.from({ length: Math.max(5, state.teamLevel + 2) - 1 }, (_, i) => i + 2);

    const ticket = level => {
      const r = rewards.find(x => x.level === level);
      const at = threshold(TEAM, level);
      const reached = state.teamLevel >= level, next = level === nextLevel;
      let cls = '', sub, extra = '';
      if (r?.redeemedAt) { cls = 'done'; sub = `eingelöst am ${fmtDate(r.redeemedAt)}`; }
      else if (reached) {
        const fr = rewardFairness(state, level, players);
        sub = fr.ok ? 'erreicht · bereit zum Einlösen' : `erreicht · <span class="warn">noch ${fr.missing.map(m => `${fmtNum(m.need)} Punkte von ${esc(c.name(m.player).name)}`).join(', ')}</span>`;
        if (!ui.editRewards) extra = `<button class="pill" data-action="redeemReward" data-level="${level}" ${fr.ok && r?.text ? '' : 'disabled'}>Einlösen</button>`;
      } else if (next) {
        cls = 'next';
        sub = `ab ${fmtNum(at)} Teampunkten · noch ${fmtNum(at - state.teamScore)}`;
        extra = bar(state.teamInfo.progress);
      } else sub = `ab ${fmtNum(at)} Teampunkten`;
      const tag = ui.editRewards ? 'button' : 'div';
      return `<${tag} class="ticket ${cls}" ${ui.editRewards ? `data-action="editReward" data-level="${level}"` : ''}>
        <span class="stub">${ms(rewardIcon(r?.text))}<b>LV ${level}</b></span>
        <span class="body"><b>${r?.text ? esc(r.text) : 'Belohnung festlegen'}</b><span>${sub}</span>${extra}</span>
        <i class="hole t"></i><i class="hole b"></i>${ui.editRewards ? ms('edit', 'edit') : ''}
      </${tag}>`;
    };

    body = `<div class="fair">
        <div class="l"><span>Fair geteilt seit Level ${state.teamLevel}?</span>${fairMsg}</div>
        <div class="fair-bar"><span style="width:${pct(shareMe)}%;background:${pColor(me)}"></span><span style="background:${pColor(partner)}"></span>
          <i style="left:33.3%"></i><i style="left:66.6%"></i></div>
        <div class="l foot"><span>${esc(me.name)} ${pct(shareMe)} %</span><span>Markierung = ein Drittel</span><span>${esc(partner.name)} ${100 - pct(shareMe)} %</span></div>
      </div>
      <section class="stack">
        ${sec('Team-Belohnungen', `<button class="link" data-action="toggleEditRewards">${ui.editRewards ? 'Fertig' : 'Bearbeiten'}</button>`)}
        <div class="tickets">${levels.map(ticket).join('')}</div>
      </section>`;
  }

  return `
    ${vacationBanner(c)}
    <header class="page-head"><h1>Belohnungen</h1>${avatars(c)}</header>
    ${segmented([['me', 'Für mich', picks], ['partner', `Für ${esc(partner.name)}`, partnerPool.length], ['team', 'Team']], ui.rewardsTab, 'rewardsTab', 'tall')}
    ${body}`;
}

// ---------- Statistik ----------

function viewStats(c) {
  const { state, players, me, partner, now } = c;
  const order = [me, partner];
  let body;

  if (ui.statsView === 'over') {
    const ranges = { week: ['Woche', 'diese Woche', weekStart(now)], month: ['Monat', 'dieser Monat', monthStart(now)], all: ['Gesamt', 'seit Start', -Infinity] };
    const [, periodLabel, from] = ranges[ui.statsRange];
    const pts = state.sumSince(from);
    const a = pts[me.id], b = pts[partner.id], sum = a + b;
    const shareA = sum ? a / sum : 0.5;
    const diff = Math.abs(a - b);
    const lead = diff < 5 ? 'Gleichauf' : `${esc((a > b ? me : partner).name)} +${fmtNum(diff)}`;

    const byArea = pointsByArea(state.done, from, areaOf, players);
    const maxArea = Math.max(0, ...Object.values(byArea).map(x => x[me.id] + x[partner.id]));
    const areaRow = k => {
      const x = byArea[k] ?? { [me.id]: 0, [partner.id]: 0 };
      const total = x[me.id] + x[partner.id];
      const w = maxArea ? Math.max(0.08, total / maxArea) : 0.08;
      return `<div class="as-row">${tile(k, 't38')}
        <div class="grow"><div class="l"><b>${AREAS[k].name}</b><span><b style="color:${pColor(me)}">${fmtNum(x[me.id])}</b> · <b style="color:${pColor(partner)}">${fmtNum(x[partner.id])}</b></span></div>
          ${total ? `<div class="as-bar" style="width:${pct(w)}%"><span style="width:${pct(x[me.id] / total)}%;background:${pColor(me)}"></span><span style="background:${pColor(partner)}"></span></div>`
            : '<div class="bar"></div>'}</div>
      </div>`;
    };

    const levelCard = p => {
      const li = state.personal[p.id];
      return `<div class="card lvcard">
        <div class="who">${avatar(p, 'lg')}<div><b>${esc(p.name)}</b><span>Level ${li.level}</span></div></div>
        <span class="title" style="color:${pColor(p)}">${personalTitle(li.level)}</span>
        <div class="stack-8" style="gap:6px">${bar(li.progress, pColor(p))}<span class="xp">${fmtNum(state.xp[p.id])} / ${fmtNum(li.next)} Punkte</span></div>
      </div>`;
    };

    const tops = p => {
      const counts = {};
      for (const x of state.done) if (x.player === p.id && x.at >= from) counts[x.taskId] = (counts[x.taskId] ?? 0) + 1;
      const top = Object.entries(counts).sort((x, y) => y[1] - x[1]).slice(0, 3).filter(([id]) => taskById(id));
      return `<div class="card tops"><b style="color:${pColor(p)}">${esc(p.name)}</b>${top.length
        ? top.map(([id]) => `<div class="it">${tile(areaOf(id), 't26', iconOf(id))}<span>${esc(taskById(id).name)}</span></div>`).join('')
        : '<span class="none">noch nichts</span>'}</div>`;
    };

    body = `
      ${segmented([['week', 'Woche'], ['month', 'Monat'], ['all', 'Gesamt']], ui.statsRange, 'statsRange')}
      <section class="card contrib">
        <div class="top">
          <div class="who"><small style="color:${pColor(me)}">${esc(me.name)}</small><b>${fmtNum(a)}</b></div>
          <span class="sum">${fmtNum(sum)} Pkt zusammen</span>
          <div class="who r"><small style="color:${pColor(partner)}">${esc(partner.name)}</small><b>${fmtNum(b)}</b></div>
        </div>
        <div class="split"><span style="width:${pct(shareA)}%;background:${pColor(me)}"></span><span style="background:${pColor(partner)}"></span></div>
        <div class="foot"><span>${pct(shareA)} %</span><b>${sum ? lead : 'Noch nichts erledigt'}</b><span>${100 - pct(shareA)} %</span></div>
      </section>
      <section class="stack">
        ${sec('Wer macht was?', hint(periodLabel))}
        <div class="card areasplit rows">${Object.keys(AREAS).map(areaRow).join('')}</div>
      </section>
      <div class="grid2">${order.map(levelCard).join('')}</div>
      <section class="card penalty"><span class="tile od">${ms('hourglass_bottom')}</span>
        <span class="grow"><b>Liegengeblieben</b><span>Teampunkte durch überfällige Aufgaben, seit Start</span></span>
        <b>${state.penaltyTotal ? `−${fmtNum(state.penaltyTotal)}` : '0'}</b></section>
      <section class="stack">
        ${sec('Am häufigsten erledigt', hint(periodLabel))}
        <div class="grid2">${order.map(tops).join('')}</div>
      </section>`;
  } else {
    const list = [...state.done].reverse()
      .filter(x => ui.histWho === 'all' || x.player === ui.histWho)
      .slice(0, 120);
    const days = [];
    for (const x of list) {
      const day = startOfDay(x.at);
      if (days.at(-1)?.day !== day) days.push({ day, items: [] });
      days.at(-1).items.push(x);
    }
    const row = x => {
      const p = c.name(x.player);
      return `<div class="hrow">
        <span class="ava">${tile(areaOf(x.taskId) ?? 'kueche', 't38', iconOf(x.taskId))}${p ? avatar(p) : ''}</span>
        <span class="grow"><b>${esc(taskById(x.taskId)?.name ?? x.taskId)}</b><span>${esc(p?.name ?? '?')} · ${fmtTime(x.at)}${x.rescue ? ' · Rettung' : ''}</span></span>
        <b>+${xpOf(x)}</b>
        <button class="icon-btn del" data-action="deleteCompletion" data-id="${x.id}" aria-label="Eintrag löschen">${ms('close', 'outline')}</button>
      </div>`;
    };
    body = `
      ${segmented([['all', 'Alle'], [me.id, esc(me.name)], [partner.id, esc(partner.name)]], ui.histWho, 'histWho')}
      ${days.length ? days.map(d => `<section class="stack-8">
          <div class="day-head"><span>${fmtDay(d.day)}</span><span>+${fmtNum(d.items.reduce((s, x) => s + xpOf(x), 0))}</span></div>
          <div class="card hist rows">${d.items.map(row).join('')}</div>
        </section>`).join('') : '<p class="empty">Noch nichts erledigt. Der erste Eintrag landet hier.</p>'}`;
  }

  return `
    ${vacationBanner(c)}
    <header class="page-head"><h1>Statistik</h1>${avatars(c)}</header>
    ${segmented([['over', 'Überblick'], ['hist', 'Verlauf']], ui.statsView, 'statsView')}
    ${body}`;
}

// ---------- Einstellungen ----------

function viewSettings(c) {
  const { players, settings, me, partner } = c;
  const pause = activePause(settings);
  const connected = Boolean(store.get(`presence-${partner.id}`));

  const profile = p => {
    const mine = p.id === me.id;
    return `<div class="profile${mine ? ' me' : ''}" style="--pc:${pColor(p)}">
      <button class="avatar xl" style="--pc:${pColor(p)}" data-action="setMe" data-id="${p.id}" aria-label="${esc(p.name)} nutzt dieses Handy">${initial(p)}</button>
      <input class="name-in" value="${esc(p.name)}" maxlength="24" data-change="playerName" data-id="${p.id}" aria-label="Name">
      <div class="swatches">${[0, 1, 2, 3].map(i => `<button class="${colorIndex(p) === i ? 'on' : ''}" style="background:var(--swatch-${i + 1})"
        data-action="setColor" data-id="${p.id}" data-val="${i}" aria-label="Farbe ${i + 1}"></button>`).join('')}</div>
      <button class="me-btn" data-action="setMe" data-id="${p.id}">${mine ? `${ms('check_circle')}Das bin ich` : `${ms('smartphone')}Ich bin das`}</button>
    </div>`;
  };

  let household;
  if (!CLOUD && !DEMO) {
    household = `<div class="hh-head"><span class="tile t40 soft">${ms('smartphone')}</span>
      <span class="grow"><b>Nur auf diesem Gerät</b><span>Für zwei Handys einmal Supabase einrichten (README, Schritt 1).</span></span></div>`;
  } else {
    const head = connected
      ? `<span class="tile t40 soft">${ms('group')}</span><span class="grow"><b>Euer Haushalt</b><span>${esc(me.name)} und ${esc(partner.name)} sind verbunden · ${syncLabel()}</span></span>`
      : `<span class="tile t40 soft">${ms('person_add')}</span><span class="grow"><b>Partner einladen</b><span>Schick ${esc(partner.name)} den Link. Danach putzt ihr als Team.</span></span>`;
    household = `<div class="hh-head">${head}</div>
      ${DEMO ? '<p class="fine">Demo: eigener Test-Haushalt, nicht mit eurem echten Haushalt verbunden.</p>' : ''}
      ${store.status.startsWith('error') ? `<p class="fine od">${esc(store.status)}</p>` : ''}
      <div class="stack" style="gap:10px">
        ${connected ? '' : `<div class="code-box"><b>${esc(device.household)}</b><span>euer Schlüssel</span></div>`}
        <div class="btn2">
          <button class="pill mid" data-action="copyCode">${ms(ui.copied ? 'check' : 'content_copy')}${ui.copied ? 'Kopiert' : 'Code kopieren'}</button>
          <button class="pill mid primary" data-action="share">${ms('ios_share')}Link teilen</button>
        </div>
        <p class="fine">${connected
          ? 'Neues Handy? Link öffnen oder den Code eingeben. Den Code nur untereinander weitergeben.'
          : 'Wer den Link öffnet oder den Code eingibt, tritt eurem Haushalt bei und sieht denselben Plan. Nur an deinen Partner weitergeben.'}</p>
      </div>
      <div class="hr"></div>
      <div class="stack" style="gap:8px">
        <button class="join-toggle" data-action="toggleJoin" aria-expanded="${ui.joinOpen}">${ms('login', 'outline')}<span>Du hast einen Code bekommen?</span>${ms('expand_more', `chev outline${ui.joinOpen ? ' up' : ''}`)}</button>
        ${ui.joinOpen ? `<div class="join-row">
            <input id="join-code" class="field" placeholder="XXXX-XXXX-XXXX-…" autocapitalize="characters" autocomplete="off" spellcheck="false" aria-label="Haushaltscode">
            <button class="pill primary" data-action="joinOther" disabled>Beitreten</button>
          </div>
          <p class="fine">Achtung: Du verlässt dann diesen Haushalt und wechselst in den anderen.</p>` : ''}
      </div>`;
  }

  const areaBlock = k => {
    const tasks = c.allTasks.filter(t => t.area === k);
    const shown = tasks.filter(t => !t.hidden).length;
    const changed = tasks.filter(t => isAdjusted(t, settings)).length;
    const open = ui.pointsArea === k;
    return `<div class="${open ? 'open' : ''}">
      <button class="acc-head pt-head" data-action="pointsArea" data-val="${k}" aria-expanded="${open}">${tile(k, 't40')}
        <span class="grow"><b>${AREAS[k].name}</b><span>${plural(shown, 'Aufgabe', 'Aufgaben')}${changed ? ` · ${changed} angepasst` : ''}</span></span>
        ${ms('expand_more', 'chev outline')}</button>
      ${open ? `<div class="pt-body">${tasks.map(t => {
        const p = taskPoints(t, settings);
        const isChanged = Boolean(t.standard) && p !== t.standard.points;
        const meta = t.hidden ? 'ausgeblendet'
          : `${INTERVALS[t.interval].label}${t.custom ? ' · eigene' : isAdjusted(t, settings) ? ' · angepasst' : ''}`;
        return `<div class="pt-row${t.hidden ? ' off' : ''}">
          <button class="grow" data-action="editTask" data-id="${t.id}"><b>${esc(t.name)}</b><span>${meta}</span></button>
          ${t.hidden ? `<button class="pt-show" data-action="editTask" data-id="${t.id}">${ms('visibility_off')}</button>` : `<span class="stepper">
            <button data-action="stepPoints" data-id="${t.id}" data-dir="-1" ${p <= POINT_STEPS[0] ? 'disabled' : ''} aria-label="weniger Punkte">${ms('remove')}</button>
            <b class="${isChanged ? 'changed' : ''}">${p}</b>
            <button data-action="stepPoints" data-id="${t.id}" data-dir="1" ${p >= POINT_STEPS.at(-1) ? 'disabled' : ''} aria-label="mehr Punkte">${ms('add')}</button>
          </span>`}</div>`;
      }).join('')}
        <button class="pt-add" data-action="newTask" data-area="${k}">${ms('add')}Aufgabe hinzufügen</button></div>` : ''}
    </div>`;
  };

  const rule = (icon, cls, title, text) => `<div class="lrow"><span class="tile t40 ${cls}">${ms(icon)}</span>
    <span class="grow"><b>${title}</b><span>${text}</span></span></div>`;

  return `
    ${vacationBanner(c)}
    <header class="page-head"><h1>Einstellungen</h1></header>

    <section class="stack">
      ${sec('Wer seid ihr?', hint('Tippe auf dich'))}
      <div class="grid2">${players.map(profile).join('')}</div>
    </section>

    <section id="household" class="card pad hh">${household}</section>

    <section class="card lcard">
      <div class="lrow"><span class="tile t40 vac${pause ? ' on' : ''}">${ms('beach_access')}</span>
        <span class="grow"><b>Urlaubsmodus</b><span>${pause ? `Läuft seit ${fmtDate(pause.from)} · nichts wird überfällig` : 'Pausiert die Uhr für euch beide'}</span></span>
        <button class="switch${pause ? ' on' : ''}" role="switch" aria-checked="${Boolean(pause)}" aria-label="Urlaubsmodus" data-action="toggleVacation"><span></span></button>
      </div>
    </section>

    <section class="stack">
      ${sec('Aufgaben', hint('antippen zum Bearbeiten'))}
      <div class="card rows" style="overflow:hidden">${Object.keys(AREAS).map(areaBlock).join('')}</div>
    </section>

    <section class="stack">
      ${sec('So funktioniert’s')}
      <div class="card lcard rows">
        ${rule('hourglass_bottom', 'od', 'Liegenlassen kostet', `Überfällige Aufgaben kosten das Team pro Tag ${pct(RULES.penaltyRate)} % ihrer Punkte, höchstens ${RULES.penaltyCapDays} Tage lang.`)}
        ${rule('volunteer_activism', 'soft', 'Retten lohnt sich', `Wer eine überfällige Aufgabe erledigt, bekommt +${pct(RULES.rescueBonus)} % aufs persönliche Level.`)}
        ${rule('schedule', 'info', 'Jederzeit erledigen', 'Aufgaben lassen sich auch vor der Fälligkeit abhaken. Ihre Uhr startet dann neu.')}
        ${rule('balance', 'partner', 'Fair teilen', 'Team-Belohnungen sind einlösbar, wenn beide seit dem letzten Level mind. ein Drittel beigetragen haben.')}
      </div>
    </section>

    <button class="leave" data-action="leave">Auf diesem Gerät abmelden</button>
    <p class="version">Putzplan ${APP_VERSION}</p>
  `;
}

// ---------- Overlays ----------

function sheetHtml(c) {
  if (!ui.sheet) return '';
  const t = taskById(ui.sheet);
  const st = c.state.status[t.id];
  if (!st) return '';
  const xp = Math.round(st.points * (st.overdue ? 1 + RULES.rescueBonus : 1));
  const last = st.count ? `Zuletzt ${fmtDateTime(st.last)} von ${esc(c.name(st.lastBy)?.name ?? '?')}` : 'Noch nie erledigt';
  return `<div class="backdrop" data-action="closeSheet"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(t.name)}">
      <div class="grab"></div>
      <div class="sheet-area">${tile(t.area, 't38')}${AREAS[t.area].name} · ${INTERVALS[t.interval].label}</div>
      <h2>${esc(t.name)}</h2>
      <div class="sheet-pts"><b>${st.points}</b> Punkte${st.overdue ? ` <span class="chip-bonus">+${pct(RULES.rescueBonus)} % Rettungsbonus</span>` : ''}</div>
      <p>${last}</p>
      ${st.overdue ? (c.state.paused
        ? '<p>Überfällig, aber im Urlaubsmodus pausiert. Kostet gerade nichts.</p>'
        : `<p class="od">Überfällig. Kostet das Team gerade −${fmtDec(st.penaltyPerDay)} Punkte pro Tag.</p>`) : ''}
      ${!st.overdue && st.count ? `<p class="note">Erst am ${fmtDate(st.due)} wieder fällig. Abhaken geht trotzdem.</p>` : ''}
      <button class="pill primary big" data-action="complete" data-id="${t.id}" data-player="${c.me.id}">${ms('check')}Erledigt · +${xp}</button>
      <button class="pill mid" data-action="complete" data-id="${t.id}" data-player="${c.partner.id}">Von ${esc(c.partner.name)} erledigt eintragen</button>
    </div>`;
}

function modalHtml(c) {
  const m = ui.modal;
  if (!m) return '';
  let body = '';
  if (m.type === 'levelup') {
    const p = c.name(m.player);
    const isMe = p.id === c.me.id;
    body = `<div class="burst">${ms('star')}</div><h2>${isMe ? 'Level' : `${esc(p.name)}: Level`} ${m.level}!</h2>
      <p class="title">${personalTitle(m.level)}</p>
      <p>${isMe ? `Du hast eine Karte von ${esc(c.partner.name)} freigespielt.` : `${esc(p.name)} darf jetzt eine Karte von dir ziehen.`}</p>
      ${isMe ? '<button class="pill primary big" data-action="tab" data-view="rewards" data-tab="me">Karte ziehen</button>' : ''}
      <button class="pill ghost" data-action="closeModal">Weiter</button>`;
  } else if (m.type === 'teamup') {
    const r = c.rewards.find(x => x.level === m.level);
    body = `<div class="burst">${ms(rewardIcon(r?.text))}</div><h2>Team-Level ${m.level}!</h2>
      <p>${r?.text ? `Freigeschaltet: <b>${esc(r.text)}</b>` : 'Legt gemeinsam eine Belohnung fest.'}</p>
      <button class="pill primary big" data-action="tab" data-view="rewards" data-tab="team">Zu den Belohnungen</button>
      <button class="pill ghost" data-action="closeModal">Weiter</button>`;
  } else if (m.type === 'reward') {
    const r = c.rewards.find(x => x.level === m.level);
    body = `<h2>Belohnung für Team-Level ${m.level}</h2>
      <input id="reward-text" class="field" maxlength="80" value="${esc(r?.text ?? '')}" placeholder="z. B. Pizzaabend">
      <button class="pill primary big" data-action="saveReward" data-level="${m.level}">Speichern</button>
      <button class="pill ghost" data-action="closeModal">Abbrechen</button>`;
  } else if (m.type === 'task') {
    const t = m.id ? taskById(m.id) : null;
    const std = t?.standard;
    const resettable = std && (m.name !== std.name || m.interval !== std.interval || m.points !== std.points);
    body = `<div class="sheet-area">${tile(m.area, 't38')}${AREAS[m.area].name}</div>
      <h2>${t ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</h2>
      <input id="task-name" class="field" maxlength="60" value="${esc(m.name)}" placeholder="z. B. Balkon fegen" aria-label="Name">
      <div class="seg tall task-iv">${Object.entries(INTERVALS).map(([k, v]) =>
        `<button class="${m.interval === k ? 'on' : ''}" data-action="taskDraft" data-key="interval" data-val="${k}">${v.label}</button>`).join('')}</div>
      <div class="task-pts"><span>Punkte${std && m.points !== std.points ? ` · Standard ${std.points}` : ''}</span><span class="stepper">
        <button data-action="taskDraft" data-key="points" data-dir="-1" ${m.points <= POINT_STEPS[0] ? 'disabled' : ''} aria-label="weniger Punkte">${ms('remove')}</button>
        <b>${m.points}</b>
        <button data-action="taskDraft" data-key="points" data-dir="1" ${m.points >= POINT_STEPS.at(-1) ? 'disabled' : ''} aria-label="mehr Punkte">${ms('add')}</button>
      </span></div>
      <button class="pill primary big" data-action="saveTask">${t ? 'Speichern' : 'Hinzufügen'}</button>
      ${resettable ? '<button class="pill ghost" data-action="resetTask">Auf Standard zurücksetzen</button>' : ''}
      ${t ? `<button class="pill ghost" data-action="toggleHideTask">${t.hidden ? 'Wieder einblenden' : 'Ausblenden'}</button>` : ''}
      <button class="pill ghost" data-action="closeModal">Abbrechen</button>`;
  }
  return `<div class="backdrop" data-action="closeModal"></div><div class="modal" role="dialog" aria-modal="true">${body}</div>`;
}

function toastHtml() {
  const t = ui.toast;
  if (!t) return '';
  return `<div class="toast${ui.view === 'home' ? ' high' : ''}" role="status"><span class="t"><b>${esc(t.text)}</b>${t.sub ? `<span>${esc(t.sub)}</span>` : ''}</span>
    ${t.undo ? '<button data-action="undo">Rückgängig</button>' : ''}</div>`;
}

// ---------- Einrichtung ----------

function renderSetup() {
  const joinCode = joinParam();
  $app.innerHTML = `<main class="setup">
    <div class="logo">${ms('cleaning_services')}</div>
    <h1>Putzplan</h1>
    <p>Euer gemeinsamer Putzplan mit Punkten, Leveln und Überraschungen.</p>
    ${ui.error ? `<p class="err">${esc(ui.error)}</p>` : ''}
    ${CLOUD ? `<section class="card">
      <h3>Haushalt beitreten</h3>
      <p>Dein Partner hat den Haushalt schon angelegt? Link öffnen oder Code einfügen.</p>
      <input id="join-code" class="field" value="${esc(joinCode)}" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" autocapitalize="characters" autocomplete="off" spellcheck="false">
      <button class="pill big ${joinCode ? 'primary' : ''}" data-action="join">Beitreten</button>
      <p>Tipp: Öffnet die App vom Home-Bildschirm den Link nicht, den Code hier einfügen.</p>
    </section>` : ''}
    <section class="card">
      <h3>Neuen Haushalt anlegen</h3>
      <input id="n1" class="field" placeholder="Dein Name" maxlength="24" autocomplete="given-name">
      <input id="n2" class="field" placeholder="Name deines Partners" maxlength="24">
      <button class="pill big ${joinCode ? '' : 'primary'}" data-action="create">Los geht’s</button>
    </section>
    ${CLOUD || DEMO ? '' : '<p class="fine">Hinweis: Noch kein Supabase eingerichtet. Alles wird nur auf diesem Gerät gespeichert.</p>'}
  </main>`;
}

function renderWhoAmI(settings) {
  $app.innerHTML = `<main class="setup">
    <div class="logo">${ms('waving_hand')}</div><h1>Wer bist du?</h1>
    <p>Nur für dieses Handy. Lässt sich später in den Einstellungen ändern.</p>
    <div class="who-list">${settings.players.map(p => `<button class="who-btn" data-action="setMe" data-id="${p.id}">${avatar(p, 'lg')}${esc(p.name)}</button>`).join('')}</div>
  </main>`;
}

function createHousehold(name1, name2) {
  openHousehold(newHouseholdCode());
  store.put('settings', 'settings', {
    players: [{ id: 'a', name: name1, color: 0 }, { id: 'b', name: name2, color: 1 }],
    startedAt: Date.now(),
    pointOverrides: {},
  });
  for (const [level, text] of Object.entries(DEFAULT_REWARDS)) {
    store.put('reward', `reward-L${level}`, { level: Number(level), text });
  }
  device.me = 'a';
  saveDevice();
  cleanUrl();
}

// Beispieldaten für den Demo-Modus, damit alle Ansichten etwas zeigen.
function seedDemo() {
  createHousehold('Alex', 'Sam');
  const now = Date.now();
  const startedAt = now - 12 * DAY;
  store.put('settings', 'settings', { ...store.get('settings'), startedAt });
  const done = [
    ['b-wc-1', 'a', 2], ['b-wc-2', 'b', 3], ['b-dusche-1', 'b', 4], ['k-herd', 'a', 1], ['k-spuele', 'b', 1],
    ['k-arbeitsflaechen', 'a', 5], ['k-restmuell', 'b', 2], ['k-plastik', 'a', 6], ['w-teppich', 'a', 3],
    ['w-staub-wohn', 'b', 4], ['w-aufraeumen-wohn', 'a', 1], ['b-waesche-heiss', 'b', 2], ['a-waesche', 'a', 1],
    ['p-giessen', 'b', 3], ['r-behaelter', 'a', 6], ['k-backofen', 'b', 8], ['w-fensterbretter', 'a', 9],
    ['b-boden-1', 'b', 10], ['k-mikrowelle', 'a', 9], ['a-abwasch', 'a', 0], ['a-abwasch', 'b', 1], ['a-spuelmaschine', 'b', 0],
  ];
  for (const [taskId, player, daysAgo] of done) {
    const task = taskById(taskId);
    store.put('completion', uid('c'), { taskId, player, at: now - daysAgo * DAY - 3600_000, points: task.points, rescue: false, daily: taskId.startsWith('a-') });
  }
  for (const text of ['Ich koche dein Lieblingsessen', 'Frühstück ans Bett', 'Ein Abend ohne Abwasch']) {
    store.put('voucher', uid('v'), { from: 'b', to: 'a', text, createdAt: now - 5 * DAY });
  }
  store.put('voucher', uid('v'), { from: 'a', to: 'b', text: 'Kinoabend, du suchst den Film aus', createdAt: now - 4 * DAY });
}

function openHousehold(code) {
  device.household = code;
  saveDevice();
  unsubscribe?.();
  store = createStore(code, { cloud: CLOUD });
  unsubscribe = store.subscribe(scheduleRender);
}

async function joinHousehold(code) {
  const prev = { ...device };
  ui.error = null;
  device = { household: code };
  openHousehold(code);
  ui.view = 'home';
  render();
  await store.sync();
  if (store.get('settings')) {
    cleanUrl();
  } else {
    const error = store.status.startsWith('error') ? `Verbindung fehlgeschlagen: ${store.status}` : 'Zu diesem Code gibt es keinen Haushalt.';
    device = prev;
    saveDevice();
    if (prev.household) { openHousehold(prev.household); showToast(error); } else { store = null; ui.error = error; }
  }
  render();
}

// Merkt sich im Haushalt, dass diese Person die App auf einem Gerät nutzt („verbunden“ in den Einstellungen).
function markPresence() {
  if (store && device.me && !store.get(`presence-${device.me}`)) {
    store.put('presence', `presence-${device.me}`, { seenAt: Date.now() });
  }
}

// ---------- Rendern ----------

function render() {
  renderDeferred = false;
  if (!store) return renderSetup();
  const settings = store.get('settings');
  if (!settings) {
    $app.innerHTML = `<main class="setup"><div class="logo">${ms('sync')}</div><h1>Verbinde …</h1><p>${syncLabel()}</p></main>`;
    return;
  }
  if (!device.me || !settings.players.some(p => p.id === device.me)) return renderWhoAmI(settings);
  markPresence();
  const c = ctx();
  const views = { home: viewHome, rewards: viewRewards, stats: viewStats, settings: viewSettings };
  // Die Alltag-Reihe scrollt seitlich: Position über das Neuzeichnen retten.
  const dailyScroll = $app.querySelector('.daily-row')?.scrollLeft ?? 0;
  $app.innerHTML = `<main class="view ${ui.view}">${views[ui.view](c)}</main>${dockHtml(c)}${sheetHtml(c)}${modalHtml(c)}${toastHtml()}`;
  const row = $app.querySelector('.daily-row');
  if (row) row.scrollLeft = dailyScroll;
}

// Während getippt wird oder eine Karte sich dreht, nicht neu zeichnen.
function scheduleRender() {
  if (Date.now() < holdUntil || document.activeElement?.matches?.('input, textarea')) { renderDeferred = true; return; }
  render();
}
function holdRender(msHold) {
  holdUntil = Date.now() + msHold;
  setTimeout(scheduleRender, msHold + 20);
}
// Verzögert, damit ein Tipp auf einen Treffer noch ankommt, bevor neu gezeichnet wird (iOS schließt erst die Tastatur).
document.addEventListener('focusout', () => setTimeout(() => { if (renderDeferred) scheduleRender(); }, 300));

// Eingaben, die nur einen Teil der Seite betreffen, damit das Feld den Fokus behält.
document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'search') {
    ui.search = el.value;
    const results = document.getElementById('search-results');
    results.hidden = !ui.search.trim();
    results.innerHTML = searchResults(ctx());
    document.querySelector('[data-action="clearSearch"]').hidden = !ui.search;
  } else if (el.id === 'task-name' && ui.modal?.type === 'task') {
    ui.modal.name = el.value;
  } else if (el.id === 'voucher-text') {
    document.querySelector('[data-action="addVoucher"]').disabled = !el.value.trim();
  } else if (el.id === 'join-code' && ui.view === 'settings') {
    document.querySelector('[data-action="joinOther"]').disabled = !normalizeCode(el.value);
  }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (e.target.id === 'voucher-text') actions.addVoucher();
  else if (e.target.id === 'reward-text') document.querySelector('[data-action="saveReward"]')?.click();
  else if (e.target.id === 'search') e.target.blur();
});

// ---------- Aktionen ----------

function celebrate() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#eaaa7f', '#7bc5ef', '#8ecc9a', '#b8c27a', '#c4adef', '#7ae2c0'];
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
function showToast(text, { sub = '', undo = null, ms: duration = 3800 } = {}) {
  ui.toast = { text, sub, undo };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { ui.toast = null; scheduleRender(); }, duration);
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
  const p = before.name(data.player);
  const isMe = data.player === before.me.id;
  ui.sheet = null;
  showToast(`+${data.points} Punkte · ${taskById(data.taskId).name}`, {
    sub: data.rescue ? `Rettung: +${xpOf(data)} für ${isMe ? 'dein' : `${p.name}s`} Level` : isMe ? '' : `für ${p.name}`,
    undo: () => store.update(id, { deleted: true }),
  });
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

function updateSettings(patch) {
  const settings = store.get('settings');
  store.put('settings', 'settings', { ...settings, ...(typeof patch === 'function' ? patch(settings) : patch) });
}
function updatePlayer(id, patch) {
  updateSettings(s => ({ players: s.players.map(p => (p.id === id ? { ...p, ...patch } : p)) }));
}

const stepPoint = (cur, dir) => (dir === '1' ? POINT_STEPS.find(s => s > cur) : POINT_STEPS.findLast(s => s < cur));
const isAdjusted = (t, settings) => Boolean(t.standard) &&
  (t.name !== t.standard.name || t.interval !== t.standard.interval || taskPoints(t, settings) !== t.standard.points);

/** Änderungen an einer Aufgabe speichern. Eingebaute: nur Abweichungen, Punkte in pointOverrides. */
function saveTask(task, { name = task.name, interval = task.interval, points }) {
  const item = store.get(task.id);
  if (task.custom) return store.put('task', task.id, { ...item, name, interval, points: points ?? task.points });
  const std = task.standard;
  const diff = { ...item, name, interval };
  if (name === std.name) delete diff.name;
  if (interval === std.interval) delete diff.interval;
  if (item || Object.keys(diff).length) store.put('task', task.id, diff);
  if (points !== undefined) {
    const overrides = { ...store.get('settings').pointOverrides };
    if (points === std.points) delete overrides[task.id]; else overrides[task.id] = points;
    updateSettings({ pointOverrides: overrides });
  }
}

const actions = {
  tab: d => {
    ui.view = d.view;
    if (d.tab) ui.rewardsTab = d.tab;
    ui.sheet = null; ui.modal = null; ui.editRewards = false;
    render();
    scrollTo(0, 0);
  },
  clearSearch: () => { ui.search = ''; render(); document.getElementById('search')?.focus(); },
  openArea: d => {
    ui.openArea = ui.openArea === d.val && !d.scroll ? null : d.val;
    render();
    if (d.scroll) document.getElementById(`area-${d.val}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  open: d => { ui.sheet = d.id; render(); },
  closeSheet: () => { ui.sheet = null; render(); },
  closeModal: () => { ui.modal = null; render(); },
  complete: d => complete(d.id, d.player),
  quick: d => complete(d.id, device.me),
  daily: d => completeDaily(d.id),
  undo: () => { const fn = ui.toast?.undo; ui.toast = null; fn?.(); render(); },
  deleteCompletion: d => {
    const x = store.get(d.id);
    store.update(d.id, { deleted: true });
    showToast(`„${taskById(x?.taskId)?.name ?? 'Eintrag'}“ gelöscht`, { undo: () => store.update(d.id, { deleted: false }), ms: 3500 });
    render();
  },

  rewardsTab: d => { ui.rewardsTab = d.val; ui.editRewards = false; render(); },
  flip: (d, el) => {
    const c = ctx();
    if (ui.flipped || !picksAvailable(c.state, c.me.id, c.vouchers)) return;
    ui.flipped = d.id;
    // Erst die Animation im bestehenden DOM, dann speichern; neu gezeichnet wird, wenn die Karte liegt.
    el.classList.add('sel');
    el.style.zIndex = 5;
    el.parentElement.querySelectorAll('.pcard').forEach(x => { if (x !== el) x.classList.add('dim'); x.disabled = true; });
    holdRender(900);
    store.update(d.id, { pickedAt: Date.now(), pickLevel: c.state.personal[c.me.id].level });
    setTimeout(celebrate, 650);
    navigator.vibrate?.(20);
  },
  keepCard: () => {
    const v = store.get(ui.flipped);
    ui.flipped = null;
    ui.deck = null;
    showToast(`„${v?.text ?? ''}“ liegt jetzt bei deinen Karten`);
    render();
  },
  redeemVoucher: d => {
    store.update(d.id, { redeemedAt: Date.now() });
    showToast('Eingelöst. Viel Spaß!', { undo: () => store.update(d.id, { redeemedAt: null }) });
    render();
  },
  addVoucher: () => {
    const el = document.getElementById('voucher-text');
    const text = el?.value.trim();
    if (!text) return el?.focus();
    const c = ctx();
    el.value = '';
    el.blur();
    store.put('voucher', uid('v'), { from: c.me.id, to: c.partner.id, text, createdAt: Date.now() });
    showToast('Liegt verdeckt im Topf');
    render();
  },
  deleteVoucher: d => {
    store.update(d.id, { deleted: true });
    showToast('Aus dem Topf genommen', { undo: () => store.update(d.id, { deleted: false }) });
    render();
  },

  toggleEditRewards: () => { ui.editRewards = !ui.editRewards; render(); },
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

  statsView: d => { ui.statsView = d.val; render(); },
  statsRange: d => { ui.statsRange = d.val; render(); },
  histWho: d => { ui.histWho = d.val; render(); },

  toggleVacation: () => {
    const settings = store.get('settings');
    if (activePause(settings)) {
      updateSettings(s => ({ pauses: (s.pauses ?? []).map(p => (p.to ? p : { ...p, to: Date.now() })) }));
      showToast('Willkommen zurück! Die Uhr läuft wieder.');
    } else {
      if (!confirm('Urlaubsmodus starten? Die Putz-Uhr bleibt für euch beide stehen, bis ihr ihn beendet.')) return;
      updateSettings(s => ({ pauses: [...(s.pauses ?? []), { from: Date.now(), to: null }] }));
      showToast('Urlaubsmodus an. Erholt euch!');
    }
    render();
  },
  pointsArea: d => { ui.pointsArea = ui.pointsArea === d.val ? null : d.val; render(); },
  stepPoints: d => {
    const task = taskById(d.id);
    const next = stepPoint(taskPoints(task, store.get('settings')), d.dir);
    if (next !== undefined) saveTask(task, { points: next });
  },
  newTask: d => {
    ui.modal = { type: 'task', id: null, area: d.area, name: '', interval: 'W', points: 10 };
    render();
    document.getElementById('task-name')?.focus();
  },
  editTask: d => {
    const t = taskById(d.id);
    ui.modal = { type: 'task', id: t.id, area: t.area, name: t.name, interval: t.interval, points: taskPoints(t, store.get('settings')) };
    render();
  },
  taskDraft: d => {
    const m = ui.modal;
    if (d.key === 'interval') m.interval = d.val;
    else m.points = stepPoint(m.points, d.dir) ?? m.points;
    render();
  },
  resetTask: () => {
    const std = taskById(ui.modal.id).standard;
    Object.assign(ui.modal, { name: std.name, interval: std.interval, points: std.points });
    render();
  },
  saveTask: () => {
    const m = ui.modal;
    const name = m.name.trim();
    if (!name) return document.getElementById('task-name')?.focus();
    ui.modal = null;
    if (m.id) {
      saveTask(taskById(m.id), { name, interval: m.interval, points: m.points });
      showToast('Gespeichert');
    } else {
      const id = uid('u');
      store.put('task', id, { custom: true, area: m.area, name, interval: m.interval, points: m.points, since: Date.now() });
      showToast(`„${name}“ hinzugefügt`, { undo: () => store.update(id, { deleted: true }) });
    }
    render();
  },
  toggleHideTask: () => {
    const t = taskById(ui.modal.id);
    ui.modal = null;
    const prev = store.get(t.id);
    // Wieder eingeblendet startet die Uhr neu, damit die ausgeblendete Zeit keine Abzüge kostet.
    store.put('task', t.id, { ...prev, hidden: !t.hidden, ...(t.hidden ? { since: Date.now() } : {}) });
    showToast(t.hidden ? `„${t.name}“ ist wieder im Plan` : `„${t.name}“ ausgeblendet`,
      { undo: () => (prev ? store.put('task', t.id, prev) : store.update(t.id, { deleted: true })) });
    render();
  },
  setMe: d => { device.me = d.id; saveDevice(); render(); },
  setColor: d => updatePlayer(d.id, { color: Number(d.val) }),
  share: async () => {
    const url = inviteLink();
    if (navigator.share) {
      try { await navigator.share({ title: 'Putzplan', text: 'Tritt unserem Putzplan bei:', url }); } catch { /* abgebrochen */ }
    } else {
      await navigator.clipboard?.writeText(url);
      showToast('Link kopiert');
      render();
    }
  },
  copyCode: async () => {
    await navigator.clipboard?.writeText(device.household);
    ui.copied = true;
    render();
    setTimeout(() => { ui.copied = false; scheduleRender(); }, 2000);
  },
  toggleJoin: () => { ui.joinOpen = !ui.joinOpen; render(); if (ui.joinOpen) document.getElementById('join-code')?.focus(); },
  joinOther: () => {
    const code = normalizeCode(document.getElementById('join-code')?.value);
    if (!code) return;
    if (code === device.household) { showToast('Das ist schon euer Haushalt'); return render(); }
    if (!confirm('Diesem Haushalt beitreten? Du verlässt dann diesen Haushalt auf diesem Gerät.')) return;
    ui.joinOpen = false;
    joinHousehold(code);
  },
  leave: () => {
    if (!confirm('Auf diesem Gerät abmelden? Die Daten bleiben im Haushalt erhalten. Ohne Code kommst du nicht wieder rein.')) return;
    device = {};
    saveDevice();
    unsubscribe?.();
    store = null;
    ui.view = 'home';
    render();
  },

  create: () => {
    const v = id => document.getElementById(id).value.trim();
    if (!v('n1') || !v('n2')) { ui.error = 'Bitte beide Namen eintragen.'; return renderSetup(); }
    ui.error = null;
    createHousehold(v('n1'), v('n2'));
    render();
  },
  join: () => {
    const code = normalizeCode(document.getElementById('join-code').value);
    if (!code) { ui.error = 'Der Code hat 20 Zeichen, z. B. ABCD-EFGH-JKMN-PQRS-TUVW.'; return renderSetup(); }
    joinHousehold(code);
  },
};

const changes = {
  playerName: (el, d) => updatePlayer(d.id, { name: el.value.trim() || '?' }),
};

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

if (DEMO && !device.household) seedDemo();
else if (device.household) openHousehold(device.household);
if (DEMO) {
  const q = new URLSearchParams(location.search);
  ui.view = q.get('view') ?? ui.view;
  ui.sheet = q.get('sheet');
  ui.rewardsTab = q.get('tab') ?? ui.rewardsTab;
}
render();

// Einladungslink, während schon ein Haushalt offen ist: nachfragen und wechseln.
const linkCode = normalizeCode(joinParam());
if (store && linkCode) {
  if (linkCode !== device.household && !DEMO &&
      confirm('Du hast einen Einladungslink geöffnet. Diesem Haushalt beitreten? Du verlässt dann deinen bisherigen Haushalt auf diesem Gerät.')) {
    joinHousehold(linkCode);
  } else cleanUrl();
}

if (CLOUD) {
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
