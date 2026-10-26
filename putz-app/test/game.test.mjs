import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TASKS } from '../js/tasks.js';
import { compute, buildCatalog, DAY, rewardFairness, picksAvailable, levelInfo, PERSONAL, areaSummary, focusTasks, pointsByArea } from '../js/game.js';

const players = [{ id: 'a' }, { id: 'b' }];
const start = Date.UTC(2026, 9, 1);
const wc = TASKS.find(t => t.id === 'b-dusche-1') // 20 Punkte;
const run = (completions, now) => compute({ tasks: [wc], completions, settings: { startedAt: start }, players, now });

test('zu Beginn halb frisch, nicht überfällig', () => {
  const s = run([], start);
  assert.equal(s.status[wc.id].overdue, false);
  assert.equal(s.cleanliness, 50);
  assert.equal(s.teamScore, 0);
});

test('Abzug 10 % pro Tag, gedeckelt bei 10 Tagen', () => {
  // fällig nach 3,5 Tagen
  assert.equal(run([], start + 3.5 * DAY + 2 * DAY).penaltyTotal, 4);   // 2 Tage × 2
  assert.equal(run([], start + 3.5 * DAY + 30 * DAY).penaltyTotal, 20); // Deckel = Aufgabenpunkte
});

test('Erledigen bringt Punkte, Rettungsbonus nur persönlich', () => {
  const c = { taskId: wc.id, player: 'a', at: start + 6.5 * DAY, points: 20, rescue: true };
  const s = run([c], start + 6.5 * DAY);
  assert.equal(s.xp.a, 30);
  assert.equal(s.teamScore, 20 - 6); // 3 Tage überfällig à 2
  assert.equal(s.status[wc.id].overdue, false);
});

test('gelöschte Einträge zählen nicht', () => {
  const s = run([{ taskId: wc.id, player: 'a', at: start, points: 20, deleted: true }], start);
  assert.equal(s.xp.a, 0);
});

test('Fairnessregel', () => {
  const s = { teamReachedAt: [0, 10], sumSince: () => ({ a: 900, b: 100 }) };
  const f = rewardFairness(s, 2, players);
  assert.equal(f.ok, false);
  assert.deepEqual(f.missing, [{ player: 'b', need: 350 }]); // (1000-300)/2
  assert.equal(rewardFairness({ teamReachedAt: [0, 10], sumSince: () => ({ a: 600, b: 400 }) }, 2, players).ok, true);
});

test('Level und Überraschungen', () => {
  assert.equal(levelInfo(PERSONAL, 399).level, 2);
  assert.equal(levelInfo(PERSONAL, 9000).level, 10);
  assert.equal(levelInfo(PERSONAL, 11000).level, 11);
  const s = { personal: { a: { level: 3 } } };
  assert.equal(picksAvailable(s, 'a', [{ to: 'a', pickedAt: 1 }]), 1);
});

test('Urlaubsmodus: Uhr steht still, keine Abzüge während der Pause', () => {
  const runP = (pauses, now) => compute({ tasks: [wc], completions: [], settings: { startedAt: start, pauses }, players, now });
  // fällig nach 3,5 Tagen; 10 Tage Urlaub ab Tag 2, jetzt Tag 12
  const pauses = [{ from: start + 2 * DAY, to: start + 12 * DAY }];
  const s = runP(pauses, start + 12 * DAY);
  assert.equal(s.penaltyTotal, 0);
  assert.equal(s.status[wc.id].overdue, false);
  assert.equal(s.status[wc.id].due, start + 13.5 * DAY); // Fälligkeit um die Pause verschoben
  // laufende Pause: eingefroren, nichts kostet
  const open = runP([{ from: start + 2 * DAY, to: null }], start + 30 * DAY);
  assert.equal(open.paused, true);
  assert.equal(open.penaltyTotal, 0);
  assert.equal(open.cleanliness, run([], start + 2 * DAY).cleanliness);
  // nach der Pause läuft die Zeit weiter: 2 Tage überfällig
  assert.equal(runP(pauses, start + 15.5 * DAY).penaltyTotal, 2 * 2);
});

test('Urlaubsmodus: Abzüge vor der Pause bleiben', () => {
  const s = compute({ tasks: [wc], completions: [], players, now: start + 20 * DAY,
    settings: { startedAt: start, pauses: [{ from: start + 6.5 * DAY, to: null }] } });
  assert.equal(s.penaltyTotal, 3 * 2); // 3 volle Tage überfällig vor dem Urlaub
  assert.equal(s.status[wc.id].penaltyPerDay, 0);
});

test('Frische je Bereich ist nach Punkten gewichtet', () => {
  const tasks = [{ id: 'x', area: 'bad' }, { id: 'y', area: 'bad' }, { id: 'z', area: 'kueche' }];
  const status = {
    x: { points: 30, freshness: 1, overdue: false },
    y: { points: 10, freshness: 0, overdue: true },
    z: { points: 5, freshness: 0.5, overdue: false },
  };
  const s = areaSummary(tasks, status);
  assert.equal(s.bad.freshness, 0.75);
  assert.equal(s.bad.weight, 40);
  assert.equal(s.bad.overdue, 1);
  assert.equal(s.kueche.overdue, 0);
});

test('Fokus: höchster Abzug zuerst, nur überfällige, Tage gedeckelt', () => {
  const tasks = ['a', 'b', 'c', 'd', 'e'].map(id => ({ id }));
  const status = {
    a: { points: 10, overdueDays: 2, overdue: true },   // 20
    b: { points: 5, overdueDays: 30, overdue: true },   // 5 × 10 = 50
    c: { points: 50, overdueDays: 0, overdue: true },   // 0, aber mehr Punkte als d
    d: { points: 3, overdueDays: 0, overdue: true },
    e: { points: 60, overdueDays: 0, overdue: false },
  };
  assert.deepEqual(focusTasks(tasks, status).map(t => t.id), ['b', 'a', 'c']);
});

test('Punkte je Bereich und Person', () => {
  const done = [
    { taskId: 'x', player: 'a', at: 5, points: 10 },
    { taskId: 'x', player: 'b', at: 6, points: 10 },
    { taskId: 'z', player: 'a', at: 7, points: 3 },
    { taskId: 'x', player: 'a', at: 1, points: 99 }, // vor dem Zeitraum
  ];
  const areaOf = id => ({ x: 'bad', z: 'kueche' })[id];
  assert.deepEqual(pointsByArea(done, 2, areaOf, players), { bad: { a: 10, b: 10 }, kueche: { a: 3, b: 0 } });
});

test('vor der Fälligkeit erledigen: volle Punkte, Uhr startet neu', () => {
  const c = { taskId: wc.id, player: 'a', at: start + DAY, points: 20, rescue: false };
  const s = run([c, { ...c, at: start + 2 * DAY }], start + 2 * DAY);
  assert.equal(s.xp.a, 40);
  assert.equal(s.status[wc.id].due, start + 9 * DAY);
});

test('Katalog: Anpassungen, Ausblenden und eigene Aufgaben', () => {
  const cat = buildCatalog(TASKS, [
    { id: wc.id, name: 'Dusche', interval: 'M' },
    { id: 'k-herd', hidden: true },
    { id: 'u-1', custom: true, area: 'wohnen', interval: 'W', points: 10, name: 'Balkon fegen', since: start },
    { id: 'u-2', custom: true, area: 'wohnen', interval: 'X', points: 10, name: 'kaputt' },
  ]);
  const dusche = cat.all.find(t => t.id === wc.id);
  assert.equal(dusche.name, 'Dusche');
  assert.equal(dusche.interval, 'M');
  assert.equal(dusche.standard.name, wc.name);
  assert.equal(cat.active.some(t => t.id === 'k-herd'), false);
  assert.equal(cat.all.some(t => t.id === 'k-herd'), true);
  assert.equal(cat.active.find(t => t.id === 'u-1').name, 'Balkon fegen');
  assert.equal(cat.all.some(t => t.id === 'u-2'), false);
  assert.equal(cat.active.length, TASKS.length);
});

test('später angelegte Aufgabe startet halb frisch, ohne rückwirkende Abzüge', () => {
  const task = { id: 'u-1', area: 'wohnen', interval: 'W', points: 10, since: start + 60 * DAY };
  const s = compute({ tasks: [task], completions: [], settings: { startedAt: start }, players, now: start + 60 * DAY });
  assert.equal(s.status[task.id].overdue, false);
  assert.equal(s.penaltyTotal, 0);
  assert.equal(s.status[task.id].due, start + 63.5 * DAY);
});

test('Einrichtung: Plan aus Räumen und Ausstattung', async () => {
  const { planTasks, defaultSetup, dailyTasks } = await import('../js/tasks.js');
  const ids = setup => planTasks(setup).map(t => t.id);
  const base = defaultSetup();
  const plan = planTasks(base);
  assert.equal(new Set(plan.map(t => t.id)).size, plan.length, 'IDs eindeutig');
  // 4 Räume: Aufräumen + Staub je Raum, Fenster ohne Flur
  assert.equal(plan.filter(t => t.id.startsWith('w-raum')).length, 4 * 2 + 3);
  assert.equal(plan.some(t => t.name === 'Fenster putzen: Flur'), false);
  assert.equal(plan.find(t => t.id === 'w-technik').name, 'Arbeitszimmer: Technik entstauben');
  assert.equal(ids(base).includes('b-wc-2'), false);
  assert.equal(ids(base).includes('w-staub-wohn'), false);
  // 3 Bäder: Bad-2-Aufgaben auch als Bad 3
  const three = planTasks({ ...base, baths: 3 });
  assert.equal(three.find(t => t.id === 'b-wc-3').name, 'Bad 3: WC putzen');
  // ohne Roboter: Saugen und Wischen statt Roboter-Aufgaben
  const noRobo = ids({ ...base, features: { ...base.features, robo: false } });
  assert.equal(noRobo.some(id => id.startsWith('r-')), false);
  assert.ok(noRobo.includes('w-saugen') && noRobo.includes('w-wischen'));
  assert.equal(ids(base).includes('w-saugen'), false);
  // 2 Räume: kein Arbeitszimmer, keine Technik
  assert.equal(ids({ ...base, rooms: ['Wohnzimmer', 'Schlafzimmer'] }).includes('w-technik'), false);
  // umbenannter Flur bleibt ohne Fenster, IDs bleiben
  const renamed = planTasks({ ...base, rooms: ['Wohnzimmer', 'Schlafzimmer', 'Diele', 'Büro'] });
  assert.deepEqual(renamed.map(t => t.id), plan.map(t => t.id));
  assert.equal(renamed.find(t => t.id === 'w-raum3-staub').name, 'Staubwischen: Diele');
  // Alltag passend zur Ausstattung, ohne Einrichtung alle
  assert.equal(dailyTasks({ ...base, features: { ...base.features, waschma: false } }).some(d => d.id === 'a-waesche'), false);
  assert.equal(dailyTasks(undefined).length, 4);
});

test('sanfter Start: Wochenaufgaben verteilt über Tag 2 bis 7', async () => {
  const { staggerFirstDue, firstDueByDay } = await import('../js/game.js');
  const { planTasks, defaultSetup } = await import('../js/tasks.js');
  const plan = planTasks(defaultSetup());
  const firstDue = staggerFirstDue(plan);
  const weekly = plan.filter(t => t.interval === 'W');
  assert.ok(weekly.every(t => firstDue[t.id] >= 1 && firstDue[t.id] <= 6));
  const byDay = firstDueByDay(plan, firstDue);
  assert.ok(Math.max(...byDay) <= Math.ceil(weekly.length / 6) + 1);
  assert.equal(firstDueByDay(plan, null)[3], weekly.length); // ohne: alle an Tag 4
  // compute nutzt die erste Fälligkeit und startet halb frisch
  const task = { id: 'x', interval: 'W', points: 10 };
  const s = compute({ tasks: [task], completions: [], settings: { startedAt: start, firstDue: { x: 2 } }, players, now: start });
  assert.equal(s.status.x.due, start + 2 * DAY);
  assert.equal(s.cleanliness, 50);
  // später eingeblendet: normale Regel
  const later = compute({ tasks: [{ ...task, since: start + 5 * DAY }], completions: [], settings: { startedAt: start, firstDue: { x: 2 } }, players, now: start + 5 * DAY });
  assert.equal(later.status.x.due, start + 8.5 * DAY);
});

test('Eingewöhnung: keine Abzüge, danach zählen die Tage ab dem Ende', () => {
  const settings = { startedAt: start, graceUntil: start + 14 * DAY };
  const at = now => compute({ tasks: [wc], completions: [], settings, players, now });
  // fällig nach 3,5 Tagen, an Tag 13 überfällig, aber ohne Abzug
  const during = at(start + 13 * DAY);
  assert.equal(during.grace, true);
  assert.equal(during.status[wc.id].overdue, true);
  assert.equal(during.penaltyTotal, 0);
  assert.equal(during.status[wc.id].penaltyPerDay, 0);
  // 3 Tage nach der Eingewöhnung: 3 Abzugstage à 2 Punkte
  const after = at(start + 17 * DAY);
  assert.equal(after.grace, false);
  assert.equal(after.penaltyTotal, 3 * 2);
  assert.equal(after.status[wc.id].penaltyPerDay, 2);
});

test('bestehender Haushalt: ohne Einrichtung rechnet alles wie bisher', () => {
  const now = start + 40 * DAY;
  const completions = [{ taskId: 'k-herd', player: 'a', at: start + 3 * DAY, points: 5 }];
  const plain = compute({ tasks: TASKS, completions, settings: { startedAt: start }, players, now });
  const withEmpty = compute({ tasks: TASKS, completions, settings: { startedAt: start, firstDue: undefined, graceUntil: undefined }, players, now });
  assert.equal(plain.penaltyTotal, withEmpty.penaltyTotal);
  assert.equal(plain.status['b-dusche-1'].due, start + 3.5 * DAY);
  assert.equal(plain.grace, false);
});
