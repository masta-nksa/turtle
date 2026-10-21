/* ============================================================
   befehle.js – Befehle und Anleitungen für die Kurzhilfe unter dem Editor und die Doku.
   Nur Befehle, die im Tool (Skulpt mit den Anpassungen in laufzeit/skulpt.html) gehen.
   Ohne DOM, auch mit node testbar. Beispiele laufen mit «from turtle import *» davor.
   ============================================================ */
(function (global) {
  "use strict";

  // Text = Gruppe; sonst [Namen (erster = Hauptname, weitere = Kurzformen), Aufruf, Erklärung, Zusatz]
  // Zusatz (freiwillig): bsp = Beispiel, such = Stichwörter für die Suche, siehe = verwandte Befehle
  var LISTE = [
    "Bewegen",
    [["forward", "fd"], "forward(strecke)", "Bewegt die Turtle um «strecke» vorwärts (fd ist die Kurzform).",
      { bsp: "forward(100)", such: "vorwärts gehen laufen strecke linie strich zeichnen", siehe: ["backward", "left", "goto"] }],
    [["backward", "back", "bk"], "backward(strecke)", "Bewegt die Turtle rückwärts, ohne sich zu drehen (Kurzformen back, bk).",
      { bsp: "backward(50)", such: "rückwärts zurück", siehe: ["forward"] }],
    [["goto", "setpos", "setposition"], "goto(x, y)", "Geht direkt zum Punkt (x, y); mit gesenktem Stift entsteht eine Linie.",
      { bsp: "goto(100, 50)\ngoto(0, 0)", such: "punkt koordinaten position springen hingehen verschieben linie", siehe: ["penup", "setx", "home", "pos"] }],
    [["setx"], "setx(x)", "Ändert nur die x-Koordinate; y bleibt.", { bsp: "setx(-100)", such: "waagrecht horizontal koordinate", siehe: ["sety", "goto"] }],
    [["sety"], "sety(y)", "Ändert nur die y-Koordinate; x bleibt.", { bsp: "sety(80)", such: "senkrecht vertikal koordinate", siehe: ["setx", "goto"] }],
    [["home"], "home()", "Zurück zur Mitte (0, 0), Blick nach rechts.", { bsp: "forward(100)\nhome()", such: "mitte zurück ursprung anfang", siehe: ["goto", "reset"] }],

    "Drehen",
    [["left", "lt"], "left(winkel)", "Dreht die Turtle um «winkel» Grad nach links (lt ist die Kurzform).",
      { bsp: "left(90)\nforward(50)", such: "links drehen winkel grad abbiegen ecke", siehe: ["right", "setheading"] }],
    [["right", "rt"], "right(winkel)", "Dreht die Turtle um «winkel» Grad nach rechts (rt ist die Kurzform).",
      { bsp: "right(45)\nforward(50)", such: "rechts drehen winkel grad abbiegen ecke", siehe: ["left", "setheading"] }],
    [["setheading", "seth"], "setheading(richtung)", "Richtung setzen: 0 = rechts, 90 = oben, 180 = links, 270 = unten.",
      { bsp: "setheading(90)\nforward(50)", such: "richtung ausrichten norden oben unten blick", siehe: ["heading", "left", "towards"] }],

    "Stift",
    [["penup", "pu", "up"], "penup()", "Stift hoch: Die Turtle bewegt sich ohne Spur.",
      { bsp: "penup()\nforward(50)\npendown()\nforward(50)", such: "stift hoch heben ohne linie spur springen lücke", siehe: ["pendown", "goto"] }],
    [["pendown", "pd", "down"], "pendown()", "Stift wieder unten: Die Turtle zeichnet.",
      { bsp: "penup()\ngoto(-100, 0)\npendown()\nforward(200)", such: "stift senken zeichnen spur", siehe: ["penup"] }],
    [["pensize", "width"], "pensize(dicke)", "Strichdicke; gilt für alle folgenden Linien.",
      { bsp: "pensize(8)\nforward(100)", such: "dicke dick dünn breite strich linie", siehe: ["pencolor"] }],
    [["isdown"], "isdown()", "True, wenn der Stift unten ist.", { bsp: "print(isdown())", such: "stift abfragen", siehe: ["penup"] }],

    "Farben und Füllen",
    [["color"], "color(farbe) oder color(stift, fuellung)", "Stift- und Füllfarbe, z. B. \"red\", \"#ff8800\" oder (255, 136, 0).",
      { bsp: "color(\"red\")\nforward(80)\ncolor(\"blue\", \"yellow\")", such: "farbe farbig rot blau grün gelb", siehe: ["pencolor", "fillcolor", "begin_fill", "bgcolor"] }],
    [["pencolor"], "pencolor(farbe)", "Nur die Stiftfarbe.", { bsp: "pencolor(\"green\")\nforward(80)", such: "farbe linie strich", siehe: ["color", "fillcolor"] }],
    [["fillcolor"], "fillcolor(farbe)", "Nur die Füllfarbe für begin_fill / end_fill.",
      { bsp: "fillcolor(\"orange\")\nbegin_fill()\ncircle(40)\nend_fill()", such: "farbe füllen fläche", siehe: ["begin_fill", "color"] }],
    [["begin_fill"], "begin_fill()", "Beginnt eine Fläche; alles bis end_fill() wird gefüllt.",
      { bsp: "color(\"black\", \"yellow\")\nbegin_fill()\ncircle(50)\nend_fill()", such: "füllen ausmalen fläche gefüllt farbig", siehe: ["end_fill", "fillcolor"] }],
    [["end_fill"], "end_fill()", "Schliesst die Fläche und füllt sie mit der Füllfarbe.",
      { bsp: "begin_fill()\nfor i in range(3):\n    forward(80)\n    left(120)\nend_fill()", such: "füllen ausmalen fläche", siehe: ["begin_fill"] }],
    [["bgcolor"], "bgcolor(farbe)", "Hintergrundfarbe des Feldes.", { bsp: "bgcolor(\"black\")\ncolor(\"white\")\ncircle(50)", such: "hintergrund farbe feld schwarz", siehe: ["color"] }],
    [["colormode"], "colormode(255)", "Farbwerte von 0 bis 255 statt 0 bis 1 (im Tool gelten Werte über 1 ohnehin als 0 … 255).",
      { bsp: "colormode(255)\ncolor(255, 136, 0)\nforward(80)", such: "farbe rgb zahlen", siehe: ["color"] }],

    "Kreise und Punkte",
    [["circle"], "circle(radius, winkel, ecken)", "Kreis mit der Mitte links der Turtle; mit «winkel» nur ein Bogen, mit «ecken» ein Vieleck.",
      { bsp: "circle(50)\ncircle(80, 180)\ncircle(60, 360, 6)", such: "kreis rund bogen halbkreis radius vieleck", siehe: ["dot", "begin_fill"] }],
    [["dot"], "dot(durchmesser, farbe)", "Gefüllter Punkt an der Stelle der Turtle, auch bei Stift oben.",
      { bsp: "dot(30, \"red\")\npenup()\nforward(60)\ndot(15)", such: "punkt kreis gefüllt tupfen", siehe: ["circle", "stamp"] }],
    [["stamp"], "stamp()", "Druckt die Form der Turtle als Stempel ins Feld.", { bsp: "shape(\"turtle\")\nstamp()\nforward(50)\nstamp()", such: "stempel abdruck form", siehe: ["shape", "dot"] }],

    "Wo ist die Turtle?",
    [["xcor"], "xcor()", "x-Koordinate der Turtle.", { bsp: "forward(70)\nprint(xcor())", such: "koordinate position abfragen", siehe: ["ycor", "pos"] }],
    [["ycor"], "ycor()", "y-Koordinate der Turtle.", { bsp: "left(90)\nforward(40)\nprint(ycor())", such: "koordinate position abfragen", siehe: ["xcor", "pos"] }],
    [["pos", "position"], "pos()", "Ort der Turtle als (x, y).", { bsp: "goto(30, 40)\nprint(pos())", such: "position ort koordinaten abfragen", siehe: ["xcor", "goto"] }],
    [["heading"], "heading()", "Aktuelle Richtung in Grad (0 = rechts, 90 = oben).", { bsp: "left(30)\nprint(heading())", such: "richtung winkel abfragen", siehe: ["setheading"] }],
    [["distance"], "distance(x, y) oder distance(andere)", "Abstand zum Punkt (x, y) oder zu einer anderen Turtle.",
      { bsp: "print(distance(30, 40))", such: "abstand entfernung weit nah", siehe: ["towards", "pos"] }],
    [["towards"], "towards(x, y)", "Richtung in Grad, in die die Turtle zum Punkt (x, y) schauen müsste.",
      { bsp: "setheading(towards(100, 100))\nforward(50)", such: "richtung ziel zeigen", siehe: ["setheading", "distance"] }],

    "Aussehen und Tempo",
    [["shape"], "shape(\"turtle\")", "Form: \"arrow\", \"turtle\", \"circle\", \"square\", \"triangle\" oder \"classic\".",
      { bsp: "shape(\"turtle\")\nforward(50)", such: "form aussehen schildkröte pfeil", siehe: ["stamp", "hideturtle"] }],
    [["hideturtle", "ht"], "hideturtle()", "Turtle ausblenden (zeichnet schneller und schöner).",
      { bsp: "hideturtle()\ncircle(50)", such: "verstecken ausblenden unsichtbar", siehe: ["showturtle", "speed"] }],
    [["showturtle", "st"], "showturtle()", "Turtle wieder zeigen.", { bsp: "hideturtle()\nforward(50)\nshowturtle()", such: "zeigen einblenden sichtbar", siehe: ["hideturtle"] }],
    [["isvisible"], "isvisible()", "True, wenn die Turtle sichtbar ist.", { bsp: "print(isvisible())", such: "sichtbar abfragen", siehe: ["hideturtle"] }],
    [["speed"], "speed(tempo)", "1 = langsam … 10 = schnell, 0 = sofort; der Tempo-Regler wirkt zusätzlich.",
      { bsp: "speed(0)\nfor i in range(36):\n    circle(60)\n    left(10)", such: "tempo schnell schneller langsam geschwindigkeit", siehe: ["tracer", "hideturtle"] }],

    "Text",
    [["write"], "write(text, align=\"left\", font=(\"Arial\", 16, \"normal\"))", "Schreibt Text ins Feld, dort wo die Turtle steht.",
      { bsp: "write(\"Hallo\", align=\"center\", font=(\"Arial\", 24, \"bold\"))", such: "text schreiben schrift beschriften wort zahl anzeigen", siehe: ["print", "goto"] }],

    "Feld und Zeichnung",
    [["clear"], "clear()", "Löscht die Zeichnung dieser Turtle; sie bleibt, wo sie ist.", { bsp: "circle(50)\nclear()", such: "löschen leeren weg", siehe: ["reset", "clearscreen"] }],
    [["reset"], "reset()", "Löscht die Zeichnung und setzt die Turtle zurück in die Mitte.", { bsp: "forward(80)\nreset()", such: "löschen zurücksetzen neu anfang", siehe: ["clear", "home"] }],
    [["clearscreen", "resetscreen"], "clearscreen()", "Löscht alles im Feld, auch die anderen Turtles.", { such: "löschen alles leeren", siehe: ["clear"] }],
    [["undo"], "undo()", "Macht den letzten Schritt der Turtle rückgängig.", { bsp: "forward(50)\nleft(90)\nforward(50)\nundo()", such: "rückgängig zurück", siehe: ["clear"] }],
    [["tracer"], "tracer(0)", "Zeichnet ohne Zwischenbilder; mit update() wird alles auf einmal gezeigt.",
      { bsp: "tracer(0)\nfor i in range(100):\n    forward(i * 2)\n    left(91)\nupdate()", such: "schnell sofort tempo animation", siehe: ["update", "speed"] }],
    [["update"], "update()", "Zeigt alles, was seit tracer(0) gezeichnet wurde.", { such: "anzeigen aktualisieren", siehe: ["tracer"] }],
    [["window_width"], "window_width()", "Breite der Leinwand (im Tool 1500).", { bsp: "print(window_width())", such: "breite feld grösse", siehe: ["window_height"] }],
    [["window_height"], "window_height()", "Höhe der Leinwand (im Tool 1500).", { bsp: "print(window_height())", such: "höhe feld grösse", siehe: ["window_width"] }],
    [["Screen", "getscreen"], "Screen()", "Das Feld als Objekt, z. B. Screen().bgcolor(\"black\").",
      { bsp: "feld = Screen()\nfeld.bgcolor(\"lightblue\")", such: "feld bildschirm fenster", siehe: ["bgcolor"] }],
    [["done", "mainloop", "exitonclick"], "done()", "In Python am Ende nötig, damit das Fenster offen bleibt; im Tool ohne Wirkung.",
      { such: "ende fertig fenster", siehe: [] }],

    "Tasten, Klicks, Timer",
    [["onkey"], "onkey(befehl, \"Left\")", "Ruft «befehl» (ohne Klammern) bei dieser Taste auf; danach listen().",
      { bsp: "def links():\n    left(30)\n\nonkey(links, \"Left\")\nlisten()", such: "taste tastatur pfeiltaste drücken steuern spiel", siehe: ["listen", "def", "ontimer"] }],
    [["listen"], "listen()", "Ab jetzt auf Tasten achten (nach onkey).", { such: "taste tastatur", siehe: ["onkey"] }],
    [["onscreenclick"], "onscreenclick(befehl)", "Ruft befehl(x, y) bei einem Klick ins Feld auf.",
      { bsp: "def hin(x, y):\n    goto(x, y)\n\nonscreenclick(hin)", such: "klick maus klicken feld", siehe: ["onclick", "goto"] }],
    [["onclick"], "onclick(befehl)", "Ruft befehl(x, y) bei einem Klick auf die Turtle auf.",
      { bsp: "def gedrueckt(x, y):\n    left(90)\n\nonclick(gedrueckt)", such: "klick maus klicken turtle", siehe: ["onscreenclick"] }],
    [["ontimer"], "ontimer(befehl, millisekunden)", "Ruft «befehl» einmal nach dieser Zeit auf; für einen Takt in befehl wieder ontimer.",
      { bsp: "def schritt():\n    forward(10)\n    left(10)\n    ontimer(schritt, 100)\n\nschritt()", such: "zeit timer takt warten später animation", siehe: ["onkey", "def"] }],

    "Mehrere Turtles",
    [["Turtle"], "Turtle()", "Neue Turtle, z. B. anna = Turtle(); dann anna.forward(50).",
      { bsp: "anna = Turtle()\nbert = Turtle()\nanna.color(\"red\")\nanna.forward(80)\nbert.left(90)\nbert.forward(80)", such: "mehrere turtle neue objekt zweite", siehe: ["clone"] }],
    [["clone"], "clone()", "Kopie der Turtle an derselben Stelle.", { bsp: "anna = Turtle()\nbert = anna.clone()\nbert.left(90)\nbert.forward(50)", such: "kopie kopieren zweite", siehe: ["Turtle"] }],

    "Python",
    [["print"], "print(wert, …)", "Schreibt in die Ausgabe unter dem Feld.", { bsp: "print(\"Hallo\")\nprint(3 * 4)", such: "ausgabe ausgeben anzeigen text zahl", siehe: ["input", "write", "str"] }],
    [["input"], "input(\"Frage? \")", "Fragt nach einer Eingabe; die Antwort ist immer Text.",
      { bsp: "name = input(\"Wie heissen Sie? \")\nprint(\"Hallo \" + name)", such: "eingabe frage fragen eintippen benutzer", siehe: ["int", "print"] }],
    [["range"], "range(ende) oder range(start, ende, schritt)", "Zahlen von start bis vor ende, z. B. range(4) → 0, 1, 2, 3.",
      { bsp: "for i in range(1, 6):\n    print(i)", such: "zahlen bereich zählen", siehe: ["for"] }],
    [["len"], "len(liste)", "Anzahl Elemente einer Liste oder Zeichen eines Texts.", { bsp: "farben = [\"red\", \"blue\"]\nprint(len(farben))", such: "länge anzahl", siehe: ["append"] }],
    [["int"], "int(wert)", "Ganze Zahl, z. B. aus einer Eingabe: int(\"12\") → 12.", { bsp: "print(int(\"12\") + 1)", such: "zahl ganze umwandeln eingabe", siehe: ["input", "float", "str"] }],
    [["float"], "float(wert)", "Kommazahl, z. B. float(\"2.5\") → 2.5.", { bsp: "print(float(\"2.5\") * 2)", such: "kommazahl dezimal umwandeln", siehe: ["int"] }],
    [["str"], "str(wert)", "Text, z. B. um eine Zahl anzuhängen: \"Punkte: \" + str(5).", { bsp: "punkte = 5\nprint(\"Punkte: \" + str(punkte))", such: "text umwandeln zahl", siehe: ["int", "print"] }],
    [["abs"], "abs(zahl)", "Betrag: abs(-7) → 7.", { bsp: "print(abs(-7))", such: "betrag positiv", siehe: [] }],
    [["round"], "round(zahl, stellen)", "Runden: round(2.567, 1) → 2.6.", { bsp: "print(round(2.567, 1))", such: "runden", siehe: ["int"] }],
    [["min"], "min(a, b, …)", "Kleinster Wert.", { bsp: "print(min(4, 9, 2))", such: "kleinste minimum", siehe: ["max"] }],
    [["max"], "max(a, b, …)", "Grösster Wert.", { bsp: "print(max(4, 9, 2))", such: "grösste maximum", siehe: ["min"] }],
    [["type"], "type(wert)", "Datentyp, z. B. <class 'int'>.", { bsp: "print(type(3.5))", such: "datentyp art", siehe: [] }],
    [["format"], "\"… {} …\".format(wert)", "Setzt Werte an die Stellen {} im Text.", { bsp: "print(\"{} Ecken\".format(6))", such: "text platzhalter einsetzen", siehe: ["str"] }],
    [["import", "from"], "from turtle import *", "Holt alle Befehle eines Moduls, sodass sie ohne Vorsatz gehen.",
      { bsp: "from turtle import *\nfrom random import *", such: "importieren modul laden", siehe: ["randint"] }],

    "Zufall",
    [["randint"], "randint(a, b)", "Zufällige ganze Zahl von a bis und mit b (from random import *).",
      { bsp: "from random import *\nforward(randint(20, 150))", such: "zufall zufällig würfel zahl", siehe: ["random", "choice", "randrange"] }],
    [["randrange"], "randrange(start, ende, schritt)", "Zufällige Zahl wie aus range(start, ende, schritt).",
      { bsp: "from random import *\nprint(randrange(0, 100, 10))", such: "zufall zufällig", siehe: ["randint", "range"] }],
    [["random"], "random()", "Zufällige Kommazahl zwischen 0 und 1.", { bsp: "from random import *\ncolor(random(), random(), random())\ncircle(50)", such: "zufall zufällig kommazahl farbe", siehe: ["randint"] }],
    [["choice"], "choice(liste)", "Zufälliges Element einer Liste.",
      { bsp: "from random import *\ncolor(choice([\"red\", \"green\", \"blue\"]))\ncircle(50)", such: "zufall zufällig auswählen liste", siehe: ["randint", "shuffle"] }],
    [["shuffle"], "shuffle(liste)", "Mischt die Liste.", { bsp: "from random import *\nzahlen = [1, 2, 3, 4]\nshuffle(zahlen)\nprint(zahlen)", such: "mischen zufall reihenfolge", siehe: ["choice"] }],

    "Listen",
    [["append"], "liste.append(wert)", "Hängt einen Wert hinten an die Liste.", { bsp: "farben = [\"red\"]\nfarben.append(\"blue\")\nprint(farben)", such: "liste anhängen hinzufügen", siehe: ["len", "pop", "for"] }],
    [["pop"], "liste.pop() oder liste.pop(index)", "Nimmt das letzte (oder das Element an index) aus der Liste und gibt es zurück.",
      { bsp: "zahlen = [1, 2, 3]\nletzte = zahlen.pop()\nprint(letzte, zahlen)", such: "liste entfernen nehmen", siehe: ["append", "remove"] }],
    [["insert"], "liste.insert(index, wert)", "Fügt einen Wert an der Stelle index ein.", { bsp: "zahlen = [1, 3]\nzahlen.insert(1, 2)\nprint(zahlen)", such: "liste einfügen", siehe: ["append"] }],
    [["remove"], "liste.remove(wert)", "Entfernt das erste Vorkommen von wert.", { bsp: "farben = [\"red\", \"blue\"]\nfarben.remove(\"red\")\nprint(farben)", such: "liste entfernen löschen", siehe: ["pop"] }],

    "Schleifen und Bedingungen",
    [["for"], "for i in range(n):", "Wiederholt die eingerückten Zeilen; i zählt 0, 1, 2, …",
      { bsp: "for i in range(4):\n    forward(80)\n    left(90)", such: "schleife wiederholen mal wiederholung zählen", siehe: ["range", "while", "in"] }],
    [["while"], "while bedingung:", "Wiederholt, solange die Bedingung gilt.",
      { bsp: "laenge = 10\nwhile laenge < 200:\n    forward(laenge)\n    left(90)\n    laenge = laenge + 10", such: "schleife solange wiederholen bedingung", siehe: ["for", "break", "if"] }],
    [["if"], "if bedingung:", "Die eingerückten Zeilen laufen nur, wenn die Bedingung wahr ist.",
      { bsp: "for i in range(10):\n    if i % 2 == 0:\n        color(\"red\")\n    else:\n        color(\"blue\")\n    forward(20)", such: "wenn bedingung falls entscheiden vergleich", siehe: ["elif", "else", "and"] }],
    [["elif"], "elif bedingung:", "«sonst wenn»: weitere Bedingung, falls die vorigen falsch waren.",
      { bsp: "x = 5\nif x < 3:\n    print(\"klein\")\nelif x < 8:\n    print(\"mittel\")\nelse:\n    print(\"gross\")", such: "sonst wenn bedingung", siehe: ["if", "else"] }],
    [["else"], "else:", "«sonst»: läuft, wenn keine Bedingung davor wahr war.", { such: "sonst andernfalls bedingung", siehe: ["if", "elif"] }],
    [["break"], "break", "Beendet die Schleife sofort.",
      { bsp: "for i in range(100):\n    forward(5)\n    if xcor() > 100:\n        break", such: "abbrechen beenden schleife stopp", siehe: ["continue", "while"] }],
    [["continue"], "continue", "Springt zum nächsten Durchlauf der Schleife.", { such: "überspringen schleife weiter", siehe: ["break"] }],
    [["and"], "a and b", "Wahr, wenn beides wahr ist.", { bsp: "x = 5\nprint(x > 0 and x < 10)", such: "und bedingung beides", siehe: ["or", "not", "if"] }],
    [["or"], "a or b", "Wahr, wenn mindestens eines wahr ist.", { bsp: "x = 12\nprint(x < 0 or x > 10)", such: "oder bedingung", siehe: ["and", "not"] }],
    [["not"], "not a", "Das Gegenteil.", { bsp: "print(not isdown())", such: "nicht gegenteil", siehe: ["and", "or"] }],
    [["in"], "x in liste", "Wahr, wenn x in der Liste vorkommt; in for: der Reihe nach jedes Element.",
      { bsp: "for farbe in [\"red\", \"green\", \"blue\"]:\n    color(farbe)\n    forward(50)", such: "enthalten liste durchlaufen jedes", siehe: ["for"] }],
    [["True", "False"], "True / False", "Wahrheitswerte: wahr und falsch.", { bsp: "fertig = False\nprint(fertig)", such: "wahr falsch wahrheitswert", siehe: ["if"] }],
    [["None"], "None", "«nichts»: kein Wert.", { such: "nichts leer", siehe: [] }],

    "Eigene Befehle",
    [["def"], "def name(parameter):", "Neuer eigener Befehl; die eingerückten Zeilen laufen erst beim Aufruf name(…).",
      { bsp: "def quadrat(seite):\n    for i in range(4):\n        forward(seite)\n        left(90)\n\nquadrat(50)\nquadrat(100)", such: "funktion eigener befehl definieren parameter wiederverwenden", siehe: ["return", "for"] }],
    [["return"], "return wert", "Beendet den eigenen Befehl und gibt wert zurück.",
      { bsp: "def doppelt(x):\n    return 2 * x\n\nforward(doppelt(40))", such: "rückgabe zurückgeben ergebnis funktion", siehe: ["def"] }],
    [["global"], "global name", "Erlaubt einem eigenen Befehl, eine Variable von aussen zu ändern.",
      { bsp: "punkte = 0\n\ndef treffer():\n    global punkte\n    punkte = punkte + 1\n\ntreffer()\nprint(punkte)", such: "variable aussen ändern", siehe: ["def"] }]
  ];

  // Anleitungen: Was man zeichnen will, nicht welcher Befehl (z. B. «Rechteck»)
  var ANLEITUNGEN = [
    { titel: "Quadrat", text: "Vier gleiche Seiten, nach jeder Seite um 90° drehen.",
      bsp: "for i in range(4):\n    forward(100)\n    left(90)", such: "viereck quadrat ecke", siehe: ["for", "forward", "left"] },
    { titel: "Rechteck", text: "Lange und kurze Seite abwechselnd, das Ganze zweimal.",
      bsp: "for i in range(2):\n    forward(160)\n    left(90)\n    forward(80)\n    left(90)", such: "viereck rechteck ecke", siehe: ["for", "forward", "left"] },
    { titel: "Dreieck und Vieleck", text: "Für n Ecken n-mal zeichnen und jedes Mal um 360 / n Grad drehen: Dreieck 120°, Fünfeck 72°, Sechseck 60°.",
      bsp: "n = 6\nfor i in range(n):\n    forward(80)\n    left(360 / n)", such: "dreieck fünfeck sechseck achteck vieleck polygon ecken regelmässig", siehe: ["for", "left", "circle"] },
    { titel: "Stern", text: "Fünf Zacken: Nach jeder Linie um 144° drehen.",
      bsp: "for i in range(5):\n    forward(150)\n    right(144)", such: "stern zacken", siehe: ["for", "right"] },
    { titel: "Kreis", text: "circle(radius) zeichnet einen Kreis; die Mitte liegt links der Turtle, im Abstand «radius».",
      bsp: "circle(80)", such: "kreis rund ring", siehe: ["circle", "dot"] },
    { titel: "Kreis um einen Mittelpunkt", text: "Ohne Linie zum unteren Rand des Kreises gehen (Mittelpunkt minus Radius), dann zeichnen.",
      bsp: "r = 60\npenup()\ngoto(100, 50 - r)\npendown()\ncircle(r)", such: "kreis mittelpunkt zentrum stelle", siehe: ["circle", "penup", "goto"] },
    { titel: "Halbkreis und Bogen", text: "Der zweite Wert bei circle ist der Winkel des Bogens: 180 für einen Halbkreis, 90 für einen Viertelkreis.",
      bsp: "circle(80, 180)\nleft(90)\nforward(160)", such: "bogen halbkreis viertelkreis kurve", siehe: ["circle"] },
    { titel: "Fläche füllen", text: "Zuerst die Füllfarbe wählen, dann alles zwischen begin_fill() und end_fill() zeichnen.",
      bsp: "color(\"black\", \"yellow\")\nbegin_fill()\ncircle(60)\nend_fill()", such: "füllen ausmalen gefüllt farbig fläche", siehe: ["begin_fill", "end_fill", "fillcolor"] },
    { titel: "Springen ohne Linie", text: "Mit penup() hebt die Turtle den Stift, geht ohne Spur weiter und zeichnet nach pendown() wieder.",
      bsp: "penup()\ngoto(-150, 80)\npendown()\nforward(100)", such: "springen ohne linie strich lücke verschieben stelle anderswo", siehe: ["penup", "pendown", "goto"] },
    { titel: "Farben", text: "Farbnamen wie \"red\", \"orange\", \"gold\", \"green\", \"skyblue\", \"purple\" oder Mischungen als \"#ff8800\" oder (255, 136, 0).",
      bsp: "pensize(10)\nfor farbe in [\"red\", \"orange\", \"gold\", \"green\", \"skyblue\", \"purple\"]:\n    color(farbe)\n    forward(40)", such: "farbe farben bunt regenbogen rot blau grün", siehe: ["color", "bgcolor", "in"] },
    { titel: "Text schreiben", text: "write schreibt beim Ort der Turtle; mit align und font lassen sich Ausrichtung und Grösse wählen.",
      bsp: "penup()\ngoto(0, 100)\nwrite(\"Hallo!\", align=\"center\", font=(\"Arial\", 28, \"bold\"))", such: "text schrift beschriften wort titel", siehe: ["write", "goto"] },
    { titel: "Spirale", text: "In einer Schleife die Strecke jedes Mal etwas länger machen.",
      bsp: "for i in range(60):\n    forward(i * 3)\n    left(91)", such: "spirale schnecke wachsen", siehe: ["for", "forward"] },
    { titel: "Muster und Rosette", text: "Eine Figur wiederholen und dazwischen ein wenig drehen.",
      bsp: "speed(0)\nfor i in range(36):\n    circle(60)\n    left(10)", such: "muster rosette blume mandala", siehe: ["for", "circle", "speed"] },
    { titel: "Figuren nebeneinander", text: "Eine Schleife in der Schleife: innen die Figur, aussen weiterrücken.",
      bsp: "for k in range(5):\n    for i in range(4):\n        forward(40)\n        left(90)\n    penup()\n    forward(60)\n    pendown()", such: "nebeneinander reihe verschachtelt gitter mehrere", siehe: ["for", "penup"] },
    { titel: "Eigener Befehl", text: "Mit def einen Befehl erfinden und ihn dann mit verschiedenen Werten aufrufen.",
      bsp: "def quadrat(seite):\n    for i in range(4):\n        forward(seite)\n        left(90)\n\nquadrat(40)\nquadrat(80)\nquadrat(120)", such: "funktion eigener befehl definieren", siehe: ["def", "return"] },
    { titel: "Zufall", text: "Mit «from random import *» gibt es randint, random und choice.",
      bsp: "from random import *\npenup()\nfor i in range(20):\n    goto(randint(-200, 200), randint(-200, 200))\n    dot(randint(5, 30), choice([\"red\", \"gold\", \"teal\"]))", such: "zufall zufällig würfel punkte", siehe: ["randint", "choice", "random"] },
    { titel: "Schneller zeichnen", text: "speed(0) und hideturtle() machen es schnell; mit tracer(0) und update() erscheint alles auf einmal.",
      bsp: "speed(0)\nhideturtle()\nfor i in range(72):\n    circle(80)\n    left(5)", such: "schnell schneller tempo sofort langsam", siehe: ["speed", "hideturtle", "tracer"] },
    { titel: "Mit Tasten steuern", text: "Für jede Taste einen eigenen Befehl schreiben, ihn mit onkey verbinden, dann listen(). Ins Feld klicken ist nicht nötig.",
      bsp: "def vor():\n    forward(20)\n\ndef links():\n    left(30)\n\ndef rechts():\n    right(30)\n\nonkey(vor, \"Up\")\nonkey(links, \"Left\")\nonkey(rechts, \"Right\")\nlisten()", such: "taste tasten tastatur pfeiltasten steuern spiel", siehe: ["onkey", "listen", "def"] },
    { titel: "Animation", text: "Ein Befehl macht einen kleinen Schritt und ruft sich mit ontimer nach kurzer Zeit wieder auf.",
      bsp: "def schritt():\n    forward(5)\n    left(5)\n    ontimer(schritt, 50)\n\nschritt()", such: "animation bewegen bewegung takt timer spiel", siehe: ["ontimer", "def"] },
    { titel: "Zahl eingeben", text: "input liefert immer Text; mit int(…) wird daraus eine Zahl.",
      bsp: "n = int(input(\"Wie viele Ecken? \"))\nfor i in range(n):\n    forward(60)\n    left(360 / n)", such: "eingabe eingeben frage zahl benutzer", siehe: ["input", "int"] }
  ];

  var GRUPPE_ANLEITUNGEN = "Anleitungen";
  var NACH_NAME = {}, EINTRAEGE = [], GRUPPEN = [GRUPPE_ANLEITUNGEN];
  ANLEITUNGEN.forEach(function (a, i) {
    EINTRAEGE.push({ art: "anleitung", id: "a" + i, titel: a.titel, text: a.text, bsp: a.bsp,
      such: a.such, siehe: a.siehe, gruppe: GRUPPE_ANLEITUNGEN, namen: [] });
  });
  var gruppe = "";
  LISTE.forEach(function (e) {
    if (typeof e === "string") { gruppe = e; GRUPPEN.push(e); return; }
    var z = e[3] || {};
    var eintrag = { art: "befehl", id: e[0][0], name: e[0][0], namen: e[0], aufruf: e[1], text: e[2],
      bsp: z.bsp || "", such: z.such || "", siehe: z.siehe || [], gruppe: gruppe };
    e[0].forEach(function (n) { NACH_NAME[n] = eintrag; });
    EINTRAEGE.push(eintrag);
  });

  // Welcher Befehl gehört zur Cursorstelle? Zuerst das Wort unter dem Cursor, sonst der Aufruf,
  // in dessen Klammern der Cursor steht (z. B. beim Tippen der Argumente). Kommentare und Texte
  // in Anführungszeichen zählen nicht.
  function beiCursor(zeile, ch) {
    var code = ohneTexte(zeile), m, re = /[A-Za-z_][A-Za-z0-9_]*/g;
    while ((m = re.exec(code))) {
      if (m.index <= ch && ch <= m.index + m[0].length && NACH_NAME[m[0]]) return NACH_NAME[m[0]];
    }
    var tiefe = 0;
    for (var i = Math.min(ch, code.length) - 1; i >= 0; i--) {
      var c = code.charAt(i);
      if (c === ")") tiefe++;
      else if (c === "(") {
        if (tiefe) { tiefe--; continue; }
        var vor = /([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(code.slice(0, i));
        if (vor && NACH_NAME[vor[1]]) return NACH_NAME[vor[1]];
      }
    }
    return null;
  }
  // Texte und Kommentare durch Leerzeichen ersetzen (Länge bleibt, damit ch passt)
  function ohneTexte(z) {
    var aus = "", in_ = null;
    for (var i = 0; i < z.length; i++) {
      var c = z.charAt(i);
      if (in_) { aus += " "; if (c === "\\") { aus += " "; i++; } else if (c === in_) in_ = null; }
      else if (c === "#") { aus += new Array(z.length - i + 1).join(" "); break; }
      else if (c === "\"" || c === "'") { in_ = c; aus += " "; }
      else aus += c;
    }
    return aus;
  }

  /* ---------- Suche für die Doku -------------------------------- */

  // Klein, Umlaute als ae/oe/ue, ohne Akzente
  function normal(s) {
    s = String(s).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
    return s.normalize ? s.normalize("NFD").replace(/[̀-ͯ]/g, "") : s;
  }
  function woerter(s) { return normal(s).split(/[^a-z0-9_]+/).filter(Boolean); }
  function abstand(a, b) {
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) d[i] = [i];
    for (j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[a.length][b.length];
  }
  // Ein Tippfehler, zwei bei langen Wörtern; auch am Wortanfang («foward» → forward)
  function tippfehler(w, t) {
    if (w.length < 4) return false;
    var grenze = w.length >= 9 ? 2 : 1;
    return abstand(w, t) <= grenze || (t.length > w.length && abstand(w, t.slice(0, w.length)) <= grenze);
  }

  var FELDER = EINTRAEGE.map(function (e) {
    return {
      namen: e.namen.map(normal), titel: woerter(e.titel || ""), such: woerter(e.such),
      aufruf: woerter(e.aufruf || ""), text: woerter(e.text)
    };
  });
  // Punkte für ein Suchwort in einem Eintrag (0 = kein Treffer)
  function punkte(w, f) {
    var p = 0;
    function liste(ws, genau, anfang, drin, fehler) {
      ws.forEach(function (t) {
        if (t === w) p = Math.max(p, genau);
        else if (t.indexOf(w) === 0) p = Math.max(p, anfang);
        else if (w.length >= 3 && t.indexOf(w) > 0) p = Math.max(p, drin);
        else if (fehler && tippfehler(w, t)) p = Math.max(p, fehler);
      });
    }
    liste(f.namen, 100, 70, 30, 35);
    liste(f.titel, 80, 60, 45, 30);
    liste(f.such, 60, 45, 35, 25);
    liste(f.aufruf, 20, 15, 0, 0);
    liste(f.text, 12, 8, 4, 0);
    return p;
  }
  // Alle Suchwörter müssen treffen; Anleitungen und Befehle gemischt, beste zuerst
  function suche(text) {
    var ws = woerter(text);
    if (!ws.length) return [];
    var treffer = [];
    EINTRAEGE.forEach(function (e, i) {
      var summe = 0;
      for (var k = 0; k < ws.length; k++) {
        var p = punkte(ws[k], FELDER[i]);
        if (!p) return;
        summe += p;
      }
      treffer.push({ eintrag: e, punkte: summe, i: i });
    });
    treffer.sort(function (a, b) { return b.punkte - a.punkte || a.i - b.i; });
    return treffer.map(function (t) { return t.eintrag; });
  }

  var api = { liste: LISTE, nachName: NACH_NAME, beiCursor: beiCursor,
    eintraege: EINTRAEGE, gruppen: GRUPPEN, suche: suche };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.TurtleBefehle = api;
})(this);
