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
assets/fehlerhilfe.js     erklärt Python-Fehler auf Deutsch (ohne DOM, auch mit node testbar)
assets/befehle.js         Kurzbeschreibung der Befehle für die Kurzhilfe (ohne DOM)
assets/kurs.js            Kursadresse auflösen, kurs.json prüfen, Texte zerlegen (ohne DOM)
assets/pruefung.js        Zeichnung mit dem Zielbild vergleichen, Zielbild-Werkzeug (ohne DOM)
assets/kursmodus.js       Kursmodus: Reihen, Aufgaben, Fortschritt (nur mit ?kurs=…)
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
- `input()` fragt in einem Eingabefeld unter der Ausgabe.
- Das Turtle-Feld zeigt −250 … 250 in beide Richtungen (Ursprung in der Mitte) und wird auf die
  verfügbare Breite skaliert. Verlässt die Turtle diesen Bereich, zoomt die Ansicht weich heraus,
  bis höchstens −750 … 750; unter dem Feld steht dann «Herausgezoomt: … %». Die Leinwand ist
  dafür 1500 × 1500 gross; `turtle.window_width()` liefert darum 1500.
- Unter der Zeichnung liegen immer Kacheln zu 50 Einheiten. Beim Herauszoomen werden sie enger,
  und ein gestrichelter Rahmen zeigt das ursprüngliche Feld; so ist der Zoom jederzeit sichtbar.
- **Koordinatensystem einblenden** (Schalter über dem Feld) ergänzt Achsen, Zahlen und ein
  gröberes Gitter, passend zum Zoom, und zeigt die Position der Turtle. Die Wahl merkt sich der
  Browser.
- Über dem Feld zeigt ein kleines Schild beim Zeiger die Koordinaten, z. B. «(120, −40)»; am
  Rand wechselt es auf die andere Seite. Auf dem iPad erscheint es beim Antippen für 1,5 s.
  Umgerechnet wird mit der aktuellen Ansicht, die Werte stimmen also auch beim Herauszoomen
  (gleich wie `onscreenclick`).
- **Vollbild** (Knopf oben rechts in beiden Bereichen):
  - beim Programm: Der Editor füllt den Bildschirm, rechts bleiben Turtle-Feld, Start, Tempo und
    Ausgabe klein sichtbar (auf dem Handy darunter, ohne die Leisten «Neu …» und «Teilen …»);
  - beim Turtle-Feld: Das Feld wird so gross wie möglich, Steuerung und Ausgabe stehen daneben
    (im Hochformat darunter).
  Wo der Browser es erlaubt, blendet der Vollbildmodus auch die Browserleisten aus; Esc oder
  «Verkleinern» beendet ihn. Wo nicht (z. B. iPhone), füllt die Ansicht trotzdem das Fenster.

## Kurzhilfe

Unter dem Editor steht in einer Zeile mit fester Höhe, was der Befehl unter dem Cursor macht,
z. B. «`circle(radius, winkel, ecken)` Kreis mit der Mitte links der Turtle …». Sie erscheint auch,
während man die Argumente in den Klammern tippt; Texte und Kommentare zählen nicht. Die Liste
steht in `assets/befehle.js` (Turtle-Befehle, die im Tool gehen, dazu Python-Befehle und
Schlüsselwörter wie `for` und `def`; ohne DOM, mit node testbar).

## Spiele (Tasten, Klicks, Timer)

Meldet ein Programm mit `onkey`, `onscreenclick`, `onclick` oder `ontimer` etwas an, läuft es
nach dem Ende des Hauptprogramms weiter. Unter «Start» steht dann «Läuft weiter: wartet auf
Tasten, Klicks oder den Timer.», «Start» heisst «Pause» und hält auch diese Aufrufe an;
«Zurücksetzen» beendet das Programm. Das Feld bekommt den Fokus, die Tasten wirken also sofort.
Fehler in solchen Aufrufen werden wie gewohnt gemeldet. Mit `tracer(0)` und `update()` zeichnen
Spiele flüssig.

## Beispiele und Schreibweise

Alle Beispiele und «Neu» beginnen mit `from turtle import *`: Die Befehle stehen dann ohne
Objekt davor (`forward(100)` statt `t.forward(100)`), die Hürde mit Objekten fällt am Anfang
weg. `import turtle` mit `t = turtle.Turtle()` funktioniert weiterhin, und die Fehlerhilfe
erkennt, welche Schreibweise ein Programm verwendet. Neben den Turtle-Befehlen bietet
`from turtle import *` auch `bgcolor`, `listen`, `onkey`, `onscreenclick`, `ontimer`,
`exitonclick` u. a. an (in Skulpt sonst nicht; siehe «Anpassungen an Skulpt»).
`setup()` und `setworldcoordinates()` fehlen bewusst, weil sie sich nicht mit dem Zoom vertragen.

## Fehlerhilfe

Bei einem Fehler wird die Zeile im Editor markiert. Die Meldung unter dem Feld zeigt den Ort
(bei Funktionen auch, von wo sie aufgerufen wurde), die Zeile selbst, eine Erklärung auf Deutsch,
einen konkreten Tipp («Meinten Sie «left»?») und die Originalmeldung von Python. «Mehr zu diesem
Fehler» klappt eine allgemeine Erklärung mit einem Beispiel «So nicht / So geht es» auf. In der
Ausgabe steht der Verlauf wie in Python (Traceback).

Skulpt meldet Syntaxfehler nur als «bad input» und oft eine Zeile zu spät (etwa bei einer
fehlenden Klammer). `fehlerhilfe.js` sucht darum selbst: fehlender Doppelpunkt, fehlende oder
überzählige Klammer, offenes Anführungszeichen, Einrückung, `=` statt `==`, `print` ohne Klammern.
Bei unbekannten Namen und Befehlen schlägt sie ähnliche Namen aus dem Programm, aus Python und aus
dem Turtle-Modul vor.

## Kursmodus

`?kurs=…` öffnet einen Kurs mit Reihen und Aufgaben, Bedienung und Aussehen wie in Kara. Ohne
`?kurs=` bleibt alles wie oben. Die Aufgaben liegen nicht im Tool, sondern in einem eigenen Repo,
z. B. [masta-nksa/turtle-aufgaben](https://github.com/masta-nksa/turtle-aufgaben):

| Aufruf | lädt |
| --- | --- |
| `?kurs=turtle-aufgaben/beispiel` | `<Ordner über dem Tool>/turtle-aufgaben/beispiel/kurs.json`, also `https://masta-nksa.github.io/turtle-aufgaben/beispiel/kurs.json` |
| `?kurs=besitzer/repo/kurs` | `https://besitzer.github.io/repo/kurs/kurs.json` (eigene Kurs-Repos anderer Lehrpersonen; GitHub Pages erlaubt den Abruf) |

Jeder Teil der Adresse darf nur Buchstaben, Ziffern, `.`, `_` und `-` enthalten (kein `..`).
Dazu kommen `&reihe=…&aufgabe=…`; die Adresszeile folgt der gewählten Aufgabe.

- **Kopf:** eine Zeile mit dem Kurstitel, «Übersicht», «Konzepte» und ⋯ (darin «Ohne Kurs
  programmieren»).
- **Lernpfad:** Die Reihen (Einheiten) stehen als Kreise in einer Zeile; der Ring zeigt den Anteil
  erledigter Pflichtaufgaben, beim Darüberfahren erscheint der Titel. Daneben die aktuelle Reihe mit
  «erledigt / Pflicht». Darunter die Aufgaben der Reihe als Stationen einer Linie, gegliedert nach
  Abschnitten («Entdecken», «Konzepte sichern», «Lernkontrolle»): grün = automatisch geprüft,
  grau = selbst abgehakt, Ring = aktuelle Aufgabe, eckig = Lernkontrolle, ★ neben der Linie =
  Zusatzaufgabe. Beim Darüberfahren erscheint der Titel. Auf dem Handy lassen sich beide Zeilen
  waagrecht wischen.
- **Übersicht** (Fenster): alle Reihen mit Abschnitten, Aufgaben, Stand und Balken; ein Klick
  öffnet die Aufgabe.
- **Aufgabenkarte:** Ort («2 · Wiederholen · Entdecken · 5 von 14»), Titel, «‹ Zurück / Weiter ›»
  (durch alle Reihen; am Ende einer Reihe «Nächste Einheit ›»; weiterführende Reihen bilden je
  einen eigenen Pfad), «Einklappen» (merkt sich der Browser). Darin Etiketten (★ Zusatzaufgabe,
  Lernkontrolle, Konzepte zum Nachlesen), Text, Fragen, Checkliste, Bild, gestufte Hinweise,
  «Als erledigt markieren», «Link zum Teilen kopieren» (öffnet genau diese Aufgabe).
- **Vorhersage** (`vorhersage: true`): ein Feld «Ihre Vorhersage». Ist es leer, hält «Start» beim
  ersten Mal an und bietet «Vorhersage aufschreiben» oder «Ohne Vorhersage starten». Nach dem ersten
  Start: «Stimmte Ihre Vorhersage? Ja / Teilweise / Nein». Text und Antwort bleiben im Browser.
- **Lernkontrollen** zeigen einen Hinweis, solange die Pflichtaufgaben davor nicht erledigt sind
  («Empfohlen, wenn …»), und sind im Pfad blasser. Mit `freigabe` (Anteil, z. B. 0.7) bei der Reihe
  öffnen sie sich erst ab diesem Anteil; vorher lässt sich das Programm nur lesen.
- **Konzepte** (Knopf oben): Erklärungen mit Beispielen, die zum Kurs gehören.
- **Programm je Aufgabe:** Beim ersten Öffnen steht der Startcode da (oder bei `weiterVon` das
  eigene Programm der genannten Aufgabe). «Zurück zum Startcode» fragt zuerst. «Neu», «Beispiele»
  und «Meine Programme» sind im Kurs ausgeblendet; «Programm als Link kopieren» und
  «Herunterladen (.py)» bleiben.
- **Erledigt** auf zwei Wegen: automatisch geprüft (grüner Haken) oder selbst abgehakt (grauer
  Haken, lässt sich zurücknehmen). Gespeichert wird beides getrennt.
- **Zielbild als Vorlage einblenden** (Schalter über dem Feld) legt das Ziel blass unter die
  Zeichnung; die Breite der Linien zeigt ungefähr die Toleranz.
- Startcode läuft wie alles nur nach «Start». Kursdaten erscheinen nur als Text, nie als HTML.
- Lässt sich ein Kurs nicht laden, erscheint der Grund, und das Tool läuft ohne Kurs weiter.

### Automatische Prüfung

Geprüft wird nur das Ergebnis, nie der Code. Die Laufzeit sammelt alle Strecken mit gesenktem
Stift (auch Kreise, die Skulpt aus kurzen Strecken zeichnet), alle Punkte (`dot`) und alle
Füllflächen; `clear()` und `reset()` entfernen sie wieder. Nach dem Lauf vergleicht
`pruefung.js`:

- **Linien:** Ziel und Zeichnung werden in Abständen von höchstens 1 abgetastet. *Abdeckung* =
  Anteil der Zielpunkte, bei denen eine gezeichnete Linie näher als `toleranz` liegt;
  *Genauigkeit* = Anteil der gezeichneten Punkte nahe am Ziel. Beide müssen mindestens
  `schwelle` erreichen (Vorgabe 6 und 0.95). Reihenfolge, Richtung, doppelt gezeichnete Linien und
  die Annäherung von Kreisen spielen so keine Rolle.
- **Farben** nur, wo ein Zielelement eine `farbe` hat (Name oder `#rrggbb`, verglichen über den
  Browser; Deckkraft zählt nicht).
- **Punkte:** Jeder Zielpunkt muss vorkommen (Ort, ungefähre Grösse, ggf. Farbe), keiner zu viel.
- **Flächen:** Die gerasterten Flächen müssen sich zu mindestens 90 % decken. Linien auf dem Rand
  oder innerhalb einer Zielfläche gelten nicht als daneben.

Die Rückmeldung sagt, was fehlt («Vom Zielbild fehlt noch etwas: 70 % sind gezeichnet», «Die
Farbe stimmt noch nicht», «Ein Punkt fehlt» …). Spiele, Zufallsbilder und freie Aufgaben haben
kein Ziel; sie werden selbst abgehakt.

### Aufgabenformat (`kurs.json`)

```json
{
  "format": 1,
  "titel": "Programmieren mit der Turtle",
  "untertitel": "…",
  "konzepte": [
    { "id": "schleifen", "titel": "Schleifen", "text": "Mit `for` wiederholen …\n\n```\nfor i in range(4):\n    forward(100)\n```" }
  ],
  "reihen": [
    { "id": "wiederholen", "titel": "2 · Wiederholen", "untertitel": "…",
      "aufgaben": [
        { "id": "achteck", "titel": "Achteck", "abschnitt": "Entdecken",
          "text": "Zeichnen Sie ein Achteck mit Seitenlänge 50 …",
          "konzepte": ["schleifen"],
          "hinweise": ["Acht Ecken, zusammen eine ganze Drehung: 360 : 8."],
          "startcode": "from turtle import *\n\n",
          "ziel": { "elemente": [ { "art": "linienzug", "punkte": [[0, 0], [50, 0], [85.4, -35.4]] } ] } }
      ] }
  ]
}
```

Kurs: `format` (1), `titel`, optional `untertitel`, `konzepte`, `reihen` (1–30).
Reihe: `id`, `titel`, optional `untertitel`, `kurz` (1–3 Zeichen im Kreis des Lernpfads; sonst
die Zahl am Anfang des Titels oder sein erster Buchstabe), `weiterfuehrend: true` (gestrichelt,
eigener Pfad), `freigabe` (0–1: Lernkontrollen erst ab diesem Anteil erledigter Aufgaben davor),
`aufgaben` (1–80).

| Feld der Aufgabe | Bedeutung |
| --- | --- |
| `id` | Pflicht; Kleinbuchstaben, Ziffern, `-`, `_`; eindeutig im ganzen Kurs (Fortschritt und Programm hängen daran) |
| `titel`, `text` | Pflicht |
| `abschnitt` | Zwischentitel in der Reiterleiste, gilt ab dieser Aufgabe (z. B. «Entdecken») |
| `fragen` | nummerierte Fragen zum Code |
| `hinweise` | Tipps, die nacheinander erscheinen |
| `checkliste` | Punkte zum Selbst-Prüfen (Spiele, freie Aufgaben) |
| `konzepte` | ids aus `konzepte`; erscheinen als Etiketten |
| `startcode` | Programm beim ersten Öffnen (sonst `from turtle import *`) |
| `weiterVon` | id einer früheren Aufgabe: beim ersten Öffnen deren Programm übernehmen |
| `vorhersage: true` | Hinweis «Überlegen Sie zuerst, was dieses Programm zeichnet …» |
| `zusatz: true` | ★, zählt nicht zum Pflichtfortschritt der Reihe |
| `kontrolle: true` | Lernkontrolle: Etikett, keine Hinweise |
| `bild` | Bild im Kursordner, z. B. `bilder/blume.png` (png, jpg, gif, svg, webp) |
| `ziel` | Zielbild für die automatische Prüfung (unten) |
| `bedingungen` | reserviert für Zusatzbedingungen (z. B. höchstens n Zeilen); noch ohne Wirkung |

Texte (auch Konzepte, Fragen, Hinweise): Leerzeile = neuer Absatz, `` `…` `` = Code im Text,
` ``` ` auf eigenen Zeilen = Codeblock, `- ` am Zeilenanfang = Aufzählung, `## ` = Zwischentitel.
Mehr nicht; HTML erscheint als Text.

`ziel`: `elemente` (1–2000), optional `toleranz` (1–50, Vorgabe 6) und `schwelle` (0.5–1,
Vorgabe 0.95). Koordinaten wie in Turtle (Start bei (0, 0), y nach oben), Winkel in Grad.

| Element | Felder |
| --- | --- |
| `strecke` | `von`, `bis` |
| `linienzug` | `punkte` (mindestens 2), optional `geschlossen: true` |
| `kreis` | `mitte`, `radius`, optional `von`, `bis` (Bogen, Grad ab der x-Achse, gegen den Uhrzeigersinn) |
| `punkt` | `ort`, optional `groesse` (Durchmesser wie bei `dot`) |
| `flaeche` | `punkte` (mindestens 3), optional `rand: true` (Rand muss auch gezeichnet sein) |

Jedes Element kann `farbe` haben. Lösungen gehören nicht in den Kurs, nur das Ziel.

### Zielbild-Werkzeug

Mit `?werkzeug=ziel` (auch zusammen mit `?kurs=…`) erscheint unter dem Feld nach jedem Lauf die
Zeichnung als fertiges `ziel` zum Kopieren, wahlweise mit Farben. So lässt man die eigene Lösung
laufen und übernimmt nur das Ergebnis; Koordinaten muss niemand von Hand ausrechnen.

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
| `turtle.koordinaten.v1` | Koordinatensystem ein/aus |
| `turtle.kurs.<kurs>.v1` | im Kurs: Programm je Aufgabe, erledigt (geprüft/selbst), Vorhersagen, zuletzt offene Aufgabe, Karte eingeklappt; `<kurs>` z. B. `turtle-aufgaben/beispiel` |

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
- Einen empfangenen Teilen-Link kann man ohne Netz nur öffnen, wenn die Seite auf diesem Gerät
  schon einmal geladen wurde.
- Kurse: `kurs.json` und die Bilder legt die Seite selbst im Browser ab (Speicher `turtle-kurse`),
  auch ohne Service Worker; der Service Worker behandelt sie ebenso (zuerst Netz, sonst Speicher,
  auch aus anderen `*.github.io`-Repos). Ein Kurs geht offline, sobald er einmal geladen war.

## Sicherheit

Das Programm läuft in `laufzeit/skulpt.html` in einem iframe mit `sandbox="allow-scripts"`
(ohne `allow-same-origin`). Es kann darum weder die gespeicherten Programme lesen noch die Seite
verändern. Die Seite und das iframe sprechen nur über `postMessage`.

## Anpassungen an Skulpt

`vendor/` bleibt unverändert. `laufzeit/skulpt.html` ersetzt beim Laden einige Stellen im
Quelltext des Turtle-Moduls (aus `skulpt-stdlib.js`): Bewegungen und Drehungen fragen den
Tempo-Faktor ab, jede Bewegung meldet ihr Ziel (für Zoom und Koordinatenanzeige), Mausklicks
rechnen Zoom und Skalierung des Feldes heraus, und `from turtle import *` bietet zusätzliche
Bildschirm-Befehle wie `bgcolor` an. Für den Kurs werden Strecken, Punkte und Füllflächen
gesammelt; für Spiele hält «Pause» auch Aufrufe durch Tasten und Timer an, Fehler darin werden
gemeldet, und `listen()` gibt dem Feld den Fokus. Farben wie `color(0, 255, 127)` ohne
`colormode(255)` gelten als 0 … 255, sobald ein Wert grösser als 1 ist (so hat es Trinket
gehalten; `color(1, 1, 1)` bleibt Weiss). Die Laufzeit ist durchsichtig; Kacheln und
Koordinatensystem zeichnet die Seite darunter. Findet es eine Stelle nicht (etwa nach einem
Skulpt-Update), meldet es das in der Konsole; das Programm läuft trotzdem, nur ohne die
entsprechende Funktion.

## Lokal testen

```
python3 -m http.server 8000
```
… und `http://localhost:8000/` öffnen.

Mit einem Kurs: Server im Ordner über `turtle/` und `turtle-aufgaben/` starten und
`http://localhost:8000/turtle/?kurs=turtle-aufgaben/beispiel` öffnen.

## GitHub Pages

Settings → Pages → Source: «Deploy from a branch», Branch `main`, Ordner `/ (root)`.
Die leere Datei `.nojekyll` im Root muss bestehen bleiben.

## Lizenzen

Skulpt (MIT), CodeMirror (MIT), lz-string (MIT); Lizenztexte in `vendor/`.
