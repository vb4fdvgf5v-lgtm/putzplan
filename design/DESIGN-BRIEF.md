# Design-Briefing: Putzplan-App

Kontext für Layout- und Prototyp-Entwürfe (z. B. in Claude Design). Die Screenshots im Ordner
`screenshots/` zeigen den aktuellen Stand mit Beispieldaten.

## Worum es geht

Eine Web-App für **zwei Personen, die zusammen wohnen** und sich den Haushalt teilen. Sie läuft auf
beiden iPhones (vom Home-Bildschirm gestartet, ohne App Store) und hält den gemeinsamen Putzplan,
Punkte und Belohnungen synchron.

**Ziel:** Putzen soll sich nach einem kleinen gemeinsamen Spiel anfühlen. Beide treten als Team an,
schalten zusammen Belohnungen frei, und trotzdem sieht man, wer wie viel beigetragen hat.

**Typische Nutzung:** mehrmals pro Woche für 10 Sekunden. Handy raus, „Was habe ich gerade gemacht?",
abhaken, Punkte sehen, fertig. Seltener: Statistik anschauen, Überraschung ziehen, Belohnung einlösen.

## Spielmechanik (was die Oberfläche transportieren muss)

| Element | Bedeutung |
|---|---|
| Aufgaben | ~76 Stück, je mit Bereich (Küche, Bäder, Wohnräume, Pflanzen, Roboter), Intervall (Woche, 2 Wochen, Monat, Quartal) und Punkten (3 bis 60) |
| Frische | Jede Aufgabe hat einen Balken, der über ihr Intervall leer läuft. Leer = überfällig |
| Wohnung frisch in % | Gewichteter Durchschnitt aller Frische-Balken, der zentrale Zustand auf der Startseite |
| Überfällig | Kostet das Team pro Tag 10 % der Aufgabenpunkte (max. 10 Tage). Muss sichtbar, aber nicht bedrohlich sein |
| Rettungsbonus | Wer eine überfällige Aufgabe erledigt, bekommt +50 % aufs persönliche Level |
| Alltag | 3 tägliche Mini-Aufgaben (Abwaschen, Arbeitsfläche abwischen, Geschirrspüler ausräumen) als Ein-Tipp-Knöpfe, max. 2× pro Tag |
| Teamlevel | Gemeinsame Punkte minus Abzüge. Jedes Level schaltet eine selbst festgelegte echte Belohnung frei (Pizzaabend, Kino …) |
| Fairnessregel | Teambelohnung erst einlösbar, wenn beide seit dem letzten Level mind. ein Drittel beigetragen haben |
| Persönliches Level | Eigene Punkte, mit Titeln (Putzlehrling, Staubjäger, … Glanzmeister) |
| Überraschungskarten | Jede Person legt verdeckt Gutscheine für die andere in einen Topf. Bei jedem persönlichen Levelaufstieg zieht man eine von bis zu 3 verdeckten Karten. **Der emotionale Höhepunkt der App** |
| Urlaubsmodus | Pausiert die Uhr für beide, nichts wird überfällig |

## Bildschirme heute

| Screenshot | Bildschirm | Inhalt |
|---|---|---|
| `01-heute.png` | **Heute** (Startseite) | Begrüßung, Suche, Ring „x % frisch", Teamlevel mit Wochenpunkten beider, Alltag-Knöpfe, Filter (Alle/Woche/Monat/Quartal), Listen „Überfällig", „Bald fällig", „Später" |
| `02-aufgabe-details.png` | **Aufgabe** (Bottom Sheet) | Bereich, Intervall, Punkte, zuletzt erledigt von wem, „Erledigt"-Knopf, „Von Partner erledigt eintragen" |
| `03-belohnungen.png` | **Belohnungen** | Eigene Überraschungen (ziehen, einlösen), Gutscheine für den Partner hinterlegen, Team-Belohnungen pro Level |
| `04-statistik.png` | **Statistik** | Persönliche Level beider, Beitrag in % (Woche/Monat/gesamt), Minuspunkte, häufigste Aufgaben, Verlauf mit Löschen |
| `05-einstellungen.png` | **Einstellungen** | Wer nutzt das Handy, Namen/Emojis, zweites Handy verbinden (Code), Urlaubsmodus, Punkte anpassen, Regeln |
| `06-heute-dunkel.png` | Heute im Dunkelmodus | |

Außerdem gibt es Momente ohne Screenshot: Levelaufstieg (Modal mit Pokal und Konfetti),
Karte ziehen (3 verdeckte Karten, eine antippen, sie dreht sich um), Toast „+20 Punkte · Rückgängig".

## Aktueller Stil

- Systemschrift (SF Pro auf dem iPhone), Karten mit 16 px Radius, leichte Schatten
- Akzent Petrol `#2E6F73`, Hintergrund warmes Off-White `#F6F4EF`, Dunkelmodus vorhanden
- Bereichsfarben: Küche `#D9662B`, Bäder `#2F7BBF`, Wohnräume `#3E8E54`, Pflanzen `#7A9A1E`, Roboter `#7D55B0`
- Status: gut `#3E8E54`, Warnung `#C98A12`, überfällig `#C8463D`, Urlaub `#1F8FA8`
- Icons: Emojis für Bereiche und Alltag, Linien-Icons in der Tab-Leiste

## Was sich verbessern soll (Ausgangspunkt fürs Gespräch)

- Die Startseite wird bei vielen überfälligen Aufgaben zu einer langen, roten Liste. Wichtiges geht unter
- Wirkt eher wie eine To-do-Liste als wie ein Spiel. Level, Punkte und Belohnungen sind wenig spürbar
- Die Belohnungsseite ist textlastig, obwohl sie der schönste Teil sein sollte
- Emojis als Icons wirken uneinheitlich
- Eigene Ideen und Richtungen sind ausdrücklich erwünscht

## Rahmenbedingungen

- **Gerät:** iPhone, Hochformat, ca. 390 × 844 pt, Bedienung mit einer Hand, Daumenreichweite unten
- **Sprache:** Deutsch, lange Wörter („Geschirrspüler ausräumen") müssen umbrechen dürfen
- **Hell und dunkel** werden beide gebraucht
- **Umsetzung:** reines HTML, CSS und JavaScript ohne Framework. Alles, was sich mit CSS-Variablen,
  Flexbox/Grid, SVG und einfachen CSS-Animationen bauen lässt, ist umsetzbar. Google Fonts sind möglich
- **Inhalte bleiben:** Alle oben genannten Informationen müssen erhalten bleiben, dürfen aber umsortiert,
  zusammengefasst oder auf andere Bildschirme verteilt werden
- **Barrierefreiheit:** ausreichende Kontraste, Tippflächen mind. 44 pt
