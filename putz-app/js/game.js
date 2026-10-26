// Spielregeln. Reine Funktionen ohne DOM, damit sie sich mit Node testen lassen.
import { INTERVALS } from './tasks.js';

export const DAY = 86_400_000;

export const RULES = {
  penaltyRate: 0.1,     // pro überfälligem Tag: 10 % der Aufgabenpunkte Abzug fürs Team
  penaltyCapDays: 10,   // nach 10 Tagen ist der Abzug gedeckelt (= 100 % der Punkte)
  rescueBonus: 0.5,     // +50 % aufs persönliche Level, wenn man eine überfällige Aufgabe erledigt
  freshFraction: 0.5,   // bis zur Hälfte des Intervalls gilt eine Aufgabe als frisch (nur Anzeige und Sortierung)
  graceDays: 14,        // sanfter Start: so lange keine Abzüge
};

// Sanfter Start: erste Fälligkeit je Intervall verteilt über diese Tage nach dem Start (0 = erster Tag).
const STAGGER = { W: [1, 6], '2W': [3, 13], M: [7, 29], Q: [14, 89] };

/**
 * Erste Fälligkeit je Aufgabe in Tagen nach dem Start (settings.firstDue). Reihum verteilt, damit
 * an einem Tag nicht nur ein Bereich dran ist. Wird einmal beim Anlegen berechnet und gespeichert.
 */
export function staggerFirstDue(tasks) {
  const out = {};
  for (const [iv, [from, to]] of Object.entries(STAGGER)) {
    const list = tasks.filter(t => t.interval === iv);
    const span = to - from + 1;
    list.forEach((t, i) => {
      out[t.id] = list.length <= span ? from + Math.floor(i * span / list.length) : from + (i % span);
    });
  }
  return out;
}

/** Wie viele Aufgaben an den ersten `days` Tagen erstmals fällig werden (für die Grafik in der Einrichtung). */
export function firstDueByDay(tasks, firstDue, days = 14) {
  const out = Array(days).fill(0);
  for (const t of tasks) {
    const d = firstDue ? firstDue[t.id] : Math.floor(INTERVALS[t.interval].days / 2);
    if (d !== undefined && d < days) out[d]++;
  }
  return out;
}

/** Eingewöhnung: läuft, solange settings.graceUntil in der Zukunft liegt. */
export const graceLeft = (settings, now) =>
  settings.graceUntil > now ? Math.ceil((settings.graceUntil - now) / DAY) : 0;

export const PERSONAL = {
  thresholds: [0, 150, 400, 800, 1400, 2200, 3200, 4500, 6200, 8500],
  step: 2500,
  titles: ['Putzlehrling', 'Staubjäger', 'Schwammschwinger', 'Fliesenflüsterer', 'Kalkbezwinger',
           'Glanzbringer', 'Ordnungsmagier', 'Hygiene-Held', 'Haushaltslegende', 'Glanzmeister'],
};

export const TEAM = {
  thresholds: [0, 1000, 2500, 4500, 7000, 10000, 14000, 19000, 25000, 32000],
  step: 8000,
};

export function threshold(cfg, level) {
  const t = cfg.thresholds;
  return level <= t.length ? t[level - 1] : t[t.length - 1] + (level - t.length) * cfg.step;
}

export function levelInfo(cfg, xp) {
  let level = 1;
  while (xp >= threshold(cfg, level + 1)) level++;
  const floor = threshold(cfg, level), next = threshold(cfg, level + 1);
  return { level, floor, next, progress: Math.max(0, Math.min(1, (xp - floor) / (next - floor))) };
}

export function personalTitle(level) {
  const t = PERSONAL.titles;
  return level <= t.length ? t[level - 1] : `${t[t.length - 1]} ${'★'.repeat(Math.min(level - t.length, 5))}`;
}

export const taskPoints = (task, settings) => settings?.pointOverrides?.[task.id] ?? task.points;

/**
 * Katalog mit den Änderungen aus der App. Items (kind "task", id = Aufgaben-ID):
 * zu eingebauten Aufgaben nur Abweichungen (name, interval, hidden), eigene Aufgaben komplett mit custom: true.
 * `since`: ab da läuft die Uhr der Aufgabe (beim Anlegen und Wiedereinblenden gesetzt).
 * Punkte eingebauter Aufgaben bleiben in settings.pointOverrides.
 */
export function buildCatalog(base, items = []) {
  const byId = new Map(items.map(i => [i.id, i]));
  const pick = ({ name, interval, hidden, since } = {}) =>
    Object.fromEntries(Object.entries({ name, interval, hidden, since }).filter(([, v]) => v !== undefined));
  const builtIn = base.map(t => ({ ...t, ...pick(byId.get(t.id)), standard: t }));
  const custom = items.filter(i => i.custom && !base.some(t => t.id === i.id))
    .map(({ id, area, interval, points, name, hidden, since }) => ({ id, area, interval, points, name, hidden, since, custom: true }))
    .sort((a, b) => (a.since ?? 0) - (b.since ?? 0));
  const all = [...builtIn, ...custom].filter(t => INTERVALS[t.interval]);
  return { all, active: all.filter(t => !t.hidden) };
}
const intervalMs = task => INTERVALS[task.interval].days * DAY;

export function weekStart(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export function monthStart(now) {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export const xpOf = c => Math.round(c.points * (c.rescue ? 1 + RULES.rescueBonus : 1));

/** Urlaubsmodus: eine laufende Pause hat `to: null`. */
export const activePause = settings => (settings.pauses ?? []).find(p => !p.to) ?? null;

/**
 * Putz-Uhr, die während Urlaubspausen stillsteht.
 * toEff: echte Zeit -> Putz-Zeit (Pausen herausgerechnet). toReal: umgekehrt;
 * für die Zukunft während einer laufenden Pause wird angenommen, dass sie jetzt endet.
 */
export function pauseClock(pauses = [], now) {
  const spans = pauses
    .map(p => ({ from: p.from, to: Math.min(p.to ?? now, now) }))
    .filter(p => p.to > p.from)
    .sort((a, b) => a.from - b.from);
  const toEff = t => t - spans.reduce((s, p) => s + Math.max(0, Math.min(t, p.to) - p.from), 0);
  const toReal = e => {
    let offset = 0;
    for (const p of spans) {
      if (e <= p.from - offset) return e + offset;
      offset += p.to - p.from;
    }
    return e + offset;
  };
  return { toEff, toReal };
}

/**
 * Wertet den kompletten Verlauf aus.
 * Zu Beginn gilt jede Aufgabe als halb frisch, damit nicht alles sofort überfällig ist.
 * Das gilt auch für später angelegte oder wieder eingeblendete Aufgaben (task.since).
 * Sanfter Start: settings.firstDue legt die erste Fälligkeit fest, bis settings.graceUntil gibt es keine Abzüge
 * (die Abzugstage zählen erst ab dann).
 */
export function compute({ tasks, completions, settings, players, now }) {
  const start = settings.startedAt;
  const { toEff, toReal } = pauseClock(settings.pauses, now);
  const paused = Boolean(activePause(settings));
  const nowE = toEff(now);
  const graceE = settings.graceUntil ? toEff(settings.graceUntil) : -Infinity;
  const done = completions.filter(c => !c.deleted).sort((a, b) => a.at - b.at);
  const byTask = new Map(tasks.map(t => [t.id, []]));
  for (const c of done) byTask.get(c.taskId)?.push(c);

  const ticks = [];
  const status = {};
  let freshWeighted = 0, weightSum = 0;

  for (const task of tasks) {
    const p = taskPoints(task, settings), iv = intervalMs(task);
    const list = byTask.get(task.id);
    // Alles hier in Putz-Zeit, damit Urlaubspausen weder Frische noch Abzüge kosten.
    const accrue = (due, until) => {
      const from = Math.max(due, graceE);
      const days = Math.min(RULES.penaltyCapDays, Math.floor((until - from) / DAY));
      for (let d = 1; d <= days; d++) ticks.push({ at: toReal(from + d * DAY), amount: p * RULES.penaltyRate });
    };
    const begin = Math.max(start, task.since ?? 0);
    const firstDue = begin === start ? settings.firstDue?.[task.id] : undefined;
    let last = firstDue === undefined ? toEff(begin) - iv / 2 : toEff(start + firstDue * DAY) - iv;
    for (const c of list) { const at = toEff(c.at); accrue(last + iv, at); last = Math.max(last, at); }
    accrue(last + iv, nowE);

    const due = last + iv;
    const overdueDays = nowE > due ? Math.floor((nowE - due) / DAY) : 0;
    const penaltyDays = Math.floor((nowE - Math.max(due, graceE)) / DAY);
    // Mit fester erster Fälligkeit startet die Frische wie sonst bei der Hälfte und sinkt bis dahin auf 0.
    const fresh = firstDue !== undefined && !list.length
      ? 0.5 * (due - nowE) / (due - toEff(start))
      : 1 - (nowE - last) / iv;
    const freshness = Math.max(0, Math.min(1, fresh));
    const lastC = list[list.length - 1];
    status[task.id] = {
      points: p, freshness, overdueDays,
      last: lastC ? lastC.at : begin,
      due: toReal(due),
      overdue: nowE > due,
      penaltyPerDay: !paused && nowE > due && nowE >= graceE && penaltyDays < RULES.penaltyCapDays ? p * RULES.penaltyRate : 0,
      freshUntil: lastC ? toReal(last + iv * RULES.freshFraction) : 0,
      lastBy: lastC?.player ?? null,
      count: list.length,
    };
    freshWeighted += p * freshness;
    weightSum += p;
  }

  // Teamscore als Zeitreihe: Punkte rein, Abzüge raus. Erreichte Teamlevel bleiben erreicht.
  const events = [
    ...done.map(c => ({ at: c.at, amount: c.points })),
    ...ticks.map(t => ({ at: t.at, amount: -t.amount })),
  ].sort((a, b) => a.at - b.at || b.amount - a.amount);
  let score = 0;
  const teamReachedAt = [start]; // Index i = Zeitpunkt, an dem Level i+1 erreicht wurde
  for (const e of events) {
    score += e.amount;
    while (score >= threshold(TEAM, teamReachedAt.length + 1)) teamReachedAt.push(e.at);
  }

  const sumSince = (from, fn = c => c.points) => {
    const out = Object.fromEntries(players.map(p => [p.id, 0]));
    for (const c of done) if (c.at >= from && c.player in out) out[c.player] += fn(c);
    return out;
  };

  const xp = sumSince(-Infinity, xpOf);
  const teamScore = Math.round(score);
  const teamLevel = teamReachedAt.length;
  const teamFloor = threshold(TEAM, teamLevel), teamNext = threshold(TEAM, teamLevel + 1);

  return {
    status,
    done,
    paused,
    grace: nowE < graceE,
    cleanliness: weightSum ? Math.round((freshWeighted / weightSum) * 100) : 100,
    penaltyTotal: Math.round(ticks.reduce((s, t) => s + t.amount, 0)),
    penaltyPerDayNow: Object.values(status).reduce((s, x) => s + x.penaltyPerDay, 0),
    teamScore,
    teamLevel,
    teamInfo: { level: teamLevel, floor: teamFloor, next: teamNext,
                progress: Math.max(0, Math.min(1, (teamScore - teamFloor) / (teamNext - teamFloor))) },
    teamReachedAt,
    xp,
    personal: Object.fromEntries(players.map(p => [p.id, levelInfo(PERSONAL, xp[p.id])])),
    week: sumSince(weekStart(now)),
    month: sumSince(monthStart(now)),
    total: sumSince(-Infinity),
    sumSince,
  };
}

/** Je Bereich: Frische (0–1, gewichtet mit den Aufgabenpunkten), Gewicht = Punktsumme, Zahl der überfälligen Aufgaben. */
export function areaSummary(tasks, status) {
  const out = {};
  for (const t of tasks) {
    const s = status[t.id];
    const a = out[t.area] ??= { weight: 0, freshness: 0, overdue: 0 };
    a.weight += s.points;
    a.freshness += s.points * s.freshness;
    if (s.overdue) a.overdue++;
  }
  for (const a of Object.values(out)) a.freshness = a.weight ? a.freshness / a.weight : 1;
  return out;
}

/** Die überfälligen Aufgaben, deren Rettung am meisten bringt: Punkte × überfällige Tage (gedeckelt). */
export function focusTasks(tasks, status, n = 3) {
  const score = t => status[t.id].points * Math.min(status[t.id].overdueDays, RULES.penaltyCapDays);
  return tasks.filter(t => status[t.id].overdue)
    .sort((a, b) => score(b) - score(a) || status[b.id].points - status[a.id].points)
    .slice(0, n);
}

/** Punkte je Bereich und Person seit `from`. areaOf: Aufgaben-ID -> Bereich. */
export function pointsByArea(done, from, areaOf, players) {
  const out = {};
  for (const c of done) {
    const area = areaOf(c.taskId);
    if (c.at < from || !area || !players.some(p => p.id === c.player)) continue;
    out[area] ??= Object.fromEntries(players.map(p => [p.id, 0]));
    out[area][c.player] += c.points;
  }
  return out;
}

/** Fairnessregel: Eine Teambelohnung lässt sich nur einlösen, wenn beide seit dem vorigen Teamlevel ≥ 1/3 beigetragen haben. */
export function rewardFairness(state, level, players) {
  const from = state.teamReachedAt[level - 2] ?? Infinity;
  const pts = state.sumSince(from);
  const total = Object.values(pts).reduce((a, b) => a + b, 0);
  const missing = players
    .map(p => ({ player: p.id, need: Math.max(0, Math.ceil((total - 3 * pts[p.id]) / 2)) }))
    .filter(m => m.need > 0);
  return { pts, total, ok: missing.length === 0, missing };
}

/** Neu freigespielte Überraschungen: eine pro persönlichem Levelaufstieg. */
export function picksAvailable(state, playerId, vouchers) {
  const used = vouchers.filter(v => v.to === playerId && v.pickedAt && !v.deleted).length;
  return Math.max(0, state.personal[playerId].level - 1 - used);
}
