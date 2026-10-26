# Putzplan-App: Übergabe für Claude

Gamifizierter Putzplan für zwei Personen als Web-App (PWA) auf zwei iPhones.
Fachliche Regeln, Aufbau und Einrichtung stehen in [putz-app/README.md](putz-app/README.md).
Design-Kontext: [design/DESIGN-BRIEF.md](design/DESIGN-BRIEF.md) (Ausgangslage vor 2.0). Umgesetztes Design 2.0:
[design/handoff-v2/README.md](design/handoff-v2/README.md), Prototyp per Launch-Konfiguration `putz-design` (Port 8781), maßgeblich 3a, 4c, 5b, 7a.

## Stand und nächster Schritt (26.10.2026)

- **2.8 gebaut und committet** (Einrichtung für neue Haushalte, sanfter Start). Entscheidungen:
  [design/onboarding/PLAN-2.8.md](design/onboarding/PLAN-2.8.md), Vorlage: [design/onboarding/index.html](design/onboarding/index.html).
- Neue Haushalte haben `settings.setup` und bekommen ihren Plan aus `planTasks` (`js/tasks.js`), der bestehende
  Haushalt hat kein `setup` und rechnet unverändert mit `TASKS`. Das muss so bleiben.
- Was 2.2–2.8 gebracht haben, steht kurz im [CHANGELOG.md](CHANGELOG.md).

## Arbeitsweise

- **Code:** `putz-app/` (Vanilla JS, keine Abhängigkeiten). Aufgabenkatalog in `js/tasks.js`,
  Spielregeln in `js/game.js` (rein, mit Node testbar), Oberfläche in `js/app.js`, Sync in `js/store.js`.
- **Vorschau:** Launch-Konfiguration `putz-app` (Port 8780) aus `Claude Projekte/.claude/launch.json`.
- **Nie gegen den echten Haushalt testen.** Die normale Vorschau ist mit den echten Supabase-Daten
  verbunden. Zum Ausprobieren `http://localhost:8780/?demo` nutzen: eigener Test-Haushalt mit
  Beispieldaten, ohne Supabase. `?demo&new` startet stattdessen die Einrichtung (Demo-Haushalt wird
  dafür auf dem Gerät abgemeldet). `&view=rewards|stats|settings` und `&sheet=<taskId>` öffnen direkt
  eine Ansicht.
- **Tests:** `node --test putz-app/test/game.test.mjs` nach jeder Regeländerung.
- **Nach jeder Änderung** `VERSION` in `putz-app/sw.js` hochzählen, sonst laden die iPhones die neue Fassung nicht.
- **Aufgaben-IDs nie ändern**, nur Namen und Punkte. Der Verlauf hängt an den IDs. Gestrichene Aufgaben
  nach `RETIRED` in `js/tasks.js` verschieben, damit der Verlauf ihre Namen kennt.
- Seit 2.2 lassen sich Aufgaben auch in der App anlegen, bearbeiten und ausblenden (Items `task`).
  Was in der App angepasst ist, überschreibt `js/tasks.js`. Vor Änderungen am Katalog also bedenken,
  dass der echte Haushalt eigene Anpassungen haben kann.
- **Deploy:** Claude committet (lokale Git-Identität ist die anonyme GitHub-Noreply-Adresse,
  nie die Firmenadresse). Pushen macht der Nutzer selbst über GitHub Desktop („Push origin"),
  auf diesem Mac ist kein GitHub-Login für die Kommandozeile eingerichtet. GitHub Pages
  veröffentlicht nach ca. 1 Minute unter https://vb4fdvgf5v-lgtm.github.io/putzplan/putz-app/.
- **Icons:** Material Symbols, in `index.html` nur die verwendeten per `icon_names=` (alphabetisch).
  Neues Icon in `app.js` oder `tasks.js` → dort ergänzen, sonst erscheint der Name als Text.
- **Worktree-Sitzungen:** Arbeit im eigenen Worktree committen, dann im Haupt-Checkout
  `putzplan/` per `git merge --ff-only <branch>` auf `main` bringen. Vorher `git status -sb` und `git log` dort
  prüfen: Andere Sitzungen committen ebenfalls auf `main` (so kam 2.5). Liegt dort Neues, erst mit dem
  App-Werkzeug `sync_with_base_branch` (Basis `main`) in den Worktree holen, Konflikte lösen, dann zusammenführen.
  Die Root-Launch-Konfiguration zeigt auf den Haupt-Checkout; für den Worktree eine eigene
  `.claude/launch.json` im Worktree anlegen (nicht committen).
- **Testnamen:** in Demo und Prototypen nur die Platzhalter Alex und Sam verwenden, keine anderen Namen.
- **Screenshots** für das Design-Briefing: `design/screenshots/`, erzeugt mit Chrome headless
  gegen `?demo` (Fensterbreite 500, da Chrome headless schmaler nicht kann).

## Stolpersteine in der Oberfläche

- `render()` baut die ganze Seite per `innerHTML` neu. Der Sync zeichnet direkt nach jeder Änderung mehrmals
  neu (gespeichert, „synchronisiere …“, „alles synchron“). Deshalb: Animationen nicht bei jedem Neuzeichnen neu
  starten (Toast: negative `animation-delay` ab `ui.toast.at`; offenes Fenster: Animation aus), Scrollposition
  seitlicher Reihen retten (Alltag-Reihe), Eingaben über den `input`-Handler in `ui` spiegeln.
  Im Demo-Modus gibt es keinen Sync, solche Effekte sieht man dort nicht.
- iOS: Eingabefelder mindestens 16 px, sonst zoomt Safari beim Antippen. Fenster mit Eingabefeld
  (`.modal.form`) oben verankern, nicht automatisch fokussieren.
- Nach dem Neustart des Vorschau-Servers kann der Service Worker eine alte Fassung liefern: im Browser
  Service Worker abmelden und Caches leeren, dann neu laden.

## Versionen und Release-Notes

- Jede Veröffentlichung mit sichtbaren Änderungen bekommt eine neue Version: `APP_VERSION` in
  `putz-app/js/app.js` hochzählen und oben in [CHANGELOG.md](CHANGELOG.md) eintragen:
  kleiner Fix → Patch (2.3 → 2.3.1), neue Funktion → Minor (2.3 → 2.4), großer Umbau → Major (2.x → 3.0).
  Reine Technik-Änderungen ohne sichtbaren Effekt: keine neue Version.
  Vor dem Festlegen mit `git status -sb` im Haupt-Checkout prüfen, ob die letzte Version schon gepusht ist;
  wenn nicht, die Änderung in diese Version aufnehmen statt eine neue anzulegen.
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
- Leerer Überraschungstopf (keine offene Karte von mir für den Partner) sperrt auf meinem Gerät nur das Abhaken,
  nicht das Ansehen; eine Karte genügt (seit 2.7)
- Urlaubsmodus pausiert die Uhr für den ganzen Haushalt
- Alltag: tägliche Ein-Tipp-Aufgaben (Küche 3×, max. 2× pro Tag; Wäsche waschen max. 1× pro Tag), keine Fälligkeit
- Design 2.0: nur Dunkelmodus (Hellmodus vorerst nicht), Personen als Initiale mit wählbarer Farbe statt Emoji
- Einladen: langer Haushaltscode bleibt (er ist der Schlüssel zu den Daten), Hauptweg ist der Link `?join=CODE`;
  kein kurzer Code mit Ablauf. „Verbunden“ erkennt die App am Item `presence-<Spieler>`, das jedes Gerät einmal schreibt

## Ideen für später

Urlaub mit Enddatum, Push-Erinnerungen, Putztipps in der Aufgabe, Abzeichen, Wochenziel mit Serie,
„Haushalt löschen"-Knopf, Hellmodus.
