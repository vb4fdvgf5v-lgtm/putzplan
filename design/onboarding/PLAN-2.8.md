# Plan 2.8: Einrichtung für neue Haushalte

Ziel: Freunde (zunächst nur **Paare**, genau 2 Personen) können über den normalen App-Link einen eigenen
Haushalt anlegen und unabhängig nutzen. Technisch geht das schon heute: Ohne gespeicherten Haushalt
zeigt die App „Neuen Haushalt anlegen“, jeder Haushalt hat einen eigenen 20-stelligen Code, und Supabase
trennt die Daten per RLS (`x-household`-Header, siehe `putz-app/supabase.sql`). Es fehlt der gute Einstieg.

**Klickbarer Prototyp:** [index.html](index.html), lokal über die Launch-Konfiguration (Port frei wählbar,
`python3 -m http.server --directory design/onboarding`), nach dem Push auch unter
https://vb4fdvgf5v-lgtm.github.io/putzplan/design/onboarding/. Der Prototyp ist die Vorlage für Texte und Layout.
Vom Nutzer abgenommen am 26.10.2026.

## Ablauf „Haushalt anlegen“ (6 Schritte nach dem Willkommen)

1. **Willkommen:** Was die App ist. Drei Punkte: dauert 2 Minuten, sanfter Start, nur für euch (kein Konto).
   Knöpfe „Haushalt anlegen“ und „Ich habe einen Einladungslink“.
2. **Wer putzt hier?** Zwei Namen, je eine Farbe (4 Swatches wie in den Einstellungen).
3. **Was habt ihr zu Hause?** Zwei Karten:
   - *Räume:* Badezimmer als Anzahl 1–3 („auch Gäste-WC“). **Wohnräume als Anzahl 1–8, der Flur zählt als
     Wohnraum.** Namen in dieser Reihenfolge: Wohnzimmer, Schlafzimmer, Flur, Arbeitszimmer, Kinderzimmer,
     Gästezimmer, Zimmer 7, Zimmer 8. Vorauswahl 4. Räume später umbenennbar. Die Küche ist immer dabei.
   - *Ausstattung* (Schalter): Saugroboter, Zimmerpflanzen, eigene Waschmaschine, Geschirrspüler, Mikrowelle.
   - Darunter live: „N Aufgaben in eurem Plan“.
4. **Euer Plan:** Gesamtzahl („70 Aufgaben · 31 davon wöchentlich“), darunter die Bereiche zugeklappt mit
   Anzahl. Aufgeklappt: Name, Intervall, Punkte und **nur ein Schalter zum Abwählen**. Punkte, Intervalle und
   Namen bleiben bewusst in den Einstellungen. Hauptknopf „Passt so“.
5. **Wie wollt ihr starten?** „Sanfter Start“ (empfohlen) oder „Direkt loslegen“, mit Balkengrafik
   „erstmals fällig pro Tag, Tag 1–14“.
6. **Drei Überraschungen für <Partner>:** Topf mit drei nummerierten Plätzen und „x von 3“. **Der nächste freie
   Platz ist selbst das Eingabefeld** (lila Rahmen, „Schreib hier deine Idee …“, + oder Enter). Ideen nur als
   Abkürzung („Keine Idee? Antippen zum Übernehmen“), Ton: kleine Gefallen oder romantische Gesten 😉.
   Weiter ab 1 Karte (Regel aus 2.7), Knopftext wechselt („Weiter mit einer Karte“ … „Fertig, 3 Karten im Topf“),
   nach 3 Karten „+ Noch eine Karte“.
7. **<Partner> einladen:** Link teilen, Code kopieren, deutlicher Hinweis „Das ist euer Schlüssel“.
   Knöpfe „Plan starten“ und „Später einladen“.

Danach Startseite mit Banner „Eingewöhnung · noch 14 Tage“ (Fortschrittsbalken) und Hinweis
„Eine Aufgabe passt nicht zu euch? Einfach antippen und ausblenden.“

## Ablauf „Beitreten“ (Partner öffnet `?join=CODE`)

„<Name> hat euch einen Putzplan angelegt“ → „Wer bist du?“ → Überraschungen für den anderen (gleicher Schritt
wie oben). Wohnung und Plan sind schon eingerichtet.

## Sanfter Start (Eingewöhnung)

Problem heute: Alle Aufgaben starten „halb frisch“, also werden alle 34 Wochenaufgaben **gleichzeitig am 4. Tag**
fällig, alle Monatsaufgaben am 15. Tag.

- **Verteilt fällig:** erste Fälligkeit der Wochenaufgaben verteilt über Tag 2–7, 2-Wochen-Aufgaben über die
  ersten 2 Wochen, Monatsaufgaben über die ersten Wochen (Quartal entsprechend). Umsetzung vermutlich über
  ein `since` je Aufgabe beim Anlegen (gibt es seit 2.2 in `compute`, `task.since`), gestaffelt.
- **14 Tage ohne Minuspunkte:** Überfälliges wird angezeigt, Punkte gibt es normal, aber keine Abzüge fürs Team.
  Regel gehört in `js/game.js` (mit Tests), z. B. `settings.graceUntil`.
- „Direkt loslegen“ = heutiges Verhalten.

## Aufgaben aus Räumen und Ausstattung

- Mit Anzahlen statt Schaltern muss die App Aufgaben **aus Vorlagen erzeugen**: je Wohnraum „Aufräumen: X“,
  „Staubwischen: X“, „Fenster putzen: X“ (Flur ohne Fenster); Bad 3 aus den Bad-2-Aufgaben.
- Der Prototyp zeigt die Zuordnung: Ausstattung `f:robo|pflanzen|waschma|spuelma|mikro`, `bath2`,
  `room:Arbeitszimmer` (für „Technik entstauben“). Raumspezifisches wie Teppich oder Bettwäsche bleibt allgemein
  und ist ausblendbar.
- **Bestehender Haushalt (Matthes) darf sich nicht ändern:** gleiche Aufgaben-IDs, gleicher Verlauf.
  Neue Haushalte bekommen die Einrichtung, der bestehende nicht.

## Offene Punkte

- Ohne Saugroboter fehlt „Böden saugen“ im Katalog → neue Aufgabe, nur wenn kein Roboter gewählt.
- Flur hat im heutigen Katalog nur „Staubwischen“; im Prototyp aus Vorlage Aufräumen + Staubwischen.
- Topf unter Belohnungen → „Für <Partner>“ an das Design aus Schritt 6 angleichen.
- Supabase Free reicht für einige Haushalte; das Projekt pausiert nur nach 7 Tagen ohne jede Nutzung.
- Code ist der einzige Schlüssel (kein Konto): Support-Fälle „Code verloren“ sind nicht lösbar.
- Mehr als 2 Personen (WGs) bewusst später, eher 3.0 (Fairnessregel, Topf „für den Partner“ usw.).
