# Turtle – mit Python zeichnen

Python-Programme schreiben und die Turtle zeichnen lassen: direkt im Browser, ohne Installation
und ohne Anmeldung. Gestaltung und Bedienung wie in [Kara](https://github.com/masta-nksa/kara),
damit sich die beiden Projekte später auf einer Seite zusammenführen lassen.

Python läuft mit [Skulpt](https://skulpt.org) (Python 3 im Browser, mit eingebautem
Turtle-Modul). Alle Bibliotheken liegen in `vendor/`; die Seite braucht keinen Server und
kein CDN (einzig die Schriften kommen wie in Kara von Google Fonts). Nach dem ersten Besuch
funktioniert sie auch ohne Internet (siehe «Offline»).

## Aufbau

```
index.html                Seite: Editor links, Turtle-Feld rechts
assets/basis.css          Farben Hell/Dunkel, Schrift (unverändert aus Kara)
assets/oberflaeche.css    Raster, Knöpfe, Tempo, Meldungen, Dialoge (Klassen wie in Kara)
assets/turtle.css         Editor, Turtle-Feld, Ausgabe, Programmliste
assets/app.js             Speichern, Teilen, Ablauf (Start/Pause/Weiter, Tempo)
assets/beispiele.js       Startprogramm und Beispiele
laufzeit/skulpt.html      führt das Programm aus (Sandbox-iframe)
sw.js                     Service Worker für den Offline-Betrieb
vendor/                   Skulpt 1.2.0, CodeMirror 5.65.18, lz-string 1.5.0 (mit Lizenzen)
```

## Bedienung

- **Start** führt das Programm aus; während es läuft, wird daraus **Pause**, danach **Weiter**.
  Strg/⌘ + Eingabetaste startet im Editor neu. **Zurücksetzen** bricht ab und leert das Feld.
- **Tempo** hat sieben Stufen wie in Kara (sehr langsam … Turbo) und wirkt auch während des
  Zeichnens. Der Regler multipliziert die Geschwindigkeit aus `speed()`; `speed(0)` bleibt
  sofort, «Turbo» zeichnet jeden Schritt ohne Zwischenbilder.
- Fehler: Die Zeile wird im Editor markiert, darunter erscheint ein kurzer Tipp auf Deutsch.
- `input()` fragt in einem Eingabefeld unter der Ausgabe.
- Das Turtle-Feld ist immer 500 × 500 Punkte gross (Ursprung in der Mitte) und wird auf die
  verfügbare Breite skaliert.

## Speichern und Teilen

- Jede Änderung bleibt im Browser (`localStorage`), auch nach dem Schliessen.
- **Meine Programme**: öffnen, löschen, Datei öffnen (`.py` oder `.json`), alle sichern (`.json`).
- **Herunterladen (.py)** speichert das aktuelle Programm als Python-Datei.
- **Link zum Teilen kopieren** erzeugt `…/#programm=<Inhalt>`: Name und Code stecken
  komprimiert im Link, es wird nichts hochgeladen. Wer den Link öffnet, sieht den Code und wird
  gefragt, ob er übernommen werden soll; gestartet wird nie automatisch. Derselbe Link zweimal
  ergibt kein Duplikat. Danach verschwindet der `#`-Teil aus der Adresszeile.

Der Browser-Speicher gehört zu einem Gerät und einem Browser. Safari kann Daten von Seiten
löschen, die länger nicht besucht wurden; wichtige Programme darum herunterladen.

| Schlüssel | Inhalt |
| --- | --- |
| `turtle.programme.v1` | alle Programme und welches offen ist |
| `turtle.tempo.v1` | Stellung des Tempo-Reglers |

Kara, Checks und Turtle liegen unter `masta-nksa.github.io` und teilen sich den
`localStorage`; die Präfixe `kara.` und `turtle.` halten sie auseinander.

## Offline

- Ist die Seite offen, braucht «Start» kein Netz mehr: `app.js` lädt die Laufzeit
  (`laufzeit/skulpt.html` mit Skulpt) gleich beim Öffnen einmal und setzt sie bei jedem Start
  als `srcdoc` ins iframe, mit den Skripten eingebettet. Ein Sandbox-iframe ohne eigenen
  Ursprung würde den Service Worker nicht erreichen; darum dieser Umweg.
- `sw.js` legt beim ersten Besuch alle Dateien im Browser ab. Danach lässt sich die Seite auch
  ohne Internet öffnen und neu laden (auch auf dem iPad, auch als Lesezeichen auf dem
  Home-Bildschirm). Eigene Dateien kommen zuerst aus dem Netz, damit Änderungen sofort
  ankommen; `vendor/` und die Schriften kommen aus dem Speicher.
- Neue Datei im Repo: in `DATEIEN` in `sw.js` eintragen. Bibliothek in `vendor/` ersetzt:
  `VERSION` in `sw.js` hochzählen.
- Ohne Netz geht nur der Teilen-Link nicht weiter, den man empfängt: Öffnen klappt nur, wenn
  die Seite auf diesem Gerät schon einmal geladen wurde.

## Sicherheit

Das Programm läuft in `laufzeit/skulpt.html` in einem iframe mit `sandbox="allow-scripts"`
(ohne `allow-same-origin`). Es kann darum weder die gespeicherten Programme lesen noch die Seite
verändern. Die Seite und das iframe sprechen nur über `postMessage`.

## Anpassungen an Skulpt

`vendor/` bleibt unverändert. `laufzeit/skulpt.html` ersetzt beim Laden zwei Stellen im
Quelltext des Turtle-Moduls (aus `skulpt-stdlib.js`): Bewegungen und Drehungen fragen den
Tempo-Faktor ab, und Mausklicks rechnen die Skalierung des Feldes heraus. Findet es eine Stelle
nicht (etwa nach einem Skulpt-Update), meldet es das in der Konsole; das Programm läuft trotzdem,
nur ohne Tempo-Regler.

## Lokal testen

```
python3 -m http.server 8000
```
… und `http://localhost:8000/` öffnen.

## GitHub Pages

Settings → Pages → Source: «Deploy from a branch», Branch `main`, Ordner `/ (root)`.
Die leere Datei `.nojekyll` im Root muss bestehen bleiben.

## Lizenzen

Skulpt (MIT), CodeMirror (MIT), lz-string (MIT); Lizenztexte in `vendor/`.
