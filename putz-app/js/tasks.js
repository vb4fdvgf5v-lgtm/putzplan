// Aufgabenkatalog. Punkte = Schwierigkeit (Aufwand + Ekelfaktor), nicht Zeit.
// Stufen: 3 Handgriff · 5 leicht · 10 normal · 15 lästig · 20 eklig/anstrengend · 30 groß · 50 Projekt

export const AREAS = {
  kueche:   { name: 'Küche',     color: '#D9662B', icon: '🍳' },
  bad:      { name: 'Bäder',     color: '#2F7BBF', icon: '🛁' },
  wohnen:   { name: 'Wohnräume', color: '#3E8E54', icon: '🛋️' },
  pflanzen: { name: 'Pflanzen',  color: '#7A9A1E', icon: '🪴' },
  robo:     { name: 'Roboter',   color: '#7D55B0', icon: '🤖' },
};

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
  t('k-arbeitsflaechen', 'kueche', 'W', 10, 'Arbeitsflächen abwischen'),
  t('k-herd', 'kueche', 'W', 10, 'Herd reinigen'),
  t('k-spuele', 'kueche', 'W', 10, 'Spüle und Wasserhahn reinigen'),
  t('k-fronten', 'kueche', 'W', 5, 'Fronten und Griffe abwischen'),
  t('k-mikrowelle', 'kueche', 'W', 5, 'Mikrowelle auswischen'),
  t('k-kuehlschrank-check', 'kueche', 'W', 5, 'Kühlschrank: Abgelaufenes aussortieren'),
  t('k-restmuell', 'kueche', 'W', 5, 'Rest- und Biomüll rausbringen'),
  t('k-papier-glas', 'kueche', 'W', 5, 'Papier und Glas wegbringen'),
  t('k-lappen', 'kueche', 'W', 3, 'Lappen und Geschirrtücher wechseln'),
  ...perBath('b-wc', 'W', 20, 'WC putzen'),
  ...perBath('b-dusche', 'W', 20, 'Dusche bzw. Wanne reinigen'),
  ...perBath('b-waschbecken', 'W', 10, 'Waschbecken und Armaturen'),
  ...perBath('b-boden', 'W', 10, 'Boden feucht wischen'),
  ...perBath('b-spiegel', 'W', 5, 'Spiegel putzen'),
  t('b-handtuecher', 'bad', 'W', 3, 'Handtücher und Badematten wechseln'),
  t('w-teppich', 'wohnen', 'W', 10, 'Teppich im Wohnzimmer saugen'),
  t('w-ecken', 'wohnen', 'W', 10, 'Ecken und Kanten saugen'),
  t('w-aufraeumen-wohn', 'wohnen', 'W', 5, 'Aufräumen: Wohnzimmer'),
  t('w-aufraeumen-schlaf', 'wohnen', 'W', 5, 'Aufräumen: Schlafzimmer'),
  t('w-aufraeumen-arbeit', 'wohnen', 'W', 5, 'Aufräumen: Arbeitszimmer'),
  t('w-staub-wohn', 'wohnen', 'W', 5, 'Staubwischen: Wohnzimmer'),
  t('w-staub-schlaf', 'wohnen', 'W', 5, 'Staubwischen: Schlafzimmer'),
  t('w-staub-arbeit', 'wohnen', 'W', 5, 'Staubwischen: Arbeitszimmer'),
  t('w-staub-flur', 'wohnen', 'W', 5, 'Staubwischen: Flur'),
  t('w-bettwaesche', 'wohnen', '2W', 15, 'Bettwäsche wechseln'),
  t('p-giessen', 'pflanzen', 'W', 5, 'Pflanzen gießen'),
  t('r-starten', 'robo', 'W', 3, 'Boden freiräumen, Roboter starten'),
  t('r-behaelter', 'robo', 'W', 10, 'Staubbehälter, Tank und Pads reinigen'),

  // Monatlich
  t('k-backofen', 'kueche', 'M', 30, 'Backofen und Bleche reinigen'),
  t('k-kuehlschrank', 'kueche', 'M', 20, 'Kühlschrank auswischen'),
  t('k-muelleimer', 'kueche', 'M', 20, 'Mülleimer auswaschen'),
  t('k-spuelmaschine', 'kueche', 'M', 15, 'Spülmaschine: Sieb und Dichtungen'),
  t('k-schubfaecher', 'kueche', 'M', 10, 'Schubfächer aussaugen und auswischen'),
  t('k-entkalken', 'kueche', 'M', 5, 'Wasserkocher und Kaffeemaschine entkalken'),
  t('b-fugen', 'bad', 'M', 25, 'Fliesenfugen schrubben'),
  ...perBath('b-abfluss', 'M', 20, 'Abfluss reinigen'),
  ...perBath('b-stoepsel', 'M', 15, 'Waschbecken-Stöpsel reinigen'),
  t('b-waschmaschine', 'bad', 'M', 20, 'Waschmaschine: Sieb, Gummi, Fach'),
  t('b-duschkopf', 'bad', 'M', 10, 'Duschköpfe und Armaturen entkalken'),
  t('w-fussleisten', 'wohnen', 'M', 15, 'Fußleisten und Türen abwischen'),
  t('w-schraenke-oben', 'wohnen', 'M', 10, 'Staub auf Schränken und hohen Flächen'),
  t('w-sofa', 'wohnen', 'M', 10, 'Sofa und Polster absaugen'),
  t('w-klinken', 'wohnen', 'M', 5, 'Türklinken, Lichtschalter, Fernbedienungen'),
  t('w-glas', 'wohnen', 'M', 5, 'Spiegel und Glasflächen putzen'),
  t('w-fensterbretter', 'wohnen', 'M', 5, 'Fensterbretter abwischen'),
  t('w-technik', 'wohnen', 'M', 5, 'Arbeitszimmer: Technik entstauben'),
  t('p-pflege', 'pflanzen', 'M', 10, 'Blätter abstauben, düngen (März–Sept.)'),
  t('r-buersten', 'robo', 'M', 10, 'Bürsten von Haaren befreien'),
  t('r-filter', 'robo', 'M', 5, 'Filter, Sensoren, Ladekontakte'),

  // Quartalsweise
  t('k-abtauen', 'kueche', 'Q', 50, 'Kühlschrank und Gefrierfach abtauen'),
  t('k-schraenke-innen', 'kueche', 'Q', 40, 'Küchenschränke innen, Vorräte prüfen'),
  t('k-fettfilter', 'kueche', 'Q', 15, 'Dunstabzug: Fettfilter reinigen'),
  t('b-lueftung', 'bad', 'Q', 10, 'Lüftungsgitter reinigen'),
  t('b-silikon', 'bad', 'Q', 10, 'Silikonfugen prüfen'),
  t('w-teppich-tief', 'wohnen', 'Q', 50, 'Teppich tiefenreinigen'),
  t('w-moebel', 'wohnen', 'Q', 30, 'Möbel abrücken, dahinter saugen'),
  t('w-fenster-kueche', 'wohnen', 'Q', 20, 'Fenster putzen: Küche'),
  t('w-fenster-wohn', 'wohnen', 'Q', 20, 'Fenster putzen: Wohnzimmer'),
  t('w-fenster-schlaf', 'wohnen', 'Q', 20, 'Fenster putzen: Schlafzimmer'),
  t('w-fenster-arbeit', 'wohnen', 'Q', 20, 'Fenster putzen: Arbeitszimmer'),
  t('w-matratzen', 'wohnen', 'Q', 20, 'Matratzen absaugen und wenden'),
  t('w-vorhaenge', 'wohnen', 'Q', 15, 'Vorhänge und Gardinen waschen'),
  t('w-kissen', 'wohnen', 'Q', 15, 'Kopfkissen und Bettdecken waschen'),
  t('w-lampen', 'wohnen', 'Q', 10, 'Lampen abstauben'),
  t('w-rauchmelder', 'wohnen', 'Q', 3, 'Rauchmelder testen'),
  t('p-schaedlinge', 'pflanzen', 'Q', 20, 'Schädlinge prüfen, umtopfen'),
  t('r-verschleiss', 'robo', 'Q', 10, 'Verschleißteile tauschen, Station reinigen'),
];
