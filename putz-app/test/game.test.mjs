import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TASKS } from '../js/tasks.js';
import { compute, DAY, rewardFairness, picksAvailable, levelInfo, PERSONAL } from '../js/game.js';

const players = [{ id: 'a' }, { id: 'b' }];
const start = Date.UTC(2026, 9, 1);
const wc = TASKS.find(t => t.id === 'b-wc-1');
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
