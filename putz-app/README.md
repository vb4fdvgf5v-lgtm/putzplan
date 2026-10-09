# Putzplan-App

Gemeinsamer Putzplan für zwei Personen als Web-App fürs iPhone: Aufgaben abhaken, Punkte sammeln,
Team- und persönliche Level, verdeckte Überraschungen vom Partner. Kostenlos, ohne App Store.

## Spielregeln

| Regel | Wert |
|---|---|
| Punkte pro Aufgabe | nach Schwierigkeit: 3 · 5 · 10 · 15 · 20 · 30 · 50 (in der App änderbar) |
| Überfällig | Team verliert pro Tag 10 % der Aufgabenpunkte, höchstens 10 Tage lang |
| Rettungsbonus | +50 % aufs persönliche Level für überfällige Aufgaben |
| Zu früh erledigt | Punkte erst wieder nach der Hälfte des Intervalls |
| Persönliches Level | eigene Punkte ohne Abzüge; jeder Aufstieg = eine Karte aus dem Überraschungstopf des Partners |
| Teamlevel | Summe minus Abzüge; einmal erreicht, bleibt es erreicht |
| Teambelohnung einlösen | nur, wenn beide seit dem vorigen Teamlevel mindestens ein Drittel beigetragen haben |

Regeln und Schwellen stehen in [js/game.js](js/game.js), die Aufgaben in [js/tasks.js](js/tasks.js).

## Einrichtung (einmalig, ca. 20 Minuten)

Ohne Schritt 1 läuft die App nur auf einem Gerät. Zum Ausprobieren reicht das.

### 1. Datenbank: Supabase (kostenlos)

1. Auf [supabase.com](https://supabase.com) ein Konto anlegen und ein neues Projekt erstellen
   (Region Frankfurt, Free Plan).
2. Links **SQL Editor** öffnen, den Inhalt von [supabase.sql](supabase.sql) einfügen und **Run** drücken.
3. Unter **Project Settings → API** zwei Werte kopieren: die **Project URL** und den **anon public** Key.
4. Beide in [js/config.js](js/config.js) eintragen.

Der anon-Key ist dafür gedacht, im Browser zu stehen. Eure Daten schützt der Haushaltscode, den die App beim
Anlegen erzeugt: Ohne ihn kann niemand eure Einträge lesen oder ändern. Den Code nur untereinander teilen.

Hinweis: Kostenlose Supabase-Projekte pausieren nach 7 Tagen ohne Zugriff. Bei regelmäßiger Nutzung passiert
das nicht; sonst im Supabase-Dashboard auf **Restore** klicken.

### 2. Online stellen: GitHub Pages (kostenlos)

1. Auf GitHub ein neues **öffentliches** Repository anlegen, z. B. `putzplan`.
2. Den Inhalt dieses Ordners hochladen (Weboberfläche: **Add file → Upload files**).
3. **Settings → Pages → Branch: main, Ordner: / (root)** → **Save**.
4. Nach etwa einer Minute läuft die App unter `https://<dein-name>.github.io/putzplan/`.

Alternative ohne Git: [Netlify Drop](https://app.netlify.com/drop), den Ordner ins Browserfenster ziehen.

### 3. Auf beide iPhones

1. **Dein iPhone:** die Adresse in Safari öffnen → Haushalt anlegen → **Teilen → Zum Home-Bildschirm**.
2. In der App unter **Einstellungen → Zweites Handy verbinden → Link teilen** den Link an deine Freundin schicken.
3. **Ihr iPhone:** Link in Safari öffnen → **Beitreten** → **Teilen → Zum Home-Bildschirm**.
   Fragt die installierte App erneut nach dem Haushalt: unter „Haushalt beitreten“ den Code einfügen
   (Einstellungen → Code kopieren). Safari und Home-Bildschirm-App haben auf dem iPhone getrennten Speicher.

## Entwicklung

```bash
python3 -m http.server 8780
```

Dann <http://localhost:8780> öffnen. Tests der Spielregeln:

```bash
node --test test/game.test.mjs
```

Nach Änderungen an Dateien die `VERSION` in [sw.js](sw.js) hochzählen, damit die iPhones die neue Fassung laden.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html`, `styles.css` | Gerüst und Gestaltung, hell und dunkel |
| `js/tasks.js` | Aufgabenkatalog mit Bereich, Intervall und Punkten |
| `js/game.js` | Spielregeln: Frische, Abzüge, Level, Fairness; ohne DOM, mit Node testbar |
| `js/store.js` | lokaler Speicher und Abgleich mit Supabase (eine Tabelle `items`) |
| `js/app.js` | Oberfläche: Heute, Belohnungen, Statistik, Einstellungen |
| `sw.js`, `manifest.webmanifest` | Offline-Fähigkeit und Installation auf dem Home-Bildschirm |
| `supabase.sql` | Tabelle und Zugriffsregeln für Supabase |

## Ideen für später

- Push-Erinnerungen, wenn etwas überfällig wird
- Putztipps aus dem Putzplan direkt in der Aufgabe
- Eigene Aufgaben anlegen
- Abzeichen (Fenster-Held, Frühaufsteher, Rettung in letzter Sekunde)
- Wochenziel mit Serie
