# Hinweise für die Arbeit an diesem Repo

Fachliche Doku (Aufbau, Bedienung, Speichern, Teilen): siehe `README.md`.

## Projekt

- Turtle: Python-Programme im Browser schreiben, die Turtle zeichnet (Skulpt).
- Schwesterprojekt von `masta-nksa/kara`. Vorerst unabhängig; später vielleicht auf einer Seite
  umschaltbar. Darum Layout, Farben, Begriffe und Bedienung wie in Kara halten
  (`assets/basis.css` unverändert aus Kara, Klassen `bk-…` in `oberflaeche.css` wie dort).
- Statisch: HTML/CSS/JS ohne Build. Bibliotheken nur lokal in `vendor/`, unverändert.
  GitHub Pages aus `main`, Root; `.nojekyll` muss bleiben.
  Pages-Einstellungen und neue Repos richtet die Lehrperson selbst ein.

## Konventionen

- Oberfläche auf Deutsch (Schweiz, «ss» statt «ß»), Anrede «Sie», Anführungszeichen «…».
- Code-Namen ebenfalls deutsch, Kommentare knapp.
- `localStorage`-Schlüssel beginnen mit `turtle.`; bei Formatwechsel Version hochzählen.
- Schülercode läuft nur im Sandbox-iframe (`laufzeit/`), nie in der Seite selbst.
  Geteilte Programme werden nie automatisch gestartet.
- Keine Nutzungsstatistik (GoatCounter nur in Kara).
- Offline: neue Dateien in `DATEIEN` in `sw.js` eintragen; `vendor/` geändert → `VERSION` hochzählen.

## Testen

```
python3 -m http.server 8123          # im Repo-Root
fuser -k 8123/tcp                    # Server beenden (nicht pkill -f)
```

Playwright mit Chromium unter `/opt/pw-browsers/chromium`; Testskripte nur im Scratchpad.
Bewährt: Start/Pause/Weiter, Tempo während des Laufs umstellen, Endlosschleife pausieren,
`input()`, Fehlerzeile, Neuladen (Programm und Tempo bleiben), Teilen-Link in zweitem Kontext,
kaputter Link, Handy-Breite (kein horizontales Scrollen), Hell/Dunkel, offline
(`context.setOffline(true)`: Seite offen ohne Service Worker, und mit Service Worker neu laden).
