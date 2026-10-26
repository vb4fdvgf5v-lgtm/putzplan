// Aufgabenkatalog. Punkte = Schwierigkeit (Aufwand + Ekelfaktor), nicht Zeit.
// Stufen: 3 Handgriff · 5 leicht · 10 normal · 15 lästig · 20 eklig/anstrengend · 30 groß · 50 Projekt

// icon = Name aus Material Symbols Rounded. Farben gleich hell und satt, nur der Farbton wechselt.
export const AREAS = {
  kueche:   { name: 'Küche',     color: '#eaaa7f', icon: 'skillet' },
  bad:      { name: 'Bäder',     color: '#7bc5ef', icon: 'bathtub' },
  wohnen:   { name: 'Wohnräume', color: '#8ecc9a', icon: 'weekend' },
  pflanzen: { name: 'Pflanzen',  color: '#b8c27a', icon: 'potted_plant' },
  robo:     { name: 'Roboter',   color: '#c4adef', icon: 'robot_2' },
};

// Alltag: fällt (fast) täglich an. Kein Intervall, keine Fälligkeit, keine Minuspunkte,
// nur ein Tipp auf der Startseite. Das Tageslimit verhindert Punkte-Sammeln durch Dauertippen.
// \u00AD = weiche Trennstelle für die schmalen Kacheln.
export const DAILY = [
  { id: 'a-abwasch', area: 'kueche', icon: 'soap', name: 'Abwaschen', points: 3, perDay: 2 },
  { id: 'a-arbeitsflaeche', area: 'kueche', icon: 'countertops', name: 'Arbeits\u00ADfläche abwischen', points: 2, perDay: 2 },
  { id: 'a-spuelmaschine', area: 'kueche', icon: 'dishwasher_gen', name: 'Geschirr\u00ADspüler ausräumen', points: 2, perDay: 2 },
  { id: 'a-waesche', area: 'bad', icon: 'local_laundry_service', name: 'Wäsche waschen', points: 5, perDay: 1 },
];

export const INTERVALS = {
  W:    { days: 7,  label: 'wöchentlich' },
  '2W': { days: 14, label: 'alle 2 Wochen' },
  M:    { days: 30, label: 'monatlich' },
  Q:    { days: 91, label: 'quartalsweise' },
};

const t = (id, area, interval, points, name) => ({ id, area, interval, points, name });
const perBath = (id, interval, points, name) =>
  [1, 2].map(n => t(`${id}-${n}`, 'bad', interval, points, `Bad ${n}: ${name}`));

export const TASKS = [
  // Wöchentlich
  t('k-arbeitsflaechen', 'kueche', 'W', 10, 'Arbeitsflächen gründlich reinigen (alles abräumen)'),
  t('k-herd', 'kueche', 'W', 5, 'Herd reinigen'),
  t('k-spuele', 'kueche', 'W', 5, 'Spüle und Wasserhahn reinigen'),
  t('k-fronten', 'kueche', 'W', 5, 'Fronten und Griffe abwischen'),
  t('k-mikrowelle', 'kueche', 'W', 10, 'Mikrowelle auswischen'),
  t('k-kuehlschrank-check', 'kueche', 'W', 10, 'Kühlschrank: Abgelaufenes aussortieren'),
  // Müll: jede Sorte einzeln. IDs von früher bleiben, damit der Verlauf passt.
  t('k-restmuell', 'kueche', 'W', 3, 'Müll rausbringen: Restmüll'),
  t('k-biomuell', 'kueche', 'W', 3, 'Müll rausbringen: Biomüll'),
  t('k-plastik', 'kueche', 'W', 3, 'Müll rausbringen: Plastik (Gelber Sack)'),
  t('k-papier-glas', 'kueche', 'W', 3, 'Müll rausbringen: Papier'),
  t('k-glas', 'kueche', '2W', 5, 'Müll rausbringen: Glas'),
  t('k-lappen', 'kueche', 'W', 3, 'Lappen und Geschirrtücher wechseln'),
  ...perBath('b-wc', 'W', 10, 'WC putzen'),
  t('b-dusche-1', 'bad', 'W', 20, 'Bad 1: Dusche bzw. Wanne reinigen'),
  t('b-waschbecken-1', 'bad', 'W', 10, 'Bad 1: Waschbecken und Armaturen'),
  t('b-waschbecken-2', 'bad', 'W', 5, 'Bad 2: Waschbecken und Armaturen'),
  ...perBath('b-boden', 'W', 10, 'Boden feucht wischen'),
  ...perBath('b-spiegel', 'W', 5, 'Spiegel putzen'),
  t('b-handtuecher', 'bad', 'W', 3, 'Handtücher und Badematten wechseln'),
  t('b-waesche-heiss', 'bad', 'W', 10, 'Wäsche heiß'),
  t('w-teppich', 'wohnen', 'W', 10, 'Teppich im Wohnzimmer saugen'),
  t('w-ecken', 'wohnen', 'W', 15, 'Ecken und Kanten saugen'),
  t('w-aufraeumen-wohn', 'wohnen', 'W', 5, 'Aufräumen: Wohnzimmer'),
  t('w-aufraeumen-schlaf', 'wohnen', 'W', 5, 'Aufräumen: Schlafzimmer'),
  t('w-aufraeumen-arbeit', 'wohnen', 'W', 10, 'Aufräumen: Arbeitszimmer'),
  t('w-staub-wohn', 'wohnen', 'W', 5, 'Staubwischen: Wohnzimmer'),
  t('w-staub-schlaf', 'wohnen', 'W', 5, 'Staubwischen: Schlafzimmer'),
  t('w-staub-arbeit', 'wohnen', 'W', 5, 'Staubwischen: Arbeitszimmer'),
  t('w-staub-flur', 'wohnen', 'W', 5, 'Staubwischen: Flur'),
  t('w-bettwaesche', 'wohnen', '2W', 15, 'Bettwäsche wechseln'),
  t('p-giessen', 'pflanzen', 'W', 5, 'Pflanzen gießen'),
  t('r-starten', 'robo', 'W', 5, 'Boden freiräumen, Roboter starten'),
  t('r-behaelter', 'robo', 'W', 10, 'Staubbehälter, Tank und Pads reinigen'),

  // Monatlich
  t('k-backofen', 'kueche', 'M', 30, 'Backofen und Bleche reinigen'),
  t('k-kuehlschrank', 'kueche', 'M', 20, 'Kühlschrank auswischen'),
  t('k-muelleimer', 'kueche', 'M', 20, 'Mülleimer auswaschen'),
  t('k-spuelmaschine', 'kueche', 'M', 15, 'Spülmaschine: Sieb und Dichtungen'),
  t('k-schubfaecher', 'kueche', 'M', 20, 'Schubfächer aussaugen und auswischen'),
  t('k-entkalken', 'kueche', 'M', 10, 'Wasserkocher und Kaffeemaschine entkalken'),
  t('b-fugen', 'bad', 'M', 15, 'Fliesenfugen schrubben, Ränder'),
  t('b-abfluss-1', 'bad', 'M', 20, 'Bad 1: Dusche Abfluss reinigen'),
  ...perBath('b-stoepsel', 'M', 10, 'Waschbecken-Stöpsel reinigen'),
  t('b-waschmaschine', 'bad', 'M', 20, 'Waschmaschine: Sieb, Gummi, Fach'),
  t('b-duschkopf', 'bad', 'M', 20, 'Duschköpfe, Duschtür und Armaturen entkalken'),
  t('w-fussleisten', 'wohnen', 'M', 10, 'Fußleisten und Türen abwischen'),
  t('w-schraenke-oben', 'wohnen', 'M', 10, 'Staub auf Schränken und hohen Flächen'),
  t('w-sofa', 'wohnen', 'M', 10, 'Sofa und Polster absaugen'),
  t('w-klinken', 'wohnen', 'M', 5, 'Türklinken, Lichtschalter, Fernbedienungen'),
  t('w-glas', 'wohnen', 'M', 10, 'Spiegel und Glasflächen putzen'),
  t('w-fensterbretter', 'wohnen', 'M', 15, 'Fensterbretter abwischen'),
  t('w-technik', 'wohnen', 'M', 5, 'Arbeitszimmer: Technik entstauben'),
  t('p-pflege', 'pflanzen', 'M', 15, 'Blätter abstauben, düngen (März–Sept.)'),
  t('r-buersten', 'robo', 'M', 5, 'Bürsten von Haaren befreien'),
  t('r-filter', 'robo', 'M', 5, 'Filter, Sensoren, Ladekontakte'),

  // Quartalsweise
  t('k-abtauen', 'kueche', 'Q', 50, 'Kühlschrank und Gefrierfach abtauen'),
  t('k-schraenke-innen', 'kueche', 'Q', 35, 'Küchenschränke innen, Vorräte prüfen'),
  t('k-fettfilter', 'kueche', 'Q', 15, 'Dunstabzug: Fettfilter reinigen'),
  t('w-teppich-tief', 'wohnen', 'Q', 50, 'Teppich tiefenreinigen'),
  t('w-moebel', 'wohnen', 'Q', 20, 'Möbel abrücken, dahinter saugen'),
  t('w-fenster-kueche', 'wohnen', 'Q', 20, 'Fenster putzen: Küche'),
  t('w-fenster-wohn', 'wohnen', 'Q', 20, 'Fenster putzen: Wohnzimmer'),
  t('w-fenster-schlaf', 'wohnen', 'Q', 20, 'Fenster putzen: Schlafzimmer'),
  t('w-fenster-arbeit', 'wohnen', 'Q', 20, 'Fenster putzen: Arbeitszimmer'),
  t('w-matratzen', 'wohnen', 'Q', 15, 'Matratzen absaugen und wenden'),
  t('w-vorhaenge', 'wohnen', 'Q', 20, 'Vorhänge und Gardinen waschen'),
  t('w-kissen', 'wohnen', 'Q', 20, 'Kopfkissen und Bettdecken waschen'),
  t('w-lampen', 'wohnen', 'Q', 10, 'Lampen abstauben'),
  t('w-rauchmelder', 'wohnen', 'Q', 3, 'Rauchmelder testen'),
  t('p-schaedlinge', 'pflanzen', 'Q', 60, 'Schädlinge prüfen, umtopfen'),
  t('r-verschleiss', 'robo', 'Q', 10, 'Verschleißteile tauschen, Station reinigen'),
];

// Gestrichene Aufgaben: nicht mehr im Plan, aber der Verlauf soll Namen und Bereich weiter kennen.
export const RETIRED = [
  t('b-waesche-hell', 'bad', 'W', 10, 'Wäsche hell'),
  t('b-waesche-dunkel', 'bad', 'W', 10, 'Wäsche dunkel'),
];

// ---------- Einrichtung neuer Haushalte (seit 2.8) ----------
// Der bestehende Haushalt nutzt weiter TASKS. Neue Haushalte bekommen ihren Plan aus settings.setup:
// { baths: 1–3, rooms: [Namen der Wohnräume], features: { robo, pflanzen, waschma, spuelma, mikro } }.

export const FEATURES = [
  { id: 'robo', icon: 'robot_2', area: 'robo', name: 'Saugroboter', hint: 'Roboter starten, Behälter, Bürsten …' },
  { id: 'pflanzen', icon: 'potted_plant', area: 'pflanzen', name: 'Zimmerpflanzen', hint: 'Gießen, Pflege, Schädlinge' },
  { id: 'waschma', icon: 'local_laundry_service', area: 'bad', name: 'Eigene Waschmaschine', hint: 'Wäsche waschen, Sieb und Gummi' },
  { id: 'spuelma', icon: 'dishwasher_gen', area: 'kueche', name: 'Geschirrspüler', hint: 'Ausräumen, Sieb und Dichtungen' },
  { id: 'mikro', icon: 'microwave', area: 'kueche', name: 'Mikrowelle', hint: 'Auswischen' },
];
// Wohnräume in dieser Reihenfolge, der Flur zählt mit. Später umbenennbar.
export const ROOM_NAMES = ['Wohnzimmer', 'Schlafzimmer', 'Flur', 'Arbeitszimmer', 'Kinderzimmer', 'Gästezimmer', 'Zimmer 7', 'Zimmer 8'];
export const MAX_BATHS = 3;

// Wann eine Aufgabe aus TASKS in den Plan kommt: f:<Ausstattung>, bath2 (ab 2 Bädern, ab 3 auch als Bad 3),
// room:<Index> (nur mit so vielen Wohnräumen), skip = wird aus Vorlagen je Raum erzeugt.
const NEEDS = {
  'k-mikrowelle': 'f:mikro', 'k-spuelmaschine': 'f:spuelma',
  'b-waesche-heiss': 'f:waschma', 'b-waschmaschine': 'f:waschma',
  'p-giessen': 'f:pflanzen', 'p-pflege': 'f:pflanzen', 'p-schaedlinge': 'f:pflanzen',
  'r-starten': 'f:robo', 'r-behaelter': 'f:robo', 'r-buersten': 'f:robo', 'r-filter': 'f:robo', 'r-verschleiss': 'f:robo',
  'b-wc-2': 'bath2', 'b-waschbecken-2': 'bath2', 'b-boden-2': 'bath2', 'b-spiegel-2': 'bath2', 'b-stoepsel-2': 'bath2',
  'w-technik': 'room:3',
  'w-aufraeumen-wohn': 'skip', 'w-aufraeumen-schlaf': 'skip', 'w-aufraeumen-arbeit': 'skip',
  'w-staub-wohn': 'skip', 'w-staub-schlaf': 'skip', 'w-staub-arbeit': 'skip', 'w-staub-flur': 'skip',
  'w-fenster-wohn': 'skip', 'w-fenster-schlaf': 'skip', 'w-fenster-arbeit': 'skip',
};
const DAILY_NEEDS = { 'a-spuelmaschine': 'spuelma', 'a-waesche': 'waschma' };
// Ohne Saugroboter kommen Saugen und Wischen als eigene Aufgaben dazu.
const NO_ROBOT = [
  t('w-saugen', 'wohnen', 'W', 15, 'Böden saugen'),
  t('w-wischen', 'wohnen', '2W', 15, 'Böden wischen'),
];

export const defaultSetup = () => ({
  baths: 1,
  rooms: ROOM_NAMES.slice(0, 4),
  features: Object.fromEntries(FEATURES.map(f => [f.id, true])),
});

/** Aufgaben für eine Einrichtung. IDs der Räume hängen an der Position, nicht am Namen (umbenennbar). */
export function planTasks(setup) {
  const { baths, rooms, features } = setup;
  const list = [];
  for (const task of TASKS) {
    const need = NEEDS[task.id] ?? '';
    if (need === 'skip' || (need.startsWith('f:') && !features[need.slice(2)])) continue;
    if (need === 'bath2' && baths < 2) continue;
    if (need.startsWith('room:') && rooms.length <= Number(need.slice(5))) continue;
    list.push(task.id === 'w-technik' ? { ...task, name: `${rooms[3]}: Technik entstauben` } : task);
    if (need === 'bath2' && baths >= 3) {
      list.push({ ...task, id: task.id.replace(/-2$/, '-3'), name: task.name.replace('Bad 2', 'Bad 3') });
    }
  }
  if (!features.robo) list.push(...NO_ROBOT);
  rooms.forEach((room, i) => {
    const n = i + 1;
    list.push(t(`w-raum${n}-auf`, 'wohnen', 'W', 5, `Aufräumen: ${room}`));
    list.push(t(`w-raum${n}-staub`, 'wohnen', 'W', 5, `Staubwischen: ${room}`));
    if (ROOM_NAMES[i] !== 'Flur') list.push(t(`w-raum${n}-fenster`, 'wohnen', 'Q', 20, `Fenster putzen: ${room}`));
  });
  return list;
}

/** Alltag passend zur Ausstattung. Ohne Einrichtung (bestehender Haushalt) alle. */
export const dailyTasks = setup => (setup ? DAILY.filter(d => !DAILY_NEEDS[d.id] || setup.features[DAILY_NEEDS[d.id]]) : DAILY);
