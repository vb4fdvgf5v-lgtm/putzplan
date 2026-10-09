// Spielregeln. Reine Funktionen ohne DOM, damit sie sich mit Node testen lassen.
import { INTERVALS } from './tasks.js';

export const DAY = 86_400_000;

export const RULES = {
  penaltyRate: 0.1,     // pro überfälligem Tag: 10 % der Aufgabenpunkte Abzug fürs Team
  penaltyCapDays: 10,   // nach 10 Tagen ist der Abzug gedeckelt (= 100 % der Punkte)
  rescueBonus: 0.5,     // +50 % aufs persönliche Level, wenn man eine überfällige Aufgabe erledigt
  earlyFraction: 0.5,   // Punkte erst wieder, wenn die Hälfte des Intervalls um ist
};

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

/**
 * Wertet den kompletten Verlauf aus.
 * Zu Beginn gilt jede Aufgabe als halb frisch, damit nicht alles sofort überfällig ist.
 */
export function compute({ tasks, completions, settings, players, now }) {
  const start = settings.startedAt;
  const done = completions.filter(c => !c.deleted).sort((a, b) => a.at - b.at);
  const byTask = new Map(tasks.map(t => [t.id, []]));
  for (const c of done) byTask.get(c.taskId)?.push(c);

  const ticks = [];
  const status = {};
  let freshWeighted = 0, weightSum = 0;

  for (const task of tasks) {
    const p = taskPoints(task, settings), iv = intervalMs(task);
    const list = byTask.get(task.id);
    const accrue = (due, until) => {
      const days = Math.min(RULES.penaltyCapDays, Math.floor((until - due) / DAY));
      for (let d = 1; d <= days; d++) ticks.push({ at: due + d * DAY, amount: p * RULES.penaltyRate });
    };
    let last = start - iv / 2;
    for (const c of list) { accrue(last + iv, c.at); last = Math.max(last, c.at); }
    accrue(last + iv, now);

    const due = last + iv;
    const overdueDays = now > due ? Math.floor((now - due) / DAY) : 0;
    const freshness = Math.max(0, Math.min(1, 1 - (now - last) / iv));
    const lastC = list[list.length - 1];
    status[task.id] = {
      points: p, last, due, freshness, overdueDays,
      overdue: now > due,
      penaltyPerDay: now > due && overdueDays < RULES.penaltyCapDays ? p * RULES.penaltyRate : 0,
      earlyUntil: lastC ? last + iv * RULES.earlyFraction : 0,
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
