# Handoff: Putzplan 2.0 – Redesign (Dunkelmodus)

## Überblick
Neues Design für die Putzplan-PWA (`putz-app/`, Vanilla JS) für die vier Tabs **Heute, Belohnungen, Statistik, Einstellungen**. Ziel: weniger To-do-Liste, mehr gemeinsames Spiel. Die lange rote Liste wird durch drei Fokus-Aufgaben und zugeklappte Bereiche ersetzt, „x % frisch“ durch einen Füllstand pro Bereich. Die Überraschungskarten bekommen eine eigene Bühne mit Umdreh-Animation. Spielregeln (`js/game.js`) und Aufgabenkatalog (`js/tasks.js`) bleiben **unverändert**.

## Über die Design-Dateien
`Putzplan Redesign.dc.html` ist eine **Design-Referenz in HTML**: ein klickbarer Prototyp mit Beispieldaten, kein Produktionscode zum Kopieren. Aufgabe ist, das Design **in der bestehenden App nachzubauen**: `putz-app/index.html`, `styles.css`, `js/app.js`, also Vanilla JS, CSS-Variablen und kein Framework. Die Datei öffnet sich direkt im Browser (`support.js` muss daneben liegen). Sie enthält alle Entwurfsrunden; **maßgeblich sind nur diese vier Optionen** (über die Badges oder per Anker `#3a` usw. erreichbar):

| Tab | Option | Hinweis |
|---|---|---|
| Heute | **3a** | |
| Belohnungen | **4c** | Drei Reiter |
| Statistik | **5b** | Inkl. „Am häufigsten erledigt“ im Überblick |
| Einstellungen | **7a** | Inkl. Einladen per Code/Link |

Alle anderen Optionen (1a–6b) sind verworfene Zwischenstände.

## Fidelity
**High-Fidelity.** Farben, Typografie, Radien, Abstände und Interaktionen sind final und sollen möglichst exakt umgesetzt werden. Die Inhalte (Namen, Zahlen, Aufgaben) sind Beispieldaten und kommen in der App aus `compute()`.

---

## Globales Layout
- Zielgerät iPhone im Hochformat, Referenzbreite **390 pt**. Inhalt fluid mit **18 px** Seitenrand (`padding: 0 18px`).
- Seitenkopf: `padding-top` = Safe Area + ca. 18 px (im Mock 62 px inkl. Statusleiste). Sektionen vertikal mit **gap 24–28 px**.
- **Tab-Leiste** unten fixiert, 4 gleich breite Spalten, Höhe 52 px, darüber ein Verlauf von `--bg` (70 %) nach transparent, `padding: 24px 16px max(22px, env(safe-area-inset-bottom))`. Tab = Icon 24 px + Label 11 px. Aktiv: `--accent`, Icon gefüllt (FILL 1), Label 700. Inaktiv: `--muted-2`, Icon Outline, Label 600. Tabs: Heute `home`, Belohnungen `redeem`, Statistik `bar_chart`, Einstellungen `settings`.
- Scroll-Container hat unten genug Polster, damit nichts unter Dock oder Suche verschwindet (Heute: 214 px, sonst 130 px).
- **Nur Dunkelmodus ist gestaltet** (das ist der Hauptmodus). Hellmodus: siehe „Offene Punkte“.

## Design-Tokens

### Farben
Im Mock als `oklch()` definiert (läuft auf iOS ≥ 15.4). Hex-Werte sind umgerechnet und dürfen alternativ genutzt werden. **Bereichsfarben haben alle dieselbe Helligkeit und Sättigung, nur der Farbton unterscheidet sich.** Sie ersetzen die alten Werte in `AREAS` (`tasks.js`); dort nur `color` ändern, IDs nicht.

| Variable | oklch | Hex | Verwendung |
|---|---|---|---|
| `--bg` | `oklch(0.17 0.006 250)` | `#0d1012` | Seitenhintergrund |
| `--surface` | `oklch(0.22 0.008 250)` | `#181b1e` | Karten, Listen, Tab-Felder |
| `--surface-2` | `oklch(0.26 0.008 250)` | `#212428` | Eingabefelder, Balken-Track, Stepper |
| `--line` | `oklch(0.28 0.008 250)` | `#26292d` | Trennlinien in Karten |
| `--text` | `oklch(0.96 0.004 250)` | `#f0f2f4` | Primärtext |
| `--muted` | `oklch(0.72 0.01 250)` | `#a0a5ab` | Sekundärtext |
| `--muted-2` | `oklch(0.64 0.01 250)` | `#888d92` | Tertiärtext, inaktive Tabs |
| `--accent` | `oklch(0.84 0.11 170)` | `#7ae2c0` | Akzent (Mint): aktive Tabs, Primärknöpfe, Person 1 |
| `--on-accent` | `oklch(0.19 0.02 200)` | `#081717` | Text/Icons auf Akzent |
| `--accent-soft` | `oklch(0.27 0.035 170)` | `#132c24` | Sekundärknöpfe (Punkte-Pillen), Icon-Kreise |
| `--partner` | `oklch(0.79 0.09 300)` | `#c3aeec` | Person 2 (Lila) |
| `--on-partner` | `oklch(0.2 0.03 300)` | `#181322` | Text auf Person-2-Farbe |
| `--overdue` | `oklch(0.78 0.1 28)` | `#f19f94` | Überfällig, Minuspunkte, Abmelden |
| `--overdue-soft` | `oklch(0.3 0.05 28)` | `#44241f` | Icon-Hintergrund Minuspunkte |
| `--vacation` | `oklch(0.8 0.09 220)` | `#77cce6` | Urlaubsmodus aktiv |
| `--on-vacation` | `oklch(0.2 0.03 230)` | `#061821` | Text auf Urlaubsfarbe |
| `--card-front` | `oklch(0.95 0.025 170)` | `#dff4ec` | Vorderseite Überraschungskarte |
| `--heart` | `oklch(0.55 0.14 10)` | `#b3485f` | Herz auf Kartenvorderseite |
| `--area-kueche` | `oklch(0.79 0.095 55)` | `#eaaa7f` | Küche |
| `--area-bad` | `oklch(0.79 0.095 235)` | `#7bc5ef` | Bäder |
| `--area-wohnen` | `oklch(0.79 0.095 150)` | `#8ecc9a` | Wohnräume |
| `--area-pflanzen` | `oklch(0.79 0.095 115)` | `#b8c27a` | Pflanzen |
| `--area-robo` | `oklch(0.79 0.095 300)` | `#c4adef` | Roboter |
| `--area-kueche-dim` | `oklch(0.27 0.03 55)` | `#322318` | Füllstand-Hintergrund Küche |
| `--area-bad-dim` | `oklch(0.27 0.03 235)` | `#172933` | … Bäder |
| `--area-wohnen-dim` | `oklch(0.27 0.03 150)` | `#1c2b1f` | … Wohnräume |
| `--area-pflanzen-dim` | `oklch(0.27 0.03 115)` | `#262817` | … Pflanzen |
| `--area-robo-dim` | `oklch(0.27 0.03 300)` | `#292333` | … Roboter |
| `--area-ink` | `oklch(0.19 0.01 250)` | `#101418` | Icon-Farbe auf Bereichsfarbe |
| `--swatch-1` | `oklch(0.84 0.11 170)` | `#7ae2c0` | Profilfarbe Mint |
| `--swatch-2` | `oklch(0.79 0.09 300)` | `#c3aeec` | Profilfarbe Lila |
| `--swatch-3` | `oklch(0.82 0.1 60)` | `#f4b581` | Profilfarbe Apricot |
| `--swatch-4` | `oklch(0.8 0.09 235)` | `#82c7f0` | Profilfarbe Blau |

Transparenzen im Mock: Akzent-Glow `oklch(0.84 0.11 170 / 0.13)` als radialer Verlauf, Overdue-Trend-Chip `/ 0.16`, Modal-Backdrop `rgba(0,0,0,.6)`, Toast-Schatten `0 12px 30px rgba(0,0,0,.4)`, Kartenschatten `0 16px 34px rgba(0,0,0,.5)`.

Fertig zum Einfügen:
```css
:root {
  --bg: #0d1012; /* oklch(0.17 0.006 250) */
  --surface: #181b1e; /* oklch(0.22 0.008 250) */
  --surface-2: #212428; /* oklch(0.26 0.008 250) */
  --line: #26292d; /* oklch(0.28 0.008 250) */
  --text: #f0f2f4; /* oklch(0.96 0.004 250) */
  --muted: #a0a5ab; /* oklch(0.72 0.01 250) */
  --muted-2: #888d92; /* oklch(0.64 0.01 250) */
  --accent: #7ae2c0; /* oklch(0.84 0.11 170) */
  --on-accent: #081717; /* oklch(0.19 0.02 200) */
  --accent-soft: #132c24; /* oklch(0.27 0.035 170) */
  --partner: #c3aeec; /* oklch(0.79 0.09 300) */
  --on-partner: #181322; /* oklch(0.2 0.03 300) */
  --overdue: #f19f94; /* oklch(0.78 0.1 28) */
  --overdue-soft: #44241f; /* oklch(0.3 0.05 28) */
  --vacation: #77cce6; /* oklch(0.8 0.09 220) */
  --on-vacation: #061821; /* oklch(0.2 0.03 230) */
  --card-front: #dff4ec; /* oklch(0.95 0.025 170) */
  --heart: #b3485f; /* oklch(0.55 0.14 10) */
  --area-kueche: #eaaa7f; /* oklch(0.79 0.095 55) */
  --area-bad: #7bc5ef; /* oklch(0.79 0.095 235) */
  --area-wohnen: #8ecc9a; /* oklch(0.79 0.095 150) */
  --area-pflanzen: #b8c27a; /* oklch(0.79 0.095 115) */
  --area-robo: #c4adef; /* oklch(0.79 0.095 300) */
  --area-kueche-dim: #322318; /* oklch(0.27 0.03 55) */
  --area-bad-dim: #172933; /* oklch(0.27 0.03 235) */
  --area-wohnen-dim: #1c2b1f; /* oklch(0.27 0.03 150) */
  --area-pflanzen-dim: #262817; /* oklch(0.27 0.03 115) */
  --area-robo-dim: #292333; /* oklch(0.27 0.03 300) */
  --area-ink: #101418; /* oklch(0.19 0.01 250) */
  --swatch-1: #7ae2c0; /* oklch(0.84 0.11 170) */
  --swatch-2: #c3aeec; /* oklch(0.79 0.09 300) */
  --swatch-3: #f4b581; /* oklch(0.82 0.1 60) */
  --swatch-4: #82c7f0; /* oklch(0.8 0.09 235) */
}
```

### Typografie
- **Figtree** (Google Fonts, 400/500/600/700/800), überall. Systemschrift nur als Fallback.
- Zahlen mit `font-variant-numeric: tabular-nums`.
- Skala: Seitentitel 30/800, letter-spacing −0.02em · Begrüßung 28/800 · Übersichts-Headline 22/800 · Sektionstitel 18/700 · Kartentitel 15–16/700 · Fließtext 15/500–600 · Meta 13/500 · Klein 12 · Tab-Label 11.
- Sektionstitel in normaler Groß- und Kleinschreibung (keine Versalien). Rechts daneben ein Hinweis in 13 px `--muted-2`.
- Lange Wörter dürfen umbrechen: `hyphens: auto; text-wrap: pretty` auf Aufgabennamen, `<html lang="de">`.

### Radien
Großkarte/Hero 30–32 · Karte 26–28 · Listenzeile/Karte klein 22–24 · Icon-Kachel 40–42 px → 13–14, 38 px → 12, 26 px → 9 · Pillen-Knöpfe = halbe Höhe · Balken = halbe Höhe.

### Icons
**Material Symbols Rounded** (Google Fonts), `font-variation-settings: 'FILL' 1`. Ersetzt **alle Emojis**.
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400..600,0..1,0&display=block">
```
- Bereiche: Küche `skillet`, Bäder `bathtub`, Wohnräume `weekend`, Pflanzen `potted_plant`, Roboter `robot_2`. Darstellung: gefülltes Icon in `--area-ink` auf einer Kachel in Bereichsfarbe.
- Alltag: Abwaschen `soap`, Arbeitsfläche abwischen `countertops`, Geschirrspüler ausräumen `dishwasher_gen`.
- Team-Belohnungen (Vorschlag, ggf. Feld `icon` je Belohnung): Pizza `local_pizza`, Kino `movie`, Essen `restaurant`, Ausflug `landscape`, Standard `redeem`.
- Sonstige: `star` (Level), `search`, `expand_more`, `check`, `add`, `remove`, `close`, `lock`, `touch_app`, `favorite`, `spa`, `hourglass_bottom`, `volunteer_activism`, `schedule`, `balance`, `beach_access`, `person_add`, `group`, `content_copy`, `ios_share`, `login`, `check_circle`, `smartphone`.
- Personen: **Initiale in Farbkreis** statt Emoji (siehe Einstellungen).

---

## Screen 1: Heute (Option 3a)
Reihenfolge von oben nach unten:

1. **Kopf**
   - Links: Datum („Freitag, 16. Oktober“, 14/500 `--muted`) und darunter „Hallo {Name}“ (28/800).
   - Rechts: Level-Chip (Höhe 40, Radius 20, `--surface`; links ein 30-px-Kreis `--accent` mit `star`, daneben „Level {n}“ 14/700) und beide Avatare (38 px, Initiale 15/800, Rand 2 px `--bg`, zweiter um −10 px überlappend).
   - Darunter eine Zeile: persönlicher Titel (13/700 `--text`) links, „noch {x} bis Level {n+1}“ rechts, dann ein Balken 6 px (`--surface-2` / `--accent`).
2. **Übersichtskarte „Wohnung“** (`--surface`, Radius 30, padding 20, gap 16)
   - Kopfzeile: „Wohnung“ (14/700 `--muted`) links, „{n} von 5 mit Rückstand“ (13 `--muted-2`) rechts.
   - Headline 22/800, z. B. „Die Bäder brauchen euch gerade am meisten“ (Bereich mit der niedrigsten Frische, grammatisch passend: „Die Bäder/Die Wohnräume brauchen“, sonst „{Name} braucht“).
   - **Füllstand-Balken**: eine Reihe aus 5 Segmenten, Höhe 104 px, gap 5, Radius 16. Breite per `flex-grow` = Anteil der Aufgabenpunkte des Bereichs am Gesamtkatalog, `min-width: 36px`. Hintergrund `--area-*-dim`, Füllung von unten in Bereichsfarbe mit Höhe = Frische des Bereichs in %. Oben mittig das Bereichs-Icon (19 px) in Bereichsfarbe; ab Frische > 72 % in `--area-ink`, damit es lesbar bleibt. Tippen öffnet den Bereich unten in der Bereichsliste. Das offene Segment bekommt `outline: 2px solid {Bereichsfarbe}; outline-offset: 2px`.
   - Hinweis 12 px: „Je voller, desto frischer · antippen zum Öffnen“.
   - Trennlinie, dann 3 Werte im Raster (22/800, Label 12): **{n} überfällig** (`--overdue`) · **−{x}** „Team pro Tag“ (`--text`) · **{x}** „bis {nächste Team-Belohnung}“ (`--accent`).
3. **Alltag** (Titel „Alltag“, Hinweis „ein Tipp genügt“): 3 Kacheln im Raster (`repeat(3, minmax(0,1fr))`, gap 10).
   - Kachel: `--surface`, Radius 24, padding 16/8/14. Darin ein Icon-Kreis 50 px (`--accent-soft`, Icon 26 `--accent`), der Name (13/700, zentriert, darf umbrechen) und „+{p}“ mit zwei Punkten à 7 px (erledigt = `--accent`, offen = `oklch(0.32 0.01 250)`).
   - Bei 2/2 Kachel auf opacity .5 setzen und nicht mehr tippbar machen. `:active` → `scale(.95)`.
4. **„Lohnt sich jetzt“** (Hinweis „Rettung +50 %“): **genau 3** überfällige Aufgaben, sortiert nach `punkte × min(überfälligeTage, 10)` absteigend.
   - Zeile: `--surface`, Radius 22, padding 12. Links eine Bereichskachel 42 px. Daneben der Name (15/700) und darunter „{n} Tage überfällig“ in `--overdue` · „−{p×0,1}/Tag“ in `--muted`.
   - Rechts ein Punkte-Knopf: Pille 58×46, `--accent-soft` mit Text „+{p}“ in `--accent` 15/700. Hover/Active: `--accent` mit `--on-accent`.
   - Tippen = erledigen. Danach rückt die nächste Aufgabe nach.
   - Gibt es keine überfälligen Aufgaben: Abschnitt ausblenden oder als Fallback die nächsten fälligen zeigen.
5. **Bereiche** (Hinweis „{n} überfällig“): eine Karte (`--surface`, Radius 26), darin 5 Zeilen mit Trennlinien.
   - Zeile: Kachel 42, Name (16/700), rechts der Status („{n} überfällig“ in `--overdue`, sonst „alles im Plan“ in `--muted`). Darunter ein Frische-Balken 6 px in Bereichsfarbe und rechts `expand_more`, das sich beim Öffnen um 180° dreht (.2 s).
   - **Aufgeklappt**: Liste der Aufgaben des Bereichs, eingerückt (padding-left 72), sortiert nach Fälligkeit. Je Aufgabe Name (15/600), Meta („{n} Tage überfällig“ / „heute fällig“ / „in {n} Tagen fällig“) und ein Punkte-Knopf 54×44. Es ist immer nur ein Bereich offen.
   - Ersetzt die Filter Alle/Woche/Monat/Quartal und die Listen Überfällig/Bald fällig/Später.
6. **Dock** über der Tab-Leiste: Suchfeld Höhe 54, Radius 27, `--surface-2`, Icon `search` und Platzhalter „Was hast du gemacht?“ (16/500). Funktion wie die bisherige Suche, Ergebnisse als Overlay oder Liste über dem Dock. Danach die Tab-Leiste.
7. **Toast** nach dem Erledigen: über dem Dock (bottom ≈ 178 px), `--accent`, Radius 24, links „+{p} Punkte · {Aufgabe}“ (15/800) und darunter „Rettung: +{p×1,5} für dein Level“ (12/600). Rechts der Knopf „Rückgängig“ (`--on-accent`-Pille, Text `--accent`). Verschwindet nach ca. 3,8 s.

**Daten** (alles aus `compute()` ableitbar):
- Frische je Bereich = `Σ(p × freshness) / Σ p` über die Aufgaben des Bereichs.
- Segmentbreite = `Σ p (Bereich) / Σ p (alle)`.
- „x von 5 mit Rückstand“ = Bereiche mit mindestens einer überfälligen Aufgabe.
- „Team pro Tag“ = `penaltyPerDayNow`, angezeigt als „−16,2“ mit deutschem Komma.

## Screen 2: Belohnungen (Option 4c)
- Titel „Belohnungen“ (30/800) und rechts die Avatare.
- **Segment-Control** mit 3 Reitern: Container `--surface`, Radius 26, padding 4, Buttons Höhe 44, Radius 22. Aktiv: `--accent` mit `--on-accent`. Labels und Badges:
  - „Für mich“ mit Badge = Anzahl ziehbarer Karten (`picksAvailable`).
  - „Für {Partner}“ mit Badge = Anzahl im Topf.
  - „Team“ ohne Badge.
  - Badge: min 20×20, Radius 10, 12 px; im aktiven Reiter invertiert.
- **Reiter „Für mich“**:
  - **Bühne**: Karte Radius 32 mit radialem Akzent-Glow (`radial-gradient(120% 70% at 50% 30%, accent/0.13, transparent 70%)` über `--surface`), Höhe der Kartenfläche 260.
  - **3 verdeckte Karten** à 136×190, Radius 20. Rückseite: diagonale Streifen `repeating-linear-gradient(135deg, oklch(0.82 0.11 170) 0 9px, oklch(0.77 0.11 172) 9px 18px)` mit innerem 6-px-Rahmen `--accent` und mittig ein 58-px-Kreis `--on-accent` mit Icon `touch_app` (ziehbar) bzw. `lock` (gesperrt).
  - Fächer: `translate(-78px,18px) rotate(-10deg)` · mittig ohne Versatz · `translate(78px,18px) rotate(10deg)`.
  - **Gesperrt** (keine Picks): Karten opacity .55, Titel „Nächste Karte bei Level {n}“, Untertitel „Noch {x} Punkte. {Partner} hat schon Karten für dich hinterlegt.“, darunter ein Fortschrittsbalken 200 px breit.
  - **Ziehbar**: Titel „Zieh eine Karte“. Antippen dreht die Karte um: Wrapper `perspective: 1000px`, innen `transform-style: preserve-3d` und `rotateY(180deg)` in **.8 s, cubic-bezier(.2,.8,.2,1)**. Gleichzeitig fährt die Karte nach `translate(0,-6px) scale(1.12)` (.55 s), die anderen gehen auf opacity .25.
  - Vorderseite: `--card-front`, oben „VON {PARTNER}“ (11/800, letter-spacing .08em), mittig der Gutscheintext (18/800) und unten ein Herz.
  - Danach Titel „Glückwunsch!“ und der Knopf „In meine Karten“ (Primär-Pille 50 px). Konfetti/Haptik optional.
  - **Deine Karten**: Hinweis „{n} offen“. Zeilen mit einer Mini-Karte 44×56 (`--card-front`, Icon), dem Text (15/700) und „von {Partner} · gezogen {Datum}“. Rechts der Knopf „Einlösen“ (Pille `--accent-soft`). Eingelöst: opacity .5 und Text „eingelöst · von {Partner}“.
- **Reiter „Für {Partner}“**:
  - Karte „Für {Partner} in den Topf“ (20/800). Rechts davon 3 Mini-Karten 16×22 als Füllanzeige (`--partner` gefüllt, `--line` leer) und „{n} von 3“ bzw. „{n} im Topf“.
  - Erklärtext 13 px. Eingabe als Pille 50 px plus ein runder Knopf 50 px `add` (opacity .4, solange leer). Enter fügt ebenfalls hinzu.
  - Liste der eigenen Gutscheine mit lila gestreifter Mini-Karte und Knopf `close` (44 px) zum Entfernen.
  - Darunter ein gestrichelter Hinweis `visibility_off`: „{Partner} sieht nur, wie viele Karten im Topf liegen, nicht was darauf steht.“
- **Reiter „Team“**:
  - **Fairness-Balken** oben (`--surface-2`, Radius 18):
    - Kopfzeile „Fair geteilt seit Level {n}?“ mit Status rechts: „Ja, beide über einem Drittel“ (`--accent`) bzw. „{Name} fehlen noch {x} Punkte“ (`--overdue`), Werte aus `rewardFairness().missing`.
    - Balken 10 px, geteilt in `--accent` und `--partner`, mit zwei 2-px-Markierungen in `--bg` bei 33,3 % und 66,6 %.
    - Fußzeile „Alex 46 %“ · „Markierung = ein Drittel“ · „Sam 54 %“.
  - **Tickets** je Team-Level (gap 14), Radius 24:
    - Linker Abriss 86 px breit mit Icon 30 und „LV {n}“, abgetrennt durch `border-right: 2px dashed`. Oben und unten an der Trennlinie je ein 18-px-Kreis in `--bg` als Stanzloch.
    - Rechts Name (19/800) und „ab {x} Teampunkten“ bzw. für das nächste Level „… · noch {y}“ plus Fortschrittsbalken.
    - **Nächstes Level**: Ticket in `--accent` mit `--on-accent`. Übrige: `--surface`.
    - Erreichte, noch nicht eingelöste Level brauchen einen Knopf „Einlösen“ (nicht im Mock, gleiche Pille wie bei „Deine Karten“; deaktiviert mit Fairness-Hinweis, solange die Regel nicht erfüllt ist).
  - Team-Belohnungen anlegen/bearbeiten wie bisher (Funktion beibehalten). Ein „Bearbeiten“-Link rechts neben einem Sektionstitel reicht.

## Screen 3: Statistik (Option 5b)
- Titel „Statistik“ und Avatare. Darunter ein **Segment-Control „Überblick / Verlauf“** (Stil wie oben).
- **Überblick**:
  1. Segment-Control Woche/Monat/Gesamt.
  2. **Beitrags-Karte** (`--surface`, Radius 26, padding 18):
     - Oben links „Alex“ (13/700 `--accent`) mit Zahl 34/800, rechts dasselbe für Sam in `--partner`, mittig „{Summe} Pkt zusammen“.
     - Geteilter Balken 14 px (Radius 7, gap 3), Breitenwechsel animiert .5 s.
     - Darunter links und rechts die Prozente, mittig „Sam +10“ oder „Gleichauf“ (Abstand < 5).
  3. **„Wer macht was?“** (neu; Hinweis = Zeitraum): pro Bereich eine Zeile mit Kachel 38, Name und rechts „{A} · {S}“ in Personenfarben. Darunter ein geteilter Balken 8 px. Die Balkenbreite ist relativ zum stärksten Bereich (min. 8 %), die Teilung entspricht dem Anteil A zu S. Daten: `sumSince(from)` je Bereich (über `TASKS[taskId].area`).
  4. **Level-Karten**, zwei im Raster:
     - Avatar 44 px, Name (16/800) und „Level {n}“.
     - Titel in Personenfarbe (14/700).
     - Balken 6 px und „{xp} / {next} Punkte“.
  5. **Liegengeblieben**:
     - Zeile mit Icon `hourglass_bottom` auf `--overdue-soft`, Titel „Liegengeblieben“ und Untertitel „Teampunkte durch überfällige Aufgaben, seit Start“.
     - Rechts „−{penaltyTotal}“ (24/800 `--overdue`).
  6. **Am häufigsten erledigt** (Hinweis = Zeitraum): zwei Karten nebeneinander mit Namen in Personenfarbe und je den Top 3 Aufgaben. Jede Aufgabe hat eine Mini-Kachel 26 px (Bereichsfarbe, Icon 15) und den Namen (13/500).
- **Verlauf**:
  - Filter Alle/{A}/{S} als Segment-Control.
  - Einträge **nach Tag gruppiert**: Kopf „Sa., 10.10.“ links, Tagessumme „+5“ rechts (13/700 `--muted`). Darunter eine Karte pro Tag.
  - Zeile: Bereichskachel 38 mit einem 20-px-Personenpunkt unten rechts (Initiale 10/800, Rand 2 px `--surface`). Daneben Aufgabenname (15/600), „{Name} · {Uhrzeit}“ (12) und „+{p}“ (15/800). Rechts ein Knopf `close` 44 px, Hover in `--overdue`.
  - Löschen = sofort entfernen plus Toast „„{Aufgabe}“ gelöscht“ mit „Rückgängig“ (3,5 s). Bestehendes Soft-Delete `deleted` nutzen.

## Screen 4: Einstellungen (Option 7a)
1. Titel „Einstellungen“.
2. **„Wer seid ihr?“** (Hinweis „Tippe auf dich“): zwei Profilkarten im Raster (`--surface`, Radius 26, padding 16/14). Die eigene Person bekommt `outline: 2px solid {Personenfarbe}; outline-offset: -2px`. Inhalt jeder Karte:
   - Avatar 64 px (Initiale 26/800) in der Profilfarbe.
   - Namensfeld: Pille 44 px, `--surface-2`, zentriert, 16/700. Änderungen sofort speichern.
   - 4 Farbkreise à 26 px (`--swatch-1…4`); der gewählte hat einen 3-px-Rand in Weiß.
   - Knopf „Das bin ich“ (`check_circle`, in Personenfarbe) bzw. „Ich bin das“ (`smartphone`, neutral). Ersetzt „Wer nutzt dieses Handy?“; auch Antippen des Avatars wählt.
   - **Noch kein Partner im Haushalt**: Die zweite Karte ist ein gestrichelter Platzhalter (2 px dashed, Höhe wie Profilkarte) mit einem 64-px-Kreis `person_add` sowie „Partner einladen“ / „per Code oder Link“. Tippen scrollt zur Einladungskarte.
   - Nichts ist auf „Alex/Sam“ festgelegt.
3. **Haushalt-Karte** (`--surface`, Radius 26, padding 18):
   - Kopf: Kachel `person_add` mit „Partner einladen“ und „Schick deinem Mitbewohner den Code oder Link. Danach putzt ihr als Team.“. Wenn verbunden: `group` mit „Euer Haushalt“ und „{A} und {B} sind verbunden · alles synchron“.
   - **Solange nicht verbunden**:
     - Codefeld (`--surface-2`, Radius 20) mit dem Code in 26/800, letter-spacing .14em, und rechts „gültig 24 h“.
     - Zwei Knöpfe à 46 px: „Code kopieren“ (`--accent-soft`, Icon `content_copy`, wird nach dem Tippen zu `check` „Kopiert“, per `navigator.clipboard.writeText`) und „Link teilen“ (`--accent`, `ios_share`). Teilen läuft über `navigator.share({ title: 'Putzplan', text, url })`, Fallback: Link kopieren.
     - Erklärung: „Wer den Link öffnet oder den Code eingibt, tritt eurem Haushalt bei und sieht denselben Plan.“
   - Trennlinie, dann die aufklappbare Zeile „Du hast einen Code bekommen?“ (`login`, `expand_more`). Aufgeklappt: Codefeld (uppercase, Platzhalter „PUTZ-0000“) und der Knopf „Beitreten“, aktiv ab gültiger Länge. Warnung darunter: „Achtung: Du verlässt dann diesen Haushalt und wechselst in den anderen.“
   - **Einladungslink** z. B. `…/putz-app/?join=PUTZ-4821`: Beim Öffnen fragt die App nach Bestätigung und tritt dann bei.
   - Der gestrichelte Demo-Knopf im Mock ist **nur für die Vorschau** und kommt nicht in die App.
4. **Urlaubsmodus** als Zeile in einer Karte:
   - Kachel `beach_access`: aus = `oklch(0.3 0.04 220)` mit Icon `--vacation`, an = `--vacation` mit Icon `--on-vacation`.
   - Titel „Urlaubsmodus“, Untertitel „Pausiert die Uhr für euch beide“ bzw. „Läuft seit {Datum} · nichts wird überfällig“.
   - iOS-Schalter 52×32 (Knopf 26 weiß; Track an = `--vacation`, aus = `oklch(0.32 0.01 250)`).
   - **Aktiv**: Auf **allen Seiten** steht oben ein Banner (Höhe 36, Radius 18, `--vacation`/`--on-vacation`, 13/800) „Urlaub · die Uhr steht seit {Datum}“; der Inhalt rückt entsprechend nach unten.
5. **Punkte anpassen** (Hinweis „nach Schwierigkeit“): Akkordeon mit 5 Bereichszeilen.
   - Zeile: Kachel 40, Name (15/700), „{n} Aufgaben“ bzw. „{n} Aufgaben · {k} angepasst“, Chevron.
   - Aufgeklappt alle Aufgaben des Bereichs mit Name (14/600), Intervall (12) und **Stepper** (`--surface-2`, Radius 22, Knöpfe −/+ à 40 px, Wert 15/800).
   - Der Stepper springt durch die Stufen **3 · 5 · 10 · 15 · 20 · 30 · 35 · 50 · 60**.
   - Abweichender Wert: in `--accent`, Untertitel „{Intervall} · Standard {p}“. Zurück auf den Standard = Override löschen (`settings.pointOverrides`).
   - Im Mock steht „Alle {n} Aufgaben anzeigen“, weil dort nur Beispiele gezeigt werden. In der App einfach alle Aufgaben listen.
6. **So funktioniert’s**: Karte mit 4 Zeilen (Kachel 40 + Titel 15/700 + Satz 13):
   - `hourglass_bottom` (overdue): „Liegenlassen kostet“ – „Überfällige Aufgaben kosten das Team pro Tag 10 % ihrer Punkte, höchstens 10 Tage lang.“
   - `volunteer_activism` (accent): „Retten lohnt sich“ – „Wer eine überfällige Aufgabe erledigt, bekommt +50 % aufs persönliche Level.“
   - `schedule` (blau): „Nicht zu früh“ – „Punkte gibt es erst wieder, wenn die Hälfte des Intervalls vorbei ist.“
   - `balance` (partner): „Fair teilen“ – „Team-Belohnungen sind einlösbar, wenn beide seit dem letzten Level mind. ein Drittel beigetragen haben.“
   - Werte aus `RULES` einsetzen, nicht hart codieren.
7. Der Knopf „Auf diesem Gerät abmelden“ (Text `--overdue`, 15/700, transparent) und darunter „Putzplan {APP_VERSION}“ (12 `--muted-2`).
- **Entfernt**: der Abschnitt „Zweites Handy verbinden“ (jetzt die Haushalt-Karte) und die Emoji-Auswahl.

## Interaktionen & Animationen
- Balkenbreiten und -höhen (Frische, Fortschritt, Beitrag): `transition: width/height .5s`.
- Chevron: `transform .2s`. Kacheln/Knöpfe `:active`: `scale(.95–.98)`.
- Karte ziehen: siehe Belohnungen (Flip .8 s, Position .55 s, `cubic-bezier(.2,.8,.2,1)`).
- Alle Tippflächen mindestens 44 × 44 pt.
- `prefers-reduced-motion`: Flip und Transitions abschalten bzw. auf Überblenden reduzieren.
- **Nicht neu gestaltet**: das Aufgaben-Bottom-Sheet und das Levelaufstieg-Modal. Beide mit denselben Tokens umstylen: Sheet `--surface`, Radius oben 34, Griff 40×5, Backdrop `rgba(0,0,0,.6)`; Primärknopf „Erledigt“ als Akzent-Pille 52 px; „Von {Partner} erledigt eintragen“ als Sekundär-Pille `--accent-soft`.

## State / Datenmodell
- **Neu im Spieler-Objekt**: `color` (Index 0–3 auf `--swatch-*`) statt `emoji`. Migration: Spieler 1 → 0, Spieler 2 → 1. Avatare zeigen die Initiale des Namens.
- **Einladung**: Haushalt-Code, Teilen-Link mit `?join=`, Beitreten-Flow. Am bestehenden Haushalt- und Sync-Mechanismus in `store.js` bzw. Supabase andocken. Der Haushalt hat zwei Mitglieder, die Mechanik ist für zwei Personen gebaut.
- UI-State je Seite: offener Bereich (Heute), aktiver Reiter (Belohnungen, Statistik), Zeitraum, Verlaufsfilter, aufgeklappter Punkte-Bereich, Toast mit Undo.
- **Keine Änderung an `game.js`-Regeln.** Neue reine Hilfsfunktionen (Frische je Bereich, Fokus-Ranking, Punkte je Bereich und Person) gerne in `game.js` ergänzen und in `test/game.test.mjs` testen.

## Offene Punkte
- **Hellmodus**: nicht gestaltet. Vorschlag: gleiche Struktur mit `--bg oklch(0.975 0.004 250)`, `--surface #fff`, `--surface-2 oklch(0.95 0.006 250)`, `--line oklch(0.9 0.006 250)`, `--text oklch(0.22 0.01 250)`, `--muted oklch(0.48 0.01 250)`, Akzent für Text und Flächen `oklch(0.55 0.1 170)`, Bereichsfarben `oklch(0.62 0.11 h)`. Bitte mit dem Nutzer abstimmen; sonst vorerst nur Dunkel erzwingen (`color-scheme: dark`).
- Leerzustände (keine überfälligen Aufgaben, leerer Topf, kein Verlauf) mit freundlichem Einzeiler im Stil der Seite.

## Release (laut CLAUDE.md im Repo)
1. `APP_VERSION` in `js/app.js` auf **2.0** setzen und `CHANGELOG.md` ergänzen.
2. `VERSION` in `sw.js` hochzählen.
3. Aufgaben-IDs nicht ändern; nur `color` in `AREAS` anpassen.
4. `node --test putz-app/test/game.test.mjs` ausführen.
5. Gegen `?demo` testen (nie gegen echte Daten), auch `&view=rewards|stats|settings`.
6. Committen. Danach schreibt Claude die Release-Notes im vorgegebenen Format in den Chat; der Nutzer pusht selbst.

## Dateien in diesem Paket
- `Putzplan Redesign.dc.html`: interaktive Design-Referenz (maßgeblich: 3a, 4c, 5b, 7a).
- `support.js`: Laufzeit für die Referenzdatei (nur zum Ansehen, nicht in die App übernehmen).
