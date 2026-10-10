# Putzplan-App: Übergabe für Claude

Gamifizierter Putzplan für zwei Personen als Web-App (PWA) auf zwei iPhones.
Fachliche Regeln, Aufbau und Einrichtung stehen in [putz-app/README.md](putz-app/README.md).
Design-Kontext: [design/DESIGN-BRIEF.md](design/DESIGN-BRIEF.md).

## Arbeitsweise

- **Code:** `putz-app/` (Vanilla JS, keine Abhängigkeiten). Aufgabenkatalog in `js/tasks.js`,
  Spielregeln in `js/game.js` (rein, mit Node testbar), Oberfläche in `js/app.js`, Sync in `js/store.js`.
- **Vorschau:** Launch-Konfiguration `putz-app` (Port 8780) aus `Claude Projekte/.claude/launch.json`.
- **Nie gegen den echten Haushalt testen.** Die normale Vorschau ist mit den echten Supabase-Daten
  verbunden. Zum Ausprobieren `http://localhost:8780/?demo` nutzen: eigener Test-Haushalt mit
  Beispieldaten, ohne Supabase. `&view=rewards|stats|settings` und `&sheet=<taskId>` öffnen direkt
  eine Ansicht.
- **Tests:** `node --test putz-app/test/game.test.mjs` nach jeder Regeländerung.
- **Nach jeder Änderung** `VERSION` in `putz-app/sw.js` hochzählen, sonst laden die iPhones die neue Fassung nicht.
- **Aufgaben-IDs nie ändern**, nur Namen und Punkte. Der Verlauf hängt an den IDs.
- **Deploy:** Claude committet (lokale Git-Identität ist die anonyme GitHub-Noreply-Adresse,
  nie die Firmenadresse). Pushen macht der Nutzer selbst über GitHub Desktop („Push origin"),
  auf diesem Mac ist kein GitHub-Login für die Kommandozeile eingerichtet. GitHub Pages
  veröffentlicht nach ca. 1 Minute unter https://vb4fdvgf5v-lgtm.github.io/putzplan/putz-app/.
- **Screenshots** für das Design-Briefing: `design/screenshots/`, erzeugt mit Chrome headless
  gegen `?demo` (Fensterbreite 500, da Chrome headless schmaler nicht kann).

## Versionen und Release-Notes

- Jede Veröffentlichung mit sichtbaren Änderungen bekommt eine neue Version: `APP_VERSION` in
  `putz-app/js/app.js` hochzählen (1.3 → 1.4; neue große Funktion oder Umbau → 2.0) und oben in
  [CHANGELOG.md](CHANGELOG.md) eintragen. Reine Technik-Änderungen ohne sichtbaren Effekt: keine neue Version.
- **Nach jedem Commit, den der Nutzer pushen soll, Release-Notes direkt im Chat schreiben**, zum
  Weiterschicken an die Mitbewohnerin. Format:
  - Erste Zeile: `Putzplan 1.4 ist da 🎉` (bzw. die neue Versionsnummer)
  - 1 bis 3 Stichpunkte, je ein kurzer Satz, Alltagssprache, aus Sicht der Nutzerin: was ist neu,
    was ändert sich für sie, wo findet sie es
  - Keine Technik (kein Code, Cache, Supabase, Commit), keine Erklärung des Warum
  - Hinweis zum Aktualisieren nur, wenn nötig: „App einmal ganz schließen und neu öffnen“

## Punkte-Tabelle

Interaktive Tabelle zum Bearbeiten von Punkten und Namen:
https://claude.ai/artifact/6oLgM4v3bzxV162sW5ahF8 (Collection `tasks`, Doc-ID = Aufgaben-ID).
Ablauf bei „Punkte übernehmen": Collection lesen, Abweichungen (`points` ≠ `defaultPoints`,
`name` ≠ `originalName`, `active: false`, `isNew`) in `js/tasks.js` übernehmen, danach die Tabelle
mit dem neuen Katalog als Ausgangswert neu abgleichen (`defaultPoints`/`originalName` setzen,
Gestrichenes löschen, Neues mit sauberer ID anlegen).

## Getroffene Entscheidungen

- Eigene App, kein Geld (deshalb PWA statt App Store, Supabase Free, GitHub Pages)
- Aufgaben frei wählbar, nicht zugewiesen; Punkte nach Schwierigkeit, nicht nach Zeit
- Minuspunkte nur fürs Team, persönliches Level ohne Aufholbonus
- Überraschungskarten vom Partner, verdeckt aus bis zu 3 ziehen
- Urlaubsmodus pausiert die Uhr für den ganzen Haushalt
- Alltag: 3 tägliche Ein-Tipp-Aufgaben, max. 2× pro Tag, keine Fälligkeit

## Ideen für später

Urlaub mit Enddatum, Push-Erinnerungen, Putztipps in der Aufgabe, Abzeichen, Wochenziel mit Serie,
„Haushalt löschen"-Knopf, Design-Überarbeitung (siehe Briefing).
