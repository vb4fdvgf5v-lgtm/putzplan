// Aufgabenkatalog. Punkte = Schwierigkeit (Aufwand + Ekelfaktor), nicht Zeit.
// Stufen: 3 Handgriff · 5 leicht · 10 normal · 15 lästig · 20 eklig/anstrengend · 30 groß · 50 Projekt

export const AREAS = {
  kueche:   { name: 'Küche',     color: '#D9662B', icon: '🍳' },
  bad:      { name: 'Bäder',     color: '#2F7BBF', icon: '🛁' },
  wohnen:   { name: 'Wohnräume', color: '#3E8E54', icon: '🛋️' },
  pflanzen: { name: 'Pflanzen',  color: '#7A9A1E', icon: '🪴' },
  robo:     { name: 'Roboter',   color: '#7D55B0', icon: '🤖' },
};

// Alltag: fällt (fast) täglich an. Kein Intervall, keine Fälligkeit, keine Minuspunkte,
// nur ein Tipp auf der Startseite. Das Tageslimit verhindert Punkte-Sammeln durch Dauertippen.
export const DAILY = [
  { id: 'a-abwasch', icon: '🍽️', name: 'Abwaschen', points: 3, perDay: 2 },
  { id: 'a-arbeitsflaeche', icon: '🧽', name: 'Arbeitsfläche abwischen', points: 2, perDay: 2 },
  { id: 'a-spuelmaschine', icon: '⬇️', name: 'Geschirrspüler ausräumen', points: 2, perDay: 2 },
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
  t('k-arbeitsflaechen', 'kueche', 'W', 5, 'Arbeitsflächen abwischen'),
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
  t('b-waesche-hell', 'bad', 'W', 10, 'Wäsche hell'),
  t('b-waesche-dunkel', 'bad', 'W', 10, 'Wäsche dunkel'),
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
